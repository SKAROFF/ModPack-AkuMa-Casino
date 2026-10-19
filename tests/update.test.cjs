const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto');
const {sync,rollback,hash,safePath,feed,allowedUrl}=require('../desktop/updater.cjs');
const {publish}=require('../tools/publish.cjs');
test('Installation V1 → publication V2 → mise à jour différentielle → réparation → rollback et conservation',async()=>{
    const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-test-')),source=path.join(tmp,'source'),dist=path.join(tmp,'dist'),game=path.join(tmp,'game');
    await fs.mkdir(path.join(source,'mods'),{recursive:true});await fs.mkdir(path.join(source,'config'));await fs.mkdir(path.join(source,'resourcepacks'));
    const hits=[];let fail=false;
    const server=http.createServer(async(req,res)=>{hits.push(req.url);if(fail){res.writeHead(503).end();return;}try{res.end(await fs.readFile(path.join(dist,req.url)));}catch{res.writeHead(404).end();}});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
    const {privateKey}=crypto.generateKeyPairSync('ed25519');
    const cfg={version:'1.0.0',fabric:'0.19.5',baseUrl:base,rights:{}};
    async function put(p,content){await fs.writeFile(path.join(source,p),content);cfg.rights[p]={mode:'redistribute',evidence:'Test fixture authored for test'};}
    try{
        await put('mods/a.jar','mod-A-v1');await put('mods/obsolete.jar','old');await put('config/akuma.json','config-v1');await put('resourcepacks/akuma.zip','textures-v1');
        const v1=await publish(source,dist,cfg,privateKey);assert.equal((await sync(game,v1,{allowedHosts:[],dev:true})).changed,4);
        await fs.mkdir(path.join(game,'saves'));await fs.writeFile(path.join(game,'saves','world.dat'),'personal world');await fs.writeFile(path.join(game,'options.txt'),'custom keys');await fs.writeFile(path.join(game,'config','akuma.json'),'personal config');
        await fs.unlink(path.join(source,'mods/obsolete.jar'));await put('mods/a.jar','mod-A-v2');await put('config/akuma.json','config-v2');await put('resourcepacks/akuma.zip','textures-v2');cfg.version='1.0.1';
        const v2=await publish(source,dist,cfg,privateKey);hits.length=0;
        const result=await sync(game,v2,{allowedHosts:[],dev:true});assert.equal(result.version,'1.0.1');assert.deepEqual(result.conflicts,['config/akuma.json']);assert.equal(hits.length,3);
        assert.equal(await fs.readFile(path.join(game,'mods/a.jar'),'utf8'),'mod-A-v2');await assert.rejects(fs.stat(path.join(game,'mods/obsolete.jar')));assert.equal(await fs.readFile(path.join(game,'config/akuma.json'),'utf8'),'personal config');assert.equal(await fs.readFile(path.join(game,'saves/world.dat'),'utf8'),'personal world');assert.equal(await fs.readFile(path.join(game,'options.txt'),'utf8'),'custom keys');
        await rollback(game);assert.equal(await fs.readFile(path.join(game,'mods/a.jar'),'utf8'),'mod-A-v1');assert.equal(await fs.readFile(path.join(game,'mods/obsolete.jar'),'utf8'),'old');
        await sync(game,v2,{allowedHosts:[],dev:true});await fs.writeFile(path.join(game,'mods/a.jar'),'corrupt');hits.length=0;await sync(game,v2,{allowedHosts:[],dev:true});assert.equal(await fs.readFile(path.join(game,'mods/a.jar'),'utf8'),'mod-A-v2');assert.equal(hits.length,0,'repair from verified cache');
        await put('mods/a.jar','mod-A-v3');cfg.version='1.0.2';const v3=await publish(source,dist,cfg,privateKey);fail=true;await assert.rejects(sync(game,v3,{allowedHosts:[],dev:true}));assert.equal(await fs.readFile(path.join(game,'mods/a.jar'),'utf8'),'mod-A-v2');
    }finally{server.close();await fs.rm(tmp,{recursive:true,force:true});}
});
test('Traversal, Windows aliases, forbidden sources, manifest forgery',async()=>{
    for(const p of ['../options.txt','mods/../options.txt','mods\\evil.jar','mods/CON.jar','mods/a.jar:ads','mods/a.','saves/world.dat','mods//a.jar'])assert.throws(()=>safePath(p));
    assert.throws(()=>allowedUrl('http://example.com/a',['example.com']));assert.throws(()=>allowedUrl('https://evil.test/a',['example.com']));
    const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');const bytes=Buffer.from(JSON.stringify({schema:1,version:'1.0.0',minecraft:'1.21.1',fabric:'0.19.5',files:[]}));const envelope={payload:bytes.toString('base64'),signature:crypto.sign(null,bytes,privateKey).toString('base64')};const {verifyEnvelope}=require('../desktop/updater.cjs');assert.equal(verifyEnvelope(envelope,publicKey).version,'1.0.0');envelope.payload=Buffer.from('tampered').toString('base64');assert.throws(()=>verifyEnvelope(envelope,publicKey));
});
test('Partial download resumes and corrupt payload never commits',async()=>{
    const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-network-'));const content=Buffer.alloc(200000,65);let calls=0,sawRange=false,corrupt=false;
    const server=http.createServer((req,res)=>{calls++;const start=Number(req.headers.range?.match(/bytes=(\d+)-/)[1]||0);if(start){sawRange=true;res.writeHead(206,{'Content-Range':`bytes ${start}-${content.length-1}/${content.length}`});}else res.writeHead(200);if(corrupt){res.end(Buffer.alloc(content.length,66));return;}if(calls===1){res.write(content.subarray(0,100000));setTimeout(()=>res.destroy(),30);}else res.end(content.subarray(start));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const m={schema:1,version:'1.0.0',minecraft:'1.21.1',fabric:'0.19.5',files:[{path:'mods/test.jar',sha256:hash(content),size:content.length,policy:'managed',url:`http://127.0.0.1:${server.address().port}/file`}]};
    try{await sync(tmp,m,{dev:true,allowedHosts:[]});assert.ok(sawRange);corrupt=true;m.version='1.0.1';m.files[0].sha256=hash(Buffer.alloc(content.length,67));await assert.rejects(sync(tmp,m,{dev:true,allowedHosts:[]}));assert.equal(hash(await fs.readFile(path.join(tmp,'mods/test.jar'))),hash(content));}finally{server.close();await fs.rm(tmp,{recursive:true,force:true});}
});
