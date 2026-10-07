import { ArrowLeft, CheckCircle2, Database, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { SiteHeader } from '@/components/site-header';
import { canonical, data, monthLabel, period, sourceUpdated } from '@/lib/organic-data';

export const metadata = { title: 'Metodologia | Mapa da Criminalidade RJ', alternates: { canonical: canonical('/metodologia') } };

const checks = [
  'Download oficial precisa responder e conter as 41 CISPs em cada mês da série.',
  'Chave CISP + ano + mês não pode ter duplicidade.',
  'Contagens precisam ser inteiras, não negativas e sem nulos inesperados.',
  'As 41 CISPs do município precisam casar com os 41 polígonos atuais.',
  'As 41 populações por CISP precisam somar exatamente 6.211.223 residentes.',
  'A série consultada precisa manter meses consecutivos; a data disponível fica visível.',
  'Hash, ETag, Last-Modified e horário da coleta ficam registrados.',
  'Indicadores agregados do ISP são preservados; não são recalculados.',
];

export default function Methodology() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <header className="border-b bg-background/95 px-4 py-3 md:px-7">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" /> Voltar ao mapa
          </Link>
          <Badge variant="outline">
            <Database /> Metodologia aberta
          </Badge>
        </div>
      </header>
      <article className="mx-auto max-w-5xl px-4 py-10 md:px-7 md:py-16">
        <Badge className="bg-primary/10 text-primary">
          Série validada · {monthLabel(period)}
        </Badge>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold tracking-[-0.04em] md:text-6xl">
          O que o mapa mede — e o que ele não pode prometer.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
          O Mapa da Criminalidade RJ transforma uma série oficial mensal por
          circunscrição policial em comparações auditáveis. Ele não estima a
          probabilidade de uma pessoa sofrer um crime e não recomenda rotas.
        </p>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <CheckCircle2 className="size-6 text-[#3d7180]" />
            <h2 className="mt-4 font-heading text-2xl font-bold">
              Leitura permitida
            </h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Quantidade de registros comunicados à Polícia Civil, taxa por 100
              mil residentes do Censo 2022 e mudança entre períodos mensais
              equivalentes.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <ShieldAlert className="size-6 text-[#b86548]" />
            <h2 className="mt-4 font-heading text-2xl font-bold">
              Leitura proibida
            </h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Rua segura, bairro perigoso, risco atual, probabilidade de
              assalto, previsão de crime ou garantia de segurança pessoal.
            </p>
          </div>
        </section>

        <section className="method-section">
          <h2>Fonte e cobertura</h2>
          <p>
            A base principal é a série mensal por CISP do Instituto de Segurança
            Pública do Estado do Rio de Janeiro. O snapshot recente validado
            contém {data.rows.length.toLocaleString('pt-BR')} linhas de CISP/mês,
            cobrindo as 41 CISPs do município do Rio entre {monthLabel(data.rows[0].period)}
            {' '}e {monthLabel(period)}. A série histórica consultável começa em janeiro de 2003.
            O arquivo oficial foi observado como modificado em {sourceUpdated}.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <a
              className="source-link"
              href="https://www.ispdados.rj.gov.br/EstSeguranca.html"
            >
              Dados abertos ISP-RJ
            </a>
            <a
              className="source-link"
              href="https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv"
            >
              CSV original
            </a>
            <a
              className="source-link"
              href="https://www.ispdados.rj.gov.br/Conteudo.html"
            >
              Divisões territoriais
            </a>
          </div>
        </section>

        <section className="method-section">
          <h2>Período e comparação</h2>
          <p>
            A fonte é mensal desde janeiro de 2003. A interface carrega os 36
            meses recentes e permite escolher janelas de 1, 3, 6 ou 12 meses,
            encerradas em um mês selecionado. Não há corte semanal nesta série.
            A variação percentual compara a janela escolhida com o período
            equivalente imediatamente anterior:{' '}
            <code>100 × (atual / anterior − 1)</code>. Quando as duas janelas
            somam menos de 20 registros ou a anterior é zero, o destaque
            percentual é suprimido quando a janela anterior tem menos de 20
            registros ou é zero.
          </p>
          <p className="mt-3">
            Casos e vítimas nunca são combinados. Não existe “score de
            segurança”, porque pesos entre delitos seriam uma escolha normativa
            sem denominador comum.
          </p>
        </section>

        <section className="method-section">
          <h2>População e taxa</h2>
          <p>
            A população não vem da antiga estimativa do ISP por CISP. Usamos o
            total definitivo do Censo 2022 por setor censitário, variável V0001.
            Cada um dos 13.782 setores do município foi atribuído à CISP de 2026
            com a maior área de interseção, e sua população foi somada uma única
            vez. O resultado cobre as 41 CISPs e reconcilia exatamente com os
            6.211.223 residentes do município; um setor sem interseção continha
            zero morador. O cálculo usa o SHP oficial completo da CISP; a
            geometria simplificada exibida no mapa não entra na atribuição.
          </p>
          <p className="mt-3">
            A taxa é{' '}
            <code>
              100.000 × registros no período / residentes no Censo 2022
            </code>
            . Ela corrige diferenças de população residente, mas não mede
            pessoas em circulação. Por isso pode superestimar exposição em áreas
            centrais, turísticas, comerciais ou de transporte e deve ser lida
            junto com a quantidade bruta.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <a
              className="source-link"
              href="https://www.ibge.gov.br/estatisticas/sociais/trabalho/22827-censo-demografico-2022.html?edicao=41852&t=resultados"
            >
              Censo 2022 por setores
            </a>
            <a
              className="source-link"
              href="https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/Agregados_por_setores_basico_BR_20260520.zip"
            >
              CSV atualizado do IBGE
            </a>
            <a
              className="source-link"
              href="https://www.ispdados.rj.gov.br/Arquivos/CISPshp.rar"
            >
              SHP completo das CISPs
            </a>
          </div>
        </section>

        <section className="method-section">
          <h2>O que significam os indicadores</h2>
          <p>
            Os botões de informação no mapa exibem definições curtas. O ISP
            contabiliza crimes contra o patrimônio, como roubos e furtos, em
            casos; indicadores contra a pessoa são apresentados em vítimas.
            Roubo de rua soma roubo a transeunte, de celular e em coletivo.
            Letalidade violenta soma homicídio doloso, morte por intervenção de
            agente do Estado, latrocínio e lesão corporal seguida de morte.
          </p>
          <p className="mt-3">
            A visão geral usa o campo oficial <code>registro_ocorrencias</code>,
            que conta registros de ocorrência válidos para as estatísticas. Ele
            não é um “total de crimes”: um registro pode conter mais de um
            título, também há fatos não criminais, e os indicadores detalhados
            se sobrepõem. Por isso o mapa agrupa, mas nunca soma, essas
            métricas.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <a
              className="source-link"
              href="https://www.ispdados.rj.gov.br/MetodologiaAgregacao.html"
            >
              Metodologia de agregação do ISP
            </a>
            <a
              className="source-link"
              href="https://www.ispdados.rj.gov.br/metodDivulDados.html"
            >
              Metodologia de contabilização
            </a>
          </div>
        </section>

        <section className="method-section">
          <h2>Geografia</h2>
          <p>
            CISP é a circunscrição onde o fato foi registrado como ocorrido, não
            necessariamente a delegacia onde a pessoa fez o boletim. Uma CISP
            pode cobrir vários bairros ou partes deles. O mapa cruza os limites
            oficiais de CISP de 2026 com os limites municipais de bairro e
            mostra a relação territorial publicada pelo ISP. Os nomes ajudam a
            localizar a área, mas o total não pode ser dividido entre os bairros
            porque a série pública não entrega cada ocorrência geocodificada.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <a
              className="source-link"
              href="https://www.ispdados.rj.gov.br/Conteudo.html"
            >
              Relação CISP e bairros
            </a>
            <a
              className="source-link"
              href="https://services1.arcgis.com/OlP4dGNtIcnD3RYf/ArcGIS/rest/services/db_MI_Bairros/FeatureServer/0"
            >
              Limites de bairros da Prefeitura
            </a>
          </div>
        </section>

        <section className="method-section">
          <h2>Atualização e contingência</h2>
          <p>
            As páginas e o mapa usam o mesmo snapshot validado incluído na
            publicação. O refresh consulta os arquivos oficiais, valida a
            cobertura e só muda o snapshot quando os insumos mudam. Se a fonte
            não responder, a versão anterior permanece publicada e sua data
            verdadeira continua visível. A fonte é mensal, não em tempo real.
          </p>
          <p className="mt-3">
            Os insights são recalculados a partir do snapshot publicado, sem
            redação manual ou modelo de IA. “Último mês disponível” acompanha
            uma nova publicação após validação; datas históricas permanecem
            fixas. A aba aberta não consulta continuamente a fonte.
          </p>
          <p className="mt-3">
            A fase 2 significa consolidado sem errata; a fase 3 indica que a
            rodada de erratas foi incorporada. Números antigos podem mudar por
            correção de duplicidade, título ou local.
          </p>
          <p className="mt-3">
            A população é uma fotografia fixa do Censo 2022. Ela só deve ser
            recalculada quando o IBGE revisar o insumo ou quando o ISP mudar os
            limites oficiais das CISPs; não existe atualização populacional
            mensal por CISP com a mesma qualidade.
          </p>
        </section>

        <section className="method-section">
          <h2>Validações automáticas</h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {checks.map((check) => (
              <li
                key={check}
                className="flex gap-3 rounded-xl border bg-card p-4 text-sm leading-6"
              >
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
                {check}
              </li>
            ))}
          </ul>
        </section>

        <section className="method-section">
          <h2>Limitações estruturais</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              Nem toda ocorrência é comunicada à polícia; a propensão ao
              registro varia.
            </li>
            <li>
              O mês é o da comunicação do registro, que pode diferir da data do
              fato.
            </li>
            <li>
              A base não entrega rua, horário, BO individual ou ponto exato.
            </li>
            <li>
              A população é a fotografia do Censo 2022 aplicada aos limites CISP
              de 2026; não é uma estimativa populacional atual.
            </li>
            <li>
              População residente é um denominador fraco em áreas turísticas,
              centrais, comerciais e de transporte.
            </li>
          </ul>
        </section>
      </article>
    </main>
  );
}
