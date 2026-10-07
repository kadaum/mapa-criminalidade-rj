import fs from 'node:fs';
const catalogPath = 'public/data/public-cameras.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const input = process.argv[2];
if (!input) throw Error('Pass a reviewed normalized audit JSON array: [{id, playbackCheck, recording?, youtubeId?}]');
const results = JSON.parse(fs.readFileSync(input,'utf8'));
const byId = new Map(results.map(r=>[r.id,r]));
for (const camera of catalog.cameras) {
 const result = byId.get(camera.id);
 if (!result) continue;
 const check=result.playbackCheck;
 if (!check?.checkedAt || !['playing','failed','inconclusive','restricted','external'].includes(check.outcome) || !check.reason || !check.method) throw Error('Invalid audit result '+camera.id);
 if (camera.playbackCheck?.checkedAt > check.checkedAt) continue;
 camera.playbackCheck=check;
 camera.checkedAt=new Date(check.checkedAt).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
 camera.status=check.outcome==='playing'?'observed':check.outcome==='failed'?'failed':'unverified';
 if (result.recording!==undefined) camera.recording=result.recording;
 if (result.youtubeId) camera.youtubeId=result.youtubeId;
 camera.note=(camera.note||'').replace(/Reprodução não testada[^.]*\.?/gi,'').replace(/Instalação e reprodução ainda não confirmadas\./g,'Instalação não confirmada.').trim();
}
const checks=catalog.cameras.filter(c=>c.playbackCheck);
catalog.playbackAudit={total:catalog.cameras.length,checked:checks.length,complete:checks.length===catalog.cameras.length,updatedAt:checks.reduce((s,c)=>c.playbackCheck.checkedAt>s?c.playbackCheck.checkedAt:s,''),counts:checks.reduce((a,c)=>(a[c.playbackCheck.outcome]=(a[c.playbackCheck.outcome]||0)+1,a),{})};
fs.writeFileSync(catalogPath,JSON.stringify(catalog));
// Regeneration applies this snapshot after the older hand-reviewed patches.
fs.writeFileSync('research/cameras/playback-audit-updates.json',JSON.stringify(checks.map(c=>({id:c.id,status:c.status,checkedAt:c.checkedAt,playbackCheck:c.playbackCheck,note:c.note,...(c.recording!==undefined?{recording:c.recording}:{}),...(c.youtubeId?{youtubeId:c.youtubeId}:{})})),null,2)+'\n');
console.log(JSON.stringify(catalog.playbackAudit));
