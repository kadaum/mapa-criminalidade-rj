'use client';

// MapLibre callbacks use refs to read the current catalog without rebuilding the map.
/* oxlint-disable react/react-compiler */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map, MapLayerMouseEvent } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import {
  ArrowLeft,
  Camera,
  Copy,
  ExternalLink,
  MapPin,
  Play,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  cameraReference,
  publicCameras,
  precisionLabels,
  statusLabels,
  accessLabels,
  type PublicCamera,
  type CameraCatalog,
} from '@/lib/public-cameras';

const sourceId = 'public-camera-points';
const cameraLayers = [
  'camera-clusters',
  'camera-cluster-count',
  'camera-points',
];
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function useCameraWorkspace(
  map: Map | null,
  visible: boolean,
  focus: (coordinates: [number, number]) => void,
) {
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
  const active = enabled && visible;
  const loaded = useRef(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('cameras') === '1')
      setEnabled(true);
  }, []);
  function toggle() {
    const next = !enabled;
    setEnabled(next);
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
  }, [enabled]);

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
  const dataRef = useRef(geojson);
  const filteredRef = useRef(filtered);
  dataRef.current = geojson;
  filteredRef.current = filtered;

  function showCamera(camera: PublicCamera, move: boolean) {
    setSelected(camera);
    if (move && camera.coordinates) focus(camera.coordinates);
    if (window.matchMedia('(max-width: 1023px)').matches)
      requestAnimationFrame(() =>
        document
          .getElementById('camera-panel')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
  }
  const showRef = useRef(showCamera);
  showRef.current = showCamera;

  useEffect(() => {
    if (!map || !active) return;
    let disposed = false;
    const updateBounds = () => {
      const b = map.getBounds();
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    };
    const selectPoint = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;
      const camera = filteredRef.current.find((c) => c.id === id);
      if (camera) showRef.current(camera, false);
    };
    const expandCluster = async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const source = map.getSource(sourceId) as GeoJSONSource | undefined;
      if (!feature || !source || feature.geometry.type !== 'Point') return;
      const coords = feature.geometry.coordinates as [number, number];
      try {
        const id = Number(feature.properties.cluster_id);
        if (map.getZoom() >= 14) {
          const leaves = await source.getClusterLeaves(
            id,
            Number(feature.properties.point_count),
            0,
          );
          if (disposed) return;
          setSelected(null);
          setLocation('mapped');
          setClusterSelection(leaves.map((f) => String(f.properties?.id)));
          setLimit(60);
          if (window.matchMedia('(max-width: 1023px)').matches)
            document
              .getElementById('camera-panel')
              ?.scrollIntoView({ behavior: 'smooth' });
        } else {
          const zoom = await source.getClusterExpansionZoom(id);
          if (!disposed)
            map.easeTo({
              center: coords,
              zoom: Math.min(15, zoom),
              duration: 0,
            });
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
    const setup = () => {
      if (disposed || map.getSource(sourceId)) return;
      map.addSource(sourceId, {
        type: 'geojson',
        data: dataRef.current,
        cluster: true,
        clusterRadius: 45,
        clusterMaxZoom: 15,
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
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 9,
          'circle-color': [
            'match',
            ['get', 'status'],
            'observed',
            '#0f766e',
            'failed',
            '#b45309',
            'offline',
            '#64748b',
            '#2563eb',
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });
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
    setup();
    map.on('moveend', updateBounds);
    return () => {
      disposed = true;
      map.off('load', setup);
      map.off('moveend', updateBounds);
      map.off('click', 'camera-points', selectPoint);
      map.off('click', 'camera-clusters', expandCluster);
      map.off('mouseenter', 'camera-points', pointer);
      map.off('mouseenter', 'camera-clusters', pointer);
      map.off('mouseleave', 'camera-points', resetPointer);
      map.off('mouseleave', 'camera-clusters', resetPointer);
      if (map.getStyle()) {
        for (const id of [...cameraLayers].reverse())
          if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
      resetPointer();
    };
  }, [map, active]);
  useEffect(() => {
    void (map?.getSource(sourceId) as GeoJSONSource | undefined)?.setData(
      geojson,
    );
  }, [map, geojson]);
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

  return {
    active,
    toggle,
    controls: visible && (
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
            onClick={() =>
              document
                .getElementById('camera-panel')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            className="min-h-11 border-l px-3 text-xs font-semibold lg:hidden"
          >
            Ver lista
          </button>
        )}
      </div>
    ),
    panel: (
      <aside
        id="camera-panel"
        className="atlas-panel camera-panel border-t border-[#dce2ed] bg-white p-4 lg:border-l lg:border-t-0"
        aria-label="Explorar câmeras"
      >
        {selected ? (
          <>
            <button
              type="button"
              className="mb-4 flex min-h-10 items-center gap-2 text-sm font-semibold text-teal-800"
              onClick={() => setSelected(null)}
            >
              <ArrowLeft className="size-4" /> Voltar às câmeras
            </button>
            <CameraDetail
              key={selected.id}
              camera={selected}
              onLocate={() => {
                if (selected.coordinates) {
                  focus(selected.coordinates);
                  map
                    ?.getContainer()
                    .scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            />
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Câmeras no Rio</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {totalMapped.toLocaleString('pt-BR')} referências no mapa ·{' '}
                  {(catalog.cameras.length - totalMapped).toLocaleString(
                    'pt-BR',
                  )}{' '}
                  com localização pendente
                </p>
              </div>
              <Camera className="mt-1 size-5 shrink-0 text-teal-800" />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Escolha um ponto ou procure abaixo. Os marcadores indicam locais
              de referência, não a área filmada.
            </p>
            {loadState === 'loading' && (
              <output className="mt-3 block text-xs">
                Carregando catálogo…
              </output>
            )}
            {loadState === 'error' && (
              <p role="alert" className="mt-3 rounded border p-3 text-xs">
                O catálogo completo não carregou. Mostrando apenas o ponto
                inicial. Desative e ative Câmeras para tentar novamente.
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
              Apenas imagens conferidas no levantamento
            </label>
            {clusterSelection && (
              <div className="mt-3 rounded-lg bg-teal-50 p-3 text-sm">
                <strong>{results.length} câmeras neste grupo</strong>
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
                  onClick={() => showCamera(camera, true)}
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
                    {statusLabels[camera.status]}
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
        )}
      </aside>
    ),
  };
}

function CameraDetail({
  camera,
  onLocate,
}: {
  camera: PublicCamera;
  onLocate: () => void;
}) {
  const [play, setPlay] = useState(false);
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
        <h2 className="text-lg font-semibold leading-6">{camera.name}</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {camera.address || camera.neighborhood}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Fonte: {camera.publisher} · Operador: {camera.operator}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-slate-100 px-2 py-1">
          {statusLabels[camera.status]}
          {camera.checkedAt ? ` em ${camera.checkedAt}` : ''}
        </span>
        <span className="rounded bg-slate-100 px-2 py-1">
          {accessLabels[camera.access]}
        </span>
      </div>
      {camera.youtubeId && camera.access === 'public' ? (
        <div className="aspect-video overflow-hidden rounded-xl bg-[#172235] text-white">
          {play ? (
            <iframe
              className="h-full w-full"
              title={`Transmissão ${camera.name}`}
              src={`https://www.youtube-nocookie.com/embed/${camera.youtubeId}?autoplay=1`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlay(true)}
              className="flex h-full w-full flex-col items-center justify-center gap-2 p-3"
            >
              <Play className="size-6" />
              <span className="text-sm font-semibold">Abrir transmissão</span>
              <span className="text-xs text-white/70">
                Carrega o player do YouTube
              </span>
            </button>
          )}
        </div>
      ) : (
        <a
          href={camera.watchUrl || camera.source}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-teal-800 p-3 text-center text-sm font-semibold text-white"
        >
          {camera.access === 'public'
            ? 'Abrir câmera na fonte'
            : 'Consultar acesso na fonte'}
          <ExternalLink className="size-4 shrink-0" />
        </a>
      )}
      {camera.youtubeId && (
        <a
          href={camera.source}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold underline"
        >
          Abrir no site da fonte
          <ExternalLink className="size-3" />
        </a>
      )}
      <div className="space-y-2 text-xs leading-5 text-muted-foreground">
        <p>
          {camera.note ||
            'Não foi confirmada a reprodução deste sinal. A imagem pode estar indisponível ou exigir um navegador compatível.'}
        </p>
        <p>
          <strong>{precisionLabels[camera.precision]}.</strong>{' '}
          {camera.coordinates
            ? 'Não representa posição exata do equipamento ou área filmada.'
            : 'Ainda não há coordenada confiável para marcar no mapa.'}
        </p>
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
