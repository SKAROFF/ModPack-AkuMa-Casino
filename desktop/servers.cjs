const fs=require('node:fs/promises');
// Minecraft's servers.dat is uncompressed NBT. Other entries are copied byte for byte: their names use Java's own UTF-8 variant.
const WIDTH={1:1,2:2,3:4,4:8,5:4,6:8};
function end(b,i,type){
    if(WIDTH[type])return i+WIDTH[type];
    if(type===7)return i+4+b.readInt32BE(i);
    if(type===8)return i+2+b.readUInt16BE(i);
    if(type===9){const element=b[i],n=b.readInt32BE(i+1);i+=5;for(let k=0;k<n;k++)i=end(b,i,element);return i;}
    if(type===10)return fields(b,i).close+1;
    if(type===11)return i+4+4*b.readInt32BE(i);
    if(type===12)return i+4+8*b.readInt32BE(i);
    throw Error('servers.dat illisible');
}
function fields(b,i){
    const list=[];
    while(b[i]!==0){const type=b[i],value=i+3+b.readUInt16BE(i+1),stop=end(b,value,type);list.push({type,name:b.toString('utf8',i+3,value),start:i,value,end:stop});i=stop;}
    return {list,close:i};
}
const text=s=>{const v=Buffer.from(s),l=Buffer.alloc(2);l.writeUInt16BE(v.length);return Buffer.concat([l,v]);};
const tag=(type,name,value)=>{const n=Buffer.from(name),h=Buffer.alloc(3);h[0]=type;h.writeUInt16BE(n.length,1);return Buffer.concat([h,n,value]);};
const host=ip=>ip.toLowerCase().replace(/:\d+$/,'');
// Returns the new file, or null when the list is already right. Throws on a file it cannot read, which must then stay untouched.
function update(bytes,{address,name,retired=[]}){
    const b=bytes||Buffer.from([10,0,0,0]);
    if(b[0]!==10)throw Error('servers.dat illisible');
    const body=3+b.readUInt16BE(1),root=fields(b,body);
    if(root.close+1!==b.length)throw Error('servers.dat illisible');
    const servers=root.list.find(f=>f.name==='servers'&&f.type===9);
    if(servers&&b[servers.value]!==10&&b[servers.value]!==0)throw Error('servers.dat illisible');
    const entries=[];
    if(servers){let i=servers.value+5;for(let k=b.readInt32BE(servers.value+1);k>0;k--){
        const f=fields(b,i),get=n=>f.list.find(x=>x.name===n),ip=get('ip');
        entries.push({raw:b.subarray(i,f.close+1),ip:ip?.type===8?b.toString('utf8',ip.value+2,ip.end):'',hidden:get('hidden')?.type===1&&b[get('hidden').value]===1,accept:get('acceptTextures')?.type===1?b[get('acceptTextures').value]:null});
        i=f.close+1;
    }}
    const old=entries.filter(e=>retired.includes(host(e.ip))),kept=entries.filter(e=>!old.includes(e)),present=kept.some(e=>!e.hidden&&e.ip===address);
    if(present&&!old.length)return null;
    const accept=old.find(e=>!e.hidden&&e.accept!==null)?.accept,added=present?[]:[Buffer.concat([tag(1,'hidden',Buffer.from([0])),tag(8,'ip',text(address)),tag(8,'name',text(name)),...(accept==null?[]:[tag(1,'acceptTextures',Buffer.from([accept]))]),Buffer.from([0])])];
    const all=[...added,...kept.map(e=>e.raw)],count=Buffer.alloc(5);count[0]=10;count.writeInt32BE(all.length,1);
    const list=tag(9,'servers',Buffer.concat([count,...all]));
    return servers?Buffer.concat([b.subarray(0,servers.start),list,b.subarray(servers.end)]):Buffer.concat([b.subarray(0,root.close),list,b.subarray(root.close)]);
}
async function ensure(file,options){
    let bytes=null;try{bytes=await fs.readFile(file);}catch(e){if(e.code!=='ENOENT')throw e;}
    const next=update(bytes,options);if(!next)return false;
    const staging=file+'.akuma-tmp';await fs.writeFile(staging,next);await fs.rename(staging,file);return true;
}
module.exports={update,ensure};
