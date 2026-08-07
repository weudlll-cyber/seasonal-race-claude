# Night blocks — index

Unattended blocks: one file per block, newest first. These are lab-journal entries and are
**append-only** — a report records what was true on the day it was written and is never rewritten.

This index exists because `reports/night/` sat outside every guard until ONE-TRUTH-2 stage 5: a
report here could be orphaned, or an index link could dangle, with nothing noticing.
`node scripts/check-index.mjs --dir=reports/night --index=reports/night/INDEX.md` now checks both
directions.

- [HARNESS-NAMES-1.md](HARNESS-NAMES-1.md) — the render harness never set `r.name`, so every label
  box in it was 8px of padding: it measured a geometry the game cannot produce. Fixed with the MIXED
  roster, by index, imported from the one home; render **re-minted deliberately** to
  `f2e170d17ccf84e9` as an INSTRUMENT change (world and camera unchanged, engine-reach says the diff
  cannot reach the engine). **The block's own proof did not come out as predicted and the report
  leads with that:** attribution was never broken — a one-track change moved one hash both before and
  after. What was broken is narrower, and the second probe found something new: with MIXED at 40
  racers every track genuinely overlaps, so the instrument now SATURATES for the class of rule it was
  fixed to measure. Two further harness blind spots named, including that `verify` does not run the
  render guard when the harness itself changes.
- [CLEANUP-BEFORE-NUMBERS-1.md](CLEANUP-BEFORE-NUMBERS-1.md) — salvage what lasts, then drop the
  rest. The four label branches land as history FIRST, then the two invisible pieces are salvaged
  (the countdown gets one home and its dead-but-live Dev control is removed; the label box gets one
  home), then the branches are archived as tags and deleted. The overlap trigger was dropped
  deliberately: exact, and out of a job once race numbers make its condition unreachable. Both
  fingerprints unchanged — asked of `engine-reach` rather than assumed, which said the world one was
  owed. Master afterwards: one open branch, `feat/min-racers-visible-5`.
- [ROLL-CALL-PAIRING-1.md](ROLL-CALL-PAIRING-1.md) — **NOT SHIPPED (recorded result).** A label
  centred on its racer only POINTS at it while it is about one racer wide; with realistic names it
  spans a handful and identifies none. That finding is why the race-number design exists, and it
  applies to any label wide enough. Measured: dimming everyone else still leaves 74-100% of labels
  ambiguous, and pairing is a LONG-NAME problem, not a crowded-formation one — a one-wave formation
  at 30 racers was 100% ambiguous.
- [START-SEQUENCE-1.md](START-SEQUENCE-1.md) — **ROLL CALL NOT SHIPPED (recorded result).** Waves of
  names during the countdown: 0 overlaps, 0 names missed, 86.5% of cases needing one wave. Its stage
  0 finding IS on master — the countdown was a three-way disagreement where only `countdownDurationMs`
  governed anything. Still open and deliberately not salvaged: the overlay counts from a hard-coded 3
  while the phase lasts 4000 ms, so "GO!" stands an extra second.
- [LABEL-SHRINK-1.md](LABEL-SHRINK-1.md) — **BUILT AND REJECTED AT THE PICTURE (recorded result).**
  It cleared every overlap at every field size and the owner judged the result unacceptable to look
  at — a rule can pass every number it was given and still be wrong. Two findings outlive it: the
  render-fingerprint harness draws NAMELESS racers and cannot see this class of change, and stability
  between adjacent field sizes cannot hold while the start grid is a staircase. Its label-box
  unification IS on master.
- [LABEL-STAGGER-1.md](LABEL-STAGGER-1.md) — **NEVER SHIPPED (recorded negative result).** A stagger
  CREATES as many overlaps as it removes: start rows are not monotonic in screen y, so shifting a
  whole row walks the collision into the next one. Four variants measured, none reaching zero.
- [QUICKTEST-NAMES-1.md](QUICKTEST-NAMES-1.md) — testing with realistic name lengths, and **the
  shrink rule does not survive it**. Every overlap number this project had measured was a statement
  about a 4-8 character roster. With realistic names (mean 19.4) the picture inverts: 3 affected
  tracks become **10 of 10**, the 0.6 legibility floor is hit on **9 of 10**, and **365 field sizes
  still overlap after the shrink has done everything it can** — headroom 0.096 -> 0.000. The numbers
  point at the roll-call-in-waves proposal, not at more shrink. QUICK_TEST_NAMES is byte-identical
  (world fingerprint `dc4647be0f55ebdb` unchanged, golden parity 14/14); LONG and MIXED are additional
  and selectable, defaulting to the original BY IDENTITY. Also found: the maximum name length has
  **three different answers** — 32 at the input, 100 at the server, and no limit at all in the
  renderer, where a 100-character name draws a box over half the frame wide.
  **it works**: zero overlaps at every field size on all ten tracks, zero formations touched that did
  not need it, floor never reached. The factor is closed-form from the formation's own geometry
  (0.896 garden-path / 0.805 mountainstreet / 0.696 river-run); smallest anywhere 0.696 against a
  0.6 floor, so **headroom is 0.096** — one denser racer type from needing proposal A. Two things to
  read before minting: requirement (f) is **NOT met** (26.1% size step between 72 and 73 racers,
  because the START GRID steps there, 3x24 -> 4x19 — every way of smoothing it breaks "only where
  necessary"); and proving rule (c) exposed that **the render fingerprint harness draws NAMELESS
  racers**, so the hash moves for all ten tracks while only three change in the browser. Rule (c)
  itself is proven byte-exact: with the shrink bypassed the branch reproduces master's combined AND
  per-track hashes exactly.
  not work**. The TRIGGER shipped and is exact — across all ten tracks at every field size it fires on
  0 formations with no overlap and misses 0 that have one — but the rule as specified could not be
  implemented: comparing row separation against the label's HEIGHT fires 153 times where nothing
  overlaps, because a label is a rectangle and two of them miss on either axis. The PLACEMENT did not
  ship: four variants measured (row parity at one and two box heights, greedy by screen order at two
  and six levels) and none reaches zero — it is not vertical room, six levels is no better than two.
  A whole-row stagger walks the collision into the next row and CREATES overlaps, proved on a probe.
  Render fingerprint deliberately UNCHANGED, which is the evidence that nothing moved. Found on the
  way: mountainstreet also overlaps (33 field sizes) — the first ten-track sweep; and the rule
  toggles on and off between adjacent racer counts, 17 times on mountainstreet.
- [NAME-LIMIT-1.md](NAME-LIMIT-1.md) — one player-name limit (32), enforced where names ENTER rather
  than by an input attribute. **His data is safe: 0 of 304 stored names exceed 32, longest is 22**,
  so nothing was migrated and nothing needed to be. One home in `shared/nameLimits.mjs` — at the repo
  root because the limit must match on both sides of an HTTP boundary and neither package can import
  from the other. Three entry points wired; the real hole was the player-group editor, whose
  comma-separated field had **no length guard at all**, leaving the server's 100 as the only defence.
  Over-length names are REJECTED with a visible reason naming the offenders, never silently trimmed.
  The renderer still has no guard and would draw a 100-character name ~750px wide — proposed, not
  built. A 32-character name measures ~283px realistically, 486px worst case, against the current
  roster's 55px mean.
||||||| parent of 9a0673ad (report(QUICKTEST-NAMES-1): realistic names break the shrink rule, with the numbers)
- [DOC-ORDER-1.md](DOC-ORDER-1.md) — documentation a stranger could actually be handed. The evidence
  for his own suspicion that most documents were never asked for: twenty of fifty-three were the
  by-product of one work session and had had no substantive change since a bulk German-to-English
  translation pass in May — they are now in `docs/archive/`, whose first line says nothing there is
  current. A three-tier map (the project · how we work · history) replaces an index that listed 15 of
  51 documents. New: `docs/GLOSSARY.md`, which caught three words that each mean two unrelated things
  (corridor, band, pulk). The two-year test was run for real and **failed one of three questions** —
  the fixed points lived only in tier 2, so `PROJECT-PRINCIPLES.md` now owns them — and it failed on
  step ONE, because the README told a newcomer the wrong dev-server port, as did four other places
  including a live backlog recommendation. Six weakest spots named; BACKLOG/ROADMAP still half-own a
  subject and that is the bluntest of them.
- [START-FORMATION-1.md](START-FORMATION-1.md) — the start formation, from his eye test. Names now
  draw LAST, after every sprite, so no racer can cover one — render fingerprint moved (expected, the
  order is what it hashes), camera unchanged, world not run and not needed; his eye PASSED, so it was minted
  (render cf716cbdf37b2077) and merged as 81f9b908; return point `pre/start-formation`. The label overlap on river-run is NOT lateral crowding: every overlapping pair,
  on every track, at every racer count, is between neighbouring START ROWS, and the row gap follows
  the racer type's `displaySize`. Swept every count from 2 to the full grid on his instruction —
  river-run fails 56 of 99, the other three fail none. Also found: the start has NO framing rule,
  COUNTDOWN is absent from the six-state table. Four routes for the overlap, none implemented.
- [MERGE-AND-GUARD-1.md](MERGE-AND-GUARD-1.md) — merge what is ready, then the next one-truth target.
  CONFIG-TRUTH-1 and the owner's backup tool merged to master (merge commits, containment proved);
  the backup tool RUN and confirmed at its documented 247 files / 12.0 MB, `--minimal` still dropping
  exactly `sessions.sqlite`. Rebase merging disabled — merge commits are now the only way in. The
  fairness threshold gets one home in `docs/FAIRNESS.md` (19 restatements → 0). **The track-count
  check was built, run and ABANDONED as unbuildable** — the evidence is in the guard's header, and
  R11 now records that abandoning a guard is a legitimate outcome. Nine config claims found that
  CONFIG-TRUTH-1's narrower shape had missed. CI still owed: the Actions outage ran all evening,
  though the new `workflow_dispatch` hand crank does now create runs.
- [CONFIG-TRUTH-1.md](CONFIG-TRUTH-1.md) — the owner's values land, and documents stop stating
  numbers. 94 current config claims across 11 living documents → 0, enforced by
  `check-config-claims.mjs` in CI, the commit hook and verify; nine archives now declare themselves
  HISTORICAL. Squash merging disabled at repo level (rebase still on — his call).
  `minRacersVisible` 3 → 5 hit its stop rule: it moves the camera fingerprint AND the render one, so
  it sits unmerged and unminted on its own branch awaiting the ceremony and his eye. The
  `choreoOutcomeStart` premise verified three ways from history. CI on master still owed — the
  GitHub Actions outage ran all evening.
- [CLEAN-STATE-1.md](CLEAN-STATE-1.md) — merge, then one green master with no loose ends. The three
  ONE-TRUTH branches merged as merge commits (a squash would have destroyed the SHA a stamp names),
  three branches deleted, tracking-lag re-measured independently and reproducing cell for cell. A
  wrapper so an ad-hoc helper can prove its edit landed — and the line-ending trap its own sabotage
  found. A test that wrote the TRACKED SIM.md fixed at the cause, not with a retry. Lessons 205 and 206. Config contradictions: seven keys stated as current and wrong, five of them in one document —
  findings only, nothing changed. CI on master unproven: GitHub Actions outage.
- [ONE-TRUTH-2.md](ONE-TRUTH-2.md) — one home, references everywhere else. The owner’s rule:
  all 19 generated fingerprint copies DELETED, documents reference the record or say nothing. The
  containment guard ONE-TRUTH-1 discarded as unsound is now sound and built. Retries to zero, ten
  clean runs. Two silent traps made loud: a swallowed CLI flag and a write that did not land.
- [ONE-TRUTH-1.md](ONE-TRUTH-1.md) — one fact, one home. The three fingerprints got a single
  machine-readable record and 19 documented copies were machine-written and machine-checked.
  Superseded by ONE-TRUTH-2, which deleted all 19 copies instead. Also: the 20-run retry study that
  found the suite failing 3 runs in 10, and the generated engine-reach list in SIM.md.
- [NIGHT-TOOLS-1.md](NIGHT-TOOLS-1.md) — instrument truth. The retry ledger, check-index's second
  direction, the generated ceremony cost column, and the pixel and documentation audits below.
- [E-doc-audit.md](E-doc-audit.md) — the documentation audit from NIGHT-TOOLS-1 stage E.
- [D-pixel-audit.md](D-pixel-audit.md) — the pixel audit from NIGHT-TOOLS-1 stage D.

**Not indexed, and deliberately:** `captures/` holds verbatim BEFORE snapshots taken so a tool's
output could be compared after it changed. They are evidence, not reports, and `check-index` does
not descend into subdirectories.
