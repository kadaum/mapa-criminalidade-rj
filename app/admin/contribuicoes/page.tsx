import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { PageShell } from '@/components/organic-ui';
import { isModerator } from '@/lib/contribution-core';
import { AdminQueue } from './admin-queue';

/* oxlint-disable next/no-html-link-for-pages -- SIWC requires a top-level, non-prefetched anchor. */

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Moderação de contribuições',
  robots: { index: false, follow: false },
};

export default async function ContributionsAdminPage() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get('oai-authenticated-user-id');
  const configured = Boolean(env.MODERATOR_USER_IDS);
  const allowed = isModerator(userId, env.MODERATOR_USER_IDS);
  return (
    <PageShell
      crumbs={[{ label: 'Administração' }, { label: 'Contribuições' }]}
    >
      <main className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold">Fila de contribuições</h1>
        {!userId && (
          <div className="mt-6 rounded-2xl bg-white p-6">
            <p>Entre com ChatGPT para acessar a moderação.</p>
            <a
              className="mt-4 inline-block rounded-full bg-[#163b65] px-5 py-3 font-semibold text-white"
              href="/signin-with-chatgpt?return_to=%2Fadmin%2Fcontribuicoes"
              target="_top"
            >
              Entrar com ChatGPT
            </a>
          </div>
        )}
        {userId && !configured && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-6">
            <p className="font-semibold">Moderação ainda não configurada.</p>
            <p className="mt-2">
              Sua identidade neste site:{' '}
              <code className="break-all">{userId}</code>. Configure esse ID
              no segredo <code>MODERATOR_USER_IDS</code>. Nenhum primeiro
              usuário é autorizado automaticamente.
            </p>
          </div>
        )}
        {userId && configured && !allowed && (
          <p className="mt-6 rounded-2xl bg-white p-6">
            Esta identidade não faz parte da lista de moderadores.
          </p>
        )}
        {allowed && (
          <>
            <p className="mt-3 text-[#526078]">
              Aceitar mantém a sugestão em revisão editorial; nenhuma ação aqui
              altera o catálogo automaticamente.
            </p>
            <AdminQueue />
          </>
        )}
      </main>
    </PageShell>
  );
}
