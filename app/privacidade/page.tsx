/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { PageShell } from '@/components/organic-ui';
import { PrivacyPreferencesButton } from '@/components/privacy-controls';

export const metadata: Metadata = { title: 'Política de Privacidade | Mapa da Criminalidade RJ', alternates: { canonical: '/privacidade' } };

export default function PrivacyPage() {
  return <PageShell crumbs={[{ label: 'Privacidade' }]}><article className="max-w-3xl rounded-2xl bg-white p-6 leading-7 sm:p-10">
    <h1 className="text-3xl font-semibold">Política de Privacidade</h1>
    <p className="mt-2 text-sm text-[#526078]">Mapa da Criminalidade RJ · Atualizada em 27 de setembro de 2026</p>
    <p className="mt-6">Esta política se aplica a mapa-criminalidade-rj.ricardoguia.com, projeto de Ricardo Guia. Ela explica o uso de dados pessoais durante a navegação e o contato com o projeto.</p>
    <h2 className="mt-8 text-xl font-semibold">Navegação e dados técnicos</h2>
    <p>A hospedagem pode processar endereço IP, data, URL e informações técnicas necessárias para entregar e proteger as páginas. A navegação pública não exige conta nem envio de dados pessoais. Se você entrar em contato por um canal disponibilizado, usaremos as informações enviadas para responder.</p>
    <h2 className="mt-8 text-xl font-semibold">Analytics e cookies</h2>
    <p>O Google Analytics 4 mede visitas e interações apenas após sua escolha de aceitar. A recusa não limita o uso do mapa. Você pode mudar sua escolha em <PrivacyPreferencesButton />. Ao abrir o site pela primeira vez, analytics permanece desligado até o aceite. O Google pode processar dados fora do Brasil; veja a <a className="underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">política de privacidade do Google</a>.</p>
    <h2 className="mt-8 text-xl font-semibold">Fontes e links externos</h2>
    <p>O site usa dados e serviços de terceiros para apresentar informações públicas. Ao abrir links externos, a política do destino se aplica.</p>
    <h2 className="mt-8 text-xl font-semibold">Contribuições públicas</h2>
    <p>O formulário de contribuições não pede conta, nome, email ou telefone. Envie apenas observações sobre câmeras, localização ou fontes públicas e não inclua dados pessoais no comentário. Para limitar abuso, o endereço IP é transformado com uma chave secreta em um identificador não reversível usado somente por uma janela de 15 minutos; o IP não é salvo na fila. Contribuições deixam de ser acessíveis em 90 dias, ou 90 dias depois da revisão, e são removidas fisicamente em lotes oportunistas. A consulta por protocolo mostra apenas o status, nunca o comentário ou a nota interna.</p>
    <h2 className="mt-8 text-xl font-semibold">Seus direitos e contato</h2>
    <p>Você pode pedir informações, acesso, correção ou exclusão de dados pessoais quando aplicável e retirar o aceite de analytics a qualquer momento. Para uma solicitação, contate Ricardo Guia pelo <a className="underline" href="https://www.linkedin.com/in/ricardoguia" target="_blank" rel="noreferrer">perfil público no LinkedIn</a>. Evite enviar dados sensíveis na primeira mensagem.</p>
  </article></PageShell>;
}
