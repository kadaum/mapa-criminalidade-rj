import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { joinStopsToNeighborhoods, selectTargetNeighborhoods } from '../lib/transport-spatial.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedOutput = resolve(repositoryRoot, 'public/data/neighborhood-transport.json');
const approvedSource = {
  version: 'v85',
  files: {
    'stops-candidate.json': '30ef88e37108b90b8cd9931ad6938b2102f39cc5cd1928fa803bed62749a1ad9',
    'item-metadata.json': '50764b6c2b21613677cba00eaabd9124c720946425b8519085f3054063477b70',
    'layer-metadata.json': '8918989540b129f3bc96dbd360522a21138789beb52710716e88c68de3cf5003',
    'qa.json': 'ad0045ef8f859c0a78b07685d06f395aad1c51ebbd6b9f4620827c599ef46d2b',
  },
  geometrySha256: '36ff3f0c16716baf7a2013e2de3d0718c231d1861b533048db9d1a922ed0fbaf',
};
const args = Object.fromEntries(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.split('=');
  return [key.replace(/^--/, ''), rest.join('=')];
}));
if (!args['source-dir']) throw new Error('Usage: node scripts/build-neighborhood-transport.mjs --source-dir=/local/sppo-source-v85 [--preview=true]');

const sourceDirectory = resolve(args['source-dir']);
const inputPath = resolve(sourceDirectory, 'stops-candidate.json');
const geometryPath = resolve(repositoryRoot, 'public/data/neighborhoods-rio.geojson');
const outputPath = resolve(repositoryRoot, args.output || 'public/data/neighborhood-transport.json');
if (outputPath !== expectedOutput) throw new Error(`Output is restricted to ${expectedOutput}`);
if (outputPath === inputPath || outputPath === geometryPath) throw new Error('Output cannot overwrite an input');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceEntries = await Promise.all(Object.entries(approvedSource.files).map(async ([name, expectedHash]) => {
  const bytes = await readFile(resolve(sourceDirectory, name));
  const actualHash = sha256(bytes);
  if (actualHash !== expectedHash) throw new Error(`Approved ${approvedSource.version} source mismatch for ${name}: expected ${expectedHash}, received ${actualHash}`);
  return [name, bytes];
}));
const sourceBytes = Object.fromEntries(sourceEntries);
const geometryBytes = await readFile(geometryPath);
if (sha256(geometryBytes) !== approvedSource.geometrySha256) throw new Error('Official neighborhood geometry does not match the reviewed file');
const inputBytes = sourceBytes['stops-candidate.json'];
const candidate = JSON.parse(inputBytes);
const itemMetadata = JSON.parse(sourceBytes['item-metadata.json']);
const layerMetadata = JSON.parse(sourceBytes['layer-metadata.json']);
const qa = JSON.parse(sourceBytes['qa.json']);
if (candidate.schemaVersion !== 1 || candidate.source !== 'official ArcGIS SPPO Paradas layer 0' || candidate.retrievedAt !== '2026-10-07T23:43:08.501Z') throw new Error('Candidate identity does not match the reviewed v85 source');
if (itemMetadata.id !== 'fd07613c9a1c45299389c0f7cff8e2a0' || itemMetadata.owner !== 'PrefeituraRio' || layerMetadata.name !== 'Paradas') throw new Error('Official source metadata identity mismatch');
if (qa.candidateSha256 !== approvedSource.files['stops-candidate.json'] || qa.countReturned !== candidate.points?.length || qa.rawSha256 !== '89cfa602613bdff9a343ac8a5ba7899d2450c5f18a6e5634fde5ebd80e1f44d6') throw new Error('Source QA metadata does not reconcile with the reviewed candidate');
const geometry = JSON.parse(geometryBytes);
const neighborhoods = selectTargetNeighborhoods(geometry);
const joined = joinStopsToNeighborhoods(candidate.points, neighborhoods);
const artifact = {
  schemaVersion: 1,
  scope: 'Recorte de pontos cadastrados na camada municipal Paradas (SPPO) para cinco bairros piloto, por interseção pontual com os limites municipais simplificados.',
  source: {
    sourceVersion: approvedSource.version,
    title: itemMetadata.title,
    provider: itemMetadata.accessInformation,
    itemId: itemMetadata.id,
    itemUrl: 'https://www.arcgis.com/home/item.html?id=fd07613c9a1c45299389c0f7cff8e2a0',
    layerUrl: 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Hosted/Rede_%C3%94nibus_SPPO_2_visualiza%C3%A7%C3%A3o/FeatureServer/0',
    license: 'CC BY 4.0 International',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    itemModified: new Date(itemMetadata.modified).toISOString(),
    layerLastEditDate: new Date(layerMetadata.editingInfo.lastEditDate).toISOString(),
    retrievedAt: candidate.retrievedAt,
    candidateSha256: sha256(inputBytes),
    itemMetadataSha256: approvedSource.files['item-metadata.json'],
    layerMetadataSha256: approvedSource.files['layer-metadata.json'],
    qaSha256: approvedSource.files['qa.json'],
    rawQuerySha256: qa.rawSha256,
  },
  geography: {
    title: geometry.source?.title,
    provider: geometry.source?.publisher,
    url: geometry.source?.url,
    fileSha256: sha256(geometryBytes),
    upstreamSha256: geometry.source?.sha256,
    note: 'Os códigos 5, 24, 33, 128 e 144 são códigos municipais presentes neste arquivo; não são códigos IBGE.',
  },
  method: {
    rule: 'Ponto no interior de um único polígono alvo. Pontos a até 1e-9 grau de uma borda ou em mais de um alvo são excluídos das contagens e listados como exceções.',
    boundaryToleranceDegrees: 1e-9,
    fields: ['stop_id', 'stop_name', 'stop_lat', 'stop_lon'],
    unit: 'Registro distinto da camada municipal Paradas, identificado por stop_id; não representa deduplicação de estação física ou plataforma.',
  },
  ...joined,
};
const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
if (args.preview === 'true') {
  console.log(JSON.stringify({ outputPath, bytes: Buffer.byteLength(serialized), reconciliation: artifact.reconciliation, counts: artifact.neighborhoods.map(({ code, name, count }) => ({ code, name, count })) }, null, 2));
} else {
  await writeFile(outputPath, serialized, { flag: 'w' });
  console.log(`Wrote ${outputPath} (${Buffer.byteLength(serialized)} bytes)`);
}
