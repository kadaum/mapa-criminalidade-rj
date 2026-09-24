import { ORIGIN, ids, indicatorList, sourceUpdated } from '@/lib/organic-data';
const paths = ['/', '/regioes', ...ids.map((id) => `/regioes/cisp-${id}`), '/indicadores', ...indicatorList.map((item) => `/indicadores/${item.id}`), '/dados', '/metodologia', '/boletins/2026-08'];
export function GET() {
  const entries = paths.map((path) => {
    const updated = path === '/metodologia' || path.startsWith('/boletins/') ? '2026-09-24' : (sourceUpdated > '2026-09-24' ? sourceUpdated : '2026-09-24');
    return `<url><loc>${ORIGIN}${path}</loc><lastmod>${updated}</lastmod></url>`;
  }).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
