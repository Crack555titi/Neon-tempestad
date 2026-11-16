// Deja en dist/ solo los instalables de la versión actual: borra los .exe/.apk de versiones anteriores y restos de compilaciones.
// Lo usan tools/build-exe.js y tools/build-apk.js; también se puede ejecutar solo: `node tools/clean-dist.js`.
const fs=require('fs'),path=require('path');
function cleanDist(){
 const dir=path.join(__dirname,'..','dist'),ver=require('../package.json').version;fs.mkdirSync(dir,{recursive:true});
 for(const f of fs.readdirSync(dir)){
  const m=f.match(/^NeonTempestad-(?:Setup-)?(\d+\.\d+\.\d+)(-portable)?\.(exe|apk)$/);
  if(m&&m[1]===ver)continue;  // los de esta versión se quedan
  // shortcut: si VS Code tiene abierta una carpeta vieja (bloqueo EBUSY de los .asar) se avisa y se sigue; se borra en otra ocasión
  try{fs.rmSync(path.join(dir,f),{recursive:true,force:true});console.log('dist: borrado',f)}catch(e){console.log('dist: no se pudo borrar',f,'(en uso; se reintentará la próxima vez)')}}
}
module.exports=cleanDist;
if(require.main===module)cleanDist();
