import { parseNeighborhoodLabels } from './neighborhood-labels.ts';

async function fetchJson(fetcher: typeof fetch, url: string, signal?: AbortSignal) {
  const response = await fetcher(url, signal ? { signal } : undefined);
  if (!response.ok) throw new Error(`${url} unavailable`);
  return response.json() as Promise<unknown>;
}

export function loadCrimeAtlasCore(fetcher: typeof fetch = fetch) {
  return Promise.all([
    fetchJson(fetcher, '/data/crime-rio-snapshot.json'),
    fetchJson(fetcher, '/data/cisp-rio.geojson'),
    fetchJson(fetcher, '/data/cisp-neighborhoods.json'),
    fetchJson(fetcher, '/data/cisp-population.json'),
  ]).then(([snapshot, boundaries, territories, population]) => ({
    snapshot,
    boundaries,
    territories,
    population,
  }));
}

export function loadCrimeAtlasNeighborhoodLabels(fetcher: typeof fetch = fetch, signal?: AbortSignal) {
  return fetchJson(fetcher, '/data/neighborhood-labels.json', signal).then(parseNeighborhoodLabels);
}

export function loadCrimeAtlasNeighborhoods(fetcher: typeof fetch = fetch, signal?: AbortSignal) {
  return fetchJson(fetcher, '/data/neighborhoods-rio.geojson', signal);
}

export function needsNeighborhoodGeometry(showNeighborhoods: boolean, neighborhoods: unknown) {
  return showNeighborhoods && neighborhoods == null;
}
