const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),{EventEmitter}=require('node:events');
const prism=require('../desktop/prism.cjs');
test('Account launch and reactivation never request a hidden Windows GUI',async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-visible-')),original=cp.spawn,invocations=[];
    cp.spawn=(exe,args,options)=>{invocations.push({exe,args,options});const child=new EventEmitter();child.pid=process.pid;child.exitCode=null;child.unref=()=>{};process.nextTick(()=>child.emit('spawn'));return child;};
    try{
        const child=await prism.start(root,'C:/Prism/prismlauncher.exe','akuma-casino.mine.fun',false);
        assert.equal(invocations[0].options.windowsHide,false);
        assert.equal((await prism.activeSession(root)).mode,'account');
        await prism.reopen(root,'C:/Prism/prismlauncher.exe');assert.equal(invocations[1].options.windowsHide,false);
        assert.deepEqual(invocations[1].args,['--dir',prism.dataDir(root)]);
        child.emit('close');await new Promise(r=>setTimeout(r,20));
    }finally{cp.spawn=original;await fs.rm(root,{recursive:true,force:true});}
});
