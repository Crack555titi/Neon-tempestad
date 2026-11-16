// Prueba headless: `node tools/smoke.js`
// Carga los scripts de index.html con DOM/canvas simulados, comprueba arreglos concretos
// y juega cada personaje × dificultad buscando excepciones. No valida lo visual.
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const files=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);

const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}),set:(t,k,v)=>(t[k]=v,true)});
const els={},L={};
const el=id=>els[id]||(els[id]={id,style:{},innerHTML:'',textContent:'',width:960,height:540,getContext:()=>ctx,addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:960,height:540})});
Object.assign(global,{document:{getElementById:el},addEventListener:(n,f)=>{L[n]=f},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){}});
eval(files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n;\n')+
 '\n;global.T={start,get S(){return S},update,draw,keys,mouse,CHARS,DIFFS,PLAT,hurtE,hurtP,TX};');

const step=(n=1)=>{for(let i=0;i<n;i++){if(T.S.st==='mastery')els.nodes.onclick({target:{closest:()=>({dataset:{i:0}})}});T.update(1/60);T.draw()}};
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
console.log('Comprobaciones de arreglos: OK');

// Matriz: cada personaje × dificultad, 4 min simulados, vida rellenada y jefe forzado por fases → solo busca excepciones
let fails=0;
for(const ch of Object.keys(T.CHARS))for(let d=0;d<T.DIFFS.length;d++){
 try{reset();T.start(ch,d);Object.assign(T.mouse,{l:1,r:1,x:700,y:300});T.keys.ShiftLeft=T.keys.KeyQ=1;
  let f=0;for(;f<60*240&&T.S.st!=='over';f++){T.keys.KeyD=(f/120|0)%2;T.keys.KeyA=!T.keys.KeyD;
   if(f%300===0)T.S.p.hp=T.S.p.maxHp;if(T.S.boss&&f%30===0)T.hurtE(T.S.boss,200);step()}
  if(T.S.st!=='over')throw new Error('el jefe no murió en 4 min');
 }catch(e){fails++;console.log('FALLO',ch,d,e.stack.split('\n').slice(0,3).join(' | '))}}

// Supervivencia sin ayuda (indicador de balance, no es una prueba): bot que apunta al enemigo más cercano
const surv=[];
for(let d=0;d<T.DIFFS.length;d++){let tot=0;
 for(const ch of Object.keys(T.CHARS)){reset();T.start(ch,d);T.mouse.l=T.mouse.r=1;T.keys.ShiftLeft=T.keys.KeyQ=1;
  let f=0;for(;f<60*120&&T.S.st!=='over';f++){const e=T.S.en.reduce((b,e)=>!b||Math.abs(e.x-T.S.p.x)<Math.abs(b.x-T.S.p.x)?e:b,null);
   if(e){T.mouse.x=e.x-T.S.cam;T.mouse.y=e.y-e.h/2;T.keys.KeyA=e.x>T.S.p.x&&Math.abs(e.x-T.S.p.x)<200;T.keys.KeyD=!T.keys.KeyA}step()}
  tot+=f/60}
 surv.push(`${T.DIFFS[d].name}: ${(tot/Object.keys(T.CHARS).length).toFixed(0)}s`)}
console.log('Supervivencia media del bot (máx 120s):',surv.join(' · '));
console.log(fails?`${fails} combinaciones fallaron`:'Matriz personajes × dificultades: 0 excepciones');
process.exit(fails?1:0);
