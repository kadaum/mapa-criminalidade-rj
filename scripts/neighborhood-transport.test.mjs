import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { BOUNDARY_TOLERANCE_DEGREES, classifyPointInGeometry, joinStopsToNeighborhoods, selectTargetNeighborhoods, validateGeometry } from '../lib/transport-spatial.mjs';

const polygon = (coordinates) => ({ type: 'Polygon', coordinates });
const square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];

void test('classifies polygon interiors, holes, boundaries, and multipolygons', () => {
  const withHole = polygon([square, [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]]]);
  assert.equal(classifyPointInGeometry([1, 1], withHole), 'inside');
  assert.equal(classifyPointInGeometry([3, 3], withHole), 'outside');
  assert.equal(classifyPointInGeometry([2, 3], withHole), 'boundary');
  assert.equal(classifyPointInGeometry([0, 5], withHole), 'boundary');
  assert.equal(classifyPointInGeometry([BOUNDARY_TOLERANCE_DEGREES / 2, 5], withHole), 'boundary');
  assert.equal(classifyPointInGeometry([BOUNDARY_TOLERANCE_DEGREES * 2, 5], withHole), 'inside');
  assert.equal(classifyPointInGeometry([-BOUNDARY_TOLERANCE_DEGREES * 2, 5], withHole), 'outside');
  assert.equal(classifyPointInGeometry([21, 21], { type: 'MultiPolygon', coordinates: [[square], [[[20, 20], [22, 20], [22, 22], [20, 22], [20, 20]]]] }), 'inside');
});

void test('rejects open rings and selects exact municipal codes and names', () => {
  assert.throws(() => validateGeometry(polygon([square.slice(0, -1)])), /closed/);
  const collection = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { code: 5, name: 'Wrong' }, geometry: polygon([square]) }] };
  assert.throws(() => selectTargetNeighborhoods(collection, [{ code: 5, name: 'Centro', slug: 'centro' }]), /Expected exactly one/);
});

void test('excludes boundaries and overlaps while reconciling every source record', () => {
  const neighborhoods = [
    { code: 1, name: 'A', slug: 'a', geometryType: 'Polygon', geometry: polygon([square]) },
    { code: 2, name: 'B', slug: 'b', geometryType: 'Polygon', geometry: polygon([[[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]]) },
  ];
  const point = (stop_id, stop_lon, stop_lat) => ({ stop_id, stop_name: stop_id, stop_lon, stop_lat });
  const result = joinStopsToNeighborhoods([point('inside', 1, 1), point('overlap', 7, 7), point('boundary', 0, 5), point('outside', 30, 30), point('invalid', 181, 0)], neighborhoods);
  assert.deepEqual(result.reconciliation, { source: 5, assignedPilot: 1, outsidePilot: 1, boundaryOrAmbiguous: 2, invalid: 1 });
  assert.deepEqual(result.exceptions.boundaryOrAmbiguous.map(({ reason }) => reason).sort(), ['boundary', 'overlap']);
  assert.throws(() => joinStopsToNeighborhoods([point('same', 1, 1), point('same', 2, 2)], neighborhoods), /Duplicate/);
  assert.throws(() => joinStopsToNeighborhoods([{ ...point('null-name', 1, 1), stop_id: '' }], neighborhoods), /non-empty/);
});

void test('published artifact has the portable public schema', async () => {
  const artifact = JSON.parse(await readFile(new URL('../public/data/neighborhood-transport.json', import.meta.url)));
  assert.equal(artifact.schemaVersion, 1);
  assert.equal(artifact.source.sourceVersion, 'v85');
  assert.equal(artifact.source.itemId, 'fd07613c9a1c45299389c0f7cff8e2a0');
  assert.equal(artifact.method.boundaryToleranceDegrees, BOUNDARY_TOLERANCE_DEGREES);
  assert.equal(artifact.neighborhoods.length, 5);
  assert.equal(artifact.neighborhoods.reduce((sum, neighborhood) => sum + neighborhood.count, 0), artifact.reconciliation.assignedPilot);
  for (const neighborhood of artifact.neighborhoods) {
    assert.equal(neighborhood.count, neighborhood.stops.length);
    assert.ok(neighborhood.stops.every((stop) => typeof stop.stop_name === 'string' && Number.isFinite(stop.stop_lat) && Number.isFinite(stop.stop_lon)));
  }
});

const auditDirectory = process.env.SPPO_AUDIT_DIR;
void test('optional audit recomputes the reviewed source snapshot', { skip: auditDirectory ? false : 'set SPPO_AUDIT_DIR to run the external-source reconciliation' }, async () => {
  const [sourceBytes, geometryBytes, artifactBytes] = await Promise.all([
    readFile(resolve(auditDirectory, 'stops-candidate.json')),
    readFile(new URL('../public/data/neighborhoods-rio.geojson', import.meta.url)),
    readFile(new URL('../public/data/neighborhood-transport.json', import.meta.url)),
  ]);
  const source = JSON.parse(sourceBytes);
  const geometry = JSON.parse(geometryBytes);
  const artifact = JSON.parse(artifactBytes);
  const recomputed = joinStopsToNeighborhoods(source.points, selectTargetNeighborhoods(geometry));
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), artifact.source.candidateSha256);
  assert.deepEqual(artifact.reconciliation, recomputed.reconciliation);
  assert.deepEqual(artifact.neighborhoods, recomputed.neighborhoods);
  assert.deepEqual(artifact.exceptions, recomputed.exceptions);
  assert.equal(artifact.geography.fileSha256, createHash('sha256').update(geometryBytes).digest('hex'));
});

void test('optional audit rejects a changed candidate before replacing the published artifact', { skip: auditDirectory ? false : 'set SPPO_AUDIT_DIR to run the source-integrity check' }, async () => {
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'sppo-v85-integrity-'));
  const artifactUrl = new URL('../public/data/neighborhood-transport.json', import.meta.url);
  const names = ['stops-candidate.json', 'item-metadata.json', 'layer-metadata.json', 'qa.json'];
  try {
    await Promise.all(names.map((name) => copyFile(resolve(auditDirectory, name), resolve(temporaryDirectory, name))));
    const candidatePath = resolve(temporaryDirectory, 'stops-candidate.json');
    const candidateBytes = await readFile(candidatePath);
    await writeFile(candidatePath, Buffer.concat([candidateBytes, Buffer.from('\n')]));
    const before = createHash('sha256').update(await readFile(artifactUrl)).digest('hex');
    const result = spawnSync(process.execPath, [new URL('./build-neighborhood-transport.mjs', import.meta.url).pathname, `--source-dir=${temporaryDirectory}`], { encoding: 'utf8' });
    const after = createHash('sha256').update(await readFile(artifactUrl)).digest('hex');
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /source mismatch for stops-candidate\.json/);
    assert.equal(after, before);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
