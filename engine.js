'use strict';
/* ===================== UTIL ===================== */
const W=960,H=540,G=2100,WORLD=2400,FLOOR=500;
const $=i=>document.getElementById(i),cv=$('game'),c=cv.getContext('2d');
const R=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sgn=v=>v<0?-1:1,hyp=Math.hypot;
const Ev={h:{},on(n,f){(this.h[n]=this.h[n]||[]).push(f)},emit(n,...a){(this.h[n]||[]).forEach(f=>f(...a))}};
// distancia de un punto a un segmento
function segD(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy,t=l?clamp(((px-x1)*dx+(py-y1)*dy)/l,0,1):0;return hyp(px-x1-t*dx,py-y1-t*dy)}

/* ===================== DIFICULTADES ===================== */
const DIFFS=[
 {name:'Paseo Estelar',clock:.7,elite:1,heal:1,chest:1,revive:1,desc:'Reloj 30% más lento · 1 resurrección gratis'},
 {name:'Estándar',clock:1,elite:1,heal:1,chest:1,desc:'Balance base'},
 {name:'Tormenta de Riesgo',clock:1.25,elite:1.4,heal:.8,chest:1,desc:'Reloj +25% · +40% élites · -20% curación'},
 {name:'Cataclismo',clock:1.6,elite:1,heal:1,chest:1.3,dbl:1,desc:'Reloj +60% · cofres +30% · élites con doble afijo'},
 // startLvl: sin él, empezar en el minuto 45 a nivel 1 es muerte en segundos
 {name:'Pesadilla Absoluta',clock:1,elite:1,heal:1,chest:1,start:45*60,startLvl:20,kit:{c:20,u:10,r:4,l:1},hazard:1,perma:1,desc:'Empieza en el minuto 45 (nivel 20 y 35 objetos) · proyectiles enemigos dejan zonas de daño · muerte permanente'}
];

/* ===================== ESTADO / INPUT ===================== */
let S=null,chain=0,selC='vanguard',selD=1;
const keys={},mouse={x:0,y:0,l:0,r:0};
const SLOTS='psmu',SLOT={p:'primary',s:'secondary',m:'move',u:'ult'};
const BTN={p:()=>mouse.l,s:()=>mouse.r,m:()=>keys.ShiftLeft||keys.ShiftRight,u:()=>keys.KeyQ};
addEventListener('keydown',e=>{keys[e.code]=1;if(['Space','ArrowUp','ArrowDown','Tab'].includes(e.code))e.preventDefault();
 if(!S||e.repeat)return;  // e.repeat: mantener pulsado no debe gastar el doble salto
 if((e.code==='Tab'||e.code==='KeyI')&&(S.st==='play'||S.st==='inv'))return toggleInv();
 if(e.code==='Escape'&&S.st==='inv')return toggleInv();
 if(S.st!=='play')return;
 if(e.code==='Space'||e.code==='KeyW'||e.code==='ArrowUp')jump();
 if(e.code==='KeyE')interact();
 if(e.code==='KeyB'&&!S.boss&&!S.bossDone)spawnBoss()});
addEventListener('keyup',e=>keys[e.code]=0);
// Alt-Tab no envía keyup: soltar todo para que no se queden teclas pegadas
addEventListener('blur',()=>{for(const k in keys)keys[k]=0;mouse.l=mouse.r=0});
cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();mouse.x=(e.clientX-r.left)*W/r.width;mouse.y=(e.clientY-r.top)*H/r.height});
cv.addEventListener('mousedown',e=>{e.button===0?mouse.l=1:mouse.r=1});
addEventListener('mouseup',e=>{e.button===0?mouse.l=0:mouse.r=0});
cv.addEventListener('contextmenu',e=>e.preventDefault());

const coef=()=>1+S.clock/60*.5, dmgScale=()=>1+.12*(coef()-1), hpScale=()=>1+.3*(coef()-1);
const say=m=>{S.msg=m;S.msgT=4};

function start(cid,did){
 Ev.h={};fxReset();const ch=CHARS[cid],df=DIFFS[did];
 ['menu','end','mastery','inv','altar'].forEach(i=>$(i).style.display='none');
 S={st:'play',cid,ch,df,t:0,clock:df.start||0,phase:1,cam:0,shake:0,en:[],zn:[],dr:[],sch:[],freeze:0,spawn:2,boss:null,bossDone:0,bossName:'',msg:'',msgT:0,kills:0,mq:0,portal:{a:null,b:null},
  ints:[],near:null,note:null,chestT:40,altarT:150,
  p:{x:300,y:FLOOR,w:24,h:42,vx:0,vy:0,ground:0,wasG:1,plat:null,jumps:0,maxJ:2,face:1,aim:0,hp:ch.hp,maxHp:ch.hp,lvl:1,xp:0,need:40,dmgMul:1,inv:0,dash:null,drop:0,
   cd:{p:0,s:0,m:0,u:0},chg:{p:0,s:0,m:0,u:0},revive:df.revive||0,
   // estadísticas: base + maestría + objetos (las de objetos se suman por acumulación desde data_items.js)
   m:{dmg:1,spd:1,as:1,crit:.05,critm:0,cdr:0,ucdr:0,mcdr:0,ls:0,arm:0,hpf:0,hpm:0,regen:0,shield:0,oversh:0,dodge:0,luck:0,goldm:0,xpm:0,healm:0,chestm:0,exec:0},
   items:{},ist:{},dmItems:[],gold:0,sh:0,shT:0,
   buf:{},form:'a',corr:0,gm:1,leapT:0,slam:null,combo:0,comboT:0,
   hist:Array.from({length:31},()=>({x:300,y:FLOOR,hp:ch.hp})),hi:0,histT:0}};
 if(ch.passive&&PASSIVES[ch.passive.t])PASSIVES[ch.passive.t](S.p,ch.passive);
 lootInit();
 say('Sobrevive · el Coloso Prisma despierta a los 75 s (B para invocarlo ya)');
 while(S.p.lvl<(df.startLvl||1))giveXp(S.p.need-S.p.xp);
 trackRun(); // después de los niveles regalados de Pesadilla: no cuentan para logros
}

/* ===================== BUFFS DEL JUGADOR =====================
   Efectos temporales genéricos. Campos multiplicativos: dmg, taken, as, spd, grav.
   Sumativos: ls, reflect, drain, killheal. Banderas: intang, noatk, root, floor, jet, both.
   Ganchos: tick(b,dt) (cada `every` s o cada frame), end(b), onHurt(b,d)→true anula, onDeal(e,d,o), draw(b). */
function buff(id,t,o){return S.p.buf[id]=Object.assign({t,acc:0},o)}
function bm(k){let v=1;for(const id in S.p.buf){const b=S.p.buf[id][k];if(b!==undefined)v*=typeof b==='function'?b():b}return v}
function bsum(k){let v=0;for(const id in S.p.buf){const b=S.p.buf[id][k];if(b)v+=b}return v}
function bany(k){for(const id in S.p.buf)if(S.p.buf[id][k])return true;return false}
function updBuffs(dt){const B=S.p.buf;
 for(const id in B){const b=B[id];b.t-=dt;
  if(b.tick){if(!b.every)b.tick(b,dt);else{b.acc+=dt;while(b.acc>=b.every){b.acc-=b.every;b.tick(b,b.every)}}}
  if(b.t<=0&&B[id]===b){delete B[id];if(b.end)b.end(b)}}}

/* ===================== FÍSICA ===================== */
function phys(e,dt,drop){
 e.vy+=G*dt*(e.gm===undefined?1:e.gm);const oy=e.y;
 e.x=clamp(e.x+e.vx*dt,e.w/2,WORLD-e.w/2);e.y+=e.vy*dt;e.ground=0;e.plat=null;
 if(e.vy>=0)for(const p of PLAT){if(!p.on||(drop&&!p.solid))continue;
  if(e.x+e.w/2>p.rx&&e.x-e.w/2<p.rx+p.w&&oy<=p.ry+6&&e.y>=p.ry){e.y=p.ry;e.vy=0;e.ground=1;e.plat=p;break}}
}
function jump(){const p=S.p,it=p.items,mj=it.voidanchor?1:it.icarus?1e9:p.maxJ;if(bany('root')||(!p.ground&&p.jumps>=mj))return;
 if(!p.ground&&it.icarus&&p.jumps>=p.maxJ)drainP(p.maxHp*.04);  // Alas de Ícaro: los saltos extra cuestan vida
 p.jumps=p.ground?1:p.jumps+1;p.vy=-S.ch.jump;p.ground=0;burst(p.x,p.y,8,S.ch.color,160,3);Ev.emit('onJump')}
function land(){const p=S.p;
 if(p.slam){aoe(p.x,p.y-20,p.slam.r,p.slam.dmg);ring(p.x,p.y-10,p.slam.r,S.ch.color,.4);burst(p.x,p.y,24,S.ch.color,420,4);S.shake=Math.max(S.shake,12);p.slam=null}}

/* ===================== COMBATE ===================== */
// proc: daño causado por objetos (no vuelve a disparar onHit); raw: ya trae los multiplicadores aplicados
const NOOPT={},DOT={dot:1},DOTRAW={dot:1,raw:1},RAW={raw:1},CRIT={crit:1},PROC={proc:1},PROCRAW={proc:1,raw:1};
let kdepth=0;
function shootP(x,y,a,sp,dmg,r){fxProj({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,dmg,r,life:5,hostile:1,col:'#ff4d6d'})}
function Z(o){S.zn.push(Object.assign({warn:0,life:.3,dmg:0,tk:0,ftk:0,col:'#f24'},o))}
function puddle(x,y){Z({x,y,r:42,warn:.3,life:4,dmg:6*dmgScale(),dot:1,hostile:1,col:'#ff5a1a'})}
function heal(a){const p=S.p;if(a<=0)return;a*=(1+p.m.healm)*bm('healm');
 const over=p.hp+a-p.maxHp;p.hp=Math.min(p.maxHp,p.hp+a);
 if(over>0&&p.m.oversh)p.sh=Math.min(p.maxHp*(p.m.shield+p.m.oversh),p.sh+over);  // Coraza Absoluta
 Ev.emit('onHeal',a)}
function aoe(x,y,r,d,o){for(const e of S.en.slice())if(!e.dead&&hyp(e.x-x,e.y-e.h/2-y)<r+e.w/2)hurtE(e,d,o)}
function stunE(e,t){if(!e.boss)e.stunT=Math.max(e.stunT||0,t)}
function pullE(e,x,y,v,dt){if(e.boss)return;const dx=x-e.x,dy=y-(e.y-e.h/2),d=hyp(dx,dy);if(d<8)return;const m=Math.min(d,v*dt)/d;e.x+=dx*m;if(e.d.ai==='fly')e.y+=dy*m}
// raw=1 si dps sale de un golpe ya multiplicado (objetos); así no se aplican los multiplicadores dos veces
function applyDot(e,k,dps,dur,raw){const D=e.dots||(e.dots={}),o=D[k];
 if(k==='poison'&&o&&o.t>0){o.n=Math.min(10,o.n+1);o.t=dur;o.dps=dps;o.raw=raw}else D[k]={dps,t:dur,n:1,tk:.5,raw}}
function tickDots(e,dt){for(const k in e.dots){const o=e.dots[k];if(o.t<=0)continue;o.t-=dt;o.tk-=dt;
 if(o.tk<=0){o.tk=.5;hurtE(e,o.dps*o.n*.5*(k==='poison'&&S.dr.some(m=>m.k==='queen')?2:1),o.raw?DOTRAW:DOT);if(e.dead)return}}}

function hurtE(e,d,o){
 if(e.dead)return;const p=S.p,bl=p.items.blacklens;o=o||NOOPT;let crit=false;
 if(!o.raw){crit=!o.dot&&(bl||o.crit||Math.random()<p.m.crit);
  d*=p.dmgMul*p.m.dmg*bm('dmg')*(crit?(bl?1.5:2)+p.m.critm:1)*(e.stun>0?1.5:1)*(e.markT>0?1.5:1);
  for(const it of p.dmItems)d*=it.dm(p.items[it.id],e)}
 e.hp-=d;e.flash=.1;e.lastCrit=crit;txt(e.x+R(-10,10),e.y-e.h-6,Math.round(d)+(crit?'!':''),crit?'#ffd23c':o.dot?'#d9a0ff':o.proc?'#9ae6ff':'#fff');
 // Guillotina: ejecuta a los no-jefes por debajo del umbral
 if(p.m.exec&&!e.boss&&e.hp>0&&e.hp<e.maxHp*Math.min(.4,.06+p.m.exec)){e.hp=0;txt(e.x,e.y-e.h-20,'EJECUTADO','#ff2a6a')}
 Ev.emit('onHit',e,d,o,crit);
 const ls=p.m.ls+bsum('ls')+(o.ls||0);if(ls&&!o.dot&&!o.proc)heal(d*ls);  // el daño de objetos no roba vida: evita bucles curación↔daño (Núcleo Inverso)
 for(const id in p.buf){const b=p.buf[id];if(b.onDeal)b.onDeal(e,d,o)}
 if(e.boss){
  if(e.stun<=0){e.stag+=d*.8;if(e.stag>=e.stagMax){e.stag=0;e.stun=3.2;e.t=1.2;say('¡GUARDIA ROTA! Daño +50%');S.shake=14;hitStop(50);ring(e.x,e.y-55,200,'#ffd23c',.5);Ev.emit('onGuardBreak',e)}}
  const r=e.hp/e.maxHp,np=r>.66?1:r>.33?2:3;
  if(np>e.ph){e.ph=np;S.phase=np;e.stun=0;e.t=1.8;S.shake=26;hitStop(60);ring(e.x,e.y-55,500,e.def.color,.8);burst(e.x,e.y-55,50,e.def.color,500,4);
   say(e.def.phaseMsg[np]);Ev.emit('onBossPhase',e,np)}
 }
 if(e.hp<=0)kill(e);
}
function kill(e){
 e.dead=1;S.kills++;burst(e.x,e.y-e.h/2,e.boss?80:18,e.d.color,e.boss?600:320,4);S.shake=Math.max(S.shake,e.boss?30:3);
 if(e.boss||e.elite)hitStop(e.boss?60:40);
 const p=S.p;giveXp(e.d.xp);p.gold+=goldFor(e);
 heal(p.maxHp*((p.items.bloodoath?0:.01*S.df.heal)+bsum('killheal')));
 if(kdepth<4){kdepth++;Ev.emit('onKill',e);kdepth--}  // límite a las cadenas de explosiones al matar
 if(e.fire)for(let i=-1;i<=1;i++)Z({x:e.x+i*50,y:FLOOR,r:45,warn:.2,life:3,dmg:5*dmgScale(),dot:1,hostile:1,col:'#ff7a1a'});
 if(e.boom)Z({x:e.x,y:e.y-e.h/2,r:100,warn:.7,dmg:25*dmgScale(),hostile:1,col:'#f3f'});
 if(e.boss){S.boss=null;S.bossDone=1;S.bossName=e.def.name;endGame(true)}
}
function hurtP(d){
 const p=S.p;if(p.inv>0||S.st!=='play'||bany('intang'))return;
 for(const id in p.buf){const b=p.buf[id];if(b.onHurt&&b.onHurt(b,d))return}
 if(p.m.dodge&&chance(Math.min(.5,p.m.dodge))){p.inv=.25;txt(p.x,p.y-56,'ESQUIVA','#9ae6ff');return}
 d*=(1-Math.min(.6,p.m.arm))*bm('taken');
 p.shT=4;if(p.sh>0){const a=Math.min(p.sh,d);p.sh-=a;d-=a}
 const rf=bsum('reflect');if(rf)aoe(p.x,p.y-20,220,d*rf,RAW);
 for(const id in p.buf){const b=p.buf[id];if(b.absorb>0){const a=Math.min(b.absorb,d);b.absorb-=a;b.stored+=a;d-=a;if(b.absorb<=0)b.t=0}}
 p.inv=.45;S.shake=Math.max(S.shake,9);
 if(d<=0){ring(p.x,p.y-20,40,'#c8d2ff',.25);return}
 p.hp-=d;burst(p.x,p.y-20,10,'#f44',260,3);txt(p.x,p.y-56,Math.ceil(d),'#f66');
 if(p.hp<=0&&bany('floor'))p.hp=1;
 Ev.emit('onTakeDamage',d);if(p.hp<=0)die();
}
// pérdida de vida autoinfligida (pactos, corrupción): ignora invulnerabilidad y SÍ puede matar
function drainP(a){const p=S.p;if(a<=0||S.st!=='play')return;p.hp-=a;if(p.hp<=0){if(bany('floor'))p.hp=1;else die()}}
function die(){
 const p=S.p;
 if(p.items.ankh>0){p.items.ankh--;p.hp=p.maxHp;p.inv=3;say('¡El Ankh de Neón te devuelve a la vida!');ring(p.x,p.y-20,400,'#ffd23c',.7);hitStop(60);return}
 if(p.revive>0){p.revive--;p.hp=p.maxHp*.5;p.inv=2.5;say('¡Resurrección gratuita usada!');ring(p.x,p.y-20,320,'#fff',.6);
  // onda de empuje, no daño (antes: aoe de 0 que pintaba "0" y disparaba onHit)
  for(const e of S.en)if(!e.boss&&hyp(e.x-p.x,e.y-p.y)<320)e.vx+=sgn(e.x-p.x)*600}
 else endGame(false);
}
function giveXp(n){
 const p=S.p;p.xp+=n*(1+p.m.xpm)*(p.items.invhour?2.5:1);
 while(p.xp>=p.need){p.xp-=p.need;p.lvl++;p.need=Math.round(40*Math.pow(p.lvl,1.35));
  recalcHp();p.dmgMul=1+.05*(p.lvl-1);
  ring(p.x,p.y-20,160,'#ffd23c',.5);txt(p.x,p.y-70,'¡NIVEL '+p.lvl+'!','#ffd23c');Ev.emit('onLevelUp',p.lvl);
  if(p.lvl%5===0)S.mq++}
 if(S.mq>0&&S.st==='play')openMastery();
}

/* ===================== ENEMIGOS ===================== */
function spawnEnemy(type,x,y,noElite){
 const co=coef(),r=Math.random();type=type||(co<2?(r<.6?'crawler':'wisp'):(r<.4?'crawler':r<.7?'wisp':'brute'));
 const d=ENEMIES[type],side=Math.random()<.5?-1:1;
 const e={type,d,boss:0,x:clamp(x===undefined?S.p.x+side*R(520,720):x,30,WORLD-30),y:y===undefined?(d.ai==='fly'?R(120,260):FLOOR):y,w:d.w,h:d.h,vx:0,vy:0,
  hp:d.hp*hpScale()*(S.p.items.greed?1.2+.2*S.p.items.greed:1),dmg:d.dmg*dmgScale(),spdx:1,ph:R(0,6),cd:R(1,2.5),flash:0,slowT:0,stunT:0,markT:0,aff:[],fireT:0};
 if(!noElite&&Math.random()<Math.min(.6,(.04+co*.012)*S.df.elite*(S.p.items.blacklens?2:1))){
  const n=S.df.dbl?2:1,pool=AFX.slice().sort(()=>Math.random()-.5);e.hp*=2;e.dmg*=1.3;e.elite=1;
  for(let i=0;i<n;i++){const a=pool[i];e.aff.push(a);if(a.spd)e.spdx*=a.spd;if(a.hp)e.hp*=a.hp;if(a.f)e[a.f]=1}}
 e.maxHp=e.hp;S.en.push(e);
}
function updEnemy(e,dt){
 const p=S.p,d=e.d;e.flash-=dt;e.slowT-=dt;e.markT-=dt;
 if(e.dots){tickDots(e,dt);if(e.dead)return}
 if(e.boss){e.def.ai(e,dt);return}
 if(e.stunT>0){e.stunT-=dt;if(d.ai==='walk'){e.vx*=.9;phys(e,dt)}return}
 const sp=d.spd*e.spdx*(e.slowT>0?.35:1);
 if(d.ai==='walk'){e.vx+=(sgn(p.x-e.x)*sp-e.vx)*Math.min(1,8*dt);
  if(e.ground&&p.y<e.y-90&&Math.random()<dt*1.5)e.vy=-640;phys(e,dt)}
 else{const tx=p.x+Math.sin(S.t*.8+e.ph)*220,ty=p.y-170+Math.sin(S.t*1.6+e.ph)*30;e.x+=clamp(tx-e.x,-sp*2,sp*2)*dt*1.2;e.y+=clamp(ty-e.y,-sp*2,sp*2)*dt*1.2;e.y=Math.min(e.y,FLOOR-10);
  e.cd-=dt*(e.slowT>0?.35:1);if(e.cd<=0){e.cd=d.shot*R(.8,1.2);shootP(e.x,e.y-e.h/2,Math.atan2(p.y-p.h/2-(e.y-e.h/2),p.x-e.x),330,e.dmg,6)}}
 e.vx*=.98;
 if(e.fire){e.fireT-=dt;if(e.fireT<=0){e.fireT=1;Z({x:e.x,y:e.y,r:34,warn:.2,life:3,dmg:4*dmgScale(),dot:1,hostile:1,col:'#ff7a1a'})}}
 if(d.ai==='walk'&&Math.abs(e.x-p.x)<(e.w+p.w)/2&&Math.abs((e.y-e.h/2)-(p.y-p.h/2))<(e.h+p.h)/2)hurtP(e.dmg);
}

/* ===================== PROYECTILES ===================== */
function projHit(q,e){
 hurtE(e,q.dmg,q.crit||q.ls||q.raw||q.proc?{crit:q.crit,ls:q.ls,raw:q.raw,proc:q.proc}:NOOPT);
 if(q.dotK)applyDot(e,q.dotK,q.dps,q.dur);
 if(q.mark){e.markT=q.mark;txt(e.x,e.y-e.h-20,'MARCADO','#9aff3c')}
 if(q.stun)stunE(e,q.stun);
 if(q.grow){q.dmg*=1.25;q.r=Math.min(40,q.r*1.2)}
 if(q.split){const n=q.split;q.split=0;for(let i=0;i<n;i++){const a=Math.atan2(q.vy,q.vx)+(i-(n-1)/2)*.5,c2=fxProj({x:q.x,y:q.y,vx:Math.cos(a)*700,vy:Math.sin(a)*700,dmg:q.dmg*.5,r:q.r*.6,life:.4,col:q.col});if(c2)c2.hit.add(e)}}
 if(q.hook){hookE(e);bolt(S.p.x,S.p.y-S.p.h/2,e.x,e.y-e.h/2,'#ccc',2,0);q.life=0}
}
function hookE(e){const p=S.p;
 if(e.boss){const dx=e.x-p.x;p.dash={t:.25,vx:(dx-sgn(dx)*90)/.25,vy:0,dmg:0,hit:new Set()}}
 else{e.x=clamp(p.x+p.face*40,20,WORLD-20);if(e.d.ai==='fly')e.y=p.y-20;e.vx=0;stunE(e,.8)}}
function updProj(q,dt){
 const s=S,p=s.p;q.life-=dt;
 if(q.home){let b=null,bd=500;for(const e of s.en)if(!q.hit.has(e)){const dd=hyp(e.x-q.x,e.y-e.h/2-q.y);if(dd<bd){bd=dd;b=e}}
  if(b){const sp=hyp(q.vx,q.vy),ca=Math.atan2(q.vy,q.vx),ta=Math.atan2(b.y-b.h/2-q.y,b.x-q.x),da=((ta-ca+Math.PI*3)%(Math.PI*2))-Math.PI,na=ca+clamp(da,-7*dt,7*dt);q.vx=Math.cos(na)*sp;q.vy=Math.sin(na)*sp}}
 if(q.ret){if(!q.back&&q.life<q.t0*.5){q.back=1;q.hit.clear()}
  if(q.back){const a=Math.atan2(p.y-p.h/2-q.y,p.x-q.x),sp=hyp(q.vx,q.vy);q.vx=Math.cos(a)*sp;q.vy=Math.sin(a)*sp;q.life=Math.max(q.life,.05);if(hyp(p.x-q.x,p.y-p.h/2-q.y)<28)q.life=0}}
 if(q.gm)q.vy+=G*q.gm*dt;
 if(q.pull)for(const e of s.en)if(hyp(e.x-q.x,e.y-e.h/2-q.y)<q.pull)pullE(e,q.x,q.y,240,dt);
 q.x+=q.vx*dt;q.y+=q.vy*dt;spark(q.x,q.y,0,0,.2,q.col,q.r);
 const P=s.portal;
 if(!q.hostile&&!q.ported&&P.a&&P.b){const A=hyp(q.x-P.a.x,q.y-P.a.y)<30?P.a:hyp(q.x-P.b.x,q.y-P.b.y)<30?P.b:null;
  if(A){const B=A===P.a?P.b:P.a;q.x=B.x;q.y=B.y;q.ported=1;q.dmg*=1.6;q.r*=1.3;ring(B.x,B.y,40,'#3cffd8',.25)}}
 if(q.hostile){if(!bany('intang')&&hyp(q.x-p.x,q.y-(p.y-p.h/2))<q.r+13){hurtP(q.dmg);q.life=0}}
 else for(const e of s.en){if(e.dead||q.hit.has(e))continue;
  if(hyp(e.x-q.x,e.y-e.h/2-q.y)<q.r+Math.max(e.w,e.h)/2){q.hit.add(e);projHit(q,e);if(q.life<=0)break;if(q.boom){q.life=0;break}if(--q.pierce<0){q.life=0;break}}}
 const out=q.x<0||q.x>WORLD;
 if(q.wb>0&&(out||q.y>=FLOOR)){if(out){q.vx=-q.vx;q.x=clamp(q.x,0,WORLD)}else{q.vy=-Math.abs(q.vy)*.9;q.y=FLOOR-1}q.wb--}
 else if(q.bounce>0&&q.y>=FLOOR){q.vy=-Math.abs(q.vy)*.55;q.y=FLOOR-1;q.bounce--}
 else if(!q.ret&&(q.y>=FLOOR||out||(q.y<-80&&!q.gm)))q.life=Math.min(q.life,0);
 if(q.life<=0){const y=Math.min(q.y,FLOOR);
  if(q.boom){ring(q.x,y,q.boom,q.col,.3);aoe(q.x,y,q.boom,q.dmg);s.shake=Math.max(s.shake,4)}
  if(q.zone)Z(Object.assign({x:q.x,y},q.zone));
  if(q.hostile&&s.df.hazard)puddle(q.x,y)}
}

/* ===================== UPDATE ===================== */
function update(dt){
 const s=S,p=s.p,fz=s.freeze>0;s.t+=dt;s.clock+=dt*s.df.clock*(p.items.invhour?1.5+.5*p.items.invhour:1);s.cam=clamp(p.x-W/2,0,WORLD-W);
 for(const pl of PLAT){const a=pl.sp?Math.sin(s.t*pl.sp):0,nx=pl.x+(pl.ax||0)*a;pl.dx=pl.rx===undefined?0:nx-pl.rx;pl.rx=nx;pl.ry=pl.y+(pl.ay||0)*a;pl.on=s.phase>=pl.ph[0]&&s.phase<=pl.ph[1]}
 updBuffs(dt);drainP(p.maxHp*bsum('drain')*dt);if(s.st!=='play')return;
 // jugador
 const root=bany('root'),ax=root?0:(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
 p.aim=Math.atan2(mouse.y-(p.y-p.h/2),mouse.x+s.cam-p.x);if(Math.abs(Math.cos(p.aim))>.15)p.face=sgn(Math.cos(p.aim));
 p.inv-=dt;p.drop-=dt;p.leapT-=dt;p.comboT-=dt;for(const k in p.cd)p.cd[k]-=dt;
 p.histT-=dt;if(p.histT<=0){p.histT=.1;p.hi=(p.hi+1)%p.hist.length;const h=p.hist[p.hi];h.x=p.x;h.y=p.y;h.hp=p.hp}
 if(keys.KeyS||keys.ArrowDown)p.drop=.25;
 p.gm=bm('grav');
 if(bany('jet')){p.vy=Math.max(p.vy-(G+1700)*dt,-430);p.ground=0}
 if(p.slam&&!p.ground&&p.vy>=0)p.vy=Math.max(p.vy,1500);
 if(p.dash){const dd=p.dash;dd.t-=dt;p.x=clamp(p.x+dd.vx*dt,12,WORLD-12);p.y=clamp(p.y+(dd.vy||0)*dt,40,FLOOR);p.vy=0;p.inv=Math.max(p.inv,.05);
  if(Math.random()<.8)burst(p.x,p.y-20,1,s.ch.color,40,5);
  if(dd.dmg)for(const e of s.en)if(!e.dead&&!dd.hit.has(e)&&Math.abs(e.x-p.x)<e.w/2+24&&Math.abs(e.y-e.h/2-(p.y-20))<e.h/2+30){dd.hit.add(e);hurtE(e,dd.dmg);if(!e.boss)e.vx+=sgn(dd.vx)*400;if(e.dead&&dd.reset)p.cd.m=0}
  if(dd.t<=0){p.dash=null;if(dd.vy)p.vy=dd.vy*.35}}
 else{if(p.ground&&p.plat&&p.plat.on)p.x=clamp(p.x+p.plat.dx,12,WORLD-12); // la plataforma móvil arrastra al jugador
  if(root)p.vx=0;else if(p.leapT<=0)p.vx+=(ax*s.ch.spd*p.m.spd*bm('spd')-p.vx)*Math.min(1,(p.ground?18:8)*dt);
  phys(p,dt,p.drop>0);if(p.ground)p.jumps=0;else if(p.jumps===0&&p.vy>0)p.jumps=1}
 if(p.ground&&!p.wasG)land();p.wasG=p.ground;
 if(p.y>FLOOR+100){p.y=FLOOR;p.vy=0}
 // habilidades: las de `hold` se cargan mientras se mantiene el botón y se lanzan al soltar
 const noatk=bany('noatk'),nomove=bany('nomove');
 for(const k of SLOTS){const d=ab(k),down=BTN[k]()||(k==='u'&&p.items.gesture);  // Gesto del Abismo: definitiva automática
  if(root||(noatk&&k!=='m')||(nomove&&k==='m')){p.chg[k]=0;continue}
  if(d.hold){if(down&&p.cd[k]<=0)p.chg[k]=Math.min(d.max,p.chg[k]+dt);else if(p.chg[k]>0){cast(k,p.chg[k]/d.max);p.chg[k]=0}}
  else if(down&&p.cd[k]<=0)cast(k)}
 if(!p.items.bloodoath)heal(p.maxHp*(.008*s.df.heal+p.m.regen)*dt);
 // escudo: se recarga tras 4 s sin recibir daño
 p.shT-=dt;const shMax=p.maxHp*p.m.shield;if(p.shT<=0&&p.sh<shMax)p.sh=Math.min(shMax,p.sh+shMax*.5*dt);
 Ev.emit('onTick',dt);updLoot(dt);if(s.st!=='play')return;
 // director
 if(!s.boss&&!s.bossDone&&s.t>75)spawnBoss();
 s.spawn-=dt;
 if(s.spawn<=0){const mx=Math.min(26,5+coef()*1.6)*(s.boss?.6:1);if(s.en.filter(e=>!e.boss).length<mx)spawnEnemy();s.spawn=Math.max(.5,2.6/(1+coef()*.12))}
 // enemigos (Tiempo Detenido congela enemigos, sus proyectiles, zonas y ataques programados)
 if(fz)s.freeze-=dt;else for(const e of s.en)updEnemy(e,dt);
 s.en=s.en.filter(e=>!e.dead);
 // esbirros del jugador
 for(const m of s.dr)MIN[m.k].upd(m,dt);
 s.dr=s.dr.filter(m=>m.life>0);
 // proyectiles
 for(let i=0;i<PR.n;i++){const q=PR.a[i];if(!(q.hostile&&fz))updProj(q,dt)}
 PR.sweep(deadLife);
 // zonas
 for(const z of s.zn){if(z.hostile&&fz)continue;
  const inside=(x,y,m)=>z.rw?(x>z.x-m&&x<z.x+z.rw+m&&y>z.y-m&&y<z.y+z.rh+m):hyp(x-z.x,y-z.y)<z.r+m;
  if(z.warn>0){z.warn-=dt;continue}
  if(z.slow)for(const e of s.en)if(inside(e.x,e.y-e.h/2,e.w/2))e.slowT=.15;
  if(z.pullZ)for(const e of s.en)if(inside(e.x,e.y-e.h/2,z.r*.8))pullE(e,z.x,z.y,z.pullZ,dt);
  if(z.fdmg){z.ftk-=dt;if(z.ftk<=0){z.ftk=.5;for(const e of s.en)if(!e.dead&&inside(e.x,e.y-e.h/2,e.w/2))hurtE(e,z.fdmg,DOT)}}
  if(z.healZ&&inside(p.x,p.y-p.h/2,0))heal(p.maxHp*z.healZ*dt);
  if(z.pbuf&&inside(p.x,p.y-p.h/2,0))buff('zone',.2,z.pbuf);
  if(!z.act){z.act=1;if(z.fboom)aoe(z.x,z.y,z.r,z.fboom,PROC);if(!z.dot&&z.hostile&&z.dmg&&inside(p.x,p.y-p.h/2,12))hurtP(z.dmg);if(!z.dot)burst(z.x,z.y,14,z.col,300,4)}
  z.life-=dt;
  if(z.dot&&z.hostile){z.tk-=dt;if(z.tk<=0){z.tk=.5;if(inside(p.x,p.y-p.h/2,10))hurtP(z.dmg)}}
 }
 for(const z of s.zn)if(z.life<=0&&z.end){const f=z.end;z.end=null;f(z)}
 s.zn=s.zn.filter(z=>z.life>0);
 for(const q of s.sch)if(!(q.en&&fz))q.t-=dt;for(const q of s.sch.filter(q=>q.t<=0))q.f();s.sch=s.sch.filter(q=>q.t>0);
 for(let i=0;i<PT.n;i++){const q=PT.a[i];q.l-=dt;if(q.ring){q.r+=(q.mr-q.r)*Math.min(1,dt*9)}else{q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.93;q.vy*=.93}}
 PT.sweep(deadL);for(let i=0;i<TX.n;i++){const t=TX.a[i];t.l-=dt;t.y-=40*dt}TX.sweep(deadL);
 for(let i=0;i<BL.n;i++)BL.a[i].l-=dt;BL.sweep(deadL);
 s.shake*=.88;s.msgT-=dt;
}

/* ===================== RENDER ===================== */
const STARS=Array.from({length:90},()=>({x:R(0,W*2),y:R(0,FLOOR),s:R(.5,2)}));
function draw(){
 const s=S;screen();
 const g=c.createLinearGradient(0,0,0,H);const bp=s.boss?s.boss.ph:0;g.addColorStop(0,['#0a0620','#160a36','#2a0a3a','#3a0a22'][bp]);g.addColorStop(1,'#05030d');c.fillStyle=g;c.fillRect(0,0,W,H);
 c.fillStyle='#fff';for(const t of STARS){c.globalAlpha=.3+t.s/3;c.fillRect((t.x-s.cam*.2+W*4)%(W*1.5),t.y,t.s,t.s)}c.globalAlpha=1;
 c.fillStyle='#120a2a';for(let i=0;i<8;i++){const x=i*400-(s.cam*.5)%400-100;c.beginPath();c.moveTo(x,FLOOR);c.lineTo(x+200,FLOOR-170-(i%3)*40);c.lineTo(x+400,FLOOR);c.fill()}
 const sx=R(-1,1)*s.shake,sy=R(-1,1)*s.shake;c.translate(-s.cam+sx,sy);
 // plataformas
 for(const p of PLAT){if(!p.on)continue;glow('#7a5cff',12);c.fillStyle=p.solid?'#150c30':'#241552';c.strokeStyle='#8a6cff';c.lineWidth=2;c.fillRect(p.rx,p.ry,p.w,p.h);c.strokeRect(p.rx,p.ry,p.w,p.solid?0:p.h);
  if(p.solid){c.beginPath();c.moveTo(p.rx,p.ry);c.lineTo(p.rx+p.w,p.ry);c.stroke()}}
 c.shadowBlur=0;
 // zonas (telegraph)
 for(const z of s.zn){const w=z.warn>0,col=z.col;c.globalAlpha=w?.25+.2*Math.sin(s.t*22):Math.min(1,z.life*3)*(z.dot?.4:.7);c.fillStyle=col;c.strokeStyle=col;c.lineWidth=2;
  if(z.rw){if(w){c.strokeRect(z.x,z.y,z.rw,z.rh)}else c.fillRect(z.x,z.y,z.rw,z.rh)}
  else{c.beginPath();c.arc(z.x,z.y,z.r,0,6.283);if(w){c.stroke();c.globalAlpha*=.4;c.fill()}else{c.fill();if(z.pullZ){c.globalAlpha=.8;c.beginPath();c.arc(z.x,z.y,z.r*(1-(s.t*1.5)%1),0,6.283);c.stroke()}}}}
 c.globalAlpha=1;
 // portales
 for(const P of [s.portal.a,s.portal.b])if(P){glow('#3cffd8',16);c.strokeStyle=P===s.portal.a?'#3cffd8':'#ff8a3c';c.lineWidth=4;c.beginPath();c.ellipse(P.x,P.y,14,30,0,0,6.283);c.stroke()}
 c.shadowBlur=0;
 drawLoot();
 // enemigos
 for(const e of s.en)drawEnemy(e);
 // esbirros
 for(const m of s.dr)MIN[m.k].draw(m);c.shadowBlur=0;
 drawPlayer(s.p);
 for(const id in s.p.buf){const b=s.p.buf[id];if(b.draw)b.draw(b)}
 // proyectiles
 for(let i=0;i<PR.n;i++){const q=PR.a[i];glow(q.col,16);c.fillStyle=q.col;c.beginPath();c.arc(q.x,q.y,q.r,0,6.283);c.fill()}c.shadowBlur=0;
 // rayos
 for(let i=0;i<BL.n;i++){const b=BL.a[i];c.globalAlpha=Math.max(0,b.l/b.ml);glow(b.c,12);c.strokeStyle=b.c;c.lineWidth=b.w;c.beginPath();c.moveTo(b.x1,b.y1);
  const n=b.jag?6:1;for(let k=1;k<n;k++){const t=k/n;c.lineTo(b.x1+(b.x2-b.x1)*t+R(-b.jag,b.jag),b.y1+(b.y2-b.y1)*t+R(-b.jag,b.jag))}c.lineTo(b.x2,b.y2);c.stroke()}
 c.shadowBlur=0;
 // partículas
 for(let i=0;i<PT.n;i++){const q=PT.a[i];c.globalAlpha=Math.max(0,q.l/q.ml);if(q.ring){c.strokeStyle=q.c;c.lineWidth=4;glow(q.c,12);c.beginPath();c.arc(q.x,q.y,q.r,0,6.283);c.stroke();c.shadowBlur=0}else{c.fillStyle=q.c;c.fillRect(q.x-q.s/2,q.y-q.s/2,q.s,q.s)}}
 c.globalAlpha=1;c.font='bold 14px monospace';c.textAlign='center';
 for(let i=0;i<TX.n;i++){const t=TX.a[i];c.globalAlpha=Math.min(1,t.l*2);c.fillStyle=t.c;c.fillText(t.s,t.x,t.y)}c.globalAlpha=1;
 if(s.freeze>0){screen();c.fillStyle='rgba(120,220,255,.12)';c.fillRect(0,0,W,H)}
 if(s.p.buf.void){screen();c.fillStyle='rgba(90,0,140,.13)';c.fillRect(0,0,W,H)}
 hud();
}
function drawPlayer(p){
 const s=S,col=p.form==='b'?'#2a8a1a':s.ch.color,cy=p.y-p.h/2;
 c.globalAlpha=bany('intang')?.35:p.inv>0&&Math.floor(s.t*20)%2?.4:1;
 if(p.buf.void){glow('#9b30ff',30);c.fillStyle='#9b30ff44';c.beginPath();c.arc(p.x,cy,34+Math.sin(s.t*9)*4,0,6.283);c.fill()}
 glow(s.ch.color,18);c.fillStyle=col;c.fillRect(p.x-p.w/2,p.y-p.h,p.w,p.h);
 c.fillStyle='#fff';c.fillRect(p.x+p.face*5-3,p.y-p.h+8,6,6);c.shadowBlur=0;c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(p.x,cy);c.lineTo(p.x+Math.cos(p.aim)*26,cy+Math.sin(p.aim)*26);c.stroke();c.globalAlpha=1;
 if(p.sh>0){c.strokeStyle='#5ab4ff';c.lineWidth=2;c.globalAlpha=.6;c.beginPath();c.arc(p.x,cy,30,0,6.283);c.stroke();c.globalAlpha=1}
 if(p.buf.aegis){glow('#c8d2ff',16);c.strokeStyle='#c8d2ff';c.lineWidth=3;c.globalAlpha=.4+.6*p.buf.aegis.absorb/(p.maxHp*.4);c.beginPath();c.arc(p.x,cy,36,0,6.283);c.stroke();c.globalAlpha=1}
 if(p.buf.fortress||p.buf.parry){glow('#fff',14);c.strokeStyle=p.buf.parry?'#fff':'#ffd23c';c.lineWidth=2;c.strokeRect(p.x-p.w/2-6,p.y-p.h-6,p.w+12,p.h+12)}
 if(p.buf.cocoon){c.fillStyle='#e6ff3c88';c.beginPath();c.ellipse(p.x,cy,22,30,0,0,6.283);c.fill()}
 c.shadowBlur=0;
 for(const k of SLOTS)if(p.chg[k]>0){const f=p.chg[k]/ab(k).max;c.fillStyle='#000a';c.fillRect(p.x-20,p.y-p.h-14,40,5);c.fillStyle=f>=1?'#fff':s.ch.color;c.fillRect(p.x-20,p.y-p.h-14,40*f,5)}
}
function drawEnemy(e){
 const cx=e.x,cy=e.y-e.h/2,col=e.flash>0?'#fff':(e.stun>0||e.stunT>0?'#888':e.d.color);glow(e.elite?e.aff[0].c:col,e.elite?22:12);c.fillStyle=col;
 if(e.boss){e.def.draw(e);c.shadowBlur=0;return}
 if(e.type==='wisp'){c.beginPath();c.moveTo(cx,cy-12);c.lineTo(cx+12,cy);c.lineTo(cx,cy+12);c.lineTo(cx-12,cy);c.fill()}
 else{c.fillRect(e.x-e.w/2,e.y-e.h,e.w,e.h);c.shadowBlur=0;c.fillStyle='#000';c.fillRect(e.x-e.w/4,e.y-e.h*.7,e.w/6,e.h/6);c.fillRect(e.x+e.w/12,e.y-e.h*.7,e.w/6,e.h/6)}
 c.shadowBlur=0;
 if(e.markT>0){c.strokeStyle='#9aff3c';c.lineWidth=2;c.beginPath();c.arc(cx,cy,e.w*.8,0,6.283);c.stroke()}
 if(e.stunT>0){c.fillStyle='#ffd23c';c.font='12px monospace';c.textAlign='center';c.fillText('★',cx+Math.sin(S.t*8)*8,e.y-e.h-18)}
 if(e.dots){let k=0;for(const n in e.dots)if(e.dots[n].t>0){c.fillStyle=n==='poison'?'#e6ff3c':'#ff1f4b';c.fillRect(cx-16+k*8,e.y-e.h-16,6,4);k++}}
 if(e.hp<e.maxHp){c.fillStyle='#300';c.fillRect(cx-16,e.y-e.h-10,32,4);c.fillStyle='#f55';c.fillRect(cx-16,e.y-e.h-10,32*Math.max(0,e.hp/e.maxHp),4)}
 if(e.elite){c.fillStyle=e.aff[0].c;c.font='10px monospace';c.textAlign='center';c.fillText(e.aff.map(a=>a.n).join('+'),cx,e.y-e.h-14)}
}

/* ===================== LOOP ===================== */
let last=performance.now();
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;
 if(S){if(S.st==='play'){if(hitstop>0)hitstop-=dt;else update(dt)}draw()}requestAnimationFrame(loop)}
