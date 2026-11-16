'use strict';
/* ===================== HABILIDADES =====================
   Biblioteca de tipos: AB[t](jugador, datos, ánguloDeApuntado, carga0a1).
   Los personajes (data_characters.js) solo eligen `t` y parámetros. */
function spawnPr(o){o.col=o.col||S.ch.color;return fxProj(o)}
const aimPt=()=>({x:clamp(mouse.x+S.cam,0,WORLD),y:clamp(mouse.y,20,FLOOR)});
function nearest(x,y,maxd,skip){let b=null,bd=maxd;for(const e of S.en){if(e.dead||(skip&&skip.has(e)))continue;const d=hyp(e.x-x,e.y-e.h/2-y);if(d<bd){bd=d;b=e}}return b}
const inR=(x,y,r)=>S.en.filter(e=>!e.dead&&hyp(e.x-x,e.y-e.h/2-y)<r+e.w/2);
const count=k=>S.dr.filter(m=>m.k===k&&m.life>0);
function blinkTo(p,x,y){burst(p.x,p.y-20,16,S.ch.color,300,3);p.x=clamp(x,20,WORLD-20);p.y=clamp(y,60,FLOOR);p.vy=0;burst(p.x,p.y-20,16,S.ch.color,300,3)}
// claves de datos que se copian tal cual al proyectil
const PK=['dmg','r','life','pierce','home','gm','bounce','wb','ret','split','grow','dotK','dps','dur','mark','stun','hook','pull','ls','boom','zone','col'];

const AB={
 /* ---------- cuerpo a cuerpo ---------- */
 melee(p,d,a,f,o){const cy=p.y-p.h/2;let n=0;
  for(const e of S.en){if(e.dead)continue;const dx=e.x-p.x,dy=e.y-e.h/2-cy;
   if(hyp(dx,dy)<d.range+e.w/2){const da=Math.abs(((Math.atan2(dy,dx)-a+Math.PI*3)%(Math.PI*2))-Math.PI);
    if(da<d.arc/2){hurtE(e,d.dmg,o);n++;if(d.stun)stunE(e,d.stun);if(!e.boss)e.vx+=Math.cos(a)*(d.kb||260)}}}
  for(let i=0;i<9;i++){const an=a-d.arc/2+d.arc*i/8;spark(p.x+Math.cos(an)*d.range*.8,cy+Math.sin(an)*d.range*.8,Math.cos(an)*60,Math.sin(an)*60,.18,S.ch.color,6)}
  p.vx+=Math.cos(a)*90;
  if(d.repair&&n)for(const m of count('turret'))m.life+=d.repair*n;
  return n},
 combo(p,d,a){if(p.comboT<=0)p.combo=0;p.combo=p.combo%3+1;p.comboT=.8;
  if(p.combo<3)return AB.melee(p,d,a);
  p.dash={t:.1,vx:sgn(Math.cos(a))*900,vy:0,dmg:0,hit:new Set()};S.shake=Math.max(S.shake,5);
  AB.melee(p,{dmg:d.dmg*2.5,range:d.range*1.25,arc:d.arc,kb:500},a,0,CRIT)},
 hammer(p,d,a,f){const k=1+2*f;AB.melee(p,{dmg:d.dmg*k,range:d.range*(.7+.6*f),arc:d.arc,kb:300*k},a);S.shake=Math.max(S.shake,3*k);
  if(f>=1){const x0=p.x,dir=sgn(Math.cos(a));for(let i=1;i<=3;i++)S.sch.push({t:i*.1,f:()=>{const x=x0+dir*i*100;aoe(x,FLOOR-30,70,d.dmg*1.5);ring(x,FLOOR-10,70,S.ch.color,.3)}})}},
 /* ---------- proyectiles ---------- */
 proj(p,d,a){const n=d.n||1,x=p.x,y=p.y-p.h/2;
  const fire=()=>{for(let i=0;i<n;i++){const an=a+(i-(n-1)/2)*(d.spread||0)+R(-.02,.02),o={x,y,vx:Math.cos(an)*d.spd,vy:Math.sin(an)*d.spd};
   for(const k of PK)if(d[k]!==undefined)o[k]=d[k];o.t0=o.life||1;spawnPr(o)}};
  fire();if(d.echo)S.sch.push({t:d.echo,f:()=>{fire();ring(x,y,30,S.ch.color,.2)}});
  S.shake=Math.max(S.shake,d.pierce?3:.8)},
 ringshot(p,d){for(let i=0;i<d.n;i++){const an=i*6.283/d.n;spawnPr({x:p.x,y:p.y-p.h/2,vx:Math.cos(an)*d.spd,vy:Math.sin(an)*d.spd,dmg:d.dmg,r:d.r,life:d.life,pierce:1})}ring(p.x,p.y-20,60,S.ch.color,.3)},
 snipe(p,d,a,f){const full=f>=1;spawnPr({x:p.x,y:p.y-p.h/2,vx:Math.cos(a)*d.spd,vy:Math.sin(a)*d.spd,dmg:d.dmg*(1+3*f),r:3+4*f,life:.6,pierce:full?99:0,crit:full?1:0,col:full?'#fff':S.ch.color});
  S.shake=Math.max(S.shake,1+6*f);if(full)ring(p.x,p.y-20,50,'#fff',.2)},
 chain(p,d,a){const pt=aimPt();let e=null,bd=1e9;
  for(const t of S.en){if(t.dead||hyp(t.x-p.x,t.y-t.h/2-p.y)>d.range)continue;const dd=hyp(t.x-pt.x,t.y-t.h/2-pt.y);if(dd<bd){bd=dd;e=t}}
  let fx=p.x,fy=p.y-p.h/2;const hit=new Set();
  if(!e){bolt(fx,fy,fx+Math.cos(a)*120,fy+Math.sin(a)*120,S.ch.color,2);return}
  for(let j=0;j<=d.jumps&&e;j++){bolt(fx,fy,e.x,e.y-e.h/2,S.ch.color,2);hurtE(e,d.dmg*(j?.8:1));hit.add(e);fx=e.x;fy=e.y-e.h/2;e=nearest(fx,fy,220,hit)}},
 beam(p,d,a){const r=d.range*(p.buf.void?1.5:1),x1=p.x,y1=p.y-p.h/2,x2=x1+Math.cos(a)*r,y2=y1+Math.sin(a)*r;
  for(const e of S.en)if(!e.dead&&segD(e.x,e.y-e.h/2,x1,y1,x2,y2)<e.w/2+10)hurtE(e,d.dmg);
  bolt(x1,y1,x2,y2,p.buf.void?'#d070ff':S.ch.color,p.buf.void?7:4,0,.09)},
 /* ---------- desplazamientos ---------- */
 dashHit(p,d,a){p.dash={t:.2,vx:sgn(Math.cos(a))*d.dist/.2,vy:0,dmg:d.dmg,hit:new Set(),reset:d.reset}},
 dash(p,d){const dir=(keys.KeyD?1:0)-(keys.KeyA?1:0)||p.face;p.dash={t:.17,vx:dir*d.dist/.17,vy:0,dmg:0,hit:new Set()}},
 blink(p,d,a){blinkTo(p,p.x+Math.cos(a)*d.dist,p.y+Math.sin(a)*d.dist*.6);p.inv=Math.max(p.inv,.3)},
 boltDash(p,d,a){const x1=p.x,y1=p.y-20;blinkTo(p,p.x+Math.cos(a)*d.dist,p.y+Math.sin(a)*d.dist);p.inv=Math.max(p.inv,.3);
  for(const e of S.en)if(!e.dead&&segD(e.x,e.y-e.h/2,x1,y1,p.x,p.y-20)<e.w/2+30){hurtE(e,d.dmg);stunE(e,.5)}
  bolt(x1,y1,p.x,p.y-20,'#bfe4ff',4)},
 grapple(p,d){const pt=aimPt(),dx=pt.x-p.x,dy=pt.y-(p.y-20),l=hyp(dx,dy)||1,dist=Math.min(l,d.dist),t=dist/1400;
  p.dash={t,vx:dx/l*1400,vy:dy/l*1400,dmg:0,hit:new Set()};bolt(p.x,p.y-20,p.x+dx/l*dist,p.y-20+dy/l*dist,'#ccc',2,0,t+.05)},
 recoil(p,d,a){aoe(p.x,p.y-10,d.r,d.dmg);ring(p.x,p.y-10,d.r,'#ff7a1a',.3);burst(p.x,p.y,16,'#ffb13c',300,4);
  p.dash={t:.18,vx:-Math.cos(a)*d.pow,vy:-Math.sin(a)*d.pow,dmg:0,hit:new Set()};S.shake=Math.max(S.shake,6)},
 rocket(p,d){aoe(p.x,p.y-10,d.r,d.dmg);ring(p.x,p.y,d.r,S.ch.color,.3);burst(p.x,p.y,20,'#ffb13c',350,4);p.vy=-d.vy;p.ground=0;p.jumps=1;S.shake=Math.max(S.shake,8)},
 slam(p,d){p.slam={dmg:d.dmg,r:d.r};if(p.ground){p.vy=-620;p.ground=0}else p.vy=1500},
 leap(p,d){const pt=aimPt();p.vy=-720;p.vx=clamp(pt.x-p.x,-450,450)/.4;p.leapT=.6;p.ground=0;p.slam={dmg:d.dmg,r:d.r}},
 jetpack(p,d){buff('jet',d.time,{jet:1})},
 swap(p,d){const ws=count('walker');if(!ws.length)return AB.dash(p,{dist:160});
  const m=ws.reduce((a,b)=>hyp(b.x-p.x,b.y-p.y)>hyp(a.x-p.x,a.y-p.y)?b:a),x=p.x,y=p.y;blinkTo(p,m.x,m.y);m.x=x;m.y=y;m.vy=0;p.inv=Math.max(p.inv,.5)},
 rewind(p,d){const n=p.hist.length,h=p.hist[(p.hi-Math.round(d.back/.1)+n*2)%n];ring(p.x,p.y-20,50,S.ch.color,.3);
  blinkTo(p,h.x,h.y);if(h.hp>p.hp){txt(p.x,p.y-60,'+'+Math.round(h.hp-p.hp),'#4cff7a');heal(h.hp-p.hp)}p.inv=Math.max(p.inv,.4)},
 phase(p,d){buff('phase',d.time,{intang:1,spd:d.spd})},
 gate(p,d,a){const P=S.portal;if(!P.a)return AB.blink(p,{dist:200},a);
  if(!P.b){P.b={x:p.x,y:p.y-20};blinkTo(p,P.a.x,P.a.y+20)}
  else{const T=hyp(P.a.x-p.x,P.a.y-p.y)>hyp(P.b.x-p.x,P.b.y-p.y)?P.a:P.b;blinkTo(p,T.x,T.y+20)}p.inv=Math.max(p.inv,.3)},
 morph(p){p.form=p.form==='a'?'b':'a';if(p.form==='b')buff('beast',Infinity,{dmg:1.4,taken:1.3,ls:.05});else delete p.buf.beast;
  p.vy=-420;p.ground=0;for(const e of inR(p.x,p.y-20,150))if(!e.boss)e.vx+=sgn(e.x-p.x)*500;ring(p.x,p.y-20,150,p.form==='b'?'#2a8a1a':S.ch.color,.3);say(p.form==='b'?'Forma Bestia':'Forma Espinas')},
 /* ---------- áreas y estados ---------- */
 nova(p,d){ring(p.x,p.y-20,d.r,S.ch.color,.5);aoe(p.x,p.y-20,d.r,d.dmg);for(const e of S.en)if(!e.boss&&hyp(e.x-p.x,e.y-p.y)<d.r)e.vx+=sgn(e.x-p.x)*500;S.shake=18},
 zone(p,d){const {x,y}=aimPt();Z({x,y,r:d.r,warn:0,life:d.life,dot:1,slow:1,col:'#3cf0ff'});ring(x,y,d.r,'#3cf0ff',.4)},
 well(p,d){const {x,y}=aimPt();Z({x,y,r:d.r,life:d.life,dot:1,fdmg:d.dmg,pullZ:d.pull,col:'#7a6cff'});ring(x,y,d.r,'#7a6cff',.3)},
 blackhole(p,d){const {x,y}=aimPt();Z({x,y,r:d.r,life:d.life,dot:1,fdmg:d.dmg,pullZ:d.pull,col:'#3a1a8a',
  end:z=>{const n=inR(z.x,z.y,z.r).length;aoe(z.x,z.y,z.r*.7,d.boom*(n+1));ring(z.x,z.y,z.r,'#fff',.5);burst(z.x,z.y,40,'#7a6cff',600,4);S.shake=20;hitStop(50)}});say('Horizonte de Sucesos')},
 static(p,d){for(const e of inR(p.x,p.y-20,d.r)){hurtE(e,d.dmg);stunE(e,d.stun);bolt(p.x,p.y-20,e.x,e.y-e.h/2,'#bfe4ff',2)}ring(p.x,p.y-20,d.r,'#bfe4ff',.3)},
 hemorrhage(p,d){for(const e of inR(p.x,p.y-20,d.r))applyDot(e,'bleed',d.dps,d.dur);ring(p.x,p.y-20,d.r,'#ff1f4b',.4);burst(p.x,p.y-20,30,'#ff1f4b',400,4)},
 quake(p,d){const x0=p.x;for(let i=1;i<=d.n;i++)S.sch.push({t:i*.14,f:()=>{for(const sd of [-1,1]){const x=x0+sd*i*110;aoe(x,FLOOR-30,75,d.dmg);ring(x,FLOOR-10,75,S.ch.color,.3);burst(x,FLOOR,10,'#ffb13c',300,4)}S.shake=Math.max(S.shake,8)}})},
 rift(p,d,a){for(let i=0;i<d.n;i++){const r=60+i*70,x=p.x+Math.cos(a)*r,y=p.y-p.h/2+Math.sin(a)*r;S.sch.push({t:i*.06,f:()=>{Z({x,y,r:45,life:d.life,dot:1,fdmg:d.dmg,col:'#3cffd8'});ring(x,y,45,'#3cffd8',.25)}})}},
 portal(){S.portal.a=aimPt();ring(S.portal.a.x,S.portal.a.y,40,'#3cffd8',.3)},
 bloodstep(p,d,a){AB.blink(p,d,a);Z({x:p.x,y:p.y-10,r:70,life:4,dot:1,healZ:.06,col:'#ff1f4b'})},
 /* ---------- lluvia desde el cielo ---------- */
 barrage(p,d){const mx=aimPt().x;for(let i=0;i<d.n;i++)S.sch.push({t:i*.11,f:()=>spawnPr({x:clamp(mx+R(-220,220),10,WORLD-10),y:-20,vx:R(-40,40),vy:950,dmg:d.dmg,r:10,life:2,boom:90,col:'#ffb13c'})})},
 napalm(p,d){const mx=aimPt().x;for(let i=0;i<d.n;i++)S.sch.push({t:i*.12,f:()=>spawnPr({x:clamp(mx+(i-(d.n-1)/2)*95,10,WORLD-10),y:-20,vx:0,vy:900,dmg:d.dmg*2,r:9,life:2,boom:60,col:'#ff7a1a',
  zone:{y:FLOOR,r:60,life:5,dot:1,fdmg:d.dmg,col:'#ff7a1a'}})})},
 /* ---------- buffs ---------- */
 aegis(p,d){buff('aegis',d.time,{absorb:p.maxHp*d.pct,stored:0,end:b=>{if(b.stored>0){aoe(S.p.x,S.p.y-20,200,b.stored*3);ring(S.p.x,S.p.y-20,200,'#c8d2ff',.4);S.shake=12}}})},
 fortress(p,d){buff('fortress',d.time,{taken:d.taken,reflect:d.reflect});ring(p.x,p.y-20,120,'#ffd23c',.4);say('¡FORTALEZA!')},
 parry(p,d){buff('parry',d.time,{onHurt:()=>{delete p.buf.parry;p.inv=1;aoe(p.x,p.y-20,d.r,d.dmg,CRIT);ring(p.x,p.y-20,d.r,'#fff',.3);hitStop(60);txt(p.x,p.y-70,'¡PARADA!','#fff');return true}})},
 flurry(p,d){const tg=inR(p.x,p.y-20,d.r).slice(0,d.n);p.inv=Math.max(p.inv,tg.length*.09+.4);
  tg.forEach((e,i)=>S.sch.push({t:i*.09,f:()=>{if(e.dead)return;blinkTo(p,e.x-sgn(e.x-p.x)*30,e.y);hurtE(e,d.dmg,CRIT);ring(e.x,e.y-e.h/2,50,S.ch.color,.2)}}))},
 freeze(p,d){S.freeze=d.time;ring(p.x,p.y-20,700,'#bff',.7);S.shake=10;say('¡TIEMPO DETENIDO!')},
 storm(p,d){buff('storm',d.time,{every:d.every,tick:()=>{const tg=inR(p.x,p.y-20,520);if(!tg.length)return;const e=tg[Math.random()*tg.length|0];
  bolt(e.x+R(-30,30),-10,e.x,e.y-e.h/2,'#bfe4ff',3,14,.2);hurtE(e,d.dmg);stunE(e,.3);S.shake=Math.max(S.shake,3)}})},
 orbital(p,d){buff('orbital',d.time+.8,{warm:.8,bx:aimPt().x,every:.1,
  tick:(b,dt)=>{b.bx+=clamp(aimPt().x-b.bx,-30,30);if(b.warm>0){b.warm-=dt;return}for(const e of S.en)if(!e.dead&&Math.abs(e.x-b.bx)<45)hurtE(e,d.dmg)},
  draw:b=>{const w=b.warm>0?4:40+Math.sin(S.t*40)*6;c.globalAlpha=b.warm>0?.5:.75;glow('#9aff3c',20);c.fillStyle=b.warm>0?'#9aff3c':'#eaffd0';c.fillRect(b.bx-w/2,0,w,FLOOR);c.globalAlpha=1;c.shadowBlur=0}})},
 rewindLoop(p,d){const b=buff('loop',d.time,{rec:new Map(),draw:()=>{c.strokeStyle='#f0f0ff';c.lineWidth=1;c.beginPath();c.arc(p.x,p.y-20,30+Math.sin(S.t*10)*4,0,6.283);c.stroke()}});
  b.onDeal=(e,dm,o)=>{if(!o.raw)b.rec.set(e,(b.rec.get(e)||0)+dm)};
  b.end=()=>{for(const [e,v] of b.rec)if(!e.dead){hurtE(e,v,RAW);ring(e.x,e.y-e.h/2,40,'#f0f0ff',.3)}say('¡Bucle cerrado!')};say('Bucle Temporal: registrando…')},
 antigrav(p,d){buff('antigrav',d.time,{grav:d.g});p.jumps=0},
 cocoon(p,d){p.vx=0;buff('cocoon',d.time,{root:1,intang:1,tick:(b,dt)=>heal(p.maxHp*d.heal/d.time*dt)})},
 pact(p,d){buff('pact',d.time,{dmg:d.dmg,drain:d.drain,killheal:d.killheal,draw:()=>{c.fillStyle='#ff1f4b33';c.beginPath();c.arc(p.x,p.y-20,40,0,6.283);c.fill()}});say('Pacto Carmesí')},
 warcry(p,d){buff('warcry',d.time,{as:d.as,spd:1.3});ring(p.x,p.y-20,140,'#ff3c1a',.4);say('¡GRITO DE GUERRA!')},
 lastbreath(p,d){const b=buff('lb',d.time,{floor:1,dealt:0,draw:()=>{c.strokeStyle='#ffd23c';c.lineWidth=2;c.strokeRect(p.x-18,p.y-48,36,52)}});
  b.onDeal=(e,dm)=>{b.dealt+=dm};b.end=()=>{const h=b.dealt*.3;heal(h);txt(p.x,p.y-60,'+'+Math.round(h),'#4cff7a')};say('Último Aliento')},
 voidstep(p,d){buff('vstep',d.time,{intang:1,noatk:1,spd:d.spd})},
 surrender(p,d){enterVoid(d.time)},
 primal(p,d){buff('primal',d.time,{both:1,taken:1/1.3,end:()=>buff('exhaust',3,{spd:.7})});ring(p.x,p.y-20,160,S.ch.color,.4);say('¡FORMA PRIMORDIAL!')},
 /* ---------- invocaciones ---------- */
 summon(p,d){for(let i=0;i<d.n;i++){const o=count('orbit');if(o.length>=8)o[0].life=0;S.dr.push({k:'orbit',a:R(0,6.28),life:d.life,cd:0,dmg:d.dmg,x:p.x,y:p.y})}ring(p.x,p.y-20,80,S.ch.color,.4)},
 raise(p,d){for(let i=0;i<d.n;i++){const o=count('walker');if(o.length>=d.max)o[0].life=0;
  S.dr.push({k:'walker',x:p.x+R(-30,30),y:p.y,vx:0,vy:0,w:16,h:20,life:d.life,dmg:d.dmg,cd:0,ground:0})}ring(p.x,p.y-20,80,S.ch.color,.3)},
 sacrifice(p,d){for(const m of count('walker')){aoe(m.x,m.y-10,d.r,d.dmg);ring(m.x,m.y-10,d.r,S.ch.color,.3);burst(m.x,m.y-10,14,S.ch.color,300,4);m.life=0}
  S.shake=Math.max(S.shake,10);AB.raise(p,Object.assign({},S.ch.secondary,{n:3}))},
 turret(p,d){const o=count('turret').filter(m=>!m.big);if(o.length>=d.max)o[0].life=0;S.dr.push({k:'turret',x:p.x,y:p.ground?p.y:FLOOR,life:d.life,dmg:d.dmg,rate:d.rate,cd:0})},
 siege(p,d){S.dr.push({k:'turret',big:1,x:p.x,y:p.ground?p.y:FLOOR,life:d.life,dmg:d.dmg,rate:d.rate,cd:0});say('Torre de Asedio desplegada')},
 mine(p,d){const o=count('mine');if(o.length>=d.max)o[0].life=0;S.dr.push({k:'mine',x:p.x,y:p.ground?p.y:FLOOR,life:60,dmg:d.dmg,r:d.r,arm:.5})},
 bees(p,d){for(let i=0;i<d.n;i++)S.dr.push({k:'bee',x:p.x,y:p.y-30,vx:R(-250,250),vy:-250,life:6,dmg:d.dmg,r:d.r,dps:d.dps})},
 queen(p,d){for(const m of count('queen'))m.life=0;S.dr.push({k:'queen',a:0,x:p.x,y:p.y-80,life:d.life,dmg:d.dmg,cd:0});say('¡La Reina Colmena despierta!')}
};

function ab(slot){const d=S.ch[SLOT[slot]];return d.forms?d.forms[S.p.form]:d}
function cast(slot,f){
 const p=S.p,d=ab(slot),base=S.ch[SLOT[slot]];
 if(d.cost)p.hp=Math.max(1,p.hp*(1-d.cost));
 if(d.costMax){p.hp=Math.max(1,p.hp-p.maxHp*d.costMax);txt(p.x,p.y-56,'-'+Math.round(p.maxHp*d.costMax),'#ff1f4b')}
 AB[d.t](p,d,p.aim,f||0);
 if(base.forms&&slot!=='m'&&bany('both')){const o=base.forms[p.form==='a'?'b':'a'];AB[o.t](p,o,p.aim,0)}
 Ev.emit('onCast',slot);if(slot==='m')Ev.emit('onDash');
 p.cd[slot]=slot==='p'?d.cd/(p.m.as*bm('as')):d.cd*(1-p.m.cdr);
}
const maxCd=(slot,d)=>slot==='p'?d.cd/(S.p.m.as*bm('as')):d.cd*(1-S.p.m.cdr);

/* ===================== PASIVAS ===================== */
function enterVoid(t){const p=S.p;p.corr=100;buff('void',t,{dmg:1.8,taken:1.5,drain:.03,tick:b=>{p.corr=100*Math.max(0,b.t)/t},end:()=>{p.corr=0}});
 ring(p.x,p.y-20,200,'#9b30ff',.5);S.shake=12;say('¡FORMA DEL VACÍO!')}
const PASSIVES={
 rage(p){buff('rage',Infinity,{dmg:()=>1+Math.max(0,1-S.p.hp/S.p.maxHp),taken:1.2})},
 corrupt(p,cfg){Ev.on('onKill',()=>{if(p.buf.void)return;p.corr=Math.min(100,p.corr+cfg.perKill);if(p.corr>=100)enterVoid(cfg.time)})}
};

/* ===================== ESBIRROS ===================== */
const MIN={
 orbit:{upd(m,dt){const p=S.p;m.life-=dt;m.a+=dt*2.5;m.x=p.x+Math.cos(m.a)*55;m.y=p.y-50+Math.sin(m.a)*22;m.cd-=dt;
   if(m.cd<=0){const b=nearest(m.x,m.y,520);if(b){m.cd=.6;const an=Math.atan2(b.y-b.h/2-m.y,b.x-m.x);spawnPr({x:m.x,y:m.y,vx:Math.cos(an)*900,vy:Math.sin(an)*900,dmg:m.dmg,r:4,life:.7,col:'#4cff9a'})}}},
  draw(m){glow('#4cff9a');c.fillStyle='#4cff9a';c.beginPath();c.moveTo(m.x,m.y-7);c.lineTo(m.x+7,m.y);c.lineTo(m.x,m.y+7);c.lineTo(m.x-7,m.y);c.fill()}},
 walker:{upd(m,dt){const p=S.p;m.life-=dt;m.cd-=dt;const e=nearest(m.x,m.y-10,700),tx=e?e.x:p.x-p.face*40;
   m.vx+=(clamp(tx-m.x,-1,1)*(Math.abs(tx-m.x)>20?260:0)-m.vx)*Math.min(1,10*dt);
   if(e&&m.ground&&e.y<m.y-80)m.vy=-650;phys(m,dt);
   if(e&&m.cd<=0&&Math.abs(e.x-m.x)<e.w/2+18&&Math.abs(e.y-e.h/2-(m.y-10))<e.h/2+30){m.cd=.5;hurtE(e,m.dmg);spark(e.x,e.y-e.h/2,0,-40,.2,'#b07aff',6)}},
  draw(m){glow('#b07aff',10);c.fillStyle='#b07aff';c.fillRect(m.x-8,m.y-20,16,20);c.shadowBlur=0;c.fillStyle='#000';c.fillRect(m.x-5,m.y-16,3,3);c.fillRect(m.x+2,m.y-16,3,3)}},
 turret:{upd(m,dt){m.life-=dt;m.cd-=dt;if(m.cd>0)return;const b=nearest(m.x,m.y-20,m.big?800:600);if(!b)return;m.cd=m.rate;
   const an=Math.atan2(b.y-b.h/2-(m.y-24),b.x-m.x);m.an=an;
   spawnPr(m.big?{x:m.x,y:m.y-50,vx:Math.cos(an)*600,vy:Math.sin(an)*600-200,dmg:m.dmg,r:7,life:1.6,home:1,boom:70,col:'#ffb84d'}:{x:m.x,y:m.y-24,vx:Math.cos(an)*1000,vy:Math.sin(an)*1000,dmg:m.dmg,r:4,life:.7,col:'#ffe08a'})},
  draw(m){const s=m.big?2:1;glow('#ffb84d',12);c.fillStyle='#5a4020';c.fillRect(m.x-12*s,m.y-14*s,24*s,14*s);c.strokeStyle='#ffe08a';c.lineWidth=4*s;c.beginPath();c.moveTo(m.x,m.y-20*s);
   c.lineTo(m.x+Math.cos(m.an||0)*20*s,m.y-20*s+Math.sin(m.an||0)*20*s);c.stroke();if(m.life<3&&Math.floor(S.t*8)%2){c.fillStyle='#f44';c.fillRect(m.x-3,m.y-30*s,6,4)}}},
 mine:{upd(m,dt){m.life-=dt;m.arm-=dt;if(m.arm>0)return;
   if(nearest(m.x,m.y-10,60)){aoe(m.x,m.y-10,m.r,m.dmg);ring(m.x,m.y-10,m.r,'#ff7a1a',.3);burst(m.x,m.y,18,'#ffb13c',350,4);S.shake=Math.max(S.shake,6);m.life=0}},
  draw(m){c.fillStyle=m.arm>0?'#666':(Math.floor(S.t*4)%2?'#ff3c1a':'#ffb070');glow('#ff7a1a',8);c.fillRect(m.x-8,m.y-5,16,5)}},
 bee:{upd(m,dt){const p=S.p;m.life-=dt;const e=nearest(m.x,m.y,700),tx=e?e.x:p.x,ty=e?e.y-e.h/2:p.y-60,a=Math.atan2(ty-m.y,tx-m.x);
   m.vx+=(Math.cos(a)*520-m.vx)*Math.min(1,4*dt);m.vy+=(Math.sin(a)*520-m.vy)*Math.min(1,4*dt);m.x+=m.vx*dt;m.y+=m.vy*dt;
   if(e&&hyp(tx-m.x,ty-m.y)<18){for(const t of inR(m.x,m.y,m.r)){hurtE(t,m.dmg);applyDot(t,'poison',m.dps,4)}ring(m.x,m.y,m.r,'#e6ff3c',.3);m.life=0}},
  draw(m){glow('#e6ff3c',8);c.fillStyle='#e6ff3c';c.beginPath();c.arc(m.x,m.y,5,0,6.283);c.fill();c.fillStyle='#222';c.fillRect(m.x-1,m.y-5,2,10)}},
 queen:{upd(m,dt){const p=S.p;m.life-=dt;m.a+=dt;m.x+=(p.x+Math.cos(m.a)*60-m.x)*Math.min(1,4*dt);m.y+=(p.y-110+Math.sin(m.a*2)*15-m.y)*Math.min(1,4*dt);m.cd-=dt;
   if(m.cd<=0){const b=nearest(m.x,m.y,650);if(b){m.cd=.7;const an=Math.atan2(b.y-b.h/2-m.y,b.x-m.x);
    for(let i=-2;i<=2;i++)spawnPr({x:m.x,y:m.y,vx:Math.cos(an+i*.15)*800,vy:Math.sin(an+i*.15)*800,dmg:m.dmg,r:4,life:.8,dotK:'poison',dps:6,dur:4,col:'#e6ff3c'})}}},
  draw(m){glow('#e6ff3c',20);c.fillStyle='#e6ff3c';c.beginPath();c.ellipse(m.x,m.y,16,11,0,0,6.283);c.fill();c.fillStyle='#222';for(let i=-1;i<=1;i++)c.fillRect(m.x+i*6-1,m.y-10,3,20);
   c.fillStyle='#fff8';c.beginPath();c.ellipse(m.x-6,m.y-12,8,5,-.5+Math.sin(S.t*40)*.3,0,6.283);c.ellipse(m.x+6,m.y-12,8,5,.5-Math.sin(S.t*40)*.3,0,6.283);c.fill()}}
};
