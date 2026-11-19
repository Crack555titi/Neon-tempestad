'use strict';
/* ===================== BOTÍN: objetos, oro, cofres y altares ===================== */
const IEV=['onHit','onKill','onJump','onTakeDamage','onLevelUp','onCast','onDash','onHeal','onChestOpen','onBossPhase','onTick'];
const RORD='curlm';

/* probabilidad con suerte: cada punto de suerte tira una vez más; Entropía la anula y la reduce a la mitad */
function chance(pr){const p=S.p;if(p.items.entropy)return Math.random()<pr*.5;
 let ok=Math.random()<pr;for(let i=0;i<(p.m.luck|0)&&!ok;i++)ok=Math.random()<pr;return ok}
const ib=()=>12*S.p.dmgMul;  // daño base de objetos: equivale a un golpe de 12 que escala con el nivel
function boom(x,y,r,dmg,col,raw){ring(x,y,r,col,.25);Snd.play('boom');aoe(x,y,r,dmg,raw?PROCRAW:PROC);S.shake=Math.max(S.shake,3)}

function recalcHp(){const p=S.p,old=p.maxHp;
 p.maxHp=p.items.glass?1:Math.max(1,(S.ch.hp*(1+.02*(p.lvl-1))+p.m.hpf)*Math.max(.1,1+p.m.hpm));
 if(p.maxHp>old)p.hp+=p.maxHp-old;p.hp=Math.min(p.hp,p.maxHp)}

function giveItem(id,quiet){
 const p=S.p,it=ITEM[id],n=(p.items[id]||0)+1;p.items[id]=n;
 if(it.st)for(const k in it.st){if(k==='jumps')p.maxJ+=it.st[k];else p.m[k]=(p.m[k]||0)+it.st[k]}
 if(it.pick)it.pick(n);
 if(it.dm&&n===1)p.dmItems.push(it);
 recalcHp();
 if(!quiet){Snd.item(it.r);const col=RARITY[it.r].col;S.note={it,n,t:3.5};ring(p.x,p.y-20,90,col,.5);burst(p.x,p.y-20,24,col,300,4);if('lmf'.includes(it.r))hitStop(60)}
}
function pickW(w){let x=Math.random(),k;for(k in w){x-=w[k];if(x<=0)return k}return k}
function rollR(w){let r=pickW(w);if(!S.p.items.entropy)for(let i=0;i<(S.p.m.luck|0);i++){const r2=pickW(w);if(RORD.indexOf(r2)>RORD.indexOf(r))r=r2}return r}
function rollItem(r){const pool=ITEMS.filter(i=>i.r===r);return pool[Math.random()*pool.length|0].id}

/* ---------- economía ---------- */
const scaleCost=()=>1+(coef()-1)*.5;  // precios y oro crecen con la dificultad al mismo ritmo
const priceOf=o=>Math.round(CHESTS[o.tier].base*scaleCost()*S.df.chest*(1-Math.min(capL(.5),S.p.m.chestm)));
function goldFor(e){const p=S.p,it=p.items;
 return Math.round(e.d.xp*.6*scaleCost()*(1+p.m.goldm)*(it.greed?2+it.greed:1)*(it.invhour?2:1)*(it.voidpact&&e.elite?1+it.voidpact:1)*ecoReward(e))}

/* ---------- interactuables (cofres y altares) ---------- */
function spot(){const ps=PLAT.filter(q=>q.ph[0]===1&&q.ph[1]===3&&!q.sp);
 for(let k=0;k<30;k++){const q=ps[Math.random()*ps.length|0],x=R(q.x+30,q.x+q.w-30);if(!S.ints.some(o=>Math.abs(o.x-x)<80&&o.y===q.y))return {x,y:q.y}}
 return {x:R(100,WORLD-100),y:FLOOR}}
function spawnChest(){let r=Math.random(),tier='small';for(const k in CHESTS){r-=CHESTS[k].spawn;if(r<=0){tier=k;break}}S.ints.push(Object.assign({k:'chest',tier,open:0},spot()))}
function spawnAltar(){S.ints.push(Object.assign({k:'altar',open:0},spot()))}

function lootInit(kit){
 // un único despachador por evento: llama a los ganchos de los objetos que tengas con sus acumulaciones
 for(const ev of IEV)Ev.on(ev,(...a)=>{if(ev==='onHit'&&(a[2].proc||a[2].dot))return;const it=S.p.items;
  for(const id in it){const n=it[id],f=n>0&&ITEM[id].on&&ITEM[id].on[ev];if(f)f(n,...a)}});
 if(kit&&S.df.kit)for(const r in S.df.kit)for(let i=0;i<S.df.kit[r];i++)giveItem(rollItem(r),1);
}
function updLoot(dt){
 const s=S,p=s.p;
 s.chestT-=dt;if(s.chestT<=0){s.chestT=40;if(s.ints.filter(o=>o.k==='chest'&&!o.open).length<6+3*s.loop)spawnChest()}
 s.altarT-=dt;if(s.altarT<=0){s.altarT=150;if(!s.ints.some(o=>o.k==='altar'&&!o.open))spawnAltar()}
 s.near=null;for(const o of s.ints)if(!o.open&&Math.abs(o.x-p.x)<45&&Math.abs(o.y-p.y)<60){s.near=o;break}
 if(s.note&&(s.note.t-=dt)<=0)s.note=null;
}
function interact(){
 const o=S.near,p=S.p;if(!o)return;
 if(o.k==='tp')return useTP(S.tp.state==='ready'&&p.x<o.x?'end':'next');
 if(o.k==='altar')return openAltar(o);
 if(npcInteract(o))return;
 const pr=priceOf(o);if(p.gold<pr){say(`Oro insuficiente (${pr})`);return}
 p.gold-=pr;o.open=1;
 if(p.items.elegy&&Math.random()<1/3){ring(o.x,o.y-15,120,'#5ab4ff',.4);burst(o.x,o.y-15,30,'#5ab4ff',400,4);hurtP(p.maxHp*.15);say('¡El cofre se hace añicos! (Elegía)')}
 else{o.got=rollItem(p.items.elegy?RORD[Math.random()*5|0]:rollR(CHESTS[o.tier].w));giveItem(o.got)}
 Ev.emit('onChestOpen',o);
}
function chooseFragment(o,id){const p=S.p;p.hp=Math.max(1,p.hp*(1-ALTAR.cost));o.open=1;giveItem(id)}

function drawLoot(){
 for(const o of S.ints){
  if(o.k==='tp'){drawTP();continue}
  if(o.k==='merchant'||o.k==='hermit'){drawNpc(o);continue}
  if(o.k==='chest'){const C=CHESTS[o.tier],w=o.tier==='small'?32:40,h=o.tier==='small'?20:26;
   c.globalAlpha=o.open?.35:1;glow(C.col,o.open?0:14);c.fillStyle='#1a1030';c.strokeStyle=C.col;c.lineWidth=2;
   c.fillRect(o.x-w/2,o.y-h,w,h);c.strokeRect(o.x-w/2,o.y-h,w,h);
   c.beginPath();if(o.open){c.moveTo(o.x-w/2,o.y-h);c.lineTo(o.x-w/2-6,o.y-h-14)}else{c.moveTo(o.x-w/2,o.y-h*.6);c.lineTo(o.x+w/2,o.y-h*.6)}c.stroke();
   if(!o.open){c.fillStyle=C.col;c.fillRect(o.x-3,o.y-h*.6-3,6,7)}}
  else{c.globalAlpha=o.open?.3:1;glow(ALTAR.col,o.open?0:18);c.fillStyle='#0c1a30';c.strokeStyle=ALTAR.col;c.lineWidth=2;
   c.beginPath();c.moveTo(o.x-18,o.y);c.lineTo(o.x-10,o.y-46);c.lineTo(o.x+10,o.y-46);c.lineTo(o.x+18,o.y);c.closePath();c.fill();c.stroke();
   if(!o.open){const fy=o.y-64+Math.sin(S.t*2.5)*5;c.fillStyle=ALTAR.col;c.beginPath();c.moveTo(o.x,fy-9);c.lineTo(o.x+7,fy);c.lineTo(o.x,fy+9);c.lineTo(o.x-7,fy);c.fill()}}
 }
 c.globalAlpha=1;c.shadowBlur=0;
 const o=S.near,nm=o&&npcMsg(o);if(nm){c.font='bold 12px monospace';c.textAlign='center';c.fillStyle=nm[1]?'#fff':'#ff6a6a';c.fillText(nm[0],o.x,o.y-(o.k==='merchant'?100:74))}
 else if(o){const pr=o.k==='chest'?priceOf(o):0,ok=o.k!=='chest'||S.p.gold>=pr,T=S.tp;
  c.font='bold 12px monospace';c.textAlign='center';c.fillStyle=ok?'#fff':'#ff6a6a';
  const msg=o.k==='chest'?`[E] ${CHESTS[o.tier].name} · ${pr} oro`:o.k==='altar'?`[E] ${ALTAR.name} · −${ALTAR.cost*100}% de vida`:
   T.state==='idle'?'[E] Activar teletransportador (despierta al jefe)':T.state==='ready'?(S.p.x<T.x?'[E] ← Terminar run y guardar puntuación':S.stage>=STAGES.length-1?'[E] Continuar ciclo (Loop +1) →':'[E] Siguiente etapa →'):'';
  if(msg)c.fillText(msg,o.x,o.y-(o.k==='altar'?82:o.k==='tp'?96:40))}
}
