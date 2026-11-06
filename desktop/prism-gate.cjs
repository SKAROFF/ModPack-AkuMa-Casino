const fs=require('node:fs/promises'),path=require('node:path');
const {feed,hash,safePath,allowedUrl}=require('./updater.cjs');
// The pseudo comes from the AkuMa service, not from the local session file a player could edit.
async function akumaPseudo(config,token){
    if(!token)throw Error('Connexion AkuMa requise : connecte-toi à ton compte AkuMa dans le launcher.');
    const url=new URL('/api/me',config.accountUrl).href;allowedUrl(url,config.allowedHosts,config.dev);
    let r;try{r=await fetch(url,{headers:{authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw Error('Service de comptes AkuMa injoignable. Vérifiez votre connexion.');}
    const d=await r.json().catch(()=>({}));
    if(!r.ok||typeof d.pseudo!=='string')throw Error(d.error||'Compte AkuMa introuvable : reconnecte-toi dans le launcher.');
    return d.pseudo;
}
async function verify(root,config,token){
    const manifest=await feed(config,token);
    // root is <data>/prism/instances/akuma/.minecraft; Prism runs this check on every launch, even from its own window.
    if(config.accountUrl)await require('./prism.cjs').assertAccount(path.resolve(root,'..','..','..','..'),await akumaPseudo(config,token));
    const state=JSON.parse(await fs.readFile(path.join(root,'.akuma','state.json'),'utf8'));
    if(state.version!==manifest.version)throw Error('Une mise à jour AkuMa est disponible. Fermez Prism et lancez la mise à jour dans AkuMa Launcher.');
    for(const name of ['journal.json','lock'])try{await fs.stat(path.join(root,'.akuma',name));throw Error('Mise à jour en cours ou interrompue : réparer avec AkuMa Launcher.');}catch(e){if(e.code!=='ENOENT')throw e;}
    const resolvedRoot=await fs.realpath(root);
    for(const file of manifest.files){
        safePath(file.path);const actual=await fs.realpath(path.join(root,file.path));
        if(!actual.toLowerCase().startsWith(resolvedRoot.toLowerCase()+path.sep))throw Error('Fichier AkuMa hors du dossier du jeu');
        const bytes=await fs.readFile(actual);
        if(file.policy!=='preserve'&&hash(bytes)!==file.sha256)throw Error(`Fichier AkuMa incorrect : ${file.path}. Réparez avec AkuMa Launcher.`);
    }
    return manifest.version;
}
module.exports={verify,akumaPseudo};
