import transportJson from '@/public/data/neighborhood-transport.json';

type TransportStop = {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
};

type NeighborhoodTransport = {
  code: number;
  name: string;
  slug: string;
  geometryType: 'Polygon' | 'MultiPolygon';
  count: number;
  stops: TransportStop[];
};

type TransportDataset = {
  source: {
    sourceVersion: string;
    provider: string;
    itemUrl: string;
    license: string;
    licenseUrl: string;
    itemModified: string;
    layerLastEditDate: string;
    retrievedAt: string;
    candidateSha256: string;
    itemMetadataSha256: string;
    layerMetadataSha256: string;
    qaSha256: string;
    rawQuerySha256: string;
  };
  neighborhoods: NeighborhoodTransport[];
};

export const neighborhoodTransport = transportJson as TransportDataset;

export function transportForNeighborhood(slug: string) {
  return neighborhoodTransport.neighborhoods.find((item) => item.slug === slug);
}
