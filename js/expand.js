'use strict';
/* ===================== MUNDO AMPLIADO =====================
   - Mapa de 4000 px: el diseño original de cada etapa queda en el centro y a los lados hay tramos que se generan
     distinto en cada partida (y el centro puede salir espejado).
   - Cuerdas (mantén saltar para trepar) y tirolesas (E en el anclaje).
   - Subsuelo: una trampilla lleva a una caverna con dos oleadas y un guardián; al vencerlo, botín. Se vuelve por la escotilla.
   - Eventos: baliza que hay que defender 20 s y cofre maldito con guardianes.
   - Jefes con escenario propio: cada etapa añade un peligro del entorno durante la pelea.
   - Desafío diario: mismo personaje, dificultad, regla y mapas para todos ese día, con su propio ranking. */
const OFF=(WORLD-2400)/2;  // el diseño original medía 2400 px: se centra
const XCFG={events:1};      // las pruebas lo apagan para que los sucesos no interfieran

// el diseño original pasa al centro; los tramos laterales siempre tienen suelo
for(const st of STAGES){
 for(const q of st.plats)if(!(q.solid&&q.w>=WORLD))q.x+=OFF;
 for(const t of st.tp)t.x+=OFF;
 if(!st.plats.some(q=>q.solid&&q.w>=WORLD&&q.ph[0]===1&&q.ph[1]===3))st.plats.push(fl(0,OFF+2),fl(WORLD-OFF-2,OFF+2))}

/* ---------- generación de cada etapa ---------- */
function xRng(i){const D=S.daily||DAILY_PENDING;return D?rng(D.seed*31+i*977+(S.loop||0)*13):rng(Math.random()*1e9|0)}
function expandStage(i){const s=S,rnd=xRng(i);s.ropes=[];s.zips=[];s.under=null;s.ev=null;s.evT=50+rnd()*30;s.hzT=6;s.hzSaid=0;
 // espejo del centro (las posiciones de lo ya colocado también)
 if(rnd()<.5){for(const q of PLAT)if(!(q.solid&&q.w>=WORLD))q.x=WORLD-q.x-q.w;
  for(const o of s.ints){o.x=WORLD-o.x;if(o.to)o.to.x=WORLD-o.to.x}if(s.gzones)for(const z of s.gzones)z.x=WORLD-z.x-z.w;s.tp.x=WORLD-s.tp.x}
 if(s.daily){const t=STAGE.tp[(rnd()*STAGE.tp.length)|0],tp=s.ints.find(o=>o.k==='tp');s.tp.x=tp.x=t.x;s.tp.y=tp.y=t.y}  // diaria: el mismo teletransportador para todos
 s.p.x=s.tp.x<WORLD/2?WORLD-250:250;
 // tramos laterales: escalones de plataformas, una cuerda hasta la más alta y una tirolesa hacia el centro
 for(const side of [0,WORLD-OFF]){const n=3+(rnd()*2|0),ps=[];let y=FLOOR-90-rnd()*30;
  for(let k=0;k<n;k++){const w=120+rnd()*90,x=side+60+k*(OFF-120)/n+rnd()*30;y=clamp(y-(rnd()<.6?70:-50)-rnd()*20,190,FLOOR-80);
   const q={x,y,w,h:12,ph:[1,3],gen:1};PLAT.push(q);ps.push(q)}
  const hi=ps.reduce((a,b)=>b.y<a.y?b:a);s.ropes.push({x:hi.x+hi.w/2,top:hi.y,bot:FLOOR});
  const toC=side===0?1:-1,x1=toC>0?hi.x+hi.w-10:hi.x+10,x2=toC>0?OFF+260:WORLD-OFF-260,z={x1,y1:hi.y-40,x2,y2:FLOOR-120};
  s.zips.push(z);s.ints.push({k:'zip',x:x1,y:hi.y,z});
  const q=ps[(rnd()*ps.length)|0];s.ints.push({k:'chest',tier:rnd()<.3||s.routeCur==='vacio'?'large':'small',open:0,x:q.x+q.w/2,y:q.y})}
 if(!s.tut&&s.mode!=='inv'){const side=rnd()<.5?0:WORLD-OFF;s.ints.push({k:'hatch',x:side+OFF*(.3+rnd()*.4),y:FLOOR})}}

/* ---------- cuerdas y tirolesas ---------- */
function ropeAt(p){for(const r of S.ropes||[])if(Math.abs(p.x-r.x)<18&&p.y>r.top+4&&p.y<=r.bot+2)return r;return null}
function updMove(dt,y0){const s=S,p=s.p;
 if(s.zipR){const R_=s.zipR,z=R_.z,L=hyp(z.x2-z.x1,z.y2-z.y1);R_.d+=560*dt;const f=Math.min(1,R_.d/L);
  p.x=z.x1+(z.x2-z.x1)*f;p.y=z.y1+(z.y2-z.y1)*f+34;p.vy=0;p.face=sgn(z.x2-z.x1)||1;if(f>=1||act('down')){s.zipR=null;p.vy=-120}return}
 const r=p.climb||(act('jump')?ropeAt(p):null);
 if(!r){p.climb=null;return}
 if(Math.abs(p.x-r.x)>22){p.climb=null;return}  // te apartas de la cuerda: la sueltas
 p.climb=r;const v=act('jump')?-230:act('down')?230:0;p.y=clamp(y0+v*dt,r.top,r.bot);p.vy=0;p.jumps=0;
 if(p.y<=r.top+1){p.y=r.top;p.climb=null;p.ground=1}}
function zipUse(o){const p=S.p;if(S.zipR)return;S.zipR={z:o.z,d:0};p.climb=null;Snd.play('ui')}

/* ---------- subsuelo ---------- */
const CAVE_W=700;
function hatchUse(o){const s=S,p=s.p;
 if(s.boss||s.tp.state!=='idle'||s.dungeon)return say('La trampilla no se abre con el jefe despierto o el teletransportador activo');
 const cx=WORLD/2,U={plat:PLAT,en:s.en,ints:s.ints,x:p.x,y:p.y,gz:s.gzones,ropes:s.ropes,zips:s.zips,cx,wave:0,foes:[],done:0,o};
 o.open=1;s.under=U;PR.clear();s.zn=[];s.gzones=[];s.zips=[];
 PLAT=[{x:cx-CAVE_W,y:FLOOR,w:CAVE_W*2,h:60,ph:[1,3],solid:1},{x:cx-520,y:400,w:200,h:12,ph:[1,3]},{x:cx-170,y:330,w:220,h:12,ph:[1,3]},
  {x:cx+230,y:390,w:200,h:12,ph:[1,3]},{x:cx+470,y:300,w:160,h:12,ph:[1,3]},{x:cx-400,y:250,w:150,h:12,ph:[1,3]}];
 s.ropes=[{x:cx+550,top:300,bot:FLOOR}];
 s.en=[];s.ints=[{k:'hatchUp',x:cx-CAVE_W+80,y:FLOOR}];p.x=cx-CAVE_W+120;p.y=FLOOR;p.vy=0;p.dash=null;
 say('SUBSUELO · vence a las dos oleadas y al guardián');Snd.play('tp');caveWave()}
function caveWave(){const U=S.under,n=3+U.wave*2;U.wave++;U.foes=[];
 for(let k=0;k<n;k++){const e=spawnEnemy(null,U.cx+R(-CAVE_W+200,CAVE_W-80),60,true);if(e){e.hp*=1.3;e.maxHp*=1.3;U.foes.push(e)}}
 if(U.wave===3){const e=spawnEnemy(STAGE.enemies[0],U.cx+300,60,true);if(e){e.hp*=7;e.maxHp*=7;e.dmg*=1.5;e.guard=1;U.foes.push(e)}say('¡El GUARDIÁN del subsuelo!')}}
function updCave(dt){const s=S,U=s.under,p=s.p,l=U.cx-CAVE_W+12,r=U.cx+CAVE_W-12;s.spawn=Math.max(s.spawn,1);
 p.x=clamp(p.x,l,r);for(const e of s.en)e.x=clamp(e.x,l+10,r-10);
 if(!U.done&&U.foes.every(e=>e.dead)){if(U.wave<3)caveWave();else{U.done=1;giveItem(rollItem('r'));giveItem(rollItem('u'));p.gold+=Math.round(60*scaleCost());
  Save.add('caves');say('¡Subsuelo despejado! Botín: dos objetos y oro. Vuelve por la escotilla');burst(p.x,p.y-30,40,'#ffd23c',400,4)}}}
function caveExit(){const s=S,U=s.under;if(!U)return;PLAT=U.plat;s.en=U.en;s.ints=U.ints;s.gzones=U.gz;s.ropes=U.ropes;s.zips=U.zips;
 const p=s.p;p.x=U.o.x;p.y=FLOOR;p.vy=0;p.climb=null;s.under=null;PR.clear();s.zn=[];say(U.done?'De vuelta en la superficie':'Sales del subsuelo sin el botín');Snd.play('tp')}
function drawCave(cam,t){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#07050a');g.addColorStop(1,'#140c10');c.fillStyle=g;c.fillRect(0,0,W,H);
 const col=STAGE.plat.glow;for(let k=0;k<2;k++){const par=k?.6:.3,off=(cam*par)%240;c.fillStyle=k?'#1c1218':'#120c10';
  for(let x=-240;x<W+240;x+=60){const X=x-off,h=30+((x*7919)%90+90)%90*(k?.6:1);c.beginPath();c.moveTo(X,0);c.lineTo(X+30,h);c.lineTo(X+60,0);c.fill()}}
 c.globalAlpha=.4+.2*Math.sin(t*2);c.fillStyle=col;for(let x=0;x<W;x+=170){const X=(x-(cam*.8)%170+170)%(W+170)-85;c.fillRect(X,FLOOR-40-(x%3)*30,4,12)}c.globalAlpha=1}

/* ---------- eventos ---------- */
function evStart(){const s=S,p=s.p;let o=null;for(let k=0;k<12;k++){const sp=spot();if(Math.abs(sp.x-p.x)>500){o=sp;break}}o=o||spot();
 if(Math.random()<.5){s.ints.push(Object.assign({k:'beacon',st:'idle',prog:0,t:0},o));say('¡EVENTO: una BALIZA pide defensa! Búscala en el minimapa')}
 else{s.ints.push(Object.assign({k:'cursed',open:0},o));say('¡EVENTO: apareció un COFRE MALDITO! Búscalo en el minimapa')}}
function updEvents(dt){const s=S,p=s.p;
 if(XCFG.events&&!s.tut&&s.mode!=='inv'&&!s.boss&&!s.under&&s.tp.state==='idle'){s.evT-=dt;if(s.evT<=0){s.evT=70+Math.random()*30;evStart()}}
 for(const o of s.ints){
  if(o.k==='beacon'&&o.st==='on'){o.t+=dt;const inR=Math.abs(p.x-o.x)<170&&Math.abs(p.y-o.y)<160;if(inR)o.prog+=dt;
   o.wT=(o.wT||0)-dt;if(o.wT<=0){o.wT=4;for(let k=0;k<3;k++)spawnEnemy(null,clamp(o.x+(k%2?1:-1)*R(300,480),40,WORLD-40),60)}
   if(o.prog>=20){o.st='done';o.open=1;giveItem(rollItem(rollR(CHESTS.large.w)));p.gold+=Math.round(40*scaleCost());Save.add('beacons');say('¡Baliza defendida! Recompensa: objeto y oro')}
   else if(o.t>60){o.st='done';o.open=1;say('La baliza se apagó')}}
  if(o.k==='cursed'&&o.foes&&!o.paid&&o.foes.every(e=>e.dead)){o.paid=1;giveItem(rollItem('r'));giveItem(rollItem('r'));say('¡Maldición rota! Dos objetos raros')}}}

/* ---------- peligros del escenario durante el jefe ---------- */
const HAZ={
 ruinas:{n:'lluvia de cristales',f(dm){for(let k=0;k<5;k++){const x=clamp(S.p.x+R(-380,380),40,WORLD-40);S.sch.push({t:k*.15,en:1,f:()=>{if(S)TG.circle(x,FLOOR-30,42,1.1,dm,'#c8b8ff')}})}}},
 fundicion:{n:'chorros de escoria',f(dm){for(let k=0;k<3;k++){const x=clamp(S.p.x+(k-1)*R(180,260),40,WORLD-100);TG.rect(x-30,0,60,FLOOR,1.2,dm,'#ff7a3c')}}},
 necropolis:{n:'manos de la cripta',f(dm){const p=S.p;for(let k=0;k<3;k++)S.sch.push({t:k*.4,en:1,f:()=>{if(S)TG.circle(S.p.x+R(-60,60),FLOOR-20,60,.9,dm,'#4cffc8')}})}},
 abismo:{n:'escombros que caen',f(dm){for(let k=0;k<4;k++){const x=clamp(S.p.x+R(-420,420),40,WORLD-120);S.sch.push({t:k*.2,en:1,f:()=>{if(S)TG.rect(x,FLOOR-80,80,80,1.1,dm,'#3cf0ff')}})}}},
 nucleo:{n:'relámpagos',f(dm){for(let k=0;k<4;k++){const x=clamp(S.p.x+R(-320,320),40,WORLD-40);TG.rect(x-14,0,28,FLOOR,1+k*.15,dm,'#ffd23c')}}}};
function updHazard(dt){const s=S;if(!s.boss||s.boss.dead||s.under||s.tut)return;const H_=HAZ[STAGE.id];if(!H_)return;
 s.hzT-=dt;if(s.hzT>0)return;s.hzT=Math.max(3.5,7.5-s.phase*1.2);if(!s.hzSaid){s.hzSaid=1;say('¡El escenario se vuelve en tu contra: '+H_.n+'!')}H_.f(18*dmgScale())}

/* ---------- desafío diario ---------- */
const DAILY_MODS=[{n:'Doble oro',d:'los enemigos sueltan el doble de oro',gold:2},{n:'Cristal',d:'haces y recibes un 40% más de daño',dmg:1.4,taken:1.4},
 {n:'Horda dura',d:'enemigos con un 50% más de vida, y un 50% más de oro',hp:1.5,gold:1.5}];
let DAILY_PENDING=null;
const dailyKey=(d=new Date())=>'d'+d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
function dailyInfo(){const key=dailyKey();let h=2166136261;for(const ch of key)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
 const ids=Object.keys(CHARS);return {key,seed:h,cid:ids[h%ids.length],did:1+(h>>>8)%2,mod:DAILY_MODS[(h>>>16)%DAILY_MODS.length]}}
const DM=()=>S&&S.daily?S.daily.mod:null;

/* ---------- hooks ---------- */
{const _s=start;start=function(cid,did,run){let D=null;
 if(run&&run.daily)D=run.daily;else if(!run&&MODE_NEXT==='daily'){MODE_NEXT=null;D=dailyInfo();cid=D.cid;did=D.did}
 DAILY_PENDING=D;let r;try{r=_s(cid,did,run)}finally{DAILY_PENDING=null}
 if(D&&S){S.daily=D;if(!run)say(`DESAFÍO DIARIO · ${CHARS[D.cid].name} · ${DIFFS[D.did].name} · ${D.mod.n}: ${D.mod.d}`)}return r}}
{const _l=loadStage;loadStage=function(i){_l(i);if(S.daily===undefined&&DAILY_PENDING)S.daily=DAILY_PENDING;expandStage(i)}}
{const _sv=saveRun;saveRun=function(){_sv();if(S&&S.daily)try{const r=JSON.parse(STORE.getItem(RUN_KEY));r.daily=S.daily;STORE.setItem(RUN_KEY,JSON.stringify(r))}catch(e){}}}
{const _u=update;update=function(dt){const s=S,y0=s&&s.p?s.p.y:0;_u(dt);if(!S||S!==s||s.st!=='play')return;
 updMove(dt,y0);if(s.under)updCave(dt);updEvents(dt);updHazard(dt)}}
{const _i=interact;interact=function(){const o=S&&S.near;
 if(o&&o.k==='zip')return zipUse(o);
 if(o&&o.k==='hatch')return hatchUse(o);
 if(o&&o.k==='hatchUp')return caveExit();
 if(o&&o.k==='beacon'){if(o.st==='idle'){o.st='on';o.wT=1;say('¡Defiende la baliza 20 s! Quédate dentro del círculo')}return}
 if(o&&o.k==='cursed'){o.open=1;o.foes=[];for(let k=0;k<5;k++){const e=spawnEnemy(null,clamp(o.x+(k-2)*120,40,WORLD-40),60,true);if(e){if(k<2){e.hp*=3;e.maxHp*=3;e.dmg*=1.3}o.foes.push(e)}}
  ring(o.x,o.y-15,140,'#b030ff',.5);say('¡El cofre maldito despierta a sus guardianes!');return}
 return _i()}}
{const _b=drawBg;drawBg=function(cam,bp,t){if(S&&S.under)return drawCave(cam,t);return _b(cam,bp,t)}}
{const _w=drawWorldBack;drawWorldBack=function(){_w();drawExpand()}}
{const _g=goldFor;goldFor=function(e){const m=DM();return Math.round(_g(e)*(m&&m.gold||1))}}
{const _h=hurtP;hurtP=function(d,src,proj){const m=DM();return _h(d*(m&&m.taken||1),src,proj)}}
{const _e=hurtE;hurtE=function(e,d,o){const m=DM();return _e(e,d*(m&&m.dmg||1),o)}}
{const _sp=spawnEnemy;spawnEnemy=function(...a){const e=_sp(...a),m=DM();if(e&&m&&m.hp){e.hp*=m.hp;e.maxHp=(e.maxHp||e.hp/m.hp)*m.hp}return e}}

// dibujo en el mundo: cuerdas, tirolesas, trampillas, baliza y cofre maldito
function drawExpand(){const s=S;c.save();c.lineWidth=2;
 if(s.under){const l=s.under.cx-CAVE_W,r=s.under.cx+CAVE_W;c.fillStyle='#0b0709';c.fillRect(l-1200,0,1200,H);c.fillRect(r,0,1200,H);c.strokeStyle='#3a2a2a';c.beginPath();c.moveTo(l,0);c.lineTo(l,FLOOR);c.moveTo(r,0);c.lineTo(r,FLOOR);c.stroke()}
 for(const r of s.ropes||[]){c.strokeStyle='#b89a6a';c.beginPath();c.moveTo(r.x,r.top);c.lineTo(r.x,r.bot);c.stroke();
  c.strokeStyle='#8a7048';for(let y=r.top+10;y<r.bot;y+=16){c.beginPath();c.moveTo(r.x-3,y);c.lineTo(r.x+3,y+5);c.stroke()}}
 for(const z of s.zips||[]){c.strokeStyle='#9aa4b4';c.beginPath();c.moveTo(z.x1,z.y1);c.lineTo(z.x2,z.y2);c.stroke();c.fillStyle='#d9cfbd';c.fillRect(z.x1-3,z.y1-3,6,6);c.fillRect(z.x2-3,z.y2-3,6,6)}
 if(s.zipR){const p=s.p;c.strokeStyle='#d9cfbd';c.beginPath();c.moveTo(p.x,p.y-34);c.lineTo(p.x,p.y-48);c.stroke()}
 for(const o of s.ints){
  if(o.k==='hatch'||o.k==='hatchUp'){c.globalAlpha=o.open?.35:1;c.fillStyle='#1a1410';c.strokeStyle='#c08a3c';c.fillRect(o.x-26,o.y-6,52,8);c.strokeRect(o.x-26,o.y-6,52,8);
   c.beginPath();for(let k=-18;k<=18;k+=9){c.moveTo(o.x+k,o.y-6);c.lineTo(o.x+k,o.y+2)}c.stroke();if(o.k==='hatchUp'){c.fillStyle='#c08a3c';c.beginPath();c.moveTo(o.x,o.y-40);c.lineTo(o.x-10,o.y-26);c.lineTo(o.x+10,o.y-26);c.fill()}c.globalAlpha=1}
  if(o.k==='beacon'){const on=o.st==='on';c.globalAlpha=o.open?.35:1;glow('#5affb0',on?18:8);c.fillStyle='#0d2a1e';c.strokeStyle='#5affb0';c.fillRect(o.x-8,o.y-60,16,60);c.strokeRect(o.x-8,o.y-60,16,60);c.shadowBlur=0;
   c.fillStyle='#5affb0';c.globalAlpha*=.5+.5*Math.sin(s.t*6);c.fillRect(o.x-5,o.y-68,10,8);c.globalAlpha=o.open?.35:1;
   if(on){c.strokeStyle='rgba(90,255,176,.5)';c.setLineDash([8,8]);c.beginPath();c.ellipse(o.x,o.y-20,170,60,0,0,6.283);c.stroke();c.setLineDash([]);
    c.strokeStyle='#5affb0';c.lineWidth=4;c.beginPath();c.arc(o.x,o.y-90,14,-Math.PI/2,-Math.PI/2+6.283*o.prog/20);c.stroke();c.lineWidth=2}c.globalAlpha=1}
  if(o.k==='cursed'){c.globalAlpha=o.open?.35:1;glow('#b030ff',o.open?0:16);c.fillStyle='#1a0a22';c.strokeStyle='#b030ff';c.fillRect(o.x-20,o.y-26,40,26);c.strokeRect(o.x-20,o.y-26,40,26);c.shadowBlur=0;
   c.fillStyle='#e0c8ff';c.beginPath();c.arc(o.x,o.y-15,6,0,6.283);c.fill();c.fillStyle='#1a0a22';c.fillRect(o.x-3,o.y-16,2,2);c.fillRect(o.x+1,o.y-16,2,2);c.globalAlpha=1}}
 c.restore()}
function expandMsg(o){const K=keyName(BIND.interact[0]);
 return o.k==='zip'?[`[${K}] Tirolesa`,true]:o.k==='hatch'?[`[${K}] Trampilla al subsuelo · oleadas, un guardián y botín`,!S.boss&&S.tp.state==='idle']:o.k==='hatchUp'?[`[${K}] Volver a la superficie`,true]:
  o.k==='beacon'?[o.st==='idle'?`[${K}] Baliza · defiéndela 20 s (premio)`:'',true]:o.k==='cursed'?[`[${K}] Cofre maldito · gratis, pero despierta a sus guardianes`,true]:''}
const expandDraw=o=>o.k==='zip'||o.k==='hatch'||o.k==='hatchUp'||o.k==='beacon'||o.k==='cursed';  // se dibujan en drawExpand
