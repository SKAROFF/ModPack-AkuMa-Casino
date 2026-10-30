const test=require('node:test'),assert=require('node:assert'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {download,hash}=require('../desktop/updater.cjs');
test('private bucket token is sent only to its download host',async()=>{
    const seen=[],server=http.createServer((req,res)=>{seen.push(req.headers.authorization||null);res.end('pack');});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'akuma-b2-'));
    try{
        const f={url:`http://127.0.0.1:${server.address().port}/file`,size:4,sha256:hash(Buffer.from('pack'))};
        await download(f,path.join(tmp,'a'),[],true,{host:'127.0.0.1',token:'b2-token'});
        await download(f,path.join(tmp,'b'),[],true,{host:'f003.backblazeb2.com',token:'b2-token'});
        assert.deepEqual(seen,['b2-token',null]);
    }finally{server.close();await fs.rm(tmp,{recursive:true,force:true});}
});
