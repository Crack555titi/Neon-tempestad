'use strict';
/* ===================== UI: HUD, menús, maestría, fin de partida ===================== */
function bar(x,y,w,h,v,col,bg){c.fillStyle=bg||'#1a1030';c.fillRect(x,y,w,h);c.fillStyle=col;c.fillRect(x,y,w*clamp(v,0,1),h);c.strokeStyle='#ffffff55';c.lineWidth=1;c.strokeRect(x,y,w,h)}
function hud(){
 const s=S,p=s.p;screen();c.textAlign='left';c.font='bold 13px monospace';c.shadowBlur=0;
 bar(16,H-34,240,16,p.hp/p.maxHp,'#4cff7a');if(p.sh>0){c.fillStyle='#5ab4ffcc';c.fillRect(16,H-34,240*Math.min(1,p.sh/p.maxHp),5)}
 c.fillStyle='#fff';c.fillText(`${Math.ceil(p.hp)}/${Math.ceil(p.maxHp)}${p.sh>=1?' +'+Math.ceil(p.sh):''}`,22,H-21);
 // oro e iconos de objetos
 c.fillStyle='#ffd23c';c.fillText(`◆ ${p.gold} oro`,16,22);
 let ix=0;for(const id of sortedItems()){const it=ITEM[id],n=p.items[id],col=ix%20,row=ix/20|0;drawIcon(it,16+col*22,32+row*22,19,n);ix++}
 c.textAlign='left';c.font='bold 13px monospace';
 bar(16,H-14,240,6,p.xp/p.need,'#ffd23c');c.fillText(`NIV ${p.lvl}  ·  ${s.ch.name}`,16,H-42);
 if(s.ch.passive&&s.ch.passive.t==='corrupt'){bar(16,H-62,240,6,p.corr/100,'#9b30ff');c.fillStyle='#d070ff';c.font='10px monospace';c.fillText(p.buf.void?'FORMA DEL VACÍO':'Corrupción',262,H-56)}
 if(s.ch.primary.forms){c.fillStyle=p.form==='b'?'#2aff1a':'#7dff6a';c.font='bold 11px monospace';c.fillText(p.form==='b'?'BESTIA':'ESPINAS',262,H-21)}
 const slots=[['p','LMB'],['s','RMB'],['m','SHIFT'],['u','Q']];
 slots.forEach(([k,lb],i)=>{const d=ab(k),x=W/2-130+i*68,y=H-58,cd=p.cd[k],mx=maxCd(k,d);
  c.fillStyle='#120a26';c.fillRect(x,y,60,44);c.strokeStyle=cd<=0?s.ch.color:'#444';c.lineWidth=2;c.strokeRect(x,y,60,44);
  if(cd>0){c.fillStyle='#000a';c.fillRect(x,y+44*(1-cd/mx),60,44*cd/mx)}
  c.fillStyle='#fff';c.font='10px monospace';c.textAlign='center';c.fillText(lb,x+30,y+14);c.fillText(d.name.slice(0,9),x+30,y+34)});
 c.textAlign='right';c.font='bold 13px monospace';c.fillStyle='#fff';const m=Math.floor(s.clock/60),sc=Math.floor(s.clock%60);
 c.fillText(`${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}  ·  ${s.df.name}`,W-14,22);c.fillStyle='#ff9a5a';c.fillText(`Dificultad x${coef().toFixed(1)}`,W-14,40);
 if(s.p.revive>0){c.fillStyle='#4cff9a';c.fillText('♥ Resurrección x'+s.p.revive,W-14,58)}
 if(s.boss){const b=s.boss;c.textAlign='center';c.fillStyle=b.def.color;c.fillText(`${b.def.name.toUpperCase()} · FASE ${b.ph}`,W/2,22);bar(W/2-250,28,500,14,b.hp/b.maxHp,'#ff3c6a');bar(W/2-250,45,500,6,b.stag/b.stagMax,'#ffd23c')}
 else{c.textAlign='center';c.font='bold 12px monospace';c.fillStyle=STAGE.plat.edge;c.fillText(`ETAPA ${s.stage+1}/${STAGES.length} · ${STAGE.name.toUpperCase()}`,W/2,20)}
 // teletransportador: estado y flecha cuando está fuera de pantalla
 const T=s.tp;c.textAlign='center';c.font='bold 12px monospace';
 const tl=T.state==='idle'?'Encuentra el teletransportador (E)':T.state==='ready'?'¡Teletransportador listo! (E)':`Teletransportador ${Math.floor(T.charge*100)}%${T.out?' · ¡vuelve a la zona!':''}${s.boss?' · derrota al jefe':''}`;
 c.fillStyle=T.state==='ready'?'#4cff7a':T.out?'#ff6a6a':'#ffd23c';c.fillText(tl,W/2,s.boss?66:38);
 if(T.state==='charging'){bar(W/2-120,s.boss?70:42,240,5,T.charge,'#ffd23c')}
 const tx=T.x-s.cam;if(tx<0||tx>W){const ex=tx<0?18:W-18,ey=clamp(T.y-40,60,H-80),d=tx<0?-1:1;c.fillStyle=T.state==='ready'?'#4cff7a':'#3cf0ff';
  c.beginPath();c.moveTo(ex+d*10,ey);c.lineTo(ex-d*6,ey-9);c.lineTo(ex-d*6,ey+9);c.fill()}
 if(s.msgT>0){c.globalAlpha=Math.min(1,s.msgT);c.textAlign='center';c.font='bold 18px monospace';c.fillStyle='#fff';c.fillText(s.msg,W/2,s.boss?90:70);c.globalAlpha=1}
 // aviso al recoger un objeto
 if(s.note){const {it,n,t}=s.note,col=RARITY[it.r].col,y=s.boss?104:86,sl=Math.min(1,(3.5-t)*6);c.globalAlpha=Math.min(1,t*2);
  c.fillStyle='#0a0618ee';c.fillRect(W/2-230,y,460,58);glow(col,16*sl);c.strokeStyle=col;c.lineWidth=2;c.strokeRect(W/2-230,y,460,58);c.shadowBlur=0;
  drawIcon(it,W/2-220,y+9,40);c.textAlign='left';c.font='bold 15px monospace';c.fillStyle=col;c.fillText(`${it.name}${n>1?' ×'+n:''}`,W/2-168,y+24);
  c.font='10px monospace';c.fillStyle='#9a93c8';c.fillText(RARITY[it.r].n.toUpperCase(),W/2+220-c.measureText(RARITY[it.r].n.toUpperCase()).width,y+24);
  c.fillStyle='#cfc9f5';wrapText(it.desc,W/2-168,y+40,390,12);c.globalAlpha=1}
}
const sortedItems=()=>Object.keys(S.p.items).filter(id=>S.p.items[id]>0).sort((a,b)=>'curlmf'.indexOf(ITEM[a].r)-'curlmf'.indexOf(ITEM[b].r));
function drawIcon(it,x,y,s,n){const rc=RARITY[it.r].col;c.fillStyle='#120a26';c.fillRect(x,y,s,s);c.fillStyle=it.col;c.fillRect(x+3,y+3,s-6,s-6);
 c.strokeStyle=rc;c.lineWidth=2;c.strokeRect(x,y,s,s);c.fillStyle='#000';c.font=`bold ${s*.5|0}px monospace`;c.textAlign='center';c.fillText(it.name[0],x+s/2,y+s*.68);
 if(n>1){c.fillStyle='#fff';c.font='bold 9px monospace';c.textAlign='right';c.fillText(n,x+s+2,y+s+2)}}
function wrapText(t,x,y,w,lh){let line='';for(const word of t.split(' ')){const tl=line?line+' '+word:word;if(c.measureText(tl).width>w&&line){c.fillText(line,x,y);y+=lh;line=word}else line=tl}c.fillText(line,x,y)}

/* ===================== INVENTARIO Y ALTAR ===================== */
function itemCard(it,n){const rc=RARITY[it.r].col;
 return `<div class="item" style="--c:${rc}"><span class="ico" style="background:${it.col}">${esc(it.name[0])}</span><div><b>${esc(it.name)}${n>1?' ×'+n:''}</b> <em>${RARITY[it.r].n}</em>
  <small>${esc(it.desc)}</small>${it.tags?`<i>Sinergia: ${it.tags.join(', ')}</i>`:''}</div></div>`}
function toggleInv(){
 if(S.st==='inv'){$('inv').style.display='none';S.st='play';mouse.l=mouse.r=0;return}
 const p=S.p,m=p.m,pct=v=>Math.round(v*100)+'%',ids=sortedItems();
 $('invStats').textContent=`Daño ×${(p.dmgMul*m.dmg*bm('dmg')).toFixed(2)} · Vel. ataque ×${(m.as*bm('as')).toFixed(2)} · Crítico ${pct(p.items.blacklens?1:m.crit)} · Robo de vida ${pct(m.ls)} · Armadura ${pct(Math.min(.6,m.arm))} · Enfriamientos −${pct(Math.min(.6,m.cdr))} · Suerte ${p.items.entropy?0:m.luck} · Oro ${p.gold}`;
 $('invList').innerHTML=ids.length?ids.map(id=>itemCard(ITEM[id],p.items[id])).join(''):'<p>Aún no tienes objetos. Abre cofres con <b>E</b>.</p>';
 $('inv').style.display='flex';S.st='inv';
}
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

function endGame(win){
 S.st='over';recordRunEnd(win);
 // muerte permanente estricta: se borra la partida guardada y no hay reintento
 if(win||S.df.perma)clearRun();
 $('endT').textContent=win?'¡HAS SUPERADO LA TEMPESTAD!':(S.df.perma?'MUERTE PERMANENTE · PARTIDA BORRADA':'HAS CAÍDO');
 $('endS').textContent=`${S.ch.name} · Etapa ${S.stage+1}/${STAGES.length} · Nivel ${S.p.lvl} · ${S.kills} bajas · ${Math.floor(S.t/60)}:${String(Math.floor(S.t%60)).padStart(2,'0')} · ${S.df.name}`;
 $('retry').style.display=!win&&loadRun()?'inline-block':'none';
 setTimeout(()=>$('end').style.display='flex',win?1500:600);
}

/* ===================== SELECCIÓN DE PERSONAJE ===================== */
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function abHtml(lbl,a){
 if(a.forms)return Object.values(a.forms).map(f=>abHtml(lbl,f)).join('');
 return `<li><kbd>${lbl}</kbd><b>${esc(a.name)}</b>${a.hold?' <em>mantener</em>':''}<span>${esc(a.desc||'')}</span></li>`;
}
function buildMenu(){
 if(!isUnlocked(selC))selC='vanguard';
 $('fams').innerHTML=FAMILIES.map(f=>`<div class="fam"><h3>${f}</h3>${Object.entries(CHARS).filter(([,v])=>v.fam===f).map(([k,v])=>{const lk=!isUnlocked(k);
  return `<div class="card mini ${k===selC?'sel':''} ${lk?'lock':''}" data-k="${k}" style="--c:${v.color}"><b>${lk?'🔒 ':''}${esc(v.name)}</b></div>`}).join('')}</div>`).join('');
 const v=CHARS[selC];
 $('info').style.setProperty('--c',v.color);
 $('info').innerHTML=`<h2 style="color:${v.color}">${esc(v.name)}</h2><i>${esc(v.fam)} · ${esc(v.role)}</i>
  <div class="stats">Vida ${v.hp} · Velocidad ${v.spd} · Salto ${v.jump}</div>
  ${v.passive?`<p class="passive">◆ ${esc(v.passive.desc)}</p>`:''}
  <ul>${abHtml('LMB',v.primary)}${abHtml('RMB',v.secondary)}${abHtml('SHIFT',v.move)}${abHtml('Q',v.ult)}</ul>`;
 $('diffs').innerHTML=DIFFS.map((d,i)=>`<div class="diff ${i===selD?'sel':''}" data-i="${i}">${i+1}. ${d.name}</div>`).join('');
 $('dd').textContent=DIFFS[selD].desc;
 const n=Object.keys(CHARS).filter(isUnlocked).length;$('unl').textContent=`${n}/${Object.keys(CHARS).length} desbloqueados`;
 const run=loadRun();$('cont').style.display=run?'inline-block':'none';
 if(run)$('cont').textContent=`▶ CONTINUAR · ${CHARS[run.cid].name} · Etapa ${run.stage+1} · ${DIFFS[run.did].name}`;
}
function showLocked(k){
 const v=CHARS[k],a=ACHIEVEMENTS[v.unlock];
 $('info').style.setProperty('--c','#555');
 $('info').innerHTML=`<h2>🔒 ${esc(v.name)}</h2><i>${esc(v.fam)} · ${esc(v.role)}</i>
  <p class="passive">Logro «${esc(a.name)}»: ${esc(a.desc)}</p>
  <div class="prog"><div style="width:${Math.min(100,Save.val(a.stat)/a.goal*100)}%"></div></div>
  <small>${Math.floor(Math.min(Save.val(a.stat),a.goal))} / ${a.goal}</small>`;
}
$('fams').onclick=e=>{const k=e.target.closest('.card');if(!k)return;if(isUnlocked(k.dataset.k)){selC=k.dataset.k;buildMenu()}else showLocked(k.dataset.k)};
$('diffs').onclick=e=>{const k=e.target.closest('.diff');if(k){selD=+k.dataset.i;buildMenu()}};
$('go').onclick=()=>start(selC,selD);
$('cont').onclick=()=>{const r=loadRun();if(r)start(r.cid,r.did,r)};
$('retry').onclick=()=>{const r=loadRun();if(r){$('end').style.display='none';start(r.cid,r.did,r)}};
$('again').onclick=()=>{$('end').style.display='none';$('menu').style.display='flex';S=null;screen();c.clearRect(0,0,W,H);buildMenu()};

/* ===================== ARRANQUE ===================== */
buildMenu();requestAnimationFrame(loop);
