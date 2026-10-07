'use client';
/* oxlint-disable react/react-compiler -- initial fetch hydrates the authenticated moderation queue. */
import { useEffect, useState } from 'react';

type QueueStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected';

const queueStatusLabels: Record<QueueStatus, string> = {
  pending: 'Pendente',
  reviewing: 'Em revisão',
  accepted: 'Aceita',
  rejected: 'Rejeitada',
};

type Item = {
  id: string;
  kind: string;
  source_url: string | null;
  comment: string;
  status: string;
  moderator_note: string | null;
  created_at: number;
};

export function AdminQueue() {
  const [items, setItems] = useState<Item[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('pending');
  const [message, setMessage] = useState('Carregando…');
  async function load(status: QueueStatus, signal?: AbortSignal) {
    try {
      const response = await fetch(
        `/api/contributions/admin?status=${status}`,
        { cache: 'no-store', signal },
      );
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        contributions?: Item[];
      } | null;
      if (signal?.aborted) return;
      if (!response.ok)
        return setMessage(data?.error ?? 'Não foi possível carregar a fila.');
      const contributions = data?.contributions ?? [];
      setItems(contributions);
      setMessage(
        contributions.length
          ? ''
          : `Nenhuma contribuição ${queueStatusLabels[status].toLowerCase()}.`,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage('Não foi possível conectar ao serviço de moderação.');
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    setMessage('Carregando…');
    void load(queueStatus, controller.signal);
    return () => controller.abort();
  }, [queueStatus]);
  async function review(
    id: string,
    status: 'reviewing' | 'accepted' | 'rejected',
  ) {
    if (busyId !== null) return;
    const item = items.find((candidate) => candidate.id === id);
    setBusyId(id);
    setMessage('Salvando revisão…');
    try {
      const response = await fetch(`/api/contributions/admin/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          note: notesById[id] ?? item?.moderator_note ?? '',
        }),
      });
      if (response.ok) await load(queueStatus);
      else setMessage('Não foi possível atualizar esta contribuição.');
    } catch {
      setMessage('Não foi possível conectar ao serviço de moderação.');
    } finally {
      setBusyId(null);
    }
  }
  return (
    <section className="mt-8 space-y-4">
      <label className="block text-sm font-semibold" htmlFor="queue-status">
        Estado da fila
      </label>
      <select
        id="queue-status"
        value={queueStatus}
        disabled={busyId !== null}
        onChange={(event) => setQueueStatus(event.target.value as QueueStatus)}
        className="rounded-lg border border-[#718096] bg-white px-3 py-2"
      >
        {Object.entries(queueStatusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {message && <output className="block">{message}</output>}
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-[#d9e0ea] bg-white p-5"
        >
          <p className="text-sm text-[#526078]">
            {item.kind === 'camera_broken'
              ? 'Câmera com problema'
              : item.kind === 'correct_location'
                ? 'Correção de localização'
                : item.kind === 'suggest_source'
                  ? 'Sugestão de fonte'
                  : item.kind}{' '}
            ·{' '}
            {new Date(item.created_at * 1000).toLocaleString('pt-BR')}
          </p>
          <p className="mt-2 text-sm font-semibold">{queueStatusLabels[item.status as QueueStatus] ?? item.status}</p>
          <p className="mt-3 whitespace-pre-wrap">{item.comment}</p>
          {item.source_url && (
            <a
              className="mt-3 block break-all underline"
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
            >
              Abrir link enviado
            </a>
          )}
          <label className="mt-4 block text-sm font-semibold" htmlFor={`note-${item.id}`}>
            Nota interna (opcional)
          </label>
          <textarea
            id={`note-${item.id}`}
            value={notesById[item.id] ?? item.moderator_note ?? ''}
            onChange={(event) =>
              setNotesById((current) => ({ ...current, [item.id]: event.target.value }))
            }
            maxLength={500}
            rows={3}
            className="mt-2 block w-full rounded-lg border border-[#718096] p-3"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => review(item.id, 'reviewing')}
              disabled={busyId !== null}
              className="rounded-full border px-4 py-2"
            >
              Em revisão
            </button>
            <button
              type="button"
              onClick={() => review(item.id, 'accepted')}
              disabled={busyId !== null}
              className="rounded-full bg-[#163b65] px-4 py-2 text-white"
            >
              Aceitar para análise
            </button>
            <button
              type="button"
              onClick={() => review(item.id, 'rejected')}
              disabled={busyId !== null}
              className="rounded-full border px-4 py-2"
            >
              Rejeitar
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
