'use client';
import { useEffect, useRef } from 'react';
import { publicNavigationQuery } from './crime-atlas-url';
export function ExploreNavigation({
  active = '/',
  query = '',
}: {
  active?: string;
  query?: string;
}) {
  const nav = useRef<HTMLElement>(null);
  const safeQuery = publicNavigationQuery(query);
  const navigationQuery = safeQuery.size ? `?${safeQuery}` : '';
  useEffect(() => {
    const selected = nav.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (selected && nav.current)
      nav.current.scrollLeft = Math.max(
        0,
        selected.offsetLeft - nav.current.offsetLeft - 20,
      );
  }, [active]);
  return (
    <>
      <details className="explore-more border-b border-[#2c3950] bg-[#111c30] px-3 text-white md:hidden">
        <summary className="flex min-h-10 cursor-pointer items-center font-semibold">
          Mais opções
        </summary>
        <div className="grid grid-cols-2 gap-1 pb-2">
          {[
            ['/comparar', 'Comparar'],
            ['/rankings', 'Ranking'],
            ['/historico', 'Histórico'],
            ['/dados', 'Fontes e dados'],
          ].map(([path, label]) => (
            <a
              key={path}
              href={`${path}${navigationQuery}`}
              className="rounded-lg px-3 py-2 text-sm text-[#c5d1e6] hover:bg-white/10"
            >
              {label}
            </a>
          ))}
        </div>
      </details>
      <nav
        ref={nav}
        aria-label="Explorar criminalidade"
        className="explore-nav hidden gap-2 overflow-x-auto border-b px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex md:px-6"
      >
        {[
          ['/comparar', 'Comparar'],
          ['/rankings', 'Ranking'],
          ['/historico', 'Histórico'],
          ['/dados', 'Fontes e dados'],
        ].map(([path, label]) => (
          <a
            key={path}
            href={`${path}${navigationQuery}`}
            aria-current={active === path ? 'page' : undefined}
            className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${active === path ? 'bg-[#172235] text-white' : 'text-[#324c86] hover:bg-[#eaf0fc]'}`}
          >
            {label}
          </a>
        ))}
      </nav>
    </>
  );
}
