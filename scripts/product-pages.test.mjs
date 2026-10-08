import assert from 'node:assert/strict';
import test from 'node:test';
import snapshot from '../public/data/crime-rio-snapshot.json' with { type: 'json' };
import populations from '../public/data/cisp-population.json' with { type: 'json' };
import context from '../public/data/neighborhood-context.json' with { type: 'json' };
import { availableBulletinPeriods, bulletinMetricFrom } from '../lib/bulletin-core.ts';
import { bulletinMetadata, neighborhoodMetadata } from '../lib/product-page-metadata.ts';

test('boletim de agosto fixa a janela no período da URL e cruza a fonte linha a linha', () => {
  const result = bulletinMetricFrom(snapshot.rows, populations.records, 'total_roubos', '2026-08');
  const sum = (from, to) => snapshot.rows.filter((row) => row.period >= from && row.period <= to).reduce((total, row) => total + row.values.total_roubos, 0);
  assert.equal(result?.count, sum('2025-09', '2026-08'));
  assert.equal(result?.previous, sum('2024-09', '2025-08'));
  assert.equal(result?.count, 58403);
  assert.equal(result?.previous, 65348);
  assert.equal(bulletinMetricFrom(snapshot.rows, populations.records, 'total_roubos', '2026-07')?.count, 58915);
});

test('boletim recusa cobertura mensal incompleta', () => {
  const incomplete = snapshot.rows.filter((row) => !(row.period === '2026-02' && row.cisp === 1));
  assert.equal(bulletinMetricFrom(incomplete, populations.records, 'total_roubos', '2026-08'), null);
  const incompletePrevious = snapshot.rows.filter((row) => !(row.period === '2025-02' && row.cisp === 1));
  assert.equal(bulletinMetricFrom(incompletePrevious, populations.records, 'total_roubos', '2026-08'), null);
  const duplicate = [...snapshot.rows, snapshot.rows.find((row) => row.period === '2026-02' && row.cisp === 1)];
  assert.equal(bulletinMetricFrom(duplicate, populations.records, 'total_roubos', '2026-08'), null);
  const missingValue = structuredClone(snapshot.rows);
  delete missingValue.find((row) => row.period === '2026-02' && row.cisp === 1).values.total_roubos;
  assert.equal(bulletinMetricFrom(missingValue, populations.records, 'total_roubos', '2026-08'), null);
  const negativeValue = structuredClone(snapshot.rows);
  negativeValue.find((row) => row.period === '2026-02' && row.cisp === 1).values.total_roubos = -1;
  assert.equal(bulletinMetricFrom(negativeValue, populations.records, 'total_roubos', '2026-08'), null);
  assert.equal(populations.records.length, 41);
  const incompletePopulation = populations.records.slice(0, 40);
  assert.equal(incompletePopulation.length, 40);
  assert.equal(bulletinMetricFrom(snapshot.rows, incompletePopulation, 'total_roubos', '2026-08'), null);
});

test('hub deriva somente competências com 24 meses completos', () => {
  const periods = availableBulletinPeriods(snapshot.rows, populations.records, ['total_roubos', 'total_furtos', 'letalidade_violenta', 'estelionato']);
  assert.equal(periods[0], '2026-08');
  assert.equal(periods.at(-1), '2025-08');
  assert.equal(periods.length, 13);
  assert.ok(!periods.includes('2024-08'));
  assert.equal(bulletinMetricFrom(snapshot.rows, populations.records, 'total_roubos', '2026-13'), null);
});

test('metadados SSR fixam canonical e recorte no título', () => {
  const neighborhood = neighborhoodMetadata('Tijuca', 'tijuca');
  assert.equal(neighborhood.alternates.canonical, 'https://mapa-criminalidade-rj.ricardoguia.com/bairros/tijuca');
  assert.match(neighborhood.title, /Tijuca: contexto do bairro/);
  const bulletin = bulletinMetadata('2026-08', 'agosto de 2026');
  assert.equal(bulletin.alternates.canonical, 'https://mapa-criminalidade-rj.ricardoguia.com/boletins/2026-08');
  assert.match(bulletin.title, /agosto de 2026/);
});

test('contexto IBGE preserva não declarado dentro do denominador', () => {
  for (const row of context.records) {
    for (const metric of [row.lighting, row.sidewalk]) {
      assert.equal(metric.yes + metric.no + metric.unknown, metric.total);
      assert.equal(metric.total, row.householdsSurveyed);
      assert.equal(metric.yesPct, Number(((metric.yes / metric.total) * 100).toFixed(2)));
    }
  }
});
