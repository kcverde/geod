# Roadmap

Where the project stands and what's planned next. (For architecture details see
[CLAUDE.md](CLAUDE.md); for how to play see [README.md](README.md).)

> **Task-level detail lives in [BACKLOG.md](BACKLOG.md)** — the full execution backlog
> (architecture extraction, playability, graphics, levels, Google Play deployment),
> broken into single-session tasks with steps and done-when criteria.

## Done

- **Tooling & structure** — migrated from a single one-shot `index.html` to a Vite
  project. Split into ES modules under `src/` (`main.js`, `config.js`, `path.js`,
  `save.js`, `audio.js`, `util.js`, `tuning.js`, `styles.css`) with Vitest tests.
- **Dev balance overlay** — `tuning.js` + `admin.js`, toggled with the backtick (`` ` ``)
  key during `npm run dev`. Live sliders + debug actions (jump-to-wave, +credits,
  kill-all, invincible core) and a copy-values button. Gated behind
  `import.meta.env.DEV`, so it's stripped from production builds.
- **Balancing pass** — the game was too easy; tuned it harder and **folded the
  multipliers into `config.js` base numbers** (tower dmg ×0.7, rate ×0.85; enemy hp
  ×1.65, speed ×1.1; plus `SPAWN_COUNT_SCALE` / `GAME_SPEED`). The overlay now ships
  neutral (1×) — real balance lives in `config.js`.

## Next

1. **Phase 3 — extract the coupled core.** `main.js` still holds the
   state/combat/update/render/ui sections, which share mutable state (`G`, geometry,
   `ctx`). Split them into modules, routing shared state through a small `state.js`.
   Do this *before* levels, since levels lean on a cleaner core. (See the "Next
   extraction step" note in CLAUDE.md.)
2. **Levels.** Currently a single hardcoded path in `path.js`. Add multiple
   maps/paths, per-level configs, and a level-select screen.
3. **Art & weapon-behavior polish.** Visual tweaks and adjusting what the weapons do.
   Ongoing — can happen anytime; the overlay's per-tower knobs help feel out changes.

## Notes / open questions

- `GAME_SPEED = 1.1` (in `config.js`) stacks on the in-game 1×/2× button, so "1×" runs
  at 1.1× and "2×" at 2.2×. May want to revisit — cleanest fix is to drop `GAME_SPEED`
  toward `1.0` and nudge enemy speed / tower rate instead.
