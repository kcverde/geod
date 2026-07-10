import { clamp } from './util.js';
import { S, dmgMul, salvMul } from './state.js';
import { posAt, totalLen } from './path.js';
import { sfx, buzz } from './audio.js';
import { burst, shatter, addText, banner } from './fx.js';
import { meshImpulse } from './layout.js';
import { TOWERS, ENEMIES } from './config.js';
import { tuning } from './tuning.js';

/* ============ COMBAT ============ */
/* leak() only drains health — the game-over check lives in update() (main.js),
   keeping combat free of any flow/UI dependency. */
export function nearestEnemies(x,y,range){
  const out=[];for(const e of S.G.enemies){if(e.dead)continue;
    const ex=e.px,ey=e.py,d=Math.hypot(ex-x,ey-y); // cached in update()'s enemy pass
    if(d<=range)out.push({e,d,ex,ey});}
  return out;}
export function pickTarget(list,prio){if(!list.length)return null;
  let best=list[0];
  for(const c of list){
    if(prio==='strong'){if(c.e.hp+c.e.shield>best.e.hp+best.e.shield)best=c;}
    else if(prio==='last'){if(c.e.t<best.e.t)best=c;}
    else{if(c.e.t>best.e.t)best=c;}}
  return best;}
export function hurt(e,dmg,color){
  e.lastHit=S.G.time;e.hitT=S.G.time; // hitT drives the white hit-flash in drawEnemy
  if(e.shield>0){e.shield-=dmg;if(e.shield<0){e.hp+=e.shield;e.shield=0;}}
  else e.hp-=dmg;
  if(e.hp<=0&&!e.dead){e.dead=true;kill(e,color);}
}
export function kill(e,color){
  const d=ENEMIES[e.type];
  const credits=Math.round(d.bounty*salvMul()*tuning.economy);
  S.G.credits+=credits;S.G.kills++;
  const mb=S.G.mult;
  S.G.streak++;S.G.mult=Math.min(8,1+S.G.streak*.1);
  S.G.score+=Math.round(d.score*S.G.mult);
  const[x,y]=posAt(e.t);
  for(const m of[2,4,6,8])if(mb<m&&S.G.mult>=m){ // milestone crossed this kill
    banner('×'+m+' MULTIPLIER','#ffe93c');sfx('cash');meshImpulse(x,y,160);break;}
  burst(x,y,e.color,e.type==='boss'?60:e.type==='tank'?22:10,e.type==='boss'?3:1);
  shatter(x,y,e.color,e.type==='boss'?18:e.type==='tank'?10:6,e.r*2.4);
  meshImpulse(x,y,e.type==='boss'?340:e.type==='tank'?170:75);
  S.G.fx.push({k:'flash',x,y,r:e.type==='boss'?2.6:e.r*2.6,ttl:.3,max:.3,color:e.color});
  addText(x,y,'+'+credits,'#ffe93c');
  if(e.type==='boss'){S.G.shake=14;S.G.flash=.5;S.slowmo=.9;sfx('boom');buzz(60);banner('BOSS DOWN  +'+credits,'#54ff7c');}
  else if(e.type==='tank'){S.G.shake=Math.max(S.G.shake,5);sfx('boom');}
  else sfx('kill');
  S.dirtyHud=true;
}
export function leak(e){
  const d=ENEMIES[e.type];
  if(!tuning.coreInvincible)S.G.health-=d.dmg||1;
  S.G.streak=0;S.G.mult=1;S.G.shake=10;S.G.flash=.6;
  sfx('leak');buzz(100);
  const[x,y]=posAt(totalLen-.1);burst(x,y,'#ff2255',24,1.6);
  meshImpulse(x,y,260);
  S.G.fx.push({k:'flash',x,y,r:1.6,ttl:.4,max:.4,color:'#ff2255'});
  S.dirtyHud=true;
}
export function fireTower(tw,dt){
  const def=TOWERS[tw.type],st=def.tiers[tw.tier];
  const range=st.range*tuning.towerRange,rate=st.rate*tuning.towerRate;
  tw.cd-=dt;if(tw.cd>0)return;
  const x=tw.c+.5,y=tw.r+.5;
  if(tw.type==='cryo'){
    const list=nearestEnemies(x,y,range);if(!list.length)return;
    tw.cd=1/rate;sfx('cryo');
    S.G.fx.push({k:'ring',x,y,r0:.2,r1:range,ttl:.45,max:.45,color:def.color});
    for(const c of list){c.e.slowUntil=S.G.time+st.slowT;c.e.slowMult=1-st.slow;hurt(c.e,st.dmg*dmgMul(),def.color);}
    return;}
  const list=nearestEnemies(x,y,range);
  const tgt=pickTarget(list,tw.prio);if(!tgt)return;
  tw.cd=1/rate;tw.aim=Math.atan2(tgt.ey-y,tgt.ex-x);
  if(tw.type==='pulse'){
    sfx('shoot');
    S.G.projs.push({k:'bolt',x,y,tgt:tgt.e,spd:10,dmg:st.dmg*dmgMul(),color:def.color,
      vx:Math.cos(tw.aim)*10,vy:Math.sin(tw.aim)*10});
  }else if(tw.type==='nova'){
    sfx('shoot');
    const fly=tgt.d/6;
    const lead=clamp(tgt.e.t+tgt.e.spd*tgt.e.slowMult*fly,0,totalLen);
    const[px,py]=posAt(lead);
    S.G.projs.push({k:'shell',x,y,sx:x,sy:y,tx:px,ty:py,p:0,fly:Math.max(.18,fly),
      dmg:st.dmg*dmgMul(),aoe:st.aoe,color:def.color});
  }else if(tw.type==='lance'){
    sfx('lance');
    const dx=Math.cos(tw.aim),dy=Math.sin(tw.aim);
    const ex=x+dx*range,ey=y+dy*range;
    S.G.fx.push({k:'beam',x1:x,y1:y,x2:ex,y2:ey,ttl:.18,max:.18,color:def.color});
    for(const c of nearestEnemies(x,y,range+1)){
      const px=c.ex-x,py=c.ey-y;const proj=px*dx+py*dy;
      if(proj<0||proj>range)continue;
      const perp=Math.abs(px*dy-py*dx);
      if(perp<.38+c.e.r)hurt(c.e,st.dmg*dmgMul(),def.color);}
    S.G.shake=Math.max(S.G.shake,2);
  }else if(tw.type==='arc'){
    sfx('arc');
    const hitOrder=[];const visited=new Set();
    let cur=tgt;visited.add(cur.e);hitOrder.push([x,y],[cur.ex,cur.ey]);
    hurt(cur.e,st.dmg*dmgMul(),def.color);
    for(let i=1;i<st.chains;i++){
      let next=null,nd=1.9;
      for(const c of nearestEnemies(cur.ex,cur.ey,1.9)){
        if(visited.has(c.e))continue;
        if(c.d<nd){nd=c.d;next=c;}}
      if(!next)break;
      visited.add(next.e);hitOrder.push([next.ex,next.ey]);
      hurt(next.e,st.dmg*dmgMul()*Math.pow(.85,i),def.color);
      cur=next;}
    S.G.fx.push({k:'arc',pts:hitOrder,ttl:.16,max:.16,color:def.color});
  }
}
