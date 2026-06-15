/* ============ DEV TUNING ============ */
/* Global balance multipliers, mutated live by the admin overlay (admin.js) and
   read at the game's balance chokepoints (main.js). Persisted to localStorage so
   tuned values survive a reload while balancing. Dev-only — never wired in prod. */

export const TUNING_DEFAULTS = {
  enemyHp: 1.65,     // enemy HP (and shield) multiplier
  enemySpeed: 1.1,   // enemy move-speed multiplier
  enemyCount: 0.75,  // per-wave spawn-count multiplier
  towerDmg: 0.7,     // all tower damage multiplier
  towerRate: 0.85,   // tower fire-rate multiplier
  towerRange: 1,     // tower range multiplier
  economy: 1,        // credit income + starting credits multiplier
  gameSpeed: 1.1,    // extra game-speed multiplier (on top of the 1×/2× button)
  coreInvincible: false, // leaks deal no core damage when true (debug only — not a balance value)
};

const KEY = 'neonGridDefense.tuning';

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
