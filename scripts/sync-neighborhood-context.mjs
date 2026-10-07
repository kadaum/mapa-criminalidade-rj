import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const DATA_URL =
  'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/Agregados_por_Bairro_csv/Agregados_por_bairros_entorno_domic%C3%ADlios_BR.zip';
export const DICTIONARY_URL =
  'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/dicionarios_de_dados_entorno.zip';
export const MUNICIPALITY_CODE = '3304557';
export const TARGETS = new Map([
  ['Centro', '3304557001'],
  ['Copacabana', '3304557018'],
  ['Tijuca', '3304557030'],
  ['Campo Grande', '3304557102'],
  ['Barra da Tijuca', '3304557131'],
]);

function fetchBytes(url) {
  return new Promise((resolve, reject) => {
    const request = globalThis.fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
      resolve(Buffer.from(await response.arrayBuffer()));
    });
    request.catch(reject);
  });
}

function unzip(bytes) {
  const dir = mkdtempSync(join(tmpdir(), 'ibge-neighborhood-context-'));
  const archive = join(dir, 'source.zip');
  writeFileSync(archive, bytes);
  return execFileSync('unzip', ['-p', archive], { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024 });
}

function listZipEntries(bytes) {
  const dir = mkdtempSync(join(tmpdir(), 'ibge-neighborhood-context-list-'));
  const archive = join(dir, 'source.zip');
  writeFileSync(archive, bytes);
  return execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
}

function parseDelimitedLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === ';' && !quoted) {
      fields.push(field);
      field = '';
    } else field += char;
  }
  fields.push(field);
  return fields;
}

export function parseNeighborhoodCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const header = parseDelimitedLine(lines.shift());
  return lines.map((line) => {
    const values = parseDelimitedLine(line);
    return Object.fromEntries(header.map((name, index) => [name, values[index] ?? '']));
  });
}

const integer = (value, label) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative integer`);
  return parsed;
};

function metric(row, suffix) {
  const total = integer(row.V05000, `${row.NM_BAIRRO} V05000`);
  const yes = integer(row[`V050${suffix}`], `${row.NM_BAIRRO} ${suffix} yes`);
  const no = integer(row[`V050${Number(suffix) + 1}`], `${row.NM_BAIRRO} ${suffix} no`);
  const unknown = integer(row[`V050${Number(suffix) + 2}`], `${row.NM_BAIRRO} ${suffix} unknown`);
  if (yes + no + unknown !== total) throw new Error(`${row.NM_BAIRRO} ${prefix} does not sum to V05000`);
  return { yes, no, unknown, total, yesPct: total ? Number((yes / total * 100).toFixed(2)) : 0 };
}

export function buildContext(rows, { retrievedAt, retrievedAtLocal, zipSha256, dictionaryEntries }) {
  const selected = rows.filter((row) => TARGETS.get(row.NM_BAIRRO) === row.CD_BAIRRO);
  if (selected.length !== TARGETS.size) throw new Error(`expected ${TARGETS.size} unique Rio neighborhood rows, found ${selected.length}`);
  const records = selected.map((row) => ({
    ibgeCode: row.CD_BAIRRO,
    name: row.NM_BAIRRO,
    municipalityCode: MUNICIPALITY_CODE,
    householdsSurveyed: integer(row.V05000, `${row.NM_BAIRRO} V05000`),
    lighting: metric(row, '12'),
    sidewalk: metric(row, '21'),
  }));
  validateRecords(records);
  return {
    schemaVersion: 1,
    retrievedAt,
    retrievedAtLocal,
    reference: 'Censo Demográfico 2022 — Características Urbanísticas do Entorno dos Domicílios',
    source: {
      publisher: 'Instituto Brasileiro de Geografia e Estatística (IBGE)',
      dataUrl: DATA_URL,
      dictionaryUrl: DICTIONARY_URL,
      zipSha256,
      dictionaryEntries,
      licenseStatus: 'Arquivo publicado como download público; licença específica do arquivo não identificada na página/FTP. Confirmar antes de redistribuição ampla.',
      attribution: 'IBGE, Censo Demográfico 2022 — Características Urbanísticas do Entorno dos Domicílios.',
    },
    method: 'Recorte dos agregados oficiais por bairro para os cinco códigos CD_BAIRRO do município 3304557. Percentuais são domicílios pesquisados com presença observada na face do entorno; não são ruas, postes funcionais ou qualidade da infraestrutura.',
    limitations: [
      'A pesquisa do entorno é de 2022 e cobre setores selecionados; não representa estado de conservação, funcionamento ou eficácia.',
      'Este artefato é somente por bairro. Não agrega nem imputa valores para CISP.',
      'A relação entre infraestrutura e registros policiais não é causal; não atribuir crimes ao bairro a partir deste contexto.',
    ],
    records,
  };
}

export function validateRecords(records) {
  if (records.length !== TARGETS.size) throw new Error('record count mismatch');
  const codes = new Set();
  for (const record of records) {
    if (!TARGETS.has(record.name) || record.municipalityCode !== MUNICIPALITY_CODE) throw new Error('unexpected target or municipality');
    if (codes.has(record.ibgeCode)) throw new Error(`duplicate code ${record.ibgeCode}`);
    codes.add(record.ibgeCode);
    if (record.householdsSurveyed !== record.lighting.total || record.householdsSurveyed !== record.sidewalk.total) throw new Error(`${record.name} denominator mismatch`);
    for (const metricValue of [record.lighting, record.sidewalk]) {
      if (metricValue.yes + metricValue.no + metricValue.unknown !== metricValue.total) throw new Error(`${record.name} unknown/sum mismatch`);
      if (metricValue.total === 0 && metricValue.yesPct !== 0) throw new Error(`${record.name} zero denominator percentage`);
    }
  }
}

function localRetrievedAt() {
  const now = new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const offset = new Intl.DateTimeFormat('en-US', { timeZoneName: 'shortOffset', timeZone: 'America/New_York' })
    .formatToParts(now).find(({ type }) => type === 'timeZoneName')?.value.replace('GMT', '') || '-04';
  const normalizedOffset = /^[-+]\d$/.test(offset)
    ? offset.replace(/^([+-])(\d)$/, '$10$2:00')
    : (/^[-+]\d\d$/.test(offset) ? `${offset}:00` : offset);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${normalizedOffset}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const zip = await fetchBytes(DATA_URL);
  const dictionary = await fetchBytes(DICTIONARY_URL);
  const csv = unzip(zip).toString('latin1');
  const dictionaryEntries = listZipEntries(dictionary);
  const expectedDictionaryEntries = ['dicionario_entorno_domicilios.xlsx', 'dicionario_entorno_faces.xlsx', 'dicionario_entorno_pessoas.xlsx'];
  if (expectedDictionaryEntries.some((entry) => !dictionaryEntries.includes(entry))) throw new Error('IBGE dictionary archive is missing an expected workbook');
  const context = buildContext(parseNeighborhoodCsv(csv), {
    retrievedAt: new Date().toISOString(),
    retrievedAtLocal: localRetrievedAt(),
    zipSha256: createHash('sha256').update(zip).digest('hex'),
    dictionaryEntries: expectedDictionaryEntries,
  });
  writeFileSync(new URL('../public/data/neighborhood-context.json', import.meta.url), `${JSON.stringify(context, null, 2)}\n`);
  console.log(JSON.stringify({ records: context.records.length, zipBytes: zip.length, zipSha256: context.source.zipSha256, retrievedAt: context.retrievedAt }, null, 2));
}
