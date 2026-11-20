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
// la pantalla de carga ahora es JPEG: se quita el splash.png de Capacitor para que Android no vea dos recursos «splash»
for(const d of fs.readdirSync(path.join(main,'res')))fs.rmSync(path.join(main,'res',d,'splash.png'),{force:true});
fs.cpSync(path.join(root,'build','android','res'),path.join(main,'res'),{recursive:true});
const bg=path.join(main,'res','values','ic_launcher_background.xml');  // fondo de la capa trasera del icono adaptativo
fs.writeFileSync(bg,'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#05030D</color>\n</resources>\n');
console.log('Iconos y pantalla de carga copiados');
// pantalla completa inmersiva (sin barras de estado ni de navegación, también bajo el notch),
// pantalla siempre encendida y aceleración por GPU: el juego usa todo el teléfono y no se apaga mientras juegas
const act=path.join(main,'java','com','neontempestad','juego','MainActivity.java');
fs.writeFileSync(act,`package com.neontempestad.juego;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    if(Build.VERSION.SDK_INT>=28)getWindow().getAttributes().layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;immersive();}
  @Override public void onWindowFocusChanged(boolean f){super.onWindowFocusChanged(f);if(f)immersive();}
  private void immersive(){WindowCompat.setDecorFitsSystemWindows(getWindow(),false);
    WindowInsetsControllerCompat c=WindowCompat.getInsetsController(getWindow(),getWindow().getDecorView());
    c.hide(WindowInsetsCompat.Type.systemBars());c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);}
}
`);
let ms=fs.readFileSync(f,'utf8');if(!/hardwareAccelerated/.test(ms))ms=ms.replace(/<application\b/,'<application android:hardwareAccelerated="true"');fs.writeFileSync(f,ms);
console.log('Pantalla completa inmersiva y pantalla siempre encendida');
