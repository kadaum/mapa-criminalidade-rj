import { cityMetric, monthShift, regionMetrics, windowPeriods, type CrimeRow } from './crime-analysis.ts';

export function bulletinMetricFrom(
  rows: CrimeRow[],
  populations: { cisp: number; population: number }[],
  indicator: string,
  end: string,
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(end)) return null;
  const current = windowPeriods(end, 12);
  const previous = windowPeriods(monthShift(end, -12), 12);
  const expected = new Set(populations.map((row) => row.cisp));
  if (populations.length !== 41 || expected.size !== 41) return null;
  const complete = (period: string) => {
    const monthly = rows.filter((row) => row.period === period);
    return monthly.length === expected.size && new Set(monthly.map((row) => row.cisp)).size === expected.size && monthly.every((row) => expected.has(row.cisp));
  };
  if (![...current, ...previous].every(complete)) return null;
  const result = cityMetric(regionMetrics(rows, populations, indicator, end, 12, 'year'));
  if (
    !result ||
    typeof result.count !== 'number' ||
    typeof result.previous !== 'number' ||
    typeof result.population !== 'number' ||
    !Number.isSafeInteger(result.count) ||
    !Number.isSafeInteger(result.previous) ||
    !Number.isSafeInteger(result.population) ||
    result.count < 0 ||
    result.previous < 0 ||
    result.population <= 0
  )
    return null;
  return result;
}

export function availableBulletinPeriods(
  rows: CrimeRow[],
  populations: { cisp: number; population: number }[],
  indicators: readonly string[],
) {
  return [...new Set(rows.map((row) => row.period))]
    .filter((period) => indicators.every((indicator) => bulletinMetricFrom(rows, populations, indicator, period) !== null))
    .sort().reverse();
}
