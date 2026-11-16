'use strict';
/* ===================== UI: HUD, menús, maestría, fin de partida ===================== */
function bar(x,y,w,h,v,col,bg){c.fillStyle=bg||'#1a1030';c.fillRect(x,y,w,h);c.fillStyle=col;c.fillRect(x,y,w*clamp(v,0,1),h);c.strokeStyle='#ffffff55';c.lineWidth=1;c.strokeRect(x,y,w,h)}
function hud(){
 const s=S,p=s.p;screen();c.textAlign='left';c.font='bold 13px monospace';c.shadowBlur=0;
 bar(16,H-34,240,16,p.hp/p.maxHp,'#4cff7a');c.fillStyle='#fff';c.fillText(`${Math.ceil(p.hp)}/${Math.ceil(p.maxHp)}`,22,H-21);
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
 if(s.msgT>0){c.globalAlpha=Math.min(1,s.msgT);c.textAlign='center';c.font='bold 18px monospace';c.fillStyle='#fff';c.fillText(s.msg,W/2,s.boss?90:70);c.globalAlpha=1}
}

/* Los nodos pendientes se encolan en S.mq: subir varios niveles de golpe ya no pierde elecciones */
function openMastery(){
 S.st='mastery';const pool=MASTERY.slice().sort(()=>Math.random()-.5).slice(0,2);
 $('nodes').innerHTML=pool.map((n,i)=>`<div class="card sel" data-i="${i}" style="--c:#ffd23c"><b>${n.name}</b><small>${n.desc}</small></div>`).join('');
 $('mq').textContent=S.mq>1?`(${S.mq} pendientes)`:'';
 $('nodes').onclick=e=>{const k=e.target.closest('.card');if(!k)return;pool[+k.dataset.i].fx(S.p);mouse.l=mouse.r=0;
  if(--S.mq>0)openMastery();else{$('mastery').style.display='none';S.st='play'}};
 $('mastery').style.display='flex';
}

function endGame(win){
 S.st='over';recordRunEnd(win);
 $('endT').textContent=win?`¡${S.bossName.toUpperCase()} DERROTADO!`:(S.df.perma?'MUERTE PERMANENTE':'HAS CAÍDO');
 $('endS').textContent=`${S.ch.name} · Nivel ${S.p.lvl} · ${S.kills} bajas · ${Math.floor(S.t/60)}:${String(Math.floor(S.t%60)).padStart(2,'0')} · ${S.df.name}`;
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
$('again').onclick=()=>{$('end').style.display='none';$('menu').style.display='flex';S=null;screen();c.clearRect(0,0,W,H);buildMenu()};

/* ===================== ARRANQUE ===================== */
buildMenu();requestAnimationFrame(loop);
