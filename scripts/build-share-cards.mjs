#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { availableBulletinPeriods, bulletinMetricFrom } from '../lib/bulletin-core.ts';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const OUT = path.join(ROOT, 'public', 'share');
const WIDTH = 1200;
const HEIGHT = 630;
const snapshot = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/crime-rio-snapshot.json'), 'utf8'));
const population = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/cisp-population.json'), 'utf8'));
const context = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/neighborhood-context.json'), 'utf8'));
const territories = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/cisp-neighborhoods.json'), 'utf8'));

const neighborhoods = [
  ['centro', 'Centro'],
  ['copacabana', 'Copacabana'],
  ['tijuca', 'Tijuca'],
  ['barra-da-tijuca', 'Barra da Tijuca'],
  ['campo-grande', 'Campo Grande'],
];
const fmt = (value, digits = 0) => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: digits });
const monthLabel = (period) => new Date(`${period}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shiftMonth = (period, amount) => {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 7);
};
const escapeXml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const wrap = (text, maxChars) => {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > maxChars) { lines.push(line); line = word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
};
const textBlock = (text, x, y, options = {}) => {
  const { size = 28, weight = 400, fill = '#526078', maxChars = 62, lineHeight = size * 1.25, anchor = 'start' } = options;
  return wrap(text, maxChars).map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${size}px" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(line)}</text>`).join('');
};
const shell = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="1200" height="630" fill="#f8fafc"/><rect x="0" y="0" width="22" height="630" fill="#2455dc"/><circle cx="1080" cy="-30" r="230" fill="#eaf0fc"/><circle cx="1140" cy="20" r="125" fill="#dbe6ff"/>${body}<text x="74" y="574" font-family="Arial, Helvetica, sans-serif" font-size="20px" font-weight="700" fill="#2455dc">MapaRJ</text><text x="1126" y="574" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="17px" fill="#526078">mapa-criminalidade-rj.ricardoguia.com</text></svg>`;
const stat = (x, label, value) => `<text x="${x}" y="306" font-family="Arial, Helvetica, sans-serif" font-size="20px" font-weight="700" fill="#526078">${escapeXml(label.toUpperCase())}</text><text x="${x}" y="354" font-family="Arial, Helvetica, sans-serif" font-size="42px" font-weight="700" fill="#10213f">${escapeXml(value)}</text>`;

function cispFor(name) {
  const wanted = name.toLocaleLowerCase('pt-BR');
  return territories.records.filter((area) => area.neighborhoods.some((raw) => raw.replace(/\s*\(parte\)$/i, '').toLocaleLowerCase('pt-BR') === wanted));
}

function neighborhoodSvg(_slug, name) {
  const record = context.records.find((item) => item.name === name);
  if (!record) throw new Error(`Sem contexto para ${name}`);
  const cisps = cispFor(name);
  const cispText = cisps.map((area) => `CISP ${area.cisp}`).join(', ');
  const body = [
    `<text x="74" y="78" font-family="Arial, Helvetica, sans-serif" font-size="21px" font-weight="700" fill="#2455dc">BAIRRO · RIO DE JANEIRO</text>`,
    `<text x="74" y="142" font-family="Arial, Helvetica, sans-serif" font-size="56px" font-weight="700" fill="#10213f">${escapeXml(name)}</text>`,
    textBlock('Contexto urbanístico do Censo 2022 e CISPs relacionadas', 74, 184, { size: 27, fill: '#526078', maxChars: 58 }),
    stat(74, 'Domicílios no denominador', fmt(record.householdsSurveyed)),
    stat(410, 'Iluminação · sim', `${fmt(record.lighting.yesPct, 2)}%`),
    stat(746, 'Calçada · sim', `${fmt(record.sidewalk.yesPct, 2)}%`),
    `<rect x="74" y="392" width="1050" height="118" rx="18" fill="#eef3ff"/>`,
    textBlock(`CISPs relacionadas: ${cispText}. Registros são da área policial inteira; não são crimes atribuídos ao bairro.`, 100, 431, { size: 21, fill: '#10213f', maxChars: 92, lineHeight: 29 }),
    textBlock('Fonte: IBGE, Censo 2022 — Características Urbanísticas do Entorno dos Domicílios. Recorte municipal, referência 2022.', 74, 548, { size: 16, fill: '#526078', maxChars: 118 }),
  ].join('');
  return shell(body);
}

function bulletinSvg(end) {
  const metric = bulletinMetricFrom(snapshot.rows, population.records, 'total_roubos', end);
  if (!metric) throw new Error(`Métrica indisponível para ${end}`);
  const change = metric.change == null ? 'Indisponível' : `${metric.change >= 0 ? '+' : ''}${fmt(metric.change, 1)}%`;
  const currentWindow = `${monthLabel(shiftMonth(end, -11))} a ${monthLabel(end)}`;
  const previousWindow = `${monthLabel(shiftMonth(end, -23))} a ${monthLabel(shiftMonth(end, -12))}`;
  const body = [
    `<text x="74" y="78" font-family="Arial, Helvetica, sans-serif" font-size="21px" font-weight="700" fill="#2455dc">BOLETIM · ISP-RJ</text>`,
    `<text x="74" y="142" font-family="Arial, Helvetica, sans-serif" font-size="48px" font-weight="700" fill="#10213f">Registros policiais</text>`,
    `<text x="74" y="190" font-family="Arial, Helvetica, sans-serif" font-size="30px" fill="#526078">até ${escapeXml(monthLabel(end))}</text>`,
    stat(74, 'Roubos · janela atual', fmt(metric.count)),
    stat(410, 'Janela anterior', fmt(metric.previous)),
    stat(746, 'Variação anual', change),
    `<rect x="74" y="392" width="1050" height="118" rx="18" fill="#eef3ff"/>`,
    textBlock(`Duas janelas equivalentes de 12 meses · atual: ${currentWindow}; anterior: ${previousWindow}. Município do Rio de Janeiro, 41 CISPs completas.`, 100, 431, { size: 21, fill: '#10213f', maxChars: 92, lineHeight: 29 }),
    textBlock('Fonte: ISP-RJ, série mensal por CISP. Registros recebidos e classificados; não são todos os fatos ocorridos.', 74, 548, { size: 16, fill: '#526078', maxChars: 118 }),
  ].join('');
  return shell(body);
}

await fs.mkdir(OUT, { recursive: true });
const expected = [];
for (const [slug, name] of neighborhoods) expected.push([`bairro-${slug}.png`, neighborhoodSvg(slug, name)]);
for (const end of availableBulletinPeriods(snapshot.rows, population.records, ['total_roubos', 'total_furtos', 'letalidade_violenta', 'estelionato'])) expected.push([`boletim-${end}.png`, bulletinSvg(end)]);
for (const [filename, svg] of expected) {
  const output = path.join(OUT, filename);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(output);
  const metadata = await sharp(output).metadata();
  if (metadata.width !== WIDTH || metadata.height !== HEIGHT) throw new Error(`Dimensão inválida: ${filename}`);
  const size = (await fs.stat(output)).size;
  if (size >= 150 * 1024) throw new Error(`Card acima do orçamento: ${filename} (${size} bytes)`);
}
console.log(`Generated and validated ${expected.length} share cards in ${path.relative(ROOT, OUT)}.`);
