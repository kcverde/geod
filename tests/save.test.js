import { describe, it, expect, afterEach, vi } from 'vitest';

afterEach(() => { delete globalThis.localStorage; });

describe('save merge', () => {
  it('keeps nested defaults for older saves', async () => {
    globalThis.localStorage = {
      getItem: () => JSON.stringify({ up: { hp: 2 }, unlocked: { arc: true } }),
      setItem: vi.fn(),
    };

    const { meta } = await import('../src/save.js?merge');

    expect(meta.up).toEqual({ hp: 2, credits: 0, dmg: 0, salvage: 0 });
    expect(meta.unlocked).toEqual({ lance: false, arc: true });
  });
});
