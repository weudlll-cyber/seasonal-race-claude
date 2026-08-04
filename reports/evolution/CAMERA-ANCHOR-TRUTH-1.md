# CAMERA-ANCHOR-TRUTH-1 — the framing measures from where things are

**Date:** 2026-08-04 · **Branch:** `anchor-truth` (never master) · **Base:** `c299fdf7`, verified
with `git rev-parse master` before branching — it matched the tip the spec named.
**Tag:** `pre/anchor-truth` → `c299fdf7`, registered in [TAGS.md](../../docs/TAGS.md) in the same commit.

**BASELINES ON THE UNTOUCHED TREE, recorded before anything was touched — both matched, so the
instrument stop-rule did not fire:** camera `4b33c4d31bec93ea`, render `ae7e9243bd2add8b`.

---

## 1. BUILD-VS-SPEC CONFORMITY

Every element of the spec, before any numbers.

| Spec | Status | Note |
|---|---|---|
| Base verified with `git rev-parse`, reported | **BUILT** | `c299fdf7`, tree clean |
| Branch `anchor-truth`, never master | **BUILT** | |
| Tag `pre/anchor-truth` + TAGS.md in one commit | **BUILT** | commit `b43eb319` |
| Baselines recorded before touching anything | **BUILT** | both matched exactly |
| **§2 Stage 1a** — extract the transition DECISION, machine-readable reason | **BUILT** | `transitionDecision.js`, `{action, reason}` |
| §2 — call site keeps every action and every `this` assignment | **BUILT** | |
| §2 — photo-finish gate split honestly, or left alone with a reason | **BUILT, split** | the split is honest; §4 argues why |
| §2 — tests pinning the five reasons and the hold gate | **BUILT** | +29 tests incl. full precedence |
| §2 — do NOT extract the transition machinery | **RESPECTED** | |
| §2 — do NOT touch `_computeTimingConfig` | **RESPECTED** | |
| **§3 Stage 1b (a)** — delete the two stale ARCHITECTURE sections, pointer only | **BUILT** | one move made, one deliberate non-move argued |
| §3 (b) — correct the `deploy.yml` file-tree line | **BUILT** | |
| §3 (c) — keep `deploy.yml`, add a header | **BUILT** | |
| §3 (d) — BACKLOG "Before the VPS migration" | **BUILT** | four items, recorded not fixed |
| §3 — run the link guard | **BUILT** | 321 links, 0 dangling |
| **§4a** — corridor measured from the anchor, both sides | **BUILT** | defect confirmed then repaired |
| §4a — centred-anchor equality asserted | **BUILT** | exact to 10 dp, every 1°, 3 projections |
| §4a — measure before and after, spread + Mountainstreet | **BUILT** | §3 below |
| **§4b** — point vs nose framing | **NOT SHIPPED — hypothesis REFUTED** | before-number 0.238%; the spec's own stop rule |
| **§4c** — OVERVIEW lag decided by measurement | **BUILT** | `trackingTC` shipped, `entryTC` deliberately not |
| §4c — tooltip must match the shipped default | **BUILT, with a deviation** | see §6 — it could not have been wrong |
| §4c — mint tripwire, world must be `dc4647be0f55ebdb` | **BUILT** | unmoved |
| §5 — Stage 1 both fingerprints bit-identical at every commit | **BUILT** | run, not argued |
| §5 — Stage 2 deltas recorded per commit | **BUILT** | §5 table |
| §5 — tests adjusted AND extended incl. where none existed | **BUILT** | +40 |
| §5 — re-mint both as branch baselines in report + ceremony | **BUILT** | SHIP-CEREMONY + CAMERA_DIRECTOR updated |
| §5 — owner's eye list | **BUILT** | §8 |
| §6 — hygiene limited to what this change orphans | **BUILT** | §7 |
| §9 — conformity first, deviations declared by me, ≥2 own proposals | **BUILT** | §6, §9 |

**DEVIATIONS, declared by me rather than found:** three, all in §6.

---

## 2. STAGE 1 — behaviour-free, and provably so

**Both fingerprints held BIT-IDENTICAL at both Stage 1 commits.** I ran them rather than arguing
that a docs commit cannot move a hash — the point of the gate is that it is mechanical.

**1a — the transition decision (`54fc50c1`).** The first ~85 lines of `update()` were five OR-ed
exit conditions plus the hold gate; the REASON a transition fired existed only as control flow, which
is why [CAMERA_DIRECTOR.md](../../docs/CAMERA_DIRECTOR.md) §6 listed it as protected by convention
only. `decideTransition()` now returns `{action, reason}` and is pure — it assigns nothing and
touches no `this`. **Precedence is behaviour**, not style: the first match won, in a fixed order, and
five ordering tests pin it.

*The photo-finish gate split IS honest, and I checked rather than assumed.* The original set two
latches while evaluating. The predicate is entirely questions about the field; both latch writes stay
at the call site; and `close` implies `evaluated`, which is the property that makes the mapping exact
— pinned by its own test.

*One non-obvious equivalence, commented in place:* `_lastBattleExitTs = ts` used to sit only in the
hold-gate branch. Folding it into the shared TRANSITION arm is exact, because the only other reason
reaching that arm (LEAD_CHANGE_INTERRUPT) requires LEADER_ZOOM and so can never be BATTLE_ZOOM.

`CameraDirector.js` 2487 → 2493 (**+6**). This extraction bought testability, not line count, which
is what the spec asked for and is worth stating plainly rather than dressing up.

**1b — documents that describe an intent (`d26901a7`).** Both stale ARCHITECTURE sections deleted
and replaced by pointers, not rewritten — one canonical home per subject. Verified gone:
`battleIsolationPx`, `_frozenBattleGroup`, `overviewCooldownMin`, "five director modes",
"highest-weight candidate wins". The only surviving mentions of `_leaderPhaseZoomFloor` /
`_setOpenTrackTargets` are negative assertions naming them as removed.

- **ONE MOVE:** `finishOverviewLookbackPx` (300 world px) is alive, shipped and tested, and
  CAMERA_DIRECTOR.md described the FINISH_OVERVIEW behaviour without ever naming the knob. Checked
  before moving.
- **ONE DELIBERATE NON-MOVE, and it is an ARGUMENT not a measurement:** the entry-zoom invariant.
  Its mechanism is gone *and so is its failure mode* — the wobble was a property of the coupled
  pan-target computation CAMERA-PROJECTION-1 replaced. Moving an invariant I cannot verify still
  binds would plant an unverifiable claim in the canonical doc. The reasoning is in the replacement
  text so a reader can disagree with it.

---

## 3. §4a — THE CORRIDOR GUARANTEE (`5d6a4cdf`)

**The spec's source reading was correct and I verified it at origin.** `corridorGuarantee` divided by
`frameExtentAlong` — the frame's chord THROUGH ITS CENTRE — while `companyGuarantee` and the lateral
guarantee already measured from the anchor's real screen position.

New instrument `scripts/corridor-truth.mjs`, which reads the director's own `_framingProbe` so it
measures the live path rather than a reconstruction. Metric: how many track widths actually fit
across, centred where the anchor really sits. The promise is `>= 1`.

| | BEFORE | AFTER |
|---|---|---|
| Promise broken (live zoom) | **69.0%** of corridor frames | **41.6%** |
| Spread across tracks (max median / min median) | **1.384×** | **1.080×** |
| Mountainstreet median | **0.781** corridors, 100% broken | **0.999**, 65.4% |
| Worst track median | 0.777 (seatrack) | 0.997 (river-run) |

**The direction the spec predicted was right, and it was a prediction until measured:** the old
ceiling was too permissive — it allowed the shot tighter than the corridor fits.

**THE RESIDUAL IS DECOMPOSED, NOT HIDDEN.** Measured against the shot the guarantee SIZED (target
zoom) instead of the live zoom: **broken 12.1%**, and 8 of 10 tracks sit at exactly **1.000**
corridors (ice-track 1.033 and searound 1.100 are wider because the STATE SETTING binds there, not
the guarantee). So:

- the ~29 pp gap between 41.6% and 12.1% **is the tracking lag** — which is §4c's subject, measured
  independently below, and the two agree;
- the 12.1% that remains is the **world-bounds clamp and the lateral shift**, which
  `anchorScreenPoint` deliberately does not model — the same documented limitation the company
  guarantee already carries.

**The cheap proof:** with the anchor centred the new two-sided form reduces to the old expression
**exactly** — asserted to 10 decimal places at every 1° of heading on all three shipped projections,
and again under an inner-frame fraction. Every pre-existing corridor test calls the function without
an anchor, so they are all that same proof by default, and all still pass. Also pinned: **widen-only**
(Lesson 192) at every 3°, and that the corridor genuinely fits on **both** sides at the returned zoom.

**SPEC PROPOSAL 8.1 — followed, and the code did not disagree.** Measured perpendicular to the
heading through the ANCHOR, reusing `anchorScreenPoint` so the corridor and company guarantees cannot
disagree about where the subject is about to be.

**SPEC PROPOSAL 8.2 — FLAGGED BEFORE THE EYE TEST, as asked.** The median shot widens **7.7%**, just
under the "roughly a tenth" bar — but that median hides the tail, and four tracks widen far more:

| seatrack | mountainstreet | river-run | garden-path |
|---|---|---|---|
| **+28.7%** | **+27.9%** | **+22.3%** | **+17.7%** |

The owner's zoom values were tuned against the buggy ceiling. These four will look materially wider,
and he may prefer to re-tune `visibleCorridors` rather than accept them.

---

## 4. §4b — POINT VS NOSE FRAMING: HYPOTHESIS REFUTED, NOTHING SHIPPED

New instrument `scripts/edge-crossing.mjs`, with the stop pre-registered in its own header before the
run. A guaranteed subject counts as crossing when its centre is inside the frame but centre ± half a
drawn body reaches past the edge.

**215 crossings in 90,237 guaranteed-subject frames = 0.238%.**

The spec said: *"If the before-number is already ~0, SAY SO AND SHIP NOTHING HERE."* It is, so I did
not. The work was already done — `pairGuarantee` pads by `_drawnBodyWidthRefPx` and
`COMPANY_FRAME_PCT` 0.9 was sized against exactly this failure — and a second margin would have been
the second pair of braces the owner has ruled against. **This costs nothing and is a good outcome.**

One thing worth naming rather than averaging away: **luger-hill is the outlier at 1.30%**, and 65 of
its 84 crossings are in **LEAD_CHANGE**. That is a specific, named residual, not a general defect;
it is on the noticed-but-left list rather than fixed here.

---

## 5. §4c — THE OVERVIEW TRACKING LAG (`f82e1f5e`)

New instrument `scripts/tracking-lag.mjs`. The metric is the one this project already uses —
percentage points of frame between where the framing rule puts the anchor and where it actually sits,
the inverse of `anchorScreenPoint`. Tracking phase only, pooled over ten tracks.

| arm | OVERVIEW `trackingTC`/`entryTC` | OVERVIEW median | p95 |
|---|---|---|---|
| 1 — shipped | 1.5 / 1.5 | **13.78 pp** | 25.57 |
| 2 | 0.25 / 0.8 | **6.78 pp** | 19.64 |
| 3 | 0.25 / 1.5 | **6.69 pp** | 19.56 |

Every other state pooled: **3.78 pp** (LEADER 2.05). At 1.5, OVERVIEW was **3.65×** the rest.
**Arm 1 reproduces the 25.2 pp already on record**, which is the check that this instrument measures
the same thing the earlier number did.

**SHIPPED: `trackingTC` 1.5 → 0.25.** Every state now ships the same value; there is no slow state
left.

**NOT SHIPPED: `entryTC` stays 1.5** — the spec's named legitimate answer, taken for a measured
reason rather than a preference. **Arms 2 and 3 differ by 0.09 pp**, because the metric samples the
TRACKING phase and therefore *cannot adjudicate entry at all*. Shipping a change on that evidence
would be taste dressed as measurement. The missing instrument is named in the code: an ENTRY-phase
convergence measurement.

**Tests +4, closing a gap CAMERA_DIRECTOR.md §6 named in those words** — *"change a `trackingTC`
default and no test notices"*. Now they do, each carrying its reason. **Verified by sabotage:**
flipping the default to 0.30 fails them.

**MINT TRIPWIRE fired and was checked** — this touches `client/src/modules/storage/`, outside
`camera/`. World fingerprint **`dc4647be0f55ebdb`, unmoved**.

### The fingerprint table, per commit

| commit | what | camera | render | world |
|---|---|---|---|---|
| `b43eb319` | tag + register | `4b33c4d31bec93ea` | `ae7e9243bd2add8b` | — |
| `54fc50c1` | Stage 1a | `4b33c4d31bec93ea` **=** | `ae7e9243bd2add8b` **=** | — |
| `d26901a7` | Stage 1b | `4b33c4d31bec93ea` **=** | `ae7e9243bd2add8b` **=** | — |
| `5d6a4cdf` | §4a corridor | **`a158bfab0d614a4c`** | **`458b158aa7494db7`** | — |
| `f82e1f5e` | §4c OVERVIEW | **`1db71e7fffc1c9f6`** | **`a10bf3f293f2ee06`** | `dc4647be0f55ebdb` **=** |

**Branch baselines: camera `1db71e7fffc1c9f6`, render `a10bf3f293f2ee06`** — written into
SHIP-CEREMONY.md's three-fingerprints table and CAMERA_DIRECTOR.md.

---

## 6. DEVIATIONS, declared

1. **The §4c tooltip requirement could not have been violated, and I am saying so rather than
   claiming a fix.** The spec asked that the Dev Screen tooltip match the shipped default, "not the
   code fallback", citing the three lying tooltips CAMERA-HYGIENE-2 found. `trackingTC`'s tip is a
   function of the LIVE value, so it cannot drift. What it genuinely lacked was the MEANING, which it
   now carries. No divergence existed to repair.
2. **The spread figure is 1.384×, not the 1.82× the spec quotes.** Mine is max/min of the per-track
   MEDIAN delivered corridors on corridor-guarantee frames only. I did not reconstruct the earlier
   1.82×, so I cannot say whether it is a different metric or a different scope — I report mine and
   name the definition rather than adopting a number I did not measure.
3. **Three measurement scripts each carry their own copy of the race driver** (~100 lines, three
   times). The right cleanup is a shared `scripts/lib/cameraRun.mjs`, and I deliberately did not do
   it: extracting it would have churned two scripts written earlier in this same block for tidiness
   the spec explicitly rations. It is on the noticed-but-left list.

---

## 7. HYGIENE — what THIS change orphaned

Per touched file, and no wider.

| File | Change |
|---|---|
| `CameraDirector.js` | 2487 → 2493 (+6). Decision logic out, explicit call site in, `_framingProbe` added (read-only, never read by camera math). |
| `framingRule.js` | `corridorGuarantee` rewritten around `halfCorridorCeiling`; `frameExtentAlong` still used by `anchorScreenPoint` and `pairGuarantee`, and the import now says why. |
| `docs/CAMERA_DIRECTOR.md` | §3 guarantee bullet, §6 protected/convention lists, both fingerprint hashes. **My own block made two §6 entries stale and I fixed them in the same block** — leaving them would be the exact rot Stage 1b cleaned. |
| `docs/SHIP-CEREMONY.md` | both fingerprint baselines. |
| `defaults.js` | OVERVIEW's two constants now carry their reasons; nothing removed. |

**Nothing was orphaned by this change** — no dead code, no dead variables, no Dev Screen slider whose
key stopped existing. Both changed defaults keep their sliders and both are still read.

### Noticed, and left

1. **luger-hill LEAD_CHANGE edge crossings** — 65 of the 84 on that track (§4). Named, not general.
2. **The photo-finish gate measures TRACK POSITION, not race distance.** `shortestArcDeltaT` compares
   fractional `t`, so a leader exactly one lap ahead reads as "close". Found because a test of mine
   failed and my data was wrong, not the code. Pre-existing; pinned by a test that documents it
   rather than changes it.
3. **Three duplicated race drivers in `scripts/`** (deviation 3).
4. **The 12.1% residual in §3** — the world-bounds clamp and lateral shift are not modelled by
   `anchorScreenPoint`. CAMERA_DIRECTOR.md §6 already lists the clamp as pinned by nothing.
5. **`raceSettings.duration`** and neighbouring passages look stale in the living docs; not this block.

---

## 8. THE OWNER'S EYE — once, at the end of the branch

On the live track, with your values, all six states, plus the `[RA CAMERA LIVE TRUTH]` line from your
browser (L191).

1. **Mountainstreet and seatrack first, and expect them WIDER** — +27.9% and +28.7%. This is the
   change most likely to need your verdict, because your zoom values were tuned against a ceiling
   that was lying. If it is too wide, the fix is `visibleCorridors`, not the guarantee.
2. **OVERVIEW should now FOLLOW rather than trail.** The wide shot used to sit ~14 points of frame
   behind its subject; it is now ~7, like everything else. The glide INTO the wide shot is unchanged
   and still deliberate.
3. **River-run and garden-path** — the other two that widened materially (+22.3%, +17.7%).
4. **Anything at a diagonal heading**, on any track: the corridor now binds from the anchor, and the
   diagonal is where the old and new answers differ most.
5. **It should otherwise be boring.** No state timing changed, no anchor changed, no transition
   behaviour changed — Stage 1 proved that with two bit-identical fingerprints.

---

## 9. PROPOSALS

### 9.1 (mine) The guarantees now agree; make that a rule rather than a coincidence

All three geometric guarantees measure from the anchor's real screen position — but only because
three separate blocks each arrived there. `zoomCeilingToFit` still exists as the centre-chord form and
is still exported. **Proposal:** make the anchor position a required argument of every guarantee, so
the next one cannot be written centre-blind by default. The corridor was centre-blind for two months
inside a file whose header says "orientation-aware, which is the point of doing it here" — the header
was proud of the half of the problem it had solved.

### 9.2 (mine) The lag is measured everywhere and asserted nowhere

§4c pinned the *defaults*; the *lag itself* is still convention-only, and CAMERA_DIRECTOR.md now says
so explicitly. **Proposal:** a coarse regression guard — pooled OVERVIEW median lag must stay under,
say, 10 pp — run in the camera suite. Not a tuning target, a tripwire: it would have caught the 13.78
pp state at the moment it shipped instead of two months later. The objection is that it pins a
measurement to a machine; the answer is that it is a ceiling with a factor of ~1.5 headroom, not an
equality.

### 9.3 On the spec's proposal 3 — the fallback-vs-default divergence

The spec offered this as "candidate for the report, not for this block" and asked for a cheap general
fix only if 4c handed me one. **It did not, and I am not proposing one.** What 4c showed is narrower
and more useful: the tooltips that lie are the ones quoting a CONSTANT, and the ones computing from
the live value cannot. That is a rule with a mechanical test — *no tooltip may contain a numeric
literal that also exists in `defaults.js`* — and it is worth more than a general reconciliation pass,
because it makes the failure impossible rather than currently-absent. I did not build it; it is a
one-screen guard for a docs/hygiene block.

### 9.4 On §4b's refutation — keep the instrument, it is the cheap half

`edge-crossing.mjs` shipped even though nothing else in §4b did. It cost one run to turn "bodies might
be cropped" from a plausible worry into 0.238%, and it will cost one run to re-answer after any future
framing change. **The measurement was worth building even though the fix was not** — that is the
argument for diagnosis-first as a standing rule, not just this block's method.
