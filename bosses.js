'use strict';
/* ===================== JEFES ===================== */

/* Arena del Coloso. Plataformas: ph=[faseMin,faseMax] en que existen; sp/ax/ay = movimiento.
   shortcut: arena única global; en la Fase 3 pasa a data_stages.js por escenario. */
const PLAT=[
 {x:0,y:FLOOR,w:WORLD,h:60,ph:[1,3],solid:1},
 {x:300,y:390,w:200,h:12,ph:[1,3]},{x:1900,y:390,w:200,h:12,ph:[1,3]},
 {x:1100,y:300,w:200,h:12,ph:[1,1]},{x:700,y:330,w:240,h:12,ph:[1,1]},{x:1460,y:330,w:240,h:12,ph:[1,1]},
 {x:780,y:290,w:120,h:12,ph:[2,3]},{x:1500,y:290,w:120,h:12,ph:[2,3]},{x:1140,y:200,w:120,h:12,ph:[2,2]},
 {x:1000,y:330,w:130,h:12,ph:[3,3],sp:1.1,ax:180,ay:0},{x:1270,y:250,w:130,h:12,ph:[3,3],sp:1.3,ax:0,ay:70}
];

const BOSSES={
 prisma:{name:'Coloso Prisma',hp:2600,stagMax:260,dmg:30,xp:400,color:'#ff3cf2',w:110,h:110,
  phaseMsg:{2:'¡FASE 2! La arena se fragmenta…',3:'¡FASE 3! Plataformas inestables · el Coloso invoca refuerzos'},
  ai:prismaAI,draw:prismaDraw}
};

function spawnBoss(id){
 const def=BOSSES[id||'prisma'],hp=def.hp*hpScale();
 const b={type:'boss',boss:1,def,d:def,x:WORLD/2,y:250,w:def.w,h:def.h,vx:0,vy:0,hp,maxHp:hp,stag:0,stagMax:def.stagMax,stun:0,t:2,ph:1,flash:0,slowT:0,aff:[],ang:0};
 S.boss=b;S.en.push(b);say(`¡EL ${def.name.toUpperCase()} HA DESPERTADO!`);S.shake=22;
}

function prismaAI(b,dt){
 const p=S.p,s=S;
 if(b.stun>0){b.stun-=dt;b.y+=(330-b.y)*dt*3;return}
 b.x+=(WORLD/2+Math.sin(s.t*.35)*620-b.x)*dt*.9;b.y+=(250+Math.sin(s.t*1.1)*25-b.y)*dt*2.5;b.ang+=dt*(1+b.ph);
 b.t-=dt;if(b.t>0)return;
 const f=[0,1,.82,.65][b.ph],dm=dmgScale();
 const pool=['slam','ring'].concat(b.ph>1?['beam']:[],b.ph>2?['summon','slam']:[]);
 const a=pool[Math.floor(Math.random()*pool.length)];b.t=(a==='beam'?2.8:2.3)*f+.5;
 const py=p.y-p.h/2;
 if(a==='slam')(b.ph>2?[p.x-240,p.x,p.x+240]:[p.x]).forEach(x=>Z({x,y:FLOOR,r:105,warn:1.1*f+.3,dmg:30*dm,hostile:1,col:'#ff2a4a'}));
 if(a==='ring'){Z({x:b.x,y:b.y-55,r:85,warn:.8,hostile:1,col:'#ffb13c'});const n=b.ph>1?18:12,off=R(0,6);
  s.sch.push({t:.8,en:1,f:()=>{for(let i=0;i<n;i++)shootP(b.x,b.y-55,off+i*6.283/n,290+b.ph*40,16*dm,8);s.shake=Math.max(s.shake,6)}})}
 if(a==='beam')Z({x:0,y:py-22,rw:WORLD,rh:44,warn:1.3*f+.2,dmg:34*dm,hostile:1,col:'#ff2a4a'});
 if(a==='summon')for(let i=0;i<3;i++)s.sch.push({t:.4*i,en:1,f:()=>spawnEnemy('wisp',b.x+R(-120,120),b.y-60,1)});
}

function prismaDraw(e){
 const cx=e.x,cy=e.y-e.h/2;
 c.save();c.translate(cx,cy);
 for(let i=0;i<3;i++){c.save();c.rotate(e.ang*(i%2?-1:1)+i);c.strokeStyle=['#ff3cf2','#3cf0ff','#ffd23c'][i];c.lineWidth=5;c.beginPath();
  for(let k=0;k<6;k++){const a=k*1.047;c.lineTo(Math.cos(a)*(62-i*10),Math.sin(a)*(62-i*10))}c.closePath();c.stroke();c.restore()}
 c.fillStyle=e.flash>0?'#fff':'#ff3cf2';c.beginPath();c.arc(0,0,26,0,6.283);c.fill();c.shadowBlur=0;c.fillStyle='#000';c.fillRect(-14,-4,28,8);
 c.fillStyle=e.stun>0?'#ffd23c':'#f33';c.fillRect(-4+Math.sin(S.t*3)*8,-3,8,6);c.restore();
 if(e.stun>0){c.fillStyle='#ffd23c';c.font='bold 16px monospace';c.textAlign='center';c.fillText('★ ATURDIDO ★',cx,cy-80)}
}
