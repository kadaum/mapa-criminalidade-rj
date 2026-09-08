import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCispHistory } from '../lib/cisp-history.ts';

test('filters one CISP and preserves its complete historical range', () => {
  const csv = [
    'period;cisp;phase;roubos;furtos',
    '2003-01;4;3;10;20',
    '2003-01;5;3;99;88',
    '2026-07;4;2;30;',
  ].join('\n');
  assert.deepEqual(parseCispHistory(csv, 4, ['roubos', 'furtos']), [
    {
      period: '2003-01',
      origin: 'cisp',
      cispCount: 1,
      phase: 3,
      values: { roubos: 10, furtos: 20 },
    },
    {
      period: '2026-07',
      origin: 'cisp',
      cispCount: 1,
      phase: 2,
      values: { roubos: 30, furtos: null },
    },
  ]);
});
