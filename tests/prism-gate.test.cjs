const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {verify}=require('../desktop/prism-gate.cjs'),{hash}=require('../desktop/updater.cjs');
test('Prism prelaunch gate requires a signed current complete pack and fails closed offline',async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-gate-'));const original=global.fetch;
    const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');
    const manifest={schema:1,version:'1.0.0',minecraft:'1.21.1',fabric:'0.19.5',files:[{path:'mods/a.jar',sha256:hash(Buffer.from('a')),size:1,policy:'managed',url:'https://fixture.invalid/a'}]};
    const payload=Buffer.from(JSON.stringify(manifest));const envelope={payload:payload.toString('base64'),signature:crypto.sign(null,payload,privateKey).toString('base64')};
    const config={feedUrl:'https://fixture.invalid/latest.json',allowedHosts:['fixture.invalid'],publicKey:publicKey.export({type:'spki',format:'pem'})};
    global.fetch=async()=>new Response(JSON.stringify(envelope));
    try{
        await fs.mkdir(path.join(root,'mods'));await fs.mkdir(path.join(root,'.akuma'));await fs.writeFile(path.join(root,'mods/a.jar'),'a');await fs.writeFile(path.join(root,'.akuma/state.json'),JSON.stringify(manifest));
        assert.equal(await verify(root,config),'1.0.0');
        await fs.writeFile(path.join(root,'mods/a.jar'),'bad');await assert.rejects(verify(root,config),/incorrect/);await fs.writeFile(path.join(root,'mods/a.jar'),'a');
        await fs.writeFile(path.join(root,'.akuma/lock'),'busy');await assert.rejects(verify(root,config),/en cours/);await fs.unlink(path.join(root,'.akuma/lock'));
        await fs.writeFile(path.join(root,'.akuma/state.json'),JSON.stringify({...manifest,version:'0.9.0'}));await assert.rejects(verify(root,config),/mise à jour/);
        global.fetch=async()=>{throw Error('offline');};await assert.rejects(verify(root,config),/offline/);
    }finally{global.fetch=original;await fs.rm(root,{recursive:true,force:true});}
});
