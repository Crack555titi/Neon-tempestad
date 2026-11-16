'use strict';
/* ===================== HABILIDADES =====================
   Biblioteca de tipos: AB[t](jugador, datos, ánguloDeApuntado). Los personajes solo eligen `t` y parámetros. */
function spawnPr(o){o.col=o.col||S.ch.color;return fxProj(o)}
const AB={
 melee(p,d,a){const cy=p.y-p.h/2;
  for(const e of S.en){if(e.dead)continue;const dx=e.x-p.x,dy=e.y-e.h/2-cy;
   if(hyp(dx,dy)<d.range+e.w/2){let da=Math.abs(((Math.atan2(dy,dx)-a+Math.PI*3)%(Math.PI*2))-Math.PI);if(da<d.arc/2){hurtE(e,d.dmg);e.vx+=Math.cos(a)*260}}}
  for(let i=0;i<9;i++){const an=a-d.arc/2+d.arc*i/8;spark(p.x+Math.cos(an)*d.range*.8,cy+Math.sin(an)*d.range*.8,Math.cos(an)*60,Math.sin(an)*60,.18,S.ch.color,6)}
  p.vx+=Math.cos(a)*90},
 proj(p,d,a){const n=d.n||1;for(let i=0;i<n;i++){const an=a+(i-(n-1)/2)*(d.spread||0)+R(-.02,.02);
  spawnPr({x:p.x,y:p.y-p.h/2,vx:Math.cos(an)*d.spd,vy:Math.sin(an)*d.spd,dmg:d.dmg,r:d.r,life:d.life,pierce:d.pierce||0,home:d.home||0})}S.shake=Math.max(S.shake,d.pierce?5:.8)},
 dashHit(p,d,a){p.dash={t:.2,vx:sgn(Math.cos(a))*d.dist/.2,dmg:d.dmg,hit:new Set()}},
 dash(p,d,a){const dir=(keys.KeyD?1:0)-(keys.KeyA?1:0)||p.face;p.dash={t:.17,vx:dir*d.dist/.17,dmg:0,hit:new Set()}},
 blink(p,d,a){burst(p.x,p.y-20,16,S.ch.color,300,3);p.x=clamp(p.x+Math.cos(a)*d.dist,20,WORLD-20);p.y=clamp(p.y+Math.sin(a)*d.dist*.6,60,FLOOR);p.vy=0;p.inv=.3;burst(p.x,p.y-20,16,S.ch.color,300,3)},
 nova(p,d){ring(p.x,p.y-20,d.r,S.ch.color,.5);aoe(p.x,p.y-20,d.r,d.dmg);for(const e of S.en)if(hyp(e.x-p.x,e.y-p.y)<d.r)e.vx+=sgn(e.x-p.x)*500;S.shake=18},
 barrage(p,d,a){const mx=mouse.x+S.cam;for(let i=0;i<d.n;i++)S.sch.push({t:i*.11,f:()=>spawnPr({x:clamp(mx+R(-220,220),10,WORLD-10),y:-20,vx:R(-40,40),vy:950,dmg:d.dmg,r:10,life:2,boom:90,col:'#ffb13c'})})},
 summon(p,d){for(let i=0;i<d.n;i++){if(S.dr.length>=8)S.dr.shift();S.dr.push({a:R(0,6.28),life:d.life,cd:0,dmg:d.dmg})}ring(p.x,p.y-20,80,S.ch.color,.4)},
 zone(p,d){const x=clamp(mouse.x+S.cam,0,WORLD),y=mouse.y;Z({x,y,r:d.r,warn:0,life:d.life,dot:1,slow:1,col:'#3cf0ff'});ring(x,y,d.r,'#3cf0ff',.4)},
 freeze(p,d){S.freeze=d.time;ring(p.x,p.y-20,700,'#bff',.7);S.shake=10;say('¡TIEMPO DETENIDO!')}
};
const SLOT={p:'primary',s:'secondary',m:'move',u:'ult'};
function cast(slot){
 const p=S.p,d=S.ch[SLOT[slot]];
 AB[d.t](p,d,p.aim);Ev.emit('onCast',slot);
 p.cd[slot]=slot==='p'?d.cd/p.m.as:d.cd*(1-p.m.cdr);
}
