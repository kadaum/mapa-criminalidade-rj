import snapshot from '@/public/data/crime-rio-snapshot.json';

export function GET() {
  return Response.json(snapshot, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=21600',
      'X-Data-Source': 'ISP-RJ validated published snapshot',
      'X-Data-Period': snapshot.latestPeriod,
    },
  });
}
