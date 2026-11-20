'use strict';
/* ===================== LOBBY: el héroe en escena =====================
   Se entra directo aquí (sin portada). Escena en el canvas del juego, en capas:
   - Fondo: cielo de tormenta, dos líneas de edificios con ventanas y relámpagos que de verdad iluminan al héroe (luz de contorno fría desde la izquierda).
   - Plano medio: la plataforma del taller (rejilla gastada, remaches, franjas de peligro), un letrero de neón roto que es la luz
     principal cálida y un charco que refleja al héroe y al letrero.
   - Primer plano: lluvia, gotas desenfocadas sobre el «cristal» y un cable colgando que rompe la simetría; grano encima.
   El neón solo existe como fuente de luz del mundo: la interfaz no brilla. Se respeta «reducir movimiento». */
const LOBBY={t:0,cid:null,land:1,flash:0,nextBolt:3,bolt:null,px:.5,cam:0,camT:0,dust:[],sky:null,grain:null,rm:false};
try{LOBBY.rm=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
if(typeof addEventListener==='function')addEventListener('pointermove',e=>{LOBBY.px=e.clientX/(innerWidth||1)});
function lobbyRng(seed){return()=>{seed=seed*16807%2147483647;return seed/2147483647}}
function lobbyInit(){const r=lobbyRng(7),far=[],mid=[];
 for(let x=-40;x<W+80;){const w=26+r()*60,h=60+r()*150;far.push({x,w,h,win:Array.from({length:Math.floor(h/14)*Math.floor(w/12)},()=>r()<.12?(r()<.75?1:2):0)});x+=w+2+r()*6}
 for(let x=-60;x<W+120;){const w=40+r()*90,h=40+r()*110;mid.push({x,w,h,ant:r()<.3});x+=w+r()*30}
 LOBBY.sky={far,mid,rain:Array.from({length:110},()=>({x:r()*W,y:r()*H,v:.7+r()*.6})),drops:Array.from({length:9},()=>({x:r()*W,y:r()*H*.8,r:6+r()*14,v:4+r()*10}))};
 // grano: una textura de ruido que se repite (aspecto de película, nada de superficies lisas)
 try{const g=document.createElement('canvas');g.width=g.height=128;const gc=g.getContext('2d'),im=gc.createImageData(128,128);
  for(let i=0;i<im.data.length;i+=4){const v=Math.random()*255|0;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}gc.putImageData(im,0,0);LOBBY.grain=c.createPattern(g,'repeat')}catch(e){LOBBY.grain=null}}
const LB_GROUND=382,LB_HX=290,LB_SCALE=3;
function drawLobby(dt){const L=LOBBY;if(!L.sky)lobbyInit();L.t+=dt;const t=L.t,sk=L.sky;
 screen();
 // cámara: la pestaña Arsenal desplaza un poco la escena; el puntero da un leve paralaje
 L.cam+=(L.camT-L.cam)*Math.min(1,dt*8);const par=(L.px-.5)*(L.rm?0:1);
 // relámpagos: cada 8–15 s; iluminan el cielo y el contorno del héroe
 if(!L.rm&&(L.nextBolt-=dt)<=0){L.nextBolt=8+Math.random()*7;L.flash=1;const x0=60+Math.random()*260,pts=[[x0,0]];let x=x0,y=0;while(y<300){y+=20+Math.random()*30;x+=Math.random()*40-20;pts.push([x,y])}L.bolt={pts,t:.18};if(typeof Snd!=='undefined'&&Snd.ctx)Snd.play('phase')}
 L.flash=Math.max(0,L.flash-dt*2.6);const fl=L.flash;
 // cielo de tormenta (grafito azulado, sin degradados violeta/cian decorativos)
 const g=c.createLinearGradient(0,0,0,LB_GROUND);g.addColorStop(0,'#0b0d12');g.addColorStop(.7,'#171a21');g.addColorStop(1,'#1f2129');c.fillStyle=g;c.fillRect(0,0,W,H);
 if(fl>0){c.fillStyle=`rgba(190,210,235,${fl*.18})`;c.fillRect(0,0,W,LB_GROUND)}
 // nubes: masas oscuras lentas con el borde inferior iluminado por el relámpago
 for(let i=0;i<6;i++){const x=((i*190+t*(6+i))%(W+300))-150-par*10,y=40+(i%3)*34;c.fillStyle=`rgba(${20+fl*90|0},${23+fl*95|0},${30+fl*100|0},.9)`;c.beginPath();c.ellipse(x,y,170,38,0,0,6.283);c.fill()}
 if(L.bolt&&(L.bolt.t-=dt)>0){c.strokeStyle='rgba(225,235,255,.9)';c.lineWidth=2;c.beginPath();L.bolt.pts.forEach(([x,y],i)=>i?c.lineTo(x-par*8,y):c.moveTo(x-par*8,y));c.stroke()}
 // edificios lejanos con ventanas encendidas (pocas, ámbar y alguna fría)
 c.save();c.translate(-par*14-L.cam*.3,0);for(const b of sk.far){const top=LB_GROUND-40-b.h;c.fillStyle=fl>0?`rgb(${27+fl*30|0},${31+fl*32|0},${39+fl*36|0})`:'#1b1f27';c.fillRect(b.x,top,b.w,b.h+40);
  let k=0;for(let wy=top+8;wy<top+b.h-6;wy+=14)for(let wx=b.x+4;wx<b.x+b.w-8;wx+=12){const w=b.win[k++];if(!w)continue;c.fillStyle=w===1?'rgba(201,138,58,.55)':'rgba(127,155,176,.45)';c.fillRect(wx,wy,5,7)}}c.restore();
 // niebla baja entre capas
 const fg=c.createLinearGradient(0,LB_GROUND-120,0,LB_GROUND);fg.addColorStop(0,'rgba(30,33,40,0)');fg.addColorStop(1,'rgba(30,33,40,.85)');c.fillStyle=fg;c.fillRect(0,LB_GROUND-120,W,120);
 // edificios cercanos (más oscuros, más paralaje)
 c.save();c.translate(-par*26-L.cam*.6,0);c.fillStyle='#111318';for(const b of sk.mid){c.fillRect(b.x,LB_GROUND-b.h,b.w,b.h);if(b.ant){c.fillRect(b.x+b.w*.6,LB_GROUND-b.h-26,2,26);if(Math.sin(t*2+b.x)>.6){c.fillStyle='rgba(200,80,60,.8)';c.fillRect(b.x+b.w*.6-1,LB_GROUND-b.h-28,4,3);c.fillStyle='#111318'}}}c.restore();
 c.save();c.translate(-L.cam,0);
 // letrero de neón roto: la luz principal (cálida) de la escena; parpadea de vez en cuando
 const sx=400,sy=118,on=L.rm||!(Math.sin(t*23)>.93||(t%7>6.6&&Math.sin(t*60)>0));
 c.fillStyle='#0e1014';c.fillRect(sx-70,sy-26,140,40);c.strokeStyle='#2b2f37';c.lineWidth=2;c.strokeRect(sx-70,sy-26,140,40);
 c.font='bold 22px Bahnschrift, "Arial Narrow", sans-serif';c.textAlign='center';c.fillStyle=on?'#ff7a52':'#4a2a22';c.fillText('TALLER',sx-14,sy+2);c.fillStyle=on?'#ffb07a':'#3a2a22';c.fillText('07',sx+50,sy+2);
 if(on){c.save();c.globalCompositeOperation='lighter';const lg=c.createRadialGradient(sx,sy,10,sx,sy,330);lg.addColorStop(0,'rgba(255,110,70,.22)');lg.addColorStop(1,'rgba(255,110,70,0)');c.fillStyle=lg;c.fillRect(sx-340,sy-200,680,520);c.restore()}
 // plataforma del taller: rejilla gastada, remaches y franjas de peligro descoloridas
 const px0=110,px1=560;c.fillStyle='#22252c';c.fillRect(px0,LB_GROUND,px1-px0,26);c.fillStyle='#3a3f48';c.fillRect(px0,LB_GROUND,px1-px0,2);
 c.fillStyle='#16181d';c.fillRect(px0,LB_GROUND+26,px1-px0,H-LB_GROUND-26);
 c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=1;for(let x=px0+6;x<px1;x+=9){c.beginPath();c.moveTo(x,LB_GROUND+5);c.lineTo(x,LB_GROUND+22);c.stroke()}
 for(let x=px0+10;x<px1;x+=60){c.fillStyle='#4a4f58';c.beginPath();c.arc(x,LB_GROUND+13,2.2,0,6.283);c.fill()}
 c.save();c.beginPath();c.rect(px0,LB_GROUND+26,140,10);c.clip();for(let x=px0-20;x<px0+160;x+=16){c.fillStyle='rgba(180,130,40,.35)';c.beginPath();c.moveTo(x,LB_GROUND+36);c.lineTo(x+8,LB_GROUND+26);c.lineTo(x+16,LB_GROUND+26);c.lineTo(x+8,LB_GROUND+36);c.fill()}c.restore();
 // cables del taller
 c.strokeStyle='#0c0d10';c.lineWidth=3;c.beginPath();c.moveTo(px0,LB_GROUND+20);c.bezierCurveTo(px0-40,LB_GROUND+40,px0-60,LB_GROUND+10,px0-110,LB_GROUND+30);c.stroke();
 // héroe: cambio con caída y polvo; luz de contorno fría del relámpago y sombra de contacto
 const id=typeof previewC!=='undefined'?previewC:'vanguard',v=CHARS[id],lk=!isUnlocked(id);
 if(L.cid!==id){if(L.cid!==null&&!L.rm){L.land=0;if(typeof navigator!=='undefined'&&navigator.vibrate&&isTouchDevice())try{navigator.vibrate(10)}catch(e){}}L.cid=id}
 const wasAir=L.land<1;L.land=Math.min(1,L.land+dt/.25);const e=1-Math.pow(1-L.land,3),drop=(1-e)*-90;
 if(wasAir&&L.land>=1){for(let i=0;i<14;i++)L.dust.push({x:LB_HX+(Math.random()-.5)*60,y:LB_GROUND-2,vx:(Math.random()-.5)*140,vy:-Math.random()*60,l:.5});S||typeof Snd!=='undefined'&&Snd.play('ui')}
 c.fillStyle='rgba(0,0,0,.55)';c.beginPath();c.ellipse(LB_HX,LB_GROUND+1,46*(.6+.4*e),7,0,0,6.283);c.fill();
 const eq=Save.d.shop.eq,cape=(LOBBY.capes||(LOBBY.capes={}))[id]||(LOBBY.capes[id]={});
 const pose={cid:id,face:1,aim:Math.sin(t*.8)*.12-.08,run:0,moving:0,atk:0,t,cape};
 const hero=(col,dx,alpha,skin)=>{c.save();c.globalAlpha=alpha;c.translate(LB_HX+dx,LB_GROUND+drop);c.scale(LB_SCALE,LB_SCALE);const o=Object.assign({},pose,{col});skin?drawSkinned(c,0,0,o,eq.skin):drawHero(c,0,0,o);c.restore()};
 // reflejo en el charco
 c.save();c.beginPath();c.ellipse(LB_HX+30,LB_GROUND+14,120,9,0,0,6.283);c.clip();c.fillStyle='rgba(12,14,18,.9)';c.fillRect(LB_HX-100,LB_GROUND+4,260,22);
 c.translate(0,2*LB_GROUND+20);c.scale(1,-1);hero(lk?'#15171c':v.color,0,.22,false);c.restore();
 hero('#cfe0ff',-2.2,lk?.35:.35+fl*.6,false);  // contorno frío
 hero(lk?'#0d0e12':v.color,0,1,!lk);
 if(L.land<.6&&!L.rm){c.save();c.globalAlpha=.5*(1-L.land/.6);for(let i=0;i<3;i++){c.fillStyle=i%2?'#cfe0ff':'#ff7a52';c.fillRect(LB_HX-40+Math.random()*10,LB_GROUND+drop-150+i*45,80,3)}c.restore()}
 for(const d of L.dust){d.l-=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.vy+=200*dt;c.fillStyle=`rgba(120,115,105,${Math.max(0,d.l)})`;c.fillRect(d.x,d.y,3,3)}L.dust=L.dust.filter(d=>d.l>0);
 c.restore();
 // lluvia (detrás del cristal) y gotas desenfocadas en primer plano
 c.strokeStyle='rgba(170,185,205,.22)';c.lineWidth=1;c.beginPath();for(const r of sk.rain){if(!L.rm){r.y+=r.v*dt*620;r.x-=dt*90;if(r.y>H){r.y=-20;r.x=Math.random()*(W+100)}if(r.x<-20)r.x+=W+40}c.moveTo(r.x,r.y);c.lineTo(r.x-4,r.y+13)}c.stroke();
 for(const d of sk.drops){if(!L.rm){d.y+=d.v*dt;if(d.y>H+20){d.y=-20;d.x=Math.random()*W}}const rg=c.createRadialGradient(d.x-d.r*.3,d.y-d.r*.3,1,d.x,d.y,d.r);rg.addColorStop(0,'rgba(220,230,240,.10)');rg.addColorStop(.7,'rgba(160,175,190,.05)');rg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=rg;c.beginPath();c.arc(d.x,d.y,d.r,0,6.283);c.fill()}
 // cable colgando en primer plano (esquina superior izquierda, desenfocado por tamaño)
 c.strokeStyle='#07080a';c.lineWidth=9;c.beginPath();c.moveTo(-20,92);c.bezierCurveTo(70,150+Math.sin(t*.7)*4,170,120,260,-10);c.stroke();
 c.strokeStyle='rgba(90,95,105,.35)';c.lineWidth=1.5;c.beginPath();c.moveTo(-20,88);c.bezierCurveTo(70,146+Math.sin(t*.7)*4,170,116,258,-14);c.stroke();
 // viñeta y grano
 const vg=c.createRadialGradient(W*.4,H*.55,H*.35,W*.5,H*.5,H*.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');c.fillStyle=vg;c.fillRect(0,0,W,H);
 if(LOBBY.grain){c.save();c.globalAlpha=.05;c.fillStyle=LOBBY.grain;c.translate((Math.random()*128)|0,(Math.random()*128)|0);c.fillRect(-128,-128,W+256,H+256);c.restore()}
}
/* retratos de la tira inferior: busto del héroe dibujado con su propio renderizador */
function drawPortraits(){document.querySelectorAll&&document.querySelectorAll('#fams .pt canvas').forEach(k=>{const id=k.parentNode.dataset.k,g=k.getContext&&k.getContext('2d');if(!g)return;
 const lk=!isUnlocked(id);g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,96,96);g.fillStyle='#1a1d23';g.fillRect(0,0,96,96);
 g.save();g.translate(44,132);g.scale(2.6,2.6);drawHero(g,0,0,{cid:id,col:lk?'#0d0e12':CHARS[id].color,face:1,aim:-.1,run:0,moving:0,t:0,cape:{}});g.restore();
 if(lk){g.fillStyle='rgba(10,11,14,.55)';g.fillRect(0,0,96,96)}})}
/* ---------- interfaz del lobby: pestañas, modo, dificultad, reliquia y ENTRAR ---------- */
let lobbyMode='normal';
function lobbyTab(tab){if(tab==='shop'){hide('menu');return openShop()}if(tab==='codex'){hide('menu');return openCodex()}
 document.querySelectorAll&&document.querySelectorAll('#ltabs .ltab').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
 $('paneHeroes').style.display=tab==='heroes'?'':'none';$('paneArsenal').style.display=tab==='arsenal'?'':'none';LOBBY.camT=tab==='arsenal'?60:0}
function lobbyRefresh(){if(!$('relicSlot'))return;const R=Save.d.settings.relic&&RELICS[Save.d.settings.relic];
 $('relicSlot').innerHTML=`<small>Reliquia</small>${R?esc(R.name):'Ninguna'}`;$('lGems').textContent=`💎 ${Save.d.shop.gems.toLocaleString('es')}`;
 document.querySelectorAll&&document.querySelectorAll('#modes [data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m===lobbyMode))}
if($('ltabs')){
 $('ltabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(!b)return;lobbyTab(b.dataset.tab);Snd.play('ui')};
 $('modes').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;lobbyMode=b.dataset.m;lobbyRefresh();Snd.play('ui')};
 $('diffBtn').onclick=e=>{e.stopPropagation();const p=$('diffPop');p.style.display=p.style.display==='none'?'block':'none';Snd.play('ui')};
 $('relicSlot').onclick=()=>{lobbyTab('arsenal');Snd.play('ui')};
 $('lRank').onclick=()=>openRank(selD);$('lOpts').onclick=()=>openOpts('menu');$('lCtrls').onclick=()=>openCtrls('menu');
 // ENTRAR: una carga corta y se juega (sin carga si se pidió reducir movimiento)
 $('go').onclick=()=>{const b=$('go');if(b.classList.contains('charging'))return;const go=()=>{b.classList.remove('charging');MODE_NEXT=lobbyMode==='normal'?null:lobbyMode;start(selC,selD)};
  if(LOBBY.rm||typeof setTimeout!=='function')return go();b.classList.add('charging');Snd.play('tp');LOBBY.flash=1;setTimeout(go,300)};
 if(typeof addEventListener==='function')addEventListener('pointerdown',e=>{const p=$('diffPop');if(p&&p.style.display!=='none'&&!e.target.closest('.ddw'))p.style.display='none'});
 const who=$('who');if(who&&$('lside')&&$('lside').prepend)$('lside').prepend(who);
 // deslizar sobre la escena cambia de héroe
 let sx0=null;$('paneHeroes').addEventListener&&$('paneHeroes').addEventListener('pointerdown',e=>{if(e.target===$('paneHeroes'))sx0=e.clientX});
 typeof addEventListener==='function'&&addEventListener('pointerup',e=>{if(sx0===null)return;const dx=e.clientX-sx0;sx0=null;if(Math.abs(dx)<50)return;menuPress(dx<0?'right':'left')})}
{const _bm=buildMenu;buildMenu=function(){_bm();lobbyRefresh()}}

// primera construcción con todo cargado (retratos, ranura de reliquia y cristales)
if(typeof addEventListener==='function')addEventListener('DOMContentLoaded',()=>{if($('menu').style.display!=='none')buildMenu()});
