/* ============ DEFINITIONS ============ */
export const TOWERS={
  pulse:{name:'PULSE',icon:'▲',color:'#22d8ff',cost:50,desc:'rapid fire',
    tiers:[{dmg:7,rate:3.2,range:2.3},{dmg:13,rate:3.8,range:2.5},{dmg:24,rate:4.6,range:2.8}],up:[45,95]},
  nova:{name:'NOVA',icon:'◆',color:'#ffb020',cost:90,desc:'splash mortar',
    tiers:[{dmg:22,rate:.75,range:3,aoe:1.15},{dmg:40,rate:.85,range:3.2,aoe:1.3},{dmg:70,rate:1,range:3.5,aoe:1.5}],up:[80,170]},
  cryo:{name:'CRYO',icon:'✱',color:'#9be8ff',cost:70,desc:'slows + chips',
    tiers:[{dmg:4,rate:1.1,range:2.2,slow:.42,slowT:1.4},{dmg:8,rate:1.25,range:2.4,slow:.5,slowT:1.7},{dmg:14,rate:1.45,range:2.7,slow:.58,slowT:2}],up:[60,130]},
  lance:{name:'LANCE',icon:'◈',color:'#ff2e88',cost:120,desc:'piercing rail',lock:60,
    tiers:[{dmg:60,rate:.55,range:4.6},{dmg:110,rate:.62,range:5},{dmg:200,rate:.72,range:5.5}],up:[110,230]},
  arc:{name:'ARC',icon:'ϟ',color:'#54ff7c',cost:110,desc:'chain lightning',lock:130,
    tiers:[{dmg:13,rate:1.3,range:2.7,chains:4},{dmg:22,rate:1.5,range:2.9,chains:5},{dmg:38,rate:1.7,range:3.2,chains:7}],up:[100,210]},
};
export const ENEMIES={
  drone:{hp:26,spd:1,bounty:6,score:50,r:.26,color:'#ff6bd6'},
  dart:{hp:15,spd:1.85,bounty:5,score:60,r:.2,color:'#ffe93c'},
  swarm:{hp:9,spd:1.35,bounty:2,score:25,r:.14,color:'#7dff9a'},
  tank:{hp:150,spd:.5,bounty:18,score:150,r:.34,color:'#ff4040'},
  shield:{hp:70,shield:70,spd:.8,bounty:16,score:140,r:.28,color:'#b06bff'},
  boss:{hp:950,spd:.38,bounty:130,score:1500,r:.55,color:'#ff2255',dmg:3},
};
export const SHOP=[
  {id:'hp',name:'REACTOR PLATING',desc:'+2 core integrity per level',base:20,max:6},
  {id:'credits',name:'SEED FUNDING',desc:'+30 starting credits per level',base:15,max:6},
  {id:'dmg',name:'OVERCLOCK',desc:'+4% turret damage per level',base:25,max:8},
  {id:'salvage',name:'SALVAGE RIG',desc:'+5% credit income per level',base:20,max:6},
  {id:'lance',name:'UNLOCK: LANCE',desc:'piercing railgun turret',base:60,unlock:true},
  {id:'arc',name:'UNLOCK: ARC',desc:'chain lightning turret',base:130,unlock:true},
];
