import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readRegionFilters,
  readServerRegionContext,
  regionFilterQuery,
} from '../components/region-filter-state.ts';

const validCisps = [16, 19];
const validIndicators = ['total_furtos', 'letalidade_violenta'];
const serverOptions = {
  defaultCisp: 0,
  defaultIndicator: 'total_furtos',
  validCisps,
  validIndicators,
  period: '2026-08',
  earliestPeriod: '2023-09',
  minimumEnd: () => '2023-09',
};

function record(query: string) {
  return Object.fromEntries(new URLSearchParams(query));
}

function assertClientAndServerAgree(query: string) {
  const client = readRegionFilters(new URLSearchParams(query), {
    validCisps,
    validIndicators,
  });
  const server = readServerRegionContext(record(query), serverOptions);
  assert.deepEqual(
    {
      cisp: server.cisp,
      indicator: server.indicator,
      months: String(server.months),
      comparison: server.comparison,
      field: server.view === 'taxa' ? 'rate' : 'count',
    },
    {
      cisp: client.cisp,
      indicator: client.indicator,
      months: client.months,
      comparison: client.comparison,
      field: client.field,
    },
  );
}

void test('a seleção de Tijuca substitui CISP 16 por 19 em uma única consulta canônica', () => {
  const current = readRegionFilters(
    new URLSearchParams(
      'cisp=16&indicador=total_furtos&meses=12&fim=latest&comparacao=previous&visualizacao=taxa',
    ),
  );
  const next = regionFilterQuery({ ...current, bairro: 'Tijuca', cisp: 19 });

  assert.equal(next.get('cisp'), '19');
  assert.equal(next.get('bairro'), 'Tijuca');
  assert.equal(next.get('indicador'), 'total_furtos');
  assert.equal(next.get('fim'), 'latest');
  assert.equal(next.getAll('cisp').length, 1);
});

void test('trocar a CISP pelo seletor remove o bairro sem perder período e visualização', () => {
  const current = readRegionFilters(
    new URLSearchParams(
      'cisp=19&bairro=Tijuca&indicador=letalidade_violenta&meses=6&fim=2026-07&comparacao=year&visualizacao=quantidade',
    ),
  );
  const next = regionFilterQuery({ ...current, cisp: 16, bairro: '' });

  assert.equal(next.get('cisp'), '16');
  assert.equal(next.has('bairro'), false);
  assert.equal(next.get('meses'), '6');
  assert.equal(next.get('fim'), '2026-07');
  assert.equal(next.get('comparacao'), 'year');
  assert.equal(next.get('visualizacao'), 'quantidade');
});

void test('deep links inválidos usam os mesmos padrões canônicos dos controles', () => {
  const filters = readRegionFilters(
    new URLSearchParams('meses=99&comparacao=wat&visualizacao=wat'),
  );
  const next = regionFilterQuery(filters);

  assert.equal(
    next.toString(),
    'indicador=total_furtos&meses=12&fim=latest&comparacao=previous&visualizacao=taxa',
  );
});

void test('cliente e SSR tratam CISP ausente ou zero como nenhuma seleção', () => {
  for (const query of ['', 'cisp=0']) {
    assertClientAndServerAgree(query);
    assert.equal(readServerRegionContext(record(query), serverOptions).cisp, 0);
  }
});

void test('cliente e SSR descartam CISP e indicador inválidos com os mesmos padrões', () => {
  const query = 'cisp=999&indicador=inexistente&visualizacao=quantidade';
  assertClientAndServerAgree(query);
  const context = readServerRegionContext(record(query), serverOptions);
  assert.equal(context.cisp, 0);
  assert.equal(context.indicator, 'total_furtos');
});

void test('SSR rejeita competências com mês fora do calendário', () => {
  for (const end of ['2025-00', '2025-99']) {
    const context = readServerRegionContext(record(`fim=${end}`), serverOptions);
    assert.equal(context.end, serverOptions.period);
  }
});

void test('reler a URL restaura filtros de voltar e avançar sem estado paralelo', () => {
  const before = readRegionFilters(new URLSearchParams('cisp=16'), {
    validCisps,
  });
  const after = readRegionFilters(
    new URLSearchParams('cisp=19&bairro=Tijuca&visualizacao=quantidade'),
    { validCisps },
  );
  assert.equal(before.cisp, 16);
  assert.equal(before.bairro, '');
  assert.equal(after.cisp, 19);
  assert.equal(after.bairro, 'Tijuca');
  assert.equal(after.field, 'count');
});
