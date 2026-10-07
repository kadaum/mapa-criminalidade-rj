'use client';
/* oxlint-disable next/no-html-link-for-pages */
import { MapPinned } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { publicNavigationQuery } from './crime-atlas-url';
export function SiteHeader({ date }: { date?: string }) {
  const current = useSearchParams();
  const filters = publicNavigationQuery(new URLSearchParams(current));
  const query = filters.size ? `?${filters}` : '';
  const primary = [
    [`/${query}`, 'Criminalidade'],
    [`/cameras${query}`, 'Câmeras'],
    [`/meu-bairro${query}`, 'Meu bairro'],
    ['/boletins', 'Boletins'],
  ];
  return (
    <header className="atlas-header px-3 py-2 md:px-6">
      <div className="mx-auto flex max-w-[1760px] flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <a
          href="/"
          className="flex min-h-10 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <MapPinned
            className="size-7 shrink-0 text-[#a9c1ff]"
            aria-hidden="true"
          />
          <span>
            <span className="block text-base font-semibold tracking-tight">
              <span className="min-[420px]:hidden">Mapa RJ</span>
              <span className="hidden min-[420px]:inline">
                Mapa da Criminalidade RJ
              </span>
            </span>
            <span className="hidden text-xs opacity-70 sm:block">
              Registros policiais oficiais por região
            </span>
          </span>
        </a>
        <nav
          aria-label="Navegação principal"
          className="order-3 flex w-full gap-1 overflow-x-auto [scrollbar-width:none] sm:order-none sm:w-auto"
        >
          {primary.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="inline-flex min-h-10 shrink-0 items-center rounded-lg px-3 text-sm font-semibold underline-offset-4 hover:bg-white/10 hover:underline"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {date && (
            <p className="hidden text-[#c5d1e6] md:block">Fonte até {date}</p>
          )}
        </div>
      </div>
    </header>
  );
}
