'use strict';
/* ===================== COMBATE: parry, ejecuciones, combos aéreos, sobrecarga, ataques contextuales y heridas =====================
   - PARRY (tecla propia): ventana de 0,2 s. Si un golpe llega dentro, se anula, devuelve el proyectil, cura una herida, carga
     sobrecarga y desata la respuesta de la familia del héroe (PARRY_FAM).
   - EJECUCIÓN (Interactuar junto a un enemigo debilitado): lo remata con recompensa (vida, oro, energía, invulnerabilidad breve).
   - COMBO: golpes encadenados (menos de 1,4 s entre ellos) suben un multiplicador de daño; en el aire cuentan doble y mantienen
     suspendidos a los enemigos (malabares). Recibir daño lo rompe.
   - SOBRECARGA: habilidades, parries, ejecuciones e hitos de combo cargan energía; al 100% se activa sola: 6 s de habilidades
     potenciadas y después agotamiento (sin secundaria ni movimiento 3,5 s y −20% de velocidad).
   - CONTEXTO: golpes en el aire, desde arriba, justo tras un movimiento o contra un enemigo aturdido hacen más daño.
   - HERIDAS: algunos enemigos y jefes dejan heridas temporales (fractura, infección, interferencia, desgarro). */
const PARRY_WIN=.2,PARRY_CD=1.1,COMBO_WIN=1.4,EXEC_R=85;
const cmb=()=>S.p.cmb||(S.p.cmb={parryT:0,parryCd:0,energy:0,combo:0,comboT:0,best:0,dashT:0,flash:0});
const executable=e=>!e.dead&&!e.boss&&!e.hidden&&!e.d.structure&&e.hp>0&&e.hp<e.maxHp*(e.elite?.15:.22);
function execTarget(){const p=S.p;let b=null,bd=EXEC_R;for(const e of S.en)if(executable(e)){const d=hyp(e.x-p.x,(e.y-e.h/2)-(p.y-p.h/2));if(d<bd){bd=d;b=e}}return b}

/* ---------- parry ---------- */
// respuesta distinta por familia (idea 11): cada una refuerza la identidad de sus personajes
const PARRY_FAM={
 'Vanguardia':{name:'CONTRAATAQUE',col:'#ff6a3c',fx(p){for(const e of inR(p.x+p.face*50,p.y-20,140)){hurtE(e,ib()*5,{proc:1});stunE(e,1.2)}ring(p.x+p.face*50,p.y-20,140,'#ff6a3c',.3)}},
 'Artillería':{name:'DEVOLUCIÓN',col:'#ffd23c',fx(p){for(let i=0;i<PR.n;i++){const q=PR.a[i];if(q.hostile&&hyp(q.x-p.x,q.y-(p.y-p.h/2))<240)reflectProj(q)}}},
 'Invocadores':{name:'GUARDIA INVOCADA',col:'#4cff9a',fx(p){for(let i=0;i<2;i++)S.dr.push({k:'orbit',sw:1,perm:1,a:i*Math.PI,life:7,cd:0,dmg:9,x:p.x,y:p.y-20})}},
 'Tiempo/Espacio':{name:'DISTORSIÓN',col:'#3cf0ff',fx(p){for(const e of S.en)if(!e.dead&&hyp(e.x-p.x,e.y-p.y)<300)e.slowT=Math.max(e.slowT,2.5);ring(p.x,p.y-20,300,'#3cf0ff',.4)}},
 'Malditos/Híbridos':{name:'ABSORCIÓN',col:'#ff1f4b',fx(p){heal(p.maxHp*.12);buff('c_absorb',4,{dmg:1.3})}}};
// devuelve un proyectil enemigo convertido en uno propio (el doble de daño, busca enemigos)
function reflectProj(q){q.hostile=0;q.vx*=-1.4;q.vy*=-1;q.dmg*=2;q.home=1;q.col='#ffffff';q.life=Math.max(q.life,2);q.homeP=0;q.hit.clear()}
function tryParry(){const C=cmb(),p=S.p;if(C.parryCd>0||S.st!=='play')return;C.parryT=PARRY_WIN;C.parryCd=PARRY_CD;p.atk=1;
 ring(p.x,p.y-20,34,'#ffffff',.15);Snd.play('dash')}
// lo llama hurtP antes de aplicar el daño; true = golpe anulado
function combatParry(d,src,proj){const C=cmb(),p=S.p;if(!(C.parryT>0))return false;
 C.parryT=0;C.parryCd=.35;C.flash=1;p.inv=Math.max(p.inv,.4);hitStop(55);chromaHit(.5);S.shake=Math.max(S.shake,8);
 if(proj&&proj.hostile)reflectProj(proj);
 const F=PARRY_FAM[S.ch.fam]||PARRY_FAM.Vanguardia;F.fx(p,src);txt(p.x,p.y-64,'¡PARRY! '+F.name,F.col,16);burst(p.x,p.y-20,18,'#fff',380,3);
 const w=Object.keys(p.buf).find(k=>k.startsWith('w_'));if(w){p.buf[w].t=0;txt(p.x,p.y-82,'HERIDA CURADA','#4cff9a',11)}
 addEnergy(25);Snd.play('guard');Save.add('parries');Ev.emit('onParry',src);return true}

/* ---------- ejecuciones ---------- */
function execute(e){const p=S.p,C=cmb();p.x=clamp(e.x-p.face*28,p.w/2,WORLD-p.w/2);p.inv=Math.max(p.inv,.6);
 hitStop(80);chromaHit(.6);S.shake=Math.max(S.shake,10);burst(e.x,e.y-e.h/2,26,'#ff2a6a',460,4);txt(e.x,e.y-e.h-24,'EJECUCIÓN','#ff2a6a',18);
 p.gold+=goldFor(e);heal(p.maxHp*.05);addEnergy(20);C.combo+=3;C.comboT=COMBO_WIN;e.sh=0;
 hurtE(e,e.hp*10+1e3,{raw:1,proc:1,exec:1});Ev.emit('onExecute',e);Save.add('execs');Snd.play('elite')}

/* ---------- combos y contexto ---------- */
// multiplicador de daño del golpe: combo + circunstancias (solo golpes directos, no daño de objetos ni en el tiempo)
function combatMul(e,o){if(o.proc||o.dot)return 1;const p=S.p,C=cmb();let k=1+Math.min(.3,C.combo*.01);
 if(!p.ground){k*=1.15;if(p.y<e.y-e.h-30){k*=1.15;flagE(e,'DESDE ARRIBA','#ffd23c')}}
 if(C.dashT>0){k*=1.3;flagE(e,'CONTRAGOLPE','#ff8a3c')}
 if(e.stunT>0&&!e.boss){k*=1.25;flagE(e,'VULNERABLE','#ff3c6a')}
 if(Save.d.codex&&Save.d.codex[e.type])k*=1.1;  // investigado en una terminal
 return k}
function comboHit(e,o){if(o.proc||o.dot)return;const p=S.p,C=cmb(),air=!p.ground;C.combo+=air?2:1;C.comboT=COMBO_WIN;
 if(C.combo>C.best){C.best=C.combo;Save.max('bestCombo',C.combo)}
 if(Math.floor(C.combo/10)>Math.floor((C.combo-(air?2:1))/10)){addEnergy(10);txt(p.x,p.y-74,`COMBO ×${C.combo}`,'#ffd23c',15)}
 // malabares: golpeado desde el aire, un enemigo terrestre pequeño queda suspendido
 if(air&&!e.boss&&!isFlyer(e.d)&&e.w<50&&!e.dead){e.vy=Math.min(e.vy,-300);e.gm=.35;e.juggle=.6}}

/* ---------- sobrecarga ---------- */
function addEnergy(n){const C=cmb(),p=S.p;n*=REL().energy||1;if(p.buf.sobrecarga||p.buf.agotamiento)return;C.energy=Math.min(100,C.energy+n);
 if(C.energy<100)return;C.energy=0;Snd.play('ult');say('⚡ ¡SOBRECARGA! Habilidades potenciadas 6 s');chromaHit(.8);
 buff('sobrecarga',6,{dmg:1.25,cdm:.5,draw(){glow('#ffd23c',20);c.strokeStyle='#ffd23c';c.globalAlpha=.6+.3*Math.sin(S.t*20);c.lineWidth=2.5;
   c.beginPath();c.arc(p.x,p.y-p.h/2,26+Math.sin(S.t*14)*3,0,6.283);c.stroke();c.globalAlpha=1;c.shadowBlur=0},
  end(){if(!S||S.p!==p)return;const ex=3.5*(REL().exhaust||1);buff('agotamiento',ex,{spd:.8});p.cd.s=Math.max(p.cd.s,ex);p.cd.m=Math.max(p.cd.m,ex);say('Agotamiento: sin secundaria ni movimiento 3,5 s')}})}

/* ---------- heridas ---------- */
const WOUNDS={fractura:{name:'Fractura',col:'#c8a070',desc:'−25% velocidad',o:{spd:.75}},
 infeccion:{name:'Infección',col:'#7dff3c',desc:'sin regeneración y −50% curación',o:{healm:.5,noregen:1}},
 interferencia:{name:'Interferencia',col:'#b070ff',desc:'+30% enfriamientos',o:{cdm:1.3}},
 desgarro:{name:'Desgarro',col:'#ff3c5a',desc:'pierdes 1,5% de vida por segundo',o:{drain:.015}}};
const WOUND_BY={brute:'fractura',golem:'fractura',tank:'fractura',spitter:'infeccion',splitter:'infeccion',splitlet:'infeccion',
 shaman:'interferencia',hunter:'desgarro',shade:'desgarro',phantom:'interferencia',wisp:'interferencia',crawler:'desgarro',leaper:'desgarro',swarm:'desgarro',sniper:'desgarro',
 prisma:'interferencia',hydra:'infeccion',queen:'interferencia',leviathan:'fractura',archon:'desgarro',herald:'interferencia'};
// lo llama hurtP tras recibir daño: rompe el combo y quizá deja una herida (máx. 3 distintas)
function combatHurt(d,src){const C=cmb(),p=S.p;C.combo=0;C.comboT=0;if(!src)return;
 const k=WOUND_BY[src.boss?src.bid:src.type];if(!k||!chance(src.boss?.4:.3))return;
 const n=Object.keys(p.buf).filter(x=>x.startsWith('w_')).length;if(n>=3&&!p.buf['w_'+k])return;
 const W=WOUNDS[k];buff('w_'+k,5,Object.assign({},W.o));txt(p.x,p.y-80,`HERIDA: ${W.name.toUpperCase()}`,W.col,12)}

/* ---------- ciclo, eventos y dibujo ---------- */
function combatInit(){Ev.on('onHit',(e,d,o)=>comboHit(e,o||NOOPT));Ev.on('onDash',()=>{cmb().dashT=1});
 Ev.on('onCast',slot=>addEnergy({s:6,m:4,u:18}[slot]||0))}
function updCombat(dt){const C=cmb();if(C.parryT>0)C.parryT-=dt;if(C.parryCd>0)C.parryCd-=dt;if(C.dashT>0)C.dashT-=dt;C.flash=Math.max(0,C.flash-dt*2);
 if(C.comboT>0){C.comboT-=dt;if(C.comboT<=0)C.combo=0}
 for(const e of S.en)if(e.juggle>0){e.juggle-=dt;if(e.juggle<=0)e.gm=undefined}}
// en el mundo: ventana de parry, marca de ejecutable y aviso del objetivo
function drawCombatWorld(){const p=S.p,C=cmb();
 if(C.parryT>0){c.strokeStyle='#ffffff';c.globalAlpha=C.parryT/PARRY_WIN;c.lineWidth=3;c.beginPath();c.arc(p.x,p.y-p.h/2,30,0,6.283);c.stroke();c.globalAlpha=1}
 const tg=execTarget();
 for(const e of S.en)if(executable(e)){const y=e.y-e.h-12,pulse=.6+.4*Math.sin(S.t*10);c.fillStyle='#ff2a6a';c.globalAlpha=pulse;
  c.beginPath();c.moveTo(e.x,y-7);c.lineTo(e.x+6,y);c.lineTo(e.x,y+7);c.lineTo(e.x-6,y);c.closePath();c.fill();c.globalAlpha=1;
  if(e===tg){c.font='bold 11px monospace';c.textAlign='center';c.fillStyle='#fff';c.fillText(`[${keyName(BIND.interact[0])}] EJECUTAR`,e.x,y-12)}}}
// en pantalla: combo, barra de sobrecarga sobre las habilidades, heridas sobre la vida
function drawCombatHud(){const p=S.p,C=cmb();
 if(C.combo>=3){const a=Math.min(1,C.comboT/COMBO_WIN*1.5),sz=18+Math.min(14,C.combo*.3);c.globalAlpha=a;c.textAlign='right';
  c.font=`bold ${sz|0}px monospace`;c.fillStyle=C.combo>=25?'#ff3cf2':C.combo>=10?'#ffd23c':'#fff';c.fillText(`×${C.combo}`,W-20,H*.42);
  c.font='bold 10px monospace';c.fillStyle='#9a93c8';c.fillText(`COMBO +${Math.min(30,C.combo)}% daño`,W-20,H*.42+14);c.globalAlpha=1}
 const ov=p.buf.sobrecarga,ex=p.buf.agotamiento,x=W/2-74,y=H-49,w=148;
 gbar(x,y,w,5,ov?ov.t/6:ex?1-ex.t/3.5:C.energy/100,ov?'#ffd23c':ex?'#555':'#3cf0ff',ov?'#fff':'#bff4ff',!!ov);
 c.textAlign='center';c.font='bold 8px monospace';c.fillStyle=ov?'#ffd23c':ex?'#888':'#9a93c8';c.fillText(ov?'SOBRECARGA':ex?'AGOTADO':'ENERGÍA',W/2,y-2);
 const pc=C.parryCd>0?1-C.parryCd/PARRY_CD:1;c.fillStyle=pc>=1?'#fff':'#555';c.textAlign='left';c.fillText(pc>=1?'⛨ PARRY':'⛨ ···',x+w+8,y+5);
 let wx=16;for(const k in WOUNDS){const b=p.buf['w_'+k];if(!b)continue;const W2=WOUNDS[k];c.fillStyle=W2.col;c.globalAlpha=.85;c.font='bold 9px monospace';c.textAlign='left';
  c.fillText(`✚ ${W2.name} ${Math.ceil(b.t)}s`,wx,H-60);wx+=c.measureText(`✚ ${W2.name} ${Math.ceil(b.t)}s`).width+12;c.globalAlpha=1}}
