/* ============ RULES ============ */
/* Pure game-rule formulas — no DOM, no state imports, unit-testable.
   (#3 will move the other duplicated economy formulas here.) */
export const coresEarned=(wavesDone,score)=>wavesDone*2+Math.floor(score/4000);
