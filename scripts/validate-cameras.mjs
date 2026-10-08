import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const catalog = JSON.parse(
  readFileSync('public/data/public-cameras.json', 'utf8'),
);
const evidence = JSON.parse(
  readFileSync('public/data/camera-location-evidence.json', 'utf8'),
);
const boundaries = JSON.parse(
  readFileSync('public/data/neighborhoods-rio.geojson', 'utf8'),
);
function ringContains([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i],
      [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
function polygonContains(p, rings) {
  return (
    ringContains(p, rings[0]) && !rings.slice(1).some((r) => ringContains(p, r))
  );
}
function inRio(p) {
  return boundaries.features.some(({ geometry: g }) =>
    g.type === 'Polygon'
      ? polygonContains(p, g.coordinates)
      : g.coordinates.some((r) => polygonContains(p, r)),
  );
}
const ids = new Set(),
  videos = new Set();
const counts = {
  total: 0,
  mapped: 0,
  publicMapped: 0,
  pending: 0,
  intersections: 0,
  addresses: 0,
  observed: 0,
  resolvable: 0,
};
for (const c of catalog.cameras) {
  assert(!ids.has(c.id), `Duplicate camera ID ${c.id}`);
  ids.add(c.id);
  counts.total++;
  assert(['observed', 'unverified', 'failed', 'offline'].includes(c.status));
  assert(['public', 'registration', 'subscription'].includes(c.access));
  assert(c.name && c.publisher && c.operator && c.neighborhood);
  for (const key of ['source', 'watchUrl', 'locationSource'])
    if (c[key]) {
      const u = new URL(c[key]);
      assert.equal(u.protocol, 'https:', `${c.id}: insecure URL`);
      assert(!u.username && !u.password, `${c.id}: authenticated URL`);
      assert(
        !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
          u.hostname,
        ),
      );
      assert(
        !/token|password|secret|api[_-]?key/i.test(u.search),
        `${c.id}: sensitive query`,
      );
    }
  if (c.youtubeId) {
    assert(/^[\w-]{11}$/.test(c.youtubeId));
    assert(
      !videos.has(c.youtubeId),
      'Duplicate YouTube stream counted as two cameras',
    );
    videos.add(c.youtubeId);
  }
  if (c.streamResolver) {
    assert(
      ['homes-posto-3', 'homes-posto-6'].includes(c.streamResolver),
      `${c.id}: unknown stream resolver`,
    );
    assert.equal(c.streamResolver, c.id, `${c.id}: resolver identity mismatch`);
    assert(
      !c.youtubeId && !c.watchUrl,
      `${c.id}: ephemeral stream stored as camera identity`,
    );
    assert(
      Array.isArray(c.historicalStreams),
      `${c.id}: missing stream history`,
    );
    for (const stream of c.historicalStreams) {
      assert.equal(stream.provider, 'youtube');
      assert(/^[\w-]{11}$/.test(stream.streamId));
      assert(
        ['playing', 'ended', 'unavailable', 'unknown'].includes(stream.outcome),
      );
    }
    counts.resolvable++;
  }
  if (c.status === 'observed') {
    assert(
      c.checkedAt && c.note,
      'Observation requires date and qualification',
    );
    counts.observed++;
  }
  if (c.coordinates) {
    assert.equal(c.coordinates.length, 2);
    assert(c.coordinates.every(Number.isFinite));
    const [x, y] = c.coordinates;
    assert(
      x > -44 && x < -43 && y > -23.2 && y < -22.7,
      `${c.id}: outside Rio vicinity`,
    );
    assert(
      c.precision !== 'unresolved' && c.locationSource,
      `${c.id}: mapped without location provenance`,
    );
    counts.mapped++;
    if (c.access === 'public') counts.publicMapped++;
    if (c.precision === 'address') {
      const e = evidence[c.id];
      assert(e && Number.isInteger(e.number) && e.number > 0);
      assert.equal(e.side, e.number % 2 === 0 ? 'par' : 'imp');
      assert(
        e.officialRange.length === 2 && e.officialRange.every(Number.isInteger),
      );
      const [lo, hi] = e.officialRange;
      assert(lo !== hi && lo % 2 === e.number % 2 && hi % 2 === e.number % 2);
      assert(e.number >= Math.min(lo, hi) && e.number <= Math.max(lo, hi));
      assert(e.objectId && e.matchedName && e.matchedNeighborhood);
      assert(
        inRio(c.coordinates),
        `${c.id}: interpolated address outside municipality`,
      );
      counts.addresses++;
    }
    if (c.precision === 'intersection') {
      const e = evidence[c.id];
      assert(e?.matchedNames.length === 2 && e.objectIds.length === 2);
      assert(e.distanceMeters <= 15);
      assert(
        inRio(c.coordinates),
        `${c.id}: official street reference outside municipality`,
      );
      counts.intersections++;
    }
  } else {
    assert.equal(c.precision, 'unresolved');
    counts.pending++;
  }
}
assert(counts.mapped > 0);
assert.equal(counts.total, counts.mapped + counts.pending);
assert.equal(
  Object.keys(evidence).length,
  counts.intersections + counts.addresses,
);
console.log(JSON.stringify(counts, null, 2));
