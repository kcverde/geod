# NEON GRID DEFENSE

A neon, synthwave-styled **tower defense** game built as a single, self-contained HTML file. Defend the reactor by building turrets along a fixed serpentine lane while waves of enemies push toward your core. Earn credits, upgrade turrets, and bank **Cores** between runs to permanently strengthen future attempts.

Designed mobile-first (touch input, safe-area insets, responsive canvas) but plays fine with a mouse in any modern browser.

## Play / develop

Built with [Vite](https://vitejs.dev/). With Node installed:

```sh
npm install      # first time only
npm run dev      # dev server with hot-reload → http://localhost:5173
```

For a production build:

```sh
npm run build    # outputs static files to dist/
npm run preview  # serve the built version locally
```

The only external resource is the **Orbitron** web font from Google Fonts; the game falls back to system fonts if that fails to load.

## How to play

- **Tap an empty tile** to open the build menu and place a turret.
- **Tap an existing turret** to upgrade it (3 tiers), change its targeting priority, or sell it (70% refund).
- Enemies follow the glowing lane — stop them before they reach the reactor.
- **Kills earn credits** (◈) to build and upgrade. Kill streaks raise your score multiplier (up to ×8).
- **Call waves early** with the deploy button for bonus credits.
- The reactor starts with 10 integrity; each leak costs integrity (bosses cost more). At 0, the run ends.

### Turrets

| Turret | Role | Notes |
| ------ | ---- | ----- |
| **PULSE** ▲ | Rapid single-target bolts | Cheap starter |
| **NOVA** ◆ | Splash mortar | Lobbed shell with AoE, leads moving targets |
| **CRYO** ✱ | Slow + chip damage | Hits everything in range, applies slow |
| **LANCE** ◈ | Piercing railgun | Long-range hitscan beam, pierces a line (unlock in lab) |
| **ARC** ϟ | Chain lightning | Jumps between nearby enemies (unlock in lab) |

### Enemies

Drones, darts, swarms, tanks, shielded units, and periodic **bosses** (every 8th wave). Enemy HP scales with wave number; shields regenerate if left alone.

### Meta progression (Upgrade Lab)

Each game-over awards **Cores** based on waves survived and score. Spend Cores in the **Upgrade Lab** for permanent boosts: reactor plating (more integrity), seed funding (more starting credits), overclock (more turret damage), salvage rig (more credit income), and to unlock the LANCE and ARC turrets.

## Saving

Progress (Cores, best wave, best score, upgrade levels, unlocks, mute, tutorial-seen flag) is stored in `localStorage` under the key `neonGridDefense.v1`. Clearing site data resets all meta progression.

## Project layout

```
index.html      thin shell (canvas + UI overlays)
src/
  main.js       bootstrap, game loop, update/render, UI wiring
  config.js     towers / enemies / shop data (balance knobs)
  path.js       grid + enemy-path math
  save.js       localStorage persistence
  audio.js      synthesized WebAudio SFX
  util.js       small shared helpers
  styles.css    all styling
```

See [CLAUDE.md](CLAUDE.md) for a fuller architecture overview aimed at contributors, and
[ROADMAP.md](ROADMAP.md) for project status and planned next steps.
