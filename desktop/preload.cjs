const {contextBridge,ipcRenderer}=require('electron');
const allowed=new Set(['state','login','logout','settings','folder','chooseFolder','launcherUpdate','discord','status','check','rollback','repair','play']);
contextBridge.exposeInMainWorld('akuma',{call:(name,args)=>{if(!allowed.has(name))throw Error('Action interdite');return ipcRenderer.invoke('akuma',name,args);},onProgress:callback=>ipcRenderer.on('progress',(_e,p)=>callback(p))});
