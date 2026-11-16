// Puente seguro entre el juego y Electron: lo único que la página puede pedir es actualizar a la versión publicada.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('neonDesktop',{
 update:info=>ipcRenderer.invoke('neon-update',{url:String(info.url),sha256:String(info.sha256)}),
 onProgress:cb=>{ipcRenderer.removeAllListeners('neon-update-progress');ipcRenderer.on('neon-update-progress',(e,p)=>cb(+p))}
});
