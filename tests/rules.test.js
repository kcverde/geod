import { describe, it, expect, vi } from 'vitest';
import { coresEarned } from '../src/rules.js';

describe('coresEarned', () => {
  it('pays 2 cores per completed wave', () => expect(coresEarned(5, 0)).toBe(10));
  it('adds 1 core per 4000 score, floored', () => expect(coresEarned(0, 8500)).toBe(2));
  it('combines both components', () => expect(coresEarned(3, 4000)).toBe(7));
  it('pays nothing when no wave was completed (abandon-farm fix)', () =>
    expect(coresEarned(0, 0)).toBe(0));
});

describe('completed-wave counter', () => {
  it('starts a run with wavesDone 0, separate from wave', async () => {
    globalThis.localStorage = { getItem: () => null, setItem: vi.fn() };
    const { S, newGame } = await import('../src/state.js');
    newGame();
    expect(S.G.wavesDone).toBe(0);
    expect(S.G.wave).toBe(0);
    delete globalThis.localStorage;
  });
});
