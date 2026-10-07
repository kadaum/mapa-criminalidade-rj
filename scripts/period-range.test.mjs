import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonRange, monthCount, validMonth } from '../lib/period-range.ts';
import { regionMetrics } from '../lib/crime-analysis.ts';
test('custom multi-year and year-to-date comparisons use complete calendar months',()=>{
  assert.equal(monthCount('2024-08','2026-01'),18);
  assert.deepEqual(comparisonRange('2026-01','2026-07','year'),{start:'2025-01',end:'2025-07'});
  assert.deepEqual(comparisonRange('2025-08','2026-07','previous'),{start:'2024-08',end:'2025-07'});
  assert.equal(comparisonRange('2026-01','2026-07','none'),null);
  assert.equal(validMonth('2024-99'),false);
});
test('regional comparison respects chosen year and suppresses incomplete baseline',()=>{
  const rows=[{cisp:1,period:'2026-07',values:{x:100}},{cisp:1,period:'2026-06',values:{x:25}},{cisp:1,period:'2025-07',values:{x:50}}];
  const calculate=mode=>regionMetrics(rows,[{cisp:1,population:1000}],'x','2026-07',1,mode)[0];
  assert.equal(calculate('year').change,100);
  assert.equal(calculate('previous').change,300);
  assert.equal(calculate('none').change,null);
  assert.equal(regionMetrics(rows.slice(0,2),[{cisp:1,population:1000}],'x','2026-07',1,'year')[0].previous,null);
});
