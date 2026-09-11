# COMEBACK-CONSTANT-DEFICIT-1 — a hold and an excursion CAN be told apart, and the premium is still not the wall

2026-09-12 · branch `night/2026-09-12` · **NO PRODUCT SOURCE WAS CHANGED. Nothing minted, nothing
shipped, no default moved.** What is added is a test that pins the finding and one observable the
measurement needed.

★ **THE ANSWER IN ONE LINE.** The brief's premise is that `feasibleTiming` refuses the owner's shape
because it charges a min-jerk excursion premium on both legs of a round trip. **Measured on races, it
is not the wall.** The brief's repair — waive the premium on the descent, keep it on the climb —
moves the staged comebacker from **9 of 200 races to 8 of 200**. And the premium is not an
over-charge at all: the realized figure is **1.875**, so the shipped constant sits **9% BELOW** the
case its own comment names, not above it.

★ **THE ONE THING THAT DOES MOVE, AND WHY IT IS STILL NOT A REPAIR.** Lowering the premium
symmetrically to 1.5 roughly doubles the staged casting rate — **7 of 160 → 16 of 160** on
independent seeds, at almost no cost to the rest of the cast. But it fires **only at N=60 and N=100**,
it is a setting *below* the physically realized figure, and **one step further down, at 1.4, it casts
ZERO**. A lever whose only useful setting is physically wrong and sits next to a cliff is a finding,
not a repair. §3.

★ **WHY NOTHING WAS BUILT.** BUILD step 4: a repair that needs a relaxed speed limit is a finding.
Every repair that reliably casts him needs one. §6 names it, and it is the decision COMEBACK-STAGED-1
already handed to the owner.

---

## 1 · ★ HOW A HOLD IS TOLD FROM AN EXCURSION — the checkable paragraph, first

A leg's premium is its **peak slope divided by its average slope**, and for the quintic Hermite every
hero curve is built from (`heroChoreography.js`, `quinticHermite`) that ratio is a pure function of
the leg's two **end tangents**, each measured in units of that leg's own average slope `m`.
`computeTangents` fixes those tangents from the waypoint list alone: the last point settles to zero,
and an interior point takes the Catmull-Rom central difference
`(r[i+1] − r[i−1]) / (p[i+1] − p[i−1])`. So for a three-point hero curve `anchor → peak → final`,
**the sign test decides it**:

- the two legs point in **OPPOSITE** directions — a genuine **EXCURSION**, which is the staged
  comebacker's round trip and the B2 attacker's climb-and-fall — and the central difference is tiny
  against either leg's own average. Both legs are rest-bounded, and the realized premium is **1.875**;
- the two legs point the **SAME** way — a **SUSTAINED** move through a waypoint — and the central
  difference **is** about the legs' own average slope. The curve passes through at speed and the
  premium falls toward **1.0**; at exactly constant rate it is **1.000**, because peak equals average.

★ **So the brief's step 1 does NOT hit its stop condition: the two ARE distinguishable, from the three
ranks the gate already has.** Both halves are pinned in `client/src/modules/stagedComeback.test.js`,
measured rather than asserted — on the excursion `5 → 18 → 3` the interior tangent is **−0.076** of
leg 1's own slope; on the sustained `3 → 12 → 20` it is **0.927**.

### The premium, as a function of the two end tangents (measured on the shipped quintic)

`k` is an end tangent divided by the leg's average slope. Cells are peak ÷ average:

| v0/m ↓ · v1/m → | 0 | 0.25 | 0.5 | 0.75 | 1 |
|---|---|---|---|---|---|
| **0** | **1.875** | 1.768 | 1.669 | 1.581 | 1.512 |
| 0.25 | 1.768 | 1.656 | 1.551 | 1.456 | 1.384 |
| 0.5 | 1.669 | 1.551 | 1.438 | 1.334 | 1.256 |
| 0.75 | 1.581 | 1.456 | 1.334 | 1.219 | 1.128 |
| **1** | 1.512 | 1.384 | 1.256 | 1.128 | ★ **1.000** |

**Rest-to-rest 1.875. Constant-rate exactly 1.000.** The owner's shape really does owe no premium —
the brief is right about that. It is the next step that does not follow.

### ★ AND THE SHIPPED CONSTANT IS AN UNDER-CHARGE

`heroCurveGenerator.js:72-74` names the rest-to-rest case in its own comment and prices it at **1.7**
against a realized **1.875**. Verified on whole three-point curves, not just the unit leg: the staged
comebacker's two legs realize **1.908** and **1.845**; a sustained faller's realize **1.529** and
**1.496**.

★ **This is the opposite of the defect the brief describes.** It is not a safety hole — `checkFeasible`
re-measures the realized curve (§4) and `feasibleTiming` usually stretches the spans past their
minimum — but **there is no conservative padding here waiting to be given back.**

---

## 2 · ★ THE BRIEF'S REPAIR, MEASURED

**Method.** 10 tracks × 4 field sizes × 5 seeds = **200 races**. Each is run to the choreo boundary;
the field state the planner itself sees, the real drawn final ranks (`meta.rpPlanInfo.targetRanks`),
the real `finishT` and the real anchor progress are captured, and the staging attempt `castHeroes`
would make is replayed against the gate with a **per-leg** premium. Arms are (descent, climb). `vel`
is 0 for every racer: `feasibleTiming` never reads it, and 0 is the same rest assumption the shipped
premium already encodes.

| arm | staged comebacker CAST | refused: no runway | refused: curve too steep | runway NEEDED ÷ AVAILABLE (median) |
|---|---|---|---|---|
| **SHIPPED 1.7 / 1.7** | **9 of 200** | 191 | 0 | **1.66×** (1.00–1.93) |
| ★ **BRIEF 1.0 / 1.7** — waived on the descent | ★ **8 of 200** | 192 | 0 | 1.36× (1.00–1.57) |
| both 1.3 | **0 of 200** | 146 | 54 | 1.36× |
| both 1.0 — no premium at all | ★ **0 of 200** | 62 | 138 | 1.14× |

★ **THE BRIEFED REPAIR CASTS ONE FEWER, NOT MORE.** 8 against 9 is not a regression either — it is the
same nothing, decided by which pool member happens to clear first.

★ **AND REMOVING THE PREMIUM ENTIRELY IS WORSE THAN USELESS — it casts ZERO**, because the refusal
simply moves one gate later. §4.

---

## 3 · ★ WHAT A SYMMETRIC PREMIUM DOES TO THE WHOLE CAST — the one real movement

The arms above hold the climb at 1.7. Run instead through the **real generator**
(`generateHeroCurves`), so every role is cast exactly as the product casts it:

**Run A** — 10 tracks × {20, 40, 60, 100} × 3 seeds = 120 races:

| premium (both legs) | heroes per race | staged comebacker cast | attackers | comebackers | fallers |
|---|---|---|---|---|---|
| **1.7 (shipped)** | **5.68** | 6 of 120 | 360 | 211 | 65 |
| 1.5 | 4.97 | **12 of 120** | 317 | 175 | 58 |
| 1.3 | 3.17 | **0** | 268 | 57 | 10 |
| 1.0 | 2.22 | **0** | 191 | 26 | 3 |

**Run B — an independent cross-check** on fresh seeds, at the two field sizes where staging ever
fires, 160 races:

| premium | heroes per race | staged comebacker cast | where |
|---|---|---|---|
| **1.7 (shipped)** | 5.45 | **7 of 160** | N=100 only |
| 1.6 | 5.49 | 10 of 160 | N=100 only |
| ★ **1.5** | 5.36 | ★ **16 of 160** | N=60 (4) and N=100 (12) |
| 1.4 | 4.54 | ★ **0 of 160** | — |

★ **The doubling is real and it reproduces.** 1.5 casts the staged comebacker about 2.3× as often as
the shipped 1.7, and — unlike the deeper cuts — it costs almost nothing: 5.45 → 5.36 heroes per race,
with the B2 attackers untouched at 480 either way.

★ **AND IT IS STILL NOT A REPAIR, for three measured reasons.**

1. **It never fires at the small fields.** 16 of 160 is **N=60 and N=100 only**; at N=20 and N=40 the
   staged comebacker is cast **zero** times at every premium tried. The owner's request was not
   "in big fields".
2. **10% is not a comebacker.** Even at its best setting he appears in one race in ten.
3. ★ **It is one step from a cliff.** 1.5 casts 16; **1.4 casts 0**, and the cast drops to 4.54. And
   1.5 is itself *below* the realized 1.875 — it buys its castings by allocating time the curve has no
   physical right to, which is exactly what §4 says `checkFeasible` exists to refuse.

---

## 4 · WHY — THERE ARE TWO GATES, AND THE SECOND ONE IS EXACT

`feasibleTiming` only **allocates time**. The safety property is enforced afterwards by
`checkFeasible` (`heroCurveGenerator.js:313`), which samples the **realized** anchored curve and
rejects it if any segment demands a faster rank change than the racer's own density rank-rate.

So the premium is a **scheduling heuristic**, not a limit — and lowering it cannot simply buy castings:

- a **smaller** premium allocates **less** time, so the realized curve is **steeper**, so
  `checkFeasible` refuses it. At premium 1.0 that is what happens to **138 of 200** races.
- On the deterministic fixture the existing wall test uses (a bunched N=40 field — the density in
  which deep climbs are *most* feasible), the staged round trip is refused by `feasibleTiming` at
  **1.7, 1.5, 1.3 and 1.0 alike**; at **0.5** the timing finally passes and `checkFeasible` refuses
  the curve instead. **No value of the premium casts him at N=40** — consistent with §3, where every
  casting is at N=60 or N=100.

---

## 5 · WHAT THE RUNWAY COSTS — CITED, AND CONFIRMED ON REAL RACES

COMEBACK-STAGED-1 established the scissors; it reproduces here at **1.66×** (its figure: 1.63–1.88).
Its depth table was measured on a synthetic field; this one falls out of the same probe on real races,
for a climb to rank 3 — and beside it, what today's comebacker actually reaches:

| N | the director asks for | deepest staging the gate accepts | ★ median depth today's comebacker DOES reach |
|---|---|---|---|
| 20 | 12 | **8** | **9** |
| 40 | 24 | **14** | **16** |
| 60 | 36 | **17** | **16** |
| 100 | 50 | **30** | **31** |

★ **The two right-hand columns are the same numbers.** Today's comebacker is already being held as
deep as this gate will allow, and no deeper. **The gate is binding, and it binds exactly where
COMEBACK-STAGED-1 said it does** — which is why tuning inside it buys a one-in-ten rate and nothing
more.

★ **Nothing was re-measured that COMEBACK-STAGED-1 had already measured.**

---

## 6 · ★ THE LEVER, LOCATED — and it is a speed limit, which is why this piece stops here

The asymmetry COMEBACK-STAGED-1 named is real and visible at source:

- the **climb** authority is the servo's, and `GENERATOR_CONFIG.speedBudgetFrac` is calibrated to it
  and documented as such in its own comment;
- the **drop** authority is the controller clamp's `minMult`, and it is **half again larger** — the
  same comment says so in as many words: drops are a touch faster, and the smaller figure is the
  conservative binding direction;
- `racerFeasibility` then derives ONE `maxRankRate` from the climb figure and prices **both**
  directions with it.

★ **So the descent is charged at the overtaking rate although a racer descends by not accelerating**,
and PACE-DEFICIT-1 measured that the descent he wants needs about **half** the drop allowance that
already exists. The repair that works is to price the down leg at the drop authority.

★ **THAT IS A RELAXED RATE, AND THIS BRIEF FORBIDS IT** — "do not widen it", and BUILD step 4. It is
also, word for word, the design decision COMEBACK-STAGED-1 handed to the owner and which has not come
back. **So it is reported, not built.**

---

## 7 · THE CONTROL — today's comebacker, re-established

200 races, 10 tracks × {20, 40, 60, 100} × 5 seeds, shipped engine, no arm. **355 comebackers cast**;
`placesGained` is rank at the 0.70 release minus finishing rank.

| N | races | comebackers | median places gained | reaches the top 5 |
|---|---|---|---|---|
| 20 | 50 | 81 | **−3** | 39/81 (48%) |
| 40 | 50 | 89 | **−9** | 29/89 (33%) |
| 60 | 50 | 104 | **−15** | 15/104 (14%) |
| 100 | 50 | 81 | **−25** | 8/81 (10%) |
| **all** | **200** | **355** | ★ **−9** (mean −13.0) | ★ **91/355 (26%)** |

★ **266 of 355 comebackers LOSE places after the release.** This reproduces the brief's control
(−9, −17, −16 across sizes; top 5 in 12 of 53) in sign, shape and magnitude — **the deeper the field,
the worse it gets**, from −3 at N=20 to −25 at N=100.

**Heroes per race: mean 5.31.** Roles across the 200 races: 578 B2 attackers, 355 comebackers,
68 sovereign-leads, 61 fallers.

★ **There is no second arm to compare this against, because nothing was built.** The control is
reported because the brief asks for it re-established, and because §5 needs its depth column.

---

## 8 · SABOTAGE — THREE, AND ALL THREE BIT

The brief's two sabotages presuppose a shipped repair. There is none, so what is sabotaged is the
**finding's own evidence** — the three assertions a later reader would rely on.

| # | the sabotage | result |
|---|---|---|
| 1 | add premium **0.5** — measured to PASS the runway test — to the counterfactual's list | ★ **RED**, as it must be: the assertion is not vacuously true |
| 2 | move the shipped constant **above** the realized 1.875 | ★ **RED** — the under-charge test reads the live constant, not a copy |
| 3 | feed the excursion assertion a **monotone** triple | ★ **RED** — the sign test discriminates, it does not always pass |

All three reverted; `heroCurveGenerator.js` is **byte-identical to HEAD**.

---

## 9 · ★ AN INSTRUMENT I BUILT, MEASURED, AND REMOVED

`scripts/diag/comeback-band.mjs` gained a hold-depth observable for §5. It also gained a boolean
`staged` — `deepestRank >= postChaosRank + 2` — meant to separate the director's staged comebacker
from the fall-back one.

★ **MEASURED, IT FLAGGED 339 OF 355.** Every racer dips two places somewhere in a window half a race
long, so it was reporting ordinary jostling under the name of staging. **It was removed rather than
tuned**, because the threshold that would actually separate them is the authored peak rank, and that
is a plan fact this harness cannot see. The rank itself — `deepestRank` — stays, and §5 is built on
it. **A number that would have looked like a finding is reported here as the instrument error it
was.**

---

## 10 · CHECKS, FINGERPRINTS, FAIRNESS

★ **NO ENGINE FILE WAS TOUCHED, so no fingerprint CAN move.** The working tree differs from HEAD in
exactly three files: a test, a diagnostic harness, and this report with its index entry.

| check | result |
|---|---|
| client suite | ★ **256 files, 4662 tests, PASS** |
| server suite | ★ **35 files, 836 tests, PASS** |
| `npm run verify` plain | ★ **PASS 16, FAIL 0, SKIP 18** (268 s) |
| `check-fingerprints` containment | **PASS** — 4 roles, 1196 files, 0 stray copies |
| `check-index` / `check-doc-links` / `check-config-claims` / `check-language-closed` | **PASS** |

★ **THE BRIEF'S STOP CONDITION DID NOT FIRE, and verify says so in its own words rather than mine.**
It expected world and world-off to move and the golden races to go red. Instead `verify` SKIPPED
`world-fingerprint`, `camera-fingerprint`, `render-fingerprint` and `golden-races` with the reason
**"nothing changed"**, each computed from that guard's own declared import closure — 194, 82, 104 and
196 files respectively. **That is the engine-reach proof, produced by the tool that owns it.**

★ Confirmed independently at the diff: **this whole branch changes no engine file at all.** Against
master it touches `stagedComeback.test.js`, `scripts/diag/comeback-band.mjs`, this report,
PACE-DEFICIT-1 and the index — nothing else.

★ **A NOTE ON WHAT I COULD NOT RUN.** `check-fingerprints --mint` and `engine-reach --check` were both
refused by this environment's command policy. **No attempt was made to work around either.** The
evidence above is stronger than what they would have given: not a re-mint that matched, but a
demonstration that nothing the fingerprints are computed from was touched.

★ **FAIRNESS WAS NOT RE-SWEPT, AND THAT IS THE HONEST CALL.** Both layers are functions of the running
engine, and the engine is unchanged; a 120 000-row sweep would spend hours proving an identity — the
same judgement COMEBACK-PRECEDENCE-1 made when its own arm proved inert. The standing baseline is
that report's, on master, and it stands unaltered — including that **`luger-hill` is the one
Holm-unfair track and was already unfair before any of this chain.** If a later piece ships the §6
lever, that is the run that needs both layers per track, before and after.

**`git stash` was not used. `--no-verify` was not used. Sweep output stayed in the scratchpad.**

---

## 11 · WHAT IS OPEN, AND IT IS HIS

1. ★ **Should the DOWN leg be priced at the drop authority instead of the climb authority?** It is the
   one lever that casts him reliably, it needs no new constant — only reading the limit that already
   governs the direction of travel — and it is the decision COMEBACK-STAGED-1 asked for and did not
   get. **Nothing else inside this gate will do it.**
2. **Is a one-in-ten comebacker at the big fields worth having now?** Premium 1.5 buys that much and
   costs almost nothing measurable — but it is physically wrong and 1.4 casts zero. §3.
3. **Should the premium be corrected to its realized 1.875, per leg?** A genuine accuracy defect, now
   measured. It charges excursions MORE, so it casts FEWER heroes — the opposite direction from the
   one he is asking for. **Located and costed; not built.**
