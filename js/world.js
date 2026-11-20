'use strict';
/* ===================== MUNDO VIVO =====================
   - ALTERACIONES TEMPORALES (10): una vez por etapa (40%, desde la etapa 2) el escenario salta 40 s a otra época, con otros colores y reglas:
       Ruinas Antiguas (enemigos −20% de velocidad, +25% de oro) · Ciudad del Mañana (−20% de enfriamientos, enemigos nuevos +20% de vida)
       · Dimensión Colapsada (+30% de daño hecho y recibido).
   - CLIMA (56): cada etapa puede traer lluvia (rayo +25%, fuego −25%), nevada (hielo +25%, enemigos −10% de velocidad),
     viento (te empuja en el aire y cambia de dirección) o cenizas (sin regeneración, +25% de oro).
   - EL MAPA APRENDE (63): se recuerda por dónde te mueves en cada etapa entre partidas. La zona que más usas se vuelve
     peligrosa (llegan patrullas mientras estás en ella) y la que ignoras cría un nido (élite con un cofre).
   - OBJETOS QUE SE COMUNICAN (68): algunos artefactos se reconocen entre sí: al juntarlos hablan y desbloquean un efecto
     secreto, o discuten y entran en conflicto (poder con un coste). */
const ERAS={
 pasado:{name:'Ruinas Antiguas',col:'#d8b070',atm:{hue:25,sat:.45,lum:.02},start(){S.wGoldEra=1.25;for(const e of S.en)e.spdx*=.8},end(){S.wGoldEra=1;for(const e of S.en)e.spdx/=.8},spawn(e){e.spdx*=.8}},
 futuro:{name:'Ciudad del Mañana',col:'#7af0ff',atm:{hue:-30,sat:1.35,lum:.06},start(){buff('era',Infinity,{cdm:.8})},end(){delete S.p.buf.era},spawn(e){e.hp*=1.2;e.maxHp*=1.2}},
 colapso:{name:'Dimensión Colapsada',col:'#9a7aff',atm:{hue:170,sat:.3,lum:-.08},start(){buff('era',Infinity,{dmg:1.3,taken:1.3})},end(){delete S.p.buf.era}}};
const ERA_T=40;
const WEATHER={
 lluvia:{name:'Lluvia',sym:'🌧',el:{rayo:1.25,fuego:.75}},
 nieve:{name:'Nevada',sym:'❄',el:{hielo:1.25},spawn(e){e.spdx*=.9}},
 viento:{name:'Viento',sym:'🌬'},
 ceniza:{name:'Lluvia de Cenizas',sym:'🌋',start(){buff('ceniza',Infinity,{noregen:1});S.wGold=1.25}}};
const TALKS=[
 {a:'stormheart',b:'stormeye',name:'El ojo y el corazón',say:['Corazón de la Tormenta: «Por fin, ojo. Ya puedo ver hacia dónde golpear.»'],buf:{dmg:1.12,as:1.08}},
 {a:'brokenclock',b:'stopwatch',name:'Relojes rotos',say:['Reloj Roto: «¿Tú también te detuviste a medianoche?»'],buf:{cdm:.85}},
 {a:'memory',b:'parasite',name:'Mente colmena',say:['Núcleo Parasitario: «Recuerdo lo que tú recuerdas. Somos más.»'],buf:{dmg:1.15}},
 {a:'frostcrown',b:'chill',name:'Corte del invierno',say:['Corona Helada: «Un súbdito de hielo. Te protegeré.»'],buf:{taken:.88}},
 {a:'lastking',b:'medal',name:'El último soldado',say:['Corona del Último Rey: «Una medalla… alguien sí luchó por mí.»'],buf:{dmg:1.1,healm:1.15}},
 {a:'voidpact',b:'clover',conflict:1,name:'El Contrato desprecia la suerte',say:['Contrato del Vacío: «La suerte es una deuda sin firmar. La rechazo.»'],buf:{as:.9},gold:1.3},
 {a:'star',b:'eclipse',conflict:1,name:'Luz contra hambre',say:['Eclipse Hambriento: «Esa estrella brilla demasiado. Me la comeré.»'],buf:{dmg:1.25,taken:1.15}}];
const HEAT_BINS=12;
const WORLDCFG={on:1};  // las pruebas lo apagan para que los sucesos al azar no interfieran
/* ---------- épocas ---------- */
function eraStage(st,a){const walk=v=>typeof v==='string'&&/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v)?recolor(v,a):
 Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)])):v;return walk(st)}
function eraShift(k){const s=S;if(s.era)return;const E=ERAS[k||Object.keys(ERAS)[Math.random()*3|0]];if(!E)return;
 s.era={k:k||Object.keys(ERAS).find(x=>ERAS[x]===E),t:ERA_T,base:STAGE};STAGE=Object.assign(eraStage(STAGE,E.atm),{plats:STAGE.plats,name:STAGE.name});genBg(STAGE,s.stage*7919+13);
 E.start();s.fade=.8;chromaHit(1);S.shake=Math.max(S.shake,10);Snd.play('phase');say(`⧗ FRACTURA TEMPORAL: la dimensión salta a ${E.name} (${ERA_T} s)`)}
function eraEnd(){const s=S;if(!s.era)return;ERAS[s.era.k].end();STAGE=s.era.base;genBg(STAGE,s.stage*7919+13);s.era=null;s.fade=.6;chromaHit(.6);say('⧗ El tiempo vuelve a su cauce')}
/* ---------- clima ---------- */
function weatherStart(k){const s=S,W2=WEATHER[k];s.weather=k;s.wGold=1;if(W2.start)W2.start();if(k==='viento'){s.wind=R(0,1)<.5?-90:90;s.windT=20}
 s.wdrops=Array.from({length:QL.glow?70:35},()=>({x:Math.random()*W,y:Math.random()*H,v:.7+Math.random()*.6}));
 s.sch.push({t:2.2,f:()=>{if(S===s&&s.weather===k)say(`${W2.sym} Clima: ${W2.name}`)}})}
/* ---------- el mapa aprende ---------- */
const heatOf=i=>{const L=LORE(),h=L.heat||(L.heat={});return h[i]||(h[i]=Array(HEAT_BINS).fill(0))};
const binX=b=>(b+.5)*WORLD/HEAT_BINS;
function heatStage(){const s=S,h=heatOf(s.stage),tot=h.reduce((a,b)=>a+b,0);s.hot=null;if(tot<90)return;  // hace falta historia para aprender
 let hi=0,lo=0;h.forEach((v,i)=>{if(v>h[hi])hi=i;if(v<h[lo])lo=i});
 if(h[hi]>tot*.2){s.hot={x0:hi*WORLD/HEAT_BINS,x1:(hi+1)*WORLD/HEAT_BINS,t:6};s.sch.push({t:4,f:()=>{if(S===s)say('⚠ Esta dimensión recuerda tus pasos: la zona que más usas está vigilada')}})}
 if(lo!==hi){const x=binX(lo),e=spawnEnemy(null,x,60);if(e){e.hp*=1.8;e.maxHp*=1.8;e.nest=1}s.ints.push({k:'chest',tier:'large',open:0,x,y:FLOOR,nest:1})}}
function heatSave(){const s=S;if(!s.heatAcc)return;const h=heatOf(s.stage);for(let i=0;i<HEAT_BINS;i++)h[i]=h[i]*.8+s.heatAcc[i];s.heatAcc=null;Save.write()}
/* ---------- objetos que se comunican ---------- */
function talkCheck(quiet){const p=S.p;S.talks=S.talks||{};
 for(const T of TALKS){if(!(p.items[T.a]>0&&p.items[T.b]>0))continue;buff('talk_'+T.a,Infinity,T.buf);if(T.gold)S.talkGold=T.gold;
  if(S.talks[T.a])continue;S.talks[T.a]=1;if(quiet)continue;Save.addSet('talks',T.a);
  S.sch.push({t:1.2,f:()=>{say(`💬 ${T.say[0]}`);S.sch.push({t:3.2,f:()=>say(`${T.conflict?'⚔ CONFLICTO':'✧ EFECTO SECRETO'}: ${T.name}`)})}})}}
/* ---------- integración ---------- */
function worldStage(){const s=S,p=S.p;if(s.era)eraEnd();s.era=null;s.wGoldEra=1;delete p.buf.era;delete p.buf.ceniza;s.weather=null;s.wGold=1;s.wind=0;
 s.eraT=WORLDCFG.on&&(s.stage>=1||s.loop)&&Math.random()<.4?R(30,80):-1;
 if(WORLDCFG.on&&Math.random()<.5)weatherStart(Object.keys(WEATHER)[Math.random()*4|0]);
 if(WORLDCFG.on)heatStage();s.heatAcc=Array(HEAT_BINS).fill(0);talkCheck(true)}
function worldSpawn(e){if(e.d.structure)return;const s=S;if(s.era&&ERAS[s.era.k].spawn)ERAS[s.era.k].spawn(e);if(s.weather&&WEATHER[s.weather].spawn)WEATHER[s.weather].spawn(e)}
function updWorld(dt){const s=S,p=s.p;
 if(s.heatAcc)s.heatAcc[clamp(p.x/WORLD*HEAT_BINS|0,0,HEAT_BINS-1)]+=dt;
 if(s.eraT>0&&!s.boss){s.eraT-=dt;if(s.eraT<=0)eraShift()}
 if(s.era&&(s.era.t-=dt)<=0)eraEnd();
 if(s.wind){if(!p.ground)p.x=clamp(p.x+s.wind*dt,20,WORLD-20);if((s.windT-=dt)<=0){s.windT=20;s.wind=-s.wind;say(`🌬 El viento cambia: sopla hacia la ${s.wind>0?'derecha':'izquierda'}`)}}
 const H2=s.hot;if(H2&&!s.boss&&p.x>H2.x0&&p.x<H2.x1&&(H2.t-=dt)<=0){H2.t=9;const e=spawnEnemy(null,clamp(p.x+R(-300,300),40,WORLD-40),60);if(e)e.patrol=1}}
function drawWorldBack(){const H2=S.hot;if(!H2)return;c.fillStyle='rgba(255,40,80,.06)';c.fillRect(H2.x0,0,H2.x1-H2.x0,FLOOR+40);
 c.strokeStyle='rgba(255,60,100,.35)';c.setLineDash([6,8]);c.beginPath();c.moveTo(H2.x0,0);c.lineTo(H2.x0,FLOOR);c.moveTo(H2.x1,0);c.lineTo(H2.x1,FLOOR);c.stroke();c.setLineDash([])}
function drawWorldHud(){const s=S,k=s.weather;
 if(k&&k!=='viento'&&s.wdrops){c.save();const col=k==='lluvia'?'rgba(140,200,255,.45)':k==='nieve'?'rgba(230,245,255,.7)':'rgba(255,140,90,.55)';c.strokeStyle=c.fillStyle=col;c.lineWidth=1.2;
  for(const d of s.wdrops){d.y+=d.v*(k==='lluvia'?14:k==='nieve'?1.6:2.4);d.x+=k==='lluvia'?-2:Math.sin(s.t+d.v*9)*.6;if(d.y>H){d.y=-10;d.x=Math.random()*W}if(d.x<0)d.x+=W;
   if(k==='lluvia'){c.beginPath();c.moveTo(d.x,d.y);c.lineTo(d.x-3,d.y+12);c.stroke()}else c.fillRect(d.x,d.y,k==='nieve'?2.5:2,k==='nieve'?2.5:2)}c.restore()}
 if(k==='viento'&&QL.glow){c.save();c.strokeStyle='rgba(220,240,255,.18)';c.lineWidth=1;for(let i=0;i<10;i++){const y=(i*53+s.t*20)%H,x=((s.t*s.wind*4+i*170)%W+W)%W;c.beginPath();c.moveTo(x,y);c.lineTo(x+40*Math.sign(s.wind),y);c.stroke()}c.restore()}
 if(s.era){const E=ERAS[s.era.k];c.textAlign='center';c.font='bold 11px monospace';c.fillStyle=E.col;c.fillText(`⧗ ${E.name.toUpperCase()} · ${Math.ceil(s.era.t)} s`,W/2,92)}}
// el clima cambia el daño elemental; épocas, cenizas y conflictos cambian el oro; los objetos hablan al juntarse
{const _ae=applyElement;applyElement=function(e,d,o){d=_ae(e,d,o);const w=S.weather&&WEATHER[S.weather].el;if(!w)return d;const el=o.el||(o.dot||o.proc?null:CHAR_EL[S.cid]);return el&&w[el]?d*w[el]:d}}
{const _gf=goldFor;goldFor=function(e){return Math.round(_gf(e)*(S.wGold||1)*(S.wGoldEra||1)*(S.talkGold||1))}}
{const _gi=giveItem;giveItem=function(id,q){const r=_gi(id,q);if(S&&S.p)talkCheck();return r}}
{const _eg=endGame;endGame=function(w,c){if(S&&S.heatAcc)heatSave();_eg(w,c)}}
{const _ls=loadStage;loadStage=function(i){if(S&&S.heatAcc)heatSave();_ls(i)}}
