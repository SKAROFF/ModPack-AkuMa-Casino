// Verify actual installed classpath and arguments without starting an unauthenticated game.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
(async()=>{
    const engine=require('../desktop/game.cjs'),root=path.resolve('qa/clean-install'),prepared=await engine.prepare(root,{fabric:'0.19.5'},()=>{});
    const original=cp.spawn;let invocation;
    cp.spawn=(exe,args,options)=>{invocation={exe,args,options};const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();return child;};
    try{
        engine.launch(root,{ram:4096,width:1280,height:720,fullscreen:false},{serverAddress:'akuma-casino.mine.fun'},prepared,{uuid:'00000000000000000000000000000000',displayName:'TEST_ONLY_NOT_EXECUTED',accessToken:'TEST_ONLY_NOT_EXECUTED',type:'microsoft'});
        assert.ok(invocation.args.includes('net.fabricmc.loader.impl.launch.knot.KnotClient'));
        const cpIndex=invocation.args.indexOf('-cp');assert.ok(cpIndex>=0);const entries=invocation.args[cpIndex+1].split(path.delimiter);for(const file of entries)assert.ok(fs.existsSync(file),`Missing classpath file ${file}`);
        assert.ok(invocation.args.some(a=>String(a).includes('akuma-casino.mine.fun')));
        fs.writeFileSync('reports/launch-command-test.json',JSON.stringify({success:true,classpathEntries:entries.length,allExist:true,mainClass:'net.fabricmc.loader.impl.launch.knot.KnotClient',directConnectArgumentPresent:true,scope:'Process spawn mocked. No unauthenticated game started; this is not an authenticated launch test.'},null,2));console.log('Arguments Fabric et chemins de bibliothèques vérifiés sans démarrer le jeu.');
    }finally{cp.spawn=original;}
})().catch(e=>{console.error(e);process.exitCode=1;});
