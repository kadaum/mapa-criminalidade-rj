/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  BreadcrumbLd,
  JsonLd,
  PageShell,
  SourceNote,
} from '@/components/organic-ui';
import {
  TerritoryAction,
  TerritoryCard,
  TerritoryEyebrow,
} from '@/components/territory-ui';
import {
  contextForNeighborhood,
  neighborhoodDataset,
} from '@/lib/neighborhood-context';
import {
  cispsForNeighborhood,
  neighborhoodBySlug,
  neighborhoodContext,
  pilotNeighborhoods,
} from '@/lib/neighborhood-pages';
import {
  ORIGIN,
  fmt,
  metrics,
  monthLabel,
  monthlySeries,
  period,
  windowLabel,
} from '@/lib/organic-data';
import { monthShift, windowPeriods } from '@/lib/crime-analysis';
import { neighborhoodMetadata } from '@/lib/product-page-metadata';
import {
  neighborhoodTransport,
  transportForNeighborhood,
} from '@/lib/neighborhood-transport';

type Params = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return pilotNeighborhoods.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const item = neighborhoodBySlug((await params).slug);
  if (!item) return { title: 'Bairro inexistente' };
  return neighborhoodMetadata(item.name, item.slug);
}

export default async function Neighborhood({ params }: Params) {
  const item = neighborhoodBySlug((await params).slug);
  if (!item) notFound();
  const context = contextForNeighborhood(neighborhoodContext, item.name);
  const transport = transportForNeighborhood(item.slug);
  const cisps = cispsForNeighborhood(item.name);
  if (!context || !cisps.length) notFound();
  const robbery = metrics('total_roubos', period, 12, 'year');
  const compareParams = new URLSearchParams({
    indicador: 'total_roubos',
    meses: '12',
    fim: period,
    comparacao: 'year',
    visualizacao: 'quantidade',
    cisp: String(cisps[0].cisp),
    outra: String(cisps.length > 1 ? cisps[1].cisp : 'rio'),
  });
  const neighborhoodParams = (cisp: number) =>
    new URLSearchParams({
      cisp: String(cisp),
      bairro: item.name,
      indicador: 'total_roubos',
      meses: '12',
      fim: period,
      comparacao: 'year',
      visualizacao: 'quantidade',
    });
  const path = `/bairros/${item.slug}`;
  return (
    <PageShell
      crumbs={[{ label: 'Bairros', path: '/bairros' }, { label: item.name }]}
    >
      <BreadcrumbLd
        items={[
          { name: 'Bairros', path: '/bairros' },
          { name: item.name, path },
        ]}
      />
      <JsonLd
        value={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': `${ORIGIN}${path}#page`,
          url: `${ORIGIN}${path}`,
          name: `${item.name}: contexto do bairro e CISPs relacionadas`,
          about: [
            {
              '@type': 'Place',
              name: item.name,
              identifier: context.ibgeCode,
              containedInPlace: { '@type': 'City', name: 'Rio de Janeiro' },
            },
            neighborhoodDataset(neighborhoodContext, item.name),
            ...cisps.map((area) => ({
              '@type': 'Place',
              name: `CISP ${area.cisp}`,
            })),
          ],
        }}
      />

      <section
        className="territory-hero grid overflow-hidden lg:grid-cols-[1.08fr_.92fr]"
        aria-labelledby="bairro-title"
      >
        <div className="p-6 sm:p-8 lg:p-10">
          <TerritoryEyebrow inverse>
            Perfil territorial do bairro
          </TerritoryEyebrow>
          <h1
            id="bairro-title"
            className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            {item.name}
          </h1>
          {transport && (
            <p className="mt-4 text-sm leading-6 text-[#d5deed] lg:hidden">
              <strong className="mr-1 text-2xl text-white tabular-nums">
                {fmt(transport.count)}
              </strong>
              pontos no cadastro municipal de ônibus (SPPO)
            </p>
          )}
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#d5deed]">
            {cisps.length === 1
              ? '1 região policial relacionada.'
              : `${cisps.length} regiões policiais relacionadas.`}{' '}
            Consulte registros por CISP e contexto urbano do bairro.
          </p>
          <nav
            aria-label="Seções desta página"
            className="mt-6 flex flex-wrap gap-2"
          >
            <TerritoryAction inverse href="#regioes">
              Ver {cisps.length} {cisps.length === 1 ? 'CISP' : 'CISPs'}
            </TerritoryAction>
            {transport && (
              <TerritoryAction inverse href="#transporte">
                Ver transporte
              </TerritoryAction>
            )}
            <TerritoryAction inverse href="#censo">
              Ver contexto do Censo
            </TerritoryAction>
          </nav>
          <p className="mt-5 text-sm leading-6 text-[#c5d1e6]">
            Os registros pertencem às CISPs inteiras e não representam um total
            de crimes de {item.name}.
          </p>
        </div>
        {transport && (
          <section
            id="transporte"
            className="m-3 bg-white p-5 text-[#172235] sm:m-4 sm:p-6"
            aria-labelledby="transport-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="transport-title" className="territory-eyebrow">
                  Transporte no bairro
                </h2>
                <strong className="mt-1 block text-5xl tabular-nums">
                  {fmt(transport.count)}
                </strong>
              </div>
              <p className="max-w-44 text-right text-sm font-semibold uppercase leading-5 text-[#526078]">
                pontos cadastrados na base municipal de ônibus
              </p>
            </div>
            <h3 className="mt-5 text-lg font-semibold">
              Alguns pontos cadastrados
            </h3>
            <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              {transport.stops.slice(0, 5).map((stop) => (
                <li key={stop.stop_id}>
                  <a
                    className="inline-flex min-h-11 items-center underline"
                    href={`https://www.openstreetmap.org/?mlat=${stop.stop_lat}&mlon=${stop.stop_lon}#map=18/${stop.stop_lat}/${stop.stop_lon}`}
                    rel="noreferrer"
                  >
                    {stop.stop_name}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-6 text-[#526078]">
              Prefeitura do Rio · camada Paradas (SPPO). Base editada em{' '}
              {new Date(
                neighborhoodTransport.source.layerLastEditDate,
              ).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}. Cadastros
              próximos podem representar plataformas ou pontos diferentes.
              Este cadastro de localização não confirma operação atual,
              horários, frequência, movimento de passageiros, acessibilidade
              ou segurança.
            </p>
            <details className="mt-3 text-sm">
              <summary className="min-h-11 cursor-pointer py-3 font-semibold text-[#2455dc] underline">
                Fonte, licença e download
              </summary>
              <div className="flex flex-wrap gap-x-5 gap-y-2 pb-2">
                <a
                  className="min-h-11 py-3 underline"
                  href="/data/neighborhood-transport.json"
                  download
                >
                  Baixar dados do recorte
                </a>
                <a
                  className="min-h-11 py-3 underline"
                  href={neighborhoodTransport.source.itemUrl}
                >
                  Fonte oficial
                </a>
                <a
                  className="min-h-11 py-3 underline"
                  href={neighborhoodTransport.source.licenseUrl}
                >
                  Licença CC BY 4.0
                </a>
              </div>
              <p className="territory-help">
                Fonte: {neighborhoodTransport.source.provider}. Dados
                consultados em{' '}
                {new Date(
                  neighborhoodTransport.source.retrievedAt,
                ).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}. A contagem
                usa o limite municipal simplificado de {item.name}; pontos na
                borda ficaram fora.
              </p>
            </details>
          </section>
        )}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section
          id="regioes"
          className="territory-card"
          aria-labelledby="regions-title"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <TerritoryEyebrow>ISP-RJ · ponte territorial</TerritoryEyebrow>
              <h2 id="regions-title" className="territory-section-title mt-1">
                {cisps.length}{' '}
                {cisps.length === 1
                  ? 'região policial relacionada'
                  : 'regiões policiais relacionadas'}
              </h2>
            </div>
            <TerritoryAction href={`/comparar?${compareParams}`}>
              Comparar CISPs
            </TerritoryAction>
          </div>
          <p className="territory-help mt-2">
            Total de roubos em {windowLabel(period, 12)}. Cada quantidade cobre
            a CISP inteira.
          </p>
          <dl className="mt-4">
            {cisps.map((area) => {
              const value = robbery.find((row) => row.cisp === area.cisp);
              return (
                <div
                  className="grid gap-2 border-t border-[#dce2ed] py-4 sm:grid-cols-[5rem_minmax(0,1fr)_7rem_7rem_6rem] sm:items-center"
                  key={area.cisp}
                >
                  <dt className="font-semibold">
                    <a
                      className="inline-flex min-h-11 items-center text-[#2455dc] underline"
                      href={`/regioes/cisp-${area.cisp}`}
                    >
                      CISP {area.cisp}
                    </a>
                  </dt>
                  <dd className="text-[#39475e]">{area.territorialUnit}</dd>
                  <dd className="flex justify-between text-sm sm:block sm:text-right">
                    <span className="text-[#526078] sm:block">
                      CISP inteira
                    </span>
                    <strong className="tabular-nums">
                      {fmt(value?.count)}
                    </strong>
                  </dd>
                  <dd className="flex justify-between text-sm sm:block sm:text-right">
                    <span className="text-[#526078] sm:block">
                      Janela anterior
                    </span>
                    <span className="tabular-nums">{fmt(value?.previous)}</span>
                  </dd>
                  <dd className="flex justify-between text-sm sm:block sm:text-right">
                    <span className="text-[#526078] sm:block">Variação</span>
                    <span className="tabular-nums">
                      {value?.change == null
                        ? 'Indisponível'
                        : `${value.change.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
                    </span>
                  </dd>
                  <dd className="sm:col-start-2">
                    <a
                      className="inline-flex min-h-11 items-center font-semibold text-[#2455dc] underline"
                      href={`/meu-bairro?${neighborhoodParams(area.cisp)}`}
                    >
                      Explorar esta região
                    </a>
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="territory-help">
            A janela anterior é {windowLabel(monthShift(period, -12), 12)}. A
            variação aparece apenas com duas janelas completas e ao menos 20
            registros na anterior. Os números não classificam segurança nem
            risco individual.
          </p>
        </section>
        <aside id="censo" className="space-y-5">
          <TerritoryCard>
            <TerritoryEyebrow>IBGE · Censo 2022</TerritoryEyebrow>
            <h2 className="mt-1 text-2xl font-semibold">
              {fmt(context.householdsSurveyed)} domicílios
            </h2>
            <p className="territory-help mt-2">
              Domicílios particulares permanentes ocupados pesquisados. “Não
              declarado” permanece no denominador.
            </p>
          </TerritoryCard>
          <TerritoryCard>
            <h2 className="text-xl font-semibold">Contexto do entorno</h2>
            {[
              ['Iluminação pública', context.lighting],
              ['Calçada', context.sidewalk],
            ].map(([label, raw]) => {
              const value = raw as typeof context.lighting;
              return (
                <div
                  className="mt-4 border-t border-[#dce2ed] pt-4"
                  key={label as string}
                >
                  <strong className="block text-3xl">
                    {fmt(value.yesPct, 2)}%
                  </strong>
                  <span className="territory-help">
                    {label as string} · {fmt(value.yes)} sim, {fmt(value.no)}{' '}
                    não, {fmt(value.unknown)} não declarado · denominador:{' '}
                    {fmt(value.total)} domicílios
                  </span>
                </div>
              );
            })}
            <p className="territory-help mt-4">
              Fonte: IBGE, {neighborhoodContext.reference}. Código{' '}
              {context.ibgeCode}. Referência temporal: 2022. A observação é da
              face do entorno e não mede funcionamento, conservação,
              acessibilidade ou segurança. Arquivo recuperado em{' '}
              {new Date(neighborhoodContext.retrievedAt).toLocaleDateString(
                'pt-BR',
                { timeZone: 'UTC' },
              )}.
            </p>
            <a
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#2455dc] underline"
              href={neighborhoodContext.source.dataUrl}
            >
              Abrir fonte do IBGE
            </a>
          </TerritoryCard>
        </aside>
      </div>

      <section className="mt-8">
        <h2 className="territory-section-title">Tendência mensal por CISP</h2>
        <p className="territory-help mt-2">
          Abra uma região para consultar os 12 meses da janela atual. Valores
          ausentes permanecem indisponíveis.
        </p>
        <div className="mt-4 space-y-3">
          {cisps.map((area) => {
            const series = new Map(
              monthlySeries('total_roubos', area.cisp).map((row) => [
                row.month,
                row.value,
              ]),
            );
            return (
              <details
                key={area.cisp}
                className="rounded-xl border border-[#dce2ed] bg-white p-4"
              >
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                  CISP {area.cisp} · {area.territorialUnit}
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead className="bg-[#eaf0fc]">
                      <tr>
                        <th className="px-3 py-2">Mês</th>
                        <th className="px-3 py-2 text-right">
                          Roubos na CISP inteira
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {windowPeriods(period, 12).map((month) => (
                        <tr key={month} className="border-t border-[#e7ebf2]">
                          <th className="px-3 py-2 font-medium">
                            {monthLabel(month)}
                          </th>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {fmt(series.get(month))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </div>
      </section>
      <TerritoryCard className="mt-8">
        <h2 className="text-xl font-semibold">
          Como ler as fontes desta página
        </h2>
        <p className="mt-3 leading-7">
          Prefeitura, IBGE e ISP-RJ usam territórios, datas e finalidades
          diferentes. Juntas, as fontes não medem a segurança do bairro nem
          demonstram relação de causa e efeito.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <TerritoryAction href="/indicadores">Indicadores</TerritoryAction>
          <TerritoryAction href={`/comparar?${compareParams}`}>
            Comparar CISPs
          </TerritoryAction>
          <TerritoryAction
            href={`/cameras?bairro=${encodeURIComponent(item.name)}`}
          >
            Consultar câmeras
          </TerritoryAction>
          <TerritoryAction href="/metodologia">
            Método e limites
          </TerritoryAction>
          <TerritoryAction href="/boletins">Boletins</TerritoryAction>
        </div>
        <p className="territory-help mt-3">
          O catálogo de câmeras consulta disponibilidade; esta página não
          confirma câmera ou imagem ao vivo.
        </p>
      </TerritoryCard>
      <div className="mt-7">
        <SourceNote />
      </div>
    </PageShell>
  );
}
