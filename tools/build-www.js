// Copia el juego web a www/ (lo que empaqueta Capacitor). La lista de scripts sale de index.html.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),www=path.join(root,'www');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const files=['index.html',...[...html.matchAll(/(?:src|href)="([^":]+\.(?:js|css))"/g)].map(m=>m[1])];
fs.rmSync(www,{recursive:true,force:true});fs.mkdirSync(www);
for(const f of files){if(!fs.existsSync(path.join(root,f)))throw new Error('index.html referencia un archivo que no existe: '+f);
 fs.copyFileSync(path.join(root,f),path.join(www,f))}
console.log(`www/ lista: ${files.length} archivos`);
