'use strict';
/* ===================== CUENTAS Y CLASIFICACIÓN ONLINE (Firebase) =====================
   Sin librerías: API REST de Firebase Auth (usuario + contraseña) y de Firestore (clasificación).
   - El usuario no ve correos: el nombre se convierte en `nombre@neontempestad.game`, único en todo el proyecto.
   - Ranking global en boards/{dificultad}/scores. Las reglas de Firestore solo dejan crear puntuaciones con tu propio
     nombre, con valores dentro de rango, y nadie puede editarlas ni borrarlas.
   - Sin conexión se juega igual: las partidas quedan en cola y se suben al volver la red; el ranking muestra
     la última copia descargada. Mientras haya pocas partidas reales, se rellena con entradas ficticias (atenuadas).
   La apiKey de Firebase no es secreta: identifica el proyecto; lo que protege los datos son las reglas. */
const FB={apiKey:'AIzaSyCHLh8sDhUFgR9gYXneoOSYBc7KiSHzjzA',project:'neon-tempestad',domain:'neontempestad.game'};
const FS_URL=`https://firestore.googleapis.com/v1/projects/${FB.project}/databases/(default)/documents`;
const AUTH_SESSION='neonTempestad.session2',AUTH_PENDING='neonTempestad.pending',AUTH_CACHE='neonTempestad.boardCache';
const DIFF_MULT=[.6,1,1.5,2.2,3];  // multiplicador de puntuación por dificultad
const readJSON=(k,def)=>{try{return JSON.parse(STORE.getItem(k))||def}catch(e){return def}};
const writeJSON=(k,v)=>{try{STORE.setItem(k,JSON.stringify(v))}catch(e){}};

/* Puntuación de una partida: progreso (etapas, ciclos, victoria), combate (bajas, nivel) y rapidez si ganas, × dificultad */
function scoreRun(r){
 const base=r.kills*12+r.lvl*150+r.stages*2000+(r.loop-1)*10000+(r.win?6000+Math.max(0,3000-r.time):0);
 return Math.round(base*DIFF_MULT[r.diff])}

/* ---------- REST ---------- */
class NetError extends Error{}  // sin conexión o servidor caído: se reintenta más tarde
async function api(url,body,token){let r;
 try{r=await fetch(url,{method:'POST',headers:Object.assign({'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:JSON.stringify(body)})}
 catch(e){throw new NetError('sin conexión')}
 const j=await r.json().catch(()=>({}));if(r.status>=500)throw new NetError('servidor');
 if(!r.ok){const e=new Error((j.error&&j.error.message)||('HTTP '+r.status));e.status=r.status;throw e}return j}
// Firestore guarda {campo:{integerValue:"3"}}; se convierte desde y hacia objetos planos
const toFS=o=>({fields:Object.fromEntries(Object.entries(o).map(([k,v])=>[k,typeof v==='boolean'?{booleanValue:v}:Number.isInteger(v)?{integerValue:String(v)}:{stringValue:String(v)}]))});
const fromFS=d=>Object.fromEntries(Object.entries(d.fields||{}).map(([k,v])=>[k,'integerValue' in v?+v.integerValue:'booleanValue' in v?v.booleanValue:'doubleValue' in v?v.doubleValue:v.stringValue]));
// mensajes de Firebase → español
const AUTH_ERR={EMAIL_EXISTS:'Ese nombre ya está en uso. Elige otro.',INVALID_LOGIN_CREDENTIALS:'Usuario o contraseña incorrectos.',EMAIL_NOT_FOUND:'Usuario o contraseña incorrectos.',
 INVALID_PASSWORD:'Usuario o contraseña incorrectos.',USER_DISABLED:'Esta cuenta está desactivada.',TOO_MANY_ATTEMPTS_TRY_LATER:'Demasiados intentos. Espera unos minutos.',
 OPERATION_NOT_ALLOWED:'Las cuentas no están activadas en el servidor (Authentication › Correo/contraseña).',WEAK_PASSWORD:'La contraseña debe tener al menos 6 caracteres.'};
const authMsg=e=>e instanceof NetError?'Sin conexión: necesitas internet para entrar o crear la cuenta.':AUTH_ERR[String(e.message).split(' ')[0].replace(/:$/,'')]||'No se pudo completar: '+e.message;

const Auth={
 user:null,   // nombre visible de la cuenta activa; null = invitado (no entra en el ranking)
 ses:null,    // {user, uid, idToken, refresh, exp}
 valid(name,pass){
  if(!/^[A-Za-z0-9_-]{3,16}$/.test(name))return 'El nombre debe tener de 3 a 16 letras (sin tildes), números, guion o guion bajo.';
  if(pass.length<6)return 'La contraseña debe tener al menos 6 caracteres.';return ''},
 email:name=>name.toLowerCase()+'@'+FB.domain,
 async register(name,pass){name=name.trim();const err=this.valid(name,pass);if(err)return err;
  try{const r=await api(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FB.apiKey}`,{email:this.email(name),password:pass,returnSecureToken:true});
   await api(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FB.apiKey}`,{idToken:r.idToken,displayName:name,returnSecureToken:false}).catch(()=>{});
   this.setSession({user:name,uid:r.localId,idToken:r.idToken,refresh:r.refreshToken,exp:Date.now()+r.expiresIn*1000});this.flush();return ''}
  catch(e){return authMsg(e)}},
 async login(name,pass){name=name.trim();if(!name||!pass)return 'Escribe tu usuario y contraseña.';
  try{const r=await api(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB.apiKey}`,{email:this.email(name),password:pass,returnSecureToken:true});
   this.setSession({user:r.displayName||name,uid:r.localId,idToken:r.idToken,refresh:r.refreshToken,exp:Date.now()+r.expiresIn*1000});this.flush();return ''}
  catch(e){return authMsg(e)}},
 setSession(s){this.ses=s;this.user=s?s.user:null;try{s?STORE.setItem(AUTH_SESSION,JSON.stringify(s)):STORE.removeItem(AUTH_SESSION)}catch(e){}},
 setUser(name){if(!name)this.setSession(null)},  // solo para pasar a invitado
 logout(){this.setSession(null);showLogin()},
 // token de sesión vigente (dura 1 h; se renueva con el refresh token)
 async token(){const s=this.ses;if(!s)return null;if(Date.now()<s.exp-60000)return s.idToken;
  let r;try{r=await fetch(`https://securetoken.googleapis.com/v1/token?key=${FB.apiKey}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(s.refresh)})}catch(e){throw new NetError('sin conexión')}
  const j=await r.json().catch(()=>({}));if(r.status>=500)throw new NetError('servidor');
  if(!r.ok){this.setSession(null);updateWho();throw new Error('La sesión caducó: vuelve a entrar.')}  // cuenta borrada o desactivada
  Object.assign(s,{idToken:j.id_token,refresh:j.refresh_token,exp:Date.now()+j.expires_in*1000});this.setSession(s);return s.idToken},

 /* ---- clasificación ---- */
 // descarga las 50 mejores de una dificultad; sin red devuelve la última copia guardada
 async fetchBoard(diff){
  try{const r=await api(`${FS_URL}/boards/${diff}:runQuery`,{structuredQuery:{from:[{collectionId:'scores'}],orderBy:[{field:{fieldPath:'score'},direction:'DESCENDING'}],limit:50}});
   const list=r.filter(x=>x.document).map(x=>fromFS(x.document));const c=readJSON(AUTH_CACHE,{});c[diff]=list;writeJSON(AUTH_CACHE,c);return {list,online:true}}
  catch(e){if(!(e instanceof NetError))console.warn('ranking:',e.message);return {list:readJSON(AUTH_CACHE,{})[diff]||[],online:false}}},
 // tabla a mostrar: reales + tus partidas aún sin subir + relleno ficticio mientras haya pocas reales
 async board(diff){const {list,online}=await this.fetchBoard(diff),pend=readJSON(AUTH_PENDING,[]).filter(p=>p.diff===diff).map(p=>Object.assign({pending:1},p.r));
  const real=list.concat(pend).sort((a,b)=>b.score-a.score),fill=real.length<15?seedBoard(diff).slice(0,15-real.length):[];
  return {rows:real.concat(fill).sort((a,b)=>b.score-a.score),online}},
 // registra la partida que acaba de terminar: {score} al momento y {rank} cuando el servidor responde
 submit(win){if(!S)return null;const diff=DIFFS.indexOf(S.df);
  const r={user:this.user||'',uid:this.ses?this.ses.uid:'',ch:S.ch.name.slice(0,24),lvl:clamp(S.p.lvl,1,999),loop:clamp((S.loop||0)+1,1,999),time:Math.round(S.t),
   kills:S.kills,stages:(S.loop||0)*STAGES.length+S.stage+(S.bossDone?1:0),win:!!win,date:Date.now()};
  r.score=Math.min(1e8,scoreRun(Object.assign({diff},r)));if(!this.user)return {score:r.score};
  const q=readJSON(AUTH_PENDING,[]);q.push({diff,r});writeJSON(AUTH_PENDING,q);
  return {score:r.score,done:this.flush().then(async()=>{const {rows,online}=await this.board(diff);
   const i=rows.filter(e=>!e.seed).findIndex(e=>e.date===r.date&&e.uid===r.uid);/* el puesto solo cuenta jugadores reales */return {rank:i+1||null,online,queued:readJSON(AUTH_PENDING,[]).some(p=>p.r.date===r.date)}})}},
 // sube las partidas en cola; los errores de red las dejan para más tarde, los rechazos del servidor las descartan
 async flush(){if(this.flushing)return this.flushing;this.flushing=(async()=>{
  for(const p of readJSON(AUTH_PENDING,[])){if(!this.ses||p.r.uid!==this.ses.uid)continue;
   try{const t=await this.token();await api(`${FS_URL}/boards/${p.diff}/scores`,toFS(p.r),t)}catch(e){if(e instanceof NetError)break;console.warn('puntuación descartada:',e.message)}
   writeJSON(AUTH_PENDING,readJSON(AUTH_PENDING,[]).filter(x=>x.r.date!==p.r.date||x.r.uid!==p.r.uid))}})().finally(()=>{this.flushing=null});return this.flushing}
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
 return seedCache[diff]=out.sort((a,b)=>b.score-a.score)}

/* ===================== PANTALLAS ===================== */
const fmtTime=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
let rankTab=1,rankReq=0;
function showLogin(){$('menu').style.display=$('title').style.display='none';$('login').style.display='flex';$('lErr').textContent='';$('lPass').value='';setTimeout(()=>$('lUser').focus(),50)}
function enterMenu(){$('login').style.display='none';updateWho();goHome()}
function updateWho(){$('who').innerHTML=Auth.user?`👤 <b>${esc(Auth.user)}</b> · <a href="#" id="logout">salir</a>`:'👤 Invitado · <a href="#" id="logout">entrar</a>';
 $('logout').onclick=e=>{e.preventDefault();Auth.logout()}}
async function doAuth(reg){const u=$('lUser').value,p=$('lPass').value;$('lErr').textContent='Conectando…';$('lIn').disabled=$('lReg').disabled=true;
 const err=await (reg?Auth.register(u,p):Auth.login(u,p));$('lIn').disabled=$('lReg').disabled=false;
 if(err){$('lErr').textContent=err;Snd.play('hurt');return}$('lErr').textContent='';Snd.init();Snd.play('ui');enterMenu()}
async function openRank(tab){if(tab!==undefined)rankTab=tab;$('menu').style.display=$('title').style.display='none';$('rank').style.display='flex';
 $('rTabs').innerHTML=DIFFS.map((d,i)=>`<button class="sec tab${i===rankTab?' on':''}" data-i="${i}">${esc(d.name)}</button>`).join('');
 $('rBody').innerHTML='<tr><td colspan="7" class="loading">Cargando clasificación…</td></tr>';$('rNote').textContent='';
 const req=++rankReq,{rows,online}=await Auth.board(rankTab);if(req!==rankReq)return;  // otra pestaña pedida mientras tanto
 const mine=r=>Auth.ses&&r.uid===Auth.ses.uid;
 $('rBody').innerHTML=rows.slice(0,15).map((r,i)=>`<tr class="${r.seed?'seed':mine(r)?'me':''}"><td>${i+1}</td><td>${esc(r.user)}${r.pending?' <small>⏳</small>':''}${r.seed?' <small>IA</small>':''}</td><td>${esc(r.ch)}</td><td>${r.lvl}</td><td>${r.loop}</td><td>${fmtTime(r.time)}</td><td>${r.score.toLocaleString('es')}</td></tr>`).join('');
 $('rNote').textContent=(online?'🌐 Clasificación global':'📴 Sin conexión: última clasificación descargada')+
  (Auth.user?` · Tus partidas resaltadas${rows.some(r=>r.pending)?' (⏳ = pendiente de subir)':''}`:' · Entra con una cuenta para competir')+` · ×${DIFF_MULT[rankTab]} en ${DIFFS[rankTab].name}`}
$('rTabs').onclick=e=>{const b=e.target.closest('.tab');if(b){openRank(+b.dataset.i);Snd.play('ui')}};
$('rBack').onclick=()=>{rankReq++;goHome()};
$('mRank').onclick=()=>openRank(selD);
$('lForm').onsubmit=e=>{e.preventDefault();doAuth(false)};
$('lReg').onclick=()=>doAuth(true);
$('lGuest').onclick=e=>{e.preventDefault();Auth.setSession(null);enterMenu()};
$('endRank').onclick=()=>{$('end').style.display='none';openRank(S?DIFFS.indexOf(S.df):selD)};

// arranque: con sesión guardada se entra directo (y se suben partidas pendientes); sin ella, la pantalla de cuenta
(function(){const s=readJSON(AUTH_SESSION,null);
 if(s&&s.uid&&s.refresh){Auth.ses=s;Auth.user=s.user;updateWho();if(typeof fetch!=='undefined')Auth.flush()}
 else if(typeof location!=='undefined'&&/[?&](guest|unlockall)\b/.test(location.search))updateWho();
 else showLogin()})();
