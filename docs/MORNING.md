# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-05 by LEFTOVERS-1, covering everything since the night chain of
2026-09-04. **Master is `fe50e8f7` and CI is GREEN on it.** Origin holds one head, `master`.

**NOTHING SINCE THE NIGHT CHAIN HAS MOVED THE PICTURE, A DEFAULT, A THRESHOLD OR A SHIPPED VALUE. NO
FINGERPRINT HAS BEEN MINTED.** Every piece below is tooling, measurement logic or documentation.

**★ THE ONE THING TO KNOW FIRST: CI WAS RED ON MASTER FOR THREE DAYS AND 24 PUSH RUNS, AND IT IS
FIXED.** Not by anything you did — by a test that read the developer's git identity. Details in DONE.

---

## DONE

**★ CI was red on master from 2026-09-02 to 2026-09-05 — one cause, now fixed** —
CI-RED-3e6c0b87 *(that piece reported in the session and filed no report of its own; its findings
are re-established and superseded where they were wrong by
[CI-MERGE-RACE-1](../reports/evolution/CI-MERGE-RACE-1.md))*.
Last green push run: `1640fbdf` at 21:47 on 2026-09-02. First red: `f6e98767`, **twelve minutes
later** — the merge that added the first of two Rule B tests. **24 consecutive red push runs, same
job, same step, same two assertions.** `git commit-tree` refuses without an author identity; a
developer machine has one globally and a GitHub runner has none, so the tests were green for whoever
wrote them and red on every runner. The identity now travels with the test. **No guard disabled, no
exception, no allowlist widened.** Proved both ways with the identity suppressed: before, exactly the
two CI failures; after, 532/532.

**The ship gate is wired into `verify`, and the sheet now tells an accepted failure from a defect** —
[GATE-WIRED-AND-CAUSED-1](../reports/evolution/GATE-WIRED-AND-CAUSED-1.md).
`viewer-invariants.mjs` declared its routing to **nobody** — it matched no pattern in the collector,
so it was wired to no verify run, no CI job, no hook, no npm script. It now runs from
**`npm run verify -- --premerge`**, selected only when the flag is given **and** a declared path
changed, with the skip line naming whichever condition failed. **Measured: 337–369 s for two races,
running alone.** And `endgame-sheet.mjs` now computes the accepted cause **from the crossing frame** —
no track name, no seed, no list — printing **`ACC`** where the closing zoom had not arrived and
**`FAIL`** for anything else, on items 2 and 9. **Item 10 deliberately keeps a plain FAIL**, and a
test enforces it: its supposed acceptance was a sentence stripped of its attribution.

**The gate CHOOSES two tracks — it excludes nothing** (same report). `GATE_TRACKS` names
space-sprint and city-circuit; the harness keeps the geometries on that list. **There is no exclusion
list, no exception mechanism and no skip anywhere in that file.** Six sites that gave three tracks a
standing of their own are rewritten. Which tracks the gate runs did not change.

**Item 7 was failing on a grading artefact, not a picture defect** —
[ITEM7-MEMBERSHIP-1](../reports/evolution/ITEM7-MEMBERSHIP-1.md).
It graded `_abreastContenders`, whose fallback to the top two is a framing device and says nothing
about who can win. **It was never specific to dirt-oval** — the same artefact failed 10 races of 80
across four tracks. Item 7 now grades the racers who can still win and reads **0 of 80**.

**The battle sentence goes back to being a measurement** —
[ACCEPTED-FINISH-ATTRIBUTION-1](../reports/evolution/ACCEPTED-FINISH-ATTRIBUTION-1.md).
A second acceptance had been attributed to you — *"a battle shot may take the frame near the finish"*
— and you said that wording is not yours. It is a **measurement**, attributed to nobody. Behaviour
(i) is untouched. Recorded with it: **D27–D30**.

**Ten open items checked against the tree; one was already built** —
[OPEN-LIST-TRUTH-1](../reports/evolution/OPEN-LIST-TRUTH-1.md).
★ **Your closing-phase instruction of 2026-08-24 is IN THE TREE.** `CameraDirector.js:1663` forces
`LEADER_ZOOM` past the endgame threshold, bypassing the cooldown, with `LEAD_CHANGE` the only
exception — closed as **D32**. It lands at the running shot's next decision point, and its boundary
is the endgame threshold while the run-in begins composing earlier, which is why four different
phases were seen at the cut. The render-fingerprint count two records disagreed on is settled:
**three declared fields absent, two behaviours blind.** **D33** records three decisions of 2026-09-05.

**The merge race was investigated and NOTHING was built** —
[CI-MERGE-RACE-1](../reports/evolution/CI-MERGE-RACE-1.md).
The claim was "every merge has this window". **It is 1 merge in 28.** The window is real and measured
at ~13 s, and the single failure is the one merge whose sweep was delayed past it. The piece's own
gate stopped it before any change — a fix for a race that does not happen is worse than the mails.

**The ceremony now says what already works** — `docs/SHIP-CEREMONY.md` step 12. Followed in list
order the ceremony **could not** produce a green push run: CI reaches Rule B ~13 s after the push
while step 10 waits minutes. Step 12's wording now says the sweep happens **immediately after the
push in step 9**. Nothing moved, nothing renumbered — the numbers are load-bearing in five
`check-tags.mjs` sites.

**Everything the recent runs named and left is cleared** —
[LEFTOVERS-1](../reports/evolution/LEFTOVERS-1.md). Twelve stale code addresses in `docs/`, the two
remaining ship-order drifts, the two-lists-both-reach-12 trap, the `workflow_dispatch` caveat, the
three gaps between a green branch and a green CI, and the open list below.

---

## RUNNING

**Nothing.** No sweep, no measurement and no branch is in flight. Origin holds `master` alone.

---

## OPEN

**Checked against the tree on 2026-09-05 before being listed. The full version with source addresses
is in [BACKLOG.md § WHAT IS ACTUALLY OPEN](BACKLOG.md); this is the short form.**

- **Cancel Race** — not in the client at all. The fullscreen half of PR-G is wired.
- **TLH-3** — `defaultTracks.js` does not exist; no status banner. Deferred by its own entry.
- **A short race identifier to replace the seed** — your decision of 2026-09-05 (**D33**). The seed
  fixes the plan but not the world; config is read from the host's storage at race start, so one seed
  on two machines is two races. **Not designed.**
- **The comeback BEATS reaching the camera** — night **piece L**, not reached. **D33: measure first.**
  The detector keeps `role === 'comebacker'` and drops the beats.
- **The render fingerprint's blind spot** — **D33: into a night run.** Three declared fields absent,
  two behaviours blind.
- **The missing `routing.mjs` guard** — nothing checks that a guard's dynamic-import literals are
  inside its own resolved set. The property holds **by inspection, not by construction**.
- **`lint` and `format:check` are not in `verify`** — it runs the formatter, not a check. CI runs
  all three; `verify` runs none of them.
- **Deployment** — see NEEDS HIS WORD.

**Not on this list, because the tree says they are done:** piece **D** (the item-7 gap) — closed by
ITEM7-MEMBERSHIP-1, item 7 reads 0 of 80. The **closing-phase cut** — already built, D32. The
**deployed client's API address** — decided, D30 chose runtime resolution; the *build* is part of
deployment below.

---

## NEEDS HIS WORD

**Two items.**

1. ★ **MAY THE RENDER FINGERPRINT BE RE-MINTED?** (INVISIBLE-FOUR-1, piece 1) The instrument built
   its frame camera as a hand-written literal with three members where `frameCameraInputs.js`
   declares five plus a method — and **two of the absent three are read by the draw path it
   measures**: the focus racer, and whether a label says a NAME or a number. So the fingerprint has
   been hashing a frame drawn with the leader fallback and with numbers, while the game drew the
   subject and his name. **Repairing it MOVES THE RENDER HASH.** Bisected one field at a time with a
   control, the cause is **exactly one field, `runInArrived`**; `state` and `anchorRacerIndex` each
   moved nothing. **No mint was taken and the record is untouched.** The commits sit on
   `fix/invisible-four-1` at origin, unmerged, waiting on you. Both values and the bisection are in
   [INVISIBLE-FOUR-1](../reports/evolution/INVISIBLE-FOUR-1.md).

**And the one that was already here. The other four that stood here have been answered.**

2. **Deployment — a domain, which reverse proxy terminates TLS, and where the data lives.**
   **The server has no TLS at all** — searched for, not assumed — and that is a design decision
   rather than an omission: it sets `trust proxy` and issues `__Host-` Secure cookies, expecting a
   terminator in front. **D30 already chose HOW the client finds the API** (resolve at start time,
   so one image works at any address) **and that change is not built** — it is its own block, and it
   waits on these three answers.

**Answered since this sheet was last written, and struck for that reason:**
~~Does the acceptance reach gate item 2?~~ **D27 — yes**, and the sheet now says so itself.
~~Is 27 MB of `date-fns` worth it?~~ **D29 — it stays.**
~~What should the deployed client's API address be?~~ **D30 — resolved at start time.**
~~Does the closing phase end a battle shot too?~~ **D28 — yes**, and the premise it rested on was
withdrawn; the cut itself turned out to be **already in the tree** (D32).
