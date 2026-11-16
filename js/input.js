'use strict';
/* ===================== ENTRADA: teclado/ratón configurables, mando y entrada virtual =====================
   Todo el juego pregunta por ACCIONES (act('jump')), nunca por teclas. Fuentes:
   - teclado y ratón según BIND (reasignable en Controles; el ratón son 'Mouse0' y 'Mouse2')
   - mando (Gamepad API) y táctil (touch.js), que escriben en PADV / TOUCHV
   AIM.ang ≠ null: el apuntado lo da el mando o el táctil (joystick derecho o apuntado automático). */
const ACTIONS={left:'Izquierda',right:'Derecha',jump:'Saltar',down:'Bajar de plataforma',primary:'Disparo primario',secondary:'Habilidad secundaria',
 move:'Movimiento',ult:'Definitiva',interact:'Interactuar',inventory:'Inventario',pause:'Pausa',mute:'Silenciar'};
const BIND_DEF={left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],jump:['Space','KeyW','ArrowUp'],down:['KeyS','ArrowDown'],
 primary:['Mouse0'],secondary:['Mouse2'],move:['ShiftLeft','ShiftRight'],ult:['KeyQ'],interact:['KeyE'],inventory:['Tab','KeyI'],pause:['Escape','KeyP'],mute:['KeyM']};
let BIND=JSON.parse(JSON.stringify(BIND_DEF));
const PADV={},TOUCHV={},AIM={ang:null};
let rebind=null;  // {a, i}: esperando la tecla nueva para la acción a, ranura i

const held=k=>k==='Mouse0'?mouse.l:k==='Mouse2'?mouse.r:keys[k];
const act=a=>!!(PADV[a]||TOUCHV[a])||(BIND[a]||[]).some(held);
function keyName(k){if(!k)return '—';const N={Mouse0:'Clic izq.',Mouse2:'Clic der.',Mouse1:'Clic central',Space:'Espacio',ShiftLeft:'Mayús izq.',ShiftRight:'Mayús der.',
 ControlLeft:'Ctrl izq.',ControlRight:'Ctrl der.',AltLeft:'Alt',Escape:'Esc',Tab:'Tab',Enter:'Intro',Backspace:'Retroceso',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓'};
 return N[k]||k.replace(/^Key|^Digit/,'').replace(/^Numpad/,'Num ')}

/* acciones de pulsación (no se mantienen): se disparan una vez desde cualquier fuente */
function pressAction(a){
 if(!S)return menuPress(a);
 if(a==='mute')return Snd.toggleMute();
 if(a==='pause'){if(S.st==='inv')return toggleInv();if(S.st==='play'||S.st==='pause')return togglePause();return}
 if(a==='inventory'&&(S.st==='play'||S.st==='inv'))return toggleInv();
 if(S.st==='pause'&&a==='jump')return togglePause();
 if(S.st!=='play')return;
 if(a==='jump')jump();
 if(a==='interact')interact();
}
function onPress(code){
 Snd.init();
 if(rebind){if(code!=='Escape'){for(const a in BIND)BIND[a]=BIND[a].map(k=>k===code?null:k);BIND[rebind.a][rebind.i]=code;saveBinds()}rebind=null;buildControls();return}
 for(const a in BIND)if(BIND[a].includes(code))pressAction(a);
}
function saveBinds(){for(const a in BIND)BIND[a]=BIND[a].filter((k,i)=>k||i===0);Save.d.settings.binds=BIND;Save.write()}
function loadBinds(){const b=Save.d.settings.binds;BIND=JSON.parse(JSON.stringify(BIND_DEF));if(b)for(const a in BIND)if(Array.isArray(b[a]))BIND[a]=b[a].slice(0,2)}

const PREVENT=['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'];
addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT'&&e.target.type!=='range')return;
 if(PREVENT.includes(e.code)||rebind)e.preventDefault();keys[e.code]=1;if(e.repeat)return;  // e.repeat: mantener pulsado no gasta el doble salto
 if(e.code==='KeyB'&&DEBUG&&S&&S.st==='play'&&S.tp.state==='idle')return useTP();
 onPress(e.code)});
addEventListener('keyup',e=>keys[e.code]=0);
// Alt-Tab no envía keyup: soltar todo para que no se queden teclas pegadas
addEventListener('blur',()=>{for(const k in keys)keys[k]=0;mouse.l=mouse.r=0});
cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();mouse.x=(e.clientX-r.left)*W/r.width;mouse.y=(e.clientY-r.top)*H/r.height;AIM.ang=null;AIM.src='mouse'});
cv.addEventListener('mousedown',e=>{if(e.button===0)mouse.l=1;if(e.button===2)mouse.r=1;onPress('Mouse'+e.button)});
addEventListener('mousedown',e=>{if(rebind&&e.target!==cv){e.preventDefault();onPress('Mouse'+e.button)}},true);
addEventListener('mouseup',e=>{if(e.button===0)mouse.l=0;if(e.button===2)mouse.r=0});
cv.addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- mando (mapeo estándar: Xbox / PlayStation) ----------
   Stick izq./cruceta: mover · A: saltar · RT o stick dcho.: disparar · LT: secundaria · B/RB: movimiento · Y/LB: definitiva
   X: interactuar · Select: inventario · Start: pausa. Sin stick derecho, apunta solo al enemigo más cercano. */
let PADPREV={},padUsed=false;
function autoAim(){const p=S.p;let b=null,bd=650;for(const e of S.en){if(e.dead||e.hidden)continue;const d=hyp(e.x-p.x,e.y-e.h/2-(p.y-20));if(d<bd){bd=d;b=e}}
 return b?Math.atan2(b.y-b.h/2-(p.y-20),b.x-p.x):(p.face>0?0:Math.PI)}
function pollPad(){
 const gp=typeof navigator!=='undefined'&&navigator.getGamepads?[...navigator.getGamepads()].find(g=>g&&g.connected):null;
 if(!gp){if(padUsed){for(const a in PADV)PADV[a]=0;padUsed=false}return}
 const b=i=>!!(gp.buttons[i]&&gp.buttons[i].pressed),ax=gp.axes,lx=ax[0]||0,ly=ax[1]||0,rx=ax[2]||0,ry=ax[3]||0,rs=hyp(rx,ry)>.45;
 const st={left:lx<-.35||b(14),right:lx>.35||b(15),down:ly>.65||b(13),jump:b(0),primary:b(7)||rs,secondary:b(6),move:b(1)||b(5),ult:b(3)||b(4),
  interact:b(2),inventory:b(8),pause:b(9),up:ly<-.65||b(12)};
 const any=Object.values(st).some(v=>v)||hyp(lx,ly)>.3;
 if(any&&!padUsed){padUsed=true}
 if(!padUsed)return;
 for(const a in st){if(st[a]&&!PADPREV[a]){Snd.init();pressAction(a)}PADV[a]=a==='up'?0:st[a]}
 PADPREV=st;
 if(S&&S.st==='play')AIM.ang=rs?Math.atan2(ry,rx):autoAim();
}
// el resto del juego usa el cursor (aimPt): con mando/táctil se coloca un cursor virtual delante del jugador
function syncAim(){if(AIM.ang===null||!S)return;const p=S.p;mouse.x=p.x-S.cam+Math.cos(AIM.ang)*240;mouse.y=p.y-20+Math.sin(AIM.ang)*240}
function pollInput(){pollPad();pollTouch();syncAim()}

/* ---------- menú con mando/teclado: ←/→ personaje · ↑/↓ dificultad · saltar = jugar ---------- */
function menuPress(a){
 if($('title').style.display!=='none'){if(a==='jump'&&padUsed)$('tPlay').click();return}
 if($('menu').style.display==='none')return;
 const un=Object.keys(CHARS).filter(isUnlocked);
 if(a==='left'||a==='right'){selC=un[(un.indexOf(selC)+(a==='right'?1:-1)+un.length)%un.length];buildMenu();Snd.play('ui')}
 if(a==='up'||a==='down'){selD=clamp(selD+(a==='down'?1:-1),0,DIFFS.length-1);buildMenu();Snd.play('ui')}
 if(a==='jump'&&padUsed)start(selC,selD);
}
