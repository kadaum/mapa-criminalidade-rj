import { RegionExplorer } from '@/components/region-explorer';
import { SnapshotSummary } from '@/components/snapshot-summary';
import { RegionSeries } from '@/components/snapshot-tables';
import { SiteHeader } from '@/components/site-header';
import { canonical } from '@/lib/organic-data';
export const metadata = { title: 'Meu bairro | Mapa da Criminalidade RJ', alternates: { canonical: canonical('/meu-bairro') }, robots: { index: false, follow: true } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const params = await searchParams; return <><SiteHeader /><SnapshotSummary params={params} defaultIndicator="total_furtos" defaultCisp={0} compact /><RegionExplorer mode="meu-bairro" showHeader={false}/><RegionSeries params={params} /></>; }
