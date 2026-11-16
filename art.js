'use strict';
/* ===================== ARTE PROCEDURAL: héroes y enemigos =====================
   Todo se dibuja con primitivas del canvas (sin sprites). Las funciones reciben el contexto `g`
   para poder pintar también la vista previa del menú. */
const FAM_ACC={'Vanguardia':'pads','Artillería':'pack','Invocadores':'rune','Tiempo/Espacio':'halo','Malditos/Híbridos':'horns'};
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

/* o: {col, face, aim, sx, sy (squash & stretch), lean, run (fase de la zancada), moving, atk (0..1 anticipación), acc, t, air} */
function drawHero(g,x,y,o){
 const f=o.face,col=o.col,t=o.t,mv=o.moving?1:0,air=o.air;
 g.save();g.translate(x,y);g.rotate(o.lean||0);g.scale(o.sx||1,o.sy||1);
 const bob=mv&&!air?Math.abs(Math.sin(o.run))*-2:Math.sin(t*3)*.8,glowOn=QL.glow;
 // piernas: zancada al correr, recogidas en el aire
 g.strokeStyle=col;g.lineWidth=5;g.lineCap='round';
 for(const s of [-1,1]){const a=air?s*.5:Math.sin(o.run+(s>0?Math.PI:0))*.75*mv;
  g.beginPath();g.moveTo(s*4,-16+bob);g.lineTo(s*4+Math.sin(a)*12*f,-16+bob+Math.cos(a)*(air?11:15));g.stroke()}
 // accesorio trasero
 g.fillStyle=col;
 if(o.acc==='pack'){g.globalAlpha=.85;rr(g,-f*15-5,-36+bob,10,16,3);g.fill();g.fillRect(-f*12-1,-46+bob,2,10);g.globalAlpha=1}
 if(o.acc==='pads'){g.beginPath();g.moveTo(-f*12,-36+bob);g.lineTo(-f*20,-28+bob+Math.sin(t*6)*2);g.lineTo(-f*8,-24+bob);g.fill()}
 // torso
 if(glowOn){g.shadowColor=col;g.shadowBlur=16*K}
 rr(g,-9,-36+bob,18,22,6);g.fill();
 // cabeza y visor
 g.beginPath();g.arc(f,-43+bob,7.5,0,6.283);g.fill();g.shadowBlur=0;
 g.fillStyle='#fff';g.fillRect(f>0?1:-8,-45+bob,7,3);
 g.fillStyle='rgba(255,255,255,.35)';g.fillRect(-6,-33+bob,4,14);  // brillo
 // brazo y arma: apunta al cursor; al atacar retrocede (anticipación) y luego se extiende
 const ax=f*2,ay=-30+bob,reach=19-(o.atk||0)*9,ex=ax+Math.cos(o.aim)*reach,ey=ay+Math.sin(o.aim)*reach;
 g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.moveTo(ax,ay);g.lineTo(ex,ey);g.stroke();
 g.save();g.translate(ex,ey);g.rotate(o.aim);g.fillStyle=col;if(glowOn){g.shadowColor=col;g.shadowBlur=10*K}g.fillRect(-2,-3,12,6);g.restore();g.shadowBlur=0;
 // accesorio delantero
 if(o.acc==='halo'){g.strokeStyle=col;g.lineWidth=2;g.beginPath();g.ellipse(f,-56+bob,10,3,0,0,6.283);g.stroke()}
 if(o.acc==='horns'){g.fillStyle=col;for(const s of [-1,1]){g.beginPath();g.moveTo(f+s*4,-49+bob);g.lineTo(f+s*9,-58+bob);g.lineTo(f+s*7,-48+bob);g.fill()}}
 if(o.acc==='rune'){const a=t*2.5;g.fillStyle=col;g.save();g.translate(f+Math.cos(a)*16,-46+bob+Math.sin(a)*5);g.rotate(a);g.fillRect(-3,-3,6,6);g.restore()}
 g.restore();
}

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
