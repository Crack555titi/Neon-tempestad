// Prepara el proyecto Android que genera Capacitor (`npx cap add android`):
// bloquea la orientación horizontal y pone los iconos y la pantalla de carga de build/android/res (tools/make-icons.js).
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),main=path.join(root,'android','app','src','main');
const f=path.join(main,'AndroidManifest.xml');
if(!fs.existsSync(f)){console.log('No existe android/: ejecuta antes `npx cap add android`.');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(/screenOrientation=/.test(s))s=s.replace(/android:screenOrientation="[^"]*"/,'android:screenOrientation="sensorLandscape"');
else s=s.replace(/<activity\b/,'<activity android:screenOrientation="sensorLandscape"');
if(!/sensorLandscape/.test(s))throw new Error('No encontré la <activity> en AndroidManifest.xml');
fs.writeFileSync(f,s);console.log('Orientación horizontal bloqueada en AndroidManifest.xml');
// versión de la app = la de package.json; versionCode 1.2.3 → 10203 (Android exige que suba en cada actualización)
const ver=require('../package.json').version,code=ver.split('.').reduce((a,n)=>a*100+Number(n),0),gf=path.join(root,'android','app','build.gradle');
let gs=fs.readFileSync(gf,'utf8');if(!/versionCode \d+/.test(gs))throw new Error('No encontré versionCode en android/app/build.gradle');
fs.writeFileSync(gf,gs.replace(/versionCode \d+/,'versionCode '+code).replace(/versionName "[^"]*"/,`versionName "${ver}"`));console.log(`Versión ${ver} (código ${code})`);
// iconos y splash: copia build/android/res encima de android/app/src/main/res
fs.cpSync(path.join(root,'build','android','res'),path.join(main,'res'),{recursive:true});
const bg=path.join(main,'res','values','ic_launcher_background.xml');  // fondo de la capa trasera del icono adaptativo
fs.writeFileSync(bg,'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#05030D</color>\n</resources>\n');
console.log('Iconos y pantalla de carga copiados');
