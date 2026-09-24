/* oxlint-disable next/no-html-link-for-pages */
import { MapPinned } from 'lucide-react';
export function SiteHeader({ date }: { date?: string }) {
  return (
    <header className="atlas-header px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-[1760px] items-center justify-between gap-3">
        <a
          href="/"
          className="flex min-h-10 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <MapPinned
            className="size-8 shrink-0 text-[#a9c1ff]"
            aria-hidden="true"
          />
          <span>
            <span className="block text-base font-semibold tracking-tight">
              Mapa da Criminalidade RJ
            </span>
            <span className="hidden text-xs opacity-70 sm:block">
              Registros policiais oficiais por região
            </span>
          </span>
        </a>
        <div className="flex items-center gap-3 text-sm sm:gap-5">
          {date && (
            <p className="hidden text-[#c5d1e6] md:block">Fonte até {date}</p>
          )}
          <a href="/regioes" className="hidden min-h-11 items-center underline-offset-4 hover:underline sm:inline-flex">Regiões</a>
          <a href="/indicadores" className="hidden min-h-11 items-center underline-offset-4 hover:underline md:inline-flex">Indicadores</a>
          <a href="/dados" className="hidden min-h-11 items-center underline-offset-4 hover:underline lg:inline-flex">Dados</a>
          <a
            href="/metodologia"
            className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline"
          >
            Método
          </a>
        </div>
      </div>
    </header>
  );
}
