# CAMERA-PROJECTION-1 — one projection, and the scale-confusion branching removed

The camera now has a single world↔screen projection. Every zoom formula, guardrail and diagnostic
goes through it; nothing re-derives `x × zoom × scale + offset` by hand. **The picture does not
change** — proven bit-for-bit over 29,610 frames.

Branch `camera-refactor`. Return tag `pre/projection` (`54cbe5d4`), registered in
[docs/TAGS.md](../../docs/TAGS.md) in the same step. No engine ceremony, no fingerprint.

---

## BUILD-VS-SPEC CONFORMITY

| Step | Status | Note |
|---|---|---|
| **A** — one projection, per-axis, every state through it | **DONE** | `projection.js`; `_bsX`/`_bsY` arithmetic in the director: **0 occurrences**. |
| **B** — five zoom rules onto the resolution-invariant formula | **DEFERRED — owner's decision** | Asked before building; owner chose "foundation now, unit next". |
| **C** — schema bump + migration + Dev Screen labels | **DEFERRED with B** | Nothing to migrate while the semantics are unchanged. |
| **D** — remove the scale-confusion branching | **DONE** | 38 conditional sites + 3 duplicated functions → **11 sites, 0 duplicated functions**. |
| **E** — the hard-coded `285` | **DIAGNOSED, NOT SHIPPED — declared deviation** | It is not a camera change. See below. |
| TESTS — three load-bearing invariants + failure proofs | **PARTIAL — declared** | Two of three are deliverable now; the third belongs to Part B. |
| VERIFICATION — no simulation file; look-preservation; resolution sweep | **DONE** | |
| COMMIT + `pre/` tag registered in the same step | **DONE** | |

### Declared deviations

**1. Parts B and C were deferred by the owner, on a blocking finding I raised before building.**
The spec's acceptance idea was *"the change is semantic, not visual — his eye test is: it looks like
it did before."* **That is mathematically impossible**, and not by a small margin. Today's LEADER
rule shows a fixed **427 px of world at slider 3.00 on every track**. The precondition demands the
same setting show the same *fraction* of the track at any world resolution; on a 3072-px world 427 px
is 13.9%, on 6144 it is 6.9%. Any resolution-invariant rule must therefore diverge from today's on
every track except one calibration point:

| LEADER @3.00, 20 racers | today | spec's rule (racer-body) | track-width rule |
|---|---:|---:|---:|
| dirt-oval (calibration) | 427 px | 427 (0%) | 427 (0%) |
| searound | 427 px | 628 (**+47%**) | 314 (−26%) |
| city-circuit | 427 px | 472 (+11%) | 472 (+11%) |
| luger-hill | 427 px | 599 (+40%) | 599 (+40%) |
| mountainstreet | 427 px | 719 (**+69%**) | 719 (+69%) |

A second finding shaped the choice: **the spec's normaliser (`drawnBodyWidthRefPx`) is unstable in
racer count, non-monotonically.** On mountainstreet, LEADER @3.00 would give 719 px at 20 racers and
**360 px at 40** — the same slider, the same track, a 2× different shot. The four sprite-scale states
are *immune* to this today by design (L82: the body reference cancels out); adopting OVERVIEW's rule
would import it. OVERVIEW already has it (914 → 372 px, 20 → 40 racers on mountainstreet). The owner
chose to split rather than accept either, so this block ships the foundation with a passing eye test.

**2. Part E is not a camera change, and doing it here would have broken sim/browser parity.**
I implemented it, then reverted it. `W_REF = Math.min(285, effectiveWidth)` exists in **three**
places — [RaceScreen/index.jsx:449](../../client/src/screens/RaceScreen/index.jsx#L449),
[headlessRaceSimulator.js:173](../../client/src/modules/headlessRaceSimulator.js#L173) and
[scripts/sim-fairness.mjs:732](../../scripts/sim-fairness.mjs#L732) — and the value it produces flows
`W_REF → drawnBodyWidthRefPx → raceCore → racer.drawnBodyWidthPx →`
[raceBehavior.js:264](../../client/src/modules/raceBehavior.js#L264), the **separation/avoidance
physics**. Changing it in the browser alone breaks the standing sim/browser parity rule; changing it
in all three touches simulation files, which this block's own verification forbids and which needs
the engine ceremony the owner struck for camera work. It is a proven no-op on every shipped track
today (below), so nothing is lost by deferring it — but it must be its own block. Its behaviour is
now pinned by tests so that block has a target.

**3. Only two of the three required tests are deliverable.** *"Same setting, different world
resolution, same fraction of the world visible"* and *"a larger value is a closer shot in every
state"* are Part B's guarantee. Both are **false today** — that is the defect Part B fixes. Shipping
them would mean shipping a red test, or asserting a workaround. I shipped the two that are true now
(the projection is the only path; the projection is per-axis and resolution-consistent), each with a
failure proof, plus a failure proof that **documents** the absolute-scale defect rather than hiding
it. Stated here rather than quietly dropped.

---

## Part A + D — what changed

### The projection

[`client/src/modules/camera/projection.js`](../../client/src/modules/camera/projection.js) — 154
lines. It keeps **both** historical mappings, because changing either would change the picture, but
holds them as **data in one place** instead of a branch repeated at every call site:

| | closed | open |
|---|---|---|
| `cam.zoom = 1.0` means | "the whole world width fits the canvas" | "1.5 screen px per world px" |
| axis scales | per-axis: `bsX = 1280/worldW`, `bsY = 720/worldH` | uniform `1.5` on both |
| `minCamZoom` | `1.0` (can reach the whole world) | `1280/worldW` (1.5× tighter than that) |

Those are two different meanings for the same field, and every camera defect of the past week traced
back to code that assumed one of them. The single surviving decision is `projectionForTrack()`.

**Per-axis is enforced, not remembered.** `effX`/`effY`/`toScreen` are separate accessors, so the
CAMERA-FOCUS-5 defect — using the X scale on the Y axis, written three separate times — is no longer
expressible through the projection. A standing structural test blocks writing it by hand.

### The branching, before and after

| | before | after |
|---|---:|---:|
| `_isOpenTrack` conditional sites in `CameraDirector.js` | **38** | **11** |
| topology-specific functions | **3** (`_setClosedTrackTargets`, `_setOpenTrackTargets`, `_closedOffsetY`) | **0** |
| `this._bsX` / `this._bsY` used in arithmetic | 12 | **0** (fields remain; the dev HUD reads them) |
| `OPEN_TRACK_BASE_ZOOM` multiplied by hand | 9 | **0** |
| definitions of `OPEN_TRACK_BASE_ZOOM` | 2 (could drift silently) | **1** |
| `CameraDirector.js` lines | 2977 | 2851 (+154 in `projection.js`) |

`_setClosedTrackTargets` + `_setOpenTrackTargets` + `_closedOffsetY` were one algorithm written
twice; they are now `_setTrackTargets` + `_offsetYFor`. The old open-track Y formula is *exactly* what
the per-axis one reduces to when `effY == effX`, which is why the merge is bit-exact.

### The 11 remaining `_isOpenTrack` sites — 6 genuine, 5 quarantined

**The honest remainder. Six sites, and they all ask ONE question: does the track parameter wrap
(a loop) or clamp (a line)?**

| # | Site | What it decides |
|---|---|---|
| 1 | [`_tDelta` :751](../../client/src/modules/camera/CameraDirector.js#L751) | shortest circular arc vs linear delta |
| 2 | [`update()` :931](../../client/src/modules/camera/CameraDirector.js#L931) | clamp `_transitionTargetT` to [0,1] on a line |
| 3 | [`_transition()` :1564](../../client/src/modules/camera/CameraDirector.js#L1564) | the same clamp at state entry |
| 4 | [`_applyLeaderForwardBias` :1691](../../client/src/modules/camera/CameraDirector.js#L1691) | tangent sample points either side of the leader |
| 5 | [`_finishLookbackT` :2394](../../client/src/modules/camera/CameraDirector.js#L2394) | the lookback point before the finish line |
| 6 | [`_shapePosAtCamT` :2409](../../client/src/modules/camera/CameraDirector.js#L2409) | the world point at the camera's track parameter |

Sites 5 and 6 are *new consolidations*: the lookback was written out **twice, verbatim**
(CAMERA-REFACTOR-0 C3 #6) and the `_camT` normalisation **six times**. In line terms
CAMERA-REFACTOR-1 counted 13; they are 6 decisions. Plus 3 `shape.isOpen` `closePath()` calls in
`Minimap.js`, which are legitimately about drawing a loop.

**Five sites are quarantined — they branch on topology for no good reason, but removing them changes
the picture, so they are deferred and labelled as such in the source:**

| Site | Why it survives |
|---|---|
| [`:1445`](../../client/src/modules/camera/CameraDirector.js#L1445) open OVERVIEW `×0.8` ceiling | Binds on **100%** of open frames; removing it changes visible world by −19% to −32%. A *pan* problem solved with a *zoom* cap. |
| [`:1451`](../../client/src/modules/camera/CameraDirector.js#L1451) + [`:2433`](../../client/src/modules/camera/CameraDirector.js#L2433) `overviewMinEffZoom` | Documented open-only in its Dev Screen tooltip; defaults to 0, so gating preserves anyone who set it. |
| [`:2466`](../../client/src/modules/camera/CameraDirector.js#L2466) OVERVIEW-FRAMING-1 scoping | An unfinished **feature**, not a projection concern. CAMERA-REFACTOR-0 B3 conceded it must go. |
| [`:2596`](../../client/src/modules/camera/CameraDirector.js#L2596) min-vis hard floor | Open uses the `leaderMinZoom` config (0.4); closed now uses `proj.minCamZoom` (the literal `1.0` is gone). Unifying would loosen the open floor. |

One more deliberate non-fix, marked in the source: `_zoomFloorForMinVisible` still receives a
**single divisor for both axes** — the live CAMERA-FOCUS-5 survivor measured in CAMERA-REFACTOR-1 A4.
Fixing it changes the picture and was excluded by the spec. It is now the only hand-rolled scale left
in the file, and it is commented as such.

---

## The look-preservation evidence

The claim is not "it looks the same". It is **"the renderer receives the same numbers"**. Both
directors — `pre/projection` and this commit — were driven over the same recorded races with a seeded
`Math.random`, and the three values the renderer consumes (`zoom`, `offsetX`, `offsetY`) plus the
state were compared frame by frame.

```
  dirt-oval       CLOSED | shipped defaults            |  5767 frames | max |Δzoom| 0  max |ΔoffsetX| 0 px  max |ΔoffsetY| 0 px  states 0  => BIT-IDENTICAL
  dirt-oval       CLOSED | owner's (OV 1.75 / LD 3.00) |  5767 frames | max |Δzoom| 0  max |ΔoffsetX| 0 px  max |ΔoffsetY| 0 px  states 0  => BIT-IDENTICAL
  dirt-oval       CLOSED | owner's + min-vis 0         |  5767 frames | max |Δzoom| 0  max |ΔoffsetX| 0 px  max |ΔoffsetY| 0 px  states 0  => BIT-IDENTICAL
  mountainstreet  OPEN   | shipped defaults            |  4103 frames | max |Δzoom| 0  max |ΔoffsetX| 0 px  max |ΔoffsetY| 0 px  states 0  => BIT-IDENTICAL
  mountainstreet  OPEN   | owner's (OV 1.75 / LD 3.00) |  4103 frames | max |Δzoom| 0  max |ΔoffsetX| 0 px  max |ΔoffsetY| 0 px  states 0  => BIT-IDENTICAL
  mountainstreet  OPEN   | owner's + min-vis 0         |  4103 frames | max |Δzoom| 0  max |ΔoffsetX| 0 px  max |ΔoffsetY| 0 px  states 0  => BIT-IDENTICAL

  TOTAL 29610 frames across 2 tracks x 3 settings (+ the countdown path, its own entry point).
  worst |Δzoom| = 0   worst |ΔoffsetX| = 0 px   worst |ΔoffsetY| = 0 px   state mismatches = 0
```

**Framing per state, before and after, at the owner's settings** (visible world width in px — every
row identical by construction of the above):

| state | dirt-oval before | after | mountainstreet before | after |
|---|---:|---:|---:|---:|
| OVERVIEW | 441 | **441** | 914 | **914** |
| LEADER_ZOOM | 427 | **427** | 427 | **427** |
| LEAD_CHANGE | 427 | **427** | 427 | **427** |
| BATTLE_ZOOM | 456 | **456** | 456 | **456** |
| COMEBACK_ZOOM | 921 | **921** | 921 | **921** |

**One near-miss worth recording.** The first replay diff was bit-identical on 4 of 6 runs and off by
**9×10⁻¹³ px** on the other two. Cause: I had rewritten the OVERVIEW snap zoom as two chained
divisions `(px × scale) / body / axisX` where the original divided once by the product. Same value
mathematically, 1 ULP apart in IEEE 754. It appeared only at the owner's settings and only on the
closed track — because on open tracks the `×0.8` ceiling discards that expression entirely. I
restored the original association. A 10⁻¹³-px drift is not a visible change, but "bit-identical" is a
claim worth keeping literally true, and the asymmetry across settings was itself the clue.

---

## The resolution sweep

From [`projection.test.js`](../../client/src/modules/camera/projection.test.js). Re-author the same
content at k× resolution (world and every world coordinate scale by k) and ask the projection to show
a fixed fraction of the world:

| k | 0.5 | 1 | 2 | 3 |
|---|---|---|---|---|
| screen position of the same point | identical | identical | identical | identical |
| visible world fraction (W and H) | 0.25 | 0.25 | 0.25 | 0.25 |

Asserted for **closed and open**, to 6–9 decimal places. **The projection layer is
resolution-consistent.**

And the failure proof that keeps this honest — the same test file asserts that the rule the four
sprite-scale states *still* use is **not**:

```
  effZoom = spriteScale (an ABSOLUTE screen-px-per-world-px scale)
  → fraction of world visible at 2x resolution ÷ at 1x = 0.500
```

**The projection alone does not fix the owner's precondition.** It makes it *expressible*. Part B is
what makes it *true*.

**Part E, measured** (the change I reverted): `min(285, effectiveWidth)` is a **proven no-op on every
shipped track** — the widest is 300 px → effectiveWidth 285.0, so the cap never reduced anything. It
only ever binds on a track wider than any that exists, which is precisely the future case it breaks.
The tests also pin a **second** absolute ceiling behind it (`displaySize × bodyFillNarrow × maxScale`,
a racer-type constant): removing the 285 would extend the guarantee to ~2.5× the authored resolution,
not complete it. Both belong in the Part E block.

---

## VERIFICATION

```
$ git diff --stat        (this commit)
 client/src/modules/camera/CameraDirector.js      | 554 +++++++++--------------
 client/src/modules/camera/CameraDirector.test.js |  34 +-
 client/src/modules/camera/openTrackCamera.js     |   6 +-
 client/src/modules/camera/projection.js          | 154 +  (new)
 client/src/modules/camera/projection.test.js     | 185 +  (new)
 client/src/modules/rowLayout.test.js             |  35 +
 docs/TAGS.md                                     |  10 +
 reports/evolution/CAMERA-PROJECTION-1.md         |  new
 reports/evolution/INDEX.md                       |   1 +

$ npx vitest run
 Test Files  163 passed (163)      Tests  3392 passed (3392)
```

**No simulation file is in the diff.** The only non-test source files are
`client/src/modules/camera/{CameraDirector,projection,openTrackCamera}.js` — the camera module, which
nothing in the engine imports. `rowLayout.test.js` is a **test** file; the module it tests
(`rowLayout.js`) is untouched.

**Paths I treated as simulation:** `client/src/modules/{raceStep,raceCore,raceBehavior,raceGovernor,
racePlanner,raceBaseSpeed,raceDynamicsConfig,raceBehaviorConfig,durationModel,raceLengths,rowLayout,
heroChoreography,heroCurveGenerator,headlessRaceSimulator}.js`, `client/src/modules/parity/**`,
`client/src/modules/storage/defaults.js`, `scripts/sim-fairness.mjs`, `scripts/exp-*.mjs`. **This is
exactly why Part E was reverted**: doing it properly requires `headlessRaceSimulator.js` and
`sim-fairness.mjs`, two files on that list.

`client/src/screens/RaceScreen/index.jsx` is **not** in the diff. It is not a simulation file, but the
value Part E would have changed reaches `raceBehavior`'s separation physics, so touching it would have
demanded the ceremony this block does not run.

---

## THE OWNER'S EYE DECIDES (Lesson 191)

**The expected result is NO visible change at all. A visible change is a finding, not a success** —
if you see one, that is a defect in this refactor and I want to know immediately rather than have it
accepted.

1. **Restart the dev server** (the bundle must be fresh — a stale bundle would make this test
   meaningless).
2. **Quick Test → Dirt Oval, seed 5601**, your current camera settings (OVERVIEW 1.75 / LEADER 3.00).
   Watch a full race.
3. **Look for:** the OVERVIEW wide shot, the leader follow, a battle, a lead change, the finish
   pull-back. Each should be framed exactly as you remember it. Same zoom, same position, same timing.
4. **Then one OPEN track** (Mountainstreet or your usual) — the open path changed most in the code
   even though it must look identical, so it is the better test of the two.
5. **Paste the `[RA CAMERA LIVE TRUTH]` line** from that session's console so I can confirm which
   bundle and which config actually ran.

If anything looks different, tell me *what* and *when* — that is a bug in the merge and the replay
diff missed a path.

---

## What I could not determine, and why

1. **Whether the open-track `×0.8` OVERVIEW ceiling is still needed.** Its comment says it stops the
   leader leaving the canvas during a pan. It binds 100% of the time, so it is doing all the work on
   open tracks — but whether the pan problem it guards still exists is a live eye question, not a
   measurement. It must be answered before Part B removes it.
2. **The owner's actual racer count and `overviewTargetScreenPx`.** The deferral table assumes 20
   racers and the shipped 28 px. The racer-count instability finding is *worse* at other counts, not
   better, so the conclusion holds either way — but the exact deltas he would see depend on it.
3. **Whether any user-authored track exceeds 300 px of track width.** Part E's no-op proof covers the
   ten shipped seeds. A custom track wider than that would already be hitting the cap today.

---

## What I judged to be over-securing, and what I did instead

1. **A fingerprint.** The spec struck it and the diff carries the proof — no simulation file. **I ran
   none.** But I did *not* treat that as licence: when Part E turned out to touch a value that reaches
   `raceBehavior`, I followed the dependency rather than the file list, and reverted. The rule is
   "the diff proves the physics is untouched"; that only works if you check where the values go.
2. **Running the full 3392-test suite repeatedly.** I ran the camera + rowLayout suites during the
   refactor (fast, targeted) and the full suite **twice** — once mid-way, once at the end. Running it
   after every edit would have cost ~3 minutes each for no added information.
3. **A failure proof for every assertion.** The spec asked for them on the three load-bearing tests
   only, and said so explicitly. `projection.test.js` has 15 tests and **3 failure proofs**; the
   contract tests (freezing, clamping, degenerate worlds) have none.
4. **A second recorded race per track.** The camera stream is deterministic given
   `(racer frames, config, seeded RNG)`. A second seed would produce a second identical-by-construction
   comparison. **Instead I spent that budget on a third setting** (min-vis 0) and on the countdown
   path, which is a separate entry point the replay would otherwise never have touched.

---

## PROPOSALS

### P1 — with the projection in place, which known defects become trivial and which stay hard?

**Trivial now** (each is a few lines, and the projection makes the fix expressible in one place):

- **The `_zoomFloorForMinVisible` two-axis defect.** It is now the *only* hand-rolled scale left in
  the director. The fix is to pass the projection instead of a divisor and use `effY` on `dy` — three
  lines. It is only "hard" in the sense that it changes the picture (it would raise the floor ~6–7% on
  58–69% of frames, cutting the lap-2 override from 25.7% to 21.9%), so it needs an eye test, not
  more design.
- **The duplicated `CANVAS_W = 1280` in three files.** The projection already owns
  `REFERENCE_CANVAS_W`; the RaceScreen and the diagnostics HUD can import it.
- **The open-track `×0.8` ceiling.** Now a single labelled line rather than a branch tangled through
  the zoom chain — one deletion plus one eye test.

**Still hard, and unchanged by this block:**

- **The slider unit (Part B).** Hard because it is a *taste* decision with no correct answer from
  measurement: any resolution-invariant rule changes the framing on every track but one, and the two
  candidate normalisers trade racer-count stability against unit intuitiveness. Only the owner's eye
  settles it.
- **The `285` and the racer-type ceiling (Part E).** Hard because it is *not a camera problem*: three
  call sites, a parity rule, and a value that reaches the separation physics. It needs the ceremony.
- **The OVERVIEW framing rule.** Hard because it is an unfinished feature whose own measurements were
  wrong (CAMERA-REFACTOR-0 B2/B3), not because of the projection.

**The useful generalisation:** the projection made the *mechanical* defects trivial and left the
*semantic* ones exactly as hard as they were. That is the correct outcome for a refactor — it should
buy leverage, not answers.

### P2 — make the "only path" guard structural for the renderer too

The new structural test stops the director re-deriving a projection by hand. **The renderer still
does it**: `RaceScreen/index.jsx` computes `frameEffZoom = cam.zoom * bsX` and calls
`ctx.scale(cam.zoom * bsX, cam.zoom * bsY)` from its own constants, and `CameraDiagnosticsHUD` computes
a third copy. Those are the numbers the director's projection is *supposed* to be predicting — and
nothing checks that they agree. If they ever drift, every camera guarantee in this report silently
becomes a statement about a mapping the screen does not use.

Cheap fix, no behaviour change: have `RaceScreen` construct the projection once and pass it to the
director *and* use it for `ctx.scale`, so the screen and the camera are provably the same mapping.
Then extend the structural test to the render path. This is the single highest-value follow-up, and it
is a precondition for trusting Part B's guarantee end-to-end.

### P3 — record the near-miss as a standing check, not a memory

The 1-ULP drift was caught only because the replay diff asserts *exact equality* rather than
"close enough". Every future camera refactor claiming "no picture change" should run the same
before/after replay diff, and it should assert `=== 0`, not a tolerance. It costs seconds and it is the
camera's honest equivalent of a fingerprint. The harness is throwaway today; making it
`scripts/exp-camera-replaydiff.mjs`, parameterised by two commits, would make "prove it looks the
same" a one-command claim for the whole project.
