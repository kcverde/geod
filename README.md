# NEON GRID DEFENSE

A neon, synthwave-styled **tower defense** game built as a single, self-contained HTML file. Defend the reactor by building turrets along a fixed serpentine lane while waves of enemies push toward your core. Earn credits, upgrade turrets, and bank **Cores** between runs to permanently strengthen future attempts.

Designed mobile-first (touch input, safe-area insets, responsive canvas) but plays fine with a mouse in any modern browser.

## Play

There is no build step and no dependencies. Just open the file:

```sh
open index.html        # macOS
```

Or serve it locally (recommended so the Google Fonts / audio behave consistently):

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

The only external resource is the **Orbitron** web font from Google Fonts; the game works offline if that fails to load (it falls back to system fonts).

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

The entire game — markup, CSS, and JavaScript — lives in [index.html](index.html). See [CLAUDE.md](CLAUDE.md) for an architecture overview aimed at contributors.
