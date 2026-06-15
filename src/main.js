import './styles.css';
import { $, clamp, rand, TAU } from './util.js';
import { meta, saveMeta } from './save.js';
import { audioInit, setMute, sfx, buzz } from './audio.js';
import { GW, GH, WP, pathCells, BASE, segLen, totalLen, posAt, dirAt } from './path.js';
import { TOWERS, ENEMIES, SHOP } from './config.js';

(()=>{
'use strict';

/* ============ LAYOUT ============ */
const cv=$('cv'),ctx=cv.getContext('2d');
let W=0,H=0,CS=40,OX=0,OY=0,DPR=1;
function resize(){DPR=Math.min(window.devicePixelRatio||1,3);
  W=window.innerWidth;H=window.innerHeight;
  cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';
  const topPad=86,botPad=118;
  CS=Math.min(W/GW,(H-topPad-botPad)/GH);
  OX=(W-CS*GW)/2;OY=topPad+((H-topPad-botPad)-CS*GH)/2;
  starsInit();buildBg();meshInit();}
const cx=x=>OX+x*CS, cy=y=>OY+y*CS;
window.addEventListener('resize',resize);

let stars=[];
function starsInit(){stars=[];for(let i=0;i<110;i++){const l=i%3;
  stars.push({x:Math.random()*W,y:Math.random()*H,l,
    r:l===2?rand(.9,1.9):l===1?rand(.5,1.2):rand(.3,.8),
    spd:(l+1)*2.4,p:Math.random()*TAU,
    col:Math.random()<.14?'#7ef0ff':Math.random()<.1?'#ffb0e0':'#9fc6e8'});}}

/* nebula background + vignette, pre-rendered once per resize */
let bgCanvas=null,vigCanvas=null;
function buildBg(){
  bgCanvas=document.createElement('canvas');bgCanvas.width=W;bgCanvas.height=H;
  const c2=bgCanvas.getContext('2d');
  c2.fillStyle='#04060c';c2.fillRect(0,0,W,H);
  const blob=(x,y,r,col)=>{const g=c2.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');
    c2.fillStyle=g;c2.fillRect(0,0,W,H);};
  blob(W*.12,H*.22,W*.75,'rgba(18,60,125,.17)');
  blob(W*.92,H*.48,W*.65,'rgba(120,18,90,.13)');
  blob(W*.42,H*.88,W*.75,'rgba(58,22,125,.15)');
  blob(W*.78,H*.07,W*.5,'rgba(0,95,115,.13)');
  vigCanvas=document.createElement('canvas');vigCanvas.width=W;vigCanvas.height=H;
  const v=vigCanvas.getContext('2d');
  const vg=v.createRadialGradient(W/2,H/2,Math.min(W,H)*.42,W/2,H/2,Math.hypot(W,H)*.62);
  vg.addColorStop(0,'rgba(2,3,8,0)');vg.addColorStop(1,'rgba(2,3,8,.62)');
  v.fillStyle=vg;v.fillRect(0,0,W,H);
}

/* cached radial glow sprites per color */
const glowCache={};
function glow(color){let g=glowCache[color];if(g)return g;
  g=document.createElement('canvas');g.width=g.height=64;
  const c2=g.getContext('2d');
  const gr=c2.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.28,color);gr.addColorStop(1,'rgba(0,0,0,0)');
  c2.fillStyle=gr;c2.fillRect(0,0,64,64);
  glowCache[color]=g;return g;}
function blitGlow(color,x,y,r,alpha){ctx.globalAlpha=alpha;
  ctx.drawImage(glow(color),x-r,y-r,r*2,r*2);ctx.globalAlpha=1;}

/* warping grid mesh — explosions ripple through it */
let mesh=[];
function meshInit(){mesh=[];
  for(let r=0;r<=GH;r++)for(let c=0;c<=GW;c++){
    const x=cx(c),y=cy(r);
    mesh.push({x,y,rx:x,ry:y,vx:0,vy:0});}}
function meshImpulse(gx,gy,pow){if(!mesh.length)return;
  const ex=cx(gx),ey=cy(gy),R=CS*3.4;
  for(const p of mesh){const dx=p.rx-ex,dy=p.ry-ey,d=Math.hypot(dx,dy);
    if(d<R&&d>1){const f=pow*(1-d/R);p.vx+=dx/d*f;p.vy+=dy/d*f;}}}
function meshUpdate(dt){const damp=Math.exp(-7*dt);
  for(const p of mesh){
    p.vx+=(p.rx-p.x)*70*dt;p.vy+=(p.ry-p.y)*70*dt;
    p.vx*=damp;p.vy*=damp;
    p.x+=p.vx*dt;p.y+=p.vy*dt;}}

/* ============ GAME STATE ============ */
let state='menu'; // menu | play | over
let paused=false,speed=1;
let G=null;
function newGame(){
  G={health:10+meta.up.hp*2,credits:200+meta.up.credits*30,score:0,mult:1,streak:0,
    wave:0,enemies:[],towers:new Map(),projs:[],fx:[],parts:[],texts:[],
    spawnQ:[],waveT:0,waveActive:false,countdown:5,kills:0,
    sel:null,selTower:null,time:0,shake:0,flash:0};
}
const dmgMul=()=>1+meta.up.dmg*.04;
const salvMul=()=>1+meta.up.salvage*.05;

/* ============ WAVES ============ */
function waveSpawns(n){
  const s=[];let t=0;
  const add=(type,count,gap)=>{for(let i=0;i<count;i++){s.push({t,type});t+=gap;}t+=1;};
  if(n%8===0){
    sfx('boss');banner('⚠ BOSS INBOUND ⚠','#ff2255');buzz(80);
    add('boss',Math.max(1,Math.floor(n/24)+1),3.5);
    add('drone',6+n,0.5);
    if(n>=16)add('shield',Math.floor(n/8),1);
  }else{
    add('drone',Math.min(26,7+n),0.55);
    if(n>=3)add('dart',3+Math.floor(n*.8),0.32);
    if(n>=5)add('swarm',Math.min(30,6+n),0.17);
    if(n>=7)add('tank',1+Math.floor(n/3),1.2);
    if(n>=10)add('shield',1+Math.floor(n/4),0.95);
    if(n>=14)add('dart',Math.floor(n*.6),0.25);
  }
  return s;
}
const hpMul=n=>1+n*.16+n*n*.013;
function startWave(){
  G.wave++;G.waveActive=true;G.waveT=0;G.countdown=0;
  G.spawnQ=waveSpawns(G.wave);
  if(G.wave%8!==0){sfx('wave');banner('WAVE '+G.wave,'#22d8ff');}
  updateHUD();updateWaveBtn();
}
function spawnEnemy(type){
  const d=ENEMIES[type],m=hpMul(G.wave);
  const hp=d.hp*m*(type==='boss'?(1+G.wave*.06):1);
  G.enemies.push({type,t:0,hp,maxHp:hp,spd:d.spd*(1+Math.min(.5,G.wave*.008)),
    r:d.r,color:d.color,slowUntil:0,slowMult:1,tr:[],
    shield:d.shield?d.shield*m:0,shieldMax:d.shield?d.shield*m:0,lastHit:-9,
    wob:Math.random()*TAU,dead:false});
}

/* ============ COMBAT ============ */
function nearestEnemies(x,y,range){
  const out=[];for(const e of G.enemies){if(e.dead)continue;
    const[ex,ey]=posAt(e.t);const d=Math.hypot(ex-x,ey-y);
    if(d<=range)out.push({e,d,ex,ey});}
  return out;}
function pickTarget(list,prio){if(!list.length)return null;
  let best=list[0];
  for(const c of list){
    if(prio==='strong'){if(c.e.hp+c.e.shield>best.e.hp+best.e.shield)best=c;}
    else{if(c.e.t>best.e.t)best=c;}}
  return best;}
function hurt(e,dmg,color){
  e.lastHit=G.time;
  if(e.shield>0){e.shield-=dmg;if(e.shield<0){e.hp+=e.shield;e.shield=0;}}
  else e.hp-=dmg;
  if(e.hp<=0&&!e.dead){e.dead=true;kill(e,color);}
}
function kill(e,color){
  const d=ENEMIES[e.type];
  const credits=Math.round(d.bounty*salvMul());
  G.credits+=credits;G.kills++;
  G.streak++;G.mult=Math.min(8,1+G.streak*.1);
  G.score+=Math.round(d.score*G.mult);
  const[x,y]=posAt(e.t);
  burst(x,y,e.color,e.type==='boss'?60:e.type==='tank'?22:10,e.type==='boss'?3:1);
  shatter(x,y,e.color,e.type==='boss'?18:e.type==='tank'?10:6,e.r*2.4);
  meshImpulse(x,y,e.type==='boss'?340:e.type==='tank'?170:75);
  G.fx.push({k:'flash',x,y,r:e.type==='boss'?2.6:e.r*2.6,ttl:.3,max:.3,color:e.color});
  addText(x,y,'+'+credits,'#ffe93c');
  if(e.type==='boss'){G.shake=14;G.flash=.5;sfx('boom');buzz(60);banner('BOSS DOWN  +'+credits,'#54ff7c');}
  else if(e.type==='tank'){G.shake=Math.max(G.shake,5);sfx('boom');}
  else sfx('kill');
  updateHUD();
}
function leak(e){
  const d=ENEMIES[e.type];
  G.health-=d.dmg||1;G.streak=0;G.mult=1;G.shake=10;G.flash=.6;
  sfx('leak');buzz(100);
  const[x,y]=posAt(totalLen-.1);burst(x,y,'#ff2255',24,1.6);
  meshImpulse(x,y,260);
  G.fx.push({k:'flash',x,y,r:1.6,ttl:.4,max:.4,color:'#ff2255'});
  updateHUD();
  if(G.health<=0)gameOver();
}
function fireTower(tw,dt){
  const def=TOWERS[tw.type],st=def.tiers[tw.tier];
  tw.cd-=dt;if(tw.cd>0)return;
  const x=tw.c+.5,y=tw.r+.5;
  if(tw.type==='cryo'){
    const list=nearestEnemies(x,y,st.range);if(!list.length)return;
    tw.cd=1/st.rate;sfx('cryo');
    G.fx.push({k:'ring',x,y,r0:.2,r1:st.range,ttl:.45,max:.45,color:def.color});
    for(const c of list){c.e.slowUntil=G.time+st.slowT;c.e.slowMult=1-st.slow;hurt(c.e,st.dmg*dmgMul(),def.color);}
    return;}
  const list=nearestEnemies(x,y,st.range);
  const tgt=pickTarget(list,tw.prio);if(!tgt)return;
  tw.cd=1/st.rate;tw.aim=Math.atan2(tgt.ey-y,tgt.ex-x);
  if(tw.type==='pulse'){
    sfx('shoot');
    G.projs.push({k:'bolt',x,y,tgt:tgt.e,spd:10,dmg:st.dmg*dmgMul(),color:def.color,
      vx:Math.cos(tw.aim)*10,vy:Math.sin(tw.aim)*10});
  }else if(tw.type==='nova'){
    sfx('shoot');
    const fly=tgt.d/6;
    const lead=clamp(tgt.e.t+tgt.e.spd*tgt.e.slowMult*fly,0,totalLen);
    const[px,py]=posAt(lead);
    G.projs.push({k:'shell',x,y,sx:x,sy:y,tx:px,ty:py,p:0,fly:Math.max(.18,fly),
      dmg:st.dmg*dmgMul(),aoe:st.aoe,color:def.color});
  }else if(tw.type==='lance'){
    sfx('lance');
    const dx=Math.cos(tw.aim),dy=Math.sin(tw.aim);
    const ex=x+dx*st.range,ey=y+dy*st.range;
    G.fx.push({k:'beam',x1:x,y1:y,x2:ex,y2:ey,ttl:.18,max:.18,color:def.color});
    for(const c of nearestEnemies(x,y,st.range+1)){
      const px=c.ex-x,py=c.ey-y;const proj=px*dx+py*dy;
      if(proj<0||proj>st.range)continue;
      const perp=Math.abs(px*dy-py*dx);
      if(perp<.38+c.e.r)hurt(c.e,st.dmg*dmgMul(),def.color);}
    G.shake=Math.max(G.shake,2);
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
    G.fx.push({k:'arc',pts:hitOrder,ttl:.16,max:.16,color:def.color});
  }
}

/* ============ FX HELPERS ============ */
function burst(x,y,color,n,pow){pow=pow||1;
  if(G.parts.length>450)return;
  for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rand(.5,3.2)*pow;
    G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.3,.8),max:.8,color,sz:rand(1.5,3.5)});}}
function shatter(x,y,color,n,sz){
  for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rand(1,4.5);
    G.fx.push({k:'shard',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,
      rot:Math.random()*TAU,vr:rand(-9,9),len:sz*rand(.35,1),
      ttl:rand(.35,.75),max:.75,color});}}
function addText(x,y,txt,color){G.texts.push({x,y,txt,color,life:1});}
let bannerT=null;
function banner(txt,color){const b=$('banner');b.textContent=txt;b.style.color=color;
  b.style.textShadow=`0 0 12px ${color},0 0 40px ${color}`;b.style.opacity=1;
  clearTimeout(bannerT);bannerT=setTimeout(()=>b.style.opacity=0,1400);}
let toastT=null;
function toast(txt){const t=$('toast');t.textContent=txt;t.style.opacity=1;
  clearTimeout(toastT);toastT=setTimeout(()=>t.style.opacity=0,1600);}

/* ============ UPDATE ============ */
function update(dt){
  G.time+=dt;
  // spawns
  if(G.waveActive){G.waveT+=dt;
    while(G.spawnQ.length&&G.spawnQ[0].t<=G.waveT){spawnEnemy(G.spawnQ.shift().type);}}
  // enemies
  for(const e of G.enemies){
    if(e.dead)continue;
    const sm=G.time<e.slowUntil?e.slowMult:1;
    e.t+=e.spd*sm*dt;
    const[tpx,tpy]=posAt(e.t);
    e.tr.push(tpx,tpy);if(e.tr.length>12)e.tr.splice(0,2);
    if(e.shieldMax&&e.shield<e.shieldMax&&G.time-e.lastHit>2)e.shield=Math.min(e.shieldMax,e.shield+e.shieldMax*.12*dt);
    if(e.t>=totalLen){e.dead=true;leak(e);}}
  G.enemies=G.enemies.filter(e=>!e.dead);
  // towers
  for(const tw of G.towers.values())fireTower(tw,dt);
  // projectiles
  for(const p of G.projs){
    if(p.k==='bolt'){
      if(p.tgt&&!p.tgt.dead){const[tx,ty]=posAt(p.tgt.t);
        const a=Math.atan2(ty-p.y,tx-p.x);p.vx=Math.cos(a)*p.spd;p.vy=Math.sin(a)*p.spd;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.tgt&&!p.tgt.dead){const[tx,ty]=posAt(p.tgt.t);
        if(Math.hypot(tx-p.x,ty-p.y)<p.tgt.r+.18){hurt(p.tgt,p.dmg,p.color);burst(p.x,p.y,p.color,3);p.gone=true;}}
      if(p.x<-1||p.x>GW+1||p.y<-1||p.y>GH+1)p.gone=true;
    }else if(p.k==='shell'){
      p.p+=dt/p.fly;
      if(p.p>=1){p.gone=true;sfx('nova');
        G.fx.push({k:'ring',x:p.tx,y:p.ty,r0:.1,r1:p.aoe,ttl:.3,max:.3,color:p.color});
        G.fx.push({k:'flash',x:p.tx,y:p.ty,r:p.aoe*1.1,ttl:.28,max:.28,color:p.color});
        meshImpulse(p.tx,p.ty,140);
        burst(p.tx,p.ty,p.color,14,1.4);G.shake=Math.max(G.shake,3);
        for(const c of nearestEnemies(p.tx,p.ty,p.aoe))hurt(c.e,p.dmg*(1-c.d/p.aoe*.4),p.color);}
      else{const k=p.p;p.x=p.sx+(p.tx-p.sx)*k;p.y=p.sy+(p.ty-p.sy)*k-Math.sin(k*Math.PI)*1.1;}
    }}
  G.projs=G.projs.filter(p=>!p.gone);
  // fx / particles / text
  for(const f of G.fx){f.ttl-=dt;
    if(f.k==='shard'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.985;f.vy*=.985;f.rot+=f.vr*dt;}}
  G.fx=G.fx.filter(f=>f.ttl>0);
  meshUpdate(dt);
  for(const p of G.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;}
  G.parts=G.parts.filter(p=>p.life>0);
  for(const t of G.texts){t.y-=dt*.8;t.life-=dt*.9;}
  G.texts=G.texts.filter(t=>t.life>0);
  G.shake=Math.max(0,G.shake-dt*30);
  G.flash=Math.max(0,G.flash-dt*1.8);
  // wave end
  if(G.waveActive&&!G.spawnQ.length&&!G.enemies.length){
    G.waveActive=false;
    const bonus=Math.round((25+G.wave*6)*salvMul());
    G.credits+=bonus;G.score+=200+G.wave*50;
    sfx('cash');toast('WAVE CLEAR  +'+bonus+' ◈');
    G.countdown=10;updateHUD();updateWaveBtn();}
  // countdown
  if(!G.waveActive&&G.countdown>0){G.countdown-=dt;
    updateWaveBtn();
    if(G.countdown<=0)startWave();}
}

/* ============ RENDER ============ */
function glowStroke(path,color,w,blur){
  ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.globalAlpha=.22;ctx.lineWidth=w*3.2;path();ctx.stroke();
  ctx.globalAlpha=1;ctx.lineWidth=w;path();ctx.stroke();}
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(bgCanvas)ctx.drawImage(bgCanvas,0,0,W,H);
  else{ctx.fillStyle='#04060c';ctx.fillRect(0,0,W,H);}
  const t=G?G.time:performance.now()/1000;
  // parallax starfield (3 drifting layers)
  for(const s of stars){
    ctx.fillStyle=s.col;
    ctx.globalAlpha=(.16+.2*Math.sin(t*1.7+s.p))*(s.l+1)*.5;
    ctx.fillRect((s.x+t*s.spd)%W,s.y,s.r,s.r);}
  ctx.globalAlpha=1;
  if(!G){if(vigCanvas)ctx.drawImage(vigCanvas,0,0,W,H);return;}
  // shake
  ctx.save();
  if(G.shake>0)ctx.translate(rand(-G.shake,G.shake)*.6,rand(-G.shake,G.shake)*.6);
  // warping energy grid
  const P=(c,r)=>mesh[r*(GW+1)+c];
  ctx.strokeStyle='rgba(60,115,170,.17)';ctx.lineWidth=1;
  ctx.beginPath();
  for(let r=0;r<=GH;r++){ctx.moveTo(P(0,r).x,P(0,r).y);
    for(let c=1;c<=GW;c++)ctx.lineTo(P(c,r).x,P(c,r).y);}
  for(let c=0;c<=GW;c++){ctx.moveTo(P(c,0).x,P(c,0).y);
    for(let r=1;r<=GH;r++)ctx.lineTo(P(c,r).x,P(c,r).y);}
  ctx.stroke();
  // displaced segments glow cyan
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.strokeStyle='rgba(70,190,255,.3)';ctx.lineWidth=1.2;
  const disp=p=>Math.abs(p.x-p.rx)+Math.abs(p.y-p.ry);
  ctx.beginPath();
  for(let r=0;r<=GH;r++)for(let c=0;c<GW;c++){const a=P(c,r),b=P(c+1,r);
    if(disp(a)+disp(b)>2.5){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}}
  for(let c=0;c<=GW;c++)for(let r=0;r<GH;r++){const a=P(c,r),b=P(c,r+1);
    if(disp(a)+disp(b)>2.5){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}}
  ctx.stroke();ctx.restore();
  // buildable cell dots
  ctx.fillStyle='rgba(80,140,200,.13)';
  for(let c=0;c<GW;c++)for(let r=0;r<GH;r++){
    if(pathCells.has(c+','+r))continue;
    ctx.fillRect(cx(c+.5)-1,cy(r+.5)-1,2,2);}
  // path: layered energy river
  const lane=()=>{ctx.beginPath();ctx.moveTo(cx(WP[0][0]),cy(WP[0][1]));
    for(let i=1;i<WP.length;i++)ctx.lineTo(cx(WP[i][0]),cy(WP[i][1]));};
  ctx.lineCap='round';ctx.lineJoin='round';
  lane();ctx.strokeStyle='rgba(40,120,220,.16)';ctx.lineWidth=CS*1.14;ctx.stroke();
  lane();ctx.strokeStyle='rgba(46,130,235,.55)';ctx.lineWidth=CS*.92;ctx.stroke();
  lane();ctx.strokeStyle='rgba(9,20,42,.96)';ctx.lineWidth=CS*.8;ctx.stroke();
  // energy pulses flowing toward the reactor
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.setLineDash([CS*.55,CS*1.4]);ctx.lineDashOffset=-((t*CS*1.5)%(CS*1.95));
  lane();ctx.strokeStyle='rgba(50,160,255,.16)';ctx.lineWidth=CS*.5;ctx.stroke();
  ctx.setLineDash([]);ctx.restore();
  // chevrons flowing along path
  ctx.strokeStyle='rgba(130,215,255,.6)';ctx.lineWidth=2;ctx.lineCap='round';
  const spacing=1.3,off=(t*.9)%spacing;
  ctx.beginPath();
  for(let d=off;d<totalLen-.3;d+=spacing){
    const[px,py]=posAt(d),[dx,dy]=dirAt(d);
    const s=CS*.14;
    ctx.moveTo(cx(px)-(dx+dy)*s,cy(py)-(dy-dx)*s);
    ctx.lineTo(cx(px),cy(py));
    ctx.lineTo(cx(px)-(dx-dy)*s,cy(py)-(dy+dx)*s);}
  ctx.stroke();
  // spawn portal
  const[spx,spy]=posAt(.2);
  const ppx=cx(spx),ppy=cy(spy);
  ctx.save();ctx.globalCompositeOperation='lighter';
  blitGlow('#ff2e88',ppx,ppy,CS*1.05,.4+.18*Math.sin(t*4));
  ctx.strokeStyle='#ff5aa8';ctx.lineWidth=2;
  ctx.setLineDash([CS*.2,CS*.15]);ctx.lineDashOffset=t*CS*.8;
  ctx.beginPath();ctx.arc(ppx,ppy,CS*.46,0,TAU);ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha=.7;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.arc(ppx,ppy,CS*(.28+.07*Math.sin(t*3)),0,TAU);ctx.stroke();
  ctx.restore();ctx.globalAlpha=1;
  // base reactor
  const bx=cx(BASE[0]+.5),by=cy(BASE[1]+.5);
  const pul=1+.08*Math.sin(t*3);
  ctx.save();ctx.globalCompositeOperation='lighter';
  blitGlow('#22d8ff',bx,by,CS*1.2*pul,.5);
  ctx.strokeStyle='rgba(34,216,255,.55)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(bx,by,CS*.54,t*.9,t*.9+TAU*.72);ctx.stroke();
  ctx.beginPath();ctx.arc(bx,by,CS*.62,-t*.6,-t*.6+TAU*.55);ctx.stroke();
  ctx.restore();
  for(let i=0;i<2;i++){
    ctx.strokeStyle=i?'#ffffff':'#22d8ff';ctx.lineWidth=i?2:5;ctx.globalAlpha=i?1:.3;
    ctx.beginPath();
    const R=CS*.36*pul*(1+i*.18);
    ctx.moveTo(bx,by-R);ctx.lineTo(bx+R,by);ctx.lineTo(bx,by+R);ctx.lineTo(bx-R,by);ctx.closePath();ctx.stroke();}
  ctx.globalAlpha=1;
  // selected cell + range
  if(G.sel){const[c,r]=G.sel;
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.globalAlpha=.9;
    ctx.strokeRect(cx(c)+2,cy(r)+2,CS-4,CS-4);ctx.globalAlpha=1;}
  if(G.selTower){const tw=G.selTower,st=TOWERS[tw.type].tiers[tw.tier];
    ctx.strokeStyle=TOWERS[tw.type].color;ctx.globalAlpha=.5;ctx.lineWidth=1.5;
    ctx.setLineDash([6,6]);
    ctx.beginPath();ctx.arc(cx(tw.c+.5),cy(tw.r+.5),st.range*CS,0,TAU);ctx.stroke();
    ctx.setLineDash([]);ctx.globalAlpha=1;}
  // towers
  for(const tw of G.towers.values())drawTower(tw,t);
  // enemies
  for(const e of G.enemies)drawEnemy(e,t);
  // projectiles
  ctx.globalCompositeOperation='lighter';
  for(const p of G.projs){
    const hx=cx(p.x),hy=cy(p.y);
    if(p.k==='bolt'){
      blitGlow(p.color,hx,hy,CS*.3,.8);
      ctx.strokeStyle=p.color;ctx.lineWidth=4;ctx.globalAlpha=.4;
      ctx.beginPath();ctx.moveTo(cx(p.x-p.vx*.08),cy(p.y-p.vy*.08));ctx.lineTo(hx,hy);ctx.stroke();
      ctx.strokeStyle='#fff';ctx.lineWidth=1.8;ctx.globalAlpha=.95;
      ctx.beginPath();ctx.moveTo(cx(p.x-p.vx*.04),cy(p.y-p.vy*.04));ctx.lineTo(hx,hy);ctx.stroke();
    }else{
      blitGlow(p.color,hx,hy,CS*.45,.9);
      ctx.fillStyle='#fff';ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(hx,hy,CS*.07,0,TAU);ctx.fill();}}
  ctx.globalAlpha=1;
  // fx
  for(const f of G.fx){const k=f.ttl/f.max;
    if(f.k==='ring'){const r=(f.r0+(f.r1-f.r0)*(1-k))*CS;
      ctx.strokeStyle=f.color;ctx.globalAlpha=k*.9;ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(cx(f.x),cy(f.y),r,0,TAU);ctx.stroke();}
    else if(f.k==='beam'){
      ctx.strokeStyle=f.color;ctx.globalAlpha=k;ctx.lineWidth=6*k+2;
      ctx.beginPath();ctx.moveTo(cx(f.x1),cy(f.y1));ctx.lineTo(cx(f.x2),cy(f.y2));ctx.stroke();
      ctx.strokeStyle='#fff';ctx.lineWidth=2*k;ctx.stroke();}
    else if(f.k==='arc'){
      ctx.strokeStyle=f.color;ctx.globalAlpha=k;ctx.lineWidth=2;
      ctx.beginPath();
      for(let i=0;i<f.pts.length-1;i++){
        const[ax,ay]=f.pts[i],[bx2,by2]=f.pts[i+1];
        ctx.moveTo(cx(ax),cy(ay));
        const steps=4;
        for(let s2=1;s2<=steps;s2++){const kk=s2/steps;
          const jx=s2<steps?rand(-.12,.12):0,jy=s2<steps?rand(-.12,.12):0;
          ctx.lineTo(cx(ax+(bx2-ax)*kk+jx),cy(ay+(by2-ay)*kk+jy));}}
      ctx.stroke();}
    else if(f.k==='shard'){
      ctx.save();ctx.translate(cx(f.x),cy(f.y));ctx.rotate(f.rot);
      ctx.strokeStyle=f.color;ctx.globalAlpha=k;ctx.lineWidth=1.6;
      const L=f.len*CS;
      ctx.beginPath();ctx.moveTo(-L/2,0);ctx.lineTo(L/2,0);ctx.stroke();
      ctx.restore();}
    else if(f.k==='flash'){
      blitGlow(f.color,cx(f.x),cy(f.y),f.r*CS*(1.6-k*.5),k*.9);}}
  // particles
  for(const p of G.parts){const a=p.life/p.max;
    if(p.sz>2.6)blitGlow(p.color,cx(p.x),cy(p.y),p.sz*2.6,a*.85);
    else{ctx.fillStyle=p.color;ctx.globalAlpha=a;
      ctx.fillRect(cx(p.x)-p.sz/2,cy(p.y)-p.sz/2,p.sz,p.sz);}}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  // floating text
  ctx.font='700 '+Math.max(11,CS*.28)+'px Orbitron,"Avenir Next",system-ui,sans-serif';
  ctx.textAlign='center';
  for(const tx of G.texts){ctx.fillStyle=tx.color;ctx.globalAlpha=Math.min(1,tx.life*2);
    ctx.fillText(tx.txt,cx(tx.x),cy(tx.y));}
  ctx.globalAlpha=1;
  ctx.restore();
  if(vigCanvas)ctx.drawImage(vigCanvas,0,0,W,H);
  // leak flash
  if(G.flash>0){ctx.fillStyle='rgba(255,30,80,'+(G.flash*.25)+')';ctx.fillRect(0,0,W,H);}
}
function drawTower(tw,t){
  const def=TOWERS[tw.type];
  const x=cx(tw.c+.5),y=cy(tw.r+.5),s=CS*.32;
  ctx.save();ctx.translate(x,y);
  // glow halo + hex base plate
  ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha=.26;
  ctx.drawImage(glow(def.color),-CS*.62,-CS*.62,CS*1.24,CS*1.24);
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.strokeStyle='rgba(130,180,230,.3)';ctx.lineWidth=1;
  ctx.beginPath();
  for(let i=0;i<6;i++){const a=i/6*TAU+Math.PI/6,R=CS*.43;
    i?ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R):ctx.moveTo(Math.cos(a)*R,Math.sin(a)*R);}
  ctx.closePath();ctx.stroke();
  ctx.strokeStyle=def.color;ctx.fillStyle=def.color;
  const dual=(draw)=>{ctx.globalAlpha=.25;ctx.lineWidth=6;draw();ctx.stroke();
    ctx.globalAlpha=1;ctx.lineWidth=2;draw();ctx.stroke();};
  if(tw.type==='pulse'){
    ctx.rotate(tw.aim!=null?tw.aim+Math.PI/2:0);
    dual(()=>{ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.8,s*.7);ctx.lineTo(0,s*.3);ctx.lineTo(-s*.8,s*.7);ctx.closePath();});
  }else if(tw.type==='nova'){
    ctx.rotate(t*.5);
    dual(()=>{ctx.beginPath();ctx.rect(-s*.8,-s*.8,s*1.6,s*1.6);});
    ctx.rotate(-t*1);
    dual(()=>{ctx.beginPath();ctx.rect(-s*.45,-s*.45,s*.9,s*.9);});
  }else if(tw.type==='cryo'){
    ctx.rotate(t*.8);
    dual(()=>{ctx.beginPath();
      for(let i=0;i<6;i++){const a=i/6*TAU;ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s);}});
  }else if(tw.type==='lance'){
    ctx.rotate(tw.aim!=null?tw.aim+Math.PI/2:0);
    dual(()=>{ctx.beginPath();ctx.moveTo(0,-s*1.25);ctx.lineTo(s*.45,0);ctx.lineTo(0,s*.9);ctx.lineTo(-s*.45,0);ctx.closePath();});
  }else if(tw.type==='arc'){
    dual(()=>{ctx.beginPath();ctx.moveTo(0,s*.9);ctx.lineTo(0,0);ctx.lineTo(-s*.7,-s*.9);
      ctx.moveTo(0,0);ctx.lineTo(s*.7,-s*.9);});
    ctx.globalAlpha=.5+.5*Math.sin(t*6);
    ctx.beginPath();ctx.arc(0,-s*.2,2.5,0,TAU);ctx.fill();ctx.globalAlpha=1;
  }
  ctx.restore();
  // tier shown as orbiting motes
  ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';
  ctx.fillStyle=def.color;
  for(let i=0;i<=tw.tier;i++){const a=t*1.7+i*(TAU/3);
    ctx.globalAlpha=.95;
    ctx.beginPath();ctx.arc(Math.cos(a)*CS*.43,Math.sin(a)*CS*.43,2,0,TAU);ctx.fill();}
  ctx.restore();ctx.globalAlpha=1;
}
function drawEnemy(e,t){
  const[px,py]=posAt(e.t);
  const x=cx(px),y=cy(py),s=e.r*CS*1.4;
  const[dx,dy]=dirAt(e.t);
  const slowed=G.time<e.slowUntil;
  // motion trail + glow halo
  ctx.save();ctx.globalCompositeOperation='lighter';
  if(e.tr&&e.tr.length>=4){
    ctx.strokeStyle=e.color;ctx.lineCap='round';
    for(let i=0;i+3<e.tr.length;i+=2){const a=i/e.tr.length;
      ctx.globalAlpha=a*.32;ctx.lineWidth=Math.max(.6,s*a*.9);
      ctx.beginPath();ctx.moveTo(cx(e.tr[i]),cy(e.tr[i+1]));
      ctx.lineTo(cx(e.tr[i+2]),cy(e.tr[i+3]));ctx.stroke();}}
  ctx.globalAlpha=e.type==='boss'?.5:.3;
  ctx.drawImage(glow(e.color),x-s*1.7,y-s*1.7,s*3.4,s*3.4);
  ctx.restore();ctx.globalAlpha=1;
  ctx.save();ctx.translate(x,y);
  ctx.strokeStyle=slowed?'#9be8ff':e.color;
  const dual=(draw)=>{ctx.globalAlpha=.25;ctx.lineWidth=5;draw();ctx.stroke();
    ctx.globalAlpha=1;ctx.lineWidth=1.8;draw();ctx.stroke();};
  if(e.type==='drone'){
    ctx.rotate(Math.atan2(dy,dx)+t*2+e.wob);
    dual(()=>{ctx.beginPath();
      for(let i=0;i<4;i++){const a=i/4*TAU;
        ctx.moveTo(Math.cos(a)*s,Math.sin(a)*s);
        ctx.lineTo(Math.cos(a+TAU/8)*s*.4,Math.sin(a+TAU/8)*s*.4);
        ctx.lineTo(Math.cos(a+TAU/4)*s,Math.sin(a+TAU/4)*s);}});
  }else if(e.type==='dart'){
    ctx.rotate(Math.atan2(dy,dx));
    dual(()=>{ctx.beginPath();ctx.moveTo(s*1.4,0);ctx.lineTo(-s,s*.7);ctx.lineTo(-s*.4,0);ctx.lineTo(-s,-s*.7);ctx.closePath();});
  }else if(e.type==='swarm'){
    ctx.rotate(t*5+e.wob);
    dual(()=>{ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.9,s*.7);ctx.lineTo(-s*.9,s*.7);ctx.closePath();});
  }else if(e.type==='tank'){
    ctx.rotate(t*.7+e.wob);
    dual(()=>{ctx.beginPath();
      for(let i=0;i<6;i++){const a=i/6*TAU;
        i?ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s):ctx.moveTo(Math.cos(a)*s,Math.sin(a)*s);}
      ctx.closePath();});
    dual(()=>{ctx.beginPath();ctx.arc(0,0,s*.45,0,TAU);});
  }else if(e.type==='shield'){
    ctx.rotate(t*1.2);
    dual(()=>{ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s,0);ctx.lineTo(0,s);ctx.lineTo(-s,0);ctx.closePath();});
    if(e.shield>0){ctx.strokeStyle='#d8c2ff';ctx.globalAlpha=.35+.5*(e.shield/e.shieldMax);
      ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,s*1.5,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
  }else if(e.type==='boss'){
    ctx.rotate(t*1.5);
    dual(()=>{ctx.beginPath();
      for(let i=0;i<10;i++){const a=i/10*TAU;const rr=i%2?s*.55:s;
        i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
      ctx.closePath();});
    ctx.rotate(-t*3);
    dual(()=>{ctx.beginPath();ctx.arc(0,0,s*.35,0,TAU);});
  }
  // bright core
  ctx.fillStyle='#fff';ctx.globalAlpha=.9;
  ctx.beginPath();ctx.arc(0,0,Math.max(1.2,s*.15),0,TAU);ctx.fill();
  ctx.globalAlpha=1;
  ctx.restore();
  // hp bar
  const ratio=e.hp/e.maxHp;
  if(ratio<1||e.shieldMax){
    const w=Math.max(16,s*2.2);
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x-w/2,y-s-8,w,3);
    ctx.fillStyle=ratio>.5?'#54ff7c':ratio>.25?'#ffe93c':'#ff4040';
    ctx.fillRect(x-w/2,y-s-8,w*clamp(ratio,0,1),3);
    if(e.shieldMax&&e.shield>0){ctx.fillStyle='#d8c2ff';
      ctx.fillRect(x-w/2,y-s-12,w*clamp(e.shield/e.shieldMax,0,1),2);}}
}

/* ============ HUD / UI ============ */
function updateHUD(){
  if(!G)return;
  const h=Math.max(0,G.health);
  $('hudHealth').textContent=h>8?'✚'.repeat(8)+' +'+(h-8):'✚'.repeat(h)||'—';
  $('hudCredits').textContent='◈ '+G.credits;
  $('hudScore').textContent=G.score.toLocaleString();
  $('hudMult').textContent='×'+G.mult.toFixed(1)+(G.streak>0?'  ('+G.streak+' streak)':'');
  $('hudWave').textContent='WAVE '+Math.max(1,G.wave+(G.waveActive?0:1));
}
function updateWaveBtn(){
  const b=$('waveBtn');
  if(!G)return;
  if(G.waveActive){
    const left=G.spawnQ.length+G.enemies.length;
    b.textContent='WAVE '+G.wave+' — '+left+' HOSTILE'+(left===1?'':'S');
    b.disabled=true;b.classList.remove('pink');
  }else{
    const n=G.wave+1;
    const bonus=Math.ceil(G.countdown*(2+G.wave*.5));
    b.textContent=G.wave===0?'DEPLOY WAVE 1  ('+Math.ceil(G.countdown)+')'
      :'CALL WAVE '+n+'  +'+bonus+' ◈  ('+Math.ceil(G.countdown)+')';
    b.disabled=false;b.classList.add('pink');
  }
}
$('waveBtn').addEventListener('click',()=>{
  if(!G||G.waveActive)return;
  audioInit();
  const bonus=G.wave===0?0:Math.ceil(G.countdown*(2+G.wave*.5));
  if(bonus>0){G.credits+=bonus;addText(4.5,6,'+'+bonus+' ◈ EARLY','#ffe93c');sfx('cash');}
  startWave();
});
$('speedBtn').addEventListener('click',()=>{speed=speed===1?2:1;$('speedBtn').textContent=speed+'×';sfx('click');});
$('pauseBtn').addEventListener('click',()=>{if(state!=='play')return;paused=true;show('pauseOv');sfx('click');});
$('resumeBtn').addEventListener('click',()=>{paused=false;hide('pauseOv');sfx('click');});
$('abandonBtn').addEventListener('click',()=>{paused=false;hide('pauseOv');gameOver();});

/* ---------- build / tower sheets ---------- */
function show(id){$(id).classList.add('show');}
function hide(id){$(id).classList.remove('show');}
function closeSheets(){hide('buildSheet');hide('towerSheet');if(G){G.sel=null;G.selTower=null;}}
$('buildClose').addEventListener('click',closeSheets);
$('towerClose').addEventListener('click',closeSheets);

function openBuild(c,r){
  G.sel=[c,r];G.selTower=null;hide('towerSheet');
  const wrap=$('buildCards');wrap.innerHTML='';
  for(const[key,def]of Object.entries(TOWERS)){
    const locked=def.lock&&!meta.unlocked[key];
    const broke=G.credits<def.cost;
    const el=document.createElement('div');
    el.className='card'+(locked?' locked':broke?' broke':'');
    el.style.borderColor=def.color;el.style.color=def.color;
    el.style.boxShadow=`0 0 10px ${def.color}33,inset 0 0 8px ${def.color}11`;
    el.innerHTML=`<div class="ic">${def.icon}</div><div class="nm">${def.name}</div>
      <div class="ds">${locked?'⬡ unlock in lab':def.desc}</div>
      <div class="cost">${locked?'🔒':'◈ '+def.cost}</div>`;
    el.addEventListener('click',()=>{
      if(locked){sfx('deny');toast('Unlock '+def.name+' in the UPGRADE LAB');return;}
      if(G.credits<def.cost){sfx('deny');toast('Not enough credits');return;}
      buildTower(key,c,r);});
    wrap.appendChild(el);}
  show('buildSheet');
}
function buildTower(type,c,r){
  const def=TOWERS[type];
  G.credits-=def.cost;
  const tw={type,c,r,tier:0,cd:0,aim:null,prio:'first',invested:def.cost};
  G.towers.set(c+','+r,tw);
  sfx('build');buzz(15);
  G.fx.push({k:'ring',x:c+.5,y:r+.5,r0:.1,r1:def.tiers[0].range,ttl:.4,max:.4,color:def.color});
  burst(c+.5,r+.5,def.color,10);
  meshImpulse(c+.5,r+.5,110);
  closeSheets();openTowerPanel(tw);updateHUD();
}
function openTowerPanel(tw){
  G.selTower=tw;G.sel=null;hide('buildSheet');
  const def=TOWERS[tw.type],st=def.tiers[tw.tier];
  $('towerName').textContent=def.icon+' '+def.name;
  $('towerName').style.color=def.color;
  $('towerTier').textContent='TIER '+(tw.tier+1)+' / 3';
  $('towerTier').style.color='#8fb4d4';
  let stats=`DMG ${Math.round(st.dmg*dmgMul())} · RATE ${st.rate}/s · RANGE ${st.range}`;
  if(st.aoe)stats+=` · SPLASH ${st.aoe}`;
  if(st.chains)stats+=` · CHAINS ${st.chains}`;
  if(st.slow)stats+=` · SLOW ${Math.round(st.slow*100)}%`;
  if(tw.tier<2){const nx=def.tiers[tw.tier+1];
    stats+=`<br><span style="color:${def.color}">NEXT: DMG ${Math.round(nx.dmg*dmgMul())} · RATE ${nx.rate}/s · RANGE ${nx.range}</span>`;}
  $('towerStats').innerHTML=stats;
  const upg=$('upgBtn');
  if(tw.tier<2){const cost=def.up[tw.tier];
    upg.textContent='UPGRADE ◈ '+cost;
    upg.disabled=G.credits<cost;upg.style.display='';}
  else{upg.textContent='MAX TIER';upg.disabled=true;}
  $('prioBtn').textContent='TARGET: '+tw.prio.toUpperCase();
  $('prioBtn').style.display=tw.type==='cryo'?'none':'';
  $('sellBtn').textContent='SELL ◈ '+Math.floor(tw.invested*.7);
  show('towerSheet');
}
$('upgBtn').addEventListener('click',()=>{
  const tw=G&&G.selTower;if(!tw||tw.tier>=2)return;
  const cost=TOWERS[tw.type].up[tw.tier];
  if(G.credits<cost){sfx('deny');return;}
  G.credits-=cost;tw.invested+=cost;tw.tier++;
  sfx('upgrade');buzz(20);
  burst(tw.c+.5,tw.r+.5,TOWERS[tw.type].color,16,1.4);
  meshImpulse(tw.c+.5,tw.r+.5,130);
  G.fx.push({k:'ring',x:tw.c+.5,y:tw.r+.5,r0:.1,r1:TOWERS[tw.type].tiers[tw.tier].range,ttl:.45,max:.45,color:'#fff'});
  openTowerPanel(tw);updateHUD();
});
$('prioBtn').addEventListener('click',()=>{
  const tw=G&&G.selTower;if(!tw)return;
  tw.prio=tw.prio==='first'?'strong':'first';
  sfx('click');openTowerPanel(tw);
});
$('sellBtn').addEventListener('click',()=>{
  const tw=G&&G.selTower;if(!tw)return;
  const refund=Math.floor(tw.invested*.7);
  G.credits+=refund;G.towers.delete(tw.c+','+tw.r);
  sfx('sell');burst(tw.c+.5,tw.r+.5,'#8fb4d4',12);
  addText(tw.c+.5,tw.r+.5,'+'+refund,'#ffe93c');
  closeSheets();updateHUD();
});

/* ---------- canvas input ---------- */
cv.addEventListener('pointerdown',ev=>{
  audioInit();
  if(state!=='play'||paused)return;
  const c=Math.floor((ev.clientX-OX)/CS),r=Math.floor((ev.clientY-OY)/CS);
  if(c<0||c>=GW||r<0||r>=GH){closeSheets();return;}
  const key=c+','+r;
  if(G.towers.has(key)){sfx('click');openTowerPanel(G.towers.get(key));}
  else if(!pathCells.has(key)){sfx('click');openBuild(c,r);}
  else closeSheets();
});

/* ============ FLOW ============ */
function startRun(){
  newGame();state='play';paused=false;speed=1;$('speedBtn').textContent='1×';
  hide('menu');hide('overOv');closeSheets();
  $('hud').style.display='flex';$('bar').style.display='flex';
  updateHUD();updateWaveBtn();
  banner('DEFEND THE REACTOR','#22d8ff');
}
function gameOver(){
  state='over';closeSheets();
  const earned=G.wave*2+Math.floor(G.score/4000);
  meta.cores+=earned;
  meta.bestWave=Math.max(meta.bestWave,G.wave);
  meta.bestScore=Math.max(meta.bestScore,G.score);
  saveMeta();
  sfx('over');buzz([60,60,120]);
  $('ovWave').textContent='SURVIVED '+G.wave+' WAVE'+(G.wave===1?'':'S');
  $('ovScore').textContent=G.score.toLocaleString();
  $('ovKills').textContent=G.kills;
  $('ovCores').textContent=earned;
  $('hud').style.display='none';$('bar').style.display='none';
  show('overOv');
}
function toMenu(){
  state='menu';G=null;
  hide('overOv');hide('pauseOv');closeSheets();
  $('hud').style.display='none';$('bar').style.display='none';
  $('mBestWave').textContent=meta.bestWave||'—';
  $('mBestScore').textContent=meta.bestScore?meta.bestScore.toLocaleString():'—';
  $('mCores').textContent=meta.cores;
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

/* ============ LOOP ============ */
let last=performance.now(),hudTick=0;
function loop(now){
  requestAnimationFrame(loop);
  let dt=Math.min(.034,(now-last)/1000);last=now;
  if(state==='play'&&!paused){
    update(dt*speed);
    hudTick+=dt;if(hudTick>.25){hudTick=0;if(G.waveActive)updateWaveBtn();}
  }
  render();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')paused||($('pauseBtn').click());});
document.addEventListener('gesturestart',e=>e.preventDefault());
resize();
toMenu();
requestAnimationFrame(loop);
})();
