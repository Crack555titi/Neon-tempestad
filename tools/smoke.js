// Prueba headless: `node tools/smoke.js`
// Carga los scripts de index.html con DOM/canvas simulados, comprueba arreglos concretos
// y juega cada personaje × dificultad buscando excepciones. No valida lo visual.
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const files=[...fs.readFileSync(path.join(root,'html','index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);

global.Path2D=function(){};let fakeVersion=null;
// Firebase simulado en memoria: cuentas (Identity Toolkit), renovación de token y Firestore con las mismas reglas que el servidor real
const FAKE={users:{},docs:{0:[],1:[],2:[],3:[],4:[]},offline:false};
const fsVal=v=>'integerValue' in v?+v.integerValue:'booleanValue' in v?v.booleanValue:v.stringValue;
global.fetch=async(url,opt={})=>{const res=(status,j)=>({ok:status<300,status,json:async()=>j});
 if(url.includes('version.json'))return fakeVersion?res(200,fakeVersion):res(404,{});
 if(FAKE.offline)throw new TypeError('Failed to fetch');
 const b=typeof opt.body==='string'&&opt.body[0]==='{'?JSON.parse(opt.body):opt.body,byTok=t=>Object.entries(FAKE.users).find(([,u])=>t==='t-'+u.uid);
 if(url.includes('accounts:signUp')){if(FAKE.users[b.email])return res(400,{error:{message:'EMAIL_EXISTS'}});
  const uid='u'+Object.keys(FAKE.users).length;FAKE.users[b.email]={pass:b.password,uid,name:''};return res(200,{idToken:'t-'+uid,refreshToken:'r-'+uid,localId:uid,expiresIn:'3600'})}
 if(url.includes('accounts:update')){const u=byTok(b.idToken);if(u)u[1].name=b.displayName;return res(200,{})}
 if(url.includes('signInWithPassword')){const u=FAKE.users[b.email];if(!u||u.pass!==b.password)return res(400,{error:{message:'INVALID_LOGIN_CREDENTIALS'}});
  return res(200,{idToken:'t-'+u.uid,refreshToken:'r-'+u.uid,localId:u.uid,expiresIn:'3600',displayName:u.name})}
 if(url.includes('securetoken')){const uid=decodeURIComponent(String(b).split('refresh_token=')[1]).slice(2);return res(200,{id_token:'t-'+uid,refresh_token:'r-'+uid,expires_in:'3600'})}
 const m=url.match(/boards\/(\d)(:runQuery|\/scores)$/);
 if(m&&m[2]===':runQuery')return res(200,FAKE.docs[m[1]].slice().sort((x,y)=>y.score-x.score).slice(0,50).map(d=>({document:{fields:Object.fromEntries(Object.entries(d).map(([k,v])=>[k,typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:{stringValue:v}]))}})));
 if(m){const d=Object.fromEntries(Object.entries(b.fields).map(([k,v])=>[k,fsVal(v)])),u=byTok(String((opt.headers||{}).Authorization).slice(7));
  if(!u||d.uid!==u[1].uid||d.user.toLowerCase()+'@neontempestad.game'!==u[0]||d.score>1e8)return res(403,{error:{message:'Missing or insufficient permissions.'}});
  FAKE.docs[m[1]].push(d);return res(200,{name:'doc'})}
 return res(404,{})};
const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):k==='measureText'?s=>({width:String(s).length*7}):()=>{}),set:(t,k,v)=>(t[k]=v,true)});
const els={},L={};
const el=id=>els[id]||(els[id]={id,style:{setProperty(){}},innerHTML:'',textContent:'',width:960,height:540,getContext:()=>ctx,addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:960,height:540})});
Object.assign(global,{document:{getElementById:el,createElement:()=>({width:0,height:0,getContext:()=>ctx})},addEventListener:(n,f)=>{L[n]=f},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){}});
eval(files.map(f=>fs.readFileSync(path.join(root,'html',f),'utf8')).join('\n;\n')+
 '\n;global.T={loop,get MENU(){return MENU},Update,cmpVer,APP_VERSION,get STAGE(){return STAGE},loadStage,coef,capL,Auth,scoreRun,seedBoard,start,get S(){return S},get PLAT(){return PLAT},update,draw,keys,mouse,CHARS,DIFFS,STAGES,BOSSES,ENEMIES,AFX,useTP,saveRun,loadRun,clearRun,Z,heal,cast,fxProj,drawMenuBg,setQuality,get BIND(){return BIND},set BIND(v){BIND=v},BIND_DEF,saveBinds,loadBinds,rebindStart:(a,i)=>{rebind={a,i}},pollInput,AIM,TOUCHV,act,Snd,SFX,get QL(){return QL},get chroma(){return chroma},get hitstop(){return hitstop},hurtE,hurtP,TX,Save,isUnlocked,ACHIEVEMENTS,AB,spawnEnemy,ab,Ev,ITEMS,FRAGMENTS,ITEM,giveItem,priceOf,interact,applyDot,kill,BL,PR,PT};');

const pick0={target:{closest:()=>({dataset:{i:0}})}};
const step=(n=1)=>{for(let i=0;i<n;i++){if(T.S.st==='mastery')els.nodes.onclick(pick0);if(T.S.st==='altar')els.altarOpts.onclick(pick0);T.update(1/60);T.draw()}};
const key=(code,repeat)=>L.keydown({code,repeat,preventDefault(){}});
const reset=()=>{for(const k in T.keys)T.keys[k]=0;T.mouse.l=T.mouse.r=0};

// 1. Mantener Espacio (autorrepetición) no gasta el doble salto
reset();T.start('vanguard',1);step(5);key('Space',false);const j=T.S.p.jumps;key('Space',true);key('Space',true);
assert.strictEqual(T.S.p.jumps,j,'la autorrepetición gastó saltos');
// 2. La resurrección no aplica daño 0 a los enemigos
T.start('vanguard',0);step(400);T.S.p.inv=0;T.hurtP(1e9);
assert.strictEqual(T.S.p.revive,0);assert.strictEqual(T.S.st,'play');
assert(!T.TX.a.slice(0,T.TX.n).some(t=>t.s==='0'),'la resurrección pintó daño 0');
// 3. Varias maestrías a la vez se encolan (Pesadilla arranca a nivel 20 → 4 nodos)
T.start('vanguard',4);assert.strictEqual(T.S.p.lvl,20);assert.strictEqual(T.S.mq,4);assert.strictEqual(T.S.st,'mastery');
for(let i=0;i<4;i++)els.nodes.onclick({target:{closest:()=>({dataset:{i:0}})}});
assert.strictEqual(T.S.st,'play');assert.strictEqual(T.S.mq,0);
// 4. Alt-Tab suelta las teclas
T.keys.KeyD=1;T.mouse.l=1;L.blur();assert(!T.keys.KeyD&&!T.mouse.l,'blur no soltó las teclas');
// 5. Tiempo Detenido congela los ataques programados del enemigo
T.start('chrono',1);let fired=0;T.S.sch.push({t:.1,en:1,f:()=>fired=1});T.S.freeze=1;step(30);
assert.strictEqual(fired,0,'el ataque programado se ejecutó durante el congelamiento');
// 6. La plataforma móvil arrastra al jugador
T.start('vanguard',1);T.S.phase=3;step(1);const pl=T.PLAT.find(q=>q.ax);
T.S.p.x=pl.rx+65;T.S.p.y=pl.ry;T.S.p.vy=0;T.S.en.length=0;step(1);step(40);
assert(T.S.p.plat===pl,'el jugador no está sobre la plataforma');assert(Math.abs(T.S.p.x-(pl.rx+65))<8,'la plataforma no arrastró al jugador');
// 7. Logros: el salto 500 desbloquea a Colmena; todo personaje bloqueado tiene un logro válido
assert(!T.isUnlocked('hive'));T.Save.d.stats.jumps=499;T.start('vanguard',1);step(5);key('Space',false);
assert(T.isUnlocked('hive'),'el logro de saltos no desbloqueó a Colmena');
for(const [k,v] of Object.entries(T.CHARS)){if(v.unlock)assert(T.ACHIEVEMENTS[v.unlock],k+' tiene un logro inexistente');
 for(const s of ['primary','secondary','move','ult'])for(const a of v[s].forms?Object.values(v[s].forms):[v[s]])assert(T.AB[a.t],`${k}.${s}: tipo «${a.t}» no existe`)}
assert.strictEqual(Object.keys(T.CHARS).length,20);
for(const f of ['Vanguardia','Artillería','Invocadores','Tiempo/Espacio','Malditos/Híbridos'])assert.strictEqual(Object.values(T.CHARS).filter(v=>v.fam===f).length,4,f);
// 8. Mecánicas delicadas de los personajes
const castAs=(ch,slot)=>{T.start(ch,1);T.S.spawn=1e9;step(2);T.S.p.inv=0;return T.S.p};
let p=castAs('duelist');T.cast('s');T.hurtP(50);assert.strictEqual(p.hp,p.maxHp,'Contragolpe no anuló el daño');
p=castAs('bastion');T.cast('s');T.hurtP(50);assert.strictEqual(p.hp,p.maxHp,'Égida no absorbió');assert(p.buf.aegis.stored>0);
p=castAs('paradox');step(200);const h0=p.hp;T.S.p.inv=0;T.hurtP(40);T.S.p.hist.forEach(h=>h.hp=h0);T.cast('s');assert(p.hp>=h0-1,'Rebobinar no recuperó la vida');
p=castAs('voidborn');for(let i=0;i<20;i++)T.Ev.emit('onKill',{});assert(p.buf.void,'la Corrupción no activó la Forma del Vacío');
p=castAs('chimera');const n0=T.ab('p').name;T.cast('m');assert.notStrictEqual(T.ab('p').name,n0,'Metamorfosis no cambió la forma');assert(p.buf.beast);
p=castAs('hemo');p.hp=1;T.cast('p');T.cast('s');assert(p.hp>=1&&T.S.st==='play','el coste de vida mató al Hemomante');
p=castAs('hemo');p.hp=2;T.cast('u');step(120);assert.strictEqual(T.S.st,'over','el Pacto Carmesí debería poder matar');
p=castAs('berserk');T.cast('u');p.hp=5;T.S.p.inv=0;T.hurtP(500);assert(p.hp>=1&&T.S.st==='play','Último Aliento no evitó la muerte');
p=castAs('paradox');T.spawnEnemy('brute',p.x+60,500,true);const dm=T.S.en[0];dm.hp=dm.maxHp=1e6;dm.stunT=1e9;T.cast('u');T.hurtE(dm,100);
const before=dm.hp;step(60*6+5);assert(dm.hp<before-50,'Bucle Temporal no repitió el daño');
console.log('Comprobaciones de arreglos, logros y mecánicas: OK');

// 9. Objetos: recuento por rareza, ids únicos, todos con descripción y efecto
const cnt=r=>T.ITEMS.filter(i=>i.r===r).length;
assert.deepStrictEqual(['c','u','r','l','m'].map(cnt),[35,25,12,5,3],'recuento por rareza');
assert.strictEqual(T.ITEMS.length,80);assert(T.FRAGMENTS.length>=10);
const all=T.ITEMS.concat(T.FRAGMENTS),ids=new Set(all.map(i=>i.id));assert.strictEqual(ids.size,all.length,'ids repetidos');
const SPECIAL=['prismfork','ankh','greed','invhour','blacklens','icarus','elegy'];  // efectos leídos directamente por el motor
for(const it of all){assert(it.name&&it.desc&&it.col,it.id);assert(it.st||it.on||it.dm||it.pick||SPECIAL.includes(it.id),it.id+' no hace nada')}
// 10. Economía: el precio crece con la dificultad y Cataclismo cobra un 30% más que Estándar al mismo minuto
T.start('vanguard',1);T.S.clock=600;const c1=T.priceOf({tier:'small'});T.start('vanguard',3);T.S.clock=600;const c3=T.priceOf({tier:'small'});
assert(Math.abs(c3/c1-1.3)<.03,`Cataclismo ${c3} vs Estándar ${c1}`);T.S.clock=0;assert(T.priceOf({tier:'small'})<c3,'el precio no sube con el reloj');
// 11. Abrir un cofre da un objeto y emite onChestOpen
T.start('vanguard',1);let opened=0;T.Ev.on('onChestOpen',()=>opened++);const ch0=T.S.ints.find(o=>o.k==='chest');
T.S.p.gold=1e6;T.S.p.x=ch0.x;T.S.p.y=ch0.y;step(1);T.interact();assert(ch0.open&&opened===1,'el cofre no se abrió');
assert.strictEqual(Object.values(T.S.p.items).reduce((a,b)=>a+b,0)>=1,true);assert(T.S.note,'no hubo aviso al recoger');
// 12. Altar: elegir un fragmentado cuesta un 30% de vida y da el objeto
T.start('vanguard',1);const al=T.S.ints.find(o=>o.k==='altar');T.S.p.x=al.x;T.S.p.y=al.y;step(1);const hp0=T.S.p.hp;T.interact();
assert.strictEqual(T.S.st,'altar');els.altarOpts.onclick(pick0);assert(T.FRAGMENTS.some(f=>T.S.p.items[f.id]),'el altar no dio objeto');
assert(al.open&&T.S.st==='play');
// 13. Sinergia sangrado + Granada de Sangre: un enemigo que muere sangrando daña a su vecino
T.start('vanguard',1);T.S.spawn=1e9;T.giveItem('bloodbomb',1);T.spawnEnemy('crawler',900,500,true);T.spawnEnemy('crawler',940,500,true);
const [ea,eb]=T.S.en;eb.hp=eb.maxHp=1e5;T.applyDot(ea,'bleed',1,3);T.hurtE(ea,1e4);assert(eb.hp<eb.maxHp,'la Granada de Sangre no explotó');
// 14. Fragmentados con efecto duro: Vidrio fija la vida en 1; Ankh resucita y se consume
T.start('vanguard',1);T.giveItem('glass',1);assert.strictEqual(T.S.p.maxHp,1);step(60);assert.strictEqual(T.S.p.maxHp,1);
T.start('vanguard',1);T.giveItem('ankh',1);T.S.p.inv=0;T.hurtP(1e6);assert(T.S.st==='play'&&T.S.p.hp===T.S.p.maxHp&&!T.S.p.items.ankh,'el Ankh no funcionó');
// 15. Pesadilla empieza con 24 objetos
T.start('vanguard',4);assert.strictEqual(Object.values(T.S.p.items).reduce((a,b)=>a+b,0),24);
// 16. Todos los objetos ×2 a la vez en cada personaje (20 s, vida rellenada): busca excepciones y bucles infinitos de procs
for(const ch of Object.keys(T.CHARS)){reset();T.start(ch,1);for(const it of T.ITEMS)for(let k=0;k<2;k++)T.giveItem(it.id,1);
 Object.assign(T.mouse,{x:700,y:300});T.keys.ShiftLeft=T.keys.KeyQ=1;
 for(let f=0;f<60*20&&T.S.st!=='over';f++){T.mouse.l=T.mouse.r=f%50<40;if(f%60===0){T.S.p.hp=T.S.p.maxHp;T.S.p.items.ankh=2}step()}}
// 17. Cada fragmentado por separado (15 s)
for(const fr of T.FRAGMENTS){reset();T.start('artillery',1);T.giveItem(fr.id,1);T.mouse.l=1;T.keys.ShiftLeft=T.keys.KeyQ=1;
 for(let f=0;f<60*15&&T.S.st!=='over';f++){if(f%60===0)T.S.p.hp=T.S.p.maxHp;if(f%20===0&&T.S.near&&T.S.near.k==='chest'){T.S.p.gold=1e6;T.interact()}step()}}
console.log('Objetos, economía, cofres, altares y sinergias: OK');

// 18. Contenido de la Fase 3: recuentos
const types=Object.keys(T.ENEMIES).filter(k=>T.ENEMIES[k].wt);assert(types.length>=12,'tipos de enemigo: '+types.length);
for(const ai of ['fly','shooter','kamikaze','tank'])assert(types.some(k=>T.ENEMIES[k].ai===ai),'falta comportamiento '+ai);
assert(T.AFX.length>=8);assert(T.STAGES.length>=4);assert(Object.keys(T.BOSSES).length>=5);
for(const st of T.STAGES){assert(T.BOSSES[st.boss],st.id);for(const k of st.enemies)assert(T.ENEMIES[k],st.id+':'+k);
 // el teletransportador siempre sobre algo que existe en las 3 fases
 for(const t of st.tp)assert(st.plats.some(q=>q.y===t.y&&t.x>q.x&&t.x<q.x+q.w&&q.ph[0]===1&&q.ph[1]===3)||[1,2,3].every(ph=>st.plats.some(q=>q.y===t.y&&t.x>q.x&&t.x<q.x+q.w&&q.ph[0]<=ph&&q.ph[1]>=ph)),st.id+' tp en el aire')}
for(const [k,b] of Object.entries(T.BOSSES))for(const ph of [1,2,3])assert(b.moves.some(m=>m.ph===ph),k+' sin ataques nuevos en fase '+ph);
// 19. Cada tipo de enemigo y cada afijo de élite funcionan 8 s junto al jugador
for(const k of Object.keys(T.ENEMIES)){T.start('vanguard',1);T.S.spawn=1e9;T.spawnEnemy(k,T.S.p.x+150);step(60*8)}
for(const a of T.AFX){T.start('vanguard',3);T.S.spawn=1e9;const e=T.spawnEnemy('crawler',T.S.p.x+150,undefined,1);e.elite=1;e.aff=[a];step(60*8);T.S.p.hp=T.S.p.maxHp}
// 20. Teletransportador: activar → jefe; jefe muerto + carga completa → listo → etapa 2 guardada
T.start('vanguard',1);T.useTP();assert(T.S.boss&&T.S.tp.state==='charging');T.S.p.x=T.S.tp.x;T.S.p.y=T.S.tp.y;const c0=T.S.tp.charge;T.S.spawn=1e9;step(120);
assert(T.S.tp.charge>c0,'no carga estando cerca');{const b=T.S.boss;b.hidden=0;T.hurtE(b,1e12,{raw:1});assert(!b.dead&&b.ph===2,'un golpe enorme se saltó fases');T.hurtE(b,1e12,{raw:1});assert(!b.dead&&b.ph===3);T.hurtE(b,1e12,{raw:1});assert(b.dead)}T.S.tp.charge=1;step(2);assert.strictEqual(T.S.tp.state,'ready');
T.useTP();assert.strictEqual(T.S.stage,1);assert.strictEqual(T.loadRun().stage,1);
// 21. Mecánicas de jefe: Hidra → lava; Leviatán → suelo roto; Arconte → paredes; Reina → la Mirada castiga moverse
// muerte garantizada: los botines aleatorios pueden traer Ankh, esquiva o intangibilidad
const killP=()=>{const p=T.S.p;p.items.ankh=0;p.revive=0;p.m.dodge=0;p.buf={};p.inv=0;T.hurtP(1e9)};
const toStage=(i,d)=>{reset();T.start('vanguard',d||1);for(let k=0;k<i;k++){T.useTP();const b=T.S.boss;b.hidden=0;for(let j=0;j<3;j++)T.hurtE(b,1e12,{raw:1});T.S.tp.charge=1;step(2);T.useTP()}T.S.spawn=1e9};
const phaseTo=np=>{const b=T.S.boss;b.hidden=0;T.hurtE(b,b.maxHp*(np===2?.4:.35),{raw:1});assert(b.ph>=np)};
toStage(1);T.useTP();phaseTo(2);assert(T.S.lava,'la Hidra no activó la lava');
toStage(3);T.useTP();phaseTo(2);step(2);assert(!T.PLAT[0].on&&T.PLAT.some(q=>q.solid&&q.on),'el Leviatán no rompió el suelo');
toStage(4);T.useTP();phaseTo(2);phaseTo(3);assert(T.S.walls,'el Arconte no cerró las paredes');
toStage(2);T.useTP();const qb=T.S.boss;qb.t=99;qb.gaze={warn:0,act:2,tk:0};const hq=T.S.p.hp;T.S.p.inv=0;T.S.p.vx=0;step(1);
assert.strictEqual(T.S.p.hp,hq,'la Mirada castigó estar quieto');T.S.p.vx=300;T.S.p.inv=0;qb.gaze.tk=0;T.update(1/60);assert(T.S.p.hp<hq,'la Mirada no castigó moverse');
// 22. Telegraph que te sigue y se fija antes del impacto
T.start('vanguard',1);T.S.spawn=1e9;const z=T.Z({x:0,y:500,r:60,warn:1,track:.3,hostile:1,dmg:5});T.S.p.x=900;step(20);assert(Math.abs(z.x-900)<1,'el aviso no te sigue');step(25);
T.S.p.x=1300;step(5);assert(Math.abs(z.x-900)<1,'el aviso no se fijó');
// 23. Dificultades: Tormenta cura −20%; Pesadilla empieza en el minuto 45 y deja zonas al caer proyectiles; Cataclismo doble afijo
T.start('vanguard',2);T.S.p.hp=1;T.heal(100);assert(Math.abs(T.S.p.hp-81)<.5,'Tormenta no reduce la curación');
T.start('vanguard',4);assert.strictEqual(T.S.clock,45*60);for(let i=0;i<4;i++)els.nodes.onclick(pick0);
T.S.spawn=1e9;T.S.en.length=0;T.PR.n=0;T.S.zn.length=0;T.fxProj({x:500,y:400,vx:0,vy:900,dmg:5,r:5,life:2,hostile:1,col:'#f00'});step(30);assert(T.S.zn.some(q=>q.hostile&&q.dot),'Pesadilla no dejó zona de daño');
T.start('vanguard',3);let dbl=0;for(let i=0;i<300;i++){const e=T.spawnEnemy('crawler',100);if(e.elite)dbl+=e.aff.length===2?1:-1000}assert(dbl>0,'Cataclismo sin doble afijo');
// 24. Muerte permanente: en Pesadilla se borra la partida; en Estándar se puede reintentar la etapa con lo que tenías
T.start('vanguard',4);for(let i=0;i<4;i++)els.nodes.onclick(pick0);assert(T.loadRun());T.S.p.items.ankh=0;T.S.p.revive=0;T.S.p.m.dodge=0;T.S.p.buf={};T.S.p.inv=0;T.hurtP(1e9);  // el lote aleatorio puede traer esquiva o intangibilidad
assert.strictEqual(T.S.st,'over');assert.strictEqual(T.loadRun(),null,'Pesadilla no borró la partida');
toStage(2);T.giveItem('sharp',1);T.saveRun();killP();assert.strictEqual(T.S.st,'over');const rr=T.loadRun();assert(rr&&rr.stage===2,'no hay partida para reintentar');
T.start(rr.cid,rr.did,rr);assert.strictEqual(T.S.stage,2);assert.strictEqual(T.S.p.items.sharp,1,'el reintento perdió los objetos');
console.log('Etapas, jefes, enemigos, afijos, teletransportador, dificultades y guardado: OK');

// 25. Fase 4: animación, postproceso, números de daño, menú y calidad
T.start('vanguard',1);T.S.spawn=1e9;step(80);key('Space',false);assert(T.S.p.sy>1.1&&T.S.p.sx<.9,'el salto no estira');
for(let i=0;i<80&&!T.S.p.ground;i++)step();step(1);assert(T.S.p.sy<1,'el aterrizaje no aplasta');
T.S.p.cd.m=0;T.cast('m');step(3);assert(T.S.p.ghosts.length>0,'el dash no deja estela');
const en=T.spawnEnemy('brute',T.S.p.x+60,500,true);en.hp=en.maxHp=1e6;en.elite=1;en.aff=[T.AFX[1]];T.hurtE(en,50,{crit:1});
assert(T.TX.a.slice(0,T.TX.n).some(t=>t.size===20),'el crítico no usa número grande');assert(T.hitstop>0,'sin hit-stop en crítico a élite');
const e2=T.spawnEnemy('crawler',T.S.p.x+60,500,true);const pn=T.PT.n;T.hurtE(e2,1e6,{raw:1});assert(T.PT.n>pn+3,'la muerte no desintegra');
T.S.p.inv=0;T.hurtP(T.S.p.maxHp*.3);assert(T.chroma>0,'golpe fuerte sin aberración cromática');
T.S.p.hp=1;T.heal(30);step(40);assert(T.TX.a.slice(0,T.TX.n).some(t=>String(t.s).startsWith('+')),'no se muestra la curación');

for(const q of ['baja','media','alta']){T.setQuality(q);T.start('summoner',3);T.S.spawn=.1;for(let f=0;f<60*6;f++){T.mouse.l=f%30<20;step()}}
T.setQuality('baja');assert(T.PT.max<=220&&!T.QL.glow,'la calidad baja no reduce');T.setQuality('alta');
for(let i=0;i<60*13;i++)T.drawMenuBg(1/60);  // recorre la transición entre escenarios del menú
// el primer fotograma puede traer una marca de tiempo anterior: el menú no debe romperse con dt negativo
el('again').onclick();assert.strictEqual(T.S,null);T.loop(5000);T.MENU.t=0;T.MENU.i=-1;T.loop(4990);assert(T.MENU.t>=0&&T.MENU.i>=0,'dt negativo en el menú');
console.log('Animación, efectos, calidad y menú: OK');

// 26. Fase 5: controles reasignables, pausa, récords, mando, táctil y audio
reset();T.start('vanguard',1);T.S.spawn=1e9;step(80);
T.BIND.jump=['KeyK'];key('Space',false);assert.strictEqual(T.S.p.jumps,0,'Espacio sigue saltando tras reasignar');
key('KeyK',false);assert.strictEqual(T.S.p.jumps,1,'la tecla nueva no salta');
T.saveBinds();T.loadBinds();assert.deepStrictEqual(T.BIND.jump,['KeyK'],'la asignación no se guardó');
T.BIND.jump=T.BIND_DEF.jump.slice();T.saveBinds();
T.rebindStart('ult',0);key('KeyR',false);assert.strictEqual(T.BIND.ult[0],'KeyR','reasignar desde la pantalla de controles falló');
T.rebindStart('move',0);key('KeyR',false);assert.strictEqual(T.BIND.move[0],'KeyR');assert(!T.BIND.ult.includes('KeyR'),'una tecla quedó asignada a dos acciones');
T.BIND=JSON.parse(JSON.stringify(T.BIND_DEF));T.saveBinds();T.loadBinds();
key('Escape',false);assert.strictEqual(T.S.st,'pause','Esc no pausa');key('Escape',false);assert.strictEqual(T.S.st,'play','Esc no reanuda');
key('Tab',false);assert.strictEqual(T.S.st,'inv');key('Escape',false);assert.strictEqual(T.S.st,'play','Esc no cierra el inventario');
// récords por dificultad
T.start('artillery',2);T.S.p.items.ankh=0;T.S.p.revive=0;T.S.p.m.dodge=0;T.S.p.inv=0;T.hurtP(1e9);
const rec=T.Save.d.records[2];assert(rec&&rec.stage>=1&&rec.ch==='Cañonero','no se guardó el récord de la dificultad');
// mando: A salta, stick izquierdo mueve, stick derecho apunta, Start pausa
let pad={connected:1,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))};
Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[pad]},configurable:true});
T.start('vanguard',1);T.S.spawn=1e9;step(80);
pad.buttons[0].pressed=true;T.pollInput();assert.strictEqual(T.S.p.jumps,1,'A no salta');pad.buttons[0].pressed=false;T.pollInput();
pad.axes=[1,0,0,-1];T.pollInput();const x0=T.S.p.x;step(20);T.pollInput();assert(T.S.p.x>x0+20,'el stick no mueve');assert(Math.abs(T.AIM.ang+Math.PI/2)<.01,'el stick derecho no apunta');
pad.axes=[0,0,0,0];pad.buttons[9].pressed=true;T.pollInput();assert.strictEqual(T.S.st,'pause','Start no pausa');pad.buttons[9].pressed=false;T.pollInput();
pad.buttons[9].pressed=true;T.pollInput();pad.buttons[9].pressed=false;T.pollInput();assert.strictEqual(T.S.st,'play');
Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[]},configurable:true});T.pollInput();assert(!T.act('right'),'el mando desconectado deja acciones pulsadas');T.AIM.ang=null;
// táctil: el joystick virtual escribe en TOUCHV
T.TOUCHV.right=1;const x1=T.S.p.x;step(20);assert(T.S.p.x>x1+20,'el táctil no mueve');T.TOUCHV.right=0;
// audio con un AudioContext simulado: todos los efectos y la música en sus 3 intensidades sin errores
const fake=()=>new Proxy(function(){},{get:(t,k)=>k==='getChannelData'?()=>new Float32Array(64):k==='value'?0:k==='sampleRate'?44100:fake(),apply:()=>fake(),set:()=>true});
const actx={currentTime:1,state:'running',sampleRate:44100,destination:fake(),resume(){},
 createGain:fake,createOscillator:fake,createBiquadFilter:fake,createDynamicsCompressor:fake,createBufferSource:fake,createBuffer:()=>({getChannelData:()=>new Float32Array(64)})};
global.window={AudioContext:function(){return actx}};global.setInterval=()=>0;
T.Snd.init();assert(T.Snd.ctx,'el audio no se inicializó');
for(const k of Object.keys(T.SFX)){T.Snd.last={};T.Snd.play(k)}for(const r of 'curlmf')T.Snd.item(r);
for(const mode of ['explora','carga','jefe']){T.start('vanguard',1);if(mode!=='explora')T.useTP();if(mode==='carga')T.S.boss=null;
 for(let i=0;i<40;i++){actx.currentTime+=.1;T.Snd.tick()}}
T.Snd.toggleMute();assert(T.Save.d.settings.mute);T.Snd.toggleMute();
T.start('mage'in T.CHARS?'mage':'chimera',1);step(60*5);  // los ganchos de sonido funcionan durante el juego
console.log('Controles, pausa, récords, mando, táctil y audio: OK');





// Supera una etapa a la fuerza: activa el teletransportador, juega el jefe por sus fases y viaja
function clearStage(secs,choice){const S=T.S;T.useTP();assert(S.boss,'no apareció el jefe');const bs=S.bosses.slice(),id=bs.map(b=>b.def.name).join('+');
 assert.strictEqual(bs.length,S.loop?2:1,'número de jefes incorrecto para el ciclo');
 for(let f=0;f<60*secs&&T.S.st!=='over'&&T.S.boss;f++){T.mouse.l=T.mouse.r=f%50<40;if(f%300===0)T.S.p.hp=T.S.p.maxHp;
  if(f%40===0)for(const b of bs)if(!b.dead){b.hidden=0;b.ghost=0;T.hurtE(b,b.maxHp*.035,{raw:1})}step()}
 if(T.S.st==='over')return;for(const b of bs)for(let i=0;i<3&&!b.dead;i++){b.hidden=0;b.ghost=0;T.hurtE(b,1e12,{raw:1})}
 assert(T.S.bossDone,id+' no murió');for(const b of bs)assert.strictEqual(b.ph,3,b.def.name+' se saltó una fase');
 T.S.tp.charge=1;step(2);assert.strictEqual(T.S.tp.state,'ready');T.useTP(choice)}
// Matriz: cada personaje × dificultad recorre las 5 etapas (15 s explorando + jefe), vida rellenada → busca excepciones
let fails=0;
for(const ch of Object.keys(T.CHARS))for(let d=0;d<T.DIFFS.length;d++){
 try{reset();T.start(ch,d);Object.assign(T.mouse,{x:700,y:300});T.keys.ShiftLeft=T.keys.KeyQ=1;
  for(let st=0;st<T.STAGES.length&&T.S.st!=='over';st++){assert.strictEqual(T.S.stage,st);
   for(let f=0;f<60*15;f++){T.keys.KeyD=(f/120|0)%2;T.keys.KeyA=!T.keys.KeyD;T.mouse.l=T.mouse.r=f%50<40;if(f%300===0)T.S.p.hp=T.S.p.maxHp;step()}
   clearStage(30)}
  if(T.S.st!=='over'){assert.strictEqual(T.S.loop,1,'no empezó el Loop 2 tras la etapa 5');assert.strictEqual(T.S.stage,0);
   for(let f=0;f<60*8;f++){T.mouse.l=f%50<40;if(f%300===0)T.S.p.hp=T.S.p.maxHp;step()}
   clearStage(20,'end')}
  assert.strictEqual(T.S.st,'over','la partida no terminó al elegir «Terminar run»');
 }catch(e){fails++;console.log('FALLO',ch,d,e.stack.split('\n').slice(0,3).join(' | '))}}

// Bot que apunta al enemigo más cercano y suelta los botones a ratos
function bot(ch,d,secs){reset();T.start(ch,d);T.keys.ShiftLeft=T.keys.KeyQ=1;let f=0;
 for(;f<60*secs&&T.S.st!=='over';f++){const e=T.S.en.reduce((b,e)=>!b||Math.abs(e.x-T.S.p.x)<Math.abs(b.x-T.S.p.x)?e:b,null);T.mouse.l=T.mouse.r=f%50<40;
  if(e){T.mouse.x=e.x-T.S.cam;T.mouse.y=e.y-e.h/2;T.keys.KeyA=e.x>T.S.p.x&&Math.abs(e.x-T.S.p.x)<200;T.keys.KeyD=!T.keys.KeyA}
  if(f%20===0&&T.S.near&&(T.S.near.k!=='chest'||T.S.p.gold>=T.priceOf(T.S.near)))T.interact();step()}
 return {t:f/60,k:T.S.kills,items:Object.values(T.S.p.items).reduce((a,b)=>a+b,0)}}
// DPS contra muñecos aturdidos e inmortales (20 s, sin habilidad de movimiento): 1 objetivo y grupo de 5
function dps(ch,n){reset();T.start(ch,1);const S=T.S;S.spawn=1e9;
 for(let i=0;i<n;i++){T.spawnEnemy('brute',380+i*30,500,true);const e=S.en[S.en.length-1];e.hp=e.maxHp=1e7;e.stunT=1e9;e.x0=e.x}
 T.keys.KeyQ=1;T.mouse.x=400-S.cam;T.mouse.y=478;
 for(let f=0;f<60*20;f++){S.spawn=1e9;S.p.x=300;for(const e of S.en)if(e.x0){e.x=e.x0;e.y=500}T.mouse.l=T.mouse.r=f%50<40;step()}
 return S.en.reduce((a,e)=>a+e.maxHp-e.hp,0)/20}
const dr=Object.keys(T.CHARS).map(ch=>[T.CHARS[ch].name,dps(ch,1),dps(ch,5)]).sort((a,b)=>b[1]-a[1]);
console.log('DPS (1 objetivo · grupo de 5):\n'+dr.map(([n,a,b])=>`  ${n.padEnd(14)} ${a.toFixed(0).padStart(5)} · ${b.toFixed(0).padStart(5)}`).join('\n'));
// Supervivencia sin ayuda por dificultad (indicador de balance, no es una prueba)
const surv=T.DIFFS.map((df,d)=>{let tot=0,it=0;for(const ch of Object.keys(T.CHARS)){const r=bot(ch,d,120);tot+=r.t;it+=r.items}const N=Object.keys(T.CHARS).length;return `${df.name}: ${(tot/N).toFixed(0)}s (${(it/N).toFixed(1)} obj.)`});
console.log('Supervivencia media del bot (máx 120s):',surv.join(' · '));
console.log(fails?`${fails} combinaciones fallaron`:'Matriz personajes × dificultades: 0 excepciones');
// 28. Modo Infinito
{reset();T.start('vanguard',1);const pal=T.STAGE.sky[0],c1=T.coef();
 T.S.loop=1;T.loadStage(0);assert.notStrictEqual(T.STAGE.sky[0],pal,'el ciclo no cambió la paleta');assert(/Eclipse/.test(T.STAGE.name));
 assert(T.coef()>c1*1.4,'la dificultad no escala con el ciclo');assert(T.capL(.6)>.6&&T.capL(.6)<=.95,'los topes no se relajan');
 // cada combinación jefe + acompañante aparece y combate sin errores; el acompañante nunca es el mismo jefe
 for(let l=1;l<=4;l++)for(let st=0;st<T.STAGES.length;st++){T.start('vanguard',1);T.S.loop=l;T.loadStage(st);T.S.spawn=1e9;T.useTP();
  const [a,b]=T.S.bosses;assert(a&&b&&a.def!==b.def,'jefes duales incorrectos en etapa '+st);step(60*6)}
 // guardar y continuar conserva el ciclo
 T.start('artillery',1);T.S.loop=2;T.loadStage(3);T.saveRun();const r=T.loadRun();assert.strictEqual(r.loop,2);T.start(r.cid,r.did,r);assert(T.S.loop===2&&T.S.stage===3,'continuar perdió el ciclo');
 // terminar la run a mitad del primer ciclo: no es victoria, pero puntúa con la etapa superada
 T.start('vanguard',1);T.useTP();for(let i=0;i<3;i++)T.hurtE(T.S.bosses[0],1e12,{raw:1});T.S.tp.charge=1;step(2);T.S.p.x=T.S.tp.x-30;
 T.useTP('end');assert.strictEqual(T.S.st,'over');assert.strictEqual(T.loadRun(),null,'terminar la run no borró la partida guardada');
 console.log('Modo Infinito: paletas, escalado, jefes duales, guardado y portal dual: OK')}
// 27. Cuentas y clasificación online (contra el Firebase simulado)
async function authTests(){const A=T.Auth;
 assert(A.valid('ab','123456')&&A.valid('ñandú','123456')&&A.valid('Piloto','12345'),'aceptó un nombre o contraseña inválidos');
 assert.strictEqual(await A.register('Piloto','clave1'),'');assert.strictEqual(A.user,'Piloto');assert(A.ses.uid&&A.ses.refresh);
 assert(/en uso/.test(await A.register('piloto','otra123')),'permitió un nombre repetido cambiando mayúsculas');
 A.setSession(null);assert(/incorrectos/.test(await A.login('Piloto','malamala')));assert.strictEqual(A.user,null);
 assert.strictEqual(await A.login('PILOTO','clave1'),'');assert.strictEqual(A.user,'Piloto','no recuperó el nombre visible');
 assert(!/clave1/.test(JSON.stringify(A.ses)),'la contraseña quedó guardada en el dispositivo');
 // la puntuación sube con el progreso y con la dificultad
 const r={kills:100,lvl:10,stages:3,loop:1,win:false,time:600,diff:1};
 assert(T.scoreRun({...r,stages:4})>T.scoreRun(r)&&T.scoreRun({...r,loop:2})>T.scoreRun(r)&&T.scoreRun({...r,diff:3})>T.scoreRun(r));
 for(let d=0;d<5;d++){const b=T.seedBoard(d);assert.strictEqual(b.length,12);for(const e of b)assert(e.score===T.scoreRun(e)&&e.loop>=1&&e.user&&e.ch)}
 // una partida real sube al ranking global y queda primera; el relleno ficticio va marcado
 T.start('vanguard',2);T.S.kills=5000;T.S.stage=4;T.S.bossDone=1;let res=A.submit(true);const r1=await res.done;
 assert.strictEqual(r1.rank,1,'la partida récord no quedó primera');assert.strictEqual(FAKE.docs[2].length,1);assert.strictEqual(FAKE.docs[2][0].user,'Piloto');
 let bd=await A.board(2);assert(bd.online&&bd.rows.every((e,i)=>!i||bd.rows[i-1].score>=e.score)&&bd.rows.some(e=>e.seed)&&!bd.rows[0].seed);
 // sin conexión: la partida queda en cola, el ranking usa la copia guardada y se sube al volver la red
 FAKE.offline=true;T.start('vanguard',2);T.S.kills=10;res=A.submit(false);const r2=await res.done;assert(r2.queued,'sin red no quedó en cola');
 bd=await A.board(2);assert(!bd.online&&bd.rows.some(e=>e.pending)&&bd.rows.some(e=>e.user==='Piloto'&&!e.pending),'sin red no usó la copia guardada');
 FAKE.offline=false;await A.flush();assert.strictEqual(FAKE.docs[2].length,2,'la partida en cola no se subió al volver la red');
 // una puntuación manipulada (otro nombre) la rechaza el servidor y se descarta de la cola
 T.start('vanguard',2);A.user='OtroJugador';A.submit(false).done.catch(()=>{});await A.flush();A.user='Piloto';
 assert.strictEqual(FAKE.docs[2].length,2,'aceptó una puntuación con otro nombre');
 // token caducado: se renueva solo; invitado: no sube nada
 A.ses.exp=0;assert.strictEqual(await A.token(),'t-'+A.ses.uid);assert(A.ses.exp>Date.now());
 A.setSession(null);T.start('vanguard',2);assert(!A.submit(false).done);assert.strictEqual(FAKE.docs[2].length,2,'el invitado subió una puntuación');
 console.log('Cuentas online, ranking global, cola sin conexión y rechazo de suplantación: OK')}
// 29. Actualizaciones obligatorias
async function updateTests(){const U=T.Update;
 assert.strictEqual(T.APP_VERSION,require('../package.json').version,'js/update.js y package.json tienen versiones distintas');
 assert.strictEqual(require('../version.json').latest,T.APP_VERSION,'version.json no coincide con la versión del juego');
 assert(T.cmpVer('1.10.0','1.9.9')>0&&T.cmpVer('1.1.0','1.1.0')===0&&T.cmpVer('1.0.9','1.1.0')<0);
 // versión opcional: aviso en el menú, sin bloquear
 fakeVersion={latest:'9.0.0',min:T.APP_VERSION,url:'https://github.com/x'};el('update').style.display='none';await U.check();
 assert(!U.required&&el('update').style.display==='none'&&el('updBar').style.display==='block','una versión opcional bloqueó el juego');
 // versión obligatoria en mitad de una partida: espera a que termine y luego bloquea
 T.start('vanguard',1);fakeVersion={latest:'9.0.0',min:'9.0.0'};await U.check();assert(U.required);assert.notStrictEqual(el('update').style.display,'flex','bloqueó en mitad de la partida');
 T.S.st='over';U.block();assert.strictEqual(el('update').style.display,'flex','no bloqueó al terminar la partida');assert.strictEqual(el('menu').style.display,'none');
 // sin conexión se puede jugar
 U.required=false;fakeVersion=null;await U.check();assert(!U.required);
 console.log('Actualizaciones: versión sincronizada, aviso opcional, bloqueo obligatorio y modo sin red: OK')}
authTests().then(updateTests).then(()=>process.exit(fails?1:0),e=>{console.error(e);process.exit(1)});
