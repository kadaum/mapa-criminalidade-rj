'use client';
import { useState, type SyntheticEvent } from 'react';

const statusLabels: Record<string, string> = {
  pending: 'pendente',
  reviewing: 'em revisão',
  accepted: 'aceita',
  rejected: 'rejeitada',
};

export function StatusLookup({ initial = '' }: { initial?: string }) {
  const [result, setResult] = useState('');
  async function lookup(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const entry = new FormData(event.currentTarget).get('protocolo');
    const protocol = typeof entry === 'string' ? entry.trim() : '';
    const response = await fetch(
      `/api/contributions/status/${encodeURIComponent(protocol)}`,
    );
    const data = (await response.json().catch(() => null)) as {
      status?: string;
      error?: string;
    } | null;
    setResult(
      response.ok
        ? `Status: ${statusLabels[data?.status ?? ''] ?? 'desconhecido'}`
        : (data?.error ?? 'Não foi possível consultar.'),
    );
  }
  return (
    <form onSubmit={lookup} className="mt-8 rounded-2xl bg-white p-6">
      <label className="font-semibold" htmlFor="protocol">
        Protocolo
      </label>
      <input
        id="protocol"
        name="protocolo"
        defaultValue={initial}
        required
        className="mt-2 block w-full rounded-lg border border-[#718096] p-3 font-mono"
      />
      <button className="mt-4 rounded-full bg-[#163b65] px-5 py-3 font-semibold text-white">
        Consultar
      </button>
      {result && <output className="mt-4 block">{result}</output>}
    </form>
  );
}
