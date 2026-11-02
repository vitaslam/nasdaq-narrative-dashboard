import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),output=path.join(root,'_site');
try{await fs.access(output)}catch{console.log('No new data or approved renderer; existing Pages deployment retained.');process.exit(0)}
const paths=await fs.readdir(output);
for(const name of paths)await fs.cp(path.join(output,name),path.join(root,name),{recursive:true});
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
git('add','--',...paths);
if(!git('diff','--cached','--name-only')){console.log('Rendered files unchanged.');process.exit(0)}
git('config','user.name','github-actions[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com');
const release=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8'));
git('commit','-m','Publish dashboard release '+release.release_revision+' (export '+release.data_revision+', Muse '+(release.muse_feed_batch||'none')+')');
// Muse/GPT may update their shared lock between checkout and the generated commit.
// Rebase the generated files over that atomic lock commit before publishing.
git('pull','--rebase','origin','main');
try{git('push','origin','HEAD:main')}catch{
  git('pull','--rebase','origin','main');
  git('push','origin','HEAD:main');
}
// GITHUB_TOKEN commits do not trigger the branch Pages build automatically.
// Request the documented Pages build explicitly, without a browser or a stored PAT.
const repo=process.env.GITHUB_REPOSITORY;if(repo!=='vitaslam/nasdaq-narrative-dashboard')throw Error('Unexpected release destination');
const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+process.env.GH_TOKEN,'X-GitHub-Api-Version':'2022-11-28'};
const endpoint='https://api.github.com/repos/'+repo+'/pages/builds';
const r=await fetch(endpoint,{method:'POST',headers,signal:AbortSignal.timeout(30000)});
if(!r.ok)throw Error('Pages build request failed: '+r.status);
console.log('Pages build requested for data revision '+release.data_revision);
if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,'Public data revision '+release.data_revision+' committed. Pages build requested; view https://vitaslam.github.io/nasdaq-narrative-dashboard/\n');
