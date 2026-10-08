export type PublicCamera = {
  id: string;
  name: string;
  neighborhood: string;
  operator: string;
  publisher: string;
  address: string;
  coordinates: [number, number] | null;
  /** Schematic direction symbol; its dimensions are NOT optical FOV or range. */
  directionSymbol?: {
    bearingDeg: number;
    spreadDeg: number;
    displayLengthMeters: number;
    source: string;
    assessedAt: string;
    note: string;
  };
  /** Editorial parameters from verified research; never visitor preferences. */
  coverage?: {
    bearingDeg: number;
    fovDeg: number;
    rangeMeters: number;
    source: string;
    assessedAt: string;
    note: string;
  };
  precision: 'directory' | 'intersection' | 'address' | 'spot' | 'unresolved';
  locationSource: string;
  source: string;
  watchUrl?: string;
  youtubeId?: string;
  /** Permanent, allowlisted operator locator. The resolved video ID is ephemeral. */
  streamResolver?: 'homes-posto-3' | 'homes-posto-6';
  historicalStreams?: Array<{
    provider: 'youtube';
    streamId: string;
    lastObservedAt?: string;
    outcome: 'playing' | 'ended' | 'unavailable' | 'unknown';
  }>;
  recording?: boolean;
  access: 'public' | 'registration' | 'subscription';
  status: 'observed' | 'unverified' | 'failed' | 'offline';
  checkedAt?: string;
  playbackCheck?: {
    checkedAt: string;
    outcome: 'playing' | 'failed' | 'inconclusive' | 'restricted' | 'external';
    reason: string;
    method: string;
  };
  note?: string;
};
export type ActiveCameraStream = {
  provider: 'youtube' | 'camerasrj';
  streamId: string;
  watchUrl: string;
  resolvedAt: string;
  expiresAt: string;
  /** Discovery finds a candidate. Only player events can confirm playback. */
  status: 'candidate';
};
export type CameraStreamResolution = {
  cameraId: string;
  activeStream: ActiveCameraStream | null;
  reason?:
    | 'not-found'
    | 'not-resolvable'
    | 'operator-unavailable'
    | 'invalid-operator-response';
};
export type CameraCatalog = {
  reviewedAt: string;
  cameras: PublicCamera[];
  playbackAudit?: {
    total: number;
    checked: number;
    complete: boolean;
    updatedAt: string;
    counts: Record<string, number>;
  };
};
export const statusLabels = {
  observed: 'Reprodução confirmada no teste',
  unverified: 'Disponibilidade não confirmada',
  failed: 'Não reproduziu no teste',
  offline: 'Fonte indica offline',
};
export const precisionLabels = {
  directory: 'Referência aproximada de diretório',
  intersection: 'Cruzamento de referência',
  address: 'Endereço estimado na via',
  spot: 'Local indicado pelo operador',
  unresolved: 'Localização pendente',
};
export const accessLabels = {
  public: 'Acesso público',
  registration: 'Exige cadastro',
  subscription: 'Exige assinatura',
};

const RESOLVER_PAGES = {
  'homes-posto-3': {
    cameraId: 'homes-posto-3',
    url: 'https://homesinrio.com/rio-de-janeiro-luxury-apartment-webcam',
  },
  'homes-posto-6': {
    cameraId: 'homes-posto-6',
    url: 'https://homesinrio.com/apartment-rio-de-janeiro-copacabana-beach-webcam',
  },
} as const;
const MAX_OPERATOR_BYTES = 512_000;
const RESOLUTION_TTL_MS = 15 * 60 * 1000;

function allowedOperatorUrl(value: string) {
  const url = new URL(value);
  return (
    url.protocol === 'https:' &&
    url.hostname === 'homesinrio.com' &&
    !url.username &&
    !url.password
  );
}

/** Resolve only registered operator pages; caller controls the bounded fetch timeout. */
export async function resolveCameraStream(
  cameraId: string,
  resolver: keyof typeof RESOLVER_PAGES | undefined,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<CameraStreamResolution> {
  if (!resolver)
    return { cameraId, activeStream: null, reason: 'not-resolvable' };
  const config = RESOLVER_PAGES[resolver];
  if (!config || config.cameraId !== cameraId)
    return { cameraId, activeStream: null, reason: 'not-found' };
  try {
    if (!allowedOperatorUrl(config.url))
      throw new Error('Blocked operator URL');
    const response = await fetcher(config.url, {
      redirect: 'manual',
      headers: { Accept: 'text/html', 'User-Agent': 'MapaCriminalidadeRJ/1.0' },
    });
    if (!response.ok || response.type === 'opaqueredirect')
      return { cameraId, activeStream: null, reason: 'operator-unavailable' };
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_OPERATOR_BYTES)
      return {
        cameraId,
        activeStream: null,
        reason: 'invalid-operator-response',
      };
    const reader = response.body?.getReader();
    if (!reader)
      return {
        cameraId,
        activeStream: null,
        reason: 'invalid-operator-response',
      };
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_OPERATOR_BYTES) {
        await reader.cancel();
        return {
          cameraId,
          activeStream: null,
          reason: 'invalid-operator-response',
        };
      }
      chunks.push(value);
    }
    const html = new TextDecoder().decode(
      chunks.length === 1
        ? chunks[0]
        : Uint8Array.from(chunks.flatMap((chunk) => [...chunk])),
    );
    const ids = [
      ...html.matchAll(/(?:youtube(?:-nocookie)?\.com\/embed\/)([\w-]{11})/g),
    ].map((match) => match[1]);
    const streamId = ids[0];
    if (!streamId)
      return {
        cameraId,
        activeStream: null,
        reason: 'invalid-operator-response',
      };
    return {
      cameraId,
      activeStream: {
        provider: 'youtube',
        streamId,
        watchUrl: `https://www.youtube.com/watch?v=${streamId}`,
        resolvedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + RESOLUTION_TTL_MS).toISOString(),
        status: 'candidate',
      },
    };
  } catch {
    return { cameraId, activeStream: null, reason: 'operator-unavailable' };
  }
}

export function playbackFreshness(camera: PublicCamera, now = Date.now()) {
  const checkedAt = camera.playbackCheck?.checkedAt;
  if (!checkedAt) return 'unknown' as const;
  const age = now - Date.parse(checkedAt);
  if (!Number.isFinite(age) || age < 0) return 'unknown' as const;
  return age <= 72 * 60 * 60 * 1000
    ? ('recent' as const)
    : ('expired' as const);
}

export type YoutubePlayerSignal =
  | { kind: 'ready' | 'buffering' | 'paused' | 'ended' }
  | { kind: 'error'; code: number }
  | { kind: 'progress'; currentTime: number }
  | { kind: 'ignore' };

/** Strict subset of the YouTube iframe protocol used by the player. */
export function youtubePlayerSignal(value: unknown): YoutubePlayerSignal {
  let data = value;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return { kind: 'ignore' };
    }
  }
  if (!data || typeof data !== 'object') return { kind: 'ignore' };
  const message = data as { event?: unknown; info?: unknown };
  if (message.event === 'onReady') return { kind: 'ready' };
  if (message.event === 'onError' && typeof message.info === 'number')
    return { kind: 'error', code: message.info };
  if (message.event === 'onStateChange' && typeof message.info === 'number') {
    if (message.info === 0) return { kind: 'ended' };
    if (message.info === 2 || message.info === 5) return { kind: 'paused' };
    if (message.info === 1 || message.info === 3) return { kind: 'buffering' };
  }
  if (
    message.event === 'infoDelivery' &&
    message.info &&
    typeof message.info === 'object'
  ) {
    const info = message.info as {
      playerState?: unknown;
      currentTime?: unknown;
    };
    if (
      info.playerState === 1 &&
      typeof info.currentTime === 'number' &&
      Number.isFinite(info.currentTime) &&
      info.currentTime >= 0
    )
      return { kind: 'progress', currentTime: info.currentTime };
  }
  return { kind: 'ignore' };
}
export const publicCameras: PublicCamera[] = [
  {
    id: 'homes-posto-6',
    name: 'Copacabana · Posto 6',
    neighborhood: 'Copacabana',
    operator: 'Homes in Rio',
    publisher: 'Homes in Rio',
    address: 'Avenida Atlântica, 3950 — Copacabana, Rio de Janeiro',
    coordinates: [-43.19027778, -22.98305556],
    precision: 'directory',
    locationSource:
      'https://worldcam.eu/webcams/south-america/brazil/40611-rio-de-janeiro-copacabana-posto-6',
    source:
      'https://homesinrio.com/apartment-rio-de-janeiro-copacabana-beach-webcam',
    streamResolver: 'homes-posto-6',
    historicalStreams: [
      {
        provider: 'youtube',
        streamId: 'Hr7c0XuEgm0',
        lastObservedAt: '2026-10-06',
        outcome: 'unavailable',
      },
    ],
    access: 'public',
    status: 'observed',
    checkedAt: '25/09/2026',
    note: 'A câmera muda de direção. O endereço é publicado pelo operador; o marcador vem de um diretório.',
  },
];
export function cameraReference(camera: PublicCamera): string {
  return [
    'Referência de câmera para informar à autoridade responsável',
    `Câmera: ${camera.name} (${camera.id})`,
    `Operador: ${camera.operator}`,
    `Fonte do catálogo: ${camera.publisher}`,
    `Local publicado: ${camera.address || camera.neighborhood}`,
    `Precisão: ${precisionLabels[camera.precision]}. ${camera.coordinates ? 'A coordenada indica um local de referência estimado; não confirma a instalação física nem o campo de visão.' : 'Não há coordenada confiável para indicar a instalação física ou o campo de visão.'}`,
    `Fonte: ${camera.source}`,
    `Fonte de localização: ${camera.locationSource || 'Não localizada'}`,
    `Imagem: ${statusLabels[camera.status]}${camera.checkedAt ? ` em ${camera.checkedAt}` : ''}. Existência de gravações não confirmada.`,
    '',
    'Completar antes de apresentar:',
    'Data do ocorrido: ____',
    'Horário aproximado e fuso: ____',
    'Local exato, cruzamento e sentido da via: ____',
    '',
    'Solicito avaliar se essa câmera pode ter registrado o ocorrido e, se cabível, solicitar as imagens ao responsável.',
    'Esta referência não comprova que o fato foi filmado. O Mapa de Criminalidade RJ não armazena nem fornece gravações.',
  ].join('\n');
}

/** Order playback choices without treating a shared address as the same camera. */
export function compareCameraPlayback(a: PublicCamera, b: PublicCamera) {
  const score = (c: PublicCamera) => {
    if (c.access !== 'public') return -1;
    if (c.status === 'observed' && playbackFreshness(c) === 'recent') return 3;
    return c.status === 'unverified' || c.status === 'observed' ? 2 : 1;
  };
  return (
    score(b) - score(a) ||
    (b.playbackCheck?.checkedAt || '').localeCompare(
      a.playbackCheck?.checkedAt || '',
    ) ||
    a.name.localeCompare(b.name, 'pt-BR')
  );
}

export function cameraSignalKey(camera: PublicCamera): string | null {
  if (camera.youtubeId) return 'youtube:' + camera.youtubeId;
  if (!camera.watchUrl) return null;
  try {
    const url = new URL(camera.watchUrl);
    url.hash = '';
    return url.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function preferredCameraSource(
  camera: PublicCamera,
  catalog: PublicCamera[],
) {
  const key = cameraSignalKey(camera);
  if (!key) return camera;
  const candidates = catalog.filter(
    (c) =>
      cameraSignalKey(c) === key &&
      c.access === 'public' &&
      c.status === 'observed' &&
      playbackFreshness(c) === 'recent',
  );
  return candidates.sort(compareCameraPlayback)[0] || camera;
}
