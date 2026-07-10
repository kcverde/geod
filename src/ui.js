import { $ } from './util.js';
import { S, newGame, dmgMul } from './state.js';
import { meta, saveMeta } from './save.js';
import { audioInit, setMute, sfx, buzz } from './audio.js';
import { GW, GH, pathCells } from './path.js';
import { cv, OX, OY, CS, meshImpulse } from './layout.js';
import { TOWERS, SHOP } from './config.js';
import { burst, addText, banner, toast } from './fx.js';
import { updateHUD, updateWaveBtn } from './hud.js';
import { startWave } from './waves.js';

/* ============ UI ============ */
/* DOM overlays + event listeners (registered at import time — the module is
   loaded from main.js after the DOM exists). Exports the flow entry points. */
$('waveBtn').addEventListener('click',()=>{
  if(!S.G||S.G.waveActive)return;
  audioInit();
  const bonus=S.G.wave===0?0:Math.ceil(S.G.countdown*(2+S.G.wave*.5));
  if(bonus>0){S.G.credits+=bonus;addText(4.5,6,'+'+bonus+' ◈ EARLY','#ffe93c');sfx('cash');}
  startWave();
});
$('speedBtn').addEventListener('click',()=>{S.speed=S.speed===1?2:1;$('speedBtn').textContent=S.speed+'×';sfx('click');});
$('pauseBtn').addEventListener('click',()=>{if(S.state!=='play')return;S.paused=true;show('pauseOv');sfx('click');});
$('resumeBtn').addEventListener('click',()=>{S.paused=false;hide('pauseOv');sfx('click');});
$('abandonBtn').addEventListener('click',()=>{S.paused=false;hide('pauseOv');gameOver();});

/* ---------- build / tower sheets ---------- */
function show(id){$(id).classList.add('show');}
function hide(id){$(id).classList.remove('show');}
function closeSheets(){hide('buildSheet');hide('towerSheet');if(S.G){S.G.sel=null;S.G.selTower=null;S.G.preview=null;}}
$('buildClose').addEventListener('click',closeSheets);
$('towerClose').addEventListener('click',closeSheets);

function openBuild(c,r){
  S.G.sel=[c,r];S.G.selTower=null;S.G.preview=null;hide('towerSheet');
  const wrap=$('buildCards');wrap.innerHTML='';
  let armed=null; // two-tap confirm: first tap previews range, second builds
  for(const[key,def]of Object.entries(TOWERS)){
    const locked=def.lock&&!meta.unlocked[key];
    const broke=S.G.credits<def.cost;
    const el=document.createElement('div');
    el.className='card'+(locked?' locked':broke?' broke':'');
    if(!locked)el.dataset.cost=def.cost; // updateHUD re-checks affordability live
    el.style.borderColor=def.color;el.style.color=def.color;
    el.style.boxShadow=`0 0 10px ${def.color}33,inset 0 0 8px ${def.color}11`;
    el.innerHTML=`<div class="ic">${def.icon}</div><div class="nm">${def.name}</div>
      <div class="ds">${locked?'⬡ unlock in lab':def.desc}</div>
      <div class="cost">${locked?'🔒':'◈ '+def.cost}</div>`;
    el.addEventListener('click',()=>{
      if(locked){sfx('deny');toast('Unlock '+def.name+' in the UPGRADE LAB');return;}
      if(armed!==key){ // first tap: arm this card + show its range on the tile
        armed=key;S.G.preview={c,r,type:key};
        for(const s of wrap.children){s.classList.remove('armed');
          if(s.dataset.cost)s.querySelector('.cost').textContent='◈ '+s.dataset.cost;}
        el.classList.add('armed');el.querySelector('.cost').textContent='TAP TO CONFIRM';
        sfx('click');return;}
      if(S.G.credits<def.cost){sfx('deny');toast('Not enough credits');return;}
      buildTower(key,c,r);});
    wrap.appendChild(el);}
  show('buildSheet');
}
function buildTower(type,c,r){
  const def=TOWERS[type];
  S.G.credits-=def.cost;
  const tw={type,c,r,tier:0,cd:0,aim:null,prio:'first',invested:def.cost};
  S.G.towers.set(c+','+r,tw);
  sfx('build');buzz(15);
  S.G.fx.push({k:'ring',x:c+.5,y:r+.5,r0:.1,r1:def.tiers[0].range,ttl:.4,max:.4,color:def.color});
  burst(c+.5,r+.5,def.color,10);
  meshImpulse(c+.5,r+.5,110);
  closeSheets();openTowerPanel(tw);S.dirtyHud=true;
}
function openTowerPanel(tw){
  S.G.selTower=tw;S.G.sel=null;hide('buildSheet');
  const def=TOWERS[tw.type],st=def.tiers[tw.tier];
  $('towerName').textContent=def.icon+' '+def.name;
  $('towerName').style.color=def.color;
  $('towerTier').textContent='TIER '+(tw.tier+1)+' / 3';
  $('towerTier').style.color='#8fb4d4';
  const f1=v=>Math.round(v*10)/10,dps=s=>Math.round(s.dmg*dmgMul()*s.rate);
  let stats=`DMG ${Math.round(st.dmg*dmgMul())} · RATE ${f1(st.rate)}/s · RANGE ${f1(st.range)} · DPS ${dps(st)}`;
  if(st.aoe)stats+=` · SPLASH ${f1(st.aoe)}`;
  if(st.chains)stats+=` · CHAINS ${st.chains}`;
  if(st.slow)stats+=` · SLOW ${Math.round(st.slow*100)}%`;
  if(tw.tier<2){const nx=def.tiers[tw.tier+1];
    stats+=`<br><span style="color:${def.color}">NEXT: DMG ${Math.round(nx.dmg*dmgMul())} · RATE ${f1(nx.rate)}/s · RANGE ${f1(nx.range)} · DPS ${dps(nx)}</span>`;}
  $('towerStats').innerHTML=stats;
  const upg=$('upgBtn');
  if(tw.tier<2){const cost=def.up[tw.tier];
    upg.textContent='UPGRADE ◈ '+cost;
    upg.disabled=S.G.credits<cost;upg.style.display='';}
  else{upg.textContent='MAX TIER';upg.disabled=true;}
  $('prioBtn').textContent='TARGET: '+tw.prio.toUpperCase();
  $('prioBtn').style.display=tw.type==='cryo'?'none':'';
  $('sellBtn').textContent='SELL ◈ '+Math.floor(tw.invested*.7);
  show('towerSheet');
}
$('upgBtn').addEventListener('click',()=>{
  const tw=S.G&&S.G.selTower;if(!tw||tw.tier>=2)return;
  const cost=TOWERS[tw.type].up[tw.tier];
  if(S.G.credits<cost){sfx('deny');return;}
  S.G.credits-=cost;tw.invested+=cost;tw.tier++;
  sfx('upgrade');buzz(20);
  burst(tw.c+.5,tw.r+.5,TOWERS[tw.type].color,16,1.4);
  meshImpulse(tw.c+.5,tw.r+.5,130);
  S.G.fx.push({k:'ring',x:tw.c+.5,y:tw.r+.5,r0:.1,r1:TOWERS[tw.type].tiers[tw.tier].range,ttl:.45,max:.45,color:'#fff'});
  openTowerPanel(tw);S.dirtyHud=true;
});
$('prioBtn').addEventListener('click',()=>{
  const tw=S.G&&S.G.selTower;if(!tw)return;
  tw.prio=tw.prio==='first'?'strong':'first';
  sfx('click');openTowerPanel(tw);
});
$('sellBtn').addEventListener('click',()=>{
  const tw=S.G&&S.G.selTower;if(!tw)return;
  const refund=Math.floor(tw.invested*.7);
  S.G.credits+=refund;S.G.towers.delete(tw.c+','+tw.r);
  sfx('sell');burst(tw.c+.5,tw.r+.5,'#8fb4d4',12);
  addText(tw.c+.5,tw.r+.5,'+'+refund,'#ffe93c');
  closeSheets();S.dirtyHud=true;
});

/* ---------- canvas input ---------- */
cv.addEventListener('pointerdown',ev=>{
  audioInit();
  if(S.state!=='play'||S.paused)return;
  const c=Math.floor((ev.clientX-OX)/CS),r=Math.floor((ev.clientY-OY)/CS);
  if(c<0||c>=GW||r<0||r>=GH){closeSheets();return;}
  const key=c+','+r;
  if(S.G.towers.has(key)){sfx('click');openTowerPanel(S.G.towers.get(key));}
  else if(!pathCells.has(key)){sfx('click');openBuild(c,r);}
  else closeSheets();
});

/* ============ FLOW ============ */
export function startRun(){
  newGame();S.state='play';S.paused=false;S.speed=1;$('speedBtn').textContent='1×';
  hide('menu');hide('overOv');closeSheets();
  $('hud').style.display='flex';$('bar').style.display='flex';
  $('wavePreview').innerHTML='';
  updateHUD();updateWaveBtn();
  banner('DEFEND THE REACTOR','#22d8ff');
}
export function gameOver(){
  if(S.state==='over'||!S.G)return;
  S.state='over';closeSheets();
  const earned=S.G.wave*2+Math.floor(S.G.score/4000);
  const newBest=S.G.wave>meta.bestWave||S.G.score>meta.bestScore;
  meta.cores+=earned;
  meta.bestWave=Math.max(meta.bestWave,S.G.wave);
  meta.bestScore=Math.max(meta.bestScore,S.G.score);
  saveMeta();
  sfx('over');buzz([60,60,120]);
  $('ovBest').style.display=newBest?'':'none';
  if(newBest)sfx('upgrade');
  $('ovWave').textContent='SURVIVED '+S.G.wave+' WAVE'+(S.G.wave===1?'':'S');
  $('ovScore').textContent=S.G.score.toLocaleString();
  $('ovKills').textContent=S.G.kills;
  $('ovCores').textContent=earned;
  $('hud').style.display='none';$('bar').style.display='none';
  show('overOv');
}
export function toMenu(){
  S.state='menu';S.G=null;
  hide('overOv');hide('pauseOv');closeSheets();
  $('hud').style.display='none';$('bar').style.display='none';
  $('mBestWave').textContent=meta.bestWave||'—';
  $('mBestScore').textContent=meta.bestScore?meta.bestScore.toLocaleString():'—';
  $('mCores').textContent=meta.cores;
  muteLabel();
  show('menu');
}
$('startBtn').addEventListener('click',()=>{audioInit();sfx('click');
  if(!meta.seenTut){meta.seenTut=true;saveMeta();hide('menu');show('tut');}
  else startRun();});
$('tutBtn').addEventListener('click',()=>{sfx('click');hide('tut');startRun();});
$('retryBtn').addEventListener('click',()=>{sfx('click');startRun();});
$('ovMenuBtn').addEventListener('click',()=>{sfx('click');toMenu();});
function muteLabel(){const t='SOUND: '+(meta.mute?'OFF':'ON');$('muteBtn').textContent=t;$('muteBtn2').textContent=t;}
$('muteBtn').addEventListener('click',()=>{audioInit();setMute(!meta.mute);muteLabel();sfx('click');});
$('muteBtn2').addEventListener('click',()=>{setMute(!meta.mute);muteLabel();sfx('click');});

/* ---------- shop ---------- */
function shopCost(item){const lvl=item.unlock?(meta.unlocked[item.id]?1:0):meta.up[item.id];
  return Math.round(item.base*Math.pow(2,lvl));}
function renderShop(){
  $('sCores').textContent=meta.cores;
  const list=$('shopList');list.innerHTML='';
  for(const item of SHOP){
    const owned=item.unlock?meta.unlocked[item.id]:false;
    const lvl=item.unlock?0:meta.up[item.id];
    const maxed=owned||(!item.unlock&&lvl>=item.max);
    const cost=shopCost(item);
    const el=document.createElement('div');el.className='shopItem';
    el.innerHTML=`<div class="grow"><div class="nm">${item.name}</div>
      <div class="ds">${item.desc}</div>
      <div class="lv">${item.unlock?(owned?'UNLOCKED':'LOCKED'):'LEVEL '+lvl+' / '+item.max}</div></div>
      <button class="nbtn ${maxed?'dim':''}" ${maxed||meta.cores<cost?'disabled':''}>
        ${maxed?(item.unlock?'OWNED':'MAX'):'⬡ '+cost}</button>`;
    if(!maxed)el.querySelector('button').addEventListener('click',()=>{
      if(meta.cores<cost){sfx('deny');return;}
      meta.cores-=cost;
      if(item.unlock)meta.unlocked[item.id]=true;else meta.up[item.id]++;
      saveMeta();sfx('upgrade');buzz(20);renderShop();});
    list.appendChild(el);}
}
$('shopBtn').addEventListener('click',()=>{sfx('click');hide('menu');renderShop();show('shop');});
$('shopBack').addEventListener('click',()=>{sfx('click');hide('shop');toMenu();});
