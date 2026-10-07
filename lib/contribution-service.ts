import {
  RATE_LIMIT,
  RATE_WINDOW_SECONDS,
  RETENTION_SECONDS,
  type ContributionStatus,
} from './contribution-core.ts';

type Db = Pick<D1Database, 'prepare' | 'batch'>;
const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256(value: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

export async function hashIp(ip: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(ip)));
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

async function boundedCleanup(db: Db, now: number) {
  const expired = await db
    .prepare('SELECT id FROM contributions WHERE expires_at <= ? LIMIT 25')
    .bind(now)
    .all<{ id: string }>();
  if (expired.results.length) {
    const placeholders = expired.results.map(() => '?').join(',');
    await db
      .prepare(`DELETE FROM contributions WHERE id IN (${placeholders})`)
      .bind(...expired.results.map((row) => row.id))
      .run();
  }
  await db
    .prepare(
      'DELETE FROM contribution_rate_limits WHERE rowid IN (SELECT rowid FROM contribution_rate_limits WHERE expires_at <= ? LIMIT 25)',
    )
    .bind(now)
    .run();
}

export async function createContribution(
  db: Db,
  input: { kind: string; comment: string; sourceUrl: string | null },
  ipHash: string,
  now = Math.floor(Date.now() / 1000),
) {
  await boundedCleanup(db, now);
  const windowStart =
    Math.floor(now / RATE_WINDOW_SECONDS) * RATE_WINDOW_SECONDS;
  const rateExpiry = windowStart + RATE_WINDOW_SECONDS;
  const [, countResult] = await db.batch([
    db
      .prepare(
        'INSERT INTO contribution_rate_limits (ip_hash, window_start, request_count, expires_at) VALUES (?, ?, 1, ?) ON CONFLICT(ip_hash, window_start) DO UPDATE SET request_count = request_count + 1',
      )
      .bind(ipHash, windowStart, rateExpiry),
    db
      .prepare(
        'SELECT request_count FROM contribution_rate_limits WHERE ip_hash = ? AND window_start = ?',
      )
      .bind(ipHash, windowStart),
  ]);
  const count =
    (countResult.results?.[0] as { request_count?: number } | undefined)
      ?.request_count ?? RATE_LIMIT + 1;
  if (count > RATE_LIMIT)
    return { ok: false as const, retryAfter: Math.max(1, rateExpiry - now) };

  const protocol = randomToken();
  const id = crypto.randomUUID();
  await db
    .prepare(
      'INSERT INTO contributions (id, protocol_hash, kind, source_url, comment, status, moderator_note, created_at, reviewed_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?)',
    )
    .bind(
      id,
      await sha256(protocol),
      input.kind,
      input.sourceUrl,
      input.comment,
      'pending',
      now,
      now + RETENTION_SECONDS,
    )
    .run();
  return { ok: true as const, protocol, status: 'pending' as const };
}

export async function contributionStatus(db: Db, protocol: string) {
  if (!/^[A-Za-z0-9_-]{22}$/.test(protocol)) return null;
  return db
    .prepare(
      'SELECT status, created_at, reviewed_at FROM contributions WHERE protocol_hash = ? AND expires_at > ?',
    )
    .bind(await sha256(protocol), Math.floor(Date.now() / 1000))
    .first<{
      status: ContributionStatus;
      created_at: number;
      reviewed_at: number | null;
    }>();
}

export async function listContributions(
  db: Db,
  status: ContributionStatus,
  limit = 50,
) {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  return db
    .prepare(
      'SELECT id, kind, source_url, comment, status, moderator_note, created_at, reviewed_at FROM contributions WHERE status = ? AND expires_at > ? ORDER BY created_at ASC LIMIT ?',
    )
    .bind(status, Math.floor(Date.now() / 1000), safeLimit)
    .all();
}

export async function reviewContribution(
  db: Db,
  id: string,
  status: Exclude<ContributionStatus, 'pending'>,
  note: string | null,
  now = Math.floor(Date.now() / 1000),
) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  const result = await db
    .prepare(
      'UPDATE contributions SET status = ?, moderator_note = ?, reviewed_at = ?, expires_at = ? WHERE id = ? AND expires_at > ?',
    )
    .bind(status, note, now, now + RETENTION_SECONDS, id, now)
    .run();
  return (result.meta.changes ?? 0) === 1;
}
