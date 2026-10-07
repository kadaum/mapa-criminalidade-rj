import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContext, parseNeighborhoodCsv, validateRecords } from './sync-neighborhood-context.mjs';

const header = '"CD_BAIRRO";"NM_BAIRRO";"V05000";"V05012";"V05013";"V05014";"V05021";"V05022";"V05023"';
const row = (code, name, total, light, sidewalk) => `"${code}";"${name}";"${total}";"${light}";"${total - light}";"0";"${sidewalk}";"${total - sidewalk}";"0"`;

test('builds exactly the five Rio neighborhood records and preserves denominators', () => {
  const rows = parseNeighborhoodCsv([
    header,
    row('3304557001', 'Centro', 10, 9, 8),
    row('3304557018', 'Copacabana', 20, 18, 17),
    row('3304557030', 'Tijuca', 30, 27, 26),
    row('3304557102', 'Campo Grande', 40, 35, 34),
    row('3304557131', 'Barra da Tijuca', 50, 49, 48),
    row('1100015001', 'Centro', 999, 999, 999),
  ].join('\n'));
  const context = buildContext(rows, { retrievedAt: '2026-10-06T20:00:00-04:00', zipSha256: 'a'.repeat(64), dictionaryEntries: [] });
  assert.equal(context.records.length, 5);
  assert.equal(context.records.find((record) => record.name === 'Copacabana').lighting.yesPct, 90);
  assert.equal(context.records.find((record) => record.name === 'Campo Grande').sidewalk.total, 40);
});

test('rejects duplicate IBGE codes and denominator or unknown inconsistencies', () => {
  const records = Array.from({ length: 5 }, (_, index) => ({
    ibgeCode: String(index), name: ['Centro', 'Copacabana', 'Tijuca', 'Campo Grande', 'Barra da Tijuca'][index], municipalityCode: '3304557', householdsSurveyed: 1,
    lighting: { yes: 1, no: 0, unknown: 0, total: 1, yesPct: 100 }, sidewalk: { yes: 1, no: 0, unknown: 0, total: 1, yesPct: 100 },
  }));
  records[1].ibgeCode = records[0].ibgeCode;
  assert.throws(() => validateRecords(records), /duplicate/);
  records[1].ibgeCode = 'unique';
  records[1].lighting.unknown = 1;
  assert.throws(() => validateRecords(records), /sum mismatch/);
});
