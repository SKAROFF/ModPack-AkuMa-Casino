const {test}=require('node:test'),assert=require('node:assert/strict');
const {update}=require('../desktop/servers.cjs');
const s=v=>{const b=Buffer.from(v),l=Buffer.alloc(2);l.writeUInt16BE(b.length);return Buffer.concat([l,b]);};
const t=(type,name,value)=>Buffer.concat([Buffer.from([type]),s(name),value]);
const entry=(ip,name,extra=[])=>Buffer.concat([t(8,'ip',s(ip)),t(8,'name',s(name)),...extra,Buffer.from([0])]);
const file=(...entries)=>{const n=Buffer.alloc(5);n[0]=10;n.writeInt32BE(entries.length,1);return Buffer.concat([Buffer.from([10,0,0]),t(9,'servers',Buffer.concat([n,...entries])),Buffer.from([0])]);};
const options={address:'akumon.mine.fun',name:'AkuMon',retired:['akuma-casino.mine.fun']};
const fresh=accept=>Buffer.concat([t(1,'hidden',Buffer.from([0])),t(8,'ip',s(options.address)),t(8,'name',s(options.name)),...(accept===undefined?[]:[t(1,'acceptTextures',Buffer.from([accept]))]),Buffer.from([0])]);
test('the retired server is replaced, its resource pack choice kept, and other servers stay byte for byte',()=>{
    const mine=entry('play.example.net','Mon serveur 🎮',[t(8,'icon',s('abc')),t(1,'hidden',Buffer.from([0]))]);
    const out=update(file(entry('akuma-casino.mine.fun','AkuMa Casino',[t(8,'icon',s('old')),t(1,'acceptTextures',Buffer.from([1]))]),mine,entry('AKUMA-casino.mine.fun:25565','Serveur Minecraft',[t(1,'hidden',Buffer.from([1]))])),options);
    assert.deepEqual(out,file(fresh(1),mine));
});
test('a new player gets the server, and a right list is not rewritten',()=>{
    const out=update(null,options);
    assert.deepEqual(out,file(fresh()));
    assert.equal(update(out,options),null);
});
test('a server only hidden by a direct join still gets a visible entry',()=>{
    const hidden=entry('akumon.mine.fun','Minecraft Server',[t(1,'hidden',Buffer.from([1]))]);
    assert.deepEqual(update(file(hidden),options),file(fresh(),hidden));
});
test('an unreadable file is refused instead of being overwritten',()=>{
    const good=file(entry('a.example','A'));
    assert.throws(()=>update(good.subarray(0,good.length-4),options));
    assert.throws(()=>update(Buffer.from([0x1f,0x8b,8,0]),options));
    assert.throws(()=>update(Buffer.concat([good,Buffer.from([0])]),options),/illisible/);
});
