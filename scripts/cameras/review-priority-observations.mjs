#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {applyReviewedObservations,validateAttemptSet} from './priority-revalidation-core.mjs';
import {cameraPriorityAllowlist} from '../../lib/camera-priority-allowlist.server.mjs';
const argv=new Map(process.argv.slice(2).map(x=>{const [k,...v]=x.split('=');return[k,v.join('=')||true]}));
for(const k of ['--catalog','--observations','--reviewed','--output'])if(!argv.get(k))throw Error(`${k} required`);
const production=resolve(import.meta.dirname,'../../public/data/public-cameras.json');
if(resolve(String(argv.get('--output')))===production)throw Error('refusing to write the production catalog; use a reviewed copy');
const lines=readFileSync(String(argv.get('--observations')),'utf8').split(/\n/).filter(Boolean).map(JSON.parse);
const valid=validateAttemptSet(lines,new Map(cameraPriorityAllowlist.map(x=>[x.id,x])));
const reviewRows=JSON.parse(readFileSync(String(argv.get('--reviewed')),'utf8')),reviewed=new Set(reviewRows.map(x=>`${x.roundId}/${x.id}`));
if(reviewed.size!==reviewRows.length)throw Error('duplicate reviewed key');
const available=new Set(valid.map(x=>`${x.roundId}/${x.id}`));for(const key of reviewed)if(!available.has(key))throw Error(`reviewed key has no observation: ${key}`);
const catalog=JSON.parse(readFileSync(String(argv.get('--catalog')),'utf8'));
const catalogById=new Map(catalog.cameras.map(x=>[x.id,x]));
for(const e of valid.filter(x=>reviewed.has(`${x.roundId}/${x.id}`))){
 const camera=catalogById.get(e.id),expectedOperator=e.operator==='Homes in Rio'?'Homes in Rio':'Não informado pelo catálogo';
 if(!camera||camera.source!==e.source||camera.publisher!==e.publisher||camera.operator!==expectedOperator)throw Error(`reviewed observation identity differs from catalog: ${e.id}`);
}
const result=applyReviewedObservations(catalog,valid,reviewed);
writeFileSync(String(argv.get('--output')),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({observations:valid.length,reviewed:reviewed.size,output:resolve(String(argv.get('--output')))}));
