// Prueba como teléfono: `node tools/phone.js [navegador] [carpeta]`
// Emula pantallas de móvil reales (táctil, DPR alto, horizontal) con el protocolo DevTools,
// juega con toques de verdad (joystick, ataque arrastrado, definitiva al soltar) y guarda capturas.
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const root=path.join(__dirname,'..');
const CANDIDATES=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
 'C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe','/usr/bin/google-chrome','/usr/bin/chromium'];
const exe=process.argv[2]||CANDIDATES.find(f=>fs.existsSync(f));
const out=process.argv[3]||path.join(os.tmpdir(),'neon-capturas');
if(!exe){console.log('No se encontró Chrome/Edge/Brave');process.exit(2)}
fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// teléfonos típicos en horizontal (CSS px) y su densidad
const PHONES=[{n:'20x9',w:800,h:360,dpr:3},{n:'16x9',w:640,h:360,dpr:2},{n:'tablet',w:1024,h:600,dpr:2}];
(async()=>{
 const prof=fs.mkdtempSync(path.join(os.tmpdir(),'neon-prof-'));
 const br=spawn(exe,['--headless=new','--remote-debugging-port=9334','--allow-file-access-from-files',`--user-data-dir=${prof}`,'about:blank'],{stdio:'ignore'});
 let tabs;for(let i=0;i<50&&!tabs;i++){await sleep(200);try{tabs=await (await fetch('http://127.0.0.1:9334/json')).json()}catch(e){}}
 const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let id=0;const pend={},errors=[];let fails=0;
 ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend[d.id]){pend[d.id](d);delete pend[d.id]}
  if(d.method==='Runtime.exceptionThrown'){const x=d.params.exceptionDetails;errors.push((x.exception?.description||x.text)+` @${x.url||'?'}:${x.lineNumber}`)}
  if(d.method==='Runtime.consoleAPICalled'&&d.params.type==='error')errors.push('console.error: '+d.params.args.map(a=>a.value??a.description).join(' '))};
 const cmd=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
 const js=async e=>{const r=await cmd('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true});if(r.result.exceptionDetails)errors.push('[evaluate] '+e.slice(0,60));return r.result.result?.value};
 const shot=async name=>{const r=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.result.data,'base64'));console.log('captura',name)};
 const touch=(type,pts)=>cmd('Input.dispatchTouchEvent',{type,touchPoints:pts.map((p,i)=>({x:p[0],y:p[1],id:p[2]??i}))});
 const check=(ok,msg)=>{if(!ok){fails++;console.log('FALLO:',msg)}};
 await cmd('Runtime.enable');await cmd('Page.enable');
 for(const ph of PHONES){
  await cmd('Emulation.setDeviceMetricsOverride',{width:ph.w,height:ph.h,deviceScaleFactor:ph.dpr,mobile:true,screenOrientation:{type:'landscapePrimary',angle:90}});
  await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await cmd('Page.navigate',{url:'file:///'+path.join(root,'html','index.html').replace(/\\/g,'/')+'?unlockall'});await sleep(2200);
  await shot(`m-${ph.n}-0-inicio`);
  await js("Save.d.settings.touch='auto';start('vanguard',1);S.spawn=2");await sleep(1500);
  check(await js("document.body.classList.contains('touchmode')&&getComputedStyle($('touch')).display==='block'"),ph.n+': no se detectó la pantalla táctil');
  // ningún botón se sale de la pantalla ni se pisa con otro
  const rects=await js(`[...document.querySelectorAll('#touch .tb')].filter(b=>getComputedStyle(b).display!=='none').map(b=>{const r=b.getBoundingClientRect();return {a:b.dataset.a,l:r.left,t:r.top,r:r.right,b:r.bottom}})`);
  for(const r of rects)check(r.l>=0&&r.t>=0&&r.r<=ph.w+1&&r.b<=ph.h+1,`${ph.n}: el botón ${r.a} se sale de la pantalla`);
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const A=rects[i],B=rects[j],ax=(A.l+A.r)/2,ay=(A.t+A.b)/2,bx=(B.l+B.r)/2,by=(B.t+B.b)/2;
   check(Math.hypot(ax-bx,ay-by)>=(A.r-A.l+B.r-B.l)/2-2,`${ph.n}: ${A.a} y ${B.a} se pisan`)}
  const btn=a=>rects.find(r=>r.a===a),mid=r=>[(r.l+r.r)/2,(r.t+r.b)/2];
  // joystick: mantener a la derecha mueve al héroe
  const x0=await js('S.p.x');await touch('touchStart',[[120,ph.h-90]]);for(let i=1;i<=6;i++){await touch('touchMove',[[120+i*12,ph.h-90]]);await sleep(30)}
  await sleep(500);await shot(`m-${ph.n}-1-joystick`);await touch('touchEnd',[]);check(await js('S.p.x')>x0+40,ph.n+': el joystick no movió al héroe');
  // ataque arrastrado: aparece la línea de mira y se dispara hacia arriba a la izquierda
  const [ax,ay]=mid(btn('primary'));await touch('touchStart',[[ax,ay]]);for(let i=1;i<=5;i++){await touch('touchMove',[[ax-i*10,ay-i*8]]);await sleep(30)}
  await sleep(250);check(await js('TAIM.on&&TAIM.a!=null&&Math.abs(AIM.ang-Math.atan2(-8,-10))<.05'),ph.n+': el ataque arrastrado no apunta');await shot(`m-${ph.n}-2-apuntar`);await touch('touchEnd',[]);
  // definitiva: se lanza al soltar; luego muestra el enfriamiento en el botón
  await js("S.p.cd.u=0");const [ux,uy]=mid(btn('ult'));await touch('touchStart',[[ux,uy]]);await sleep(150);check(await js('S.p.cd.u<=0'),ph.n+': la definitiva salió al apoyar el dedo');
  await touch('touchEnd',[]);await sleep(300);check(await js('S.p.cd.u>0'),ph.n+': la definitiva no salió al soltar');
  await sleep(200);check(await js("document.querySelector('#touch .ult').classList.contains('cool')"),ph.n+': el botón no muestra el enfriamiento');
  // saltar con el pulgar mientras se mueve (multitáctil)
  const [jx,jy]=mid(btn('jump'));await touch('touchStart',[[120,ph.h-90,0]]);await touch('touchMove',[[180,ph.h-90,0]]);await touch('touchStart',[[180,ph.h-90,0],[jx,jy,1]]);await sleep(200);
  check(await js('!S.p.ground||S.p.vy<0'),ph.n+': el salto multitáctil no funcionó');await touch('touchEnd',[]);
  await sleep(900);await shot(`m-${ph.n}-3-combate`);
  // inventario: se abre con el botón táctil, tocar un objeto muestra qué hace y hay un botón para volver al juego
  await js("for(const id of ['sharp','lens','coil','tesla','ankh'])giveItem(id,1)");const rc=async sel=>js(`(()=>{const r=document.querySelector('${sel}').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`);
  let [ix,iy]=await rc('#touch [data-a="inventory"]');await touch('touchStart',[[ix,iy]]);await touch('touchEnd',[]);await sleep(300);check(await js("S.st==='inv'"),ph.n+': el botón no abrió el inventario');
  [ix,iy]=await rc('#invList .itile:nth-child(3)');await touch('touchStart',[[ix,iy]]);await touch('touchEnd',[]);await sleep(200);
  check(await js("document.querySelector('#invList .itile:nth-child(3)').classList.contains('sel')&&$('invDetail').textContent.length>10"),ph.n+': tocar un objeto no mostró qué hace');
  await shot(`m-${ph.n}-4-inventario`);[ix,iy]=await rc('#invClose');await touch('touchStart',[[ix,iy]]);await touch('touchEnd',[]);await sleep(200);
  check(await js("S.st==='play'"),ph.n+': no se pudo salir del inventario en el teléfono');
 }
 check(!errors.length,'errores de consola:\n'+errors.join('\n'));
 console.log(fails?`${fails} fallos`:'Teléfono: joystick, ataque apuntado, definitiva al soltar, enfriamientos, multitáctil, inventario táctil y botones dentro de pantalla: OK');
 ws.close();br.kill();process.exit(fails?1:0)})();
