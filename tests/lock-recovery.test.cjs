const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const {sync,recoverInstallation,hash}=require('../desktop/updater.cjs');
const manifest={schema:1,version:'1.0.1',minecraft:'1.21.1',fabric:'0.19.5',files:[]};
async function fixture(fn){const root=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-lock-'));await fs.mkdir(path.join(root,'.akuma'));try{await fn(root,path.join(root,'.akuma'));}finally{await fs.rm(root,{recursive:true,force:true});}}
test('Legacy empty lock requires recovery and preserves personal files and interrupted transaction',()=>fixture(async(root,meta)=>{
 await fs.mkdir(path.join(meta,'backup','mods'),{recursive:true});await fs.mkdir(path.join(root,'mods'));await fs.writeFile(path.join(root,'mods/a.jar'),'partial');await fs.writeFile(path.join(meta,'backup/mods/a.jar'),'old');await fs.writeFile(path.join(root,'options.txt'),'personal');await fs.writeFile(path.join(meta,'lock'),'');
 const previous={...manifest,files:[{path:'mods/a.jar',sha256:hash(Buffer.from('old')),size:3,policy:'managed',url:'https://example.com/a'}]};await fs.writeFile(path.join(meta,'journal.json'),JSON.stringify({previous,items:[{path:'mods/a.jar',existed:true}]}));
 await assert.rejects(sync(root,previous,{allowedHosts:[]}),/Récupérer/);
 await recoverInstallation(root);assert.equal(await fs.readFile(path.join(root,'mods/a.jar'),'utf8'),'old');assert.equal(await fs.readFile(path.join(root,'options.txt'),'utf8'),'personal');assert.equal((await fs.readdir(meta)).filter(n=>n.startsWith('lock-recovered-')).length,1);await assert.rejects(fs.stat(path.join(meta,'lock')));await assert.rejects(fs.stat(path.join(meta,'journal.json')));assert.equal((await sync(root,previous,{allowedHosts:[]})).changed,0);
}));
test('Recovery refuses a live owner or a lock owned by another computer',()=>fixture(async(root,meta)=>{
 const p=path.join(meta,'lock');const owner={pid:process.pid,host:os.hostname(),token:'active'};await fs.writeFile(p,JSON.stringify(owner));await assert.rejects(recoverInstallation(root),/encore active/);assert.deepEqual(JSON.parse(await fs.readFile(p)),owner);await fs.writeFile(p,JSON.stringify({...owner,host:'another-computer'}));await assert.rejects(recoverInstallation(root),/propriétaire/);
}));
test('Recovery handles a confirmed dead owner, and malformed lock from interrupted write',()=>fixture(async(root,meta)=>{
 const child=cp.spawnSync(process.execPath,['-e',''],{windowsHide:true});assert.equal(child.status,0);const p=path.join(meta,'lock');await fs.writeFile(p,JSON.stringify({pid:child.pid,host:os.hostname()}));await recoverInstallation(root);await fs.writeFile(p,'{"pid":');await recoverInstallation(root);assert.equal((await sync(root,manifest,{allowedHosts:[]})).changed,0);
}));
test('Lock symlinks cannot redirect recovery outside the game profile',()=>fixture(async(root,meta)=>{
 const outside=path.join(root,'outside');await fs.mkdir(outside);await fs.symlink(outside,path.join(meta,'lock'),'junction');await assert.rejects(recoverInstallation(root),/Lien symbolique/);assert.deepEqual(await fs.readdir(outside),[]);
}));
