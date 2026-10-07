import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cameraCoverageFeatureCollection,
  destinationPoint,
  normalizeCoverageParameters,
} from '../lib/camera-coverage.ts';

const origin = [-43.2, -22.9];

function distanceMeters(a, b) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = radians(a[1]);
  const lat2 = radians(b[1]);
  const dLat = lat2 - lat1;
  const dLon = radians(b[0] - a[0]);
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6_371_008.8 * 2 * Math.asin(Math.sqrt(haversine));
}

test('destination bearings are clockwise from north', () => {
  const north = destinationPoint(origin, 0, 100);
  const east = destinationPoint(origin, 90, 100);
  const south = destinationPoint(origin, 180, 100);
  const west = destinationPoint(origin, 270, 100);
  assert.ok(north[1] > origin[1]);
  assert.ok(east[0] > origin[0]);
  assert.ok(south[1] < origin[1]);
  assert.ok(west[0] < origin[0]);
});

test('destination and sector vertices lie at requested geodesic ranges', () => {
  const endpoint = destinationPoint(origin, 37, 640);
  assert.ok(Math.abs(distanceMeters(origin, endpoint) - 640) < 1e-5);

  const coverage = cameraCoverageFeatureCollection(origin, {
    bearingDeg: 37,
    fovDeg: 80,
    rangeMeters: 640,
  });
  const ring = coverage.features[0].geometry.coordinates[0];
  for (const point of ring.slice(1, -1)) {
    assert.ok(Math.abs(distanceMeters(origin, point) - 640) < 1e-5);
  }
});

test('coverage returns a closed GeoJSON sector and a center line of the same range', () => {
  const result = cameraCoverageFeatureCollection(origin, {
    bearingDeg: 90,
    fovDeg: 60,
    rangeMeters: 300,
  });
  assert.equal(result.type, 'FeatureCollection');
  assert.equal(result.features[0].geometry.type, 'Polygon');
  assert.equal(result.features[1].geometry.type, 'LineString');
  const ring = result.features[0].geometry.coordinates[0];
  assert.deepEqual(ring[0], origin);
  assert.deepEqual(ring.at(-1), origin);
  assert.equal(ring.length, 51);
  const line = result.features[1].geometry.coordinates;
  assert.deepEqual(line[0], origin);
  assert.ok(Math.abs(distanceMeters(...line) - 300) < 1e-5);
});

test('parameters normalize bearing and clamp field of view and range', () => {
  assert.deepEqual(normalizeCoverageParameters({ bearingDeg: -10, fovDeg: 2, rangeMeters: 1 }), {
    bearingDeg: 350,
    fovDeg: 10,
    rangeMeters: 25,
  });
  assert.deepEqual(normalizeCoverageParameters({ bearingDeg: 725, fovDeg: 150, rangeMeters: 5000 }), {
    bearingDeg: 5,
    fovDeg: 120,
    rangeMeters: 1000,
  });
  assert.deepEqual(normalizeCoverageParameters({ bearingDeg: 360, fovDeg: 60, rangeMeters: 250 }), {
    bearingDeg: 0,
    fovDeg: 60,
    rangeMeters: 250,
  });
});

test('non-finite parameters fall back to defaults and invalid geometry inputs are rejected', () => {
  assert.deepEqual(normalizeCoverageParameters({
    bearingDeg: Number.NaN,
    fovDeg: Number.POSITIVE_INFINITY,
    rangeMeters: Number.NEGATIVE_INFINITY,
  }), { bearingDeg: 0, fovDeg: 60, rangeMeters: 250 });
  assert.throws(() => destinationPoint([0, 91], 0, 100), RangeError);
  assert.throws(() => destinationPoint(origin, 0, -1), RangeError);
  assert.throws(() => cameraCoverageFeatureCollection(origin, {
    bearingDeg: 0,
    fovDeg: 60,
    rangeMeters: 100,
  }, 0), RangeError);
});
