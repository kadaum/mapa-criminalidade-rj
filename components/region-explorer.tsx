'use client';
/* oxlint-disable next/no-html-link-for-pages, react/react-compiler, jsx-a11y/prefer-tag-over-role */
import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, MapPin, Share2, TrendingUp } from 'lucide-react';
import { SiteHeader } from './site-header';
import { ExploreNavigation } from './explore-navigation';
import { PeriodPicker } from './period-picker';
import { monthCount, comparisonRange, type Comparison } from '@/lib/period-range';
import { InsightsPanorama } from './insights-panorama';
import { indicatorGroups } from '@/lib/indicator-groups';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  cityMetric,
  factualInsights,
  historicalInsights,
  monthShift,
  neighborhoodIndex,
  normalizeName,
  rankMetrics,
  regionMetrics,
  windowPeriods,
  type CrimeRow,
} from '@/lib/crime-analysis';
type Mode = 'meu-bairro' | 'comparar' | 'rankings' | 'insights';
type Indicator = {
  id: string;
  label: string;
  unit: string;
  definition: string;
};
type Data = {
  live?: boolean;
  latestPeriod: string;
  generatedAt: string;
  rows: CrimeRow[];
  indicators: Indicator[];
};
type Territory = {
  cisp: number;
  territorialUnit: string;
  neighborhoods: string[];
};
const fmt = (n: number | null, digits = 0) =>
  n === null
    ? 'Indisponível'
    : n.toLocaleString('pt-BR', { maximumFractionDigits: digits });
const dateLabel = (p: string) =>
  new Date(`${p}-15T12:00:00`).toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric',
  });
const titles = {
  'meu-bairro': 'Sua região, em detalhe',
  comparar: 'Como sua região se compara?',
  rankings: 'As regiões em perspectiva',
  insights: 'O que os dados revelam',
};
function Choice({
  label,
  value,
  onChange,
  options,
  grouped = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: { value: string; label: string }[];
  grouped?: boolean;
}) {
  const id = `select-${normalizeName(label).replace(/\s/g, '-')}`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <Select value={value} onValueChange={(s) => s && onChange(s)}>
        <SelectTrigger
          id={id}
          className="h-12 w-full min-w-0 rounded-xl bg-white text-sm data-[size=default]:h-12"
        >
          <SelectValue>
            {options.find((o) => o.value === value)?.label ?? 'Escolha'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80 max-w-[90vw]">
          {grouped
            ? indicatorGroups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel className="text-xs font-semibold text-[#59667b]">
                    {group.label}
                  </SelectLabel>
                  {group.ids.map((id) => {
                    const o = options.find((o) => o.value === id);
                    return o ? (
                      <SelectItem key={id} value={id}>
                        {o.label}
                      </SelectItem>
                    ) : null;
                  })}
                </SelectGroup>
              ))
            : options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function RegionExplorer({ mode, showHeader = true }: { mode: Mode; showHeader?: boolean }) {
  const reduced = useReducedMotion();
  const [showAll, setShowAll] = useState(false);
  const [timeComparison, setComparison] = useState<Comparison>('previous');
  const [insightMode, setInsightMode] = useState('panorama');
  const [data, setData] = useState<Data | null>(null),
    [territories, setTerritories] = useState<Territory[]>([]),
    [pop, setPop] = useState<{ cisp: number; population: number }[]>([]);
  const [error, setError] = useState(false),
    [ready, setReady] = useState(false),
    [search, setSearch] = useState(''),
    [bairro, setBairro] = useState('');
  const [cisp, setCisp] = useState(0),
    [other, setOther] = useState('rio'),
    [indicator, setIndicator] = useState('total_furtos'),
    [months, setMonths] = useState('12'),
    [end, setEnd] = useState('latest'),
    [field, setField] = useState<'rate' | 'count'>('rate'),
    [shared, setShared] = useState('');
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setCisp(Number(p.get('cisp')) || 0);
    setBairro(p.get('bairro') || '');
    setOther(p.get('outra') || 'rio');
    setIndicator(p.get('indicador') || 'total_furtos');
    setEnd(p.get('fim') || 'latest');
    if (Number(p.get('meses')) > 0 && Number(p.get('meses')) <= 36 && Number.isInteger(Number(p.get('meses'))))
      setMonths(p.get('meses')!);
    const compare = p.get('comparacao');
    if(compare === 'year' || compare === 'none') setComparison(compare);
    setField(p.get('visualizacao') === 'quantidade' ? 'count' : 'rate');
    setReady(true);
    async function load() {
      const r = await fetch('/data/crime-rio-snapshot.json');
      if (!r.ok) throw Error('Snapshot indisponível');
      const snapshot: Data = { ...(await r.json()), live: true };
      const [t, population] = await Promise.all([
        fetch('/data/cisp-neighborhoods.json').then((r) => r.json()),
        fetch('/data/cisp-population.json').then((r) => r.json()),
      ]);
      const territoryRecords = (t as { records: Territory[] }).records;
      const populationRecords = (
        population as { records: { cisp: number; population: number }[] }
      ).records;
      if (
        territoryRecords.length !== 41 ||
        populationRecords.length !== 41 ||
        new Set(populationRecords.map((p) => p.cisp)).size !== 41 ||
        territoryRecords.some(
          (t) =>
            !populationRecords.some(
              (p) =>
                p.cisp === t.cisp &&
                Number.isSafeInteger(p.population) &&
                p.population > 0,
            ),
        )
      )
        throw Error('Cobertura territorial incompleta');
      const ids = new Set(populationRecords.map((p) => p.cisp)),
        sourceIds = new Set(snapshot.rows.map((r) => r.cisp));
      if (
        new Set(territoryRecords.map((t) => t.cisp)).size !== 41 ||
        sourceIds.size !== 41 ||
        [...sourceIds].some((id) => !ids.has(id))
      )
        throw Error('Regiões da fonte diferem da população');
      setData(snapshot);
      setTerritories(territoryRecords);
      setPop(populationRecords);
    }
    load().catch(() => setError(true));
  }, []);
  const periods = useMemo(
    () => (data ? [...new Set(data.rows.map((r) => r.period))].sort() : []),
    [data],
  );
  useEffect(() => {
    if (
      data &&
      end !== 'latest' &&
      (!periods.includes(end) || periods.indexOf(end) < Number(months) - 1)
    )
      setEnd('latest');
  }, [data, end, months, periods]);
  const effectiveEnd =
    end === 'latest'
      ? data?.latestPeriod
      : periods.includes(end)
        ? end
        : data?.latestPeriod;
  const validIndicator =
    data?.indicators.find((i) => i.id === indicator) ??
    data?.indicators.find((i) => i.id === 'total_furtos');
  const id = validIndicator?.id ?? indicator;
  const query = new URLSearchParams({
    indicador: id,
    meses: months,
    fim: end,
    comparacao: timeComparison,
    visualizacao: field === 'rate' ? 'taxa' : 'quantidade',
    ...(cisp ? { cisp: String(cisp) } : {}),
    ...(bairro ? { bairro } : {}),
    ...(other !== 'rio' ? { outra: other } : {}),
  });
  const queryString = `?${query}`;
  useEffect(() => {
    if (ready) window.history.replaceState(null, '', `/${mode}${queryString}`);
  }, [ready, mode, queryString]);
  const metrics =
    data && effectiveEnd
      ? regionMetrics(data.rows, pop, id, effectiveEnd, Number(months), timeComparison)
      : [];
  const selected = metrics.find((m) => m.cisp === cisp),
    selectedTerritory = territories.find((t) => t.cisp === cisp);
  const city = cityMetric(metrics),
    comparison =
      other === 'rio' ? city : metrics.find((m) => m.cisp === Number(other));
  const ranking = rankMetrics(metrics, field),
    neighborhoods = neighborhoodIndex(territories);
  const chosen = neighborhoods.find((n) => n.name === bairro);
  useEffect(() => {
    if (
      territories.length &&
      bairro &&
      (!chosen || (cisp > 0 && !chosen.cisps.includes(cisp)))
    )
      setBairro('');
  }, [territories, bairro, cisp, chosen]);
  const range = effectiveEnd
    ? `${dateLabel(monthShift(effectiveEnd, 1 - Number(months)))} – ${dateLabel(effectiveEnd)}`
    : 'Carregando período…';
  const comparisonDates = effectiveEnd ? comparisonRange(monthShift(effectiveEnd, 1-Number(months)), effectiveEnd, timeComparison) : null;
  const prior = comparisonDates ? `${dateLabel(comparisonDates.start)} – ${dateLabel(comparisonDates.end)}` : 'sem comparação';
  const unit =
    field === 'rate'
      ? `${validIndicator?.unit ?? 'eventos'} por 100 mil moradores`
      : (validIndicator?.unit ?? 'eventos');
  function link(path: string, area = cisp, metric = id) {
    const p = new URLSearchParams(query);
    p.set('cisp', String(area));
    p.set('indicador', metric);
    if (!chosen?.cisps.includes(area)) p.delete('bairro');
    return `${path}?${p}`;
  }
  async function share() {
    try {
      const text = `CISP ${cisp}: ${validIndicator?.label}, ${range}. Dados da região policial. ${location.href}`;
      if (navigator.share)
        await navigator.share({
          title: 'Mapa da Criminalidade RJ',
          text,
          url: location.href,
        });
      else {
        await navigator.clipboard.writeText(text);
        setShared('Link copiado');
      }
    } catch {
      setShared('Não foi possível compartilhar. Copie o endereço da página.');
    }
  }
  const areaOptions = territories.map((t) => ({
    value: String(t.cisp),
    label: `CISP ${t.cisp} · ${t.territorialUnit}`,
  }));
  const comparable = metrics.filter(
    (m) => m.count !== null && m.previous !== null,
  ).length;
  const changes = comparable === 41 ? factualInsights(metrics) : [];
  const history =
    data && effectiveEnd
      ? historicalInsights(data.rows, pop, id, effectiveEnd, Number(months), timeComparison)
      : [];
  return (
    <main className="explorer-page min-h-screen bg-[#f3f5fa] text-[#172235]">
      {showHeader && <SiteHeader date={data ? dateLabel(data.latestPeriod) : undefined} />}
      <ExploreNavigation active={`/${mode}`} query={queryString} />
      <div className="mx-auto max-w-[1320px] px-5 py-7 md:px-8 md:py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {titles[mode]}
            </h1>
            <p className="mt-3 text-base text-[#526078]">
              {mode === 'insights'
                ? 'Compare tipos de ocorrência. Entenda as diferenças entre as regiões.'
                : mode === 'meu-bairro'
                  ? 'Encontre seu bairro e acompanhe os registros da região policial que o atende.'
                  : `${validIndicator?.label ?? 'Dados oficiais do ISP-RJ'} · ${range}`}
            </p>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-sm">
            Fonte até {data ? dateLabel(data.latestPeriod) : '…'}
          </span>
        </div>
        {error ? (
          <div role="alert" className="rounded-2xl bg-white p-8">
            Não conseguimos carregar os dados.{' '}
            <Button onClick={() => location.reload()}>Tentar novamente</Button>
          </div>
        ) : !data ? (
          <div role="status" className="rounded-2xl bg-white p-8">
            Carregando registros oficiais e regiões…
          </div>
        ) : (
          <>
            {!data.live && (
              <p
                role="status"
                className="mb-5 rounded-xl bg-amber-50 p-4 text-sm"
              >
                Fonte indisponível: exibindo a cópia de segurança até{' '}
                {dateLabel(data.latestPeriod)}. Os destaques usam esse mesmo
                período.
              </p>
            )}
            {mode === 'meu-bairro' && (
              <section className="mb-6 rounded-2xl border border-[#dce2ed] bg-white p-5 md:p-7">
                <label
                  htmlFor="neighborhood-search"
                  className="mb-3 block text-lg font-semibold"
                >
                  Qual é o seu bairro?
                </label>
                <Input
                  id="neighborhood-search"
                  placeholder="Ex.: Tijuca, Copacabana, Bangu"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 max-w-xl rounded-xl text-base"
                />
                {search && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {neighborhoods
                      .filter((n) =>
                        normalizeName(n.name).includes(normalizeName(search)),
                      )
                      .slice(0, 12)
                      .map((n) => (
                        <button
                          key={n.name}
                          className="flex min-h-12 items-center justify-between rounded-xl border border-[#dce2ed] p-3 text-left hover:bg-[#eaf0fc]"
                          onClick={() => {
                            setBairro(n.name);
                            setSearch('');
                            setCisp(n.cisps.length === 1 ? n.cisps[0] : 0);
                          }}
                        >
                          {n.name}
                          <ArrowRight className="size-4" />
                        </button>
                      ))}
                    {!neighborhoods.some((n) =>
                      normalizeName(n.name).includes(normalizeName(search)),
                    ) && <p>Nenhum bairro encontrado. Tente outro nome.</p>}
                  </div>
                )}
                {chosen && (
                  <div className="mt-5">
                    <h2 className="text-xl font-semibold">{chosen.name}</h2>
                    {chosen.cisps.length > 1 && (
                      <p className="mt-2 text-base">
                        Este bairro abrange mais de uma região policial. Escolha
                        a área que deseja consultar; os totais incluem outras
                        localidades da mesma região.
                      </p>
                    )}
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {chosen.cisps.map((area) => (
                        <div
                          key={area}
                          className={`rounded-xl border p-4 text-left ${cisp === area ? 'border-[#2455dc] bg-[#eaf0fc]' : 'border-[#dce2ed]'}`}
                        >
                          <button
                            aria-pressed={cisp === area}
                            onClick={() => setCisp(area)}
                            className="block min-h-11 w-full text-left font-semibold"
                          >
                            Selecionar CISP {area}
                          </button>
                          <span className="mt-1 block text-sm leading-6">
                            {
                              territories.find((t) => t.cisp === area)
                                ?.territorialUnit
                            }
                          </span>
                          <a
                            className="mt-2 inline-block text-sm underline"
                            href={link('/', area)}
                          >
                            Localizar no mapa
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
            <section
              aria-label="Filtros"
              className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-[#dce2ed] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {mode === 'insights' && (
                <Choice
                  label="Leitura"
                  value={insightMode}
                  onChange={setInsightMode}
                  options={[
                    {
                      value: 'panorama',
                      label: 'Panorama · cruzar indicadores',
                    },
                    { value: 'indicador', label: 'Explorar um indicador' },
                  ]}
                />
              )}
              {(mode !== 'insights' || insightMode === 'indicador') && (
                <Choice
                  label="Indicador"
                  grouped
                  value={id}
                  onChange={setIndicator}
                  options={data.indicators.map((i) => ({
                    value: i.id,
                    label: i.label,
                  }))}
                />
              )}
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-semibold">Período e comparação</p>
                <PeriodPicker min="2003-01" mapFrom={periods[0]} max={periods.at(-1) ?? ''} start={effectiveEnd ? monthShift(effectiveEnd,1-Number(months)) : ''} end={effectiveEnd ?? ''} comparison={timeComparison}
                  onApply={(a,b,c)=>{if(a < periods[0]) { window.location.assign(`/historico?${new URLSearchParams({indicador:id,inicio:a,fim:b,comparacao:c})}`);return;} setMonths(String(monthCount(a,b)));setEnd(b);setComparison(c);}}
                  historyHref={`/historico?indicador=${id}`} />
              </div>
              {mode !== 'insights' && (
                <Choice
                  label="Mostrar por"
                  value={field}
                  onChange={(s) => setField(s as 'rate' | 'count')}
                  options={[
                    { value: 'rate', label: 'Taxa por 100 mil' },
                    { value: 'count', label: 'Quantidade' },
                  ]}
                />
              )}
              <p className="text-sm text-[#526078] sm:col-span-2 lg:col-span-4">
                {range} ·{' '}
                {end === 'latest'
                  ? 'Acompanha automaticamente o último mês publicado.'
                  : 'Período fixo. Use “Período e comparação” para escolher outro intervalo.'}
              </p>
            </section>
            {(mode !== 'insights' || insightMode === 'indicador') && (
              <details
                open={mode === 'insights'}
                className="mb-6 text-sm text-[#526078]"
              >
                <summary className="cursor-pointer py-2">
                  O que significa {validIndicator?.label.toLowerCase()}?
                </summary>
                <p className="max-w-3xl py-3 leading-6">
                  {validIndicator?.definition} Unidade: {validIndicator?.unit}.
                  Taxas usam residentes do Censo 2022; não medem a chance
                  individual de sofrer um crime. Trabalhadores e turistas não
                  entram nessa população.
                </p>
              </details>
            )}
            {(mode === 'comparar' || (mode === 'meu-bairro' && cisp > 0)) && (
              <section className="mb-6 grid gap-4 sm:grid-cols-2">
                <Choice
                  label="Sua região policial"
                  value={String(cisp)}
                  onChange={(s) => {
                    setCisp(Number(s));
                    setBairro('');
                  }}
                  options={[
                    { value: '0', label: 'Selecione uma região' },
                    ...areaOptions,
                  ]}
                />
                {mode === 'comparar' && (
                  <Choice
                    label="Comparar com"
                    value={other}
                    onChange={setOther}
                    options={[
                      { value: 'rio', label: 'Rio inteiro' },
                      ...areaOptions,
                    ]}
                  />
                )}
              </section>
            )}
            {mode === 'meu-bairro' && selected && (
              <motion.section
                initial={reduced ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="rounded-2xl bg-[#172235] p-6 text-white">
                  <div className="flex items-center gap-2 text-sm text-[#a9c1ff]">
                    <MapPin className="size-4" /> Região policial CISP {cisp}
                  </div>
                  <h2 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight md:text-5xl">
                    {selectedTerritory?.territorialUnit}
                  </h2>
                  <p className="mt-3 text-base text-white/80">
                    Os números abrangem toda esta região policial. {range}.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href={link('/comparar')}
                      className="rounded-xl bg-white px-4 py-3 font-semibold text-[#172235]"
                    >
                      Comparar esta região
                    </a>
                    <Button
                      onClick={() => void share()}
                      className="h-12 rounded-xl border border-white/40 bg-transparent"
                    >
                      <Share2 /> Compartilhar
                    </Button>
                  </div>
                  <p role="status">{shared}</p>
                </div>
                <div className="grid overflow-hidden rounded-xl border border-[#dce2ed] bg-white md:grid-cols-3">
                  {data.indicators
                    .filter(
                      (meta) =>
                        showAll ||
                        [
                          'total_roubos',
                          'total_furtos',
                          'letalidade_violenta',
                        ].includes(meta.id),
                    )
                    .map((meta) => {
                      const all = regionMetrics(
                          data.rows,
                          pop,
                          meta.id,
                          effectiveEnd!,
                          Number(months),
                        ),
                        m = all.find((x) => x.cisp === cisp)!,
                        r = rankMetrics(all, field),
                        position = r.find((x) => x.cisp === cisp);
                      return (
                        <a
                          key={meta.id}
                          href={link('/rankings', cisp, meta.id)}
                          className="border-b border-[#dce2ed] p-6 transition hover:bg-[#eef3ff] md:border-r"
                        >
                          <h3 className="text-base font-semibold">
                            {meta.label}
                          </h3>
                          <strong className="mt-4 block text-4xl tracking-tight tabular-nums">
                            {fmt(m[field], field === 'rate' ? 1 : 0)}
                          </strong>
                          <p className="mt-1 text-sm text-[#526078]">
                            {field === 'rate'
                              ? `${meta.unit} por 100 mil`
                              : meta.unit}
                          </p>
                          <p className="mt-4 text-sm">
                            {position
                              ? `${position.rank}ª maior ${field === 'rate' ? 'taxa' : 'quantidade'} de ${r.length} regiões${position.tied ? ' · empate' : ''}`
                              : 'Sem posição disponível'}
                          </p>
                          <p className="mt-2 text-sm text-[#526078]">
                            {fmt(m.count)} {meta.unit} · {fmt(m.population)}{' '}
                            moradores
                          </p>
                          <p className="mt-2 text-sm text-[#324c86]">
                            Rio:{' '}
                            {fmt(
                              cityMetric(all)[field],
                              field === 'rate' ? 1 : 0,
                            )}{' '}
                            {field === 'rate' ? 'por 100 mil' : meta.unit}
                          </p>
                        </a>
                      );
                    })}
                </div>
                <Button
                  variant="outline"
                  className="h-12 rounded-xl"
                  onClick={() => setShowAll(!showAll)}
                  aria-expanded={showAll}
                >
                  {showAll
                    ? 'Mostrar principais indicadores'
                    : 'Ver todos os indicadores'}
                </Button>
                <section className="rounded-2xl bg-white p-6">
                  <h2 className="text-xl font-semibold">
                    Evolução mensal de {validIndicator?.label.toLowerCase()}
                  </h2>
                  <p className="mt-2 text-sm text-[#526078]">
                    {validIndicator?.unit} por mês · últimos 12 meses até{' '}
                    {dateLabel(effectiveEnd!)}
                  </p>
                  <div className="mt-5 space-y-2">
                    {(() => {
                      const ps = windowPeriods(effectiveEnd!, 12);
                      const rows = data.rows.filter((r) => r.cisp === cisp);
                      const max = Math.max(
                        1,
                        ...rows
                          .filter((r) => ps.includes(r.period))
                          .map((r) => r.values[id]),
                      );
                      return ps.map((p) => {
                        const n =
                          rows.find((r) => r.period === p)?.values[id] ?? null;
                        return (
                          <div
                            key={p}
                            className="grid grid-cols-[100px_1fr_65px] items-center gap-3 text-sm"
                          >
                            <span>{dateLabel(p)}</span>
                            <div className="h-5 rounded bg-[#eaf0fc]">
                              <div
                                className="h-full rounded bg-[#3459ad]"
                                style={{
                                  width: `${n === null ? 0 : (n / max) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-right tabular-nums">
                              {fmt(n)}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </section>
              </motion.section>
            )}
            {mode === 'comparar' &&
              (!selected ? (
                <p className="rounded-2xl bg-white p-8">
                  Selecione sua região para começar a comparação.
                </p>
              ) : (
                <section className="rounded-2xl bg-white p-6">
                  <h2 className="text-xl font-semibold">
                    {validIndicator?.label} · {range}
                  </h2>
                  {other === String(cisp) ? (
                    <p className="mt-4">
                      Você selecionou a mesma região nos dois lados. Escolha
                      outra região ou o Rio inteiro.
                    </p>
                  ) : (
                    <>
                      <div className="mt-6 grid overflow-hidden rounded-xl border border-[#dce2ed] md:grid-cols-2">
                        {[selected, comparison].map((m, i) => (
                          <div
                            key={i}
                            className={`border-t-4 p-6 md:p-8 ${i === 0 ? 'border-[#2455dc] bg-white' : 'border-[#8b97ad] bg-[#f7f8fb]'}`}
                          >
                            <h3 className="text-base font-semibold text-[#2455dc]">
                              {i === 0
                                ? `CISP ${cisp}`
                                : other === 'rio'
                                  ? 'Rio inteiro'
                                  : `CISP ${other}`}
                            </h3>
                            <p className="mt-2 text-sm">
                              {i === 0
                                ? selectedTerritory?.territorialUnit
                                : other === 'rio'
                                  ? 'Todas as regiões policiais da cidade'
                                  : territories.find(
                                      (t) => t.cisp === Number(other),
                                    )?.territorialUnit}
                            </p>
                            <strong className="mt-5 block text-5xl tracking-tight tabular-nums">
                              {fmt(
                                m?.[field] ?? null,
                                field === 'rate' ? 1 : 0,
                              )}
                            </strong>
                            <p className="mt-2 text-sm">{unit}</p>
                            <div
                              aria-hidden="true"
                              className="mt-4 h-3 rounded-full bg-[#a9c1ff]/30"
                            >
                              <div
                                className="h-full rounded-full bg-[#7094e5]"
                                style={{
                                  width: `${m?.[field] === null ? 0 : ((m?.[field] ?? 0) / Math.max(1, selected[field] ?? 0, comparison?.[field] ?? 0)) * 100}%`,
                                }}
                              />
                            </div>
                            <p className="mt-5 text-sm">
                              {fmt(m?.count ?? null)} {validIndicator?.unit} ·{' '}
                              {fmt(m?.population ?? null)} moradores
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-5 text-base leading-7">
                        {selected[field] !== null &&
                        comparison?.[field] !== null &&
                        comparison?.[field] !== undefined
                          ? `Diferença de ${field === 'rate' ? 'taxa' : 'quantidade'}: ${fmt(selected[field]! - comparison[field]!, field === 'rate' ? 1 : 0)} ${unit}.`
                          : 'Taxa indisponível para esta comparação.'}{' '}
                        {other === 'rio'
                          ? 'A taxa do Rio usa a soma dos registros dividida pela soma dos moradores e inclui a região selecionada.'
                          : ''}
                      </p>
                      <p className="mt-3 text-sm text-[#526078]">
                        Mesma janela de tempo e população do Censo 2022. A taxa
                        não representa a chance individual de sofrer um crime.
                      </p>
                    </>
                  )}
                </section>
              ))}
            {mode === 'rankings' && (
              <section className="overflow-hidden rounded-2xl border border-[#dce2ed] bg-white">
                <div className="p-5">
                  <h2 className="text-xl font-semibold">
                    {ranking.length} regiões · da maior para a menor{' '}
                    {field === 'rate' ? 'taxa' : 'quantidade'}
                  </h2>
                  <p className="mt-2 text-sm text-[#526078]">
                    {unit} · empates compartilham a posição. Cada região aparece
                    uma vez.
                  </p>
                </div>
                <ol>
                  {ranking.map((m) => (
                    <li
                      key={m.cisp}
                      className={`border-t border-[#dce2ed] transition hover:bg-[#f3f5fa] ${m.cisp === cisp ? 'bg-[#eef3ff]' : ''}`}
                    >
                      <a
                        href={link('/meu-bairro', m.cisp)}
                        className="grid grid-cols-[42px_1fr] gap-3 p-5 sm:grid-cols-[42px_1fr_160px]"
                      >
                        <span className="text-lg tabular-nums">{m.rank}º</span>
                        <div>
                          <strong>
                            CISP {m.cisp} ·{' '}
                            {
                              territories.find((t) => t.cisp === m.cisp)
                                ?.territorialUnit
                            }
                          </strong>
                          <p className="mt-1 text-sm text-[#526078]">
                            {fmt(m.count)} {validIndicator?.unit}
                            {m.tied ? ' · empatada' : ''}
                            {m.cisp === cisp ? ' · sua seleção' : ''}
                          </p>
                          <div
                            aria-hidden="true"
                            className="mt-3 h-1.5 w-full bg-[#edf0f5]"
                          >
                            <div
                              className="h-full bg-[#7391cd]"
                              style={{
                                width: `${(Math.max(0, m[field] ?? 0) / Math.max(1, ranking[0]?.[field] ?? 0)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <strong className="col-start-2 text-2xl tabular-nums sm:col-start-auto sm:text-right">
                          {fmt(m[field], field === 'rate' ? 1 : 0)}
                        </strong>
                      </a>
                    </li>
                  ))}
                </ol>
                {!ranking.length && (
                  <p className="p-5">
                    Não há cobertura completa para este período.
                  </p>
                )}
              </section>
            )}
            {mode === 'insights' &&
              insightMode === 'panorama' &&
              effectiveEnd && (
                <InsightsPanorama
                  comparison={timeComparison}
                  followLatest={end === 'latest'}
                  rows={data.rows}
                  populations={pop}
                  territories={territories}
                  indicators={data.indicators}
                  end={effectiveEnd}
                  months={Number(months)}
                  range={range}
                  prior={prior}
                />
              )}
            {mode === 'insights' && insightMode === 'indicador' && (
              <section>
                <h2 className="mb-4 text-2xl font-semibold">
                  Destaques de {validIndicator?.label.toLowerCase()}
                </h2>
                <p className="mb-5 text-base leading-7 text-[#526078]">
                  {comparable} de 41 regiões com dados completos nos dois
                  períodos. Comparação de {range} com {prior}. Destaques
                  calculados automaticamente: base anterior de pelo menos 20,
                  mudança mínima de 10% e diferença de pelo menos 20{' '}
                  {validIndicator?.unit}. Empates podem produzir mais de um
                  destaque.
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  {changes.map((x) => (
                    <article
                      key={`${x.kind}-${x.cisp}`}
                      className="rounded-2xl border border-[#dce2ed] bg-white p-6"
                    >
                      <p className="mb-4 text-sm font-semibold text-[#2455dc]">
                        {validIndicator?.label} · quantidade
                      </p>
                      <TrendingUp
                        className={`size-6 text-[#3459ad] ${x.change! < 0 ? 'rotate-90' : ''}`}
                      />
                      <p className="mt-4 text-sm font-semibold text-[#3459ad]">
                        {x.kind}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">
                        CISP {x.cisp} ·{' '}
                        {
                          territories.find((t) => t.cisp === x.cisp)
                            ?.territorialUnit
                        }
                      </h2>
                      <strong className="mt-5 block text-4xl tabular-nums">
                        {fmt(x.change, 1)}%
                      </strong>
                      <p className="mt-3 text-base">
                        De {fmt(x.previous)} para {fmt(x.count)}{' '}
                        {validIndicator?.unit}.
                      </p>
                      <p className="mt-2 text-base font-medium">
                        {fmt(Math.abs(x.count - x.previous))}{' '}
                        {validIndicator?.unit}{' '}
                        {x.count > x.previous ? 'a mais' : 'a menos'}.
                      </p>
                      <p className="mt-3 text-sm leading-6 text-[#526078]">
                        {range} versus {prior}.
                      </p>
                      <a
                        href={link('/meu-bairro', x.cisp)}
                        className="mt-6 inline-flex items-center gap-2 font-semibold text-[#2455dc]"
                      >
                        Explorar região <ArrowRight className="size-4" />
                      </a>
                    </article>
                  ))}
                </div>
                {!changes.length && (
                  <p className="rounded-2xl bg-white p-7">
                    {comparable < 41
                      ? 'Não há cobertura completa para gerar os destaques de mudança.'
                      : 'Nenhuma mudança atende aos critérios de destaque neste período.'}{' '}
                    Isso não significa ausência de ocorrências.
                  </p>
                )}
                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  {history.map((x) => (
                    <article
                      key={`${x.title}-${x.cisp}`}
                      className="rounded-2xl border border-[#dce2ed] bg-white p-6"
                    >
                      <p className="mb-3 text-sm font-semibold text-[#2455dc]">
                        {validIndicator?.label}
                      </p>
                      <p className="text-sm font-semibold text-[#3459ad]">
                        {x.title}
                      </p>
                      <h2 className="mt-3 text-lg font-semibold">
                        CISP {x.cisp} ·{' '}
                        {
                          territories.find((t) => t.cisp === x.cisp)
                            ?.territorialUnit
                        }
                      </h2>
                      <p className="mt-4 text-base leading-7">
                        {x.detail} Unidade: {validIndicator?.unit}.
                      </p>
                      <a
                        className="mt-5 inline-block font-semibold underline"
                        href={link('/meu-bairro', x.cisp)}
                      >
                        Ver evolução
                      </a>
                    </article>
                  ))}
                </div>
                <p className="mt-6 text-sm leading-6 text-[#526078]">
                  Descrevem mudanças nos registros, sem atribuir causas.
                  Revisões da fonte podem alterar os resultados.{' '}
                  <a href="/metodologia" className="underline">
                    Entenda os dados.
                  </a>
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
