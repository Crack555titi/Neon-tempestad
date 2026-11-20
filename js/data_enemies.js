'use strict';
/* ===================== ENEMIGOS (datos) =====================
   ai = comportamiento (enemies.js) · shape = silueta · wt = peso de aparición · min = coeficiente de dificultad mínimo
   contact = hace daño al tocar · shot = segundos entre disparos · range = distancia que intenta mantener
   front = multiplicador del daño recibido por delante (escudo) · split = tipo en que se divide al morir */
const ENEMIES={
 crawler:{name:'Reptador',hp:40,dmg:10,spd:95,w:30,h:22,xp:8,color:'#8cff5a',ai:'walk',shape:'box',contact:1,wt:3},
 wisp:{name:'Fuego Fatuo',hp:30,dmg:8,spd:80,w:24,h:24,xp:10,color:'#66ccff',ai:'fly',shape:'diamond',shot:2.2,wt:2},
 brute:{name:'Bruto',hp:150,dmg:22,spd:62,w:46,h:46,xp:26,color:'#ff9a5a',ai:'walk',shape:'box',contact:1,wt:1,min:2},
 spitter:{name:'Escupidor',hp:55,dmg:14,spd:80,w:28,h:30,xp:12,color:'#b4ff3c',ai:'shooter',shape:'dome',range:320,shot:2.6,wt:2},
 sniper:{name:'Francotirador',hp:45,dmg:26,spd:0,w:22,h:40,xp:16,color:'#ff3c6a',ai:'sniper',shape:'tri',shot:3.8,wt:1,min:1.5},
 kamikaze:{name:'Chispa Kamikaze',hp:25,dmg:30,spd:250,w:20,h:20,xp:9,color:'#ffb13c',ai:'kamikaze',shape:'circle',wt:2},
 bomber:{name:'Bombardero',hp:60,dmg:24,spd:120,w:42,h:18,xp:16,color:'#ff7a1a',ai:'bomber',shape:'wing',shot:2.4,wt:1,min:1.5},
 tank:{name:'Acorazado',hp:320,dmg:28,spd:45,w:54,h:50,xp:40,color:'#9aa8c8',ai:'tank',shape:'shield',front:.3,contact:1,wt:1,min:2.5},
 leaper:{name:'Saltador',hp:60,dmg:16,spd:110,w:26,h:26,xp:12,color:'#e65aff',ai:'leaper',shape:'tri',contact:1,wt:2},
 swarm:{name:'Dron Enjambre',hp:18,dmg:7,spd:200,w:16,h:12,xp:5,color:'#3cf0ff',ai:'swarm',shape:'diamond',contact:1,wt:3},
 turret:{name:'Torreta Centinela',hp:110,dmg:12,spd:0,w:30,h:30,xp:18,color:'#ffd23c',ai:'turret',shape:'hex',shot:2.6,wt:1,min:1.3},
 splitter:{name:'Gelatina de Neón',hp:90,dmg:12,spd:70,w:36,h:30,xp:14,color:'#4cff9a',ai:'walk',shape:'dome',contact:1,split:'splitlet',wt:2},
 splitlet:{name:'Gelatina Menor',hp:30,dmg:7,spd:110,w:18,h:15,xp:4,color:'#4cff9a',ai:'walk',shape:'dome',contact:1,wt:0},
 shaman:{name:'Chamán',hp:70,dmg:8,spd:70,w:26,h:38,xp:20,color:'#d070ff',ai:'shaman',shape:'robe',range:360,wt:1,min:1.5},
 phantom:{name:'Espectro',hp:55,dmg:14,spd:110,w:26,h:30,xp:15,color:'#c8d2ff',ai:'phantom',shape:'ghost',wt:2},
 h_blade:{name:'Héroe Espadachín',hp:120,dmg:16,spd:150,w:24,h:42,xp:30,color:'#ff5a3c',ai:'walk',shape:'box',contact:1,wt:0},
 h_gun:{name:'Héroe Tirador',hp:80,dmg:14,spd:110,w:24,h:42,xp:30,color:'#ffd23c',ai:'shooter',shape:'dome',range:360,shot:2,wt:0},
 h_mage:{name:'Héroe Arcano',hp:70,dmg:24,spd:0,w:24,h:42,xp:30,color:'#b070ff',ai:'sniper',shape:'tri',shot:3.2,wt:0},
 shade:{name:'Sombra Corrupta',hp:900,dmg:22,spd:170,w:24,h:42,xp:60,color:'#7a2aff',ai:'shade',shape:'robe',range:240,contact:1,wt:0},
 crackwall:{name:'Muro Agrietado',hp:220,dmg:0,spd:0,w:46,h:70,xp:4,color:'#8a7a9a',ai:'structure',shape:'box',wt:0,structure:1},
 mimic:{name:'Eco Imitador',hp:80,dmg:16,spd:90,w:26,h:38,xp:24,color:'#f0f0ff',ai:'mimic',shape:'robe',range:260,wt:1,min:1.6},
 hunter:{name:'Cazador del Vacío',hp:700,dmg:26,spd:150,w:28,h:46,xp:90,color:'#9b30ff',ai:'hunter',shape:'robe',contact:1,wt:0},
 golem:{name:'Gólem de Escoria',hp:260,dmg:32,spd:50,w:56,h:58,xp:36,color:'#ff6a3c',ai:'golem',shape:'box',contact:1,wt:1,min:2}
};

/* ===================== AFIJOS DE ÉLITE =====================
   hp/spd multiplican · tick(e,dt) cada frame · death(e) al morir · hit(e,d) cuando dañan al jugador
   taken(e,d)→daño final recibido · Todos se ven: aura del color del afijo + efecto propio. */
const AFX=[
 {n:'Ardiente',c:'#ff7a1a',
  tick(e,dt){e.fireT=(e.fireT||1)-dt;if(e.fireT<=0){e.fireT=1;Z({x:e.x,y:e.y,r:34,warn:.2,life:3,dmg:4*dmgScale(),dot:1,hostile:1,col:'#ff7a1a'})}if(Math.random()<.3)spark(e.x+R(-10,10),e.y-e.h,0,-60,.4,'#ff7a1a',3)},
  death(e){for(let i=-1;i<=1;i++)Z({x:e.x+i*50,y:FLOOR,r:45,warn:.2,life:3,dmg:5*dmgScale(),dot:1,hostile:1,col:'#ff7a1a'})}},
 {n:'Veloz',c:'#33ccff',spd:1.7,tick(e){if(Math.random()<.4)spark(e.x,e.y-e.h/2,0,0,.25,'#33ccff',e.w*.5)}},
 {n:'Blindado',c:'#bbccdd',hp:2.5,taken:(e,d)=>d*.85},
 {n:'Explosivo',c:'#ff33ff',death(e){Z({x:e.x,y:e.y-e.h/2,r:100,warn:.7,dmg:25*dmgScale(),hostile:1,col:'#ff33ff'})}},
 {n:'Vampírico',c:'#c0102c',hit(e,d){const h=d*2;e.hp=Math.min(e.maxHp,e.hp+h);txt(e.x,e.y-e.h-20,'+'+Math.round(h),'#ff1f4b')}},
 {n:'Gélido',c:'#bff4ff',hit(){buff('frost',2,{spd:.55});txt(S.p.x,S.p.y-70,'CONGELADO','#bff4ff')},tick(e){if(Math.random()<.2)spark(e.x+R(-e.w,e.w)/2,e.y-R(0,e.h),0,30,.6,'#bff4ff',2)}},
 {n:'Reflectante',c:'#e0e0ff',  // cada 4 s levanta un espejo 1,5 s: no recibe daño y devuelve parte al jugador
  tick(e,dt){e.refT=(e.refT===undefined?4:e.refT)-dt;if(e.refT<-1.5)e.refT=4},
  taken(e,d){if(e.refT<0){hurtP(Math.min(d*.25,e.dmg),e);return 0}return d}},
 {n:'Invocador',c:'#b07aff',tick(e,dt){e.sumT=(e.sumT===undefined?3:e.sumT)-dt;if(e.sumT<=0){e.sumT=6;ring(e.x,e.y-e.h/2,60,'#b07aff',.3);for(let i=0;i<2;i++)spawnEnemy('crawler',e.x+R(-40,40),e.y-10,1)}}},
 {n:'Eléctrico',c:'#5ab4ff',  // carga un rayo 0,6 s (línea visible) y descarga si sigues a menos de 320 px
  tick(e,dt){e.zT=(e.zT===undefined?2:e.zT)-dt;const p=S.p;
   if(e.zT<=0&&hyp(p.x-e.x,p.y-e.y)<300){e.zT=3;e.zapW=.6;S.sch.push({t:.6,en:1,f:()=>{if(!e.dead&&hyp(S.p.x-e.x,S.p.y-e.y)<320){bolt(e.x,e.y-e.h/2,S.p.x,S.p.y-20,'#5ab4ff',3);hurtP(e.dmg*.8,e)}}})}
   if(e.zapW>0)e.zapW-=dt}},
 {n:'Fantasmal',c:'#9a93c8',taken:(e,d)=>Math.random()<.25?(txt(e.x,e.y-e.h-20,'FALLO','#9a93c8'),0):d,
  tick(e,dt){e.blT=(e.blT===undefined?5:e.blT)-dt;if(e.blT<=0){e.blT=5;burst(e.x,e.y-e.h/2,12,'#9a93c8',200,3);e.x=clamp(S.p.x+R(-1,1)*220,30,WORLD-30);if(e.d.ai!=='fly'&&e.d.ai!=='swarm'&&e.d.ai!=='bomber'&&e.d.ai!=='phantom')e.y=Math.min(e.y,FLOOR)-60;burst(e.x,e.y-e.h/2,12,'#9a93c8',200,3)}}},
 {n:'Gravitatorio',c:'#7a6cff',tick(e,dt){const p=S.p,dx=e.x-p.x;if(Math.abs(dx)<350&&Math.abs(e.y-p.y)<250&&!p.dash){p.x=clamp(p.x+sgn(dx)*70*dt,12,WORLD-12);if(Math.random()<.3)spark(p.x,p.y-20,sgn(dx)*120,0,.3,'#7a6cff',3)}}}
];
