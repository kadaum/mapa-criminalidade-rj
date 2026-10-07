/* oxlint-disable next/no-html-link-for-pages, jsx-a11y/prefer-tag-over-role */
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { ORIGIN, fmt, queryFor, shortMonth, type monthlySeries } from '@/lib/organic-data';

export function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export function PageShell({ children, crumbs }: { children: ReactNode; crumbs: { label: string; path?: string }[] }) {
  return <main className="organic-page min-h-screen bg-[#f3f5fa] text-[#172235]">
    <SiteHeader />
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
      <nav aria-label="Caminho" className="mb-6 flex flex-wrap gap-2 text-sm text-[#526078]">
        <a className="underline underline-offset-4" href="/">Mapa</a>
        {crumbs.map((item) => <span key={item.label} className="flex gap-2"><span aria-hidden="true">/</span>{item.path ? <a className="underline underline-offset-4" href={item.path}>{item.label}</a> : <span aria-current="page">{item.label}</span>}</span>)}
      </nav>
      <div id="conteudo-principal" tabIndex={-1} className="outline-none">{children}</div>
      <footer className="mt-12 border-t border-[#dce2ed] pt-6 text-sm text-[#526078]">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <a href="/regioes" className="underline">Regiões</a><a href="/indicadores" className="underline">Indicadores</a>
          <a href="/dados" className="underline">Dados e downloads</a><a href="/metodologia" className="underline">Metodologia</a>
          <a href="/boletins/2026-08" className="underline">Boletim de agosto de 2026</a>
        </div>
      </footer>
    </div>
  </main>;
}

export function BreadcrumbLd({ items }: { items: { name: string; path: string }[] }) {
  return <JsonLd value={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Mapa', item: ORIGIN }, ...items.map((item, index) => ({ '@type': 'ListItem', position: index + 2, name: item.name, item: `${ORIGIN}${item.path}` }))] }} />;
}

export function SeriesTable({ rows, unit }: { rows: ReturnType<typeof monthlySeries>; unit: string }) {
  return <div className="overflow-x-auto rounded-2xl border border-[#dce2ed] bg-white">
    <table className="w-full border-collapse text-left text-sm">
      <caption className="p-4 text-left text-base font-semibold">Série mensal · {unit}</caption>
      <thead className="bg-[#eaf0fc] text-[#172235]"><tr><th className="px-4 py-3" scope="col">Mês</th><th className="px-4 py-3 text-right" scope="col">Quantidade</th></tr></thead>
      <tbody>{[...rows].reverse().map((row) => <tr className="border-t border-[#e7ebf2]" key={row.month}><th className="px-4 py-2 font-medium" scope="row">{shortMonth(row.month)}</th><td className="px-4 py-2 text-right tabular-nums">{fmt(row.value)}</td></tr>)}</tbody>
    </table>
  </div>;
}

export function SourceNote() {
  return <p className="text-sm leading-6 text-[#526078]">Fonte: <a className="underline" href="https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv">ISP-RJ, série mensal por CISP</a>. Dados de ocorrências comunicadas à polícia: a subnotificação impede interpretar estas quantidades como todos os fatos ocorridos. Uma CISP pode incluir bairros inteiros ou partes de bairros; a contagem não é atribuída a cada bairro. Taxas usam moradores do Censo 2022, não população circulante nem risco individual. <a className="underline" href="/metodologia">Entenda o método</a>.</p>;
}

type Position = number[];
function polygons(geometry: { type: string; coordinates: unknown }): Position[][] {
  const coordinates = geometry.coordinates as Position[][] | Position[][][];
  return geometry.type === 'Polygon' ? coordinates as Position[][] : (coordinates as Position[][][]).flat();
}
export function RegionMap({ selected }: { selected: number }) {
  // The display map uses the simplified official CISP geometry. Population allocation uses the full geometry separately.
  const features = (awaitlessBoundary() as { features: { properties: { cisp: number }; geometry: { type: string; coordinates: unknown } }[] }).features;
  const all = features.flatMap((feature) => polygons(feature.geometry).flat());
  const lons = all.map((point) => point[0]), lats = all.map((point) => point[1]);
  const minX = Math.min(...lons), maxX = Math.max(...lons), minY = Math.min(...lats), maxY = Math.max(...lats);
  const scale = Math.min(680 / (maxX - minX), 430 / (maxY - minY));
  const path = (feature: typeof features[number]) => polygons(feature.geometry).map((ring) => ring.map((point, i) => `${i ? 'L' : 'M'}${((point[0] - minX) * scale + 10).toFixed(1)},${((maxY - point[1]) * scale + 10).toFixed(1)}`).join(' ') + ' Z').join(' ');
  return <div className="rounded-2xl border border-[#dce2ed] bg-[#e9f1fa] p-3">
    <svg viewBox="0 0 700 450" role="img" aria-label={`Mapa das 41 CISPs do Rio de Janeiro, com CISP ${selected} destacada`} className="h-auto w-full">
      {features.map((feature) => <path key={feature.properties.cisp} d={path(feature)} fill={feature.properties.cisp === selected ? '#d96930' : '#b5cae7'} stroke="#fff" strokeWidth="1.2" />)}
    </svg>
    <p className="px-2 pb-2 text-sm text-[#526078]">CISP {selected} em destaque · geometria simplificada para visualização. <a className="underline" href={`/${queryFor(selected)}`}>Abrir mapa interativo</a>.</p>
  </div>;
}

// Kept in a separate function so the module only imports the small, display geometry once.
import boundaryRaw from '@/public/data/cisp-rio.geojson?raw';
function awaitlessBoundary() { return JSON.parse(boundaryRaw); }
