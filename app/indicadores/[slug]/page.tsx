/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BreadcrumbLd, JsonLd, PageShell, SeriesTable, SourceNote } from '@/components/organic-ui';
import { ORIGIN, areas, canonical, city, fmt, indicatorById, indicatorList, metrics, monthLabel, monthlySeries, period, windowLabel } from '@/lib/organic-data';

type Params = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return indicatorList.map((item) => ({ slug: item.id })); }
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const item = indicatorById((await params).slug);
  if (!item) return { title: 'Indicador inexistente' };
  return { title: `${item.label} no Rio de Janeiro | Mapa da Criminalidade RJ`, description: `${item.definition} Veja série mensal, taxa, cobertura e dados por CISP até ${monthLabel(period)}.`, alternates: { canonical: canonical(`/indicadores/${item.id}`) } };
}
export default async function Indicator({ params }: Params) {
  const item = indicatorById((await params).slug);
  if (!item) notFound();
  const path = `/indicadores/${item.id}`;
  const current = city(item.id), rows = metrics(item.id);
  return <PageShell crumbs={[{ label: 'Indicadores', path: '/indicadores' }, { label: item.label }]}>
    <BreadcrumbLd items={[{ name: 'Indicadores', path: '/indicadores' }, { name: item.label, path }]} />
    <JsonLd value={{ '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${ORIGIN}${path}#webpage`, url: `${ORIGIN}${path}`, name: `${item.label} no Rio de Janeiro`, description: item.definition, isPartOf: { '@id': `${ORIGIN}/#website` } }} />
    <p className="text-sm font-semibold uppercase tracking-wide text-[#2455dc]">Indicador do ISP-RJ</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{item.label} no Rio de Janeiro</h1><p className="mt-3 max-w-3xl text-base leading-7 text-[#526078]">{item.definition}</p>{'note' in item && item.note && <p className="mt-3 max-w-3xl text-sm leading-6 text-[#526078]">{item.note}</p>}
    <div className="mt-7 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#172235] p-5 text-white"><h2 className="font-semibold">Cidade · quantidade</h2><strong className="mt-3 block text-4xl tabular-nums">{fmt(current.count)}</strong><p className="mt-2 text-sm text-white/80">{item.unit} · {windowLabel(period, 12)}</p></div><div className="rounded-2xl border border-[#dce2ed] bg-white p-5"><h2 className="font-semibold">Taxa municipal</h2><strong className="mt-3 block text-4xl tabular-nums">{fmt(current.rate, 1)}</strong><p className="mt-2 text-sm text-[#526078]">{item.unit} por 100 mil residentes</p></div><div className="rounded-2xl border border-[#dce2ed] bg-white p-5"><h2 className="font-semibold">População no denominador</h2><strong className="mt-3 block text-4xl tabular-nums">{fmt(current.population)}</strong><p className="mt-2 text-sm text-[#526078]">Censo 2022 · 41 CISPs</p></div></div>
    <section className="mt-6 rounded-2xl border border-[#dce2ed] bg-white p-5"><h2 className="text-lg font-semibold">Comparação de 12 meses</h2><p className="mt-2 leading-7">Janela anterior: {fmt(current.previous)} {item.unit}; janela atual: {fmt(current.count)} {item.unit}. {current.change == null ? 'Variação percentual indisponível quando o volume anterior é inferior a 20 ou zero.' : `Variação de ${fmt(current.change, 1)}%.`}</p><p className="mt-2 text-sm text-[#526078]">As janelas são equivalentes; a taxa usa residentes e não representa risco individual.</p></section>
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]"><SeriesTable rows={monthlySeries(item.id)} unit={item.unit} /><section><h2 className="text-2xl font-semibold">Nas 41 CISPs</h2><p className="mt-2 text-sm text-[#526078]">Quantidade nos últimos 12 meses. Cada link abre a ficha territorial; a contagem pertence à CISP inteira.</p><div className="mt-4 max-h-[780px] overflow-y-auto rounded-2xl border border-[#dce2ed] bg-white"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-[#eaf0fc]"><tr><th scope="col" className="px-3 py-3">Região</th><th scope="col" className="px-3 py-3 text-right">{item.unit}</th></tr></thead><tbody>{areas.map((area) => <tr key={area.cisp} className="border-t border-[#e7ebf2]"><th scope="row" className="px-3 py-2 font-medium"><a className="text-[#2455dc] underline" href={`/regioes/cisp-${area.cisp}`}>CISP {area.cisp}</a><span className="block text-[#526078]">{area.territorialUnit}</span></th><td className="px-3 py-2 text-right tabular-nums">{fmt(rows.find((row) => row.cisp === area.cisp)?.count)}</td></tr>)}</tbody></table></div></section></div>
    <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold"><a className="rounded-xl bg-[#2455dc] px-4 py-3 text-white" href={`/?indicador=${item.id}`}>Explorar no mapa</a><a className="rounded-xl border border-[#2455dc] px-4 py-3 text-[#2455dc]" href="/dados">Baixar dados</a></div>
    <div className="mt-7"><SourceNote /></div>
  </PageShell>;
}
