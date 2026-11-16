// Publica una versión nueva (obligatoria): `npm run bump -- 1.2.0 "notas de la versión"`
// Actualiza la versión en package.json, js/update.js y version.json (latest y min). Los juegos instalados con una
// versión anterior quedarán bloqueados hasta actualizar en cuanto version.json llegue a la rama main de GitHub.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),[ver,notes]=process.argv.slice(2);
if(!/^\d+\.\d+\.\d+$/.test(ver||'')){console.log('Uso: npm run bump -- 1.2.0 "notas"');process.exit(2)}
const pk=path.join(root,'package.json'),p=JSON.parse(fs.readFileSync(pk,'utf8'));
const old=p.version,cmp=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]-y[i];return 0};
if(cmp(ver,old)<=0){console.log(`La versión nueva (${ver}) debe ser mayor que la actual (${old}).`);process.exit(2)}
p.version=ver;fs.writeFileSync(pk,JSON.stringify(p,null,2)+'\n');
const up=path.join(root,'js','update.js'),s=fs.readFileSync(up,'utf8');
if(!/const APP_VERSION='[^']*'/.test(s))throw new Error('No encontré APP_VERSION en js/update.js');
fs.writeFileSync(up,s.replace(/const APP_VERSION='[^']*'/,`const APP_VERSION='${ver}'`));
const vj=path.join(root,'version.json'),v=JSON.parse(fs.readFileSync(vj,'utf8'));
Object.assign(v,{latest:ver,min:ver,exe:`NeonTempestad-Setup-${ver}.exe`,apk:`NeonTempestad-${ver}.apk`},notes?{notes}:{});delete v.sha256;fs.writeFileSync(vj,JSON.stringify(v,null,2)+'\n');
console.log(`${old} → ${ver}. Ahora: genera el .exe y el .apk, súbelos a una release v${ver} en GitHub y haz push de version.json a main.`);
