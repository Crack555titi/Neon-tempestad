'use strict';
/* ===================== ETAPAS: carga, teletransportador y fondo ===================== */
let STAGE=null,PLAT=[],BG=null;
const TP_R=380,TP_CHARGE=60;  // radio y segundos de carga del teletransportador

function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// genera una vez las siluetas de cada capa (se repiten en mosaico al desplazar la cámara)
function genBg(st,seed){const rnd=rng(seed),L=W*2.4;
 BG={L,layers:st.layers.map(ly=>{const sh=[];for(let x=-100;x<L;){const w=ly.w[0]+rnd()*(ly.w[1]-ly.w[0]),h=ly.h[0]+rnd()*(ly.h[1]-ly.h[0]);sh.push({x,w,h,r:rnd()});x+=w*(ly.type==='peaks'?.55:ly.type==='domes'?1.4:1.3)+rnd()*40}return {ly,sh}}),
  stars:st.stars?Array.from({length:90},()=>({x:rnd()*W*2,y:rnd()*FLOOR,s:.5+rnd()*1.5})):[],
  amb:Array.from({length:st.amb.n},()=>({x:rnd()*W,y:rnd()*H,v:.6+rnd()*.8}))}}

function loadStage(i){
 const s=S,p=s.p,st=s.loop?loopStage(STAGES[i],s.loop):STAGES[i];STAGE=st;s.stage=i;s.phase=1;s.lava=0;s.walls=null;s.boss=null;s.bosses=[];s.bossDone=0;
 PLAT=st.plats.map(q=>Object.assign({},q));
 s.en=[];s.zn=[];s.sch=[];s.portal={a:null,b:null};s.dr=s.dr.filter(m=>m.perm&&m.life===Infinity);PR.clear();
 s.ints=[];const t=st.tp[Math.random()*st.tp.length|0];s.tp={x:t.x,y:t.y,state:'idle',charge:0};s.ints.push({k:'tp',x:t.x,y:t.y,open:0});
 for(let k=0;k<5+2*s.loop;k++)spawnChest();spawnAltar();s.chestT=40;s.altarT=150;s.spawn=3;
 p.x=t.x<WORLD/2?WORLD-250:250;p.y=60;p.vy=0;p.dash=null;p.hp=p.maxHp;  // empiezas lejos del teletransportador
 genBg(st,i*7919+13);s.fade=1;stormStage();hunterStage();npcStage();legacyStage();exploreStage();progStage();tempestStage();
 say(`${s.loop?`Loop ${s.loop+1} · `:''}Etapa ${i+1}/${STAGES.length}: ${st.name} · encuentra el teletransportador`);
}
/* ===================== MODO INFINITO =====================
   Con el teletransportador listo aparece un portal dual: a la izquierda «Terminar run» (puntuación al ranking) y a la
   derecha «Siguiente etapa», o tras la última etapa «Continuar ciclo (Loop +1)»: vuelta a la etapa 1 con otra paleta,
   enemigos exponencialmente más duros y numerosos, jefes duales y topes de estadísticas cada vez más altos. */
const LOOP_ATMOS=[null,{name:'Eclipse',hue:150,sat:.9,lum:-.1},{name:'Ceniza Tóxica',hue:95,sat:1.1,lum:-.05},{name:'Aurora Sangrienta',hue:-60,sat:1.25,lum:0},{name:'Vacío Blanco',hue:200,sat:.55,lum:.08}];
const loopAtmos=l=>LOOP_ATMOS[(l-1)%(LOOP_ATMOS.length-1)+1];
// gira el tono de un color #rrggbb(aa) y ajusta saturación y luz
function recolor(hex,a){const n=parseInt(hex.slice(1,7),16),al=hex.slice(7);let r=(n>>16)/255,g=(n>>8&255)/255,b=(n&255)/255;
 const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;let h=0,s=d?d/(1-Math.abs(2*l-1)):0;
 if(d)h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+a.hue+720)%360;s=clamp(s*a.sat,0,1);const L=clamp(l+a.lum,0,1);
 const C=(1-Math.abs(2*L-1))*s,X=C*(1-Math.abs(h/60%2-1)),m=L-C/2,[R,G,B]=h<60?[C,X,0]:h<120?[X,C,0]:h<180?[0,C,X]:h<240?[0,X,C]:h<300?[X,0,C]:[C,0,X];
 return '#'+[R,G,B].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('')+al}
// copia del escenario con todos sus colores recoloreados según la atmósfera del ciclo
function loopStage(st,l){const a=loopAtmos(l),walk=v=>typeof v==='string'&&/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v)?recolor(v,a):
 Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)])):v;
 return Object.assign(walk(st),{name:`${st.name} · ${a.name}`})}
function nextStage(){
 if(S.stage+1>=STAGES.length){S.loop++;Save.max('bestLoop',S.loop+1);hitStop(80);chromaHit(1.2);loadStage(0);saveRun();
  say(`¡LOOP ${S.loop+1}! ${loopAtmos(S.loop).name}: enemigos ×${Math.pow(1.5,S.loop).toFixed(1)} y jefes duales`);return}
 hitStop(60);loadStage(S.stage+1);saveRun();
}
// terminar la run tras derrotar al jefe: cuenta como victoria si se completó al menos un ciclo entero
function cashOut(){endGame(S.loop>0||S.stage>=STAGES.length-1,true)}
// en ciclos posteriores al primero el jefe llega acompañado de otro (cada uno con un 75% de vida)
const companionBoss=()=>STAGES[(S.stage+1+(S.loop-1)%(STAGES.length-1))%STAGES.length].boss;
function useTP(choice){const T=S.tp;
 if(T.state==='idle'){T.state='charging';Snd.play('tp');if(S.loop&&S.stage>=STAGES.length-1)spawnFusion();else if(S.loop){spawnBoss(null,{hp:.75,dx:-260});spawnBoss(companionBoss(),{hp:.75,dx:260})}else spawnBoss();
  say(S.loop?'¡JEFES DUALES! Quédate cerca del teletransportador para cargarlo':`¡Teletransportador activado! Quédate cerca para cargarlo`)}
 else if(T.state==='ready')(choice==='end'?cashOut:nextStage)();
 else say(S.boss?'Derrota al jefe y termina la carga':'El teletransportador aún se está cargando')}

function fallPit(){const p=S.p;
 // el abismo duele y te devuelve a la plataforma activa más cercana
 let best=null,bd=1e9;for(const q of PLAT)if(q.on){const d=Math.abs(q.rx+q.w/2-p.x);if(d<bd){bd=d;best=q}}
 if(best){p.x=clamp(p.x,best.rx+12,best.rx+best.w-12);p.y=best.ry}p.vy=0;p.dash=null;p.inv=Math.max(p.inv,1);
 say('¡Caíste al abismo!');drainP(p.maxHp*.12)}

function updStage(dt){
 const s=S,p=s.p,T=s.tp;
 if(T.state==='charging'){const inR=hyp(p.x-T.x,p.y-T.y)<TP_R;if(inR)T.charge=Math.min(1,T.charge+dt/TP_CHARGE);T.out=!inR;
  if(T.charge>=1&&s.bossDone){T.state='ready';Snd.play('tp');say(`¡Portal dual abierto! ${keyName(BIND.interact[0])} a la izquierda: terminar run · a la derecha: ${s.stage>=STAGES.length-1?'Loop +1':'seguir'}`)}}
 // lava (Hidra): el suelo sólido quema
 if(s.lava&&p.ground&&p.plat&&p.plat.solid){s.lavaT=(s.lavaT||0)-dt;if(s.lavaT<=0){s.lavaT=.5;hurtP(p.maxHp*.06)}}
 // paredes que se cierran (Arconte, fase 3)
 const Wl=s.walls;if(Wl){Wl.l=Math.min(Wl.cx-420,Wl.l+45*dt);Wl.r=Math.max(Wl.cx+420,Wl.r-45*dt);
  if(p.x<Wl.l+12||p.x>Wl.r-12){p.x=clamp(p.x,Wl.l+12,Wl.r-12);hurtP(p.maxHp*.08)}}
 if(p.y>H+60)fallPit();
 updAmb(dt);
}
function updAmb(dt){const a=STAGE.amb;for(const q of BG.amb){q.x+=a.vx*q.v*dt;q.y+=a.vy*q.v*dt;if(q.y<-10)q.y=H+10;if(q.y>H+10)q.y=-10;if(q.x<-10)q.x=W+10;if(q.x>W+10)q.x=-10}}

/* ---------- dibujo ---------- */
/* 4 capas: cielo con estrellas, 3 siluetas con parallax y niebla en primer plano (drawFog).
   Ciclo de color: el cielo cambia con la fase del jefe y el horizonte late con el color del escenario. */
function drawBg(cam,bp,t){
 const st=STAGE,g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,st.sky[bp]);g.addColorStop(1,st.ground);c.fillStyle=g;c.fillRect(0,0,W,H);
 const hz=c.createLinearGradient(0,FLOOR-220,0,FLOOR+20);hz.addColorStop(0,'rgba(0,0,0,0)');hz.addColorStop(1,st.plat.glow);
 c.globalAlpha=.12+.08*Math.sin(t*.6)+bp*.04;c.fillStyle=hz;c.fillRect(0,FLOOR-220,W,240);c.globalAlpha=1;
 c.fillStyle='#fff';for(const s of BG.stars){c.globalAlpha=(.3+s.s/3)*(.7+.3*Math.sin(t*2+s.x));c.fillRect((s.x-cam*.05+W*4)%(W*2)-W*.5,s.y,s.s,s.s)}c.globalAlpha=1;
 for(const {ly,sh} of BG.layers){const off=(cam*ly.par)%BG.L;c.fillStyle=ly.col;
  for(let rep=0;rep<2;rep++)for(const o of sh){const x=o.x-off+rep*BG.L;if(x>W+20||x+o.w<-20)continue;drawSil(ly,o,x)}}
 const a=st.amb,n=Math.ceil(BG.amb.length*QL.amb);c.fillStyle=a.col;c.strokeStyle=a.col;c.lineWidth=1;c.globalAlpha=.55;
 for(let i=0;i<n;i++){const q=BG.amb[i];if(a.line){c.beginPath();c.moveTo(q.x,q.y);c.lineTo(q.x-a.vx*.04,q.y-a.vy*.04);c.stroke()}else c.fillRect(q.x,q.y,a.s*(a.sq?1.5:1),a.s*(a.sq?1.5:1))}
 c.globalAlpha=1;
}
// niebla en primer plano (coordenadas de pantalla): banda baja que ondula más rápido que la cámara
function drawFog(cam,t){if(!QL.post)return;c.save();c.setTransform(K,0,0,K,0,0);const col=STAGE.plat.glow;
 for(let k=0;k<2;k++){const off=(cam*1.25+t*20*(k?-1:1))%400;c.globalAlpha=.07;c.fillStyle=col;c.beginPath();c.moveTo(0,H);
  for(let x=-400;x<=W+400;x+=40)c.lineTo(x-off,FLOOR+30-k*25+Math.sin((x+k*200)/90+t)*10);c.lineTo(W,H);c.closePath();c.fill()}
 c.restore()}
/* menú: el fondo recorre los escenarios con un fundido entre ellos */
const MENU={t:0,i:-1};
function drawMenuBg(dt){MENU.t+=dt;const i=Math.floor(MENU.t/12)%STAGES.length,ph=MENU.t%12;
 if(i!==MENU.i){MENU.i=i;STAGE=STAGES[i];PLAT=STAGE.plats.map(q=>Object.assign({},q,{rx:q.x,ry:q.y,on:q.ph[0]===1}));genBg(STAGE,i*7919+13)}
 updAmb(dt);screen();drawBg(MENU.t*45,0,MENU.t);
 c.save();c.translate(-((MENU.t*45)%(WORLD-W)),0);for(const q of PLAT)if(q.on){c.fillStyle=q.solid?STAGE.plat.floor:STAGE.plat.fill;c.globalAlpha=.6;c.fillRect(q.rx,q.ry,q.w,q.h)}c.restore();c.globalAlpha=1;
 drawFog(MENU.t*45,MENU.t);bloom();vignette(0);
 const f=ph<1?1-ph:ph>11?ph-11:0;if(f>0){c.fillStyle=`rgba(5,3,13,${f})`;c.fillRect(0,0,W,H)}
 drawPreview(MENU.t);drawShopPreview(MENU.t);if($('title').style.display!=='none')drawParade(MENU.t);
}
function drawSil(ly,o,x){const b=FLOOR+10;c.beginPath();
 switch(ly.type){
  case 'peaks':c.moveTo(x,b);c.lineTo(x+o.w/2,b-o.h);c.lineTo(x+o.w,b);break;
  case 'spires':c.moveTo(x,b);c.lineTo(x+o.w*.4,b-o.h);c.lineTo(x+o.w*.6,b-o.h);c.lineTo(x+o.w,b);break;
  case 'domes':c.moveTo(x,b);c.arc(x+o.w/2,b,o.w/2,Math.PI,0);break;
  default:c.rect(x,b-o.h,o.w,o.h);if(ly.type==='towers')c.rect(x+o.w/2-2,b-o.h-24,4,24)}
 c.fill();
 if(ly.lights){c.fillStyle=ly.lights;c.globalAlpha=.5;for(let k=0;k<4;k++)if((o.r*(k+3)*7%1)>.45)c.fillRect(x+6+(k%2)*(o.w-16),b-o.h+10+(k>>1)*18,4,5);c.globalAlpha=1;c.fillStyle=ly.col}
 if(ly.cross&&o.r>.5){c.fillStyle=ly.cross;c.globalAlpha=.4;c.fillRect(x+o.w/2-1,b-o.h-14,2,12);c.fillRect(x+o.w/2-5,b-o.h-10,10,2);c.globalAlpha=1;c.fillStyle=ly.col}
}
function drawPlats(){
 const P=STAGE.plat,lava=S.lava;
 for(const q of PLAT){if(!q.on)continue;const blink=q.bl&&S.phase>=q.bl;
  glow(lava&&q.solid?'#ff4a1a':P.glow,12);c.fillStyle=q.solid?(lava?'#5a1404':P.floor):P.fill;c.strokeStyle=lava&&q.solid?'#ff7a1a':P.edge;c.lineWidth=2;
  if(blink)c.globalAlpha=.55+.45*Math.sin(S.t*8);
  c.fillRect(q.rx,q.ry,q.w,q.h);if(q.solid){c.beginPath();c.moveTo(q.rx,q.ry);c.lineTo(q.rx+q.w,q.ry);c.stroke()}else c.strokeRect(q.rx,q.ry,q.w,q.h);c.globalAlpha=1}
 c.shadowBlur=0;
 const Wl=S.walls;if(Wl){c.fillStyle='rgba(255,60,120,.25)';c.fillRect(Wl.l-2000,0,2000,H);c.fillRect(Wl.r,0,2000,H);glow('#ff3c6a',20);c.strokeStyle='#ff3c6a';c.lineWidth=3;
  c.beginPath();c.moveTo(Wl.l,0);c.lineTo(Wl.l,FLOOR);c.moveTo(Wl.r,0);c.lineTo(Wl.r,FLOOR);c.stroke();c.shadowBlur=0}
}
function drawTP(){const T=S.tp,col=T.state==='ready'?'#4cff7a':T.state==='charging'?'#ffd23c':'#3cf0ff';
 glow(col,18);c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.ellipse(T.x,T.y-4,46,10,0,0,6.283);c.stroke();
 c.fillStyle=col;c.globalAlpha=.25+.15*Math.sin(S.t*4);c.fillRect(T.x-30,T.y-70*(T.state==='idle'?.4:1),60,70*(T.state==='idle'?.4:1));c.globalAlpha=1;
 if(T.state==='charging'){c.globalAlpha=.25;c.setLineDash([10,8]);c.beginPath();c.arc(T.x,T.y,TP_R,0,6.283);c.stroke();c.setLineDash([]);c.globalAlpha=1;
  c.font='bold 13px monospace';c.textAlign='center';c.fillText(Math.floor(T.charge*100)+'%',T.x,T.y-80)}
 if(T.state==='ready')for(const [s,cl,lb] of [[-1,'#ffd23c','TERMINAR'],[1,'#ff3cf2',S.stage>=STAGES.length-1?'LOOP +1':'SEGUIR']]){
  const x=T.x+s*58,y=T.y-40,on=(S.p.x<T.x)===(s<0)&&hyp(S.p.x-T.x,S.p.y-T.y)<140,r=26+Math.sin(S.t*3+s)*2;glow(cl,on?26:12);c.strokeStyle=cl;c.lineWidth=on?4:2.5;
  c.beginPath();c.ellipse(x,y,r*.6,r,0,0,6.283);c.stroke();c.globalAlpha=on?.35:.15;c.fillStyle=cl;c.fill();c.globalAlpha=1;
  c.save();c.translate(x,y);c.rotate(S.t*2*s);c.setLineDash([4,6]);c.beginPath();c.ellipse(0,0,r*.38,r*.7,0,0,6.283);c.stroke();c.restore();c.setLineDash([]);
  c.font='bold 11px monospace';c.textAlign='center';c.fillStyle=cl;c.fillText(lb,x,y-r-8)}
 c.shadowBlur=0}

/* pantalla de inicio: héroes corriendo por el suelo; el primero es el tuyo con la skin, estela y aura equipadas */
const PARADE={capes:{},trails:[]};
function drawParade(t){const ids=[selC,...Object.keys(CHARS).filter(k=>k!==selC&&isUnlocked(k))].slice(0,5),eq=Save.d.shop.eq;
 screen();ids.forEach((id,i)=>{const sp=150+i*14,x=((t*sp+i*W/5)%(W+160))-80,y=FLOOR,v=CHARS[id],mine=i===0,col=mine?skinColor(eq.skin,v.color,t):v.color;
  if(mine){const tr=PARADE.trails;tr.push({x,y:y-22,t});while(tr.length&&(t-tr[0].t>.45||tr[0].x>x))tr.shift();
   drawTrail(c,eq.trail,tr.map(q=>({x:q.x,y:q.y,a:(t-q.t)/.45})).reverse(),col,t);drawAura(c,eq.aura,x,y,t,col,true)}
  c.globalAlpha=mine?1:.55;const o={cid:id,col:v.color,face:1,aim:Math.sin(t*1.5+i)*.4-.2,run:t*sp/14,moving:1,t,cape:PARADE.capes[id]||(PARADE.capes[id]={})};
  mine?drawSkinned(c,x,y,o,eq.skin):drawHero(c,x,y,o);c.globalAlpha=1;if(mine)drawAura(c,eq.aura,x,y,t,col,false)})}
