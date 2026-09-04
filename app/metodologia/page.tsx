import { ArrowLeft, CheckCircle2, Database, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const checks = [
  'Download oficial precisa responder e manter tamanho mínimo esperado.',
  'Chave CISP + ano + mês não pode ter duplicidade.',
  'Contagens precisam ser inteiras, não negativas e sem nulos inesperados.',
  'As 41 CISPs do município precisam casar com os 41 polígonos atuais.',
  'O último mês publicado nunca pode retroceder silenciosamente.',
  'Hash, ETag, Last-Modified e horário da coleta ficam registrados.',
  'Indicadores agregados do ISP são preservados; não são recalculados.',
];

export default function Methodology() {
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b bg-background/95 px-4 py-3 md:px-7"><div className="mx-auto flex max-w-5xl items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" /> Voltar ao mapa</Link><Badge variant="outline"><Database /> Metodologia aberta</Badge></div></header>
    <article className="mx-auto max-w-5xl px-4 py-10 md:px-7 md:py-16">
      <Badge className="bg-primary/10 text-primary">Versão piloto · 03/09/2026</Badge>
      <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold tracking-[-0.04em] md:text-6xl">O que o mapa mede — e o que ele não pode prometer.</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">O Mapa Aberto RJ transforma uma série oficial mensal por circunscrição policial em comparações auditáveis. Ele não estima a probabilidade de uma pessoa sofrer um crime e não recomenda rotas.</p>

      <section className="mt-12 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-card p-6"><CheckCircle2 className="size-6 text-[#3d7180]" /><h2 className="mt-4 font-heading text-2xl font-bold">Leitura permitida</h2><p className="mt-2 leading-7 text-muted-foreground">Quantidade de registros comunicados à Polícia Civil na área de uma CISP e mudança entre dois períodos equivalentes de 12 meses.</p></div><div className="rounded-2xl border bg-card p-6"><ShieldAlert className="size-6 text-[#b86548]" /><h2 className="mt-4 font-heading text-2xl font-bold">Leitura proibida</h2><p className="mt-2 leading-7 text-muted-foreground">Rua segura, bairro perigoso, risco atual, probabilidade de assalto, previsão de crime ou garantia de segurança pessoal.</p></div></section>

      <section className="method-section"><h2>Fonte e cobertura</h2><p>A base principal é a série mensal por CISP do Instituto de Segurança Pública do Estado do Rio de Janeiro. No corte validado, ela contém 38.136 linhas, 65 colunas, 137 CISPs no estado e 41 no município do Rio, de janeiro de 2003 a julho de 2026.</p><div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold"><a className="source-link" href="https://www.ispdados.rj.gov.br/EstSeguranca.html">Dados abertos ISP-RJ</a><a className="source-link" href="https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv">CSV original</a><a className="source-link" href="https://www.ispdados.rj.gov.br/Conteudo.html">Divisões territoriais</a></div></section>

      <section className="method-section"><h2>Comparação</h2><p>Para cada categoria e CISP, somamos os 12 meses mais recentes e os mesmos 12 meses imediatamente anteriores. A variação percentual é <code>100 × (atual / anterior − 1)</code>. Quando as duas janelas somam menos de 20 registros ou a anterior é zero, o destaque percentual é suprimido como volume instável.</p><p className="mt-3">Casos e vítimas nunca são combinados. Não existe “score de segurança”, porque pesos entre delitos seriam uma escolha normativa sem denominador comum.</p></section>

      <section className="method-section"><h2>Geografia</h2><p>CISP é a circunscrição onde o fato foi registrado como ocorrido, não necessariamente a delegacia onde a pessoa fez o boletim. Uma CISP pode cobrir vários bairros ou partes deles. O mapa cruza os limites oficiais de CISP de 2026 com os limites municipais de bairro e mostra a relação territorial publicada pelo ISP. Os nomes ajudam a localizar a área, mas o total não pode ser dividido entre os bairros porque a série pública não entrega cada ocorrência geocodificada.</p><div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold"><a className="source-link" href="https://www.ispdados.rj.gov.br/Conteudo.html">Relação CISP e bairros</a><a className="source-link" href="https://services1.arcgis.com/OlP4dGNtIcnD3RYf/ArcGIS/rest/services/db_MI_Bairros/FeatureServer/0">Limites de bairros da Prefeitura</a></div></section>

      <section className="method-section"><h2>Atualização e contingência</h2><p>O site consulta o CSV oficial por uma rota própria e guarda o resultado em cache por seis horas. Quando a fonte não responde, a interface usa o último snapshot validado incluído na publicação e informa que está em contingência. A fonte é mensal, não em tempo real.</p><p className="mt-3">A fase 2 significa consolidado sem errata; a fase 3 indica que a rodada de erratas foi incorporada. Números antigos podem mudar por correção de duplicidade, título ou local.</p></section>

      <section className="method-section"><h2>Validações automáticas</h2><ul className="mt-5 grid gap-3 md:grid-cols-2">{checks.map((check) => <li key={check} className="flex gap-3 rounded-xl border bg-card p-4 text-sm leading-6"><CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />{check}</li>)}</ul></section>

      <section className="method-section"><h2>Limitações estruturais</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground"><li>Nem toda ocorrência é comunicada à polícia; a propensão ao registro varia.</li><li>O mês é o da comunicação do registro, que pode diferir da data do fato.</li><li>A base não entrega rua, horário, BO individual ou ponto exato.</li><li>A população oficial por CISP termina em 2022 e é uma estimativa territorial; taxas atuais permanecem desativadas.</li><li>População residente seria um denominador fraco em áreas turísticas, centrais e de transporte.</li></ul></section>
    </article>
  </main>;
}
