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
