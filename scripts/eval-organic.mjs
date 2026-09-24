import fs from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.EVAL_BASE_URL || 'http://localhost:3000';
const published = 'https://mapa-criminalidade-rj.ricardoguia.com';
const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crime-rio-snapshot.json', import.meta.url)));
const territory = JSON.parse(fs.readFileSync(new URL('../public/data/cisp-neighborhoods.json', import.meta.url)));
const geometry = JSON.parse(fs.readFileSync(new URL('../public/data/cisp-rio.geojson', import.meta.url)));
const population = JSON.parse(fs.readFileSync(new URL('../public/data/cisp-population.json', import.meta.url)));
const checks = [];
function check(name, fn) { try { fn(); checks.push({ name, status: 'pass' }); } catch (error) { checks.push({ name, status: 'fail', error: error.message }); } }
async function page(path) { const response = await fetch(`${base}${path}`); return { response, html: await response.text() }; }
function metadata(html, key) { return [...html.matchAll(/<link\s+[^>]*>/g)].map((item) => item[0]).find((tag) => tag.includes(`rel="${key}"`)) || ''; }
function hasJsonLd(html) { const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1])); assert.ok(scripts.length); return scripts; }
function format(value) { return value.toLocaleString('pt-BR'); }

check('snapshot schema and source hash', () => { assert.equal(snapshot.schemaVersion, 1); assert.match(snapshot.source.sha256, /^[a-f0-9]{64}$/); assert.equal(snapshot.latestPeriod, '2026-08'); });
const ids = [...new Set(snapshot.rows.map((row) => row.cisp))].sort((a,b)=>a-b);
const months = [...new Set(snapshot.rows.map((row) => row.period))].sort((a,b)=>a.localeCompare(b));
check('41 areas and geometry/territory/population cover identical IDs', () => {
  assert.equal(ids.length, 41);
  for (const group of [territory.records.map((r)=>r.cisp),geometry.features.map((r)=>Number(r.properties.cisp)),population.records.map((r)=>r.cisp)])
    assert.deepEqual([...new Set(group)].sort((a,b)=>a-b), ids);
  assert.equal(population.records.reduce((sum,r)=>sum+r.population,0),6211223);
  assert.equal(population.audit.populationAssigned,6211223);
});
check('unique CISP-month keys, continuous months, complete nonnegative values', () => {
  assert.equal(months.length,36);
  assert.equal(snapshot.rows.length,36*41);
  const keys = new Set();
  for (let i=1;i<months.length;i++) { const [year,month]=months[i-1].split('-').map(Number); assert.equal(months[i],new Date(Date.UTC(year,month,1)).toISOString().slice(0,7)); }
  for (const row of snapshot.rows) {
    const key=`${row.cisp}:${row.period}`; assert.ok(!keys.has(key),key); keys.add(key);
    for (const item of snapshot.indicators) assert.ok(Number.isSafeInteger(row.values[item.id]) && row.values[item.id]>=0,key+':'+item.id);
  }
});
check('equal comparison windows and rate arithmetic', () => {
  const current=months.slice(-12), before=months.slice(-24,-12);
  assert.equal(current.length,before.length); assert.equal(current.length,12);
  const rows=snapshot.rows.filter((r)=>r.cisp===16);
  const now=rows.filter((r)=>current.includes(r.period)).reduce((sum,r)=>sum+r.values.total_roubos,0);
  const prior=rows.filter((r)=>before.includes(r.period)).reduce((sum,r)=>sum+r.values.total_roubos,0);
  const pop=population.records.find((r)=>r.cisp===16).population;
  assert.ok(now>0 && prior>0 && pop>0);
  assert.ok(Math.abs(now/pop*100000-915.1)<0.1);
});

const paths=['/','/regioes',...ids.map((id)=>`/regioes/cisp-${id}`),'/indicadores',...snapshot.indicators.map((item)=>`/indicadores/${item.id}`),'/dados','/metodologia','/boletins/2026-08'];
const home = await page('/');
check('home description, preview and icon links',()=>{
  const head=home.html.split('</head>')[0];
  assert.match(head,/<meta name="description" content="[^"]+"/);
  for(const asset of ['/og.png','/favicon.ico','/favicon.svg','/apple-touch-icon.png']) assert.ok(head.includes(asset),asset);
});
const sitemap=await page('/sitemap.xml');
check('sitemap is XML with one URL per canonical page',()=>{assert.equal(sitemap.response.status,200);const urls=[...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map((m)=>m[1]);assert.equal(urls.length,paths.length);assert.deepEqual(new Set(urls).size,paths.length);for(const path of paths)assert.ok(urls.includes(`${published}${path}`),path);});
for (const path of paths) {
  const {response,html}=await page(path);
  check(`HTTP, canonical, HTML and schema ${path}`,()=>{
    const head=html.split('</head>')[0];
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type')||'',/text\/html/);
    assert.ok(/<h1[ >]/.test(html),'missing h1');
    assert.match(head,/<meta name="description" content="[^"]+"/);
    assert.ok(metadata(head,'canonical').includes(path === '/' ? published : `${published}${path}`),path);
    assert.ok(!html.includes('http://localhost:3000/og.png'));
    if (path !== '/metodologia') hasJsonLd(html);
  });
  if (path.startsWith('/regioes/cisp-')) {
    const id=Number(path.split('-').at(-1));
    const count=snapshot.rows.filter((r)=>r.cisp===id&&months.slice(-12).includes(r.period)).reduce((sum,r)=>sum+r.values.total_roubos,0);
    check(`CISP ${id} has current real count and official territory`,()=>{assert.ok(html.includes(format(count)),`${id}:${count}`);assert.ok(html.includes(territory.records.find((r)=>r.cisp===id).territorialUnit));});
  }
}
for(const path of ['/meu-bairro?cisp=16&indicador=total_roubos','/rankings','/comparar?cisp=16']) {
  const {response,html}=await page(path);
  check(`interactive initial HTML ${path}`,()=>{assert.equal(response.status,200);assert.ok(html.includes('agosto de 2026'));assert.ok(html.includes('/regioes'));assert.ok(!html.includes('http://localhost:3000/og.png'));});
}
const invalid=await page('/regioes/cisp-999');
check('nonexistent CISP returns 404',()=>assert.equal(invalid.response.status,404));
const invalidIndicator=await page('/indicadores/inventado');
check('nonexistent indicator returns 404',()=>assert.equal(invalidIndicator.response.status,404));
for(const path of ['/robots.txt','/data/crime-rio-snapshot.json','/data/crime-rio-history-cisp.csv','/llms.txt']) {const result=await page(path);check(`public resource ${path}`,()=>assert.equal(result.response.status,200));}
for(const [path,contentType,signature] of [['/favicon.ico',/image\/(?:x-icon|vnd\.microsoft\.icon)/,'00000100'],['/apple-touch-icon.png',/image\/png/,'89504e47'],['/favicon.svg',/image\/svg\+xml/,'3c737667'],['/og.png',/image\/png/,'89504e47']]) {
  const response=await fetch(`${base}${path}`), bytes=Buffer.from(await response.arrayBuffer());
  check(`preview/icon asset ${path}`,()=>{assert.equal(response.status,200);assert.match(response.headers.get('content-type')||'',contentType);assert.ok(bytes.subarray(0,4).toString('hex')===signature);});
}
const api=await page('/api/crime');
check('API and published snapshot use same month',()=>assert.equal(JSON.parse(api.html).latestPeriod,snapshot.latestPeriod));

const failed=checks.filter((item)=>item.status==='fail');
console.log(JSON.stringify({base, passed:checks.length-failed.length,failed:failed.length,failures:failed},null,2));
process.exitCode=failed.length?1:0;
