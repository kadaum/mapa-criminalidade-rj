import assert from 'node:assert/strict';
import test from 'node:test';
import {
  crimeAtlasQuery,
  cameraDestinationPath,
  cameraHubPath,
  cameraSelectionFromQuery,
  publicCameraNavigationQuery,
  publishedCispIds,
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

void test('câmera preserva somente contexto público e canonicaliza bairro permitido', () => {
  const query = publicCameraNavigationQuery(
    '?bairro=barra%20da%20tij%C3%BAca&cisp=19&fim=2026-07&token=secret&protocolo=abc',
  );
  assert.equal(query.toString(), 'bairro=Barra+da+Tijuca&cisp=19&fim=2026-07');
});

void test('câmera descarta bairro desconhecido sem propagar credenciais', () => {
  const query = publicCameraNavigationQuery(
    '?bairro=Lapa&token=secret&cameraID=private-id',
  );
  assert.equal(query.toString(), '');
});

void test('câmera rejeita contexto fora dos domínios públicos', () => {
  const query = publicCameraNavigationQuery(
    '?cisp=2&outra=99&indicador=private&meses=37&fim=2026-13&comparacao=bad&visualizacao=html',
  );
  assert.equal(query.toString(), '');
});

void test('câmera usa exatamente os IDs publicados no snapshot', () => {
  for (const cisp of [42, 43, 44])
    assert.equal(publicCameraNavigationQuery(`?cisp=${cisp}`).get('cisp'), String(cisp));
  for (const cisp of [2, 3, 8])
    assert.equal(publicCameraNavigationQuery(`?cisp=${cisp}`).has('cisp'), false);
  assert.equal(publishedCispIds.size, 41);
});

void test('destino de câmera preserva contexto ao abrir e fechar', () => {
  const context = '?bairro=Centro&cisp=1&fim=2026-07&protocolo=secret';
  assert.equal(cameraDestinationPath('cam/1', context), '/cameras/cam%2F1?bairro=Centro&cisp=1&fim=2026-07');
  assert.equal(cameraDestinationPath(null, context), '/cameras?bairro=Centro&cisp=1&fim=2026-07');
});

void test('retorno ao hub leva seleção e somente contexto público validado', () => {
  assert.equal(
    cameraHubPath('camerasrj-1725', '?bairro=barra%20da%20tij%C3%BAca&cisp=19&meses=6&fim=2026-07&token=secret'),
    '/cameras?bairro=Barra+da+Tijuca&cisp=19&meses=6&fim=2026-07&camera=camerasrj-1725',
  );
});

void test('seleção do hub aceita apenas ID publicado e valor escalar', () => {
  const ids = new Set(['camerasrj-1725', 'camerasrj-1698']);
  assert.equal(cameraSelectionFromQuery('camerasrj-1725', ids), 'camerasrj-1725');
  assert.equal(cameraSelectionFromQuery('private-camera', ids), undefined);
  assert.equal(cameraSelectionFromQuery(['camerasrj-1725'], ids), undefined);
});
