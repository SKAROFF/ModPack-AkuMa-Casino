const fs=require('node:fs/promises'),path=require('node:path');
const {RELEASE}=require('../desktop/prism.cjs');
const {download}=require('../desktop/updater.cjs');
(async()=>{
 const target=path.resolve('bundled-engine',`Prism-${RELEASE.version}.zip`);
 await download(RELEASE,target,['github.com','release-assets.githubusercontent.com']);
 console.log('Archive officielle vérifiée pour la distribution AkuMa : '+target);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
