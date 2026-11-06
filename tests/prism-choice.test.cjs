const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const prism=require('../desktop/prism.cjs');
test('11.1.1 is the default and 9.4 is the pinned fallback, an unknown version is refused',async()=>{
    assert.equal(prism.RELEASE.version,'11.1.1');assert.deepEqual(Object.keys(prism.PRISM),['11.1.1','9.4']);
    for(const [v,p] of Object.entries(prism.PRISM))for(const r of Object.values(p)){assert.equal(r.version,v);assert.ok(r.url.includes(`/download/${v}/`));assert.match(r.sha256,/^[0-9a-f]{64}$/);}
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-choice-'));
    try{
        await assert.rejects(prism.ensureEngine(root,()=>{},root,'8.0'),/inconnue/);
    }finally{await fs.rm(root,{recursive:true,force:true});}
});
