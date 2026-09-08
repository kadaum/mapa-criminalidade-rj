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
      className="explore-nav flex gap-2 overflow-x-auto border-b px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-6"
    >
      {[
        ['/', 'Mapa'],
        ['/rankings', 'Ranking'],
        ['/meu-bairro', 'Meu bairro'],
        ['/comparar', 'Comparar'],
        ['/insights', 'Insights'],
        ['/historico', 'Histórico'],
      ].map(([path, label]) => (
        <a
          key={path}
          href={`${path}${query}`}
          aria-current={active === path ? 'page' : undefined}
          className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${active === path ? 'bg-[#172235] text-white' : 'text-[#324c86] hover:bg-[#eaf0fc]'}`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
