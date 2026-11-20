'use strict';
/* ===================== ACTUALIZACIONES OBLIGATORIAS =====================
   Al abrir el juego (y cada 30 min) se lee version.json de la rama main del repositorio público:
     {"latest":"1.2.0","min":"1.2.0","notes":"…","url":"…/releases/latest"}
   - versión instalada < min    → pantalla de bloqueo: hay que descargar la nueva para seguir jugando.
   - versión instalada < latest → aviso no obligatorio en el menú.
   Si se descubre en mitad de una partida, el bloqueo espera a que esta termine (nunca se pierde una run).
   shortcut: sin conexión (o si GitHub no responde) se deja jugar; bloquear sin red dejaría el juego inutilizable offline.
   Publicar una versión nueva: `npm run release -- 1.3.0 "notas"` (versión, instalables, release y main, en ese orden). */
const APP_VERSION='1.4.2';  // la mantiene en sincronía con package.json tools/bump.js
const UPDATE_URL='https://raw.githubusercontent.com/Crack555titi/Neon-tempestad/main/version.json';
const RELEASES_URL='https://github.com/Crack555titi/Neon-tempestad/releases/latest';

// compara versiones x.y.z → negativo, 0 o positivo
const cmpVer=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);
 for(let i=0;i<3;i++){const d=(x[i]||0)-(y[i]||0);if(d)return d}return 0};

const Update={info:null,required:false,
 async check(){
  try{const ctl=typeof AbortController!=='undefined'?new AbortController():null,tm=ctl&&setTimeout(()=>ctl.abort(),6000);
   const r=await fetch(UPDATE_URL+'?t='+Date.now(),{cache:'no-store',signal:ctl&&ctl.signal});clearTimeout(tm);if(!r.ok)return;
   const v=await r.json();if(!v||typeof v.latest!=='string')return;
   this.info=v;this.required=!!v.min&&cmpVer(APP_VERSION,v.min)<0;
   if(this.required)this.block();else if(cmpVer(APP_VERSION,v.latest)<0)this.notice()}
  catch(e){}},  // sin red: se juega con la versión actual
 // escritorio instalado: descarga, verifica e instala encima solo · Android: descarga directa del APK (se instala encima)
 // · navegador o sin datos: página de descargas
 open(){const v=this.info||{},w=typeof window!=='undefined'?window:{},dl=f=>`https://github.com/Crack555titi/Neon-tempestad/releases/download/v${v.latest}/${f}`;
  if(w.neonDesktop&&v.exe&&v.sha256)return this.autoUpdate(dl(v.exe),v.sha256);
  if(w.Capacitor&&v.apk){location.href=dl(v.apk);return}
  const u=/^https:\/\/github\.com\//.test(v.url||'')?v.url:RELEASES_URL;if(w.Capacitor)location.href=u;else window.open(u,'_blank')},
 async autoUpdate(url,sha256){const b=$('updDl');b.disabled=true;b.textContent='Descargando… 0%';
  window.neonDesktop.onProgress(p=>{b.textContent=`Descargando… ${Math.round(p*100)}%`});
  try{await window.neonDesktop.update({url,sha256});b.textContent='Instalando… el juego se abrirá solo'}
  catch(e){b.disabled=false;b.textContent='DESCARGAR LA NUEVA VERSIÓN';$('updN').textContent=`No se pudo actualizar automáticamente (${e.message}). Descárgala desde la página.`;
   window.open(RELEASES_URL,'_blank')}},
 block(){if(S&&S.st!=='over'){clearTimeout(this.wait);this.wait=setTimeout(()=>this.block(),2000);return}  // espera a que acabe la partida
  for(const id of ['title','menu','shop','login','rank','end','opts','ctrls'])$(id).style.display='none';
  $('updV').textContent=`Tienes la versión ${APP_VERSION}. La ${this.info.latest} es obligatoria para seguir jugando.`;
  $('updN').textContent=this.info.notes||'';$('update').style.display='flex';
  $('updDl').textContent=typeof window!=='undefined'&&window.neonDesktop&&this.info.sha256?'⬆ ACTUALIZAR AHORA':'DESCARGAR LA NUEVA VERSIÓN'},
 notice(){$('updBar').innerHTML=`✨ Versión ${esc(this.info.latest)} disponible · <a href="#" id="updGet">descargar</a>`;$('updBar').style.display='block';
  $('updGet').onclick=e=>{e.preventDefault();this.open()}}
};
$('updDl').onclick=()=>Update.open();
$('verTag').textContent='v'+APP_VERSION;
if(typeof fetch!=='undefined'){Update.check();setInterval(()=>{if(!Update.required)Update.check()},30*60*1000)}
