const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const {publish}=require('./publish.cjs'),{sync,hash,verifyEnvelope}=require('../desktop/updater.cjs');
(async()=>{
    await fs.mkdir(path.resolve('qa'),{recursive:true});const base=await fs.mkdtemp(path.join(path.resolve('qa'),'real-pack-')),source=path.resolve('private-pack'),dist=path.join(base,'distribution'),game=path.join(base,'instance');
    const cfg=JSON.parse(await fs.readFile('reports/publication-candidate.json','utf8'));
    const server=http.createServer(async(req,res)=>{try{res.end(await fs.readFile(path.join(dist,req.url)));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
    // Private local integration test: never published, and no persistent signing key.
    for(const r of Object.values(cfg.rights))Object.assign(r,{mode:'redistribute',evidence:'PRIVATE LOCAL TEST ONLY. Not authorized for publication.'});
    cfg.baseUrl=`http://127.0.0.1:${server.address().port}`;cfg.version='1.0.0';cfg.assetLayout='static';
    try{
        const v1=await publish(source,dist,cfg,privateKey);const verified=verifyEnvelope(JSON.parse(await fs.readFile(path.join(dist,'latest.json'))),publicKey);const install=await sync(game,verified,{dev:true,allowedHosts:[]});
        const personal=path.join(game,'options.txt');await fs.writeFile(personal,'PERSONAL SETTINGS');
        const old=v1.files.find(f=>f.path.startsWith('resourcepacks/'));const bytes=Buffer.from('LOCAL UPDATE TRANSACTION TEST');const sha=hash(bytes);await fs.writeFile(path.join(dist,'objects',sha),bytes);
        const v2={...v1,version:'1.0.1',files:v1.files.map(f=>f===old?{...f,size:bytes.length,sha256:sha,url:`${cfg.baseUrl}/objects/${sha}`}:f)};
        const payload=Buffer.from(JSON.stringify(v2)),envelope={payload:payload.toString('base64'),signature:crypto.sign(null,payload,privateKey).toString('base64')};
        const update=await sync(game,verifyEnvelope(envelope,publicKey),{dev:true,allowedHosts:[]});
        if(await fs.readFile(personal,'utf8')!=='PERSONAL SETTINGS'||update.changed!==1)throw Error('Integration mismatch');
        await fs.writeFile('reports/real-pack-test.json',JSON.stringify({success:true,files:install.changed,v1:'1.0.0',v2:'1.0.1',changed:update.changed,personalPreserved:true,scope:'Real local candidate install; synthetic V2 resource replacement tests transaction only. No authenticated game launch or public distribution.'},null,2));
        console.log('Installation réelle du candidat et mise à jour différentielle signée : OK.');
    }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
