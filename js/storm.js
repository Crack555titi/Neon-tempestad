'use strict';
/* ===================== LA TEMPESTAD: estabilidad dimensional, anomalías y tratos =====================
   Cada etapa empieza con estabilidad 100. El tiempo, las bajas (sobre todo de élites), las definitivas y las fases de jefe
   la erosionan. Al cruzar 75 y 25 la tormenta desata una anomalía que altera el mundo; al cruzar 50 ofrece un trato
   (estabilizar, alimentar o absorber); a 0 colapsa y desata otra. Algunas etapas ya empiezan con una anomalía activa.
   Dos anomalías concretas activas a la vez se combinan en un efecto nuevo (STORM_COMBOS).
   Datos declarativos: cada anomalía = {name, col, desc, start, end, every+tick, spawn(e), kill(e)}. */
const ANOMALIES={
 grav:{name:'Gravedad Baja',col:'#9a7aff',desc:'Todo cae más lento: saltas más alto y los proyectiles flotan.',
  start(){S.gmul=.55},end(){S.gmul=1}},
 rayos:{name:'Tormenta Eléctrica',col:'#3cf0ff',desc:'Caen rayos cerca de ti: dañan a quien esté debajo, también a los enemigos.',every:2.1,
  tick(){const x=clamp(S.p.x+R(-380,380),40,WORLD-40);stormStrike(x,FLOOR,55,.9,'#3cf0ff',18)}},
 meteoros:{name:'Lluvia de Meteoritos',col:'#ff8a3c',desc:'Caen meteoritos marcados en el suelo.',every:1.5,
  tick(){const x=clamp(S.p.x+R(-520,520),40,WORLD-40),fast=stormActive('veloz');stormStrike(x,FLOOR,62,fast?.65:1.15,'#ff8a3c',22,1)}},
 veloz:{name:'Proyectiles Acelerados',col:'#ff3cf2',desc:'Los proyectiles enemigos vuelan un 50% más rápido.',
  start(){S.pspd=1.5},end(){S.pspd=1}},
 furia:{name:'Enemigos Tormentosos',col:'#e6ff3c',desc:'Los enemigos nuevos nacen cargados: más vida y velocidad, el doble de oro, y estallan al morir.',
  spawn(e){e.storm=1;e.hp*=1.35;e.spdx*=1.2},
  kill(e){if(e.storm)stormStrike(e.x,e.y-e.h/2,48,.55,'#e6ff3c',12)}},
 niebla:{name:'Niebla Dimensional',col:'#7a8cff',desc:'Solo ves lo que tienes cerca.'}};
// combinaciones: con ambas anomalías activas aparece un efecto extra
const STORM_COMBOS=[
 {a:'grav',b:'rayos',name:'Orbes Eléctricos Flotantes',col:'#bff4ff',every:2.6,
  tick(){const x=clamp(S.p.x+R(-300,300),40,WORLD-40);fxProj({x,y:40,vx:R(-40,40),vy:30,gm:.08,dmg:16*dmgScale(),r:11,life:9,hostile:1,col:'#bff4ff'})}},
 {a:'meteoros',b:'veloz',name:'Bombardeo Orbital',col:'#ffb070',every:3,
  tick(){for(let i=-1;i<=1;i++)stormStrike(clamp(S.p.x+i*150,40,WORLD-40),FLOOR,55,.75,'#ffb070',20,1)}},
 {a:'furia',b:'niebla',name:'Cazadores en la Niebla',col:'#d0ff7a',every:7,
  tick(){if(S.en.length<60){const e=spawnEnemy(null,clamp(S.p.x+(Math.random()<.5?-1:1)*R(260,360),30,WORLD-30));if(e&&!e.storm){e.storm=1;e.hp*=1.35;e.maxHp*=1.35}}}}];
const STORM_DEALS=[
 {id:'estabilizar',name:'Estabilizar la dimensión',col:'#4cff9a',desc:'+35 de estabilidad, desaparece la última anomalía, aparecen menos enemigos en esta etapa y ganas un objeto poco común.'},
 {id:'alimentar',name:'Alimentar la tormenta',col:'#ff3c6a',desc:'Se desata otra anomalía y aparecen más enemigos, pero ganas un objeto raro y +50% de oro en esta etapa.'},
 {id:'absorber',name:'Absorber la energía',col:'#ffd23c',desc:'60 s de poder: +60% de daño y +30% de velocidad de ataque. Consecuencia: recibes +40% de daño y, al acabar, la estabilidad cae 25.'}];

const stormActive=k=>!!(S.storm&&S.storm.act.includes(k));
// golpe marcado en el suelo (o en el aire): avisa, luego daña al jugador y a los enemigos del radio
function stormStrike(x,y,r,warn,col,dmg,meteor){Z({x,y,r,warn,dmg:dmg*dmgScale(),hostile:1,col,life:.25});
 S.sch.push({t:warn,f:()=>{if(!S)return;boom(x,y,r,ib()*1.5,col);if(meteor)burst(x,y,14,col,320,3);else bolt(x,y-480,x,y,col,3)}})}

// estado de la tormenta en la etapa actual (lo llama loadStage)
function stormStage(){const s=S;if(s.storm)for(const k of s.storm.act)ANOMALIES[k].end&&ANOMALIES[k].end();
 s.gmul=1;s.pspd=1;s.storm={stab:100,act:[],marks:{},tk:{},spawnMul:1,goldMul:1,flash:0};
 // acontecimiento inicial: más probable en ciclos avanzados y dificultades altas
 if(Math.random()<Math.min(.8,.3+.1*s.loop+.05*DIFFS.indexOf(s.df)))stormUnleash(null,'La etapa empieza en plena tormenta');}
// desata una anomalía (aleatoria si k es null); máximo 3 a la vez: la más antigua se disipa
function stormUnleash(k,why){const st=S.storm,free=Object.keys(ANOMALIES).filter(a=>!st.act.includes(a));if(!free.length)return;
 k=k&&!st.act.includes(k)?k:free[Math.random()*free.length|0];
 if(st.act.length>=3)stormEnd(st.act[0]);
 st.act.push(k);const A=ANOMALIES[k];if(A.start)A.start();st.flash=1;chromaHit(.6);S.shake=Math.max(S.shake,8);Snd.play('phase');
 say(`⚡ ${why?why+': ':''}${A.name.toUpperCase()} · ${A.desc}`);
 const cb=STORM_COMBOS.find(c=>st.act.includes(c.a)&&st.act.includes(c.b)&&(c.a===k||c.b===k));
 if(cb)S.sch.push({t:2.5,f:()=>{if(S&&S.storm===st)say(`✦ COMBINACIÓN: ${cb.name.toUpperCase()}`)}})}
function stormEnd(k){const st=S.storm,i=st.act.indexOf(k);if(i<0)return;st.act.splice(i,1);const A=ANOMALIES[k];if(A.end)A.end()}
// erosiona la estabilidad y dispara los umbrales (cada uno una vez por etapa)
function stormErode(n){const st=S.storm;if(!st||S.st==='over')return;const before=st.stab;st.stab=Math.max(0,st.stab-n);
 for(const th of [75,50,25,0])if(before>th&&st.stab<=th&&!st.marks[th]){st.marks[th]=1;
  if(th===50)S.sch.push({t:.4,f:()=>{if(S&&S.storm===st&&S.st==='play')openStormDeal()}});
  else stormUnleash(null,th===0?'COLAPSO DIMENSIONAL':'La estabilidad cae a '+th)}}
function updStorm(dt){const st=S.storm;if(!st)return;st.flash=Math.max(0,st.flash-dt*1.5);
 stormErode(dt*(.35+.08*S.loop));
 const ticks=st.act.map(k=>[k,ANOMALIES[k]]).concat(STORM_COMBOS.filter(c=>st.act.includes(c.a)&&st.act.includes(c.b)).map(c=>[c.name,c]));
 for(const [k,A] of ticks)if(A.every){st.tk[k]=(st.tk[k]||A.every*.5)-dt;if(st.tk[k]<=0){st.tk[k]=A.every;A.tick()}}}
// bajas y definitivas erosionan; lo registra start() (el bus de eventos se reinicia en cada partida)
function stormInit(){Ev.on('onKill',e=>{stormErode(e.boss?0:e.elite?3:.25);for(const k of (S.storm?S.storm.act:[]))if(ANOMALIES[k].kill)ANOMALIES[k].kill(e);if(e.storm)S.p.gold+=goldFor(e)});
 Ev.on('onCast',slot=>{if(slot==='u')stormErode(4)});Ev.on('onBossPhase',()=>stormErode(10))}
function stormSpawn(e){if(!S.storm||e.d.structure)return;for(const k of S.storm.act)if(ANOMALIES[k].spawn)ANOMALIES[k].spawn(e)}

/* ---------- el trato (umbral 50) ---------- */
function openStormDeal(){S.st='storm';mouse.l=mouse.r=0;
 $('stormOpts').innerHTML=STORM_DEALS.map((d,i)=>`<div class="card sel" data-i="${i}" style="--c:${d.col}"><b>${d.name}</b><small>${d.desc}</small></div>`).join('');
 $('storm').style.display='flex';Snd.play('boss')}
function takeDeal(id){const st=S.storm,p=S.p;
 if(id==='estabilizar'){st.stab=Math.min(100,st.stab+35);if(st.act.length)stormEnd(st.act[st.act.length-1]);st.spawnMul=.75;giveItem(rollItem('u'))}
 if(id==='alimentar'){stormUnleash(null,'Alimentas la tormenta');st.spawnMul=1.3;st.goldMul=1.5;giveItem(rollItem('r'))}
 if(id==='absorber')buff('tempestad',60,{dmg:1.6,as:1.3,taken:1.4,end(){if(S&&S.storm===st)stormErode(25)},
  draw(){glow('#ffd23c',18);c.strokeStyle='#ffd23c';c.globalAlpha=.5+.3*Math.sin(S.t*12);c.lineWidth=2;c.beginPath();c.arc(p.x,p.y-p.h/2,30,0,6.283);c.stroke();c.globalAlpha=1;c.shadowBlur=0}});
 say(`Trato aceptado: ${STORM_DEALS.find(d=>d.id===id).name}`)}
$('stormOpts').onclick=e=>{const k=e.target.closest('.card');if(!k||!S||S.st!=='storm')return;takeDeal(STORM_DEALS[+k.dataset.i].id);
 $('storm').style.display='none';S.st='play';mouse.l=mouse.r=0};

/* ---------- dibujo ---------- */
// en el mundo: chispas de los enemigos tormentosos
function drawStormWorld(){if(!S.storm)return;c.strokeStyle='#e6ff3c';c.lineWidth=1.5;
 for(const e of S.en)if(e.storm&&!e.dead&&Math.sin(S.t*25+e.x)>.2){const x=e.x+R(-e.w,e.w)*.5,y=e.y-R(0,e.h);c.beginPath();c.moveTo(x,y);c.lineTo(x+R(-8,8),y-R(4,10));c.lineTo(x+R(-8,8),y-R(10,16));c.stroke()}}
// en pantalla: niebla, destello al desatarse una anomalía y panel de estabilidad (abajo a la derecha)
function drawStormHud(){const st=S.storm;if(!st)return;
 if(stormActive('niebla')){const px=S.p.x-S.cam,py=S.p.y-S.p.h/2,g=c.createRadialGradient(px,py,90,px,py,300);
  g.addColorStop(0,'rgba(8,6,24,0)');g.addColorStop(1,'rgba(8,6,24,.93)');c.fillStyle=g;c.fillRect(0,0,W,H)}
 if(st.flash>0){c.fillStyle=`rgba(190,240,255,${st.flash*.18})`;c.fillRect(0,0,W,H)}
 // en táctil, abajo a la derecha están los botones: el panel va debajo del minimapa y la lista crece hacia abajo
 const tm=touchOn(),x=W-216,y=tm?(S.p.revive>0?132:118):H-46,low=st.stab<25,col=st.stab>50?'#4cff9a':st.stab>25?'#ffd23c':'#ff3c6a';
 panel(x,y,206,38,low?'#ff3c6a88':'#3cf0ff55');c.textAlign='left';c.font='bold 10px monospace';c.fillStyle='#9a93c8';c.fillText('ESTABILIDAD',x+10,y+14);
 c.textAlign='right';c.fillStyle=col;c.fillText(Math.ceil(st.stab)+'%',x+196,y+14);gbar(x+10,y+20,186,7,st.stab/100,col,'#fff',low);
 // anomalías activas (y combinaciones) apiladas encima
 const lines=st.act.map(k=>ANOMALIES[k]).concat(STORM_COMBOS.filter(cb=>st.act.includes(cb.a)&&st.act.includes(cb.b)).map(cb=>Object.assign({combo:1},cb)));
 lines.forEach((A,i)=>{c.textAlign='right';c.font=`bold ${A.combo?10:11}px monospace`;c.fillStyle=A.col;c.fillText(`${A.combo?'✦':'⚡'} ${A.name}`,W-40,tm?y+52+i*15:y-8-i*15)})}  // W-40: deja sitio a la flecha del teletransportador
