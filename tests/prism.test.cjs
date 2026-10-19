const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const prism=require('../desktop/prism.cjs');
test('Prism profile uses official component identifiers, isolated data and preserves player options',async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-prism-'));
    try{
        await fs.mkdir(prism.gameDir(root),{recursive:true});await fs.writeFile(path.join(prism.gameDir(root),'options.txt'),'music:0.42\nkey_key.jump:32\nfullscreen:false\n');
        await prism.configure(root,{ram:3072,width:1280,height:720,fullscreen:true},{minecraft:'1.21.1',fabric:'0.19.5'},'"C:/AkuMa Test/AkuMa.exe" --akuma-prelaunch "C:/My Game"');
        const pack=JSON.parse(await fs.readFile(path.join(prism.instanceDir(root),'mmc-pack.json')));
        assert.equal(pack.components.find(c=>c.uid==='net.fabricmc.fabric-loader').version,'0.19.5');
        const cfg=await fs.readFile(path.join(prism.instanceDir(root),'instance.cfg'),'utf8');assert.ok(cfg.includes('MaxMemAlloc=3072'));assert.ok(cfg.includes('AutomaticJava=true'));assert.ok(cfg.includes('CloseAfterLaunch=false'));assert.ok(cfg.includes('PreLaunchCommand="\\"C:/AkuMa Test/AkuMa.exe\\"'));
        const options=await fs.readFile(path.join(prism.gameDir(root),'options.txt'),'utf8');assert.ok(options.includes('music:0.42'));assert.ok(options.includes('key_key.jump:32'));assert.ok(options.includes('fullscreen:true'));
        assert.deepEqual(prism.args(root,'akuma-casino.mine.fun',true),['--dir',prism.dataDir(root),'--launch','akuma','--server','akuma-casino.mine.fun']);
        await fs.writeFile(path.join(root,'prism-process.json'),JSON.stringify({pid:process.pid}));await assert.rejects(prism.configure(root,{}, {minecraft:'1.21.1',fabric:'0.19.5'},''),/Fermez/);
    }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('Prism archive paths and foreign profiles are rejected',async()=>{
    for(const p of ['../evil','C:/evil','/evil','folder/../evil','folder\\evil'])assert.throws(()=>prism.archivePath(p));
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-prism-owner-'));
    try{await fs.mkdir(prism.instanceDir(root),{recursive:true});await fs.writeFile(path.join(prism.instanceDir(root),'instance.cfg'),'personal profile');await assert.rejects(prism.configure(root,{},{minecraft:'1.21.1',fabric:'0.19.5'},''),/non géré/);assert.equal(await fs.readFile(path.join(prism.instanceDir(root),'instance.cfg'),'utf8'),'personal profile');}finally{await fs.rm(root,{recursive:true,force:true});}
});
