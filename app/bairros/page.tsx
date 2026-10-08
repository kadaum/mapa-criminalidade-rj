/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { BreadcrumbLd, JsonLd, PageShell } from '@/components/organic-ui';
import { ORIGIN, canonical } from '@/lib/organic-data';
import {
  cispsForNeighborhood,
  pilotNeighborhoods,
} from '@/lib/neighborhood-pages';
import { transportForNeighborhood } from '@/lib/neighborhood-transport';
import {
  TerritoryAction,
  TerritoryCard,
  TerritoryEyebrow,
} from '@/components/territory-ui';

export const metadata: Metadata = {
  title:
    'Bairros do Rio: contexto e regiões policiais | Mapa da Criminalidade RJ',
  description:
    'Cinco páginas-piloto ligam contexto do Censo 2022 às regiões policiais relacionadas, sem atribuir registros de uma CISP ao bairro.',
  alternates: { canonical: canonical('/bairros') },
};

export default function Neighborhoods() {
  return (
    <PageShell crumbs={[{ label: 'Bairros' }]}>
      <BreadcrumbLd items={[{ name: 'Bairros', path: '/bairros' }]} />
      <JsonLd
        value={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': `${ORIGIN}/bairros#page`,
          url: `${ORIGIN}/bairros`,
          name: 'Bairros do Rio: contexto e regiões policiais',
          hasPart: pilotNeighborhoods.map((item) => ({
            '@id': `${ORIGIN}/bairros/${item.slug}#page`,
          })),
        }}
      />
      <section className="territory-hero p-6 sm:p-9">
        <TerritoryEyebrow inverse>Diretório territorial</TerritoryEyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
          Bairros: contexto local e regiões policiais
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#d5deed]">
          Abra um bairro para encontrar a ponte com as CISPs relacionadas, dados
          do Censo 2022 e o cadastro municipal de transporte.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[#c5d1e6]">
          Registros policiais pertencem à área inteira de cada CISP; não são
          totais do bairro.
        </p>
      </section>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pilotNeighborhoods.map((item) => {
          const cisps = cispsForNeighborhood(item.name),
            transport = transportForNeighborhood(item.slug);
          return (
            <TerritoryCard key={item.slug}>
              <TerritoryEyebrow>Bairro do Rio</TerritoryEyebrow>
              <h2 className="mt-1 text-2xl font-semibold">{item.name}</h2>
              <p className="mt-3 text-sm leading-6 text-[#526078]">
                {cisps.length}{' '}
                {cisps.length === 1 ? 'CISP relacionada' : 'CISPs relacionadas'}
                : {cisps.map((area) => area.cisp).join(', ')}.
              </p>
              {transport && (
                <p className="mt-1 text-sm leading-6 text-[#526078]">
                  {transport.count.toLocaleString('pt-BR')} pontos de ônibus
                  cadastrados.
                </p>
              )}
              <div className="mt-4">
                <TerritoryAction href={`/bairros/${item.slug}`}>
                  Abrir perfil territorial
                </TerritoryAction>
              </div>
            </TerritoryCard>
          );
        })}
      </div>
    </PageShell>
  );
}
