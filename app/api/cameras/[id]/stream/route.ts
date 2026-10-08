import { resolveCameraStream } from '@/lib/public-cameras';

const resolvers = {
  'homes-posto-3': 'homes-posto-3',
  'homes-posto-6': 'homes-posto-6',
} as const;
type Resolution = Awaited<ReturnType<typeof resolveCameraStream>>;
const memoryCache = new Map<
  string,
  { expiresAt: number; result: Resolution }
>();
const inFlight = new Map<string, Promise<Resolution>>();

function resolveCached(id: keyof typeof resolvers) {
  const cached = memoryCache.get(id);
  if (cached && cached.expiresAt > Date.now())
    return Promise.resolve(cached.result);
  const pending = inFlight.get(id);
  if (pending) return pending;
  const boundedFetch: typeof fetch = (input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(8_000) });
  const request = resolveCameraStream(id, resolvers[id], boundedFetch)
    .then((result) => {
      memoryCache.set(id, {
        expiresAt: Date.now() + (result.activeStream ? 15 * 60_000 : 60_000),
        result,
      });
      return result;
    })
    .finally(() => inFlight.delete(id));
  inFlight.set(id, request);
  return request;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await context.params;
  const resolver = resolvers[id as keyof typeof resolvers];
  if (!resolver)
    return Response.json(
      { cameraId: id, activeStream: null, reason: 'not-found' },
      {
        status: 404,
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
      },
    );

  const result = await resolveCached(id as keyof typeof resolvers);
  return Response.json(result, {
    status: result.activeStream ? 200 : 503,
    headers: {
      'Cache-Control': result.activeStream
        ? 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800'
        : 'public, max-age=30, s-maxage=60',
      'X-Camera-Playback': 'unconfirmed',
    },
  });
}
