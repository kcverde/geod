# CLAUDE.md

Guidance for working in this repository.

## What this is

**NEON GRID DEFENSE** — a complete tower defense game contained entirely in a single file: [index.html](index.html) (~1100 lines). HTML markup, CSS, and JavaScript are all inline. There is **no build system, no package manager, no dependencies, and no tests**. The only external resource is the Orbitron web font from Google Fonts (with a system-font fallback).

## Running

Open `index.html` in a browser, or serve the directory (`python3 -m http.server 8000`). There is nothing to compile. Changes are seen by reloading the page.

## Code structure

Everything is inside one IIFE (`(()=>{ ... })()`) in the `<script>` tag at the bottom of `index.html`. The code is organized into clearly commented sections, in order:

- **META / SAVE** — `meta` object + `localStorage` persistence (key `neonGridDefense.v1`). Holds cross-run progression: cores, best scores, permanent upgrades (`meta.up`), and turret unlocks (`meta.unlocked`).
- **AUDIO** — WebAudio synthesized SFX. No audio files; `tone()`/`noise()` generate sounds, `sfx(name)` dispatches by name. Audio context is lazily created on first user interaction (`audioInit()`).
- **GRID & PATH** — `GW`×`GH` grid (9×14). The enemy path is defined by waypoints `WP`; `pathCells` marks non-buildable tiles. `posAt(t)`/`dirAt(t)` interpolate position/direction along the path by arc-length `t`.
- **DEFINITIONS** — data tables: `TOWERS` (5 types, each with 3 `tiers` and `up` upgrade costs), `ENEMIES` (6 types), `SHOP` (lab upgrades). These are the primary balance knobs.
- **LAYOUT** — canvas sizing/DPR handling (`resize`), coordinate helpers `cx()`/`cy()` (grid → pixels), pre-rendered background (`buildBg`), cached glow sprites (`glow`), parallax `stars`, and the warping `mesh` grid that ripples on explosions.
- **GAME STATE** — `state` ('menu' | 'play' | 'over'), `paused`, `speed`, and `G` (the per-run game object created by `newGame()`). When no run is active, `G` is `null` — most update/render code guards on this.
- **WAVES** — `waveSpawns(n)` builds the spawn schedule for wave `n` (bosses every 8th wave). `hpMul`/scaling functions tune difficulty. `startWave`, `spawnEnemy`.
- **COMBAT** — targeting (`nearestEnemies`, `pickTarget`), damage (`hurt`, `kill`, `leak`), and per-turret firing logic in `fireTower()` (one branch per turret type).
- **FX HELPERS** — particle/shard/banner/toast spawners.
- **UPDATE** — `update(dt)`: the simulation tick. Advances spawns, enemies, towers, projectiles, FX, and wave/countdown state.
- **RENDER** — `render()` plus `drawTower`/`drawEnemy`. Pure canvas 2D drawing; uses `globalCompositeOperation='lighter'` heavily for the neon glow look.
- **HUD / UI** — DOM overlays (sheets and `.ov` overlays) and their event listeners. `$(id)` is `getElementById`. `updateHUD`/`updateWaveBtn` sync DOM to game state.
- **FLOW** — `startRun`, `gameOver`, `toMenu`, plus menu/shop/pause button handlers.
- **LOOP** — `requestAnimationFrame` loop: `update(dt*speed)` when playing, then `render()` every frame. `dt` is clamped to 0.034s.

## Conventions

- All coordinates in game logic are in **grid units** (tiles); convert to pixels only at draw time via `cx()`/`cy()` and `CS` (cell size in px).
- Code style is terse and dense (short names, semicolon-packed lines, minimal whitespace). Match the surrounding style when editing — do not reformat existing code.
- Entities are plain objects in arrays on `G` (`enemies`, `projs`, `fx`, `parts`, `texts`); towers live in a `Map` keyed by `"col,row"`. Dead/expired entries are flagged then filtered out each tick.
- Persisted shape is versioned via the save key. If you change the `meta` structure in a breaking way, bump `SAVE_KEY` (`neonGridDefense.v1`) so old saves don't corrupt; otherwise rely on the `Object.assign` merge with defaults.

## Common tasks

- **Tweak balance**: edit `TOWERS`, `ENEMIES`, `SHOP`, or the wave logic in `waveSpawns`/`hpMul`.
- **Add a turret**: add an entry to `TOWERS`, a firing branch in `fireTower()`, and a drawing branch in `drawTower()`. Add to `SHOP` if it should be lockable.
- **Add an enemy**: add to `ENEMIES`, reference it in `waveSpawns`, and add a drawing branch in `drawEnemy()`.
- **Add a sound**: add a `case` in `sfx()`.

## Verifying changes

There is no test suite. Verify by opening the page and playing: check the affected turret/enemy/wave behaves, the HUD updates, and the browser console is clean.
