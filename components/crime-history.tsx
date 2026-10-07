'use client';
import { useEffect, useState } from 'react';
import { SiteHeader } from './site-header';
import { ExploreNavigation } from './explore-navigation';
import { PeriodPicker } from './period-picker';
import {
  comparisonRange,
  monthCount,
  validMonth,
  type Comparison,
} from '@/lib/period-range';
import { parseCispHistory, type CispHistoryMonth } from '@/lib/cisp-history';

type Values = Record<string, number | null>;
type Population = { value: number; kind: string; source: string };
type Territory = {
  cisp: number;
  territorialUnit: string;
  neighborhoods: string[];
};
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
  const [cisp, setCisp] = useState(0),
    [territory, setTerritory] = useState<Territory | null>(null),
    [cispMonths, setCispMonths] = useState<CispHistoryMonth[]>([]);
  const [indicator, setIndicator] = useState('letalidade_violenta'),
    [measure, setMeasure] = useState('rate');
  const [start, setStart] = useState('2003-01'),
    [end, setEnd] = useState(''),
    [monthly, setMonthly] = useState(false);
  const [comparison, setComparison] = useState<Comparison>('none');
  useEffect(() => {
    Promise.all([
      fetch('/data/crime-rio-history.json'),
      fetch('/data/crime-rio-history-cisp.csv'),
      fetch('/data/cisp-neighborhoods.json'),
    ])
      .then(async ([historyResponse, cispResponse, territoryResponse]) => {
        if (!historyResponse.ok || !cispResponse.ok || !territoryResponse.ok)
          throw Error();
        const d = (await historyResponse.json()) as History;
        const csv = await cispResponse.text();
        const territoryData = (await territoryResponse.json()) as {
          records: Territory[];
        };
        const params = new URLSearchParams(window.location.search);
        const requestedCisp = Number(params.get('cisp'));
        const requestedTerritory =
          Number.isInteger(requestedCisp) && requestedCisp > 0
            ? (territoryData.records.find(
                (item) => item.cisp === requestedCisp,
              ) ?? null)
            : null;
        const regionalMonths = requestedTerritory
          ? parseCispHistory(
              csv,
              requestedCisp,
              d.indicators.map((item) => item.id),
            )
          : [];
        const first = regionalMonths[0]?.period ?? d.firstPeriod;
        const latest = regionalMonths.at(-1)?.period ?? d.latestPeriod;
        if (requestedTerritory && regionalMonths.length) {
          setCisp(requestedCisp);
          setTerritory(requestedTerritory);
          setCispMonths(regionalMonths);
          setMeasure('count');
          setStart(first);
        }
        if (d.indicators.some((i) => i.id === params.get('indicador')))
          setIndicator(params.get('indicador')!);
        const a = params.get('inicio'),
          b = params.get('fim');
        if (
          a &&
          b &&
          validMonth(a) &&
          validMonth(b) &&
          a >= first &&
          b <= latest &&
          a <= b
        ) {
          setStart(a);
          setEnd(b);
        }
        const c = params.get('comparacao');
        if (c === 'year' || c === 'previous') setComparison(c);
        setData(d);
      })
      .catch(() => setFailed(true));
  }, []);
  const activeMonths = cisp ? cispMonths : (data?.months ?? []);
  const first = activeMonths[0]?.period ?? data?.firstPeriod ?? '2003-01';
  const last = activeMonths.at(-1)?.period ?? data?.latestPeriod ?? '';
  useEffect(() => {
    if (!data) return;
    const url = new URL(window.location.href);
    url.searchParams.set('inicio', start);
    url.searchParams.set('fim', end || last);
    url.searchParams.set('indicador', indicator);
    url.searchParams.set('comparacao', comparison);
    if (cisp) url.searchParams.set('cisp', String(cisp));
    else url.searchParams.delete('cisp');
    window.history.replaceState(null, '', url);
  }, [data, start, end, last, indicator, comparison, cisp]);
  const selected = data?.indicators.find((i) => i.id === indicator);
  const years = data
    ? [
        ...new Set(
          activeMonths.map((month) => Number(month.period.slice(0, 4))),
        ),
      ]
        .filter(
          (year) =>
            year >= Number(start.slice(0, 4)) &&
            year <= Number((end || last).slice(0, 4)),
        )
        .map((year) => {
          const sourceYear = data.years.find((item) => item.year === year);
          const rows = activeMonths.filter(
            (m) =>
              m.period.startsWith(String(year)) &&
              m.period >= start &&
              m.period <= (end || last),
          );
          const values = Object.fromEntries(
            data.indicators.map((i) => [
              i.id,
              rows.every((m) => m.values[i.id] != null)
                ? rows.reduce((sum, m) => sum + m.values[i.id]!, 0)
                : null,
            ]),
          );
          const complete = rows.length === 12;
          return {
            year,
            months: rows.length,
            complete,
            population: cisp ? null : (sourceYear?.population ?? null),
            values,
            rates: Object.fromEntries(
              data.indicators.map((i) => [
                i.id,
                !cisp && complete ? (sourceYear?.rates[i.id] ?? null) : null,
              ]),
            ),
          };
        })
    : [];
  const selectedMonths = activeMonths.filter(
    (m) => m.period >= start && m.period <= (end || last),
  );
  const baseline = last
    ? comparisonRange(start, end || last, comparison)
    : null;
  const baselineMonths = baseline
    ? activeMonths.filter(
        (m) => m.period >= baseline.start && m.period <= baseline.end,
      )
    : [];
  const total = (rows: { values: Values }[]) =>
    rows.length && rows.every((m) => m.values[indicator] != null)
      ? rows.reduce((sum, m) => sum + m.values[indicator]!, 0)
      : null;
  const currentTotal = total(selectedMonths);
  const priorTotal =
    baseline &&
    baselineMonths.length === monthCount(baseline.start, baseline.end)
      ? total(baselineMonths)
      : null;
  const change =
    currentTotal != null && priorTotal != null && priorTotal > 0
      ? (currentTotal / priorTotal - 1) * 100
      : null;
  // Partial years never enter the annual chart or annual comparisons.
  const chart = years
    .filter((y) => y.complete)
    .map((y) => ({
      label: String(y.year),
      value:
        measure === 'rate' && !cisp ? y.rates[indicator] : y.values[indicator],
    }));
  const max = Math.max(1, ...chart.map((r) => r.value ?? 0));
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#172235]">
      <SiteHeader date={data?.latestPeriod} />
      <ExploreNavigation
        active="/historico"
        query={`?${new URLSearchParams({ indicador: indicator, ...(cisp ? { cisp: String(cisp) } : {}) })}`}
      />
      <main id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-6xl space-y-6 px-4 py-8 outline-none md:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#526b99]">
            {cisp
              ? `Região policial CISP ${cisp}`
              : 'Município do Rio de Janeiro'}
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            {cisp
              ? 'Como os registros desta região mudaram desde 2003?'
              : 'Como os registros mudaram desde 2003?'}
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-slate-600">
            {cisp
              ? `${territory?.territorialUnit}. A série acompanha o identificador da CISP; seus limites e bairros atendidos mudaram ao longo do tempo.`
              : 'Explore toda a série disponível. As taxas usam a população do próprio ano; os dados mostram o que foi registrado pela polícia.'}
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
                  disabled={Boolean(cisp)}
                  className="mt-2 w-full rounded-lg border p-3"
                >
                  {!cisp && <option value="rate">Por 100 mil moradores</option>}
                  <option value="count">Quantidade registrada</option>
                </select>
                {cisp > 0 && (
                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    Não aplicamos a população atual a anos com limites
                    diferentes.
                  </span>
                )}
              </label>
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-semibold">
                  Período e comparação
                </p>
                <PeriodPicker
                  min={first}
                  max={last}
                  start={start}
                  end={end || last}
                  comparison={comparison}
                  onApply={(a, b, c) => {
                    setStart(a);
                    setEnd(b);
                    setComparison(c);
                    setMonthly(true);
                  }}
                />
              </div>
            </div>
            <section
              className="rounded-2xl border bg-white p-5"
              aria-label="Resultado do período"
            >
              <p className="text-sm text-slate-600">
                {selected?.label} · {start} a {end || last} ·{' '}
                {selectedMonths.length} meses
              </p>
              <p className="mt-2 text-3xl font-bold">
                {fmt(currentTotal)}{' '}
                <span className="text-base font-normal">{selected?.unit}</span>
              </p>
              {baseline && (
                <p className="mt-3 text-sm">
                  Comparação com {baseline.start} a {baseline.end}:{' '}
                  {fmt(priorTotal)}.{' '}
                  {change != null
                    ? `${change > 0 ? '+' : ''}${fmt(change, 1)}%`
                    : 'Variação indisponível.'}
                </p>
              )}
              <p className="mt-2 text-sm text-slate-500">
                {cisp
                  ? 'Totais registrados para este identificador de CISP no intervalo selecionado.'
                  : 'Totais registrados no intervalo selecionado. As taxas por 100 mil aparecem por ano completo abaixo.'}
              </p>
            </section>
            <section
              className="rounded-2xl border bg-white p-5 md:p-7"
              aria-label="Evolução anual"
            >
              <h2 className="text-xl font-bold">
                {selected?.label} ·{' '}
                {measure === 'rate' && !cisp
                  ? 'taxa anual por 100 mil moradores'
                  : 'quantidade anual'}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {selected?.definition} Apenas anos completos no gráfico. Lacunas
                não significam zero.
                {cisp
                  ? ' Mudanças de patamar também podem refletir alterações territoriais da CISP.'
                  : ''}
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
              <h2 className="text-xl font-bold">
                {cisp
                  ? 'Valores anuais registrados'
                  : 'Valores e população usados'}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {cisp
                  ? 'Um ano parcial não deve ser comparado a um ano completo. A composição territorial da região policial pode mudar entre os anos.'
                  : 'Um ano parcial não deve ser comparado a um ano completo. Estimativas populacionais e censos podem produzir mudanças no denominador, além das mudanças nos registros.'}
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Valores anuais e denominadores
                  </caption>
                  <thead>
                    <tr>
                      {(cisp
                        ? ['Ano', 'Cobertura', 'Quantidade']
                        : [
                            'Ano',
                            'Cobertura',
                            'Quantidade',
                            'População do ano',
                            'Por 100 mil',
                          ]
                      ).map((h) => (
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
                        {!cisp && (
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
                        )}
                        {!cisp && (
                          <td className="p-3">{fmt(y.rates[indicator], 1)}</td>
                        )}
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
                      {activeMonths
                        .filter(
                          (m) => m.period >= start && m.period <= (end || last),
                        )
                        .map((m) => (
                          <tr className="border-t" key={m.period}>
                            <th className="p-3">{m.period}</th>
                            <td className="p-3">{fmt(m.values[indicator])}</td>
                            <td className="p-3">
                              {m.origin === 'municipality'
                                ? 'Base municipal ISP'
                                : m.origin === 'cisp'
                                  ? `CISP ${cisp}`
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
              {cisp ? (
                <>
                  <p>
                    Fonte: série histórica mensal do ISP-RJ por área de
                    delegacia. Os números mostram somente registros comunicados
                    à polícia.
                  </p>
                  <p>
                    Meses sem valor são tratados como lacunas, nunca como zero.
                    Anos incompletos ficam fora do gráfico anual.
                  </p>
                </>
              ) : (
                data.methodology.map((p) => <p key={p}>{p}</p>)
              )}
              <p>
                {cisp
                  ? `Esta é a série do identificador CISP ${cisp}, não uma reconstrução histórica do bairro. A delegacia, seus limites e os bairros atendidos podem ter mudado; por isso mostramos quantidades, sem reaplicar a população atual aos anos anteriores.`
                  : 'Não aplicamos os limites atuais das delegacias ao mapa histórico: o número e a composição das áreas mudaram. A série agregada antes de 2014 é uma reconstrução pela identificação municipal da fonte, não uma reconstituição de fronteiras históricas.'}
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
