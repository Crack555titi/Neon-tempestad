'use strict';
/* ===================== JEFES: consecuencias, jefe secreto y fusiones (ideas 48, 49 y 50) =====================
   - CONSECUENCIAS (50): cada jefe principal derrotado deja una huella en el resto de la partida (LEGACY). Se guarda con la run.
   - JEFE SECRETO (48): a veces aparece un Sello Antiguo. Solo se abre con 3 ejecuciones en la etapa y la dimensión aún
     estable (≥ 50%); libera al Heraldo del Vacío, un jefe opcional que deja dos objetos legendarios.
   - FUSIONES (49): en el Modo Infinito la última etapa enfrenta a UN jefe fusionado (Arconte + un jefe volador) con los
     ataques de ambos, en lugar de dos jefes por separado. */
const LEGACY={
 prisma:{name:'Refracción',col:'#ff3cf2',desc:'aparecen 2 cofres más en cada etapa'},
 hydra:{name:'Red caída',col:'#ff6a3c',desc:'torretas y francotiradores aparecen la mitad de veces'},
 queen:{name:'Luto espectral',col:'#c8d2ff',desc:'Espectros y Fuegos Fatuos nacen con −30% de vida'},
 leviathan:{name:'Marea de datos',col:'#3cf0ff',desc:'cofres un 15% más baratos, pero cada etapa empieza con 15 menos de estabilidad'},
 archon:{name:'Tempestad desatada',col:'#ffd23c',desc:'+15% de oro y cada ciclo nuevo empieza con una anomalía'}};
const hasLegacy=k=>!!(S&&S.legacy&&S.legacy.includes(k));
const legacyWt=k=>hasLegacy('hydra')&&(k==='turret'||k==='sniper')?.5:1;
const legacyPrice=()=>hasLegacy('leviathan')?.85:1,legacyGold=()=>hasLegacy('archon')?1.15:1;
function legacyStage(){const s=S;s.legacy=s.legacy||[];s.sealExec=0;
 if(hasLegacy('prisma'))for(let i=0;i<2;i++)spawnChest();
 if(hasLegacy('leviathan')&&s.storm)s.storm.stab=85;
 if(hasLegacy('archon')&&s.loop&&s.stage===0&&s.storm&&!s.storm.act.length)stormUnleash(null,'Tempestad desatada');
 if(s.legacy.length)S.sch.push({t:3.5,f:()=>{if(S===s)say('Consecuencias: '+s.legacy.map(k=>LEGACY[k].name).join(' · '))}});
 // el Sello Antiguo: desde la etapa 2 (o en ciclos), 30% por etapa
 if((s.stage>=1||s.loop)&&Math.random()<.3)s.ints.push(Object.assign({k:'seal'},spot()))}
function legacySpawn(e){if(hasLegacy('queen')&&(e.type==='phantom'||e.type==='wisp')){e.hp*=.7;e.maxHp*=.7}}
const legacyText=()=>S&&S.legacy&&S.legacy.length?' · Consecuencias: '+S.legacy.map(k=>`${LEGACY[k].name} (${LEGACY[k].desc})`).join(' · '):'';

/* ---------- el Heraldo del Vacío (jefe secreto) ---------- */
BOSSES.herald={name:'Heraldo del Vacío',hp:3000,stagMax:300,dmg:32,xp:700,color:'#b070ff',w:90,h:90,y:230,stunY:330,
 phaseMsg:{2:'¡FASE 2! El Heraldo llama a sus ecos',3:'¡FASE 3! El vacío se cierra sobre ti'},
 init(b){b.ang=0},
 move(b,dt){const p=S.p;b.x+=(p.x+Math.sin(S.t*.6)*260-b.x)*dt*.8;b.y+=(220+Math.sin(S.t*1.3)*30-b.y)*dt*2;b.ang+=dt*(.8+b.ph*.6)},
 moves:[
  {ph:1,cd:2.4,f(b,f,dm){TG.circle(S.p.x,S.p.y-20,90,1*f+.2,28*dm,'#b070ff',{track:.35,trackY:1})}},
  {ph:1,cd:2.6,f(b,f,dm){for(let i=0;i<5;i++)S.sch.push({t:i*.18,en:1,f:()=>{if(S)TG.slam(clamp(S.p.x+R(-300,300),40,WORLD-40),70,.8,22*dm,'#d070ff')}})}},
  {ph:1,cd:2.8,f(b,f,dm){TG.circle(b.x,b.y-b.h/2,70,.7,0,'#b070ff');S.sch.push({t:.7,en:1,f:()=>{if(S)TG.nova(b.x,b.y-b.h/2,10+b.ph*3,280,18*dm,8,b)}})}},
  {ph:2,cd:3.2,f(b,f,dm){const a=Math.atan2(S.p.y-20-(b.y-b.h/2),S.p.x-b.x);TG.line(b.x,b.y-b.h/2,a-.5,1400,36,1*f+.2,1.1,26*dm,'#b070ff',.9)}},
  {ph:2,cd:4,f(b){for(let i=0;i<2;i++)spawnEnemy('mimic',clamp(b.x+(i?-160:160),40,WORLD-40),b.y,1)}},
  {ph:3,cd:3.4,f(b,f,dm){const p=S.p;for(let i=0;i<4;i++){const x=clamp(p.x+(i-1.5)*170,40,WORLD-40);S.sch.push({t:i*.3,en:1,f:()=>{if(S)TG.circle(x,FLOOR-30,95,.75,30*dm,'#ff3cf2')}})}}}],
 draw(e){const cx=e.x,cy=e.y-e.h/2,t=S.t;glow('#b070ff',24);
  for(let i=0;i<3;i++){c.save();c.translate(cx,cy);c.rotate(e.ang*(i%2?-1:1)+i);c.strokeStyle=i===1?'#ff3cf2':'#b070ff';c.lineWidth=3;
   c.beginPath();c.ellipse(0,0,46+i*10,14+i*4,0,0,6.283);c.stroke();c.restore()}
  c.fillStyle=e.flash>0?'#fff':'#1a0b33';c.beginPath();c.arc(cx,cy,28,0,6.283);c.fill();c.strokeStyle='#d070ff';c.lineWidth=2;c.stroke();
  c.fillStyle='#f0f0ff';c.beginPath();c.ellipse(cx,cy,14,8+Math.sin(t*3)*2,0,0,6.283);c.fill();
  const px=clamp(S.p.x-cx,-6,6);c.fillStyle='#b070ff';c.beginPath();c.arc(cx+px,cy,5,0,6.283);c.fill();
  c.fillStyle='#ffd23c';for(let k=-1;k<=1;k++){c.beginPath();c.moveTo(cx+k*12-5,cy-30);c.lineTo(cx+k*12,cy-44-(k?0:6));c.lineTo(cx+k*12+5,cy-30);c.fill()}c.shadowBlur=0}};
const sealReady=()=>S.sealExec>=3&&S.storm&&S.storm.stab>=50&&!S.boss;
function sealMsg(o){return [`[E] Sello Antiguo · ejecuciones ${Math.min(3,S.sealExec)}/3 · estabilidad ${Math.ceil(S.storm?S.storm.stab:0)}%/50%`,sealReady()]}
function openSeal(o){if(!sealReady()){say(S.boss?'El sello no responde mientras hay un jefe':'El sello pide 3 ejecuciones en esta etapa y la dimensión estable (≥ 50%)');return}
 o.open=1;const b=spawnBossAt('herald',o.x);say('⛧ EL SELLO SE ROMPE: ¡EL HERALDO DEL VACÍO!');chromaHit(1);S.shake=Math.max(S.shake,20);return b}
function drawSeal(o){const k=Math.min(1,(S.sealExec||0)/3),t=S.t;c.globalAlpha=o.open?.3:1;c.fillStyle='#1a1424';c.strokeStyle='#6a5a8a';c.lineWidth=3;
 c.beginPath();c.arc(o.x,o.y-30,26,0,6.283);c.fill();c.stroke();
 for(let i=0;i<3;i++){const a=t*.5+i*2.094,on=i<Math.floor(k*3);c.fillStyle=on?'#d070ff':'#3a2a4a';if(on&&QL.glow)glow('#d070ff',10);
  c.beginPath();c.arc(o.x+Math.cos(a)*18,o.y-30+Math.sin(a)*18,4,0,6.283);c.fill();c.shadowBlur=0}
 c.fillStyle=sealReady()?'#ffd23c':'#5a4a7a';c.font='bold 16px monospace';c.textAlign='center';c.fillText('⛧',o.x,o.y-24);c.globalAlpha=1}

/* ---------- fusiones ---------- */
const FUSE_WITH=['prisma','queen'];  // voladores: comparten posición y movimiento con el Arconte sin romperse
function fusedDef(aId,bId){const A=BOSSES[aId],B=BOSSES[bId],k=`fusion_${aId}_${bId}`;if(BOSSES[k])return k;
 BOSSES[k]={name:`${A.name} ⟷ ${B.name}`,fused:[aId,bId],hp:(A.hp+B.hp)*.7,stagMax:A.stagMax+B.stagMax*.5,dmg:Math.max(A.dmg,B.dmg),xp:A.xp+B.xp,
  color:A.color,w:A.w,h:A.h,y:A.y,stunY:A.stunY,phaseMsg:{2:'¡FASE 2! Las dos voluntades se entrelazan',3:'¡FASE 3! La fusión se desborda'},
  init(b){if(A.init)A.init(b);if(B.init){const x=b.x,y=b.y;B.init(b);b.x=x;b.y=y}},move:A.move,
  tick(b,dt){if(A.tick)A.tick(b,dt);if(B.tick)B.tick(b,dt)},stunned(b,dt){if(A.stunned)A.stunned(b,dt);if(B.stunned)B.stunned(b,dt)},
  onPhase(b,np){if(A.onPhase)A.onPhase(b,np);if(B.onPhase)B.onPhase(b,np)},
  moves:A.moves.concat(B.moves.map(m=>Object.assign({},m,{w:(m.w||1)*.8}))),
  draw(e){c.save();c.globalAlpha=.45;B.draw(e);c.restore();A.draw(e);ring(e.x,e.y-e.h/2,e.w*.8,B.color,.02)}};
 BOSS_EL[k]=BOSS_EL[aId];WOUND_BY[k]=WOUND_BY[aId];  // hereda debilidad, resistencia y heridas del jefe principal
 return k}
function spawnFusion(){const comp=FUSE_WITH[(S.loop-1)%FUSE_WITH.length];const b=spawnBoss(fusedDef(STAGE.boss==='archon'?'archon':STAGE.boss,comp));
 say(`⟷ JEFE FUSIONADO: ${BOSSES[b.bid].name}`);return b}
// jefe en una posición concreta (el Heraldo aparece sobre el sello)
function spawnBossAt(id,x){const b=spawnBoss(id);b.x=clamp(x,150,WORLD-150);if(b.tx!==undefined)b.tx=b.x;return b}

function bossplusInit(){Ev.on('onExecute',()=>{S.sealExec=(S.sealExec||0)+1});
 Ev.on('onKill',e=>{if(!e.boss)return;const k=e.bid;
  if(k==='herald'){for(let i=0;i<2;i++)giveItem(rollItem('l'));Save.add('secretBoss');say('⛧ ¡HERALDO DEL VACÍO DERROTADO! Dos objetos legendarios')}
  const main=BOSSES[k]&&BOSSES[k].fused?BOSSES[k].fused:[k];S.legacy=S.legacy||[];
  for(const m of main)if(LEGACY[m]&&!S.legacy.includes(m)){S.legacy.push(m);S.sch.push({t:2,f:()=>{if(S)say(`Consecuencia: ${LEGACY[m].name} — ${LEGACY[m].desc}`)}})}})}
