# SHIP-START-ONE-WINDOW — the start is one window, one rule, and it is on master

**THE OWNER JUDGED THE NEW START ON A PRODUCTION BUILD ON 2026-08-21 AND ACCEPTED IT.** That is the
fact this ship records; the fingerprints below are that acceptance written down.

**Merge:** `884d0562` · **Tag:** `v-ship-start-one-window` · **CI:** green for exactly that SHA.
The design and its ten-track measurement are [START-ONE-WINDOW-1](START-ONE-WINDOW-1.md); the pivot
repair it carries is [ZOOM-PIVOT-START-1](ZOOM-PIVOT-START-1.md), which ships here rather than
separately.

## THE LEFTOVER SEARCH — WHAT WAS RUN, AND EVERY HIT

He asked for a search rather than an assumption, so here are the commands and their disposition.
All are `git grep` over tracked files, whole tree.

| # | search | hits | disposition |
| - | ------ | ---- | ----------- |
| 1 | `START_PHASE_DURATION` | 18 | **2 rewritten** (`docs/CAMERA_DIRECTOR.md`'s priority chain and its open-items list). **2 kept as the record of the removal** (`CameraDirector.js`, `defaults.js`). **14 in `reports/`** — append-only history. |
| 2 | `postStartHoldMs` | 30 | **1 rewritten** (`racePlanner.js`'s history note, which described it as a live camera key). **5 kept as the record of the removal.** **8 in recorded e2e diagnostic output** — a record of a 2026-05 run, not a fixture; nothing reads it but two reports. **16 in `reports/`.** |
| 3 | `post-start hold` / `3 s start overview` / `start phase`, prose, excluding `reports/` | 19 | **7 rewritten** (one director comment, six test titles and comments). **11 kept** — each NAMES the retired thing to explain what replaced it. **1 in `docs/archive/`**, which declares itself HISTORICAL in its own header. |
| 4 | `startHandoverOnLeaderMark` | **1** | Only in a closing note describing it as history. **The switch and its key did not survive the transplant of its condition — which was the instruction.** |
| 5 | bare `3000` in camera code / Dev Screen / the camera doc, meaning this window | 6 | **3 rewritten** (test titles and a fixture comment). **3 kept** — the removal notes. |
| 6 | guard blinds, exception lists and measured stamps naming any of it | 4 | **All kept.** Three are `check-fallback-agreement.mjs`'s record of a question POST-START-HOLD-UNIFY closed; one is the diag's own header, updated to name the new key. |

**IF SOMETHING MUST STAY, plainly:** every report under `reports/` describes what was true on the day
it was written and is append-only by rule. `docs/archive/camera-inventory-2026-05-14.md` says
_"Read this as HISTORY"_ in its own second line. The recorded e2e diagnostic text files are the
output of a past run. **None of those is a leftover, and none was touched.**

### The dead-path check after the centroid went — nothing was dead

- **`getPanTarget`'s `OVERVIEW` / default branch (the centroid):** still reachable. `detourRecorder.js:148`
  calls it with `dir.state`, which is OVERVIEW for a large part of every race. **Kept.**
- **The `getPanTarget` import in `CameraDirector.js`:** still used twice, for BATTLE_ZOOM. **Kept.**
- **`focusRacers` in `_setTargets`:** the centroid branch consumed it, but so does `_framingSubjects`.
  **Kept.**

**Nothing was removed for being unreachable, because nothing became unreachable.** The two things
that did go — the constant and the config key — went because they were replaced, not because they
were orphaned.

## WHAT THE DOCUMENTS NOW SAY

**`docs/CAMERA_DIRECTOR.md` gained §3a-start**, which describes the start in the order it happens:
the formation and its shot · at the gun the shot opens while the camera stands still · when the
leader reaches his place the camera follows him as it does everywhere else · one window of
`startWindowMs` during which the start framing owns the picture. **The old description was deleted,
not layered under it** — the priority chain's two entries became one, and the open-items list no
longer calls a retired constant "a constant, not a control".

**The three-clocks table is in that section, and so is the reason `minStateHold` stayed**, at length
and with its three call sites, because the next reader to look at this will see a 5000 ms hold
sitting in the start window and want to remove it. It is general; the window owns the state instead.

**The lesson canon was checked first and EXTENDED rather than duplicated (R13):**

- **L213 (Suspect-The-Instrument) gained an extension**, because the new failure is its mirror image
  rather than a repeat: a contradiction at least starts an inquiry, while a **mislabelled readout
  that AGREES ends one**. `pan 100%` measured travel from the last state transition against a
  reference the start window never sets, and read as "arrived" while the camera was 402 px away.
  Two readers took it at face value and three explanations were built on it.
- **New Lesson 217 — the Follower Law.** A first-order follower can lag, can be slow, can never
  arrive, but **cannot get ahead**. So a camera measured beyond its target is not a symptom to tune;
  it is a proof that a second writer exists, and the only useful question is which one. Nothing in
  the canon stated it, and four blocks in a row were spent not knowing it.

## THE FINGERPRINTS — MEASURED ON THE MERGED TREE

The catch-up merge in `SHIP-CEREMONY.md`'s ship order makes the branch tip's tree the merged tree, so
these are measurements of what master now has.

| instrument | closure | before | after | |
| ---------- | ------- | ------ | ----- | - |
| WORLD | 36 | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unmoved** |
| WORLD-OFF | 36 | `854018ee5d3d83e1` | `854018ee5d3d83e1` | **unmoved** |
| CAMERA | 36 | `d9f45a4aea0e5778` | **`f64c2ae531f14253`** | **MINTED** |
| RENDER | 53 | `1274c7e8444238e3` | **`a8c59ef5002716f1`** | **MINTED** |

**WORLD and WORLD-OFF were RUN, not argued.** `defaults.js` is inside their closure and this ship
genuinely edits it — it RETIRES one camera key and adds another — so only a measurement can say the
race is untouched. Had either moved, this would have stopped before the tag.

**The tracking lag was re-measured, not re-stamped** — twice, in fact: the documentation sweep touched
a comment inside the stamp's `depends=` directory and the guard asked again. Identical both times.
**The frame counts moved against the previous ship, and that is the point**: this is the first camera
ship in the sequence that changes the state SEQUENCE rather than only the framing. BATTLE_ZOOM
9701 → 10935, LEAD_CHANGE 7786 → 9378, COMEBACK_ZOOM 644 → 162, LEADER_ZOOM 17630 → 17175, OVERVIEW
4303 → 4248, PHOTO_FINISH unchanged. **Per-state lag is steady or better everywhere it moved.**

## THE SWEEP

- Branch `feat/start-one-window-1` deleted at the origin after the merge.
- **`feat/start-handover-mark-1` is superseded by this work** — its condition was transplanted and
  its Dev Screen switch deliberately dropped — so it is archived as the annotated tag
  `archive/start-handover-mark-1` and deleted at the origin.
- **`fix/zoom-pivot-start-1` is contained in this merge** and its branch is deleted; its report ships
  here.
- `git ls-remote` confirms master alone at the origin.

## THE OWNER'S OPEN LIST — told to him, not asked for, NOT FIXED

1. **On four closed tracks at 40 racers the standing-still phase is ZERO** (city-circuit, dirt-oval,
   ice-track, searound). The ceremony's framing fits the formation, so the leader is already past his
   mark when the gun fires and the camera follows from the first frame. **The rule is working exactly
   as specified.** *Cost to address:* the lever is the ceremony's ARRIVAL framing — a shot slightly
   wider than the formation would put the leader behind his mark on all ten — and that is a change to
   the ceremony, its own eye test and its own fingerprint move.
2. **luger-hill at 20 racers: the second-placed racer is outside for 9 frames**, where he was outside
   for 0. The leader stays in, and at 40 racers it is 0. *Cost to address:* it is a one-track,
   one-field-size regression of the second subject; the honest route is a guarantee that names the
   top TWO rather than the leader, which is a framing change touching every state, not the start.
3. **river-run's field centre sits 0.065 from mid-frame instead of 0.014** at one second. Its camera
   travel goes to **0.0** — the August defect cannot exist while the camera does not move — but the
   field drifts down the frame because the camera holds still while the field runs. *Cost to
   address:* nothing has ever measured what the world-edge clamp costs at a start against the world's
   edge, which is where river-run begins; that measurement comes first, and it is a block of its own.

## PROPOSALS

1. **`panProgress` should be repaired or renamed in the CAM DIAG.** It is the readout that cost three
   explanations, and it is still on the overlay reading `100%` in a window with no state transition.
   Either reset its reference when the ceremony hands over, or rename it to what it measures. L213's
   new extension says why this matters more than it looks: a number that settles a question cheaply
   is the one nobody audits.
2. **The start window now decides which state runs, and `overviewStartDelay` still exists beside it.**
   Two mechanisms describe when OVERVIEW may appear. They do not conflict today — the delay is longer
   than the window — but that is an accident of two values, and the next person to shorten one will
   find out the hard way. Worth one reading to decide which owns the answer.
