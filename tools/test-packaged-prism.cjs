const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{createRequire}=require('node:module');
const load=createRequire(require.resolve('electron-builder')),asar=createRequire(load.resolve('app-builder-lib'))('@electron/asar');
const archive=path.resolve('dist-akuma/win-unpacked/resources/app.asar'),files=asar.listPackage(archive).map(p=>p.replaceAll('\\','/'));
const config=JSON.parse(asar.extractFile(archive,'desktop/config.json'));
if(config.authProvider!=='prism-official'||config.microsoftClientId||files.includes('/desktop/auth.cjs')||!files.includes('/desktop/prism.cjs'))throw Error('Architecture Prism incorrecte dans le binaire');
const exe=path.resolve('dist-akuma/win-unpacked/AKUMA Launcher.exe');
cp.execFile(exe,['--akuma-prelaunch',path.resolve('qa/no-published-pack')],{windowsHide:true,timeout:20000},(error,stdout,stderr)=>{
    const result={packagedPrismBridge:true,legacyOAuthExcluded:true,requiresAzure:false,gateRefusedUnpublishedFeed:error?.code===1&&stderr.includes('HTTP 404'),stderr:stderr.trim(),authenticatedGameLaunchTested:false};
    fs.writeFileSync('reports/prism-packaged-test.json',JSON.stringify(result,null,2));console.log(result);
    if(!result.gateRefusedUnpublishedFeed)process.exitCode=1;
});
