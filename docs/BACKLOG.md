# RaceArena — Backlog

**Owns:** the living list of open work with the evidence behind each item, **AND — since 2026-08-23 (D24, ROADMAP-FOLD-1) — the phase history too, with the phase-status table folded in on 2026-08-27 by ROADMAP-FOLD-2.** [ROADMAP.md](ROADMAP.md) is now a REDIRECT and owns nothing at all.

> **✅ Baseline — see REBASELINE.** Absolute sim numbers scattered in this document (band-reach, runaway, P1-contest, physics-tax, gate results) are retired history from before the current shipped world. **So is every 16-hex FINGERPRINT below**: each one is the value at the moment that entry was written, not a claim about now. The current values live in [docs/fingerprints.json](fingerprints.json) and in no document. The live baseline is the [reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md) top block — the shipped world (COMBO15 + margin hysteresis + lateral acceleration cap).

Living list. Phase context and completion status now live HERE: the planned server/deployment/tenant arc in PART ONE (*Phases 5–7*), the completed-phase narrative in PART TWO (*Phase history — moved whole from ROADMAP*).
Items ranked by urgency within each bucket. ✅ = done, 🔜 = next, ⏳ = waiting on dependency.

**SINCE 2026-08-23 THIS FILE HAS TWO PARTS.** PART ONE is everything still open; PART TWO is
everything closed, with what closed it. A subject appears in exactly one of them.

---

# PART ONE — OPEN

**Everything still live.** The items needing HIS WORD come first; the rest follow in the order
they were already in. **A subject appears in exactly one of the two parts** — if you cannot find
something here, it is in PART TWO with what closed it.

**On `verify:` lines.** An open item carries either a command whose output decides it, or a
stated reason why no command can. Where a whole section shares one reason, it is stated once at
the section head rather than copied onto every item — copying it would suggest each was
considered separately, and that would not be true.

## THE CLIENT SUITE STARVES ITSELF — measured 2026-08-27, and the remedy is known

**MEASURED by [GATE-CLIENT-CROWDING-2](../reports/evolution/GATE-CLIENT-CROWDING-2.md)** — nine full
suite runs in three arms, using GATE-SERIAL-BCRYPT-1's own instrument. **The hypothesis the first
entry wrote down is confirmed, and the entry below is rewritten to separate what is now measured from
what is still guessed.**

**WHAT IS MEASURED.**

- **The resource is CPU, and the suite is competing with itself.** Not memory — free RAM held at
  7.4–7.9 GB of 33.8 throughout and no processes accumulated. The machine has 14 cores, vitest takes
  roughly one worker per core, and the suite holds **15 tests that pass beyond 5,000 ms** and so carry
  their own extended timeouts. The heaviest runs **113,789 ms unbounded and 49,482 ms bounded** —
  2.3× faster with fewer things beside it, which is what tells oversubscription from a slow test.
- **The two tests that kept failing are STARVED, not hung.** `raceSeed.test.jsx` reached **10,457 ms**
  and `raceActionStage.test.jsx` **8,511 ms** against a 5,000 ms limit.
- **Bounding the suite's own workers fixes it.** `--maxWorkers=4`: **0 failures in 3 runs**, against
  **20 failures in 6 unbounded runs**. Margin against the unchanged 5,000 ms default, measured the way
  the server repair measured it: **−5,457 ms → +598 ms**.
- **It costs about 29% wall clock** (mean 313 s → 403 s). The server case cost nothing; this one does.
- **Why external load never reproduced it:** outside load makes the scheduler share, the suite's own
  thirteen workers make it oversubscribe. Every earlier attempt loaded the machine from outside and
  came back green, which is why this looked incoherent.

**WHAT IS STILL GUESSED.**

- **That 4 is the right bound.** It was the first value probed, not a tuned one, and +598 ms is a
  third of the margin the server suite considers safe. **The sweep has not been run.**
- **That bounding is the best remedy rather than the first one that works.** Three files carry all the
  load; splitting them into a serial project — the shape `server/test/suiteShape.mjs` already
  implements — might cost far less than 29%. Uncosted.
- **That three green runs mean the suite is trustworthy.** Three runs is three runs. The server repair
  used four per arm.

**NEEDS: HIS WORD ON THE TRADE, and it is a real trade this time** — about 29% wall clock on every
client-suite run, against a gate that currently returns both answers for one tree. The server repair
did not need this question because bounding there was free.

**THE FIX IS STILL NOT A TIMEOUT.** Nothing here was a defect in the code under test; everything was a
timeout caused by starvation. Raising the 5 s bound, marking a test slow or skipping one would hide
the cliff rather than remove it, and the standing rule from the server repair is that the 5 s timeout
stays.

**verify:** `node scripts/diag/suite-timing.mjs --suite=client --runs=3 --label=x` — and the same with
`--extra=--maxWorkers=4`. Any run whose failure count differs from another arm's is this item.

---

## NEEDS HIS WORD — decide these first

**ONE section is entirely his and leads PART ONE** — HOW MUCH ACTION, immediately below,
and one of its four questions is still open. The rest of the items that need his word are
**indexed here and left where they are**, which is a deliberate choice rather than a shortcut:

**WHY THEY ARE NOT MOVED.** Each of them sits inside a section whose surrounding text is the evidence
for it — the audit episode that produced the CI questions, the sweep that produced the OUTCOME
climb-capacity question, the beat timing behind the comeback-shot question. **Cutting the item out
and leaving the evidence behind would make the decision look smaller than it is**, which is exactly
how a question gets answered without being understood. So they are linked from here and kept in
place. *(Conservative option at a fork, stated as required.)*

**IT SAID "TWO SECTIONS" UNTIL 2026-08-23.** The second was *Owner eye-test coverage*, which is
now closed by D13 and lives in PART TWO.

**THE INDEX — every open item below that only he can move.** **REWRITTEN 2026-08-23: every row the
previous version carried has been answered**, and the answers are PART TWO's DECISIONS D10–D24. The
table is not deleted-and-forgotten — each old row is listed below with the decision that took it,
because a question that vanishes from an index looks like a question nobody asked.

| the question | where it lives |
| --- | --- |
| the authored BEATS never reach the camera — hand them through, or leave the detector inferring? | **PART TWO D14** — the open point it leaves. **His call, and it needs his eye afterwards.** |
| a normal race now draws and shows a seed — does it read right ON SCREEN? | **ON MASTER since `7a3942fa`** — `feat/race-seed` no longer exists and nothing was lost. **His eye is owed on the SCREEN, not on the code:** start a normal race (not Quick Test) with the seed field EMPTY, and check the drawn seed is shown where he expects it and reads as a number he could type back. Then close the tab, reopen, and check the same seed is still there — it is in `localStorage`, not `sessionStorage`, which is the half of D23 he asked for. See `reports/night/SEED-REAL-RACE-1.md` |

**AND THESE ARE NO LONGER HIS — they are waiting on a MEASUREMENT or on a later block, not on a
word from him:**

| the question | what it is waiting on now |
| --- | --- |
| the action dial: what it maps onto | the table in `reports/night/ACTION-KEYS-1.md`, then a design block — **PART TWO D10** |
| the action dial vs the fairness gate | **answered — PART TWO D11.** The dial is bound by the gate; each stage passes on its own or does not ship |
| saved races and replays under the dial | **half answered — PART TWO D12.** The stage is stored with the race; what happens to the FINGERPRINTS is a ship question and stays open |
| the proposed owner eye-test session | **superseded — PART TWO D13**, and replaced by a standing principle ([VERIFY-RULES.md R5a](VERIFY-RULES.md)) |
| should `npm run dev` REFUSE to start when the build identity is unreadable | **answered NO — PART TWO D5** |
| the juxtaposition rule for reports | **adopted — PART TWO D19**, now [VERIFY-RULES.md R16](VERIFY-RULES.md) |
| a re-minting block names invariants that must not move | **adopted — PART TWO D20**, now [VERIFY-RULES.md R17](VERIFY-RULES.md) |
| the company guarantee on a SPREAD field, and the 5 → 15 recommendation | **his 5 stands — PART TWO D15.** The item stays open **on a measurement**, not on his word |
| camera timing levers — the comeback shot appears late | **replaced — PART TWO D14.** The sliders would have shown the wrong thing sooner |
| E3 — the `trajectoryMult` half | **accepted as design — PART TWO D16.** Documented in [RACE-ACTION.md](RACE-ACTION.md) |
| OUTCOME climb-capacity — drama-at-leader vs deep-band reach | **closed — PART TWO D17.** The lever it proposed is not ordered |
| the audit-gate policy for DEV dependencies | **answered — PART TWO D21.** Dev advisories report; the build is not ordered here |
| the `body-parser` LOW advisory | **answered — PART TWO D22.** No action; revisit at the next `server/` bump |
| the seed for the normal "Start Race" path, and seed persistence | **BUILT AND MERGED — PART TWO D23.** Landed on master by `7a3942fa` (`feat(SEED-REAL-RACE-1)`); `SetupScreen.jsx` passes a drawn `racePlanSeed` instead of the legacy `0`, and both values live in `localStorage`. The branch was swept; **nothing was lost — checked, not assumed.** Only the eye-test above remains |
| merge ROADMAP into BACKLOG | **DONE — PART TWO D24.** ROADMAP-FOLD-1 (2026-08-23) moved 35 sections; ROADMAP-FOLD-2 (2026-08-27) folded the last table and left a redirect |
| `D7d` — 100-racer performance | **downgraded to an observation — PART TWO D18.** Nothing is ordered |

**Nothing else in PART ONE is blocked on any of these.**

## HOW MUCH ACTION — a host-facing control (2026-08-22, the owner's order)

**verify (section-wide):** no command can decide these — **they are design questions, not claims about the tree.** The section closes when the dial is specified, and question 2 is already answered in place.


**THE REQUIREMENT, in his terms.** One control over **how much race action a race has**, reachable by
a **normal host** in the ordinary setup flow — **not a developer knob**. It has been raised before and
lost each time; this section is its home, and it is the reason the section sits first.

**NOTHING IS DESIGNED HERE.** No mapping, no key, no default, no range, no wiring. What follows is the
facts a later block would start from, and nothing else.

### The candidates — UNVERIFIED

**Every key below is a CANDIDATE ONLY.** They were gathered by reading `defaults.js` for keys that
plausibly govern how much action a race has. **No claim is made that any of them belongs on the dial,
that the list is complete, or that they are independent of one another** — several plainly are not.

**Their VALUES are deliberately absent and the addresses are given instead:** a config value has one
home, `client/src/modules/storage/defaults.js`, and no document may restate it (CONFIG-TRUTH-1). The
line numbers are the address; read the value there.

| candidate key | where | what it plausibly governs |
| --- | --- | --- |
| `gapRerollEnabled`, `gapRerollStrength`, `gapRerollThresholdLengths`, `gapRerollMode` | `defaults.js:1021-1024` | how hard a gap is closed by re-drawing |
| `b2AttackHeroes`, `b2AttackPeakRank`, `b2AttackFinalRank` | `defaults.js:996-998` | how many attackers rise, and how far |
| `reRollVariationPercent`, `reRollIntervalDivisor` | `defaults.js:892-894` | how much and how often tempo is re-drawn |
| `choreoIntensity`, `choreoPackBandStrictness` | `defaults.js:954-955` | how strongly the plan shapes the field |
| `pulkFrontPool`, `pulkLeaderBrake`, `pulkChallengerBoost`, `pulkEnvelopeMaxEffect` | `defaults.js:929-1029` | the lead-rotation mechanism's reach and its realism clamp |
| `chaosSteerGain` | `defaults.js:922` | the steering noise added to the field |

### The two surfaces, with addresses

- **HOST-FACING:** `client/src/screens/SetupScreen/SetupScreen.jsx:930` renders the **Race Settings**
  panel, which delegates to `client/src/screens/SetupScreen/RaceSettings.jsx`. **That file is 86 lines
  and carries THREE controls today — Race Duration, Number of Winners, and an optional Event Name.**
  This is the surface the requirement names, and it is nearly empty, which is the useful part of
  this fact.
  **CORRECTED 2026-08-23, re-counted at source.** It said *"exactly ONE control today — Race
  Duration, at `RaceSettings.jsx:32`"*. The line number was right and the count was wrong: the same
  file renders a winners stepper and an event-name field below it. **The correction is kept visible
  because of what it nearly cost** — the sentence was the evidence for "the host surface is nearly
  empty", and a wrong count is a bad reason for a right conclusion. The conclusion survives the
  correction; three controls is still nearly empty beside the Dev Screen.

- **DEVELOPER-FACING:** `client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx` and
  `BehaviorTuningSection.jsx`. Every candidate above is reachable here today, and reaching them
  requires the Dev Screen — which is exactly what the order says is not enough.

### The open questions — THREE OF FOUR ARE NOW ANSWERED (2026-08-23)

**Struck rather than deleted, per D4.** Each answer names the decision that took it; the reasoning
lives there and is not restated here.

1. **What does one dial map onto?** **STILL OPEN — but no longer his to answer unaided
   (PART TWO D10).** The candidates are not independent: `gapReroll*` and the pulk rotation both
   close gaps, by different means. A single control is a mapping decision, not a selection — and it
   is a decision that cannot be taken from a reading of `defaults.js`. **It waits on a
   MEASUREMENT:** which candidate keys move the project's own action measure at all, by how much,
   and where two of them do the same job. That table is
   `reports/night/ACTION-KEYS-1.md`; the design block starts from it.
2. **~~Is the range discrete or continuous?~~ ANSWERED — THREE STAGES: quiet / medium / wild.**
   On record since **2026-07-06**. **The reason is the gate:** a STAGE can be measured against the
   fairness gate one stage at a time, so three stages means three gate runs with a verdict each. A
   continuous dial has no such decomposition — it would have to be sampled, and every value between
   the samples would ship unmeasured. Race Duration beside it being discrete is a consistency
   argument; the gate is the reason. **And D11 is what makes that reason pay off** — see below.
3. **~~What does the dial do to the band-fairness promise and its gate?~~ ANSWERED — THE DIAL IS
   BOUND BY THE GATE (PART TWO D11).** Of the two options this question named, the owner took the
   first: **each of the three stages must pass the fairness gate on its own, or that stage does not
   ship.** The gate does NOT become a function of the dial, and its thresholds — which live in
   [FAIRNESS.md](FAIRNESS.md) and nowhere else — are untouched by it.
4. **What happens to a saved race, a replay, and the fingerprints when the dial moves?**
   **HALF ANSWERED.** The **stage is stored with the race**, like the seed, so a replay is
   unambiguous (PART TWO D12). **The FINGERPRINT half is still open and is deliberately not
   answered here** — a host-facing control that moves the race is a ship-ceremony question
   ([SHIP-CEREMONY.md](SHIP-CEREMONY.md)), not a storage one, and it is the design block's to
   raise once the mapping in 1 exists.

**NOTHING ABOVE IS A PROPOSAL.** It is the record of an order, the facts a later block starts from,
and the four decisions of 2026-08-23 that narrowed it.

---

## THE CLOSING PHASE ENDS WHATEVER WAS RUNNING (2026-08-24, the owner's instruction)

**verify (section-wide):** none yet, and the reason is the item itself — the shot this produces has
never been seen, so there is nothing to assert about it. The measurement named below comes first.

**THE REQUIREMENT, in his terms — his instruction of 2026-08-24.** **AT THE START OF THE CLOSING
PHASE, WHATEVER CAMERA PHASE IS RUNNING MUST BE ENDED — whichever one it was.** No carrying the
previous subject into the run-in.

- [ ] **The requirement above is RECORDED, NOT BUILT, and this entry deliberately proposes nothing.**
      Under the project's own rule the visible consequence is measured before it is built, and the
      one thing nobody knows is exactly the visible consequence — see the last bullet.

- [ ] **WHAT THE MEASUREMENT ALREADY SAYS ABOUT THE COST AND THE BENEFIT.** From
      [LATE-LEAD-HUNT-1](../reports/evolution/LATE-LEAD-HUNT-1.md) and
      [LATE-LEAD-AXIS-1](../reports/evolution/LATE-LEAD-AXIS-1.md), over 1,260 races:
      the **opening-glide group is 250 hits**; its **median length is 32 frames** (mean 30.3 — the
      figure was carried as 29 and did not reproduce on recomputation, LATE-LEAD-AXIS-1 §9); the
      camera is **anchored on somebody else on 82% of its frames**; and **it hits P1 hardest — 114 of
      the 250 hits are the winner**. LATE-LEAD-AXIS-1 adds the direction: **90.7% of the group's
      frames are a racer thrown off the AHEAD end of the frame**, and **all 103 of the winner's
      along-track cases are in this group and none of them reaches the line.** So the group this
      requirement is aimed at is short, front-loaded, and carries the previous shot's subject
      visibly — which is what "anchored on somebody else" means in one number.

- [ ] **WHAT IS NOT KNOWN, and it is the whole of what stands between this entry and a build:
      NOBODY HAS SEEN WHAT THE SHOT LOOKS LIKE WHEN THE PREVIOUS PHASE IS CUT RATHER THAN ALLOWED TO
      FINISH.** Every number above measures the glide as it is; none of them measures the alternative.
      The project's own standing warning applies — a big zoom change needs a glide or an anchor, and
      cutting a phase removes one of the two. **Per the project's rule the visible consequence gets
      measured before that is built.** Nothing here proposes how.

---

## THE REST — open, in the order they were already in

## The night of 2026-08-25 — everything established, in one place (2026-08-26)

**He asked for the day's findings collected so they can be taken one at a time.** Every item below is
a FINDING. **No work is proposed here and no verdict is invented** — each says only what it is, what
establishes it, and which of three things it needs next: **MEASURING**, **BUILDING**, or **ONLY HIS
WORD**. Where a subject already has a home in this file it is LINKED, not restated.

**verify (section-wide):** none — nothing in this section is a change.

- [x] ~~**THE MERGE GATE STOPPED GATING ON 2026-08-18, and no test was edited to make it happen.**~~
      **✅ CLOSED 2026-08-26 by GATE-SERIAL-BCRYPT-1, and the close is verified at source rather than
      from its report:** `server/vitest.config.js` bounds the bcrypt group to **3 workers** and
      `server/test/suiteShape.mjs` owns the membership, which `scripts/verify.mjs` reads from the same
      module. The margin against the unchanged 5,000 ms timeout went from **21 ms to 1,894 ms** with
      no test over 4 s, and the suite is not slower (37.7 s against 39.1 s, inside variance). **The
      question below asked him to choose between restoring serialisation and teaching the gate to
      report INCONCLUSIVE; neither was needed — bounding the group made the gate honest at no cost.**
      The original finding is kept in full because it is the evidence:
      `20868394` dropped `--no-file-parallelism` from the server test script — correctly, having made
      test isolation real — and never measured wall clock. Sixteen bcrypt-heavy files went from
      one-at-a-time to as-many-as-the-machine-has-cores. The worst test with no timeout of its own
      runs **1,006 ms alone and up to 4,979 ms at fourteen workers, against a 5,000 ms limit**.
      **CI is green because a 2-core runner cannot crowd the suite — that green is honest.**
      Establishes it: [GATE-RED-1](../reports/evolution/GATE-RED-1.md).
      **NEEDS: ONLY HIS WORD** — restore the serialisation as a performance decision, or teach the
      gate to report a timeout-only failure as INCONCLUSIVE rather than as pass or fail.

- [ ] **TWO FILES STILL DOCUMENT THE FLAG THAT COMMIT REMOVED, AND ONE OF THEM SCHEDULES ON IT.**
      `scripts/verify.mjs:246` and `.github/workflows/ci.yml:184` both assert
      `--no-file-parallelism` is in the server package's `npm test`. It is not. `verify.mjs` then
      runs the server suite **non-exclusively, beside the fingerprint jobs**, on the ground that the
      suite is single-worker — which is why the GATE rather than the suite is where the red appears.
      Establishes it: [GATE-RED-1](../reports/evolution/GATE-RED-1.md), the second finding.
      **NEEDS: BUILDING** (a comment fix and a scheduling flag), but it is entangled with the item
      above and should be decided with it.

- [ ] **A SWEEP CELL THAT ASKS FOR 60 RACES AND RETURNS 0 STILL PRINTS A NUMBER AND EXITS CLEAN.**
      56 files import the measurement driver, **44 call `runRace`, and exactly ONE reads its return
      value** — the driver's own test. `runRace` ends on three different conditions and returns one
      indistinguishable value. **38 of the 44 harnesses have no failure path at all.**
      Establishes it: [HARNESS-LOUD-ZERO-1](../reports/evolution/HARNESS-LOUD-ZERO-1.md).
      **NEEDS: BUILDING** — the design and its measured cost (0 of 1,140 cells on today's master) are
      in the report.

- [ ] **THE CANONICAL SILENT ZERO HEALED BY ACCIDENT AND COULD RETURN AT ANY TIME.**
      GARDEN-PATH-NO-FINISH-1 recorded 360 of 360 races silently discarded. garden-path now completes
      **20/20**, because his beetle decision made the race short enough — **the harness hardcodes 2
      laps and that never moved; the racer got faster.** The silence was never fixed.
      Establishes it: [HARNESS-LOUD-ZERO-1](../reports/evolution/HARNESS-LOUD-ZERO-1.md), section 3.
      **NEEDS: nothing on its own** — it is the argument for the item above.

- [ ] **THE HARNESS RUNS A CAMERA THE PRODUCT CANNOT PRODUCE, and 19 instruments make picture claims
      on it.** 43 of 53 `resolveIdentity` callers take the constant `1439767152`; the browser has
      derived the camera seed from the race seed since his decision of 2026-08-23. **Re-deriving the
      width-step hit list gave 30 races, not 26 minus 6 — a DIFFERENT POPULATION.** His twelve survive
      re-measurement. **The fingerprints are NOT affected** — they carry a private copy of the same
      number and never read the default.
      Establishes it: [HARNESS-CAMERA-SEED-1](../reports/evolution/HARNESS-CAMERA-SEED-1.md).
      **NEEDS: ONLY HIS WORD** — whether the default follows the browser, given that the obstacle is
      an append-only journal whose tables would stop matching their tools.

- [ ] **THE ARBITER THAT DECIDES WHETHER A CHANGE CAN REACH THE ENGINE CANNOT SEE ANYTHING THAT
      SHIPS AS DATA.** `engine-reach --check` returns *"cannot reach the engine at all"* for
      `server/seeds/tracks/*.json`, for `client/src/modules/racerNames.js` — whose names are hashed
      into the physics — and for `client/src/modules/racer-types/*.js`, whose speed multipliers set
      the race length. **Two of those three verdicts are wrong.** It is a wrong QUESTION asked of a
      correct answer: the closure answers *"what does the engine import"* exactly.
      Establishes it: [ENGINE-REACH-DATA-1](../reports/evolution/ENGINE-REACH-DATA-1.md).
      **HALF OF THIS IS NOW CLOSED, AND THE HALF THAT REMAINS IS THE SMALLER ONE. Established at
      source 2026-08-27, not taken from a report.**
      **✅ THE ROUTING HOLE IS CLOSED** by ENGINE-REACH-DATA-FIX-1: `scripts/lib/routing.mjs` now
      decides which guards run through `scripts/lib/dataReach.mjs`, which follows NAMED paths and not
      only import edges. Replayed on the real commit with `scripts/diag/routing-replay.mjs`: a change
      to `server/seeds/tracks/garden-path.json` selected **5 guards before and 12 after** — all four
      fingerprints, both suites, both frame checks. **That was the half that could let a red master
      report green, and it cannot any more.**
      **⏳ THE ADVISORY IS STILL WRONG, and it is the line a human reads at commit time.**
      `engine-reach --check server/seeds/tracks/garden-path.json` still answers *"1 outside the hull
      (cannot reach the engine at all)"* — for a file whose two-line edit moved **all four**
      fingerprints in GARDEN-PATH-DEFAULTS-1. It cannot answer otherwise as written: `entryPoints()`
      walks static `from '...'` specifiers, and **a JSON data file is never an import edge**, so no
      data path can ever enter that hull.
      **NEEDS: BUILDING, and it is now a smaller job than the report costed** — the mechanism that
      answers it correctly already exists and is shipped; `engine-reach`'s hull is the last caller
      that does not use `dataReach`. The measured cost in the report (3.4% of commits) was for the
      whole thing and overstates what is left.

- [ ] **THE RENDER FINGERPRINT BUILDS ITS FRAME CAMERA OBJECT AS THE HAND-WRITTEN LITERAL THAT
      FRAME-INPUTS-1 EXISTS TO DELETE.** `render-fingerprint.mjs:445` supplies three of the six
      declared members, leaving `anchorRacerIndex` and `runInArrived` **undefined inside the
      instrument**. **LABEL-FOCUS-1 has never been exercised by it, and RUNIN-NAMES-1 whole visible
      change is a state it cannot enter** — its unmoved verdict for that feature was empty, not
      reassuring.
      Establishes it: [RENDER-FINGERPRINT-BLIND-1](../reports/evolution/RENDER-FINGERPRINT-BLIND-1.md).
      **NEEDS: ONLY HIS WORD for the repair** — it moves the hash, so it is a mint. **The guard half —
      checking that callers build the object through `frameCameraInputs` — needs only BUILDING.**

- [ ] **THE MEASUREMENT HARNESS HAS A FIXED 200-SECOND CEILING AND A HARDCODED LAP COUNT, AND HE HAS
      ALREADY JUDGED THIS NOT URGENT.** `raceDriver.mjs:303` stops every race at 200 s; `:185` gives
      every closed track `laps: 2` and every open track `laps: 1`, ignoring the track own
      `defaultLaps`. **His judgement, 2026-08-25: his own 120 s tests came out nearly the same, so
      this is not pressing.** Recorded WITH that judgement so nobody re-opens it as an emergency.
      Establishes it: [GARDEN-PATH-NO-FINISH-1](../reports/evolution/GARDEN-PATH-NO-FINISH-1.md) and
      [HARNESS-LOUD-ZERO-1](../reports/evolution/HARNESS-LOUD-ZERO-1.md), section 6.
      **NEEDS: MEASURING, when he wants it** — a track whose `defaultLaps` is 4 is measured at 2 and
      **no cell would be empty**, so the loud-zero rule above would not catch it.

- [x] ~~**THE RUN-IN ADMITS A RACER INSTANTLY AND RELEASES HIM ON AN EASE, AND THE ADMIT IS WHERE THE
      VISIBLE STEP COMES FROM.** On river-run seed 13 a third racer crosses the one-length boundary
      **by a tenth of a pixel** and the shot cuts **198 to 386 px in a single frame**, 0.15 s before
      the line. His demand was fully formed **before** he joined. A chance-based membership removes 13
      of the 30 worst steps and costs no width — **but it moves seed 13 cut earlier rather than
      removing it**, because when the jump happens is a membership question and whether it happens is
      not. **The membership buys a median 2.28 s of warning and the width spends none of it.**
      Establishes it: [RUNIN-SEED13-ANATOMY-1](../reports/evolution/RUNIN-SEED13-ANATOMY-1.md) and
      [RUNIN-CHANCE-SET-1](../reports/evolution/RUNIN-CHANCE-SET-1.md).
      **✅ CLOSED 2026-08-26 by RUNIN-EASED-ADMIT-1, and ANSWERED YES BY ACCEPTANCE rather than by a
      separate word:** the width now eases onto a new member over `runInOpenMs`, he judged the result
      on a production build and accepted it, and it shipped as `v-ship-runin-calm`. Verified at
      source: `_levelEaseTo` (`CameraDirector.js`) re-anchors whenever the target moves and eases **in
      both directions**, leaving by ARRIVING rather than by being dropped. **The question below is
      what he answered** — it is kept because the answer is only legible beside it:
      ~~may the width ease onto a new member over about 1.25 s, accepting he is not fully guaranteed
      while it does?~~

- [ ] **THE REQUIREMENT HE ASKED FOR IS ALREADY IMPLEMENTED IN HIS TREE AND POINTED BACKWARDS.**
      `_updateContentionWatch` (`CameraDirector.js:2619`) computes *"can this racer still win"* every
      250 ms and `contentionWatch` defaults to **true** — but `_contentionOut` only grows, so it can
      only ever REMOVE a racer from the framing. **Nothing admits on it.** Two earlier reports had
      already found it; this is the third.
      Establishes it: [RUNIN-CHANCE-SET-1](../reports/evolution/RUNIN-CHANCE-SET-1.md), section 1.
      **STILL OPEN, and RE-VERIFIED AT SOURCE on 2026-08-27 rather than carried:** `_contentionOut`
      is still only ever added to, and `_contentionPending` only gates entry to that removal — there is
      no path that returns a racer to the framing. **Nothing admits on it.**
      **AND ONE THING NEARBY DID CHANGE, so the two are not confused:** RUNIN-LEVEL-SET-BUILD-1 built
      `withinOneLength` membership for the run-in's LEVEL SET, which is a different mechanism with a
      different subject. The contention watch is untouched by it.
      **NEEDS: nothing on its own** — it was the context for the admit item above, which is now
      closed; it stands on its own as an unused mechanism nobody has decided to point forwards.

- [x] ~~**AT EVERY CROSSING THE SHOT AIM IS THROWN OUT AND TAKES ABOUT A SECOND AND A HALF TO COME
      HOME, WITH THE LAST SECOND AT A CONSTANT ZOOM.**~~
      **✅ CLOSED 2026-08-26 by RUNIN-PIVOT-SCOPE-1, verified at source:** `update()` now calls
      `_resolvePanTarget()` AFTER it has settled this frame's zoom, on every path — the aim is stated
      at the scale the frame is drawn with. The split deleted two of the five compensating corrections
      the file carried. Shipped in `v-ship-runin-calm`. The finding is kept because it is the
      evidence: The pan target is resolved at the previous
      frame zoom and drawn at this one; multiplied by the subject distance from the world origin the
      aim is thrown **up to 2,427 px** and the leader leaves the canvas for 21 frames. **It is
      general — the counter-case race swings 959 px too — and worse at lower frame rates.**
      **The correction already exists in the file and is scoped to the frames where the schedule
      composes, so it stops one frame before the largest zoom move of the race.**
      Establishes it: [RUNIN-SEED13-ANATOMY-1](../reports/evolution/RUNIN-SEED13-ANATOMY-1.md), section 3.
      **NEEDS: ONLY HIS WORD** — the repair moves the camera fingerprint on every race with a moving
      zoom, so it is a ship-ceremony change and not a quiet fix.

- [ ] **A SEED IS ONE OF NINE INPUTS, NOT SIX — and two of the nine are stored host preferences.**
      This corrects the count in *"A seed alone does not reproduce a race"* below, which said six.
      `raceActionStage` and the world config are read from host storage at press time, so **the same
      seed on two machines is two races and neither operator changed anything.** His Quick Test
      belief is right under two conditions that are invisible on screen: the roster *selector* picks
      among three lists, and **any real player in the lobby re-indexes the whole field**.
      Establishes it: [RACE-IDENTITY-1](../reports/evolution/RACE-IDENTITY-1.md).
      **NEEDS: ONLY HIS WORD** — a short typable identifier that refuses to exist when it would lie,
      a long copyable one, or both.

- [ ] **A SHIPPED TRACK CHANGE STILL REACHES NOBODY, CONFIRMED AGAIN TONIGHT.** garden-path icon and
      description now match its beetle in the artefact the product ships, **and his own installation
      will never see it** — `seedRuntime.js:36` copies a seed only where no file exists. **The live
      record was deliberately NOT hand-edited this time**, so the evidence stays intact.
      One home for this subject: **the section immediately below**, which owns it.
      Also establishes it: [GARDEN-PATH-BEETLE-SKIN-1](../reports/evolution/GARDEN-PATH-BEETLE-SKIN-1.md).
      **NEEDS: ONLY HIS WORD** — should a shipped-data change be deliverable to an existing
      installation at all, or is "new installs only" the intended behaviour?

---

## A shipped track change never reaches an existing installation (2026-08-25, from GARDEN-PATH-DEFAULTS-1 and TRACK-DEFAULTS-REACH-1)

**verify (section-wide):** none — nothing here is a change. **Both entries are FINDINGS, not
proposals.** No work is proposed for either, no key is added, and nothing is designed.

- [ ] **EDITING A SHIPPED TRACK SEED CHANGES NOTHING THAT ANY EXISTING INSTALLATION CAN SEE, and no
      mechanism ever delivers it.** Three facts, each read at source: `seedRuntime.js` copies a seed
      into the data directory **only when the destination does not exist** — *"Existing destination
      files are never overwritten"*; `server/src/routes/tracks.js` builds its track map **once, at
      process start** (`const tracksMap = loadAllTracks()` at module scope) and serves every read
      from that map; and **there is no migration** — `.tlh1-defaults-migrated` is written and never
      read, its own comment saying *"Legacy marker — no behavior gating; kept for operational
      reference only."* **So a shipped default reaches fresh installs and nobody else.**
      **THE EVIDENCE IS THIS BLOCK ITSELF.** garden-path's defaults moved on the owner's machine only
      because the gitignored live record under `server/data/tracks` was **hand-edited** — a step no
      user and no CI run performs — and even then only after the API process was restarted. **He
      watched the old track for thirty hours**, and nothing in the repository could have told him:
      the commit was correct, the seed was correct, and the picture was not.
      **IT IS THE SAME ROOT CAUSE AS `verify`'s ROUTING NOT SEEING A TRACK CHANGE.** Routing and the
      mint tripwire both compute their reach from the **transitive import closure** of the engine,
      and a track record is never imported — it is read from disk at runtime. Measured here:
      `verify` skipped all four fingerprint guards for a change that moved all four, and
      `node scripts/engine-reach.mjs --check server/seeds/tracks/garden-path.json` exits **1**,
      *"cannot reach the engine at all"*, for that same change. **A data file can move the world
      without being reachable, and every instrument that decides by import closure is blind to it.**
      **AND THE DRIFT WAS ALREADY REAL.** The owner's live record still carried the legacy
      `defaultDuration` while the shipped seed had long since moved to `defaultLaps` — both resolving
      to the same lap count, so nothing showed — **with nothing anywhere comparing the two.**

- [ ] **garden-path still wears the snail.** Its icon is 🐌 and its description reads *"A leisurely
      (yet surprisingly competitive) crawl through the roses"*, while the track's default racer is
      now the **beetle**. The owner named two changes on 2026-08-25 and neither was the icon or the
      description, so neither was touched; `scripts/track-defaults.test.mjs` pins both so that a
      later block cannot quietly tidy them without saying so. **Small, visible, and recorded only so
      that it reads as a decision rather than an oversight.**

## A seed alone does not reproduce a race (2026-08-23, from SEED-REAL-RACE-1)

**verify (section-wide):** the item names its own command. **This is a FINDING, not a proposal** —
nothing is designed here, no key is added, and no change is implied.

- [ ] **A SEED IS NOT A RACE IDENTIFIER. It is one of six inputs, and the other five do not travel
      with it.** SEED-REAL-RACE-1 made a normal race carry a seed and made that seed outlive the
      browser session, which is what D23 asked for. **What it did not do — and could not, being
      scoped to the seed — is make "seed 4242" mean one race.** Re-running the race a seed names
      needs the track, the racer type, the field SIZE, the NAME LIST, the canonical duration input
      and the config that was in force. Established at source 2026-08-23; every address below was
      read, not recalled.
      **COUNT CORRECTED 2026-08-26: it is NINE inputs, not six.**
      [RACE-IDENTITY-1](../reports/evolution/RACE-IDENTITY-1.md) re-established the set at source and
      adds `raceActionStage`, `racePlanEnabled` and the world config — **two of which are stored HOST
      preferences**, so the same seed on two machines is two races. Nothing else in this entry is
      withdrawn.

  **THE NAME LIST IS THE ONE THAT SURPRISES PEOPLE, so it is first.** A racer's NAME is a PHYSICS
  INPUT: `stablePairBit` in `client/src/modules/raceBehavior.js` builds its key from
  `String(a.name ?? a.id ?? a.index)` and hashes it, and that bit decides the tie-break side of a
  near-coincident same-lane pair. Rename a racer and the race changes. So "the same seed with the
  same twenty players" is only the same race if it is the same twenty NAMES.

  **WHERE EACH INPUT LIVES TODAY, and whether anything durable keeps it:**

  | input | in the live race payload (`sessionStorage['activeRace']`) | in the durable record (`racearena:raceHistory` entry) |
  | --- | --- | --- |
  | seed | `racePlanSeed` | `seed` ✅ *(added by SEED-REAL-RACE-1)* |
  | track | `trackId` + `geometryId` | `trackId` ✅ — **but not `geometryId`**, and a track's geometry can be re-drawn |
  | racer type | `racerTypeId` | **absent** ❌ |
  | field size | `racers.length` | `playerCount` ✅ |
  | the NAME LIST, in start order | `racers[].name`, index-ordered | **lost** ❌ — `finishOrder[].name` holds the same set in FINISH order, which is a permutation of the order the plan was built on |
  | duration / laps | `targetLaps` (closed) or `targetDurationSec` (open) — the two canonical operator inputs | **absent** ❌ — the entry's `duration` is `elapsedTime`, the REALIZED seconds, which is an OUTPUT and not an input |
  | the config in force | not in the payload at all | **absent** ❌ |

  **THE CONFIG ROW IS THE WIDEST HOLE, and it is not new.** A stored config beats `defaults.js` per
  key, forever, because the loaders write whole objects — so two races with the same seed, track and
  roster still differ if a dynamics value was touched between them, and nothing on screen says so.
  The HUD's `cfg` fingerprint pill already answers "is this the default world"; it is not recorded
  with the race.

  **WHY THIS IS FILED RATHER THAN FIXED.** Three of the six gaps are one field each on an existing
  object and would be cheap; the config one is a design question with at least three defensible
  answers (store the whole object, store its fingerprint, store only what differs from the shipped
  default), and picking one is not a night's tidying. **Nothing here is proposed.**

  **verify:** `git grep -n "racerTypeId\|targetLaps\|targetDurationSec" -- client/src/screens/ResultScreen/index.jsx`
  — **still open while it returns nothing**, which is today's output. The day the durable record
  carries the race's inputs rather than only its outputs, this closes. **The pattern can match**:
  the same grep over `client/src/screens/SetupScreen/SetupScreen.jsx` returns the lines that build
  the payload.

---

## `RaceScreen` is not testable (2026-08-22, from CEREMONY-SKIP-WRAPPER-1)

- [ ] **`client/src/screens/RaceScreen/index.jsx` cannot be mounted in a test, so the behaviour that
      lives inside it can only be proven by READING ITS SOURCE.** This is a finding with evidence, not
      a proposal — nothing is proposed here, and no rewrite is implied.

  **The evidence, established at source on 2026-08-22:**

  - **One component, 1907 lines.** `wc -l client/src/screens/RaceScreen/index.jsx`.
  - **One file imports it to USE it, and no test in the tree renders it.**
    `git grep -n "screens/RaceScreen/index.jsx"` over the whole tree returns exactly one real import
    — `client/src/App.jsx:13`. **The two test files that name it both name it in order to AVOID it**,
    and they are the finding rather than a footnote to it:
    `client/src/App.test.jsx:18` is `vi.mock('./screens/RaceScreen/index.jsx', () => ({ default: () => null }))`
    — the app's own test replaces the race screen with an empty component — and
    `client/src/modules/buildIdentitySource.test.js:25` opens it with `readFileSync` and asserts
    against its TEXT. Every remaining hit names a SIBLING module (`renderRaceFrame.js`,
    `racePhase.js`, `labelFormHold.js`, `endingSchedule.js`), which is the third shape of the same
    workaround: what needed testing was moved OUT, one file at a time.
  - **First paint returns a placeholder.** `index.jsx:1746` — `if (!raceData) return <Loading…>`.
    `raceData` is null on mount (`:175`) and is filled by an effect that reads
    `sessionStorage['activeRace']` and throws into an error state when the key is absent (`:381-389`).
    So a bare mount renders the loading card and nothing under test is ever constructed.
  - **The race is built inside a second effect that needs a canvas AND a geometry.**
    `:393` — `if (!raceData || !canvasRef.current) return;` — then `:416` `getTrack(...)`, which reads
    the geometry out of `localStorage` and returns null when it is not there, setting an error.
  - **The draw loop is rAF-driven** (`:1684`, `:1687`) and wants a 2D context.
  - **Six `useEffect`s**, of which the two above gate everything the screen does.

  **What it has already cost, named because it is the reason this entry exists.** CEREMONY-SKIP-2
  (`608ad5ba`) was ordered to prove three guards on the ceremony-skip handler by mounting the screen.
  **All three had to be written against a FIXTURE that reproduces the screen's DOM shape plus a
  TRANSCRIPTION of the handler**, because mounting the real component would have tested the
  scaffolding and every one of its failure modes would have landed on that file as a flake. The
  compromise was stated in the report rather than implied — and it forced two further source-reading
  tests to hold the transcription and the attachment to the real file
  (`ceremonySkip.test.jsx`, the two `readFileSync` tests). **A source-reading test is a lexical
  approximation of behaviour**; it catches a rename and a move, and it cannot catch a wrong value at
  runtime.

  **verify:** `git grep -n "render(<RaceScreen" -- '*.jsx'`. **STILL OPEN while it returns nothing
  and exits 1** — that is today's output. The day it returns a line, somebody has mounted the screen
  and the finding is answered. **The empty result is evidence because the pattern can match:**
  `git grep -ln "render(<" -- '*.test.jsx'` finds it in dozens of files, `App.test.jsx` among them.
  Size, separately: `git grep -c "" client/src/screens/RaceScreen/index.jsx`.

---

## Documentation (2026-08-07, from DOC-ORDER-1)

**verify (section-wide):** `git grep -c "" docs/ROADMAP.md` — **the merge is FINISHED. ROADMAP-FOLD-1 (2026-08-23) took it from 627 lines to a 74-line phase-status table; ROADMAP-FOLD-2 (2026-08-27) folded that table in here and left a 31-line REDIRECT that owns nothing.** Every section it ever held is in this file.

- [x] ~~**Merge ROADMAP into BACKLOG**~~ — ✅ **DONE 2026-08-23 by ROADMAP-FOLD-1**
      (NIGHT-2026-08-23 piece 3), under D24. **All 35 ROADMAP sections are accounted for:** 3 to PART
      ONE (*Phases 5–7*), 30 to PART TWO (*Phase history*), 2 subsumed because they were only
      pointers back into this file (Phase V, Phase T). **A move, not an audit — no verdict was
      re-checked and no completion claim confirmed or withdrawn.** ROADMAP survives as a phase-status
      table so every existing link to it stays valid. *(The reasoning that follows is kept because it
      states the general rule, and because it is the record of why the merge was a separate order.)*
      **The original entry read:** *(The approval changes nothing about the reasoning below; what it
      settles is that the merge WILL happen and gets its own piece. It was deliberately not done
      inside the 2026-08-23 documents piece, which was already rewriting a dozen entries in this
      file — a dropped item and an edited item would have been indistinguishable in that diff.)* The two documents
      half-own "what is done and what is next": this file owns the open work with its evidence,
      [ROADMAP.md](ROADMAP.md) owns the phases and their completion status. DOC-ORDER-1 documented
      that boundary in both files' `**Owns:**` lines rather than merging them, **on the owner's
      instruction that the merge is a separate order.** The reason it is separate: ROADMAP is 618
      lines and this file is over 1300, a real merge is a careful pass with a high chance of silently
      dropping an item, and a half-finished merge leaves two documents half-owning a subject — which
      is worse than the boundary that exists today. When it happens, the intended landing is that
      **BACKLOG owns both**, with ROADMAP reduced to a phase-status table.

## Instrument coverage residuals (2026-08-05, from FINISH-MOTION-1)

- [ ] **NOTHING MEASURES MOTION, only per-frame VALUES.** A 2708 px one-frame step was invisible to
      the camera fingerprint (which hashes state, and duly hashed it as just another frame) and
      survived repeated refactoring of `CameraDirector.js`. `scripts/finish-motion-truth.mjs` is now
      that instrument for one phase. **Proposed as its own measurement block:** a motion-continuity
      check across the whole race, flagging any frame whose pan displacement exceeds N× the local
      median outside the enumerable deliberate cuts (the `cut` grammar, LEAD_CHANGE's snap). The same
      pinned-offset-plus-moving-target pattern exists at every entry into a T-space-lerped state.

- [ ] **Garden Path does not finish** — **CANNOT ESTABLISH why, 2026-08-23.** That it does not
      finish is confirmed by three separate reports. *What would decide the WHY:* a driven race on
      garden-path with the finish accounting instrumented — a measurement, not a grep, so no
      `verify:` command can stand in for it. Within the shared driver's 200 s ceiling at n=40 / 60 s
      requested (`finishedCount` still 0 at frame 12000), so it is unmeasurable for any finish-phase
      harness — 9 of 10 tracks. Not a camera fault; worth asking why a 60-second race exceeds 200
      seconds of simulation.

## Build-identity residuals (2026-08-05, from BUILD-UNKNOWN-1)

- [ ] **THE BADGE STILL HAS NO WATCHER — both of its failures were found by the owner's eye.**
      It lied confidently (BUILD-TRUTH-1), then failed silently (BUILD-UNKNOWN-1), and in both cases
      the alarm was a human noticing something on screen. The start-up line helps only if somebody
      reads the terminal. **Owner decision:** should `npm run dev` REFUSE to start when the identity
      is unreadable? Cheap to build, and it converts "a colour fifteen hours later" into "it did not
      start". The argument against is that it blocks work on a machine with a transient git fault —
      which is exactly the fault we just had. See BUILD-UNKNOWN-1 §P1.

- [ ] **`0xC0000142` on this machine — watch for a second occurrence before treating it as a
      pattern.** A 15-hour dev server became permanently unable to spawn ANY child process
      (STATUS_DLL_INIT_FAILED) while the machine was otherwise healthy: 1485 handles, 485 MB, 9.7 GB
      free. Restarting the process cleared it. The plugin spawns three `git` children per watcher
      re-check, throttled to 400 ms, which over fifteen hours is a lot of process creation — the
      leading suspect is a session-level resource (desktop heap) rather than anything in this repo.
      **Not acted on:** one occurrence is an anecdote. If it happens again, the fix is to stop
      spawning per-event — read `.git/HEAD` and `.git/index` directly for the common case and shell
      out only when they change.
      **AND IT IS NOT THE OneDrive/ReparsePoint CONDITION — folded in here 2026-08-23, because it
      was a separate open item and is not a separate observation.** `.git` IS a reparse point on this
      machine and the worktree stubs already resist deletion for that reason, so it was the natural
      suspect and was TESTED: a fresh process on the same tree, with the failing server's exact
      104-variable environment, read the identity correctly. The exit code names a process-creation
      failure, not a filesystem one. **Two OneDrive findings, not three** — and this half exists to
      stop the third being invented every time somebody meets the first.
      **verify:** none — this is a WATCH, and it closes when a second occurrence happens or the
      machine is retired, neither of which a command can tell you. Said explicitly rather than
      carrying a check that cannot fail.

## Measurement and guard residuals (2026-08-05)

**verify (section-wide):** each item names its own instrument in its text. **The two standing-rule proposals that used to sit here are GONE from PART ONE** — both were adopted on 2026-08-23 (D19, D20) and are now [VERIFY-RULES.md](VERIFY-RULES.md) R16 and R17; the line that said "a rule is adopted, not checked" was true and no longer has a subject here.

- [ ] **THREE DRIVER COPIES REMAIN, BY DELIBERATE CHOICE — meet the argument before "finishing the
      job".** `camera-fingerprint.mjs` and `render-fingerprint.mjs` are **the gate the consolidation
      is measured against**: a tool that changes in the same commit it is meant to validate cannot
      validate it, so folding them in would make the fingerprint table meaningless — the only safe
      order is to port them in a block whose gate is something else. `camera-replay.mjs` takes its
      identity from the **owner's marker** rather than from constants, so it has no drift to fix and
      it is his live repro tool; the cost of touching it exceeds one fewer copy. **Neither is an
      oversight. Anyone closing this must answer both arguments, not just count the copies.**

- [ ] **The race-identity HASH: `sha(identity + canonical(cameraConfig))`.** Printing the identity
      made "did these two numbers come from the same race?" readable; a hash would make it
      mechanical, which matters because this project has been bitten three times by a human check
      everyone believed was happening. **The config must be in the hash, not just the identity** —
      `corridor-truth` and `corridor-truth --company-only` print the SAME identity line and produce
      different numbers, so identity alone is insufficient. Caveat: a hash nobody quotes is a dead
      instrument (Lesson 196), so it is only worth adding alongside a convention that makes somebody
      quote it. **That convention now EXISTS** — the juxtaposition rule, adopted 2026-08-23 as
      [VERIFY-RULES.md R16](VERIFY-RULES.md). *(This line used to say "the convention below"; the
      convention moved to PART TWO when it was adopted, and a dangling "below" is exactly the drift
      this file keeps paying for.)*

## Worktree stubs — a helper that cleans up after itself (2026-08-05)

- [ ] **The `.git/worktrees` stubs cannot be removed by `git worktree prune`, and they keep
      multiplying.** **THE COUNT IS DELIBERATELY NOT WRITTEN HERE ANY MORE** — it has been wrong
      three times (ten on 2026-08-05, forty-seven on 2026-08-22, **fifty-one on 2026-08-23**), which
      is what a number restated in prose does. Every one is STALE; none is live.
      **verify:** `ls .git/worktrees | wc -l` — **still open while it returns more than 0.** — every one is a
      OneDrive Files-On-Demand placeholder carrying `ReadOnly`, which blocks the delete. Not a lock, an
      attribute. They are inert metadata pointing at directories that no longer exist.
      **Do not add `prune` to the ship ceremony** — it already fails here, and a ritual that cannot
      succeed teaches people rituals are optional (TAG-GUARD-2 §6.2). **The upstream fix instead:**
      whatever creates a throwaway worktree should remove it in a `finally`, so the stub is never
      created. Even that leaves the ReadOnly directory, so the OneDrive attribute question has to be
      settled before any of this is worth doing.

---

## Camera residuals after CAMERA-COMPANY-ONLY-3 (2026-08-05)


Named rather than fixed. Nothing here is urgent; all of it is cheap.

- [ ] **The company guarantee on a SPREAD field has never been measured.** The owner approved the
      new behaviour having seen both regimes — a torn-apart field where the guarantee opens the shot
      wide, and a tight pack where the camera stays at his 1.0. My measurement only covered the pack
      case (n = 65), where it binds ~0%, and on that basis I recommended raising his 5 to 15. **His
      observation corrects mine**: on a spread field it clearly binds and widens a lot at 5.
      **Measure the spread-field case across field sizes BEFORE anyone changes his value**, and show
      him the result. `minRacersVisible` keeps the value his eye settled on until then.
      **RE-AFFIRMED 2026-08-23 — PART TWO D15: his 5 STANDS.** What that decision settles is the
      ORDER, not the value: nobody changes it first and measures afterwards. **So this item is no
      longer waiting on his word — it is waiting on the measurement**, and it stays open until that
      measurement exists and he has seen it.

- [ ] **No artefact ties a verdict to the BEHAVIOUR judged.** The `[RA CAMERA LIVE TRUTH]` line names
      the build and the camera path, never which guarantee ran. That gap is what made
      CAMERA-COMPANY-ONLY-2 halt a shippable block. The HUD `cfg` fingerprint may already separate
      behaviours — if it does, putting it in the line is the cheap honest fix. **An owner's PASS is
      the most expensive input this project consumes and it is currently recorded nowhere.**

- [ ] **A Dev Screen change does not reach a running race.** *(**verify:**
      `git grep -n "loadCameraConfig()" -- client/src/screens/RaceScreen/index.jsx` — **still open
      while the line is a `useState` with no setter**; re-confirmed at `:220` on 2026-08-23.)* `RaceScreen` reads the camera config
      once at mount (`useState(() => loadCameraConfig())`, no setter), although the director fully
      supports live-apply via `updateConfig`. **Every A/B the owner has ever run has been two races
      when it could have been one race and a toggle.** One line, and it is the highest-leverage
      change on this list.

- [ ] **"Road edge out of frame" should be a standing measurement.** The control number is the
      argument: with the corridor guarantee fully active it was ALREADY out of frame on 45.9% of
      Mountainstreet frames. A guarantee should be judged by whether the thing it guarantees actually
      happens, and this one was never measured that way — only its effect on zoom was.

## Phases 5–7 — the planned server, deployment and multi-tenant arc (moved from ROADMAP 2026-08-23)

**MOVED WHOLE from `docs/ROADMAP.md` by ROADMAP-FOLD-1 (NIGHT-2026-08-23 piece 3), under his decision
D24. Not re-verified and no verdict changed** — the text below is the roadmap's, unedited. It sits
here because BACKLOG now owns the open work and ROADMAP is a phase-status table.

**verify (section-wide):** none can exist — **nothing here is built, and no command can check the
absence of a server that was never started.** Each item leaves by being built, not by being checked.

**Its relationship to *Before the VPS migration* (the next section):** that section is the LIST of
what must be true before anything goes online; this one is the FEATURE WORK those phases contain.
Neither subsumes the other and both were already open.

### Phase 5 — Race-Integrity Server & Leaderboard (planned)


⚠️ **Auth prerequisite:** Phase L (PR #44) added track write endpoints with no authentication. Before any VPS deployment, auth must be added to the Phase L backend. Phase 5 "Basic admin auth" covers this requirement.

Built fresh — the original server scaffold was deleted (incompatible architecture).

- [ ] Server-authoritative race finale: server signs and persists race outcomes
- [ ] Socket.IO event streaming: server broadcasts authoritative race-tick state
- [ ] Race outcomes persisted to DB; season standings computed server-side
- [ ] Leaderboard screen (client) reading from server API
- [ ] Season archive + reset
- [ ] Basic admin auth (JWT, server-side password hashing with bcrypt)

### Phase 6 — Public Deployment (planned)


- [ ] VPS deployment (nginx reverse proxy, HTTPS via Let's Encrypt)
- [ ] Environment config (CLIENT_ORIGIN, JWT_SECRET, DB_PATH)
- [ ] Admin auth hardened for public-facing use
- [ ] Stats pages (top racers, busiest tracks, season history)
- [ ] Mobile / tablet responsive tuning

### Phase 7 — Multi-Tenant (planned)


- [ ] Multiple event organizers with isolated track sets and branding profiles
- [ ] Per-tenant localStorage namespace or server-side data isolation
- [ ] Invite flow for adding players to an organizer's roster
- [ ] i18n (English + German base)

---

## Before the VPS migration

- [ ] **`npm run data:export` is what carries his data to the VPS, and the same comparison tells the
      migration what actually has to move.** Measured on his machine: **247 files / 14.4 MB** differ
      from `server/seeds/` (three uploaded backgrounds 9.0 MB, the brand logo 2.8 MB, 222 track-editor
      backups 2.4 MB, 10 schema-differing tracks, and ~15 KB of accounts, brand and player groups);
      **12 files / 51.7 MB are byte-identical to the seeds and do not need to travel at all.**

**This is a LIST, not a work item.** Nothing here is urgent and nothing here should be "fixed" now.
The server currently runs only on the owner's machine — **nothing is online**, and a VPS migration
happens only after development is finished. Every entry below is harmless while that is true and
becomes a real question the moment it is not. Recorded 2026-08-04 (CAMERA-ANCHOR-TRUTH-1); the
measurements are from [CI-AUDIT-GREEN-1](../reports/evolution/CI-AUDIT-GREEN-1.md) §10.

- [ ] **`deploy.yml.disabled` cannot run — four independent blockers, and it is now DE-REGISTERED
      too** *(**verify:** `ls .github/workflows/deploy.yml.disabled && ls scripts/deploy.sh` — **still
      open while the first succeeds and the second fails**; re-confirmed 2026-08-23, and note it also
      carries no `permissions:` block, deliberately left by CI-PERMISSIONS-1 because CI can never
      exercise an edit to a disabled workflow)* (renamed 2026-08-16; GitHub had listed it as *active* while the header said it could
      never run). (1) triggers on `branches: [main]`,
      the only branch at origin is `master`; (2) runs `scripts/deploy.sh`, which is not in the repo;
      (3) all three secrets are absent (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY`); (4) no
      alternative path exists — 0 deployments, 0 environments, 0 webhooks, 0 deploy keys, no Pages.
      The file is kept on purpose as the record of an intent; its header says all of this, and the
      `.disabled` suffix now says it to GitHub as well. Reviving it needs the rename back AND all
      four cleared — the rename alone would register a workflow that still cannot work.

- [ ] **`RA_PUBLIC_ORIGIN` exists only as the placeholder `racearena.example.com`.** It is the
      canonical self-origin the CSRF guard compares incoming `Origin` headers against, so it must be
      a real value before the app is reachable.

## Evolution Act 2 — finale front-compression (CLOSED 2026-07-26, all three builds reverted)

**verify (section-wide):** the ARC is closed and the section head says so; what remains open here is a successor CANDIDATE, which is a direction rather than a claim, so no command decides it.

- ❌ **Three flag-gated finale builds (fixed dice overlay → DevScreen toggle → adaptive spread-scaled
  gates) all REVERTED after the decisive adaptive SCREEN failed its pre-registered bar.** Act 2 added
  contest as a scheduled-dice overlay on the gap-cap re-roll (front-band only, finale window, never the
  servo/target), first with fixed gates then with gates scaled to the live front spread S. Neither the
  fixed nor the adaptive dose could lift BOTH topologies with one track-agnostic law: the adaptive variant
  held the floor and even cured the closed over-churn, but STILL could not restore the open over-calm
  (luger-hill lead-changes 3.00→2.32), and the realized gates barely separated (open G_c 1.01 / closed 1.47)
  — proving front spread is NOT the distinguishing variable. **Root cause is structural physics:** the open
  track's long `[0.90,1.0]` run-out re-expands any `[0.80,0.90]` compression, while the closed track's
  bunched laps churn — so no single track-agnostic finale-dice law serves both topologies. All builds were
  DEFAULT OFF / byte-identical throughout; reverted for source hygiene, recoverable @`8d5e9fd` (fixed) /
  @`7404bd9` (toggle) / @`197763d` (adaptive). Lab journal kept in
  [reports/evolution/](../reports/evolution/) (FINALE-DESIGN-CC, FINALE-SCREEN, FINALE-ADAPTIVE-CC,
  FINALE-ADAPTIVE-SCREEN). Scaffolding tags `pre/finale-compression`, `pre/finale-devscreen`,
  `pre/finale-adaptive`, `pre/finale-remove`.

## Evolution Act 1 — assignment-follows-field (CLOSED 2026-07-26, reverted)

**verify (section-wide):** as above — the arc is reverted and closed; the open lines are leads for a future block, not statements about today's tree.

- ❌ **AFF built flag-gated (default OFF, byte-identical) then REVERTED after a NEGATIVE SCREEN.** The
  code-verified diagnosis: making the pack's target rank follow the live field drives `rankError→0`, which
  _removes_ the servo's within-band restoring force rather than adding contest — so band-reach fell below
  the 70% floor (71.1%→66.8%) and finales went deader/runaway-ier (same "liberation settles the field"
  family as the retired B2 pack-release / universal band-arrival). Build reverted for source hygiene,
  recoverable @`cd520e0`; the lab journal stays in [reports/evolution/](../reports/evolution/)
  (AFF-DESIGN-CC, AFF-SCREEN, AFF-NEXT-CC).

- 🔜 **Successor candidate (future act, not scheduled):** finale-window / front-band contest that ADDS a
  bounded chase term while KEEPING the static endpoint pin — see AFF-NEXT-CC.md.

## Gap-reroll — SHIPPED DEFAULT ON (July 2026)

**verify (section-wide):** the feature shipped; the open items are follow-up MEASUREMENTS, and a measurement is its own check — each names the harness that would run it.

- **Shipped-default fingerprints (current):** the ON hash moved with every world change since the retune
  (plan-grid unification → speed/duration ship → step-order alignment → speed-150 → the 2026-07-26 flip) —
  the current pair is recorded in [reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md) §3 and
  the flip's docs commit; the **OFF** invariant is **`f8f7d9c2fd3283e9`** (byte-identical to the pre-feature
  world, `node scripts/fingerprint-default.mjs off --gapRerollEnabled=false`). Historical ON hashes
  `e93ffa70dad562a1` (retune) and `efd0f4ad8eca08fa` (G=1.5/s=1.0) are superseded.

- **Sim follows the shipped default.** `sim-fairness.mjs` never read `gapRerollEnabled`; it does now,
  so a flagless sim run reproduces the shipped game. **A flagless run is therefore no longer the OFF
  world** — OFF arms must pass `--gapRerollEnabled=false`, and every OFF arm in
  `exp-runaway-leader.mjs` was updated so the committed baselines stay reproducible.

- ⚠️ **MEASUREMENT CAVEAT — quote the headline with this qualifier.** The **23.0% → 8.3% runaway**
  result (N=200, all 10 tracks) was measured **pre-branch-priority-fix**. The fix was validated as
  **within-noise and directionally favourable** on a 4-track paired test at identical seeds
  (A0, `67a1053`): **8.3% → 7.5%, 5/400 flips, all away from runaway, −0.55 sd**. The other 6 tracks
  are untested post-fix. A full 10-track re-measurement is **not** required before shipping, but the
  headline is a pre-fix number and should never be quoted bare.

## Measurement infrastructure — next up (from the independent reviews, 2026-07-23)

**verify (section-wide):** each item IS a proposed instrument, so the check is "does the script exist": `ls scripts/` against the name in the item.

- ⛔️ _(superseded by the line above)_ **HYGIENE PHASE — the engine-input module list, beside `WORLD_CONFIG_KEYS`.** Stage 2 of the mint
  tripwire ([SHIP-CEREMONY.md](SHIP-CEREMONY.md) → "THE MINT TRIPWIRE"). Enumerate, in
  `client/src/modules/raceConfigWorld.js` next to `WORLD_CONFIG_KEYS` and under the same "keep them in
  lock-step" rule, the MODULES whose values reach `createRaceFromIdentity` / `stepRacePhysics` — plus a
  test that FAILS when `raceCore.js` imports something not on the list. Then adding an engine input
  forces the list to change, and the list drives the mint rule instead of a person's memory.
  **Why both:** the mint rule catches what someone remembers; the list catches what nobody does, and in
  this project the second kind is what has held. **The case that motivated it:** `drawnBodyWidthRefPx`
  is computed in a screen file and consumed by `raceBehavior.js` as the avoidance body size, so a
  race-moving value can sit in a "presentation-only" diff and pass every check —
  `autoSpriteScale.js` did exactly that in CAMERA-PICTURE-FIXES-1 (fingerprint did NOT move, but
  nothing established it; see [CAMERA-MINT-TRIPWIRE-1](../reports/evolution/CAMERA-MINT-TRIPWIRE-1.md)).
  Owner asked for this to be done properly in the hygiene phase rather than tacked onto a camera block.

- 🔜 **Paired per-seed delta evaluation in the gate driver.** `exp-gate-retune.mjs` already runs
  **truly paired** arms — identical seed sequence per track, per-race seeds recorded — but then
  aggregates each arm _independently_ and compares the aggregates. The pairing is currently an
  experimental control, not a statistical estimator. Computing per-seed deltas (arm A minus arm B on
  the SAME race) and reporting their distribution would cut the variance the comparison has to see
  through, and would surface the flip-level detail the branch-priority A0 check had to be run by hand
  to get. Identified in `reports/proposals/review-pre-greenfield-proto-gate-driver-bf4ff90-copilot.md`.

- Reporting discipline for both: see the **Reporting rule** in SWEEP-HARNESS.md — episode- and
  tilt-derived metrics are mechanically G-coupled and comparable only at fixed G; gate primaries must
  be G-independent; "Holm" in these drivers is a flagged-track count, not a family-wise procedure.

---

## Front Act / C1 — July 2026

**verify (section-wide):** a design direction from a closed arc — no command decides whether it should be built.

- ❌ **B1 lead rotation + role-biased scheduled dice — REMOVED (2026-07-23).** Built sim-first,
  default OFF, byte-identical. Measured as the WORST arm of the greenfield night run (a suppressor,
  not a lever), so the whole mechanism — keys, generator code, servo hooks, telemetry observer, and
  unit tests — was deleted in the dead-mechanisms cleanup ship. Both fingerprints unchanged. The code
  is recoverable from git history at tag `pre/dead-mechanisms-cleanup`; the planned sweep is
  cancelled, not deferred. Concept + both independent reviews remain archived under
  `reports/proposals/`.

---

## Race-Action Arc (feat/race-action) — June 2026

**verify (section-wide):** **the largest open section, and mostly owner decisions and sweep results.** No per-item command: an item here closes on a measured sweep or his verdict, both of which are named in the item text. Treat the section as a reading list, not a checklist.


Catch-up for the period since the last backlog refresh. Full per-commit detail is in
ROADMAP.md (**Phase D** and **Phase R** sections); only hashes are repeated here. All hashes
verified against `git log` / `git tag`.

**✅ Completed**

- **Phase D — server-side storage migration** (groups/brands/racers): D1 `999f45e`, D2 `c263106`, D3 `6f4deb3`, D4 `ee3735d`, D5 `6aa8bc1`, D6a `5d75d12`, D6b `d22ecee` (2026-06-14/15).

- **Lateral physics redesign** — Layer 1 Soft Steering (`35b6b29` → default `8ad6a62`) + Layer 2 Hard Separation (`82c1806`/`f535fc2`/`0815aac`/`07bf2f1`/`bf44a8b`); legacy forces removed in Commit A `bc68c37` + Commit B `f311622` (2026-06-25/28).

- **Controller on closed tracks** — C0 leader-progress phase clock `14f3c6f`, C0-fix `712f334` (2026-06-21/22).

- **Closed-track geometry expansion (3072px world)** — garden-path `8f73dc7`, dirt-oval `72da109`, city-circuit `1b3260e`, ice-track `b06d946`; cumulative-t fix `9a4148e` (2026-06-28/30).

- **§4a soft-steering asymmetric fix** `aef203a` + cleanup/regression test `0b33f3c` (2026-06-30).

- **Sim browser-parity** — passThroughCount telemetry `f7b6100`, finishT/speed parity `8f57cba`, shared-config defaults `9cfa953` (2026-06-30).

- **Reviewed, no fix needed** — controller-on-closed phase timing confirmed correct (leader-progress based, `14f3c6f`); sim determinism verified resolved (likely side-effect of Commit A `bc68c37`, no commit to cite).

- **Cleanup-C (auth)** — items 7-8 `3729d1c` (tag `backup/cleanup-c-paths-cli`), item 9 dead `randomUUID` import removed `0dda9db` (tag `backup/cleanup-c-dead-import`), recover-admin hardening follow-up `16d3bf9` (tag `backup/recover-admin-hardening`). All committed **and tagged** — supersedes the older "awaiting Copilot review + tag" status. Verified: `randomUUID` now appears only in `*.test.js`, not production `authRouter.js`.

- **Governor vision-pivot → race-action director** — ⚠️ **SUPERSEDED/HISTORICAL:** this reactive governor/director was replaced by choreo + PulkLeadRotation and then **removed entirely** in THE GREAT PULK CLEANUP (Stages 1–6); the commits below are history, none of the governor/director knobs or streams survive. (anchor `d9c9cd3` = `stable/pre-governor-04jul`). Governor core `307d6dc`/`294550a`/`0da9048`/`24c99b6`/`9947892`; **Stage C** leader-brake retired → pure tail-lift `a0105ed`; **Stage A1** contest-injector director (rank-blind, own master + `DIRECTOR_SEED_XOR`) `a7e4a64`; **Sim-1** front-action metric + governor telemetry propagation fix (read-only) `b930b1b`. Full detail in ROADMAP §R.7. The pivot idea (a limiter cannot create a contest) endures — see LESSONS 160.

**🔜 / ⏳ Open**

- **B2 — per-hero intensity budget** 🔜 _(added 2026-07-14 reconciliation)_ — `clampIntensityToBudget` (heroCurveGenerator.js:147/154) reduces the WHOLE cast's realized intensity from the assigned winner's geometry alone (winner feasibility → one `realizedIntensity`, applied to every hero at :457). Concern: one hero's tight geometry throttles every other hero's drama. **Done =** the budget is computed per-hero so a single constrained hero no longer flattens the rest. Eye-test whether it visibly matters before building. Owner-approved step.

- **~~Camera timing levers — comeback shot appears late (tune by eye, no code)~~ REPLACED 2026-08-23 by the owner's DEFINITION of a comeback — PART TWO D14.** 🔜 _(added 2026-07-15, from B4; replaced 2026-08-23)_

  **THE REQUIREMENT, in his terms: a comeback is a racer STORMING FROM FAR BACK TO THE FRONT.** A
  racer climbing slowly from progress ~0.28 is **not** a comeback. That is the bar the shot has to
  clear, and it is what the old item was missing.

  **Why the old proposal is retired rather than scheduled.** It was: lower `outcomePhaseThreshold`
  (which gates reactive comeback detection, and whose slider floor sits above the start of the
  authored climb) and re-weight `comebackWeight` against `battleWeight` (which it loses to during
  PULK, so even a fired candidate does not win the lens). **Both changes make the SLOW CLIMB visible
  EARLIER — and against the definition above that is the wrong thing, sooner.** It would cost the
  front battle the weight contest was protecting and buy an event that is not the event.
  *(Values deliberately not restated: they live in `client/src/modules/storage/defaults.js`, which
  is their one home.)*

  **The beat timing is still true and is kept, because it is what the OPEN POINT below is about:**
  a comebacker HOLDS its deep rank from its `anchor` beat until its `peak` beat (usually in PULK),
  then climbs to its `resolve` beat (in OUTCOME). **The `resolve` beat is the storm he is
  describing.**

  **THE OPEN POINT — the authored BEATS never reach the camera.** Full evidence, established at
  source and re-verified on 2026-08-23, is in **PART TWO D14**: the generator emits role AND beats,
  the FULL `cameraPlan` IS delivered to the director, and `comebackDetector.setPlan` keeps only
  `role === 'comebacker'` and **discards the beats** — so the camera re-infers from rank history
  what the plan already stated, and the `resolve` beat never arrives at all.
  **NOTHING IS PROPOSED AND NOTHING IS BUILT.** Whether the beats get handed through is his call,
  and it needs his eye afterwards.
  **verify:** `git grep -n "beats" -- client/src/modules/camera` — **still open while it returns
  only the two JSDoc `@param` lines and no code that reads them.**

- **B4c — faller shot (now unblocked by B4)** 🔜 _(added 2026-07-15)_ — a faller is cast front-post-chaos with a deep target band, so its target rank is > 5 and it is **structurally absent from `b1Indices`** — the camera literally cannot see it today. The stored `cameraPlan` carries `role: 'faller'` + beats and is the only channel that can. Same design as B4b: the plan names WHO, a reality check still authorises the cut. The camera-timing-levers item above applies here too — a faller shot hits the same weight contest. **AND SO DOES THE OPEN POINT IT NOW CARRIES (PART TWO D14):** the beats a faller shot would need are delivered to the director and discarded by `comebackDetector.setPlan` along with everybody else's.

- **E3 — PULK→OUTCOME speed differential** ✅ **CLOSED 2026-08-23 — ACCEPTED AS DESIGN (PART TWO D16).** The remaining open half was the `trajectoryMult` differential: the pack is pinned to 1.0 in PULK and the P-controller returns at the boundary, so racers are genuinely faster in OUTCOME than in PULK — a real speed step, not an onset artefact. **The owner's verdict is that the step is INTENDED DRAMATURGY**, and it is documented as design in the living document that owns the mechanism, [RACE-ACTION.md](RACE-ACTION.md) § *Phase discipline — how forces fade*. **DO NOT RE-OPEN EITHER HALF.** The other half — the `rowBonus`/`rowEnvMult` sub-step — was smoothed by a 1 s `easeInOutCubic` in the shared `raceStep.js` (`computeRowEnvSmoothed`, config `enableRowEnvSmooth` + DevScreen toggle), shipped dormant at `v-rowenv-easing-complete` and flipped to default ON on 2026-07-19 at `v-rowenv-default-on-complete` after an owner eye-test; a 4-track × 100-race sim sweep (SLEW 1%/frame vs EASING 1 s) confirmed both arms fairness-neutral. Design verified at source: `racePlanner.js`, the PULK branch that pins the pack and zeroes rowBonus.

- **OUTCOME climb-capacity investigation (2026-07-17/18) — deep-band band-reach vs `choreoOutcomeStart`** ✅ **CLOSED 2026-08-23 BY THE OWNER (PART TWO D17).** — B3–B5 band-reach degrades as `choreoOutcomeStart` rises (SWEEP 2). **Two fixes MEASURED + REJECTED:** (a) _band-checkpoint proportionalization_ (Phase 1 dry-run, 6 variants × 4 tracks × 40 races): max +0.3pp B3 = noise — band-reach is **endpoint-determined** (the servo steers to the Fisher-Yates target over [choreoOutcomeStart→finish]); the checkpoint only reshapes the mid-race curve, not the destination. (b) _unified speed-ramping_ (remove the distributed smoothers, replace with one global 0.5%/frame cap; 4 variants × 4 tracks × 100 races): **−5pp B2, −9pp B3** — the distributed smoothers are load-bearing for servo accuracy (Lesson 177). **Faller diagnosis (mountainstreet, N=100):** fallers **UNDERSHOOT** (a climb-capacity deficit, NOT "enter OUTCOME too fast"); worst on the long open 60-racer track. **Open lever:** add OUTCOME servo runway/authority for deep bands — earlier per-band steering onset and/or higher `trajectoryMult` authority for B3–B5 — measured against band-reach. Reports under `results/` (gitignored). **NOTE (2026-07-20):** this is the remaining open action item after B2-Heroes shipped (below); the two share the "deep bands need more servo authority" diagnosis but B2-Heroes solves front-action a different way (authored attackers, not deep-band climb-capacity). **~~Deferred pending owner decision on drama-at-leader vs. deep-band reach.~~ THAT STATUS WAS WRONG AND IS CORRECTED: it is decided, and the OPEN LEVER above is NOT ORDERED.** Nobody is to build OUTCOME servo runway or extra `trajectoryMult` authority for B3–B5 on the strength of this item. **What survives it are two general findings, which is why the entry is kept in full:** band-reach is ENDPOINT-determined (the servo steers to the Fisher-Yates target over [`choreoOutcomeStart` → finish]), so a mid-race checkpoint reshapes the curve and not the destination; and the distributed smoothers are load-bearing for servo accuracy (Lesson 177).

- **Built, measured, shelved — then REMOVED (dead-mechanisms cleanup, 2026-07-23):** the **pack strictness release** — non-hero pack runs strictness-0 inside band — **broke B2 band-reach** on luger-hill + searound (67–69%) + Holm 3/4 via an **endgame edge-leak** (92% of leaks after progress 0.90; free racers at the band edge get shuffled out with no runway — diagnosis archived under `reports/exp-archive/`). Dominated by B2-attackers (more action, cleaner fairness). The **universal band-arrival** variant — free B1-heroes + normal pack inside their assigned band — held fairness (immediate re-steer) but cost **−6% action**. Both were deleted with their config keys and DevScreen control; the re-steer threshold survives because the live B2-attacker release reads it. Recoverable at tag `pre/dead-mechanisms-cleanup`.

- **Closure principle (validated 3 ways): action lives in ORCHESTRATION, not liberation.** Servo steering along authored curves CREATES top-5 churn; freeing racers (strictness 0 inside band) causes SETTLEMENT and REDUCES action. Evidence: B2-attackers +21% (scripted climb-and-fall); the pack strictness release broke B2 fairness (free); universal band-arrival −6% action (free). **Future front-action work must AUTHOR scenarios (curves/casting), not liberate constraints (release the servo).** See LESSONS if extended.

- **`rubberBandEndgameThreshold` field split** — ⚠️ **SUPERSEDED / MOOT (2026-07-14 audit)** — the rubber-band FORCE is removed (`raceRubberBand.js` deleted; no `flatBoost`/`rubberBand` in source); with no force there is nothing to give a dedicated endgame threshold to, and the old `index.jsx` cross-reuse of `endgameThreshold` for a rubber-band gate no longer exists. NOTE: the camera BATTLE-gate `endgameThreshold` read by `CameraDirector.js` is a DIFFERENT, still-live thing and is unaffected. Its value lives in `client/src/modules/storage/defaults.js` and is deliberately not restated here — it moved on 2026-08-18 (ENDGAME-THRESHOLD-095) and the line numbers this note used to carry went stale long before that.

- **Governor/director — open items (from the pivot):** ⚠️ **SUPERSEDED (2026-07-14 audit)** — this whole block references the REMOVED reactive governor/director. That mechanism was replaced by choreo + PulkLeadRotation and then removed entirely in THE GREAT PULK CLEANUP, Stages 1–6 (`14cf58c` S1, `c8649dc` S2, `d32e165` S3, `e4caaaf`/`399c266`/`0b42f72` S5b, `9f71e3e` S6a). None of the reactive knobs (spread-cap, anchor-to-front, contest-injector, tail-lift, the ~15 governor values) survive in source. The one surviving `raceGovernor.js` is the NEW PULK-phase contest director (`applyPulkLeadRotation`), a different mechanism.
  - ~~**Stage C2 — generous front spread-cap**~~ — superseded (reactive governor removed).
  - ~~**A1b — anchor-to-front**~~ — superseded (reactive director anchor removed).
  - ~~**The Action sweep** over the ~15 governor/director values~~ — superseded (those values no longer exist).
  - **DevScreen knob-reduction** — ✅ **DONE, on the new world (2026-07-14 audit)** — realised in PULK CLEANUP Stage 5b-ii/5b-iii (`399c266`/`0b42f72`): DevScreen collapsed to one PULK Phase card with 5 visible controls and pinned internals (see DynamicsTuningSection.jsx:128-130, "reset only the 5 VISIBLE controls … pinned internals … have no DevScreen control"). Realised on choreo+pulk, NOT the removed governor knobs listed here.
  - ~~**OUTCOME decompression**~~ — superseded (the reactive director that clustered the front is gone).

## Hot — next PR

**verify (section-wide):** per-item checks are not written here — this section is a QUEUE, and its items are verified by the PR that takes them.


### 1 — Camera Phase + RaceScreen Refactor ✅ Shipped (PR-A1…PR-F) — only PR-G (UI bugs) open

> **Status update:** This is the May 2026 camera rebuild, and it has effectively shipped — all of
> PR-A1, PR-A2(-Diagnose), PR-A3, Phase 4, PR-B, PR-C, PR-D, PR-E, PR-F are ✅ (see list below),
> and Bug A/B/C are all fixed. The **only** remaining sub-item is **PR-G (UI bugs: Cancel Race +
> Fullscreen API)**. Not to be confused with later camera-polish work (e.g. leader-zoom floor
> `9db8188`, ratchet fix `9339e3d`, 2026-06-24). Kept under "Hot" only for the open PR-G remainder.

**Concept documentation sprint fully completed. PR #60 merged 2026-05-03.**
Authoritative specification in `docs/CAMERA_DIRECTOR.md` (13 sections, all §13.2 questions UI-1–UI-8 answered).

**3 structural bugs identified** (empirically from code analysis):

- `DEFAULT_SPEED_SCALE_CONFIG.maxScale=4.0` in `defaults.js:112` → Fix: `maxScale=10.0`

- Space Sprint at ~131 px/s (reference), race duration ~144s

- Open tracks: duration slider in setup screen, finishT dynamically from track physics

**Camera direction philosophy decided (TENDENCY LOGIC, not constraint system):**
LEADER_ZOOM as default tendency, lead-group duels trigger BATTLE_ZOOM (minGapInSpitzengruppe),
sprite corridor [min, max] as hard camera constraints, OVERVIEW random jitter [15s–25s].
N=4–100 considered; lead group = clamp(round(N×0.1), 3, 10). Cross-reference: D7d.

**Sub-PR plan (9 PRs):**

- PR-G: UI bugs (Cancel Race + Fullscreen API)

Approach: PR-A1 → PR-A2-Diagnose → PR-A2 → PR-A3 → Phase 4 → PR-B → PR-C → PR-D → PR-E → PR-F → PR-G.

### 2 — Player Group Selection 🔜 PRIORITY 1 after Camera Phase

The game master selects in setup which player group enters the race (e.g. "Group A", "All", "Selection").
Currently all configured players are always shown — there is no mechanism for subgroups.

**Use cases:**

- Tournament with multiple groups: only Group A races in round 1, Group B in round 2

- Ad-hoc race with participants from the full roster

- Quick selection without manually deselecting all inactive players

**Requirements (spec still pending):**

- Player groups definable in `PlayerGroupsManager` (group name + player assignment)

- Setup screen: selection filter "Which group races?" before race start

- No change to the race engine — only which players end up in `sessionStorage.activeRace`

- UI principle 1: everything configurable (group names, sizes, assignments) without code changes

**Priority:** First priority after the camera phase is complete. Before D8 (full racer editor) and Surface Zones.

---

### Race Duration Recalibration for Race End ⏳ Low Priority

**Status:** Accepted with doc clarification (PR-A2.6). No user complaint trigger so far.

Currently `race_baseSpeed` is calibrated to the **median racer**. Race end (last finisher) can
deviate ±6–8% from `targetDuration` — intrinsically due to the spread mechanic (minimum of N draws
from U[spreadMin, spreadMax]).

If user complaints about race duration deviations ever arise:

- Calibrate `race_baseSpeed` formula to **race end** instead of median (different `E[min_n]` correction)

- Race end would then be within a ±5% guarantee

**Effort:** 1–2 days. Including re-verification of all race tests.
**Priority:** Low. Currently accepted with explicit doc clarification in ARCHITECTURE.md.

---

### TLH — Track Lifecycle Hybrid — TLH-1 ✅ TLH-2 ✅ Track Delete Safeguards ✅ → TLH-3 ⏳ deferred

Three conceptual problems were uncovered while attempting to draw default track geometries (user browser test 2026-05-01, data loss bug):

1. "Draw Geometry" button opens blank track editor without preset context → creates a new unconnected track
2. Backend PUT ignores client geometryId (`existing.geometryId` hardcoded) → geometry link is broken on save
3. Track delete deletes associated geometry via `removeCachedTrackData` without usage check
4. Default tracks exist only as code constants, not as server records → UI flow for them does not work

**TLH-1 — Backend Fixes + Migration (Sub-PR 1) ✅**

- Frontend load order: server → cache → code bundle (`defaultTracks.js`)

- Code bundle initially with empty geometries (bootstrap)

- Status banner when code bundle mode is active: "Server unavailable — showing default tracks (limited functionality)"

- Export button in dev screen: writes current server tracks as JSON snapshot (user commits manually)

> **Order matters:** TLH-1 makes the system safe (backup + no data loss bugs), TLH-2 makes it usable (correct UI flow), TLH-3 makes it resilient (offline fallback). TLH-3 was deferred until after the Camera Phase. See `docs/TRACK_LIFECYCLE.md` for the full spec.

### 1a — Draw Default Tracks ✅ Completed 2026-05-02

All 5 geometries drawn and saved in the track editor:

- **D7d** — 100-racer performance (spatial grid, smarter camera, LOD) — deferred until after Camera Phase

---

## Ready — spec exists, concept decided

**verify (section-wide):** these carry a spec but no acceptance number, so a command can say whether the code exists and not whether it is right. Each needs its spec read before a check can be written.


### CI / dependency hygiene — owner decisions (from the 2026-07-22 audit episode)

**BOTH ARE NOW DECIDED — 2026-08-23, PART TWO D21 and D22 — and both are struck below rather than
deleted (D4).** Context: CI's `npm audit --audit-level=high` step failed on five
consecutive runs (back to 2026-07-20) with no code change on our side — two fresh upstream
advisories against DEV dependencies (`js-yaml` GHSA-52cp-r559-cp3m, `brace-expansion`
GHSA-3jxr-9vmj-r5cp). Fixed lockfile-only in `869615b`.

**AND THE THIRD GAP THIS EPISODE NAMED IS ALREADY CLOSED — stated here because a reader arriving at
the audit questions will look for it.** CHECK-AUDIT-1 found that **`server/` was audited by
nothing**; SERVER-AUDIT-1 closed it, and it was re-confirmed at source on 2026-08-23:
`scripts/audit-gate.mjs` takes a `--tree=` argument, `.github/workflows/ci.yml` runs it with
`--tree=server` on every push and pull request, and `audit-schedule.yml` runs **both** trees daily
under `--report-only`. The struck entry is in PART TWO, *Before the VPS migration*.

- [x] ~~**Audit-gate policy for DEV dependencies.** ⏳ OPEN.~~ **ANSWERED 2026-08-23 — PART TWO D21:
  DEV DEPENDENCIES REPORT, THEY DO NOT BLOCK.** His reason is that a dev dependency never runs in
  front of a viewer, so the split he chose is the second of the two options this item listed:
  hard-fail on runtime dependencies, report-only on `dev` ones. The trade-off it named — prompt
  patching vs. unrelated red builds blocking merges — is decided in favour of not blocking.
  **THE POLICY QUESTION IS CLOSED; THE BUILD IS NOT ORDERED HERE.** What it needs is already
  half-present and is written down in D21 so the next block does not re-derive it:
  `scripts/audit-gate.mjs` already runs `npm audit --omit=dev` alongside the full audit and annotates
  each blocking line `PRODUCTION` / `dev-only` / `reachability UNKNOWN`; the PASS/FAIL policy simply
  does not read that annotation yet, and `reachability UNKNOWN` must not become dev-only by default.

- [x] ~~**`body-parser` LOW runtime advisory (GHSA-v422-hmwv-36x6) in `server/`.** ⏳ OPEN.~~
  **RECORDED, NO ACTION — 2026-08-23, PART TWO D22.** Below the `high` gate, so CI is unaffected and
  the gate prints it as an advisory line. It was deliberately NOT bundled into the CI-unblock commit,
  and it stays unbundled: unlike the two client fixes this is a **runtime** dependency, so the bump
  deserves its own decision and its own verification rather than riding along in a chore commit.
  **It is revisited when `server/` is next bumped for another reason**, not on its own schedule.

### Browser seed — follow-ups (noted, NOT built; owner decision)

Quick-Test races are seed-deterministic as of 2026-07 (see `docs/SIM.md` → _Browser determinism_).
An empty seed field draws a fresh seed per race and shows it in the HUD; a typed number fixes the
race. Typed values persist for the browser session. Status of the follow-ups:

**THE FIRST TWO WERE DECIDED TOGETHER ON 2026-08-23 — PART TWO D23 — because they are one thing:**
a real race gets a real seed, and the seed outlives the browser session. **BUILT on `feat/race-seed`
and NOT MERGED — it waits for his eye.** See
[SEED-REAL-RACE-1](../reports/night/SEED-REAL-RACE-1.md).

**WHAT SHIPPED ON THAT BRANCH, so the two items above can be read against something concrete.** The
normal start path resolves its seed through the SAME module Quick Test uses
(`client/src/screens/SetupScreen/quickTestSeed.js`) — empty field draws, typed value fixes, 0
unreachable. The field is a host-facing control in the **Race Settings** panel, and it persists in
`localStorage`; the seed the last race actually RAN with is kept under its own key, because a DRAWN
seed is never written back into the field and would otherwise have no record. It is shown on the
**Result screen** beside track and time, stored on the race-history entry, and offered back in the
setup panel as *"Last race: N — run it again"*. **The third follow-up below is untouched.**

**THE FALLBACK FOR AN OLDER STORED RACE, decided and proved rather than left implicit:** a payload
with no `racePlanSeed` keeps the legacy meaning — **0, unseeded** — and is **never back-filled**.
Handing a stored race a seed it never ran with would be a worse lie than "not reproducible", so the
result screen and the history entry both apply `> 0` rather than `!= null` and report such a race as
having no seed at all.

- [x] ~~**Seed for the normal "Start Race" path.** ⏳ OPEN — owner decision.~~ **DECIDED
  2026-08-23 — BUILD IT (PART TWO D23).** Of the two options this item named — adopt the Quick-Test
  model, or leave it unseeded on purpose — he took the first, and the reason is the one the item
  understated: it hardcoded `racePlanSeed: 0`, so **no race he watches is reproducible, including
  the ones he judges.** The Quick-Test model is adopted rather than a second one invented: same
  semantics, same module.

- [x] ~~**Seed persistence beyond the session.** ⏳ OPEN — owner decision.~~ **DECIDED 2026-08-23
  — IT MUST OUTLIVE THE SESSION (PART TWO D23).** The condition this item set — *only if eye-tests
  need a pinned seed to survive a restart* — is exactly the case he described: he watches a normal
  race, closes the browser, comes back and re-runs that race. `sessionStorage` cannot serve that.

- **Replaying a browser seed in the sim.** The two engines are deterministic _individually_, but a
  browser seed does not reproduce frame-for-frame in the sim (different per-race seed derivation and
  timestep). Making one seed mean one race in both engines is a separate, larger piece of work.

- **Visual Racer Effects** — Surface-class-driven trail system. Four sub-PRs:
  - ✅ **VRE-1** — Foundation: 4 generator modules (`particle`, `cloud`, `splash`, `line`), 9 default surface classes, registry with override resolution, `/api/surface-classes` backend API (CRUD, atomic writes), `surfaceClassLoader.js` cache, `surfaceClassApi.js` service layer. 64 frontend + 24 backend tests. No UI, no race integration.
  - ✅ **VRE-2** — Surface class editor in dev screen. Master-detail layout: class list with Default/Modified/Custom badges on the left, animated live preview canvas + generator config editor on the right. `SurfaceClassManager.jsx`, `SurfaceClassPreview.jsx`, `useSurfaceClasses.js`. 36 new unit tests + 31 new e2e tests (smoke + UX verification). 1084 unit + 183 e2e tests total.
  - ✅ **VRE-3** — Racer/track association: `surfaceClasses` on SpriteRacerType + `getSurfaceClasses()`, all 20 racer types with classes, surfaceClasses in TUNABLE_FIELDS + CONFIG_SNAPSHOT, `filterRacerTypesForTrack()` in registry.js, surfaceClasses on DEFAULT_TRACKS + server migration, pill multi-select UI in RacerEditModal + TrackManager, SetupScreen filter + surface hint. 1134 frontend + 60 backend tests. 2 Playwright specs (smoke + UX verification) written.
  - ✅ **VRE-4** — Race integration: `trailResolver.js` with `resolveTrailEmitter()`. RaceScreen dispatches trail via emitter per racer; home trail fallback when no match. `trackSurfaceClasses` in raceData. 14 new unit tests + Playwright specs.

---

## Completed Items (Phase Completions)

**verify (section-wide):** the section is a record; the one open line is a pointer into it.


| Item                            | PR     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ **D3.5.1**                   | #13    | SpriteRacerType config-driven base class, tintSpriteWithMask                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ✅ **D3.5.2**                   | #15(?) | Horse/Duck/Snail → SpriteRacerType migrated, `_createTrail` removed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ✅ **D3.5.3**                   | #16    | 9 new racer types (Elephant, Dragon, Snake, Giraffe, Buggy, Motorbike, Plane, F1, Rocket)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ✅ **B-7**                      | #17    | Dev screen UI drift: code registry as single source of truth, racerTypeOverrides map                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ✅ **B-8**                      | #17    | SetupScreen footer/pills emoji mapping: from getRacerType().getEmoji() instead of hardcoded map                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ✅ **W3**                       | #17    | Session-only racer override selector in setup track tab, filters disabled types                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ✅ **B-9**                      | #17    | Test-3.1 filter: override selector shows only active types                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ✅ **Q-1 to Q-5**               | #17    | Dead exports, unused imports, TODO tags, JSON.parse hygiene, file headers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ✅ **D9**                       | #19    | Race engine speed refactor: speedMultiplier affects race speed, explicit lap/time choice, dynamic finish line for open tracks, runout behavior, 2s result delay, 22 Playwright e2e tests. Master `dad3300`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ✅ **D3.5.5**                   | #21    | Per-type tuning UI in dev screen: 6 fields (speedMultiplier, displaySize, basePeriodMs, leaderRingColor, leaderEllipseRx, leaderEllipseRy) live-apply via edit modal. CONFIG_SNAPSHOT, normalizeOverrideMap (legacy migration), InfoTooltip component. 678 unit + 36 e2e tests. Master `2d76bc3`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ✅ **D10**                      | #23    | Track size variability + auto sprite scaling + image-first workflow. worldWidth/worldHeight automatically from image dimensions (naturalWidth/naturalHeight). Hard limit 8000×4096. Image required to save. Dimension mismatch dialog. TrackEditor zoom+pan. trackWidth variable. Auto sprite scaling formula. All 8 requirements (A1-A8) met. Hotfix `13a2dd2` (🏁 default icon). 694 unit + 75 e2e tests. Master `13a2dd2`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ✅ **B-Wave**                   | #25    | UX polish sweep: B-1 (player group load StrictMode fix), B-3 (winners max 5→20), B-10 (InfoTooltip auto boundary), B-11 (display size tooltip), B-12 (maxPlayers configurable), B-13 (language selector removed), B-14 (TrackManager hint), B-15 (all German UI strings → English). 694 unit + 88 e2e tests. Master `697e081`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ✅ **B-16 + B-17**              | #26    | Large tracks: B-16 CameraDirector adaptive zoom (zoom = worldW/VIEW_W, max 6), B-17 track speed scaling (baseSpeed ÷ pathLengthPx/referencePathLength). pathLengthPx calculated on track save + migration for existing geometries. SpeedScaleSection in dev screen. 719 unit + 100 e2e tests. Master `7cdde15`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ✅ **fix/list-tracks**          | #27    | Root cause fix for large-track render bug: `listTracks()` did not return worldWidth/worldHeight → bsX=1.0 → only ~549px visible on 6000px world. A1: 2-line fix in trackStorage.js. A2: migration IIFE in storage.js. 723 unit + 103 e2e tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ✅ **fix/camera-polish + Q-14** | #28    | CameraDirector: adaptive zoom (zoom=worldW²/VIEW_W/worldW, clamp 0.15–6), clampOffset 2-anchor formula, top-3 focus. cameraZoomFactor invariant (REFERENCE_CAMERA_ZOOM/cam.zoom, closed tracks only). BaseSpeedSection in dev screen: tunable min/max baseSpeed, spread preview, 2-lap gap estimate. Q-14 lapUtils SoT: DEFAULT_BASE_SPEED_CONFIG from defaults.js, private constants, optional params on openTrackFinishT/estimatedSecondsPerLap. camera-polish-ux-verification.spec.js (31 tests, permanent). 759 unit + 157 e2e tests. Master `750d826`.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ✅ **D11**                      | #30    | Racer behavior: soft avoidance + drafting. Asymmetric avoidance (trailer yields, leader holds lane) — eliminates symmetric force cancellation in packs. Proximity-scaled force, configurable avoidanceDistance/lateralForce/maxLateral. Speed brake for adjacent racers. Drafting boost for close followers in same lane. World-edge camera clamp (finding 2, prevents black strips at high zoom). Camera-zoom-aware sprite scaling for open tracks: `computeOpenTrackCameraZoomFactor()` produces identical on-screen size as closed-track reference at any zoom. Pixel-floor logic: `minVisiblePixels` (default 32) ensures sprites never vanish on wide tracks. All 5 params tunable in dev screen. 809 unit + 183 e2e tests. Master `d46cab2`.                                                                                                                                                                                                                               |
| ✅ **D7a**                      | #33    | Proportional sprite scaling + min-size floor + relative zoom ratios + label scaling. cameraZoomFactor + REFERENCE_CAMERA_ZOOM removed. computeRenderDisplayScale as single source of render pipeline: max(proportionalScreenPx, minTargetScreenPx). CameraDirector: overviewZoom × ratio per state (LEADER:1.4, BATTLE:1.6, COMEBACK:1.3). Label scaling with effZoom. Q-15 structurally addressed: 4 scaling factors → 1 pipeline. 808 unit + 183 e2e tests. Master `a49baa0`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ✅ **D7a-Plus**                 | #35    | Per-type minTargetScreenPx with live preview. Slider + animated canvas preview in RacerEditModal. Global default hint, modified badge, reset. getEffectiveMinTargetScreenPx() in render pipeline. Scroll indicator follow-up (fade gradient). CC smoke test convention: verification sources clarification. Master `27cba65`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ✅ **D7b**                      | #37    | Lane-free: physicalY system fully replaces currentLaneY/targetLaneY. physicalY ∈ [-1,+1] (0=centerline). Home force spring, anisotropic avoidance distance (t×tWeight + physicalY×yWeight), cone drafting (world coordinates), speed brake for adjacent racers, soft repulsion + hard clamp. 13 new/updated tunable parameters in dev screen. Lane code hard removed. Unit + e2e tests updated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ✅ **D7b-fix B1+B2**            | #37    | Follow-up commit on branch D7b: B1 — start spread: racers start evenly distributed over [-startSpreadRange, +startSpreadRange] instead of all at physicalY=0 (computeStartPhysicalY, new dev screen parameter). B2 — yDiff=0 edge case: when both racers have the same physicalY, no lateral force is applied (prevents all trailers flying toward +1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ✅ **D7b-fix B3**               | #37    | Anti-stacking (force imbalance, was listed as D11 finding in backlog): avoidance forces are normalized by sqrt(neighborCount) — prevents boundary clinging with 20+ racers where linear force accumulation overwhelmed restoring forces. New defaults on 2026-04-29: homeForceStrength=0.04 (+122%), softRepulsionStrength=0.10 (+67%), lateralForce=0.010 (−33%) — that day's values, not today's.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ✅ **D7c**                      | #39    | Row start + speed bonus + track capacity. `computeRowLayout` (shuffled, row assignments), `computeRowPhysicalY` (full spread also for last incomplete row), `computeSpeedBonus` (factor 1.0 = pole-neutral), `computeMaxRacersDefault` (auto capacity from pathLengthPx). Closed tracks: back rows start at negative t (tPos wraps correctly). Open tracks: t=0 through EditorShape clamp. `maxRacers` on track with "modified" badge. Setup screen: row hint + capacity warning. Dev screen row start section: 4 parameters. 21 unit + 6 e2e tests.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ✅ **D7c-fix**                  | #39    | Bug: `trackWidth` metadata (140 px, calibrated for 1280px world) gave `racersPerRow=1` on large worlds (6000px) → all 20 racers in single rows → single vertical line. Fix phase 1: `EditorShape.getActualTrackWidth()` measures real geometric width (median, cached). Fix phase 2 (D7c-fix-v2): formula completely in world pixel space: `computeRacersPerRow(trackWidthPx, frameSizePx)` = `floor(2×trackWidthPx/frameSizePx)`. `trackWidth` field completely removed from track data model — TrackManager dropdown removed, `raceData.trackWidth` and `track.trackWidth` removed. Fix phase 3 (D7c-fix-v3): floating-point rounding. **Note (scale-cleanup 2026-06-07):** `getActualTrackWidth()` is now the FALLBACK only. Physics reads `track.width` first (`track.width ?? getActualTrackWidth()`). The Track Editor stores the true physical lane width as `track.width`; `getActualTrackWidth()` can overestimate (e.g. Space Sprint: 449 px spline vs 300 px stored). |
| ✅ **D7c-Phase4**               | #39    | Three fixes on feat/d7c-row-start-with-speed-bonus. (1) **startSpreadRange 0.7→0.95**: default increased; migration: saved value 0.7 is updated to 0.95 on load. (2) **Formula mismatch fix**: `computeRacersPerRow` now receives `effectiveWidth = geometricWidth × startSpreadRange` — packing calculation now matches actual racer distribution (before: formula used 100% of track width, distribution only 70%). Updated in RaceScreen, TrackManager, SetupScreen. (3) **Open track layout**: a) Assembly area — rows start at `t = (totalRows − rowIndex) × deltaT_per_row` instead of negative t → no more clamping, all rows within track. b) `runoutZone` parameter (default 0.05) — finish line on open tracks at `1.0 − runoutZone` (tunable in dev screen). No more `openTrackFinishT` in RaceScreen. Setup screen shows finish % from runoutZone. Migration for startSpreadRange + runoutZone validation in loadRaceBehaviorConfig.                                 |

| ✅ **D7b-fix B4** | #98 | Free-lane separation + home force reduction. Additive impulse logic on geometric overlap: `isSideFree()` checks left/right space against all other active racers; deterministic direction choice via `stablePairBit` when exactly equal physicalY. `homeForceReductionOnOverlap: 0.3` on 2026-05-14 — home force reduced to 30% during geometric overlap so free-lane can complete the separation. Geometry metadata (`frameSizePx`, `trackWidthPx`, `pathLengthPx` — field names from scale-cleanup rename) passed from RaceScreen to racer. `reRollVariationPercent: 45 → 58` (2026-05-14; both superseded since). 13 new unit tests. 94 files / 1741 tests. |
| ✅ **Scale Cleanup** | `feat/open-track-overlap` | Foundation fix: physics now measures the world that is drawn. Three sources of truth corrected: (1) `trackWidthPx` reads `track.width` (stored by Track Editor, e.g. 300 px for Space Sprint) first, `getActualTrackWidth()` only as fallback for legacy tracks without stored width. (2) `drawnBodyWidthPx` = `bodyRef.bodyNarrow` from `computeBodyNarrowRef` (true visible body width), not `physicalSpriteSize × bodyFillX`. (3) `drawnBodyLengthPx` from render primitives independently. (4) physicalY ↔ px helpers `pxToPhysicalY` / `physicalYToPx` route ALL lateral conversions; raw `× trackWidth` was off by 2×. Six denominator/BLOCKED sites in `raceBehavior.js` fixed. Naming cleanup: 9 field renames, 2 getter renames, dead branches removed. All 19 sweep scripts + diag scripts updated. 2629/2629 tests. See `docs/ARCHITECTURE.md` § Scale & Size and `reports/open-track-overlap/34-scale-build.md`. |

| ✅ **Priority System** | #100 | 4-mode home force priority system (Phase 2). OVERLAP / COOLDOWN / BLOCKED / NORMAL — home force only active in NORMAL, so free-lane and avoidance resolve collisions first. `priorityExtras` param in `applyRacerBehavior`; legacy path (`homeForceReductionOnOverlap`) kept for tests. Escape hatch: after `blockedTimeoutFrames` (default 60) consecutive BLOCKED frames, `blockedEscapeForce × homeForceStrength` (default 30%) kicks in. M-overlay: colored rings, frame count, avg/max stats, blocker detail panel. DevScreen: PrioritySystemSection with cooldownMs, blockedTimeoutFrames, blockedEscapeForce. **BLOCKED check iterations:** (1) bounding box (false positives — Decision Log #9) → (2) line segment distance (too restrictive, racers with forward movement on path block incorrectly) → (3) **target point check** (final): checks only point (r.t, physicalY=0), distance < spriteSize → BLOCKED; reactive per frame, no lookahead needed. `lookaheadFrames` removed from DevScreen. |
| ✅ **Phase 3B** | squash `07bea7b` | BATTLE_ZOOM (isolation+greedy expansion+centroid), COMEBACK_ZOOM (green ring, globalAlpha), LEAD_CHANGE_ZOOM (lead change). Direction system: weighted candidate pool + OVERVIEW scheduler. Fixes: OVERVIEW zoom fix (L83), OVERVIEW pan jump (L84), ctx.filter→globalAlpha (L86), overlay sets clear. 3 new HUD components. +54 unit. 2041/2041 ✅. Master HEAD `07bea7b`. |

- **B-6** (speedMultiplier bug) — subsumed by D9. Was planned as a separate fix,
  fully resolved by the D9 refactor (PR #19).

---

## Planned — needs spec

**verify (section-wide):** for an item with **no spec** there is nothing a command could compare the
tree against, and that is this section's own name — such an item leaves here by being specified, not
by being checked.

**BUT THAT IS NO LONGER TRUE OF THE WHOLE SECTION, corrected 2026-08-23 (BACKLOG-SORT-42).** Sorting
the 42 found that a number of these items are not unspecified at all — they name a file, a key or a
function, and a one-line command decides them. **Those now carry their own `verify:` line and it
takes precedence over this paragraph.** The section-wide claim covers only the items that still have
none. **The distinction matters because "no spec" was doing double duty**: it described items nobody
had thought through *and* items nobody had checked, and the second group turned out to contain four
already-settled questions.


### Phase D (Racer Design Development)

- **D3.6** — File reorganization: `racer-types/` → `racer-configs/` (39 files).
  Separates configuration from engine code. Small standalone PR.
  **verify:** `git grep -l "racer-configs" -- client/src` returns nothing and
  `client/src/modules/racer-types/` still exists (checked 2026-08-23), so **still open**.

- **Surface Zones** (follow-up phase after Visual Racer Effects) — local surface class overrides
  within a track (e.g. puddle on asphalt, mud pit on dirt). Track editor gets a
  zone drawing tool; `EditorShape` gets `getZonesAtPosition(t, offset) → Zone[]`. Planned
  once Visual Racer Effects is complete.
  _(Previously tracked as D6 / RTE reservation — `rteDefinitions` placeholder on SpriteRacerType will be
  replaced by Surface Classes; old placeholder cleaned up in VRE-1.)_
  **verify:** `git grep -l "getZonesAtPosition" -- client/src` returns nothing — the named API
  exists only in prose (checked 2026-08-23), so **still open**.

- 👁 **D7d** — 100-racer performance. **DOWNGRADED 2026-08-23 FROM A WORK ITEM TO AN OBSERVATION —
  PART TWO D18.** **THE LIVE ENTRY** (a status echo of it also sits in *Order of Next Steps*; edit
  only this one).
  **His decision rests on his own use: he runs 100-racer races routinely and has seen nothing
  wrong.** So the three mechanisms below are **NOT ORDERED**, no direction is given on them, and
  nobody is to build one against a performance problem nobody has observed. **If it ever bites it
  shows as STUTTER — and then it is a MEASUREMENT question, not this item.**
  - ~~Spatial grid for O(N) avoidance performance~~ — not ordered
  - ~~Smarter camera for pack overview~~ — not ordered
  - ~~LOD or similar strategies for 100 racers~~ — not ordered

  **verify:** `git grep -lni "spatial grid\|spatialGrid" -- 'client/src/**'` — it returns nothing, and
  `\bLOD\b` over `client/src/**` is also empty (checked 2026-08-23), so neither named mechanism
  exists. **That command no longer decides an OPEN item** — it now only confirms the observation's
  premise, which is that none of this was ever built. The pattern can match; it is ordinary
  vocabulary.
  **A NAMING COLLISION, so it is not read as a cross-reference:** this item is `D7d`, a Phase-D
  sub-item. It has nothing to do with **decision D7** in PART TWO.

- **D8** — Full racer config editor: coats edit UI, all fields, sprite swap UI.
  Builds on override pattern (B-7).
  ⏳ **PARTIAL (2026-07-14 audit):** basic racer editing already shipped — `RacerManager.jsx`
  (list / create / delete) + `RacerEditModal.jsx` (per-field tuning overrides → localStorage/server).
  Still open for the "full" editor: the coats-edit UI and the sprite-swap UI.
  **verify:** `git grep -ni "coat" -- client/src/screens/DevScreen/sections/RacerEditModal.jsx`
  returns nothing (checked 2026-08-23), so the coats half is **still open**.

### Phase B (Wiring Gaps + UX Improvements)

- **B-UX-Pause** — Pause + resume race
  - During a running race, pause button → freeze rAF loop, resume → continue
  - Explicitly NOT part of the camera phase (PR-G only implements Cancel Race with confirm dialog)
  - Priority: after camera phase

- **B-UX-ManualFocus** — MANUAL_FOCUS: game master click on racer locks camera
  - Canvas click handler + hit test racer + new MANUAL_FOCUS state in CameraDirector
  - Lock UI indicator, unlock mechanism (click empty / button)
  - Effort: ~150–200 LOC, new camera state
  - Priority: after camera phase (too complex for this phase)

- **B-UX2** — Dev screen cleanup + help screen
  - Dev screen has grown to 30+ tunable values across D9/D10/D11/D7a/D7b.
    User finding: "the individual values are hard to contextualize, tooltips alone add little value"
  - Planned (spec still pending):
    - Structural reordering: race behavior sliders together, visual sliders together, etc.
    - Help modal per section with more detailed explanations (more than InfoTooltip)
    - Optional: beginner / advanced separation (power user sees everything, standard only key values)
    - Optional: visual preview components in sections where useful (analogous to D7a-Plus)
  - Priority: medium-high. Should be tackled before D8 (full racer config editor),
    so D8 is not built into a disorganized dev screen environment.

- **B-UX3** — Detailed variable documentation
  - User finding: "I need an explanation that says more than the tooltip — what do all
    the variables in the dev screen actually do"
  - Planned (spec still pending):
    - A separate doc file per section or a central DEVSCREEN_REFERENCE.md under docs/
    - Per parameter: name, type, default, range, effect in plain language,
      example values for different use cases (small race vs. large race, etc.)
    - Diagrams/images where useful (e.g. comfortThreshold visualized)
    - Cross-references to ARCHITECTURE.md pipeline sections
  - Priority: together with B-UX2 — the help screen can reference or embed the documentation.
    Can also be created as a pure documentation sprint before B-UX2, then B-UX2 uses the content.

- **B-UX-MinMax** — Dev panel min/max pairs UX: replace silent rejection with visual warning, consistent for speed range (RaceTuningSection) + overviewCooldownMin/Max (CameraZoomTuningSection) + any future min/max pairs. Currently an invalid value (min > max or max < min) is silently ignored — no feedback for the user. Fix: red border or inline text ("Min must be less than Max") when limit is violated. Small standalone PR.
  **A PRECEDENT NOW EXISTS TO COPY, found 2026-08-23 (BACKLOG-SORT-42):** `DynamicsTuningSection.jsx`
  already renders *"Invalid: min must be > 0 and < max."* inline. **Neither section this item names
  has one** — so the work is to apply an existing pattern in two places, not to invent one.
  **verify:** `git grep -ni "must be" -- client/src/screens/DevScreen/sections/RaceTuningSection.jsx client/src/screens/DevScreen/sections/CameraZoomTuningSection.jsx` — returns nothing, so **still open**
  _(Arose during Phase 4 slider implementation 2026-05-06, Severity: LOW — currently consistent with existing speed range convention)_

- **B-UX4** — Sprite size system overhaul
  - Current behavior: per-type overrides (e.g. `displaySize: 50` for Rocket) are absolute
    values and completely disable auto scaling (`displaySizeScale = 1`). This means
    sprites can appear too large on narrow tracks — and was one of the factors
    that led to an incorrect `racersPerRow` value during D7c diagnosis.
  - Alternative concepts (spec still pending):
    - **(a) Override as multiplier** over auto scaling (e.g. `displaySizeOverride: 1.25` = 25% larger than auto)
    - **(b) Mixed mode with min/max limits** — auto scale runs, override sets upper/lower bound
    - **(c) Complete redesign of the tunable concept** — auto and absolute value as selectable modes
  - Arose during D7c diagnosis (2026-04-29). Needs vision discussion before spec is written.
  - Priority: low. Currently not a UX blocker — only visible with deliberate displaySize override + large track.

- ~~**B-2** — TrackSelector: custom track behavior when geometry is missing~~ — ✅ **CLOSED
  2026-08-23 (BACKLOG-SORT-42). Closed by `5bde5a94` (QUIET-FAILURES-1, 2026-08-17)**, confirmed at
  source: `SetupScreen.jsx` computes `selectedGeometryReady` from `getTrack(geometryId)` — the cache,
  not the summary — and gates `canStart` on it, so a track whose geometry is missing is **REFUSED**
  rather than started as the wrong race mode. **The general rule this leaves behind:** a missing
  geometry used to resolve to `false` = CLOSED, so an OPEN track quietly ran as a laps race; where
  there is nothing honest to guess, the answer is to refuse rather than to default.
  **verify:** `git grep -n "selectedGeometryReady" -- client/src/screens/SetupScreen/SetupScreen.jsx`

- **B-5** — System backup/restore/reset: **end-to-end verification only — THE WIRING EXISTS.**
  Corrected 2026-08-23 (BACKLOG-SORT-42): `SystemSettings.jsx` imports and calls `exportAllStorage`,
  `importAllStorage` and `exportDiagnosticSnapshot`, downloads a `racearena-backup-*.json`, and
  re-seeds defaults after reset. **"Wiring missing" was already false** — see the correction at
  *Order of Next Steps* item 18. What is open is an end-to-end pass over export → import → reset.
  **verify:** `git grep -n "importAllStorage\|exportAllStorage" -- client/src/screens/DevScreen/sections/SystemSettings.jsx`

### Phase Q (Quality Hygiene)

**Refactor chunks (high structural debt — addressed in upcoming phases):**

- **Dual particle system consolidation** — `dustParticles` (home trail, global pool) + `surfaceParticles` (VRE, per-racer) as separate render paths. Consolidation makes sense after Surface Zones when a third emitter type (zone effects) is added.

- **Q-19 — TrackEditor.effects.test.jsx flaky** — **CANNOT ESTABLISH, 2026-08-23, and that is
  about the evidence and not about effort.** The file passes **11/11 in isolation** and the full
  client suite ran green **three times** on 2026-08-22/23. **Three green runs cannot settle an
  intermittent failure.** *What would decide it:* repeated full-suite runs under the parallel
  configuration, counting failures — a MEASUREMENT, so it is not a verdict item. — intermittent in full-suite parallel run. Root cause: global FileReader mock scope conflict. Fix: check spy scope or isolation test. Low priority, not a blocker.

- **Q-8** — Watch list: TrackManager.jsx and BrandingProfiles.jsx. **THE LOC FIGURES ARE REMOVED
  RATHER THAN UPDATED.** Recorded as 535 and 330; measured 2026-08-23 as **654** and **559** — both
  now past the 400-line threshold this watch exists to enforce, having grown while the watch
  produced no action. **A watch that produces no action is a comment.**
  **verify:** `git grep -c "" -- <file>` — **still open while either exceeds 400.**
  Consider refactor at next extension.

- **Q-9** — Watch: `racer-types/index.js` — candidate for splitting. Recorded at 286 LOC;
  **540 on 2026-08-23**, nearly doubled.
  **verify:** `git grep -c "" -- client/src/modules/racer-types/index.js` — **still open above 400.**
  (override API vs. registry vs. boot logic). Not a problem today, monitor.

- **Q-10** — Watch: `RacerEditModal.jsx`. Recorded at 302 LOC and described as *already 75% of
  the 400-LOC threshold*; measured 2026-08-23 at **670 — 68% PAST it**, and the file has moved to
  `client/src/screens/DevScreen/sections/`.
  **verify:** `git grep -c "" -- client/src/screens/DevScreen/sections/RacerEditModal.jsx` —
  **still open above 400.**
  Keep an eye on it at D8 (full config editor).

- **Background cache for offline play** _(Low priority)_

  Currently all tracks (default + custom) require the running backend server for background images.
  When server is offline → console warning (since PR-A2.8) and black/gradient background in race.

  **User vision:** Tracks that were loaded once with a running server should remain playable with
  background while offline.

  **Resolution (2026-06-18, L.4-BgCacheRemoved):** Background-image caching removed entirely.
  localStorage approach is structurally impossible — default backgrounds are 4–10 MB; even JPEG
  downscale at q0.6 exceeds the 5–10 MB total quota once geometry + other data are included.
  `trackCache.js` deleted. `_cacheBackgroundAsync`, `getTrackBackgroundUrl`, `resolveBackgroundSrc`,
  `purgeStaleServerGeometries` all removed from `trackLoader.js`. Geometry cache kept intact.
  Offline races run without background image. One-time localStorage cleanup in `main.jsx` removes
  legacy `racearena:cache:backgrounds` key on first load.

  **If background offline play is required in future:** Use IndexedDB (no Base64 overhead, no
  5 MB quota). Consumption side in RaceScreen/PresetThumbnail would need async `getBackground(id)`.
  Effort ~4–5h. Not planned.

  **Priority:** Not planned (structural impossibility resolved by removal).

- **Q-27** — Background image weight. **THE ITEM'S PREMISE IS STALE AND THE NUMBER IS UNDERSTATED —
  re-measured 2026-08-23 (BACKLOG-SORT-42).** It was written as *"~11.7 MB uncompressed PNGs"* and
  named pngquant/tinypng. **There are ZERO PNG backgrounds:** `server/data/backgrounds/` holds 13
  files, all `.jpg`. The five named tracks total **21.23 MB** as JPEGs — nearly double the recorded
  figure — and the whole directory is **60.45 MB**. **So the fix as written cannot be executed** (there
  is nothing to run pngquant over) **while the concern it was raised for is larger than recorded.**
  Re-specifying it is the work; the old plan is not.
  **verify:** `ls server/data/backgrounds/ | grep -c "\.png$"` returns 0 — **still open while the
  directory weight is unaddressed and no re-spec exists.**
  _(Priority: low. Audit 2026-05-04, deferred in PR-A2.9.)_

- **Q-20a** — Track editor load mode: background upload is now optional (F1-revised fix). But when a load-mode track has no background and the user saves without uploading one, the race engine is left without a background image. Consider: hint text "No background — race will show empty canvas" when a track is saved in load mode without a background.

- ~~**Q-12** — localStorage quota with large data-URL images~~ — ✅ **SUPERSEDED 2026-08-23
  (BACKLOG-SORT-42) by the background-cache removal of 2026-06-18 (L.4-BgCacheRemoved)**, which is
  recorded in the *Background cache for offline play* entry above. **Its premise no longer holds:**
  `git grep -n "data:image" -- client/src/modules/storage client/src/modules/track-editor` returns
  nothing, `trackCache.js` is still deleted, and backgrounds are served as server files
  (`server/data/backgrounds/`), not persisted as data-URLs. The storage layer also catches a failed
  write rather than throwing (`storage.js`, covered by a QuotaExceededError test).
  **The general rule kept:** localStorage is not an image store — 4–10 MB backgrounds cannot fit a
  5–10 MB total quota, which is why the cache was removed rather than tuned.

- ~~**Q-18** — RaceScreen integration test infrastructure~~ — ✅ **SUPERSEDED 2026-08-23
  (BACKLOG-SORT-42) by his decision D2 of 2026-08-23** (PART TWO): *"`RaceScreen` is not testable —
  the finding STAYS, nothing is done."* **Q-18 asks for precisely the work D2 declines.** The finding
  it rests on is still true and is still recorded in PART ONE; what is closed is whether to act on it.
  **Not evidence of testing coverage either way:** `client/src/screens/RaceScreen/` does carry unit
  tests today, but of extracted pieces (HUDs, ceremony, ending schedule, framing inputs) — not the
  integration tests this item asked for.
  _(Deep audit 2026-05-01, Severity: MEDIUM.)_

- **Q-20b** — Server test backup cleanup not crash-resistant (TLH-1). **RENAMED FROM `Q-20`
  2026-08-23 (BACKLOG-SORT-42): the id was used TWICE**, here and for the track-editor hint above
  (now `Q-20a`). Two different items under one id is a lookup that silently returns the wrong one.
  **verify:** `git grep -n "process.on" -- server/src/routes/tracks.test.js` — returns nothing, so
  **still open**
  `afterAll` in `tracks.test.js` cleans up backup files via `rmSync`, but only on normal
  test run end. On Ctrl+C / crash before `afterAll`, all backup files remain in the real
  `server/data/tracks-backups/` directory. During TLH-1 development ~41 orphan files
  were created. Possible approach: `process.on('exit', cleanup)` + `process.on('SIGINT', cleanup)` as
  guard, or switch tests to a temporary directory (DATA_DIR override via env var).
  _(Discovered TLH-1 2026-05-01, Severity: LOW)_

- **Q-21** — `.json.tmp` orphans on OneDrive EPERM fallback (TLH-1)
  `atomicWriteJson` writes `.tmp` first, then `renameSync`. If `renameSync` fails (OneDrive
  EPERM), fallback `writeFileSync` writes to the target file — after which `unlinkSync(tmp)` should delete the
  `.tmp` file. If that also fails, a `.json.tmp` file remains. `findBackupFiles`
  searches for `endsWith('.json')` and does not find `.json.tmp` — such orphans are never cleaned up.
  Possible approach: server boot routine scans `tracks-backups/` for `*.json.tmp` and deletes them,
  or `findBackupFiles` includes `.json.tmp`.
  **verify:** `git grep -n "json.tmp" -- server/src` — the only hits are test assertions that a
  `.tmp` does NOT remain after a normal write; **no boot sweep and no `.json.tmp` branch in the
  server's own `.json` filter (`tracks.js`), so still open** (checked 2026-08-23).
  _(Discovered TLH-1 2026-05-01, Severity: LOW)_

- **Q-22** — TrackEditor frontend draft snapshot
  localStorage snapshot of the drawn geometry (key: `racearena:trackEditor:draft:<serverId>` for
  load mode, `racearena:trackEditor:draft:new` for new mode). Written on every point action or every
  ~30s, deleted after successful server save. Protects against data loss on silent
  server errors (F3 scenario from TLH-2 browser test) or browser crash. Effort: small (~50 LOC).
  Small standalone PR.
  **verify:** `git grep -l "trackEditor:draft" -- client/src` returns nothing (checked 2026-08-23),
  so **still open**.
  _(Arose from TLH-2 browser test 2026-05-02, Severity: MEDIUM)_

- **Q-24** — isDefault immutability via PUT explicitly tested
  Audit found: `PUT /api/tracks/:id` handler explicitly sets `isDefault: existing.isDefault` and thereby overrides any client-sent value — `isDefault` is thus de facto immutable via API. But there is no explicit backend test protecting this behavior. If someone restructures the PUT handler, this protection could silently disappear. Standalone backend test case: "PUT with `isDefault: false` on default track does not change `isDefault`".
  **verify:** `git grep -n "isDefault" -- server/src/routes/tracks.test.js` — the hits cover DELETE
  refusal and seed defaults; **no test PUTs `isDefault: false` at a default track**, so **still
  open** (checked 2026-08-23).
  _(Arose during audit in City Circuit bug fix 2026-05-02, Severity: LOW)_

- **Q-23** — Two-step save: no differentiated error message on background upload failure
  Track save is two-step: step 1 `PUT /api/tracks/:id` (geometry), step 2 `POST /api/tracks/:id/background`
  (image file). If step 1 succeeds and step 2 fails, the user sees a generic
  save error — not "geometry saved, background not". The background file remains permanently
  without upload in this case. Possible solutions: (a) separate error message per step with "Retry Background"
  option, (b) atomic save (rollback geometry if background fails). Effort: small–medium.
  _(Arose 2026-05-02 after background diagnosis dirt-oval, Severity: MEDIUM)_

- **Q-13** — Sprite frame animation stutters with large sprites
  On 6000-tracks sprites become very large — frame changes appear jerky.
  **THE STRUCTURAL HALF HAS SHIPPED — confirmed at source 2026-08-23 (BACKLOG-SORT-42).**
  `maxTargetScreenPx` is live in `client/src/modules/autoSpriteScale.js`, the render-pipeline single
  source, as the CEILING term (`result = maxTargetScreenPx / (displaySize × frameEffZoom)`). The item's
  own closing condition was *"after PR-E + browser verification"*; **PR-E is in, the browser check is
  not evidenced anywhere.** So what remains is an EYE-TEST, not code.
  **verify:** `git grep -n "maxTargetScreenPx" -- client/src/modules/autoSpriteScale.js` — present, so
  the code half is done; **still open only until someone watches a 6000-track race and says so.**
  Fallback solutions (basePeriodMs scaling, frame interpolation) only if
  maxTargetScreenPx calibration is insufficient.

- **Q-29** — Shared RangeSliderSection component _(Post-Phase-4 audit 2026-05-06, Severity: LOW)_
  Three Phase-4 Dev-Screen sections share a 36-line slider pattern:
  `NameTagVisibilitySection.jsx`, `SpriteSizeRangeSection.jsx`, `CameraZoomTuningSection.jsx`.
  Extract into a shared `RangeSliderSection` component before more Dev-Screen sections are added.
  Estimated effort: ~2h.
  **verify:** `git grep -l "RangeSliderSection" -- client/src` returns nothing (checked 2026-08-23),
  so **still open**.

- **V-1** — PlayerSetup B-1 loading-saved-lists bug. **ITS BLOCKER IS GONE — B-1 SHIPPED** in the
  B-Wave (PR #25, master `697e081`), recorded in *Completed Items* above. **So this is no longer
  "cannot start"; it is an unperformed verification of shipped work**, which is a different and much
  cheaper thing. Re-sorted 2026-08-23 (BACKLOG-SORT-42).
  **verify:** none can exist — it is a manual UI check of loading a saved player list.

- **V-2** — TrackSelector B-2 custom track behavior. **ITS BLOCKER IS GONE — B-2 IS CLOSED**
  (`5bde5a94`, QUIET-FAILURES-1); see the struck entry above. **This is now an unperformed
  verification of shipped work:** select a track whose geometry is missing and confirm Start is
  refused with a reason rather than starting the wrong race mode. Re-sorted 2026-08-23
  (BACKLOG-SORT-42). *(The same downstream shape holds for V-1↔B-1 and V-5↔B-5.)*
  **verify:** none can exist — it is a manual UI check.

- ~~**V-3** — Result screen winner count B-3 (configurable?)~~ — ✅ **ALREADY ANSWERED 2026-08-23
  (BACKLOG-SORT-42): YES, it is configurable.** `winners` is a key in `defaults.js` with a DevScreen
  control and an InfoTooltip in `RaceDefaults.jsx` (decrement guarded at 1). The question this item
  asks has an answer at source; there is no work in it.
  **verify:** `git grep -n "winners" -- client/src/screens/DevScreen/sections/RaceDefaults.jsx`

- **V-5** — System backup/restore/reset B-5 (data loss risk). **NOT INDEPENDENTLY OPEN —
  downstream of B-5** above. *(Its "data loss risk" note still stands as the REASON B-5 is worth
  doing, which is why this line is kept rather than struck.)*

- **V-6** — Multiple dev panel sections — visual verification

- **V-7** — Physics + collision behavior — smoke test

- **V-8** — localStorage persistence edge cases — stress test

- **V-9** — Fullscreen toggle — functionally unverified

### Phase T (Tooltip Retrofit)

All existing dev screen fields that are unclear without a label. Uses `InfoTooltip` component
from D3.5.5.

**Measured 2026-08-23 (BACKLOG-SORT-42) — three of the four have been retrofitted in substance and
one has not been touched.** The count below is `InfoTooltip` occurrences in each section. **A count is
not a completion test**: this phase's closing condition is *"all fields that are unclear without a
label"*, and which fields are still unclear is HIS judgment, not a grep's. So the three are left OPEN
rather than struck, with the evidence attached.

- **T-1** — RaceDefaults fields. **8 `InfoTooltip` uses present** — retrofitted in substance.
  **verify:** `git grep -c "InfoTooltip" -- client/src/screens/DevScreen/sections/RaceDefaults.jsx`

- **T-2** — TrackManager fields. **10 `InfoTooltip` uses present** — retrofitted in substance.
  **verify:** `git grep -c "InfoTooltip" -- client/src/screens/DevScreen/sections/TrackManager.jsx`

- **T-3** — BrandingProfiles fields. **8 `InfoTooltip` uses present** — retrofitted in substance.
  **verify:** `git grep -c "InfoTooltip" -- client/src/screens/DevScreen/sections/BrandingProfiles.jsx`

- **T-4** — SystemSettings fields. **ZERO `InfoTooltip` uses — genuinely untouched**, and the only
  one of the four that is.
  **verify:** `git grep -c "InfoTooltip" -- client/src/screens/DevScreen/sections/SystemSettings.jsx`

---

## Order of Next Steps

**verify (section-wide):** a sequencing note, not a claim — it closes when the order is no longer useful.


1. ✅ **B-Wave** (B-1, B-3, B-10..B-15) — PR #25, master `697e081`
2. ✅ **B-16 + B-17** — PR #26, master `7cdde15`
3. ✅ **fix/camera-polish + Q-14** — PR #28, master `750d826`
4. ✅ **D11** racer behavior — PR #30, master `d46cab2`
5. ✅ **D7a** proportional sprites + zoom + labels — PR #33, master `a49baa0`
6. ✅ **D7a-Plus** per-type sprite minimum size + live preview — PR #35, master `27cba65`
7. ✅ **D7b** lane-free + physicalY avoidance — PR #37
8. ✅ **D7c** row start + speed bonus + track capacity — PR #39
9. 👁 **D7d** — 100-racer performance — **an OBSERVATION since 2026-08-23 (PART TWO D18), not a
   work item.** **DUPLICATE — the live entry is in the Race-Action Arc section above**, which carries
   the three sub-items (spatial grid, pack-overview camera, LOD), all three not ordered. This line is
   a status echo; do not edit it independently.
10. ✅ **Visual Racer Effects** (VRE-1 → VRE-2 → VRE-3 → VRE-4) — Master `c857a7e`
11. ✅ **Quick wins post-VRE** (server vitest v4, backend validation, window.alert, JSON.parse, doc drift)
12. ✅ **Error boundary** (deep audit HIGH finding addressed — top-level React error boundary, PR #51)
13. ✅ **Race track lights** — boundary lines + lane fill removed, replaced by glowing track lights. `trackLights` field in data model, track editor UI, server migration, `trackLights.js` module with animation styles (steady / sequence / sync_pulse / random_flash). Cache bug (L37) + CSS fix in same PR.

- **L37 drift risk (not fixed in PR #52):** `buildTrackFromEditorState` in `trackEditorSave.js` contains an explicit output field list — intentional there (form only knows its own fields), but new editor features require an explicit update of this function. Not an acute bug, but a reminder for future features.

14. ✅ **TLH-1 — backend fixes + migration** — geometryId client-authoritative, delete preserves geometry, auto-backup, default track seed migration. PR #55.
    14b. ✅ **TLH-2 — UI flow + cleanup** — edit modal geometry status display, track editor two-mode (load/new), two-path load, geometryId first draw. PR #56/#57, squash-merged.
    14c. ✅ **Track delete safeguards + background race condition fix** — remove background button, DELETE background endpoint, isDefault 403 guard, migrateDefaultTracks idempotent, useEffect cancelled flag (L43). PR #58, squash-merged `fc5690f`.
    14a. ✅ **Draw default tracks** — all 5 geometries drawn and saved (2026-05-02): Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit.
    14d. ✅ **PR-A2.5 — Visual Race Naturalness** — arc-length-uniform spline resampling (`catmullRomSpline` default) + jitter amplitude ±5% relative (`race_baseSpeed * 0.05`). T-uniform max/min ratio was 1.36–7.72×; after fix ≤1.01×. +28 tests (1314 total). UX vision "constant pixel velocity" from 2026-05-03 browser test addressed. UX-1…UX-4 (Setup-Screen layout/settings) remain open in UX_FOLLOWUPS.md — planned for B-Wave after Camera-Director phase.
15. 🔜 **Camera phase + RaceScreen refactor** — revise CameraDirector, split RaceScreen (Q-7). Concept documentation sprint first. Q-25 (track canvas size) as parallel consideration in concept sprint.
    15b. ✅ **Phase 3A — Race plan + area bonus** (feat/phase-3a, 2026-05-19) — `racePlanner.js` (B1–B5 area assignment, P-controller trajectoryMult [0.85,1.10], seeded PRNG), `areaBonusMult` in physics loop (fade after OUTCOME), symmetric start rows (bottom-up), dynamic finish line open tracks (ssf-based), 5 HUD overlays (RP DIAG), `racePlanBonusStrengthMultiplier` DevPanel + Sim. Defaults: avoidanceDistance=0.15, bonusMult=2.0. Sim smoke 120s: χ²=0.3–0.6 ✅. User-validated.
    16 (shifted). **TLH-3 — code fallback + status banner + export** — deferred until after Camera Phase.
    15c. ✅ **STUCK mode** (master `50c9740`, 2352 tests) — bilateral avoidance suppression. When `totalPressure > 0.008`, `imbalance < 25%`, `|physicalYVelocity| < 0.0015`: set `delta = 0` so racer holds position silently until pack geometry resolves. `stuckModeSuppress: true` (default). Sim: −18% zigzag / −10% overlap / −25% lateralSpeedScore (Space Sprint); −29% lateralSpeedScore (Dirt Oval). Lesson L108.

15d. ✅ **Adaptive zoom + rubber-band catch-up** (master `b5947b2`, 2382 tests) — Per-frame visibility ratchet, `minRacersVisible=8` as of 2026-05-31; slow zoom-out floor (`leaderMinZoom=0.4`), phase-locked. Rubber band: flat boost (`flatBoost=0.10`) for all non-leaders when gap > `gapThreshold=0.003`; deactivates at OUTCOME phase. Lessons L109 (phase-locked zoom floor), L110 (flat boost vs. proportional formula).

15e. ✅ **Race Plan timing sweep** (master `9f6c0d9`, 2399 tests) — Two-phase sim sweep (Phase 1: 41 combos step 0.10, 10 races/track; Phase 2: top 3 × 100 races/track; seed=42; Dirt Oval/Luger Hill/Space Sprint). Winner: BTE=0.75, CS=0.55, CE=0.95. Zone success 52.4% → 64.5% (+12pp), stableOvt 9.95 → 13.20 (+33%). Decoupling corridorStart (0.55) from bonusTransitionEnd (0.75) gives the P-controller 12 extra seconds of OUTCOME phase. 4 timing sliders exposed in Dev Screen with amber warning banner. Reusable sweep script `scripts/sim-sweep.mjs`. Lesson L111.

15f. ✅ **New racer types + camera fixes + track cleanup** (master `d33c28d`, 2543 tests) — 7 new racer types: Beetle, Boarder, Koi, Turtle, Manta, Dolphin, Snowmobile (registry 13→20). New default tracks: Mountainstreet (6th), Ice Track (7th), River Run updated. Track ID cleanup + localStorage migrations v2/v3. OVERVIEW sprite-size normalization (L116). Adaptive ratchet stops at `min(minRacersVisible, activeCount)` (L117). Motorbike artifact fix (L115). Lessons L112–L117.

15g. ✅ **Closed track speed normalization + sea tracks + UI fixes** (master `066a0ed`, 2559 tests) — `closedSsf = pathLengthPx / 3200` applied to `race_baseSpeed`; Searound now races at comparable speed to standard closed tracks (L118). Seatrack (open, dolphin) and Searound (closed, manta) promoted as 8th and 9th default tracks; v5 migration; hash-ID duplicates deleted. `MinSpriteSizePreview` fixed for all mask-mode racer types. `black-sea` custom surface class removed. Sim: 7 new racer types + 4 new tracks wired.

15h. ✅ **Server ReadStream error listener** (master `d615ab7`, 2559 tests) — `createReadStream` without `.on('error', ...)` converts stream errors into uncaught process exceptions that kill the Node.js server. Added error listener with `!res.headersSent` guard; covers ENOENT, EISDIR, and Windows/Docker bind-mount race conditions. Lesson L119.

15i. ✅ **Sprite crop — tight-crop 12 spritesheets, restore displaySizes** (master `11093ff`, 2560 tests) — Audited all 20 racer types for bounding-box fill ratio. 8 types were adequate; 12 had excessive transparent padding and were cropped (horse, rocket, giraffe, snake, motorbike, luge, koi, snowmobile + associated masks). All displaySizes restored to values appropriate for cropped frame sizes. Lesson L120.

15j. ✅ **MAX_INVERSE_ZOOM 5.0 → 10.0** (master `ee9b664`, 2560 tests) — Raised ceiling for inverse (spriteScale-based) cam.zoom in `CameraDirector`. Closed tracks with worldW > ~3500px (e.g. worldW=6144 → rawZoom≈8.69) were previously capped to 5.0, rendering sprites at 57.5%. Headroom now extends to worldW≈12800. Note: Mountainstreet is `"closed": false` (open track) — fix only applies to future large closed tracks. Lesson L121.

✅ **bodyFillX/bodyFillY per racer type** — merged to master (2026-06-04, 2564 tests). Adds `bodyFillX` and `bodyFillY` to all 20 racer type configs for use in sim collision detection. Tests added in `racer-types.integration.test.js` and `sim-fairness.test.js`.

16. **Surface Zones** — follow-up phase after VRE. Track editor zone tool, `getZonesAtPosition()`.
17. **B-UX phase** — dev screen cleanup (B-UX2/B-UX3), help modal. Before D8.
18. **Backup/export** (B-5) — ~~UI exists, wiring missing~~ — **"wiring missing" IS FALSE, corrected
    2026-08-23 (BACKLOG-SORT-42):** `SystemSettings.jsx` calls `exportAllStorage` / `importAllStorage`
    / `exportDiagnosticSnapshot` and re-seeds defaults on reset. **A status echo; the live entry is
    B-5 under Phase B — edit only that one.** What is open there is end-to-end verification.
19. **D3.6** file reorganization (`racer-types/` → `racer-configs/`, 39 files)
20. **D8** — full racer config editor (after B-UX phase)
21. **Phase V** (verification sprint)
22. **Phase T** (tooltip retrofit — uses InfoTooltip from D3.5.5)
23. **Phase 5** VPS deployment — ⚠️ auth (JWT) first

---

## Physics — Open Issues

**verify (section-wide):** each needs a sim run to decide, and the item names it; no grep can substitute.


### P-1 — Longitudinal overlap during passing on open tracks _(backlogged 2026-06-05)_ — ⚠️ **ROOT-CAUSE PARTIALLY MOOT — RE-VERIFY (2026-07-14 audit)**

> **2026-07-14 audit note:** The stated root cause below leans on "rubber-band boost (+10%) exceeds
> the speed-brake reduction," but the rubber-band FORCE is now REMOVED (`raceRubberBand.js` deleted; no
> `flatBoost`/`gapThreshold` in source — only the pre-existing `draftingBoost` remains). Kept OPEN, not
> closed: the overlap phenomenon may still occur via drafting/threshold coupling, but the specific causal
> chain is no longer accurate. Needs a fresh top-down measurement to confirm whether the symptom
> persists without the rubber band. Flag for owner.

**Symptom:** In open-track races with ≥20 racers, planes and other racers visibly cross/stack during overtaking events. Visible in top-down view — not an illusion.

**Root cause:** `speedBrakeYThreshold` (= 0.18) and `avoidanceDistance` (= 0.18) are coupled to the same value. When two racers are more than 80.8 px apart laterally (`|dY| > 0.18`), neither the speed brake nor the avoidance force fires. Rubber-band boost (+10%) exceeds the speed-brake reduction (−5.5%), so trailers continue closing the gap and `dT → 0`. Free-lane separation pushes passing racers to adjacent lateral slots; at `dT = 0`, rendered longitudinal bodies (31.7 px at N=80 for plane) fully overlap. On screen at the camera zoom used mid-race (~2.8× OVERVIEW), this is ≈89 px of visible body overlap per passing pair. With 80 racers and brakeRate ≈93%, multiple such passes happen simultaneously.

**Pre-existing:** Exists on both master and current branch. Branch bodies are SMALLER than master (31.7 vs 35.1 px at N=80), so the branch is slightly better. The body-sizing rebuild (feat/closed-track-overview-normalization) did NOT introduce or worsen this.

**Fix direction:** Decouple `speedBrakeYThreshold` from `avoidanceDistance`. Add a longitudinal-separation mechanism that works at all `|dY|` values (not gated by the lateral threshold). This is a **PHYSICS** change.

**Impact on sims:** Targeted sweep only — specifically low/medium N on wide open tracks (e.g. Space Sprint × plane × N=9, 20, 40). The full 8-parameter sweep does NOT need to be re-run; the fairness metric (win rate distribution) is not affected by rendering or passing overlap.

**Reference:** `reports/closed-track-overview/15-topdown-overlap.md`

### P-3 — Speed-brake lateral: body-based same-lane filter on narrow tracks _(backlogged 2026-06-08)_

**Resolved in report 45:** Speed-brake lateral now uses `contactWidth × 1.0` (body-based same-lane filter). The ×1.5 attempt (report 43 revert) failed because the multiplier expanded the zone into adjacent rows for wide-body racers on narrow tracks (luge/250px: 22.5px→37.5px, caught all adjacent pairs).

**Remaining edge case:** For very narrow tracks or unusually wide bodies, `contactWidth × 1.0` can be slightly wider than the old normalized threshold (luge: 25px vs 22.5px old — 11% wider). Currently safe (luge p=0.585). A future fix would introduce density-awareness: cap the lateral threshold so it stays below the typical row spacing on the current track.

**Fix direction:** `min(contactWidth, effectiveWidth / racersPerRow × 0.9)` as the lateral threshold — this ensures the filter never catches ALL adjacent pairs regardless of body/track density ratio.

**Priority:** Low. Current ×1.0 solution is safe across all 10 tracks + 20 racer types.

---

### P-4 — getWidthAtT: non-uniform track width _(backlogged 2026-06-07)_

`getTrackWidthAtTpx` returns a single track-width value per racer (the stored `track.width` constant). For tracks with variable lane width (e.g. banked curves, chicanes), avoidance thresholds should scale with the local width at `racer.t`. Extension hook is documented in `raceBehavior.js`. Implement by querying `EditorShape._centerWidth(t)` or equivalent per frame.

**Priority:** Low. No existing track has variable width. Build only when the Track Editor gains variable-width curves.

---

### ✅ P-5 — Luger Hill hex track-ID rename _(completed commit 2410d78, 2026-06-08)_

Luger Hill's track ID was the hex UUID `90d3020197da`. Renamed to `luger-hill` in commit `2410d78` (`refactor(data): rename Luger Hill track id to slug (luger-hill)`): `90d3020197da.json` → `luger-hill.json`, `90d3020197da.png` → `luger-hill.png`, all script references updated. Live server confirms `"id": "luger-hill"` in the JSON.

---

### P-6 — Spatial grid for O(N) avoidance (D7d) _(backlogged)_

Current avoidance loop is O(N²) over all active pairs. At N=100 this is 4950 pair checks per frame. A spatial grid (cell size ≈ avoidance gate threshold) would reduce to O(N) average by only checking pairs in adjacent grid cells.

**Already planned as D7d** in the roadmap. Prerequisite for 100-racer races.

**Priority:** Medium. Required for D7d; no urgency at current N=40–60.

---

### P-2 — liteOverlapRate metric blind to longitudinal passing overlap _(backlogged 2026-06-05, partially resolved 2026-06-05)_

The sim's `liteOverlapRate` measures center-to-center proximity (threshold ~3.5 px lateral, ~3.9 px longitudinal). The physics never allows centers that close. Real visual overlap at `dT = 0` (31.7 px body) is invisible to the metric — it reported 0% while ~89 px on-screen overlap was occurring.

**Fix direction — status:**

1. ✅ **Longitudinal + lateral body-extent overlap metric** — `honestOverlapRate` added to sim: uses `effectiveDisplaySize × bodyFillX/Y` as thresholds, checks all active pairs every frame after 4 s warmup. Covers open AND closed tracks.
2. ✅ **Closed-track overlap coverage** — honest overlap now emits for both topologies (wrapping uses `tPos mod 1`, matching the browser's own normalization — see Lesson 127).
3. ⏳ **Dead-zone guard metric** `physSlot / trackWidth > avoidanceDistance` — not yet added to sim.

**Two distinct phenomena — do not conflate:**

- **(a) Same-lap pack crowding on short closed tracks** (5–8% honest overlap): many bodies on a short perimeter (path ≤ 3300 px). Measured directly: max spread is 0.2–0.55 laps, 100% same-lap events, 0% cross-lap. NOT caused by lapping — lapping does not occur in 60s homogeneous fields. Not a physics bug.

- **(b) Longitudinal rendered-body overlap during open-track overtaking** (P-1 bug): rubber-band overcomes speed brake, dT → 0 at crossing, ~31.7 px body overlap per pair on screen. Pre-existing physics issue, still open.

**Reference:** `reports/closed-track-overview/14-full-diagnosis.md` §Q8, `reports/closed-track-overview/15-topdown-overlap.md`, `reports/phase1-metrics/03-n50-lapping-confirmation.md`

---

## Known Limitations — Deliberately Accepted

**verify (section-wide):** no `verify:` line by construction — an accepted limitation is not a defect waiting for a check; it closes only when somebody decides it is no longer acceptable.

- **SEC-2 — Race state manipulation via React DevTools** _(audit-2026-04-29, Severity: High — accepted)_
  `g.current.racers` in RaceScreen lives as a mutable `useRef`. Technically proficient guests can use
  React DevTools / `__reactFiber$` to access racer objects and set fields like `t`, `baseSpeed`,
  `finished` directly. `Object.freeze()` only protects direct properties and is bypassable through DevTools.
  **Not fully fixable client-side.** Full protection requires server architecture with race replay or
  cryptographic signing (Phase 5).
  The other three security findings (SEC-1 r.t-clamp, SEC-3 sessionStorage validation,
  SEC-4 file size guard) were addressed in PR cleanup/security-and-crash-protection
  (audit report: docs/internal/audit-2026-04-29.md).

- **TEST-RaceScreen** — RaceScreen integration test for `isOpenTrack` propagation _(Priority: low)_
  Requires canvas + `requestAnimationFrame` mocking in jsdom. Currently no test infrastructure for the
  animation loop. Was tracked as TODO in `RaceScreen/index.jsx` and moved to backlog in cleanup PR 2/3
  (audit-2026-04-29.md).

- **DIAG-OpenTrackPan** — Open track pan verification after Phase 4 merge _(Priority: low)_
  Diagnosis session 2026-05-06: Space Sprint browser test showed BATTLE pan possibly outside
  the racer cluster. Unclear whether real bug in `openTrackCamera.js` / `openTrackPanTarget()` or
  browser state artifact (browser zoom was known as error source in the same session).
  CameraDirector's `cam.offsetX/Y` are irrelevant for open tracks — `st.camX/Y` via
  `openTrackPanTarget()` control the pan. Clarify with separate browser test after Phase 4 merge.

- **Snowmobile sprite improvement** — The current snowmobile spritesheet (`snowboard-ride.png`, downscaled to 192×192) is a generic snowboard-riding animation not specifically designed for a snowmobile racer. A dedicated snowmobile sprite with clearer vehicle silhouette and more distinct rider/chassis separation would improve tinting results and visual identity. _(Priority: low — cosmetic)_

- **Mountainstreet OVERVIEW inversion fix** — The Mountainstreet track is a steep downhill open course. The OVERVIEW camera shows the track with the finish line at the bottom of the canvas and the start at the top, which is counter-intuitive for a downhill track (should feel like racers are descending toward the viewer). Consider adding an `overviewFlip` or `baseRotationOffset` field to the track config that rotates the OVERVIEW camera 180°. _(Priority: low — cosmetic)_

- **Pan target identification** — Camera does not reliably show the race leader _(Priority: medium)_
  LEADER_ZOOM and BATTLE_ZOOM zoom onto the centroid of the top-N lead group (`focusRacers.slice(0, N)`).
  That is the t-value centroid — not necessarily the standings leader (position 1 by lap logic).
  In tight packs with multiple lap changes, the "geometric centroid" can diverge from "who is actually leading".
  Consequence: camera may not show the player viewers perceive as the leader.
  Mitigation: replace `focusRacers` with standings-sorted list; calculate centroid only within
  the top-N of the actual race order. Standalone PR after the camera phase.

---

## Parking Lot — Future / Unclear Scope

**verify (section-wide):** no `verify:` line: the scope is undecided, so there is nothing definite enough to test.

- Phase 5: server, leaderboard, Socket.IO (architecture planned, no code)

- i18n (English + German base) — app language is English, documentation can be both

- Multi-tenant isolation (per-organizer track sets and branding)

- Mobile / tablet responsive tuning

- Strecken-Wähler (track-picker diagnose tool) Phase 2 — optional extension of the completed Phase 1 (closed-track selection with per-track caps from finish math); scope undefined, non-mandatory

---

## 2026-07-10 — added (INFRA: sim-trust)

**verify (section-wide):** these are sim-trust follow-ups whose check is a parity or fingerprint run named in the item, not a text search.

- **FORCE-PARITY latent seams** (`archive/FORCE-PARITY.md`, O1–O6). **O1 is the sharpest:** the sim's
  `computeFinishT` hardcodes its own `runoutZone` while the browser reads `behaviorConfig.runoutZone` —
  identical at default, diverges if the owner ever changes it (open tracks only). O2 (`--rerollVariant=2`
  sim-only), O3 (lap-normalisation duplicated), O4 (browser-only run-out decay, no outcome impact),
  O5 (auxiliary sweep scripts omit the phase-split), O6 (shared-module parity conditional on geometry).

- **Repository hygiene** — needs a curation pass: **170 tags on origin, 180 local** (10 unpushed local
  tags; `git tag | wc -l` = 180, `git ls-remote --tags` = 170) and **6 remote branches**. Which tags are
  meaningful, and which branches are dead, is **UNVERIFIED** — keep it that way until whoever prunes
  proves each one; produce a KEEP-LIST of the live rollback anchors first. (Do not prune on any inherited
  count — they have not matched twice now.)

- ~~**Pre-existing start-row WIN bias on luger-hill and dirt-oval**~~ — ✅ **CLOSED 2026-08-24 by his
  decision D25** (PART TWO). It was recorded from `startRowUnfair = true` under v4-OFF. **Two things
  are now known that were not when it was written:** the watchdog that produced that flag **trips on
  the shipped world on 8 of 10 tracks** at the definitive N, so the flag carried no information about
  any arm; and the effect it was reaching for **has since been measured as a magnitude** rather than a
  detection — see D25 and the two reports it points at. **The general rule it leaves behind: a
  detection test that trips on the baseline has stopped being evidence about anything else.**

- **PHOTO_FINISH DevScreen accordion** — to be added.

- **Hero-count as a DevScreen range** — expose the 2–4 hero count as a tunable range.

### Re-apply --jobs parallelism cleanly (perf)

worker_threads parallelism for the sweep race loop (~5x speedup at jobs=8). Originally on
`diag/look-before-brake` commit `0c20f9b`, but a clean cherry-pick isn't possible — master's per-race
body diverged (3 extra observers: COMEBACK_ANALYSIS, HERO_MAP, GAP_METRICS), making it a ~1-2h manual
core-loop refactor with fingerprint + observer-parity gates. Deferred as nice-to-have (2026-07-19).
When re-applied: extract `runRaceForCombo`, split run/fold for all observers, add worker + pool, gate on
`--jobs=1` fingerprint parity AND serial-vs-parallel observer parity (hero-map /
gap-metrics / comeback). The `--jobs` parallelism work (`0c20f9b`) lives on branch
`diag/look-before-brake`, whose tip is **`c32cc61`**. **Plan (cleanup step 5, 2026-07-20):** the branch's
whole LBB-diag history is preserved at `c32cc61` via an archive tag `archive/diag-look-before-brake`, then
the branch itself is deleted — so re-apply the parallelism by cherry-picking from that tag, not from a live
branch.
**NOTE (2026-07-20):** since B2-Heroes shipped default `b2AttackHeroes=3`, `fingerprint-default.mjs`
(default config) now yields `72c3360fb75225ef`. The pre-feature `4ec8e64dd2641ad3` now requires
`b2AttackHeroes` at zero. Pin the parity gate to the current default hash (or run with count=0 for `4ec8e64`).

## 2026-07-31 — added (DOC-SYNC-2: long-term items, owner's hand)

**verify (section-wide):** **his own list, in his words.** No command decides any of them; they close when he says so.


These lived only in the planner's chat-side handoff and had no home in the repo. All are **UNSCHEDULED —
owner's hand**: parked here with enough context to be actionable months from now, none scheduled.

- ⏳ **Bundle code-split.** The production client bundle exceeds the 500 kB warning threshold (the vite build
  prints "Some chunks are larger than 500 kB after minification"; `dist/assets/index-*.js` ≈ 763 kB / 222 kB
  gzip). Split via dynamic `import()` / route-level code-splitting (or `build.rolldownOptions.output.codeSplitting`)
  so the first paint doesn't pull the whole app. Pure build/perf work, no behaviour change.

- ⏳ **Coarser fairness bands.** A product-level simplification the owner has raised: reduce the number of
  finishing-place bands so "reached your band" is a coarser, more forgiving promise. Would touch the band
  definition used by `computeZoneSuccessRate` / the draw and would re-baseline every fairness number — a
  deliberate product decision, not a tuning tweak. Owner to decide the band count before any work starts.

- ⏳ **The story layer (owner-cast narrative toolkit).** The banked owner-cast toolkit for authored race
  stories: the **multi-role rule** (a racer may hold several narrative roles across the race provided their
  windows are DISJOINT, smoothly welded, and resolve to ONE endpoint — no contradictory simultaneous roles);
  **comebacker** and **fallbacker** definitions (a racer authored to climb, or to slide, over a bounded window);
  and the **drawn-not-patterned** counts (how many of each role per race are DRAWN from a distribution, never a
  fixed recurring pattern the eye learns). Design-first; no mechanism until the owner fixes the definitions.

- ⏳ **CAMERA-GLIDE-PATH-1 — view-change detour.** A camera view change travels fast but takes a visible
  DETOUR rather than the direct line. Standing hypothesis: the pan is interpolated in **track space (T-lerp)**
  and so follows the curvature of the track, instead of on a straight **screen-space** line between the two
  view positions. Investigate by tracing the pan interpolation space; candidate fix is to lerp the screen-space
  target, not the track parameter. Owner-visible feel item.

- ⏳ **Camera block reset.** Parked camera item (block reset) from the camera saga handoff — needs the owner to
  restate the exact symptom before it is actionable; recorded here so it is not lost.

- ⏳ **Camera-weights design question — relative vs absolute weighting (deferred).** Whether the camera's
  subject-selection weights should be RELATIVE (ranked against the current field) or ABSOLUTE (fixed thresholds).
  A design question the owner deferred; no implementation until it is answered.

- ~~⏳ **Start-row gradient project — SHELVED WITH DOCUMENTATION, opens only on the owner's explicit
  word.**~~ — ✅ **CLOSED 2026-08-24 by his decision D25** (PART TWO): the start-row advantage is
  acceptable and nothing changes. **The reasoning below is kept because it states what was known when
  it was shelved**, and because D25 rests on newer evidence rather than replacing this. The
  original entry read: The
  definitive N=300 native pooled Holm found a small PRE-EXISTING start-row gradient on searound / luger-hill /
  seatrack (space-sprint clean); owner verdict 2026-07-31 = document and shelf. Canonical home: the
  [FAIRNESS.md start-row-gradient residual subsection](FAIRNESS.md) (evidence
  [HOLM-300-COMBINED.md](../reports/evolution/HOLM-300-COMBINED.md)). Candidate direction on record if it ever
  opens: **chaos traffic for the rear rows** (give the back rows more chaos-window mixing), which would aim to
  raise the bar to "silent even at N=300". Do NOT start without the owner's explicit word.

---

# PART TWO — CLOSED

**Nothing here is deleted** — that is the owner's decision of 2026-08-23 (D4 below). Every item
names what closed it and when, and any reasoning that states a general rule is kept, because the
rule outlives the item.

**Why keep it at all:** a struck claim with its cause is the only thing that stops the same
proposal arriving again in six months looking new.

## DECISIONS — the owner's, recorded so they stop being re-proposed

**Every entry carries its own date.** The section was headed *2026-08-23* until **D25 was added on
2026-08-24**; the date moved onto the entries, where it belongs, rather than the heading growing a
range.

**These are DECISIONS, not open items.** Each carries its date. Where an open item existed for the
same subject it has been closed and points here. **A decision recorded is a decision that does not
have to be made twice** — which is the whole reason this section exists rather than the items simply
being deleted.

---

### D1 · The track-width overshoot comments — a RIDE-ALONG, not a piece of its own · 2026-08-23

**The finding (CORRIDOR-DIAG-ARMED-1):** two comments say `getActualTrackWidth()` overshoots the
stored width *for open tracks*. Measured over all ten committed geometries, **it overshoots on every
one of them** — closed tracks by up to **12.8%**, open ones by 22.7–49.7%.

**His decision: the next change that touches either line corrects the comment. No piece is opened
for it.**

**The two sites, so it is findable from both:**

  - `client/src/screens/RaceScreen/index.jsx` — the comment above `trackWidthPx`
  - `scripts/sim-fairness.mjs` — the comment above `geometricTrackWidth`

**verify:** `git grep -n "overestimates for open" -- client/src scripts` — **this decision is
discharged when it returns nothing.** Until then the comments are simply imprecise, which is why
this is a ride-along and not a defect.

### D2 · `RaceScreen` is not testable — the finding STAYS, nothing is done · 2026-08-23

**His decision: keep the finding, do no work.** It is recorded so the next person who meets the wall
knows it is known and does not spend the evening rediscovering it. **No rewrite is implied and none
is proposed.**

The evidence is in PART ONE and is deliberately left there rather than moved here: the finding is
still true, so it is not closed — **what is closed is the question of whether to act on it.**

### D3 · `deploy.yml.disabled` gets no `permissions:` block · 2026-08-23

**His reasoning, recorded as his:** the file is disabled, so **no run can exercise an edit to it**,
and an unverifiable security change is false comfort. **It belongs to whoever re-enables it.**

CI-PERMISSIONS-1 had already left it alone for the same reason and put the question to him; this is
the answer. **The general rule it leaves behind:** a security control you cannot exercise is not a
control, it is a note — and a note is better written where the work will happen than in a file
nobody runs.

### D4 · The backlog MAY grow when it retires an item · 2026-08-23

**His decision: struck history is KEPT.** Striking a claim in place and recording what closed it
takes more lines than the claim did — `docs/BACKLOG.md` grew by 132 lines while retiring 16 items on
2026-08-22 — and that trade is accepted.

**This is the rule PART TWO of this file is built on.** Nothing is deleted from CLOSED.

### D5 · A Dev Screen change reaching a RUNNING race is NOT wanted · 2026-08-23

**Declined on 2026-08-22 and again on 2026-08-23.** Closed as a DECISION and not as a fix, so it
stops being re-proposed — it has been offered as "one line, the highest-leverage line in the file"
more than once, and it will read that way again to the next person who finds it.

**The related question is answered too: `npm run dev` should NOT refuse to start when the build
identity is unreadable — NO, for now.** The silent failure that question guarded against was
removed by BUILD-FROM-OUTSIDE-1: the identity is now reported by `/api/health`, and an unreadable
one says so with a reason rather than failing quietly.

### D6 · The fairness SPLIT will NOT be measured · 2026-08-23

**His reasoning, recorded as his: what matters is that the race is fair, not where the fairness
comes from — and the measurement costs hours for an answer he does not need.**

**A COMPLETE RUN OF THE REACHABLE HALF EXISTED, AND IT WAS DISCARDED ON HIS INSTRUCTION — recorded
here so nobody re-derives it by accident, thinking it was never taken.** Four arms (shipped and
`--bandBias=false`, on dirt-oval and river-run, seed 1, 100 races, 40 racers) ran overnight on
2026-08-23 and **all four completed successfully**: 184 MB across 13 files, finishing 04:59–09:23.
He cancelled the measurement, the output had no consumer, and it was deleted. **He reaffirmed the
decision afterwards: D6 stands.**

**It is REPRODUCIBLE, not lost work** — the run is seeded, so the same command yields the same
numbers if the question is ever reopened:
`node scripts/sim-fairness.mjs --races=100 --racers=40 --track=<id> --seed=1 [--bandBias=false]`.
**And note what that half could and could not have answered:** it isolates the biased DRAW only. The
regulator arm was never runnable, for the reason below.

**THE FINDING IS FILED SO IT IS NOT REDISCOVERED AS AN OPEN QUESTION.** It is not that the
measurement is hard; it is that **the regulator has no external switch**:

  - `DEFAULT_CONTROLLER_PARAMS` — carrying `gain`, `maxMult`, `minMult`, `bandStrictness` — is a
    **module constant in `client/src/modules/racePlanner.js`**, not a key in `defaults.js`.
  - `createRacePlan` accepts `config.controllerParams`, and **the only supplier of it in the whole
    tree is `client/src/modules/racePlanner.test.js`** — a unit test proving the hook works. No
    production caller, no harness, no CLI.
  - **`bandStrictness` is not the lever it looks like.** It changes what the regulator *aims at*
    (exact rank → band edge), not whether it runs: the multiplier is still `1 + gain·(error/nActive)`.
    **The lever that would neutralise it is `gain`.**

**WHAT IT WOULD TAKE, so the work is already scoped if it is ever needed:** one line in a harness
passing `controllerParams` through to `createRacePlan`. **That harness is `scripts/sim-fairness.mjs`,
which is inside the world fingerprint's declared reach** — so the change needs its own piece with
the fingerprint proved unmoved, which is exactly why it was not done inside a read-only measurement.

### D7 · `_lfEntryByState` is DOCUMENTED IN PLACE, not deleted · 2026-08-23

**His decision.** The reason is now written beside it in `client/src/modules/camera/CameraDirector.js`
and is repeated here because it is the kind of reason that gets lost:

**The reader is LIVE** (`_lerpFactorForState`), and the older transition grammar is **a shipped
CONFIG SWITCH** (`defaults.js`, `'glide'` shipped) **rather than removed code** — so deleting the map
would change behaviour the moment that switch is flipped. **It is consumed on zero frames of a
shipped race today**, and that is a fact about the shipped *value*, not about the code being dead.

### D8 · `reports/perf` — superseded by PERF-CLEAR-1 · 2026-08-23

**The rule as it was actually applied:** a write-up that cannot be reproduced is kept only if it
names a source state that RESOLVES TODAY *and* the thing it measured still exists. Raw chains older
than two weeks go regardless.

**Applied:** ten of eleven write-ups deleted, one kept, **and no raw chain deleted** — every raw file
turned out to be two weeks old or younger. See **[../reports/perf/DELETED.md](../reports/perf/DELETED.md)**
for the file-by-file record and `reports/evolution/PERF-CLEAR-1.md` for the classification.

### D9 · The server suite failing twice at different tests is a WATCH, not a defect · 2026-08-23

**No work.** It failed twice on 2026-08-23 at *different* tests (`sessionInvalidation`, then
`recoverAdmin`), both 5-second timeouts in bcrypt-heavy auth tests, while background sim processes
were competing for the cores. It did not reproduce: both files pass in isolation, master passed the
full suite clean under the same load, and the suite then passed twice with the change in place.

**verify:** none, and that is stated rather than papered over — **a flake that did not reproduce
cannot be checked by a command.** It closes when it happens a third time and is diagnosed, or when
nobody has seen it for long enough to stop caring.

### D10 · The action dial's MAPPING is decided by MEASUREMENT, not at the desk · 2026-08-23

**His decision: the question stays OPEN, and it stops being his to answer unaided.** The HOW MUCH
ACTION section's question 1 — _what does one dial map onto_ — was written as a design question and
was therefore stuck: the candidate keys plainly overlap (`gapReroll*` and the pulk rotation close
gaps by different means), and no amount of reading `defaults.js` settles which of them a host would
actually feel.

**So the next step is a measurement, not a proposal.** Which candidate keys move visible action at
all, by how much, and where two of them do the same job, is a question an existing harness can
answer. The dial cannot be designed before that table exists, and it is not designed here.

**The measurement is `reports/night/ACTION-KEYS-1.md`** (2026-08-23, read-only:
no default moved, no key wired, no mapping proposed). Question 1 is re-stated in place as _waiting
on the table_ rather than as _waiting on him_.

### D11 · The action dial is BOUND BY THE FAIRNESS GATE — the gate does not become a function of the dial · 2026-08-23

**This answers HOW MUCH ACTION question 3, which the section itself called the one that most needed
answering before anything is built.** The section put two options side by side — bound the dial by
the gate, or make the gate a function of the dial. **He took the first.**

**The rule, in the form a later block must apply it: EACH OF THE THREE STAGES MUST PASS THE FAIRNESS
GATE ON ITS OWN, OR THAT STAGE DOES NOT SHIP.** Not the dial as a whole, not the middle stage as a
proxy for the other two — each stage, its own gate run, its own verdict. A stage that cannot pass is
dropped or re-mapped; the gate is not moved to accommodate it.

**Why this is consistent with the stage decision already on record.** Question 2 was answered on
2026-07-06 with _three stages, quiet / medium / wild_, and its stated reason was exactly this: a
STAGE can be measured against the gate one stage at a time. That reason only pays off if the gate is
the thing the stages are measured AGAINST. A gate parameterised by the dial would have made the
2026-07-06 decision pointless — three gate runs, each against a different bar, is one gate run's
worth of evidence spread over three verdicts.

**What it does NOT decide:** what the stages map onto (D10), or what the gate's thresholds are.
Those live in [FAIRNESS.md](FAIRNESS.md) and are unchanged by this.

### D12 · The chosen action stage is STORED WITH THE RACE, like the seed · 2026-08-23

**This answers the first half of HOW MUCH ACTION question 4.** A race records which stage it ran, in
the race payload, beside the seed — so a replay is unambiguous and a saved result can say what it
was a result OF.

**Why it is the seed's shape and not a global setting.** A setting read at replay time answers "what
is the dial on now", which is a question about the machine rather than about the race. The project
has already paid for that distinction once: a stored camera config silently beats `defaults.js` per
key, forever, so "the default says X" and "this race ran X" are different claims. A value carried by
the race cannot drift away from the race.

**What it does NOT decide:** what happens to the FINGERPRINTS when the dial moves — the second half
of question 4, which stays open and is a ship-ceremony question, not a storage one.

### D13 · The proposed owner eye-test session is SUPERSEDED — and EVERY ACCEPTANCE IS A SAMPLE · 2026-08-23

**The session is not scheduled, and it is not deferred either — it is replaced by a standing
principle**, because the thing the session was meant to buy (coverage) is not buyable that way.

**HIS PRINCIPLE, in his terms: EVERY ACCEPTANCE IS A SAMPLE. A verdict covers the track, the state
AND THE SEED it was given on. The same track with another seed can look entirely different.** So a
pass is evidence about one draw from a distribution, and a session of ten more races would produce
ten more samples rather than a covered surface.

**It is a caveat on every "owner-approved" claim in this repository, and it is written where blocks
are bound**: [VERIFY-RULES.md R5a](VERIFY-RULES.md). Everywhere else points there.

**AND THE "THREE OF TEN TRACKS" FRAMING IS RETIRED, because it was never a record of what he
watched.** It came from a documentation COUNT taken on 2026-08-05 — the tracks that happened to be
named in write-ups — not from any log of races he sat through. Counting mentions and reporting the
result as coverage is the same error in a smaller frame: it reads as a measurement and is an
artefact of who wrote what down. **No replacement number is offered**, because the honest one is not
known and a made-up one would be worse than none.

### D14 · COMEBACK is defined by the owner: STORMING FROM FAR BACK TO THE FRONT · 2026-08-23

**His definition, and it is now the requirement:** a comeback is a racer **storming from far back to
the front**. A racer climbing slowly from progress ~0.28 is **not** a comeback — it is a racer
moving up, which is a different and much more common thing.

**What this closes.** The Race-Action Arc item _"camera timing levers — the comeback shot appears
late (tune the two sliders by eye)"_ is REPLACED, not scheduled. Its whole proposal was to show the
authored climb EARLIER by lowering `outcomePhaseThreshold` and re-weighting `comebackWeight`.
Against this definition that proposal shows **the wrong thing sooner**: the slow climb from ~0.28 is
not the event the shot is for, so making it visible earlier buys nothing and costs the front battle
the weight contest was protecting.

**THE OPEN POINT THIS LEAVES — established at source 2026-08-23 and re-verified before it was
written here. Nothing is proposed and nothing is built; whether to act on it is his, and it needs
his eye afterwards.**

The generator authors each hero with a ROLE **and BEATS** — `anchor`, `peak`, `resolve`
(`client/src/modules/heroCurveGenerator.js`, `buildCameraPlan`). The **full** `cameraPlan` IS
delivered to the director: `client/src/screens/RaceScreen/index.jsx:1002` calls
`CameraDirector.setCameraPlan(cp)` once the heroes are cast mid-race. But
`client/src/modules/camera/comebackDetector.js` (`setPlan`) reads **only** `role === 'comebacker'`
and keeps the indices — **the beats are discarded on arrival.**

**So the camera still has to INFER from rank history what the plan already states.** The detector
holds a rolling rank window and reports the best current climber that passes its gates
(`comebackDetector.js`, `recordRanks`) — which is a reconstruction of timing information that was
handed to it and dropped. **And the `resolve` beat — the storm the owner is describing — never
reaches the camera at all.** The authored beat that says _this racer arrives at the front, here_ is
the one signal the definition above is about, and it is the one that is thrown away.

**verify:** `git grep -n "beats" -- client/src/modules/camera` — **still open while it returns only
the two JSDoc `@param` lines** (in `CameraDirector.js` and `comebackDetector.js`) and no code that
reads them. That is today's output. The day a camera file reads a beat, this point is answered.

### D15 · The company guarantee on a SPREAD field — his 5 STANDS, unchanged · 2026-08-23

**Re-affirmed, no change.** `minRacersVisible` keeps the value his eye settled on until the
spread-field case is measured across field sizes and he has seen the result. The recommendation to
raise 5 → 15 came from a pack-case measurement only (n = 65, where the guarantee binds ~0%), and his
observation corrects it: on a spread field it clearly binds and widens a lot at 5.

**The open item is unchanged and stays open** — see _Camera residuals after CAMERA-COMPANY-ONLY-3_.
What is decided is that **nobody changes the value first and measures afterwards.**

### D16 · The PULK→OUTCOME speed step is ACCEPTED AS DESIGN — E3 is closed · 2026-08-23

**His decision: intended dramaturgy.** Racers are genuinely faster in OUTCOME than in PULK — the
pack's `trajectoryMult` is pinned to 1.0 in PULK and the P-controller returns at the boundary — and
that step is **wanted**, not a seam to smooth.

**Documented as design in the living document that owns the mechanism**:
[RACE-ACTION.md](RACE-ACTION.md) § _Phase discipline — how forces fade_. This backlog does not
restate it.

**E3 is now closed in both halves.** The `rowBonus`/`rowEnvMult` half shipped on 2026-07-19
(`v-rowenv-default-on-complete`) and was already out of scope for re-opening; the `trajectoryMult`
half — the only remaining open question — is this decision. **Do not re-open either half.**

### D17 · OUTCOME climb-capacity — drama-at-leader vs deep-band reach: CLOSED BY THE OWNER · 2026-08-23

**Closed. The backlog's "deferred pending owner decision" was the wrong status and is corrected.**
The investigation stands as evidence — two fixes measured and rejected, the faller-undershoot
diagnosis, the endpoint-determined finding — and **the open LEVER it proposed is not ordered.**
Nobody is to build OUTCOME servo runway or extra `trajectoryMult` authority for B3–B5 on the
strength of that item.

**What survives it, because it is a general finding rather than a work item:** band-reach is
ENDPOINT-determined (the servo steers to the Fisher-Yates target over
[`choreoOutcomeStart` → finish]), so a mid-race checkpoint reshapes the curve and not the
destination; and the distributed smoothers are load-bearing for servo accuracy (Lesson 177). Both
are kept in PART TWO for exactly the reason PART TWO exists.

### D18 · 100-racer performance (`D7d`) is an OBSERVATION, not a work item · 2026-08-23

**His decision, and it rests on his own use: he runs 100-racer races routinely and has seen nothing
wrong.** So the three unbuilt mechanisms the item lists — spatial grid for O(N) avoidance, a smarter
pack-overview camera, LOD — are **not ordered**, and no direction is given on them.

**If it ever bites, it shows as STUTTER, and then it is a MEASUREMENT question** — not a design
question, and not this item. Nobody is to build a mechanism against a performance problem nobody has
observed.

**A NAMING COLLISION, stated so it is not mistaken for a cross-reference:** the backlog item is
called **`D7d`** (a Phase-D sub-item) and has nothing to do with **decision D7** above.

### D19 · ADOPTED — the juxtaposition rule for reports, in its NARROW form · 2026-08-23

**Adopted as a standing rule on every future block.** Written into the canonical document that binds
blocks — [VERIFY-RULES.md R16](VERIFY-RULES.md) — and not restated here.

**The narrow form is the whole point, and the wide one is explicitly rejected:** _"every number
carries its identity"_ is ceremony, because most figures sit under a shared header that already
covers them. The rule adopted is **two numbers placed side by side must come from the same run or
carry their provenance visibly** — the hazard lives in comparison, not in isolation.

### D20 · ADOPTED — a block that re-mints a fingerprint names invariants that must NOT move · 2026-08-23

**Adopted as a standing rule on every future block.** Written into
[VERIFY-RULES.md R17](VERIFY-RULES.md) and not restated here.

**The failure it closes, which is the reason it is a rule and not advice:** a fingerprint EXPECTED to
move stops guarding what moved with it. FINISH-MOTION-1 caught a 108 px regression in the resting
frame **by accident**, while measuring something else — the camera fingerprint had moved as intended,
so the regression would have read as intended too.

### D21 · Audit gate — DEV dependencies REPORT, they do not BLOCK · 2026-08-23

**His decision, and his reason: a dev dependency never runs in front of a viewer.** So a fresh
upstream advisory against a build- or test-only package must not stop CI. The split he chose:
**hard-fail on runtime dependencies, report-only on dev ones.**

**The question is closed; the BUILD is not ordered here** and is not bundled into a documentation
piece. What it needs is small and is already half-present: `scripts/audit-gate.mjs` **already
computes reachability** — it runs `npm audit --omit=dev` alongside the full audit and annotates every
blocking line `PRODUCTION` / `dev-only` / `reachability UNKNOWN` — but the PASS/FAIL policy does not
read that annotation yet. **`reachability UNKNOWN` must not be treated as dev-only**; the gate
already refuses to claim "dev-only" without having looked, and the split must inherit that.

**AND THE OTHER HALF OF THAT ITEM WAS ALREADY CLOSED, so nothing is left open for it.** The gap the
item named — **`server/` is audited by nothing** — was closed by SERVER-AUDIT-1 and re-confirmed at
source 2026-08-23: `scripts/audit-gate.mjs` takes `--tree=`, `.github/workflows/ci.yml` runs it with
`--tree=server` on every push and pull request, and `audit-schedule.yml` runs **both** trees daily
with `--report-only`. See PART TWO, _Before the VPS migration_, where that line is already struck.

### D22 · The `body-parser` LOW advisory — RECORDED, no action, revisit at the next version bump · 2026-08-23

**No work.** GHSA-v422-hmwv-36x6 in `server/` sits below the `high` gate, so CI is unaffected and the
gate prints it as an advisory line. It is a **runtime** dependency, which is why it was never bundled
into a lockfile chore commit — and it stays that way. **It is revisited when `server/` is next bumped
for another reason**, not on its own schedule.

### D23 · The seed for a normal race — BUILD IT, and make it OUTLIVE THE SESSION · 2026-08-23

**His decision on both halves of the browser-seed follow-up, taken together because they are one
thing.** The normal "Start Race" path hardcodes `racePlanSeed: 0`, so **no race he watches is
reproducible — including the ones he judges**. That is decided against: a normal race draws a seed,
the same way Quick Test already does, and the seed survives the browser being closed.

**Adopt the Quick-Test model rather than inventing a second one** — same semantics, same code
(`client/src/screens/SetupScreen/quickTestSeed.js`): an empty field draws a fresh seed per race, a
typed value fixes the race, seed 0 stays the legacy unseeded value and is not reachable from the
field.

**Built on `feat/race-seed`, and NOT MERGED — it waits for his eye.** See
`reports/night/SEED-REAL-RACE-1.md`.

### D24 · Merge ROADMAP into BACKLOG — APPROVED as work, and deliberately NOT done here · 2026-08-23

**Approved.** The intended landing is unchanged from what DOC-ORDER-1 recorded: **BACKLOG owns
both**, with ROADMAP reduced to a phase-status table.

**It is not done in the same piece that edits BACKLOG**, and that is the conservative choice rather
than a delay: a real merge is a careful pass over two large files with a high chance of silently
dropping an item, and doing it inside a block that is also rewriting a dozen entries in the target
file would make it impossible to tell a dropped item from an edited one. It gets its own piece.

---

### D25 · The start-row advantage is ACCEPTABLE — the row bonus, the row gap and the row count all stay · 2026-08-24

**His decision: the start-row advantage as it stands is acceptable. NOTHING IS CHANGED** — not the row
speed bonus, not the row gap, not the row count. **This is a decision, not a fix**, and it closes the
start-row fairness line.

**The evidence is in two reports and is NOT restated here:**
[ROW-ADVANTAGE-1](../reports/evolution/ROW-ADVANTAGE-1.md) (the size, per row and per track) and
[ROW-BONUS-TIMING-1](../reports/evolution/ROW-BONUS-TIMING-1.md) (the timing, and the two candidate
shapes). **What is recorded here is what a later reader needs in order not to reopen this blind.**

**THE COMPENSATION IS EXACT, BY DERIVATION RATHER THAN BY MEASUREMENT.** The row deficit and the row
bonus both scale with the row number, so the row number cancels: **the catch-up point is the finish
line, on every track, for every rear row, and there is no leftover uplift.** It is algebra over the
shipped configuration, not a result that a larger sample could move.

**AND THE RACES AGREE WITH THE DERIVATION.** Finishing time is **flat across start rows on 9 of 10
tracks**, which is precisely what exact compensation requires.

**`luger-hill` IS THE SINGLE EXCEPTION, AND ITS SIGN IS THE OPPOSITE OF THE WORRY.** It carries **nine
start rows against the usual four**, and its deviation is **UNDER-compensation** — so on that track the
**front** rows are slightly favoured, not the back. **Anyone reopening this on the assumption that the
rear rows are advantaged should read that sentence first.**

**OPEN BUT NOT PURSUED — one question is genuinely unsettled, and the owner accepted the current state
rather than spend on it.** Whether the position-within-band tilt is a real row advantage or a
**selection effect** is not established. It appears **only in the one measure conditioned on band
arrival**; the two unconditioned measures show nothing outside luger-hill. **Settling it needs an
unconditioned position measure and NO races** — it is cheap, and it is not being done because the
decision above makes the answer non-actionable, not because it is hard. **If this line ever reopens,
that is the first thing to run.**

**AVAILABLE IF IT IS EVER NEEDED — recorded as a fact, proposing nothing.** The start-row deficit has
exactly one reachable lever. The row **COUNT** follows from track width and sprite size and is **not
freely choosable**. The row **GAP** is sprite size × `rowGapMultiplier`
(`client/src/modules/storage/defaults.js`, the `DEFAULT_ROW_LAYOUT_CONFIG` block) — and that
multiplier **is a set value**, so it is **the one place the size of the deficit can be reached from**.
*(The value is deliberately not quoted here: `defaults.js` owns it, and this file states no config
values.)*

**CARRIED FORWARD AS CLOSED — the two shapes he asked about, so neither is proposed again:**

- **The SWITCH-OFF is a no-op.** "Switch it off once its purpose is served" resolves to the finish
  line, because that is where the catch-up happens. **There is nothing left to switch off**, and any
  earlier cut-off is not a switch-off but an under-compensation.
- **The FADE halves the compensation** unless it is re-sized to start higher — and the re-sized
  variant **breaches the ±20% naturalness envelope on luger-hill**, the nine-row track, which is
  exactly where it would breach first if anywhere.

---


### D26 · The config badge's "2 race" on WILD is CORRECT and is NOT being reworded · 2026-08-24

**His decision: leave it. Nothing is proposed here and nothing is built.**

**THE FRICTION, in one sentence.** The config badge counts KEYS that are off default, while the Race
Action stage is ONE host decision that sets TWO keys — so a `wild` race honestly reads `2 race`, and
the owner, who made one choice, reads it as two.

**IT IS NOT A DEFECT, and that was established at source rather than assumed.**
[ACTION-BADGE-1](../reports/evolution/ACTION-BADGE-1.md) answered three questions with file:line
evidence:

- **The badge compares the config the RACE WAS HANDED, not the stored blob.** `RaceScreen/index.jsx`
  builds the badge's world with the race's stage, and `exportRaceConfig.js` applies the stage inside
  it — the badge and the race come from one gather. **So the two deviating keys are the STAGE'S OWN
  VALUES, not a hand-set slider that leaked.** The count would be exactly two on a completely
  untouched install with the stage on `wild`.
- **The stage wins on BOTH start paths**, and they converge on ONE application line, so they cannot
  disagree. **No leak was found on either.**
- **The count is right; only the WORDING misleads** — the pill says how MANY keys are off default,
  never WHICH, and never that the stage caused them. The key names are already computed and carried,
  and simply never displayed.

**WHY IT IS NOT BEING REWORDED — his reason, and it is about the surface's future rather than about
the wording.** These HUD diagnostics are **test tooling**. They are eventually going behind the dev
toggle, together with the Quick Test bar, and will not be on screen during a presented race at all.
**Improving a display that is on its way out is not worth the work.**

**THIS COUNTS AS HANDLED WHEN THAT MOVE HAPPENS.** Whoever hides them does not need to reword
anything first, and should not treat this as an open item blocking the move.

**THE MOVE ITSELF HAS NO ENTRY ANYWHERE IN THIS TREE — searched, not assumed** (`docs/` returns
nothing for the Quick Test bar going behind a dev toggle). So this decision is filed here rather
than beside it, and it names the surfaces so that whoever does the move lands on it:

- the in-race pill column — `client/src/screens/RaceScreen/renderRaceFrame.js`, `drawHudPills`, the
  `cfg` row among them
- the Quick Test bar — `client/src/screens/SetupScreen/SetupScreen.jsx`

**WHAT WOULD REOPEN IT.** Only one thing: the diagnostics staying on screen for a presented race
after all. The reason to leave the wording alone is that nobody outside development will read it;
if that stops being true, the reason stops holding and the wording question comes back — with the
key names already available to whoever picks it up.

## Owner eye-test coverage (2026-08-05, from CAMERA-DOC-CLOSE-1) — CLOSED 2026-08-23 by D13

**verify (section-wide):** none possible — **this is his time.** No command can report whether he has watched a race.

- [x] ~~**PROPOSED OWNER SESSION — his time, not scheduled here.**~~ **SUPERSEDED, NOT SCHEDULED —
      see PART TWO D13.** The session was one race per unseen track (dirt-oval, garden-path,
      ice-track, luger-hill, river-run, seatrack, space-sprint) plus one pass watching COMEBACK_ZOOM
      and LEAD_CHANGE, and it is replaced by a standing principle rather than booked:
      **every acceptance is a sample** ([VERIFY-RULES.md R5a](VERIFY-RULES.md)). Ten more races
      would have produced ten more samples, not a covered surface.
      **AND THE THREE-OF-TEN-TRACKS FRAMING IS RETIRED WITH IT.** It came from a documentation
      COUNT on 2026-08-05 — the tracks that happened to be named in write-ups — not from any record
      of what he watched. **No replacement number is offered**; the honest one is not known.
      The sentence the item was built around SURVIVES, because it is the principle in miniature:
      every "owner-approved" claim in the repo is evidence about the track and state it was given
      on, and nothing more — and now, explicitly, about the SEED as well.
      Reference: [CAMERA_DIRECTOR.md §8.3](CAMERA_DIRECTOR.md) (was §7.3 until ONE-TRUTH-2 renumbered a duplicated section 7).


## Documentation (2026-08-07, from DOC-ORDER-1)

- [x] ~~**Authentication and authorization — DESIGN EXISTS, nothing is built.**~~ **NEVER TRUE as
      written today — established at source 2026-08-23.** `server/src/auth/` holds `authRouter.js`,
      `csrf.js`, `guards.js`, `paths.js` and their tests, and **37 commits** touch that directory
      from `d0a57d44` onward. **The POINTER below is why this line is kept**, and it is the useful
      part: the full v3.2 design
      (route inventory, session model, CSRF posture, the E2E test prerequisites) is
      [archive/AUTH.md](archive/AUTH.md). It was moved to the archive on 2026-08-07 because it
      described a RaceArena that does not exist while sitting among the documents that describe the
      one that does — **archived is not abandoned**: if auth is built, that document is the starting
      point and this line is how you find it. Related: **Q-16** below (the CORS wildcard, deliberately
      accepted for local-only operation) becomes binding the moment this is built.

## The owner's camera-defaults session (2026-08-06, from MERGE-AND-GUARD-1)

- [x] **CLOSED 2026-08-22 by `46736d81`** — the shipped default is 5 (`defaults.js:883`) and
      `git ls-remote --heads origin | grep -c min-racers-visible` returns 0, so the branch is gone from
      the origin. **~~FIRST ITEM — `minRacersVisible` is already done and waiting.~~** The reasoning below
      is kept because it states a general rule about branches that outlive their decision. Branch
      **`feat/min-racers-visible-5`** (`c57e37d4`) sets the shipped default to the value his own
      recorded verdict names — his words on 2026-08-05, _"`minRacersVisible` stays at 5"_, against a
      source that said 3 ([CAMERA_DIRECTOR.md §8.1](CAMERA_DIRECTOR.md)). It is **committed,
      measured, NOT minted and NOT merged**, deliberately.
      **What it costs, and why it belongs in the sitting rather than alone:** it moves **TWO**
      fingerprints, not one — the camera one AND the **render** one, because
      `scripts/render-fingerprint.mjs` builds a real `CameraDirector`, so any change to the shot
      changes the draw-call transform on every sampled frame. **Any camera-default change has this
      property**, which is the whole argument for batching them: one re-mint of two fingerprints and
      one eye test can cover every knob he changes that day, where doing them one at a time pays the
      ceremony over and over.
      Already measured on that branch: the world fingerprint does NOT move, and the full client
      suite passes unchanged. What is still owed is the mint, and his eye on the state the knob
      governs (the company guarantee, in both the torn-apart and tight-pack regimes he named).

## Dev Screen labels (2026-08-05, from FINISH-COMPANY-1)

- [x] ~~**The two finish knobs read alike and govern different moments.**~~ **CLOSED by
      `82a03eb7` (ENDING-HOLD-1, 2026-08-12) — confirmed at source 2026-08-23**, not taken from the
      report that claimed it: both controls are now numbered by ending phase in
      `CameraAdvancedSection.jsx` (`:1491` and `:1635`), and the two labels this item quoted exist
      nowhere in the tree. **The rule it stated stands and is why the line is kept:** two controls
      governing different moments must not be able to read as one control at a glance — a tooltip
      that explains the difference is not a substitute for a label that shows it.

## Instrument coverage residuals (2026-08-05, from FINISH-MOTION-1)

- [x] ~~**A FINGERPRINT EXPECTED TO MOVE STOPS GUARDING WHAT MOVED WITH IT** — proposed convention:
      any block that re-mints names one or two specific invariants that must NOT move, and measures
      them.~~ **ADOPTED 2026-08-23 — PART TWO D20.** It is now a standing rule with a home:
      [VERIFY-RULES.md R17](VERIFY-RULES.md). **The evidence it was built on is kept because it is
      the reason the rule exists:** FINISH-MOTION-1 caught a 108 px regression in the RESTING frame
      only by accident, while measuring something else — the camera fingerprint moved, as intended,
      so the regression would have been read as intended too.
      *(It was RE-SORTED out of "small and self-contained" on 2026-08-23 on the grounds that a
      standing obligation on every future block is his call rather than a night's tidying. That
      re-sort was right, and the decision came the same day.)*

- [x] ~~**THE RENDER FINGERPRINT CANNOT SEE THE FINISH PHASE.**~~ **CLOSED by `b9579f59`
      (FINISH-WINDOW-1 A) — confirmed at source 2026-08-23:** `render-fingerprint.mjs` now drives
      **5600** frames and samples **sixteen** points running past 5450, ten of them beyond the old
      ceiling, so the 3466–5218 finish window this item named is covered. **The rule it stated
      stands:** an instrument that cannot reach a phase did not clear that phase — it was silent
      about it, and silence is not a pass. The fix
      needs a DECISION, not a patch: a second sample set that runs past the finish, or one
      event-anchored sample ("the frame after FINISH_OVERVIEW begins") — which the harness's own
      header argues against on reproducibility grounds ("fixed indices, never events").

## Build-identity residuals (2026-08-05, from BUILD-UNKNOWN-1)

- [x] **DONE — the build badge's failure path carries its reason.** `git()` captured stderr and the
      exit status instead of discarding both; every failure returns the unknown identity WITH a
      one-line cause; the dev server prints the identity it will serve at start-up and warns when the
      reason changes. Also fixed two things the tests found: a failing `status --porcelain` used to
      be reported as `dirty: false` (a clean tree it had never looked at), and the `|| 'detached'`
      fallback was dead because git prints the literal `HEAD`.

## Measurement and guard residuals (2026-08-05)

- [x] ~~**The juxtaposition rule for reports.**~~ **ADOPTED 2026-08-23 — PART TWO D19**, in the
      NARROW form the item argued for, and it now lives in [VERIFY-RULES.md R16](VERIFY-RULES.md).
      **The argument is kept because it is what makes the rule narrow:** not "every number carries
      its identity", which is ceremony — most figures sit under a shared header that already covers
      them. **The hazard lives in COMPARISON, not in isolation:** a number alone can be wrong, but it
      cannot mislead by comparison. In practice a table gets one identity line above it, and a table
      mixing arms gets an identity column. NIGHT-1 needed the second and did not have it, which is
      the instance this came from.
      *(RE-SORTED out of bucket (i) on 2026-08-23 — BACKLOG-HONEST-1 STEP E had called it "a
      convention, no code", which was wrong about the axis that matters. A rule is not small because
      it is short.)*

- [x] **DONE (ONE-DRIVER-1) — four measurement scripts now share one driver, and the race identity
      is printed.** `scripts/lib/raceDriver.mjs`; `corridor-truth`, `edge-crossing`, `tracking-lag`
      and `his-shot-truth` ported with all seven captured outputs reproducing exactly and all three
      fingerprints bit-identical. The deliverable turned out to be the IDENTITY, not the
      deduplication: the four were never meant to be identical (`his-shot-truth` runs the owner's
      n=65 context), and the defect was that nothing said so where the numbers are read.

- [x] **DONE — `check-index` now passes BOTH directions** (verified 2026-08-22 by
      OPEN-ITEMS-2026-08-22 against the source, not the report). `scripts/check-index.mjs:18` states
      it, and its run line reports dangling links as well as unindexed reports. The text below is
      kept because its REASONING — a partial guard is indistinguishable from a complete one while
      everything is clean — is the general rule, and it is why the fix was worth making.
      ~~It walks `reports/evolution/*.md` and asserts each is referenced from `INDEX.md`; an INDEX
      line naming a report that does not exist is invisible to it.~~ Same shape as the `check-tags` gap closed in TAG-GUARD-2/3, and the same corollary
      applies: **until it is closed, the guard should say inside itself which direction it does not
      check** — a partial guard is indistinguishable from a complete one while everything is clean
      (Lesson 201). Note `check-doc-links` already catches a _dangling link_, so the uncovered case is
      an INDEX entry that names a report in prose, or links a path that resolves to something else.

---

## Camera residuals after CAMERA-COMPANY-ONLY-3 (2026-08-05)

- [x] ~~**`MAX_CAM_ZOOM` is the real limiter at the tight end of the control.**~~ **CLOSED
      2026-08-23 — the fact is now written on the constant itself** (`camera/projection.js`), which
      is where anyone tuning the low end will meet it, rather than in a backlog nobody reads while
      editing. **The value is not restated here; read it there.**
      **AND THE ITEM'S OWN NUMBER DID NOT REPRODUCE.** It said "every track delivers 85.3 world px
      rather than the nominal 75". Re-measured, the answer is **track-dependent**: at 0.25 corridors
      the cap binds on searound, dirt-oval and city-circuit and does NOT bind on river-run or
      space-sprint. **That is a more useful fact than the one recorded** — the same setting means
      different things on different tracks at the tight end, which is the exact class of problem
      CAMERA-ZOOM-UNIT-1 raised this constant to remove, reappearing below the range that block
      checked. The 85.3 figure was not chased; what is written is what was re-measured.
      **verify:** `grep -c "BUT IT DOES BIND" client/src/modules/camera/projection.js` — **still
      closed while it returns 1.**

---

## Before the VPS migration

- [x] ~~**`server/` is audited by nothing.**~~ **CLOSED — confirmed at source 2026-08-23:**
      `ci.yml:212` runs `audit-gate.mjs --tree=server`, the `Server tests` job (`ci.yml:151`) runs
      the server suite, and the HIGH advisories below are closed (`ci.yml:205-207`, lockfile-only
      moves) with the gate now BLOCKING rather than reporting. **The historical text is kept
      unedited below** because it records what was true when it was written. ORIGINAL:
      **`server/` is audited by nothing.** `scripts/audit-gate.mjs` hard-codes `client/`, and no CI
      job covers the server at all — its own `vitest` suite runs nowhere either. It currently carries
      **2 highs**: `ip-address` (**runtime**, via `express-rate-limit`, SSRF / trust-boundary bypass
      in IP classification — and the production config enables trust-proxy, so the IP it classifies
      comes from a header) and `postcss` (dev-only, via `vite`). Both clear with a plain
      `npm audit fix` — no `--force`, no breaking change. Not urgent while nothing is reachable; a
      **blocker** before anything is.

- [x] ~~**The build cannot be read from OUTSIDE the browser.**~~ **CLOSED 2026-08-23
      (BUILD-FROM-OUTSIDE-1): `/api/health` now names the build.** `server/src/buildIdentity.js`
      reads `RA_BUILD_COMMIT` / `RA_BUILD_BRANCH` / `RA_BUILD_DIRTY` and the endpoint reports them.
      **IT NEVER GUESSES, and that rule is borrowed rather than invented** — with nothing supplied it
      answers `unknown` **and a reason naming the variable**, and `dirty` is OMITTED when it was not
      determined rather than defaulting to `false`. That is the correction
      `client/vite-plugin-ra-build.js` already paid for: its first version reported a clean tree it
      had not been able to look at. **Shelling out to `git` was deliberately NOT done** — it would
      work in development and quietly report the deploy host's checkout, or nothing, in production.
      **verify:** `curl -s localhost:4000/api/health` — **still closed while the payload carries a
      `build` object**; `grep -c "build: buildIdentity()" server/src/app.js` is the offline form.

      **THE ITEM WAS WRONG ABOUT ITS OWN OTHER HALF, and that is worth keeping.** As written it said
      the app ships no build identifier at all. **It does, and it always did on the client**: the
      build PILL is drawn into the shipped race picture — `renderRaceFrame.js:500` calls
      `formatBuildLabel(buildBadge)` from `modules/buildInfo.js`, fed by the `virtual:ra-build`
      module. **The real gap was never "no identifier", it was "no identifier reachable from
      outside the browser"**, which is the half now closed. `__APP_VERSION__` and `BUILD_ID` still
      do not exist and are not needed: the endpoint reports the identity directly.

      **The general rule this closes with:** an instrument that answers a question INSIDE the
      product does not answer it for anyone holding a URL, and the two are different requirements
      that read as one.

---

## Gap-reroll — SHIPPED DEFAULT ON (July 2026)

- ✅ **Gap-reroll is the shipped default: symmetric, G=0.5, strength=1.0** (`storage/defaults.js`
  `gapRerollEnabled: true`). Closes the "gap-reroll default ON" item.
  **FLIPPED 2026-07-26** to the confirmed candidate G=0.5/s=1.0 after the ten-track confirm gate (was
  0.75/0.5, retuned 2026-07-23 from the original ship values G=1.5/s=1.0). Confirm gate: pooled band-reach
  71.8%→72.7%, dead finales 14.1%→10.0%, runaway 10.1%→6.8%, every guardrail better, Holm unchanged 3/10 —
  see [reports/parity/GS-CONFIRM-GATE.md](../reports/parity/GS-CONFIRM-GATE.md).

- ✅ **Retune gate (2026-07-23): G 1.5→0.75, strength 1.0→0.5.** Cause: at s=1.0 the correction
  `frac = min(1, strength·(gap−G))` saturates above `G+1`, so **46% of leader corrections were full
  slams to the band floor** — the "escapes, then gets visibly braked" the owner reported. G alone
  cannot fix it (lowering G lowers the saturation point too; measured: corrections got _harder_).
  Gate: 400 races/arm, 4 tracks, paired seeds, 40 closed / 60 open fields —
  **pooled band-reach 71.6% vs 71.6% (fairness exactly neutral), Holm 2/4 in both arms**;
  **tiltSaturated 46.0%→18.7%**, tilt frac median 0.906→0.371, escapeDepth median 2.71→1.97 L and
  **worst case 12.07→7.29 L (−40%)**, front-group-at-line 3.86→4.05, runaway 9.5%→8.3%,
  parade 1.3%→0.8%, duo 6.3%→4.0%, dead finales 14.7%→14.5%.
  Duration sanity (30/120/300 s): candidate ≥ current on band-reach at every duration.
  _(At 30 s both arms sit at ~66% band-reach — a pre-existing short-race limitation, not caused by
  this change.)_ Evidence: `reports/greenfield/gate-retune/`, driver `scripts/exp-gate-retune.mjs`
  — both now on **master** (ported in the greenfield wrap, 2026-07-23). _(These retune-gate figures are
  PRE-UNIFICATION and retained only as the 2026-07-23 decision record; the current baseline is
  [reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md) + GS-CONFIRM-GATE.md.)_

- ✅ **Owner browser eye-check PASSED**; shipped at `247b843`, tagged `backup/g-retune-shipped-247b843`.

## Measurement infrastructure — next up (from the independent reviews, 2026-07-23)

- ✅ **DONE (CAMERA-HYGIENE-1) — the engine-input module list, beside `WORLD_CONFIG_KEYS`.** Shipped as
  `ENGINE_INPUT_MODULES` in `raceConfigWorld.js` with `client/src/modules/engineInputs.test.js`, which
  reads `raceCore.js`'s own imports and fails when it names a module the list does not — so adding an
  engine input forces a decision instead of a silence. Original entry:

- ✅ **DONE — HUD config-fingerprint badge** (shipped `42500f4d`, "replay UX + rowCount unification",
  behaviour-neutral). `configFingerprintBadge()` in `client/src/modules/exportRaceConfig.js` is rendered in
  the race HUD (`client/src/screens/RaceScreen/index.jsx`, under the seed badge). It shows a short
  RACE-relevant world hash plus a SPLIT off-default count: `raceCount` — the number of off-default keys that
  actually break apples-to-apples with a default-config sim run, shown in the prominent **RED** state — and a
  never-red `cosmeticCount` for camera / frame-timing drift. This is exactly the "make config drift visible
  without anyone having to suspect it first" item: the owner-config parity audit
  (`reports/greenfield/owner-config/`) found a persisted setting silently cancelling a shipped benefit, caught
  only because someone diffed the world; the badge surfaces that class of drift live.

## Front Act / C1 — July 2026

- ✅ **Gap-reroll branch-priority fix** — when both `gapBehind > G` and `gapAhead > G` the LARGER
  imbalance now decides the tilt direction (ties keep the old gapBehind-first behaviour). The old
  unconditional `gapBehind` return braked racers that had broken from the pack while still behind the
  leader — the chase-suppression the small-G diagnostic measured at 6.6x. Regression tests pin both
  the fixed case and the unchanged ones. **Consequence:** the confirmed `G=1.5 s=1.0` gap-reroll
  numbers predate the fix and need re-measuring before they are quoted again.

- ✅ **`contestWindowStart`** — the front act's own config key, read by the front-battle observer.
  Initialised to the shipped `choreoResolveB2` so committed baselines stay comparable. **Kept**
  through the dead-mechanisms cleanup: the observer is live, so the key stays.

## Race-Action Arc (feat/race-action) — June 2026

- **Re-Gate on `9cfa953`** ✅ **CLOSED — SUPERSEDED (owner-approved 2026-07-31).** It would have re-run all four closed tracks under a `corridorEnd=1.0` / `bonusMult=2.0` browser-faithful config — but that configuration **predates the plan-grid unification AND the speed-150 re-baseline**, so the world it would have gated no longer exists. Four full gates have since run over the successor worlds: the speed-150 [REBASELINE](../reports/parity/REBASELINE.md), the gap-reroll ten-track confirm gate, the COMBO15 N=100 gate ([FAIR-ARRIVAL-GATE](../reports/evolution/FAIR-ARRIVAL-GATE.md)), and the definitive N=300 [HOLM-300-COMBINED](../reports/evolution/HOLM-300-COMBINED.md). **Superseded, not abandoned** — the fairness question it raised has been answered on the worlds that actually shipped, at higher power (N=300) than it asked for. (Historical: `9cfa953` is an ancestor of master; it discarded the provisional `8f57cba`-era sweeps.)

- **Master-merge** of `feat/race-action` → `master` — ✅ **DONE (confirmed 2026-07-14)** — merged to `master` by fast-forward at `e1d5a2b`, anchored by tags `race-action-complete` and `v1-race-action-merged`; `feat/race-action` deleted (local + remote); the repo is now master-only. Later cleanup (e2e retirement, doc refresh, planning-audit) continued on `master` past the merge point.

- **B4 — camera foresight (consume the authored cameraPlan)** ✅ **DONE (`b4-complete` = master `03e28cf`, 2026-07-15)** — the authored `cameraPlan` is now plumbed generator → `racePlanner` (`_cameraPlan` + `getCameraPlan`) → `RaceScreen` (`setCameraPlan`, delivered mid-race: heroes are cast mid-race, so the plan is null at init) → `CameraDirector` (`updateRacePlan(b1Indices, cameraPlan)` + storage). **First consumer:** in `_detectComebackRacer` the cast comebacker set (heroes with `role: 'comebacker'`) is the PRIMARY candidate; the `b1Indices` scan stays the FALLBACK when the plan names no comebacker (assigned winner already up front ⇒ cast `sovereign-lead`) or no plan exists. **Why:** the old scan searched ALL front-band finishers, which include the sovereign-leads — one that dips and recovers reads as a large gain and could win the scan, so the camera cut to a "comeback" that was noise. Only WHO is watched changed; the reality bar (window, min-gain, start-gap, current-rank, largest-real-gain tiebreak) is untouched. **Evidence:** comeback-reality sweep (200 races / 367 comebackers, seed=1) — the cast comebacker is the top climber in 94–100% of races and lands within ~0.45 ranks of its authored target. Tooling: `scripts/sim/observers/comeback-reality.mjs` + `--comeback-reality` (needs `--hero-map`), see docs/SIM.md; full numbers in `results/comeback-reality-sweep-2026-07-14/report.md` (gitignored). Owner eye-test PASS. **NOT shipped (tried, measured, removed):** a foresight PRE-ARM + `cameraForesight` flag + DevScreen toggle — the Owner eye-test (ON vs OFF, same seed) showed no visible difference, so it was trimmed out (branch history `7c50605`, `be71a26`, `bccc171`).

- **B2-attacker "Attack & Fall" heroes — front-action feature** ✅ **SHIPPED ON (`v-b2-heroes-complete` = master `8bf54ca`, 2026-07-20)** — extra choreographed heroes cast from FRONT-post-chaos B2-finishers (`heroCurveGenerator.js castHeroes` + `attackerTiming`, bypasses the 0.80 B2 resolve for role `attacker-b2`) that climb to ~rank 5 mid-race then fall back and free-reorder in B2 (**band-arrival** release: the servo frees them the moment they re-enter B2 on the way down — `racePlanner.js` `atkParams` branch). **Shipped ON: `b2AttackHeroes=3`, `b2AttackPeakRank=5`, `b2AttackFinalRank=7`, `b2AttackBandArrival=true`** — the sim-validated winner: **+21% top-5 OUTCOME action** vs the no-attacker floor, with **B1/B2 band-reach ≥70% on all four tracks** and **Holm at the pre-existing 2/4 baseline** (no regression). count=0 restores the pre-feature game byte-identical. **New shipped-default fingerprint `72c3360fb75225ef`** (count=3); count=0 is still `4ec8e64dd2641ad3`. **3-phase validation** (exploration N=50 → count-confirm N=100 → hybrid N=100): finalRank (release height) is the action knob, NOT peak depth; count scales super-additively (1→+7%, 2→+10%, 3→+21%); band-arrival ties fixed-final on fairness and is simpler (no finalRank pinning). Web: DevScreen B2-count slider (PULK card) + hero-highlight rings (Camera Advanced). Tooling: `scripts/exp-b2-attack.mjs` (`--phase 1a/1b/holm3/2/fr/ba/uba`); reports in `exp-b2-attack-results/PHASE{1A,1B,2}-REPORT.md`. Owner eye-test PASS. Tests 3203/3203. _(Cleanup 2026-07-20: the `exp-b2-attack.mjs` driver was removed from tracking — recoverable at commit `c441e7c~1` (git history) — and the result tables were archived to `reports/exp-archive/exp-b2-attack-results/`. Investigation CLOSED; findings preserved.)_

- **sim-fairness.mjs telemetry comment cleanup** — ✅ **DONE (2026-07-14 audit)** — the `passThroughCount` declaration comment now reads "sim-only telemetry" (scripts/sim-fairness.mjs:772); the stale "NOT committed to the feature branch" clause is gone.

- **Dead scaffold + N-mismatch bundle** (sim-fairness.mjs) — ✅ **DONE (2026-07-14 audit)** — `trackClosedSsf` no longer exists in scripts/sim-fairness.mjs (removed); `trackNaturalBase` is now `isOpen ? … : undefined` (open-only, line ~2644); and the `expectedMinSF` derivation uses the per-combo `nRacers` (line ~566), not the global `N_RACERS`.

- **Browser `index.jsx` inert `??` fallback mismatches** — ✅ **DONE (2026-07-14 audit)** — the fallback now reads `bonusStrengthMultiplier: dynamicsConfig.racePlanBonusStrengthMultiplier ?? 2.0` (RaceScreen/index.jsx:697), matching the real shared default; an added comment mandates the fallbacks mirror `DEFAULT_RACE_DYNAMICS_CONFIG`. (Old line refs ~662-666 have drifted.)

- **Race-action direction decision** — ✅ **RESOLVED (SUPERSEDED twice)** — first resolved by the governor vision-pivot (race-action director, not Slipstream-vs-Hazard-Zones); that reactive director was then itself removed in THE GREAT PULK CLEANUP. The current shipped direction is choreo + PulkLeadRotation. Decision closed either way. See ROADMAP §R.7.

- **`results/` not gitignored** (hygiene, reported by Sim-1) — ✅ **DONE (2026-07-14 audit)** — `results/` IS gitignored (`.gitignore:37`).

- **Doc-sync (governor pivot)** ✅ — this task; core docs synced to HEAD `b930b1b` (ARCHITECTURE, FORCE-MAP — then named KRAEFTE-LANDKARTE, ROADMAP, BACKLOG, LESSONS, SIM, README).

---

## Hot — next PR

- ✅ **Bug A** (Garden Path P1): OVERVIEW pan is a no-op — **fixed** `overviewClosedTrackZoom=1.3` multiplier, schema v15, DevScreen slider. (2026-05-27, squash `749c2a4`)

- ✅ **Bug B** (River Run P2): zoom inversion on large open tracks — **fixed** action camera for open tracks with 1.5× base zoom. (2026-05-04, PR #73 `2d79678`)

- ✅ **Bug C** (River Run P3): `openTrackPanTarget` uses all racers instead of focus group — **fixed** top-3 focus group. (2026-05-04, PR #73 `80dcb8d`)

**Q-25 root cause identified and solution decided:**

- ✅ PR-A1: Q-25 fix (maxScale=10) + duration slider + finishT for open tracks (2026-05-03)

- ✅ PR-A2-Diagnose: read-only PR → `archive/SPEED_REFACTOR_ANALYSIS.md` (no code change) (2026-05-03)

- ✅ PR-A2: Speed pipeline architecture refactor — `computeRaceBaseSpeed`, speedScaleFactor removed, closed-track duration slider (Model D), SpeedScaleSection removed (2026-05-03). **Fix commit 2026-05-04:** speedMultiplier normalization + spreadMinFactor (E1+E2).

- ✅ PR-A2.5: Arc-length-uniform spline resampling + relative jitter (2026-05-04)

- ✅ PR-A2.6: Race dynamics — spreadFactor re-roll (±85%, 5s transition) + speedBonusMult separation (2026-05-04). draftingBoost unchanged 1.10.

- ✅ PR-A3: Dev panel reorganization (tier system, Race Tuning section, raceDynamicsConfig). (2026-05-04)

- ✅ **Phase 4 (Timing Tunables + Plan-B Pan):** 7 timing tunables, battleMaxDurationMs, OVERVIEW jitter, diagnosis HUD, `_computePanScale` removed, trivial pan formula. (2026-05-06) — Branch: `diagnosis/camera-tuning-effectiveness`

- ✅ PR-B: Camera bug fixes (Bug A+B+C) — PR #73 `feat/pr-b-camera-reform` + PR #74 `fix/pr-b-closed-track-regression` (2026-05-04)

- ✅ PR-C: RaceScreen split (Q-7 refactor, no behavior change) — `e180a6b` chore/hygiene (2026-05-25)

- ✅ PR-D: Camera state machine (OVERVIEW random jitter, tension-strength logic, findBattleCandidate) — OVERVIEW jitter `d6f4d20` Phase 4 (2026-05-06) + direction system/findBattleCandidate `07bea7b` Phase 3B (2026-05-22)

- ✅ PR-E: Sprite corridor [min+max] + tag visibility iter 1 (B-UX1) + dev panel sliders — `SpriteSizeRangeSection` + `NameTagVisibilitySection` in Phase 4 `d6f4d20` (2026-05-06). `tagVisibleMaxCount` tunable live.

- ✅ PR-F: Dev panel camera tunables + HUD overlay — Phase 4 `d6f4d20` (7 timing tunables + battleMaxDurationMs + OVERVIEW cooldown sliders) + 3 HUD components in Phase 3B `07bea7b`

- ✅ Server boot migration: 5 default tracks created as server records (idempotent via one-shot marker `.tlh1-defaults-migrated`)

- ✅ PUT `/api/tracks/:id`: `geometryId` taken from client if present in body; otherwise `existing.geometryId` kept

- ✅ DELETE + `removeCachedTrackData`: geometry is NEVER automatically deleted — only background cache

- ✅ Auto-backup: on every PUT/POST to `server/data/tracks-backups/YYYY-MM-DD/HH-MM-SS-mmm-<id>.json`

- ✅ atomicWriteJson OneDrive fallback: renameSync error → direct writeFileSync

- ✅ 10 new backend tests (geometryId ×3, backup ×3, default seed ×4), 1 new client unit test

**TLH-2 — UI Flow + Cleanup (Sub-PR 2) ✅**

- ✅ Edit modal: geometry dropdown replaced with status display ("Geometry: drawn (XX pts)" / "Geometry: not yet drawn" + "Draw/Edit Geometry" button)

- ✅ Track editor: two-mode — load mode (`?load=<id>`) shows "Editing: X" without name input, new mode shows "New Track" with name input

- ✅ Track editor load path: two-path load — (1) geometry cache, (2) direct server track state for `geometryId: null` tracks

- ✅ Track editor save path: load mode → PUT with geometryId generation on first draw; new mode → POST

- ✅ 17 new unit tests (12 TrackEditor.loadmode.test.jsx + 5 net TrackManager.test.jsx)

**TLH-2 Post-Merge Bug Fixes (branch extension after browser test)**

- ✅ F2: `hasGeo` read `innerPoints.length` (always 0 due to `toSummary` strip) → now `geometryId != null` + `pointCount` via extended `toSummary`

- ✅ F4: track editor opened scrolled to canvas (no scroll reset on navigation) → `window.scrollTo(0,0)` on mount + `scrollIntoView` on `serverError`

- ✅ F1-revised: save in load mode was blocked when no background → background only required in new mode; load mode always saveable

- ✅ Lesson 39 + 40 documented in LESSONS.md

- ✅ F2 follow-up: `autoMaxRacers` in `handleEdit` used `isServer ? track` as EditorShape input → crash (TypeError: `undefined.length`) because `toSummary` strips `innerPoints`. Fix: always use geometry cache instead of server summary. L39 extended with audit pattern.

**Track Delete Safeguards (PR #58) ✅**

- ✅ "Remove background" button in track editor (next to background upload, appears when image is loaded)

- ✅ `DELETE /api/tracks/:id/background` endpoint — removes only the image, leaves track record intact

- ✅ `DELETE /api/tracks/:id` returns 403 for default tracks (`isDefault: true`) — prevents accidental deletion

- ✅ `migrateDefaultTracks()` runs on every boot (idempotent) — restores missing default records

- ✅ React key=null fix in TrackManager geometry select

- ✅ Background image useEffect race condition fix (L43) — cancelled flag prevents stale onerror callbacks

**TLH-3 — Code Fallback + Status Banner + Export (Sub-PR 3) ⏳ deferred until after Camera Phase**

- ✅ Dirt Oval

- ✅ River Run

- ✅ Space Sprint

- ✅ Garden Path

- ✅ City Circuit

Additionally: Space (Custom Track) already present.

## Ready — spec exists, concept decided

- ✅ **Random-seed draw for Quick-Test** — done 2026-07-22. Empty field = random-but-replayable; the
  drawn seed is shown in the HUD and can be typed back to reproduce the race exactly.

## Planned — needs spec

- ✅ **D7a** — Proportional sprite scaling + min-size floor + zoom ratios + label scaling (PR #33, master `a49baa0`)

- ✅ **D7a-Plus** — Per-type minTargetScreenPx with live preview (PR #35, master `27cba65`)

- ✅ **D7b** — Lane-free: physicalY replaces lane system (PR #37)

- ✅ **D7c** — Row start + speed bonus + track capacity (PR #39)

- **B-UX1** — ~~Name tag readability (iteration 1, to be implemented in PR-E of the camera
  phase)~~ **SUPERSEDED by the LABEL arc** — `nameTagLayout.js` ships with an occlusion test, and
  `reports/evolution/INDEX.md` carries LABEL-OVERLAP-3, LABEL-NAMES-2 and LABEL-OVERLAP-FIX-1 among
  others. **The SUBJECT is live and its defects are real; this line's framing is not** — the PR-E of
  a camera phase it names has long since closed. Follow the arc, not this line.
  - Spec in `docs/CAMERA_DIRECTOR.md §6.3`
  - Top-N tags visible (N = `tagVisibleCount`, default = lead group = clamp(round(N×0.1), 3, 10))
  - `tagVisibleCount` as dev panel slider
  - No "own player" (project principle 3) — all racers treated equally
  - All other racers without tag

- **B-UX1-Iter2** — ~~Name tags state-dependent strategy (iteration 2, after iteration 1)~~
  **SUPERSEDED by the same arc.** `labelNamesWhenRoom` and the PHOTO_FINISH `exemptAll` path are
  exactly a state-dependent strategy, and both carry measured numbers in the CORRECTIONS block of
  `reports/evolution/INDEX.md`.
  - Spec in `docs/CAMERA_DIRECTOR.md §6.4`
  - OVERVIEW: top-3 only or no tags; LEADER_ZOOM: lead group prominent;
    BATTLE_ZOOM: involved racers prominent; zoom out: anti-overlap when space permits
  - User explicitly wants to implement this once iteration 1 is stable
  - Priority: after PR-E (camera phase)

- **B-4** ✅ ~~Apply branding profiles to race/result screen (UI exists, wiring missing)~~ —
  **DONE, confirmed at source 2026-08-23:** `RaceScreen/index.jsx` and `ResultScreen/index.jsx` both
  resolve the active brand via `resolveActiveBrandProfile`, and the race screen additionally draws
  `BrandLogoOverlay.jsx` and `CeremonyBrandCard.jsx`. **See V-4 below**, which recorded the opposite
  and was wrong.

- ✅ **RaceScreen/index.jsx split** (Q-7) — Done (chore/hygiene-i18n-audit → master squash `e180a6b`, 2026-05-25). Extracted `drawing/` modules: `overlayRendering.js`, `particleRendering.js`, `racerRendering.js`, `priorityModeOverlay.js`, `battleDiagRendering.js`. Camera modules: `CameraDirectorDiag.js`, `cameraTimingComputation.js`.

- ✅ **TrackEditor.jsx split** (Q-6) — Done (chore/hygiene-i18n-audit → master squash `e180a6b`, 2026-05-25). Extracted: `TrackEditorToolbar.jsx` (224 lines), `TrackEditorSaveBar.jsx` (116 lines), `useViewport.js` (138 lines), `useTrackIO.js` (206 lines).

- ✅ **Q-6** — TrackEditor.jsx split refactor. Done 2026-05-25 (chore/hygiene-i18n-audit, squash `e180a6b`).

- ✅ **Q-7** — RaceScreen/index.jsx split refactor. Done 2026-05-25 (chore/hygiene-i18n-audit, squash `e180a6b`).

- **Q-26** ✅ ~~Default tracks without backgrounds (fresh install)~~ — **DONE, confirmed at
  source 2026-08-23:** all ten seed geometries carry `backgroundImageFile` and all ten image files
  exist in `server/seeds/backgrounds/`.
  **verify:** compare `ls server/seeds/backgrounds/*.jpg | wc -l` against
  `ls server/seeds/tracks/*.json | wc -l` — **still closed while they are equal.**

  Code defaults in `defaults.js` have no `backgroundImage` field. With a running server they are
  automatically migrated to the backend (`migrateDefaultTracks()` runs idempotently on every boot) and
  user-edited server versions fully replace them (`getInitialTracks()` filters out code defaults
  when the server delivers the same ID).

  **Problem only occurs when:** fresh install or deleted server state. Then the user sees
  code defaults without backgrounds. In normal operation (server started at least once) the user
  sees exclusively server tracks with backgrounds. Verified in PR-A2.8 diagnosis.

  **Newly understood as a special case:** The more general problem is background caching for offline play
  (all tracks, not just defaults). Separate planning and solution alternatives there — see
  **"Background cache for offline play"** below.

- **Q-11** ✅ ~~`reader.onerror` missing in `handleBgUpload` (TrackEditor.jsx)~~ — **DONE
  2026-08-23, and this line was STRUCK WRONGLY EARLIER THE SAME NIGHT — the correction is kept
  because it is the more useful record.** BACKLOG-HONEST-1 struck it as already done on the evidence
  that `TrackEditor.jsx` held one `new FileReader` and **two** `onerror` handlers. **It did: both
  were on `img`, neither on the reader.** Counting `onerror` without checking WHOSE it was is the
  whole mistake, and a grep that answers the wrong question answers it confidently.
  **Actually closed by the same block's later piece**, which wired `reader.onerror` in all three
  sites — this one, `SystemSettings.jsx` and `BrandingProfiles.jsx` — each reporting through the
  error channel its own file already had, with `client/src/screens/DevScreen/sections/fileReadFailure.test.jsx`
  guarding them.
  **verify:** for each of those three files, `grep -c "new FileReader"` and `grep -c "reader\.onerror"`
  — **still closed while they are EQUAL.** Comparing against a bare `onerror` count is what went
  wrong the first time.
  FileReader errors are silently swallowed; only `img.onerror` catches load errors.
  Defensive hygiene, low priority.

- **Q-16** ✅ ~~CORS wildcard on all backend endpoints~~ — **NEVER TRUE as written today,
  established at source 2026-08-23.** `server/src/auth/csrf.js:26` builds `corsOptions` from an
  explicit allow-list and **denies** when the list is empty; `app.js:31-36` then stacks
  `csrfOriginGuard`, `requireAuth` and `requireAdmin` above every route. No `origin: '*'` and no
  bare `cors()` exist in the tree.
  **verify:** `git grep -n "origin: '\*'\|cors()" -- 'server/src/**'` — **still closed while it
  returns nothing**; the pattern can match, it is ordinary Express.
  `app.use(cors())` without origin restriction — any browser tab can access all API write endpoints
  (POST/PUT/DELETE tracks + surface classes). Deliberately accepted for local operation.
  Fix: `cors({ origin: 'http://localhost:5173' })` for dev, env var for VPS.
  **Priority: VPS phase / Phase 5.** Not an acute blocker for single-user local operation.
  _(Deep audit 2026-05-01, Severity: HIGH — accepted for local-only)_

- **Q-17** ✅ ~~Missing `reader.onerror` handlers in SystemSettings.jsx and TrackEditor.jsx~~ —
  **DONE 2026-08-23. It was worse than it said and is now closed in full.** Not two sites but
  **THREE**: `SystemSettings.jsx`, `TrackEditor.jsx`, and **`BrandingProfiles.jsx`, which this item
  never named**. All three created a `FileReader`, wired `onload`, and wired no `onerror` — so a
  failed read settled nothing at all: no message, no state change, indistinguishable from a broken
  button.
  **The general rule this closes with, and it is why the line is kept:** an upload has TWO failure
  modes, and they are not the same failure. A file that cannot be READ never reaches the decoder; a
  file that reads and cannot be DECODED is a different message. TrackEditor reported only the second
  for as long as this item was open. See **Q-11** above for the mis-strike that happened on the way.
  `FileReader.onload` handlers are without `onerror` counterpart. Errors when reading (corrupt file,
  permission problem) are silently ignored. Q-11 is specific to TrackEditor background images;
  Q-17 extends to SystemSettings JSON import. Low priority — no data loss, just poor
  UX (no error message on import error).
  _(Deep audit 2026-05-01, Severity: LOW)_

- ✅ **Q-19** — TrackEditor.effects.test.jsx flaky — **fixed PR #55 (2026-05-01)**
  Root cause: `fetch` stub from `trackLoader.test.js` leaked into TrackEditor worker via missing
  `vi.unstubAllGlobals()` in `beforeEach`. Fix: `vi.unstubAllGlobals()` added in `beforeEach`.
  _(Discovered PR #50, fixed PR #55)_

- ✅ **Q-25** — Open track too fast / race duration too short (PR-A1)
  Root cause (canvas hypothesis empirically disproved): `DEFAULT_SPEED_SCALE_CONFIG.maxScale=4.0` in
  `defaults.js` capped Space Sprint at 4.0 instead of the physically correct ssf=9.886. Space Sprint
  ran at 323 px/s instead of ~131 px/s and lasted ~58s instead of ~144s.
  Fix: `maxScale=10.0` + duration slider for open tracks + `openTrackFinishT` integration in RaceScreen.
  Canvas coordinate system hypothesis disproved — Space Sprint geometry uses world coordinates 256..5707,
  not canvas-bound. _(Fixed in PR-A1, 2026-05-03)_

- ✅ **Q-15** — Visual system architectural debt — structurally addressed by D7a (PR #33).
  4 multiplicative scaling factors reduced to one pipeline (computeRenderDisplayScale).
  cameraZoomFactor + REFERENCE_CAMERA_ZOOM eliminated. Closed/open track math pipelines unified
  through consistent effZoom-based calculation.

- **Q-28** ✅ ~~Shared HTTP helper for API services~~ — **DONE, established at source
  2026-08-23:** `client/src/services/apiClient.js` exports `apiCall` and **all seven** API services
  import it. **The general rule this closes with:** a negative from the wrong NAME is not a
  negative — the first search for this looked for `apiFetch`/`httpClient` and found nothing while
  the helper sat there under a third name.
  **verify:** `git grep -c "fetch(" -- 'client/src/services/*.js'` — **still closed while exactly
  one file answers** (`apiClient.js`); a second file means a service has gone around it. _(Post-Phase-4 audit 2026-05-06, Severity: MEDIUM)_
  `client/src/services/surfaceClassApi.js` and `client/src/services/trackApi.js` share 48 lines of
  identical `apiCall`/`withTimeout` infrastructure — both services copied the same HTTP wrapper.
  Fix: extract shared helper (e.g. `services/apiUtils.js`), update both callers.
  Estimated effort: ~1h.

- **Q-30** — ~~React 18 → 19 **+ react-router-dom 6 → 7**~~ **HALF DONE: the ROUTER migration
  shipped.** `client/package.json` already declares react-router-dom 7 (read the version there, not
  here). React and react-dom are still on 18, so **this item survives as the React half only**.
  **verify:** `grep -n '"react"' client/package.json` — **still open while it reads `^18`.** _(Post-Phase-4 audit 2026-05-06, Severity: MEDIUM)_
  Current: `react@18.3.1`, `react-dom@18.3.1`, `react-router-dom@6.30.3`. Latest: `react@19.2.6`,
  `react-router-dom@7.15.0`. Both have breaking API changes — no npm-audit vulnerability, but the
  version gap grows with each feature phase. Recommended: migrate before Phase 6 (Pan-Refactor) to
  avoid accumulating migration debt. Estimated effort: 1–2 days (route definitions + React API).

- **Q-31** — Long files — updated watch list after chore/hygiene-i18n-audit (2026-05-25, squash `e180a6b`). Q-6 and Q-7 resolved ✅.
  - ✅ `TrackEditor/TrackEditor.jsx`: split → `TrackEditorToolbar.jsx` (224), `TrackEditorSaveBar.jsx` (116), `useViewport.js` (138), `useTrackIO.js` (206) (Q-6 done)
  - ✅ `RaceScreen/index.jsx`: drawing modules extracted to `drawing/` (5 modules) + `camera/` (2 modules) (Q-7 done)
  - ✅ `DevScreen/sections/RaceTuningSection.jsx`: 1269 → **44 lines** (thin coordinator); logic split into `BehaviorTuningSection.jsx` (610), `DynamicsTuningSection.jsx` (607), `SubCard.jsx` (41)
  - `SetupScreen/SetupScreen.jsx`: **~809 lines** — watch list (no split yet)
  - `DevScreen/sections/TrackManager.jsx`: **~727 lines** — watch list, Q-8

### Phase V (Verification Sprint)

Systematic testing of still-unverified areas.

**FOUR OF THESE ARE NOT INDEPENDENT WORK** (marked below): V-1, V-2, V-4 and V-5 are the
VERIFICATION of B-1, B-2, B-4 and B-5, and listing both as open counts one task twice. V-3 was
answered by the config. **V-6 to V-9 are genuinely independent** — they verify areas no B- item
covers.

- **V-4** ✅ ~~Branding profiles B-4 (per old ROADMAP done, reality check says open)~~ —
  **CLOSED WITH B-4 above, and the parenthetical is the interesting part: the old ROADMAP was RIGHT
  and the reality check was WRONG.** Confirmed at source 2026-08-23 — both `RaceScreen/index.jsx`
  and `ResultScreen/index.jsx` resolve the active brand. **The general rule:** a "reality check" that
  contradicts a record is a claim like any other and needs its own evidence; this one was carried as
  fact for months.

## Phase history — moved whole from ROADMAP (2026-08-23)

**AND THE TABLE ITSELF, folded in 2026-08-27 by ROADMAP-FOLD-2.** ROADMAP-FOLD-1 moved every section
here and left the file as a 74-line phase-status table — 90% of the merge, and the last 10% is what
kept two documents alive. `docs/ROADMAP.md` is now a redirect and owns nothing; the table below is the
one it held, moved whole and unedited, same as everything else in this section.

### The phase-status table — the last thing ROADMAP held

| phase | status | where its detail lives now |
| --- | --- | --- |
| Phase 1 — Setup Screen  100% complete | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase 2 — Race Engine  Complete | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase 2.5 — Track Editor  Complete | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase L — Local Backend for Track Storage  Complete (PR #43, #44) | **DONE** | BACKLOG PART TWO — *Phase history* |
| Issue D — Racer Redesign  Parts 1–3 merged, Parts 4–5 pending | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase B — Bug Fixes & Wiring  B-Wave done (PR #25) | **DONE** | BACKLOG PART TWO — *Phase history* |
| D9 — Race Engine Speed Refactor  Done (PR #19, master `dad3300`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| D3.5.5 — Per-Type-Tuning-UI  Done (PR #21, master `2d76bc3`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| D10 — Track Size Variability + Auto-Sprite-Scaling  Done (PR #23, master `13a2dd2`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| fix/camera-polish + Q-14  Done (PR #28, master `750d826`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| D11 — Racer Behavior: Soft Avoidance + Drafting  Done (PR #30, master `d46cab2`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| D7a — Proportional Sprite Scaling + Zoom-Ratios + Label-Scaling  Done (PR #33, master `a49baa0`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| W3 — Race-Type Override  Done (PR #17) | **DONE** | BACKLOG PART TWO — *Phase history* |
| PR-A1 — Open-Track Duration UX + Q-25 Fix  Done (2026-05-03) | **DONE** | BACKLOG PART TWO — *Phase history* |
| PR-A2-Diagnose — Speed-Pipeline Scope Analysis  Done (2026-05-03) | **DONE** | BACKLOG PART TWO — *Phase history* |
| PR-A2.6 — Race Dynamics  Done (2026-05-04) | **DONE** | BACKLOG PART TWO — *Phase history* |
| PR-A2.5 — Visual Race Naturalness  Done (2026-05-04) | **DONE** | BACKLOG PART TWO — *Phase history* |
| PR-A2 — Duration-Driven Speed Architecture  Done (2026-05-03) + fix (2026-05-04) | **DONE** | BACKLOG PART TWO — *Phase history* |
| Racer Editor — Phase 1+2  Done (feature/racer-editor → master squash, 2026-05-28) | **DONE** | BACKLOG PART TWO — *Phase history* |
| QA Pipeline  Complete | **DONE** | BACKLOG PART TWO — *Phase history* |
| D7c — Row Start with Speed Bonus + Track Capacity  Done (PR #39) | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase D — Server-Side Storage Migration (groups / brands / racers)  Complete (2026-06-14/15) | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase R — Lateral Physics Redesign & Race-Action Controller  Complete — shipped to master (July 2026) | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase Q — Quality Hygiene | MIXED | BACKLOG PART TWO — *Phase history*; open `Q-` items are in PART ONE |
| Phase V — Verification Sprint (planned) | PLANNED | BACKLOG PART ONE — `V-1`–`V-9` / `T-1`–`T-4` |
| Phase T — Tooltip Retrofit (planned) | PLANNED | BACKLOG PART ONE — `V-1`–`V-9` / `T-1`–`T-4` |
| Phase 5 — Race-Integrity Server & Leaderboard (planned) | PLANNED | BACKLOG PART ONE — *Phases 5–7* |
| Phase 6 — Public Deployment (planned) | PLANNED | BACKLOG PART ONE — *Phases 5–7* |
| Phase 7 — Multi-Tenant (planned) | PLANNED | BACKLOG PART ONE — *Phases 5–7* |
| Session Log | HISTORY | BACKLOG PART TWO — *Phase history* |
| Planned Phase Order (as of 2026-05-06) | HISTORY | BACKLOG PART TWO — *Phase history* |
| 2026-07-10 — status update (INFRA: sim-trust) | HISTORY | BACKLOG PART TWO — *Phase history* |
| 2026-07-20 — status update (B2-Heroes shipped: OUTCOME front-action) | HISTORY | BACKLOG PART TWO — *Phase history* |
| 2026-07-26 — status update (Evolution Act 1: assignment-follows-field CLOSED — reverted after negative SCREEN) | HISTORY | BACKLOG PART TWO — *Phase history* |
| 2026-07-26 — status update (Evolution Act 2: finale front-compression CLOSED — all three builds reverted) | HISTORY | BACKLOG PART TWO — *Phase history* |

---


**MOVED WHOLE from `docs/ROADMAP.md` by ROADMAP-FOLD-1 (NIGHT-2026-08-23 piece 3), under his decision
D24: BACKLOG owns both, ROADMAP is reduced to a phase-status table.**

**This is a MOVE, not an audit.** Every section below is the roadmap's own text, unedited: no verdict
was re-checked, no `[x]` was re-tested, no completion claim was confirmed or withdrawn. **Where a
record here disagrees with PART ONE, PART ONE is the live one** — this is the phase narrative, kept
because it carries PR numbers and master hashes nothing else records.

**Two ROADMAP sections are NOT reproduced here because they were pure pointers into this file**
(*Phase V — Verification Sprint* said "see BACKLOG.md V-1 through V-9"; *Phase T — Tooltip Retrofit*
said "see BACKLOG.md T-1 through T-4"). **Reproducing them would have created the second home the
merge exists to remove.**

### Phase 1 — Setup Screen ✅ 100% complete


- [x] Vite + React project scaffold (migrated from CRA)
- [x] Global dark theme CSS variables
- [x] SetupScreen with Players / Track / Settings tabs
- [x] PlayerSetup — name entry, racer badge assignment, reshuffle
- [x] TrackSelector — card grid, color identities
- [x] RaceSettings — duration, winner count, optional event name
- [x] RandomHelper — Fisher-Yates shuffle, assignRacers, randomInt
- [x] App routing (React Router v6) — `/` → `/setup`
- [x] Start Race button guard (requires ≥1 player + track selected)

### Phase 2 — Race Engine ✅ Complete


- [x] Client-side physics tick (race-engine module)
- [x] Canvas track renderer
- [x] Live race screen with racer positions and collision avoidance
- [x] Countdown and finish detection
- [x] Multi-lap closed tracks (lapsFromDuration 1–4)
- [x] Scrolling camera for open tracks (2.5× virtual canvas)
- [x] TV camera director (OVERVIEW / LEADER_ZOOM / BATTLE_ZOOM / COMEBACK_ZOOM)
- [x] Fullscreen toggle (⛶)
- [x] Fade-to-black screen transitions (TransitionContext)
- [x] Result screen + race history

### Phase 2.5 — Track Editor ✅ Complete


- [x] Track data structure and localStorage CRUD (`trackStorage.js`)
- [x] Catmull-Rom spline math module
- [x] `EditorShape` adapter implementing the race-engine shape API
- [x] Editor canvas: background image + point clicks, drag, delete, segment insert
- [x] Center Mode and Boundary Mode with full edit operations
- [x] Closed/Open toggle, Reverse button, track naming, image dropdown
- [x] Undo / Redo (50-entry cap, Ctrl+Z / Ctrl+Shift+Z)
- [x] Integration: custom tracks appear in Setup Screen (geometry → preset link)
- [x] Environment → track-effects refactor (old environment module removed)
- [x] Six built-in effects: rain, stars, bubbles, fireflies, dust, mud, wave
- [x] Multi-effect array: up to 3 simultaneous effects per geometry
- [x] Live effect preview on editor canvas
- [x] EffectConfig UI component (add/remove/configure effects, duplicate prevention)
- [x] Picture-in-picture minimap with leader indicator
- [x] Preset thumbnail cards in SetupScreen
- [x] Audit fixes: auth scaffold disabled, CORS scoped, dead code removed, server scaffold deleted

See `docs/TRACK_EDITOR.md` for the full specification, architectural decisions, and future extensions.

### Phase L — Local Backend for Track Storage ✅ Complete (PR #43, #44)


A local Docker-based backend that persists custom tracks and background images server-side, allowing the Track Editor to save to a real server instead of only localStorage.

- [x] L.1 — Express + Docker skeleton with `/api/health` (PR #43)
- [x] L.2 — Track read API: `GET /api/tracks`, `/:id`, `/:id/background` with seed data
- [x] L.3 — Frontend loads server tracks; geometry cached so offline races work unchanged
- [x] L.4 — Background images cached as data-URLs (3 MB LRU); offline fallback
- [x] L.5 — Write-path: TrackEditor saves to server (POST/PUT + background upload); TrackManager Delete via API; one-time localStorage→server migration on first connect; stale-cache cleanup on fetch

⚠️ **Auth required before VPS deployment** — currently any browser visitor has full write access to all tracks. See Phase 5 / BACKLOG.md.

### Issue D — Racer Redesign ✅ Parts 1–3 merged, Parts 4–5 pending


Replaces emoji racers with sprite-based renderable types.

- [x] D1 — Extended racer manifest (render, animation, trail, style fields)
- [x] D2 — drawRacer wiring + trail integration for horse
- [x] D2.3 — Sprite-based horse render (4-frame trot animation, 128×128 tile sheet)
- [x] D2.4 — 11 horse coats with hash-based per-player assignment
- [x] D3.5.1 — SpriteRacerType config-driven base class; tintSpriteWithMask for mask-restricted tinting
- [x] D3.5.2 — Horse/Duck/Snail → SpriteRacerType; `_createTrail` system removed
- [x] D3.5.3 — 9 new racer types (Elephant, Dragon, Snake, Giraffe, Buggy, Motorbike, Plane, F1, Rocket)
- [x] **Visual Racer Effects** ✅ — Surface-Class-driven trail system. Static per-type trails replaced by a data-driven Racer + Track → Surface Class → Generator pipeline. Four Sub-PRs merged to master:
  - [x] VRE-1 — Foundation: generator modules (`particle`, `cloud`, `splash`, `line`), Surface-Class data model, `/api/surface-classes` backend API, storage. (PR #46)
  - [x] VRE-2 — Surface-Class Editor in Dev-Screen with animated live-preview modal. (PR #47)
  - [x] VRE-3 — Racer/Track class selectors + Setup-Screen compatibility filter (only racers with ≥1 matching class shown). (PR #48)
  - [x] VRE-4 — Race-Integration: `trailResolver.js`, per-racer emitter at race start, home-trail fallback, `trackSurfaceClasses` in raceData. Phase complete. (PR #49)
- [x] D3.5.5 — Per-Type-Tuning-UI in Dev-Screen: 6 fields live-tuneable via Edit-Modal, InfoTooltip component, CONFIG_SNAPSHOT, normalizeOverrideMap. 678 unit + 36 e2e tests. PR #21, master `2d76bc3`.
- [ ] D3.6 — File reorganization: `racer-types/` → `racer-configs/` (39 files)
- [ ] D4 — Performance pass for 100 racers @ 60 FPS
- [ ] **Surface Zones** (follow-on to Visual Racer Effects) — local surface-class overrides within a track (e.g. mud patch on an asphalt circuit, puddle on earth). Track-Editor zone-drawing tool, `EditorShape.getZonesAtPosition(t, offset) → Zone[]`. Planned after Visual Racer Effects is complete.
- [x] D7a — Proportional Sprite Scaling + Min-Size-Floor + relative Zoom-Ratios + Label-Scaling. computeRenderDisplayScale as single-source render pipeline. cameraZoomFactor removed. 808 unit + 183 e2e tests. PR #33, master `a49baa0`.
- [x] D7a-Plus — Per-Type minTargetScreenPx override with live preview (D3.5.5 pattern). Animated canvas preview, global-default hint, modified badge, reset. Scroll indicator in modal. PR #35, master `27cba65`.
- [x] D7b — Lane-free: physicalY system replaces currentLaneY/targetLaneY. Home force, anisotropic avoidance, cone drafting, soft repulsion, hard clamp. 13 tunable params in Dev Screen. PR #37.
- [x] D7c — Row Start: multi-row layout, speed-bonus for rear rows, track-capacity system. PR #39, master `ca2efcd`.
- [ ] D7d — 100-Racer-Performance: spatial grid O(N) avoidance, smart camera for packs
- [ ] D8 — Full Racer Config Editor in Dev-Screen (coats, all fields, sprite switching)

### Phase B — Bug Fixes & Wiring ✅ B-Wave done (PR #25)


- [x] B-6 — speedMultiplier-Bug — subsumed by D9
- [x] B-7 — Dev-Screen UI-Drift: Code-Registry as Single Source of Truth (PR #17)
- [x] B-8 — SetupScreen Footer/Pills Emoji-Mapping fixed (PR #17)
- [x] B-9 — Override Selector filters inactive types (PR #17 cleanup)
- [x] B-1 — PlayerSetup: loading saved groups — useEffect fix for React StrictMode (PR #25)
- [ ] B-2 — TrackSelector: custom-track behavior on missing geometry
- [x] B-3 — Winners max raised 5 → 20 in RaceDefaults + RaceSettings (PR #25)
- [ ] B-4 — Branding profile applied to race/result screens (UI exists, wiring missing)
- [ ] B-5 — System Backup/Restore/Reset end-to-end verified (UI-only so far)
- [x] B-10 — InfoTooltip auto-boundary detection (getBoundingClientRect flip) (PR #25)
- [x] B-11 — Display-size tooltip simplified in RacerEditModal (PR #25)
- [x] B-12 — maxPlayers configurable in RaceDefaults; wired to PlayerSetup + PlayerGroupsManager (PR #25)
- [x] B-13 — Language selector removed from RaceDefaults (PR #25)
- [x] **B-14** — TrackManager: hint text + link to Track Editor when no geometry selected (PR #25)
- [x] **B-15** — i18n leak fixed: all German strings in TrackEditor + TrackManager → English (PR #25)
- [x] **B-16** — Camera-Director adaptive zoom on large tracks (PR #28)
- [x] **B-17** — Race speed scaling for large tracks via pathLengthPx (PR #26)

### D9 — Race Engine Speed Refactor ✅ Done (PR #19, master `dad3300`)


Makes `speedMultiplier` effective on race speed. Replaces `lapsFromDuration` auto-calculation
with explicit operator choice (lap count for closed tracks, race duration for open tracks).
Adds dynamic finish-line positioning for open tracks, run-out behavior, 2-second result delay,
and estimated-duration display in SetupScreen. New Playwright e2e infrastructure with 22
smoke tests. 628 unit tests + 22 e2e tests.

### D3.5.5 — Per-Type-Tuning-UI ✅ Done (PR #21, master `2d76bc3`)


Edit-Modal in RacerManager for all 20 racer types. 6 live-tuneable fields: speedMultiplier,
displaySize, basePeriodMs, leaderRingColor, leaderEllipseRx, leaderEllipseRy. Live-apply on
each valid change, per-field reset, reset-all-defaults (preserves isActive). InfoTooltip as
reusable component. Override-API extended generically (setRacerTypeOverride 3-arg,
resetRacerTypeOverride with optional fieldName, CONFIG_SNAPSHOT, normalizeOverrideMap).
678 unit tests + 36 e2e + 21 UX-verification tests.

### D10 — Track Size Variability + Auto-Sprite-Scaling ✅ Done (PR #23, master `13a2dd2`)


worldWidth/worldHeight automatically derived from uploaded background image (naturalWidth/naturalHeight).
Hard limit 8000×4096 enforced at upload. Image required to save; save button disabled until image
uploaded. Dimension mismatch on swap: confirm dialog, path reset on accept; same-dimensions swap
silent. TrackEditor: zoom+pan (pinch/wheel zoom-to-cursor, fit-to-screen, pan via viewTransformRef
for stale-closure safety). trackWidth truly variable from track config. Auto-sprite-scaling:
factor = clamp(trackWidth / racerCount / referenceValue, minScale, maxScale). D3.5.5 operator
overrides win over auto-factor. AutoScaleSection in Dev-Screen. Image-First replaces all pre-set
buttons (WORLD_SIZES/WIDTHS/HEIGHTS removed). Backward-compat for path-based backgroundImage.
694 unit tests + 75 e2e tests. Hotfix `13a2dd2`: default icon 🏁 in TrackManager Add-Track form.

**Post-D10 User-Test:** B-16 (Camera still on large tracks) + B-17 (race speed perceived too fast)
uncovered — both HIGH-PRIORITY, addressed as priority fix before D11.

### fix/camera-polish + Q-14 ✅ Done (PR #28, master `750d826`)


CameraDirector adaptive zoom: `zoom = clamp(worldW² / (VIEW_W × worldW), MIN_ZOOM, MAX_ZOOM)`.
clampOffset 2-anchor formula handles zoom < 1 and zoom > 1 without -0 bug. Top-3 focus
(`_focusRacers` returns top-N by t descending). cameraZoomFactor invariant
(REFERENCE_CAMERA_ZOOM / cam.zoom, closed tracks only) keeps sprite scale constant relative
to camera movement. BaseSpeedSection in Dev-Screen: tunable min/max baseSpeed with spread
preview (±% from mean, 2-lap gap estimate) and live-apply pattern. Q-14 lapUtils
single-source-of-truth: DEFAULT_BASE_SPEED_CONFIG from defaults.js, private constants,
optional params on openTrackFinishT and estimatedSecondsPerLap. 759 unit + 157 e2e tests.
UX-verification spec (31 tests, V1-V12) permanent.

### D11 — Racer Behavior: Soft Avoidance + Drafting ✅ Done (PR #30, master `d46cab2`)


Asymmetric soft avoidance: trailer (lower t, tie-break by index) yields fully, leader holds
lane — prevents symmetric force cancellation in evenly-spaced packs. Proximity-scaled lateral
force, configurable avoidanceDistance/lateralForce/maxLateral/returnSpeed. Speed brake for
both racers in proximity. Drafting boost for close followers in same lane
(`draftingBoostFactor`). All params tunable in Dev-Screen RaceBehaviorSection (D3.5.5
live-apply pattern). Camera world-edge clamp fixes black-strip bug at high zoom. Open-track
camera-zoom-aware sprite scaling: `computeOpenTrackCameraZoomFactor()` produces identical
on-screen sprite size to closed-track reference at any zoom. Pixel-floor logic:
`minVisiblePixels` (default 32) ensures sprites never vanish on wide tracks.
809 unit tests + 183 e2e tests. 4 browser bugs found and fixed before merge.

### D7a — Proportional Sprite Scaling + Zoom-Ratios + Label-Scaling ✅ Done (PR #33, master `a49baa0`)


Visual-system architectural cleanup. Replaces 4 multiplicative scaling factors with a single
proportional pipeline plus floor. `cameraZoomFactor` and `REFERENCE_CAMERA_ZOOM` removed —
the constant-size mechanism is obsolete. `computeRenderDisplayScale` is the new single-source
sprite-sizing function: `screenPx = max(displaySize × displaySizeScale × effZoom, minTargetScreenPx)`.

CameraDirector relative zoom ratios: `overviewZoom × ratio` per state (LEADER:1.4, BATTLE:1.6,
COMEBACK:1.3). 1280-track behavior identical to previous. Large tracks (e.g. 6000px) now show
clearly distinct camera states.

Label scaling: hardcoded 11px font replaced with effZoom-based scaling for consistent ~11
screen-pixel labels regardless of track size. Trail-dot scaling consistent.

`minVisiblePixels` renamed to `minTargetScreenPx` (config key + UI label). Browser-test-driven
correction in same PR: initial constant-size implementation felt wrong → diagnosed as
sprite/track-background ratio perception → user decided proportional + floor → simpler architecture.
808 unit tests + 183 e2e tests. Q-15 structurally addressed.

### W3 — Race-Type Override ✅ Done (PR #17)


Session-only racer-type override selector in the Setup Track tab. Filters disabled types.
Resets on track change. Not persisted.

### PR-A1 — Open-Track Duration UX + Q-25 Fix ✅ Done (2026-05-03)


`DEFAULT_SPEED_SCALE_CONFIG.maxScale` raised 4.0 → 10.0, resolving Q-25: Space Sprint now runs
at ~131 px/s traversal rate (consistent with other tracks) and ~144s natural race duration.
Open-track Duration Slider in Setup Track tab: range derived from track physics
(`openTrackDurationRange`), default 65% of max, "Estimated duration: {X}s" display.
`openTrackFinishT` now wired into RaceScreen finishT calculation (was previously unused —
duration had no effect on open-track finish line). Closed-track label "Laps & Duration" +
"Estimated duration: {X}s" format (A2.5 audit). +3 new tests, +35 test cases (1299 total).

### PR-A2-Diagnose — Speed-Pipeline Scope Analysis ✅ Done (2026-05-03)


Read-only diagnosis sprint: identified Architectural Gap in `openTrackFinishT` (missing
`/ speedScaleFactor`), designed `computeRaceBaseSpeed` formula, categorized 9 test files,
assessed MEDIUM risk. Output: `archive/SPEED_REFACTOR_ANALYSIS.md` (499 lines, 8 sections).

### PR-A2.6 — Race Dynamics ✅ Done (2026-05-04)


Three combined changes addressing the Phase 1 diagnosis finding: racers maintained relative
positions almost 1:1 from race start to end (4.3 lead-changes per 30s race in baseline
diagnostic, 3% of races with zero changes).

1. **SpeedBonus refactor:** `spreadFactor` and `speedBonusMult` extracted as separate racer
   fields. Re-rolls only touch `spreadFactor`; `speedBonusMult` (back-row positional
   compensation) is constant over the whole race.

2. **Per-racer spreadFactor re-roll:** `rollCount = max(2, floor(duration/15))` rolls over 0–80%
   of the race, ~12s apart for all standard durations. Variant B: draw centered on current value,
   ±85% of SPREAD_RANGE, clamped to [SPREAD_MIN, SPREAD_MAX]. easeInOutCubic transition over
   5000ms keeps large speed swings visually smooth. ±20% jitter per racer prevents simultaneous rolls.
   `draftingBoost` unchanged at 1.10 (pre-PR-A2.6 value — empirical browser tests showed slipstream
   was not the peloton driver).

Race-Duration guarantee clarified in docs: median-racer calibrated to ±0% of target;
race-end (last finisher) is ±6–8% (1σ) — was implicit before, now explicit.
+33 tests (1326 → 1359 total). Cone-geometry limitation noted in raceBehavior.js comment.
**Next: PR-B** — Camera Bug Fixes (Bug A+B+C).

### PR-A2.5 — Visual Race Naturalness ✅ Done (2026-05-04)


Arc-length-uniform spline resampling: `catmullRomSpline` now defaults to `parameterization:'arclength'`.
T-uniform max/min pixel-distance ratios were 1.36–7.72× across representative tracks; after fix all tracks
≤1.01×. Jitter amplitude changed from hardcoded `0.00012` to `race_baseSpeed * 0.05` (±5% relative).
EditorShape.getBoundingBox extended to include raw control points. +28 tests (1326 total).

### PR-A2 — Duration-Driven Speed Architecture ✅ Done (2026-05-03) + fix (2026-05-04)


`computeRaceBaseSpeed(finishT, T)` = `finishT / (REFERENCE_FPS × T)` where
`T = targetDuration × spreadMinFactor × speedMultiplier`.
Race-end-time semantics: "Race Duration X" means the last finisher crosses at Xs; median ~87% earlier.
Closes Q-25 architecturally: open-track Duration Slider now has real effect on any track.
Removed: `speedScaleFactor`, `SpeedScaleSection`, `DEFAULT_SPEED_SCALE_CONFIG`, `openTrackFinishT`.
Added: Closed-Track Duration Slider (Model D sync — lap change resets duration to auto).
Fix (2026-05-04): speedMultiplier not normalized (rockets finished 20% early); spreadMinFactor
missing (last finisher was at targetDuration × spreadMinFactor, not targetDuration). 3 new
pipeline-contract tests added. Browser verification pending.
**Next: PR-B** — Camera Bug Fixes (Bug A+B+C).

### Racer Editor — Phase 1+2 ✅ Done (feature/racer-editor → master squash, 2026-05-28)


Full-screen UI for creating and managing custom racer types with user-supplied PNG sprite sheets.

### Phase 1 — Storage, Trail Styles, Registry Merging

- [x] `racerTypeStorage.js` — localStorage CRUD for user-created types (`racearena:racerTypes`)
- [x] `trailStyles.js` — 6 named trail-factory presets (dust, spark, bubble, leaf, snow, fire)
- [x] `standardCoats.js` — 20-color STANDARD_COAT_PALETTE shared across all user-created types
- [x] Registry merging: `loadStoredRacerTypes()` called at app init; user types registered alongside built-ins
- [x] RacerManager: edit link + delete button for user-created types; default dropdown includes user types
- [x] RacerEditModal: loads user-created type configs without crash

### Phase 2 — Sprite Generator + Full Editor Screen

- [x] `RacerEditor.jsx` — route `/racer-editor`; two-column layout; edit mode via `?id=`
- [x] `SpriteGeneratorPanel.jsx` — PNG upload, background removal, checkerboard preview, animation preview canvas, tint swatches
- [x] `backgroundRemoval.js` — flood-fill tolerance removal + `computeSpriteBoundingBox` with edge-strip filter (4 tests, commit `c9faaa4`)
- [x] `canvasUtils.js` — checkerboard pattern, image-to-canvas helpers
- [x] `spriteAnimations.js` — pure animation math: 7 primary types (wobble, bounce, breathing, spin, pulse, drift, rumble) + tail-wiggle/shadow-pulse add-ons; `computeFrameTransforms` (35 unit tests)
- [x] `spritesheetBuilder.js` — renders animation frames to offscreen canvas, exports data URL
- [x] `AnimationControls.jsx` — primary type pills + per-type amplitude sliders + add-on toggles
- [x] `RacerMetadataPanel.jsx` — name, emoji, speed multiplier, display size, trail style, surface classes, primary color
- [x] `spriteTinter.detectTintMode` — luminance-based auto mode selection (multiply vs screen); tintMode='auto' cache key fix; lazy-tint resolution fix in `_drawBody`
- [x] Auto-center sprite on bounding box; "Remove Background" button separate from centering
- [x] `registerRacerType` warm-up uses instance tintMode (not hardcoded); 5 new SpriteRacerType tests for detectTintMode caching
- [x] 2293 unit tests passing on merge

### Open Points (see BACKLOG.md)

- [ ] Extended coat palette: 20+ colors + pattern overlays
- [ ] Frame-sequence animation mode: import individual frames instead of a spritesheet
- [ ] Racer speed equalization option: normalize speedMultiplier across all custom types
- [ ] D3.6 migration refactor: all existing built-in types migrated from class files to SpriteRacerType configs

---

### QA Pipeline ✅ Complete


- [x] ESLint v9 flat config (React + hooks + Prettier compat)
- [x] Prettier (single quotes, 2-space, printWidth 100)
- [x] Vitest + React Testing Library (2134 unit tests as of 2026-05-25 hygiene sprint; 183 Playwright e2e tests: 22 D9 + 14 D3.5.5 + 21 UX-verification + 18 D10-smoke + 17 D10-UX-verification + 13 B-Wave-smoke + 12 B-16/17 + 3 fix-list-tracks + 8 camera-polish-smoke + 31 camera-polish-UX-verification + 14 D11-smoke + 12 D11-UX-verification)
- [x] GitHub Actions CI — push + PR to main: lint → format-check → test → audit
- [x] Tracked pre-commit hook (`.githooks/`) → lint-staged (ESLint fix + Prettier on staged files) plus the fast guards. One home: [VERIFY-RULES.md](VERIFY-RULES.md) R12. Was husky until HOOK-TRACKED-1, 2026-08-15.
- [x] docs/AUDIT.md with OWASP Top 10 checklist

### D7c — Row Start with Speed Bonus + Track Capacity ✅ Done (PR #39)


Multi-row start layout for races with more players than fit in one row across the track width.
`computeRowLayout` shuffles players and assigns them to rows; `computeRowPhysicalY` distributes
each row evenly across the full track width (including partial last rows). Rear rows start at
a negative t-position (physically behind the start line; closed-track `tPos` wraps correctly,
open-track EditorShape clamps to position 0). Speed bonus per row (`computeSpeedBonus`) compensates
the physical distance disadvantage — factor 1.0 = pole position neutral by default.

Track capacity (`maxRacers` on each track preset) auto-computed from `pathLengthPx × maxCapacityFactor
/ pixelsPerRacer × racersPerRow` when geometry is selected in TrackManager; user-overridable with
"modified" badge. SetupScreen shows a row-count hint (ℹ️) and a capacity warning (⚠️) inline
above the start bar.

Dev Screen Row Start section: 4 tunable parameters (`pixelsPerRacer`, `rowGapMultiplier`,
`speedBonusFactor`, `maxCapacityFactor`) with extended tooltips. All persisted via
`racearena:rowLayoutConfig`. 21 new unit tests, 6 new e2e tests (Playwright).

---

### Phase D — Server-Side Storage Migration (groups / brands / racers) ✅ Complete (2026-06-14/15)


Concept `b51c064` (2026-06-14). Moves player-groups, branding, and user racers from localStorage
to the server with one-time client migration. All hashes verified against git log.

- **D1** — Player-Groups server-side store + CRUD (operator+) + default seed + promote/export — `999f45e` (2026-06-14)
- **D2** — Player-Groups client reads/writes from server + one-time localStorage migration + reset-path fix — `c263106` (2026-06-14)
- **D3** — Brands server-side store + CRUD + logo-as-file + default seed + promote/export — `6f4deb3` (2026-06-15)
- **D4** — Brands client reads/writes from server + synced KEYS.BRANDING mirror — `ee3735d` (2026-06-15)
- **D5** — Racers server-side store + CRUD + sprite-as-file + built-in id collision guard — `6aa8bc1` (2026-06-15)
- **D6a** — Racers loaded from server (async) + ready loading-gate + unknown-id diagnostic — `5d75d12` (2026-06-15)
- **D6b** — Racers server-side create/update/delete via racerApi + sprite upload + registry-clear-on-reload — `d22ecee` (2026-06-15)

### Phase R — Lateral Physics Redesign & Race-Action Controller ✅ Complete — shipped to master (July 2026)


The `feat/race-action` arc. Stable anchor: `stable/pre-overlap-closed-20jun` (= `712f334`).
Every entry below verified against `git log` / `git tag` (hash + date + scope). HEAD at time of
writing: `9cfa953` (2026-06-30). **Update 2026-07-14: this arc has since shipped to master — see the Status note below.**

**R.0 — Sim/browser fairness parity + overlap-escape experiments (2026-06-19/20)**

- B0 — sim rename `bereichsBonusMult → areaBonusMult` for browser parity — `1683716` (2026-06-19)
- B0b — wire Priority System + `DT=16` for avoidance/timebase parity — `b7a0453` (2026-06-19)
- OVL-A — deterministic tie-break side for near-coincident same-lane pairs — `7e2c6b5` (2026-06-19)
- OVL-B — persistent-overlap clearance path (added `d118000`, reverted `1a08242`) (2026-06-20)
- OVL-C — symmetric sustained-overlap escape (`e1a745d`), activated at strength 0.25 (`ca578a2`) (2026-06-20) — later removed in Commit B
- B1 — band-steering blend with `bandStrictness` (default 1.0 = no-op) — `3202d92` (2026-06-20)
- B2 — single-source band edges (behaviour-identical) — `14f2840` (2026-06-20)
- BS-1 — fairness metrics (top-3, per-band ordinal, track-strat, Holm) + synthetic validation — `bfe5f08` (2026-06-20)

**R.1 — Controller on closed tracks (2026-06-21/22)**

- C0 — enable controller on closed tracks via **leader-progress phase clock** — `14f3c6f` (2026-06-21)
- C0-fix — anchor areaBonus fade at trigger moment + rename `progressClock → raceProgress` — `712f334` (2026-06-22)
- Overlap de-stacking on closed tracks + re-scoped isolation tests — `5451172` (2026-06-23)
- "Weg 1" controller over-drive cap (added `f7c295f` 2026-06-23, reverted `b59152b` 2026-06-24)

**R.2 — Lateral physics redesign: Layer 1 Soft Steering + Layer 2 Hard Separation (2026-06-25/28)**

- Layer 2 Hard Separation behind flag — `82c1806`; warmup ramp + tolerance + soft stop — `f535fc2`; pure backstop keeping L4/L5 — `0815aac` (all 2026-06-25)
- Enable hard separation + `corridorEnd=1.0` by default — `07bf2f1`; DevScreen corridorEnd fallback aligned to 1.0 — `ba70bb5`; merge (verified fair + effective) — `bf44a8b` (all 2026-06-26)
- Layer 1 Soft Steering force (flag-gated, no-op default) — `35b6b29` (2026-06-26); activated as default — `8ad6a62` (2026-06-27)
- **Cleanup Commit A** — remove legacy L1-L5 / L9 / sqrt(N) lateral forces — `bc68c37` (2026-06-27)
- **Cleanup Commit B** — remove L6 OVL-C + 4-mode priority system — `f311622` (2026-06-28)

**R.3 — Closed-track geometry expansion to 3072px world (2026-06-28/30)**

- garden-path (width 198) — `8f73dc7` (2026-06-28); dirt-oval (width 178) — `72da109` (2026-06-29); city-circuit (width 197) — `1b3260e` (2026-06-30); ice-track (width 211) — `b06d946` (2026-06-30)
- Cumulative-t shortest-arc gate fix (closed tracks) — `9a4148e` (2026-06-29)

**R.4 — §4a soft-steering asymmetric fix (2026-06-30)**

- §4a always asymmetric (trailer-only target, independent of `softSteeringSymmetric`) — `aef203a` (2026-06-30)
- Stale §4a comment cleanup + asymmetry regression test — `0b33f3c` (2026-06-30)

**R.5 — Sim browser-parity hardening (2026-06-30)**

- `passThroughCount` event detector telemetry — `f7b6100` (2026-06-30)
- Closed-track `finishT`/speed match browser (`lapsFromDuration` + `computeRaceBaseSpeed`) — `8f57cba` (2026-06-30)
- Read Race-Plan/rubber-band CLI defaults from shared DevScreen config (corridorEnd, bonusMult, race-plan default) — `9cfa953` (2026-06-30)

**R.6 — Reviewed, confirmed correct, no fix needed (2026-06-30)**

- Controller-on-closed phase timing — design-reviewed and confirmed correct: phases run on the leader-progress clock (`raceProgress = leaderT/finishT`), so they are independent of `targetDuration`/`closedSsf`. The mechanism dates to C0 (`14f3c6f`); no new fix required.
- Sim determinism — verified empirically (2026-06-30) as no longer an issue; likely a side-effect of Commit A (`bc68c37`) removing the legacy force layers. No specific fix commit to cite.

**Status (2026-07-14): race-action phase complete and shipped.** The `feat/race-action` arc merged to
`master` (fast-forward `e1d5a2b`, tag `v1-race-action-merged`); master is now at `361a8cd` (e2e
DEAD_IN_SPIRIT retirement + cohesion observer preserved). Choreography + PulkLeadRotation are live.
Stable anchors: `stable/pre-overlap-closed-20jun` (`712f334`, pre-race-action state),
`race-action-complete` (`e1d5a2b`, phase endpoint), `v1-race-action-merged` (`e1d5a2b`, master merge).

**Still open:** Re-Gate all four closed tracks on `9cfa953` (clean browser-faithful config).

**R.7 — Governor vision-pivot: the race-action director (July 2026)** — ⚠️ **SUPERSEDED / HISTORICAL.**
This "reactive governor/director" direction was replaced by the **choreo hero-choreography + PulkLeadRotation**
rebuild, and the classic reactive director (tail-lift + contest-injector, `governorDirectorEnabled`,
`DIRECTOR_SEED_XOR`, `applyGovernor`) was **removed entirely** in THE GREAT PULK CLEANUP (Stages 1–6).
The commits below are kept as history; none of the governor/director knobs, streams, or the
governor-value Action-sweep survive. For the current world see [RACE-ACTION.md](RACE-ACTION.md)
(conceptual reference), ARCHITECTURE.md, and PHASE-CONTRACT.md.

The pivot: the pre-OUTCOME governor is **no longer a field-order limiter**. It is a **RACE DIRECTOR** staging an exciting, _unpredictable-but-fair_ front — lead changes you cannot read the result from — while the true finishing order is still imposed **after** the fade by the OUTCOME controller. Core realisation: **a limiter can only bound a gap; it cannot create a contest** (see LESSONS 160). The eventual winner stays **decorrelated** from early front-running. Anchor: `d9c9cd3` = tag `stable/pre-governor-04jul` (surge + rubber-band intact, no governor). All default **OFF**.

_Done (with commits):_

- Governor core — `governorMult` (dead-zoned median cohesion + bounded shuffle), phase-gated + faded to 1.0 at OUTCOME, single "Action" knob, Governor Diag HUD — `307d6dc`; progressive barrier + racer-length bound + sim metrics — `294550a`; dead-zoned edge-limiter (middle runs free) — `0da9048`; dead-zone tightened — `24c99b6`; **bound in TRUE racer-lengths**, retire the `finishT` divisor — `9947892`.
- **Stage C — leader-brake RETIRED** (`a0105ed`): the ahead-median cohesion/brake is gone; the governor is now **pure tail-lift** (behind-median only, dead-zoned) and **never brakes the leader**. This is the pivot from "bound the field" to "stage a contest".
- **Stage A1 — contest-injector "director"** (`a7e4a64`): rank-blind seeded round-robin spotlight (own master `governorDirectorEnabled`, own `DIRECTOR_SEED_XOR` stream) pulls a rotating cast mean-reverting toward a front anchor = median + offset. Distinct from the CameraDirector. Default OFF.
- **Sim-1 — front-action metric + telemetry propagation fix** (`b930b1b`, read-only, no gameplay change): `--front-action` (leadChanges, distinctP1, leadChangeRate, podiumShuffleRate, front-reach gaps, targetRank-vs-front unpredictability correlation) + `results[].stats.governorShape` + rawData; makes the target experience **measurable** before any tuning.

_Pending (ABANDONED — the direction changed):_ the never-built governor/director follow-ups (front
spread-cap, anchor-to-front, the governor-value Action sweep, governor barrier-internal knob-reduction)
were dropped when the mechanism moved to choreo + PulkLeadRotation. The knob-reduction intent WAS
realised, but on the new world: the DevScreen collapsed to one **PULK Phase** card with 5 owner-facing
controls + pinned internals (Stage 5b), not on the removed governor knobs.

- **OUTCOME decompression**: after the front contest, ensure the OUTCOME controller can still resolve the assigned order cleanly (decompress the field the director clustered).

### Phase Q — Quality Hygiene


- [x] Q-1 through Q-5 — Dead exports, unused imports, TODO tags, JSON.parse hygiene, file
      headers (PR #17 cleanup commit)
- [x] Q-6 — TrackEditor.jsx split-refactor ✅ Done (chore/hygiene-i18n-audit → master squash `e180a6b`, 2026-05-25). Extracted: `TrackEditorToolbar.jsx` (224 lines), `TrackEditorSaveBar.jsx` (116 lines), `useViewport.js` (138 lines), `useTrackIO.js` (206 lines).
- [x] Q-7 — RaceScreen/index.jsx split-refactor ✅ Done (chore/hygiene-i18n-audit → master squash `e180a6b`, 2026-05-25). Extracted `drawing/` modules: `overlayRendering.js`, `particleRendering.js`, `racerRendering.js`, `priorityModeOverlay.js`, `battleDiagRendering.js`. Camera modules extracted: `CameraDirectorDiag.js`, `cameraTimingComputation.js` → `camera/`.
- [ ] Q-8 — Watch-list: TrackManager.jsx (727 LOC), BrandingProfiles.jsx (330 LOC)

### Session Log


| Date       | Entry                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-19 | Setup Screen built, Dev Screen with 7 sections built, full QA pipeline installed (ESLint, Prettier, Vitest 29 tests, GitHub Actions, Husky pre-commit hooks), AUDIT.md created.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-22 | Race Engine phase complete: SVG-path track system (5 shapes), 5 environments, racer types, race loop with collision avoidance, multi-lap closed tracks (lapsFromDuration 1–4), scrolling camera for open tracks (2.5× virtual canvas), TV camera director (OVERVIEW/LEADER_ZOOM/BATTLE_ZOOM/COMEBACK_ZOOM), fullscreen toggle (⛶), fade-to-black screen transitions (TransitionContext), result screen + race history. 228 Vitest tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-04-23 | CI restored (vite 5→8 upgrade via PR #1), environments refactored to consume background image paths from track config via module-level image cache (PR #2), project hygiene pass for line endings, coverage ignore, and SETUP.md stack correction (PR #3). 232 Vitest tests still green.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-04-24 | Phase 2.5 Track Editor complete on branch `feat/track-editor`. Track geometry CRUD, EditorShape, Center/Boundary mode, full edit ops, undo/redo, 6 track effects with multi-effect array (up to 3 per geometry), live editor preview, minimap, camera director, preset thumbnails. Pre-merge audit (AUDIT.md) identified critical auth issue in scaffolded server code. F15–F18 audit fixes applied including server scaffold deletion. PR #6 squash-merged. 307 Vitest tests across 25 files.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-04-25 | Pre-D cleanup: removed empty module dirs left behind by F10/F18, ARCHITECTURE.md folder structure aligned with reality, ROADMAP.md test count corrected (365→307 / 28→25), .gitignore tightened. CI workflow fixed (server job removed).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-04-25 | Issue D horse track complete. Three procedural Canvas-primitives attempts failed — pivoted to sprite-based render with PNG trot sheet. Added spriteLoader, spriteTinter (offscreen canvas multiply), coatAssignment (djb2 hash). 11 horse coats. 350 tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-04-26 | D3.5.1 complete: SpriteRacerType config-driven base class (52 tests); tintSpriteWithMask two-canvas algorithm added to spriteTinter (5 new tests); SpriteRacerType re-exported from index.js. PR #13 squash-merged to master (cf256d8). 453 tests, 31 test files. DOC-SPRINT: PROJECT-PRINCIPLES.md, BACKLOG.md, HANDOFF.md created; ROADMAP.md, ARCHITECTURE.md, RACER_DATA_MODEL.md, AUDIT.md updated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-04-26 | D3.5.2 complete: Horse/Duck/Snail migrated to SpriteRacerType config objects; dead `_createTrail` system removed. 603 tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-04-26 | D3.5.3 complete: 9 new racer types (Elephant, Dragon, Snake, Giraffe, Buggy, Motorbike, Plane, F1, Rocket) using SpriteRacerType. Mask-tinting for Buggy/Motorbike/Plane. 603 tests, PR #16.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-04-26 | B-7+B-8+W3 complete (PR #17): code registry as Single Source of Truth for racer types; racerTypeOverrides override map; emoji from registry; session-only race-type override selector; filter for inactive types (Test-3.1 fix). Quality-gate cleanup: dead RACER_TYPE_EMOJIS export removed, 11 unused imports removed, JSON.parse defensive hygiene, 13 file headers added. 618 tests, 3 ESLint warnings (down from 13).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-04-26 | D9 Race-Engine-Speed-Refactor complete (PR #19, master `dad3300`): speedMultiplier wired to baseSpeed; explicit lap/time selection with live duration estimates; dynamic finish-line for open tracks; run-out behavior; 2s result delay; sessionStorage extended with raceMode/targetLaps/targetDuration. New Playwright e2e infrastructure (playwright.config.js + 22 smoke tests). Quality-gate cleanup: vitest excludes e2e/, BASE_SPEED constants imported in RaceScreen, getRacerType cached, file headers added. 628 unit tests + 22 e2e tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-04-26 | D3.5.5 Per-Type-Tuning-UI complete (PR #21, master `2d76bc3`): Edit-Modal for all 12 racer types with 6 live-tuneable fields; InfoTooltip reusable component; CONFIG_SNAPSHOT + normalizeOverrideMap (legacy migration); override-API extended to 3-arg form. UX-verification spec (21 tests, permanent). Quality-gate: 0 show-stoppers, duplicate import fix before merge. 678 unit tests + 57 e2e tests. Doc sprint: BACKLOG (D10/D11 concepts), RACER_DATA_MODEL (single-type-per-race clarification, updated API), LESSONS 11+12, AUDIT, ROADMAP, PROJECT-PRINCIPLES (UX-verification convention).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-04-27 | D10 Track Size Variability + Auto-Sprite-Scaling + Image-First workflow complete (PR #23, squash `c700ef4`, hotfix `13a2dd2`): worldWidth/worldHeight from image naturalWidth/naturalHeight; hard limit 8000×4096; image required to save; mismatch dialog + path reset; zoom+pan (viewTransformRef); trackWidth variable; autoSpriteScale formula; AutoScaleSection; Image-First replaces WORLD_SIZES presets; backward-compat for path-based BG. Quality-gate: 0 show-stoppers, all warnings fixed before merge. 694 unit + 75 e2e tests. User browser-test exposed B-16 (camera still on large tracks) + B-17 (speed too fast on large tracks) as priority post-D10 bugs. Doc sprint: BACKLOG (D10 ✅, B-14..B-17, Q-11/Q-12, ordering), LESSONS 13+14, AUDIT, ROADMAP (D10 ✅, B-Wave 🔜), PROJECT-PRINCIPLES (English-only UI).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-04-27 | B-Wave UX-Polish sweep complete (PR #25, master `697e081`): B-1 player-group load fix (StrictMode useEffect), B-3 winners max 5→20, B-10 InfoTooltip auto-boundary detection, B-11 display-size tooltip simplified, B-12 maxPlayers configurable in Dev Panel, B-13 language selector removed, B-14 TrackManager hint to Track Editor, B-15 all German UI strings → English (TrackEditor + TrackManager) + d10-smoke/d10-ux-verification updated. 694 unit + 88 e2e tests (13 new b-wave-smoke).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-04-27 | fix/camera-polish + Q-14 complete (PR #28, master `750d826`): CameraDirector adaptive zoom + clampOffset 2-anchor + top-3 focus; cameraZoomFactor invariant (closed tracks). BaseSpeedSection in Dev-Screen (tunable min/max, spread preview, 2-lap gap). Q-14 lapUtils SoT (DEFAULT_BASE_SPEED_CONFIG from defaults.js, private consts, optional params). camera-polish-ux-verification.spec.js (31 tests, V1-V12, permanent). d10-ux-verification V8 stale assertion fixed. 759 unit + 157 e2e tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-04-27 | D11 Racer Behavior + Visual-Fixes complete (PR #30, master `d46cab2`): asymmetric avoidance (trailer yields/leader holds), proximity-scaled force, speed brake, drafting boost, RaceBehaviorSection in Dev-Screen. Camera world-edge clamp (Finding 2). Open-track camera-zoom-aware sprite scaling: `computeOpenTrackCameraZoomFactor()` + pixel-floor `minVisiblePixels`. 4 browser bugs found during review and fixed before merge. 809 unit + 183 e2e tests. Decision: accumulated complexity in 4-factor scaling pipeline → D7 (Visual Experience Architecture) as next phase with Vision Discussion first; Q-15 tracks the architectural debt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-04-28 | D7-Vision-Phase: 6 D11-Browser-Test findings → Vision Discussion with three sparring partners (User + strat. Claude + Claude Code). 5 architecture concepts decided: proportional+Floor-Sprites, relative Zoom-Ratios, Label-Scaling, Lane-free (D7b), Row-Start+Speed-Bonus (D7c), 100-Racer-Performance (D7d). D7a complete (PR #33, master `a49baa0`): computeRenderDisplayScale Single-Source, cameraZoomFactor removed, CameraDirector overviewZoom×ratio, Label-Scaling with effZoom. Browser-test-driven correction in same PR: constant sprites → proportional+Floor → cleaner architecture. Q-15 structurally addressed. 808 unit + 183 e2e tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-04-29 | D7a-Plus (PR #35), D7b (PR #37), D7c (PR #39): Per-type minTargetScreenPx override; lane-free physicalY + home force + anisotropic avoidance + cone drafting (13 tunable params); multi-row start + speed-bonus + track-capacity. Q-Cleanup PRs #40–#42: security (SEC-1..5), data hygiene, source & test hygiene.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-29 | Phase L complete (PR #43 + #44): L.1 Docker/Express skeleton; L.2 track read API + seed data; L.3 frontend loads from backend with geometry caching; L.4 offline background cache (3 MB LRU); L.5 write-path — TrackEditor saves to server (POST/PUT + background upload), TrackManager Delete via API, one-time localStorage→server migration, stale-cache cleanup. 984 unit + 183 e2e tests. L.6: Track-Editor visibility improvements (60% overlay, magenta lines, white outlines), background upload no longer resets drawn track (BgBug fix). ⚠️ Auth required before VPS deployment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-01 | Race Track Lights (feat/race-track-lights): Solid boundary lines + lane fill removed from Race Screen. Replaced by glowing track-light dots (~400 per frame, cached at init). `trackLights` field added to track data model (color, style, speed). Four animation styles: steady, sequence (wave), sync_pulse, random_flash. Track Editor gains Track Lights section (color picker, style dropdown, speed slider). Server startup migration sets themed defaults per track ID. `trackLights.js` module: `sampleBoundaryAtInterval`, `getLightAlpha`, `drawTrackLights`. Server-side validation in POST/PUT.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-01 | Error Boundary (PR #51): `ErrorBoundary.jsx` wraps entire app in `main.jsx` — catches all render-time throws, shows "Something went wrong" fallback, prevents blank-screen crashes. +8 unit tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-01 | Race Track Lights + Cache-Bug-Fix (PR #52): Feature complete (see entry above). Post-PR browser test uncovered: (1) `trackLights` was not persisted across cache reload — Root Cause: `cacheTrackGeometry` had an explicit whitelist and `trackLights` was missing. Structural fix: Spread+Exclusion pattern (L37). +23 round-trip tests. (2) Track-Lights-Controls too wide — CSS fix (width:100% + flex:1 removed). PR #52 squash-merged to master (dc62557).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-05-01 | Doc-Sprint (docs/post-vre-sync): Phase status post-VRE + Track-Lights synchronized. Planned phase order updated (Camera Phase as next main priority).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-05-01 | Concept-Doc-Sprint (docs/track-lifecycle-hybrid-concept): Track Lifecycle Hybrid phase documented before implementation. UI-Flow bug (Draw-Geometry opens blank editor without preset context), backend PUT ignores client geometryId, Track-Delete deletes geometry automatically, default tracks have no server records. Hybrid concept: Default-Tracks → server records on boot (idempotent), code bundle as fallback layer, server PUT respects client geometryId, Track-Delete NEVER automatically deletes geometry, auto-backup on every PUT/POST, status banner in fallback mode. Three sub-PRs: TLH-1 (backend fixes + migration), TLH-2 (UI flow + cleanup), TLH-3 (code fallback + banner + export).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-01 | TLH-1 — Backend-Fixes + Migration (PR #55, squash-merged): Default tracks seeded as server records, PUT geometryId client-authoritative, DELETE preserves geometry cache, auto-backup on every PUT/POST, atomicWriteJson OneDrive-fallback, vi.unstubAllGlobals() fix (Q-19). +11 tests (10 backend + 1 frontend). 1235 unit + 183 e2e + 107 backend tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-02 | TLH-2 — UI-Flow + Cleanup (PR #56 + Post-Merge Bug-Fixes PR #57): Edit-Modal Geometry-Status-Display (replaces dropdown), Track-Editor Two-Mode (Load/New), Two-Path-Load (geometry cache + direct server), geometryId-First-Draw. Bug fixes: hasGeo→geometryId+pointCount, scroll-reset on mount, Load-Mode background optional, autoMaxRacers crash fix (Lessons 39/40). +19 tests. 1256 unit + 183 e2e + 109 backend tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-02 | Track-Delete-Safeguards + Background-Race-Condition-Fix (PR #58, squash-merged `fc5690f`): "Remove background" button in Track-Editor, `DELETE /api/tracks/:id/background` endpoint, isDefault-403-guard for `DELETE /api/tracks/:id`, migrateDefaultTracks from one-shot→idempotent, React key=null fix, background-image useEffect cancelled-flag (Lessons 41/42/43). +9 tests. 1265 unit + 183 e2e + 114 backend tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-02 | Drawing default tracks: All 5 geometries drawn and saved in the Track Editor — Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit. Weltall (custom track) also present. Phase TLH-1+2+Safeguards fully completed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-04 | PR-A3 Dev-Panel-Reorganization: Tier system ("All \| Operator" toggle) introduced. Race Defaults at position 1 (most frequent operation) with subtitle, 7 tooltips, reset button. New consolidated section "Race Tuning" with 9 blocks in storyline order (Speed Range → Start Layout → Row Start → Speed Re-Roll → Drafting → Comfort Zone → Soft Avoidance → Speed Brake → Home Force). Re-roll values from PR-A2.6 (±85%, 5s, divisor 15) extracted from RaceScreen hardcodes into tunable `raceDynamicsConfig`. BaseSpeedSection + RaceBehaviorSection deleted (merged into Race Tuning). SectionContainer wrapper component extracted. Tier separator "Advanced" in sidebar. Storage remains fragmented (racearena:baseSpeedConfig + raceBehaviorConfig + raceDynamicsConfig [NEW]), UI consolidated. +37 new unit tests (raceDynamicsConfig ×12, RaceTuningSection ×15, DevScreen-tier-toggle ×10). 79 test files, 1396 tests green.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-06 | **Phase 4 — Camera Timing Tunables + Plan-B Pan + Diagnosis-HUD** (branch `diagnosis/camera-tuning-effectiveness`): 7 timing tunables in CameraDirector constructor (battleGapThreshold, battleGapHysteresis, battleMaxDurationMs, overviewCooldownMin/Max, overviewDuration, lerpFactor). BATTLE_ZOOM hysteresis + max-duration cap. Periodic OVERVIEW jitter (random cooldown from [Min, Max]). Config schema v2→v3 (Ms suffix for battleMaxDurationMs). Diagnosis-HUD as Tier-2 toggle in Dev-Panel. **Plan-B Pan-Fix:** `_computePanScale` removed (was a double bsX factor); trivial pan formula `hw − r.x × zoom` in all 3 states. 4 pan-centering tests replaced (canvas-space coordinate proof). Diagnosis lessons L54–L69 in LESSONS.md. 1619 unit tests green (91 test files). Open issues: DIAG-OpenTrackPan, Pan-Target-Identification.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-05-12 | **Phase 1 Foundation — Per-State Camera + EditorShape Interpolation** (branch `feat/per-state-camera-phase-1-foundation`): **EditorShape linear interpolation** — `Math.round()` replaced by `Math.floor()`+blend; eliminates ~20 px staircase jumps at zoom 4× (Stage 26). **Pack Battle Trigger** — `battlePulkThresholdPx` (200 px) + `battleMinDurationMs` (3000 ms) replace fraction-based `battleGapThreshold`; `_isPulk()` checks top-10 racers for clustering. **Schema v5** — `leadInDuration`/`leadOutDuration` (seconds) replace pixel-based `leadInDistance`/`followDuration`/`leadOutDistance`; v4→v5 migration in `cameraConfig.js`. **Observer-Phase** — lead-in → follow → lead-out phases per state entry. **HUD Tier-2 extension** — `transitionCount60f`, `entryElapsedMs`, `entryDeltaZoom/X/Y`, BATTLE-DIAG + LEADER-DIAG frozen-snapshot panels. **Cleanup** — `_display*` and `_drawX/_drawY` workaround fields removed; Stage-23-trace removed; dead modules deleted (utils/index.js, SectionContainer). 1717 unit tests green (93 test files, +98 new tests). Pre-merge audit: 0 CRITICAL.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-05-17 | **Phase 2B.1 — avoidanceWarmupMs + Track-Type maxPlayers + ESLint Cluster B + Fairness Sim Fix** (feat/fairness-simulation → master): speedBrake ramp (easeInOutCubic 0→1 over `avoidanceWarmupMs=3000ms`), `computeSpeedBonus` finishT-calibrated + finite-checks; `maxPlayersOpen/Closed` split; ESLint 72→57 warnings. Closed tracks 71/72 fair, open tracks structurally unfair (avoidance problem, not a formula problem). 1932 unit tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-05-19 | **Phase 3A — Race Plan + area bonus mechanic** (feat/phase-3a, 32 commits, 1987 tests): `racePlanner.js` — area assignment (B1–B5), P-controller (trajectoryMult ∈ [0.85, 1.10]), seeded PRNG. `areaBonusMult` in physics loop (fade after OUTCOME). Symmetric start rows (bottom-up, Row 0 centered). Natural speed + dynamic finish line open tracks (ssf-based). 5 HUD overlays (RP DIAG + B1 list + speed monitor + minimap badges + start rows). `racePlanBonusStrengthMultiplier` DevPanel slider + sim CLI arg. `computeAutoScaleFactor` sim-parity fix. Validated defaults: `avoidanceDistance=0.15`, `racePlanBonusStrengthMultiplier=2.0`. Sim-Smoke dragon×70×SpaceSprint×120s: Baseline χ²=10.5 (p<0.01 ❌) → Race Plan χ²=0.3–0.6 (p>0.75 ✅). User visual check confirmed: "3a done is good as-is".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-23 | **Phase 3B — BATTLE_ZOOM + COMEBACK_ZOOM + LEAD_CHANGE + Director-Phase + Fixes** (feat/phase-3b-battle, squash `07bea7b`): BATTLE_ZOOM with isolation+greedy-expansion+centroid-pan; COMEBACK_ZOOM with green highlight ring (globalAlpha instead of ctx.filter); LEAD_CHANGE_ZOOM for lead-change moments. Director system: weighted candidate pool, OVERVIEW scheduler (configurable cooldown window). Fixes: OVERVIEW zoom fix (_overviewStateZoom=overviewZoom on open tracks, L83); OVERVIEW pan jump (entry phase uses shape.getPosition(_camT), L84); ctx.filter→globalAlpha GPU fix (L86); overlay-sets-clear on race reset. 3 new HUD components (BattleDiagHUD, ComebackDiagHUD, LeadChangeDiagHUD). +54 unit tests. 2041/2041 ✅.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-05-24 | **Phase 3C — spriteScale migration** (chore/sprite-scale-relative → master, squash `6a9dcfc`): `spritePx` → `spriteScale` (relative zoom factor, schema v14). `spriteScale=1.0` = natural density-scaled size; racer-count-independent (L82). Defaults: OVERVIEW 1.00, LEADER 1.81, BATTLE 2.81, COMEBACK 1.39, LEAD_CHANGE 1.81. `FALLBACK_REFERENCE_SPRITE_SIZE = 36 px` as anchor point. Side fix: LEAD_CHANGE entry added to `CameraStateHUD.STATE_CONFIG` — missing entry caused fallback `?? OVERVIEW` to show the wrong badge (L87). CameraZoomTuningSection.test.jsx updated to v14 defaults. 2048/2048 tests ✅.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-25 | **chore: full hygiene — i18n, refactor, dead code, RaceScreen/TrackEditor split** (chore/hygiene-i18n-audit → master squash `e180a6b`). Q-6 ✅ TrackEditor.jsx split: `TrackEditorToolbar.jsx` (224 lines), `TrackEditorSaveBar.jsx` (116 lines), `useViewport.js` (138 lines), `useTrackIO.js` (206 lines). Q-7 ✅ RaceScreen split: `drawing/overlayRendering.js` (150 lines), `drawing/particleRendering.js` (63 lines), `drawing/racerRendering.js` (143 lines), `drawing/priorityModeOverlay.js` (133 lines), `drawing/battleDiagRendering.js` (82 lines); `camera/CameraDirectorDiag.js`, `camera/cameraTimingComputation.js`. DevScreen: `RaceTuningSection.jsx` (1269→44 lines, thin coordinator), `BehaviorTuningSection.jsx` (610 lines), `DynamicsTuningSection.jsx` (607 lines), `SubCard.jsx` (41 lines), `CameraAdvancedSection.jsx`. i18n audit: 2 German InfoTooltip strings fixed. 2134/2134 ✅.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-25 | **Phase 3D — FINISH_OVERVIEW + BATTLE/COMEBACK fixes** (master, squash `bcdedb8`): FINISH_OVERVIEW: new finishMode on OVERVIEW state — smooth zoom-out + pan to lookback point in world pixels (`finishOverviewLookbackPx: 300`, L88); leader visible at screen edge; waits for last finisher. Smooth-Pan-Fix: `_camT` stays at winner.t, `_transitionTargetT = lookbackT`; own `else if` branch for T-lerp parallel to zoom-out (L89). BATTLE: P2-drift-exit, rank-span-limit (max 5), top-10 requirement, isolation default 0→300px. COMEBACK: `outcomePhaseThreshold` 0.75→0.65, `comebackMinStartGap` 0.40→0.25, `comebackMaxCurrentRankPct` 0.10→0.20; DIAG with gainOk/startGapOk/currentRankOk, phase gate + leaderProgress/isOutcomePhaseActive visible. Endgame threshold 85%→90%. Same-state-repeat immediately interruptible. LEAD_CHANGE: pan-snap fix on entry. DevScreen: CameraZoomTuningSection + CameraStateHudSection → CameraAdvancedSection (consolidated). OVERVIEW spriteScale effective on open tracks. 2091/2091 tests ✅.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-28 | **StrictMode rAF guard + CAMERA_DIRECTOR.md rewrite** (`c0380a5`): React StrictMode double-mount can start two concurrent rAF loops — `cancelled` flag added to `useEffect` cleanup in `RaceScreen/index.jsx` prevents stale callbacks. `docs/CAMERA_DIRECTOR.md` fully rewritten to reflect the current Phase 3A–3D implementation (prior version described the obsolete pre-Phase-4 system). 2315/2315 tests unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-28 | **Luger Hill open track added** (`5f4c37a`): 13-segment open luge track (pathLengthPx≈10347 px, world 4096×2728, defaultRacerTypeId=lugger) committed to `server/data/`. .gitignore extended with session screenshot patterns. Diagnoses 3+4: physicalY confirmed 0.000000 throughout (live HUD measurement); root cause of visual centerline wander identified as EditorShape double re-sampling arc-length mismatch — getPosition(T, 0) zigzags up to 73.7 px at U-turns because inner and outer are each parameterized by their own arc length (Lesson 97). Backup tag: `backup/pre-centerline-fix`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-05-28 | **Luge racer type** (feature/luge-type → master, squash `151aea4`, 2315 tests): 13th built-in default racer type. PNG sprite exported 1536×1024; dead rows identified (content at y=369–601), cropped to 1536×232 via PIL flood-fill from all 4 corners (background → transparent). `frameHeight: 232`, `frameCount: 12`, `tintMode: 'multiply'` (hardcoded — dark outline sprite; `detectTintMode` incorrectly returns `'screen'`), `baseRotationOffset: 0`, `displaySize: 40`, `speedMultiplier: 1.1`, `surfaceClasses: ['ice', 'snow']`, blue-tinted ice trail. Lessons L95 (spritesheet dead space) + L96 (tintMode multiply for dark outline sprites).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-26 | **Camera centering architecture refactor** (master, 2134 tests): Root cause fix for COMEBACK_ZOOM / LEADER_ZOOM / BATTLE_ZOOM / LEAD_CHANGE camera centering off track centerline. `_setTargets` made sole owner of `targetOffsetX/Y`; during follow phase targets racer world position instead of `shape.getPosition(_camT, 0)`. `_computePhasedPanTarget` converted to state-controller only (44 lines removed). `_prevFocusT` split-ownership documented inline. New `archive/camera-target-architecture.md` architecture document. Full codebase shared-variable ownership audit: no High findings, one Medium (`_prevFocusT`) addressed. Lesson 37 added to LESSONS.md. Backup tag: `backup/camera-centering-architecture`. 2134/2134 tests ✅.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-29 | **Luge sprite fixes** (master, 5 commits, 2328 tests): Replaced `luge-slide.png` with a new user-authored 2000×238 spritesheet — 16 frames of 125×238, seamless sine-curve squash/stretch loop, RGBA background. Config updated: `frameCount: 16`, `frameWidth: 125`, `frameHeight: 238`, `baseRotationOffset: Math.PI/2` (kept from original fix), `tintMode: 'multiply'`. Intermediate fixes applied to the prior 12-frame sheet before replacement: (1) vertical flip (top↔bottom) to make sled lead at `Math.PI/2` rotation; (2) X-center correction for frames 0+11 (61 px seam jump, ~10.5 px screen oscillation); (3) X-center correction for frames 4+6 (6 px residual). Root causes documented: Vite HMR does not invalidate `_variantCache` / `_cache` for `public/` PNG changes (hard reload required — Lesson 101); sprite frame X-center variation maps to perpendicular oscillation via `displaySize/frameHeight` scale (Lesson 102); loop seam (frame N−1 → frame 0) discontinuity fires at animation frequency and is highly visible (Lesson 103). Tests updated: `luge.test.js` (frameCount/frameWidth/frameHeight), `racer-types.integration.test.js` (dragon + luge both frameCount=16). Backup tag: `backup/pre-luge-spritesheet-2026-05-29`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-29 | **fix/centerline-perpendicular — EditorShape center-path geometry** (squash → master, 2328 tests): Three layered fixes to `EditorShape`. **(1) `track.width` as `_centerWidth`** — center branch reads `track.width` from JSON for perpendicular displacement magnitude (not `getActualTrackWidth()`, which is correct for row-layout capacity but not for center-path offsetting — Lesson 98). **(2) Perpendicular sign** — `angle + π/2` was CCW (toward inner side in canvas y-down); corrected to `angle − π/2` (CW = toward outer side), matching the fallback inner/outer path convention — Lesson 99. **(3) `_precomputeAngles` from center curve** — when `_center` is available, angles are computed from `_center[i]` central differences instead of the inner+outer average; eliminates up to 25.6° tangent error at tight U-turn apexes caused by inner/outer arc-length phase misalignment (Luger Hill: inner ≈ 600 px vs outer ≈ 1400 px through the tightest bend — at the same arc-length fraction index, inner has already rounded the apex while outer has not) — Lesson 100. `sim-fairness.mjs`: Luger Hill (`90d3020197da`) added to tracked track set. Backup tag: `backup/pre-centerline-fix2`. Lessons 98–100. +3 new tests (43 total in `EditorShape.test.js`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-05-31 | **feat/lateral-velocity — physicalYVelocity system + 8-param sim sweep** (squash → master, 2352 tests): `physicalYVelocity` state in `applyRacerBehavior` — lateral inertia via `lateralDamping=0.25`; `lateralForce=0.012`; `yFreeLaneDeltas` normalized by `sqrt(overlapNeighborCount)`. 8-parameter LHS sweep (1000 Phase 1 combos + Phase 2 × 100 races): −37% lateralSpeedScore, −44% zigzagScore vs. baseline. New `computeZoneSuccessRate` sim export. DevScreen amber warning extended to all 8 interdependent params. Zone comparison: +0.3pp overall (motion quality win). +3 tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-31 | **feat/adaptive-zoom-rubberband** (squash → master `b5947b2`, 2382 tests): **(1) Adaptive zoom floor** — `CameraDirector` per-frame visibility ratchet: counts racers visible in the current viewport each frame; zooms out by a slow step when visible count < `minRacersVisible=8`; `leaderMinZoom=0.4` clamp; phase-locked (active only during LEADER_ZOOM / COMEBACK_ZOOM). Fixes phase-locked floor computed from frontrunner bounding box (tight box = floor never fires — Lesson L109). **(2) Rubber-band catch-up** — flat boost `flatBoost=0.10` applied to all non-leaders when gap to leader > `gapThreshold=0.003`; deactivates at OUTCOME phase (not Race Plan active). Replaces gap-proportional formula normalized over full track length, which was invisible against natural speed variance (Lesson L110). DevScreen: CameraZoomTuningSection, RubberBandSection. Backup tag: `backup/pre-adaptive-zoom-rubberband`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-06-01 | **Race Plan timing sweep** (squash → master `9f6c0d9`, 2399 tests): Two-phase sim sweep (Phase 1: 41 combos step 0.10 grid, 10 races/track; Phase 2: top 3 × 100 races/track; seed=42; tracks: Dirt Oval 40r / Luger Hill 60r / Space Sprint 90r; all 60s). Winner: BTE=0.75, CS=0.55, CE=0.95 (corridorEnd unchanged). Zone success 52.4% → 64.5% (+12pp across all B1–B5 zones), stableOvt 9.95 → 13.20 (+33%). Key: decoupling `corridorStart` (0.55) from `bonusTransitionEnd` (0.75) activates the P-controller 12s earlier, creating a simultaneous bonus+correction window. 4 timing sliders exposed in Dev Screen (bonusTransitionEnd, bonusFadeDuration, corridorStart, corridorEnd) with amber warning banner and live timeline hint. `scripts/sim-sweep.mjs` added as reusable sweep tool. Lesson L111. Backup: `backup/pre-race-plan-timing` at `fad8bfa`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-05-31 | **STUCK mode suppression** (master `50c9740`, 2352 tests): when bilateral avoidance forces cancel (`totalPressure > 0.008`, `imbalance < 25%`, `                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | physicalYVelocity | < 0.0015`), `delta`is set to 0 — racer holds position and waits for pack geometry to resolve instead of jittering.`stuckModeSuppress: true`default. Diagnostic infrastructure:`diagOut`param +`frameHook`in sim. DevScreen: Stuck Mode Suppression SubCard (checkbox). Sim: −18% zigzag / −10% overlap / −25% lateralSpeedScore (Space Sprint); ±0% / ±0% / −29% (Dirt Oval). Lesson L108. Backup tag:`backup/pre-stuck-mode-fix`. |
| 2026-06-03 | **feat/server-robustness** (squash → master `d615ab7`, 115 server tests): **Server crash fix:** `createReadStream(bgPath).pipe(res)` now has `.on('error', ...)` before `.pipe()` with `!res.headersSent` guard. Prevents unhandled stream errors (ENOENT, EISDIR, Windows/Docker bind-mount races) from becoming uncaught exceptions that kill the Node.js process. EISDIR test added (`tracks.test.js`): create a directory at the expected file path — `existsSync` passes, `createReadStream` fails with EISDIR, error handler sends 500, server stays alive. Lesson L119.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-06-03 | **feat/sprite-crop** (squash → master `11093ff`, 2559 client + 115 server = 2674 tests): **Sprite tight-crop audit:** All 20 racer types measured for bounding-box fill ratio. 12 types flagged (fill < 50%). Union bounding box computed across all frames; +15 px padding; squared; centered; Lanczos3 resize to target size (128–256 px). Mask files cropped with identical parameters (motorbike ×1, koi ×4, turtle ×2, dolphin ×1). Frame dimension changes: horse 128→150, giraffe 128→129, snake 128→155, rocket 128→151, motorbike 128→150, luge 64→128, koi 565→256, snowmobile 192→148 (beetle/boarder/turtle/dolphin unchanged, body upscaled in-place). 5 types had bodies already filling the frame vertically — crop pushed `cropSize > frameHeight`, shrinking the rendered body; fixed by increasing `displaySize` proportionally (horse 40→47, snake 36→44, rocket 40→47, motorbike 36→42, luge 40→80) plus proportional `leaderEllipseRx/Ry`. Scripts: `audit-sprite-crops.mjs`, `crop-sprite-sheets.mjs`. Lessons L119–L120.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-06-03 | **feat/closed-track-speed** (squash → master `066a0ed`, 2559 tests): **Closed track speed normalization:** `closedSsf = pathLengthPx / REFERENCE_CLOSED_PATH_PX (3200)` applied to `race_baseSpeed` denominator, mirroring open-track ssf. Searound (5147 px, closedSsf=1.61) now races at comparable visual speed to standard closed tracks; race duration scales proportionally (~97s actual for 60s target, 2 laps). **New default tracks (8th + 9th):** Seatrack (open, dolphin, worldW=6144) and Searound (closed, manta, worldW=3072) promoted; v5 localStorage migration removes stale user-created duplicates. Old hash-ID source files deleted to prevent duplicate Setup Screen entries. **Sim updated:** 7 new racer types (beetle, boarder, koi, turtle, manta, dolphin, snowmobile) + 4 new tracks (ice-track, mountainstreet, seatrack, searound) added to `RACER_CONFIGS` and `trackFiles`; retired mogcvuipw2y5. **UI fix:** `MinSpriteSizePreview` falls back to `getCachedSprite` for mask-mode types (buggy, motorbike, plane, koi, turtle, manta, dolphin) — animated sprite now shown instead of solid circle. **Cleanup:** `black-sea.json` custom surface class deleted. Lesson L118.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-06-03 | **feat/luge-new-sprite** (squash → master `d33c28d`, 2543 tests): **New racer types (7):** Beetle (steering-wobble animation, multiply tint, 17 coats), Boarder (push+carve 12-frame cycle, 17 coats), Koi (organic spot masks per coat variant — Kohaku/Ogon/Sanke/Showa — 16 coats), Turtle (dual-mask shell: plate centers + seams, 18 coats), Manta (body+shoulder-patch mask, 9 coats), Dolphin (tight-cropped 4096×256 spritesheet, belly mask, 18 coats), Snowmobile (multiply tint, 16-coat palette). Registry: 13 → 20 built-in types. **Default tracks:** Mountainstreet (6th, steep alpine descent), Ice Track (7th, open frozen lake), River Run geometry replaced from Track Editor. Retired mogcvuipw2y5. Track ID cleanup: raw ID strings replaced with derived references (Lesson L113). localStorage migrations v2 (stale promoted-default removal) and v3 (case-insensitive name match, Lessons L113–L114). **Camera fixes:** OVERVIEW sprite-size normalization via `referenceSpriteSize` — consistent ~18 px sprite screen size across all racer counts (Lesson L116). Adaptive ratchet stops at `min(minRacersVisible, activeCount)` — no longer zooms to hard floor with small fields (Lesson L117). Missing Dev Screen camera sliders added to `CameraAdvancedSection`. **Sprite fixes:** Motorbike stray pixel clusters removed from frame 7 spritesheet (Lesson L115). Luge: new 16-frame 125×238 breathing/wobble spritesheet. Snowboarder (side-view) reverted — rotates with track direction and appears upside down on curves (Lesson L112). Lessons L112–L117.                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-30 | **feat/coat-patterns — Extended Coat Palette + Pattern Infrastructure** (squash → master, 2349 tests): **(1) Extended palette** — `STANDARD_COAT_PALETTE` expanded from 11 to 20 colors for all vehicle types (Buggy/F1/Luge/Motorbike/Plane/Rocket); animal types keep own 11-color palettes. `racer-types.integration.test.js` updated. `standardCoats.test.js` (6 tests). **(2) Luge tintMode fix** — `tintMode: 'multiply' → 'screen'`; red base suit caused red cast with multiply (Lesson 104). **(3) Pattern infrastructure** — `spriteTinter.js`: PATTERN_IDS, tile builders, `_patternedVariantCache`, `getPatternedVariant` (lazy-baked), `tintSprite` extended with patternId. `coatAssignment.js`: `assignPattern` (Fibonacci-salt XOR for decorrelation from color). `SpriteRacerType._drawBody` reads `racer.patternId`. `RaceScreen` wires `assignPattern`. **(4) Patterns disabled** — `assignPattern` always returns `'solid'`; stripes/dots too visually dominant at 40 px display size (Lesson 105). Infrastructure preserved. **(5) Luge spritesheet darkened** — helmet (top ~58 px) near-black; runners darkened to max brightness 130, so screen blending does not color them. Backup tags: `backup/pre-extended-palette`, `backup/pre-coat-patterns`. Lessons 104–105. +21 new tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-06-03 | **fix/camera: MAX_INVERSE_ZOOM raised from 5.0 to 10.0** (squash → master `ee9b664`, 2560 tests): `MAX_INVERSE_ZOOM` in `CameraDirector.js` raised from 5.0 to 10.0. The old cap would clip `cam.zoom` on any future closed track with `worldW > ~3500 px` — at `worldW = 6144` the required zoom is 8.70, capped to 5.0 would produce sprites at 57.5% of correct size. New cap provides headroom to `worldW ≈ 12800`. Diagnosis also clarified that Mountainstreet (`"closed": false`) is an open track and is unaffected by this constant; the fix protects future large closed tracks. Test added: `_computeZoomForSpriteScale(1.81)` on closed `worldW=6144` returns ~8.69 unclamped. Lesson L121.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-06-04 | **feat/body-dimensions** (squash → master `7ea8048`, 2564 tests): **bodyFillX/bodyFillY for all 20 racer types** — adds body fill fraction fields to every built-in `*RacerType.js` (measured from spritesheet pixel content). Used by `sim-fairness.mjs` for accurate overlap-threshold computation (`overlapThreshold_t = bodyDiameterY / pathLengthPx * 0.10`, `overlapThreshold_y = bodyDiameterX / trackWidth * 0.10`). Tests: `racer-types.integration.test.js` (bodyFillX/bodyFillY coverage), `sim-fairness.test.js` (sim parity check).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-06-04 | **feat/dynamic-speed-brake** (squash → master, 2559 tests): **(1) Dynamic speedBrakeTMultiplier:** Replaced fixed absolute `speedBrakeTThreshold` with dimensionless `speedBrakeTMultiplier` (default 1.5). Dynamic threshold computed per pair as `(spriteWorldSizePx / pathLengthPx) × multiplier`, firing at a consistent 1.5 sprite-widths before contact on every track and racer type. Fixes Ice Track (luge, large sprite: brake fired 13.1 px after overlap) and Space Sprint (long path: brake fired 231 px too early). DevScreen slider updated to range 0.5–3.0. Migration drops stale stored absolute values. localStorage migration: stored `speedBrakeTThreshold` dropped and replaced with `speedBrakeTMultiplier` default. Sim validation: 700 races (5 multipliers × 7 tracks × 20 races) — all 5 multipliers passed all cutoffs with p=1.000 everywhere; multiplier 1.5 produced lowest mean zigzag (0.000080) and lateral scores across all tracks. **(2) Phase 5 physics values applied as permanent defaults:** `lateralForce: 0.011400`, `lateralDamping: 0.160000`, `homeForceStrength: 0.030000`, `homeForceReductionOnOverlap: 0.300000`, `avoidanceDistance: 0.180000`, `speedBrakeFactor: 0.945000`, `speedBrakeTMultiplier: 1.500000`, `speedBrakeYThreshold: 0.180000`. **(3) 8 physics sliders removed from Dev Screen:** `lateralForce`, `lateralDamping`, `homeForceStrength`, `homeForceReductionOnOverlap`, `avoidanceDistance`, `speedBrakeFactor`, `speedBrakeTMultiplier`, `speedBrakeYThreshold` removed from `BehaviorTuningSection`. Home Force SubCard removed entirely. Parameters remain in defaults.js, config schema, serialization, and sim tooling. **(4) Physics parameters documented in defaults.js and ARCHITECTURE.md:** Full block comment in `DEFAULT_RACE_BEHAVIOR_CONFIG` with sweep methodology, current values, and re-run instructions. New "Physics Parameters" section in ARCHITECTURE.md. Lessons L122–L123. |

| 2026-06-05 | **feat/closed-track-overview-normalization** (squash → master, 2592 tests): **(1) Body-sizing rebuild:** `SpriteRacerType._drawBody` normalizes on `bodyFillNarrow = min(bodyFillX, bodyFillY)` — the lateral axis for all 20 racer types (bfX ≤ bfY always). `computeBodyNarrowRef(W_REF=285, N, ds, bfN, cfg)` computes the render body-narrow world-px reference independent of track width; camera calibrated to this so OVERVIEW narrow-body = 28 px on screen for all N. `RaceScreen/index.jsx`: `displaySizeScale_physical` (frame-based, real width — drives rowGapPx/rowCount/spriteWorldSizePx physics, unchanged) split from `displaySizeScale` (body-narrow reference, drives render + camera). W_REF cap = `min(285, effectiveWidth)` prevents visible-body overflow on narrow tracks. Physics determinism confirmed: fingerprint (dirt-oval + space-sprint, seed=42, dur=30) byte-identical. **(2) Quick Test racer selector:** Surface-compatible racer type selector added to Quick Test UI in SetupScreen (data-testid="quick-test-racer-select"). Resets on track switch when selected type is incompatible. **(3) 7-report overlap investigation** (`reports/closed-track-overview/09-15`): Axis mapping confirmed: bodyFillX=LATERAL, bodyFillY=LONGITUDINAL (baseRotationOffset=π/2 CW rotation). Physics uses square footprint (single spriteWorldSizePx). Rebuild normalized LATERAL axis correctly — sims valid, no re-run needed. **Open overlap bug found + backlogged:** speedBrakeYThreshold coupled to avoidanceDistance (both 0.18); rubber-band (+10%) overcomes speed brake (−5.5%); dT→0 at crossing moment; ~31.7px longitudinal body overlap per pair on screen. Pre-existing (master worse: 35.1 px), NOT caused by rebuild. liteOverlapRate metric blind to it (fires at ~3.5px only). BACKLOG P-1, P-2. Lesson L126. 2592/2592 tests ✅. |
| 2026-06-04 | **chore/clean-state-2026-06-04** (branch, not merged; 2564 tests unchanged): **Clean-State Audit + Total Sim Check.** Phase 1: source hygiene — no TODO/FIXME, Prettier clean, 45 ESLint warnings (0 errors); latent E2E test failure found (d11-ux-verification stale physics assertions, Lesson L124); 2 moderate npm vulns (react-router open-redirect). Phase 2: 100-race sim on all 10 tracks (seed=1, race-plan=true, dur=60) — 5 ATTENTION findings: elephant×Dirt Oval (p=0.017, too-few-laps), dragon×Garden Path (p=0.049, borderline), plane×Luger Hill (p=0.005, Rear-Bias speed-bonus), horse×Ice Track (p=0.001, track-geometry bias), dragon×Garden Path borderline; all other 60+ combos pass. Motion quality excellent: zigzag ~0.0002, hard overlap 0%, outcomeReached 100%. Phase 3: physics optimal. Phase 4: stale docs fixed (13→20 racer types in ARCHITECTURE/RACER_DATA_MODEL, Luger Hill as user-created in physics comment, ROADMAP body-dims session, README completeness, AUDIT LOC findings). Lesson L124. |
| 2026-06-05 | **feat/phase1-metrics** (merged → master `f5ab89f`, 2592 tests): **Path B — measurement only, no physics changes.** Added to `sim-fairness.mjs` (all additive): **(1) honestOverlapRate** — full body-extent collision check (`effectiveDisplaySize × bodyFillX/Y`), all active pairs every frame after 4 s warmup, open + closed tracks. Closed-track wrapping fixed from `finishT` modulus to `tPos mod 1` (Lesson 127). Gate: Space Sprint × rocket old=0.0%, new=1.2% — metric non-blind confirmed. **(2) Fair-chance placement metrics** — `fairChanceExactRate` (~18%), `fairChanceTop5Rate` (~61%), and `fairChanceByRow` (per-starting-row breakdown). Row-blind lottery confirmed: no back-row penalty at N=50. **(3) Lapping instrumentation** — `maxRealSpread`, `honestSameLapFraction`, `honestCrossLapFraction` for closed tracks. **(4) --openRacers/--closedRacers** CLI flags. **Phase-1 matrix result:** 66 combos (all 10 tracks × eligible racers, 60s, N=50–60, 10 races each, seed=1) — all 66 fair (p ≥ 0.05). N=50 confirmation: all 9 flagged combos resolved — p=0.037 (Dirt Oval×buggy) → p=0.472 (noise), p=0.059 (River Run×dolphin) → p=0.774 (noise), all 1.5×-gate failures cleared. Dragon open-track honest overlap (3.2–4.2%) confirmed stable. **Lapping falsified:** closed-track overlap (5–8%) is same-lap pack crowding, not lapping — maxRealSpread 0.2–0.55 laps, crossLap=0% in all 200 tested races (Lesson 128). New CLI: `--openRacers`, `--closedRacers`. Reports: `reports/phase1-metrics/01–03`. |

---

### Planned Phase Order (as of 2026-05-06)


| #   | Phase                                  | Status                                  | Note                                                                                                                                                                                                                                                                                                                                                           |
| --- | -------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Camera Phase + RaceScreen-Refactor** | 🔄 In Progress — Bug A + Bug 1 fixed ✅ | PR-A1/A2/A2.5/A2.6/A3 ✅. Phase 4 ✅. Bug A (OVERVIEW closed-track pan) ✅ 2026-05-27. Bug 1 (LEAD_CHANGE spriteScale dead config — _leadChangeZoom) ✅ 2026-05-27. Open: Bug B (zoom inversion large open tracks), Bug C (openTrackPanTarget focus group), PR-C (RaceScreen-Split), PR-D (State-Machine), PR-E (Sprite-Corridor), PR-F (HUD), PR-G (UI-Bugs). |
| —   | **Track Lifecycle Hybrid (TLH)**       | ✅ TLH-1+2+Safeguards complete          | TLH-1 (PR #55): backend fixes, default track migration, auto-backup. TLH-2 (PR #56/57): UI flow, two-mode editor. Track-Delete-Safeguards (PR #58): remove-background button, 403 guard, idempotent migration. TLH-3 (code fallback + export) ⏳ deferred. See `docs/TRACK_LIFECYCLE.md`.                                                                      |
| —   | **Drawing Default Tracks**             | ✅ Completed 2026-05-02                 | All 5 geometries drawn: Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit.                                                                                                                                                                                                                                                                         |
| 3   | **Surface Zones**                      | planned                                 | Local surface-class overrides within a track (puddles, mud patches). Follow-up phase after VRE. Track-Editor zone-drawing tool, `EditorShape.getZonesAtPosition()`.                                                                                                                                                                                            |
| 4   | **B-UX-Phase** (Dev-Screen Cleanup)    | planned                                 | Dev-Screen grown to 30+ parameters — structural reorganization, help modal per section (B-UX2/B-UX3). Before D8 (full racer editor).                                                                                                                                                                                                                           |
| 5   | **Backup/Export Feature** (B-5)        | planned                                 | System Backup/Restore/Reset end-to-end verified (UI present, wiring missing).                                                                                                                                                                                                                                                                                  |
| 6   | **Docker `node --watch` follow-up PR** | planned                                 | Dev ergonomics: hot-reload in Docker container without rebuild.                                                                                                                                                                                                                                                                                                |
| 7   | **Phase 5 — VPS Deployment**           | planned ⚠️ Auth first                   | Auth (JWT) must be implemented before go-live. CORS wildcard + SEC-2 to address.                                                                                                                                                                                                                                                                               |

**Deliberately deferred (backlog, no active date):**

- **D7d** — 100-Racer-Performance (spatial grid, LOD): no acute blocker for current use cases
- **D8** — Full Racer Config Editor: after B-UX-Phase
- **Dual-Particle-System** — `dustParticles` (home trail) + `surfaceParticles` (VRE) as separate pools: consolidation after Surface Zones makes more sense
- **D3.6** — File reorganization `racer-types/` → `racer-configs/` (39 files): low priority
- ✅ **chore/sprite-scale-relative** — Done (squash `6a9dcfc`, 2026-05-24, schema v14). `spritePx` → `spriteScale`, FALLBACK_REFERENCE_SPRITE_SIZE = 36 px. LEAD_CHANGE badge fix (L87). 2048 tests.

---

### 2026-07-10 — status update (INFRA: sim-trust)


- **Done:** the sim untangle (~3522 lines, observers in `scripts/sim/observers/`, physics imported not
  re-implemented); race zones removed; the shared per-frame t-update (`raceStep.js`); areaBonus
  browser↔sim parity (`racePlanner.js`); the world hash / `ASSUMED-DEFAULTS` stamping
  (`raceConfigWorld.js`); **gap-space metrics in racer lengths** (`raceLengths.js`,
  `scripts/sim/observers/gap-metrics.mjs`) with the bunched-vs-strung golden test.
- **Paused:** the v4 casting rework — no hero is ever steered to rank 1 (`b1Cluster = 2`,
  `heroCurveGenerator.js:378-382`); heroes are cast already at the front (from the B1 pool, final rank
  ≤ 5, `:407-408`). These are known casting defects, not constraints.
- **Next:** field cohesion (`docs/CONCEPT-COHESION.md`) → then the casting rework → then the traffic
  malus. Cohesion is documentation-only today; nothing is implemented.

### 2026-07-20 — status update (B2-Heroes shipped: OUTCOME front-action)


- **Done — B2-attacker "Attack & Fall" heroes SHIPPED ON** (`v-b2-heroes-complete` = master `8bf54ca`,
  pushed to origin). Extra choreographed heroes cast from front-post-chaos B2-finishers that climb to
  ~rank 5 mid-race then fall back and free-reorder in B2 (**band-arrival** release). Shipped
  the swept winner (2026-07-20) — **+21% top-5 OUTCOME action** vs the no-attacker
  floor, B1/B2 band-reach cleared the gate on all four tracks, Holm at the pre-existing 2/4 baseline. `count=0` is
  byte-identical (`4ec8e64…`); the new count=3 default fingerprint is `72c3360fb75225ef`. 3-phase
  validation + owner eye-test PASS; tests 3203/3203. Detail in BACKLOG.md and ARCHITECTURE.md §(a.1);
  reports under `exp-b2-attack-results/`. _(Annotation 2026-07-20: those reports were archived to
  `reports/exp-archive/exp-b2-attack-results/` and the `exp-b2-attack.mjs` driver removed from tracking
  in cleanup step 2 — recoverable at commit `c441e7c~1` (git history). Historical entry left as written.)_
- **Principle proven — action lives in ORCHESTRATION, not liberation.** Steering racers along authored
  curves CREATES top-5 churn; freeing them (strictness 0 inside band) SETTLES the field and reduces
  action. Validated 3 ways: B2-attackers +21% (scripted); the pack strictness release breaks B2
  band-reach via an endgame edge-leak (free); universal band-arrival −6% action (free). Both losing
  mechanisms were removed on 2026-07-23 (dead-mechanisms cleanup); the evidence stands.
  **Future front-action features should AUTHOR scenarios (curves/casting), not liberate constraints
  (release the servo).** (This also resolves the older "Paused: no hero steered to rank 1" note above —
  B2-attackers author front-of-field drama by casting toward rank ~5, still no steered rank-1 winner.)
- **Still open, deferred — E3 (deep-band OUTCOME climb-capacity / servo authority).** No longer blocked
  by the B2-Heroes work, but deferred pending an owner decision on drama-at-leader vs. deep-band reach
  (they want opposite servo tuning). The B2 per-hero intensity budget, the Re-Gate on `9cfa953`, and the
  `--jobs` sweep parallelism all remain open as before.

### 2026-07-26 — status update (Evolution Act 1: assignment-follows-field CLOSED — reverted after negative SCREEN)


- **Act 1 CLOSED, mechanism REVERTED.** The flag-gated assignment-follows-field build (cd520e0, default
  OFF, verified byte-identical: ON 7c70b1eae7d31e22 / OFF f8f7d9c2fd3283e9) SCREENed NEGATIVE — pooled
  band-reach 71.1%→66.8% (below the floor), dead finales + runaway up, lead changes down. Diagnosis
  (code-verified): a live-following target drives rankError→0, REMOVING the servo's within-band restoring
  force instead of adding contest — the same "liberation settles the field / breaks band-reach" family as
  the retired B2 pack-release + universal band-arrival. Reverted for source hygiene (git revert cd520e0);
  the living code reads as if AFF was never built; the build is recoverable @cd520e0.
- **Lab journal kept:** reports/evolution/AFF-DESIGN-CC.md, AFF-SCREEN.md, AFF-NEXT-CC.md. Scaffolding
  tags pre/aff-build (86e0d6d) + pre/aff-remove (0fed3ee). **Successor candidate** (future act, not
  scheduled): a finale-window / front-band contest that ADDS a bounded chase term while KEEPING the static
  endpoint pin (see AFF-NEXT-CC.md).

### 2026-07-26 — status update (Evolution Act 2: finale front-compression CLOSED — all three builds reverted)


- **Act 2 CLOSED, all three finale builds REVERTED.** The fixed dice overlay (8d5e9fd), the DevScreen
  toggle (7404bd9), and the adaptive spread-scaled gates (197763d) were all flag-gated DEFAULT OFF /
  byte-identical (ON 7c70b1eae7d31e22 / OFF f8f7d9c2fd3283e9) and all reverted for source hygiene after the
  decisive adaptive SCREEN failed its pre-registered bar. One track-agnostic law could not lift BOTH
  topologies: the adaptive gates held the floor and cured the closed over-churn but STILL couldn't restore
  the open over-calm (luger-hill lead-changes 3.00→2.32); the realized gates barely separated (open G_c
  1.01 / closed 1.47), so front spread is NOT the distinguishing variable. Root cause is structural physics
  — open's long [0.90,1.0] run-out re-expands any [0.80,0.90] compression, closed's bunched laps churn — so
  no scheduled-dice finale overlay serves both topologies.
- **Living code reads as if Act 2 was never built** (grep tally 0 in client/ + scripts/). Lab journal kept:
  reports/evolution/FINALE-DESIGN-CC.md, FINALE-SCREEN.md, FINALE-ADAPTIVE-CC.md, FINALE-ADAPTIVE-SCREEN.md.
  Recoverable @8d5e9fd/@7404bd9/@197763d; scaffolding tags pre/finale-compression, pre/finale-devscreen,
  pre/finale-adaptive, pre/finale-remove. Lesson: the finale-window front-band contest that Act 1 named as
  a successor was tried (fixed + adaptive) and does not work as a single track-agnostic dice law.

## Parking Lot — Future / Unclear Scope

- Phase 7: custom sprite upload ✅ delivered as standalone Racer Editor Phase 1+2 (2026-05-28)
