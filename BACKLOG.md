# NEON GRID DEFENSE — Master Backlog

## Context

The game is a working Vite + vanilla-JS mobile tower defense (portrait, canvas, neon
vector art). Balance was recently folded into `config.js`; a dev tuning overlay exists.
This document is the comprehensive execution backlog covering: (A) code architecture,
(B) playability/UX, (C) graphics & feel, (D) levels, (E) Android / Google Play
deployment, (F) infra & misc. **Nothing here is being executed now** — this file is the
plan of record to execute task-by-task later.

Design constraints that shaped the tasks:
- Each task is one sitting, independently verifiable, and written so a less-capable
  model can execute it without extra context.
- No frameworks, no formatter, no TypeScript migration — the terse vanilla style is
  intentional (see CLAUDE.md).
- Architecture tasks (A) come first because levels (D) and several UX tasks get easier
  after extraction — but every B/C task is written to be executable *before or after*
  the A tasks (they reference section/function names, not line numbers).

## Execution protocol (read before every task)

1. Read `CLAUDE.md` first. Key rules: grid-unit coordinates (pixels only at draw time
   via `cx()`/`cy()`/`CS`); match the terse dense style; **never reformat existing
   code**; entities are plain objects in arrays/Maps on `G`.
2. Baseline check before changing anything: `npm test` (all green) and `npm run dev`
   → play ~2 waves at http://localhost:5173 with a clean browser console.
3. Do exactly one task. If a task says "move code verbatim", copy bodies without
   rewriting them.
4. Done-when criteria are listed per task. Always also: `npm test` green,
   `npm run build` succeeds, game plays 2+ waves in dev with clean console.
5. Commit per task: short imperative subject, body says which backlog ID it closes.
6. If a task references a function, find it by name — line numbers drift.

Current file map (for orientation): `src/main.js` (~830 lines: layout, state, waves,
combat, fx, update, render, HUD/UI, flow, loop — one IIFE), `src/config.js` (TOWERS /
ENEMIES / SHOP / SPAWN_COUNT_SCALE / GAME_SPEED), `src/path.js` (grid + waypoints +
`posAt`/`dirAt`), `src/save.js` (meta + localStorage `neonGridDefense.v1`),
`src/audio.js` (WebAudio sfx + `buzz`), `src/tuning.js` + `src/admin.js` (dev overlay),
`src/util.js`, `tests/*.test.js` (config, path, save, tuning, util).

---

# A. Architecture & tooling (Phase 3 extraction)

Goal: break the `main.js` IIFE into modules with an explicit dependency DAG, so levels
and future features have seams. **Do A-tasks in order** — each leaves the game fully
working. The target DAG (imports point downward only; no cycles):

```
util, config, path, save, audio, tuning     (existing leaves)
state.js      → util, config, save, tuning
layout.js     → util, path
fx.js         → state, layout, util
hud.js        → state, util
waves.js      → config, state, audio, fx, hud, tuning
combat.js     → config, state, path, audio, fx, hud, layout, tuning
render.js     → state, config, path, layout, util
ui.js         → state, waves, hud, fx, audio, save, config
main.js       → everything (bootstrap, update(), loop, gameOver wiring)
```

Cycle-avoidance rules baked into the tasks: `gameOver()` stays in ui.js and is NOT
called from `leak()` (A6 moves that check into `update()`); `banner`/`toast` live in
fx.js (not ui.js) so waves/combat can use them.

### A1. Create `src/state.js` — shared run state object
**Size:** M · **Deps:** none
**Files:** new `src/state.js`, `src/main.js`, `CLAUDE.md`
**Context:** `main.js` holds `let state, paused, speed, G` in closure. Modules can't
share `let` bindings cleanly, so wrap them in one exported mutable object.
**Steps:**
1. Create `src/state.js` exporting:
   ```js
   export const S={state:'menu',paused:false,speed:1,G:null};
   ```
   Move `newGame()` (currently in main.js GAME STATE section) into it verbatim, but
   have it assign `S.G={...}` instead of `G={...}`. Move `dmgMul` and `salvMul` here
   too (they read `meta` + `tuning` — import from `./save.js` and `./tuning.js`).
2. In `main.js`: delete the moved code, `import {S,newGame,dmgMul,salvMul} from './state.js'`.
3. Replace every standalone identifier `G` with `S.G`, `state` with `S.state`,
   `paused` with `S.paused`, `speed` with `S.speed` throughout main.js. Careful:
   only whole identifiers (`G.enemies` → `S.G.enemies`; do NOT touch `GW`, `GH`,
   `bgCanvas`, or strings). The admin-overlay wiring at the bottom (`getG:()=>G`)
   becomes `getG:()=>S.G`.
4. Update the CLAUDE.md code-structure table with the new module.
**Done when:** full run works (menu → play → game over → retry), admin overlay
backtick panel still works in dev, tests green.

### A2. Extract `src/layout.js` — canvas, sizing, glow sprites, mesh, background
**Size:** M · **Deps:** A1
**Files:** new `src/layout.js`, `src/main.js`
**Steps:**
1. Move verbatim from main.js LAYOUT section: `cv`, `ctx`, `W,H,CS,OX,OY,DPR`,
   `resize()`, `cx`, `cy`, `stars`/`starsInit`, `bgCanvas`/`vigCanvas`/`buildBg`,
   `glowCache`/`glow`/`blitGlow`, `mesh`/`meshInit`/`meshImpulse`/`meshUpdate`, and
   the `window.addEventListener('resize',...)` line.
2. Because `W,H,CS,OX,OY,DPR` are reassigned in `resize()`, export them via a mutable
   object like S: `export const L={W:0,H:0,CS:40,OX:0,OY:0,DPR:1};` and rewrite
   references inside layout.js (`CS` → `L.CS` etc.). Export `cv,ctx,cx,cy,resize,
   glow,blitGlow,meshImpulse,meshUpdate,stars,starsInit` and getters for
   `bgCanvas/vigCanvas/mesh` (simplest: export a `layer={bg:null,vig:null,mesh:[]}`
   object and use `layer.bg` internally).
3. main.js imports what it uses; replace bare `CS`/`W`/`H` etc. with `L.CS`/`L.W`...
   in the remaining main.js code (render still lives there until A7).
**Done when:** game renders identically (spot-check: grid ripples on kills, background
nebula visible, resize of the browser window doesn't break layout).

### A3. Extract `src/fx.js` — particles, shards, floating text, banner, toast
**Size:** S · **Deps:** A1, A2
**Files:** new `src/fx.js`, `src/main.js`
**Steps:** move verbatim `burst`, `shatter`, `addText`, `banner` (+`bannerT`), `toast`
(+`toastT`). They read `S.G` (import from state) and `$` (util). Export all five.
main.js imports them. Note banner/toast touch DOM ids `banner`/`toast` — that's fine
here; fx.js is allowed DOM access for these two.
**Done when:** kill particles, death shatter, "+N" floating credit text, wave banner,
and wave-clear toast all still appear.

### A4. Extract `src/hud.js` — `updateHUD` + `updateWaveBtn`
**Size:** S · **Deps:** A1
**Files:** new `src/hud.js`, `src/main.js`
**Steps:** move both functions verbatim; they read `S.G` and `$`. Export both.
Everything that calls them (combat kill/leak, waves, ui buttons, update loop) imports
from hud.js.
**Done when:** HUD numbers, streak display, and wave-button text all update as before.

### A5. Extract `src/waves.js` — wave generation & spawning
**Size:** M · **Deps:** A1, A3, A4
**Files:** new `src/waves.js`, `src/main.js`, new `tests/waves.test.js`
**Steps:**
1. Move verbatim: `waveSpawns`, `hpMul`, `startWave`, `spawnEnemy`.
2. **Fix the side-effect while moving** (this is the one permitted behavior change):
   `waveSpawns(n)` currently calls `sfx('boss')`+`banner(...)`+`buzz(80)` inside the
   generator. Delete those three calls from `waveSpawns` and put the boss branch in
   `startWave` instead: after `G.spawnQ=waveSpawns(G.wave)`, do
   `if(G.wave%8===0){sfx('boss');banner('⚠ BOSS INBOUND ⚠','#ff2255');buzz(80);}else{sfx('wave');banner('WAVE '+G.wave,'#22d8ff');}`
   (replacing the existing non-boss banner line).
3. Add `tests/waves.test.js`: `waveSpawns` is now pure — assert (a) wave 1 contains
   only drones; (b) wave 8 contains ≥1 boss; (c) spawn times are non-decreasing;
   (d) wave 10 contains shield type; (e) `hpMul(10) > hpMul(1)`.
**Done when:** new tests pass; boss banner still fires exactly once per boss wave.

### A6. Extract `src/combat.js` — targeting, damage, tower firing
**Size:** M · **Deps:** A1–A5
**Files:** new `src/combat.js`, `src/main.js`
**Steps:**
1. Move verbatim: `nearestEnemies`, `pickTarget`, `hurt`, `kill`, `leak`, `fireTower`.
2. **Break the leak→gameOver cycle:** delete the `if(G.health<=0)gameOver();` line at
   the end of `leak()`. In main.js `update()`, immediately after the enemies loop
   (after `G.enemies=G.enemies.filter(...)`), add
   `if(S.G.health<=0){gameOver();return;}` (gameOver still lives in main until A7).
3. Export all six functions.
**Done when:** all five turret types fire correctly (build each in a dev run), leaks
still damage the core, reaching 0 health still ends the run exactly once.

### A7. Extract `src/render.js` and `src/ui.js`; shrink main.js to bootstrap+loop
**Size:** M · **Deps:** A1–A6
**Files:** new `src/render.js`, new `src/ui.js`, `src/main.js`, `CLAUDE.md`
**Steps:**
1. render.js: move `glowStroke`, `render`, `drawTower`, `drawEnemy` verbatim. Imports
   from layout/state/config/path. Export `render`.
2. ui.js: move all HUD/UI listeners and flow: `show/hide/closeSheets`, `openBuild`,
   `buildTower`, `openTowerPanel`, the upg/prio/sell/wave/speed/pause/resume/abandon/
   start/tut/retry/menu/mute listeners, canvas `pointerdown` handler, `startRun`,
   `gameOver`, `toMenu`, `muteLabel`, `shopCost`, `renderShop`, shop listeners.
   Export `startRun`, `gameOver`, `toMenu` (main.js needs gameOver for the A6 health
   check and toMenu for boot).
3. main.js keeps: imports, `update()`, the loop, `visibilitychange`/`gesturestart`
   listeners, `resize();toMenu();requestAnimationFrame(loop);`, and the dev admin
   wiring. Should land under ~150 lines.
4. Update CLAUDE.md's structure table + delete the "Next extraction step" note.
**Done when:** full game loop identical; `npm run build` output size roughly unchanged;
admin overlay works; CLAUDE.md reflects reality.

### A8. Add ESLint (flat config, no formatter)
**Size:** S · **Deps:** none (nicer after A7)
**Files:** new `eslint.config.js`, `package.json`
**Steps:** `npm i -D eslint`; flat config with `languageOptions:{ecmaVersion:'latest',
sourceType:'module',globals:{...browser}}`; rules: `no-undef`, `no-unused-vars`
(args:none), `eqeqeq:['warn','smart']` only — the dense style must not be fought.
Add `"lint":"eslint src tests"` script; fix any real findings (unused vars, typos).
**Done when:** `npm run lint` exits 0; no stylistic churn in the diff.

### A9. GitHub Actions CI — test + build on push
**Size:** S · **Deps:** none
**Files:** new `.github/workflows/ci.yml`
**Steps:** single job: checkout, setup-node 20 with npm cache, `npm ci`,
`npm run lint --if-present`, `npm test`, `npm run build`. Trigger on push + PR to main.
**Done when:** workflow green on GitHub for the commit that adds it.

### A10. Economy/combat math unit tests
**Size:** S · **Deps:** A5, A6 (functions must be importable)
**Files:** new `tests/combat.test.js`
**Steps:** with `S.G` seeded via `newGame()`: (a) `hurt` drains shield before hp;
(b) `pickTarget` 'first' returns max `t`, 'strong' returns max hp+shield;
(c) kill streak math: after N kills `G.mult===Math.min(8,1+N*.1)`; (d) sell refund is
`floor(invested*.7)` (test the arithmetic used by the sell button, not the DOM).
Mock `sfx`/`buzz` via `vi.mock('../src/audio.js', ...)` so tests run headless (no
AudioContext / DOM canvas needed — if fx.js touches DOM ids in `kill`, also mock fx).
**Done when:** `npm test` green including the new file.

---

# B. Playability & UX

Independent of section A; each references functions by name.

### B1. Range preview before building (two-tap confirm)
**Size:** M · **Deps:** none
**Files:** `src/main.js` (`openBuild`, the card click handler, and the
"selected cell + range" block in `render`), `src/styles.css`
**Context:** Players currently pay before ever seeing a turret's range. First tap on a
card should preview; second tap on the same card builds.
**Steps:**
1. In `openBuild`, track `let armed=null` (tower key). In the card click handler:
   if `armed!==key` → set `armed=key`, store the preview on the run object
   (`G.preview={c,r,type:key}`), add CSS class `armed` to this card (remove from
   siblings), and update the card's cost line to `TAP TO CONFIRM`; else (second tap)
   → clear `G.preview`, proceed with the existing lock/credit checks and `buildTower`.
2. In `render`, next to the existing `G.selTower` dashed-range block, add: if
   `G.preview`, draw the same dashed circle using
   `TOWERS[G.preview.type].tiers[0].range` at the preview cell center, in the tower's
   color at `globalAlpha=.4`.
3. Clear `G.preview` in `closeSheets()`.
4. styles.css: `.card.armed{outline:2px solid currentColor;transform:scale(1.05)}`.
**Done when:** first tap shows ring + armed state, second tap builds, switching cards
re-previews, closing the sheet clears the ring, locked/broke behavior unchanged.

### B2. Live affordability refresh while sheets are open
**Size:** S · **Deps:** none
**Files:** `src/main.js` (`updateHUD`, `openBuild`, `openTowerPanel`)
**Context:** Cards' `broke` state and the UPGRADE button's `disabled` are computed once
at open; mid-wave income doesn't re-enable them.
**Steps:** in `updateHUD()` (already called on every credit change), add: if buildSheet
has class `show`, for each card toggle class `broke` from current `G.credits` (store
each card's cost via `el.dataset.cost` when building cards); if towerSheet is `show`
and `G.selTower` exists and `G.selTower.tier<2`, set
`$('upgBtn').disabled = G.credits < TOWERS[G.selTower.type].up[G.selTower.tier]`.
**Done when:** with the sheet open during a wave, a card/button flips from disabled to
enabled the moment a bounty pushes credits over its cost.

### B3. Pulse bolts retarget when their target dies
**Size:** S · **Deps:** none
**Files:** `src/main.js` (bolt branch of the projectile loop in `update()`)
**Context:** Bolts whose target died fly off-screen — silent DPS loss for PULSE.
**Steps:** in the bolt branch, when `p.tgt` is dead/absent, instead of flying straight:
find the nearest living enemy within 1.5 grid units of the bolt (reuse
`nearestEnemies(p.x,p.y,1.5)`, take min `d`); if found assign `p.tgt=that.e`; else keep
current behavior. Guard so it runs at most every frame it lacks a target (cheap enough).
**Done when:** in a dense wave, watch PULSE kill a drone — the in-flight bolt visibly
curves to a neighbor instead of exiting the map.

### B4. Boss HP bar
**Size:** S · **Deps:** none
**Files:** `src/main.js` (`render`), `src/styles.css` + `index.html` (only if DOM route)
**Steps:** canvas route (preferred, no DOM): in `render()` after the fx pass, find
`const boss=G.enemies.find(e=>e.type==='boss')`; if present draw a bar centered under
the HUD: dark backing rect (width `W*.7`, height 6, at `y≈92`), fill
`#ff2255` proportional to `(boss.hp+boss.shield)/(boss.maxHp+(boss.shieldMax||0))`,
label `BOSS` in the floating-text font, size 10, above it. Multiple bosses: draw the
lowest-progress one (or first found — keep simple).
**Done when:** wave 8 shows a large draining bar; it vanishes when the boss dies.

### B5. Next-wave preview during countdown
**Size:** M · **Deps:** A5 recommended (pure `waveSpawns`) — if done before A5, first
move the boss sfx/banner out of `waveSpawns` exactly as described in A5 step 2.
**Files:** `src/main.js` (`updateWaveBtn` or a small DOM line), `index.html`, `src/styles.css`
**Steps:**
1. Add `<div id="wavePreview"></div>` above the bottom bar in index.html; style: small
   centered row, Orbitron 11px, letter-spacing 2px, pointer-events none.
2. When a wave ends (the wave-end block in `update()`), compute
   `const next=waveSpawns(G.wave+1)`, reduce to unique types in spawn order, and set
   `wavePreview.innerHTML` to colored glyphs+counts, e.g.
   `<span style="color:#ff6bd6">⬡×12</span>` per type (type→glyph map:
   drone ⬡, dart ➤, swarm ✳, tank ⬢, shield ◆, boss ★; colors from `ENEMIES`).
   **Important:** call `waveSpawns` once and cache on `G.nextPreview` — it must not run
   every frame (it builds arrays), and after A5 it must stay side-effect-free.
3. Clear/hide the element in `startWave()` and `startRun()`.
**Done when:** during every countdown the inbound composition is visible and correct
(verify wave 7→8 shows ★), and it disappears once the wave starts.

### B6. Fold `GAME_SPEED` 1.1 → 1.0 (roadmap note)
**Size:** S · **Deps:** none
**Files:** `src/config.js`, `ROADMAP.md`
**Context:** `GAME_SPEED=1.1` multiplies the 1×/2× button (1× is really 1.1×). The
ROADMAP prescribes folding it into per-entity numbers instead.
**Steps:** set `GAME_SPEED=1.0`. Compensate feel: multiply every `ENEMIES` `spd` by
1.1 (keep 3-decimal precision) and every tower tier `rate` by 1.1 (4-decimal). Note the
intentional differences vs the old behavior: countdowns, slow durations, shield regen,
and fx now run at true 1× (that's the point). Update the two explanatory comments in
config.js and delete the ROADMAP "Notes / open questions" entry.
**Done when:** `tests/config.test.js` green; a dev-run wave feels the same pace;
button 2× is now exactly 2×.

### B7. "NEW BEST" callout on game over
**Size:** S · **Deps:** none
**Files:** `src/main.js` (`gameOver`), `index.html`
**Steps:** in `gameOver()`, before `meta.bestWave`/`bestScore` are overwritten, compute
`const newBest=G.wave>meta.bestWave||G.score>meta.bestScore`. Add a hidden
`<div id="ovBest">★ NEW BEST ★</div>` to the game-over overlay (gold, Orbitron,
text-shadow glow); toggle its visibility from `newBest`. Also play `sfx('upgrade')`
when true.
**Done when:** beating your best shows the callout; an average run doesn't.

### B8. Tidy stat display in tower panel
**Size:** S · **Deps:** none
**Files:** `src/main.js` (`openTowerPanel`)
**Context:** post-folding numbers print as `RATE 2.72/s`, `DMG 4.9` rounds oddly.
**Steps:** format with one decimal max: `(+st.rate).toFixed(st.rate<10?1:0)` pattern
for rate/range; dmg via `Math.round` (already). Apply to the NEXT line too. Show DPS
instead of leaving players to multiply: append `· DPS ${Math.round(st.dmg*dmgMul()*st.rate)}`.
**Done when:** panel reads e.g. `DMG 5 · RATE 2.7/s · RANGE 2.3 · DPS 13`.

### B9. Third targeting mode: LAST (catch leakers)
**Size:** S · **Deps:** none
**Files:** `src/main.js` (`pickTarget`, `prioBtn` handler)
**Steps:** extend `pickTarget` with `prio==='last'` → min `e.t`. Cycle the button
first→strong→last→first. Button label already derives from `tw.prio`.
**Done when:** a LANCE set to LAST visibly snipes the rearmost enemy.

### B10. Balance pass with the admin overlay
**Size:** M · **Deps:** best after B3/B6 (they shift effective difficulty)
**Files:** `src/config.js` only (numbers), notes in commit message
**Context:** target: a first-time player dies waves 6–10; an invested meta build
reaches waves 20–30. Use the backtick overlay + jump-to-wave + COPY to find numbers.
**Steps:** playtest at waves 1/8/12/16/20/24 with representative builds (pulse+nova
budget build; cryo+lance tech build). Adjust only `config.js` values (tower dmg/rate,
enemy hp, `SPAWN_COUNT_SCALE`, `hpMul` coefficients if needed — that one lives in
waves code; prefer config knobs first). Bake results; overlay ships neutral.
**Done when:** documented before/after numbers in the commit; both reference builds hit
the target bands.

### B11. Contextual first-run hints (replace static tutorial reliance)
**Size:** M · **Deps:** none
**Files:** `src/main.js`, `src/save.js` (extend `meta` — additive key, no SAVE_KEY bump)
**Steps:** add `meta.hints={build:false,upgrade:false,early:false}` default (additive
merge in save.js already handles missing keys — mirror the nested-spread pattern used
for `up`/`unlocked`). Using the existing `toast()`: on first run start and until a
tower is built, pulse-toast "TAP A TILE TO BUILD" every ~6s; after first wave clear if
`!hints.upgrade` toast "TAP A TURRET TO UPGRADE"; when countdown first shows a bonus
and `!hints.early` toast "CALL EARLY FOR BONUS CREDITS". Set+save each flag when its
action first happens.
**Done when:** wiping localStorage and playing shows each hint exactly once, at the
right moment; existing saves see none.

### B12. Keep 2× speed across waves, reset only per run
**Size:** S · **Deps:** none
**Files:** `src/main.js`
**Context:** verify current behavior first — speed currently resets only in
`startRun()` which is correct; the actual gap is that speed silently persists into a
*new run's* menu label. Confirm `startRun` sets both `speed=1` and the button label
(it does). If confirmed correct, instead make the button also show on the wave button
row during countdown… **If nothing is actually wrong, close this task as no-op.**
**Done when:** behavior audited; either fixed or explicitly closed.

---

# C. Graphics & feel

### C1. Cache enemy positions once per tick (perf enabler)
**Size:** S · **Deps:** none
**Files:** `src/main.js` (`update` enemy loop, `nearestEnemies`, `drawEnemy`)
**Context:** `posAt(e.t)` walks the 9-segment path; it's called per-enemy per-tower per
frame in `nearestEnemies` plus twice more in movement/draw. Cache it.
**Steps:** in the enemy movement loop, after `e.t+=...`, store `e.px,e.py` (the
`posAt` result already computed there for trails — reuse it). Change `nearestEnemies`
to use `e.px,e.py` instead of calling `posAt`; same in `drawEnemy` (keep its `dirAt`
call). Nova lead prediction and leak fx keep their own `posAt` calls (different `t`).
**Done when:** wave 20+ with many towers stays smooth; behavior visually identical.

### C2. Pre-render the static path river to an offscreen canvas
**Size:** M · **Deps:** A2 helpful (layout module) but not required
**Files:** `src/main.js` (or `src/layout.js` + `src/render.js` post-A7)
**Context:** the path is 3 full-width polyline strokes every frame; only the dashes/
chevrons animate. Bake the static strokes.
**Steps:** in `buildBg()` (or a sibling `buildPath()` called from `resize`), draw the
three `lane()` strokes plus buildable-cell dots into a new offscreen canvas sized W×H;
in `render()` replace those strokes with one `drawImage`. Keep the animated dash pass
and chevrons live. Note the offscreen must be redrawn on resize (it depends on CS/OX/OY).
**Done when:** identical look, fewer per-frame path ops (verify via devtools
performance recording before/after on a throttled CPU).

### C3. Enemy hit-flash
**Size:** S · **Deps:** none
**Files:** `src/main.js` (`hurt`, `drawEnemy`)
**Steps:** in `hurt()`, set `e.hitT=G.time`. In `drawEnemy`, if `G.time-e.hitT<.08`,
draw the body pass with `strokeStyle='#fff'` (the `dual()` helper already takes the
current strokeStyle — set it before calling) and skip the slowed-color override for
that window.
**Done when:** enemies visibly blink white on each hit without changing damage timing.

### C4. Multiplier milestone celebration
**Size:** S · **Deps:** none
**Files:** `src/main.js` (`kill`)
**Steps:** after the mult update in `kill()`, if `G.mult` just crossed 2/4/6/8
(compare against pre-kill value), call `banner('×'+G.mult.toFixed(0)+' MULTIPLIER','#ffe93c')`,
`sfx('cash')`, and `meshImpulse(x,y,160)`. Track crossing with
`const before=G.mult` at function top.
**Done when:** streaking past each threshold produces one banner, never spamming.

### C5. Boss kill slow-mo beat
**Size:** S · **Deps:** none
**Files:** `src/main.js` (`kill` boss branch, `loop`)
**Steps:** add `let slowmoT=0` near the loop state; boss kill sets `slowmoT=.9`
(seconds, wall-clock). In `loop()`, before `update`, if `slowmoT>0`:
`slowmoT-=dt; dt*=.35;`. Keep `render()` unaffected (fx still animate — they run on
scaled dt; that's the effect).
**Done when:** boss deaths hit a ~1s dramatic slow-motion then snap back; pausing
during slow-mo doesn't get stuck (slowmoT decrements only inside the play branch).

### C6. Reactor damage states
**Size:** S · **Deps:** none
**Files:** `src/main.js` (`render` base-reactor block)
**Steps:** derive `const hurtRatio=1-clamp(G.health/(10+meta.up.hp*2),0,1)`; lerp the
reactor glow color from `#22d8ff` toward `#ff2255` as hurtRatio rises (precompute 2–3
banded colors rather than per-frame lerp strings: `hurtRatio>.66?red:>.33?amber:cyan`);
add flicker (`globalAlpha*=.8+.2*Math.sin(t*20)`) in the worst band.
**Done when:** the reactor reads healthy/worried/critical at a glance.

### C7. Low-FX mode toggle
**Size:** M · **Deps:** none
**Files:** `src/main.js` (pause overlay + render/fx gates), `index.html`, `src/save.js`
**Context:** older Androids will choke on trails+mesh+glow. One switch, few gates.
**Steps:** add `meta.lowFx=false` (additive). Button in pause overlay + menu ("FX:
FULL/LITE") mirroring the mute-button pattern. Gate when true: skip enemy trails, skip
mesh glow second pass (keep base grid), halve `burst` counts, skip `blitGlow` halos on
towers/enemies (keep projectile glow), skip starfield twinkle math (static alpha .2).
Keep gameplay-relevant fx (range rings, beams, arcs, explosions).
**Done when:** toggling mid-run visibly simplifies rendering; setting persists.

### C8. App icon + splash artwork (source-of-truth SVG)
**Size:** M · **Deps:** none (prerequisite for D-tasks and PWA)
**Files:** new `art/icon.svg`, new `scripts/icons.mjs`, `package.json`,
outputs in `public/icons/`
**Steps:**
1. Author `art/icon.svg` (512×512): dark `#04060c` rounded square, centered cyan
   neon diamond reactor with white core + pink outer ring — reuse exact colors from
   styles (`#22d8ff`, `#ff2e88`); keep ≥15% padding for maskable safety.
2. `npm i -D sharp`; `scripts/icons.mjs` renders PNGs: 48,72,96,144,192,512 into
   `public/icons/icon-{size}.png` plus `icon-512-maskable.png` (same art, solid bg).
   Add `"icons":"node scripts/icons.mjs"` script.
3. Splash for later Android use: also render 1080×1920 `public/icons/splash.png`
   (icon centered on the dark bg).
**Done when:** `npm run icons` produces all files; 512 icon looks crisp on dark & light.

---

# D. Levels (multiple maps)

Do these in order, after section A (they lean on the extracted modules; if done
pre-extraction, substitute main.js for the named modules).

### D1. Parametrize the path — `makePath(def)`
**Size:** M · **Deps:** A-section done (or adapt to main.js)
**Files:** `src/path.js`, `tests/path.test.js`, all importers of path exports
**Steps:**
1. Rework path.js: `export function makePath({wp,pathInt,base})` returning
   `{WP,pathCells,BASE,segLen,totalLen,posAt,dirAt}` — move the current module-level
   computation inside verbatim. Keep `GW,GH` as module consts.
2. Export `export const P={...makePath(DEFAULT_DEF)}` as the live path object, plus
   `export function setPath(def){Object.assign(P,makePath(def));}`. All consumers
   switch from named imports (`posAt(...)`) to `P.posAt(...)` etc. (mechanical
   find/replace; the identifiers are unique).
3. Keep the current layout as `DEFAULT_DEF` exported for tests; update
   `tests/path.test.js` to exercise `makePath(DEFAULT_DEF)` and add a second toy def
   (straight 3-cell path) asserting totalLen/pathCells for it.
**Done when:** game identical on the default path; tests cover both defs.

### D2. Define 3 levels + config plumbing
**Size:** M · **Deps:** D1
**Files:** new `src/levels.js`, `src/state.js`, `src/save.js`
**Steps:**
1. `src/levels.js`: `export const LEVELS=[{id:'grid',name:'THE GRID',def:DEFAULT_DEF,
   mods:{}},{id:'spiral',...},{id:'gauntlet',...}]`. Design two new 9×14 layouts on
   paper first: SPIRAL (path coils inward, base center) and GAUNTLET (two long
   straights, short flanks — rewards LANCE). Each def: `wp` float centers, `pathInt`
   integer cells, `base`. Validate: every wp pair differs in exactly one axis (the
   cell-marking walk assumes rectilinear segments).
   `mods` optional per-level multipliers `{hp:1,count:1,bounty:1}` — apply `hp`/`count`
   inside `spawnEnemy`/`waveSpawns` via `S.level.mods` with default 1, `bounty` in `kill`.
2. `state.js`: add `S.level=LEVELS[0]`. `startRun` calls `setPath(S.level.def)` before
   `newGame()` (also call `layout` rebuild if the bg pre-render bakes path — see C2).
3. `save.js`: `meta.levels={grid:{bestWave:0,bestScore:0}}` additive; `gameOver`
   writes per-level bests alongside the global ones.
**Done when:** hardcoding `S.level=LEVELS[1]` starts a run on the spiral map with
correct pathing, enemies, and no rendering artifacts.

### D3. Level-select UI
**Size:** M · **Deps:** D2
**Files:** `index.html`, `src/styles.css`, `src/ui.js` (or main.js)
**Steps:** new overlay `#levelOv` styled like the shop: one card per level (name,
mini-thumbnail, per-level best wave, LOCKED badge). START RUN now opens level select
(with the previous level preselected); a level card tap sets `S.level` and calls the
tutorial-or-startRun logic currently in the startBtn handler. Locking rule: level N+1
unlocks at `meta.levels[N].bestWave>=8` — show "REACH WAVE 8 ON <prev>" on locked
cards. Mini-thumbnail: 60×90 canvas per card, stroke the level's `wp` polyline scaled
into it (10 lines of code, reuse nothing fancy).
**Done when:** fresh save: only THE GRID playable; clearing wave 8 unlocks SPIRAL;
bests display per level.

---

# E. Android / Google Play (Capacitor route)

Decision: **Capacitor**, not TWA — no hosting requirement, works fully offline,
gives native haptics/back-button, and the web build ships inside the AAB.
(TWA/Bubblewrap would require hosting the PWA on HTTPS + asset-links; keep as
fallback only.) Do E-tasks in order. E1–E2 are pure-web and valuable regardless.

### E1. PWA manifest + meta
**Size:** S · **Deps:** C8 (icons)
**Files:** new `public/manifest.webmanifest`, `index.html`
**Steps:** manifest: name "Neon Grid Defense", short_name "NeonGrid",
`display:standalone`, `orientation:portrait`, `background_color/theme_color:#04060c`,
icons 192/512 + maskable 512 from `public/icons/`. Link it in index.html `<head>`;
keep existing apple-mobile-web-app metas.
**Done when:** Chrome DevTools → Application → Manifest shows no warnings;
"Add to home screen" installs with correct icon and opens fullscreen portrait.

### E2. Offline support via vite-plugin-pwa
**Size:** S · **Deps:** E1
**Files:** `vite.config.js`, `package.json`
**Steps:** `npm i -D vite-plugin-pwa`; register with `registerType:'autoUpdate'`,
precache `**/*.{js,css,html,png,svg,woff2}`; the Orbitron Google-Fonts request needs a
runtime caching rule (`CacheFirst`, cacheName 'fonts', 1y expiry) or — simpler and
more robust offline — self-host the font: download the woff2, add `@font-face` in
styles.css, drop the Google Fonts `<link>`. Prefer self-hosting.
**Done when:** `npm run build && npm run preview`, load once, kill the network,
reload — game fully playable offline with correct font.

### E3. Add Capacitor + Android platform
**Size:** M · **Deps:** E1 (icons/manifest), machine needs Android Studio + JDK 17
**Files:** `capacitor.config.ts` (new), `android/` (generated), `package.json`, `.gitignore`
**Steps:**
1. `npm i @capacitor/core && npm i -D @capacitor/cli && npm i @capacitor/android`
2. `npx cap init "Neon Grid Defense" com.kverde.neongrid --web-dir dist`
3. `npm run build && npx cap add android && npx cap sync`
4. Add scripts: `"android:sync":"npm run build && cap sync android"`,
   `"android:open":"cap open android"`. Commit the `android/` dir (standard Capacitor
   practice) but gitignore `android/app/build/`, `android/.gradle/`, `*.keystore`.
5. Run on emulator via Android Studio; verify touch, audio (starts after first tap —
   expected), and localStorage persistence across app restarts.
**Done when:** the game runs in the Android emulator from a clean checkout following
README steps.

### E4. Android polish: orientation lock, immersive mode, back button, haptics
**Size:** M · **Deps:** E3
**Files:** `android/app/src/main/AndroidManifest.xml`, `MainActivity.java` or styles,
`src/main.js`/`src/ui.js`, `package.json`
**Steps:**
1. Manifest activity: `android:screenOrientation="portrait"`.
2. Immersive/edge-to-edge: in the activity theme set translucent system bars, or add
   `@capacitor/status-bar` and call `StatusBar.hide()` on app start (guard with
   dynamic import + `Capacitor.isNativePlatform()` check so web build unaffected).
3. Back button: `npm i @capacitor/app`; listener: if a sheet/overlay is open → close
   it; else if playing → open pause; else if in submenu → toMenu; else →
   `App.exitApp()`. Register only on native platform.
4. Haptics: `npm i @capacitor/haptics`; in `audio.js` `buzz()`, if native use
   `Haptics.impact({style})` mapping ms<30→Light, <80→Medium, else Heavy (dynamic
   import, cached); web keeps `navigator.vibrate`.
**Done when:** on device: no status bar, portrait locked, back button steps sanely
through UI instead of killing the app, kills thump.

### E5. Release signing + AAB build
**Size:** M · **Deps:** E3
**Files:** `android/app/build.gradle`, `android/keystore.properties` (gitignored),
`README.md`
**Steps:**
1. `keytool -genkey -v -keystore upload.keystore -alias neongrid -keyalg RSA
   -keysize 2048 -validity 10000` — store OUTSIDE the repo; document the location and
   backup requirement in README (losing it ≠ fatal with Play App Signing, but
   document enrolling in Play App Signing as the safety net).
2. `keystore.properties` (path/alias/passwords) + `signingConfigs.release` and
   `buildTypes.release` wiring in build.gradle (standard Android snippet).
3. Set `versionCode 1`, `versionName "1.0.0"`; document the bump procedure (one line:
   increment versionCode every upload).
4. Build: `cd android && ./gradlew bundleRelease` → AAB at
   `android/app/build/outputs/bundle/release/`.
**Done when:** `bundleRelease` produces a signed AAB; `bundletool` or Studio installs
it on a device and it runs.

### E6. Play Console listing prep (content, no code)
**Size:** M · **Deps:** E5 for the AAB; C8 for art
**Files:** new `store/` dir in repo (listing text + assets), plus external Play Console
**Steps:**
1. One-time: Google Play developer account ($25). Create app: Game > Arcade, free.
2. Assets into `store/`: icon 512 (from C8), feature graphic 1024×500 (compose from a
   gameplay screenshot + logo), ≥4 portrait phone screenshots 1080×1920 (menu, early
   wave, boss wave, upgrade lab — capture via `adb exec-out screencap`).
3. Listing text in `store/listing.md`: title (≤30 chars) "Neon Grid Defense", short
   description (≤80), full description — draft included in the file, tone: arcade,
   no fake claims.
4. Privacy policy: game collects nothing; still mandatory. Add `store/privacy.md`
   ("no data collected, all progress stored locally") and publish it via GitHub Pages;
   paste URL into Console.
5. Forms: content rating questionnaire (no violence against realistic humans → Everyone),
   Data safety ("no data collected"), target audience 13+ (avoids Families policy),
   ads declaration: none.
**Done when:** all Console sections show green checkmarks except release.

### E7. Internal testing → production rollout
**Size:** S · **Deps:** E5, E6
**Steps:** upload AAB to Internal testing track, add own account as tester, install
via the opt-in link, play a full run on-device checking: cold start <3s, audio after
first tap, save survives force-close, back button behavior, no overdraw jank on boss
waves. Fix-or-file anything found, then promote to Production with staged rollout 100%
(tiny audience anyway).
**Done when:** app live on Play Store; store link added to README.

---

# F. Misc / infra

### F1. Player-facing README refresh
**Size:** S · **Deps:** none
**Steps:** restructure README: hero screenshot, one-paragraph pitch, how to play
(3 bullets), local dev quickstart, links to ROADMAP/CLAUDE/store (when live). Keep dev
details in CLAUDE.md — don't duplicate.
**Done when:** a stranger can understand and run the game from README alone.

### F2. FPS + entity-count readout in the admin overlay
**Size:** S · **Deps:** none
**Files:** `src/admin.js`, `src/main.js` (expose counts via the existing `initAdmin` API)
**Steps:** extend the `initAdmin` wiring object with `getStats:()=>({fps,enemies:
S.G?.enemies.length??0,projs:...,parts:...})`; main.js computes fps as an EMA of
1/dt in `loop()` (dev-only cost is negligible; still fine to compute always). admin.js
renders a one-line readout updated every 500ms.
**Done when:** backtick panel shows live fps/entity counts during heavy waves.

### F3. Save export/import (clipboard)
**Size:** S · **Deps:** none
**Files:** `src/main.js`/`ui.js` (pause overlay), `index.html`
**Context:** localStorage dies with browser data clears; phones swap. Cheapest
insurance before any cloud thought.
**Steps:** two buttons in the pause or menu overlay: EXPORT copies
`btoa(JSON.stringify(meta))` to clipboard (reuse the admin COPY fallback pattern —
`navigator.clipboard` with a `document.execCommand('copy')` textarea fallback and a
toast on success/failure); IMPORT opens a `prompt()` paste box, validates via
`JSON.parse(atob(s))` + presence of `cores` key, then Object.assigns through the same
nested-merge used in save.js load and calls `saveMeta()`+`toMenu()`.
**Done when:** export on browser A → import on browser B transfers cores/unlocks/bests;
malformed paste shows an error toast and changes nothing.

### F4. Self-host the Orbitron font (if not already done in E2)
**Size:** S · **Deps:** none (dedupe with E2 — do it once)
**Steps:** download Orbitron 500/700/900 woff2, place in `public/fonts/`, add
`@font-face` rules with `font-display:swap`, remove the Google Fonts `<link>` tags.
**Done when:** no fonts.googleapis.com requests in the network tab; glyphs identical.

---

## Suggested execution order

1. **Quick wins first (playable value, zero risk):** B3, B8, B7, B2, C3, C4 — six
   small tasks, immediately felt.
2. **Architecture:** A1→A7 in order, then A8–A10.
3. **UX/depth:** B1, B4, B5, B9, B6, then B10 (balance) and B11.
4. **Graphics/perf:** C1, C2, C5, C6, C7, C8.
5. **Levels:** D1→D3.
6. **Ship it:** F4/E1/E2 (PWA), E3→E7 (Play Store), F1–F3 anytime.

## Verification (global)

- `npm test` and `npm run build` after every task; play 2+ waves in `npm run dev`
  with a clean console.
- After A-section and before D: full manual regression — all 5 towers, sell/upgrade,
  boss wave 8, game over, retry, shop purchase, mute, pause, admin overlay.
- After E4: on-device pass (emulator minimum, real phone before E7).
