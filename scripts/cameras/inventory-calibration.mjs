import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync('public/data/public-cameras.json','utf8')).cameras;
const playback=new Map();
const file='research/cameras/full-audit-camerasrj-2026-09-26.jsonl';
if(fs.existsSync(file))for(const line of fs.readFileSync(file,'utf8').split('\n').filter(Boolean)){try{const r=JSON.parse(line);if(r.outcome!=='deferred_rate_limit')playback.set(r.id,r);}catch{}}
const cameras=catalog.filter(c=>c.coordinates&&c.publisher==='CamerasRJ').map(c=>{
 const result=playback.get(c.id);
 return {id:c.id,name:c.name,coordinates:c.coordinates,precision:c.precision,locationSource:c.locationSource,imageSource:c.watchUrl||c.source,imageCheck:result?{checkedAt:result.checkedAt,outcome:result.outcome}:'pending',calibrationStatus:result?.outcome==='playback_confirmed'?'needs_visual_calibration':result?'image_unavailable':'pending_image_check',coverage:null,reason:'A coordenada é uma referência de cruzamento ou endereço; o catálogo não confirma a posição do equipamento, a direção da lente nem a abertura. Não atribuir orientação pela coincidência de endereços.'};
});
const report={updatedAt:new Date().toISOString(),total:cameras.length,counts:cameras.reduce((a,c)=>(a[c.calibrationStatus]=(a[c.calibrationStatus]||0)+1,a),{}),method:'Inventory of every mapped CamerasRJ reference, matched by exact ID to decoded-playback audit; no invented direction, FOV or range.',cameras};
fs.writeFileSync('research/cameras/calibration-camerasrj-inventory-2026-09-26.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({total:report.total,counts:report.counts}));
