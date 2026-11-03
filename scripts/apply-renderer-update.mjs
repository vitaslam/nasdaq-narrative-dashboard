import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Keep layout changes readable in Git. The published base supplies the untouched archives and assets.
export async function applyRendererUpdate(base, patchFile, expectedHash){
 const prefix='const ASSETS=', boundary=base.indexOf(';\n');
 if(!base.startsWith(prefix)||boundary<0)throw Error('Unsupported renderer base');
 const assets=JSON.parse(base.slice(prefix.length,boundary));
 const bindings=/(<script[^>]*id="live-bindings"[^>]*>)([\s\S]*?)(<\/script>)/;
 const live=assets.template.match(bindings);
 if(!live)throw Error('Approved template lacks live bindings');
 const fields={'dashboard-enhancements.js':'enhancementJS','dashboard-enhancements.css':'enhancementCSS','UPDATER.md':'instructions','DAILY_UPDATE.md':'dailyInstructions'};
 const files={'runtime.js':base.slice(boundary+2),'live-week.js':live[2],'mood-daily-review.json':JSON.stringify(assets.moodDailyReview,null,2)+'\n'};
 for(const [file,key] of Object.entries(fields))files[file]=assets[key];
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'dashboard-renderer-'));
 try{
  for(const [file,value] of Object.entries(files))await fs.writeFile(path.join(directory,file),value);
  execFileSync('git',['apply','--no-index','--whitespace=nowarn',patchFile],{cwd:directory,stdio:'pipe'});
  const read=file=>fs.readFile(path.join(directory,file),'utf8');
  for(const [file,key] of Object.entries(fields))assets[key]=await read(file);
  const updatedLive=await read('live-week.js');
  assets.template=assets.template.replace(bindings,(_,open,body,close)=>open+updatedLive+close);
  assets.moodDailyReview=JSON.parse(await read('mood-daily-review.json'));
  const renderer=prefix+JSON.stringify(assets)+';\n'+await read('runtime.js');
  if(createHash('sha256').update(renderer).digest('hex')!==expectedHash)throw Error('Rebuilt renderer failed SHA-256 check');
  return renderer;
 }finally{await fs.rm(directory,{force:true,recursive:true})}
}
