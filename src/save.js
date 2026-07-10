/* ============ META / SAVE ============ */
const SAVE_KEY='neonGridDefense.v1';
export let meta={cores:0,bestWave:0,bestScore:0,mute:false,lowFx:false,seenTut:false,
  up:{hp:0,credits:0,dmg:0,salvage:0},unlocked:{lance:false,arc:false}};
try{const s=localStorage.getItem(SAVE_KEY);if(s){const saved=JSON.parse(s);
  Object.assign(meta,saved,{up:{...meta.up,...saved.up},unlocked:{...meta.unlocked,...saved.unlocked}});}}catch(e){}
export function saveMeta(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(meta));}catch(e){}}
