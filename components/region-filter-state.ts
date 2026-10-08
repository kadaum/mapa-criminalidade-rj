type Comparison = 'previous' | 'year' | 'none';

export type RegionFilters = {
  cisp: number;
  bairro: string;
  other: string;
  indicator: string;
  months: string;
  end: string;
  comparison: Comparison;
  field: 'rate' | 'count';
};

type SearchParams = Pick<URLSearchParams, 'get'>;

type RegionFilterOptions = {
  defaultCisp?: number;
  defaultIndicator?: string;
  validCisps?: readonly number[];
  validIndicators?: readonly string[];
};

export function readRegionFilters(
  params: SearchParams,
  options: RegionFilterOptions = {},
): RegionFilters {
  const rawMonths = Number(params.get('meses'));
  const comparison = params.get('comparacao');
  const rawCisp = Number(params.get('cisp'));
  const cisp =
    Number.isInteger(rawCisp) &&
    rawCisp > 0 &&
    (!options.validCisps || options.validCisps.includes(rawCisp))
      ? rawCisp
      : (options.defaultCisp ?? 0);
  const rawIndicator = params.get('indicador') || '';
  const indicator =
    rawIndicator &&
    (!options.validIndicators || options.validIndicators.includes(rawIndicator))
      ? rawIndicator
      : (options.defaultIndicator ?? 'total_furtos');
  return {
    cisp,
    bairro: params.get('bairro') || '',
    other: params.get('outra') || 'rio',
    indicator,
    months:
      Number.isInteger(rawMonths) && rawMonths > 0 && rawMonths <= 36
        ? String(rawMonths)
        : '12',
    end: params.get('fim') || 'latest',
    comparison:
      comparison === 'year' || comparison === 'none' ? comparison : 'previous',
    field: params.get('visualizacao') === 'quantidade' ? 'count' : 'rate',
  };
}

export function recordToSearchParams(
  params: Record<string, string | string[] | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (typeof value === 'string') search.set(key, value);
  return search;
}

export function readServerRegionContext(
  params: Record<string, string | string[] | undefined>,
  options: RegionFilterOptions & {
    period: string;
    earliestPeriod: string;
    minimumEnd: (earliestPeriod: string, months: number) => string;
  },
) {
  const filters = readRegionFilters(recordToSearchParams(params), options);
  const months = Number(filters.months);
  const minimumEnd = options.minimumEnd(options.earliestPeriod, months);
  const end =
    /^\d{4}-(?:0[1-9]|1[0-2])$/.test(filters.end) &&
    filters.end <= options.period &&
    filters.end >= minimumEnd
      ? filters.end
      : options.period;
  return {
    cisp: filters.cisp,
    indicator: filters.indicator,
    months,
    end,
    comparison: filters.comparison,
    view:
      filters.field === 'rate' ? ('taxa' as const) : ('quantidade' as const),
  };
}

export function regionFilterQuery(filters: RegionFilters) {
  return new URLSearchParams({
    indicador: filters.indicator,
    meses: filters.months,
    fim: filters.end,
    comparacao: filters.comparison,
    visualizacao: filters.field === 'rate' ? 'taxa' : 'quantidade',
    ...(filters.cisp ? { cisp: String(filters.cisp) } : {}),
    ...(filters.bairro ? { bairro: filters.bairro } : {}),
    ...(filters.other !== 'rio' ? { outra: filters.other } : {}),
  });
}
