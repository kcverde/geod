import { describe, it, expect } from 'vitest';
import { TUNING_DEFAULTS } from '../src/tuning.js';

describe('tuning defaults', () => {
  it('all multipliers are neutral (1×) — real balance lives in config.js', () => {
    for (const k of ['enemyHp', 'enemySpeed', 'enemyCount', 'towerDmg', 'towerRate', 'towerRange', 'economy', 'gameSpeed']) {
      expect(TUNING_DEFAULTS[k], k).toBe(1);
    }
  });

  it('core is not invincible by default (debug-only flag must not ship enabled)', () => {
    expect(TUNING_DEFAULTS.coreInvincible).toBe(false);
  });
});
