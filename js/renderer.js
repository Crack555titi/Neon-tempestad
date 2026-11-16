'use strict';
/* ===================== RENDERER: arte procedural de héroes y enemigos, luz y sacudida =====================
   Todo se dibuja con primitivas del canvas (sin sprites). Las funciones reciben el contexto `g`
   para poder pintar también la vista previa del menú. */
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
const TAU=Math.PI*2;
// mezcla un color #rrggbb con negro (k<0) o blanco (k>0)
function shade(col,k){const n=parseInt(col.slice(1,7),16),f=v=>Math.round(k<0?v*(1+k):v+(255-v)*k);
 return `rgb(${f(n>>16)},${f(n>>8&255)},${f(n&255)})`}

/* ---------- luz aditiva y sacudida direccional ---------- */
// halo de luz que suma color a lo que hay debajo ('lighter'); se omite en calidad baja
function light(g,x,y,r,col,a){if(!QL.glow)return;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');
 g.save();g.globalCompositeOperation='lighter';g.globalAlpha=a;g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);g.restore()}
// empujón de cámara en una dirección (golpe recibido, retroceso); se suma al temblor aleatorio y vuelve como un muelle
const KICK={x:0,y:0,vx:0,vy:0};
function kick(ang,amt){KICK.vx+=Math.cos(ang)*amt*30;KICK.vy+=Math.sin(ang)*amt*30}
function updKick(dt){for(const a of ['x','y']){const v='v'+a;KICK[v]+=(-KICK[a]*220-KICK[v]*16)*dt;KICK[a]+=KICK[v]*dt}}

/* ---------- héroes: esqueleto articulado + equipo propio de cada personaje ----------
   HERO[cid]: arma (w), casco (head), capa {len, col} y accesorios (acc) que se dibujan delante (front) o detrás (back). */
const HERO={
 vanguard:{w:'sword',head:'helm',cape:{len:6,col:'#a02010'},acc:['pauldron']},
 bastion:{w:'mace',head:'greathelm',bulk:1.2,acc:['towershield']},
 duelist:{w:'rapier',head:'hat',cape:{len:5,col:'#c03a90',w:4},acc:[]},
 titan:{w:'hammer',head:'greathelm',bulk:1.3,acc:['pauldron','pauldron2']},
 artillery:{w:'cannon',head:'visor',acc:['drum']},
 demo:{w:'launcher',head:'goggles',acc:['bandolier']},
 hawk:{w:'rifle',head:'hood',cape:{len:6,col:'#2f6a14'},acc:['monocle']},
 volt:{w:'gauntlet',head:'visor',acc:['coils']},
 summoner:{w:'spindle',head:'hood',cape:{len:5,col:'#1a7a4a'},acc:['threads']},
 necro:{w:'bonestaff',head:'hood',cape:{len:7,col:'#3a2060',tatter:1},acc:['lantern']},
 engineer:{w:'wrench',head:'hardhat',acc:['blueprints']},
 hive:{w:'stinger',head:'goggles',acc:['comb','bees']},
 chrono:{w:'hourstaff',head:'visor',cape:{len:6,col:'#156a80'},acc:['rings']},
 paradox:{w:'prism',head:'split',acc:['echo']},
 graviton:{w:'orb',head:'visor',acc:['singularity']},
 portal:{w:'chakram',head:'visor',acc:['gate']},
 hemo:{w:'dagger',head:'hood',cape:{len:8,col:'#7a0018'},acc:['bloodorbs']},
 berserk:{w:'axe',head:'horns',bulk:1.15,acc:['fur','rage']},
 voidborn:{w:'voidhand',head:'eye',acc:['tendrils']},
 chimera:{w:'claw',head:'mask',acc:['tail']}};

/* capa: cadena de puntos con integración de Verlet en coordenadas del mundo (se queda atrás al correr y cae al saltar) */
function stepCape(cp,ax,ay,f,t,n){
 if(!cp.pts||cp.pts.length!==n){cp.pts=Array.from({length:n},(_,i)=>({x:ax-f*i*5,y:ay+i*2,px:ax-f*i*5,py:ay+i*2}));cp.t=t}
 const dt=Math.min(.05,Math.max(0,t-cp.t));cp.t=t;const P=cp.pts;P[0].x=ax;P[0].y=ay;
 if(dt>0)for(let i=1;i<n;i++){const q=P[i],vx=(q.x-q.px)*.94,vy=(q.y-q.py)*.94;q.px=q.x;q.py=q.y;
  q.x+=vx-f*20*dt*dt*60+Math.sin(t*3+i)*.15;q.y+=vy+900*dt*dt}
 for(let it=0;it<3;it++)for(let i=1;i<n;i++){const a=P[i-1],b=P[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,k=(d-5)/d;b.x-=dx*k;b.y-=dy*k}
 return P}
function drawCape(g,P,col,w,tatter){g.lineCap='round';g.strokeStyle=col;
 for(let i=1;i<P.length;i++){g.lineWidth=Math.max(2,w*(1-i/P.length*.5));if(tatter&&i===P.length-1)g.setLineDash([3,2]);
  g.beginPath();g.moveTo(P[i-1].x,P[i-1].y);g.lineTo(P[i].x,P[i].y);g.stroke()}g.setLineDash([])}

// segmento de extremidad (dos tramos) desde (x,y) con ángulos desde la vertical
function limb(g,x,y,a1,a2,l1,l2,w,col){const kx=x+Math.sin(a1)*l1,ky=y+Math.cos(a1)*l1,fx=kx+Math.sin(a2)*l2,fy=ky+Math.cos(a2)*l2;
 g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.lineTo(kx,ky);g.lineTo(fx,fy);g.stroke();return [fx,fy]}

/* armas: se dibujan en el sistema de la mano, apuntando a +x */
function drawWeapon(g,w,col,t,atk){const lite=shade(col,.55);g.lineCap='round';
 const blade=(len,wid,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(0,-wid);g.lineTo(len,0);g.lineTo(0,wid);g.closePath();g.fill()};
 switch(w){
 case 'sword':g.fillStyle='#ccc';g.fillRect(-1,-4,3,8);blade(22,2.6,lite);g.fillStyle=col;g.globalAlpha=.6+.4*Math.sin(t*20);g.fillRect(4,-1,16,2);g.globalAlpha=1;break;
 case 'rapier':g.strokeStyle='#ffd23c';g.lineWidth=1.5;g.beginPath();g.arc(1,0,4,-1.4,1.4);g.stroke();g.strokeStyle=lite;g.lineWidth=1.6;g.beginPath();g.moveTo(1,0);g.lineTo(27,0);g.stroke();break;
 case 'mace':g.strokeStyle='#999';g.lineWidth=3;g.beginPath();g.moveTo(0,0);g.lineTo(13,0);g.stroke();g.fillStyle=lite;g.beginPath();g.arc(16,0,5,0,TAU);g.fill();
  for(let i=0;i<6;i++){const a=i/6*TAU;g.fillRect(16+Math.cos(a)*6-1,Math.sin(a)*6-1,2.5,2.5)}break;
 case 'hammer':g.strokeStyle='#8a6a4a';g.lineWidth=3;g.beginPath();g.moveTo(-4,0);g.lineTo(18,0);g.stroke();g.fillStyle=lite;rr(g,14,-9,10,18,2);g.fill();g.fillStyle=col;g.fillRect(16,-9,2,18);break;
 case 'cannon':g.fillStyle='#556';rr(g,-3,-5,22,10,3);g.fill();g.fillStyle=lite;g.fillRect(15,-6,6,12);g.fillStyle=col;g.fillRect(2,-2,10,4);break;
 case 'launcher':g.fillStyle='#665';g.fillRect(0,-3,20,6);g.fillStyle=lite;g.beginPath();g.arc(6,3,5,0,TAU);g.fill();g.fillStyle='#222';g.beginPath();g.arc(6,3,2,0,TAU);g.fill();break;
 case 'rifle':g.fillStyle='#3a3a2a';g.fillRect(-6,-2,32,4);g.fillStyle=lite;g.fillRect(4,-6,10,3);g.fillStyle='#ff3c3c';g.fillRect(13,-5.5,1.5,2);g.fillStyle='#222';g.fillRect(-6,0,6,4);break;
 case 'gauntlet':g.fillStyle=lite;rr(g,-2,-5,10,10,3);g.fill();g.strokeStyle='#bfe8ff';g.lineWidth=1.2;g.beginPath();g.moveTo(8,0);
  for(let i=1;i<5;i++)g.lineTo(8+i*4,Math.sin(t*40+i*2)*3);g.stroke();break;
 case 'spindle':g.strokeStyle='#c8a060';g.lineWidth=2;g.beginPath();g.moveTo(-6,0);g.lineTo(18,0);g.stroke();g.fillStyle=lite;g.beginPath();g.ellipse(18,0,4,6,t*3,0,TAU);g.fill();break;
 case 'bonestaff':g.strokeStyle='#e8e0c8';g.lineWidth=2.5;g.beginPath();g.moveTo(-8,0);g.lineTo(18,0);g.stroke();g.fillStyle='#e8e0c8';g.beginPath();g.arc(21,0,4.5,0,TAU);g.fill();
  g.fillStyle=col;g.fillRect(20,-2,1.6,1.6);g.fillRect(22.4,-2,1.6,1.6);break;
 case 'wrench':g.strokeStyle='#bbb';g.lineWidth=3;g.beginPath();g.moveTo(0,0);g.lineTo(14,0);g.stroke();g.strokeStyle=lite;g.lineWidth=3.5;g.beginPath();g.arc(17,0,4,.9,TAU-.9);g.stroke();break;
 case 'stinger':g.fillStyle='#ffd23c';rr(g,-2,-4,14,8,4);g.fill();g.fillStyle='#222';for(let i=0;i<3;i++)g.fillRect(1+i*4,-4,1.6,8);blade(10,1.6,lite);g.save();g.translate(12,0);blade(8,1.6,lite);g.restore();break;
 case 'hourstaff':g.strokeStyle='#d8c890';g.lineWidth=2;g.beginPath();g.moveTo(-6,0);g.lineTo(16,0);g.stroke();g.save();g.translate(20,0);g.rotate(t*1.5);g.fillStyle=lite;
  g.beginPath();g.moveTo(-4,-5);g.lineTo(4,-5);g.lineTo(-4,5);g.lineTo(4,5);g.closePath();g.fill();g.restore();break;
 case 'prism':g.save();g.translate(12,0);g.rotate(t*2);g.fillStyle=lite;g.beginPath();g.moveTo(0,-7);g.lineTo(6,4);g.lineTo(-6,4);g.closePath();g.fill();
  g.strokeStyle='#fff';g.lineWidth=1;g.stroke();g.restore();break;
 case 'orb':g.fillStyle='#120a26';g.beginPath();g.arc(10,0,6,0,TAU);g.fill();g.strokeStyle=lite;g.lineWidth=1.5;g.beginPath();g.ellipse(10,0,10,3,t*2,0,TAU);g.stroke();break;
 case 'chakram':g.save();g.translate(10,0);g.rotate(t*8);g.strokeStyle=lite;g.lineWidth=2.5;g.beginPath();g.arc(0,0,7,0,TAU);g.stroke();
  for(let i=0;i<4;i++){g.rotate(TAU/4);g.fillStyle=lite;g.beginPath();g.moveTo(7,-2);g.lineTo(11,0);g.lineTo(7,2);g.fill()}g.restore();break;
 case 'dagger':g.fillStyle='#444';g.fillRect(-2,-1.5,6,3);blade(14,2.4,'#ff3c5a');break;
 case 'axe':g.strokeStyle='#7a5a3a';g.lineWidth=3;g.beginPath();g.moveTo(-4,0);g.lineTo(20,0);g.stroke();g.fillStyle=lite;g.beginPath();g.moveTo(14,-1);g.quadraticCurveTo(22,-14,26,-8);
  g.lineTo(22,0);g.lineTo(26,8);g.quadraticCurveTo(22,14,14,1);g.closePath();g.fill();break;
 case 'voidhand':g.fillStyle='#9b30ff';for(let i=-1;i<=1;i++){g.beginPath();g.moveTo(0,i*3);g.quadraticCurveTo(8,i*5+Math.sin(t*6+i)*2,14,i*6);g.lineTo(12,i*3);g.fill()}break;
 case 'claw':g.fillStyle='#e8e0c8';for(let i=-1;i<=1;i++){g.beginPath();g.moveTo(2,i*3-1);g.quadraticCurveTo(10,i*4,14,i*5+3);g.lineTo(3,i*3+1.5);g.fill()}break;
 default:g.fillStyle=col;g.fillRect(-2,-3,12,6)}}

/* o: {cid, col, face, aim, sx, sy, lean, run, moving, atk (0..1), t, air, vy, cape (estado de la capa), form, ghost} */
function drawHero(g,x,y,o){
 const H=HERO[o.cid]||HERO.vanguard,f=o.face||1,col=o.col,t=o.t,mv=o.moving?1:0,air=o.air,bulk=H.bulk||1,glowOn=QL.glow&&!o.ghost;
 const dark=shade(col,-.45),bob=mv&&!air?-Math.abs(Math.sin(o.run))*2:Math.sin(t*3)*.8;
 const hipY=-17+bob,chestY=hipY-16,headY=chestY-8;
 // capa (coordenadas del mundo, detrás de todo)
 if(H.cape&&o.cape&&!o.ghost){const P=stepCape(o.cape,x-f*3,y+(chestY+2)*(o.sy||1),f,t,H.cape.len);drawCape(g,P,H.cape.col,H.cape.w||7,H.cape.tatter)}
 g.save();g.translate(x,y);g.rotate(o.lean||0);g.scale((o.sx||1)*f,o.sy||1);
 const la=f>0?o.aim:Math.PI-o.aim;  // ángulo de apuntado en el espacio espejado (siempre mirando a +x)
 g.lineCap='round';g.lineJoin='round';
 back(g,H,o,col,dark,t,chestY,headY,bob);
 // piernas: zancada con rodilla que se dobla hacia atrás; recogidas al subir y estiradas al caer
 for(const s of [1,-1]){const ph=o.run+(s>0?0:Math.PI);let a1,a2;
  if(air){const up=(o.vy||0)<0;a1=s>0?(up?1:.35):(up?-.25:-.1);a2=a1-(s>0?(up?1.5:.5):.6)}
  else{a1=Math.sin(ph)*.75*mv;a2=a1-Math.max(0,-Math.cos(ph))*1.2*mv}
  const [fx,fy]=limb(g,s>0?2:-2,hipY,a1,a2,9,9,s>0?5:4.5,s>0?col:dark);
  g.fillStyle=s>0?shade(col,-.2):dark;rr(g,fx-2,fy-2.5,7,4,1.5);g.fill()}
 // brazo trasero: balanceo opuesto a la pierna
 limb(g,-3,chestY+3,-Math.sin(o.run)*.7*mv-(air?.9:.15),-Math.sin(o.run)*.7*mv-(air?1.6:.5),7,7,3.5,dark);
 // torso: más ancho de hombros que de cintura
 if(glowOn){g.shadowColor=col;g.shadowBlur=14*K}
 const sw=9.5*bulk,ww=6.5*bulk;g.fillStyle=col;g.beginPath();g.moveTo(-ww,hipY+1);g.lineTo(-sw,chestY+2);g.quadraticCurveTo(0,chestY-3,sw,chestY+2);g.lineTo(ww,hipY+1);g.closePath();g.fill();g.shadowBlur=0;
 g.fillStyle=dark;g.fillRect(-ww,hipY-3,ww*2,3);  // cinturón
 g.fillStyle='rgba(255,255,255,.28)';g.fillRect(-sw+3,chestY+3,3,10);  // brillo
 head(g,H,col,dark,t,headY,o);
 // brazo delantero + arma hacia el cursor; al atacar retrocede (anticipación) y se extiende
 const sx0=3,sy0=chestY+3,reach=12-(o.atk||0)*5,hx=sx0+Math.cos(la)*reach,hy=sy0+Math.sin(la)*reach,ex=(sx0+hx)/2-Math.sin(la)*2,ey=(sy0+hy)/2+Math.abs(Math.cos(la))*3;
 g.strokeStyle=shade(col,.15);g.lineWidth=4;g.beginPath();g.moveTo(sx0,sy0);g.lineTo(ex,ey);g.lineTo(hx,hy);g.stroke();
 g.save();g.translate(hx,hy);g.rotate(la+(o.atk||0)*-.5);if(glowOn){g.shadowColor=col;g.shadowBlur=10*K}drawWeapon(g,H.w,col,t,o.atk||0);g.restore();g.shadowBlur=0;
 front(g,H,o,col,t,chestY,headY,bob);
 g.restore();
}
function head(g,H,col,dark,t,hy,o){const lite=shade(col,.6);g.fillStyle=col;
 switch(H.head){
 case 'greathelm':rr(g,-7,hy-8,14,15,3);g.fill();g.fillStyle='#fff';g.fillRect(-1,hy-3,8,2.5);g.fillRect(2,hy-3,2,7);break;
 case 'hood':g.beginPath();g.moveTo(-8,hy+6);g.quadraticCurveTo(-9,hy-9,1,hy-12);g.quadraticCurveTo(9,hy-6,8,hy+5);g.closePath();g.fill();
  g.fillStyle='#05030d';g.beginPath();g.ellipse(3,hy,4.5,5,0,0,TAU);g.fill();g.fillStyle=lite;g.fillRect(3,hy-1,3,2);break;
 case 'hat':g.beginPath();g.arc(1,hy,6.5,0,TAU);g.fill();g.fillStyle=dark;g.fillRect(-9,hy-6,19,2.5);rr(g,-5,hy-12,11,7,2);g.fill();
  g.strokeStyle='#ffd23c';g.lineWidth=1.5;g.beginPath();g.moveTo(-4,hy-11);g.quadraticCurveTo(-12,hy-18,-14,hy-11);g.stroke();g.fillStyle='#fff';g.fillRect(3,hy-1,4,2);break;
 case 'goggles':g.beginPath();g.arc(1,hy,7,0,TAU);g.fill();g.fillStyle='#222';g.fillRect(-7,hy-3,15,4);g.fillStyle=lite;g.beginPath();g.arc(4,hy-1,2.6,0,TAU);g.arc(-1,hy-1,2.2,0,TAU);g.fill();break;
 case 'hardhat':g.beginPath();g.arc(1,hy,7,0,TAU);g.fill();g.fillStyle='#ffd23c';g.beginPath();g.arc(1,hy-2,7.5,Math.PI,0);g.fill();g.fillRect(-7,hy-2,17,2);
  g.fillStyle='#fff';g.fillRect(2,hy+1,5,2);break;
 case 'horns':g.beginPath();g.arc(1,hy,7,0,TAU);g.fill();g.fillStyle='#e8e0c8';for(const s of [-1,1]){g.beginPath();g.moveTo(1+s*4,hy-5);g.quadraticCurveTo(1+s*12,hy-8,1+s*10,hy-16);g.lineTo(1+s*6,hy-6);g.fill()}
  g.fillStyle='#ff3c1a';g.fillRect(2,hy-1,5,2);break;
 case 'eye':g.fillStyle=dark;g.beginPath();g.arc(1,hy,7,0,TAU);g.fill();g.fillStyle='#d070ff';g.shadowColor='#d070ff';g.shadowBlur=QL.glow?10:0;g.beginPath();g.arc(3,hy-1,2.6+Math.sin(t*5)*.6,0,TAU);g.fill();g.shadowBlur=0;break;
 case 'mask':g.beginPath();g.arc(1,hy,7,0,TAU);g.fill();g.fillStyle='#e8e0c8';g.beginPath();g.moveTo(1,hy-7);g.lineTo(8,hy-2);g.lineTo(6,hy+5);g.lineTo(1,hy+6);g.closePath();g.fill();
  g.fillStyle=o.form==='b'?'#2aff1a':'#ff3c3c';g.fillRect(3,hy-2,3,2);break;
 case 'split':g.beginPath();g.arc(1,hy,7,0,TAU);g.fill();g.fillStyle='#05030d';g.beginPath();g.arc(1,hy,7,-Math.PI/2,Math.PI/2);g.fill();g.fillStyle='#fff';g.fillRect(-1,hy-1.5,3,2.5);g.fillStyle='#05030d';g.fillRect(2,hy-1.5,5,2.5);break;
 default:/* helm / visor */g.beginPath();g.arc(1,hy,7,0,TAU);g.fill();g.fillStyle=dark;g.fillRect(-7,hy+2,8,4);g.fillStyle='#fff';
  if(QL.glow){g.shadowColor='#fff';g.shadowBlur=6}g.fillRect(1,hy-2.5,7,3);g.shadowBlur=0;if(H.head==='helm'){g.fillStyle=col;g.fillRect(-2,hy-10,3,5)}}}

/* accesorios detrás del cuerpo (ya en espacio espejado) */
function back(g,H,o,col,dark,t,cy,hy,bob){const lite=shade(col,.5);
 for(const a of H.acc)switch(a){
 case 'drum':g.fillStyle=dark;rr(g,-15,cy+1,9,15,3);g.fill();g.fillStyle=lite;g.beginPath();g.arc(-10.5,cy+8,3,0,TAU);g.fill();break;
 case 'coils':for(const s of [-1,1]){const bx=-8+s*3;g.fillStyle='#888';g.fillRect(bx-1,cy-8,2,12);g.fillStyle=lite;for(let i=0;i<3;i++)g.fillRect(bx-2.5,cy-6+i*4,5,1.5);
  if(Math.sin(t*23+s*3)>.3){g.strokeStyle='#bfe8ff';g.lineWidth=1;g.beginPath();g.moveTo(bx,cy-9);g.lineTo(bx+s*4,cy-14);g.lineTo(bx-s*2,cy-17);g.stroke()}}break;
 case 'comb':g.fillStyle='#d8a020';for(let i=0;i<4;i++){const hx=-14+(i%2)*5,hy2=cy+1+(i>>1)*6+(i%2)*3;g.beginPath();for(let k=0;k<6;k++)g.lineTo(hx+Math.cos(k/6*TAU)*3,hy2+Math.sin(k/6*TAU)*3);g.fill()}break;
 case 'gate':{const r=14+Math.sin(t*2)*1.5;g.save();g.translate(-6,cy+6);g.rotate(t*1.2);g.strokeStyle=col;g.lineWidth=2;g.setLineDash([5,4]);g.beginPath();g.ellipse(0,0,r*.55,r,0,0,TAU);g.stroke();
  g.setLineDash([]);g.globalAlpha=.25;g.fillStyle=col;g.fill();g.globalAlpha=1;g.restore();break}
 case 'fur':g.fillStyle='#6a4a3a';g.beginPath();for(let i=0;i<=8;i++){const a=Math.PI+i/8*Math.PI;g.lineTo(Math.cos(a)*12,cy+2+Math.sin(a)*5-(i%2)*3)}g.fill();break;
 case 'rage':if(QL.glow){g.globalAlpha=.25+.15*Math.sin(t*12);g.fillStyle='#ff3c1a';g.beginPath();for(let i=0;i<10;i++){const a=i/10*TAU,r=(i%2?14:22)+Math.sin(t*9+i)*2;g.lineTo(Math.cos(a)*r,cy+4+Math.sin(a)*r*1.2)}g.fill();g.globalAlpha=1}break;
 case 'tendrils':g.strokeStyle='#9b30ff';g.lineWidth=2.5;for(let i=0;i<3;i++){g.globalAlpha=.8-i*.2;g.beginPath();g.moveTo(-4,cy+4+i*3);
  g.bezierCurveTo(-14,cy+Math.sin(t*3+i)*6,-18,cy+10+Math.cos(t*2.6+i)*7,-24-i*3,cy+4+Math.sin(t*2+i*2)*9);g.stroke()}g.globalAlpha=1;break;
 case 'tail':g.strokeStyle=o.form==='b'?'#2a8a1a':dark;g.lineWidth=4;g.beginPath();g.moveTo(-5,hy+27);g.quadraticCurveTo(-18,hy+30+Math.sin(t*4)*4,-20,hy+18+Math.sin(t*3)*5);g.stroke();
  g.fillStyle='#e8e0c8';g.beginPath();g.arc(-20,hy+18+Math.sin(t*3)*5,2.5,0,TAU);g.fill();break;
 case 'echo':if(!o.ghost){g.save();g.globalAlpha=.22;g.translate(-6+Math.sin(t*2)*3,-2);g.fillStyle='#05030d';g.strokeStyle=col;g.lineWidth=1.5;rr(g,-9,cy+2,18,16,5);g.fill();g.stroke();
  g.beginPath();g.arc(1,hy,7,0,TAU);g.fill();g.stroke();g.restore()}break}}

/* accesorios delante del cuerpo */
function front(g,H,o,col,t,cy,hy,bob){const lite=shade(col,.5);
 for(const a of H.acc)switch(a){
 case 'pauldron':g.fillStyle=lite;g.beginPath();g.ellipse(4,cy+3,6,4,-.3,Math.PI,TAU);g.fill();break;
 case 'pauldron2':g.fillStyle=col;g.beginPath();g.ellipse(-6,cy+3,6,4,.3,Math.PI,TAU);g.fill();break;
 case 'towershield':g.save();g.translate(-9,cy+10);g.fillStyle=shade(col,-.25);rr(g,-5,-12,10,24,3);g.fill();g.strokeStyle='#ffd23c';g.lineWidth=1.5;g.stroke();
  g.fillStyle='#ffd23c';g.fillRect(-1,-7,2,12);g.fillRect(-4,-3,8,2);g.restore();break;
 case 'bandolier':g.strokeStyle='#5a4a3a';g.lineWidth=2.5;g.beginPath();g.moveTo(-8,cy+3);g.lineTo(6,cy+15);g.stroke();g.fillStyle='#ff8a3c';for(let i=0;i<3;i++){g.beginPath();g.arc(-4+i*4.5,cy+6.5+i*3.8,1.8,0,TAU);g.fill()}break;
 case 'monocle':g.fillStyle='#ff3c3c';if(QL.glow){g.shadowColor='#ff3c3c';g.shadowBlur=8}g.beginPath();g.arc(5,hy-1,1.8,0,TAU);g.fill();g.shadowBlur=0;break;
 case 'threads':if(!o.ghost)for(let i=0;i<3;i++){const a=t*1.6+i*TAU/3,mx=Math.cos(a)*20,my=cy-6+Math.sin(a)*9;g.strokeStyle=col;g.globalAlpha=.5;g.lineWidth=1;
  g.beginPath();g.moveTo(6,cy+4);g.quadraticCurveTo((6+mx)/2,cy-12,mx,my);g.stroke();g.globalAlpha=1;g.fillStyle=lite;g.beginPath();g.arc(mx,my,2.2,0,TAU);g.fill()}break;
 case 'lantern':if(!o.ghost){const lx=-14,ly=cy-10+Math.sin(t*2.2)*3;g.fillStyle='#e8e0c8';g.beginPath();g.arc(lx,ly,4,0,TAU);g.fill();g.fillStyle='#4cff9a';
  g.fillRect(lx-2,ly-1.5,1.6,1.6);g.fillRect(lx+.6,ly-1.5,1.6,1.6);light(g,lx,ly,22,'#4cff9a',.35)}break;
 case 'blueprints':if(!o.ghost)for(let i=0;i<2;i++){g.save();g.translate(-12+i*26,cy-14-i*6+Math.sin(t*1.8+i)*2.5);g.transform(1,.18*Math.sin(t+i),0,1,0,0);
  g.globalAlpha=.35+.1*Math.sin(t*5+i);g.fillStyle='#3cf0ff';g.fillRect(-6,-4.5,12,9);g.globalAlpha=.9;g.strokeStyle='#bff8ff';g.lineWidth=.6;g.strokeRect(-6,-4.5,12,9);
  g.beginPath();g.moveTo(-6,0);g.lineTo(6,0);g.moveTo(0,-4.5);g.lineTo(0,4.5);g.moveTo(-3,-2);g.lineTo(2,-2);g.lineTo(2,2.5);g.stroke();g.restore()}g.globalAlpha=1;break;
 case 'bees':if(!o.ghost)for(let i=0;i<3;i++){const a=t*4+i*2.1,bx=Math.cos(a)*16,by=cy-4+Math.sin(a*1.3)*10;g.fillStyle='#ffd23c';g.beginPath();g.ellipse(bx,by,2.4,1.6,0,0,TAU);g.fill();
  g.fillStyle='#fff';g.globalAlpha=.6;g.fillRect(bx-1,by-3+Math.sin(t*60)*.6,2,1.6);g.globalAlpha=1}break;
 case 'rings':for(const [k,sp,rx,tl] of [[0,1.4,19,.35],[1,-2.1,15,-.5]]){g.save();g.translate(1,cy+2);g.rotate(tl);g.strokeStyle=k?lite:col;g.lineWidth=1.6;
  g.beginPath();g.ellipse(0,0,rx,rx*.32,0,0,TAU);g.stroke();const a=t*sp;g.fillStyle='#fff';for(let i=0;i<4;i++){const b=a+i*TAU/4;g.fillRect(Math.cos(b)*rx-1,Math.sin(b)*rx*.32-1,2,2)}g.restore()}break;
 case 'singularity':if(!o.ghost){const a=t*1.7,sx=Math.cos(a)*18,sy=cy-2+Math.sin(a)*8;g.fillStyle='#05030d';g.beginPath();g.arc(sx,sy,4,0,TAU);g.fill();
  g.strokeStyle=lite;g.lineWidth=1;g.beginPath();g.ellipse(sx,sy,7,2.2,a,0,TAU);g.stroke();for(let i=0;i<3;i++){const b=t*3+i*2;g.fillStyle=col;g.fillRect(sx+Math.cos(b)*10,sy+Math.sin(b)*5,1.6,1.6)}}break;
 case 'bloodorbs':if(!o.ghost)for(let i=0;i<3;i++){const a=t*2.2+i*TAU/3,bx=Math.cos(a)*15,by=cy+2+Math.sin(a)*6;g.fillStyle='#ff1f4b';g.beginPath();g.moveTo(bx,by-4);
  g.quadraticCurveTo(bx+3,by,bx,by+2.5);g.quadraticCurveTo(bx-3,by,bx,by-4);g.fill()}break}}

/* ---------- enemigos: siluetas reconocibles con animación propia ---------- */
function drawEnemyArt(e,col){
 const g=c,t=S.t,cx=e.x,cy=e.y-e.h/2,w=e.w,h=e.h,f=e.face||sgn(S.p.x-e.x),moving=Math.abs(e.vx)>10,step=Math.sin(t*12+e.ph)*(moving?1:0);
 const sq=e.d.ai==='walk'||e.d.ai==='tank'||e.d.ai==='golem'?1+step*.06:1;  // rebote al andar
 g.save();g.translate(cx,e.y);g.scale(1/sq,sq);g.translate(-cx,-e.y);
 g.fillStyle=col;g.strokeStyle=col;g.beginPath();
 switch(e.d.shape){
  case 'diamond':{const fl=Math.sin(t*10+e.ph)*3;g.moveTo(cx,cy-h/2-fl);g.lineTo(cx+w/2,cy);g.lineTo(cx,cy+h/2);g.lineTo(cx-w/2,cy);g.closePath();g.fill();
   g.globalAlpha*=.5;g.beginPath();g.moveTo(cx-4,cy+h/2);g.lineTo(cx,cy+h/2+8+fl*2);g.lineTo(cx+4,cy+h/2);g.fill();g.globalAlpha=e.ghost>0?.25:1;break}
  case 'circle':{const pu=1+Math.sin(t*(e.fuse>0?40:8))*.12;g.arc(cx,cy,w/2*pu,0,6.283);g.fill();
   g.strokeStyle='#fff';g.lineWidth=2;for(let k=0;k<4;k++){const a=t*6+k*1.57;g.beginPath();g.moveTo(cx+Math.cos(a)*w*.55,cy+Math.sin(a)*w*.55);g.lineTo(cx+Math.cos(a)*w*.8,cy+Math.sin(a)*w*.8);g.stroke()}break}
  case 'dome':g.moveTo(cx-w/2,e.y);g.quadraticCurveTo(cx-w/2,e.y-h*1.3,cx,e.y-h);g.quadraticCurveTo(cx+w/2,e.y-h*1.3,cx+w/2,e.y);g.closePath();g.fill();
   g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.arc(cx-w*.18,e.y-h*.7,w*.1,0,6.283);g.fill();break;
  case 'tri':g.moveTo(cx-w/2,e.y);g.lineTo(cx+f*w*.1,e.y-h);g.lineTo(cx+w/2,e.y);g.closePath();g.fill();break;
  case 'robe':g.moveTo(cx-w/2,e.y);g.lineTo(cx-w/4,e.y-h*.8);g.lineTo(cx+w/4,e.y-h*.8);g.lineTo(cx+w/2,e.y);g.closePath();g.fill();
   g.beginPath();g.arc(cx,e.y-h*.85,w*.28,0,6.283);g.fill();g.strokeStyle=col;g.lineWidth=2;g.beginPath();g.moveTo(cx+f*w*.5,e.y);g.lineTo(cx+f*w*.5,e.y-h-8);g.stroke();
   g.beginPath();g.arc(cx+f*w*.5,e.y-h-10,4+Math.sin(t*6)*1.5,0,6.283);g.fill();break;
  case 'wing':{const fl=Math.sin(t*14+e.ph)*6;g.moveTo(cx-w/2,cy-fl);g.lineTo(cx,cy-h/2);g.lineTo(cx+w/2,cy-fl);g.lineTo(cx,cy+h/2);g.closePath();g.fill();break}
  case 'hex':for(let k=0;k<6;k++){const a=k*1.047;g.lineTo(cx+Math.cos(a)*w/2,cy+Math.sin(a)*h/2)}g.closePath();g.fill();
   g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.moveTo(cx,cy);const a=Math.atan2(S.p.y-20-cy,S.p.x-cx);g.lineTo(cx+Math.cos(a)*w*.7,cy+Math.sin(a)*w*.7);g.stroke();break;
  case 'ghost':{g.moveTo(cx-w/2,e.y);g.lineTo(cx-w/2,cy);g.arc(cx,cy,w/2,Math.PI,0);g.lineTo(cx+w/2,e.y);for(let k=3;k>=0;k--)g.lineTo(cx-w/2+k*w/3,e.y-(k%2?6:0)+Math.sin(t*8+k)*3);g.closePath();g.fill();break}
  case 'shield':rr(g,cx-w/2,e.y-h,w,h,8);g.fill();g.fillStyle='#e0e8ff';rr(g,cx+f*w/2-(f>0?2:8),e.y-h-6,10,h+6,3);g.fill();break;
  default:rr(g,cx-w/2,e.y-h,w,h,Math.min(8,w/5));g.fill();
   if(e.d.ai==='golem'){g.fillStyle='#ffb070';for(let k=0;k<3;k++)g.fillRect(cx-w/2+6+k*w/3,e.y-h*.4,4,4+Math.sin(t*5+k)*3)}
 }
 g.restore();
 // patas animadas para los terrestres
 if(!isFlyer(e.d)&&e.d.shape!=='dome'&&e.d.shape!=='robe'){g.strokeStyle=col;g.lineWidth=3;for(const s of [-1,1]){g.beginPath();g.moveTo(cx+s*w*.25,e.y-2);g.lineTo(cx+s*w*.25+step*s*5,e.y+3);g.stroke()}}
 // ojos que miran al jugador
 g.shadowBlur=0;const dx=sgn(S.p.x-cx)*2,dy=clamp((S.p.y-20-cy)/100,-1,1)*2,ey=e.d.shape==='diamond'||e.d.shape==='circle'||e.d.shape==='wing'||e.d.shape==='hex'?cy-2:e.y-h*.66;
 g.fillStyle=e.tell>0?'#ff3c3c':'#000';g.fillRect(cx-6+dx,ey+dy,4,4);g.fillRect(cx+3+dx,ey+dy,4,4);
}

/* ===================== ICONOS (glifos vectoriales 24×24) =====================
   Un trazado SVG por glifo: el canvas lo pinta con Path2D y el HTML con <svg>. El glifo de cada objeto o
   habilidad se deduce de su texto (tipo, nombre, descripción), así los 92 objetos y 60 habilidades no necesitan datos nuevos. */
const GLYPH={
 blade:'M19 1l4 4L11 17l-4-4zM5 13l6 6-2 2-2-1-3 3-2-2 3-3-1-2z',
 burst:'M12 0l2.4 7L21 3.5 17.5 10 24 12l-6.5 2 3.5 6.5-6.6-3.5L12 24l-2.4-7L3 20.5 6.5 14 0 12l6.5-2L3 3.5 9.6 7z',
 bolt:'M14 0L3 14h7l-3 10 12-14h-7l4-10z',
 flame:'M12 0c1 5 8 8 8 15a8 8 0 01-16 0c0-4 3-6 3-10 2 2 3 5 3 5s3-3 2-10z',
 drop:'M12 0C8 7 4 11 4 16a8 8 0 0016 0c0-5-4-9-8-16z',
 shield:'M12 0l10 4v7c0 6-4 11-10 13C6 22 2 17 2 11V4z',
 heart:'M12 22L2.5 12.5a5.5 5.5 0 017.8-7.8L12 6.4l1.7-1.7a5.5 5.5 0 017.8 7.8z',
 plus:'M8.5 1h7v7.5H23v7h-7.5V23h-7v-7.5H1v-7h7.5z',
 cross:'M11 0h2v6h-2zM11 18h2v6h-2zM0 11h6v2H0zM18 11h6v2h-6zM12 5a7 7 0 110 14 7 7 0 010-14zm0 3a4 4 0 100 8 4 4 0 000-8zm0 3a1 1 0 100 2 1 1 0 000-2z',
 wing:'M12 1l10 10h-6l-4-4-4 4H2zM12 12l10 10h-6l-4-4-4 4H2z',
 dash:'M1 2h6l10 10L7 22H1l10-10zM9 2h5l10 10-10 10H9l10-10z',
 spring:'M3 2h18v3L9 8h12v3L9 14h12v3L9 20h12v3H3v-3l12-3H3v-3l12-3H3V8l12-3H3z',
 hourglass:'M4 0h16v4l-6 8 6 8v4H4v-4l6-8-6-8zm4 4l4 5 4-5z',
 coin:'M12 1a11 11 0 110 22 11 11 0 010-22zm0 3a8 8 0 100 16 8 8 0 000-16zm0 3l4 5-4 5-4-5z',
 star:'M12 0l3.6 7.4 8.1 1.1-5.9 5.7 1.4 8L12 18.4 4.8 22.2l1.4-8L.3 8.5l8.1-1.1z',
 book:'M3 1h13l5 5v17H3zm4 7v2.5h10V8zm0 5v2.5h10V13z',
 bot:'M11 0h2v3h6a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6zM7 7v5h4V7zm6 0v5h4V7zM6 20h12v4H6z',
 missile:'M23 1l-2 9-7 7-2-2-4 4-4-4 4-4-2-2 7-7zM4 18l2 2-4 4-2-2z',
 skull:'M12 0a10 10 0 0110 10v5l-3 2v5H5v-5l-3-2v-5A10 10 0 0112 0zM7.5 9a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm9 0a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
 gem:'M12 0l10 12-10 12L2 12z'};
// en orden: gana la primera regla que encaje (por eso «explosión» va antes que «daño»)
const GLYPH_RULES=[[/explo|nova|quake|slam|blackhole|orbital|sísm|terremot|onda/,'burst'],[/rayo|eléctr|bobina|chispa|static|chain|storm|beam|tesla|volt/,'bolt'],
 [/fuego|quem|incendi|ígne|napalm|llama/,'flame'],[/sangr|hemorr|venen|corros|tóx|pact|sacrific/,'drop'],
 [/escudo|armadura|blind|aegis|fortress|parry|cocoon|égida|bloque/,'shield'],[/roba|cura|regener|lastbreath/,'heart'],[/vida máx/,'plus'],
 [/crít|snipe|riel|mira/,'cross'],[/salt|leap|jetpack|grapple|antigrav|recoil|alas|vuel/,'wing'],
 [/enfriamiento|recarg|reloj|tiempo|rewind|freeze|congel/,'hourglass'],[/oro|moneda|cofre|precio|cupón/,'coin'],[/suerte|trébol/,'star'],
 [/experiencia|nivel/,'book'],[/dron|torreta|turret|summon|raise|mine|bees|queen|invoc|esbirro|abeja/,'bot'],
 [/misil|cohete|rocket|siege|barrage|granada|ringshot|proyectil|dispar|proj/,'missile'],
 [/esquiv|dash|blink|voidstep|bloodstep|phase|swap|gate|portal|rift|telet|velocidad de movimiento/,'dash'],
 [/velocidad de ataque|combo|flurry/,'spring'],[/mata|muert|ejecut|guillotina|warcry|primal|morph|rage|ira\b/,'skull'],
 [/daño|melee|hammer|golpe|tajo|corte/,'blade']];
const TAG_GLYPH={'curación':'heart','explosión':'burst','crítico':'cross','sangrado':'drop','veneno':'drop','salto':'wing','fuego':'flame','escudo':'shield','rayo':'bolt'};
const STAT_GLYPH={dmg:'blade',as:'spring',spd:'dash',dodge:'dash',crit:'cross',critm:'cross',regen:'heart',ls:'heart',healm:'heart',arm:'shield',shield:'shield',
 oversh:'shield',hpf:'plus',hpm:'plus',jumps:'wing',goldm:'coin',chestm:'coin',xpm:'book',cdr:'hourglass',ucdr:'hourglass',mcdr:'hourglass',luck:'star',exec:'skull'};
// prioridad: etiqueta de sinergia → primera estadística → tipo de habilidad → texto
function glyphOf(o){if(!o._g){const rule=s=>(GLYPH_RULES.find(r=>r[0].test(s))||[])[1];
 o._g=TAG_GLYPH[(o.tags||[])[0]]||STAT_GLYPH[Object.keys(o.st||{})[0]]||(o.t&&rule(o.t))||rule(`${o.name||''} ${o.desc||''}`.toLowerCase())||'gem'}return o._g}
const GP={};
// pinta el glifo de o en un cuadrado de lado s con esquina (x,y)
function drawGlyph(g,o,x,y,s,col){const k=glyphOf(o);g.save();g.translate(x,y);g.scale(s/24,s/24);g.fillStyle=col;g.fill(GP[k]||(GP[k]=new Path2D(GLYPH[k])),'evenodd');g.restore()}
const glyphSvg=(o,col)=>`<svg viewBox="0 0 24 24" width="18" height="18"><path fill="${col}" fill-rule="evenodd" d="${GLYPH[glyphOf(o)]}"/></svg>`;
