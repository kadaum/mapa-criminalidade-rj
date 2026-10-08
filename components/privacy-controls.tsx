'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
  const hasSavedChoice = choice === 'accepted' || choice === 'rejected';
  const openerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    const show = (event: Event) => {
      const eventOpener = event instanceof CustomEvent ? event.detail : null;
      const activeElement = document.activeElement;
      openerRef.current = eventOpener instanceof HTMLElement
        ? eventOpener
        : activeElement instanceof HTMLElement ? activeElement : null;
      setOpen(true);
    };
    window.addEventListener('open-privacy-preferences', show);
    return () => window.removeEventListener('open-privacy-preferences', show);
  }, []);

  useEffect(() => {
    if (open || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) opener.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !hasSavedChoice) return;
    closeButtonRef.current?.focus();
  }, [hasSavedChoice, open]);

  useEffect(() => {
    if (!open || !hasSavedChoice) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const activeElement = document.activeElement;
      if (!activeElement || !panelRef.current?.contains(activeElement)) return;
      event.preventDefault();
      restoreFocusRef.current = openerRef.current !== null;
      setOpen(false);
    };
    window.addEventListener('keydown', dismissOnEscape);
    return () => window.removeEventListener('keydown', dismissOnEscape);
  }, [hasSavedChoice, open]);

  if (choice === 'loading' || (choice && !open)) return null;
  function choose(value: 'accepted' | 'rejected') {
    const wasAccepted = hasAnalyticsConsent();
    try { window.localStorage.setItem(KEY, value); } catch { /* Continue without persistence. */ }
    restoreFocusRef.current = openerRef.current !== null;
    setOpen(false);
    window.dispatchEvent(new Event('analytics-consent-changed'));
    if (wasAccepted && value === 'rejected') window.location.reload();
  }
  const dismiss = () => {
    restoreFocusRef.current = openerRef.current !== null;
    setOpen(false);
  };

  return <aside ref={panelRef} aria-label="Preferências de privacidade" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border border-[#dce2ed] bg-white p-4 text-sm text-[#172235] shadow-2xl sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <p className="font-semibold">Privacidade no Mapa da Criminalidade RJ</p>
      {open && hasSavedChoice && <button ref={closeButtonRef} type="button" onClick={dismiss} className="rounded-lg border border-[#526078] px-3 py-1.5">Fechar</button>}
    </div>
    <p className="mt-1 leading-6">Usamos Google Analytics apenas se você aceitar. A escolha não afeta o acesso ao mapa. Leia a <Link className="underline" href="/privacidade">Política de Privacidade</Link>.</p>
    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => choose('rejected')} className="rounded-lg border border-[#526078] px-4 py-2">Recusar</button><button type="button" onClick={() => choose('accepted')} className="rounded-lg bg-[#172235] px-4 py-2 text-white">Aceitar analytics</button></div>
  </aside>;
}

export function PrivacyPreferencesButton() {
  return <button type="button" className="underline" onClick={(event) => window.dispatchEvent(new CustomEvent('open-privacy-preferences', { detail: event.currentTarget }))}>Preferências de cookies</button>;
}
