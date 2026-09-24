import { RegionExplorer } from '@/components/region-explorer';
import { SnapshotSummary } from '@/components/snapshot-summary';
import { SiteHeader } from '@/components/site-header';
import { canonical } from '@/lib/organic-data';
export const metadata = { title: 'Comparar regiões | Mapa da Criminalidade RJ', alternates: { canonical: canonical('/comparar') }, robots: { index: false, follow: true } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <><SiteHeader /><SnapshotSummary params={await searchParams} defaultIndicator="total_furtos" defaultCisp={0} compact /><RegionExplorer mode="comparar" showHeader={false}/></>; }
