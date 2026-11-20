'use strict';
/* ===================== PROGRESIÓN: evolución de habilidades, mutaciones, reliquias y desbloqueos por descubrimiento =====================
   - EVOLUCIÓN (32): cada 4 niveles eliges 1 de 3 mejoras para una habilidad concreta (daño, enfriamiento, área, proyectiles,
     duración o velocidad). Cambian de verdad los datos de la habilidad que usa el juego (ab()).
   - MUTACIONES (33): cada 7 niveles eliges 1 de 3 mutaciones con ventaja y coste; duran hasta el final de la run.
   - RELIQUIAS (34): antes de jugar eliges una reliquia que cambia una regla de la partida.
   - DESBLOQUEOS POR DESCUBRIMIENTO (35): las reliquias se ganan explorando (salas secretas, terminales, rescates, mazmorras,
     el Cazador y el Heraldo), no matando enemigos.
   Todo se guarda con la partida en curso y se reaplica al continuarla. */
const EVO_MODS=[
 {id:'dmg',name:'Potencia',desc:'+25% de daño',ok:d=>d.dmg||d.dps,ap:m=>{m.dmg*=1.25}},
 {id:'cd',name:'Celeridad',desc:'−20% de enfriamiento',ok:d=>d.cd>.2,ap:m=>{m.cd*=.8}},
 {id:'r',name:'Amplitud',desc:'+30% de alcance y área',ok:d=>d.r||d.range,ap:m=>{m.r*=1.3}},
 {id:'n',name:'Multiplicidad',desc:'+1 proyectil',ok:d=>['proj','ringshot','barrage','snipe'].includes(d.t),ap:m=>{m.n++}},
 {id:'time',name:'Persistencia',desc:'+40% de duración',ok:d=>d.time||d.dur,ap:m=>{m.time*=1.4}},
 {id:'spd',name:'Ímpetu',desc:'+30% de velocidad del proyectil',ok:d=>d.spd&&['proj','ringshot','barrage','snipe','rocket'].includes(d.t),ap:m=>{m.spd*=1.3}}];
const SLOT_KEY={p:'LMB',s:'RMB',m:'SHIFT',u:'Q'};
const newMod=()=>({dmg:1,cd:1,r:1,n:0,time:1,spd:1,lv:0});
// datos de la habilidad con las evoluciones aplicadas (se cachean por habilidad base: las formas de la Quimera tienen la suya)
function modAbility(d,m){if(!m||!m.lv)return d;const C=modAbility.cache||(modAbility.cache=new WeakMap());let byM=C.get(m);if(!byM){byM=new Map();C.set(m,byM)}
 if(byM.has(d))return byM.get(d);const o=Object.assign({},d);
 if(o.dmg)o.dmg*=m.dmg;if(o.dps)o.dps*=m.dmg;if(o.cd)o.cd*=m.cd;if(o.r)o.r*=m.r;if(o.range)o.range*=m.r;
 if(m.n&&['proj','ringshot','barrage','snipe'].includes(o.t))o.n=(o.n||1)+m.n;if(o.time)o.time*=m.time;if(o.dur)o.dur*=m.time;if(o.spd&&m.spd!==1)o.spd*=m.spd;
 byM.set(d,o);return o}

const MUTATIONS={
 vidrio:{name:'Piel de Vidrio',good:'+25% de daño',bad:'+20% de daño recibido',ap:p=>buff('mu_vidrio',Infinity,{dmg:1.25,taken:1.2})},
 volatil:{name:'Sangre Volátil',good:'al recibir un golpe explotas (300% de daño base)',bad:'−10% de vida máxima',ap:p=>{p.m.hpm-=.1;recalcHp()}},
 elastica:{name:'Patas Elásticas',good:'+1 salto en el aire',bad:'−10% de daño',ap:p=>{p.maxJ++;buff('mu_elastica',Infinity,{dmg:.9})}},
 hambre:{name:'Hambre Voraz',good:'+3% de robo de vida',bad:'sin regeneración natural',ap:p=>{p.m.ls+=.03;buff('mu_hambre',Infinity,{noregen:1})}},
 metabolismo:{name:'Metabolismo Acelerado',good:'+20% de velocidad de ataque',bad:'−25% a toda la curación',ap:p=>{p.m.as+=.2;buff('mu_metab',Infinity,{healm:.75})}},
 quitina:{name:'Coraza Quitinosa',good:'+20% de armadura',bad:'−15% de velocidad',ap:p=>{p.m.arm+=.2;buff('mu_quitina',Infinity,{spd:.85})}},
 iman:{name:'Imán Dimensional',good:'+40% de oro',bad:'los enemigos nacen con +15% de vida',ap:p=>{p.m.goldm+=.4}},
 sombra:{name:'Doble Sombra',good:'+15% de esquiva',bad:'−15% de vida máxima',ap:p=>{p.m.dodge+=.15;p.m.hpm-=.15;recalcHp()}},
 neuronas:{name:'Neuronas en Llamas',good:'−20% de enfriamientos',bad:'pierdes 0,5% de vida por segundo',ap:p=>{p.m.cdr+=.2;buff('mu_neur',Infinity,{drain:.005})}},
 tormenta:{name:'Hijo de la Tormenta',good:'+30% de daño mientras haya una anomalía',bad:'+10% de daño recibido',ap:p=>buff('mu_torm',Infinity,{dmg:()=>S.storm&&S.storm.act.length?1.3:1,taken:1.1})}};

const RELICS={
 brujula:{name:'Brújula Rota',desc:'Empiezas con un objeto raro, pero los cofres cuestan un 20% más',stat:'secrets',n:1,hint:'Encuentra una sala secreta',price:1.2,fresh:()=>giveItem(rollItem('r'))},
 arena:{name:'Reloj de Arena Negro',desc:'El reloj avanza un 25% más lento, pero ganas un 20% menos de oro',stat:'research',n:3,hint:'Investiga 3 enemigos en terminales',clock:.75,gold:.8},
 cristal:{name:'Corazón de Cristal',desc:'+50% de vida máxima, pero −40% a toda la curación',stat:'rescues',n:1,hint:'Rescata a un explorador',ap:p=>{p.m.hpm+=.5;recalcHp();buff('re_cristal',Infinity,{healm:.6})}},
 ojo:{name:'Ojo de la Tempestad',desc:'Cada etapa empieza con una anomalía, pero ganas un 35% más de oro',stat:'dungeons',n:1,hint:'Supera una mazmorra',gold:1.35,stage:()=>{if(S.storm&&!S.storm.act.length)stormUnleash(null,'Ojo de la Tempestad')}},
 semilla:{name:'Semilla del Vacío',desc:'La sobrecarga se llena un 50% más rápido, pero el agotamiento dura el doble',stat:'hunterKills',n:1,hint:'Derrota al Cazador del Vacío',energy:1.5,exhaust:2},
 corona:{name:'Corona del Heraldo',desc:'Los élites dan el triple de oro, pero aparecen un 50% más',stat:'secretBoss',n:1,hint:'Derrota al Heraldo del Vacío',eliteGold:3,elite:1.5}};
const relicUnlocked=k=>UNLOCK_ALL||Save.val(RELICS[k].stat)>=RELICS[k].n;
const REL=()=>(S&&S.relic&&RELICS[S.relic])||{};

/* ---------- inicio de partida y guardado ---------- */
function progStart(run){const p=S.p;p.muts=[];p.abm={p:newMod(),s:newMod(),m:newMod(),u:newMod()};S.pick=[];
 const want=run?run.relic:Save.d.settings.relic;S.relic=want&&RELICS[want]&&(run||relicUnlocked(want))?want:null;const R=REL();
 if(run){for(const k in run.abm||{})Object.assign(p.abm[k],run.abm[k]);for(const k of run.muts||[])takeMutation(k,1)}
 else if(R.fresh)R.fresh();
 if(R.ap)R.ap(p);if(R.stage)R.stage();if(S.relic)S.sch.push({t:1.5,f:()=>{if(S)say(`✧ Reliquia: ${RELICS[S.relic].name} — ${RELICS[S.relic].desc}`)}})}
// cada etapa nueva: efecto de la reliquia (la primera etapa la cubre progStart, que se ejecuta después de cargarla)
function progStage(){const R=REL();if(R.stage)R.stage()}
const progSave=()=>({relic:S.relic||null,muts:S.p.muts||[],abm:Object.fromEntries(Object.entries(S.p.abm||{}).map(([k,m])=>[k,{dmg:m.dmg,cd:m.cd,r:m.r,n:m.n,time:m.time,spd:m.spd,lv:m.lv}]))});
function progSpawn(e){if(S.p.muts&&S.p.muts.includes('iman')&&!e.d.structure){e.hp*=1.15;e.maxHp*=1.15}}  // se llama tras fijar maxHp: hay que subir ambos

/* ---------- elecciones (evolución y mutación) ---------- */
function progInit(){Ev.on('onLevelUp',l=>{if(l%4===0)S.pick.push('evo');if(l%7===0)S.pick.push('mut')});
 Ev.on('onTakeDamage',()=>{const p=S.p;if(p.muts&&p.muts.includes('volatil')&&!(p.ist.volT>S.t)){p.ist.volT=S.t+.6;boom(p.x,p.y-20,140,ib()*3,'#ff3c5a')}})}
function updProg(){if(S.st==='play'&&S.pick&&S.pick.length&&!S.mq)openPick(S.pick.shift())}
let pickOpts=[];
function openPick(kind){const p=S.p;S.st='choice';mouse.l=mouse.r=0;
 if(kind==='evo'){const cands=[];for(const sl of 'psmu'){const d=S.ch[SLOT[sl]],base=d.forms?d.forms.a:d;for(const M of EVO_MODS)if(M.ok(base))cands.push({sl,M,ab:base})}
  pickOpts=cands.sort(()=>Math.random()-.5).slice(0,3).map(c=>({kind,sl:c.sl,id:c.M.id,title:`${c.ab.name} (${(touchOn()?TOUCH_KEY:SLOT_KEY)[c.sl]})`,sub:`${c.M.name}: ${c.M.desc}`,col:'#3cf0ff'}));
  $('choiceT').textContent='⬆ EVOLUCIÓN DE HABILIDAD'}
 else{const free=Object.keys(MUTATIONS).filter(k=>!p.muts.includes(k)).sort(()=>Math.random()-.5).slice(0,3);
  pickOpts=free.map(k=>({kind,id:k,title:MUTATIONS[k].name,sub:`✚ ${MUTATIONS[k].good}<br>✖ ${MUTATIONS[k].bad}`,col:'#9b30ff'}));$('choiceT').textContent='☣ MUTACIÓN'}
 if(!pickOpts.length){S.st='play';return}
 $('choiceOpts').innerHTML=pickOpts.map((o,i)=>`<div class="card sel" data-i="${i}" style="--c:${o.col}"><b>${esc(o.title)}</b><small>${o.sub}</small></div>`).join('');
 $('choice').style.display='flex';Snd.play('level')}
function takeEvo(sl,id){const m=S.p.abm[sl];EVO_MODS.find(x=>x.id===id).ap(m);m.lv++;modAbility.cache=null}
function takeMutation(k,silent){const p=S.p;if(p.muts.includes(k))return;p.muts.push(k);MUTATIONS[k].ap(p);if(!silent){chromaHit(.5);burst(p.x,p.y-20,20,'#9b30ff',300,3)}}
$('choiceOpts').onclick=e=>{const k=e.target.closest('.card');if(!k||!S||S.st!=='choice')return;const o=pickOpts[+k.dataset.i];
 if(o.fn)o.fn();else if(o.kind==='evo'){takeEvo(o.sl,o.id);say(`⬆ ${o.title}: ${o.sub}`)}else{takeMutation(o.id);say(`☣ Mutación: ${o.title}`)}
 $('choice').style.display='none';S.st='play';mouse.l=mouse.r=0};

/* ---------- interfaz ---------- */
// mutaciones activas, arriba a la izquierda bajo el oro (texto pequeño)
function drawProgHud(){const p=S.p;if(!p.muts||!p.muts.length)return;c.textAlign='left';c.font='bold 9px monospace';c.fillStyle='#d070ff';
 c.fillText('☣ '+p.muts.map(k=>MUTATIONS[k].name).join(' · '),16,H-88)}
// selector de reliquia en la pantalla de personaje
function buildRelics(){const cur=Save.d.settings.relic,ks=Object.keys(RELICS);
 $('relics').innerHTML=`<span class="rl">Reliquia:</span><div class="diff ${!cur?'sel':''}" data-r="">Ninguna</div>`+ks.map(k=>{const R=RELICS[k],ok=relicUnlocked(k);
  return `<div class="diff ${cur===k?'sel':''} ${ok?'':'lock'}" data-r="${k}" title="${esc(ok?R.desc:'🔒 '+R.hint)}">${ok?'':'🔒 '}${esc(R.name)}</div>`}).join('');
 const R=cur&&RELICS[cur];$('relicDesc').textContent=R?`✧ ${R.desc}`:''}
$('relics').onclick=e=>{const b=e.target.closest('[data-r]');if(!b)return;const k=b.dataset.r;
 if(k&&!relicUnlocked(k)){$('relicDesc').textContent=`🔒 ${RELICS[k].name}: ${RELICS[k].hint} para desbloquearla`;Snd.play('hurt');return}
 Save.d.settings.relic=k||null;Save.write();buildRelics();Snd.play('ui')};
// el selector de personaje (ui.js) también muestra las reliquias: se amplía buildMenu cuando este módulo ya está cargado
const _buildMenu=buildMenu;buildMenu=function(){_buildMenu();buildRelics()};
