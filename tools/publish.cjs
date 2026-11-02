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
    const manifest=validate({schema:1,version:settings.version,minecraft:'1.21.1',...(settings.neoforge?{neoforge:settings.neoforge}:{fabric:settings.fabric}),...(settings.options?{options:settings.options}:{}),created:new Date().toISOString(),files});
    const payload=Buffer.from(JSON.stringify(manifest));
    const envelope={payload:payload.toString('base64'),signature:crypto.sign(null,payload,key).toString('base64')};
    const versionDir=path.join(dest,'versions',manifest.version); await fs.mkdir(versionDir,{recursive:true});
    try { await fs.writeFile(path.join(versionDir,'manifest.json'),JSON.stringify(envelope,null,2),{flag:'wx'}); } catch(e) {if(e.code==='EEXIST')throw Error('Version déjà publiée : utilisez un nouveau numéro');throw e;}
    await atomic(path.join(dest,'latest.json'),envelope);
    return manifest;
}
// Private Backblaze B2 bucket: the key file stays outside every repository (keyID / applicationKey lines).
async function b2Auth(keyFile){
    const text=await fs.readFile(keyFile,'utf8'),get=name=>(new RegExp(`^\\s*${name}\\s*[:=]\\s*(\\S+)`,'m').exec(text)||[])[1];
    if(!get('keyID')||!get('applicationKey'))throw Error('Fichier de clé B2 incomplet (keyID, applicationKey)');
    const r=await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account',{headers:{authorization:'Basic '+Buffer.from(`${get('keyID')}:${get('applicationKey')}`).toString('base64')}});
    if(!r.ok)throw Error(`Connexion B2 refusée (HTTP ${r.status})`);
    const a=await r.json(),s=a.apiInfo.storageApi;
    if(!s.bucketId)throw Error('La clé B2 doit être limitée au bucket du modpack');
    const call=async(name,body)=>{const res=await fetch(`${s.apiUrl}/b2api/v3/${name}`,{method:'POST',headers:{authorization:a.authorizationToken},body:JSON.stringify(body)});if(!res.ok)throw Error(`B2 ${name} : HTTP ${res.status} ${await res.text()}`);return res.json();};
    return {bucketId:s.bucketId,bucketName:s.bucketName,call};
}
async function b2Upload(dist,prefix,keyFile){
    if(prefix&&!/^[a-z0-9-]+\/$/.test(prefix))throw Error('Préfixe invalide (ex. dev/)');
    const b2=await b2Auth(keyFile),existing=new Set();
    for(let start=null;;){const page=await b2.call('b2_list_file_names',{bucketId:b2.bucketId,prefix,startFileName:start,maxFileCount:1000});page.files.forEach(f=>existing.add(f.fileName));if(!page.nextFileName)break;start=page.nextFileName;}
    const files=[];
    for(const name of await fs.readdir(path.join(dist,'objects')).catch(()=>[]))files.push(`objects/${name}`);
    for(const v of await fs.readdir(path.join(dist,'versions')).catch(()=>[]))files.push(`versions/${v}/manifest.json`);
    let sent=0;
    // latest.json goes last so players never see a version whose objects are missing.
    for(const rel of [...files,'latest.json']){
        const name=prefix+rel;if(rel!=='latest.json'&&existing.has(name))continue;
        const bytes=await fs.readFile(path.join(dist,rel));let res;
        // B2 answers 503 when an upload pod is busy: the documented fix is a fresh upload URL.
        for(let attempt=1;;attempt++){
            const up=await b2.call('b2_get_upload_url',{bucketId:b2.bucketId});
            res=await fetch(up.uploadUrl,{method:'POST',headers:{authorization:up.authorizationToken,'X-Bz-File-Name':encodeURIComponent(name),'Content-Type':rel.endsWith('.json')?'application/json':'application/octet-stream','X-Bz-Content-Sha1':crypto.createHash('sha1').update(bytes).digest('hex')},body:bytes}).catch(e=>({ok:false,status:e.message}));
            if(res.ok||attempt===5||![408,429,500,503,'fetch failed'].includes(res.status))break;
            await new Promise(r=>setTimeout(r,attempt*2000));
        }
        if(!res.ok)throw Error(`Envoi de ${name} refusé : HTTP ${res.status}`);
        sent++;console.log(`Envoyé : ${name} (${bytes.length} octets)`);
    }
    return sent;
}
if(require.main===module)(async()=>{
    const [command,...args]=process.argv.slice(2);
    if(command==='keygen') {const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519'); await fs.mkdir(args[0],{recursive:true});await fs.writeFile(path.join(args[0],'private.pem'),privateKey.export({type:'pkcs8',format:'pem'}),{flag:'wx',mode:0o600});await fs.writeFile(path.join(args[0],'public.pem'),publicKey.export({type:'spki',format:'pem'}));console.log('Clé privée créée : conservez-la hors des fichiers distribués.');}
    else if(command==='build') {const [src,dst,config,key]=args;const result=await publish(src,dst,JSON.parse(await fs.readFile(config)),await fs.readFile(key));console.log(`Version ${result.version} préparée : ${result.files.length} fichiers. Téléversez les objets et la version avant latest.json.`);}
    else if(command==='launcher') {const [exe,version,url,out,key,dmg,dmgUrl]=args;if(!require('semver').valid(version)||!/^https:\/\/.+\.exe$/.test(url)||(dmg&&!/^https:\/\/.+\.dmg$/.test(dmgUrl||'')))throw Error('Version ou URL invalide');const bytes=await fs.readFile(exe),macBytes=dmg&&await fs.readFile(dmg),payload=Buffer.from(JSON.stringify({appId:'fr.akuma.launcher',version,url,size:bytes.length,sha256:hash(bytes),...(dmg?{mac:{url:dmgUrl,size:macBytes.length,sha256:hash(macBytes)}}:{})}));await atomic(out,{payload:payload.toString('base64'),signature:crypto.sign(null,payload,await fs.readFile(key)).toString('base64')});console.log('Manifeste de mise à jour du launcher signé.');}
    else if(command==='rollback') {const [dst,version]=args;if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Version invalide');const envelope=JSON.parse(await fs.readFile(path.join(dst,'versions',version,'manifest.json')));await atomic(path.join(dst,'latest.json'),envelope);console.log('Pointeur restauré ; téléversez latest.json.');}
    else if(command==='upload') {const [dst,prefix='']=args;const keyFile=process.env.AKUMA_B2_KEY_FILE||path.join(require('node:os').homedir(),'.b2','publication-akuma.txt');console.log(`${await b2Upload(dst,prefix,keyFile)} fichier(s) envoyé(s) dans le bucket privé.`);}
    else throw Error('Usage: keygen DOSSIER | build SOURCE SORTIE CONFIG CLE | upload SORTIE [PREFIXE] | rollback SORTIE VERSION');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={publish};
