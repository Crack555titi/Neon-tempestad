'use strict';
/* ===================== CUENTAS Y CLASIFICACIÓN =====================
   Cuentas locales (localStorage de este navegador/dispositivo): nombre + contraseña con sal y SHA-256.
   No es seguridad real (quien tenga acceso al dispositivo puede borrar o editar el almacenamiento); sirve
   para separar a quienes comparten equipo en el ranking. La clasificación guarda las 50 mejores por dificultad
   y se mezcla con entradas ficticias precargadas (generadas con semilla fija, nunca se guardan). */
const AUTH_USERS='neonTempestad.users',AUTH_SESSION='neonTempestad.session',AUTH_BOARD='neonTempestad.board';
const DIFF_MULT=[.6,1,1.5,2.2,3];  // multiplicador de puntuación por dificultad
const readJSON=(k,def)=>{try{return JSON.parse(STORE.getItem(k))||def}catch(e){return def}};
const writeJSON=(k,v)=>{try{STORE.setItem(k,JSON.stringify(v))}catch(e){}};

// SHA-256 en hexadecimal. shortcut: sin crypto.subtle (contexto no seguro) cae a FNV-1a, más débil; vale para cuentas locales
async function sha256(s){
 if(typeof crypto!=='undefined'&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
 let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return 'fnv'+h.toString(16)}
const newSalt=()=>Array.from({length:16},()=>Math.floor(Math.random()*16).toString(16)).join('');

/* Puntuación de una partida: progreso (etapas, ciclos, victoria), combate (bajas, nivel) y rapidez si ganas, × dificultad */
function scoreRun(r){
 const base=r.kills*12+r.lvl*150+r.stages*2000+(r.loop-1)*10000+(r.win?6000+Math.max(0,3000-r.time):0);
 return Math.round(base*DIFF_MULT[r.diff])}

const Auth={
 user:null,   // nombre de la cuenta activa; null = invitado (no entra en el ranking)
 users(){return readJSON(AUTH_USERS,{})},
 valid(name,pass){
  if(!/^[\wáéíóúüñÁÉÍÓÚÜÑ.-]{3,16}$/.test(name))return 'El nombre debe tener de 3 a 16 letras, números, punto, guion o guion bajo.';
  if(pass.length<4)return 'La contraseña debe tener al menos 4 caracteres.';return ''},
 async register(name,pass){name=name.trim();const err=this.valid(name,pass);if(err)return err;
  const us=this.users();if(Object.keys(us).some(k=>k.toLowerCase()===name.toLowerCase()))return 'Ese nombre ya está en uso en este dispositivo.';
  const salt=newSalt();us[name]={salt,hash:await sha256(salt+pass),created:Date.now()};writeJSON(AUTH_USERS,us);this.setUser(name);return ''},
 async login(name,pass){name=name.trim();const us=this.users(),k=Object.keys(us).find(k=>k.toLowerCase()===name.toLowerCase());
  if(!k||us[k].hash!==await sha256(us[k].salt+pass))return 'Usuario o contraseña incorrectos.';this.setUser(k);return ''},
 setUser(name){this.user=name;try{name?STORE.setItem(AUTH_SESSION,name):STORE.removeItem(AUTH_SESSION)}catch(e){}},
 logout(){this.setUser(null);showLogin()},

 /* ---- clasificación ---- */
 board(diff){
  const real=readJSON(AUTH_BOARD,{})[diff]||[];
  return real.concat(seedBoard(diff)).sort((a,b)=>b.score-a.score).slice(0,50)},
 // registra la partida que acaba de terminar; devuelve {score, rank} o {score} si no hay cuenta
 submit(win){if(!S)return null;
  const r={user:this.user,ch:S.ch.name,lvl:S.p.lvl,loop:(S.loop||0)+1,time:Math.round(S.t),kills:S.kills,
   stages:(S.loop||0)*STAGES.length+S.stage+(win?1:0),win:!!win,diff:DIFFS.indexOf(S.df),date:Date.now()};
  r.score=scoreRun(r);if(!this.user)return {score:r.score};
  const all=readJSON(AUTH_BOARD,{}),list=(all[r.diff]=all[r.diff]||[]);list.push(r);list.sort((a,b)=>b.score-a.score);list.length=Math.min(list.length,50);
  writeJSON(AUTH_BOARD,all);const rank=this.board(r.diff).findIndex(e=>e.date===r.date&&e.user===r.user)+1;
  return {score:r.score,rank:rank||null}}
};

/* Entradas ficticias realistas: semilla fija por dificultad → siempre las mismas, puntuaciones con la misma fórmula */
const SEED_NAMES=['NeonVandal','k1r4','LunaRota','Sp3ctra','Draxx','pixelmancer','Vórtice','ElGatoNegro','Zeph','m0rgana','Kaiju_88','RunaFría',
 'Tesla_Kid','Brasa','nyx','CromoAzul','Halcón77','Glitchy','Valquiria','sombra_','Ozono','QuasarQ','Mantis','Ferroviaria'];
const seedCache={};
function seedBoard(diff){if(seedCache[diff])return seedCache[diff];
 let s=(diff+1)*2654435761>>>0;const rnd=()=>{s=s+0x6D2B79F5>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296};
 const chars=Object.values(CHARS).map(c=>c.name),out=[];
 for(let i=0;i<12;i++){const skill=Math.pow(rnd(),1.6)*(1-diff*.12),loops=1+Math.floor(skill*skill*(diff<4?6:3)),
   stages=Math.min(STAGES.length*loops,Math.floor(1+skill*5*loops)),win=stages>=STAGES.length,
   time=Math.round(stages*(150+rnd()*90)+(diff===4?2700:0)),lvl=Math.min(99,Math.round((diff===4?20:3)+stages*3.2+rnd()*4)),
   kills=Math.round(stages*(45+rnd()*40)*(1+diff*.15)),r={user:SEED_NAMES[(i*7+diff*5)%SEED_NAMES.length],ch:chars[Math.floor(rnd()*chars.length)],
   lvl,loop:loops,time,kills,stages,win,diff,seed:1};
  r.score=scoreRun(r);out.push(r)}
 return seedCache[diff]=out}

/* ===================== PANTALLAS ===================== */
const fmtTime=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
let rankTab=1;
function showLogin(){$('menu').style.display='none';$('login').style.display='flex';$('lErr').textContent='';$('lPass').value='';setTimeout(()=>$('lUser').focus(),50)}
function enterMenu(){$('login').style.display='none';$('menu').style.display='flex';updateWho();buildMenu()}
function updateWho(){$('who').innerHTML=Auth.user?`👤 <b>${esc(Auth.user)}</b> · <a href="#" id="logout">salir</a>`:'👤 Invitado · <a href="#" id="logout">entrar</a>';
 $('logout').onclick=e=>{e.preventDefault();Auth.logout()}}
async function doAuth(reg){const u=$('lUser').value,p=$('lPass').value,err=await (reg?Auth.register(u,p):Auth.login(u,p));
 if(err){$('lErr').textContent=err;Snd.play('hurt');return}Snd.init();Snd.play('ui');enterMenu()}
function openRank(tab){if(tab!==undefined)rankTab=tab;$('menu').style.display='none';$('rank').style.display='flex';
 $('rTabs').innerHTML=DIFFS.map((d,i)=>`<button class="sec tab${i===rankTab?' on':''}" data-i="${i}">${esc(d.name)}</button>`).join('');
 const rows=Auth.board(rankTab).slice(0,15);
 $('rBody').innerHTML=rows.map((r,i)=>`<tr class="${r.user===Auth.user&&!r.seed?'me':''}"><td>${i+1}</td><td>${esc(r.user)}</td><td>${esc(r.ch)}</td><td>${r.lvl}</td><td>${r.loop}</td><td>${fmtTime(r.time)}</td><td>${r.score.toLocaleString('es')}</td></tr>`).join('');
 $('rNote').textContent=Auth.user?`Tus partidas aparecen resaltadas. Multiplicador de ${DIFFS[rankTab].name}: ×${DIFF_MULT[rankTab]}`:'Juega con una cuenta para entrar en la clasificación.'}
$('rTabs').onclick=e=>{const b=e.target.closest('.tab');if(b){openRank(+b.dataset.i);Snd.play('ui')}};
$('rBack').onclick=()=>{$('rank').style.display='none';$('menu').style.display='flex'};
$('mRank').onclick=()=>openRank(selD);
$('lForm').onsubmit=e=>{e.preventDefault();doAuth(false)};
$('lReg').onclick=()=>doAuth(true);
$('lGuest').onclick=e=>{e.preventDefault();Auth.setUser(null);enterMenu()};
$('endRank').onclick=()=>{$('end').style.display='none';openRank(S?DIFFS.indexOf(S.df):selD)};

// arranque: con sesión guardada se entra directo; sin ella, la pantalla de cuenta (salvo en pruebas: ?unlockall o ?guest)
(function(){let u=null;try{u=STORE.getItem(AUTH_SESSION)}catch(e){}
 if(u&&Auth.users()[u]){Auth.user=u;updateWho()}
 else if(typeof location!=='undefined'&&/[?&](guest|unlockall)\b/.test(location.search))updateWho();
 else showLogin()})();
