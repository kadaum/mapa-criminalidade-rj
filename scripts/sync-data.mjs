import fs from "node:fs/promises";
import { createHash } from "node:crypto";

const SOURCE = "https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv";
const OUTPUT = new URL("../public/data/crime-rio-snapshot.json", import.meta.url);
const KEEP_MONTHS = 36;

const indicators = [
  { id: "roubo_rua", label: "Roubo de rua", unit: "casos", note: "Soma de roubo a transeunte, de celular e em coletivo." },
  { id: "roubo_celular", label: "Roubo de celular", unit: "casos" },
  { id: "roubo_em_coletivo", label: "Roubo em coletivo", unit: "casos" },
  { id: "roubo_veiculo", label: "Roubo de veículo", unit: "casos" },
  { id: "furto_veiculos", label: "Furto de veículo", unit: "casos" },
  { id: "furto_celular", label: "Furto de celular", unit: "casos" },
  { id: "letalidade_violenta", label: "Letalidade violenta", unit: "vítimas", note: "Agregado oficial de homicídio doloso, lesão corporal seguida de morte, latrocínio e morte por intervenção de agente do Estado." },
  { id: "hom_doloso", label: "Homicídio doloso", unit: "vítimas" },
  { id: "estupro", label: "Estupro", unit: "vítimas" },
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

const response = await fetch(SOURCE, { headers: { "user-agent": "MapaAbertoRJ/0.1 (+open-source civic research)" } });
if (!response.ok) throw new Error(`ISP download failed: ${response.status}`);
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

await fs.mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await fs.writeFile(OUTPUT, `${JSON.stringify(payload)}\n`);
console.log(JSON.stringify({ output: OUTPUT.pathname, latestPeriod, rows: rows.length, cispCount: uniqueCisps.size }, null, 2));
