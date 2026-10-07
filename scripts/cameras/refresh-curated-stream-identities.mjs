import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../../public/data/public-cameras.json', import.meta.url);
const catalog = JSON.parse(await readFile(path, 'utf8'));
const updates = {
  'homes-posto-3': {
    source: 'https://homesinrio.com/rio-de-janeiro-luxury-apartment-webcam',
    streamResolver: 'homes-posto-3',
    historicalStreams: [
      {
        provider: 'youtube',
        streamId: 'k2QzfrPLQSg',
        lastObservedAt: '2026-10-06',
        outcome: 'ended',
      },
    ],
  },
  'homes-posto-6': {
    streamResolver: 'homes-posto-6',
    historicalStreams: [
      {
        provider: 'youtube',
        streamId: 'Hr7c0XuEgm0',
        lastObservedAt: '2026-10-06',
        outcome: 'unavailable',
      },
    ],
  },
};
for (const camera of catalog.cameras) {
  const update = updates[camera.id];
  if (!update) continue;
  Object.assign(camera, update);
  delete camera.youtubeId;
  delete camera.watchUrl;
}
await writeFile(path, `${JSON.stringify(catalog)}\n`);
