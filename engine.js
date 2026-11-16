'use strict';
/* ===================== UTIL ===================== */
const W=960,H=540,G=2100,WORLD=2400,FLOOR=500;
const $=i=>document.getElementById(i),cv=$('game'),c=cv.getContext('2d');
const R=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sgn=v=>v<0?-1:1,hyp=Math.hypot;
const Ev={h:{},on(n,f){(this.h[n]=this.h[n]||[]).push(f)},emit(n,...a){(this.h[n]||[]).forEach(f=>f(...a))}};

/* ===================== DIFICULTADES ===================== */
const DIFFS=[
 {name:'Paseo Estelar',clock:.7,elite:1,heal:1,chest:1,revive:1,desc:'Reloj 30% más lento · 1 resurrección gratis'},
 {name:'Estándar',clock:1,elite:1,heal:1,chest:1,desc:'Balance base'},
 {name:'Tormenta de Riesgo',clock:1.25,elite:1.4,heal:.8,chest:1,desc:'Reloj +25% · +40% élites · -20% curación'},
 {name:'Cataclismo',clock:1.6,elite:1,heal:1,chest:1.3,dbl:1,desc:'Reloj +60% · cofres +30% · élites con doble afijo'},
 // startLvl: sin él, empezar en el minuto 45 a nivel 1 es muerte en segundos
 {name:'Pesadilla Absoluta',clock:1,elite:1,heal:1,chest:1,start:45*60,startLvl:20,hazard:1,perma:1,desc:'Empieza en el minuto 45 (a nivel 20) · proyectiles enemigos dejan zonas de daño · muerte permanente'}
];

/* ===================== ESTADO / INPUT ===================== */
let S=null,chain=0,selC='vanguard',selD=1;
const keys={},mouse={x:0,y:0,l:0,r:0};
addEventListener('keydown',e=>{keys[e.code]=1;if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
 // e.repeat: mantener pulsado no debe gastar el doble salto
 if(S&&S.st==='play'&&!e.repeat){if(e.code==='Space'||e.code==='KeyW'||e.code==='ArrowUp')jump();if(e.code==='KeyB'&&!S.boss&&!S.bossDone)spawnBoss()}});
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
 ['menu','end','mastery'].forEach(i=>$(i).style.display='none');
 S={st:'play',ch,df,t:0,clock:df.start||0,phase:1,cam:0,shake:0,en:[],zn:[],dr:[],sch:[],freeze:0,spawn:2,boss:null,bossDone:0,bossName:'',msg:'',msgT:0,kills:0,mq:0,
  p:{x:300,y:FLOOR,w:24,h:42,vx:0,vy:0,ground:0,plat:null,jumps:0,maxJ:2,face:1,aim:0,hp:ch.hp,maxHp:ch.hp,lvl:1,xp:0,need:40,dmgMul:1,inv:0,dash:null,drop:0,
   cd:{p:0,s:0,m:0,u:0},m:{dmg:1,spd:1,as:1,crit:.05,cdr:0,ls:0,arm:0},revive:df.revive||0}};
 say('Sobrevive · el Coloso Prisma despierta a los 75 s (B para invocarlo ya)');
 while(S.p.lvl<(df.startLvl||1))giveXp(S.p.need-S.p.xp);
}

/* ===================== FÍSICA ===================== */
function phys(e,dt,drop){
 e.vy+=G*dt*(e.gm===undefined?1:e.gm);const oy=e.y;
 e.x=clamp(e.x+e.vx*dt,e.w/2,WORLD-e.w/2);e.y+=e.vy*dt;e.ground=0;e.plat=null;
 if(e.vy>=0)for(const p of PLAT){if(!p.on||(drop&&!p.solid))continue;
  if(e.x+e.w/2>p.rx&&e.x-e.w/2<p.rx+p.w&&oy<=p.ry+6&&e.y>=p.ry){e.y=p.ry;e.vy=0;e.ground=1;e.plat=p;break}}
}
function jump(){const p=S.p;if(!p.ground&&p.jumps>=p.maxJ)return;
 p.jumps=p.ground?1:p.jumps+1;p.vy=-S.ch.jump;p.ground=0;burst(p.x,p.y,8,S.ch.color,160,3);Ev.emit('onJump')}

/* ===================== COMBATE ===================== */
function shootP(x,y,a,sp,dmg,r){fxProj({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,dmg,r,life:5,hostile:1,col:'#ff4d6d'})}
function Z(o){S.zn.push(Object.assign({warn:0,life:.3,dmg:0,tk:0,col:'#f24'},o))}
function puddle(x,y){Z({x,y,r:42,warn:.3,life:4,dmg:6*dmgScale(),dot:1,hostile:1,col:'#ff5a1a'})}
function heal(a){const p=S.p;p.hp=Math.min(p.maxHp,p.hp+a)}
function aoe(x,y,r,d){for(const e of S.en.slice())if(!e.dead&&hyp(e.x-x,e.y-e.h/2-y)<r+e.w/2)hurtE(e,d)}

function hurtE(e,d){
 if(e.dead)return;const p=S.p;const crit=Math.random()<p.m.crit;
 d*=p.dmgMul*p.m.dmg*(crit?2:1)*(e.stun>0?1.5:1);
 e.hp-=d;e.flash=.1;txt(e.x+R(-10,10),e.y-e.h-6,Math.round(d)+(crit?'!':''),crit?'#ffd23c':'#fff');
 Ev.emit('onHit',e,d);if(p.m.ls)heal(d*p.m.ls);
 if(e.boss){
  if(e.stun<=0){e.stag+=d*.8;if(e.stag>=e.stagMax){e.stag=0;e.stun=3.2;e.t=1.2;say('¡GUARDIA ROTA! Daño +50%');S.shake=14;hitStop(50);ring(e.x,e.y-55,200,'#ffd23c',.5)}}
  const r=e.hp/e.maxHp,np=r>.66?1:r>.33?2:3;
  if(np>e.ph){e.ph=np;S.phase=np;e.stun=0;e.t=1.8;S.shake=26;hitStop(60);ring(e.x,e.y-55,500,e.def.color,.8);burst(e.x,e.y-55,50,e.def.color,500,4);
   say(e.def.phaseMsg[np])}
 }
 if(e.hp<=0)kill(e);
}
function kill(e){
 e.dead=1;S.kills++;burst(e.x,e.y-e.h/2,e.boss?80:18,e.d.color,e.boss?600:320,4);S.shake=Math.max(S.shake,e.boss?30:3);
 if(e.boss||e.elite)hitStop(e.boss?60:40);
 giveXp(e.d.xp);heal(S.p.maxHp*.01*S.df.heal);Ev.emit('onKill',e);
 if(e.fire)for(let i=-1;i<=1;i++)Z({x:e.x+i*50,y:FLOOR,r:45,warn:.2,life:3,dmg:5*dmgScale(),dot:1,hostile:1,col:'#ff7a1a'});
 if(e.boom)Z({x:e.x,y:e.y-e.h/2,r:100,warn:.7,dmg:25*dmgScale(),hostile:1,col:'#f3f'});
 if(e.boss){S.boss=null;S.bossDone=1;S.bossName=e.def.name;endGame(true)}
}
function hurtP(d){
 const p=S.p;if(p.inv>0||S.st!=='play')return;
 d*=1-Math.min(.6,p.m.arm);p.hp-=d;p.inv=.45;S.shake=Math.max(S.shake,9);burst(p.x,p.y-20,10,'#f44',260,3);txt(p.x,p.y-56,Math.ceil(d),'#f66');
 Ev.emit('onTakeDamage',d);if(p.hp<=0)die();
}
function die(){
 const p=S.p;
 if(p.revive>0){p.revive--;p.hp=p.maxHp*.5;p.inv=2.5;say('¡Resurrección gratuita usada!');ring(p.x,p.y-20,320,'#fff',.6);
  // onda de empuje, no daño (antes: aoe de 0 que pintaba "0" y disparaba onHit)
  for(const e of S.en)if(!e.boss&&hyp(e.x-p.x,e.y-p.y)<320)e.vx+=sgn(e.x-p.x)*600}
 else endGame(false);
}
function giveXp(n){
 const p=S.p;p.xp+=n;
 while(p.xp>=p.need){p.xp-=p.need;p.lvl++;p.need=Math.round(40*Math.pow(p.lvl,1.35));
  const old=p.maxHp;p.maxHp=S.ch.hp*(1+.02*(p.lvl-1));p.hp+=p.maxHp-old;p.dmgMul=1+.05*(p.lvl-1);
  ring(p.x,p.y-20,160,'#ffd23c',.5);txt(p.x,p.y-70,'¡NIVEL '+p.lvl+'!','#ffd23c');Ev.emit('onLevelUp',p.lvl);
  if(p.lvl%5===0)S.mq++}
 if(S.mq>0&&S.st==='play')openMastery();
}

/* ===================== ENEMIGOS ===================== */
function spawnEnemy(type,x,y,noElite){
 const co=coef(),r=Math.random();type=type||(co<2?(r<.6?'crawler':'wisp'):(r<.4?'crawler':r<.7?'wisp':'brute'));
 const d=ENEMIES[type],side=Math.random()<.5?-1:1;
 const e={type,d,boss:0,x:clamp(x===undefined?S.p.x+side*R(520,720):x,30,WORLD-30),y:y===undefined?(d.ai==='fly'?R(120,260):FLOOR):y,w:d.w,h:d.h,vx:0,vy:0,
  hp:d.hp*hpScale(),dmg:d.dmg*dmgScale(),spdx:1,ph:R(0,6),cd:R(1,2.5),flash:0,slowT:0,aff:[],fireT:0};
 if(!noElite&&Math.random()<Math.min(.6,(.04+co*.012)*S.df.elite)){
  const n=S.df.dbl?2:1,pool=AFX.slice().sort(()=>Math.random()-.5);e.hp*=2;e.dmg*=1.3;e.elite=1;
  for(let i=0;i<n;i++){const a=pool[i];e.aff.push(a);if(a.spd)e.spdx*=a.spd;if(a.hp)e.hp*=a.hp;if(a.f)e[a.f]=1}}
 e.maxHp=e.hp;S.en.push(e);
}
function updEnemy(e,dt){
 const p=S.p,d=e.d;e.flash-=dt;e.slowT-=dt;
 if(e.boss){e.def.ai(e,dt);return}
 const sp=d.spd*e.spdx*(e.slowT>0?.35:1);
 if(d.ai==='walk'){e.vx+=(sgn(p.x-e.x)*sp-e.vx)*Math.min(1,8*dt);
  if(e.ground&&p.y<e.y-90&&Math.random()<dt*1.5)e.vy=-640;phys(e,dt)}
 else{const tx=p.x+Math.sin(S.t*.8+e.ph)*220,ty=p.y-170+Math.sin(S.t*1.6+e.ph)*30;e.x+=clamp(tx-e.x,-sp*2,sp*2)*dt*1.2;e.y+=clamp(ty-e.y,-sp*2,sp*2)*dt*1.2;e.y=Math.min(e.y,FLOOR-10);
  e.cd-=dt*(e.slowT>0?.35:1);if(e.cd<=0){e.cd=d.shot*R(.8,1.2);shootP(e.x,e.y-e.h/2,Math.atan2(p.y-p.h/2-(e.y-e.h/2),p.x-e.x),330,e.dmg,6)}}
 e.vx*=.98;
 if(e.fire){e.fireT-=dt;if(e.fireT<=0){e.fireT=1;Z({x:e.x,y:e.y,r:34,warn:.2,life:3,dmg:4*dmgScale(),dot:1,hostile:1,col:'#ff7a1a'})}}
 if(d.ai==='walk'&&Math.abs(e.x-p.x)<(e.w+p.w)/2&&Math.abs((e.y-e.h/2)-(p.y-p.h/2))<(e.h+p.h)/2)hurtP(e.dmg);
}

/* ===================== UPDATE ===================== */
function update(dt){
 const s=S,p=s.p,fz=s.freeze>0;s.t+=dt;s.clock+=dt*s.df.clock;s.cam=clamp(p.x-W/2,0,WORLD-W);
 for(const pl of PLAT){const a=pl.sp?Math.sin(s.t*pl.sp):0,nx=pl.x+(pl.ax||0)*a;pl.dx=pl.rx===undefined?0:nx-pl.rx;pl.rx=nx;pl.ry=pl.y+(pl.ay||0)*a;pl.on=s.phase>=pl.ph[0]&&s.phase<=pl.ph[1]}
 // jugador
 const ax=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
 p.aim=Math.atan2(mouse.y-(p.y-p.h/2),mouse.x+s.cam-p.x);if(Math.abs(Math.cos(p.aim))>.15)p.face=sgn(Math.cos(p.aim));
 p.inv-=dt;p.drop-=dt;for(const k in p.cd)p.cd[k]-=dt;
 if(keys.KeyS||keys.ArrowDown)p.drop=.25;
 if(p.dash){const dd=p.dash;dd.t-=dt;p.x=clamp(p.x+dd.vx*dt,12,WORLD-12);p.vy=0;p.inv=Math.max(p.inv,.05);
  if(Math.random()<.8)burst(p.x,p.y-20,1,s.ch.color,40,5);
  if(dd.dmg)for(const e of s.en)if(!e.dead&&!dd.hit.has(e)&&Math.abs(e.x-p.x)<e.w/2+24&&Math.abs(e.y-e.h/2-(p.y-20))<e.h/2+30){dd.hit.add(e);hurtE(e,dd.dmg);e.vx+=sgn(dd.vx)*400}
  if(dd.t<=0)p.dash=null}
 else{if(p.ground&&p.plat&&p.plat.on)p.x=clamp(p.x+p.plat.dx,12,WORLD-12); // la plataforma móvil arrastra al jugador
  p.vx+=(ax*s.ch.spd*p.m.spd-p.vx)*Math.min(1,(p.ground?18:8)*dt);phys(p,dt,p.drop>0);if(p.ground)p.jumps=0;else if(p.jumps===0&&p.vy>0)p.jumps=1}
 if(p.y>FLOOR+100){p.y=FLOOR;p.vy=0}
 if(mouse.l&&p.cd.p<=0)cast('p');if(mouse.r&&p.cd.s<=0)cast('s');
 if(keys.ShiftLeft&&p.cd.m<=0)cast('m');if(keys.KeyQ&&p.cd.u<=0)cast('u');
 heal(p.maxHp*.008*dt*s.df.heal);
 // director
 if(!s.boss&&!s.bossDone&&s.t>75)spawnBoss();
 s.spawn-=dt;
 if(s.spawn<=0){const mx=Math.min(26,5+coef()*1.6)*(s.boss?.6:1);if(s.en.filter(e=>!e.boss).length<mx)spawnEnemy();s.spawn=Math.max(.5,2.6/(1+coef()*.12))}
 // enemigos (Tiempo Detenido congela enemigos, sus proyectiles, zonas y ataques programados)
 if(fz)s.freeze-=dt;else for(const e of s.en)updEnemy(e,dt);
 s.en=s.en.filter(e=>!e.dead);
 // drones
 for(const dr of s.dr){dr.life-=dt;dr.a+=dt*2.5;dr.x=p.x+Math.cos(dr.a)*55;dr.y=p.y-50+Math.sin(dr.a)*22;dr.cd-=dt;
  if(dr.cd<=0){let b=null,bd=520;for(const e of s.en){const dd=hyp(e.x-dr.x,e.y-e.h/2-dr.y);if(dd<bd){bd=dd;b=e}}
   if(b){dr.cd=.6;const an=Math.atan2(b.y-b.h/2-dr.y,b.x-dr.x);spawnPr({x:dr.x,y:dr.y,vx:Math.cos(an)*900,vy:Math.sin(an)*900,dmg:dr.dmg,r:4,life:.7,col:'#4cff9a'})}}}
 s.dr=s.dr.filter(d=>d.life>0);
 // proyectiles
 for(let i=0;i<PR.n;i++){const q=PR.a[i];if(q.hostile&&fz)continue;
  q.life-=dt;if(q.home){let b=null,bd=500;for(const e of s.en)if(!q.hit.has(e)){const dd=hyp(e.x-q.x,e.y-e.h/2-q.y);if(dd<bd){bd=dd;b=e}}
   if(b){const sp=hyp(q.vx,q.vy),ca=Math.atan2(q.vy,q.vx),ta=Math.atan2(b.y-b.h/2-q.y,b.x-q.x),da=((ta-ca+Math.PI*3)%(Math.PI*2))-Math.PI,na=ca+clamp(da,-7*dt,7*dt);q.vx=Math.cos(na)*sp;q.vy=Math.sin(na)*sp}}
  q.x+=q.vx*dt;q.y+=q.vy*dt;spark(q.x,q.y,0,0,.2,q.col,q.r);
  if(q.hostile){if(hyp(q.x-p.x,q.y-(p.y-p.h/2))<q.r+13){hurtP(q.dmg);q.life=0}}
  else for(const e of s.en){if(e.dead||q.hit.has(e))continue;
   if(hyp(e.x-q.x,e.y-e.h/2-q.y)<q.r+Math.max(e.w,e.h)/2){q.hit.add(e);hurtE(e,q.dmg);if(q.boom){q.life=0;break}if(--q.pierce<0){q.life=0;break}}}
  if(q.y>=FLOOR||q.x<0||q.x>WORLD||q.y<-80)q.life=Math.min(q.life,0);
  if(q.life<=0){if(q.boom){ring(q.x,Math.min(q.y,FLOOR),q.boom,q.col,.3);aoe(q.x,Math.min(q.y,FLOOR),q.boom,q.dmg);s.shake=Math.max(s.shake,4)}
   if(q.hostile&&s.df.hazard)puddle(q.x,Math.min(q.y,FLOOR))}
 }
 PR.sweep(deadLife);
 // zonas
 for(const z of s.zn){if(z.hostile&&fz)continue;
  const inside=(x,y,m)=>z.rw?(x>z.x-m&&x<z.x+z.rw+m&&y>z.y-m&&y<z.y+z.rh+m):hyp(x-z.x,y-z.y)<z.r+m;
  if(z.warn>0){z.warn-=dt;continue}
  if(z.slow)for(const e of s.en)if(inside(e.x,e.y-e.h/2,e.w/2))e.slowT=.15;
  if(!z.act){z.act=1;if(!z.dot&&z.hostile&&z.dmg&&inside(p.x,p.y-p.h/2,12))hurtP(z.dmg);if(!z.dot)burst(z.x,z.y,14,z.col,300,4)}
  z.life-=dt;
  if(z.dot&&z.hostile){z.tk-=dt;if(z.tk<=0){z.tk=.5;if(inside(p.x,p.y-p.h/2,10))hurtP(z.dmg)}}
 }
 s.zn=s.zn.filter(z=>z.life>0);
 for(const q of s.sch)if(!(q.en&&fz))q.t-=dt;for(const q of s.sch.filter(q=>q.t<=0))q.f();s.sch=s.sch.filter(q=>q.t>0);
 for(let i=0;i<PT.n;i++){const q=PT.a[i];q.l-=dt;if(q.ring){q.r+=(q.mr-q.r)*Math.min(1,dt*9)}else{q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.93;q.vy*=.93}}
 PT.sweep(deadL);for(let i=0;i<TX.n;i++){const t=TX.a[i];t.l-=dt;t.y-=40*dt}TX.sweep(deadL);
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
  else{c.beginPath();c.arc(z.x,z.y,z.r,0,6.283);if(w){c.stroke();c.globalAlpha*=.4;c.fill()}else c.fill()}}
 c.globalAlpha=1;
 // enemigos
 for(const e of s.en)drawEnemy(e);
 // drones
 for(const d of s.dr){glow('#4cff9a');c.fillStyle='#4cff9a';c.beginPath();c.moveTo(d.x,d.y-7);c.lineTo(d.x+7,d.y);c.lineTo(d.x,d.y+7);c.lineTo(d.x-7,d.y);c.fill()}
 // jugador
 const p=s.p;c.globalAlpha=p.inv>0&&Math.floor(s.t*20)%2?.4:1;glow(s.ch.color,18);c.fillStyle=s.ch.color;c.fillRect(p.x-p.w/2,p.y-p.h,p.w,p.h);
 c.fillStyle='#fff';c.fillRect(p.x+p.face*5-3,p.y-p.h+8,6,6);c.shadowBlur=0;c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(p.x,p.y-p.h/2);c.lineTo(p.x+Math.cos(p.aim)*26,p.y-p.h/2+Math.sin(p.aim)*26);c.stroke();c.globalAlpha=1;
 // proyectiles
 for(let i=0;i<PR.n;i++){const q=PR.a[i];glow(q.col,16);c.fillStyle=q.col;c.beginPath();c.arc(q.x,q.y,q.r,0,6.283);c.fill()}c.shadowBlur=0;
 // partículas
 for(let i=0;i<PT.n;i++){const q=PT.a[i];c.globalAlpha=Math.max(0,q.l/q.ml);if(q.ring){c.strokeStyle=q.c;c.lineWidth=4;glow(q.c,12);c.beginPath();c.arc(q.x,q.y,q.r,0,6.283);c.stroke();c.shadowBlur=0}else{c.fillStyle=q.c;c.fillRect(q.x-q.s/2,q.y-q.s/2,q.s,q.s)}}
 c.globalAlpha=1;c.font='bold 14px monospace';c.textAlign='center';
 for(let i=0;i<TX.n;i++){const t=TX.a[i];c.globalAlpha=Math.min(1,t.l*2);c.fillStyle=t.c;c.fillText(t.s,t.x,t.y)}c.globalAlpha=1;
 if(s.freeze>0){screen();c.fillStyle='rgba(120,220,255,.12)';c.fillRect(0,0,W,H)}
 hud();
}
function drawEnemy(e){
 const cx=e.x,cy=e.y-e.h/2,col=e.flash>0?'#fff':(e.stun>0?'#888':e.d.color);glow(e.elite?e.aff[0].c:col,e.elite?22:12);c.fillStyle=col;
 if(e.boss){e.def.draw(e);c.shadowBlur=0;return}
 if(e.type==='wisp'){c.beginPath();c.moveTo(cx,cy-12);c.lineTo(cx+12,cy);c.lineTo(cx,cy+12);c.lineTo(cx-12,cy);c.fill()}
 else{c.fillRect(e.x-e.w/2,e.y-e.h,e.w,e.h);c.shadowBlur=0;c.fillStyle='#000';c.fillRect(e.x-e.w/4,e.y-e.h*.7,e.w/6,e.h/6);c.fillRect(e.x+e.w/12,e.y-e.h*.7,e.w/6,e.h/6)}
 c.shadowBlur=0;
 if(e.hp<e.maxHp){c.fillStyle='#300';c.fillRect(cx-16,e.y-e.h-10,32,4);c.fillStyle='#f55';c.fillRect(cx-16,e.y-e.h-10,32*Math.max(0,e.hp/e.maxHp),4)}
 if(e.elite){c.fillStyle=e.aff[0].c;c.font='10px monospace';c.textAlign='center';c.fillText(e.aff.map(a=>a.n).join('+'),cx,e.y-e.h-14)}
}

/* ===================== LOOP ===================== */
let last=performance.now();
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;
 if(S){if(S.st==='play'){if(hitstop>0)hitstop-=dt;else update(dt)}draw()}requestAnimationFrame(loop)}
