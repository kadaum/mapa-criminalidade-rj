export type CispHistoryMonth = {
  period: string;
  origin: 'cisp';
  cispCount: 1;
  phase: number;
  values: Record<string, number | null>;
};

export function parseCispHistory(
  csv: string,
  cisp: number,
  indicators: string[],
): CispHistoryMonth[] {
  const [headerLine = '', ...lines] = csv.trim().split(/\r?\n/);
  const header = headerLine.split(';');
  const periodIndex = header.indexOf('period');
  const cispIndex = header.indexOf('cisp');
  const phaseIndex = header.indexOf('phase');
  const indicatorIndexes = indicators.map(
    (id) => [id, header.indexOf(id)] as const,
  );

  if (
    periodIndex < 0 ||
    cispIndex < 0 ||
    phaseIndex < 0 ||
    indicatorIndexes.some(([, index]) => index < 0)
  )
    throw new Error('Cabeçalho do histórico por CISP inválido');

  return lines
    .map((line) => line.split(';'))
    .filter((cells) => Number(cells[cispIndex]) === cisp)
    .map((cells) => ({
      period: cells[periodIndex],
      origin: 'cisp' as const,
      cispCount: 1 as const,
      phase: Number(cells[phaseIndex]),
      values: Object.fromEntries(
        indicatorIndexes.map(([id, index]) => {
          const raw = cells[index];
          const value = raw === '' ? null : Number(raw);
          return [id, value !== null && Number.isFinite(value) ? value : null];
        }),
      ),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}
