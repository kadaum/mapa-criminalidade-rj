const TARGETS = [
  { code: 5, name: 'Centro', slug: 'centro' },
  { code: 24, name: 'Copacabana', slug: 'copacabana' },
  { code: 33, name: 'Tijuca', slug: 'tijuca' },
  { code: 128, name: 'Barra da Tijuca', slug: 'barra-da-tijuca' },
  { code: 144, name: 'Campo Grande', slug: 'campo-grande' },
];

export const BOUNDARY_TOLERANCE_DEGREES = 1e-9;

const samePosition = (a, b) => Array.isArray(a) && Array.isArray(b)
  && a.length >= 2 && b.length >= 2 && a[0] === b[0] && a[1] === b[1];

export function validateRing(ring) {
  if (!Array.isArray(ring) || ring.length < 4) throw new Error('Each linear ring must contain at least four positions');
  for (const position of ring) {
    if (!Array.isArray(position) || position.length < 2 || !Number.isFinite(position[0]) || !Number.isFinite(position[1])) {
      throw new Error('Every ring position must contain finite longitude and latitude');
    }
  }
  if (!samePosition(ring[0], ring.at(-1))) throw new Error('Every linear ring must be closed');
}

export function validateGeometry(geometry) {
  const polygons = geometry?.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry?.type === 'MultiPolygon' ? geometry.coordinates : null;
  if (!polygons?.length) throw new Error('Target geometry must be a non-empty Polygon or MultiPolygon');
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) throw new Error('Each polygon must contain an exterior ring');
    for (const ring of polygon) validateRing(ring);
  }
}

function squaredDistanceToSegment([x, y], [x1, y1], [x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return (x - x1) ** 2 + (y - y1) ** 2;
  const projection = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx ** 2 + dy ** 2)));
  return (x - (x1 + projection * dx)) ** 2 + (y - (y1 + projection * dy)) ** 2;
}

function pointOnSegment(point, start, end) {
  return squaredDistanceToSegment(point, start, end) <= BOUNDARY_TOLERANCE_DEGREES ** 2;
}

function classifyRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i];
    const previous = ring[j];
    if (pointOnSegment(point, previous, current)) return 'boundary';
    const crosses = (current[1] > point[1]) !== (previous[1] > point[1]);
    if (crosses && point[0] < ((previous[0] - current[0]) * (point[1] - current[1])) / (previous[1] - current[1]) + current[0]) inside = !inside;
  }
  return inside ? 'inside' : 'outside';
}

function classifyPolygon(point, rings) {
  const exterior = classifyRing(point, rings[0]);
  if (exterior !== 'inside') return exterior;
  for (const hole of rings.slice(1)) {
    const result = classifyRing(point, hole);
    if (result === 'boundary') return 'boundary';
    if (result === 'inside') return 'outside';
  }
  return 'inside';
}

function classifyPointInValidatedGeometry(point, geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let inside = false;
  for (const polygon of polygons) {
    const result = classifyPolygon(point, polygon);
    if (result === 'boundary') return 'boundary';
    if (result === 'inside') inside = true;
  }
  return inside ? 'inside' : 'outside';
}

export function classifyPointInGeometry(point, geometry) {
  validateGeometry(geometry);
  return classifyPointInValidatedGeometry(point, geometry);
}

export function selectTargetNeighborhoods(featureCollection, targets = TARGETS) {
  if (featureCollection?.type !== 'FeatureCollection' || !Array.isArray(featureCollection.features)) {
    throw new Error('Neighborhood input must be a GeoJSON FeatureCollection');
  }
  const selected = targets.map((target) => {
    const matches = featureCollection.features.filter((feature) => feature?.properties?.code === target.code);
    if (matches.length !== 1 || matches[0].properties.name !== target.name) {
      throw new Error(`Expected exactly one neighborhood with code ${target.code} and name ${target.name}`);
    }
    validateGeometry(matches[0].geometry);
    return { ...target, geometryType: matches[0].geometry.type, geometry: matches[0].geometry };
  });
  if (new Set(selected.map(({ code }) => code)).size !== selected.length) throw new Error('Target neighborhood codes must be unique');
  return selected;
}

function publicStop(point) {
  return { stop_id: point.stop_id, stop_name: point.stop_name, stop_lat: point.stop_lat, stop_lon: point.stop_lon };
}

export function joinStopsToNeighborhoods(points, neighborhoods) {
  if (!Array.isArray(points)) throw new Error('Stops input must contain a points array');
  if (!Array.isArray(neighborhoods) || !neighborhoods.length) throw new Error('Neighborhoods input must be a non-empty array');
  for (const neighborhood of neighborhoods) validateGeometry(neighborhood.geometry);
  const ids = new Set();
  const records = new Map(neighborhoods.map((neighborhood) => [neighborhood.code, { code: neighborhood.code, name: neighborhood.name, slug: neighborhood.slug, geometryType: neighborhood.geometryType, count: 0, stops: [] }]));
  const invalid = [];
  const boundaryOrAmbiguous = [];
  let outsidePilot = 0;

  for (const point of points) {
    const id = typeof point?.stop_id === 'string' ? point.stop_id.trim() : '';
    if (!id || ids.has(id)) throw new Error(id ? `Duplicate stop_id: ${id}` : 'Every stop must have a non-empty stop_id');
    ids.add(id);
    const valid = typeof point.stop_name === 'string' && point.stop_name.trim()
      && Number.isFinite(point.stop_lat) && Number.isFinite(point.stop_lon)
      && point.stop_lat >= -90 && point.stop_lat <= 90 && point.stop_lon >= -180 && point.stop_lon <= 180;
    if (!valid) {
      invalid.push(publicStop(point));
      continue;
    }
    const coordinate = [point.stop_lon, point.stop_lat];
    const results = neighborhoods.map((neighborhood) => ({ neighborhood, result: classifyPointInValidatedGeometry(coordinate, neighborhood.geometry) }));
    const boundaries = results.filter(({ result }) => result === 'boundary').map(({ neighborhood }) => ({ code: neighborhood.code, name: neighborhood.name }));
    const interiors = results.filter(({ result }) => result === 'inside').map(({ neighborhood }) => neighborhood);
    if (boundaries.length || interiors.length > 1) {
      boundaryOrAmbiguous.push({ ...publicStop(point), reason: boundaries.length ? 'boundary' : 'overlap', memberships: [...boundaries, ...interiors.map(({ code, name }) => ({ code, name }))] });
    } else if (interiors.length === 1) {
      const record = records.get(interiors[0].code);
      record.stops.push(publicStop(point));
      record.count += 1;
    } else {
      outsidePilot += 1;
    }
  }

  const neighborhoodsOutput = [...records.values()];
  const assignedPilot = neighborhoodsOutput.reduce((sum, item) => sum + item.count, 0);
  const reconciliation = { source: points.length, assignedPilot, outsidePilot, boundaryOrAmbiguous: boundaryOrAmbiguous.length, invalid: invalid.length };
  if (Object.values(reconciliation).slice(1).reduce((sum, value) => sum + value, 0) !== points.length) throw new Error('Stop reconciliation failed');
  return { neighborhoods: neighborhoodsOutput, exceptions: { boundaryOrAmbiguous, invalid }, reconciliation };
}

export { TARGETS };
