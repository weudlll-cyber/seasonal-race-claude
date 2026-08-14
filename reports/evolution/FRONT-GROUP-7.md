# FRONT-GROUP-7 — the floor was never buying width, and that is why it cannot be narrowed

**Branch:** `feat/front-group`, continuing from `72dafad5`. **Not merged. Nothing minted.**
Continues [FRONT-GROUP-3](FRONT-GROUP-3.md).

**The owner, on river-run seed 2814 with the floor on:** the shot shows almost too much of the
track, and that much room is not needed. His rule was _see everyone sharing the width_, not _show
the full width where nobody races_.

**The verdict: the refinement is built, it does exactly what he asked, and it ships OFF — because
the reason the plain floor works turns out to have nothing to do with width.** Numbers below.

---

## 1. Stage A — the slack is real, and it is large

`scripts/endgame-width-truth.mjs`, ten tracks, seed 9, n=20 with the Quick-Test roster. The
yardstick is the FIXED one FRONT-GROUP-3 graded on — the live top six — so no arm can be flattered
by its own definition of who counts.

| track | corridor | occupied (median) | of width | p95 | diagonal costs | body covers |
| --- | --- | --- | --- | --- | --- | --- |
| city-circuit | 197 | 54.5 | 27.7% | 45.0% | 74.4% | 44.6% |
| dirt-oval | 178 | 67.2 | 37.8% | 54.5% | 72.0% | 36.0% |
| ice-track | 211 | 91.6 | 43.4% | 54.6% | 89.2% | **38.5%** |
| luger-hill | 250 | 45.6 | 18.2% | 47.9% | 61.7% | 29.7% |
| mountainstreet | 300 | 106.0 | 35.3% | 47.1% | 60.7% | 71.3% |
| river-run | 300 | 133.3 | 44.4% | 55.6% | 58.9% | 79.2% |
| searound | 131 | 69.5 | 53.1% | 63.9% | 80.7% | 44.4% |
| seatrack | 300 | 95.5 | 31.8% | 43.2% | 69.5% | 54.8% |
| space-sprint | 300 | 72.6 | 24.2% | 49.7% | 100.1% | 60.6% |

**He is right about the slack.** Pooled, the field occupies a median **35.3%** of the corridor
through the endgame (p95 49.7%); the whole live field 56.6%. On his own race — river-run seed 2814 —
it is **49.6%** median, 55.9% at p95, 65.3% at the crossing. Most of what the floor holds open is
empty road.

**The diagonal costs a median 28%** — the angled corridor's ceiling is 72.0% of the same width lying
flat, worst frame 56.3%. space-sprint reads 100.1% (a straight track, and the >100% is the anchor
sitting off-centre so the two sides have unequal room). This is already paid correctly by
`corridorGuarantee` and needs nothing.

**The body padding covers a median 44.6% of the drawn sprite** — and **ice-track reads exactly
38.5%**, which is the figure FRONT-GROUP-3 recorded from a different instrument. That agreement is
the only cross-check available for this harness and it is exact.

**What the director would need to be given to close the body gap:** the DRAWN sprite width. It has
`racers` and `_trackWidthPx` already, so the lateral extent costs it nothing — but the drawn size
comes from `autoSpriteScale` and depends on the zoom being solved for. Measured, the sprite sits at
its screen cap on only **23.4%** of endgame frames, so there is no closed form for the other 77%: it
would take a fixed-point iteration or a one-frame lag. **Neither was needed — see §3.**

## 2. Stage B — the refinement, and it does what he asked

One key, `endgameFloorBindsExtent`. The floor binds on the real lateral extent plus the same one
body, **capped at the corridor**, so it can never ask for MORE than before — only less. **Every
racer counts**, so there is still no group to define: the one obvious narrower subject is the front
six, and that is the GRADING yardstick. A mechanism that binds on its own yardstick cannot be graded
by it, which is exactly how the first front-group harness flattered itself.

**It narrows the crossing shot, materially, as asked:**

| | river-run 2814 | ten tracks, median |
| --- | --- | --- |
| the plain floor | 38% of the ordinary | 52% |
| binding on the extent | **53%** | **84%** |

## 3. And it fails the decision rule, on the first condition

**It cuts racers.** On the fixed yardstick, share of PHOTO_FINISH frames with a top-six racer cut:

| arm | ice-track seed 9 | river-run 2814 | ten tracks pooled, not whole |
| --- | --- | --- | --- |
| floor off entirely | 7.3% | 52.8% | 55.7% (river-run) |
| **the plain floor (ships)** | **0.0%** cut / 2.2% out | **0.0% / 0.0% / 0.0%** | 25.7% |
| binding on the extent | **12.0%** cut | **16.0%** cut | **40.3%** |

The rule was: ship as default IF it keeps whole/cut/outside at 0.0%/0.0% on ice-track seed 9 AND
materially narrows the crossing on river-run. **It meets the second and fails the first**, so per
the rule the default stays as it was.

**One disagreement with the record, stated rather than smoothed over.** FRONT-GROUP-3 reports the
floor arm at 0.0% / 0.0% on ice-track seed 9; this harness reads 0.0% cut and **2.2% fully outside**
on the same race. The tool that produced the earlier table was deleted in the same commit that
produced it and cannot be re-run, so the 2.2 pp cannot be reconciled. It changes no conclusion here
— the extent arm's 12.0% cut fails on any reading — but it is not swept away. **river-run 2814 reads
0.0% / 0.0% / 0.0% on all three seeds under the floor, which does reproduce the report exactly.**

## 4. WHY it fails, and this is the finding worth keeping

**The first hypothesis was the body-padding gap** — §1 measured that the narrow reference covers
under half the drawn sprite, so removing the empty road should expose the rest. **Tested and
REFUTED.** A diagnostic arm padding with the full DRAWN body instead (`--arm=extent-drawn`, a
monkey-patch in the harness, deliberately not a shipped build) is indistinguishable: ice-track 12.0%
cut either way, pooled 40.3% either way.

**The real mechanism, measured.** Decomposing every lost-racer-frame against the heading:

| | ALONG the track | ACROSS it |
| --- | --- | --- |
| ice-track seed 9, plain floor | **100.0%** | 0.0% |
| river-run seed 9, plain floor | 56.0% | 44.0% |

**`corridorGuarantee` only ever constrains ACROSS.** So on ice-track the plain floor keeps every
racer whole without acting on the direction they leave in at all: asking for a full track width
perpendicular forces a low zoom, and a low zoom incidentally opens the frame ALONG the track, which
is where the field actually is. **The full-width floor was never buying width. It was buying
longitudinal room, by accident, and paying for it in empty road.**

Binding on the occupied width takes that accident away. Any refinement of the WIDTH does.

**So the lever for "narrow the shot without losing anyone" is the LONGITUDINAL extent of the field,
not the lateral one.** That is a different bound and it is not built here.

## 5. Predictability — it is lost, and that was the floor's real gain

FRONT-GROUP-3's honest gain was that the price became a per-track constant. Three seeds each:

| track | the plain floor | binding on the extent |
| --- | --- | --- |
| searound | 93 / 94 / 93 | 100 / 100 / 100 |
| space-sprint | **65 / 65 / 65** | **98 / 99 / 77** |
| river-run | **38 / 38 / 38** | **61 / 53 / 48** |

**It varies per race, exactly the way the group bound did** — space-sprint swings 22 points,
river-run 13. A track width is a fixed quantity; where the racers happen to be is not. That is a
second, independent reason the default stays where it is, and it is the one he named as the cost.

## 6. Fingerprints — both positions, measured, NOT minted

| role | master | this branch, key OFF (ships) | key ON |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | unmoved — engine-reach clears every changed path | — |
| camera | `c1556053b1824758` | `15bcceae3c802cc9` | `71cac9699bdc7dab` |
| render | `c962df5334277f95` | `a9de15ebaafcf108` | `775dfa1dfec3e7a5` |

**The OFF column is byte-identical to FRONT-GROUP-3's branch values**, so the shipped picture is
exactly what he was already going to judge, and this block adds a switch and no behaviour.

## 7. What holds

- **3 tests added, 0 deleted.** Both positions differ (L203); the cap holds, so a field spread edge
  to edge asks precisely what the plain floor does; and a caller supplying no lateral coordinate
  gets the old behaviour rather than a collapse.
- **One key**, on the Dev Screen, indented under the floor it refines and disabled when that is off.
- **The tracking-lag stamp is re-stamped without re-measuring, deliberately** — the camera
  fingerprint being byte-identical at the shipped default proves the figures cannot have moved.

## 8. What to look at on the two races

**ice-track seed 9** and **river-run seed 2814**, production build on 4173. The shipped default
changes nothing you have not already seen — that is the point of the OFF column above. The question
is whether §1's slack bothers you enough to want the LONGITUDINAL bound §4 names, which is real work
and is not built.

To see the refinement he asked for: Dev Screen → Camera → _"…and only as wide as the racers actually
are"_. It narrows river-run's crossing from 38% to 53% of the ordinary shot, and it cuts racers while
doing it.
