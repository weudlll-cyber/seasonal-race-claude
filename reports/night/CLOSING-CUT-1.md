# CLOSING-CUT-1 — what the closing phase interrupts

**Block:** PIECE B of the night chain of 2026-09-04. Branch `night/2026-09-04`, off master `6953722d`.
**Answers:** `docs/BACKLOG.md` — *THE CLOSING PHASE ENDS WHATEVER WAS RUNNING (2026-08-24, the owner's
instruction)*, whose one open question is *"nobody has seen what the shot looks like when the previous
phase is cut rather than allowed to finish"*.

**READ-ONLY. Nothing was changed, nothing was built, and no cut rule is proposed.** No instrument was
added. No fingerprint was minted.

---

## 0. The feasibility gate this piece set itself — PASSED

The piece's rule was: *if the closing phase's start is not observable from an existing instrument,
say so and STOP rather than adding one tonight.*

**It is observable.** `client/src/modules/camera/CameraDirector.js` sets `_runInComposingNow = false`
at the top of `_updateRunIn` and `= true` immediately after `_scheduleEngaged(…)` returns true. The
flag is published to the probe, and `client/src/modules/viewerProbe.js` writes it into every dumped
frame as **`comp`**. So **the first frame on which `comp` is true is the moment the owner's
instruction names**, and `scripts/viewer-invariants.mjs --dump` already records it — in a real
browser, on the production bundle.

**Nothing today ends a running phase there** (the 2026-09-02 verdict, still true), so the interrupted
phase runs on past that frame. **That is what makes this measurable at all:** the phase's whole
length and whole movement are visible, and the cut point sits inside them.

---

## 1. The headline

**THE CUT WOULD LAND MID-SHOT, IN A SHOT THAT IS STILL MOVING, IN EVERY RACE — AND WHICH SHOT IT IS
VARIES MORE THAN ANYTHING ELSE ABOUT IT.**

- **★ FOUR different camera phases were caught at the cut across ten tracks:** `LEADER_ZOOM` (4),
  `OVERVIEW` (3), `LEAD_CHANGE` (2), `BATTLE_ZOOM` (1). There is no "it mostly interrupts X".
- **A median of 2,492 ms is still ahead of it — 59% of the phase's own realised length.**
- **The shot has not finished moving.** Median **35%** of its zoom travel and **48%** of its pan
  travel has happened at the cut. The rest was still to come.
- **★ IT WAS NEVER "DOING NOTHING ANYWAY": 0 of 10.** Not one interrupted phase was below both
  perceptibility floors, on either axis. **The cheapest version of this change — "it only ever cuts a
  shot that had already settled" — is not available.** The slowest pan measured is 528 px/s, five and
  a half times the 95 px/s floor.
- **The cut point itself is very stable:** race progress **0.928 – 0.937** on all ten tracks.

**★ AND THE WORST CASE IS NOT AN OUTLIER OF DEGREE, IT IS A DIFFERENT KIND OF CUT.** On city-circuit
the phase running is a **`BATTLE_ZOOM` with 98% of its length and 98% of its zoom travel still
ahead** — the cut would land essentially at the *start* of a battle shot and discard the whole thing.
See §5, because that case collides with something the owner has already accepted.

---

## 2. Protocol

| | |
| --- | --- |
| instrument | `scripts/viewer-invariants.mjs --dump` — the REAL browser on the PRODUCTION build, on its fixed virtual clock. **No instrument was written.** |
| arm | `shipped` |
| tracks | **all ten** |
| seed | **9 only.** The chain asked for four — see §6. |
| races | **N = 10** (one per track) |
| field | the harness's own defaults: 40 racers closed, 100 open |
| frames | 3,400 – 9,133 per interrupted phase; 5,459 – 6,482 per race |
| cut point | the first frame with `comp` (`_runInComposingNow`) true |
| the interrupted phase | the run of frames sharing the cut frame's `st`, walked back to its entry and forward to its exit. **In all ten races both boundaries fell inside the dump**, so no length below is a lower bound. |

**The two perceptibility floors are the project's own, not invented here:**

- **zoom — 0.02 ln of total travel.** `scripts/endgame-sheet.mjs`'s `FACTOR_TOL_LN`, described there
  as *"the smallest difference a viewer could see at all: 2% of ln width is 13 screen px at the frame
  edge"*.
- **pan — 95 px/s mean.** RUNIN-HOLD-1's perceptibility figure, the one `endgame-sheet.mjs` item 8
  uses (there divided by the half-canvas to become a zoom rate; here used directly, in its own units,
  on the delivered offset).

*One inconsistency, stated rather than hidden:* the zoom floor is a **total**, the pan floor a
**rate**. Each is the natural form for its quantity — "did the shot change size at all" against "was
the frame moving" — but they are not the same kind of threshold. Both are cleared by a wide margin in
all ten races, so nothing here turns on the choice.

**Travel is cumulative and absolute**, so a shot that goes out and comes back is not scored as
motionless.

---

## 3. What is running when the closing phase begins

| track | phase at the cut | binding | progress | phase length | left | share left | zoom done | pan done | pan px/s | doing nothing? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **city-circuit** | **`BATTLE_ZOOM`** | state | 0.934 | 5,916 ms | **5,783 ms** | **98%** | **2%** | 5% | 1,853 | no |
| mountainstreet | `LEADER_ZOOM` | company | 0.929 | 2,883 ms | 2,383 ms | 83% | 40% | 44% | 4,874 | no |
| ice-track | `OVERVIEW` | state | 0.933 | 3,417 ms | 2,734 ms | 80% | 41% | 64% | 796 | no |
| river-run | `OVERVIEW` | state | 0.928 | 3,400 ms | 2,333 ms | 69% | 68% | 69% | 2,513 | no |
| seatrack | `LEADER_ZOOM` | company | 0.928 | 3,750 ms | 2,600 ms | 69% | 29% | 39% | 3,962 | no |
| dirt-oval | `LEAD_CHANGE` | state | 0.937 | 6,233 ms | 3,033 ms | 49% | 17% | 53% | 750 | no |
| searound | `OVERVIEW` | state | 0.930 | 4,983 ms | 1,700 ms | 34% | 54% | 72% | 528 | no |
| luger-hill | `LEADER_ZOOM` | company | 0.929 | 8,283 ms | 2,650 ms | 32% | 22% | 43% | 1,455 | no |
| space-sprint | `LEADER_ZOOM` | state | 0.929 | 9,133 ms | 2,333 ms | 26% | 14% | 41% | 1,916 | no |
| garden-path | `LEAD_CHANGE` | state | 0.933 | 7,984 ms | 950 ms | 12% | 42% | 58% | 1,662 | no |

| phase at the cut | races | median length | median left | median share left |
| --- | --- | --- | --- | --- |
| `LEADER_ZOOM` | 4 | 6,017 ms | 2,492 ms | 51% |
| `OVERVIEW` | 3 | 3,417 ms | 2,333 ms | 69% |
| `LEAD_CHANGE` | 2 | 7,109 ms | 1,992 ms | 30% |
| `BATTLE_ZOOM` | 1 | 5,916 ms | 5,783 ms | 98% |

---

## 4. The four questions, answered

**1 · Which camera phase is running when the closing phase begins?**
**Four different ones over ten tracks** — `LEADER_ZOOM` 4, `OVERVIEW` 3, `LEAD_CHANGE` 2,
`BATTLE_ZOOM` 1. In **three** of the ten the frame's width is held by the **company** binding rather
than the state's own, so in those the cut would also be discarding a guarantee, not only a shot.

**2 · How much of that phase was left?**
Median **2,492 ms**, and median **59% of its own realised length**. **The absolute figure is far more
stable than the share:** eight of ten races sit between 1,700 ms and 3,033 ms, while the share ranges
from 12% to 98%. The share swings because the phases have very different lengths (2.9 s to 9.1 s), so
a near-constant ~2.4 s remainder is a small fraction of a long phase and most of a short one. **If a
number is wanted for a design, it is the two-and-a-half seconds, not the 59%.**

**3 · How far into the phase's own movement does the cut land?**
Median **35% of its zoom travel** and **48% of its pan travel**. **The pan is further along than the
zoom in ALL TEN races.** So the cut consistently catches the zoom *earlier in its arc* than the
pan — it would be removing the back two-thirds of a zoom, not its tail. That is directly relevant to
this project's standing warning that a big zoom change needs a glide or an anchor: **cutting here
removes the glide.**

**4 · How often was the interrupted phase doing nothing anyway?**
**0 of 10.** Zoom-idle alone: 0. Pan-idle alone: 0. Every interrupted phase was moving on both axes,
and by margins that are not marginal — the slowest pan is 5.5× the floor.

---

## 5. ★ ONE CASE COLLIDES WITH SOMETHING ALREADY ACCEPTED, and it needs his word

**city-circuit's interrupted phase is a `BATTLE_ZOOM`, with 98% of it still to come.**

The owner's acceptance of 2026-09-04 (ACCEPTED-FINISH-1) states behaviour **(ii)**: *"A BATTLE SHOT
MAY TAKE THE FRAME near the finish, so the leader's walk need not survive it."* Item 10's ACCEPTED
CAUSE is, in `scripts/endgame-sheet.mjs`'s own words, *"a `BATTLE_ZOOM` in the window"*.

**So on this track, the closing-phase cut would end the very shot the acceptance protects** — and it
would end it 133 ms after it began, having drawn 2% of its zoom move.

**These are not contradictory instructions; they were given about different things**, five weeks
apart, and nothing in either says which wins. But they meet here, and **it is a decision, not a
detail:** building the cut as instructed silently reverses an accepted behaviour on at least one of
the ten tracks. **NEEDS HIS WORD — does the closing phase end a battle shot too, or is `BATTLE_ZOOM`
the exception?** Nothing is proposed here either way.

*(city-circuit is one of the two tracks the SHIP gate runs, which is why this is not an obscure
corner.)*

---

## 6. ★ What this does NOT support

**THE SCOPE IS TEN RACES AT ONE SEED, NOT FORTY AT FOUR.** The chain asked for ten tracks at four
seeds. All ten tracks ran; **only seed 9** did. The cause is the machine — a browser harness driving
the production bundle on a two-P-core laptop, at minutes per race.

**What that means, stated plainly:**

- **The 6-for-6 style facts are safe.** "Never idle" (0 of 10), "the cut lands at 0.928–0.937" and
  "the shot is still moving" have no counterexample and very tight spreads.
- **The medians are thin.** 2,492 ms and 59% come from ten numbers. Treat them as the right order of
  magnitude, not as a figure to size a design against.
- **★ ONE SEED CANNOT SEE SEED VARIANCE AT ALL, AND THAT IS THE GAP THAT MATTERS MOST HERE.** Which
  phase is running at progress 0.93 is a per-RACE question — GATE-GARDEN-PATH-1 established exactly
  that about this camera on this harness, and §1's four-way split is the same lesson arriving again.
  The distribution above is **across TRACKS at one seed**; it says nothing about how it varies across
  seeds on one track, and the `BATTLE_ZOOM` case in §5 could plausibly appear on any track at some
  seed. **A re-run should add seeds before it adds anything else** — and it is cheaper than adding
  tracks, because the ten tracks are already covered.

**Nothing here judges whether the cut is good.** The piece's rule is to report the mismatch, not to
grade it, and no cut rule, gate or threshold is proposed.

---

## 7. Source hygiene

**No file in the repository was changed by this piece.** No instrument was built; the analysis lives
in `C:/tmp/night-2026-09-04/pieceB/` and no scratch file entered the repository. The harness's
`--json` output and its `dist-sweep` build are gitignored.

`engine-reach --check` was not run because **no path changed.**

**Noticed and deliberately left:** `viewer-invariants.mjs --json` writes a PARTIAL result as it goes
rather than only at the end. That is a good property — it is why an interrupted run still yields
data — and it is recorded here because the flag's name does not suggest it.
