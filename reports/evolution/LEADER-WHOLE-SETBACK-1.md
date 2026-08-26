# LEADER-WHOLE-SETBACK-1 — the setback is small, it BUYS forward view rather than costing it, and applied raw it is a 617 px jolt

**Date:** 2026-08-26 · **Branch:** `diag/leader-whole-setback-1`, off master · **MEASURE ONLY** —
nothing built, no default changed, no key added. 100 races: ten on each of the ten tracks, at the
**shipped settings** (`leaderForwardFrac` 0.66, `visibleCorridors` untouched), browser path with the
camera seed derived from the race seed. **14 cores.**

**Read-only, and the omissions are deliberate:** no fingerprints, no browser gate, no client suite. No
product file changed — `git diff` over `client/` and `server/` is empty — so all three would be
measuring a tree they already agree with.

---

# THE TWO NUMBERS HE DECIDES ON

## 1. The setback is small on almost every frame it is needed, and enormous on a few

| track | median | p95 | **worst** | median Δfrac | worst Δfrac |
| --- | --- | --- | --- | --- | --- |
| **space-sprint** *(his case)* | **50.6 px** | 417.1 | **744.5** | **0.066** | 0.729 |
| seatrack | 67.9 | 479.1 | 808.0 | 0.068 | 0.848 |
| ice-track | 83.4 | 758.3 | **1011.6** | 0.083 | 0.777 |
| garden-path | 87.3 | 341.8 | 363.3 | 0.102 | 0.366 |
| luger-hill | 89.5 | 708.1 | 727.8 | 0.069 | 0.556 |
| dirt-oval | 101.8 | 616.7 | 679.6 | 0.079 | 0.802 |
| city-circuit | 108.2 | 629.7 | 995.1 | 0.090 | 0.864 |
| mountainstreet | 126.8 | 434.6 | 757.9 | 0.101 | 0.592 |
| searound | 203.0 | 458.8 | 516.9 | 0.163 | 0.394 |
| river-run | 212.2 | 552.4 | 805.2 | 0.163 | 0.629 |

**On the typical engaged frame the leader moves back 50–210 screen px — about 0.07–0.16 of
`leaderForwardFrac`, i.e. from 0.66 to roughly 0.50–0.59.** That is a modest move and well inside the
range the key already spans.

**The tail is a different animal.** The p95 is 340–760 px and the worst frames need 0.37–0.86 of the
fraction — which would place him at or behind the frame's own rear edge. **A setback bounded to
something sane will not fix those frames**, and that matters more than the median does.

*The px figures are exact. The Δfrac figures are the same quantity divided by the frame's extent along
the heading, and they assume the camera delivers the placement it intends — on a lagging frame the
delivered position is not at 0.66, so treat Δfrac as the size of the move and not as a fraction to
type into the Dev Screen.*

## 2. It BUYS forward view. It spends the view BEHIND — and that inverts the brief's assumption

| track | room AHEAD before → after | room BEHIND before → after | **behind lost** |
| --- | --- | --- | --- |
| river-run | 76.9 → **280.8** | 854.3 → 638.2 | **25.3%** |
| mountainstreet | 87.9 → **224.3** | 865.7 → 721.2 | 16.7% |
| seatrack | 90.2 → 169.0 | 862.4 → 759.8 | 11.9% |
| space-sprint | 120.7 → 156.9 | 678.4 → 604.3 | 10.9% |
| garden-path | −0.4 → 90.5 | 1025.2 → 913.1 | 10.9% |
| searound | **−94.9** → 96.1 | 1300.8 → 1204.3 | 7.4% |
| ice-track | 10.2 → 98.0 | 968.5 → 903.6 | 6.7% |
| dirt-oval | 0.3 → 98.2 | 1258.6 → 1181.3 | 6.1% |
| luger-hill | 46.9 → 133.8 | 988.0 → 938.6 | 5.0% |
| city-circuit | **−6.8** → 95.7 | 1213.7 → 1182.8 | 2.5% |

**The brief asked how much forward view the setback costs. It costs none — it adds forward view.**
`leaderForwardFrac` 0.66 places the leader 16% of the frame AHEAD of centre, so most of the picture
lies behind him and the room ahead is the scarce half. Pulling him back is what makes him fit, and the
same move opens the road ahead: on river-run from 77 px to 281 px, on searound from **negative** — his
drawn body already past the leading edge — to 96 px.

**What it spends is the view BEHIND, and that is where the owner should look**: 2.5% on city-circuit
up to **25.3% on river-run**. On the median engaged frame there is still 600–1200 px of frame behind
him, so a quarter of it is a real but not obviously fatal loss — which is a judgement for his eye, not
for this report.

---

# THE SMOOTHNESS VERDICT — it must ease, and the number says so plainly

| track | median Δ | p95 | p99 | **worst Δ in ONE frame** |
| --- | --- | --- | --- | --- |
| seatrack | 0.0 | 0.0 | 10.6 | **616.7 px** |
| mountainstreet | 0.0 | 0.0 | 4.3 | **603.9 px** |
| space-sprint | 0.0 | 2.0 | 17.3 | **486.2 px** |
| river-run | 0.0 | 0.0 | 1.6 | 360.8 px |
| ice-track / city-circuit / luger-hill | 0.0 | 0.0 | 0.0 | 75.2 / 72.9 / 60.9 |
| searound / dirt-oval / garden-path | 0.0 | 0.0 | 0.0 | 59.1 / 54.4 / 40.9 |

**Pooled: median 0.0, p95 0.0, p99 4.3, worst 616.7 px in a single frame.**

**Applied raw, the setback is itself a jolt — and a bigger one than the defect it fixes.** 617 px in
one frame is comparable to the 580 px width step this strand spent the day removing, and the owner's
standing requirement is that nothing in the picture changes abruptly.

**So the piece is not "add a setback". It is "add a setback that eases", and the precedent to reuse is
the run-in's own:** re-anchor whenever the target moves, ease in log space on a smoothstep over
`runInOpenMs`, and leave by arriving. That mechanism exists, it is tested, and it was written for
exactly this failure — a demanded quantity that steps while its demand is smooth. **A second smoother
would be the mistake.**

**The distribution is the encouraging part**: the setback is *static* on 95% of frames and moves by
under 4.3 px on 99% of them. The easing is needed for a handful of transitions, not as a general
damper — which is what makes it cheap.

---

# THE RESIDUAL — 0.44% of frames, and the cause is a THIRD mechanism

**1,040 of 236,950 frames (0.439%) cannot be fixed by a back-only setback**, on four tracks:
river-run 505, mountainstreet 233, seatrack 220, space-sprint 82.

**Every one of them is "needs a forward move" — and the reason is that they are not clipping along the
track at all.** On those frames the leader has 159–325 px of room behind him against a half-body of
about 82 px, so the along-track direction is not where he is short: only **2%** of them have less room
behind than half his body, and **none** has a body longer than the frame. **The violation is ACROSS the
track, and a setback moves him ALONG it — a sideways overflow cannot be fixed by a move that is
perpendicular to it.**

**That is the third mechanism, and it is the lateral clipping MIDRACE-LEADER-CLIP-1 already found on
river-run** — the one track whose clipping was lateral rather than ahead. It is now quantified: after
a perfect setback, **0.44% of frames remain, all lateral**, and river-run carries half of them. **The
setback closes the ahead case and leaves the sideways case untouched.**

---

# OVERVIEW — it needs the setback LESS, and possibly a different answer

| state | pooled engagement |
| --- | --- |
| LEADER_ZOOM | 0.6–15.4% by track |
| LEAD_CHANGE | 0.0–11.7% |
| **OVERVIEW** | **0.0–3.9%**, and 0.0% on two tracks |

**OVERVIEW engages least of the three**, and on mountainstreet and luger-hill it never engages at all.
It also differs in kind: `_focusAnchorRacer` returns **null** in OVERVIEW, so there is no focus racer
to set back — the placement that would have to move is not attached to him. **A setback built on
LEADER_ZOOM's anchor will not transfer to OVERVIEW unchanged**, and OVERVIEW's own rate is low enough
that it may not need to. **Whether it does is his call, and it should be a separate decision rather
than an assumption inside this one.**

---

# HOW OFTEN IT ENGAGES — and it matches the known clip rates

| track | LEADER_ZOOM | LEAD_CHANGE | OVERVIEW | all three | worst race |
| --- | --- | --- | --- | --- | --- |
| **space-sprint** | **15.4%** | 11.7% | 3.9% | **14.1%** | **s6 (27.6%)** |
| seatrack | 6.5% | 3.6% | 1.7% | 5.2% | s8 (13.7%) |
| river-run | 4.6% | 0.0% | 1.7% | 3.8% | s9 (13.7%) |
| mountainstreet | 4.4% | 2.3% | 0.0% | 4.0% | s6 (11.6%) |
| city-circuit / dirt-oval / searound | 1.4 / 1.1 / 1.1% | ≤0.6% | ≤1.3% | 0.9% | ~2% |
| ice-track / garden-path / luger-hill | 1.1 / 0.7 / 0.6% | ≤0.7% | ≤0.9% | 0.4–0.8% | ≤1.9% |

**Pooled: 6,831 of 236,950 frames — 2.88%.**

**It engages on the same frames and no others**, which is the check the brief asked for:
space-sprint's LEADER_ZOOM engagement of 15.4% matches LEADER-CORRIDORS-DEFAULT-1's measured clip rate
of 15.05% at the shipped default, and seed 6's 27.6% matches that report's 27.6% exactly. The setback
is triggered by the clipping and by nothing else.

---

## WHAT COULD NOT BE ESTABLISHED

- **The Δfrac figures assume delivered placement equals intended placement.** The setback is solved
  from the leader's DELIVERED screen position, which is exact; converting it to a fraction of
  `leaderForwardFrac` assumes no pan lag. On lagging frames that conversion is approximate, which is
  why some worst-case rows convert to a fraction outside [0,1].
- **This measures the setback the CURRENT frames would need.** Applying a setback moves the camera,
  which changes the next frame — a built version would find a different, probably smaller, series.
  **This is an upper bound on the need, not a simulation of the fix.**
- **Ten races per track is a worst-of-ten**, one roster, 20 racers, 60 Hz. The extent is a rectangle
  around each racer rather than his sprite, so the rates are a floor.
- **The residual's cause is deduced, not directly measured.** It follows from the recorded room-behind
  and body figures; the across-track overflow was not itself recorded on those frames.

## SOURCE HYGIENE

No product file touched. No default read that was not already read; `leaderForwardFrac` and
`visibleCorridors` are untouched.

**Added, both measure-only:** `scripts/diag/leader-setback-need.mjs` — solves the minimal pull-back
analytically from linear bounds rather than scanning, because a scan needs a step size and a step size
is a number nobody chose; it is deliberately **back-only**, so a frame that would need a forward move
is recorded as a residual with its reason instead of being silently fixed by a sign flip. And
`scripts/diag/leader-setback-sum.mjs`, which differences the setback over CONSECUTIVE frames only, so
a state change does not manufacture a fake jump.

**Noticed and left:** the stale conflict marker in `reports/evolution/INDEX.md`
(`||||||| 5204b10b`) — tenth report to record it.

## CONFORMITY

| asked | delivered |
| --- | --- |
| ten races on ten tracks at the shipped settings | 100 races, `DEFAULT_CAMERA_CONFIG`, nothing overridden |
| (a) setback size in placement units AND screen px, distribution, worst, per track, space-sprint apart | the first table; space-sprint first with its own row |
| (b) how often it engages, per state and per track; confirm it matches the clip rates | 2.88% pooled; 15.4% vs the known 15.05%, seed 6 27.6% vs 27.6% |
| (c) what it costs the forward view, in px and as a share | measured — **and it gains forward view**; what it spends is the view behind, 2.5–25.3% |
| (d) how fast it would move if applied raw; if that is a jolt, say so with the number | **617 px in one frame** — it is a jolt, and bigger than the defect it fixes |
| (e) does it reach zero; if not, name the residual's cause | **no** — 0.44% remain, all LATERAL, which a move along the track cannot fix |
| OVERVIEW in scope; say if it needs the same treatment | engages least, has **no focus racer**, and needs a separate decision |
| build nothing, change no default, add no key | nothing built; `git diff` over client/ and server/ empty |
| browser path, camera seed from race seed, read core count | done; 14 cores |
| read-only, state what verification applies and why | stated at the top |
| report + INDEX same commit, push branch, merge report only | done |

## PROPOSALS

### A — MINE: bound the setback, and accept the tail rather than chasing it
The median need is 50–210 px and the worst is 1,012. A setback bounded to roughly the p95 would fix
almost everything for a predictable cost in the rear view; the tail frames would still clip, and they
are the same frames a bound cannot help without putting the leader off the back of his own shot.
**The bound is the design decision, and this report's distribution is what sizes it.**

### B — MINE: reuse the run-in's easing rather than writing a damper
The setback is static on 95% of frames and jumps up to 617 px on a handful. That is precisely the
shape `_levelEaseTo` was built for — a demanded quantity that steps while its demand is smooth — and
it already re-anchors on target change, eases in log space and leaves by arriving. **A second smoother
here would be the sixth patch this strand has learned to refuse.**

### C — MINE: the lateral residual is its own piece and should not be folded in
0.44% of frames, half on river-run, and no setback can touch them because the move is perpendicular to
the overflow. Folding a lateral fix into a setback would produce one mechanism doing two jobs — which
is how the run-in's five compensating patches happened.

### D — Decide OVERVIEW separately
It has no focus racer, engages least, and never engages at all on two tracks. A setback built on
LEADER_ZOOM's anchor has nothing to attach to there.

### E — Re-measure after building, because this is an upper bound
Every figure here is the need computed against frames the current camera produced. A built setback
changes the frames, so the engaged share and the worst-case size should both come down. **The report
that follows the build should not expect these numbers back.**

## WHAT OUTLIVES THIS REPORT

A setback that turns out to be small where it matters — 50 px on his own track — and free in the
direction he cares most about, since it opens the road ahead rather than closing it. A number that
says it cannot be applied raw: 617 px in one frame, bigger than the width step just removed. And a
named remainder — 0.44% of frames clipping sideways, which no setback of any size can reach.
