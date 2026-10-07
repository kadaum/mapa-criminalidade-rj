import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { buildNeighborhoodLabels } from '../lib/neighborhood-labels.ts';

const sourceUrl = new URL('../public/data/neighborhoods-rio.geojson', import.meta.url);
const outputUrl = new URL('../public/data/neighborhood-labels.json', import.meta.url);
const source = await readFile(sourceUrl);
let geography;
try {
  geography = JSON.parse(source.toString('utf8'));
} catch (error) {
  throw new SyntaxError(`Invalid neighborhood GeoJSON: ${error instanceof Error ? error.message : String(error)}`);
}
if (!Array.isArray(geography?.features) || geography.features.length < 160) {
  throw new TypeError('Neighborhood GeoJSON is empty or incomplete (expected at least 160 features)');
}
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const payload = buildNeighborhoodLabels(geography, sourceSha256);
await writeFile(outputUrl, `${JSON.stringify(payload)}\n`);
console.log(`Generated ${payload.labels.length} neighborhood labels from ${sourceSha256}`);
