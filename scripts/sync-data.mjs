import fs from "node:fs/promises";
import { createHash } from "node:crypto";

const SOURCE = "https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv";
const TERRITORY_SOURCE = "https://www.ispdados.rj.gov.br/Arquivos/Relacao_RISPxAISPxCISP.csv";
const NEIGHBORHOOD_SOURCE = "https://services1.arcgis.com/OlP4dGNtIcnD3RYf/ArcGIS/rest/services/db_MI_Bairros/FeatureServer/0/query?where=1%3D1&outFields=Codigo%2CNOME%2CRA%2CAreaBairro&orderByFields=Codigo&outSR=4326&geometryPrecision=5&maxAllowableOffset=0.00003&f=geojson";
const OUTPUT = new URL("../public/data/crime-rio-snapshot.json", import.meta.url);
const TERRITORY_OUTPUT = new URL("../public/data/cisp-neighborhoods.json", import.meta.url);
const NEIGHBORHOOD_OUTPUT = new URL("../public/data/neighborhoods-rio.geojson", import.meta.url);
const KEEP_MONTHS = 36;

const indicators = [
  { id: "total_roubos", label: "Total de roubos", unit: "casos", note: "Agregado oficial do ISP-RJ; não somamos novamente seus componentes." },
  { id: "total_furtos", label: "Total de furtos", unit: "casos", note: "Agregado oficial do ISP-RJ; não somamos novamente seus componentes." },
  { id: "estelionato", label: "Estelionato", unit: "casos", note: "A localização do registro não representa necessariamente exposição territorial ao golpe." },
  { id: "roubo_rua", label: "Roubo de rua", unit: "casos", note: "Soma oficial de roubo a transeunte, de celular e em coletivo." },
  { id: "roubo_celular", label: "Roubo de celular", unit: "casos" },
  { id: "roubo_em_coletivo", label: "Roubo em coletivo", unit: "casos" },
  { id: "roubo_veiculo", label: "Roubo de veículo", unit: "casos" },
  { id: "furto_veiculos", label: "Furto de veículo", unit: "casos" },
  { id: "furto_celular", label: "Furto de celular", unit: "casos" },
  { id: "letalidade_violenta", label: "Letalidade violenta", unit: "vítimas", note: "Use o agregado fornecido pelo ISP; não reconstruímos a categoria." },
  { id: "hom_doloso", label: "Homicídio doloso", unit: "vítimas" },
  { id: "tentat_hom", label: "Tentativa de homicídio", unit: "vítimas" },
  { id: "hom_por_interv_policial", label: "Morte por intervenção de agente do Estado", unit: "vítimas" },
  { id: "estupro", label: "Estupro", unit: "vítimas" },
  { id: "ameaca", label: "Ameaça", unit: "vítimas" },
  { id: "pessoas_desaparecidas", label: "Pessoas desaparecidas", unit: "vítimas", note: "A CISP do registro não indica onde a pessoa se encontra." },
];

function parseDelimited(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ";" && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...values] = rows;
  return values.map((cells) => Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ""])));
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const headers = { "user-agent": "MapaAbertoRJ/0.1 (+open-source civic research)" };
const [response, territoryResponse, neighborhoodResponse] = await Promise.all([
  fetch(SOURCE, { headers }),
  fetch(TERRITORY_SOURCE, { headers }),
  fetch(NEIGHBORHOOD_SOURCE, { headers }),
]);
if (!response.ok) throw new Error(`ISP download failed: ${response.status}`);
if (!territoryResponse.ok) throw new Error(`ISP territory download failed: ${territoryResponse.status}`);
if (!neighborhoodResponse.ok) throw new Error(`Rio neighborhood download failed: ${neighborhoodResponse.status}`);
const buffer = await response.arrayBuffer();
const text = new TextDecoder("windows-1252").decode(buffer);
const all = parseDelimited(text).filter((row) => row.munic === "Rio de Janeiro");
if (!all.length) throw new Error("No Rio de Janeiro rows found in ISP source");

const periods = [...new Set(all.map((row) => `${row.ano}-${String(row.mes).padStart(2, "0")}`))].sort();
const selectedPeriods = periods.slice(-KEEP_MONTHS);
const selected = new Set(selectedPeriods);
const rows = all
  .filter((row) => selected.has(`${row.ano}-${String(row.mes).padStart(2, "0")}`))
  .map((row) => ({
    cisp: number(row.cisp),
    aisp: number(row.aisp),
    risp: number(row.risp),
    period: `${row.ano}-${String(row.mes).padStart(2, "0")}`,
    phase: number(row.fase),
    values: Object.fromEntries(indicators.map(({ id }) => [id, number(row[id])])),
  }))
  .sort((a, b) => a.period.localeCompare(b.period) || a.cisp - b.cisp);

const latestPeriod = selectedPeriods.at(-1);
const latestRows = rows.filter((row) => row.period === latestPeriod);
const uniqueCisps = new Set(latestRows.map((row) => row.cisp));
if (uniqueCisps.size !== 41) throw new Error(`Expected 41 Rio CISPs in latest period; received ${uniqueCisps.size}`);
if (latestRows.some((row) => Object.values(row.values).some((value) => value < 0))) throw new Error("Negative indicator found");

const payload = {
  schemaVersion: 1,
  source: {
    title: "Estatísticas de segurança: série histórica mensal por área de delegacia",
    publisher: "Instituto de Segurança Pública do Estado do Rio de Janeiro",
    url: SOURCE,
    landingPage: "https://www.ispdados.rj.gov.br/EstSeguranca.html",
    lastModified: response.headers.get("last-modified"),
    etag: response.headers.get("etag"),
    sha256: createHash("sha256").update(Buffer.from(buffer)).digest("hex"),
    bytes: buffer.byteLength,
  },
  generatedAt: new Date().toISOString(),
  latestPeriod,
  latestPhase: [...new Set(latestRows.map((row) => row.phase))],
  coverage: { municipality: "Rio de Janeiro", cispCount: uniqueCisps.size, months: selectedPeriods.length },
  indicators,
  rows,
};

const territoryBuffer = await territoryResponse.arrayBuffer();
const territoryRows = parseDelimited(new TextDecoder("windows-1252").decode(territoryBuffer))
  .filter((row) => row["Município"] === "Rio de Janeiro")
  .map((row) => ({
    cisp: number(row.CISP),
    aisp: number(row.AISP),
    risp: number(row.RISP),
    territorialUnit: row["Unidade Territorial"].trim(),
    neighborhoods: row["Unidade Territorial"].split(/,\s*|\s+e\s+/u).map((name) => name.trim()).filter(Boolean),
  }))
  .sort((a, b) => a.cisp - b.cisp);
if (new Set(territoryRows.map((row) => row.cisp)).size !== 41) throw new Error(`Expected 41 Rio CISP territory records; received ${territoryRows.length}`);

const neighborhoodGeo = await neighborhoodResponse.json();
const neighborhoodFeatures = (neighborhoodGeo.features ?? [])
  .filter((feature) => feature.geometry && feature.properties?.Codigo && feature.properties?.NOME)
  .map((feature) => ({
    type: "Feature",
    geometry: feature.geometry,
    properties: {
      code: number(feature.properties.Codigo),
      name: String(feature.properties.NOME).trim(),
      ra: number(feature.properties.RA),
      areaM2: number(feature.properties.AreaBairro),
    },
  }))
  .sort((a, b) => a.properties.code - b.properties.code);
if (neighborhoodFeatures.length < 160) throw new Error(`Expected at least 160 Rio neighborhoods; received ${neighborhoodFeatures.length}`);

const territoryPayload = {
  schemaVersion: 1,
  source: {
    title: "Relação das Regiões, Áreas e Circunscrições Integradas de Segurança Pública",
    publisher: "Instituto de Segurança Pública do Estado do Rio de Janeiro",
    url: TERRITORY_SOURCE,
    landingPage: "https://www.ispdados.rj.gov.br/Conteudo.html",
    lastModified: territoryResponse.headers.get("last-modified"),
    etag: territoryResponse.headers.get("etag"),
    sha256: createHash("sha256").update(Buffer.from(territoryBuffer)).digest("hex"),
  },
  generatedAt: new Date().toISOString(),
  records: territoryRows,
};

const neighborhoodPayload = {
  type: "FeatureCollection",
  source: {
    title: "Limite de Bairros",
    publisher: "Prefeitura da Cidade do Rio de Janeiro",
    url: NEIGHBORHOOD_SOURCE,
  },
  features: neighborhoodFeatures,
};

await fs.mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await Promise.all([
  fs.writeFile(OUTPUT, `${JSON.stringify(payload)}\n`),
  fs.writeFile(TERRITORY_OUTPUT, `${JSON.stringify(territoryPayload)}\n`),
  fs.writeFile(NEIGHBORHOOD_OUTPUT, `${JSON.stringify(neighborhoodPayload)}\n`),
]);
console.log(JSON.stringify({ output: OUTPUT.pathname, latestPeriod, rows: rows.length, cispCount: uniqueCisps.size, territoryRecords: territoryRows.length, neighborhoods: neighborhoodFeatures.length }, null, 2));
