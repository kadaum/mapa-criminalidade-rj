import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { buildNeighborhoodLabels } from '../lib/neighborhood-labels.ts';
import { labelAnchor } from '../lib/map-labels.ts';

void test('generated label payload exactly preserves the legacy anchor and priority algorithm', async () => {
  const source = await readFile(new URL('../public/data/neighborhoods-rio.geojson', import.meta.url), 'utf8');
  const geography = JSON.parse(source);
  const hash = createHash('sha256').update(source).digest('hex');
  const payload = buildNeighborhoodLabels(geography, hash);
  const legacy = geography.features
    .map((feature: { geometry: Parameters<typeof labelAnchor>[0]; properties: { code: number; name: string; areaM2?: number } }) => ({
      code: feature.properties.code,
      name: feature.properties.name,
      position: labelAnchor(feature.geometry),
      area: Number(feature.properties.areaM2 ?? 0),
    }))
    .filter((label: { position: [number, number] | null }) => label.position !== null)
    .sort((a: { area: number; name: string }, b: { area: number; name: string }) => b.area - a.area || a.name.localeCompare(b.name))
    .map((label: { code: number; name: string; position: [number, number]; area: number }) => ({
      ...label,
      minZoom: label.area >= 10_000_000 ? 9.8 : label.area >= 2_000_000 ? 10.4 : 11,
    }));

  assert.equal(payload.labels.length, 163);
  assert.equal(payload.sourceSha256, hash);
  assert.deepEqual(payload.labels, legacy);
  assert.equal(JSON.stringify(buildNeighborhoodLabels(geography, hash)), JSON.stringify(payload));
});

void test('label generation fails closed for malformed or anchorless geography', () => {
  assert.throws(() => buildNeighborhoodLabels({}, 'a'.repeat(64)), /FeatureCollection/);
  assert.throws(() => buildNeighborhoodLabels({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { code: 1, name: 'Inválido', areaM2: 1 }, geometry: { type: 'Point', coordinates: [0, 0] } }],
  }, 'a'.repeat(64)), /no valid label anchor/);
});

void test('label generation rejects duplicate neighborhood codes', () => {
  const ring = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
  assert.throws(() => buildNeighborhoodLabels({
    type: 'FeatureCollection',
    features: ['Um', 'Dois'].map((name) => ({
      type: 'Feature',
      properties: { code: 1, name, areaM2: 1 },
      geometry: { type: 'Polygon', coordinates: [ring] },
    })),
  }, 'a'.repeat(64)), /Duplicate neighborhood code 1/);
});
