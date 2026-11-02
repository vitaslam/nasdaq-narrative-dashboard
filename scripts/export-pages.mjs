import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source='https://nasdaq-narrative-tracker-vj.thatvitaslam.chatgpt.site/api/export';
let data;
if(process.argv.includes('--snapshot'))data=JSON.parse(await fs.readFile(path.join(root,'approved/snapshot.json'),'utf8'));
else {const r=await fetch(source,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('Public data source returned '+r.status);data=await r.json()}
if(data.schema_version!==1||!Number.isInteger(data.revision)||!data.weeks?.[data.active_week]||!Array.isArray(data.calendar))throw Error('Unsupported or incomplete public data; keep the last deployment');
const archive=await fs.readFile(path.join(root,'approved/renderer.mjs.gz'));
const rendererHash=createHash('sha256').update(archive).digest('hex');
if(process.argv.includes('--skip-unchanged')){let previous;try{previous=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8'))}catch{}if(previous?.data_revision===data.revision&&previous?.renderer_sha256===rendererHash){console.log('Data and approved renderer unchanged; no render or deploy needed.');process.exit(0)}}
const approved=gunzipSync(archive).toString('utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(approved).toString('base64'));
const state={...data,completed_runs:[]};
const env={BUCKET:{get:async key=>key==='dashboard/state.json'?{json:async()=>state,etag:'public-'+data.revision}:null}};
const response=async url=>{const r=await worker.fetch(new Request('https://approved.local'+url),env);if(!r.ok)throw Error('Approved renderer failed '+url+' '+r.status);return r};
const out=path.join(root,'_site');await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const write=async(name,value)=>{const target=path.join(out,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,value)};
const index=await (await response('/api/index')).json();delete index.schedule.id;
await write('api/index.json',JSON.stringify(index));
await write('api/calendar.json',JSON.stringify({revision:data.revision,events:data.calendar.filter(e=>e.iso_date),ongoing:data.calendar.filter(e=>e.ongoing||e.week===0)}));
let shell=await (await response('/')).text();
shell=shell.replace("fetch('/api/index'","fetch('./api/index.json'").replace("els.frame.src='/week/'+date","els.frame.src='./weeks/'+date+'.html'");
await write('index.html',shell);await write('.nojekyll','');
const assets=new Set(['/dashboard-priority.js','/shared-calendar.js','/shared-calendar.css','/dashboard-enhancements.js','/dashboard-enhancements.css']);
for(const week of index.weeks){
 let html=await (await response('/week/'+week.date)).text();
 for(const m of html.matchAll(/(?:src|href)="(\/assets\/[^"<>]+)"/g))assets.add(m[1]);
 for(const m of html.matchAll(/"asset_url":"(\/assets\/[^"<>]+)"/g))assets.add(m[1]);
 html=html.replace(/((?:src|href)=["'])\/(?!\/)/g,'$1../').replaceAll('"asset_url":"/assets/','"asset_url":"../assets/').replaceAll('"avatar_url":"/assets/','"avatar_url":"../assets/');
 await write('weeks/'+week.date+'.html',html);
}
for(const asset of assets){const r=await response(asset);let value;if(asset.endsWith('.js')){value=await r.text();if(asset==='/shared-calendar.js')value=value.replace('fetch(`/api/calendar?from=${start}&to=${end}`','fetch(`../api/calendar.json`')}else value=Buffer.from(await r.arrayBuffer());await write(asset.slice(1),value)}
await write('release.json',JSON.stringify({schema_version:1,data_revision:data.revision,active_week:data.active_week,content_updated_at:data.weeks[data.active_week].updated_at,built_at:new Date().toISOString(),renderer_release:'2026-11-02-readability-importance-ma-scores',renderer_sha256:rendererHash},null,2));
console.log('Rendered '+index.weeks.length+' weeks using approved code; public data revision '+data.revision);
