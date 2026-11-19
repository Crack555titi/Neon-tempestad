'use strict';
/* ===================== GUARDADO: progreso permanente + partida en curso =====================
   shortcut: ajustes y récords por dificultad llegan en la Fase 5. */
const SAVE_KEY='neonTempestad.v1',RUN_KEY='neonTempestad.run';
// localStorage puede no existir o estar bloqueado (modo privado): entonces se guarda solo en memoria
const STORE=(()=>{try{localStorage.setItem('_nt','1');localStorage.removeItem('_nt');return localStorage}
 catch(e){const m={};return {getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}}})();
const Save={
 d:{stats:{},ach:{},settings:{vol:{}},records:{},shop:{gems:0,own:{},eq:{}}},
 load(){let raw=null;try{raw=JSON.parse(STORE.getItem(SAVE_KEY))}catch(e){}  // guardado corrupto: se empieza de cero
  this.d={stats:Object.assign({},raw&&raw.stats),ach:Object.assign({},raw&&raw.ach),settings:Object.assign({quality:'auto',shake:1,mute:false,touch:'auto',aim:'auto',binds:null},raw&&raw.settings),records:Object.assign({},raw&&raw.records),
   shop:Object.assign({gems:0,own:{},eq:{}},raw&&raw.shop)};
  this.d.settings.vol=Object.assign({master:.8,sfx:.8,music:.6},this.d.settings.vol);
  // hasta la v1.3 «alta» era solo el valor por defecto (también en teléfonos): esos guardados pasan a automática una vez
  const st=this.d.settings;if(!st.qv){st.quality='auto';st.qv=1}
  if(st.quality!=='auto'&&!QUALITY[st.quality])st.quality='auto'},
 write(){try{STORE.setItem(SAVE_KEY,JSON.stringify(this.d))}catch(e){}},
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
 // récords por dificultad: etapa más lejana (y más rápida), victorias, mejor tiempo de victoria y más bajas
 const did=DIFFS.indexOf(S.df),r=Save.d.records[did]||(Save.d.records[did]={stage:0,time:0,wins:0,best:0,kills:0,ch:''}),st=S.loop*STAGES.length+S.stage+1;
 if(st>r.stage||(st===r.stage&&S.t<r.time)){r.stage=st;r.time=S.t;r.ch=S.ch.name}
 if(win){r.wins++;if(!r.best||S.t<r.best)r.best=S.t}r.kills=Math.max(r.kills,S.kills);
 Save.write();
}

/* Partida en curso: instantánea al empezar cada etapa. Continuar / reintentar cargan desde aquí.
   Muerte permanente (Pesadilla Absoluta): al morir se borra y no hay reintento. */
function saveRun(){const p=S.p;
 try{STORE.setItem(RUN_KEY,JSON.stringify({cid:S.cid,did:DIFFS.indexOf(S.df),stage:S.stage,loop:S.loop,clock:S.clock,t:S.t,kills:S.kills,
  lvl:p.lvl,xp:p.xp,gold:p.gold,revive:p.revive,items:Object.assign({},p.items),mastery:p.mastery.slice()}))}catch(e){}}
function loadRun(){try{const r=JSON.parse(STORE.getItem(RUN_KEY));return r&&CHARS[r.cid]&&DIFFS[r.did]&&STAGES[r.stage]?r:null}catch(e){return null}}
function clearRun(){try{STORE.removeItem(RUN_KEY)}catch(e){}}

addEventListener('pagehide',()=>Save.write());
Save.load();
