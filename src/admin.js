/* ============ DEV ADMIN OVERLAY ============ */
/* Live balance-tuning panel. Dev-only: main.js imports this dynamically behind
   import.meta.env.DEV, so it is tree-shaken out of production builds. Toggle with
   the backtick (`) key. Sliders write the shared `tuning` object (read live by the
   game); debug actions call back into the game through the `api` passed to initAdmin. */

import { tuning, saveTuning, resetTuning } from './tuning.js';

// label, key, min, max, step
const SLIDERS = [
  ['Enemy HP',      'enemyHp',     0.25, 8,   0.05],
  ['Enemy speed',   'enemySpeed',  0.25, 4,   0.05],
  ['Enemy count',   'enemyCount',  0.25, 6,   0.05],
  ['Tower damage',  'towerDmg',    0.1,  8,   0.05],
  ['Tower rate',    'towerRate',   0.25, 5,   0.05],
  ['Tower range',   'towerRange',  0.5,  3,   0.05],
  ['Economy',       'economy',     0.25, 8,   0.05],
  ['Game speed',    'gameSpeed',   0.25, 4,   0.05],
];

// Copy text to clipboard. Tries the async Clipboard API, then falls back to a
// hidden textarea + execCommand (works when the Clipboard API is blocked, e.g.
// NotAllowedError). Returns whether the copy succeeded.
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

export function initAdmin(api) {
  const root = document.createElement('div');
  root.id = 'admin';
  root.hidden = true;

  const refreshers = [];
  const h = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

  root.appendChild(h(`<div class="admin-title">⚙ BALANCE <span class="admin-hint">\` to toggle</span></div>`));

  // --- sliders ---
  for (const [label, key, min, max, step] of SLIDERS) {
    const row = document.createElement('div');
    row.className = 'admin-row';
    const out = document.createElement('span');
    out.className = 'admin-val';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min; input.max = max; input.step = step;
    const sync = () => { input.value = tuning[key]; out.textContent = (+tuning[key]).toFixed(2) + '×'; };
    input.addEventListener('input', () => {
      tuning[key] = parseFloat(input.value);
      out.textContent = tuning[key].toFixed(2) + '×';
      saveTuning();
    });
    row.appendChild(h(`<label>${label}</label>`).firstChild);
    row.appendChild(input);
    row.appendChild(out);
    root.appendChild(row);
    refreshers.push(sync);
    sync();
  }

  // --- invincible core toggle ---
  const invRow = document.createElement('div');
  invRow.className = 'admin-row admin-toggle';
  const invBtn = document.createElement('button');
  const syncInv = () => {
    invBtn.textContent = 'INVINCIBLE CORE: ' + (tuning.coreInvincible ? 'ON' : 'OFF');
    invBtn.classList.toggle('on', tuning.coreInvincible);
  };
  invBtn.addEventListener('click', () => { tuning.coreInvincible = !tuning.coreInvincible; saveTuning(); syncInv(); });
  invRow.appendChild(invBtn);
  root.appendChild(invRow);
  refreshers.push(syncInv);
  syncInv();

  // --- debug actions ---
  const actions = document.createElement('div');
  actions.className = 'admin-actions';

  const mkBtn = (text, fn) => { const b = document.createElement('button'); b.textContent = text; b.addEventListener('click', fn); return b; };

  // jump to wave: number input + go
  const waveWrap = document.createElement('div');
  waveWrap.className = 'admin-row';
  const waveInput = document.createElement('input');
  waveInput.type = 'number'; waveInput.min = 1; waveInput.value = 8; waveInput.className = 'admin-num';
  waveWrap.appendChild(h(`<label>Jump to wave</label>`).firstChild);
  waveWrap.appendChild(waveInput);
  waveWrap.appendChild(mkBtn('GO', () => api.jumpToWave(Math.max(1, parseInt(waveInput.value, 10) || 1))));
  root.appendChild(waveWrap);

  actions.appendChild(mkBtn('+1000 ◈', () => api.addCredits(1000)));
  actions.appendChild(mkBtn('KILL ALL', () => api.killAll()));
  actions.appendChild(mkBtn('RESET', () => { resetTuning(); refreshers.forEach((f) => f()); }));
  actions.appendChild(mkBtn('COPY', async (e) => {
    const json = JSON.stringify(tuning, null, 2);
    const ok = await copyText(json);
    e.target.textContent = ok ? 'COPIED' : 'COPY FAILED';
    setTimeout(() => (e.target.textContent = 'COPY'), 1200);
    if (!ok) window.prompt('Copy the tuning JSON manually:', json);
  }));
  root.appendChild(actions);

  document.body.appendChild(root);

  window.addEventListener('keydown', (ev) => {
    // backtick toggles; ignore when typing in the wave field
    if (ev.key === '`') { root.hidden = !root.hidden; if (!root.hidden) refreshers.forEach((f) => f()); }
  });

  console.info('[admin] balance overlay ready — press ` to toggle');
}
