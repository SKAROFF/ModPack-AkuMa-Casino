const {app,BrowserWindow,ipcMain,shell,safeStorage,dialog}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const config=require('./config.json'),updater=require('./updater.cjs'),auth=require('./auth.cjs');
let win,busy=false,game=null,session=null,settings,root;
const maxRam=()=>Math.max(1024,Math.floor((os.totalmem()/1024**2-2048)/512)*512);
const progress=p=>{if(win&&!win.isDestroyed())win.webContents.send('progress',p);};
const gameRoot=()=>settings.installDirectory||root;
async function read(p,fallback){try{return JSON.parse(await fs.readFile(p,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
async function saveSession(account){
    if(!safeStorage.isEncryptionAvailable())throw Error('Le coffre Windows est indisponible.');
    await fs.writeFile(path.join(root,'session.bin'),safeStorage.encryptString(JSON.stringify({refreshToken:account.refreshToken,displayName:account.displayName})));
    session=account;
}
async function exclusive(fn){if(busy||game)throw Error('Une opération ou Minecraft est déjà en cours.');busy=true;try{return await fn();}finally{busy=false;}}
function state(){return {settings,maxRam:maxRam(),account:session?.displayName||null,configured:!!(config.feedUrl&&config.publicKey&&config.microsoftClientId&&config.serverAddress),news:config.news,version:app.getVersion()};}
async function operation(name,args){
    if(name==='state')return state();
    if(name==='login')return exclusive(async()=>{await saveSession(await auth.login(config.microsoftClientId,u=>shell.openExternal(u)));return state();});
    if(name==='logout')return exclusive(async()=>{session=null;await fs.rm(path.join(root,'session.bin'),{force:true});return state();});
    if(name==='settings')return exclusive(async()=>{
        const s=args;
        if(!Number.isInteger(s.ram)||s.ram<1024||s.ram>maxRam()||!Number.isInteger(s.width)||s.width<640||s.width>7680||!Number.isInteger(s.height)||s.height<480||s.height>4320||typeof s.fullscreen!=='boolean')throw Error('Paramètres incompatibles avec cette machine.');
        settings={...settings,ram:s.ram,width:s.width,height:s.height,fullscreen:s.fullscreen};await updater.atomic(path.join(root,'settings.json'),settings);return state();
    });
    if(name==='chooseFolder')return exclusive(async()=>{const result=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory'],title:'Choisir le dossier parent de Minecraft AkuMa'});if(!result.canceled){settings.installDirectory=path.join(result.filePaths[0],'AkuMaMinecraft');await updater.atomic(path.join(root,'settings.json'),settings);}return state();});
    if(name==='folder'){await fs.mkdir(path.join(gameRoot(),'instances','akuma'),{recursive:true});await shell.openPath(path.join(gameRoot(),'instances','akuma'));return;}
    if(name==='discord'){if(!/^https:\/\/(discord\.gg|discord\.com)\//.test(config.discordUrl))throw Error('Lien Discord à configurer');await shell.openExternal(config.discordUrl);return;}
    if(name==='status'){
        if(!config.serverAddress)return {online:false,message:'Adresse à configurer'};
        const {getServerStatus}=require('helios-core/mojang'); const [host,p]=config.serverAddress.split(':');
        try{const s=await getServerStatus(767,host,Number(p)||25565);return {online:true,message:`${s.players.online} / ${s.players.max} joueurs`};}catch{return {online:false,message:'Serveur indisponible'};}
    }
    if(name==='check')return exclusive(async()=>{const m=await updater.feed(config),installed=await read(path.join(gameRoot(),'instances/akuma/.akuma/state.json'),{});return {remote:m.version,installed:installed.version||null,available:m.version!==installed.version};});
    if(name==='rollback')return exclusive(async()=>{await updater.rollback(path.join(gameRoot(),'instances','akuma'));return 'Version précédente restaurée. La prochaine synchronisation suivra la version publiée.';});
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
        const result=await updater.sync(path.join(gameRoot(),'instances','akuma'),m,config,progress);
        const prepared=await require('./game.cjs').prepare(gameRoot(),m,progress);
        if(name==='repair'){progress({text:`Version ${result.version} vérifiée`,percent:100});return result;}
        if(!session?.refreshToken)throw Error('Connectez votre compte Microsoft pour jouer.');
        await saveSession(await auth.refresh(config.microsoftClientId,session.refreshToken));
        game=require('./game.cjs').launch(gameRoot(),settings,config,prepared,session);
        game.once('error',()=>{game=null;progress({text:'Le démarrage de Minecraft a échoué.',percent:0});});
        game.once('close',code=>{game=null;progress({text:`Minecraft fermé (${code})`,percent:0});if(BrowserWindow.getAllWindows().length===0)app.quit();});
        progress({text:'Minecraft est lancé',percent:100});return result;
    });
    throw Error('Action inconnue');
}
app.setName('AKUMA Launcher');
if(process.env.AKUMA_TEST_DATA)app.setPath('userData',path.join(process.env.AKUMA_TEST_DATA,'electron-profile'));
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
    root=process.env.AKUMA_TEST_DATA||path.join(app.getPath('appData'),'AkuMaLauncher');await fs.mkdir(root,{recursive:true});
    settings=await read(path.join(root,'settings.json'),{ram:Math.min(4096,maxRam()),width:1280,height:720,fullscreen:false});
    try{session=JSON.parse(safeStorage.decryptString(await fs.readFile(path.join(root,'session.bin'))));}catch{}
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
