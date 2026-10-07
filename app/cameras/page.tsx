import type { Metadata } from 'next';
import { CrimeAtlas } from '@/components/crime-atlas';
import { SiteHeader } from '@/components/site-header';
import { canonical } from '@/lib/organic-data';
import catalog from '@/public/data/public-cameras.json';
import { cameraSelectionFromQuery } from '@/components/crime-atlas-url';

export const metadata: Metadata = {
  title: 'Câmeras públicas no Rio | Mapa da Criminalidade RJ',
  description:
    'Consulte fontes públicas de câmeras por local, com estado histórico de verificação e acesso à origem.',
  alternates: { canonical: canonical('/cameras') },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const publishedCameraIds = new Set(catalog.cameras.map((camera) => camera.id));

export default async function CamerasPage({ searchParams }: Props) {
  const query = await searchParams;
  const initialCameraId = cameraSelectionFromQuery(
    query.camera,
    publishedCameraIds,
  );
  return (
    <>
      <SiteHeader />
      <h1 className="sr-only">Câmeras públicas no Rio de Janeiro</h1>
      <CrimeAtlas
        showHeader={false}
        cameraDestination
        initialCameraId={initialCameraId}
      />
    </>
  );
}
