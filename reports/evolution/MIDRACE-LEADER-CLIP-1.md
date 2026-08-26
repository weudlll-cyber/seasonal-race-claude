# MIDRACE-LEADER-CLIP-1 — nothing guarantees the leader mid-race, and he is clipped 13% of the time

**Date:** 2026-08-26 · **Branch:** `diag/midrace-leader-clip-1`, off master · **MEASURE ONLY** —
nothing built, nothing repaired, no key. Two new measure-only scripts.

**Read-only, and the omissions are deliberate:** no fingerprints, no browser gate, no client suite. No
product file changed, so all three would be re-measuring a tree they already agree with. Browser path
throughout — Quick Test defaults, camera seed derived from the race seed. **14 cores.**

---

## FIRST — WHAT THE MID-RACE FRAMING GUARANTEES ABOUT THE LEADER

**Neither whole nor present, in the states where he is actually clipped.** This strand has twice found
a guarantee promising less than everyone assumed; this is the third time, and it is the largest gap of
the three.

**He is never guaranteed WHOLE, anywhere, by construction.** Every guarantee in `framingRule.js` works
on POINTS. Not one of them reads a racer's drawn size — there is no `drawnBody*` anywhere in the file.
The single body-aware term is `contenderGuarantee`'s `padding` argument, and that is the closing
phase's, not the race's. **So "the leader is fully visible" is not a promise the mid-race camera makes
or has ever made.**

**Whether he is even PRESENT depends on the state, and in two of them he is not the subject at all:**

| state | anchor | guarantee | is the leader covered? |
| --- | --- | --- | --- |
| LEADER_ZOOM | leader | CORRIDOR | his POINT, via the road's width |
| LEAD_CHANGE | new leader | PAIR | yes — he is one of the pair |
| **BATTLE_ZOOM** | **pair-midpoint** | **PAIR** | **NO — the pair is the battle, and the leader need not be in it** |
| **COMEBACK_ZOOM** | **comebacker** | **CORRIDOR** | **NO — the anchor is someone else entirely** |

**And that is exactly where the clipping is.** On every one of the ten tracks, **the leader was the
anchor on 0% of clipped frames**, and BATTLE_ZOOM accounts for **82–95%** of them (with COMEBACK_ZOOM
taking a further 12% on ice-track and 42% on luger-hill). The width on those frames is set by
`state` — the state's own zoom — on **78–86%** of them, not by any guarantee.

**So the mechanism is not a guarantee failing. It is a guarantee that was never asked to cover him.**

---

## HOW OFTEN — he is right, and "viel zu oft" is if anything an understatement

Ten tracks × ten races, 335,596 mid-race frames (after the start window, before the endgame, never
inside the run-in or the finish):

| track | mid-race frames | clipped | rate | episodes | median len | longest | worst race |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **space-sprint** | 29,872 | 9,571 | **32.04%** | 91 | 44 | 531 | **s6 (45.7%)** |
| seatrack | 29,714 | 5,737 | 19.31% | 56 | 58 | 501 | s6 (32.5%) |
| searound | 31,552 | 4,938 | 15.65% | 19 | **185** | 493 | s9 (30.7%) |
| city-circuit | 39,042 | 5,304 | 13.59% | 38 | 113 | 491 | **s9 (38.8%)** |
| ice-track | 36,889 | 3,907 | 10.59% | 32 | 61 | **900** | s4 (27.8%) |
| dirt-oval | 44,077 | 4,576 | 10.38% | 32 | 154 | 493 | s5 (17.0%) |
| mountainstreet | 29,757 | 2,656 | 8.93% | 43 | 49 | 194 | s7 (17.8%) |
| luger-hill | 29,768 | 2,581 | 8.67% | 21 | 57 | 853 | s9 (29.2%) |
| garden-path | 35,324 | 2,642 | 7.48% | 18 | 92 | 464 | s9 (17.0%) |
| river-run | 29,601 | 2,060 | 6.96% | 28 | 54 | 315 | s2 (15.7%) |

**Pooled: 43,972 of 335,596 frames — 13.10% — across 378 episodes.** The median episode is **63
frames**, about a second at 60 Hz; the longest is **900 frames, fifteen seconds**.

**Races to watch:** `space-sprint` seed 6 (45.7% of its mid-race frames), `city-circuit` seed 9
(38.8%), `seatrack` seed 6 (32.5%).

**AND HIS DESCRIPTION UNDERSTATES IT.** He said clipped, not absent. **23,704 of the 43,972 clipped
frames — 54% — have the leader's CENTRE off the canvas**, which is absent, not clipped. Roughly 7% of
all mid-race frames have no leader on screen at all.

## LATERAL OR AHEAD — he named both, and it is AHEAD

| track | mean ACROSS | mean ALONG | max ACROSS | max ALONG | verdict |
| --- | --- | --- | --- | --- | --- |
| searound | 149.7 | 366.8 | 1208.4 | 1887.3 | **AHEAD** |
| ice-track | 78.3 | 230.1 | 526.3 | 977.6 | **AHEAD** |
| space-sprint | 82.1 | 215.3 | 727.9 | 1548.7 | **AHEAD** |
| dirt-oval | 70.7 | 198.3 | 452.8 | 627.2 | **AHEAD** |
| city-circuit | 65.0 | 192.6 | 346.0 | 995.1 | **AHEAD** |
| luger-hill | 48.3 | 145.3 | 233.7 | 503.8 | **AHEAD** |
| garden-path | 36.3 | 95.4 | 186.2 | 352.3 | **AHEAD** |
| seatrack | 93.9 | 104.7 | 436.2 | 550.5 | mixed |
| mountainstreet | 62.8 | 64.5 | 413.8 | 545.9 | mixed |
| river-run | 38.7 | 21.5 | 152.7 | 133.1 | LATERAL |

**Seven of ten are AHEAD, two mixed, one lateral.** The overflow is decomposed against the track's
screen heading, so "ahead" means along his direction of travel — the second of the two things he
named. **That decides where to look: the leader runs off the FRONT of the frame far more than off its
side**, which is consistent with BATTLE_ZOOM anchoring on a pair-midpoint that is behind him.

**river-run is the exception and it is his usual test track** — the one place where the fault is
lateral instead. Worth knowing before he picks a race to watch.

## IS IT NEW? — NO

Measured by reverting `client/src/modules/camera/` to master as it stood **before** the run-in work
(`70607f7a`) and running the identical sweep:

| | mid-race frames | clipped | rate | episodes |
| --- | --- | --- | --- | --- |
| **before** the run-in work | 335,596 | 44,025 | **13.12%** | 389 |
| **after** (master today) | 335,596 | 43,972 | **13.10%** | 378 |

**A difference of 53 frames in 335,596 — 0.02 percentage points.** Every track is within 0.1 pp, and
the worst race on every track is the same seed at the same percentage (space-sprint s6 45.7% both
arms, city-circuit s9 38.8% both, seatrack s6 32.5% both).

**So the run-in work did not cause this and did not make it worse.** The question was worth asking —
the level ceiling and the pan repair both touch shared machinery — and the answer is that neither
reaches the mid-race states, which is what their scoping was supposed to achieve.

**What it does NOT establish:** whether the rate changed at some earlier point. This compares two
commits, not a history. If he remembers a time when the leader was reliably whole, the change is
older than the run-in work and this measurement cannot date it.

## WHAT COULD NOT BE ESTABLISHED

- **Ten races per track is a worst-of-ten, not a tail.** Consistent with the size rule the owner set
  for confirmations, but it means a rare severe case would not appear.
- **One roster, one field size, 20 racers.** A racer's name is physics, so a different roster is a
  different race, and nothing here speaks about 40-racer fields where the shot is wider.
- **The extent is a rectangle, not the sprite.** Half a drawn body length along the heading and half a
  drawn body width across it. A sprite whose art overflows that box is clipped earlier than this
  reports, so the rates are a floor.
- **60 Hz only**, and no browser run. The headless director is known not to reproduce the owner's
  excursions exactly; the RATES should be structural, the individual frames may not be.
- **Whether any of it looks wrong to him.** 13% of frames with a clipped leader may be entirely
  normal for a chase camera in a battle shot. The instrument counts; it does not judge.

## SOURCE HYGIENE

No product file touched. `git diff` over `client/` and `server/` is empty — the before-arm revert was
restored from `master` and verified by grepping for `_resolvePanTarget` and `_levelEaseTo`.

**Added, both measure-only:** `scripts/diag/midrace-leader-clip.mjs` (the probe — gives the leader an
EXTENT rather than a point, and splits the overflow against the track heading) and
`scripts/diag/midrace-clip-sum.mjs` (the tables; counts EPISODES as well as frames, because a
90-frame clip is one thing a viewer sees and not ninety).

**Noticed and left:** the stale conflict marker in `reports/evolution/INDEX.md` (`||||||| 5204b10b`) —
sixth report to record it, still out of scope.

## CONFORMITY

| asked | delivered |
| --- | --- |
| establish first what is guaranteed, and say so at the top | first section: neither whole nor present, with the per-state table |
| ten races on each of ten tracks, Quick Test defaults, camera seed from race seed | 100 races, 335,596 mid-race frames |
| how often clipped by any edge | 13.10%, per-track table |
| how long each episode lasts | 378 episodes, median 63 frames, longest 900 |
| which edge | per-track edge counts in the tool's section 3 |
| which term set the width and the anchor | `state` 78–86%; leader was the anchor on **0%** of clipped frames |
| rate per track, worst races with seeds | table above; space-sprint s6, city-circuit s9, seatrack s6 |
| lateral or ahead | **AHEAD on 7 of 10**, mixed 2, lateral 1 (river-run) |
| is it new — master before vs after the run-in work | **no**: 13.12% → 13.10%, 53 frames in 335,596 |
| read-only, state what verification applies and why | stated at the top |
| push the branch, merge the report only | done |

## PROPOSALS

### A — MINE: decide whether the leader is promised anything mid-race, and write it down
The gap is not a bug until someone says what the rule should be. Today BATTLE_ZOOM frames a battle the
leader may not be in, which is a defensible editorial choice — the fault is that nothing says so, and
three separate blocks have now discovered a guarantee by measuring it. One sentence per state in
`CAMERA_DIRECTOR.md` would end that.

### B — MINE: if he wants him whole, the guarantees need his EXTENT, not his point
Every term works on points. Adding a body half-extent to the mid-race guarantee is the same shape as
`contenderGuarantee`'s existing `padding`, so there is a precedent and no new concept — but it widens
every shot it touches, and that is a picture decision, not a repair.

### C — MINE: the AHEAD bias points at the anchor, not the width
He is lost off the FRONT seven times in ten. BATTLE_ZOOM anchors on the pair-midpoint, which sits
behind a leader who is pulling away, so widening the shot treats a symptom. The cheaper question is
whether the battle shot should keep the leader in frame at all when he is not in the battle.

### D — Watch `space-sprint` seed 6 before deciding anything
45.7% of its mid-race frames. If that looks acceptable, the whole finding is a non-issue and the
number is just what a chase camera does.

## WHAT OUTLIVES THIS REPORT

A third guarantee found to promise less than everyone assumed — and this time the answer is that
nothing was promised at all. A rate he can act on: 13% of mid-race frames, more than half of them with
the leader gone entirely rather than merely cut. The direction that decides where to look: he goes off
the front, not the side. And one question closed — it is not new, and the run-in work did not do it.
