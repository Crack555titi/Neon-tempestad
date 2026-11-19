'use strict';
/* ===================== IA ADAPTATIVA: imitadores y jefes que recuerdan (ideas 6, 43 y 47) =====================
   - ECO IMITADOR (43): enemigo que copia la última habilidad que usaste (secundaria, movimiento o definitiva) en una
     versión enemiga avisada: disparo, embestida, salto tras de ti o explosión.
   - JEFES QUE RECUERDAN (6 y 47): durante el combate se registra tu estilo (distancia media, tiempo en el aire, esquivas
     y habilidad más usada). En cada cambio de fase el jefe añade a su repertorio UNA respuesta a ese estilo. Todas
     son telegrafiadas y esquivables: castigan repetir siempre lo mismo, no anulan habilidades. */
const MIMIC_KIND={proj:'shot',ringshot:'shot',snipe:'shot',barrage:'shot',rocket:'shot',beam:'shot',chain:'shot',static:'shot',napalm:'shot',
 melee:'slam',combo:'slam',hammer:'slam',dashHit:'slam',slam:'slam',quake:'slam',leap:'slam',
 dash:'blink',blink:'blink',voidstep:'blink',bloodstep:'blink',phase:'blink',swap:'blink',gate:'blink',portal:'blink',rift:'blink',grapple:'blink',jetpack:'blink',boltDash:'blink',
 nova:'nova',zone:'nova',well:'nova',blackhole:'nova',orbital:'nova',storm:'nova',aegis:'nova',fortress:'nova'};
const mimicKind=d=>MIMIC_KIND[d&&d.t]||'shot';

/* ---------- Eco Imitador ---------- */
EAI.mimic=(e,dt,p,sp)=>{if(e.tell>0){e.tell-=dt;e.vx*=.8;phys(e,dt);if(e.tell<=0)mimicAct(e,p);return}
 keepRange(e,dt,p,sp);phys(e,dt);e.cd-=dt;  // spawnEnemy ya inicializa cd
 if(e.cd<=0){e.cd=R(3,4);e.copy=S.lastCast||{name:'Disparo',t:'proj'};e.tell=.6;e.copyT=4;
  txt(e.x,e.y-e.h-18,`COPIA: ${e.copy.name}`,'#f0f0ff',11);if(mimicKind(e.copy)==='nova')TG.circle(e.x,e.y-e.h/2,150,.6,e.dmg*1.2,'#f0f0ff')}};
function mimicAct(e,p){const k=mimicKind(e.copy),col=S.ch.color;
 if(k==='shot'){const a=Math.atan2(p.y-p.h/2-(e.y-e.h/2),p.x-e.x);for(let i=-1;i<=1;i++)shootP(e.x,e.y-e.h/2,a+i*.18,330,e.dmg*.8,6,e)}
 if(k==='slam'){e.vx=sgn(p.x-e.x)*520;TG.circle(p.x,p.y-20,80,.55,e.dmg*1.1,col)}
 if(k==='blink'){burst(e.x,e.y-e.h/2,14,'#f0f0ff',300,3);e.x=clamp(p.x-p.face*90,30,WORLD-30);e.y=p.y;burst(e.x,e.y-e.h/2,14,'#f0f0ff',300,3);
  TG.circle(e.x,e.y-e.h/2,70,.5,e.dmg,col)}
 if(k==='nova')burst(e.x,e.y-e.h/2,24,col,380,4)}

/* ---------- jefes que recuerdan ---------- */
// respuestas posibles al estilo del jugador; dm = escala de daño del jefe
const ADAPT={
 lejos:{name:'Lanza de largo alcance',why:'mantienes la distancia',f(b,f,dm){const p=S.p,a=Math.atan2(p.y-20-(b.y-b.h/2),p.x-b.x);
  TG.line(b.x,b.y-b.h/2,a,1500,44,1*f+.2,.3,26*dm,b.def.color)}},
 cerca:{name:'Onda de repulsión',why:'peleas pegado a él',f(b,f,dm){TG.circle(b.x,b.y-b.h/2,230,.85*f+.2,24*dm,b.def.color)}},
 aire:{name:'Techo de tormenta',why:'pasas mucho tiempo en el aire',f(b,f,dm){TG.rect(0,FLOOR-300,WORLD,150,1.1*f+.2,24*dm,b.def.color,{life:.4})}},
 esquiva:{name:'Eco de llegada',why:'esquivas sin parar',f(b,f,dm){const p=S.p;for(let i=0;i<3;i++)S.sch.push({t:i*.25,en:1,f:()=>{if(S)TG.circle(clamp(S.p.x+S.p.vx*.45,40,WORLD-40),FLOOR-30,75,.7,20*dm,b.def.color)}})}}};
function updAdaptive(dt){if(!S.bosses)return;const p=S.p;
 for(const e of S.en)if(e.copyT>0)e.copyT-=dt;
 for(const b of S.bosses){const o=b.obs||(b.obs={t:0,dist:0,air:0,dash:0,use:{}});o.t+=dt;o.dist+=Math.abs(p.x-b.x)*dt;if(!p.ground)o.air+=dt}}
// elige la respuesta al estilo observado hasta ahora (null si no hay datos suficientes)
function readStyle(b){const o=b.obs;if(!o||o.t<4)return null;const dist=o.dist/o.t,air=o.air/o.t,dashMin=o.dash/o.t*60,used=b.adapt||[];
 const fav=Object.keys(o.use).sort((x,y)=>o.use[y]-o.use[x])[0];
 const order=[[dashMin>14,'esquiva'],[air>.45,'aire'],[dist>380,'lejos'],[dist<200,'cerca'],[fav&&mimicKind(o.useD[fav])==='shot','lejos'],[true,'cerca']];
 for(const [ok,k] of order)if(ok&&!used.some(m=>m.k===k))return {k,fav};return null}
function adaptBoss(b,np){const st=readStyle(b);if(!st)return;const A=ADAPT[st.k];(b.adapt=b.adapt||[]).push({k:st.k,name:A.name,ph:np,cd:2.4,w:1.5,f:A.f});
 say(`🧠 ${b.def.name} te ha estudiado (${A.why}): ${A.name}${st.fav?` · recuerda tu ${st.fav}`:''}`);ring(b.x,b.y-b.h/2,160,'#ffffff',.4)}
function adaptiveInit(){Ev.on('onDash',()=>{for(const b of S.bosses||[])if(b.obs)b.obs.dash++});
 Ev.on('onCast',slot=>{if(slot==='p')return;const d=ab(slot);S.lastCast=d;for(const b of S.bosses||[]){const o=b.obs;if(!o)continue;o.use[d.name]=(o.use[d.name]||0)+1;(o.useD=o.useD||{})[d.name]=d}});
 Ev.on('onBossPhase',(b,np)=>adaptBoss(b,np))}
// repertorio del jefe: sus ataques + las respuestas aprendidas
const bossPool=(b,ph)=>b.def.moves.filter(m=>ph>=m.ph).concat((b.adapt||[]).filter(m=>ph>=m.ph));

function drawAdaptive(){c.textAlign='center';c.font='bold 10px monospace';
 for(const e of S.en)if(e.type==='mimic'&&!e.dead&&!e.hidden&&e.copyT>0){c.fillStyle=S.ch.color;c.fillText(`◐ ${e.copy.name}`,e.x,e.y-e.h-8)}}
