'use strict';
/* ===================== ENEMIGOS Y AFIJOS (datos) ===================== */
const ENEMIES={
 crawler:{hp:40,dmg:10,spd:95,w:30,h:22,xp:8,color:'#8cff5a',ai:'walk'},
 wisp:{hp:30,dmg:8,spd:80,w:24,h:24,xp:10,color:'#6cf',ai:'fly',shot:2.2},
 brute:{hp:150,dmg:22,spd:62,w:46,h:46,xp:26,color:'#ff9a5a',ai:'walk'}
};
/* Afijos de élite: spd/hp multiplican; f activa un flag en el enemigo (fire, boom) */
const AFX=[{n:'Ardiente',c:'#ff7a1a',f:'fire'},{n:'Veloz',c:'#3cf',spd:1.7},{n:'Blindado',c:'#bcd',hp:2.5},{n:'Explosivo',c:'#f3f',f:'boom'}];
