const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const prism=require('../desktop/prism.cjs');
test('the game only starts when Prism plays with the AkuMa pseudo',async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-account-'));
    const accounts=list=>fs.writeFile(path.join(prism.dataDir(root),'accounts.json'),JSON.stringify({formatVersion:3,accounts:list}));
    try{
        await assert.rejects(prism.assertAccount(root,'SKAR__OFF'),/Aucun compte/);
        await fs.mkdir(prism.dataDir(root),{recursive:true});
        await accounts([{type:'MSA',profile:{name:'SKAR__OFF'}},{type:'Offline',active:true,profile:{name:'SKAR_TEST'}}]);
        await assert.rejects(prism.assertAccount(root,'SKAR__OFF'),/SKAR_TEST.*SKAR__OFF/);
        await accounts([{type:'MSA',active:true,profile:{name:'skar__off'}}]);
        await prism.assertAccount(root,'SKAR__OFF');
        await accounts([{type:'MSA',profile:{name:'SKAR__OFF'}}]);
        await assert.rejects(prism.assertAccount(root,'SKAR__OFF'),/Aucun compte/);
        await fs.writeFile(path.join(prism.dataDir(root),'accounts.json'),'{oops');
        await assert.rejects(prism.assertAccount(root,'SKAR__OFF'),/illisibles/);
    }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('the pre-launch gate reads the prism folder four levels above the game folder',()=>{
    const root=path.join(os.tmpdir(),'data');
    assert.equal(path.resolve(prism.gameDir(root),'..','..','..','..'),path.resolve(root));
});
