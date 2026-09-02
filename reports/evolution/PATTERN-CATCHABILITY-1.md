# PATTERN-CATCHABILITY-1 — the pattern is not one fault, it is five, and only two of the five have two machine-readable sides

**Read-only. Nothing was built, no branch was touched, no check was run.** Written 2026-09-02 against
`master` at `8cd76a93`, working tree clean.

**The verdict in one line.** "A statement left standing while the thing it described moved" is a
description of a SYMPTOM, not of a fault class, and it does not decompose into one check. Split by
what the two sides actually ARE, the six instances fall into five subtypes. **Two subtypes are
mechanically catchable and one rule each would close them. One is catchable only by its consequence.
One is catchable by a guard this repository already owns and already runs, if somebody stamps the
sentence. One is not catchable by anything, and I could not construct a check for it that does not
require reading the code the way the person who fixed it did.**

**Four of the six would have gone red.** Instances 2, 3, 4 and 6. Instance 5 would have gone red on
an existing guard had the sentence carried a stamp. Instance 1 would not have gone red on anything.

**A correction to the brief's arithmetic, because it strengthens the case rather than weakening it.**
The brief says two of the six were created by repairing another. **It is three**, and the third is
the most instructive:

| instance | the repair that created it |
| --- | --- |
| 1 — the company headcount | `CAMERA-LATERAL-1` correctly re-pointed the guarantees at the new anchor |
| 4 — the parity soak's roster | `FINGERPRINT-TRACK-DEFAULTS-1` (`fa553f50`) made the track axis read the seeds |
| 5 — SHIP-CEREMONY's racer-types row | `REGISTRY-LITERALS-1` (`56b99a9d`) doubled the engine-reach closure |

**Half of these defects are produced by a correct repair moving one side of a pair.** That is the
trigger a check has to fire on, and it is why "review harder at write time" cannot work: nobody was
wrong at write time in any of the three.

---

## The six, one at a time

### 1 — The company headcount

**The standing statement.** `client/src/modules/camera/framingRule.js`, in the pre-repair tree:
`const need = Math.floor(minVisible) - 1; // the anchor itself is one of them`. True when written —
the anchor was the subject racer's own position.

**What moved underneath it.** `CAMERA-LATERAL-1` replaced the anchor with the racing-line centreline
point. Today that is `CameraDirector.js:2212` `_centrelineAt(t)`, reaching the guarantee as
`subjects.point` at `CameraDirector.js:4076`. Measured by AIM-ROOM-LOST-1: the anchor equals
`_centrelineAt(t)` on 100% of frames and coincides with no racer on 100% of frames. A promise of five
delivered four for the whole interval.

**What a check would have had to compare.**
Side A: `framingRule.js` — the `- 1` and the comment asserting the anchor is a counted racer.
Side B: `CameraDirector.js:4076`'s first argument, traced to `_centrelineAt` at `:2212`, which returns
`this._shape.getPosition(tt, 0)` — a track point, never a racer.

**Mechanically available: NO.** Neither side is a literal. The correspondence is "is the value this
call site passes semantically a racer's position" — a whole-program provenance question across ~2,300
lines of `CameraDirector.js`, answered by a `getPosition` call that names nothing about racers. No
lexical anchor exists on either side. The repair itself makes the point: COMPANY-HEADCOUNT-1
explicitly rejected a boolean parameter because *"the caller would assert the premise, an anchor
change would move it, and the caller's assertion would still read true"* — i.e. every shape in which
the premise is WRITTEN DOWN, including one a check could read, reproduces the defect one level up.
The only fix was to stop writing it down: `framingRule.js:719-743` now derives `anchorIsRacer` per
call. **A check would have had to be the fix, not the detector.**

**What did catch it in the end:** a behavioural property test — `companyHeadcount.test.js`, 15
assertions, counting racers actually inside the region the guarantee promises them inside. That is
R7's "assert a PROPERTY" done right, and it is available for any promise. It is not a pattern check;
writing it requires already suspecting the promise is broken.

### 2 — The fingerprint's track table

**The standing statement.** `scripts/fingerprint-default.mjs:150-161` (pre-repair), a literal table of
ten track/racer pairs under `// 10 standard tracks × default racer`. Line `:153` was
`["garden-path", "snail"]`.

**What moved underneath it.** `GARDEN-PATH-DEFAULTS-1` (`d73ec6a9`, 2026-08-25) changed
`server/seeds/tracks/garden-path.json` `defaultRacerTypeId` from `snail` to `beetle` and moved nothing
else. Eight days.

**What a check would have had to compare.**
Side A: `scripts/fingerprint-default.mjs:153`, the string `"snail"` in a pair whose first element is a
track id.
Side B: `server/seeds/tracks/garden-path.json`, key `defaultRacerTypeId`.

**Mechanically available: YES, completely.** Both sides are string literals keyed by the same track
id; the seed directory is the declared one home (`server/data/**` is gitignored runtime and is not a
source). CENSUS-DUPES-1 group A4 already performed exactly this comparison by hand over seven copy
sites and got a clean answer: 58 pairs, 53 agree, 5 disagree, with a commit and a date for each
divergence.

### 3 — The sprite audit's geometry table

**The standing statement.** `scripts/audit-sprite-crops.mjs:23-184` (pre-repair), twenty rows of
`frameWidth` / `frameHeight` / `frameCount` / `displaySize`. Entered `11093fff` (2026-06-03).

**What moved underneath it.** Nothing — and that is the sharpest fact in the set. **It never agreed.**
`git show 11093fff` has the audit at `horse … displaySize: 40` and `HorseRacerType.js` at
`displaySize: 47` in the SAME COMMIT. The table recorded the crop's INPUT; the registry recorded its
OUTPUT. It disagreed on 8 of 20 frame geometries and 5 of 20 display sizes for 91 days, so the tool
sliced a 150-px horse sheet into 128-px windows and reported `bodyFillX = 1.000` for seven types.

**What a check would have had to compare.**
Side A: `scripts/audit-sprite-crops.mjs:27-28` (`frameWidth: 128, frameHeight: 128`), `:30`
(`displaySize: 40`), and eighteen more rows.
Side B: `client/src/modules/racer-types/HorseRacerType.js` `frameWidth/frameHeight/displaySize`, and
for geometry additionally the PNG IHDR of `client/public/assets/racers/horse.png`
(`readUInt32BE(16)/(20)`).

**Mechanically available: YES.** Same field names, both sides literal; the PNG side is a 24-byte read.
CENSUS-DUPES-1 group A2 did it for all 20 sheets and reports 20/20 registry-PNG consistency, which is
the control that proves the comparison is sound before it is used to accuse.

### 4 — The parity soak's roster

**The standing statement.** `scripts/parity/goldenRunner.mjs:162` (pre-repair)
`export const RACER_CONFIGS = { … }` — ten racer types written out by hand, of twenty in the registry.

**What moved underneath it.** `FINGERPRINT-TRACK-DEFAULTS-1` (`fa553f50`) made the track axis read the
seeds. `garden-path` then returned `beetle`, which was not among the ten, and `soak.mjs:68-69` threw
`unknown racer type beetle` on every run from that merge until `0e938bb0`. **Nothing went red**: the
soak is in no CI path and no verify guard, so a tool that could not start looked exactly like a tool
nobody ran. Measured at three points: `buildMatrix()` returns 600 rows at `bcd94805`, throws at
`ac1d7acc`, returns 600 again now.

**What a check would have had to compare.** Two candidates, and they are not the same check.
- **(a) Coverage.** Side A: the key set of `goldenRunner.mjs`'s `RACER_CONFIGS`. Side B: the racer ids
  reachable as `defaultRacerTypeId` across `server/seeds/tracks/*.json`, union `ALT_TYPE` in
  `soak.mjs`. Assertion: B ⊆ A.
- **(b) Reachability.** Side A: `scripts/parity/soak.mjs` exists and can be started. Side B: the union
  of `.github/workflows/*.yml`, `.githooks/pre-commit`, and `guardScripts()`/`SUITE_GUARDS` in
  `scripts/lib/routing.mjs:145,236`. Assertion: A appears in B, or declares that it does not.

**Mechanically available: YES for both, with one caveat that matters.** (a) is a set comparison
between two machine-readable sets — but "the soak's roster must cover the track defaults" is a
correspondence a human has to state once. **A typed correspondence table is the same defect class one
level up**, and this repository has already demonstrated it: `check-fallback-agreement.mjs:58,188`
declares a blind spot that `ONE-HOME-1` closed **forty minutes** after `DECLARED-HOLES-1` wrote it
(CENSUS-DUPES-1 item 6). (b) needs no correspondence and is a pure inventory question — CENSUS-CHECKS-1
computed exactly that inventory for 40 checks by hand.

**Note that a value-agreement check would NOT have caught this.** All ten entries agreed. The defect
was in the SET, not the values — a subset that stopped covering. Any rule of the "these two tables must
agree" shape is silent here.

### 5 — SHIP-CEREMONY's closure paragraph

Two separate things live at this site, and only one of them broke.

**(a) The generated block is GUARDED and did its job.** `docs/SHIP-CEREMONY.md:49-58`, between
`<!-- BEGIN/END GENERATED: engine-reach counts -->`, is written by `scripts/gen-ceremony-costs.mjs`
and asserted by `--check-counts` in `npm run verify`. It has gone red for real (`a7db89eb`, one of the
three numbers wrong). The prose paragraph at `:60-66` — *"the third count is NOT the difference of the
first two, and typing it as one is how this document came to claim 86"* — is an ARGUMENT about the
generated numbers and is deliberately outside the markers, per the generator's own header: *"an
argument that a script rewrites is one nobody can be held to."* That split held.

**(b) What actually went stale is the hand-written row ten lines below the OTHER generated block.**
`docs/SHIP-CEREMONY.md:155` said, until 2026-09-02: *"`racer-types/` is inside NO instrument's
closure … render 55 files, camera 36, world 36 … and `engine-reach --check` on `SpriteRacerType.js`
reports it cannot reach the engine."* `REGISTRY-LITERALS-1` (`56b99a9d`) made both halves false the
same day. It is now `:155-165` and reads world 78 / camera 38 / render 58.

**What a check would have had to compare.**
Side A: the prose numbers and the claim at `docs/SHIP-CEREMONY.md:155-165`.
Side B: `closureOf(GUARD.reach)` per guard in `scripts/lib/routing.mjs`, and the exit code of
`node scripts/engine-reach.mjs --check client/src/modules/racer-types/SpriteRacerType.js`. The
sentence literally NAMES the command that refutes it.

**Mechanically available: YES — and the guard already exists, already runs, and already goes red.**
`scripts/check-measured-stamps.mjs` fails when a stamped figure's declared `depends=` paths have moved
since the stamped commit. A stamp reading
`<!-- MEASURED: racer-types closure @ <sha> <date> depends=scripts/engine-reach.mjs,scripts/lib/routing.mjs,client/src/modules/racer-types/ -->`
would have gone red the moment `REGISTRY-LITERALS-1` landed. It fires in practice — three stamp
corrections on 2026-08-26, master red twice on CONTENDER-ZOOM day.

**The hole is not the guard, it is the stamping rate, and it is quantified.** The tree carries **11**
`MEASURED:` stamps across 36 living documents and 23,328 lines, in which I count **6,548** multi-digit
integers. The guard's own `blind` list says it plainly: *"any measured number that carries no stamp:
it checks the stamps that exist."* Nothing can decide which of the 6,548 has a machine-readable other
side; that is a judgement about what a sentence is claiming.

### 6 — Step 12's scope

**The standing statement.** `docs/SHIP-CEREMONY.md` step 12, pre-`7bb7dfe5`: *"…the ship is not
finished while they stand"*, inside a section titled THE SHIP ORDER, between steps that talk about
provisional SHAs and CI green for a tag.

**What moved underneath it.** Nothing moved — the PRACTICE outgrew the scope. A five-piece chain merged
six branches to master on 2026-09-02; four of the six minted nothing and tagged nothing (piece 1
explicitly decided no ship tag), so every scope cue read the step as out of scope and all six branches
stood at origin. `7bb7dfe5` corrects the wording in three places.

**What a check would have had to compare — and this is the interesting half.**
The *statement* side is a scope word. There is nothing to compare it to: no artifact in this
repository says which merges a documented step binds to. **Not mechanically available.**
Its *consequence* is a different question and is fully mechanical, and SHIP-CEREMONY already writes
the two sides out as shell:
Side A: `git ls-remote --heads origin | sed 's|.*refs/heads/||'` (`docs/SHIP-CEREMONY.md:334`).
Side B: `comm -23 <(git ls-tree -r --name-only origin/<branch> | sort) <(git ls-tree -r --name-only origin/master | sort)`
(`:346`). Empty output means master's tree holds every path the branch's tree holds.

**Mechanically available: YES, for the consequence.** Both sides are git plumbing, no judgement, and
the document already warns off the wrong method (a `master...branch` commit diff, which reported "safe
to delete" for `diag/runin-viable-1` on 2026-08-26 while the branch's TREE held
`client/src/modules/camera/panStaleZoom.test.js` that master had replaced).

---

## The subtypes

| | subtype | instances | catchable |
| --- | --- | --- | --- |
| **S1** | A hand-copied SET whose home is machine-readable, correspondence keyed by a shared field name | 2, 3 | **YES** — one rule |
| **S2** | A hand-maintained SUBSET that must COVER a computed set | 4 | **YES**, but the coverage relation has to be typed once — see the cost |
| **S3** | A document sentence stating what a command in this repository computes | 5 | **YES** — the guard exists; the sentence must opt in |
| **S4** | A SCOPE word in a procedure, wrong about which cases the procedure binds to | 6 | **NO** as stated; **YES** by its consequence |
| **S5** | A premise in code about the runtime identity of a value arriving as an argument | 1 | **NO** |

**S5 is not catchable and I am not going to manufacture a subtype that says otherwise.** Neither side
is a literal, the correspondence is semantic, and the repair's own reasoning shows that every form in
which the premise could be made machine-readable — a parameter, a flag, an annotation — recreates the
defect at the caller. The only defence is R7's property test on the promise, written by someone who
already doubts it.

**S4's statement half is not catchable either.** I could not construct any comparison for "does this
step's wording bind to the cases it should", because the second side does not exist as an artifact.
What is catchable is that the branches were left standing — and since the entire cost of instance 6
WAS the six standing branches, that is a full-value catch, not a consolation.

**I could not establish a population count for S4 or S5.** Scope words and premise comments are not
greppable; there is no lexical form they share. That un-enumerability is not incidental to their being
uncatchable, it is the same fact.

---

## The two rules

Both are rules inside existing guards, per R13. Neither is a new `check-*.mjs`.

### Rule A — a literal mirroring a declared home must agree with it, and the pairs are DISCOVERED, not listed

**Host: `scripts/check-fallback-agreement.mjs`.** It is already "a literal that mirrors a source of
truth must agree with it" (`config.k ?? 3` while the default says 5). It already carries an
`EXCEPTIONS` worklist keyed on (file, key, both values) that goes red when either side moves. It
already has a `--src=` seam so its own failure path can be tested without breaking the repository. The
rule widens WHICH home, not what the guard asserts.

Considered and rejected as hosts:
- `check-seed-versions.mjs` (`dirs: ["server/seeds/"]`) — reads the right SOT and routes on the right
  trigger, but its anchor is a version manifest and its failure message is about redelivery. Different
  message, different blind list; R13's own three-part test says that makes it a different guard.
- `check-config-claims.mjs` — `dirs: ["docs/","reports/"]`, wrong side of the tree entirely.

**What it reads.**
- Homes, all machine-readable, none of them typed into the guard as a value: the 20
  `client/src/modules/racer-types/*RacerType.js` literals; `server/seeds/tracks/*.json`;
  `client/src/modules/racerNames.js:39-110`; `client/public/assets/racers/*.png` IHDR.
- Copies: any `<field>: <literal>` or `<field> = <literal>` under `scripts/`, `client/scripts/` and
  `client/src/` outside the homes, where `<field>` is one of the field names **enumerated from the
  registry literal itself** — CENSUS-DUPES-1 established that this yields exactly 24 names and that
  four spellings (`name:`, `name =`, `"name":`, `'name':`) are needed.

**The design decision that keeps this from being the same defect one level up: the pairs are
self-enumerating.** The guard reads the registry's own keys, so a field added to a racer type is
covered without anyone editing the guard, and a field removed stops being scanned. There is no
correspondence table to go stale. `dirs` grows to `["client/src/","scripts/","client/scripts/"]`,
which is the hole CENSUS-DUPES-1 A11 already declares.

**What it asserts.** For each (file, field, id) copy, the literal equals the home's value. Track pairs
are the same rule with the id keyed on the track: a string that is a track id sitting beside a string
that is a racer id must equal that seed's `defaultRacerTypeId`.

**Which of the six it catches: 2 and 3.**
- Instance 2 — `fingerprint-default.mjs:153 "snail"` against `garden-path.json "beetle"`. Red on
  2026-08-25, the day the seed moved. Would also have caught `goldenRunner.mjs:93`,
  `sweep-bufferPct-driver.mjs:30`, `docs/ARCHITECTURE.md:438`, and the never-noticed
  `sweep-bufferPct-driver.mjs:31 city-circuit → buggy`, wrong since **2026-06-30, a week before the
  file was written**.
- Instance 3 — `audit-sprite-crops.mjs:27-28,30` against `HorseRacerType.js` and the PNG. Red on
  **2026-06-03**, the commit that introduced it, because it never agreed.

**False-positive rate, from counts in the tree rather than a guess.**

After the 2026-09-02 repairs, the live copy sites this rule would scan are:

| site | values |
| --- | --- |
| `scripts/sim-fairness.mjs:960-1101` | 100 (20×4 physical + 20 `surfaceClasses`) |
| `scripts/exp-roster-matrix.mjs:44-65` | 20 |
| `scripts/diag/acceptance-orders.mjs:32-73,82-85` | 44 |
| `scripts/diag/micro-divergence.mjs:52-93,104-107` | 44 |
| `scripts/exp-fairness-recheck.mjs:40-45` | 4 pairs |
| `scripts/exp-flapping-gate.mjs:29-34` | 4 pairs |
| `scripts/parity/goldenRunner.mjs` `SURFACE_TAGS` | 10 |
| **total** | **~226 values, 7 files** |

(`client/src/modules/headlessRaceSimulator.test.js:45-50,156-161` — 6 values — is dropped by the
guard's existing `*.test.*` exclusion. That is coverage lost, not a false positive.)

**Known false positives: exactly one site, 10 values, nameable before the rule ships.**
`goldenRunner.mjs` has a field called `surfaceClasses` that is deliberately a DIFFERENT fact — one
track-tag per type, six of ten differing from the registry field of the same name, documented at
`goldenRunner.mjs:163` and never read by anything. It becomes one `EXCEPTIONS` entry with a reason,
printed on every run per R11.

**Steady-state rate.** CENSUS-DUPES-1 compared 483 values across 24 copy sites and found exactly
**one** same-name-different-fact collision — 1 in 483, 0.2%. Scaled to 226 values that predicts under
one new false positive per full scan, and each one is a permanent exception entry rather than a
recurring cost. The precedent for that shape is already on the books: `check-config-claims` had to
declare `duration` unscannable by name because it is both an English word and a config key
(CONFIG-TRUTH-1, R11).

**What it stays blind to, and this must be in its `blind` list.** A fact not spelled the same in both
places (CENSUS-DUPES-1's own largest declared hole); a computed key or an assembled table; two
different names that ARE the same fact; and every value in a `*.test.*` file.

### Rule B — no branch stands at origin whose tree master already holds

**Host: `scripts/check-tags.mjs`.** It already asks origin for its refs (`git ls-remote --tags origin`,
`:96`), already fails loudly rather than blessing when the ref list cannot be obtained (`:100`, Lesson
187), already has a `--tags-file=` seam so its failure path is testable offline, and its subject is
already "an origin ref that nothing declares." Adding heads is one clause in `covers`, a `--heads-file`
seam mirroring the existing one, and one comparison.

**Its routing problem is already solved, in its own words.** `check-tags` declares:
*"A TAG PUSHED WITHOUT TOUCHING TAGS.md IS INVISIBLE TO ROUTING … The pre-commit hook and CI run it
unconditionally, which is where that case is caught."* A merge that leaves a branch standing touches
no file either. It inherits the fix.

**What it reads.** `git ls-remote --heads origin`; for each head other than `master`,
`git ls-tree -r --name-only` on the head and on `origin/master`. **The tree comparison, not the commit
diff** — SHIP-CEREMONY:346 owns the reason, and `diag/runin-viable-1` (2026-08-26) is the recorded
near-miss where the commit-diff method would have said "safe to delete" for a branch whose tree held a
file master had replaced.

**What it asserts.** No head at origin, other than `master`, has a tree that is a subset of master's.

**Which of the six it catches: 6.** It would have gone red at the FIRST of the six 2026-09-02 merges,
not at the end of the batch — which is exactly the correction `7bb7dfe5` had to make in prose.

**False-positive rate.** Origin carries exactly one head today (`git branch -r`: `origin/master` and
`origin/HEAD`), so the check is green now and the rule ships green. The historical population is the
six branches of 2026-09-02, the nine `CLEANUP-2026-08-26` swept, and the three that followed by the
next ship — every one of them a true positive. **Structural false positives: none I can construct.** A
branch with work master lacks fails the containment test and is not reported; a branch kept as
evidence is already forbidden by TAGS.md ("anything that must survive as evidence becomes an annotated
tag … never a branch"). The one live window is between a local merge and the origin-side delete,
measured in minutes, and that is precisely the moment the message is wanted. **Not verified by running:
origin no longer carries the historical branches, so I could not replay it.**

### No third rule, and no rule for instance 5

Instance 5 needs nothing built. It needs one `MEASURED:` stamp on
`docs/SHIP-CEREMONY.md:155-165` with `depends=scripts/engine-reach.mjs,scripts/lib/routing.mjs,client/src/modules/racer-types/`.
`check-measured-stamps.mjs` then owns it, runs it in the hook, in CI docs and in verify, and would
have gone red the day `REGISTRY-LITERALS-1` landed. **The general problem — which of 6,548 numbers in
36 documents deserve one of the 11 stamps — is a judgement, and I found no way to mechanise it.** Any
rule of the form "a prose sentence naming a command must be stamped" is a rule about what a sentence
means.

---

## What this does not close

- **Half the six were created by a correct repair moving one side of a pair.** Rules A and B fire on
  the SOT side as well as the copy side, so they see that trigger. Instance 1 shows the case where
  neither side has a side to fire on.
- **The rules add scanning ground, not judgement.** Neither can tell a stale statement from a
  deliberate one; both push that into an `EXCEPTIONS` entry a person writes and the guard prints.
- **I ran nothing.** Every count here is read from CENSUS-DUPES-1 (measured on `2c2f5ba9`,
  2026-09-02), from CENSUS-CHECKS-1 (same day), from guard `--declare` output, or from a grep I ran
  over the current tree. I did not re-verify all 226 values in Rule A's scan set, and the false-positive
  estimate rests on the census's 1-in-483 collision rate rather than on a trial run.
- **The largest hole is structural and belongs to the whole approach.** A grep-anchored rule cannot see
  a fact that is not spelled the same in both places. CENSUS-DUPES-1 declares this as its own largest
  limit, and Rule A inherits it whole.
