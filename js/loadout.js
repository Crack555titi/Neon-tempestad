'use strict';
/* ===================== PREPARACIÓN, FACCIONES Y MODOS =====================
   - MAESTRÍA INDIVIDUAL (31): cada héroe tiene 3 ramas (su elemento, una técnica de su familia y resistencia) de 3 niveles.
     Ganas 1 punto por partida en la que llegas a la etapa 2 y otro si derrotas a un jefe (máx. 9). Se reparten en el selector.
   - ARMAS MODIFICABLES (37): un componente para el ataque principal: cargador, núcleo, alcance o mecanismo.
   - HABILIDADES ALTERNATIVAS (20): completar la historia personal de un héroe desbloquea una versión alternativa de su secundaria.
   - COMPAÑERO Y SINERGIAS (17): eliges a otro héroe como compañero: te sigue, dispara y, cuando usas la definitiva,
     hace el movimiento de su familia. Ciertas parejas de familias combinan ambos en una SINERGIA.
   - REPUTACIÓN (38): Guardianes del Equilibrio, Culto de la Tormenta y Gremio Mercante recuerdan tus decisiones
     (tratos, núcleos, rescates, compras y deudas) y te ayudan o te cobran más en partidas futuras.
   - FINALES (40): al ganar, tus decisiones eligen el final (Superviviente, Guardián, Tormenta, Sombra, Mercader o el verdadero).
   - CAMPAÑA (70): modo narrativo; cada etapa abre con un capítulo y el final verdadero revela el origen de la Tempestad.
   - INVERSIÓN (69): eres la Criatura y sobrevives a 10 oleadas de héroes controlados por el juego. */
const MT_MAX=9;
const MT_FAM={'Vanguardia':{n:'Contraataque',k:'arm',v:.05,d:'+5% armadura'},'Artillería':{n:'Precisión',k:'cdr',v:.05,d:'−5% enfriamientos'},
 'Invocadores':{n:'Enjambre',k:'as',v:.08,d:'+8% vel. de ataque'},'Tiempo/Espacio':{n:'Cronometría',k:'mcdr',v:.08,d:'−8% enfriamiento del impulso'},
 'Malditos/Híbridos':{n:'Hambre',k:'ls',v:.02,d:'+2% robo de vida'}};
const mtBranches=cid=>{const F=MT_FAM[CHARS[cid].fam]||MT_FAM.Vanguardia,el=CHAR_EL[cid];
 return [{n:el?`Rama de ${elemName(el)}`:'Ofensiva',k:'dmg',v:.08,d:'+8% de daño'},F,{n:'Resistencia',k:'hpm',v:.08,d:'+8% de vida máxima'}]};
const mtOf=cid=>{const L=LORE(),m=L.mt||(L.mt={});return m[cid]||(m[cid]={pts:0,sp:[0,0,0]})};
function mtSpend(cid,i){const M=mtOf(cid);if(M.pts<=0||M.sp[i]>=3)return false;M.pts--;M.sp[i]++;Save.write();return true}
function mtReset(cid){const M=mtOf(cid);M.pts+=M.sp.reduce((a,b)=>a+b,0);M.sp=[0,0,0];Save.write()}
function mtApply(){const p=S.p,M=mtOf(S.cid),B=mtBranches(S.cid);B.forEach((b,i)=>{if(M.sp[i])p.m[b.k]+=b.v*M.sp[i]});recalcHp()}
function mtEarn(){const M=mtOf(S.cid),have=M.pts+M.sp.reduce((a,b)=>a+b,0);let g=(S.stage>=1||S.loop?1:0)+(S.runBoss?1:0);g=Math.min(g,MT_MAX-have);if(g>0){M.pts+=g;Save.write()}return g}
/* ---------- armas modificables ---------- */
const WMODS={cargador:{n:'Cargador ampliado',d:'+1 proyectil, −15% de daño',m:{n:1,dmg:.85},proj:1},nucleo:{n:'Núcleo sobrecargado',d:'+30% de daño, +20% de enfriamiento',m:{dmg:1.3,cd:1.2}},
 alcance:{n:'Cañón largo',d:'+40% de alcance y área, −10% de daño',m:{r:1.4,dmg:.9}},mecanismo:{n:'Mecanismo rápido',d:'−30% de enfriamiento, −15% de daño',m:{cd:.7,dmg:.85}}};
const PROJ_T=['proj','ringshot','barrage','snipe'];
const wmodOk=(cid,k)=>!WMODS[k].proj||PROJ_T.includes(CHARS[cid].primary.t);
const wmCache=new WeakMap();
function wmodApply(d,k){const W=WMODS[k];if(!W)return d;let o=wmCache.get(d);if(o&&o.k===k)return o.v;const v=Object.assign({},d),m=W.m;
 if(m.dmg){if(v.dmg)v.dmg*=m.dmg;if(v.dps)v.dps*=m.dmg}if(m.cd&&v.cd)v.cd*=m.cd;if(m.r){if(v.r)v.r*=m.r;if(v.range)v.range*=m.r}if(m.n&&PROJ_T.includes(v.t))v.n=(v.n||1)+m.n;
 wmCache.set(d,{k,v});return v}
/* ---------- habilidades alternativas (20): se desbloquean al completar la historia personal del héroe ---------- */
const ALT_FAM={'Vanguardia':{n:'Pesada',d:'+50% de daño, +30% de enfriamiento',m:{dmg:1.5,cd:1.3}},'Artillería':{n:'Dispersa',d:'+2 proyectiles, −20% de daño',m:{n:2,dmg:.8}},
 'Invocadores':{n:'Persistente',d:'+50% de duración, +20% de daño',m:{time:1.5,dmg:1.2}},'Tiempo/Espacio':{n:'Expandida',d:'+50% de área y alcance',m:{r:1.5}},
 'Malditos/Híbridos':{n:'Voraz',d:'+30% de daño, −15% de enfriamiento',m:{dmg:1.3,cd:.85}}};
const altOk=cid=>LORE().chal[cid]&&LORE().chal[cid].step>=3;
const altCache=new WeakMap();
function altApply(d,fam){const A=ALT_FAM[fam];if(!A)return d;let v=altCache.get(d);if(v)return v;v=Object.assign({},d,{name:d.name+' '+A.n});const m=A.m;
 // sin el rasgo que mejora (proyectiles, área, duración) el coste no se aplica y se compensa con daño: nunca es peor que la original
 const proj=PROJ_T.includes(v.t),hasD=v.dmg||v.dps||v.pct,dm=m.n&&!proj?1.25:m.dmg||1;
 if(dm!==1){if(v.dmg)v.dmg*=dm;if(v.dps)v.dps*=dm;if(v.pct)v.pct*=dm}if(m.cd&&v.cd&&(m.cd<1||hasD))v.cd*=m.cd;
 if(m.r){if(v.r)v.r*=m.r;if(v.range)v.range*=m.r;if(v.dist)v.dist*=m.r;if(!v.r&&!v.range&&!v.dist&&v.dmg)v.dmg*=1.3}
 if(m.time){if(v.time)v.time*=m.time;if(v.dur)v.dur*=m.time}if(m.n&&proj)v.n=(v.n||1)+m.n;altCache.set(d,v);return v}
/* ---------- compañero y sinergias ---------- */
const COMP_MOVE={
 'Vanguardia':{n:'Muro',fx(){buff('comp',4,{taken:.6});ring(S.p.x,S.p.y-20,90,'#ff5a3c',.4)}},
 'Artillería':{n:'Andanada',fx(){for(const e of S.en.filter(e=>!e.dead&&!e.hidden).slice(0,6))boom(e.x,e.y-e.h/2,70,ib()*3,'#ffd23c')}},
 'Invocadores':{n:'Llamada',fx(){for(let i=0;i<2;i++)S.dr.push({k:'orbit',sw:1,perm:1,a:i*Math.PI,life:10,cd:0,dmg:9,x:S.p.x,y:S.p.y-20})}},
 'Tiempo/Espacio':{n:'Pozo gravitatorio',fx(c0){const x=c0||S.p.x+S.p.face*160;for(const e of S.en)if(!e.dead&&!e.boss&&!e.d.structure&&Math.abs(e.x-x)<360){e.x+=(x-e.x)*.7;e.slowT=Math.max(e.slowT,2.5)}ring(x,S.p.y-30,360,'#3cf0ff',.5);return x}},
 'Malditos/Híbridos':{n:'Drenaje',fx(){let n=0;for(const e of S.en)if(!e.dead&&hyp(e.x-S.p.x,e.y-S.p.y)<260){hurtE(e,ib()*2,PROCRAW);n++}heal(S.p.maxHp*.02*n);ring(S.p.x,S.p.y-20,260,'#ff1f4b',.4)}}};
const SYNERGY={
 'Artillería|Tiempo/Espacio':{n:'Colapso de artillería',fx(){const x=COMP_MOVE['Tiempo/Espacio'].fx();boom(x,S.p.y-30,200,ib()*20,'#ff3cf2')}},
 'Invocadores|Vanguardia':{n:'Legión acorazada',fx(){COMP_MOVE['Vanguardia'].fx();COMP_MOVE['Invocadores'].fx();buff('comp',6,{taken:.5})}},
 'Malditos/Híbridos|Tiempo/Espacio':{n:'Hambre detenida',fx(){COMP_MOVE['Tiempo/Espacio'].fx(S.p.x);COMP_MOVE['Malditos/Híbridos'].fx();COMP_MOVE['Malditos/Híbridos'].fx()}},
 'Artillería|Vanguardia':{n:'Asalto combinado',fx(){COMP_MOVE['Vanguardia'].fx();COMP_MOVE['Artillería'].fx();buff('comp_d',5,{dmg:1.25})}},
 'Invocadores|Malditos/Híbridos':{n:'Enjambre sangriento',fx(){COMP_MOVE['Invocadores'].fx();heal(S.p.maxHp*.12)}}};
const synKey=(a,b)=>[a,b].sort().join('|');
function compAct(){const C=S.comp;if(!C)return;const syn=SYNERGY[synKey(S.ch.fam,C.fam)];
 if(syn&&S.ch.fam!==C.fam){syn.fx();say(`✦ SINERGIA: ${syn.n} (${S.ch.name} + ${CHARS[C.cid].name})`);chromaHit(.6)}else{COMP_MOVE[C.fam].fx();txt(C.x,C.y-60,COMP_MOVE[C.fam].n,CHARS[C.cid].color,13)}}
function updComp(dt){const C=S.comp,p=S.p;if(!C)return;C.x+=(p.x-p.face*50-C.x)*Math.min(1,dt*4);C.y+=(p.y-30-C.y)*Math.min(1,dt*4);
 if((C.cd-=dt)>0)return;let b=null,bd=520;for(const e of S.en){if(e.dead||e.hidden)continue;const d=hyp(e.x-C.x,e.y-e.h/2-C.y);if(d<bd){bd=d;b=e}}
 if(!b)return;C.cd=1.1;hurtE(b,ib()*.7,PROC);C.aim=Math.atan2(b.y-b.h/2-C.y,b.x-C.x);ring(b.x,b.y-b.h/2,16,CHARS[C.cid].color,.15)}
function drawComp(){const C=S.comp;if(!C)return;c.save();c.globalAlpha=.75;drawHero(c,C.x,C.y+30,{cid:C.cid,col:CHARS[C.cid].color,face:sgn(S.p.face)||1,aim:C.aim||0,run:S.t*6,moving:1,atk:0,t:S.t});c.restore()}
/* ---------- reputación ---------- */
const FACTIONS={guard:{n:'Guardianes del Equilibrio',col:'#4cff9a',hi:'+10% de vida máxima',lo:'los rescatados desconfían: −10% de curación'},
 cult:{n:'Culto de la Tormenta',col:'#b070ff',hi:'+10% de daño, pero empiezas con 10 de corrupción',lo:'la tormenta te rechaza: −5% de daño'},
 guild:{n:'Gremio Mercante',col:'#ffd23c',hi:'precios −15%',lo:'precios +15%'}};
const repOf=()=>{const L=LORE();return L.rep||(L.rep={guard:0,cult:0,guild:0})};
function repAdd(f,n){if(!S||!n)return;const R=repOf();R[f]=clamp(R[f]+n,-100,100);Save.write();txt(S.p.x,S.p.y-90,`⚖ ${FACTIONS[f].n} ${n>0?'+':''}${n}`,FACTIONS[f].col,10)}
function repApply(fresh){const R=repOf(),p=S.p;
 if(R.guard>=30){p.m.hpm+=.1;recalcHp()}if(R.guard<=-30)buff('rep_g',Infinity,{healm:.9});
 if(R.cult>=30){buff('rep_c',Infinity,{dmg:1.1});if(fresh)p.taint=Math.max(p.taint||0,10)}if(R.cult<=-30)buff('rep_c',Infinity,{dmg:.95})}
const repPrice=()=>{const g=repOf().guild;return g>=30?.85:g<=-30?1.15:1};
/* ---------- finales ---------- */
const ENDINGS={
 verdadero:{n:'El Origen',d:'Los cinco escenarios eran piezas de una misma estructura: un refugio que los héroes construyeron para encerrar su propio miedo. La Tempestad no vino de fuera. Nació de ellos. Y ahora, por fin, se calma.'},
 sombra:{n:'Final de la Sombra',d:'Venciste a la Tempestad, pero la corrupción ya era tuya. Al salir, tu sombra sigue un paso detrás… y sonríe.'},
 tormenta:{n:'Final de la Tormenta',d:'El Culto te recibe como a su nuevo Arconte. La tormenta no se detiene: ahora obedece.'},
 guardian:{n:'Final del Guardián',d:'Los Guardianes sellan la última grieta contigo. La ciudad vuelve a encender sus luces, una a una.'},
 mercader:{n:'Final del Gremio',d:'El Gremio compra lo que queda de la Tempestad. Dicen que la venden embotellada en los mercados del este.'},
 superviviente:{n:'Final del Superviviente',d:'Sobreviviste. No sabes por qué empezó todo, pero sabes que aún queda algo por descubrir.'}};
function pickEnding(){const R=repOf(),L=LORE();
 if(S.campaign&&L.mem.herald&&Object.keys(L.mem).length>=5)return 'verdadero';
 if((S.p.taint||0)>=75)return 'sombra';if(R.cult>=40)return 'tormenta';if(R.guard>=40)return 'guardian';if(R.guild>=40)return 'mercader';return 'superviviente'}
/* ---------- campaña ---------- */
const CAMPAIGN=[
 {t:'Capítulo I · El faro apagado',d:'La tormenta se tragó la ciudad en una noche. Despiertas en las ruinas con un símbolo grabado en el pecho que no recuerdas haberte hecho.'},
 {t:'Capítulo II · La fundición',d:'Los obreros siguen trabajando aunque ya no son personas. Forjan algo enorme. Algo que lleva tu símbolo.'},
 {t:'Capítulo III · El jardín de datos',d:'Un archivo vivo guarda los nombres de todos los héroes que entraron antes que tú. El último nombre de la lista es el tuyo.'},
 {t:'Capítulo IV · Las profundidades',d:'Bajo la ciudad, los escenarios se tocan: son paredes de una misma estructura. Alguien la construyó desde dentro.'},
 {t:'Capítulo V · El ojo',d:'El Arconte te espera. No para luchar: para devolverte lo que dejaste aquí. Busca los recuerdos de todos los jefes y al Heraldo del Vacío si quieres la verdad completa.'}];
let MODE_NEXT=null;  // 'camp' o 'inv' para la próxima partida
function storyCard(title,text,cb){S.st='choice';mouse.l=mouse.r=0;pickOpts=[{kind:'story',title:'Continuar ▶',sub:text,col:'#ffd23c',fn:cb||(()=>{})}];
 $('choiceT').textContent=title;$('choiceOpts').innerHTML=`<div class="card sel story" data-i="0" style="--c:#ffd23c"><small>${esc(text)}</small><b>Continuar ▶</b></div>`;$('choice').style.display='flex'}
/* ---------- inversión de roles ---------- */
const INV_WAVES=10;
function invStart(){const s=S,p=s.p;s.mode='inv';s.wave=s.wave||0;s.waveT=3;p.m.hpm+=2;recalcHp();p.hp=p.maxHp;p.dmgMul*=1.5;s.spawn=1e9;
 s.ints=s.ints.filter(o=>o.k!=='tp');s.hot=null;say('👾 INVERSIÓN: eres la Criatura. Sobrevive a 10 oleadas de héroes')}
function updInversion(dt){const s=S;if(s.mode!=='inv')return;s.spawn=1e9;const foes=s.en.filter(e=>e.hcid&&!e.dead);if(foes.length)return;
 if(s.wave>=INV_WAVES){if(!s.invDone){s.invDone=1;say('👾 ¡Has sobrevivido a todos los héroes!');s.sch.push({t:2,f:()=>endGame(true,true)})}return}
 if((s.waveT-=dt)>0)return;
 if(s.wave>0){heal(s.p.maxHp*.3);giveItem(rollItem(s.wave%3?'u':'r'))}
 s.wave++;s.waveT=4;const n=2+s.wave,ids=Object.keys(CHARS),types=['h_blade','h_gun','h_mage'];
 for(let i=0;i<n;i++){const e=spawnEnemy(types[i%3],clamp(s.p.x+(i%2?1:-1)*R(380,700),40,WORLD-40),60,1);if(!e)continue;
  e.hcid=ids[Math.random()*ids.length|0];e.hp*=1+s.wave*.25;e.maxHp=e.hp}
 say(`👾 Oleada ${s.wave}/${INV_WAVES}: llegan ${n} héroes`)}
function drawHeroFoe(e){c.save();if(e.flash>0)c.globalAlpha=.7;drawHero(c,e.x,e.y,{cid:e.hcid,col:e.flash>0?'#fff':CHARS[e.hcid].color,face:sgn(S.p.x-e.x)||1,
 aim:Math.atan2(S.p.y-e.y,S.p.x-e.x),run:S.t*8,moving:Math.abs(e.vx)>20,atk:e.tell>0?1:0,t:S.t});c.restore()}
/* ---------- integración ---------- */
function loadoutStart(run){const s=S;
 s.mode=run?run.mode||null:MODE_NEXT==='inv'?'inv':null;s.campaign=run?!!run.campaign:MODE_NEXT==='camp';MODE_NEXT=null;
 s.wmod=run?run.wmod||null:(Save.d.settings.wmod&&wmodOk(s.cid,Save.d.settings.wmod)?Save.d.settings.wmod:null);
 const cc=run?run.comp:Save.d.settings.comp;s.comp=cc&&CHARS[cc]&&cc!==s.cid&&s.mode!=='inv'?{cid:cc,fam:CHARS[cc].fam,x:s.p.x,y:s.p.y,cd:1}:null;
 s.alt=run?!!run.alt:!!(Save.d.settings.alt&&Save.d.settings.alt[s.cid]&&altOk(s.cid));
 s.runBoss=0;mtApply();repApply(!run);
 if(s.mode==='inv'){if(run)s.wave=run.wave||0;invStart()}
 if(s.campaign&&!run)s.sch.push({t:.6,f:()=>{if(S===s&&s.st==='play')storyCard(CAMPAIGN[0].t,CAMPAIGN[0].d)}})}
function loadoutStage(){const s=S;if(!s||!s.p)return;if(s.mode==='inv'){s.spawn=1e9;s.ints=s.ints.filter(o=>o.k!=='tp')}
 if(s.campaign&&s.stage>0&&!s.loop){const C=CAMPAIGN[s.stage];if(C){const L=LORE();L.camp=Math.max(L.camp||0,s.stage+1);Save.write();s.sch.push({t:.8,f:()=>{if(S===s&&s.st==='play')storyCard(C.t,C.d)}})}}}
const loadoutSave=()=>({mode:S.mode||null,wave:S.wave||0,campaign:!!S.campaign,wmod:S.wmod||null,comp:S.comp?S.comp.cid:null,alt:!!S.alt});
function loadoutInit(){Ev.on('onCast',sl=>{if(sl==='u')compAct()});Ev.on('onKill',e=>{if(e.boss)S.runBoss=1})}
function updLoadout(dt){updComp(dt);updInversion(dt)}
/* reputación: las decisiones existentes la mueven */
{const _td=takeDeal;takeDeal=function(id){if(id==='estabilizar')repAdd('guard',8);else{repAdd('cult',8);repAdd('guard',-4)}return _td(id)}}
{const _tc=takeCore;takeCore=function(id){if(id==='estabilizar')repAdd('guard',6);else if(id==='absorber')repAdd('cult',6);else repAdd('guild',3);return _tc(id)}}
{const _bo=borrow;borrow=function(o){repAdd('guild',2);return _bo(o)}}
{const _ds=debtStage;debtStage=function(){const d0=S.debt||0;_ds();const d1=S.debt||0;if(d1<d0)repAdd('guild',3*(d0-d1));if(d1>0)repAdd('guild',-6)}}
{const _ni=npcInteract;npcInteract=function(o){const g=S.p.gold,r=_ni(o);if(o.k==='merchant'&&S.p.gold<g)repAdd('guild',3);return r}}
{const _sa=Save.add.bind(Save);Save.add=function(k,n){_sa(k,n);if(S&&S.p&&S.st!=='over'){if(k==='rescues')repAdd('guard',6);if(k==='secretEvents')repAdd('guard',2)}}}
{const _ab=ab;ab=function(slot){const d=_ab(slot);if(!S)return d;if(slot==='p'&&S.wmod)return wmodApply(d,S.wmod);if(slot==='s'&&S.alt)return altApply(d,S.ch.fam);return d}}
{const _ps=progStart;progStart=function(run){_ps(run);loadoutStart(run)}}
{const _su=Auth.submit.bind(Auth);Auth.submit=function(win){if(S&&S.mode==='inv')return {score:Math.round((S.wave||0)*500+S.kills*10)};return _su(win)}}
{const _eg=endGame;endGame=function(win,cashout){const first=S&&S.st!=='over';_eg(win,cashout);if(!first)return;
 const g=mtEarn(),el=$('endExtra');let t=g?`✦ +${g} punto${g>1?'s':''} de maestría para ${S.ch.name}`:'';
 if(win&&S.mode!=='inv'){const k=pickEnding(),E=ENDINGS[k],L=LORE();(L.endings||(L.endings={}))[k]=Date.now();Save.write();t=`📜 ${E.n}: ${E.d}`+(t?' · '+t:'')}
 if(S.mode==='inv')t=`👾 Oleadas superadas: ${Math.max(0,(S.wave||0)-(win?0:1))}/${INV_WAVES}`+(t?' · '+t:'');el.textContent=t}}
/* ---------- selector (menú de personaje) ---------- */
function buildLoadout(){const box=$('loadout');if(!box)return;const cid=selC,M=mtOf(cid),B=mtBranches(cid),st=Save.d.settings,R=repOf();
 const tree=B.map((b,i)=>`<div class="mtb"><b>${esc(b.n)}</b><small>${esc(b.d)} por nivel</small><span>${'◆'.repeat(M.sp[i])}${'◇'.repeat(3-M.sp[i])}</span>
  <button class="sec mini" data-mt="${i}" ${M.pts>0&&M.sp[i]<3?'':'disabled'}>+</button></div>`).join('');
 const wm=`<div class="diff ${!st.wmod?'sel':''}" data-wm="">Arma de serie</div>`+Object.keys(WMODS).map(k=>{const ok=wmodOk(cid,k);return `<div class="diff ${st.wmod===k?'sel':''} ${ok?'':'lock'}" data-wm="${k}" title="${esc(WMODS[k].d)}">${esc(WMODS[k].n)}</div>`}).join('');
 const cp=`<div class="diff ${!st.comp?'sel':''}" data-cp="">Sin compañero</div>`+Object.keys(CHARS).filter(k=>k!==cid&&isUnlocked(k)).map(k=>`<div class="diff ${st.comp===k?'sel':''}" data-cp="${k}">${esc(CHARS[k].name)}</div>`).join('');
 const syn=st.comp&&CHARS[st.comp]?SYNERGY[synKey(CHARS[cid].fam,CHARS[st.comp].fam)]:null;
 box.innerHTML=`<div class="mt"><span class="rl">Maestría de ${esc(CHARS[cid].name)} · ${M.pts} punto${M.pts===1?'':'s'}</span>${tree}<button class="sec mini" data-mt="r">↺</button></div>
  <div class="row"><span class="rl">Secundaria:</span><div class="diff ${!(st.alt&&st.alt[cid])?'sel':''}" data-alt="0">${esc(CHARS[cid].secondary.name)}</div><div class="diff ${st.alt&&st.alt[cid]?'sel':''} ${altOk(cid)?'':'lock'}" data-alt="1" title="${esc(ALT_FAM[CHARS[cid].fam].d)}">${altOk(cid)?'':'🔒 '}${esc(CHARS[cid].secondary.name+' '+ALT_FAM[CHARS[cid].fam].n)}</div></div>
  <div class="row"><span class="rl">Arma:</span>${wm}</div><div class="row"><span class="rl">Compañero:</span>${cp}</div>
  <small class="help">${st.wmod&&WMODS[st.wmod]?'🔧 '+WMODS[st.wmod].d+' · ':''}${syn&&CHARS[st.comp].fam!==CHARS[cid].fam?'✦ Sinergia: '+syn.n+' · ':''}⚖ Guardianes ${R.guard} · Culto ${R.cult} · Gremio ${R.guild}</small>`;
 const d=$('arsDot');if(d)d.style.display=M.pts>0?'inline-block':'none'}
if($('loadout')){$('loadout').onclick=e=>{const t=e.target.closest('[data-mt],[data-wm],[data-cp],[data-alt]');if(!t)return;const st=Save.d.settings;
 if(t.dataset.mt!==undefined){t.dataset.mt==='r'?mtReset(selC):mtSpend(selC,+t.dataset.mt)}
 else if(t.dataset.wm!==undefined){const k=t.dataset.wm;if(k&&!wmodOk(selC,k)){Snd.play('hurt');return}st.wmod=k||null}
 else if(t.dataset.cp!==undefined)st.comp=t.dataset.cp||null;
 else if(t.dataset.alt!==undefined){if(t.dataset.alt==='1'&&!altOk(selC)){Snd.play('hurt');return}(st.alt||(st.alt={}))[selC]=t.dataset.alt==='1'}
 Save.write();buildLoadout();Snd.play('ui')}}
{const _bm=buildMenu;buildMenu=function(){_bm();buildLoadout()}}
// Códice: reputación, finales y campaña
function loadoutHtml(){const R=repOf(),L=LORE(),E=L.endings||{};
 const rep=Object.keys(FACTIONS).map(k=>{const F=FACTIONS[k],v=R[k];return `<div class="cx" style="--c:${F.col}"><b>⚖ ${esc(F.n)}: ${v}</b><small>${v>=30?'Aliados: '+F.hi:v<=-30?'Hostiles: '+F.lo:'Neutrales (±30 para que actúen)'}</small></div>`}).join('');
 const en=Object.keys(ENDINGS).map(k=>E[k]?`<div class="cx" style="--c:#ffd23c"><b>🏁 ${esc(ENDINGS[k].n)}</b><small>${esc(ENDINGS[k].d)}</small></div>`:`<div class="cx unk"><b>🏁 ???</b><small>Final sin descubrir</small></div>`).join('');
 return `<h3 class="cxh">Facciones</h3>${rep}<h3 class="cxh">Finales · Campaña ${L.camp||0}/${CAMPAIGN.length}</h3>${en}`}
{const _oc=openCodex;openCodex=function(){_oc();$('codexList').innerHTML+=loadoutHtml()}}
