import {spawnSync} from 'node:child_process';
// Wrangler provisions/reuses the named D1 binding; migrations are idempotent.
// Without FAMILY_PASSWORD the deployed Worker returns 503 and serves no game data.
for(const args of [['deploy'],['d1','migrations','apply','DB','--remote']]){
 const result=spawnSync(process.execPath,['--use-env-proxy','node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 if(result.status!==0)process.exit(result.status||1);
}
console.log('Deployment and database migrations finished. Set FAMILY_PASSWORD as a Cloudflare Worker secret (12+ characters) before sharing the URL.');
