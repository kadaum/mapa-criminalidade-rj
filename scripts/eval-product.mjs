import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { contextInsights } from '../lib/context-insights.ts';
import {
  cityMetric,
  rankMetrics,
  regionMetrics,
  windowPeriods,
  periodTotal,
  neighborhoodIndex,
  factualInsights,
  historicalInsights,
} from '../lib/crime-analysis.ts';
let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`PASS ${name}`);
}
const metric = (cisp, count, population, previous = 20) => ({
  cisp,
  count,
  population,
  previous,
  rate: (count / population) * 100000,
  change: ((count - previous) / previous) * 100,
});
check('cidade pondera população', () =>
  assert.equal(
    cityMetric([metric(1, 100, 1000), metric(2, 100, 9000)]).rate,
    2000,
  ),
);
check('empates 1,1,3', () =>
  assert.deepEqual(
    rankMetrics(
      [metric(1, 10, 100), metric(2, 10, 100), metric(3, 5, 100)],
      'count',
    ).map((m) => m.rank),
    [1, 1, 3],
  ),
);
check('ausência não vira zero', () =>
  assert.equal(periodTotal([], ['2026-01'], 'furto'), null),
);
check('duplicata não soma duas vezes', () =>
  assert.equal(
    periodTotal(
      [
        { cisp: 1, period: '2026-01', values: { furto: 2 } },
        { cisp: 1, period: '2026-01', values: { furto: 2 } },
      ],
      ['2026-01'],
      'furto',
    ),
    null,
  ),
);
check('janela consecutiva atravessa ano', () =>
  assert.deepEqual(windowPeriods('2026-02', 3), [
    '2025-12',
    '2026-01',
    '2026-02',
  ]),
);
check('mês novo muda janela', () =>
  assert.notDeepEqual(
    windowPeriods('2026-07', 12),
    windowPeriods('2026-08', 12),
  ),
);
check('população inválida exclui taxa', () =>
  assert.equal(
    regionMetrics(
      [{ cisp: 1, period: '2026-01', values: { furto: 2 } }],
      [{ cisp: 1, population: 0 }],
      'furto',
      '2026-01',
      1,
    )[0].rate,
    null,
  ),
);
check('base pequena não produz manchete percentual', () =>
  assert.equal(factualInsights([metric(1, 50, 1000, 1)]).length, 0),
);
check('empates de insights preservados', () =>
  assert.equal(
    factualInsights([metric(1, 40, 1000), metric(2, 40, 1000)]).length,
    2,
  ),
);
check('zero válido é zero', () =>
  assert.equal(
    periodTotal(
      [{ cisp: 1, period: '2026-01', values: { furto: 0 } }],
      ['2026-01'],
      'furto',
    ),
    0,
  ),
);
check('bairro compartilhado não duplica CISP', () =>
  assert.deepEqual(
    neighborhoodIndex([
      { cisp: 1, neighborhoods: ['Tijuca (parte)', 'Tijuca'] },
      { cisp: 2, neighborhoods: ['Tijuca (parte)'] },
    ])[0].cisps,
    [1, 2],
  ),
);
check('máxima estrita e tendência mensal', () => {
  const rows = windowPeriods('2026-07', 12).map((period, i) => ({
    cisp: 1,
    period,
    values: { furto: 20 + i },
  }));
  const h = historicalInsights(
    rows,
    [{ cisp: 1, population: 1000 }],
    'furto',
    '2026-07',
    1,
  );
  assert(h.some((x) => x.title === 'Máxima mensal em 12 meses · exemplo'));
  assert(
    h.some((x) => x.title === 'Três altas mensais consecutivas · exemplo'),
  );
});
check('máxima empatada não é recorde', () => {
  const rows = windowPeriods('2026-07', 12).map((period) => ({
    cisp: 1,
    period,
    values: { furto: 20 },
  }));
  assert(
    !historicalInsights(
      rows,
      [{ cisp: 1, population: 1000 }],
      'furto',
      '2026-07',
      1,
    ).some((x) => x.title === 'Máxima mensal em 12 meses · exemplo'),
  );
});
if (process.argv.includes('--unit')) {
  console.log(`${passed} avaliações unitárias aprovadas`);
  process.exit(0);
}
const snapshot = JSON.parse(
  await readFile(
    new URL('../public/data/crime-rio-snapshot.json', import.meta.url),
  ),
);
const population = JSON.parse(
  await readFile(
    new URL('../public/data/cisp-population.json', import.meta.url),
  ),
);
check('snapshot real cobre todas as métricas e janelas', () => {
  for (const i of snapshot.indicators)
    for (const months of [1, 3, 6, 12]) {
      const m = regionMetrics(
        snapshot.rows,
        population.records,
        i.id,
        snapshot.latestPeriod,
        months,
      );
      assert.equal(m.length, 41);
      assert(
        m.every(
          (x) => x.count !== null && x.rate !== null && x.previous !== null,
        ),
      );
      assert.equal(cityMetric(m).population, 6211223);
    }
});
const insights = contextInsights(
  snapshot.rows,
  population.records,
  snapshot.latestPeriod,
  12,
);
check('contraste real Ipanema/Leblon usa taxas e vítimas', () => {
  const card = insights.find((x) => x.key === 'contrast-14');
  assert(card);
  const regional = regionMetrics(
    snapshot.rows,
    population.records,
    'total_furtos',
    snapshot.latestPeriod,
    12,
  );
  const cisp = regional.find((item) => item.cisp === 14);
  assert(cisp?.rate);
  assert.equal(card.score, cisp.rate / cityMetric(regional).rate);
  assert(card.evidence.join(' ').includes('casos por 100 mil moradores'));
  assert(card.evidence.join(' ').includes('vítimas por 100 mil'));
});
check('componente não é somado ao agregado', () => {
  const card = insights.find((x) => x.key === 'component-14');
  assert(card);
  assert(card.score > 0);
  assert(card.caveat.includes('já está dentro do total de furtos'));
});
check('concentração CISP22 não vira piora contínua', () => {
  const card = insights.find((x) => x.key === 'concentration-22');
  assert(card);
  assert(card.score > 0);
  assert(card.evidence.join(' ').includes('Os outros 11 meses'));
  assert(card.caveat.includes('não é uma piora contínua'));
});
check('panorama independe da ordem dos dados', () => {
  assert.deepEqual(
    contextInsights(
      [...snapshot.rows].reverse(),
      [...population.records].reverse(),
      snapshot.latestPeriod,
      12,
    ),
    insights,
  );
});
check('panorama rejeita população não finita ou string', () => {
  for (const value of [Infinity, '1234', 0])
    assert.equal(
      contextInsights(
        snapshot.rows,
        population.records.map((p, i) =>
          i === 0 ? { ...p, population: value } : p,
        ),
        snapshot.latestPeriod,
        12,
      ).length,
      0,
    );
});
check('mês ausente ou duplicado não gera card da região', () => {
  const row = snapshot.rows.find(
    (r) => r.cisp === 14 && r.period === snapshot.latestPeriod,
  );
  for (const rows of [
    snapshot.rows.filter((r) => r !== row),
    [...snapshot.rows, row],
  ])
    assert(
      !contextInsights(
        rows,
        population.records,
        snapshot.latestPeriod,
        12,
      ).some((x) => x.cisp === 14),
    );
});
console.log(`${passed} avaliações aprovadas`);
