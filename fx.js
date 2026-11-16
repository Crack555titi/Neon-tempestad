'use strict';
/* ===================== FX: pools, canvas HiDPI, hit-stop ===================== */

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
const PR_DEF={x:0,y:0,vx:0,vy:0,dmg:0,r:5,life:1,t0:0,hostile:0,col:'#fff',pierce:0,home:0,boom:0,gm:0,bounce:0,wb:0,ret:0,back:0,
 split:0,grow:0,dotK:0,dps:0,dur:0,mark:0,stun:0,hook:0,pull:0,ls:0,crit:0,zone:null,ported:0};

let hitstop=0;
const hitStop=ms=>{hitstop=Math.max(hitstop,ms/1000)};
function fxReset(){PT.clear();PR.clear();TX.clear();BL.clear();hitstop=0}
// jag>0: rayo quebrado (se redibuja aleatorio cada frame); jag=0: haz recto
function bolt(x1,y1,x2,y2,col,w,jag,l){const b=BL.get();if(!b)return;b.x1=x1;b.y1=y1;b.x2=x2;b.y2=y2;b.c=col;b.w=w||2;b.jag=jag===undefined?10:jag;b.l=b.ml=l||.14}

function spark(x,y,vx,vy,l,col,s){const q=PT.get();if(!q)return;q.ring=0;q.x=x;q.y=y;q.vx=vx;q.vy=vy;q.l=q.ml=l;q.c=col;q.s=s}
function burst(x,y,n,col,sp,sz){for(let i=0;i<n;i++){const a=R(0,6.283),v=R(.2,1)*sp,q=PT.get();if(!q)return;
 q.ring=0;q.x=x;q.y=y;q.vx=Math.cos(a)*v;q.vy=Math.sin(a)*v;q.l=R(.3,.7);q.ml=.7;q.c=col;q.s=sz||3}}
function ring(x,y,r,col,t){const q=PT.get();if(!q)return;q.ring=1;q.x=x;q.y=y;q.r=10;q.mr=r;q.l=q.ml=t||.4;q.c=col}
function txt(x,y,s,col){const t=TX.get();if(!t)return;t.x=x;t.y=y;t.s=s;t.c=col||'#fff';t.l=.8}
function fxProj(o){const q=PR.get();if(!q)return null;q.hit.clear();Object.assign(q,PR_DEF,o);return q}

/* Canvas HiDPI: el búfer sigue el tamaño real en pantalla × devicePixelRatio;
   todo se dibuja en coordenadas lógicas W×H gracias a la escala K. */
let K=1;
function fitCanvas(){
 const r=cv.getBoundingClientRect(),d=globalThis.devicePixelRatio||1,w=Math.max(W,Math.round((r.width||W)*d));
 if(cv.width!==w){cv.width=w;cv.height=Math.round(w*H/W)}K=cv.width/W;
}
const screen=()=>c.setTransform(K,0,0,K,0,0);
// shadowBlur no sigue la transformación: se escala a mano por K
const glow=(col,b)=>{c.shadowColor=col;c.shadowBlur=(b===undefined?14:b)*K};
addEventListener('resize',fitCanvas);fitCanvas();
