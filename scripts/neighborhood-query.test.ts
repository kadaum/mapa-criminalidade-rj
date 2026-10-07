import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraNeighborhoodFromUrl } from '../lib/neighborhood-query.ts';

await test('accepts the five official names, including diacritics-insensitive input', () => {
  assert.equal(cameraNeighborhoodFromUrl('centro'), 'Centro');
  assert.equal(cameraNeighborhoodFromUrl('BARRA DA TIJÚCA'), 'Barra da Tijuca');
});

await test('rejects unknown, empty, and oversized URL values', () => {
  assert.equal(cameraNeighborhoodFromUrl(''), '');
  assert.equal(cameraNeighborhoodFromUrl('Lapa'), '');
  assert.equal(cameraNeighborhoodFromUrl('Centro'.repeat(14)), '');
});
