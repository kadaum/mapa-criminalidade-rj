'use client';

import { useState, type SyntheticEvent } from 'react';
import { emitProductEvent } from '@/lib/product-analytics';

export function ContributionForm() {
  const [message, setMessage] = useState('');
  const [protocol, setProtocol] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setMessage('');
    setProtocol('');
    try {
      const form = new FormData(formElement);
      const response = await fetch('/api/contributions/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: form.get('kind'),
          sourceUrl: form.get('sourceUrl'),
          comment: form.get('comment'),
          website: form.get('website'),
        }),
      }).catch(() => null);
      const data = (await response?.json().catch(() => null)) as {
        protocol?: string;
        error?: string;
      } | null;
      if (response?.ok) {
        const kind = form.get('kind');
        emitProductEvent({
          name: 'contribution_received',
          kind:
            kind === 'correct_location'
              ? 'location_correction'
              : kind === 'suggest_source'
                ? 'public_source'
                : 'camera_broken',
        });
        setProtocol(data?.protocol ?? '');
        setMessage('Contribuição recebida e aguardando revisão.');
        formElement.reset();
      } else setMessage(data?.error ?? 'Não foi possível enviar agora.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-8 space-y-5 rounded-2xl border border-[#d9e0ea] bg-white p-6"
    >
      <div>
        <label className="block font-semibold" htmlFor="kind">
          O que você quer informar?
        </label>
        <select
          id="kind"
          name="kind"
          required
          className="mt-2 w-full rounded-lg border border-[#aeb9c8] bg-white p-3"
        >
          <option value="camera_broken">Câmera não está funcionando</option>
          <option value="correct_location">Corrigir localização</option>
          <option value="suggest_source">Sugerir fonte pública</option>
        </select>
      </div>
      <div>
        <label className="block font-semibold" htmlFor="sourceUrl">
          Link público da fonte ou câmera
        </label>
        <input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          maxLength={2048}
          placeholder="https://…"
          className="mt-2 w-full rounded-lg border border-[#aeb9c8] p-3"
        />
        <p className="mt-1 text-sm text-[#526078]">
          Obrigatório ao sugerir uma fonte. O site não abre o link
          automaticamente.
        </p>
      </div>
      <div>
        <label className="block font-semibold" htmlFor="comment">
          Comentário
        </label>
        <textarea
          id="comment"
          name="comment"
          required
          maxLength={1000}
          rows={6}
          className="mt-2 w-full rounded-lg border border-[#aeb9c8] p-3"
        />
        <p className="mt-1 text-sm text-[#526078]">
          Até 1.000 caracteres. Não inclua nome, email, telefone ou outros dados
          pessoais.
        </p>
      </div>
      <div aria-hidden="true" className="absolute -left-[10000px]">
        <label htmlFor="website">Site</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button
        disabled={busy}
        className="rounded-full bg-[#163b65] px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {busy ? 'Enviando…' : 'Enviar contribuição'}
      </button>
      {message && <output className="block font-medium">{message}</output>}
      {protocol && (
        <div className="rounded-xl bg-[#eef4f9] p-4">
          <p>
            Guarde este protocolo. Ele é a única forma de consultar o andamento:
          </p>
          <code className="mt-2 block break-all font-semibold">{protocol}</code>
          <a
            className="mt-2 inline-block underline"
            href={`/contribuir/status?protocolo=${encodeURIComponent(protocol)}`}
          >
            Consultar andamento
          </a>
        </div>
      )}
    </form>
  );
}
