import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const snapshot = new URL('../public/data/crime-rio-snapshot.json', import.meta.url);
const digest = () => createHash('sha256').update(readFileSync(snapshot)).digest('hex');

test('an upstream outage cannot replace the published snapshot', () => {
  const before = digest();
  const bootstrap = 'data:text/javascript,' + encodeURIComponent('globalThis.fetch = async () => { throw new Error("simulated upstream outage") }');
  const result = spawnSync(process.execPath, ['--import', bootstrap, fileURLToPath(new URL('./sync-data.mjs', import.meta.url))], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /simulated upstream outage/);
  assert.equal(digest(), before);
});
