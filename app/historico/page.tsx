import { CrimeHistory } from '@/components/crime-history';
export const metadata = {
  title: 'Histórico desde 2003 | Mapa da Criminalidade RJ',
  robots: { index: false, follow: true },
};
export default function Page() {
  return <CrimeHistory />;
}
