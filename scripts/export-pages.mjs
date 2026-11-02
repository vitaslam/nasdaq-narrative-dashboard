import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mergeMuseFeed} from './merge-muse-feed.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source='https://nasdaq-narrative-tracker-vj.thatvitaslam.chatgpt.site/api/export';
let data;
if(process.argv.includes('--snapshot'))data=JSON.parse(await fs.readFile(path.join(root,'approved/snapshot.json'),'utf8'));
else {const r=await fetch(source,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('Public data source returned '+r.status);data=await r.json()}
if(data.schema_version!==1||!Number.isInteger(data.revision)||!data.weeks?.[data.active_week]||!Array.isArray(data.calendar))throw Error('Unsupported or incomplete public data; keep the last deployment');
let archive;
try {
  const manifest=JSON.parse(await fs.readFile(path.join(root,'approved/renderer-parts.json'),'utf8'));
  if(manifest.version!==1||!Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.some(name=>!/^[a-z0-9.-]+$/.test(name)))throw Error('Invalid approved renderer parts manifest');
  archive=Buffer.concat(await Promise.all(manifest.parts.map(name=>fs.readFile(path.join(root,'approved',name)))));
  if(createHash('sha256').update(archive).digest('hex')!==manifest.sha256)throw Error('Approved renderer parts failed SHA-256 check');
} catch(error) {
  if(error.code!=='ENOENT')throw error;
  archive=await fs.readFile(path.join(root,'approved/renderer.mjs.gz'));
}
const rendererHash=createHash('sha256').update(archive).digest('hex');
// The public time axis is rendered by the approved shell. Keep this small
// compatibility rule until the next approved renderer bundle includes it.
const shellOverrideCSS="/* Give the weekly timeline its own row so the title and filters never crowd a week card. */\n.history-wrap{max-width:1500px;padding:12px 28px 10px}\n.history-top{display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:center;column-gap:20px;row-gap:9px}\n.history-title{grid-column:1;grid-row:1}\n.history-controls{display:contents}\n.month-filter{grid-column:2;grid-row:1;justify-self:start}\n.week-control{grid-column:1/-1;grid-row:2;width:100%;min-width:0;gap:9px}\n.week-arrow{width:34px;height:49px;font-size:18px}\n.week-tabs{gap:7px;padding:2px 1px 7px}\n.week-tab{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;min-width:145px;min-height:49px;padding:7px 11px;text-align:left;line-height:1.25;border:0;background:#f4f6fa}\n.week-tab:hover{border:0;background:#edf1f8}\n.week-tab[aria-selected=true]{border:0;background:#e9eef9;box-shadow:none}\n.week-tab.is-archived{border:0;background:#f4f6fa}\n.week-tab.is-archived:hover{background:#edf1f8}\n.week-tab.is-archived[aria-selected=true]{background:#e9eef9;box-shadow:none}\n.week-tab-top{display:flex;align-items:center;gap:5px;font-size:12px}\n.week-tab-emoji{font-size:15px;line-height:1}\n.week-tab-qqq{display:block;padding-left:20px;color:#52688a;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}\n.week-tab-qqq small{display:none}\n.history-bottom{margin-top:4px}\n.compare-original{grid-column:2;grid-row:1;justify-self:end}\n@media(max-width:800px){\n .history-wrap{padding:9px 14px 8px}\n .history-top{grid-template-columns:minmax(0,1fr) auto;column-gap:8px;row-gap:7px}\n .history-title h1{font-size:15px}\n .month-filter{display:none}\n .mobile-month{display:block;grid-column:2;grid-row:1;width:75px;min-height:38px;justify-self:end}\n .week-control{gap:5px}\n .week-arrow{width:32px;height:46px;min-height:46px}\n .week-tab{min-width:132px;min-height:46px;padding:6px 9px}\n .week-tab-top{font-size:11px}\n .week-tabs{padding-bottom:5px}\n .compare-original{display:none}\n}\n";
const shellOverrideHash=createHash('sha256').update(shellOverrideCSS).digest('hex');
let previous;try{previous=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8'))}catch{}
let museFeed=null, museHash=null, museStats=null, museBytes=null;
try {
  const bytes=await fs.readFile(path.join(root,'muse-feed.json'));
  execFileSync(process.execPath,[path.join(root,'scripts/check-muse-feed.mjs')],{cwd:root,stdio:'pipe'});
  const candidate=JSON.parse(bytes.toString('utf8'));
  if(candidate.batch_id!=='template'){
    museFeed=candidate;
    museBytes=bytes;
    museHash=createHash('sha256').update(bytes).digest('hex');
  }
} catch(error) {
  console.warn('::warning::Muse feed missing or invalid; continuing with the last approved export. '+String(error.stderr?.toString()||error.message).trim().slice(0,500));
  try {
    const last=await fs.readFile(path.join(root,'muse-last-valid.json'));
    museFeed=JSON.parse(last.toString('utf8'));
    museBytes=last;
    museHash=createHash('sha256').update(last).digest('hex');
    console.warn('::warning::Retaining the previously validated Muse batch '+museFeed.batch_id+'.');
  }catch{}
}
const unchanged=previous?.data_revision===data.revision&&previous?.renderer_sha256===rendererHash&&previous?.muse_feed_sha256===museHash&&previous?.shell_override_sha256===shellOverrideHash;
if(process.argv.includes('--skip-unchanged')&&unchanged){console.log('Export, approved renderer and Muse feed unchanged; no render or deploy needed.');process.exit(0)}
if(museFeed){
  const merged=mergeMuseFeed(data,museFeed);
  data=merged.data;
  museStats=merged.stats;
  for(const warning of merged.warnings)console.warn('::warning::'+warning);
  if(museFeed.week_id!==data.active_week)console.warn('::warning::Muse batch targets '+museFeed.week_id+'; active week is '+data.active_week+'.');
}
const approved=gunzipSync(archive).toString('utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(approved).toString('base64'));
const state={...data,completed_runs:[]};
const env={STATIC_BUILD:true,BUCKET:{get:async key=>key==='dashboard/state.json'?{json:async()=>state,etag:'public-'+data.revision}:null}};
const response=async url=>{const r=await worker.fetch(new Request('https://approved.local'+url),env);if(!r.ok)throw Error('Approved renderer failed '+url+' '+r.status);return r};
const out=path.join(root,'_site');await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const write=async(name,value)=>{const target=path.join(out,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,value)};
const index=await (await response('/api/index')).json();delete index.schedule.id;
await write('api/index.json',JSON.stringify(index));
await write('api/calendar.json',JSON.stringify({revision:data.revision,events:data.calendar.filter(e=>e.iso_date),ongoing:data.calendar.filter(e=>e.ongoing||e.week===0)}));
await write('api/export.json',JSON.stringify(data));
if(museFeed)await write('muse-last-valid.json',museBytes);
let shell=await (await response('/')).text();
shell=shell.replace('allow-scripts allow-same-origin allow-downloads allow-modals','allow-scripts allow-same-origin allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox');
shell=shell.replace("fetch('/api/index'","fetch('./api/index.json'").replace("els.frame.src='/week/'+date","els.frame.src='./weeks/'+date+'.html'");
shell=shell.replace('</head>','<style>'+shellOverrideCSS+'</style></head>');
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
const builtAt=new Date().toISOString();
const releaseRevision=Math.max(previous?.release_revision||0,previous?.data_revision||0,data.revision)+1;
const release={schema_version:1,data_revision:data.revision,release_revision:releaseRevision,active_week:data.active_week,content_updated_at:data.weeks[data.active_week].updated_at,built_at:builtAt,renderer_release:'2026-11-02-v24-nav-qqq-popup',renderer_sha256:rendererHash,shell_override_sha256:shellOverrideHash,muse_feed_batch:museFeed?.batch_id||null,muse_feed_sha256:museHash,muse_merge:museStats};
await write('release.json',JSON.stringify(release,null,2));
let log;try{log=await fs.readFile(path.join(root,'PUBLISH_LOG.md'),'utf8')}catch{log='# 发布日志\n\n构建提交记录；具体上线状态以 GitHub Pages 构建结果为准。\n\n| 北京时间 | 来源 | 批次 / revision | 变更摘要 |\n| --- | --- | --- | --- |\n'}
const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'medium'}).format(new Date(builtAt));
if(previous?.data_revision!==data.revision||previous?.renderer_sha256!==rendererHash||previous?.shell_override_sha256!==shellOverrideHash)log+=`| ${stamp} | GPT | export r${data.revision} | 主体内容/渲染器或时间轴样式更新，发布序号 ${releaseRevision} |\n`;
if(museFeed&&previous?.muse_feed_sha256!==museHash)log+=`| ${stamp} | Muse | ${museFeed.batch_id} | 累计 ${museStats.topics} 话题、${museStats.posts} 帖；剔除 ${museStats.rejected_posts} 条时间冲突帖；行情 ${museStats.bars} 条、波动率 ${museStats.volatility_dates} 日；发布序号 ${releaseRevision} |\n`;
await write('PUBLISH_LOG.md',log);
console.log('Rendered '+index.weeks.length+' weeks; GPT revision '+data.revision+', publication '+releaseRevision+', Muse '+(museFeed?.batch_id||'none'));
