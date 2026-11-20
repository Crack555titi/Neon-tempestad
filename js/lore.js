'use strict';
/* ===================== MEMORIA DEL MUNDO =====================
   - ECOS (9): al morir dejas un eco en esa etapa. En partidas futuras puede aparecer: guarda uno de tus objetos,
     algo de oro o un desafío (tu eco reforzado). Se consume al usarlo; se guardan los 6 más recientes.
   - RECUERDOS (39): cada jefe derrotado por primera vez deja un recuerdo con un fragmento de la historia; se leen en el Códice.
   - EVENTOS SECRETOS (8): ocurren al cumplir condiciones ocultas en una etapa:
     Quietud (10 s inmóvil sin enemigos cerca), Intocable (15 bajas seguidas sin recibir daño) y
     Cartógrafo (tocar los dos extremos del mapa).
   - DESAFÍOS PERSONALES (36): cada héroe tiene una historia en 3 capítulos (según su familia) que avanza jugando con él;
     cada capítulo da cristales. El progreso se ve en el Códice. */
const LORE=()=>Save.d.lore;
const MEMORIES={
 prisma:{t:'El primer cristal',d:'El Coloso fue un faro: refractaba la luz de la ciudad para que nadie se perdiera en la tormenta. Cuando la tormenta llegó, la luz se volvió muro.'},
 hydra:{t:'Cables que recuerdan',d:'Cada cabeza de la Hidra era una red de la vieja ciudad. Al cortarlas, escuchas por un instante las voces que transportaban.'},
 queen:{t:'La corona vacía',d:'La Reina gobernaba a los que la tormenta borró. Su corona no tenía joyas: tenía nombres.'},
 leviathan:{t:'El archivo hundido',d:'El Leviatán se tragó el archivo central para protegerlo. Nadie le dijo que ya no quedaba nadie para leerlo.'},
 archon:{t:'El ojo de la tormenta',d:'El Arconte no creó la Tempestad: la heredó. En su núcleo encuentras el mismo símbolo que llevas en el pecho.'},
 herald:{t:'Lo que hay detrás',d:'El Heraldo no anunciaba el fin. Anunciaba que alguien, al otro lado del vacío, seguía esperando respuesta.'}};
const CHAL_FAM={
 'Vanguardia':['Juraste proteger la última muralla. Demuéstralo: derrota a 150 enemigos.','Un jefe cayó ante tu escudo. Los supervivientes empiezan a seguirte.','Llegaste al corazón de la tormenta. La muralla ahora eres tú.'],
 'Artillería':['Calibra el arma: 150 bajas a distancia segura.','El primer gigante cae. Tu nombre se pinta en los cañones.','Desde la última etapa ves toda la ciudad. Ningún objetivo queda fuera de alcance.'],
 'Invocadores':['Tus aliados aún dudan de ti. Gánate su confianza: 150 bajas.','Juntos derribaron a un jefe. Por primera vez te llaman por tu nombre.','En el corazón de la tormenta, tus invocados ya no obedecen: te acompañan.'],
 'Tiempo/Espacio':['El tiempo se repite. Rompe el bucle: 150 bajas.','Un jefe cae y el reloj se detiene un segundo. Lo suficiente.','Al final del camino encuentras una versión de ti que nunca se rindió.'],
 'Malditos/Híbridos':['La maldición tiene hambre: aliméntala con 150 bajas.','Un jefe cae y la marca en tu piel brilla menos. ¿O es que ya no la notas?','En la última etapa entiendes que la maldición nunca fue el enemigo.']};
const CHAL_GEMS=[30,60,120];
/* ---------- recuerdos ---------- */
function memoryGet(bid){const L=LORE();if(!MEMORIES[bid]||L.mem[bid])return false;L.mem[bid]=Date.now();Save.write();
 S.sch.push({t:2.5,f:()=>say(`📜 Recuerdo desbloqueado: «${MEMORIES[bid].t}» (Códice)`)});return true}
/* ---------- ecos ---------- */
function echoRecord(){const p=S.p,L=LORE(),ord='curlmf';
 const items=Object.keys(p.items).filter(id=>p.items[id]>0&&ITEM[id]&&ITEM[id].r!=='c'&&ITEM[id].r!=='f').sort((a,b)=>ord.indexOf(ITEM[b].r)-ord.indexOf(ITEM[a].r)).slice(0,2);
 L.echoes.push({cid:S.cid,ch:S.ch.name,col:S.ch.color,stage:S.stage,items,gold:Math.round(Math.min(p.gold,2000)*.5),lvl:p.lvl,t:Date.now()});
 L.echoes=L.echoes.slice(-6);Save.write()}
function echoStage(){S.born=S.born||Date.now();const L=LORE(),e=L.echoes.find(x=>x.stage===S.stage&&x.t<S.born);if(!e||Math.random()>.6)return;
 S.ints.push(Object.assign({k:'echo',echo:e},spot()))}
function echoUse(o){const e=o.echo,L=LORE(),p=S.p;o.open=1;L.echoes=L.echoes.filter(x=>x!==e);Save.write();Save.add('echoes');
 const r=Math.random();
 if(r<.4&&e.items.length){const id=e.items[Math.random()*e.items.length|0];giveItem(id);say(`👻 El eco de ${e.ch} te entrega lo que llevaba: ${ITEM[id].name}`)}
 else if(r<.7){p.gold+=e.gold+50;say(`👻 El eco de ${e.ch} deja caer ${e.gold+50} de oro y se desvanece`)}
 else{const f=spawnEnemy(null,o.x,o.y-60,1);if(!f){p.gold+=e.gold;return}f.hp*=2.5+e.lvl*.05;f.maxHp=f.hp;f.echoFoe=e;
  say(`👻 El eco de ${e.ch} no descansa: ¡derrota a lo que lo retiene!`)}
 burst(o.x,o.y-30,24,e.col,300,3);Snd.play('phase')}
function drawEcho(o){if(o.open)return;const e=o.echo;c.save();c.globalAlpha=.4+.15*Math.sin(S.t*3);
 drawHero(c,o.x,o.y+Math.sin(S.t*2)*3,{cid:e.cid,col:e.col,face:1,aim:0,run:0,moving:0,atk:0,t:S.t,ghost:1});c.restore();
 c.globalAlpha=.7;c.font='bold 10px monospace';c.textAlign='center';c.fillStyle=e.col;c.fillText(`ECO · ${e.ch}`,o.x,o.y-62);c.globalAlpha=1}
/* ---------- eventos secretos ---------- */
function secState(){return S.sec||(S.sec={still:0,streak:0,l:0,r:0,done:{}})}
function secretEvent(id,name,fn){const st=secState();if(st.done[id])return;st.done[id]=1;Save.add('secretEvents');fn();
 say(`✧ EVENTO SECRETO: ${name}`);chromaHit(.4);Snd.play('chest')}
function updSecrets(dt){const s=S,p=s.p,st=secState();if(s.boss||s.dungeon)return;
 const calm=!s.en.some(e=>!e.dead&&!e.d.structure&&hyp(e.x-p.x,e.y-p.y)<420);
 st.still=Math.abs(p.vx)<5&&p.ground&&calm?st.still+dt:0;
 if(st.still>=10)secretEvent('quietud','Quietud — la tormenta se calma a tu alrededor',()=>{s.ints.push({k:'chest',tier:'large',open:0,x:p.x+40*(p.face||1),y:p.y});heal(p.maxHp*.25)});
 if(p.x<120)st.l=1;if(p.x>WORLD-120)st.r=1;
 if(st.l&&st.r)secretEvent('cartografo','Cartógrafo — conoces cada rincón de esta dimensión',()=>{p.gold+=Math.round(priceOf({tier:'large'}));giveItem(rollItem('u'))});
 if(st.streak>=15)secretEvent('intocable','Intocable — 15 bajas sin un rasguño',()=>giveItem(rollItem('r')))}
/* ---------- desafíos personales ---------- */
const chalOf=cid=>LORE().chal[cid]||(LORE().chal[cid]={step:0,kills:0});
function chalAdvance(step){const C=chalOf(S.cid);if(C.step!==step)return;C.step++;const g=CHAL_GEMS[step];Save.d.shop.gems+=g;Save.write();
 const txt=(CHAL_FAM[S.ch.fam]||CHAL_FAM.Vanguardia)[step];
 S.sch.push({t:1.5,f:()=>say(`📖 ${S.ch.name} · capítulo ${step+1}/3 completado (+${g} 💎): ${txt.split('.')[0]}`)})}
/* ---------- integración ---------- */
function loreStage(){S.sec=null;echoStage();if(S.stage>=STAGES.length-1)chalAdvance(2)}
function loreInteract(o){if(o.k==='echo'){echoUse(o);return true}return false}
function loreDraw(o){if(o.k==='echo'){drawEcho(o);return true}return false}
function loreMsg(o){return o.k==='echo'?[`[E] Eco de ${o.echo.ch} (nivel ${o.echo.lvl}) · ¿qué dejó atrás?`,true]:''}
function loreInit(){S.born=S.born||Date.now();
 Ev.on('onKill',e=>{const st=secState();st.streak++;if(e.boss){memoryGet(e.bid);chalAdvance(1)}
  if(e.echoFoe){const E=e.echoFoe;S.p.gold+=E.gold;if(E.items.length)giveItem(E.items[0]);say(`👻 El eco de ${E.ch} por fin descansa`)}
  const C=chalOf(S.cid);if(C.step===0&&++C.kills>=150)chalAdvance(0)});
 Ev.on('onTakeDamage',()=>{secState().streak=0})}
function updLore(dt){updSecrets(dt)}
// Códice: recuerdos y desafíos personales debajo de las fichas de enemigos
function loreHtml(){const L=LORE();
 const mem=Object.keys(MEMORIES).map(k=>L.mem[k]?`<div class="cx" style="--c:${BOSSES[k].color}"><b>📜 ${esc(MEMORIES[k].t)}</b><small>${esc(MEMORIES[k].d)}</small><span>${esc(BOSSES[k].name)}</span></div>`
  :`<div class="cx unk"><b>📜 ???</b><small>Derrota a este jefe para recordarlo</small></div>`).join('');
 const ch=Object.keys(CHARS).map(id=>{const C=L.chal[id]||{step:0,kills:0},F=CHAL_FAM[CHARS[id].fam]||CHAL_FAM.Vanguardia,n=Math.min(3,C.step);
  return `<div class="cx" style="--c:${CHARS[id].color}"><b>${esc(CHARS[id].name)} · ${n}/3</b><small>${n<3?esc(F[n])+(n===0?` (${C.kills}/150)`:''):'Historia completada.'}</small></div>`}).join('');
 return `<h3 class="cxh">Recuerdos</h3>${mem}<h3 class="cxh">Desafíos personales</h3>${ch}`}
{const _oc=openCodex;openCodex=function(){_oc();$('codexList').innerHTML+=loreHtml();const st=Save.d.stats;
 $('codexStats').textContent+=` · Recuerdos ${Object.keys(LORE().mem).length}/${Object.keys(MEMORIES).length} · Eventos secretos ${st.secretEvents||0} · Ecos ${st.echoes||0}`}}
{const _eg=endGame;endGame=function(win,cashout){if(!win&&!cashout&&S&&S.st!=='over')echoRecord();_eg(win,cashout)}}
