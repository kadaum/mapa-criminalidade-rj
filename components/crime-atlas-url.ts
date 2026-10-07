import type { Comparison } from '@/lib/period-range';

const publicNavigationParams = new Set([
  'cisp',
  'bairro',
  'outra',
  'indicador',
  'meses',
  'fim',
  'comparacao',
  'visualizacao',
]);

/** Keep navigation context while dropping private or untrusted query values. */
export function publicNavigationQuery(input: string | URLSearchParams) {
  const source =
    typeof input === 'string'
      ? new URLSearchParams(input.replace(/^\?/, ''))
      : input;
  const result = new URLSearchParams();
  for (const [key, value] of source) {
    if (publicNavigationParams.has(key)) result.append(key, value);
  }
  return result;
}

export type CrimeAtlasUrlState = {
  cisp: number;
  indicator: string;
  months: number;
  end: string;
  comparison: Comparison;
  view: 'rate' | 'quantity' | 'variation';
};

export function readCrimeAtlasUrl(
  params: Pick<URLSearchParams, 'get'>,
): CrimeAtlasUrlState {
  const cisp = Number(params.get('cisp'));
  const months = Number(params.get('meses'));
  const comparison = params.get('comparacao');
  const view = params.get('visualizacao');
  return {
    cisp: Number.isInteger(cisp) && cisp > 0 ? cisp : 0,
    indicator: params.get('indicador') || 'total_roubos',
    months:
      Number.isInteger(months) && months > 0 && months <= 36 ? months : 12,
    end: params.get('fim') || '',
    comparison:
      comparison === 'year' || comparison === 'none' ? comparison : 'previous',
    view:
      view === 'quantidade'
        ? 'quantity'
        : view === 'variacao'
          ? 'variation'
          : 'rate',
  };
}

export function crimeAtlasQuery(state: CrimeAtlasUrlState, pinEnd?: string) {
  return new URLSearchParams({
    ...(state.cisp ? { cisp: String(state.cisp) } : {}),
    indicador: state.indicator,
    meses: String(state.months),
    fim: pinEnd || state.end || 'latest',
    comparacao: state.comparison,
    visualizacao:
      state.view === 'quantity'
        ? 'quantidade'
        : state.view === 'variation'
          ? 'variacao'
          : 'taxa',
  });
}
