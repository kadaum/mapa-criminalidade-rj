import type { Metadata } from 'next';
import { CrimeAtlas } from '@/components/crime-atlas';
import { SiteHeader } from '@/components/site-header';
import { canonical } from '@/lib/organic-data';

export const metadata: Metadata = {
  title: 'Câmeras públicas no Rio | Mapa da Criminalidade RJ',
  description:
    'Consulte fontes públicas de câmeras por local, com estado histórico de verificação e acesso à origem.',
  alternates: { canonical: canonical('/cameras') },
};

export default function CamerasPage() {
  return (
    <>
      <SiteHeader />
      <h1 className="sr-only">Câmeras públicas no Rio de Janeiro</h1>
      <CrimeAtlas showHeader={false} cameraDestination />
    </>
  );
}
