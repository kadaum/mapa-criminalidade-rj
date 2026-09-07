import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv, count, sumComplete, annualize } from './sync-history.mjs';
test('CSV quotes and missing counts are preserved', () => {
  assert.deepEqual(parseCsv('a;b\n"x;y";\n'), [{ a: 'x;y', b: '' }]);
  assert.equal(count(''), null);
  assert.equal(count('0'), 0);
  assert.throws(() => count('-1'));
  assert.equal(sumComplete([1, null]), null);
});
test('rates require 12 months and population of that exact year', () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    period: `2020-${String(i + 1).padStart(2, '0')}`,
    values: { x: 10 },
  }));
  const population = { 2020: { value: 1000 } };
  assert.equal(annualize(rows, ['x'], population)[0].rates.x, 12000);
  assert.equal(annualize(rows.slice(0, 7), ['x'], population)[0].rates.x, null);
  assert.equal(
    annualize(rows, ['x'], { 2022: { value: 1000 } })[0].rates.x,
    null,
  );
  rows[2].values.x = null;
  assert.equal(annualize(rows, ['x'], population)[0].rates.x, null);
});
test('published historical snapshot has continuous months and defensible denominators', () => {
  const d = JSON.parse(
    fs.readFileSync(
      new URL('../public/data/crime-rio-history.json', import.meta.url),
    ),
  );
  assert.equal(d.firstPeriod, '2003-01');
  assert.ok(d.months.length >= 283);
  assert.equal(new Set(d.months.map((m) => m.period)).size, d.months.length);
  for (let i = 1; i < d.months.length; i++) {
    const [y, m] = d.months[i - 1].period.split('-').map(Number);
    assert.equal(
      d.months[i].period,
      new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7),
    );
  }
  assert.equal(d.population['2010'].value, 6320446);
  assert.equal(d.population['2022'].value, 6211223);
  assert.notEqual(d.population['2003'].value, d.population['2022'].value);
  for (const y of d.years)
    for (const id of d.indicators.map((i) => i.id)) {
      assert.equal(
        y.rates[id],
        y.complete && y.population && y.values[id] !== null
          ? (y.values[id] / y.population.value) * 100000
          : null,
      );
    }
  for (const m of d.months)
    if (m.period >= '2014-01') assert.equal(m.origin, 'municipality');
});
