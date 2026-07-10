import './styles.css';
import { $ } from './util.js';
import { GW, GH, posAt, totalLen } from './path.js';
import { GAME_SPEED } from './config.js';
import { tuning } from './tuning.js';
import { S, salvMul } from './state.js';
import { resize, meshImpulse, meshUpdate } from './layout.js';
import { burst, toast } from './fx.js';
import { sfx } from './audio.js';
import { updateHUD, updateWaveBtn } from './hud.js';
import { startWave, spawnEnemy } from './waves.js';
import { nearestEnemies, hurt, leak, fireTower } from './combat.js';
import { render } from './render.js';
import { gameOver, toMenu } from './ui.js';

/* ============ UPDATE ============ */
function update(dt){
  S.G.time+=dt;
  // spawns
  if(S.G.waveActive){S.G.waveT+=dt;
    while(S.G.spawnQ.length&&S.G.spawnQ[0].t<=S.G.waveT){spawnEnemy(S.G.spawnQ.shift().type);}}
  // enemies
  for(const e of S.G.enemies){
    if(e.dead)continue;
    const sm=S.G.time<e.slowUntil?e.slowMult:1;
    e.t+=e.spd*sm*dt;
    const[tpx,tpy]=posAt(e.t);
    e.tr.push(tpx,tpy);if(e.tr.length>12)e.tr.splice(0,2);
    if(e.shieldMax&&e.shield<e.shieldMax&&S.G.time-e.lastHit>2)e.shield=Math.min(e.shieldMax,e.shield+e.shieldMax*.12*dt);
    if(e.t>=totalLen){e.dead=true;leak(e);}}
  S.G.enemies=S.G.enemies.filter(e=>!e.dead);
  if(S.G.health<=0){gameOver();return;} // leak() only drains health; flow owns the death check
  // towers
  for(const tw of S.G.towers.values())fireTower(tw,dt);
  // projectiles
  for(const p of S.G.projs){
    if(p.k==='bolt'){
      if(!p.tgt||p.tgt.dead){ // target died mid-flight: curve to a close neighbor instead of flying off
        const l=nearestEnemies(p.x,p.y,1.5);
        if(l.length){let b=l[0];for(const c of l)if(c.d<b.d)b=c;p.tgt=b.e;}}
      if(p.tgt&&!p.tgt.dead){const[tx,ty]=posAt(p.tgt.t);
        const a=Math.atan2(ty-p.y,tx-p.x);p.vx=Math.cos(a)*p.spd;p.vy=Math.sin(a)*p.spd;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.tgt&&!p.tgt.dead){const[tx,ty]=posAt(p.tgt.t);
        if(Math.hypot(tx-p.x,ty-p.y)<p.tgt.r+.18){hurt(p.tgt,p.dmg,p.color);burst(p.x,p.y,p.color,3);p.gone=true;}}
      if(p.x<-1||p.x>GW+1||p.y<-1||p.y>GH+1)p.gone=true;
    }else if(p.k==='shell'){
      p.p+=dt/p.fly;
      if(p.p>=1){p.gone=true;sfx('nova');
        S.G.fx.push({k:'ring',x:p.tx,y:p.ty,r0:.1,r1:p.aoe,ttl:.3,max:.3,color:p.color});
        S.G.fx.push({k:'flash',x:p.tx,y:p.ty,r:p.aoe*1.1,ttl:.28,max:.28,color:p.color});
        meshImpulse(p.tx,p.ty,140);
        burst(p.tx,p.ty,p.color,14,1.4);S.G.shake=Math.max(S.G.shake,3);
        for(const c of nearestEnemies(p.tx,p.ty,p.aoe))hurt(c.e,p.dmg*(1-c.d/p.aoe*.4),p.color);}
      else{const k=p.p;p.x=p.sx+(p.tx-p.sx)*k;p.y=p.sy+(p.ty-p.sy)*k-Math.sin(k*Math.PI)*1.1;}
    }}
  S.G.projs=S.G.projs.filter(p=>!p.gone);
  // fx / particles / text
  for(const f of S.G.fx){f.ttl-=dt;
    if(f.k==='shard'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.985;f.vy*=.985;f.rot+=f.vr*dt;}}
  S.G.fx=S.G.fx.filter(f=>f.ttl>0);
  meshUpdate(dt);
  for(const p of S.G.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;}
  S.G.parts=S.G.parts.filter(p=>p.life>0);
  for(const t of S.G.texts){t.y-=dt*.8;t.life-=dt*.9;}
  S.G.texts=S.G.texts.filter(t=>t.life>0);
  S.G.shake=Math.max(0,S.G.shake-dt*30);
  S.G.flash=Math.max(0,S.G.flash-dt*1.8);
  // wave end
  if(S.G.waveActive&&!S.G.spawnQ.length&&!S.G.enemies.length){
    S.G.waveActive=false;
    const bonus=Math.round((25+S.G.wave*6)*salvMul()*tuning.economy);
    S.G.credits+=bonus;S.G.score+=200+S.G.wave*50;
    sfx('cash');toast('WAVE CLEAR  +'+bonus+' ◈');
    S.G.countdown=10;S.dirtyHud=true;}
  // countdown (HUD refreshed only when the displayed second changes)
  if(!S.G.waveActive&&S.G.countdown>0){const cs=Math.ceil(S.G.countdown);S.G.countdown-=dt;
    if(Math.ceil(S.G.countdown)!==cs)S.dirtyHud=true;
    if(S.G.countdown<=0)startWave();}
}

/* ============ LOOP ============ */
let last=performance.now();
function loop(now){
  requestAnimationFrame(loop);
  let dt=Math.min(.034,(now-last)/1000);last=now;
  if(S.state==='play'&&!S.paused)update(dt*S.speed*GAME_SPEED*tuning.gameSpeed);
  if(S.dirtyHud){S.dirtyHud=false;updateHUD();updateWaveBtn();}
  render();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.state==='play')S.paused||($('pauseBtn').click());});
document.addEventListener('gesturestart',e=>e.preventDefault());
resize();
toMenu();
requestAnimationFrame(loop);

/* ---------- dev-only admin overlay (stripped from production builds) ---------- */
if(import.meta.env.DEV){
  import('./admin.js').then(m=>m.initAdmin({
    getG:()=>S.G,
    jumpToWave:n=>{if(!S.G)return;S.G.enemies.length=0;S.G.spawnQ.length=0;S.G.waveActive=false;
      S.G.wave=Math.max(0,n-1);startWave();},
    addCredits:n=>{if(!S.G)return;S.G.credits+=n;updateHUD();},
    killAll:()=>{if(S.G)S.G.enemies.length=0;},
    updateHUD,
  }));
}
