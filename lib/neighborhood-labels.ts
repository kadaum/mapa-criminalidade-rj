import type { FeatureCollection, Geometry } from 'geojson';
import { labelAnchor } from './map-labels.ts';

export type NeighborhoodLabel = {
  code: number;
  name: string;
  position: [number, number];
  area: number;
  minZoom: number;
};

export type NeighborhoodLabelData = {
  version: 1;
  sourceSha256: string;
  labels: NeighborhoodLabel[];
};

type NeighborhoodProperties = { code: number; name: string; areaM2?: number };

function minZoom(area: number) {
  return area >= 10_000_000 ? 9.8 : area >= 2_000_000 ? 10.4 : 11;
}

export function buildNeighborhoodLabels(
  input: unknown,
  sourceSha256: string,
): NeighborhoodLabelData {
  const data = input as FeatureCollection<Geometry, NeighborhoodProperties>;
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new TypeError('Neighborhood source must be a FeatureCollection');
  }
  const codes = new Set<number>();
  const labels = data.features.map((feature, index) => {
    const code = Number(feature?.properties?.code);
    const name = feature?.properties?.name;
    const area = Number(feature?.properties?.areaM2 ?? 0);
    if (!feature?.geometry || !Number.isInteger(code) || code <= 0 ||
        typeof name !== 'string' || !name.trim() || !Number.isFinite(area) || area < 0) {
      throw new TypeError(`Invalid neighborhood feature at index ${index}`);
    }
    if (codes.has(code)) throw new TypeError(`Duplicate neighborhood code ${code}`);
    codes.add(code);
    const position = labelAnchor(feature.geometry);
    if (!position || !position.every(Number.isFinite)) {
      throw new TypeError(`Neighborhood ${name} has no valid label anchor`);
    }
    return { code, name, position, area, minZoom: minZoom(area) };
  });
  labels.sort((a, b) => b.area - a.area || a.name.localeCompare(b.name));
  return { version: 1, sourceSha256, labels };
}

export function parseNeighborhoodLabels(input: unknown): NeighborhoodLabelData {
  const data = input as NeighborhoodLabelData;
  if (data?.version !== 1 || typeof data.sourceSha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(data.sourceSha256) || !Array.isArray(data.labels)) {
    throw new TypeError('Invalid neighborhood label payload');
  }
  for (const [index, label] of data.labels.entries()) {
    if (!Number.isInteger(label?.code) || label.code <= 0 ||
        typeof label?.name !== 'string' || !label.name.trim() ||
        !Array.isArray(label.position) || label.position.length !== 2 ||
        !label.position.every(Number.isFinite) || !Number.isFinite(label.area) ||
        !Number.isFinite(label.minZoom)) {
      throw new TypeError(`Invalid neighborhood label at index ${index}`);
    }
  }
  return data;
}
