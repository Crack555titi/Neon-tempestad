// Escritorio (Electron): una ventana que carga el juego tal cual. F11 pantalla completa, F12 herramientas.
const {app,BrowserWindow,Menu}=require('electron'),path=require('path');

function createWindow(){
 const win=new BrowserWindow({width:1280,height:720,minWidth:960,minHeight:540,backgroundColor:'#05030d',title:'Neón Tempestad',
  autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
 Menu.setApplicationMenu(null);
 win.webContents.on('before-input-event',(e,i)=>{if(i.type!=='keyDown')return;
  if(i.key==='F11'){win.setFullScreen(!win.isFullScreen());e.preventDefault()}
  if(i.key==='F12'){win.webContents.toggleDevTools();e.preventDefault()}});
 // los enlaces externos (si alguno) se abren fuera, nunca dentro del juego
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.loadFile(path.join(__dirname,'index.html'));
}
app.whenReady().then(createWindow);
app.on('window-all-closed',()=>app.quit());
