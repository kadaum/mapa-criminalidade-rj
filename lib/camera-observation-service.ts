import { cameraPriorityAllowlist } from './camera-priority-allowlist.server.mjs';
import {
  sanitizeAttempt,
  validateAttempt,
} from './camera-observation-core.mjs';

type Db = Pick<D1Database, 'prepare' | 'batch'>;
export const CAMERA_OBSERVATION_RETENTION_SECONDS = 90 * 24 * 60 * 60;
export const CAMERA_PLAYBACK_FRESHNESS_SECONDS = 72 * 60 * 60;
const allowed = new Map(
  cameraPriorityAllowlist.map((record) => [record.id, record]),
);
const priorityOrder = new Map(
  cameraPriorityAllowlist.map((record, index) => [record.id, index]),
);

export class ObservationConflict extends Error {}
export class ObservationNotFound extends Error {}
export class ObservationInvalid extends Error {}

function canonicalUtc(value: unknown, field: string) {
  if (typeof value !== 'string') throw new ObservationInvalid(`${field} inválido.`);
  let normalized = '';
  try { normalized = new Date(value).toISOString(); } catch {}
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || normalized !== value)
    throw new ObservationInvalid(`${field} inválido.`);
  return Date.parse(value);
}

function validRoundId(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(value))
    throw new ObservationInvalid('roundId inválido.');
  return value;
}

function normalizeExpectedIds(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > allowed.size)
    throw new ObservationInvalid('expectedIds inválido.');
  if (value.some((id) => typeof id !== 'string' || !allowed.has(id)))
    throw new ObservationInvalid('Câmera fora da allowlist.');
  if (new Set(value).size !== value.length)
    throw new ObservationInvalid('expectedIds contém duplicata.');
  return [...value].sort(
    (a, b) => (priorityOrder.get(a) ?? 99) - (priorityOrder.get(b) ?? 99),
  );
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function boundedCleanup(db: Db, now: number) {
  await db
    .prepare(
      'DELETE FROM camera_observation_attempts WHERE rowid IN (SELECT rowid FROM camera_observation_attempts WHERE expires_at <= ? LIMIT 25)',
    )
    .bind(now)
    .run();
  await db
    .prepare(
      "UPDATE camera_observation_rounds SET state = 'failed', finished_at_ms = ? WHERE round_id IN (SELECT round_id FROM camera_observation_rounds WHERE state = 'open' AND expires_at <= ? LIMIT 25)",
    )
    .bind(now * 1000, now)
    .run();
  await db
    .prepare(
      'DELETE FROM camera_observation_rounds WHERE round_id IN (SELECT r.round_id FROM camera_observation_rounds r WHERE r.expires_at <= ? AND NOT EXISTS (SELECT 1 FROM camera_observation_attempts a WHERE a.round_id = r.round_id) LIMIT 25)',
    )
    .bind(now)
    .run();
}

function normalizedBrowser(value: string) {
  const match = value.match(/(?:Chrome|Chromium|CriOS)\/(\d+)/i) ?? value.match(/Firefox\/(\d+)/i) ?? value.match(/Version\/(\d+).*(?:Safari|WebKit)/i);
  if (!match) return 'unknown';
  if (/(?:Chrome|Chromium|CriOS)\//i.test(value)) return `Chromium/${match[1]}`;
  if (/Firefox\//i.test(value)) return `Firefox/${match[1]}`;
  return `WebKit/${match[1]}`;
}

function storageProjection(clean: ReturnType<typeof sanitizeAttempt>) {
  const projected = structuredClone(clean);
  projected.context.browser = normalizedBrowser(projected.context.browser);
  const error = projected.providerError;
  if (error) {
    if (!['metric','playing','error','interrupted'].includes(error.state) ||
        (error.code != null && !['codec','offline','notFound','timeout','unavailable'].includes(error.code)))
      throw new ObservationInvalid('providerError não reconhecido.');
  }
  return projected;
}

export async function startObservationRound(
  db: Db,
  input: unknown,
  moderatorId: string,
  now = Math.floor(Date.now() / 1000),
) {
  if (!input || typeof input !== 'object')
    throw new ObservationInvalid('Entrada inválida.');
  const row = input as Record<string, unknown>;
  const roundId = validRoundId(row.roundId);
  const expectedIds = normalizeExpectedIds(row.expectedIds);
  const startedAtMs = canonicalUtc(row.startedAt, 'startedAt');
  if (startedAtMs > now * 1000 + 5 * 60 * 1000)
    throw new ObservationInvalid('startedAt está no futuro.');
  const expectedIdsJson = JSON.stringify(expectedIds);
  await boundedCleanup(db, now);
  const result = await db
    .prepare(
      "INSERT INTO camera_observation_rounds (round_id, expected_ids_json, expected_count, state, collector_id, started_at_ms, finished_at_ms, created_at, expires_at) VALUES (?, ?, ?, 'open', ?, ?, NULL, ?, ?) ON CONFLICT(round_id) DO NOTHING",
    )
    .bind(
      roundId,
      expectedIdsJson,
      expectedIds.length,
      moderatorId,
      startedAtMs,
      now,
      now + CAMERA_OBSERVATION_RETENTION_SECONDS,
    )
    .run();
  if ((result.meta.changes ?? 0) === 1)
    return { roundId, state: 'open', idempotent: false };
  const existing = await db
    .prepare(
      'SELECT expected_ids_json, collector_id, started_at_ms, state FROM camera_observation_rounds WHERE round_id = ?',
    )
    .bind(roundId)
    .first<{
      expected_ids_json: string;
      collector_id: string;
      started_at_ms: number;
      state: string;
    }>();
  if (
    existing?.expected_ids_json === expectedIdsJson &&
    existing.collector_id === moderatorId &&
    existing.started_at_ms === startedAtMs
  )
    return { roundId, state: existing.state, idempotent: true };
  throw new ObservationConflict('roundId já existe com conteúdo diferente.');
}

export async function recordObservationAttempt(
  db: Db,
  input: unknown,
  now = Math.floor(Date.now() / 1000),
) {
  let clean: ReturnType<typeof sanitizeAttempt>;
  try { clean = storageProjection(sanitizeAttempt(validateAttempt(input, allowed))); }
  catch (error) {
    if (error instanceof ObservationInvalid) throw error;
    throw new ObservationInvalid('Tentativa inválida.');
  }
  const roundId = validRoundId(clean.roundId);
  const round = await db
    .prepare(
      'SELECT expected_ids_json, state, started_at_ms, expires_at FROM camera_observation_rounds WHERE round_id = ?',
    )
    .bind(roundId)
    .first<{ expected_ids_json: string; state: string; started_at_ms: number; expires_at: number }>();
  if (!round) throw new ObservationNotFound('Rodada não encontrada.');
  if (!(JSON.parse(round.expected_ids_json) as string[]).includes(clean.id))
    throw new ObservationInvalid('Câmera não pertence à rodada.');
  const startedAtMs = canonicalUtc(clean.startedAt, 'startedAt');
  const endedAtMs = canonicalUtc(clean.endedAt, 'endedAt');
  if (startedAtMs < round.started_at_ms)
    throw new ObservationInvalid('Tentativa anterior ao início da rodada.');
  if (endedAtMs > now * 1000 + 5 * 60 * 1000)
    throw new ObservationInvalid('endedAt está no futuro.');
  const payloadJson = JSON.stringify(clean);
  const payloadSha256 = await sha256(payloadJson);
  const result = await db
    .prepare(
      "INSERT INTO camera_observation_attempts (round_id, camera_id, started_at_ms, ended_at_ms, received_at_ms, outcome, payload_json, payload_sha256, expires_at) SELECT r.round_id, ?, ?, ?, ?, ?, ?, ?, r.expires_at FROM camera_observation_rounds r WHERE r.round_id = ? AND r.state = 'open' AND r.expires_at > ? AND EXISTS (SELECT 1 FROM json_each(r.expected_ids_json) WHERE value = ?) ON CONFLICT(round_id, camera_id) DO NOTHING",
    )
    .bind(
      clean.id,
      startedAtMs,
      endedAtMs,
      now * 1000,
      clean.outcome,
      payloadJson,
      payloadSha256,
      roundId,
      now,
      clean.id,
    )
    .run();
  if ((result.meta.changes ?? 0) === 1)
    return { roundId, cameraId: clean.id, outcome: clean.outcome, idempotent: false };
  const existing = await db
    .prepare(
      'SELECT payload_sha256, outcome FROM camera_observation_attempts WHERE round_id = ? AND camera_id = ?',
    )
    .bind(roundId, clean.id)
    .first<{ payload_sha256: string; outcome: string }>();
  if (existing?.payload_sha256 === payloadSha256)
    return { roundId, cameraId: clean.id, outcome: existing.outcome, idempotent: true };
  if (!existing) {
    const current = await db.prepare('SELECT state, expires_at FROM camera_observation_rounds WHERE round_id = ?').bind(roundId).first<{state:string;expires_at:number}>();
    if (!current) throw new ObservationNotFound('Rodada não encontrada.');
    if (current.expires_at <= now) throw new ObservationConflict('Rodada expirada.');
    if (current.state !== 'open') throw new ObservationConflict('Rodada encerrada.');
  }
  throw new ObservationConflict('Tentativa já existe com conteúdo diferente.');
}

export async function finalizeObservationRound(
  db: Db,
  input: unknown,
  now = Math.floor(Date.now() / 1000),
) {
  if (!input || typeof input !== 'object')
    throw new ObservationInvalid('Entrada inválida.');
  const row = input as Record<string, unknown>;
  const roundId = validRoundId(row.roundId);
  if (!['complete', 'partial', 'failed'].includes(String(row.state)))
    throw new ObservationInvalid('Estado final inválido.');
  const requested = String(row.state);
  const round = await db
    .prepare(
      'SELECT state, expected_count FROM camera_observation_rounds WHERE round_id = ? AND expires_at > ?',
    )
    .bind(roundId, now)
    .first<{ state: string; expected_count: number }>();
  if (!round) throw new ObservationNotFound('Rodada não encontrada.');
  if (round.state !== 'open') {
    if (round.state === requested)
      return { roundId, state: requested, idempotent: true };
    throw new ObservationConflict('Rodada já encerrada com outro estado.');
  }
  const sql = requested === 'complete'
    ? "UPDATE camera_observation_rounds SET state = ?, finished_at_ms = ? WHERE round_id = ? AND state = 'open' AND expected_count = (SELECT COUNT(*) FROM camera_observation_attempts WHERE round_id = ?)"
    : "UPDATE camera_observation_rounds SET state = ?, finished_at_ms = ? WHERE round_id = ? AND state = 'open'";
  const update = await db.prepare(sql).bind(...(requested === 'complete'
    ? [requested, now * 1000, roundId, roundId]
    : [requested, now * 1000, roundId])).run();
  if ((update.meta.changes ?? 0) !== 1) {
    const current = await db.prepare('SELECT state FROM camera_observation_rounds WHERE round_id = ?').bind(roundId).first<{state:string}>();
    if (!current) throw new ObservationNotFound('Rodada não encontrada.');
    if (current.state === requested) return { roundId, state: requested, idempotent: true };
    if (current.state === 'open') throw new ObservationConflict('Rodada incompleta.');
    throw new ObservationConflict('Rodada já encerrada com outro estado.');
  }
  const count = await db.prepare('SELECT COUNT(*) AS count FROM camera_observation_attempts WHERE round_id = ?').bind(roundId).first<{count:number}>();
  const attemptCount = Number(count?.count ?? 0);
  return { roundId, state: requested, attemptCount, idempotent: false };
}

export async function readObservationAttempts(
  db: Db,
  input: unknown,
) {
  const row = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const limit = Math.max(1, Math.min(100, Number.isInteger(row.limit) ? Number(row.limit) : 50));
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  if (row.roundId !== undefined) {
    conditions.push('round_id = ?');
    bindings.push(validRoundId(row.roundId));
  }
  if (row.cameraId !== undefined) {
    if (typeof row.cameraId !== 'string' || !allowed.has(row.cameraId))
      throw new ObservationInvalid('cameraId inválido.');
    conditions.push('camera_id = ?');
    bindings.push(row.cameraId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db
    .prepare(
      `SELECT a.round_id, a.camera_id, a.outcome, a.payload_json, a.received_at_ms, r.expected_ids_json, r.state, r.started_at_ms, r.finished_at_ms FROM camera_observation_attempts a JOIN camera_observation_rounds r ON r.round_id = a.round_id ${where ? where.replaceAll('round_id', 'a.round_id').replaceAll('camera_id', 'a.camera_id') + ' AND' : 'WHERE'} a.expires_at > ? AND r.expires_at > ? ORDER BY a.ended_at_ms DESC, a.received_at_ms DESC, a.round_id DESC LIMIT ?`,
    )
    .bind(...bindings, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000), limit)
    .all<{
      round_id: string;
      camera_id: string;
      outcome: string;
      payload_json: string;
      received_at_ms: number;
      expected_ids_json: string;
      state: string;
      started_at_ms: number;
      finished_at_ms: number | null;
    }>();
  return {
    attempts: result.results.map((item) => JSON.parse(item.payload_json)),
    rounds: [...new Map(result.results.map((item) => [item.round_id, {
      roundId: item.round_id,
      expectedIds: JSON.parse(item.expected_ids_json),
      state: item.state,
      startedAt: new Date(item.started_at_ms).toISOString(),
      finishedAt: item.finished_at_ms == null ? null : new Date(item.finished_at_ms).toISOString(),
    }])).values()],
    limit,
  };
}

export async function readObservationRounds(db: Db, input: unknown) {
  const row = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const limit = Math.max(1, Math.min(50, Number.isInteger(row.limit) ? Number(row.limit) : 25));
  const result = await db
    .prepare(
      'SELECT round_id, expected_ids_json, expected_count, state, collector_id, started_at_ms, finished_at_ms, created_at FROM camera_observation_rounds WHERE expires_at > ? ORDER BY started_at_ms DESC, created_at DESC, round_id DESC LIMIT ?',
    )
    .bind(Math.floor(Date.now() / 1000), limit)
    .all<{
      round_id: string;
      expected_ids_json: string;
      expected_count: number;
      state: string;
      collector_id: string;
      started_at_ms: number;
      finished_at_ms: number | null;
      created_at: number;
    }>();
  return {
    rounds: result.results.map((item) => ({
      roundId: item.round_id,
      expectedIds: JSON.parse(item.expected_ids_json),
      expectedCount: item.expected_count,
      state: item.state,
      collectorId: item.collector_id,
      startedAt: new Date(item.started_at_ms).toISOString(),
      finishedAt: item.finished_at_ms == null ? null : new Date(item.finished_at_ms).toISOString(),
      createdAt: new Date(item.created_at * 1000).toISOString(),
    })),
    limit,
  };
}
