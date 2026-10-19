const {app,BrowserWindow,ipcMain,shell,dialog}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const config=require('./config.json'),updater=require('./updater.cjs'),prism=require('./prism.cjs');
let win,busy=false,game=null,settings,root;
const maxRam=()=>Math.max(1024,Math.floor((os.totalmem()/1024**2-2048)/512)*512);
const progress=p=>{if(win&&!win.isDestroyed())win.webContents.send('progress',p);};
const gameRoot=()=>settings.installDirectory||root;
const gameDirectory=()=>prism.gameDir(gameRoot());
const quote=value=>'"'+value.replaceAll('\\','/').replaceAll('"','')+'"';
function gateCommand(){return [quote(process.execPath),...(app.isPackaged?[]:[quote(app.getAppPath())]),'--akuma-prelaunch',quote(gameDirectory())].join(' ');}
async function read(p,fallback){try{return JSON.parse(await fs.readFile(p,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
async function exclusive(fn){if(busy||game)throw Error('Fermez Prism AkuMa et Minecraft avant cette opération.');busy=true;try{await prism.assertIdle(gameRoot());return await fn();}finally{busy=false;}}
function state(){return {settings,maxRam:maxRam(),authProvider:'prism',account:'Géré dans Prism officiel',configured:!!(config.feedUrl&&config.publicKey&&config.serverAddress),news:config.news,version:app.getVersion()};}
async function openPrismAccount(){
    const engine=await prism.ensureEngine(gameRoot(),progress);
    const installed=await read(path.join(gameDirectory(),'.akuma','state.json'),{minecraft:'1.21.1',fabric:'0.19.5'});
    await prism.configure(gameRoot(),settings,installed,gateCommand());
    game=await prism.start(gameRoot(),engine,config.serverAddress,false,()=>{game=null;progress({text:'Prism fermé. Vous pouvez revenir dans AkuMa pour jouer.',percent:0});if(BrowserWindow.getAllWindows().length===0)app.quit();});
    return 'Dans Prism : Paramètres → Comptes → Ajouter Microsoft. Pour déconnecter un compte, supprimez-le dans cette même page. Fermez ensuite Prism et revenez dans AkuMa.';
}
async function operation(name,args){
    if(name==='state')return state();
    if(name==='login'||name==='logout')return exclusive(openPrismAccount);
    if(name==='settings')return exclusive(async()=>{
        const s=args;
        if(!Number.isInteger(s.ram)||s.ram<1024||s.ram>maxRam()||!Number.isInteger(s.width)||s.width<640||s.width>7680||!Number.isInteger(s.height)||s.height<480||s.height>4320||typeof s.fullscreen!=='boolean')throw Error('Paramètres incompatibles avec cette machine.');
        settings={...settings,ram:s.ram,width:s.width,height:s.height,fullscreen:s.fullscreen};await updater.atomic(path.join(root,'settings.json'),settings);return state();
    });
    if(name==='chooseFolder')return exclusive(async()=>{const result=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory'],title:'Choisir le dossier parent de Minecraft AkuMa'});if(!result.canceled){settings.installDirectory=path.join(result.filePaths[0],'AkuMaMinecraft');await updater.atomic(path.join(root,'settings.json'),settings);}return state();});
    if(name==='folder'){await fs.mkdir(gameDirectory(),{recursive:true});await shell.openPath(gameDirectory());return;}
    if(name==='discord'){if(!/^https:\/\/(discord\.gg|discord\.com)\//.test(config.discordUrl))throw Error('Lien Discord à configurer');await shell.openExternal(config.discordUrl);return;}
    if(name==='status'){
        if(!config.serverAddress)return {online:false,message:'Adresse à configurer'};
        const {getServerStatus}=require('helios-core/mojang'); const [host,p]=config.serverAddress.split(':');
        try{const s=await getServerStatus(767,host,Number(p)||25565);return {online:true,message:`${s.players.online} / ${s.players.max} joueurs`};}catch{return {online:false,message:'Serveur indisponible'};}
    }
    if(name==='check')return exclusive(async()=>{const m=await updater.feed(config),installed=await read(path.join(gameDirectory(),'.akuma/state.json'),{});return {remote:m.version,installed:installed.version||null,available:m.version!==installed.version};});
    if(name==='rollback')return exclusive(async()=>{await updater.rollback(gameDirectory());return 'Version précédente restaurée. La prochaine synchronisation suivra la version publiée.';});
    if(name==='launcherUpdate')return exclusive(async()=>{
        if(!config.launcherFeedUrl||!config.publicKey)throw Error('Mises à jour du launcher à configurer par l’administrateur.');
        const crypto=require('node:crypto'),r=await updater.response(config.launcherFeedUrl,config.allowedHosts),e=await r.json(),bytes=Buffer.from(e.payload,'base64');
        if(!crypto.verify(null,bytes,config.publicKey,Buffer.from(e.signature,'base64')))throw Error('Signature du launcher invalide');
        const m=JSON.parse(bytes),semver=require('semver');
        if(m.appId!=='fr.akuma.launcher'||!semver.valid(m.version)||!semver.gt(m.version,app.getVersion())||!/^https:\/\/.+\.exe$/.test(m.url)||!Number.isSafeInteger(m.size)||m.size<1||m.size>500e6||!/^\w{64}$/.test(m.sha256))throw Error('Aucune nouvelle version valide du launcher.');
        const target=path.join(root,'updates',`AKUMA-${m.version}.exe`);await updater.download(m,target,config.allowedHosts);
        const choice=await dialog.showMessageBox(win,{type:'question',buttons:['Installer et fermer','Plus tard'],defaultId:1,cancelId:1,message:`Installer AKUMA Launcher ${m.version} ?`,detail:'L’installateur a été vérifié avec la clé de publication AkuMa et son empreinte SHA-256.'});
        if(choice.response===0){const err=await shell.openPath(target);if(err)throw Error(err);app.quit();}return 'Mise à jour vérifiée.';
    });
    if(name==='repair'||name==='play')return exclusive(async()=>{
        const m=await updater.feed(config);
        progress({text:`Synchronisation AkuMa ${m.version}`,percent:0});
        const result=await updater.sync(gameDirectory(),m,config,progress);
        const engine=await prism.ensureEngine(gameRoot(),progress);
        await prism.configure(gameRoot(),settings,m,gateCommand());
        if(name==='repair'){progress({text:`Version ${result.version} vérifiée`,percent:100});return result;}
        game=await prism.start(gameRoot(),engine,config.serverAddress,true,()=>{game=null;progress({text:'Session Prism terminée',percent:0});if(BrowserWindow.getAllWindows().length===0)app.quit();});
        progress({text:'Prism prépare Minecraft et vérifie votre compte Microsoft',percent:100});return result;
    });
    throw Error('Action inconnue');
}
app.setName('AKUMA Launcher');
if(process.env.AKUMA_TEST_DATA)app.setPath('userData',path.join(process.env.AKUMA_TEST_DATA,'electron-profile'));
const gateIndex=process.argv.indexOf('--akuma-prelaunch');
if(gateIndex>=0){
    const target=process.argv[gateIndex+1];
    if(!target){console.error('Profil AkuMa absent');app.exit(1);}
    else require('./prism-gate.cjs').verify(path.resolve(target),config).then(()=>{console.log('AkuMa : pack signé et intégrité vérifiés.');app.exit(0);}).catch(e=>{console.error('AkuMa : '+e.message);app.exit(1);});
}else if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
    root=process.env.AKUMA_TEST_DATA||path.join(app.getPath('appData'),'AkuMaLauncher');await fs.mkdir(root,{recursive:true});
    settings=await read(path.join(root,'settings.json'),{ram:Math.min(4096,maxRam()),width:1280,height:720,fullscreen:false});
    win=new BrowserWindow({width:1180,height:780,minWidth:900,minHeight:650,backgroundColor:'#0b0910',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    win.webContents.on('will-navigate',e=>e.preventDefault());
    win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
    ipcMain.handle('akuma',async(event,name,args)=>{
        if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('Accès refusé');
        try{return {ok:true,value:await operation(name,args)};}catch(e){progress({text:e.message,percent:0});return {ok:false,error:e.message};}
    });
    await win.loadFile(path.join(__dirname,'index.html'));
    if(process.env.AKUMA_SCREENSHOT){try{win.show();win.restore();win.focus();await win.webContents.capturePage(undefined,{stayHidden:true}).then(img=>fs.writeFile(process.env.AKUMA_SCREENSHOT,img.toPNG()));}catch(e){console.error('Capture de test :',e.message);}finally{app.quit();}}
});
app.on('window-all-closed',()=>{if(!game)app.quit();});
