import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BulletinPage } from '@/app/boletins/bulletin-page';
import { bulletinMetric, bulletinPeriods, validBulletinPeriod } from '@/lib/bulletin-data';
import { monthLabel } from '@/lib/organic-data';
import { bulletinMetadata } from '@/lib/product-page-metadata';
type Params = { params: Promise<{ period: string }> };
export function generateStaticParams() { return bulletinPeriods().filter((period) => period !== '2026-08').map((period) => ({ period })); }
export async function generateMetadata({ params }: Params): Promise<Metadata> { const end = (await params).period; if (!validBulletinPeriod(end) || !bulletinMetric('total_roubos', end)) return { title: 'Boletim indisponível' }; return bulletinMetadata(end, monthLabel(end)); }
export default async function Bulletin({ params }: Params) { const end = (await params).period; if (!validBulletinPeriod(end) || !bulletinMetric('total_roubos', end)) notFound(); return <BulletinPage end={end} />; }
