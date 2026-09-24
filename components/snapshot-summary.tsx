/* oxlint-disable next/no-html-link-for-pages */
import { city, fmt, indicatorById, metrics, monthLabel, period, selectedContext, windowLabel } from '@/lib/organic-data';

export function SnapshotSummary({ params = {}, compact = false, home = false, defaultIndicator = 'total_roubos', defaultCisp = 16 }: { params?: Record<string, string | string[] | undefined>; compact?: boolean; home?: boolean; defaultIndicator?: string; defaultCisp?: number }) {
  const context = selectedContext(params, { cisp: defaultCisp, indicator: defaultIndicator });
  const indicator = indicatorById(context.indicator)!;
  const selected = context.cisp ? metrics(indicator.id, context.end, context.months, context.comparison).find((row) => row.cisp === context.cisp) : city(indicator.id, context.end, context.months, context.comparison);
  return <section aria-label="Resumo dos dados oficiais" className={`border-b border-[#dce2ed] bg-white ${compact ? 'px-4 py-3' : 'px-4 py-5'}`}>
    <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div>{home && <h1 className="mb-1 text-lg font-semibold text-[#172235]">Registros policiais por CISP no Rio de Janeiro</h1>}<p className="text-sm font-semibold text-[#172235]">{context.cisp ? `CISP ${context.cisp}` : 'Rio de Janeiro'} · {indicator.label}: <strong className="tabular-nums">{fmt(selected?.count)} {indicator.unit}</strong></p><p className="mt-1 text-sm text-[#526078]">{windowLabel(context.end, context.months)} · taxa {fmt(selected?.rate, 1)} por 100 mil residentes · fonte até {monthLabel(period)}</p></div>
      <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#2455dc]">{context.cisp > 0 && <a className="underline" href={`/regioes/cisp-${context.cisp}`}>Ficha da CISP</a>}<a className="underline" href={`/indicadores/${indicator.id}`}>Definição e série</a><a className="underline" href="/regioes">41 regiões</a><a className="underline" href="/dados">Dados</a></div>
    </div>
  </section>;
}
