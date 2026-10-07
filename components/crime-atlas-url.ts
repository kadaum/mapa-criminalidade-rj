import type { Comparison } from '@/lib/period-range';
import { cameraNeighborhoodFromUrl } from '../lib/neighborhood-query.ts';

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
const publicIndicators = new Set([
  'registro_ocorrencias', 'total_roubos', 'total_furtos', 'estelionato',
  'roubo_rua', 'roubo_celular', 'roubo_em_coletivo', 'roubo_veiculo',
  'furto_veiculos', 'furto_celular', 'letalidade_violenta', 'hom_doloso',
  'tentat_hom', 'hom_por_interv_policial', 'estupro', 'ameaca',
  'pessoas_desaparecidas',
]);
/** Published CISP IDs represented by the current 41-CISP snapshot. */
export const publishedCispIds = new Set([
  1, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  39, 40, 41, 42, 43, 44,
]);

function validCisp(value: string) {
  return /^\d+$/.test(value) && publishedCispIds.has(Number(value));
}

function validPeriod(value: string) {
  return value === 'latest' || /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value);
}

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

/** Keep only the public camera context, canonicalizing the bounded bairro filter. */
export function publicCameraNavigationQuery(input: string | URLSearchParams) {
  const source = publicNavigationQuery(input);
  const result = new URLSearchParams();
  for (const [key, value] of source) {
    if (key === 'bairro') {
      const bairro = cameraNeighborhoodFromUrl(value);
      if (bairro) result.set(key, bairro);
    } else if (key === 'cisp' && validCisp(value)) result.set(key, value);
    else if (key === 'outra' && (value === 'rio' || validCisp(value))) result.set(key, value);
    else if (key === 'indicador' && publicIndicators.has(value)) result.set(key, value);
    else if (key === 'meses' && /^(?:[1-9]|[12]\d|3[0-6])$/.test(value)) result.set(key, value);
    else if (key === 'fim' && validPeriod(value)) result.set(key, value);
    else if (key === 'comparacao' && ['previous', 'year', 'none'].includes(value)) result.set(key, value);
    else if (key === 'visualizacao' && ['taxa', 'quantidade', 'variacao'].includes(value)) result.set(key, value);
  }
  return result;
}

export function cameraDestinationPath(cameraId: string | null, input: string | URLSearchParams) {
  const query = publicCameraNavigationQuery(input);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return `${cameraId ? `/cameras/${encodeURIComponent(cameraId)}` : '/cameras'}${suffix}`;
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
