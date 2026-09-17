# LATE-GAP-1 — 38% of races open a gap past his allowance after 0.95, the leader wins 96% of them, and two thirds of those gaps were already open when the brake let go

Branch `feat/gap-leader-brake`. Date: 2026-09-17. **Read-only: no source changed, nothing minted,
nothing merged, no shipped default touched.** V1 OFF in both arms. The owner's store was not opened.

---

## ★ THE ANSWER IN THREE NUMBERS

| | SHIPPED | 56 px / 13% |
|---|---|---|
| races opening a gap **> 56 px** (his allowance) after 0.95 | **114/300 (38.0%)** | 106/300 (35.3%) |
| races opening a gap **> 124 px** after 0.95 | **24/300 (8.0%)** | **12/300 (4.0%)** |
| of those > 124 px races, how many the leader of that gap **wins** | **24 of 24** | **12 of 12** |

★★★ **A gap above 124 px after 0.95 is a guaranteed win for the racer holding it — 36 of 36 across
both arms, no exceptions. The brake halves how often that happens: 24 races to 12.**

★★ **But it barely changes how often a gap merely past his allowance opens** (38.0% → 35.3%), and
**96% of all such races are won by the leader of that gap** in both arms. The event the owner objects
to is common, and the brake reaches only its largest instances.

---

## STEP 1 — I RE-RACED, AND WHY

**The grid's raw per-race output did not survive.** I deleted it in the sweep that closed the last
chain, as that chain instructed — `C:/Users/weudl/AppData/Local/Temp/claude/grid`, `deep`, `fair5`,
`fairseed` are all empty. The harnesses survived; the data did not.

**So these are re-raced numbers, from the identical fixture**: ten tracks, seeds 1–30, 40 racers, the
owner's roster, action stage `wild`, the same two arms. **No number in this report is mixed with a
recomputed one — every figure here comes from this re-race.**

★ **The races are the same races.** A repeat of one cell (searound, brake arm, 30 seeds) is
**byte-identical** to the first, and the previous chain separately proved this fixture reproduces
300/300 to the millisecond. Determinism was checked, not assumed.

### The segment, defined so it cannot be contaminated

**From progress 0.95 — the brake's window end, `gapBrakeWindowEnd` in
[defaults.js](../../client/src/modules/storage/defaults.js) — to the moment the WINNER crosses.** The
segment closes there by construction: after the winner is home, the leader→2nd gap among whoever is
still running is a different quantity, and measuring past it is what contaminated an earlier report of
mine.

---

## STEP 2 — THE COUNT, AT THREE THRESHOLDS

**N = 300 races per arm.**

| threshold | SHIPPED | 56 px / 13% | difference |
|---|---|---|---|
| **> 56 px** (his allowance) | **114/300 (38.0%)** | 106/300 (35.3%) | −8 races |
| **> 90 px** (the shipped allowance) | 48/300 (16.0%) | 47/300 (15.7%) | −1 race |
| **> 124 px** | **24/300 (8.0%)** | **12/300 (4.0%)** | **−12 races, halved** |

★ **The count is not hostage to one threshold, and the three disagree.** At 56 px and 90 px the brake
changes almost nothing; at 124 px it halves the count. **The brake reaches the big late gaps and not
the ordinary ones.**

### The size of that gap, per-race maximum in the segment

| | median | p90 | **MAX** | peak at progress (median) |
|---|---|---|---|---|
| SHIPPED | 47.6 px | 113.3 px | **191.1 px** | 0.9871 |
| 56 px / 13% | 47.6 px | 108.5 px | **170.1 px** | 0.9865 |

★ In canvas widths against the settled LEADER_ZOOM value of **225 px per width** (ZOOM-PER-STATE-1,
never a per-frame zoom): the worst late gap is **0.849 widths** shipped and **0.756** with the brake;
the p90 is **0.503** and **0.482** widths.

★★ **The late gap peaks at progress ≈ 0.987 — nine tenths of the way from the window end to the
line.** It is not a finish-line artefact; it has most of the run-in to develop.

### Per track, races with a > 56 px gap after 0.95

| track | SHIPPED | 56/13 | max gap: shipped → 56/13 |
|---|---|---|---|
| city-circuit | 11/30 | 9/30 | 164.3 → 156.3 |
| dirt-oval | 10/30 | **12/30** | 116.3 → **170.1** |
| garden-path | 9/30 | **11/30** | 169.3 → 138.1 |
| ice-track | 12/30 | 9/30 | 138.9 → 112.7 |
| luger-hill | 13/30 | **14/30** | 148.0 → 113.0 |
| mountainstreet | 9/30 | 7/30 | 160.2 → 120.7 |
| river-run | 9/30 | 7/30 | 134.2 → 127.5 |
| searound | **15/30** | 13/30 | **191.1** → 163.8 |
| seatrack | 9/30 | **14/30** | 172.2 → 115.4 |
| space-sprint | **17/30** | 10/30 | 163.0 → 157.0 |

★ **The brake makes it worse on four tracks of ten** (dirt-oval, garden-path, luger-hill, seatrack),
and on dirt-oval it produces the largest late gap in the whole brake arm (170.1 px against shipped's
116.3). The count is not a one-way improvement, which is consistent with the previous chain's finding
that the brake fixes some escapes and causes others.

---

## STEP 3 — IS IT CLOSED, OR IS IT A WIN?

Of the races counted at 56 px above:

| | SHIPPED (114 races) | 56 px / 13% (106 races) |
|---|---|---|
| still > 56 px **at the line** | 76 (66.7%) | 74 (69.8%) |
| **the leader of that gap WINS** | **109 (95.6%)** | **103 (97.2%)** |
| contested at the line anyway (2nd within a body length) | 15 (13.2%) | 8 (7.5%) |

★★★ **When a gap past his allowance opens after 0.95, the leader wins it 96–97% of the time. The late
gap essentially *is* the win.** A third of them do close back under 56 px by the line, but closing to
within 56 px is not the same as being caught — only 13.2% (shipped) end with a second racer inside a
body length.

★ **The brake does not help here and slightly hurts**: its late-gap races are marginally *more* often
still open at the line (69.8% vs 66.7%) and **less often contested (7.5% vs 13.2%)**. On a base of
~110 races those are small counts, but they point the same way.

---

## ★★ STEP 4 — WHAT A LATER WINDOW END WOULD REACH

**A lookup on the data already gathered. The brake was not run at any other window value, and I am not
recommending one.**

"Within reach at window end W" means the brake would still have been running at the moment the gap
first crossed 56 px — **not** that it would have closed it.

| | n | ≤ 0.96 | ≤ 0.97 | ≤ 0.98 | ≤ 0.99 |
|---|---|---|---|---|---|
| SHIPPED | 114 | 80 (70.2%) | 86 (75.4%) | 94 (82.5%) | 106 (93.0%) |
| 56 px / 13% | 106 | 77 (72.6%) | 83 (78.3%) | 94 (88.7%) | 99 (93.4%) |

First-cross progress: **median 0.9502**, p90 0.9874, max 0.9997 (shipped).

### ★★★ And the median explains itself: two thirds of these gaps were already open when the brake let go

| | already > 56 px within 0.002 of the window end | genuinely opened later |
|---|---|---|
| SHIPPED | **73 of 114 (64.0%)** | 41 (36.0%), first crossing at a median of 0.9786 |
| 56 px / 13% | **69 of 106 (65.1%)** | 37 (34.9%), median 0.9741 |

★★ **In two races out of three, the "late gap" is not late at all — it is a gap the brake was holding
at 0.95 and released.** That is the carry-over the previous chain measured from the other side, and it
means a window end only a fraction later (0.952) would already cover 64% of these races.

★ **The remaining third genuinely open after the window**, at a median progress of 0.9786, and those
are the ones a materially later window end would be needed to reach.

★ **The reach curve has no knee.** 70% → 75% → 83% → 93% rises roughly evenly; no value in the range
is singled out by the data. **If the evidence points anywhere it is that the first hundredth is the
cheapest — 0.952 already covers 64% — but the value is his and I am not proposing one.**

---

## WHAT THIS DOES NOT SETTLE

- N = 300 races per arm. The 124 px counts are **24 and 12**; a difference of twelve races is the
  finding, and it is a small integer.
- **Reach is not effect.** Step 4 counts where the brake would still have been *running*. Whether it
  would have closed those gaps is a different question and would need the brake actually run at other
  window values — which this task forbade and which I did not do.
- "Contested" is second-within-one-body-length at the winner's crossing, using the winner's own
  `drawnBodyLengthPx`. A different definition of contested would move those counts.
- The peak-progress and first-cross figures are per race; I did not look at how long the gap stays
  above a threshold, only when it first gets there and how large it gets.
- Both arms use the shipped world at action stage `wild`; the owner's own store was not read.
