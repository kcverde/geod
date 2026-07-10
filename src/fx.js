import { $, rand, TAU } from './util.js';
import { S } from './state.js';
import { meta } from './save.js';

/* ============ FX HELPERS ============ */
/* Particle/shard/floating-text spawners (write into S.G arrays) plus the two
   DOM flourishes (banner, toast) — kept here, not in ui code, so waves/combat
   can use them without depending on the UI layer. */
export function burst(x,y,color,n,pow){pow=pow||1;
  if(meta.lowFx)n=Math.ceil(n/2);
  if(S.G.parts.length>450)return;
  for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rand(.5,3.2)*pow;
    S.G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.3,.8),max:.8,color,sz:rand(1.5,3.5)});}}
export function shatter(x,y,color,n,sz){
  for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rand(1,4.5);
    S.G.fx.push({k:'shard',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,
      rot:Math.random()*TAU,vr:rand(-9,9),len:sz*rand(.35,1),
      ttl:rand(.35,.75),max:.75,color});}}
export function addText(x,y,txt,color){S.G.texts.push({x,y,txt,color,life:1});}
let bannerT=null;
export function banner(txt,color){const b=$('banner');b.textContent=txt;b.style.color=color;
  b.style.textShadow=`0 0 12px ${color},0 0 40px ${color}`;b.style.opacity=1;
  clearTimeout(bannerT);bannerT=setTimeout(()=>b.style.opacity=0,1400);}
let toastT=null;
export function toast(txt){const t=$('toast');t.textContent=txt;t.style.opacity=1;
  clearTimeout(toastT);toastT=setTimeout(()=>t.style.opacity=0,1600);}
