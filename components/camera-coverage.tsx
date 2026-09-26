'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map, MapMouseEvent } from 'maplibre-gl';
import { X, SlidersHorizontal, Crosshair, Play } from 'lucide-react';
import {
  cameraCoverageFeatureCollection,
  normalizeCoverageParameters,
  type CoverageParameters,
  type LngLat,
} from '@/lib/camera-coverage';
import type { PublicCamera } from '@/lib/public-cameras';

const sourceId = 'camera-coverage-preview';
const layerIds = [
  'camera-coverage-fill',
  'camera-coverage-outline',
  'camera-coverage-axis',
];
const defaults = { bearingDeg: 0, fovDeg: 60, rangeMeters: 250 };
const storageKey = (id: string) => `mapa-rj:coverage:v1:${id}`;

function readParameters(id: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(id)) || 'null');
    if (saved?.kind === 'manual-simulation')
      return normalizeCoverageParameters(saved.parameters || defaults);
  } catch {
    /* Storage is optional. */
  }
  return defaults;
}

export function CameraCoverage({
  map,
  camera,
  onClose,
  onOpenVideo,
  onExpandMap,
  mapExpanded,
}: {
  map: Map;
  camera: PublicCamera;
  onClose: () => void;
  onOpenVideo: () => void;
  onExpandMap: () => void;
  mapExpanded: boolean;
}) {
  const [parameters, setParameters] = useState<CoverageParameters>(() =>
    readParameters(camera.id),
  );
  const [expanded, setExpanded] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!mapExpanded && window.matchMedia('(max-width: 1023px)').matches) {
      const frame = requestAnimationFrame(() => {
        setExpanded(false);
        setPicking(false);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [mapExpanded]);
  const origin = camera.coordinates as LngLat;
  const data = useMemo(
    () => cameraCoverageFeatureCollection(origin, parameters),
    [origin, parameters],
  );
  const dataRef = useRef(data);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => {
    const panel = panelRef.current;
    const stop = (event: Event) => event.stopPropagation();
    for (const type of ['pointerdown', 'mousedown', 'dblclick', 'wheel']) panel?.addEventListener(type, stop);
    return () => { for (const type of ['pointerdown', 'mousedown', 'dblclick', 'wheel']) panel?.removeEventListener(type, stop); };
  }, []);

  useEffect(() => {
    if (!map.getStyle()) return;
    map.addSource(sourceId, { type: 'geojson', data: dataRef.current });
    const before = map.getLayer('camera-clusters')
      ? 'camera-clusters'
      : undefined;
    map.addLayer(
      {
        id: layerIds[0],
        type: 'fill',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.23 },
      },
      before,
    );
    map.addLayer(
      {
        id: layerIds[1],
        type: 'line',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'line-color': '#b45309',
          'line-width': 2.5,
          'line-dasharray': [3, 2],
        },
      },
      before,
    );
    map.addLayer(
      {
        id: layerIds[2],
        type: 'line',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': '#92400e',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      },
      before,
    );
    return () => {
      if (!map.getStyle()) return;
      for (const id of [...layerIds].reverse())
        if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map]);

  useEffect(() => {
    void (map.getSource(sourceId) as GeoJSONSource | undefined)?.setData(data);
  }, [map, data]);

  const frameCone = useCallback(() => {
    const points = dataRef.current.features[0].geometry.coordinates[0];
    const west = Math.min(...points.map((p) => p[0]));
    const east = Math.max(...points.map((p) => p[0]));
    const south = Math.min(...points.map((p) => p[1]));
    const north = Math.max(...points.map((p) => p[1]));
    const height = map.getContainer().clientHeight;
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      {
        padding: {
          top: Math.min(120, height * 0.2),
          bottom: Math.min((panelRef.current?.offsetHeight ?? 160) + 44, height * 0.65),
          left: 40,
          right: 70,
        },
        maxZoom: 18.5,
        duration: 0,
      },
    );
  }, [map]);
  useEffect(() => {
    frameCone();
  }, [frameCone, camera.id]); // Frame only on explicit selection.

  useEffect(() => {
    if (!picking) return;
    const canvas = map.getCanvas();
    const previousCursor = canvas.style.cursor;
    canvas.style.cursor = 'crosshair';
    const chooseDirection = (event: MapMouseEvent) => {
      const lat1 = (origin[1] * Math.PI) / 180;
      const lat2 = (event.lngLat.lat * Math.PI) / 180;
      const delta = ((event.lngLat.lng - origin[0]) * Math.PI) / 180;
      if (Math.abs(delta) + Math.abs(lat2 - lat1) < 1e-9) return;
      const bearing =
        (Math.atan2(
          Math.sin(delta) * Math.cos(lat2),
          Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(delta),
        ) *
          180) /
        Math.PI;
      setParameters((p) =>
        normalizeCoverageParameters({ ...p, bearingDeg: Math.round(bearing) }),
      );
      setSaved(false);
      setPicking(false);
    };
    map.on('click', chooseDirection);
    return () => {
      map.off('click', chooseDirection);
      canvas.style.cursor = previousCursor;
    };
  }, [map, origin, picking]);

  function update(key: keyof CoverageParameters, value: number) {
    setSaved(false);
    setParameters((current) =>
      normalizeCoverageParameters({ ...current, [key]: value }),
    );
  }
  function save() {
    try {
      localStorage.setItem(
        storageKey(camera.id),
        JSON.stringify({ kind: 'manual-simulation', parameters }),
      );
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }
  const action =
    'min-h-10 rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-amber-950';
  return (
    <section
      ref={panelRef}
      className="camera-coverage-panel absolute bottom-3 left-3 z-30 flex max-h-[calc(100%-128px)] w-[min(340px,calc(100%-76px))] flex-col rounded-xl border border-amber-300 bg-white p-3 text-[#172235] shadow-lg"
      aria-label="Simular campo de visão"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block text-xs text-amber-900">
            Simulação manual · não calibrada
          </strong>
          <p className="mt-1 truncate text-xs" title={camera.name}>
            {camera.name}
          </p>
        </div>
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100"
          aria-label="Fechar simulação de campo de visão"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-slate-600">
        {Math.round(parameters.bearingDeg)}° de direção · {parameters.fovDeg}°
        de abertura · {parameters.rangeMeters} m de raio
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className={action + ' flex flex-1 items-center justify-center gap-1'}
          onClick={() => {
            if (!expanded && window.matchMedia('(max-width: 1023px)').matches) onExpandMap();
            setExpanded(!expanded);
          }}
          aria-expanded={expanded}
        >
          <SlidersHorizontal className="size-3" /> Ajustar
        </button>
        <button
          type="button"
          className={action}
          onClick={frameCone}
          aria-label="Enquadrar cone no mapa"
        >
          <Crosshair className="size-4" />
        </button>
        <button
          type="button"
          className={action + ' flex items-center gap-1'}
          onClick={onOpenVideo}
        >
          <Play className="size-3" /> Vídeo
        </button>
      </div>
      {expanded && (
        <div className="mt-3 min-h-0 max-h-[min(280px,36dvh)] space-y-2 overflow-y-auto overscroll-contain pr-1">
          {(
            [
              ['bearingDeg', 'Direção (0° = norte)', 0, 359, 1, '°'],
              ['fovDeg', 'Abertura horizontal', 10, 120, 5, '°'],
              ['rangeMeters', 'Raio da simulação', 25, 1000, 25, ' m'],
            ] as const
          ).map(([key, label, min, max, step, unit]) => (
            <label key={key} className="block text-xs">
              <span className="flex justify-between gap-2">
                {label}
                <strong>
                  {parameters[key]}
                  {unit}
                </strong>
              </span>
              <input
                className="mt-1 h-6 w-full accent-amber-700"
                aria-label={label}
                type="range"
                min={min}
                max={max}
                step={step}
                value={parameters[key]}
                onChange={(event) => update(key, Number(event.target.value))}
              />
            </label>
          ))}
          <button
            type="button"
            className={action + ' w-full'}
            aria-pressed={picking}
            onClick={() => {
              setPicking(!picking);
              setExpanded(false);
            }}
          >
            {picking
              ? 'Cancelar escolha de direção'
              : 'Apontar direção tocando no mapa'}
          </button>
          <p className="text-[11px] leading-4 text-slate-600">
            Origem aproximada do catálogo. Valores iniciais ilustrativos, sem
            análise de obstáculos, altura ou zoom. O cone não acompanha câmeras
            móveis e não comprova a área filmada.
          </p>
          <div className="flex gap-2">
            <button type="button" className={action + ' flex-1'} onClick={save}>
              {saved ? 'Salvo neste navegador' : 'Salvar ajuste local'}
            </button>
            <button
              type="button"
              className={action}
              onClick={() => {
                setParameters(defaults);
                setSaved(false);
                setPicking(false);
                try {
                  localStorage.removeItem(storageKey(camera.id));
                } catch {
                  /* optional */
                }
              }}
            >
              Redefinir
            </button>
          </div>
        </div>
      )}
      {picking && (
        <button
          type="button"
          className="mt-2 w-full rounded-lg bg-amber-100 p-2 text-xs text-amber-950"
          onClick={() => setPicking(false)}
        >
          Toque no mapa para apontar a direção. Cancelar
        </button>
      )}
    </section>
  );
}
