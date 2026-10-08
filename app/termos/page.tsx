/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { PageShell } from '@/components/organic-ui';

export const metadata: Metadata = { title: 'Termos de Uso | Mapa da Criminalidade RJ', alternates: { canonical: '/termos' } };

export default function TermsPage() {
  return <PageShell crumbs={[{ label: 'Termos de uso' }]}><article className="max-w-3xl rounded-2xl bg-white p-6 leading-7 sm:p-10">
    <h1 className="text-3xl font-semibold">Termos de Uso</h1>
    <p className="mt-2 text-sm text-[#526078]">Mapa da Criminalidade RJ · Atualizados em 27 de setembro de 2026</p>
    <p className="mt-6">Estes termos tratam do uso de mapa-criminalidade-rj.ricardoguia.com. O acesso ao site é gratuito.</p>
    <h2 className="mt-8 text-xl font-semibold">Informações e fontes</h2>
    <p>O conteúdo é informativo e pode conter limites, atrasos ou erros na fonte. Consulte a <a className="underline" href="/metodologia">metodologia</a> e confirme informações importantes na fonte original antes de tomar decisões.</p>
    <h2 className="mt-8 text-xl font-semibold">Uso e reutilização</h2>
    <p>Você pode consultar e compartilhar links do site. Não prejudique a disponibilidade do serviço nem apresente este projeto independente como órgão ou certificação oficial. Dados, mapas, marcas e conteúdo de terceiros podem ter licenças próprias; consulte cada fonte antes de reutilizá-los.</p>
    <h2 className="mt-8 text-xl font-semibold">Atualizações e contato</h2>
    <p>Dados e recursos podem ser corrigidos, atualizados ou interrompidos. Mudanças relevantes nestes termos terão a data atualizada. Para apontar um erro, use o <a className="underline" href="https://www.linkedin.com/in/ricardoguia" target="_blank" rel="noreferrer">perfil público de Ricardo Guia no LinkedIn</a>. O tratamento de dados pessoais está na <a className="underline" href="/privacidade">Política de Privacidade</a>.</p>
  </article></PageShell>;
}
