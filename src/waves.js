import { $, TAU } from './util.js';
import { S } from './state.js';
import { sfx, buzz } from './audio.js';
import { banner } from './fx.js';
import { ENEMIES, SPAWN_COUNT_SCALE } from './config.js';
import { tuning } from './tuning.js';

/* ============ WAVES ============ */
/* waveSpawns is pure (given config + tuning) — the boss sfx/banner side effect
   lives in startWave, so admin jump-to-wave and tests can build schedules freely. */
export function waveSpawns(n){
  const s=[];let t=0;
  const add=(type,count,gap)=>{count=Math.max(1,Math.round(count*SPAWN_COUNT_SCALE*tuning.enemyCount));for(let i=0;i<count;i++){s.push({t,type});t+=gap;}t+=1;};
  if(n%8===0){
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
export const hpMul=n=>1+n*.16+n*n*.013;
export function startWave(){
  S.G.wave++;S.G.waveActive=true;S.G.waveT=0;S.G.countdown=0;
  S.G.spawnQ=waveSpawns(S.G.wave);
  if(S.G.wave%8===0){sfx('boss');banner('⚠ BOSS INBOUND ⚠','#ff2255');buzz(80);}
  else{sfx('wave');banner('WAVE '+S.G.wave,'#22d8ff');}
  $('wavePreview').innerHTML='';
  S.dirtyHud=true;
}
export function spawnEnemy(type){
  const d=ENEMIES[type],m=hpMul(S.G.wave)*tuning.enemyHp;
  const hp=d.hp*m*(type==='boss'?(1+S.G.wave*.06):1);
  S.G.enemies.push({type,t:0,hp,maxHp:hp,spd:d.spd*(1+Math.min(.5,S.G.wave*.008))*tuning.enemySpeed,
    r:d.r,color:d.color,slowUntil:0,slowMult:1,tr:[],
    shield:d.shield?d.shield*m:0,shieldMax:d.shield?d.shield*m:0,lastHit:-9,
    wob:Math.random()*TAU,dead:false});
}
