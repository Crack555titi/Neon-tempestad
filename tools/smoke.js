// Prueba headless: `node tools/smoke.js`
// Carga los scripts de index.html con DOM/canvas simulados, comprueba arreglos concretos
// y juega cada personaje × dificultad buscando excepciones. No valida lo visual.
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const files=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);

const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='createLinearGradient'?()=>({addColorStop(){}}):k==='measureText'?s=>({width:String(s).length*7}):()=>{}),set:(t,k,v)=>(t[k]=v,true)});
const els={},L={};
const el=id=>els[id]||(els[id]={id,style:{setProperty(){}},innerHTML:'',textContent:'',width:960,height:540,getContext:()=>ctx,addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:960,height:540})});
Object.assign(global,{document:{getElementById:el},addEventListener:(n,f)=>{L[n]=f},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){}});
eval(files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n;\n')+
 '\n;global.T={start,get S(){return S},update,draw,keys,mouse,CHARS,DIFFS,PLAT,hurtE,hurtP,TX,Save,isUnlocked,ACHIEVEMENTS,AB,spawnEnemy,cast,ab,Ev,ITEMS,FRAGMENTS,ITEM,giveItem,priceOf,interact,applyDot,kill,BL,PR,PT};');

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
// 15. Pesadilla empieza con 35 objetos
T.start('vanguard',4);assert.strictEqual(Object.values(T.S.p.items).reduce((a,b)=>a+b,0),35);
// 16. Todos los objetos ×2 a la vez en cada personaje (20 s, vida rellenada): busca excepciones y bucles infinitos de procs
for(const ch of Object.keys(T.CHARS)){reset();T.start(ch,1);for(const it of T.ITEMS)for(let k=0;k<2;k++)T.giveItem(it.id,1);
 Object.assign(T.mouse,{x:700,y:300});T.keys.ShiftLeft=T.keys.KeyQ=1;
 for(let f=0;f<60*20&&T.S.st!=='over';f++){T.mouse.l=T.mouse.r=f%50<40;if(f%60===0){T.S.p.hp=T.S.p.maxHp;T.S.p.items.ankh=2}step()}}
// 17. Cada fragmentado por separado (15 s)
for(const fr of T.FRAGMENTS){reset();T.start('artillery',1);T.giveItem(fr.id,1);T.mouse.l=1;T.keys.ShiftLeft=T.keys.KeyQ=1;
 for(let f=0;f<60*15&&T.S.st!=='over';f++){if(f%60===0)T.S.p.hp=T.S.p.maxHp;if(f%20===0&&T.S.near&&T.S.near.k==='chest'){T.S.p.gold=1e6;T.interact()}step()}}
console.log('Objetos, economía, cofres, altares y sinergias: OK');


// Matriz: cada personaje × dificultad, 4 min simulados, vida rellenada y jefe forzado por fases → solo busca excepciones
let fails=0;
for(const ch of Object.keys(T.CHARS))for(let d=0;d<T.DIFFS.length;d++){
 try{reset();T.start(ch,d);Object.assign(T.mouse,{l:1,r:1,x:700,y:300});T.keys.ShiftLeft=T.keys.KeyQ=1;
  let f=0;for(;f<60*240&&T.S.st!=='over';f++){T.keys.KeyD=(f/120|0)%2;T.keys.KeyA=!T.keys.KeyD;T.mouse.l=T.mouse.r=f%50<40; // soltar a ratos: las habilidades de carga se lanzan al soltar
   if(f%300===0)T.S.p.hp=T.S.p.maxHp;if(T.S.boss&&f%30===0)T.hurtE(T.S.boss,200);step()}
  if(T.S.st!=='over')throw new Error('el jefe no murió en 4 min');
 }catch(e){fails++;console.log('FALLO',ch,d,e.stack.split('\n').slice(0,3).join(' | '))}}

// Bot que apunta al enemigo más cercano y suelta los botones a ratos
function bot(ch,d,secs){reset();T.start(ch,d);T.keys.ShiftLeft=T.keys.KeyQ=1;let f=0;
 for(;f<60*secs&&T.S.st!=='over';f++){const e=T.S.en.reduce((b,e)=>!b||Math.abs(e.x-T.S.p.x)<Math.abs(b.x-T.S.p.x)?e:b,null);T.mouse.l=T.mouse.r=f%50<40;
  if(e){T.mouse.x=e.x-T.S.cam;T.mouse.y=e.y-e.h/2;T.keys.KeyA=e.x>T.S.p.x&&Math.abs(e.x-T.S.p.x)<200;T.keys.KeyD=!T.keys.KeyA}
  if(f%20===0&&T.S.near&&(T.S.near.k==='altar'||T.S.p.gold>=T.priceOf(T.S.near)))T.interact();step()}
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
process.exit(fails?1:0);
