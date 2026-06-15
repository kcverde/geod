import { describe, it, expect } from 'vitest';
import { TUNING_DEFAULTS } from '../src/tuning.js';

describe('tuning defaults', () => {
  it('all multipliers default to 1 (neutral balance)', () => {
    for (const k of ['enemyHp', 'enemySpeed', 'enemyCount', 'towerDmg', 'towerRate', 'towerRange', 'economy', 'gameSpeed']) {
      expect(TUNING_DEFAULTS[k], k).toBe(1);
    }
  });

  it('core is not invincible by default', () => {
    expect(TUNING_DEFAULTS.coreInvincible).toBe(false);
  });
});
