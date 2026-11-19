'use strict';
/* ===================== PERSONAJES NEUTRALES: mercader errante y ermitaño de misiones (idea 45) =====================
   No atacan ni pueden ser atacados. Aparecen a veces al empezar una etapa como interactuables (S.ints, igual que cofres y altares).
   - MERCADER: ofrece 2 objetos a la vista (poco común o raro) a precio fijo; se compran con Interactuar, uno tras otro.
   - ERMITAÑO: propone una misión con recompensa (objeto raro y oro). Solo una a la vez; algunas tienen tiempo límite. */
const QUESTS=[
 {id:'cazador',name:'Cacería',desc:'Elimina 15 enemigos en 45 s',goal:15,time:45},
 {id:'verdugo',name:'Verdugo',desc:'Ejecuta 3 enemigos debilitados',goal:3},
 {id:'reflejos',name:'Reflejos',desc:'Haz 3 parries',goal:3},
 {id:'intocable',name:'Intocable',desc:'Aguanta 25 s sin recibir daño',goal:25,timer:1},
 {id:'virtuoso',name:'Virtuoso',desc:'Llega a un combo de 25',goal:25,combo:1}];

function npcStage(){const s=S;s.quest=null;
 if(Math.random()<.5){const o=Object.assign({k:'merchant',stock:[0,1].map(()=>{const r=Math.random()<.6?'u':'r';return {id:rollItem(r),r}})},spot());s.ints.push(o)}
 if(Math.random()<.45)s.ints.push(Object.assign({k:'hermit',q:QUESTS[Math.random()*QUESTS.length|0]},spot()))}
const merchantPrice=it=>Math.round(priceOf({tier:it.r==='r'?'gold':'large'})*(it.r==='r'?.8:1.5));
// interacción con un neutral; true = era uno de estos
function npcInteract(o){const p=S.p;
 if(o.k==='merchant'){const it=o.stock[0];if(!it)return true;const pr=merchantPrice(it);if(p.gold<pr){say(`El mercader quiere ${pr} de oro`);return true}
  p.gold-=pr;o.stock.shift();giveItem(it.id);Snd.play('chest');if(!o.stock.length){o.open=1;say('«Vuelve cuando la tormenta amaine.» El mercader se queda sin existencias')}return true}
 if(o.k==='hermit'){if(S.quest&&!S.quest.done){say(`Ya tienes una misión: ${S.quest.q.desc}`);return true}
  S.quest={q:o.q,prog:0,t:o.q.time||0,done:0};o.open=1;say(`📜 Misión aceptada: ${o.q.name}. ${o.q.desc}`);Snd.play('ui');return true}
 return false}
function questProgress(n){const Q=S.quest;if(!Q||Q.done)return;Q.prog=Math.min(Q.q.goal,Q.prog+n);if(Q.prog>=Q.q.goal)questDone()}
function questDone(){const Q=S.quest,p=S.p;Q.done=1;giveItem(rollItem('r'));const g=Math.round(priceOf({tier:'large'}));p.gold+=g;
 say(`📜 ¡Misión cumplida: ${Q.q.name}! Objeto raro y ${g} de oro`);Snd.play('level');burst(p.x,p.y-20,24,'#ffd23c',360,3)}
function npcInit(){
 Ev.on('onKill',()=>{if(S.quest&&S.quest.q.id==='cazador')questProgress(1)});
 Ev.on('onExecute',()=>{if(S.quest&&S.quest.q.id==='verdugo')questProgress(1)});
 Ev.on('onParry',()=>{if(S.quest&&S.quest.q.id==='reflejos')questProgress(1)});
 Ev.on('onTakeDamage',()=>{if(S.quest&&S.quest.q.id==='intocable'&&!S.quest.done)S.quest.prog=0})}
function updNpcs(dt){const Q=S.quest;if(!Q||Q.done)return;
 if(Q.q.timer)questProgress(dt);
 if(Q.q.combo&&cmb().combo>Q.prog)questProgress(cmb().combo-Q.prog);
 if(Q.q.time){Q.t-=dt;if(Q.t<=0){say(`📜 Misión fallida: ${Q.q.name}`);S.quest=null}}}

/* ---------- dibujo ---------- */
function drawNpc(o){const t=S.t,bob=Math.sin(t*2+o.x)*2;c.globalAlpha=o.open?.4:1;
 if(o.k==='merchant'){// figura encapuchada con farol y mochila
  c.fillStyle='#3a2a1a';rr(c,o.x-16,o.y-40+bob,12,22,4);c.fill();
  c.fillStyle='#5a3a6a';c.beginPath();c.moveTo(o.x-12,o.y);c.lineTo(o.x-7,o.y-38+bob);c.lineTo(o.x+9,o.y-38+bob);c.lineTo(o.x+12,o.y);c.closePath();c.fill();
  c.beginPath();c.arc(o.x+1,o.y-42+bob,8,0,6.283);c.fill();c.fillStyle='#ffd23c';c.fillRect(o.x+2,o.y-44+bob,4,2);
  const lx=o.x+16,ly=o.y-26+bob;c.strokeStyle='#888';c.lineWidth=1.5;c.beginPath();c.moveTo(o.x+8,o.y-30+bob);c.lineTo(lx,ly-6);c.stroke();
  if(QL.glow){glow('#ffd23c',14)}c.fillStyle='#ffd23c';c.fillRect(lx-3,ly-5,6,8);c.shadowBlur=0;
  // mercancía flotando encima
  (o.stock||[]).forEach((s,i)=>{const it=ITEM[s.id];drawIcon(it,o.x-26+i*30,o.y-86+Math.sin(t*2+i)*3,22)})}
 if(o.k==='hermit'){c.fillStyle='#2a3a4a';c.beginPath();c.moveTo(o.x-13,o.y);c.lineTo(o.x-6,o.y-36+bob);c.lineTo(o.x+8,o.y-36+bob);c.lineTo(o.x+13,o.y);c.closePath();c.fill();
  c.beginPath();c.arc(o.x+1,o.y-41+bob,8,0,6.283);c.fill();c.fillStyle='#e8e0c8';c.fillRect(o.x-6,o.y-36+bob,12,3);
  c.strokeStyle='#c8a060';c.lineWidth=2.5;c.beginPath();c.moveTo(o.x-15,o.y);c.lineTo(o.x-15,o.y-50+bob);c.stroke();
  if(!o.open){c.fillStyle='#ffd23c';c.font='bold 18px monospace';c.textAlign='center';c.fillText('!',o.x+1,o.y-58+bob)}}
 c.globalAlpha=1}
function npcMsg(o){const p=S.p;
 if(o.k==='merchant'){const s=o.stock[0];if(!s)return '';const it=ITEM[s.id],pr=merchantPrice(s);return [`[E] Comprar ${it.name} (${RARITY[s.r].n}) · ${pr} oro`,p.gold>=pr]}
 if(o.k==='hermit')return [`[E] Misión: ${o.q.name} — ${o.q.desc}`,true];return ''}
// progreso de la misión, abajo a la izquierda (encima de las heridas)
function drawQuestHud(){const Q=S.quest;if(!Q)return;c.textAlign='left';c.font='bold 10px monospace';
 c.fillStyle=Q.done?'#4cff9a':'#ffd23c';const pr=Q.q.timer?`${Math.floor(Q.prog)}/${Q.q.goal} s`:`${Math.floor(Q.prog)}/${Q.q.goal}`;
 c.fillText(`📜 ${Q.q.name}: ${Q.done?'¡cumplida!':pr}${Q.q.time&&!Q.done?` · ${Math.ceil(Q.t)} s`:''}`,16,H-74)}
