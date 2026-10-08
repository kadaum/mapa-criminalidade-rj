import { env } from 'cloudflare:workers';
import { moderatorAuthorization } from './contribution-core';

export function database() {
  if (!env.DB)
    throw new Response('Banco de contribuições indisponível.', { status: 503 });
  return env.DB;
}

export function userId(request: Request) {
  return request.headers.get('oai-authenticated-user-id');
}

export function requireModerator(request: Request): string {
  const id = userId(request);
  const authorization = moderatorAuthorization(id, env.MODERATOR_USER_IDS);
  if (!authorization.ok)
    throw new Response(
      authorization.status === 401
        ? 'Autenticação necessária.'
        : 'Acesso negado.',
      { status: authorization.status },
    );
  return id as string;
}

export function noStoreJson(value: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return Response.json(value, { ...init, headers });
}

export function errorResponse(error: unknown) {
  if (
    error instanceof Response ||
    (typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof error.status === 'number' &&
      'headers' in error &&
      'body' in error)
  ) {
    const response = error as Response;
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  console.error('Contribution request failed', error);
  return new Response('Erro interno.', {
    status: 500,
    headers: { 'Cache-Control': 'no-store' },
  });
}
