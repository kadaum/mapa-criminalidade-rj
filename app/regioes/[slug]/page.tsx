/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BreadcrumbLd, JsonLd, PageShell, RegionMap, SeriesTable, SourceNote } from '@/components/organic-ui';
import { cityMetric, rankMetrics } from '@/lib/crime-analysis';
import { ORIGIN, areaById, canonical, collected, fmt, ids, indicatorList, metrics, monthLabel, monthlySeries, period, populationById, queryFor, sourceUpdated, windowLabel } from '@/lib/organic-data';
import { pilotForRelatedName } from '@/lib/neighborhood-pages';
import { TerritoryAction, TerritoryCard, TerritoryEyebrow } from '@/components/territory-ui';

type Params = { params: Promise<{ slug: string }> };
function idFor(slug: string) { const match = /^cisp-([1-9]\d*)$/.exec(slug); return match ? Number(match[1]) : null; }
export function generateStaticParams() { return ids.map((id) => ({ slug: `cisp-${id}` })); }
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = idFor((await params).slug) ?? 0, area = areaById(id);
  if (!area) return { title: 'CISP inexistente' };
  return { title: `CISP ${id} · ${area.territorialUnit} | Mapa da Criminalidade RJ`, description: `Taxas por 100 mil moradores, posições entre as 41 CISPs, registros policiais e série mensal da CISP ${id}, ${area.territorialUnit}. Dados até ${monthLabel(period)}.`, alternates: { canonical: canonical(`/regioes/cisp-${id}`) }, openGraph: { title: `CISP ${id} · ${area.territorialUnit}`, url: canonical(`/regioes/cisp-${id}`) } };
}
function rankingHref(indicator: string, view: 'taxa' | 'quantidade') {
  return `/rankings?${new URLSearchParams({ indicador: indicator, meses: '12', fim: period, comparacao: 'year', visualizacao: view })}`;
}
export default async function Region({ params }: Params) {
  const id = idFor((await params).slug) ?? 0, area = areaById(id);
  if (!area) notFound();
  const pop = populationById(id);
  const indicators = indicatorList.map((meta) => {
    const rows = metrics(meta.id);
    return { meta, value: rows.find((row) => row.cisp === id), rateRank: rankMetrics(rows, 'rate').find((row) => row.cisp === id), countRank: rankMetrics(rows, 'count').find((row) => row.cisp === id), cityRate: cityMetric(rows).rate };
  });
  const primary = indicators.find((item) => item.meta.id === 'total_roubos')!;
  const current = primary.value;
  const others = ['total_furtos', 'roubo_rua', 'letalidade_violenta'].map((key) => indicators.find((item) => item.meta.id === key)!);
  const path = `/regioes/cisp-${id}`;
  const periodText = windowLabel(period, 12);
  const relatedPilots = area.neighborhoods.flatMap((name) => { const item = pilotForRelatedName(name); return item ? [item] : []; }).filter((item, index, all) => all.findIndex((candidate) => candidate.slug === item.slug) === index);
  return <PageShell crumbs={[{ label: 'Regiões', path: '/regioes' }, { label: `CISP ${id}` }]}>
    <BreadcrumbLd items={[{ name: 'Regiões', path: '/regioes' }, { name: `CISP ${id}`, path }]} />
    <JsonLd value={{ '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${ORIGIN}${path}#webpage`, url: `${ORIGIN}${path}`, name: `CISP ${id} · ${area.territorialUnit}`, description: `Taxas, posições e registros policiais da CISP ${id} até ${monthLabel(period)}.`, isPartOf: { '@id': `${ORIGIN}/#website` }, spatialCoverage: { '@type': 'Place', name: `CISP ${id}, município do Rio de Janeiro` } }} />
    <section className="territory-hero p-6 sm:p-9" aria-labelledby="cisp-title">
      <TerritoryEyebrow inverse>Região policial · CISP {id}</TerritoryEyebrow>
      <h1 id="cisp-title" className="mt-2 max-w-4xl text-3xl font-semibold tracking-tight sm:text-5xl">{area.territorialUnit}</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[#d5deed]">Consulte os indicadores, a comparação municipal e o território desta região policial.</p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c5d1e6]">Os registros representam a área policial inteira e não são totais de cada bairro.</p>
      <nav aria-label="Caminhos desta CISP" className="mt-6 flex flex-wrap gap-2">
        {relatedPilots.map((pilot) => <TerritoryAction key={pilot.slug} inverse href={`/bairros/${pilot.slug}`}>{pilot.name}: Censo e transporte</TerritoryAction>)}
        <TerritoryAction inverse href={`/${queryFor(id)}`}>Abrir no mapa</TerritoryAction>
        <TerritoryAction inverse href={`/comparar${queryFor(id)}`}>Comparar</TerritoryAction>
      </nav>
      <p className="mt-5 text-sm leading-6 text-[#c5d1e6]">Série até {monthLabel(period)} · fonte atualizada em {sourceUpdated} · snapshot coletado em {new Date(collected).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.</p>
    </section>
    <TerritoryCard className="mt-5" >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><TerritoryEyebrow>{periodText}</TerritoryEyebrow><h2 className="territory-section-title mt-1">Roubos na CISP {id}</h2></div>
        <p className="territory-help max-w-md">Mesma janela de 12 meses para todas as 41 CISPs do município.</p>
      </div>
      <dl className="mt-5 grid grid-cols-2 border-y border-[#dce2ed] lg:grid-cols-4">
        <div className="min-w-0 py-4 pr-3 lg:pr-5"><dt className="text-sm leading-5 text-[#526078]">Quantidade</dt><dd className="mt-1 text-3xl font-semibold tabular-nums">{fmt(current?.count)}</dd><dd className="mt-1 text-sm leading-5">casos registrados</dd></div>
        <div className="min-w-0 border-l border-[#dce2ed] py-4 pl-3 lg:px-5"><dt className="text-sm leading-5 text-[#526078]">Taxa</dt><dd className="mt-1 text-3xl font-semibold tabular-nums">{fmt(current?.rate, 1)}</dd><dd className="mt-1 text-sm leading-5">casos por 100 mil moradores</dd></div>
        <div className="min-w-0 border-t border-[#dce2ed] py-4 pr-3 lg:border-l lg:border-t-0 lg:px-5"><dt className="text-sm leading-5 text-[#526078]">Posição por taxa</dt><dd className="mt-1 text-3xl font-semibold tabular-nums">{primary.rateRank ? `${primary.rateRank.rank}ª` : '—'}</dd><dd className="mt-1 text-sm leading-5">de 41{primary.rateRank?.tied ? ' · empate' : ''} · <a className="text-[#2455dc] underline" href={rankingHref(primary.meta.id, 'taxa')}>ver ranking</a></dd></div>
        <div className="min-w-0 border-l border-t border-[#dce2ed] py-4 pl-3 lg:border-t-0 lg:px-5"><dt className="text-sm leading-5 text-[#526078]">Posição por quantidade</dt><dd className="mt-1 text-3xl font-semibold tabular-nums">{primary.countRank ? `${primary.countRank.rank}ª` : '—'}</dd><dd className="mt-1 text-sm leading-5">de 41{primary.countRank?.tied ? ' · empate' : ''} · <a className="text-[#2455dc] underline" href={rankingHref(primary.meta.id, 'quantidade')}>ver ranking</a></dd></div>
      </dl>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div><h3 className="font-semibold">Comparação com o município</h3><p className="mt-2 text-sm leading-6">Taxa da CISP: <strong>{fmt(current?.rate, 1)}</strong> · taxa do município: <strong>{fmt(primary.cityRate, 1)}</strong> por 100 mil moradores.</p><p className="territory-help mt-1">A taxa municipal usa a soma dos registros e da população das 41 CISPs.</p></div>
        <div><h3 className="font-semibold">Comparação equivalente</h3><p className="mt-2 text-sm leading-6">{current?.previous == null ? 'Janela anterior indisponível.' : <>Janela anterior: <strong>{fmt(current.previous)} casos</strong>. Janela atual: <strong>{fmt(current.count)} casos</strong>. {current.change == null ? 'Variação percentual omitida porque o volume anterior é inferior a 20 casos ou zero.' : <>Variação: <strong>{fmt(current.change, 1)}%</strong>.</>}</>}</p><p className="territory-help mt-1">Ambas as janelas têm 12 meses.</p></div>
        <div><h3 className="font-semibold">População usada na taxa</h3><strong className="mt-2 block text-2xl tabular-nums">{fmt(pop?.population)} moradores</strong><p className="territory-help mt-1">Censo 2022 · {fmt(pop?.sectors)} setores. Denominador fixo: registros nos 12 meses ÷ moradores × 100 mil.</p></div>
      </div>
      <p className="territory-help mt-5">As posições ordenam registros do maior para o menor valor. A taxa usa a população residente do Censo 2022 como denominador fixo. Posições e taxas não classificam segurança nem risco individual.</p>
    </TerritoryCard>
    <section className="mt-6" aria-labelledby="territory-map-title"><div className="mb-3"><TerritoryEyebrow>Território</TerritoryEyebrow><h2 id="territory-map-title" className="territory-section-title mt-1">Onde fica a CISP {id}</h2></div><RegionMap selected={id} /></section>
    <section className="mt-8"><h2 className="text-2xl font-semibold">Outros indicadores na CISP {id}</h2><p className="mt-2 text-sm text-[#526078]">{periodText} · taxa por 100 mil moradores em cada categoria.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{others.map(({ meta, value, rateRank }) => <div className="rounded-2xl border border-[#dce2ed] bg-white p-5" key={meta.id}><h3 className="font-semibold"><a className="text-[#2455dc] underline" href={`/indicadores/${meta.id}`}>{meta.label}</a></h3><strong className="mt-3 block text-3xl tabular-nums">{fmt(value?.count)}</strong><p className="text-sm text-[#526078]">{meta.unit} · 12 meses</p><p className="mt-3 text-sm">Taxa: <strong>{fmt(value?.rate, 1)}</strong> por 100 mil</p><p className="mt-1 text-sm">Posição por taxa: <a className="font-semibold text-[#2455dc] underline" href={rankingHref(meta.id, 'taxa')}>{rateRank ? `${rateRank.rank}ª de 41` : 'Indisponível'}</a>{rateRank?.tied ? ' · empate' : ''}</p></div>)}</div><p className="mt-3 text-sm text-[#526078]">Categorias podem se sobrepor. Casos, vítimas e registros de ocorrência têm unidades distintas e não são somados.</p></section>
    <section className="mt-8"><h2 className="text-2xl font-semibold">Todos os indicadores da CISP {id}</h2><p className="mt-2 text-sm text-[#526078]">{periodText} · posição pela taxa entre as 41 CISPs, do maior para o menor valor. Empates compartilham a mesma posição.</p>
    {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to focus and scroll the wide data table. */}
    <section className="mt-4 overflow-x-auto rounded-2xl border border-[#dce2ed] bg-white" aria-label={`Tabela com todos os indicadores da CISP ${id}; deslize horizontalmente em telas estreitas`} tabIndex={0}><table className="w-full min-w-[600px] text-left text-sm"><caption className="sr-only">Quantidade, taxa por 100 mil moradores e posição por taxa dos {indicators.length} indicadores da CISP {id}</caption><thead className="bg-[#eaf0fc]"><tr><th className="px-4 py-3" scope="col">Indicador</th><th className="px-4 py-3 text-right" scope="col">Quantidade</th><th className="px-4 py-3 text-right" scope="col">Taxa por 100 mil</th><th className="px-4 py-3 text-right" scope="col">Posição por taxa</th></tr></thead><tbody>{indicators.map(({ meta, value, rateRank }) => <tr className="border-t border-[#e7ebf2]" data-indicator={meta.id} key={meta.id}><th className="px-4 py-3 font-medium" scope="row"><a className="text-[#2455dc] underline" href={`/indicadores/${meta.id}`}>{meta.label}</a><span className="block text-xs text-[#526078]">{meta.unit}</span></th><td className="px-4 py-3 text-right tabular-nums">{fmt(value?.count)}</td><td className="px-4 py-3 text-right tabular-nums">{fmt(value?.rate, 1)}</td><td className="px-4 py-3 text-right tabular-nums"><a className="text-[#2455dc] underline" href={rankingHref(meta.id, 'taxa')}>{rateRank ? `${rateRank.rank}ª de 41${rateRank.tied ? ' (empate)' : ''}` : 'Indisponível'}</a></td></tr>)}</tbody></table></section><p className="mt-3 text-sm text-[#526078]">Uma taxa divide registros, casos ou vítimas pela população residente. Ela não ajusta circulação de pessoas, subnotificação ou local do fato, que pode diferir do local do registro.</p></section>
    <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_.65fr]"><SeriesTable rows={monthlySeries(primary.meta.id, id)} unit={primary.meta.unit} /><div className="space-y-5"><TerritoryCard><h2 className="text-lg font-semibold">Bairros relacionados</h2><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{area.neighborhoods.map((name) => <li key={name}>{name}</li>)}</ul><p className="mt-3 text-sm text-[#526078]">Relação oficial do ISP-RJ. Nomes com “parte” indicam divisão do bairro entre circunscrições; a lista não reparte as ocorrências entre bairros.</p></TerritoryCard><TerritoryCard><h2 className="text-lg font-semibold">Continue a exploração</h2><div className="mt-3 flex flex-col gap-3 text-sm font-semibold text-[#2455dc]"><a className="underline" href={`/${queryFor(id)}`}>Abrir no mapa</a><a className="underline" href={`/meu-bairro${queryFor(id)}`}>Explorar esta região</a><a className="underline" href={`/comparar${queryFor(id)}`}>Comparar</a><a className="underline" href={`/historico?indicador=total_roubos&cisp=${id}`}>Ver histórico</a><a className="underline" href="/dados">Baixar os dados</a></div></TerritoryCard></div></section>
    <div className="mt-7"><SourceNote /></div>
  </PageShell>;
}
