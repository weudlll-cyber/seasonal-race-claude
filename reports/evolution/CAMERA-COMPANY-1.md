# CAMERA-COMPANY-1 — the dramaturgical guarantee: do not show emptiness

Branch `camera-refactor`. Camera-only: **no simulation file in the diff**, no engine ceremony, no
fingerprint. Return tag `pre/company` (`5383750b`), registered in [TAGS.md](../../docs/TAGS.md) in
the same step.

**I was wrong to delete this.** In CAMERA-FRAMING-1 I removed the min-racers floor as "a guarantee
phrased as a headcount". The owner corrected the reading and he is right: it was never a count
control, it was a **dramaturgical** guarantee. He zooms LEADER in tight on purpose, and when the shot
goes empty — the leader alone, no reference, no tension — the camera should widen by itself. His
screenshot after the framing block is what its absence costs: *"das ist nicht spannend."*

The **concept was right; the implementation was broken** — one axis scale applied to both (the third
instance of the bsX/bsY defect) and a zoom number that meant something different on every track. Both
are fixed now, which is exactly why the idea comes back cleanly.

---

## 1. BUILD-VS-SPEC CONFORMITY

| Asked | Status |
|---|---|
| A LIMIT, not a correction — never in-then-out | **DONE** — `min(setting, geometric, dramaturgical)` computed before the camera moves; pinned by a no-pumping test (§4) |
| Measure how much the limit moves; report before he looks | **DONE** (§3) — amplitude and reversal rate, three tracks × three settings × four values |
| Do not build hysteresis pre-emptively | **NOT BUILT** — measurement says it is not needed at the default (§3) |
| A different KIND of guarantee, named as such | **DONE** — `GUARANTEE.COMPANY`, documented as dramaturgical against the two geometric ones; deliberately not folded into the corridor |
| Propose its form rather than assuming | **DONE** (§2) — "at least N in frame" kept, with the one change measurement forced |
| Propose which states it applies to | **DONE** (§5) |
| Dev Screen control, sensible default | **DONE** — "Company: min racers in frame", default **3**, measured (§3) |
| Tests adapted AND extended, with a failure proof | **DONE** — 15 new including two failure proofs (§6) |
| Hygiene with line counts | **DONE** (§6) |

**Deviation declared:** one, and it is a defect the tests caught mid-build — see §2, `reach`.

---

## 2. THE FORM, AS BUILT

**"At least N racers in frame, counting the subject."** That is what he had and understood, and it is
what shipped. Two things changed under it:

**Ranking by requirement, not by distance.** The old floor ranked companions by world distance and
then applied one axis scale to both axes. The new one ranks each candidate by **the zoom it would
require** — which is both the fix for the per-axis defect and the orientation-aware form. On a closed
track the frame reaches further horizontally than vertically, so a racer 300 px beside the leader is
cheaper to include than one 300 px above him; the guarantee asks the frame instead of assuming.

**`reach` — the correction the tests forced.** The corridor and pair vectors span between two things
that must *both* be in frame, so they are compared against the whole frame extent. A company vector
runs **from the anchor**, which sits at or near the centre, so only the part of the frame on that side
is available. My first cut compared against the full extent — permitting a shot **twice as tight as it
should be**, with the guaranteed company falling off the far edge. Caught by the director-level test,
not by review. `reach` is 0.5 for a centred subject and the forward fraction (0.66) for a
forward-framed one — a leader at 0.66 along the frame has 0.66 of it behind him, which is exactly
where his company is.

It is a **LIMIT**: `targetZoom = min(setting, geometric guarantee, company guarantee)`, computed
before the camera moves. It never zooms in and then backs out. That in-then-out shape is pumping, and
pumping is a failure class this project has already paid for.

---

## 3. HOW MUCH THE LIMIT MOVES — measured before he looks

Real seeded races, LEADER held for the whole race, target zoom recorded per frame in **track widths**.
"swing" is p95−p05; "revs/s" is direction changes per second; "ALONE" is the share of frames with the
leader and nobody else on canvas.

**searound @ LEADER 1** (his stated setting, the tightest case):

| minVis | mean | swing | revs/s | ALONE | <3 in frame |
|---:|---:|---:|---:|---:|---:|
| 0 (off) | 1.29 | 0.50 | 0.32 | **4%** | **7%** |
| **3** | **1.40** | **0.98** | **0.65** | **2%** | **2%** |
| 5 | 1.56 | 1.27 | 0.95 | 2% | 2% |
| 8 | 1.81 | 1.46 | 1.31 | 2% | 2% |

**dirt-oval @ LEADER 1:**

| minVis | mean | swing | revs/s | <3 in frame |
|---:|---:|---:|---:|---:|
| 0 (off) | 1.31 | 0.50 | 0.28 | 3% |
| **3** | **1.34** | **0.50** | **0.35** | **0%** |
| 5 | 1.37 | 0.72 | 0.49 | 0% |
| 8 | 1.48 | 1.00 | 0.49 | 0% |

**Is it restless?** At the default it is **breathing, not pumping**: 0.35–0.65 direction changes per
second, i.e. one every 1.5–3 seconds, with a swing of 0.5–1.0 track widths. That is slower than the
camera's own tracking lag and well inside what a viewer reads as the camera responding rather than
fidgeting. **No hysteresis proposed** — the instruction was measure first, and the measurement says it
is not needed here. At **8** it does approach restless (1.31 rev/s on searound, swing 1.46) and buys
**no further emptiness protection**; if he sets it that high and dislikes the motion, Lesson 190 is
the known remedy (change only when the change is decisive, never on a timer) and should be built then,
not now.

**Why 3 is the default.** It removes thin frames entirely on dirt-oval (3% → 0%) and halves them on
searound (7% → 2%, alone 4% → 2%) at almost no cost — the swing is unchanged on dirt-oval and the mean
shot barely moves (1.31 → 1.34). 5 and 8 buy nothing more in emptiness and cost real shot and real
motion. Sensible, not clever.

**One honest residual: 2% of frames on searound are still "alone" at any setting.** The guarantee is on
the TARGET zoom; the live zoom trails it by the tracking lag reported in CAMERA-FRAMING-1 §6 (5.8–7.9pp
in LEADER). The guarantee cannot un-lag the camera. If those 2% bother him, the fix is the lag
conversation, not a higher minVis.

---

## 4. IT IS A LIMIT, NOT A CORRECTION

He asked this directly: *does the camera zoom all the way in and then back out, or does it not go that
far in the first place?* **It does not go that far.** The guarantee is one of three terms in a
`Math.min` evaluated before the camera moves.

Pinned by a test: with a static field the limit is constant, so the target zoom must be constant too —
`max(target) − min(target) < 1e-6` over 100 settled frames. If anyone ever reintroduces an
in-then-out correction, that test fails.

---

## 5. WHICH STATES — recommendation, implemented

**Applies to the single-subject shots: LEADER_ZOOM, COMEBACK_ZOOM, OVERVIEW.**
**Does not apply to the pair shots: BATTLE_ZOOM, LEAD_CHANGE, PHOTO_FINISH.**

The pair states already guarantee two named contenders, which *is* company — the whole point of the
shot is two racers in frame together. Adding a headcount there would put a second, differently-phrased
guarantee on top of one already doing the job, and the two would fight whenever the field is strung
out behind a close duel. OVERVIEW is included even though it never binds at its 4-track-width default
(measured: 0% of frames): it is a single-subject shot, the rule is the same rule, and excluding it
would be a special case with no reason behind it.

Asserted by a test, state by state.

---

## 6. HYGIENE AND TESTS

**Restored:** `minRacersVisible` as a config key (default 3) and its Dev Screen control, now labelled
**"Company: min racers in frame"** with a tooltip that says what kind of guarantee it is and that 0
turns it off. It is a *different mechanism* from the deleted floor sharing the same key name — the key
is the one the owner already understood, which is why it was kept.

**Not restored, and should not be:** `leaderMinZoom`, `leaderMinZoomFraction`, `zoomOutStepPerFrame`.
Those were the floor's *ratchet and clamps* — the machinery that made it steer. A limit needs none of
them.

**Nothing orphaned by this change.** The one existing test that asserted `_minRacersVisible` was
undefined is updated in place, with a comment recording why: the mechanisms are still gone, the
concept came back.

### Line counts

| file | before | after |
|---|---:|---:|
| `camera/framingRule.js` | 236 | **310** |
| `camera/framingRule.test.js` | 262 | **498** |
| `camera/CameraDirector.js` | 2682 | **2725** |
| `camera/CameraDirector.test.js` | 6094 | 6102 |
| `storage/defaults.js` | 716 | 723 |
| `DevScreen/sections/CameraAdvancedSection.jsx` | 1416 | **1429** |

### Tests — 15 new, two of them failure proofs

The guarantee keeps exactly the company asked for; a tighter demand is monotonically a wider shot; 0
and 1 disable it; asking for more company than the field contains takes what exists rather than
zooming to a point; finished racers are not company; the inner-frame fraction and `reach` both scale
it as stated.

> **Why finished racers are not company — written down 2026-08-05, three days late, by
> [FINISH-COMPANY-1](FINISH-COMPANY-1.md).** This property was tested here but its reason was never
> recorded, so the next block had to re-derive it. It is NOT that their positions go stale: measured,
> a finished racer keeps advancing (`t` +0.010–0.012, 62–75 world px over the 60 frames after
> crossing). The real reason is that including them does not help — the finish anchor is the FIXED
> lookback point, so finished racers run out *away* from it exactly as stragglers fall *back* from
> it, and counting them widens the shot MORE (54 → 55 frames, 2.9752 → 2.8760). See
> [DEAD-ENDS §J](../../docs/DEAD-ENDS.md).

**Failure proof 1 — ranking by raw distance** picks the wrong companion (the nearer-in-world-px one
above the anchor rather than the cheaper one beside it) and crops it at its own zoom. That is exactly
what the old floor did.

**Failure proof 2 — the no-pumping test** above.

Through the director: it catches a tight LEADER setting when the shot would go empty (0.5 track
widths, broken-away leader → widens and at least three racers are in frame); it leaves a generous
setting untouched; it applies to the three single-subject states and to none of the pair states; and
turning it off reproduces the pre-guarantee zoom exactly.

**843 camera + config + Dev Screen tests green; full suite green.**

---

## 7. THE OWNER'S EYE

**"Can I zoom LEADER in tight without the shot ever going empty, and does the picture stay calm while
I do?"**

1. **Set LEADER to 1, or below.** Watch a break-away — a leader with a gap behind him. The camera
   should refuse to go as tight as you asked, exactly then and not otherwise, and you should always
   have at least two other racers on screen for reference.
2. **Then watch the calm.** The limit moves with the field, so the shot breathes. Measured at the
   default it changes direction about once every two seconds and swings about half a track width —
   that should read as the camera responding, not fidgeting. **If it fidgets, tell me and I will build
   the decisive-change rule** (Lesson 190); I have deliberately not built it in advance.
3. **The control is "Company: min racers in frame" in Camera Advanced, default 3.** 0 turns it off
   entirely — worth one race with it off to see the emptiness it prevents. 8 is available but buys no
   further protection and does make the camera busier; the numbers are in §3.
4. **It does not apply to battles, lead changes or photo finishes** — those already guarantee both
   contenders, which is the same thing by another name.

One thing it cannot fix: the camera still trails its own target, so about 2% of frames on Searound can
be briefly emptier than the guarantee intends. That is the tracking lag, still unfixed and still your
call.

Press **M** and send the **whole** line.
