// Copia el juego web a www/ (lo que empaqueta Capacitor) con la misma estructura html/ css/ js/.
// Capacitor exige un index.html en la raíz de www/: es una redirección a html/index.html.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),www=path.join(root,'www');
const html=fs.readFileSync(path.join(root,'html','index.html'),'utf8');
const files=['html/index.html',...[...html.matchAll(/(?:src|href)="\.\.\/([^":]+\.(?:js|css))"/g)].map(m=>m[1])];
fs.rmSync(www,{recursive:true,force:true});
for(const f of files){const src=path.join(root,f);if(!fs.existsSync(src))throw new Error('html/index.html referencia un archivo que no existe: '+f);
 fs.mkdirSync(path.dirname(path.join(www,f)),{recursive:true});fs.copyFileSync(src,path.join(www,f))}
fs.writeFileSync(path.join(www,'index.html'),'<!DOCTYPE html><meta charset="UTF-8"><script>location.replace("html/index.html")</script>');
console.log(`www/ lista: ${files.length} archivos`);
