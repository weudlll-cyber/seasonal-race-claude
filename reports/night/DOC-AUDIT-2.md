# DOC-AUDIT-2 — the living documents, audited in one pass

**Branch:** `feat/outcome-phase-75` (the strand). **Documents and routing only** — no engine change.

---

## THE ANSWER IN FIVE LINES

1. **The machine-checkable half of this audit is already green and stays green.** Config claims 0,
   fingerprint copies 0, dangling links 0, index both directions 0. Those four dimensions no longer
   need a human, and this audit did not re-do them by hand.
2. **What is left is what a guard cannot see, and all six findings are the same defect:** a number a
   scan could derive, typed into a sentence. Five fixed, one named as needing a generator.
3. **The routing gap that turned master red is CLOSED**, in the routing declarations, with a test in
   both directions.
4. **The 2026-06 sorted t-window is now in DEAD-ENDS**, as section L, written the same night its
   successor shipped so a reader who finds one finds the other.
5. **`postStartHoldMs` is TWO CLOCKS wearing one name — and the second one is inert at the shipped
   duration.** Evidence in §E. Nothing changed; the rename is the owner's call.

---

## A. THE AUDIT

### What was checked by machine, and therefore not by hand

| dimension | guard | result |
|---|---|---|
| a document states a config value | `check-config-claims.mjs` | **0** current claims across 52 living docs |
| a document states a fingerprint | `check-fingerprints.mjs` | **0** copies outside the record |
| a relative link resolves | `check-doc-links.mjs` | **0** dangling of 478 |
| a report is indexed, an index entry exists | `check-index.mjs` | **0** orphans, **0** dangling, three directories |
| a documented key exists in defaults | `check-config-keys.mjs` | green |
| a mirrored fallback agrees with its default | `check-fallback-agreement.mjs` | green, 38 on an explicit exception list |

**This is the finding that shapes the rest of the audit.** Two of the three questions the brief asked
per document — "does it state a config number" and "is a link dead" — are now answered continuously
by guards, so a human pass over them would be re-deriving a machine's answer. What remains genuinely
manual is *does it describe machinery that still exists* and *does it claim a count a scan could
derive*.

### The findings

| doc | verdict | finding | fix |
|---|---|---|---|
| `docs/SHIP-CEREMONY.md` | **stale, 3 numbers in one sentence** | the hull is **20** files, not 19; the folder rule fires on **106**, not 103; the gap is **86**, not 84. It read 19/103/84 until tonight — `CONFIG-DIFF-2` moved the closure and nothing here noticed, the same defect that turned master red on the generated block in SIM.md | fixed; and **flagged as SHOULD BE GENERATED** — both counts are derivable (`engine-reach.mjs`; a directory scan), and the paragraph now says so |
| `docs/ARCHITECTURE.md` | **stale, describes machinery that does not exist** | the track-loading table and the loading-order block present a three-tier fallback whose third tier — `storage/defaultTracks.js` — is not in the repository. There is no `fallbackMode` flag and nothing falls back past the cache | fixed: tier 3 marked NOT BUILT, pointing at `TRACK_LIFECYCLE.md`'s TLH-3, which owns the plan and correctly marks it deferred |
| `docs/CAMERA_DIRECTOR.md` | **stale by tonight's own work** | "Three code fallbacks disagree with the shipped defaults" — `outcomePhaseThreshold` left that list in OUTCOME-PHASE-75 | fixed: two, and the values are not restated (the guard holds both sides) |
| `docs/VERIFY-RULES.md` | **would have gone stale tonight** | it states the guard-discovery pattern verbatim, and §B widens it | fixed in the same commit, with the reason a wildcard was not used |
| `docs/README.md` | **stale count** | `archive/` holds twenty-one dated records, not twenty | fixed |
| `docs/SIM.md` | **current** | its engine-reach block is GENERATED and `--check` passes at 20 files | — |
| `docs/TRACK_LIFECYCLE.md` | **current** | every `defaultTracks.js` mention is inside a section explicitly marked *planned but deferred*. Correct as written — this is what ARCHITECTURE should have done | — |
| `docs/FAIRNESS.md` | **current** | canonical thresholds, stated once, nowhere else | — |
| `docs/DEAD-ENDS.md` | **incomplete** → fixed | the 2026-06 t-window was missing | §C |
| `reports/night/INDEX.md` | **stray marker** | a bare `\|\|\|\|\|\|\|` diff3 line | §D |
| `docs/LESSONS.md`, `docs/ROADMAP.md`, `docs/AUDIT.md`, `reports/**` | **current by rule** | all reference deleted scripts (`sim-sweep.mjs`, `param-sweep-full.mjs`, `rubberBandConfig.js` …). These are append-only history: a lesson records what was true on its day. **Not findings** | — |
| `docs/API.md`, `SETUP.md`, `DEPLOYMENT.md`, `GLOSSARY.md`, `PROJECT-PRINCIPLES.md`, `FORCE-MAP.md`, `PHASE-CONTRACT.md`, `RACE-ACTION.md`, `CONCEPT-COHESION.md`, `RACER_DATA_MODEL.md`, `TRACK_EDITOR.md`, `branding.md`, `DEVSCREEN-INVENTORY.md`, `SWEEP-HARNESS.md`, `EYE-TEST-SEEDS.md`, `TAGS.md`, `BACKLOG.md` | **no finding** | checked against the four machine dimensions and scanned for references to files that do not exist; nothing surfaced | — |

**THE COVERAGE LIMIT, stated rather than implied.** The last row is a SCAN, not a full reading. Every
living document was checked for: a stated config value, a stated fingerprint, a dead relative link, a
reference to a file that does not exist, and a typed count matching the patterns above. It was **not**
read end to end for prose that is merely out of date — 16 000 lines across 28 documents, and a claim
to have read all of it carefully would be the least trustworthy sentence in this report. The five
documents with findings were read in full.

### For the owner — needs a judgement, not a fix

- **The three counts in `SHIP-CEREMONY.md` should be generated**, like the guard-cost table below them
  in the same file. Not built here because a generator would have to own the whole sentence, not just
  the number, and rewriting that paragraph's argument is not this block's call.
- **`docs/audit/`, `docs/diag/`, `docs/diagnose/`, `docs/phase-2n/` are empty directories on disk and
  untracked** — git holds nothing in them. Not a repository finding; local litter, safe to delete.
- **`docs/README.md` says "if a document is not listed here it should not exist"**, and by that rule
  the four directories above should not. They do not exist as far as the repo is concerned.

## B. THE ROUTING GAP THAT TURNED MASTER RED — closed

**The defect.** A `client/src` change that alters the engine-reach hull invalidates the GENERATED
block in `docs/SIM.md`. The guard for that block is the generator's own test, which lives in the
script suite — and the script suite is selected by changes under `scripts/`. `CONFIG-DIFF-2` changed
only `client/src`, so the suite was correctly not selected, verify passed, and CI found the stale
block minutes later.

**The fix, where routing now lives.** `gen-engine-reach-doc.mjs` declares itself like every other
guard, and its `reach` names `raceCore.js`. `resolveGuard` expands a reach entry to its whole import
closure — which IS the hull, i.e. exactly the set of files whose change can invalidate the block. **It
cannot fall out of step with the hull because it IS the hull**, computed by the same function the
block is generated from.

Two supporting changes, each with its own reason:

- **`routing.mjs` learned to discover it.** The scan matched `check-*`, `*-fingerprint` and
  `fingerprint-default` only. It is named EXPLICITLY rather than widening the pattern to `gen-*`,
  because discovery works by RUNNING each candidate with `--declare`, and a generator run with no
  argument **rewrites its document**. This one is safe to ask because it declares and exits first.
- **`verify.mjs` supplies `--check`**, in `commandFor`, where the other argv lives. Verify may not
  write a tracked file; without the flag it would "pass" by making the document agree with itself.

**Three tests, both directions:**

- a hull file (`raceBehavior.js`) selects the guard — **and `storage/configDiff.js`, the file
  `CONFIG-DIFF-2` actually added, which is the incident itself**;
- a client file OUTSIDE the hull (`camera/finishPhase.js`) does NOT, so it has not become a guard
  that runs on everything;
- it is invoked with `--check`, asserted on `commandFor`'s output rather than trusted.

## C. DEAD-ENDS — the 2026-06 sorted t-window

Written as **section L**, with what was built, the measured regression (+0.73 ms mean, +2.35 ms P90 at
n=70), and the cause. The part that earns its place is the last paragraph: **it is evidence about
THAT window and THAT implementation, not about windowing.** All three of its premises have changed —
the window was 9–45× too wide because it was derived from a gate that no longer exists, it had no Y
axis (which the census says is the strong one), and the sort it was charged for is now paid by
`buildTIndex` at 0.83 %. It links forward to PAIR-PREFILTER-1, which shipped the successor the same
night, so a reader who finds the failure finds the success beside it.

## D. THE SECOND STRAY MARKER — deleted

A bare `|||||||` diff3 line in `reports/night/INDEX.md`, left deliberately when the archive branches
it named still existed. They are gone. Deleted in its own commit, and **`check-index` counts what it
counted** — 51 reports, 0 unindexed; 51 index links, 0 dangling — identical before and after, which is
the point: nothing that reads this file could see the marker, which is why it survived.

## E. `postStartHoldMs` — AN INVESTIGATION. Nothing changed.

**Verdict: TWO CLOCKS, one name — and the second is inert at the shipped duration.**

### The evidence

**Clock 1, the camera** (`CameraDirector.js`, priority 2.1):

```js
else if (raceState.raceElapsed < START_PHASE_DURATION + this._postStartHoldMs) → LEADER_ZOOM
```

A DURATION measured from the END of the 3 s start overview. Its zero point is t = 3000 and its
meaning is "how long after the start overview the camera stays on the leader". The hold therefore
ends at 3000 + the value.

**Clock 2, the planner** (`racePlanner.js`):

```js
const postStartHoldMs = config.postStartHoldMs ?? 0;
phases = { pulkStart: Math.max(postStartHoldMs, phaseFractions.pulkStart * targetDurationMs), … }
```

An ABSOLUTE floor on a timeline measured from t = 0 — every sibling in that object is
`fraction × targetDurationMs` from race start. So the same number is a duration-after-3000 on one
side and an absolute-from-zero floor on the other. **They differ by exactly `START_PHASE_DURATION`.**

### Which is right, and why I am not proposing it

If the planner's intent is *"PULK must not begin while the camera is still locked on the leader"* —
which is the only reading that makes the two related at all — then its floor should be
`START_PHASE_DURATION + postStartHoldMs`, not `postStartHoldMs`. But that is a reading of INTENT, and
the code states none. **That is why this is a rename question and the owner's call**: if they are two
clocks, each wants its own name and the camera's should probably say so
(`postStartOverviewHoldMs`); if they are one, the planner is missing a `+ 3000`.

### THE PART THAT SETTLES HOW URGENT IT IS

**At the shipped race duration the planner's use of this key does nothing at all.** `pulkStart`'s
fraction is 0.25, so at a 60 s target the floor competes with 15 000 ms — and `Math.max` picks the
fraction every time. The floor only binds when `0.25 × duration < postStartHoldMs`, i.e. **below a
~28 s race**. So:

- the disagreement cannot affect any normal race today;
- it WILL affect short races, silently, and in the direction of starting PULK too early by 3 s;
- and `check-fallback-agreement`'s separate note is right that the `?? 0` fallback is unfireable
  (raceCore always sets the key) — **but that is a different question from this one**, and the triage
  said so. The two-clocks problem is not about the fallback at all.

**Nothing was changed**, as instructed. The open question for the owner is one sentence: *are these
one clock or two* — and if two, the camera's wants a name that says what it is measured from.

---

## SOURCE HYGIENE

| file | what |
|---|---|
| `scripts/gen-engine-reach-doc.mjs` | a `GUARD` declaration + `--declare` |
| `scripts/lib/routing.mjs` | discovers it, by name, with the reason |
| `scripts/verify.mjs` | `--check` argv; `commandFor` exported so a test can assert it |
| `scripts/verify.test.mjs` | three routing tests |
| `docs/DEAD-ENDS.md` | section L |
| `docs/SHIP-CEREMONY.md`, `ARCHITECTURE.md`, `CAMERA_DIRECTOR.md`, `VERIFY-RULES.md`, `README.md` | the five fixes above |
| `reports/night/INDEX.md` | the stray marker, deleted in its own commit |

### Noticed but left

- **`check-config-claims` scans `*.md` only.** The `outcomePhaseThreshold` tooltip in
  `CameraAdvancedSection.jsx` said "Default 65%" in prose, in the control the owner would judge with,
  and **nothing could have caught it** — not that guard (documents only), not
  `check-fallback-agreement` (it looks for `??`). Tooltips are user-facing documentation living in
  JSX. Fixed there by reading the default; the GAP is general and unclosed.
- **The doc-audit is not itself guarded.** Five of tonight's six findings are typed counts, and a
  count guard for documents would be the same shape as `check-config-claims`. Worth its own block.
