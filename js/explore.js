'use strict';
/* ===================== EXPLORACIÓN: gravedad por zonas, salas secretas, terminales, ruinas, rescates y mazmorras =====================
   Al empezar cada etapa pueden aparecer (cada uno con su probabilidad):
   - SECTORES DE GRAVEDAD (57): columnas antigravedad (×0,4) o pozos pesados (×1,7) que afectan a jugador, enemigos y proyectiles.
   - GRIETAS (51 y 7): paredes agrietadas que se rompen a golpes (estructura destructible) y revelan una sala secreta.
   - TERMINALES (54): investigan a un enemigo; su ficha queda para siempre en el Códice y da +10% de daño contra él.
   - MECANISMOS ANTIGUOS (58): desatan una trampa contra los enemigos cercanos y abren un compartimento con un objeto.
   - RESCATES (59): un explorador atrapado; quédate cerca 8 s mientras llegan enemigos y te acompaña como dron aliado.
   - GRIETAS DIMENSIONALES (52): mazmorra opcional: una barrera encierra una arena con 3 oleadas reforzadas y un legendario. */
const CODEX_LORE={crawler:'Larva de neón que se arrastra hacia cualquier fuente de calor.',wisp:'Restos de una conciencia que se negó a apagarse.',
 brute:'Obrero de fundición fusionado con su propio blindaje.',spitter:'Su ácido corroe el código de lo que toca.',sniper:'Nunca falla dos veces: la segunda no hace falta.',
 kamikaze:'Una chispa con prisa por volver a la tormenta.',bomber:'Patrulla el cielo soltando restos de la última guerra.',tank:'Su escudo frontal es inútil contra lo que llega por detrás.',
 leaper:'Calcula tu caída antes que tú.',swarm:'Cada dron es tonto; el enjambre, no.',turret:'Defensa automática que olvidó a quién defendía.',
 splitter:'Cuanto más la rompes, más hay.',splitlet:'Fragmento que busca reunirse con el resto.',shaman:'Cura a los suyos con energía robada a la tormenta.',
 phantom:'Se esconde en el instante entre dos fotogramas.',golem:'Escoria viva: se alimenta de lo que cae a su lado.',mimic:'Un eco que aprendió a copiar a los héroes.',
 hunter:'Te sigue de etapa en etapa. No olvida.',crackwall:'Muro viejo: algo late detrás.'};

/* ---------- gravedad por zonas ---------- */
function gravAt(x){let g=1;for(const z of S.gzones||[])if(x>z.x&&x<z.x+z.w)g*=z.g;return g}

/* ---------- etapa ---------- */
function exploreStage(){const s=S;s.gzones=[];s.rescue=null;s.dungeon=null;
 const n=Math.random()<.6?1+(Math.random()<.4?1:0):0;
 for(let i=0;i<n;i++){const anti=Math.random()<.6,w=R(140,220),x=R(300,WORLD-300-w);s.gzones.push({x,w,g:anti?.4:1.7,anti,col:anti?'#3cf0ff':'#ff5a3c'})}
 if(Math.random()<.4){const o=spot();const e=spawnEnemy('crackwall',o.x,o.y,1);if(e){e.y=o.y;e.x=o.x}}
 if(Math.random()<.5)s.ints.push(Object.assign({k:'terminal'},spot()));
 if(Math.random()<.4)s.ints.push(Object.assign({k:'lever'},spot()));
 if((s.stage>=1||s.loop)&&Math.random()<.3)s.ints.push(Object.assign({k:'rescue',prog:0},spot()));
 if((s.stage>=1||s.loop)&&Math.random()<.25)s.ints.push(Object.assign({k:'rift'},spot()))}
const isStructure=e=>!!(e&&e.d&&e.d.structure);

/* ---------- interacción ---------- */
function researchTarget(){const cx=Save.d.codex,pool=[...new Set(STAGE.enemies.concat(S.en.filter(e=>!e.boss&&!isStructure(e)).map(e=>e.type)))];
 return pool.find(k=>!cx[k])||null}
function exploreInteract(o){const p=S.p;
 if(o.k==='terminal'){o.open=1;const k=researchTarget();
  if(!k){const g=Math.round(priceOf({tier:'large'}));p.gold+=g;say(`📖 Ya conoces a todos los enemigos de aquí: la terminal te paga ${g} de oro`);return true}
  Save.d.codex[k]=Date.now();Save.add('research');Save.write();const E=ENEMY_EL[k],W=WOUND_BY[k];
  say(`📖 Investigado: ${ENEMIES[k].name} — débil a ${elemName(E.weak)} · resiste ${elemName(E.res)}${W?` · deja ${WOUNDS[W].name}`:''} · +10% de daño contra él para siempre`);
  Snd.play('level');return true}
 if(o.k==='lever'){o.open=1;Snd.play('boom');say('⚙ El mecanismo despierta: una trampa barre la zona y se abre un compartimento');
  for(let i=0;i<7;i++){const x=clamp(o.x-330+i*110,40,WORLD-40);S.sch.push({t:.25+i*.12,f:()=>{if(!S)return;bolt(x,o.y-420,x,FLOOR,'#ffd23c',3);boom(x,o.y-20,80,ib()*6,'#ffd23c')}})}
  S.sch.push({t:1.3,f:()=>{if(S){giveItem(rollItem(Math.random()<.3?'r':'u'));burst(o.x,o.y-20,20,'#ffd23c',300,3)}}});return true}
 if(o.k==='rescue'){if(S.rescue)return true;S.rescue={o,t:0,wave:0};say('🔓 Libera al explorador: quédate cerca 8 s');Snd.play('ui');return true}
 if(o.k==='rift'){if(S.boss||S.dungeon||S.tp.state!=='idle'){say('La grieta no se abre mientras hay un jefe o el teletransportador está activo');return true}
  o.open=1;S.dungeon={cx:clamp(o.x,460,WORLD-460),wave:0,foes:[]};S.walls={l:S.dungeon.cx-420,r:S.dungeon.cx+420,cx:S.dungeon.cx};
  say('🌀 MAZMORRA: la grieta te encierra · sobrevive a 3 oleadas reforzadas');Snd.play('boss');nextWave();return true}
 return false}
function nextWave(){const D=S.dungeon;D.wave++;const n=2+D.wave;D.foes=[];
 for(let i=0;i<n;i++){const e=spawnEnemy(null,clamp(D.cx+R(-360,360),40,WORLD-40),60);if(e){e.hp*=1.5;e.maxHp*=1.5;e.dmg*=1.2;D.foes.push(e)}}
 say(`🌀 Oleada ${D.wave}/3`)}

/* ---------- ciclo ---------- */
function updExplore(dt){const s=S,p=s.p;
 const R_=s.rescue;if(R_){const near=hyp(R_.o.x-p.x,R_.o.y-p.y)<170;R_.t=near?R_.t+dt:Math.max(0,R_.t-dt*.5);
  if(R_.wave<2&&R_.t>=R_.wave*4){R_.wave++;for(let i=0;i<3;i++)spawnEnemy(null,clamp(R_.o.x+(i-1)*260,40,WORLD-40),60)}
  if(R_.t>=8){R_.o.open=1;s.rescue=null;s.dr.push({k:'orbit',sw:1,perm:1,a:0,life:180,cd:0,dmg:10,x:p.x,y:p.y});giveItem(rollItem('u'));p.gold+=Math.round(priceOf({tier:'small'}));
   Save.add('rescues');say('🔓 ¡Explorador rescatado! Te acompaña como dron aliado durante 3 minutos');Snd.play('level')}}
 const D=s.dungeon;if(D){s.spawn=Math.max(s.spawn,1);
  if(D.foes.every(e=>e.dead)){if(D.wave<3)nextWave();else{s.dungeon=null;s.walls=null;giveItem(rollItem('l'));Save.add('dungeons');
   say('🌀 ¡Mazmorra superada! La grieta te deja un objeto legendario');Snd.play('level');burst(p.x,p.y-20,30,'#b070ff',420,4)}}}}
function exploreInit(){Ev.on('onKill',e=>{if(e.type!=='crackwall')return;Save.add('secrets');
 S.ints.push({k:'chest',tier:'gold',open:0,x:e.x,y:e.y});say('🗝 ¡Sala secreta! Tras el muro había un Cofre Dorado');Snd.play('chest')})}

/* ---------- dibujo ---------- */
function drawGravZones(){for(const z of S.gzones||[]){c.globalAlpha=.08;c.fillStyle=z.col;c.fillRect(z.x,0,z.w,FLOOR);c.globalAlpha=.5;c.fillStyle=z.col;
 for(let i=0;i<8;i++){const ph=(S.t*(z.anti?-60:90)+i*67)%FLOOR,y=z.anti?FLOOR+ph:ph;c.fillRect(z.x+((i*53)%z.w),(y+FLOOR)%FLOOR,2,z.anti?10:16)}
 c.globalAlpha=.7;c.font='bold 10px monospace';c.textAlign='center';c.fillText(z.anti?'↑ ANTIGRAVEDAD':'↓ GRAVEDAD ×1,7',z.x+z.w/2,150);c.globalAlpha=1}}
function drawExplore(o){const t=S.t;c.globalAlpha=o.open?.35:1;
 if(o.k==='terminal'){c.fillStyle='#14202e';c.strokeStyle='#3cf0ff';c.lineWidth=2;c.fillRect(o.x-14,o.y-44,28,44);c.strokeRect(o.x-14,o.y-44,28,44);
  c.fillStyle=o.open?'#1a3a4a':`rgba(60,240,255,${.5+.3*Math.sin(t*6)})`;c.fillRect(o.x-10,o.y-40,20,14);c.fillStyle='#3cf0ff';for(let i=0;i<3;i++)c.fillRect(o.x-10,o.y-22+i*5,8+((i*7+t*10|0)%12),2)}
 else if(o.k==='lever'){c.fillStyle='#3a3020';c.strokeStyle='#c8a060';c.lineWidth=2;rr(c,o.x-18,o.y-20,36,20,4);c.fill();c.stroke();
  const a=o.open?.6:-.6;c.strokeStyle='#e8e0c8';c.lineWidth=3;c.beginPath();c.moveTo(o.x,o.y-14);c.lineTo(o.x+Math.sin(a)*22,o.y-14-Math.cos(a)*22);c.stroke();
  c.fillStyle='#ffd23c';c.beginPath();c.arc(o.x+Math.sin(a)*22,o.y-14-Math.cos(a)*22,4,0,6.283);c.fill()}
 else if(o.k==='rescue'){c.fillStyle='#9aff3c';c.beginPath();c.arc(o.x,o.y-30,7,0,6.283);c.fill();c.fillRect(o.x-5,o.y-24,10,18);
  if(!o.open){c.strokeStyle='#bff4ff';c.lineWidth=2;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(o.x+i*8,o.y);c.lineTo(o.x+i*8,o.y-48);c.stroke()}
   const R_=S.rescue;if(R_&&R_.o===o){c.fillStyle='#000a';c.fillRect(o.x-24,o.y-62,48,5);c.fillStyle='#9aff3c';c.fillRect(o.x-24,o.y-62,48*Math.min(1,R_.t/8),5);
    c.globalAlpha=.25;c.strokeStyle='#9aff3c';c.beginPath();c.arc(o.x,o.y-20,170,0,6.283);c.stroke();c.globalAlpha=1}}}
 else if(o.k==='rift'){c.save();c.translate(o.x,o.y-36);c.rotate(t*1.5);c.strokeStyle='#b070ff';c.lineWidth=3;if(QL.glow)glow('#b070ff',16);
  c.beginPath();c.ellipse(0,0,16,30,0,0,6.283);c.stroke();c.rotate(-t*3);c.strokeStyle='#ff3cf2';c.beginPath();c.ellipse(0,0,8,20,0,0,6.283);c.stroke();c.restore();c.shadowBlur=0}
 c.globalAlpha=1}
function exploreMsg(o){
 if(o.k==='terminal'){const k=researchTarget();return [k?`[E] Terminal: investigar a ${ENEMIES[k].name}`:'[E] Terminal (ya lo sabes todo de aquí)',true]}
 if(o.k==='lever')return ['[E] Mecanismo antiguo · activa una trampa y abre un compartimento',true];
 if(o.k==='rescue')return [S.rescue?'Quédate cerca hasta liberarlo':'[E] Explorador atrapado · libéralo (8 s cerca)',true];
 if(o.k==='rift')return ['[E] Grieta dimensional · mazmorra: 3 oleadas reforzadas por un legendario',!S.boss];return ''}
// muro agrietado (estructura destructible)
function drawStructure(e){const top=e.y-e.h,k=e.hp/e.maxHp;c.fillStyle=e.flash>0?'#fff':'#2a2438';c.strokeStyle='#8a7a9a';c.lineWidth=2;
 c.fillRect(e.x-e.w/2,top,e.w,e.h);c.strokeRect(e.x-e.w/2,top,e.w,e.h);c.strokeStyle='#4a405a';c.lineWidth=1;
 for(let i=1;i<4;i++){c.beginPath();c.moveTo(e.x-e.w/2,top+i*e.h/4);c.lineTo(e.x+e.w/2,top+i*e.h/4);c.stroke()}
 c.strokeStyle=k<.5?'#ffd23c':'#b070ff';c.lineWidth=1.5;c.beginPath();c.moveTo(e.x-4,top+6);c.lineTo(e.x+5,top+e.h*.35);c.lineTo(e.x-3,top+e.h*.6);if(k<.6)c.lineTo(e.x+7,top+e.h-6);c.stroke();
 if(QL.glow&&Math.sin(S.t*3)>.4){c.globalAlpha=.3;c.fillStyle='#b070ff';c.fillRect(e.x-2,top+e.h*.3,4,e.h*.3);c.globalAlpha=1}}

/* ---------- Códice (pantalla de inicio) ---------- */
function openCodex(){hide('title');show('codex');const cx=Save.d.codex,ks=Object.keys(ENEMIES).filter(k=>ENEMIES[k].wt||k==='hunter'||k==='splitlet');
 $('codexList').innerHTML=ks.map(k=>{const d=ENEMIES[k],E=ENEMY_EL[k],W=WOUND_BY[k];if(!cx[k])return `<div class="cx unk"><b>???</b><small>Investígalo en una terminal</small></div>`;
  return `<div class="cx" style="--c:${d.color}"><b>${esc(d.name)}</b><small>${esc(CODEX_LORE[k]||'')}</small><span>Débil: ${elemName(E.weak)} · Resiste: ${elemName(E.res)}${W?` · Herida: ${WOUNDS[W].name}`:''} · +10% daño</span></div>`}).join('');
 const st=Save.d.stats;$('codexStats').textContent=`Investigados ${ks.filter(k=>cx[k]).length}/${ks.length} · Salas secretas ${st.secrets||0} · Rescates ${st.rescues||0} · Mazmorras ${st.dungeons||0} · Heraldo ${st.secretBoss?'derrotado':'sin encontrar'} · Cazador ${st.hunterKills?'derrotado':'acechando'}`}
$('tCodex').onclick=()=>{openCodex();Snd.play('ui')};
$('codexBack').onclick=()=>{hide('codex');goHome()};
