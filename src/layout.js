import { $, rand, TAU } from './util.js';
import { GW, GH } from './path.js';

/* ============ LAYOUT ============ */
/* Canvas, sizing/DPR, grid→pixel helpers, and the pre-rendered/cached visual
   layers (nebula bg, vignette, glow sprites, starfield, warping mesh grid).
   Scalars are `export let` — ES module live bindings, so importers always see
   the values assigned by the latest resize(). Only this module writes them. */
export const cv=$('cv'),ctx=cv.getContext('2d');
export let W=0,H=0,CS=40,OX=0,OY=0,DPR=1;
export function resize(){DPR=Math.min(window.devicePixelRatio||1,3);
  W=window.innerWidth;H=window.innerHeight;
  cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';
  const topPad=86,botPad=118;
  CS=Math.min(W/GW,(H-topPad-botPad)/GH);
  OX=(W-CS*GW)/2;OY=topPad+((H-topPad-botPad)-CS*GH)/2;
  starsInit();buildBg();meshInit();}
export const cx=x=>OX+x*CS, cy=y=>OY+y*CS;
window.addEventListener('resize',resize);

export let stars=[];
function starsInit(){stars=[];for(let i=0;i<110;i++){const l=i%3;
  stars.push({x:Math.random()*W,y:Math.random()*H,l,
    r:l===2?rand(.9,1.9):l===1?rand(.5,1.2):rand(.3,.8),
    spd:(l+1)*2.4,p:Math.random()*TAU,
    col:Math.random()<.14?'#7ef0ff':Math.random()<.1?'#ffb0e0':'#9fc6e8'});}}

/* nebula background + vignette, pre-rendered once per resize */
export let bgCanvas=null,vigCanvas=null;
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
export function glow(color){let g=glowCache[color];if(g)return g;
  g=document.createElement('canvas');g.width=g.height=64;
  const c2=g.getContext('2d');
  const gr=c2.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.28,color);gr.addColorStop(1,'rgba(0,0,0,0)');
  c2.fillStyle=gr;c2.fillRect(0,0,64,64);
  glowCache[color]=g;return g;}
export function blitGlow(color,x,y,r,alpha){ctx.globalAlpha=alpha;
  ctx.drawImage(glow(color),x-r,y-r,r*2,r*2);ctx.globalAlpha=1;}

/* warping grid mesh — explosions ripple through it */
export let mesh=[];
function meshInit(){mesh=[];
  for(let r=0;r<=GH;r++)for(let c=0;c<=GW;c++){
    const x=cx(c),y=cy(r);
    mesh.push({x,y,rx:x,ry:y,vx:0,vy:0});}}
export function meshImpulse(gx,gy,pow){if(!mesh.length)return;
  const ex=cx(gx),ey=cy(gy),R=CS*3.4;
  for(const p of mesh){const dx=p.rx-ex,dy=p.ry-ey,d=Math.hypot(dx,dy);
    if(d<R&&d>1){const f=pow*(1-d/R);p.vx+=dx/d*f;p.vy+=dy/d*f;}}}
export function meshUpdate(dt){const damp=Math.exp(-7*dt);
  for(const p of mesh){
    p.vx+=(p.rx-p.x)*70*dt;p.vy+=(p.ry-p.y)*70*dt;
    p.vx*=damp;p.vy*=damp;
    p.x+=p.vx*dt;p.y+=p.vy*dt;}}
