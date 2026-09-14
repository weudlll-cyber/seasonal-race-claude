# MORNING SHEET — night of 2026-09-14 → 15

Branch `feat/gap-leader-brake`, pushed. **Nothing merged, nothing minted, no shipped source changed
and no shipped default moved all night.** Every variant lived in an instrumented copy that was proved
byte-inert when switched off before any number was read from it.

**All six pieces are done.**

---

## ★ THE THREE THINGS TO DECIDE

### 1. The brake's rate window should be 200 ms — and it costs nothing visible
→ [BRAKE-WINDOW-1](../reports/night/BRAKE-WINDOW-1.md)

At your settings, 200 ms gives the smallest worst race on **10 of 10 tracks** (monotone: shorter is
better everywhere). Pooled in-window maximum **244.4 px → 208.3 px**, against 227.6 for the shipped
derivation. The **largest single-step multiplier move is identical to six decimals on every arm
including brake OFF** — the window changes what the brake asks for, never how fast the multiplier may
move, so there is nothing abrupt in it.

**The catch, stated plainly:** 1000 ms is *derived* (`trajectoryTransitionDuration`, the ease the
command already rides). **200 ms is derived from nothing** — it is a measured jitter floor, not a
quantity the engine holds. Adopting it means accepting a number with no home. **The cost named:** the
worst single second in 300 races turns 43 times at 200 ms against 14 at 1000 ms; the *median* race
turns 0 either way.

### 2. The servo can be fixed narrowly, and the narrow fix is invisible
→ [SERVO-NARROW-1](../reports/night/SERVO-NARROW-1.md)

`V1` — the restart decision ignores the noise, **no new number** — takes the leader's arrival from
**55.8% to 79.7%**, small corrections from 57.8% to 74.1%, halves the wrong-side share, cuts the
overshoot, and improves the in-window lead at **both** the median (81.4 → 70.9 px) **and** the maximum
(244.4 → 239.3), at **1.01×** the largest single-step move. The blunt "deliver everything" arm sat at
**21.3×** — that one is dead.

**Applied literally V1 misses the bar by two hairs**: a rank-error point estimate +0.006 worse with
**t = 0.19** (indistinguishable from zero; its exact-place hits go *up*), and a largest single-step
move 0.8% larger. **It is a full re-baseline** — 0/300 byte-identical, 190/300 winner changes, all
four fingerprints. Whether that is a fair price for +24 points of leader arrival is your judgement,
not a measurement, which is why I did not decide it.

### 3. Breakaways are rarer again — the third reading
→ [BREAKAWAY-RECOUNT-2](../reports/night/BREAKAWAY-RECOUNT-2.md)

You have now been told **71 in 100**, then **44**, now **20**. The third stands: it is the only one
whose denominator is a constant (the settled `LEADER_ZOOM` value) rather than a per-frame zoom that
moves 3.75×. **And the previous recount's headline reversal does not survive** — it said the action
stage causes breakaways and that `wild` was the worst; on a fixed divisor the three stages are
**quiet 21 / medium 19 / wild 20, flat**. The apparent stage effect was the **camera** zooming in more
on a wilder race, not the gaps growing.

---

## ★ THE HOLE IN THE RECORD

**No fairness verdict exists for the brake candidate, and it cannot be produced with the existing
instrument.** `scripts/sim-fairness.mjs` contains the string `gapBrake` **zero times** and passes no
`pathLengthPx`, so `_computeGapLeaderBrake` returns at its guard before reading anything — both arms
would be the same race. Running it would report a fact about the instrument, not the brake. I did not
modify it and did not invent a fairness definition. **Wiring the sim to see the brake is its own
piece of work.**

---

## WHAT EACH PIECE FOUND

| piece | result |
|---|---|
| 1 — [SERVO-FAULT-1](../reports/night/SERVO-FAULT-1.md) | The **noise** causes 86.1% of target rewrites (95.0% for the leader); the command's own movement 15.2%. The "small ask is near the threshold" idea is **refuted** — a 1–2-rank ask is 50× the threshold. The separator is **the clamp**: 16+-ranks-off racers are 100% pinned, so their noise is clipped and they arrive (94.6%); 1–2-ranks-off are 1.0% clamped (56.8%). The blunt counterfactual is **not a candidate** (21× visible, rank error worse, all four fingerprints, a golden race). Its four red parity tests are a **moved input, not a broken guarantee** — real and sim both land on `fe3f4861`; the pinned winner is what fails. |
| 2 — [SERVO-NARROW-1](../reports/night/SERVO-NARROW-1.md) | Four variants, all inert when off (10/10). All take the leader to 79–81% at **1.00–1.04×** visibility. **V1 best.** None moves the rank error either way (all t < 1.4). |
| 3 — [BRAKE-WINDOW-1](../reports/night/BRAKE-WINDOW-1.md) | 200 ms best on 10/10 tracks, zero visibility cost, engage gate holds at 90.001 px. |
| 4 — [BRAKE-WINDOW-1](../reports/night/BRAKE-WINDOW-1.md) | **Gate OPENS** for the 200 ms window. Fairness **not producible** (above). Race shape **unchanged in any visible way** — lead changes 19.43 vs 19.44, clear-vs-contested moves by one race in 300. |
| 5 — [BREAKAWAY-RECOUNT-2](../reports/night/BREAKAWAY-RECOUNT-2.md) | 20 in 100; the stage effect was the camera. |
| 6 — [BRANCH-INVENTORY-1](../reports/night/BRANCH-INVENTORY-1.md) | Nine branches, two with product code. **Two merge hazards**: `report/brake-census-1` has no index line (would redden `check-index`); `night/2026-09-14-history` is 13 commits behind and carries its own `MORNING.md`. |

---

## DECISIONS I TOOK WITHOUT ASKING

- **V2's cadence.** The plan carries the re-roll *transition duration*, not the re-roll *interval*
  (which lives in `raceCore.js` and never reaches the planner). I used the field the plan already has,
  because it changes less than threading a new one through. V2 is therefore a faithful "slow-varying
  noise" arm but not literally the re-roll cadence.
- **The fairness instrument was killed, not shortened.** It burned 925 s of CPU with zero output;
  reported as **not run** rather than presented as a short run. Later found to be blind to the brake
  anyway.
- **Piece 5's scope.** The whole-race maximum counts only while the whole field is still racing, so a
  straggler pair after the leaders finish cannot masquerade as a lead. This is why my p90 differs
  slightly from the previous recount while the median and maximum reproduce it to the digit.
- **Piece 4's race-shape metrics are my construction** from existing quantities (the 750 ms spell rule
  is `pulkLeadRotationMinHoldMs`). There is no pinned project methodology for "does it look good".

---

## STILL OWED FROM BEFORE THIS NIGHT

- **Your eye on the served build** of the gap brake (the three services were left up: 4173 production,
  5173 dev, 4000 API; build badge `7aa649f1 +dirty`). The uncommitted line that switches the brake on
  for that eye-test is still the only working-tree change on the branch.
- `feat/remove-prestaging-comebacker` needs your word — it removes a mechanism.

---

## CLEANUP DONE, AND THE HAZARD RESPECTED

`C:/tmp/srv` held **junctions** to the real `node_modules` (root, `client`, `server`). They were
removed one at a time with `rmdir` (never a recursive delete), verified absent with `dir /AL`, and
only then was the worktree removed. The owner's `node_modules` is intact. Scratch output directories
under the session temp area were removed; no test race or data record was created anywhere in
`server/data`, and the owner's store was never opened.
