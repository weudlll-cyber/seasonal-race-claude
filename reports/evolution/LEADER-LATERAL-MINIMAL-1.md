# LEADER-LATERAL-MINIMAL-1 — the owner's rule, measured before building it

**Measure only. Nothing built, no default changed, no key added, no fingerprint touched.**
Read-only, so no fingerprints, no browser gate and no client suite were run — the branch carries a
report, its INDEX line and two instruments, and cannot move shipped behaviour.

The rule, as he stated it 2026-08-26: *the camera stays on the corridor centreline; it steps aside
laterally only when the leader would otherwise be cut, and only as far as needed; as soon as he fits
from the centreline again it returns. On a lead change the same rule applies — if the new leader fits
from the centreline, the camera does not chase him.* And, twice today: **every such movement is a
travel, never a jump.**

Corpus: ten tracks × ten races (seeds 1–10), 20 racers, shipped settings, browser Quick-Test path
with the camera seed derived from the race seed. **140,740 `LEADER_ZOOM` mid-race frames.** 14 cores
read before launching. Instruments: `scripts/diag/leader-lateral-minimal.mjs`,
`leader-lateral-sum.mjs`.

---

## THE VERDICT: BUILD IT — but it must ease, and it does not reach everything

**It is worth building.** It engages on 4.18% of frames, holds the centre on the other 95.82%, and
leaves the camera sitting at a mean lateral offset of **0.76 world px against a following camera's
28.92** — thirty-eight times calmer, while removing the same clipping a following camera would. It
correctly does nothing on **91.2%** of lead changes.

**Two conditions, both measured, neither optional.**

1. **It jolts if applied raw — 130.6 world px in a single frame, about 436 screen px.** The step is
   flat at 0.00 px on the median and the p95 alike, because the rule holds zero almost always; the
   whole movement is concentrated in the frame it engages and the frame it releases. So the build is
   **"step aside, eased"**, and the run-in's existing easing is the precedent to reuse rather than a
   second mechanism.
2. **It cannot reach 14.1% of the frames it engages on.** 830 frames across the corpus are lost
   ALONG the track, and no lateral movement of any size fits them. That residual needs the zoom, not
   the pan — see the proposals.

**One honest exception to the calm claim, and it is the track that needs the rule most.** On
space-sprint the rule *travels* 118.2% of what a following camera travels — more, not less — because
it engages 15.4% of the time and every engagement is a round trip out and back. It still *sits*
centred 85% of the time there, which is what he asked for, but on that one track the rule does not
buy less movement than following. Everywhere else it buys a great deal less.

---

## (a) HOW OFTEN IT WOULD ENGAGE

| track | frames | engaged | **rate** | today's own lateral shift (med / p95, world px) |
|---|---|---|---|---|
| luger-hill | 12,376 | 71 | **0.6%** | 21.1 / 44.9 |
| garden-path | 11,186 | 75 | **0.7%** | 2.6 / 32.2 |
| dirt-oval | 16,210 | 184 | **1.1%** | 0.7 / 30.5 |
| ice-track | 11,504 | 132 | **1.1%** | 11.3 / 33.5 |
| searound | 10,659 | 122 | **1.1%** | 0.0 / 13.2 |
| city-circuit | 13,254 | 183 | **1.4%** | 0.7 / 32.1 |
| mountainstreet | 18,402 | 814 | **4.4%** | 22.3 / 45.1 |
| river-run | 16,335 | 745 | **4.6%** | 19.3 / 43.9 |
| seatrack | 13,311 | 861 | **6.5%** | 26.8 / 45.7 |
| **space-sprint** | 17,503 | 2,699 | **15.4%** | 8.6 / 36.6 |
| **POOLED** | **140,740** | **5,886** | **4.18%** | — |

**It matches the published clip rates exactly, on every track** — 15.4% on space-sprint, 27.6% on
space-sprint seed 6, 0.6–1.4% on the calm tracks. That is not a coincidence but a check: the rule
engages precisely when the leader does not fit, which is the same event LEADER-LAG-TRUTH-1 counted,
so the two measurements had to agree or one of them was wrong.

The brief quoted 15.05% for space-sprint; the figure here is **15.4%**, which is
LEADER-LAG-TRUTH-1's number to the digit. The 15.05% is from MIDRACE-LEADER-CLIP-1's earlier
per-state re-slice, taken on a different frame filter. Nothing here depends on which is used.

Worth noting from the right-hand column: **today's camera already shifts laterally** — median 0.0 to
26.8 world px depending on track. The mechanism exists and runs on every frame. It simply does not
have the leader in its subject list.

## (b) HOW FAR IT WOULD MOVE — and this is what decides it

The minimal step, against the excursion a camera that simply followed him would carry:

| track | step med | step p95 | step worst | follow med | follow p95 | step as % of follow |
|---|---|---|---|---|---|---|
| mountainstreet | 7.9 | 30.0 | 101.6 | 32.2 | 99.2 | **24.5%** |
| seatrack | 12.3 | 69.3 | 103.6 | 36.3 | 102.2 | **33.8%** |
| river-run | 10.0 | 13.9 | 37.6 | 28.2 | 98.9 | **35.3%** |
| space-sprint | 18.1 | 75.6 | 213.3 | 33.3 | 104.4 | **54.2%** |
| ice-track | 10.8 | 37.3 | 130.6 | 14.2 | 50.9 | 76.2% |
| garden-path | 15.8 | 36.1 | 53.5 | 17.6 | 53.6 | 89.3% |
| city-circuit | 21.6 | 68.4 | 133.0 | 13.8 | 59.9 | 156.3% |
| luger-hill | 28.3 | 76.3 | 77.0 | 17.9 | 83.5 | 157.7% |
| searound | 26.2 | 67.3 | 68.0 | 12.3 | 47.6 | 212.3% |
| dirt-oval | 25.7 | 80.9 | 110.9 | 9.7 | 48.9 | 265.3% |
| **POOLED** | **12.7** | **68.6** | **213.3** | **21.8** | **87.2** | — |

Read alone this table looks equivocal — on four tracks the step is a quarter to a half of the follow
excursion, on four others it is larger. **But comparing one step against a continuous offset is the
wrong comparison, and it is worth saying why: the rule holds ZERO on 95.82% of frames, and a
following camera holds its offset on all of them.** The honest measures are where the camera sits and
how far it travels:

| track | rule: mean offset held | follow: mean offset held | rule: distance travelled | follow: distance travelled | rule as % |
|---|---|---|---|---|---|
| garden-path | 0.06 | — | 21 | 291 | **7.1%** |
| luger-hill | 0.12 | — | 26 | 326 | **8.1%** |
| dirt-oval | 0.09 | — | 50 | 352 | **14.3%** |
| river-run | 0.39 | — | 28 | 642 | **4.4%** |
| mountainstreet | 0.50 | — | 106 | 717 | **14.8%** |
| ice-track | 0.10 | — | 42 | 268 | 15.7% |
| searound | 0.12 | — | 35 | 209 | 16.8% |
| city-circuit | 0.14 | — | 51 | 267 | 18.9% |
| seatrack | 1.03 | — | 151 | 442 | 34.2% |
| **space-sprint** | **4.01** | — | **663** | **561** | **118.2%** |
| **POOLED** | **0.76** | **28.92** | 11,734 | 40,750 | **28.8%** |

**The rule sits at a mean lateral offset of 0.76 world px where a following camera sits at 28.92 — a
38× reduction — and travels 28.8% of the distance.** That is what the rule buys, and it is a large
buy. The centreline shot survives essentially intact.

**The exception is stated plainly because the brief asked for it: on space-sprint the rule travels
118.2% of a following camera** — it moves *more*. That track engages 15.4% of the time, and each
engagement is an excursion out and a return back, so the round trips add up past the smooth
continuous track a follower would trace. The rule still holds the centre 84.6% of the time there,
so it delivers the picture he asked for; it simply does not deliver less total motion on that one
track. On the other nine it does, by between 4.4% and 34.2%.

On screen, the step is modest where it matters: median 25.5–113.4 px (2.0–8.9% of the 1280 px frame),
p95 up to 371 px, worst 819 px (64% of frame width, space-sprint). The worst case is large enough
that a bound is worth considering — see the proposals.

## (c) HOW OFTEN IT RETURNS — short bursts on seven tracks, sustained on three

| track | episodes | median length | p95 | longest | longest in seconds |
|---|---|---|---|---|---|
| garden-path | 5 | 14 | 19 | 19 | 0.32 s |
| luger-hill | 5 | 12 | 20 | 20 | 0.33 s |
| ice-track | 9 | 14 | 22 | 22 | 0.37 s |
| searound | 9 | 14 | 18 | 18 | 0.30 s |
| city-circuit | 12 | 15 | 22 | 22 | 0.37 s |
| dirt-oval | 14 | 13 | 22 | 22 | 0.37 s |
| river-run | 12 | 55 | 155 | 155 | **2.58 s** |
| mountainstreet | 27 | 17 | 124 | 147 | **2.45 s** |
| seatrack | 28 | 20 | 120 | 122 | **2.03 s** |
| **space-sprint** | **66** | 22 | 168 | **304** | **5.07 s** |
| **POOLED** | **187** | **17 (0.28 s)** | 122 | 304 | 5.07 s |

**This is a burst rule, not a following camera in disguise — on seven of ten tracks.** There, an
episode lasts a fifth of a second to a third of a second and there are five to fourteen of them in a
whole race. The camera steps aside, he is visible, it comes back.

On the four sideways tracks it is genuinely mixed: median episodes are still short (17–55 frames) but
the p95 runs to two seconds and space-sprint's longest is **five seconds**, which is a held offset,
not a burst. **That is the honest boundary of the rule's calm:** where the leader runs wide for
seconds at a time, the rule holds the camera aside for seconds at a time, because that is what
keeping him whole requires. It is still doing the least that works.

## (d) SMOOTHNESS — it jolts, and the number says by how much

Per-frame change in the offset the rule would hold, applied raw:

| track | median Δ | p95 Δ | p99 Δ | **worst Δ (world px in one frame)** |
|---|---|---|---|---|
| luger-hill | 0.00 | 0.00 | 0.00 | 16.5 |
| river-run | 0.00 | 0.00 | 0.17 | 20.8 |
| searound | 0.00 | 0.00 | 0.00 | 21.4 |
| dirt-oval | 0.00 | 0.00 | 0.00 | 33.3 |
| garden-path | 0.00 | 0.00 | 0.00 | 38.6 |
| seatrack | 0.00 | 0.05 | 2.03 | 39.1 |
| city-circuit | 0.00 | 0.00 | 0.00 | 69.3 |
| space-sprint | 0.00 | 0.99 | 10.33 | 92.2 |
| mountainstreet | 0.00 | 0.00 | 0.37 | 100.3 |
| **ice-track** | 0.00 | 0.00 | 0.00 | **130.6** |
| **POOLED** | **0.00** | **0.00** | **1.01** | **130.6** |

**The distribution is the shape of the problem.** The median and the p95 are both exactly zero — the
rule is inert on almost every frame, so almost every frame-to-frame change is nothing at all. The
entire movement lives in two frames per episode: the one it engages on and the one it releases on.
The worst of those is **130.6 world px in a single frame — about 436 screen px**, on ice-track.

For scale, the raw setback that was stopped earlier today jolted 616 px. This is smaller but the same
kind of thing, and it fails his standing requirement outright. **Applied raw this rule is a jump, and
he has said twice today that every such movement must be a travel.** So the build is "step aside,
eased", and the easing already in the tree for the run-in is the precedent to reuse — one mechanism,
one home, no new duration constant.

## (e) THE LEAD CHANGE — the rule correctly does nothing 91.2% of the time

| track | lead changes | new leader already fits | rule does nothing |
|---|---|---|---|
| luger-hill | 107 | 105 | **98.1%** |
| garden-path | 122 | 119 | **97.5%** |
| city-circuit | 110 | 107 | **97.3%** |
| searound | 97 | 93 | **95.9%** |
| river-run | 113 | 108 | **95.6%** |
| ice-track | 121 | 115 | **95.0%** |
| dirt-oval | 163 | 153 | **93.9%** |
| mountainstreet | 109 | 93 | 85.3% |
| seatrack | 88 | 69 | 78.4% |
| space-sprint | 104 | 72 | 69.2% |
| **POOLED** | **1,134** | **1,034** | **91.2%** |

He named this case specifically, and the measurement supports him: **on nine of every ten lead
changes the new leader is already whole from the centreline, and the camera should not move at all.**
The rule as he stated it produces exactly that, for free — the same `fits from the centreline` test
answers it, with no separate lead-change branch.

Where it *does* move, it moves on the tracks that already need it most (space-sprint 30.8% of lead
changes, seatrack 21.6%). That is the rule working, not a special case.

## (f) THE RESIDUAL — 14.1% of engaged frames cannot be fixed by lateral movement at all

| track | frames no lateral shift can fix | of all frames | **of engaged frames** |
|---|---|---|---|
| mountainstreet | 56 | 0.3% | **6.9%** |
| space-sprint | 207 | 1.2% | **7.7%** |
| seatrack | 109 | 0.8% | **12.7%** |
| luger-hill | 22 | 0.2% | 31.0% |
| ice-track | 63 | 0.5% | 47.7% |
| garden-path | 44 | 0.4% | 58.7% |
| city-circuit | 115 | 0.9% | 62.8% |
| searound | 78 | 0.7% | 63.9% |
| dirt-oval | 136 | 0.8% | **73.9%** |
| **POOLED** | **830** | **0.590%** | **14.10%** |

**These are the frames where the leader is being lost ALONG the track, not across it.** No sideways
movement of any size brings him in, because the overflow is off the front or back edge. The eight
linear inequalities have no common solution, and that is computed per frame rather than argued.

**This does not contradict LEADER-LAG-TRUTH-1's finding that 0 of 5,886 clipped frames would clip
with a perfect camera, and the reconciliation matters.** That measurement asked whether he would fit
if placed at the aim point — a move on *both* axes. This one asks whether a *lateral-only* shift
suffices. A camera free to move along and across reaches every frame; a camera restricted to sideways
movement reaches 85.9% of them. Both are true and they are different questions.

The split is exactly the two populations LEADER-LAG-TRUTH-1 named. On the four sideways tracks the
residual is 6.9–12.7% of engagements — the rule reaches almost everything. On the calm tracks it is
31–74%, because the little clipping they have was never sideways in the first place. **The rule is
well matched to the frequent defect and poorly matched to the rare one**, which is the right way
round.

---

## SOURCE HYGIENE — the rule is already in the tree, with the leader missing from one list

This is the strongest argument for building it, and it was found by reading rather than assumed.

**`framingRule.js:749`, `lateralShiftToFit`, is the owner's rule already, algorithmically identical
to the solver this report used:**

```js
if (lo <= 0 && hi >= 0) return 0;   // the centreline already works — hold it
return lo > 0 ? lo : hi;            // the smallest move that reaches the admissible interval
```

"Hold the centre when it works, otherwise the smallest move that works" is what he asked for, written
down, shipped, and under test. **`_applyLateralGuarantee`'s own docstring states his rule almost word
for word** — *"shift off the centreline only to keep the state's guaranteed subjects in frame, by the
least that works, and return to zero as soon as it can."*

What is missing is one entry in one list. At `CameraDirector.js:2259–2266` the offsets fed to that
solver are the corridor edges, plus individual subjects **only** when
`framingFor(this.state).guarantee === GUARANTEE.PAIR`. `LEADER_ZOOM`'s guarantee is CORRIDOR, so the
leader — the racer that state names as its own anchor — is never an input.

Two consequences for the build:

- **No new mechanism and no new key is needed for the stepping-aside itself.** The subject list gains
  the anchor racer when the state's anchor is a single racer.
- **The easing is genuinely new work.** `_applyLateralGuarantee` returns its shifted target raw, and
  today that is harmless because the corridor edges move smoothly; a leader entering and leaving the
  list does not. That is the 130.6 px frame in (d).

## CONFORMITY

- **"A guarantee widens, it never steers" (Lesson 192).** The lateral guarantee is the documented
  exception — it is the one term that legitimately moves the anchor, and CAMERA-LATERAL-1 established
  that. Adding a subject to it stays inside that existing exception rather than creating a new one.
- **One mechanism, one home.** The step reuses `lateralShiftToFit`; the easing must reuse the run-in's
  easing rather than introduce a second. Two eases on one quantity is what CAMERA-SIDEJUMP-1 and the
  run-in ordering repair both had to undo.
- **Nothing the run-in ships is touched**, and `visibleCorridors`, `leaderForwardFrac` and both
  smoothers are untouched as the brief required.
- **UI-configurable**: any bound or margin introduced must be a config key with a default, not a
  literal — but note the rule *as stated* needs no new key at all, which is the better outcome.

## PROPOSALS

**P1 — the build, minimal (recommended).** Add the anchor racer's own lateral offset to
`_applyLateralGuarantee`'s offsets list whenever the state's anchor is a single racer, and ease the
resulting shift with the run-in's existing easing. No new config key, no new duration constant, no
second mechanism. This is the whole of the owner's rule.

**P2 — put his BODY in the promise, not his centre.** The offsets list carries positions; the leader
clips because his *drawn half-width* crosses the edge, not his centre. Push `lateral ± halfWidth`
rather than `lateral`. Without this the rule under-steps by half a sprite on every engagement, and
space-sprint's sprite is the largest in the game — the same 2.9× that made it the worst track in
LEADER-LAG-TRUTH-1's tolerance table. This is a few characters and it is the difference between the
promise covering him and nearly covering him.

**P3 (mine) — release with a margin, not on the boundary.** The rule as stated engages when he does
not fit and releases the instant he does, which puts both transitions exactly on the fitting
boundary — where a racer weaving at the edge can re-cross repeatedly. The corpus shows 187 episodes
with a median of 17 frames, so this is not yet chattering, but the release condition is the fragile
half and the fix is cheap: **engage on "does not fit", release on "fits with margin M"**. This shape
is already in the tree twice — `_updateContentionWatch`'s easing and the run-in's membership
threshold — so it is a precedent, not an invention. It would also stop the eased travel from being
interrupted by a re-engage mid-return.

**P4 (mine) — spend the residual on the ZOOM, not on a second pan mechanism.** 14.1% of engaged
frames are lost along the track and no lateral rule reaches them. The temptation is a second,
along-axis setback — and that is precisely what was built and reverted earlier today. The along-axis
overflow means the zoom ceiling was too tight for the sprite at that moment, and there is already a
mechanism whose entire job is to widen without steering: the guarantee stack. **Feed the leader's
along-overflow into the zoom guarantee** and the residual closes with a term that cannot jolt the pan
and cannot move the picture sideways. It also keeps Lesson 192 intact, where a second pan mechanism
would not.

**P5 (mine) — bound the step, and read the bound off this data.** The worst engagement asks for 213
world px / 819 screen px — 64% of the frame width — which for those frames is a following camera by
another name. The p95 is 68.6 world px. **A bound near the p95 costs almost nothing and caps the
worst case at something still recognisably a centreline shot**; the frames it declines to fully serve
fall into the same bucket as P4's residual and are handled there. If a bound is added it is a config
key with a default, per the standing rule.

## LEDGER

- Nothing built. No product file, default, config key or fingerprint touched.
- Two instruments added under `scripts/diag/`.
- **One wrong answer of mine, caught and corrected before it reached this report.** The first probe
  reconstructed the centreline shot itself — placing `afterBias` at `anchorScreenPoint` — and
  reported a **62%** engage rate against a known 27.6% clip rate on the same race. Validating the
  model against the director's own offsets showed it missed the real target by a median **132 px**,
  because `_setTrackTargets` does more than put the anchor at the aim point. The probe now solves
  from the frame as drawn, which is ground truth, and the engage rate then matched the published clip
  rate exactly on every track. The reconstruction is described in the probe's header so the next
  reader does not rebuild it.
- One over-estimate is stated rather than hidden: the delivered frame still carries the pan smoother's
  residual trailing (median 61 px on clipped frames, LEADER-LAG-TRUTH-1), so a converged camera would
  need slightly smaller steps than reported here.
