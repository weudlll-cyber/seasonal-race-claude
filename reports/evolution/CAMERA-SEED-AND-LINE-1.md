# CAMERA-SEED-AND-LINE-1 — piece 1 shipped; piece 2 hits the conflict and stops

**Branch:** `exp/endgame-schedule` @ `9454cc41`. **Not merged. Nothing minted.**

---

## 0. Lead

> **Piece 1 is done.** The camera seed is derived from the race seed. Same race seed ⇒ same camera,
> shot for shot, proved on a real race. No knob.
>
> **Piece 2 is not built, and that is the instruction I followed.** Honouring "the line never
> disappears, all the way to the crossing" costs the per-frame smoothness budget you told me to
> hold: **largest single-frame zoom step 0.0230 → 0.0370 and 0.0792 ln** on 2 of 3 probe tracks.
> You said: report the conflict with numbers and stop. Numbers in §3.
>
> **And a correction that outranks both.** The build you are looking at is **worse than I reported
> to you**. See §4 — I got this wrong twice and the second time I should have caught it.

---

## 1. Piece 1 — the camera seed comes from the race seed

`client/src/modules/camera/cameraSeed.js`, wired at `RaceScreen/index.jsx:599`.

```js
export function cameraSeedForRace(racePlanSeed, random = Math.random) {
  const s = Number(racePlanSeed);
  if (Number.isFinite(s) && s > 0) return ((s ^ CAMERA_SEED_SALT) >>> 0) || 1;
  return ((random() * 0x7fffffff) >>> 0) || 1;
}
```

**It follows this project's own precedent.** `raceNumbers.js` already derives a subsystem's stream
from the race seed, and its header gives the reason for the salt — two things seeded "from 5601"
must not walk correlated sequences. The salt here is **deliberately different** from that one, or
the camera and the start numbers would share a sequence on every race.

**The unseeded case is defined, not toggled.** `SetupScreen` gives Start Race `racePlanSeed: 0`;
Quick Test always carries a seed. With nothing to derive from there are exactly two candidates: a
constant (raceNumbers' choice — correct for display-only numbers, but it would give **every** Start
Race the identical camera and destroy the variety you kept), or `Math.random`, **which is what
happens today for every race**. The second is chosen: nothing is lost, because an unseeded race is
already irreproducible. No caller can select between them and there is no config key.

### The tests, and the first attempt was blind

**The trajectory test was written on a synthetic fixture and proved nothing.** Measured: the
director rolled its dice **once in 600 frames**, and that single draw was against a weight of 1,
where the value cannot change the outcome. Two *different* seeds produced byte-identical
trajectories — so "two runs of one seed are identical" passed while the recorder saw nothing.

The state machine only reaches its random choices on a race with real geometry (pulk detection,
comeback detection and the lead-change latch all read fields a hand-built racer does not carry). So
that half moved to `scripts/camera-seed-determinism.test.mjs`, on the real driver and a real track:

- **two runs of one race seed ⇒ identical trajectory** (zoom, centre and state, every frame)
- **two different race seeds ⇒ different trajectory, including a different STATE SEQUENCE**

The two sabotage-prove each other: the first is exactly the assertion that passes when the recorder
is blind, and the second is the one that fails in that case. `cameraSeed.test.js` keeps the
pure-function half (4 tests). **All pass; camera suite 853.**

---

## 2. Piece 2 — the condition I would implement, and why

**Your requirement:** from the start of the endgame until the crossing the viewer can always tell
where the line is; it need not be whole; it may be cut by the edge or sit near it.

**The condition: the line's CENTRE POINT stays inside the frame at `COMPANY_FRAME_PCT` (0.9).**

The band runs *through* that point, so if the point is in shot the band is in shot — cut at its ends
by the frame edge, which is exactly what you allow. That is **looser** than the old rule (a point
inside the 0.7 inner box, which cost 1.43× of width) and far **stricter** than what was built (free
to leave after 95%).

**Why 0.9 and not 1.0** — and this is not a comfort margin. At 1.0 the point sits exactly *on* the
frame edge, where the pan's own lag takes it straight back out; measured earlier, the deadline
failed on 2 of 3 tracks that way. `COMPANY_FRAME_PCT` is this project's own constant for "in frame,
near the edge is acceptable", not a number invented here.

**The permission I am removing was mine.** ENDGAME-SCHEDULE-1 read your requirement as "the line
need not stay framed after the 95% mark". It does not say that; 95% is where the endgame *begins*.
The frame you photographed is that wrong permission, correctly implemented.

---

## 3. The conflict, with numbers — why piece 2 is not built

Implemented as "the schedule's value is the wider of the ramp and the line demand", so the schedule
stays the sole author. Three probe tracks, his config:

| | committed build | with the line held to the crossing |
| --- | ---: | ---: |
| ice-track — largest single zoom step | 0.0163 | **0.0370** |
| space-sprint — largest single zoom step | 0.0230 | **0.0792** |
| river-run — largest single zoom step | 0.0148 | 0.0148 |
| arrival error (worst of the three) | 0% | 0% |

**Your constraint was "largest single-frame zoom step no worse than 0.0230 ln". Holding the line to
the crossing gives 0.0370 and 0.0792 — 1.6× and 3.4× over.**

A first version floored the shot using the anchor's *actual* screen position and was worse still:
worst step **0.1311 ln** and the arrival missed its factor by **88%** on space-sprint. Flooring with
the framing rule's intended anchor recovers arrival exactly (0%) but not the per-frame budget.

**Why it costs what it costs:** near the crossing the leader has travelled to his forward placement,
so the room between him and the frame edge is small; any remaining distance to the line then demands
a wide shot, and the ramp has to fight it every frame. The step budget is spent on that fight.

**I did not widen the shot quietly, and I did not weaken the budget.** Both were your explicit
instructions and they are in direct conflict on these tracks. **This needs one sentence from you:**
which gives — the 0.0230 step budget, or the line to the crossing?

**What I did not do, because the conflict stopped the piece:** the ten-track / both-arm coverage, the
`check-runin-frame` rewrite, and the per-track before/after table you asked for. They are only
meaningful once the condition is settled.

---

## 4. The correction — the build you are judging is worse than I reported

I told you the ENDGAME-SCHEDULE-2 numbers were measured one commit early and gave you the stepMAX
difference. **That was an incomplete correction.** Measured properly on the committed build
`1e8a9d63`, his config, nine scorable tracks:

| | what I reported | **what the build actually does** |
| --- | ---: | ---: |
| largest single zoom step (worst) | 0.0230 | **0.0291** |
| widest endgame frame, median | 4.6 corridors | **6.0** |
| widest endgame frame, worst track | 6.2 | **15.6** (city-circuit) |
| monotonicity | 8/9 | **4/9** |
| standstill, median | 17% | 13% (better) |
| line visible at the deadline | 8/9 | 8/9 (river-run NO) |

Per track: city-circuit 15.6 corridors, ice-track 14.6, luger-hill 10.9 — and monotonicity fails on
ice-track, luger-hill, mountainstreet, river-run and seatrack.

**The cause is the carried-ramp commit (`415a5e9e`)**, the last change of that block. I measured its
effect on one metric on three tracks and never re-ran the full table. The opening is now much wider
than the build before it, and the "no track re-opens" property I reported is not true of what you
are looking at.

---

## 5. State

`npm run verify` remains red on `check-runin-frame`, which enforces the old "line inside the frame
throughout" promise. **That guard is closer to your corrected requirement than the build is** — the
build is what is wrong, not the guard. It was left untouched rather than rewritten, because
rewriting it is only meaningful once §3 is settled.
