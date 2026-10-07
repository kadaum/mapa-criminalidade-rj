import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { MAX_BODY_BYTES } from '../lib/contribution-core.ts';
import {
  finalizeObservationRound,
  ObservationConflict,
  ObservationInvalid,
  readObservationAttempts,
  readObservationRounds,
  recordObservationAttempt,
  startObservationRound,
} from '../lib/camera-observation-service.ts';

class SqliteStatement {
  private args: Array<string | number | bigint | Uint8Array | null> = [];
  private statement: ReturnType<DatabaseSync['prepare']>;
  constructor(statement: ReturnType<DatabaseSync['prepare']>) { this.statement = statement; }
  bind(...args: unknown[]) { this.args = args as Array<string | number | bigint | Uint8Array | null>; return this; }
  async run() { const result = this.statement.run(...this.args); return { meta: { changes: Number(result.changes) }, results: [], success: true }; }
  async all<T>() { return { results: this.statement.all(...this.args) as T[], success: true, meta: {} }; }
  async first<T>() { return (this.statement.get(...this.args) as T | undefined) ?? null; }
}
class SqliteDb {
  readonly db = new DatabaseSync(':memory:');
  constructor() {
    this.db.exec('PRAGMA foreign_keys = ON');
    const migrations = ['drizzle/0000_handy_wrecker.sql','drizzle/0001_open_zarda.sql'];
    for (const file of migrations) for (const sql of readFileSync(file,'utf8').split('--> statement-breakpoint').map((item) => item.trim()).filter(Boolean)) this.db.exec(sql);
  }
  prepare(sql: string) { return new SqliteStatement(this.db.prepare(sql)) as unknown as D1PreparedStatement; }
  async batch(statements: D1PreparedStatement[]) { return Promise.all(statements.map((statement) => (statement as unknown as SqliteStatement).run())) as unknown as D1Result<unknown>[]; }
}

const now = Math.floor(Date.parse('2026-10-07T12:02:00.000Z') / 1000);
const round = (roundId = 'round-0001', expectedIds = ['camerasrj-6170']) => ({ roundId, expectedIds, startedAt: '2026-10-07T12:00:00.000Z' });
const sample = (at: string, frames: number) => ({
  at, monotonicMs: frames === 10 ? 1000 : 5200, sameDomVideo: true, sameStream: true,
  sameTrack: true, trackLive: true, readyState: 4, width: 1280, height: 720,
  qualityTotalFrames: frames, qualityDroppedFrames: 0, counterBasis: 'quality_non_dropped',
  counterFrames: frames, presentedFrames: frames,
});
const attempt = (roundId = 'round-0001') => ({
  roundId, id: 'camerasrj-6170', source: 'https://www.camerasrj.com.br/?bairro=Vila+Isabel&camera=6170',
  publisher: 'CamerasRJ', operator: 'unknown', permission: 'unknown', adapter: 'camerasrj',
  context: { device: 'desktop', origin: 'https://mapa-criminalidade-rj.ricardoguia.com', headless: true, browser: 'Mozilla/5.0 Chrome/120.0.0.0', viewport: { width: 1280, height: 720 } },
  startedAt: '2026-10-07T12:00:00.000Z', endedAt: '2026-10-07T12:01:00.000Z', durationMs: 60000,
  observationDurationMs: 45000, firstFrame: { at: '2026-10-07T12:00:00.500Z', signal: 'provider_first_frame_live_track' },
  samples: [sample('2026-10-07T12:00:01.000Z',10),sample('2026-10-07T12:00:05.200Z',11)],
  errorCategory: null, providerError: null, restricted: false, external: false,
  sameVideoSourceIdentity: true, youtubeApiPlaying: true, renderedFrame: true, navigationError: null,
});

void test('round and attempt writes are durable, idempotent, closed to collisions and retry after close', async () => {
  const db = new SqliteDb() as unknown as D1Database;
  assert.equal((await startObservationRound(db, round(), 'moderator-1', now)).idempotent, false);
  assert.equal((await startObservationRound(db, round(), 'moderator-1', now)).idempotent, true);
  await assert.rejects(() => startObservationRound(db, round('round-0001',['camerasrj-354']), 'moderator-1', now), ObservationConflict);
  assert.equal((await recordObservationAttempt(db, attempt(), now)).outcome, 'playing');
  assert.equal((await finalizeObservationRound(db, { roundId: 'round-0001', state: 'complete' }, now)).state, 'complete');
  assert.equal((await recordObservationAttempt(db, attempt(), now)).idempotent, true);
  await assert.rejects(() => recordObservationAttempt(db, { ...attempt(), durationMs: 59000 }, now), ObservationConflict);
  const exported = await readObservationAttempts(db, { roundId: 'round-0001', limit: 10 });
  assert.equal(exported.attempts.length, 1);
  assert.equal(exported.attempts[0].context.browser, 'Chromium/120');
  assert.equal(exported.rounds[0].state, 'complete');
  assert.ok(Buffer.byteLength(JSON.stringify({ attempt: attempt() })) < MAX_BODY_BYTES);
});

void test('complete is atomic on exact count; competing terminal state remains stable', async () => {
  const db = new SqliteDb() as unknown as D1Database;
  await startObservationRound(db, round('round-0002'), 'moderator-1', now);
  await assert.rejects(() => finalizeObservationRound(db, { roundId: 'round-0002', state: 'complete' }, now), ObservationConflict);
  assert.equal((await finalizeObservationRound(db, { roundId: 'round-0002', state: 'partial' }, now)).state, 'partial');
  assert.equal((await finalizeObservationRound(db, { roundId: 'round-0002', state: 'partial' }, now)).idempotent, true);
  await assert.rejects(() => finalizeObservationRound(db, { roundId: 'round-0002', state: 'failed' }, now), ObservationConflict);

  await startObservationRound(db, round('round-0005'), 'moderator-1', now);
  const competing = await Promise.allSettled([
    finalizeObservationRound(db, { roundId: 'round-0005', state: 'partial' }, now),
    finalizeObservationRound(db, { roundId: 'round-0005', state: 'failed' }, now),
  ]);
  assert.equal(competing.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(competing.filter((result) => result.status === 'rejected').length, 1);
  const persisted = (await readObservationRounds(db, { limit: 10 })).rounds.find((item: { roundId: string }) => item.roundId === 'round-0005');
  assert.equal(persisted?.state, (competing.find((result) => result.status === 'fulfilled') as PromiseFulfilledResult<{ state: string }>).value.state);
});

void test('unknown remains canonical evidence, never offline or catalog mutation', async () => {
  const db = new SqliteDb() as unknown as D1Database;
  await startObservationRound(db, round('round-0003'), 'moderator-1', now);
  const unknown = { ...attempt('round-0003'), firstFrame: null, samples: null, sameVideoSourceIdentity: false, youtubeApiPlaying: false, renderedFrame: false };
  assert.equal((await recordObservationAttempt(db, unknown, now)).outcome, 'unknown');
  const data = await readObservationAttempts(db, { cameraId: 'camerasrj-6170' });
  assert.equal(data.attempts[0].outcome, 'unknown');
  assert.equal(JSON.stringify(data).includes('offline'), false);
  const rounds = await readObservationRounds(db, { limit: 1 });
  assert.equal(rounds.rounds[0].state, 'open');
});

void test('attempt cannot predate its round and raw provider values are rejected generically', async () => {
  const db = new SqliteDb() as unknown as D1Database;
  await startObservationRound(db, round('round-0004'), 'moderator-1', now);
  await assert.rejects(() => recordObservationAttempt(db, { ...attempt('round-0004'), startedAt: '2026-10-07T11:59:00.000Z' }, now), ObservationInvalid);
  const bad = { ...attempt('round-0004'), errorCategory: 'source', providerError: { at: '2026-10-07T12:00:30.000Z', state: 'error', code: 'https://secret.invalid/token', httpStatus: 500 } };
  await assert.rejects(() => recordObservationAttempt(db, bad, now), (error: ObservationInvalid) => error.message === 'providerError não reconhecido.');
});

void test('readback orders by observation time and hides logically expired rows', async () => {
  const fixture = new SqliteDb();
  const db = fixture as unknown as D1Database;
  await startObservationRound(db, round('round-old1'), 'moderator-1', now);
  await startObservationRound(db, round('round-new1'), 'moderator-1', now);
  const older = {
    ...attempt('round-old1'), endedAt: '2026-10-07T12:00:50.000Z', durationMs: 50000,
  };
  await recordObservationAttempt(db, older, now);
  await recordObservationAttempt(db, attempt('round-new1'), now);
  let readback = await readObservationAttempts(db, { cameraId: 'camerasrj-6170', limit: 10 });
  assert.deepEqual(readback.attempts.map((item: { roundId: string }) => item.roundId), ['round-new1','round-old1']);
  fixture.db.prepare('UPDATE camera_observation_attempts SET expires_at = ? WHERE round_id = ?').run(now - 1, 'round-old1');
  fixture.db.prepare('UPDATE camera_observation_rounds SET expires_at = ? WHERE round_id = ?').run(now - 1, 'round-old1');
  readback = await readObservationAttempts(db, { cameraId: 'camerasrj-6170', limit: 10 });
  assert.deepEqual(readback.attempts.map((item: { roundId: string }) => item.roundId), ['round-new1']);
  assert.equal((await readObservationRounds(db, { limit: 10 })).rounds.some((item: { roundId: string }) => item.roundId === 'round-old1'), false);
});

void test('reviewer consumes canonical export without research config and preserves permanent fields', (context) => {
  const dir = mkdtempSync(join(tmpdir(), 'camera-review-v83-'));
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  const catalogPath = join(dir, 'catalog.json');
  const observationsPath = join(dir, 'attempts.jsonl');
  const reviewedPath = join(dir, 'reviewed.json');
  const outputPath = join(dir, 'output.json');
  const camera = { id: 'camerasrj-6170', source: 'https://www.camerasrj.com.br/?bairro=Vila+Isabel&camera=6170', publisher: 'CamerasRJ', operator: 'Não informado pelo catálogo', coordinates: [-43.2,-22.9], precision: 'intersection', locationSource: 'evidence', historicalStreams: ['stable'], status: 'unverified' };
  writeFileSync(catalogPath, `${JSON.stringify({ cameras: [camera] })}\n`);
  writeFileSync(observationsPath, `${JSON.stringify({ ...attempt('round-0006'), outcome: 'playing' })}\n`);
  writeFileSync(reviewedPath, `${JSON.stringify([{ roundId: 'round-0006', id: 'camerasrj-6170' }])}\n`);
  const result = spawnSync(process.execPath, ['scripts/cameras/review-priority-observations.mjs', `--catalog=${catalogPath}`, `--observations=${observationsPath}`, `--reviewed=${reviewedPath}`, `--output=${outputPath}`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const reviewed = JSON.parse(readFileSync(outputPath, 'utf8'));
  for (const key of ['id','source','operator','coordinates','precision','locationSource','historicalStreams'] as const) assert.deepEqual(reviewed.cameras[0][key], camera[key]);
  assert.equal(reviewed.cameras[0].status, 'observed');
  writeFileSync(catalogPath, `${JSON.stringify({ cameras: [{ ...camera, source: 'https://example.invalid/changed' }] })}\n`);
  const mismatch = spawnSync(process.execPath, ['scripts/cameras/review-priority-observations.mjs', `--catalog=${catalogPath}`, `--observations=${observationsPath}`, `--reviewed=${reviewedPath}`, `--output=${outputPath}`], { encoding: 'utf8' });
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /identity differs from catalog/);
  const production = spawnSync(process.execPath, ['scripts/cameras/review-priority-observations.mjs', '--catalog=x', '--observations=x', '--reviewed=x', '--output=public/data/public-cameras.json'], { encoding: 'utf8' });
  assert.notEqual(production.status, 0);
  assert.match(production.stderr, /refusing to write the production catalog/);
});
