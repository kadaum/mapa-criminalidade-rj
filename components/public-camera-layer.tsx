'use client';

// MapLibre callbacks use refs to read the current catalog without rebuilding the map.
/* oxlint-disable react/react-compiler */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Popup,
  type GeoJSONSource,
  type Map,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { Camera, Copy, MapPin, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CameraPlayer } from '@/components/camera-player';
import { cameraCoverageFeatureCollection, normalizeCoverageParameters } from '@/lib/camera-coverage';
import {
  cameraReference,
  compareCameraPlayback,
  preferredCameraSource,
  publicCameras,
  precisionLabels,
  statusLabels,
  accessLabels,
  type PublicCamera,
  type CameraCatalog,
} from '@/lib/public-cameras';

const sourceId = 'public-camera-points';
const selectedSourceId = 'selected-camera-point';
const automaticCoverageSource = 'camera-automatic-coverage';
const cameraIconIds = {
  observed: 'camera-reference-observed',
  unverified: 'camera-reference-unverified',
  failed: 'camera-reference-failed',
  offline: 'camera-reference-offline',
  selected: 'camera-reference-selected',
};
const cameraLayers = [
  'camera-automatic-coverage-fill',
  'camera-automatic-coverage-line',
  'camera-clusters',
  'camera-cluster-count',
  'camera-points',
  'selected-camera-halo',
  'selected-camera',
];
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

function cameraMarkerImage(color: string, selected = false) {
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  context.fillStyle = selected ? '#f59e0b' : '#ffffff';
  context.beginPath();
  context.arc(24, 25, 22, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(24, 25, selected ? 18 : 20, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(7, 16, 34, 23, 5);
  context.fill();
  context.fillRect(14, 11, 11, 7);
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(24, 27.5, 7, 0, Math.PI * 2);
  context.fill();
  return context.getImageData(0, 0, size, size);
}

function coordinateLabel([lng, lat]: [number, number]) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function catalogId(camera: PublicCamera) {
  return camera.id.replace(/^camerasrj-/, '');
}

export function useCameraWorkspace(
  map: Map | null,
  visible: boolean,
  focus: (coordinates: [number, number]) => void,
  revealPanel: () => void,
) {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [catalog, setCatalog] = useState<CameraCatalog>({
    reviewedAt: '08/09/2026',
    cameras: publicCameras,
  });
  const [loadState, setLoadState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [selected, setSelected] = useState<PublicCamera | null>(null);
  const [query, setQuery] = useState('');
  const [publisher, setPublisher] = useState('all');
  const [onlyObserved, setOnlyObserved] = useState(false);
  const [clusterSelection, setClusterSelection] = useState<string[] | null>(
    null,
  );
  const [onlyPublic, setOnlyPublic] = useState(true);
  const [location, setLocation] = useState<'mapped' | 'pending'>('mapped');
  const [inView, setInView] = useState(true);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(
    null,
  );
  const [limit, setLimit] = useState(60);
  const popupRef = useRef<Popup | null>(null);
  const active = enabled && visible;
  const loaded = useRef(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('cameras') === '1')
      setEnabled(true);
  }, []);
  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSelected(null);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('cameras', '1');
    else url.searchParams.delete('cameras');
    window.history.replaceState(null, '', url);
  }
  useEffect(() => {
    if (!enabled || loaded.current) return;
    const controller = new AbortController();
    setLoadState('loading');
    fetch('/data/public-cameras.json', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Catalog unavailable');
        return r.json();
      })
      .then((value) => {
        const data = value as CameraCatalog;
        if (!Array.isArray(data.cameras) || !data.cameras.length)
          throw new Error('Invalid catalog');
        setCatalog(data);
        loaded.current = true;
        setLoadState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadState('error');
      });
    return () => controller.abort();
  }, [enabled, loadAttempt]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return catalog.cameras.filter(
      (camera) =>
        (!onlyPublic || camera.access === 'public') &&
        (!onlyObserved || camera.status === 'observed') &&
        (publisher === 'all' || camera.publisher === publisher) &&
        (!needle ||
          normalize(
            `${camera.name} ${camera.neighborhood} ${camera.id}`,
          ).includes(needle)),
    );
  }, [catalog, query, publisher, onlyPublic, onlyObserved]);
  const mapped = useMemo(
    () => filtered.filter((camera) => camera.coordinates !== null),
    [filtered],
  );
  const geojson = useMemo(
    (): FeatureCollection<Point> => ({
      type: 'FeatureCollection',
      features: mapped.map((camera) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: camera.coordinates! },
        properties: { id: camera.id, status: camera.status },
      })),
    }),
    [mapped],
  );
  const highlightedCamera = selected;
  const selectedGeojson = useMemo(
    (): FeatureCollection<Point> => ({
      type: 'FeatureCollection',
      features:
        highlightedCamera?.coordinates == null
          ? []
          : [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: highlightedCamera.coordinates },
                properties: { id: highlightedCamera.id, status: highlightedCamera.status },
              },
            ],
    }),
    [highlightedCamera],
  );
  const dataRef = useRef(geojson);
  const selectedDataRef = useRef(selectedGeojson);
  const filteredRef = useRef(filtered);
  dataRef.current = geojson;
  selectedDataRef.current = selectedGeojson;
  filteredRef.current = filtered;

  function showCamera(camera: PublicCamera) {
    setSelected(preferredCameraSource(camera, catalog.cameras));
  }
  const revealRef = useRef(revealPanel);
  revealRef.current = revealPanel;
  const showRef = useRef(showCamera);
  showRef.current = showCamera;

  useEffect(() => {
    if (!map || !active) return;
    let disposed = false;
    const updateBounds = () => {
      const b = map.getBounds();
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    };
    let popup: Popup | null = null;
    const closePopup = () => {
      popup?.remove();
      popup = null;
    };
    const showOnMap = (
      coordinates: [number, number],
      cameras: PublicCamera[],
    ) => {
      closePopup();
      const content = document.createElement('div');
      content.className = 'camera-map-preview';
      const heading = document.createElement('h3');
      heading.textContent =
        cameras.length === 1
          ? cameras[0].name
          : cameras.length + ' câmeras neste ponto';
      content.appendChild(heading);
      const note = document.createElement('p');
      const sameLocation = cameras.every(
        (camera) =>
          camera.coordinates?.[0] === cameras[0].coordinates?.[0] &&
          camera.coordinates?.[1] === cameras[0].coordinates?.[1],
      );
      if (cameras.length > 1 && !sameLocation)
        heading.textContent = cameras.length + ' câmeras nesta área';
      note.textContent =
        cameras.length > 1 && sameLocation
          ? 'Estas câmeras compartilham a mesma referência aproximada. Escolha qual imagem abrir.'
          : cameras.length === 1
            ? precisionLabels[cameras[0].precision] +
              '. O ponto não confirma a posição do equipamento nem a área filmada.'
            : 'Localização aproximada do catálogo. Escolha a imagem para abrir.';
      content.appendChild(note);
      const list = document.createElement('div');
      list.className = 'camera-map-preview-list';
      [...cameras].sort(compareCameraPlayback).forEach((camera) => {
        const button = document.createElement('button');
        button.type = 'button';
        const name = document.createElement('strong');
        name.textContent = cameras.length === 1 ? 'Abrir vídeo' : camera.name;
        const detail = document.createElement('span');
        detail.textContent =
          'ID ' + catalogId(camera) + ' · ' + camera.publisher + ' · ' + statusLabels[camera.status] + (camera.checkedAt ? ' em ' + camera.checkedAt : '');
        button.appendChild(name);
        button.appendChild(detail);
        button.addEventListener('click', () => {
          showRef.current(camera);
        });
        list.appendChild(button);
      });
      content.appendChild(list);
      popup = new Popup({
        className: 'camera-map-popup',
        closeButton: true,
        closeOnClick: true,
        maxWidth: '280px',
        offset: 22,
        focusAfterOpen: true,
      })
        .setLngLat(coordinates)
        .setDOMContent(content)
        .addTo(map);
      popupRef.current = popup;
      popup
        .getElement()
        .querySelector('button.maplibregl-popup-close-button')
        ?.setAttribute('aria-label', 'Fechar câmeras deste ponto');
    };
    const selectPoint = (event: MapLayerMouseEvent) => {
      const ids = new Set(event.features?.map(f => String(f.properties.id)));
      const cameras = filteredRef.current.filter(c => ids.has(c.id) && c.coordinates);
      if (cameras.length) showOnMap(cameras[0].coordinates!, cameras);
    };
    const selectCone = (event: MapLayerMouseEvent) => {
      // Markers and numbered groups have priority over the sectors beneath them.
      if (map.queryRenderedFeatures(event.point, { layers: ['camera-points', 'camera-clusters'] }).length) return;
      const ids = new Set(event.features?.map(f => String(f.properties.cameraId)));
      const cameras = filteredRef.current.filter(c => ids.has(c.id) && c.coordinates);
      if (cameras.length === 1) showRef.current(cameras[0]);
      else if (cameras.length) showOnMap([event.lngLat.lng, event.lngLat.lat], cameras);
    };
    const expandCluster = async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const source = map.getSource(sourceId) as GeoJSONSource | undefined;
      if (!feature || !source || feature.geometry.type !== 'Point') return;
      const coords = feature.geometry.coordinates as [number, number];
      try {
        const id = Number(feature.properties.cluster_id);
        const zoom = await source.getClusterExpansionZoom(id);
        if (disposed) return;
        // Small groups and street-level clusters open an anchored chooser.
        // Large regional groups zoom in to keep the list useful.
        if (Number(feature.properties.point_count) > 12 && map.getZoom() < 17 && zoom <= map.getMaxZoom() && map.getZoom() < map.getMaxZoom()) {
          closePopup();
          map.easeTo({
            center: coords,
            zoom: Math.min(map.getMaxZoom(), Math.max(zoom, map.getZoom() + 1)),
            duration: window.matchMedia('(prefers-reduced-motion: reduce)')
              .matches
              ? 0
              : 350,
          });
          return;
        }
        const leaves = await source.getClusterLeaves(
          id,
          Number(feature.properties.point_count),
          0,
        );
        if (disposed) return;
        const ids = new Set(leaves.map((f) => String(f.properties?.id)));
        const cameras = filteredRef.current.filter((camera) =>
          ids.has(camera.id),
        );
        if (cameras.length) {
          showOnMap(coords, cameras);
        }
      } catch {
        /* A rapid filter change can remove the old cluster. */
      }
    };
    const pointer = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const resetPointer = () => {
      map.getCanvas().style.cursor = '';
    };
    let coverageSignature = '';
    let coverageUpdate = 0;
    const updateAutomaticCoverage = async () => {
      const update = ++coverageUpdate;
      const catalogSnapshot = filteredRef.current;
      if (disposed || !map.getLayer('camera-points')) return;
      const source = map.getSource(automaticCoverageSource) as GeoJSONSource | undefined;
      if (!source) return;
      const ids = new Set(map.queryRenderedFeatures({ layers: ['camera-points'] }).map(f => String(f.properties.id)));
      // Cluster geometry is quantized: use membership IDs, never coordinate equality.
      const groups = map.getZoom() >= 15
        ? map.queryRenderedFeatures({ layers: ['camera-clusters'] }).filter(f => Number(f.properties.point_count) <= 12)
        : [];
      const pointSource = map.getSource(sourceId) as GeoJSONSource | undefined;
      if (pointSource && groups.length) {
        try {
          const members = await Promise.all(groups.map(g => pointSource.getClusterLeaves(Number(g.properties.cluster_id), Number(g.properties.point_count), 0)));
          if (disposed || update !== coverageUpdate || catalogSnapshot !== filteredRef.current) return;
          for (const member of members.flat()) ids.add(String(member.properties?.id));
        } catch { return; /* Filters may replace a cluster while it resolves. */ }
      }
      const cameras = catalogSnapshot.filter(c => c.coordinates && c.coverage && ids.has(c.id));
      const entries = cameras.map(camera => ({
        camera,
        parameters: normalizeCoverageParameters(camera.coverage!),
      }));
      const signature = JSON.stringify(entries.map(({ camera, parameters }) => [camera.id, camera.coordinates, parameters]));
      if (signature === coverageSignature) return;
      coverageSignature = signature;
      void source.setData({ type: 'FeatureCollection', features: entries.flatMap(({ camera, parameters }) =>
        cameraCoverageFeatureCollection(camera.coordinates!, parameters, 20).features.map(feature => ({ ...feature, properties: { ...feature.properties, cameraId: camera.id } }))
      ) });
    };
    const setup = () => {
      // The parent may remove and recreate the map when its motion setting
      // changes. A removed MapLibre instance no longer has a style or images.
      if (disposed || !map.getStyle() || map.getSource(sourceId)) return;
      const icons: Array<[string, string, boolean?]> = [
        [cameraIconIds.observed, '#0f766e'],
        [cameraIconIds.unverified, '#2563eb'],
        [cameraIconIds.failed, '#b45309'],
        [cameraIconIds.offline, '#64748b'],
        [cameraIconIds.selected, '#0f766e', true],
      ];
      for (const [id, color, selected] of icons)
        if (!map.hasImage(id))
          map.addImage(id, cameraMarkerImage(color, selected));
      map.addSource(sourceId, {
        type: 'geojson',
        data: dataRef.current,
        cluster: true,
        clusterRadius: 45,
        // Keep co-located catalog references grouped at the closest useful zoom.
        clusterMaxZoom: 19,
        maxzoom: 20,
      });
      map.addSource(selectedSourceId, {
        type: 'geojson',
        data: selectedDataRef.current,
      });
      map.addSource(automaticCoverageSource, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'camera-automatic-coverage-fill', type: 'fill', source: automaticCoverageSource,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.14 },
      });
      map.addLayer({
        id: 'camera-automatic-coverage-line', type: 'line', source: automaticCoverageSource,
        paint: { 'line-color': '#b45309', 'line-opacity': 0.65, 'line-width': 1.5, 'line-dasharray': [3, 2] },
      });
      map.addLayer({
        id: 'camera-clusters',
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0f766e',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            19,
            20,
            23,
            100,
            28,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      map.addLayer({
        id: 'camera-cluster-count',
        type: 'symbol',
        source: sourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 13,
          'text-font': ['Noto Sans Regular'],
        },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: 'camera-points',
        type: 'symbol',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': [
            'match',
            ['get', 'status'],
            'observed',
            cameraIconIds.observed,
            'failed',
            cameraIconIds.failed,
            'offline',
            cameraIconIds.offline,
            cameraIconIds.unverified,
          ],
          'icon-size': 0.67,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });
      map.addLayer({
        id: 'selected-camera-halo',
        type: 'circle',
        source: selectedSourceId,
        paint: {
          'circle-radius': 19,
          'circle-color': '#ffffff',
          'circle-opacity': 0.92,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#f59e0b',
        },
      });
      map.addLayer({
        id: 'selected-camera',
        type: 'symbol',
        source: selectedSourceId,
        layout: {
          'icon-image': cameraIconIds.selected,
          'icon-size': 0.84,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });
      map.on('click', 'camera-automatic-coverage-fill', selectCone);
      map.on('mouseenter', 'camera-automatic-coverage-fill', pointer);
      map.on('mouseleave', 'camera-automatic-coverage-fill', resetPointer);
      map.on('click', 'camera-points', selectPoint);
      map.on('click', 'camera-clusters', expandCluster);
      map.on('mouseenter', 'camera-points', pointer);
      map.on('mouseenter', 'camera-clusters', pointer);
      map.on('mouseleave', 'camera-points', resetPointer);
      map.on('mouseleave', 'camera-clusters', resetPointer);
      map.setLayoutProperty('osm', 'visibility', 'visible');
      map.setPaintProperty('cisp-fill', 'fill-opacity', 0);
      updateBounds();
    };
    // The parent exposes this map only after its initial layers are installed.
    map.on('load', setup);
    setup();
    map.on('moveend', updateBounds);
    map.on('idle', updateAutomaticCoverage);
    return () => {
      disposed = true;
      closePopup();
      map.off('load', setup);
      map.off('moveend', updateBounds);
      map.off('idle', updateAutomaticCoverage);
      map.off('click', 'camera-automatic-coverage-fill', selectCone);
      map.off('mouseenter', 'camera-automatic-coverage-fill', pointer);
      map.off('mouseleave', 'camera-automatic-coverage-fill', resetPointer);
      map.off('click', 'camera-points', selectPoint);
      map.off('click', 'camera-clusters', expandCluster);
      map.off('mouseenter', 'camera-points', pointer);
      map.off('mouseenter', 'camera-clusters', pointer);
      map.off('mouseleave', 'camera-points', resetPointer);
      map.off('mouseleave', 'camera-clusters', resetPointer);
      if (map.getStyle()) {
        for (const id of [...cameraLayers].reverse())
          if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(automaticCoverageSource)) map.removeSource(automaticCoverageSource);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        if (map.getSource(selectedSourceId)) map.removeSource(selectedSourceId);
      }
      resetPointer();
    };
  }, [map, active]);
  useEffect(() => {
    popupRef.current?.remove();
    if (!map?.getStyle()) return;
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (source) void source.setData(geojson);
  }, [map, geojson]);
  useEffect(() => {
    if (!map?.getStyle()) return;
    const source = map.getSource(selectedSourceId) as GeoJSONSource | undefined;
    if (source) void source.setData(selectedGeojson);
  }, [map, selectedGeojson]);
  const results = useMemo(
    () =>
      filtered.filter((camera) => {
        if (clusterSelection) return clusterSelection.includes(camera.id);
        if (location === 'pending') return !camera.coordinates;
        if (!camera.coordinates) return false;
        const [lng, lat] = camera.coordinates;
        return (
          !inView ||
          !bounds ||
          (lng >= bounds[0] &&
            lng <= bounds[2] &&
            lat >= bounds[1] &&
            lat <= bounds[3])
        );
      }),
    [filtered, bounds, location, inView, clusterSelection],
  );
  const publishers = useMemo(
    () => [...new Set(catalog.cameras.map((c) => c.publisher))].sort(),
    [catalog],
  );
  const totalMapped = catalog.cameras.filter((c) => c.coordinates).length;
  const sharedReferenceCount = selected?.coordinates
    ? catalog.cameras.filter(
        (camera) =>
          camera.coordinates?.[0] === selected.coordinates?.[0] &&
          camera.coordinates?.[1] === selected.coordinates?.[1],
      ).length
    : 0;

  return {
    active,
    toggle,
    controls: visible && (
      <>
        <div className="absolute left-3 top-17 z-20 flex overflow-hidden rounded-lg border border-[#dce2ed] bg-white shadow-lg md:left-4 md:top-18">
          <button
            type="button"
            aria-pressed={enabled}
            onClick={toggle}
            className={`flex min-h-11 items-center gap-2 px-3 text-xs font-semibold ${enabled ? 'bg-teal-800 text-white' : 'text-[#172235]'}`}
          >
            <Camera className="size-4" /> Câmeras{' '}
            {enabled && (
              <span className="rounded bg-white/15 px-1.5">
                {mapped.length.toLocaleString('pt-BR')}
              </span>
            )}
          </button>
          {enabled && (
            <button
              type="button"
              onClick={revealPanel}
              className="min-h-11 border-l px-3 text-xs font-semibold lg:hidden"
            >
              Ver lista
            </button>
          )}
        </div>
      </>
    ),
    panel: (
      <aside
        id="camera-panel"
        tabIndex={-1}
        className="atlas-panel camera-panel border-t border-[#dce2ed] bg-white p-4 lg:border-l lg:border-t-0"
        aria-label="Explorar câmeras"
      >
        {active && selected && (
          <CameraViewer
            key={selected.id}
            camera={selected}
            sharedReferenceCount={sharedReferenceCount}
            onClose={() => setSelected(null)}
            onLocate={() => {
              if (selected.coordinates) {
                focus(selected.coordinates);
                setSelected(null);
                map
                  ?.getContainer()
                  .scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          />
        )}
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Câmeras no Rio</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {totalMapped.toLocaleString('pt-BR')} referências no mapa ·{' '}
                {(catalog.cameras.length - totalMapped).toLocaleString('pt-BR')}{' '}
                com localização pendente
              </p>
            </div>
            <Camera className="mt-1 size-5 shrink-0 text-teal-800" />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Escolha um ponto ou procure abaixo. Os marcadores indicam locais de
            referência, não a área filmada.
          </p>
          {catalog.playbackAudit && (
            <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-600">
              Verificação de disponibilidade: {catalog.playbackAudit.checked.toLocaleString('pt-BR')} de {catalog.playbackAudit.total.toLocaleString('pt-BR')} fontes analisadas nesta rodada.
              {' '}Atualizado em {new Date(catalog.playbackAudit.updatedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
              {' '}O resultado de cada fonte aparece abaixo; acesso restrito e teste inconclusivo não contam como vídeo funcionando.
            </p>
          )}
          {loadState === 'ready' && (
            <details
              className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-3"
              open
            >
              <summary className="cursor-pointer text-sm font-semibold text-teal-950">
                Vídeos com reprodução conferida
              </summary>
              <p className="mt-2 text-xs leading-5 text-teal-950">
                Abrem aqui no site. A conferência é da data indicada; a fonte
                pode interromper a transmissão.
              </p>
              <div className="mt-2 grid gap-2">
                {catalog.cameras
                  .filter(
                    (camera) =>
                      camera.status === 'observed' &&
                      camera.access === 'public' &&
                      !camera.recording &&
                      (camera.youtubeId || camera.publisher === 'CamerasRJ'),
                  )
                  .slice(0, 8)
                  .map((camera) => (
                    <button
                      key={camera.id}
                      type="button"
                      onClick={() => showCamera(camera)}
                      className="min-h-11 rounded-lg border border-teal-200 bg-white p-3 text-left text-xs hover:border-teal-700"
                    >
                      <strong className="block">{camera.name}</strong>
                      <span className="mt-1 block text-muted-foreground">
                        Conferido em {camera.checkedAt}
                        {!camera.coordinates
                          ? ' · posição da câmera ainda não confirmada'
                          : ''}
                      </span>
                    </button>
                  ))}
              </div>
            </details>
          )}
          {loadState === 'loading' && (
            <output className="mt-3 block text-xs">Carregando catálogo…</output>
          )}
          {loadState === 'error' && (
            <p role="alert" className="mt-3 rounded border p-3 text-xs">
              O catálogo completo não carregou. Mostrando apenas o ponto
              inicial.
              <button
                type="button"
                className="mt-2 block min-h-10 font-semibold underline"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              >
                Tentar carregar novamente
              </button>
            </p>
          )}
          <label className="relative mt-4 block">
            <span className="sr-only">Buscar câmera, bairro ou rua</span>
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => {
                setClusterSelection(null);
                setInView(!event.target.value.trim());
                setQuery(event.target.value);
                setLimit(60);
              }}
              placeholder="Câmera, bairro ou rua"
              className="h-11 w-full rounded-lg border bg-white pl-9 pr-3 text-sm"
            />
          </label>
          <label className="mt-3 block text-xs font-medium">
            Fonte
            <select
              value={publisher}
              onChange={(event) => {
                setClusterSelection(null);
                setPublisher(event.target.value);
                setLimit(60);
              }}
              className="mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm"
            >
              <option value="all">Todas as fontes</option>
              {publishers.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <div className="mt-3 flex rounded-lg border p-1 text-xs">
            <button
              type="button"
              aria-pressed={location === 'mapped'}
              onClick={() => {
                setClusterSelection(null);
                setLocation('mapped');
                setLimit(60);
              }}
              className={`min-h-10 flex-1 rounded px-2 ${location === 'mapped' ? 'bg-teal-800 text-white' : ''}`}
            >
              No mapa ({mapped.length.toLocaleString('pt-BR')})
            </button>
            <button
              type="button"
              aria-pressed={location === 'pending'}
              onClick={() => {
                setClusterSelection(null);
                setLocation('pending');
                setLimit(60);
              }}
              className={`min-h-10 flex-1 rounded px-2 ${location === 'pending' ? 'bg-teal-800 text-white' : ''}`}
            >
              Localização pendente (
              {(filtered.length - mapped.length).toLocaleString('pt-BR')})
            </button>
          </div>
          <label className="mt-3 flex min-h-8 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={onlyPublic}
              onChange={(e) => setOnlyPublic(e.target.checked)}
            />{' '}
            Sem cadastro ou assinatura
          </label>
          {location === 'mapped' && (
            <label className="flex min-h-8 items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={inView}
                onChange={(e) => setInView(e.target.checked)}
              />{' '}
              Apenas na área visível do mapa
            </label>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {results.length.toLocaleString('pt-BR')} referências encontradas ·
            reprodução depende da fonte
          </p>
          <label className="mt-2 flex min-h-8 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={onlyObserved}
              onChange={(e) => {
                setOnlyObserved(e.target.checked);
                setClusterSelection(null);
              }}
            />{' '}
            Apenas reprodução confirmada no teste
          </label>
          {clusterSelection && (
            <div className="mt-3 rounded-lg bg-teal-50 p-3 text-sm">
              <strong>{results.length} referências neste grupo</strong>
              <p className="mt-1 text-xs leading-5 text-teal-950">
                Se várias referências usarem o mesmo ponto, ele é uma
                localização aproximada compartilhada; não confirma instalações
                separadas.
              </p>
              <button
                className="mt-2 block text-xs underline"
                type="button"
                onClick={() => setClusterSelection(null)}
              >
                Voltar à área do mapa
              </button>
            </div>
          )}
          <div className="mt-3 space-y-2">
            {results.slice(0, limit).map((camera) => (
              <button
                key={camera.id}
                type="button"
                onClick={() => showCamera(camera)}
                className="w-full rounded-xl border bg-white p-3 text-left hover:border-teal-700 hover:bg-teal-50 focus-visible:outline-2"
              >
                <span className="block text-sm font-semibold">
                  {camera.name}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {camera.neighborhood} · {camera.publisher}
                </span>
                <span
                  className={`mt-2 inline-block rounded px-2 py-1 text-[11px] ${camera.status === 'observed' ? 'bg-teal-50 text-teal-800' : camera.status === 'failed' ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700'}`}
                >
                  {camera.access === 'public' &&
                  (camera.youtubeId || camera.publisher === 'CamerasRJ')
                    ? 'Abrir vídeo aqui'
                    : 'Ver acesso na fonte'}
                </span>
                <span className="mt-1 block text-[11px] text-slate-600">
                  {statusLabels[camera.status]}{camera.checkedAt ? ' · ' + camera.checkedAt : ''}
                </span>
                {camera.access !== 'public' && (
                  <span className="ml-1 text-xs">
                    {accessLabels[camera.access]}
                  </span>
                )}
              </button>
            ))}
          </div>
          {!results.length && (
            <p className="mt-4 rounded-xl border p-4 text-sm">
              Nenhuma referência corresponde a estes filtros.
              {inView && location === 'mapped'
                ? ' Afaste o zoom ou desmarque o filtro da área visível.'
                : ' Tente outro nome ou fonte.'}{' '}
              Isso não significa ausência de câmeras no local.
            </p>
          )}
          {results.length > limit && (
            <Button
              className="mt-3 w-full"
              variant="outline"
              onClick={() => setLimit(limit + 60)}
            >
              Mostrar mais 60
            </Button>
          )}
          <details className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">
            <summary className="cursor-pointer font-semibold text-foreground">
              Fontes e limites do catálogo
            </summary>
            <p className="mt-2">
              Levantamento de {catalog.reviewedAt}. IDs distintos podem
              representar câmeras no mesmo suporte ou imagens semelhantes. Uma
              referência publicada não confirma transmissão funcionando agora.
              Coordenadas derivadas de ruas indicam o cruzamento ou endereço;
              não medem a posição do equipamento.
            </p>
            <a
              className="mt-2 block underline"
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.camerasrj.com.br/metodologia/"
            >
              Metodologia CamerasRJ
            </a>
            <a
              className="mt-2 block underline"
              target="_blank"
              rel="noopener noreferrer"
              href="https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Trechos_Logradouros/MapServer/0"
            >
              Base de logradouros da Prefeitura
            </a>
            <a
              className="mt-2 block underline"
              target="_blank"
              rel="noopener noreferrer"
              href="/data/public-cameras.json"
            >
              Baixar referências e fontes consultadas
            </a>
          </details>
        </>
      </aside>
    ),
  };
}

function CameraViewer({
  camera,
  sharedReferenceCount,
  onClose,
  onLocate,
}: {
  camera: PublicCamera;
  sharedReferenceCount: number;
  onClose: () => void;
  onLocate: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="camera-viewer"
      aria-label={'Câmera: ' + camera.name}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="camera-viewer-content">
        <div className="sticky top-0 z-10 flex justify-end border-b bg-white px-4 py-2">
          <Button autoFocus variant="outline" onClick={onClose}>
            <X className="size-4" /> Fechar vídeo
          </Button>
        </div>
        <div className="p-4 sm:p-6">
          <CameraDetail
            camera={camera}
            sharedReferenceCount={sharedReferenceCount}
            onLocate={onLocate}
          />
        </div>
      </div>
    </dialog>
  );
}

function CameraDetail({
  camera,
  sharedReferenceCount,
  onLocate,
}: {
  camera: PublicCamera;
  sharedReferenceCount: number;
  onLocate: () => void;
}) {
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const reference = cameraReference(camera);
  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopyStatus(
        'Referência copiada. Complete data, horário e local do ocorrido.',
      );
    } catch {
      setCopyStatus(
        'Selecione e copie o texto abaixo; a cópia automática não funcionou.',
      );
    }
  }
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-6">{camera.name}</h2>
          <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
            ID {catalogId(camera)}
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {camera.address || camera.neighborhood}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Fonte: {camera.publisher} · Operador: {camera.operator}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {camera.recording && (
          <span className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-950">
            Gravação · não é ao vivo
          </span>
        )}
        <span className="rounded bg-slate-100 px-2 py-1">
          {statusLabels[camera.status]}
          {camera.checkedAt ? ` em ${camera.checkedAt}` : ''}
        </span>
        <span className="rounded bg-slate-100 px-2 py-1">
          {accessLabels[camera.access]}
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-600">
        {camera.playbackCheck
          ? camera.playbackCheck.reason
          : camera.status === 'unverified'
            ? 'Ainda não verificamos a reprodução desta fonte. A referência no mapa não confirma que o vídeo esteja disponível.'
            : 'O resultado corresponde à data do teste. A disponibilidade pode mudar.'}
      </p>
      <p className="text-xs leading-5 text-slate-600">
        {camera.coverage
          ? camera.coverage.note
          : 'Campo de visão ainda não calibrado. O marcador indica apenas o local de referência.'}
      </p>
      <CameraPlayer camera={camera} />
      <div className="space-y-2 text-xs leading-5 text-muted-foreground">
        <p>
          {camera.note ||
            'Não foi confirmada a reprodução deste sinal. A imagem pode estar indisponível ou exigir um navegador compatível.'}
        </p>
        <p>
          <strong>{precisionLabels[camera.precision]}.</strong>{' '}
          {camera.coordinates
            ? `Coordenadas do marcador: ${coordinateLabel(camera.coordinates)}. Elas indicam um local de referência estimado; não confirmam o suporte, poste, fachada ou área filmada.`
            : 'Ainda não há coordenada confiável para marcar no mapa.'}
        </p>
        {sharedReferenceCount > 1 && (
          <p>
            <strong>
              {sharedReferenceCount} IDs compartilham esta referência.
            </strong>{' '}
            O catálogo não confirma se são instalações diferentes nem onde cada
            equipamento fica.
          </p>
        )}
        {camera.locationSource && (
          <a
            className="block underline"
            href={camera.locationSource}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver fonte de localização
          </a>
        )}
        {camera.coordinates && (
          <button
            type="button"
            onClick={onLocate}
            className="flex min-h-10 items-center gap-1 font-semibold text-teal-800"
          >
            <MapPin className="size-4" /> Localizar no mapa
          </button>
        )}
      </div>
      <section className="space-y-3 rounded-xl border bg-muted/30 p-3">
        <h3 className="text-sm font-semibold">
          Precisa buscar imagens de um ocorrido?
        </h3>
        <p className="text-xs leading-5">
          Ao registrar a ocorrência, leve à polícia esta referência, a data, o
          horário aproximado e o local exato. A autoridade poderá avaliar a
          solicitação de imagens ao responsável.
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          Câmera próxima não garante filmagem ou arquivo disponível. Este mapa
          não grava nem recupera imagens.
        </p>
        <Button
          variant="outline"
          className="h-auto min-h-11 w-full whitespace-normal text-xs"
          onClick={() => setReferenceOpen(!referenceOpen)}
          aria-expanded={referenceOpen}
        >
          Levar referência à polícia
        </Button>
        {referenceOpen && (
          <div className="space-y-3">
            <label
              htmlFor="camera-reference"
              className="block text-xs font-medium"
            >
              Referência para copiar e completar
            </label>
            <textarea
              id="camera-reference"
              readOnly
              value={reference}
              rows={8}
              className="w-full resize-y rounded-lg border bg-white p-3 text-xs leading-5 text-[#172235]"
            />
            <Button onClick={copyReference} className="w-full">
              <Copy className="size-4" />
              Copiar referência
            </Button>
            <output className="block text-xs">{copyStatus}</output>
          </div>
        )}
        <details className="text-xs leading-5 text-muted-foreground">
          <summary className="cursor-pointer font-medium">
            E as câmeras da Prefeitura?
          </summary>
          <p className="mt-2">
            A{' '}
            <a
              href="https://civitas.rio/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              CIVITAS
            </a>{' '}
            informa que pedidos são restritos às autoridades de segurança e
            Justiça, mediante ofício. O serviço de{' '}
            <a
              href="https://www.1746.rio/hc/pt-br/articles/10872730317339-Informa%C3%A7%C3%B5es-sobre-imagens-das-c%C3%A2meras-de-monitoramento"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              reserva do 1746
            </a>{' '}
            exclui roubos e furtos. O procedimento do operador desta câmera
            precisa ser avaliado pela autoridade.
          </p>
        </details>
      </section>
    </div>
  );
}
