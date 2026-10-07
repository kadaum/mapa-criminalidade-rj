'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';

const KEY = 'crime-map-analytics-consent';

export function hasAnalyticsConsent() {
  try { return window.localStorage.getItem(KEY) === 'accepted'; } catch { return false; }
}

function getChoice() {
  try { return window.localStorage.getItem(KEY); } catch { return null; }
}
function subscribe(callback: () => void) {
  window.addEventListener('analytics-consent-changed', callback);
  window.addEventListener('storage', callback);
  return () => { window.removeEventListener('analytics-consent-changed', callback); window.removeEventListener('storage', callback); };
}

export function PrivacyControls() {
  const choice = useSyncExternalStore(subscribe, getChoice, () => 'loading');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('open-privacy-preferences', show);
    return () => window.removeEventListener('open-privacy-preferences', show);
  }, []);
  if (choice === 'loading' || (choice && !open)) return null;
  function choose(value: 'accepted' | 'rejected') {
    const wasAccepted = hasAnalyticsConsent();
    try { window.localStorage.setItem(KEY, value); } catch { /* Continue without persistence. */ }
    setOpen(false);
    window.dispatchEvent(new Event('analytics-consent-changed'));
    if (wasAccepted && value === 'rejected') window.location.reload();
  }
  return <aside aria-label="Preferências de privacidade" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border border-[#dce2ed] bg-white p-4 text-sm text-[#172235] shadow-2xl sm:p-5">
    <p className="font-semibold">Privacidade no Mapa da Criminalidade RJ</p>
    <p className="mt-1 leading-6">Usamos Google Analytics apenas se você aceitar. A escolha não afeta o acesso ao mapa. Leia a <Link className="underline" href="/privacidade">Política de Privacidade</Link>.</p>
    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => choose('rejected')} className="rounded-lg border border-[#526078] px-4 py-2">Recusar</button><button type="button" onClick={() => choose('accepted')} className="rounded-lg bg-[#172235] px-4 py-2 text-white">Aceitar analytics</button></div>
  </aside>;
}

export function PrivacyPreferencesButton() {
  return <button type="button" className="underline" onClick={() => window.dispatchEvent(new Event('open-privacy-preferences'))}>Preferências de cookies</button>;
}
