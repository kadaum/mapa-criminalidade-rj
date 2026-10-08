import test from 'node:test';
import assert from 'node:assert/strict';
import {
  preferredCameraSource,
  compareCameraPlayback,
} from '../lib/public-cameras.ts';
const base = {
  id: 'a',
  name: 'A',
  status: 'failed',
  access: 'public',
  coordinates: [-43, -23],
  youtubeId: 'abcdefghijk',
};
test('prefers a verified public source of the same exact video', () => {
  const b = {
    ...base,
    id: 'b',
    status: 'observed',
    playbackCheck: { checkedAt: new Date().toISOString() },
  };
  assert.equal(preferredCameraSource(base, [base, b]).id, 'b');
});
test('does not promote an expired historical observation', () => {
  const b = {
    ...base,
    id: 'b',
    status: 'observed',
    playbackCheck: { checkedAt: '2026-01-01T00:00:00Z' },
  };
  assert.equal(preferredCameraSource(base, [base, b]).id, 'a');
});
test('never substitutes a different video just because coordinates match', () => {
  const b = { ...base, id: 'b', status: 'observed', youtubeId: 'different12' };
  assert.equal(preferredCameraSource(base, [base, b]).id, 'a');
});
test('does not select a restricted source and ranks verified public options first', () => {
  const b = { ...base, id: 'b', status: 'observed', access: 'subscription' };
  assert.equal(preferredCameraSource(base, [base, b]).id, 'a');
  assert.ok(compareCameraPlayback({ ...base, status: 'observed' }, base) < 0);
});
