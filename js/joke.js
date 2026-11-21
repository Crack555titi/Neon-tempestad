'use strict';
/* ===================== FAMILIA JOKE =====================
   Seis héroes de broma (pero jugables en serio): Gerpillo, Morchopsito, Juanchito, Bachata Man, Frutillini y Cafesito.
   Arte propio dibujado con primitivas, dos habilidades nuevas (el remate de vóley y las bochas que se rematan con parry)
   y las entradas de la familia en las tablas de parry, maestría, secundaria alternativa, compañero y desafíos. */
FAMILIES.push('Joke');
Object.assign(CHARS,{
 gerpillo:{name:'Gerpillo',fam:'Joke',color:'#7fe0ff',hp:120,spd:285,jump:690,role:'Cepillo de dientes: limpia a fondo y deja todo brillante.',
  primary:{t:'combo',dmg:16,cd:.28,range:80,arc:1.7,name:'Cepillado',desc:'Tres pasadas de cepillo; la tercera es un fregado que te impulsa y golpea con crítico.'},
  secondary:{t:'zone',cd:7,r:110,life:5,name:'Pasta Dental',desc:'Deja un charco de espuma que ralentiza y daña a los enemigos.'},
  move:{t:'dash',cd:2,dist:230,name:'Enjuague',desc:'Deslizamiento rápido con invulnerabilidad breve.'},
  ult:{t:'static',cd:16,r:260,dmg:60,stun:1.5,name:'Sonrisa Radiante',desc:'Un destello que daña y aturde 1,5 s a todos los enemigos cercanos.'}},
 morcho:{name:'Morchopsito',fam:'Joke',color:'#8cff5a',hp:135,spd:270,jump:700,role:'Dinosaurio espacial con un ovni de sombrero.',
  primary:{t:'melee',dmg:24,cd:.42,range:90,arc:1.6,kb:380,name:'Coletazo',desc:'Barre con la cola y empuja.'},
  secondary:{t:'well',cd:8,r:150,life:3,dmg:12,pull:260,name:'Rayo Abductor',desc:'El ovni del sombrero abre un rayo que atrae y daña a los enemigos.'},
  move:{t:'slam',cd:4,dmg:45,r:150,name:'Pisotón Jurásico',desc:'En el suelo saltas alto; en el aire caes en picada y golpeas en área.'},
  ult:{t:'barrage',cd:18,n:12,dmg:45,name:'Lluvia de Meteoritos',desc:'El ovni llama 12 meteoritos sobre la zona apuntada.'}},
 juan:{name:'Juanchito',fam:'Joke',color:'#ffcf4a',hp:110,spd:295,jump:740,role:'Voleibolista espacial: levanta, salta y remata.',
  primary:{t:'volley',cd:.3,dmg:22,name:'Saque, Salto y Remate',desc:'1.er clic: lanzas la pelota al aire. 2.º: saltas. 3.º: remate; si le pegas a la pelota, sale disparada y elimina de un golpe a los enemigos normales (a los jefes les hace mucho daño). Si fallas, das un manotazo.'},
  secondary:{t:'proj',cd:5,dmg:30,spd:700,r:9,life:1.2,n:3,spread:.25,boom:70,name:'Saque Flotante',desc:'Tres pelotas que estallan al impactar.'},
  move:{t:'leap',cd:4,dmg:30,r:110,name:'Plancha',desc:'Te lanzas hacia el cursor y golpeas al caer.'},
  ult:{t:'warcry',cd:18,time:8,as:1.6,name:'Punto de Partido',desc:'8 s: +60% de velocidad de ataque y más velocidad de movimiento.'}},
 bachata:{name:'Bachata Man',fam:'Joke',color:'#6fd8ff',hp:115,spd:300,jump:700,role:'Bailarín helado: congela al ritmo de la bachata.',
  primary:{t:'proj',dmg:13,cd:.22,spd:850,r:6,life:.9,stun:.15,name:'Paso Helado',desc:'Proyectil de escarcha que frena un instante al enemigo.'},
  secondary:{t:'zone',cd:6,r:120,life:4,name:'Pista de Hielo',desc:'Crea una pista de hielo que ralentiza a los enemigos.'},
  move:{t:'dash',cd:1.8,dist:240,name:'Vuelta de Bachata',desc:'Giro rápido con invulnerabilidad breve.'},
  ult:{t:'freeze',cd:22,time:3,name:'Baile Congelante',desc:'3 s: todos los enemigos se quedan congelados.'}},
 fruti:{name:'Frutillini',fam:'Joke',color:'#ff4a6a',hp:110,spd:285,jump:700,role:'Frutilla con palo de hockey: lanza bochas y las remata al vuelo.',
  primary:{t:'proj',dmg:15,cd:.32,spd:820,r:7,life:1,name:'Bochazo',desc:'Lanza una bocha rasante.'},
  secondary:{t:'bochas',cd:6,n:3,dmg:40,name:'Juego Aéreo',desc:'Lanzas 3 bochas al aire. Haz PARRY cerca de una y la rematas con el palo: 100% de daño extra y crítico asegurado.'},
  move:{t:'dash',cd:2,dist:220,name:'Patinazo',desc:'Te deslizas con invulnerabilidad breve.'},
  ult:{t:'ringshot',cd:16,n:16,dmg:35,spd:700,r:8,life:1.2,name:'Tormenta de Bochas',desc:'16 bochas salen disparadas en todas direcciones.'}},
 cafe:{name:'Cafesito',fam:'Joke',color:'#c08a5a',hp:105,spd:290,jump:690,role:'Café alienígena: granos a toda máquina y cafeína pura.',
  primary:{t:'proj',dmg:9,cd:.13,spd:950,r:4,life:.8,n:2,spread:.1,name:'Granos de Café',desc:'Ráfaga de dos granos.'},
  secondary:{t:'warcry',cd:9,time:4,as:1.8,name:'Espresso',desc:'4 s: +80% de velocidad de ataque y más velocidad de movimiento.'},
  move:{t:'dash',cd:1.8,dist:220,name:'Subidón',desc:'Arranque de cafeína con invulnerabilidad breve.'},
  ult:{t:'nova',cd:15,r:220,dmg:90,name:'Taza Hirviendo',desc:'Derramas café hirviendo a tu alrededor: daño en área y empuje.'}}});
Object.assign(CHAR_EL,{gerpillo:'hielo',morcho:'plasma',juan:'rayo',bachata:'hielo',fruti:'fuego',cafe:'fuego'});

// la familia en las demás tablas
PARRY_FAM.Joke={name:'¡JA!',col:'#ffcf4a',fx(p){for(const e of inR(p.x,p.y-20,200)){stunE(e,1.5);e.vx+=sgn(e.x-p.x)*500}ring(p.x,p.y-20,200,'#ffcf4a',.4);txt(p.x,p.y-90,'¡PLOP!','#ffcf4a',14)}};
MT_FAM.Joke={n:'Carcajada',k:'crit',v:.04,d:'+4% de crítico'};
ALT_FAM.Joke={n:'Absurda',d:'+40% de daño, +10% de enfriamiento',m:{dmg:1.4,cd:1.1}};
COMP_MOVE.Joke={n:'Chiste malo',fx(){for(const e of S.en)if(!e.dead&&!e.boss&&hyp(e.x-S.p.x,e.y-S.p.y)<260)stunE(e,1.2);ring(S.p.x,S.p.y-20,260,'#ffcf4a',.4)}};
CHAL_FAM.Joke=['Nadie te toma en serio. Hazlos reír con 150 bajas.','Un jefe cae y nadie entiende cómo. Tú tampoco.','Llegas al corazón de la tormenta y la tormenta se ríe contigo.'];

/* ---------- habilidades nuevas ---------- */
const VB_DMG=777777;  // marca del remate de Juanchito (ver el hook de hurtE)
AB.volley=function(p,d,a){const V=p.vb||(p.vb={st:0,ball:null});
 if(!V.ball){V.ball={x:p.x+p.face*10,y:p.y-62,vy:-700};V.st=1;Snd.play('ui');return}
 if(V.st===1){if(p.ground){p.vy=-S.ch.jump*1.1;p.ground=0}V.st=2;return}
 const b=V.ball,hx=p.x+p.face*12,hy=p.y-p.h-8;V.ball=null;V.st=0;
 if(hyp(b.x-hx,b.y-hy)<75){spawnPr({x:b.x,y:b.y,vx:Math.cos(a)*1300,vy:Math.sin(a)*1300,dmg:VB_DMG,r:11,life:1.2,pierce:3,col:'#ffffff'});
  ring(b.x,b.y,60,'#ffcf4a',.3);S.shake=Math.max(S.shake,10);hitStop(50);txt(b.x,b.y-30,'¡REMATE!','#ffcf4a',16)}
 else{AB.melee(p,{dmg:d.dmg,range:70,arc:1.6},a);txt(p.x,p.y-70,'¡fallaste!','#9a93c8')}};
AB.bochas=function(p,d){const B=S.bochas||(S.bochas=[]);
 for(let k=0;k<d.n;k++)B.push({x:p.x+p.face*10,y:p.y-40,vx:R(-140,140)+p.face*60,vy:-R(620,820),dmg:d.dmg,life:4});Snd.play('ui')};
function updJoke(dt){const s=S,p=s.p;
 const V=p.vb;if(V&&V.ball){const b=V.ball;b.vy+=1400*dt;b.y+=b.vy*dt;b.x+=(p.x+p.face*12-b.x)*Math.min(1,dt*3);
  if(b.y>FLOOR){V.ball=null;V.st=0;txt(p.x,p.y-70,'se cayó la pelota','#9a93c8')}}
 if(s.bochas){for(const b of s.bochas){b.vy+=1400*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
   if(b.y>=FLOOR){aoe(b.x,FLOOR-10,60,b.dmg*.5);burst(b.x,FLOOR-10,8,'#ff4a6a',200,3);b.life=0}}
  s.bochas=s.bochas.filter(b=>b.life>0)}}
// remate de bochas: hacer parry cerca de una la devuelve con el palo (+100% de daño, crítico seguro)
function bochaStrike(){const s=S,p=s.p;if(!s||!s.bochas||!s.bochas.length)return 0;let n=0;const a=p.aim;
 for(const b of s.bochas)if(b.life>0&&hyp(b.x-p.x,b.y-(p.y-p.h/2))<95){b.life=0;n++;
  spawnPr({x:b.x,y:b.y,vx:Math.cos(a)*1100,vy:Math.sin(a)*1100,dmg:b.dmg*2,crit:1,r:9,life:1.2,pierce:2,col:'#ff4a6a'});ring(b.x,b.y,40,'#ffffff',.25)}
 if(n){txt(p.x,p.y-80,n>1?`¡REMATE ×${n}!`:'¡REMATE!','#ff4a6a',16);hitStop(40);Save.add('bochaHits',n)}
 s.bochas=s.bochas.filter(b=>b.life>0);return n}

/* ---------- hooks ---------- */
{const _u=update;update=function(dt){_u(dt);if(S&&S.st==='play'&&S.p)updJoke(dt)}}
{const _t=tryParry;tryParry=function(){if(S&&S.st==='play')bochaStrike();return _t()}}
{const _e=hurtE;hurtE=function(e,d,o){if(d===VB_DMG)d=e.boss?e.maxHp*.04+200:e.hp*20+1000;return _e(e,d,o)}}  // remate: un golpe a los normales
{const _w=drawWorldBack;drawWorldBack=function(){_w();const s=S;
 const V=s.p.vb;if(V&&V.ball)drawBall(c,V.ball.x,V.ball.y,9,s.t);
 if(s.bochas)for(const b of s.bochas){c.fillStyle='#ff4a6a';c.beginPath();c.arc(b.x,b.y,7,0,TAU);c.fill();c.fillStyle='#ffd0d8';c.beginPath();c.arc(b.x-2,b.y-2,2.5,0,TAU);c.fill()}}}
function drawBall(g,x,y,r,t){g.fillStyle='#f4f4f4';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.strokeStyle='#3a6cff';g.lineWidth=1.5;
 g.beginPath();g.arc(x,y,r,t*4,t*4+2);g.stroke();g.strokeStyle='#ffcf4a';g.beginPath();g.arc(x,y,r*.6,t*4+3,t*4+5);g.stroke()}

/* ---------- arte: cada uno con su silueta (pies en y=0, mirando a +x) ---------- */
function jkLegs(g,o,col,y0,sp){const mv=o.moving?1:0;g.strokeStyle=col;g.lineWidth=3.5;g.lineCap='round';
 for(const s of [1,-1]){const a=o.air?(s>0?.5:-.3):Math.sin(o.run+(s>0?0:Math.PI))*.6*mv;g.beginPath();g.moveTo(s*sp,y0);g.lineTo(s*sp+Math.sin(a)*9,y0+Math.cos(a)*9);g.stroke()}}
function jkEye(g,x,y,r){g.fillStyle='#fff';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.fillStyle='#05030d';g.beginPath();g.arc(x+r*.35,y,r*.5,0,TAU);g.fill()}
function jkArm(g,col,x,y,la,len){const hx=x+Math.cos(la)*len,hy=y+Math.sin(la)*len;g.strokeStyle=col;g.lineWidth=3;g.beginPath();g.moveTo(x,y);g.lineTo(hx,hy);g.stroke();return [hx,hy]}
const JOKE_ART={
 gerpillo(g,o,col,t,la){const dk=shade(col,-.4);jkLegs(g,o,dk,-9,3);
  rr(g,-5,-38,10,30,4);g.fillStyle=col;g.fill();g.fillStyle='rgba(255,255,255,.3)';g.fillRect(-3,-35,2,22);
  g.fillStyle='#e8f8ff';rr(g,-7,-54,14,15,3);g.fill();g.strokeStyle='#9fd8ec';g.lineWidth=1;for(let x=-5;x<=5;x+=2.5){g.beginPath();g.moveTo(x,-54);g.lineTo(x,-46);g.stroke()}
  g.fillStyle='#7fe0ff';g.beginPath();g.arc(-3,-56,3.5,0,TAU);g.arc(2,-57,4,0,TAU);g.arc(6,-55,3,0,TAU);g.fill();
  jkEye(g,1,-30,2.6);jkEye(g,-3.5,-30,2.2);g.strokeStyle=dk;g.lineWidth=1.3;g.beginPath();g.arc(0,-24,3,.2,Math.PI-.2);g.stroke();
  jkArm(g,dk,3,-20,la,10)},
 morcho(g,o,col,t,la){const dk=shade(col,-.45),lt=shade(col,.4);jkLegs(g,o,dk,-10,5);
  g.fillStyle=col;g.beginPath();g.moveTo(-10,-20);g.quadraticCurveTo(-24,-14+Math.sin(t*5)*2,-30,-6);g.quadraticCurveTo(-20,-12,-8,-12);g.fill();
  g.beginPath();g.ellipse(0,-20,13,12,0,0,TAU);g.fill();g.fillStyle=lt;g.beginPath();g.ellipse(3,-17,7,7,0,0,TAU);g.fill();
  g.fillStyle=col;g.beginPath();g.ellipse(9,-34,9,8,0,0,TAU);g.fill();g.fillStyle='#fff';for(let k=0;k<3;k++){g.beginPath();g.moveTo(12+k*2.5,-31);g.lineTo(13+k*2.5,-28.5);g.lineTo(14+k*2.5,-31);g.fill()}
  jkEye(g,10,-37,2.4);jkArm(g,dk,8,-24,la,7);
  g.fillStyle='#b8c4d4';g.beginPath();g.ellipse(9,-44,13,3.5,0,0,TAU);g.fill();g.fillStyle='rgba(127,232,255,.8)';g.beginPath();g.arc(9,-45,5.5,Math.PI,0);g.fill();
  for(let k=0;k<3;k++){g.fillStyle=['#ff3cf2','#ffd23c','#3cf0ff'][(k+Math.floor(t*4))%3];g.beginPath();g.arc(1+k*8,-43.5,1.4,0,TAU);g.fill()}},
 juan(g,o,col,t,la){const dk=shade(col,-.45);jkLegs(g,o,'#2a3a6a',-17,3);
  g.fillStyle=col;rr(g,-7,-34,14,18,3);g.fill();g.fillStyle='#2a3a6a';g.font='bold 8px monospace';g.textAlign='center';g.fillText('7',0,-22);
  g.fillStyle='#f2c08a';g.beginPath();g.arc(1,-41,7,0,TAU);g.fill();g.fillStyle=col;g.fillRect(-6,-46,14,3);g.fillStyle='#3a2210';g.beginPath();g.arc(1,-45,7,Math.PI,0);g.fill();
  g.fillStyle='#05030d';g.fillRect(4,-42,2,2);
  const [hx,hy]=jkArm(g,'#f2c08a',3,-31,la,12);if(!(S&&S.p&&S.p.vb&&S.p.vb.ball&&o.cid===S.cid&&!o.ghost))drawBall(g,hx+3,hy,5,t)},
 bachata(g,o,col,t,la){const dk=shade(col,-.45);jkLegs(g,o,'#1a2a3a',-17,3);
  g.fillStyle=col;g.beginPath();g.moveTo(-7,-16);g.lineTo(-8,-34);g.lineTo(8,-34);g.lineTo(7,-16);g.fill();
  g.fillStyle='#e8f8ff';g.beginPath();g.moveTo(-2,-34);g.lineTo(0,-24);g.lineTo(2,-34);g.fill();
  g.fillStyle='#c98a5a';g.beginPath();g.arc(1,-40,6.5,0,TAU);g.fill();g.fillStyle='#05030d';g.fillRect(4,-41,2,2);
  g.fillStyle='#1a2a3a';g.fillRect(-10,-45,22,2.5);rr(g,-5,-52,12,8,2);g.fill();g.fillStyle=col;g.fillRect(-5,-46,12,2);
  const [hx,hy]=jkArm(g,col,3,-31,la+Math.sin(t*8)*.2,11);g.fillStyle='#bff4ff';g.beginPath();g.ellipse(hx+3,hy,4,3,0,0,TAU);g.fill();
  if(!o.ghost){g.fillStyle='rgba(191,244,255,.7)';for(let k=0;k<3;k++){const a=t*2+k*2.1;g.fillRect(Math.cos(a)*14-1,-28+Math.sin(a)*10-1,2,2)}}},
 fruti(g,o,col,t,la){const dk=shade(col,-.4);jkLegs(g,o,'#2a6a2a',-8,4);
  g.fillStyle=col;g.beginPath();g.moveTo(0,-6);g.quadraticCurveTo(-15,-18,-12,-32);g.quadraticCurveTo(0,-40,12,-32);g.quadraticCurveTo(15,-18,0,-6);g.fill();
  g.fillStyle='#ffe27a';for(const [x,y] of [[-6,-28],[0,-31],[6,-27],[-7,-19],[0,-21],[6,-17],[-3,-13],[3,-12]]){g.beginPath();g.ellipse(x,y,1,1.6,0,0,TAU);g.fill()}
  g.fillStyle='#3ccf4a';for(let k=0;k<5;k++){const a=-Math.PI/2+(k-2)*.55;g.beginPath();g.moveTo(0,-35);g.lineTo(Math.cos(a-.25)*9,-35+Math.sin(a-.25)*9);g.lineTo(Math.cos(a)*12,-35+Math.sin(a)*12);g.fill()}
  jkEye(g,4,-25,2.6);jkEye(g,-2,-25,2.2);
  const [hx,hy]=jkArm(g,'#2a6a2a',6,-20,la,8);g.strokeStyle='#c8a060';g.lineWidth=2.5;g.beginPath();g.moveTo(hx,hy);g.lineTo(hx+Math.cos(la)*16,hy+Math.sin(la)*16);
  g.lineTo(hx+Math.cos(la)*16+Math.cos(la+1.4)*7,hy+Math.sin(la)*16+Math.sin(la+1.4)*7);g.stroke()},
 cafe(g,o,col,t,la){const dk=shade(col,-.45);jkLegs(g,o,'#5a3418',-8,4);
  g.fillStyle='#f2ead8';g.beginPath();g.moveTo(-11,-34);g.lineTo(11,-34);g.lineTo(8,-8);g.lineTo(-8,-8);g.closePath();g.fill();
  g.fillStyle=col;g.fillRect(-10,-24,20,5);g.strokeStyle='#f2ead8';g.lineWidth=3;g.beginPath();g.arc(-12,-22,5,Math.PI*.5,Math.PI*1.5);g.stroke();
  g.fillStyle='#5a3418';g.beginPath();g.ellipse(0,-34,11,3,0,0,TAU);g.fill();
  g.fillStyle='#7dff6a';g.beginPath();g.arc(2,-15,4,0,TAU);g.fill();g.fillStyle='#05030d';g.beginPath();g.arc(3,-15,2,0,TAU);g.fill();
  g.strokeStyle='#7dff6a';g.lineWidth=1.5;for(const s of [-1,1]){g.beginPath();g.moveTo(s*4,-35);g.lineTo(s*7,-45);g.stroke();g.fillStyle='#7dff6a';g.beginPath();g.arc(s*7,-46,2,0,TAU);g.fill()}
  if(!o.ghost){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1.5;for(let k=0;k<2;k++){g.beginPath();for(let i=0;i<6;i++){const y=-38-i*3,x=-3+k*6+Math.sin(t*4+i+k)*2;i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}}
  jkArm(g,dk,8,-20,la,8)}};
{const _dh=drawHero;drawHero=function(g,x,y,o){const A=JOKE_ART[o.cid];if(!A)return _dh(g,x,y,o);
 const f=o.face||1,la=f>0?o.aim:Math.PI-o.aim,col=o.col;g.save();g.translate(x,y);g.rotate(o.lean||0);g.scale((o.sx||1)*f,o.sy||1);g.lineCap='round';g.lineJoin='round';
 if(QL.glow&&!o.ghost){g.shadowColor=col;g.shadowBlur=8*K}A(g,o,col,o.t||0,la||0);g.shadowBlur=0;g.restore()}}
