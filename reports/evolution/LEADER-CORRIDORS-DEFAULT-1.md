# LEADER-CORRIDORS-DEFAULT-1 — what the shipped default costs, and why no default can close this

**Date:** 2026-08-26 · **Branch:** `diag/leader-corridors-default-1`, off master · **MEASURE ONLY** —
no default changed, nothing built, no key added. **600 races**: 6 settings × 10 tracks × 10 races,
the owner's standing size for a confirmation. Browser path, camera seed from the race seed. 14 cores.

**Read-only, and the omissions are deliberate:** no fingerprints, no browser gate, no client suite. No
product file changed — `git diff` over `client/` and `server/` is empty — so all three would be
measuring a tree they already agree with. The sweep passes an override object into the harness for the
duration of a run; `defaults.js` is untouched.

**What was swept, stated precisely:** `visibleCorridors` is a PER-STATE key. **LEADER_ZOOM and
LEAD_CHANGE both ship at 0.75** and are the two of his three states that number names, so the sweep
moves both together. **OVERVIEW ships at 1.5 and was left alone**, and is reported as a control.

---

## THE TABLE — clip rate in the swept states, % of their frames

| setting | city-cir | dirt-ov | garden | ice | luger | mountain | river-run | searound | seatrack | **space-sprint** | **POOLED** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.55 | 1.59 | 1.60 | 1.52 | 2.73 | 9.79 | 17.36 | 10.60 | 1.13 | 27.21 | **46.20** | **11.02** |
| 0.65 | 1.01 | 0.97 | 0.54 | 1.27 | 3.77 | 8.12 | 6.30 | 0.85 | 11.82 | **28.57** | **5.83** |
| **0.75 — SHIPPED** | 0.93 | 0.92 | 0.47 | 0.91 | 0.43 | 4.33 | 3.95 | 0.80 | 5.61 | **15.05** | **3.11** |
| 0.85 | 0.87 | 0.91 | 0.47 | 0.86 | 0.41 | 1.55 | 0.22 | 0.79 | 2.58 | **5.98** | **1.41** |
| 1.00 | 0.85 | 0.90 | 0.47 | 0.86 | 0.40 | 0.68 | 0.18 | 0.77 | 1.46 | **2.80** | **0.93** |
| 1.20 | 0.84 | 0.89 | 0.46 | 0.85 | 0.40 | 0.66 | 0.16 | 0.77 | 1.40 | **2.70** | **0.91** |

**space-sprint is the worst track at every single setting**, and the shipped default is where he saw
it: **15.05% pooled over ten races, 27.6% on seed 6.**

### Space-sprint on its own line — his case

| setting | rate | frames | worst race | leader's drawn length |
| --- | --- | --- | --- | --- |
| 0.55 | 46.20% | 8,980/19,438 | seed 2 (64.4%) | 357 px |
| 0.65 | 28.57% | 5,554/19,438 | seed 2 (47.9%) | 304 px |
| **0.75 — SHIPPED** | **15.05%** | 2,925/19,438 | **seed 6 (27.6%)** | 265 px |
| 0.85 | 5.98% | 1,162/19,438 | seed 6 (12.5%) | 235 px |
| 1.00 | 2.80% | 545/19,438 | seed 7 (4.3%) | 200 px |
| 1.20 | 2.70% | 524/19,438 | seed 7 (4.2%) | 168 px |

**From the default to 0.85 the rate falls by 60%; to 1.00 by 81%.** Beyond 1.00 the curve is flat —
1.20 buys 0.1 points for another 16% of racer size.

---

## (b) WHAT WIDENING COSTS — the trade, not just the benefit

| setting | leader's drawn length | road as share of frame height | pooled clip rate |
| --- | --- | --- | --- |
| 0.55 | 192.6 px | 132.0% | 11.02% |
| 0.65 | 167.7 px | 114.9% | 5.83% |
| **0.75 — SHIPPED** | **148.4 px** | **101.7%** | **3.11%** |
| 0.85 | 133.2 px | 91.3% | 1.41% |
| 1.00 | 115.4 px | 79.1% | 0.93% |
| 1.20 | 97.8 px | 67.0% | 0.91% |

**The shipped default is the setting at which the road exactly fills the frame** — 101.7% of the
frame's short axis. That is almost certainly not a coincidence and it is a defensible picture: no
surroundings, all track.

**Every step wider trades racer size and track-fill for fewer clipped frames.** At 1.00 the leader is
**22% smaller** than at the default and **a fifth of the picture is no longer road**. At 1.20 it is a
third. That is the cost he has to look at, and it is not visible in a clip-rate table alone.

---

## (c) IS THERE A SETTING WITH NO CLIPPING AT ALL? — **NO, AND THAT IS THE FINDING**

**Not one of the six settings reaches zero on a single track, let alone on all ten.** Even at 1.20,
where the racers are half the size they are at 0.55, every track still clips:

| at 1.20 | rate |
| --- | --- |
| river-run | 0.16% |
| luger-hill / garden-path | 0.40% / 0.46% |
| mountainstreet / searound | 0.66% / 0.77% |
| city-circuit / ice-track / dirt-oval | 0.84% / 0.85% / 0.89% |
| seatrack / space-sprint | 1.40% / 2.70% |

**So no default can close this.** Widening removes the part of the clipping the setting drives and
leaves a **residual floor of roughly 0.4–0.9% on most tracks** that the setting cannot touch at any
value tested. **The guarantee is the only complete answer**, exactly as the brief anticipated.

---

## (d) IS THE ANSWER THE SAME FOR EVERY TRACK? — no, and the tracks split into two kinds

**Six tracks barely respond to the setting at all.** city-circuit 0.93 → 0.84, dirt-oval 0.92 → 0.89,
garden-path 0.47 → 0.46, ice-track 0.91 → 0.85, searound 0.80 → 0.77 across the entire sweep. **They
are already at their floor at the shipped default**, and widening buys them nothing.

**Four respond strongly**, and they are the ones with a problem: space-sprint 15.05 → 2.70,
seatrack 5.61 → 1.40, mountainstreet 4.33 → 0.66, river-run 3.95 → 0.16. luger-hill is a third kind —
9.79 at 0.55 collapsing to 0.43 by the default, so it is already resolved.

**The setting is global today and the right value is not.** A value that fixes space-sprint costs the
six floor tracks 22% of their racer size for a benefit of roughly one tenth of one percent. **If the
default moves, it moves for every track including the six it does not help** — which is an argument
for the guarantee rather than for a bigger number, and a second argument for a per-track override if
the guarantee proves expensive.

---

## THE CONTROL, AND ONE THING I COULD NOT PROVE

OVERVIEW was not swept and should be flat. Measured: **1.13 / 1.02 / 0.93 / 0.90 / 0.90 / 0.90%** —
nearly flat, drifting 0.23 points across the sweep.

**That drift is not nothing and I did not prove its cause.** The likely reading is that the state
machine's transitions shift slightly when LEADER_ZOOM's zoom changes, so *which* frames are OVERVIEW
differs between arms — a changed frame mix, not a leaked override. The override object only rewrites
the two swept profiles, which is visible in the source. **But "likely" is the honest word**, and if the
drift matters to a decision it should be established rather than assumed.

---

## WHAT THE GUARANTEE WOULD HAVE TO PROMISE — sketched, not built

Unchanged from the previous report and now better justified, because (c) shows no default closes it:

1. **That the subject's drawn BODY is inside the frame, not his point.** No guarantee anywhere reads a
   racer's drawn size today, so this is a new kind of promise rather than a tightened number.
2. **A term in LEADER_ZOOM and OVERVIEW that actually takes the leader.** Both currently use
   `corridorGuarantee`, which takes the road's width and the heading and no racer at all — there is no
   racer argument to tighten.
3. **That it binds.** The width came from `state` on 96–100% of clipped frames, so a guarantee that
   exists but never becomes the argmin would change nothing.
4. **That it holds at a TIGHT setting too.** This is what (c) adds: a host who tightens to 0.55 must
   not fall back into a 46% hole. A guarantee that only works near the default is not a guarantee.

**It is not built here and no fix is proposed beyond this.** It is the real repair, it is independent
of the default, and it is a separate block.

---

## HAND-OFF — the setting is ALREADY reachable

**No Dev Screen work was needed.** `visibleCorridors` is exposed per state at
**Dev Screen → 🎥 Camera Advanced → Zoom Profiles**, tier `advanced`, as a slider with
**min 0.25, max 13, step 0.05** — `CameraAdvancedSection.jsx`, `PROFILE_FIELDS[0]`, labelled
**"World in shot (corridors)"**. He can switch between every swept value without a rebuild.

**To change what this report swept, he must move it on BOTH `Leader Zoom` and `Lead Change`** — they
are separate profiles that happen to share the shipped 0.75.

### What to compare by eye, and it should take two minutes

**Track `space-sprint`, seed 6** — his case, the worst track, and the worst race at the default.

| set it to | what he should see | measured |
| --- | --- | --- |
| **0.75** (as shipped) | the leader clipped often; road fills the frame | **27.6%** of frames |
| **0.85** | clipping halved; racers slightly smaller | **12.5%** |
| **1.00** | clipping nearly gone; racers 22% smaller, a fifth of the frame not road | **2.8%** |

**Two comparisons decide it:** 0.75 → 0.85 asks whether halving the clipping is worth 11% of racer
size; 0.85 → 1.00 asks whether the last of it is worth another 15%. **1.20 is not worth looking at** —
it measures the same as 1.00 and costs a further 16%.

---

## SOURCE HYGIENE

No product file touched; no default moved; no key added.

**Changed:** `scripts/diag/midrace-leader-clip.mjs` — the existing override flag now applies to both
states that ship at 0.75 rather than LEADER_ZOOM alone (stated in a comment at the flag, with the
reason), and two fields were added to each row: `bodyPx`, the leader's drawn length on screen, and
`roadFrac`, the road's share of the frame's short axis. Both exist to make section (b) possible —
without them the report could show the benefit of widening and not its cost.

**Added:** `scripts/diag/corridor-default-sum.mjs`, measure-only, which prints benefit and cost in the
same table on purpose, and prints the OVERVIEW control precisely so a leaked override would show.

**Noticed and left:** the stale conflict marker in `reports/evolution/INDEX.md`
(`||||||| 5204b10b`) — ninth report to record it. It is one line and nobody owns it; see proposal E.

---

## CONFORMITY

| asked | delivered |
| --- | --- |
| sweep at least 0.55/0.65/0.75/0.85/1.00/1.20 | all six |
| ten races on each of ten tracks | 600 races |
| clip rate in his three states, per track and pooled, worst track named | the table; space-sprint worst at every setting |
| space-sprint its own line | its own section, with seed 6 called out |
| what a wider setting costs — drawn size, road vs surroundings | §(b), in the same table as the benefit |
| is there a setting with no clipping on every track | **no — not one setting reaches zero on any track** |
| is the answer the same for every track | **no** — six tracks are at their floor already, four respond |
| do not change the default | unchanged; `defaults.js` untouched |
| do not build the guarantee | not built; four things it would have to promise are named |
| make the setting reachable in the Dev Screen, or say where | **already reachable** — path, tier and range named |
| production build on 4173, report the badge | see the hand-off message |
| name two or three settings and a seed to compare | 0.75 / 0.85 / 1.00 on space-sprint seed 6 |
| report + INDEX same commit, merge report only, push the rest | done |

---

## PROPOSALS

### A — MINE: the floor is the guarantee's real target, not the peak
Six of ten tracks sit at 0.4–0.9% at every setting. That residual is invisible in the space-sprint
headline and is what a host will still see after any default change. Sizing the guarantee against the
FLOOR rather than against space-sprint's 15% would produce a cheaper guarantee that helps every track.

### B — MINE: if the default moves, move it for the tracks it helps
The key is global; the benefit is not. A per-track override — the same shape `defaultRacerTypeId`
already has — would let space-sprint and seatrack widen without costing the six floor tracks a fifth
of their racer size. **Only worth it if the guarantee turns out expensive**; otherwise it is a second
mechanism where one would do.

### C — MINE: 1.20 should probably be off the table whatever he picks
It measures identically to 1.00 (0.91% vs 0.93% pooled) and costs another 16% of racer size. The curve
is flat past 1.00, so nothing above it buys anything.

### D — MINE: settle the OVERVIEW drift before it is quoted
0.23 points across a sweep that should not have touched OVERVIEW at all. Almost certainly a changed
frame mix; "almost certainly" is how a stale number enters a record. One arm with the state sequence
logged would close it.

### E — Fix the committed conflict marker in `INDEX.md`
Nine reports have now recorded `||||||| 5204b10b` and left it. It is one line, `check-index` does not
see it, and each report that notes it makes the note less likely to be acted on.

---

## WHAT OUTLIVES THIS REPORT

A number for the trade the owner actually has to make: from the shipped default, 0.85 halves the
clipping for 11% of racer size and 1.00 removes four fifths of it for 22%. The fact that the shipped
default is the setting where the road exactly fills the frame, which explains why it was chosen and
why it is also the worst value for this fault. And the answer that matters most: **no setting reaches
zero on any track**, so the default is a mitigation and the guarantee is the repair.
