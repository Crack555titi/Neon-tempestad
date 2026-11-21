'use strict';
/* ===================== MENÚ DE PRUEBAS (solo cuentas de desarrollador) =====================
   F2 (o el botón DEV en pantalla) abre el panel en partida: hitboxes, invulnerable, sin enfriamientos,
   matar de un golpe, velocidad del juego, objetos, enemigos, jefes, etapas y cambio de personaje.
   Una partida en la que se usó el panel no sube al ranking. */
const DEV_UIDS=['jmzZiRcQROTQ1xmA4oKadsuKUuz2'];  // cuenta «ntdev»
const DEV={hit:0,god:0,nocd:0,oneshot:0,slow:1};
const isDev=()=>!!(Auth.ses&&DEV_UIDS.includes(Auth.ses.uid));
const devMark=()=>{if(S)S.devUsed=1};

// hooks: se envuelven las funciones globales del motor
{const _u=update;update=function(dt){_u(dt*DEV.slow);if(S&&DEV.nocd&&S.p)for(const k in S.p.cd)S.p.cd[k]=Math.min(S.p.cd[k],0),S.p.uLock=0}}
{const _h=hurtP;hurtP=function(d,src,proj){if(DEV.god&&S)return;return _h(d,src,proj)}}
{const _e=hurtE;hurtE=function(e,d,o){if(DEV.oneshot&&S&&!e.dead)d=Math.max(d,e.hp+1);return _e(e,d,o)}}
{const _d=draw;draw=function(){_d();if(DEV.hit&&S)drawHitboxes();devBtnSync()}}
{const _g=goHome;goHome=function(){const el=$('devp');if(el&&el.style)el.style.display='none';_g();devBtnSync()}}
{const _s=Auth.submit.bind(Auth);Auth.submit=function(win){if(S&&S.devUsed)return Auth.user?{score:0}:null;return _s(win)}}  // pruebas: fuera del ranking

function drawHitboxes(){const s=S,p=s.p;screen();c.translate(-s.cam,0);c.shadowBlur=0;c.globalAlpha=1;c.globalCompositeOperation='source-over';c.lineWidth=1;c.font='10px monospace';
 c.strokeStyle='#3cff7a';c.strokeRect(p.x-p.w/2,p.y-p.h,p.w,p.h);
 for(const e of s.en){if(e.dead)continue;c.strokeStyle=e.boss?'#ff3cf2':'#ff5a3c';c.strokeRect(e.x-e.w/2,e.y-e.h,e.w,e.h);
  c.fillStyle='#fff';c.fillText(Math.ceil(e.hp)+'',e.x-e.w/2,e.y-e.h-3)}
 for(let i=0;i<PR.n;i++){const q=PR.a[i];c.strokeStyle=q.hostile?'#ff3c3c':'#3cd8ff';c.beginPath();c.arc(q.x,q.y,q.r,0,6.283);c.stroke()}
 for(const z of s.zn)if(z.r){c.strokeStyle='#ffd23c';c.beginPath();c.arc(z.x,z.y,z.r,0,6.283);c.stroke()}
 for(const m of s.dr){c.strokeStyle='#9b7aff';c.strokeRect(m.x-8,m.y-16,16,16)}
 screen();c.fillStyle='#fff';c.textAlign='center';c.fillText(`x ${p.x|0} y ${p.y|0} · en ${s.en.length} · proy ${PR.n} · cd ${['p','s','m','u'].map(k=>Math.max(0,p.cd[k]||0).toFixed(1)).join('/')}`,W/2,176);c.textAlign='left'}

/* ---------- panel ---------- */
function devPanel(){let el=$('devp');if(el)return el;el=document.createElement('div');el.id='devp';el.className='lskin';el.style.display='none';document.body.appendChild(el);
 el.onclick=e=>{const b=e.target.closest('[data-d]');if(!b||!S)return;const k=b.dataset.d,v=k.split(':');devMark();
  if(v[0]==='t'){DEV[v[1]]=DEV[v[1]]?0:1}
  else if(v[0]==='slow')DEV.slow=+v[1];
  else if(k==='gold')S.p.gold+=1000;
  else if(k==='lvl')S.p.xp+=S.p.need;
  else if(k==='heal')S.p.hp=S.p.maxHp;
  else if(k==='item')giveItem($('devItem').value);
  else if(k==='allit'){for(const it of ITEMS)giveItem(it.id,1)}
  else if(k==='foe')for(let i=0;i<+$('devN').value;i++)spawnEnemy($('devFoe').value,S.p.x+R(-300,300),undefined,true);
  else if(k==='boss')spawnBoss($('devBoss').value);
  else if(k==='clear'){for(const e of S.en.slice())if(!e.boss)hurtE(e,1e9,{raw:1})}
  else if(k==='next')nextStage();
  else if(k==='char'){const d=DIFFS.indexOf(S.df);start($('devChar').value,d);devMark();devToggle(false);return}
  devRender()};
 return el}
function devRender(){const el=devPanel(),on=k=>DEV[k]?' on':'',opt=(o,f)=>Object.keys(o).map(k=>`<option value="${k}">${esc(f(o[k],k))}</option>`).join('');
 el.innerHTML=`<h2>MENÚ DE PRUEBAS <small>F2</small></h2>
 <div class="drow"><button class="sec${on('hit')}" data-d="t:hit">Hitboxes</button><button class="sec${on('god')}" data-d="t:god">Invulnerable</button>
  <button class="sec${on('nocd')}" data-d="t:nocd">Sin enfriamientos</button><button class="sec${on('oneshot')}" data-d="t:oneshot">Matar de un golpe</button></div>
 <div class="drow">Velocidad ${[.25,.5,1,2].map(x=>`<button class="sec${DEV.slow===x?' on':''}" data-d="slow:${x}">×${x}</button>`).join('')}</div>
 <div class="drow"><button class="sec" data-d="heal">Curar</button><button class="sec" data-d="gold">+1000 oro</button><button class="sec" data-d="lvl">+1 nivel</button>
  <button class="sec" data-d="clear">Limpiar enemigos</button><button class="sec" data-d="next">Siguiente etapa</button></div>
 <div class="drow"><select id="devItem">${ITEMS.map(i=>`<option value="${i.id}">${esc(i.name)}</option>`).join('')}</select><button class="sec" data-d="item">Dar objeto</button><button class="sec" data-d="allit">Todos ×1</button></div>
 <div class="drow"><select id="devFoe">${opt(ENEMIES,e=>e.name)}</select><input id="devN" type="number" min="1" max="30" value="3"><button class="sec" data-d="foe">Invocar</button>
  <select id="devBoss">${opt(BOSSES,b=>b.name)}</select><button class="sec" data-d="boss">Jefe</button></div>
 <div class="drow"><select id="devChar">${opt(CHARS,c=>c.name)}</select><button class="sec" data-d="char">Cambiar personaje (reinicia)</button><button class="cta" id="devClose">CERRAR</button></div>
 <small class="help">Las partidas con el menú usado no suben al ranking.</small>`;
 $('devChar').value=S?S.cid:'';$('devClose').onclick=()=>devToggle(false)}
function devToggle(v){if(!isDev()||!S)return;const el=devPanel();v=v===undefined?el.style.display==='none':v;
 if(v){devRender();el.style.display='flex';if(S.st==='play'){S.st='dev'}}else{el.style.display='none';if(S.st==='dev')S.st='play'}}
if(typeof window!=='undefined')window.addEventListener('keydown',e=>{if(e.code==='F2'){e.preventDefault();devToggle()}});
// botón flotante (también en el teléfono): solo con la cuenta de desarrollador y en partida
function devBtnSync(){if(!document.body)return;let b=$('devBtn');const v=isDev()&&S&&(S.st==='play'||S.st==='dev');
 if(!b){if(!v)return;b=document.createElement('button');b.id='devBtn';b.textContent='DEV';b.onclick=()=>devToggle();document.body.appendChild(b)}
 const d=v?'block':'none';if(b.style.display!==d)b.style.display=d}
