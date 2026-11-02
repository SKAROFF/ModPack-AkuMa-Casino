const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {launcherFile}=require('../desktop/updater.cjs'),prism=require('../desktop/prism.cjs');
const sha='a'.repeat(64),win={url:'https://x/a.exe',size:5,sha256:sha},dmg={url:'https://x/a.dmg',size:6,sha256:sha};
test('each platform takes its own launcher file from the signed manifest',()=>{
    const m={version:'1.0.0',...win,mac:dmg};
    assert.deepEqual(launcherFile(m,'win32'),{version:'1.0.0',...win,ext:'exe'});
    assert.deepEqual(launcherFile(m,'darwin'),{version:'1.0.0',...dmg,ext:'dmg'});
});
test('a manifest without a valid Mac file offers Mac players nothing',()=>{
    assert.throws(()=>launcherFile({version:'1.0.0',...win},'darwin'),/Aucune/);
    assert.throws(()=>launcherFile({version:'1.0.0',...win,mac:win},'darwin'),/Aucune/);
    assert.throws(()=>launcherFile({version:'1.0.0',...win,mac:{...dmg,url:'http://x/a.dmg'}},'darwin'),/Aucune/);
    assert.throws(()=>launcherFile({version:'1.0.0',...dmg},'win32'),/Aucune/);
});
test('macOS: the real Prism bundle installs with its symlinks and passes its integrity check',{skip:process.platform!=='darwin'},async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-mac-'));
    try{
        const bundled=path.resolve('bundled-engine'),exe=await prism.ensureEngine(root,()=>{},bundled);
        assert.match(exe,/Prism Launcher\.app\/Contents\/MacOS\/prismlauncher$/);
        await fs.access(exe,fs.constants.X_OK);
        const frameworks=path.join(path.dirname(exe),'..','Frameworks'),found=await fs.readdir(frameworks,{withFileTypes:true,recursive:true});
        assert.ok(found.some(e=>e.isSymbolicLink()),'framework symlinks kept');
        assert.equal(await prism.ensureEngine(root,()=>{},bundled),exe);
    }finally{await fs.rm(root,{recursive:true,force:true});}
});
