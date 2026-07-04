# CLAUDE.md

Guidance for working in this repository.

## What this is

**NEON GRID DEFENSE** — a tower defense game. Built with **Vite** (dev server + bundler); vanilla JavaScript, no framework. The only runtime dependency is the Orbitron web font from Google Fonts (with a system-font fallback).

## Running

```sh
npm install      # first time only
npm run dev      # dev server with hot-reload (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # serve the production build
npm test         # run unit tests (Vitest)
```

`index.html` is a thin shell that loads `src/main.js` as an ES module. Edit any file under `src/` and the dev server hot-reloads.

## Code structure

`index.html` holds the DOM shell (canvas + overlay panels). Everything else is ES modules under `src/`, split along the original section boundaries:

| File | Responsibility |
| ---- | -------------- |
| `main.js` | Bootstrap, game state (`state`, `G`), update tick, render, HUD/UI wiring, game loop. Imports from all the modules below. Still the largest file — the tightly-coupled core lives here. |
| `config.js` | Data tables: `TOWERS` (5 types × 3 tiers + `up` costs), `ENEMIES` (6 types), `SHOP` (lab upgrades), plus global scalars `SPAWN_COUNT_SCALE` / `GAME_SPEED`. **Primary balance knobs** — the real balance lives here; the dev overlay ships neutral (1×). |
| `path.js` | `GW`×`GH` grid (9×14), waypoints `WP`, `pathCells` (non-buildable tiles), and `posAt(t)`/`dirAt(t)` arc-length interpolation along the lane. |
| `save.js` | `meta` object + `localStorage` persistence (key `neonGridDefense.v1`): cores, best scores, `meta.up` upgrades, `meta.unlocked` turrets. |
| `audio.js` | WebAudio synthesized SFX — no audio files. `sfx(name)` dispatches by name; `audioInit()` lazily creates the context on first interaction. |
| `util.js` | Shared helpers: `$` (getElementById), `clamp`, `rand`, `TAU`. |
| `state.js` | Shared mutable run state: the `S` object (`S.state` 'menu' \| 'play' \| 'over', `S.paused`, `S.speed`, `S.G`), `newGame()`, and the `dmgMul`/`salvMul` multipliers. `S.G` is the per-run object; `null` when no run is active — update/render guard on this. |
| `layout.js` | Canvas + `ctx`, sizing/DPR (`resize`), grid→pixel helpers `cx()`/`cy()`/`CS`, pre-rendered nebula/vignette (`buildBg`), cached glow sprites (`glow`/`blitGlow`), parallax `stars`, and the warping `mesh` grid (`meshImpulse`/`meshUpdate`). Scalars (`W`,`H`,`CS`,…) are `export let` live bindings — only `resize()` writes them. |
| `tuning.js` | Dev balance multipliers (`tuning` object) + localStorage persistence. Read at the game's balance chokepoints. |
| `admin.js` | Dev-only tuning overlay (sliders + debug actions). Loaded dynamically; see below. |

`src/main.js` is still one IIFE internally, organized into commented sections — the seams for further extraction are visible:

- **WAVES** — `waveSpawns(n)` builds the spawn schedule (bosses every 8th wave); `hpMul`/scaling tune difficulty; `startWave`, `spawnEnemy`.
- **COMBAT** — targeting (`nearestEnemies`, `pickTarget`), damage (`hurt`, `kill`, `leak`), per-turret firing in `fireTower()` (one branch per type).
- **FX HELPERS** — particle/shard/banner/toast spawners.
- **UPDATE** — `update(dt)`: the simulation tick (spawns, enemies, towers, projectiles, FX, wave/countdown).
- **RENDER** — `render()` + `drawTower`/`drawEnemy`. Canvas 2D; uses `globalCompositeOperation='lighter'` heavily for the neon glow.
- **HUD / UI** — DOM overlays + event listeners; `updateHUD`/`updateWaveBtn` sync DOM to state.
- **FLOW** — `startRun`, `gameOver`, `toMenu`, menu/shop/pause handlers.
- **LOOP** — `requestAnimationFrame`: `update(dt*speed)` then `render()` each frame. `dt` clamped to 0.034s.

> **Extraction progress:** run state lives in `state.js` (A1) and canvas/geometry/visual-layer code in `layout.js` (A2). The remaining WAVES/COMBAT/FX/RENDER/UI sections still live in main.js's IIFE; extract them one at a time per BACKLOG.md tasks A3–A7, verifying the game runs after each.

## Admin overlay (dev only)

`npm run dev` only: press **`` ` ``** (backtick) to toggle a balance panel. Live sliders
drive global multipliers in `tuning.js` (enemy hp/speed/count, tower dmg/rate/range,
economy, game speed) that the game reads at its balance chokepoints; debug actions cover
jump-to-wave, +credits, kill-all, and an invincible-core toggle. **Copy** puts the current
`tuning` JSON on the clipboard so good values can be baked into `config.js`. Values persist
to `localStorage` (`neonGridDefense.tuning`).

It is gated by `if (import.meta.env.DEV)` with a **dynamic** `import('./admin.js')`, so Vite
strips `admin.js` entirely from production builds — players never load it. To add a knob:
add a default to `tuning.js`, apply it at the relevant chokepoint in `main.js`, and add a
row to `SLIDERS` in `admin.js`.

## Conventions

- All coordinates in game logic are in **grid units** (tiles); convert to pixels only at draw time via `cx()`/`cy()` and `CS` (cell size in px).
- Code style is terse and dense (short names, semicolon-packed lines, minimal whitespace). Match the surrounding style when editing — **do not reformat existing code** (there is no auto-formatter on purpose; a reflow would bury real diffs).
- Entities are plain objects in arrays on `G` (`enemies`, `projs`, `fx`, `parts`, `texts`); towers live in a `Map` keyed by `"col,row"`. Dead/expired entries are flagged then filtered out each tick.
- Persisted shape is versioned via the save key. If you change the `meta` structure in a breaking way, bump `SAVE_KEY` (`neonGridDefense.v1`) so old saves don't corrupt; otherwise rely on the `Object.assign` merge with defaults in `save.js`.

## Common tasks

- **Tweak balance**: edit `TOWERS`/`ENEMIES`/`SHOP` in `config.js`, or the wave logic in `waveSpawns`/`hpMul` (`main.js`).
- **Add a turret**: add an entry to `TOWERS` (`config.js`), a firing branch in `fireTower()`, and a drawing branch in `drawTower()` (`main.js`). Add to `SHOP` if it should be lockable.
- **Add an enemy**: add to `ENEMIES` (`config.js`), reference it in `waveSpawns`, and add a drawing branch in `drawEnemy()`.
- **Add a sound**: add a `case` in `sfx()` (`audio.js`).

## Verifying changes

- `npm test` covers the pure logic (path math, wave/scaling, damage, save merge).
- The rest (rendering, input, FX) isn't unit-tested — verify by running `npm run dev` and playing: check the affected turret/enemy/wave behaves, the HUD updates, and the browser console is clean.
