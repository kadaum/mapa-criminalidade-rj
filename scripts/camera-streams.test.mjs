import test from 'node:test';
import assert from 'node:assert/strict';
import {
  playbackFreshness,
  resolveCameraStream,
  youtubePlayerSignal,
} from '../lib/public-cameras.ts';

const at = new Date('2026-10-06T12:00:00Z');
const htmlResponse = (html, init = {}) =>
  new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html' },
    ...init,
  });

test('resolves one ephemeral stream from a registered operator page', async () => {
  let requested;
  const result = await resolveCameraStream(
    'homes-posto-6',
    'homes-posto-6',
    async (url, init) => {
      requested = {
        url:
          typeof url === 'string'
            ? url
            : url instanceof URL
              ? url.href
              : url.url,
        redirect: init?.redirect,
      };
      return htmlResponse(
        '<iframe src="https://www.youtube.com/embed/IhGNK_hImLs"></iframe>' +
          '<iframe src="https://www.youtube.com/embed/IhGNK_hImLs"></iframe>',
      );
    },
    at,
  );
  assert.deepEqual(requested, {
    url: 'https://homesinrio.com/apartment-rio-de-janeiro-copacabana-beach-webcam',
    redirect: 'manual',
  });
  assert.equal(result.activeStream?.streamId, 'IhGNK_hImLs');
  assert.equal(result.activeStream?.status, 'candidate');
  assert.equal(result.activeStream?.expiresAt, '2026-10-06T12:15:00.000Z');
});

test('rejects camera/resolver mismatches before any request', async () => {
  let calls = 0;
  const result = await resolveCameraStream(
    'other-camera',
    'homes-posto-6',
    async () => {
      calls++;
      return htmlResponse('');
    },
  );
  assert.equal(calls, 0);
  assert.equal(result.reason, 'not-found');
});

test('does not follow redirects or accept oversized operator responses', async () => {
  const redirect = await resolveCameraStream(
    'homes-posto-6',
    'homes-posto-6',
    async () =>
      new Response(null, {
        status: 302,
        headers: { location: 'http://127.0.0.1/private' },
      }),
  );
  assert.equal(redirect.reason, 'operator-unavailable');
  const oversized = await resolveCameraStream(
    'homes-posto-6',
    'homes-posto-6',
    async () => htmlResponse('', { headers: { 'content-length': '600000' } }),
  );
  assert.equal(oversized.reason, 'invalid-operator-response');
});

test('reports timeout/fetch failures without reusing a historical stream', async () => {
  const result = await resolveCameraStream(
    'homes-posto-6',
    'homes-posto-6',
    async () => {
      throw new DOMException('Timed out', 'TimeoutError');
    },
  );
  assert.equal(result.activeStream, null);
  assert.equal(result.reason, 'operator-unavailable');
});

test('expires historical health and classifies strict YouTube events', () => {
  const camera = {
    playbackCheck: { checkedAt: '2026-09-26T12:00:00Z' },
  };
  assert.equal(playbackFreshness(camera, at.getTime()), 'expired');
  assert.deepEqual(youtubePlayerSignal('{"event":"onStateChange","info":0}'), {
    kind: 'ended',
  });
  assert.deepEqual(youtubePlayerSignal({ event: 'onError', info: 150 }), {
    kind: 'error',
    code: 150,
  });
  assert.deepEqual(
    youtubePlayerSignal({
      event: 'infoDelivery',
      info: { playerState: 1, currentTime: 4.2 },
    }),
    { kind: 'progress', currentTime: 4.2 },
  );
  assert.deepEqual(
    youtubePlayerSignal({
      event: 'infoDelivery',
      info: { currentTime: '4.2' },
    }),
    {
      kind: 'ignore',
    },
  );
  assert.deepEqual(
    youtubePlayerSignal({
      event: 'infoDelivery',
      info: { playerState: 1, currentTime: Number.NaN },
    }),
    { kind: 'ignore' },
  );
});
