'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, LoaderCircle, RotateCcw } from 'lucide-react';
import type {
  ActiveCameraStream,
  CameraStreamResolution,
  PublicCamera,
} from '@/lib/public-cameras';
import { youtubePlayerSignal } from '@/lib/public-cameras';
import { cameraAnalyticsProvider, emitProductEvent } from '@/lib/product-analytics';

const cameraOrigin = 'https://player.camerasrj.com.br';
const youtubeOrigin = 'https://www.youtube-nocookie.com';
type PlayerSource = { kind: 'camerasrj' | 'youtube'; url: string; id: string };
type PlayerState = 'connecting' | 'playing' | 'ready' | 'error' | 'interrupted';
type AnalyticsProvider = 'cameras-rio' | 'youtube' | 'operator-site' | 'other-public';

const analyticsProvider = (kind: PlayerSource['kind']): AnalyticsProvider =>
  kind === 'youtube' ? 'youtube' : 'cameras-rio';

function embedSource(
  camera: PublicCamera,
  activeStream?: ActiveCameraStream | null,
): PlayerSource | null {
  if (camera.access !== 'public') return null;
  const youtubeId =
    activeStream?.provider === 'youtube'
      ? activeStream.streamId
      : camera.streamResolver
        ? undefined
        : camera.youtubeId;
  if (youtubeId && /^[\w-]{11}$/.test(youtubeId)) {
    return {
      kind: 'youtube',
      id: youtubeId,
      url: `${youtubeOrigin}/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1`,
    };
  }
  try {
    const url = new URL(camera.watchUrl || '');
    const match = /^\/camera\/(\d+)\/?$/.exec(url.pathname);
    if (
      url.origin === cameraOrigin &&
      !url.username &&
      !url.password &&
      match &&
      camera.id === `camerasrj-${match[1]}`
    ) {
      return {
        kind: 'camerasrj',
        id: match[1],
        url: `${cameraOrigin}/camera/${match[1]}/`,
      };
    }
  } catch {
    /* Other sources remain external links. */
  }
  return null;
}

function externalSource(
  camera: PublicCamera,
  activeStream?: ActiveCameraStream | null,
) {
  const candidate =
    activeStream?.watchUrl ||
    (!camera.streamResolver &&
    camera.youtubeId &&
    /^[\w-]{11}$/.test(camera.youtubeId)
      ? `https://www.youtube.com/watch?v=${camera.youtubeId}`
      : camera.watchUrl || camera.source);
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

const actionClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700';

export function CameraPlayer({ camera }: { camera: PublicCamera }) {
  const [resolutionAttempt, setResolutionAttempt] = useState(0);
  const [resolution, setResolution] = useState<CameraStreamResolution | null>(
    null,
  );
  const fallbackProvider: AnalyticsProvider = cameraAnalyticsProvider(camera);
  useEffect(() => {
    if (!camera.streamResolver) return;
    const controller = new AbortController();
    let cancelled = false;
    fetch(`/api/cameras/${encodeURIComponent(camera.id)}/stream`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = (await response.json()) as CameraStreamResolution;
        if (!response.ok && !value.reason)
          throw new Error('Resolver unavailable');
        if (!cancelled) {
          setResolution(value);
          if (value.activeStream)
            emitProductEvent({
              name: 'camera_resolve',
              provider: value.activeStream.provider === 'youtube' ? 'youtube' : 'cameras-rio',
              camera_id: camera.id,
            });
          else
            emitProductEvent({ name: 'camera_error', provider: fallbackProvider, camera_id: camera.id, reason: 'resolver_failed' });
        }
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) {
          emitProductEvent({ name: 'camera_error', provider: fallbackProvider, camera_id: camera.id, reason: 'resolver_failed' });
          setResolution({
            cameraId: camera.id,
            activeStream: null,
            reason: 'operator-unavailable',
          });
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [camera.id, camera.streamResolver, fallbackProvider, resolutionAttempt]);
  function resolveAgain() {
    setResolution(null);
    setResolutionAttempt((value) => value + 1);
  }
  const activeStream = resolution?.activeStream;
  const source = embedSource(camera, activeStream);
  const external = externalSource(camera, activeStream);
  const resolving = Boolean(
    camera.streamResolver && resolution?.cameraId !== camera.id,
  );
  useEffect(() => {
    if (!resolving && !source)
      emitProductEvent({ name: 'camera_open', provider: fallbackProvider, camera_id: camera.id });
  }, [camera.id, fallbackProvider, resolving, source]);
  if (resolving)
    return (
      <div className="flex min-h-36 items-center justify-center gap-2 rounded-xl bg-slate-100 p-5 text-sm text-slate-700">
        <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />
        Procurando a transmissão atual no site do operador…
      </div>
    );
  if (!source) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm leading-6 text-slate-700">
          {camera.access === 'subscription'
            ? 'Esta câmera exige assinatura no site do operador.'
            : camera.access === 'registration'
              ? 'Esta câmera exige cadastro no site do operador.'
              : camera.streamResolver
                ? 'Não encontramos uma transmissão atual nesta fonte. O vídeo anterior não será reproduzido como se ainda estivesse ao vivo.'
                : 'Esta fonte oferece a imagem no site do operador. A reprodução aqui ainda não está disponível.'}
        </p>
        {external && (
          <a
            className={actionClass}
            href={external}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => emitProductEvent({ name: 'camera_open_source', provider: fallbackProvider, camera_id: camera.id })}
          >
            Abrir fonte em outra aba{' '}
            <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
          </a>
        )}
        {camera.streamResolver && (
          <button type="button" onClick={resolveAgain} className={actionClass}>
            <RotateCcw aria-hidden="true" className="size-4 shrink-0" />
            Procurar novamente
          </button>
        )}
        <a
          href={`/contribuir?camera=${encodeURIComponent(camera.id)}`}
          className="inline-flex min-h-11 items-center text-xs font-semibold text-teal-800 underline"
        >
          Informar problema
        </a>
      </div>
    );
  }
  return (
    <EmbeddedPlayer
      key={`${camera.id}:${source.url}`}
      camera={camera}
      source={source}
      external={external}
      onResolveAgain={camera.streamResolver ? resolveAgain : undefined}
    />
  );
}

function EmbeddedPlayer({
  camera,
  source,
  external,
  onResolveAgain,
}: {
  camera: PublicCamera;
  source: PlayerSource;
  external?: string;
  onResolveAgain?: () => void;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PlayerState>('connecting');
  const [message, setMessage] = useState('');
  const [slowConnection, setSlowConnection] = useState(false);
  const operatorSource = externalSource({
    ...camera,
    youtubeId: undefined,
    watchUrl: undefined,
  });
  // Providers may reconnect indefinitely after reporting an error. Keep a
  // failed attempt closed until the visitor explicitly retries.
  const failedAttempt = useRef(false);
  const youtubeProgress = useRef<number | null>(null);
  const firstFrame = useRef(false);
  const progressEmitted = useRef(false);
  const timeoutEmitted = useRef(false);

  useEffect(() => {
    failedAttempt.current = false;
    firstFrame.current = false;
    progressEmitted.current = false;
    timeoutEmitted.current = false;
    youtubeProgress.current = null;
    emitProductEvent({
      name: 'camera_open',
      provider: analyticsProvider(source.kind),
      camera_id: camera.id,
    });
  }, [camera.id, source.kind, source.id, attempt]);

  useEffect(() => {
    let handshake: ReturnType<typeof setInterval> | undefined;
    function receive(event: MessageEvent) {
      if (failedAttempt.current) return;
      if (
        event.origin !==
          (source.kind === 'youtube' ? youtubeOrigin : cameraOrigin) ||
        event.source !== iframe.current?.contentWindow
      )
        return;
      if (source.kind === 'youtube') {
        const signal = youtubePlayerSignal(event.data);
        if (signal.kind === 'progress') {
          if (
            youtubeProgress.current !== null &&
            signal.currentTime > youtubeProgress.current
          ) {
            clearInterval(handshake);
            setState('playing');
            setMessage('');
            if (!firstFrame.current) {
              firstFrame.current = true;
              emitProductEvent({ name: 'camera_first_frame', provider: 'youtube', camera_id: camera.id });
            } else if (!progressEmitted.current) {
              progressEmitted.current = true;
              emitProductEvent({ name: 'camera_progress', provider: 'youtube', camera_id: camera.id });
            }
          }
          youtubeProgress.current = signal.currentTime;
        } else if (signal.kind === 'ready') {
          setState((value) => (value === 'connecting' ? 'ready' : value));
        } else if (signal.kind === 'error') {
          failedAttempt.current = true;
          clearInterval(handshake);
          setState('error');
          setMessage(
            signal.code === 100
              ? 'Esta transmissão não está disponível no YouTube. Consulte o canal do operador para uma nova transmissão.'
              : signal.code === 101 || signal.code === 150
                ? 'O YouTube não disponibilizou este vídeo aqui. Abra a fonte para conferir a transmissão ou escolha outra câmera.'
                : 'O YouTube não conseguiu reproduzir este vídeo. Tente novamente ou abra a fonte.',
          );
          emitProductEvent({ name: 'camera_error', provider: 'youtube', camera_id: camera.id, reason: signal.code === 100 ? 'unavailable' : signal.code === 101 || signal.code === 150 ? 'embed_blocked' : 'playback_error' });
        } else if (signal.kind === 'buffering') {
          setState('connecting');
          setMessage('Aguardando confirmação de progresso do vídeo…');
        } else if (signal.kind === 'paused') {
          setState('ready');
        } else if (signal.kind === 'ended') {
          failedAttempt.current = true;
          setState('interrupted');
          setMessage(
            'A transmissão terminou. Consulte a fonte ou escolha outra câmera.',
          );
        }
        return;
      }
      const data = event.data;
      if (
        !data ||
        typeof data !== 'object' ||
        data.type !== 'camerasrj:camera-player' ||
        String(data.cameraId) !== source.id
      )
        return;
      if (
        data.state === 'metric' &&
        data.metric &&
        typeof data.metric === 'object'
      ) {
        const metric = data.metric;
        if (
          metric.outcome === 'playing' && metric.phase === 'first-frame'
        ) {
          if (!firstFrame.current) {
            firstFrame.current = true;
            emitProductEvent({ name: 'camera_first_frame', provider: 'cameras-rio', camera_id: camera.id });
          }
          setState('playing');
          setMessage('');
        } else if (
          metric.outcome === 'error' ||
          metric.outcome === 'interrupted'
        ) {
          const reasons: Record<string, string> = {
            codec:
              'O formato de vídeo desta câmera não é compatível com este navegador ou dispositivo.',
            offline: 'Esta câmera está offline ou sem sinal na fonte.',
            notFound: 'A fonte não encontrou esta câmera.',
            timeout: 'A fonte não enviou imagem a tempo.',
            unavailable:
              'O serviço de câmeras está temporariamente indisponível.',
          };
          failedAttempt.current = true;
          setState(metric.outcome);
          setMessage(
            reasons[metric.reason] ||
              'A fonte não conseguiu fornecer uma imagem desta câmera.',
          );
          emitProductEvent({ name: 'camera_error', provider: 'cameras-rio', camera_id: camera.id, reason: metric.reason === 'offline' ? 'unavailable' : metric.reason === 'codec' ? 'playback_error' : metric.reason === 'notFound' ? 'resolver_failed' : metric.reason === 'timeout' ? 'network' : 'unknown' });
        }
        return;
      }
      // A plain playing event only confirms a media track, not a decoded frame.
      if (data.state === 'playing') return;
      if (!['connecting', 'error', 'interrupted'].includes(data.state)) return;
      if (data.state === 'error' || data.state === 'interrupted')
        failedAttempt.current = true;
      if (data.state === 'error' || data.state === 'interrupted')
        emitProductEvent({ name: 'camera_error', provider: 'cameras-rio', camera_id: camera.id, reason: data.state === 'error' ? 'playback_error' : 'unknown' });
      setState(data.state);
      setMessage(
        typeof data.message === 'string' ? data.message.slice(0, 240) : '',
      );
    }
    window.addEventListener('message', receive);
    // The YouTube iframe accepts subscriptions only after its API is ready.
    // A bounded handshake covers loading without treating onLoad as playback.
    if (source.kind === 'youtube') {
      let attempts = 0;
      handshake = setInterval(() => {
        const target = iframe.current?.contentWindow;
        target?.postMessage(
          JSON.stringify({ event: 'listening', id: source.id }),
          youtubeOrigin,
        );
        for (const event of ['onError', 'onStateChange']) {
          target?.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'addEventListener',
              args: [event],
            }),
            youtubeOrigin,
          );
        }
        target?.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'addEventListener',
            args: ['infoDelivery'],
          }),
          youtubeOrigin,
        );
        if (++attempts >= 50) clearInterval(handshake);
      }, 500);
    }
    return () => {
      clearInterval(handshake);
      window.removeEventListener('message', receive);
    };
  }, [camera.id, source.kind, source.id, attempt]);

  useEffect(() => {
    const slow = window.setTimeout(() => {
      setSlowConnection(true);
      if (!firstFrame.current && !timeoutEmitted.current) {
        timeoutEmitted.current = true;
        emitProductEvent({ name: 'camera_timeout', provider: analyticsProvider(source.kind), camera_id: camera.id, threshold_seconds: 10 });
      }
    }, 10_000);
    const timeout = window.setTimeout(
      () => {
        if (firstFrame.current) return;
        failedAttempt.current = true;
        setState('error');
        setMessage(
          'A fonte demorou para responder. Tente novamente ou abra a câmera na fonte.',
        );
      },
      source.kind === 'camerasrj' ? 45_000 : 25_000,
    );
    return () => {
      window.clearTimeout(slow);
      window.clearTimeout(timeout);
    };
  }, [attempt, source.kind, source.id, camera.id]);

  function retry() {
    if (onResolveAgain) {
      onResolveAgain();
      return;
    }
    setSlowConnection(false);
    failedAttempt.current = false;
    youtubeProgress.current = null;
    setMessage('');
    setState('connecting');
    setAttempt((value) => value + 1);
  }

  const failed = state === 'error' || state === 'interrupted';
  const statusText =
    state === 'connecting'
      ? slowConnection
        ? 'A reprodução ainda não foi confirmada. Você pode abrir a fonte enquanto continuamos tentando.'
        : 'Conectando à câmera…'
      : state === 'playing'
        ? camera.recording
          ? 'Reproduzindo gravação da fonte; não é ao vivo.'
          : 'Imagem recebida da fonte.'
        : state === 'ready'
          ? slowConnection
            ? 'O player abriu, mas não confirmou progresso do vídeo. Tente reproduzir ou abra a fonte.'
            : 'Player do YouTube carregado. A reprodução ainda não foi confirmada; toque em reproduzir.'
          : message ||
            (state === 'interrupted'
              ? 'A transmissão foi interrompida. Tente novamente.'
              : 'Não foi possível reproduzir esta câmera. Tente novamente ou abra a fonte.');

  return (
    <section aria-label={`Vídeo de ${camera.name}`} className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
        {failed ? (
          <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 bg-slate-100 p-5 text-center text-slate-800">
            <strong className="text-base">
              Não foi possível exibir a imagem
            </strong>
            <p className="max-w-lg text-sm leading-5">{statusText}</p>
          </div>
        ) : (
          <iframe
            key={attempt}
            ref={iframe}
            className="h-full w-full border-0"
            src={source.url}
            title={`Transmissão: ${camera.name}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => {
              // Loading an iframe proves neither readiness nor playback.
            }}
            onError={() => {
              if (failedAttempt.current) return;
              failedAttempt.current = true;
              setState('error');
              setMessage(
                'O player não carregou. Verifique a conexão e tente novamente.',
              );
              emitProductEvent({ name: 'camera_error', provider: analyticsProvider(source.kind), camera_id: camera.id, reason: 'embed_blocked' });
            }}
          />
        )}
        {source.kind === 'camerasrj' && state === 'connecting' && (
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 p-5 text-center text-slate-700"
            aria-hidden="true"
          >
            <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" />
            <span className="text-sm">
              {slowConnection
                ? 'A fonte está demorando. Continuamos tentando receber a imagem…'
                : 'Aguardando a primeira imagem da câmera…'}
            </span>
          </div>
        )}
      </div>
      <output
        aria-live="polite"
        className={
          failed
            ? 'sr-only'
            : 'flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm leading-5 text-slate-700'
        }
      >
        {state === 'connecting' && (
          <LoaderCircle
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none"
          />
        )}
        <span>{statusText}</span>
      </output>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={retry} className={actionClass}>
          <RotateCcw aria-hidden="true" className="size-4 shrink-0" /> Tentar
          novamente
        </button>
        {external && (
          <a
            href={external}
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
            onClick={() => emitProductEvent({ name: 'camera_open_source', provider: analyticsProvider(source.kind), camera_id: camera.id })}
          >
            Abrir fonte{' '}
            <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
            <span className="sr-only"> em outra aba</span>
          </a>
        )}
      </div>
      <p className="text-xs leading-5 text-slate-600">
        {source.kind === 'youtube'
          ? 'O vídeo começa sem som. Use os controles do player para ativar o áudio ou ampliar.'
          : 'Use o controle do player para ampliar o vídeo. A disponibilidade depende da fonte.'}
      </p>
      {operatorSource && operatorSource !== external && (
        <a
          href={operatorSource}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-teal-800 underline"
          onClick={() => emitProductEvent({ name: 'camera_open_source', provider: analyticsProvider(source.kind), camera_id: camera.id })}
        >
          Canal ou site do operador{' '}
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
      )}
      <a
        href={`/contribuir?camera=${encodeURIComponent(camera.id)}`}
        className="inline-flex min-h-11 items-center text-xs font-semibold text-teal-800 underline"
      >
        Informar problema
      </a>
    </section>
  );
}
