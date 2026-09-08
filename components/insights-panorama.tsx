/* oxlint-disable next/no-html-link-for-pages */
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { contextInsights } from '@/lib/context-insights';
import { cityMetric, regionMetrics, type CrimeRow } from '@/lib/crime-analysis';

export function InsightsPanorama({
  rows,
  populations,
  territories,
  indicators,
  end,
  months,
  range,
  prior,
  followLatest,
  comparison = 'previous',
}: {
  rows: CrimeRow[];
  populations: { cisp: number; population: number }[];
  territories: { cisp: number; territorialUnit: string }[];
  indicators: { id: string; label: string; unit: string }[];
  end: string;
  months: number;
  range: string;
  prior: string;
  followLatest: boolean;
  comparison?: 'previous' | 'year' | 'none';
}) {
  const insights = contextInsights(rows, populations, end, months, comparison);
  const fmt = (n: number | null, digits = 0) =>
    n === null
      ? 'Indisponível'
      : n.toLocaleString('pt-BR', { maximumFractionDigits: digits });
  return (
    <section aria-label="Panorama de insights">
      <div className="mb-8 grid divide-y divide-[#dce2ed] border-y border-[#dce2ed] md:grid-cols-3 md:divide-x md:divide-y-0">
        {['total_roubos', 'total_furtos', 'letalidade_violenta'].map((id) => {
          const m = cityMetric(
            regionMetrics(rows, populations, id, end, months, comparison),
          );
          const meta = indicators.find((i) => i.id === id);
          return (
            <div key={id} className="px-5 py-6">
              <p className="text-base font-semibold">{meta?.label} no Rio</p>
              <p className="mt-1 text-sm leading-6 text-[#526078]">
                {id === 'total_roubos'
                  ? 'Subtração com violência ou grave ameaça.'
                  : id === 'total_furtos'
                    ? 'Subtração sem violência ou grave ameaça.'
                    : 'Homicídios dolosos, latrocínios, lesões seguidas de morte e mortes por intervenção de agente do Estado.'}
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
                {fmt(m.count)}{' '}
                <span className="text-sm font-normal text-[#526078]">
                  {meta?.unit}
                </span>
              </p>
              <p className="mt-2 text-sm font-medium text-[#526078]">
                Período: {range}
              </p>
              <p className="mt-3 text-sm text-[#526078]">
                Referência ({prior}): {fmt(m.previous)} {meta?.unit}.
              </p>
              <p className="mt-2 text-sm font-semibold text-[#324c86]">
                {m.change === null
                  ? 'Sem dados suficientes para comparar esses períodos.'
                  : m.change === 0
                    ? `Sem mudança em relação a ${prior}.`
                    : `${fmt(Math.abs(m.change), 1)}% ${m.change > 0 ? 'a mais' : 'a menos'} em relação a ${prior}.`}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mb-6 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight">
          Um indicador não conta a história inteira
        </h2>
        <p className="mt-2 text-base leading-7 text-[#526078]">
          {range}, comparado a {prior}. Os cartões cruzam tipos de ocorrência e
          a média do Rio para mostrar diferenças que um ranking único esconde.
          Não são um ranking de segurança.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {insights.map((x, index) => (
          <article
            key={x.key}
            className={`border p-6 md:p-8 ${index === 0 ? 'border-[#2455dc]/30 bg-[#eef3ff]' : 'border-[#dce2ed] bg-white'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-semibold text-[#2455dc]">
                {indicators.find((i) => i.id === x.indicator)?.label}
                {x.kind === 'contrast' ? ' + letalidade violenta' : ''}
              </p>
              <ArrowUpRight className="size-5 shrink-0 text-[#2455dc]" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight">
              {x.title}
            </h3>
            <p className="mt-3 text-base font-medium">
              {territories.find((t) => t.cisp === x.cisp)?.territorialUnit}{' '}
              <span className="text-sm font-normal text-[#526078]">
                · CISP {x.cisp}
              </span>
            </p>
            <p className="mt-2 text-sm text-[#526078]">
              {range}
              {['divergence', 'component'].includes(x.kind)
                ? ` versus ${prior}`
                : ''}
            </p>
            <ul className="mt-6 space-y-3 border-t border-[#dce2ed] pt-5 text-base leading-7">
              {x.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <details className="mt-5 text-sm leading-6 text-[#526078]">
              <summary className="cursor-pointer font-semibold">
                Como interpretar
              </summary>
              <p className="mt-2">{x.caveat}</p>
            </details>
            {x.kind === 'contrast' && (
              <p className="mt-3 text-sm leading-6 text-[#526078]">
                Taxa por morador, não risco individual. Visitantes não entram no
                denominador.
              </p>
            )}
            <a
              href={`/${x.kind === 'concentration' ? 'meu-bairro' : 'comparar'}?cisp=${x.cisp}&indicador=${x.indicator}&meses=${months}&fim=${followLatest ? 'latest' : end}&comparacao=${comparison}&visualizacao=${x.kind === 'contrast' ? 'taxa' : 'quantidade'}`}
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#2455dc]"
            >
              {x.kind === 'concentration'
                ? 'Conferir evolução mensal'
                : 'Conferir a comparação'}{' '}
              <ArrowRight className="size-4" />
            </a>
          </article>
        ))}
      </div>
      {!insights.length && (
        <p className="rounded-xl bg-white p-6">
          Nenhum contraste atende aos critérios neste recorte. Isso não
          significa ausência de ocorrências.
        </p>
      )}
      <details className="mt-8 border-t pt-5 text-sm leading-7 text-[#526078]">
        <summary className="cursor-pointer font-semibold">
          Como os destaques são escolhidos e atualizados
        </summary>
        <p className="mt-3">
          Recalculados ao carregar os dados do ISP-RJ. Mostramos até dois
          exemplos por regra: contraste entre taxas de furto e letalidade;
          mudança regional em sentido oposto ao Rio; contribuição do furto de
          celular ao aumento de furtos; e concentração de pelo menos metade da
          letalidade em um mês. As duas primeiras regras têm mínimos de
          população ou volume para reduzir resultados frágeis. A ordem é
          determinística e não mede gravidade.
        </p>
        <p>
          As taxas usam população derivada do Censo 2022 e as regiões completas
          das CISPs. Fatos não comunicados à polícia não estão representados; a
          fonte pode revisar números.
        </p>
        <a
          className="underline"
          href="https://www.ispdados.rj.gov.br/EstSeguranca.html"
          target="_blank"
          rel="noreferrer"
        >
          Fonte oficial ISP-RJ
        </a>
      </details>
    </section>
  );
}
