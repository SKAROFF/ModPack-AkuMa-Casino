// Turns a CurseForge client export (manifest.json + overrides/) into a source folder and settings for publish.cjs.
// Public mods keep their official download (CurseForge, Modrinth, or a URL listed in SOURCES); every other file
// goes to the private bucket. Each official URL is downloaded once and must match the local bytes exactly.
// Usage: node tools/import-curseforge.cjs PACK.zip VERSION OUT_DIR [SOURCES.json]
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),AdmZip=require('adm-zip');
const {safePath}=require('../desktop/updater.cjs');
const sha=(algo,b)=>crypto.createHash(algo).update(b).digest('hex');
const ua={'user-agent':'SKAROFF/akuma-launcher'};
async function get(url){const r=await fetch(url,{headers:ua});if(!r.ok)throw Error(`${url} : HTTP ${r.status}`);return r;}
async function main([zipFile,version,out,sourcesFile]){
    if(!zipFile||!version||!out)throw Error('Usage: import-curseforge.cjs PACK.zip VERSION OUT_DIR [SOURCES.json]');
    const zip=new AdmZip(zipFile),cf=JSON.parse(zip.readAsText('manifest.json'));
    const loader=cf.minecraft.modLoaders.find(l=>l.primary)?.id||'';
    if(cf.minecraft.version!=='1.21.1'||!/^neoforge-/.test(loader))throw Error(`Pack non pris en charge : ${cf.minecraft.version} ${loader}`);
    const sources=sourcesFile?JSON.parse(await fs.readFile(sourcesFile,'utf8')):{};
    const src=path.join(out,'src');await fs.rm(src,{recursive:true,force:true});
    const rights={},official=[];
    for(const e of zip.getEntries()){
        if(e.isDirectory||!e.entryName.startsWith('overrides/'))continue;
        const rel=e.entryName.slice('overrides/'.length);
        if(!/^(mods|config|resourcepacks)\//.test(rel))continue; // options.txt becomes manifest options; servers.dat is replaced by the launcher's direct join
        safePath(rel);await fs.mkdir(path.dirname(path.join(src,rel)),{recursive:true});await fs.writeFile(path.join(src,rel),e.getData());
        rights[rel]={mode:'redistribute',license:'Private AkuMa',evidence:'Fichier fourni par SKAROFF (propriétaire AkuMa) ; stockage privé réservé aux comptes AkuMa'};
        if(rel.startsWith('mods/'))official.push(rel);
    }
    for(const f of cf.files){
        const d=(await (await get(`https://www.curseforge.com/api/v1/mods/${f.projectID}/files/${f.fileID}`)).json()).data;
        const rel=`mods/${d.fileName}`,url=`https://edge.forgecdn.net/files/${Math.floor(f.fileID/1000)}/${f.fileID%1000}/${encodeURIComponent(d.fileName)}`;
        console.log(`CurseForge ${d.fileName} (${(d.fileLength/1e6).toFixed(1)} Mo)`);
        const bytes=Buffer.from(await (await get(url)).arrayBuffer());
        if(bytes.length!==d.fileLength)throw Error(`Taille inattendue : ${d.fileName}`);
        await fs.mkdir(path.join(src,'mods'),{recursive:true});await fs.writeFile(path.join(src,rel),bytes);
        rights[rel]={mode:'authorized-url',url,license:'CurseForge',evidence:`CurseForge projet ${f.projectID}, fichier ${f.fileID}`};
    }
    for(const rel of official){
        const bytes=await fs.readFile(path.join(src,rel)),name=path.posix.basename(rel);
        let url=sources[name],evidence=url&&'Source officielle listée dans le fichier des sources';
        if(!url){const r=await fetch(`https://api.modrinth.com/v2/version_file/${sha('sha1',bytes)}?algorithm=sha1`,{headers:ua});
            if(r.ok){const v=await r.json();url=v.files.find(x=>x.hashes.sha1===sha('sha1',bytes))?.url;evidence=`Modrinth projet ${v.project_id}, version ${v.id}`;}}
        if(!url){console.log(`Privé      ${name}`);continue;}
        if(sha('sha256',Buffer.from(await (await get(url)).arrayBuffer()))!==sha('sha256',bytes))throw Error(`La source officielle de ${name} ne correspond pas au fichier du pack`);
        rights[rel]={mode:'authorized-url',url,license:'Licence de l’auteur',evidence};console.log(`Officiel   ${name}`);
    }
    const options={};
    try{const text=zip.readAsText('overrides/options.txt');const p=/^resourcePacks:(\[.*\])$/m.exec(text),l=/^lang:(\S+)$/m.exec(text);
        if(p)options.resourcePacks=JSON.parse(p[1]);if(l)options.lang=l[1];}catch{}
    const settings={version,neoforge:loader.slice('neoforge-'.length),baseUrl:'https://f003.backblazeb2.com/file/AkumaModpack/',options,rights};
    await fs.writeFile(path.join(out,'settings.json'),JSON.stringify(settings,null,2));
    console.log(`${Object.keys(rights).length} fichiers ; NeoForge ${settings.neoforge} ; options ${JSON.stringify(options)}`);
}
main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
