import { meta, saveMeta } from './save.js';

/* ============ AUDIO ============ */
let AC=null,masterGain=null,lastSfx={};
export function audioInit(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();
  masterGain=AC.createGain();masterGain.gain.value=meta.mute?0:0.5;masterGain.connect(AC.destination);}catch(e){}}
export function setMute(m){meta.mute=m;saveMeta();if(masterGain)masterGain.gain.value=m?0:0.5;}
function tone(f0,f1,dur,type,vol,when){if(!AC)return;const t=AC.currentTime+(when||0);
  const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1,1),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+dur+.02);}
function noise(dur,vol,fc){if(!AC)return;const n=AC.sampleRate*dur|0,b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const s=AC.createBufferSource();s.buffer=b;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=fc;
  const g=AC.createGain();g.gain.value=vol;s.connect(f);f.connect(g);g.connect(masterGain);s.start();}
export function sfx(name){if(!AC||meta.mute)return;const now=performance.now();
  if(lastSfx[name]&&now-lastSfx[name]<50)return;lastSfx[name]=now;
  switch(name){
    case 'shoot':tone(880,220,.07,'square',.05);break;
    case 'nova':tone(160,40,.2,'sawtooth',.1);noise(.18,.12,900);break;
    case 'arc':tone(1400,300,.1,'sawtooth',.06);break;
    case 'lance':tone(2200,180,.16,'sawtooth',.08);break;
    case 'cryo':tone(520,900,.14,'sine',.07);break;
    case 'kill':tone(660,1320,.09,'square',.06);break;
    case 'boom':noise(.3,.2,600);tone(120,30,.3,'sine',.18);break;
    case 'build':tone(330,660,.12,'square',.09);tone(495,990,.12,'square',.06,.05);break;
    case 'upgrade':tone(440,880,.1,'square',.08);tone(660,1320,.1,'square',.08,.07);tone(880,1760,.12,'square',.08,.14);break;
    case 'sell':tone(700,200,.18,'square',.08);break;
    case 'leak':tone(180,60,.4,'sawtooth',.2);noise(.25,.15,400);break;
    case 'wave':tone(220,880,.35,'sawtooth',.08);break;
    case 'boss':tone(110,110,.5,'sawtooth',.16);tone(116,116,.5,'sawtooth',.16);break;
    case 'click':tone(700,500,.05,'square',.05);break;
    case 'deny':tone(200,150,.12,'square',.08);break;
    case 'over':[523,392,311,233,165].forEach((f,i)=>tone(f,f*.5,.3,'sawtooth',.1,i*.16));break;
    case 'cash':tone(987,1976,.08,'square',.05);break;
  }}
export function buzz(ms){if(navigator.vibrate)try{navigator.vibrate(ms);}catch(e){}}
