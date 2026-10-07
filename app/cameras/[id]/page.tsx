import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CameraDetailClient } from '@/components/camera-detail-client';
import { SiteHeader } from '@/components/site-header';
import { canonical } from '@/lib/organic-data';
import catalog from '@/public/data/public-cameras.json';
import type { PublicCamera } from '@/lib/public-cameras';

type Props = { params: Promise<{ id: string }> };
const findCamera = (id: string) =>
  (catalog.cameras as PublicCamera[]).find((camera) => camera.id === id);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const camera = findCamera(id);
  if (!camera)
    return {
      title: 'Câmera não encontrada | Mapa da Criminalidade RJ',
      robots: { index: false, follow: false },
    };
  const title = `${camera.name} — ${camera.neighborhood} | Câmeras públicas RJ`;
  const description = `Fonte pública em ${camera.neighborhood}, com localização de referência, histórico de verificação e acesso à origem.`;
  return {
    title,
    description,
    alternates: { canonical: canonical(`/cameras/${encodeURIComponent(id)}`) },
    openGraph: { title, description },
    robots: { index: false, follow: true },
  };
}

export default async function CameraPage({ params }: Props) {
  const { id } = await params;
  const camera = findCamera(id);
  if (!camera) notFound();
  return (
    <>
      <SiteHeader />
      <CameraDetailClient
        camera={camera}
        canonicalUrl={canonical(`/cameras/${encodeURIComponent(id)}`)}
      />
    </>
  );
}
