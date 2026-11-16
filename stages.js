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
 const s=S,p=s.p,st=STAGES[i];STAGE=st;s.stage=i;s.phase=1;s.lava=0;s.walls=null;s.boss=null;s.bossDone=0;
 PLAT=st.plats.map(q=>Object.assign({},q));
 s.en=[];s.zn=[];s.sch=[];s.portal={a:null,b:null};s.dr=s.dr.filter(m=>m.perm&&m.life===Infinity);PR.clear();
 s.ints=[];const t=st.tp[Math.random()*st.tp.length|0];s.tp={x:t.x,y:t.y,state:'idle',charge:0};s.ints.push({k:'tp',x:t.x,y:t.y,open:0});
 for(let k=0;k<5;k++)spawnChest();spawnAltar();s.chestT=40;s.altarT=150;s.spawn=3;
 p.x=t.x<WORLD/2?WORLD-250:250;p.y=60;  // empiezas lejos del teletransportadorp.vy=0;p.dash=null;p.hp=p.maxHp;
 genBg(st,i*7919+13);
 say(`Etapa ${i+1}/${STAGES.length}: ${st.name} · encuentra el teletransportador`);
}
function nextStage(){
 if(S.stage+1>=STAGES.length){S.bossName='la Tempestad';return endGame(true)}
 hitStop(60);loadStage(S.stage+1);saveRun();
}
function useTP(){const T=S.tp;
 if(T.state==='idle'){T.state='charging';spawnBoss();say(`¡Teletransportador activado! Quédate cerca para cargarlo`)}
 else if(T.state==='ready')nextStage();
 else say(S.boss?'Derrota al jefe y termina la carga':'El teletransportador aún se está cargando')}

function fallPit(){const p=S.p;
 // el abismo duele y te devuelve a la plataforma activa más cercana
 let best=null,bd=1e9;for(const q of PLAT)if(q.on){const d=Math.abs(q.rx+q.w/2-p.x);if(d<bd){bd=d;best=q}}
 if(best){p.x=clamp(p.x,best.rx+12,best.rx+best.w-12);p.y=best.ry}p.vy=0;p.dash=null;p.inv=Math.max(p.inv,1);
 say('¡Caíste al abismo!');drainP(p.maxHp*.12)}

function updStage(dt){
 const s=S,p=s.p,T=s.tp;
 if(T.state==='charging'){const inR=hyp(p.x-T.x,p.y-T.y)<TP_R;if(inR)T.charge=Math.min(1,T.charge+dt/TP_CHARGE);T.out=!inR;
  if(T.charge>=1&&s.bossDone){T.state='ready';say('¡Teletransportador listo! Pulsa E sobre él para continuar')}}
 // lava (Hidra): el suelo sólido quema
 if(s.lava&&p.ground&&p.plat&&p.plat.solid){s.lavaT=(s.lavaT||0)-dt;if(s.lavaT<=0){s.lavaT=.5;hurtP(p.maxHp*.06)}}
 // paredes que se cierran (Arconte, fase 3)
 const Wl=s.walls;if(Wl){Wl.l=Math.min(Wl.cx-420,Wl.l+45*dt);Wl.r=Math.max(Wl.cx+420,Wl.r-45*dt);
  if(p.x<Wl.l+12||p.x>Wl.r-12){p.x=clamp(p.x,Wl.l+12,Wl.r-12);hurtP(p.maxHp*.08)}}
 if(p.y>H+60)fallPit();
 const a=STAGE.amb;for(const q of BG.amb){q.x+=a.vx*q.v*dt;q.y+=a.vy*q.v*dt;if(q.y<-10)q.y=H+10;if(q.y>H+10)q.y=-10;if(q.x<-10)q.x=W+10;if(q.x>W+10)q.x=-10}
}

/* ---------- dibujo ---------- */
function drawBg(){
 const s=S,st=STAGE,bp=s.boss?s.boss.ph:0,g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,st.sky[bp]);g.addColorStop(1,st.ground);c.fillStyle=g;c.fillRect(0,0,W,H);
 c.fillStyle='#fff';for(const t of BG.stars){c.globalAlpha=.3+t.s/3;c.fillRect((t.x-s.cam*.05+W*4)%(W*2)-W*.5,t.y,t.s,t.s)}c.globalAlpha=1;
 for(const {ly,sh} of BG.layers){const off=(s.cam*ly.par)%BG.L;c.fillStyle=ly.col;
  for(let rep=0;rep<2;rep++)for(const o of sh){const x=o.x-off+rep*BG.L;if(x>W+20||x+o.w<-20)continue;drawSil(ly,o,x)}}
 const a=st.amb;c.fillStyle=a.col;c.strokeStyle=a.col;c.lineWidth=1;c.globalAlpha=.55;
 for(const q of BG.amb){if(a.line){c.beginPath();c.moveTo(q.x,q.y);c.lineTo(q.x-a.vx*.04,q.y-a.vy*.04);c.stroke()}else c.fillRect(q.x,q.y,a.s*(a.sq?1.5:1),a.s*(a.sq?1.5:1))}
 c.globalAlpha=1;
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
 c.shadowBlur=0}
