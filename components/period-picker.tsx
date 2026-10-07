'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { comparisonRange, shiftMonth, validMonth, monthCount, type Comparison } from '@/lib/period-range';

export function PeriodPicker({ min, max, start, end, comparison, onApply, historyHref, mapFrom }: {
  min: string; max: string; start: string; end: string; comparison: Comparison;
  onApply: (start: string, end: string, comparison: Comparison) => void; historyHref?: string; mapFrom?: string;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(start), [to, setTo] = useState(end), [mode, setMode] = useState(comparison);
  const valid = validMonth(from) && validMonth(to) && from >= min && to <= max && from <= to;
  const compare = valid ? comparisonRange(from, to, mode) : null;
  const label = (p: string) => p ? new Date(`${p}-01T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '…';
  const choose = (a: string, b: string) => { setFrom(a < min ? min : a); setTo(b > max ? max : b); };
  const years = max && min ? Array.from({ length: Number(max.slice(0, 4)) - Number(min.slice(0, 4)) + 1 }, (_, i) => Number(max.slice(0, 4)) - i) : [];
  return <Dialog open={open} onOpenChange={value => { if(value) { setFrom(start); setTo(end); setMode(comparison); } setOpen(value); }}>
    <DialogTrigger disabled={!max} className="min-h-11 w-full rounded-xl border border-[#dce2ed] bg-white px-3 text-left text-sm font-semibold">
      {label(start)} → {label(end)} <span className="float-right" aria-hidden>▾</span>
    </DialogTrigger>
    <DialogContent className="bottom-0 left-0 top-auto grid max-h-[calc(100dvh-0.5rem)] w-full max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-b-none rounded-t-2xl p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[min(420px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
      <div className="shrink-0 border-b px-5 py-4 pr-12 text-left">
        <DialogTitle className="text-lg font-semibold">Escolha o período</DialogTitle>
        <DialogDescription className="mt-1">
          Use um atalho ou defina os meses de início e fim.
        </DialogDescription>
      </div>
      <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {[
            ['Últimos 12 meses', shiftMonth(max || '2026-01', -11), max],
            ['Ano até agora', `${max.slice(0,4)}-01`, max],
            ['Ano anterior', `${Number(max.slice(0,4))-1}-01`, `${Number(max.slice(0,4))-1}-12`],
            ['Toda a série', min, max],
          ].map(([name,a,b]) => <Button key={name} variant="outline" size="sm" onClick={() => choose(a,b)} disabled={b < min}>{name}</Button>)}
        </div>
        <label className="block text-sm">Ir para um ano<select className="mt-1 min-h-11 w-full rounded-lg border p-2" value="" onChange={e => choose(`${e.target.value}-01`, `${e.target.value}-12`)}><option value="" disabled>Selecionar ano</option>{years.map(y=><option key={y} value={y}>{y}{y===Number(max.slice(0,4)) && !max.endsWith('-12') ? ' · parcial' : ''}</option>)}</select></label>
        <div className="grid gap-3 min-[380px]:grid-cols-2">
          <label className="min-w-0 text-sm">De<input lang="pt-BR" type="month" aria-label="Mês inicial" min={min} max={max} value={from} onChange={e=>setFrom(e.target.value)} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border px-2 text-sm" /></label>
          <label className="min-w-0 text-sm">Até<input lang="pt-BR" type="month" aria-label="Mês final" min={min} max={max} value={to} onChange={e=>setTo(e.target.value)} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border px-2 text-sm" /></label>
        </div>
        <label className="block text-sm">Comparar com<select value={mode} onChange={e=>setMode(e.target.value as Comparison)} className="mt-1 min-h-11 w-full rounded-lg border p-2"><option value="previous">Período anterior de mesma duração</option><option value="year">Mesmo período do ano anterior</option><option value="none">Sem comparação</option></select></label>
        {compare && <p className="text-sm text-slate-600">Comparação: {label(compare.start)} a {label(compare.end)}.{compare.start < (mapFrom && from >= mapFrom ? mapFrom : min) ? ' Sem cobertura completa para comparar.' : ''}</p>}
        {valid && mode === 'year' && monthCount(from,to) > 12 && <p className="text-sm text-amber-800">Esse intervalo tem mais de 12 meses: parte dos meses também está no período de comparação.</p>}
        {!valid && <p role="alert" className="text-sm text-red-700">Escolha um início anterior ou igual ao fim, dentro da série disponível.</p>}
        <p className="text-xs text-slate-500">Dados mensais disponíveis: {label(min)} a {label(max)}.</p>
        {mapFrom && <p className="text-sm text-slate-600">Períodos anteriores a {label(mapFrom)} abrem o histórico do município. As divisões das delegacias mudaram ao longo dos anos.</p>}
        {historyHref && <a href={historyHref} className="block text-sm font-semibold text-blue-700 underline">Consultar anos anteriores: histórico municipal desde 2003 →</a>}
      </div>
      <div className="shrink-0 border-t bg-white p-4">
        <Button disabled={!valid} className="min-h-11 w-full" onClick={()=>{onApply(from,to,mode);setOpen(false);}}>Aplicar período</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
