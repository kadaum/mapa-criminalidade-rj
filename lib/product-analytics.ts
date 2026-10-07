export const PRODUCT_ANALYTICS_EVENT = 'product-analytics';
const CONSENT_KEY = 'crime-map-analytics-consent';

const neighborhoods = ['centro', 'copacabana', 'tijuca', 'barra-da-tijuca', 'campo-grande'] as const;
const providers = ['cameras-rio', 'youtube', 'operator-site', 'other-public'] as const;
const validCisps = [1, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44] as const;
const cameraFailures = ['unavailable', 'embed_blocked', 'network', 'resolver_failed', 'playback_error', 'unknown'] as const;
const contributionKinds = ['camera_broken', 'location_correction', 'public_source'] as const;
const contributionStatuses = ['received', 'in_review', 'accepted', 'rejected'] as const;
export const knownCampaigns = ['bairro-piloto', 'boletim-mensal', 'imprensa-local', 'associacoes-locais'] as const;

export type ProductAnalyticsEvent =
  | { name: 'region_select'; cisp: typeof validCisps[number] }
  | { name: 'neighborhood_select'; neighborhood: typeof neighborhoods[number]; cisp: number }
  | { name: 'share'; mode: 'fixed' | 'latest'; channel: 'link' | 'whatsapp'; content: 'neighborhood' | 'bulletin' | 'region' }
  | { name: 'camera_open' | 'camera_resolve' | 'camera_first_frame' | 'camera_progress' | 'camera_open_source'; provider: typeof providers[number]; camera_id: string }
  | { name: 'camera_error'; provider: typeof providers[number]; camera_id: string; reason: typeof cameraFailures[number] }
  | { name: 'camera_timeout'; provider: typeof providers[number]; camera_id: string; threshold_seconds: 10 }
  | { name: 'contribution_received'; kind: typeof contributionKinds[number] }
  | { name: 'contribution_status'; kind: typeof contributionKinds[number]; status: typeof contributionStatuses[number] };

const inList = <T extends readonly string[]>(list: T, value: unknown): value is T[number] => typeof value === 'string' && list.includes(value as T[number]);
const benignId = (value: unknown) => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/.test(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every((key) => keys.includes(key)) && keys.every((key) => key in value);

export function validateProductEvent(value: unknown): value is ProductAnalyticsEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  if (event.name === 'region_select') return exactKeys(event, ['name', 'cisp']) && typeof event.cisp === 'number' && validCisps.includes(event.cisp as typeof validCisps[number]);
  if (event.name === 'neighborhood_select') return exactKeys(event, ['name', 'neighborhood', 'cisp']) && inList(neighborhoods, event.neighborhood) && Number.isInteger(event.cisp) && Number(event.cisp) >= 1 && Number(event.cisp) <= 99;
  if (event.name === 'share') return exactKeys(event, ['name', 'mode', 'channel', 'content']) && inList(['fixed', 'latest'] as const, event.mode) && inList(['link', 'whatsapp'] as const, event.channel) && inList(['neighborhood', 'bulletin', 'region'] as const, event.content);
  if (inList(['camera_open', 'camera_resolve', 'camera_first_frame', 'camera_progress', 'camera_open_source'] as const, event.name)) return exactKeys(event, ['name', 'provider', 'camera_id']) && inList(providers, event.provider) && benignId(event.camera_id);
  if (event.name === 'camera_error') return exactKeys(event, ['name', 'provider', 'camera_id', 'reason']) && inList(providers, event.provider) && benignId(event.camera_id) && inList(cameraFailures, event.reason);
  if (event.name === 'camera_timeout') return exactKeys(event, ['name', 'provider', 'camera_id', 'threshold_seconds']) && inList(providers, event.provider) && benignId(event.camera_id) && event.threshold_seconds === 10;
  if (event.name === 'contribution_received') return exactKeys(event, ['name', 'kind']) && inList(contributionKinds, event.kind);
  if (event.name === 'contribution_status') return exactKeys(event, ['name', 'kind', 'status']) && inList(contributionKinds, event.kind) && inList(contributionStatuses, event.status);
  return false;
}

export function pinnedShareUrl(currentHref: string, effectiveEnd: string) {
  const url = new URL(currentHref);
  if (!/^\d{4}-\d{2}$/.test(effectiveEnd)) throw new Error('Invalid effective period');
  url.searchParams.set('fim', effectiveEnd);
  return url;
}

export function cameraAnalyticsProvider(
  camera: { streamResolver?: string; youtubeId?: string; watchUrl?: string; source: string; access: 'public' | 'registration' | 'subscription' },
  activeProvider?: 'youtube' | 'camerasrj',
): typeof providers[number] {
  if (activeProvider === 'youtube' || camera.streamResolver) return 'youtube';
  if (activeProvider === 'camerasrj' || camera.watchUrl?.startsWith('https://player.camerasrj.com.br/camera/')) return 'cameras-rio';
  if (camera.youtubeId || /(?:youtube\.com|youtu\.be)/.test(camera.watchUrl || camera.source)) return 'youtube';
  return camera.access === 'public' ? 'other-public' : 'operator-site';
}

export function boundedCampaign(search: string) {
  const raw = new URLSearchParams(search).get('utm_campaign');
  return inList(knownCampaigns, raw) ? raw : undefined;
}

export function emitProductEvent(event: ProductAnalyticsEvent) {
  if (typeof window === 'undefined' || !validateProductEvent(event)) return false;
  try { if (window.localStorage.getItem(CONSENT_KEY) !== 'accepted') return false; } catch { return false; }
  window.dispatchEvent(new CustomEvent(PRODUCT_ANALYTICS_EVENT, { detail: event }));
  return true;
}

export function emitRegionSelect(cisp: number) {
  if (!validCisps.includes(cisp as typeof validCisps[number])) return false;
  return emitProductEvent({ name: 'region_select', cisp: cisp as typeof validCisps[number] });
}
