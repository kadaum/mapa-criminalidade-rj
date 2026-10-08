import { env } from 'cloudflare:workers';
import {
  isSameOrigin,
  readBoundedJson,
  validateContribution,
} from '@/lib/contribution-core';
import { database, errorResponse, noStoreJson } from '@/lib/contribution-http';
import { createContribution, hashIp } from '@/lib/contribution-service';

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request))
      return new Response('Origem inválida.', { status: 403 });
    if (!env.CONTRIBUTION_IP_HASH_SECRET)
      return new Response('Contribuições temporariamente indisponíveis.', {
        status: 503,
      });
    const parsed = validateContribution(await readBoundedJson(request));
    if (!parsed.ok)
      return noStoreJson({ error: parsed.error }, { status: 400 });
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const result = await createContribution(
      database(),
      parsed.value,
      await hashIp(ip, env.CONTRIBUTION_IP_HASH_SECRET),
    );
    if (!result.ok)
      return noStoreJson(
        { error: 'Muitas tentativas. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(result.retryAfter) } },
      );
    return noStoreJson(
      { protocol: result.protocol, status: result.status },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
