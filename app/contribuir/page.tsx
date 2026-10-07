import type { Metadata } from 'next';
import { PageShell } from '@/components/organic-ui';
import { ContributionForm } from './contribution-form';

export const metadata: Metadata = {
  title: 'Contribuir | Mapa da Criminalidade RJ',
  robots: { index: false, follow: false },
};

export default function ContributePage() {
  return (
    <PageShell crumbs={[{ label: 'Contribuir' }]}>
      <main className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">
          Ajude a corrigir as referências públicas
        </h1>
        <p className="mt-3 leading-7 text-[#36465d]">
          Avise sobre uma câmera que não funciona, uma localização que precisa
          de correção ou uma fonte pública que merece avaliação. Não é preciso
          criar conta nem informar contato.
        </p>
        <ContributionForm />
        <p className="mt-5 text-sm leading-6 text-[#526078]">
          Toda contribuição começa como pendente. A equipe pode aceitar a
          sugestão para análise, mas isso não altera nem publica o catálogo
          automaticamente.
        </p>
      </main>
    </PageShell>
  );
}
