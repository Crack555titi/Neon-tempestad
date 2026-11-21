'use strict';
/* ===================== TUTORIAL (la primera vez con cada personaje) =====================
   Una etapa guiada, sin puntuación ni ranking: moverse, saltar, las 4 habilidades del personaje, qué hace daño
   y qué no, oro y cofres, el teletransportador, el jefe y el portal. Al terminar (o al saltarlo) empieza la partida de verdad.
   No se puede morir: la vida no baja de 1. */
const tutDone=cid=>!!(Save.d.tut&&Save.d.tut[cid]);
const tutTouch=()=>typeof document!=='undefined'&&document.body&&document.body.classList&&document.body.classList.contains('touchmode');
const tutKey=(a,touch)=>tutTouch()?touch:keyName(BIND[a][0]);

const TUT_STEPS=[
 {t:()=>`Muévete con ${tutKey('left','el joystick')}${tutTouch()?'':' / '+keyName(BIND.right[0])}.`,
  on(T){T.x0=S.p.x},ok:T=>Math.abs(S.p.x-T.x0)>160},
 {t:()=>`Salta con ${tutKey('jump','el botón de salto')}. En el aire puedes volver a saltar; ${tutKey('down','abajo')} te deja caer de una plataforma.`,
  ok:()=>S.p.vy<-150},
 {t:()=>{const d=S.ch.primary;return `Ataque principal: ${d.name} (${tutKey('primary','mantén ATAQUE y arrastra para apuntar')}). ${d.desc} Derriba al muñeco de práctica.`},
  on(T){T.foe=tutFoe(1)},ok:T=>T.foe.dead,tgt:T=>T.foe},
 {t:()=>{const d=ab('s');return `Secundaria: ${d.name} (${tutKey('secondary','el botón ◈')}). ${d.desc}`},on(){S.p.cd.s=0},ok:T=>T.cast.s},
 {t:()=>{const d=ab('m');return `Movimiento: ${d.name} (${tutKey('move','el botón »')}). ${d.desc}`},on(){S.p.cd.m=0},ok:T=>T.cast.m},
 {t:()=>{const d=ab('u');return `Definitiva: ${d.name} (${tutKey('ult','el botón ★: apunta y suelta')}). ${d.desc} Se recarga con el tiempo.`},on(){S.p.cd.u=0},ok:T=>T.cast.u},
 {t:()=>`QUÉ TE HACE DAÑO: tocar enemigos, sus disparos y las zonas de color que dejan en el suelo, y caer al abismo. NO te hacen daño tus disparos, tus invocaciones, el oro ni los objetos. ${tutKey('parry','PARRY')} justo antes de un golpe lo bloquea. Acaba con los 3.`,
  on(T){T.foes=[tutFoe(0),tutFoe(0),tutFoe(0)]},ok:T=>T.foes.every(e=>e.dead),tgt:T=>T.foes.find(e=>!e.dead)},
 {t:()=>`Los enemigos sueltan ORO. Con oro abres COFRES (${tutKey('interact','toca el cofre')}): cada objeto te potencia toda la partida y se acumula. Abre este.`,
  on(T){const o={k:'chest',tier:'small',open:0,x:clamp(S.p.x+S.p.face*220,80,WORLD-80),y:FLOOR};S.ints.push(o);T.chest=o;S.p.gold+=priceOf(o)+5},
  ok:T=>T.chest.open,tgt:T=>T.chest},
 {t:()=>`Busca el TELETRANSPORTADOR (sigue la flecha) y actívalo con ${tutKey('interact','un toque')}. Al activarlo aparece el JEFE de la etapa.`,
  ok:()=>S.tp.state!=='idle',tgt:()=>({x:S.tp.x,y:S.tp.y})},
 {t:()=>`Derrota al jefe y quédate cerca del teletransportador hasta cargarlo al 100%. Si te alejas, la carga se detiene.`,
  ok:()=>S.tp.state==='ready',tgt:()=>S.boss&&!S.boss.dead?S.boss:{x:S.tp.x,y:S.tp.y}},
 {t:()=>`¡El PORTAL está abierto! Úsalo (${tutKey('interact','toca')}): desde la derecha pasas a la SIGUIENTE ETAPA (más difícil, con mejores premios); desde la izquierda terminas la partida y te llevas lo ganado. Úsalo para empezar la partida de verdad.`,
  ok:()=>false,tgt:()=>({x:S.tp.x,y:S.tp.y})}];

// enemigo de práctica: el primero no hace daño ni se mueve
function tutFoe(dummy){const p=S.p,e=spawnEnemy('crawler',clamp(p.x+(p.face||1)*R(200,320),60,WORLD-60),undefined,true);
 if(dummy){e.dmg=0;e.hp=Math.min(e.hp,40);e.dummy=1}return e}

function startTutorial(cid,did){const mode=MODE_NEXT;MODE_NEXT=null;start(cid,did);const s=S;
 s.tut={i:-1,cid,did,mode,cast:{},t:0};s.noRank=1;s.ints=s.ints.filter(o=>o.k==='tp');s.en.length=0;s.spawn=1e9;
 tutNext();say('TUTORIAL · '+CHARS[cid].name+' — sin puntuación');tutSkipBtn()}
function tutNext(){const T=S.tut;T.i++;T.t=0;T.cast={};S.p.hp=S.p.maxHp;const st=TUT_STEPS[T.i];if(st&&st.on)st.on(T);Snd.play('ui')}
function tutEnd(skip){if(!S||!S.tut)return;const {cid,did,mode}=S.tut;(Save.d.tut||(Save.d.tut={}))[cid]=1;Save.write();
 MODE_NEXT=mode;start(cid,did);say(skip?'Tutorial saltado. ¡Suerte!':'¡Tutorial completado! Ahora va en serio.');tutSkipBtn()}

// hooks
{const _u=update;update=function(dt){_u(dt);const s=S;if(!s||!s.tut||s.st!=='play')return;const T=s.tut,p=s.p;T.t+=dt;
 if(!s.boss||s.tp.state==='idle')s.spawn=1e9;  // sin oleadas: solo lo que pone el tutorial
 if(s.boss&&!s.boss.tutNerf){for(const b of s.en.filter(e=>e.boss)){b.hp=b.maxHp*.12;b.dmg*=.3;b.tutNerf=1}s.boss.tutNerf=1}
 if(s.tp.state==='charging'&&hyp(p.x-s.tp.x,p.y-s.tp.y)<TP_R)s.tp.charge=Math.min(1,s.tp.charge+dt/9);  // carga rápida en el tutorial
 if(p.hp<p.maxHp*.3)p.hp=p.maxHp*.3;
 const st=TUT_STEPS[T.i];if(st&&T.t>.6&&st.ok(T))tutNext()}}
{const _c=cast;cast=function(slot,f){const r=_c(slot,f);if(S&&S.tut)S.tut.cast[slot]=1;return r}}
{const _h=hurtP;hurtP=function(d,src,proj){if(S&&S.tut)d=Math.min(d,Math.max(0,S.p.hp-1));return _h(d,src,proj)}}
{const _d=drainP;drainP=function(a){if(S&&S.tut)a=Math.min(a,Math.max(0,S.p.hp-1));return _d(a)}}
{const _n=nextStage;nextStage=function(){if(S&&S.tut)return tutEnd(false);return _n()}}
{const _o=cashOut;cashOut=function(){if(S&&S.tut)return tutEnd(false);return _o()}}
{const _s=Auth.submit.bind(Auth);Auth.submit=function(win){if(S&&S.noRank)return Auth.user?{score:0}:null;return _s(win)}}
{const _g=goHome;goHome=function(){_g();tutSkipBtn()}}
{const _d=draw;draw=function(){_d();if(S&&S.tut)drawTut()}}

function drawTut(){const T=S.tut,st=TUT_STEPS[T.i];if(!st)return;
 // flecha sobre el objetivo
 const g=st.tgt&&st.tgt(T);if(g){screen();c.translate(-S.cam,0);const y=(g.y||FLOOR)-(g.h||40)-36+Math.sin(S.t*6)*5;
  c.fillStyle='#ffb733';c.beginPath();c.moveTo(g.x,y+14);c.lineTo(g.x-10,y);c.lineTo(g.x+10,y);c.closePath();c.fill()}
 screen();const w=Math.min(520,W-40),x=(W-w)/2,y=128;c.font='14px sans-serif';
 const lines=[];let line='';for(const word of st.t().split(' ')){const tl=line?line+' '+word:word;if(c.measureText(tl).width>w-28&&line){lines.push(line);line=word}else line=tl}lines.push(line);
 const h=34+lines.length*19;c.globalAlpha=.92;c.fillStyle='#14161c';c.fillRect(x,y,w,h);c.globalAlpha=1;c.strokeStyle='#3a3f48';c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1);
 c.fillStyle='#ffb733';c.fillRect(x,y,3,h);c.textAlign='left';c.font='bold 11px monospace';c.fillStyle='#8f877a';c.fillText(`TUTORIAL · ${T.i+1}/${TUT_STEPS.length}`,x+14,y+17);
 c.font='14px sans-serif';c.fillStyle='#d9cfbd';lines.forEach((l,i)=>c.fillText(l,x+14,y+38+i*19))}

// botón para saltar el tutorial
function tutSkipBtn(){if(typeof document==='undefined'||!document.body)return;let b=$('tutSkip');const v=!!(S&&S.tut);
 if(!b){if(!v)return;b=document.createElement('button');b.id='tutSkip';b.textContent='SALTAR TUTORIAL';b.onclick=()=>tutEnd(true);document.body.appendChild(b)}
 b.style.display=v?'block':'none'}
