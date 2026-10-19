const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const prism=require('../desktop/prism.cjs');
test('A corrupt bundled engine is refused instead of silently downloaded',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-bundled-'));
 try{const bundle=path.join(root,'resources');await fs.mkdir(bundle);await fs.writeFile(path.join(bundle,`Prism-${prism.RELEASE.version}.zip`),'corrupt');await assert.rejects(prism.ensureEngine(root,()=>{},bundle),/intégré corrompu/);}
 finally{await fs.rm(root,{recursive:true,force:true});}
});
