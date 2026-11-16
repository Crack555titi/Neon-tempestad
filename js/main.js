// Escritorio (Electron): una ventana que carga el juego tal cual. F11 pantalla completa, F12 herramientas.
const {app,BrowserWindow,Menu,shell,ipcMain}=require('electron'),path=require('path'),{spawn}=require('child_process');
const {downloadInstaller}=require('./updater');

function createWindow(){
 const win=new BrowserWindow({width:1280,height:720,minWidth:960,minHeight:540,backgroundColor:'#05030d',title:'Neón Tempestad',
  autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,preload:path.join(__dirname,'preload.js')}});
 Menu.setApplicationMenu(null);
 win.webContents.on('before-input-event',(e,i)=>{if(i.type!=='keyDown')return;
  if(i.key==='F11'){win.setFullScreen(!win.isFullScreen());e.preventDefault()}
  if(i.key==='F12'){win.webContents.toggleDevTools();e.preventDefault()}});
 // los enlaces se abren en el navegador del sistema, nunca dentro del juego (solo los del repositorio: descarga de actualizaciones)
 win.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/github\.com\/Crack555titi\//.test(url))shell.openExternal(url);return {action:'deny'}});
 win.loadFile(path.join(__dirname,'..','html','index.html'));
}

// actualización: descarga y verifica el instalador nuevo, lo ejecuta en silencio (se instala encima de esta versión)
// y cierra el juego; el instalador lo vuelve a abrir al terminar (--force-run)
ipcMain.handle('neon-update',async(e,{url,sha256})=>{
 if(!app.isPackaged)throw new Error('la actualización automática solo funciona en la versión instalada');
 const file=await downloadInstaller(url,sha256,p=>{if(!e.sender.isDestroyed())e.sender.send('neon-update-progress',p)});
 spawn(file,['/S','--force-run'],{detached:true,stdio:'ignore'}).unref();
 setTimeout(()=>app.quit(),400);return true});

app.whenReady().then(createWindow);
app.on('window-all-closed',()=>app.quit());
