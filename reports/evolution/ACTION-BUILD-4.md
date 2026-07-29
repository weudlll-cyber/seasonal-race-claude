# ACTION-BUILD-4 — the finale script compiler (build + FIRST LOOK)

**Branch `exp/chain-choreo` (sim-only; master untouched). Author: CC.** The owner's sustained objection:
the line was judged with its finale module — the script compiler — unbuilt (Q4–6 deferred twice). This run
BUILDS it and takes ONE first look, then STOPS (the owner's explicit protocol). **Frozen runtime budget
unchanged** — scripts are authored CURVES; nothing new runs per tick. OFF byte-identity asserted
`7c70b1eae7d31e22` (== baseline, after the compiler edit).

---

## FIRST LOOK — N=20, direction only, NOT a verdict

**One default config, exactly as the protocol requires.** Candidate = **B15 + proximity floor + the script
compiler (actionLevel `mid`) + the open-lane accordion where lanes afford it**. Paired vs **Ship** AND vs
**B15+prox** (proximity-alone). 4 standard tracks (luger, mountainstreet / searound, dirt-oval), seed 1,
N=20, default racer each. Geometry read = topology-derived scarcity (open 0.3 / closed 0.7). LAW lower = better.

| track (topology) | band-reach (Δship) | dead-finale (Δship) | LAW_full / LAW_l50 | skip |
|---|---|---|---|---|
| **ship** | 69 / 71 / 75 / 73 · **3/4** | 10 / 20 / 10 / **5** | 0.29 0.30 0.31 0.29 | — |
| **B15+prox** | 76 / 74 / 77 / 77 · **4/4** | 15 / 5 / 15 / 15 | 0.58 0.50 0.62 0.64 | — |
| **B15+compiler** | 71 / 71 / 78 / 78 · **4/4** | 10 / 15 / **35** / **35** | 0.46 0.38 0.54 0.59 | 15/14/20/13% |

*(order in each cell: luger · mountainstreet · searound · dirt-oval; open tracks first, closed last.)*

### The numbers, read straight
- **Band-reach — fairness holds.** Candidate **74% mean, 4/4 ≥70%** (luger 71, mtn 71, searound 78, dirt 78).
  A touch under proximity-alone's 76% (scripted racers follow their script, not the proximity pull), but all
  four clear the floor. Holm start-row: luger + searound flag UNF at N=20 (searound is UNF on Ship too;
  luger is UNF on B15+prox too) — start-row Holm is noisy at N=20, carry to the gate.
- **Dead-finale — the split, and dirt called out.** Open tracks land near parity: **luger 10 (= ship), mtn 15
  (< ship 20)**. Closed tracks get WORSE: **searound 35 (ship 10, +25pp)** and **dirt-oval 35 (ship 5, +30pp)**
  — the candidate is the deadest of the three arms on both closed tracks, and dirt lead-changes collapse to
  **0.95/race** (ship 2.10). This is the BUILD-3 tension amplified, and **it is bundled**: the candidate runs
  the accordion, which BUILD-3 measured as a closed-track jammer on its own (prox+accordion pushed dirt
  15→30). The accordion still fires on closed geometry here (skip 13–20% = it is admitting beats and braking
  a scarce-lane field). So the closed deadening is **consistent with the accordion, not proven to be the
  scripts** — the isolation arm (compiler, accordion OFF) is unrun and is the first Phase-3 probe.
- **LAW_full — continuity beats proximity-alone everywhere, ship nowhere.** Candidate LAW_full **< B15+prox on
  all four** (0.46<0.58, 0.38<0.50, 0.54<0.62, 0.59<0.64): the whole-race scripts add mid-race life the naked
  proximity substrate lacked (this is the gun-to-line occupancy the compiler was built for). Still above ship
  (0.29–0.31) — ship's re-roll engine flips the front more often whole-race. The compiler **halves the gap**
  proximity opened, but does not close it.

### Per-script success + variety (the built-but-never-measured half)
- **Script draw + admission (all clean).** Open tracks draw **7.5 scripts/race**, closed **5.8**; **drop 0.0,
  shrink 0.1–0.3** — the reachability accountant almost never has to intervene (the pool is band-local by
  construction). Per-race exposure ≈ 6–9 racers.
- **Geometry preference works.** Open tracks draw fight-for-lead (1.0/race) + duel (0.8); **closed tracks
  suppress both to ~0** and go all-longitudinal (comebacker 2.4 · fallbacker 2.2 · pace-convergence 1.2) —
  exactly the intended "scarce lanes → same-lane catch-up, open lanes → compression/rotation."
- **Comebacker:** ~2.4/race, ~100% admitted, authored climb 5–9 places resolving in [0.70, 0.95].
- **Fallbacker:** ~2.2/race, ~100% admitted, front-spot held then fallen 4–8 places, resolving [0.72, 0.94].
- **Lead-fight (distinct leaders, last 30%):** open ~55 tick-level P1 flips, closed ~37 — the front genuinely
  churns; note this is tick-level flutter, and on closed tracks it does NOT convert to a *resolved* finale
  pass (hence the 35% dead — the bunched, braked field flickers but does not complete the overtake).
- **Variety — the previously-unbuilt Q4–6, now real.** Open tracks: **20/20 distinct timeline signatures
  (0% collision), H_script 2.19**. Closed: **18/20 distinct (15% collision), H 1.63** (lower because scarce
  geometry admits only the longitudinal families). Essentially "never the same twice," as specified.
- **Overlaps / envelope / duty-cycle:** overlaps 0 (strict-phase, unchanged traffic core); every speed change
  still eases through the shipped slew inside the two-sided envelope; accordion non-Leash caps intact
  (per-racer beat cap + duty ceiling + bounded pulse, admission-gated). OFF byte-identical `7c70b1eae7d31e22`.

### One closing line
**The compiler is built and honest — the admission stack is clean (0 drops), the geometry preference sorts
open→compression / closed→longitudinal, and it delivers the variety and whole-race continuity the line was
missing (beats proximity-alone on LAW everywhere, 4/4 fair) — but as bundled with the accordion it is the
deadest arm on the closed tracks (dirt 35% vs ship 5%), so this first look reproduces, not resolves, the
BUILD-3 closed-geometry tension.** Direction, not a verdict — N=20.

### What the owner must know to read these numbers
1. The candidate **bundles the accordion**, which BUILD-3 already measured as a closed jammer. The scripts'
   own contribution (variety + LAW-beats-prox + open-track parity) and the accordion's harm are **not
   separated** here. The single most informative Phase-3 arm is **compiler with accordion OFF** on all four.
2. `dead-finale` here is the runaway-parade per-race metric (a *resolved* finale lead change), which is why a
   front that flutters at tick level (leadLast30 ~37–55) can still read 35% dead on closed geometry.
3. `mid` actionLevel and topology-derived scarcity (0.3/0.7) are the stated defaults; both are Phase-3 knobs.

---

## PROPOSALS (brief — for the owner's go/no-go on Phase 3)
1. **Isolate first.** Run compiler-only (accordion OFF) vs compiler+accordion on all four. If closed dead
   drops toward ship when the accordion is removed, the scripts are clean and the accordion is the closed
   liability (thin it to zero under scarcity, as BUILD-3 proposal 2 named) — keeping the variety + LAW win.
2. **Pace-order convergence is the closed lever, and it is under-weighted.** On dirt the ship's low dead comes
   from re-roll speed-variation (a runtime force outside the budget); the compiler's admission-side stand-in
   is pace-order convergence (planned-faster held behind planned-slower, single same-lane catch-up). It is
   only ~1.2/race today. Raising its closed quota is the admission-side attempt at the dirt gap before the
   earned-KILL clause is invoked.

## Owner questions
1. **Go for Phase 3?** The full program (actionLevel grid, keep/discard per family, the simultaneity bar,
   and — only on a met bar — the N=100×4 gate) is not started, per protocol.
2. **First Phase-3 arm:** compiler-with-accordion-OFF isolation (proposal 1), or straight to a
   closed-weighted pace-convergence pass (proposal 2)?

---
**Branch `exp/chain-choreo`.** OFF fingerprint `7c70b1eae7d31e22` (asserted after the compiler edit).
Sim-only. Build: `client/src/modules/scriptCompiler.js` (+ tests, 27 pass), wired through
`generateChainCurves`. Data: `reports/evolution/chain-ablate-data/firstlook-b4.txt`.
