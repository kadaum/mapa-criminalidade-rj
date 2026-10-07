export const CONTRIBUTION_KINDS = [
  'camera_broken',
  'correct_location',
  'suggest_source',
] as const;
export const CONTRIBUTION_STATUSES = [
  'pending',
  'reviewing',
  'accepted',
  'rejected',
] as const;
export type ContributionKind = (typeof CONTRIBUTION_KINDS)[number];
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];

export const MAX_BODY_BYTES = 12_000;
export const MAX_COMMENT_LENGTH = 1_000;
export const MAX_NOTE_LENGTH = 500;
export const RATE_WINDOW_SECONDS = 15 * 60;
export const RATE_LIMIT = 5;
export const RETENTION_SECONDS = 90 * 24 * 60 * 60;

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '::1' ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe8') ||
    host.startsWith('fe9') ||
    host.startsWith('fea') ||
    host.startsWith('feb')
  )
    return true;
  const octets = host.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  )
    return false;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export function validateContribution(value: unknown) {
  if (!value || typeof value !== 'object')
    return { ok: false as const, error: 'Corpo inválido.' };
  const input = value as Record<string, unknown>;
  if (input.website !== undefined && input.website !== '')
    return {
      ok: false as const,
      error: 'Não foi possível receber a contribuição.',
    };
  if (!CONTRIBUTION_KINDS.includes(input.kind as ContributionKind))
    return { ok: false as const, error: 'Tipo de contribuição inválido.' };
  const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
  if (!comment || comment.length > MAX_COMMENT_LENGTH)
    return {
      ok: false as const,
      error: 'O comentário deve ter entre 1 e 1.000 caracteres.',
    };
  let sourceUrl: string | null = null;
  if (input.sourceUrl !== undefined && input.sourceUrl !== '') {
    if (typeof input.sourceUrl !== 'string' || input.sourceUrl.length > 2_048)
      return { ok: false as const, error: 'Link inválido.' };
    try {
      const parsed = new URL(input.sourceUrl);
      if (
        !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        isPrivateHostname(parsed.hostname)
      )
        throw new Error();
      sourceUrl = parsed.toString();
    } catch {
      return {
        ok: false as const,
        error: 'Use um link público HTTP ou HTTPS válido.',
      };
    }
  }
  if (input.kind === 'suggest_source' && !sourceUrl)
    return { ok: false as const, error: 'Informe o link público da fonte.' };
  return {
    ok: true as const,
    value: { kind: input.kind as ContributionKind, comment, sourceUrl },
  };
}

export function validateReview(value: unknown) {
  if (!value || typeof value !== 'object')
    return { ok: false as const, error: 'Corpo inválido.' };
  const input = value as Record<string, unknown>;
  if (
    !CONTRIBUTION_STATUSES.includes(input.status as ContributionStatus) ||
    input.status === 'pending'
  )
    return { ok: false as const, error: 'Status inválido.' };
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (note.length > MAX_NOTE_LENGTH)
    return {
      ok: false as const,
      error: 'A nota deve ter no máximo 500 caracteres.',
    };
  return {
    ok: true as const,
    value: {
      status: input.status as Exclude<ContributionStatus, 'pending'>,
      note: note || null,
    },
  };
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !!origin && origin === new URL(request.url).origin;
}

export async function readBoundedJson(request: Request) {
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    throw new Response('Content-Type deve ser application/json.', {
      status: 415,
    });
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES)
    throw new Response('Corpo muito grande.', { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) throw new Response('Corpo ausente.', { status: 400 });
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Response('Corpo muito grande.', { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Response('JSON inválido.', { status: 400 });
  }
}

export function moderatorIds(raw: string | undefined) {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function isModerator(
  userId: string | null,
  configured: string | undefined,
) {
  return !!userId && moderatorIds(configured).has(userId);
}

export function moderatorAuthorization(
  userId: string | null,
  configured: string | undefined,
) {
  if (!userId) return { ok: false as const, status: 401 };
  if (!configured || !isModerator(userId, configured))
    return { ok: false as const, status: 403 };
  return { ok: true as const, status: 200 };
}
