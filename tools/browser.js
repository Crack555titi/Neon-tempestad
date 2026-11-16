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
 await cmd('Page.navigate',{url:'file:///'+path.join(root,'index.html').replace(/\\/g,'/')+'?unlockall&debug'});await sleep(2500);
 await shot('01-menu');
 await js("document.querySelector('[data-k=\"chimera\"]').click()");await sleep(600);await shot('02-seleccion');
 // partida: el bot dispara al enemigo más cercano y abre cofres
 await js(`start('vanguard',1);window.__bot=setInterval(()=>{if(!S||S.st!=='play')return;const e=S.en.find(e=>!e.boss)||S.en[0];
  mouse.l=1;mouse.r=Math.random()<.3;keys.ShiftLeft=Math.random()<.05;keys.KeyQ=1;if(e){mouse.x=e.x-S.cam;mouse.y=e.y-e.h/2}
  if(S.st==='mastery')document.querySelector('#nodes .card').click()},50)`);
 await sleep(6000);await shot('03-partida');
 for(const [i,b] of [[0,'prisma'],[1,'hydra'],[2,'queen'],[3,'leviathan'],[4,'archon']]){
  await js(`if(S.st!=='play')document.querySelector('#nodes .card')?.click();loadStage(${i});useTP();S.boss.hidden=0;hurtE(S.boss,S.boss.maxHp*.5,{raw:1});S.p.hp=S.p.maxHp`);
  await sleep(4500);await shot(`04-jefe-${i+1}-${b}`)}
 await js("toggleInv()");await sleep(500);await shot('05-inventario');await js("toggleInv()");
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
