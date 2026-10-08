#!/usr/bin/env node
import { mkdir, open, rename, rm } from 'node:fs/promises';

const SOURCE_ORIGIN = 'https://mapa-criminalidade-rj.ricardoguia.com';
const SOURCE_HOST = 'mapa-criminalidade-rj.ricardoguia.com';
const FILES = Object.freeze([
  'camera-location-evidence.json',
  'cisp-neighborhoods.json',
  'cisp-population.json',
  'cisp-rio.geojson',
  'neighborhoods-rio.geojson',
  'public-cameras.json',
]);
const MAX_BYTES = 25 * 1024 * 1024;
const TIMEOUT_MS = 30_000;
const directory = new URL('../public/data/', import.meta.url);

async function fetchBounded(filename) {
  let url = new URL(`/data/${filename}`, SOURCE_ORIGIN);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (url.protocol !== 'https:' || url.hostname !== SOURCE_HOST)
      throw new Error(`Redirect fora do host permitido para ${filename}`);
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirects === 3)
        throw new Error(`Redirect inválido para ${filename}`);
      url = new URL(location, url);
      continue;
    }
    if (!response.ok)
      throw new Error(`Download ${filename}: HTTP ${response.status}`);
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_BYTES)
      throw new Error(`${filename} excede o limite de ${MAX_BYTES} bytes`);
    if (!response.body) throw new Error(`Resposta vazia para ${filename}`);
    const chunks = [];
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.byteLength;
      if (bytes > MAX_BYTES)
        throw new Error(`${filename} excede o limite de ${MAX_BYTES} bytes`);
      chunks.push(chunk);
    }
    const payload = Buffer.concat(chunks, bytes);
    JSON.parse(payload.toString('utf8'));
    return payload;
  }
  throw new Error(`Redirects demais para ${filename}`);
}

await mkdir(directory, { recursive: true });
for (const filename of FILES) {
  const destination = new URL(filename, directory);
  const temporary = new URL(`${filename}.download`, directory);
  const handle = await open(temporary, 'w', 0o600);
  try {
    const payload = await fetchBounded(filename);
    await handle.writeFile(payload);
    await handle.close();
    await rename(temporary, destination);
    console.log(`Cópia local validada: ${filename} (${payload.byteLength} bytes)`);
  } catch (error) {
    await handle.close().catch(() => {});
    await rm(temporary, { force: true });
    throw error;
  }
}

console.log(
  'Arquivos locais ignorados pelo Git. Preserve as atribuições e limitações de DATA_SOURCES.md; este download não concede licença de redistribuição.',
);
