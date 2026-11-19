// Genera los iconos y la pantalla de carga, dibujados en canvas (nada de imágenes externas):
//   build/icon.png               → icono del .exe (electron-builder lo recoge solo de build/)
//   build/android/res/**.png     → iconos y splash de Android (tools/android-setup.js los copia a android/)
// Uso: `node tools/make-icons.js [ruta-del-navegador]` (Chrome, Edge o Brave en modo headless).
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const root=path.join(__dirname,'..');
const exe=process.argv[2]||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
 'C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
 '/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(f=>fs.existsSync(f));
if(!exe){console.log('No se encontró Chrome/Edge/Brave; pasa la ruta como primer argumento.');process.exit(2)}

// [ruta de salida, ancho, alto, modo]  modo: full (cuadrado redondeado) · round (círculo) · fg (capa frontal del icono adaptativo) · splash
const D=['mdpi',1,'hdpi',1.5,'xhdpi',2,'xxhdpi',3,'xxxhdpi',4],T=[['build/icon.png',512,512,'full']];
for(let i=0;i<D.length;i+=2){const d=D[i],k=D[i+1],r=`build/android/res/mipmap-${d}/`;
 T.push([r+'ic_launcher.png',48*k,48*k,'full'],[r+'ic_launcher_round.png',48*k,48*k,'round'],[r+'ic_launcher_foreground.png',108*k,108*k,'fg'])}
const SPL={mdpi:[480,320],hdpi:[800,480],xhdpi:[1280,720],xxhdpi:[1600,960],xxxhdpi:[1920,1280]};
T.push(['build/android/res/drawable/splash.jpg',480,320,'splash']);  // JPEG: el degradado en PNG pesaba ~10 MB entre todas
for(const d in SPL){const [w,h]=SPL[d];T.push([`build/android/res/drawable-land-${d}/splash.jpg`,w,h,'splash'],[`build/android/res/drawable-port-${d}/splash.jpg`,h,w,'splash'])}

// se ejecuta dentro del navegador
function render(w,h,mode){
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d'),S=Math.min(w,h),u=S/100;
 const bg=(x,y,s)=>{const gr=g.createRadialGradient(x,y,0,x,y,s*.75);gr.addColorStop(0,'#2a0f55');gr.addColorStop(1,'#05030d');return gr};
 if(mode==='full'){g.fillStyle=bg(w/2,h/2,S);g.beginPath();g.roundRect(0,0,w,h,22*u);g.fill()}
 if(mode==='round'){g.fillStyle=bg(w/2,h/2,S);g.beginPath();g.arc(w/2,h/2,S/2,0,6.283);g.fill()}
 if(mode==='splash'){g.fillStyle=bg(w/2,h/2,Math.max(w,h));g.fillRect(0,0,w,h)}
 // emblema: anillo cian + rayo magenta, centrado en (cx,cy) con tamaño s (≈ diámetro útil)
 const emblem=(cx,cy,s)=>{const v=s/100;g.save();g.translate(cx,cy);
  g.lineCap='round';g.shadowColor='#3cf0ff';g.shadowBlur=8*v;g.strokeStyle='#3cf0ff';g.lineWidth=5*v;
  g.beginPath();g.arc(0,0,38*v,-2.2,3.6);g.stroke();g.beginPath();g.arc(0,0,38*v,3.85,4.0);g.stroke();
  g.shadowBlur=0;g.strokeStyle='#ffffffaa';g.lineWidth=1.6*v;g.beginPath();g.arc(0,0,38*v,-2.2,3.6);g.stroke();
  // rayo (mismo trazado que el glifo «bolt» del juego, 24×24)
  const b=new Path2D('M14 0L3 14h7l-3 10 12-14h-7l4-10z');g.save();g.scale(2.6*v,2.6*v);g.translate(-11,-12);
  g.shadowColor='#ff3cf2';g.shadowBlur=3;g.fillStyle='#ff3cf2';g.fill(b);g.fill(b);g.shadowBlur=0;
  g.strokeStyle='#ffd6fb';g.lineWidth=.7;g.lineJoin='round';g.stroke(b);g.restore();
  // chispas
  g.fillStyle='#ffd23c';g.shadowColor='#ffd23c';g.shadowBlur=4*v;for(const [a,r] of [[-.6,44],[2.5,44],[1.2,47]]){g.beginPath();g.arc(Math.cos(a)*r*v,Math.sin(a)*r*v,2.6*v,0,6.283);g.fill()}
  g.restore()};
 if(mode==='splash'){const s=S*.5;emblem(w/2,h/2-S*.08,s);g.textAlign='center';g.font=`bold ${S*.075}px monospace`;g.shadowBlur=S*.02;
  g.shadowColor='#ff3cf2';g.fillStyle='#ff3cf2';g.fillText('NEÓN',w/2-S*.2,h/2+S*.3);g.shadowColor='#3cf0ff';g.fillStyle='#3cf0ff';g.fillText('TEMPESTAD',w/2+S*.1,h/2+S*.3)}
 else emblem(w/2,h/2,mode==='fg'?S*.6:S*.9);  // la capa frontal adaptativa solo garantiza visible el 66% central
 return (mode==='splash'?cv.toDataURL('image/jpeg',.88):cv.toDataURL('image/png')).split(',')[1];
}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const prof=fs.mkdtempSync(path.join(os.tmpdir(),'neon-icon-'));
 const br=spawn(exe,['--headless=new','--remote-debugging-port=9335',`--user-data-dir=${prof}`,'about:blank'],{stdio:'ignore'});
 let tabs;for(let i=0;i<50&&!tabs;i++){await sleep(200);try{tabs=await (await fetch('http://127.0.0.1:9335/json')).json()}catch(e){}}
 const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let id=0;const pend={};ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend[d.id]){pend[d.id](d);delete pend[d.id]}};
 const js=e=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method:'Runtime.evaluate',params:{expression:e,returnByValue:true}}))});
 for(const [f,w,h,mode] of T){const r=await js(`(${render})(${w},${h},'${mode}')`);
  if(r.result.exceptionDetails)throw new Error(f+': '+JSON.stringify(r.result.exceptionDetails).slice(0,300));
  const out=path.join(root,f);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,Buffer.from(r.result.result.value,'base64'))}
 ws.close();br.kill();console.log(`${T.length} imágenes generadas en build/`);
})();
