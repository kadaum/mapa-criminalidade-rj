import { PageShell } from '@/components/organic-ui';
import { StatusLookup } from './status-lookup';

export default async function ContributionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ protocolo?: string; protocol?: string }>;
}) {
  const params = await searchParams;
  return (
    <PageShell
      crumbs={[
        { label: 'Contribuir', path: '/contribuir' },
        { label: 'Andamento' },
      ]}
    >
      <main className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold">Consultar contribuição</h1>
        <p className="mt-3 text-[#526078]">
          A consulta mostra somente o estado da revisão. O comentário e a nota
          interna nunca aparecem aqui.
        </p>
        <StatusLookup initial={params.protocolo ?? params.protocol ?? ''} />
      </main>
    </PageShell>
  );
}
