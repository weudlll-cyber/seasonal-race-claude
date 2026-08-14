# ZOOM-PACE-5 — the cap arrives instead of appearing, and the probe stops lying

**Branch:** `feat/contender-zoom`. **Not merged. Nothing minted.** Continues
[ZOOM-PACE-4](ZOOM-PACE-4.md).

---

## 1. The probe — the deliverable of this step

`_binding` was the argmin over `_ceilings`, while the corridor cap is applied to `guaranteed`
afterwards. So on every frame the cap decided the shot, the probe still named whichever ceiling was
smallest. **That single defect produced three wrong causes and two no-op builds.**

It now names the term the delivered zoom is **equal to**, whatever stage produced it. Proven on the
frame traced in ZOOM-PACE-4:

```
LARGEST SINGLE-FRAME JUMP — target x4.057 (2.47 -> 10.02 at prog 0.9701, line->corridor-cap)
```

## 2. Shape (b) was built first, and it failed

Hanging the cap on the run-in's own continuous progress is the more honest shape, so it was built
first. **It flattened the leap and let the cap escape the finish shot.** The run-in composes during
OVERVIEW and LEADER_ZOOM as well, so the cap began tightening mid-race states: **OVERVIEW's
`visibleCorridors` went from its 1.5 setting to 0.469**, caught by four convergence tests. The
run-in's progress is continuous but it is not *confined* to the shot the rule is about.

**So (a):** the scope stays `PHOTO_FINISH` and the onset gets a duration —
`corridorCapArriveMs`, **1500 ms**, one Dev Screen control. What it compensates for is written beside
it in `defaults.js`: the scope is a state predicate and a state predicate is a cut.

## 3. The pace, in viewer terms — ice-track seed 9

| | ms | zoom | world width | **shrink/s** | flow px/s |
| --- | --- | --- | --- | --- | --- |
| **before** (cap as a step) | **467** | 2.44 → 9.50 | 1259 → 324 | **−2.912** | 565 |
| **after**, first stretch | 417 | 2.47 → 4.55 | 1244 → 675 | **−1.468** | 411 |
| **after**, second stretch | 983 | 4.58 → 9.03 | 670 → 340 | **−0.690** | 241 |
| master (control) | 1417 | 6.30 → 16.75 | 488 → 183 | −0.690 | 301 |

**The ×4.057 single-frame step is gone.** The same inward travel now takes **1400 ms instead of
467**, at about **−0.93 shrink/s averaged against −2.912** — 3.1× gentler. The only single-frame jump
left in the endgame is master's own zoom-out target step (×3.750), which master has identically and
which is outside this brief.

**The run-in's wide opening is preserved** — 2006 px of world, against the 1479 px that (b) had cut
it to.

**river-run seed 2814** stays uneventful: one rush, the opening (+1.366), and no inward rush at all —
smoother than master, which has three.

**The crawl is unchanged and expected to be**: it is the hyperbola's flat foot and belongs to the
hold-then-close design.

## 4. The cap's own cost, re-measured — it now costs nothing

Ten tracks × three seeds, on the contender yardstick. The cap is nulled on the instance to price it
apart from the contender set, since one key controls both:

| arm | contenders not whole | empty frames |
| --- | --- | --- |
| master (`contenderZoom` off) | **10.3%** | 46 |
| contender set, **cap nulled** | **3.4%** | 46 |
| contender set **+ cap arriving** | **3.4%** | **35** |

**The cap is free — and slightly positive on empty frames.** CONTENDER-ZOOM-1's 57.3% → 81.7% was
the shock plus the wrong yardstick. **The owner's suspicion was right.**

**Should they be separable?** No — recommended as one feature. The cap costs nothing measurable, it
implements a rule the owner keeps, and a second key would buy a switch nobody has a reason to throw.

**One correction to my own record:** CONTENDER-ZOOM-4's commit says master is 45.2% on this
yardstick. That was the lane-only yardstick, before the level condition. On the final
both-conditions yardstick master is **10.3%**.

## 5. What must not move

| | required | measured |
| --- | --- | --- |
| contenders not whole | 3.2% | **3.4%** ← drifted |
| ice-track seed 9 | 0.0% / 0.0% | **0.0% / 0.0%** |
| river-run seed 2814 | 0.0% / 0.0% | **0.0% / 0.0%** |
| crossing zoom median | 99% | **99%** |
| photo-finish frames | 7468 | **7468** |
| `check-runin-frame` | green both halves | **PASS**, 0 empty |
| verify | green | **PASS 18 FAIL 0** |

**One number drifted: 3.2% → 3.4%, reported rather than rounded.** It is the cap arriving later
changing the framing path through the first 1500 ms of the shot. Both named races stay at 0.0%/0.0%.

## 6. Fingerprints — fresh, NOT minted

| role | before | now |
| --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` — unmoved |
| camera | `d7a8fe54072df6d7` | `ff2bc42af377b5cf` |
| render | `d1c9d5d0da6a964f` | `0d5854a652c69d87` |

`engine-reach --check` on the real diff: **none of the changed paths can reach the race engine.**
