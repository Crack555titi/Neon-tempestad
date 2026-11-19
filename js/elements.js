'use strict';
/* ===================== ELEMENTOS: debilidades, resistencias y reacciones =====================
   Cinco elementos de daño (fuego, rayo, vacío, plasma, corrupción) y un estado (hielo = ralentizado).
   - Cada héroe golpea con su elemento (CHAR_EL; los tres de cuerpo a cuerpo de Vanguardia son físicos: ni débil ni resistido).
   - Los daños en el tiempo llevan el suyo (quemadura = fuego, veneno = corrupción) y algunos objetos también (bobinas = rayo).
   - Cada enemigo y jefe tiene una debilidad (×1,5) y una resistencia (×0,6). El plasma nunca es resistido.
   - Reacciones: un golpe de un elemento sobre un enemigo que ya tiene un estado produce un efecto extra (REACTIONS). */
const ELEMENTS={fuego:{name:'Fuego',col:'#ff6a1a',sym:'🔥'},rayo:{name:'Rayo',col:'#3cf0ff',sym:'⚡'},vacio:{name:'Vacío',col:'#b070ff',sym:'◎'},
 plasma:{name:'Plasma',col:'#ff3cf2',sym:'✦'},corrupcion:{name:'Corrupción',col:'#7dff3c',sym:'☣'},hielo:{name:'Hielo',col:'#bff4ff',sym:'❄'}};
const CHAR_EL={vanguard:'fuego',bastion:null,duelist:null,titan:null,artillery:'plasma',demo:'fuego',hawk:'plasma',volt:'rayo',
 summoner:'vacio',necro:'corrupcion',engineer:'rayo',hive:'corrupcion',chrono:'vacio',paradox:'vacio',graviton:'vacio',portal:'vacio',
 hemo:'corrupcion',berserk:'fuego',voidborn:'vacio',chimera:'corrupcion'};
const DOT_EL={burn:'fuego',poison:'corrupcion',bleed:null};
const EL_RAYO={proc:1,el:'rayo'},EL_RAYO_RAW={proc:1,raw:1,el:'rayo'};  // opciones de daño de los objetos eléctricos
const ENEMY_EL={crawler:{weak:'fuego',res:'corrupcion'},wisp:{weak:'vacio',res:'fuego'},brute:{weak:'rayo',res:'fuego'},spitter:{weak:'fuego',res:'corrupcion'},
 sniper:{weak:'vacio',res:'rayo'},kamikaze:{weak:'corrupcion',res:'rayo'},bomber:{weak:'rayo',res:'vacio'},tank:{weak:'rayo',res:'fuego'},
 leaper:{weak:'corrupcion',res:'vacio'},swarm:{weak:'fuego',res:'rayo'},turret:{weak:'rayo',res:'fuego'},splitter:{weak:'fuego',res:'corrupcion'},
 splitlet:{weak:'fuego',res:'corrupcion'},shaman:{weak:'vacio',res:'corrupcion'},phantom:{weak:'fuego',res:'vacio'},golem:{weak:'corrupcion',res:'fuego'},hunter:{weak:'plasma',res:'vacio'}};
const BOSS_EL={prisma:{weak:'vacio',res:'rayo'},hydra:{weak:'corrupcion',res:'rayo'},queen:{weak:'fuego',res:'vacio'},leviathan:{weak:'rayo',res:'vacio'},archon:{weak:'vacio',res:'fuego'}};
const elemOf=e=>e.boss?BOSS_EL[e.bid]:ENEMY_EL[e.type];

/* reacciones: estado presente en el enemigo + elemento del golpe → nombre, efecto y multiplicador del golpe */
const REACTIONS=[
 {name:'RESONANCIA',col:'#3cf0ff',when:(e,el)=>el==='rayo'&&e.slowT>0,mul:1.5,
  fx(e,d){let n=0;for(const o of S.en)if(o!==e&&!o.dead&&n<3&&hyp(o.x-e.x,o.y-e.y)<170){n++;bolt(e.x,e.y-e.h/2,o.x,o.y-o.h/2,'#3cf0ff',2);hurtE(o,d*.5,{proc:1,el:'rayo',react:1})}}},
 {name:'CHOQUE TÉRMICO',col:'#ff6a1a',when:(e,el)=>el==='fuego'&&e.slowT>0,mul:1.25,fx(e){e.slowT=0;boom(e.x,e.y-e.h/2,90,ib()*2,'#ff6a1a')}},
 {name:'COMBUSTIÓN',col:'#d8ff3c',when:(e,el)=>el==='fuego'&&e.dots&&e.dots.poison&&e.dots.poison.t>0,
  fx(e){const o=e.dots.poison,rem=o.dps*o.n*o.t;o.t=0;burst(e.x,e.y-e.h/2,16,'#d8ff3c',260,3);hurtE(e,rem*1.5,{proc:1,react:1})}},
 {name:'COLAPSO',col:'#b070ff',when:(e,el)=>el==='vacio'&&e.shockT>0,mul:1.2,
  fx(e){e.shockT=0;for(const o of S.en)if(o!==e&&!o.dead&&hyp(o.x-e.x,o.y-e.y)<200)pullE(o,e.x,e.y,120,1);stunE(e,.6);ring(e.x,e.y-e.h/2,200,'#b070ff',.3)}}];

// multiplica el daño por debilidad/resistencia y aplica la reacción que corresponda (sin encadenar reacciones)
function applyElement(e,d,o){const el=o.el||(o.dot||o.proc?null:CHAR_EL[S.cid]);if(!el)return d;
 const E=elemOf(e);let k=1;
 if(E&&E.weak===el){k=1.5;flagE(e,'DÉBIL',ELEMENTS[el].col)}else if(E&&E.res===el&&el!=='plasma'){k=.6;flagE(e,'RESISTE','#9a93c8')}
 if(!o.react&&!(e.rxT>0)){const r=REACTIONS.find(r=>r.when(e,el));if(r){e.rxT=.8;k*=r.mul||1;txt(e.x,e.y-e.h-22,r.name,r.col,13);r.fx(e,d*k)}}
 if(el==='rayo')e.shockT=3;
 return d*k}
// texto encima del enemigo, como mucho cada 1,5 s para no tapar los números de daño
function flagE(e,s,col){if(e.flT>S.t)return;e.flT=S.t+1.5;txt(e.x,e.y-e.h-14,s,col,10)}
function updElements(e,dt){if(e.shockT>0)e.shockT-=dt;if(e.rxT>0)e.rxT-=dt}
// símbolo de la debilidad sobre cada enemigo y chispas en los electrizados
function drawElements(){c.font='10px monospace';c.textAlign='center';
 for(const e of S.en){if(e.dead||e.hidden)continue;const E=elemOf(e);
  if(E&&!e.boss){c.globalAlpha=.75;c.fillStyle=ELEMENTS[E.weak].col;c.fillText(ELEMENTS[E.weak].sym,e.x,e.y-e.h-4);c.globalAlpha=1}
  if(e.shockT>0&&Math.sin(S.t*30+e.x)>.3){c.strokeStyle='#3cf0ff';c.lineWidth=1.2;const x=e.x+R(-e.w,e.w)*.4,y=e.y-R(0,e.h);c.beginPath();c.moveTo(x,y);c.lineTo(x+R(-6,6),y-6);c.lineTo(x+R(-6,6),y-12);c.stroke()}}}
const elemName=el=>el?`${ELEMENTS[el].sym} ${ELEMENTS[el].name}`:'Físico';
