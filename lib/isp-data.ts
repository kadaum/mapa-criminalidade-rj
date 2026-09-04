const SOURCE_URL = 'https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv';
const LANDING_PAGE = 'https://www.ispdados.rj.gov.br/EstSeguranca.html';

export const indicators = [
  { id: 'total_roubos', label: 'Total de roubos', unit: 'casos', note: 'Agregado oficial do ISP-RJ; não somamos novamente seus componentes.' },
  { id: 'total_furtos', label: 'Total de furtos', unit: 'casos', note: 'Agregado oficial do ISP-RJ; não somamos novamente seus componentes.' },
  { id: 'estelionato', label: 'Estelionato', unit: 'casos', note: 'A localização do registro não representa necessariamente exposição territorial ao golpe.' },
  { id: 'roubo_rua', label: 'Roubo de rua', unit: 'casos', note: 'Soma oficial de roubo a transeunte, de celular e em coletivo.' },
  { id: 'roubo_celular', label: 'Roubo de celular', unit: 'casos' },
  { id: 'roubo_em_coletivo', label: 'Roubo em coletivo', unit: 'casos' },
  { id: 'roubo_veiculo', label: 'Roubo de veículo', unit: 'casos' },
  { id: 'furto_veiculos', label: 'Furto de veículo', unit: 'casos' },
  { id: 'furto_celular', label: 'Furto de celular', unit: 'casos' },
  { id: 'letalidade_violenta', label: 'Letalidade violenta', unit: 'vítimas', note: 'Use o agregado fornecido pelo ISP; não reconstruímos a categoria.' },
  { id: 'hom_doloso', label: 'Homicídio doloso', unit: 'vítimas' },
  { id: 'tentat_hom', label: 'Tentativa de homicídio', unit: 'vítimas' },
  { id: 'hom_por_interv_policial', label: 'Morte por intervenção de agente do Estado', unit: 'vítimas' },
  { id: 'estupro', label: 'Estupro', unit: 'vítimas' },
  { id: 'ameaca', label: 'Ameaça', unit: 'vítimas' },
  { id: 'pessoas_desaparecidas', label: 'Pessoas desaparecidas', unit: 'vítimas', note: 'A CISP do registro não indica onde a pessoa se encontra.' },
] as const;

function parseDelimited(text: string) {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (char === ';' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i + 1] === '\n') i++; row.push(field); field = ''; if (row.some(Boolean)) rows.push(row); row = []; }
    else field += char;
  }
  const [header, ...values] = rows;
  return values.map((cells) => Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ''])));
}

function number(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function toHex(buffer: ArrayBuffer) { return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }

export async function fetchIspSnapshot() {
  const response = await fetch(SOURCE_URL, { headers: { 'user-agent': 'MapaAbertoRJ/0.1 (+public civic monitor)' } });
  if (!response.ok) throw new Error(`ISP download failed: ${response.status}`);
  const bytes = await response.arrayBuffer();
  const sha256 = toHex(await crypto.subtle.digest('SHA-256', bytes));
  const all = parseDelimited(new TextDecoder('windows-1252').decode(bytes)).filter((row) => row.munic === 'Rio de Janeiro');
  const periods = [...new Set(all.map((row) => `${row.ano}-${String(row.mes).padStart(2, '0')}`))].sort();
  const selectedPeriods = periods.slice(-36); const selected = new Set(selectedPeriods);
  const rows = all.filter((row) => selected.has(`${row.ano}-${String(row.mes).padStart(2, '0')}`)).map((row) => ({ cisp: number(row.cisp), aisp: number(row.aisp), risp: number(row.risp), period: `${row.ano}-${String(row.mes).padStart(2, '0')}`, phase: number(row.fase), values: Object.fromEntries(indicators.map(({ id }) => [id, number(row[id])])) })).sort((a, b) => a.period.localeCompare(b.period) || a.cisp - b.cisp);
  const latestPeriod = selectedPeriods.at(-1)!; const latestRows = rows.filter((row) => row.period === latestPeriod); const cispCount = new Set(latestRows.map((row) => row.cisp)).size;
  if (cispCount !== 41) throw new Error(`Expected 41 Rio CISPs; received ${cispCount}`);
  return { schemaVersion: 1, live: true, source: { title: 'Estatísticas de segurança: série histórica mensal por área de delegacia', publisher: 'Instituto de Segurança Pública do Estado do Rio de Janeiro', url: SOURCE_URL, landingPage: LANDING_PAGE, lastModified: response.headers.get('last-modified'), etag: response.headers.get('etag'), sha256, bytes: bytes.byteLength }, generatedAt: new Date().toISOString(), latestPeriod, latestPhase: [...new Set(latestRows.map((row) => row.phase))], coverage: { municipality: 'Rio de Janeiro', cispCount, months: selectedPeriods.length }, indicators, rows };
}
