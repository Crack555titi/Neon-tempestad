'use strict';
/* ===================== UTIL ===================== */
const W=960,H=540,G=2100,WORLD=2400,FLOOR=500;
const $=i=>document.getElementById(i),cv=$('game'),c=cv.getContext('2d');
const R=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sgn=v=>v<0?-1:1,hyp=Math.hypot;
const Ev={h:{},on(n,f){(this.h[n]=this.h[n]||[]).push(f)},emit(n,...a){(this.h[n]||[]).forEach(f=>f(...a))}};
// distancia de un punto a un segmento
function segD(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy,t=l?clamp(((px-x1)*dx+(py-y1)*dy)/l,0,1):0;return hyp(px-x1-t*dx,py-y1-t*dy)}
const DEBUG=typeof location!=='undefined'&&/[?&]debug\b/.test(location.search);  // index.html?debug: B activa el teletransportador

/* ===================== DIFICULTADES ===================== */
const DIFFS=[
 {name:'Paseo Estelar',clock:.7,elite:1,heal:1,chest:1,revive:1,desc:'Reloj 30% más lento · 1 resurrección gratis'},
 {name:'Estándar',clock:1,elite:1,heal:1,chest:1,desc:'Balance base'},
 {name:'Tormenta de Riesgo',clock:1.25,elite:1.4,heal:.8,chest:1,desc:'Reloj +25% · +40% élites · -20% curación'},
 {name:'Cataclismo',clock:1.6,elite:1,heal:1,chest:1.3,dbl:1,desc:'Reloj +60% · cofres +30% · élites con doble afijo'},
 // startLvl y kit: sin ellos, empezar en el minuto 45 a nivel 1 es muerte en segundos
 {name:'Pesadilla Absoluta',clock:1,elite:1,heal:1,chest:1,start:45*60,startLvl:20,kit:{c:14,u:7,r:2,l:1},hazard:1,perma:1,
  desc:'Empieza en el minuto 45 (nivel 20 y 24 objetos) · los proyectiles enemigos dejan zonas de daño en el suelo · muerte permanente: al morir se borra la partida'}
];

/* ===================== ESTADO / INPUT ===================== */
let S=null,chain=0,selC='vanguard',selD=1;
const keys={},mouse={x:0,y:0,l:0,r:0};
const SLOTS='psmu',SLOT={p:'primary',s:'secondary',m:'move',u:'ult'};
const BTN={p:()=>act('primary'),s:()=>act('secondary'),m:()=>act('move'),u:()=>act('ult')};  // entrada: input.js

// dificultad: +0,5 por minuto de reloj y +0,3 por etapa superada
const coef=()=>(1+S.clock/60*.5+.3*S.stage)*Math.pow(1.45,S.loop||0),
 capL=c=>S&&S.loop?Math.min(.95,c+.12*S.loop):c,  // Modo Infinito: los topes (armadura, esquiva, enfriamientos…) se relajan en cada ciclo
 dmgScale=()=>1+.12*(coef()-1), hpScale=()=>1+.3*(coef()-1);
const say=m=>{S.msg=m;S.msgT=4};

/* run: instantánea guardada al empezar una etapa (save.js) para continuar o reintentar */
function start(cid,did,run){
 Ev.h={};fxReset();const ch=CHARS[cid],df=DIFFS[did];
 ['title','menu','shop','rank','login','end','mastery','storm','inv','altar','pause','opts','ctrls'].forEach(i=>$(i).style.display='none');
 S={st:'play',cid,ch,df,t:0,clock:df.start||0,stage:0,phase:1,cam:0,shake:0,en:[],zn:[],dr:[],sch:[],freeze:0,spawn:2,loop:0,bosses:[],boss:null,bossDone:0,bossName:'',msg:'',msgT:0,kills:0,mq:0,portal:{a:null,b:null},
  ints:[],near:null,note:null,chestT:40,altarT:150,tp:null,lava:0,walls:null,fade:1,lvlFx:null,
  p:{x:300,y:FLOOR,w:24,h:42,vx:0,vy:0,ground:0,wasG:1,plat:null,jumps:0,maxJ:2,face:1,aim:0,hp:ch.hp,maxHp:ch.hp,lvl:1,xp:0,need:40,dmgMul:1,inv:0,dash:null,drop:0,
   cd:{p:0,s:0,m:0,u:0},chg:{p:0,s:0,m:0,u:0},revive:df.revive||0,mastery:[],
   // estadísticas: base + maestría + objetos (las de objetos se suman por acumulación desde data_items.js)
   m:{dmg:1,spd:1,as:1,crit:.05,critm:0,cdr:0,ucdr:0,mcdr:0,ls:0,arm:0,hpf:0,hpm:0,regen:0,shield:0,oversh:0,dodge:0,luck:0,goldm:0,xpm:0,healm:0,chestm:0,exec:0},
   items:{},ist:{},dmItems:[],gold:0,sh:0,shT:0,
   buf:{},form:'a',corr:0,gm:1,leapT:0,slam:null,combo:0,comboT:0,
   sx:1,sy:1,run:0,atk:0,lastVy:0,ghosts:[],ghT:0,healAcc:0,healT:0,
   hist:Array.from({length:31},()=>({x:300,y:FLOOR,hp:ch.hp})),hi:0,histT:0}};
 const p=S.p;
 if(ch.passive&&PASSIVES[ch.passive.t])PASSIVES[ch.passive.t](p,ch.passive);
 lootInit(!run);
 if(run){S.clock=run.clock;S.t=run.t;S.kills=run.kills;p.gold=run.gold;p.revive=run.revive;
  for(const id in run.items)for(let k=0;k<run.items[id];k++)giveItem(id,1);
  p.lvl=run.lvl;p.xp=run.xp;p.need=Math.round(40*Math.pow(p.lvl,1.35));p.dmgMul=1+.05*(p.lvl-1);
  for(const n of run.mastery){const m=MASTERY.find(x=>x.name===n);if(m){m.fx(p);p.mastery.push(n)}}
  recalcHp();S.loop=run.loop||0;loadStage(run.stage)}
 else{while(p.lvl<(df.startLvl||1))giveXp(p.need-p.xp);loadStage(0);saveRun()}
 p.hp=p.maxHp;
 trackRun();stormInit(); // después de los niveles regalados de Pesadilla: no cuentan para logros
 Snd.hooks();
}

/* ===================== BUFFS DEL JUGADOR =====================
   Efectos temporales genéricos. Campos multiplicativos: dmg, taken, as, spd, grav, healm, cdm.
   Sumativos: ls, reflect, drain, killheal. Banderas: intang, noatk, nomove, root, floor, jet, both, nocd.
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
 e.vy+=G*dt*(e.gm===undefined?1:e.gm)*(S.gmul||1);  // gmul: anomalía de gravedad
const oy=e.y;
 e.x=clamp(e.x+e.vx*dt,e.w/2,WORLD-e.w/2);e.y+=e.vy*dt;e.ground=0;e.plat=null;
 if(e.vy>=0)for(const p of PLAT){if(!p.on||(drop&&!p.solid))continue;
  if(e.x+e.w/2>p.rx&&e.x-e.w/2<p.rx+p.w&&oy<=p.ry+6&&e.y>=p.ry){e.y=p.ry;e.vy=0;e.ground=1;e.plat=p;break}}
}
function jump(){const p=S.p,it=p.items,mj=it.voidanchor?1:it.icarus?1e9:p.maxJ;if(bany('root')||(!p.ground&&p.jumps>=mj))return;
 if(!p.ground&&it.icarus&&p.jumps>=p.maxJ)drainP(p.maxHp*.04);  // Alas de Ícaro: los saltos extra cuestan vida
 p.jumps=p.ground?1:p.jumps+1;p.vy=-S.ch.jump;p.ground=0;p.sx=.78;p.sy=1.25;burst(p.x,p.y,8,S.ch.color,160,3);Ev.emit('onJump')}
function land(){const p=S.p,k=clamp(p.lastVy/1400,.15,1);p.sx=1+.35*k;p.sy=1-.3*k;if(k>.4)burst(p.x,p.y,6,'#fff',120,2);
 if(p.slam){aoe(p.x,p.y-20,p.slam.r,p.slam.dmg);ring(p.x,p.y-10,p.slam.r,S.ch.color,.4);burst(p.x,p.y,24,S.ch.color,420,4);S.shake=Math.max(S.shake,12);p.slam=null}}

/* ===================== COMBATE ===================== */
// proc: daño causado por objetos (no vuelve a disparar onHit); raw: ya trae los multiplicadores aplicados
const NOOPT={},DOT={dot:1},DOTRAW={dot:1,raw:1},RAW={raw:1},CRIT={crit:1},PROC={proc:1},PROCRAW={proc:1,raw:1};
let kdepth=0;
function shootP(x,y,a,sp,dmg,r,src){fxProj({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,dmg,r,life:5,hostile:1,col:'#ff4d6d',src})}
/* Zonas: warn = aviso (se rellena y destella antes del impacto) · track = deja de seguirte X s antes · sweep = daña una vez
   mientras dure · vx = se desplaza · line = línea giratoria · safe = círculos seguros dentro de la zona · dot = daño periódico */
function Z(o){const z=Object.assign({warn:0,life:.3,dmg:0,tk:0,ftk:0,col:'#f24'},o);z.w0=z.warn;S.zn.push(z);return z}
function puddle(x,y){Z({x,y,r:42,warn:.3,life:4,dmg:6*dmgScale(),dot:1,hostile:1,col:'#ff5a1a'})}
function heal(a){const p=S.p;if(a<=0)return;a*=(1+p.m.healm)*bm('healm')*S.df.heal;  // la dificultad afecta a TODA la curación
 const over=p.hp+a-p.maxHp;p.healAcc+=Math.min(a,p.maxHp-p.hp);p.hp=Math.min(p.maxHp,p.hp+a);
 if(over>0&&p.m.oversh)p.sh=Math.min(p.maxHp*(p.m.shield+p.m.oversh),p.sh+over);  // Coraza Absoluta
 Ev.emit('onHeal',a)}
function aoe(x,y,r,d,o){for(const e of S.en.slice())if(!e.dead&&hyp(e.x-x,e.y-e.h/2-y)<r+e.w/2)hurtE(e,d,o)}
function stunE(e,t){if(!e.boss)e.stunT=Math.max(e.stunT||0,t)}
function pullE(e,x,y,v,dt){if(e.boss)return;const dx=x-e.x,dy=y-(e.y-e.h/2),d=hyp(dx,dy);if(d<8)return;const m=Math.min(d,v*dt)/d;e.x+=dx*m;if(isFlyer(e.d))e.y+=dy*m}
// raw=1 si dps sale de un golpe ya multiplicado (objetos); así no se aplican los multiplicadores dos veces
function applyDot(e,k,dps,dur,raw){const D=e.dots||(e.dots={}),o=D[k];
 if(k==='poison'&&o&&o.t>0){o.n=Math.min(10,o.n+1);o.t=dur;o.dps=dps;o.raw=raw}else D[k]={dps,t:dur,n:1,tk:.5,raw}}
function tickDots(e,dt){for(const k in e.dots){const o=e.dots[k];if(o.t<=0)continue;o.t-=dt;o.tk-=dt;
 if(o.tk<=0){o.tk=.5;hurtE(e,o.dps*o.n*.5*(k==='poison'&&S.dr.some(m=>m.k==='queen')?2:1),{dot:1,raw:o.raw,el:DOT_EL[k]});if(e.dead)return}}}

function hurtE(e,d,o){
 if(e.dead||e.hidden||e.ghost>0)return;const p=S.p,bl=p.items.blacklens;o=o||NOOPT;let crit=false;
 if(!o.raw){crit=!o.dot&&(bl||o.crit||Math.random()<p.m.crit);
  d*=p.dmgMul*p.m.dmg*bm('dmg')*(crit?(bl?1.5:2)+p.m.critm:1)*(e.stun>0?1.5:1)*(e.markT>0?1.5:1);
  for(const it of p.dmItems)d*=it.dm(p.items[it.id],e);d=applyElement(e,d,o)}
 if(o.raw&&o.el)d=applyElement(e,d,o);
 if(e.d.front&&sgn(p.x-e.x)===e.face&&!e.chT)d*=e.d.front;  // escudo frontal del Acorazado
 for(const a of e.aff)if(a.taken)d=a.taken(e,d);
 if(e.sh>0){const a=Math.min(e.sh,d);e.sh-=a;d-=a}
 if(d<=0)return;
 if(e.boss&&e.ph<3)d=Math.min(d,e.hp-e.maxHp*(e.ph===1?.655:.325));  // un golpe no puede saltarse una fase: se queda en el umbral
 e.hp-=d;e.flash=.1;e.lastCrit=crit;txt(e.x+R(-10,10),e.y-e.h-6,Math.round(d)+(crit?'!':''),crit?'#ffd23c':o.dot?'#d9a0ff':o.proc?'#9ae6ff':'#fff',crit?20:o.dot?11:o.proc?12:14);
 if(crit&&!o.proc&&!o.dot&&hsCd<=0){hitStop(30);hsCd=e.elite||e.boss?.25:.5;kick(p.aim,2.5)}
 // Guillotina: ejecuta a los no-jefes por debajo del umbral
 if(p.m.exec&&!e.boss&&e.hp>0&&e.hp<e.maxHp*Math.min(capL(.4),.06+p.m.exec)){e.hp=0;txt(e.x,e.y-e.h-20,'EJECUTADO','#ff2a6a')}
 Ev.emit('onHit',e,d,o,crit);
 const ls=p.m.ls+bsum('ls')+(o.ls||0);if(ls&&!o.dot&&!o.proc)heal(d*ls);  // el daño de objetos no roba vida: evita bucles curación↔daño (Núcleo Inverso)
 for(const id in p.buf){const b=p.buf[id];if(b.onDeal)b.onDeal(e,d,o)}
 if(e.boss){
  if(e.stun<=0){e.stag+=d*.8;if(e.stag>=e.stagMax){e.stag=0;e.stun=3.2;e.t=1.2;say('¡GUARDIA ROTA! Daño +50%');S.shake=14;hitStop(50);chromaHit(.8);ring(e.x,e.y-55,200,'#ffd23c',.5);Ev.emit('onGuardBreak',e)}}
  const r=e.hp/e.maxHp,np=r>.66?1:r>.33?2:3;
  if(np>e.ph&&e.hp>0){e.ph=np;S.phase=np;e.stun=0;e.t=1.8;S.shake=26;hitStop(60);chromaHit(1);ring(e.x,e.y-55,500,e.def.color,.8);burst(e.x,e.y-55,50,e.def.color,500,4);
   say(e.def.phaseMsg[np]);if(e.def.onPhase)e.def.onPhase(e,np);Ev.emit('onBossPhase',e,np)}
 }
 if(e.hp<=0)kill(e);
}
function kill(e){
 e.dead=1;S.kills++;disintegrate(e.x,e.y,e.w,e.h,e.d.color);if(e.boss){burst(e.x,e.y-e.h/2,80,e.d.color,600,4);chromaHit(1.2)}S.shake=Math.max(S.shake,e.boss?30:3);
 if(e.boss||e.elite)hitStop(e.boss?60:40);
 const p=S.p;giveXp(e.d.xp*(e.elite&&p.items.voidpact?1+p.items.voidpact:1));  // Contrato del Vacío
 p.gold+=Math.round(goldFor(e)*(S.storm?S.storm.goldMul:1));
 heal(p.maxHp*((p.items.bloodoath?0:.01)+bsum('killheal')));
 if(kdepth<4){kdepth++;Ev.emit('onKill',e);kdepth--}  // límite a las cadenas de explosiones al matar
 if(e.boss){const r=chance(.2)?'l':'r';giveItem(rollItem(r));S.bosses=S.bosses.filter(b=>b!==e);S.boss=S.bosses[0]||null;S.bossName=e.def.name;
  if(S.boss)say(`¡${e.def.name} derrotado! Queda ${S.boss.def.name}`);  // jefes duales: hasta que caigan los dos
  else{S.bossDone=1;S.phase=1;S.walls=null;S.lava=0;say(`¡${e.def.name} derrotado! Termina de cargar el teletransportador`)}}
 else enemyDeath(e);
}
function hurtP(d,src){
 const p=S.p;if(p.inv>0||S.st!=='play'||bany('intang'))return;
 for(const id in p.buf){const b=p.buf[id];if(b.onHurt&&b.onHurt(b,d))return}
 if(p.m.dodge&&chance(Math.min(capL(.5),p.m.dodge))){p.inv=.25;txt(p.x,p.y-56,'ESQUIVA','#9ae6ff');return}
 // invulnerable ANTES de reflejar: si no, Fortaleza ↔ élite Reflectante se devuelven el daño sin fin
 p.inv=.45;S.shake=Math.max(S.shake,9);if(src&&src.x!==undefined)kick(Math.atan2(p.y-(src.y||p.y),p.x-src.x),Math.min(12,4+d/p.maxHp*40));
 d*=(1-Math.min(capL(.6),p.m.arm))*bm('taken');
 p.shT=4;if(p.sh>0){const a=Math.min(p.sh,d);p.sh-=a;d-=a}
 const rf=bsum('reflect');if(rf)aoe(p.x,p.y-20,220,d*rf,RAW);
 for(const id in p.buf){const b=p.buf[id];if(b.absorb>0){const a=Math.min(b.absorb,d);b.absorb-=a;b.stored+=a;d-=a;if(b.absorb<=0)b.t=0}}
 if(d<=0){ring(p.x,p.y-20,40,'#c8d2ff',.25);return}
 p.hp-=d;burst(p.x,p.y-20,10,'#f44',260,3);txt(p.x,p.y-56,'-'+Math.ceil(d),'#ff4d6d',18);if(d>p.maxHp*.15)chromaHit(.7);
 if(src&&!src.dead&&src.aff)for(const a of src.aff)if(a.hit)a.hit(src,d);  // afijos de élite al golpear (vampírico, gélido)
 if(p.hp<=0&&bany('floor'))p.hp=1;
 Ev.emit('onTakeDamage',d);if(p.hp<=0)die();
}
// pérdida de vida autoinfligida (pactos, corrupción, abismos): ignora invulnerabilidad y SÍ puede matar
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
  ring(p.x,p.y-20,160,'#ffd23c',.5);S.lvlFx={t:1.6,lvl:p.lvl};Ev.emit('onLevelUp',p.lvl);
  if(p.lvl%5===0)S.mq++}
 if(S.mq>0&&S.st==='play')openMastery();
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
 else{e.x=clamp(p.x+p.face*40,20,WORLD-20);if(isFlyer(e.d))e.y=p.y-20;e.vx=0;stunE(e,.8)}}
function steer(q,tx,ty,rate,dt){const sp=hyp(q.vx,q.vy),ca=Math.atan2(q.vy,q.vx),da=((Math.atan2(ty-q.y,tx-q.x)-ca+Math.PI*3)%(Math.PI*2))-Math.PI,na=ca+clamp(da,-rate*dt,rate*dt);q.vx=Math.cos(na)*sp;q.vy=Math.sin(na)*sp}
function updProj(q,dt){
 const s=S,p=s.p;q.life-=dt;
 if(q.home){let b=null,bd=500;for(const e of s.en)if(!q.hit.has(e)&&!e.hidden){const dd=hyp(e.x-q.x,e.y-e.h/2-q.y);if(dd<bd){bd=dd;b=e}}if(b)steer(q,b.x,b.y-b.h/2,7,dt)}
 if(q.homeP)steer(q,p.x,p.y-p.h/2,2.2,dt);  // proyectil hostil teledirigido (lento de girar: se puede esquivar)
 if(q.ret){if(!q.back&&q.life<q.t0*.5){q.back=1;q.hit.clear()}
  if(q.back){const a=Math.atan2(p.y-p.h/2-q.y,p.x-q.x),sp=hyp(q.vx,q.vy);q.vx=Math.cos(a)*sp;q.vy=Math.sin(a)*sp;q.life=Math.max(q.life,.05);if(hyp(p.x-q.x,p.y-p.h/2-q.y)<28)q.life=0}}
 if(q.gm)q.vy+=G*q.gm*dt*(s.gmul||1);
 if(q.pull)for(const e of s.en)if(hyp(e.x-q.x,e.y-e.h/2-q.y)<q.pull)pullE(e,q.x,q.y,240,dt);
 const qs=q.hostile?s.pspd||1:1;q.x+=q.vx*dt*qs;q.y+=q.vy*dt*qs;spark(q.x,q.y,0,0,.2,q.col,q.r);  // pspd: proyectiles acelerados
 const P=s.portal;
 if(!q.hostile&&!q.ported&&P.a&&P.b){const A=hyp(q.x-P.a.x,q.y-P.a.y)<30?P.a:hyp(q.x-P.b.x,q.y-P.b.y)<30?P.b:null;
  if(A){const B=A===P.a?P.b:P.a;q.x=B.x;q.y=B.y;q.ported=1;q.dmg*=1.6;q.r*=1.3;ring(B.x,B.y,40,'#3cffd8',.25)}}
 if(q.harmless){}
 else if(q.hostile){if(!bany('intang')&&hyp(q.x-p.x,q.y-(p.y-p.h/2))<q.r+13){hurtP(q.dmg,q.src);q.life=0}}
 else for(const e of s.en){if(e.dead||e.hidden||q.hit.has(e))continue;
  if(hyp(e.x-q.x,e.y-e.h/2-q.y)<q.r+Math.max(e.w,e.h)/2){q.hit.add(e);projHit(q,e);if(q.life<=0)break;if(q.boom){q.life=0;break}if(--q.pierce<0){q.life=0;break}}}
 const out=q.x<0||q.x>WORLD;
 if(q.wb>0&&(out||q.y>=FLOOR)){if(out){q.vx=-q.vx;q.x=clamp(q.x,0,WORLD)}else{q.vy=-Math.abs(q.vy)*.9;q.y=FLOOR-1}q.wb--}
 else if(q.bounce>0&&q.y>=FLOOR){q.vy=-Math.abs(q.vy)*.55;q.y=FLOOR-1;q.bounce--}
 else if(!q.ret&&(q.y>=FLOOR||out||(q.y<-80&&!q.gm)))q.life=Math.min(q.life,0);
 if(q.life<=0){const y=Math.min(q.y,FLOOR);
  if(q.boom){ring(q.x,y,q.boom,q.col,.3);aoe(q.x,y,q.boom,q.dmg);s.shake=Math.max(s.shake,4);Snd.play('boom')}
  if(q.zone)Z(Object.assign({x:q.x,y},q.zone));
  if(q.hostile&&!q.harmless&&s.df.hazard)puddle(q.x,y)}
}

/* ===================== ZONAS ===================== */
function inZone(z,x,y,m){
 if(z.line){const L=z.line;return segD(x,y,z.x,z.y,z.x+Math.cos(L.ang)*L.len,z.y+Math.sin(L.ang)*L.len)<L.w/2+m}
 const inside=z.rw?(x>z.x-m&&x<z.x+z.rw+m&&y>z.y-m&&y<z.y+z.rh+m):hyp(x-z.x,y-z.y)<z.r+m;
 if(inside&&z.safe)for(const sf of z.safe)if(hyp(x-sf.x,y-sf.y)<sf.r)return false;
 return inside}
function updZone(z,dt){
 const s=S,p=s.p,pin=()=>inZone(z,p.x,p.y-p.h/2,z.line?0:10);
 if(z.warn>0){z.warn-=dt;if(z.track!==undefined&&z.warn>z.track){z.x=z.rw?p.x-z.rw/2:p.x;if(z.trackY)z.y=p.y-p.h/2}return}
 if(z.vx)z.x+=z.vx*dt;if(z.line)z.line.ang+=z.line.rot*dt;
 if(z.slow)for(const e of s.en)if(inZone(z,e.x,e.y-e.h/2,e.w/2))e.slowT=.15;
 if(z.pullZ)for(const e of s.en)if(inZone(z,e.x,e.y-e.h/2,z.r*.8))pullE(e,z.x,z.y,z.pullZ,dt);
 if(z.fdmg){z.ftk-=dt;if(z.ftk<=0){z.ftk=.5;for(const e of s.en)if(!e.dead&&inZone(z,e.x,e.y-e.h/2,e.w/2))hurtE(e,z.fdmg,DOT)}}
 if(z.healZ&&pin())heal(p.maxHp*z.healZ*dt);
 if(z.pbuf&&pin())buff('zone',.2,z.pbuf);
 if(z.sweep&&z.hostile&&!z.hitP&&pin()){z.hitP=1;hurtP(z.dmg)}
 if(!z.act){z.act=1;if(z.fboom)aoe(z.x,z.y,z.r,z.fboom,PROC);if(!z.dot&&!z.sweep&&z.hostile&&z.dmg&&pin())hurtP(z.dmg);if(!z.dot&&!z.line&&!z.rw)burst(z.x,z.y,14,z.col,300,4)}
 z.life-=dt;
 if(z.dot&&z.hostile){z.tk-=dt;if(z.tk<=0){z.tk=.5;if(pin())hurtP(z.dmg)}}
}

/* ===================== UPDATE ===================== */
function update(dt){
 const s=S,p=s.p,fz=s.freeze>0;s.t+=dt;s.clock+=dt*s.df.clock*(p.items.invhour?1.5+.5*p.items.invhour:1)*(p.items.brokenclock?1.1+.1*p.items.brokenclock:1);s.cam=clamp(p.x-W/2,0,WORLD-W);
 for(const pl of PLAT){const a=pl.sp?Math.sin(s.t*pl.sp):0,nx=pl.x+(pl.ax||0)*a;pl.dx=pl.rx===undefined?0:nx-pl.rx;pl.rx=nx;pl.ry=pl.y+(pl.ay||0)*a;
  pl.on=s.phase>=pl.ph[0]&&s.phase<=pl.ph[1]&&!(pl.bl&&s.phase>=pl.bl&&Math.sin(s.t*1.6+pl.x*.01)<-.3)}  // bl: parpadea
 updBuffs(dt);drainP(p.maxHp*bsum('drain')*dt);if(s.st!=='play')return;
 // jugador
 const root=bany('root'),ax=root?0:(act('right')?1:0)-(act('left')?1:0);
 p.aim=AIM.ang!==null?AIM.ang:Math.atan2(mouse.y-(p.y-p.h/2),mouse.x+s.cam-p.x);if(Math.abs(Math.cos(p.aim))>.15)p.face=sgn(Math.cos(p.aim));
 p.inv-=dt;p.drop-=dt;p.leapT-=dt;p.comboT-=dt;for(const k in p.cd)p.cd[k]-=dt;
 p.histT-=dt;if(p.histT<=0){p.histT=.1;p.hi=(p.hi+1)%p.hist.length;const h=p.hist[p.hi];h.x=p.x;h.y=p.y;h.hp=p.hp}
 if(act('down'))p.drop=.25;
 p.gm=bm('grav');
 if(bany('jet')){p.vy=Math.max(p.vy-(G+1700)*dt,-430);p.ground=0}
 if(p.slam&&!p.ground&&p.vy>=0)p.vy=Math.max(p.vy,1500);
 if(p.dash){const dd=p.dash;dd.t-=dt;p.x=clamp(p.x+dd.vx*dt,12,WORLD-12);p.y=Math.max(40,p.y+(dd.vy||0)*dt);p.vy=0;p.inv=Math.max(p.inv,.05);
  if(Math.random()<.8)burst(p.x,p.y-20,1,s.ch.color,40,5);
  if(dd.dmg)for(const e of s.en)if(!e.dead&&!dd.hit.has(e)&&Math.abs(e.x-p.x)<e.w/2+24&&Math.abs(e.y-e.h/2-(p.y-20))<e.h/2+30){dd.hit.add(e);hurtE(e,dd.dmg);if(!e.boss)e.vx+=sgn(dd.vx)*400;if(e.dead&&dd.reset)p.cd.m=0}
  if(dd.t<=0){p.dash=null;if(dd.vy)p.vy=dd.vy*.35}}
 else{if(p.ground&&p.plat&&p.plat.on)p.x=clamp(p.x+p.plat.dx,12,WORLD-12); // la plataforma móvil arrastra al jugador
  if(root)p.vx=0;else if(p.leapT<=0)p.vx+=(ax*s.ch.spd*p.m.spd*bm('spd')-p.vx)*Math.min(1,(p.ground?18:8)*dt);
  phys(p,dt,p.drop>0);if(p.ground)p.jumps=0;else if(p.jumps===0&&p.vy>0)p.jumps=1}
 if(p.ground&&!p.wasG)land();p.wasG=p.ground;p.lastVy=p.vy;
 // animación: squash & stretch vuelve a 1, zancada según la velocidad, anticipación del ataque, estela del dash
 const ease=Math.min(1,dt*12);p.sx+=(1-p.sx)*ease;p.sy+=(1-p.sy)*ease;p.run+=Math.abs(p.vx)*dt*.045;p.atk=Math.max(0,p.atk-dt*7);
 p.ghT-=dt;if((p.dash||bany('intang'))&&p.ghT<=0){p.ghT=.03;p.ghosts.push({x:p.x,y:p.y,l:.25,face:p.face,aim:p.aim,run:p.run})}
 for(const gh of p.ghosts)gh.l-=dt;p.ghosts=p.ghosts.filter(gh=>gh.l>0);
 p.healT-=dt;if(p.healT<=0){p.healT=.6;if(p.healAcc>=2)txt(p.x+18,p.y-60,'+'+Math.round(p.healAcc),'#4cff7a',p.healAcc>p.maxHp*.1?17:12);p.healAcc=0}
 // habilidades: las de `hold` se cargan mientras se mantiene el botón y se lanzan al soltar
 const noatk=bany('noatk'),nomove=bany('nomove');
 for(const k of SLOTS){const d=ab(k),down=BTN[k]()||(k==='u'&&p.items.gesture);  // Gesto del Abismo: definitiva automática
  if(root||(noatk&&k!=='m')||(nomove&&k==='m')){p.chg[k]=0;continue}
  if(d.hold){if(down&&p.cd[k]<=0)p.chg[k]=Math.min(d.max,p.chg[k]+dt);else if(p.chg[k]>0){cast(k,p.chg[k]/d.max);p.chg[k]=0}}
  else if(down&&p.cd[k]<=0)cast(k)}
 if(!p.items.bloodoath)heal(p.maxHp*(.008+p.m.regen)*dt);
 // escudo: se recarga tras 4 s sin recibir daño
 p.shT-=dt;const shMax=p.maxHp*p.m.shield;if(p.shT<=0&&p.sh<shMax)p.sh=Math.min(shMax,p.sh+shMax*.5*dt);
 Ev.emit('onTick',dt);updLoot(dt);updStage(dt);if(s.st!=='play')return;
 // director: más presión mientras se carga el teletransportador, casi nada cuando ya está listo
 const T=s.tp,evt=T.state==='charging'?1.5:T.state==='ready'?.3:1;
 s.spawn-=dt*evt;
 if(s.spawn<=0){const L=Math.pow(1.5,s.loop),mx=Math.min(26*L,110,(5+coef()*1.6)*L)*(s.boss?.6:1)*(s.storm?s.storm.spawnMul:1);if(s.en.filter(e=>!e.boss).length<mx)spawnEnemy();s.spawn=Math.max(.5/L,2.6/(1+coef()*.12)/L)}
 // enemigos (Tiempo Detenido congela enemigos, sus proyectiles, zonas y ataques programados)
 if(fz)s.freeze-=dt;else for(const e of s.en)updEnemy(e,dt);
 s.en=s.en.filter(e=>!e.dead);
 // esbirros del jugador
 for(const m of s.dr)MIN[m.k].upd(m,dt);
 s.dr=s.dr.filter(m=>m.life>0);
 // proyectiles
 for(let i=0;i<PR.n;i++){const q=PR.a[i];if(!(q.hostile&&fz))updProj(q,dt)}
 PR.sweep(deadLife);
 for(const z of s.zn)if(!(z.hostile&&fz))updZone(z,dt);
 for(const z of s.zn)if(z.life<=0&&z.end){const f=z.end;z.end=null;f(z)}
 s.zn=s.zn.filter(z=>z.life>0);
 for(const q of s.sch)if(!(q.en&&fz))q.t-=dt;for(const q of s.sch.filter(q=>q.t<=0))q.f();s.sch=s.sch.filter(q=>q.t>0);
 for(let i=0;i<PT.n;i++){const q=PT.a[i];q.l-=dt;if(q.ring){q.r+=(q.mr-q.r)*Math.min(1,dt*9)}else{q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.93;q.vy*=.93}}
 PT.sweep(deadL);for(let i=0;i<TX.n;i++){const t=TX.a[i];t.l-=dt;t.vy+=t.g*dt;t.x+=t.vx*dt;t.y+=t.vy*dt}TX.sweep(deadL);
 for(let i=0;i<BL.n;i++)BL.a[i].l-=dt;BL.sweep(deadL);
 s.shake*=.88;updKick(dt);updStorm(dt);s.msgT-=dt;hsCd-=dt;s.fade=Math.max(0,s.fade-dt*1.8);if(s.lvlFx&&(s.lvlFx.t-=dt)<=0)s.lvlFx=null;
}

/* ===================== RENDER ===================== */
function drawZone(z){
 const w=z.warn>0,pr=w&&z.w0?1-z.warn/z.w0:1,hot=w&&pr>.85,col=hot?'#fff':z.col;  // el aviso se rellena y destella en blanco justo antes del impacto
 c.fillStyle=col;c.strokeStyle=col;c.lineWidth=2;
 if(z.line){const L=z.line;c.globalAlpha=w?.35+.4*pr:.85;c.lineWidth=w?2+4*pr:L.w;if(!w)glow(z.col,16);c.beginPath();c.moveTo(z.x,z.y);c.lineTo(z.x+Math.cos(L.ang)*L.len,z.y+Math.sin(L.ang)*L.len);c.stroke();c.shadowBlur=0;c.globalAlpha=1;return}
 if(z.safe){c.globalAlpha=w?.25+.5*pr:.8;c.fillRect(z.x,z.y,z.rw,z.rh);c.globalAlpha=1;for(const sf of z.safe){glow('#fff6c0',30);c.fillStyle='#fff6c055';c.beginPath();c.arc(sf.x,sf.y,sf.r,0,6.283);c.fill();c.strokeStyle='#fff6c0';c.stroke()}c.shadowBlur=0;return}
 c.globalAlpha=w?.6:Math.min(1,z.life*3)*(z.dot?.4:.7);
 if(z.rw){if(w){c.strokeRect(z.x,z.y,z.rw,z.rh);c.globalAlpha=.25+.35*pr;c.fillRect(z.x,z.y+z.rh*(1-pr),z.rw,z.rh*pr)}else c.fillRect(z.x,z.y,z.rw,z.rh)}
 else{c.beginPath();c.arc(z.x,z.y,z.r,0,6.283);if(w){c.stroke();c.globalAlpha=.2+.35*pr;c.beginPath();c.arc(z.x,z.y,z.r*pr,0,6.283);c.fill()}
  else{c.fill();if(z.pullZ){c.globalAlpha=.8;c.beginPath();c.arc(z.x,z.y,z.r*(1-(S.t*1.5)%1),0,6.283);c.stroke()}}}
 c.globalAlpha=1}
function draw(){
 const s=S;screen();drawBg(s.cam,s.boss?s.boss.ph:0,s.t);
 const sh=s.shake*SHAKE,sx=R(-1,1)*sh+KICK.x*SHAKE,sy=R(-1,1)*sh+KICK.y*SHAKE;c.translate(-s.cam+sx,sy);
 drawPlats();
 for(const z of s.zn)drawZone(z);
 // portales
 for(const P of [s.portal.a,s.portal.b])if(P){glow('#3cffd8',16);c.strokeStyle=P===s.portal.a?'#3cffd8':'#ff8a3c';c.lineWidth=4;c.beginPath();c.ellipse(P.x,P.y,14,30+Math.sin(s.t*5)*3,0,0,6.283);c.stroke()}
 c.shadowBlur=0;
 drawLoot();
 for(const e of s.en)drawEnemy(e);
 drawStormWorld();drawElements();
 for(const m of s.dr)MIN[m.k].draw(m);c.shadowBlur=0;
 drawPlayer(s.p);
 for(const id in s.p.buf){const b=s.p.buf[id];if(b.draw)b.draw(b)}
 screen();drawFog(s.cam,s.t);c.translate(-s.cam+sx,sy);
 // capa luminosa: proyectiles, rayos y partículas se suman (mezcla aditiva) para que brillen
 if(QL.add)c.globalCompositeOperation='lighter';
 for(let i=0;i<PR.n;i++){const q=PR.a[i];glow(q.col,16);c.fillStyle=q.col;c.beginPath();c.arc(q.x,q.y,q.r,0,6.283);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(q.x,q.y,q.r*.45,0,6.283);c.fill()}c.shadowBlur=0;
 for(let i=0;i<BL.n;i++){const b=BL.a[i];c.globalAlpha=Math.max(0,b.l/b.ml);glow(b.c,12);c.strokeStyle=b.c;c.lineWidth=b.w;c.beginPath();c.moveTo(b.x1,b.y1);
  const n=b.jag?6:1;for(let k=1;k<n;k++){const t=k/n;c.lineTo(b.x1+(b.x2-b.x1)*t+R(-b.jag,b.jag),b.y1+(b.y2-b.y1)*t+R(-b.jag,b.jag))}c.lineTo(b.x2,b.y2);c.stroke()}
 c.shadowBlur=0;
 for(let i=0;i<PT.n;i++){const q=PT.a[i];c.globalAlpha=Math.max(0,q.l/q.ml);if(q.ring){c.strokeStyle=q.c;c.lineWidth=4;c.beginPath();c.arc(q.x,q.y,q.r,0,6.283);c.stroke()}else{c.fillStyle=q.c;c.fillRect(q.x-q.s/2,q.y-q.s/2,q.s,q.s)}}
 c.globalAlpha=1;c.globalCompositeOperation='source-over';
 // números de daño: "pop" al aparecer y borde oscuro para leerse sobre cualquier fondo
 c.textAlign='center';c.lineWidth=3;c.strokeStyle='rgba(0,0,0,.75)';
 for(let i=0;i<TX.n;i++){const t=TX.a[i],age=t.ml-t.l,sc=age<.1?1.6-age*6:1;c.globalAlpha=Math.min(1,t.l*2.5);c.font=`bold ${Math.round(t.size*sc)}px monospace`;c.strokeText(t.s,t.x,t.y);c.fillStyle=t.c;c.fillText(t.s,t.x,t.y)}
 c.globalAlpha=1;
 // postproceso
 bloom();aberration();
 screen();if(s.freeze>0){c.fillStyle='rgba(120,220,255,.12)';c.fillRect(0,0,W,H)}
 if(s.p.buf.void){c.fillStyle='rgba(90,0,140,.13)';c.fillRect(0,0,W,H)}
 vignette(clamp((.3-s.p.hp/s.p.maxHp)/.3,0,1));
 hud();
 if(s.fade>0){screen();c.fillStyle=`rgba(5,3,13,${s.fade})`;c.fillRect(0,0,W,H)}
}
function drawPlayer(p){
 const s=S,col=p.form==='b'?'#2a8a1a':s.ch.color,cy=p.y-p.h/2,cid=s.cid,moving=Math.abs(p.vx)>30,lean=clamp(p.vx/s.ch.spd,-1,1)*.12;
 // estela del dash / intangibilidad
 for(const gh of p.ghosts){c.globalAlpha=gh.l*1.6;drawHero(c,gh.x,gh.y,{cid,col,face:gh.face,aim:gh.aim,run:gh.run,moving:1,t:s.t,ghost:1})}
 c.globalAlpha=bany('intang')?.35:p.inv>0&&Math.floor(s.t*20)%2?.45:1;
 if(p.buf.void){glow('#9b30ff',30);c.fillStyle='#9b30ff44';c.beginPath();c.arc(p.x,cy,34+Math.sin(s.t*9)*4,0,6.283);c.fill();c.shadowBlur=0}
 const eq=Save.d.shop.eq,cc=p.form==='b'?col:skinColor(eq.skin,col,s.t);  // cosméticos equipados (la forma bestia conserva su color)
 drawTrail(c,eq.trail,playerTrail(p,s.t,moving||p.dash||!p.ground),cc,s.t);drawAura(c,eq.aura,p.x,p.y,s.t,cc,true);
 light(c,p.x,cy,90,cc,.22);  // el héroe ilumina lo que le rodea
 drawSkinned(c,p.x,p.y,{cid,col,face:p.face,aim:p.aim,sx:p.sx,sy:p.sy,lean,run:p.run,moving,atk:p.atk,t:s.t,air:!p.ground,vy:p.vy,form:p.form,cape:p.cape||(p.cape={})},p.form==='b'?'':eq.skin);
 drawAura(c,eq.aura,p.x,p.y,s.t,cc,false);
 c.globalAlpha=1;
 if(p.buf.frost){c.strokeStyle='#bff4ff';c.lineWidth=2;c.strokeRect(p.x-p.w/2-3,p.y-p.h-3,p.w+6,p.h+6)}
 if(p.sh>0){c.strokeStyle='#5ab4ff';c.lineWidth=2;c.globalAlpha=.6;c.beginPath();c.arc(p.x,cy,30,0,6.283);c.stroke();c.globalAlpha=1}
 if(p.buf.aegis){glow('#c8d2ff',16);c.strokeStyle='#c8d2ff';c.lineWidth=3;c.globalAlpha=.4+.6*p.buf.aegis.absorb/(p.maxHp*.4);c.beginPath();c.arc(p.x,cy,36,0,6.283);c.stroke();c.globalAlpha=1}
 if(p.buf.fortress||p.buf.parry){glow('#fff',14);c.strokeStyle=p.buf.parry?'#fff':'#ffd23c';c.lineWidth=2;c.strokeRect(p.x-p.w/2-8,p.y-p.h-14,p.w+16,p.h+16)}
 if(p.buf.cocoon){c.fillStyle='#e6ff3c88';c.beginPath();c.ellipse(p.x,cy,22,30,0,0,6.283);c.fill()}
 c.shadowBlur=0;
 for(const k of SLOTS)if(p.chg[k]>0){const f=p.chg[k]/ab(k).max;c.fillStyle='#000a';c.fillRect(p.x-20,p.y-p.h-22,40,5);c.fillStyle=f>=1?'#fff':s.ch.color;c.fillRect(p.x-20,p.y-p.h-22,40*f,5)}
}

/* ===================== LOOP ===================== */
let last=performance.now();
function loop(now){const dt=clamp((now-last)/1000,0,.033);last=now;  // el primer fotograma puede llegar con una marca anterior a last: dt negativo rompía el fondo del menú
 chroma=Math.max(0,chroma-dt*3);pollInput();
 if(S){if(S.st==='play'){if(hitstop>0)hitstop-=dt;else update(dt)}draw()}else drawMenuBg(dt);
 requestAnimationFrame(loop)}
