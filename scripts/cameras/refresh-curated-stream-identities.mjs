import { readFile, writeFile } from 'node:fs/promises';

import { pathToFileURL } from 'node:url';

const identityUrl = process.argv[3]
  ? pathToFileURL(process.argv[3])
  : new URL('../../research/cameras/stream-identities.json', import.meta.url);
const catalogUrl = process.argv[2]
  ? pathToFileURL(process.argv[2])
  : new URL('../../public/data/public-cameras.json', import.meta.url);
const identities = JSON.parse(await readFile(identityUrl, 'utf8'));
const expectedPages = {
  'homes-posto-3': 'https://homesinrio.com/rio-de-janeiro-luxury-apartment-webcam',
  'homes-posto-6': 'https://homesinrio.com/apartment-rio-de-janeiro-copacabana-beach-webcam',
};
if (
  Object.keys(identities).sort().join(',') !== 'cameras,schemaVersion' ||
  identities.schemaVersion !== 1 ||
  !Array.isArray(identities.cameras)
)
  throw new Error('Invalid curated stream identity document');
const byId = new Map();
for (const identity of identities.cameras) {
  const url = new URL(identity.source);
  const historyValid = Array.isArray(identity.historicalStreams) && identity.historicalStreams.every((entry) =>
    Object.keys(entry).every((key) => ['provider', 'streamId', 'lastObservedAt', 'outcome'].includes(key)) &&
    entry.provider === 'youtube' && typeof entry.streamId === 'string' && entry.streamId.length === 11 &&
    ['playing', 'ended', 'unavailable', 'unknown'].includes(entry.outcome));
  if (
    Object.keys(identity).some((key) => !['id', 'source', 'streamResolver', 'historicalStreams'].includes(key)) ||
    !expectedPages[identity.id] ||
    identity.source !== expectedPages[identity.id] ||
    identity.streamResolver !== identity.id ||
    url.protocol !== 'https:' || url.hostname !== 'homesinrio.com' ||
    url.username || url.password || url.search || url.hash || byId.has(identity.id) ||
    !historyValid
  ) throw new Error(`Invalid curated stream identity for ${identity.id}`);
  byId.set(identity.id, identity);
}
if (byId.size !== Object.keys(expectedPages).length)
  throw new Error('Curated stream identity document must contain exactly two Homes cameras');

const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'));
const cameras = new Map(catalog.cameras.map((camera) => [camera.id, camera]));
for (const [id, identity] of byId) {
  const camera = cameras.get(id);
  if (!camera) throw new Error(`Missing curated resolver camera: ${id}`);
  camera.source = identity.source;
  camera.streamResolver = identity.streamResolver;
  camera.historicalStreams = identity.historicalStreams;
  delete camera.youtubeId;
  delete camera.watchUrl;
}
await writeFile(catalogUrl, `${JSON.stringify(catalog)}\n`);
