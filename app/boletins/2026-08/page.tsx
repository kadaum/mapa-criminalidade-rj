import type { Metadata } from 'next';
import { BulletinPage } from '@/app/boletins/bulletin-page';
import { monthLabel } from '@/lib/organic-data';
import { bulletinMetadata } from '@/lib/product-page-metadata';
const end = '2026-08';
export const metadata: Metadata = bulletinMetadata(end, monthLabel(end));
export default function Bulletin() { return <BulletinPage end={end} />; }
