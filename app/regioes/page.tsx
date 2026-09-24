/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { BreadcrumbLd, JsonLd, PageShell, SourceNote } from '@/components/organic-ui';
import { ORIGIN, areas, canonical, fmt, metrics, monthLabel, period, sourceUpdated } from '@/lib/organic-data';

export const metadata: Metadata = { title: 'Regiões policiais CISP do Rio de Janeiro | Mapa da Criminalidade RJ', description: `Consulte as 41 CISPs do município do Rio de Janeiro com dados policiais até ${monthLabel(period)}, população e relação de bairros.`, alternates: { canonical: canonical('/regioes') } };
export default function Regions() {
  const rows = metrics('total_roubos');
  return <PageShell crumbs={[{ label: 'Regiões' }]}>
    <BreadcrumbLd items={[{ name: 'Regiões', path: '/regioes' }]} />
    <JsonLd value={{ '@context': 'https://schema.org', '@type': 'ItemList', '@id': `${ORIGIN}/regioes#lista`, name: '41 CISPs do município do Rio de Janeiro', numberOfItems: areas.length, itemListElement: areas.map((area, index) => ({ '@type': 'ListItem', position: index + 1, name: `CISP ${area.cisp} · ${area.territorialUnit}`, url: `${ORIGIN}/regioes/cisp-${area.cisp}` })) }} />
    <div className="mb-7"><p className="text-sm font-semibold uppercase tracking-wide text-[#2455dc]">Diretório territorial</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">41 regiões policiais do Rio de Janeiro</h1><p className="mt-3 max-w-3xl text-base leading-7 text-[#526078]">Cada ficha mostra dados da circunscrição integrada de segurança pública (CISP), seus bairros ou partes, série mensal e população. Recorte disponível até {monthLabel(period)}; fonte atualizada em {sourceUpdated}.</p></div>
    <div className="overflow-x-auto rounded-2xl border border-[#dce2ed] bg-white"><table className="w-full min-w-[600px] text-left text-sm"><caption className="p-4 text-left font-semibold">Total de roubos, últimos 12 meses · {areas.length} áreas</caption><thead className="bg-[#eaf0fc]"><tr><th className="px-4 py-3" scope="col">CISP e território</th><th className="px-4 py-3" scope="col">Bairros relacionados</th><th className="px-4 py-3 text-right" scope="col">Casos</th></tr></thead><tbody>{areas.map((area) => <tr key={area.cisp} className="border-t border-[#e7ebf2]"><th scope="row" className="px-4 py-3 font-medium"><a className="font-semibold text-[#2455dc] underline underline-offset-4" href={`/regioes/cisp-${area.cisp}`}>CISP {area.cisp}</a><span className="mt-1 block text-[#526078]">{area.territorialUnit}</span></th><td className="px-4 py-3">{area.neighborhoods.join(', ')}</td><td className="px-4 py-3 text-right tabular-nums">{fmt(rows.find((row) => row.cisp === area.cisp)?.count)}</td></tr>)}</tbody></table></div>
    <div className="mt-6"><SourceNote /></div>
  </PageShell>;
}
