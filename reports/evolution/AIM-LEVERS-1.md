# AIM-LEVERS-1 — two candidates for his eye, and the fault is smaller than the brief's numbers say

> **BUILT, MEASURED, NOT MERGED, NOT MINTED.** Branch `feat/aim-levers-1` @ `38b19379`, served on
> 4173. Both levers sit behind keys whose **default is OFF**, and all four fingerprints are
> byte-identical at those defaults — master's picture is untouched until he has judged them.

**I am not picking between them.** Both work; they cost different things, and one of the costs is not
measurable. What follows is the evidence and the two costs stated plainly.

---

## 0. FIRST — THE PREMISE HAS MOVED, AND THE BRIEF'S FRAMING IS SUPERSEDED

The brief sizes the fault as *"the aim leaves 261.8 px ahead, the rocket's half-length eats 131.4,
leaving 130.4 against a median gap of 142.9 — short by about twelve pixels."*

**Two of those four numbers are current and two are not.** Re-running LEADER-LAG-TRUTH-1's own
instrument today, on its own corpus (n=20, seeds 1–10, space-sprint):

| quantity | that report | **today** | |
|---|---|---|---|
| half-length median | 131.4 | **131.4** | unchanged — sprite geometry |
| room the aim leaves | 261.8 | **261.8** | unchanged — frame geometry |
| tolerance (medians subtracted) | 130.4 | **130.4** | unchanged, being derived from those two |
| **median gap** | 142.9 | **112.7** | **MOVED** |
| **clip rate** | 15.4% | **3.26%** | **MOVED** |

**LEADER-LAG-TRUTH-1 predates the lateral guarantee.** Its 15.4% is explicitly the BEFORE arm of the
work that shipped as LEADER-LATERAL-BUILD-1 (which recorded space-sprint 15.4% → 3.3%). The two
geometry numbers survived that ship; the two behaviour numbers did not.

**So the median case is not short by twelve pixels — it clears by about eighteen**, and per frame the
median headroom is +48 px. `tolerance > gap` is **YES on every track and every arm, including the
shipped baseline**, in every table below.

**That does not mean there is no fault.** 3.46% of mid-race `LEADER_ZOOM` frames still clip on
space-sprint at N=300, in 1,065 episodes. But the fault lives in the **tail**, not at the median:
per-frame headroom is +48 at p50 and **−134 at p10**. A lever sized to close a twelve-pixel median
shortfall would be sized against a number that no longer exists — so both levers below are sized
against the tail, and the coverage they buy is stated as a share of it.

## 1. LEVER A'S GATE — it passes, but the trap the brief named was real and live

**The question:** does `bodyFillLong/bodyFillNarrow` govern what is DRAWN, or only what the director
reasons with? **Answer: BOTH, through two independent paths from the same raw fills.**

| path | where | consumes |
|---|---|---|
| **DRAWN** | `SpriteRacerType._drawBody` | `bodyFill*` + `displaySize` → the sprite on screen |
| **REASONED** | `raceCore.js` → `drawnBodyLengthPx` | the physics (brake-T, avoidance) and the framing rule |

The renderer never reads `drawnBodyLengthPx` (grepped: zero hits in `client/src/screens/`). **They are
genuinely separate, and a cap applied only to the second would have removed the counting of clipping
without removing the clipping** — precisely the failure the brief warned about, and the fourth such
in a fortnight. So the key drives both through **one exported function**, `guardedBodyFillNarrow`.

**A mechanism already existed for this.** `SpriteRacerType` carries a *sleeping* long-axis guard,
`BODY_LONG_AXIS_MAX_RATIO = 5.0`, documented as inert for all twenty types. Lever A wakes it rather
than inventing a second mechanism.

**AND THAT DECIDES WHAT THE COST LOOKS LIKE — the brief's guess is wrong here.** The guard caps the
long axis by raising the divisor in a **uniform** scale, so the sprite shrinks in *both* axes and
keeps the artwork's proportions. **The rocket is drawn SMALLER, not stubbier**: at 2.5 its narrow axis
goes 28.5 → 24.7 world px along with its length. That is materially close to the sprite-floor change
**he has already rejected once**, and he should judge it knowing so.

## 2. LEVER B'S ARITHMETIC — his derivation is exactly right

Checked before building, on real frames (`scripts/diag/room-floor-estimate.mjs`), 10 races per track:

| track | forwardFrac | chord med | room measured | **chord × (1 − frac)** | |
|---|---|---|---|---|---|
| space-sprint | 0.66 | **770.0** | 261.8 | **261.8** | exact |
| river-run | 0.66 | 1,313.5 | 446.6 | **446.6** | exact |
| seatrack | 0.66 | 993.1 | 337.6 | **337.6** | exact |
| dirt-oval | 0.66 | 1,280.0 | 435.2 | **435.2** | exact |

**The formula reproduces to the digit on all four tracks**, and the chord on space-sprint is 770 —
his "about 770" was right. (river-run measures 1,313 rather than his 1,346; a median over real
headings, not a disagreement about the geometry.)

**Where the ~1.6 pp estimate lands.** It is arithmetically correct — 12 px ÷ 770 = 1.56 pp — but it is
sized against the superseded 142.9 gap. Against today's numbers the median needs nothing, and closing
the **tail** costs far more:

| room floor | forwardFrac becomes | covers, of forward-clipped frames |
|---|---|---|
| 280 | 0.636 | 7.7% |
| 300 | 0.610 | 20.7% |
| **360** | **0.533** | **53.6%** |
| 400 | 0.481 | 67.4% |

**83.7% of space-sprint's clipped frames are the nose past the forward edge**, so the lever is aimed
at the right thing — but half the tail costs about 13 pp of forward fraction, not 1.6.

**Built as a floor, as asked.** `forwardFracForRoomFloor(frac, span, floor)` reduces the fraction only
where `chord × (1 − frac)` falls under the floor — it needs no table and no per-track key, is inert
where the chord is long, never pushes past centre, and declines to touch a run-in placement already
below 0.5. **One helper, used by both `anchorScreenPoint` and `_applyLeaderForwardBias`**, because
`framingRule.js`'s own contract is that the aim and the pan cannot disagree.

## 3. STAGE 1 — 30 races, four tracks, five arms

Per track, never pooled. Every arm against `off` at the same N.

**space-sprint** — 47,330 mid-race `LEADER_ZOOM` frames:

| arm | room | half-len | tolerance | gap med | tol>gap | clip% | **CLIP EPS** | Δeps | centre% | step p99 | step max |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **off (shipped)** | 258.9 | 131.4 | 135.3 | 106.8 | YES | 3.64 | **109** | +0 | 70.01 | 175.7 | 512.6 |
| a (cap 2.5) | 259.8 | **114.0** | 153.6 | 119.1 | YES | 2.80 | **78** | **−31** | 79.99 | **185.0** | **525.5** |
| b300 | 300.0 | 131.4 | 168.6 | 130.3 | YES | 2.95 | **88** | −21 | 85.83 | 175.2 | 509.9 |
| b360 | 360.0 | 131.4 | 228.6 | 134.0 | YES | 2.62 | **79** | **−30** | 92.20 | 175.1 | 506.5 |
| ab300 | 300.0 | 114.0 | 186.0 | 131.4 | YES | 2.60 | **71** | −38 | 89.43 | 185.0 | 522.5 |

**river-run, seatrack, dirt-oval — Lever A is BIT-IDENTICAL to the shipped arm on all three.** Same
frame count, same clip count, same episodes (river-run 177/22, seatrack 853/63, dirt-oval 595/41).
That is the "eighteen of twenty untouched" claim confirmed at race level, not just in the unit test.
Lever B moves them a little: b360 gives −2 episodes on river-run, −7 on seatrack, −2 on dirt-oval.

## 4. STAGE 2 — 300 races, the arms with a case

b300 dropped (b360 dominates it at the same steadiness); river-run dropped (A inert, B moved two
episodes at N=30).

**space-sprint — 300 races, 470,658 frames:**

| arm | room | half-len | tolerance | gap med | tol>gap | clip% | **CLIP EPS** | Δeps | centre% | step p99 | step max | loud |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **off (shipped)** | 262.1 | 131.4 | 140.4 | 112.2 | **YES** | 3.46 | **1065** | +0 | 69.47 | 187.2 | 838.5 | 298/300 |
| **a** | 262.2 | 114.0 | 157.4 | 118.5 | YES | 2.81 | **858** | **−207** | 79.17 | 189.8 | 862.8 | 296/300 |
| **b360** | 360.0 | 131.4 | 228.6 | 141.7 | YES | 2.56 | **782** | **−283** | **88.93** | **187.3** | 849.0 | 298/300 |
| **ab360** | 360.0 | 114.0 | 246.0 | 132.9 | YES | 2.30 | **725** | **−340** | 91.45 | 190.2 | 866.0 | 296/300 |

**seatrack — 300 races, 409,571 frames:** off 480 episodes → b360 **448 (−32)**, clip 1.42% → 1.31%,
centre 82.31% → 85.04%, step p99 210.9 → 210.8, step max 1287.5 → 1281.3.

### What the table says, in order of how much it should weigh

**1. Lever B beats Lever A on the fault AND costs less steadiness.** −283 episodes against −207, with
`step p99` flat (187.2 → 187.3) where A moves it +2.6, and `step max` +10.5 where A moves it +24.3.
On the owner's own centreline rule B is far better: **69.5% → 88.9%** against A's 79.2%.

**2. Lever A changes the RACE; Lever B changes only the PICTURE.** A's frame count is 470,323 against
the baseline's 470,658 — the bodies feed brake-T and avoidance, so the races themselves differ. B's
is 470,658, identical to the digit. **That asymmetry is larger than any number in the table**: B is a
framing change he can accept or reject on looks alone, while A alters who is where.

**3. Both together are best on the fault and inherit A's steadiness cost.** −340 episodes, but
`step p99` 190.2 and `step max` 866.0, the loudest of the four arms.

**4. Every arm raises `step max` a little** (838.5 → 849–866). Reported because it is on the
steadiness side and it moves the wrong way in all four arms; it is a maximum over 300 races and
therefore the noisiest column here.

**5. No arm makes tolerance exceed the gap, because it already does.** That column reads YES on the
shipped baseline too — see §0.

## 5. WHAT EACH COSTS HIM — not measurable, and his to judge

**LEVER A — the rocket is drawn smaller.** Not stubbier: the mechanism scales the whole sprite, so
the narrow axis shrinks with the long one, 28.5 → 24.7 world px. **This is close to the sprite-floor
change he rejected before**, arrived at from a different direction. It also changes the races on
space-sprint, and it is bit-identical everywhere else.

**LEVER B — he sees less of the road ahead of the leader.** At a 360 px floor the leader sits at an
effective 0.533 of the frame instead of 0.66 on space-sprint's steep headings — very nearly centred —
and unchanged on shallow ones. He has said repeatedly that seeing ahead matters to him. **The floor
is the whole cost and it is exactly the thing he values**; that no measurement here can price it is
the reason this ends with a build and not a recommendation.

## 6. WHAT WAS RUN, AND WHAT WAS NOT (R15e)

- **All four fingerprints: RUN, and byte-identical at the defaults** — world, world-off, camera and
  render all equal to [docs/fingerprints.json](../../docs/fingerprints.json), re-run on the settled
  tree. That is what makes "master's picture is untouched" a fact rather than a claim.
- **Full client suite: RUN, green** — 230 files, 4,327 tests, including 8 new `aspectCap.test.js`
  assertions.
- **`engine-reach --check` selects only `defaults.js`** on the final diff.
- **Browser gate: NOT RUN.** Both keys default OFF and the four fingerprints are unmoved, so the
  delivered picture is byte-identical and the gate cannot answer differently (R15a).
- **80-race acceptance sheet: NOT RUN.** Same reason.
- **Two MEASURED stamps re-stamped deliberately rather than re-measured** (`CAMERA_DIRECTOR.md`
  tracking-lag, `ENDING-PHASES.md` straggler-truth), because the camera fingerprint is byte-identical
  at the defaults. Both notes say that if either key is ever defaulted ON, the numbers must be
  re-measured for real.

### Three things that went wrong and were caught

**`engineInputs.test.js` caught the first cut** importing `guardedBodyFillNarrow` into `raceCore.js`.
Its suggested remedy — add the module to `ENGINE_INPUT_MODULES` — would have pulled the racer-type
registry (40 modules, reaching `services/` and `storage/`) into the engine hull for a lever that is
off by default. **`raceCore` is now untouched**; the callers pass the guarded number it already takes
as a parameter.

**The harness had the same hole, and it would have been silent.** `scripts/lib/raceDriver.mjs` builds
races itself, so after that revert it would have run Lever A's arm with an *uncapped* body and
reported the lever does nothing. **A sweep already in flight was killed and its output discarded**
rather than reported; every number above comes from a re-run on the settled tree.

**The measured-stamp guard blocked the commit** and was right to. The re-stamp is justified by a
fingerprint, not by a judgement.

## 7. HOW HE SEES THEM WITHOUT A REBUILD

Served on **4173** from `feat/aim-levers-1`, production build, backend up. Both candidates are live in
**Dev Screen → Camera Advanced → section 3 · LEADER_ZOOM**, directly under "Leader forward-frame":

- **"Aim room floor (px) [candidate B]"** — 0 = Off (shipped), slider to 480. Try **360**.
- **"Body aspect cap [candidate A]"** — 0 = Off (shipped), slider to 4.0. Try **2.5**.

Both take effect on the **next** race, not the running one (`RaceScreen` reads the camera config once
at mount). Confirmed present in the served bundle by their test ids.

## PROPOSALS

**P1 — no recommendation between A and B, deliberately.** The measurable axes favour B on both
counts, and B leaves the races alone. But B's cost is the one thing he has repeatedly said he cares
about, and A's cost is a sprite change he has rejected once already. **That is a taste decision with
two unmeasurable costs and it is his.**

**P2 (mine) — if either ships, `leaderBodyAspectMax` must not stay in the camera config.**
`configFingerprint.js` classifies `cameraConfig` as **COSMETIC**, and Lever A changes the physics —
so a race run with the cap on would be recorded as "on defaults" when it is not. Lever B is genuinely
cosmetic and is fine where it is. **This is a blocker for A and not for B**, and it is a five-minute
fix in the right place rather than something to discover after a ship.

**P3 (mine) — the tail, not the median, is the shape of every future sizing here.** §0's correction
cost this piece its first hour. The numbers to quote from now on are: clip rate **3.46%**, **1,065
episodes** over 300 races, per-frame headroom **+48 at p50 and −134 at p10**.
