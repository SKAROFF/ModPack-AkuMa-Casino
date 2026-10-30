const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const prism=require('../desktop/prism.cjs'),{validate}=require('../desktop/updater.cjs');
test('NeoForge pack: Prism component, resource packs switched on, player options kept',async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-neo-'));
    try{
        await fs.mkdir(prism.gameDir(root),{recursive:true});
        await fs.writeFile(path.join(prism.gameDir(root),'options.txt'),'lang:en_us\nresourcePacks:["vanilla","fabric"]\nmusic:0.42');
        const manifest={minecraft:'1.21.1',neoforge:'21.1.265',options:{resourcePacks:['vanilla','mod_resources','file/kanto-audio'],lang:'fr_fr'}};
        await prism.configure(root,{ram:3072,width:1280,height:720,fullscreen:false},manifest,'"AkuMa.exe" --akuma-prelaunch "C:/Game"');
        const uids=JSON.parse(await fs.readFile(path.join(prism.instanceDir(root),'mmc-pack.json'))).components.map(c=>c.uid);
        assert.deepEqual(uids,['org.lwjgl3','net.minecraft','net.neoforged']);
        const options=await fs.readFile(path.join(prism.gameDir(root),'options.txt'),'utf8');
        assert.match(options,/^resourcePacks:\["vanilla","fabric","mod_resources","file\/kanto-audio"\]$/m);
        assert.match(options,/^lang:en_us$/m);assert.match(options,/^music:0.42$/m);assert.doesNotMatch(options,/fr_fr/);
    }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('a manifest names exactly one loader',()=>{
    const base={schema:1,version:'2.0.0-alpha',minecraft:'1.21.1',files:[]};
    assert.equal(validate({...base,neoforge:'21.1.265'}).neoforge,'21.1.265');
    assert.throws(()=>validate({...base,neoforge:'21.1.265',fabric:'0.19.5'}),/incompatible/);
    assert.throws(()=>validate({...base}),/incompatible/);
    assert.throws(()=>validate({...base,neoforge:'21.1.265',options:{resourcePacks:['file/x"']}}),/Options/);
    assert.equal(validate({...base,neoforge:'21.1.265',options:{resourcePacks:['file/AkuMa - Pixelmon FR complet.zip'],lang:'fr_fr'}}).options.lang,'fr_fr');
});
test('mods the pack does not list are reported, kept ones are not',async()=>{
    const {unknownMods}=require('../desktop/updater.cjs'),root=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-mods-'));
    try{
        await fs.mkdir(path.join(root,'mods/mcef-cache'),{recursive:true});
        for(const n of ['pack.jar','Old-Fabric.jar','kept.jar','notes.txt'])await fs.writeFile(path.join(root,'mods',n),'x');
        const manifest={files:[{path:'mods/Pack.jar'}]};
        assert.deepEqual(await unknownMods(root,manifest,new Set(['kept.jar'])),['Old-Fabric.jar']);
        assert.deepEqual(await unknownMods(path.join(root,'missing'),manifest),[]);
    }finally{await fs.rm(root,{recursive:true,force:true});}
});
