# ENDGAME-REPAIR-1 — the endgame had five authors, and the schedule was only one of them

**Branch:** `exp/endgame-schedule` @ `12ca1057`. **Not merged. Nothing minted.**
Built for production and served on **4173**.

---

## 0. The three numbers you asked to lead with

> **1 — DOES THE WILD FRAME REPRODUCE, AND IS IT FIXED?**
> **YES, AND YES.** On your own context — space-sprint, Race Plan on, your roster, your config, and
> for the first time the BROWSER's own camera seed — **race seed 30** changes the picture's width by
> **4.8× in ONE frame** and pans **2056 px**, 1.6 canvas widths, at 94.3% of the race, opening to
> 13.3 corridors. Seeds 2 and 8 do the same thing smaller. After the repair, across **all 40 seeds
> swept**, the largest single-frame change is **0.081 ln** and the largest pan is 577 px.
>
> **2 — WHAT FRACTION OF ENDGAME FRAMES IS THE LINE FINDABLE IN?**
> **88.0%, up from 74.4%** — ten tracks, your field sizes, shipped defaults, threshold to crossing.
> **That is not 100% and requirement 5 is therefore NOT met.** §4 says exactly where the remaining
> 12% is and what the lever is. I did not weaken the rule to fit the build.
>
> **3 — THE LARGEST SINGLE-FRAME ZOOM STEP.**
> **0.0235 ln** over the endgame window on nine tracks, and **0.0792 ln** with the line floor on —
> the floor is what buys number 2 and it is what costs this. Over the FULL window, which the
> previous table never printed, it is **2.12 → 0.052 ln**.

---

## 1. The correction that outranks the rest — the defect was not the carried ramp

You told me the carried-ramp commit was the cause and that its table was never re-run. **The table
was the important half; the attribution was not.** Re-running it in full found something neither of
that block's two attempts had ever looked at:

> **The endgame camera was STROBING between a 1.2-corridor shot and a 7-corridor shot on ALTERNATE
> FRAMES** — up to a full second of it, on **seven of the nine scorable tracks**, on the
> carried-ramp build **and on the one before it**.

Two consecutive frames on ice-track, shipped defaults, at 94% of the race:

```
 prog   width  corridors     what placed it
0.940     261    1.24        the STATE — the schedule declined this frame
0.940     820    3.89        the SCHEDULE
0.940     261    1.24        the STATE again
0.941     911    4.32        the SCHEDULE again
```

The carried ramp did not cause that. It **traded the strobe's stagnation for its amplitude**:
restarting the ramp on every resume (`36a0b70d`) made the picture stand still (river-run standstill
55%), carrying it (`415a5e9e`) let the motion back in and the amplitude with it. Both were treating
a symptom, which is why the second one made the widest frame 6.2 → 15.6 corridors.

**Everything in §2 follows from taking the strobe seriously.**

---

## 2. Five causes, each found as a frame

### 2.1 The period-2 limit cycle — a schedule that abdicates for one frame is a strobe

On a frame it could not compute a target, the widen returned `Infinity`, which handed the width back
to the **state** — and the state's shot is a *different shot*. The delivered width then moved the
anchor on screen, which flipped the target's finiteness, which delivered the other shot again.
**The demand was a function of its own output.**

Fixed by a sentence: *a schedule places every frame it is composing.* On an inert frame it **holds**
the width it last placed. That breaks the loop at its source, because a held width does not move the
anchor, so the next frame's demand is computed from the same geometry as this one's.

### 2.2 The singular target — the observed anchor cannot size a ramp

The widen aimed at `_lineCeiling` measured from where the anchor **actually was** on screen.
`pointGuarantee` divides the room left to the region's edge by the distance to the line, so that
quantity **runs to infinity** as the pan approaches the edge and is **undefined past it**.

Measured over the widen's own frames, seed 9, both arms (`scripts/diag/endgame-demand.mjs`):

| the target measured from | undefined on | median | worst |
| --- | ---: | ---: | ---: |
| the anchor's **observed** position | **63–84% of frames on six tracks** | 3.5–23 corr | **2108 corridors** |
| the framing rule's **own** anchor | **0% on every track** | 2.8–7.3 corr | 11.6 corridors |

So the observed anchor was not delivering a correction on those frames — it was delivering
`Infinity`, which the schedule reads as *no target*. On ice-track the widen sat inert for **66
frames**, got **one** frame with a finite demand, and moved the picture from 1.4 corridors to the
**world-sized frame** (14.6) between two frames. Both the freeze and the blow-up are this one term.

### 2.3 The target stepped with the camera state

`_forwardFracNow` and the subject both change the instant the state does, so the width the line needs
steps with them. River-run, LEAD_CHANGE → BATTLE_ZOOM at 94.25%: the anchor's intended place moved
0.340 → 0.500 of the frame and the delivered width went **1.99 → 2.81 corridors between two frames**.
The widen now re-anchors on a state change — the same thing the close already does when its endpoint
factor flips, and an equality test rather than a threshold.

### 2.4 The OVERVIEW entry snap — one cut, both of the things you rejected

Entering OVERVIEW cuts the zoom to OVERVIEW's own width. Inside the endgame that is a second author.
River-run under your config, 94.25%: it cut **1.99 → 2.67 corridors in one frame** — and then did
worse than jump. The schedule read the cut width as *"the widen has reached what the line needs"*,
declared the widen done and latched the close on it; the close's own parameter is pinned at zero
until the deadline. **The picture stood absolutely still from 94.25% to 95%.**

### 2.5 The LEAD_CHANGE entry snap — the candidate you named, and it was live

You said the lead change had never been checked in your context. It is the cause of the remaining
wild frames. Space-sprint, **seed 21**, your config, your roster, at 94.65%:

> the delivered width collapsed from **5.40 corridors to 1.33 in ONE frame** — a factor of four,
> 1.399 ln — and the schedule then climbed the whole way back over the next eight frames.
> **Goes wild, shows a shot with no line in it, recovers.** Your report, frame for frame.

Both snaps stand down **only** while the schedule is composing. Outside the endgame they are
untouched: LEAD_CHANGE still runs, still picks its subject, still writes the overlay names.

---

## 3. The full table, per track — before and after

Ten tracks, seed 9, your field sizes (100 open / 40 closed), both arms. `garden-path`'s race never
finishes at seed 9 and is not scorable on either build. **Your config:**

| track | widest frame (corridors) | monotonic | largest step, spec | largest step, FULL window |
| --- | ---: | :---: | ---: | ---: |
| city-circuit | **15.6 → 5.2** | ✗ → ✓ | 0.0205 → 0.0134 | 0.925 → **0.035** |
| dirt-oval | 6.1 → 6.1 | ✓ → ✓ | 0.0132 → 0.0132 | 0.038 → 0.047 |
| ice-track | **14.6 → 4.9** | ✗ → ✓ | 0.0163 → 0.0154 | **1.702 → 0.042** |
| luger-hill | **10.9 → 3.4** | ✗ → ✓ | **0.0291 → 0.0179** | 1.247 → **0.036** |
| mountainstreet | 5.1 → 2.5 | ✗ → ✓ | 0.0162 → 0.0148 | 0.725 → **0.023** |
| river-run | 2.9 → 2.1 | ✗ → ✓ | 0.0148 → 0.0138 | 0.721 → **0.020** |
| searound | 6.0 → 6.0 | ✓ → ✓ | 0.0157 → 0.0157 | 0.029 → 0.033 |
| seatrack | 5.3 → 4.3 | ✗ → ✓ | 0.0203 → 0.0189 | **1.334 → 0.042** |
| space-sprint | 5.2 → 5.5 | ✓ → ✓ | 0.0230 → 0.0235 | 0.049 → 0.052 |
| **pooled** | **median 6.0 → 4.9, worst 15.6 → 6.1** | **4/9 → 9/9** | **0.0291 → 0.0235** | **2.12 → 0.052** |

Requirement 1 (winner and line both visible by 95%): **8/9 → 9/9**.

**Shipped defaults**, same table, headline rows only:

| | before | after |
| --- | ---: | ---: |
| widest frame, median / worst | 6.2 / 15.6 | **5.2 / 6.1** |
| monotonicity | 5/9 | **9/9** |
| largest step, spec / FULL | 0.0309 / 2.51 | **0.0235 / 0.057** |
| requirement 1 | 8/9 | 8/9 |

**`river-run` on the defaults, reported either way as you asked:** it was this block's predecessor's
one named regression (standstill 13% → 55%, requirement 1 failing). It is now **standstill 13%,
monotonic, largest step 0.0183, widest 3.2 corridors** — and requirement 1 **still fails on it**, the
one track on the one arm where it does. Under your own config river-run passes requirement 1 and its
widest frame is 2.1 corridors.

---

## 4. Requirement 5 — built, measured, and NOT met. Here is exactly where.

**The condition I implemented is the one that was proposed:** the line's point held inside the frame
at `COMPANY_FRAME_PCT` (0.9). The close now carries a **floor** at the width that puts it there, so
the schedule may not close past its own finish line. It releases at the crossing by arithmetic — the
distance to the line is zero there — so requirement 2 is untouched (arrival error 0% on every track).

**What it bought,** ten tracks, shipped defaults, your field sizes, threshold → crossing:

| track | frames with NO line on canvas — BEFORE | AFTER |
| --- | ---: | ---: |
| city-circuit | 0 of 403 | 0 |
| dirt-oval | **274 of 420** | **50** |
| ice-track | 104 of 448 | **31** |
| luger-hill | 0 of 327 | 0 |
| mountainstreet | 14 of 276 | 20 |
| river-run | 0 of 333 | 0 |
| searound | 39 of 290 | 25 |
| seatrack | 80 of 289 | 120 |
| space-sprint | **259 of 262** | **116** |
| **pooled** | **770 of 3005 = 25.6%** | **362 of 3005 = 12.0%** |

**The line is findable on 88.0% of endgame frames, up from 74.4%. The requirement asks for 100%.**

### Why the last 12% is not a width problem, measured three ways

The remaining losses are **along the track, past the front edge** — not across it. I confirmed that by
grading the whole finish band across the corridor rather than its centre point: **it made no
difference to a single number**, because the band is perpendicular to the direction the line leaves in.

The cause is the pan. On space-sprint at 98.5% the framing rule puts the anchor at **(640, 360)** and
the pan has him at **(714, 434)** — **74 px of tracking lag against the 36 px of margin the 0.9 region
leaves**. The shot met its demand *to the pixel* and the line still sat 38 px below the canvas.

**I tried to pay for that with zoom three times and each attempt broke a different requirement:**

| # | attempt | what it cost |
| --- | --- | --- |
| 1 | Size the floor from the anchor's **observed** position | The feedback path of §2.2 again, milder: clipping **35%** of frames, arrival error **80%**, largest step **0.1625 ln**. |
| 2 | Carry the lag in the **distance** instead of the anchor (zoom-independent, non-singular) | The lag does not vanish as the leader reaches the line, so the floor never releases: **arrival error 97%** — requirement 2 broken outright. |
| 3 | Same, with the correction **bounded by the distance it corrects** so it does vanish | Better, still **arrival error 64%**, clipping 15%, monotonicity 8/9. |

All three are removed. **The zoom cannot buy this**, and that is the finding rather than an excuse:
the residual is a property of where the pan *is*, and the only quantity that describes it is a
function of the zoom being chosen, which closes a loop.

### The lever, named — and why I did not pull it unattended

During the close the run-in **walks the leader forward**, from 0.34 of the frame to 0.66, which moves
the frame's coverage *away from the line* exactly while the line needs to stay in it. Bounding that
travel is what closes the gap. **RUNIN-AHEAD-1 built that bound and RUNIN-BACK-1 removed it**, on the
record, because the travel is your own design — "from a little before the centre of frame to a little
after it, so that more of the track ahead is visible". Re-adding it contradicts a decision that is
written down as yours, so it needs your word rather than my judgement at 3 a.m.

---

## 5. The guard now grades the requirement, and it goes red both ways

`check-runin-frame`'s question 3 is rewritten. **Two things the old rule did that let the defect
through:**

- **It forgave an APPROACH** — the first frames of the window did not count, on the argument that a
  camera cannot already be where it is on its way to. That argument belongs to a design whose endgame
  move *starts* at the threshold. Requirement 1 makes the threshold a **deadline**.
- **It split the losses by cause and failed on only one.** A line that left because the pan trailed
  was printed as "trailed" and **passed**. Measured on the build you rejected: **0 overridden and 213
  trailed frames of 265** on space-sprint. *The guard was green while four fifths of the endgame had
  no line on screen.* The viewer cannot see which term was binding.

It now runs at **your field sizes** (100 open / 40 closed, not 20 — the field's spread is what pushes
the leader off the spine, which is the whole mechanism), grades the **band**, and fails on any frame
outside the region.

**Sabotage-proved both ways**, as asked:

| arm | result |
| --- | --- |
| `--sabotage-vanish` (the line leaves after it was once in) | **RED on 9/9 tracks**, naming the progress at which the viewer loses it |
| `--sabotage-never` (it never appears at all) | **RED on 9/9**, on the distinct "NEVER inside the region" branch |
| unsabotaged, this build | **RED on 8/9** — the requirement is not met, §4 |

> **The sabotage arms earned their keep immediately.** The first cut imported `COMPANY_FRAME_PCT`
> from the wrong module, got `undefined`, and every margin came out `NaN` — which compares false
> against zero, so **every track printed FINDABLE and the guard was green while measuring nothing at
> all**. There is now an explicit assertion on that constant.

**`npm run verify` is therefore RED, on `check-runin-frame`, for the right reason: the build does not
meet requirement 5.** It was already red on this guard before this block. I did not weaken it to
match the build — that is the mistake the last report warned about, in the same words.

---

## 6. The finding you asked to be recorded as a finding

> **The camera fingerprint never covered the browser's own seed source, so an entire class of change
> is invisible to it.**

Every harness in this repository takes the camera's random seed from the run identity, whose default
is the fixed constant `1439767152`. The browser does not — since CAMERA-SEED-AND-LINE-1 it derives it
from the race seed. **So no instrument had ever run the camera the browser runs**, and a picture you
reported could not be stood in by anyone.

`scripts/diag/wild-frame.mjs` is the first thing that does. It is why seed 30 was findable at all:
the seed-9 run that every other table uses is *clean* on the jump measure. **Three of forty seeds
carry the wild frame; the fixed-seed harness saw none of them.**

---

## 7. Attempt table — one line per rejected variant

| # | tried | verdict |
| --- | --- | --- |
| 1 | Return `Infinity` on an inert widen frame (the shipped behaviour) | **rejected** — period-2 strobe, 7 of 9 tracks |
| 2 | Restart the ramp on every resume (`36a0b70d`) | **rejected** — trades amplitude for standstill, river-run 55% |
| 3 | Carry the ramp (`415a5e9e`) | **rejected** — trades standstill for amplitude, widest 6.2 → 15.6 |
| 4 | **Hold the last placed width while inert** | **kept** — breaks the loop at its source |
| 5 | Target the widen at the **observed** anchor | **rejected** — undefined on 63–84% of frames, 2108 corridors where defined |
| 6 | **Target the widen at the framing rule's anchor** | **kept** — defined on 100% of frames, bounded |
| 7 | **Re-anchor the widen on a camera-state change** | **kept** — removes 0.347 ln on river-run |
| 8 | **Stand the OVERVIEW entry snap down inside the endgame** | **kept** — removes a cut and a 0.75%-of-race standstill |
| 9 | **Stand the LEAD_CHANGE entry snap down inside the endgame** | **kept** — removes the wild frame on seeds 21 and 40 |
| 10 | **Floor the close at the line's demand** | **kept** — off-canvas 25.6% → 12.0%, costs 0.0235 → 0.0792 ln |
| 11 | Floor from the observed anchor | **rejected** — clip 35%, arrival 80%, step 0.163 |
| 12 | Carry the pan lag in the distance, unbounded | **rejected** — arrival 97%, the floor never releases |
| 13 | Same, bounded by the distance | **rejected** — arrival 64%, clip 15%, mono 8/9 |
| 14 | Grade the whole finish band rather than its centre point | **kept** (correct condition) but **bought nothing** — the line leaves along the track, not across it |

---

## 8. Fingerprints, tests, hygiene

**Measured fresh on this build. Nothing minted.**

| role | recorded | measured | |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unmoved**, as required |
| world-off | `854018ee5d3d83e1` | `854018ee5d3d83e1` | **unmoved**, as required |
| camera | `f64c2ae531f14253` | `be7c7e41566a3bff` | **moved — not minted** |
| render | `7d553406f41ff176` | `b6f761223e622638` | **moved — not minted** |

**Stamps re-measured**, both of them, not re-stamped:

- `straggler-truth` — **identical to the digit** (6.18/4.57, 7.53/5.75, 4.45/2.30, 5.95/4.38).
  Structural: the run-in's window closes on the first crossing and phase 6 begins there.
- `tracking-lag` — only **PHOTO_FINISH** moved, and it moved **back**: median 4.62 → **4.51**, p95
  21.49 → **19.50**. Every other state identical, frame counts included. PHOTO_FINISH is the one state
  the endgame reaches with `_focusAnchorRacer` null, and the three cuts removed above are what were
  displacing the subject there.

**Camera suite 894 passing.** `npm run verify`: **20 PASS, 1 FAIL, 3 SKIP** — the one failure is
`check-runin-frame`, deliberately, §5.

**AND A SECOND TEST THAT WAS PROVING NOTHING, found by running the suite that owns it.**
`scripts/camera-seed-determinism.test.mjs` — the file the last block wrote to prove the camera seed
is derived from the race seed — was written against **vitest**, but `verify`'s `script-suite` spawns
`node --test` over `scripts/*.test.mjs`, and node's runner cannot resolve vitest from the repository
root: it is a CLIENT dependency. **The file threw `ERR_MODULE_NOT_FOUND` before its first assertion
ran** — it appeared in the suite, was counted, and asserted nothing. That is the second time in two
blocks that this particular test has been green while blind, and the first time is written up in
CAMERA-SEED-AND-LINE-1 §1. Converted to `node:test`, which is what every other file in that
directory already uses. **Both tests now run and both PASS on this build**, which is worth having:
the camera is still reproducible from the race seed after five changes to its width authority.

**Hygiene:** one branch (`exp/endgame-schedule`), working tree clean, **no stashes**, **no untracked
files**, both temporary worktrees removed, and `git ls-remote --heads origin` returns **`master` and
nothing else**. Nothing merged.

---

## 9. What was dropped, and it was dropped deliberately

**Task 4 — the early, slow close — is not built.** The brief ordered it dropped first if time ran
short, and the time went into §4: three separate attempts at requirement 5, each measured and each
removed. That was the right trade, because requirement 5 is one of your requirements and the step
budget it costs is a number I invented.

**What is worth knowing for it anyway,** because §2 changed the ground under it: the close already
begins early — `_runInWidenDone` fires the moment the shot reaches the width the line needs, well
before the deadline. Before this block that early start bought a **standstill**, because the close's
ramp parameter is pinned at zero until 95% (§2.4). That is now the thing standing between you and
"begins much earlier and runs correspondingly slower": the close's *trigger* is early and its *clock*
is not. The shape you suggested — follow the shrinking demand rather than a fixed ramp — is exactly
what the floor in §4 does for the frames where it binds, and it is smooth there.
