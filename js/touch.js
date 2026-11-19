'use strict';
/* ===================== CONTROLES TÁCTILES =====================
   Joystick izquierdo (aparece donde apoyas el dedo): moverse; hacia abajo = bajar de plataforma.
   Botones: saltar, secundaria, movimiento, definitiva, interactuar, inventario y pausa.
   Apuntado (Opciones): «auto» = botón de disparo que apunta solo al enemigo más cercano;
   «joystick» = joystick derecho que apunta y dispara mientras lo arrastras.
   Se activa solo en pantallas táctiles (o siempre/nunca según Opciones) y pide orientación horizontal. */
const isTouchDevice=()=>typeof matchMedia!=='undefined'&&matchMedia('(pointer:coarse)').matches;
const touchOn=()=>{const m=Save.d.settings.touch;return m==='on'||(m==='auto'&&isTouchDevice())};
let TUI=null;
function buildTouch(){
 if(TUI||typeof document.createElement!=='function'||!$('wrap'))return;
 const root=document.createElement('div');root.id='touch';
 root.innerHTML=`<div class="tzone" id="tzL"><div class="stick"><div class="nub"></div></div></div>
  <div class="tzone" id="tzR"><div class="stick"><div class="nub"></div></div></div>
  <button class="tb big" data-a="primary" id="tFire">✦</button><button class="tb" data-a="jump" style="right:16px;bottom:16px">⤒</button>
  <button class="tb" data-a="secondary" style="right:92px;bottom:26px">◈</button><button class="tb" data-a="move" style="right:24px;bottom:92px">»</button>
  <button class="tb" data-a="ult" style="right:100px;bottom:100px">★</button><button class="tb small" data-a="interact" id="tUse" style="right:170px;bottom:30px">E</button><button class="tb small" data-a="parry" style="right:178px;bottom:210px">⛨</button>
  <button class="tb small" data-a="inventory" style="left:12px;top:38%">☰</button><button class="tb small" data-a="pause" style="left:12px;top:calc(38% + 56px)">❚❚</button>`;
 $('wrap').appendChild(root);TUI=root;
 // botones: pulsar = acción mantenida (TOUCHV) + pulsación (pressAction)
 root.querySelectorAll('.tb').forEach(b=>{const a=b.dataset.a;
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);TOUCHV[a]=1;b.classList.add('on');Snd.init();askLandscape();pressAction(a)});
  const up=()=>{TOUCHV[a]=0;b.classList.remove('on')};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up)});
 stick($('tzL'),(x,y,on)=>{TOUCHV.left=on&&x<-.3;TOUCHV.right=on&&x>.3;TOUCHV.down=on&&y>.7});
 stick($('tzR'),(x,y,on)=>{TOUCHV.primary=on&&hyp(x,y)>.35;if(on&&hyp(x,y)>.2)TOUCHV.aim=Math.atan2(y,x);else TOUCHV.aim=null});
}
// joystick dinámico: el centro está donde apoyas el dedo; devuelve el vector normalizado
function stick(zone,cb){const s=zone.querySelector('.stick'),nub=zone.querySelector('.nub');let id=null,ox=0,oy=0;const R2=50;
 zone.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;zone.setPointerCapture(id);const r=zone.getBoundingClientRect();ox=e.clientX;oy=e.clientY;
  s.style.left=(ox-r.left)+'px';s.style.top=(oy-r.top)+'px';s.classList.add('on');nub.style.transform='translate(-50%,-50%)';Snd.init();askLandscape();cb(0,0,true)});
 zone.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;let dx=e.clientX-ox,dy=e.clientY-oy;const l=hyp(dx,dy);if(l>R2){dx*=R2/l;dy*=R2/l}
  nub.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;cb(dx/R2,dy/R2,true)});
 const end=e=>{if(e.pointerId!==id)return;id=null;s.classList.remove('on');cb(0,0,false)};zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',end)}
// pantalla completa + bloqueo horizontal (los navegadores solo lo permiten tras un gesto y en pantalla completa)
let askedLand=false;
function askLandscape(){if(askedLand)return;askedLand=true;const d=document.documentElement;
 try{const p=d.requestFullscreen&&d.requestFullscreen();if(p&&p.then)p.then(()=>{const o=window.screen.orientation;if(o&&o.lock)o.lock('landscape').catch(()=>{})}).catch(()=>{})}catch(e){}}
function pollTouch(){
 const on=touchOn();if(on)buildTouch();if(!TUI)return;
 const playing=on&&S&&S.st==='play';TUI.style.display=playing?'block':'none';document.body.classList.toggle('touchmode',on);
 if(!playing){for(const a in TOUCHV)TOUCHV[a]=0;return}
 const auto=Save.d.settings.aim!=='stick';$('tzR').style.display=auto?'none':'block';$('tFire').style.display=auto?'block':'none';
 $('tUse').style.display=S.near||execTarget()?'block':'none';
 AIM.ang=TOUCHV.aim!=null?TOUCHV.aim:autoAim();  // en táctil siempre hay apuntado: joystick o enemigo más cercano
}
