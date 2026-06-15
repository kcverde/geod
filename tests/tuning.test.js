import { describe, it, expect } from 'vitest';
import { TUNING_DEFAULTS } from '../src/tuning.js';

describe('tuning defaults', () => {
  it('all multipliers are positive finite numbers', () => {
    for (const k of ['enemyHp', 'enemySpeed', 'enemyCount', 'towerDmg', 'towerRate', 'towerRange', 'economy', 'gameSpeed']) {
      expect(typeof TUNING_DEFAULTS[k], k).toBe('number');
      expect(Number.isFinite(TUNING_DEFAULTS[k]), k).toBe(true);
      expect(TUNING_DEFAULTS[k], k).toBeGreaterThan(0);
    }
  });

  it('core is not invincible by default (debug-only flag must not ship enabled)', () => {
    expect(TUNING_DEFAULTS.coreInvincible).toBe(false);
  });
});
