const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
    const audit=JSON.parse(await fs.readFile('reports/modpack-audit.json','utf8')),results=[];
    for(const mod of audit.mods){
        const bytes=await fs.readFile(path.join(audit.instance,'mods',mod.file)),sha1=crypto.createHash('sha1').update(bytes).digest('hex');
        const record={file:mod.file,sha1,sha256:mod.sha256};
        try{
            const r=await fetch(`https://api.modrinth.com/v2/version_file/${sha1}`,{headers:{'User-Agent':'AkuMaLauncher/0.1.0 (local modpack audit)'},signal:AbortSignal.timeout(20000)});
            if(r.ok){const v=await r.json(),p=await (await fetch(`https://api.modrinth.com/v2/project/${v.project_id}`)).json();const f=v.files.find(f=>f.hashes.sha1===sha1);Object.assign(record,{source:'Modrinth',projectId:v.project_id,project:p.title,license:p.license,clientSide:p.client_side,serverSide:p.server_side,version:v.version_number,gameVersions:v.game_versions,url:f?.url,projectUrl:`https://modrinth.com/mod/${p.slug}`});}
            else if(mod.distributionAllowed&&mod.url){const check=await fetch(mod.url,{method:'HEAD',signal:AbortSignal.timeout(20000)});Object.assign(record,{source:'CurseForge metadata',url:mod.url,reachable:check.ok,distributionAllowed:true,license:mod.license,projectId:mod.curseforgeProject});}
            else Object.assign(record,{source:'unresolved',reason:mod.distributionAllowed===false?'CurseForge third-party distribution disabled':'No authorized source verified'});
        }catch(e){record.error=e.message;}
        results.push(record);
    }
    await fs.writeFile('reports/authorized-sources.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({file:r.file,source:r.source,client:r.clientSide,license:r.license?.id||r.license,error:r.error})),null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
