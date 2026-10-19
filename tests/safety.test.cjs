const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {sync,hash}=require('../desktop/updater.cjs');
test('Reject a Windows junction before altering files outside the instance',async()=>{
    const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-link-')),root=path.join(tmp,'instance'),outside=path.join(tmp,'outside');
    await fs.mkdir(root);await fs.mkdir(outside);await fs.writeFile(path.join(outside,'personal.jar'),'personal');await fs.symlink(outside,path.join(root,'mods'),'junction');
    try{await assert.rejects(sync(root,{schema:1,version:'1.0.0',minecraft:'1.21.1',fabric:'0.19.5',files:[{path:'mods/personal.jar',sha256:hash(Buffer.from('new')),size:3,policy:'managed',url:'https://example.com/file'}]},{allowedHosts:['example.com']}),/Lien symbolique/);assert.equal(await fs.readFile(path.join(outside,'personal.jar'),'utf8'),'personal');}finally{await fs.rm(tmp,{recursive:true,force:true});}
});
test('Recover an interrupted transaction from the journal before proceeding',async()=>{
    const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-recover-'));const meta=path.join(tmp,'.akuma');
    await fs.mkdir(path.join(tmp,'mods'));await fs.mkdir(path.join(meta,'backup','mods'),{recursive:true});await fs.writeFile(path.join(tmp,'mods/a.jar'),'partially committed v2');await fs.writeFile(path.join(meta,'backup/mods/a.jar'),'v1');
    const previous={schema:1,version:'1.0.0',minecraft:'1.21.1',fabric:'0.19.5',files:[{path:'mods/a.jar',size:2,sha256:hash(Buffer.from('v1')),policy:'managed',url:'https://example.com/a'}]};
    await fs.writeFile(path.join(meta,'journal.json'),JSON.stringify({previous,items:[{path:'mods/a.jar',existed:true}]}));
    try{await sync(tmp,previous,{allowedHosts:['example.com']});assert.equal(await fs.readFile(path.join(tmp,'mods/a.jar'),'utf8'),'v1');await assert.rejects(fs.stat(path.join(meta,'journal.json')));}finally{await fs.rm(tmp,{recursive:true,force:true});}
});
