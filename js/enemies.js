'use strict';
/* ===================== ENEMIGOS: aparición, comportamiento y dibujo =====================
   EAI[d.ai](e,dt,jugador,velocidad). `e.tell>0` = está avisando de un ataque (parpadea en blanco). */
const isFlyer=d=>d.ai==='fly'||d.ai==='swarm'||d.ai==='bomber'||d.ai==='phantom';
function hover(e,dt,p,sp,dy,amp){const tx=p.x+Math.sin(S.t*.8+e.ph)*amp,ty=p.y-dy+Math.sin(S.t*1.6+e.ph)*30;
 e.x+=clamp(tx-e.x,-sp*2,sp*2)*dt*1.2;e.y+=clamp(ty-e.y,-sp*2,sp*2)*dt*1.2;e.y=clamp(e.y,40,FLOOR-10)}
const aimAt=(e,p)=>Math.atan2(p.y-p.h/2-(e.y-e.h/2),p.x-e.x);
function keepRange(e,dt,p,sp){const dx=p.x-e.x,dist=Math.abs(dx),want=dist>e.d.range+40?1:dist<e.d.range-60?-1:0;
 e.vx+=(want*sgn(dx)*sp-e.vx)*Math.min(1,6*dt);e.face=sgn(dx);phys(e,dt)}

const EAI={
 walk(e,dt,p,sp){e.vx+=(sgn(p.x-e.x)*sp-e.vx)*Math.min(1,8*dt);if(e.ground&&p.y<e.y-90&&Math.random()<dt*1.5)e.vy=-640;phys(e,dt)},
 fly(e,dt,p,sp){hover(e,dt,p,sp,170,220);e.cd-=dt;if(e.cd<=0){e.cd=e.d.shot*R(.8,1.2);shootP(e.x,e.y-e.h/2,aimAt(e,p),330,e.dmg,6,e)}},
 // dispara un glóbulo en parábola que deja un charco de ácido
 shooter(e,dt,p,sp){keepRange(e,dt,p,sp);e.cd-=dt;e.tell=e.cd<.4?1:0;
  if(e.cd<=0){e.cd=e.d.shot*R(.9,1.2);const T=.9,dx=p.x-e.x,dy=p.y-20-(e.y-e.h);
   fxProj({x:e.x,y:e.y-e.h,vx:dx/T,vy:(dy-.5*G*T*T)/T,gm:1,dmg:e.dmg,r:7,life:3,hostile:1,col:e.d.color,src:e,
    zone:{r:40,life:3,dot:1,hostile:1,dmg:e.dmg*.3,col:'#b4ff3c'}})}},
 // apunta 1 s con un láser visible, fija el ángulo 0,25 s antes y dispara muy rápido
 sniper(e,dt,p){e.vx=0;phys(e,dt);e.cd-=dt;if(e.cd<1.2&&e.cd>.25)e.lock=aimAt(e,p);e.tell=e.cd<1.2?1:0;
  if(e.cd<=0){e.cd=e.d.shot;shootP(e.x,e.y-e.h+6,e.lock,1150,e.dmg,5,e);e.lock=undefined}},
 // corre hacia ti; al acercarse se detiene, avisa 0,6 s y explota
 kamikaze(e,dt,p,sp){if(e.fuse>0){e.fuse-=dt;e.vx*=.85;phys(e,dt);if(e.fuse<=0){burst(e.x,e.y-10,20,'#ffb13c',350,4);e.dead=1}return}
  EAI.walk(e,dt,p,sp);if(hyp(p.x-e.x,p.y-e.y)<75){e.fuse=.6;e.tell=1;Z({x:e.x,y:e.y-e.h/2,r:90,warn:.6,dmg:e.dmg,hostile:1,col:'#ffb13c'})}},
 bomber(e,dt,p,sp){e.x+=clamp(p.x+Math.sin(S.t+e.ph)*120-e.x,-sp,sp)*dt*1.5;e.y+=(130+Math.sin(S.t*2+e.ph)*15-e.y)*dt*2;e.cd-=dt;e.tell=e.cd<.5?1:0;
  if(e.cd<=0){e.cd=e.d.shot*R(.9,1.2);Z({x:e.x,y:FLOOR,r:70,warn:1,dmg:e.dmg,hostile:1,col:'#ff7a1a'});
   fxProj({x:e.x,y:e.y,vx:0,vy:420,dmg:0,r:6,life:.9,hostile:1,col:'#ff7a1a',harmless:1})}},
 // escudo frontal (front) y embestida avisada
 tank(e,dt,p,sp){if(e.chT>0){e.chT-=dt;e.vx=e.chDir*560;phys(e,dt);return}
  if(e.tell>0){e.tell-=dt;e.vx*=.8;phys(e,dt);if(e.tell<=0){e.chT=.8;e.chDir=e.face}return}
  e.face=sgn(p.x-e.x);EAI.walk(e,dt,p,sp);e.cd-=dt;if(e.cd<=0&&Math.abs(p.x-e.x)<450&&Math.abs(p.y-e.y)<60){e.tell=.6;e.cd=4}},
 leaper(e,dt,p,sp){if(e.ground&&e.tell>0){e.tell-=dt;e.vx=0;if(e.tell<=0){e.vx=clamp(p.x-e.x,-400,400)/.55;e.vy=-720}}
  else if(e.ground){e.vx+=(sgn(p.x-e.x)*sp*.5-e.vx)*Math.min(1,8*dt);e.cd-=dt;if(e.cd<=0&&Math.abs(p.x-e.x)<380){e.tell=.4;e.cd=2.2}}
  phys(e,dt)},
 // orbita alrededor del jugador y se lanza en picado
 swarm(e,dt,p,sp){if(e.dive>0){e.dive-=dt;e.x+=e.dvx*dt;e.y=Math.min(FLOOR-8,e.y+e.dvy*dt);return}
  e.a=(e.a||e.ph)+dt*2;const tx=p.x+Math.cos(e.a)*140,ty=p.y-60+Math.sin(e.a)*70;e.x+=(tx-e.x)*Math.min(1,3*dt);e.y+=(ty-e.y)*Math.min(1,3*dt);
  e.cd-=dt;e.tell=e.cd<.3?1:0;if(e.cd<=0){e.cd=R(2,3.5);const a=aimAt(e,p);e.dvx=Math.cos(a)*440;e.dvy=Math.sin(a)*440;e.dive=.6}},
 turret(e,dt,p){e.vx=0;phys(e,dt);e.cd-=dt;e.tell=e.cd<.5?1:0;
  if(e.cd<=0){e.cd=e.d.shot;for(let i=0;i<3;i++)S.sch.push({t:i*.15,en:1,f:()=>{if(!e.dead)shootP(e.x,e.y-e.h/2,aimAt(e,S.p),420,e.dmg,5,e)}})}},
 // mantiene la distancia y escuda a los aliados cercanos
 shaman(e,dt,p,sp){keepRange(e,dt,p,sp);e.cd-=dt;e.tell=e.cd<.5?1:0;
  if(e.cd<=0){e.cd=4;ring(e.x,e.y-e.h/2,260,'#d070ff',.4);for(const o of S.en)if(o!==e&&!o.boss&&!o.dead&&hyp(o.x-e.x,o.y-e.y)<260)o.sh=Math.max(o.sh||0,o.maxHp*.35)}},
 // se desvanece (invulnerable), reaparece cerca y dispara en abanico
 phantom(e,dt,p,sp){if(e.ghost>0){e.ghost-=dt;if(e.ghost<=0){e.x=clamp(p.x+R(-1,1)*240,30,WORLD-30);e.y=clamp(p.y-R(90,160),40,FLOOR-20);burst(e.x,e.y-e.h/2,14,'#c8d2ff',200,3);
   const a=aimAt(e,p);for(let i=-1;i<=1;i++)shootP(e.x,e.y-e.h/2,a+i*.2,300,e.dmg,6,e)}return}
  hover(e,dt,p,sp,140,200);e.gT=(e.gT===undefined?R(2,4):e.gT)-dt;if(e.gT<=0){e.gT=R(3,4.5);e.ghost=1;burst(e.x,e.y-e.h/2,14,'#c8d2ff',200,3)}},
 structure(e){e.vx=0;e.vy=0},
 hunter(e,dt,p,sp){if(e.lunge>0){e.lunge-=dt;e.vx=e.ldir*620;phys(e,dt);return}
  if(e.tell>0){e.tell-=dt;e.vx*=.8;phys(e,dt);if(e.tell<=0){e.lunge=.35;e.ldir=sgn(p.x-e.x);Snd.play('dash')}return}
  EAI.walk(e,dt,p,sp);e.cd-=dt;if(e.cd<=0&&Math.abs(p.x-e.x)<330){e.cd=R(1.8,2.6);e.tell=.5}},
 golem(e,dt,p,sp){if(e.tell>0){e.tell-=dt;e.vx*=.8;phys(e,dt);return}EAI.walk(e,dt,p,sp);e.cd-=dt;
  if(e.cd<=0&&hyp(p.x-e.x,p.y-e.y)<170){e.cd=3.2;e.tell=.9;Z({x:e.x,y:e.y-10,r:150,warn:.9,dmg:e.dmg,hostile:1,col:'#ff6a3c'})}}
};

function pickEnemy(){const co=coef(),pool=STAGE.enemies.filter(k=>(ENEMIES[k].min||0)<=co&&ENEMIES[k].wt),wt=k=>ENEMIES[k].wt*legacyWt(k);  // legacyWt: consecuencias de jefes
 let r=Math.random()*pool.reduce((a,k)=>a+wt(k),0);for(const k of pool){r-=wt(k);if(r<=0)return k}return pool[0]}
function spawnEnemy(type,x,y,noElite){
 const co=coef();type=type||pickEnemy();const d=ENEMIES[type],side=Math.random()<.5?-1:1,it=S.p.items;
 // los terrestres caen desde arriba sobre lo que haya debajo
 const e={type,d,boss:0,x:clamp(x===undefined?S.p.x+side*R(520,720):x,30,WORLD-30),y:y===undefined?(isFlyer(d)?R(120,260):60):y,w:d.w,h:d.h,vx:0,vy:0,face:1,
  hp:d.hp*hpScale()*(it.greed?1.2+.2*it.greed:1),dmg:d.dmg*dmgScale(),spdx:1,ph:R(0,6),cd:R(1,2.5),flash:0,slowT:0,stunT:0,markT:0,aff:[],sh:0,tell:0};
 if(!noElite&&Math.random()<Math.min(.6,(.04+co*.012)*S.df.elite*(REL().elite||1)*(it.blacklens?2:1))){
  const n=S.df.dbl?2:1,pool=AFX.slice().sort(()=>Math.random()-.5);e.hp*=2;e.dmg*=1.3;e.elite=1;
  for(let i=0;i<n;i++){const a=pool[i];e.aff.push(a);if(a.spd)e.spdx*=a.spd;if(a.hp)e.hp*=a.hp}}
 stormSpawn(e);e.maxHp=e.hp;ecoSpawn(e);legacySpawn(e);progSpawn(e);debtSpawn(e);worldSpawn(e);routesSpawn(e);S.en.push(e);return e;
}
function updEnemy(e,dt){
 const p=S.p,d=e.d;e.flash-=dt;e.slowT-=dt;e.markT-=dt;updElements(e,dt);updEco(e,dt);if(e.dead)return;
 if(e.dots){tickDots(e,dt);if(e.dead)return}
 if(e.boss)return bossAI(e,dt);
 for(const a of e.aff)if(a.tick)a.tick(e,dt);
 if(e.stunT>0){e.stunT-=dt;if(!isFlyer(d)){e.vx*=.9;phys(e,dt)}return}
 EAI[d.ai](e,dt,p,d.spd*e.spdx*(e.slowT>0?.35:1));
 if(!isFlyer(d))e.vx*=.98;
 if(e.y>H+60){e.dead=1;return}  // cayó a un abismo
 if((d.contact||e.dive>0||e.chT>0)&&Math.abs(e.x-p.x)<(e.w+p.w)/2&&Math.abs((e.y-e.h/2)-(p.y-p.h/2))<(e.h+p.h)/2)hurtP(e.dmg,e);
}
function enemyDeath(e){
 for(const a of e.aff)if(a.death)a.death(e);
 if(e.d.split)for(let i=-1;i<=1;i+=2){const c2=spawnEnemy(e.d.split,e.x+i*14,e.y-4,1);c2.vx=i*220;c2.vy=-300}
}

/* ---------- dibujo (el arte de cada silueta está en art.js) ---------- */
function drawEnemy(e){
 if(e.d.structure)return drawStructure(e);
 if(e.type==='shade')return drawShade(e);
 if(e.hcid)return drawHeroFoe(e);
 if(e.hidden)return e.def&&e.def.drawHidden&&e.def.drawHidden(e);
 const cx=e.x,cy=e.y-e.h/2,blink=e.tell>0&&Math.floor(S.t*16)%2,col=e.flash>0||blink?'#fff':(e.stun>0||e.stunT>0?'#888':e.d.color);
 c.globalAlpha=e.ghost>0?.25:1;glow(e.elite?(e.aff[0]||AFX[0]).c:col,e.elite?22:12);c.fillStyle=col;
 if(e.boss){e.def.draw(e);c.shadowBlur=0;c.globalAlpha=1;return}
 if(e.elite){c.strokeStyle=(e.aff[0]||AFX[0]).c;c.lineWidth=2;c.globalAlpha*=.6+.4*Math.sin(S.t*6);c.beginPath();c.arc(cx,cy,Math.max(e.w,e.h)*.75,0,6.283);c.stroke();c.globalAlpha=e.ghost>0?.25:1}
 drawEnemyArt(e,col);c.shadowBlur=0;c.globalAlpha=1;
 if(e.sh>0){c.strokeStyle='#d070ff';c.lineWidth=2;c.strokeRect(cx-e.w/2-4,e.y-e.h-4,e.w+8,e.h+8)}
 if(e.refT<0){c.strokeStyle='#e0e0ff';c.lineWidth=3;c.beginPath();for(let k=0;k<6;k++){const a=k*1.047+S.t;c.lineTo(cx+Math.cos(a)*e.w*.9,cy+Math.sin(a)*e.h*.9)}c.closePath();c.stroke()}
 if(e.lock!==undefined){c.strokeStyle='#ff3c6a';c.globalAlpha=.3+.5*(1-Math.max(0,e.cd-.25));c.lineWidth=e.cd<.25?3:1;c.beginPath();c.moveTo(cx,e.y-e.h+6);c.lineTo(cx+Math.cos(e.lock)*1000,e.y-e.h+6+Math.sin(e.lock)*1000);c.stroke();c.globalAlpha=1}
 if(e.zapW>0){c.strokeStyle='#5ab4ff';c.globalAlpha=.5;c.setLineDash([6,6]);c.beginPath();c.moveTo(cx,cy);c.lineTo(S.p.x,S.p.y-20);c.stroke();c.setLineDash([]);c.globalAlpha=1}
 if(e.markT>0){c.strokeStyle='#9aff3c';c.lineWidth=2;c.beginPath();c.arc(cx,cy,e.w*.8,0,6.283);c.stroke()}
 if(e.stunT>0){c.fillStyle='#ffd23c';c.font='12px monospace';c.textAlign='center';c.fillText('★',cx+Math.sin(S.t*8)*8,e.y-e.h-18)}
 if(e.dots){let k=0;for(const n in e.dots)if(e.dots[n].t>0){c.fillStyle=n==='poison'?'#e6ff3c':n==='burn'?'#ff7a1a':'#ff1f4b';c.fillRect(cx-16+k*8,e.y-e.h-16,6,4);k++}}
 if(e.hp<e.maxHp){c.fillStyle='#300';c.fillRect(cx-16,e.y-e.h-10,32,4);c.fillStyle='#f55';c.fillRect(cx-16,e.y-e.h-10,32*Math.max(0,e.hp/e.maxHp),4)}
 if(e.elite){c.fillStyle=(e.aff[0]||AFX[0]).c;c.font='10px monospace';c.textAlign='center';c.fillText(e.aff.map(a=>a.n).join('+'),cx,e.y-e.h-20)}
}
