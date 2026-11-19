'use strict';
/* ===================== LA TEMPESTAD VIVA: personalidad, deuda, corrupción, sombra, núcleos y tormentas personales =====================
   - PERSONALIDAD (61): cada 50 s la tormenta lee tu estilo reciente y reacciona con un acontecimiento con premio:
     agresivo → desafío de élites · evasivo → cerco de rayos que te obliga a moverte · explorador → secretos extra.
   - DEUDA (62): «El Acreedor» presta poder (objeto raro, luego legendario). Cada préstamo sube la deuda; al empezar cada
     etapa cobra con oro y, si no alcanza, los enemigos pegan más fuerte y, con deuda alta, llegan cobradores.
   - CORRUPCIÓN (65): barra 0–100 (fragmentos, absorber energía, préstamos, núcleos). Da daño a cambio de curación y
     enemigos más duros. Al 100% aparece tu SOMBRA CORRUPTA (64): derrótala para bajar al 50%.
   - NÚCLEOS (66): cada etapa tiene uno: destruirlo, estabilizarlo o absorberlo cambia esta etapa y la siguiente.
   - TORMENTAS PERSONALES (67): cada familia tiene su propia anomalía (storm.js) que altera también sus habilidades. */
const PERS_WIN=50;
const taint=()=>S.p.taint||0;
function addTaint(n,why){const p=S.p,b=taint();p.taint=clamp(b+n,0,100);
 for(const th of [25,50,75])if(b<th&&p.taint>=th)say(`☣ Corrupción ${th}%: ${th===25?'+10% de daño':th===50?'+20% de daño y vel. de ataque, −20% de curación':'+35% de daño, pero los enemigos nacen corruptos'}`);
 if(why)txt(p.x,p.y-74,`☣ +${n} ${why}`,'#b070ff',11);
 if(p.taint>=100&&!S.shade){S.sch.push({t:1,f:()=>{if(S&&!S.shade)spawnShade()}})}}
// efectos de la corrupción: se leen como buff (bm evalúa funciones)
function taintBuff(){buff('taint',Infinity,{dmg:()=>{const t=taint();return 1+(t>=25?.1:0)+(t>=50?.1:0)+(t>=75?.15:0)},
 as:()=>taint()>=50?1.1:1,healm:()=>taint()>=50?.8:1})}

/* ---------- la Sombra Corrupta (copia del héroe) ---------- */
function spawnShade(){const p=S.p,side=p.face>0?-1:1;const e=spawnEnemy('shade',clamp(p.x+side*360,40,WORLD-40),p.y,1);if(!e)return;
 e.hp=e.maxHp=e.maxHp*(1+.25*S.loop);S.shade=e;say(`☣ TU CORRUPCIÓN TOMA FORMA: ¡la Sombra de ${S.ch.name}!`);chromaHit(1);S.shake=Math.max(S.shake,16);Snd.play('boss');return e}
EAI.shade=(e,dt,p,sp)=>{if(e.lunge>0){e.lunge-=dt;e.vx=e.ldir*560;phys(e,dt);return}
 if(e.tell>0){e.tell-=dt;e.vx*=.8;phys(e,dt);if(e.tell<=0){if(e.mode){e.lunge=.3;e.ldir=sgn(p.x-e.x)}else{const a=Math.atan2(p.y-p.h/2-(e.y-e.h/2),p.x-e.x);
   for(let i=-1;i<=1;i++)shootP(e.x,e.y-e.h/2,a+i*.15,360,e.dmg*.7,6,e)}}return}
 keepRange(e,dt,p,sp);phys(e,dt);e.cd-=dt;if(e.cd<=0){e.cd=R(1.6,2.4);e.mode=Math.abs(p.x-e.x)<220;e.tell=.5}};
function drawShade(e){c.save();c.globalAlpha=e.flash>0?1:.85;drawHero(c,e.x,e.y,{cid:S.cid,col:e.flash>0?'#fff':'#5a1aaa',face:sgn(S.p.x-e.x)||1,
 aim:Math.atan2(S.p.y-e.y,S.p.x-e.x),run:S.t*8,moving:Math.abs(e.vx)>20,atk:e.tell>0?1:0,t:S.t,ghost:1});c.restore();
 if(QL.glow&&Math.sin(S.t*20)>.3){c.globalAlpha=.3;c.fillStyle='#ff3cf2';c.fillRect(e.x-14+R(-3,3),e.y-e.h,28,e.h);c.globalAlpha=1}
 c.font='bold 11px monospace';c.textAlign='center';c.fillStyle='#d070ff';c.fillText(`SOMBRA DE ${S.ch.name.toUpperCase()}`,e.x,e.y-e.h-26);
 c.fillStyle='#22113a';c.fillRect(e.x-36,e.y-e.h-22,72,5);c.fillStyle='#b070ff';c.fillRect(e.x-36,e.y-e.h-22,72*Math.max(0,e.hp/e.maxHp),5)}

/* ---------- deuda ---------- */
const debtCost=()=>Math.round(priceOf({tier:'large'})*1.5);
function creditorMsg(o){const d=S.debt||0;return [`[E] El Acreedor · pedir prestado ${d?'un legendario':'un objeto raro'} (deuda ${d}→${d+1+(d?1:0)})`,true]}
function borrow(o){const d=S.debt||0;giveItem(rollItem(d?'l':'r'));S.debt=d+1+(d?1:0);addTaint(15,'préstamo');Snd.play('chest');
 say(`⛓ El Acreedor te presta poder. Deuda: ${S.debt}. Cobra ${debtCost()} de oro por punto al empezar cada etapa`)}
function debtStage(){const s=S,p=s.p;if(!(s.debt>0))return;const per=debtCost(),can=Math.min(s.debt,Math.floor(p.gold/per));
 if(can){p.gold-=can*per;s.debt-=can;say(`⛓ El Acreedor cobra ${can*per} de oro (${can} de deuda)${s.debt?`. Quedan ${s.debt}`:'. Deuda saldada'}`)}
 if(s.debt>0)S.sch.push({t:3,f:()=>{if(S===s)say(`⛓ Deuda impagada (${s.debt}): enemigos +${s.debt*8}% de daño${s.debt>=3?' y llegan cobradores':''}`)}})}
function debtSpawn(e){if(S.debt>0&&!e.d.structure)e.dmg*=1+.08*S.debt;if(taint()>=75&&!e.d.structure&&e.type!=='shade'){e.hp*=1.2;e.maxHp*=1.2;e.corrupt=1}}

/* ---------- núcleo de escenario ---------- */
const CORE_OPTS=[
 {id:'destruir',name:'Destruirlo',col:'#ff3c6a',sub:'Arrasa a los enemigos cercanos, deja oro y un cofre grande. −30 de estabilidad; la próxima etapa trae menos enemigos.'},
 {id:'estabilizar',name:'Estabilizarlo',col:'#4cff9a',sub:'+40 de estabilidad, disipa las anomalías y te cura un 30%. −20 de corrupción. La próxima etapa empieza sin anomalías.'},
 {id:'absorber',name:'Absorberlo',col:'#b070ff',sub:'+8% de daño para el resto de la run y un objeto poco común, pero +30 de corrupción y la próxima etapa empieza con una anomalía.'}];
function openCore(o){S.st='choice';mouse.l=mouse.r=0;S.coreObj=o;
 pickOpts=CORE_OPTS.map(c=>({kind:'core',id:c.id,title:c.name,sub:c.sub,col:c.col,fn:()=>takeCore(c.id)}));
 $('choiceT').textContent='◈ NÚCLEO DIMENSIONAL';$('choiceOpts').innerHTML=pickOpts.map((o2,i)=>`<div class="card sel" data-i="${i}" style="--c:${o2.col}"><b>${esc(o2.title)}</b><small>${o2.sub}</small></div>`).join('');
 $('choice').style.display='flex';Snd.play('boss')}
function takeCore(id){const o=S.coreObj,p=S.p,st=S.storm;o.open=1;S.coreNext=id;
 if(id==='destruir'){boom(o.x,o.y-30,320,ib()*15,'#ff3c6a');S.shake=Math.max(S.shake,22);p.gold+=Math.round(priceOf({tier:'large'}));S.ints.push({k:'chest',tier:'large',open:0,x:o.x,y:o.y});if(st)st.stab=Math.max(0,st.stab-30)}
 if(id==='estabilizar'){if(st){st.stab=Math.min(100,st.stab+40);for(const k of st.act.slice())stormEnd(k)}heal(p.maxHp*.3);addTaint(-20)}
 if(id==='absorber'){p.coreDmg=(p.coreDmg||0)+.08;buff('core',Infinity,{dmg:()=>1+(S.p.coreDmg||0)});giveItem(rollItem('u'));addTaint(30,'núcleo')}
 say(`◈ Núcleo: ${CORE_OPTS.find(c=>c.id===id).name}`)}
// efecto del núcleo anterior al empezar la etapa siguiente
function coreStage(){const s=S,prev=s.coreNext;s.coreNext=null;s.ints.push(Object.assign({k:'core'},spot()));
 if(prev==='destruir'){s.spawnMulCore=.7;s.sch.push({t:3,f:()=>{if(S===s)say('◈ El núcleo destruido debilitó esta dimensión: aparecen menos enemigos')}})}else s.spawnMulCore=1;
 if(prev==='estabilizar'&&s.storm)for(const k of s.storm.act.slice())stormEnd(k);
 if(prev==='absorber')stormUnleash(null,'El núcleo absorbido')}
function drawCore(o){const t=S.t,cy=o.y-40;c.globalAlpha=o.open?.3:1;if(QL.glow&&!o.open)glow('#b070ff',20);
 for(let i=0;i<3;i++){c.save();c.translate(o.x,cy);c.rotate(t*(i%2?-1.2:.9)+i);c.strokeStyle=['#3cf0ff','#ff3cf2','#ffd23c'][i];c.lineWidth=2;
  c.beginPath();c.ellipse(0,0,22-i*4,8+i*2,0,0,6.283);c.stroke();c.restore()}
 c.fillStyle='#f0f0ff';c.beginPath();c.arc(o.x,cy,7+Math.sin(t*4)*1.5,0,6.283);c.fill();c.shadowBlur=0;c.globalAlpha=1}
function drawCreditor(o){const bob=Math.sin(S.t*1.5)*3;c.globalAlpha=o.open?.35:1;c.fillStyle='#0a0614';c.strokeStyle='#ffd23c';c.lineWidth=1.5;
 c.beginPath();c.moveTo(o.x-16,o.y);c.lineTo(o.x-10,o.y-50+bob);c.lineTo(o.x+10,o.y-50+bob);c.lineTo(o.x+16,o.y);c.closePath();c.fill();c.stroke();
 c.fillStyle='#ffd23c';c.fillRect(o.x-6,o.y-44+bob,3,3);c.fillRect(o.x+3,o.y-44+bob,3,3);
 c.strokeStyle='#888';for(let i=0;i<4;i++){c.beginPath();c.arc(o.x+18+i*6,o.y-20+bob+Math.sin(S.t*3+i)*2,3,0,6.283);c.stroke()}c.globalAlpha=1}

/* ---------- personalidad de la Tempestad ---------- */
const persState=()=>S.pers||(S.pers={t:PERS_WIN,kills:0,dash:0,near:0,time:0,acts:0,dist:0,lastX:S.p.x,event:null});
function updPersonality(dt){const P=persState(),p=S.p;if(S.boss||S.dungeon)return;P.time+=dt;P.dist+=Math.abs(p.x-P.lastX);P.lastX=p.x;
 if(S.en.some(e=>!e.dead&&!e.d.structure&&Math.abs(e.x-p.x)<220))P.near+=dt;
 const E=P.event;if(E){E.t-=dt;if(E.tick)E.tick(dt);if(E.t<=0||E.done){if(E.end)E.end();P.event=null}}
 P.t-=dt;if(P.t>0)return;P.t=PERS_WIN;
 const kpm=P.kills/P.time*60,nearF=P.near/P.time,style=P.acts>=2||P.dist>P.time*260?'explorador':kpm>14||nearF>.5?'agresivo':P.dash>6||nearF<.2?'evasivo':null;
 Object.assign(P,{kills:0,dash:0,near:0,time:0,acts:0,dist:0});if(style&&!P.event)persEvent(style)}
function persEvent(style){const P=persState(),p=S.p;
 if(style==='agresivo'){const foes=[];for(let i=0;i<3;i++){const e=spawnEnemy(null,clamp(p.x+(i-1)*240,40,WORLD-40),60);if(e){e.hp*=1.6;e.maxHp*=1.6;foes.push(e)}}
  P.event={t:35,foes,tick(){if(this.foes.every(e=>e.dead)&&!this.done){this.done=1;giveItem(rollItem('r'));say('🌩 Desafío superado: la Tempestad te concede un objeto raro')}},
   end(){if(!this.done)say('🌩 El desafío de la Tempestad expiró')}};say('🌩 La Tempestad nota tu furia: DESAFÍO — derrota a 3 enemigos reforzados en 35 s')}
 if(style==='evasivo'){P.event={t:10,acc:0,tick(dt){this.acc-=dt;if(this.acc<=0){this.acc=1.1;stormStrike(S.p.x,FLOOR,60,.85,'#3cf0ff',16)}},
   end(){if(S.storm)S.storm.stab=Math.min(100,S.storm.stab+10);say('🌩 Cerco superado: la dimensión se estabiliza un poco (+10)')}};say('🌩 La Tempestad nota que la esquivas: CERCO — no te quedes quieto 10 s')}
 if(style==='explorador'){const o=spot();const w=spawnEnemy('crackwall',o.x,o.y,1);if(w){w.y=o.y;w.x=o.x}S.ints.push(Object.assign({k:'terminal'},spot()));
  P.event={t:1,done:1};say('🌩 La Tempestad premia tu curiosidad: han aparecido un muro agrietado y una terminal')}}

/* ---------- etapa, interacción y eventos ---------- */
function tempestStage(){const s=S;s.pers=null;debtStage();coreStage();if(Math.random()<.35&&(s.stage>=1||s.loop))s.ints.push(Object.assign({k:'creditor'},spot()))}
function tempestInteract(o){if(o.k==='core'){openCore(o);return true}if(o.k==='creditor'){borrow(o);return true}return false}
function tempestMsg(o){if(o.k==='core')return ['[E] Núcleo dimensional · destruir, estabilizar o absorber',true];if(o.k==='creditor')return creditorMsg(o);return ''}
function tempestDraw(o){if(o.k==='core'){drawCore(o);return true}if(o.k==='creditor'){drawCreditor(o);return true}return false}
function tempestInit(){taintBuff();
 Ev.on('onKill',e=>{persState().kills++;if(e===S.shade){S.shade=null;S.p.taint=50;giveItem(rollItem('r'));say('☣ ¡Has vencido a tu Sombra! La corrupción baja al 50%')}});
 Ev.on('onDash',()=>persState().dash++);
 // cobradores: con deuda alta, cada 30 s llega un enemigo reforzado a por ti
 S.collT=30}
function updTempest(dt){updPersonality(dt);if(S.debt>=3&&!S.boss){S.collT-=dt;if(S.collT<=0){S.collT=30;const e=spawnEnemy(null,clamp(S.p.x+R(-400,400),40,WORLD-40),60);
 if(e){e.hp*=1.5;e.maxHp*=1.5;e.collector=1;say('⛓ Un cobrador del Acreedor viene a por ti')}}}}
// corrupción y deuda en el HUD (bajo el panel de estabilidad) y viñeta violeta
function drawTempestHud(){const t=taint();if(t>0){const g=c.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.85);g.addColorStop(0,'rgba(90,20,170,0)');
 g.addColorStop(1,`rgba(90,20,170,${t/100*.35})`);c.fillStyle=g;c.fillRect(0,0,W,H)}
 if(!t&&!(S.debt>0))return;const tm=touchOn(),x=W-216,y=tm?(S.p.revive>0?132:118)+40:H-46-22;panel(x,y,206,20,'#b070ff55');
 c.textAlign='left';c.font='bold 9px monospace';c.fillStyle='#d070ff';c.fillText(`☣ CORRUPCIÓN ${Math.round(t)}%`,x+8,y+13);gbar(x+96,y+8,58,5,t/100,'#5a1aaa','#d070ff');
 if(S.debt>0){c.textAlign='right';c.fillStyle='#ffd23c';c.fillText(`⛓ ${S.debt}`,x+200,y+13)}}
const tempestSave=()=>({taint:S.p.taint||0,debt:S.debt||0,coreDmg:S.p.coreDmg||0,coreNext:S.coreNext||null});
function tempestLoad(run){S.p.taint=run.taint||0;S.debt=run.debt||0;S.p.coreDmg=run.coreDmg||0;S.coreNext=run.coreNext||null;if(S.p.coreDmg)buff('core',Infinity,{dmg:()=>1+(S.p.coreDmg||0)})}
