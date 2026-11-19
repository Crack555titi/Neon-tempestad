'use strict';
/* ===================== JEFES =====================
   Cada jefe: estadísticas + move(b,dt) (movimiento) + moves[] (repertorio: ph = fase mínima, cd = pausa tras el ataque,
   w = peso, f(b,f,dm) con f = factor de rapidez de la fase y dm = escala de daño) + ganchos opcionales:
   init, tick (cada frame), onPhase(b,fase), stunned (durante la ruptura de guardia), draw, drawHidden.
   Mecánica común: 3 fases (66% / 33%), barra de ruptura de guardia y telegraphs que se rellenan antes del impacto.
   Cada jefe castiga el pánico a su manera (ataques que te siguen, que esperan donde aterrizas o que castigan moverse). */

// telegraphs: track = segundos antes del impacto en que el aviso deja de seguirte
const TG={
 slam:(x,r,warn,dmg,col,track)=>Z({x,y:FLOOR,r,warn,dmg,hostile:1,col,track}),
 circle:(x,y,r,warn,dmg,col,o)=>Z(Object.assign({x,y,r,warn,dmg,hostile:1,col},o)),
 rect:(x,y,w,h,warn,dmg,col,o)=>Z(Object.assign({x,y,rw:w,rh:h,warn,dmg,hostile:1,col},o)),
 line:(x,y,ang,len,w,warn,life,dmg,col,rot)=>Z({x,y,line:{ang,len,w,rot:rot||0},warn,life,dmg,hostile:1,col,sweep:1}),
 nova:(x,y,n,spd,dmg,r,src)=>{const off=R(0,6.28);for(let i=0;i<n;i++)shootP(x,y,off+i*6.283/n,spd,dmg,r,src)}
};

const BOSSES={
 /* ---------- 1. COLOSO PRISMA (Ruinas de Neón) ---------- */
 prisma:{name:'Coloso Prisma',hp:2600,stagMax:260,dmg:30,xp:400,color:'#ff3cf2',w:110,h:110,y:250,stunY:330,
  phaseMsg:{2:'¡FASE 2! La arena se fragmenta…',3:'¡FASE 3! Plataformas inestables · el Coloso invoca refuerzos'},
  move(b,dt){b.x+=(WORLD/2+Math.sin(S.t*.35)*620-b.x)*dt*.9;b.y+=(250+Math.sin(S.t*1.1)*25-b.y)*dt*2.5;b.ang+=dt*(1+b.ph)},
  moves:[
   {ph:1,cd:2.3,f(b,f,dm){const p=S.p;(b.ph>2?[-240,0,240]:[0]).forEach(o=>TG.slam(p.x+o,105,1.1*f+.3,30*dm,'#ff2a4a'))}},
   {ph:1,cd:2.3,f(b,f,dm){TG.circle(b.x,b.y-55,85,.8,0,'#ffb13c');const n=b.ph>1?18:12;S.sch.push({t:.8,en:1,f:()=>{TG.nova(b.x,b.y-55,n,290+b.ph*40,16*dm,8,b);S.shake=Math.max(S.shake,6)}})}},
   // Eco: un golpe que te sigue y, cuando cae, otro que te sigue a donde hayas huido
   {ph:1,cd:2.8,f(b,f,dm){TG.slam(S.p.x,95,1.2*f,26*dm,'#ff3cf2',.35);S.sch.push({t:1.2*f,en:1,f:()=>TG.slam(S.p.x,95,.7,26*dm,'#ff3cf2',.3)});say('Eco Prismático')}},
   {ph:2,cd:2.8,f(b,f,dm){TG.rect(0,S.p.y-S.p.h/2-22,WORLD,44,1.3*f+.2,34*dm,'#ff2a4a')}},
   {ph:3,cd:2.3,f(b){for(let i=0;i<3;i++)S.sch.push({t:.4*i,en:1,f:()=>spawnEnemy('wisp',b.x+R(-120,120),b.y-60,1)})}}],
  draw(e){const cx=e.x,cy=e.y-e.h/2;c.save();c.translate(cx,cy);
   for(let i=0;i<3;i++){c.save();c.rotate(e.ang*(i%2?-1:1)+i);c.strokeStyle=['#ff3cf2','#3cf0ff','#ffd23c'][i];c.lineWidth=5;c.beginPath();
    for(let k=0;k<6;k++){const a=k*1.047;c.lineTo(Math.cos(a)*(62-i*10),Math.sin(a)*(62-i*10))}c.closePath();c.stroke();c.restore()}
   c.fillStyle=e.flash>0?'#fff':'#ff3cf2';c.beginPath();c.arc(0,0,26,0,6.283);c.fill();c.shadowBlur=0;c.fillStyle='#000';c.fillRect(-14,-4,28,8);
   c.fillStyle=e.stun>0?'#ffd23c':'#f33';c.fillRect(-4+Math.sin(S.t*3)*8,-3,8,6);c.restore()}},

 /* ---------- 2. HIDRA DE CABLES (Fundición Carmesí) ---------- */
 hydra:{name:'Hidra de Cables',hp:3400,stagMax:320,dmg:32,xp:500,color:'#ff6a3c',w:150,h:80,y:FLOOR,stunY:FLOOR,contact:1,
  phaseMsg:{2:'¡FASE 2! La fundición se desborda: el suelo es lava, ¡sube a las plataformas!',3:'¡FASE 3! Tres cabezas, tres mordiscos que te siguen'},
  init(b){b.x=S.tp.x;b.heads=[0,1,2].map(i=>({x:b.x,y:b.y-150,tx:0,ty:0,bite:0}))},
  move(b,dt){b.x=clamp(b.x+clamp(S.p.x-b.x,-50,50)*dt,200,WORLD-200);
   b.heads.forEach((h,i)=>{const hx=b.x+(i-1)*70+Math.sin(S.t*2+i)*20,hy=b.y-140-Math.cos(S.t*1.6+i*2)*20;
    if(h.bite>0){h.bite-=dt;h.x+=(h.tx-h.x)*Math.min(1,dt*10);h.y+=(h.ty-h.y)*Math.min(1,dt*10)}else{h.x+=(hx-h.x)*dt*4;h.y+=(hy-h.y)*dt*4}})},
  moves:[
   // mordisco: el aviso te sigue y se fija 0,35 s antes
   {ph:1,cd:1.9,f(b,f,dm){const p=S.p,z=TG.circle(p.x,p.y-20,80,.9*f+.25,32*dm,'#ff6a3c',{track:.35,trackY:1});
    S.sch.push({t:.9*f+.25,en:1,f:()=>{const h=b.heads[Math.random()*3|0];h.tx=z.x;h.ty=z.y;h.bite=.5}})}},
   {ph:1,cd:2.4,f(b,f,dm){for(let i=-1;i<=1;i++){const T=1.1,dx=S.p.x+i*120-b.x,dy=S.p.y-(b.y-150);
    fxProj({x:b.x,y:b.y-150,vx:dx/T,vy:(dy-.5*G*T*T)/T,gm:1,dmg:20*dm,r:9,life:3,hostile:1,col:'#b4ff3c',src:b,zone:{r:55,life:4,dot:1,hostile:1,dmg:8*dm,col:'#b4ff3c'}})}}},
   // barrido bajo: hay que saltar (esquivar a ciegas no basta: dura más que tu invulnerabilidad)
   {ph:2,cd:3,f(b,f,dm){TG.rect(b.x-1000,FLOOR-60,2000,60,1.1*f+.2,30*dm,'#ffb13c',{life:.5,sweep:1});say('¡Salta!')}},
   {ph:3,cd:3.4,f(b,f,dm){for(let i=0;i<3;i++)S.sch.push({t:i*.4,en:1,f:()=>{const p=S.p,z=TG.circle(p.x,p.y-20,75,.75,28*dm,'#ff3c1a',{track:.3,trackY:1});
    S.sch.push({t:.75,en:1,f:()=>{const h=b.heads[i];h.tx=z.x;h.ty=z.y;h.bite=.5}})}})}}],
  onPhase(b,np){if(np===2)S.lava=1},
  draw(e){c.fillStyle=e.flash>0?'#fff':'#5a2010';c.beginPath();c.ellipse(e.x,e.y-30,e.w/2,40,0,Math.PI,0);c.fill();
   for(const h of e.heads){c.strokeStyle='#ff6a3c';c.lineWidth=10;c.beginPath();c.moveTo(e.x,e.y-50);c.quadraticCurveTo(e.x,h.y+40,h.x,h.y);c.stroke();
    c.fillStyle=e.flash>0?'#fff':h.bite>0?'#ffd23c':'#ff6a3c';c.beginPath();c.arc(h.x,h.y,20,0,6.283);c.fill();c.fillStyle='#000';c.fillRect(h.x-8,h.y-4,16,5)}
   c.shadowBlur=0}},

 /* ---------- 3. REINA ESPECTRAL (Necrópolis Espectral) ---------- */
 queen:{name:'Reina Espectral',hp:3600,stagMax:340,dmg:30,xp:550,color:'#c8d2ff',w:80,h:120,y:220,stunY:380,
  phaseMsg:{2:'¡FASE 2! El Juicio: solo la luz te protege',3:'¡FASE 3! La necrópolis se desvanece bajo tus pies'},
  init(b){b.tx=b.x=S.tp.x;b.ty=220},
  move(b,dt){b.x+=(b.tx-b.x)*dt*2;b.y+=(b.ty+Math.sin(S.t*2)*10-b.y)*dt*2},
  // La Mirada: mientras el ojo está abierto, moverte (andar, saltar o esquivar) duele. Castiga el pánico.
  tick(b,dt){const g=b.gaze;if(!g)return;g.warn-=dt;if(g.warn>0)return;g.act-=dt;g.tk-=dt;const p=S.p;
   if(g.tk<=0&&(Math.abs(p.vx)>40||p.dash||p.vy<-60)){  // caer no cuenta: solo lo voluntario
   g.tk=.35;bolt(b.x,b.y-b.h*.7,p.x,p.y-20,'#c8d2ff',3);hurtP(b.dmg*.6*dmgScale(),b)}
   if(g.act<=0)b.gaze=null},
  stunned(b){b.gaze=null},
  moves:[
   {ph:1,cd:2.2,f(b,f,dm){[-240,-120,0,120,240].sort(()=>Math.random()-.5).forEach((o,i)=>S.sch.push({t:i*.12,en:1,f:()=>TG.rect(S.p.x+o-30,0,60,FLOOR,.9*f+.2,24*dm,'#c8d2ff',{life:.25})}))}},
   {ph:1,cd:3.6,f(b){b.gaze={warn:1.3,act:1.6,tk:0};say('¡LA REINA TE MIRA! No te muevas')}},
   {ph:1,cd:1.6,f(b){burst(b.x,b.y-60,20,'#c8d2ff',300,3);b.tx=clamp(S.p.x+R(-1,1)*320,150,WORLD-150);b.ty=R(170,260);b.x=b.tx;burst(b.x,b.y-60,20,'#c8d2ff',300,3)}},
   // Juicio: todo el escenario es letal salvo dos círculos de luz
   {ph:2,cd:4.6,f(b,f,dm){const p=S.p,safe=[-1,1].map(s=>({x:clamp(p.x+s*R(140,300),80,WORLD-80),y:FLOOR-40,r:90}));
    TG.rect(0,0,WORLD,FLOOR+60,1.7*f+.3,40*dm,'#05000a',{safe,life:.3});say('¡JUICIO! Busca la luz')}},
   {ph:2,cd:3.6,f(b){for(let i=0;i<3;i++)spawnEnemy('phantom',b.x+R(-150,150),b.y,1)}},
   // Guadaña Espectral: barrido a la altura de tu torso; hay que cambiar de altura (con las plataformas parpadeando)
   {ph:3,cd:3.2,f(b,f,dm){const s=Math.random()<.5?-1:1,y=S.p.y-S.p.h/2-25;TG.rect(s<0?WORLD:-160,y,160,50,.9,32*dm,'#c8d2ff',{vx:-s*700,life:4,sweep:1});say('¡Guadaña Espectral!')}}],
  onPhase(b,np){if(np===3)for(const q of PLAT)if(!q.solid&&!(S.tp.y===q.y&&S.tp.x>q.x&&S.tp.x<q.x+q.w))q.bl=3},
  // cuerpo oscuro translúcido con borde luminoso: relleno claro + bloom la volvía una mancha blanca
  draw(e){const cx=e.x,top=e.y-e.h,gr=c.createLinearGradient(0,top,0,e.y);gr.addColorStop(0,'#3b3070ee');gr.addColorStop(1,'#140f2a22');
   c.fillStyle=e.flash>0?'#fff':gr;c.strokeStyle='#c8d2ff';c.lineWidth=2.5;
   c.beginPath();c.moveTo(cx-14,top+30);c.lineTo(cx+14,top+30);c.lineTo(cx+40,e.y);  // dobladillo deshilachado
   for(let i=1;i<8;i++)c.lineTo(cx+40-i*10,e.y-(i%2?14+6*Math.sin(S.t*4+i):0));c.lineTo(cx-40,e.y);c.closePath();c.fill();c.stroke();
   c.beginPath();c.arc(cx,top+22,18,0,6.283);c.fill();c.stroke();c.fillStyle='#ffd23c';for(let k=-1;k<=1;k++){c.beginPath();c.moveTo(cx+k*10-5,top+6);c.lineTo(cx+k*10,top-8);c.lineTo(cx+k*10+5,top+6);c.fill()}
   const g=e.gaze,open=g&&g.warn<=0;c.fillStyle=open?'#ff3c6a':g?'#ffd23c':'#c8d2ff';c.beginPath();c.ellipse(cx,top+22,open?9:7,open?7:2,0,0,6.283);c.fill();
   if(g){c.fillStyle=open?'#ff3c6a':'#ffd23c';c.font='bold 14px monospace';c.textAlign='center';c.fillText(open?'👁 NO TE MUEVAS':'👁 …',cx,top-20)}c.shadowBlur=0}},

 /* ---------- 4. LEVIATÁN DE DATOS (Abismo Digital) ---------- */
 leviathan:{name:'Leviatán de Datos',hp:4200,stagMax:380,dmg:34,xp:650,color:'#3cf0ff',w:80,h:80,y:FLOOR+220,stunY:FLOOR-60,
  phaseMsg:{2:'¡FASE 2! El suelo se rompe en pedazos: cuidado con los abismos',3:'¡FASE 3! El Leviatán se enrosca y todo se mueve'},
  init(b){b.hidden=1;b.up=0;b.trail=[]},
  move(b,dt){if(b.up>0){b.up-=dt;b.hidden=0;b.y+=(FLOOR-90+Math.sin(S.t*3)*20-b.y)*dt*5;b.x+=Math.sin(S.t*1.5)*60*dt;if(b.up<=0)b.hidden=1}
   else b.y+=(FLOOR+220-b.y)*dt*4;
   b.trail.unshift({x:b.x,y:b.y});if(b.trail.length>14)b.trail.pop()},
  stunned(b,dt){b.hidden=0;b.up=Math.max(b.up,.5);b.y+=(b.def.stunY-b.y)*dt*3},
  moves:[
   // Erupción: el aviso te sigue y el Leviatán emerge allí; queda expuesto 2,4 s
   {ph:1,cd:3.2,f(b,f,dm){const w=1.2*f+.3,z=TG.slam(S.p.x,110,w,34*dm,'#3cf0ff',.4);
    S.sch.push({t:w,en:1,f:()=>{b.x=z.x;b.y=FLOOR-40;b.up=2.4;b.hidden=0;burst(b.x,FLOOR,40,'#3cf0ff',500,4);S.shake=16}})}},
   // Ola de datos que barre el suelo de lado a lado: hay que saltarla
   {ph:1,cd:3.6,f(b,f,dm){const s=Math.random()<.5?-1:1,x0=s<0?WORLD:-140;TG.rect(x0,FLOOR-90,140,90,.9,30*dm,'#1ab4ff',{vx:-s*650,life:4.2,sweep:1});say('¡Ola de datos!')}},
   {ph:2,cd:3,f(b,f,dm){for(let i=0;i<10;i++){const x=clamp(S.p.x+R(-420,420),20,WORLD-20);S.sch.push({t:i*.08,en:1,f:()=>TG.circle(x,FLOOR-30,40,1,18*dm,'#3cf0ff')})}}},
   {ph:3,cd:3.8,f(b,f,dm){b.x=clamp(S.p.x+R(-300,300),200,WORLD-200);b.y=FLOOR-90;b.up=3;b.hidden=0;
    for(let k=0;k<3;k++)S.sch.push({t:.6+k*.6,en:1,f:()=>TG.nova(b.x,b.y-40,16,260,16*dm,7,b)})}}],
  drawHidden(e){if(Math.random()<.3)spark(e.x+R(-40,40),FLOOR-2,0,-80,.4,'#3cf0ff',3)},
  draw(e){for(let i=e.trail.length-1;i>=0;i--){const t=e.trail[i];c.fillStyle=i?`rgba(60,240,255,${.6-i*.035})`:(e.flash>0?'#fff':'#3cf0ff');c.beginPath();c.arc(t.x,t.y-40,34-i*1.6,0,6.283);c.fill()}
   c.fillStyle='#000';c.fillRect(e.x-14,e.y-50,8,8);c.fillRect(e.x+6,e.y-50,8,8);c.shadowBlur=0}},

 /* ---------- 5. ARCONTE DE LA TEMPESTAD (Núcleo de la Tempestad) ---------- */
 archon:{name:'Arconte de la Tempestad',hp:5200,stagMax:420,dmg:36,xp:900,color:'#ffd23c',w:100,h:100,y:230,stunY:360,
  phaseMsg:{2:'¡FASE 2! La tormenta se desata',3:'¡FASE 3! Las paredes del Núcleo se cierran'},
  init(b){b.mirror=0;
   // Eco de Pánico: mientras dura, cada esquiva tuya provoca un golpe donde aterrizas
   Ev.on('onDash',()=>{if(b.mirror>0&&!b.dead)S.sch.push({t:.12,en:1,f:()=>TG.circle(S.p.x,S.p.y-20,80,.5,b.dmg*.8*dmgScale(),'#ffd23c')})})},
  move(b,dt){b.x+=(WORLD/2+Math.sin(S.t*.4)*500-b.x)*dt;b.y+=(230+Math.sin(S.t*1.3)*20-b.y)*dt*2;b.ang+=dt*(.6+b.ph*.4)},
  tick(b,dt){b.mirror-=dt},
  stunned(b){b.mirror=0},
  moves:[
   {ph:1,cd:4.2,f(b,f,dm){const off=R(0,1.57),rot=(Math.random()<.5?-1:1)*(.45+.15*b.ph);for(let k=0;k<4;k++)TG.line(b.x,b.y-50,off+k*1.5708,1500,26,1.1,3,26*dm,'#ffd23c',rot)}},
   {ph:1,cd:3.4,f(b){b.mirror=3.5;say('¡Eco de Pánico! Cada esquiva será castigada')}},
   {ph:1,cd:2.4,f(b,f,dm){for(let i=0;i<3;i++){const a=-1.57+(i-1)*.7;fxProj({x:b.x,y:b.y-50,vx:Math.cos(a)*200,vy:Math.sin(a)*200,dmg:22*dm,r:12,life:4.5,hostile:1,homeP:1,col:'#ffd23c',src:b})}}},
   {ph:2,cd:2.8,f(b,f,dm){for(let i=0;i<6;i++)S.sch.push({t:i*.3,en:1,f:()=>TG.circle(S.p.x,S.p.y-20,70,.8,24*dm,'#bfe4ff',{track:.3,trackY:1})})}},
   {ph:3,cd:3,f(b,f,dm){TG.nova(b.x,b.y-50,24,280,18*dm,8,b);TG.slam(S.p.x,110,1,30*dm,'#ffd23c',.3)}}],
  onPhase(b,np){if(np===3)S.walls={l:0,r:WORLD,cx:clamp(S.p.x,500,WORLD-500)}},
  draw(e){const cx=e.x,cy=e.y-e.h/2;c.save();c.translate(cx,cy);
   for(let i=0;i<2;i++){c.save();c.rotate(e.ang*(i?-1.4:1));c.strokeStyle=i?'#ff3cf2':'#ffd23c';c.lineWidth=4;c.beginPath();c.arc(0,0,58-i*14,0,4.4);c.stroke();c.restore()}
   for(let k=0;k<4;k++){const a=e.ang*2+k*1.5708;c.fillStyle='#ffd23c';c.beginPath();c.arc(Math.cos(a)*75,Math.sin(a)*75,7,0,6.283);c.fill()}
   c.fillStyle=e.flash>0?'#fff':e.mirror>0?'#ff3cf2':'#ffd23c';c.beginPath();c.arc(0,0,24,0,6.283);c.fill();c.fillStyle='#000';c.fillRect(-12,-3,24,6);c.restore();
   if(e.mirror>0){c.fillStyle='#ff3cf2';c.font='bold 13px monospace';c.textAlign='center';c.fillText('ECO DE PÁNICO',cx,cy-90)}c.shadowBlur=0}}
};

function spawnBoss(id,o){o=o||{};
 const def=BOSSES[id||STAGE.boss],hp=def.hp*hpScale()*(o.hp||1);
 const b={type:'boss',boss:1,bid:id||STAGE.boss,def,d:def,x:S.tp?S.tp.x:WORLD/2,y:def.y,w:def.w,h:def.h,vx:0,vy:0,hp,maxHp:hp,stag:0,stagMax:def.stagMax,stun:0,t:2,ph:1,flash:0,slowT:0,markT:0,aff:[],ang:0,dmg:def.dmg};
 if(def.init)def.init(b);if(o.dx){b.x=clamp(b.x+o.dx,150,WORLD-150);if(b.tx!==undefined)b.tx=b.x}
 S.bosses.push(b);S.boss=S.bosses[0];S.en.push(b);say(`¡${def.name.toUpperCase()} HA DESPERTADO!`);S.shake=22;Snd.play('boss');
}
// núcleo común: ruptura de guardia → aturdido; si no, se mueve y elige un ataque del repertorio de su fase
function bossAI(b,dt){
 const D=b.def;
 if(b.stun>0){b.stun-=dt;if(D.stunned)D.stunned(b,dt);else b.y+=(D.stunY-b.y)*dt*3;return}
 D.move(b,dt);if(D.tick)D.tick(b,dt);
 if(D.contact&&!b.hidden){const p=S.p;if(Math.abs(b.x-p.x)<b.w/2&&Math.abs(b.y-b.h/2-(p.y-20))<b.h/2+20)hurtP(b.dmg*dmgScale()*.6,b)}
 b.t-=dt;if(b.t>0)return;
 const f=[0,1,.82,.65][b.ph],pool=bossPool(b,b.ph+(S.p.items.voidpact?1:0));  // Contrato del Vacío: ataques de la fase siguiente
 let r=Math.random()*pool.reduce((a,m)=>a+(m.w||1),0),m=pool[0];for(const x of pool){r-=x.w||1;if(r<=0){m=x;break}}
 m.f(b,f,dmgScale());b.t=m.cd*f+.4;
}
