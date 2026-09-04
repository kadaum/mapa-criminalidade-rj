const SOURCE_URL =
  'https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv';
const LANDING_PAGE = 'https://www.ispdados.rj.gov.br/EstSeguranca.html';

export const indicators = [
  {
    id: 'registro_ocorrencias',
    label: 'Registros de ocorrência',
    unit: 'casos',
    definition:
      'Registros de ocorrência válidos para as estatísticas do ISP no mês. Um registro pode conter mais de um título e também há fatos não criminais; por isso este número não é um “total de crimes”.',
    note: 'Visão geral oficial do volume de registros policiais. Não some os indicadores abaixo: agregados e componentes se sobrepõem.',
  },
  {
    id: 'total_roubos',
    label: 'Total de roubos',
    unit: 'casos',
    definition:
      'Conjunto de ocorrências de roubo contabilizadas pelo ISP. Roubo envolve subtração com violência ou grave ameaça.',
    note: 'Agregado oficial do ISP-RJ; não somamos novamente seus componentes.',
  },
  {
    id: 'total_furtos',
    label: 'Total de furtos',
    unit: 'casos',
    definition:
      'Conjunto de ocorrências de furto contabilizadas pelo ISP. Furto é a subtração sem violência ou grave ameaça.',
    note: 'Agregado oficial do ISP-RJ; não somamos novamente seus componentes.',
  },
  {
    id: 'estelionato',
    label: 'Estelionato',
    unit: 'casos',
    definition:
      'Registros de obtenção de vantagem por fraude ou engano, classificados como estelionato.',
    note: 'A localização do registro não representa necessariamente exposição territorial ao golpe.',
  },
  {
    id: 'roubo_rua',
    label: 'Roubo de rua',
    unit: 'casos',
    definition:
      'Soma oficial de roubo a transeunte, roubo de celular e roubo em coletivo.',
    note: 'Soma oficial de roubo a transeunte, de celular e em coletivo.',
  },
  {
    id: 'roubo_celular',
    label: 'Roubo de celular',
    unit: 'casos',
    definition: 'Subtração de aparelho celular com violência ou grave ameaça.',
  },
  {
    id: 'roubo_em_coletivo',
    label: 'Roubo em coletivo',
    unit: 'casos',
    definition:
      'Roubo ocorrido no interior de transporte coletivo ou alternativo.',
  },
  {
    id: 'roubo_veiculo',
    label: 'Roubo de veículo',
    unit: 'casos',
    definition: 'Subtração de veículo com violência ou grave ameaça.',
  },
  {
    id: 'furto_veiculos',
    label: 'Furto de veículo',
    unit: 'casos',
    definition: 'Subtração de veículo sem violência ou grave ameaça.',
  },
  {
    id: 'furto_celular',
    label: 'Furto de celular',
    unit: 'casos',
    definition: 'Subtração de aparelho celular sem violência ou grave ameaça.',
  },
  {
    id: 'letalidade_violenta',
    label: 'Letalidade violenta',
    unit: 'vítimas',
    definition:
      'Soma de homicídio doloso, morte por intervenção de agente do Estado, latrocínio e lesão corporal seguida de morte.',
    note: 'Use o agregado fornecido pelo ISP; não reconstruímos a categoria.',
  },
  {
    id: 'hom_doloso',
    label: 'Homicídio doloso',
    unit: 'vítimas',
    definition:
      'Morte intencional classificada no registro como homicídio doloso.',
  },
  {
    id: 'tentat_hom',
    label: 'Tentativa de homicídio',
    unit: 'vítimas',
    definition:
      'Tentativa de provocar uma morte, sem que o resultado morte tenha ocorrido.',
  },
  {
    id: 'hom_por_interv_policial',
    label: 'Morte por intervenção de agente do Estado',
    unit: 'vítimas',
    definition:
      'Morte decorrente de intervenção de agente do Estado, segundo a classificação do registro policial.',
  },
  {
    id: 'estupro',
    label: 'Estupro',
    unit: 'vítimas',
    definition:
      'Vítimas em registros incluídos pelo ISP no indicador agregado de estupro.',
  },
  {
    id: 'ameaca',
    label: 'Ameaça',
    unit: 'vítimas',
    definition: 'Vítimas em registros classificados como ameaça.',
  },
  {
    id: 'pessoas_desaparecidas',
    label: 'Pessoas desaparecidas',
    unit: 'vítimas',
    definition: 'Pessoas registradas como desaparecidas no período.',
    note: 'A CISP do registro não indica onde a pessoa se encontra.',
  },
] as const;

function parseDelimited(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === ';' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += char;
  }
  const [header, ...values] = rows;
  return values.map((cells) =>
    Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ''])),
  );
}

function number(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function fetchIspSnapshot() {
  const response = await fetch(SOURCE_URL, {
    headers: { 'user-agent': 'MapaAbertoRJ/0.1 (+public civic monitor)' },
  });
  if (!response.ok) throw new Error(`ISP download failed: ${response.status}`);
  const bytes = await response.arrayBuffer();
  const sha256 = toHex(await crypto.subtle.digest('SHA-256', bytes));
  const all = parseDelimited(
    new TextDecoder('windows-1252').decode(bytes),
  ).filter((row) => row.munic === 'Rio de Janeiro');
  const periods = [
    ...new Set(
      all.map((row) => `${row.ano}-${String(row.mes).padStart(2, '0')}`),
    ),
  ].sort();
  const selectedPeriods = periods.slice(-36);
  const selected = new Set(selectedPeriods);
  const rows = all
    .filter((row) =>
      selected.has(`${row.ano}-${String(row.mes).padStart(2, '0')}`),
    )
    .map((row) => ({
      cisp: number(row.cisp),
      aisp: number(row.aisp),
      risp: number(row.risp),
      period: `${row.ano}-${String(row.mes).padStart(2, '0')}`,
      phase: number(row.fase),
      values: Object.fromEntries(
        indicators.map(({ id }) => [id, number(row[id])]),
      ),
    }))
    .sort((a, b) => a.period.localeCompare(b.period) || a.cisp - b.cisp);
  const latestPeriod = selectedPeriods.at(-1)!;
  const latestRows = rows.filter((row) => row.period === latestPeriod);
  const cispCount = new Set(latestRows.map((row) => row.cisp)).size;
  if (cispCount !== 41)
    throw new Error(`Expected 41 Rio CISPs; received ${cispCount}`);
  return {
    schemaVersion: 1,
    live: true,
    source: {
      title:
        'Estatísticas de segurança: série histórica mensal por área de delegacia',
      publisher: 'Instituto de Segurança Pública do Estado do Rio de Janeiro',
      url: SOURCE_URL,
      landingPage: LANDING_PAGE,
      lastModified: response.headers.get('last-modified'),
      etag: response.headers.get('etag'),
      sha256,
      bytes: bytes.byteLength,
    },
    generatedAt: new Date().toISOString(),
    latestPeriod,
    latestPhase: [...new Set(latestRows.map((row) => row.phase))],
    coverage: {
      municipality: 'Rio de Janeiro',
      cispCount,
      months: selectedPeriods.length,
    },
    indicators,
    rows,
  };
}
