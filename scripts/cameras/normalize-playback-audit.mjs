import fs from 'node:fs';
const input=process.argv[2]||'research/cameras/full-audit-camerasrj-2026-09-26.jsonl';
const output=process.argv[3]||'.perf-tools/normalized-camerasrj.json';
const latest=new Map();
for(const line of fs.readFileSync(input,'utf8').split('\n').filter(Boolean)) { try {const r=JSON.parse(line);if(r.outcome!=='deferred_rate_limit') latest.set(r.id,r);} catch{/* Running audit may be appending a final line. */} }
const values=[...latest.values()].map(r=>{
 const outcome=r.outcome==='playback_confirmed'?'playing':r.outcome==='stream_failed'||r.outcome==='decoded_black_frames'?'failed':'inconclusive';
 const reason=r.outcome==='playback_confirmed'?'O vídeo entregou quadros de imagem e avançou no teste em Chrome. A disponibilidade pode mudar.':r.outcome==='decoded_black_frames'?'A fonte entregou vídeo, mas os quadros observados estavam pretos. Não foi confirmada uma imagem útil.':r.outcome==='stream_failed'?'A fonte retornou falha de transmissão no teste. Isso não confirma que a câmera esteja desligada.':r.outcome==='player_blocked'?'O navegador bloqueou a reprodução incorporada da fonte; não foi possível confirmar o vídeo aqui.':r.outcome==='audit_error'?'O teste encontrou uma limitação técnica e não conseguiu confirmar a reprodução.':'O teste não confirmou quadros de vídeo dentro do tempo de observação. A disponibilidade continua incerta.';
 return {id:r.id,playbackCheck:{checkedAt:r.checkedAt,outcome,reason,method:'Chrome em processo isolado: dimensões, tempo, quadros decodificados, track de vídeo e falhas reportadas pela fonte.'}};
});
fs.writeFileSync(output,JSON.stringify(values,null,2)+'\n');console.log(JSON.stringify({records:values.length,output}));
