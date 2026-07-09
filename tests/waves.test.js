import { describe, it, expect } from 'vitest';
import { waveSpawns, hpMul } from '../src/waves.js';

describe('waveSpawns', () => {
  it('wave 1 is drones only', () => {
    const types = new Set(waveSpawns(1).map(s => s.type));
    expect([...types]).toEqual(['drone']);
  });

  it('spawns at least one enemy on every early wave', () => {
    for (let n = 1; n <= 20; n++) expect(waveSpawns(n).length).toBeGreaterThan(0);
  });

  it('bosses appear exactly on every 8th wave', () => {
    for (let n = 1; n <= 32; n++) {
      const hasBoss = waveSpawns(n).some(s => s.type === 'boss');
      expect(hasBoss).toBe(n % 8 === 0);
    }
  });

  it('spawn times are non-decreasing', () => {
    for (const n of [1, 5, 8, 10, 16, 24]) {
      const s = waveSpawns(n);
      for (let i = 1; i < s.length; i++) expect(s[i].t).toBeGreaterThanOrEqual(s[i - 1].t);
    }
  });

  it('shields join regular waves from wave 10', () => {
    expect(waveSpawns(9).some(s => s.type === 'shield')).toBe(false);
    expect(waveSpawns(10).some(s => s.type === 'shield')).toBe(true);
  });

  it('is pure — same wave, same schedule', () => {
    expect(waveSpawns(12)).toEqual(waveSpawns(12));
  });
});

describe('hpMul', () => {
  it('grows superlinearly with wave number', () => {
    expect(hpMul(10)).toBeGreaterThan(hpMul(1));
    expect(hpMul(20) - hpMul(10)).toBeGreaterThan(hpMul(10) - hpMul(1));
  });
});
