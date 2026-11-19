'use strict';
/* ===================== FX: pools, calidad, postproceso, canvas HiDPI, hit-stop ===================== */

/* Pool de tamaño fijo: los objetos se reutilizan, nunca se liberan (sin tirones del GC).
   Los vivos ocupan a[0..n); sweep() mueve los muertos al final intercambiando. */
class Pool{
 constructor(make,max){this.a=[];this.n=0;this.make=make;this.max=max}
 get(){if(this.n>=this.max)return null;let o=this.a[this.n];if(!o)o=this.a[this.n]=this.make();this.n++;return o}
 sweep(dead){for(let i=0;i<this.n;){const o=this.a[i];if(dead(o)){this.n--;this.a[i]=this.a[this.n];this.a[this.n]=o}else i++}}
 clear(){this.n=0}
}
const PT=new Pool(()=>({}),800);              // partículas y anillos
const PR=new Pool(()=>({hit:new Set()}),600); // proyectiles (aliados y hostiles)
const TX=new Pool(()=>({}),200);              // números flotantes
const BL=new Pool(()=>({}),120);              // rayos / haces (líneas)
const deadL=o=>o.l<=0,deadLife=o=>o.life<=0;
// Todos los campos que puede llevar un proyectil: el pool reutiliza objetos y hay que reiniciarlos
const PR_DEF={x:0,y:0,vx:0,vy:0,cz:0,near:0,dmg:0,r:5,life:1,t0:0,hostile:0,col:'#fff',pierce:0,home:0,boom:0,gm:0,bounce:0,wb:0,ret:0,back:0,
 split:0,grow:0,dotK:0,dps:0,dur:0,mark:0,stun:0,hook:0,pull:0,ls:0,crit:0,zone:null,ported:0,raw:0,proc:0,homeP:0,harmless:0,src:null};

/* ---------- calidad: baja desactiva el brillo y reduce partículas para equipos lentos ---------- */
const QUALITY={
 baja:{glow:0,bloom:0,post:0,add:0,pmax:220,amb:.35,dpr:1},
 media:{glow:1,bloom:0,post:1,add:1,pmax:500,amb:.7,dpr:1.5},
 alta:{glow:1,bloom:1,post:1,add:1,pmax:800,amb:1,dpr:2}};
let QL=QUALITY.alta,SHAKE=1;
function setQuality(k){QL=QUALITY[k]||QUALITY.alta;PT.max=QL.pmax;if(PT.n>PT.max)PT.n=PT.max;if(typeof fitCanvas==='function')fitCanvas()}
/* calidad automática (por defecto): los teléfonos empiezan en media; si en partida el juego baja de ~48 FPS durante 3 s,
   baja un escalón y lo recuerda para la próxima vez. Nunca sube sola (evita que oscile). Elegir una calidad en Opciones la desactiva. */
const AUTOQ={win:0,frames:0,cool:0};
const autoLevel=()=>Save.d.settings.autoLevel||(typeof isTouchDevice==='function'&&isTouchDevice()?'media':'alta');
function autoQuality(raw){if(Save.d.settings.quality!=='auto'||!S||S.st!=='play'||raw>.5)return;  // >0,5 s: pestaña en segundo plano, no cuenta
 if(AUTOQ.cool>0){AUTOQ.cool-=raw;return}AUTOQ.win+=raw;AUTOQ.frames++;if(AUTOQ.win<3)return;
 const fps=AUTOQ.frames/AUTOQ.win;AUTOQ.win=AUTOQ.frames=0;const lv=autoLevel();
 if(fps<48&&lv!=='baja'){const nx=lv==='alta'?'media':'baja';Save.d.settings.autoLevel=nx;Save.write();setQuality(nx);AUTOQ.cool=4;
  say(`Calidad ajustada a ${nx} para que vaya más fluido`)}}

let hitstop=0,chroma=0,hsCd=0;
const hitStop=ms=>{hitstop=Math.max(hitstop,ms/1000)};
const chromaHit=v=>{chroma=Math.max(chroma,v)};  // aberración cromática breve en golpes fuertes
function fxReset(){PT.clear();PR.clear();TX.clear();BL.clear();hitstop=0;chroma=0;KICK.x=KICK.y=KICK.vx=KICK.vy=0}
// jag>0: rayo quebrado (se redibuja aleatorio cada frame); jag=0: haz recto
function bolt(x1,y1,x2,y2,col,w,jag,l){const b=BL.get();if(!b)return;b.x1=x1;b.y1=y1;b.x2=x2;b.y2=y2;b.c=col;b.w=w||2;b.jag=jag===undefined?10:jag;b.l=b.ml=l||.14}

function spark(x,y,vx,vy,l,col,s){const q=PT.get();if(!q)return;q.ring=0;q.x=x;q.y=y;q.vx=vx;q.vy=vy;q.l=q.ml=l;q.c=col;q.s=s}
function burst(x,y,n,col,sp,sz){n=Math.ceil(n*QL.amb);for(let i=0;i<n;i++){const a=R(0,6.283),v=R(.2,1)*sp,q=PT.get();if(!q)return;
 q.ring=0;q.x=x;q.y=y;q.vx=Math.cos(a)*v;q.vy=Math.sin(a)*v;q.l=R(.3,.7);q.ml=.7;q.c=col;q.s=sz||3}}
function ring(x,y,r,col,t){const q=PT.get();if(!q)return;q.ring=1;q.x=x;q.y=y;q.r=10;q.mr=r;q.l=q.ml=t||.4;q.c=col}
// desintegración: el cuerpo se deshace en una rejilla de fragmentos que salen despedidos hacia arriba
function disintegrate(x,y,w,h,col){const cols=clamp(w/8|0,2,7),rows=clamp(h/8|0,2,7),s=Math.max(3,w/cols*.8);
 for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){if(QL.amb<1&&(i+j)%2)continue;const px=x-w/2+(i+.5)*w/cols,py=y-h+(j+.5)*h/rows,a=Math.atan2(py-(y-h/2),px-x),v=R(40,170);
  spark(px,py,Math.cos(a)*v,Math.sin(a)*v-R(30,110),R(.45,1.1),j%3?col:'#fff',s)}}
/* números flotantes: size = tamaño (crítico grande, DoT pequeño); aparecen con un pequeño "pop" */
function txt(x,y,s,col,size){const t=TX.get();if(!t)return;t.x=x;t.y=y;t.s=s;t.c=col||'#fff';t.l=t.ml=size>16?1.1:.8;t.size=size||13;
 const num=/^[-+\d]/.test(s);t.vx=num?R(-70,70):0;t.vy=num?-R(170,240)*(size>16?1.2:1):-40;t.g=num?640:0}
function fxProj(o){const q=PR.get();if(!q)return null;q.hit.clear();Object.assign(q,PR_DEF,o);return q}

/* Canvas HiDPI: el búfer sigue el tamaño real en pantalla × devicePixelRatio;
   todo se dibuja en coordenadas lógicas W×H gracias a la escala K. */
let K=1;
function fitCanvas(){
 const r=cv.getBoundingClientRect(),d=Math.min(globalThis.devicePixelRatio||1,QL.dpr||2),w=Math.max(W,Math.round((r.width||W)*d));
 if(cv.width!==w){cv.width=w;cv.height=Math.round(w*H/W)}K=cv.width/W;
}
const screen=()=>c.setTransform(K,0,0,K,0,0);
// shadowBlur no sigue la transformación: se escala a mano por K. En calidad baja no hay brillo.
const glow=(col,b)=>{if(!QL.glow){c.shadowBlur=0;return}c.shadowColor=col;c.shadowBlur=(b===undefined?14:b)*K};
addEventListener('resize',fitCanvas);fitCanvas();

/* ---------- postproceso ---------- */
const mkCanvas=(w,h)=>{const k=document.createElement('canvas');k.width=w;k.height=h;return k};
let BLM=null,VIG=null,CAB=null;
// bloom: reducir la imagen a 1/4 y 1/8 la desenfoca; se suma encima con mezcla aditiva
function bloom(){if(!QL.bloom)return;if(!BLM)BLM=[mkCanvas(W/4,H/4),mkCanvas(W/8,H/8)];
 const a=BLM[0].getContext('2d'),b=BLM[1].getContext('2d');a.clearRect(0,0,W/4,H/4);a.drawImage(cv,0,0,W/4,H/4);b.clearRect(0,0,W/8,H/8);b.drawImage(BLM[0],0,0,W/8,H/8);
 screen();c.save();c.globalCompositeOperation='lighter';c.imageSmoothingEnabled=true;c.globalAlpha=.32;c.drawImage(BLM[1],0,0,W,H);c.globalAlpha=.22;c.drawImage(BLM[0],0,0,W,H);c.restore()}
function vignette(lowHp){if(!QL.post)return;
 if(!VIG){VIG=mkCanvas(W,H);const g=VIG.getContext('2d'),gr=g.createRadialGradient(W/2,H/2,H*.38,W/2,H/2,H*.9);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=gr;g.fillRect(0,0,W,H)}
 screen();c.drawImage(VIG,0,0,W,H);
 if(lowHp>0){c.save();c.globalAlpha=lowHp*(.55+.45*Math.sin(performance.now()/160));c.globalCompositeOperation='lighter';c.filter='none';
  const gr=c.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.85);gr.addColorStop(0,'rgba(255,0,40,0)');gr.addColorStop(1,'rgba(255,0,40,.45)');c.fillStyle=gr;c.fillRect(0,0,W,H);c.restore()}}
// aberración cromática: copias del frame filtradas a rojo y cian, desplazadas en sentidos opuestos
function aberration(){if(chroma<=0||!QL.post)return;if(!CAB)CAB=mkCanvas(W,H);const g=CAB.getContext('2d'),d=2+chroma*6;
 screen();c.save();c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,chroma)*.45;
 for(const [col,dx] of [['#ff0000',d],['#00ffff',-d]]){g.globalCompositeOperation='copy';g.drawImage(cv,0,0,W,H);g.globalCompositeOperation='multiply';g.fillStyle=col;g.fillRect(0,0,W,H);c.drawImage(CAB,dx,0,W,H)}
 c.restore()}
