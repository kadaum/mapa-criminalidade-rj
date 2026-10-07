import { CrimeAtlas } from '@/components/crime-atlas';
import { HomeTable } from '@/components/snapshot-tables';
import { SiteHeader } from '@/components/site-header';
import { JsonLd } from '@/components/organic-ui';
import { ORIGIN, canonical, monthLabel, period } from '@/lib/organic-data';
import type { Metadata } from 'next';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  return { title: 'Mapa da Criminalidade RJ — Registros policiais por CISP', description: `Explore as 41 CISPs do município do Rio de Janeiro com dados do ISP-RJ até ${monthLabel(period)}, taxas, fontes e limites.`, alternates: { canonical: canonical('/') }, robots: Object.keys(params).length ? { index: false, follow: true } : undefined };
}
export default function Home() {
  return <>
    <JsonLd value={{ '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: ORIGIN, name: 'Mapa da Criminalidade RJ', description: 'Registros policiais oficiais por região no município do Rio de Janeiro.' }} />
    <SiteHeader />
    <h1 className="sr-only">Registros policiais por região no Rio de Janeiro</h1>
    <CrimeAtlas showHeader={false} />
    <HomeTable />
  </>;
}
