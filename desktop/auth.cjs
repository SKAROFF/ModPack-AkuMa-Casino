const crypto=require('node:crypto'), http=require('node:http');
const {MicrosoftAuth}=require('helios-core/microsoft');
const scope='XboxLive.signin offline_access';
async function json(url,options) {
    const r=await fetch(url,{...options,signal:AbortSignal.timeout(45000)});
    if(!r.ok)throw Error(`Connexion Microsoft/Minecraft refusée (${r.status}). Vérifiez votre licence Java, votre compte Xbox et l’approbation de l’application AkuMa.`);
    return r.json();
}
async function minecraft(ms) {
    const post=(url,body)=>json(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});
    const xbl=await post(MicrosoftAuth.XBL_AUTH_ENDPOINT,{Properties:{AuthMethod:'RPS',SiteName:'user.auth.xboxlive.com',RpsTicket:`d=${ms.access_token}`},RelyingParty:'http://auth.xboxlive.com',TokenType:'JWT'});
    const xsts=await post(MicrosoftAuth.XSTS_AUTH_ENDPOINT,{Properties:{SandboxId:'RETAIL',UserTokens:[xbl.Token]},RelyingParty:'rp://api.minecraftservices.com/',TokenType:'JWT'});
    const mc=await post(MicrosoftAuth.MC_AUTH_ENDPOINT,{identityToken:`XBL3.0 x=${xsts.DisplayClaims.xui[0].uhs};${xsts.Token}`});
    const ent=await json(MicrosoftAuth.MC_ENTITLEMENT_ENDPOINT,{headers:{Authorization:`Bearer ${mc.access_token}`}});
    if(!ent.items?.length)throw Error('Aucune licence Minecraft Java valide détectée.');
    const profile=await json(MicrosoftAuth.MC_PROFILE_ENDPOINT,{headers:{Authorization:`Bearer ${mc.access_token}`}});
    return {uuid:profile.id,displayName:profile.name,accessToken:mc.access_token,type:'microsoft',refreshToken:ms.refresh_token};
}
async function refresh(clientId,token) {
    const ms=await json(MicrosoftAuth.TOKEN_ENDPOINT,{method:'POST',body:new URLSearchParams({client_id:clientId,grant_type:'refresh_token',refresh_token:token,scope})});
    return minecraft(ms);
}
async function login(clientId,open) {
    if(!/^[0-9a-f-]{36}$/i.test(clientId||''))throw Error('L’administrateur doit configurer une application Microsoft AkuMa approuvée.');
    const state=crypto.randomBytes(32).toString('hex'),verifier=crypto.randomBytes(48).toString('base64url');
    let resolve,reject; const result=new Promise((a,b)=>{resolve=a;reject=b;});
    const server=http.createServer(async(req,res)=>{
        const u=new URL(req.url,'http://127.0.0.1');
        if(u.pathname!=='/callback'){res.writeHead(404).end();return;}
        if(u.searchParams.get('state')!==state){res.writeHead(400).end('Invalid state');return;}
        res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'}).end('Vous pouvez revenir dans AkuMa Launcher.');
        if(!u.searchParams.get('code')){reject(Error('Connexion annulée.'));return;}
        try {const ms=await json(MicrosoftAuth.TOKEN_ENDPOINT,{method:'POST',body:new URLSearchParams({client_id:clientId,grant_type:'authorization_code',code:u.searchParams.get('code'),redirect_uri:redirect,code_verifier:verifier,scope})});resolve(await minecraft(ms));}catch(e){reject(e);}
    });
    await new Promise((a,b)=>{server.once('error',b);server.listen(0,'127.0.0.1',a);});
    const redirect=`http://localhost:${server.address().port}/callback`;
    const timeout=setTimeout(()=>reject(Error('Connexion expirée. Réessayez.')),180000);
    try {await open('https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?'+new URLSearchParams({client_id:clientId,response_type:'code',redirect_uri:redirect,scope,state,code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'}));return await result;}
    finally {clearTimeout(timeout);server.close();}
}
module.exports={login,refresh};
