const fs=require('node:fs/promises'),path=require('node:path');
const {feed,hash,safePath}=require('./updater.cjs');
async function verify(root,config){
    const manifest=await feed(config);
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
module.exports={verify};
