// Descarga del instalador nuevo para la versión de escritorio (lo usa js/main.js, proceso principal de Electron).
// Solo acepta instaladores de las releases del repositorio y comprueba la huella SHA-256 publicada en version.json
// antes de devolver la ruta: un archivo corrupto o distinto del publicado nunca se ejecuta.
const https=require('https'),fs=require('fs'),crypto=require('crypto'),path=require('path'),os=require('os');
const ALLOWED=/^https:\/\/github\.com\/Crack555titi\/Neon-tempestad\/releases\/download\/v\d+\.\d+\.\d+\/NeonTempestad-Setup-\d+\.\d+\.\d+\.exe$/;

// GET siguiendo redirecciones (GitHub manda las descargas a su CDN)
function get(url,hops=0){return new Promise((res,rej)=>{
 https.get(url,{headers:{'User-Agent':'NeonTempestad-Updater'}},r=>{
  if([301,302,303,307,308].includes(r.statusCode)&&r.headers.location){r.resume();if(hops>=5)return rej(new Error('demasiadas redirecciones'));
   return res(get(new URL(r.headers.location,url).href,hops+1))}
  if(r.statusCode!==200){r.resume();return rej(new Error('HTTP '+r.statusCode))}res(r)}).on('error',rej)})}

// descarga url a dest calculando el SHA-256 al vuelo; borra el archivo si la huella no coincide
async function fetchVerified(url,sha256,dest,onProgress){
 if(!/^[0-9a-f]{64}$/.test(sha256||''))throw new Error('falta la huella SHA-256 de la versión');
 const r=await get(url),total=+r.headers['content-length']||0,h=crypto.createHash('sha256'),out=fs.createWriteStream(dest);let got=0;
 await new Promise((res,rej)=>{r.on('data',d=>{got+=d.length;h.update(d);if(total&&onProgress)onProgress(got/total)});r.on('error',rej);out.on('error',rej);out.on('finish',res);r.pipe(out)});
 if(h.digest('hex')!==sha256){fs.rmSync(dest,{force:true});throw new Error('el archivo descargado no coincide con la versión publicada')}
 return dest}

async function downloadInstaller(url,sha256,onProgress){
 if(!ALLOWED.test(url))throw new Error('dirección de actualización no permitida');
 return fetchVerified(url,sha256,path.join(os.tmpdir(),path.basename(new URL(url).pathname)),onProgress)}

module.exports={downloadInstaller,fetchVerified,ALLOWED};
