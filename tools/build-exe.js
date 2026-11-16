// Genera el instalador de Windows: `npm run dist` → dist/NeonTempestad-Setup-<versión>.exe (se instala encima de la versión anterior)
// Construye en una carpeta temporal y solo copia el .exe a dist/: dentro del proyecto, VS Code deja abiertos los .asar
// de compilaciones anteriores y electron-builder falla con EBUSY. Antes, borra de dist/ las versiones anteriores.
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const root=path.join(__dirname,'..'),ver=require('../package.json').version,name=`NeonTempestad-Setup-${ver}.exe`;
require('./clean-dist')();
const tmp=path.join(os.tmpdir(),'neon-tempestad-build');fs.rmSync(tmp,{recursive:true,force:true});
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;  // la terminal de VS Code la define y haría que Electron arranque como Node
execFileSync('npx',['electron-builder','--win','nsis',`-c.directories.output=${tmp}`],{cwd:root,env,stdio:'inherit',shell:process.platform==='win32'});
fs.copyFileSync(path.join(tmp,name),path.join(root,'dist',name));
fs.rmSync(tmp,{recursive:true,force:true});
console.log('EXE listo:',path.join(root,'dist',name));
