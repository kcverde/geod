import { describe, it, expect } from 'vitest';
import { WP, BASE, totalLen, pathCells, posAt, dirAt } from '../src/path.js';

describe('path geometry', () => {
  it('has positive total length', () => {
    expect(totalLen).toBeGreaterThan(0);
  });

  it('posAt(0) sits at the first waypoint', () => {
    const [x, y] = posAt(0);
    expect(x).toBeCloseTo(WP[0][0], 5);
    expect(y).toBeCloseTo(WP[0][1], 5);
  });

  it('posAt(totalLen) sits at the last waypoint', () => {
    const [x, y] = posAt(totalLen);
    const last = WP[WP.length - 1];
    expect(x).toBeCloseTo(last[0], 5);
    expect(y).toBeCloseTo(last[1], 5);
  });

  it('clamps t outside the path range', () => {
    expect(posAt(-100)).toEqual(posAt(0));
    expect(posAt(totalLen + 100)).toEqual(posAt(totalLen));
  });

  it('dirAt returns a roughly unit-length direction', () => {
    const [dx, dy] = dirAt(totalLen / 2);
    expect(Math.hypot(dx, dy)).toBeCloseTo(1, 5);
  });

  it('marks the reactor base cell as path (non-buildable)', () => {
    expect(pathCells.has(BASE[0] + ',' + BASE[1])).toBe(true);
  });
});
