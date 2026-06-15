/* ============ DEFINITIONS ============ */
/* Canonical balance lives here. The dev overlay (tuning.js) multiplies these at
   runtime but ships neutral (all 1×), so these numbers are the real balance.
   Values reflect the folded-in tuning pass: tower dmg ×0.7, tower rate ×0.85,
   enemy hp ×1.65, enemy speed ×1.1 (vs. the original one-shot numbers). */
export const TOWERS={
  pulse:{name:'PULSE',icon:'▲',color:'#22d8ff',cost:50,desc:'rapid fire',
    tiers:[{dmg:4.9,rate:2.72,range:2.3},{dmg:9.1,rate:3.23,range:2.5},{dmg:16.8,rate:3.91,range:2.8}],up:[45,95]},
  nova:{name:'NOVA',icon:'◆',color:'#ffb020',cost:90,desc:'splash mortar',
    tiers:[{dmg:15.4,rate:.6375,range:3,aoe:1.15},{dmg:28,rate:.7225,range:3.2,aoe:1.3},{dmg:49,rate:.85,range:3.5,aoe:1.5}],up:[80,170]},
  cryo:{name:'CRYO',icon:'✱',color:'#9be8ff',cost:70,desc:'slows + chips',
    tiers:[{dmg:2.8,rate:.935,range:2.2,slow:.42,slowT:1.4},{dmg:5.6,rate:1.0625,range:2.4,slow:.5,slowT:1.7},{dmg:9.8,rate:1.2325,range:2.7,slow:.58,slowT:2}],up:[60,130]},
  lance:{name:'LANCE',icon:'◈',color:'#ff2e88',cost:120,desc:'piercing rail',lock:60,
    tiers:[{dmg:42,rate:.4675,range:4.6},{dmg:77,rate:.527,range:5},{dmg:140,rate:.612,range:5.5}],up:[110,230]},
  arc:{name:'ARC',icon:'ϟ',color:'#54ff7c',cost:110,desc:'chain lightning',lock:130,
    tiers:[{dmg:9.1,rate:1.105,range:2.7,chains:4},{dmg:15.4,rate:1.275,range:2.9,chains:5},{dmg:26.6,rate:1.445,range:3.2,chains:7}],up:[100,210]},
};
export const ENEMIES={
  drone:{hp:42.9,spd:1.1,bounty:6,score:50,r:.26,color:'#ff6bd6'},
  dart:{hp:24.75,spd:2.035,bounty:5,score:60,r:.2,color:'#ffe93c'},
  swarm:{hp:14.85,spd:1.485,bounty:2,score:25,r:.14,color:'#7dff9a'},
  tank:{hp:247.5,spd:.55,bounty:18,score:150,r:.34,color:'#ff4040'},
  shield:{hp:115.5,shield:115.5,spd:.88,bounty:16,score:140,r:.28,color:'#b06bff'},
  boss:{hp:1567.5,spd:.418,bounty:130,score:1500,r:.55,color:'#ff2255',dmg:3},
};
/* Global balance scalars (no per-row home — applied in main.js). Folded-in tuning:
   spawn count ×0.75, game speed ×1.1 (the latter stacks on the 1×/2× button). */
export const SPAWN_COUNT_SCALE=0.75; // enemies per wave
export const GAME_SPEED=1.1;         // baseline simulation speed
export const SHOP=[
  {id:'hp',name:'REACTOR PLATING',desc:'+2 core integrity per level',base:20,max:6},
  {id:'credits',name:'SEED FUNDING',desc:'+30 starting credits per level',base:15,max:6},
  {id:'dmg',name:'OVERCLOCK',desc:'+4% turret damage per level',base:25,max:8},
  {id:'salvage',name:'SALVAGE RIG',desc:'+5% credit income per level',base:20,max:6},
  {id:'lance',name:'UNLOCK: LANCE',desc:'piercing railgun turret',base:60,unlock:true},
  {id:'arc',name:'UNLOCK: ARC',desc:'chain lightning turret',base:130,unlock:true},
];
