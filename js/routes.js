'use strict';
/* ===================== RUTAS, TRANSPORTE Y BIOMA OCULTO =====================
   - RUTAS ALTERNATIVAS (60): al cruzar el teletransportador eliges camino: Segura (normal) o Peligrosa
     (enemigos +25% de vida, 2 cofres extra y +30% de oro).
   - BIOMA OCULTO (53): si en esta etapa descubriste un secreto (sala secreta o evento secreto) aparece una tercera ruta:
     el Jardín del Vacío, una versión violeta de la etapa con +50% de oro, todos los cofres grandes y un cofre dorado.
   - TRANSPORTE (55): plataformas de teletransporte enlazadas por parejas en extremos opuestos del mapa. */
const ROUTES={
 segura:{n:'Ruta segura',d:'La etapa siguiente, sin sorpresas.',col:'#4cff9a'},
 peligro:{n:'Ruta peligrosa',d:'Enemigos +25% de vida, pero 2 cofres extra y +30% de oro.',col:'#ff6a3c'},
 vacio:{n:'Ruta oculta: Jardín del Vacío',d:'Un bioma secreto: +50% de oro, todos los cofres son grandes y hay un cofre dorado.',col:'#b070ff'}};
const secretsNow=()=>(Save.d.stats.secrets||0)+(S.sec?Object.keys(S.sec.done).length:0);
function routeOpen(go){const s=S,ks=['segura','peligro'];if(secretsNow()>(s.secrets0||0))ks.push('vacio');
 s.st='choice';mouse.l=mouse.r=0;pickOpts=ks.map(k=>({kind:'route',id:k,title:ROUTES[k].n,sub:ROUTES[k].d,col:ROUTES[k].col,fn:()=>{s.route=k;go()}}));
 $('choiceT').textContent='⇆ ELIGE TU RUTA';$('choiceOpts').innerHTML=pickOpts.map((o,i)=>`<div class="card sel" data-i="${i}" style="--c:${o.col}"><b>${esc(o.title)}</b><small>${esc(o.sub)}</small></div>`).join('');
 $('choice').style.display='flex'}
function routesStage(){const s=S,r=s.route;s.route=null;s.routeCur=r||'segura';s.secrets0=secretsNow();s.routeGold=1;s.routeHp=1;
 if(r==='peligro'){s.routeGold=1.3;s.routeHp=1.25;spawnChest();spawnChest();s.sch.push({t:2.5,f:()=>{if(S===s)say('⇆ Ruta peligrosa: enemigos más duros y mejor botín')}})}
 if(r==='vacio'){s.routeGold=1.5;STAGE=Object.assign(eraStage(STAGE,{hue:200,sat:1.4,lum:-.06}),{plats:STAGE.plats,name:'Jardín del Vacío'});genBg(STAGE,s.stage*7919+77);
  for(const o of s.ints)if(o.k==='chest'&&o.tier==='small')o.tier='large';s.ints.push(Object.assign({k:'chest',tier:'gold',open:0},spot()));Save.addSet('biomes','vacio');
  s.sch.push({t:2.5,f:()=>{if(S===s)say('✧ BIOMA OCULTO: el Jardín del Vacío. Pocos lo han visto')}})}
 if(WORLDCFG.on&&Math.random()<.5){const a=spot();let b=spot(),n=0;while(Math.abs(b.x-a.x)<800&&n++<20)b=spot();
  if(Math.abs(b.x-a.x)>=600){const A={k:'pad',x:a.x,y:a.y},B={k:'pad',x:b.x,y:b.y};A.to=B;B.to=A;s.ints.push(A,B)}}}
function routesSpawn(e){if(S.routeHp>1&&!e.d.structure){e.hp*=S.routeHp;e.maxHp*=S.routeHp}}
function routesInteract(o){if(o.k!=='pad')return false;const p=S.p,t=o.to;if((S.padCd||0)>S.t)return true;S.padCd=S.t+1;
 ring(p.x,p.y-20,60,'#3cf0ff',.3);p.x=t.x;p.y=t.y;p.vx=p.vy=0;ring(p.x,p.y-20,60,'#3cf0ff',.3);Snd.play('tp');Save.add('padUses');return true}
function routesDraw(o){if(o.k!=='pad')return false;const t=S.t;c.save();if(QL.glow)glow('#3cf0ff',14);c.strokeStyle='#3cf0ff';c.lineWidth=3;
 c.beginPath();c.ellipse(o.x,o.y-3,28,7,0,0,6.283);c.stroke();c.globalAlpha=.35+.25*Math.sin(t*5);c.fillStyle='#3cf0ff';c.fillRect(o.x-20,o.y-46,40,42);c.restore();c.shadowBlur=0;return true}
function routesMsg(o){return o.k==='pad'?['[E] Plataforma de transporte · al otro extremo',true]:''}
{const _ns=nextStage;nextStage=function(){if(!WORLDCFG.on||S.mode==='inv')return _ns();routeOpen(_ns)}}
{const _gf=goldFor;goldFor=function(e){return Math.round(_gf(e)*(S.routeGold||1))}}
{const _sc=spawnChest;spawnChest=function(){_sc();if(S.routeCur==='vacio'){const o=S.ints[S.ints.length-1];if(o&&o.k==='chest'&&o.tier==='small')o.tier='large'}}}
