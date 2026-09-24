/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { BreadcrumbLd, JsonLd, PageShell, SourceNote } from '@/components/organic-ui';
import { ORIGIN, canonical, city, fmt, indicatorList, monthLabel, period } from '@/lib/organic-data';

export const metadata: Metadata = { title: 'Indicadores de segurança pública | Mapa da Criminalidade RJ', description: `Definições, unidades e séries de ${indicatorList.length} indicadores policiais do ISP-RJ no Rio de Janeiro, até ${monthLabel(period)}.`, alternates: { canonical: canonical('/indicadores') } };
export default function Indicators() {
  return <PageShell crumbs={[{ label: 'Indicadores' }]}>
    <BreadcrumbLd items={[{ name: 'Indicadores', path: '/indicadores' }]} />
    <JsonLd value={{ '@context': 'https://schema.org', '@type': 'ItemList', '@id': `${ORIGIN}/indicadores#lista`, name: 'Indicadores policiais do ISP-RJ', numberOfItems: indicatorList.length, itemListElement: indicatorList.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.label, url: `${ORIGIN}/indicadores/${item.id}` })) }} />
    <p className="text-sm font-semibold uppercase tracking-wide text-[#2455dc]">Dicionário de indicadores</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">O que cada indicador mede</h1><p className="mt-3 max-w-3xl text-base leading-7 text-[#526078]">Consulte definição, unidade e série mensal da cidade. Quantidades se referem a registros policiais; agregados e componentes podem se sobrepor. Período até {monthLabel(period)}.</p>
    <div className="mt-7 grid gap-3 md:grid-cols-2">{indicatorList.map((item) => <a href={`/indicadores/${item.id}`} key={item.id} className="rounded-2xl border border-[#dce2ed] bg-white p-5 transition hover:border-[#2455dc]"><h2 className="text-lg font-semibold text-[#2455dc]">{item.label}</h2><p className="mt-2 text-sm leading-6 text-[#526078]">{item.definition}</p><p className="mt-4 text-sm"><strong>{fmt(city(item.id).count)} {item.unit}</strong> · últimos 12 meses</p></a>)}</div><div className="mt-7"><SourceNote /></div>
  </PageShell>;
}
