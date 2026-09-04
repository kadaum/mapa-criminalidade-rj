'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type {
  ExpressionSpecification,
  Map as MapLibreMap,
  MapGeoJSONFeature,
} from 'maplibre-gl';
import type { FeatureCollection, Geometry, Position } from 'geojson';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Database,
  FileText,
  Info,
  MapPinned,
  RotateCcw,
  Share2,
  Users,
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
  source: {
    title: string;
    publisher: string;
    landingPage: string;
    lastModified?: string;
    sha256?: string;
  };
};
type PopulationData = {
  reference: string;
  referenceDate: string;
  method: string;
  audit: {
    sectorCount: number;
    cispCount: number;
    populationTotal: number;
    populationAssigned: number;
    unmatchedSectorCount: number;
    unmatchedPopulation: number;
  };
  records: { cisp: number; population: number; sectors: number }[];
};
type AreaStat = {
  cisp: number;
  current: number;
  previous: number;
  change: number | null;
  latest: number;
  population: number;
  rate: number;
};
type CispProperties = {
  cisp: number;
  aisp?: number;
  current?: number;
  previous?: number;
  change?: number | null;
  latest?: number;
  population?: number;
  rate?: number;
};
type NeighborhoodProperties = {
  code: number;
  name: string;
  ra?: number;
  areaM2?: number;
};
type TerritoryRecord = {
  cisp: number;
  aisp: number;
  risp: number;
  territorialUnit: string;
  neighborhoods: string[];
};
type TerritoryData = {
  records: TerritoryRecord[];
  source: {
    title: string;
    publisher: string;
    url: string;
    landingPage: string;
  };
};
type HoverState = {
  x: number;
  y: number;
  cisp: number;
  current: number;
  change: number | null;
  population: number;
  rate: number;
};
type ViewMode = 'quantity' | 'rate' | 'variation';

const overviewIds = [
  'registro_ocorrencias',
  'total_roubos',
  'total_furtos',
  'letalidade_violenta',
] as const;
const windowOptions = [1, 3, 6, 12] as const;
const indicatorGroups = [
  {
    label: 'Visão geral',
    ids: ['registro_ocorrencias'],
  },
  {
    label: 'Patrimônio',
    ids: ['total_roubos', 'total_furtos', 'estelionato'],
  },
  {
    label: 'Tipos de roubo',
    ids: ['roubo_rua', 'roubo_celular', 'roubo_em_coletivo', 'roubo_veiculo'],
  },
  {
    label: 'Tipos de furto',
    ids: ['furto_veiculos', 'furto_celular'],
  },
  {
    label: 'Vida e integridade',
    ids: [
      'letalidade_violenta',
      'hom_doloso',
      'tentat_hom',
      'hom_por_interv_policial',
      'estupro',
      'ameaca',
    ],
  },
  { label: 'Outros alertas', ids: ['pessoas_desaparecidas'] },
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
        'raster-opacity': 0.62,
        'raster-saturation': -0.75,
        'raster-contrast': -0.12,
        'raster-brightness-max': 0.94,
      },
    },
  ],
};

const variationColorExpression: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['coalesce', ['get', 'change'], 0],
  -50,
  '#2d7180',
  -10,
  '#83adb1',
  0,
  '#ded8cb',
  10,
  '#d39a78',
  50,
  '#be714f',
];
const quantityPalette = ['#f1e8dc', '#e7c9ad', '#d79b72', '#b9604b', '#7e2f2c'];

function sum(rows: DataRow[], indicator: string) {
  return rows.reduce((total, row) => total + (row.values[indicator] ?? 0), 0);
}

function formatPeriod(period: string) {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace('.', '');
}

function fmtChange(change: number | null) {
  if (change === null) return 'volume pequeno';
  return `${change > 0 ? '+' : ''}${change.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function windowLabel(months: number) {
  return `${months} ${months === 1 ? 'mês' : 'meses'}`;
}

function flattenCoordinates(geometry: Geometry): Position[] {
  if (geometry.type === 'Polygon') return geometry.coordinates.flat();
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat(2);
  return [];
}

function quantileBreaks(values: number[]) {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!sorted.length) return [];
  return [
    ...new Set(
      [0.2, 0.4, 0.6, 0.8]
        .map(
          (quantile) =>
            sorted[
              Math.min(sorted.length - 1, Math.floor(sorted.length * quantile))
            ],
        )
        .filter((value) => value > 0),
    ),
  ];
}

function metricColorExpression(
  property: 'current' | 'rate',
  breaks: number[],
): ExpressionSpecification {
  if (!breaks.length) {
    return [
      'case',
      ['>=', ['coalesce', ['get', property], 0], 0],
      '#e4e1da',
      '#e4e1da',
    ];
  }
  const expression: unknown[] = [
    'step',
    ['coalesce', ['get', property], 0],
    quantityPalette[0],
  ];
  breaks.forEach((value, index) =>
    expression.push(
      value,
      quantityPalette[Math.min(index + 1, quantityPalette.length - 1)],
    ),
  );
  return expression as ExpressionSpecification;
}

function IndicatorInfo({
  indicator,
  compact = false,
}: {
  indicator?: Indicator;
  compact?: boolean;
}) {
  if (!indicator) return null;
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`O que significa ${indicator.label}?`}
        className={`grid shrink-0 place-items-center rounded-full border border-[#15313d]/20 bg-background text-[#315e59] transition-colors hover:border-[#315e59] hover:bg-[#e8efed] ${compact ? 'size-6' : 'size-7'}`}
      >
        <Info className={compact ? 'size-3.5' : 'size-4'} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(320px,calc(100vw-32px))] border-[#15313d]/15 bg-[#fffdf8] p-4"
      >
        <PopoverTitle className="font-heading text-base font-semibold">
          {indicator.label}
        </PopoverTitle>
        <PopoverDescription className="text-xs leading-5">
          {indicator.definition}
        </PopoverDescription>
        <p className="text-[10px] leading-4 text-muted-foreground">
          O ISP conta este indicador em <strong>{indicator.unit}</strong>. O
          mapa mostra registros comunicados à polícia, não todos os fatos que
          ocorreram.
        </p>
      </PopoverContent>
    </Popover>
  );
}

export function CrimeExplorer() {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectedCispRef = useRef(16);
  const userSelectedRef = useRef(false);
  const reducedMotion = useReducedMotion();

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [boundaries, setBoundaries] = useState<FeatureCollection<
    Geometry,
    CispProperties
  > | null>(null);
  const [neighborhoodBoundaries, setNeighborhoodBoundaries] =
    useState<FeatureCollection<Geometry, NeighborhoodProperties> | null>(null);
  const [territories, setTerritories] = useState<TerritoryData | null>(null);
  const [populationData, setPopulationData] = useState<PopulationData | null>(
    null,
  );
  const [hover, setHover] = useState<HoverState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [indicator, setIndicator] = useState('registro_ocorrencias');
  const [selectedCisp, setSelectedCisp] = useState(16);
  const [viewMode, setViewMode] = useState<ViewMode>('rate');
  const [windowMonths, setWindowMonths] = useState<number>(12);
  const [endPeriod, setEndPeriod] = useState('');
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const cisp = Number(params.get('cisp'));
      const months = Number(params.get('meses'));
      const requestedIndicator = params.get('indicador');
      const requestedView = params.get('visualizacao');
      if (Number.isFinite(cisp) && cisp > 0) setSelectedCisp(cisp);
      if (requestedIndicator) setIndicator(requestedIndicator);
      if (windowOptions.includes(months as (typeof windowOptions)[number]))
        setWindowMonths(months);
      if (params.get('fim')) setEndPeriod(params.get('fim') ?? '');
      setViewMode(
        requestedView === 'variacao'
          ? 'variation'
          : requestedView === 'quantidade'
            ? 'quantity'
            : 'rate',
      );
      setUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadSnapshot = async (): Promise<Snapshot> => {
      const live = await fetch('/api/crime?v=4');
      if (live.ok) {
        const data = (await live.json()) as Snapshot;
        if (data.indicators.some((item) => item.id === 'registro_ocorrencias'))
          return data;
      }
      const fallback = await fetch('/data/crime-rio-snapshot.json');
      if (!fallback.ok) throw new Error('No data source');
      return fallback.json() as Promise<Snapshot>;
    };
    Promise.all([
      loadSnapshot(),
      fetch('/data/cisp-rio.geojson').then(
        (response) =>
          response.json() as Promise<
            FeatureCollection<Geometry, CispProperties>
          >,
      ),
      fetch('/data/neighborhoods-rio.geojson').then(
        (response) =>
          response.json() as Promise<
            FeatureCollection<Geometry, NeighborhoodProperties>
          >,
      ),
      fetch('/data/cisp-neighborhoods.json').then(
        (response) => response.json() as Promise<TerritoryData>,
      ),
      fetch('/data/cisp-population.json').then(
        (response) => response.json() as Promise<PopulationData>,
      ),
    ])
      .then(([data, geo, neighborhoodGeo, territoryData, population]) => {
        setSnapshot(data);
        setBoundaries(geo);
        setNeighborhoodBoundaries(neighborhoodGeo);
        setTerritories(territoryData);
        setPopulationData(population);
      })
      .catch(() => setLoadError(true));
  }, []);

  const periods = useMemo(
    () =>
      snapshot
        ? [...new Set(snapshot.rows.map((row) => row.period))].sort()
        : [],
    [snapshot],
  );
  const minimumEndIndex = Math.max(0, windowMonths - 1);
  const requestedEndIndex = endPeriod
    ? periods.indexOf(endPeriod)
    : periods.length - 1;
  const endIndex = periods.length
    ? Math.max(
        minimumEndIndex,
        requestedEndIndex >= 0 ? requestedEndIndex : periods.length - 1,
      )
    : -1;
  const effectiveEndPeriod = endIndex >= 0 ? periods[endIndex] : '';
  const currentPeriods = useMemo(
    () =>
      endIndex >= 0
        ? periods.slice(Math.max(0, endIndex - windowMonths + 1), endIndex + 1)
        : [],
    [periods, endIndex, windowMonths],
  );
  const previousPeriods = useMemo(
    () =>
      endIndex >= 0
        ? periods.slice(
            Math.max(0, endIndex - windowMonths * 2 + 1),
            endIndex - windowMonths + 1,
          )
        : [],
    [periods, endIndex, windowMonths],
  );
  const hasPreviousComparison =
    previousPeriods.length === currentPeriods.length;
  const availableEndPeriods = periods.slice(minimumEndIndex);
  const periodRange =
    currentPeriods.length === 1
      ? formatPeriod(currentPeriods[0])
      : currentPeriods.length
        ? `${formatPeriod(currentPeriods[0])}–${formatPeriod(currentPeriods.at(-1)!)}`
        : '—';

  useEffect(() => {
    selectedCispRef.current = selectedCisp;
    if (!urlReady || !effectiveEndPeriod) return;
    const url = new URL(window.location.href);
    url.searchParams.set('cisp', String(selectedCisp));
    url.searchParams.set('indicador', indicator);
    url.searchParams.set(
      'visualizacao',
      viewMode === 'quantity'
        ? 'quantidade'
        : viewMode === 'rate'
          ? 'taxa'
          : 'variacao',
    );
    url.searchParams.set('meses', String(windowMonths));
    url.searchParams.set('fim', effectiveEndPeriod);
    window.history.replaceState(null, '', url);
  }, [
    selectedCisp,
    indicator,
    viewMode,
    windowMonths,
    effectiveEndPeriod,
    urlReady,
  ]);

  const populationByCisp = useMemo(
    () =>
      new Map(
        populationData?.records.map((record) => [
          record.cisp,
          record.population,
        ]) ?? [],
      ),
    [populationData],
  );
  const stats = useMemo(() => {
    if (!snapshot || !populationData || !currentPeriods.length)
      return [] as AreaStat[];
    const currentWindow = new Set(currentPeriods);
    const previousWindow = new Set(previousPeriods);
    return [...new Set(snapshot.rows.map((row) => row.cisp))]
      .sort((a, b) => a - b)
      .map((cisp) => {
        const rows = snapshot.rows.filter((row) => row.cisp === cisp);
        const current = sum(
          rows.filter((row) => currentWindow.has(row.period)),
          indicator,
        );
        const previous = sum(
          rows.filter((row) => previousWindow.has(row.period)),
          indicator,
        );
        const population = populationByCisp.get(cisp) ?? 0;
        return {
          cisp,
          current,
          previous,
          change:
            hasPreviousComparison && current + previous >= 20 && previous > 0
              ? ((current - previous) / previous) * 100
              : null,
          latest: sum(
            rows.filter((row) => row.period === effectiveEndPeriod),
            indicator,
          ),
          population,
          rate: population > 0 ? (current / population) * 100000 : 0,
        };
      });
  }, [
    snapshot,
    populationData,
    currentPeriods,
    previousPeriods,
    indicator,
    effectiveEndPeriod,
    populationByCisp,
    hasPreviousComparison,
  ]);

  const metricProperty = viewMode === 'rate' ? 'rate' : 'current';
  const breaks = useMemo(
    () => quantileBreaks(stats.map((item) => item[metricProperty])),
    [stats, metricProperty],
  );
  const mapColorExpression = useMemo(
    () =>
      viewMode === 'variation'
        ? variationColorExpression
        : metricColorExpression(metricProperty, breaks),
    [viewMode, metricProperty, breaks],
  );
  const enrichedGeo = useMemo(() => {
    if (!boundaries || !stats.length) return null;
    const byCisp = new Map(stats.map((item) => [item.cisp, item]));
    return {
      ...boundaries,
      features: boundaries.features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          ...byCisp.get(Number(feature.properties.cisp)),
        },
      })),
    };
  }, [boundaries, stats]);
  const enrichedGeoRef = useRef(enrichedGeo);
  const neighborhoodGeoRef = useRef(neighborhoodBoundaries);
  const mapColorRef = useRef(mapColorExpression);
  const mapReady = Boolean(
    enrichedGeo && neighborhoodBoundaries && territories && populationData,
  );

  useEffect(() => {
    enrichedGeoRef.current = enrichedGeo;
    const source = mapRef.current?.getSource('cisp') as
      | maplibregl.GeoJSONSource
      | undefined;
    if (source && enrichedGeo) void source.setData(enrichedGeo);
  }, [enrichedGeo]);

  useEffect(() => {
    neighborhoodGeoRef.current = neighborhoodBoundaries;
  }, [neighborhoodBoundaries]);

  useEffect(() => {
    mapColorRef.current = mapColorExpression;
    const map = mapRef.current;
    if (map?.getLayer('cisp-fill'))
      map.setPaintProperty('cisp-fill', 'fill-color', mapColorExpression);
  }, [mapColorExpression]);

  useEffect(() => {
    const initialGeo = enrichedGeoRef.current;
    const initialNeighborhoods = neighborhoodGeoRef.current;
    if (
      !mapNode.current ||
      !mapReady ||
      !initialGeo ||
      !initialNeighborhoods ||
      mapRef.current
    )
      return;
    const map = new maplibregl.Map({
      container: mapNode.current,
      style: mapStyle,
      center: [-43.34, -22.93],
      zoom: 9.65,
      minZoom: 8.5,
      maxZoom: 15,
      attributionControl: false,
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right',
    );
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left',
    );
    map.on('load', () => {
      map.addSource('cisp', { type: 'geojson', data: initialGeo });
      map.addSource('bairros', { type: 'geojson', data: initialNeighborhoods });
      map.addLayer({
        id: 'cisp-fill',
        type: 'fill',
        source: 'cisp',
        paint: {
          'fill-color': mapColorRef.current,
          'fill-opacity': 0.62,
          'fill-color-transition': { duration: reducedMotion ? 0 : 320 },
        },
      });
      map.addLayer({
        id: 'bairro-line',
        type: 'line',
        source: 'bairros',
        minzoom: 9.4,
        paint: {
          'line-color': '#ffffff',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9.4,
            0.45,
            12,
            1.2,
          ],
          'line-opacity': 0.82,
        },
      });
      map.addLayer({
        id: 'cisp-line',
        type: 'line',
        source: 'cisp',
        paint: {
          'line-color': '#15313d',
          'line-width': 1,
          'line-opacity': 0.68,
        },
      });
      map.addLayer({
        id: 'cisp-selected',
        type: 'line',
        source: 'cisp',
        filter: ['==', ['get', 'cisp'], selectedCispRef.current],
        paint: { 'line-color': '#e2af4a', 'line-width': 4, 'line-blur': 0.4 },
      });
      map.addLayer({
        id: 'bairro-label',
        type: 'symbol',
        source: 'bairros',
        minzoom: 10.1,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 10.1, 10, 12, 12],
          'text-font': ['Open Sans Regular'],
          'text-max-width': 9,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#15313d',
          'text-halo-color': '#f5f1e8',
          'text-halo-width': 1.4,
          'text-halo-blur': 0.4,
        },
      });
      map.on('click', 'cisp-fill', (event) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        if (feature?.properties?.cisp) {
          userSelectedRef.current = true;
          setSelectedCisp(Number(feature.properties.cisp));
        }
      });
      map.on('mousemove', 'cisp-fill', (event) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature) return;
        map.getCanvas().style.cursor = 'pointer';
        setHover({
          x: event.point.x,
          y: event.point.y,
          cisp: Number(feature.properties.cisp),
          current: Number(feature.properties.current),
          change:
            feature.properties.change == null
              ? null
              : Number(feature.properties.change),
          population: Number(feature.properties.population),
          rate: Number(feature.properties.rate),
        });
      });
      map.on('mouseleave', 'cisp-fill', () => {
        map.getCanvas().style.cursor = '';
        setHover(null);
      });
      map.resize();
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(mapNode.current);
    mapRef.current = map;
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [mapReady, reducedMotion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer('cisp-selected')) return;
    map.setFilter('cisp-selected', ['==', ['get', 'cisp'], selectedCisp]);
    if (!userSelectedRef.current || !boundaries) return;
    const feature = boundaries.features.find(
      (item) => Number(item.properties.cisp) === selectedCisp,
    );
    const coordinates = feature ? flattenCoordinates(feature.geometry) : [];
    if (coordinates.length) {
      const bounds = coordinates.reduce(
        (box, coordinate) => box.extend(coordinate as [number, number]),
        new maplibregl.LngLatBounds(
          coordinates[0] as [number, number],
          coordinates[0] as [number, number],
        ),
      );
      map.fitBounds(bounds, {
        padding: 72,
        duration: reducedMotion ? 0 : 520,
        maxZoom: 12,
      });
    }
    userSelectedRef.current = false;
  }, [selectedCisp, boundaries, reducedMotion]);

  const selected = stats.find((item) => item.cisp === selectedCisp);
  const selectedIndicator = snapshot?.indicators.find(
    (item) => item.id === indicator,
  );
  const cityTotal = sum(
    snapshot?.rows.filter((row) => currentPeriods.includes(row.period)) ?? [],
    indicator,
  );
  const selectedTerritory = territories?.records.find(
    (record) => record.cisp === selectedCisp,
  );
  const territoryByCisp = new Map(
    territories?.records.map((record) => [record.cisp, record]) ?? [],
  );
  const chartPeriods = periods.slice(Math.max(0, endIndex - 11), endIndex + 1);
  const selectedSeries = (
    snapshot?.rows.filter(
      (row) => row.cisp === selectedCisp && chartPeriods.includes(row.period),
    ) ?? []
  ).map((row) => ({ period: row.period, value: row.values[indicator] ?? 0 }));
  const seriesMax = Math.max(1, ...selectedSeries.map((item) => item.value));
  const overview = overviewIds.map((id) => {
    const meta = snapshot?.indicators.find((item) => item.id === id);
    const current = sum(
      snapshot?.rows.filter((row) => currentPeriods.includes(row.period)) ?? [],
      id,
    );
    const previous = sum(
      snapshot?.rows.filter((row) => previousPeriods.includes(row.period)) ??
        [],
      id,
    );
    return {
      id,
      meta,
      label: meta?.label ?? id,
      current,
      change:
        hasPreviousComparison && current + previous >= 20 && previous > 0
          ? ((current - previous) / previous) * 100
          : null,
    };
  });

  async function share() {
    const rateText = selected
      ? ` (${selected.rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por 100 mil residentes do Censo 2022)`
      : '';
    const text = `${selectedIndicator?.label ?? 'Registros'} na CISP ${selectedCisp} (${selectedTerritory?.territorialUnit ?? 'área da delegacia'}): ${selected?.current.toLocaleString('pt-BR') ?? '—'} em ${periodRange}${rateText}. Total da CISP, não de cada bairro. Dados oficiais ISP-RJ.`;
    if (navigator.share)
      await navigator.share({
        title: 'Mapa Aberto RJ',
        text,
        url: window.location.href,
      });
    else await navigator.clipboard.writeText(`${text} ${window.location.href}`);
  }

  function resetView() {
    setIndicator('registro_ocorrencias');
    setViewMode('rate');
    setWindowMonths(12);
    setEndPeriod('');
  }

  if (loadError)
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md border-l-4 border-[#be714f] bg-card p-6">
          <h1 className="font-heading text-xl font-semibold">
            Os dados não carregaram.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tente novamente. A fonte e a data sempre aparecem quando a leitura
            está disponível.
          </p>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-[#15313d]/15 bg-background/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center bg-[#15313d] text-[#f5f1e8]">
              <MapPinned className="size-5" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold tracking-tight">
                Mapa Aberto RJ
              </p>
              <p className="text-[11px] text-muted-foreground">
                Atlas cívico dos registros policiais
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="hidden sm:inline">
              Rio de Janeiro · dados até{' '}
              {snapshot ? formatPeriod(snapshot.latestPeriod) : '—'}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-[#315e59]">
              <Database className="size-3.5" /> ISP-RJ
            </span>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-[1540px] px-4 pb-8 pt-5 md:px-8 md:pt-7">
        <div className="grid gap-4 border-b border-[#15313d]/15 pb-5 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52717a]">
              Registros de segurança no Rio
            </p>
            <h1 className="mt-1 max-w-xl font-heading text-3xl font-semibold leading-tight tracking-[-0.035em] md:text-4xl">
              Compare as regiões de forma mais justa
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              O mapa começa por registros a cada 100 mil moradores. A quantidade
              bruta continua sempre visível para dar contexto.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 pb-1 lg:grid-cols-4 lg:gap-x-6">
            {overview.map((item) => (
              <div
                key={item.id}
                className={`relative min-w-0 border-l-2 py-1 pl-3 pr-7 transition-colors ${indicator === item.id ? 'border-[#e2af4a]' : 'border-[#15313d]/18 hover:border-[#52717a]'}`}
              >
                <button
                  type="button"
                  onClick={() => setIndicator(item.id)}
                  aria-pressed={indicator === item.id}
                  className="w-full text-left"
                >
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    {item.label}
                  </span>
                  <motion.strong
                    key={`${item.id}-${item.current}`}
                    initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-0.5 block font-heading text-xl font-semibold tabular-nums"
                  >
                    {snapshot ? item.current.toLocaleString('pt-BR') : '—'}
                  </motion.strong>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    {item.change != null && item.change > 0 ? (
                      <ArrowUpRight className="size-3 text-[#a4543d]" />
                    ) : (
                      <ArrowDownRight className="size-3 text-[#326675]" />
                    )}{' '}
                    {snapshot ? fmtChange(item.change) : '—'} ·{' '}
                    {windowLabel(windowMonths)}
                  </span>
                </button>
                <div className="absolute right-0 top-0">
                  <IndicatorInfo indicator={item.meta} compact />
                </div>
              </div>
            ))}
          </div>
        </div>

        <details
          aria-label="Filtros do mapa"
          className="group mt-5 border border-[#15313d]/15 bg-card shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 xl:hidden">
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Filtros do mapa
              </span>
              <span className="mt-1 block truncate text-sm font-semibold">
                {selectedIndicator?.label ?? 'Carregando…'} ·{' '}
                {viewMode === 'rate'
                  ? 'por 100 mil'
                  : viewMode === 'quantity'
                    ? 'quantidade'
                    : 'mudança'}
              </span>
              <span className="block text-xs text-muted-foreground">
                {windowLabel(windowMonths)} · até{' '}
                {effectiveEndPeriod ? formatPeriod(effectiveEndPeriod) : '—'}
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-[#315e59] group-open:hidden">
              Alterar
            </span>
            <span className="hidden shrink-0 text-xs font-semibold text-[#315e59] group-open:inline">
              Fechar
            </span>
          </summary>
          <div className="hidden p-4 pt-0 group-open:block xl:block xl:pt-4">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#15313d]/10 pb-3">
              <div>
                <p className="text-sm font-semibold">Monte sua comparação</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarRange className="size-3.5" /> Período analisado:{' '}
                  {periodRange}
                </p>
              </div>
              <button
                type="button"
                onClick={resetView}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#315e59] hover:underline"
              >
                <RotateCcw className="size-3.5" /> Voltar ao padrão
              </button>
            </div>
            <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(240px,1.15fr)_minmax(360px,1.35fr)_minmax(300px,1fr)_170px]">
              <div className="min-w-0">
                <label
                  htmlFor="indicator-select"
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  O que você quer ver?
                </label>
                <Select
                  value={indicator}
                  onValueChange={(value) => value && setIndicator(value)}
                >
                  <SelectTrigger
                    id="indicator-select"
                    className="h-10 w-full border-[#15313d]/20 bg-background"
                  >
                    <SelectValue>
                      {selectedIndicator?.label ?? 'Carregando indicadores…'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="min-w-[280px]">
                    {indicatorGroups.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="font-semibold uppercase tracking-[0.08em]">
                          {group.label}
                        </SelectLabel>
                        {group.ids.map((id) => {
                          const item = snapshot?.indicators.find(
                            (candidate) => candidate.id === id,
                          );
                          return item ? (
                            <SelectItem key={item.id} value={item.id}>
                              {item.label}
                            </SelectItem>
                          ) : null;
                        })}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Como comparar as regiões?
                </p>
                <div className="grid min-h-10 grid-cols-3 border border-[#15313d]/20 bg-background p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('rate')}
                    aria-pressed={viewMode === 'rate'}
                    className={`px-2 py-1.5 text-[10px] font-semibold leading-4 transition-colors ${viewMode === 'rate' ? 'bg-[#15313d] text-white' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Por 100 mil moradores
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('quantity')}
                    aria-pressed={viewMode === 'quantity'}
                    className={`px-2 py-1.5 text-[10px] font-semibold leading-4 transition-colors ${viewMode === 'quantity' ? 'bg-[#15313d] text-white' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Quantidade de registros
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('variation')}
                    aria-pressed={viewMode === 'variation'}
                    className={`px-2 py-1.5 text-[10px] font-semibold leading-4 transition-colors ${viewMode === 'variation' ? 'bg-[#15313d] text-white' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Mudança no período
                  </button>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Qual período analisar?
                </p>
                <div className="grid h-10 grid-cols-4 border border-[#15313d]/20 bg-background p-0.5">
                  {windowOptions.map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setWindowMonths(months)}
                      aria-pressed={windowMonths === months}
                      className={`px-1 text-[10px] font-semibold transition-colors ${windowMonths === months ? 'bg-[#315e59] text-white' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {windowLabel(months)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label
                  htmlFor="end-select"
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Terminando em
                </label>
                <Select
                  value={effectiveEndPeriod}
                  onValueChange={(value) => value && setEndPeriod(value)}
                >
                  <SelectTrigger
                    id="end-select"
                    className="h-10 w-full border-[#15313d]/20 bg-background"
                  >
                    <SelectValue>
                      {effectiveEndPeriod
                        ? formatPeriod(effectiveEndPeriod)
                        : '—'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[...availableEndPeriods].reverse().map((period) => (
                      <SelectItem key={period} value={period}>
                        {formatPeriod(period)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {viewMode === 'rate' && (
              <p className="mt-3 border-l-2 border-[#e2af4a] pl-3 text-[11px] leading-5 text-muted-foreground">
                <strong className="text-foreground">
                  Base de comparação: moradores do Censo 2022.
                </strong>{' '}
                A taxa ajuda a comparar áreas de tamanhos diferentes, mas áreas
                centrais ou turísticas podem receber muito mais pessoas do que
                as que moram nelas.
              </p>
            )}
            {!hasPreviousComparison && (
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                A quantidade e a taxa continuam disponíveis. A mudança
                percentual não aparece porque este mês não possui uma janela
                anterior completa dentro dos 36 meses carregados.
              </p>
            )}
          </div>
        </details>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_350px]">
          <section className="relative order-1 h-[60vh] min-h-[500px] overflow-hidden border border-[#15313d]/18 bg-[#d9e3e2] lg:h-[calc(100vh-330px)] lg:min-h-[620px]">
            <div ref={mapNode} className="h-full w-full" />

            {hover && (
              <div
                className="pointer-events-none absolute z-10 min-w-[210px] max-w-[270px] border border-[#15313d]/15 bg-[#15313d] px-3 py-2 text-[#f5f1e8] shadow-xl"
                style={{
                  left: `min(calc(100% - 280px), ${hover.x + 14}px)`,
                  top: Math.max(16, hover.y - 28),
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.1em] text-[#b9d9de]">
                  CISP {hover.cisp}
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  {hover.current.toLocaleString('pt-BR')}{' '}
                  {selectedIndicator?.unit}
                </p>
                <p className="text-[11px]">
                  {territoryByCisp.get(hover.cisp)?.territorialUnit}
                </p>
                <p className="mt-1 text-[10px] text-[#b9d9de]">
                  {hover.rate.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  })}{' '}
                  por 100 mil · {hover.population.toLocaleString('pt-BR')}{' '}
                  residentes
                </p>
                <p className="text-[10px] text-[#b9d9de]">
                  {fmtChange(hover.change)} vs. período anterior
                </p>
              </div>
            )}

            <div className="pointer-events-none absolute bottom-3 left-3 bg-[#f5f1e8]/94 px-3 py-2 text-[10px] shadow-sm backdrop-blur">
              {viewMode === 'variation' ? (
                <>
                  <p className="mb-1.5 font-semibold">
                    Variação · {windowLabel(windowMonths)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 bg-[#2d7180]" />
                    <span>caiu</span>
                    <span className="ml-2 size-2.5 bg-[#ded8cb]" />
                    <span>estável</span>
                    <span className="ml-2 size-2.5 bg-[#be714f]" />
                    <span>subiu</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-1.5 font-semibold">
                    {viewMode === 'rate'
                      ? 'Registros por 100 mil moradores'
                      : `Quantidade · ${windowLabel(windowMonths)}`}
                  </p>
                  <div className="flex w-52">
                    {quantityPalette.map((color) => (
                      <span
                        key={color}
                        className="h-2 flex-1"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex w-52 justify-between text-[9px] text-muted-foreground">
                    <span>menor faixa</span>
                    <span>maior faixa</span>
                  </div>
                  {breaks.length > 0 && (
                    <p className="mt-1 max-w-52 text-[9px] leading-4 text-muted-foreground">
                      Cortes entre faixas:{' '}
                      {breaks
                        .map((value) =>
                          value.toLocaleString('pt-BR', {
                            maximumFractionDigits: viewMode === 'rate' ? 1 : 0,
                          }),
                        )
                        .join(' · ')}
                    </p>
                  )}
                  {viewMode === 'rate' && (
                    <p className="mt-1 text-[9px] text-muted-foreground">
                      Taxa do período · Censo 2022
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          <motion.aside
            initial={reducedMotion ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="order-2 border-t-4 border-[#e2af4a] bg-card p-5 shadow-sm lg:min-h-[680px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Região selecionada
                </p>
                <h2 className="mt-1 font-heading text-xl font-semibold leading-6 tracking-tight">
                  {selectedTerritory?.territorialUnit ??
                    `Área da ${selectedCisp}ª delegacia`}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Área da {selectedCisp}ª delegacia · CISP {selectedCisp} ·
                  dados fase {snapshot?.latestPhase?.join('/') ?? '—'}
                </p>
              </div>
              <div
                className={`mt-1 flex items-center gap-1 text-sm font-semibold ${selected?.change != null && selected.change > 0 ? 'text-[#a4543d]' : 'text-[#326675]'}`}
              >
                {selected?.change != null && selected.change > 0 ? (
                  <ArrowUpRight className="size-5" />
                ) : (
                  <ArrowDownRight className="size-5" />
                )}
                {selected ? fmtChange(selected.change) : '—'}
              </div>
            </div>
            <div className="mt-5 border-t border-[#15313d]/10 pt-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">
                  {selectedIndicator?.label}
                </p>
                <IndicatorInfo indicator={selectedIndicator} compact />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {periodRange}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div
                className={`p-3 ${viewMode === 'rate' ? 'border-2 border-[#315e59] bg-[#e8efed]' : 'border border-[#15313d]/10 bg-[#edf1ee]'}`}
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Por 100 mil moradores
                </p>
                <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
                  {selected?.rate.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  }) ?? '—'}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  taxa no período
                </p>
              </div>
              <div
                className={`p-3 ${viewMode === 'quantity' ? 'border-2 border-[#315e59] bg-[#e8efed]' : 'border border-[#15313d]/10 bg-[#edf1ee]'}`}
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Quantidade registrada
                </p>
                <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
                  {selected?.current.toLocaleString('pt-BR') ?? '—'}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {selectedIndicator?.unit} no período
                </p>
              </div>
              <div className="border border-[#15313d]/10 bg-[#edf1ee] p-3">
                <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <Users className="size-3" /> Moradores
                </p>
                <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
                  {selected?.population.toLocaleString('pt-BR') ?? '—'}
                </p>
                <p className="text-[9px] text-muted-foreground">Censo 2022</p>
              </div>
              <div
                className={`p-3 ${viewMode === 'variation' ? 'border-2 border-[#315e59] bg-[#e8efed]' : 'border border-[#15313d]/10 bg-[#edf1ee]'}`}
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Mudança
                </p>
                <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
                  {selected ? fmtChange(selected.change) : '—'}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  vs. período anterior
                </p>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
              A quantidade anterior foi{' '}
              {selected?.previous.toLocaleString('pt-BR') ?? '—'}. A população é
              específica desta CISP; a taxa não mede pessoas em circulação.
            </p>
            {selected && selected.population < 50000 && (
              <p className="mt-3 border-l-2 border-[#be714f] bg-[#f7eee8] px-3 py-2 text-[10px] leading-4 text-[#6e3b2d]">
                <strong>Denominador pequeno:</strong> esta CISP tem apenas{' '}
                {selected.population.toLocaleString('pt-BR')} moradores no Censo
                2022. Fluxo de trabalhadores, turistas e passageiros pode elevar
                muito a taxa; leia sempre junto com a quantidade.
              </p>
            )}
            <div className="mt-6 border-y border-[#15313d]/12 py-5">
              <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                <span>
                  Evolução mensal · até{' '}
                  {effectiveEndPeriod ? formatPeriod(effectiveEndPeriod) : '—'}
                </span>
                <span>{selectedIndicator?.unit}</span>
              </div>
              <div
                className="flex h-28 items-end gap-1.5"
                aria-label="Série dos doze meses até o mês selecionado"
              >
                {selectedSeries.map((item) => (
                  <div
                    key={item.period}
                    className="group relative flex h-full flex-1 items-end"
                  >
                    <motion.div
                      initial={reducedMotion ? false : { height: 0 }}
                      animate={{
                        height: `${Math.max(5, (item.value / seriesMax) * 100)}%`,
                      }}
                      transition={{ duration: 0.32 }}
                      className="w-full bg-[#527f8d] transition-colors group-hover:bg-[#15313d]"
                      title={`${formatPeriod(item.period)}: ${item.value}`}
                    />
                    <span className="absolute -bottom-4 left-1/2 hidden -translate-x-1/2 text-[8px] text-muted-foreground first:block last:block">
                      {item.period.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {selectedIndicator?.note && (
              <div className="mt-6 flex gap-2 text-xs leading-5 text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>{selectedIndicator.note}</p>
              </div>
            )}
            <div className="mt-6 bg-[#edf1ee] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Contexto da cidade
              </p>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
                {cityTotal.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedIndicator?.unit ?? 'registros'} nas 41 CISPs ·{' '}
                {periodRange}.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                onClick={() => void share()}
                className="h-9 bg-[#15313d] text-[#f5f1e8] hover:bg-[#284956]"
              >
                <Share2 /> Compartilhar
              </Button>
              <Link
                href="/metodologia"
                className={buttonVariants({
                  variant: 'outline',
                  className: 'h-9',
                })}
              >
                <FileText /> Entenda o número
              </Link>
            </div>
          </motion.aside>
        </div>
        <footer className="mt-4 flex flex-col justify-between gap-2 border-t border-[#15313d]/15 pt-4 text-[11px] leading-5 text-muted-foreground md:flex-row">
          <p>
            A fonte criminal é mensal; não há corte semanal nesta série. CISP
            pode reunir bairros inteiros ou partes deles.
          </p>
          <p>
            {snapshot?.live
              ? 'Fonte consultada automaticamente nesta sessão.'
              : 'Snapshot validado usado como contingência.'}{' '}
            <a
              href="https://www.ispdados.rj.gov.br/EstSeguranca.html"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#315e59] underline underline-offset-4"
            >
              Fonte ISP-RJ
            </a>
          </p>
        </footer>
      </section>
    </main>
  );
}
