// Prueba en navegador real: `node tools/browser.js [ruta-del-navegador] [carpeta-de-capturas]`
// Abre index.html en un Chromium sin ventana (Chrome, Edge o Brave) mediante el protocolo DevTools,
// recorre menú → partida → jefe, guarda capturas PNG y falla si hay errores en la consola.
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const root=path.join(__dirname,'..');
const CANDIDATES=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
 'C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
 '/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const exe=process.argv[2]||CANDIDATES.find(f=>fs.existsSync(f));
const out=process.argv[3]||path.join(os.tmpdir(),'neon-capturas');
if(!exe){console.log('No se encontró Chrome/Edge/Brave; pasa la ruta como primer argumento.');process.exit(2)}
fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
 const prof=fs.mkdtempSync(path.join(os.tmpdir(),'neon-prof-'));
 const br=spawn(exe,['--headless=new','--remote-debugging-port=9333','--window-size=1280,720','--force-device-scale-factor=1.5',
  '--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required',`--user-data-dir=${prof}`,'about:blank'],{stdio:'ignore'});
 let tabs;for(let i=0;i<50&&!tabs;i++){await sleep(200);try{tabs=await (await fetch('http://127.0.0.1:9333/json')).json()}catch(e){}}
 const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let id=0;const pend={},errors=[];
 ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend[d.id]){pend[d.id](d);delete pend[d.id]}
  if(d.method==='Runtime.exceptionThrown'){const x=d.params.exceptionDetails;errors.push((x.exception?.description||x.text)+` @${x.url||'?'}:${x.lineNumber}`)}
  if(d.method==='Runtime.consoleAPICalled'&&d.params.type==='error')errors.push('console.error: '+d.params.args.map(a=>a.value??a.description??a.type).join(' '))};
 const cmd=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
 const js=async e=>{const r=await cmd('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true});if(r.result.exceptionDetails)errors.push('[evaluate] '+e.slice(0,60)+' → '+(r.result.exceptionDetails.exception?.description||JSON.stringify(r.result.exceptionDetails).slice(0,300)));return r.result.result?.value};
 const shot=async name=>{const r=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.result.data,'base64'));console.log('captura',name)};
 await cmd('Runtime.enable');await cmd('Page.enable');
 await cmd('Page.navigate',{url:'file:///'+path.join(root,'html','index.html').replace(/\\/g,'/')+'?unlockall&debug'});await sleep(2500);
 // pantalla de inicio con cosméticos equipados (desfile de héroes)
 await js("Save.d.shop.eq={skin:'prisma',trail:'arcoiris',aura:'alas'};selC='hemo'");await sleep(1500);await shot('01-inicio');
 // tienda: pestaña de estelas mirando una de pago
 await js("Save.d.shop.gems=650;openShop();shopCat='trail';shopSel='fuego';buildShop()");await sleep(900);await shot('01b-tienda');
 await js("shopCat='skin';shopSel='glitch';buildShop()");await sleep(700);await shot('01c-tienda-skin');
 await js("Save.d.shop.eq={};Save.d.shop.gems=0;$('shopBack').click();$('tPlay').click()");
 await js("document.querySelector('[data-k=\"chimera\"]').click()");await sleep(600);await shot('02-seleccion');
 await js("showLogin()");await sleep(400);await shot('02b-cuenta');await js("enterMenu();openRank(3)");await sleep(400);await shot('02c-ranking');await js("$('rBack').click()");
 // galería: los 20 héroes en plena carrera, apuntando y con la capa en movimiento
 await js(`(()=>{const k=document.createElement('canvas');k.id='gal';k.width=1500;k.height=640;k.style.cssText='position:fixed;inset:0;z-index:99;background:#0a0618;width:1000px;height:427px';
  document.body.appendChild(k);const g=k.getContext('2d'),ids=Object.keys(CHARS),cp={};let t=0;
  window.__gal=setInterval(()=>{t+=1/30;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,1500,640);ids.forEach((id,i)=>{const x=75+(i%10)*150,y=250+(i/10|0)*300;
   g.save();g.translate(x,y);g.scale(2.6,2.6);drawHero(g,0,0,{cid:id,col:CHARS[id].color,face:1,aim:Math.sin(t*1.3+i)*.6-.3,run:t*10,moving:1,t,cape:cp[id]||(cp[id]={})});g.restore();
   g.fillStyle='#cfc9f5';g.font='15px monospace';g.textAlign='center';g.fillText(CHARS[id].name,x,y+30)})},33)})()`);
 await sleep(1500);await shot('02d-galeria');await js("clearInterval(window.__gal);document.getElementById('gal').remove()");
 // partida: el bot dispara al enemigo más cercano y abre cofres
 await js(`start('vanguard',1);window.__bot=setInterval(()=>{if(!S||S.st!=='play')return;const e=S.en.find(e=>!e.boss)||S.en[0];
  mouse.l=1;mouse.r=Math.random()<.3;keys.ShiftLeft=Math.random()<.05;keys.KeyQ=1;if(e){mouse.x=e.x-S.cam;mouse.y=e.y-e.h/2}
  if(S.st==='mastery')document.querySelector('#nodes .card').click()},50)`);
 await sleep(6000);await shot('03-partida');
 // la Tempestad: tres anomalías activas (con combinación) y después el trato
 await js("for(const k of S.storm.act.slice())stormEnd(k);stormUnleash('grav');stormUnleash('rayos');stormUnleash('furia');S.storm.stab=38");await sleep(3200);await shot('03b-tempestad');
 await js("openStormDeal()");await sleep(500);await shot('03c-trato');await js("takeDeal('estabilizar');$('storm').style.display='none';S.st='play'");
 for(const [i,b] of [[0,'prisma'],[1,'hydra'],[2,'queen'],[3,'leviathan'],[4,'archon']]){
  await js(`if(S.st!=='play')document.querySelector('#nodes .card')?.click();loadStage(${i});useTP();S.boss.hidden=0;hurtE(S.boss,S.boss.maxHp*.5,{raw:1});S.p.hp=S.p.maxHp`);
  await sleep(4500);await shot(`04-jefe-${i+1}-${b}`)}
 // inventario con objetos de todas las rarezas (sin los fragmentados, que cambian la vida máxima) y HUD con habilidades listas
 await js("Object.values(ITEM).filter(it=>it.r!=='f').filter((it,i)=>i%4===0).forEach(it=>giveItem(it.id,1));S.p.hp=S.p.maxHp;for(const k in S.p.cd)S.p.cd[k]=0");
 await sleep(300);await shot('05b-hud');await js("toggleInv()");await sleep(500);await shot('05-inventario');await js("toggleInv()");
 // Modo Infinito: Loop 2 con paleta nueva y jefes duales; luego el portal dual con el teletransportador listo
 await js("S.loop=1;loadStage(1);useTP();for(const b of S.bosses){b.hidden=0;b.t=1}S.p.hp=S.p.maxHp");await sleep(4500);await shot('11-loop-jefes-duales');
 await js("for(const b of S.bosses.slice())for(let i=0;i<3;i++)hurtE(b,1e12,{raw:1});S.tp.charge=1");await sleep(400);
 await js("S.p.x=S.tp.x-40;S.p.y=S.tp.y;S.p.vx=0;clearInterval(window.__bot);mouse.l=mouse.r=0;keys.ShiftLeft=keys.KeyQ=0");
 for(let i=0;i<6;i++){await js("if(S.st==='mastery')document.querySelector('#nodes .card').click();S.p.x=S.tp.x-40;S.p.y=S.tp.y");await sleep(300)}await sleep(600);await shot('12-portal-dual');
 // audio real: el contexto debe arrancar y la música programar notas
 await cmd('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyM',key:'m'});await cmd('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyM',key:'m'});
 await js("Save.d.settings.mute=false;Snd.apply()");await sleep(400);
 console.log('Audio:',await js("Snd.ctx?Snd.ctx.state+' · pasos de música '+Snd.step:'sin AudioContext'"));
 await js("togglePause()");await sleep(400);await shot('07-pausa');
 await js("openOpts('pause')");await sleep(400);await shot('08-opciones');
 await js("hide('opts');openCtrls('pause')");await sleep(400);await shot('09-controles');
 await js("hide('ctrls');togglePause();Save.d.settings.touch='on'");await sleep(800);await shot('10-tactil');await js("Save.d.settings.touch='off'");
 await js("setQuality('baja')");await sleep(1500);await shot('06-calidad-baja');
 const fps=await js("new Promise(r=>{let n=0,t0=performance.now();(function f(){n++;if(performance.now()-t0<2000)requestAnimationFrame(f);else r(n/2)})()})");
 console.log('FPS (headless, calidad baja):',fps);
 await js("setQuality('alta')");
 const fps2=await js("new Promise(r=>{let n=0,t0=performance.now();(function f(){n++;if(performance.now()-t0<2000)requestAnimationFrame(f);else r(n/2)})()})");
 console.log('FPS (headless, calidad alta):',fps2);
 ws.close();br.kill();
 console.log(errors.length?'ERRORES EN CONSOLA:\n'+errors.join('\n'):'Consola sin errores');
 console.log('Capturas en',out);process.exit(errors.length?1:0);
})();
