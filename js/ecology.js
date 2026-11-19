'use strict';
/* ===================== ECOLOGÍA DE ENEMIGOS: armaduras, evolución, devoradores y el Cazador persistente =====================
   - ARMADURA (idea 14): Brutos, Gólems y Acorazados (y a veces otros en dificultad alta) llevan placas que absorben el 60% del daño.
     Al romperse cambian: más rápidos y más frágiles, y el Acorazado pierde su escudo frontal.
   - EVOLUCIÓN (41): un enemigo que sobrevive 20 s evoluciona (y otra vez a los 40 s): más vida, daño, velocidad y un rasgo nuevo.
     Vale más oro y experiencia.
   - DEVORADORES (42): Gólems, Gelatinas y Chamanes absorben a los enemigos que mueren cerca: se curan, crecen y evolucionan antes.
   - CAZADOR DEL VACÍO (44): desde la etapa 2 puede aparecer un cazador único. Al quedar herido huye y vuelve en otra etapa con la
     vida que le quedaba y más fuerza; a la tercera pelea hasta el final. Derrotarlo da un objeto legendario. Se guarda con la partida. */
const ARMORED={brute:.5,golem:.6,tank:.5};  // fracción de la vida máxima que tiene la armadura
const EVO_TIME=[20,40],EVO_TRAITS=[
 {id:'regen',name:'REGENERA',col:'#4cff9a',fx:e=>{e.evoRegen=(e.evoRegen||0)+.02}},
 {id:'coraza',name:'CORAZA',col:'#9aa8c8',fx:e=>{if(!(e.armor>0)){e.armor=e.armorMax=e.maxHp*.35}}},
 {id:'veloz',name:'VELOZ',col:'#3cf0ff',fx:e=>{e.spdx*=1.25}},
 {id:'feroz',name:'FEROZ',col:'#ff3c6a',fx:e=>{e.dmg*=1.3}}];
const FEEDERS=new Set(['golem','splitter','shaman']);
const HUNTER_FLEE=.4,HUNTER_MAX_ESCAPES=2;

/* ---------- armaduras ---------- */
function ecoSpawn(e){if(e.boss||e.hunter)return;const a=ARMORED[e.type]||(coef()>2.5&&e.hp>50&&Math.random()<.15?.35:0);
 if(a){e.armor=e.armorMax=e.maxHp*a||e.hp*a}}
// absorbe parte del daño en la armadura; al romperse, el enemigo cambia
function armorAbsorb(e,d){if(!(e.armor>0))return d;const take=Math.min(e.armor,d*.6);e.armor-=take;
 if(e.armor<=0){e.armor=0;e.armorBroke=1;e.spdx*=1.25;e.brittle=1.25;S.shake=Math.max(S.shake,5);
  burst(e.x,e.y-e.h/2,18,'#9aa8c8',380,4);txt(e.x,e.y-e.h-20,'¡ARMADURA ROTA!','#e8ecff',13);Snd.play('guard')}
 return (d-take)*(e.brittle||1)}

/* ---------- evolución y devoradores ---------- */
function evolve(e,why){const lv=(e.evo||0)+1;if(lv>2||e.dead)return;e.evo=lv;const r=e.hp/e.maxHp;
 e.maxHp*=1.3;e.hp=e.maxHp*r;e.dmg*=1.25;e.spdx*=1.15;e.w*=1.08;e.h*=1.08;
 const T=EVO_TRAITS[Math.random()*EVO_TRAITS.length|0];T.fx(e);(e.traits=e.traits||[]).push(T.id);
 ring(e.x,e.y-e.h/2,60,T.col,.4);burst(e.x,e.y-e.h/2,14,T.col,240,3);txt(e.x,e.y-e.h-22,`${why||'EVOLUCIONA'} · ${T.name}`,T.col,12)}
function feed(f,dead){f.fed=(f.fed||0)+1;f.hp=Math.min(f.maxHp,f.hp+f.maxHp*.25);f.age=(f.age||0)+6;
 if(f.fed<=5){f.w*=1.06;f.h*=1.06;f.dmg*=1.08}
 bolt(dead.x,dead.y-dead.h/2,f.x,f.y-f.h/2,f.d.color,2);txt(f.x,f.y-f.h-14,'SE ALIMENTA','#d0ff7a',11)}
function updEco(e,dt){if(e.boss||e.dead)return;e.age=(e.age||0)+dt;
 if(!e.hunter&&e.age>=EVO_TIME[e.evo||0])evolve(e);
 if(e.evoRegen)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*e.evoRegen*dt);
 if(e.hunter)updHunter(e,dt)}

/* ---------- el Cazador del Vacío ---------- */
const hunterState=()=>S.hunter||(S.hunter={met:0,escapes:0,hp:0,maxHp:0,dead:0,t:0});
function hunterStage(){const H=hunterState();if(H.dead)return;H.t=(S.stage>=1||S.loop)&&Math.random()<(H.met?.65:.4)?R(25,50):0}
function spawnHunter(){const H=hunterState(),p=S.p,side=Math.random()<.5?-1:1;
 const e=spawnEnemy('hunter',clamp(p.x+side*520,40,WORLD-40),60,1);if(!e)return;e.hunter=1;
 if(H.met){e.maxHp=H.maxHp*1.2;e.hp=Math.min(e.maxHp,H.hp*1.2+e.maxHp*.15);e.dmg*=1+.25*H.escapes}else{H.maxHp=e.maxHp}
 H.met=1;e.fleeAt=H.escapes<HUNTER_MAX_ESCAPES?e.maxHp*HUNTER_FLEE*(1-H.escapes*.5):-1;
 say(H.escapes?`☠ EL CAZADOR DEL VACÍO VUELVE (${H.escapes}ª vez): más fuerte y con hambre`:'☠ ALGO TE CAZA: EL CAZADOR DEL VACÍO');
 S.shake=Math.max(S.shake,12);chromaHit(.8);Snd.play('boss');return e}
function updHunter(e,dt){const H=hunterState();
 if(e.fleeAt>0&&e.hp<=e.fleeAt){H.hp=e.hp;H.escapes++;e.dead=1;e.fled=1;  // huye: sin recompensa; vuelve en otra etapa
  burst(e.x,e.y-e.h/2,40,'#9b30ff',520,4);ring(e.x,e.y-e.h/2,120,'#9b30ff',.5);say('El Cazador del Vacío huye herido… volverá');Snd.play('tp')}}
function updEcoStage(dt){const H=hunterState();if(H.dead||!(H.t>0)||S.boss)return;H.t-=dt;if(H.t<=0)spawnHunter()}
function ecoInit(){Ev.on('onKill',e=>{
 if(e.hunter&&!e.fled){const H=hunterState();H.dead=1;giveItem(rollItem('l'));Save.add('hunterKills');say('☠ ¡CAZADOR DEL VACÍO DERROTADO! Te deja un objeto legendario')}
 // los devoradores cercanos absorben al caído
 for(const f of S.en)if(f!==e&&!f.dead&&!f.boss&&FEEDERS.has(f.type)&&hyp(f.x-e.x,f.y-e.y)<170){feed(f,e);break}})}
// recompensa extra por enemigos evolucionados
const ecoReward=e=>1+.5*(e.evo||0);

/* ---------- dibujo ---------- */
function drawEco(){c.textAlign='center';
 for(const e of S.en){if(e.dead||e.hidden)continue;const top=e.y-e.h;
  if(e.armor>0){const k=e.armor/e.armorMax;c.strokeStyle='#e8ecff';c.lineWidth=2.5;c.globalAlpha=.55+.4*k;
   c.strokeRect(e.x-e.w/2-3,top-3,e.w+6,e.h+6);if(k<.5){c.beginPath();c.moveTo(e.x-e.w*.3,top);c.lineTo(e.x-e.w*.1,top+e.h*.4);c.lineTo(e.x+e.w*.15,top+e.h*.3);c.stroke()}
   c.globalAlpha=1;c.fillStyle='#9aa8c8';c.fillRect(e.x-e.w/2,top-16,e.w*k,3)}
  if(e.evo){c.fillStyle='#ffd23c';for(let i=0;i<e.evo;i++){c.beginPath();c.arc(e.x-4+i*8-(e.evo-1)*4+4,top-22,2.5,0,6.283);c.fill()}}
  if(e.hunter){c.font='bold 11px monospace';c.fillStyle='#d070ff';c.fillText('CAZADOR DEL VACÍO',e.x,top-30);
   c.fillStyle='#22113a';c.fillRect(e.x-36,top-26,72,5);c.fillStyle='#9b30ff';c.fillRect(e.x-36,top-26,72*Math.max(0,e.hp/e.maxHp),5);
   if(e.fleeAt>0){c.fillStyle='#fff';c.fillRect(e.x-36+72*e.fleeAt/e.maxHp,top-27,1.5,7)}
   if(QL.glow){c.globalAlpha=.25;glow('#9b30ff',20);c.fillStyle='#9b30ff';c.beginPath();c.arc(e.x,e.y-e.h/2,e.w,0,6.283);c.fill();c.shadowBlur=0;c.globalAlpha=1}}}}
