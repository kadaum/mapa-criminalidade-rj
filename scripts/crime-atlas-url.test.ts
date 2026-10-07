import assert from 'node:assert/strict';
import test from 'node:test';
import {
  crimeAtlasQuery,
  publicNavigationQuery,
  readCrimeAtlasUrl,
} from '../components/crime-atlas-url.ts';

void test('navegação preserva contexto público e descarta protocolo e parâmetros arbitrários', () => {
  const query = publicNavigationQuery(
    '?cisp=19&bairro=Copacabana&outra=18&indicador=total_furtos&meses=6&fim=2026-07&comparacao=year&visualizacao=variacao&cameraID=cam-1&protocolo=abc&token=secret&foo=bar',
  );
  assert.equal(
    query.toString(),
    'cisp=19&bairro=Copacabana&outra=18&indicador=total_furtos&meses=6&fim=2026-07&comparacao=year&visualizacao=variacao',
  );
  assert.equal(query.has('protocolo'), false);
  assert.equal(query.has('token'), false);
});

void test('home sem parâmetro representa a cidade sem CISP implícita', () => {
  const state = readCrimeAtlasUrl(new URLSearchParams());
  assert.equal(state.cisp, 0);
  assert.equal(crimeAtlasQuery(state).has('cisp'), false);
});

void test('deep link e releitura de histórico restauram todo o estado', () => {
  const query =
    'cisp=19&indicador=total_furtos&meses=6&fim=2026-07&comparacao=year&visualizacao=variacao';
  const state = readCrimeAtlasUrl(new URLSearchParams(query));
  assert.deepEqual(state, {
    cisp: 19,
    indicator: 'total_furtos',
    months: 6,
    end: '2026-07',
    comparison: 'year',
    view: 'variation',
  });
  assert.equal(crimeAtlasQuery(state).toString(), query);
});

void test('compartilhar fixa a competência enquanto navegação pode acompanhar latest', () => {
  const state = readCrimeAtlasUrl(new URLSearchParams('cisp=19&fim=latest'));
  assert.equal(crimeAtlasQuery(state).get('fim'), 'latest');
  assert.equal(crimeAtlasQuery(state, '2026-08').get('fim'), '2026-08');
});

void test('CISP e janela inválidas não criam seleção fantasma', () => {
  const state = readCrimeAtlasUrl(new URLSearchParams('cisp=-1&meses=99'));
  assert.equal(state.cisp, 0);
  assert.equal(state.months, 12);
});
