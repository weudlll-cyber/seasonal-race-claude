// ============================================================
// pursuit-sim-2.test.mjs — unit tests for proto-2 (lateral traffic). Standalone node assert.
// Run: node scripts/exp/pursuit-sim-2.test.mjs
// ============================================================

import assert from 'assert';
import { runRace, loadTrack } from './pursuit-sim-2.mjs';

let passed = 0;
const it = (name, fn) => { fn(); passed++; console.log(`  ok  ${name}`); };

// (1) THE HARD REQUIREMENT: no racer ever passes through another — zero overlap on both tracks, across
// seeds and across both the roomy (open) and tight (closed) track.
it('zero overlap violations across seeds on both tracks (no pass-through, ever)', () => {
  for (const id of ['luger-hill', 'searound']) {
    const track = loadTrack(id);
    for (let s = 0; s < 40; s++) {
      const r = runRace(track, 3000 + s, 1.0);
      assert.strictEqual(r.overlaps, 0, `${id} seed ${3000 + s}: ${r.overlaps} overlaps`);
    }
  }
});

// (2) determinism — same seed+track ⇒ identical race.
it('a race is deterministic from its seed', () => {
  const t = loadTrack('searound');
  const a = runRace(t, 5150, 1.0), b = runRace(t, 5150, 1.0);
  assert.strictEqual(a.winnerIdx, b.winnerIdx);
  assert.strictEqual(a.top3Spread, b.top3Spread);
  assert.strictEqual(a.overlaps, b.overlaps);
  assert.strictEqual(a.blockedFrac, b.blockedFrac);
});

// (3) traffic is real — on the tight track at least some racer-steps are genuinely blocked (a held
// delay, not a phase-through). If this were 0 while overlaps were 0, the model would be letting racers
// pass freely, which the win-distribution finding relies on being false.
it('the tight track produces genuine blocking (held delays, not phase-through)', () => {
  const t = loadTrack('searound');
  let anyBlocked = 0;
  for (let s = 0; s < 20; s++) anyBlocked += runRace(t, 6000 + s, 1.0).blockedFrac;
  assert.ok(anyBlocked > 0, 'expected some blocking on the narrow track');
});

console.log(`\n${passed} passed`);
