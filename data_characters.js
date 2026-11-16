'use strict';
/* ===================== PERSONAJES (datos) =====================
   Cada habilidad apunta a un tipo de abilities.js con `t` y sus parámetros. */
const CHARS={
 vanguard:{name:'Centinela',fam:'Vanguardia',color:'#ff5a3c',hp:150,spd:290,jump:690,
  primary:{t:'melee',dmg:24,cd:.3,range:100,arc:1.9,name:'Tajo Ígneo'},
  secondary:{t:'dashHit',dmg:55,cd:3.5,dist:320,name:'Embestida'},
  move:{t:'dash',cd:1.8,dist:240,name:'Esquiva'},
  ult:{t:'nova',dmg:150,cd:14,r:290,name:'Onda Sísmica'}},
 artillery:{name:'Cañonero',fam:'Artillería',color:'#ffd23c',hp:100,spd:270,jump:680,
  primary:{t:'proj',dmg:13,cd:.14,spd:1250,r:4,life:.8,name:'Ráfaga'},
  secondary:{t:'proj',dmg:100,cd:3.5,spd:1700,r:9,life:1,pierce:8,name:'Riel'},
  move:{t:'dash',cd:2,dist:210,name:'Impulso'},
  ult:{t:'barrage',dmg:75,cd:16,n:16,name:'Lluvia de Obuses'}},
 summoner:{name:'Tejedor',fam:'Invocadores',color:'#4cff9a',hp:110,spd:275,jump:680,
  primary:{t:'proj',dmg:11,cd:.22,spd:650,r:6,life:1.4,home:1,name:'Orbe Teledirigido'},
  secondary:{t:'summon',dmg:10,n:1,life:14,cd:4,name:'Dron Centinela'},
  move:{t:'dash',cd:2,dist:220,name:'Deslizamiento'},
  ult:{t:'summon',dmg:12,n:5,life:10,cd:18,name:'Enjambre'}},
 chrono:{name:'Cronista',fam:'Tiempo/Espacio',color:'#3cf0ff',hp:105,spd:280,jump:690,
  primary:{t:'proj',dmg:11,cd:.2,spd:950,r:5,life:.9,n:2,spread:.14,name:'Pulso Doble'},
  secondary:{t:'zone',cd:6,r:150,life:5,name:'Burbuja Temporal'},
  move:{t:'blink',cd:1.5,dist:290,name:'Parpadeo'},
  ult:{t:'freeze',cd:20,time:3.5,name:'Tiempo Detenido'}}
};

/* Nodos de maestría (cada 5 niveles se elige 1 de 2) */
const MASTERY=[
 {name:'Depredador',desc:'+10% probabilidad crítica',fx:p=>p.m.crit+=.1},
 {name:'Sed de Sangre',desc:'+4% robo de vida',fx:p=>p.m.ls+=.04},
 {name:'Frenesí',desc:'+20% velocidad de ataque',fx:p=>p.m.as+=.2},
 {name:'Pies Ligeros',desc:'+12% velocidad de movimiento',fx:p=>p.m.spd+=.12},
 {name:'Cronómetro',desc:'-15% enfriamientos',fx:p=>p.m.cdr=Math.min(.6,p.m.cdr+.15)},
 {name:'Poder Bruto',desc:'+15% daño',fx:p=>p.m.dmg+=.15},
 {name:'Bastión',desc:'-12% daño recibido',fx:p=>p.m.arm+=.12},
 {name:'Salto Extra',desc:'+1 salto en el aire',fx:p=>p.maxJ++},
 {name:'Reflejos',desc:'Al recibir daño: +0.6s de invulnerabilidad',fx:()=>Ev.on('onTakeDamage',()=>S.p.inv+=.6)},
 {name:'Detonación en Cadena',desc:'Los enemigos explotan al morir (60 daño)',fx:()=>Ev.on('onKill',e=>{if(chain<3){chain++;aoe(e.x,e.y-e.h/2,100,60);chain--}})}
];
