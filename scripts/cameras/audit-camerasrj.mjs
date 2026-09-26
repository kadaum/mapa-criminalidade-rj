import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, '.perf-tools/package.json'));
const puppeteer = require('puppeteer-core');
const output = path.join(root, 'research/cameras/full-audit-camerasrj-2026-09-26.jsonl');
const summaryPath = output.replace(/jsonl$/, 'json');
const stopPath = output.replace(/jsonl$/, 'stop');
const cameras = JSON.parse(fs.readFileSync(path.join(root, 'public/data/public-cameras.json'), 'utf8')).cameras.filter(c => /^camerasrj-\d+$/.test(c.id) && c.access === 'public');
const concurrency = Math.max(1, Math.min(4, Number(process.env.CAMERA_AUDIT_CONCURRENCY) || 4));
const timeoutMs = 40000;
const done = new Map();
if (fs.existsSync(output)) for (const line of fs.readFileSync(output, 'utf8').split('\n').filter(Boolean)) {
  try { const entry = JSON.parse(line); if (entry.outcome !== 'deferred_rate_limit') done.set(entry.id, entry); } catch { /* Preserve complete resumable records after interruption. */ }
}
const priorityIds = ['camerasrj-7237', 'camerasrj-1967', 'camerasrj-49', 'camerasrj-874', 'camerasrj-7278', 'camerasrj-7279'];
const queue = cameras.filter(c => !done.has(c.id)).sort((a, b) => {
  const priority = id => { const index = priorityIds.indexOf(id); return index < 0 ? 100 : index; };
  return Number(Boolean(b.coordinates)) - Number(Boolean(a.coordinates)) || priority(a.id) - priority(b.id);
});
if (Number(process.env.CAMERA_AUDIT_LIMIT) > 0) queue.splice(Number(process.env.CAMERA_AUDIT_LIMIT));
let cursor = 0;
const startedAt = new Date().toISOString();
let shuttingDown = false;
let backoffUntil = 0;
let rateLimitEvents = 0;
process.on('SIGINT', () => { shuttingDown = true; });
process.on('SIGTERM', () => { shuttingDown = true; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function summary(state = 'running') {
  const counts = {};
  for (const result of done.values()) counts[result.outcome] = (counts[result.outcome] || 0) + 1;
  const value = { state: state === 'running' && Date.now() < backoffUntil ? 'backoff' : state, pid: process.pid, startedAt, updatedAt: new Date().toISOString(), total: cameras.length, tested: done.size, remaining: cameras.length - done.size, concurrency, timeoutMs, counts, rateLimitEvents, backoffUntil: backoffUntil ? new Date(backoffUntil).toISOString() : null, evidence: path.basename(output), scope: 'Every public CamerasRJ catalog ID; playback checked in real Chrome iframe. A successful HTTP response alone is never success.' };
  fs.writeFileSync(summaryPath, JSON.stringify(value, null, 2) + '\n');
  return value;
}
function inspect() {
  const video = [...document.querySelectorAll('video')].find(v => v.srcObject?.getVideoTracks?.().length) || document.querySelector('video');
  const error = document.querySelector('#error');
  const style = error && getComputedStyle(error);
  let pixels = null;
  if (video?.videoWidth && video.srcObject?.getVideoTracks?.().length) {
    try {
      const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 18;
      const ctx = canvas.getContext('2d'); ctx.drawImage(video, 0, 0, 32, 18);
      const data = ctx.getImageData(0, 0, 32, 18).data;
      let sum = 0, nonblack = 0;
      for (let i = 0; i < data.length; i += 4) { const luma = (data[i] + data[i + 1] + data[i + 2]) / 3; sum += luma; if (luma > 10) nonblack++; }
      pixels = { mean: Math.round(sum / (data.length / 4) * 100) / 100, nonblack };
    } catch (e) { pixels = { error: e.name }; }
  }
  return {
    visibility: document.visibilityState,
    video: video ? { width: video.videoWidth, height: video.videoHeight, time: video.currentTime, readyState: video.readyState, paused: video.paused, frames: video.getVideoPlaybackQuality?.().totalVideoFrames ?? null, liveTracks: video.srcObject?.getVideoTracks?.().filter(t => t.readyState === 'live').length || 0, mediaError: video.error?.code || null, pixels } : null,
    error: error && style.display !== 'none' && style.visibility !== 'hidden' ? error.innerText.trim().slice(0, 280) : null,
  };
}
const server = http.createServer((req, res) => {
  const id = /^\/(\d+)$/.exec(req.url || '')?.[1];
  if (!id) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', 'text/html');
  res.end(`<!doctype html><title>Camera playback audit</title><iframe width="960" height="540" allow="autoplay; fullscreen" referrerpolicy="strict-origin-when-cross-origin" src="https://player.camerasrj.com.br/camera/${id}/"></iframe>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const browsers = [];
try {
  console.log(JSON.stringify(summary()));
  await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
    // Each worker has one foreground page in its own browser: some providers
    // explicitly pause hidden tabs, independently of Chromium throttling flags.
    const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 10000, timeout: 20000, args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
    browsers.push(browser);
    let consecutiveAuditErrors = 0;
    while (!shuttingDown && !fs.existsSync(stopPath)) {
      while (Date.now() < backoffUntil && !shuttingDown && !fs.existsSync(stopPath)) await sleep(1000);
      if (shuttingDown || fs.existsSync(stopPath)) return;
      const camera = queue[cursor++];
      if (!camera) return;
      const testStarted = Date.now();
      const result = { id: camera.id, name: camera.name, checkedAt: new Date().toISOString(), source: camera.watchUrl, worker, outcome: 'unconfirmed', evidence: [] };
      let page;
      try {
        page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 720 });
        const browserErrors = [];
        const playbackFailures = [];
        let rateLimited = false;
        page.on('response', response => {
          const url = new URL(response.url());
          if (url.origin === 'https://player.camerasrj.com.br' && response.status() === 429) {
            rateLimited = true;
            rateLimitEvents++;
            const retryAfter = Number(response.headers()['retry-after']);
            backoffUntil = Math.max(backoffUntil, Date.now() + Math.min(1800, Math.max(300, Number.isFinite(retryAfter) ? retryAfter : 0)) * 1000);
          }
          if (url.origin === 'https://player.camerasrj.com.br' && /\/whep\//.test(url.pathname) && response.status() >= 400) {
            playbackFailures.push({ phase: 'video_negotiation', status: response.status() });
          }
        });
        page.on('console', msg => { const text = msg.text(); if (/refused to (frame|display)|frame-ancestors|x-frame-options/i.test(text)) browserErrors.push(text.slice(0, 280)); });
        await page.goto(`http://127.0.0.1:${port}/${camera.id.replace('camerasrj-', '')}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        let baseline = null;
        let baselineAt = 0;
        let sourceError = null;
        let sourceErrorAt = 0;
        while (Date.now() - testStarted < timeoutMs) {
          if (rateLimited) {
            result.outcome = 'deferred_rate_limit';
            result.reason = 'Provider returned 429; shared backoff and retry queued.';
            break;
          }
          const frame = page.frames().find(f => f.url().startsWith('https://player.camerasrj.com.br/camera/'));
          if (frame) {
            const sample = await frame.evaluate(inspect);
            if (sample.error && sample.error === sourceError && Date.now() - sourceErrorAt >= 4000) {
              result.evidence = [sample];
              result.outcome = 'stream_failed';
              result.reason = sample.error;
              break;
            }
            if (sample.error !== sourceError) { sourceError = sample.error; sourceErrorAt = Date.now(); }
            const v = sample.video;
            if (v?.liveTracks && v.width >= 64 && v.height >= 36 && v.readyState >= 2 && !v.paused && sample.visibility === 'visible') {
              if (!baseline) { baseline = sample; baselineAt = Date.now(); }
              else if (Date.now() - baselineAt >= 2500) {
                if (v.frames > baseline.video.frames && v.time > baseline.video.time + 0.5) {
                  result.outcome = v.pixels?.nonblack === 0 ? 'decoded_black_frames' : 'playback_confirmed';
                  result.evidence = [baseline, sample];
                  break;
                }
                baseline = sample; baselineAt = Date.now();
              }
            }
            result.evidence = [sample];
          }
          if (playbackFailures.length) {
            result.outcome = 'stream_failed';
            result.reason = 'The provider video negotiation failed during browser playback.';
            result.playbackFailures = playbackFailures;
            break;
          }
          await sleep(1000);
        }
        if (!['playback_confirmed', 'decoded_black_frames', 'stream_failed', 'deferred_rate_limit'].includes(result.outcome)) {
          const last = result.evidence.at(-1);
          if (browserErrors.length) { result.outcome = 'player_blocked'; result.browserErrors = browserErrors; }
          else if (last?.error) { result.outcome = 'stream_failed'; result.reason = last.error; }
          else { result.outcome = 'unconfirmed_timeout'; result.reason = 'No advancing decoded camera frames within bounded observation; not proof the camera is offline.'; }
        }
      } catch (error) {
        result.outcome = 'audit_error';
        result.reason = `${error.name}: ${error.message}`.slice(0, 350).replace(/https?:\/\/\S+/g, '[URL]');
      } finally {
        if (page) await page.close().catch(() => {});
      }
      result.durationMs = Date.now() - testStarted;
      fs.appendFileSync(output, JSON.stringify(result) + '\n');
      if (result.outcome === 'deferred_rate_limit') queue.push(camera);
      else done.set(result.id, result);
      consecutiveAuditErrors = result.outcome === 'audit_error' ? consecutiveAuditErrors + 1 : 0;
      if (consecutiveAuditErrors >= 3) { shuttingDown = true; console.error('Stopping resumably: repeated browser/protocol audit errors.'); }
      const progress = summary();
      if (done.size % 25 === 0 || done.size <= 4) console.log(JSON.stringify(progress));
      await sleep(1000);
    }
  }));
  console.log(JSON.stringify(summary(done.size === cameras.length ? 'complete' : 'stopped_resumable')));
} catch (error) {
  console.error(`${error.name}: ${error.message}`);
  summary('interrupted_resumable');
  process.exitCode = 1;
} finally {
  await Promise.all(browsers.map(browser => browser.close().catch(() => {})));
  server.close();
}
