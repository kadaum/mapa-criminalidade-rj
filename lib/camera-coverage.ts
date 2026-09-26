/** Approximate camera field-of-view geometry for display on a map. */

export type CoverageParameters = {
  bearingDeg: number;
  fovDeg: number;
  rangeMeters: number;
};

export type LngLat = [longitude: number, latitude: number];

export type CameraCoverageFeatureCollection = {
  type: 'FeatureCollection';
  features: [
    {
      type: 'Feature';
      properties: {
        kind: 'coverage-sector';
        bearingDeg: number;
        fovDeg: number;
        rangeMeters: number;
      };
      geometry: { type: 'Polygon'; coordinates: LngLat[][] };
    },
    {
      type: 'Feature';
      properties: {
        kind: 'center-line';
        bearingDeg: number;
        rangeMeters: number;
      };
      geometry: { type: 'LineString'; coordinates: LngLat[] };
    },
  ];
};

const EARTH_RADIUS_METERS = 6_371_008.8;
const DEFAULT_PARAMETERS: CoverageParameters = {
  bearingDeg: 0,
  fovDeg: 60,
  rangeMeters: 250,
};

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Normalize bearing clockwise from north and constrain the display parameters. */
export function normalizeCoverageParameters(
  parameters: CoverageParameters,
): CoverageParameters {
  const bearing = finiteOr(
    parameters.bearingDeg,
    DEFAULT_PARAMETERS.bearingDeg,
  );
  const fov = finiteOr(parameters.fovDeg, DEFAULT_PARAMETERS.fovDeg);
  const range = finiteOr(
    parameters.rangeMeters,
    DEFAULT_PARAMETERS.rangeMeters,
  );
  return {
    bearingDeg: ((bearing % 360) + 360) % 360,
    fovDeg: clamp(fov, 10, 120),
    rangeMeters: clamp(range, 25, 1000),
  };
}

/** Return the point reached by traveling a geodesic distance on a spherical WGS84 mean-radius earth. */
export function destinationPoint(
  origin: LngLat,
  bearingDeg: number,
  distanceMeters: number,
): LngLat {
  const [longitude, latitude] = origin;
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90
  ) {
    throw new RangeError(
      'Origin must be a finite WGS84 longitude/latitude coordinate.',
    );
  }
  if (
    !Number.isFinite(bearingDeg) ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0
  ) {
    throw new RangeError(
      'Bearing and non-negative distance must be finite numbers.',
    );
  }

  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (latitude * Math.PI) / 180;
  const lon1 = (longitude * Math.PI) / 180;
  const sinLat2 =
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing);
  const lat2 = Math.asin(clamp(sinLat2, -1, 1));
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );
  const longitudeDeg = (((lon2 * 180) / Math.PI + 540) % 360) - 180;
  return [longitudeDeg, (lat2 * 180) / Math.PI];
}

/** Build a GeoJSON sector polygon and its center line from an explicit camera origin. */
export function cameraCoverageFeatureCollection(
  origin: LngLat,
  parameters: CoverageParameters,
  arcSegments = 48,
): CameraCoverageFeatureCollection {
  if (!Number.isInteger(arcSegments) || arcSegments < 1) {
    throw new RangeError('arcSegments must be a positive integer.');
  }
  const normalized = normalizeCoverageParameters(parameters);
  const startBearing = normalized.bearingDeg - normalized.fovDeg / 2;
  const arc: LngLat[] = [];
  for (let index = 0; index <= arcSegments; index += 1) {
    const bearing = startBearing + (normalized.fovDeg * index) / arcSegments;
    arc.push(destinationPoint(origin, bearing, normalized.rangeMeters));
  }
  const ring: LngLat[] = [origin, ...arc, origin];
  const endpoint = destinationPoint(
    origin,
    normalized.bearingDeg,
    normalized.rangeMeters,
  );

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'coverage-sector', ...normalized },
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
      {
        type: 'Feature',
        properties: {
          kind: 'center-line',
          bearingDeg: normalized.bearingDeg,
          rangeMeters: normalized.rangeMeters,
        },
        geometry: { type: 'LineString', coordinates: [origin, endpoint] },
      },
    ],
  };
}
