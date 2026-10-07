import { bulletinPeriods } from '@/lib/bulletin-data';
import { ORIGIN, ids, indicatorList } from '@/lib/organic-data';
import { pilotNeighborhoods } from '@/lib/neighborhood-pages';
const paths = ['/', '/regioes', ...ids.map((id) => `/regioes/cisp-${id}`), '/bairros', ...pilotNeighborhoods.map((item) => `/bairros/${item.slug}`), '/indicadores', ...indicatorList.map((item) => `/indicadores/${item.id}`), '/dados', '/metodologia', '/boletins', '/cameras', ...bulletinPeriods().map((value) => `/boletins/${value}`), '/privacidade', '/termos'];
export function GET() {
  const entries = paths.map((path) => `<url><loc>${ORIGIN}${path}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
