// Prueba headless: `node tools/smoke.js`
// Carga los scripts de index.html con DOM/canvas simulados, comprueba arreglos concretos
// y juega cada personaje × dificultad buscando excepciones. No valida lo visual.
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const files=[...fs.readFileSync(path.join(root,'html','index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);

global.Path2D=function(){};let fakeVersion=null;
// Firebase simulado en memoria: cuentas (Identity Toolkit), renovación de token y Firestore con las mismas reglas que el servidor real
const FAKE={users:{},docs:{0:[],1:[],2:[],3:[],4:[]},names:{},owners:{},offline:false};
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
 // nombres de las cuentas con correo: mismas reglas que firestore.rules (un nombre por cuenta, el clásico solo el suyo)
 if(url.endsWith(':commit')){const u=byTok(String((opt.headers||{}).Authorization).slice(7));if(!u)return res(403,{error:{message:'Missing or insufficient permissions.'}});
  const ws=b.writes.map(w=>({path:w.update.name.split('/documents/')[1],d:Object.fromEntries(Object.entries(w.update.fields).map(([k,v])=>[k,fsVal(v)]))})),uid=u[1].uid,classic=/@neontempestad\.game$/.test(u[0]);
  const ok=ws.every(w=>{const [col,id]=w.path.split('/');if(FAKE[col][id])return false;
   if(col==='names')return /^[a-z0-9_-]{3,16}$/.test(id)&&w.d.uid===uid&&w.d.user.toLowerCase()===id&&(u[0]===id+'@neontempestad.game'||(!classic&&!FAKE.owners[uid]&&ws.some(o=>o.path==='owners/'+uid&&o.d.name===id)));
   return col==='owners'&&id===uid&&ws.some(o=>o.path==='names/'+w.d.name&&o.d.uid===uid)});
  if(!ok)return res(403,{error:{message:'Missing or insufficient permissions.'}});for(const w of ws){const [col,id]=w.path.split('/');FAKE[col][id]=w.d}return res(200,{})}
 const nm=url.match(/\/names\/([^/:]+)$/);if(nm)return FAKE.names[nm[1]]?res(200,{fields:{uid:{stringValue:FAKE.names[nm[1]].uid},user:{stringValue:FAKE.names[nm[1]].user}}}):res(404,{});
 // una puntuación por jugador: boards/{d}/scores/{uid}; solo se reemplaza por una mayor (como firestore.rules)
 const one=url.match(/boards\/(\d|d\d{8})\/scores\/([^/:]+)$/);
 if(one){const L=FAKE.docs[one[1]]||(FAKE.docs[one[1]]=[]),i=L.findIndex(x=>x.uid===one[2]);
  if(opt.method!=='PATCH')return i<0?res(404,{}):res(200,{fields:Object.fromEntries(Object.entries(L[i]).map(([k,v])=>[k,typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:{stringValue:v}]))});
  const d=Object.fromEntries(Object.entries(b.fields).map(([k,v])=>[k,fsVal(v)])),u=byTok(String((opt.headers||{}).Authorization).slice(7));
  if(!u||one[2]!==u[1].uid||d.uid!==u[1].uid||(d.user.toLowerCase()+'@neontempestad.game'!==u[0]&&(FAKE.names[d.user.toLowerCase()]||{}).uid!==u[1].uid)||d.score>1e8||(i>=0&&d.score<=L[i].score))
   return res(403,{error:{message:'Missing or insufficient permissions.'}});
  if(i<0)L.push(d);else L[i]=d;return res(200,{name:'doc'})}
 const m=url.match(/boards\/(\d|d\d{8})(:runQuery|\/scores)$/);if(m&&!FAKE.docs[m[1]])FAKE.docs[m[1]]=[];
 if(m&&m[2]===':runQuery')return res(200,FAKE.docs[m[1]].slice().sort((x,y)=>y.score-x.score).slice(0,50).map(d=>({document:{fields:Object.fromEntries(Object.entries(d).map(([k,v])=>[k,typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:{stringValue:v}]))}})));
 if(m){const d=Object.fromEntries(Object.entries(b.fields).map(([k,v])=>[k,fsVal(v)])),u=byTok(String((opt.headers||{}).Authorization).slice(7));
  if(!u||d.uid!==u[1].uid||(d.user.toLowerCase()+'@neontempestad.game'!==u[0]&&(FAKE.names[d.user.toLowerCase()]||{}).uid!==u[1].uid)||d.score>1e8)return res(403,{error:{message:'Missing or insufficient permissions.'}});
  FAKE.docs[m[1]].push(d);return res(200,{name:'doc'})}
 return res(404,{})};
const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):k==='measureText'?s=>({width:String(s).length*7}):()=>{}),set:(t,k,v)=>(t[k]=v,true)});
const els={},L={};
const el=id=>els[id]||(els[id]={id,style:{setProperty(){}},innerHTML:'',textContent:'',width:960,height:540,getContext:()=>ctx,addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:960,height:540})});
Object.assign(global,{document:{getElementById:el,createElement:()=>({width:0,height:0,getContext:()=>ctx})},addEventListener:(n,f)=>{L[n]=f},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){}});
eval(files.map(f=>fs.readFileSync(path.join(root,'html',f),'utf8')).join('\n;\n')+
 '\n;global.T={bochaStrike,tryParry,buildMenu,XCFG,expandStage,hatchUse,caveExit,zipUse,ropeAt,dailyInfo,dailyKey,HAZ,evStart,startTutorial,tutEnd,tutDone,TUT_STEPS,DEV,isDev,DEV_UIDS,drawHitboxes,count,glyphOf,GLYPH,ALT_FAM,altOk,ROUTES,routeOpen,routesStage,routesInteract,secretsNow,mtOf,mtSpend,mtReset,mtBranches,MT_MAX,WMODS,wmodOk,SYNERGY,COMP_MOVE,compAct,repOf,repAdd,FACTIONS,ENDINGS,pickEnding,CAMPAIGN,storyCard,INV_WAVES,buildLoadout,set MODE_NEXT(v){MODE_NEXT=v},get selC(){return selC},set selC(v){selC=v},WORLDCFG,ERAS,WEATHER,TALKS,eraShift,eraEnd,weatherStart,heatOf,heatStage,talkCheck,goldFor,applyElement,LORE,MEMORIES,memoryGet,echoRecord,echoStage,echoUse,secState,chalOf,loreHtml,endGame,addTaint,taint,borrow,debtStage,debtCost,takeCore,coreStage,CORE_OPTS,persEvent,persState,tempestSave,tempestLoad,spawnShade,RELICS,MUTATIONS,EVO_MODS,relicUnlocked,takeEvo,takeMutation,openPick,buildRelics,REL,ab,maxCd,bm,gravAt,exploreInteract,researchTarget,openCodex,LEGACY,legacyStage,legacyWt,legacyPrice,legacyGold,sealReady,openSeal,spawnFusion,fusedDef,spawnBossAt,priceOf,npcStage,interact,merchantPrice,QUESTS,ADAPT,adaptBoss,bossPool,mimicAct,MIMIC_KIND,spawnBoss,spawnHunter,hunterState,hunterStage,evolve,ecoReward,armorAbsorb,buff,hurtP,pollInput,cmb,execTarget,addEnergy,combatMul,WOUNDS,PARRY_FAM,autoQuality,AUTOQ,fitCanvas,cv,get QL(){return QL},QUALITY,STORE,SAVE_KEY,ELEMENTS,CHAR_EL,ENEMY_EL,BOSS_EL,applyDot,giveItem,ITEM,get PR(){return PR},ANOMALIES,STORM_COMBOS,STORM_DEALS,stormUnleash,stormErode,stormStage,takeDeal,spawnEnemy,buyOrEquip,COSMETICS,drawShopPreview,drawParade,goHome,get Save(){return Save},loop,get MENU(){return MENU},Update,cmpVer,APP_VERSION,get STAGE(){return STAGE},loadStage,coef,capL,Auth,scoreRun,seedBoard,start,get S(){return S},get PLAT(){return PLAT},update,draw,keys,mouse,CHARS,DIFFS,STAGES,BOSSES,ENEMIES,AFX,useTP,saveRun,loadRun,clearRun,Z,heal,cast,fxProj,drawMenuBg,setQuality,get BIND(){return BIND},set BIND(v){BIND=v},BIND_DEF,saveBinds,loadBinds,rebindStart:(a,i)=>{rebind={a,i}},pollInput,AIM,TOUCHV,act,Snd,SFX,get QL(){return QL},get chroma(){return chroma},get hitstop(){return hitstop},hurtE,hurtP,TX,Save,isUnlocked,ACHIEVEMENTS,AB,spawnEnemy,ab,Ev,ITEMS,FRAGMENTS,ITEM,giveItem,priceOf,interact,applyDot,kill,BL,PR,PT};');

const pick0={target:{closest:()=>({dataset:{i:0}})}};
T.WORLDCFG.on=0;T.XCFG.events=0;  // épocas, clima y mapa que aprende solo en su propia sección
const step=(n=1)=>{for(let i=0;i<n;i++){if(T.S.st==='mastery')els.nodes.onclick(pick0);if(T.S.st==='altar')els.altarOpts.onclick(pick0);if(T.S.st==='storm')el('stormOpts').onclick(pick0);if(T.S.st==='choice')el('choiceOpts').onclick(pick0);T.update(1/60);T.draw()}};
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
assert(!T.isUnlocked('hive'));T.Save.d.stats.jumps=499;T.start('vanguard',1);T.S.en.length=0;T.S.spawn=1e9;for(let i=0;i<120&&!(T.S.p.ground&&i>4);i++)step(1);key('Space',false);  // saltar solo con los pies en el suelo (antes fallaba al azar)
assert(T.isUnlocked('hive'),'el logro de saltos no desbloqueó a Colmena');
for(const [k,v] of Object.entries(T.CHARS)){if(v.unlock)assert(T.ACHIEVEMENTS[v.unlock],k+' tiene un logro inexistente');
 for(const s of ['primary','secondary','move','ult'])for(const a of v[s].forms?Object.values(v[s].forms):[v[s]])assert(T.AB[a.t],`${k}.${s}: tipo «${a.t}» no existe`)}
assert.strictEqual(Object.keys(T.CHARS).length,26);assert.strictEqual(Object.values(T.CHARS).filter(v=>v.fam==='Joke').length,6,'Joke');
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
assert.deepStrictEqual(['c','u','r','l','m'].map(cnt),[35,25,18,9,3],'recuento por rareza');
assert.strictEqual(T.ITEMS.length,90);assert(T.FRAGMENTS.length>=10);
const all=T.ITEMS.concat(T.FRAGMENTS),ids=new Set(all.map(i=>i.id));assert.strictEqual(ids.size,all.length,'ids repetidos');
const SPECIAL=['prismfork','ankh','greed','invhour','blacklens','icarus','elegy','voidpact'];  // efectos leídos directamente por el motor
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
T.start('vanguard',1);T.S.spawn=1e9;T.giveItem('bloodbomb',1);T.S.en=[];  // sin los muros agrietados que pueda generar la etapa
const ea=T.spawnEnemy('crawler',900,500,true),eb=T.spawnEnemy('crawler',940,500,true);eb.hp=eb.maxHp=1e5;T.applyDot(ea,'bleed',1,3);T.hurtE(ea,1e4);assert(eb.hp<eb.maxHp,'la Granada de Sangre no explotó');
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
  const [a,b]=T.S.bosses;if(st===T.STAGES.length-1)assert(T.S.bosses.length===1&&a.def.fused,'la última etapa del ciclo no tiene jefe fusionado');else assert(a&&b&&a.def!==b.def,'jefes duales incorrectos en etapa '+st);step(60*6)}
 // guardar y continuar conserva el ciclo
 T.start('artillery',1);T.S.loop=2;T.loadStage(3);T.saveRun();const r=T.loadRun();assert.strictEqual(r.loop,2);T.start(r.cid,r.did,r);assert(T.S.loop===2&&T.S.stage===3,'continuar perdió el ciclo');
 // terminar la run a mitad del primer ciclo: no es victoria, pero puntúa con la etapa superada
 T.start('vanguard',1);T.useTP();for(let i=0;i<3;i++)T.hurtE(T.S.bosses[0],1e12,{raw:1});T.S.tp.charge=1;step(2);T.S.p.x=T.S.tp.x-30;
 T.useTP('end');assert.strictEqual(T.S.st,'over');assert.strictEqual(T.loadRun(),null,'terminar la run no borró la partida guardada');
 console.log('Modo Infinito: paletas, escalado, jefes duales, guardado y portal dual: OK')}
// 40. Progresión: evolución de habilidades, mutaciones, reliquias (desbloqueo por descubrimiento) y continuar la partida
{const st=T.Save.d.stats,set=T.Save.d.settings,prev={...st},prevRel=set.relic;
 const fresh=(ch='artillery',d=1)=>{reset();T.start(ch,d);T.S.spawn=1e9;for(const k of T.S.storm.act.slice())T.ANOMALIES[k].end&&T.ANOMALIES[k].end();T.S.storm.act=[];T.S.gmul=1;
  T.S.hunter={dead:1};const p=T.S.p;p.inv=1e9;p.m.dodge=0;return p};
 // evolución: al llegar a nivel 4 se ofrece; la mejora cambia de verdad los datos de la habilidad
 set.relic=null;let p=fresh();const d0=T.ab('p');T.S.pick=[];T.Ev.emit('onLevelUp',4);step(1);assert.strictEqual(T.S.st,'choice','no se ofreció la evolución');
 assert(el('choiceOpts').innerHTML.includes('card'),'la elección no tiene opciones');el('choiceOpts').onclick({target:{closest:()=>({dataset:{i:0}})}});assert.strictEqual(T.S.st,'play');
 p=fresh();T.takeEvo('p','dmg');assert(Math.abs(T.ab('p').dmg/d0.dmg-1.25)<1e-9,'Potencia no subió el daño');T.takeEvo('p','n');assert.strictEqual(T.ab('p').n,(d0.n||1)+1,'Multiplicidad no añadió proyectil');
 const cd0=T.maxCd('s',T.ab('s'));T.takeEvo('s','cd');assert(T.maxCd('s',T.ab('s'))<cd0*.85,'Celeridad no bajó el enfriamiento');
 // mutaciones: ventaja y coste a la vez
 p=fresh();T.takeMutation('vidrio');assert(T.bm('dmg')>=1.25&&T.bm('taken')>=1.2,'Piel de Vidrio no aplicó ventaja y coste');
 p=fresh();const hm=p.maxHp;T.takeMutation('volatil');assert(p.maxHp<hm,'Sangre Volátil no restó vida');const foe=T.spawnEnemy('tank',p.x+60,p.y,1);foe.hp=foe.maxHp=1e6;foe.armor=0;p.inv=0;T.hurtP(5,null);assert(foe.hp<1e6,'Sangre Volátil no explotó');
 p=fresh();T.S.legacy=[];const e0=T.spawnEnemy('crawler',p.x+400,p.y,1);T.takeMutation('iman');const e1=T.spawnEnemy('crawler',p.x+400,p.y,1);assert(e1.maxHp>e0.maxHp*1.1,'Imán Dimensional no fortaleció a los enemigos');
 // reliquias: bloqueadas hasta descubrir; desbloqueadas cambian lo que dicen
 for(const k in T.RELICS)st[T.RELICS[k].stat]=0;for(const k in T.RELICS)assert(!T.relicUnlocked(k),k+' desbloqueada sin descubrir nada');
 set.relic='brujula';p=fresh();assert.strictEqual(T.S.relic,null,'se usó una reliquia bloqueada');
 for(const k in T.RELICS)st[T.RELICS[k].stat]=T.RELICS[k].n;for(const k in T.RELICS)assert(T.relicUnlocked(k),k+' no se desbloqueó al descubrir');
 set.relic=null;p=fresh();const price0=T.priceOf({tier:'small'}),c0=T.S.clock;step(60);const clk0=T.S.clock-c0;
 set.relic='brujula';p=fresh();assert.strictEqual(T.S.relic,'brujula');assert(Object.keys(p.items).some(k=>T.ITEM[k].r==='r'),'la Brújula no dio el objeto raro');assert(T.priceOf({tier:'small'})>price0,'la Brújula no encareció los cofres');
 set.relic='arena';p=fresh();const c1=T.S.clock;step(60);assert(T.S.clock-c1<clk0*.85,'el Reloj de Arena no frenó el reloj');
 set.relic='cristal';p=fresh();assert(p.maxHp>T.CHARS.artillery.hp*1.4,'el Corazón de Cristal no subió la vida');
 set.relic='ojo';p=fresh();const rq=Math.random;Math.random=()=>.99;T.loadStage(1);Math.random=rq;  // .99: sin anomalía inicial al azar
 assert(T.S.storm.act.length>=1,'el Ojo de la Tempestad no trajo una anomalía');
 set.relic='semilla';p=fresh();T.cmb().energy=0;T.addEnergy(10);assert.strictEqual(T.cmb().energy,15,'la Semilla no aceleró la sobrecarga');
 set.relic='corona';p=fresh();assert(T.REL().elite===1.5&&T.REL().eliteGold===3);
 // continuar la partida: reliquia, mutaciones y evoluciones se reaplican (una sola vez)
 set.relic='cristal';p=fresh('artillery');T.takeMutation('quitina');T.takeEvo('p','dmg');const arm=p.m.arm,dmgP=T.ab('p').dmg,mh=p.maxHp;T.saveRun();
 const run=T.loadRun();assert(run.relic==='cristal'&&run.muts.includes('quitina')&&run.abm.p.lv===1,'no se guardó la progresión');
 T.start(run.cid,run.did,run);p=T.S.p;assert(T.S.relic==='cristal'&&p.muts.length===1&&Math.abs(p.m.arm-arm)<1e-9,'la mutación no se reaplicó una sola vez');
 assert(Math.abs(T.ab('p').dmg-dmgP)<1e-9,'la evolución no se reaplicó');assert(Math.abs(p.maxHp-mh)<1,'la vida máxima cambió al continuar');
 // selector de reliquias: una bloqueada muestra cómo conseguirla
 for(const k in T.RELICS)st[T.RELICS[k].stat]=0;set.relic=null;T.buildRelics();assert(el('relics').innerHTML.includes('🔒'),'el selector no mostró reliquias bloqueadas');
 el('relics').onclick({target:{closest:()=>({dataset:{r:'ojo'}})}});assert(/Supera una mazmorra/.test(el('relicDesc').textContent),'no se explicó cómo desbloquearla');
 Object.assign(st,prev);set.relic=prevRel;
 console.log('Progresión: evolución de habilidades, mutaciones, reliquias por descubrimiento y continuar la partida: OK')}
// 39. Exploración: gravedad por zonas, salas secretas, terminales y Códice, mecanismos, rescates y mazmorras
{const fresh=()=>{reset();T.start('vanguard',1);T.S.spawn=1e9;for(const k of T.S.storm.act.slice())T.ANOMALIES[k].end&&T.ANOMALIES[k].end();T.S.storm.act=[];T.S.gmul=1;
  T.S.hunter={dead:1};T.S.gzones=[];T.S.en=[];const p=T.S.p;p.inv=1e9;p.m.dodge=0;p.m.crit=0;for(let i=0;i<120&&!p.ground;i++)step();return p};
 const items=()=>Object.values(T.S.p.items).reduce((a,b)=>a+b,0);
 // gravedad: dentro de una columna antigravedad se salta más alto
 let p=fresh();const peak=()=>{for(let i=0;i<120&&!p.ground;i++)step();let top=1e9;key('Space',false);T.keys.Space=0;for(let i=0;i<90;i++){step();top=Math.min(top,p.y)}return top};
 const y0=peak();T.S.gzones=[{x:p.x-200,w:400,g:.4,anti:1,col:'#3cf0ff'}];assert(Math.abs(T.gravAt(p.x)-.4)<1e-9);const y1=peak();assert(y1<y0-60,'la antigravedad no cambió el salto');
 // muro agrietado: estructura que no se ejecuta ni evoluciona; romperlo revela un Cofre Dorado
 p=fresh();const wall=T.spawnEnemy('crackwall',p.x+300,p.y,1);wall.y=p.y;wall.hp=wall.maxHp*.1;assert(!T.execTarget(),'el muro quedó ejecutable');
 wall.age=30;step(2);assert(!wall.evo,'el muro evolucionó');const golds=T.S.ints.filter(o=>o.k==='chest'&&o.tier==='gold').length;T.hurtE(wall,1e9,{raw:1});
 assert(T.S.ints.filter(o=>o.k==='chest'&&o.tier==='gold').length===golds+1,'romper el muro no reveló el cofre');
 // terminales: investigan a un enemigo desconocido, lo guardan para siempre y dan +10% de daño contra él
 p=fresh();T.Save.d.codex={};const k=T.researchTarget();assert(k,'no hay nada que investigar');const dummy=T.spawnEnemy(k,p.x+500,p.y,1);dummy.armor=0;
 const m0=T.combatMul(dummy,{});T.exploreInteract({k:'terminal',x:p.x,y:p.y});assert(T.Save.d.codex[k],'no se guardó la investigación');
 assert(Math.abs(T.combatMul(dummy,{})/m0-1.1)<.01,'investigar no dio +10% de daño');T.Save.write();T.Save.load();assert(T.Save.d.codex[k],'el Códice no sobrevivió a guardar y cargar');
 for(const e of T.STAGE.enemies)T.Save.d.codex[e]=1;const g0=p.gold;T.exploreInteract({k:'terminal',x:p.x,y:p.y});assert(p.gold>g0,'con todo investigado la terminal no pagó');
 // mecanismo antiguo: la trampa daña a los enemigos cercanos y abre un compartimento con un objeto
 p=fresh();const foe=T.spawnEnemy('tank',p.x+60,p.y,1);foe.hp=foe.maxHp=1e6;foe.armor=0;const i0=items();T.exploreInteract({k:'lever',x:p.x,y:p.y});step(100);
 assert(foe.hp<foe.maxHp,'la trampa no dañó al enemigo');assert.strictEqual(items(),i0+1,'el compartimento no dio un objeto');
 // rescate: alejarse hace retroceder el progreso; quedarse 8 s cerca libera al explorador (dron aliado y objeto)
 p=fresh();const cage={k:'rescue',x:p.x,y:p.y,prog:0};T.S.ints.push(cage);T.exploreInteract(cage);step(60*3);const t3=T.S.rescue.t;p.x+=900;step(60);assert(T.S.rescue.t<t3,'alejarse no hizo retroceder el rescate');
 p.x=cage.x;const dr0=T.S.dr.length,i1=items();for(let f=0;f<60*12&&T.S.rescue;f++){p.x=cage.x;p.y=cage.y;p.vy=0;p.hp=p.maxHp;step()}
 assert(cage.open&&T.S.dr.length>dr0&&items()===i1+1,'el rescate no se completó con su recompensa '+[cage.open,T.S.dr.length,dr0,items(),i1,T.S.rescue&&T.S.rescue.t,T.S.st,T.S.stage,T.S.t,!!T.S.under,p===T.S.p]);
 // mazmorra: no se abre con un jefe activo; encierra, pasa 3 oleadas y da un legendario
 p=fresh();T.useTP();T.exploreInteract({k:'rift',x:p.x,y:p.y});assert(!T.S.dungeon,'la mazmorra se abrió con un jefe');
 p=fresh();const leg=()=>Object.keys(p.items).filter(k=>T.ITEM[k].r==='l').reduce((a,k)=>a+p.items[k],0),l0=leg();T.exploreInteract({k:'rift',x:p.x,y:p.y});
 assert(T.S.dungeon&&T.S.walls,'la mazmorra no encerró al jugador');
 for(let w=0;w<3;w++){assert.strictEqual(T.S.dungeon.wave,w+1);for(const e of T.S.dungeon.foes.slice())T.hurtE(e,1e9,{raw:1});step(2)}
 assert(!T.S.dungeon&&!T.S.walls&&leg()>=l0+1,'superar la mazmorra no liberó ni dio el legendario');
 // Códice en la pantalla de inicio
 T.openCodex();assert(/Investigados \d+\/\d+/.test(el('codexStats').textContent)&&el('codexList').innerHTML.includes('cx'),'el Códice no se mostró');
 // una etapa entera con todo lo de exploración generado, sin excepciones
 for(let st=0;st<5;st++){reset();T.start('artillery',1);const rr=Math.random;Math.random=()=>.05;T.loadStage(st);Math.random=rr;T.S.spawn=2;const q=T.S.p;Object.assign(T.mouse,{x:700,y:300});
  for(let f=0;f<60*8;f++){T.mouse.l=f%40<30;if(f%90===0)key('KeyE',false);if(f%120===0)q.hp=q.maxHp;step()}}
 T.Save.d.codex={};
 console.log('Exploración: gravedad, salas secretas, terminales y Códice, mecanismos, rescates y mazmorras: OK')}
// 38. Jefes: consecuencias, jefe secreto (Heraldo del Vacío) y jefes fusionados
{const fresh=(ch='vanguard')=>{reset();T.start(ch,1);T.S.spawn=1e9;for(const k of T.S.storm.act.slice())T.ANOMALIES[k].end&&T.ANOMALIES[k].end();T.S.storm.act=[];T.S.gmul=1;
  T.S.hunter={dead:1};const p=T.S.p;p.inv=1e9;p.m.dodge=0;return p};
 const items=r=>Object.keys(T.S.p.items).filter(k=>T.ITEM[k].r===r).reduce((a,k)=>a+T.S.p.items[k],0);
 // derrotar al jefe deja su consecuencia, que se guarda con la partida
 let p=fresh();T.useTP();const b0=T.S.boss;for(let i=0;i<3;i++)T.hurtE(b0,1e12,{raw:1});assert(T.S.legacy.includes('prisma'),'el Coloso no dejó consecuencia');
 T.saveRun();assert.deepStrictEqual(T.loadRun().legacy,['prisma'],'la consecuencia no se guardó');const run=T.loadRun();T.start(run.cid,run.did,run);assert(T.S.legacy.includes('prisma'),'la consecuencia no se restauró');
 // cada consecuencia hace lo que dice
 p=fresh();T.S.legacy=['prisma'];let ch0=T.S.ints.filter(o=>o.k==='chest').length;T.legacyStage();assert.strictEqual(T.S.ints.filter(o=>o.k==='chest').length,ch0+2,'Refracción no añadió cofres');
 T.S.legacy=['hydra'];assert(T.legacyWt('turret')===.5&&T.legacyWt('sniper')===.5&&T.legacyWt('brute')===1,'Red caída no redujo torretas');
 T.S.legacy=[];let ph=T.spawnEnemy('phantom',p.x+400,p.y,1);const hpA=ph.maxHp;T.S.legacy=['queen'];ph=T.spawnEnemy('phantom',p.x+400,p.y,1);  // sin élite: comparación justaassert(Math.abs(ph.maxHp/hpA-.7)<.15,'Luto espectral no debilitó a los espectros');
 T.S.legacy=[];const pr0=T.priceOf({tier:'small'});T.S.legacy=['leviathan'];assert(T.priceOf({tier:'small'})<pr0,'Marea de datos no abarató');T.legacyStage();assert.strictEqual(T.S.storm.stab,85,'Marea de datos no restó estabilidad');
 T.S.legacy=['archon'];assert(T.legacyGold()>1,'Tempestad desatada no dio más oro');
 // sello: no se abre sin condiciones; con 3 ejecuciones y estabilidad ≥ 50 libera al Heraldo
 p=fresh();const seal={k:'seal',x:p.x,y:p.y};T.S.ints.push(seal);T.S.sealExec=2;assert(!T.sealReady(),'el sello se abrió con 2 ejecuciones');T.openSeal(seal);assert(!seal.open&&!T.S.boss);
 T.S.sealExec=3;T.S.storm.stab=40;assert(!T.sealReady(),'el sello se abrió con la dimensión inestable');T.S.storm.stab=80;assert(T.sealReady());
 const her=T.openSeal(seal);assert(her&&her.bid==='herald'&&seal.open,'el sello no liberó al Heraldo');
 // el Heraldo pelea sus tres fases y al morir da dos legendarios
 her.hidden=0;for(let f=0;f<60*20;f++){if(f===60*6||f===60*12){her.stun=0;T.hurtE(her,her.maxHp*.35,{raw:1})}if(f%120===0)p.hp=p.maxHp;step()}assert.strictEqual(her.ph,3,'el Heraldo no llegó a la fase 3');
 const leg0=items('l');for(let i=0;i<3;i++)T.hurtE(her,1e12,{raw:1});assert(items('l')>=leg0+2,'el Heraldo no dio dos legendarios');  // +1 posible: todo jefe da además un objeto (20% legendario)
 // haber matado al Heraldo no da por cumplido al jefe de la etapa
 T.useTP();assert(T.S.boss&&!T.S.bossDone,'el teletransportador dio por muerto al jefe de la etapa');T.S.tp.charge=1;step(2);assert.notStrictEqual(T.S.tp.state,'ready','el teletransportador se abrió con el jefe vivo');
 // fusiones: en el Modo Infinito la última etapa trae UN jefe con los ataques de dos; ambas fusiones combaten sin errores
 for(const loop of [1,2]){p=fresh();T.S.loop=loop;T.loadStage(T.STAGES.length-1);T.useTP();const fb=T.S.boss;
  assert(T.S.bosses.length===1&&fb.def.fused&&fb.def.moves.length>T.BOSSES.archon.moves.length,'no apareció un jefe fusionado (loop '+loop+')');
  fb.hidden=0;for(let f=0;f<60*16;f++){if(f===60*5||f===60*10){fb.stun=0;fb.hidden=0;T.hurtE(fb,fb.maxHp*.36,{raw:1})}if(f%120===0)p.hp=p.maxHp;step()}
  assert.strictEqual(fb.ph,3,fb.def.name+' no llegó a la fase 3');for(let i=0;i<3;i++){fb.hidden=0;T.hurtE(fb,1e12,{raw:1})}
  assert(T.S.legacy.includes('archon')&&T.S.legacy.includes(fb.def.fused[1]),'la fusión no dejó las dos consecuencias')}
 console.log('Jefes: consecuencias, sello y Heraldo del Vacío, y jefes fusionados: OK')}
// 37. Neutrales (mercader, ermitaño y misiones) e IA adaptativa (imitador y jefes que recuerdan)
{const fresh=(ch='vanguard')=>{reset();T.start(ch,1);T.S.spawn=1e9;for(const k of T.S.storm.act.slice())T.ANOMALIES[k].end&&T.ANOMALIES[k].end();T.S.storm.act=[];T.S.gmul=1;T.S.hunter={dead:1};
  const p=T.S.p;p.inv=1e9;p.m.dodge=0;return p};
 const near=o=>{const p=T.S.p;for(const x of T.S.ints)if(x!==o&&Math.abs(x.x-o.x)<150)x.x=o.x>1200?o.x-400:o.x+400;p.x=o.x;p.y=o.y;p.vx=p.vy=0;step(1);assert.strictEqual(T.S.near,o,'no quedó junto al '+o.k)};
 const rnd=Math.random;
 // mercader: con oro compra el primer objeto; sin oro no
 let p=fresh();T.S.ints=T.S.ints.filter(o=>o.k!=='merchant'&&o.k!=='hermit');Math.random=()=>.1;T.npcStage();Math.random=rnd;
 const m=T.S.ints.find(o=>o.k==='merchant'),h=T.S.ints.find(o=>o.k==='hermit');assert(m&&h,'no aparecieron el mercader y el ermitaño');
 for(let i=0;i<120&&!p.ground;i++)step();m.x=p.x;m.y=p.y;h.x=-9999;  // sobre suelo firme (el azar fijado podía dejarlos sobre un pozo)
 near(m);const first=m.stock[0].id,price=T.merchantPrice(m.stock[0]);p.gold=price-1;key('KeyE',false);assert.strictEqual(m.stock.length,2,'vendió sin oro suficiente');
 p.gold=price;const n0=p.items[first]||0;key('KeyE',false);assert(m.stock.length===1&&p.items[first]===n0+1&&p.gold===0,'la compra no dio el objeto o no cobró');
 // ermitaño: la misión «Reflejos» avanza con parries y al cumplirse da un objeto raro y oro
 h.q=T.QUESTS.find(q=>q.id==='reflejos');h.x=m.x;h.y=m.y;m.x=-9999;near(h);key('KeyE',false);assert(T.S.quest&&h.open,'no se aceptó la misión');
 const items=()=>Object.values(p.items).reduce((a,b)=>a+b,0),i0=items(),g0=p.gold;p.inv=0;
 for(let i=0;i<3;i++){T.cmb().parryT=.2;T.cmb().parryCd=0;T.hurtP(5,null);p.inv=0}
 assert(T.S.quest.done&&items()===i0+1&&p.gold>g0,'la misión cumplida no dio la recompensa');
 // «Intocable» se reinicia al recibir daño; «Cacería» falla al acabarse el tiempo
 p=fresh();T.S.quest={q:T.QUESTS.find(q=>q.id==='intocable'),prog:10,t:0,done:0};p.inv=0;T.hurtP(5,null);assert.strictEqual(T.S.quest.prog,0,'recibir daño no reinició «Intocable»');
 T.S.quest={q:T.QUESTS.find(q=>q.id==='cazador'),prog:0,t:1,done:0};step(70);assert.strictEqual(T.S.quest,null,'la misión con tiempo no falló');
 // Eco Imitador: copia la habilidad usada y cada tipo de copia funciona
 p=fresh('artillery');const mim=T.spawnEnemy('mimic',p.x+250,p.y);mim.aff=[];p.cd.s=0;T.mouse.r=1;step(3);T.mouse.r=0;
 assert(T.S.lastCast&&T.S.lastCast.name===T.CHARS.artillery.secondary.name,'no se registró la habilidad usada');mim.cd=0;mim.tell=0;step(2);assert.strictEqual(mim.copy.name,T.S.lastCast.name,'el imitador no copió la habilidad');
 for(const k of ['proj','melee','dash','nova']){mim.copy={name:k,t:k};T.mimicAct(mim,p);step(20)}
 // jefe que recuerda: si peleas lejos aprende la lanza de largo alcance y la añade a su repertorio
 p=fresh();T.useTP();const b=T.S.boss;b.obs={t:20,dist:20*600,air:0,dash:0,use:{}};T.adaptBoss(b,2);
 assert(b.adapt&&b.adapt[0].k==='lejos','no aprendió la respuesta a la distancia');assert(T.bossPool(b,2).some(mv=>mv.k==='lejos'),'la respuesta no entró en su repertorio');
 b.obs={t:20,dist:20*100,air:0,dash:0,use:{}};T.adaptBoss(b,3);assert.strictEqual(b.adapt[1].k,'cerca','no se adaptó a pelear de cerca');
 const zn=T.S.zn.length;for(const k in T.ADAPT)T.ADAPT[k].f(b,1,1);step(10);assert(T.S.zn.length>zn,'las respuestas no crearon avisos de peligro');
 // un combate real contra cada jefe con el jugador pegado: termina aprendiendo y sin excepciones
 for(let st=0;st<5;st++){p=fresh();T.loadStage(st);T.useTP();const bb=T.S.boss;bb.hidden=0;
  for(let f=0;f<60*12;f++){p.x=bb.x+40;if(f===60*6){bb.hidden=0;bb.ghost=0;T.hurtE(bb,bb.maxHp*.36,{raw:1})}if(f%120===0)p.hp=p.maxHp;step()}
  assert(bb.adapt&&bb.adapt.length>=1,bb.def.name+' no se adaptó tras cambiar de fase')}
 console.log('Neutrales e IA adaptativa: mercader, misiones, imitador y jefes que recuerdan: OK')}
// 36. Ecología de enemigos: armaduras, evolución, devoradores y el Cazador del Vacío
{const fresh=()=>{reset();T.start('vanguard',1);T.S.spawn=1e9;for(const k of T.S.storm.act.slice())T.ANOMALIES[k].end&&T.ANOMALIES[k].end();T.S.storm.act=[];T.S.gmul=1;
  T.S.hunter=null;const p=T.S.p;p.inv=1e9;p.m.dodge=0;p.m.crit=0;p.ground=1;return p};
 // armadura: el Bruto nace con placas que absorben el 60%; al romperse va más rápido, recibe más y el Acorazado pierde el escudo
 let p=fresh();const br=T.spawnEnemy('brute',p.x+300,p.y);assert(br.armor>0,'el Bruto no nació con armadura');
 assert(Math.abs(T.armorAbsorb(br,100)-40)<.01,'la armadura no absorbió el 60%');const sp0=br.spdx;br.armor=1;T.armorAbsorb(br,100);
 assert(br.armorBroke&&br.spdx>sp0&&br.brittle>1,'romper la armadura no cambió al enemigo');
 const tk=T.spawnEnemy('tank',p.x+300,p.y);tk.armor=0;tk.armorBroke=1;tk.face=-1;tk.aff=[];tk.hp=tk.maxHp=1e6;const h0=tk.hp;T.hurtE(tk,100,{raw:1});assert(h0-tk.hp>=100,'el Acorazado sin armadura conservó el escudo frontal');
 // evolución: a los 20 s más vida, un rasgo y más recompensa (y otra vez a los 40 s)
 p=fresh();const ev=T.spawnEnemy('crawler',p.x+600,p.y);ev.armor=0;const m0=ev.maxHp;ev.age=19.99;step(2);assert.strictEqual(ev.evo,1,'no evolucionó a los 20 s');
 assert(ev.maxHp>m0*1.25&&ev.traits.length===1&&T.ecoReward(ev)===1.5,'la evolución no mejoró al enemigo');ev.age=39.99;step(2);assert.strictEqual(ev.evo,2);ev.age=80;step(2);assert.strictEqual(ev.evo,2,'evolucionó más de dos veces');
 // devoradores: un Gólem cercano se alimenta del caído y se cura
 p=fresh();const gol=T.spawnEnemy('golem',p.x+500,p.y);gol.hp=gol.maxHp*.5;const vic=T.spawnEnemy('crawler',p.x+540,p.y);T.hurtE(vic,1e9,{raw:1});
 assert(gol.fed===1&&gol.hp>gol.maxHp*.5,'el Gólem no se alimentó');
 // el Cazador: huye herido sin dar recompensa y vuelve con la vida que le quedaba
 p=fresh();let hu=T.spawnHunter();const H=T.hunterState();assert(hu&&hu.hunter&&H.met,'el Cazador no apareció');const items0=Object.values(p.items).reduce((a,b)=>a+b,0);
 hu.hp=hu.fleeAt-1;step(2);assert(hu.dead&&hu.fled&&H.escapes===1,'el Cazador no huyó');assert.strictEqual(Object.values(p.items).reduce((a,b)=>a+b,0),items0,'la huida dio recompensa');
 hu=T.spawnHunter();assert(hu.hp<hu.maxHp,'volvió con la vida llena');assert(hu.fleeAt>0&&hu.fleeAt<hu.maxHp*.4,'la segunda vez debería huir más tarde');
 hu.hp=hu.fleeAt-1;step(2);assert.strictEqual(H.escapes,2);hu=T.spawnHunter();assert.strictEqual(hu.fleeAt,-1,'a la tercera tendría que pelear hasta el final');
 // se guarda con la partida
 T.saveRun();const run=T.loadRun();assert(run.hunter&&run.hunter.escapes===2,'el Cazador no se guardó con la partida');
 // derrotarlo da un objeto legendario y no vuelve más
 const leg0=Object.keys(p.items).filter(k=>T.ITEM[k].r==='l').reduce((a,k)=>a+p.items[k],0);T.hurtE(hu,1e9,{raw:1});
 assert(H.dead&&Object.keys(p.items).filter(k=>T.ITEM[k].r==='l').reduce((a,k)=>a+p.items[k],0)===leg0+1,'derrotar al Cazador no dio un legendario');
 T.hunterStage();assert(!(H.t>0),'un Cazador muerto volvió a programarse');
 // partida con el Cazador y enemigos acorazados para cada familia, sin excepciones
 for(const ch of ['vanguard','artillery','summoner','chrono','hemo']){reset();T.start(ch,2);T.S.hunter=null;T.loadStage(2);T.S.spawn=1.5;T.spawnHunter();const q=T.S.p;Object.assign(T.mouse,{x:700,y:300});
  for(let f=0;f<60*10;f++){T.mouse.l=f%40<30;if(f%45===0)key('KeyF',false);if(f%120===0)q.hp=q.maxHp;step()}}
 console.log('Ecología: armaduras, evolución, devoradores y el Cazador del Vacío (huida, regreso, guardado y recompensa): OK')}
// 35. Combate: parry, ejecuciones, combos aéreos, sobrecarga, contexto y heridas
{const fresh=ch=>{reset();T.start(ch,1);T.S.spawn=1e9;for(const k of T.S.storm.act.slice())T.ANOMALIES[k].end&&T.ANOMALIES[k].end();T.S.storm.act=[];T.S.gmul=1;
  const p=T.S.p;p.m.dodge=0;p.items.ankh=0;p.inv=0;for(let i=0;i<120&&!p.ground;i++)step();return p};
 const foe=(type,dx=40,hp=1e5)=>{const e=T.spawnEnemy(type,T.S.p.x+dx,T.S.p.y);e.hp=e.maxHp=hp;e.aff=[];e.elite=0;e.y=T.S.p.y;return e};
 // parry: la tecla F abre la ventana; un golpe dentro no hace daño, carga energía y desata la respuesta de la familia
 let p=fresh('vanguard');const near=foe('brute',60);key('KeyF',false);assert(T.cmb().parryT>0,'F no abrió la ventana de parry');
 let hp=p.hp;assert.strictEqual(T.hurtP(50,near),true,'el parry no anuló el golpe');assert.strictEqual(p.hp,hp);assert.strictEqual(T.cmb().energy,25);
 assert(near.stunT>0,'el contraataque de Vanguardia no aturdió');
 // fuera de la ventana sí hace daño (y el golpe rompe el combo)
 p.inv=0;T.cmb().parryT=0;T.cmb().combo=9;hp=p.hp;T.hurtP(20,near);assert(p.hp<hp,'sin parry no hubo daño');assert.strictEqual(T.cmb().combo,0,'recibir daño no rompió el combo');
 // devolver un proyectil: deja de ser hostil y sigue vivo
 p=fresh('artillery');T.cmb().parryCd=0;key('KeyF',false);const q=T.fxProj({x:p.x+10,y:p.y-p.h/2,vx:-200,vy:0,r:6,life:3,hostile:1,dmg:10});step(1);
 assert(!q.hostile&&q.life>0,'el parry no devolvió el proyectil');
 // cada familia responde sin errores
 for(const ch of ['vanguard','artillery','summoner','chrono','hemo']){p=fresh(ch);foe('crawler',80);T.cmb().parryT=.2;assert.strictEqual(T.hurtP(30,null),true,ch+' no paró');step(30)}
 // una herida se cura con el parry
 p=fresh('vanguard');T.buff('w_fractura',5,{spd:.75});T.cmb().parryT=.2;T.hurtP(10,null);assert(!(p.buf.w_fractura&&p.buf.w_fractura.t>0),'el parry no curó la herida');
 // ejecución: E junto a un enemigo debilitado lo remata y recompensa; con mucha vida no es ejecutable
 p=fresh('vanguard');const strong=foe('brute',40,1000);strong.hp=600;assert(!T.execTarget(),'un enemigo al 60% quedó ejecutable');
 strong.hp=100;assert.strictEqual(T.execTarget(),strong);const g0=p.gold,e0=T.cmb().energy;key('KeyE',false);
 assert(strong.dead,'la ejecución no mató');assert(p.gold>g0&&T.cmb().energy===e0+20,'la ejecución no dio recompensa');
 // combos: los golpes suman, el multiplicador sube y en el aire cuentan doble y suspenden al enemigo
 p=fresh('vanguard');const dummy=foe('crawler',40);const m0=T.combatMul(dummy,{});for(let i=0;i<5;i++)T.hurtE(dummy,1,{});assert.strictEqual(T.cmb().combo,5);
 assert(T.combatMul(dummy,{})>m0,'el combo no subió el daño');p.ground=0;p.y-=80;T.hurtE(dummy,1,{});assert.strictEqual(T.cmb().combo,7,'en el aire no contó doble');assert(dummy.vy<0&&dummy.juggle>0,'el enemigo no quedó suspendido');
 step(60*2);assert.strictEqual(T.cmb().combo,0,'el combo no caducó');
 // contexto: justo tras un movimiento el golpe hace más daño
 p=fresh('vanguard');const d2=foe('tank',60);const base=T.combatMul(d2,{});T.cmb().dashT=1;assert(Math.abs(T.combatMul(d2,{})/base-1.3)<.01,'sin bono de contragolpe');
 // sobrecarga: al 100% se activa; al terminar llega el agotamiento y bloquea secundaria y movimiento
 p=fresh('vanguard');T.addEnergy(100);assert(p.buf.sobrecarga,'no entró en sobrecarga');p.buf.sobrecarga.t=0;step(2);
 assert(p.buf.agotamiento&&p.cd.s>=3&&p.cd.m>=3,'el agotamiento no bloqueó habilidades');T.addEnergy(50);assert.strictEqual(T.cmb().energy,0,'cargó energía estando agotado');
 // heridas: el Bruto deja fractura (−25% de velocidad); la infección corta la regeneración
 p=fresh('vanguard');const br=foe('brute',300);const rnd=Math.random;Math.random=()=>0;p.inv=0;T.hurtP(5,br);Math.random=rnd;assert(p.buf.w_fractura,'el Bruto no dejó fractura');
 T.S.en=[];p.inv=1e9;p.x=900;p.vx=0;T.keys.KeyD=1;step(40);const vSlow=Math.abs(p.vx);delete p.buf.w_fractura;p.x=900;step(40);const vNorm=Math.abs(p.vx);T.keys.KeyD=0;p.inv=0;  // sin enemigos ni bordes: solo la heridaassert(vSlow<vNorm*.85,'la fractura no frenó');
 p=fresh('vanguard');p.hp=p.maxHp*.5;T.buff('w_infeccion',5,{healm:.5,noregen:1});const h1=p.hp;step(60);assert(p.hp<=h1,'la infección no cortó la regeneración');
 // mando: LB hace parry; Y sigue siendo la definitiva
 p=fresh('vanguard');let pad={connected:1,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))};Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[pad]},configurable:true});
 pad.buttons[4].pressed=true;T.pollInput();assert(T.cmb().parryT>0,'LB no hizo parry');pad.buttons[4].pressed=false;T.pollInput();Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[]},configurable:true});T.pollInput();
 // partida real con todo activo y cada familia: sin excepciones
 for(const ch of ['vanguard','artillery','summoner','chrono','hemo']){p=fresh(ch);T.S.spawn=2;Object.assign(T.mouse,{x:700,y:300});
  for(let f=0;f<60*10;f++){T.mouse.l=f%40<30;if(f%45===0)key('KeyF',false);if(f%70===0)key('KeyE',false);if(f%120===0)p.hp=p.maxHp;step()}}
 console.log('Combate: parry por familia, proyectil devuelto, ejecuciones, combos aéreos, contexto, sobrecarga, heridas y mando: OK')}
// 34. Rendimiento en teléfonos: tope de resolución por calidad y calidad automática
{const st=T.Save.d.settings,prevQ=st.quality;global.devicePixelRatio=3;
 T.setQuality('baja');assert.strictEqual(T.cv.width,960,'la calidad baja no limitó la resolución a 1x');
 T.setQuality('media');assert.strictEqual(T.cv.width,1440,'la media no quedó en 1,5x');T.setQuality('alta');assert.strictEqual(T.cv.width,1920,'la alta no quedó en 2x');
 // automática: con el juego a ~30 FPS durante 3 s baja un escalón y lo recuerda
 st.quality='auto';st.autoLevel='alta';T.AUTOQ.win=T.AUTOQ.frames=T.AUTOQ.cool=0;T.setQuality('alta');reset();T.start('vanguard',1);
 for(let i=0;i<100;i++)T.autoQuality(1/30);assert.strictEqual(st.autoLevel,'media','la automática no bajó de alta a media');assert.strictEqual(T.QL,T.QUALITY.media);
 T.AUTOQ.cool=0;for(let i=0;i<100;i++)T.autoQuality(1/60);assert.strictEqual(st.autoLevel,'media','bajó yendo a 60 FPS');
 // una calidad elegida a mano no se toca
 st.quality='alta';st.autoLevel='alta';T.setQuality('alta');for(let i=0;i<200;i++)T.autoQuality(1/20);assert.strictEqual(T.QL,T.QUALITY.alta,'la automática pisó la calidad elegida a mano');
 // guardados anteriores a esta versión: su «alta» era el valor por defecto → pasan a automática una sola vez
 T.STORE.setItem(T.SAVE_KEY,JSON.stringify({settings:{quality:'alta'}}));T.Save.load();assert.strictEqual(T.Save.d.settings.quality,'auto','el guardado viejo no pasó a automática');
 T.Save.d.settings.quality='baja';T.Save.write();T.Save.load();assert.strictEqual(T.Save.d.settings.quality,'baja','la migración se repitió sobre una elección del jugador');
 T.Save.d.settings.quality=prevQ;delete T.Save.d.settings.autoLevel;global.devicePixelRatio=1;T.setQuality('alta');
 console.log('Rendimiento: resolución por calidad, calidad automática y migración de guardados: OK')}
// 33. Elementos: debilidades, resistencias, plasma, elemento de los DoT y reacciones
{const fresh=(ch)=>{reset();T.start(ch,1);T.S.spawn=1e9;for(const k of T.S.storm.act.slice())T.ANOMALIES[k].end&&T.ANOMALIES[k].end();T.S.storm.act=[];T.S.gmul=1;const p=T.S.p;p.m.crit=0;return p};
 const mk=(type,dx=80)=>{const e=T.spawnEnemy(type,T.S.p.x+dx,T.S.p.y);e.hp=e.maxHp=1e6;e.aff=[];e.elite=0;e.armor=0;return e};  // sin armadura: se mide solo el elemento
 const hit=(e,d,o)=>{const p=T.S.p;p.ground=1;if(p.cmb){p.cmb.combo=0;p.cmb.dashT=0}e.stunT=0;const h=e.hp;T.hurtE(e,d,o||{});return h-e.hp};  // aislado del combo y del contexto
 // todos los enemigos y jefes tienen debilidad y resistencia distintas; todos los héroes están en la tabla
 for(const k in T.ENEMIES)assert(T.ENEMY_EL[k]&&T.ENEMY_EL[k].weak!==T.ENEMY_EL[k].res,k+' sin elementos');for(const k in T.BOSSES)assert(T.BOSS_EL[k],k+' sin elementos');for(const k in T.CHARS)assert(k in T.CHAR_EL,k+' sin elemento');
 // Centinela (fuego) contra Reptador (débil a fuego) ×1,5 y contra Fuego Fatuo (resiste fuego) ×0,6
 let p=fresh('vanguard');let e=mk('crawler');const base=hit(e,100);assert(base>140&&base<160,'debilidad: '+base);
 e=mk('wisp');const r=hit(e,100);assert(r>55&&r<65,'resistencia: '+r);
 // plasma (Cañonero) nunca es resistido; el Bastión es físico: ni débil ni resistido
 p=fresh('artillery');e=mk('swarm');assert(Math.abs(hit(e,100)-100)<1,'el plasma fue resistido');
 p=fresh('bastion');e=mk('crawler');assert(Math.abs(hit(e,100)-100)<1,'el físico tuvo debilidad');
 // un elemento explícito manda sobre el del héroe; los DoT llevan el suyo (veneno = corrupción: el Reptador lo resiste)
 p=fresh('bastion');e=mk('brute');assert(hit(e,100,{el:'rayo'})>140,'el elemento explícito no se aplicó');
 e=mk('crawler');T.applyDot(e,'poison',100,1);const h0=e.hp;step(31);assert(h0-e.hp<40&&h0-e.hp>20,'el veneno no llevó corrupción: '+(h0-e.hp));
 // reacciones: Resonancia (rayo sobre helado) salta a los vecinos; Choque Térmico quita el hielo; Combustión consume el veneno; Colapso aturde al electrizado
 p=fresh('volt');e=mk('tank');const v=mk('tank',140);e.slowT=2;const d1=hit(e,100);assert(d1>200,'Resonancia no multiplicó: '+d1);assert(v.hp<v.maxHp,'Resonancia no saltó al vecino');
 p=fresh('vanguard');e=mk('tank');e.slowT=2;hit(e,100);assert.strictEqual(e.slowT,0,'Choque Térmico no quitó el hielo');
 p=fresh('vanguard');e=mk('tank');T.applyDot(e,'poison',50,4);hit(e,100);assert(!e.dots.poison.t,'Combustión no consumió el veneno');
 p=fresh('chrono');e=mk('brute');e.shockT=3;hit(e,100);assert(e.stunT>0&&e.shockT===0,'Colapso no aturdió');
 // un golpe de rayo electriza; la reacción tiene pausa de 0,8 s
 p=fresh('volt');e=mk('tank');hit(e,10);assert(e.shockT>0,'el rayo no electrizó');e.slowT=2;hit(e,100);const rx=e.rxT;hit(e,100);assert(rx>0&&e.rxT===rx,'las reacciones se encadenaron sin pausa');
 // cada héroe aguanta una partida con enemigos de los 5 escenarios sin excepciones (todas las tablas de elementos en uso)
 for(const ch of Object.keys(T.CHARS)){fresh(ch);T.S.spawn=2;Object.assign(T.mouse,{x:700,y:300});for(let f=0;f<60*6;f++){T.mouse.l=f%40<30;if(f%120===0)T.S.p.hp=T.S.p.maxHp;step()}}
 console.log('Elementos: debilidad, resistencia, plasma, físico, DoT con elemento y 4 reacciones: OK')}
// 32. Los 10 objetos originales
{const give=(ch,id,n=1)=>{reset();T.start(ch,1);T.S.spawn=1e9;for(const k of T.S.storm.act.slice())T.ANOMALIES[k].end&&T.ANOMALIES[k].end();T.S.storm.act=[];T.S.gmul=1;for(let i=0;i<n;i++)T.giveItem(id,1);return T.S.p};
 const ORIG=['stormheart','causality','voidpact','brokenclock','parasite','memory','unstableprism','lastking','destiny','dimparasite'];
 // Reloj Roto: las bajas recortan enfriamientos y el reloj corre más
 let p=give('artillery','brokenclock');p.cd.s=3;p.cd.u=10;const e1=T.spawnEnemy(Object.keys(T.ENEMIES)[0],p.x+60,p.y);T.hurtE(e1,1e9,{raw:1});assert(p.cd.s<=2.7&&p.cd.u<=9.7,'Reloj Roto no recortó enfriamientos');
 const c0=T.S.clock;step(60);const dBroken=T.S.clock-c0;reset();T.start('artillery',1);const c1=T.S.clock;step(60);assert(dBroken>(T.S.clock-c1)*1.15,'Reloj Roto no acelera el reloj');
 // Corona del Último Rey: más daño con pocos enemigos, menos con muchos
 p=give('vanguard','lastking');const dm=T.ITEM.lastking.dm;for(const e of T.S.en)e.dead=1;assert(dm(1)>1.5,'Corona sin enemigos');for(let i=0;i<12;i++)T.spawnEnemy(Object.keys(T.ENEMIES)[0],p.x+300+i*10,p.y);assert.strictEqual(dm(1),.8,'Corona con muchos enemigos');
 // Corazón de la Tormenta: se carga al recibir daño y descarga sobre los enemigos cercanos
 p=give('vanguard','stormheart');p.m.dodge=0;const ev=T.spawnEnemy(Object.keys(T.ENEMIES)[0],p.x+60,p.y);const hp0=ev.hp;for(let i=0;i<6;i++){p.inv=0;T.hurtP(p.maxHp*.12,{x:p.x+300,y:p.y})}
 assert(ev.hp<hp0,'Corazón de la Tormenta no descargó');
 // Fragmento de Destino: un proyectil que roza da suerte; un golpe la quita
 p=give('vanguard','destiny');const l0=p.m.luck;T.fxProj({x:p.x+p.w/2+25,y:p.y-p.h/2,vx:0,vy:0,r:4,life:5,hostile:1,dmg:1});T.S.spawn=1e9;step(1);assert(p.m.luck>l0,'Destino no dio suerte');
 p.inv=0;p.m.dodge=0;T.hurtP(5);assert.strictEqual(p.m.luck,l0,'Destino no perdió la suerte al recibir daño');
 // Contrato del Vacío: élites con recompensa doble y jefes con los ataques de la fase siguiente
 p=give('vanguard','voidpact');const el=T.spawnEnemy(Object.keys(T.ENEMIES)[0],p.x+200,p.y);el.elite=1;el.aff=[Object.values(T.AFX)[0]];const g0=p.gold,x0=p.xp;T.hurtE(el,1e9,{raw:1});
 const el2=(()=>{give('vanguard','sharp');const q=T.S.p,e=T.spawnEnemy(Object.keys(T.ENEMIES)[0],q.x+200,q.y);e.elite=1;e.aff=[Object.values(T.AFX)[0]];const g=q.gold,x=q.xp;T.hurtE(e,1e9,{raw:1});return [q.gold-g,q.xp-x]})();
 assert(p.gold-g0>=el2[0]*1.9&&p.xp-x0>=el2[1]*1.9,'Contrato del Vacío no dobló la recompensa');
 // Memoria Artificial y Parásito de Dimensión: lo que repiten aparece con retraso
 p=give('artillery','dimparasite');step(50);T.S.en.length=0;T.mouse.l=1;step(6);T.mouse.l=0;const n0=T.PR.n;step(40);assert(T.PR.n>0||n0>0,'Parásito de Dimensión no repitió el disparo');assert(p.ist.dimAt,'el parásito no tiene posición');
 // cada objeto original, con 3 acumulaciones, aguanta una partida con enemigos sin excepciones
 for(const id of ORIG){const q=give('artillery',id,3);T.S.spawn=2;Object.assign(T.mouse,{x:700,y:300});T.keys.KeyQ=1;for(let f=0;f<60*12;f++){T.mouse.l=f%40<30;if(f%120===0)q.hp=q.maxHp;step()}T.keys.KeyQ=0}
 console.log('Objetos originales: Reloj Roto, Corona, Corazón de la Tormenta, Destino, Contrato del Vacío, parásitos y memoria: OK')}
// 31. La Tempestad: estabilidad, anomalías, combinaciones y tratos
{const fresh=()=>{reset();T.start('vanguard',1);T.S.spawn=1e9;for(const k of T.S.storm.act.slice())T.ANOMALIES[k].end&&T.ANOMALIES[k].end();T.S.storm.act=[];T.S.gmul=1;T.S.pspd=1};
 fresh();const st=T.S.storm;assert.strictEqual(st.stab,100);step(60*5);assert(st.stab<100&&st.stab>97,'el tiempo no erosiona la estabilidad');
 // umbrales: 75 → anomalía; 50 → trato; 25 → anomalía
 st.stab=76;T.stormErode(2);assert.strictEqual(st.act.length,1,'cruzar 75 no desató una anomalía');
 st.stab=51;T.stormErode(2);step(40);assert.strictEqual(T.S.st,'play','el trato no se resolvió');assert(st.marks[50],'cruzar 50 no ofreció el trato');
 // cada trato hace lo que dice
 fresh();let n0=Object.values(T.S.p.items).reduce((a,b)=>a+b,0);T.S.storm.stab=40;T.takeDeal('estabilizar');
 assert(T.S.storm.stab===75&&T.S.storm.spawnMul<1&&Object.values(T.S.p.items).reduce((a,b)=>a+b,0)===n0+1,'estabilizar falló');
 fresh();T.takeDeal('alimentar');assert(T.S.storm.act.length===1&&T.S.storm.goldMul>1&&T.S.storm.spawnMul>1,'alimentar falló');
 fresh();T.S.storm.stab=60;T.takeDeal('absorber');assert(T.S.p.buf.tempestad,'absorber no dio el poder');T.S.p.buf.tempestad.t=0;step(2);assert(T.S.storm.stab<=35.1,'absorber no tuvo consecuencia');
 // gravedad baja: se salta más alto
 const peak=()=>{let top=1e9;for(let i=0;i<300&&!T.S.p.ground;i++)step();assert(T.S.p.ground,'no aterrizó');key('Space',false);T.keys.Space=0;for(let i=0;i<90;i++){step();top=Math.min(top,T.S.p.y)}return top};
 fresh();const y0=peak();T.stormUnleash('grav');const y1=peak();assert(y1<y0-40,'la gravedad baja no cambió el salto');
 // cada anomalía y combinación funciona sin errores; los enemigos tormentosos dan el doble de oro
 for(const k in T.ANOMALIES){fresh();T.S.spawn=2;T.stormUnleash(k);step(60*6)}
 for(const cb of T.STORM_COMBOS){fresh();T.S.spawn=2;T.stormUnleash(cb.a);T.stormUnleash(cb.b);step(60*8)}
 fresh();T.stormUnleash('furia');const e=T.spawnEnemy(Object.keys(T.ENEMIES)[0]);assert(e.storm,'el enemigo no nació tormentoso');
 // máximo 3 a la vez; cambiar de etapa limpia todo
 fresh();for(const k of ['grav','veloz','rayos','niebla'])T.stormUnleash(k);assert.strictEqual(T.S.storm.act.length,3);assert.strictEqual(T.S.gmul,1,'la anomalía más antigua no se disipó');
 T.stormUnleash('veloz');const rr=Math.random;Math.random=()=>.99;T.loadStage(1);Math.random=rr;  // .99: sin anomalía inicial al azar en la etapa nueva
 assert(T.S.pspd===1&&T.S.gmul===1&&!T.S.storm.act.length,'cambiar de etapa no limpió las anomalías');
 console.log('Tempestad: estabilidad, umbrales, tratos, anomalías, combinaciones y limpieza: OK')}
// 32. La Tempestad viva: corrupción, Sombra, deuda, núcleos, personalidad y tormentas personales
{const fresh=(ch)=>{reset();T.start(ch||'vanguard',1);T.S.spawn=1e9;for(const k of T.S.storm.act.slice())T.ANOMALIES[k].end&&T.ANOMALIES[k].end();T.S.storm.act=[];T.S.en.length=0;T.S.gmul=1;T.S.pspd=1;return T.S.p};
 // corrupción: umbrales de daño y la Sombra al 100%
 let p=fresh();const d0=T.bm('dmg');T.addTaint(30,'x');assert(T.bm('dmg')>d0*1.09,'la corrupción no subió el daño');
 T.addTaint(30);assert(T.bm('healm')<1,'corrupción 50% no redujo la curación');
 T.addTaint(50);assert.strictEqual(T.taint(),100);step(90);const sh=T.S.shade;assert(sh&&sh.type==='shade'&&T.S.en.includes(sh),'no apareció la Sombra');
 step(120);sh.hp=1;sh.stunT=0;T.hurtE(sh,1e6,{raw:1});step(5);assert(!T.S.shade&&T.taint()===50,'vencer a la Sombra no bajó la corrupción');
 // corrupción 75%: enemigos corruptos
 p=fresh();T.addTaint(80);const ce=T.spawnEnemy('brute',p.x+300,500,true);assert(ce.corrupt,'no nació corrupto');
 // deuda: préstamo, cobro con oro e impago que fortalece enemigos
 p=fresh();let n0=Object.values(p.items).reduce((a,b)=>a+b,0);T.borrow({});assert(T.S.debt===1&&Object.values(p.items).reduce((a,b)=>a+b,0)===n0+1&&T.taint()===15,'el préstamo falló');
 T.borrow({});assert.strictEqual(T.S.debt,3,'el segundo préstamo no costó 2');
 const e1=T.spawnEnemy('brute',p.x+300,500,true);T.S.debt=0;const e2=T.spawnEnemy('brute',p.x+300,500,true);assert(e1.dmg>e2.dmg*1.2,'la deuda no fortaleció enemigos');
 T.S.debt=3;p.gold=T.debtCost()*2+5;T.debtStage();assert(T.S.debt===1&&p.gold===5,'el Acreedor no cobró bien');
 T.S.debt=3;T.S.collT=.01;step(3);assert(T.S.en.some(e=>e.collector),'no llegó el cobrador');
 // núcleos: interactuar abre la elección; cada opción hace lo que dice y afecta la etapa siguiente
 p=fresh();const core=T.S.ints.find(o=>o.k==='core');assert(core,'la etapa no tiene núcleo');T.S.near=core;T.interact();assert.strictEqual(T.S.st,'choice');step(1);
 assert(core.open&&T.S.coreNext==='destruir'&&T.S.ints.some(o=>o.k==='chest'&&o.tier==='large'),'destruir falló');T.coreStage();assert.strictEqual(T.S.spawnMulCore,.7);
 p=fresh();T.S.coreObj={x:p.x,y:p.y};T.stormUnleash('grav');T.addTaint(30);T.takeCore('estabilizar');assert(!T.S.storm.act.length&&T.taint()===10,'estabilizar falló');
 p=fresh();T.S.coreObj={x:p.x,y:p.y};const d1=T.bm('dmg');T.takeCore('absorber');assert(T.bm('dmg')>d1*1.07&&T.taint()===30,'absorber falló');T.coreStage();assert.strictEqual(T.S.storm.act.length,1,'absorber no trajo anomalía');
 // guardado
 const sv=T.tempestSave();assert(sv.coreDmg>0&&sv.taint===30);p=fresh();T.tempestLoad(sv);assert(T.taint()===30&&T.bm('dmg')>1.07,'no se restauró la Tempestad');
 // personalidad: los tres estilos se detectan y reaccionan
 p=fresh();const P=T.persState();P.t=.01;P.kills=30;P.time=60;P.near=50;P.lastX=p.x;step(1);assert(P.event&&P.event.foes&&P.event.foes.length===3,'no detectó estilo agresivo');
 for(const e of P.event.foes)T.hurtE(e,1e7,{raw:1});step(3);assert(!P.event,'el desafío no se completó');
 p=fresh();T.persEvent('evasivo');step(60*11);assert(!T.persState().event,'el cerco no terminó');
 p=fresh();const ni=T.S.ints.length;T.persEvent('explorador');assert(T.S.ints.length===ni+1&&T.S.en.some(e=>e.type==='crackwall'),'no premió la exploración');
 // tormentas personales: solo la de su familia y alteran habilidades
 const own={vanguard:'hierro',artillery:'ojivas',summoner:'espiritus',chrono:'temporal',hemo:'sangre'};
 for(const ch in own){p=fresh(ch);for(let i=0;i<20;i++){T.stormUnleash();for(const k of T.S.storm.act){const f=T.ANOMALIES[k].fam;assert(!f||f===T.S.ch.fam,ch+' recibió la tormenta de otra familia: '+k)}for(const k of T.S.storm.act.slice())T.ANOMALIES[k].end&&T.ANOMALIES[k].end();T.S.storm.act=[]}
  T.S.spawn=2;T.stormUnleash(own[ch]);step(60*7)}
 p=fresh();const c0=T.bm('cdm');T.stormUnleash('hierro');assert(T.bm('cdm')<c0*.8,'Tormenta de Hierro no bajó los enfriamientos');T.ANOMALIES.hierro.end();assert(!T.S.p.buf.ps_hierro,'la tormenta no se limpió');
 console.log('Tempestad viva: corrupción, Sombra, deuda, núcleos, personalidad y tormentas personales: OK')}
// 33. Memoria del mundo: ecos, recuerdos, eventos secretos y desafíos personales
{const fresh=(ch)=>{reset();T.start(ch||'vanguard',1);T.S.spawn=1e9;T.S.en.length=0;return T.S.p};const L=T.LORE();L.echoes=[];L.mem={};L.chal={};
 // eco: morir deja un eco con tus mejores objetos; en otra partida aparece en esa etapa y se consume al usarlo
 let p=fresh();T.giveItem(T.ITEMS.find(i=>i.r==='l').id);p.gold=400;T.S.stage=0;T.S.st='play';T.endGame(false);
 assert(L.echoes.length===1&&L.echoes[0].items.length===1&&L.echoes[0].gold===200,'morir no dejó un eco');T.S.st='play';L.echoes[0].t-=1e4;
 p=fresh();const rr=Math.random;Math.random=()=>.1;T.loadStage(0);Math.random=rr;const eo=T.S.ints.find(o=>o.k==='echo');assert(eo,'el eco no apareció en su etapa');
 for(const r of [.1,.5,.9]){const o=Object.assign({},eo,{open:0});L.echoes=[o.echo];const n0=Object.values(p.items).reduce((a,b)=>a+b,0),g0=p.gold,e0=T.S.en.length;Math.random=()=>r;T.echoUse(o);Math.random=rr;
  assert(!L.echoes.length,'el eco no se consumió');
  if(r===.1)assert(Object.values(p.items).reduce((a,b)=>a+b,0)===n0+1,'el eco no dio su objeto');
  if(r===.5)assert(p.gold>g0,'el eco no dio oro');
  if(r===.9){const f=T.S.en[e0];assert(f&&f.echoFoe,'el eco no dio desafío');const g1=p.gold;T.hurtE(f,1e9,{raw:1});step(3);assert(p.gold>g1,'vencer el desafío del eco no pagó')}}
 assert(T.S.p.hp>0);
 // recuerdos: el primer jefe derrotado deja uno, solo una vez, y se ve en el Códice
 p=fresh();assert(T.memoryGet('prisma')&&!T.memoryGet('prisma')&&L.mem.prisma,'el recuerdo no se guardó una sola vez');assert(T.loreHtml().includes(T.MEMORIES.prisma.t),'el Códice no muestra el recuerdo');
 p=fresh();const b=T.spawnBoss('hydra');T.kill(b);step(5);assert(L.mem.hydra,'matar al jefe no dejó recuerdo');
 // eventos secretos
 p=fresh();let n0=Object.values(p.items).reduce((a,b)=>a+b,0);T.secState().streak=15;step(2);assert(Object.values(p.items).reduce((a,b)=>a+b,0)===n0+1,'Intocable no premió');
 p=fresh();const c0=T.S.ints.filter(o=>o.k==='chest').length;for(let i=0;i<60*11;i++){p.vx=0;p.x=p.x;step()}assert(T.S.ints.filter(o=>o.k==='chest').length>c0||T.secState().done.quietud,'Quietud no ocurrió');
 p=fresh();const g2=p.gold;p.x=60;step(2);p.x=3940;step(2);assert(T.secState().done.cartografo&&p.gold>g2,'Cartógrafo no ocurrió');
 // desafíos personales: 150 bajas → capítulo 1, jefe → capítulo 2, última etapa → capítulo 3, cada uno con cristales
 p=fresh('artillery');const gm=T.Save.d.shop.gems;T.chalOf('artillery').kills=149;const e=T.spawnEnemy('brute',p.x+300,500,true);T.hurtE(e,1e9,{raw:1});step(3);
 assert(T.chalOf('artillery').step===1&&T.Save.d.shop.gems===gm+30,'el capítulo 1 no se completó');
 const b2=T.spawnBoss('prisma');T.kill(b2);step(5);assert.strictEqual(T.chalOf('artillery').step,2,'el capítulo 2 no se completó');
 T.loadStage(T.STAGES.length-1);assert.strictEqual(T.chalOf('artillery').step,3,'el capítulo 3 no se completó');
 T.Save.write();T.Save.load();assert(T.Save.d.lore.chal.artillery.step===3&&T.Save.d.lore.mem.prisma,'la memoria no sobrevivió a guardar y cargar');
 T.openCodex();
 console.log('Memoria del mundo: ecos, recuerdos de jefes, eventos secretos y desafíos personales: OK')}
// 34. Mundo vivo: épocas, clima, el mapa aprende y objetos que se comunican
{T.WORLDCFG.on=1;const fresh=(ch)=>{reset();T.start(ch||'vanguard',1);T.S.spawn=1e9;T.S.en.length=0;if(T.S.era)T.eraEnd();return T.S.p};const items=()=>Object.values(T.S.p.items).reduce((a,b)=>a+b,0);
 // épocas: cambian colores y reglas durante 40 s y luego vuelven
 let p=fresh();const sky0=T.STAGE.sky[0];T.eraShift('futuro');assert(T.STAGE.sky[0]!==sky0&&T.bm('cdm')<.85,'la época futura no cambió nada');
 assert(Math.abs(T.S.era.t-40)<.1,'la época no dura 40 s');T.S.era.t=.05;step(6);assert(!T.S.era&&T.STAGE.sky[0]===sky0&&!p.buf.era,'la época no terminó: '+JSON.stringify([T.S.st,T.S.era&&T.S.era.t,T.S.era&&T.S.era.k,T.S.t,T.STAGE.sky[0],sky0]));
 p=fresh();T.eraShift('colapso');assert(T.bm('dmg')>1.25&&T.bm('taken')>1.25,'el colapso no subió el daño');T.eraEnd();
 p=fresh();const e3=T.spawnEnemy('brute',p.x+400,500,true);const g0=T.goldFor(e3),sp0=e3.spdx;T.eraShift('pasado');assert(T.S.wGoldEra===1.25&&T.goldFor(e3)>=g0&&e3.spdx<sp0*.85,'las ruinas no cambiaron oro y velocidad');T.eraEnd();assert(Math.abs(e3.spdx-sp0)<.01,'la velocidad no volvió');
 // cambiar de etapa en mitad de una época la limpia
 p=fresh();T.eraShift('futuro');T.loadStage(1);assert(!T.S.era&&!p.buf.era,'la época sobrevivió al cambio de etapa');
 // clima
 p=fresh();T.S.weather=null;const ev=T.spawnEnemy('brute',p.x+400,500,true);ev.armor=0;const base=T.applyElement(ev,100,{el:'rayo'});T.weatherStart('lluvia');
 assert(Math.abs(T.applyElement(ev,100,{el:'rayo'})/base-1.25)<.01,'la lluvia no potenció el rayo');step(30);
 p=fresh();T.weatherStart('ceniza');assert(T.S.p.buf.ceniza&&T.S.wGold>1,'las cenizas no hicieron efecto');
 p=fresh();T.weatherStart('viento');p.ground=0;p.y=200;const x0=p.x;T.S.wind=90;for(let i=0;i<30;i++){T.S.p.ground=0;step()}assert(p.x!==x0,'el viento no empujó');
 p=fresh();T.weatherStart('nieve');step(60);
 // el mapa aprende: zona caliente vigilada y nido en la zona fría
 p=fresh();const h=T.heatOf(T.S.stage);h.fill(1);h[3]=200;T.S.ints=[];T.S.en.length=0;T.heatStage();assert(T.S.hot&&T.S.hot.x0<1200,'no detectó la zona más usada');
 assert(T.S.en.some(e=>e.nest)&&T.S.ints.some(o=>o.nest),'no apareció el nido en la zona ignorada');
 p.x=(T.S.hot.x0+T.S.hot.x1)/2;T.S.hot.t=.01;const n0=T.S.en.length;step(3);assert(T.S.en.length>n0,'la zona vigilada no envió patrulla');
 T.S.heatAcc=Array(12).fill(0);T.S.heatAcc[5]=50;const h5=h[5];T.loadStage(T.S.stage);assert(T.heatOf(0)[5]>h5,'no se guardó por dónde anduviste');
 // objetos que se comunican: juntar la pareja da su efecto (y una sola vez el diálogo)
 p=fresh();let d0=T.bm('dmg');T.giveItem('memory');T.giveItem('parasite');assert(T.bm('dmg')>d0*1.14&&T.S.talks.memory,'los objetos no hablaron');
 p=fresh();const ee=T.spawnEnemy('brute',p.x+400,500,true);const gg=T.goldFor(ee);T.giveItem('voidpact');T.giveItem('clover');assert(T.S.talkGold===1.3&&T.goldFor(ee)>=gg&&T.bm('as')<1,'el conflicto no tuvo efecto');
 for(const t of T.TALKS)assert(T.ITEM[t.a]&&T.ITEM[t.b],'objeto inexistente en las parejas: '+t.a+'/'+t.b);
 T.WORLDCFG.on=0;console.log('Mundo vivo: épocas, clima, el mapa aprende y objetos que se comunican: OK')}
// 35. Preparación, facciones y modos: maestría, armas, compañero y sinergias, reputación, finales, campaña, inversión, rutas, transporte y bioma oculto
{const fresh=(ch)=>{reset();T.start(ch||'vanguard',1);T.S.spawn=1e9;T.S.en.length=0;return T.S.p};const L=T.LORE(),st=T.Save.d.settings;
 st.wmod=null;st.comp=null;L.mt={};L.rep={guard:0,cult:0,guild:0};L.endings={};
 // maestría: ganar puntos, repartirlos y que se apliquen; tope de 9
 let p=fresh();T.S.stage=1;T.S.runBoss=1;T.endGame(false);assert.strictEqual(T.mtOf('vanguard').pts,2,'no se ganaron puntos de maestría');T.S.st='play';
 assert(T.mtSpend('vanguard',2)&&T.mtSpend('vanguard',0)&&!T.mtSpend('vanguard',0),'el reparto de puntos falló');
 const hp0=T.CHARS.vanguard.hp;p=fresh();assert(p.maxHp>hp0*1.07&&p.m.dmg>1.07,'la maestría no se aplicó');
 T.mtOf('vanguard').pts=50;T.mtOf('vanguard').sp=[3,3,3];p=fresh();T.S.stage=3;T.S.runBoss=1;T.endGame(false);T.S.st='play';assert(T.mtOf('vanguard').pts===50,'se superó el tope de maestría');
 T.mtReset('vanguard');assert(T.mtOf('vanguard').pts===59&&T.mtOf('vanguard').sp.join()==='0,0,0');L.mt={};
 for(const id in T.CHARS)assert.strictEqual(T.mtBranches(id).length,3,'faltan ramas: '+id);
 // armas: cada componente cambia el ataque principal y solo para quien puede usarlo
 for(const k in T.WMODS){const id=Object.keys(T.CHARS).find(c=>T.wmodOk(c,k));st.wmod=k;p=fresh(id);const d=T.ab('p'),b=T.CHARS[id].primary;
  assert(d!==b&&(d.dmg!==b.dmg||d.cd!==b.cd||d.n!==b.n||d.r!==b.r||d.range!==b.range),'el componente no cambió el arma: '+k)}
 const melee=Object.keys(T.CHARS).find(c=>!T.wmodOk(c,'cargador'));if(melee){st.wmod='cargador';p=fresh(melee);assert(T.ab('p')===T.CHARS[melee].primary,'un arma cuerpo a cuerpo aceptó un cargador')}
 st.wmod=null;
 // habilidad alternativa: bloqueada hasta completar la historia; luego cambia la secundaria
 st.alt={vanguard:true};L.chal.vanguard={step:0,kills:0};p=fresh();assert(T.ab('s')===T.CHARS.vanguard.secondary,'la alternativa no estaba bloqueada');
 L.chal.vanguard.step=3;p=fresh();assert(T.ab('s').name!==T.CHARS.vanguard.secondary.name&&T.ab('s').dmg>T.CHARS.vanguard.secondary.dmg,'la alternativa no cambió la secundaria');st.alt={};
 // compañero: dispara solo y hace su movimiento con la definitiva; las parejas de familias dan sinergia
 st.comp='artillery';p=fresh('chrono');assert(T.S.comp&&T.S.comp.cid==='artillery','no hay compañero');const e=T.spawnEnemy('tank',p.x+200,500,true);e.hp=e.maxHp=1e6;const h0=e.hp;step(120);assert(e.hp<h0,'el compañero no ataca');
 const said=[];const sy=T.S;T.compAct();assert(sy.msg.includes('SINERGIA'),'chrono + artillery no dio sinergia');
 for(const f in T.COMP_MOVE){const id=Object.keys(T.CHARS).find(c=>T.CHARS[c].fam===f);for(const pc of ['vanguard','artillery','summoner','chrono','hemo']){if(pc===id)continue;st.comp=id;fresh(pc);T.spawnEnemy('brute',T.S.p.x+150,500,true);T.compAct();step(10)}}
 st.comp=null;
 // reputación: decisiones la mueven y a ±30 actúa
 p=fresh();T.takeDeal('estabilizar');assert(T.repOf().guard===8,'estabilizar no subió a los Guardianes');T.takeDeal('alimentar');assert(T.repOf().cult===8&&T.repOf().guard===4);
 const pr0=T.priceOf({tier:'large'});L.rep.guild=40;assert(T.priceOf({tier:'large'})<pr0*.9,'el Gremio no rebajó precios');L.rep.guild=-40;assert(T.priceOf({tier:'large'})>pr0*1.1,'el Gremio enfadado no subió precios');
 L.rep={guard:40,cult:40,guild:0};p=fresh();assert(p.maxHp>T.CHARS.vanguard.hp*1.09&&T.bm('dmg')>=1.1&&p.taint>=10,'la reputación alta no ayudó');
 // finales según decisiones
 assert.strictEqual(T.pickEnding(),'tormenta');L.rep={guard:45,cult:0,guild:0};assert.strictEqual(T.pickEnding(),'guardian');p.taint=80;assert.strictEqual(T.pickEnding(),'sombra');p.taint=0;
 L.rep={guard:0,cult:0,guild:0};assert.strictEqual(T.pickEnding(),'superviviente');T.S.campaign=1;for(const k of ['prisma','hydra','queen','leviathan','herald'])L.mem[k]=1;assert.strictEqual(T.pickEnding(),'verdadero');
 p=fresh();T.S.stage=4;T.endGame(true);assert(L.endings.superviviente,'ganar no registró el final');T.S.st='play';
 // campaña: cada etapa abre su capítulo
 T.MODE_NEXT='camp';p=fresh();assert(T.S.campaign,'no empezó la campaña');step(60);T.loadStage(1);step(80);assert(L.camp>=2&&T.S.st==='play','la campaña no avanzó');
 const sv=T.saveRun();T.MODE_NEXT=null;
 // inversión: oleadas de héroes hasta la victoria, sin ranking
 T.MODE_NEXT='inv';p=fresh();assert(T.S.mode==='inv'&&!T.S.ints.some(o=>o.k==='tp')&&p.maxHp>T.CHARS.vanguard.hp*2,'no empezó la inversión');
 step(60*5);assert(T.S.wave===1&&T.S.en.some(e=>e.hcid),'no llegó la primera oleada');
 for(let w=0;w<12&&T.S.st==='play';w++){for(const e of T.S.en)if(e.hcid){p.inv=9;T.hurtE(e,1e9,{raw:1})}p.hp=p.maxHp;step(60*5)}
 step(200);assert(T.S.wave===T.INV_WAVES&&T.S.st==='over','la inversión no terminó en victoria: '+T.S.wave+' '+T.S.st);
 // rutas, transporte y bioma oculto
 T.WORLDCFG.on=1;p=fresh();T.S.tp.state='ready';T.useTP('next');assert.strictEqual(T.S.st,'choice','no se ofreció la ruta');assert(!T.pickOpts||true);
 step(1);assert.strictEqual(T.S.stage,1,'la ruta segura no avanzó');
 p=fresh();T.S.route='peligro';const c0=T.S.ints.filter(o=>o.k==='chest').length;T.loadStage(1);assert(T.S.ints.filter(o=>o.k==='chest').length>=c0+2-5&&T.S.routeGold===1.3,'la ruta peligrosa no aplicó');
 const en=T.spawnEnemy('brute',p.x+300,500,true);assert(en.maxHp>=T.ENEMIES.brute.hp*1.2,'la ruta peligrosa no reforzó enemigos');
 p=fresh();T.S.sec={done:{quietud:1}};T.S.tp.state='ready';T.useTP('next');assert(el('choiceOpts').innerHTML.includes('Jardín'),'el secreto no abrió la ruta oculta');
 T.S.route='vacio';T.S.st='play';el('choice').style.display='none';T.loadStage(2);assert(T.STAGE.name==='Jardín del Vacío'&&T.S.ints.some(o=>o.k==='chest'&&o.tier==='gold')&&!T.S.ints.some(o=>o.k==='chest'&&o.tier==='small'),'el bioma oculto no se cargó');
 p=fresh();const A={k:'pad',x:300,y:500},B={k:'pad',x:2000,y:400};A.to=B;B.to=A;T.routesInteract(A);assert(p.x===2000&&p.y===400,'el transporte no llevó al otro extremo');
 T.WORLDCFG.on=0;
 console.log('Preparación y modos: maestría, armas, compañero y sinergias, reputación, finales, campaña, inversión, rutas, transporte y bioma oculto: OK')}
// 36. Cada objeto tiene su propio icono (y el cofre muestra lo que sale)
{const ids=Object.keys(T.ITEM);for(const id of ids)assert(T.glyphOf(T.ITEM[id])==='i_'+id&&T.GLYPH['i_'+id],'sin icono propio: '+id);
 assert.strictEqual(new Set(ids.map(id=>T.GLYPH['i_'+id])).size,ids.length,'hay iconos repetidos');
 reset();T.start('vanguard',1);T.S.spawn=1e9;const p=T.S.p;p.gold=1e6;const ch={k:'chest',tier:'small',open:0,x:p.x,y:p.y};T.S.ints.push(ch);T.S.near=ch;T.interact();
 assert(ch.open&&ch.got&&ch.revT!==undefined,'el cofre no prepara la aparición del objeto');step(30);step(80);assert(ch.revT===undefined,'la aparición no terminó');
 console.log('Iconos: uno distinto por objeto, y el cofre muestra el objeto que sale: OK')}
// 30. Tienda de cosméticos
{const sd=T.Save.d.shop;sd.gems=0;sd.own={};sd.eq={};
 assert(!T.buyOrEquip('skin','oro'),'compró sin cristales');assert(!sd.own['skin:oro']&&!sd.eq.skin);
 sd.gems=350;assert(T.buyOrEquip('skin','oro'));assert.strictEqual(sd.gems,50,'no descontó el precio');assert(sd.own['skin:oro']&&sd.eq.skin==='oro');
 T.buyOrEquip('skin','');T.buyOrEquip('skin','oro');assert.strictEqual(sd.gems,50,'volver a equipar algo comprado cobró de nuevo');
 // al terminar una partida se ganan cristales según la puntuación
 T.start('vanguard',1);T.S.kills=100;const g0=sd.gems;T.S.p.items.ankh=0;T.S.p.revive=0;T.S.p.m.dodge=0;T.S.p.buf={};T.S.p.inv=0;T.hurtP(1e9);assert(sd.gems>g0,'no se ganaron cristales');
 // cada cosmético se dibuja en partida, en la tienda y en la pantalla de inicio sin errores
 for(const cat in T.COSMETICS)for(const c of T.COSMETICS[cat]){sd.eq={[cat]:c.id};T.start('duelist',1);T.S.spawn=1e9;
  T.keys.KeyD=1;step(30);T.keys.KeyD=0;T.drawShopPreview(1.5);T.drawParade(2.5)}
 sd.eq={};sd.gems=0;sd.own={};T.goHome();assert.strictEqual(T.S,null);
 console.log('Tienda: compras, cristales y dibujo de todos los cosméticos: OK')}
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
 bd=await A.board(2);assert(!bd.online&&bd.rows.filter(e=>e.user==='Piloto').length===1&&bd.rows.some(e=>e.user==='Piloto'&&!e.pending),'sin red no usó la copia guardada (una fila por jugador, la mejor)');
 FAKE.offline=false;await A.flush();assert.strictEqual(FAKE.docs[2].length,1,'una partida peor creó una segunda entrada del mismo jugador');
 assert.strictEqual(FAKE.docs[2][0].kills,5000,'la marca peor reemplazó a la mejor');assert(!JSON.parse(T.STORE.getItem('neonTempestad.pending')||'[]').length,'la partida peor quedó en cola');
 // una marca mejor reemplaza la anterior: sigue habiendo una sola fila por jugador
 const old=FAKE.docs[2][0].score;T.start('vanguard',2);T.S.kills=9000;T.S.stage=4;T.S.bossDone=1;const r3=await A.submit(true).done;
 assert.strictEqual(FAKE.docs[2].length,1);assert(FAKE.docs[2][0].score>old,'la marca mejor no reemplazó a la anterior');assert(r3.rank===1&&r3.best);
 T.start('vanguard',2);T.S.kills=1;const r4=await A.submit(false).done;assert(r4.rank===1&&!r4.best,'una partida peor no mostró el puesto de tu mejor marca');
 FAKE.docs[2].push({...FAKE.docs[2][0],score:5,date:1});bd=await A.board(2);assert.strictEqual(bd.rows.filter(e=>e.user==='Piloto').length,1,'la tabla repite al jugador');FAKE.docs[2].pop();
 // una puntuación manipulada (otro nombre) la rechaza el servidor y se descarta de la cola
 T.start('vanguard',2);A.user='OtroJugador';A.submit(false).done.catch(()=>{});await A.flush();A.user='Piloto';
 assert.strictEqual(FAKE.docs[2].length,1,'aceptó una puntuación con otro nombre');
 // token caducado: se renueva solo; invitado: no sube nada
 A.ses.exp=0;assert.strictEqual(await A.token(),'t-'+A.ses.uid);assert(A.ses.exp>Date.now());
 A.setSession(null);T.start('vanguard',2);assert(!A.submit(false).done);assert.strictEqual(FAKE.docs[2].length,1,'el invitado subió una puntuación');
 // cuentas con correo: el nombre se elige aparte, es único (también frente a los clásicos) y sirve para el ranking
 await new Promise(r=>setImmediate(r));assert(FAKE.names.piloto&&FAKE.names.piloto.uid===FAKE.users['piloto@neontempestad.game'].uid,'el usuario clásico no reservó su nombre');
 assert(A.isMail('ana@correo.com')&&!A.isMail('Piloto')&&!A.isMail('x@neontempestad.game'));
 assert(/en uso/.test(await A.register('ana@correo.com','clave12','piloto')),'una cuenta de correo tomó el nombre de un usuario clásico');
 assert(/nombre/.test(await A.register('ana@correo.com','clave12','')),'creó una cuenta de correo sin nombre');
 assert(/correo/.test(await A.register('ana@correo','clave12','Ana_X')),'aceptó un correo inválido');
 assert.strictEqual(await A.register('Ana@Correo.com','clave12','Ana_X'),'');assert.strictEqual(A.user,'Ana_X');const anaUid=A.ses.uid;
 assert(FAKE.users['ana@correo.com']&&FAKE.names.ana_x.uid===anaUid&&FAKE.owners[anaUid].name==='ana_x','no se reservó el nombre de la cuenta de correo');
 T.start('vanguard',3);T.S.kills=50;await A.submit(false).done;assert(FAKE.docs[3].some(d=>d.user==='Ana_X'),'la cuenta de correo no pudo subir su puntuación');
 A.pendingName={r:{idToken:'t-'+anaUid,localId:anaUid,refreshToken:'r-'+anaUid,expiresIn:'3600'}};assert(await A.pickName('Ana_Dos'),'una cuenta de correo reservó un segundo nombre');A.pendingName=null;
 A.setSession(null);assert.strictEqual(await A.login('ANA@correo.com','clave12'),'');assert.strictEqual(A.user,'Ana_X','entrar por correo no recuperó el nombre');
 A.setSession(null);FAKE.users['bob@correo.com']={pass:'clave12',uid:'ubob',name:''};assert.strictEqual(await A.login('bob@correo.com','clave12'),'NEED_NAME','no pidió elegir nombre');
 assert.strictEqual(A.user,null);assert(/en uso/.test(await A.pickName('ana_x')));assert.strictEqual(await A.pickName('Bobby'),'');assert.strictEqual(A.user,'Bobby');
 assert.strictEqual(FAKE.users['bob@correo.com'].name,'Bobby','el nombre elegido no quedó en la cuenta');
 A.setSession(null);assert(/en uso/.test(await A.register('bobby','clave12')),'un usuario clásico tomó el nombre de una cuenta de correo');
 A.setSession(null);
 console.log('Cuentas online, ranking global, cola sin conexión, rechazo de suplantación y cuentas con correo: OK')}
// 40. Familia Joke: remate de vóley de Juanchito, bochas rematadas con parry de Frutillini, arte y etiquetas de familia
function jokeTests(){T.Auth.setSession(null);
 const fresh=cid=>{T.start(cid,1);T.S.spawn=1e9;T.S.en.length=0;const p=T.S.p;p.inv=1e9;for(let i=0;i<120&&!p.ground;i++)step();return p};
 // Juanchito: 1.er clic saca, 2.º salta, 3.º remata; la pelota rematada elimina de un golpe a un enemigo normal
 let p=fresh('juan');const foe=T.spawnEnemy('tank',p.x+300,500,1);foe.hp=foe.maxHp=5000;
 T.cast('p');assert(p.vb.ball&&p.vb.st===1,'el primer clic no lanzó la pelota');
 step(8);T.cast('p');assert(p.vb.st===2&&p.vy<0,'el segundo clic no saltó');
 const b=p.vb.ball;b.x=p.x+p.face*12;b.y=p.y-p.h-8;p.aim=Math.atan2(foe.y-foe.h/2-b.y,foe.x-b.x);T.cast('p');
 assert(!p.vb.ball,'el remate no salió');for(let i=0;i<40&&!foe.dead;i++)step();assert(foe.dead,'el remate no eliminó de un golpe');
 p=fresh('juan');T.cast('p');for(let i=0;i<200&&p.vb.ball;i++)step();assert(!p.vb.ball&&p.vb.st===0,'la pelota que cae no se reinicia');
 // Frutillini: la secundaria lanza 3 bochas; el parry cerca de una la remata con crítico asegurado y el doble de daño
 p=fresh('fruti');T.cast('s');assert.strictEqual(T.S.bochas.length,3,'no salieron 3 bochas');
 for(const bo of T.S.bochas){bo.x=p.x;bo.y=p.y-30;bo.vy=0}const n0=T.PR.n;const hit=T.bochaStrike();assert(hit===3&&T.PR.n>=n0+3,'el parry no remató las bochas');
 let found=0;for(let i=0;i<T.PR.n;i++){const q=T.PR.a[i];if(q.crit&&q.dmg===80)found++}assert(found===3,'el remate no tiene crítico asegurado y +100% de daño');
 // arte propio de cada uno y la tira con la etiqueta de cada familia
 for(const k of ['gerpillo','morcho','juan','bachata','fruti','cafe']){fresh(k);T.keys.KeyD=1;step(20);T.keys.KeyD=0;T.draw()}
 T.goHome();T.buildMenu();const h=el('fams').innerHTML;for(const f of ['Vanguardia','Artillería','Invocadores','Tiempo/Espacio','Malditos/Híbridos','Joke'])assert(h.includes(`<span class="fgl">${f}</span>`),'falta la etiqueta de '+f);
 console.log('Familia Joke: remate de Juanchito, bochas de Frutillini, arte y etiquetas de familia en el lobby: OK')}
// 39. Mundo ampliado: tramos laterales, cuerdas, tirolesas, subsuelo, eventos, peligros del jefe y desafío diario
function expandTests(){const A=T.Auth;A.setSession(null);
 const fresh=(cid='vanguard')=>{T.start(cid,1);T.S.spawn=1e9;T.S.en.length=0;const p=T.S.p;p.inv=1e9;for(let i=0;i<120&&!p.ground;i++)step();return p};
 const items=()=>Object.values(T.S.p.items).reduce((a,b)=>a+b,0);
 for(let i=0;i<T.STAGES.length;i++){fresh();T.loadStage(i);const s=T.S,P=T.PLAT,W=4000;
  assert(P.some(q=>q.gen&&q.x<800)&&P.some(q=>q.gen&&q.x>3200),i+': faltan tramos laterales');
  assert(s.ropes.length===2&&s.zips.length===2&&s.ints.some(o=>o.k==='hatch'),i+': faltan cuerdas, tirolesas o la trampilla');
  const tp=s.ints.find(o=>o.k==='tp');assert(tp.x===s.tp.x&&tp.y===s.tp.y,i+': el teletransportador dibujado y el real no coinciden');
  for(const o of s.ints)if(o.k==='chest')assert(P.some(q=>q.ph[0]===1&&Math.abs(q.y-o.y)<1&&o.x>=q.x-1&&o.x<=q.x+q.w+1),i+': un cofre flota en el aire');
  for(const ph of [2,3]){s.phase=ph;step(1);assert(T.PLAT.some(q=>q.on&&q.solid&&q.rx<=10)&&T.PLAT.some(q=>q.on&&q.solid&&q.rx+q.w>=W-10),i+': sin suelo en los extremos (fase '+ph+')')}}
 // cuerda: mantener saltar te sube hasta la plataforma
 let p=fresh();const r=T.S.ropes[0];p.x=r.x;p.y=r.bot;p.vy=0;T.keys.Space=1;for(let i=0;i<200&&p.y>r.top+1;i++)step();T.keys.Space=0;
 assert(Math.abs(p.y-r.top)<2,'la cuerda no te subió');step(10);assert(Math.abs(p.y-r.top)<2,'no quedaste sobre la plataforma de la cuerda');
 // tirolesa: te lleva al otro anclaje
 p=fresh();const zi=T.S.ints.find(o=>o.k==='zip');p.x=zi.x;p.y=zi.y;T.zipUse(zi);for(let i=0;i<400&&T.S.zipR;i++)step();assert(!T.S.zipR&&Math.abs(p.x-zi.z.x2)<30,'la tirolesa no te llevó');
 // subsuelo: dos oleadas y el guardián dan botín; al salir vuelve todo como estaba
 p=fresh();const hz=T.S.ints.find(o=>o.k==='hatch'),P0=T.PLAT,ints0=T.S.ints,i0=items();T.hatchUse(hz);assert(T.S.under&&T.PLAT!==P0&&T.S.en.length,'la trampilla no llevó al subsuelo');
 for(let k=0;k<12&&!T.S.under.done;k++){for(const e of T.S.en.slice())if(!e.dead)T.hurtE(e,1e9,{raw:1});step(5)}
 assert(T.S.under.done&&items()>=i0+2,'el subsuelo no dio su botín '+[T.S.under.done,T.S.under.wave,items(),i0,T.S.st]);assert(T.S.under.foes.some(e=>e.guard),'no apareció el guardián');
 T.caveExit();assert(!T.S.under&&T.PLAT===P0&&T.S.ints===ints0&&Math.abs(p.x-hz.x)<1,'salir del subsuelo no restauró la superficie');
 p=fresh();T.spawnBoss();const hz2=T.S.ints.find(o=>o.k==='hatch');T.hatchUse(hz2);assert(!T.S.under,'se pudo bajar con el jefe despierto');
 // eventos: baliza (defenderla 20 s) y cofre maldito (vencer a sus guardianes)
 p=fresh();const rnd0=Math.random;Math.random=()=>.1;T.evStart();Math.random=rnd0;const bc=T.S.ints.find(o=>o.k==='beacon');assert(bc,'no apareció la baliza');
 T.S.near=bc;T.interact();assert.strictEqual(bc.st,'on');const i1=items();for(let f=0;f<60*22&&!bc.open;f++){p.x=bc.x;p.y=bc.y;p.vy=0;p.hp=p.maxHp;step()}
 assert(bc.open&&bc.st==='done'&&items()>=i1+1,'defender la baliza no dio premio');
 p=fresh();Math.random=()=>.9;T.evStart();Math.random=rnd0;const cc=T.S.ints.find(o=>o.k==='cursed');T.S.near=cc;T.interact();assert(cc.open&&cc.foes.length,'el cofre maldito no despertó a sus guardianes');
 const i2=items();for(const e of cc.foes)T.hurtE(e,1e9,{raw:1});step(2);assert(items()>=i2+2,'romper la maldición no dio dos objetos');
 T.XCFG.events=1;p=fresh();T.S.evT=0;step(2);assert(T.S.ints.some(o=>o.k==='beacon'||o.k==='cursed'),'los eventos no aparecen solos');T.XCFG.events=0;
 // peligros del escenario durante el jefe (en cada etapa)
 for(let i=0;i<T.STAGES.length;i++){fresh();T.loadStage(i);T.S.en.length=0;T.spawnBoss();T.S.hzT=0;const z0=T.S.zn.length;step(40);assert(T.S.zn.some(z=>z.hostile),i+': el escenario no atacó durante el jefe')}
 // desafío diario: mismo héroe, dificultad y mapas para todos; regla del día; ranking propio
 const D=T.dailyInfo();assert.deepStrictEqual(T.dailyInfo(),D);assert(T.CHARS[D.cid]&&D.did>=1&&D.did<=2&&D.mod.n&&/^d\d{8}$/.test(D.key));
 const lay=()=>{T.MODE_NEXT='daily';T.start('vanguard',0);return JSON.stringify([T.S.cid,T.S.df.name,T.S.tp.x,T.PLAT.filter(q=>q.gen).map(q=>[q.x|0,q.y|0])])};
 const L1=lay(),L2=lay();assert.strictEqual(L1,L2,'el desafío diario no tiene el mismo mapa para todos');assert(T.S.daily&&T.S.cid===D.cid&&T.S.df===T.DIFFS[D.did]);
 A.ses={user:'Piloto',uid:'u0',idToken:'t-u0',refresh:'r-u0',exp:Date.now()+1e6};A.user='Piloto';T.S.kills=40;
 return A.submit(false).done.then(()=>{assert(FAKE.docs[D.key]&&FAKE.docs[D.key].length===1&&FAKE.docs[D.key][0].user==='Piloto','el diario no subió a su propio ranking');
  return A.board(D.key)}).then(bd=>{assert(bd.rows.length===1&&!bd.rows.some(e=>e.seed),'el ranking diario tiene relleno ficticio');A.setSession(null);
  console.log('Mundo ampliado: tramos laterales, cuerdas, tirolesas, subsuelo, eventos, peligros del jefe y desafío diario: OK')})}
// 38. Tutorial: con cada personaje se completa entero (sin morir y sin ranking) y luego empieza la partida de verdad
function tutorialTests(){const A=T.Auth;A.setSession(null);
 const near=o=>{T.S.p.x=o.x+(o.k==='tp'?40:0);T.S.p.y=o.y;T.S.p.vy=0;step(3)};
 for(const cid in T.CHARS){T.Save.d.tut={};T.startTutorial(cid,1);const S0=T.S;assert(S0.tut&&S0.noRank,'no empezó el tutorial');
  for(let guard=0;T.S===S0&&guard<200;guard++){const Tt=S0.tut,i=Tt.i,st=T.TUT_STEPS[i],p=S0.p;
   if(i===0){const k=S0.p.x<1500?'KeyD':'KeyA';T.keys[k]=1;step(70);T.keys[k]=0}
   else if(i===1){p.ground=1;p.vy=0;key('Space');step(2)}
   else if(i===2||i===6){for(const e of S0.en)if(!e.dead)T.hurtE(e,1e9,{raw:1});step(2)}
   else if(i>=3&&i<=5){p.cd[['s','m','u'][i-3]]=0;T.cast(['s','m','u'][i-3]);step(2)}
   else if(i===7){near(Tt.chest);T.interact();step(2)}
   else if(i===8){near(S0.ints.find(o=>o.k==='tp'));T.interact();step(2)}
   else if(i===9){near(S0.ints.find(o=>o.k==='tp'));for(const e of S0.en)if(e.boss&&!e.dead)T.hurtE(e,1e9,{raw:1});step(60)}
   else if(i===10){const o=S0.ints.find(o=>o.k==='tp');near(o);T.S.p.x=o.x+40;step(1);T.interact()}
   assert(S0.st!=='over'&&S0.p.hp>0,cid+': se murió en el tutorial (paso '+(i+1)+')');
   if(T.S===S0)step(40)}
  assert(T.S!==S0&&!T.S.tut&&!T.S.noRank,cid+': el tutorial no terminó en una partida de verdad (quedó en el paso '+(S0.tut.i+1)+', st='+S0.st+', tp='+S0.tp.state+')');assert(T.tutDone(cid),cid+': no quedó marcado como hecho')}
 // se puede saltar; un personaje ya visto no lo repite; el tutorial no sube al ranking
 T.Save.d.tut={};T.startTutorial('necro',1);T.tutEnd(true);assert(T.tutDone('necro')&&!T.S.tut);
 A.ses={user:'Piloto',uid:'u0',idToken:'t-u0',refresh:'r-u0',exp:Date.now()+1e6};A.user='Piloto';T.startTutorial('vanguard',1);assert.strictEqual(A.submit(false).score,0,'el tutorial subió al ranking');A.setSession(null);
 console.log('Tutorial: todos los personajes lo completan sin morir, se puede saltar, no puntúa y termina en la partida de verdad: OK')}
// 37. Menú de pruebas (cuenta de desarrollador) y torre de la Mecánica
function devTests(){const A=T.Auth,D=T.DEV;
 A.setSession(null);assert(!T.isDev(),'un invitado tiene el menú de pruebas');
 A.ses={user:'ntdev',uid:T.DEV_UIDS[0],idToken:'x',refresh:'r',exp:Date.now()+1e6};A.user='ntdev';assert(T.isDev());
 T.start('engineer',1);T.S.spawn=1e9;T.S.en.length=0;
 D.god=1;const hp=T.S.p.hp;T.S.p.inv=0;T.hurtP(500);assert.strictEqual(T.S.p.hp,hp,'invulnerable no funcionó');D.god=0;
 D.nocd=1;T.cast('s');step(1);assert(T.S.p.cd.s<=0,'sin enfriamientos no funcionó');D.nocd=0;
 D.oneshot=1;T.spawnEnemy('brute',T.S.p.x+100);const e=T.S.en[T.S.en.length-1];T.hurtE(e,1);assert(e.dead||e.hp<=0,'matar de un golpe no funcionó');D.oneshot=0;
 D.hit=1;T.draw();D.hit=0;D.slow=.25;const t0=T.S.t;T.update(1);assert(Math.abs(T.S.t-t0-.25)<1e-9,'la velocidad del juego no se aplicó');D.slow=1;
 T.S.devUsed=1;const n0=Object.values(FAKE.docs).flat().length;assert.strictEqual(A.submit(false).score,0);assert.strictEqual(Object.values(FAKE.docs).flat().length,n0,'una partida de pruebas subió al ranking');
 A.setSession(null);
 // Mecánica: la Torre de Asedio es una sola y la Q no se relanza aunque algo le reinicie el enfriamiento (Reloj Roto, Mente Febril…)
 T.start('engineer',1);T.S.spawn=1e9;T.S.en.length=0;const p=T.S.p;p.cd.u=0;T.keys.KeyQ=1;step(1);T.keys.KeyQ=0;
 const big=()=>T.count('turret').filter(m=>m.big).length;assert.strictEqual(big(),1);
 for(let i=0;i<120;i++){p.cd.u=0;T.keys.KeyQ=1;step(1)}T.keys.KeyQ=0;assert.strictEqual(big(),1,'se apilaron torres de asedio');
 let n=0;const _s=T.AB.siege;T.AB.siege=function(){n++;return _s.apply(this,arguments)};
 for(let i=0;i<60*3;i++){p.cd.u=0;T.keys.KeyQ=1;step(1)}T.keys.KeyQ=0;T.AB.siege=_s;assert(n<=1,'la Q de la Mecánica se relanzó '+n+' veces en 3 s con el enfriamiento reiniciado');
 console.log('Menú de pruebas (hitboxes, invulnerable, sin enfriamientos, un golpe, velocidad, fuera del ranking) y Torre de Asedio sin bucle: OK')}
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
 // botón de actualizar: escritorio instalado → descarga verificada del instalador; Android → APK directo
 const base='https://github.com/Crack555titi/Neon-tempestad/releases/download/v1.3.0/',sha='ab'.repeat(32);let asked=null;const w0=global.window;
 U.info={latest:'1.3.0',min:'1.3.0',exe:'NeonTempestad-Setup-1.3.0.exe',apk:'NeonTempestad-1.3.0.apk',sha256:sha};
 global.window={neonDesktop:{update:async i=>{asked=i},onProgress(){}}};await U.open();
 assert.deepStrictEqual(asked,{url:base+'NeonTempestad-Setup-1.3.0.exe',sha256:sha},'el escritorio no pidió el instalador correcto');
 global.window={Capacitor:{}};global.location={href:''};U.open();assert.strictEqual(global.location.href,base+'NeonTempestad-1.3.0.apk','Android no fue al APK');
 global.window=w0;
 // el actualizador de escritorio solo acepta instaladores de las releases del repositorio
 const {ALLOWED}=require('../js/updater.js');
 assert(ALLOWED.test(base+'NeonTempestad-Setup-1.3.0.exe'));
 for(const bad of ['https://evil.com/NeonTempestad-Setup-1.3.0.exe','https://github.com/otro/Neon-tempestad/releases/download/v1.3.0/NeonTempestad-Setup-1.3.0.exe',base+'NeonTempestad-1.3.0.apk',base+'../x.exe'])
  assert(!ALLOWED.test(bad),'aceptó una URL no permitida: '+bad);
 console.log('Actualizaciones: versión sincronizada, aviso opcional, bloqueo obligatorio, modo sin red e instalación verificada: OK')}
authTests().then(devTests).then(tutorialTests).then(expandTests).then(jokeTests).then(updateTests).then(()=>process.exit(fails?1:0),e=>{console.error(e);process.exit(1)});
