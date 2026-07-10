import { clamp, rand, TAU } from './util.js';
import { S } from './state.js';
import { GW, GH, WP, pathCells, BASE, totalLen, posAt, dirAt } from './path.js';
import { TOWERS } from './config.js';
import { ctx, W, H, CS, DPR, cx, cy, stars, bgCanvas, vigCanvas, glow, blitGlow, mesh } from './layout.js';

/* ============ RENDER ============ */
export function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(bgCanvas)ctx.drawImage(bgCanvas,0,0,W,H);
  else{ctx.fillStyle='#04060c';ctx.fillRect(0,0,W,H);}
  const t=S.G?S.G.time:performance.now()/1000;
  // parallax starfield (3 drifting layers)
  for(const s of stars){
    ctx.fillStyle=s.col;
    ctx.globalAlpha=(.16+.2*Math.sin(t*1.7+s.p))*(s.l+1)*.5;
    ctx.fillRect((s.x+t*s.spd)%W,s.y,s.r,s.r);}
  ctx.globalAlpha=1;
  if(!S.G){if(vigCanvas)ctx.drawImage(vigCanvas,0,0,W,H);return;}
  // shake
  ctx.save();
  if(S.G.shake>0)ctx.translate(rand(-S.G.shake,S.G.shake)*.6,rand(-S.G.shake,S.G.shake)*.6);
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
  if(S.G.sel){const[c,r]=S.G.sel;
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.globalAlpha=.9;
    ctx.strokeRect(cx(c)+2,cy(r)+2,CS-4,CS-4);ctx.globalAlpha=1;}
  if(S.G.selTower){const tw=S.G.selTower,st=TOWERS[tw.type].tiers[tw.tier];
    ctx.strokeStyle=TOWERS[tw.type].color;ctx.globalAlpha=.5;ctx.lineWidth=1.5;
    ctx.setLineDash([6,6]);
    ctx.beginPath();ctx.arc(cx(tw.c+.5),cy(tw.r+.5),st.range*CS,0,TAU);ctx.stroke();
    ctx.setLineDash([]);ctx.globalAlpha=1;}
  if(S.G.preview){const p=S.G.preview,def=TOWERS[p.type];
    ctx.strokeStyle=def.color;ctx.globalAlpha=.4;ctx.lineWidth=1.5;
    ctx.setLineDash([6,6]);
    ctx.beginPath();ctx.arc(cx(p.c+.5),cy(p.r+.5),def.tiers[0].range*CS,0,TAU);ctx.stroke();
    ctx.setLineDash([]);ctx.globalAlpha=1;}
  // towers
  for(const tw of S.G.towers.values())drawTower(tw,t);
  // enemies
  for(const e of S.G.enemies)drawEnemy(e,t);
  // projectiles
  ctx.globalCompositeOperation='lighter';
  for(const p of S.G.projs){
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
  for(const f of S.G.fx){const k=f.ttl/f.max;
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
  for(const p of S.G.parts){const a=p.life/p.max;
    if(p.sz>2.6)blitGlow(p.color,cx(p.x),cy(p.y),p.sz*2.6,a*.85);
    else{ctx.fillStyle=p.color;ctx.globalAlpha=a;
      ctx.fillRect(cx(p.x)-p.sz/2,cy(p.y)-p.sz/2,p.sz,p.sz);}}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  // floating text
  ctx.font='700 '+Math.max(11,CS*.28)+'px Orbitron,"Avenir Next",system-ui,sans-serif';
  ctx.textAlign='center';
  for(const tx of S.G.texts){ctx.fillStyle=tx.color;ctx.globalAlpha=Math.min(1,tx.life*2);
    ctx.fillText(tx.txt,cx(tx.x),cy(tx.y));}
  ctx.globalAlpha=1;
  ctx.restore();
  // boss HP bar (HUD-anchored, unaffected by shake)
  const boss=S.G.enemies.find(e=>e.type==='boss');
  if(boss){const bw=W*.7,bx0=(W-bw)/2,by0=92;
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(bx0,by0,bw,6);
    ctx.fillStyle='#ff2255';
    ctx.fillRect(bx0,by0,bw*clamp((boss.hp+boss.shield)/(boss.maxHp+(boss.shieldMax||0)),0,1),6);
    ctx.font='700 10px Orbitron,"Avenir Next",system-ui,sans-serif';ctx.textAlign='center';
    ctx.fillText('BOSS',W/2,by0-4);}
  if(vigCanvas)ctx.drawImage(vigCanvas,0,0,W,H);
  // leak flash
  if(S.G.flash>0){ctx.fillStyle='rgba(255,30,80,'+(S.G.flash*.25)+')';ctx.fillRect(0,0,W,H);}
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
  const slowed=S.G.time<e.slowUntil;
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
  const hit=e.hitT&&S.G.time-e.hitT<.08;
  ctx.strokeStyle=hit?'#fff':slowed?'#9be8ff':e.color;
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
