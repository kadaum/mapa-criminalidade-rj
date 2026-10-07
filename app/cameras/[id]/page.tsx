import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CameraDetailClient } from '@/components/camera-detail-client';
import { SiteHeader } from '@/components/site-header';
import { canonical } from '@/lib/organic-data';
import catalog from '@/public/data/public-cameras.json';
import type { PublicCamera } from '@/lib/public-cameras';
import { cameraHubPath } from '@/components/crime-atlas-url';
import { cameraShareCard } from '@/lib/camera-share-cards';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
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
  const description = `Câmera cadastrada pela fonte pública ${camera.publisher} em ${camera.neighborhood}. Consulte a disponibilidade na fonte.`;
  const socialCard = cameraShareCard(id);
  return {
    title,
    description,
    alternates: { canonical: canonical(`/cameras/${encodeURIComponent(id)}`) },
    ...(socialCard
      ? {
          openGraph: {
            title,
            description,
            url: canonical(`/cameras/${encodeURIComponent(id)}`),
            images: [{ url: socialCard.image, width: 1200, height: 630, alt: socialCard.alt }],
          },
          twitter: {
            card: 'summary_large_image' as const,
            title,
            description,
            images: [{ url: socialCard.image, alt: socialCard.alt, width: 1200, height: 630 }],
          },
        }
      : { openGraph: { title, description } }),
    robots: { index: false, follow: true },
  };
}

export default async function CameraPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const camera = findCamera(id);
  if (!camera) notFound();
  return (
    <>
      <SiteHeader />
      <CameraDetailClient
        camera={camera}
        canonicalUrl={canonical(`/cameras/${encodeURIComponent(id)}`)}
        mapHref={cameraHubPath(id, new URLSearchParams(
          Object.entries(query).flatMap(([key, value]) =>
            typeof value === 'string'
              ? [[key, value]]
              : Array.isArray(value)
                ? value.map((item) => [key, item])
                : [],
          ),
        ))}
      />
    </>
  );
}
