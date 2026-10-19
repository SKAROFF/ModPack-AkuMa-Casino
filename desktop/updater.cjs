const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {createWriteStream} = require('node:fs');
const {Readable} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
async function exists(p) { try { await fs.lstat(p); return true; } catch(e) { if(e.code==='ENOENT') return false; throw e; } }
function safePath(p) {
    if(typeof p!=='string' || p.length>220 || !/^(mods|config|resourcepacks)\//.test(p) || p.split('/').some(s=>!s || s==='.' || s==='..' || /[\\:<>"|?*\x00-\x1f]/.test(s) || /[. ]$/.test(s) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i.test(s))) throw Error('Chemin géré interdit');
    return p;
}
async function noLinks(root,p) {
    let current=path.resolve(root);
    for(const s of ['',...p.split('/')]) {
        current=path.join(current,s);
        if(await exists(current)) { const st=await fs.lstat(current); if(st.isSymbolicLink()) throw Error('Lien symbolique interdit'); }
    }
}
function allowedUrl(url,hosts,dev=false) {
    const u=new URL(url);
    if(u.username || u.password || !(u.protocol==='https:' && hosts.includes(u.hostname)) && !(dev && u.protocol==='http:' && u.hostname==='127.0.0.1')) throw Error('Source de téléchargement interdite');
    return u;
}
async function response(url,hosts,dev,headers={}) {
    for(let n=0;n<6;n++) {
        allowedUrl(url,hosts,dev);
        const r=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(60000)});
        if([301,302,303,307,308].includes(r.status)) { url=new URL(r.headers.get('location'),url).href; continue; }
        if(!r.ok) throw Error(`Distribution indisponible (HTTP ${r.status})`);
        return r;
    }
    throw Error('Trop de redirections');
}
function validate(m) {
    if(m.schema!==1 || !/^\d+\.\d+\.\d+([-.][a-zA-Z0-9.]+)?$/.test(m.version) || m.minecraft!=='1.21.1' || !/^\d+\.\d+\.\d+$/.test(m.fabric) || !Array.isArray(m.files) || m.files.length>2000) throw Error('Manifeste incompatible');
    const seen=new Set();
    for(const f of m.files) { safePath(f.path); const k=f.path.toLowerCase(); if(seen.has(k)) throw Error('Chemin dupliqué'); seen.add(k); if(!/^[a-f0-9]{64}$/.test(f.sha256) || !Number.isSafeInteger(f.size) || f.size<0 || f.size>2**31 || !['managed','preserve'].includes(f.policy)) throw Error('Fichier invalide'); }
    return m;
}
async function feed(config) {
    if(!config.feedUrl || !config.publicKey) throw Error('Distribution à configurer par l’administrateur');
    const r=await response(config.feedUrl,config.allowedHosts);
    const body=await r.text(); if(body.length>4e6) throw Error('Manifeste trop volumineux');
    return verifyEnvelope(JSON.parse(body),config.publicKey);
}
function verifyEnvelope(envelope,publicKey) {
    const bytes=Buffer.from(envelope.payload,'base64');
    if(!crypto.verify(null,bytes,publicKey,Buffer.from(envelope.signature,'base64'))) throw Error('Signature de publication invalide');
    return validate(JSON.parse(bytes));
}
async function download(f,target,hosts,dev=false) {
    await fs.mkdir(path.dirname(target),{recursive:true});
    for(let retry=0;retry<3;retry++) {
        try {
            let offset=await exists(target)?(await fs.stat(target)).size:0;
            if(offset===f.size && hash(await fs.readFile(target))===f.sha256) return;
            if(offset>=f.size) { await fs.writeFile(target,''); offset=0; }
            const r=await response(f.url,hosts,dev,offset?{Range:`bytes=${offset}-`}:{});
            const append=offset>0 && r.status===206;
            if(append && !r.headers.get('content-range')?.startsWith(`bytes ${offset}-`)) throw Error('Reprise invalide');
            let received=append?offset:0;
            const stream=Readable.fromWeb(r.body);
            stream.on('data',b=>{ received+=b.length; if(received>f.size) stream.destroy(Error('Taille excessive')); });
            await pipeline(stream,createWriteStream(target,{flags:append?'a':'w'}));
            if((await fs.stat(target)).size!==f.size || hash(await fs.readFile(target))!==f.sha256) { await fs.writeFile(target,''); throw Error('Empreinte SHA-256 incorrecte'); }
            return;
        } catch(e) { if(retry===2) throw e; }
    }
}
async function readJson(p,fallback) { try{return JSON.parse(await fs.readFile(p,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;} }
async function atomic(p,data) { await fs.mkdir(path.dirname(p),{recursive:true}); await fs.writeFile(p+'.tmp',JSON.stringify(data,null,2)); await fs.rename(p+'.tmp',p); }
async function recover(root) {
    const meta=path.join(root,'.akuma'), journal=await readJson(path.join(meta,'journal.json'),null);
    if(!journal) return;
    for(const item of [...journal.items].reverse()) {
        safePath(item.path); await noLinks(root,item.path);
        const dest=path.join(root,item.path), backup=path.join(meta,'backup',item.path);
        if(await exists(backup)) { await fs.mkdir(path.dirname(dest),{recursive:true}); await fs.copyFile(backup,dest); }
        else if(!item.existed && await exists(dest)) await fs.unlink(dest);
    }
    await atomic(path.join(meta,'state.json'),journal.previous);
    await fs.unlink(path.join(meta,'journal.json'));
}
async function sync(root,manifest,config,onProgress=()=>{}) {
    validate(manifest); await fs.mkdir(root,{recursive:true}); await noLinks(root,'.akuma');
    const meta=path.join(root,'.akuma'); await fs.mkdir(meta,{recursive:true});
    const lock=await fs.open(path.join(meta,'lock'),'wx').catch(()=>{throw Error('Installation verrouillée. Fermez les autres launchers ; après un arrêt brutal, utilisez la procédure de récupération.');});
    try {
        await recover(root);
        const previous=await readJson(path.join(meta,'state.json'),{version:null,files:[]});
        previous.files.forEach(f=>safePath(f.path));
        const old=new Map(previous.files.map(f=>[f.path,f])); const changes=[], conflicts=[];
        for(const [i,f] of manifest.files.entries()) {
            await noLinks(root,f.path); const dest=path.join(root,f.path);
            const present=await exists(dest), local=present?hash(await fs.readFile(dest)):null;
            if(local===f.sha256) continue;
            const staged=path.join(meta,'cache',f.sha256);
            await download(f,staged,config.allowedHosts,config.dev);
            onProgress({text:`Vérification ${i+1}/${manifest.files.length}`,percent:Math.round((i+1)/manifest.files.length*100)});
            if(present && (!old.has(f.path) || f.policy==='preserve' && local!==old.get(f.path).sha256)) {
                const proposal=path.join(meta,'conflicts',manifest.version,f.path); await fs.mkdir(path.dirname(proposal),{recursive:true}); await fs.copyFile(staged,proposal); conflicts.push(f.path);
                if(f.policy!=='preserve') throw Error(`Fichier personnel en conflit : ${f.path}. Proposition sauvegardée.`);
            } else changes.push({path:f.path,staged,existed:present});
        }
        for(const f of previous.files) if(!manifest.files.some(n=>n.path===f.path)) {
            await noLinks(root,f.path); const dest=path.join(root,f.path);
            if(await exists(dest) && hash(await fs.readFile(dest))===f.sha256) changes.push({path:f.path,existed:true,remove:true});
        }
        // All network operations finish before the transaction starts.
        if(changes.length===0 && previous.version===manifest.version) return {version:manifest.version,changed:0,conflicts};
        const backup=path.join(meta,'backup');
        await fs.rm(backup,{recursive:true,force:true});
        for(const item of changes) if(item.existed) { const b=path.join(backup,item.path); await fs.mkdir(path.dirname(b),{recursive:true}); await fs.copyFile(path.join(root,item.path),b); }
        const journal={previous,items:changes.map(({path,existed})=>({path,existed}))};
        await atomic(path.join(meta,'journal.json'),journal);
        try {
            for(const item of changes) { const dest=path.join(root,item.path); await noLinks(root,item.path); await fs.mkdir(path.dirname(dest),{recursive:true}); if(item.remove) await fs.unlink(dest); else {await fs.copyFile(item.staged,dest+'.akuma-new'); await fs.rename(dest+'.akuma-new',dest);} }
            await atomic(path.join(meta,'state.json'),{...manifest,conflicts});
            await atomic(path.join(meta,'rollback.json'),journal);
            await fs.unlink(path.join(meta,'journal.json'));
        } catch(e) { await recover(root); throw e; }
        return {version:manifest.version,changed:changes.length,conflicts};
    } finally { await lock.close(); await fs.unlink(path.join(meta,'lock')); }
}
async function rollback(root) {
    const meta=path.join(root,'.akuma'); const journal=await readJson(path.join(meta,'rollback.json'),null);
    if(!journal)throw Error('Aucune version précédente');
    await atomic(path.join(meta,'journal.json'),journal); await recover(root); await fs.unlink(path.join(meta,'rollback.json'));
}
module.exports={hash,safePath,allowedUrl,validate,verifyEnvelope,feed,sync,rollback,download,response,atomic};
