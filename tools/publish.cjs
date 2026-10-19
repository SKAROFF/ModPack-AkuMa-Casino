const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {hash,validate,safePath,atomic}=require('../desktop/updater.cjs');
async function publish(source,dest,settings,key) {
    const files=[];
    async function walk(dir,rel='') {
        for(const entry of await fs.readdir(dir,{withFileTypes:true})) {
            const p=rel?`${rel}/${entry.name}`:entry.name;
            if(entry.isSymbolicLink())throw Error('Liens interdits');
            if(entry.isDirectory())await walk(path.join(dir,entry.name),p);
            else {
                safePath(p); const right=settings.rights[p];
                if(!right || !right.evidence || !['redistribute','authorized-url'].includes(right.mode))throw Error(`Droits de distribution à valider : ${p}`);
                const bytes=await fs.readFile(path.join(dir,entry.name)),sha256=hash(bytes);
                const f={path:p,sha256,size:bytes.length,policy:p.startsWith('config/')?'preserve':'managed',required:true,dependencies:right.dependencies||[],license:right.license||'Private AkuMa',evidence:right.evidence};
                if(right.mode==='authorized-url')f.url=right.url;
                else { await fs.mkdir(path.join(dest,'objects'),{recursive:true}); await fs.writeFile(path.join(dest,'objects',sha256),bytes); f.url=`${settings.baseUrl.replace(/\/$/,'')}/${settings.assetLayout==='github-release'?'':'objects/'}${sha256}`; }
                files.push(f);
            }
        }
    }
    await walk(source);
    const manifest=validate({schema:1,version:settings.version,minecraft:'1.21.1',fabric:settings.fabric,created:new Date().toISOString(),files});
    const payload=Buffer.from(JSON.stringify(manifest));
    const envelope={payload:payload.toString('base64'),signature:crypto.sign(null,payload,key).toString('base64')};
    const versionDir=path.join(dest,'versions',manifest.version); await fs.mkdir(versionDir,{recursive:true});
    try { await fs.writeFile(path.join(versionDir,'manifest.json'),JSON.stringify(envelope,null,2),{flag:'wx'}); } catch(e) {if(e.code==='EEXIST')throw Error('Version déjà publiée : utilisez un nouveau numéro');throw e;}
    await atomic(path.join(dest,'latest.json'),envelope);
    return manifest;
}
if(require.main===module)(async()=>{
    const [command,...args]=process.argv.slice(2);
    if(command==='keygen') {const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519'); await fs.mkdir(args[0],{recursive:true});await fs.writeFile(path.join(args[0],'private.pem'),privateKey.export({type:'pkcs8',format:'pem'}),{flag:'wx',mode:0o600});await fs.writeFile(path.join(args[0],'public.pem'),publicKey.export({type:'spki',format:'pem'}));console.log('Clé privée créée : conservez-la hors des fichiers distribués.');}
    else if(command==='build') {const [src,dst,config,key]=args;const result=await publish(src,dst,JSON.parse(await fs.readFile(config)),await fs.readFile(key));console.log(`Version ${result.version} préparée : ${result.files.length} fichiers. Téléversez les objets et la version avant latest.json.`);}
    else if(command==='launcher') {const [exe,version,url,out,key]=args;if(!require('semver').valid(version)||!/^https:\/\/.+\.exe$/.test(url))throw Error('Version ou URL invalide');const bytes=await fs.readFile(exe),payload=Buffer.from(JSON.stringify({appId:'fr.akuma.launcher',version,url,size:bytes.length,sha256:hash(bytes)}));await atomic(out,{payload:payload.toString('base64'),signature:crypto.sign(null,payload,await fs.readFile(key)).toString('base64')});console.log('Manifeste de mise à jour du launcher signé.');}
    else if(command==='rollback') {const [dst,version]=args;if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Version invalide');const envelope=JSON.parse(await fs.readFile(path.join(dst,'versions',version,'manifest.json')));await atomic(path.join(dst,'latest.json'),envelope);console.log('Pointeur restauré ; téléversez latest.json.');}
    else throw Error('Usage: keygen DOSSIER | build SOURCE SORTIE CONFIG CLE | rollback SORTIE VERSION');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={publish};
