const fs=require('node:fs/promises'),path=require('node:path'),cp=require('node:child_process');
const AdmZip=require('adm-zip');
const {hash,download,atomic}=require('./updater.cjs');
const RELEASE={version:'11.1.1',url:'https://github.com/PrismLauncher/PrismLauncher/releases/download/11.1.1/PrismLauncher-Windows-MinGW-w64-Portable-11.1.1.zip',sha256:'05841d0b3bfc0a8212658457cc6035e1c29cd7ffae919464e874e384cbe8d062',size:43687692};
const hosts=['github.com','release-assets.githubusercontent.com'];
const dataDir=root=>path.join(root,'prism');
const instanceDir=root=>path.join(dataDir(root),'instances','akuma');
const gameDir=root=>path.join(instanceDir(root),'.minecraft');
async function exists(p){try{await fs.lstat(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
async function assertIdle(root){
    try{const m=JSON.parse(await fs.readFile(path.join(root,'prism-process.json'),'utf8'));try{process.kill(m.pid,0);throw Error('Fermez la fenêtre Prism AkuMa et Minecraft avant de modifier ou mettre à jour le profil.');}catch(e){if(e.code!=='ESRCH')throw e;}}catch(e){if(e.code!=='ENOENT')throw e;}
}
function archivePath(name){
    if(!name || name.startsWith('/') || name.includes('\\') || name.split('/').some(s=>s==='..'||s==='.'||/[\x00-\x1f:<>"|?*]/.test(s)))throw Error('Archive Prism : chemin interdit');
    return name;
}
async function ensureEngine(root,onProgress=()=>{}){
    const target=path.join(root,'prism-engine',RELEASE.version),exe=path.join(target,'prismlauncher.exe');
    if(await exists(exe)){
        const receipt=JSON.parse(await fs.readFile(path.join(target,'akuma-integrity.json'),'utf8'));
        if(receipt.archive!==RELEASE.sha256)throw Error('Version du moteur Prism non reconnue');
        for(const f of receipt.files){archivePath(f.path);if(hash(await fs.readFile(path.join(target,f.path)))!==f.sha256)throw Error('Un fichier Prism est corrompu. Renommez le dossier prism-engine pour le réinstaller.');}
        return exe;
    }
    if(process.platform!=='win32'||process.arch!=='x64')throw Error('Cette préversion est prévue pour Windows x64.');
    onProgress({text:'Installation de Prism officiel — connexion Microsoft sans compte Azure',percent:0});
    const zipPath=path.join(root,'downloads',`Prism-${RELEASE.version}.zip`);
    await download(RELEASE,zipPath,hosts);
    const zip=new AdmZip(zipPath),staging=target+'.staging-'+process.pid,files=[];await fs.mkdir(staging,{recursive:true});
    let total=0;
    for(const entry of zip.getEntries()){
        archivePath(entry.entryName);if(entry.isDirectory)continue;
        if((entry.attr>>>16&0xf000)===0xa000)throw Error('Archive Prism : lien interdit');
        total+=entry.header.size;if(total>500e6||entry.header.size>150e6)throw Error('Archive Prism trop volumineuse');
        const bytes=entry.getData(),dest=path.join(staging,entry.entryName);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);files.push({path:entry.entryName,sha256:hash(bytes)});
    }
    if(!await exists(path.join(staging,'prismlauncher.exe')))throw Error('Exécutable Prism absent');
    await atomic(path.join(staging,'akuma-integrity.json'),{archive:RELEASE.sha256,files});
    await fs.mkdir(path.dirname(target),{recursive:true});await fs.rename(staging,target);
    return exe;
}
async function configure(root,settings,manifest,prelaunch){
    await assertIdle(root);const instance=instanceDir(root);await fs.mkdir(gameDir(root),{recursive:true});
    const owner=path.join(instance,'.akuma-profile');
    if(await exists(path.join(instance,'instance.cfg'))&&!await exists(owner))throw Error('Un profil Prism non géré existe déjà sous ce nom.');
    if(!/^\d+\.\d+\.\d+$/.test(manifest.fabric)||manifest.minecraft!=='1.21.1')throw Error('Versions du profil invalides');
    await fs.writeFile(owner,'Managed by AKUMA Launcher. Official Prism binary remains unmodified.\n');
    const components=[{uid:'org.lwjgl3',version:'3.3.3',dependencyOnly:true},{uid:'net.minecraft',version:'1.21.1',important:true},{uid:'net.fabricmc.intermediary',version:'1.21.1',dependencyOnly:true},{uid:'net.fabricmc.fabric-loader',version:manifest.fabric}];
    await atomic(path.join(instance,'mmc-pack.json'),{formatVersion:1,components});
    const cfg={ConfigVersion:'1.3',InstanceType:'OneSix',name:'AKUMA — Royal Casino',iconKey:'default',OverrideMemory:true,MinMemAlloc:1024,MaxMemAlloc:settings.ram,OverrideWindow:true,MinecraftWinWidth:settings.width,MinecraftWinHeight:settings.height,LaunchMaximized:false,OverrideJavaLocation:false,AutomaticJava:true,OverrideMiscellaneous:true,CloseAfterLaunch:false,QuitAfterGameStop:true,OverrideCommands:true,PreLaunchCommand:prelaunch,PostExitCommand:'',WrapperCommand:'',UseAccountForInstance:false,JoinServerOnLaunch:false};
    await fs.writeFile(path.join(instance,'instance.cfg'),'[General]\n'+Object.entries(cfg).map(([k,v])=>`${k}=${typeof v==='string'?JSON.stringify(v):v}`).join('\n')+'\n');
    const options=path.join(gameDir(root),'options.txt');let text='';try{text=await fs.readFile(options,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
    const line=`fullscreen:${settings.fullscreen?'true':'false'}`;
    text=/^fullscreen:.*$/m.test(text)?text.replace(/^fullscreen:.*$/m,line):text+(text&&!text.endsWith('\n')?'\n':'')+line+'\n';
    await fs.writeFile(options,text);
    const global=path.join(dataDir(root),'prismlauncher.cfg');
    if(!await exists(global))await fs.writeFile(global,'[General]\nLanguage=fr\nAutomaticJavaSwitch=true\nAutomaticJavaDownload=true\nUserAskedAboutAutomaticJavaDownload=true\nCloseAfterLaunch=false\nQuitAfterGameStop=true\n');
}
function args(root,server,play){const a=['--dir',dataDir(root)];if(play){if(!/^[A-Za-z0-9._-]+(?::\d{1,5})?$/.test(server))throw Error('Adresse de serveur invalide');a.push('--launch','akuma','--server',server);}return a;}
async function start(root,exe,server,play,onClose=()=>{}){
    await assertIdle(root);
    const child=cp.spawn(exe,args(root,server,play),{cwd:path.dirname(exe),windowsHide:true,stdio:'ignore'});
    await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',()=>reject(Error('Prism ne peut pas démarrer.')));});
    await atomic(path.join(root,'prism-process.json'),{pid:child.pid,mode:play?'game':'account',started:new Date().toISOString()});
    child.once('close',async()=>{try{const current=JSON.parse(await fs.readFile(path.join(root,'prism-process.json'),'utf8'));if(current.pid===child.pid)await fs.unlink(path.join(root,'prism-process.json'));}catch{}onClose();});
    if(child.exitCode!==null)throw Error('Prism s’est fermé pendant son démarrage.');
    return child;
}
module.exports={RELEASE,dataDir,instanceDir,gameDir,assertIdle,archivePath,ensureEngine,configure,args,start};
