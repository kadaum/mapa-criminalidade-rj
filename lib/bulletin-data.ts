import snapshot from '@/public/data/crime-rio-snapshot.json';
import population from '@/public/data/cisp-population.json';
import { availableBulletinPeriods, bulletinMetricFrom } from '@/lib/bulletin-core';

export { bulletinMetricFrom } from '@/lib/bulletin-core';

export const bulletinIndicators = ['total_roubos', 'total_furtos', 'letalidade_violenta', 'estelionato'] as const;

export function validBulletinPeriod(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && bulletinPeriods().includes(value);
}

export function bulletinPeriods() {
  return availableBulletinPeriods(snapshot.rows, population.records, bulletinIndicators);
}

export function bulletinMetric(indicator: string, end: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(end)) return null;
  return bulletinMetricFrom(snapshot.rows, population.records, indicator, end);
}
