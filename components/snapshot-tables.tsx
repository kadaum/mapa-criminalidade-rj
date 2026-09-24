/* oxlint-disable next/no-html-link-for-pages */
import { SeriesTable } from '@/components/organic-ui';
import { areas, fmt, indicatorById, metrics, monthlySeries, selectedContext, windowLabel } from '@/lib/organic-data';
import { rankMetrics } from '@/lib/crime-analysis';

export function HomeTable() {
  const rows = metrics('total_roubos');
  return <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><h2 className="text-2xl font-semibold">Registros por região policial</h2><p className="mt-2 text-sm text-[#526078]">Total de roubos nos últimos 12 meses. Os números pertencem à CISP inteira, não exclusivamente aos bairros citados.</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{areas.map((area) => <a key={area.cisp} className="rounded-xl border border-[#dce2ed] bg-white p-4 transition hover:border-[#2455dc]" href={`/regioes/cisp-${area.cisp}`}><span className="block font-semibold text-[#2455dc]">CISP {area.cisp}</span><span className="mt-1 block text-sm text-[#526078]">{area.territorialUnit}</span><span className="mt-2 block text-sm"><strong>{fmt(rows.find((row) => row.cisp === area.cisp)?.count)} casos</strong></span></a>)}</div></section>;
}

export function RegionSeries({ params }: { params: Record<string, string | string[] | undefined> }) {
  const context = selectedContext(params, { cisp: 0, indicator: 'total_furtos' });
  if (!context.cisp) return null;
  const item = indicatorById(context.indicator)!;
  return <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><h2 className="mb-4 text-2xl font-semibold">Série oficial da CISP {context.cisp}</h2><SeriesTable rows={monthlySeries(item.id, context.cisp)} unit={item.unit} /></section>;
}

export function RankingTable({ params }: { params: Record<string, string | string[] | undefined> }) {
  const context = selectedContext(params, { cisp: 0, indicator: 'total_furtos' });
  const item = indicatorById(context.indicator)!;
  const field = context.view === 'quantidade' && params.visualizacao === 'quantidade' ? 'count' : 'rate';
  const ordered = rankMetrics(metrics(item.id, context.end, context.months, context.comparison), field);
  return <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><h2 className="text-2xl font-semibold">Tabela das 41 CISPs · {item.label}</h2><p className="mt-2 text-sm text-[#526078]">{windowLabel(context.end, context.months)} · ordenada por {field === 'rate' ? 'taxa por 100 mil residentes' : `quantidade de ${item.unit}`}. Posição descritiva, sem avaliação de segurança.</p><div className="mt-4 overflow-x-auto rounded-2xl border border-[#dce2ed] bg-white"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-[#eaf0fc]"><tr><th className="px-4 py-3">Posição</th><th className="px-4 py-3">CISP</th><th className="px-4 py-3 text-right">{item.unit}</th><th className="px-4 py-3 text-right">Taxa</th></tr></thead><tbody>{ordered.map((row) => <tr key={row.cisp} className="border-t border-[#e7ebf2]"><td className="px-4 py-3">{row.rank}º</td><th className="px-4 py-3 font-medium" scope="row"><a className="text-[#2455dc] underline" href={`/regioes/cisp-${row.cisp}`}>CISP {row.cisp}</a><span className="block text-[#526078]">{areas.find((area) => area.cisp === row.cisp)?.territorialUnit}</span></th><td className="px-4 py-3 text-right tabular-nums">{fmt(row.count)}</td><td className="px-4 py-3 text-right tabular-nums">{fmt(row.rate, 1)}</td></tr>)}</tbody></table></div></section>;
}
