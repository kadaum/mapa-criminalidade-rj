import { fetchIspSnapshot } from '@/lib/isp-data';

export async function GET() {
  try {
    const snapshot = await fetchIspSnapshot();
    return Response.json(snapshot, {
      headers: {
        'Cache-Control':
          'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400',
        'X-Data-Source': 'ISP-RJ',
      },
    });
  } catch {
    return Response.json(
      {
        error:
          'A fonte oficial não respondeu. Use o snapshot de segurança incluído no site.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
