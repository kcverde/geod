import { meta } from './save.js';
import { tuning } from './tuning.js';

/* ============ GAME STATE ============ */
/* Shared mutable run state. ES modules can't share reassignable `let` bindings,
   so the game's top-level state lives on this one exported object. `S.G` is the
   per-run object from newGame(); null when no run is active — update/render guard
   on this. */
export const S={state:'menu',paused:false,speed:1,G:null,dirtyHud:false,slowmo:0}; // state: menu | play | over
// Simulation code sets S.dirtyHud instead of touching the DOM; the loop flushes
// it once per frame via hud.js. Keeps combat/waves free of UI dependencies.
// S.slowmo: wall-clock seconds of dramatic slow-motion left (boss kills set it).
export function newGame(){
  S.slowmo=0;
  S.G={health:10+meta.up.hp*2,credits:Math.round((200+meta.up.credits*30)*tuning.economy),score:0,mult:1,streak:0,
    wave:0,enemies:[],towers:new Map(),projs:[],fx:[],parts:[],texts:[],
    spawnQ:[],waveT:0,waveActive:false,countdown:5,kills:0,
    sel:null,selTower:null,time:0,shake:0,flash:0};
}
export const dmgMul=()=>(1+meta.up.dmg*.04)*tuning.towerDmg;
export const salvMul=()=>1+meta.up.salvage*.05;
