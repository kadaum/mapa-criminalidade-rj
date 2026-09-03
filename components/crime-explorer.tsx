'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { ExpressionSpecification, Map as MapLibreMap, MapGeoJSONFeature } from 'maplibre-gl';
import type { FeatureCollection, Geometry } from 'geojson';
import Link from 'next/link';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CalendarDays, Database, FileText, Info, MapPinned, Scale, Share2, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Indicator = { id: string; label: string; unit: string; note?: string };
type DataRow = { cisp: number; aisp: number; risp: number; period: string; phase: number; values: Record<string, number> };
type Snapshot = { generatedAt: string; live?: boolean; latestPeriod: string; latestPhase: number[]; indicators: Indicator[]; coverage: { municipality: string; cispCount: number; months: number }; rows: DataRow[]; source: { title: string; publisher: string; landingPage: string; lastModified?: string; sha256?: string } };
type AreaStat = { cisp: number; current: number; previous: number; change: number | null; latest: number };
type CispProperties = { cisp: number; aisp?: number; current?: number; previous?: number; change?: number | null; latest?: number };

const mapStyle = { version: 8 as const, sources: { osm: { type: 'raster' as const, tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } }, layers: [{ id: 'osm', type: 'raster' as const, source: 'osm', paint: { 'raster-opacity': 0.72 } }] };
const colorExpression: ExpressionSpecification = ['interpolate', ['linear'], ['coalesce', ['get', 'change'], 0], -50, '#3d7180', -10, '#8fb8b5', 0, '#e7e0d3', 10, '#d7a44a', 50, '#b86548'];

function sum(rows: DataRow[], indicator: string) { return rows.reduce((total, row) => total + (row.values[indicator] ?? 0), 0); }
function formatPeriod(period: string) { const [year, month] = period.split('-').map(Number); return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1))); }
function fmtChange(change: number | null) { if (change === null) return 'volume pequeno'; return `${change > 0 ? '+' : ''}${change.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`; }

export function CrimeExplorer() {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [boundaries, setBoundaries] = useState<FeatureCollection<Geometry, CispProperties> | null>(null);
  const [indicator, setIndicator] = useState(() => typeof window === 'undefined' ? 'roubo_rua' : new URLSearchParams(window.location.search).get('indicador') || 'roubo_rua');
  const [selectedCisp, setSelectedCisp] = useState(() => { if (typeof window === 'undefined') return 16; const value = Number(new URLSearchParams(window.location.search).get('cisp')); return Number.isFinite(value) && value > 0 ? value : 16; });
  const [loadError, setLoadError] = useState(false);
  const selectedCispRef = useRef(selectedCisp);

  useEffect(() => {
    const loadSnapshot = async (): Promise<Snapshot> => { const live = await fetch('/api/crime'); if (live.ok) return live.json() as Promise<Snapshot>; const fallback = await fetch('/data/crime-rio-snapshot.json'); if (!fallback.ok) throw new Error('No data source'); return fallback.json() as Promise<Snapshot>; };
    Promise.all([loadSnapshot(), fetch('/data/cisp-rio.geojson').then((r) => r.json() as Promise<FeatureCollection<Geometry, CispProperties>>)]).then(([data, geo]) => { setSnapshot(data); setBoundaries(geo); }).catch(() => setLoadError(true));
  }, []);
  useEffect(() => { const url = new URL(window.location.href); url.searchParams.set('cisp', String(selectedCisp)); url.searchParams.set('indicador', indicator); window.history.replaceState(null, '', url); }, [selectedCisp, indicator]);
  const periods = useMemo(() => snapshot ? [...new Set(snapshot.rows.map((row) => row.period))].sort() : [], [snapshot]);
  const stats = useMemo(() => {
    if (!snapshot || periods.length < 24) return [] as AreaStat[];
    const currentPeriods = new Set(periods.slice(-12)); const previousPeriods = new Set(periods.slice(-24, -12)); const latest = periods.at(-1);
    return [...new Set(snapshot.rows.map((row) => row.cisp))].sort((a, b) => a - b).map((cisp) => {
      const rows = snapshot.rows.filter((row) => row.cisp === cisp); const current = sum(rows.filter((row) => currentPeriods.has(row.period)), indicator); const previous = sum(rows.filter((row) => previousPeriods.has(row.period)), indicator);
      return { cisp, current, previous, change: current + previous >= 20 && previous > 0 ? ((current - previous) / previous) * 100 : null, latest: sum(rows.filter((row) => row.period === latest), indicator) };
    });
  }, [snapshot, periods, indicator]);
  const enrichedGeo = useMemo(() => {
    if (!boundaries || !stats.length) return null; const byCisp = new Map(stats.map((item) => [item.cisp, item]));
    return { ...boundaries, features: boundaries.features.map((feature) => ({ ...feature, properties: { ...feature.properties, ...byCisp.get(Number(feature.properties.cisp)) } })) };
  }, [boundaries, stats]);

  useEffect(() => {
    if (!mapNode.current || !enrichedGeo) return;
    if (!mapRef.current) {
      const map = new maplibregl.Map({ container: mapNode.current, style: mapStyle, center: [-43.34, -22.93], zoom: 9.65, minZoom: 8.5, maxZoom: 15, attributionControl: false });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right'); map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
      map.on('load', () => {
        map.addSource('cisp', { type: 'geojson', data: enrichedGeo });
        map.addLayer({ id: 'cisp-fill', type: 'fill', source: 'cisp', paint: { 'fill-color': ['case', ['==', ['get', 'cisp'], selectedCispRef.current], '#4f3b78', colorExpression], 'fill-opacity': 0.62 } });
        map.addLayer({ id: 'cisp-line', type: 'line', source: 'cisp', paint: { 'line-color': '#24323d', 'line-width': 1.2, 'line-opacity': 0.72 } });
        map.on('click', 'cisp-fill', (event) => { const feature = event.features?.[0] as MapGeoJSONFeature | undefined; if (feature?.properties?.cisp) setSelectedCisp(Number(feature.properties.cisp)); });
        map.on('mouseenter', 'cisp-fill', () => { map.getCanvas().style.cursor = 'pointer'; }); map.on('mouseleave', 'cisp-fill', () => { map.getCanvas().style.cursor = ''; });
      });
      mapRef.current = map; return () => { map.remove(); mapRef.current = null; };
    }
    void (mapRef.current.getSource('cisp') as maplibregl.GeoJSONSource | undefined)?.setData(enrichedGeo);
  }, [enrichedGeo]);
  useEffect(() => { if (mapRef.current?.getLayer('cisp-fill')) mapRef.current.setPaintProperty('cisp-fill', 'fill-color', ['case', ['==', ['get', 'cisp'], selectedCisp], '#4f3b78', colorExpression]); }, [selectedCisp]);

  const selected = stats.find((item) => item.cisp === selectedCisp); const selectedIndicator = snapshot?.indicators.find((item) => item.id === indicator); const cityTotal = sum(snapshot?.rows.filter((row) => periods.slice(-12).includes(row.period)) ?? [], indicator);
  const selectedSeries = (snapshot?.rows.filter((row) => row.cisp === selectedCisp).slice(-12) ?? []).map((row) => ({ period: row.period, value: row.values[indicator] ?? 0 })); const seriesMax = Math.max(1, ...selectedSeries.map((item) => item.value));
  async function share() { const text = `${selectedIndicator?.label ?? 'Registros'} na CISP ${selectedCisp}: ${selected ? fmtChange(selected.change) : ''} na comparação de 12 meses. Dados oficiais ISP-RJ; registros não representam risco individual.`; if (navigator.share) await navigator.share({ title: 'Mapa Aberto RJ', text, url: window.location.href }); else await navigator.clipboard.writeText(`${text} ${window.location.href}`); }
  if (loadError) return <main className="grid min-h-screen place-items-center bg-background p-6"><div className="max-w-md rounded-2xl border bg-card p-6"><h1 className="font-heading text-xl font-semibold">Os dados não carregaram.</h1><p className="mt-2 text-sm text-muted-foreground">Tente novamente. A fonte e a data sempre aparecem quando a leitura está disponível.</p></div></main>;

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur md:px-7"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><MapPinned className="size-5" /></div><div><p className="font-heading text-[15px] font-bold tracking-tight">Mapa Aberto RJ</p><p className="text-[11px] text-muted-foreground">Monitor territorial de registros policiais</p></div></div><Badge variant="outline" className="hidden border-emerald-700/25 bg-emerald-50 text-emerald-800 sm:inline-flex"><Database /> Fonte oficial ISP-RJ</Badge></div></header>
    <section className="mx-auto grid max-w-[1500px] gap-4 p-4 md:p-7 lg:grid-cols-[330px_minmax(0,1fr)_320px]">
      <aside className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm"><div><Badge className="bg-primary/10 text-primary">Piloto · cidade do Rio</Badge><h1 className="mt-3 font-heading text-3xl font-bold leading-[1.05] tracking-[-0.035em]">O que mudou na segurança da sua região?</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Compare registros comunicados à polícia em janelas equivalentes. O mapa mostra áreas de delegacia, não risco de uma rua.</p></div>
        <div className="space-y-2"><label htmlFor="indicator-select" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Tipo de registro</label><Select value={indicator} onValueChange={(value) => setIndicator(String(value))}><SelectTrigger id="indicator-select" className="h-11 w-full bg-background"><SelectValue /></SelectTrigger><SelectContent>{snapshot?.indicators.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3"><div className="metric-card"><CalendarDays /><span>Dados até</span><strong>{snapshot ? formatPeriod(snapshot.latestPeriod) : '—'}</strong></div><div className="metric-card"><Scale /><span>Janela</span><strong>12 meses</strong></div></div>
        <div className="rounded-xl border border-amber-700/15 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><Info className="mr-2 inline size-4" /><strong>Leitura correta:</strong> variação de registros oficiais entre dois períodos de 12 meses. Não é previsão nem garantia de segurança.</div>
        <div className="flex flex-wrap gap-2"><Button onClick={() => void share()} className="h-9"><Share2 /> Compartilhar análise</Button><Button variant="outline" className="h-9" render={<Link href="/metodologia"><FileText /> Metodologia</Link>} /></div>
        <a href="https://www.ispdados.rj.gov.br/EstSeguranca.html" target="_blank" rel="noreferrer" className="inline-flex text-xs font-semibold text-primary underline decoration-primary/30 underline-offset-4">Abrir arquivo-fonte no ISP-RJ</a>
      </aside>
      <section className="relative min-h-[520px] overflow-hidden rounded-2xl border bg-muted shadow-sm lg:min-h-[calc(100vh-128px)]"><div ref={mapNode} className="absolute inset-0" /><div className="pointer-events-none absolute left-3 top-3 rounded-xl border bg-background/92 px-3 py-2 text-xs shadow-sm backdrop-blur"><p className="font-semibold">Variação em 12 meses</p><div className="mt-2 flex items-center gap-1"><span className="legend bg-[#3d7180]" /><span>caiu</span><span className="legend ml-2 bg-[#e7e0d3]" /><span>estável</span><span className="legend ml-2 bg-[#b86548]" /><span>subiu</span></div></div></section>
      <aside className="space-y-4"><div className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Área selecionada</p><Badge variant="outline">fase {snapshot?.latestPhase?.join('/') ?? '—'}</Badge></div><div className="mt-2 flex items-end justify-between"><div><h2 className="font-heading text-3xl font-bold tracking-tight">CISP {selectedCisp}</h2><p className="text-sm text-muted-foreground">Circunscrição da {selectedCisp}ª DP</p></div>{selected?.change != null && selected.change > 0 ? <TrendingUp className="size-7 text-[#b86548]" /> : <TrendingDown className="size-7 text-[#3d7180]" />}</div><div className="mt-5 grid grid-cols-2 gap-3"><div className="stat"><span>Últimos 12 meses</span><strong>{selected?.current.toLocaleString('pt-BR') ?? '—'}</strong><small>{selectedIndicator?.unit}</small></div><div className="stat"><span>12 meses anteriores</span><strong>{selected?.previous.toLocaleString('pt-BR') ?? '—'}</strong><small>{selectedIndicator?.unit}</small></div></div><div className="mt-3 rounded-xl bg-muted p-4"><span className="text-xs text-muted-foreground">Mudança entre as janelas</span><p className="mt-1 font-heading text-2xl font-bold">{selected ? fmtChange(selected.change) : '—'}</p></div><div className="mt-5"><div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground"><span>12 meses recentes</span><span>{selectedIndicator?.unit}</span></div><div className="flex h-20 items-end gap-1" aria-label="Série dos doze meses recentes">{selectedSeries.map((item) => <div key={item.period} title={`${item.period}: ${item.value}`} className="min-h-1 flex-1 rounded-t-sm bg-primary/65" style={{ height: `${Math.max(5, (item.value / seriesMax) * 100)}%` }} />)}</div></div></div>
        <div className="rounded-2xl border bg-card p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Contexto da cidade</p><span className={`size-2 rounded-full ${snapshot?.live ? 'bg-emerald-500' : 'bg-amber-500'}`} /></div><p className="mt-2 font-heading text-3xl font-bold">{cityTotal.toLocaleString('pt-BR')}</p><p className="text-sm text-muted-foreground">{selectedIndicator?.unit ?? 'registros'} nas 41 CISPs nos últimos 12 meses.</p><p className="mt-3 text-[11px] text-muted-foreground">{snapshot?.live ? 'Fonte consultada automaticamente nesta sessão.' : 'Snapshot validado usado como contingência.'}</p></div><div className="rounded-2xl border bg-card p-5 text-xs leading-5 text-muted-foreground"><p className="font-semibold text-foreground">Sobre os limites</p><p className="mt-1">CISP é a área atendida por uma delegacia. Os limites podem mudar e não equivalem exatamente a bairros.</p></div></aside>
    </section>
  </main>;
}
