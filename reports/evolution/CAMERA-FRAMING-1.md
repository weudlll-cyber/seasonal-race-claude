# CAMERA-FRAMING-1 — PARKED after the rule, before the integration

**Status: PARKED under the spec's own park rule.** The rule is designed, built as a pure module and
proven (26 tests, full 360° orientation sweeps with failure proofs). The integration into the
director is **not started**. Nothing is shipped on `camera-refactor` except this report and the tag
registration; the code is on `wip/camera-framing` (`9277fd9d`), pushed and green.

Return tag `pre/framing` (`74bf88b1`), registered in [TAGS.md](../../docs/TAGS.md) in the same step.

---

## 1. BUILD-VS-SPEC CONFORMITY

| Spec part | Status |
|---|---|
| **A** — six states: anchor, guarantee, position-from-principle, one rule | **DESIGNED + BUILT + TESTED** as `camera/framingRule.js`; **NOT integrated** |
| **B** — the two steering floors become guarantees | **NOT STARTED** |
| **C** — orientation-aware guarantee | **DONE in the module**, swept at 1° over a full lap on three projections |
| **D** — PHOTO_FINISH gets its own zoom entry | **NOT STARTED** |
| **E** — per-axis defect in the floor | **NOT STARTED** (it dies with the floor in B) |
| **VERIFY** — no simulation file | **HELD** — the diff is one report + one TAGS.md entry |
| **VERIFY** — guarantee holds in every orientation, with numbers | **DONE** (§3, §4) |
| **VERIFY** — clamp inert mid-glide | **NOT DONE** — needs B |
| Tests, hygiene, one `feat(camera)` commit | **NOT DONE** — they belong to the integration |

**Why parked.** I sized the integration before starting it: `CameraDirector.test.js` alone carries
**12 describe blocks and ~94 references** to the mechanisms this block rewrites — `minRacersVisible`
(24), `LEAD_CHANGE` (31), the containment clamp (12), `_zoomFloorForMinVisible` / `_countVisibleRacers`
(16), `_setOverviewGroupTargets` / `overviewFrameRacers` (11) — on top of rewriting the six-case
`_setTargets` switch, deleting two mechanisms, a schema-v20 migration and the Dev Screen. That is
past what one clean commit can carry with the budget I had, and the spec is explicit that a
half-migrated state with orphan controls or red tests is the wrong outcome on a block whose entire
point is an eye test he can trust. I made the call before spending the budget rather than at 80% of
it, which is the one thing I would change about the zoom-unit block.

---

## 2. THE SIX STATES, AS BUILT

One rule, six answers to one question — not six special cases. `framingRule.js` holds the table:

| state | ANCHOR | GUARANTEE | POSITION | anything worth seeing ahead? |
|---|---|---|---|---|
| LEADER_ZOOM | the leader | corridor | forward | no — the race is behind him |
| **LEAD_CHANGE** | **the racer now leading** | **pair: him + the racer he just passed** | **forward** | no — the story is behind |
| BATTLE_ZOOM | the middle of the battle | pair: both contenders | centred | yes — a contender is ahead by construction |
| COMEBACK_ZOOM | the comebacker | corridor | centred | yes — he is catching the racers ahead |
| OVERVIEW | the leader | corridor | forward | no — the same shot at the widest setting |
| PHOTO_FINISH | the pair contesting the line | pair: both contenders | centred | yes — neither is "the one ahead" |

`position` is not stored as a preference: it is asserted in the tests to equal
`aheadMatters ? centred : forward` for every state, so the principle and the answer cannot drift
apart. Frame position never becomes a slider.

**The guarantee is one computation**, `zoomCeilingToFit(worldVector)`: at cam.zoom `z` a world vector
maps to `z·(v.x·axisX, v.y·axisY)`, the frame reaches `frameExtentAlong` in that direction, and the
ceiling falls out. The two guarantees differ only in which vector they hand it — the corridor hands
the perpendicular to the heading; the pair hands the line between the contenders. That is what lets
BATTLE and PHOTO_FINISH honour "everyone who matters stays in frame" while going **tighter than one
track width**: measured, a nose-to-tail pair permits a shot **2× tighter** than the corridor proxy.

---

## 3. THE GUARANTEE HOLDS IN EVERY ORIENTATION — with numbers

Swept at **1° over a full 360°** on three projections (searound closed 131 px, ice-track closed
211 px, mountainstreet open 300 px):

- **corridor**: the corridor fits at the guaranteed zoom at every one of 360 headings, on all three.
- **corridor is tight, not slack**: 2% tighter and it no longer fits, at every sampled heading.
- **pair**: both contenders fit at every one of 360 separation directions, on all three.
- **failure proof, orientation-blind bound**: assuming the worst orientation everywhere — what the
  shipped guarantee must do — over-widens on **more than half of the 360 headings**, by **more than
  10% on average**. That is the shot being thrown away for most of a lap.
- **failure proof, single-axis bound**: judging a mostly-vertical pair separation by its X component
  permits a shot **2× tighter** at which the pair provably does **not** fit — the bsX/bsY family
  applied to a pair.

---

## 4. WHERE EACH GUARANTEE BINDS — and the finding that matters

Swept over each track's own centreline, 360 real headings, at the shipped defaults:

| state | tracks where it ever binds | mean share of the lap |
|---|---|---|
| OVERVIEW | 0 / 10 | 0% |
| LEADER_ZOOM | 0 / 10 | 0% |
| LEAD_CHANGE | 0 / 10 | 0% |
| **BATTLE_ZOOM** | **1 / 10** (searound) | **1%** (6% of that lap, ×1.08 widen) |
| COMEBACK_ZOOM | 0 / 10 | 0% |
| PHOTO_FINISH | 0 / 10 | 0% |

**At the shipped track-width defaults the guarantees are pure backstop — they essentially never
fire.** That is the right shape for a guarantee, and it is also the answer to a question the owner
has not asked yet: the guarantees only start doing work when he pushes settings **below ~1 track
width**, which is exactly where he said he wants to go for battles and photo finishes. He can take
those settings tighter and the guarantee will catch him; today nothing would.

---

## 5. WHAT THE TRACKING LAG COSTS, PER STATE — unfixed, as instructed

Steady-state lag of the exponential follower: `lag = v·(1−lf)/lf`, `lf = 1 − 0.1^(1/(TC·60))`.

| state | TC | lag factor | dirt-oval | searound | mountainstreet |
|---|---:|---:|---|---|---|
| **OVERVIEW** | **1.50** | **38.6** | **133 px = 18.5pp** | **181 px = 25.2pp** | 67 px = 9.3pp |
| LEADER_ZOOM | 0.25 | 6.0 | 42 px = 5.8pp | 57 px = 7.9pp | 21 px = 2.9pp |
| LEAD_CHANGE | 0.25 | 6.0 | 42 px = 5.8pp | 57 px = 7.9pp | 21 px = 2.9pp |
| BATTLE_ZOOM | 0.25 | 6.0 | 56 px = 7.7pp | 75 px = 10.5pp | 28 px = 3.9pp |
| COMEBACK_ZOOM | 0.25 | 6.0 | 56 px = 7.7pp | 75 px = 10.5pp | 28 px = 3.9pp |
| PHOTO_FINISH | 0.25 | 6.0 | 56 px = 7.7pp | 75 px = 10.5pp | 28 px = 3.9pp |

The model reproduces the owner's measured 65 px / 9pp at `trackWidths` 1 on Dirt Oval (it predicts
11.6pp for a full-speed leader; his frame was mid-settling, so slightly under).

**The finding: OVERVIEW's lag is in a different class.** Its `trackingTC` of 1.5 gives a lag factor
of 38.6 against 6.0 everywhere else — **a quarter of the frame on searound**. In a state whose job is
to show the field that is probably invisible, but it means the OVERVIEW anchor is nowhere near where
the rule says it is. Not tuned here; it is his conversation. It should be the first item when he has
it.

---

## 6. POINT-VERSUS-NOSE FRAMING — what it looks like now

Not acted on, as instructed. With the span formula corrected in CAMERA-PICTURE-FIXES-1, the fraction
now places the anchor **point** at exactly the fraction the setting names, on every heading. At the
shipped 2 track widths a drawn body is roughly 40 px against a 720 px frame — about 5.5% — so point
and nose differ by under 3pp of the frame and the question is close to invisible. At the owner's
tighter working settings (1 track width, and the sub-1 values he wants for battles) the body is
11–15% of the frame and the difference becomes visible. **Recommendation: leave it a point until he
has looked at the corrected framing at his own settings.** The knob should not exist before the
question does.

---

## 7. HYGIENE

Nothing is orphaned, because nothing is integrated: this report and the `pre/framing` registration
are the whole diff on `camera-refactor`. The parked module adds `framingRule.js` (210 lines) and
`framingRule.test.js` (232 lines) on `wip/camera-framing`, and imports only `frameGeometry.js`.

**Carried forward for the integration** (all previously listed, none newly created):
`autoScaleConfig.minTargetScreenPx` (pre-existing orphan in a race-relevant block — needs the
ceremony); the per-type `minTargetScreenPx` in `TUNABLE_FIELDS`; the v5→v19 migration chain's
collapsible middle; and `leaderForwardFrac` vs `leadAheadEnabled`, which the integration must
disentangle or rename.

---

## 8. WHAT REMAINS, PRECISELY

On `wip/camera-framing` (`framingRule.js` + tests, green):

1. **Integrate** — replace the six-case `_setTargets` switch with anchor → guarantee → position:
   resolve the anchor, apply the forward bias for the three FORWARD states (today only LEADER gets
   it), take `Math.min` of the state zoom and the guarantee ceiling.
2. **Define LEAD_CHANGE's anchor** in `panTarget.js` — it has no case at all and falls into the
   default centroid branch. Needs the new leader, and the overtaken racer recorded as the pair
   partner (`_leadChangePrevLeaderName` exists; it needs the index).
3. **Delete the two steering mechanisms**: the min-visible floor (`minRacersVisible`,
   `leaderMinZoomFraction`, `leaderMinZoom` + their Dev Screen controls) and the containment clamp's
   pan-moving code. The per-axis defect (E) dies with the floor.
4. **PHOTO_FINISH config**: its own `trackWidths` entry, schema v20 + migration, Dev Screen row.
5. **Test fallout**: the 12 describe blocks / ~94 references above, plus new cases for LEAD_CHANGE
   framing (never had one), the clamp being inert mid-glide (`clamp-active ≈ 0` as a test), and the
   guaranteed subjects in frame at the extremes.
6. Hygiene account, line counts, report update, one `feat(camera)` commit.

The rule itself — the hard part, and the part that needed the owner's design to be read correctly —
is done and provable. What remains is integration and fallout.

---

## 9. FOR THE OWNER

**Nothing has changed in what you see.** This block is parked before it touched the picture, so the
camera behaves exactly as it did after the two picture fixes. There is nothing to eye-test yet.

When it lands, **LEAD_CHANGE will change the most.** It holds **37.6% of all frames** — more than
LEADER_ZOOM and more than triple OVERVIEW — and it has never been designed: it fell into a default
branch that centres on the average position of whatever racers were passed, and it never received
the forward framing. It is over a third of your race, framed by omission.

The checks, in your words, when it does land: is the leader forward with the field behind him; is the
overtaken racer still visible at a lead change; are both fighters framed in a battle; is the photo
finish close enough to see who won; and does the comebacker sit centred with road ahead and behind.

And when you mark a moment, press **M** and send the **whole** line — the last one was truncated
before it reached me and cost the replay.
