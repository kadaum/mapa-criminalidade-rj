import type { Geometry, Position } from 'geojson';

// Interior point on the largest polygon. The scanline includes holes, so a
// neighborhood name is never placed in a bay simply because its bounds span it.
export function labelAnchor(geometry: Geometry): [number, number] | null {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  const area = (ring: Position[]) => Math.abs(ring.reduce((sum, p, i) => {
    const q = ring[(i + 1) % ring.length];
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0));
  const polygon = [...polygons].sort((a, b) => area(b[0]) - area(a[0]))[0];
  if (!polygon?.[0]?.length) return null;
  const ys = polygon[0].map(p => p[1]);
  const low = Math.min(...ys), high = Math.max(...ys);
  let best: [number, number] | null = null, width = 0;
  for (const fraction of [0.5, 0.4, 0.6, 0.3, 0.7]) {
    const y = low + (high - low) * fraction;
    const intersections: number[] = [];
    for (const ring of polygon) for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      if ((a[1] > y) !== (b[1] > y))
        intersections.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const span = intersections[i + 1] - intersections[i];
      if (span > width) { width = span; best = [(intersections[i] + intersections[i + 1]) / 2, y]; }
    }
  }
  return best;
}

export type LabelBox = { id: number; x: number; y: number; width: number; height: number };
// Candidates arrive in stable priority order. Padding keeps adjacent names
// readable; viewport bounds also reserve room for the map controls and legend.
export function visibleLabelIds(candidates: LabelBox[], width: number, height: number) {
  const accepted: LabelBox[] = [];
  for (const box of candidates) {
    if (box.x - box.width / 2 < 12 || box.x + box.width / 2 > width - 12 ||
        box.y - box.height / 2 < 66 || box.y + box.height / 2 > height - 120) continue;
    if (accepted.some(other => Math.abs(box.x - other.x) < (box.width + other.width) / 2 + 14 &&
        Math.abs(box.y - other.y) < (box.height + other.height) / 2 + 12)) continue;
    accepted.push(box);
  }
  return new Set(accepted.map(box => box.id));
}
