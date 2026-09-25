'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, LoaderCircle, RotateCcw } from 'lucide-react';
import type { PublicCamera } from '@/lib/public-cameras';

const cameraOrigin = 'https://player.camerasrj.com.br';
const youtubeOrigin = 'https://www.youtube-nocookie.com';
type PlayerSource = { kind: 'camerasrj' | 'youtube'; url: string; id: string };
type PlayerState = 'connecting' | 'playing' | 'ready' | 'error' | 'interrupted';

function embedSource(camera: PublicCamera): PlayerSource | null {
  if (camera.access !== 'public') return null;
  if (camera.youtubeId && /^[\w-]{11}$/.test(camera.youtubeId)) {
    return {
      kind: 'youtube',
      id: camera.youtubeId,
      url: `${youtubeOrigin}/embed/${camera.youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1`,
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

function externalSource(camera: PublicCamera) {
  const candidate =
    camera.youtubeId && /^[\w-]{11}$/.test(camera.youtubeId)
      ? `https://www.youtube.com/watch?v=${camera.youtubeId}`
      : camera.watchUrl || camera.source;
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
  const source = embedSource(camera);
  const external = externalSource(camera);
  if (!source) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm leading-6 text-slate-700">
          {camera.access === 'subscription'
            ? 'Esta câmera exige assinatura no site do operador.'
            : camera.access === 'registration'
              ? 'Esta câmera exige cadastro no site do operador.'
              : 'Esta fonte oferece a imagem no site do operador. A reprodução aqui ainda não está disponível.'}
        </p>
        {external && (
          <a
            className={actionClass}
            href={external}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir fonte em outra aba{' '}
            <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
          </a>
        )}
      </div>
    );
  }
  return (
    <EmbeddedPlayer
      key={`${camera.id}:${source.url}`}
      camera={camera}
      source={source}
      external={external}
    />
  );
}

function EmbeddedPlayer({
  camera,
  source,
  external,
}: {
  camera: PublicCamera;
  source: PlayerSource;
  external?: string;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PlayerState>('connecting');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let handshake: ReturnType<typeof setInterval> | undefined;
    function receive(event: MessageEvent) {
      if (
        event.origin !==
          (source.kind === 'youtube' ? youtubeOrigin : cameraOrigin) ||
        event.source !== iframe.current?.contentWindow
      )
        return;
      if (source.kind === 'youtube') {
        let data;
        try {
          data =
            typeof event.data === 'string'
              ? JSON.parse(event.data)
              : event.data;
        } catch {
          return;
        }
        if (!data || typeof data !== 'object') return;
        if (data.event === 'onReady') {
          setState((value) => (value === 'connecting' ? 'ready' : value));
        } else if (data.event === 'onError') {
          clearInterval(handshake);
          setState('error');
          setMessage(
            data.info === 100
              ? 'Esta transmissão não está disponível no YouTube. Consulte o canal do operador para uma nova transmissão.'
              : data.info === 101 || data.info === 150
                ? 'O YouTube não disponibilizou este vídeo aqui. Abra a fonte para conferir a transmissão ou escolha outra câmera.'
                : 'O YouTube não conseguiu reproduzir este vídeo. Tente novamente ou abra a fonte.',
          );
        } else if (data.event === 'onStateChange') {
          if (data.info === 1) {
            clearInterval(handshake);
            setState('playing');
            setMessage('');
          } else if (data.info === 3) setState('connecting');
          else if (data.info === 2 || data.info === 5) setState('ready');
          else if (data.info === 0) {
            setState('interrupted');
            setMessage(
              'A transmissão terminou. Consulte a fonte ou escolha outra câmera.',
            );
          }
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
        !['connecting', 'playing', 'error', 'interrupted'].includes(data.state)
      )
        return;
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
        if (++attempts >= 50) clearInterval(handshake);
      }, 500);
    }
    return () => {
      clearInterval(handshake);
      window.removeEventListener('message', receive);
    };
  }, [source.kind, source.id, attempt]);

  useEffect(() => {
    if (state !== 'connecting') return;
    const timeout = window.setTimeout(() => {
      setState('error');
      setMessage(
        'A fonte demorou para responder. Tente novamente ou abra a câmera na fonte.',
      );
    }, 25_000);
    return () => window.clearTimeout(timeout);
  }, [state, attempt]);

  function retry() {
    setMessage('');
    setState('connecting');
    setAttempt((value) => value + 1);
  }

  const failed = state === 'error' || state === 'interrupted';
  const statusText =
    state === 'connecting'
      ? 'Conectando à câmera…'
      : state === 'playing'
        ? 'Imagem recebida da fonte.'
        : state === 'ready'
          ? 'Player do YouTube carregado. Se o vídeo não começar, toque em reproduzir.'
          : message ||
            (state === 'interrupted'
              ? 'A transmissão foi interrompida. Tente novamente.'
              : 'Não foi possível reproduzir esta câmera. Tente novamente ou abra a fonte.');

  return (
    <section aria-label={`Vídeo de ${camera.name}`} className="space-y-3">
      <div className="aspect-video overflow-hidden rounded-xl bg-slate-950">
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
            // Loading an iframe does not prove that a video is playing.
            if (source.kind === 'youtube')
              setState((value) => (value === 'connecting' ? 'ready' : value));
          }}
          onError={() => {
            setState('error');
            setMessage(
              'O player não carregou. Verifique a conexão e tente novamente.',
            );
          }}
        />
      </div>
      <output
        aria-live="polite"
        className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm leading-5 ${failed ? 'bg-amber-50 text-amber-950' : 'bg-slate-100 text-slate-700'}`}
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
    </section>
  );
}
