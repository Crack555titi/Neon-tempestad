// Bloquea la orientación horizontal en el proyecto Android que genera Capacitor (`npx cap add android`).
const fs=require('fs'),path=require('path');
const f=path.join(__dirname,'..','android','app','src','main','AndroidManifest.xml');
if(!fs.existsSync(f)){console.log('No existe android/: ejecuta antes `npx cap add android`.');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(/screenOrientation=/.test(s))s=s.replace(/android:screenOrientation="[^"]*"/,'android:screenOrientation="sensorLandscape"');
else s=s.replace(/<activity\b/,'<activity android:screenOrientation="sensorLandscape"');
if(!/sensorLandscape/.test(s))throw new Error('No encontré la <activity> en AndroidManifest.xml');
fs.writeFileSync(f,s);console.log('Orientación horizontal bloqueada en AndroidManifest.xml');
