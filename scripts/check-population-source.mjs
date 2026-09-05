import fs from 'node:fs/promises';

const population = JSON.parse(
  await fs.readFile(
    new URL('../public/data/cisp-population.json', import.meta.url),
    'utf8',
  ),
);

const { cispBoundaryUrl, cispBoundaryLastModified, cispBoundaryEtag } =
  population.source;
const response = await fetch(cispBoundaryUrl, { method: 'HEAD' });

if (!response.ok) {
  throw new Error(
    `Não foi possível verificar o SHP oficial das CISPs: HTTP ${response.status}`,
  );
}

const observedLastModified = response.headers.get('last-modified');
const observedEtag = response.headers.get('etag');
const normalizeEtag = (value) => value?.replace(/:dtagent[^"]*/, '') ?? null;
const lastModifiedDelta = Math.abs(
  Date.parse(observedLastModified ?? '') - Date.parse(cispBoundaryLastModified),
);
const changed =
  !Number.isFinite(lastModifiedDelta) ||
  lastModifiedDelta > 2000 ||
  normalizeEtag(observedEtag) !== normalizeEtag(cispBoundaryEtag);

if (changed) {
  throw new Error(
    [
      'O ISP alterou o SHP oficial das CISPs.',
      'Recalcule cisp-population.json com scripts/derive-census-population.py antes de publicar.',
      `Last-Modified esperado: ${cispBoundaryLastModified}; observado: ${observedLastModified}`,
      `ETag esperado: ${cispBoundaryEtag}; observado: ${observedEtag}`,
    ].join('\n'),
  );
}

console.log(
  JSON.stringify(
    {
      status: 'passed',
      source: cispBoundaryUrl,
      lastModified: observedLastModified,
      etag: observedEtag,
    },
    null,
    2,
  ),
);
