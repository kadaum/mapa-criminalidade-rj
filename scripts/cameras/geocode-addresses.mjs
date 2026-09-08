#!/usr/bin/env node
import fs from 'node:fs';
import https from 'node:https';

const [INPUT, STREETS, NEIGH, CACHE, OUTPUT] = process.argv.slice(2);
if (!OUTPUT)
  throw new Error(
    'Usage: node geocode-addresses.mjs CATALOG STREETS NEIGHBORHOODS CACHE OUTPUT',
  );
const SUMMARY = OUTPUT + '.summary.json';
const ENDPOINT =
  'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Trechos_Logradouros/MapServer/0/query';

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^AVENIDA\b/, 'AV')
    .replace(/^AV\b/, 'AV')
    .replace(/^RUA\b/, 'R')
    .replace(/^R\b/, 'R')
    .replace(/^ESTRADA\b/, 'ESTR')
    .replace(/^ESTR\b/, 'ESTR');
}
function key(name, bairro) {
  return norm(name) + '|' + norm(bairro);
}
function request(params) {
  const u = new URL(ENDPOINT);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return new Promise((resolve, reject) =>
    https
      .get(
        u,
        { headers: { 'User-Agent': 'catalog-address-research/1.0' } },
        (r) => {
          let body = '';
          r.on('data', (x) => (body += x));
          r.on('end', () => {
            if (r.statusCode !== 200)
              return reject(new Error(`HTTP ${r.statusCode}`));
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        },
      )
      .on('error', reject),
  );
}
function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i],
      [xj, yj] = ring[j];
    const hit =
      yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}
function pointInPolygon(pt, rings) {
  return (
    rings.length > 0 &&
    pointInRing(pt, rings[0]) &&
    !rings.slice(1).some((hole) => pointInRing(pt, hole))
  );
}
function pointInFeature(pt, f) {
  const g = f.geometry;
  if (!g) return false;
  if (g.type === 'Polygon') return pointInPolygon(pt, g.coordinates);
  if (g.type === 'MultiPolygon')
    return g.coordinates.some((p) => pointInPolygon(pt, p));
  return false;
}
function interpolate(coords, n, lo, hi) {
  if (
    !Array.isArray(coords) ||
    coords.length < 2 ||
    lo == null ||
    hi == null ||
    hi === lo
  )
    return null;
  let total = 0;
  const seg = [];
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0],
      dy = coords[i][1] - coords[i - 1][1];
    const l = Math.hypot(dx, dy);
    seg.push(l);
    total += l;
  }
  if (!total) return coords[0];
  const t = Math.max(0, Math.min(1, (n - lo) / (hi - lo)));
  const want = t * total;
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    if (want <= acc + seg[i - 1] || i === coords.length - 1) {
      const q = seg[i - 1]
        ? Math.max(0, Math.min(1, (want - acc) / seg[i - 1]))
        : 0;
      return [
        coords[i - 1][0] + q * (coords[i][0] - coords[i - 1][0]),
        coords[i - 1][1] + q * (coords[i][1] - coords[i - 1][1]),
      ];
    }
    acc += seg[i - 1];
  }
  return coords[coords.length - 1];
}
async function main() {
  const catalog = JSON.parse(fs.readFileSync(INPUT)),
    streets = JSON.parse(fs.readFileSync(STREETS)),
    neigh = JSON.parse(fs.readFileSync(NEIGH));
  const byKey = new Map(),
    byId = new Map();
  for (const f of streets.features) {
    const p = f.properties;
    byId.set(Number(p.objectid), f);
    const k = key(p.completo, p.bairro);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(f);
  }
  const parsed = [];
  const stats = {
    input: catalog.cameras.length,
    existing: 0,
    pending: 0,
    numberParsed: 0,
    nameNeighborhoodMatch: 0,
    rangeMatch: 0,
    resolved: 0,
    ambiguous: 0,
    outsideMunicipality: 0,
    noName: 0,
    noRange: 0,
    unsupported: 0,
  };
  for (const c of catalog.cameras) {
    if (c.coordinates) {
      stats.existing++;
      continue;
    }
    stats.pending++;
    const raw = String(c.name || '')
      .replace(/\s*-\s*FIXA\s*$/i, '')
      .trim();
    const m = raw.match(/(?:,|\s)(\d{1,6})\s*$/);
    if (!m) {
      stats.unsupported++;
      continue;
    }
    const n = Number(m[1]);
    const street = raw
      .slice(0, m.index)
      .replace(/[,. ]+$/, '')
      .trim();
    const candidates = byKey.get(key(street, c.neighborhood)) || [];
    stats.numberParsed++;
    if (candidates.length) stats.nameNeighborhoodMatch++;
    else stats.noName++;
    parsed.push({ c, n, street, candidates });
  }
  const ids = [
    ...new Set(
      parsed.flatMap((x) =>
        x.candidates.map((f) => Number(f.properties.objectid)),
      ),
    ),
  ];
  let attrs = {};
  if (fs.existsSync(CACHE)) {
    try {
      attrs = JSON.parse(fs.readFileSync(CACHE));
    } catch {}
  }
  const missing = ids.filter((id) => !attrs[id]);
  for (let i = 0; i < missing.length; i += 150) {
    const batch = missing.slice(i, i + 150);
    const j = await request({
      where: `objectid IN (${batch.join(',')})`,
      outFields:
        'objectid,completo,bairro,np_ini_par,np_fin_par,np_ini_imp,np_fin_imp,cod_trecho,cl',
      returnGeometry: 'false',
      f: 'json',
    });
    for (const f of j.features || [])
      attrs[f.attributes.objectid] = f.attributes;
    fs.writeFileSync(CACHE, JSON.stringify(attrs));
  }
  fs.writeFileSync(CACHE, JSON.stringify(attrs));
  const municipality = neigh.features;
  for (const x of parsed) {
    const c = x.c,
      matches = [];
    const side = x.n % 2 === 0 ? 'par' : 'imp';
    for (const f of x.candidates) {
      const a = attrs[f.properties.objectid];
      if (!a) continue;
      if (key(a.completo, a.bairro) !== key(x.street, c.neighborhood)) continue;
      const lo = Number(a[`np_ini_${side}`]),
        hi = Number(a[`np_fin_${side}`]);
      const coherent =
        Number.isInteger(lo) &&
        Number.isInteger(hi) &&
        lo !== hi &&
        lo % 2 === x.n % 2 &&
        hi % 2 === x.n % 2;
      if (coherent && x.n >= Math.min(lo, hi) && x.n <= Math.max(lo, hi)) {
        matches.push({ f, a, side, lo, hi });
      }
    }
    if (matches.length === 1) {
      const q = matches[0],
        g = q.f.geometry;
      const pt =
        g.type === 'LineString'
          ? interpolate(g.coordinates, x.n, q.lo, q.hi)
          : null;
      if (pt && municipality.some((f) => pointInFeature(pt, f))) {
        c.coordinates = pt;
        c.locationStatus = 'address-range-interpolated';
        c.locationPrecision = 'address-range';
        c.locationEvidence = {
          sourceUrl: ENDPOINT,
          matchedName: q.a.completo,
          matchedNeighborhood: q.a.bairro,
          objectId: Number(q.f.properties.objectid),
          codTrecho: q.a.cod_trecho,
          cl: q.a.cl,
          number: x.n,
          side: q.side,
          officialRange: [q.lo, q.hi],
          method:
            'Exact normalized street name and catalog neighborhood; unique official CADLOG segment whose parity-side number range contains the address. Coordinate linearly interpolated along official segment by the requested number; reference approximation, not a surveyed camera position.',
          municipalityCheck: 'point-in-neighborhoods-rio.geojson',
          sourceFields: [
            'np_ini_par',
            'np_fin_par',
            'np_ini_imp',
            'np_fin_imp',
          ],
        };
        stats.resolved++;
        stats.rangeMatch++;
      } else if (pt) {
        stats.outsideMunicipality++;
      }
    } else if (matches.length > 1) stats.ambiguous++;
    else stats.noRange++;
  }
  catalog.addressGeocoding = {
    sourceUrl: ENDPOINT,
    cachePath: CACHE,
    method:
      'Conservative exact-name + exact-bairro + official range matching; one unique segment only; unresolved/ambiguous addresses remain null.',
    runStats: stats,
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(catalog, null, 2));
  fs.writeFileSync(
    SUMMARY,
    JSON.stringify(
      {
        stats,
        cacheRecords: Object.keys(attrs).length,
        output: OUTPUT,
        cache: CACHE,
        endpoint: ENDPOINT,
        restrictions: [
          'No municipal CSV/storage feeds used',
          'Existing coordinates preserved',
          'No neighborhood-centroid fallback',
          'Interpolated points are approximate address references',
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        stats,
        cacheRecords: Object.keys(attrs).length,
        output: OUTPUT,
        cache: CACHE,
      },
      null,
      2,
    ),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
