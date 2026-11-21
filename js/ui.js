'use strict';
/* ===================== UI: HUD, menús, maestría, fin de partida ===================== */
// marcos y barras neón
function panel(x,y,w,h,col,a){c.save();rr(c,x,y,w,h,8);c.fillStyle=`rgba(10,6,24,${a===undefined?.72:a})`;c.fill();glow(col,10);c.strokeStyle=col;c.lineWidth=1.5;c.stroke();c.restore()}
function gbar(x,y,w,h,v,c1,c2,pulse){c.save();rr(c,x,y,w,h,h/2);c.fillStyle='#120a26';c.fill();const vv=clamp(v,0,1);
 if(vv>0){const g=c.createLinearGradient(x,0,x+w,0);g.addColorStop(0,c1);g.addColorStop(1,c2);rr(c,x,y,Math.max(h,w*vv),h,h/2);c.fillStyle=g;
  c.globalAlpha=pulse?.65+.35*Math.sin(S.t*12):1;c.fill();c.globalAlpha=.35;c.fillStyle='#fff';c.fillRect(x+h/2,y+1,Math.max(0,w*vv-h),Math.max(1,h*.22))}
 c.restore()}
const bar=(x,y,w,h,v,col)=>gbar(x,y,w,h,v,col,col);
// medidor de dificultad al estilo Risk of Rain: sube de tramo con el coeficiente
const DIFF_TIERS=[['FÁCIL','#4cff7a'],['MEDIO','#c8ff3c'],['DIFÍCIL','#ffd23c'],['MUY DIFÍCIL','#ff9a3c'],['INSANO','#ff4d6d'],['IMPOSIBLE','#ff3cf2'],['¡JA, JA, JA!','#ffffff']];
const KEYS={p:'LMB',s:'RMB',m:'SHIFT',u:'Q'};

function hud(){
 const s=S,p=s.p,t=s.t;screen();drawStormHud();drawCombatHud();drawQuestHud();drawProgHud();drawTempestHud();drawWorldHud();c.shadowBlur=0;c.textBaseline='alphabetic';
 // ---- arriba a la izquierda: oro y objetos ----
 const ids=sortedItems(),cols=Math.max(6,(W/2-262-36)/22|0),rows=Math.ceil(ids.length/cols);  // columnas que caben antes de la barra del jefe
 panel(10,8,Math.max(150,Math.min(cols,ids.length)*22+14),26+rows*22,'#ffd23c55');
 c.textAlign='left';c.font='bold 13px monospace';c.fillStyle='#ffd23c';c.fillText(`◆ ${p.gold}`,20,26);
 ids.forEach((id,i)=>drawIcon(ITEM[id],18+(i%cols)*22,32+(i/cols|0)*22,19,p.items[id]));
 // ---- arriba a la derecha: reloj y medidor de dificultad ----
 const co=coef(),ti=Math.min(DIFF_TIERS.length-1,(co-1)/1.2|0),tier=DIFF_TIERS[ti],m=Math.floor(s.clock/60),sc=Math.floor(s.clock%60);
 panel(W-206,8,196,p.revive>0?66:52,tier[1]);
 c.textAlign='right';c.font='bold 15px monospace';c.fillStyle='#fff';c.fillText(`${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`,W-18,28);
 c.textAlign='left';c.font='10px monospace';c.fillStyle='#9a93c8';c.fillText(s.df.name,W-196,24);
 gbar(W-196,34,176,8,((co-1)/1.2)%1,tier[1],'#fff');c.font='bold 10px monospace';c.fillStyle=tier[1];c.fillText(`${tier[0]} ×${co.toFixed(1)}`,W-196,54);
 if(p.revive>0){c.fillStyle='#4cff9a';c.fillText('♥ Resurrección ×'+p.revive,W-196,68)}
 if(s.loop){c.textAlign='right';c.fillStyle='#ff3cf2';c.font='bold 11px monospace';c.fillText(`∞ LOOP ${s.loop+1}`,W-18,54)}
 // ---- arriba al centro: jefe o etapa + teletransportador ----
 let ty=20;
 if(s.boss){const n=s.bosses.length,bw=n>1?258:524;s.bosses.forEach((b,i)=>{const x0=W/2-262+i*(bw+8),cx=x0+bw/2;panel(x0,6,bw,50,b.def.color);
  c.textAlign='center';c.font='bold 13px monospace';c.fillStyle=b.def.color;c.fillText(b.def.name.toUpperCase()+(BOSS_EL[b.bid]?' · débil a '+ELEMENTS[BOSS_EL[b.bid].weak].sym:''),n>1?cx-24:cx,22);
  for(let k=1;k<=3;k++){c.fillStyle=k<=b.ph?b.def.color:'#333';c.beginPath();c.arc(x0+bw-62+k*14,18,4,0,6.283);c.fill()}
  gbar(x0+12,28,bw-24,12,b.hp/b.maxHp,'#ff3c6a',b.def.color,b.stun>0);gbar(x0+12,43,bw-24,5,b.stun>0?b.stun/3.2:b.stag/b.stagMax,'#ffd23c','#fff',b.stun>0)});ty=72}
 else{c.textAlign='center';c.font='bold 12px monospace';c.fillStyle=STAGE.plat.edge;c.fillText(`${s.loop?`LOOP ${s.loop+1} · `:''}ETAPA ${s.stage+1}/${STAGES.length} · ${STAGE.name.toUpperCase()}`,W/2,ty);ty=38}
 const T=s.tp;c.font='bold 12px monospace';
 const tl=s.mode==='inv'?`Sobrevive a los héroes · oleada ${s.wave||0}/${INV_WAVES}`:T.state==='idle'?'Encuentra el teletransportador (E)':T.state==='ready'?'¡Teletransportador listo! (E)':`Teletransportador ${Math.floor(T.charge*100)}%${T.out?' · ¡vuelve a la zona!':''}${s.boss?' · derrota al jefe':''}`;
 c.fillStyle=T.state==='ready'?'#4cff7a':T.out?'#ff6a6a':'#ffd23c';c.fillText(tl,W/2,ty);
 if(T.state==='charging')gbar(W/2-120,ty+4,240,5,T.charge,'#ffb13c','#ffd23c');
 const tx=T.x-s.cam;if(tx<0||tx>W){const ex=tx<0?18:W-18,ey=clamp(T.y-40,90,H-110),d=tx<0?-1:1;glow('#3cf0ff',10);c.fillStyle=T.state==='ready'?'#4cff7a':'#3cf0ff';
  c.beginPath();c.moveTo(ex+d*10,ey);c.lineTo(ex-d*6,ey-9);c.lineTo(ex-d*6,ey+9);c.fill();c.shadowBlur=0}
 // ---- franja inferior (dentro de la banda del suelo para no tapar el juego): nivel, vida, escudo, experiencia ----
 const lf=s.lvlFx,pulse=lf?Math.max(0,lf.t-1)*2:0,col=s.ch.color,by=H-37;
 panel(8,by,336,33,col,.8);
 c.save();glow('#ffd23c',8+pulse*20);c.strokeStyle='#ffd23c';c.lineWidth=2;c.beginPath();c.arc(26,by+16.5,12+pulse*4,0,6.283);c.stroke();c.restore();
 c.textAlign='center';c.font=`bold ${12+pulse*6|0}px monospace`;c.fillStyle='#ffd23c';c.fillText(p.lvl,26,by+21);
 c.textAlign='left';c.font='bold 9px monospace';c.fillStyle=col;c.fillText(s.ch.name.toUpperCase(),44,by+10);
 const low=p.hp/p.maxHp<.3;gbar(44,by+13,226,11,p.hp/p.maxHp,low?'#ff1f4b':'#2aff7a',low?'#ff6a3c':'#3cf0ff',low);
 if(p.sh>0)gbar(44,by+13,226*Math.min(1,p.sh/p.maxHp),4,1,'#5ab4ff','#c8e8ff');
 c.font='bold 9px monospace';c.fillStyle='#fff';c.fillText(`${Math.ceil(p.hp)}/${Math.ceil(p.maxHp)}${p.sh>=1?' +'+Math.ceil(p.sh):''}`,50,by+22);
 gbar(44,by+27,226,3,p.xp/p.need,'#ffb13c','#ffd23c');
 if(s.ch.passive&&s.ch.passive.t==='corrupt'){gbar(276,by+13,60,5,p.corr/100,'#5a10a0','#d070ff',!!p.buf.void);c.font='8px monospace';c.fillStyle='#d070ff';c.fillText(p.buf.void?'VACÍO':'CORRUP.',276,by+29)}
 if(s.ch.primary.forms){c.font='bold 9px monospace';c.fillStyle=p.form==='b'?'#2aff1a':'#7dff6a';c.fillText(p.form==='b'?'BESTIA':'ESPINAS',276,by+22)}
 // ---- habilidades con enfriamiento radial ----
 if(!touchOn())SLOTS.split('').forEach((k,i)=>{  // en táctil los enfriamientos se ven en los propios botones
const d=ab(k),x=W/2-74+i*38,y=H-37,cd=p.cd[k],mx=maxCd(k,d),ready=cd<=0;
  panel(x,y,33,33,ready?col:'#444',.85);
  drawGlyph(c,d,x+7.5,y+7.5,18,ready?col:'#666');c.textAlign='center';
  if(!ready){c.save();c.beginPath();c.moveTo(x+16.5,y+16.5);c.arc(x+16.5,y+16.5,15,-Math.PI/2,-Math.PI/2+6.283*clamp(cd/mx,0,1));c.closePath();c.fillStyle='rgba(0,0,0,.6)';c.fill();c.restore();
   c.font='bold 10px monospace';c.fillStyle='#fff';c.fillText(cd<1?cd.toFixed(1):Math.ceil(cd),x+16.5,y+21)}
  c.font='7px monospace';c.fillStyle='#cfc9f5';c.fillText(KEYS[k],x+16.5,y+8);
  if(p.chg[k]>0)gbar(x+3,y+29,27,3,p.chg[k]/d.max,col,'#fff')});
 // ---- minimapa (arriba a la derecha, bajo el reloj) ----
 drawMinimap(W-206,p.revive>0?80:66,196,44);
 // ---- mensajes ----
 if(s.msgT>0){c.globalAlpha=Math.min(1,s.msgT);c.textAlign='center';c.font='bold 18px monospace';c.lineWidth=4;c.strokeStyle='rgba(0,0,0,.7)';c.strokeText(s.msg,W/2,ty+38);c.fillStyle='#fff';c.fillText(s.msg,W/2,ty+38);c.globalAlpha=1}
 // aviso al recoger un objeto
 if(s.note){const {it,n,t:nt}=s.note,rc=RARITY[it.r].col,y=ty+50,sl=Math.min(1,(3.5-nt)*6),slide=(1-sl)*40;c.globalAlpha=Math.min(1,nt*2);
  panel(W/2-230,y-slide,460,58,rc,.9);drawIcon(it,W/2-220,y+9-slide,40);c.textAlign='left';c.font='bold 15px monospace';c.fillStyle=rc;c.fillText(`${it.name}${n>1?' ×'+n:''}`,W/2-168,y+24-slide);
  c.font='10px monospace';c.fillStyle='#9a93c8';const rn=RARITY[it.r].n.toUpperCase();c.fillText(rn,W/2+220-c.measureText(rn).width,y+24-slide);
  c.fillStyle='#cfc9f5';wrapText(it.desc,W/2-168,y+40-slide,390,12);c.globalAlpha=1}
 // subida de nivel: rótulo que entra grande y se asienta
 if(lf){const a=1.6-lf.t,sc=a<.25?2-a*4:1;c.save();c.globalAlpha=Math.min(1,lf.t*2.5);c.translate(W/2,H/2-60);c.scale(sc,sc);c.textAlign='center';
  glow('#ffd23c',24);c.font='bold 40px monospace';c.fillStyle='#ffd23c';c.fillText(`¡NIVEL ${lf.lvl}!`,0,0);c.shadowBlur=0;
  c.fillRect(-150,10,300*Math.min(1,a*3),2);c.restore()}
}
function drawMinimap(x,y,w,h){const s=S,sx=w/WORLD,sy=(h-8)/(FLOOR+40),X=v=>x+v*sx,Y=v=>y+4+v*sy;
 panel(x,y,w,h,STAGE.plat.edge+'88',.8);c.save();rr(c,x,y,w,h,8);c.clip();
 c.fillStyle='rgba(255,255,255,.06)';c.fillRect(X(s.cam),y,W*sx,h);
 c.strokeStyle=STAGE.plat.edge;c.lineWidth=1.5;for(const q of PLAT)if(q.on){c.beginPath();c.moveTo(X(q.rx),Y(q.ry));c.lineTo(X(q.rx+q.w),Y(q.ry));c.stroke()}
 if(s.walls){c.fillStyle='rgba(255,60,120,.4)';c.fillRect(x,y,X(s.walls.l)-x,h);c.fillRect(X(s.walls.r),y,x+w-X(s.walls.r),h)}
 for(const o of s.ints)if(!o.open&&o.k!=='tp'){c.fillStyle=o.k==='altar'?'#5ab4ff':'#ffd23c';c.fillRect(X(o.x)-1.5,Y(o.y)-4,3,3)}
 const T=s.tp;c.fillStyle=T.state==='ready'?'#4cff7a':'#3cf0ff';c.globalAlpha=.6+.4*Math.sin(s.t*6);c.fillRect(X(T.x)-3,Y(T.y)-7,6,6);c.globalAlpha=1;
 for(const e of s.en){if(e.hidden)continue;c.fillStyle=e.boss?e.def.color:e.elite?'#ff9a3c':'#ff4d6d';const r=e.boss?4:1.5;c.fillRect(X(e.x)-r,Y(e.y-e.h/2)-r,r*2,r*2)}
 c.fillStyle='#fff';c.fillRect(X(s.p.x)-2,Y(s.p.y-20)-2,4,4);c.restore()}
const sortedItems=()=>Object.keys(S.p.items).filter(id=>S.p.items[id]>0).sort((a,b)=>'curlmf'.indexOf(ITEM[a].r)-'curlmf'.indexOf(ITEM[b].r));
function drawIcon(it,x,y,s,n){const rc=RARITY[it.r].col;c.fillStyle='#120a26';c.fillRect(x,y,s,s);c.fillStyle=it.col;c.fillRect(x+3,y+3,s-6,s-6);
 c.strokeStyle=rc;c.lineWidth=2;c.strokeRect(x,y,s,s);drawGlyph(c,it,x+s*.2,y+s*.2,s*.6,icoInk(it.col));
 if(n>1){c.fillStyle='#fff';c.font='bold 9px monospace';c.textAlign='right';c.fillText(n,x+s+2,y+s+2)}}
function wrapText(t,x,y,w,lh){let line='';for(const word of t.split(' ')){const tl=line?line+' '+word:word;if(c.measureText(tl).width>w&&line){c.fillText(line,x,y);y+=lh;line=word}else line=tl}c.fillText(line,x,y)}

/* ===================== INVENTARIO Y ALTAR ===================== */
function itemCard(it,n){const rc=RARITY[it.r].col;
 return `<div class="item" style="--c:${rc}"><span class="ico" style="background:${it.col}">${glyphSvg(it,icoInk(it.col))}</span><div><b>${esc(it.name)}${n>1?' ×'+n:''}</b> <em>${RARITY[it.r].n}</em>
  <small>${esc(it.desc)}</small>${it.tags?`<i>Sinergia: ${it.tags.join(', ')}</i>`:''}</div></div>`}
function toggleInv(){
 if(S.st==='inv'){$('inv').style.display='none';S.st='play';mouse.l=mouse.r=0;return}
 const p=S.p,m=p.m,pct=v=>Math.round(v*100)+'%',ids=sortedItems();
 $('invStats').textContent=`${elemName(CHAR_EL[S.cid])} · Daño ×${(p.dmgMul*m.dmg*bm('dmg')).toFixed(2)} · Vel. ataque ×${(m.as*bm('as')).toFixed(2)} · Crítico ${pct(p.items.blacklens?1:m.crit)} · Robo de vida ${pct(m.ls)} · Armadura ${pct(Math.min(capL(.6),m.arm))} · Enfriamientos −${pct(Math.min(capL(.6),m.cdr))} · Suerte ${p.items.entropy?0:m.luck} · Oro ${p.gold}`;
 $('invStats').textContent+=legacyText();
 // estadísticas como fichas cortas; objetos como iconos: al pasar el ratón o tocarlos se ve qué hacen
 $('invStats').innerHTML=$('invStats').textContent.split(' · ').filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join('');
 $('invList').innerHTML=ids.length?ids.map(id=>{const it=ITEM[id],n=p.items[id];
  return `<button class="itile" data-id="${id}" style="--c:${RARITY[it.r].col}" title="${esc(it.name)}" aria-label="${esc(it.name)}"><span class="ico" style="background:${it.col}">${glyphSvg(it,icoInk(it.col))}</span>${n>1?`<em>×${n}</em>`:''}</button>`}).join('')
  :'<p class="help">Aún no tienes objetos. Abre cofres con <b>E</b>.</p>';
 invShow(ids[0]);
 $('inv').style.display='flex';S.st='inv';
}
function invShow(id){const d=$('invDetail');if(!id){d.innerHTML='';return}const it=ITEM[id];if(!it)return;
 d.innerHTML=itemCard(it,S.p.items[id]);d.style.setProperty('--c',RARITY[it.r].col);
 if($('invList').querySelectorAll)$('invList').querySelectorAll('.itile').forEach(b=>b.classList.toggle('sel',b.dataset.id===id))}
$('invList').onmouseover=$('invList').onclick=e=>{const b=e.target.closest&&e.target.closest('.itile');if(b)invShow(b.dataset.id)};
$('invClose').onclick=()=>{if(S&&S.st==='inv')toggleInv()};
function openAltar(o){
 S.st='altar';const opts=FRAGMENTS.slice().sort(()=>Math.random()-.5).slice(0,ALTAR.choices);
 $('altarOpts').innerHTML=opts.map((it,i)=>`<div class="pick" data-i="${i}">${itemCard(it,(S.p.items[it.id]||0)+1)}</div>`).join('');
 const close=()=>{$('altar').style.display='none';S.st='play';mouse.l=mouse.r=0};
 $('altarOpts').onclick=e=>{const k=e.target.closest('.pick');if(!k)return;close();chooseFragment(o,opts[+k.dataset.i].id)};
 $('altarNo').onclick=close;
 $('altar').style.display='flex';
}

/* Los nodos pendientes se encolan en S.mq: subir varios niveles de golpe ya no pierde elecciones */
function openMastery(){
 S.st='mastery';const pool=MASTERY.slice().sort(()=>Math.random()-.5).slice(0,2);
 $('nodes').innerHTML=pool.map((n,i)=>`<div class="card sel" data-i="${i}" style="--c:#ffd23c"><b>${n.name}</b><small>${n.desc}</small></div>`).join('');
 $('mq').textContent=S.mq>1?`(${S.mq} pendientes)`:'';
 $('nodes').onclick=e=>{const k=e.target.closest('.card');if(!k)return;pool[+k.dataset.i].fx(S.p);S.p.mastery.push(pool[+k.dataset.i].name);mouse.l=mouse.r=0;
  if(--S.mq>0)openMastery();else{$('mastery').style.display='none';S.st='play'}};
 $('mastery').style.display='flex';
}

function endGame(win,cashout){
 S.st='over';recordRunEnd(win);const sc=Auth.submit(win);
 const gain=sc?Math.max(5,Math.round(sc.score/200)):0;Save.d.shop.gems+=gain;Save.write();  // cristales para la tienda
 const pts=sc?`Puntuación ${sc.score.toLocaleString('es')} · +${gain} 💎`:'',dn=S.df.name;
 $('endScore').textContent=!sc?'':!sc.done?pts+' · entra con una cuenta para aparecer en la clasificación':pts+' · subiendo al ranking…';
 if(sc&&sc.done)sc.done.then(r=>{$('endScore').textContent=pts+(r.queued?' · sin conexión: se subirá al ranking cuando vuelva la red':r.rank?` · puesto #${r.rank} mundial en ${dn}${r.best?'':' (con tu mejor marca)'}`:'')}).catch(()=>{$('endScore').textContent=pts});
 // muerte permanente estricta: se borra la partida guardada y no hay reintento
 if(win||cashout||S.df.perma)clearRun();
 $('endT').textContent=cashout?(win?`¡TEMPESTAD SUPERADA${S.loop?` · LOOP ${S.loop+1}`:''}!`:'RUN TERMINADA'):win?'¡HAS SUPERADO LA TEMPESTAD!':(S.df.perma?'MUERTE PERMANENTE · PARTIDA BORRADA':'HAS CAÍDO');
 $('endS').textContent=`${S.ch.name} · ${S.loop?`Loop ${S.loop+1} · `:''}Etapa ${S.stage+1}/${STAGES.length} · Nivel ${S.p.lvl} · ${S.kills} bajas · ${Math.floor(S.t/60)}:${String(Math.floor(S.t%60)).padStart(2,'0')} · ${S.df.name}`;
 $('retry').style.display=!win&&!cashout&&loadRun()?'inline-block':'none';
 setTimeout(()=>$('end').style.display='flex',win?1500:600);
}

/* ===================== SELECCIÓN DE PERSONAJE ===================== */
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function abHtml(lbl,a){
 if(a.forms)return Object.values(a.forms).map(f=>abHtml(lbl,f)).join('');
 return `<li><kbd>${lbl}</kbd><b>${esc(a.name)}</b>${a.hold?' <em>mantener</em>':''}<span>${esc(a.desc||'')}</span></li>`;
}
// Lobby: el héroe en escena (lobby.js lo dibuja en el canvas), una ficha corta, la tira de retratos y ENTRAR.
// Los números exactos y las descripciones solo aparecen al tocar una habilidad (sin muros de texto).
const famCol=f=>({'Vanguardia':'#c8613f','Artillería':'#c99a3a','Invocadores':'#5fae7c','Tiempo/Espacio':'#5f9fb4','Malditos/Híbridos':'#a8546a','Joke':'#d8b23c'}[f]||'#888');
const lbar=(n,v,mx)=>{const k=Math.max(1,Math.min(5,Math.round(v/mx*5)));return `<div class="lstat"><span>${n}</span><i>${'<b></b>'.repeat(k)}${'<em></em>'.repeat(5-k)}</i></div>`};
let abSel=-1;
function abList(v){const out=[];for(const [sl,a] of [['p',v.primary],['s',v.secondary],['m',v.move],['u',v.ult]]){if(a.forms)for(const f of Object.values(a.forms))out.push([sl,f]);else out.push([sl,a])}return out}
function buildMenu(){
 if(!isUnlocked(selC)&&!(typeof lobbyMode!=='undefined'&&lobbyMode==='daily'))selC='vanguard';  // el desafío diario deja jugar al héroe del día aunque esté bloqueado
 // retratos agrupados por familia: una etiqueta con la familia va del primer al último héroe de cada grupo
 const pt=k=>{const v=CHARS[k],lk=!isUnlocked(k);
  return `<button class="pt ${k===selC?'sel':''} ${lk?'lock':''}" data-k="${k}" style="--f:${famCol(v.fam)}" title="${esc(v.name)} · ${esc(v.fam)}" aria-label="${esc(v.name)}"><canvas width="96" height="96"></canvas></button>`};
 $('fams').innerHTML=FAMILIES.map(f=>{const ks=Object.keys(CHARS).filter(k=>CHARS[k].fam===f);if(!ks.length)return '';
  return `<div class="fgrp" style="--f:${famCol(f)}"><span class="fgl">${esc(f)}</span><div class="fgrow">${ks.map(pt).join('')}</div></div>`}).join('');
 if(typeof drawPortraits==='function')drawPortraits();
 const v=CHARS[selC];previewC=selC;showInfo(v,false);
 $('diffs').innerHTML=DIFFS.map((d,i)=>`<button class="dopt ${i===selD?'sel':''}" data-i="${i}">${i+1}. ${esc(d.name)}</button>`).join('');
 const rec=Save.d.records[selD],fmt=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
 $('dd').textContent=DIFFS[selD].desc+(rec?` · Récord: etapa ${rec.stage}/${STAGES.length} (${rec.ch})${rec.wins?` · ${rec.wins} victoria${rec.wins>1?'s':''}, mejor ${fmt(rec.best)}`:''}`:'');
 $('diffBtn').innerHTML=`<small>Dificultad</small>${esc(DIFFS[selD].name)} ▾`;
 $('help').textContent=helpText();
 const n=Object.keys(CHARS).filter(isUnlocked).length;$('unl').textContent=`${n}/${Object.keys(CHARS).length} héroes desbloqueados`;
 const run=loadRun();$('cont').style.display=run?'inline-block':'none';
 if(run)$('cont').innerHTML=`<small>Continuar</small>${esc(CHARS[run.cid].name)} · ${run.loop?`L${run.loop+1} · `:''}E${run.stage+1}`;
}
function showInfo(v,locked,k){const id=k||selC,el=CHAR_EL[id];
 $('info').style.setProperty('--f',famCol(v.fam));
 if(locked){const a=ACHIEVEMENTS[v.unlock];
  $('info').innerHTML=`<h2>🔒 ${esc(v.name)}</h2><p class="lrole">${esc(v.fam)} · ${esc(v.role)}</p><p class="lhint">Logro «${esc(a.name)}»: ${esc(a.desc)}</p>
   <div class="prog"><div style="width:${Math.min(100,Save.val(a.stat)/a.goal*100)}%"></div></div><small>${Math.floor(Math.min(Save.val(a.stat),a.goal))} / ${a.goal}</small>`;return}
 const abs=abList(v);if(abSel>=abs.length)abSel=-1;
 $('info').innerHTML=`<h2>${esc(v.name)}</h2><p class="lrole">${esc(v.fam)} · ${esc(v.role)}</p>
  ${el?`<span class="lel" style="--e:${ELEMENTS[el].col}">${ELEMENTS[el].sym} ${ELEMENTS[el].name}</span>`:'<span class="lel">Físico</span>'}
  <div class="lstats">${lbar('Vida',v.hp,190)}${lbar('Velocidad',v.spd,320)}${lbar('Salto',v.jump,760)}</div>
  <div class="labs">${abs.map(([sl,a],i)=>`<button class="abi ${i===abSel?'on':''}" data-i="${i}" title="${esc(a.name)}"><canvas width="64" height="64" data-sl="${sl}"></canvas><span>${esc(a.name)}</span></button>`).join('')}</div>
  <p class="ldesc">${abSel>=0?`<b>${esc(abs[abSel][1].name)}</b>${abs[abSel][1].hold?' · mantener':''} — ${esc(abs[abSel][1].desc||'')}`:(v.passive?`◆ ${esc(v.passive.desc)}`:'Toca una habilidad para ver qué hace.')}</p>`;
 if($('info').querySelectorAll)$('info').querySelectorAll('.abi canvas').forEach((k2,i)=>{const g=k2.getContext&&k2.getContext('2d');if(!g)return;g.clearRect(0,0,64,64);drawGlyph(g,abs[i][1],12,12,40,'#e9dfcc')});
}
$('info').onclick=e=>{const b=e.target.closest('.abi');if(!b)return;const i=+b.dataset.i;abSel=abSel===i?-1:i;showInfo(CHARS[selC],false);Snd.play('ui')};
function showLocked(k){previewC=k;showInfo(CHARS[k],true,k)}
$('fams').onclick=e=>{const k=e.target.closest('[data-k]');if(!k)return;if(isUnlocked(k.dataset.k)){selC=k.dataset.k;buildMenu()}else showLocked(k.dataset.k)};
$('diffs').onclick=e=>{const k=e.target.closest('[data-i]');if(k){selD=+k.dataset.i;$('diffPop').style.display='none';buildMenu();Snd.play('ui')}};
$('go').onclick=()=>start(selC,selD);
$('cont').onclick=()=>{const r=loadRun();if(r)start(r.cid,r.did,r)};
$('retry').onclick=()=>{const r=loadRun();if(r){$('end').style.display='none';start(r.cid,r.did,r)}};
$('again').onclick=()=>goHome();

/* vista previa animada del personaje: corre, se detiene, apunta y ataca en bucle */
let previewC='vanguard';const prevCape={};
function drawPreview(t){const k=$('prev');if(!k||!k.getContext)return;const g=k.getContext('2d');if(!g)return;
 const v=CHARS[previewC],lk=!isUnlocked(previewC),ph=t%4,at=(t*1.4)%1;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,k.width,k.height);
 const gr=g.createRadialGradient(k.width/2,k.height-18,4,k.width/2,k.height-18,90);gr.addColorStop(0,(lk?'#555':v.color)+'55');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,k.width,k.height);
 g.save();g.translate(k.width/2,k.height-18);g.scale(2.1,2.1);
 drawHero(g,0,0,{col:lk?'#2a2440':v.color,face:1,aim:Math.sin(t*1.3)*.5-.15,run:t*9,moving:ph<2,atk:at<.15?1-at/.15:0,t,cid:previewC,cape:prevCape[previewC]||(prevCape[previewC]={})});g.restore()}

/* ===================== PAUSA, OPCIONES Y CONTROLES ===================== */
const show=id=>{$(id).style.display='flex'},hide=id=>{$(id).style.display='none'};
function togglePause(){if(S.st==='pause'){hide('pause');S.st='play';mouse.l=mouse.r=0}else if(S.st==='play'){S.st='pause';show('pause');Snd.play('ui')}}
$('pResume').onclick=togglePause;
$('pQuit').onclick=()=>goHome();  // la partida sigue guardada desde el inicio de la etapa
let optsFrom='menu';
function openOpts(from){optsFrom=from;syncOptions();hide(from);show('opts')}
function openCtrls(from){optsFrom=from;buildControls();hide(from);show('ctrls')}
$('mOpts').onclick=()=>openOpts('title');$('pOpts').onclick=()=>openOpts('pause');
$('mCtrls').onclick=()=>openCtrls('title');$('pCtrls').onclick=()=>openCtrls('pause');
$('oBack').onclick=()=>{hide('opts');show(optsFrom)};$('cBack').onclick=()=>{rebind=null;hide('ctrls');show(optsFrom)};
$('cReset').onclick=()=>{BIND=JSON.parse(JSON.stringify(BIND_DEF));saveBinds();buildControls()};
function syncOptions(){const st=Save.d.settings;if(!$('qual'))return;
 $('qual').value=st.quality;$('shk').value=Math.round(st.shake*100);$('vMaster').value=Math.round(st.vol.master*100);$('vSfx').value=Math.round(st.vol.sfx*100);
 $('vMusic').value=Math.round(st.vol.music*100);$('mute').checked=!!st.mute;$('tMode').value=st.touch;$('aMode').value=st.aim}
function applySettings(){const st=Save.d.settings;setQuality(st.quality==='auto'?autoLevel():st.quality);SHAKE=st.shake;Snd.apply();loadBinds();syncOptions()}
const setOpt=(id,f)=>{$(id).oninput=$(id).onchange=e=>{f(e.target);Save.write();applySettings();Snd.play('ui')}};
setOpt('qual',t=>Save.d.settings.quality=t.value);setOpt('shk',t=>Save.d.settings.shake=+t.value/100);
setOpt('vMaster',t=>Save.d.settings.vol.master=+t.value/100);setOpt('vSfx',t=>Save.d.settings.vol.sfx=+t.value/100);setOpt('vMusic',t=>Save.d.settings.vol.music=+t.value/100);
setOpt('mute',t=>Save.d.settings.mute=t.checked);setOpt('tMode',t=>Save.d.settings.touch=t.value);setOpt('aMode',t=>Save.d.settings.aim=t.value);
function buildControls(){
 $('ctrlList').innerHTML=Object.keys(ACTIONS).map(a=>`<div class="crow"><span>${ACTIONS[a]}</span>${[0,1].map(i=>`<button class="kb ${rebind&&rebind.a===a&&rebind.i===i?'wait':''}" data-a="${a}" data-i="${i}">${rebind&&rebind.a===a&&rebind.i===i?'Pulsa una tecla…':esc(keyName(BIND[a][i]))}</button>`).join('')}</div>`).join('');
 $('ctrlList').onclick=e=>{const b=e.target.closest('.kb');if(!b)return;e.stopPropagation();rebind={a:b.dataset.a,i:+b.dataset.i};buildControls()}}
const helpText=()=>`${keyName(BIND.left[0])}/${keyName(BIND.right[0])} mover · ${keyName(BIND.jump[0])} saltar · ${keyName(BIND.down[0])} bajar · ${keyName(BIND.primary[0])} primario · ${keyName(BIND.secondary[0])} secundaria · ${keyName(BIND.move[0])} movimiento · ${keyName(BIND.ult[0])} definitiva · ${keyName(BIND.interact[0])} interactuar · ${keyName(BIND.inventory[0])} inventario · ${keyName(BIND.pause[0])} pausa · ${keyName(BIND.mute[0])} silenciar · también con mando`;

/* ===================== ARRANQUE ===================== */
/* ===================== PANTALLA DE INICIO ===================== */
// vuelta a la pantalla de inicio desde cualquier sitio (fin de partida, pausa, ranking, tienda); la partida guardada se conserva
function goHome(){for(const id of ['title','menu','end','rank','shop','codex','choice','opts','ctrls','pause','inv','altar','mastery','storm'])hide(id);S=null;show('menu');updateTitle()}  // se entra directo al lobby
function updateTitle(){$('tGems').textContent=`💎 ${Save.d.shop.gems.toLocaleString('es')}`;buildMenu()}
$('tPlay').onclick=()=>{hide('title');show('menu');buildMenu();Snd.play('ui')};
$('tShop').onclick=()=>openShop();
applySettings();updateTitle();
addEventListener('DOMContentLoaded',()=>requestAnimationFrame(loop));  // el bucle arranca cuando ya cargaron todos los scripts (cosmetics, auth, update…)
