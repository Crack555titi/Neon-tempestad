'use strict';
/* ===================== TIENDA DE COSMÉTICOS =====================
   Cristales (💎): se ganan al terminar cada partida según la puntuación y se gastan en cosméticos puramente visuales:
   skins (color del héroe), estelas (rastro al moverse) y auras (efecto alrededor del héroe).
   Lo comprado y lo equipado se guarda en Save.d.shop (en este dispositivo). Todo se dibuja por código. */
const COSMETICS={
 skin:[{id:'',name:'Original',price:0,desc:'El color propio de cada héroe.'},
  {id:'oro',name:'Oro Pulido',price:300,col:'#ffd23c',desc:'Brillo de campeón.'},
  {id:'obsidiana',name:'Obsidiana',price:300,col:'#5a4a9a',desc:'Piedra volcánica con reflejos violeta.'},
  {id:'hielo',name:'Hielo Cuántico',price:400,col:'#bff4ff',desc:'Frío como el vacío.'},
  {id:'toxico',name:'Tóxico',price:400,col:'#7dff3c',desc:'Radiactivo y orgulloso.'},
  {id:'carmesi',name:'Carmesí',price:400,col:'#e0103a',desc:'Del color de la última batalla.'},
  {id:'holo',name:'Holograma',price:900,col:'#3cf0ff',fx:'holo',desc:'Proyección que parpadea.'},
  {id:'glitch',name:'Glitch',price:1000,fx:'glitch',desc:'Separación de canales RGB.'},
  {id:'prisma',name:'Prisma',price:1200,fx:'prisma',desc:'Recorre todo el arcoíris.'}],
 trail:[{id:'',name:'Sin estela',price:0,desc:'Nada detrás de ti.'},
  {id:'neon',name:'Neón',price:200,desc:'Una cinta de luz de tu color.'},
  {id:'fuego',name:'Fuego',price:350,desc:'Dejas brasas al correr.'},
  {id:'estrellas',name:'Polvo Estelar',price:400,desc:'Destellos que titilan.'},
  {id:'pixel',name:'Píxeles',price:450,desc:'Bloques que caen.'},
  {id:'sombra',name:'Sombra',price:700,desc:'Tus siluetas te persiguen.'},
  {id:'arcoiris',name:'Arcoíris',price:800,desc:'La estela de todos los colores.'}],
 aura:[{id:'',name:'Sin aura',price:0,desc:'Nada alrededor.'},
  {id:'orbes',name:'Orbes',price:300,desc:'Tres luces en órbita.'},
  {id:'llamas',name:'Halo de Llamas',price:500,desc:'Fuego a tus pies.'},
  {id:'corona',name:'Corona',price:600,desc:'Para quien manda en el ranking.'},
  {id:'rayos',name:'Electricidad',price:650,desc:'Chispazos a tu alrededor.'},
  {id:'alas',name:'Alas de Luz',price:1000,desc:'Alas que laten a tu espalda.'}]};
const COS_CAT={skin:'Skins',trail:'Estelas',aura:'Auras'};
const cosItem=(cat,id)=>COSMETICS[cat].find(c=>c.id===id)||COSMETICS[cat][0];
const shopData=()=>Save.d.shop;
const equipped=cat=>shopData().eq[cat]||'';

/* ---------- dibujo (juego, tienda y pantalla de inicio) ---------- */
// color del héroe con la skin aplicada
function skinColor(id,base,t){const s=cosItem('skin',id);return s.fx==='prisma'?`hsl(${(t*90)%360},100%,62%)`:s.col||base}
// dibuja el héroe con la skin: el holograma parpadea y el glitch separa canales
function drawSkinned(g,x,y,o,skin){const s=cosItem('skin',skin),t=o.t;o.col=skinColor(skin,o.col,t);
 if(s.fx==='glitch'&&!o.ghost){const j=Math.sin(t*37)>.55?4:1.5;g.save();g.globalAlpha*=.45;
  drawHero(g,x-j,y,Object.assign({},o,{col:'#ff3c6a',cape:null}));drawHero(g,x+j,y,Object.assign({},o,{col:'#3cf0ff',cape:null}));g.restore()}
 if(s.fx==='holo'){g.save();g.globalAlpha*=.55+.3*Math.abs(Math.sin(t*9))}
 drawHero(g,x,y,o);if(s.fx==='holo')g.restore()}
// estela: pts = [{x,y,a}] del más nuevo (a=0) al más viejo (a≈1)
function drawTrail(g,id,pts,col,t){if(!id||pts.length<2)return;g.save();g.lineCap='round';
 if(id==='neon'||id==='arcoiris'){g.globalCompositeOperation='lighter';
  for(let i=0;i<pts.length-1;i++){const p=pts[i],q=pts[i+1];g.globalAlpha=(1-p.a)*.8;g.lineWidth=Math.max(1,8*(1-p.a));
   g.strokeStyle=id==='neon'?col:`hsl(${(i*22+t*240)%360},100%,60%)`;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.stroke()}}
 else for(let i=0;i<pts.length;i+=id==='sombra'?4:2){const p=pts[i],k=1-p.a;if(k<=0)continue;g.globalAlpha=k;
  if(id==='fuego'){g.globalCompositeOperation='lighter';g.fillStyle=p.a<.4?'#ffd23c':'#ff5a1a';g.beginPath();g.arc(p.x+Math.sin(t*20+i)*2,p.y-p.a*20,2+5*k,0,TAU);g.fill()}
  if(id==='estrellas'){const s=(1.5+3*k)*(.6+.4*Math.abs(Math.sin(t*12+i)));g.fillStyle=i%4?'#fff':col;g.beginPath();
   for(let k2=0;k2<8;k2++){const r=k2%2?s*.35:s,a=k2*Math.PI/4;g.lineTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r)}g.fill()}
  if(id==='pixel'){const s=2+4*k;g.fillStyle=i%4?'#ff3cf2':'#3cf0ff';g.fillRect(p.x-s/2,p.y+p.a*16-s/2,s,s)}
  if(id==='sombra'){g.globalAlpha=k*.45;g.fillStyle='#120a26';rr(g,p.x-8,p.y-14,16,30,7);g.fill();g.beginPath();g.arc(p.x,p.y-20,7,0,TAU);g.fill()}}
 g.restore()}
// aura alrededor del héroe; las alas van detrás (back=true), el resto delante
function drawAura(g,id,x,y,t,col,back){if(!id||(id==='alas')!==!!back)return;g.save();
 if(id==='orbes')for(let i=0;i<3;i++){const a=t*2.4+i*TAU/3;g.fillStyle=col;if(QL.glow){g.shadowColor=col;g.shadowBlur=10}g.beginPath();g.arc(x+Math.cos(a)*24,y-24+Math.sin(a)*9,3.2,0,TAU);g.fill()}
 if(id==='llamas'){g.globalCompositeOperation='lighter';for(let i=0;i<9;i++){const a=i/9*TAU,fx=x+Math.cos(a)*16,h=8+6*Math.abs(Math.sin(t*9+i*1.7));
  g.fillStyle=i%2?'#ffd23c':'#ff5a1a';g.globalAlpha=.75;g.beginPath();g.moveTo(fx-3,y);g.quadraticCurveTo(fx,y-h*1.6,fx+3,y);g.fill()}}
 if(id==='corona'){const cy=y-62+Math.sin(t*3)*2;g.fillStyle='#ffd23c';if(QL.glow){g.shadowColor='#ffd23c';g.shadowBlur=12}g.beginPath();g.moveTo(x-9,cy+6);
  for(const [dx,dy] of [[-9,-4],[-4.5,2],[0,-7],[4.5,2],[9,-4],[9,6]])g.lineTo(x+dx,cy+dy);g.closePath();g.fill();g.fillStyle='#ff3c6a';g.beginPath();g.arc(x,cy+2,1.6,0,TAU);g.fill()}
 if(id==='rayos'&&Math.sin(t*19)>.2){g.strokeStyle='#bff4ff';g.lineWidth=1.4;if(QL.glow){g.shadowColor='#3cf0ff';g.shadowBlur=8}
  for(let k=0;k<2;k++){const a=t*7+k*Math.PI;let px=x+Math.cos(a)*14,py=y-24+Math.sin(a)*20;g.beginPath();g.moveTo(px,py);
   for(let i=0;i<4;i++){px+=Math.cos(a)*6+Math.sin(t*50+i)*5;py+=Math.sin(a)*6+Math.cos(t*43+i)*5;g.lineTo(px,py)}g.stroke()}}
 if(id==='alas'){const f=Math.sin(t*4)*.25;g.globalCompositeOperation='lighter';g.globalAlpha=.55;
  for(const s of [-1,1]){g.save();g.translate(x+s*3,y-34);g.rotate(s*(.35+f));g.fillStyle=col;g.beginPath();g.moveTo(0,0);
   g.quadraticCurveTo(s*30,-26,s*36,-4);g.quadraticCurveTo(s*24,-6,s*28,8);g.quadraticCurveTo(s*14,2,0,6);g.closePath();g.fill();g.restore()}}
 g.restore()}
// en partida: rastro de posiciones recientes del jugador (0,45 s)
function playerTrail(p,t,moving){const tr=p.trailPts||(p.trailPts=[]);
 if(moving&&(!tr.length||tr[tr.length-1].t<t))tr.push({x:p.x,y:p.y-22,t});while(tr.length&&t-tr[0].t>.45)tr.shift();
 return tr.map(q=>({x:q.x,y:q.y,a:(t-q.t)/.45})).reverse()}

/* ---------- tienda ---------- */
let shopCat='skin',shopSel=null;const shopCape={};
function openShop(){hide('title');show('shop');shopSel=null;buildShop();Snd.play('ui')}
function buildShop(){const sd=shopData(),cat=shopCat;
 $('shopGems').textContent=`💎 ${sd.gems.toLocaleString('es')}`;
 $('shopTabs').innerHTML=Object.keys(COS_CAT).map(k=>`<button class="sec tab${k===cat?' on':''}" data-c="${k}">${COS_CAT[k]}</button>`).join('');
 $('shopGrid').innerHTML=COSMETICS[cat].map(c=>{const own=!c.price||sd.own[cat+':'+c.id],eq=equipped(cat)===c.id,sel=(shopSel===null?equipped(cat):shopSel)===c.id;
  return `<div class="sitem${sel?' sel':''}${eq?' eq':''}" data-id="${c.id}"><b>${esc(c.name)}</b><span>${eq?'✔ EQUIPADO':!c.price?'GRATIS':own?'COMPRADO':`💎 ${c.price}`}</span></div>`}).join('');
 const c=cosItem(cat,shopSel===null?equipped(cat):shopSel),own=!c.price||sd.own[cat+':'+c.id];
 $('shopName').textContent=c.name;$('shopDesc').textContent=c.desc;
 const b=$('shopBuy');b.disabled=false;
 if(equipped(cat)===c.id){b.textContent='EQUIPADO';b.disabled=true}else if(own)b.textContent='EQUIPAR';
 else{b.textContent=`COMPRAR · 💎 ${c.price}`;b.disabled=sd.gems<c.price}
 $('shopHint').textContent=!own&&sd.gems<c.price?`Te faltan 💎 ${c.price-sd.gems}. Ganas cristales al terminar cada partida.`:''}
// compra (si hace falta) y equipa el cosmético seleccionado
function buyOrEquip(cat,id){const sd=shopData(),c=cosItem(cat,id),key=cat+':'+c.id;
 if(c.price&&!sd.own[key]){if(sd.gems<c.price)return false;sd.gems-=c.price;sd.own[key]=1;Snd.play('chest')}else Snd.play('ui');
 sd.eq[cat]=c.id;Save.write();return true}
$('shopTabs').onclick=e=>{const b=e.target.closest('.tab');if(b){shopCat=b.dataset.c;shopSel=null;buildShop();Snd.play('ui')}};
$('shopGrid').onclick=e=>{const it=e.target.closest('.sitem');if(it){shopSel=it.dataset.id;buildShop();Snd.play('ui')}};
$('shopBuy').onclick=()=>{buyOrEquip(shopCat,shopSel===null?equipped(shopCat):shopSel);buildShop()};
$('shopBack').onclick=()=>{hide('shop');goHome()};
// vista previa animada: el héroe elegido corre con lo equipado + lo que se está mirando
function drawShopPreview(t){const k=$('shopPrev');if(!k||!k.getContext||$('shop').style.display==='none')return;const g=k.getContext('2d');if(!g)return;
 const pick=cat=>shopCat===cat&&shopSel!==null?shopSel:equipped(cat),W2=k.width,H2=k.height,cx=W2/2,gy=H2-30,base=CHARS[selC].color;
 g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W2,H2);g.fillStyle='#3a3f48';g.fillRect(0,gy,W2,2);
 g.save();g.translate(cx,gy);g.scale(2.4,2.4);const col=skinColor(pick('skin'),base,t);
 const pts=Array.from({length:24},(_,i)=>({x:-i*4.5,y:-22+Math.sin(t*10-i*.5)*1.5,a:i/24}));
 drawTrail(g,pick('trail'),pts,col,t);drawAura(g,pick('aura'),0,0,t,col,true);
 drawSkinned(g,0,0,{cid:selC,col:base,face:1,aim:-.2,run:t*10,moving:1,t,cape:shopCape[selC]||(shopCape[selC]={})},pick('skin'));
 drawAura(g,pick('aura'),0,0,t,col,false);g.restore()}
