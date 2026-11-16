'use strict';
/* ===================== AUDIO 100% PROCEDURAL (Web Audio API) =====================
   Sin archivos: cada sonido se sintetiza con osciladores y ruido filtrado.
   Música dinámica: un secuenciador genera bajo, arpegio, pad y batería sobre una progresión menor
   cuya tónica depende del escenario; la intensidad sube al cargar el teletransportador y contra el jefe.
   El navegador exige un gesto del usuario antes de sonar: Snd.init() se llama al pulsar una tecla o tocar. */
const mf=n=>440*Math.pow(2,(n-69)/12);  // nota MIDI → Hz
const Snd={
 ctx:null,out:null,sfx:null,mus:null,noise:null,last:{},step:0,next:0,
 init(){
  if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return}
  const AC=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);if(!AC)return;  // sin Web Audio: el juego sigue en silencio
  try{const c=this.ctx=new AC(),comp=c.createDynamicsCompressor();
   this.out=c.createGain();this.out.connect(comp);comp.connect(c.destination);
   this.sfx=c.createGain();this.sfx.connect(this.out);
   const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3200;lp.connect(this.out);this.mus=c.createGain();this.mus.connect(lp);
   const b=this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
   this.apply();setInterval(()=>this.tick(),25)}catch(e){this.ctx=null}},
 apply(){if(!this.ctx)return;const st=Save.d.settings,v=st.vol;this.out.gain.value=st.mute?0:v.master;this.sfx.gain.value=v.sfx;this.mus.gain.value=v.music*.55},
 toggleMute(){const st=Save.d.settings;st.mute=!st.mute;Save.write();this.apply();if(S)say(st.mute?'🔇 Sonido silenciado (M)':'🔊 Sonido activado');syncOptions()},
 tone(f,d,type,v,f2,t,dest){const c=this.ctx;t=t||c.currentTime;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(dest||this.sfx);o.start(t);o.stop(t+d+.03)},
 hiss(d,v,freq,type,t,dest){const c=this.ctx;t=t||c.currentTime;const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;
  f.type=type||'lowpass';f.frequency.value=freq;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(dest||this.sfx);s.start(t,Math.random()*.5);s.stop(t+d+.03)},
 // límite de frecuencia por sonido: con disparos rápidos no se apilan cientos de voces
 play(name){if(!this.ctx||this.ctx.state!=='running')return;const s=SFX[name],now=this.ctx.currentTime;if(!s||now-(this.last[name]||0)<s.gap)return;this.last[name]=now;s.f(this)},
 item(r){if(!this.ctx||this.ctx.state!=='running')return;const ch={c:[0,7],u:[0,4,7],r:[0,4,7,11],l:[0,4,7,12,16],m:[0,3,7,10,14,19],f:[0,1,6,7]}[r]||[0,7],t=this.ctx.currentTime;
  ch.forEach((n,i)=>this.tone(mf(72+n),.4,r==='f'?'sawtooth':'triangle',.07,0,t+i*.06))},
 /* ---------- música ---------- */
 tick(){const c=this.ctx;if(!c||c.state!=='running')return;
  const inten=!S||S.st==='over'?0:S.boss?2:S.tp&&S.tp.state==='charging'?1:0,bpm=[100,122,140][inten],dt=60/bpm/4,root=[57,55,52,50,53][S?S.stage:0];
  if(this.next<c.currentTime)this.next=c.currentTime+.05;
  while(this.next<c.currentTime+.12){if(!S||S.st!=='pause')this.note(this.step,this.next,inten,root,dt);this.next+=dt;this.step++}},
 note(i,t,inten,root,dt){const s=i%16,prog=[0,8,3,10][(i>>4)%4],m=this.mus;  // progresión i–VI–III–VII
  if(s===0)for(const n of [0,3,7])this.tone(mf(root-12+prog+n),dt*16,'triangle',inten?.025:.04,0,t,m);           // pad
  if(s%2===0&&(inten||s%4===0))this.tone(mf(root-24+prog+(s===12&&inten?7:0)),dt*1.8,'sawtooth',.07,0,t,m);    // bajo
  if(inten||s%2===0){const arp=[0,3,7,12,7,3][i%6];this.tone(mf(root+prog+arp+(inten>1?12:0)),dt*1.5,'square',inten>1?.028:.02,0,t,m)} // arpegio
  if(inten>=1){if(s%4===0)this.tone(150,.22,'sine',.32,40,t,m);if(s%2===1)this.hiss(.035,.035,7000,'highpass',t,m)}                  // bombo y charles
  if(inten>=2&&s%8===4){this.hiss(.14,.12,1800,'bandpass',t,m);this.tone(190,.09,'triangle',.07,0,t,m)}                                  // caja
 },
 // une los sonidos a los eventos del juego (se llama en cada start(), tras reiniciar el bus)
 hooks(){
  Ev.on('onCast',slot=>{const d=ab(slot);this.play(slot==='u'?'ult':slot==='m'?'dash':d.t==='melee'||d.t==='combo'||d.t==='hammer'?'melee':'shoot')});
  Ev.on('onHit',(e,d,o,crit)=>{if(!o.dot)this.play(crit?'crit':o.proc?'proc':'hit')});
  Ev.on('onKill',e=>this.play(e.boss?'bossdie':e.elite?'elite':'kill'));
  Ev.on('onTakeDamage',()=>this.play('hurt'));Ev.on('onJump',()=>this.play('jump'));Ev.on('onLevelUp',()=>this.play('level'));
  Ev.on('onChestOpen',()=>this.play('chest'));Ev.on('onBossPhase',()=>this.play('phase'));Ev.on('onGuardBreak',()=>this.play('guard'))}
};
const SFX={
 shoot:{gap:.055,f:s=>s.tone(900+R(-80,80),.07,'square',.04,420)},
 melee:{gap:.07,f:s=>{s.hiss(.09,.12,2600,'bandpass');s.tone(240,.06,'triangle',.05,120)}},
 hit:{gap:.045,f:s=>s.tone(210,.05,'triangle',.07,110)},
 proc:{gap:.06,f:s=>s.tone(1500,.04,'sine',.03,900)},
 crit:{gap:.07,f:s=>{s.tone(1250,.08,'square',.05,620);s.hiss(.05,.07,5000,'highpass')}},
 kill:{gap:.04,f:s=>{s.hiss(.16,.15,1300,'lowpass');s.tone(170,.14,'sawtooth',.05,50)}},
 elite:{gap:.1,f:s=>{s.hiss(.3,.25,900,'lowpass');s.tone(330,.3,'square',.06,80)}},
 boom:{gap:.07,f:s=>{s.hiss(.45,.3,600,'lowpass');s.tone(95,.35,'sine',.28,32)}},
 hurt:{gap:.15,f:s=>{s.tone(320,.18,'sawtooth',.11,90);s.hiss(.12,.1,900,'lowpass')}},
 jump:{gap:.05,f:s=>s.tone(300,.11,'sine',.07,640)},
 dash:{gap:.1,f:s=>s.hiss(.2,.14,1800,'bandpass')},
 ult:{gap:.3,f:s=>{s.tone(200,.5,'sawtooth',.08,900);s.hiss(.4,.12,2500,'bandpass')}},
 level:{gap:.3,f:s=>[0,4,7,12].forEach((n,i)=>s.tone(mf(72+n),.28,'triangle',.09,0,s.ctx.currentTime+i*.08))},
 chest:{gap:.2,f:s=>{s.hiss(.08,.1,3000,'highpass');[0,7,12].forEach((n,i)=>s.tone(mf(79+n),.18,'square',.04,0,s.ctx.currentTime+.05+i*.05))}},
 boss:{gap:1,f:s=>{s.tone(72,1.8,'sawtooth',.22,34);s.tone(108,1.8,'square',.08,52);s.hiss(1.4,.18,320,'lowpass')}},
 phase:{gap:.5,f:s=>{s.tone(110,1,'sawtooth',.18,55);s.hiss(.8,.2,500,'lowpass')}},
 guard:{gap:.5,f:s=>{s.hiss(.3,.2,4000,'highpass');[0,5,10].forEach((n,i)=>s.tone(mf(84-n),.2,'square',.05,0,s.ctx.currentTime+i*.06))}},
 bossdie:{gap:1,f:s=>{s.hiss(1.5,.35,400,'lowpass');s.tone(60,1.5,'sine',.35,20);[0,4,7,12,16].forEach((n,i)=>s.tone(mf(60+n),.6,'triangle',.07,0,s.ctx.currentTime+.4+i*.1))}},
 tp:{gap:.5,f:s=>[0,7,12,19].forEach((n,i)=>s.tone(mf(60+n),.5,'sine',.08,0,s.ctx.currentTime+i*.1))},
 ui:{gap:.03,f:s=>s.tone(660,.04,'square',.035)}
};
