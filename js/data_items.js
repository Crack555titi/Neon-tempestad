'use strict';
/* ===================== OBJETOS (datos) =====================
   Cada objeto: id, name, r (rareza), col (color del icono), desc, tags (sinergias) y uno o varios efectos:
   - st:{stat:valor}      suma `valor` por acumulación a S.p.m (dmg, as, spd, crit, critm, cdr, ucdr, mcdr, ls, arm, hpf, hpm,
                          regen, shield, oversh, dodge, luck, goldm, xpm, healm, chestm, exec, jumps)
   - on:{evento(n,...)}   gancho del bus de eventos; n = acumulaciones. onHit no salta con daño de objetos (proc) ni de DoT.
   - dm(n,e)              multiplicador de daño contra el enemigo e
   - pick(n)              al recogerlo (n = acumulaciones ya contando este)
   Ayudas: chance(p) aplica suerte; ib() = daño base de objeto (escala con el nivel); boom(x,y,r,daño,color,raw).
   Sinergias diseñadas: sangrado (Garra Oxidada + Granada de Sangre + Colmillo + Petardo), fuego (Cerilla + Gasolina + Estela),
   crítico (Lente + Lupa + Depredador + Cosechadora + Ojo de la Tormenta), salto (Pluma + Tacones + Alas + Dominio Aéreo),
   curación→daño (Núcleo Inverso + Semilla + Sanguijuela), escudo (Generador + Coraza + Placa). */
const RARITY={
 c:{n:'Común',col:'#d8e0ff'},u:{n:'Poco común',col:'#4cff7a'},r:{n:'Raro',col:'#ff4d6d'},
 l:{n:'Legendario',col:'#ffd23c'},m:{n:'Mítico',col:'#ff3cf2'},f:{n:'Fragmentado',col:'#5ab4ff'}
};
const tick=(id,every,n,dt)=>{const s=S.p.ist;s[id]=(s[id]||0)+dt;if(s[id]<every)return false;s[id]=0;return true};

const ITEMS=[
 /* ===================== COMUNES (35) ===================== */
 {id:'sharp',name:'Esquirla Afilada',r:'c',col:'#ff8a8a',desc:'+8% de daño (+8% por acumulación).',st:{dmg:.08}},
 {id:'spring',name:'Muelle Neón',r:'c',col:'#ffd23c',desc:'+10% de velocidad de ataque (+10%).',st:{as:.1}},
 {id:'boots',name:'Botas de Plasma',r:'c',col:'#3cf0ff',desc:'+8% de velocidad de movimiento (+8%).',st:{spd:.08}},
 {id:'lens',name:'Lente Prisma',r:'c',col:'#ffb13c',desc:'+7% de probabilidad de crítico (+7%).',tags:['crítico'],st:{crit:.07}},
 {id:'vial',name:'Vial Esmeralda',r:'c',col:'#4cff7a',desc:'Regeneras un 0,4% de vida por segundo (+0,4%).',tags:['curación'],st:{regen:.004}},
 {id:'plate',name:'Placa Reforzada',r:'c',col:'#c8d2ff',desc:'−5% de daño recibido (+5%; máx. 60% sumando todo).',tags:['escudo'],st:{arm:.05}},
 {id:'core',name:'Núcleo Vital',r:'c',col:'#ff5a7a',desc:'+20 de vida máxima (+20).',st:{hpf:20}},
 {id:'feather',name:'Pluma de Fotón',r:'c',col:'#e0f0ff',desc:'+1 salto en el aire (+1).',tags:['salto'],st:{jumps:1}},
 {id:'coin',name:'Moneda Trucada',r:'c',col:'#ffd23c',desc:'+15% de oro obtenido (+15%).',st:{goldm:.15}},
 {id:'book',name:'Códice Menor',r:'c',col:'#b07aff',desc:'+12% de experiencia (+12%).',st:{xpm:.12}},
 {id:'leech',name:'Sanguijuela Eléctrica',r:'c',col:'#ff3c6a',desc:'+1,5% de robo de vida (+1,5%).',tags:['curación'],st:{ls:.015}},
 {id:'hourglass',name:'Reloj de Arena',r:'c',col:'#e6d0a0',desc:'−5% de enfriamientos (+5%; máx. 60%).',st:{cdr:.05}},
 {id:'claw',name:'Garra Oxidada',r:'c',col:'#c0503c',desc:'10% de prob. al golpear de causar sangrado: 80% del golpe por segundo durante 3 s (+10%).',tags:['sangrado'],
  on:{onHit(n,e,d){if(chance(.1*n))applyDot(e,'bleed',d*.8,3,1)}}},
 {id:'match',name:'Cerilla de Plasma',r:'c',col:'#ff7a1a',desc:'8% de prob. al golpear de quemar: 60% del golpe por segundo durante 3 s (+8%).',tags:['fuego'],
  on:{onHit(n,e,d){if(chance(.08*n))applyDot(e,'burn',d*.6,3,1)}}},
 {id:'firecracker',name:'Petardo Residual',r:'c',col:'#ff9a3c',desc:'Los enemigos explotan al morir (r 80) con 150% de daño base (+150%).',tags:['explosión','sangrado'],
  on:{onKill(n,e){boom(e.x,e.y-e.h/2,80,ib()*1.5*n,'#ff9a3c')}}},
 {id:'medkit',name:'Botiquín de Campaña',r:'c',col:'#ff6a6a',desc:'Al recibir daño, te curas 15 de vida 1,5 s después (+15).',tags:['curación'],
  on:{onTakeDamage(n){S.sch.push({t:1.5,f:()=>{if(S.st==='play')heal(15*n)}})}}},
 {id:'glove',name:'Guante Sísmico',r:'c',col:'#a0a0c0',desc:'5% de prob. al golpear de aturdir 1 s (+5%).',on:{onHit(n,e){if(chance(.05*n))stunE(e,1)}}},
 {id:'battery',name:'Batería de Recarga',r:'c',col:'#4cffd8',desc:'Cada baja reduce 0,2 s el enfriamiento de la secundaria (+0,2 s).',on:{onKill(n){S.p.cd.s-=.2*n}}},
 {id:'amulet',name:'Amuleto de Esquiva',r:'c',col:'#9ae6ff',desc:'4% de prob. de esquivar un golpe (+4%; máx. 50%).',st:{dodge:.04}},
 {id:'spikes',name:'Púas de Retorno',r:'c',col:'#d0d0d0',desc:'Al recibir daño, devuelves el 40% a los enemigos cercanos (+40%).',
  on:{onTakeDamage(n,d){aoe(S.p.x,S.p.y-20,150,d*.4*n,PROCRAW)}}},
 {id:'masterkey',name:'Llave Maestra',r:'c',col:'#ffe08a',desc:'Al abrir un cofre, 12% de prob. de un objeto extra de la misma rareza (+12%).',
  on:{onChestOpen(n,ch){if(ch.got&&chance(.12*n)){giveItem(rollItem(ITEM[ch.got].r));say('¡Llave Maestra: objeto extra!')}}}},
 {id:'warhorn',name:'Cuerno de Guerra',r:'c',col:'#ffb070',desc:'Al usar la definitiva: +30% de velocidad de ataque 4 s (+1 s).',on:{onCast(n,slot){if(slot==='u')buff('i_horn',3+n,{as:1.3})}}},
 {id:'scope',name:'Mira Telescópica',r:'c',col:'#9aff3c',desc:'+15% de daño a enemigos a más de 350 px (+15%).',dm(n,e){return hyp(e.x-S.p.x,e.y-S.p.y)>350?1+.15*n:1}},
 {id:'crowbar',name:'Palanca de Neón',r:'c',col:'#ff6ad5',desc:'+35% de daño a enemigos con más del 90% de vida (+35%).',dm(n,e){return e.hp>e.maxHp*.9?1+.35*n:1}},
 {id:'knuckles',name:'Puño Americano',r:'c',col:'#ff5a3c',desc:'+15% de daño a enemigos a menos de 120 px (+15%).',dm(n,e){return hyp(e.x-S.p.x,e.y-S.p.y)<120?1+.15*n:1}},
 {id:'paperwings',name:'Alas de Papel',r:'c',col:'#f0f0ff',desc:'+12% de daño mientras estás en el aire (+12%).',tags:['salto'],dm(n){return S.p.ground?1:1+.12*n}},
 {id:'heels',name:'Tacones Explosivos',r:'c',col:'#ff7ad9',desc:'Al saltar, explosión bajo tus pies (r 70) con 50% de daño base (+50%).',tags:['salto','explosión'],
  on:{onJump(n){boom(S.p.x,S.p.y,70,ib()*.5*n,'#ff7ad9')}}},
 {id:'trail',name:'Estela Ardiente',r:'c',col:'#ff6a1a',desc:'Tu movimiento deja fuego 3 s que quema con 50% de daño base cada 0,5 s (+50%).',tags:['fuego'],
  on:{onDash(n){const p=S.p;Z({x:p.x,y:p.y-10,r:55,life:3,dot:1,fdmg:ib()*.5*n,col:'#ff6a1a'})}}},
 {id:'dew',name:'Orbe de Rocío',r:'c',col:'#7affc8',desc:'Al matar, 8% de prob. de curarte un 8% de vida (+8%).',tags:['curación'],
  on:{onKill(n){if(chance(.08*n)){heal(S.p.maxHp*.08);ring(S.p.x,S.p.y-20,40,'#7affc8',.3)}}}},
 {id:'shieldgen',name:'Generador de Escudo',r:'c',col:'#5ab4ff',desc:'Escudo del 6% de tu vida (+6%) que se recarga tras 4 s sin recibir daño.',tags:['escudo'],st:{shield:.06}},
 {id:'steak',name:'Filete Sintético',r:'c',col:'#ff8a6a',desc:'Cada baja da +0,5 de vida máxima permanente (máx. 25 por acumulación).',
  on:{onKill(n){const p=S.p;if((p.ist.steak||0)<25*n){p.ist.steak=(p.ist.steak||0)+.5;p.m.hpf+=.5;recalcHp()}}}},
 {id:'medal',name:'Medalla de Valor',r:'c',col:'#ffd23c',desc:'Cuando un jefe cambia de fase: te curas un 25% y +30% de daño 6 s (+2 s).',
  on:{onBossPhase(n){heal(S.p.maxHp*.25);buff('i_medal',4+2*n,{dmg:1.3})}}},
 {id:'chill',name:'Cristal Gélido',r:'c',col:'#bff4ff',desc:'6% de prob. al golpear de ralentizar 2 s (+6%).',on:{onHit(n,e){if(chance(.06*n))e.slowT=2}}},
 {id:'gasoline',name:'Bidón de Gasolina',r:'c',col:'#ff9a00',desc:'Al matar, quemas a los enemigos cercanos (r 120): 80% del daño base por segundo 3 s (+80%).',tags:['fuego'],
  on:{onKill(n,e){for(const t of inR(e.x,e.y-e.h/2,120))applyDot(t,'burn',ib()*.8*n,3);ring(e.x,e.y-e.h/2,120,'#ff9a00',.25)}}},
 {id:'fang',name:'Colmillo Vampírico',r:'c',col:'#ff1f4b',desc:'Al matar te curas 4 de vida (+4).',tags:['curación','sangrado'],on:{onKill(n){heal(4*n)}}},

 /* ===================== POCO COMUNES (25) ===================== */
 {id:'coil',name:'Bobina Saltarina',r:'u',col:'#5ab4ff',desc:'25% de prob. al golpear de lanzar un rayo que salta a 2 enemigos (+2) con 60% del golpe.',tags:['rayo'],
  on:{onHit(n,e,d){if(!chance(.25))return;let f=e;const hit=new Set([e]);
   for(let i=0;i<2*n;i++){const t=nearest(f.x,f.y-f.h/2,250,hit);if(!t)break;bolt(f.x,f.y-f.h/2,t.x,t.y-t.h/2,'#5ab4ff',2);hurtE(t,d*.6,PROCRAW);hit.add(t);f=t}}}},
 {id:'missile',name:'Misil Buscador',r:'u',col:'#ff9a3c',desc:'8% de prob. al golpear de lanzar un misil teledirigido con 200% del golpe (+8%).',tags:['explosión'],
  on:{onHit(n,e,d){if(chance(.08*n)){const p=S.p;fxProj({x:p.x,y:p.y-40,vx:R(-80,80),vy:-500,dmg:d*2,r:5,life:2,home:1,col:'#ff9a3c',raw:1,proc:1})}}}},
 {id:'bloodbomb',name:'Granada de Sangre',r:'u',col:'#c0102c',desc:'Los enemigos que mueren sangrando explotan (r 120) con 300% de daño base y hacen sangrar a los cercanos (+300%).',tags:['sangrado','explosión'],
  on:{onKill(n,e){if(!(e.dots&&e.dots.bleed&&e.dots.bleed.t>0))return;boom(e.x,e.y-e.h/2,120,ib()*3*n,'#c0102c');for(const t of inR(e.x,e.y-e.h/2,120))applyDot(t,'bleed',ib(),3)}}},
 {id:'harvester',name:'Cosechadora',r:'u',col:'#ffb13c',desc:'Las bajas con crítico te curan un 6% de vida (+6%).',tags:['crítico','curación'],on:{onKill(n,e){if(e.lastCrit)heal(S.p.maxHp*.06*n)}}},
 {id:'predator',name:'Instinto Depredador',r:'u',col:'#ff7a3c',desc:'Los críticos dan +12% de velocidad de ataque 3 s (+12%).',tags:['crítico'],on:{onHit(n,e,d,o,crit){if(crit)buff('i_pred',3,{as:1+.12*n})}}},
 {id:'glyph',name:'Glifo de Reinicio',r:'u',col:'#d0a0ff',desc:'Al matar, 6% de prob. de reiniciar la secundaria (+6%).',on:{onKill(n){if(chance(.06*n))S.p.cd.s=0}}},
 {id:'pulsar',name:'Flor Pulsante',r:'u',col:'#7aff9a',desc:'Cada 5 s emites una onda que te cura un 4% de vida (+4%).',tags:['curación'],
  on:{onTick(n,dt){if(tick('pulsar',5,n,dt)){const p=S.p;heal(p.maxHp*.04*n);ring(p.x,p.y-20,90,'#7aff9a',.4)}}}},
 {id:'wrath',name:'Brazalete de Ira',r:'u',col:'#ff3c1a',desc:'Al recibir daño: +25% de daño 3 s (+25%).',on:{onTakeDamage(n){buff('i_wrath',3,{dmg:1+.25*n})}}},
 {id:'razor',name:'Alambre de Espino',r:'u',col:'#a0a0a0',desc:'Cada 0,5 s dañas con 50% de daño base a los enemigos a menos de 160 px (+50%).',
  on:{onTick(n,dt){if(tick('razor',.5,n,dt))for(const e of inR(S.p.x,S.p.y-20,160))hurtE(e,ib()*.5*n,PROC)}}},
 {id:'fuel',name:'Célula de Combustible',r:'u',col:'#ff8a00',desc:'−15% de enfriamiento de la definitiva (+15%; máx. 60%).',st:{ucdr:.15}},
 {id:'guillotine',name:'Guillotina Láser',r:'u',col:'#ff2a6a',desc:'Los enemigos (no jefes) por debajo del 12% de vida mueren al instante (+6%; máx. 40%).',st:{exec:.06}},
 {id:'kinetic',name:'Placa Cinética',r:'u',col:'#c8d2ff',desc:'Tu movimiento da 0,3 s de invulnerabilidad (+0,2 s) y +30% de velocidad 2 s.',
  on:{onDash(n){S.p.inv=Math.max(S.p.inv,.1+.2*n);buff('i_kin',2,{spd:1.3})}}},
 {id:'executioner',name:'Lupa del Verdugo',r:'u',col:'#ffd23c',desc:'+50% de daño crítico (+50%).',tags:['crítico'],st:{critm:.5}},
 {id:'aerial',name:'Dominio Aéreo',r:'u',col:'#e0f0ff',desc:'+20% de daño tras el doble salto, hasta tocar el suelo (+20%).',tags:['salto'],dm(n){return S.p.jumps>=2&&!S.p.ground?1+.2*n:1}},
 {id:'banner',name:'Estandarte de Guerra',r:'u',col:'#ffb13c',desc:'Al subir de nivel colocas un estandarte 8 s: dentro, +30% de vel. de ataque y movimiento (+30 de radio).',
  on:{onLevelUp(n){const p=S.p;Z({x:p.x,y:p.y-30,r:150+30*n,life:8,dot:1,pbuf:{as:1.3,spd:1.3},col:'#ffb13c'})}}},
 {id:'stopwatch',name:'Cronómetro Roto',r:'u',col:'#3cf0ff',desc:'Al bajar del 25% de vida detienes el tiempo 2 s (recarga 30 s, −5 s por acumulación).',
  on:{onTakeDamage(n){const p=S.p;if(p.hp<p.maxHp*.25&&(p.ist.sw||0)<=S.t){p.ist.sw=S.t+Math.max(10,35-5*n);S.freeze=Math.max(S.freeze,2);say('¡Cronómetro Roto!')}}}},
 {id:'coupon',name:'Cupón Neón',r:'u',col:'#4cff7a',desc:'Los cofres cuestan un 10% menos (+10%; máx. 50%).',st:{chestm:.1}},
 {id:'battlepulse',name:'Pulso de Batalla',r:'u',col:'#ff5a3c',desc:'Cada baja da +5% de vel. de ataque y movimiento 3 s; se acumula hasta 3 veces (+2).',
  on:{onKill(n){const b=S.p.buf.i_pulse,k=Math.min(1+2*n,(b?b.k:0)+1);buff('i_pulse',3,{k,as:1+.05*k,spd:1+.05*k})}}},
 {id:'seed',name:'Semilla Parásita',r:'u',col:'#7aff3c',desc:'Cada golpe te cura 1 de vida (+1).',tags:['curación'],on:{onHit(n){heal(n)}}},
 {id:'sticky',name:'Bomba Adhesiva',r:'u',col:'#ff6a3c',desc:'6% de prob. al golpear de pegar una bomba que explota 1 s después con 180% del golpe (+6%).',tags:['explosión'],
  on:{onHit(n,e,d){if(chance(.06*n))S.sch.push({t:1,f:()=>boom(e.x,e.y-e.h/2,70,d*1.8,'#ff6a3c',1)})}}},
 {id:'corrosive',name:'Vial Corrosivo',r:'u',col:'#e6ff3c',desc:'10% de prob. al golpear de aplicar veneno acumulable: 30% del golpe por segundo, 4 s (+10%).',tags:['veneno'],
  on:{onHit(n,e,d){if(chance(.1*n))applyDot(e,'poison',d*.3,4,1)}}},
 {id:'novagen',name:'Generador de Novas',r:'u',col:'#ff3cf2',desc:'Al usar la definitiva, nova (r 200) con 400% de daño base (+400%).',tags:['explosión'],
  on:{onCast(n,slot){if(slot==='u')boom(S.p.x,S.p.y-20,200,ib()*4*n,'#ff3cf2')}}},
 {id:'drone',name:'Dron de Apoyo',r:'u',col:'#4cff9a',desc:'Te acompaña un dron permanente que dispara (+1 dron).',
  pick(){S.dr.push({k:'orbit',a:R(0,6.28),life:Infinity,cd:0,dmg:8,perm:1,x:S.p.x,y:S.p.y})}},
 {id:'smoke',name:'Velo de Humo',r:'u',col:'#9a93c8',desc:'Al recibir daño te vuelves intangible 1,5 s (+0,5 s). Recarga 8 s.',
  on:{onTakeDamage(n){const p=S.p;if((p.ist.smoke||0)<=S.t){p.ist.smoke=S.t+8;buff('i_smoke',1+.5*n,{intang:1});burst(p.x,p.y-20,20,'#9a93c8',200,6)}}}},
 {id:'ammo',name:'Recámara Extra',r:'u',col:'#ffd23c',desc:'25% de prob. de lanzar la secundaria dos veces (+25%).',
  on:{onCast(n,slot){if(slot==='s'&&chance(.25*n)){const d=ab('s');AB[d.t](S.p,d,S.p.aim,0)}}}},

 /* ===================== RAROS (12) ===================== */
 {id:'gamma',name:'Detonador Gamma',r:'r',col:'#ff4d6d',desc:'Todos tus golpes explotan (r 50, +10 por acumulación) con el 20% del golpe (+10%).',tags:['explosión'],
  on:{onHit(n,e,d){boom(e.x,e.y-e.h/2,40+10*n,d*(.1+.1*n),'#ff4d6d',1)}}},
 {id:'clover',name:'Trébol de Neón',r:'r',col:'#4cff7a',desc:'+1 de suerte: cada probabilidad y cada rareza de cofre se tira una vez más y se queda la mejor (+1).',st:{luck:1}},
 {id:'overshield',name:'Coraza Absoluta',r:'r',col:'#c8d2ff',desc:'La curación sobrante se convierte en escudo, hasta un 50% de tu vida (+50%).',tags:['escudo','curación'],st:{oversh:.5}},
 {id:'brainstalk',name:'Mente Febril',r:'r',col:'#ff7ad9',desc:'Al matar a una élite: sin enfriamientos (salvo el primario) durante 4 s (+2 s).',
  on:{onKill(n,e){if(e.elite){buff('i_brain',2+2*n,{nocd:1});say('¡Mente Febril!')}}}},
 {id:'dagger',name:'Daga Ceremonial',r:'r',col:'#e0e0ff',desc:'Al matar lanzas 3 dagas teledirigidas con 150% de daño base (+3 dagas).',
  on:{onKill(n,e){for(let i=0;i<3*n;i++){const a=R(0,6.28);fxProj({x:e.x,y:e.y-e.h/2,vx:Math.cos(a)*500,vy:Math.sin(a)*500,dmg:ib()*1.5,r:4,life:1.5,home:1,col:'#e0e0ff',proc:1})}}}},
 {id:'tesla',name:'Bobina Tesla',r:'r',col:'#bfe4ff',desc:'Cada 0,5 s electrocutas a 3 enemigos cercanos con 100% de daño base (+100%).',tags:['rayo'],
  on:{onTick(n,dt){if(!tick('tesla',.5,n,dt))return;const p=S.p;for(const e of inR(p.x,p.y-20,260).slice(0,3)){bolt(p.x,p.y-20,e.x,e.y-e.h/2,'#bfe4ff',2);hurtE(e,ib()*n,PROC)}}}},
 {id:'afterburner',name:'Postquemador',r:'r',col:'#ff9a3c',desc:'−30% de enfriamiento del movimiento (+30%; máx. 75%).',st:{mcdr:.3}},
 {id:'stormeye',name:'Ojo de la Tormenta',r:'r',col:'#5ab4ff',desc:'Los críticos invocan un rayo del cielo con 300% del golpe (+300%).',tags:['crítico','rayo'],
  on:{onHit(n,e,d,o,crit){if(crit){bolt(e.x,-10,e.x,e.y-e.h/2,'#bfe4ff',3,14,.2);hurtE(e,d*3*n,PROCRAW)}}}},
 {id:'rejuv',name:'Bastidor de Rejuvenecimiento',r:'r',col:'#4cff7a',desc:'+50% a toda la curación (+50%).',tags:['curación'],st:{healm:.5}},
 {id:'anchor',name:'Ancla Gravitatoria',r:'r',col:'#7a6cff',desc:'5% de prob. al golpear de abrir un pozo que atrae a los enemigos 2 s (+5%).',
  on:{onHit(n,e){if(chance(.05*n))Z({x:e.x,y:e.y-e.h/2,r:140,life:2,dot:1,pullZ:300,fdmg:ib()*.5,col:'#7a6cff'})}}},
 {id:'frostcrown',name:'Corona Helada',r:'r',col:'#bff4ff',desc:'Al matar, congelas 1 s a los enemigos cercanos (r 150) y les haces 100% de daño base (+100%).',
  on:{onKill(n,e){for(const t of inR(e.x,e.y-e.h/2,150)){stunE(t,1);hurtE(t,ib()*n,PROC)}ring(e.x,e.y-e.h/2,150,'#bff4ff',.3)}}},
 {id:'bandolier',name:'Cargador Infinito',r:'r',col:'#ffd23c',desc:'Al matar, 8% de prob. de reiniciar la secundaria y el movimiento (+8%).',
  on:{onKill(n){if(chance(.08*n)){const p=S.p;p.cd.s=p.cd.m=0;txt(p.x,p.y-60,'¡RECARGA!','#ffd23c')}}}},

 /* ===================== LEGENDARIOS (5): cambian las reglas ===================== */
 {id:'gesture',name:'Gesto del Abismo',r:'l',col:'#ffd23c',desc:'Tu definitiva se lanza sola en cuanto está lista y su enfriamiento baja un 40% (+15%).',
  pick(n){S.p.m.ucdr+=n===1?.4:.15}},
 {id:'prismfork',name:'Prisma Bifurcado',r:'l',col:'#3cf0ff',desc:'Tus proyectiles disparados se triplican en abanico (+1 por acumulación) con −30% de daño cada uno.'},
 {id:'ankh',name:'Ankh de Neón',r:'l',col:'#ffd23c',desc:'Al morir resucitas con toda la vida. Se consume (cada acumulación es una vida).'},
 {id:'inverse',name:'Núcleo Inverso',r:'l',col:'#ff3c6a',desc:'Toda curación que recibes se descarga también como daño ×2 sobre el enemigo más cercano (+×2).',tags:['curación'],
  on:{onHeal(n,a){const p=S.p;p.ist.inv=(p.ist.inv||0)+a*2*n;if(p.ist.inv<10)return;const e=nearest(p.x,p.y-20,500);
   if(e){bolt(p.x,p.y-20,e.x,e.y-e.h/2,'#ff3c6a',2);hurtE(e,p.ist.inv,PROCRAW)}p.ist.inv=0}}},
 {id:'swarmheart',name:'Corazón del Enjambre',r:'l',col:'#4cff9a',desc:'Cada baja invoca un dron aliado 8 s (máx. 6 drones, +2).',
  on:{onKill(n,e){const o=S.dr.filter(m=>m.sw&&m.life>0);if(o.length>=4+2*n)o[0].life=0;S.dr.push({k:'orbit',sw:1,perm:1,a:R(0,6.28),life:8,cd:0,dmg:6,x:e.x,y:e.y})}}},

 /* ===================== MÍTICOS / PRISMÁTICOS (3): poder extremo, coste alto ===================== */
 {id:'star',name:'Estrella Prismática',r:'m',col:'#ff3cf2',desc:'Daño ×2 (+×0,5). COSTE: recibes el doble de daño y toda la curación se reduce a la mitad.',
  pick(n){buff('i_star',Infinity,{dmg:2+.5*(n-1),taken:2,healm:.5})}},
 {id:'singularity',name:'Singularidad Portátil',r:'m',col:'#7a3cff',desc:'Cada 6 s (−1 s por acumulación) abre un agujero negro sobre el enemigo más cercano. COSTE: −40% de vida máxima.',
  pick(n){if(n===1){S.p.m.hpm-=.4;recalcHp()}},
  on:{onTick(n,dt){if(!tick('sing',Math.max(2,7-n),n,dt))return;const p=S.p,e=nearest(p.x,p.y-20,700);if(!e)return;
   Z({x:e.x,y:e.y-e.h/2,r:220,life:2.5,dot:1,fdmg:ib()*1.5,pullZ:380,col:'#3a1a8a',end:z=>boom(z.x,z.y,180,ib()*6,'#ff3cf2')})}}},
 {id:'eclipse',name:'Eclipse Hambriento',r:'m',col:'#ff2a00',desc:'+100% de velocidad de ataque y −50% de enfriamientos (+25% vel.). COSTE: pierdes un 3% de vida por segundo si no has matado en los últimos 2 s.',
  pick(n){buff('i_eclipse',Infinity,{as:2+.25*(n-1),cdm:.5})},
  on:{onKill(){S.p.ist.lastKill=S.t},onTick(n,dt){if(S.t-(S.p.ist.lastKill||0)>2)drainP(S.p.maxHp*.03*dt)}}}
];

/* ===================== FRAGMENTADOS (altares): bonificación absurda, penalización permanente ===================== */
const FRAGMENTS=[
 {id:'glass',name:'Corazón de Vidrio Obsidiana',r:'f',col:'#2a1a3a',desc:'Daño ×3,5 (+×1). COSTE: tu vida máxima queda fijada en 1.',
  pick(n){buff('i_glass',Infinity,{dmg:3.5+(n-1)});recalcHp()}},
 {id:'entropy',name:'Cristal de Entropía',r:'f',col:'#7affff',desc:'Enfriamientos −50% (−25% más por acumulación). COSTE: tu suerte queda en 0 y todas las probabilidades se reducen a la mitad.',
  pick(n){buff('i_entropy',Infinity,{cdm:.5*Math.pow(.75,n-1)})}},
 {id:'bloodoath',name:'Juramento de Sangre',r:'f',col:'#8a0020',desc:'+20% de robo de vida (+10%). COSTE: sin regeneración natural ni curación por baja.',
  pick(n){S.p.m.ls+=n===1?.2:.1}},
 {id:'voidanchor',name:'Ancla del Vacío',r:'f',col:'#3a2a6a',desc:'+100% de daño mientras pisas el suelo (+50%). COSTE: solo tienes un salto.',dm(n){return S.p.ground?2+.5*(n-1):1}},
 {id:'greed',name:'Ídolo de la Avaricia',r:'f',col:'#c8a000',desc:'Oro ×3 (+×1). COSTE: los enemigos tienen +40% de vida (+20%).'},
 {id:'comet',name:'Corona del Cometa',r:'f',col:'#ff6a3c',desc:'Cada 8 s cae un meteoro (r 160) con 1200% de daño base sobre un enemigo cercano. COSTE: si estás dentro, te quita un 25% de vida.',
  on:{onTick(n,dt){if(!tick('comet',Math.max(3,9-n),n,dt))return;const p=S.p,e=nearest(p.x,p.y-20,700);if(!e)return;
   Z({x:e.x,y:FLOOR,r:160,warn:1,hostile:1,dmg:p.maxHp*.25,fboom:ib()*12,col:'#ff6a3c'})}}},
 {id:'mirror',name:'Espejo Quebrado',r:'f',col:'#c0d0e0',desc:'Todo tu daño se aplica dos veces (+1 vez). COSTE: −50% de vida máxima.',
  dm(n){return 1+n},pick(n){if(n===1){S.p.m.hpm-=.5;recalcHp()}}},
 {id:'invhour',name:'Reloj de Arena Invertido',r:'f',col:'#e6d0a0',desc:'Experiencia ×2,5 y oro ×2. COSTE: el reloj de dificultad corre un 100% más rápido (+50%).'},
 {id:'blacklens',name:'Lente de Cristal Negro',r:'f',col:'#101010',desc:'Todos tus golpes son críticos. COSTE: los críticos solo hacen ×1,5 y aparecen el doble de élites.'},
 {id:'shackles',name:'Grilletes de Titanio',r:'f',col:'#8090a0',desc:'Recibes un 50% menos de daño (+15%). COSTE: −40% de velocidad y no puedes usar tu habilidad de movimiento.',
  pick(n){buff('i_shackles',Infinity,{taken:.5*Math.pow(.85,n-1),spd:.6,nomove:1})}},
 {id:'icarus',name:'Alas de Ícaro',r:'f',col:'#ffe0a0',desc:'Saltos ilimitados. COSTE: cada salto en el aire te quita un 4% de tu vida máxima (puede matarte).'},
 {id:'elegy',name:'Elegía Fragmentada',r:'f',col:'#5ab4ff',desc:'Los cofres dan objetos de rareza totalmente aleatoria, míticos incluidos. COSTE: 1 de cada 3 cofres explota sin darte nada y te hiere.'}
];
/* ===================== COFRES Y ALTARES ===================== */
// base = precio a dificultad 1; w = probabilidad de cada rareza; spawn = peso de aparición
const CHESTS={
 small:{name:'Cofre',base:30,w:{c:.79,u:.2,r:.01},spawn:.75,col:'#8a6cff'},
 large:{name:'Cofre Grande',base:70,w:{u:.8,r:.2},spawn:.22,col:'#4cff7a'},
 gold:{name:'Cofre Dorado',base:300,w:{l:.85,m:.15},spawn:.03,col:'#ffd23c'}
};
const ALTAR={name:'Altar Fragmentado',cost:.3,choices:2,col:'#5ab4ff'};  // cost = % de vida ACTUAL que se sacrifica

const ITEM=Object.fromEntries(ITEMS.concat(FRAGMENTS).map(i=>[i.id,i]));
