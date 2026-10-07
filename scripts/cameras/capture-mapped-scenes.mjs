import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, '.perf-tools/package.json'));
const puppeteer = require('puppeteer-core');
const research = path.join(root, 'research/cameras');
const output = path.join(research, 'mapped-scenes-2026-09-26.jsonl');
const progressPath = path.join(research, 'mapped-scenes-2026-09-26.json');
const imageDir = path.join(root, '.perf-tools/mapped-scenes');
const auditPath = path.join(research, 'full-audit-camerasrj-2026-09-26.jsonl');
const catalogPath = path.join(root, 'public/data/public-cameras.json');
const timeoutMs = 45000;
const minimumBackoffMs = 300000;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.mkdirSync(imageDir, { recursive: true });

const reviewed = new Set();
for (const file of ['calibration-camerasrj-visual-2026-09-26.json', 'calibration-centro-2026-09-26.json']) {
  const p = path.join(research, file);
  if (fs.existsSync(p)) {
    try { for (const row of JSON.parse(fs.readFileSync(p, 'utf8')).cameras || []) reviewed.add(row.id); } catch { /* Keep capture resumable if a review file is malformed. */ }
  }
}
const auditLatest = new Map();
for (const line of fs.readFileSync(auditPath, 'utf8').split(/\r?\n/).filter(Boolean)) {
  try { const item = JSON.parse(line); auditLatest.set(item.id, item); } catch { /* Ignore a partial final line. */ }
}
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).cameras;
const mapped = new Map(catalog.filter(c => /^camerasrj-\d+$/.test(c.id) && c.access === 'public' && Array.isArray(c.coordinates)).map(c => [c.id, c]));
const captured = new Set();
if (fs.existsSync(output)) for (const line of fs.readFileSync(output, 'utf8').split(/\r?\n/).filter(Boolean)) {
  try { const item = JSON.parse(line); if (item.id && item.status !== 'deferred_rate_limit') captured.add(item.id); } catch { /* Ignore an incomplete tail. */ }
}
const queue = [...auditLatest.values()]
  .filter(a => a.outcome === 'playback_confirmed' && mapped.has(a.id) && !reviewed.has(a.id) && !captured.has(a.id))
  .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
const total = queue.length;
let cursor = 0, tested = 0, available = 0, backoffUntil = 0;
let state = 'starting', currentId = null, lastUpdate = new Date().toISOString();
for (const line of (fs.existsSync(output) ? fs.readFileSync(output, 'utf8').split(/\r?\n/) : []).filter(Boolean)) {
  try { const item = JSON.parse(line); if (item.status === 'image_available') available++; } catch { /* Ignore malformed trailing entry. */ }
}

function writeProgress() {
  lastUpdate = new Date().toISOString();
  fs.writeFileSync(progressPath, JSON.stringify({
    state, pid: process.pid, startedAt, updatedAt: lastUpdate, total, tested,
    remaining: Math.max(0, total - tested), available,
    currentId, queued: Math.max(0, queue.length - cursor),
    backoffUntil: backoffUntil ? new Date(backoffUntil).toISOString() : null,
    output: path.relative(root, output).replaceAll('\\', '/'),
    screenshots: path.relative(root, imageDir).replaceAll('\\', '/'),
  }, null, 2) + '\n');
}
const startedAt = new Date().toISOString();
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
      let sum = 0, nonzero = 0, nonblack = 0;
      for (let i = 0; i < data.length; i += 4) {
        const luma = (data[i] + data[i + 1] + data[i + 2]) / 3;
        sum += luma; if (data[i] + data[i + 1] + data[i + 2] > 0) nonzero++; if (luma > 10) nonblack++;
      }
      pixels = { mean: Math.round(sum / 576 * 100) / 100, nonzero, nonblack };
    } catch (e) { pixels = { error: e.name }; }
  }
  return {
    visibility: document.visibilityState,
    video: video ? {
      width: video.videoWidth, height: video.videoHeight, time: video.currentTime,
      readyState: video.readyState, paused: video.paused,
      frames: video.getVideoPlaybackQuality?.().totalVideoFrames ?? null,
      liveTracks: video.srcObject?.getVideoTracks?.().filter(t => t.readyState === 'live').length || 0,
      pixels,
    } : null,
    error: error && style.display !== 'none' && style.visibility !== 'hidden' ? error.innerText.trim().slice(0, 200) : null,
  };
}
const server = http.createServer((req, res) => {
  const id = /^\/(\d+)$/.exec(req.url || '')?.[1];
  if (!id) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', 'text/html');
  res.end(`<!doctype html><title>Camera capture</title><iframe width="960" height="540" allow="autoplay; fullscreen" referrerpolicy="strict-origin-when-cross-origin" src="https://player.camerasrj.com.br/camera/${id}/"></iframe>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
let browser;
writeProgress();
try {
  browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, protocolTimeout: 10000, timeout: 20000,
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 720 });
  while (cursor < queue.length) {
    if (Date.now() < backoffUntil) {
      state = 'backoff'; currentId = null; writeProgress();
      await sleep(Math.min(10000, backoffUntil - Date.now()));
      continue;
    }
    const audit = queue[cursor++];
    const camera = mapped.get(audit.id);
    const number = camera.id.slice('camerasrj-'.length);
    currentId = camera.id; state = 'capturing'; writeProgress();
    const testStarted = Date.now();
    let rateLimited = false, retryAfterMs = 0, lastSample = null, baseline = null, baselineShot = null;
    const result = {
      id: camera.id, name: camera.name, coordinates: camera.coordinates,
      originPrecision: camera.precision || null, locationSource: camera.locationSource || null,
      priorAuditCheckedAt: audit.checkedAt, checkedAt: new Date().toISOString(),
      source: `https://player.camerasrj.com.br/camera/${number}/`, status: 'image_unavailable',
      method: 'Single foreground Chrome page; live video track, dimensions, advancing time and decoded frames, nonzero canvas pixels; two image samples at least 2.5 seconds apart.',
    };
    const onResponse = response => {
      const u = new URL(response.url());
      if (u.origin === 'https://player.camerasrj.com.br' && response.status() === 429) {
        rateLimited = true;
        retryAfterMs = Math.max(retryAfterMs, Number(response.headers()['retry-after']) * 1000 || 0);
      }
    };
    page.on('response', onResponse);
    try {
      await page.goto(`http://127.0.0.1:${port}/${number}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      while (Date.now() - testStarted < timeoutMs) {
        if (rateLimited) break;
        const frame = page.frames().find(f => f.url().startsWith(`https://player.camerasrj.com.br/camera/${number}/`));
        if (frame) {
          lastSample = await frame.evaluate(inspect).catch(() => null);
          const observedAt = new Date().toISOString();
          const observedAtMs = Date.now();
          const v = lastSample?.video;
          const valid = v?.liveTracks > 0 && v.width >= 64 && v.height >= 36 && v.readyState >= 2 && !v.paused && lastSample.visibility === 'visible' && (v.pixels?.nonzero || 0) > 0;
          if (valid) {
            if (!baseline) {
              baseline = { observedAt, observedAtMs, sample: lastSample };
              baselineShot = await page.screenshot({ type: 'png' });
            } else if (observedAtMs - baseline.observedAtMs >= 2500 && v.frames > baseline.sample.video.frames && v.time > baseline.sample.video.time + 0.5) {
              const secondShot = await page.screenshot({ type: 'png' });
              const baseName = camera.id;
              const firstPath = path.join(imageDir, `${baseName}-1.png`);
              const secondPath = path.join(imageDir, `${baseName}-2.png`);
              fs.writeFileSync(firstPath, baselineShot);
              fs.writeFileSync(secondPath, secondShot);
              result.status = 'image_available';
              result.samples = [
                { observedAt: baseline.observedAt, ...baseline.sample },
                { observedAt, ...lastSample },
              ];
              result.screenshots = [path.relative(root, firstPath).replaceAll('\\', '/'), path.relative(root, secondPath).replaceAll('\\', '/')];
              break;
            }
          } else { baseline = null; baselineShot = null; }
        }
        await sleep(1000);
      }
      if (rateLimited) {
        result.status = 'deferred_rate_limit';
        result.reason = 'HTTP 429 from public player; queued to retry after at least five minutes.';
        backoffUntil = Math.max(backoffUntil, Date.now() + Math.max(minimumBackoffMs, retryAfterMs));
      } else if (!result.samples) {
        result.lastSample = lastSample;
        result.reason = 'No verified nonzero decoded scene with two advancing samples within 45 seconds; this does not establish that the camera is offline.';
      }
    } catch (error) {
      result.status = 'capture_error';
      result.reason = `${error.name}: ${error.message}`.slice(0, 250).replace(/https?:\/\/\S+/g, '[URL]');
      if (rateLimited) backoffUntil = Math.max(backoffUntil, Date.now() + minimumBackoffMs);
    } finally {
      page.off('response', onResponse);
    }
    result.durationMs = Date.now() - testStarted;
    fs.appendFileSync(output, JSON.stringify(result) + '\n');
    if (result.status === 'deferred_rate_limit') {
      queue.push(audit); // retry after shared provider backoff
    } else {
      captured.add(camera.id); tested++;
      if (result.status === 'image_available') available++;
    }
    currentId = null; state = backoffUntil > Date.now() ? 'backoff' : 'running'; writeProgress();
  }
  state = 'complete'; currentId = null; writeProgress();
} catch (error) {
  state = 'interrupted_resumable'; writeProgress();
  console.error(`${error.name}: ${error.message}`); process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  server.close();
}
