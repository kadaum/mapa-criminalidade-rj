import fs from 'node:fs/promises';

const snapshot = JSON.parse(
  await fs.readFile(
    new URL('../public/data/crime-rio-snapshot.json', import.meta.url),
    'utf8',
  ),
);
const boundaries = JSON.parse(
  await fs.readFile(
    new URL('../public/data/cisp-rio.geojson', import.meta.url),
    'utf8',
  ),
);
const territories = JSON.parse(
  await fs.readFile(
    new URL('../public/data/cisp-neighborhoods.json', import.meta.url),
    'utf8',
  ),
);
const neighborhoods = JSON.parse(
  await fs.readFile(
    new URL('../public/data/neighborhoods-rio.geojson', import.meta.url),
    'utf8',
  ),
);
const population = JSON.parse(
  await fs.readFile(
    new URL('../public/data/cisp-population.json', import.meta.url),
    'utf8',
  ),
);
const errors = [];
const warnings = [];
const required = [
  'total_roubos',
  'total_furtos',
  'estelionato',
  'roubo_rua',
  'roubo_celular',
  'roubo_veiculo',
  'furto_veiculos',
  'letalidade_violenta',
  'hom_doloso',
  'estupro',
];
const keys = new Set();
for (const row of snapshot.rows) {
  const key = `${row.cisp}:${row.period}`;
  if (keys.has(key)) errors.push(`duplicate:${key}`);
  keys.add(key);
  for (const metric of required) {
    const value = row.values[metric];
    if (!Number.isInteger(value) || value < 0)
      errors.push(`invalid:${key}:${metric}:${value}`);
  }
}
const latestRows = snapshot.rows.filter(
  (row) => row.period === snapshot.latestPeriod,
);
const dataCisps = new Set(latestRows.map((row) => Number(row.cisp)));
const geoCisps = new Set(
  boundaries.features.map((feature) => Number(feature.properties.cisp)),
);
if (dataCisps.size !== 41)
  errors.push(`latest CISP count is ${dataCisps.size}, expected 41`);
if (geoCisps.size !== 41)
  errors.push(`geometry CISP count is ${geoCisps.size}, expected 41`);
for (const cisp of dataCisps)
  if (!geoCisps.has(cisp)) errors.push(`missing geometry:${cisp}`);
for (const cisp of geoCisps)
  if (!dataCisps.has(cisp)) errors.push(`geometry without latest data:${cisp}`);
const territoryCisps = new Set(
  territories.records.map((record) => Number(record.cisp)),
);
if (territoryCisps.size !== 41)
  errors.push(`territory CISP count is ${territoryCisps.size}, expected 41`);
for (const cisp of dataCisps)
  if (!territoryCisps.has(cisp))
    errors.push(`missing neighborhood relation:${cisp}`);
for (const record of territories.records)
  if (!record.territorialUnit || !record.neighborhoods?.length)
    errors.push(`empty neighborhood relation:${record.cisp}`);
const populationCisps = new Set(
  population.records.map((record) => Number(record.cisp)),
);
if (populationCisps.size !== 41)
  errors.push(`population CISP count is ${populationCisps.size}, expected 41`);
for (const cisp of dataCisps)
  if (!populationCisps.has(cisp)) errors.push(`missing population:${cisp}`);
for (const record of population.records) {
  if (!Number.isInteger(record.population) || record.population <= 0)
    errors.push(`invalid population:${record.cisp}:${record.population}`);
  if (!Number.isInteger(record.sectors) || record.sectors <= 0)
    errors.push(`invalid sector count:${record.cisp}:${record.sectors}`);
}
const populationTotal = population.records.reduce(
  (total, record) => total + record.population,
  0,
);
if (populationTotal !== 6211223)
  errors.push(`population total is ${populationTotal}, expected 6211223`);
if (
  populationTotal !== population.audit.populationTotal ||
  populationTotal !== population.audit.populationAssigned
)
  errors.push('population audit totals do not reconcile');
if (population.audit.unmatchedPopulation !== 0)
  errors.push(
    `unmatched population is ${population.audit.unmatchedPopulation}`,
  );
if (population.audit.sectorCount !== 13782)
  errors.push(
    `sector count is ${population.audit.sectorCount}, expected 13782`,
  );
if (neighborhoods.features.length < 160)
  errors.push(
    `neighborhood geometry count is ${neighborhoods.features.length}, expected at least 160`,
  );
const neighborhoodCodes = new Set(
  neighborhoods.features.map((feature) => Number(feature.properties.code)),
);
if (neighborhoodCodes.size !== neighborhoods.features.length)
  errors.push('duplicate neighborhood code');
const periodCounts = Object.groupBy(snapshot.rows, (row) => row.period);
for (const [period, rows] of Object.entries(periodCounts))
  if (rows.length !== 41)
    errors.push(`period ${period} has ${rows.length} rows`);
const [year, month] = snapshot.latestPeriod.split('-').map(Number);
const ageDays = Math.floor((Date.now() - Date.UTC(year, month, 1)) / 86400000);
if (ageDays > 93) warnings.push(`latest competence is ${ageDays} days old`);
if (snapshot.latestPhase.includes(2))
  warnings.push(
    'latest competence is phase 2 (consolidated without quarterly errata)',
  );
if (!snapshot.source.sha256 || snapshot.source.sha256.length !== 64)
  errors.push('missing source SHA-256');
if (errors.length) {
  console.error(
    JSON.stringify(
      { status: 'failed', errors: [...new Set(errors)], warnings },
      null,
      2,
    ),
  );
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      status: 'passed',
      latestPeriod: snapshot.latestPeriod,
      rows: snapshot.rows.length,
      cispCount: dataCisps.size,
      geometryCount: geoCisps.size,
      territoryCount: territoryCisps.size,
      neighborhoodCount: neighborhoods.features.length,
      populationCispCount: populationCisps.size,
      populationTotal,
      populationSectorCount: population.audit.sectorCount,
      sourceSha256: snapshot.source.sha256,
      warnings,
    },
    null,
    2,
  ),
);
