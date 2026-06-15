import { describe, it, expect } from 'vitest';
import { clamp, TAU } from '../src/util.js';

describe('clamp', () => {
  it('clamps below the range', () => expect(clamp(-5, 0, 10)).toBe(0));
  it('clamps above the range', () => expect(clamp(99, 0, 10)).toBe(10));
  it('passes values within the range', () => expect(clamp(5, 0, 10)).toBe(5));
});

describe('TAU', () => {
  it('is two pi', () => expect(TAU).toBeCloseTo(Math.PI * 2, 10));
});
