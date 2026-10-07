import { bulletinPeriods } from '@/lib/bulletin-data';
import { pilotNeighborhoods } from '@/lib/neighborhood-pages';
import { ORIGIN, ids, indicatorList, sourceUpdated } from '@/lib/organic-data';
const paths = ['/', '/regioes', ...ids.map((id) => `/regioes/cisp-${id}`), '/bairros', ...pilotNeighborhoods.map((item) => `/bairros/${item.slug}`), '/indicadores', ...indicatorList.map((item) => `/indicadores/${item.id}`), '/dados', '/metodologia', '/boletins', ...bulletinPeriods().map((value) => `/boletins/${value}`), '/privacidade', '/termos'];
export function GET() {
  const entries = paths.map((path) => {
    const updated = path === '/privacidade' || path === '/termos' ? '2026-09-27' : path === '/metodologia' || path.startsWith('/boletins/') ? '2026-09-24' : (sourceUpdated > '2026-09-24' ? sourceUpdated : '2026-09-24');
    return `<url><loc>${ORIGIN}${path}</loc><lastmod>${updated}</lastmod></url>`;
  }).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
