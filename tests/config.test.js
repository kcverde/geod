import { describe, it, expect } from 'vitest';
import { TOWERS, ENEMIES, SHOP } from '../src/config.js';

describe('tower definitions', () => {
  for (const [key, def] of Object.entries(TOWERS)) {
    it(`${key} is well-formed`, () => {
      expect(def.cost).toBeGreaterThan(0);
      expect(def.tiers).toHaveLength(3);
      // one upgrade cost per tier transition (tier 0->1, 1->2)
      expect(def.up).toHaveLength(2);
      for (const t of def.tiers) {
        expect(t.dmg).toBeGreaterThan(0);
        expect(t.rate).toBeGreaterThan(0);
        expect(t.range).toBeGreaterThan(0);
      }
    });
  }
});

describe('enemy definitions', () => {
  for (const [key, def] of Object.entries(ENEMIES)) {
    it(`${key} has required stats`, () => {
      expect(def.hp).toBeGreaterThan(0);
      expect(def.spd).toBeGreaterThan(0);
      expect(def.bounty).toBeGreaterThanOrEqual(0);
      expect(def.score).toBeGreaterThanOrEqual(0);
    });
  }
});

describe('shop', () => {
  it('has unique ids', () => {
    const ids = SHOP.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
