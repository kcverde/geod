import { $ } from './util.js';
import { S } from './state.js';
import { TOWERS } from './config.js';

/* ============ HUD ============ */
/* Sync the top HUD and the wave button to run state. Depends only on state —
   waves/combat may import these without pulling in the UI layer. */
export function updateHUD(){
  if(!S.G)return;
  const h=Math.max(0,S.G.health);
  $('hudHealth').textContent=h>8?'✚'.repeat(8)+' +'+(h-8):'✚'.repeat(h)||'—';
  $('hudCredits').textContent='◈ '+S.G.credits;
  $('hudScore').textContent=S.G.score.toLocaleString();
  $('hudMult').textContent='×'+S.G.mult.toFixed(1)+(S.G.streak>0?'  ('+S.G.streak+' streak)':'');
  $('hudWave').textContent='WAVE '+Math.max(1,S.G.wave+(S.G.waveActive?0:1));
  // live affordability while sheets are open (cards carry data-cost; locked ones don't)
  if($('buildSheet').classList.contains('show'))
    for(const el of document.querySelectorAll('#buildCards .card[data-cost]'))
      el.classList.toggle('broke',S.G.credits<+el.dataset.cost);
  if($('towerSheet').classList.contains('show')&&S.G.selTower&&S.G.selTower.tier<2)
    $('upgBtn').disabled=S.G.credits<TOWERS[S.G.selTower.type].up[S.G.selTower.tier];
}
export function updateWaveBtn(){
  const b=$('waveBtn');
  if(!S.G)return;
  if(S.G.waveActive){
    const left=S.G.spawnQ.length+S.G.enemies.length;
    b.textContent='WAVE '+S.G.wave+' — '+left+' HOSTILE'+(left===1?'':'S');
    b.disabled=true;b.classList.remove('pink');
  }else{
    const n=S.G.wave+1;
    const bonus=Math.ceil(S.G.countdown*(2+S.G.wave*.5));
    b.textContent=S.G.wave===0?'DEPLOY WAVE 1  ('+Math.ceil(S.G.countdown)+')'
      :'CALL WAVE '+n+'  +'+bonus+' ◈  ('+Math.ceil(S.G.countdown)+')';
    b.disabled=false;b.classList.add('pink');
  }
}
