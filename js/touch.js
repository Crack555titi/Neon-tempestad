'use strict';
/* ===================== CONTROLES TÁCTILES (estilo arena móvil) =====================
   Izquierda: joystick flotante (en reposo se ve abajo a la izquierda; aparece donde apoyas el dedo).
   Hacia abajo = bajar de plataforma.
   Derecha, en arco alrededor del pulgar:
   - ATAQUE (grande): tocar y mantener = dispara al enemigo más cercano;
     arrastrar = apuntas tú (se dibuja la línea de mira).
   - Secundaria y DEFINITIVA: se apuntan arrastrando y se lanzan AL SOLTAR (tocar sin arrastrar = automático).
     Las habilidades «de carga» se cargan mientras mantienes.
   - Saltar, impulso, parry y un botón de acción que solo aparece cuando hay algo con lo que interactuar.
   Cada botón muestra su enfriamiento como un anillo y la definitiva brilla cuando está lista.
   Los controles ocupan toda la pantalla (también las franjas negras de los teléfonos alargados).
   Apuntado «stick» (Opciones) = sin apuntado automático: el ataque sin arrastrar dispara hacia donde miras. */
const isTouchDevice=()=>typeof matchMedia!=='undefined'&&matchMedia('(pointer:coarse)').matches;
const touchOn=()=>{const m=Save.d.settings.touch;return m==='on'||(m==='auto'&&isTouchDevice())};
const TOUCH_KEY={p:'ATAQUE',s:'◈',m:'»',u:'★'};
let TUI=null;const TAIM={a:null,on:0};  // mira manual activa mientras arrastras un botón de ataque
function buildTouch(){
 if(TUI||typeof document.createElement!=='function'||!$('wrap'))return;
 const root=document.createElement('div');root.id='touch';
 const B=(a,cls,sl,ico)=>`<button class="tb ${cls}" data-a="${a}"${sl?` data-sl="${sl}"`:''}><i class="ring"></i><span class="ico">${ico}</span><em class="cd"></em></button>`;
 root.innerHTML=`<div class="tzone" id="tzL"><div class="stick rest"><div class="nub"></div></div></div>
  ${B('primary','atk','p','✦')}${B('jump','jmp','','⤒')}${B('secondary','sec','s','◈')}${B('move','mov','m','»')}${B('ult','ult','u','★')}
  ${B('parry','par','','⛨')}${B('interact','use','','E')}
  <button class="tb sys" data-a="pause" style="left:calc(8px + var(--l));top:30%"><span class="ico">❚❚</span></button><button class="tb sys" data-a="inventory" style="left:calc(8px + var(--l));top:calc(30% + 52px)"><span class="ico">☰</span></button>`;
 document.body.appendChild(root);TUI=root;
 root.querySelectorAll('.tb').forEach(b=>{const a=b.dataset.a,aim=a==='primary'||a==='secondary'||a==='ult',onRelease=a==='secondary'||a==='ult';let id=null,ox=0,oy=0,drag=0;
  b.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;b.setPointerCapture(id);ox=e.clientX;oy=e.clientY;drag=0;b.classList.add('on');Snd.init();askLandscape();
   if(aim){TAIM.on=1;TAIM.a=null}
   const hold=onRelease&&S&&S.p&&ab(b.dataset.sl).hold;
   if(!onRelease||hold)TOUCHV[a]=1;if(!onRelease)pressAction(a)});
  b.addEventListener('pointermove',e=>{if(e.pointerId!==id||!aim)return;const dx=e.clientX-ox,dy=e.clientY-oy;if(hyp(dx,dy)>14){drag=1;TAIM.a=Math.atan2(dy,dx)}});
  const up=e=>{if(e.pointerId!==id)return;id=null;b.classList.remove('on');
   if(onRelease&&!TOUCHV[a]){TOUCHV[a]=1;setTimeout(()=>{TOUCHV[a]=0;if(!TAIM.on)TAIM.a=null},90)}else TOUCHV[a]=0;  // pulsación breve: el motor lanza en el siguiente fotograma
   if(aim){TAIM.on=0;if(!onRelease)TAIM.a=null}};
  b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up)});
 stick($('tzL'),(x,y,on)=>{TOUCHV.left=on&&x<-.3;TOUCHV.right=on&&x>.3;TOUCHV.down=on&&y>.7});
}
// joystick dinámico: el centro está donde apoyas el dedo; al soltar vuelve a su sitio de reposo
function stick(zone,cb){const s=zone.querySelector('.stick'),nub=zone.querySelector('.nub');let id=null,ox=0,oy=0;const R2=55;
 zone.addEventListener('pointerdown',e=>{e.preventDefault();if(id!==null)return;id=e.pointerId;zone.setPointerCapture(id);const r=zone.getBoundingClientRect();ox=e.clientX;oy=e.clientY;
  s.style.left=(ox-r.left)+'px';s.style.top=(oy-r.top)+'px';s.classList.remove('rest');s.classList.add('on');nub.style.transform='translate(-50%,-50%)';Snd.init();askLandscape();cb(0,0,true)});
 zone.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;let dx=e.clientX-ox,dy=e.clientY-oy;const l=hyp(dx,dy);if(l>R2){dx*=R2/l;dy*=R2/l}
  nub.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;cb(dx/R2,dy/R2,true)});
 const end=e=>{if(e.pointerId!==id)return;id=null;s.classList.remove('on');s.classList.add('rest');s.style.left=s.style.top='';nub.style.transform='translate(-50%,-50%)';cb(0,0,false)};
 zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',end)}
// pantalla completa + bloqueo horizontal (los navegadores solo lo permiten tras un gesto y en pantalla completa)
let askedLand=false;
function askLandscape(){if(askedLand)return;askedLand=true;const d=document.documentElement;
 try{const p=d.requestFullscreen&&d.requestFullscreen();if(p&&p.then)p.then(()=>{const o=window.screen.orientation;if(o&&o.lock)o.lock('landscape').catch(()=>{})}).catch(()=>{})}catch(e){}}
let tuiLast='';
function pollTouch(){
 const on=touchOn();if(on)buildTouch();if(!TUI)return;
 const playing=on&&S&&S.st==='play';TUI.style.display=playing?'block':'none';document.body.classList.toggle('touchmode',on);
 if(!playing){for(const a in TOUCHV)TOUCHV[a]=0;TAIM.on=0;TAIM.a=null;return}
 const p=S.p,manual=Save.d.settings.aim==='stick';
 AIM.ang=TAIM.a!=null?TAIM.a:manual?(p.face>0?0:Math.PI):autoAim();  // siempre hay apuntado: el tuyo, o el enemigo más cercano
 // estado visual de los botones (solo se toca el DOM cuando algo cambia)
 let sig=(S.near||execTarget()?'U':'')+(cmb().parryCd>0?'P':'');
 for(const k of SLOTS){const cd=p.cd[k],mx=maxCd(k,ab(k));sig+=k+(cd>0?Math.ceil(cd*10):0)+'/'+(mx|0)}
 if(sig===tuiLast)return;tuiLast=sig;
 TUI.querySelector('.use').style.display=S.near||execTarget()?'block':'none';
 TUI.querySelector('.use .ico').textContent=execTarget()&&!S.near?'⚔':'E';
 TUI.querySelector('.par').classList.toggle('cool',cmb().parryCd>0);
 for(const b of TUI.querySelectorAll('[data-sl]')){const k=b.dataset.sl,cd=p.cd[k],mx=maxCd(k,ab(k)),f=cd>0?clamp(cd/mx,0,1):0;
  b.style.setProperty('--cd',f.toFixed(3));b.classList.toggle('cool',f>0);b.classList.toggle('ready',k==='u'&&f<=0);
  b.querySelector('.cd').textContent=cd>0&&k!=='p'?(cd<1?cd.toFixed(1):Math.ceil(cd)):''}
}
// línea de mira (estilo arena): se ve mientras arrastras un botón de ataque
function drawTouchAim(){if(!TUI||!TAIM.on||TAIM.a==null||!S||S.st!=='play')return;const p=S.p,x=p.x,y=p.y-20,a=TAIM.a,L=260;
 c.save();c.globalAlpha=.55;c.strokeStyle='#fff';c.lineWidth=10;c.lineCap='round';c.setLineDash([2,16]);c.beginPath();c.moveTo(x+Math.cos(a)*30,y+Math.sin(a)*30);c.lineTo(x+Math.cos(a)*L,y+Math.sin(a)*L);c.stroke();
 c.setLineDash([]);c.globalAlpha=.25;c.lineWidth=26;c.strokeStyle=S.ch.color;c.beginPath();c.moveTo(x+Math.cos(a)*30,y+Math.sin(a)*30);c.lineTo(x+Math.cos(a)*L,y+Math.sin(a)*L);c.stroke();c.restore()}
