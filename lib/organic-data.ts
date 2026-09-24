import snapshot from '@/public/data/crime-rio-snapshot.json';
import population from '@/public/data/cisp-population.json';
import territories from '@/public/data/cisp-neighborhoods.json';
import { cityMetric, monthShift, regionMetrics, windowPeriods } from '@/lib/crime-analysis';
import type { Comparison } from '@/lib/period-range';

export const ORIGIN = 'https://mapa-criminalidade-rj.ricardoguia.com';
export const data = snapshot;
export const census = population;
export const areas = territories.records;
export const indicatorList = snapshot.indicators;
export const period = snapshot.latestPeriod;
export const sourceUpdated = new Date(snapshot.source.lastModified).toISOString().slice(0, 10);
export const collected = snapshot.generatedAt;
export const ids = areas.map((area) => area.cisp);
export const fmt = (value: number | null | undefined, digits = 0) =>
  value == null ? 'Indisponível' : value.toLocaleString('pt-BR', { maximumFractionDigits: digits });
export const monthLabel = (value: string) =>
  new Date(`${value}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const shortMonth = (value: string) =>
  new Date(`${value}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
export const fullDate = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
export const areaById = (id: number) => areas.find((area) => area.cisp === id);
export const populationById = (id: number) => census.records.find((row) => row.cisp === id);
export const indicatorById = (id: string) => indicatorList.find((indicator) => indicator.id === id);
export const canonical = (path: string) => `${ORIGIN}${path}`;

export function selectedContext(params: Record<string, string | string[] | undefined>, defaults: { cisp?: number; indicator?: string } = {}) {
  const raw = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  const rawId = Number(raw('cisp'));
  const cisp = ids.includes(rawId) ? rawId : (defaults.cisp ?? 16);
  const rawIndicator = raw('indicador');
  const indicator = indicatorById(rawIndicator) ? rawIndicator : (defaults.indicator ?? 'total_roubos');
  const rawMonths = Number(raw('meses'));
  const months = Number.isInteger(rawMonths) && rawMonths > 0 && rawMonths <= 36 ? rawMonths : 12;
  const minimumEnd = monthShift(snapshot.rows[0].period, months - 1);
  const end = /^\d{4}-\d{2}$/.test(raw('fim')) && raw('fim') <= period && raw('fim') >= minimumEnd
    ? raw('fim') : period;
  const comparison: Comparison = raw('comparacao') === 'year' ? 'year' : raw('comparacao') === 'none' ? 'none' : 'previous';
  const view = raw('visualizacao') === 'taxa' ? 'taxa' : raw('visualizacao') === 'variacao' ? 'variacao' : 'quantidade';
  return { cisp, indicator, months, end, comparison, view };
}

export function metrics(indicator: string, end = period, months = 12, comparison: Comparison = 'year') {
  return regionMetrics(snapshot.rows, census.records, indicator, end, months, comparison);
}
export function city(indicator: string, end = period, months = 12, comparison: Comparison = 'year') {
  return cityMetric(metrics(indicator, end, months, comparison));
}
export function monthlySeries(indicator: string, cisp?: number) {
  const months = [...new Set(snapshot.rows.map((row) => row.period))].sort();
  return months.map((month) => {
    const rows = snapshot.rows.filter((row) => row.period === month && (cisp === undefined || row.cisp === cisp));
    return { month, value: rows.length === (cisp === undefined ? 41 : 1) && rows.every((row) => Number.isSafeInteger((row.values as Record<string, number>)[indicator]))
      ? rows.reduce((sum, row) => sum + (row.values as Record<string, number>)[indicator], 0) : null };
  });
}
export function windowLabel(end: string, months: number) {
  const first = monthShift(end, 1 - months);
  return `${shortMonth(first)} a ${shortMonth(end)}`;
}
export function previousWindow(end: string, months: number, comparison: Comparison) {
  if (comparison === 'none') return null;
  return windowPeriods(monthShift(end, comparison === 'year' ? -12 : -months), months);
}
export function queryFor(cisp: number, indicator = 'total_roubos') {
  return `?${new URLSearchParams({ cisp: String(cisp), indicador: indicator, meses: '12', fim: 'latest', comparacao: 'year', visualizacao: 'quantidade' })}`;
}
