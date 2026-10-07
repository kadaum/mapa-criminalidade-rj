/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { BreadcrumbLd, JsonLd, PageShell } from '@/components/organic-ui';
import { ORIGIN, canonical, sourceUpdated } from '@/lib/organic-data';
import { cispsForNeighborhood, pilotNeighborhoods } from '@/lib/neighborhood-pages';

export const metadata: Metadata = { title: 'Bairros do Rio: contexto e regiões policiais | Mapa da Criminalidade RJ', description: 'Cinco páginas-piloto ligam contexto do Censo 2022 às regiões policiais relacionadas, sem atribuir registros de uma CISP ao bairro.', alternates: { canonical: canonical('/bairros') } };

export default function Neighborhoods() {
  return <PageShell crumbs={[{ label: 'Bairros' }]}>
    <BreadcrumbLd items={[{ name: 'Bairros', path: '/bairros' }]} />
    <JsonLd value={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': `${ORIGIN}/bairros#page`, url: `${ORIGIN}/bairros`, name: 'Bairros do Rio: contexto e regiões policiais', dateModified: sourceUpdated, hasPart: pilotNeighborhoods.map((item) => ({ '@id': `${ORIGIN}/bairros/${item.slug}#page` })) }} />
    <p className="text-sm font-semibold uppercase tracking-wide text-[#2455dc]">Piloto territorial</p>
    <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Bairros: contexto local e regiões policiais</h1>
    <p className="mt-3 max-w-3xl leading-7 text-[#526078]">Estas páginas combinam contexto do IBGE no nível do bairro com links para as CISPs relacionadas. Os registros policiais continuam identificados como dados da área policial inteira; não são totais do bairro.</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pilotNeighborhoods.map((item) => { const cisps = cispsForNeighborhood(item.name); return <article key={item.slug} className="rounded-2xl border border-[#dce2ed] bg-white p-5"><h2 className="text-xl font-semibold"><a className="text-[#2455dc] underline" href={`/bairros/${item.slug}`}>{item.name}</a></h2><p className="mt-2 text-sm leading-6 text-[#526078]">{cisps.length} {cisps.length === 1 ? 'CISP relacionada' : 'CISPs relacionadas'}: {cisps.map((area) => area.cisp).join(', ')}.</p></article>; })}</div>
  </PageShell>;
}
