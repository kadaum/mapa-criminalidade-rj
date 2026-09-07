'use client';
import { useEffect, useState } from 'react';
import { SiteHeader } from './site-header';
import { ExploreNavigation } from './explore-navigation';

type Values = Record<string, number | null>;
type Population = { value: number; kind: string; source: string };
type History = {
  firstPeriod: string;
  latestPeriod: string;
  indicators: { id: string; label: string; unit: string; definition: string }[];
  months: {
    period: string;
    origin: string;
    cispCount: number;
    values: Values;
  }[];
  years: {
    year: number;
    months: number;
    complete: boolean;
    population: Population | null;
    values: Values;
    rates: Values;
  }[];
  sources: Record<string, { url: string }>;
  methodology: string[];
};
const fmt = (n: number | null, decimals = 0) =>
  n === null
    ? 'Indisponível'
    : n.toLocaleString('pt-BR', { maximumFractionDigits: decimals });
export function CrimeHistory() {
  const [data, setData] = useState<History | null>(null),
    [failed, setFailed] = useState(false);
  const [indicator, setIndicator] = useState('letalidade_violenta'),
    [measure, setMeasure] = useState('rate');
  const [start, setStart] = useState('2003'),
    [end, setEnd] = useState(''),
    [monthly, setMonthly] = useState(false);
  useEffect(() => {
    fetch('/data/crime-rio-history.json')
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => setData(d as History))
      .catch(() => setFailed(true));
  }, []);
  const last = data?.years.at(-1)?.year.toString() ?? '';
  const selected = data?.indicators.find((i) => i.id === indicator);
  const years =
    data?.years.filter(
      (y) => y.year >= Number(start) && y.year <= Number(end || last),
    ) ?? [];
  // Partial years never enter the annual chart or annual comparisons.
  const chart = years
    .filter((y) => y.complete)
    .map((y) => ({
      label: String(y.year),
      value: measure === 'rate' ? y.rates[indicator] : y.values[indicator],
    }));
  const max = Math.max(1, ...chart.map((r) => r.value ?? 0));
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#172235]">
      <SiteHeader date={data?.latestPeriod} />
      <ExploreNavigation active="/historico" />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#526b99]">
            Município do Rio de Janeiro
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            Como os registros mudaram desde 2003?
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-slate-600">
            Explore toda a série disponível. As taxas usam a população do
            próprio ano; os dados mostram o que foi registrado pela polícia.
          </p>
        </div>
        {!data ? (
          <output>
            {failed
              ? 'Não foi possível carregar o histórico. Tente recarregar a página.'
              : 'Carregando histórico…'}
          </output>
        ) : (
          <>
            <div className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-semibold">
                Indicador
                <select
                  value={indicator}
                  onChange={(e) => setIndicator(e.target.value)}
                  className="mt-2 w-full rounded-lg border p-3"
                >
                  {data.indicators.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Medida
                <select
                  value={measure}
                  onChange={(e) => setMeasure(e.target.value)}
                  className="mt-2 w-full rounded-lg border p-3"
                >
                  <option value="rate">Por 100 mil moradores</option>
                  <option value="count">Quantidade registrada</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Ano inicial
                <select
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    if (Number(e.target.value) > Number(end || last))
                      setEnd(e.target.value);
                  }}
                  className="mt-2 w-full rounded-lg border p-3"
                >
                  {data.years.map((y) => (
                    <option key={y.year}>{y.year}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Ano final
                <select
                  value={end || last}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-2 w-full rounded-lg border p-3"
                >
                  {data.years
                    .filter((y) => y.year >= Number(start))
                    .map((y) => (
                      <option key={y.year}>{y.year}</option>
                    ))}
                </select>
              </label>
            </div>
            <section
              className="rounded-2xl border bg-white p-5 md:p-7"
              aria-label="Evolução anual"
            >
              <h2 className="text-xl font-bold">
                {selected?.label} ·{' '}
                {measure === 'rate'
                  ? 'taxa anual por 100 mil moradores'
                  : 'quantidade anual'}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {selected?.definition} Apenas anos completos no gráfico. Lacunas
                não significam zero.
              </p>
              <div className="mt-6 space-y-2">
                {chart.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[3rem_1fr_6rem] items-center gap-3 text-sm"
                  >
                    <span>{row.label}</span>
                    <div className="h-5 rounded bg-slate-100">
                      {row.value !== null && (
                        <div
                          className="h-full rounded bg-[#3265b3]"
                          style={{ width: `${(row.value / max) * 100}%` }}
                        />
                      )}
                    </div>
                    <span className="text-right tabular-nums">
                      {fmt(row.value, measure === 'rate' ? 1 : 0)}
                    </span>
                  </div>
                ))}
                {!chart.length && <p>Nenhum ano completo neste intervalo.</p>}
              </div>
            </section>
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="text-xl font-bold">Valores e população usados</h2>
              <p className="mt-2 text-sm text-slate-600">
                Um ano parcial não deve ser comparado a um ano completo.
                Estimativas populacionais e censos podem produzir mudanças no
                denominador, além das mudanças nos registros.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Valores anuais e denominadores
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Ano',
                        'Cobertura',
                        'Quantidade',
                        'População do ano',
                        'Por 100 mil',
                      ].map((h) => (
                        <th key={h} className="p-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {years.map((y) => (
                      <tr key={y.year} className="border-t">
                        <th className="p-3">{y.year}</th>
                        <td className="p-3">
                          {y.complete
                            ? '12 meses'
                            : `${y.months} meses · parcial`}
                        </td>
                        <td className="p-3">{fmt(y.values[indicator])}</td>
                        <td className="p-3">
                          {y.population ? (
                            <>
                              {fmt(y.population.value)}
                              <small className="block text-slate-500">
                                {y.population.kind}
                              </small>
                            </>
                          ) : (
                            'Não disponível na fonte'
                          )}
                        </td>
                        <td className="p-3">{fmt(y.rates[indicator], 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="rounded-2xl border bg-white p-5">
              <button
                onClick={() => setMonthly(!monthly)}
                aria-expanded={monthly}
                className="text-lg font-bold underline underline-offset-4"
              >
                {monthly ? 'Ocultar' : 'Ver'} registros mês a mês
              </button>
              <p className="mt-2 text-sm text-slate-600">
                Quantidades mensais, sem anualizar taxas. Compare o mesmo mês
                entre anos para reduzir o efeito da sazonalidade.
              </p>
              {monthly && (
                <div className="mt-4 max-h-[32rem] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="p-3">Mês</th>
                        <th className="p-3">Quantidade</th>
                        <th className="p-3">Origem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.months
                        .filter(
                          (m) =>
                            Number(m.period.slice(0, 4)) >= Number(start) &&
                            Number(m.period.slice(0, 4)) <= Number(end || last),
                        )
                        .map((m) => (
                          <tr className="border-t" key={m.period}>
                            <th className="p-3">{m.period}</th>
                            <td className="p-3">{fmt(m.values[indicator])}</td>
                            <td className="p-3">
                              {m.origin === 'municipality'
                                ? 'Base municipal ISP'
                                : `Soma de ${m.cispCount} áreas da fonte`}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section className="space-y-3 text-sm leading-relaxed text-slate-600">
              <h2 className="text-xl font-bold text-[#172235]">
                Fontes e como comparar
              </h2>
              {data.methodology.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p>
                Não aplicamos os limites atuais das delegacias ao mapa
                histórico: o número e a composição das áreas mudaram. A série
                agregada antes de 2014 é uma reconstrução pela identificação
                municipal da fonte, não uma reconstituição de fronteiras
                históricas.
              </p>
              <div className="flex flex-wrap gap-4">
                {Object.entries(data.sources).map(([key, s]) => (
                  <a
                    className="underline"
                    key={key}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {
                      (
                        {
                          cisp: 'ISP · série por delegacia',
                          municipality: 'ISP · série municipal',
                          estimates: 'IBGE · estimativas anuais',
                          census2010: 'IBGE · Censo 2010',
                          census2022: 'IBGE · Censo 2022',
                        } as Record<string, string>
                      )[key]
                    }
                  </a>
                ))}
                <a
                  className="underline"
                  href="/data/crime-rio-history-cisp.csv"
                  download
                >
                  Baixar histórico por delegacia (CSV)
                </a>
                <a
                  className="underline"
                  href="/data/crime-rio-history.json"
                  download
                >
                  Baixar histórico e fontes (JSON)
                </a>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
