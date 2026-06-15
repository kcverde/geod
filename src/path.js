import { clamp } from './util.js';

/* ============ GRID & PATH ============ */
export const GW=9,GH=14;
export const WP=[[-0.7,1.5],[7.5,1.5],[7.5,4.5],[1.5,4.5],[1.5,7.5],[7.5,7.5],[7.5,10.5],[1.5,10.5],[1.5,12.5],[8.5,12.5]];
export const PATH_INT=[[0,1],[7,1],[7,4],[1,4],[1,7],[7,7],[7,10],[1,10],[1,12],[8,12]];
export const pathCells=new Set();
for(let i=0;i<PATH_INT.length-1;i++){let[x0,y0]=PATH_INT[i],[x1,y1]=PATH_INT[i+1];
  const dx=Math.sign(x1-x0),dy=Math.sign(y1-y0);let x=x0,y=y0;pathCells.add(x+','+y);
  while(x!==x1||y!==y1){x+=dx;y+=dy;pathCells.add(x+','+y);}}
export const BASE=[8,12];
export const segLen=[];export let totalLen=0;
for(let i=0;i<WP.length-1;i++){const l=Math.hypot(WP[i+1][0]-WP[i][0],WP[i+1][1]-WP[i][1]);segLen.push(l);totalLen+=l;}
export function posAt(t){t=clamp(t,0,totalLen);let acc=0;
  for(let i=0;i<segLen.length;i++){if(t<=acc+segLen[i]){const k=(t-acc)/segLen[i];
    return[WP[i][0]+(WP[i+1][0]-WP[i][0])*k,WP[i][1]+(WP[i+1][1]-WP[i][1])*k];}acc+=segLen[i];}
  return[WP[WP.length-1][0],WP[WP.length-1][1]];}
export function dirAt(t){t=clamp(t,0,totalLen-.001);let acc=0;
  for(let i=0;i<segLen.length;i++){if(t<=acc+segLen[i]){const dx=WP[i+1][0]-WP[i][0],dy=WP[i+1][1]-WP[i][1];
    const l=segLen[i];return[dx/l,dy/l];}acc+=segLen[i];}return[1,0];}
