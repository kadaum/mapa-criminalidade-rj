import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function parseCsv(text) {
  const rows = [];
  let row = [],
    field = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += c;
        i++;
      } else quoted = !quoted;
    } else if (c === ';' && !quoted) {
      row.push(field);
      field = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...data] = rows;
  return data.map((cells) =>
    Object.fromEntries(head.map((key, i) => [key, cells[i] ?? ''])),
  );
}
export function count(value) {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error(`Invalid count: ${value}`);
  return n;
}
export function sumComplete(values) {
  return values.length && values.every((v) => v !== null)
    ? values.reduce((a, b) => a + b, 0)
    : null;
}
export function annualize(months, ids, population) {
  return Object.entries(
    Object.groupBy(months, (r) => r.period.slice(0, 4)),
  ).map(([year, rows]) => {
    const complete =
      rows.length === 12 &&
      rows.every(
        (r, i) => r.period === `${year}-${String(i + 1).padStart(2, '0')}`,
      );
    const denominator = population[year] ?? null;
    const values = Object.fromEntries(
      ids.map((id) => [id, sumComplete(rows.map((r) => r.values[id]))]),
    );
    return {
      year: Number(year),
      months: rows.length,
      complete,
      population: denominator,
      values,
      rates: Object.fromEntries(
        ids.map((id) => [
          id,
          complete && denominator && values[id] !== null
            ? (values[id] / denominator.value) * 100000
            : null,
        ]),
      ),
    };
  });
}
const urls = {
  cisp: 'https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv',
  municipality:
    'https://www.ispdados.rj.gov.br/Arquivos/BaseMunicipioMensal.csv',
  estimates:
    'https://apisidra.ibge.gov.br/values/t/6579/n6/3304557/v/9324/p/all',
  census2010:
    'https://apisidra.ibge.gov.br/values/t/200/n6/3304557/v/93/p/2010',
  census2022:
    'https://apisidra.ibge.gov.br/values/t/4714/n6/3304557/v/93/p/2022',
};
export async function syncHistory() {
  const snapshot = JSON.parse(
    await fs.readFile(
      new URL('../public/data/crime-rio-snapshot.json', import.meta.url),
    ),
  );
  const sources = {};
  const data = {};
  await Promise.all(
    Object.entries(urls).map(async ([key, url]) => {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      sources[key] = {
        url,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
      data[key] =
        key === 'cisp' || key === 'municipality'
          ? parseCsv(new TextDecoder('windows-1252').decode(bytes))
          : JSON.parse(bytes.toString());
    }),
  );
  const indicators = snapshot.indicators,
    ids = indicators.map((i) => i.id);
  const cispRows = data.cisp
    .filter((r) => r.munic === 'Rio de Janeiro')
    .map((r) => ({
      cisp: Number(r.cisp),
      period: `${r.ano}-${r.mes.padStart(2, '0')}`,
      phase: Number(r.fase),
      values: Object.fromEntries(ids.map((id) => [id, count(r[id])])),
    }))
    .sort((a, b) => a.period.localeCompare(b.period) || a.cisp - b.cisp);
  if (
    new Set(cispRows.map((r) => `${r.period}:${r.cisp}`)).size !==
    cispRows.length
  )
    throw new Error('Duplicate historical CISP');
  const municipalRows = data.municipality.filter(
    (r) => r.fmun_cod === '3304557',
  );
  const municipal = new Map(
    municipalRows.map((r) => [`${r.ano}-${r.mes.padStart(2, '0')}`, r]),
  );
  if (municipal.size !== municipalRows.length)
    throw new Error('Duplicate municipal month');
  const municipalPeriods = [...municipal.keys()].sort((a, b) =>
    a.localeCompare(b),
  );
  if (municipalPeriods[0] !== '2014-01')
    throw new Error('Review changed municipal coverage');
  if (municipalPeriods.at(-1) !== cispRows.at(-1).period)
    throw new Error(
      'Municipal and CISP latest periods diverge; review before publication',
    );
  const groupedCisp = Object.groupBy(cispRows, (r) => r.period);
  const periods = [
    ...new Set([...Object.keys(groupedCisp), ...municipal.keys()]),
  ].sort((a, b) => a.localeCompare(b));
  const months = periods.map((period) => {
    const rows = groupedCisp[period] ?? [];
    const official = municipal.get(period);
    if (period >= '2014-01' && !official)
      throw new Error(`Municipal source missing ${period}`);
    return {
      period,
      origin: official ? 'municipality' : 'cisp-sum',
      cispCount: rows.length,
      values: Object.fromEntries(
        ids.map((id) => [
          id,
          official
            ? count(official[id])
            : sumComplete(rows.map((r) => r.values[id])),
        ]),
      ),
    };
  });
  for (let i = 1; i < months.length; i++) {
    const [y, m] = months[i - 1].period.split('-').map(Number);
    const expected = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
    if (months[i].period !== expected)
      throw new Error(`Missing month ${expected}`);
  }
  const population = {};
  for (const [key, kind] of [
    ['estimates', 'Estimativa anual IBGE'],
    ['census2010', 'Censo 2010'],
    ['census2022', 'Censo 2022'],
  ]) {
    for (const r of data[key].slice(1)) {
      const value = count(r.V);
      if (!value || r.D1C !== '3304557')
        throw new Error(`Invalid population ${key}`);
      population[r.D3C] = { value, kind, source: key };
    }
  }
  const years = annualize(months, ids, population);
  const payload = {
    schemaVersion: 1,
    sources,
    firstPeriod: months[0].period,
    latestPeriod: months.at(-1).period,
    indicators,
    months,
    years,
    population,
    methodology: [
      '2003–2013: soma de todas as CISPs identificadas como Rio de Janeiro em cada mês na fonte; a composição territorial muda ao longo do tempo. Desde 2014: base municipal oficial do ISP.',
      'Taxa anual = registros ou vítimas do ano completo / população municipal do próprio ano × 100.000. Estimativas IBGE (SIDRA 6579), Censo 2010 (200) e Censo 2022 (4714). Sem interpolação ou reaproveitamento automático de outro ano.',
      'Anos incompletos e anos sem população na fonte não têm taxa anual. Meses mostram quantidades, sem anualização. Lacunas de indicador são nulas, nunca zero.',
      'Revisões das estimativas e os censos podem introduzir quebras no denominador. A população residente não mede fluxo de pessoas nem risco individual. Registros não abrangem fatos não comunicados à polícia.',
      'As taxas históricas municipais usam denominadores anuais e não são diretamente intercambiáveis com as taxas territoriais recentes, que usam a fotografia do Censo 2022.',
    ],
  };
  const output = new URL(
    '../public/data/crime-rio-history.json',
    import.meta.url,
  );
  await fs.writeFile(output, JSON.stringify(payload));
  const csv =
    [
      'period;cisp;phase;' + ids.join(';'),
      ...cispRows.map((r) =>
        [
          r.period,
          r.cisp,
          r.phase,
          ...ids.map((id) => r.values[id] ?? ''),
        ].join(';'),
      ),
    ].join('\n') + '\n';
  await fs.writeFile(
    new URL('../public/data/crime-rio-history-cisp.csv', import.meta.url),
    csv,
  );
  console.log(
    JSON.stringify({
      months: months.length,
      cispRows: cispRows.length,
      first: payload.firstPeriod,
      latest: payload.latestPeriod,
      missingPopulation: years.filter((r) => !r.population).map((r) => r.year),
    }),
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await syncHistory();
