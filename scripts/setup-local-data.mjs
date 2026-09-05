import { mkdir, writeFile } from 'node:fs/promises';

// Explicit, local-only opt-in. Downloading does not grant redistribution rights.
if (!process.argv.includes('--accept-source-terms')) {
  console.error('Leia DATA_SOURCES.md antes. Para obter cópias locais: npm run data:setup -- --accept-source-terms');
  process.exit(1);
}
const base = 'https://mapa-aberto-rj.ricardo-guia.chatgpt.site/data/';
const files = ['crime-rio-snapshot.json', 'cisp-neighborhoods.json', 'cisp-population.json', 'cisp-rio.geojson', 'neighborhoods-rio.geojson'];
const directory = new URL('../public/data/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const file of files) {
  const response = await fetch(new URL(file, base), { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Download ${file}: HTTP ${response.status}`);
  const text = await response.text();
  JSON.parse(text);
  await writeFile(new URL(file, directory), text);
  console.log(`Cópia local: ${file}`);
}
console.log('Dados ignorados pelo Git. Execute npm run validate:data. Não os inclua em PRs.');
