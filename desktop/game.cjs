const path=require('node:path'),fs=require('node:fs/promises'),crypto=require('node:crypto');
const {MojangIndexProcessor,downloadQueue}=require('helios-core/dl');
const java=require('helios-core/java');
const {Type}=require('helios-distribution-types');
const ProcessBuilder=require('./processbuilder.cjs');
const {response}=require('./updater.cjs');
const hosts=['meta.fabricmc.net','maven.fabricmc.net','libraries.minecraft.net'];
async function prepare(root,manifest,progress) {
    progress({text:'Vérification de Java 21',percent:0});
    let executable;
    try {executable=JSON.parse(await fs.readFile(path.join(root,'java-runtime.json'),'utf8')).executable;if(!await java.validateSelectedJvm(java.ensureJavaDirIsRoot(executable),'>=21 <22'))executable=null;}catch{}
    if(!executable && process.env.JAVA_HOME){const candidate=java.ensureJavaDirIsRoot(process.env.JAVA_HOME);if(await java.validateSelectedJvm(candidate,'>=21 <22'))executable=java.javaExecFromRoot(candidate);}
    if(!executable) {
        const asset=await java.latestAdoptium(21,root); if(!asset)throw Error('Java 21 indisponible');
        await downloadQueue([asset],()=>{});
        const bytes=await fs.readFile(asset.path);
        if(crypto.createHash(asset.algo).update(bytes).digest('hex')!==asset.hash)throw Error('Java : intégrité incorrecte');
        executable=await java.extractJdk(asset.path);
    }
    if(!await java.validateSelectedJvm(java.ensureJavaDirIsRoot(executable),'>=21 <22'))throw Error('Java 21 non valide');
    await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'java-runtime.json'),JSON.stringify({executable}));
    progress({text:'Installation et vérification Minecraft 1.21.1',percent:10});
    const common=path.join(root,'common'),mojang=new MojangIndexProcessor(common,'1.21.1');
    await mojang.init();
    const missing=Object.values(await mojang.validate(async()=>{})).flat();
    if(missing.length)await downloadQueue(missing,()=>{});
    if(Object.values(await mojang.validate(async()=>{})).flat().length)throw Error('Minecraft incomplet : lancement bloqué');
    await mojang.postDownload();
    progress({text:`Installation Fabric ${manifest.fabric}`,percent:80});
    const r=await response(`https://meta.fabricmc.net/v2/versions/loader/1.21.1/${manifest.fabric}/profile/json`,hosts);
    const fabric=await r.json(),modules=[];
    if(fabric.mainClass!=='net.fabricmc.loader.impl.launch.knot.KnotClient')throw Error('Profil Fabric inattendu');
    for(const lib of fabric.libraries) {
        const [group,name,version]=lib.name.split(':');
        if(!group || !name || !version || !/^[a-zA-Z0-9._+:-]+$/.test(lib.name))throw Error('Bibliothèque Fabric invalide');
        const rel=`${group.replaceAll('.','/')}/${name}/${version}/${name}-${version}.jar`,dest=path.join(common,'libraries',rel);
        const url=new URL(rel,lib.url).href;
        const sha=(await (await response(url+'.sha1',hosts)).text()).trim().split(/\s/)[0];
        if(!/^[0-9a-f]{40}$/i.test(sha))throw Error('Empreinte Fabric absente');
        let valid=false;try{valid=crypto.createHash('sha1').update(await fs.readFile(dest)).digest('hex')===sha;}catch{}
        if(!valid) {const bytes=Buffer.from(await (await response(url,hosts)).arrayBuffer());if(crypto.createHash('sha1').update(bytes).digest('hex')!==sha)throw Error('Intégrité Fabric incorrecte');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
        modules.push({rawModule:{type:name==='fabric-loader'?Type.Fabric:Type.Library},subModules:[],getVersionlessMavenIdentifier:()=>`${group}:${name}`,getPath:()=>dest,hasSubModules:()=>false});
    }
    return {executable,vanilla:await mojang.getVersionJson(),fabric,modules};
}
function launch(root,settings,config,prepared,account) {
    require('./runtime-config.cjs').configure(settings,root,prepared.executable);
    const [hostname,p]=config.serverAddress.split(':');
    const server={rawServer:{id:'akuma',minecraftVersion:'1.21.1',autoconnect:!!hostname},modules:prepared.modules,hostname,port:Number(p)||25565};
    return new ProcessBuilder(server,prepared.vanilla,prepared.fabric,account,'0.1.0').build();
}
module.exports={prepare,launch};
