async function fetchJson(fetcher: typeof fetch, url: string) {
  const response = await fetcher(url);
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

export function loadCrimeAtlasNeighborhoods(fetcher: typeof fetch = fetch) {
  return fetchJson(fetcher, '/data/neighborhoods-rio.geojson');
}
