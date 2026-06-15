/* ============ DEV TUNING ============ */
/* Global balance multipliers, mutated live by the admin overlay (admin.js) and
   read at the game's balance chokepoints (main.js). Persisted to localStorage so
   tuned values survive a reload while balancing. Dev-only — never wired in prod. */

// Neutral by default: the real balance is baked into config.js. These are pure
// dev-overlay deltas on top of the shipped numbers — 1× means "no change".
export const TUNING_DEFAULTS = {
  enemyHp: 1,        // enemy HP (and shield) multiplier
  enemySpeed: 1,     // enemy move-speed multiplier
  enemyCount: 1,     // per-wave spawn-count multiplier
  towerDmg: 1,       // all tower damage multiplier
  towerRate: 1,      // tower fire-rate multiplier
  towerRange: 1,     // tower range multiplier
  economy: 1,        // credit income + starting credits multiplier
  gameSpeed: 1,      // extra game-speed multiplier (on top of the 1×/2× button)
  coreInvincible: false, // leaks deal no core damage when true (debug only)
};

// Bumped to .v2 when balance was folded into config.js — invalidates older saved
// tuning so it can't double-apply on top of the now-baked numbers.
const KEY = 'neonGridDefense.tuning.v2';

export const tuning = { ...TUNING_DEFAULTS };
try {
  const s = localStorage.getItem(KEY);
  if (s) Object.assign(tuning, JSON.parse(s));
} catch (e) {}

export function saveTuning() {
  try { localStorage.setItem(KEY, JSON.stringify(tuning)); } catch (e) {}
}

export function resetTuning() {
  Object.assign(tuning, TUNING_DEFAULTS);
  saveTuning();
}
