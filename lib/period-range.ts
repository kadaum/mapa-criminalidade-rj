export type Comparison = 'previous' | 'year' | 'none';
export const validMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export function shiftMonth(period: string, amount: number) {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 7);
}
export function monthCount(start: string, end: string) {
  return (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + Number(end.slice(5)) - Number(start.slice(5)) + 1;
}
export function comparisonRange(start: string, end: string, mode: Comparison) {
  if (mode === 'none') return null;
  const offset = mode === 'year' ? -12 : -monthCount(start, end);
  return { start: shiftMonth(start, offset), end: shiftMonth(end, offset) };
}
