'use strict';
/* ===================== ESCENARIOS (datos) =====================
   sky[0..3] = color del cielo sin jefe y en cada fase del jefe (ciclo de color)
   layers = capas de parallax procedurales (type: peaks|spires|blocks|domes|towers; par = velocidad relativa a la cámara)
   amb = partículas ambientales · enemies = enemigos propios · boss = jefe final de la etapa
   plats: ph=[faseMin,faseMax] del jefe en que existen (1 = antes del jefe); sp/ax/ay = movimiento; bl = parpadea desde esa fase
   tp = posibles posiciones del teletransportador (siempre sobre suelo o plataforma que no desaparece) */
const fl=(x,w,ph)=>({x,y:FLOOR,w,h:60,ph:ph||[1,3],solid:1});
const pl=(x,y,w,ph,o)=>Object.assign({x,y,w,h:12,ph:ph||[1,3]},o);
const STAGES=[
 {id:'ruinas',name:'Ruinas de Neón',boss:'prisma',
  sky:['#0a0620','#160a36','#2a0a3a','#3a0a22'],ground:'#05030d',plat:{fill:'#241552',floor:'#150c30',edge:'#8a6cff',glow:'#7a5cff'},
  layers:[{type:'peaks',col:'#120a2a',par:.15,h:[120,230],w:[260,460]},{type:'spires',col:'#1c0f3a',par:.35,h:[90,210],w:[30,70]},{type:'blocks',col:'#26134c',par:.6,h:[30,90],w:[60,140],lights:'#ff3cf2'}],
  amb:{n:40,col:'#c8b8ff',vx:6,vy:-14,s:2},stars:1,
  enemies:['crawler','wisp','brute','kamikaze','spitter','splitter'],
  plats:[fl(0,WORLD),pl(300,390,200),pl(1900,390,200),pl(1100,300,200,[1,1]),pl(700,330,240,[1,1]),pl(1460,330,240,[1,1]),
   pl(780,290,120,[2,3]),pl(1500,290,120,[2,3]),pl(1140,200,120,[2,2]),pl(1000,330,130,[3,3],{sp:1.1,ax:180}),pl(1270,250,130,[3,3],{sp:1.3,ay:70})],
  tp:[{x:2000,y:FLOOR},{x:1200,y:FLOOR},{x:400,y:390}]},
 {id:'fundicion',name:'Fundición Carmesí',boss:'hydra',
  sky:['#1a0604','#2a0a04','#3a1004','#4a0a08'],ground:'#0d0302',plat:{fill:'#3a1408',floor:'#1e0a04',edge:'#ff7a3c',glow:'#ff4a1a'},
  layers:[{type:'peaks',col:'#1c0805',par:.15,h:[100,180],w:[300,520]},{type:'towers',col:'#2a0e06',par:.35,h:[120,260],w:[50,110],lights:'#ff9a3c'},{type:'blocks',col:'#3a1408',par:.6,h:[40,110],w:[90,200],lights:'#ffd23c'}],
  amb:{n:55,col:'#ff9a3c',vx:10,vy:-40,s:2},
  enemies:['crawler','brute','tank','golem','turret','kamikaze','spitter'],
  plats:[fl(0,WORLD),pl(250,400,180),pl(600,330,160),pl(1000,380,220),pl(1400,320,160),pl(1750,390,200),pl(2100,330,160),
   pl(820,250,140,[2,3]),pl(1250,230,140,[2,3]),pl(1600,260,140,[2,2]),pl(1600,260,140,[3,3],{sp:1.2,ax:150}),pl(420,250,120,[3,3],{sp:1,ay:60})],
  tp:[{x:1200,y:FLOOR},{x:1850,y:390},{x:1100,y:380}]},
 {id:'necropolis',name:'Necrópolis Espectral',boss:'queen',
  sky:['#031410','#04201a','#082a22','#0a1a2a'],ground:'#020806',plat:{fill:'#0e2a24',floor:'#071612',edge:'#4cffc8',glow:'#2affb0'},
  layers:[{type:'domes',col:'#06150f',par:.15,h:[60,140],w:[200,380]},{type:'spires',col:'#0a2018',par:.35,h:[60,160],w:[20,50]},{type:'domes',col:'#0f2a20',par:.6,h:[20,50],w:[30,60],cross:'#4cffc8'}],
  amb:{n:45,col:'#9affd8',vx:-8,vy:6,s:3},
  enemies:['wisp','phantom','shaman','leaper','splitter','sniper','mimic'],
  plats:[fl(0,WORLD),pl(200,390,200),pl(520,300,160),pl(850,380,200),pl(1150,280,180),pl(1450,380,200),pl(1750,300,160),pl(2050,390,200),
   pl(680,210,120,[2,3]),pl(1600,210,120,[2,3])],
  tp:[{x:1240,y:280},{x:300,y:390},{x:2100,y:FLOOR}]},
 {id:'abismo',name:'Abismo Digital',boss:'leviathan',
  sky:['#020818','#04102a','#06183a','#0a0a3a'],ground:'#01040c',plat:{fill:'#0a1e3a',floor:'#061226',edge:'#3cf0ff',glow:'#1ab4ff'},
  layers:[{type:'towers',col:'#06102a',par:.15,h:[150,300],w:[40,90],lights:'#3cf0ff'},{type:'blocks',col:'#0a1838',par:.35,h:[60,160],w:[80,160],lights:'#3cf0ff'},{type:'spires',col:'#0e2248',par:.6,h:[30,80],w:[10,24]}],
  amb:{n:50,col:'#3cf0ff',vx:0,vy:60,s:3,sq:1},
  enemies:['swarm','bomber','sniper','turret','wisp','kamikaze','mimic'],
  // el suelo entero solo existe antes de la fase 2; luego se rompe en segmentos con abismos
  plats:[fl(0,WORLD,[1,1]),fl(0,500,[2,3]),fl(700,400,[2,3]),fl(1300,400,[2,3]),fl(1900,500,[2,3]),
   pl(350,390,180),pl(800,320,160),pl(1150,260,160),pl(1500,330,160),pl(1900,380,180),
   pl(560,300,100,[3,3],{sp:1.1,ay:80}),pl(1740,280,100,[3,3],{sp:1.3,ay:80})],
  tp:[{x:1500,y:FLOOR},{x:200,y:FLOOR},{x:2150,y:FLOOR}]},
 {id:'nucleo',name:'Núcleo de la Tempestad',boss:'archon',
  sky:['#14041a','#1e0624','#2a0830','#3a0a10'],ground:'#06020a',plat:{fill:'#2a0e30',floor:'#16061a',edge:'#ffd23c',glow:'#ff3cf2'},
  layers:[{type:'peaks',col:'#12041a',par:.15,h:[160,280],w:[200,400]},{type:'towers',col:'#1e0828',par:.35,h:[100,220],w:[40,80],lights:'#ffd23c'},{type:'spires',col:'#2a0c34',par:.6,h:[40,110],w:[14,30]}],
  amb:{n:60,col:'#ffd23c',vx:-120,vy:260,s:1,line:1},
  enemies:['tank','golem','phantom','shaman','bomber','leaper','sniper','mimic'],
  plats:[fl(0,WORLD),pl(250,380,200),pl(650,300,180),pl(1100,360,200),pl(1550,300,180),pl(1950,380,200),
   pl(900,230,140,[1,1]),pl(1400,230,140,[1,1]),pl(820,220,120,[2,3],{sp:.9,ax:120}),pl(1460,220,120,[2,3],{sp:.9,ax:-120}),pl(1140,160,120,[3,3])],
  tp:[{x:1200,y:FLOOR},{x:350,y:380},{x:2050,y:380}]}
];
