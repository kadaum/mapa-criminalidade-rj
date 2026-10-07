import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadCrimeAtlasCore,
  loadCrimeAtlasNeighborhoodLabels,
  loadCrimeAtlasNeighborhoods,
} from '../lib/crime-atlas-data.ts';

const body = (value: unknown, ok = true) =>
  ({ ok, json: async () => value }) as Response;

void test('core atlas data resolves while optional neighborhood geometry is delayed', async () => {
  let releaseNeighborhoods!: () => void;
  const delayedNeighborhoods = new Promise<Response>((resolve) => {
    releaseNeighborhoods = () =>
      resolve(body({ type: 'FeatureCollection', features: [] }));
  });
  const fetcher = ((url: string) =>
    url.endsWith('neighborhoods-rio.geojson')
      ? delayedNeighborhoods
      : Promise.resolve(body({ url }))) as typeof fetch;

  const coreRequest = loadCrimeAtlasCore(fetcher);
  const neighborhoodsRequest = loadCrimeAtlasNeighborhoods(fetcher);
  const core = await coreRequest;
  assert.deepEqual(core.snapshot, { url: '/data/crime-rio-snapshot.json' });

  let optionalSettled = false;
  void neighborhoodsRequest.finally(() => {
    optionalSettled = true;
  });
  await Promise.resolve();
  assert.equal(optionalSettled, false);
  releaseNeighborhoods();
  await neighborhoodsRequest;
});

void test('optional neighborhood failure does not reject core atlas data', async () => {
  const fetcher = ((url: string) =>
    Promise.resolve(
      url.endsWith('neighborhoods-rio.geojson')
        ? body({ error: true }, false)
        : body({ url }),
    )) as typeof fetch;

  const coreRequest = loadCrimeAtlasCore(fetcher);
  const neighborhoodsRequest = loadCrimeAtlasNeighborhoods(fetcher);
  await assert.doesNotReject(coreRequest);
  await assert.rejects(
    neighborhoodsRequest,
    /neighborhoods-rio\.geojson unavailable/,
  );
});

void test('light labels load independently while full geometry remains on demand', async () => {
  const requests: string[] = [];
  const labels = {
    version: 1,
    sourceSha256: 'a'.repeat(64),
    labels: [{ code: 1, name: 'Saúde', position: [-43.18, -22.9], area: 10, minZoom: 11 }],
  };
  const fetcher = ((url: string) => {
    requests.push(url);
    return Promise.resolve(body(labels));
  }) as typeof fetch;

  assert.deepEqual(await loadCrimeAtlasNeighborhoodLabels(fetcher), labels);
  assert.deepEqual(requests, ['/data/neighborhood-labels.json']);
});
