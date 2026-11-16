'use strict';
/* ===================== GUARDADO (mínimo: estadísticas, logros, desbloqueos) =====================
   shortcut: solo progreso permanente; ajustes, récords y borrado por muerte permanente llegan en la Fase 5. */
const SAVE_KEY='neonTempestad.v1';
const Save={
 d:{stats:{},ach:{}},
 load(){let raw=null;try{raw=JSON.parse(localStorage.getItem(SAVE_KEY))}catch(e){}  // sin localStorage (privado/bloqueado): se juega sin guardar
  this.d={stats:Object.assign({},raw&&raw.stats),ach:Object.assign({},raw&&raw.ach)}},
 write(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.d))}catch(e){}},
 val(k){const v=this.d.stats[k];return Array.isArray(v)?v.length:v||0},
 add(k,n){this.d.stats[k]=(this.d.stats[k]||0)+(n===undefined?1:n);checkAch()},
 max(k,v){if(v>(this.d.stats[k]||0)){this.d.stats[k]=v;checkAch()}},
 addSet(k,v){const a=this.d.stats[k]||(this.d.stats[k]=[]);if(!a.includes(v)){a.push(v);checkAch()}}
};
const UNLOCK_ALL=typeof location!=='undefined'&&/[?&]unlockall\b/.test(location.search);  // atajo de pruebas: index.html?unlockall
const isUnlocked=cid=>UNLOCK_ALL||!CHARS[cid].unlock||!!Save.d.ach[CHARS[cid].unlock];

function checkAch(){
 for(const id in ACHIEVEMENTS){if(Save.d.ach[id])continue;const a=ACHIEVEMENTS[id];
  if(Save.val(a.stat)>=a.goal){Save.d.ach[id]=Date.now();Save.write();
   const ch=Object.values(CHARS).find(c=>c.unlock===id);
   if(S)say(`🏆 ${a.name}${ch?' · ¡'+ch.name+' desbloqueado!':''}`)}}
}

/* Se llama en cada start() (tras reiniciar Ev.h) para registrar las estadísticas de la partida */
function trackRun(){
 Ev.on('onKill',e=>{Save.add('kills');if(e.elite)Save.add('eliteKills');if(e.boss)Save.add('bossKills');if(S.p.hp<S.p.maxHp*.25)Save.add('lowHpKills')});
 Ev.on('onTakeDamage',d=>{Save.add('dmgTaken',d);if(S.p.hp>0&&S.p.hp<S.p.maxHp*.05)Save.max('nearDeath',1)});
 Ev.on('onJump',()=>Save.add('jumps'));
 Ev.on('onLevelUp',l=>Save.max('bestLvl',l));
 Ev.on('onCast',slot=>{if(slot==='u')Save.add('ults')});
 Ev.on('onGuardBreak',()=>Save.add('guardBreaks'));
}
function recordRunEnd(win){
 Save.add('runs');Save.add('playTime',S.t);Save.max('bestTime',S.t);
 if(win){Save.add('wins');if(DIFFS.indexOf(S.df)>=2)Save.add('hardWins');Save.addSet('winFams',S.ch.fam)}else Save.add('deaths');
 Save.write();
}
addEventListener('pagehide',()=>Save.write());
Save.load();
