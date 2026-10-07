const OUTCOMES = new Set(['playing','first_frame_only','failed','unknown','restricted','external']);
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const validUtc = value => UTC.test(value) && new Date(value).toISOString() === value;
const boundedString = (value, max) => typeof value === 'string' && value.length <= max;
const PILOT_IDS=['homes-posto-3','homes-posto-6','camerasrj-1698','camerasrj-373','camerasrj-1725','camerasrj-7964','camerasrj-1555','camerasrj-7328','camerasrj-6170','camerasrj-354'];
const exactKeys = (value, keys, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`invalid ${label}`);
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw Error(`unexpected ${label} field: ${key}`);
};

export function validatePriorityConfig(config,catalog) {
  if (!Array.isArray(config.records) || config.records.length !== 10) throw Error('priority config must contain exactly 10 records');
  const ids=config.records.map(x=>x.id);
  if(new Set(ids).size!==10||PILOT_IDS.some(id=>!ids.includes(id)))throw Error('priority config must contain the exact pilot IDs once');
  for(const r of config.records){
    if(!['youtube','camerasrj'].includes(r.adapter)||!['unknown','Homes in Rio'].includes(r.operator)||r.permission!=='unknown'||!String(r.source).startsWith('https://'))throw Error(`invalid priority record: ${r.id}`);
    const c=catalog?.cameras?.find(x=>x.id===r.id);if(c&&(c.source!==r.source||c.publisher!==r.publisher||(r.operator==='Homes in Rio'?c.operator!=='Homes in Rio':c.operator!=='Não informado pelo catálogo')||JSON.stringify(c.coordinates)!==JSON.stringify(r.location.coordinates)||c.precision!==r.location.precision||c.locationSource!==r.location.evidence))throw Error(`priority identity differs from catalog: ${r.id}`);
  }
  return config;
}

export function classifyEvidence(e) {
  if (e.errorCategory === 'access' || e.restricted) return 'restricted';
  if (e.external) return 'external';
  if (e.errorCategory === 'source') return 'failed';
  if (e.errorCategory === 'interrupted') return 'unknown';
  const [a,b] = e.samples || [];
  const ordered = a && b && Date.parse(b.at) - Date.parse(a.at) >= 4000 && Number.isFinite(a.monotonicMs) && Number.isFinite(b.monotonicMs) && b.monotonicMs-a.monotonicMs>=4000;
  const same = ordered && a.sameDomVideo === true && b.sameDomVideo === true && a.sameStream === true && b.sameStream === true && a.sameTrack === true && b.sameTrack === true;
  const viable = same && a.trackLive === true && b.trackLive === true && [a.readyState,b.readyState,a.width,a.height,b.width,b.height].every(Number.isFinite) && a.readyState >= 2 && b.readyState >= 2 && a.width > 0 && a.height > 0 && b.width > 0 && b.height > 0;
  const decoded = viable && a.counterBasis === b.counterBasis && ['quality_non_dropped','webkit_decoded'].includes(a.counterBasis) && Number.isFinite(a.counterFrames) && Number.isFinite(b.counterFrames) && b.counterFrames > a.counterFrames;
  const presented = viable && Number.isFinite(a.presentedFrames) && Number.isFinite(b.presentedFrames) && b.presentedFrames > a.presentedFrames;
  const youtubeGate = e.adapter !== 'youtube' || (e.sameVideoSourceIdentity === true && e.youtubeApiPlaying === true && e.renderedFrame === true);
  const firstFrameSignal = e.adapter === 'youtube' ? 'youtube_rvfc_rendered_video' : 'provider_first_frame_live_track';
  const firstFrame = e.firstFrame?.signal === firstFrameSignal;
  if (firstFrame && decoded && presented && youtubeGate) return 'playing';
  if (firstFrame) return 'first_frame_only';
  return 'unknown';
}

export function validateAttempt(a, allowedIds) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) throw Error('invalid attempt');
  if ('evidence' in a) throw Error('nested evidence fields are not accepted');
  exactKeys(a,['roundId','id','source','publisher','operator','permission','adapter','context','startedAt','endedAt','durationMs','observationDurationMs','firstFrame','samples','errorCategory','providerError','restricted','external','sameVideoSourceIdentity','youtubeApiPlaying','renderedFrame','navigationError','outcome'],'attempt');
  if (!(allowedIds instanceof Map)) throw Error('allowlist record map required');
  if (!allowedIds.has(a.id)) throw Error(`id not allowlisted: ${a.id}`);
  const expected=allowedIds.get(a.id);
  if(!['youtube','camerasrj'].includes(a.adapter)||expected&&a.adapter!==expected.adapter)throw Error('adapter does not match allowlisted camera');
  if(expected&&(a.source!==expected.source||a.publisher!==expected.publisher||a.operator!==expected.operator||a.permission!==expected.permission))throw Error('attempt identity does not match allowlist');
  if (!boundedString(a.roundId, 100) || !a.roundId) throw Error('roundId required');
  for (const key of ['startedAt','endedAt']) if (!validUtc(a[key])) throw Error(`${key} must be canonical UTC Z`);
  if (Date.parse(a.endedAt) <= Date.parse(a.startedAt)) throw Error('attempt timestamps out of order');
  if (!Number.isFinite(a.durationMs) || a.durationMs <= 0 || a.durationMs > Date.parse(a.endedAt)-Date.parse(a.startedAt)+1000) throw Error('invalid durationMs');
  if(!Number.isFinite(a.observationDurationMs)||a.observationDurationMs<45000||a.observationDurationMs>a.durationMs)throw Error('invalid observationDurationMs');
  if (!a.context || a.context.device !== 'desktop' || a.context.headless !== true ||
      typeof a.context.browser !== 'string' || a.context.browser.length > 400 ||
      !a.context.viewport || !Number.isInteger(a.context.viewport.width) || !Number.isInteger(a.context.viewport.height) ||
      a.context.viewport.width <= 0 || a.context.viewport.height <= 0 ||
      !boundedString(a.context.origin, 256)) throw Error('invalid browser context');
  exactKeys(a.context,['device','origin','headless','browser','viewport'],'context');
  exactKeys(a.context.viewport,['width','height'],'viewport');
  try {
    const origin = new URL(a.context.origin);
    const local = origin.protocol === 'http:' && ['localhost','127.0.0.1','::1'].includes(origin.hostname);
    if ((!local && origin.protocol !== 'https:') || origin.username || origin.password || origin.origin !== a.context.origin) throw Error();
  } catch { throw Error('invalid browser origin'); }
  if (a.firstFrame && a.firstFrame.signal !== (a.adapter === 'youtube' ? 'youtube_rvfc_rendered_video' : 'provider_first_frame_live_track')) throw Error('invalid first frame signal');
  if (a.firstFrame) exactKeys(a.firstFrame,['at','signal'],'firstFrame');
  for (const point of [a.firstFrame,a.providerError, ...(a.samples || [])].filter(Boolean)) {
    if (!validUtc(point.at) || Date.parse(point.at) < Date.parse(a.startedAt) || Date.parse(point.at) > Date.parse(a.endedAt)) throw Error('evidence timestamp outside attempt');
  }
  if (a.samples?.length && a.samples.length !== 2) throw Error('exactly two samples required');
  for(const s of a.samples||[]){exactKeys(s,['at','monotonicMs','sameDomVideo','sameStream','sameTrack','trackLive','readyState','width','height','qualityTotalFrames','qualityDroppedFrames','counterBasis','counterFrames','presentedFrames'],'sample');for(const k of ['sameDomVideo','sameStream','sameTrack','trackLive'])if(typeof s[k]!=='boolean')throw Error(`sample ${k} must be boolean`);if(!['quality_non_dropped','webkit_decoded'].includes(s.counterBasis))throw Error('invalid counterBasis');for(const k of ['readyState','width','height','monotonicMs'])if(!Number.isFinite(s[k])||s[k]<0)throw Error(`sample ${k} must be nonnegative and finite`);if(!Number.isInteger(s.readyState)||s.readyState>4)throw Error('sample readyState must be an integer from 0 to 4');for(const k of ['counterFrames','presentedFrames','qualityTotalFrames','qualityDroppedFrames'])if(s[k]!==null&&(!Number.isFinite(s[k])||s[k]<0))throw Error(`sample ${k} must be nonnegative and finite or null`);if(s.qualityTotalFrames!==null&&s.qualityDroppedFrames!==null&&s.qualityDroppedFrames>s.qualityTotalFrames)throw Error('dropped frames exceed total frames')}
  for(const k of ['restricted','external','sameVideoSourceIdentity','youtubeApiPlaying','renderedFrame'])if(typeof a[k]!=='boolean')throw Error(`${k} must be boolean`);
  if (a.samples?.length === 2 && Date.parse(a.samples[1].at)-Date.parse(a.samples[0].at)<4000) throw Error('samples must be ordered at least 4 seconds apart');
  if(a.firstFrame&&a.samples?.length&&Date.parse(a.firstFrame.at)>Date.parse(a.samples[0].at))throw Error('first frame must precede samples');
  if (a.errorCategory != null && !['source','access','interrupted'].includes(a.errorCategory)) throw Error('invalid errorCategory');
  if (a.navigationError != null && a.navigationError !== 'navigation_failed') throw Error('invalid navigationError');
  if (a.providerError) {
    exactKeys(a.providerError,['at','state','code','httpStatus'],'providerError');
    if (!boundedString(a.providerError.state, 80) || (a.providerError.code != null && !boundedString(a.providerError.code, 80)) ||
        (a.providerError.httpStatus != null && (!Number.isInteger(a.providerError.httpStatus) || a.providerError.httpStatus < 100 || a.providerError.httpStatus > 599))) throw Error('invalid providerError');
  }
  const outcome = classifyEvidence(a);
  if(a.outcome!=null&&a.outcome!==outcome)throw Error('declared outcome differs from evidence');
  if (!OUTCOMES.has(outcome)) throw Error('invalid outcome');
  return {...a, outcome};
}

export function validateAttemptSet(attempts, allowedIds) {
  const seen = new Set();
  return attempts.map(a => {
    const key = `${a.roundId}\0${a.id}`;
    if (seen.has(key)) throw Error(`duplicate roundId/id: ${a.roundId}/${a.id}`);
    seen.add(key);
    return validateAttempt(a, allowedIds);
  });
}

export function sanitizeAttempt(a) {
  const sample=s=>s&&({at:s.at,monotonicMs:s.monotonicMs,sameDomVideo:s.sameDomVideo,sameStream:s.sameStream,sameTrack:s.sameTrack,trackLive:s.trackLive,readyState:s.readyState,width:s.width,height:s.height,qualityTotalFrames:s.qualityTotalFrames,qualityDroppedFrames:s.qualityDroppedFrames,counterBasis:s.counterBasis,counterFrames:s.counterFrames,presentedFrames:s.presentedFrames});
  return {roundId:a.roundId,id:a.id,source:a.source,publisher:a.publisher,operator:a.operator,permission:a.permission,adapter:a.adapter,context:a.context&&{device:a.context.device,origin:a.context.origin,headless:a.context.headless,browser:a.context.browser,viewport:a.context.viewport&&{width:a.context.viewport.width,height:a.context.viewport.height}},startedAt:a.startedAt,endedAt:a.endedAt,durationMs:a.durationMs,observationDurationMs:a.observationDurationMs,firstFrame:a.firstFrame&&{at:a.firstFrame.at,signal:a.firstFrame.signal},samples:a.samples?.map(sample)??null,errorCategory:a.errorCategory,providerError:a.providerError&&{at:a.providerError.at,state:a.providerError.state,code:a.providerError.code,httpStatus:a.providerError.httpStatus},restricted:a.restricted,external:a.external,sameVideoSourceIdentity:a.sameVideoSourceIdentity,youtubeApiPlaying:a.youtubeApiPlaying,renderedFrame:a.renderedFrame,navigationError:a.navigationError,outcome:a.outcome};
}

export function applyReviewedObservations(catalog, observations, reviewedKeys) {
  const out = structuredClone(catalog);
  const byId = new Map();
  for (const e of observations.filter(e=>reviewedKeys.has(`${e.roundId}/${e.id}`))) {
    const prior = byId.get(e.id);
    if (!prior || Date.parse(e.endedAt) > Date.parse(prior.endedAt)) byId.set(e.id,e);
  }
  for (const camera of out.cameras) {
    const e = byId.get(camera.id);
    if (!e) continue;
    if (camera.playbackCheck?.checkedAt && Date.parse(e.endedAt) <= Date.parse(camera.playbackCheck.checkedAt)) continue;
    const outcome = classifyEvidence(e);
    camera.status = outcome === 'playing' ? 'observed' : outcome === 'failed' ? 'failed' : 'unverified';
    camera.checkedAt = new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo'}).format(new Date(e.endedAt));
    camera.playbackCheck = {checkedAt:e.endedAt,outcome:outcome === 'unknown' || outcome === 'first_frame_only' ? 'inconclusive' : outcome,reason:verdictReason(outcome),method:'Revalidação prioritária: primeira imagem, avanço de quadros não descartados (Media Playback Quality) e apresentações RVFC no mesmo vídeo/stream/track, em duas amostras separadas por pelo menos 4 segundos.'};
  }
  const checks=out.cameras.filter(c=>c.playbackCheck);
  out.playbackAudit={total:out.cameras.length,checked:checks.length,complete:checks.length===out.cameras.length,updatedAt:checks.reduce((v,c)=>c.playbackCheck.checkedAt>v?c.playbackCheck.checkedAt:v,''),counts:checks.reduce((m,c)=>(m[c.playbackCheck.outcome]=(m[c.playbackCheck.outcome]||0)+1,m),{})};
  return out;
}

function verdictReason(outcome) {
  return ({playing:'Movimento confirmado por avanço estrito de quadros não descartados e apresentações RVFC.',failed:'A fonte reportou erro explícito; isso não confirma que a câmera esteja desligada.',restricted:'O acesso ao player estava restrito.',external:'A reprodução exige abertura na fonte externa.',first_frame_only:'Uma imagem foi observada, mas não houve avanço suficiente para confirmar movimento.',unknown:'O teste terminou sem evidência suficiente nem erro explícito da fonte.'})[outcome];
}
