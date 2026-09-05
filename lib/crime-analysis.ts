export type CrimeRow = {
  cisp: number;
  period: string;
  values: Record<string, number>;
};
export type Metric = {
  cisp: number;
  count: number | null;
  previous: number | null;
  population: number | null;
  rate: number | null;
  change: number | null;
};
export function monthShift(period: string, offset: number) {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}
export function windowPeriods(end: string, months: number) {
  return Array.from({ length: months }, (_, i) =>
    monthShift(end, i - months + 1),
  );
}
export function periodTotal(
  rows: CrimeRow[],
  periods: string[],
  indicator: string,
): number | null {
  let total = 0;
  for (const period of periods) {
    const matches = rows.filter((row) => row.period === period);
    if (matches.length !== 1) return null;
    const value = matches[0].values[indicator];
    if (!Number.isSafeInteger(value) || value < 0) return null;
    total += value;
  }
  return total;
}
export function regionMetrics(
  rows: CrimeRow[],
  populations: { cisp: number; population: number }[],
  indicator: string,
  end: string,
  months: number,
): Metric[] {
  const current = windowPeriods(end, months),
    previous = windowPeriods(monthShift(end, -months), months);
  return populations.map((p) => {
    const local = rows.filter((row) => row.cisp === p.cisp);
    const count = periodTotal(local, current, indicator),
      before = periodTotal(local, previous, indicator);
    const population = p.population > 0 ? p.population : null;
    return {
      cisp: p.cisp,
      count,
      previous: before,
      population,
      rate: count !== null && population ? (count / population) * 100000 : null,
      change:
        count !== null && before !== null && before >= 20
          ? ((count - before) / before) * 100
          : null,
    };
  });
}
export function rankMetrics(
  metrics: Metric[],
  field: 'rate' | 'count' | 'change',
) {
  const sorted = metrics
    .filter((m) => m[field] !== null)
    .sort((a, b) => b[field]! - a[field]! || a.cisp - b.cisp);
  return sorted.map((m) => ({
    ...m,
    rank: 1 + sorted.filter((other) => other[field]! > m[field]!).length,
    tied: sorted.filter((other) => other[field] === m[field]).length > 1,
  }));
}
export function cityMetric(metrics: Metric[]): Metric {
  const complete =
    metrics.length > 0 &&
    metrics.every((m) => m.count !== null && m.population !== null);
  const count = complete ? metrics.reduce((n, m) => n + m.count!, 0) : null;
  const population = complete
    ? metrics.reduce((n, m) => n + m.population!, 0)
    : null;
  const previous =
    metrics.length && metrics.every((m) => m.previous !== null)
      ? metrics.reduce((n, m) => n + m.previous!, 0)
      : null;
  return {
    cisp: 0,
    count,
    population,
    previous,
    rate: count !== null && population ? (count / population) * 100000 : null,
    change:
      count !== null && previous !== null && previous >= 20
        ? ((count - previous) / previous) * 100
        : null,
  };
}
export const normalizeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
export function neighborhoodIndex(
  records: { cisp: number; neighborhoods: string[] }[],
) {
  const names = new Map<string, { name: string; cisps: number[] }>();
  for (const record of records)
    for (const raw of record.neighborhoods) {
      const name = raw.replace(/\s*\(parte\)$/i, ''),
        key = normalizeName(name);
      const entry = names.get(key) ?? { name, cisps: [] };
      if (!entry.cisps.includes(record.cisp)) entry.cisps.push(record.cisp);
      names.set(key, entry);
    }
  return [...names.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR'),
  );
}
export function factualInsights(metrics: Metric[]) {
  const eligible = metrics.filter(
    (m) => m.count !== null && m.previous !== null && m.previous >= 20,
  );
  const changes = rankMetrics(eligible, 'change');
  const result: {
    cisp: number;
    kind: string;
    count: number;
    previous: number;
    change: number | null;
  }[] = [];
  const rise = changes.find(
    (m) => m.change! >= 10 && m.count! - m.previous! >= 20,
  );
  const fall = [...changes]
    .reverse()
    .find((m) => m.change! <= -10 && m.previous! - m.count! >= 20);
  for (const item of changes.filter(
    (m) => rise && m.change === rise.change && m.count! - m.previous! >= 20,
  ))
    result.push({
      cisp: item.cisp,
      kind: 'Maior alta elegível',
      count: item.count!,
      previous: item.previous!,
      change: item.change,
    });
  for (const item of changes.filter(
    (m) => fall && m.change === fall.change && m.previous! - m.count! >= 20,
  ))
    result.push({
      cisp: item.cisp,
      kind: 'Maior queda elegível',
      count: item.count!,
      previous: item.previous!,
      change: item.change,
    });
  return result;
}
export function historicalInsights(
  rows: CrimeRow[],
  populations: { cisp: number; population: number }[],
  indicator: string,
  end: string,
  months: number,
) {
  const current = regionMetrics(rows, populations, indicator, end, months);
  const before = regionMetrics(
    rows,
    populations,
    indicator,
    monthShift(end, -months),
    months,
  );
  const ranked = rankMetrics(current, 'rate'),
    previousRank = rankMetrics(before, 'rate');
  const result: { cisp: number; title: string; detail: string }[] = [];
  if (
    ranked.length === populations.length &&
    previousRank.length === populations.length
  ) {
    const moves = ranked
      .map((m) => ({
        m,
        old: previousRank.find((p) => p.cisp === m.cisp)!.rank,
      }))
      .filter((x) => x.old - x.m.rank >= 5)
      .sort(
        (a, b) => b.old - b.m.rank - (a.old - a.m.rank) || a.m.cisp - b.m.cisp,
      );
    for (const { m, old } of moves.slice(0, 1))
      result.push({
        cisp: m.cisp,
        title: 'Mudança de posição',
        detail: `Da ${old}ª para a ${m.rank}ª maior taxa. Compara duas janelas de ${months} meses; posição não mede risco individual.`,
      });
  }
  const ps = windowPeriods(end, 12);
  const maxima = populations
    .map((p) => {
      const local = rows.filter((r) => r.cisp === p.cisp);
      const values = ps.map((period) =>
        periodTotal(local, [period], indicator),
      );
      return { cisp: p.cisp, values };
    })
    .filter(
      (x) =>
        x.values.every((v) => v !== null) &&
        x.values[11]! >= 20 &&
        x.values[11]! > Math.max(...(x.values.slice(0, 11) as number[])),
    )
    .sort((a, b) => b.values[11]! - a.values[11]!);
  for (const x of maxima.slice(0, 1))
    result.push({
      cisp: x.cisp,
      title: 'Maior valor dos últimos 12 meses',
      detail: `${x.values[11]} no mês ${end}, acima de todos os 11 meses anteriores. Refere-se ao mês final, não à soma do período.`,
    });
  const trends = populations
    .map((p) => {
      const local = rows.filter((r) => r.cisp === p.cisp);
      return {
        cisp: p.cisp,
        v: windowPeriods(end, 4).map((period) =>
          periodTotal(local, [period], indicator),
        ),
      };
    })
    .filter(
      (x) =>
        x.v.every((v) => v !== null && v >= 20) &&
        x.v[0]! < x.v[1]! &&
        x.v[1]! < x.v[2]! &&
        x.v[2]! < x.v[3]!,
    );
  for (const x of trends.slice(0, 1))
    result.push({
      cisp: x.cisp,
      title: 'Três altas mensais consecutivas',
      detail: `Sequência dos quatro últimos meses: ${x.v.join(' → ')}. Contagens mensais; pode haver influência sazonal.`,
    });
  return result;
}
