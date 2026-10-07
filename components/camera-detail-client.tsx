'use client';

/* oxlint-disable react/react-compiler, next/no-html-link-for-pages */

import { useEffect, useState } from 'react';
import { Bookmark, Map, RotateCcw } from 'lucide-react';
import { CameraPlayer } from '@/components/camera-player';
import type { PublicCamera } from '@/lib/public-cameras';

export function CameraDetailClient({
  camera,
  canonicalUrl,
}: {
  camera: PublicCamera;
  canonicalUrl: string;
}) {
  const cameraId = camera.id;
  const [saved, setSaved] = useState(false);
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
  return (
    <main className="mx-auto max-w-4xl p-4 pb-12 sm:p-6">
      <a
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 underline"
        href="/cameras"
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
        <button
          type="button"
          onClick={toggleSaved}
          aria-pressed={saved}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold"
        >
          <Bookmark className="size-4" />{' '}
          {saved ? 'Câmera salva' : 'Salvar câmera'}
        </button>
      </div>
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
            <dd>{camera.checkedAt || 'Sem data registrada'}</dd>
          </div>
          <div>
            <dt className="font-semibold">Localização</dt>
            <dd>{camera.precision}</dd>
          </div>
          <div>
            <dt className="font-semibold">Estado histórico</dt>
            <dd>{camera.status}</dd>
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
