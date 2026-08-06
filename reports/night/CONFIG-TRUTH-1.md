# CONFIG-TRUTH-1 — the owner's values land, and documents stop stating numbers

**Branch:** `feat/config-truth-1` · **Base:** `master` @ `08bde75e` · **Date:** 2026-08-06 (unattended)
**Second branch, deliberately not merged:** `feat/min-racers-visible-5` @ `c57e37d4`

---

## 0. CONFORMITY — element by element, before any numbers

| Element of the brief                                                      | Status                                                                                                                                                        |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0(a)** merge `feat/clean-state-1`, merge commit only, prove containment | **DONE.** `08bde75e`, two parents; `e499897e` proved an ancestor of master.                                                                                   |
| **0(b)** disable squash merging, leave merge commits                      | **DONE.** Before/after in §1.2. **Rebase merging is still ON and has the same defect — §1.2, needs your word.**                                               |
| **0(c)** the CI run still owed on master — run it                         | **STILL OWED, and recorded as owed.** Actions is in a major outage; three attempts, all recorded. No local run treated as a substitute. §1.3.                 |
| **0(d)** what the two `feat/data-export-1` commits contain, in two lines  | **DONE.** §1.4. No action taken on that branch.                                                                                                               |
| **0(e)** delete other branches fully contained in master                  | **DONE.** `feat/clean-state-1` deleted. No tags touched (67, re-checked).                                                                                     |
| **1(a)** `minRacersVisible` → 5, with the STOP RULE resolved FIRST        | **STOP-RULE CASE, PROVEN BEFORE THE EDIT. Change made, NOT minted, NOT merged.** And it moves **two** fingerprints, not one — §2.1.                           |
| **1(b)** verify the `choreoOutcomeStart` premise from history             | **PREMISE CONFIRMED three independent ways.** Source unchanged. §2.2.                                                                                         |
| **2(a)** inventory every config claim, classified                         | **DONE.** §3.1 table.                                                                                                                                         |
| **2(b)** current claims: delete the number; reference or remove           | **DONE. 94 → 0.** Choice stated per site class in §3.2.                                                                                                       |
| **2(c)** dated historical rows stay and read AS history at point of use   | **DONE**, two mechanisms — a real date on the line, or a self-declared `HISTORICAL` document. §3.3.                                                           |
| **2(d)** KRAEFTE-LANDKARTE's header promise                               | **DONE**, and my own earlier characterisation of that promise corrected. §3.4.                                                                                |
| **2(e)** the guard, sabotaged both ways, stating its own limits           | **DONE.** Both sabotages are tests. §3.5.                                                                                                                     |
| **2(f)** the count after                                                  | **0 current claims**, 43 dated rows, 9 self-declared historical documents. §3.6.                                                                              |
| **3** living-config trap — findings and ONE proposal, **no UI change**    | **DONE, nothing built.** §4.                                                                                                                                  |
| Never modify the engine-reach hull                                        | **RESPECTED.** `engine-reach.mjs` untouched; closure unchanged at 19 files.                                                                                   |
| No race series                                                            | **RESPECTED.** Only the three fingerprints, which are gates.                                                                                                  |
| World and render fingerprints byte-identical                              | **On this branch, YES** — §5. On the `minRacersVisible` branch the RENDER fingerprint MOVES, which contradicts the standing rule; that is why it is separate. |
| Camera fingerprint printed, with whether it moved and why                 | **DONE**, both branches. §5.                                                                                                                                  |
| No eye test; anything needing one is a finding and a stopping point       | **RESPECTED.** `minRacersVisible` needs one. It stopped.                                                                                                      |
| Format → measure → commit; one change per commit; push at boundaries      | **RESPECTED.** Four commits here, one there.                                                                                                                  |

**Decisions I made alone, all justified in place:** splitting the fingerprint-moving change onto its
own branch (§2.1); reusing `check-doc-links`'s living-doc predicate instead of writing a second one
(§3.5); adding `duration` to the guard's unscannable list rather than rewording a true sentence
(§3.5); marking nine documents HISTORICAL rather than stripping their numbers (§3.3); clearing the
Windows HIDDEN attribute on ten tracked files (§3.7).

---

## 1. STAGE 0 — the tree

### 1.1 The merge

| what              | value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| merge commit      | `08bde75e`                                                                |
| parents           | `25baefd4` + `e499897e` — **two**, so not a squash and not a fast-forward |
| containment proof | `git merge-base --is-ancestor e499897e master` → **CONTAINED ✓**          |
| method            | `gh pr merge 132 --merge`                                                 |

### 1.2 Repository settings — and one thing left open

| setting              | before   | after                  |
| -------------------- | -------- | ---------------------- |
| `allow_merge_commit` | **true** | **true** (unchanged)   |
| `allow_squash_merge` | **true** | **false** ← the change |
| `allow_rebase_merge` | **true** | **true** (unchanged)   |

In words: **squash merging is now off; merge commits remain the way in.** The reason it mattered is
concrete — the stamp in `docs/CAMERA_DIRECTOR.md` names commit `3e756a31`, which lived only in branch
history, and a squash would have destroyed that SHA and turned `check-measured-stamps.mjs` red on
master for a real reason.

**REBASE MERGING IS STILL ENABLED AND HAS THE SAME DEFECT.** A rebase merge rewrites every commit, so
`3e756a31` would not survive it either. Your authorisation named squash, so I did not touch it. **This
is one of the decisions at the end.**

### 1.3 The CI run owed on master — STILL OWED

**Not closed, and not substituted.** GitHub Actions has been in a major outage since 15:22 UTC;
githubstatus.com at 18:46 UTC: _"Workflow runs are still failing, and jobs may remain queued for an
extended period before starting or may time out."_

| attempt                                | result                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| The merge push itself (`08bde75e`)     | **No workflow run was created at all.**                                                                                             |
| `gh run rerun 31126142888`             | Accepted; the earlier attempts died with _"the job was not acquired by Runner of type hosted"_ after 15 min without running a step. |
| A manual dispatch                      | **Impossible** — `ci.yml` has no `workflow_dispatch` trigger. Proposal P3.                                                          |
| Run `31125974893` on master `25baefd4` | **Queued for 75+ minutes** at the time of writing.                                                                                  |

A monitor is armed on master. **I ran both jobs locally and I am NOT counting that as the verdict** —
it is recorded in CLEAN-STATE-1 §1.5 and it does not cover the Linux environment or coverage.

### 1.4 `feat/data-export-1` — what the two commits contain (no action taken)

**`fe40a8f8`** adds `scripts/data-export.mjs` (~200 lines) plus an `npm` script, a
`server/data/README.md` and a BACKLOG entry: one command that boxes up the server data directory —
the only irreplaceable state — into a dated archive.
**`0325fb36`** adds a `--minimal` flag (24 lines) that excludes `sessions.sqlite` and nothing else, so
the archive can skip the one regenerable file.

Untouched: not merged, not deleted, no PR opened. **Yours to decide.**

### 1.5 Branches deleted

`feat/clean-state-1` (`e499897e`), verified fully contained first, deleted at origin and locally.
**No tag deleted** — `check-tags` reports 67 before and after, 0 unregistered.

---

## 2. STAGE 1 — the two owner decisions

### 2.1 `minRacersVisible` 3 → 5: the STOP RULE fired, and wider than the brief expected

**The determination came BEFORE the edit, from the code path, not from the result:**

| evidence                             | what it shows                                                  |
| ------------------------------------ | -------------------------------------------------------------- |
| `scripts/camera-fingerprint.mjs:83`  | passes `DEFAULT_CAMERA_CONFIG` straight to the director        |
| `scripts/render-fingerprint.mjs:253` | **also** constructs a `CameraDirector` with it                 |
| `CameraDirector.js:471`              | reads `minRacersVisible` into `_minRacersVisible`              |
| `CameraDirector.js:1937,1960`        | uses it as the company-guarantee zoom **ceiling**              |
| `CameraDirector.js:2350`             | retires the guarantee at `1 + minRacersVisible` finishers home |

So the harness does read the default → **this is a re-mint.** Measured:

| role   | before             | after (`minRacersVisible: 5`) | verdict            |
| ------ | ------------------ | ----------------------------- | ------------------ |
| world  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb`            | **byte-identical** |
| camera | `00cafa2432add0f7` | **`cadb8d5e231ba0ac`**        | **MOVED**          |
| render | `1f83ecc1fcb6fa9a` | **`d23ae7571a06a8a4`**        | **MOVED**          |

**The render move is the part the brief did not anticipate.** It named the camera as the one
fingerprint that might legitimately move and required render to come out byte-identical. Both cannot
hold: the render harness builds a real `CameraDirector`, so any change to the shot changes the draw
call transform on every sampled frame. Per the standing rule that is **a finding and a stopping
point**, not something to edit around.

**Nothing was minted.** `docs/fingerprints.json` still carries the old values on purpose;
`check-fingerprints --mint` will fail on that branch, correctly — the tripwire working.

**Decision made alone: it lives on its own branch, `feat/min-racers-visible-5`.** The brief said do
not merge; it did not say which branch. Keeping it beside this block's document work would hold
finished, safe work hostage to a ceremony that needs your eye.

**One thing measured that the ceremony will want:** the full client suite passes with the new value —
**179 files, 3649 tests, 0 failures.** No test asserted the old default, so nothing has to be
re-blessed.

### 2.2 `choreoOutcomeStart` — the premise verified, not trusted

The brief told me 0.6 shipped and asked me to check rather than believe it. **Three independent
confirmations:**

1. **At the mint commit itself.** `git show 3518ee0b:client/src/modules/storage/defaults.js` →
   `choreoOutcomeStart: 0.6`. The world fingerprint `dc4647be0f55ebdb` was minted from that tree.
2. **No change since.** `git log -L` on that exact line returns two commits, `2026-07-22` and
   `2026-07-23` — both **before** the 2026-07-31 mint. Nothing has touched it since.
   (My first attempt used `git log -S`, which only sees changes in the COUNT of a string and would
   have missed a value edit on the same line. That query was insufficient and I redid it.)
3. **It reproduces today.** The current source yields exactly `dc4647be0f55ebdb`, and the key is
   engine-reachable — `racePlanner.js:168` consumes it as the PULK-end fraction.

**Conclusion: the four documents were wrong, the source is right, and the source was not touched.**
The claims are fixed under stage 2's rule, not by editing a number to another number.

---

## 3. STAGE 2 — documents stop stating config values

### 3.1 (a) The inventory, classified

Measured by `node scripts/check-config-claims.mjs --inventory` over all tracked `*.md`.

| class                                                                  | at the start | now       |
| ---------------------------------------------------------------------- | ------------ | --------- |
| **CURRENT CLAIM** — a living document stating a value as today's       | **94**       | **0**     |
| **DATED HISTORICAL ROW** — a line carrying its own `YYYY-MM-DD`        | 36           | 43        |
| **Self-declared HISTORICAL document** — whole file marked              | 0            | **9**     |
| Out of scope — `reports/`, results trees (the append-only lab journal) | not counted  | unchanged |
| Named exceptions — `docs/TAGS.md`, `docs/AUDIT.md`                     | —            | 2         |

The 94 current claims sat in 11 living documents: ARCHITECTURE (24), KRAEFTE-LANDKARTE (20), SIM (15),
BACKLOG (10), PHASE-CONTRACT (8), RACE-ACTION (7), LESSONS (5), CAMERA_DIRECTOR (2), and one each in
ROADMAP, RACER_DATA_MODEL and CONCEPT-COHESION.

> **A correction to CLEAN-STATE-1's headline.** That report said "seven keys". Seven were _wrong_.
> Ninety-four were _stated_, and the rule the owner asked for is about stating, not about being
> wrong — because a correct copy is still a copy that has to be kept in step.

### 3.2 (b) What I chose per site, and why

| site class                                                                   | choice                               | why                                                                                                                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Config (storage/defaults.js): key (0.1), key (8), …`                        | **keep the names, drop the numbers** | These lines already pointed at the home and then restated it anyway. The reader needs to know `pulkLeaderBrake` is the lever, not its value this week. |
| Prose explaining a mechanism — "eases in over `avoidanceWarmupMs` (3000 ms)" | **keep the name, drop the number**   | The sentence is about the mechanism; the number added nothing it did not already have a home for.                                                      |
| A number with no key beside it — "+4%", "−10 percent"                        | **removed entirely**                 | The brief's default. It is a restatement of a value under another notation, and drifts the same way.                                                   |
| Sim CLI examples — `--avoidanceWarmupMs=800`                                 | **placeholder** `=<ms>`              | The example teaches the flag. The literal read as a default and was not one — this was CLEAN-STATE-1's "ambiguous" case, now removed.                  |
| A quoted ternary — `` `r.draftingBoostActive ? draftingBoost : 1.0` ``       | **paraphrased**                      | Code, not a claim — but a lexical guard cannot tell, and paraphrasing is better anyway: the code may change, the statement of intent will not.         |
| Historical narration in BACKLOG / LESSONS / ROADMAP                          | **dated, not stripped**              | See 3.3.                                                                                                                                               |

73 replacements across 11 documents, applied under `scripts/prove-changed.mjs` with a
**validate-all-anchors-first** pass: every anchor had to match exactly once, and nothing was written
unless all did.

### 3.3 (c) History stays, and now says so at the point of use

Two mechanisms, both visible to a reader in the same place the guard reads them:

1. **A real date on the line.** Seven narrations in BACKLOG, LESSONS and ROADMAP now carry the date
   they describe. **Every date was read from git, never invented** — `2026-04-29` (PR #37),
   `2026-05-14` (free-lane separation), `2026-05-31` (`b5947b2`, Lesson 106), `2026-06-04`,
   `2026-05-06` (Phase 4), `2026-07-20`.
2. **A whole-document declaration**, for the nine files that are archives rather than references:

   ```
   <!-- HISTORICAL: 2026-05-06 — camera-tuning diagnosis written against the
        pre-corridor zoom model; its numbers are that model's -->
   ```

   plus a one-line blockquote saying the same in prose, because a reader does not read HTML comments.
   The nine: `CAMERA_TUNING_DIAGNOSIS.md`, `SPEED_REFACTOR_ANALYSIS.md`, `STAGE-CLEANUP.md`,
   `diag/render-smoothness-measurements.md`, `phase-2n/{TUNING_LOG,ALGORITHM}.md`,
   `diagnose/{free-lane-firing-summary,camera-inventory-2026-05-14,cleanup-audit-pr98}.md`.
   Dates are each file's **first** commit, not its last — several were touched this week by the
   fingerprint sweep, which would have dated them today and said nothing true.

   It is deliberately **not** a directory glob: someone has to write the date and the sentence, which
   is the smallest possible act of taking responsibility for calling a document history.

`docs/TAGS.md` and `docs/AUDIT.md` are **named exceptions with reasons instead**: both are LIVE
registers of historical facts — new tags and new audit rows keep arriving — so a whole-document
HISTORICAL mark would be a lie about them.

### 3.4 (d) KRAEFTE-LANDKARTE's header — and a correction to my own earlier claim

**First, the correction.** CLEAN-STATE-1 said its header "promises every value is verifiable against
source". It does not. It says _"Every force is backed by a source line so it can be verified against
the source"_ — a promise about **source lines per force**, which was true and is kept. My paraphrase
was stronger than the text.

**The real defect is that it READ like a promise about the numbers**, and nothing was checking those,
which is how five wrong ones lived there. So I took the second option: the document now says plainly
what it guarantees (the structure, and a source line for every force) and what it does not (values),
names where values live, and names the guard that keeps it honest. Making the old sentence "true"
was not available — it already was.

### 3.5 (e) The guard, and both sabotages

`scripts/check-config-claims.mjs`. **It fails on ANY stated value, not only a wrong one** — the
decision that makes it worth having. A guard that failed only on disagreement would pass a correct
copy, and would go _quiet_ the moment a default moved. Failing on any stated value is what makes
"changing a default cannot make a document stale" TRUE.

| sabotage                             | expected | result                                                                  |
| ------------------------------------ | -------- | ----------------------------------------------------------------------- |
| Paste a config value into a document | **FAIL** | Fails, naming file, line and key. `docs/GUIDE.md:3 … minRacersVisible`. |
| Change a default, touch no document  | **PASS** | Passes, `0 current claim(s)` — the point of the whole rule.             |
| A value that MATCHES source          | **FAIL** | Fails. A correct copy is a copy.                                        |
| A dated row / a HISTORICAL document  | **PASS** | Both allowed, and counted separately in the summary line.               |
| Zero documents / zero keys           | **FAIL** | Loud, per Lesson 187.                                                   |

Both sabotages are **tests**, not one-off runs, so they cannot silently stop being true. Reverts are
automatic — every fixture is a temp directory with its own `git init`, removed in a `finally`, and
nothing tracked is written (Lesson 205).

**What it states about itself, in its header and in its own output line:**

> `(Stated NUMBERS only — it does not check prose, values stated away from their key, or the 3 keys named in UNSCANNABLE_KEYS.)`

The biggest hole, said plainly: **a value stated away from its key** — "the re-roll stops at 80% of
the race" names no key and is invisible. That is inherent to a lexical guard.

**On the planner's proposal 3 — I built the NARROW version, and here is what it misses.** The broad
rule (any number within N characters of a key name) fires on prose that merely discusses a knob. I
did not have to speculate about the false-positive rate: the narrow rule alone produced two, and both
would have pushed a person to damage a document —

- `duration(M) = duration(1) / M` is a **formula**. Fixed in the guard: the parenthesised shape now
  requires a space, so `key (0.6)` matches and `duration(1)` does not.
- "the minimum tested duration is 30 seconds" is a statement about **test coverage**. `duration` is an
  English word as well as a real key, so it joined `min` and `max` in `UNSCANNABLE_KEYS`, by name and
  with its reason. **I was one edit away from rewording a true sentence to appease a guard, which is
  exactly the L206 failure.** Those keys' real claims were fixed by hand and are NOT enforced.

**Wired into all three places** — the CI docs job, the pre-commit fast-guard list, and `verify`'s
doc-guards — because a guard in only one of them is a guard someone can route around without noticing.

### 3.6 (f) The count after

```
check-config-claims: 157 keys, 51 living document(s) (9 self-declared HISTORICAL and skipped),
0 current claim(s), 43 dated row(s) allowed.
```

**Zero claims remain in any living document.** What remains, and where: 43 dated rows (allowed, and
readable as history); 9 self-declared historical documents; `docs/TAGS.md` and `docs/AUDIT.md` by
name; everything under `reports/` and the results trees, which are the lab journal and were never in
scope. Three keys — `min`, `max`, `duration` — are **not checked at all**.

### 3.7 A trap found on the way, worth more than the edit

The first marking run died with `EPERM` on `docs/diagnose/free-lane-firing-summary.md`. Not a lock and
not transient: **ten tracked files in `docs/diagnose/` carry the Windows HIDDEN attribute** (OneDrive
dehydrated placeholders), and Windows refuses to open a hidden file for write. They were **readable**,
so every guard that READS them worked perfectly and only a WRITE ever revealed it. Attribute cleared
on all ten. Git does not track attributes, so this is invisible in the diff — which is why it is in
the commit message and here.

This is the same family as CLEAN-STATE-1's `UNKNOWN: -4094` on `SIM.md`: **on this machine, a tracked
file being readable is not evidence that it is writable.**

---

## 4. STAGE 3 — the living-config trap. FINDINGS AND ONE SKETCH. NOTHING BUILT.

### 4.1 (a) What a stored config can shadow, and what would have to happen for a new default to reach him

**198 top-level keys across 7 families**, all with the same rule — defaults underneath, stored values
on top, **per key**:

| family                         | keys   | localStorage key               | on invalid stored data           |
| ------------------------------ | ------ | ------------------------------ | -------------------------------- |
| `DEFAULT_CAMERA_CONFIG`        | **75** | `racearena:cameraConfig`       | **no reset** — key-by-key merge  |
| `DEFAULT_RACE_DYNAMICS_CONFIG` | **60** | `racearena:raceDynamicsConfig` | whole object rejected → defaults |
| `DEFAULT_RACE_BEHAVIOR_CONFIG` | **45** | `racearena:raceBehaviorConfig` | whole object rejected → defaults |
| `DEFAULT_RACE_DEFAULTS`        | 10     | `racearena:raceDefaults`       | —                                |
| `DEFAULT_BASE_SPEED_CONFIG`    | 3      | `racearena:baseSpeedConfig`    | whole object rejected → defaults |
| `DEFAULT_ROW_LAYOUT_CONFIG`    | 3      | `racearena:rowLayoutConfig`    | —                                |
| `DEFAULT_FRAME_TIMING_CONFIG`  | 2      | `racearena:frameTimingConfig`  | whole object rejected → defaults |

**What would have to happen for a new default to reach his browser — the honest answer is one of
exactly three things**, and none happens by shipping code:

1. He has **never saved** that config family. Then the default governs. Unlikely for the camera:
   `saveCameraConfig(config)` writes `{ ...config }` — the **whole resolved object**, not a delta —
   so one Dev Screen save of any camera setting pins all 75 keys at once, permanently.
2. He **clears** the relevant `localStorage` key (DevTools, or a browser data reset).
3. He **retypes the value himself** in the Dev Screen.

There is no fourth. Shipping a new default changes nothing he sees, silently, forever.

### 4.2 (b) Which past verdicts are now ambiguous — listed, not re-opened

All five approvals in `CAMERA_DIRECTOR.md §8.1` were given in his browser on 2026-08-05, against
whatever his stored camera config held that day.

| his verdict (2026-08-05)                                   | ambiguous?                                | why                                                                                                                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"`minRacersVisible` stays at 5"**                        | **YES — the sharpest case**               | He judged the picture at **5**; the code shipped **3**. His approval has been read since as approval of the shipped picture, and it was not that picture.                                   |
| **The company guarantee retires once the company is home** | **YES**                                   | The retirement threshold is literally `1 + minRacersVisible` (`CameraDirector.js:2350`). At his 5 it retires when 6 are home; at the shipped 3, when 4 are. Different behaviour, same code. |
| **The road no longer bounds the leader shot**              | **PARTLY**                                | The verdict is explicitly about his own zoom setting, which is stored — that part is fine. But the COMPANY guarantee shares the shot, and its strength is `minRacersVisible`.               |
| **The finish pause, the travel and the resting point**     | **YES, and the document already says so** | Its own evidence column reads "His photo-finish settings" — he judged stored values, not defaults.                                                                                          |
| **The finish is ONE motion**                               | **PROBABLY NOT**                          | The measured defect was a 2708 px → 72 px change in per-frame pan motion. A stored glide duration changes the ease, not whether there is a step.                                            |

**None re-opened.** Stage 1(a) makes the source agree with him on `minRacersVisible`, which removes
the first two ambiguities going forward — once the ceremony and his eye clear it.

### 4.3 (c) One mechanism, at sketch level. NOT BUILT.

**Sketch: a "pinned" badge and a per-key reset in the Dev Screen, plus one summary line.**

- Every Dev Screen control whose resolved value came from storage shows a small **`pinned`** marker
  and the shipped default beside it (`pinned · ships 3`). `cameraConfigProvenance()` already computes
  exactly this, per key — it returns `'stored' | 'default'` for all 75 camera keys and is used today
  for two of them.
- Clicking the marker **deletes that one key** from the stored object, so the shipped default takes
  over on the next load. Per key, not a wipe: a global reset would cost him every setting he has
  tuned, which is the thing the no-schema decision was made to stop.
- One line at the top of each config card: **"12 of 75 values are pinned to your saved settings."**

**Why this shape.** It answers both halves of the trap — _visible_ (a marker where he is already
looking) and _resettable_ (without losing the rest) — and it needs no new state, because the
provenance function exists and is already called at race start.

**Not built, on purpose.** This is his screen; anything he would see needs his eye first, and the
brief said so. It is a sketch and nothing else.

---

## 5. VERIFICATION

`npm run verify` chose its own work and printed every skip with its reason:

```
VERIFY — 32 changed file(s) vs master
  WILL RUN:  doc-guards · fingerprint-containment · script-suite
  SKIPPED, and why:
    client-suite        nothing matched — covers anything under client/ EXCEPT e2e
    world-fingerprint   nothing matched — covers any file the race engine can reach
    camera-fingerprint  nothing matched — covers the camera director and its modules
    render-fingerprint  nothing matched — covers anything that can reach a ctx. call
  PASS 3   FAIL 0   SKIP 4
```

**Those four skips are correct and independently confirmed:** no `client/` file changed on this
branch at all, and `node scripts/engine-reach.mjs --check` on the whole 32-file diff reports _"none of
32 path(s) can reach the race engine"_. The fingerprints were nevertheless measured in full, because
the brief asked for them printed:

| role       | `feat/config-truth-1` | record             | verdict            |
| ---------- | --------------------- | ------------------ | ------------------ |
| **world**  | `dc4647be0f55ebdb`    | `dc4647be0f55ebdb` | **byte-identical** |
| **camera** | `00cafa2432add0f7`    | `00cafa2432add0f7` | **byte-identical** |
| **render** | `1f83ecc1fcb6fa9a`    | `1f83ecc1fcb6fa9a` | **byte-identical** |

**Did the camera fingerprint move?** On this branch, **no** — nothing here touches the camera, and it
was measured rather than assumed. On `feat/min-racers-visible-5` it **does** move, to
`cadb8d5e231ba0ac`, **and so does render**, to `d23ae7571a06a8a4`, for the reason in §2.1. That branch
is not merged and nothing was re-minted.

**CI:** PR #133 opened, because this block touches CI, the commit hook and the verify path (R8
exception 1). Queued behind the Actions outage.

---

## 6. TESTS, AND DUPLICATES STILL STANDING

**Tests added: 7. Tests deleted: 0.** All in `scripts/check-config-claims.test.mjs`, each against a
real fixture repository with a real `git init` — a mocked filesystem would only prove the mock.

| test                                     | what breaks if I delete it                                                                                 | what goes unnoticed if it is missing                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| SABOTAGE: a value pasted into a document | The guard could stop failing entirely and every other test here would still pass — they all assert passes. | The defect it was built for: a number in a sentence with no owner.                          |
| SABOTAGE PAIR: default moves, docs clean | Nothing enforces that a default may move freely.                                                           | A guard that quietly re-couples documents to source, so changing a default breaks the docs. |
| A matching value still fails             | The guard could be narrowed to "wrong values only".                                                        | A correct copy rotting the next time the default moves.                                     |
| History, both mechanisms                 | A dated row or an archive becomes unfixable except by deleting its record.                                 | The guard pushing people to destroy history to appease it — the L206 failure.               |
| It does not check prose                  | The header could claim a limit the code no longer has.                                                     | Someone trusting it to check that the prose is TRUE.                                        |
| Zero documents / zero keys               | The guard can scan nothing and print a green line.                                                         | A rename silently disabling it — the no-op trap paid for twice already.                     |
| Scope: `reports/` is out of scope        | The guard could creep into the lab journal and demand it be rewritten.                                     | Silent scope drift away from `check-doc-links`'s definition.                                |

### Duplicates still standing, named

| duplicate                                                      | count                        | status                                                                                                                       |
| -------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **"ten tracks"**                                               | **10 living documents**      | Unfixed. Derivable from `server/seeds/tracks/*.json` (10). Planner proposal 2.                                               |
| **"band-reach ≥ 70%"** — the fairness gate                     | **12 living documents**      | Unfixed. `docs/FAIRNESS.md` is the declared canonical home; the other 11 restate it.                                         |
| **`REFERENCE_FPS`**                                            | 7 living documents           | Unfixed.                                                                                                                     |
| **The racer-type roster size**                                 | 7 living documents           | Unfixed; the registry is the source.                                                                                         |
| `min`, `max`, `duration` config values                         | unknown — **not scanned**    | Three keys the guard cannot check, by name, with reasons. Their known claims were fixed by hand.                             |
| Values stated away from their key ("stops at 80% of the race") | unknown — **not detectable** | The guard's biggest hole, stated in its header.                                                                              |
| Three camera **code fallbacks** disagreeing with `defaults.js` | 3 keys                       | Source-vs-source, not a document problem. Documented at `CAMERA_DIRECTOR.md`, guarded by nothing.                            |
| Tracking-lag figures repeated in 3 source comments             | 3 sites                      | Unchanged from CLEAN-STATE-1: they justify a past A/B, and editing `defaults.js` comments adds fingerprint risk for no gain. |
| Stale `CAMERA_DIRECTOR.md` section references (§6.2 … §13.1)   | 6 references                 | Pre-existing, disclosed by three blocks now.                                                                                 |

---

## 7. WHAT I DID NOT DO, AND WHY

- **I did not merge `feat/min-racers-visible-5`, and did not re-mint anything.** The stop rule, and
  L191 — a change to what he sees needs his eye.
- **I did not treat the local CI run as the master verdict.** The brief forbade it and it would have
  been false: local runs do not cover the Linux environment or coverage.
- **I did not disable rebase merging.** Your authorisation named squash. It has the same defect.
- **I did not touch `feat/data-export-1`.** Described in two lines, nothing else.
- **I did not build anything for Stage 3.** Sketch only; it is his screen.
- **I did not reword true sentences to satisfy the guard.** Two would-be false positives were fixed
  in the guard instead, one by tightening a shape and one by declaring a key unscannable.
- **I did not extend the rule to roster/track/gate counts.** Named with counts above; the brief said
  not to fix them here.
- **I did not strip numbers from `reports/`, `TAGS.md` or `AUDIT.md`.** They are history by
  construction and rewriting them is forbidden by the repo's own append-only rule.

---

## 8. PROPOSALS

**P1 — the smallest honest ceremony for `minRacersVisible` (the planner's proposal 1, TAKEN).**
One re-mint of the two fingerprints that moved, **two contrasting tracks rather than ten**
(mountainstreet as the spread case his verdict came from, and searound as the closed contrast), and
**one eye test on the state this knob actually governs** — the company guarantee, watched in the two
regimes he named: a torn-apart field and a tight pack. Not a ten-track pass: the knob is a zoom
ceiling, the fingerprints are the regression net, and his eye is being asked one question, not ten.
The render fingerprint must be re-minted with the camera one — that is new, and it is why the
ceremony's fingerprint list should say "camera implies render" out loud.

**P2 — `docs/FAIRNESS.md` and the track count are the next one-truth targets, in that order.**
"Band-reach ≥ 70%" appears in **12** living documents and `FAIRNESS.md` is already declared its
canonical home; "ten tracks" appears in **10** and is derivable from `server/seeds/tracks/`. The
machinery is now generic — this guard reads a source and fails on restatement — but the second is a
GENERATED-count problem rather than a containment one, so it wants `gen-engine-reach-doc.mjs`'s shape,
not this guard's. Worth one block, not two.

**P3 — give `ci.yml` a `workflow_dispatch` trigger.** Today, when Actions half-recovers, there is no
way to ask for a run: the merge push created none, and re-running a dead run inherits its broken
state. Three lines, no behaviour change, and it would have turned this block's open item into a
closed one.

**On the planner's proposal 3 — TAKEN, narrow version, and §3.5 says exactly what it misses.** The
narrow rule already produced two false positives in one afternoon, both of which would have pushed a
person to damage a true sentence. The broad rule would produce many more.

---

## 9. PLAIN LANGUAGE, FOR THE OWNER

**Did the camera fingerprint move?** **Not on the branch you can merge.** On that branch nothing under
`client/` changed at all, and all three fingerprints are byte-identical — measured, not assumed.

**But your `minRacersVisible` = 5 does move it, and it moves a second one too.** The camera goes
`00cafa24…` → `cadb8d5e…` **and the render fingerprint goes `1f83ecc1…` → `d23ae757…`**, because the
render harness builds a real camera. I checked that BEFORE making the edit, made the change, measured
it, minted nothing, and left it on its own branch `feat/min-racers-visible-5`. It is waiting for you.
The good news: all 3649 client tests pass with it, so nothing else has to change.

**Is master green, under a real CI verdict?** **No — and it is not the code's fault.** GitHub Actions
has been broken all evening; jobs sit queued for over an hour and then die without running a single
step. I tried three ways, including one that is impossible today because the workflow has no manual
trigger. **This is still owed**, I have not pretended otherwise, and a watch is running.

**What changed in the documents.** Ninety-four places where a document stated a config number now
state the knob's NAME and nothing else. Your `KRAEFTE-LANDKARTE.md` had twenty of them, five wrong.
Nine old diagnostic documents now say, on their second line, that they are history and what date they
describe. A guard fails the build if a number comes back.

**What you have to decide:**

1. **The `minRacersVisible` ceremony.** It needs one re-mint and one eye test — my proposed shortest
   version is in P1. Nothing merges until you say so.
2. **Rebase merging.** I turned squash off as you asked. Rebase is still on and destroys commit SHAs
   the same way. Shall I turn it off too?
3. **`feat/data-export-1`** — two commits: a `data-export` command that archives the server data
   directory, plus a `--minimal` flag that skips `sessions.sqlite`. Finish it, merge it, or delete it?
4. **The next one-truth target** — "band-reach ≥ 70%" is restated in 12 documents and "ten tracks" in 10. Worth a block, or leave them?
