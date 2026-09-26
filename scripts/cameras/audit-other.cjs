/* Reproduce from repository root: node scripts/cameras/audit-other.cjs
 * Use --fresh to recheck completed entries. Without it, resumes the existing report.\n * Requires Puppeteer Core in .perf-tools/node_modules and local Google Chrome.
 * Audits catalog public playback; never signs in or bypasses access controls.
 */
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const puppeteer=require(path.resolve('.perf-tools/node_modules/puppeteer-core'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const output='research/cameras/full-audit-other-2026-09-26.json';
const cameras=JSON.parse(fs.readFileSync('public/data/public-cameras.json','utf8')).cameras.filter(c=>c.publisher!=='CamerasRJ');
const cleanUrl=u=>{try{const x=new URL(u);if(x.protocol==='blob:')return 'blob:media';x.search='';return x.href}catch{return u}};
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><iframe width="1000" height="562" allow="autoplay;fullscreen" referrerpolicy="strict-origin-when-cross-origin" src="'+decodeURIComponent(req.url.slice(1))+'"></iframe>')}).listen(3228,'127.0.0.1');
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,protocolTimeout:12000,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const results=!process.argv.includes('--fresh')&&fs.existsSync(output)?JSON.parse(fs.readFileSync(output)).results:[];let cursor=0;
 const save=()=>{const groups=new Map;for(const c of results){const keys=c.youtubeId?['youtube:'+c.youtubeId]:c.observedStreamUrls||[];for(const key of keys){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c.id)}}fs.writeFileSync(output,JSON.stringify({startedAt,updatedAt:new Date().toISOString(),scope:'Every non-CamerasRJ catalog entry; no authentication; external pages tested at their public source, YouTube tested embedded.',total:cameras.length,completed:results.length,method:'Chrome headless fresh context. Two video snapshots 4 seconds apart. Source screenshots retained for visual verification. Restricted entries visited but playback not attempted. HTTP200 alone never counts as working.',results:results.sort((a,b)=>a.id.localeCompare(b.id)),sourceEquivalenceGroups:[...groups].filter(([k,v])=>new Set(v).size>1).map(([stream,ids])=>({stream,ids:[...new Set(ids)],basis:'Exact YouTube ID or exact observed public media path; URL query removed only to omit signed credentials. Requires manual check if query distinguishes camera.'}))},null,2)+'\n')};
 const startedAt=new Date().toISOString();
 async function audit(c){const p=await browser.newPage();await p.setViewport({width:1100,height:760});let media=new Set;let failures=[];p.on('request',r=>{const u=r.url();if(/\.(?:m3u8|mpd)(?:\?|$)/i.test(u))media.add(cleanUrl(u))});p.on('requestfailed',r=>{if(/m3u8|videoplayback|\.mpd/i.test(r.url()))failures.push({url:cleanUrl(r.url()),error:r.failure()?.errorText})});const r={id:c.id,name:c.name,publisher:c.publisher,source:c.source,access:c.access,youtubeId:c.youtubeId||null,checkedAt:new Date().toISOString()};
 try{const target=c.youtubeId?'http://127.0.0.1:3228/'+encodeURIComponent('https://www.youtube-nocookie.com/embed/'+c.youtubeId+'?autoplay=1&mute=1&playsinline=1'):c.watchUrl||c.source;
 const response=await p.goto(target,{waitUntil:'domcontentloaded',timeout:30000});r.httpStatus=response?.status();await sleep(5000);r.sourcePageText=(await p.$eval('body',e=>e.innerText)).slice(0,14000);
 r.frameUrls=p.frames().filter(f=>!/googleads|doubleclick|facebook|twitter|googlesyndication|recaptcha|cookiebot/.test(f.url())).map(f=>cleanUrl(f.url()));
 if(c.access!=='public'){r.result='access_restricted';r.reason='Catalog requires '+c.access+'; public source visited, no sign-in, purchase, or restricted media access attempted.';r.observedStreamUrls=[];}
 else{
 for(const f of p.frames()){if(/doubleclick|googleads/.test(f.url()))continue;try{await f.evaluate(()=>{for(const v of document.querySelectorAll('video')){v.muted=true;v.play().catch(()=>{})}const b=document.querySelector('.vjs-big-play-button,.jw-icon-display,.ytp-large-play-button');if(b&&!document.querySelector('video'))b.click()})}catch{}}
 await p.bringToFront();await sleep(7000);
 const snap=async()=>{const o=[];for(const f of p.frames()){if(/googleads|doubleclick|facebook|twitter|googlesyndication/.test(f.url()))continue;try{o.push(await f.evaluate(()=>({frame:location.origin+location.pathname,text:document.body?.innerText.slice(0,900),videos:[...document.querySelectorAll('video')].map(v=>({time:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:null,ready:v.readyState,paused:v.paused,width:v.videoWidth,height:v.videoHeight,frames:v.getVideoPlaybackQuality().totalVideoFrames,source:v.currentSrc?.startsWith('blob:')?'blob:media':v.currentSrc?.split('?')[0],error:v.error?.message||null})),live:window.ytInitialPlayerResponse?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails||null,playerVideo:window.ytInitialPlayerResponse?.videoDetails?.videoId||null})));}catch{}}return o};
 r.before=await snap();await sleep(4000);r.after=await snap();r.observedStreamUrls=[...media];r.mediaFailures=failures;
 const moving=r.after.some((f,i)=>f.videos.some((v,j)=>v.width>=320&&v.ready>=2&&v.time>(r.before[i]?.videos[j]?.time||0)+2&&v.frames>(r.before[i]?.videos[j]?.frames||0)+5));
 r.result=moving?'video_frames_advanced':'no_playback_confirmed';r.reason=moving?'Video time and decoded frames advanced over4seconds; visual scene and live/replay status still require review.':'No qualifying video advanced in observation window.';
 const screenshot='.perf-tools/audit-other-'+c.id+'.png';await p.screenshot({path:screenshot});r.screenshot=screenshot;
 }
 }catch(e){r.result='audit_error';r.reason=e.message}finally{await p.close()}results.push(r);save();console.log(c.id,r.result)}
 await Promise.all(Array.from({length:1},async()=>{while(cursor<cameras.length){const c=cameras[cursor++];if(!results.some(r=>r.id===c.id))await audit(c)}}));await browser.close();server.close();console.log('DONE',results.length)
})().catch(e=>{console.error(e);process.exit(1)});



