# Assignment-follows-field (Evolution Act 1) — CC design opinion

**Report-only. Author: CC. Master `ce73592`. No code changed, no sims run.** My independent read of the
proposal to delete slot-pinning: keep band *membership* fixed (each racer's plan-time band never changes)
but continuously reassign the *intra-band ordering* so a racer's live target follows the nearest band
members. Written without reference to the Copilot file.

## The spine that governs all three answers: determinism in the shared step

One fact dominates every design choice here. The servo that reads the target rank —
[`racePlanner.js` `update()`](../../client/src/modules/racePlanner.js) — is called by **one shared
function, `raceCore.stepRacePhysics`, for BOTH the browser and the sim**. So any reassignment placed
inside `update()` is mirrored in both engines by construction, and the parity golden test
(`realArm == simArm`, byte-identical, 600/600) keeps passing **iff** the reassignment is a *pure
deterministic function of live state* with:

- **no `rng()` draw** — the plan-time Fisher-Yates and pulk pick advance the shared RNG stream
  ([`racePlanner.js:198-200,220-222`](../../client/src/modules/racePlanner.js)); a new draw inside the
  per-tick loop would desync the re-roll stream and break parity;
- **no wall-clock / no absolute-ms constant** — must read the phase clock (`phaseProgress`), not real time;
- **a deterministic rank order** — already guaranteed: the servo sorts
  `active` by `(b.t !== a.t ? b.t - a.t : a.index - b.index)`
  ([`racePlanner.js:586-589`](../../client/src/modules/racePlanner.js)), so float-equal `t` ties break on
  `index` identically in both engines.

The reassignment itself is expressible as exactly that pure function: take `active` (already rank-sorted),
partition it by fixed plan-time band, and within each band hand out the band's slot ranks in live order.
No RNG, no clock. Everything below assumes this placement.

---

## 1. Assignment cadence

**Cost.** Per-tick reassignment is O(n) on top of a loop that is already O(n): `update()` already sorts
`active` once ([:586](../../client/src/modules/racePlanner.js)) and iterates every racer to set
`trajectoryMult` ([:673](../../client/src/modules/racePlanner.js)). Reassignment adds one more O(n) walk of
the already-sorted array with a per-band counter — negligible next to the P-controller math already run per
racer per tick. At 40 (closed) / 60 (open) racers over a 30–300 s race this is not a measurable cost;
cadence should be chosen for *behaviour and stability*, not for CPU.

**Determinism / parity.** Continuous per-tick is parity-safe *given the spine above* — it is a pure
function of the live `t`-ordering and fixed band membership, both identical across engines. The sim
inherits it free (it runs the same `stepRacePhysics`); the sim's own `racerTargetRankMap` usages are
observer-only diagnostics ([`sim-fairness.mjs:1057,1494,1591,2289`](../../scripts/sim-fairness.mjs)) and do
not steer.

**Natural hooks.** Two exist:
- *Every tick, inside `update()`* — the servo pass. Cleanest for parity (single shared site), and it has
  **no timescale**, so it satisfies the owner's 30–300 s construction rule by construction (a per-tick
  rule has no seconds in it).
- *Scheduled roll boundaries* — the re-roll schedule (`rollCount`/`lastRollDeadline`) is already
  duration-scaled, so pinning reassignment to roll ticks would also honour the 30–300 s rule and would flap
  far less (sparse updates). But the roll schedule lives in the re-roll loop, not in `update()`, so this
  adds plumbing (pass a "roll boundary" flag into the planner, or reassign in the roll loop and thread the
  result back) and yields a coarser, steppier feel.

**Reject the fixed timer (candidate c).** A fixed-ms cadence reassigns a fixed number of times regardless
of race length — it directly violates the no-hard-coded-cadence rule (a 500 ms timer fires 60× in a 30 s
race and 600× in a 300 s race). If a timer were ever wanted it would have to be expressed as a fraction of
duration / in `phaseProgress`, at which point it is just a coarser version of the two hooks above.

**Interactions.** (i) *Release* ([:688-691](../../client/src/modules/racePlanner.js)): released B1 heroes
already target `currentRank` (natural run-out) and heroes generally follow curves — reassignment must apply
to the **pack only** and skip released/hero racers, or it will fight the run-out that decides 1st. (ii)
*Hero curves*: a hero curve ends inside its assigned band; if the pack is simultaneously reordering that
band, two racers can transiently target the same intra-band rank — a contention the spec must define (e.g.
heroes own their curve rank; the pack fills the remaining slots). Continuous evaluation makes this collision
happen every tick, which is another reason the *commitment* must be gated (§2), even though the *evaluation*
is continuous.

**Recommendation:** evaluate continuously every tick inside the shared `update()` servo pass (candidate a),
as a pure RNG-free function of the live order + fixed band membership, but gate *commitment* of a swap on
the §2 hysteresis; keep scheduled-roll-boundary as the fallback if per-tick proves twitchy, and reject the
fixed timer outright.

---

## 2. Hysteresis

**The failure mode.** Two same-band neighbours whose `t` are near-equal will swap rank order every few ticks
(the servo itself nudges them past each other), so raw per-tick reassignment flips their targets back and
forth, and each flip restarts a servo slew via `_setTarget`
([:482-488](../../client/src/modules/racePlanner.js), 0.001 deadband + easing) — visible jitter. Note the
servo slew smooths the *output* (`trajectoryMult`); it does **not** stop the *target* from flapping, so a
dedicated hysteresis on target *selection* is required — the existing slew is not enough.

**Unit.** The codebase offers three scales, and only one fits:
- **ranks** (integers) — too coarse and circular: "swap when rank differs by ≥1" *is* the flap condition;
  two racers 0.01 lengths apart are already 1 rank apart. Reject.
- **milliseconds** (hold time) — a minimum-hold would need duration scaling to obey the 30–300 s rule (a
  500 ms hold is 1.7 % of a 30 s race but 0.17 % of a 300 s race). It also *artificially delays legitimate*
  swaps (a real overtake past the threshold is exactly the event we want to honour). **Flag:** any ms hold
  time must be expressed as a fraction of `realizedDurationSec` / in `phaseProgress`, never a literal ms —
  and even then it fights the intent. Avoid.
- **lengths** (arc-gap) — the right unit. It is the codebase's physical closeness measure, it is already
  what `gapRerollThresholdLengths` uses (shipped `0.5`, arc-gap via the `govLenScale`/`arcT` machinery the
  servo and observers already compute), and a length is **scale-invariant to race duration** — a
  length-threshold needs **no** duration scaling. Swap the intra-band slot only when the challenger is
  ahead of the incumbent by more than `H` lengths; below `H`, hold. This suppresses noise-level flaps while
  still committing on genuine position changes (which is the whole point of "assignment follows field").

**Reuse.** Model the knob on `gapRerollThresholdLengths` (same unit, same arc-gap source, same "measured in
lengths" mental model the owner already tunes). A single length threshold is sufficient; "both" (candidate c)
adds a hold-time whose only job — damping flaps — the length threshold already does, at the cost of the
scaling problem above.

**Recommendation:** a distance threshold in **lengths** (candidate a), reusing the
`gapRerollThresholdLengths` arc-gap pattern; do **not** add a ms hold time (needs duration-scaling and delays
real swaps), and reject rank-based hysteresis (too coarse — it is the flap).

---

## 3. Blast radius — consumers of the constant target rank

The proposal's safety keystone: **reassignment stays strictly inside a band** (never crosses
`BAND_EDGES = [5,15,25,40]`, [`racePlanner.js:54`](../../client/src/modules/racePlanner.js)). Every
"unaffected" verdict below depends on that invariant — the moment a reassignment could move a racer across a
band edge, the areaBonus / bounds / released / b1 verdicts flip to "affected."

| # | Consumer | File / line | Impact under intra-band reassignment |
|---|---|---|---|
| 1 | Winner report (`targetRank===1`) → `winnerRacerId` | `racePlanner.js:207-208` | **DECISION.** Reporting-only, and *nobody steers to 1* (cluster starts at 2, `heroCurveGenerator.js:417`); the real 1st is the B1 run-out. Decide: freeze `winnerRacerId` as the plan-time "designated favourite", or let it follow the live B1 leader. Low mechanical risk either way. |
| 2 | `racerAreaBonus` precompute | `racePlanner.js:241-244` via `getAreaBonus`→`rankToBandIndex` (`:120-123`) | **UNAFFECTED — confirmed.** `getAreaBonus` keys on `rankToBandIndex(targetRank)`; any target that stays in the same band returns the same bonus, so the precomputed `_racerAreaBonus` map remains correct and need not be recomputed. |
| 3 | `getAreaBounds(targetRank)` → `bandError` | `racePlanner.js:702` (defn `:64-71`) | **UNAFFECTED.** Same-band targets return the same `[lo,hi]`, so `bandError` is unchanged; only `rankError` (`:700`) changes, which is the intended steering knob. |
| 4 | Released-check | `racePlanner.js:688-691` (`targetRank <= BAND_EDGES[0]`) | **UNAFFECTED.** This is a *band-membership* test ("is B1"); band membership is fixed, so the release decision is invariant. Keep it reading the fixed band, not a live intra-B1 rank. |
| 5 | Servo target selection / `rankError` | `racePlanner.js:694-700` | **PRIMARY CHANGE SITE.** The pack branch `plan._racerTargetRank.get(r.index)` becomes the dynamic intra-band assignment; `rankError = currentRank - targetRank` follows. This is the one behavioural edit. |
| 6 | Chaos-bonus spoiler switch | `racePlanner.js:509-513` (`targetRank <= BAND_EDGES[0]`) | **UNAFFECTED.** Band test, default OFF, and runs pre-`pulkStart` (before any OUTCOME reassignment). |
| 7 | `targetRanks` + `b1Indices` exposed to RaceScreen | `raceCore.js:265-267` | **SPLIT DECISION.** `b1Indices` (rank ≤ 5) is the fixed B1 *set* → keep it derived from the fixed membership (stays stable, protects the camera pool). The exposed `targetRanks` map, if made live, changes only the HUD (item 8). |
| 8 | B1 favourites HUD (`delta = currentRank - targetRank`) | `RaceScreen/index.jsx:873-886` | **COSMETIC.** With live targets the "delta" trends to ~0 and the list reorders live. Display choice, no steering effect. |
| 9 | Plan HUD row `#targetRank` | `RacePlanHUD.jsx:95` | **COSMETIC.** Shows whichever rank is exposed. |
| 10 | Comeback-shot B1 pool | `CameraDirector.js:501,587` | **UNAFFECTED** if `b1Indices` stays the fixed B1 set (item 7). |
| 11 | Sim diagnostics reading `racerTargetRankMap` | `sim-fairness.mjs:1057,1494,1591,2289` (+`639`) | **OBSERVER-ONLY.** Reporting/adherence diags behind flags; they never steer. They would report the live target — fine, or freeze for hero-adherence if a stable reference is wanted. No parity impact (steering is the shared `update()`). |
| 12 | Parity winner anchors | `parity/goldenEquality.test.js`, `parity/replay.test.js` | **WILL MOVE (by design).** Reassignment changes the race, so the pinned winners re-pin (as at the speed-150 ship and the gs-flip); the `realArm == simArm` hash/equality guarantee **must** still hold — that is the acceptance bar, preserved by the spine above. |
| 13 | Planner unit tests | `racePlanner.test.js` | **NEEDS UPDATE.** Any assertion that a racer keeps a *constant* target through the race breaks by design; assertions on band-membership stability should still pass. |
| 14 | Camera test | `CameraDirector.test.js:539` | **CHECK.** Should pass if `b1Indices` remains the fixed set. |
| 15 | Shipped-default fingerprint | `scripts/fingerprint-default.mjs` | **MOVES if shipped ON.** Recommend building AFF **flag-gated, default OFF** (the gap-reroll pattern), so the ON/OFF fingerprints stay byte-identical until an explicit owner ship — the phase's established discipline. |
| 16 | `headlessRaceSimulator.js` | `:9` (omits `trajectoryMult`/`areaBonusMult`) | **N/A.** A simplified sim that skips the servo entirely; not on the AFF path. |

**Recommendation:** the mechanism touches exactly one steering site (item 5); hold reassignment **strictly
intra-band** so items 2–4/6/10 stay provably unaffected, take an explicit freeze-vs-follow decision on
`winnerRacerId` (1) and the exposed `targetRanks`/HUD (7–9), expect the parity anchors (12) to re-pin while
the byte-identical guarantee is preserved, and ship it **flag-gated default OFF** (15) so the fingerprint is
untouched until the owner flips it.
