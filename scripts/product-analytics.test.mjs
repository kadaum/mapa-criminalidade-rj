import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { boundedCampaign, cameraAnalyticsProvider, emitProductEvent, pinnedShareUrl, validateProductEvent } from '../lib/product-analytics.ts';
import { CAMERA_SHARE_CARDS } from '../lib/camera-share-cards.ts';

test('allowlist aceita somente payloads definidos e sem campos extras', () => {
  assert.equal(validateProductEvent({ name: 'neighborhood_select', neighborhood: 'tijuca', cisp: 18 }), true);
  for (const cisp of [1, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44])
    assert.equal(validateProductEvent({ name: 'region_select', cisp }), true);
  for (const cisp of [0, 2, 3, 8, 45, 99, '18'])
    assert.equal(validateProductEvent({ name: 'region_select', cisp }), false);
  assert.equal(validateProductEvent({ name: 'region_select', cisp: 18, neighborhood: 'tijuca' }), false);
  assert.equal(validateProductEvent({ name: 'camera_timeout', provider: 'youtube', camera_id: 'posto-6', threshold_seconds: 10 }), true);
  assert.equal(validateProductEvent({ name: 'share', mode: 'fixed', channel: 'link', content: 'camera' }), true);
  assert.equal(validateProductEvent({ name: 'share', mode: 'fixed', channel: 'link', content: 'free-text' }), false);
  assert.deepEqual(Object.keys(CAMERA_SHARE_CARDS).sort(), ['camerasrj-1698', 'camerasrj-1725']);
  assert.equal(validateProductEvent({ name: 'camera_timeout', provider: 'youtube', camera_id: 'posto-6', threshold_seconds: 10, address: 'Rua X' }), false);
  assert.equal(validateProductEvent({ name: 'camera_error', provider: 'youtube', camera_id: 'https://example.test/?token=x', reason: 'offline' }), false);
  assert.equal(validateProductEvent({ name: 'contribution_status', kind: 'camera_broken', status: 'accepted', protocol: '123' }), false);
});

test('URL compartilhada fixa o período efetivo e preserva os demais filtros', () => {
  const current = 'https://mapa.test/meu-bairro?cisp=12&bairro=Copacabana&outra=18&indicador=total_furtos&meses=6&fim=latest&comparacao=year&visualizacao=taxa&utm_campaign=bairro-piloto';
  const pinned = pinnedShareUrl(current, '2026-08');
  assert.equal(pinned.searchParams.get('fim'), '2026-08');
  assert.equal(pinned.searchParams.get('bairro'), 'Copacabana');
  assert.equal(pinned.searchParams.get('outra'), '18');
  assert.equal(pinned.searchParams.get('utm_campaign'), 'bairro-piloto');
  assert.equal(new URL(current).searchParams.get('fim'), 'latest');
});

test('provider de câmera segue a origem comprovada e não texto livre', () => {
  const base = { source: 'https://operator.example/cam', access: 'public' };
  assert.equal(cameraAnalyticsProvider({ ...base, streamResolver: 'homes-posto-6' }), 'youtube');
  assert.equal(cameraAnalyticsProvider({ ...base, watchUrl: 'https://player.camerasrj.com.br/camera/42/' }), 'cameras-rio');
  assert.equal(cameraAnalyticsProvider(base), 'other-public');
  assert.equal(cameraAnalyticsProvider({ ...base, access: 'registration' }), 'operator-site');
  assert.equal(cameraAnalyticsProvider({ ...base, source: 'https://youtube.com/watch?v=abcdefghijk' }), 'youtube');
  assert.equal(cameraAnalyticsProvider({ ...base, source: 'https://operator.example/cameras-rio-youtube' }), 'other-public');
});

test('UTM conserva apenas campanhas conhecidas', () => {
  assert.equal(boundedCampaign('?utm_campaign=boletim-mensal&utm_term=crime+copacabana'), 'boletim-mensal');
  assert.equal(boundedCampaign('?utm_campaign=texto-livre'), undefined);
  assert.equal(boundedCampaign('?q=endereco'), undefined);
});

test('emissão exige consentimento atual, inclusive após revogação', () => {
  const events = [];
  const store = new Map();
  globalThis.window = { localStorage: { getItem: (key) => store.get(key) ?? null }, dispatchEvent: (event) => events.push(event) };
  globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init.detail; } };
  const event = { name: 'share', mode: 'fixed', channel: 'link', content: 'bulletin' };
  assert.equal(emitProductEvent(event), false);
  store.set('crime-map-analytics-consent', 'accepted');
  assert.equal(emitProductEvent(event), true);
  store.set('crime-map-analytics-consent', 'rejected');
  assert.equal(emitProductEvent(event), false);
  assert.equal(events.length, 1);
  delete globalThis.window;
  delete globalThis.CustomEvent;
});

test('inicializador do GA permanece depois do gate de consentimento', async () => {
  const source = await readFile(new URL('../components/analytics.tsx', import.meta.url), 'utf8');
  const gate = source.indexOf('if (!hasAnalyticsConsent()) return;');
  const initialize = source.indexOf('const gtag = initializeAnalytics();');
  assert.ok(gate >= 0 && initialize > gate);
  assert.deepEqual([...source.matchAll(/G-[A-Z0-9]+/g)].map((match) => match[0]).slice(0, 2), ['G-0PDCFQQGBC', 'G-GN79TEBSWQ']);
});
