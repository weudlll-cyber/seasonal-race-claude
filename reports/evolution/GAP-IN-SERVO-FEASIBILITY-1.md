# GAP-IN-SERVO-FEASIBILITY-1 — the servo can carry it, but the form that exists was already rejected

**Branch** `night/2026-09-12b` · **ESTABLISH ONLY — nothing built, nothing changed, nothing minted.**
No file in the repository was touched; the measurement in §4 reuses `C:/tmp/wild-gap.mjs`.

★★ **THE ANSWER IN ONE LINE: MECHANICALLY YES — BUT THE ONE IMPLEMENTATION THAT EXISTS IS A REJECTED
DEAD END, AND RE-PROPOSING IT IS FORBIDDEN BY THIS PROJECT'S OWN RECORD.** The gap brake the owner is
describing already exists inside the servo — `racePlanner.js:1116-1161`, the front distance leash —
written, guarded, and never wired to the browser. ★★ **It is never wired because it was TRIED AND IT
FAILED**: `docs/DEAD-ENDS.md:75-78` records it as *sim-only 2026-07-20, never shipped, **REJECTED** —
made runaway WORSE*, and closes with ★ **"Do not re-propose continuous leader braking."** §5 is that
finding; §§1-4 are the feasibility answers, which stand on their own and are what a NEW form would
have to be built on.

★ **RE-VERIFIED, as instructed:** the gap ceiling that fires today is
`computeGapBiasedTarget` (`racePlanner.js:1259`), it hangs off the re-roll boundary, and the servo
did nothing across his deceleration — `trajectoryMult` **0.9499 → 0.9500**. Confirmed at source and
re-measured on his race. **The re-roll is not touched anywhere in this report.**

---

## 1 · ★★ DOES THE SERVO KNOW THE GAP? **THE DATA IS IN SCOPE, AND IT ALREADY COMPUTES ONE**

| | |
|---|---|
| what `update()` receives | `update(racers, elapsedMs, phaseProgress = null, leaderGapLen = null)` — `racePlanner.js:656` |
| what the shipped path passes | ★ **three arguments.** `raceCore.js:562`: `racePlanController.update(st.racers, physicsTs, st.raceProgress)` — so **`leaderGapLen` is `null` in the browser** |
| who does pass it | the sim harness only — stated at `racePlanner.js:380` |
| ★ **is the raw data there?** | ★ **YES.** `racers` carries `.t`, and `active` is already sorted by `t` descending at `racePlanner.js:758` |
| ★ **does the servo already compute a gap?** | ★ **YES — `racePlanner.js:986`**: `const g = (r.t - active[1].t) / plan._finishT`, the leader gap, read-only for the arrival telemetry. Its own comment says it "costs one subtraction" |

★★ **SO THE ANSWER TO "would it have to be carried there" IS NO, NOT FOR THE QUANTITY ITSELF.** A gap
in race-fraction units is one subtraction away at the exact place the servo computes, and that line
is already in the file.

★ **ONE QUALIFICATION, AND IT IS THE ONLY PLUMBING IN THE PIECE.** The two existing gap mechanisms
express the gap in **body lengths**, not race fractions, because a threshold in lengths is what the
owner's controls are written in. Lengths need two things `update()` does not receive:

- `lenScale` — computed as `gapLenScale` at **`raceCore.js:598`**, `lenScaleFrom(pathLengthPx,
  meanDrawnBodyLen(st.racers))`. ★ **It is computed 36 lines AFTER the `update()` call at 562**, so
  using it in the servo means **moving that one line above the call**, not writing anything new.
- `isOpen` — needed by `arcT` for a closed-track wrap.

★ **And the length-space gap computation itself is already written**, twelve lines of it, in the same
file: `racePlanner.js:1293-1294` —
`gapBehind = arcT(self.t, behind.t, isOpen) * lenScale` and the `gapAhead` beside it.

---

## 2 · ★★ WHICH RACERS ARE "DIRECTOR-STEERED"? **THE SET SHIFTS DURING THE RACE**

The owner's constraint is that a gap correction applies only to racers the director already steers.
**That set is well-defined at any instant and changes twice**, with addresses:

| phase | progress | ★ who is steered |
|---|---|---|
| **CHAOS** | `< pulkStartFrac` | ★ **every racer** — chaos-steer toward the drawn band (`racePlanner.js:888`; `chaosSteer: true` ships, `defaults.js:1008`) |
| **PULK + TRANSITION** | to `corrStartFrac` | ★ **HEROES ONLY.** `racePlanner.js:916`: `if (_preOutcome && !isHero) { _setTarget(r, 1.0); continue; }` — the pack is pinned to exactly 1.0 |
| ★ **OUTCOME** | ★ **from 0.6** (`choreoOutcomeStart`, `defaults.js:1070`) | ★ **EVERY RACER.** The comment above that gate says it: *"In OUTCOME every racer steers"* |

★★ **AND THIS IS WHY THE CONSTRAINT DOES NOT NARROW ANYTHING WHERE IT MATTERS.** His gap runs from
progress **0.742 to 0.921** — **entirely inside OUTCOME**. In that window "the racers the director
steers" is **the whole field, all forty**, not the six cast heroes.

★ Measured rather than argued: in his race the cast is **6 of 40** (PURSUER-BRAKE-1), yet `Vortex`,
who is **not cast**, spends **33.1 s** at the servo floor — he is steered, hard, and he is not a hero.

> ★ **So "only for the racers the director already steers" is satisfied trivially in the endgame and
> is a real restriction only before progress 0.6, where the gap he is complaining about has not opened
> yet.** If the intent was "heroes only", that is a DIFFERENT and narrower rule than the one the code
> would give, and it is the owner's to state.

---

## 3 · ★★ WHAT WOULD THE TWO CORRECTIONS DO TOGETHER? **THEY WOULD MULTIPLY**

★ **THEY ACT ON DIFFERENT FACTORS OF ONE PRODUCT.** A racer's speed is `baseSpeed · boost · brake ·
rowEnvMult · trajectoryMult · areaBonusMult · governorMult` (`raceStep.js:106`). The re-roll bias
moves **`spreadFactor`**, inside `baseSpeed`; a servo-side leash moves **`trajectoryMult`**. Nothing
reconciles them — **the two cuts compound as a product.**

★ **AND THEY FIRE IN THE SAME WINDOW, ON THE SAME RACERS.** `computeGapBiasedTarget` returns the
unbiased sample below `corrStartFrac` (`racePlanner.js:1273`) — so its window **starts at OUTCOME**,
which is exactly the window in which the servo steers everybody (§2).

★ **THE SIZE, FROM HIS OWN RACE RATHER THAN AN ASSUMED NUMBER.** While the gap opened, Breeze ran a
servo of **0.9499** and a whole speed of **1.0785**; the re-roll then cut his natural speed by
**15.0%** (1.0813 → 0.9187, GAP-CEILING-BASELINE-1). If a leash had also pinned him to its floor of
**0.85** (`LEASH_MIN_MULT`, `racePlanner.js:1126`):

| | |
|---|---|
| his speed while the gap opened | **1.0785** |
| with the leash at 0.85 instead of 0.9499 | 1.0785 × (0.85 / 0.9499) = **0.9651** |
| ★ **then the re-roll's own −15% on top** | ★ **0.9651 × 0.8496 = 0.820** |

★★ **ABOUT 18% BELOW NATURAL PACE — against the ±20% naturalness envelope whose floor is 0.80**
(BRAKE-CURVE-1). ★ **That is an estimate built from his measured numbers, not a measurement of a built
thing**, and it is the answer to "a racer braked twice": on these numbers the pair lands within two
points of the floor the action work already treats as the limit.

★ **WOULD THE RE-ROLL ONE HAVE TO BE DISABLED FOR STEERED RACERS? IN ITS OWN WINDOW THAT MEANS
DISABLING IT.** Because its window and the everyone-is-steered window are the same, "disable it for
steered racers" removes it from every racer it can currently act on. ★ **AND THE COST TO RACERS THE
SERVO DOES NOT STEER IS THEREFORE ZERO — because in that window there are none.** The gap-reroll's
23.5% → 8.3% runaway result (`reports/evolution/HYGIENE-1.md:65`) would be given up wholesale,
not partially.

---

## 4 · ★★ CAN IT REACH THE OUTPUT WITHOUT TOUCHING THE CLAMP? **YES, TWICE OVER**

**(a) The existing leash does not add a term to the expression at all.** `rawTarget = clamp(1.0 +
gain·error/nActive + noise, minMult, ceilFor)` is `racePlanner.js:1095`; the leash runs **after** the
per-racer loop and **overrides** the result through `_setTarget(active[li], brake, elapsedMs)`
(`racePlanner.js:1155`). `_setTarget` (`racePlanner.js:648`) writes `trajectoryMultTarget` directly
and starts the 1 s slew. ★ **A saturated rank term is therefore irrelevant: the leash replaces the
target rather than adding to it.**

**(b) And the racer who opens the gap is not saturated anyway — measured on his race:**

| frames | at the ceiling 1.1 | at the floor 0.85 | ★ strictly INSIDE the clamp |
|---|---|---|---|
| the whole 877-frame lead | **0** | **0** | ★ **877 — 100%** |
| the 428 frames the gap opens | **0** | **0** | ★ **428 — 100%** |

Commanded across the opening: min **0.9492**, median **0.9497**, max **0.9508** — ★ **0.0997 of
multiplier of headroom to the floor.**

★★ **AND THE REASON IS STRUCTURAL, NOT LUCKY: the racer who opens a gap is by definition at or near
his drawn place**, so his rank error is one or two ranks and the servo sits near 0.95. **Saturation
is the PURSUER's condition** — Blitz, twelve ranks from his place, pinned at 0.8502 — **not the
leader's.** A gap term added to the leader's expression would have room to act in every frame that
matters.

---

## 5 · ★★ SIZE IT — AND FIRST, THE THING THAT OUTRANKS THE SIZE

★★ **THE IMPLEMENTATION THAT EXISTS WAS TRIED AND REJECTED. `docs/DEAD-ENDS.md:75-78`:**

> **Front-distance Leash** (sim-only 2026-07-20, never shipped, **REJECTED**) — continuously braking
> the leader to the floor. **Made runaway WORSE** (braked leader dumped into pack, fresh escapee
> promoted). **Owner's deeper reason: braking "the leader" also brakes the 2nd-place racer, himself a
> leader vs the rest — it brakes the whole front, not just the breakaway.**
> ★ **Do not re-propose continuous leader braking.**

★★ **THAT IS NOT AN IMPLEMENTATION DETAIL, IT IS THE FAILURE MODE OF THE WHOLE APPROACH — and this
piece reached the same objection independently before finding the record.** §2 established that in
OUTCOME the servo steers **every racer**, so "only the racers the director steers" is the entire
field; and §5.2 below shows the leash latches onto whoever is rank 1, which in his race is **Breeze,
the comebacker himself**. ★ **A gap brake applied in the servo's own window is applied to the front of
the race, which is exactly what the rejection says does not work.**

★ **SO THE FEASIBILITY ANSWER IS NOT "WIRE IT UP".** §§1-4 stand — the data is in scope, the set is
defined, the clamp is not an obstacle — but they are the ingredients for **a new form that answers the
rejection's reason**, not a licence to enable the old one. **Any such form has to distinguish the
BREAKAWAY from the FRONT, and nothing in the existing code does that.**

### 5.1 · What the wiring would cost, stated for completeness

| | |
|---|---|
| files touched | **two** — `racePlanner.js` (the gate is `_frontLeashMaxLengths != null && leaderGapLen != null`) and `raceCore.js` (pass the gap into `update()`; move the `gapLenScale` line from 598 above 562) |
| anything outside the servo? | **only that one call site.** No camera, no renderer, no plan generation |
| ★ **does it need a new value?** | ★ **YES — two.** `frontLeashMaxLengths` and `frontLeashGainPct` are read at `racePlanner.js:381-382` but appear **zero times** in `defaults.js` |

★★ **A new key in `defaults.js` is a change to the SHIPPED WORLD.** By `CLAUDE.md`'s permanent rule
that requires the ship ceremony, and the four fingerprints move — the world fingerprint by
construction. It also needs a Dev Screen control, by the standing rule that everything is
UI-configurable.

### 5.2 · ★ TUNING OR MECHANISM? **MECHANISM** — and it picks the wrong racer

★ It applies a **new force to a racer no force acts on today** — a brake in gap space on top of the
rank servo — with its own engage/disengage state machine and five internal constants. ★ **The diff is
small; the change is not.** A racer's speed acquires a second authority, and §3 shows the two are
unreconciled.

★★ **AND IT LATCHES ONTO THE LIVE RANK-1 RACER** (`racePlanner.js:1137`), disengaging only once he has
fallen to rank 3 (`LEASH_FLOOR_RANK`). In `QN3HDP` that racer is **Breeze** — so the comebacker would
be braked a second time, on top of the −5% he already carries, while **Blitz behind him stays pinned
at the floor for being twelve ranks from his drawn place.** ★ **The gap would close by braking the
front pair together — which is the owner's own recorded objection, arriving again.**

---

## 6 · ★★ A STALE CLAIM IN THE CODE, FOUND WHILE ESTABLISHING THIS

`racePlanner.js:383-388` says of the gap-reroll: *"SIM-ONLY … supplied only via the sim harness …
**The BROWSER never sets these → threshold null → computeGapBiasedTarget() early-returns rawSample →
byte-identical**."*

★ **THAT IS NO LONGER TRUE.** `defaults.js:1115-1116` ships `gapRerollEnabled: true` and
`gapRerollThresholdLengths: 0.5`, so the browser DOES set them and the transform runs — which is why
it fired in his race and the dev marker caught it. ★ **The comment beside the front-leash keys
(`racePlanner.js:376-380`) is still accurate** — `frontLeash*` appears **zero** times in `defaults.js`.

★ **Reported, not fixed** (this piece changes nothing). It matters because a reader reasoning about
this exact question from that comment would conclude the gap-reroll is inert in the browser, and
would be wrong.

---

## ★★ THE ONE LINE

> ★★ **NOT POSSIBLE CLEANLY IN THE FORM THAT EXISTS — and the reason is on the record, not in this
> report's opinion.** The servo CAN carry a gap correction: the gap is one subtraction away in scope
> (§1), the steered set is defined (§2), and the clamp is no obstacle because `_setTarget` overrides
> rather than adds (§4). ★ **But the one implementation written against that opening is the
> front-distance leash, which was measured, made runaway WORSE, and carries an explicit
> "do not re-propose" (`docs/DEAD-ENDS.md:75-78`)** — because braking "the leader" brakes the whole
> front. In OUTCOME the servo steers every racer, so a servo-side gap brake lands on exactly that
> front.
>
> ★ **A NEW form is not excluded, but it must first answer the question the rejection asks — how to
> tell a breakaway from the front of a race — and nothing in the current code distinguishes them.**
> Were one built anyway, the costs are: **two new shipped defaults** (ship ceremony, fingerprint
> mint), a **mechanism rather than a tuning**, and **two unreconciled corrections** multiplying to
> about **18% below natural pace** against a 20% floor — removable only by disabling the gap-reroll
> in the sole window it acts in, giving up the 23.5% → 8.3% runaway result whole.

---

## 7 · CHECKS

★ **NOTHING IN THE REPOSITORY WAS TOUCHED** — this piece is source reading plus one measurement on a
saved series. `git status` is clean but for this report, so the four fingerprints cannot have moved;
the values measured in HARNESS-WORLD-1 against a worktree at `85262b1b` stand (world
`b35cf477c09a1116`, world-off `19ccb497041a0dae`, camera `3df640a42e934312`, render
`6a84085e79535dd6`).

**`git stash` was not used. `--no-verify` was not used. Nothing was minted. Read-only throughout.**
