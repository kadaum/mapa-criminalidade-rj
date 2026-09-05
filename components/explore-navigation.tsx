'use client';
import { useEffect, useRef } from 'react';
export function ExploreNavigation({
  active = '/',
  query = '',
}: {
  active?: string;
  query?: string;
}) {
  const nav = useRef<HTMLElement>(null);
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
    <nav
      ref={nav}
      aria-label="Explorar criminalidade"
      className="flex gap-1 overflow-x-auto border-b border-[#d8e2e5] bg-white px-4 py-2 md:justify-center"
    >
      {[
        ['/', 'Mapa'],
        ['/meu-bairro', 'Meu bairro'],
        ['/comparar', 'Comparar'],
        ['/rankings', 'Rankings'],
        ['/insights', 'Insights'],
      ].map(([path, label]) => (
        <a
          key={path}
          href={`${path}${query}`}
          aria-current={active === path ? 'page' : undefined}
          className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${active === path ? 'bg-[#14323c] text-white' : 'text-[#315c68] hover:bg-[#edf3f4]'}`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
