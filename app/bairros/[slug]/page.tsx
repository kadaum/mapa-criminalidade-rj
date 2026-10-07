/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BreadcrumbLd, JsonLd, PageShell, SourceNote } from '@/components/organic-ui';
import { contextForNeighborhood } from '@/lib/neighborhood-context';
import { cispsForNeighborhood, neighborhoodBySlug, neighborhoodContext, pilotNeighborhoods } from '@/lib/neighborhood-pages';
import { ORIGIN, fmt, metrics, monthLabel, period, sourceUpdated, windowLabel } from '@/lib/organic-data';
import { neighborhoodMetadata } from '@/lib/product-page-metadata';

type Params = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return pilotNeighborhoods.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const item = neighborhoodBySlug((await params).slug);
  if (!item) return { title: 'Bairro inexistente' };
  return neighborhoodMetadata(item.name, item.slug);
}

export default async function Neighborhood({ params }: Params) {
  const item = neighborhoodBySlug((await params).slug);
  if (!item) notFound();
  const context = contextForNeighborhood(neighborhoodContext, item.name);
  const cisps = cispsForNeighborhood(item.name);
  if (!context || !cisps.length) notFound();
  const robbery = metrics('total_roubos');
  const path = `/bairros/${item.slug}`;
  return <PageShell crumbs={[{ label: 'Bairros', path: '/bairros' }, { label: item.name }]}>
    <BreadcrumbLd items={[{ name: 'Bairros', path: '/bairros' }, { name: item.name, path }]} />
    <JsonLd value={{ '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${ORIGIN}${path}#page`, url: `${ORIGIN}${path}`, name: `${item.name}: contexto do bairro e CISPs relacionadas`, dateModified: sourceUpdated, about: [{ '@type': 'Place', name: item.name, identifier: context.ibgeCode, containedInPlace: { '@type': 'City', name: 'Rio de Janeiro' } }, { '@type': 'Dataset', name: neighborhoodContext.reference, creator: { '@type': 'Organization', name: neighborhoodContext.source.publisher } }, ...cisps.map((area) => ({ '@type': 'Place', name: `CISP ${area.cisp}` }))] }} />
    <p className="text-sm font-semibold uppercase tracking-wide text-[#2455dc]">Bairro · município do Rio de Janeiro</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{item.name}</h1>
    <p className="mt-4 max-w-4xl leading-7 text-[#526078]">O IBGE publica o contexto abaixo para o bairro {item.name}. O ISP-RJ relaciona o bairro a {cisps.length === 1 ? `uma região policial, a CISP ${cisps[0].cisp}` : `${cisps.length} regiões policiais: ${cisps.map((area) => `CISP ${area.cisp}`).join(', ')}`}. As contagens de registros pertencem às CISPs inteiras e não podem ser atribuídas nem somadas como total de crimes do bairro.</p>
    <section className="mt-8"><h2 className="text-2xl font-semibold">Contexto do Censo 2022 no bairro</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-[#526078]">Denominador: {fmt(context.householdsSurveyed)} domicílios particulares permanentes ocupados pesquisados. “Não declarado” permanece no denominador. A observação é da face do entorno em 2022; não mede funcionamento, conservação, acessibilidade ou segurança.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{[["Iluminação pública", context.lighting], ["Calçada", context.sidewalk]].map(([label, raw]) => { const value = raw as typeof context.lighting; return <div key={label as string} className="rounded-2xl border border-[#dce2ed] bg-white p-5"><h3 className="font-semibold">{label as string}</h3><strong className="mt-2 block text-3xl">{fmt(value.yesPct, 2)}%</strong><p className="mt-2 text-sm text-[#526078]">Sim: {fmt(value.yes)} · Não: {fmt(value.no)} · Não declarado: {fmt(value.unknown)} · Denominador: {fmt(value.total)} domicílios.</p></div>; })}</div><p className="mt-3 text-sm text-[#526078]">Fonte: <a className="underline" href={neighborhoodContext.source.dataUrl}>IBGE, {neighborhoodContext.reference}</a>. Código do bairro: {context.ibgeCode}. Referência temporal: 2022. Arquivo recuperado em {new Date(neighborhoodContext.retrievedAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.</p></section>
    <section className="mt-8"><h2 className="text-2xl font-semibold">Regiões policiais relacionadas</h2><p className="mt-2 text-sm text-[#526078]">Total de roubos em {windowLabel(period, 12)}. Cada linha cobre toda a CISP e serve como porta de entrada transparente para a fonte territorial.</p><div className="mt-4 overflow-x-auto rounded-2xl border border-[#dce2ed] bg-white"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-[#eaf0fc]"><tr><th className="px-4 py-3">Região policial</th><th className="px-4 py-3">Território descrito pelo ISP-RJ</th><th className="px-4 py-3 text-right">Roubos na CISP inteira</th><th className="px-4 py-3 text-right">Período</th></tr></thead><tbody>{cisps.map((area) => { const value = robbery.find((row) => row.cisp === area.cisp); return <tr key={area.cisp} className="border-t border-[#e7ebf2]"><th className="px-4 py-3"><a className="text-[#2455dc] underline" href={`/regioes/cisp-${area.cisp}`}>CISP {area.cisp}</a></th><td className="px-4 py-3">{area.territorialUnit}</td><td className="px-4 py-3 text-right tabular-nums">{fmt(value?.count)}</td><td className="px-4 py-3 text-right">até {monthLabel(period)}</td></tr>; })}</tbody></table></div></section>
    <section className="mt-8 rounded-2xl border border-[#dce2ed] bg-white p-5"><h2 className="text-xl font-semibold">O que estes números respondem?</h2><p className="mt-3 leading-7">Eles mostram registros comunicados à polícia nas áreas das CISPs relacionadas e contexto urbanístico publicado pelo IBGE para o bairro. Não respondem quantos crimes ocorreram dentro de {item.name}, não medem risco individual e não demonstram relação causal entre infraestrutura e registros.</p><div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-[#2455dc]"><a className="underline" href="/indicadores">Definições dos indicadores</a><a className="underline" href="/comparar">Comparar CISPs</a><a className="underline" href="/metodologia">Método e limites</a><a className="underline" href="/boletins">Boletins</a></div></section>
    <div className="mt-7"><SourceNote /></div>
  </PageShell>;
}
