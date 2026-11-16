'use strict';
/* ===================== UI: HUD, menús, maestría, fin de partida ===================== */
function bar(x,y,w,h,v,col,bg){c.fillStyle=bg||'#1a1030';c.fillRect(x,y,w,h);c.fillStyle=col;c.fillRect(x,y,w*clamp(v,0,1),h);c.strokeStyle='#ffffff55';c.lineWidth=1;c.strokeRect(x,y,w,h)}
function hud(){
 const s=S,p=s.p;screen();c.textAlign='left';c.font='bold 13px monospace';c.shadowBlur=0;
 bar(16,H-34,240,16,p.hp/p.maxHp,'#4cff7a');c.fillStyle='#fff';c.fillText(`${Math.ceil(p.hp)}/${Math.ceil(p.maxHp)}`,22,H-21);
 bar(16,H-14,240,6,p.xp/p.need,'#ffd23c');c.fillText(`NIV ${p.lvl}  ·  ${s.ch.name}`,16,H-42);
 const slots=[['p','LMB',s.ch.primary],['s','RMB',s.ch.secondary],['m','SHIFT',s.ch.move],['u','Q',s.ch.ult]];
 slots.forEach(([k,lb,d],i)=>{const x=W/2-130+i*68,y=H-58,cd=p.cd[k],mx=k==='p'?d.cd/p.m.as:d.cd*(1-p.m.cdr);
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
 S.st='over';$('endT').textContent=win?`¡${S.bossName.toUpperCase()} DERROTADO!`:(S.df.perma?'MUERTE PERMANENTE':'HAS CAÍDO');
 $('endS').textContent=`${S.ch.name} · Nivel ${S.p.lvl} · ${S.kills} bajas · ${Math.floor(S.t/60)}:${String(Math.floor(S.t%60)).padStart(2,'0')} · ${S.df.name}`;
 setTimeout(()=>$('end').style.display='flex',win?1500:600);
}

function buildMenu(){
 $('chars').innerHTML=Object.entries(CHARS).map(([k,v])=>`<div class="card ${k===selC?'sel':''}" data-k="${k}" style="--c:${v.color}"><b>${v.name}</b><i>${v.fam}</i><small>${[v.primary,v.secondary,v.move,v.ult].map(a=>a.name).join(' · ')}</small></div>`).join('');
 $('diffs').innerHTML=DIFFS.map((d,i)=>`<div class="diff ${i===selD?'sel':''}" data-i="${i}">${i+1}. ${d.name}</div>`).join('');
 $('dd').textContent=DIFFS[selD].desc;
}
$('chars').onclick=e=>{const k=e.target.closest('.card');if(k){selC=k.dataset.k;buildMenu()}};
$('diffs').onclick=e=>{const k=e.target.closest('.diff');if(k){selD=+k.dataset.i;buildMenu()}};
$('go').onclick=()=>start(selC,selD);
$('again').onclick=()=>{$('end').style.display='none';$('menu').style.display='flex';S=null;screen();c.clearRect(0,0,W,H)};

/* ===================== ARRANQUE ===================== */
buildMenu();requestAnimationFrame(loop);
