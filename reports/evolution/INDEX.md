# Evolution reports — index (newest first)

One line per report: what it tried → verdict → the lesson/outcome. This is the lab journal's map. The reports
themselves are the record; the living docs are [LESSONS.md](../../docs/LESSONS.md), [DEAD-ENDS.md](../../docs/DEAD-ENDS.md),
and [FAIRNESS.md](../../docs/FAIRNESS.md). Shipped world: **`dc4647be0f55ebdb`** = COMBO15 + margin hysteresis + lateral acceleration cap (lineage in [SIM.md](../../docs/SIM.md)).

## CORRECTIONS — findings that invalidate a number in a report below

- **2026-08-22 — LABEL-OVERLAP-3's "7 of 12 names collide" should read "3 of 11".** Its browser pass
  built label boxes with `BOX_PAD_X = 10`; the module's value is **8**, so every box was 2 px too
  wide and the count was inflated. Corrected in [LABEL-OVERLAP-FIX-1](LABEL-OVERLAP-FIX-1.md), which
  measures with the real `labelBoxWidth` on real Chrome metrics. **THE FINDING IS UNAFFECTED** — the
  defect, its mechanism, the name-vs-number signature and every PHOTO_FINISH figure stand, and 3 is
  still not 0.

- **2026-08-22 — LABEL-NAMES-2's "the room test is behaving correctly, 0 of 8 non-exempt names
  overlap" is WRONG. Measured by pixels in his own frame: 7 of 12 overlap.** Corrected by
  [LABEL-OVERLAP-3](LABEL-OVERLAP-3.md). **The defect is real and named**:
  `YIELD_OVERLAP_FRAC = 0.35` (`nameTagLayout.js:184`, applied at `:413`) — a name is admitted with
  ZERO tolerance, then a tenured NUMBER is allowed to land on it with a 35% budget. All seven
  collisions are name-vs-number and all seven fit inside that budget. Separately,
  `exemptAll` in PHOTO_FINISH (`renderRaceFrame.js:258`) bypasses the test entirely, and its premise
  "at that zoom" is false — that shot measured **1951 world px, the widest of the race**, with 40 of
  41 names overlapping and 9 clipped. **THREE harness defects caused the zero**, all in
  `label-names-truth.mjs`: the audit shared the layout's own measurement function so it could only
  confirm it; the wrong ROSTER (mixed, not the default `current` the owner uses — and a name is an
  engine input); and `assignRaceNumbers` called with an array instead of a count, so every number
  label was the EMPTY STRING and the layout saw 10 px boxes where the game draws 20-27. **WITHDRAWN:**
  the overlap verdict and every name/number COUNT. **STANDS:** `labelNamesWhenRoom` as the key
  (structural), and `highlightHeroes` drawing a ring. **AND LABELS-AND-FLOOR-1's REVERSAL FALLS
  BACK** — the labels are NOT fine; both the labels and the sprite floor are real defects.

- **2026-08-22 — SPRITE-SIZE-OVERVIEW-1 and LABELS-AND-FLOOR-1 both say `labelNamesWhenRoom: true`
  yields ZERO names. It yields 670.** Corrected by [LABEL-NAMES-2](LABEL-NAMES-2.md); recorded here
  because those reports are append-only. It was a HARNESS defect: `scripts/lib/raceDriver.mjs` never
  assigns `st.phase` or `st.raceStart`, so `showAllTags` is true for the whole race and
  `computeTagLayout` returns its start-formation roll call — which labels everyone, declutters
  nothing, and returns `wide` EMPTY. **What STANDS:** every sprite, gap, overlap and floor number in
  both reports, and the label WIDTHS — none depends on the label layout. **What is WITHDRAWN:** the
  zero-names claim and the label COUNTS. **What REVERSES:** LABELS-AND-FLOOR-1's closing line that
  labelling dominates so the floor may not be worth touching — the room test refuses the names that
  would overlap, so the sprites are what is left unreadable. `render-fingerprint.mjs` is unaffected;
  it runs its own loop and sets the field.

- **2026-08-22 — three recorded open items are NOT open, verified against the source by
  [OPEN-ITEMS-2026-08-22](OPEN-ITEMS-2026-08-22.md).** Recorded here because the reports that carry
  them are append-only. **ALREADY FIXED:** the three Dev Screen controls that could show a number the
  game is not running (ONE-HOME-1 fixed the code; DEV-CONTROLS-HONEST-1 added the test on
  2026-08-21), and `check-index` being one-directional (it passes both directions —
  `scripts/check-index.mjs:18` — and BACKLOG is struck accordingly). **NEVER TRUE:** that
  `check-doc-links` does not declare its exclusion of `reports/` — it declares it three times, in its
  header and in its machine-readable `blind` array. **AND ONE RECORDED NUMBER IS STALE:** the
  worktree stubs are **47, all stale**, not the ten `docs/BACKLOG.md` carried; corrected in place.

- **2026-08-22 — [STRAGGLER-TRUTH-1](STRAGGLER-TRUTH-1.md)'s DURATIONS stand; every statement it
  makes about VISIBILITY is WITHDRAWN.** Corrected in [STRAGGLER-TRUTH-2](STRAGGLER-TRUTH-2.md)
  rather than in the report, which is append-only. **The owner tested the ending on 2026-08-22 and it
  is correct** — it shows as many still-running racers as possible — and the reading was wrong. **Its
  arithmetic was right on every frame it sampled; it sampled the wrong frames.** The probe counted
  from the WINNER'S CROSSING and took its headline on the FIRST frame of FINISH_OVERVIEW, both inside
  the shot that is still closing around the winner. **WITHDRAWN:** "when the zoom-out begins, half to
  three-quarters of the field is still racing and almost all are off the canvas — 11 of 11 at 20, 27
  of 29 at 40"; "54–75% of frames of phase 6 have at least one unfinished racer outside the picture";
  "on three of four runs there is a frame with no unfinished racer in shot"; and the closing note's
  headline **"the ending waits for people it has stopped showing", which is FALSE as written.**
  **Measured in the SETTLED shot, every remaining still-running racer is in the picture** — 5/5, 6/6,
  7/7 — and one hand-reconciled frame holds **34 of 40 racers**. **WHAT STANDS:** phase 6 lasts
  4.45–7.53 s, the zoom-out leads the last crossing by 2.30–5.75 s, and both numbers
  `ENDING-PHASES.md` used to carry were wrong. **The instrument is fixed and now agrees with the
  screen.**

- **2026-08-21 — [OVERVIEW-AIM-1.md](OVERVIEW-AIM-1.md)'s ANCHOR findings stand; two of its
  statements about the CAMERA are WITHDRAWN.** Corrected in
  [START-CONTRADICTION-1](START-CONTRADICTION-1.md) rather than in the report, which is append-only.
  (1) **"the camera moves 0.1 world px at the gun"** is true of the FIRST FRAME only and was measured
  on seed 5601 with `gun-window-truth`, which reports ALONG-track travel since the last ceremony
  frame — not stillness. **The camera centre travels 187 world px within 400 ms**, which that report
  never measured and whose absence left the impression that nothing happens at the gun. (2) **"the
  step is at 3.0 s"** is downgraded from *the* step to *a* step: there are two, and the owner's
  screenshots are of the earlier one. **Everything that report says about the ANCHOR survives and is
  now confirmed at residual 0.0 world px on the owner's own seed under two configurations** — the
  field's centroid until 3000 ms, the leader after it, `_camT` null throughout, `leaderForwardFrac`
  inert, and the world-centre reading still refuted.

- **2026-08-12 (evening) — [RUNIN-STATE-1.md](RUNIN-STATE-1.md)'s MECHANISM is superseded; its
  MEASUREMENTS and its trace stand.** That report shipped the run-in as a camera STATE and recorded
  the limit itself: the state owned 14.9% / 18.5% of the endgame window. [RUNIN-OWNS-1.md](RUNIN-OWNS-1.md)
  replaced the state with a bound on whatever state is running, and ownership went to **100%**. Two
  of its conclusions are now wrong and are corrected there rather than in the report, which is
  append-only: (1) "the run-in must be a LEADER-family STATE so the anchor correction is live" —
  the anchor correction is what matters, not the state, and it is now supplied directly; (2) a RUN_IN
  state at the line would have **suppressed the photo-finish slow motion**, which RaceScreen
  triggers off `hudState` — not known when that report was written. Its **line-in-frame figures
  (24.8% / 25.6%) and its bit-identical crossing zoom (0.00e+0) are correct for the shape it
  measured** and are superseded by 78.2% / 93.1% and 1.31e-3 / 1.02e-2 for the shape that shipped.
  **docs/DEAD-ENDS.md §M was rewritten the same day**: as first written it banned the mechanism that
  shipped nine hours later.

**The reports themselves are append-only and are NOT edited.** A report records what was true on the
day it was written; when a later measurement shows one of its numbers was an artefact, the correction
is dated and recorded HERE, where a reader on their way to the report will pass it.

- **2026-08-12 — every `runaway 0%` in the four reports below is an ARTEFACT, not a measurement.**
  Three harnesses (`exp-flapping-gate.mjs`, `exp-fairness-recheck.mjs`, `exp-roster-matrix.mjs`)
  derived the rate with `rp.filter((r) => r.runawayParade?.runaway)`, and `runawayParade.runaway` has
  never existed — the classifier's boolean is `runawayWinner`. The optional chain turned the missing
  field into a silent, permanent `0%`. Affected: **[RACER-MOTION-2.md](RACER-MOTION-2.md)**,
  **[HOLM-300-COMBINED.md](HOLM-300-COMBINED.md)**, **[FAIRNESS-RECHECK-1.md](FAIRNESS-RECHECK-1.md)**
  and **[ROSTER-MATRIX-1.md](ROSTER-MATRIX-1.md)**, plus the filed gate data
  `flapping-gate-data/motion.json` and `flapping-gate-data/combined.json`. **Every other number in
  those reports stands** — band arrival, `rowMin` and Holm were computed correctly and are unaffected.
  The true rate on the same four tracks and the same shipped world is **2.8% pooled** (searound 7.0%,
  luger-hill 3.0%, space-sprint 1.0%, seatrack 0.0%). Diagnosis and proof:
  [GATE-LINES-1](../night/GATE-LINES-1.md); the fix and the once-per-run control that makes the
  silence impossible to repeat: [GATE-TRUTH-1](../night/GATE-TRUTH-1.md).

- [OPEN-ITEMS-2026-08-22.md](OPEN-ITEMS-2026-08-22.md) — **which of our open items are still true**
  (2026-08-22). Every item verified against **today's source**, never against the report that
  recorded it. **Seven STILL TRUE, ordered by what he would see** — headed by **PHOTO_FINISH missing
  from `ALL_STATES`**, which makes three of its Dev Screen sliders inert and is the only one he could
  see. **Two ALREADY FIXED** (the Dev controls; `check-index`), **one NEVER TRUE**
  (`check-doc-links` does declare its `reports/` exclusion, three times), **five CANNOT ESTABLISH**
  with what stopped each named. The worktree stubs are **47 and all stale**, not the recorded ten.
  **Nothing was fixed — a one-line fix would have made the sweep's own numbers untrue by the time it
  shipped.** Closes with how items should get retired in future, since nothing did.

- [STRAGGLER-TRUTH-2.md](STRAGGLER-TRUTH-2.md) — **the instrument's window was wrong, and it is the
  only thing that was** (2026-08-22). INVESTIGATION ONLY; the ending is correct and untouched. Four
  candidates checked with the value each produced: **who counts as unfinished — clean** (`finishRank`
  is set on the crossing frame, 1-based; 26 finished / 14 unfinished in the reconciled frame, no
  misclassification); **the canvas — clean** (1280×720 both sides, no DPR, coordinates internally
  consistent); **the harness — clean** (real roster, slow motion on); **the phase boundary — THE
  CAUSE.** One frame reconciled by hand at 40 racers: **26 finished all in shot, 8 of 14 unfinished
  in, 6 out — the picture holds 34 of 40.** The camera **travels ~300 world px** into the course
  before settling. Instrument fixed to report the SETTLED shot as a **median** (a minimum only ever
  finds the degenerate tail — the same error one level down): **5/5, 6/6, 7/7 unfinished in shot.**

- [NIGHT-2026-08-21-CLOSING.md](NIGHT-2026-08-21-CLOSING.md) — **closing note, night of 2026-08-21**.
  The ship was finished first; **four of five pieces done**, E dropped to budget as the drop order
  instructed, with what it needs written down. **One decision for the owner and only one: the ending
  waits 4.45-7.53 s for stragglers it has already stopped showing** — on dirt-oval at 20 racers all
  11 still-running racers are off the canvas when the zoom-out begins. Not a defect, not changed, and
  the two ways to change it carry their costs. **Two pieces found the code already correct and the
  record stale** (the Dev controls, the e2e flakes), which is the closing note's third proposal.
  Closing state proven: master alone, CI green per merge SHA, all four fingerprints reproducing.

- [HOOK-SELF-CHECK-1.md](HOOK-SELF-CHECK-1.md) — **the pre-commit hook now vouches for itself**
  (2026-08-21). HOOK-TRACKED-1's first proposal, closed: before anything else the hook checks that
  `.githooks/` matches the INDEX and that nothing untracked sits in it. **Index, not HEAD, and that
  is the design** — comparing against HEAD would make every change to the hook impossible to commit
  through the hook. **The circularity is named, not claimed closed:** a hook that does not run cannot
  report; this covers the other case, *runs but is out of date*, which nothing covered. **Proven
  three ways by running it** — the tracked hook lands, an unstaged edit is refused by name, an
  untracked `pre-push` is refused because git would run it and nothing tracks it. `VERIFY-RULES.md`
  gains **R12a** beside R12.

- [E2E-FLAKE-HUNT-1.md](E2E-FLAKE-HUNT-1.md) — **five green e2e runs, one flake reproduced under an
  artificial load, and the 404 NOT ESTABLISHED** (2026-08-21). **NOTHING WAS CHANGED** — no test
  edited, weakened, retried or serialised. Five consecutive full runs came back **103/103 every
  time**, against the 2-per-5 that NIGHT-2026-08-17 measured twice, so there was no dependency to
  point at and nothing to decouple. `d11:182` DID fail 1-in-7 under `--repeat-each=6`, and it is a
  **30 s time-budget overrun with the race running fine in the snapshot** — not a 404, and produced
  only by a contention the real suite does not have. **The 404 was never seen**: a missing sprite is
  ruled out (all three absent `/assets` paths are referenced from unit tests only), and the
  background-image loader logs a WARN the test does not filter on. Honest not-established; the test
  is exactly as it was.

- [DEV-CONTROLS-HONEST-1.md](DEV-CONTROLS-HONEST-1.md) — **the three Dev controls can no longer show
  a number the game is not running** (2026-08-21). OWNER-DECISIONS §1.1 named them and ONE-HOME-1
  fixed the CODE, leaving one thing open in its own hand-back table: the test. **This is that test,
  and no control needed changing** — each already reads the one home. **The design is the value:**
  the storage loader is mocked EMPTY and the DEFAULTS ARE REAL, pulled through `importOriginal`, so
  no assertion can be satisfied by a number typed into the test file. Four tests including a
  CONTROL (without it they would pass against a panel that ignored stored settings entirely).
  **Sabotage-proven with the exact wrong literals the audit named** — `false` for a checkbox the
  game runs ON, `1.0` for a multiplier the game runs at `2.0`. No key, no component, no fingerprint.

- [STRAGGLER-TRUTH-1.md](STRAGGLER-TRUTH-1.md) — **phase 6 of the ending, measured at last, and both
  of its numbers were wrong** (2026-08-21). MEASUREMENT ONLY. `scripts/straggler-truth.mjs` closes
  the one phase `ENDING-PHASES.md` described with figures nothing backed. Phase 6 lasts **4.45-7.53 s**,
  not the recorded ~2.9 s, and it **grows with the field**; the zoom-out begins **2.30-5.75 s** before
  the last crossing, not ~1.4 s — the doubted number was doubted correctly. **The finding nobody had
  asked for:** when the zoom-out begins, half to three-quarters of the field is still racing and
  **almost all of them are already off the canvas** (11 of 11 on dirt-oval at 20), and on three of
  four runs there is a frame with **no unfinished racer in shot at all**. The mechanism is the fixed
  lookback point working as designed; whether the ending should wait for people it stopped showing is
  **the owner's question**. No fingerprint can move.

- [SHIP-START-ONE-WINDOW.md](SHIP-START-ONE-WINDOW.md) — **the start is one window, one rule, and it
  is on master** (2026-08-21). **The owner judged it on a production build on 2026-08-21 and ACCEPTED
  it.** Carries [ZOOM-PIVOT-START-1](ZOOM-PIVOT-START-1.md) too. **CAMERA `f64c2ae531f14253` and
  RENDER `a8c59ef5002716f1` MINTED; WORLD and WORLD-OFF measured and unmoved** — run rather than
  argued, because this ship retires a key inside their closure. Contains the **leftover search**, six
  greps over the whole tracked tree with every hit classified as removed or kept-with-reason, and the
  dead-path check after the centroid went (**nothing was dead**). `docs/CAMERA_DIRECTOR.md` gains
  §3a-start and the old description is deleted rather than layered under it; **L213 gains an
  extension** (the same suspicion is owed when an instrument AGREES) and **Lesson 217, the Follower
  Law**, is new. Ends with the owner’s **open list of three**, with what each would cost.

- [START-ONE-WINDOW-1.md](START-ONE-WINDOW-1.md) — **one clock, one rule, ten seconds** (2026-08-21).
  The owner’s design: three stacked clocks in the start become **one key, `startWindowMs` = 10000 —
  today’s sum written once**. Inside it the shot **opens where it stands and does not pan** (the
  anchor is the point the ceremony left at the centre, replacing the field CENTROID that moved the
  instant the race did), and the camera follows the leader the moment he reaches his racing place.
  **ESTABLISHED BEFORE DELETING: `minStateHold` is GENERAL** — six per-state values, three callers
  including the phased observer — so it stays, and the window owns the state instead via the existing
  per-entry override. **HIS CASE IS FIXED: dirt-oval at 40 racers had the leader outside for 55
  frames and the second man for 14; both are 0.** city-circuit 42 → 0, searound 20 → 0 at twenty.
  `minOn` identical everywhere; the forward rush is gone on all ten (`ahead` negative at both field
  sizes, from +177 on river-run). **Worse, named and not tuned:** luger-hill’s second man out for 9
  frames at twenty, river-run’s field centre 0.486 → 0.565, and on four closed tracks at forty the
  still phase is ZERO because the ceremony’s framing fits the formation. CAMERA `f64c2ae531f14253`
  and RENDER `a8c59ef5002716f1` moved; WORLD/WORLD-OFF run and unmoved. **Unmerged, unminted.**

- [ZOOM-PIVOT-START-1.md](ZOOM-PIVOT-START-1.md) — **the zoom-about-the-anchor correction now runs
  in the group shots too** (2026-08-21). **ONE CONDITION REMOVED** at `CameraDirector.js:1079` — the
  `_runInActive` scope the source itself called a latent defect everywhere. No key, no fraction; the
  pivot is the same `_framingProbe.anchorPoint` the run-in already used. **All four acceptance
  criteria met on the five CLOSED tracks** — the zoom's net pull on the frame centre goes 14.1 → 0.3
  world px, dirt-oval stops passing its target (142.1 ahead → never ahead), leader-out frames go
  **46 → 0**, **89 → 0**, **61 → 20**, and city-circuit's min-on-screen **4/20 → 17/20**. **The five
  OPEN tracks are byte-identical** (their zoom does not move in the window). **Criterion 2 misses on
  three open tracks and is UNCHANGED there** — the cause is the world-edge clamp (river-run spends
  184.8 world px on it), not the pivot. CAMERA `ce3475ecaf0926fe` and RENDER `64e413d28c0072f0`
  moved as expected; WORLD/WORLD-OFF measured and unmoved. **Unmerged, unminted, his eye owed.**

- [START-OVERSHOOT-1.md](START-OVERSHOOT-1.md) — **what carries the camera past its own target at
  the start** (2026-08-21). **THE TERM IS THE ZOOM'S PIVOT:** the camera zooms about the WORLD
  ORIGIN, so the frame centre moves `camX × Δzoom/zoom` even with the offset unchanged — a 15%
  widening at 1496 world px from the origin is **~225 world px**. **The line that cancels it is
  `CameraDirector.js:1085`, and it is SKIPPED** because `_focusAnchorRacer` returns null for
  OVERVIEW — the failure the source itself predicted at `:1062-1080` and deliberately scoped away
  from. **The switch-on frame is the first racing frame**: the last ceremony frame has the camera ON
  its target, and one frame later `dCamX +13.8` is `zoomTerm +13.8, panTerm +0.1`, because
  `updateCountdown` writes the offset absolutely while `update()` lerps it. `panTerm` is negative on
  every frame 17–1100 ms — **the follower never overshoots.** Six candidates ruled out with numbers,
  including `Δv: r0-r1`, which is a RACER speed difference the camera never reads.

- [START-CONTRADICTION-1.md](START-CONTRADICTION-1.md) — **the owner's screenshots vs
  OVERVIEW-AIM-1** (2026-08-21). **NEITHER ACCOUNT IS WRONG** — one describes the ANCHOR, the other
  the DELIVERED PICTURE, and in the photographed window they are up to **138 world px apart**.
  **`pan 100%` is a mislabel and is why they looked like one statement:** `panProgress` measures
  travel from the last STATE TRANSITION, and `_transitionStartOffset` is still its constructor `0`
  because the start window has no state change — so it reads 100% while the real gap is 402 px.
  The config is NOT the divergence: the harness runs `DEFAULT_CAMERA_CONFIG`, and a config with the
  thirteen cosmetic keys he named gives a byte-identical table. His CAM DIAG reproduces inside a
  two-frame window. **Two conclusions WITHDRAWN**: "the camera moves 0.1 world px at the gun" (the
  centre travels **187 world px within 400 ms**) and "the step is at 3.0 s" (there are two, and his
  screenshots are of the earlier one). The anchor findings survive, confirmed at residual 0.0.

- [OVERVIEW-AIM-1.md](OVERVIEW-AIM-1.md) — **what the camera aims at between the gun and the
  hand-over** (2026-08-21). **TWO OF ITS CONCLUSIONS ARE WITHDRAWN by
  [START-CONTRADICTION-1](START-CONTRADICTION-1.md) — see the CORRECTIONS block at the top of this
  file.** **READING ONLY, and the planner's reading is REFUTED**: it is not the
  track's centre — for the first **3000 ms** the anchor is **the field's CENTROID**, and at exactly
  `START_PHASE_DURATION` it switches to **the leader alone**. `worldW/2` was a coincidence of the
  oval's shape (the target's y is ~594 world px from the world's middle). **The step is at 3 s, not
  at the gun** — the camera moves 0.1 world px at the gun, and `lag` spikes 5.4× (dirt-oval) and
  3.5× (river-run) in the frame the subject changes, after which the field walks out of the middle
  of the picture. **The one mechanism built to smooth an anchor change is inert there** (`_camT` is
  null until the first committed transition at 4983 ms), and **`leaderForwardFrac` never fires in
  the window either** (`bias 0.0` on every frame). No proposals, by instruction.

- [NIGHT-2026-08-21-CLOSING-START.md](NIGHT-2026-08-21-CLOSING-START.md) — **closing note, the
  START HAND-OVER night of 2026-08-21** (**recovered**: a later block the same day overwrote this
  path instead of creating a new one; the content is byte-identical to `3e3fbeab`). **Four of four
  pieces done**, plus the B′ tidy-up. Opens with what the owner must do
  in the morning: look at the start on the served `bf1912eb` build (**the switch is OFF by default —
  it is a Dev Screen tick box**), and answer three questions. **Waiting for his eye:**
  `feat/start-handover-mark-1` @ `bf1912eb`, unmerged, **two of four acceptance criteria met**, and
  its branch is three merges behind master so its INDEX line will conflict by one line. Records that
  the same widening-re-resolves-the-pan trap was walked into from the opposite direction one week
  after B′ died of it.

- [SETUP-STATE-PIN-1.md](SETUP-STATE-PIN-1.md) — **what happens when the setup marker and the users
  store disagree** (2026-08-21). **NO BEHAVIOUR CHANGED; the diff is one test file.** `GET
  /setup-needed` reads marker-absent AND zero-users; `POST /setup` reads the marker alone, as its
  first act. They agree on the ANSWER in both disagreement states and part company on WHICH check
  produces it: **marker present + zero users is a LOCK-OUT** (a wrong token gets 409 rather than
  403, because the marker is read first — there is nobody to log in as and no API route to make
  one), while **marker absent + users present** refuses correctly from the paranoid post-gate check,
  **creating and then unlinking the marker on every attempt**. Ten tests including a control; all
  ten passed on the first run. **Two questions for the owner, in two sentences, at the top of the
  report.** **Merged.**

- [SETUP-TOKEN-LOG-1.md](SETUP-TOKEN-LOG-1.md) — **the same 403, and now the log says which one it
  was** (2026-08-21). `POST /api/auth/setup` answered `403 setup not available` both when no
  bootstrap token is configured and when one does not match, and only the first wrote a log line —
  so the two were identical from BOTH ends and the one person entitled to tell them apart could not.
  **THE RESPONSE IS UNCHANGED and a test now asserts the two 403s are byte-identical**, because that
  sameness is the security property. One warning added, in the neighbour's shape, **logging no token,
  no prefix and no length**. Five tests, two sabotage-proven; `docs/AUTH.md` gains the distinction in
  both places that describe the gate. **Merged.**

- [TEST-ACCOUNTS-1.md](TEST-ACCOUNTS-1.md) — **eight server test files stopped sharing one row**
  (2026-08-21). `authAgent.js` mints a user per call and `env-setup.js` gives each test FILE its own
  users store; the two sole-admin tests now **assert** their precondition instead of inheriting it.
  **The latent instance was REPRODUCED, not asserted** — on master, with the invisible per-file
  delete removed, nine tests go red at `expected 200 to be 409`. **The finding is why it was
  latent:** the store was isolated by a delete in another file that no reader of the assertion would
  ever see. Nothing weakened, nothing retried, and `--no-file-parallelism` is **dropped** — it was
  serialisation standing in for isolation. Proven with **five consecutive full runs (23 files,
  650 tests) plus three in random file order**. Two remaining order dependencies are NAMED rather
  than fixed, one of them pre-existing. **Merged.**

- [NIGHT-2026-08-18-CLOSING.md](NIGHT-2026-08-18-CLOSING.md) — **closing note, night of 2026-08-18**.
  **One of four pieces done**, and the stop was deliberate: Piece 1 (the change-password rate limit)
  is merged, green and swept; Pieces 2, 3 and 4 were **not started**, so nothing is half-changed.
  Piece 3 was NOT taken out of order in place of the expensive Piece 2. Lists what each remaining
  piece still needs, and names the latent shared-`testadmin` instance that is still live. **Waiting
  for his eye:** `feat/start-leader-visible-1` @ `21b77415`, unmerged and untouched, with the
  `ac885415` production build served on 4173 — read that report first; **city-circuit is worse in it,
  deliberately reported**.

- [CHANGE-PASSWORD-RL-1.md](CHANGE-PASSWORD-RL-1.md) — **a rate limit on changing your own password**
  (2026-08-19). The owner set the number: **FIVE**. Reuses the limiter login and setup already use —
  same factory, same 429 sentence, **no new env key** (the window is the login window, read from the
  same variable). **The one genuine difference, named rather than smuggled: it keys on the SESSION'S
  USER, not the IP**, because this route is authenticated and per-IP keying would let one operator
  spend every colleague's budget at the same address. Failed attempts only. 5 tests; the per-user
  keying is **sabotage-proven** (revert to per-IP and "the limit does not leak across users" goes
  red). `docs/AUTH.md` is the one home and gains a **keyed on** column. **No fingerprint can move** —
  no instrument's closure (36/36/55) contains any changed file.

- [AIM-TRAIL-1.md](AIM-TRAIL-1.md) — **why does the camera trail its own aim** (2026-08-18).
  **INVESTIGATION ONLY — the code is byte-identical to master**; nothing minted. **THE TRAIL IS NOT A
  DEFECT, and it is OLDER than the commit blamed for it.** `gun-window-truth`'s own `lag` column, run
  at all three commits (the tool was added by `ca178cc5`, so no adaptation was needed): the PARENT
  trails MORE at every sample — 313.7 world px at 1000 ms against 15.8 — and carries **10 racers
  outside the picture** where the commit and master carry 0. `c3f294d1` cut the lag up to 20×; what it
  changed is the ZOOM (4.5489 → 8.4602, 1.86× tighter), so a smaller lag lands further out in pixels.
  The pan is an exponential smoother with **entry TC 1.500 s (90% in 5.18 s) against tracking's
  0.250 s**, and the whole window is the entry phase — the measured lag never reaches even its own
  designed steady state (180–240 world px). The aim's jump at ~2.5–3 s is **a step in an INPUT — the
  subject — not motion of the field** (aim speed spikes to 5555/9920/2692 px/s against a 120–170
  baseline), and it happens on OPEN tracks too. Closed-vs-open is world lag AND zoom compounding
  (52 px vs 662 px vs 1585 px of screen trail); **why the world lag differs is NOT ESTABLISHED**.
  ⇒ **Ship B′ and close the line.** Three proposals.

- [START-SHAPE-1.md](START-SHAPE-1.md) — **the shape of the start, measured before anyone builds**
  (2026-08-19). **MEASUREMENT ONLY — the code is byte-identical to master**; nothing minted. **The
  leader is not out because the shot is tight around him — the camera is not pointed at him yet**: at
  dirt-oval 3000 ms the aim projects at x 1515 and the leader sits at 1517, 875 px outside the frame.
  Wrong on **3 of 5 CLOSED tracks and 0 of 5 open** (city-circuit 0.25–0.63 s, searound 2.13–3.13 s,
  dirt-oval 2.45–3.92 s), all inside the hold — release is 4983 ms everywhere. **The old defect is
  still repaired** (river-run ALONG 6.4 px at 1 s vs 37.4 before `c3f294d1`). **The proposed direction
  FAILS**: the field requirement is measured around the ANCHOR, so it reads 12.855 "comfortable" while
  a racer is 237 px outside — priced, it fixes zero closed tracks and **breaks garden-path**.
  Recommended instead is **B′ — the same requirement read off the DELIVERED frame, leader only**:
  leader in frame on all ten, **0 of 2400 frames changed on every open track** (so the old defect
  cannot return where it was diagnosed), 196 of 4800 overall, ≤1.70× widening for ~1.5 s. Three
  proposals, incl. **a camera commit must name the tracks its numbers come from**.

- [START-BISECT-1.md](START-BISECT-1.md) — **when did the start start looking like this** (2026-08-19).
  **INVESTIGATION ONLY — the code is byte-identical to master.** The leader leaving the frame in the
  first seconds on closed tracks entered at **`c3f294d1`, 2026-08-08 01:20, CEREMONY-HOLD-TARGET-1**
  — _"the hold is what the state ASKS for, not where the camera happened to stand"_. Its direct
  parent `ca178cc5` frames the leader at **863 px**; it frames him at **1517 px** off a 1280 px
  canvas, and that number is unchanged through master. **The term is the ZOOM**, not the pan, its
  smoothing or the field guarantee: the ceremony hand-over became a per-frame TARGET, so zoom at
  3000 ms went 4.587 → 7.939 (+73%) and a tighter frame magnifies the leader's distance from centre.
  **Deliberate, and judged on other tracks** — every number in it comes from river-run and
  mountainstreet, both open serpentines; its claim _"racers outside the picture 0 throughout"_ is
  false on dirt-oval (19/20). **His frames WOULD have looked different, on day one** — no growth or
  drift was needed. Predicate fixed before the search; instrument adaptations proven equivalent and
  neutral on master; bracket ADJACENT so no skip lies inside it; pre-2026-08-03 trees are not
  headlessly runnable (named causes). Three proposals.

- [SELF-PASSWORD-1.md](SELF-PASSWORD-1.md) — **an operator changes his own password** (2026-08-19).
  `engine-reach --check` printed for all 13 changed paths; nothing minted. `POST /api/auth/change-password`
  lives on the AUTH router, not `/api/users`, because that router is admin-only for every method —
  which is the gap, not an obstacle. **The target is `req.authUser.id` and nothing else**: no id in
  the path, none in the body, and no parameter for one in the client function, so the route cannot be
  pointed at another account. The current password is checked with the login path's own
  `verifyPassword`; the new one goes through `updateUser`, so no password rule or message was
  invented. **The re-stamp moved to `restampSession.js`** and both routes call it — written inline
  twice it would have been the second definition R14 forbids. The owner's **rider** sits on
  `sessionEpoch`: do not build a second mechanism beside it. The form is an `operator`-tier Dev Screen
  section next to the Log out button, reusing `Auth.module.css`. **23 tests**, the seam driven through
  the real `authApi.changePassword` with the body asserted by exact equality; **both sabotages red**
  (target-from-body → 3, no re-stamp → 3). Server 645/645. Also fixed before merge: a bcrypt
  wall-clock timeout and **a shared-`testadmin` dependency of my own** — nine files share that account
  in parallel workers. Three proposals.

- [SESSION-INVALIDATE-1.md](SESSION-INVALIDATE-1.md) — **a password change ends the sessions it
  should end** (2026-08-19). `engine-reach --check` printed for all four changed paths; nothing
  minted. **Two of the owner's three clauses were ALREADY BUILT** — invalidation is a `sessionEpoch`
  bumped by `usersStore` inside the same atomic write as the hash and compared by `requireAuth`, not
  a removal step in the router, which is why AUTH-DOC-LIVE-1 looked in one file and wrongly reported
  it absent. **So nothing was enumerated and nothing was deleted**: the SQLite sweep the brief
  suggested would have been a second definition of one rule (R14). What was genuinely missing is the
  self-change case — an admin rotating their OWN password was logged out by their own action; one
  `if` block re-stamps that one session while every OTHER session of that user still dies. **Both
  directions sabotage-proven** (drop the re-stamp → 2 red; drop the epoch bump → 3 red). 8 tests,
  server suite 628/628. A failed re-stamp invalidates MORE, never less, so the password change stands
  and the failure is logged. Three proposals, incl. **absence claims may not be quoted from a report**.

- [AUTH-DOC-LIVE-1.md](AUTH-DOC-LIVE-1.md) — **the authentication contract becomes a living document**
  (2026-08-19). Documentation only; `engine-reach --check` printed for all four changed paths, and
  nothing was minted. `docs/AUTH.md` is written **from the source**, not from the archived design:
  the first-admin channel (`x-bootstrap-token` **header, never the body**) is stated in the file's
  loudest sentence, every environment variable is **named without its value** together with what
  happens when it is absent, and `/race` behind `ProtectedRoute` gets its own call-out because it has
  misled tooling twice. The archived draft gains a superseded header and **its body is untouched**.
  Of its 52 enumerated claims, **31 carried, 12 changed, 9 dropped** — and the dropped list is the
  finding: nine designed behaviours were never built. **One of the nine was wrong and
  [SESSION-INVALIDATE-1](SESSION-INVALIDATE-1.md) disproves it** — an admin password reset DOES end
  that user's sessions, via a `sessionEpoch` compare in `requireAuth` that this report looked for in
  the wrong file. Also found and left alone: eight source comments cite the old
  document's section numbers, and a new living document is **invisible to every doc guard until it is
  staged** (proved by sabotage). Four proposals, incl. the 403 message that cannot say which of its
  two causes fired.

- [DOCS-CATCH-UP-2.md](DOCS-CATCH-UP-2.md) — **the documents describe the state we actually have**
  (2026-08-19). Documentation only; `engine-reach --check` printed for all three changed paths, and
  nothing was minted. **R14 NO SECOND DEFINITION** enters `VERIFY-RULES.md` in its numbered form,
  with the owner's reason and both traps we walked into (deletion-by-omission, and `?? 0` becoming
  NaN); **R8a** states what "green for exactly this SHA" means since the docs-only skip, pointing at
  `ci.yml` rather than restating it; R8 gains a pointer to the corrected ship order, which
  `SHIP-CEREMONY.md` already owned. **Canon: 3 EXTENDED (L207, L209, L210), 3 ADDED (L214 Summary,
  L215 Exclusion-Set, L216 Denominator)** — and L207's OFF-arm exception clause is REMOVED, because
  the ruling closed the question it rested on. `CAMERA_DIRECTOR.md`'s render blind list now says the
  racer types' drawing CODE is watched by nothing, not only their pixels. One stale claim found by
  reading: two camera fallbacks listed as disagreeing had been resolved by MIRRORS-BY-REFERENCE.
  Left alone and reported: `docs/archive/AUTH.md` is the contract's named home and declares itself
  unbuilt.
- [DEAD-EXPORTS-1.md](DEAD-EXPORTS-1.md) — **one deleted, one kept, and a premise corrected**
  (2026-08-19). The block was specced to delete TWO exports "referenced nowhere"; **one of them is
  referenced** — `deleteRacerSprite` is imported and called five times by its own test. The table in
  SEPARATION-TO-TEST-1 was right (one "ONLY its own test", one "referenced nowhere"); its PROSE
  flattened the two categories, and the loose sentence is what travelled. Only
  `RUNAWAY_LEAD_THRESHOLDS_LEN` was dead — verified by six searches over TRACKED files (identifier,
  string, partial name, namespace imports, importer list, server + docs), after an untracked 1.3 MB
  test artefact masked the first attempt. It described a report share table that was never built.
  **WORLD and WORLD-OFF measured** (`pulk-contest.mjs` is in the WORLD closure only, walked not
  assumed) **and unmoved**; script suite 388/388. Finding reported, not acted on: `DELETE
/api/racers/:id/sprite` has no caller from any screen. **Closes the open question — the owner
  decided 2026-08-19 that the three B2 attackers keep the shared `b2AttackFinalRank` of 7.**
- [SEPARATION-TO-TEST-1.md](SEPARATION-TO-TEST-1.md) — **the criterion moves to where it is actually
  used** (2026-08-19, the owner's decision). `checkSeparation` was defined once in
  `heroCurveGenerator.js` and referenced 7 times in its own test file and nowhere else — never a
  gate; two specs in a row assumed otherwise. It is now a plain function IN the test file, export
  removed, body byte-for-byte unchanged, with its reason carried across: it covers the STANDARD
  cast, because the three B2 attackers share one `b2AttackFinalRank` and are one act by design.
  **All four fingerprints measured — `heroCurveGenerator.js` is inside all three closures — and
  unmoved**, which is the proof nothing was reading it. Stated in the module's place: nothing checks
  at run time that two heroes are on different scripts. **19 other exports share the exact shape**
  (a first count said 153 — wrong, because a helper used internally AND tested looks identical from
  outside); none was moved, and two of them look like genuinely dead product code. No document named
  the criterion, so none was corrected and none was added.
- [SEPARATION-WINDOW-1.md](SEPARATION-WINDOW-1.md) — **the window is not the problem, and the fix
  was NOT merged** (2026-08-19). First, the question nobody had answered: **`checkSeparation` is
  called from nowhere in production** — no rejection, no retry, no fallback; it is an assertion in a
  test suite, not a gate. It rejects **98% of bunched-field plans** as shipped. The prescribed
  narrowing was built exactly as specified and measured: **98% → 95%**, and a monotone variant only
  reaches 85%. **The root cause is not the window** — all three attackers end at exactly rank 7.00,
  the single shared `b2AttackFinalRank`, reaching it at 0.15–0.63, well before their band release of
  0.80. Using each curve's ARRIVAL instead does make them pass, **vacuously**: two of three pairs get
  a ONE-SAMPLE window. **And the prescribed form is not more permissive** — the fraction's
  denominator shrinks, so the documented `battle-collapse` archetype goes 0.16 → 0.25 and FAILS.
  WORLD and WORLD-OFF measured with the change in place and unmoved, so the stop condition would
  have licensed the merge; it was reverted anyway, because it does not do what it was for and would
  have cost a true test.
- [ONE-HOME-1.md](ONE-HOME-1.md) — **no second definition, anywhere** (2026-08-19, the owner's
  ruling). He rejected the OFF-or-shipped question: no key is ever missing, because every loader
  walks the full default set — the fallbacks exist only so a function can be called with NO config,
  and only tests and harnesses do that. So reachability stopped being the question. **27 sites in 5
  files now read the one home; the guard's exception list went from 11 entries to EMPTY**, green for
  the right reason. All four fingerprints measured and byte-identical. The six booleans
  MIRROR-CENSUS-2 _deleted_ are restored to reading the home — deletion made a bare caller fall to
  `undefined`, a second definition by omission. **The searches found a class nobody had named:** the
  guard models fallbacks, not module-level objects that ASSIGN shipped values, and `GENERATOR_CONFIG`
  held FIVE such keys, all agreeing, so nothing could ever have spoken. **And the ruling exposed a
  finding — the shipped hero cast is NOT mutually separated**: that test only passed because a bare
  call ran with the attackers disabled by a local copy.
- [OWNER-DECISIONS-2026-08-19.md](OWNER-DECISIONS-2026-08-19.md) — **everything left that needs
  him**, and nothing on it has been touched. 13 items in 4 batches, ordered by whether he could ever
  SEE it, each with exactly five lines: what is wrong in plain language, can he see it, what changes
  if fixed, what it costs in minutes, what happens if left forever. **Batch 2 is ten items and ONE
  sentence** — "when a setting is missing, should the game run that feature OFF or the shipped
  value?" — so most of the sheet is a single decision. Only two items are visible to him at all, and
  only one (racer artwork being covered by no automatic check) is genuinely expensive.
- [DECLARED-HOLES-1.md](DECLARED-HOLES-1.md) — **two holes closed, one declared permanent with
  evidence** (2026-08-18). `check-measured-stamps` had excluded test files from its COMMITTED query
  since VERIFY-COST-3 but never from `stagedUnder` — the pre-commit position, the one that actually
  blocks — so a staged camera test blocked a commit and was answered with a re-stamp that proved
  nothing. Closed, and proved both ways: a staged test no longer blocks, a staged production file
  still does. `check-doc-links` and `check-measured-stamps` both SCANNED repo-root `*.md` and routed
  on neither, because `dirs` matches by prefix and the root is the prefix of everything; both now
  name the root docs, with a rule in `verify.test.mjs` that fails if the list stops matching git.
  **The object-literal blind spot is declared permanent, and the hand search behind it found FOUR
  copies of `b2AttackProgress` where MIRROR-CENSUS-1 reported two** — two are still live in
  `heroCurveGenerator.js`. That is what an uncounted class costs: not a wrong fix, a wrong count.
- [INDEX-COVERAGE-1.md](INDEX-COVERAGE-1.md) — **every report directory is now decided about**
  (2026-08-18). `check-index` walked **3 of 14** directories and printed `0 unindexed` — true of
  **44%** of the tree, in a shape that read as a statement about all of it. `proposals/` is now
  INDEXED (17 entries) because it is the one archive that still receives work — the audit that
  nearly went missing was written there; seven closed archives are declared **by name with a
  reason** (312 reports), and master did not go red because nothing was mass-indexed to make it
  pass. **The part that actually closes it is a THIRD DIRECTION**: the guard enumerates tracked
  reports itself and FAILS on any directory in neither list, so the `reports/audit/` case cannot
  repeat silently. `audit/`, `speed-candidates/` and `clean-state-2026-06-04/` are deliberately NOT
  pre-declared — they hold nothing today, and listing them would let the next file land silently.
  Proved in all three directions against the real tree.
- [CENSUS-REST-1.md](CENSUS-REST-1.md) — **the documents stop claiming cover they do not have**
  (2026-08-18). `SHIP-CEREMONY.md`'s render row named "the racer types' `drawRacer`" as a reason to
  run the render fingerprint; **`racer-types/` is inside no instrument's closure** (render 55,
  camera 36, world unreachable) and the instrument is separately blind to the sprite blit, so a
  change to how a racer is drawn is covered by his eye and nothing else. Four guards now DECLARE
  holes the census found: object-literal fallbacks (invisible to `check-fallback-agreement` while
  MIRROR-CENSUS-1 converted two), test-only edits tripping a production stamp, the repo-root
  `*.md` scanned-but-not-routed gap in two guards, and `check-index` walking **3 of 14** report
  directories — 245 covered, **329 not**. `guardScripts()` says it does not recurse. Text only:
  `covers`/`blind` are printed, never consulted for selection, so no guard runs on a different set.
  Six behaviour-changing fixes were one line away each and are listed rather than started.
- [MIRROR-CENSUS-2.md](MIRROR-CENSUS-2.md) — **six mirrors removed, not aligned** (2026-08-18).
  21 disagreeing copied defaults -> 14: the six OFF-arm BOOLEANS in `raceCore.js` had their
  `?? false` **deleted outright** rather than pointed at the default — a mirror that cannot drift
  beats one that currently agrees. **Booleans were the only ones that qualified**: `undefined` is
  falsy, so removal is safe in the direction the proof covers AND the one it does not, while the
  `?? 0` neighbours feed arithmetic and would become NaN. Every caller was enumerated first —
  `DEFAULT_CONFIG_WORLD.raceDynamicsConfig` IS `DEFAULT_RACE_DYNAMICS_CONFIG`, checked by identity —
  and `sim-fairness.mjs` was checked separately because it does not call `createRaceFromIdentity` at
  all. All four fingerprints measured and unchanged. **11 left for the owner**, and the report says
  what each would change if corrected: five `?? 0` physics keys, the B2-attacker trio, and the three
  Dev Screen controls — the only ones he could ever SEE.
- [TEARDOWN-INFLIGHT-1.md](TEARDOWN-INFLIGHT-1.md) — **the suite can no longer die at teardown**
  (2026-08-18). The cause was not noisy tests: four screen tests were making **real requests to
  `localhost:4000`**, and the suite's own `HTTP 401` proves a live server answered them. With a
  server up they resolved in milliseconds; with none they waited out a 3 s timeout — the same
  assertions taking different paths depending on what else was running on the machine — and
  `withTimeout` never clears its timer, so the work outlived the test that started it. The hooks are
  now mocked (NOT `fetch`, because a stub that made the loader succeed would have written geometries
  into localStorage and destroyed the state SetupScreen's refusal tests depend on). **The race is
  proved gone rather than absent:** `forbidNetwork()` records and throws on any call and asserts in
  `afterAll`, so a file that completes has proved no request was ever started — and the `afterAll`
  placement was itself found by sabotage, because throwing alone left the file GREEN with the guard
  firing 11 times. 65 warning lines → **0**; 4111 tests unchanged; no assertion re-blessed.
- [CI-DOCS-ONLY-1.md](CI-DOCS-ONLY-1.md) — **CI stops paying for what it cannot affect**
  (2026-08-18). On a push where every changed path is under `docs/`, `reports/` or a root `*.md`,
  the client and server jobs skip lint/format/tests. **The jobs themselves always run** — a
  workflow-level `paths:` filter was rejected because it produces NO RUN for the SHA, and the
  ceremony's `gh run list --branch master` would then hand back the PREVIOUS commit's green run:
  the rule would become silently unverifiable while looking verified. **Both audit gates still run
  on every push** — their result is not decided by the diff — and the `docs` job is never skipped in
  either direction, because its guards scan the whole tree. **Measured, not estimated:** the client
  suite is 2m51s and the audit gates are 1s each, but the three jobs run in PARALLEL, so the real
  saving is **≈1m45s on a docs-only merge (`7c2a27eb`: 3m25s → ≈1m40s) and 0 on a client merge
  (`0877d523`: 3m36s → 3m36s)** — smaller than the brief assumed, and the report says so and offers
  the revert.
- [QUIET-FAILURES-1.md](QUIET-FAILURES-1.md) — **it stops defaulting confidently** (2026-08-18).
  Five places replaced data that failed to arrive with a plausible default and told nobody; four now
  say so and the fifth (the server's route loaders) already did and was left alone. **The refusal is
  the piece:** a track whose geometry did not load can no longer be raced, because
  `geom ? !geom.closed : false` made a MISSING geometry a CLOSED track and that flag IS the race
  mode — an open track whose geometry timed out ran as a laps race with the right name and no
  message. A sixth silent exit was found while fixing the first (`if (!res.ok) return null`, which
  the `catch` never saw). **Seven existing tests went red and every one deserved it** — the Quick
  Test fixtures seeded a `geometryId` with no geometry and raced anyway, so they were passing
  _because_ of the defect. 20 tests added, all on failure paths, each with a happy-path silence
  check beside it. All four fingerprints measured (`storage.js` is in all three closures) and
  unchanged — and **the first run caught a defect in the fix**: the new warning fired in every
  headless harness, where no `localStorage` is the environment rather than a failure.
- [SETUP-TOKEN-CHANNEL-1.md](SETUP-TOKEN-CHANNEL-1.md) — **first-admin setup can succeed again**
  (2026-08-18). The client sent the bootstrap token in the body; the server reads
  `x-bootstrap-token` and nowhere else, so **no fresh installation could ever create its first
  admin** — and it answered 403 with a message naming the wrong cause. **Three suites were green
  over it**, each honestly: the server test asserts the rejection of exactly what the client sent,
  the client test mocks `fetch` and cannot see a channel, and e2e POSTs to the endpoint directly.
  `AUTH.md §5` was read first and does not decide this — it is silent on the channel, so the
  server's tested choice is the contract. New seam test drives the REAL client function against the
  REAL handler and is **proved by sabotage** (3 of 5 fail on the old client, both controls hold).
  The **CORS preflight** the new header provokes was measured against a running server on an
  ephemeral port — 204, header allowed, and a real admin created — because no test in this
  repository can see it. Class sweep answered by **enumeration**: the server reads four headers
  total, three of them browser-set, so there is exactly one piece of application data in a header
  anywhere and it was the broken one. No fingerprint owed (closure walk: none of the changed files
  is in any of the three).

## Project audits — another author's records, rescued into the tree

These two were written by a different author and were sitting **UNTRACKED** in the working tree,
outside every guard's scope: `reports/audit/` and `reports/proposals/` are not among the three
directories `check-index` scans, so nothing could have noticed them missing. They are moved here
**unedited — not one word changed** — because a record you did not write is evidence, not a draft.
The supersession is recorded in the newer document's own front matter rather than by editing the
older one.

- [PROJECT-AUDIT-2026-08-18.md](PROJECT-AUDIT-2026-08-18.md) — source-first project audit with
  explicit evidence labels. **This is where the setup bootstrap-token channel mismatch (F1) was
  first written down**, and it was the only copy — had the file been lost, so was the finding.
  Independently re-derived from source and confirmed by
  [SETUP-TOKEN-CHANNEL-1.md](SETUP-TOKEN-CHANNEL-1.md), which fixes it. Its other three findings
  (F2 contract-test gap, F3 guard cost concentration, F4 CI path-filter risk) stand as written and
  are not re-judged here.
- [PROJECT-AUDIT-2026-08-17.md](PROJECT-AUDIT-2026-08-17.md) — the previous day's audit,
  **SUPERSEDED by PROJECT-AUDIT-2026-08-18**, which says so in its own `Supersedes:` line. Kept
  because the 08-18 report reasons about and withdraws three of its recommendations, so deleting it
  would leave that argument with no other side.

## Ships

- [SHIP-COORD-SYSTEM.md](SHIP-COORD-SYSTEM.md) — **ONE RULER FOR THE WRAPPER, AND NOTHING WAS MINTED** (2026-08-14, tags `v-ship-coord-system` + `pre/ship-coord-system`). The owner judged a production build on 2026-08-14 and accepted it. Anything absolutely positioned inside `.race-canvas-wrapper` is now anchored in PERCENTAGES — `BrandLogoOverlay` and `StateOverlay` came under the rule `WinnerCard` and the opening card already followed; diagnostics HUDs stay the exception, being measured against the browser window rather than the picture. Written as `calc(N / D * 100%)` rather than rounded numbers so no drift creeps in between the test's arithmetic and the browser's. **The visible change he judged**: identical to the old fixed anchors at scale 1.0, and at his 1037×583 the corner clearance is **12.96 CSS px instead of 16** with the state pill dropping the same. **THE BRANCH WAS 82 COMMITS BEHIND** — forked at `5e738dfe` before the finish band, the contender ship, the finish window and glide, and the source clean-up — so master was merged in first and **everything it measured beforehand is NOT carried forward as established**. **ALL THREE FINGERPRINTS RE-RUN FRESH, no `--cheap`, and ALL THREE ARE UNMOVED** (world `dc4647be0f55ebdb`, camera `ff2bc42af377b5cf`, render `0d5854a652c69d87`), so **`docs/fingerprints.json` is untouched — a mint records a movement, and writing one anyway would put a false event in the record**. **A TRAP WORTH KNOWING**: bare `engine-reach --check` on a committed merge reports `none of 0 path(s)` because it reads the WORKING tree, which a merge leaves clean — that is the tool saying it was asked nothing, not a clearance. Given the five real paths it answers properly: **none of 5 can reach the race engine**. **THE BLIND SPOT THIS SHIP EXPOSES, stated rather than glossed: a VISIBLE change shipped and not one of the three fingerprints could see it.** Correct rather than broken — the overlays are DOM, outside the canvas, and the render fingerprint drives the drawing code in node where there is no layout engine — but the regression net has a hole exactly the shape of everything the viewer sees AROUND the picture, and a change that moved the brand logo across the minimap would move no fingerprint and fail no guard. `overlayGeometry.test.js` (three wrapper sizes) is the only thing covering any of it. **PROPOSAL, not built**: a fourth fingerprint over `overlayGeometry`'s boxes at fixed wrapper sizes would close it with the same instrument, and needs no browser since the geometry is a pure function. Tests +1 file, 0 deleted; no default, no key, no Dev Screen control. verify PASS 6 FAIL 0.

- [SHIP-CONTENDER-ZOOM.md](SHIP-CONTENDER-ZOOM.md) — **the photo finish frames everyone still
  abreast** (2026-08-14, merge `0bd07dba`, tags `v-ship-contender-zoom` + `pre/ship-contender-zoom`).
  The owner judged a production build on 2026-08-14, on ice-track seed 9 and river-run seed 2814, and
  accepted it. **CAMERA `d7a8fe54072df6d7` → `ff2bc42af377b5cf` and RENDER `d1c9d5d0da6a964f` →
  `0d5854a652c69d87` minted; WORLD run and unmoved.** Every value matched the expectation before
  minting. The framed set stops being `ordered.slice(0, 2)`; **detection and duration did NOT change**,
  and that separation is load-bearing — letting the framed set end the shot stretched the photo finish
  by 85% and produced 59 empty frames. **The corridor cap ships as one feature with the set**, priced
  apart at zero cost. Carries five diagnosis reports, three recording attributions of mine that
  measurement overturned; the reusable one is that **`_binding` named the argmin over `_ceilings`
  while the cap was applied afterwards**, which produced three wrong causes and two no-op builds.

- [SHIP-FINISH-BAND.md](SHIP-FINISH-BAND.md) — **the finish line is a line, not a hair, and it goes
  to master** (2026-08-13, merge `354859bc`, tags `v-ship-finish-band` + `pre/ship-finish-band`). The
  owner judged a production build of `de957c2b` on 2026-08-13, on dirt-oval and garden-path, and
  accepted it. Carries what only the ship can: **the branch was 26 commits behind** — cut off
  `e1f53781`, before the run-in, the ending picture and the corridor work — so it was forward-merged
  FIRST and the band **re-measured on the merged tree** rather than argued from the diff, because its
  sizes are screen sizes converted through a zoom that the camera work had moved underneath it. **The
  band's depth is identical on all ten tracks at all three shots before and after**; what moved is
  the SHOT (garden-path's tightest endgame zoom 5.17 → 4.98), and the band measured the same 30.0 px
  in it either way — the screen-size design proving itself. **RENDER minted `c962df5334277f95` →
  `d1c9d5d0da6a964f`; WORLD and CAMERA RUN IN FULL on the ship tree and byte-identical.**
  FINISH-READABLE-2's own `db98466db3b2bba4` was measured against a base that no longer exists and
  was never minted. verify PASS 12 / FAIL 0.
- [FINISH-READABLE-2.md](FINISH-READABLE-2.md) — **the finish line is a line, not a hair**
  (2026-08-13, `feat/finish-readable`, **NOT merged, nothing minted — he judges it**). He judged
  FINISH-READABLE-1 on production on 2026-08-12 and rejected it as too faint to find, and the cause was the
  BRIEF: he rejected a GANTRY standing over the track, that became "edges only", and the ground band
  was deleted rather than repaired. **A flat marking painted ON the surface covers nobody** — the
  racers drive over it. The band is back across the full corridor, two rows deep, with the posts and
  the gold accent kept. **30 screen px deep against 9**, clamped so it is never deeper than half the
  road is wide (which binds only on the four narrow closed tracks, 13.4–22.9 px at the widest
  overview); label 20 px against 13. Painted area at the mid-race shot goes from a flat 486 px² at
  every zoom to **15,000–32,000 px², a 31–65× increase**. Real area on **10 of 10** tracks. **Proved
  UNDER the racers** at the tightest endgame zoom by wrapping `racerType.drawRacer` for an exact
  boundary — two earlier position-based versions of that check were wrong and both accused the band
  falsely. RENDER moves to `db98466db3b2bba4`, CAMERA measured and unmoved, WORLD unreachable.
  New instrument `scripts/finish-band-truth.mjs`.
- [FINISH-READABLE-1.md](FINISH-READABLE-1.md) — **the finish line was drawn and painted nothing**
  (2026-08-12, `feat/finish-readable` off master `e1f53781`, **NOT merged — he judges it**;
  fingerprints measured fresh and **NOT minted**). His screenshot showed the gold FINISH label on
  ice-track with no checkerboard. **THIS CORRECTS AN EARLIER STAGE-A FINDING OF MINE** that the
  closed-track band is "drawn unconditionally" — true, and useless: it is drawn and it **encloses
  ZERO AREA**. Measured off the real frame's draw stream: mean quad area **0.000-0.001 world px²**
  on all five CLOSED tracks where the shape implies 229-369, against 218-262 on all five OPEN ones.
  **THE CAUSE, in one line**: the stripe depth was taken along `angle + PI/2`, which is the direction
  the finish line ALREADY RUNS (the line is `getPosition(0,+w)` minus `getPosition(0,-w)`, the
  across-track perpendicular) — extruding a segment along ITSELF gives a parallelogram with two
  parallel edges and no area. `drawOpenTrackFinishLine` extrudes along the FORWARD direction, which
  is why the open tracks were never affected; the label is drawn separately and was never broken,
  which is exactly what the screenshot shows. **A SECOND ERROR RODE ALONG**: the line was built from
  `getPosition(0, ±1.0)` and that offset scales by `_centerWidth`, which IS the track width — so the
  band spanned TWICE the corridor. The edges are ±0.5. **WHAT IT DRAWS NOW, to his ruling**: a GATE —
  two checkered posts at the corridor EDGES running along the forward direction, the racing surface
  clear between them, and a gold hairline where the line is. **ONE function for both topologies**:
  there were two implementations of one marking and they had drifted far enough for one to be
  painting nothing, so `drawOpenTrackFinishLine` is now a five-line adapter onto the shared gate.
  **AND IT SURVIVES ZOOMING OUT**: every dimension is a SCREEN size converted back through the
  effective zoom, so the checker measures **9.0 px at the widest overview and 9.0 px at the tightest
  shot on all ten tracks**, and the label holds 13 px against the **3.9 px** that made him say it is
  not there. One bound that is not a taste number: a post never exceeds a quarter of the corridor, or
  on searound's 131 px it would reach across. **Tracks showing a band: 5 of 10 -> 10 of 10.**
  **FINGERPRINTS**: world `dc4647be0f55ebdb` and camera `64432e18a7e62188` **both unmoved** — this is
  the drawing layer only, and `engine-reach` confirms none of the diff can reach the engine — render
  `096f2726c45ed853` -> `d24d78450f197495`. Client suite 4018.

- [SHIP-RUNIN-CONVERGE.md](SHIP-RUNIN-CONVERGE.md) — **the run-in and the convergence fix go to
  master** (2026-08-12, merges `d7eca25d` + `eea0acf2`, tags `v-ship-resolve-converge` +
  `v-ship-runin`, return points `pre/ship-resolve-converge` + `pre/ship-runin`). Two merges in one
  session on the owner's authorisation after he judged a production build of the COMBINED tree.
  Carries what only the ship can: the order and why the convergence fix went first (it moves nothing
  on its own, so the run-in's mint is taken on a tree that already contains it while the two moves
  stay separable); the mint, **attributed in two measured parts** — the run-in alone puts CAMERA at
  `988a9b31aaf9768a` and the repair carries it the rest of the way, moving **ice-track alone**;
  **the off-arm promise re-measured ON THE MERGED TREE** rather than carried over, both instruments
  reproducing the predecessor values exactly; the WORLD re-run in full because `engine-reach --check`
  compares the WORKING tree and therefore cannot speak about a committed merge; and the CI run ids.
  Step −1 surfaced a **prettier sweep of 28 script files** riding in an unrelated commit, proven
  inert by formatting master's version of each and comparing byte-for-byte.
- [RUNIN-PACE-1.md](RUNIN-PACE-1.md) — **own key, explained width, and a rate limit that measured
  out** (2026-08-12, `feat/runin-state`, **NOT merged**; fingerprints measured fresh and **NOT
  minted**). **(1) THE KEY IS SPLIT.** The opening ran on `finishOverviewZoomOutDurationMs`, which
  also paces the zoom-out AFTER the crossing — a shot he has already accepted — so one value paced
  two motions at different moments for different reasons and tuning either moved the other.
  **`runInOpenMs`, default 1250 ms** ("between 1 and 1.5 seconds would have been enough"). The
  post-crossing zoom-out was never altered in VALUE — the coupling was a shared SOURCE — so the proof
  is independence: **3000 ms on every track at every pace tested**. Sweep, ten tracks: 1000 ms gives
  line-in 88.8% / first-in-shot 0.9 s / LEAD_CHANGE lag p95 23.14; **1250 ms 86.6% / 1.1 s / 22.17**;
  1500 ms 84.4% / 1.3 s / 21.12; **empty frames 0 at every pace**. Against the previous 3000 ms
  (73.4% / 2.5 s / 10.72) his number buys the line back and pays in the lag tail — the lag is
  proportional to the zoom rate, so that is by construction. **(2) THE 28 POINTS ON ICE-TRACK, and it
  is NOT the line.** `resolveCamera` is the last authority on width, only ever LOOSENS, and was the
  one width request nothing could see; it is now on a read-only probe. Frame by frame it reads
  **line asks 68-87% of the world, resolveCamera delivers 100%**, with `wasZoomAdapted` true and
  **`targetInInnerFrame` FALSE on every one of those frames** — it steps the zoom down 10% at a time
  trying to bring the pan target inside `innerFramePct`, the world-bounds clamp makes that
  impossible, and the loop runs to the projection floor having achieved nothing. **Very probably what
  he has been seeing on that track all along**: pre-existing, and it fires wherever a pan target sits
  near the world edge at a wide shot. **NOT FIXED HERE** — the repair is inside `resolveCamera`, the
  last step for every state on every frame, so it moves both fingerprints with `runInShot: false` and
  breaks the standing off-arm promise; it needs its own block. **(3) THE TIGHTEN-RATE LIMIT WAS BUILT
  AND TAKEN BACK OUT.** The principle held — a ceiling is a LOWER BOUND ON WIDTH, so approaching it
  more slowly from the wide side cannot violate it and `Math.min` survives — but it fails a
  requirement standing beside it: **a rate limit IS a delay in arriving, and the crossing is where
  arrival is due.** Measured (corner reversal / crossing zoom vs OFF, worst of ten tracks): no limit
  **221 px / 3.58%**; the rate derivable from `runInOpenMs` **192 px / 23.83%** (barely moves the
  corner, peak still at s≈0.95); half that rate **96 px / 55.30%**; paced to arrive at the line
  **96 px / 7.91%** — the near-miss, which needs no constant and genuinely flattens the corner (rate
  through it 1.04/0.85/0.66/0.73/0.61 %/frame instead of 1.24/1.37/1.48/0.12/0.01, subject almost
  still) but lands at cam.zoom 3.77 where the ordinary shot is 4.00. **Reported, not forced**; one
  paragraph in `_setTargets` records the study so it is not rebuilt. **ALL TEN TRACKS at 1250 ms**:
  line in frame **9.8% -> 86.6%**, **0 empty**, `check-runin-frame` green both halves (0.15 / 0.94 TW,
  limit untouched), crossing zoom <=0.74% on nine tracks and 3.58% at worst. **FINGERPRINTS**: world
  `dc4647be0f55ebdb` **unmoved**; camera `64432e18a7e62188` -> `988a9b31aaf9768a`, render
  `096f2726c45ed853` -> `c962df5334277f95`; with `runInShot: false` all three return exactly.
- [RUNIN-WIDTH-1.md](RUNIN-WIDTH-1.md) — **only the line decides the width, and the pull-out is
  calmer** (2026-08-12, `feat/runin-state`, **NOT merged**; fingerprints measured fresh and **NOT
  minted**). **A REQUIREMENT I INVENTED, STRUCK**: RUNIN-GLIDE-1 §5 reported field coverage as "the
  limit"; the owner never asked that the field stay in frame during the endgame, so it bounds nothing
  and is now information only. **WHAT DRIVES THE WIDTH, measured before anything changed: the LINE
  binds at the widest frame of every finishing track**, and over the whole run-in it binds 86.5-97.9%
  of frames. **The field guarantee is `Infinity` on every one of those frames** — it retires after the
  ceremony — and the company guarantee never binds there either, so there was no field-guarantee
  decision to make and nothing to remove. Two tracks are informative: **city-circuit's line would need
  109% of the world** (more than the camera can show, so it is at the floor and the line still cannot
  be framed), and **ice-track's needed 72% while 100% was delivered** — the owner's own observation,
  and §2 says why. **THE TWO ODD MOVEMENTS ARE ONE MECHANISM**: the delivered zoom is a `Math.min`
  over ceilings, so where the ARGMIN changes the zoom is continuous but **its RATE is not**, and the
  pan lag is proportional to that rate — so the subject REVERSES DIRECTION at the corner. Traced
  frame by frame: on **luger-hill seed 9** the framing subject drifts to (899, 490) and sails back to
  (695, 346), turning at progress **0.9949**, the exact frame the line ceiling passes the state zoom
  (4.114 > 4.000) and the zoom's rate collapses from +0.05 to +0.001 per frame; on **ice-track** the
  camera sits at `minCamZoom` for ~2 s with the pan held completely still by the world-bounds clamp —
  **the line's screen position does not move by one pixel for 120 frames** — and then un-pins at
  run-in progress **0.216**, frozen to moving in a single frame. **A CALMER PULL-OUT**: the engagement
  glide now runs on **`finishOverviewZoomOutDurationMs`**, which already means "an authored zoom-out
  at the end of the race" — the same kind of move at the other end of the ending — rather than
  `glideDurationMs`, whose 300-900 ms band paces a CUT and cannot express "unhurried". No new number.
  **Opening 0.5 s -> 2.9 s**; it costs the line's in-frame share **93.3% -> 73.4%** and delays the
  line 0.4 s -> 2.5 s, and it **does not reintroduce empty frames**. It is also SHALLOWER, which was
  not the goal but answers part of (c): the widest frame falls on six of nine finishing tracks
  (searound 85% -> 57%, luger-hill 67% -> 40%, river-run 34% -> 21%), while city-circuit and ice-track
  still reach 100% because the line there genuinely needs it. **LEAD_CHANGE's tracking-lag p95 falls
  25.19 -> 10.72 pp** — the hecticness, measured — while PHOTO_FINISH's is unchanged at 29.80, which
  says the remaining tail is at the CLOSE and not the opening. **LEFT OPEN WITH THE EVIDENCE**: that
  closing corner is not fixed, because every way to remove it replaces the `Math.min` over ceilings
  with a blend, which is no longer a guarantee and needs his ruling. **ALL TEN TRACKS**: composes 100%,
  line in frame **9.8% -> 73.4%**, **0 empty frames**, `check-runin-frame` green both halves (0.15 /
  0.37 TW, limit untouched), crossing zoom within 0.03% of OFF on six tracks and 3.58% at worst.
  **FINGERPRINTS**: world `dc4647be0f55ebdb` **unmoved**; camera `64432e18a7e62188` ->
  `8f6ed90ec8a89e25`, render `096f2726c45ed853` -> `3f53bea250d5a4c3`; with `runInShot: false` all
  three return exactly to the stored values.
- [RUNIN-GLIDE-1.md](RUNIN-GLIDE-1.md) — **the run-in glides from wide-and-back to the ordinary
  shot** (2026-08-12, `feat/runin-state`, **NOT merged — his eye on luger-hill seed 9**;
  fingerprints measured fresh and **NOT minted**). The owner's final design and the fourth shape.
  **ONE progress measure — the leader's remaining distance to the line — drives BOTH the anchor
  placement and the zoom**: at engagement he sits BEHIND centre so most of the frame lies toward the
  finish and the line fits at a modest zoom; as he closes he travels back to his ordinary place while
  the shot tightens; at the crossing he is at `leaderForwardFrac` under the state's own zoom, i.e.
  the ordinary shot with **no seam to hand over**. **IT INVENTS NO NUMBER** — the end of the travel is
  the framing table's own answer, the start is that answer MIRRORED about the centre, so
  `leaderForwardFrac` is used twice; a CENTRED state therefore does not move at all (mirroring 0.5
  gives 0.5), which falls out rather than being special-cased and is why the photo finish keeps its
  framing. The measure is taken ALONG THE TRACK, not across the ground, because a progress measure
  must be monotone and the straight-line distance is not — on a closed track the leader can be
  euclidean-near the finish and still most of a lap from it; along the track it is `leaderProgress`,
  the same quantity `endgameThreshold` is written in, so it is 0 exactly at the window and 1 exactly
  at the line. **REMOVED**: the OVERVIEW-width cap and the delayed engagement, so the run-in composes
  from the threshold again and the pull-out is whatever the line requires. **AND ONE GUARD THAT WAS
  HIDING**: `_applyLeaderForwardBias` ended with `if (!(worldBias > 0)) return pos;`, which reads as
  a degenerate-input check and is in fact a ONE-WAY VALVE silently discarding every BACKWARD
  displacement — i.e. the whole of the new placement, which would have made this block a no-op with
  no error anywhere. **THE ENGAGEMENT HAD TO BECOME A GLIDE, and which step forced it was MEASURED
  rather than guessed**: without one, **93 empty frames across ten tracks, every single one at run-in
  progress 0.006-0.016** — the engagement frame and nothing else, where the framing steps in both
  quantities at once (the zoom opens up to 6.5x on space-sprint). With the anchor travel disabled and
  only the zoom step left the count was **95, no better** — so the zoom step is the whole of it and
  **the anchor travel is free**, costing nothing in emptiness while lifting line-in-frame 90.1% ->
  95.3% and bringing the line into shot 0.4 s -> 0.2 s. The fix is the mechanism DEAD-ENDS §M already
  names (_the glide is what makes a big zoom change safe_), started by hand on the same
  `glideDurationMs`, once, guarded by the latch. **MEASURED ON ALL TEN TRACKS**: composes **100%** of
  the endgame window, line in frame **9.8% -> 93.3%**, first in shot **0.4 s** after the window opens
  (about **4 s earlier** than the previous build, which did not engage for 4.4-4.9 s), **0 empty
  frames on every track**. **THE FIELD, measured because the brief asked rather than assumed**: the
  chasing pack is in shot on **94.6%** of run-in frames and first drops below at progress **0.93** —
  and **that loss is the photo finish tightening on the pair, not the anchor placement**, which has
  already arrived by then; racers-on-screen rises 5 -> 19 as the run-in opens and holds in the teens
  through the whole travel. The existing field guarantee neither prevents nor fights it: it retires
  early and does not apply to PAIR states. **COSTS**: the pull-out reaches the whole world on the
  closed tracks whose finish is most of a lap away at the threshold (city-circuit and ice-track 100%,
  dirt-oval 92%; luger-hill 67%, mountainstreet 27%); the crossing zoom is within **0.03%** of OFF on
  six tracks and **3.58%** at worst (space-sprint); and the tracking-lag tails are back
  (LEAD_CHANGE p95 7.15 -> **25.19**) — though **PHOTO_FINISH IMPROVED, 33.59 -> 29.80**, because the
  anchor travel means that shot no longer has to be opened as far to hold the line. **check-runin-frame
  GREEN on both halves both tracks** (0.15 / 1.23 TW, limit untouched). **FINGERPRINTS**: world
  `dc4647be0f55ebdb` **unmoved**; camera `64432e18a7e62188` -> `e9d19cda3e585c70`, render
  `096f2726c45ed853` -> `3ab2918a88337a83` — and with `runInShot: false` **all three return exactly to
  the stored values on all ten tracks**.
- [RUNIN-MINIMAL-1.md](RUNIN-MINIMAL-1.md) — **the pull-out is minimal, and the run-in starts when
  the line fits** (2026-08-12, `feat/runin-state`, **NOT merged — his eye on luger-hill seed 9**;
  fingerprints measured fresh and **NOT minted**). Third and final shape. **STAGE 1 MEASURED BEFORE
  ANYTHING CHANGED, and the answer was where the owner said to look**: against the frame it actually
  delivers the shot was ALREADY nearly minimal (excess 1.12x / 1.18x) — the width was going into
  **WHERE THE CAMERA IS POINTED**. A FORWARD-framed leader sits `leaderForwardFrac` along the frame,
  so only a THIRD of it lay ahead of him toward the line and the shot had to be **3.01x** (Luger
  Hill) / 2.15x (Searound) wider than the leader-to-line distance demands; the margin was a flat
  1.11x and the easing 1.03x, i.e. nothing. **THE FIX IS THE FRAMING RULE'S OWN QUESTION** — _is
  there anything worth seeing ahead of the subject?_ — answered with the run-in's facts: the finish
  is ahead, so the subject is centred while it composes. No new number; 3.01x → 2.00x. **SIX CALL
  SITES read that question and now read one helper, and that was load-bearing rather than tidy**: the
  first cut changed the five `anchorScreenPoint` calls and MISSED THE PAN BIAS ITSELF, so every
  guarantee sized the shot for a centred anchor while the pan still pushed the leader forward — the
  line fell out of frame on a third of the run-in's own frames (67.0%). Both reading the same helper:
  **89.1%**. **A SECOND CORRECTION, from framingRule.js's own rule**: the line was reading
  `COMPANY_FRAME_PCT`, borrowed from the quarry, when the file states that `innerFramePct` is for the
  SUBJECT "and for both geometric guarantees" — at the company margin the shot was minimal to 1.05x,
  so the line sat ON the edge where the tracking lag alone pushed it out. **STAGE 3, HIS RULING,
  BUILT**: the run-in engages only once the line fits WITHOUT opening wider than OVERVIEW's own
  width, and the engagement LATCHES one way because `room / distance` is not perfectly monotone (the
  room depends on the heading, which turns) and a bare comparison would flicker the shot between wide
  and tight. **THE TRADE, 2 tracks x 8 seeds**: the widest frame the run-in reaches falls from
  **99% of the world to 18% / 21%**; the line is in frame on **89.1% / 98.7%** of the run-in's own
  window and 11.9% → **37.3%** / 9.9% → **35.0%** of the whole endgame window (it was 78.2% / 93.1%
  when the run-in composed all of it); it now composes **41.9% / 35.4%** of the endgame and starts
  **4.4 s / 4.9 s** later, at leader progress ~0.973 against the window's 0.900. Excess is
  **1.32x / 1.40x**, which IS the margin (1/0.7) — nothing left to remove. **empty frames 0**.
  **`check-runin-frame` is GREEN on both tracks and both halves** (centre 0.40 / 0.09 TW) and **the
  limit of 2 was never touched** — the Searound failure came from the world-sized frame and resolved
  by itself when the frame stopped being world-sized. **WHAT IT COSTS, one row and it is what to
  watch**: the run-in bounds the photo finish too and holds it a median **2.05x / 2.10x wider** (max
  ~4x) so the line stays in it, mid-shot on the seeds where it engages after the photo finish has
  begun. **The tracking lag re-measurement says the same thing in one number**: the later start gave
  five states BACK to their pre-run-in values to two decimals — LEAD_CHANGE's p95 that the previous
  cut had tripled is 7.10 → 21.81 → **7.15**, COMEBACK_ZOOM's median 13.73 → 3.06 → **13.73** — and
  the entire remaining cost is **PHOTO_FINISH's p95, 16.51 → 33.59 pp**, with its median almost still
  (5.68 → 5.71): a tail, not a steady lag. The crossing zoom is consequently **not** bit-identical
  (1.60e-2 / 1.53e-1, i.e. 0.4% and 0.9%). **FINGERPRINTS**: world `dc4647be0f55ebdb` **unmoved**;
  camera `64432e18a7e62188` → `0f56ded2d786e3b0`, render `096f2726c45ed853` → `7d7af693a766c6c9` —
  and with `runInShot: false` **all three return exactly to the stored values on all ten tracks**.
- [RUNIN-OWNS-1.md](RUNIN-OWNS-1.md) — **the run-in owns the endgame's FRAMING, not its state slot**
  (2026-08-12, `feat/runin-state`, **NOT merged — his eye on luger-hill seed 9**; fingerprints
  measured fresh and **NOT minted**). Continues RUNIN-STATE-1 and **replaces its mechanism** — see
  the CORRECTIONS block above. **THE CHANGE OF SHAPE**: the run-in stops competing for which shot is
  running and READS whichever one is, bounding that shot's zoom. It therefore composes **100.0% of
  the endgame window on both tracks**, against the state shape's 14.9% / 18.5%. It also avoids a
  defect the state shape had not yet been caught on: RaceScreen starts the photo-finish slow motion
  off `hudState`, so a RUN_IN state holding the slot at the line would have **suppressed the slow
  motion outright** — checked in the source before the rework, not after. `CAM_STATE` is six again,
  `GUARANTEE.LINE` is gone, and this block is mostly REMOVAL. **TWO BOUNDS, ONE OF WHICH IS NOT
  CODE**: the LINE (`room / distance` from the anchor's place in the frame — no curve, no ramp, no
  knob) and THE ACTIVE STATE'S OWN ZOOM, which was already the first term of the `Math.min` every
  shot is composed with. So a leader shot closes to the leader zoom and a photo finish to the
  photo-finish zoom, and **nothing is handed over** — as the leader arrives the line's requirement
  passes above the state's setting, stops being the smallest term, and what is left is the shot that
  was always there. **BOTH BOUNDS PROVED TO BE REAL BOUNDS RATHER THAN COMMENTS**: the line binds
  88.6% / 90.5% of the window, the state's own zoom 10.8% / 8.7%. **MEASURED, 2 tracks x 8 seeds**:
  line in frame **11.9% → 78.2%** and **9.9% → 93.1%** over the run-in window (48.0% → 87.1% and
  40.6% → 95.5% on the wider one), against the state shape's 24.8% / 25.6%; **empty frames 0**
  everywhere. **THE ONE REPAIR IT NEEDED** is the one RUNIN-STATE-1's trace bought: `_focusAnchorRacer`
  returns null for group shots, which SKIPS the zoom-about-the-anchor correction — harmless while a
  group shot's zoom is steady, fatal while it is moving, and the run-in moves it inside PHOTO_FINISH.
  Scoped to the run-in deliberately so the OFF arm stays inert. **WHAT IT COST, both reported rather
  than tuned away**: (1) the zoom at the crossing is **no longer bit-identical** — 1.31e-3 and
  1.02e-2, i.e. 0.03% and 0.006% of the zoom — because "close to the photo-finish zoom" and
  "bit-identical at the crossing" are in tension and geometry decides: arriving from further away
  takes longer; the previous 0.00e+0 held only because the run-in was not composing during
  PHOTO_FINISH at all. (2) `check-runin-frame`'s centre half **FAILS on Searound at 2.08 TW against
  its limit of 2, and the limit was NOT raised** — at that frame the camera shows **99% x 99% of the
  world with all 20 racers on screen and the line in frame**, and a world-sized frame CANNOT be
  centred on the spine because the world-bounds clamp centres it on the WORLD, whose centre on an
  oval is the infield. The two requirements are geometrically exclusive at that width; the guard's
  header now carries the finding and the owner decides between "the limit encodes a shot this camera
  never used to make" and "the metric should ask whether the TRACK is in frame, not whether the
  CENTRE is on it". **THE PRICED ALTERNATIVE, since a bound is the obvious next suggestion**: adding
  OVERVIEW's own width as a wide-end bound fixes the reading and costs two thirds of the feature
  (78.2% / 93.1% → 26.2% / 34.0%, worst centre → 0.56 / 0.41 TW). Real trade, priced, his call.
  **ALSO FOR HIS EYE**: the opening move is a **6x–8x zoom-out in about half a second** at the
  threshold, on the tracking lerp rather than a glide, because no state transition happens there.
  **FINGERPRINTS**: world `dc4647be0f55ebdb` **unmoved**; camera `64432e18a7e62188` →
  `e2dbf91851744136`, render `096f2726c45ed853` → `5405d885f0432b0e` — and with `runInShot: false`
  **all three return EXACTLY to the stored values on all ten tracks**, so nothing outside the endgame
  window moves.
- [RUNIN-STATE-1.md](RUNIN-STATE-1.md) — **the run-in becomes a state** (2026-08-12,
  `feat/runin-state` off master `e1f53781`, **NOT merged — his eye on luger-hill seed 9**;
  fingerprints measured fresh and **NOT minted**). The fourth attempt at "keep the finish line in
  frame during the run-in", and the first that is not a zoom CEILING. **STAGE 1, THE TRACE, AND IT
  REVERSED THE PREMISE**: the picture was not pointed at track the racers had not reached, it was
  pointed at track they had **already left**, ~173 world px behind them. **The pan TARGET was correct
  on every empty frame** — the delivered offset trailed it by **535 → 1115 px** while the ceiling
  released the zoom 2.46 → 4.00 over forty frames. Cause: a ceiling that RELEASES delivers its zoom
  change inside the `tracking` phase, where pan and zoom are independent lerps, and
  zoom-about-the-anchor (CAMERA-SIDEJUMP-1) is **skipped when `_focusAnchorRacer` returns null** —
  which it does for PHOTO_FINISH, a group shot. **Proven, not argued: pointing that one correction at
  the framing anchor took 51 empty frames to 0 with the ceiling untouched.** Two corollaries worth
  more than the feature: **the GLIDE is what makes a big zoom change safe** (master does a LARGER
  2.13 → 4.00 at the same seam, in a glide, for free — deferring a zoom change PAST the glide is the
  defect), and **"the centre is near the track" does not mean the camera is pointed at the race** —
  the excursion was ALONG the track, so the centre read 0.62 TW while the frame held zero racers.
  **SHIPPED SHAPE**: `RUN_IN`, anchored on the leader (so the correction is live), guarantee = the
  LINE (a fixed world point, the first guaranteed subject that is not a racer), and **no width of its
  own** — it reads LEADER's, so at the line RUN_IN and LEADER_ZOOM are the identical picture and the
  handover into PHOTO_FINISH is the glide the camera has always made there. The zoom is
  `room / distance` and nothing else: no ramp, no curve, no knob. **TWO BOUNDS BUILT AND BOTH
  REMOVED** — the quarry's field extent (weak at the endgame), then OVERVIEW's width, which pinned
  the ceiling for the first 60% of the shot and cost the design its point (21.1% → 44.9% line-in-frame
  on dropping it); bounding at the projection's minimum measured **identical to no bound**, proving
  `resolveCamera`'s clamp is the real one. **MEASURED, 2 tracks x 8 seeds**: empty frames **0**
  everywhere, centre worst **0.09 / 0.11 TW** against a limit of 2 (the quarry's 2.07 near-miss is
  gone, nothing widened), line-in-frame **11.9% → 24.8%** and **9.9% → 25.6%** over the run-in window
  (**48.0% → 55.6%** and **40.6% → 51.0%** on the brief's wider window, whose OFF arm reproduces its
  47.3% / 41.4% baselines), the middle-third dip **gone** — the profile rises monotonically where OFF
  reads 0.0% for the first two thirds — and **cam.zoom at the crossing bit-identical** (`0.00e+0`, vs
  the ceiling's third of a thousandth). **THE HONEST LIMIT, and it is an owner decision**: the endgame
  lock does **not own the endgame** — it is consulted only when `decideTransition` permits a
  transition, so a shot entered just before the threshold holds its gate across it. **40–48% of the
  window is PHOTO_FINISH** (its pre-line gate) and RUN_IN owned only **14.9% / 18.5%** of the window,
  with **no frames at all in 3 of 8 races on each track**. Where it owns 0% the in-frame share is
  unchanged to the decimal and where it owns 55% the share is 61.4% — an exact correlation, which is
  also the proof the change is confined to the state. Pre-existing, not introduced here; fixing it
  would cut BATTLE and COMEBACK short at the threshold. **FINGERPRINTS**: world `dc4647be0f55ebdb`
  **unmoved**; camera `64432e18a7e62188` → `3a1603d37210dc66`, render `096f2726c45ed853` →
  `bd29a55fd93e2f68` — and **with `runInShot: false` both return EXACTLY to the stored values across
  all ten tracks**, so the off position is the old behaviour rather than an approximation of it.
  `npm run verify` PASS 16 / FAIL 0. The ceiling form is recorded as **DEAD-ENDS §M**; the quarry
  `feat/finish-framed` stays unmerged, and `pointGuarantee` is the only part taken from it.
- [ENDING-PICTURE-1.md](ENDING-PICTURE-1.md) — **the ending gets a picture worth holding**
  (2026-08-12, tag `v-ship-ending-picture`, return point `pre/ship-ending-picture`). Two blocks in
  one ship: the HOLD after the last crossing (`finishHoldAfterLastMs` 0 → 1500, his own podium beat,
  growing the card-free tail 500 → 2000 ms), and the PICTURE it was supposed to hold. The camera's
  transform was replaced by the identity the frame the phase flipped — on an open track that is an
  853×480 window at world (0,0) with **0 of 20 racers in it** — and a full-canvas scrim reading
  "Loading results…" was drawn over the whole ending, both predating the hold by months. The
  director is now consulted through FINISHED (chosen over freezing, because the zoom-out can still
  be in flight at the last crossing) and the splash is retired. New guard renders a real FINISHED
  frame and refuses a full-canvas fill **at the identity transform** — tracking the matrix is what
  stops it flagging the track's own background; proven by sabotage, 1.1 s. RENDER minted
  `c0fd1e8eda539867` → `096f2726c45ed853`, isolated to one file by worktree; WORLD and CAMERA
  unchanged — and **CAMERA's unchanged hash is explicitly not evidence here**, because
  `camera-fingerprint` stops at the last crossing and renders no FINISHED frame at all.
- [FINISH-PAIR-1.md](FINISH-PAIR-1.md) — **the photo finish frames the pair it is actually
  following** (2026-08-11, tag `v-ship-finish-pair`, return point `pre/ship-finish-pair`). The shot
  captured its two contenders once at entry while the framing guaranteed the live top two by `t`,
  re-sorted over the whole field every frame with no finished filter — and finished racers do not
  stop, they coast on a run-out decay, so a later finisher overtakes an earlier one and the
  guaranteed slot walked backwards through the finishing order. Reversals of the picture on the
  owner's race **5 → 2**, Mountainstreet and River Run **4 → 2**, six other measurable tracks
  unchanged. **The expected cost inverted:** the winner is in frame for 100 % of the shot against
  87–91 % before, and on River Run the live pair had lost its OWN contenders off-frame for 93–98 %.
  Hysteresis was measured first over eleven windows and lost — at short windows it is WORSE than the
  defect, and it only matches pinning at a window longer than the shot. CAMERA and RENDER minted,
  WORLD unchanged and both moves attributed by re-measuring master. Two blind spots recorded rather
  than fixed: the shared driver runs a nameless field and no slow motion, and without either the
  defect does not reproduce at all.
- [SHIP-THE-NIGHT.md](SHIP-THE-NIGHT.md) — **the pair loop culls, and the decisive phase starts
  later** (2026-08-10, merge `a4cb669a`, mint `1d575759`, tag `v-ship-the-night`, return point
  `pre/ship-the-night`). Eight branches, one merge commit. **The race costs about 20 % less to
  compute** — a two-axis field bound skips pairs neither avoidance gate could act on, and the WORLD
  fingerprint is byte-identical on all ten per-track values through TWO engine changes, which for a
  cull is the correctness proof rather than a footnote. **The decisive phase now begins at 75 % of
  the leader's run instead of 65 %**, his own choice, so CAMERA and RENDER moved and are minted.
  Also: 259 fallbacks read their default instead of copying it, 41 of 42 fallback disagreements
  proven unfireable, the living-doc audit, and the routing gap that turned master red. **His eye is
  still owed on the 0.75 change**, and the record says so. `phys-bench` could not resolve either
  engine change and the report says so rather than quoting it — its own control reads +9–14 %.
- [SHIP-CONFIG.md](SHIP-CONFIG.md) — **a stored config holds what he CHOSE** (2026-08-09, merge
  `fff64bc9`, tag `v-ship-config`, return point `pre/ship-config`). One strand, 17 files: only what
  differs from the default is stored, plus a one-time prune of what his browser already holds — a
  prune, never a reset. `storage/configDiff.js` is the one home for the rule and imports nothing, so
  the three hull callers cost the engine-reach closure a leaf and no edges. **All four fingerprints
  re-run on master, none moved** — and none of them could see this change, which the report says
  rather than leaving the green to imply otherwise. Acceptance was the world blob and the config
  badge reading `0 race`. No default value changed.

- [SHIP-THREE.md](SHIP-THREE.md) — **the 5, the refusal and the guard** (2026-08-09, merge
  `f1c3d18d`, tag `v-ship-three`, return point `pre/ship-three`). Two strands, one merge, 16 files:
  the owner's `minRacersVisible` 3 → 5 with its two mirrors; `npm run verify` refusing an empty plan;
  and `check-fallback-agreement.mjs`. **WORLD `dc4647be0f55ebdb` UNCHANGED — twenty-eight blocks and
  two ships**; camera and render re-minted for the framing change alone. Camera and render were
  RE-RUN on the combined branch rather than carried over, which is how the maintenance strand was
  shown not to touch the picture: both came back identical to the values measured on
  `feat/min-racers-5` alone. `npm run verify` on master **PASS 7 / FAIL 0 / SKIP 0**, and it needed
  `--base=1ea3a6bb` — **the refusal shipping in this very merge is what printed that command**,
  catching the SHIP-THE-LINE defect on the first occasion it could have recurred. CI green on the
  branch before the merge (R8 exception 1). `check-measured-stamps` fired and was right: the
  tracking lag was RE-MEASURED, not re-stamped (LEADER median 3.91 → 3.77 pp, every frame count
  unchanged) — and it fired for a NEIGHBOURING reason, since the value that moves the measurement is
  not in its `depends=` set. `world-off` deliberately not re-run, with the reason in the record.

- [SHIP-THE-LINE.md](SHIP-THE-LINE.md) — **the picture line goes to master** (2026-08-09, merge
  `c5099b3a`, tag `v-ship-the-line`, return point `pre/ship-the-line`). One merge commit, 254 files:
  race numbers, the label occlusion rule with its two exemptions, the start board through eight
  blocks, the ceremony timings and the countdown repair, the frame-input seam, the verify/hook cost
  work, the camera-doc corrections, the three perf benches and the `isSideFree` cull. **THE RACE DID
  NOT CHANGE AND THE PICTURE DID** — world `dc4647be0f55ebdb` and world-off `854018ee5d3d83e1` both
  UNCHANGED (twenty-five blocks now), camera and render both re-minted. `npm run verify` on master
  **PASS 7 / FAIL 0 / SKIP 0**; CI green BEFORE the merge, not after, because the line touches the
  verify path and R8 exception 1 is not negotiable. **Two findings worth carrying forward**:
  `npm run verify` on master is a NO-OP (it routes on `git diff master...HEAD`, empty when you are
  master — the first run reported `PASS 0 FAIL 0 SKIP 7` with exit code 0), so the full-weight run
  needs `--base=<pre-merge commit>`; and five `feat/*` branches are deliberately NOT in this ship,
  three of them a second open strand off `1fd0b471` whose `feat/verify-routing-1` will conflict in
  `verify.mjs` when it lands.

## The endgame corridor FLOOR (2026-08-13/14) — RESCUED EVIDENCE, mechanism retired

**These four reports are on master and the mechanism they describe is not.** `endgameCorridorFloor`
was built over nine commits on `feat/front-group`, never shipped, and was superseded by
CONTENDER-ZOOM-1; the branch is deleted and the code is archived at the tag `archive/front-group`.
The reports and `scripts/endgame-width-truth.mjs` were brought across on their own because they are
the only record of the question and the only fixed-yardstick instrument for it — see
[docs/DEAD-ENDS.md](../../docs/DEAD-ENDS.md) §N for what died and why. **The harness's floor arms
REFUSE on master rather than running**: a config key the director does not read is inert, so `off` /
`floor` / `extent` / `extent-drawn` would have reported four identical arms under four names.

**Read them knowing the verdict they were building toward is settled**: the corridor is the wrong
quantity in BOTH directions, because it constrains only ACROSS the track while the racers who leave a
finish shot leave ALONG it.

- [FRONT-GROUP-7.md](FRONT-GROUP-7.md) — **the floor was never buying width, and that is why it
  cannot be narrowed** (branch `feat/front-group`; **RETIRED — never merged, nothing minted; code archived at `archive/front-group`**).
  He asked for less empty road on river-run seed 2814, and he was right about the slack: the field
  occupies a median **35.3%** of the corridor through the endgame. The refinement is built behind one
  key and narrows the crossing exactly as asked (river-run 38% -> 53% of the ordinary), **and it
  ships OFF because it cuts racers doing it** — ice-track seed 9 goes 0.0% -> 12.0% cut. **WHY is the
  finding: on ice-track 100% of the racers lost leave ALONG the track, and `corridorGuarantee` only
  constrains ACROSS.** The full-width floor was buying LONGITUDINAL room by accident and paying in
  empty road; any refinement of the width takes that away. The body-padding hypothesis was tested and
  refuted. Predictability is also lost (space-sprint 65/65/65 -> 98/99/77). The lever for a narrower
  ending is a longitudinal bound, which is not built.
- [FRONT-GROUP-3.md](FRONT-GROUP-3.md) — **never tighter than the track is wide** (branch
  `feat/front-group`; **RETIRED — never merged, nothing minted; code archived at `archive/front-group`**). The owner's own solution,
  and it is better than what we built: racers can only spread ACROSS the corridor, so a frame holding
  its full width holds everyone who is level — no group to define, no membership to follow. It is
  `corridorGuarantee` applied in the endgame and nothing else; the diagonal was already handled
  (the perpendicular is projected per axis and compared against the frame's true chord), and body
  overhang is paid by fitting `trackWidth + one body`. **Measured on a fixed yardstick, the floor
  ALONE beats the FRONT-GROUP-2 machinery** — 0.0% vs 10.6% of photo-finish frames with a top-six
  racer not whole on his race, 18.3% vs 27.1% pooled — **so 791 lines came out against 68 added** and
  two keys became one. **The price is reported in both directions and the worst case is NOT less
  extreme (37%, unchanged); what changed is that it is now PREDICTABLE PER TRACK** (searound 93/94/93
  across seeds where the old bound swung 71/47/39). It never binds on a leader, overview or comeback
  shot, so the simplification costs nothing where the camera would rightly have closed in.

- [FRONT-GROUP-2.md](FRONT-GROUP-2.md) — **the front group stays whole** (branch `feat/front-group`;
  **RETIRED — never merged, nothing minted; code archived at `archive/front-group`**). Continues FRONT-GROUP-1 and **corrects its
  headline**: that report counted CENTRES and reported 6.9%, while the owner was looking at a racer
  cut in half — measured with the renderer's own drawn size, the same race had 74 frames with a
  member not whole against 14 fully outside, an undercount of five. Four repairs: the guarantee pads
  by the BODY as the pair guarantee always has; the bound holds until the GROUP is home rather than
  the first of them; the group is whoever is LEVEL with the leader in his own body lengths with **no
  cap** — replacing a 5%-of-a-lap threshold that admitted all twenty racers on eleven of 27 races;
  and membership is **admit-only**, 120 changes against 186 for live re-sorting and structurally
  unable to produce the FINISH-PAIR-1 lurch. **N=1 was wrong and the fixed yardstick showed it** —
  at one body length the mechanism is identical to OFF on his race; N=2 ships. **The price, stated:
  the crossing shot is 70% of the ordinary one pooled, 37% at worst, 78% on his race.**

- [FRONT-GROUP-1.md](FRONT-GROUP-1.md) — **the front group bounds the tightening** (branch
  `feat/front-group` off master; **RETIRED — never merged, nothing minted; code archived at
  `archive/front-group`**). His complaint: with about six racers nearly level, closing to the photo-finish zoom
  loses racers out of the shot. Measured first — the shot loses one of the front group on **31.6% of
  photo-finish frames**, and on one race holds none of the six. **The brief's premise was wrong and
  the code says so**: the company guarantee has not "retired before the ending", it returns Infinity
  on every PAIR-guaranteed state and was never running on those shots at all — an exclusion
  CAMERA-COMPANY-1 §5 gave as an argument, for the case where the field IS strung out, which is not
  his. So the COMPUTATION is reused unchanged and only the policy is new, with **no new number**:
  the group is the leader plus everyone inside the BATTLE closeness arc, capped at the battle
  group's own size. Membership **captured once** — a live definition would have churned 597 times
  across 27 races; the capture churns 0. Result **31.6% → 6.9%**, median the whole group on every
  measurable race, `check-runin-frame` 0 empty frames. **THE COST NEEDS HIS RULING: the crossing
  shot is 25–75% wider**, which contradicts RUNIN-PACE-1's standing "the crossing must be the

## Repository hygiene (2026-08-14)

- [SHIP-CEREMONY-FIX-1.md](SHIP-CEREMONY-FIX-1.md) — **the two traps the last ship walked into, both
  in the ceremony's own procedure** (2026-08-22, SHIPPED, nothing minted — no production file, no
  default, no fingerprint). **TRAP A: CI does not run for a commit that is not the TIP of a push** —
  the old steps pushed the merge and its follow-up together, so the merge SHA never got a run. The
  merge is now ALWAYS pushed alone with its tag and the follow-up comes after CI is green; the
  recovery route is `gh workflow run ci.yml --ref v-ship-<name>`, which resolves to the merge commit
  and nothing else. **TRAP B: a MEASURED stamp cannot carry the ceremony's `PENDING` placeholder** —
  the pattern needs a hex SHA, and **an unmatched stamp was not reported, it was SILENTLY DROPPED
  from the checked set**, taking `CAMERA_DIRECTOR.md` from one stamp to zero and failing in the wrong
  place. A stamp now names the commit that last changed its `depends=` paths, and **the silent drop
  itself is fixed inside the guard that owns stamps (R13)**: an unparseable stamp fails loudly with
  file and line. **Proven both directions and mutation-tested** — removing the fix fails exactly the
  two sabotage tests and leaves the other sixteen green.

- [IP-ADDRESS-ADVISORY-1.md](IP-ADDRESS-ADVISORY-1.md) — **the one finding with a production path,
  closed, and the server gate armed** (2026-08-16). SERVER-AUDIT-1's four highs are gone and **every
  one was a lockfile-only move**: each fixed version already lay inside the range its dependent
  declares, so no dependent was bumped and `server/package.json` is byte-identical. ip-address
  10.2.0 → 10.5.0 (the production path, through express-rate-limit), nanoid 3.3.12 → 3.3.18 and
  postcss 8.5.15 → 8.5.26 on the dev side — **dev flags intact**, which was the precise failure
  `npm install <pkg>` had caused before. nanoid needed checking rather than assuming: its `latest`
  is 6.0.1, outside postcss's `^3.3.12`, so the question was whether the 3.x line carried a fix at
  all (it does). Audit **4 vulnerabilities (1 low, 3 high) → 1 low**; `--report-only` removed, so the
  server gate now BLOCKS like the client one, with the remaining body-parser low printed and never
  blocking by standing policy. Proven by the suite wired in for exactly this: **615/615**, locally
  and on the merge SHA. Also records that **`npm ci` cannot run in `server/` while the dev server is
  up** — better-sqlite3's native binary is held open and it dies on unlink after wiping node_modules.

- [E2E-LOGIN-1.md](E2E-LOGIN-1.md) — **the gate the whole suite died at** (2026-08-16). A Playwright
  `setup` project logs in once and every spec inherits the state through `storageState`, so a new
  spec is authenticated because of where it lives rather than what its author remembered. **17 → 63
  passing, 85 → 40 failing, 10.7 → 7.7 min; not one assertion edited.** The account is CREATED per
  run against an isolated API with its own temp `RA_DATA_DIR` and generated secrets — no credential
  in the repository, none asked for, and the owner's server never touched (the old config reused
  whatever was on 5173, which is why the suite could never authenticate). The 40 remaining failures
  are triaged in clusters and left: **9 of 10 clusters read as stale tests** (a bare `canvas`
  selector that now matches two, Base Speed defaults rebaselined to 0.00096/0.00113, a lap-selector
  locator matching by bare digit, a spec waiting on a track nobody seeds), and **one is a possible
  real defect — Reset-to-Default does not clear the Modified badge**. Runs as NIGHT WORK only:
  `npm run test:e2e`, documented in NIGHT-RUN.md with VERIFY-RULES R12a pointing there.
- [CHECK-AUDIT-1.md](CHECK-AUDIT-1.md) — **an independent audit of every check this repository runs,
  by Copilot** (2026-08-15). Read-only: no check, test or config was changed. Counts **29 distinct
  checks** and gives each one a defect class, a can-it-fail answer, git-history catch evidence, a
  measured cost and a what-if-removed. **Committed as written and not edited** — it is another
  author's record and the journal is append-only, so its numbers stand as taken on the day. Its
  three headline findings drove two blocks: the uninvoked server and e2e suites (acted on in
  [WIRE-SUITES-1](WIRE-SUITES-1.md)), `check-doc-links`' declaration not matching its runtime scope
  (fixed there too), and `.github/workflows/deploy.yml` reading as live while documented as dormant
  (still open).

- [WIRE-SUITES-1.md](WIRE-SUITES-1.md) — **the two suites that ran nowhere: one wired, one found
  dead** (2026-08-16). CHECK-AUDIT-1 found 19 server test files and 7 e2e spec files that no invoker
  ran. **Both were run BEFORE anything was wired.** The server suite is **615/615 green in 41.8 s**
  and is now a CI job plus a `SUITE_GUARDS` declaration, so a change under `server/` selects it —
  **not** the hook, because 42 s against a ~5 s hook that has no routing would be paid by every
  commit. The e2e suite is **85 of 102 FAILED in 10.7 min** and is deliberately NOT wired: every
  failure is a 30 s timeout because `ProtectedRoute` landed 2026-06-14 and **no spec logs in** — the
  suite has been dead for two months and nothing said so, because nothing ran it. No test was edited.
  Also adds **R13** (a new truth gets a rule inside an existing guard, not a new guard script — with
  the three deliberately-unmerged document guards as the counter-example, and no guard for the rule
  itself), and two true-again fixes: `check-doc-links` claimed to cover reports it never scans (its
  `dirs` correctly stay, because 88 living-doc links point INTO reports), and `package.json` still
  credited Husky.

- [HOOK-TRACKED-1.md](HOOK-TRACKED-1.md) — **the hooks live in the repository, and it shows when they
  do not run** (2026-08-15). HOOK-SILENT-1 found that `core.hooksPath` was a RELATIVE path into an
  UNTRACKED directory, so a fresh worktree or clone enforced nothing, silently, exit 0. The hooks now
  live in the tracked `.githooks/` and one command — `npm run hooks:install`, also run by `prepare` —
  puts them in effect. **The hook body is byte-identical to the old one**; only where it lives moved.
  Two machine findings: `core.hooksPath` is SHARED across worktrees here (so tracking alone is enough
  for worktrees; only a clone needs the command), and **`core.filemode` is false on this machine**, so
  the old hook was tracked `100644` and would have been DEAD on Linux — the bit is now set in the
  INDEX. Proven in a throwaway CLONE, not a worktree: the silent bypass reproduced, the guard caught
  it, a violating commit REJECTED and a clean one passed, and `.git/worktrees` stayed at 46. husky is
  removed entirely so no untracked second copy can drift. One home: VERIFY-RULES R12.

- [DOC-AUDIT-1.md](DOC-AUDIT-1.md) — **THE RECORD AGAINST THE SOURCE, AND A FINGERPRINT THAT IS NOT REPRODUCIBLE** (branch `docs/audit-1` off `a0970310`). **THE FINDING IT WAS NOT LOOKING FOR OUTRANKS THE REST: `scripts/lib/raceDriver.mjs` loads tracks from `server/data/tracks` IF IT EXISTS and falls back to the committed `server/seeds/tracks` — and `server/data/**` is GITIGNORED.** All ten live tracks differ from their seeds, so the WORLD fingerprint measures **`0829fc6c5b3f7e7f`** in the owner's own tree and **`dc4647be0f55ebdb`** — the record — in any fresh worktree or clone. Every ship measurement taken in `C:/ra-n1` used the seeds and matched; the same commit in the main tree does not. **No guard catches it**: `fingerprint-containment` checks whether the RECORD is self-consistent and never runs the engine, and the world-fingerprint task prints its value without comparing it. **Nothing minted, nothing in fingerprints.json touched** — which set is canonical is an owner decision (seeds are reproducible, live data is what he actually races). **DOCUMENTS: GLOSSARY corrected** (`pair guarantee` said "two named contenders" when the shipped framing is a SET of 2–4; added `contender guarantee`, `contender set`, and `corridor CAP`, the last being the opposite sense of a word already in the file). **CAMERA_DIRECTOR corrected** — the corridor CAP is default ON and moved both fingerprints and appeared NOWHERE in the camera's own document; added with the contender rule (both conditions, no new number), capture-once, the arrival over `corridorCapArriveMs`, who wins on conflict, and the `_binding` probe defect that cost three reports. **VERIFY-RULES corrected**: it named `goldenEquality.test.js` at 46% of suite time, and re-measurement makes `goldenRealArm.test.js` the winner twice over — **52.8 s vs 25.3 s** alone, **152 s vs 36–76 s** contended — so anyone acting on that line optimised the wrong file; NOT stamped, deliberately, because a timing claim depends on `client/src/` as a whole. **ENDING-PHASES phase 6 FLAGGED, NOT corrected**: two unstamped numbers, and the load-bearing one ("the zoom-out starts ~1.4 s before the field is home") is contradicted by a separate measurement of 4.4–5.9 s and by the zoom-out's own duration — correcting it requires an instrument that does not exist, so it is marked UNVERIFIED rather than guessed at. **KEYS: `contenderZoom` was the worst gap** — ships ON, gates the framed set AND the lane cap, and had no Dev Screen control and no prose anywhere; a toggle is added beside the arrival slider. **GERMAN PROSE REMOVED** from `sim-fairness.mjs` (7 lines) and `sim/observers/report.mjs` (36 strings); **`sollBereich` was NOT renamed and that is a data contract, not timidity** — it is written into `fairness-data.json` in eleven directories and read by five scripts, so it needs a migration. **TAG SWEEP 115 → 99**: 16 of 19 `pre/ship-*` verified derivable as `v-ship-X^1` and deleted, **three kept for three different structural reasons** (tag cut on the feature branch; a register commit landing between tag and merge; a ship with no merge commit at all). `archive/*` verified load-bearing rather than assumed — **16 of 19 are unreachable from master, 3 are record-only**. Correction to the premise: the three families cover 57 of 115 tags, not all; the other 58 were left untouched.

- [STAMP-TRAP-1.md](STAMP-TRAP-1.md) — **THE STAMP GUARD ANSWERS ABOUT THE COMMIT BEING MADE — AND NO HOOK HAS EVER RUN IN A WORKTREE** (branch `guard/stamp-trap` off `a059c38b`). **THREE findings, and only the first was on the list — the other two were found while trying to prove it.** (1) `check-measured-stamps` reads git HISTORY, so against uncommitted work it prints PENDING — a REPORT, correct ad hoc because failing there would make it un-runnable mid-edit, and **exactly wrong at commit time**: change the camera, run verify (PENDING, GREEN), commit, and the stamp is stale from that instant. That put master red twice on CONTENDER-ZOOM's ship day. The header warned about the path in prose; **prose is not a guard**. `--staged` asks at the only moment the answer exists. It CANNOT validate the new SHA — that names the commit being made — but it CAN see whether **the stamp's own MEASURED line is staged too**, which is a real signal and not satisfied by accident. Dependency+stamp staged → pass; dependency alone → **FAIL exit 1**; ordinary mode unchanged. **4 tests added** against a TEMPORARY repository, because the mode reasons about the INDEX and testing it here would stage files in the real repo — the concurrency collision that test file's own header already records from its first version. One error recorded: the re-stamp case first used an invented SHA, which `--staged` passed and the freshness check underneath then failed, so **the test was red for a reason unrelated to what it tested**. (2) **THE HOOK WAS NOT RUNNING AT ALL.** `core.hooksPath = .husky/_`, which is UNTRACKED and generated by `npm install` → `prepare: husky`; a `git worktree add` tree gets the tracked `.husky/pre-commit` and never gets `.husky/_`, so git finds no hooks and **runs none, silently**. Every commit from `C:/ra-n1` or `C:/ra-n2` has bypassed all seven fast guards without a word — including tonight's, before this point. **Same shape as [BUILD-PILL-WORKTREE](BUILD-PILL-WORKTREE.md), same day, same cause**: correct in a main tree, silently absent in a linked worktree, while **R10 instructs us to work in a worktree**. Two safety mechanisms disabled by following the process correctly, neither saying so. The shims were copied in, which is **a repair to one machine, not a fix** — the next worktree has the same hole; the fix is proposed and NOT built. Also found: `client/node_modules/.bin` was EMPTY here (81 shims missing), which is why `prettier` and `lint-staged` reported "command not found" while `npx` still worked; `npm rebuild` restored them, and until it did verify's format step failed outright. **(3) AND THEN THE HOOK BLOCKED WITHOUT SAYING WHY.** Husky runs the script as `sh -e`; the guard loop did `eval "wait $pid"` as a BARE command and then tested `$?`, so under -e the shell aborted at the first failing wait — **before the replay that prints the guard's output and before the COMMIT BLOCKED line**. The hook's entire diagnostic half could never fire; it has been correct and mute for as long as it has existed. Fixed by making `wait` the condition, which -e exempts. **That is THREE mechanisms in one night whose diagnostic half was structurally unable to speak** — the build pill, the hooks that never ran, and this — each correct about WHETHER something was wrong and silent about WHAT. **END-TO-END PROOF after all three repairs: a real `git commit` through the real hook, refused, naming the guard and the reason (GUARDS: PASS 6 FAIL 1, COMMIT BLOCKED).** No default, no fingerprint, nothing minted.

- [BRANCH-CLEANUP-1.md](BRANCH-CLEANUP-1.md) — **THE EVIDENCE MOVED FIRST, AND THE BRANCHES WENT AFTER** (branch `docs/rescue-front-group` off `b2176dc7`). Out of `feat/front-group`: the four FRONT-GROUP reports, `scripts/endgame-width-truth.mjs` (502 lines, the only fixed-yardstick endgame-width instrument), and [DEAD-ENDS.md](../../docs/DEAD-ENDS.md) §N. The corridor-floor CODE did NOT come — it is at the tag `archive/front-group`. **THE HARNESS NEEDED A CHANGE TO BE HONEST HERE, and it is the important part**: its four arms were driven by `endgameCorridorFloor` / `endgameFloorBindsExtent`, and neither key nor the method they drove exists on master (checked, not assumed). **A config key the director does not read is INERT**, so all four arms would have run and returned the SAME numbers, silently, under four names — an instrument that reports agreement because it changed nothing is worse than one that is missing. The floor arms now REFUSE with exit 2 and name where the mechanism went; the three measurements that never depended on it survive and were re-run on master (river-run 2814: extent **50.0%** of the corridor, the diagonal costs **58.8%**, body coverage **79.2%**, a tighter shot would be **1.84×**). The diagnostic monkey-patch is DELETED — on master there is no method for it to re-implement. **`feat/finish-framed` held exactly ONE thing master did not**, found file by file rather than from the branch name: `pointGuarantee`, `check-runin-frame.mjs` (master's copy is the LATER one, added separately at `2a7e1bdf`) and the line-as-run-in-subject are all already here — but **`pointGuarantee` shipped with ZERO test coverage**, and it is the term ZOOM-PACE-2/3 showed BINDS THE ENTIRE ENDGAME. **6 of its 12 tests are now on master**; the 2 asserting the dead key did NOT come and were not re-pointed at something else, which would be inventing a test rather than rescuing one. **SABOTAGE: `pointGuarantee` returning Infinity turns 3 of the 6 red.** On tags-vs-branches the objection was invited and NOT raised: a branch is mutable and anyone can delete it, a registered annotated tag is permanent and keeps the objects reachable. **Caveat stated rather than left implicit: a tag preserves the code, not the ability to RUN it** — `archive/front-group` is nine commits off a master two ships ahead, a record to read rather than a branch to resume. verify PASS 13 FAIL 0, nothing minted.

- [BUILD-PILL-WORKTREE.md](BUILD-PILL-WORKTREE.md) — **THE BADGE CAN SEE A COMMIT MADE IN A WORKTREE** (branch `fix/build-pill-worktree` off `8422a9a4`). The mtime poll watched two paths it CONSTRUCTED — `join(REPO_ROOT, '.git', 'HEAD')` and `.git/index`. In a linked worktree `.git` is a FILE holding a `gitdir:` pointer, so neither exists; `mtimeOf` returned null for both, correctly by its own contract, and the poll compared `null,null` with `null,null` on every tick **forever — it could never fire**. The badge froze at start-up and reported itself CLEAN AND CURRENT while doing it. **Found live, not reasoned:** 5173 served a stale bundle twice in one session, with `dirty:false` and `reason:null` both times — not merely wrong but confident. **This is the failure the file's own header exists to abolish** ("not stale by accident — structurally incapable of being anything else"): BUILD-TRUTH-1 shut it for the main tree and this shape reopened it for worktrees, and since **R10 tells us to work in a worktree whenever a judgement is pending**, the more correctly the process was followed the more certainly the badge lied. **FIX: ask, do not construct** — `git rev-parse --git-path` answers RELATIVELY in a main tree and ABSOLUTELY in a worktree, so the answer is resolved against REPO_ROOT; the fallback when git cannot be asked at all is the old construction, deliberately, since the identity is `unknown` with a reported reason by then. **PROVED LIVE IN A WORKTREE**: dev server started once on the fixed plugin and never restarted, HEAD `b923bba1` → `e43308f0`, **pill followed in 1.2 s** and held. **TESTS +7, −0**, building a REAL repository and a REAL `git worktree add` rather than hand-making a `.git` file, because the defect is about the shape git puts on disk. **L203 is load-bearing rather than decorative here** — a poll over two valid paths is indistinguishable from one over two invalid paths until something moves — so every assertion is paired against the old construction; **SABOTAGE: returning the old construction turns 2 of 7 red**, including the poll case. Harness fix: the child process now carries its stderr instead of discarding it, the same half-an-instrument failure BUILD-UNKNOWN-1 ended, which cost a debugging round here first. No default, no fingerprint, dev-only, **nothing minted**.

- [BRANCH-INVENTORY-1.md](BRANCH-INVENTORY-1.md) — **ONE TRUE CONTENDER BASELINE, AND WHAT EVERY BRANCH IS ACTUALLY HOLDING** (on master, `e590bc9a`, CI green). Two pieces. **(1)** `contender-truth.mjs` carried a SECOND implementation of the contender membership rule — `sameLane`, `nearlyLevel`, `contendersOf` — evaluated on the first frame the callback OBSERVES the photo finish, one world-step after the director captures at the transition. It graded a RECONSTRUCTION, and the project had two pooled figures competing under one name. The reconstruction is **DELETED, not switched off** (the rule's one home is `_abreastContenders`), and the set is read from `_photoFinishContenders` by index. **The baseline moves 3.4% → 8.2% not-whole** over 7468 frames — the old figure understated by **2.4×**. It is deliberately NOT reconciled with EDGE-SLICE-1's 7.6%: that was _sliced_, on the pre-ship tree, from a different instrument, and adjusting one to meet the other would be fitting. **The failure is concentrated** — 15 of 27 races are 0.0% and the whole 8.2% comes from five races led by river-run/9 at **52.9%**. **Two more two-baselines failures found in the same file**: the pooled footprint (ten tracks × seeds `9,2814,5601`) lived only in the usage block, so a no-flag run gave ONE seed under the same name; and the default arm was still the pre-ship `off` after `contenderZoom` shipped true. Both are now the defaults. **Three output labels were untrue** and are corrected, including a totals row still calling the set "the level set — everyone within the entry gate's own threshold", the yardstick this work replaced. The surviving live re-read agrees to the digit (8.2% vs 8.2%) and is **labelled as a cross-check, not a second finding**. No product change. **(2) A full inventory of every branch, worktree and stash, and NOTHING was deleted.** Nine branches at origin besides master, not ten — `feat/contender-zoom` was the tenth and went when it shipped. **Four are fully contained** in master and exist only because nobody deleted them after the merge (`feat/runin-state`, `fix/camera-ending-window`, `fix/resolve-converge`, `guard/stamps-complete`), as does the local-only `docs/close-german-exception`. **`feat/frame-gap-2` is wholly contained in `feat/frame-gap-3`**, so the pair is one line of work; `-3` is documentation only and is the one branch that could merge with nothing to judge. **`feat/front-group`'s CODE is superseded** (CONTENDER-ZOOM-1 §0) **but its four reports and its 502-line `endgame-width-truth.mjs` are not on master** — deleting the branch would take the only fixed-yardstick endgame-width instrument with it. **`feat/finish-framed` declares itself red in its own head commit** (51 empty frames on luger-hill seed 9) and is superseded by the merged `feat/runin-state` — but **its guard reached master separately** at `2a7e1bdf`, and master's copy differs from the branch's. **The main OneDrive tree is checked out at `feat/front-group`, not master**, which is both a surprise and the reason that branch cannot be deleted without detaching. No stashes. **AND ONE FOUND WHILE READING THE STAMPS, live rather than reasoned: the build pill CANNOT see a commit made in a WORKTREE.** `vite-plugin-ra-build.js` polls `join(REPO_ROOT, '.git', 'HEAD')` and `.git/index`; in a linked worktree `.git` is a FILE, so both paths do not exist, `mtimeOf` returns `null` by its own correct contract, and the poll compares `null,null` to `null,null` forever — **it can never fire**. 5173 was serving a bundle four commits stale and reporting itself clean and current. This is the exact failure BUILD-TRUTH-1 was written to abolish ("structurally incapable of being anything else"), fixed for the main tree and reintroduced for worktrees — and **R10 tells us to use a worktree**, so the more correctly the process is followed the more certainly the badge lies. Any eye-test served from 5173 in `C:/ra-n1` or `C:/ra-n2` after a commit, without a dev-server restart, was judged against a bundle whose badge could not have known it was stale. Fix is one line and NOT built (outside what was authorised): `git rev-parse --git-path HEAD` answers correctly in both tree shapes. **PROPOSALS**: fix the build pill's worktree blindness FIRST; merge `feat/frame-gap-3` as-is; rescue the front-group reports and harness to master independently of the branch's fate; make the pre-commit hook run `check-measured-stamps` against the STAGED tree, since its PENDING line is a report rather than a failure and that is exactly what cost master two red CI runs on ship day; point the main tree at master.

## CI / dependency hygiene (2026-08-04)

- [ONE-TRUTH-1.md](../night/ONE-TRUTH-1.md) — **ONE FACT, ONE HOME** (branch `feat/one-truth-1`, PR #130, stacked on the unmerged `feat/night-tools-1`). The three fingerprints were typed independently in **eleven places across seven files**, connected by nothing, and had already drifted — SHIP-CEREMONY carried a stale camera baseline until somebody happened to look. **`docs/fingerprints.json` is now the single record** (value, mint commit, date, reproduce command) and **19 sites are written by `check-fingerprints.mjs --fix` and checked by it**, in THREE directions: record→doc, doc→record (a reworded anchor FAILS rather than silently checking nothing), and COVERAGE (a new undeclared copy FAILS). **A fourth direction was built and DISCARDED as unsound** — living docs legitimately state old values as ablation targets and narrative, so a superseded-value scan would have to allowlist the two files that matter most, which is a guard that checks nothing. **Canonical claim resolved** between four documents that implied it. **All three fingerprints byte-identical** (world `dc4647be0f55ebdb`, camera `00cafa2432add0f7`, render `1f83ecc1fcb6fa9a`), each RE-RUN rather than recalled; closure still 19 files, hull script untouched. **THE EVIDENCE RUN (20 full suites, 10 alone + 10 contended) ANSWERS THE ESCALATION QUESTION: NO** — all **113** attempt-failures were class `timeout`, **not one assertion**, so no result moved. Its real finding: **the suite was failing 3 runs in 10 with the machine to itself**, absorbed by a pre-existing `retry: 3` and invisible until this branch’s ledger. Two tests fixed with MEASURED budgets (git-spawning build-identity ~13 s under load, ten-race sim test) → **179 files / 3646 tests / ZERO retries, the first clean-first-attempt run**. **SIM.md gains a GENERATED table of the 19 files that can change the race**, each purpose taken from the FILE’S OWN header, one left **UNKNOWN** verbatim because a plausible invented sentence is indistinguishable from a fact. **CAMERA_DIRECTOR gains four runnable commands, all actually run** — and the **tracking-lag figures had drifted so far the reading REVERSES**: OVERVIEW is now the TIGHTEST state (3.08 pp), not the loosest, after two camera changes the prose never followed. **CANVAS_H_REF NOT collapsed and the reason is structural** — `autoSpriteScale.js` is inside the engine-reach hull, so importing from `camera/` would grow the closure and breach the one-way rule; kept and GUARDED instead. **11 sabotages, 5 against the real repository.** Tests +27, replaced 1 (`expect(LIGHT_SPACING_PX).toBe(30)` — nothing would break if deleted, it protected only itself), deleted 0 — **and two of my own tests had that same defect and were caught by it**. **NOT DONE, listed**: three e2e tests re-implement the zoom formula and assert their own arithmetic (would pass with `zoomUnit.js` deleted) — constants collapsed, deletion left as the owner’s call; two sections numbered 7; `reports/night/` is outside every guard. **PROPOSALS**: establish or retire `world-off` (the one value in the record no command reproduces); index `reports/night/`; a `--why` map of where each value is stated; a timeout-headroom report to find the next flake before it turns a suite red.

- [VERIFY-FAST-1.md](VERIFY-FAST-1.md) — **ONE COMMAND, CONCURRENT, AND THE MERGE STOPS WAITING ON CI** (branch `feat/verify-fast-1`, **stacked on the unmerged `feat/verify-cost-1`** because §1 and §6 both need `engine-reach`; PR #127's baselines untouched). **`npm run verify` reads the DIFF and picks its own work**, printing what it chose AND **what it skipped with a reason for each** — that symmetry is the design constraint, because a verifier that silently does less is indistinguishable from one that is broken, the exact failure this project has paid for twice. Routing to the world fingerprint goes through engine-reach's computed closure, so a camera diff is TOLD the race cannot see it instead of paying two minutes to prove it. **NUMBERS**: a typical camera block **247 s -> ~226 s and measured ONCE**; the six-guard probe **471 s sequential -> 282 s (1.7x)**; a docs-only block **~7 s**. **All hashes byte-identical** (world `dc4647be0f55ebdb`, render `73ba53ba9fea12c7`, camera `ab731df15724ab5d`); script suite 142/142. **THE CONCURRENCY FINDING, treated as a finding rather than a retry**: the first full concurrent run was 341 s and **RED** — `sim-fairness.test.js` carries a 5 s timeout and four CPU-saturating siblings pushed it past it. The client suite now runs **EXCLUSIVE** and everything else overlaps after it: 282 s, green. **§2's premise held only partly and the measurement is worth having** — the wall clock did NOT become "the slowest single guard": under contention render goes 15 s -> 69 s, camera 47 s -> 101 s, world 113 s -> 125 s, so the win comes from overlap, not free parallelism. **§3 format-then-measure-then-commit, enforced by verify itself** — removes an entire measuring pass, because the hook reformatted AFTER each block measured, so every measurement described a tree that was never committed (behaviour sets a fingerprint, not formatting, so the second pass never changed a number — it only cost the time). **§4 merge on a green LOCAL verify**, R8 with both exceptions (a change touching CI/the guards/the verify path is marking its own homework; and immediately before an unattended night block) plus **R9: do not walk away before the notification is seen** — written with its reason, since R8's entire safety argument is "he is notified within minutes", which is a claim about a human being present. The ceremony now states what the ordering does NOT catch: a different environment, time-dependent checks like the security gate, and coverage. **§6 both adopted**: every guard prints its own elapsed time so the cost column cannot go stale, and `engine-reach --check` is in the pre-commit hook where it **prints, never blocks**. **§5 THE FLOOR, DIAGNOSED AND CLOSED**: `goldenEquality.test.js` is **14 tests / 107.8 s**, and the time goes **entirely into running ~25 races** — the four non-race assertions cost **0.0 s**, which is the measurement that rules out repeated setup. n=40 real-arm cases are 41%, negative controls 18%, n=20 goldens 24%. **Verdict: it is doing exactly what it must; do not shrink it.** One observation recorded so the question stays closed rather than re-opened: a negative control repeats a race another test already ran, worth 7-13 s of 108, which is not a trade worth making in a test whose value is that it is dumb and direct. **Floor after this block = 156 s client suite (~108 s of it this one file) + the slowest remaining guard.** **TESTS: added 8, deleted 0, merged 0**, all asserting routing PROPERTIES rather than reason wording — and **they found a real bug on their first run**: `verify.mjs` executed its main block on import, so only one test ever reported. **PROPOSALS**: (P1) `retry: 3` absorbed the contention failure and is now the mute-instrument shape again — keep it but print which tests needed a retry, since a suite that retried three times is not the same artefact as one that passed outright; (P2) `--since-last-verify` would make the second and third verify of a block near-free, not built because a stale marker would silently under-verify and needs a proper fallback; (P3) the ceremony's cost column should be GENERATED from the guards' own elapsed times, not typed — §6 fixed the source of truth but not the copy.

- [VERIFY-COST-1.md](VERIFY-COST-1.md) — **THE VERIFICATION LOOP COSTS LESS, AND THE STANDING RULES HAVE A HOME** (branch `feat/verify-cost-1`, base master `e2ad9cfd`; PR #127 untouched and none of its fingerprints moved). Scripts/config/docs only — **no camera or render fingerprint was run, deliberately**: nothing drawn or decided changed, so neither had a question to answer. **A — THE SPEC'S OWN PROPOSAL WAS REFUTED BY MEASUREMENT**: triggering the mint tripwire on `ENGINE_INPUT_MODULES` would have been UNSAFE, because that list is `raceCore.js`'s **direct** imports (11 files) while the transitive closure is **19**, and the eight in the gap include **`autoSpriteScale.js` — the precise file the tripwire was created for** — and `storage/defaults.js`, the file whose slider bound fired it last time. So the proposed trigger would have stopped catching the incident that produced the rule. **Delivered better than either option offered**, and only because there are **ZERO dynamic imports** in the closure so a static walk sees every edge: new `scripts/engine-reach.mjs` computes it from source — **19 files against the 103** the folder rule fired on, _complete_ rather than merely smaller, with `--check <paths>` answering the ceremony's question directly. **Sabotage not reading** (+6 tests): a new import must make the closure GROW, a two-hop transitive import must be followed, presentation code must stay out, and the dynamic-import detector is shown able to fire. Script suite **121 -> 142**. The rule text now states what it does NOT catch — values passed INTO the engine as arguments (`drawnBodyWidthRefPx`), dynamic imports, seed/track JSON. **B — the world fingerprint runs its ten tracks in PARALLEL: `dc4647be0f55ebdb` byte-identical, 195 s -> 113 s (-82 s, 42%)**, safe structurally rather than hopefully (each track was already an isolated child process with its own out-dir and fixed seed; the combining loop still walks TRACKS in fixed order, so completion order cannot reach the hash). **Only 1.7x not 10x, and the reason is the finding**: wall clock is now the SLOWEST SINGLE TRACK, so the next gain is making garden-path cheaper, not adding workers. **Camera 47 s / render 15 s measured and NOT parallelised** — ~26 s of saving sitting on top of the two baselines PR #127 waits on, against a spec forbidding touching them; worth doing once #127 lands. Both numbers also correct the ceremony's stale "~85 s / ~30 s". **C — THE PREMISE WAS FALSE AND THAT IS THE FINDING**: coverage never ran locally at all. `npm test` is plain `vitest run`; the `coverage:` block is configuration for when coverage is ASKED for, not an enable; CI already runs `test:coverage`. **The split the spec asked me to create already existed**, so nothing was changed and the record was corrected. Both timings measured: **plain 185 s, coverage 343 s** (+158 s, 1.85x) — coverage does cost what was assumed, it simply was not being paid on the inner loop. **D — `docs/VERIFY-RULES.md`**, seven rules with a reason each (world-fingerprint trigger, before-only-when-relative, measure-at-the-end, two-tracks-not-ten, eye-vs-harness, report-vs-commits, ask-before-writing-a-test) plus the instrument cost table, **with one disagreement stated rather than quietly ignored**: the derivation belongs in the commits, EXCEPT that a refuted hypothesis belongs in the report when it would otherwise be retried. **E — added 6, deleted 0, merged 0**, said plainly rather than performing restraint; the restraint is in the SHAPE (six property tests, not nineteen naming the closure's members, which would fail on every honest refactor). **PROPOSALS**: (P1, the spec's) **the most expensive thing remaining is ONE TEST FILE** — across 179 files the slowest ten are **85%** of summed file time and **`goldenEquality.test.js` alone is 176.5 s, 46% of the suite**, with `replay.test.js` a further 14%; not touched, because both are behaviour-identity tests and shrinking them is the two-truths trap — the honest next step is finding out WHY it costs 176 s; (P2) the ceremony's cost column was wrong in both directions and nothing checks it — have each fingerprint print its own elapsed time so the column is self-maintaining; (P3) put `engine-reach --check` in the pre-commit hook so the rule arrives at the moment it applies, not on a busy day's reading.
- [CI-AUDIT-GREEN-1.md](CI-AUDIT-GREEN-1.md) — **THE PIN THAT BLOCKED ITS OWN REPAIR.** Master's CI went red with **no commit causing it**: two HIGH advisories published upstream and the [HYGIENE-1](HYGIENE-1.md) audit gate reacted. Everything else was green and independently re-confirmed (doc-links 319/52, index, tags 63, script tests 121/121, ESLint, Prettier). **ROOT CAUSE, and it is the lesson**: `client/package.json` pinned `brace-expansion` at the **exact** `5.0.8` — itself the mitigation for CVE-2026-14257 — and the new advisory is titled _"bypassing the CVE-2026-14257 mitigation"_, so **the fix from last time is what blocked the fix this time**; an exact override is a ceiling as well as a floor and `npm audit fix` cannot move it. Two commits: `5b23bf93` undici 7.28.0→7.29.0 (**lockfile only, 3 lines**, no `--force`; also cleared the four MODERATE undici advisories, so the gate's advisory section is now empty) and `028f1eb6` the overrides. **BOTH PINS RELAXED TO RANGES, decided from the history not from taste**: `4a4bcf31`'s own message records the only reason for exactness — 5.0.8 was _"the advisory's only patched version"_, **a timestamp, not a compatibility constraint** — while the very same commit gave `postcss` a caret for identical reasoning, so the file already argued against itself. `brace-expansion` → **`^5.0.9`** (floor = the patched version; still forces the tree onto 5.x, which is what pulled minimatch off 3.x). `minimatch` → **`^10.2.5`**, no advisory naming it: its stated reason (minimatch must speak brace-expansion 5.x's named `expand` export) justifies a **floor, never an exact version**; floor kept at 10.2.5 because that is the real constraint, so resolution does not move and this half is a **pure policy change with zero installed-tree movement**. "Do nothing" was available and declined — it preserves the exact trap that cost a session, one hop away. **Gate PASSES, react-router still ALLOWLISTED, 0 blocking**; all guards + 121/121 script tests re-run. **THE SUITE, stated the awkward way round because the spec asked for it either way: 2 failed / 3492 passed on the first run** — both in `sim-fairness.test.js`, both `Test timed out in 5000ms`, **neither an assertion failure** (no `testTimeout` in `vitest.config.js`, two heavy sim tests exceed the 5 s default under V8 coverage on a OneDrive disk). Nailed down three ways rather than on the strength of a commit message: raising only the clock gives **38/38** on that file and **3494/3494 / 172 files / exit 0** on the whole suite; and **`gh run view` on the red run at `3b857d05` — before this change existed — shows `Run tests with coverage = success` with the audit gate as the SOLE failing step in the pipeline**, so the pre-existing pass is established from the other side of the wire. Neither moved package can even reach those tests (brace-expansion is ESLint's glob, never loaded by vitest; undici is jsdom's fetch, never called). **NOTICED AND LEFT**: **`server/` is audited by nothing** — no CI job, `audit-gate.mjs` hard-codes `client/` — yet `DEPLOYMENT.md` makes the Node server the production runtime serving the SPA _and_ the API; it carries **2 highs**, incl. `ip-address` SSRF/trust-boundary via the **runtime** `express-rate-limit`, both plain-`npm audit fix`-able (reported, **not** fixed — different tree, own verification). Also: `deploy.yml` **cannot fire** (triggers on `main`; only `master` exists) and calls a `scripts/deploy.sh` that is **not in the repo**; and the **5 s default test timeout makes a local `test:coverage` report RED on a green tree** — the same answer-not-requirement shape, one line to fix, left for its own commit. **PROPOSALS**: a LESSON that generalises beyond dependencies — _a fix that records an ANSWER instead of its REQUIREMENT becomes the next failure_ (same family as the mirrored timing scalars and the disagreeing code fallbacks); make the gate **print the override that pins a package below its fix** (it had the fact and stayed silent — this block's whole diagnosis); **expiry dates on allowlist entries**, the one mechanism that can trade safety for green; and **no** "new advisory" severity channel — the useful axis is actionable-vs-not, and a new-with-a-patch advisory is the _most_ urgent thing the gate finds. **No source, no `client/src/`, no ceremony, fp `dc4647be0f55ebdb` untouched. Owner's eye: none needed.**

## Racer avoidance / feel

- [HOLM-300-COMBINED.md](HOLM-300-COMBINED.md) — the definitive fairness gate on the combined world, **paid 2026-07-31**. Native pooled `computeFairnessStats` Holm at **N=300/track** on the shipped world `dc4647be`, plus a read-only paired comparator on pre-motion `62400c8e` (`--behavior='{"maxLateralAccelPerStep":0}'`). **Continuity green** (band searound 89.3 / luger-hill 91.0 / seatrack 90.7 / space-sprint 89.0, runaway 0% all, rowMin 88–90%). **The acceleration cap changes the native pooled Holm verdict on 0/4 tracks** → both engine changes (flapping hysteresis + motion cap) verified fairness-neutral at definitive power; **RESIDUAL PAID**, gate for a third engine change **OPEN**. Documented finding: a **pre-existing** tiny start-row gradient flags searound + luger-hill + seatrack at the p=0.020 permutation floor (space-sprint clean); owner verdict 2026-07-31 = **DOCUMENT AND SHELF** (canonical home: [FAIRNESS.md](../../docs/FAIRNESS.md)).
- [RACER-MOTION-2.md](RACER-MOTION-2.md) — the solo overtake swerve now GLIDES; **the SECOND engine change since COMBO15**. Ships the MOTION-1 accel cap (`maxLateralAccelPerStep:0.0005`) — bounds the per-tick change in the lateral step so a dodge eases in/out instead of snapping. STEP-1 sweep (seed 5601): ε=0.0005 is the strongest cap keeping every gate — accel p99 2.7×/max 2.1× down, solo dodge completes, overlap 56083 ≪ 72303 baseline (avoidance NOT late), Arrow 2 ≤ 3, FIELD GUARD 0; ε=0.001 rejected (overlap > baseline). Hard-separation SAFETY left **UNTOUCHED by owner decision**. **N=100 quartet green** (band holds, runaway 0%, Holm = ship's 2 flagged tracks, no new UNFAIR). **New fp ON `dc4647be0f55ebdb` / OFF `854018ee5d3d83e1`** (both moved; pre-motion anchors `62400c8e`/`8d0bd4d2`); tag `pre/motion`. **RESIDUAL PAID** — the 300-race native Holm ran 2026-07-31 and verified this change fairness-neutral (0/4 Holm-verdict change): [HOLM-300-COMBINED](HOLM-300-COMBINED.md).
- [RACER-MOTION-1.md](RACER-MOTION-1.md) — lateral motion must GLIDE, not jump (the Sanftheit demand). **STEP-0 instrument (per-tick velocity + accel): render EXONERATED (already interpolates lateral). Jerk is sim-side, DOMINANTLY the hard-separation non-penetration pass (direct `physicalY` writes) — with it OFF, accel p95 8×/p99 3.2× lower + velocity drops under the clamp; integrator steer-saturation is only the rare tail. Built a config-gated per-tick accel cap (`maxLateralAccelPerStep`, default 0=DISABLED → fingerprint `62400c8e` IDENTICAL, nothing shipped) that eases the tail ~2.2× but can't reach the dominant hard-sep jerk. The spec's p95-accel gate is inapplicable (p95 already ~0). Real fix = ease the hard-sep push (glide apart), trading jerk vs non-penetration — sim-side, brings the 300-race Holm due. **OUTCOME: the owner DECLINED the hard-separation trade** ("without it we get far too many overlaps"); the acceptable integrator accel cap shipped instead (RACER-MOTION-2) and the hard-sep glide is CLOSED — see [DEAD-ENDS.md §H](../../docs/DEAD-ENDS.md).**
- [RACER-FLAPPING-2.md](RACER-FLAPPING-2.md) — margin hysteresis kills the traffic left-right flap; **the FIRST engine change since COMBO15**. The §4a incumbent obstacle keeps the steer unless a challenger dominates by 30% (`softSteeringObstacleMargin:0.5`) — per-agent, geometric, NO clock (Lesson 190). Sweep gated on the deterministic Arrow case + whole-race FIELD GUARD: ε=0.30 regressed seed 5602's field, ε=0.50 kills Arrow (18→1 reversals) AND holds the field guard (0 dramatic flappers/3 seeds). **Fairness N=100 quartet green** (band holds, runaway 0%, Holm ≤ ship); overlap ≤ ship (responsive). **New fp ON `62400c8e88cdbe59` / OFF `8d0bd4d2d92ded24`** (both moved; anchors `ded0a126`/`f8f7d9c2` preserved); tag `pre/flapping`. **RESIDUAL PAID** — the 300-race native Holm ran 2026-07-31 and verified this change fairness-neutral (0/4 Holm-verdict change): [HOLM-300-COMBINED](HOLM-300-COMBINED.md).
- [RACER-FLAPPING-1.md](RACER-FLAPPING-1.md) — racers flip left-right in traffic. **Diagnosed sim-side: `physicalY` oscillates (heading/render ruled out); reproduced with the real roster — Arrow leads, gets caught into traffic at ~18s, flaps 17 reversals/2s because §4a re-picks the most-constraining obstacle every tick with NO commit. STEP-1b fix (fixed 0.4s side-commit) = EARNED KILL: fixed Arrow (17→0) but made the field WORSE (dramatic flappers 1→6) — a synchronized fixed window de-responsivises mutual avoidance. Reverted; nothing shipped; fingerprint `ded0a126` identical. Next = obstacle-choice MARGIN hysteresis (not a timer) + a race-invariant flap metric. New read-only tooling: `--dump-frames` physicalY + `--racer-names` + `exp-flapping-gate.mjs`.**

## Camera / presentation fixes

- [ENDGAME-COMPLETE-1.md](ENDGAME-COMPLETE-1.md) — **THE ACCEPTANCE SHEET: ALL TWELVE OF HIS REQUIREMENTS, GRADED TOGETHER, EVERY RACE.** `scripts/endgame-sheet.mjs` grades the twelve from one pass of a race's own frames, in the real browser on the production build, and `viewer-invariants.mjs` runs it on EVERY race — so a change can never again be judged on the item it was aimed at. Items 3 and 8 are REPORTED not gated (his requirement 8 makes the pause a cost); item 12 needs two runs. **76 scorable races, ten tracks, both field sizes, both configs, seeds 1/2/3/9. BEFORE -> AFTER failing races:** 1: 2->1, 2: 6->**0**, 4: 0->**2**, 5: 10->**1** (frames with NO band **164 -> 3**), 6: 0->0, 7: 4->**12**, 9: **12->0**, 10: 4->3, 11: 0->0. Widest 10.56 -> 13.57 corridors; worst single frame 0.0278 -> 0.0371 ln. **BUILD:** `contentionWatch` (from the night before) plus a new `bandFloor` switch — the endgame's width floor guarantees the line inside the SUBJECT's own `innerFramePct` region rather than the company margin. One existing constant swapped for another; **this block adds no new number.** Both default OFF. **ATTEMPTS:** A1 sized the floor on the band's NEAREST point — **failed and backwards**, it asks for LESS width so it shows LESS band (seatrack item 1 band 61.7% -> 9.0%). A4 held racers still level per `_abreastContenders` to buy item 7 back — **failed and cost the moment**: city-circuit put the winner at **x = 0.105 with 24 cut frames**, breaking item 9 and item 2. **THE ONE PROVEN CONFLICT — item 7 against item 9:** `_abreastContenders` says "in with a chance" geometrically (within one body length NOW), the contention watch says it by projection. Holding the racer pulls the frame back and corners the winner; releasing him leaves **exactly one racer** at the frame edge on 12 of 76 races. Took the winner, on his own sentence that the crossing is the moment — **his to overturn, one condition.** Item 4 against item 5 is the second trade, stated with both numbers. Camera suite 894. All four fingerprints MEASURED and UNMOVED (both switches default off). NOT MERGED, NOTHING MINTED.

- [WINNER-CROSSING-1.md](WINNER-CROSSING-1.md) — **THE BADGE IS NOT THE CROSSING, AND LAST NIGHT'S SWITCH ALREADY FRAMES IT.** Confirmed from frames rather than the badge: **PHOTO_FINISH owns the crossing on all 18 runs** (nine tracks x both configs); OVERVIEW never does. What his screenshot shows is the **AFTERMATH**, which takes over **1.6-2.5 s after** the crossing and is deliberate — `finishPhase.js` names it ("AFTERMATH FINISH_OVERVIEW. Absolute") and its job is to frame the line **so later finishers cross in shot**. The winner leaves the frame **3.7-4.2 s** after crossing on three of nine tracks. **If that is the moment he photographed, the thing to move is the HANDOVER, not the framing** — his decision, nothing here changes it. **WHERE THE WINNER SITS AT THE CROSSING:** space-sprint **(0.48, 0.90) -> (0.51, 0.61)** with `contentionWatch` on; ice-track (0.75,0.44) -> (0.55,0.45); searound band **87.6% -> 99.5%**. Only space-sprint failed, because PHOTO_FINISH's anchor is the pinned pair's MIDPOINT and a far-back second member pushes the winner to the edge — the same racer and mechanism ENDGAME-WHO-AND-HOWMUCH measured. **NEW INVARIANT 6 — the winner's crossing is framed on the winner: 90 violations -> 0.** Conditions from existing numbers: inside the SUBJECT's `innerFramePct` 0.7 (framingRule.js: the region "exists so the SUBJECT does not cling to the edge"), and some part of the band on canvas, graded on the crossing FRAME because once he is past, the line is behind him. **WHY THE OLD CHECK PASSED:** "arrival 0% error" grades the ZOOM FACTOR and says nothing about what is in the picture — **the third metric in this thread green against his eye**. Invariant 6 **fails on exactly his frame** (45 violations, worst "(0.592, 0.954), outside the subject's inner 0.7 region") and is sabotage-proved both ways (corner 0->77, no-line 0->2); its own assertion caught a wrong import before it could grade on `undefined`. **NO CAMERA CODE WAS CHANGED** — the requirement is met by the switch built the night before, so no second mechanism was invented; the default stays `false` and flipping it is his one-line call. Invariants 1/2/4/5 stay at zero, invariant 3 improves 3036 -> 2431, largest step unchanged. All four fingerprints MEASURED and UNMOVED. NOT MERGED, NOTHING MINTED.

- [CONTENTION-WATCH-1.md](CONTENTION-WATCH-1.md) — **THE CAMERA KEEPS ASKING WHO CAN STILL WIN, AND SHIFTS SLOWLY.** His design of 2026-08-24, behind `contentionWatch` (**default false**). The verdict comes from what is VISIBLE ON TRACK — gap plus speed difference carried over the distance that remains — and **never from the race plan**: the plan knows the outcome and a camera that drops a racer who still looks close would be spoiling the result. Reuses the race's own `pathLengthPx`, `drawnBodyLengthPx` and pairContact's one body length, the identical expression `_abreastContenders` uses. **IT CANNOT OSCILLATE STRUCTURALLY:** the verdict is ONE-WAY — `_contentionOut` is only ever added to, so a racer's state changes at most once per race and no code path removes a member; FINISH-PAIR-1's pin is preserved, this only ever removes from it. A release needs two consecutive checks so one bad estimate cannot be permanent. **ONE NEW NUMBER, NAMED:** `contentionCheckMs` = 250, the cadence AND the estimator's window, chosen against the rate estimate's CV (26.5% at 33 ms, 12.2% at 200 ms, 6.9% at 400 ms) — below ~200 ms the physics' jitter dominates, above ~500 ms the window affords a handful of checks. The shift reuses `runInOpenMs` and the schedule's smoothstep. **THE FIRST CUT EASED x AND y AND MOVED NOTHING** — `getPanTarget` builds a pair's midpoint from `t`, so the pan never saw the blend; it now eases every field the framing reads. **MEASURED, 80 races, ten tracks, both field sizes, both configs, real browser:** invariant 3 **13540 -> 9718** frames outside the region (47 races better, 4 worse, 29 unchanged), clean races **14 -> 21**, invariant 2 **4 -> 0**, invariants 1/4/5 **0 -> 0**, largest single-frame zoom step **0.0792 -> 0.0561 ln**, arrival 0% and monotonicity 9/9 on both arms. **The 14 space-sprint frames with no finish line on canvas: 0% -> 72.5% of the band visible.** A racer drops out in **76 of 80 races**, at progress 0.9525/0.9586/0.9836 (min/median/max). **THE TRADE, STATED:** it costs 11 frames slightly earlier that go 82-100% -> 0% — the anchor barely moves, the WIDTH does, because a released racer no longer holds the contender guarantee open and the schedule's floor guarantees the line's CENTRE POINT rather than a share of the band. **RIDE-ALONG REPAIR:** `check-runin-frame`'s band sampler multiplied a NORMALISED half-offset by `trackWidthPx`, walking a segment 300x too long; fixed — space-sprint reads 16 frames off canvas, not 27, and nine of ten tracks are clean. All four fingerprints MEASURED and UNMOVED (a default-off switch requires it; checked, not assumed). NOT MERGED, NOTHING MINTED.

- [ENDGAME-WHO-AND-HOWMUCH.md](ENDGAME-WHO-AND-HOWMUCH.md) — **MEASUREMENT ONLY. HE WAS RIGHT: THERE IS NO CONFLICT, THERE IS A RULE HOLDING SOMEONE WHO CANNOT WIN.** (1) Of the 244 frames `check-runin-frame` counts as outside its region, **204 show the WHOLE finish band and the median is 100%** — the guard is stricter than his sentence for 230 of them. **But 14 show NONE of it**, at 99.7-99.9%, and those are real. **CORRECTS VIEWER-INVARIANTS-2, which claimed every remaining frame was inside the canvas — inferred from the region margin instead of measured.** (2) The binding rule on those 14 is the **CONTENDER pair, never the company guarantee (0 of 14)**; width by the schedule on 9 and the contender guarantee on 5. The pair is **pinned at PHOTO_FINISH entry** (#38 then rank 2, 46 px) and **never re-evaluated**: by the crossing #38 is **rank 5, 89 px, 58 frames (~1 s) behind, and SLOWER than the leader** — he cannot win. (3) **MOVED, not TOO TIGHT, on all 14**: need 324 px against 360 px of room, so a centred frame would hold the band every time. The frame is centred on the midpoint of leader + a racer who lost a second earlier. **A UNIT BUG FOUND IN MY OWN GUARD:** `shape.getPosition(t, lateral)` takes a NORMALISED half-offset (raceCore calls it `getPosition(t, r.physicalY / 2)` with physicalY in [-1, +1], so the corridor edges are -0.5 and +0.5), and `check-runin-frame`'s band sampler multiplies by `trackWidthPx` — walking a segment **300x too long**, so its OFF-CANVAS column overstates how much of the line is on screen. Caught by a sanity check (the figure was identical on passing and failing frames, and 1.49% is exactly 3/201). **NOT FIXED — this block changes nothing.** Smallest changes PROPOSED not built: correct that one expression; let a pinned photo-finish member DROP OUT when the race has decided him (one-way, cannot oscillate, and FINISH-PAIR-1's anti-oscillation pin stays). All four fingerprints MEASURED and UNMOVED. NOT MERGED, NOTHING MINTED.

- [VIEWER-INVARIANTS-2.md](VIEWER-INVARIANTS-2.md) — **THE PAN TARGET BELONGED TO A ZOOM THE FRAME WAS NOT DRAWN WITH.** His clarification of 2026-08-24 scopes invariants 2 and 3 to 95% -> crossing (1, 4 and 5 stay whole-race); no duration rule, which he ruled out. **A GROUP SHOT DOES RUN INSIDE THE WINDOW:** BATTLE_ZOOM holds **480 frames, 5.2% of the window, in 3 of 30 races**, COMEBACK_ZOOM none — counted per frame, not inferred. **THE TERM:** `_setTargets` resolves the pan, then update() authors the schedule's zoom a line later, so the offsets belong to a zoom the renderer will not use — and an offset is `-camX x effectiveZoom`, a product from the WORLD ORIGIN, so the error is multiplied by the anchor's distance from it. update()'s own header records the same hazard for the entry path in the same words and fixed it by moving the lerp; the schedule cannot move there because `targetZoom` is computed INSIDE `_setTargets`. Decomposed at ONE zoom over the last 13 frames: the TARGET's framing error grew to **554 x 382 px** while the pan's own residual stayed under **119 px**, and collapsed to 39 x 27 the instant the zoom stopped moving — 2.8% of zoom times an anchor 3400 world px from the origin. The fix RE-EXPRESSES `resolveCamera`'s answer at the drawn zoom (no framing rule re-run), scoped away from the glide because CAMERA-GLIDE-TARGET-1 resolves that endpoint at the destination zoom on purpose. **IN-SCOPE RESIDUE:** leader-off **23 frames (worst 239 px) -> 0**; line-not-findable **248 (worst 345 px) -> 244 (worst 55 px), all inside the canvas**. **INDEPENDENT CORROBORATION:** tracking-lag, which samples the tracking phase and knows nothing of this, moved PHOTO_FINISH **4.51/19.50 -> 3.54/8.91 pp** with every other state identical. **REJECTED:** the lateral guarantee's unsatisfiable fallback (EXONERATED — `_lastLateralShift` measured 0 on every frame; the corridor edges are symmetric); the floor from the OBSERVED anchor (re-measured, arrival error 80% -> **17%**, still breaks requirement 2). **RUNIN-BACK-1's design was NOT the lever and was not touched** — `_forwardFracNow` measured a constant 0.500 through every failing frame. `check-runin-frame` now grades HIS SENTENCE (part of the band on the CANVAS) and runs the BROWSER's camera seed rather than raceDriver's fixed constant; **sabotage-proved red both ways on 9/9**. 9 of 10 tracks clean; **space-sprint still fails (27 frames off canvas at 99.9%, contender guarantee binding), so verify ends RED on that one track** — named, not hidden. The one-race browser gate is wired into **SHIP-CEREMONY step 0a** (130 s per ship), deliberately NOT into verify. NOT MERGED, NOTHING MINTED, WORLD + WORLD-OFF unmoved.

- [VIEWER-INVARIANTS-1.md](VIEWER-INVARIANTS-1.md) — **THE 12% WERE NEAR-MISSES, AND THE EXCURSION WAS NEVER IN THAT MEASUREMENT: THE HEADLESS DIRECTOR DOES NOT PRODUCE IT.** Every one of the 1106 not-findable frames has the camera at most **0.40 track widths off the spine** with racers in shot (`diag/notfindable-census.mjs`). In a REAL BROWSER on the PRODUCTION BUILD, the same race — space-sprint seed 9, his roster, Race Plan on — has **frame 5308 with NO POINT OF THE COURSE ON THE CANVAS** and frame 5327 with **the leader 2806 px outside**, both inside the widen. That is the THIRD proven headless/browser divergence and the first where the headless side reports a clean run on a defect he photographed. **THE TERM:** during the widen `_lerpPhase` is `glide`, which interpolates the pan ABSOLUTELY from a start captured at glide-begin. Correct while the glide owns BOTH quantities — ENDGAME-SCHEDULE-2 took the ZOOM away and left the pan easing around a zoom that no longer applies, and the FOLLOW branch's CAMERA-SIDEJUMP-1 pivot has no counterpart there. **FIX:** that same pivot in the form an absolute interpolation needs (the zoom delta since the glide's own start, on its own start point), **SCOPED** to the schedule-authored zoom — unscoped it is a second correction on a correct move and the director's own SIDEJUMP regression catches it at 13.6% vs its 15% floor. Before/after on that race: course-off-canvas **20 frames (worst 718 px) → 0**, leader-off in the widen **54 (worst 2806 px) → 0**, and **every other count identical to the digit**. **THE RULE THIS BLOCK ESTABLISHES:** violations are reported as EVENTS — seed, track, frame, progress, by how much — never as a share; twice in this thread an aggregate hid a catastrophe. New gate `scripts/viewer-invariants.mjs` (real browser, production bundle, virtual clock, parallel-safe) + `client/src/modules/viewerProbe.js`. Sweep: 55 s/race at 10 at a time, **full 800 = 12 h measured** → nightly; `--gate` is one race at 130 s. **INVARIANT 2 CANNOT BE MET AS WRITTEN AND IS NOT WEAKENED:** 10617 of 10809 leader-off frames are COMEBACK_ZOOM/BATTLE_ZOOM, which frame a group and are under no obligation to contain the leader — an owner decision, worst 1025 px, stated and stopped at. NOT MERGED, NOTHING MINTED, WORLD + WORLD-OFF unmoved.

- [ENDGAME-REPAIR-1.md](ENDGAME-REPAIR-1.md) — **THE CARRIED RAMP WAS NOT THE CAUSE.** Re-running the FULL table found the endgame camera **STROBING between a 1.2-corridor shot and a 7-corridor shot on ALTERNATE FRAMES**, up to a second of it, on 7 of 9 scorable tracks and on BOTH builds of ENDGAME-SCHEDULE-2 — the carried ramp only traded the strobe's stagnation for its amplitude. **Five authors, each found as a frame:** (1) a PERIOD-2 LIMIT CYCLE — the widen returned Infinity on an inert frame, handing the width back to the STATE, and the delivered width then flipped the target's finiteness, so the two fed each other; a schedule now HOLDS what it last placed instead of abdicating. (2) a SINGULAR target — sized from the anchor's OBSERVED screen position, `pointGuarantee` divides by the room left to the region edge, so it is **undefined on 63-84% of the widen's frames on six tracks and reaches 2108 corridors where it IS defined**; from the framing rule's own anchor it is undefined on 0% of frames everywhere. (3) the target STEPS with the camera state (1.99 -> 2.81 corridors in one frame). (4) the OVERVIEW entry snap cut 1.99 -> 2.67 corridors, which the schedule then read as "the widen is done", latching the close on it — **absolute standstill from 94.25% to 95%**. (5) the LEAD_CHANGE entry snap — **the candidate he named, and it was live** — collapsed the shot 5.40 -> 1.33 corridors in ONE frame. **THE WILD CAMERA REPRODUCES AND IS FIXED:** `wild-frame.mjs` runs the BROWSER's own camera seed, which no harness in this repository ever had; space-sprint **seed 30** changes width **4.8x in one frame** and pans 2056 px, opening to 13.3 corridors — after the repair the worst of 40 seeds is 0.081 ln. Full table, both arms, his field sizes: widest frame worst **15.6 -> 6.1 corridors**, monotonicity **4/9 -> 9/9**, requirement 1 8/9 -> 9/9, largest single-frame step over the FULL window **2.12 -> 0.052 ln**. **REQUIREMENT 5 BUILT BUT NOT MET** — a floor at the line's own demand takes off-canvas endgame frames **25.6% -> 12.0%**; the last 12% is the PAN and not the width (74 px of tracking lag against a 36 px margin), and **three attempts to pay for it with zoom each broke a different requirement** (clipping 35% / arrival error 97% / arrival error 64%) — all three removed. The lever is the leader's forward travel during the close, which **RUNIN-BACK-1 deliberately unbounded**, so it is his call. `check-runin-frame` rewritten to grade the requirement as written, at his field sizes, and **sabotage-proved both ways** (it was green on NaN first, measuring nothing); it is RED because the build is. NOT MERGED, NOTHING MINTED, WORLD and WORLD-OFF unmoved.

- [CAMERA-SEED-AND-LINE-1.md](CAMERA-SEED-AND-LINE-1.md) — **PIECE 1 SHIPPED: the camera seed is DERIVED from the race seed** (`cameraSeed.js`, his decision 2026-08-23). Same race seed ⇒ same camera shot for shot, proved on a REAL race; no knob. Follows `raceNumbers.js`'s salt precedent with a different salt; the unseeded case (Start Race, seed 0) keeps `Math.random` so its variety survives. **The trajectory test was BLIND at first** — the director rolled its dice ONCE in 600 frames of a synthetic fixture, against a weight of 1 where the value cannot change the outcome, so two different seeds gave identical trajectories and the test passed proving nothing; it now runs on the real driver where the two halves sabotage-prove each other. **PIECE 2 NOT BUILT — it hits the conflict the brief anticipated:** holding the line to the crossing costs the largest single-frame zoom step 0.0230 → 0.0370 and 0.0792 ln (1.6x and 3.4x over his stated budget) on 2 of 3 probe tracks; reported and stopped rather than quietly widened. **CORRECTION: the served build 1e8a9d63 is WORSE than reported** — widest frame median 4.6 → **6.0 corridors (worst 15.6)** and monotonicity 8/9 → **4/9**, caused by the carried-ramp commit whose full table was never re-run.
- [CAMERA-NONDETERMINISM-1.md](CAMERA-NONDETERMINISM-1.md) — **NO, the camera is not deterministic from the race seed, and the larger cause is DELIBERATE**: `RaceScreen` draws the camera's OWN seed fresh from `Math.random()` every race (`index.jsx:595`), and the director rolls that die to decide whether a state is taken, WHICH state to cut to, and the OVERVIEW jitter. Measured at a fixed 60 Hz, same race seed: identical camera seed repeats EXACTLY; a different one diverges at physics step 967 with **165 steps running a different STATE**. SECOND, INDEPENDENT CAUSE: frame timing — any variation diverges at step 30 (3.6% of the race), a single dropped frame in 37 is enough, 30 Hz differs by 0.69 ln of zoom. **Confirmed IDENTICAL on master, so it is long-standing and not from the endgame work.** New instrument: `runRace` takes `hooks.frameMs` (every existing caller byte-identical) — until now every harness ran at a fixed 60 Hz and was blind to this by construction. **The lead change is NOT ESTABLISHED — could not be reproduced; a physics swap was found at seed 7 p=0.9875 but the camera declined it on seven camera seeds.** Fixes proposed, none built.
- [ENDGAME-SCHEDULE-2.md](ENDGAME-SCHEDULE-2.md) — **judge by the WORST FRAME.** The aggregate smoothness figure was green (worst d2 13.1) while his eye reported hopping, because it was taken on a SMOOTHED series and averaged away the single-frame events. Per-frame measures added; **largest single zoom step 0.2206 -> 0.0230 ln.** (2) "sits still then jumps back" is ONE defect: `_lineCeiling` FLICKERS to Infinity on a curving track and the ramp advanced on inert frames, resuming mid-curve — 0.22 ln + 1817 px between two frames on space-sprint; the ramp is now CARRIED. The backward motion IS RUNIN-GLIDE-1's deliberate mirror travel, but it overshot to 1.63 of the frame because the schedule authored the zoom AFTER the pivot correction (PHOTO_FINISH p95 16.6 -> 90.7); moved before it, the leader lands at 0.64 against an intended 0.66. (4) Hopping was STRUCTURAL: 12-42% of frames were placed by something other than the schedule; the other authorities now stand down (they would widen on 0-8%) and clipping is **0%**. Two more hops found: the endpoint STEPS on the photo-finish flip (0.629 ln), and the ramp's own parameter jittered 2.0x. **(3) THE CLOSE CANNOT BEGIN EARLIER — it conflicts with requirement 1, measured four ways; the trade is stated.** ONE REGRESSION: river-run on the shipped arm, standstill 13 -> 55%. NOT MERGED, NOTHING MINTED.
- [ENDGAME-SCHEDULE-1.md](ENDGAME-SCHEDULE-1.md) — **the endgame is a SCHEDULE, not a ceiling** (his spec of 2026-08-23). A bound has no opinion about MOTION, so the picture stopped whenever the bound did — which is why lengthening the phase bought standstill. Two smoothsteps meeting at the 95% deadline: widen to the narrowest width showing winner+line, then close to the leader-view/photo-finish factor, landing at the crossing. **Standstill 43%→17% and the longest freeze 2017→550 ms; requirement 1 (both visible by 95%) 0/9→9/9 on BOTH arms; arrival error 48%→6%; widest frame 6.1→4.4 corridors; jerk 78.3→13.1 — and it CUTS FEWER RACERS than today (59→35, 109→33).** Requirement 5 (the line need not stay framed) is what made it solvable: `COMPANY_FRAME_PCT` 0.9 costs 1.11x where the subject region cost 1.43x. **Measured and dropped: `innerFramePct` 1.0 (line sits ON the edge, deadline fails), a guarantee floor (57% standstill), an earlier deadline (0.93 → req1 3/9 — 0.95 is the optimum, not a compromise), and `runInOpenMs` 800/1800/2500 (indistinguishable — his 1250 stands).** One miss: river-run re-opens 1.23% over 3 frames on the shipped defaults only. NOT MERGED, NOTHING MINTED.
- [PAN-LAG-ACCOUNT-1.md](PAN-LAG-ACCOUNT-1.md) — the closed account of the pan lag. **Residual 0.0 px median on all 40 runs: the lag IS the smoother.** Separating pan from zoom **re-attributes LINE-VISIBLE-1's 414-891 px — it is mostly ZOOM (larger on 35 of 36 runs), not pan.** Endgame runs on the TRACKING constant (entry is 0% of run-in frames); garden-path never reaches the window.
- [LINE-VISIBLE-1.md](LINE-VISIBLE-1.md) — **what "the line is in frame" measures — DEFECT, not
  margin** (2026-08-22, MEASUREMENT ONLY, no camera change, nothing can move). ENDGAME-WIDTH-1's
  number counted the line's centre point **OFF THE SCREEN ENTIRELY**: **17-47 %** of endgame frames
  across ten tracks, against a separate margin-only violation of just 2-18 %. **AND THE CAUSE IS NOT
  THE WIDTH** — on space-sprint the shot is already 1319 px against a line demand of 1341 and the
  line is still lost 38 % of the time; **the median target-to-delivered lag is 414 px, and 891 px on
  luger-hill.** The line leaves the picture because the camera is pointed elsewhere. **His definition
  is answerable and nothing was invented** — the band is `getPosition(ft, ±0.5)`, and his rule is the
  director's own `pointGuarantee` at `innerFramePct` 1.0; it roughly HALVES the width at mid-endgame,
  WIDENS the opening on five of nine tracks, and takes over-scale below 1.0 on six of nine. **But it
  removes a border the lag already exceeds**, so it cannot be built first. **The knock-on: `company`
  becomes the binding term on every track (55-100 %)** — not the tail — which is what the next block
  is about. Worst tracks are seatrack and space-sprint, not the ones sampled before; **`garden-path`
  has NO endgame frames at all and that is not established.**

- [ENDGAME-WIDTH-1.md](ENDGAME-WIDTH-1.md) — **which term actually buys the endgame's width**
  (2026-08-22, MEASUREMENT ONLY, no camera change, nothing can move). **THE TAIL IS NOT PAYING FOR
  IT — the owner's hypothesis is REFUTED.** The `line` term, the run-in's own finish-line bound,
  binds **93-99 %** of every endgame frame on all three tracks, and `field` and `company` are
  `Infinity` at the widest moment on all of them; his config and the shipped defaults agree to the
  percentage point. **A contender definition already exists and none was invented**:
  `_abreastContenders`, the rule the run-in uses to pin the photo-finish pair — it selects **2-3
  racers**. The candidate shot (the director's own `contenderGuarantee` over line+leader+contenders)
  is **3.2-3.4x narrower at mid-endgame** and **WIDER at the opening**, which is what his
  specification asks for and today's shot fails. **Over-scale 4.33x -> 1.21x on space-sprint**, so
  the sprite problem IS downstream of the width. **THE PRICE: 31 racers in frame becomes 4, 20
  becomes 3.** And a defect found on the way — **today's endgame already loses the finish line on
  21-42 % of its frames**, including the opening on all three tracks. Whether the candidate holds the
  line is **not established** (the pan is not modelled).

- [FLOOR-REACH-1.md](FLOOR-REACH-1.md) — **on how many tracks does the oversized-racer problem
  actually show?** (2026-08-22, MEASUREMENT ONLY, nothing changed, no fingerprint can move). Ten
  tracks x 20/40/60 racers x his config AND the shipped defaults. **TWENTY RACERS IS CLEAN ON ALL
  TEN** — worst over-scale anywhere is 1.92x — **which is why months of watching showed nothing; the
  field size is the discriminator, not the track.** At his settings it is **1 of 10 at 40 racers and
  2-3 of 10 at 60**, and every worst moment is in the APPROACH to the finish, where he was looking.
  **Space-sprint is special for an arithmetic reason**: over-scale is `floor x worldPx / (worldBody x
  1280)` and it is worst on BOTH terms — the smallest world body (9.50 px) and the widest shot
  (1951 px); the table IS the formula. **AND THE BRIEF'S ASSUMPTION IS CONTRADICTED**: the SHIPPED
  defaults reach wider shots and worse over-scale than his config on almost every track
  (space-sprint 10.66x vs his 5.20x), and two tracks that never bind on his settings do bind on the
  defaults — his settings damp this, they do not cause it. **A floor change is a large hammer**;
  bounding the SHOT is proposed as the narrower fix, and the floor may not be the right term at all.

- [LABEL-OVERLAP-FIX-1.md](LABEL-OVERLAP-FIX-1.md) — **a label that was admitted stays readable**
  (2026-08-22; **SHIPPED as `v-ship-label-overlap`** — he judged it on a production build and
  accepted it, including the photo finish: where there is no room, nothing more can be shown.
  **NOTHING MINTED and that is the point** — RENDER measured on the merged tree and byte-identical,
  because `labelNamesWhenRoom` ships false so both fixes are structurally unreachable on the
  defaults). Two fixes:
  an admitted NAME is no longer a box the incumbent budget may be spent against (`fits`), and the
  photo-finish blanket exemption is gone (`exemptAll: false`) because its premise — "at that zoom" —
  was refuted at **1951 world px, the widest shot of the race**. **Non-exempt overlapping names go
  40 -> 0 at 60 racers and 10 -> 0 at 20**, measured from the drawn boxes on REAL Chrome font
  metrics. **THE COST IS STATED**: his frame drops 6 more labels (3 -> 9 of 60 eligible, 51 still
  drawn) and the photo finish goes 41 names -> 1, 41 labels -> 17 — that is the change to judge. The
  racing shot at 20 racers is IDENTICAL to the label. **RENDER did NOT move (7d553406f41ff176) and
  that is the finding**: `labelNamesWhenRoom` ships false, so under shipped defaults no name is ever
  offered and both fixes are unreachable — the change is visible only to someone who has turned names
  on. Five tests that do not share a measurement function with the layout; both defects
  sabotage-proved. Carries a correction to LABEL-OVERLAP-3's headline (BOX_PAD_X is 8, not 10, so
  "7 of 12" reads 3 of 11 — the finding is unaffected).

- [LABEL-OVERLAP-3.md](LABEL-OVERLAP-3.md) — **the screen was right and the instrument was wrong
  three times over** (2026-08-22, INVESTIGATION ONLY, nothing changed, no fingerprint can move).
  **THE ROOM TEST IS BROKEN**: 7 of 12 names collide in his frame, counted BY PIXELS with real fonts,
  where the layout claimed 0 — and **every collision is name-vs-NUMBER**, which names the defect:
  `YIELD_OVERLAP_FRAC = 0.35` lets a tenured number intrude 35% of its area onto a name that was
  admitted with zero tolerance; all seven intrusions (31-192 px2) sit inside that budget. The code's
  own justification is inverted from the failure. **PHOTO_FINISH is a second, separate one**:
  `exemptAll` skips the test on the premise "at that zoom", and that shot is now **1951 world px —
  the widest of the race** — with 40/41 names overlapping and 9 clipped. Font metrics, coordinate
  space, box geometry and his DPR all RULED OUT with the measurement that ruled them. Carries a
  correction to LABEL-NAMES-2 and un-reverses LABELS-AND-FLOOR-1.

- [LABEL-NAMES-2.md](LABEL-NAMES-2.md) — **which of his eleven keys produces the name labels**
  (2026-08-22, MEASUREMENT ONLY, nothing changed, no fingerprint can move). **`labelNamesWhenRoom`
  alone — necessary and sufficient**: leave-one-out over all eleven takes names to 0 only there
  (-670); `minRacersVisible` 8-vs-5 is worth -6 of 670 and the mid-race frame is IDENTICAL at both;
  `highlightHeroes` draws a RING and touches no label (delta 0). Two of his keys go the OTHER way —
  reverting `battleWeight` or `outcomePhaseThreshold` ADDS ~140 names, so his settings already
  suppress names relative to the shipped camera. **THE ROOM TEST IS CORRECT**: of 6 names in his
  crowded frame exactly 1 overlaps, and it is the LABEL-FOCUS-1 exempt racer drawn regardless by
  design — **0 of 8 non-exempt names overlap**, and the layout measures the same font and box the
  renderer draws. **So it is his setting, not a defect** — which turns the wide shot's
  unreadability back onto the SPRITES (32.4 px drawn into 29.2 px of spacing). Carries a correction
  to two earlier reports.

- [LABELS-AND-FLOOR-1.md](LABELS-AND-FLOOR-1.md) — **the name labels, and the 32.4 px pin**
  (2026-08-22, MEASUREMENT ONLY, nothing fixed). **The resolution branch is RULED OUT from the
  source**: the canvas store is fixed 1280x720, no DPR anywhere, and `renderRaceFrame` is handed the
  REFERENCE size — so his 1037x583 @ 1.5 scales the finished image and cannot reach the layout. The
  remaining explanation is his **stored config**, and the console one-liner to read it is in the
  report — **not guessed, asked for**. **The floor's number was calibrated at TWENTY racers on the
  Space Sprint START grid** (commit `77a7812d`, 2026-08-03) against an OVERVIEW that was 1200 world
  px under a zoom unit that has since changed twice. Today it binds on **4/130 frames at 20 racers
  and 79/125 at 60**. At 60 it makes its OWN calibration frame 60/60 overlapping. **Lowering it costs
  ZERO in the racing shot at every field size tested.** Which problem he sees depends on his label
  form: with numbers the sprite dominates, with names the label dominates 6.1x — so **on today's
  evidence the floor is the smaller problem**. Two owner decisions, stated.

- [MINIMAP-ONE-SOURCE-1.md](MINIMAP-ONE-SOURCE-1.md) — **one ribbon drawn two ways, and a state list
  short by one** (2026-08-19; **SHIPPED 2026-08-22 as `v-ship-minimap-one-source`** — he judged the
  minimap on a production build and accepted it; **RENDER minted, CAMERA measured and NOT minted
  because it did not move**). Two blocks, one class of defect: something described in two places where the second
  is allowed to disagree SILENTLY. **The minimap's band and edges walked `getEdgePoints` by index
  while its marks and tail used `getPosition`** — sliver **1.886 -> 0.000 px**, mark-to-band gap
  **0.919 -> 0.000 px on all ten tracks**, seam 0.000 either side. Four ribbon walks became one.
  **But the band OUTLINE genuinely moved up to 2.021 px (space-sprint), over a pixel on three
  tracks** — onto the true curve, which is the right direction and still a finding, and the 38 px
  per-vertex figure is a re-parameterisation, not a move. **One source was not enough — one GRID was
  needed**: sharing the source alone left 1.472 px. `ALL_STATES` was missing PHOTO_FINISH, so SIX
  per-state maps fell back silently; CAMERA and RENDER both UNMOVED, and that is measured rather
  than assumed — **the profile IS read (transition-reason counts move) but every PHOTO_FINISH
  transition is a self-transition, which is a deliberate no-op.** So the three Dev controls are now
  wired and still cannot move the shot. **3 short lists of 12; the dev HUD's is left for his call.**

- [SPRITE-SIZE-OVERVIEW-1.md](SPRITE-SIZE-OVERVIEW-1.md) — **why the racers are bigger in the wider
  shot** (2026-08-19, INVESTIGATION ONLY, nothing changed, no fingerprint can move). **The sprite
  size stops following the zoom**: `minDrawnFrameFrac` pins it at 32.4 screen px on every shot wider
  than ~285 world px, so it is a CONSTANT across that whole range and grows only RELATIVE to the
  world — 1.75x over-scale at 658 world px, 2.13x at 800. The premise is corrected: the sprite is
  **identical in canvas px** in both of his frames; the floor binds on 79 of 125 frames. **The 285
  cap DOES NOT BIND** on space-sprint (effW is exactly 285.0); the single body size is active but
  constant, so it cannot explain a difference; `_drawnBodyWidthRefPx` at 46.9-57.1% of the drawn
  sprite is the floor's SHADOW, not a separate defect. **The label answer: numbers 8.0 px fit in the
  26.9 px available, names 60.3 px do not** — the sprite contributes 5.5 px of overlap and a name
  would contribute 33.4 px, 6.1x more, so it is predominantly a LABELLING problem. **NOT
  ESTABLISHED: where his NAMES come from** — `labelNamesWhenRoom` ships false and turning it on
  still yields zero names; a stored config is the remaining explanation. Found on the way: **the
  start-formation roll call draws NUMBERS while its own comment says it draws names.**

- [FALLBACK-MIRRORS-1.md](FALLBACK-MIRRORS-1.md) — **the camera's last three copied defaults, and
  what "unreachable" meant this time** (2026-08-18, SHIPPED, **nothing minted**). Four copies
  REMOVED, none synced. **The two identical wrong copies were the dangerous part**: the Dev Screen
  carried the same 0.4 and 0.1 as the engine, so cross-checking them found AGREEMENT — two copies of
  one wrong number manufacture corroboration, and one sat in the panel you would open to judge that
  number. **`maxStateDuration` was not the simple case it looked like**: the same constant serves a
  mirror of the top-level key on the legacy branch AND the fallback for a per-state PROFILE, a
  different quantity that shares a name — and measurement showed the shipped config takes the
  profiles branch, so the top-level key is **unread**. **Reachability was established per key BEFORE
  changing anything**, which the previous block did not do; even so **three tests** were written
  against `maxStateDuration`'s literal and the third was found only by running everything — its name
  mentioned neither the key nor the value. The five guard exceptions were reported **STALE** once the
  copies went and are deleted, so the guard is green because the mirrors are GONE. Census 36 → 29
  disagreeing, **zero left in any camera file**; the remaining 29 sit in the race engine, 22 of them
  inside the WORLD closure, and are reported as the next block's decision.

- [ENDGAME-FALLBACK-1.md](ENDGAME-FALLBACK-1.md) — **one home for `endgameThreshold`, and the
  fallback was reachable after all** (2026-08-18, SHIPPED, **nothing minted**). The literal `0.85`
  in `cameraTimingComputation.js` was **deleted rather than synced** — the file already imported the
  defaults and every other top-level key already read them — so the guard is green **because the
  mirror is gone, not because the numbers agree**. **The "UNFIREABLE" exception was true of the
  product and false of the TEST SUITE**: three tests build a director with no config and had been
  written against the stale literal, so the wrong number was not documentation, it was what three
  tests silently asserted. All three fixtures are derived now, and one needed BOTH gates —
  `endgameThreshold` and `photoFinishLeadProgress` — because past the second the photo finish takes
  the shot. CAMERA and RENDER measured on the merged tree and **byte-identical**, which is the proof
  no shipped path took it. **Three siblings in the same file are stale and are reported, not fixed**
  (`comebackMinStartGap`, `comebackMaxCurrentRankPct`, `maxStateDuration` — the last at DOUBLE the
  shipped value). First ship under the new SHIP ORDER, which it also corrects: `check-tags` cannot be
  green on an unmerged branch that registers a not-yet-pushed tag, and the report shows why that
  window is the right one to have.

- [SHIP-ORDER-1.md](SHIP-ORDER-1.md) — **a ship tag now points at a commit that passes** (2026-08-18,
  documents only, nothing minted, **the guard was NOT touched**). Two rules were both right and could
  not both hold: CI green for exactly the merge SHA, and the tag's `TAGS.md` register line landing in
  the commit AFTER the merge — so `check-tags` failed on the very commit the tag names. Found by
  USING it: dispatching CI against `v-ship-endgame-095` to get a green for its merge SHA produced a
  red, and the red was this. **The fix is the ORDER, not the guard**: everything the merge must
  contain is written on the BRANCH, which works because the catch-up merge already makes the branch
  tip's tree the tree master will have — so the mint is still measured on the merged tree.
  **One step genuinely cannot be done in that order and is named rather than forced**: a commit
  cannot name its own hash, so the register SHA and `mintedOn` are provisional at the merge and
  corrected in a follow-up — which costs nothing, because `check-tags` declares that it checks names,
  not shas. Four existing tags predate the rule and are recorded as such; history is not rewritten.

- [DOCS-TWO-WEEKS.md](DOCS-TWO-WEEKS.md) — **what these weeks owed the documentation** (2026-08-18,
  a writing and deleting job — no guard, no script, no code, nothing minted). **Six new lessons
  (208–213)** — the Admissible-Set Law (an even close and "the line stays in frame" are incompatible
  while the ends are fixed), the Inert-Enforcement Law (a check that cannot fail is not a check —
  four instances in one week), the Blast-Radius Law (a suite reached production data through TWO
  doors), the Single-Run Law (five runs separated 27 real failures from 4 flakes), the
  Along-The-Course Law, and the Suspect-The-Instrument Law. **Two findings were ALREADY in the canon
  and were EXTENDED rather than duplicated**, per R13: the uniform "none" into Lesson 196, the
  downscaled screenshot into Lesson 156. **`DEAD-ENDS.md` gains §O** with the six-shape table and the
  instruction to run `runin-line-schedule.mjs` first. **`CAMERA_DIRECTOR.md` §3a now opens with the
  impossibility finding**, carries the SHIPPED hold-and-single-sweep shape that was missing, and has
  a stale measurement corrected — it stated 73.4% / 2.5 s from the 3000 ms opening eleven lines below
  its own 86.6% / 1.1 s. Also corrects the "flake budget is unknown" claim in both its homes. **Three
  things are reported as believed-wrong but NOT changed because they need a decision**, including
  that a `v-ship-*` tag can never satisfy `check-tags` in its own tree.

- [ENDGAME-THRESHOLD-095.md](ENDGAME-THRESHOLD-095.md) — **the endgame opens at 95%, and the
  interesting part is what it broke** (2026-08-18, SHIPPED). One key in `defaults.js`, 0.9 → 0.95,
  on the owner's decision after running the value himself — **he waived the before/after sweep**, so
  no ten-track measurement stands behind the number and none is claimed. **The one thing that could
  surprise him was CONFIRMED, not assumed**: his stored 0.95 is DROPPED by this change (run against
  the real `pruneStored`), so he follows the default at the same number — and the key stops being
  shadowed, so the NEXT change to it will actually reach him. **The interesting part is the fallout
  a one-line default does not predict**: `check-fallback-agreement` fired because its exceptions
  record an exact (default, fallback) PAIR; two director tests went red because their fixtures name
  x positions chosen against a 0.9 window; and **one test went GREEN for the wrong reason** —
  "the progress measure is 0 at the threshold" still passed from a point a whole window early,
  because `_runInProgressOf` clamps. All three fixtures are DERIVED from the shipped threshold now.
  **The closure walk changed the plan**: `defaults.js` is inside ALL FOUR instruments' closures, so
  WORLD and WORLD-OFF had to be MEASURED rather than argued — both byte-identical
  (`dc4647be0f55ebdb` / `854018ee5d3d83e1`), which is the substantive result. CAMERA
  `6ae77f12daf23f78` → `d9f45a4aea0e5778` and RENDER `a870f5f9e79cb444` → `1274c7e8444238e3`, both
  minted.
- [RUNIN-LINE-1.md](RUNIN-LINE-1.md) — **the line left the frame, and the term that put it out was
  not the hold** — and, appended to the same file across sixteen blocks, **the whole run-in thread
  and how it ended**. **SHIPPED 2026-08-17** as `v-ship-runin-hold`, merge `48f954a4`, the owner
  having judged it on a production build that day and accepted it; **CAMERA and RENDER minted on the
  merge, WORLD and WORLD-OFF outside the closure and not re-run**. **The file opens with its own
  summary** — read that first, since the sections below it are append-only and several describe
  shapes reverted the same day. **THE FINDING THE THREAD ENDS ON**: an even close and "the finish
  line stays in frame" are incompatible while the two ends of the close are fixed, because
  `_lineCeiling` is the **boundary of the admissible set** rather than one option among several —
  `needed` falls to zero at the crossing so the bound rises hyperbolically while `room` shrinks, and
  an even close is a chord that crosses it. Five shapes were built, measured and REVERTED on that
  finding — RUNIN-PIN-1 (the target-versus-delivered lerp), RUNIN-ANCHOR-1/-2 (no placement value
  has a solution), RUNIN-RATE-1 (**this camera has no constant rate to borrow**), RUNIN-EVEN-1/-2
  (the destination runs away; then the walk is invisible behind a ceiling binding on a median 91% of
  closing frames) and RUNIN-SCHEDULE-1 (the schedule needs the line **outside the frame** on 9 of 9
  tracks, up to 2.46× the room ahead). **Nine report-only instruments ship with it**, under
  `scripts/diag/`: `runin-line-schedule` (**run this one first** if anyone attempts an even close
  again — it prices a proposed close in the line's own units in one run), `runin-close-rate`,
  `line-ceiling-terms`, `runin-forward-reach`, `runin-pin-drift`, `width-authority`,
  `binding-census`, `runin-pace-table` and `start-frame-capture`. What follows is the block that
  opened the thread. The owner
  rejected the production build because the run-in closed past its own finish line. **The instrument
  came first**: `check-runin-frame` was green throughout because its two questions ask whether
  RACERS are on screen — question 3 now asks whether THE LINE is, every frame from the endgame
  threshold to the crossing, on all ten tracks, reading the director's own `_finishLineWorldPoint`,
  `_proj.toScreen` and `_framingProbe` rather than rebuilding the rule. **It leaves on 9 of 10 tracks
  from progress 0.976, by up to 608 px, for up to 2.4 s.** The binding term was COUNTED, not
  eyeballed: **90% of lost frames are the corridor cap**, which raises `guaranteed` after the
  `Math.min` and re-applies only the contender guarantee, dropping the run-in's `line` ceiling —
  proven by a `--no-cap` control arm, and **it PREDATES the hold** (master loses the line on the same
  nine tracks). The repair is the omitted half of a clamp that already existed: the line is
  re-applied for the same reason the contenders are. **593 overridden frames → 0.** The consequence
  is bigger than the diff and is reported rather than buried — **the cap now moves the shot on 0 of
  7441 photo-finish frames, down from 5019**, because the line was the argmin on every one of them,
  while its own promise moves 8.8% → 8.7% NOT WHOLE. The residual (5 tracks, 7–31 frames, 40–228 px)
  is the PAN trailing a bound it is honouring, so the guard fails on cause — delivered zoom tighter
  than the run-in's ceiling — and never on a pixel threshold. Pace table at `runInOpenMs`
  1250/1750/2250 included: a longer sweep shrinks the residual on every affected track.

- [RUNIN-HOLD-1.md](RUNIN-HOLD-1.md) — **hold the opening shot, then close in ONE sweep**
  (2026-08-16, `feat/runin-hold`, **unmerged, NOT minted, HIS EYE OWED**). The run-in began closing
  the moment the endgame window opened, so the first seconds were a crawl — ~3.6 s at ~95 px/s of
  picture flow. It now holds its opening shot and releases only when one steady close arrives at the
  crossing. **The release is DERIVED**: release when `(1 − progress) / observed rate ≤ runInOpenMs` —
  the distance still to run and the span the shot must close, no new key and no picked fraction. The
  sweep is parameterised by PROGRESS, not wall clock, so `u = 1` at the line **by construction** and
  the crossing is the state's own shot with no seam. Measured on ten tracks: **hold 77–85% of the
  window, sweep 1.13–1.30 s** against the 1250 ms key; short-window compression fired 0 of 10.
  **CAMERA `ff2bc42af377b5cf` → `bca27102de40518b` and RENDER `0e04fa4a5e9c3b85` →
  `3a5268aac86f665d`, neither minted.** Tracking lag RE-measured (not re-stamped): every frame count
  identical, movement entirely in the endgame tails (PHOTO_FINISH p95 26.85 → 33.94). Two lessons
  worth more than the change: **both release estimators I rejected were fine and my MEASUREMENT was
  wrong** — progress asymptotes to 0.999 and never reaches 1, so a script waiting for `>= 1` counts
  the whole post-crossing ending as sweep; and interpolating on `_lineCeiling`'s `Infinity` produced
  **NaN in cam.zoom**, caught only because 21 existing tests failed.

- [MINIMAP-MARKS-1.md](MINIMAP-MARKS-1.md) — the minimap now marks the START and the FINISH, and
  washes down the UNRACED TAIL behind the finish (2026-08-15, `feat/minimap-start-finish`,
  **pushed, unmerged**; marks @ `faf379fd` **ACCEPTED by the owner on a production build**, tail @
  `f7b960dd` **HIS EYE OWED**). A bar across the band at the same segment the world's finish gate
  spans; solid green starts, a checker finishes, and where they coincide — every closed track —
  **one** mark carries both. The tail is built from the mark's own source, so the seam measures
  **0.000000 panel px** off the checker on every open track at every finish. Sizes chosen against a
  measurement (the bar is **12–22 panel px**, not the ~50 first assumed). RENDER moves twice and is
  **NOT minted**; WORLD/WORLD-OFF/CAMERA unmoved throughout. Keep the refutation that comparing edge
  curves **by index** invents a 502 px error that is really a parameterisation offset (1.5 panel px
  by nearest point). **Its "dark wedges at an open band's ends" claim is RETRACTED in the report
  itself** — the canvas has one band colour across 110601 px; the ends are simply never stroked.
- [EDGE-SLICE-2.md](EDGE-SLICE-2.md) — **the racer is Nova, he fails BOTH conditions, and my earlier
  reason was wrong** (2026-08-14, `feat/contender-zoom` @ `73781bda`, **DIAGNOSIS ONLY**). Corrects
  [EDGE-SLICE-1](EDGE-SLICE-1.md). **Colour IS reachable** — `renderState.js` assigns
  `RACER_COLORS[array position % 10]` — but that makes it an UNSTABLE identifier: change the field
  size and every racer's colour moves, and in this run neither violet racer is near the top edge
  (both inner, 7.8 and 14.0 lengths back). **Two of twenty racers are at or beyond the top edge**;
  Nova (rank 5, salmon, physicalY 0.60, 0.74 outward of a winner at −0.14, 43% of his body showing)
  matches the description exactly. **Judged at the CAPTURE frame — the one that decides membership,
  since the set is never re-sorted — Nova is 1.21 body lengths back against a one-length rule AND
  blocked across the track by Blaze**, who is himself a contender. Not a rule violation, and all
  three contenders are WHOLE at the crossing. **The correction owed:** EDGE-SLICE-1 said he was
  behind the LEADER — that read an array index as a rank.

- [EDGE-SLICE-1.md](EDGE-SLICE-1.md) — **Nova is not a contender, and the harness has been grading
  the wrong set** (2026-08-14, `feat/contender-zoom` @ `60fa2cb1`, **DIAGNOSIS ONLY**). The racer cut
  at the top edge on ice-track seed 9 is **1.60 body lengths back and directly behind the leader on
  the same lane** — he fails BOTH conditions, so this is not a rule violation, and **no contender is
  sliced in that race at all** (0 of 274 frames). A non-contender is sliced on **70.9%** of
  photo-finish frames pooled; including the sliced one whole costs a median **12.1%** more width
  (21.3% for that frame, worst 44.4%). **Two instrument corrections:** the slice test required the
  centre to be inside the frame, so it classified the very racer he pointed at as "outside"; and
  `contender-truth.mjs` grades its own reconstruction of the contender set rather than the
  director's, so its **3.4% understates — against the director's actual set contenders are sliced on
  7.6%** of frames. "Push fully out" is available on 97.5% of cases; the other 2.5% sit nearer the
  centre than a contender, so it cannot be a blanket rule.

- [ZOOM-PACE-5.md](ZOOM-PACE-5.md) — **the cap arrives instead of appearing, and the probe stops
  lying** (2026-08-14, `feat/contender-zoom`, **NOT merged, nothing minted**). **The probe first:**
  `_binding` was the argmin over `_ceilings` while the corridor cap is applied afterwards, so it
  named `line` on every frame the cap decided the shot — the defect behind three wrong causes and two
  no-op builds. It now names the term the delivered zoom is equal to, whatever stage produced it, and
  at prog 0.9701 it reads `line -> corridor-cap`. **Shape (b) was built first and FAILED:** hanging
  the cap on the run-in's continuous progress flattened the leap and let the cap ESCAPE the finish
  shot — OVERVIEW's `visibleCorridors` 1.5 → 0.469, caught by four convergence tests — because the
  run-in composes during OVERVIEW and LEADER_ZOOM too. **So (a):** scope stays PHOTO_FINISH, the
  onset gets a duration (`corridorCapArriveMs`, 1500 ms, one Dev Screen control). The ×4.057
  single-frame step is **gone**; the inward move spreads from 467 ms at −2.912 shrink/s to 1400 ms at
  about −0.93, and the run-in's wide opening is preserved (2006 px). **And the cap now costs
  nothing:** contenders not whole 3.4% with the cap nulled vs 3.4% with it arriving, against master's
  10.3% — CONTENDER-ZOOM-1's 57.3% → 81.7% was the shock plus the wrong yardstick, as the owner
  suspected. verify PASS 18 FAIL 0.

- [ZOOM-PACE-4.md](ZOOM-PACE-4.md) — **the leap is MY corridor cap switching on, and the `binding`
  probe was lying** (2026-08-14, `feat/contender-zoom` @ `b29e8a68`, **built, graded, REVERTED**).
  The corrected part 1 — easing the anchor's destination across a state change — works mechanically
  (the forward fraction now interpolates 0.564 → 0.500 instead of snapping) and **does not flatten
  the leap**: 467 ms, shrink/s −2.912 → −2.915, flow 565 → 632 px/s. Reverted. **The real cause, at
  true frame resolution:** `guaranteed` is 10.02 while `ceilings.line` is 3.03 — a `Math.min` above
  one of its own terms — because CONTENDER-ZOOM-1's `guaranteed = Math.max(guaranteed, _corridorCap)`
  switches on the frame PHOTO_FINISH is entered. The run-in ceiling moves only ×1.225 across that
  frame and `resolveCamera` never widens at all. **`_binding` is the argmin over `_ceilings`,
  computed BEFORE the cap is applied**, so it reports `line` on every frame the cap actually decides
  — which is why ZOOM-PACE-1, -2 and -3 each named a different wrong cause and two builds measured as
  no-ops. Fix the probe first. The repair is to give the cap a duration, but two prior questions are
  the owner's: whether the cap survives at all (it ships OFF for costing participants), and whether
  it should engage on a state predicate rather than the run-in's own progress.

- [ZOOM-PACE-3.md](ZOOM-PACE-3.md) — **part 1's premise is refuted: it is the ANCHOR that steps, not
  the zoom** (2026-08-14, `feat/contender-zoom` @ `4349e5d1`, **NOTHING BUILT — product source
  untouched**). Part 1 was built as specified — easing `stateZoom` across LEADER_ZOOM → PHOTO_FINISH
  — measured, and found to be a **complete no-op**: every phase byte-identical, because the binding
  term through the crawl and the leap is `line`, so `stateZoom` is never the minimum and easing it
  eases a number nothing reads. Reverted rather than left as dead code. **The step is in the ANCHOR:**
  `_forwardFracNow()` climbs smoothly 0.343 → 0.563 and then **snaps to 0.500**, because LEADER_ZOOM
  is a FORWARD state and PHOTO_FINISH a CENTRED one — the run-in interpolates toward a destination
  that belongs to the state, and at the state change the destination moves. The anchor jumps, the
  room to the line jumps, and `pointGuarantee` returns a ceiling 4.1× tighter with no change of
  binding term. Part 2 remains the right shape and is better aimed (the crawl is `pointGuarantee`'s
  1/distance hyperbola — flat then vertical — so hold-then-close addresses crawl and leap together);
  part 3 is unaffected; the corrected part 1 is to give the FORWARD FRACTION a duration.

- [ZOOM-PACE-2.md](ZOOM-PACE-2.md) — **he is right about which phase, and I was measuring the wrong
  thing** (2026-08-14, `feat/contender-zoom` @ `24cd7c8f`, **DIAGNOSIS ONLY**). Corrects
  [ZOOM-PACE-1](ZOOM-PACE-1.md), which stands as written. **Zoom per second is not what an eye
  judges**; measured in screen flow and log-rate of the visible width, **phase 1 is the only stall** —
  95 px/s and −0.129 shrink/s held for 3.6 s, immediately after the shot opens to its widest of the
  endgame (2048 px of world). What ZOOM-PACE-1 called the stall, phase 3, runs at **306 px/s** and
  phase 5 at **462** — among the busiest stretches on screen, motionless only in a table of zoom
  rates. **The run-in ceiling is one monotone curve** — 1.2 → 1.5 → 2.0 → 2.3 → 3.8 → 6.7 → 29.0 → ∞
  — so the flat foot and the leap are the same rule, answering the objection that the thing opening
  the shot to 1.5 cannot also be holding at 9. **The trigger is a 4.1× step in the run-in ceiling
  itself** (target 2.40 → 9.95 with `line` binding on both sides), caused by `stateZoom` stepping
  9.10 → 17.06 at LEADER_ZOOM → PHOTO_FINISH and propagating through it — neither an argmin corner
  nor the state term taking over. The acceleration rule must fix the 1→2 boundary; phases 3, 5 and 6
  should be left alone.

- [ZOOM-PACE-1.md](ZOOM-PACE-1.md) — **the pace is a STATE STEP, not an argmin corner**
  (2026-08-14, `feat/contender-zoom` @ `2adba27f`, **DIAGNOSIS ONLY — nothing changed or minted**).
  The owner sees the endgame zoom go in slowly, stall, then rush. **Both offered hypotheses are
  refuted:** the contender set's extent does not collapse (83 → 78 world px, its ceiling Infinity on
  0 of 274 frames), and the argmin corner fires **once** in 909 frames. **The dominant cause is a
  state-zoom STEP** — `stateZoom` jumps 9.10 → 17.06 in one frame at LEADER_ZOOM → PHOTO_FINISH,
  producing +16.34 zoom/s against the slow stretch's +0.23, a 34× spread. The corner is real but
  secondary (+7.75/s), and the 2.3 s "stall" is the run-in ceiling holding ~9 while the state has
  already asked for 17. **The stall and the final rush are PRE-EXISTING** — master has both, slightly
  larger — so they are not a regression of the contender work; what this arm owns is the entry, **11×
  sharper than master** (16.34 vs 1.42 zoom/s) plus the plateau that follows. On river-run 2814 it is
  invisible because the guarantee holds the shot at 1.74 and there is almost no zoom travel to have a
  pace in. Four options named with costs; the closed "arrive at the line" variant is worth
  re-measuring because the ordinary zoom it undershot has itself moved. Instrument:
  `scripts/zoom-pace-truth.mjs`.

- [CONTENDER-ZOOM-1.md](CONTENDER-ZOOM-1.md) — **the corridor is the wrong quantity in BOTH
  directions** (2026-08-13, `feat/contender-zoom` off master `5d4079c3`; **NOT merged, nothing
  minted**). The owner's corrected rule: the contenders decide how tight the photo finish closes and
  the corridor width is a MAXIMUM. Three findings, and each changes what can be built. **(1)
  `endgameCorridorFloor` is not on master** — it lives only on the unmerged `feat/front-group`, so
  there was no floor to turn round, and the crossing shot is ALREADY at the ordinary zoom (median
  100%). **(2) The contender set holds exactly two and cannot hold more**: gate, capture and
  consumer are all pair-shaped, while **26 of 27 photo finishes have more than two racers level at
  entry — median 12, up to 20 of 20.** Widening it needs a definition of ABREAST the project does
  not have; both existing thresholds (0.03, 0.05) admit most of the field, so **no number was
  invented and the decision is his**. **(3) The corridor cap ships OFF because it measurably costs
  participants** — it moves the zoom on 3955 of 7441 frames and takes level-racers-not-whole from
  57.3% to 81.7%, because a width bound only constrains ACROSS while a zoom change moves both ways
  and the participants are strung out ALONG the road. With FRONT-GROUP-7, which found the same
  geometry from the opposite side, **the corridor width is wrong in both directions.** Built and
  kept: `contenderGuarantee`, which is `pairGuarantee` exactly at two — proved by all three
  fingerprints being byte-identical at the shipped default.

- [RESOLVE-CONVERGE-1.md](RESOLVE-CONVERGE-1.md) — **a widening step has to buy something** (branch
  `fix/resolve-converge` off `master`; **NOT merged, nothing minted — his eye is owed on ice-track
  seed 9**). `resolveCamera` widened 10% at a time to frame the pan target and never asked whether
  the steps helped; where the world-bounds clamp holds the target at the world edge they cannot, so
  the loop ran to the projection floor, handed over the whole world, and left the target further
  outside than it started. It now takes a step only when the step strictly reduces how far outside
  the inner frame the target lands — a comparison, not a threshold. **The up-front "is it
  reachable" test was rejected on evidence**: there are two clamped regimes and where the world
  already FITS the frame widening genuinely helps, which a test written from the other regime would
  have got wrong. Measured over 172226 frames per arm: with `runInShot` OFF the loop fires **0**
  times before and after, so **CAMERA and RENDER are byte-identical on master** — the off-arm promise
  holds, which is the opposite of what the block expected and is measured rather than assumed. With
  it ON, **276 futile frames, all on ice-track, all delivering 100% of the world against a 75% ask**,
  and the loop converged on **zero** frames in any arm. Ice-track's delivered width now follows the
  line down through 68.7% instead of pinning at 100%.
- [SCOREBOARD-SLOT-LAYER.md](SCOREBOARD-SLOT-LAYER.md) — **THE PLACES ARE DRAWN ONCE; ONLY THE NAME
  TAG MOVES** (branch `feat/scoreboard-slot-layer` off `669a1a5b`; **NOT merged — a visible surface
  awaiting his eye**; all four fingerprints unchanged). The owner's own design: the badge column —
  crown, `#2`, `#3` … with gold/**silver**/bronze — becomes a STATIC layer built once per race, and
  the racers become CARDS whose content never changes, so the rank stops being a React prop entirely
  and is written straight onto the element as a `translateY`. **Proven rather than argued: a
  `MutationObserver` over 25 s of a 100-racer race recorded 728–833 mutations and EVERY ONE was
  `scoreboard-card:style` — zero text, zero structure.** The browser's own CDP counters say what that
  buys: **14 layouts per 100 frames — exactly one per cadence tick — become 1**, and mid-race layout
  time falls from ~17 ms per 100 frames to **half a millisecond**. At 250 ms the branch reaches the
  1000 ms reference (42.7 % missed vs 39.0 % in the packed phase, 4.7 % vs 0 % mid-race) where
  today's build sits at 82 % and 72 %, running the pack at 30 fps against this one's 60. **Both of
  the owner's visible defects were established as OLDER than this line of work before anything was
  touched**: master clips `#100` identically (3529.3 px of rows against his 665 px window, versus
  3533.3 on the transform branch — 4 px APART, and the transform branch is the less clipped), and the
  28 px badge box is overflowed by every two-digit place, not only by `#100`. Both fixed here: the
  HUD is capped at the window with a scrolling rows viewport (`#100` and `#140` fully visible at the
  scroll end; the page stops overflowing at all), and the badge column takes ONE width from the field
  size — 28 up to `#9`, 32 to `#99`, 40 to `#999`. **Pixel parity at an 8-racer field caught a real
  difference**: every icon, number and name identical and every BADGE changed, because text inside a
  composited layer is antialiased in greyscale; compositing the static layer too puts it back at 0
  pixels differing by more than 8. **Two inherited claims corrected by re-measurement**: the row is
  31.333 px at 1.5× and 32.000 at 1×, so `ROW_PITCH_PX` was never "height plus the 4 px margin" and
  that margin has been inert since the rows left the flow. **Two method findings worth keeping**: a
  perf bench inside the OneDrive-synced tree is not measuring the code (one run stalled 1016 ms), and
  headless Chromium does not advance the race at all.
- [SCOREBOARD-TRANSFORM-ROWS.md](SCOREBOARD-TRANSFORM-ROWS.md) — **THE STAIRCASE IS FLATTENED TO
  ZERO** (branch `feat/scoreboard-transform-rows` off `afdf130a`; **NOT merged — a visible surface
  awaiting his eye**; all four fingerprints unchanged). The rows now keep a STABLE place in the
  document — racer order, never re-sorted — and the ranking travels as `translateY((rank−1) ×
35.333px)`, so a rank change moves nothing in the document and nothing below it is laid out again.
  **ESTABLISHED FIRST, in a real browser**: the rows were in normal flow, so they had to come out of
  it; and **row height is uniform at 31.333 px across all seven shapes that could differ** (crown,
  `#100`, no race number, finished with/without a time, ellipsised name) because `.sb-name` is
  `nowrap` — had that come back non-uniform the approach was dead. A separate `.scoreboard-rows`
  container holds the absolute rows, **because the header is a flow child of `.scoreboard`** and
  rows anchored there would draw over it. Verified at 100 rows with shuffled ranks: every gap exactly
  35.333, **zero overlaps**, document order ≠ drawn order. **MEASURED, idle, 6 rotated batches, 5400
  frames/arm: staircase 0.73–0.76 ms/frame (flow) → −0.01 / 0.08 (transform), and missed frames
  1.204 % → 0.056 % at 500 ms — 21×.** The per-batch pattern is the result: flow is usually zero and
  then has an EPISODE (one batch 4.41 ms/frame with 65 drops, another 3.20 with 13); transform reads
  zero in nine batches of ten. **And the cadence question dissolves: with the transform, 250 ms and
  500 ms are identical (3 drops in 5400 each) — the lively list becomes free.** **HONEST LIMITS**: a
  separate LOADED run (uncontrolled, something else on the machine) shows only ~a fifth fewer drops
  and **no staircase separation** — this helps when the deficit is the list's own layout, not when
  something else owns the CPU; the per-changed-row REPAINT remains, as predicted, because `#5`→`#4`
  is a text change; and the pitch is font metrics that **neither node nor jsdom can re-derive**, so
  the guard pins the CSS inputs and the constant instead. Parity extended to compare the row **as
  drawn** (sorted by y), since array position stopped being visual position.

- [SCOREBOARD-STABLE-ROWS.md](SCOREBOARD-STABLE-ROWS.md) — **HIS SHAPE, BUILT: 101 ROWS REBUILT PER
  TICK BECOMES 36** (branch `feat/scoreboard-stable-rows` off `024b58c3`, with `feat/frame-gap-1`
  merged so one log measures everything; **NOT merged — a visible surface awaiting his eye**; all four
  fingerprints unchanged). The owner's own diagnosis, implemented: the four fields that never change
  during a race (index, icon, name, race number) live in ONE identity object per racer, created once
  and **never mutated**; the three that change (rank, finished, finishTimeMs) are passed as
  **primitives**; the row is memoised. **THE TRAP, handled explicitly**: rank is a primitive prop and
  never written onto the shared identity, so a racer moving 5th→4th changes a value memo compares —
  had the rank been stored on the identity, memo would have seen the same reference, skipped, and
  frozen the standings silently. **MEASURED, real React (every earlier bench used hand-rolled DOM and
  could not answer a reconciler question): 101.4 row bodies per update → 36.1, and 7000 row renders
  per 15 s → 2519, down 64 %** — a count, so ambient noise cannot move it. **THE HONEST OTHER HALF:
  the frame-time arms do NOT separate** — quiet run all three arms 0 missed / 7200 with `rafLate` p90
  0.5 flat, loaded run all three bad together. One early unrotated arm showed the old shape at 5.89 %
  missed with `rafLate` p90 13.5; **it did not reproduce, and the obvious "first arm after a fresh
  mount" explanation was tested and refuted too**. `commitMs` was captured and deliberately NOT quoted
  as React's cost — under the concurrent scheduler most of it is waiting for a slot. **TESTS**: the
  memo trap in both directions with a BEHAVIOURAL skip probe (a counting getter on the identity), and
  a parity test that drives a real seeded race and compares what the row displays, field by field,
  every tick, against the old expression written out verbatim — plus a sabotage arm. **The old row
  read its rank from the MAP INDEX, not the `rank` field it was handed**, which the parity test had to
  match. **The sort is untouched and has no tiebreak**: equal `t` falls back on `Array.prototype.sort`
  being stable over racer index, true before and after. **WHAT IS LEFT**: reordering keyed DOM nodes
  still costs, and that floor is what remains. The cadence default is untouched at 500.

- [SCOREBOARD-CADENCE-1.md](SCOREBOARD-CADENCE-1.md) — **ONE NUMBER, AND THE RATE FALLS AT LEAST
  PROPORTIONALLY** (branch `feat/scoreboard-cadence-1` off `570a8505`; **NOT merged — a visible change
  awaiting his eye**; all four fingerprints unchanged). FRAME-GAP-3 named the standings list; this
  makes its cadence a setting — `scoreboardIntervalMs` in `DEFAULT_FRAME_TIMING_CONFIG`, shipped at
  **500** (was a hard-coded 250), band 100–2000 with one home, a Dev Screen number box plus one-click
  250 / 500 / 1000 buttons. **The cadence was read in exactly ONE place**, so there was no second copy
  to reconcile; the bucket stays in PHYSICS time so the list ticks with the race through slow-motion.
  React untouched, no memoisation, contents unchanged. **MEASURED, production bundle, 9
  order-randomised batches, 8100 frames per arm: 250 ms → 0.185 %, 500 ms → 0.086 %, 1000 ms →
  0.012 %**, with `rafLate` p90 **4.3 → 1.6 → 0.7 ms** — at 1000 within noise of the 0.6 floor
  FRAME-GAP-3 measured with the list hidden entirely. **250→500 is proportional (2.1× for 2×);
  500→1000 is 7× for 2× — BETTER than proportional.** So the frequency dominates and the per-tick cost
  does not: **the memoisation priced in FRAME-GAP-3 is NOT indicated by this data**, which is the
  cheaper of the two answers. **The arm order is rotated per batch** because the first attempt had one
  batch where all three arms were bad at once (including 1000 ms at 0.78 %) — ambient noise that a
  fixed order would have read as "250 is worst". **Honest caveat**: FRAME-GAP-3 pooled 0.78 % for the
  same 250 ms arm against 0.185 % here — absolute rates are not comparable across sessions, only the
  within-session ratio is. **Priced, not built**: the row reads six fields, four of which never change
  during a race, so emitting a narrow record plus `React.memo` needs no change to the row's markup —
  under an hour, orthogonal to the cadence, and justified only if he picks 250 for feel and still
  drops frames.
- [FRAME-GAP-3.md](FRAME-GAP-3.md) — **IT IS THE STANDINGS LIST. THE BACKGROUND LAYER COSTS NOTHING,
  AND THE PREDICTION WAS WRONG** (branch `feat/frame-gap-3` off `80f772fe`; **diagnosis only, no
  source file changed, React untouched**; all four fingerprints re-run and unchanged). FRAME-GAP-2
  hid two things at once; this separates them and changes nothing else — the `aside` is never hidden,
  only the `.scoreboard` inside it, so `cssBox` is **identical in all four arms** (FRAME-GAP-2's A-off
  moved it 1021×575 → 1037×583, a confound now removed). **Eight batches of 900 frames at the large
  window, three at the small.** **ARM 2 (background layer present, list hidden) IS EXACTLY THE FLOOR**:
  `rafLate` p90 **0.6 ms in eleven batches out of eleven**, **zero missed frames in 9900** —
  indistinguishable from arm 4, so the owner's predicted culprit is refuted in the strongest form the
  design allows. **ARM 3 (list present, bg hidden) is elevated in every batch** (`rafLate` p90 1.4–4.0
  against the 0.6 floor) and produces missed frames where arms 2 and 4 produce none. **NOT
  OVERCLAIMED**: arm 1's 56 misses are dominated by one batch of 48; excluding it, arm 1 (8/6300) and
  arm 3 (6/6300) are the same — the list reproduces essentially the whole effect alone, and the
  background layer only occasionally amplifies it. **THE RATE IS STILL NOT REPRODUCED**: worst arm
  5.33 %, pooled 0.78 %, against his 40 % — **fifty times short** across ~40 000 measured frames.
  **No long tasks inside any measured window** (the single ~4 s entry per arm is the harness's own
  scene build), so the missed vsyncs are NOT ≥50 ms JS blocks. **THE CULPRIT NAMED**: `setScoreboard`
  fires every 250 ms and hands React a fresh 100-element array via
  `[...st.racers].sort(...).map((r,i) => ({...r, rank: i+1}))` — every row gets a new object identity,
  so all 100 keyed rows re-render and re-order; the other three in-loop setState calls are guarded by
  change checks or fire once. **Fix named, not built**: cut the 250 ms cadence (one number), or stop
  minting new row objects and memoise the row. The background canvas — a second `<canvas>` at
  6144×4096 whose `style.transform` is rewritten every frame — **measured free, so there is nothing to
  fix there**, which is the useful half of a refuted prediction.

- [FRAME-GAP-2.md](FRAME-GAP-2.md) — **PRODUCTION REPRODUCED THE 33 ms FRAME, AND IT IS THE PAGE
  AROUND THE CANVAS** (branch `feat/frame-gap-2` off `860f3a05`; **diagnosis only, no source file
  changed, React untouched**; all four fingerprints re-run and unchanged). FRAME-GAP-1 could not make
  a 33 ms frame and therefore could not locate one; **the dev-bundle doubt was worth testing and it
  paid.** In a minified production build, page shown, large window: **`total` p90 33.4 ms with
  `rafLate` p90 13.2 ms** — exactly one missed vsync, with the time spent before our code ran — and
  the same batch with the page hidden: **16.8 ms, `rafLate` 0.8**. **THE SECOND FINDING CORRECTS
  FRAME-GAP-1**: in production the DOM's cost **scales with window area** — at the small window it is
  **zero** (0.7–0.8 vs 0.6) — while the dev bundle charged a flat ~2.3 ms at BOTH sizes and so masked
  the area-dependent part. FRAME-GAP-1 demoted arm A on both counts; **both were dev artefacts**.
  **The distribution is the finding**: A-off is stable at 0.6–0.8 everywhere, A-on at the large window
  runs 1.0 … 3.5 with a tail to 7.1, 7.2 and 13.2 — the page does not add a fixed cost, it adds a RISK
  of a large one. Honest limit: **1 event in ~19 arms, not his sustained 40 %**, so the mode is
  reproduced and its rate is not; a "first arm after a fresh page build" hypothesis was tested and
  **refuted** (2.0 / 2.2 / 1.5). Also measured: **the dev bundle costs a third of physics** (p50
  3.4 → 2.2–2.6), and his own reported 2.6 ms is the PRODUCTION number. **Not separated**: the arm
  hides the standings list and the 6144×4096 background layer together — that split is the next
  measurement, and it is his call. 5173 left on `feat/frame-gap-1` with the instrument.

- [FRAME-GAP-1.md](FRAME-GAP-1.md) — **`other` IS SPLITTABLE NOW, AND THE SPLIT SAYS THE 29 ms ARE NOT
  WHERE WE LOOKED** (branch `feat/frame-gap-1` off `570a8505`; **diagnosis only, nothing fixed**; all
  four fingerprints unchanged and engine-reach clears all four changed paths). **A NEGATIVE RESULT,
  reported as such.** Two of three arms moved nothing beyond the run-to-run spread; the third — the
  DOM around the canvas — moved `rafLate` p90 from 0.8–0.9 ms to 3.7–4.3 ms, **real and repeatable
  (±0.5 ms spread) but one fifth of the 16.6 ms gap, and it does NOT scale with window area**, which
  is the one property his own experiment proved. **`total` p90 never left 16.7–17.0 ms in any of ten
  arms**: the harness never reproduced a 33 ms frame, at either window size or either DPR, so it can
  say where the time is NOT and not where it is. **B (canvas CSS stretch) refuted** — pinning the box
  to 1280×720 changes `rafLate` by less than that arm's own ±1.2 ms spread. **C (window area) not
  reproduced** — three times the area moves `total` p90 by 0.1 ms. **THE INSTRUMENT IS THE DELIVERABLE**:
  `rafLate` (callback entry minus the rAF timestamp — the half of `other` no draw-code change can
  shorten) and a `longtask` PerformanceObserver whose `supported` is THREE-VALUED, because "no long
  tasks" and "this browser cannot see long tasks" are opposite conclusions; his Chrome 151 supports
  it. **Next suspects, in order: React** (100 keyed rows reconciled 4×/s plus four state setters
  called from inside the rAF loop — work that runs in a different task, which is exactly where
  `rafLate` hides, and the one thing this harness deliberately lacks), the dev bundle, the real
  6144×4096 JPEG, his browser profile. **PIECE 0**: origin 48 branches → 1, local 48 → 1, worktrees
  4 → 1, four empty `docs/` dirs gone, every deleted tip SHA recorded first; both uncontained branches
  verified dead before deletion (one carried only two leftover conflict markers). **37 stale
  `.git/worktrees/` admin dirs cannot be pruned** — OneDrive ReparsePoint placeholders, EPERM.

- [CEREMONY-COUNTS-GENERATED.md](CEREMONY-COUNTS-GENERATED.md) — **THE SENTENCE WAS SPLIT, AND ONE OF
  THE THREE NUMBERS WAS WRONG** (branch `feat/ceremony-counts` off `feat/post-start-hold-unify`; docs
  and tooling only, no engine file touched). Declined last night because a generator would have had
  to own the ARGUMENT and not just the number; the fix is to split them — the assertion stays as
  prose above and below the markers, and what is inside is arithmetic and nothing else. Every
  sentence split cleanly, so nothing was left typed. **THE PAYOFF WAS IMMEDIATE: the document said
  86 and the answer is 88.** The closure (20) and the folder count (106) were both right; the third
  was computed as `106 − 20`, and that subtraction is invalid because **the closure is not a subset
  of the folder** — `camera/lapUtils.js` is inside `camera/` and `client/src/utils/mathUtils.js` is
  outside `modules/`. The generator takes the intersection and the block NAMES those two, so the
  argument below it is checkable rather than assertable. (`103 − 19 = 84` was wrong the same way.)
  **SAME MECHANISM, ONE FLAG APART**: same script, same markers, same `writeVerified` — but the two
  blocks are asked DIFFERENT questions, because a cost cannot be recomputed without paying it (so
  `--check` can only ask how old it is) while a count can (so its check asks whether it is right).
  `npm run verify` runs `--check-counts`, asserted in `verify.test.mjs`; `routing.mjs` gains its
  second explicit generator name, and this is the sharpest case for why that list is names and not a
  `gen-*` wildcard — run bare, this one spends five minutes running six guards before it writes.
  **A DEFECT FOUND BY THE NEW TEST IN THE FILE IT WAS TESTING**: importing the module ran all six
  guards and REWROTE the tracked `docs/SHIP-CEREMONY.md`; same defect and same `IS_ENTRY` fix as
  `verify.mjs`, and the test went 114 s → 0.8 s. That accident is why the cost numbers moved here —
  re-measured deliberately afterwards, world 120 → 72 s, camera 39 → 22 s, render 32 → 22 s, which is
  a quieter machine and not a faster guard. Plus the one `docs/README.md` line: the four empty
  directories are not in the repository at all.

- [POST-START-HOLD-UNIFY.md](POST-START-HOLD-UNIFY.md) — **THERE WERE NEVER TWO CLOCKS. THERE WAS ONE
  CLOCK AND ONE DEAD PARAMETER** (branch `feat/post-start-hold-unify` off `feat/canvas-scale-1`; not
  merged; **WORLD `dc4647be0f55ebdb` unchanged**). His decision was to unify, and the constraint was
  that the planner sits inside the engine so unifying could pick a different winner. **It could not,
  because the planner's clock was never wired**: `config.postStartHoldMs ?? 0` resolved to 0 on every
  race ever run — **none of the five callers of `createRacePlan` passes that key** (raceCore,
  sim-fairness, goldenRunner, both diag harnesses), so the floor `Math.max(0, x)` has never bound.
  **THE CORRECT MEANING IS THE CAMERA'S** — a DURATION added to the 3 s overview, so the hold ends at
  3000 + the value — and every independent statement of the key says so (the `+` in CameraDirector,
  the defaults comment, the tooltip, CAMERA_DIRECTOR.md); the planner's absolute-from-zero reading
  had no support and was **3000 ms wrong on its own terms**. **BUILT: the dead reading is removed** —
  byte-identical for every duration, track and seed by construction, and re-measured to say so.
  **MEASURED ANYWAY, because he may still want it wired properly**: a floor at 3000+7000 = 10000 ms
  would make the world **`792299983c98d25d`**, binding on **6 of 10 tracks** (it binds whenever a race
  finishes under **66.7 s**) and changing the outcome on **5** — space-sprint's boundary moves a full
  second and its outcome hash does not, which is why this was measured rather than argued. That is a
  REBASELINE and it is his. **A FALSE CLAIM CORRECTED**: `check-fallback-agreement.mjs` justified its
  exception with "raceCore sets postStartHoldMs in the plan config" — it does not; entry removed, and
  the worklist got shorter by being worked. **NOT RENAMED, with a reason**: the camera loader rebuilds
  the config key by key, so a rename silently discards his stored value; instead all three sites now
  state what the key measures. Two tests changed rather than deleted — the floor test is **inverted**
  into "the planner does not read a camera key".

- [CANVAS-SCALE-1.md](CANVAS-SCALE-1.md) — **A RENDER-SCALE SLIDER WAS BUILT, MEASURED AND DROPPED;
  THE LAYOUT COUPLING IT EXPOSED IS WHAT SHIPS** (branch `feat/canvas-scale-1` off `f69f66fb`; **all
  four fingerprints unchanged — it draws exactly what master draws**). **THE CANVAS HAS NEVER BEEN
  DPR-AWARE**: `devicePixelRatio` appears nowhere in `client/src`; the backing store is a hard-coded
  1280×720 that CSS stretches to the wrapper. On his machine (DPR **1.5**, canvas CSS box 1058×595 =
  **1587×893 device px**) that means the shipped picture is **already upscaled ~1.5× in area** — no
  DPR headroom to cap, only sharpness to spend. **MEASURED, AND THE MEASUREMENT KILLED THE SLIDER**:
  100 racers on mountainstreet, total 16.7/16.8 ms at every scale; 1.00 → 0.50 saves ~0.4 ms of
  physics-p90 and ~0.5 ms of render-p90 — **under 1 ms of a 16.7 ms frame**, so the owner dropped it
  rather than keep code that earns nothing. **AND IT REFUTES THE MECHANISM**: `clearRect` clears a
  CONSTANT 1280×720, so shrinking the window cannot have shrunk it; his own experiment reproduced
  with the store held fixed moves the brackets by the same ~1 ms; and the 6144×4096 (25.2 Mpx, **27×
  the race canvas**) background layer, re-transformed every frame, was added as a suspect and changed
  nothing. The harness never reproduced a 33 ms frame at all — **his ~29 ms lives in `other`, which no
  `perfLog` bracket contains**. **WHAT SHIPS IS THE FINDING UNDERNEATH**: `index.jsx` handed the
  renderer `canvas.width/height`, and the renderer spends that on **LAYOUT** — name-tag font, minimum
  drawn racer size, label-layout box, minimap, HUD column. Correct only because the store happens to
  equal the reference; a coincidence, not a rule, and one that fails silently. It now passes the
  reference constants (a no-op today, and the render fingerprint says so), guarded by
  `render-layout-separation.test.mjs` in both directions — that the two arguments really drive
  layout, and, sabotage-proven by text, that the call site passes the reference. The 430-line
  multi-scale invariance test went with the slider. **Two harness findings kept**: drawing a frame is
  NOT read-only (`racerRendering.js` appends to `r.trail` while painting), and `/race` is behind a
  login only he has, so no in-app measurement is possible without him.

- [FINISH-COMPANY-1.md](FINISH-COMPANY-1.md) — **THE COMPANY GUARANTEE RETIRES ONCE THE COMPANY IS HOME** (branch `feat/finish-company-1`, his proposal built; **his eye pending**). **§1 — WHY FINISHED RACERS WERE EXCLUDED, answered before overturning anything**: blamed to `cfd47cd5` (CAMERA-COMPANY-1), where the guarantee was introduced — **deliberate, not an accident** (that block lists "finished racers are not company" among its fifteen tested properties), but **the reason is recorded nowhere**. **It is NOT a stale-position problem, and that was measured rather than read**: over 60 frames after crossing, the first six finishers advanced `t` by ~0.010-0.012 and moved **62-75 world px** — they run out past the line with live, trustworthy coordinates. So option B was viable and worth asking about. **§2 — BOTH MEASURED, AND B IS REFUTED**: on his marked race and on dirt-oval, baseline widens for **54 / 58 frames** down to 2.9752 / 2.9592; **A (stop once leader+N are home) gives 0 / 0 widening frames**, holding the setting 4.5489 exactly; **B (count finished racers as company) is slightly WORSE — 55 / 59 frames, widening FURTHER to 2.8760 / 2.8443**. **The reason B fails is the fixed anchor**: FINISH_OVERVIEW centres `finishOverviewLookbackPx` BEHIND the line, so finished racers run out AWAY from it exactly as stragglers fall back from it — counting them adds more distant company instead of satisfying the promise. The intuition that it "resolves itself" assumes the anchor is where the racers are; it is deliberately not. **A and B differ on every measured race**, so the simpler-if-identical branch does not apply. **THE TRADE, as a picture rather than a number**: with A the last back-marker sits **11% inside the frame instead of 23% (city) / 50% (dirt) — still ON SCREEN on both, nearer the edge, not cropped**. **CHANGE**: one condition in `_setTargets` — the company ceiling is skipped when `_inFinishMode && finishedCount >= 1 + minRacersVisible`. Scoped to the finish deliberately, since nothing is finished during the race, so the branch cannot fire and the guarantee elsewhere is untouched; `minRacersVisible` and `companyGuarantee` are both unchanged. **Tests in both positions** — enough finishers stops the ceiling, too few still binds, the threshold follows HIS number (4 is enough at 3, not at 5), and mid-race with the same field it still binds, which is what proves the scoping. **A DEFECT FOUND IN MY OWN TOOL AND FIXED HERE**: `npm run verify` **told this block the diff could not reach a `ctx.` call** and skipped the render fingerprint — which had moved. The `isRender` matcher, copied from the ceremony's list, omitted `modules/camera/`; of course a camera change moves the drawn frame, since the director decides the transform every frame. Matcher and routing test fixed — the tool made its own failure visible, which is what it was built for. camera `6480c2e0b2f612b5` -> **`00cafa2432add0f7`**, render `b6591e74102152bd` -> **`1f83ecc1fcb6fa9a`**, both on purpose; **world `dc4647be0f55ebdb` unmoved** (nothing in engine-reach's closure was touched, which verify stated as its reason for skipping it). Suite **3645**. **Noticed**: the ceremony's own render-fingerprint list has the same omission, since that is where the matcher came from.

- [FINISH-SWING-1.md](FINISH-SWING-1.md) — **THE LATE SWING IS THE COMPANY GUARANTEE, AND IT IS OLDER THAN THE BRANCH** (diagnosed from his marker on `a505ecf6`; NOT repaired; all three branches then merged to master `9f988c70`). **REPRODUCED FRAME-FOR-FRAME** from his identity (City Circuit, n=39, motorbike, seed 5601, cam seed 882842572, his stored config): his marker read `z 3.218059 / ox -1912.477`, the repro hits `z 3.2160 / ox -1959.9` at frame 5040. **He was right that the camera was still moving.** **CAUSE, with its location**: `_setTargets()`'s `guaranteed = Math.min(stateZoom, _guaranteeCeiling, _companyCeiling)`. The finish move LANDS at frame 4904 (zoom 4.5489, offset -2835.9, dPan 0.0) and stays at rest for **96 frames / 1.6 s**; then `guaranteed` falls away from `stateZoom` — 4.5489 -> 2.9752 — while `stateZoom` never moves, and the camera follows it at ~30 px/frame. **The COMPANY guarantee (`minRacersVisible`, default 3) is doing it**: FINISH_OVERVIEW holds a FIXED point behind the line, and as the tail straggles in (finishedCount 32 -> 38 across exactly those frames) the three nearest racers to that point get further away, so the shot widens to keep three in frame. **PROVED BY THE SWITCH, NOT THE STORY**: at `minRacersVisible: 0` the widening disappears completely (4.5489 / -2835.9 held to the last frame, dPan 0.0). **OLDER THAN THE BRANCH**: the same probe on `b363bd94` — before FINISH-SEAM-1, FINISH-MOTION-1 and FINISH-WINDOW-1 — shows the identical widening from the same finishedCount. He is noticing it now because **the jump that used to dominate the moment is gone and what was always underneath is the loudest thing left**. So nothing was repaired: fixing it inside a branch he had already passed by eye would have moved fingerprints under his verdict. **HIS CONFIG, two answers**: (1) despite the much stricter 0.025 / 0.966, the marked race still took the **PHOTO-FINISH path**, not the ordinary one the brief expected; (2) **both keys are live and govern DIFFERENT moments — neither is an ignored orphan**: `finishDramaDurationMs` (900) is the camera HOLD before the zoom-out ("Finish pause (ms)"), `finishPauseMs` (4000) is the delay after the LAST finisher before the leaderboard. What he should set for the beat he means is the 900. **A naming collision I introduced and own**: FINISH-WINDOW-1 relabelled `finishDramaDurationMs` to "Finish pause (ms)", which now reads confusingly close to the neighbouring "Pause after last finisher" — the tooltips distinguish them, the labels no longer do. **MERGES**: finish-window-1 (CI `31038147958`) -> verify-cost-1 -> verify-fast-1, `--no-ff`, in that order; master `9f988c70`, all three deleted at origin, script suite 150/150, world `dc4647be0f55ebdb` unmoved. **RECOMMENDATION, not taken here because it is a taste question**: freeze the guarantee once the finish move lands (FINISH_OVERVIEW is an authored final shot and the guarantee exists to stop a LIVE shot going empty) — versus leaving it, since the widening does keep the arriving stragglers in frame, which is what he likes about the lookback point. Build the first behind a gate and let his eye decide; it moves the camera fingerprint, so it needs its own block.

- [FINISH-WINDOW-1.md](FINISH-WINDOW-1.md) — **THE INSTRUMENT REACHES THE ENDING, THE PAUSE APPLIES TO IT, AND GOES TO ZERO** (FINISH-MOTION-1 merged first as `597f3bdc`..`e2ad9cfd` on his eye-PASS, CI `31029634655`; this work on `feat/finish-window-1` @ `3b08937a`, PR #127, **owner's eye pending**). **STAGE A — the render window stopped at frame 3400 and the finish sits at 3330–5587**, so it had never seen the photo finish, the zoom-out or the lookback — the region where FINISH-MOTION-1 found a 2708 px jump and three false comments that survived every refactor. RUN_FRAMES -> 5600 plus ten late points chosen against a **MEASURED phase map** (new `--phases`, running the harness's own loop, not a copy). **ADDITIVITY PROVED NOT ASSERTED: 5600 frames with the original six points reproduces `73ba53ba9fea12c7` exactly**, so the hash move is attributable purely to the new points. **COVERAGE MEASURED (new `--coverage`): 9/10 tracks now sample the finish shot, a mid-zoom-out frame AND the resting frame**; the tenth is garden-path, whose race never finishes at all. Cost **28 s -> 77 s**, and the breakdown matters — the longer LOOP is ~43 s of it and the ten extra drawn frames only ~7 s, so the loop is where to spend if it must get cheaper. That table also produced stage B's first answer for free: **`FINISH` never appears on any track**. **STAGE B1 — the decomposition, with HIS settings**: of the time from crossing to zoom-out, **(1) the drama pulse is 0 ms / 0% — it NEVER runs**, **(2) the shot holding for the pair is 382 ms mean / 100%** (0–984), **(3) `PHOTO_FINISH`'s absence from `ALL_STATES` contributes 0 ms** (real as an unreachable setting, but `decideFinishPhase` HOLDs regardless of any hold gate — so the "stop there" rule did not fire). **A FOURTH CONTRIBUTOR THE BRIEF DID NOT LIST RECONCILES THE NUMBERS**: `photoFinishSlowmoFactor` 0.5 halves the physics rate for the whole shot, doubling (2) in wall clock — city-circuit's 984 ms becomes ~1.97 s, which IS his "one to two seconds". **STAGE B2 — the pause now runs on the photo-finish path on the same dial, and "the triggers are home" means THE TWO CONTENDERS**, not `finishedCount >= 2`: measured, they differ by **6–57 frames on all 9 tracks and on 5 of 9 the second racer across is NEITHER of the pair** — so the old condition could end the shot **before the pair it exists to show had both crossed**, making this a repair as well as his request. It is a pause and not a cut because the decision returns the state the camera is already in (a repeat: nothing re-enters). Winner text still fires (it triggers on the frame the shot resolves away), and the slow-motion releases at the pause start so the beat and the zoom-out run at normal speed. **VERDICT ON THE SEAM: four lines of decision plus one switch case** — the precedence was already written down, so inserting a phase between the shot and the aftermath required re-deriving nothing. **STAGE B3 — 0 to 5000, and the bound lived in TWO places, both in the Dev Screen** (the `min` attribute AND the onChange guard); the resolution path was checked and is clean (`??` passes 0 where `||` would not). **0 means ZERO FRAMES, not one, on BOTH paths** — a naive expiry-at-`ts` would still burn a frame entering and leaving a pulse, so the pulse is skipped entirely. Tooltip rewritten and the label is now "Finish pause (ms)"; it had said "the LEADER_ZOOM pulse at the first finish crossing", untrue in both halves after B2. **STAGE C — MEASURED, NOT CHANGED, and the non-default value is the whole point**: at the shipped 300 px the contract already holds on all 9 tracks (**settled error 0–26 px, zero forward drift**), but at 450 ice-track is out by **276 px** and at 600 by **508 px** with 317 px of forward drift, because `resolveCamera`'s world-bounds clamp holds the camera back rather than frame world that does not exist. **Honouring it means showing beyond the track edge — his design decision — so the block reports the per-track limit instead of repairing it.** The test drives **480 and 240, never 300**, each against its own expectation plus an L203 pair proving they land in different places; pinned to the default it would have passed on a build ignoring the slider. **A BUG OF MY OWN, caught by my own test and recorded**: `index ?? null` turned an unknown contender into "nobody to wait for", ending every shot on its first frame — now the project's index+ref dual lookup, with an unresolvable contender counting as NOT home. **FINGERPRINTS, per commit**: A moves render only (`73ba53ba9fea12c7` -> `1da1a5b392879293`, a longer run not a changed picture) with camera unmoved; B/C move both (camera `ab731df15724ab5d` -> **`6480c2e0b2f612b5`**, render -> **`b6591e74102152bd`**); **world `dc4647be0f55ebdb` UNMOVED throughout**. Suite **3641**. **PROPOSALS**: (P1) the pause tooltip is fixed here and the zoom-out floor should drop to ~150 ms but **NOT to 0** — a zoom-out of 0 is a CUT, the one thing FINISH-MOTION-1 existed to remove; (P2) the start/first lap is thinner but **the argument does NOT transfer** — the ending was unsampled _and_ was where a known defect class lived, and the honest trigger for extending again is "a defect was found where the fingerprint cannot see", which has not happened there; (P3) the contenders finding generalises — the shot had a LOCK and judged its end on a GLOBAL COUNTER, so check whether COMEBACK's lock does the same; (P4) the lookback slider goes to 1000 px while values above ~400 silently stop being honoured — same shape as the dead Photo Finish dials, and the fix is to SAY so where the value is set (the director already computes `wasClamped`). **Owner's eye: Dirt Oval then City Circuit, his photo-finish values, three checks at the moment the pair shot ends — and read the build pill (`3b08937a`) first.**

- [FINISH-MOTION-1.md](FINISH-MOTION-1.md) — **THE FINISH IS ONE MOTION, NOT A JUMP AND THEN A ZOOM** (stage 1 merged to master `597f3bdc` `--no-ff` with full history, CI run `31026093097`, all three fingerprints unmoved; stage 2 on `feat/finish-motion-1` @ `a65c013c`, PR #126, **owner's eye pending**). The owner: at the crossing the camera JUMPS toward the pursuers and only THEN zooms out; he wants one slow travel with the zoom. **MEASURED BEFORE ANYTHING WAS CHANGED** — new read-only harness `scripts/finish-motion-truth.mjs` (real director via the shared driver, records the change in `offsetX/offsetY`, which ARE the renderer's translation, so nothing is reconstructed): the pan stepped **2708 px in ONE frame on dirt-oval, 144x the median of the frames before it**, and 1411–3132 px on 9 of 10 tracks. **THE BRIEF'S HYPOTHESIS IS HALF REFUTED AND THE DECOMPOSITION IS WHAT SETTLES IT**: `camT` barely moved (1.9393 -> 1.9400) so the T-anchor did NOT jump; `dTarget` was **2820 px** while the offset-vs-target lag was only 112 px, so the pan TARGET moved and this was not a lagging offset snapping onto a stationary one; the director's own probe shows the resolved camera position moving **396.7 world px** while the anchor it frames moved **6.5**. So the jump is at the predicted moment and quantity but **the named line is not the culprit** — `followsCamT` overrides that lookback assignment, so the target was never the lookback point; the brief's repair would have fixed nothing. **THE ACTUAL CAUSE IS THE EXEMPTION**: FINISH_OVERVIEW was the ONE state held out of the transition grammar (on the reasoning that it "already had" its own zoom-out), which left it on the entry path where `offsetX` is PINNED to `targetOffsetX` every frame by design — **a pinned offset cannot absorb a moving target, it reproduces it exactly**. **REPAIR**: the finish glides like every other transition, so pan and zoom share ONE smoothstep ease and "at the same time" holds BY CONSTRUCTION rather than by tuning two mechanisms to agree; it takes its duration from `finishOverviewZoomOutDurationMs`, the knob that already meant exactly that — **one finish move, one shape, NO new knob**. Deliberately outside `transitionGrammar` (a 'cut' finish is not a thing anyone wants). **RESULT**: entry-frame jump **0.0 px on all 9 measurable tracks**, peak per-frame motion **2708 -> 72 px** (dirt-oval) and **1551 -> 162** (mountainstreet) while **TOTAL travel is unchanged** (8708 -> 8619) and the peak moves from frame +0 to **frame +90, the exact midpoint of a 180-frame move** — the same journey in the same time, redistributed from a step into a travel. **THE RESTING FRAME IS MEASURED IDENTICAL ON EVERY TRACK** (0/0/0/4/8/26/0/0/0 px from the lookback point, before and after): a first attempt copied the ordinary glide's `observerPhase='follow'`, which switched OVERVIEW's FORWARD framing on and **moved the resting frame 108 px — a quarter of the widest shot** — measured and rejected, because his complaint is how the camera GETS there. **THE RUNOUT CONSTRAINT IS NOW STRUCTURAL**: releasing `_camT` means the winner is not the anchor at all, replacing a `fT = null` special case one function away, asserted by a test that moves the winner 0.3 laps past the line. **THE FALSE COMMENT WAS THREE, and together they are L201 again** — one intent in three representations: the claim that the pan glides "in parallel with the zoom-out" (the T-anchor did; the screen did not), `_transitionTargetT = lookbackT`, and a **permanent unrestored mutation of the shared `_lfEntryByState[OVERVIEW]`** expressing the same duration as an exponential TC. All three proved dead by byte-identical harness output before removal. **TESTS**: 3 mechanism-tests INVERTED into 5 PATH tests — no jump on frame 1 **paired with "and it does move later"** (a camera that never moved would pass the first half perfectly), intermediate frames strictly between and strictly increasing, pan and zoom within 0.1 of each other, the duration stretching BOTH halves, and the runout unable to pull it — **all five verified failing against master**. Camera fp `7a33faf2ec131437` -> **`ab731df15724ab5d`** (on purpose, re-minted in both canonical homes); world `dc4647be0f55ebdb` UNMOVED; **render `73ba53ba9fea12c7` unmoved AND THAT IS A GAP, NOT A PASS** — the harness runs 3400 frames and samples to 3300 while the finish occurs at frames 3466–5218, so **the most authored moment in the game is entirely outside its coverage**; it could not have seen a change. Suite **3634**. **PROPOSALS**: (P1) this is a fourth SIGHTING, not a fourth lesson — a lesson per sighting dilutes the canon, so append to L201 the sharper detection rule instead: **the tell is a comment asserting a behaviour the fingerprint cannot see**, and "pans in parallel" was unfalsifiable because nothing measured RATES of change; (P2) the finish as a named motion object (from/to/duration/ease) would turn his next three likely requests — hold a beat, end elsewhere, ease differently — into one field edit each, but **build it when a SECOND authored move appears**, not inside a block under eye test; (P3) the real finding is the instrument gap — a per-frame DERIVATIVE is a different measurement from a per-frame VALUE and this project had only the second, so a motion-continuity check across the whole race would likely find more of the same pinned-offset pattern at every T-space entry; (P4) **a fingerprint expected to move stops guarding everything that moved with it** — any re-minting block should name and measure one or two specific invariants that must NOT move (here the resting frame), which is the only reason the 108 px regression was caught. **Owner's eye: Dirt Oval or Mountainstreet, his photo-finish settings, watch the single moment the tight shot ends — and read the build pill first (`a65c013c`).**

- [BUILD-UNKNOWN-1.md](BUILD-UNKNOWN-1.md) — **THE BADGE COULD NOT READ, AND COULD NOT SAY WHY** (on branch `feat/finish-seam-1`; render `73ba53ba9fea12c7` unmoved — the badge text is pinned in the harness and `formatBuildLabel` is untouched). Amber `build unknown` on a running dev server, blocking the photo-finish eye test, because a verdict on an unidentifiable build is what cost this project two days already. **THE BADGE WAS WORKING AS DESIGNED** — BUILD-TRUTH-1 made it refuse to print a stale value with confidence and it refused; the defect was that it could detect its own failure and say nothing about it (`git()` discarded stderr via `stdio: [_,_,'ignore']` and its catch returned `''`). **TEN QUESTIONS, ONE REPRODUCTION, NINE REFUTATIONS, AND NO CAUSE**: reproduced by fetching the virtual module straight off the live server; then refuted — repository state (clean, one worktree, no `index.lock`), the plugin's own code (`readBuildInfo()` called directly returns the right sha), a latched-vs-live failure (**an edit AND its revert were both served, proving the watcher fires and `recheck()` runs**), `REPO_ROOT`, **the OneDrive/ReparsePoint condition** (a fresh server on the same tree reads correctly), resource exhaustion (1485 handles, 485 MB, 9.7 GB free), Defender ASR (no rules), PATH (**read out of the launching shell's real environment via MSYS `/proc/<pid>/environ`** — Windows-form and contains `C:\Program Files\Git\cmd`), and finally the environment as a whole (**all 104 inherited variables replayed into a fresh child — git works**). That is where an outside diagnosis stops, and **why it stopped IS the finding**: every experiment was an attempt to reconstruct information that had existed inside a `catch` block fifteen hours earlier and been thrown away on purpose. **THE FIX IS FOUR LINES AND THE CAUSE NAMED ITSELF THE MOMENT IT LANDED** — Vite restarts its config when a config dependency changes, so saving the edited plugin reloaded it into the still-running server, which then reported `exit 3221225794` = **`0xC0000142` = STATUS_DLL_INIT_FAILED**: the child process could not INITIALISE, git never ran. **Which is why stderr capture alone would not have been enough — the decisive datum was the EXIT STATUS**, the part the old code discarded most completely. Everything observed fits it and only it: bound to one process, that process otherwise healthy and still serving modules, persistent across fifteen hours, and **cleared only by restarting the process — Vite's own config-restart was not enough, because it recreates the server inside the same node process**. **WHAT IS NOT CLAIMED, stated as a limit**: `0xC0000142` has several underlying causes and the kernel counter was not observed, so the session-resource story (the plugin spawns THREE git children per re-check, throttled to 400 ms, for fifteen hours) is named as the leading suspect and not as fact. **NOT OneDrive — the backlog line is the OPPOSITE of the one the spec expected**, because a machine with a known flaky subsystem accumulates a pull toward that explanation and the cost of the pull is that the real cause goes unlooked-for. **TWO MORE DEFECTS FOUND BY WRITING THE TESTS, not by the incident**: a failing `status --porcelain` was reported as `dirty: false` — a clean tree it had never looked at, precisely the lie of omission the dirty flag exists to prevent — and the `|| 'detached'` fallback was DEAD, because git prints the literal `HEAD` and never empty, so the badge would have read `· HEAD` like a branch of that name. **The badge still never guesses**: no fallback identity source was added, `unknown` stays `unknown`, and the cause is deliberately kept OFF the pill (a second string on screen is a second thing to keep true). +9 tests driving a REAL git in real temporary repos from CHILD PROCESSES — a mock would have tested the mock when the whole failure class is what a spawned process does — L203 paired throughout, incl. a corrupt index as the honest lever for the half-known state (`rev-parse` succeeds, `status` refuses). Suite 3623 -> **3632**. **LESSON 204, the Mute-Instrument Law**: detecting a failure and explaining it are two features, and shipping the first without the second builds an instrument that can only ever say "no" — _if it breaks at 3 a.m. and nobody is watching, does the artefact it leaves behind name the cause? A colour is not an artefact; a status code is._ **PROPOSALS**: the dev server refusing to start on an unreadable identity (**not built — the argument against is exactly the fault we just had**, it would block the work of diagnosing it; both sides backlogged for the owner); stop spawning three processes per watcher event and read `.git/HEAD` directly (**backlogged as the fix to reach for IF there is a second occurrence** — one is an anecdote); and the observation that this is the third instrument-failure finding of the week, all one family. **Owner action: the dev server was stopped and restarted for him and the badge reads again — nothing blocks the eye test.**

- [FINISH-SEAM-1.md](FINISH-SEAM-1.md) — **THE END OF A RACE BECOMES SAYABLE** (branch `feat/finish-seam-1`, one source commit `9873c278`; base master `b363bd94`, tag `pre/finish-seam`). The finish sequence existed only as six latches and three if-chains split across `update()` and `_pickNextState()` — executable, not readable — and **two earlier blocks named this seam as the precondition for extracting the state selection and stopped at it both times**. **HARD GATE HELD: camera `7a33faf2ec131437`, render `73ba53ba9fea12c7`, world `dc4647be0f55ebdb`, all bit-identical**, and camera+render were re-measured AFTER the pre-commit hook's format pass, because a formatting run between the measurement and the commit measures the wrong tree. Suite 3562 -> **3623**. **THE MAP'S HEADLINE CONTRADICTS THE SPEC THAT COMMISSIONED IT, which is why the seam was takeable in one pass**: the spec (quoting CAMERA-HYGIENE-2) said the five finish latches "govern which shot is chosen AND how tightly it is framed" — verification says **NO**. All five decide the shot and the HUD label; **not one is read by any framing site**. The framing coupling is real but lives in **`_inFinishMode`, a SIXTH latch the list omitted**, which has five framing reads (the OVERVIEW zoom-out ease, the lookback anchor, the T-lerp suppression, the grammar exemption, plus a write to the lerp map). Those were left untouched, so §3b's stop rule never fired. **VERDICT ON THE STRUCTURE: ONE lifecycle, and the overlap is in the ENTRY, not the sequence** — approach -> the moment -> aftermath, cleanly terminating, but the moment has two mutually exclusive shots and one of those has **two entry doors ~400 lines apart asking the same closeness question through two copies of the same expression**; read either alone and you would conclude there were two lifecycles. `finishPhase.js` states all three acts as one ordered decision with 6 actions and **9 machine-readable reasons**, pure, naming no camera state; `evaluatePhotoFinishGate` MOVED here from `transitionDecision.js` (a finish question, not a transition question) and the three hold-gate bypasses came with it; every one of the six latch writes stays at the call site. **THE LATCH SPLIT WAS RE-CHECKED, NOT INHERITED, and is honest** — the pending flag is cleared for the pre-line door only, exactly as the original did, even though it is provably a no-op on the other, because relying on that proof inside the call site would make the code depend on an argument written in a report. **COVERAGE, and this is the finding that matters most**: before this block **`_inPhotoFinish`, `_photoFinishGateDone` and `_photoFinishEnterPending` had ZERO test references anywhere in the repo** — both doors, the ownership guard and the event-driven end were protected by **neither test nor eye**. +61 tests, L203 throughout (the once-only gate proven in BOTH positions: a later close pair cannot re-open it AND the same frame on a fresh director does enter; the drama window proven to end BY ITS DURATION SETTING, 1500 vs 5000 on identical frames), **three impossible orders** not one — both shots never run in one race (18-combination sweep), the pre-line door unreachable after any crossing, nothing follows FINISH_OVERVIEW. **THREE KNOB DEFECTS, MEASURED not read**: `PHOTO_FINISH.minStateHold` (1500) and `.maxStateDuration` (8000) are **DEAD** — `computeTimingFromConfig` hand-lists five states for maps a six-state enum feeds, so the director silently uses OVERVIEW's 5000/4000, and the Dev Screen renders both sliders anyway (doubly inert: the shot HOLDs regardless, so its duration is purely event-driven and has no dial at all); `COMEBACK_ZOOM.minStateHold` is double-homed and the per-state row LOSES to `comebackMinDuration` (5000 shown, 3000 resolved); `LEAD_CHANGE` is the same shape, hidden only because both homes happen to say 1500. **ALSO PINNED, NOT FIXED**: `forceFinishDrama` is true on every frame of a photo finish, so the recorded transition reason reads FINISH_DRAMA_FORCED on the frame the photo finish actually ends; and the lap-blind `photoFinishCloseThresholdT` gets a **reachability judgement rather than a repeat of the finding** — the modulo aliasing is real but very unlikely under the shipped ±10% band, and **the unit itself is defensible** (a photo finish IS a track-position question), which is stated rather than padded. Stale acceptance hash in `CameraDirector.js`'s own header fixed (`4b33c4d31bec93ea` -> `7a33faf2ec131437`, three fingerprints out of date, the value CAMERA_DIRECTOR.md already carried). Source **+201 lines and it says so** — this bought sayability, not line count. **PROPOSALS**: (P1) collapse the two doors by making the gate a per-frame predicate — kills the done latch, the pending flag AND the reactive door, with its two behaviour changes named as the reason it is a proposal; (P2) **why this seam resisted three times — the blocker was recorded as a fact about the WRONG LATCH and never re-measured**, so each attempt inherited a stop that, as stated, did not exist, giving the lesson _a recorded blocker is a claim with a location, or it is a rumour_; (P3) the cheapest owner eye test available — `photoFinishCloseThresholdT` to 0.15 and `photoFinishLeadProgress` to 0.85 makes **effectively every race take the photo-finish path**, no flag, no build, ten minutes to close the least-seen part of the camera; (P4) one L203 test over `CAM_STATE` x every per-state map would have caught all three knob defects the day PHOTO_FINISH was added — **not written here because it fails today on three counts**, and a failing test is a behaviour finding that belongs to whoever decides which home wins. **Owner's eye: nothing to look at** — three decisions waiting, none made here.

- [CAMERA-COMPANY-ONLY-3.md](CAMERA-COMPANY-ONLY-3.md) — **SHIPPED: THE ROAD STOPS BOUNDING THE LEADER SHOT** (merged to master WITH FULL HISTORY at `bf74d6ec`; tags `v-company-only-complete`, `archive/company-only`). LEADER, OVERVIEW and COMEBACK are limited by the owner's own setting and the COMPANY guarantee, and by nothing else. **His reason: the road is not who matters, the racers are.** **OWNER-APPROVED** on `exp/company-only` @ `d2ecc27c` (verified: branch tip, carries both the config key AND the guarantee-skip line), mountainstreet seed 5601, toggle ON, _"nein das passt"_ — **having seen BOTH regimes**, a torn-apart field where the guarantee opens the shot wide and a tight pack where the camera holds his 1.0. **His approval also covers the anchor-truth work** (§4a, §4c, stages 1a/1b), which had never had an eye test — **that debt is closed**. **THE LYING WITNESS, hypothesis CONFIRMED AND WORSE THAN STATED**: not two consumers of the frozen `__RA_COMMIT__` define but **THREE** — the HUD pill, the LIVE TRUTH line, and the camera MARKER, which is the artefact that started all of this by reporting `be649aa9` twenty-two hours stale. **BUILD-TRUTH-1 diagnosed the freeze, fixed the pill, tested the pill, and left the thing it had diagnosed still broken** — which is why CAMERA-COMPANY-ONLY-2 halted a shippable owner-approved block on its own falsehood. All three now read `RA_BUILD`; the define is REMOVED from vite.config.js so it cannot return; the `: 'dev'` fallback is gone because a frozen value and a placeholder are both lies. **The test is the RELATIONSHIP, not the artefact** — five assertions incl. that the three artefacts CANNOT DISAGREE; testing any one of them passed throughout. **CROSS-CHECK PASSED EXACTLY**: camera `1db71e7fffc1c9f6` -> **`7a33faf2ec131437`**, identical to the probe minted with his toggle ON, so nothing else moved with the fold. Render -> **`73ba53ba9fea12c7`**; **world `dc4647be0f55ebdb` UNMOVED — no engine touched all week**. CI green at origin BEFORE the merge (run `30997930991`); a PR was opened purely to obtain it, since `ci.yml` runs on nothing but master pushes and PRs targeting master, and the merge itself was `--no-ff` locally, never the GitHub button. **`corridorGuarantee` VERIFIED RATHER THAN ASSUMED — and the verification reports otherwise**: the PAIR fallback fired on **0 of 11,813 pair frames**, so it is DEFENSIVE, not load-bearing. Kept, still tested, and now documented WITH that measurement rather than left to mislead. **THREE TESTS INVERTED, not deleted**, because they were the record of the old behaviour: "a wide corridor widens a tight setting" became "a tight setting is DELIVERED on a wide road", "the guarantee scales with the real corridor" became **"THE SAME NUMBER MEANS THE SAME AMOUNT OF WORLD ON EVERY TRACK"**, and the outermost-lane failure proof now leans on the COMPANY guarantee at his own 5 instead of the road. **The inversion surfaced `MAX_CAM_ZOOM` (24.0) as the real limiter at the tight end** — 0.25 corridors delivers 85.29 px, not the nominal 75. **HIS OBSERVATION CORRECTS MY MEASUREMENT**: I reported the company guarantee binds ~0% at n=65 and recommended raising his 5 to 15; that held for the PACK case only — on a spread field it binds and widens a lot at 5. **His value stays at 5**, with the spread-field sweep owed before anyone changes it. **LESSONS 199-201** (the Overrule Law, the Window Law, the Half-Repair Law — argued with, and 201 reframed: a partial repair makes the system MORE confidently wrong, because the fixed reader vouches for the broken ones), **DEAD-ENDS §I** (the rejected unit redefinition, killed by his eye at searound 0.62/1.25 because a smaller window makes the world move faster — the measurements only agreed afterwards), **BACKLOG** five residuals. Suite **3580/3580**.

- [CAMERA-COMPANY-ONLY-2.md](CAMERA-COMPANY-ONLY-2.md) — **HALTED AT THE STOP RULE, with the HUD defect fixed** (branch `exp/company-only` @ `993fb0ed`; nothing pushed, nothing merged). The block was to fold company-only in as the behaviour and ship it on the owner's PASS. **IT DID NOT SHIP, because the spec's own §0 verification failed**: his live-truth line reads `commit=77919708`, and that build **carries ZERO occurrences of `companyOnlyFraming`** — it is from **05.08 00:37**, while the switch was not written until `efe9d28e` at **09:55, nine and a quarter hours later**. On that build the toggle did not exist in any form, so a race there showed TODAY'S behaviour. His _screenshot_ commit `0dd638c6` DOES carry it, so one artefact is from the right build and one is not, and **which one his PASS came from cannot be resolved from here** — because even on the right build, **the live-truth line records the build and the camera path but never says which guarantee ran**. Method: `git show <c>:defaults.js | grep -c`, plus `git log -S` to confirm `efe9d28e` is the sole introducer. `77919708` IS an ancestor of the branch — on it the way last week is on the calendar. **§2-§4 NOT STARTED**: a half-fold is worse than none, and every doc change in §4 asserts as settled the thing this report says is unverified. **HIS `anchor-truth` APPROVAL STANDS EITHER WAY and that debt is CLOSED** — §4a, §4c and stages 1a/1b are present in both builds, so whichever he was on, he saw them. **§1 THE HUD DEFECT WE INTRODUCED, FIXED**: confirmed at source first — the build pill occupied y 58-78 and `drawLapInfo` drew at y 66 with an 18 px font (66-89), both right-aligned, a **12 px overlap** exactly as his screenshot showed; two right-aligned rows in two files, each with its own hardcoded y, neither aware of the other. **Fixed as LAYOUT, not as a nudge**: new `hudLayout.js` is the single owner of the column, stacking rows in order with every height/font/gap a FRACTION OF THE FRAME — a row cannot overlap another because it is placed AFTER it. `drawLapInfo` became the pure `lapInfoText` and its drawing joined the stack, keeping its game look. **+12 tests across six canvas sizes and ALL SIXTEEN visibility combinations, verified by sabotage** (removing the stack advance fails ten). Render `b1c373da44de92f5` -> **`be429d35571f0fbd`** (intended); camera `1db71e7fffc1c9f6` **UNMOVED** as a render-only change must be; no mint tripwire (nothing under `modules/`). Suite **3574/3574**. **PROPOSALS**: the one-line `RaceScreen` fix (config read once at mount) means every A/B he has ever run was two races when it could have been one — the highest-leverage item on the list; pushing WIP would NOT have fixed my failed predictions (I had the tree, I just reasoned from source instead of measuring) but it would let HIM check me; and the live-truth line should name the **framing regime** in one token, because this halt exists precisely because **a PASS currently has no artefact** — a verdict without a build identity is not evidence and we have been treating it as one. **Needs: one race at `993fb0ed`+ with the toggle ON, and the build line read back.**

- [CAMERA-COMPANY-ONLY-1.md](CAMERA-COMPANY-ONLY-1.md) — **A SWITCH, SO HIS EYE CAN DECIDE** (branch `exp/company-only` off `anchor-truth` `7fef0c92`, never master, nothing pushed). The owner tested the unit change himself and **rejected it for a reason nobody had named — a smaller window means the world moves through it faster and the picture went restless** — which also revealed a virtue of the shipped unit: a FIXED amount of world means the same sense of camera speed on all ten tracks. So the unit stays; what is in question is **who may overrule his number**, and that is his eye's call, not a measurement's. **BUILDS NOTHING NEW**: the company guarantee already ran in the single-anchor states and already read his `minRacersVisible` — on wide tracks it was drowned out by the stricter corridor. One line lets it be heard, placed AFTER the PAIR branch so a pair state falling through to the corridor keeps it. **HARD GATE PASSED, CHECKED NOT ARGUED**: with the toggle OFF, camera `1db71e7fffc1c9f6` and render `b1c373da44de92f5` **BIT-IDENTICAL**, world `dc4647be0f55ebdb` unmoved (mint tripwire fired). ON = **`7a33faf2ec131437`**, minted as a **PROBE VALUE, not a baseline**, behind a `--company-only` flag that is off by default so the ceremony still runs the untouched path. **M1 REFUTED, AND IT IS THE HEADLINE**: the prediction was that four narrow tracks would not move; **three did** — dirt-oval 1.299x, city-circuit 1.438x and garden-path 1.444x all go **FLAT**, only searound was unchanged. The model "the corridor never binds on narrow tracks" was wrong: it binds up to **56.3%** of frames on garden-path, and the real threshold sits **between searound's 131 px and dirt-oval's 178 px**, not at any intuitive notion of narrow. **M2 CONFIRMED EXACTLY**: mountainstreet LEADER **300.0 px constant, breath 2.294x -> 1.000x**, nine of ten tracks flat at 300. **M3 THE PRICE, with a surprise**: road-edge-out-of-frame frequency roughly doubles (mountainstreet 45.9% -> 70.0%) but the **WORST CASE IS IDENTICAL ON EVERY TRACK** — the worst moments come from the tracking lag and the world-bounds clamp, which the corridor guarantee never controlled. **And the control number is the argument: even with the guarantee fully active the road edge is ALREADY out of frame 45.9% of the time on mountainstreet — the thing he would give up is only half delivered.** **M4 HIS REAL KNOB**: at his `minRacersVisible 5` the company guarantee binds **~0%** — inert, not merely quiet; **15 recommended** because the MEDIAN stays exactly his 300 px on every track while the camera opens on 5-49% of frames; at 20 the median leaves 300 on dirt-oval, i.e. it overrules him by a different door. His value NOT changed. **MID-RACE FLIPPING CHECKED AND FOUND IMPOSSIBLE** — `RaceScreen` does `useState(() => loadCameraConfig())` with no setter, so a Dev Screen change never reaches a running race; the two-race version is given instead, and the one-line screen fix is proposed but not built. **Default OFF and stays OFF until he says otherwise. Owner's eye pending — five things to look at, §7.**

- [NIGHT-1.md](NIGHT-1.md) — **THE BUILD YOU ARE LOOKING AT, AND WHAT YOUR UNIT ACTUALLY COSTS** (branch `anchor-truth`, six commits, nothing pushed). **STAGE A — WHY HIS MARKER LIED, measured not guessed**: `__RA_COMMIT__` was a Vite `define`, resolved ONCE when Vite loads its config — i.e. when the dev server STARTS. The dev server had run since **04.08 00:24:15**; `be649aa9` was committed at **00:23:39, thirty-six seconds earlier**. So the badge froze there and stayed through camera-hygiene-2, the render fingerprint, the merge and CI-AUDIT-GREEN-1, while at his 21:59 marker the tree was `3b857d05` — **twenty-two hours and nine commits away**. **A CORRECTION TO THE SPEC'S REASONING**: its second signal cannot do the work claimed, because `anchor-truth` DID NOT EXIST at 21:59 (first commit 22:45) — the 429.8 px cross-check was guaranteed by the clock; the stale build string is the real and separate defect. Honest answer to "has anyone rebuilt since the merge": **nobody has run `vite build` since 31 July**, and it did not matter — nothing serves `dist/`. **THE FIX IS THE MECHANISM, NOT THE BADGE** (a badge that can lie is worse than none): `virtual:ra-build` is read from git at module load and invalidated **with a full page reload** whenever the identity changes, with `.git/HEAD`+`.git/index` added to Vite's watcher because a commit changes the identity without touching a tracked file. **PROVEN LIVE**: with the server running, an untracked file flipped the served value to `dirty:true` and removing it flipped it back — the old `define` could not have done that. Render `a10bf3f293f2ee06` -> **`b1c373da44de92f5`** (the move PROVES the instrument sees the new pill); camera `1db71e7fffc1c9f6` and world `dc4647be0f55ebdb` UNMOVED (mint tripwire fired). The harness gets a **fixed synthetic** identity on purpose — the hash must detect DRAWING changes, not count commits. **SETTINGS SURVIVE**: his eleven values through the real loader, 6 tests, incl. the silent-drop precondition (the loader iterates DEFAULT keys, so a renamed key would drop his value with no error). **C3 — THE PREDICTION HE WAS GIVEN STANDS**: mountainstreet LEADER median **564.0 px** vs "roughly 550". **BUT THE BREATH IS THE FINDING**: 300.0 -> 688.1, **2.294x**, guarantee overriding his setting on **96.2%** of frames — _larger_ after §4a, because an honest guarantee binds harder. **B2 — HIS UNIT MAKES IT WORSE, the opposite of the expectation** (and needs NO code change to test: `referenceWidthFor` returns max(ref, TW), so setting the reference to the track's own width IS his unit): searound breath **1.000x -> 2.032x** with the guarantee going **0% -> 100%**, dirt-oval 1.299x -> 2.190x, city 1.438x -> 2.190x. His unit asks for a SMALLER shot on narrow roads, dropping below what the corridor allows — **the CORRIDOR GUARANTEE is what overrules him, not the unit**, which makes "his unit + COMPANY guarantee" the decisive untested arm. **CAUTION CONFIRMED**: at n=65 `minRacersVisible 5` barely binds, so that arm would be FLATTERED — it must be swept by field size. **B3 — THE ROAD IS NOT UNEVEN**: all ten tracks exactly their declared width at all 200 samples, **max/min 1.0000**, so "per section" is INSURANCE, not present work. **B6 — the 1.82x/1.384x discrepancy SETTLED as a scope difference, neither wrong**: same statistic, different arm — defaults 1.384x, his settings 564/300 = **1.88x**; the lesson is that a uniformity number is meaningless without naming the arm. **STOPPED AT A STAGE BOUNDARY**: C1/C2 pictures (no rasteriser — the harness is a recording context and there is no `canvas` package), B1/B4/B5, D, E and F NOT done, each with its reason. **Owner's eye: the badge is live on the running dev server.**

- [CAMERA-ANCHOR-TRUTH-1.md](CAMERA-ANCHOR-TRUTH-1.md) — **THE FRAMING MEASURES FROM WHERE THINGS ARE** (branch `anchor-truth`, five commits; tag `pre/anchor-truth` `c299fdf7`). Three defects measured during the refactor and never repaired turned out to share ONE root: **the framing computed from an idealised point at the frame's CENTRE instead of from where the anchor actually sits.** **STAGED SO THE ORDER IS THE PROOF** — Stage 1 held **both** fingerprints BIT-IDENTICAL at both its commits (run, not argued from "docs cannot move a hash"), so every later movement is attributable to a named Stage 2 commit. **STAGE 1a**: the first ~85 lines of `update()` — five OR-ed exits plus the hold gate — become `decideTransition() -> {action, reason}`, pure, assigning nothing; the call site keeps every action and every `this` write. **Precedence IS behaviour** (first match won, fixed order) and is pinned by five ordering tests. The photo-finish gate's honest split was checked rather than assumed: the predicate is all questions, both latch writes stay at the call site, and `close` implies `evaluated` — the property that makes the mapping exact, with its own test. `CameraDirector.js` 2487 -> **2493 (+6)**: this bought TESTABILITY, not line count, and says so. **STAGE 1b**: both STALE ARCHITECTURE camera sections DELETED (not rewritten — one canonical home), with `finishOverviewLookbackPx` (300) MOVED to CAMERA_DIRECTOR.md as the one thing with no home, and the entry-zoom invariant deliberately NOT moved because its mechanism _and its failure mode_ are both gone (an ARGUMENT, labelled as one); `deploy.yml` KEPT and given a header stating it has never run; BACKLOG gains "Before the VPS migration" holding the four facts — server audited by nothing, deploy.yml's blockers, the RA_PUBLIC_ORIGIN placeholder, no build identifier — **recorded, not fixed**, framed by the owner's answer that the server runs only on his machine. **§4a THE CORRIDOR**: `corridorGuarantee` divided by the frame's chord THROUGH ITS CENTRE while the company and lateral guarantees already measured from the anchor. Measured first with a new observer reading the director's own probe (not a reconstruction): **promise broken on 69.0% of corridor frames, spread 1.384x, mountainstreet median 0.781 corridors and 100% broken** -> after: **41.6%, spread 1.080x, mountainstreet 0.999**. **THE RESIDUAL IS DECOMPOSED, NOT HIDDEN**: against the shot the guarantee SIZED, broken is **12.1%** with 8/10 tracks at exactly 1.000 — so the ~29pp gap IS the tracking lag (§4c agrees independently) and the 12.1% is the world-bounds clamp + lateral shift, which `anchorScreenPoint` deliberately does not model. **Centred-anchor equality asserted EXACT to 10 dp at every 1 degree on all three projections** (and every pre-existing corridor test is that same proof by default), plus widen-only (L192) and both-sides-fit. **FLAGGED BEFORE THE EYE TEST per the spec's own proposal**: median shot widens 7.7% but **seatrack +28.7%, mountainstreet +27.9%, river-run +22.3%, garden-path +17.7%** — the owner's values were tuned against the buggy ceiling. **§4b POINT-VS-NOSE: HYPOTHESIS REFUTED, NOTHING SHIPPED** — before-number **0.238%** (215 of 90,237 guaranteed-subject frames), the spec's own pre-registered stop; `pairGuarantee` already pads by the drawn body and COMPANY_FRAME_PCT 0.9 was sized against exactly this. Instrument kept anyway (§9.4). **§4c THE OVERVIEW LAG, decided by measurement**: median **13.78 pp -> 6.78 pp** (arm 1 reproduces the 25.2 pp already on record, which is how we know the instrument measures the same thing); `trackingTC` 1.5 -> **0.25**, no slow state left. **`entryTC` deliberately NOT changed** — arms 2 and 3 differ by **0.09 pp** because the metric samples the TRACKING phase and cannot adjudicate entry, so changing it would be taste dressed as evidence; the missing instrument is named in the code. **Closes a gap CAMERA_DIRECTOR.md §6 named in those words** ("change a trackingTC default and no test notices") — +4 tests, **verified by sabotage**. **Mint tripwire fired and was checked: world `dc4647be0f55ebdb` UNMOVED.** New branch baselines **camera `1db71e7fffc1c9f6` / render `a10bf3f293f2ee06`**, written into the ceremony table. Three deviations declared by the author first, incl. that the §4c tooltip requirement COULD NOT have been violated (it renders the live value) and that the spread figure is 1.384x rather than the spec's 1.82x, with the definition named rather than the number adopted. **Owner's eye pending — five items, §8.**

- [CAMERA-MERGE-1.md](CAMERA-MERGE-1.md) — **THE CAMERA REFACTOR LANDED ON MASTER** (merge `87961ca6`, 41 commits / ~20 blocks / four days, **with full history — not squashed**, because several blocks CORRECT earlier ones and that record is how this project reasons about itself). Master's previous tip `e5f0afa6` was a strict ancestor — 41 ahead, ZERO behind — so there were no conflicts. **THE THREE FINGERPRINTS, NOW ON MASTER**: **world `dc4647be0f55ebdb` UNMOVED** (four days of camera work left the physics untouched, proven on master rather than a branch), camera `4b33c4d31bec93ea` and render `ae7e9243bd2add8b` get their master baselines. Suite 3494/172, eslint clean, all three guards pass. No engine ceremony owed; the world mint is the exception that proves it. **OVERVIEW-FRAMING-1 CONFIRMED GONE, NOT ASSUMED**: the owner-rejected feature is an ANCESTOR of the branch, so the merge removes nothing — the branch did, block by block. All six of its named identifiers (`overviewFrameRacers`, `overviewMinSpriteFrac`, `_setOverviewGroupTargets`, `_clampCentreToBounds`, `_applyOverviewRadialOffset`, `overviewOffsetPx`) have **no reachable definition or caller**; the only four surviving mentions are NEGATIVE ASSERTIONS that keep them deleted. The report and its INDEX entry stay — deleting the record of a rejected experiment is how a project forgets why it rejected it. **WHAT THE MERGE SURFACED**: no conflicts, but `docs/ARCHITECTURE.md` describes a camera that has not existed for months — “five director modes” (there are six), **“the highest-weight candidate wins” (flatly wrong since CAMERA-WEIGHTS-1: it is a weighted DRAW followed by a propensity ACCEPT)**, `battleIsolationPx: 300` in pixels when isolation has been an arc fraction since 15b, plus `_frozenBattleGroup`/`_setOpenTrackTargets`/`_leaderPhaseZoomFloor` which no longer exist. Both sections HEADED as stale with the wrong claims named — not rewritten, since that is a docs block of its own and the planner is on HANDOFF/CAMERA.md in parallel. Dated log entries in BACKLOG/ROADMAP/AUDIT/LESSONS checked and correctly left alone. **TAGS**: `archive/camera-refactor` (`202772c2`) permanent, branch deleted; the fifteen `pre/*` return tags STAY VALID and stay registered — a merge with history does not orphan them, and TAGS.md now says so because it is the obvious thing to doubt. **§5 lists what is now open on master as normal work** — nine camera/render items (the finish-lifecycle seam, the tracking lag, point-vs-nose, the corridor guarantee's centred-anchor assumption, the fallback-vs-default divergence, the world-bounds clamp, seeding Start Race, `observerPhase=follow` at `grammar=glide`, the render fingerprint's three blind spots) and four engine-parked ones (sprite normalisation with its row-count effect, the 285 cap, the eleven lap-blind sites, the racer-name coupling). That list is the difference between the refactor ENDING and the refactor being ABANDONED. **Owner's eye: none needed.**
- [RENDER-FINGERPRINT-1.md](RENDER-FINGERPRINT-1.md) — **THE PICTURE BECOMES A MEASUREMENT** (branch `camera-refactor`; tag `pre/render-fingerprint` `9ae13a4e`). **NEW INSTRUMENT: `RENDER ae7e9243bd2add8b`** — the render path's first change detector, closing the hole CAMERA-HYGIENE-2 §5.7 named as structural. Camera `4b33c4d31bec93ea` and world `dc4647be0f55ebdb` unmoved; mint tripwire fired and was checked. Suite 3477 -> 3494. **RECORDS DRAW CALLS, NOT PIXELS**: a stand-in 2D context hashes the SEQUENCE — sprite identity/position/size, text, styles, transforms, order — so there is no rasteriser, no GPU, no font rendering, the baseline holds on any machine, and the exact-vs-tolerant question dissolves. **THE FEASIBILITY ANSWER WAS ITSELF THE FINDING, and it is SPLIT**: every drawing MODULE already took `ctx` and was drivable; the SEQUENCE was ~210 lines inside RaceScreen's rAF callback closed over **62 free identifiers — 42 of them live component state, including 7 React refs, a state setter and DOM access** (measured, not estimated). That is why the render path had no protection: it was not built to be checkable. **SEAM BUILT, DECLARED AS A DEVIATION** — `renderRaceFrame(ctx, frame)`; the alternative was a harness reproducing the call order, i.e. an instrument measuring a COPY, which is the failure mode this repo has hit six times. React/DOM keep the bg-canvas transform, the countdown setter and the perf log. **PROOF 1 STABLE**: 3 identical runs plus a COLD START from a fresh worktree, separate process, different cwd. **PROOF 2 SENSITIVE, and the FAILED sabotage is the block's best result**: one-pixel sprite move MOVES it; **battle-focus darkening removed MOVES it** (the exact case the camera fingerprint could not see); dropped name tags MOVES it; but swapping `drawParticles` ↔ `drawSurfaceTrails` did **NOT** — both layers are no-ops in the harness because their buffers are filled by the component's loop. Chasing that turned up a second gap: **`drawImage` is called ZERO times in the whole run** (node has no `Image`, so `drawRacer` takes its procedural fallback). Both are now stated in the script header, the report and the ceremony rather than left to be discovered; a re-run swapping two layers that DO draw moves the hash. **COST 30 s** vs the camera fingerprint's 83 s — cheap enough to be routine, which was the spec's own test. **CEREMONY**: new THE THREE FINGERPRINTS table in SHIP-CEREMONY.md; run it on any diff that can reach a `ctx.` call. **ALSO**: `PHASE` had THREE homes (index.jsx plus `PHASE_RACING = 1` twice in the drawing modules) — one now; render-state seeding and the BATTLE focus-fade rule shared with the harness so it cannot invent a frame the browser never produces; 21 orphaned imports pruned; 17 new recorder tests including four for the sprite path the harness never reaches and one pinning the artwork BLINDNESS. **STILL UNCOVERED, now three specific items instead of one vague one**: the sprite blit, particles/trails, and the rasteriser+artwork — each with a named fix. **Owner's eye: none needed, this block draws nothing new** — but note the new hash is a BASELINE, not a confirmation.
- [CAMERA-HYGIENE-2.md](CAMERA-HYGIENE-2.md) — **THE UNATTENDED NIGHT — COMPLETE** (branch `camera-refactor`, eight commits `58396c9f`..`a4d82b55`; tag `pre/camera-hygiene-2` `be649aa9`). **Camera fingerprint `4b33c4d31bec93ea` BIT-IDENTICAL at all eight commits**; mint tripwire fired twice (defaults.js, Dev Screen), shipped world `dc4647be0f55ebdb` unmoved. Suite 3460 -> 3477. Finishes everything HYGIENE-1 parked. **THE EXTRACTION**: `CameraDirector.js` **2935 -> 2487 (-15.3%)** via four modules, each defensible in one sentence — `detourRecorder.js` (the named seam; the instrument owns its buffers so 'never writes a camera value' is structural, not a comment), `battleGroup.js` (who is fighting whom — pure, was reachable only through a constructed director), `comebackDetector.js` (who is coming through the field — owns the rank history; the camera LOCK stays behind), `framingConfig.js` (every framing default and validation band, one home). **FOUR SEAMS REJECTED AND ARGUED**: state selection (nearly taken — blocked by five finish-lifecycle latches that framing also reads; the honest prerequisite is extracting the finish sequence FIRST, named as the next block's first move, worth ~250 more lines), the transition machinery (owns THE state, and its correctness IS an ordering that a file boundary would hide), timing-config flattening (churn: ~120 read sites to shorten something dull), and the marker seam — **already clean, traced and shown: 11 one-line getters, nothing marker-shaped left**. **DEAD**: sixteen duplicated timing fallbacks (each with exactly ONE repo occurrence — its own declaration), `clampActiveCount`/`clampActiveAxes` (a literal 0 for two blocks, with a comment claiming it still watched the glide and a test asserting it), the detour log's candidate C (three columns recording that a deleted mechanism did not happen), **twenty per-state timing scalars mirroring the maps — forty numbers that had to agree with twenty, read only by their own assertions**, seven write-only fields (including the two that made HYGIENE-1 read LIVE controls as inert), a duplicate `observerPhase` getter, and `_getBattleFocusRacer` (dead production code whose only caller was its own test). **THE FLAKY SUITE, found and fixed**: CAMERA-WEIGHTS-1 made weights a propensity, which turned **eighteen** gate tests into coin flips — measured by forcing the RNG to both extremes, COMEBACK alone fails 2.6% of runs, union ~1 full-suite run in 10, and it failed twice this night. **HUD columns 2+3 FINISHED**: `spritePctOfCanvas` + `cameraTransitionSeconds` removed (measured: moves NEITHER fingerprint, so HYGIENE-1's caution was over-cautious) — after which **all 75 keys have a live reader**; **three tooltips were LYING**, each quoting the code fallback instead of the shipped default (outcomePhase 75 vs 65, minStartGap 40 vs 25, maxCurrentRank 10 vs 20); and the **'Adaptive Zoom Floor' heading described a deleted mechanism above an empty container**. **TESTS**: 1 deleted (could not fail), 3 dead assertions dropped, 1 replaced by the property it was reaching for, 17 added — the detour recorder's non-interference (the claim the fingerprint script RELIES on and nothing asserted), `framingConfig.test.js` for two bands with NO coverage (`referenceCorridorPx`, the unit everything is measured in; unknown `cameraTransitionGrammar`), and the `detectBattleGroup` contract with RaceScreen — **all three verified failing by sabotage**, and the first draft of the contract guard PASSED against `detectBattleGroupRenamed?.(` because `toContain` is not a rename guard. **DOCS**: CAMERA_DIRECTOR.md rewritten (it described a two-month-old camera; its config table deliberately NOT replaced — a duplicated table is the same divergence shape this block deleted from source), camera-target-architecture.md headed SUPERSEDED (**two of its findings are now INVERTED** — a reader would have 'fixed' the deliberate lateral pin), a FOR/NOT-FOR header on every camera file, and `zoomUnit.js`'s import moved out of the middle of its header. **LESSONS 194-198**: the UNIT law (four defects on this branch were one family), the CHORD law, the DEAD-INSTRUMENT law, the PROPENSITY law, the SILENT-SEAM law. **NOT FIXED, listed**: three code fallbacks disagree with shipped defaults; `targetInnerFramePct` live but unreachable from the UI; the render path remains the largest untested surface, structurally. **Owner's eye: it should be BORING** — the one thing to glance at is battle-focus darkening, which the fingerprint cannot see.
- [CAMERA-WEIGHTS-1.md](CAMERA-WEIGHTS-1.md) — **THE FOUR WEIGHTS MADE TO WORK** (branch `camera-refactor`, one commit; tag `pre/weights` `0c875e08`). **This block deliberately MOVES the camera fingerprint** `deddc4b483a0689b` -> `4b33c4d31bec93ea` — it is a change detector, not a prohibition; shipped world `dc4647be0f55ebdb` untouched, mint tripwire did not fire (diff stays in camera/). **DIAGNOSIS: failure mode 2, and not for the guessed reason.** The values ARE read; the mechanism is one line — `if (pool.length === 1) return pool[0]` returns a single candidate WITHOUT consulting its weight or spending a draw. Instrumented over 8 tracks x 3 seeds: **73.2% of selections had ZERO candidates, 16.7% exactly one, so the weights decided 10.0% of selections and ELIGIBILITY decided 90.0%.** That is why the dial felt dead without being dead: overviewWeight 0.3 -> 10 (33x) moved OVERVIEW's share by 1.8pp. **The owner's own evidence checked and confirmed**: battleWeight 0 reproduced = 0 BATTLE frames of 34,628, so the GATE honoured zero all along and only the dial between 0 and 1 was inert. **A real bug found by the same probe**: leadChangeWeight 0 still gave LEAD_CHANGE on 1.8% of frames, because the endgame exception returned it on pending && cooledDown and NEVER CHECKED THE WEIGHT. **Answers the oldest question on the branch**: LEAD_CHANGE's large share is not its weight, it is eligibility — nobody chose 20%, the gates did. **SEMANTICS (Part B): a weight is HOW OFTEN YOU TAKE THIS SHOT WHEN OFFERED** — absolute propensity, not relative share, because a relative share promises what the camera cannot deliver (it does not control eligibility). 0 = never, 0.7 = take ~7 offers in 10, 1+ = always plus priority when two shots compete. Holds gate, weights choose, in that order; a declined offer falls through to LEADER rather than to the next candidate (which would let a low weight silently BOOST whatever came second). **MEASURED**: defaults OVERVIEW 22.5->19.4, LEADER 27.9->36.5, LEAD_CHANGE 20.1->14.5; leadChangeWeight 0 now gives **0.0%** (was 1.8%); the high end stays bounded by the gates (overviewWeight 10 buys only 23.1%) and the report names the right lever for that — the state's cooldown, not its weight. Owner's values decoded for him: his 0.70 means he declines 3 lead-change offers in 10. **Defaults deliberately NOT retuned** — changing semantics and values together would make the eye test unreadable. 6 new tests incl. the required assertion (weight 0 excludes its state, all four) and a failure proof for the endgame bypass; two tests adapted from "fires when eligible" to "fires when eligible AND accepted". 3460 green. **Owner's eye pending: set one weight to 0 (must not appear), then to 1 (must dominate); expect a more leader-heavy rhythm at the defaults.**
- [CAMERA-HYGIENE-1.md](CAMERA-HYGIENE-1.md) — **THE DEEP CLEAN, BEFORE THE MERGE — PARTIAL, PARKED** (branch `camera-refactor`, two commits `46ffce26` + `aff558a3`; tag `pre/camera-hygiene` `48069246`). **Its acceptance test is the good kind and is the block's main artefact**: `scripts/camera-fingerprint.mjs` hashes EVERY director decision (state, lerp phase, anchor, zoom, both offsets, camT, both targets) on every frame of seeded races across ten tracks — hygiene must not move the picture and now that is PROVABLE. Baseline `deddc4b483a0689b`, held BIT-IDENTICAL by both commits. **Sources**: a full scan for unused exports, uncalled methods, unread getters and unconsulted config keys came back ALMOST EMPTY — the per-block hygiene held. Three real items: `QUICK_TEST_NAMES` duplicated byte-for-byte in SetupScreen and the GOLDEN PARITY RUNNER (a silent-divergence bug in waiting, because a racer's NAME IS PHYSICS — renaming a roster once changed the winner in 14 of 24 races, so the two copies could have made the browser and the golden test run different races while the golden test was the thing lying); four independent reference-canvas constants; one dead method. **Mint tripwire stage 2 SHIPPED**: `ENGINE_INPUT_MODULES` beside `WORLD_CONFIG_KEYS` plus `engineInputs.test.js`, which reads raceCore's own imports and fails when it names a module the list does not — the half that works when nobody remembers the rule. **HUD AUDIT, with a method flaw found and corrected mid-way**: perturb a key, re-hash, compare — but the first pass used out-of-band values, which VALIDATED KEYS REJECT, falling back to the default and reading as dead (glideDurationMs 500->251 is outside [300,900]); re-run in-band, 24 top-level keys + 8 profile fields are provably LIVE, 8 more than the flawed pass. The non-movers split three ways: render-only or diagnostic (correctly invisible), LEGACY and recommended for removal (`spritePctOfCanvas`, `cameraTransitionSeconds` — a defaults.js comment already says the director does not read them), and SUSPECT — **headline: all four state-selection weights (battle/comeback/leadChange/overview) were inert under the probe**, though a two-track probe cannot exercise every gate, so this is a prioritised suspect list and NOT a verdict. Also: hardcoded values that deserve controls (START_PHASE_DURATION, MAX_CAM_ZOOM, the label-stability pair, COMPANY_FRAME_PCT); a protected-by-tests vs protected-by-convention list (the tracking lag, the state machine's transition reasons, slow-motion, the world-bounds clamp and the whole render path are convention only); and five LESSONS proposed incl. **"a unit not expressed in the frame's own terms will drift"** (four separate defects on this branch were that one mistake) and **"when a measurement contradicts a prediction, the prediction was load-bearing"**. **PARKED, precisely**: the CameraDirector extraction (2890 lines; the clean seam is the detour recorder, but an extraction that must stay bit-identical needs its own verification pass), the HUD text/needed review, the test cleanup, and writing the LESSONS entries. 3454 green.
- [CAMERA-TAGS-1.md](CAMERA-TAGS-1.md) — **NAME TAGS: THE UNIT, AND READABILITY BEFORE COUNT** (branch `camera-refactor`, one commit; tag `pre/tags` `77a7812d`; mint tripwire applied, `dc4647be0f55ebdb` UNCHANGED). Stage 1 of 3 from a three-way design consultation that converged on one skeleton. **The accepted reframe:** the owner's two goals (as many names readable as possible / cover the racers as rarely as possible) are NOT in tension — ten labels on a clump are unreadable AND cover more racers than one would, so decluttering buys both; design the layout and let the COUNT fall out. **THE COUNT WENT UP, not down — CC predicted the opposite in the consultation and the measurement corrected him**: old rule 10.0 drawn / 9.0 readable, new rule 19.9 / 17.0; in OVERVIEW (his complaint) 10.0/6.6 -> 29.0/21.0. The top-10 CAP was the binding constraint, not the clutter. PHOTO_FINISH is the one state where the count drops (10 -> 6.4) and that is correct — the old rule labelled four racers who were not on screen. Naming breadth: 40/40 racers now carry a label at some point, where P11-P40 got nothing all race. **THE UNIT**: `max(8, round(11/effZoom))` produced 11.0 px at effZoom 1.0, 12.8 at OVERVIEW and 25.6 at LEADER — 2.3x on one setting — and ALSO squashed labels vertically up to 16% on closed tracks (anisotropic world->screen), which nobody had noticed. Fixed by undoing the camera transform for the label alone: translate, scale (1/effX, 1/effY), draw in screen px; `nameTagFrameFrac` 0.022, and a 1440 frame gets exactly twice the label (pinned). **THE START-FORMATION EXCEPTION** is now a feature with a measured handover: the field is DENSEST ~4 s in (0.78 survive), not at the gun, and by 8 s decluttering drops nothing — so `nameTagAllUntilMs` 8000, and the handover needs NO transition because nothing is dropped at that instant. The camera's own 3 s start hold would have been ~5 s too early and cost ~20% of the names. **STABILITY was harder than expected**: naive first-fit churned 12.06 label changes/s. Split measured — 5.40/s canvas EDGE, 6.66/s occlusion — and fixed with three mechanisms, none a timer (Lesson 190): incumbency (12.06->9.15), edge hysteresis 2% of frame (->8.27), asymmetric yield threshold 35% of the incumbent's own box (->5.45 = one change per label every 3.7 s). Cost stated not hidden: readable 18.7 -> 17.0. **Deleted**: nameTagVisibility.js + test, `tagVisibleMaxCount` key/control/label/tooltip. Stages 2 (priority from the director's anchor + guarantee set) and 3 (multi-slot placement, sprite avoidance) named in the module header. 21 new tests, 3 failure proofs; 3449 green. **Owner's eye pending: the start formation (all names, 8 s), and a crowded OVERVIEW moment — he will see MORE names, not fewer.**
- [CAMERA-MIN-DRAW-1.md](CAMERA-MIN-DRAW-1.md) — **NEVER DRAW A RACER TOO SMALL TO READ** (branch `camera-refactor`, one commit; tag `pre/min-draw` `766a6f94`). **FIRST BLOCK TO RUN THE MINT TRIPWIRE**: the diff touches autoSpriteScale.js and defaults.js (under modules/, outside camera/), so it minted — `dc4647be0f55ebdb` UNCHANGED, space-sprint `721f192e8b08` unchanged. Presentation-only, measured not assumed. **The cause was ours.** CAMERA-PICTURE-FIXES-1 removed the render sprite floor; the measurement said it bound only in OVERVIEW but there on 9 of 10 tracks, and THE START RUNS IN OVERVIEW. The owner's evidence settled it: the Space Sprint START formation used to overlap slightly and no longer did — same 20 slots, same grid, smaller sprites. The planner had misread his earlier 'the horses are noticeably smaller in overview' as approval when it was an observation. Same shape as the min-racers floor in CAMERA-COMPANY-1: a legitimate PURPOSE inside a broken IMPLEMENTATION. **Default 0.045 measured from HIS reference image, not the old value**: under the old unit OVERVIEW was 4 of the track's own corridors (1200 world px on Space Sprint) so the old 32 px floor lifted the rockets 3.74x — what he approved is 32.0 screen px = 4.44% of frame height; today without a floor the same formation is 22.8 px, a 29% shrink. 4.5% = 32.4 px reproduces it within 1%. **Where it binds**: OVERVIEW only — Mountainstreet/Seatrack/Space Sprint x1.42 plus a x1.01 nudge on Dirt Oval; NOTHING outside OVERVIEW at any value up to 6% (LEADER already draws the smallest racer at 45.6 px). **A FRACTION of the frame, not pixels** — the old floor was 32 absolute px against a zoom unit that has since changed twice. **DRAWING ONLY, pinned by a test**: every state zoom byte-identical with the floor off, at the default and at an absurd 0.9, and identical to a config without the key — the old floor's real defect was becoming a second silent zoom authority. **Connection**: this puts a lower bound under the parked row-count defect (Mountainstreet/Seatrack/Space Sprint all draw at 14.3 world px because 40 racers fit one start row) — it does not fix the erasure, it stops the erasure also being unreadable. Dev Screen control "Minimum racer size (% of frame)", 0 = off. NOT restored: getEffectiveMinTargetScreenPx (belonged to the pixel implementation). Left and listed: autoScaleConfig.minTargetScreenPx (Racer Editor preview; race-relevant block, removing it moves the world hash). 9 new tests incl. the failure proof; 3438 green. **Owner's eye pending: does the Space Sprint start formation read the way it used to? Target is readable, not identical.**
- [CAMERA-MINT-TRIPWIRE-1.md](CAMERA-MINT-TRIPWIRE-1.md) — **THE FOLDER TEST WAS A TEST OF FOLDERS** (branch `camera-refactor`, docs-only, no behaviour change, no eye test). The owner asked whether the physics still held — overtaking on Space Sprint looked far too easy, and if avoidance uses the DRAWN body then shrinking sprites would change the racing. **MEASURED FIRST: the fingerprint did NOT move.** master and camera-refactor both mint `dc4647be0f55ebdb`, and space-sprint is `721f192e8b08` on both with bias values identical to sixteen decimals — the racing is bit-identical on all ten tracks. **WHY it could not move:** physics reads `drawnBodyWidthPx`/`drawnBodyLengthPx`, stamped once in raceCore from `drawnBodyWidthRefPx`, which is computed at race init from track width, racer count and the AUTHORED displaySize/bodyFillNarrow — all world-space, no canvas, no zoom, no camera. The camera-dependent sprite quantity is a different function (`computeRenderDisplayScale`, takes frameEffZoom) whose result reaches only `drawRacer`; had it fed physics the CAMERA would change the RACE and the parity harness would have caught it long ago, since the sim has no camera at all — and that floor was removed in CAMERA-PICTURE-FIXES-1 anyway. **BUT THE HOLE IS REAL:** `autoSpriteScale.js` (which also exports the auto-scale config the start-grid packing reads) WAS in the camera branch diff; verified the change is confined to the render function with `computeAutoScaleFactor` and every DEFAULT_AUTO_SCALE_CONFIG value untouched. We were lucky, not safe: a race-moving value can sit in a camera diff and pass both 'no simulation file' and 'no fingerprint ritual'. **RULE ADOPTED (stage 1, now):** camera work still skips the ceremony, but MINT ONCE at the end of any block whose diff touches a file under `client/src/modules/` that is NOT under `camera/` — no list, no judgement, ~2 min; written into SHIP-CEREMONY.md under THE MINT TRIPWIRE. It would have flagged autoSpriteScale.js in CAMERA-PICTURE-FIXES-1. **STAGE 2 DEFERRED by owner instruction** to the hygiene phase and registered in BACKLOG.md: the enumerated engine-input MODULE list beside `WORLD_CONFIG_KEYS` plus a test that fails when raceCore imports something not on it — because the mint rule catches what someone remembers and the list catches what nobody does. Space Sprint's symptom explained by the camera: LEADER went 600 -> 225 world px (2.67x tighter) plus the lateral pin; testable by setting it back to 2.0 corridors.
- [CAMERA-LATERAL-1.md](CAMERA-LATERAL-1.md) — **FOLLOW ALONG THE TRACK, SIT ON THE CENTRELINE ACROSS IT** (branch `camera-refactor`, one commit, camera-only, no simulation file, no fingerprint; tag `pre/lateral` `3b06f78f`). The owner after the reference-width block: the shot is now 225 world px where it was 600, so the same lane change is ~2.7x larger a share of the frame — **the unit did not cause the sideways jumping, it exposed it**. THE RULE, two axes: ALONG the track the camera follows the subject (forward offset and all, UNCHANGED); ACROSS it the camera sits on the corridor centreline; a LATERAL GUARANTEE shifts off that centreline only when a guaranteed subject would otherwise leave the frame. One rule, all six states, no threshold. **Explicitly NOT CAMERA-FOCUS-3** (that pinned BOTH axes and was an accident; this pins ONLY the cross-track axis and is deliberate) — said at length in the code and pinned by a test that the ALONG axis still follows, so deleting the pin cannot pass as a fix. **MEASURED, the jump AT an anchor change**: Dirt Oval 62.3 -> 16.3 px (28% -> 7% of the shot), Searound 72.1 -> 18.5 (32% -> 8%), Mountainstreet 84.3 -> 64.8. Sideways travel per state falls with it (Searound COMEBACK 10.0 -> 1.7 px/s, LEADER 18.2 -> 8.8; Dirt Oval BATTLE 5.9 -> 1.3). **ONE TRACK GOT WORSE and is reported not buried**: Mountainstreet's 300 px corridor inside a 225 px shot makes the lateral guarantee work nearly every frame (LEADER 11.0 -> 40.7 px off centreline); cause NAMED = the corridor ZOOM guarantee sizes assuming a CENTRED anchor while the forward bias moves it, the same class of error fixed for company in CAMERA-COMPANY-2 => folding the anchor's real frame position into the corridor guarantee is the named next step. **DEFECT CAUGHT MID-BUILD**: written first as 'bring these screen points inside the rectangle', the guarantee also tried to rescue a subject out of frame ALONG the track (a diagonal perpendicular has both screen components) and drove the camera 500 world px off the centreline on an open track's LEAD_CHANGE — it is now strictly 1-D and is never handed the other axis. **His second question ('do we still see everything important?') verified DETERMINISTICALLY**: outermost lane, tightest setting 0.25, corridor along the SHORT screen axis, both sides — the guarantee catches him. A race-wide coverage percentage was attempted and ABANDONED because the anchor's track position is not recoverable from the director's public state (camT lags it ~0.025 lap, measured), so every version measured the corridor where the guarantee promised nothing; no number reported rather than one that cannot be stood behind. Harness fix: open tracks ran 2 laps where RaceScreen uses MIN_LAPS = 1. 12 new tests; 3424 green. **Owner's eye pending: does the picture stop jumping sideways, and is any racer that matters ever cut off?**
- [CAMERA-REFERENCE-WIDTH-1.md](CAMERA-REFERENCE-WIDTH-1.md) — **THE PROGRAM NORMALISES, THE OWNER TYPES ONE NUMBER** (branch `camera-refactor`, one commit, camera-only, no simulation file, no fingerprint; tag `pre/reference-width` `1abc9383`; config schema **v21**, which DISCARDS a stored v20 camera config). The measurement that decided it: a racer's height on screen was **1.9 / (racers per row)** on all ten tracks, because the track width CANCELS on both sides — the camera divided by it and the start-grid packing sized the sprite from it. Searound is the extreme on both counts at once (narrowest corridor 131 px, biggest animal the manta) so only 6 fit per row and its racer filled 31.7% of the frame against Mountainstreet's 9.5% = a 3.33x spread with no author. **The zoom now divides by a STANDARD CORRIDOR** — `referenceCorridorPx`, a Dev Screen value (default 300, NOT a constant, per the UI-configurable rule), applied as `max(reference, actual)` so a track authored WIDER than the reference keeps its own width and its corridor is never cropped. **VERIFIED through the real director: LEADER = 225.000 world px on ALL TEN tracks** (was 262..600); racer-on-screen spread 3.33x -> 2.21x, and that remainder IS the authored creature spread (the manta stays bigger because it is bigger). That property had NO test; it now has four plus a failure proof. **The unit's own full-track-width clamp was REMOVED** — it belonged to a unit whose number meant track widths and would have re-pinned every narrow track to its own corridor; the orientation-aware corridor guarantee in framingRule.js was already doing the job, so there is now ONE place a shot is widened. Guarded by three director tests. **HONEST CAVEAT, measured**: at LEADER 0.75 the corridor guarantee still widens 9/10 tracks (Searound gets 225, the rest land 254..410) because it wants the corridor inside innerFramePct 0.7 and the owner's preferred picture is SMALLER than a 300 px corridor — delivered spread improves 2.29x -> 1.82x, not to 1.00x; whether the full corridor is still the right proxy on a track carrying 20 racers per row is the named next decision. **Renamed** `trackWidths` -> `visibleCorridors` ("World in shot (corridors)"), tooltips rewritten to teach the change. **Range/step re-derived from measurement**: min 0.25 (the biggest creature already fills 79% of the frame there), max 13 (the widest track needs 12.55 corridors), step 0.05 (7% of the shot at the LEADER default; the old 0.5 was 67%, which is why he could not land on a picture); the old min 1.0 was the guarantee's threshold and was NOT inherited. **New defaults, anchored on his own eye** (he typed 1.67 on Searound, saw 219 px, called it good): OVERVIEW 1.5 / LEADER 0.75 / LEAD_CHANGE 0.75 / BATTLE 0.55 / COMEBACK 0.55 / PHOTO_FINISH 0.4, every state keeping its ratio to LEADER — **a UNIT change, like miles to kilometres, not a regression**. Creature-size normalisation PARKED by the owner (it drives computeRacersPerRow, so it moves the start grid = engine ceremony). 3412 green. **Owner's eye pending: Searound first (225 px = the picture he approved), then Dirt Oval, then a 300 px track.**
- [CAMERA-COMPANY-2.md](CAMERA-COMPANY-2.md) — **THE GUARANTEE STOPS BEING OVER-CAUTIOUS** (branch `camera-refactor`, three commits, camera-only, no simulation file, no fingerprint; tag `pre/company-2` `cfd47cd5`). CAMERA-COMPANY-1 was correct in KIND and too strong in DEGREE: `innerFramePct` (0.7) and `reach` (0.66) MULTIPLIED, so a companion was allowed only **46% of the frame chord** and the owner's 40-racer break-away widened to 2.32 track widths where he asked for 1.0. **The owner's decision: visible with a margin is enough** — a guaranteed companion does not have to sit inside the subject's safe region, because a racer near the frame edge is not emptiness. **Commit 1** `COMPANY_FRAME_PCT = 0.9`, measured not assumed: 5% each side is half a drawn body at its largest (body = 6.65% of frame height median, 9.50% p95 AND max), and deliberately NOT sized for the tracking lag as well because the live camera adds 0.00% overshoot (it trails a WIDENING target). `innerFramePct` untouched. **Commit 2** `reach` becomes a RAY-CAST: `roomFromPointAlong` measures from where the anchor sits to the region edge along each companion's OWN direction, with `anchorScreenPoint` stating that position once so the guarantee and the pan bias cannot disagree. The scalar was over-generous in every direction (0.601 behind / 0.591 behind-left / 0.482-0.518 beside / **0.399 dead ahead**, all computed as 0.66), so it promised 5 companions and delivered 4. **CC corrected the spec's premise here**: fixing a defect that permits TIGHTER normally means WIDENING — it lands tighter anyway only because the ray to a RECTANGLE from an off-centre point exceeds 0.66 of the chord in the cheap directions. **Tried and rejected, measured**: reading the anchor back off the previous frame's committed camera (promise kept 82.3% vs 97.1%) — during a widening the live zoom is tighter, so the read-back over-states the finished shot's room and the guarantee talks itself into staying tight. **The 0.601/0.518 are SEPARATE** = the world-bounds clamp, proven active at his frame (leader x 2853.8, half-width 234 ⇒ pan clamped at 2838); reported, left alone. **Commit 3** the replay's step accounting was NEVER wrong (leader t=0.235445 at step 584, exact) — the WITNESS stood 8 frames past the mark because `st.racers` is mutated in place and the loop runs on for the trace window; snapshot at the hit ⇒ **40 of 40 racers match, REPRODUCED**. Lesson: a UNIFORM field-wide offset is a clock/reader problem, a SCATTERED one is physics. **His two moments: A 2.32 → 1.75 TW, B 1.49 → 1.15 TW**; promise kept in the region it promises 97.1% of frames (was 96.3%), residual = the world clamp. **Default RE-MEASURED at 40 racers and STAYS 3**: at 40 the tables from CAMERA-COMPANY-1 (taken at 20) understated the case because more racers are a longer QUEUE not closer company — dirt-oval ALONE 6%→1% and thin 7%→1% at p95 1.45 TW, while 8 costs p95 2.32 (the over-wide picture this block fixes); searound is the one place 5 earns its keep. 6 new tests incl. the failure proof (a companion BESIDE a forward-framed anchor: the scalar permits the tighter shot and the guaranteed racer is OUT of frame); 3408 green. **Owner's eye pending: "does it still open up when the leader breaks away — and only as much as it has to?"**
- [CAMERA-COMPANY-1.md](CAMERA-COMPANY-1.md) — **THE DRAMATURGICAL GUARANTEE: "do not show emptiness"** (branch `camera-refactor`, camera-only, no simulation file, no fingerprint; tag `pre/company` `5383750b`). **CC was wrong to delete the min-racers floor** in CAMERA-FRAMING-1 as "a guarantee phrased as a headcount" — the owner corrected the reading: it was never a count control but a DRAMATURGICAL guarantee. He zooms LEADER tight on purpose and wants the camera to widen when the shot goes empty; his post-framing screenshot is what its absence costs (_"das ist nicht spannend"_). The CONCEPT was right, the IMPLEMENTATION was broken — one axis scale on both axes (bsX/bsY, third instance) and a zoom number meaning something different per track — and both are now fixed, so it returns cleanly. **A different KIND of guarantee, named as such**: the geometric ones (corridor, pair) say "do not crop what matters", this one protects the SHOT; deliberately NOT folded together. **A LIMIT, not a correction** — `min(setting, geometric, company)` computed BEFORE the camera moves, pinned by a no-pumping test (static field ⇒ target constant to 1e-6). **Ranks companions by the zoom each REQUIRES, not by raw distance** — the per-axis fix and the orientation-aware form in one. **`reach` was a real defect caught by the director test**: the company vector runs FROM the anchor, so only the half-frame on that side is available; comparing against the full extent permitted a shot 2x too tight with the guaranteed company off the far edge. **MEASURED before the eye test** (3 tracks x 3 settings x 4 values, real seeded races): at searound LEADER 1 the default **minVis 3 halves the ALONE frames (4%→2%) and cuts thin frames 7%→2%** at 0.65 direction changes/s and 0.98 track-width swing — breathing, not pumping, so **no hysteresis was built** (measure first, per instruction); 5 and 8 buy NO further protection and cost real motion (8 = 1.31 rev/s, swing 1.46). **Default 3, measured not chosen.** Applies to the single-subject shots (LEADER, COMEBACK, OVERVIEW), not the pair shots (BATTLE, LEAD_CHANGE, PHOTO_FINISH) which already guarantee both contenders. Dev Screen control "Company: min racers in frame". 15 new tests incl. two failure proofs; 843 camera/config/DevScreen green. Honest residual: **2% of searound frames stay briefly empty because the guarantee is on the TARGET and the live zoom trails it** — that is the unfixed tracking lag, not the guarantee. **Owner's eye pending: "can I zoom LEADER in tight without the shot going empty, and does the picture stay calm?"**
- [CAMERA-FRAMING-1.md](CAMERA-FRAMING-1.md) — **THE FRAMING RULE, all six states** (branch `camera-refactor` @`e4a7fd14`; tag `pre/framing` `74bf88b1`; camera-only, no simulation file in the diff, no fingerprint). The owner's design as ONE rule: a state is ANCHOR + GUARANTEE + the shipped track-widths zoom, and **frame position is not a fourth setting** — it follows from "is there anything worth seeing ahead of the subject?", asserted as `position === (aheadMatters ? centred : forward)` so principle and answer cannot drift. **LEAD_CHANGE IS NOW DEFINED**: `panTarget.js` had no branch for it, so it fell through to a default centroid and never received the forward bias — in the state holding **37.6% of all frames**. **The guarantee is one orientation-aware computation** (corridor = perpendicular to the heading, pair = the line between contenders), proven by 1-degree sweeps over 360 on three projections with four failure proofs; it is what lets BATTLE/PHOTO_FINISH go **2x tighter than one track width** honestly. Measured: **the guarantees never bind at the shipped defaults** (0/10 tracks for five states, 1/10 for BATTLE) — pure backstop, and they only start working below ~1 track width, exactly where the owner wants battles. **TWO STEERING MECHANISMS DELETED**: the min-visible zoom floor (which also carried the THIRD instance of the bsX/bsY per-axis defect — 18.5% Y over-statement on closed tracks, spec item E discharged by deletion) and the containment clamp (comment claimed "no-op mid-glide", measured ACTIVE on 23/23 glide frames with -390px corrections; that comment is now a TEST, `clampActiveCount === 0`). OVERVIEW-FRAMING-1's headcount fit goes with them. **PHOTO_FINISH gets its own zoom + Dev Screen row** (1 track width) — it borrowed BATTLE's, so the most dramatic shot was never closer than an ordinary battle. **NO MIGRATION by owner instruction mid-block** ("I am the only one testing") → schema v20 discards older configs, which made the v5→v19 chain dead: `cameraMigrations.js` + ladder + suites **deleted** (~1330 lines). **Net −1358 lines; `cameraConfig.js` 372→96; 36 new tests, 59 obsolete removed; 3388 green.** Reported unfixed: the tracking lag (OVERVIEW **25.2pp on searound**, a quarter of the frame, lag factor 38.6 vs 6.0 elsewhere) and point-vs-nose framing. **Owner's eye pending — LEAD_CHANGE changes most; camera settings reset to defaults.**
- [CAMERA-PICTURE-FIXES-1.md](CAMERA-PICTURE-FIXES-1.md) — TWO MEASURED DEFECTS cleared before the framing block so its effect is not judged through a known error (branch `camera-refactor`, camera/render only, no simulation file in the diff, no fingerprint; tag `pre/picture-fixes` `854e2f87`; two commits). **(1) The forward-bias span was a BLEND of the frame's side lengths** (`|cos|*W + |sin|*H`, weights summing to up to sqrt2) where the geometry needs the frame's CHORD (`min(W/|cos|, H/|sin|)`) — right on both axes, wrong between them, so every existing test passed against it and the owner's eye found it first. At his 74 deg heading the blend said 1091.4 px where the frame reaches 759.9 px (**1.436x over**), turning `leaderForwardFrac` 0.66 into a **23.0pp** displacement instead of 16.0pp and putting the leader at 84.5% down the frame. **PRE-REGISTERED ACCEPTANCE MET: exactly 16.0pp on horizontal, vertical, 30, 45, 60 and 74 deg, and across a full 360 deg sweep at 1 deg steps**; axis cases bit-unchanged. Extracted `camera/frameGeometry.js`; 31 new diagonal-first tests with a failure proof recomputing the old blend. **(2) The render sprite FLOOR is removed** — `Math.max(proportionalScreenPx, minTargetScreenPx)`; the owner's "die Sprites sollten immer angepasst groß sein". Measured before removal: it bound in **OVERVIEW on 9 of 10 tracks and in NO other state on any track** (searound exempt), so OVERVIEW racers shrink 27-39% from a pinned 28 px to the 17.1-20.3 px the zoom asks for and everything else is bit-identical. The ceiling stays (a different question, never binds at defaults). **RECOMMENDATION: the min-sprite control is REMOVED, not defaulted-off** — with the floor gone `overviewTargetScreenPx` has no consumer at all, and a floor-defaulting-to-off would re-introduce sprite size as a second silent zoom authority. **`overviewOffsetPx` orphan cleared** (assigned, read nowhere since OVERVIEW-FRAMING-1; key, slider, tooltip, two constants and the plumbing) — schema **v19** strips both keys from stored configs. **One further site shares the axes-right-diagonal-wrong shape and is REPORTED NOT FIXED**: `_countVisibleRacers` / `_zoomFloorForMinVisible` apply a single effZoom to BOTH axes, over-stating screen Y by **18.5%** on closed tracks — it feeds the Min-racers-visible floor, which the spec places in the framing block. Net **-128 lines**; 3412 tests green. **Owner's eye pending: check 1 = diagonal LEADER shots sit less far forward (straights unchanged); check 2 = OVERVIEW racers visibly smaller, all other states pixel-identical.**
- [CAMERA-ZOOM-UNIT-1.md](CAMERA-ZOOM-UNIT-1.md) — REFACTOR + NEW UNIT: all five camera states move onto **ONE framing rule whose parameter is TRACK WIDTHS** (branch `camera-refactor`, camera-only, no simulation file in the diff, no fingerprint; tag `pre/zoom-unit` `2488124f`). `camZoom = canvasH / (n x trackWidthPx x axisY)` so `visibleH = n x trackWidthPx` — **the world size cancels by algebra, not calibration**. Measured: the same setting now frames **the identical shot on all ten tracks, spread 0.000**, where before it spread 2.0-2.3x (LEADER 2.36 TW on Mountainstreet vs 5.40 on Searound; OVERVIEW 4.34 on 9/10 tracks but 8.69 on Searound and 2.17 at N=40 — the count staircase). **The unit is on the SHORT screen axis** because the track's orientation ROTATES (across-the-track is horizontal at the top of an oval and vertical at the ends), so only the short axis can guarantee two side-by-side racers stay in frame — which makes the owner's floor exactly `n >= 1`. Defaults, clean and round by owner choice over reproducing the old picture: **OVERVIEW 4, LEADER 2, LEAD_CHANGE 2, BATTLE 1.5, COMEBACK 1.5**; schema **v18** + deep-merge migration (Lesson 193) that DISCARDS the old zoom rather than converting it. **REMOVED:** `spriteScale`, OVERVIEW's target-sprite-size derivation and its `2xW_ref/racersPerRow` racer-count division, `overviewClosedTrackZoom` (dead since 2026-06-04, tooltip still lying), `overviewMinEffZoom` (last open/closed branch in the scale path), `countdownStartZoomSpritePx` — each with its Dev Screen slider, label and tooltip. **`MAX_CAM_ZOOM` raised 10 -> 24** (declared deviation): at 10 it BOUND on a legal setting, silently giving 1.56 track widths where 1.5 was asked. Extracted `camera/zoomUnit.js` (140 lines, pure). **Net -645 lines** across the touched set; director and Dev Screen both shrank. 62 obsolete tests deleted, ~20 adapted to assert the RULE, **25 added with 4 failure proofs**; 3397 green. **Part E finding: name tags are NOT constant on screen** — a `max(8, round(11/effZoom))` floor makes them grow above effZoom 1.375, so a tag is 26 px on Searound vs 11 px on Mountainstreet at the SAME setting; it will confound a cross-track eye test. The render sprite floor (`computeRenderDisplayScale`'s `Math.max`) is confirmed REAL — the planner's "no drawing-time floor exists" was a negative grep, not a proof — and is the immediate NEXT block. **Owner's eye pending; set Min racers visible = 0 first, and anchor/framing is the block after.**
- [SIM-NAMES-1.md](SIM-NAMES-1.md) — **STOPPED AT THE REPORT, by the spec's own stop rule: a racer's NAME IS PHYSICS.** `raceBehavior.js`'s `stablePairBit` hashes `r.name ?? r.id ?? r.index` to break symmetry between two racers neck-and-neck in the same lane, and that bit is consumed at **four live sites in the traffic core** (look-before-brake free lane, soft-steering dodge at a centreline tie, hard-separation push). Measured: same track/seed/config, owner names vs the simulator's `r{i}` → **finishing order differs in 24/24 races (3 tracks × 8 seeds), the WINNER differs in 14/24**; first divergence at physicsTs≈14.9 s, max per-racer |Δt| 0.049 by the flag. Unit level: `Bolt/Arrow` dodge (+,−) where `r0/r1` dodge (−,+) in an identical situation. So "give the sim the owner's names" would re-roll every fairness number ever produced — a fingerprint-moving engine change with the ship ceremony, not a labelling fix. **The coat/pattern lead the spec flagged is NOT the path** (`coatId`/`patternId` are render-only; `assignPattern` ignores its arguments). Divergence is **narrower** than assumed (`headlessRaceSimulator.js` is a documented non-game model; `goldenRunner` already threads the browser's names on purpose; `sim-fairness` has had `--racer-names` since RACER-FLAPPING-1) **and wider** (even the correct harnesses use `QUICK_TEST_NAMES`, so no harness reproduces an owner-GROUP race; `sim-fairness` defaults to `R{i+1}`; `runRaceHeadless` silently races index strings; `QUICK_TEST_NAMES` exists **twice, byte-identical**, in `SetupScreen.jsx` and `goldenRunner.mjs`). Order/index mapping IS stable — only labels differ. **Two ways out, owner's call: (1) make the name cosmetic (hash `r.index`) = one deliberate re-baseline — recommended; (2) make the roster part of race identity = free today but "same seed, same track" stops describing a race.** Shipped: a 4-test file pinning the coupling so nobody rediscovers it by accident, and `camera-replay.mjs --field=n` now lists the field BY NAME (Mo/Bo/Dee/Ola…) so a finding can name the racers he saw. **No simulation-behaviour change in the diff.**
- [CAMERA-REPRO-1.md](CAMERA-REPRO-1.md) — TOOLING: the owner can now point at a moment and CC can stand in it (branch `camera-refactor`, camera-tools only, **no simulation file in the diff**, no fingerprint claimed). **Press `M` during a race → ONE ~1000-char copyable line** carrying the race identity, the seed, the off-default config **with values** (not just the hash), the deterministic race clock, and the camera **as rendered** — plus a witness so the replay can be checked. `scripts/camera-replay.mjs` rebuilds that race through the REAL `raceCore` and stands at the marked physics millisecond, printing marker-vs-replay per field and writing two framing PNGs. **Part C proven live: 4 markers from real browser sessions — world REPRODUCED (leader, t-sum, 20/20 racers to 1e-4), camera state/phase/anchor EXACT, zoom exact to 3 dp, pan within 0.4–3.1 px; the replayed frame puts the same racers in the same screen positions as the browser's own canvas.** Three failures found and fixed en route, all reported: (a) a leader-only witness is too weak — an authored plan pins the front-runner, so `tvec` (per-racer t) was added; (b) the replay advanced physics but **never the wall clock**, freezing the director in OVERVIEW — indistinguishable from a camera bug; (c) the marker carried ONE effective zoom while a closed track scales X and Y differently (1.810 vs 1.527 on 3072×2048) → leader 416 px out; now carries **both axes**, test-pinned. **One declared behaviour touch:** the director's own dice (`_weightedRandomPick`, `_scheduleNextOverview`) moved from `Math.random` to a per-race **drawn** seed (`setRandomSeed`) — same randomness, now recorded; without it no marked moment is reproducible at all. **`exp-camera-bisect.mjs` FIXED** (dice seeded per rung) with the diagnosis corrected: its rungs replayed the SAME race (fixed dump) but different CAMERA dice, so its "only variable is the code" header was false. `DEFAULT_CONFIG_WORLD` given one canonical home in `storage/defaults.js`; `api.js` `import.meta.env` guarded (it threw at import under plain node). **43 new tests over previously-uncovered ground; 3430 green.** **Quick Test races only — `Start Race` sends seed 0 and is unreproducible; the tool says so and exits.**
- [CAMERA-CEILING-1.md](CAMERA-CEILING-1.md) — FIX + DIAGNOSIS + CORRECTION (branch `camera-refactor`, camera-only, no engine ceremony). **(1) The open-track ×0.8 OVERVIEW ceiling is DELETED.** It bound on **100% of frames on all five open tracks**, so open OVERVIEW never ran the sprite-size rule at all — 39.9 px racer where the rule says 49.0. Its stated purpose ("prevents the leader leaving canvas during pan") was a PAN problem solved with a ZOOM cap. **After: 49.0 px racer on ALL TEN tracks — one number, one meaning.** Closed tracks **BIT-IDENTICAL** (replay diff vs `af37db44`, 5767 frames × 3 settings, Δ = 0); open tracks −19% (6000/6144 worlds) to −32% (luger-hill), **0 state mismatches**. No test covered the ceiling — 493 camera tests pass unchanged, which is itself the finding. ~1.43 would restore the old open-track width, at the cost of loosening closed tracks by the same rule. **(2) The racer-count instability DIAGNOSED, not fixed: it IS the count normalisation** — `bodyNarrow = 2×W_ref / racersPerRow` is a START-GRID PACKING quantity the camera borrows as its zoom reference, and ALL the count dependence enters through `racersPerRow`. Two problems: monotone part runs the WRONG WAY (more racers → less track visible), and the row-split staircase is **non-monotone** (dirt-oval N=30 → 1.65 track-widths, N=40 → 2.48, N=60 → 1.65 — adding ten racers zooms OUT). Removing it would make the multiplier count-stable **by construction**. Key insight: with one row `racersPerRow = N`, so `2×W_ref/N` makes the TRACK WIDTH CANCEL — that cancellation is _why_ the multiplier gave an identical 2.48 track-widths on 9/10 tracks, and the `/N` beside it is the instability; a track-width normalisation keeps the first and drops the second. searound needs 2 start rows at 20 racers (4.96 vs 2.48) → **discount it, or run ≤10 racers**. **(3) CORRECTION to CAMERA-REFACTOR-1**, in place with the original sentence struck through: the 285 cap keys on **TRACK width (>300 px), not WORLD width** — the "~4600-px world" figure came from a sweep where both scaled together. Measured: **binds on ZERO shipped tracks, distortion exactly 0.00%**, Mountainstreet included (`300 × 0.95 = 285.00000000000000000` exactly). **So the 285 block is NOT a precondition for the zoom-unit decision; the ceiling was, and it is now done.** Owner's eye pending — closed tracks must look identical, open tracks ~20% tighter with racers matching Dirt Oval; hold the racer count FIXED across tracks.
- [CAMERA-PROJECTION-1.md](CAMERA-PROJECTION-1.md) — REFACTOR: the camera gains ONE world↔screen projection (`projection.js`, 154 lines) that every zoom formula, guardrail and diagnostic goes through. **The picture does not change — proven BIT-IDENTICAL over 29,610 frames** (2 tracks × 3 settings + the countdown path; `zoom`/`offsetX`/`offsetY`/state all `Δ = 0`, seeded RNG, replayed against `pre/projection`). **Branching: 38 `_isOpenTrack` sites + 3 duplicated functions → 11 sites + 0 functions**; `_bsX`/`_bsY` arithmetic 12 → **0**; hand-multiplied `OPEN_TRACK_BASE_ZOOM` 9 → **0**; two definitions of that constant → one. `_setClosedTrackTargets`+`_setOpenTrackTargets`+`_closedOffsetY` merged into `_setTrackTargets`+`_offsetYFor` (the open Y formula is exactly what the per-axis one reduces to when `effY == effX`, which is why the merge is bit-exact). **The honest remainder: 6 genuine topology sites**, all asking one question — does the track parameter wrap? — plus 3 `closePath()` in Minimap; two of the six are NEW consolidations (the lookback was written twice verbatim, the `_camT` normalisation six times). **5 further sites quarantined and labelled in-source** (open OVERVIEW `×0.8` ceiling — binds 100% of open frames; `overviewMinEffZoom`; OVERVIEW-FRAMING-1 scoping; the min-vis hard floor) because removing them changes the picture. **Parts B+C (five sliders onto one unit + migration) DEFERRED BY THE OWNER** on a blocking finding raised before building: "semantic, not visual" is _mathematically impossible_ — today's LEADER shows a fixed 427 px on every track, so any resolution-invariant rule diverges everywhere but one calibration track (searound +47%, mountainstreet +69%); and the spec's normaliser (`drawnBodyWidthRefPx`) is **non-monotonic in racer count** (mountainstreet LEADER @3.00: 719 px at 20 racers, 360 px at 40) which would import instability into the four states L82 makes immune. **Part E (the hard-coded 285) DIAGNOSED, NOT SHIPPED**: implemented then reverted — the same expression lives in RaceScreen, `headlessRaceSimulator.js` AND `sim-fairness.mjs`, and the value reaches `raceBehavior`'s separation physics, so a browser-only fix breaks sim/browser parity and a full fix touches simulation files; proven a no-op on all 10 shipped tracks (widest 300 px → effectiveWidth 285.0), with a SECOND absolute ceiling (`displaySize × bodyFillNarrow × maxScale`) pinned by tests behind it. New `projection.test.js` (15 tests, 3 failure proofs): projection-is-the-only-path (structural, blocks re-writing the CAMERA-FOCUS-5 defect), per-axis, resolution-consistency at k = 0.5/1/2/3 closed+open — plus a failure proof **documenting** that the four sprite-scale states are still absolute (fraction of world at 2× resolution ÷ at 1× = 0.500). 3392 tests green; tag `pre/projection` (`54cbe5d4`). **Owner's eye pending — expected result is NO visible change; a visible change is a finding.**
- [CAMERA-REFACTOR-1.md](CAMERA-REFACTOR-1.md) — MEASUREMENT of the zoom chain + every open/closed split (branch `camera-refactor`; **no behaviour, report + this line only**; no engine ceremony). **A: the Dev Screen "Sprite scale" slider means THREE different things.** LEADER/LEAD_CHANGE/BATTLE/COMEBACK: the number IS screen-px-per-world-px (visible world = 1280/n, racer- and track-independent). OVERVIEW on CLOSED: the number multiplies a target SPRITE SIZE (racer on screen = 28×n px), ceiling only `MAX_INVERSE_ZOOM` — **the planner's "effectively uncapped on the oval" reading CONFIRMED**. OVERVIEW on OPEN: the `stateZoom×0.8` ceiling **binds 100% of frames**, so the sprite normalisation is discarded and it becomes 0.8×n. **The owner's question answered: OVERVIEW 1.75 = 441 px visible vs LEADER 3.00 = 427 px — 3% apart, his eye is exactly right**; the horse's 16.9-px body makes 28×1.75/16.9 = 2.90 ≈ 3.00, a coincidence that does NOT transfer (searound/manta: 650 vs 427). **Formula table VALIDATED against the running director — 16 predictions, 2 real tracks, all match <0.5%.** **A4: the min-visible floor is NOT lap-asymmetric — it oscillates once per lap with the pack's position round the oval** (Y-axis binding swings 0%↔75% by progress decile; the Y term binds whenever dy > 0.67×dx) and field spread pushes the dips past the threshold: LEADER frames wider than asked 18.9% (lap1) → 46.3% (lap2), and **0.0%/0.0% with min-vis 0** — the owner's eye test reproduced exactly. Plus a **live unfixed CAMERA-FOCUS-5 bug**: `_zoomFloorForMinVisible` uses ONE divisor (bsX) on BOTH axes, treating Y as 18.5% more compressed than it is → floor ~6–7% too low on 58–69% of frames (but only 2–4pp of the override — not the main cause). **B: 50 open/closed sites** — 28 + 3 whole functions are PROJECTION (closed `cam.zoom` is world-relative via bsX/bsY, open is an absolute 1.5× — same effective zoom, different clamps), only 13 are genuinely SHAPE (one question — does the track parameter wrap? — asked in seven places; two `EditorShape` methods retire all 13). **B2 resolution sweep (0.5×–3×, closed + open): nothing is resolution-invariant across the range.** OVERVIEW-closed is the ONLY resolution-correct formula (14.4% / 14.4% / 14.4% of world) and a hard-coded `W_REF = 285` in RaceScreen's sprite sizing breaks it above ~4600 px; the other four states are absolute scales (27.8% → 13.9% for a 2× resolution change). **`MAX_INVERSE_ZOOM` means "never less than 10% of the world" on closed and "15× absolute" on open** — the slider runs to 5.00 but **its top 17% is already dead on every shipped closed track** (max reachable 4.17 at 3072), and **the owner's LEADER 3.00 would silently clamp on any closed track ≥ 4267 px** — the resolution every open track already uses. Same setting = 23.0% of the world on dirt-oval vs 11.5% on mountainstreet. **C: one block, not two** — adopt OVERVIEW's sprite-px unit for all five sliders (resolution-invariant by construction) AND one `isOpenTrack`-free projection object; explicitly excludes the min-vis floor, OVERVIEW-FRAMING-1's scoping and the W_REF cap so the owner's eye can attribute each.
- [CAMERA-REFACTOR-0.md](CAMERA-REFACTOR-0.md) — BRANCH + DIAGNOSIS + INVENTORY for the camera refactor (branch `camera-refactor` off master @`e5f0afa6`; **no behaviour, report + this line only**). No engine ceremony — struck by the owner for camera work; the physics is protected by the DIFF (no source file of any kind in the commit). **B1 leader-zoom bisect = OLDER THAN BOTH TAGS**: a deterministic 3-rung replay (seeded `Math.random` — the existing `exp-camera-bisect.mjs` does not seed it, so its rungs ran different event sequences) gives byte-identical LEADER framing at `pre/glide-target`/`pre/overview-framing`/master (zoom 4.344, 707 px visible, both laps); the lap-asymmetric mechanism is the OLD **min-visible zoom floor** (binds 0.0%→5.3% lap1→lap2 at defaults, 14%→25% at the owner's working zoom) — one named owner check (min-racers-visible = 0) closes it. **B2 = the number was wrong**: front-5 world span median **95 px = 3.1%** of the world (worst 5.7%), never "half"; the planner's per-lap-`t` cause is **REFUTED** (`r.t` is cumulative; worst in-group spread 0.028 lap, 0/5746 frames ≥ 0.5) — the real cause is a **units defect**: the sprite floor mixes live canvas px with a fixed 1280-referenced scale, so it binds 0% at the shipped 1280 canvas and 100% at 1920/2560, which also **contradicts the same report's "resolution-independent" check**. **B3 = CONCEDED** (no justification survives Grundpfeiler 6; and the split does not exist as described — OVERVIEW-FRAMING-1 silently removed the open-track radial offset too). **B4 = 11 lap-blind sites** (sharpest: the photo-finish gate measures a finishing-order gap with lap-normalized `shortestArcDeltaT`; `_camT` outside [0,1] on 54.5% of frames while the frame-log legend says 0–1 — the likely origin of the per-lap-`t` belief). **Inventory:** 7179 src lines, 6 states + 2 pseudo-states, **up to 4 sequential offset writers per frame** across 3 branches; 17 dead constants; a **Dev Screen slider that does nothing** (`overviewClosedTrackZoom`, deprecated 2026-06-04, tooltip still lies); 4 measured fallback-vs-default drifts; 5 newly-measured false assertions; 567 camera tests green but **zero multi-lap coverage** and `panTarget.test.js` **locks in** the lap-blind formula. **Part D = 30 eye-accepted behaviours + 6 flagged as never consciously accepted** (LEAD_CHANGE holds 37.6% of all frames). **Part E recommends reverting OVERVIEW-FRAMING-1 on master, source-only** (0 commits since `e5f0afa6` touch those paths → clean).
- [OVERVIEW-FRAMING-1.md](OVERVIEW-FRAMING-1.md) — FEAT (rule change): replace the magic 150-px toward-shape-centre OVERVIEW offset (which pushed the leader off the edge on ovals) with the owner's rule — frame the **leader + N racers** (owner slider) at a **derived zoom** floored at a **min sprite size** (owner slider, a frame FRACTION — no pixels), centre **behind the leader**, and the **leader ALWAYS in frame** (the offset yields, never the leader). Two top-level config keys + Dev-Screen sliders (schema bump waived — sole host; `loadCameraConfig` backfill + a live-path test instead). Scoped to **CLOSED tracks** (the defect + measured case; open keeps the whole-track overview — declared). 6 checks measured on seed 5601 (dirt-oval + searound × 3 canvas): leader worst-margin **15%** (never off-screen), **resolution-independent** (identical fractional framing at 1280/1920/2560), guarantee holds across slider extremes. **Honest finding:** the sprite floor binds ~100% on these big ovals (front-5 span half the world) — NOT "rarely"; the rule works (legibility wins, leader always framed) but "fit N" is mostly floor-capped → proposed a fixed-backward-arc shape if the owner wants otherwise. Clamp (cause C) inert in OVERVIEW (null anchor) — no interference. **Fingerprint dc4647be UNCHANGED.** Standing tests; tag `pre/overview-framing`. **NOT shipped until owner's eye (Lesson 191).**
- [CAMERA-GLIDE-TARGET-1.md](CAMERA-GLIDE-TARGET-1.md) — FIX for CAMERA-DETOUR **cause D only** (C left on purpose, one attributable change). `_setClosedTrackTargets`/`_setOpenTrackTargets` computed the glide endpoint (`targetOffset`) at the LIVE, still-easing zoom, so the endpoint travelled ~1150 px during the glide while the camera steered honestly toward a wrong point. Now, when `_lerpPhase==='glide'`, the endpoint is resolved at the DESTINATION zoom (`this.targetZoom`, same config path as the rendered zoom); entry/tracking paths untouched (they pin offset each frame). Standing invariant test (endpoint constant across the glide, two destination settings, open+closed) + entry-path-unchanged test. **World fingerprint UNCHANGED `dc4647be0f55ebdb`** (presentation only); camera+parity 509 green; post-fix harness glide shows `toX` flat (−265) vs the reference 1148 px walk, anchor monotonic. Tag `pre/glide-target`. **NOT shipped until the owner's eye accepts (Lesson 191)** — live seed-5601 acceptance at two zoom settings pending; clamp code byte-identical (C still present).
- [CAMERA-DETOUR-2.md](CAMERA-DETOUR-2.md) — the STEP-3 VERDICT for CAMERA-DETOUR-1 (read as ONE story) + one narrow instrument extension; still fixes nothing. From the owner's four seed-5601 windows: **candidate C CONFIRMED** (the "no-op mid-glide" containment clamp is STEERING — active 23/23 frames, `containDX`→−390 px while the anchor barely moves; Lesson 192 wiring bug) and **candidate D CONFIRMED** (frame 0 captures the glide's target framing in the OTHER state's zoom scale — full step, all four windows); **A EXCLUDED** (`gso*`==`preo*`); **B NOT evidenced** yet the LEADER_ZOOM→OVERVIEW window shows a 444 px wrong-way excursion with `containMod:false`/`camTRead:false` = the OPEN window. Extended the gated log (anchor WORLD pos, `targetOffset`, glide `s/e`, writing branch, centroid count) so the owner's re-run separates anchor-motion from camera-motion (STEP 3 (i)/(ii)/(iii) pending). PROPOSED fixes: gate the clamp to steady tracking (C, with a `containDX==0` mid-glide test); compute the pan endpoint at `targetZoom` (D, by construction); **ship D first** (universal, isolates the open window). Fingerprint unmoved.
- [CAMERA-DETOUR-1.md](CAMERA-DETOUR-1.md) — DIAGNOSIS (fix nothing): locate where the camera's every-transition wrong-direction move begins. Algebra rules out the glide interpolation (linear/monotonic) → 4 candidates: (A) wrong glide start, (B) second mover (`_camT`/follow in parallel), (C) mid-glide clamp steering, (D) one-frame zoom offset in `_setTargets`. Built a read-only, config-gated (`cameraDetourLog`, default OFF) per-transition frame log (3 pre + ~30 post) capturing the new-anchor screen position with the SAME rendered offset/zoom + the A/B/C/D signals; `node:test` liveness proof (emits ON, nothing OFF); mutates no camera value. **STEP 3 readout WAITS on the owner's live [RA CAMERA DETOUR] trace, seed 5601 (Lesson 191 — no replay substitution).** STEP 4: `panTarget.js` `tMid=(r0.t+r1.t)/2` wrap bug is REAL (per-lap t wraps at the seam) but the guarded path is an empty-group/test-only fallback — not the live symptom; not fixed. **No fingerprint move.**

- [CAMERA-GRAMMAR-1.md](CAMERA-GRAMMAR-1.md) — ship grammar (B) FULL GLIDE as default per the owner's verdict (hard cuts too abrupt), correctness decoupled from style. **On entry pan+zoom ease TOGETHER over glideDurationMs (500, validated 300-900) to the forward-framed target — the 3436px cut becomes ~230px/frame smooth, leaderOut 0%. Glide captures the PRE-transition framing (before OVERVIEW/LEAD_CHANGE zoom snaps) so no snapped-zoom+gliding-pan hybrid; zoom-about-anchor holds through the glide by construction. Both shipped grammars (glide/cut) promote follow + per-axis + anchor-pivot (legacy = bare-caller fallback, still used by finish-mode). Dev panel exposes transition style + glide duration + leader forward-frame. fp `ded0a126`; 955 tests.**
- [CAMERA-SIDEJUMP-1.md](CAMERA-SIDEJUMP-1.md) — the leader lurches to the frame edge on a mid-hold zoom change, then the pan travels back (owner: "leader absolutely not where he should be", HUD stays FOLLOWING LEADER). **Microscope convicted the min-vis floor loosen (lurch gone with min-vis off; persists at frac 0.5 → bias only amplifies). REAL cause = systemic: the camera zooms about the WORLD ORIGIN, so any zoom change slides the anchor faster than the pan lerp follows. ROOT FIX (owner asked for the non-recurring one): zoom about the ANCHOR — re-apply each frame's zoom delta around the anchor's world pos so its screen position is preserved; the pan lerp only eases to the forward target. One follow-path spot → every zoom source lurch-free. Leader 0.27(edge)→0.42(smooth). fp `ded0a126`; 665 tests.**
- [CAMERA-FOCUS-5.md](CAMERA-FOCUS-5.md) — the Y-axis screen-mapping bug (edge-riding + jumping + the 44% clamp, one cause). **Bias sign-error hypothesis FALSIFIED (Y clamp still 44% at frac=0.5, bias inert). Real bug = live-vs-replay divergence: the FOCUS-1 containment clamp mapped the anchor's Y with `bsX` while the render uses `ctx.scale(zoom·bsX, zoom·bsY)` — on the non-square searound world (19% axis mismatch) the clamp mis-scaled Y, shoved the leader to the top edge, fired ~44%. Fix: per-axis clamp (bsY on Y) + screen-faithful forward-bias → Y clamp 2342→4 (0.1%), leaderOut 0.0%, leader lands 2/3 forward on ALL 4 headings incl. vertical. My harness masked it by measuring Y with bsX too. fp `ded0a126`; 372 camera tests.**
- [CAMERA-FOCUS-4.md](CAMERA-FOCUS-4.md) — prove what the owner's browser actually runs (he reports 1:1 identical while the replay measures the new camera). **Added a permanent commit-stamped race-start LIVE TRUTH console line (resolved grammar · observer phase after entry · per-key config source) — reload + paste settles stale-bundle vs stale-config in one glance. Prime suspect (config merge dropping new keys) tested + EXONERATED: the v17 merge already resolves grammar `cut` (no server-side config path) → the divergence is almost certainly a STALE BUNDLE. STEP 1 systemic fix shipped anyway: `loadCameraConfig` fills any missing DEFAULT key on every branch (4 tests). World-edge framing WITHDRAWN (owner geometry = infield above). fp `ded0a126`.**
- [CAMERA-FOCUS-3.md](CAMERA-FOCUS-3.md) — kill the hard transition jumps (FOCUS-2's named successor). **Grammar (A) TRUE CUT: every anchored entry snaps pan+zoom together frame-1 — the ~1.6s corner-riding acquisition is dead, 6/6 cuts land framed. Fixing observer-phase promotion made the follow tracker frame the leader (X clamp 1634→~3 idle). Leader framed FORWARD, pack behind (owner design), UI `leaderForwardFrac` 0.66. Residual: Y clamp ~44% on the tall searound loop at tight zoom (world-edge tension) → CAMERA-FOCUS-4. `cameraTransitionGrammar='cut'` shipped (legacy fallback); grammar (B) glide named. fp `ded0a126`; 944 tests green.**
- [CAMERA-FOCUS-2.md](CAMERA-FOCUS-2.md) — the owner's timeline claim ("the camera was fine a few days ago") tested as a measured **bisect ladder**: one searound seed-5601 replay into 5 camera commits. **REFUTED — the leader-off-frame was 98.7% of the early window at EVERY pre-clamp rung including "a few days ago" (dc920c7); today's clamp is the first fix (→12.3%). A trackingTC sweep proves EMA sizing can't contain it (98.7% at tc 0.06) — the clamp is structural. The early "jumping" is invariant across rungs = hard state-transition cuts (858px vs 7.7px, max 3436px), an OLD separate defect. CONSEQUENCE: do NOT revert (today is the best rung); next = CAMERA-FOCUS-3 soften transition cuts. Read-only, fp `ded0a126`.**
- [CAMERA-FOCUS-1.md](CAMERA-FOCUS-1.md) — the LEADER-family camera drifted AWAY from the current leader. STEP-0 proved the pan IS anchored on the leader (midpoint suspect falsified, `rawPan == leaderX`); the drift is **pure pan lag** — the smooth lerp trails a fast leader and the tight LEADER zoom amplifies it past inner-70 (69/100 frames at fast+tight, 0 when slow or zoom relaxed; LEADER-MINVIS-1 masks it). **FIXED: per-frame containment clamp (pan mirror of the min-visible zoom floor) → 0/100 outside inner-70; anchor helper + dev HUD ▸anchor line; fp identical `ded0a126048e4cdb`.**
- [BATTLE-WEIGHT-ZERO-1.md](BATTLE-WEIGHT-ZERO-1.md) — a weight-0 camera event (BATTLE) still entered (unguarded pool push + selector returned zero-weight/zero-sum picks). **FIXED: weight>0 pool guards + selector filters weight<=0 → null; fp identical.**
- [CAMERA-JITTER-1.md](CAMERA-JITTER-1.md) — the LEADER-MINVIS-1 min-visible floor jittered zoom+pan (binding racer flips each frame in the dense field). **FIXED: asymmetric rate-limit (loosen instant, tighten slow) → floor swing 0.42→0.04; fp identical.**
- [BATTLE-TRIGGER-RANGE-1.md](BATTLE-TRIGGER-RANGE-1.md) — Pulk Closeness / Isolation sliders re-scaled to the sub-1% zone (0.1%–2.0%, step 0.1%) for the dense COMBO15 field. **Presentation-only; defaults unchanged; fp identical.**
- [LEADER-MINVIS-1.md](LEADER-MINVIS-1.md) — the LEADER "zoom out until ≥8 visible" rule existed but didn't act (slow ratchet zoomed in first, crawled out, reset on transition). **FIXED: direct per-frame min-visible zoom floor; fp identical.**
- [OVERVIEW-ZOOM-1.md](OVERVIEW-ZOOM-1.md) — the OVERVIEW view ignored the selected sprite scale (L116/`c7fa30a` regression). **FIXED: selected scale multiplies the normalized target; default unchanged, fp identical.**

## Hygiene + record (2026-07-29)

- [ONE-DRIVER-1.md](ONE-DRIVER-1.md) — **ONE RACE DRIVER, AND THE RACE IDENTITY BECOMES VISIBLE** (branch `one-driver-1`, base master `ea92181a`). **NOT deduplication**: the four harnesses were never identical and were not meant to be — `his-shot-truth` runs the OWNER'S context (n=65, boarder, camSeed 882944666) from his marker, the other three run n=40 on each track's own default racer. **The defect was that nothing SAID so where the numbers are read** — NIGHT-1 put an n=65 figure beside n=40 figures. So the driver's input is a RACE IDENTITY with **no hidden defaults** (an omitted field still comes back out) and every script now PRINTS it, human-readable and in `corridor-truth --json`. A fourth identity difference the spec did not name: the per-track vs forced racer type, now the explicit `TRACK_DEFAULT_RACER` sentinel. **EQUIVALENCE PROVED FIRST — seven captures, all seven reproduce EXACTLY**, the only diff being the identity line (added for three; for `his-shot-truth` REPLACING its bespoke one-off line, so its diff shows a changed line where the others show an added one). Re-verified after Prettier touched two scripts. **THE STOP RULE FIRED AND THE ANSWER WAS "MY PORT", NOT "THE NUMBERS"**: `edge-crossing` first returned **230 crossings of 90102 frames against a captured 215 of 90237** — a blanket `continue`->`return` had turned a `continue` that skipped to the NEXT SUBJECT inside `for (const s of subs)` into a `return` abandoning the whole frame. **The refactor looked clean, ran without error, and was 7% wrong; only the capture caught it.** A SECOND, FALSE alarm was avoided by diffing rather than trusting memory (a remembered 0.999 was a pre-company-only figure) — comparing a number to a memory instead of its own capture is the same mistake one layer up. **A third defect surfaced**: `--owner-unit` set `referenceCorridorPx` AFTER `buildRace` built the director, where it would have **silently done nothing**; `trackWidthOf()` is exported so the config is shaped first. **COUNTDOWN DIVERGENCE DECIDED, not picked**: the config being RUN wins, because a harness measures a race under a GIVEN config and these scripts override settings routinely — cosmetic today, load-bearing in principle, with a test asserting a longer countdown actually delays the start. **SEVEN CALLERS EXIST, NOT FOUR**, and three stay out with reasons: `camera-fingerprint` and `render-fingerprint` are **the gate this refactor is measured against — a tool that changes in the commit it validates cannot validate it**, and `camera-replay` takes its identity from the owner's marker and is his live repro tool. **HARD GATE HELD: camera `7a33faf2ec131437`, render `73ba53ba9fea12c7`, world `dc4647be0f55ebdb`, all bit-identical.** Lines 1221 -> 806 across four scripts plus 255 shared; tests +10 incl. **the identity PRINTED is the identity RUN**; suite 136/136. **PROPOSALS**: hash the identity — but it must hash the camera CONFIG too, since `--company-only` produces the same identity line and different numbers; a NARROW report convention (**when two numbers sit side by side they must share one stated identity or carry different ones visibly** — a rule about juxtaposition, not about every figure); and make the before/after capture standing practice, since a 7%-wrong refactor that ran clean is the argument.
- [TAG-GUARD-3.md](TAG-GUARD-3.md) — **THE REGISTER BACKFILLED, THE GUARD COMPLETE IN BOTH DIRECTIONS** (merged with history; bases `tag-guard-2` `76d3f051` on master `6179921c`, both as stated). **THE 48/49 DISAGREEMENT: NEITHER NUMBER WAS STALE** — they counted different things. 48 distinct declared names vs 49 declaration LINES, because `pre/anchor-truth` is legitimately declared once and restated later as still valid; a cross-reference inflated a line count. Fixed at the runtime end (count DISTINCT names). **A COUNT DOES NOT BELONG IN A COMMENT and is now removed** — but asserting it in a test would fail on every new tag, which is noise, and noise is how guards get ignored. **The count is not the property; precision is**: the comment describes the SHAPE and the hazard, the guard recomputes its numbers every run, and the exit code enforces what they express. **THE BACKFILL: 18, NOT 17.** Both pre-checks passed for all of them — every one exists at origin, none is a branch — so **the hole was hypothetical, not realised**. Each declared in its OWN section, so no canonical home moved. **ONE NEEDED A DECISION, AND IT EXPOSED A TRAP IN THE NEW RULE**: `v-parity-complete` is a LIVE tag whose only mention sat under _"Parity phase — COLLAPSED"_, where the retired-section exclusion would have **skipped it — leaving it looking registered while unguarded in BOTH directions**, i.e. the exact condition the thread is about, reintroduced by the mechanism meant to prevent it. Declared instead under `v-*-complete (phase endpoints, retained)`, its home by the register's own taxonomy, with the reasoning beside it so nobody tidies it back. **General rule now stated in the register: never record a LIVE tag under a RETIRED/COLLAPSED heading.** **A SECOND DECLARATION FORM WAS FOUND** — ``(commit `sha`)`` plus two entries carrying correct shas mid-sentence — **and the register was normalised rather than the regex widened**, deliberately: admitting a second dialect makes the next variant easier to justify. The convention is now written at the top of `docs/TAGS.md`, including that a differently-shaped entry is **silently unchecked, which is worse than a failure**. **BOTH NUMBERS: 66 and 66** — direction-2 recall is 100% and TAG-GUARD-2's named residual (a legacy tag deleted from origin while its sha-less mention stayed, invisible to both directions) is **closed by construction rather than by rule**. Script suite 126/126. **NO TAG MINTED, as a decision**: a register is worth the proportion of its entries that mean something, and "a guard got better" is not a phase endpoint. **PROPOSALS**: the other one-directional guard is **`check-index`** (reports→index, blind to an INDEX line naming a report that does not exist) — named, not fixed; `check-doc-links`+`check-index` are the same property done RIGHT, and the two-guard split is what makes each honest; and the last unrecorded item I was carrying — **four measurement scripts each duplicating the ~100-line race driver**, with nothing asserting they stay identical though their numbers are compared as if they were.
- [TAG-GUARD-2.md](TAG-GUARD-2.md) — **THE GUARD NOW CHECKS THE DIRECTION IT WAS BUILT FOR** (branch `tag-guard-2`, pushed; base master `6179921c`, one docs-only commit ahead of the spec's `a693010` and containing it). `check-tags` took origin as truth and asserted every origin tag was registered — so _an origin tag missing from the register_ was CAUGHT while _a registered tag that exists nowhere_ was BLIND, and the second is the incident it was built after. **THE PARSING WALL, MEASURED**: a name scan finds **292 tag-shaped tokens of which only 66 are tags — 77% false positives** — because **a tag name is indistinguishable from a BRANCH name**; nine absent tokens sit under _"Permanent anchors (do NOT delete)"_ and every one is a branch (`exp/company-only`, `exp/fair-arrival`, `diag/look-before-brake`…). A naive guard would have opened by screaming about nine permanent anchors that were never tags. **BUT NO FORMAT CHANGE WAS NEEDED**: the register already registers tags in a DECLARATION form — a list item naming the tag with its sha in backticks — which measures **49 declarations, all 49 real, ZERO false positives** (recall 49/66; the 17 legacy flat-list entries are covered by direction 1). Precision is the property that matters, and the declaration form is the form **every new registration is written in**, so it covers exactly the lines where the incident can recur. **RETIRED TAGS EXCLUDED BY AN EXPLICIT NAMED MECHANISM** — the section heading (`/RETIRED|COLLAPSED/i`) — **written down precisely because today it excludes nothing**, so the rule is not a coincidence somebody later trips over. **LOCAL-ONLY TAGS DELIBERATELY NOT IN CI, with the reason**: a runner clones from origin, so the question is not hard there but _unanswerable_; `audit-local.mjs` owns it, and the guard's header now says so. **+5 tests, failing case FIRST per L187**, incl. prose-mentions-must-not-fail pinning the 77% case; script suite **126/126**; diff is `scripts/` only. **THE WORKTREE SWEEP FAILED AND THAT IS THE FINDING**: prune identified all ten stubs and deleted **none** — every one carries `ReadOnly, Directory, Archive, ReparsePoint`, i.e. **OneDrive Files-On-Demand placeholders whose ReadOnly attribute blocks the delete**; not a lock, an attribute; `.git` itself is a ReparsePoint. Left in place, not forced, now explained rather than counted. **PROPOSALS**: the pattern is **ONE lesson, already written as L201 (the Half-Repair Law)**, with the sharper half added — _a partial guard is indistinguishable from a complete one while everything is clean_, so a guard should write down the directions it does NOT check; the ceremony step for stubs would have **silently done nothing** since prune already fails, and a ritual that cannot succeed teaches people rituals are optional; the declaration convention should be stated **in** the register (a new entry in a different shape is silently unchecked, which is worse than a failure); and the honest residual is **recall** — if a legacy tag were deleted from origin while its sha-less mention stayed, **both directions would be silent**, fixed by backfilling shas into the 17 legacy entries.
- [LOCAL-INVENTORY-2.md](LOCAL-INVENTORY-2.md) — **WHAT EXISTS ONLY ON THIS MACHINE** (read-only; nothing deleted, pruned, pushed, copied or exported). Run at the moment the books looked closed at origin — master-only, 66 tags, three fingerprints recorded — because that is exactly when this project has been wrong before. **`audit-local.mjs`: five of six categories EMPTY** (clean tree, no stashes, master only, no local-only tags, no untracked `*.md`); the sixth is 275 MB of scratch, reproducible and already off the OneDrive tree. **THE FIVE CHECKS THE TOOL DOES NOT COVER**: ahead of origin **0**, behind origin **0** (local and origin both `a6930104`, so the dev server runs exactly what shipped), tags **clean in BOTH directions** (66 = 66, no local-only, no origin-only), and **TEN orphaned `.git/worktrees` stubs** (up from the nine reported earlier) which `prune --dry-run` would clear entirely — pure metadata, not pruned as instructed. **THE HEADLINE, and it SHRANK under measurement**: `server/data` is 68 MB and ignored, but refusing to treat it as one lump collapses it — **10 of its 13 backgrounds are BYTE-IDENTICAL to the tracked seeds (~52 MB), and its 10 tracks differ from the seeds by exactly ONE SCHEMA KEY** (`defaultDuration` vs `defaultLaps`; no geometry, no value). **What is genuinely UNIQUE is ~9 MB — three uploaded background images — plus ~25 KB of accounts, one brand, one logo and two player-groups.** **The owner's open OneDrive question is ANSWERED read-only**: the sync process has run since 01.08 11:45 and every sampled file carries the `ReparsePoint` attribute, so the folder IS in sync scope — **with the caveat that outranks the answer: OneDrive is sync, not backup, and mirrors a mistake as faithfully as a file.** **PROPOSALS**: fold only TWO of the five checks into the tool (worktree prune, and `server/data` reported as UNIQUE-vs-REPRODUCIBLE rather than as a total — "68 MB" is useless, "9 MB" is actionable, and the difference is one `cmp` against `seeds/`); **`check-tags` catches exactly ONE direction and it is the WRONG one** — it iterates ORIGIN and asserts each tag is in the register, so it can see neither a registered tag that exists nowhere NOR a local-only tag, **which is precisely the failure it was built after**; the 275 MB scratch line needs a threshold or should stop printing, because a number that is always there and never actionable teaches people to skim the tool. **Conclusion: the books are as closed as they look, with one 9 MB exception.**
- [HYGIENE-1.md](HYGIENE-1.md) — empty the hygiene list: single-sourced phase defaults, `racePlanPulkStart` DevScreen control, CI link-checker + audit-gate, local tooling, react-router 6→7. **Behavior-neutral (fp identical).**
- [DOC-SYNC-1.md](DOC-SYNC-1.md) — bring every living doc to COMBO15 (pulkStart 0.15, fingerprints, dangling links). **Doc-only; fp identical.**
- [DOC-SYNC-2.md](DOC-SYNC-2.md) — reconcile the living docs with the shipped world `dc4647be` after RACER-FLAPPING-2 + RACER-MOTION-2 + the HOLM-300-COMBINED gate: FAIRNESS/PROJECT-PRINCIPLES/ARCHITECTURE shipped-world + start-row-gradient residual, REBASELINE verdict, INDEX HOLM entry + PAID markers, TAGS register (pre/flapping, pre/motion), LESSONS L191–193 (the camera saga's laws), DEAD-ENDS H, BACKLOG/ROADMAP baseline + HUD-badge-DONE + long-term items. **Doc-only; no source, fp identical.**
- [LOCAL-INVENTORY-1.md](LOCAL-INVENTORY-1.md) — fix the script-test runner's silent-pass (empty `find` list → assert non-empty + FAIL LOUD, `chore(guard)` before the inventory), then inventory everything `origin/master` can't see. Headline: 8 categories, **exactly ONE holds anything UNIQUE** — `server/data/` (68 MB owner content: tracks/backgrounds/logos/users/sessions), git-ignored but OneDrive-synced; everything else reproducible (202 MB off-tree scratch, node_modules, tool output). **Zero** local-only branches/tags/stashes, **zero** abandoned WIP, **zero** OneDrive conflict copies. Nothing deleted — recommendations only. **No source touched.**
- [SHIP-GUARD-2.md](SHIP-GUARD-2.md) — close the SHIP-GUARD-1 review findings (string work only): run the script test suite in CI (guard liveness + observers, `node --test`, ~1s, no npm ci); **exact whole-token tag matching** in check-tags (was substring — prophylactic, 0 substring pairs among 45 tags); correct the CI comment + drop `fetch-depth: 0` (check-tags reads `git ls-remote`, not local tags); two honesty notes (check-index flat-scan reach; ceremony transcript-from-committed-state). **check-world.mjs (the stale-fingerprint guard) STOPPED at the stop rule** — single-sourcing the hash from SIM.md prose + current-vs-historical disambiguation are both too brittle; proposed a machine-readable `shipped-world` source as the robust prerequisite. **No source touched, fp identical.**
- [SHIP-GUARD-1.md](SHIP-GUARD-1.md) — write the ship ceremony down ([docs/SHIP-CEREMONY.md](../../docs/SHIP-CEREMONY.md), 12-step checklist + ONE CANONICAL HOME) and give CI the two guards for the classes a human can't see: `check-index.mjs` (every report indexed) + `check-tags.mjs` (every origin tag registered), both loud-fail (Lesson 187) with `node:test` liveness proofs, wired into the docs CI job. Plus the 3 DOC-SYNC-2 residuals (register pre/hygiene + pre/router-7; MOTION-1 owner outcome; stale-master-hash sweep → fingerprint identifies the world) and 3 backlog decisions (Re-Gate 9cfa953 + Late Challenger CLOSED-superseded; E3 narrowed to the trajectoryMult half). **No source touched, fp identical.**
- [CLEAN-SWEEP-1.md](CLEAN-SWEEP-1.md) — remove the 2 dead FAIR-ARRIVAL arms + full local audit. **Byte-neutral (fp identical); 780 MB scratch purged.**
- [DOCS-1.md](DOCS-1.md) — the complete written record: preserve the 3 closed branches' reports, L184–189, DEAD-ENDS §G, FAIRNESS.md. **Record complete.**

## The FAIR-ARRIVAL → COMBO15 line (SHIPPED)

- [FAIRNESS-RECHECK-1.md](FAIRNESS-RECHECK-1.md) — read-only re-proof the shipped world still holds its gate after the camera week. **fp `ded0a126` IDENTICAL first+last (byte-identical world). N=100 quartet: band arrival 88.3–91.6% (in the 85–90% band, matches ROSTER baseline), runaway 0%, rowMin 88–91% — headline GREEN. Holm flags 3/4 at the small-N hero-map config = the known 7/10 near-pass texture (not a regression — fingerprint proves no change; definitive Holm = the 300-race native gate). Action metrics need the pulk harness (not captured).**
- [ROSTER-MATRIX-1.md](ROSTER-MATRIX-1.md) — does every surface-compatible racer reach its band on the tracks it belongs on? Read-only measure of all 71 eligible `(type, track)` cells on COMBO15. **YES — every cell 84.4–91.0% arrival, 0% runaway; worst = seatrack/rocket 84.4%. One signal: rocket is the softest cell on 4 open water/air tracks (mild over-power). fp identical `ded0a126`.**
- [MERGE-SHIP-1.md](MERGE-SHIP-1.md) — COMBO15 becomes the default world; source cleaned. **SHIPPED (fp ded0a126).**
- [STEER-CAP-1.md](STEER-CAP-1.md) — cap the boost side of the chaos steer to close space-sprint's gap. **KILL — backfired 6/6 (Lesson 189, wrong lever).**
- [FAIR-ARRIVAL-GATE.md](FAIR-ARRIVAL-GATE.md) — binding N=100 × 10-track record on COMBO15. **PARTIAL near-pass (7/10 full-pass); pulk flatness FIXED.**
- [PULK-SPECTACLE-1.md](PULK-SPECTACLE-1.md) — measure the owner's "mid-race gone flat" finding. **Confirmed: full chaos sort empties the pulk; 0.15 window fixes it (Lesson 185).**
- [EYE-SETUP-2.md](EYE-SETUP-2.md) — OPEN browser viewing with proof-of-live. **The whitelist trap + proof-of-live standard (Lesson 187).**
- [EYE-SETUP-1.md](EYE-SETUP-1.md) — the owner's blind A/B browser viewer. **DEAD tooling (never armed); replaced by proof-of-live.**
- [FAIR-ARRIVAL-CONFIRM-1.md](FAIR-ARRIVAL-CONFIRM-1.md) — COMBO across all 10 tracks, N=50. **Strong confirm (9/10); garden-path is a ceiling track.**
- [FAIR-ARRIVAL-COMBINE-1.md](FAIR-ARRIVAL-COMBINE-1.md) — the owner's two halves together (steer + draw-bias). **Night-gate PASS.**
- [CHAOS-STEER-1.md](CHAOS-STEER-1.md) — the owner's Part 1 (chaos steer) built reachable, measured alone. **Grips; action ≈ ship+.**
- [FAIR-ARRIVAL-1.md](FAIR-ARRIVAL-1.md) — steer the chaos, aim the dice. **First non-cliff win: aim the DRAW, not the position (Lesson 184).**

## The band-corridor / free-band line (DEAD)

- [ACTION-FREEBAND-2.md](ACTION-FREEBAND-2.md) — the dial without the stowaway (preregistered close). **Line CLOSED; the dial is a CLIFF; the proximity floor is a fairness asset (Lesson 186).**
- [ACTION-FREEBAND-1.md](ACTION-FREEBAND-1.md) — band corridor + finale tempo noise. **Hard wall pins, soft spring leaks.**

## The choreo-release line (DEAD)

- [CHOREO-RELEASE-2.md](CHOREO-RELEASE-2.md) — both owner parts at full strength on the archived world. **Decided finale stays flat (3rd confirmation).**
- [CHOREO-RELEASE-1.md](CHOREO-RELEASE-1.md) — release each racer to the ship's re-roll once home. **Arrival-safe but flat (Lesson 185, decidedness).**

## The chain-choreography / admission-action line (DEAD)

- [ACTION-NIGHT-1.md](ACTION-NIGHT-1.md) — full-world gate: 10 tracks × N=100 × durations. **Admission-only cannot buy sustained P1 uncertainty.**
- [ACTION-BUILD-7.md](ACTION-BUILD-7.md) — the owner's finale cast (final-draw for all). **Dual-scoreboard reading (Lesson 188); front stays decided.**
- [ACTION-BUILD-6.md](ACTION-BUILD-6.md) — clearance-graded script budget. **Sub-metric gains only.**
- [ACTION-BUILD-5.md](ACTION-BUILD-5.md) — local-clearance admission (the owner's situational rule). **Admission-side; no sustained contest.**
- [ACTION-BUILD-4.md](ACTION-BUILD-4.md) — the finale script compiler (build + first look). **Authored cast ≠ live undecidedness.**
- [ACTION-BUILD-3.md](ACTION-BUILD-3.md) — the proximity floor (closeness is the author's job). **Closeness = fairness asset (feeds Lesson 186).**
- [ACTION-BUILD-2.md](ACTION-BUILD-2.md) — the open lane (closed-track fix, admission-side). **Fixes lane-jam to ship parity.**
- [ACTION-BUILD-1.md](ACTION-BUILD-1.md) — the merged action system (time-boxed build). **Topology split; band-fairest but closed jams.**
- [ACTION-CONCEPT-CC.md](ACTION-CONCEPT-CC.md) — split-and-script action concept (CC consultation). **The accordion + reachability accountant.**
- [CHAIN-ABLATE-1.md](CHAIN-ABLATE-1.md) — the naked chain, then earn everything back. **Chain is a fair SORTER, not an action generator.**
- [CHAIN-INT-1.md](CHAIN-INT-1.md) — chain choreography in the real machinery. **KILL on the action bar (byte-identical OFF).**
- [CHAIN-SIM-1.md](CHAIN-SIM-1.md) — standalone chain sim experiment. **Standalone PASS (band-reach gate).**
- [DRAMA-1.md](DRAMA-1.md) — owner drama formations + free front rank. **All discarded; envelope-capped; the servo IS the action engine.**
- [FRONT-AUTOPSY-1.md](FRONT-AUTOPSY-1.md) — what exactly kills top-place action. **Enemy = over-steer (servo rank-hold), not drive.**
- [CHAIN-CHOREO-CC.md](CHAIN-CHOREO-CC.md) — chain-choreography concept (CC consultation).

## Greenfield / handicap-pursuit (DEAD — identical racers)

- [PURSUIT-PROTO-2.md](PURSUIT-PROTO-2.md) — lateral realism under the no-co-location gate. **KILLED; overlap-free traffic core is the reusable asset (Lesson 183).**
- [PURSUIT-PROTO-1.md](PURSUIT-PROTO-1.md) — handicap-pursuit standalone sim. **PASSED standalone but the premise is moot (identical racers).**
- [SYSTEM-RESCUE-CC.md](SYSTEM-RESCUE-CC.md) / [SYSTEM-RESCUE-2-CC.md](SYSTEM-RESCUE-2-CC.md) / [SYSTEM-RESCUE-2-COPILOT.md](SYSTEM-RESCUE-2-COPILOT.md) / [RESCUE-3-CC.md](RESCUE-3-CC.md) — blank-page late-race ideation (CC + Copilot).

## Evolution Act 1 & 2 (REVERTED)

- [FINALE-ADAPTIVE-SCREEN.md](FINALE-ADAPTIVE-SCREEN.md) — Act 2 adaptive finale gates, the decisive test. **REVERTED; no single track-agnostic finale-dice law (Lesson 182).**
- [FINALE-SCREEN.md](FINALE-SCREEN.md) — Act 2 finale front-compression screen. **Same dose does opposite by topology.**
- [FINALE-ADAPTIVE-CC.md](FINALE-ADAPTIVE-CC.md) / [FINALE-DESIGN-CC.md](FINALE-DESIGN-CC.md) — Act 2 CC design opinions.
- [AFF-SCREEN.md](AFF-SCREEN.md) — Act 1 assignment-follows-field screen. **REVERTED; live-following target kills the restoring force (Lesson 181).**
- [AFF-NEXT-CC.md](AFF-NEXT-CC.md) / [AFF-DESIGN-CC.md](AFF-DESIGN-CC.md) — Act 1 CC opinions.

_Ordering is newest-arc-first; within an arc, newest report first. When a new report lands, add its line at the top of the matching arc (or a new arc section at the top)._
