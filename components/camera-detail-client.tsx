'use client';

/* oxlint-disable react/react-compiler, next/no-html-link-for-pages */

import { useEffect, useState } from 'react';
import { Bookmark, Map, RotateCcw, Share2 } from 'lucide-react';
import { CameraPlayer } from '@/components/camera-player';
import {
  precisionLabels,
  statusLabels,
  type PublicCamera,
} from '@/lib/public-cameras';
import { emitProductEvent } from '@/lib/product-analytics';

function readableDate(value?: string) {
  if (!value) return 'Sem data registrada';
  const brazilian = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (brazilian)
    return `${brazilian[1]} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(brazilian[3]), Number(brazilian[2]) - 1, 1)))} de ${brazilian[3]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date);
}

export function CameraDetailClient({
  camera,
  canonicalUrl,
  mapHref,
}: {
  camera: PublicCamera;
  canonicalUrl: string;
  mapHref: string;
}) {
  const cameraId = camera.id;
  const [saved, setSaved] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  useEffect(() => {
    try {
      const ids = JSON.parse(
        localStorage.getItem('mapa-rj:favorite-cameras') || '[]',
      );
      setSaved(Array.isArray(ids) && ids.includes(cameraId));
    } catch {
      /* Ignore invalid local preferences. */
    }
  }, [cameraId]);
  function toggleSaved() {
    let ids: string[] = [];
    try {
      const stored = JSON.parse(
        localStorage.getItem('mapa-rj:favorite-cameras') || '[]',
      );
      if (Array.isArray(stored))
        ids = stored.filter((id): id is string => typeof id === 'string');
    } catch {
      /* Start a clean local list. */
    }
    const next = ids.includes(cameraId)
      ? ids.filter((id) => id !== cameraId)
      : [...ids, cameraId];
    localStorage.setItem('mapa-rj:favorite-cameras', JSON.stringify(next));
    setSaved(next.includes(cameraId));
  }
  async function shareCamera() {
    const title = `${camera.name} — ${camera.neighborhood}`;
    const text = `Câmera pública cadastrada pela fonte ${camera.publisher}, em ${camera.neighborhood}. Consulte a disponibilidade na fonte.`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: canonicalUrl });
        setShareStatus('Compartilhado.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(canonicalUrl);
        setShareStatus('Link permanente copiado.');
      } else {
        setShareStatus('Não foi possível compartilhar. Você pode selecionar o link permanente abaixo.');
        return;
      }
      emitProductEvent({ name: 'share', mode: 'fixed', channel: 'link', content: 'camera' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('Não foi possível compartilhar ou copiar o link. Você pode selecionar o link permanente abaixo.');
    }
  }
  return (
    <main id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-4xl p-4 pb-12 outline-none sm:p-6">
      <a
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 underline"
        href={mapHref}
      >
        <Map className="size-4" /> Ver no mapa
      </a>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-teal-800">
            Câmera pública · {camera.publisher}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {camera.name}
          </h1>
          <p className="mt-2 text-slate-600">
            {camera.neighborhood}
            {camera.address ? ` · ${camera.address}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setShareStatus(''); void shareCamera(); }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold sm:px-4"
          >
            <Share2 className="size-4" /> Compartilhar câmera
          </button>
          <button
            type="button"
            onClick={toggleSaved}
            aria-pressed={saved}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold sm:px-4"
          >
            <Bookmark className="size-4" />{' '}
            {saved ? 'Câmera salva' : 'Salvar câmera'}
          </button>
        </div>
      </div>
      <output aria-live="polite" className="mt-2 block min-h-5 text-sm text-slate-600">{shareStatus}</output>
      <section className="mt-6" aria-label="Reprodução da câmera">
        <CameraPlayer camera={camera} />
      </section>
      <details className="mt-6 rounded-xl border p-4">
        <summary className="cursor-pointer font-semibold">
          Fonte, localização e verificação
        </summary>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold">Operador</dt>
            <dd>{camera.operator}</dd>
          </div>
          <div>
            <dt className="font-semibold">Última checagem registrada</dt>
            <dd>{readableDate(camera.checkedAt)}</dd>
          </div>
          <div>
            <dt className="font-semibold">Localização</dt>
            <dd>{precisionLabels[camera.precision]}</dd>
          </div>
          <div>
            <dt className="font-semibold">Estado histórico</dt>
            <dd>{statusLabels[camera.status]}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-slate-600">
          A checagem registrada descreve um teste passado. A reprodução atual
          depende da fonte e do player.
        </p>
      </details>
      <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <RotateCcw className="size-3.5" /> Link permanente:{' '}
        <a className="underline" href={canonicalUrl}>
          {camera.id}
        </a>
      </p>
    </main>
  );
}
