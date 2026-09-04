'use client';

/* oxlint-disable react/react-compiler, next/no-html-link-for-pages */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl';
import type { FeatureCollection, Geometry, Position } from 'geojson';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Check,
  Database,
  FileText,
  Info,
  Layers3,
  List,
  Map as MapIcon,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import 'maplibre-gl/dist/maplibre-gl.css';

type Indicator = {
  id: string;
  label: string;
  unit: string;
  definition: string;
  note?: string;
};
type DataRow = {
  cisp: number;
  aisp: number;
  risp: number;
  period: string;
  phase: number;
  values: Record<string, number>;
};
type Snapshot = {
  generatedAt: string;
  live?: boolean;
  latestPeriod: string;
  latestPhase: number[];
  indicators: Indicator[];
  coverage: { municipality: string; cispCount: number; months: number };
  rows: DataRow[];
};
type PopulationData = {
  reference: string;
  referenceDate: string;
  method: string;
  source: {
    methodologyUrl: string;
    dataUrl: string;
    cispBoundaryUrl: string;
  };
  audit: { populationAssigned: number; cispCount: number };
  records: { cisp: number; population: number; sectors: number }[];
};
type TerritoryRecord = {
  cisp: number;
  aisp: number;
  risp: number;
  territorialUnit: string;
  neighborhoods: string[];
};
type TerritoryData = { records: TerritoryRecord[] };
type CispProperties = {
  cisp: number;
  current?: number;
  previous?: number;
  change?: number | null;
  population?: number;
  rate?: number;
};
type NeighborhoodProperties = { code: number; name: string };
type AreaStat = {
  cisp: number;
  current: number;
  previous: number;
  change: number | null;
  population: number;
  rate: number;
};
type ViewMode = 'rate' | 'quantity' | 'variation';

const monthOptions = [1, 3, 6, 12] as const;
const palette = ['#e7f0f2', '#c2dde1', '#7fb9c2', '#397f8e', '#174f60'];
const groups = [
  { label: 'Visão geral', ids: ['registro_ocorrencias'] },
  { label: 'Patrimônio', ids: ['total_roubos', 'total_furtos', 'estelionato'] },
  { label: 'Tipos de roubo', ids: ['roubo_rua', 'roubo_celular', 'roubo_em_coletivo', 'roubo_veiculo'] },
  { label: 'Tipos de furto', ids: ['furto_veiculos', 'furto_celular'] },
  { label: 'Vida e integridade', ids: ['letalidade_violenta', 'hom_doloso', 'tentat_hom', 'hom_por_interv_policial', 'estupro', 'ameaca'] },
  { label: 'Outros registros', ids: ['pessoas_desaparecidas'] },
] as const;

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const mapStyle = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster' as const,
      source: 'osm',
      paint: {
        'raster-opacity': 0.56,
        'raster-saturation': -0.86,
        'raster-contrast': -0.08,
        'raster-brightness-max': 0.97,
      },
    },
  ],
};

const variationColor: ExpressionSpecification = [
  'case',
  ['==', ['get', 'change'], null],
  '#d7dfe1',
  ['interpolate', ['linear'], ['get', 'change'], -50, '#23647a', -10, '#87b8c2', 0, '#eef1ef', 10, '#e6ad6d', 50, '#bc6c3f'],
];

function sum(rows: DataRow[], indicator: string) {
  return rows.reduce((total, row) => total + (row.values[indicator] ?? 0), 0);
}

function formatPeriod(period: string, long = false) {
  const [year, month] = period.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: long ? 'long' : 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1))).replace('.', '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function periodLabel(months: number) {
  return months === 1 ? 'Último mês' : `Últimos ${months} meses`;
}

function fmtChange(value: number | null) {
  if (value == null) return 'dados insuficientes';
  return `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function flattenCoordinates(geometry: Geometry): Position[] {
  if (geometry.type === 'Polygon') return geometry.coordinates.flat();
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat(2);
  return [];
}

function centerOf(geometry: Geometry): [number, number] {
  const coordinates = flattenCoordinates(geometry);
  if (!coordinates.length) return [-43.34, -22.93];
  const lngs = coordinates.map((coordinate) => Number(coordinate[0]));
  const lats = coordinates.map((coordinate) => Number(coordinate[1]));
  return [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
}

function quantileBreaks(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return [];
  return [...new Set([0.2, 0.4, 0.6, 0.8].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]).filter((value) => value > 0))];
}

function colorExpression(breaks: number[]): ExpressionSpecification {
  if (!breaks.length) return ['literal', '#dce7e9'] as ExpressionSpecification;
  const expression: unknown[] = ['step', ['coalesce', ['get', 'rate'], 0], palette[0]];
  breaks.forEach((value, index) => expression.push(value, palette[Math.min(index + 1, palette.length - 1)]));
  return expression as ExpressionSpecification;
}

function InfoButton({ indicator }: { indicator?: Indicator }) {
  if (!indicator) return null;
  return (
    <Popover>
      <PopoverTrigger aria-label={`Entenda ${indicator.label}`} className="grid size-9 shrink-0 place-items-center rounded-full text-[#1b6473] transition hover:bg-[#e7f0f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b6473]">
        <Info className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(340px,calc(100vw-32px))] rounded-2xl border-[#d8e2e5] p-5 shadow-xl">
        <PopoverTitle className="text-base font-semibold">{indicator.label}</PopoverTitle>
        <PopoverDescription className="mt-2 text-sm leading-6">{indicator.definition}</PopoverDescription>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">O ISP-RJ conta este indicador em <strong>{indicator.unit}</strong>. São registros comunicados à polícia, não todos os fatos ocorridos.</p>
      </PopoverContent>
    </Popover>
  );
}

function BrandMark() {
  return (
    <span aria-hidden="true" className="grid size-10 grid-cols-2 gap-0.5 rounded-[13px] bg-[#14323c] p-2 shadow-[0_8px_22px_rgba(20,50,60,0.18)]">
      <span className="rounded-[4px_2px_2px_3px] bg-[#9bc9cf]" />
      <span className="rounded-[2px_4px_3px_2px] bg-[#f4f7f8]" />
      <span className="rounded-[3px_2px_2px_4px] bg-[#f4f7f8]" />
      <span className="rounded-[2px_3px_4px_2px] bg-[#d9a441]" />
    </span>
  );
}

function ViewToggle({ value, onChange, compact = false }: { value: ViewMode; onChange: (value: ViewMode) => void; compact?: boolean }) {
  const items: { id: ViewMode; label: string; short: string }[] = [
    { id: 'rate', label: 'Taxa por 100 mil', short: 'Taxa' },
    { id: 'quantity', label: 'Quantidade', short: 'Quantidade' },
    { id: 'variation', label: 'Variação', short: 'Variação' },
  ];
  return (
    <div className="grid grid-cols-3 rounded-xl bg-[#edf3f4] p-1" aria-label="Forma de comparação">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onChange(item.id)} aria-pressed={value === item.id} className={`min-h-10 rounded-[9px] px-3 text-xs font-semibold transition duration-200 ${value === item.id ? 'bg-white text-[#14323c] shadow-sm' : 'text-[#60757d] hover:text-[#14323c]'}`}>
          {compact ? item.short : item.label}
        </button>
      ))}
    </div>
  );
}

export function CrimeAtlas() {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectedRef = useRef(16);
  const hoveredRef = useRef<number | null>(null);
  const shouldMoveRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [boundaries, setBoundaries] = useState<FeatureCollection<Geometry, CispProperties> | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<FeatureCollection<Geometry, NeighborhoodProperties> | null>(null);
  const [territories, setTerritories] = useState<TerritoryData | null>(null);
  const [population, setPopulation] = useState<PopulationData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [indicator, setIndicator] = useState('registro_ocorrencias');
  const [viewMode, setViewMode] = useState<ViewMode>('rate');
  const [windowMonths, setWindowMonths] = useState<number>(12);
  const [endPeriod, setEndPeriod] = useState('');
  const [selectedCisp, setSelectedCisp] = useState(16);
  const [hoveredCisp, setHoveredCisp] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [display, setDisplay] = useState<'map' | 'list'>('map');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const cisp = Number(params.get('cisp'));
      const months = Number(params.get('meses'));
      if (cisp > 0) setSelectedCisp(cisp);
      if (params.get('indicador')) setIndicator(params.get('indicador')!);
      if (monthOptions.includes(months as (typeof monthOptions)[number])) setWindowMonths(months);
      if (params.get('fim')) setEndPeriod(params.get('fim')!);
      const view = params.get('visualizacao');
      setViewMode(view === 'quantidade' ? 'quantity' : view === 'variacao' ? 'variation' : 'rate');
      setUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function liveData() {
      const response = await fetch('/api/crime?v=5');
      if (response.ok) {
        const data = (await response.json()) as Snapshot;
        if (data.indicators.some((item) => item.id === 'registro_ocorrencias')) return data;
      }
      const fallback = await fetch('/data/crime-rio-snapshot.json');
      if (!fallback.ok) throw new Error('data unavailable');
      return fallback.json() as Promise<Snapshot>;
    }
    Promise.all([
      liveData(),
      fetch('/data/cisp-rio.geojson').then((r) => r.json()),
      fetch('/data/neighborhoods-rio.geojson').then((r) => r.json()),
      fetch('/data/cisp-neighborhoods.json').then((r) => r.json()),
      fetch('/data/cisp-population.json').then((r) => r.json()),
    ]).then(([data, geo, neighborhoodGeo, territoryData, populationData]) => {
      setSnapshot(data as Snapshot);
      setBoundaries(geo as FeatureCollection<Geometry, CispProperties>);
      setNeighborhoods(neighborhoodGeo as FeatureCollection<Geometry, NeighborhoodProperties>);
      setTerritories(territoryData as TerritoryData);
      setPopulation(populationData as PopulationData);
    }).catch(() => setLoadError(true));
  }, []);

  const periods = useMemo(() => snapshot ? [...new Set(snapshot.rows.map((row) => row.period))].sort() : [], [snapshot]);
  const minimumIndex = Math.max(0, windowMonths - 1);
  const requestedIndex = endPeriod ? periods.indexOf(endPeriod) : periods.length - 1;
  const endIndex = periods.length ? Math.max(minimumIndex, requestedIndex >= 0 ? requestedIndex : periods.length - 1) : -1;
  const effectiveEnd = endIndex >= 0 ? periods[endIndex] : '';
  const currentPeriods = useMemo(() => endIndex >= 0 ? periods.slice(Math.max(0, endIndex - windowMonths + 1), endIndex + 1) : [], [periods, endIndex, windowMonths]);
  const previousPeriods = useMemo(() => endIndex >= 0 ? periods.slice(Math.max(0, endIndex - windowMonths * 2 + 1), endIndex - windowMonths + 1) : [], [periods, endIndex, windowMonths]);
  const hasComparison = currentPeriods.length === previousPeriods.length;
  const periodRange = currentPeriods.length === 1 ? formatPeriod(currentPeriods[0]) : currentPeriods.length ? `${formatPeriod(currentPeriods[0])} – ${formatPeriod(currentPeriods.at(-1)!)}` : '—';
  const populationByCisp = useMemo(() => new Map(population?.records.map((item) => [item.cisp, item.population]) ?? []), [population]);

  const stats = useMemo<AreaStat[]>(() => {
    if (!snapshot || !currentPeriods.length) return [];
    const currentSet = new Set(currentPeriods);
    const previousSet = new Set(previousPeriods);
    return [...new Set(snapshot.rows.map((row) => row.cisp))].sort((a, b) => a - b).map((cisp) => {
      const rows = snapshot.rows.filter((row) => row.cisp === cisp);
      const current = sum(rows.filter((row) => currentSet.has(row.period)), indicator);
      const previous = sum(rows.filter((row) => previousSet.has(row.period)), indicator);
      const denominator = populationByCisp.get(cisp) ?? 0;
      return {
        cisp,
        current,
        previous,
        change: hasComparison && current + previous >= 20 && previous > 0 ? ((current - previous) / previous) * 100 : null,
        population: denominator,
        rate: denominator > 0 ? current / denominator * 100000 : 0,
      };
    });
  }, [snapshot, currentPeriods, previousPeriods, indicator, hasComparison, populationByCisp]);

  const breaks = useMemo(() => quantileBreaks(stats.map((item) => item.rate)), [stats]);
  const mapColor = useMemo<ExpressionSpecification | string>(() => viewMode === 'variation' ? variationColor : viewMode === 'quantity' ? '#dce7e9' : colorExpression(breaks), [viewMode, breaks]);
  const enrichedGeo = useMemo(() => {
    if (!boundaries || !stats.length) return null;
    const byCisp = new Map(stats.map((item) => [item.cisp, item]));
    return { ...boundaries, features: boundaries.features.map((feature) => ({ ...feature, properties: { ...feature.properties, ...byCisp.get(Number(feature.properties.cisp)) } })) };
  }, [boundaries, stats]);
  const pointGeo = useMemo(() => {
    if (!enrichedGeo) return null;
    const maximum = Math.max(1, ...enrichedGeo.features.map((feature) => Number(feature.properties.current)));
    return { type: 'FeatureCollection' as const, features: enrichedGeo.features.map((feature) => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: centerOf(feature.geometry) }, properties: { ...feature.properties, radius: 7 + Math.sqrt(Number(feature.properties.current) / maximum) * 21 } })) };
  }, [enrichedGeo]);
  const geoRef = useRef(enrichedGeo);
  const pointRef = useRef(pointGeo);
  const colorRef = useRef(mapColor);
  const initialViewModeRef = useRef(viewMode);

  useEffect(() => {
    selectedRef.current = selectedCisp;
    if (!urlReady || !effectiveEnd) return;
    const url = new URL(window.location.href);
    url.searchParams.set('cisp', String(selectedCisp));
    url.searchParams.set('indicador', indicator);
    url.searchParams.set('visualizacao', viewMode === 'rate' ? 'taxa' : viewMode === 'quantity' ? 'quantidade' : 'variacao');
    url.searchParams.set('meses', String(windowMonths));
    url.searchParams.set('fim', effectiveEnd);
    window.history.replaceState(null, '', url);
  }, [selectedCisp, indicator, viewMode, windowMonths, effectiveEnd, urlReady]);

  useEffect(() => {
    geoRef.current = enrichedGeo;
    const source = mapRef.current?.getSource('cisp') as maplibregl.GeoJSONSource | undefined;
    if (source && enrichedGeo) void source.setData(enrichedGeo);
  }, [enrichedGeo]);
  useEffect(() => {
    pointRef.current = pointGeo;
    const source = mapRef.current?.getSource('points') as maplibregl.GeoJSONSource | undefined;
    if (source && pointGeo) void source.setData(pointGeo);
  }, [pointGeo]);
  useEffect(() => {
    colorRef.current = mapColor;
    const map = mapRef.current;
    if (!map?.getLayer('cisp-fill')) return;
    map.setPaintProperty('cisp-fill', 'fill-color', mapColor);
    map.setPaintProperty('cisp-circles', 'circle-opacity', viewMode === 'quantity' ? 0.82 : 0);
    map.setPaintProperty('cisp-circles', 'circle-stroke-opacity', viewMode === 'quantity' ? 1 : 0);
  }, [mapColor, viewMode]);

  useEffect(() => {
    if (!mapNode.current || !geoRef.current || !pointRef.current || !neighborhoods || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapNode.current,
      style: mapStyle,
      center: [-43.34, -22.93],
      zoom: 9.55,
      minZoom: 8.55,
      maxZoom: 15,
      maxBounds: [[-44.12, -23.25], [-42.78, -22.62]],
      renderWorldCopies: false,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.on('load', () => {
      map.addSource('cisp', { type: 'geojson', data: geoRef.current!, promoteId: 'cisp' });
      map.addSource('points', { type: 'geojson', data: pointRef.current! });
      map.addSource('bairros', { type: 'geojson', data: neighborhoods });
      map.addLayer({ id: 'cisp-fill', type: 'fill', source: 'cisp', paint: { 'fill-color': colorRef.current, 'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.86, 0.67], 'fill-color-transition': { duration: reducedMotion ? 0 : 300 }, 'fill-opacity-transition': { duration: reducedMotion ? 0 : 180 } } });
      map.addLayer({ id: 'bairro-line', type: 'line', source: 'bairros', minzoom: 9.5, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 9.5, 0.5, 12, 1.15], 'line-opacity': 0.78 } });
      map.addLayer({ id: 'cisp-line', type: 'line', source: 'cisp', paint: { 'line-color': '#254751', 'line-width': 1, 'line-opacity': 0.68 } });
      map.addLayer({ id: 'selected', type: 'line', source: 'cisp', filter: ['==', ['get', 'cisp'], selectedRef.current], paint: { 'line-color': '#d9a441', 'line-width': 4, 'line-blur': 0.2 } });
      map.addLayer({ id: 'cisp-circles', type: 'circle', source: 'points', paint: { 'circle-radius': ['get', 'radius'], 'circle-color': '#1b6473', 'circle-opacity': initialViewModeRef.current === 'quantity' ? 0.82 : 0, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5, 'circle-stroke-opacity': initialViewModeRef.current === 'quantity' ? 1 : 0, 'circle-radius-transition': { duration: reducedMotion ? 0 : 260 }, 'circle-opacity-transition': { duration: reducedMotion ? 0 : 220 } } });
      map.addLayer({ id: 'bairro-label', type: 'symbol', source: 'bairros', minzoom: 10.15, layout: { 'text-field': ['get', 'name'], 'text-size': ['interpolate', ['linear'], ['zoom'], 10.15, 10, 12, 12], 'text-font': ['Open Sans Regular'], 'text-max-width': 9, 'text-allow-overlap': false }, paint: { 'text-color': '#14323c', 'text-halo-color': '#f4f7f8', 'text-halo-width': 1.6 } });
      map.on('click', 'cisp-fill', (event) => {
        const cisp = Number(event.features?.[0]?.properties?.cisp);
        if (cisp) chooseCisp(cisp);
      });
      map.on('mousemove', 'cisp-fill', (event) => {
        const cisp = Number(event.features?.[0]?.properties?.cisp);
        if (!cisp) return;
        if (hoveredRef.current != null) map.setFeatureState({ source: 'cisp', id: hoveredRef.current }, { hover: false });
        hoveredRef.current = cisp;
        map.setFeatureState({ source: 'cisp', id: cisp }, { hover: true });
        map.getCanvas().style.cursor = 'pointer';
        setHoveredCisp(cisp);
      });
      map.on('mouseleave', 'cisp-fill', () => {
        if (hoveredRef.current != null) map.setFeatureState({ source: 'cisp', id: hoveredRef.current }, { hover: false });
        hoveredRef.current = null;
        map.getCanvas().style.cursor = '';
        setHoveredCisp(null);
      });
      map.resize();
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(mapNode.current);
    mapRef.current = map;
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; };
  }, [neighborhoods, reducedMotion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer('selected')) return;
    map.setFilter('selected', ['==', ['get', 'cisp'], selectedCisp]);
    if (!shouldMoveRef.current || !boundaries) return;
    const feature = boundaries.features.find((item) => Number(item.properties.cisp) === selectedCisp);
    const coordinates = feature ? flattenCoordinates(feature.geometry) : [];
    if (coordinates.length) {
      const bounds = coordinates.reduce((box, point) => box.extend(point as [number, number]), new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]));
      map.fitBounds(bounds, { padding: 72, maxZoom: 11.6, duration: reducedMotion ? 0 : 500 });
    }
    shouldMoveRef.current = false;
  }, [selectedCisp, boundaries, reducedMotion]);

  function chooseCisp(cisp: number) {
    shouldMoveRef.current = true;
    setSelectedCisp(cisp);
    setSearch('');
  }

  const indicatorMeta = snapshot?.indicators.find((item) => item.id === indicator);
  const selected = stats.find((item) => item.cisp === selectedCisp);
  const selectedPopulation = population?.records.find((item) => item.cisp === selectedCisp);
  const selectedTerritory = territories?.records.find((item) => item.cisp === selectedCisp);
  const territoryByCisp = new Map(territories?.records.map((item) => [item.cisp, item]) ?? []);
  const hoverStat = stats.find((item) => item.cisp === hoveredCisp);
  const sorted = [...stats].sort((a, b) => {
    const av = viewMode === 'rate' ? a.rate : viewMode === 'quantity' ? a.current : (a.change ?? -Infinity);
    const bv = viewMode === 'rate' ? b.rate : viewMode === 'quantity' ? b.current : (b.change ?? -Infinity);
    return bv - av;
  });
  const rank = sorted.findIndex((item) => item.cisp === selectedCisp) + 1;
  const searchResults = search.trim() ? (territories?.records ?? []).filter((item) => `${item.cisp} ${item.territorialUnit} ${item.neighborhoods.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 6) : [];
  const chartPeriods = periods.slice(Math.max(0, endIndex - 11), endIndex + 1);
  const series = (snapshot?.rows.filter((row) => row.cisp === selectedCisp && chartPeriods.includes(row.period)) ?? []).map((row) => ({ period: row.period, value: row.values[indicator] ?? 0 }));
  const seriesMax = Math.max(1, ...series.map((item) => item.value));
  const cityTotal = sum(snapshot?.rows.filter((row) => currentPeriods.includes(row.period)) ?? [], indicator);
  const overviewIds = ['registro_ocorrencias', 'total_roubos', 'total_furtos', 'letalidade_violenta'];
  const overview = overviewIds.map((id) => ({ id, meta: snapshot?.indicators.find((item) => item.id === id), value: sum(snapshot?.rows.filter((row) => currentPeriods.includes(row.period)) ?? [], id) }));

  async function share() {
    const text = `${indicatorMeta?.label ?? 'Registros'} em ${selectedTerritory?.territorialUnit ?? `CISP ${selectedCisp}`}: ${selected?.current.toLocaleString('pt-BR') ?? '—'} no período (${selected?.rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) ?? '—'} por 100 mil residentes). Dados ISP-RJ.`;
    if (navigator.share) await navigator.share({ title: 'Mapa Aberto RJ', text, url: window.location.href });
    else await navigator.clipboard.writeText(`${text} ${window.location.href}`);
  }

  function resetMap() {
    mapRef.current?.fitBounds([[-43.82, -23.08], [-43.08, -22.75]], { padding: 32, duration: reducedMotion ? 0 : 480 });
  }

  function renderFilterFields(mobile = false) {
    return (
      <div className={mobile ? 'space-y-5' : 'grid items-end gap-3 lg:grid-cols-[minmax(220px,1.35fr)_minmax(300px,1.25fr)_minmax(260px,1fr)_170px]'}>
        <div>
          <p className="mb-2 block text-xs font-semibold text-[#5e737c]">O que mostrar</p>
          <Select value={indicator} onValueChange={(value) => value && setIndicator(value)}>
            <SelectTrigger className="w-full rounded-xl border-[#d8e2e5] bg-white px-3 shadow-none data-[size=default]:h-11"><SelectValue>{indicatorMeta?.label ?? 'Carregando…'}</SelectValue></SelectTrigger>
            <SelectContent className="min-w-[290px] rounded-xl">
              {groups.map((group) => <SelectGroup key={group.label}><SelectLabel className="text-xs font-semibold text-[#5e737c]">{group.label}</SelectLabel>{group.ids.map((id) => { const item = snapshot?.indicators.find((candidate) => candidate.id === id); return item ? <SelectItem key={id} value={id}>{item.label}</SelectItem> : null; })}</SelectGroup>)}
            </SelectContent>
          </Select>
        </div>
        <div><p className="mb-2 text-xs font-semibold text-[#5e737c]">Comparar por</p><ViewToggle value={viewMode} onChange={setViewMode} compact={mobile} /></div>
        <div><p className="mb-2 text-xs font-semibold text-[#5e737c]">Período</p><div className="grid grid-cols-4 gap-1 rounded-xl bg-[#edf3f4] p-1">{monthOptions.map((months) => <button key={months} type="button" onClick={() => setWindowMonths(months)} aria-pressed={windowMonths === months} className={`min-h-10 rounded-[9px] text-xs font-semibold transition ${windowMonths === months ? 'bg-[#1b6473] text-white shadow-sm' : 'text-[#60757d] hover:text-[#14323c]'}`}>{months === 1 ? '1 mês' : `${months} meses`}</button>)}</div></div>
        <div>
          <p className="mb-2 block text-xs font-semibold text-[#5e737c]">Mês final</p>
          <Select value={effectiveEnd} onValueChange={(value) => value && setEndPeriod(value)}><SelectTrigger className="w-full rounded-xl border-[#d8e2e5] bg-white px-3 shadow-none data-[size=default]:h-11"><SelectValue>{effectiveEnd ? formatPeriod(effectiveEnd, true) : '—'}</SelectValue></SelectTrigger><SelectContent className="rounded-xl">{periods.slice(minimumIndex).reverse().map((period) => <SelectItem key={period} value={period}>{formatPeriod(period, true)}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
    );
  }

  if (loadError) return <main className="grid min-h-screen place-items-center bg-[#f4f7f8] p-6"><div className="max-w-md rounded-2xl bg-white p-7 shadow-sm"><h1 className="text-xl font-semibold">Os dados não carregaram.</h1><p className="mt-2 text-sm text-muted-foreground">Tente novamente. A fonte e o período sempre aparecem quando a leitura está disponível.</p></div></main>;

  return (
    <main className="min-h-screen bg-[#f4f7f8] text-[#14323c]">
      <header className="sticky top-0 z-40 border-b border-[#d8e2e5]/90 bg-[#f4f7f8]/92 px-4 py-3 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b6473]"><BrandMark /><span><span className="block text-[15px] font-bold tracking-[-0.02em]">Mapa Aberto <span className="text-[#1b6473]">RJ</span></span><span className="hidden text-xs text-[#6b7f86] sm:block">Informação pública para entender o território</span></span></a>
          <nav className="flex items-center gap-2 text-xs">
            <span className="hidden items-center gap-2 rounded-full bg-white px-3 py-2 text-[#5e737c] shadow-[0_1px_0_rgba(20,50,60,.08)] md:flex"><span className="size-2 rounded-full bg-[#4e9f82]" /> Dados até {snapshot ? formatPeriod(snapshot.latestPeriod) : '—'}</span>
            <a href="/metodologia" className="rounded-full px-3 py-2 font-semibold text-[#1b6473] transition hover:bg-white">Método</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 pb-10 pt-5 md:px-6 md:pt-7">
        <section className="mb-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="mb-1 text-xs font-semibold text-[#1b6473]">Registros de segurança no município do Rio</p>
            <h1 className="max-w-3xl text-[clamp(1.55rem,3vw,2.25rem)] font-semibold leading-[1.12] tracking-[-0.04em]">Veja como os registros mudam em cada região</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60757d]">Compare taxas, quantidades e evolução mensal nas 41 áreas de delegacia. O nome dos bairros vem primeiro; a CISP explica o recorte oficial.</p>
          </div>
          <div className="relative w-full lg:w-[390px]">
            <label htmlFor="area-search" className="sr-only">Busque um bairro ou região</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-[#60757d]" />
            <input id="area-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busque bairro, região ou CISP" className="h-12 w-full rounded-2xl border border-[#d8e2e5] bg-white pl-11 pr-4 text-sm shadow-[0_8px_30px_rgba(20,50,60,.06)] outline-none transition focus:border-[#1b6473] focus:ring-4 focus:ring-[#1b6473]/10" />
            {searchResults.length > 0 && <div className="absolute right-0 top-14 z-50 w-full overflow-hidden rounded-2xl border border-[#d8e2e5] bg-white p-1.5 shadow-2xl">{searchResults.map((item) => <button key={item.cisp} type="button" onClick={() => chooseCisp(item.cisp)} className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#edf3f4]"><span><span className="block text-sm font-semibold">{item.territorialUnit}</span><span className="mt-0.5 block text-xs text-[#60757d]">{item.neighborhoods.slice(0, 4).join(', ')}</span></span><span className="shrink-0 rounded-full bg-[#edf3f4] px-2 py-1 text-[11px] font-semibold text-[#1b6473]">CISP {item.cisp}</span></button>)}</div>}
          </div>
        </section>

        <section className="hidden rounded-[20px] border border-[#d8e2e5] bg-white p-3 shadow-[0_14px_40px_rgba(20,50,60,.06)] lg:block">{renderFilterFields()}</section>
        <section className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
          <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#14323c] px-4 text-xs font-semibold text-white shadow-sm"><SlidersHorizontal className="size-4" /> Filtros</button>
          <button type="button" onClick={() => setFiltersOpen(true)} className="min-h-11 shrink-0 rounded-full border border-[#d8e2e5] bg-white px-4 text-xs font-semibold">{viewMode === 'rate' ? 'Taxa por 100 mil' : viewMode === 'quantity' ? 'Quantidade' : 'Variação'}</button>
          <button type="button" onClick={() => setFiltersOpen(true)} className="min-h-11 shrink-0 rounded-full border border-[#d8e2e5] bg-white px-4 text-xs font-semibold">{periodLabel(windowMonths)}</button>
          <button type="button" onClick={() => setFiltersOpen(true)} className="min-h-11 shrink-0 rounded-full border border-[#d8e2e5] bg-white px-4 text-xs font-semibold">Até {effectiveEnd ? formatPeriod(effectiveEnd) : '—'}</button>
        </section>
        {filtersOpen && <dialog open className="fixed inset-0 z-[80] m-0 size-full max-h-none max-w-none bg-transparent lg:hidden" aria-labelledby="mobile-filter-title"><button type="button" aria-label="Fechar filtros" onClick={() => setFiltersOpen(false)} className="absolute inset-0 bg-[#14323c]/28 backdrop-blur-sm" /><motion.div initial={reducedMotion ? false : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.22 }} className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[24px] bg-white p-5 text-[#14323c] shadow-2xl"><div className="mx-auto mb-4 h-1 w-14 rounded-full bg-[#d8e2e5]" /><h2 id="mobile-filter-title" className="text-lg font-semibold">Escolha o que comparar</h2><p className="mt-1 text-sm text-[#60757d]">Os dados mudam no mapa assim que você seleciona.</p><div className="mt-5">{renderFilterFields(true)}{viewMode === 'rate' && <p className="mt-5 rounded-xl bg-[#f6f1e6] p-3 text-xs leading-5 text-[#6d5a31]">A taxa usa os moradores do Censo 2022 de cada CISP. Em áreas centrais, a população que circula pode ser muito maior.</p>}</div><Button onClick={() => setFiltersOpen(false)} className="mt-5 h-11 w-full rounded-xl bg-[#14323c]"><Check /> Ver no mapa</Button></motion.div></dialog>}

        <section className="mt-4 overflow-hidden rounded-[22px] border border-[#d8e2e5] bg-white shadow-[0_22px_65px_rgba(20,50,60,.09)] lg:grid lg:grid-cols-[minmax(0,1fr)_370px]">
          <div className="relative min-h-[560px] lg:min-h-[680px]">
            <div className="absolute left-3 top-3 z-20 flex rounded-xl border border-[#d8e2e5] bg-white/94 p-1 shadow-lg backdrop-blur md:left-4 md:top-4"><button type="button" onClick={() => setDisplay('map')} aria-pressed={display === 'map'} className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${display === 'map' ? 'bg-[#14323c] text-white' : 'text-[#5e737c]'}`}><MapIcon className="size-3.5" /> Mapa</button><button type="button" onClick={() => setDisplay('list')} aria-pressed={display === 'list'} className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${display === 'list' ? 'bg-[#14323c] text-white' : 'text-[#5e737c]'}`}><List className="size-3.5" /> Lista</button></div>
            {display === 'map' ? <>
              <div className="absolute inset-0"><div ref={mapNode} role="application" aria-label={`${indicatorMeta?.label ?? 'Registros'} por CISP, ${periodRange}`} className="h-full w-full" /></div>
              <button type="button" onClick={resetMap} className="absolute right-3 top-3 z-20 grid size-10 place-items-center rounded-xl border border-[#d8e2e5] bg-white/94 text-[#1b6473] shadow-lg backdrop-blur md:right-4 md:top-4" aria-label="Voltar ao mapa inteiro"><RotateCcw className="size-4" /></button>
              {hoverStat && hoveredCisp && <div className="pointer-events-none absolute left-1/2 top-20 z-30 hidden w-[280px] -translate-x-1/2 rounded-2xl bg-[#14323c] p-4 text-white shadow-2xl md:block"><p className="truncate text-sm font-semibold">{territoryByCisp.get(hoveredCisp)?.territorialUnit}</p><p className="mt-0.5 text-xs text-white/65">CISP {hoveredCisp}</p><div className="mt-3 flex items-end justify-between"><strong className="text-2xl tabular-nums">{viewMode === 'rate' ? hoverStat.rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : hoverStat.current.toLocaleString('pt-BR')}</strong><span className="pb-1 text-xs text-white/65">{viewMode === 'rate' ? 'por 100 mil' : indicatorMeta?.unit}</span></div></div>}
              <div className="absolute bottom-3 left-3 z-20 max-w-[calc(100%-76px)] rounded-2xl border border-[#d8e2e5] bg-white/94 p-3 shadow-lg backdrop-blur md:bottom-4 md:left-4">
                <p className="text-xs font-semibold">{viewMode === 'rate' ? 'Registros por 100 mil moradores' : viewMode === 'quantity' ? 'Quantidade de registros' : 'Mudança frente ao período anterior'}</p>
                {viewMode === 'variation' ? <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#60757d]"><span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-[#23647a]" /> Caiu</span><span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-[#eef1ef]" /> Estável</span><span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-[#bc6c3f]" /> Subiu</span><span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-[#d7dfe1]" /> Sem comparação</span></div> : viewMode === 'quantity' ? <div className="mt-2 flex items-center gap-2 text-[11px] text-[#60757d]"><span className="size-3 rounded-full border border-white bg-[#1b6473]/80 ring-1 ring-[#1b6473]" /><span className="size-5 rounded-full border border-white bg-[#1b6473]/80 ring-1 ring-[#1b6473]" /><span className="size-8 rounded-full border border-white bg-[#1b6473]/80 ring-1 ring-[#1b6473]" /><span>círculo maior = mais registros</span></div> : <><div className="mt-2 flex w-56 overflow-hidden rounded-full">{palette.map((color) => <i key={color} className="h-2 flex-1" style={{ background: color }} />)}</div><div className="mt-1.5 flex justify-between text-[10px] text-[#60757d]"><span>menor faixa</span><span>maior faixa</span></div>{breaks.length > 0 && <p className="mt-1 text-[10px] text-[#60757d]">Cortes: {breaks.map((value) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })).join(' · ')}</p>}</>}
                <p className="mt-1 text-[10px] text-[#60757d]">Faixas relativas às 41 áreas · {periodRange}</p>
              </div>
              <motion.button type="button" onClick={() => document.getElementById('region-panel')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })} key={`${selectedCisp}-${indicator}-${viewMode}`} initial={reducedMotion ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-x-3 top-16 z-30 rounded-2xl border border-[#d8e2e5] bg-white/96 p-4 text-left shadow-2xl backdrop-blur lg:hidden"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{selectedTerritory?.territorialUnit ?? `CISP ${selectedCisp}`}</span><span className="mt-1 block text-xs text-[#60757d]">{selected?.current.toLocaleString('pt-BR') ?? '—'} {indicatorMeta?.unit} · CISP {selectedCisp}</span></span><strong className="shrink-0 text-xl tabular-nums text-[#1b6473]">{viewMode === 'rate' ? selected?.rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : viewMode === 'quantity' ? selected?.current.toLocaleString('pt-BR') : fmtChange(selected?.change ?? null)}<small className="ml-1 text-[10px] font-medium">{viewMode === 'rate' ? '/100 mil' : viewMode === 'quantity' ? indicatorMeta?.unit : 'vs. antes'}</small></strong></div></motion.button>
            </> : <div className="absolute inset-0 overflow-y-auto bg-[#f8faf9] px-3 pb-6 pt-16 md:px-5"><div className="mx-auto max-w-3xl space-y-2">{sorted.map((item, index) => { const territory = territoryByCisp.get(item.cisp); const value = viewMode === 'rate' ? item.rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : viewMode === 'quantity' ? item.current.toLocaleString('pt-BR') : fmtChange(item.change); return <button key={item.cisp} type="button" onClick={() => { chooseCisp(item.cisp); setDisplay('map'); }} className={`grid w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${item.cisp === selectedCisp ? 'border-[#d9a441] bg-[#fffaf0]' : 'border-[#d8e2e5] bg-white'}`}><span className="text-center text-xs font-semibold text-[#60757d]">{index + 1}</span><span><span className="block truncate text-sm font-semibold">{territory?.territorialUnit ?? `CISP ${item.cisp}`}</span><span className="mt-0.5 block text-xs text-[#60757d]">CISP {item.cisp} · {item.current.toLocaleString('pt-BR')} registros</span></span><strong className="text-base tabular-nums text-[#1b6473]">{value}</strong></button>; })}</div></div>}
          </div>

          <aside id="region-panel" className="border-t border-[#d8e2e5] p-5 lg:border-l lg:border-t-0 lg:p-6" aria-live="polite">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#1b6473]">Região selecionada</p><h2 className="mt-1 text-xl font-semibold leading-6 tracking-[-0.025em]">{selectedTerritory?.territorialUnit ?? `Área da ${selectedCisp}ª delegacia`}</h2><p className="mt-1.5 text-xs text-[#60757d]">Área da {selectedCisp}ª delegacia · CISP {selectedCisp}</p></div><InfoButton indicator={indicatorMeta} /></div>
            <div className="mt-7"><p className="text-sm font-medium text-[#60757d]">{indicatorMeta?.label} · {periodRange}</p><motion.div key={`${selectedCisp}-${indicator}-${viewMode}-${effectiveEnd}`} initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-end gap-2"><strong className="text-[42px] font-semibold leading-none tracking-[-0.055em] tabular-nums">{viewMode === 'rate' ? selected?.rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : viewMode === 'quantity' ? selected?.current.toLocaleString('pt-BR') : fmtChange(selected?.change ?? null)}</strong><span className="max-w-24 pb-1 text-xs leading-4 text-[#60757d]">{viewMode === 'rate' ? 'por 100 mil moradores' : viewMode === 'quantity' ? indicatorMeta?.unit : 'vs. período anterior'}</span></motion.div><p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#edf3f4] px-3 py-1.5 text-xs font-semibold text-[#315c68]"><BarChart3 className="size-3.5" /> {rank || '—'}ª maior {viewMode === 'rate' ? 'taxa' : viewMode === 'quantity' ? 'quantidade' : 'variação'} entre 41 áreas</p></div>
            <div className="mt-6 grid grid-cols-3 border-y border-[#d8e2e5] py-4"><div><p className="text-[11px] text-[#60757d]">Quantidade</p><strong className="mt-1 block text-base tabular-nums">{selected?.current.toLocaleString('pt-BR') ?? '—'}</strong></div><div className="border-x border-[#d8e2e5] px-3"><a href={population?.source.methodologyUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#1b6473] underline decoration-[#9bc9cf] underline-offset-2">População estimada ↗</a><strong className="mt-1 block text-base tabular-nums">{selected?.population.toLocaleString('pt-BR') ?? '—'}</strong></div><div className="pl-3"><p className="text-[11px] text-[#60757d]">Variação</p><strong className="mt-1 flex items-center gap-1 text-base tabular-nums">{selected?.change != null && selected.change > 0 ? <ArrowUpRight className="size-4 text-[#a5653f]" /> : selected?.change != null ? <ArrowDownRight className="size-4 text-[#397f8e]" /> : null}{selected ? fmtChange(selected.change) : '—'}</strong></div></div>
            {selected && viewMode === 'rate' && <div className="mt-4 rounded-2xl bg-[#edf3f4] p-3 text-xs leading-5 text-[#315c68]"><strong>Como esta taxa foi calculada:</strong> {selected.current.toLocaleString('pt-BR')} {indicatorMeta?.unit} ÷ {selected.population.toLocaleString('pt-BR')} moradores × 100 mil = {selected.rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}. Isso mede eventos ou vítimas registrados, conforme o indicador, não pessoas únicas.</div>}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-5 text-[#60757d]"><span>Estimativa derivada · {selectedPopulation?.sectors.toLocaleString('pt-BR') ?? '—'} setores do Censo 2022 cruzados com esta CISP</span><a href={population?.source.dataUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#1b6473] underline decoration-[#9bc9cf] underline-offset-2">Base oficial IBGE ↗</a><a href={population?.source.cispBoundaryUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#1b6473] underline decoration-[#9bc9cf] underline-offset-2">Limite oficial ISP-RJ ↗</a></div>
            {selected && selected.population < 50000 && <div className="mt-4 rounded-2xl bg-[#fff6e6] p-3 text-xs leading-5 text-[#755b2d]"><strong>Leia a taxa com cautela.</strong> Esta área tem {selected.population.toLocaleString('pt-BR')} moradores no Censo 2022; trabalhadores, turistas e passageiros não entram no denominador.</div>}
            <div className="mt-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Evolução mensal</p><p className="text-xs text-[#60757d]">Até {effectiveEnd ? formatPeriod(effectiveEnd, true) : '—'}</p></div><span className="text-xs text-[#60757d]">{indicatorMeta?.unit}</span></div><div className="mt-4 flex h-28 items-end gap-1.5" aria-label="Série mensal dos últimos doze meses">{series.map((item) => <div key={item.period} className="group relative flex h-full flex-1 items-end"><motion.div initial={reducedMotion ? false : { height: 0 }} animate={{ height: `${Math.max(4, item.value / seriesMax * 100)}%` }} transition={{ duration: 0.32 }} className="w-full rounded-t-sm bg-[#70a8b1] transition group-hover:bg-[#1b6473]" title={`${formatPeriod(item.period)}: ${item.value}`} /><span className="sr-only">{formatPeriod(item.period)}: {item.value}</span></div>)}</div><div className="mt-1 flex justify-between text-[10px] text-[#60757d]"><span>{series[0] ? formatPeriod(series[0].period) : ''}</span><span>{series.at(-1) ? formatPeriod(series.at(-1)!.period) : ''}</span></div></div>
            <p className="mt-5 text-xs leading-5 text-[#60757d]">A taxa usa a população específica desta CISP, calculada com setores do Censo 2022. Ela mede registros ocorridos na área, não crimes sofridos pelos moradores.</p>
            <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => void share()} className="h-10 rounded-xl bg-[#14323c] px-4 hover:bg-[#1b6473]"><Share2 /> Compartilhar</Button><a href="/metodologia" className={buttonVariants({ variant: 'outline', className: 'h-10 rounded-xl border-[#d8e2e5]' })}><FileText /> Entenda o dado</a></div>
          </aside>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
          <div className="rounded-[20px] border border-[#d8e2e5] bg-white p-5 md:p-6"><div className="flex items-center gap-2"><Layers3 className="size-4 text-[#1b6473]" /><h2 className="text-base font-semibold">Rio em números</h2></div><p className="mt-1 text-sm text-[#60757d]">Contexto da cidade para o mesmo período. Não some os indicadores: alguns já contêm outros.</p><div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 md:grid-cols-4">{overview.map((item) => <button key={item.id} type="button" onClick={() => setIndicator(item.id)} className={`border-l-2 pl-3 text-left transition ${indicator === item.id ? 'border-[#d9a441]' : 'border-[#d8e2e5] hover:border-[#1b6473]'}`}><span className="block text-xs text-[#60757d]">{item.meta?.label}</span><strong className="mt-1 block text-xl tabular-nums">{item.value.toLocaleString('pt-BR')}</strong></button>)}</div></div>
          <div className="rounded-[20px] bg-[#14323c] p-5 text-white md:p-6"><div className="flex items-center gap-2 text-[#9bc9cf]"><Database className="size-4" /><h2 className="text-base font-semibold text-white">Dados que se explicam</h2></div><p className="mt-3 text-sm leading-6 text-white/72">Fonte criminal mensal do ISP-RJ. População do Censo 2022 distribuída pelas geometrias oficiais das CISPs. Não há corte semanal nesta série.</p><div className="mt-5 flex items-center gap-2 text-xs text-white/64"><CalendarRange className="size-4" /> Atualizado até {snapshot ? formatPeriod(snapshot.latestPeriod, true) : '—'}</div><a href="https://www.ispdados.rj.gov.br/EstSeguranca.html" target="_blank" rel="noreferrer" className="mt-4 inline-flex text-xs font-semibold text-[#c6e3e7] underline underline-offset-4">Ver fonte oficial</a></div>
        </section>

        <footer className="mt-7 flex flex-col justify-between gap-2 border-t border-[#d8e2e5] pt-5 text-xs leading-5 text-[#60757d] md:flex-row"><p>CISP pode reunir bairros inteiros ou partes deles. O total permanece agregado na área oficial.</p><p>{cityTotal.toLocaleString('pt-BR')} {indicatorMeta?.unit ?? 'registros'} nas 41 CISPs · {periodRange}.</p></footer>
      </div>
    </main>
  );
}
