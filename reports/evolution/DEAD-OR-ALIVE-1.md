# DEAD-OR-ALIVE-1 — five of the six suspected-dead items are ALIVE, one is half dead, and `reports/perf` has more readers than the census found

**Date:** 2026-09-02 · **Scope:** read-only. Nothing in the repository was created, edited, renamed,
staged, committed or deleted. No branch was made. The only file written is this one, in the session
scratchpad. Four scripts were RUN — `scripts/phys-bench-fit.mjs`, `scripts/diag/aim-levers-sum.mjs`,
`scripts/diag/runin-level-set-sum.mjs`, `scripts/check-fallback-agreement.mjs`, plus
`scripts/check-doc-links.mjs` and `scripts/check-index.mjs --declare` — each verified read-only
before invocation (`grep -l "writeFileSync\|mkdirSync\|rmSync"` returns nothing for the four
summariser/fit scripts).

**Source of the list:** `reports/evolution/CENSUS-REMOVABLE-1.md`, section "LOOKS DEAD, NOT PROVEN"
(commit `2a9b6b5d`, merged `6f2d780c`, 2026-09-02 00:43). The six rows are taken verbatim from that
table; none was invented.

---

## THE VERDICT TABLE

| # | item | verdict | the one line that settles it |
| --- | --- | --- | --- |
| 1 | The 11 zero-reference `scripts/diag/` runners and summarisers | **ALIVE** | Every one of their default scratch paths **exists on disk with data** (`c:/tmp/lev/s1`, `c:/tmp/late-lead-hunt/p1,p2`, `c:/tmp/lb/before,after`, `c:/tmp/runin-cg/p1,p2`, `c:/tmp/runin-contenders`, `c:/tmp/runin-level/p1,p2`, `c:/tmp/late-lead-axis.json`), and re-running two summarisers today **reproduces the published tables in `AIM-LEVERS-1.md` and `RUNIN-LEVEL-SET-1.md` digit for digit**. |
| 2 | The 19 instruments HARNESS-CAMERA-SEED-1 declared VOID | **ALIVE** | The census named one discriminator — "if the default moves to a per-race derived camera seed, none of these is dead". **It moved on 2026-08-27**, merged `63ab59d8`, six days before the census, and is an ancestor of the census commit. `scripts/lib/raceDriver.mjs:100` now reads `cameraSeedForRace(partial.raceSeed ?? 5601)`. All 19 call `resolveIdentity` and none pins `cameraSeed`. |
| 3 | `reports/perf` raw chains (315 machine-output files) | **ALIVE in 5 files, unread in 310** | `phys-bench-fit.mjs` reads **five** files by default, not one: `matrix.json` (:41, unguarded — a hard crash if absent) and four `profiles/prof-{chain,master}-n{30,100}.selftime.json` (:209, wrapped in `try/catch` — a **silent** loss of section Q4). Two `.md` files are additionally load-bearing for `check-doc-links`. See the dedicated section. |
| 4 | The 8 one-shot sprite generators | **6 DEAD, 2 ALIVE** | Four cannot be run: their source images were deleted by `456a0f65` (2026-06-04, "chore: remove orphaned sprite source files") the **day after** the generators were written. Two more are destructive in place and would **corrupt tracked art** if run against today's tree. `gen-aquatic-masks.mjs` and `gen-koi-patterns.mjs` take no input and reproduce their committed output. |
| 5 | `client/scripts/sweep-bufferPct-driver.mjs` | **ALIVE** | The census's "2026-07-07, never touched" is stale. `git log` shows a **second commit, `a6030929`, 2026-09-02** — FINGERPRINT-TRACK-DEFAULTS-1 repaired the two wrong track/racer pairings CENSUS-DUPES-1 had found in it. A file being fixed is not a file being abandoned. |
| 6 | ~60 lines of removed-entry commentary in `check-fallback-agreement.mjs` | **ALIVE as record** | The array is empty at runtime — confirmed by running the guard: `0 disagree (0 on the exception list, 0 new)`. It is **107 lines**, not ~60. Nothing executes; the prose is the only record of why each mirror was safe to delete. The census's own verdict — leave it alone — stands, and is now measured rather than asserted. |

**Split: 5 ALIVE, 0 DEAD as whole items, 1 split (6 of its 8 members dead).** Zero items are STILL
UNPROVEN. Two of the five clearances (items 2 and 5) come from facts that existed **before the census
was written** and were missed; three (items 1, 3, 4) come from evidence a reference graph cannot
reach — the scratch filesystem, running the tool, and the git history of its inputs.

**None of the six reaches the engine.** `node scripts/engine-reach.mjs --check` returns **exit 1** for
`scripts/diag/aim-levers-sum.mjs`, `client/scripts/sweep-bufferPct-driver.mjs`,
`scripts/gen-beetle-sprite.mjs` and `reports/perf/phys-bench-1/matrix.json`. Removing any of them
cannot move the shipped world. The whole of this question is instrumental.

**The greps were proved against a control.** `git grep -n "analyze-camera-log"` — the census's own
named live instrument — returns `client/src/modules/diagnostics/analyzeFrameLog.test.js:2`, an import.
The same command shape returns zero for the eleven names in item 1, so the zero is a measurement and
not a mistyped search.

---

## ITEM 3 · `reports/perf` — what reads it, how often, and what a summary would break

### (a) Exactly what reads it

**One script reads, two write, two documents link, one guard names the directory.**

| site | what it touches | kind |
| --- | --- | --- |
| `scripts/phys-bench-fit.mjs:34` → read at `:41` | `reports/perf/phys-bench-1/matrix.json` — **default `--in`** | **read, unguarded** |
| `scripts/phys-bench-fit.mjs:202-217` | `reports/perf/phys-bench-1/profiles/prof-chain-n30.selftime.json`, `prof-chain-n100.selftime.json`, `prof-master-n30.selftime.json`, `prof-master-n100.selftime.json` | **read, inside `try/catch`** |
| `scripts/phys-bench-matrix.mjs:68` | `reports/perf/phys-bench-1` — **default `--outdir`** | write |
| `scripts/label-bench-matrix.mjs:41` | `reports/perf/label-bench-1` — **default `--outdir`** | write |
| `docs/DEAD-ENDS.md:269`, `docs/BACKLOG.md:2180` | `reports/perf/DELETED.md` | **link, guard-enforced** |
| `scripts/check-index.mjs:136-138` | the **name** `perf`, in `ARCHIVED` | declaration |

**The census found one of the five reads.** Its `reports/perf` section names only `matrix.json`. The
four `profiles/*.selftime.json` files are read by the same script, in the Q4 block, and were not
named. This was established by **running the script** — `node scripts/phys-bench-fit.mjs` with no
arguments printed Q1, Q2, Q3, Q5 **and both Q4 tables** (`chain` and `master`), which only appear when
all four profile files resolve.

`scripts/check-index.test.mjs:220` contains the string `"reports/perf/frame-trace-2026-01.md"`. It is
a **synthetic fixture inside a test's in-memory tree**, not a read of the real directory. I list it
only so a later grep does not read it as a sixth reader.

`reports/README.md:34` also links `perf/01-tier1-wave1.md` and `perf/DELETED.md`, but
`check-doc-links` declares itself blind to "links written INSIDE `reports/`", so those two links are
**not** enforced.

### (b) How often it runs

**`phys-bench-fit.mjs` is manual-only. It is in nothing.**

- **Not in `npm run verify`** — `node scripts/verify.mjs --dry` lists 27 guards; no bench guard among
  them.
- **Not in any npm script** — root `package.json` has `prepare`, `verify`, `data:export`,
  `hooks:install`, `test:e2e`; `client/` and `server/` have none that touch it.
- **Not in CI** — `grep -rn "perf\|bench" .github/workflows/` returns **zero lines** across
  `ci.yml`, `audit-schedule.yml`, `deploy.yml.disabled`.
- **Not in the hook** — `.githooks/pre-commit` runs discovered guards and `engine-reach --check`, and
  says so at `:83`: "the suites and the fingerprints belong to `npm run verify`, not to every commit".
- **Not in the script suite** — `git ls-files "scripts/**/*.test.mjs" | xargs grep -l "phys-bench\|reports/perf"`
  returns nothing, so `verify.mjs`'s `git ls-files scripts` discovery never reaches it.

**The two guard-mediated readers do run, and often.** `check-doc-links` declares `dirs: ["docs/",
"reports/"]`, so **any commit touching `docs/` selects it** — and it resolves the two links to
`reports/perf/DELETED.md`. Run now: `672 relative links across 61 living-doc files; 0 dangling`.
`check-index` declares `dirs: ["reports/"]` and is selected by any change under `reports/`.

So the honest frequency statement is: **the 785,000 lines of machine output are read by a human
typing one command, at an unknown and probably low rate; the two `.md` files are checked on every
merge that touches `docs/`.**

### (c) What a summary would break

**It depends on which of three things you keep, and the failure modes are of different kinds.**

| pruned | what happens | how loud |
| --- | --- | --- |
| `phys-bench-1/matrix.json` | `readFileSync` at `phys-bench-fit.mjs:41` throws `ENOENT`. The script dies before printing anything. | **loud** |
| `phys-bench-1/profiles/*.selftime.json` | `readProf` catches and returns `null`; `if (!lo \|\| !hi) continue;` at `:218` skips the block. **Q4 — the self-time-share table, the section that names `isSideFree` as the growth term — simply is not printed.** No error, no warning, exit 0. | **SILENT** |
| `perf/DELETED.md` | `check-doc-links` fails on two dangling links from `docs/DEAD-ENDS.md:269` and `docs/BACKLOG.md:2180`. | **loud, on the next `docs/` commit** |
| `perf/01-tier1-wave1.md` | Nothing fails. Its only link is inside `reports/`, which the guard does not scan. | **silent** |
| all `.md` under `perf/` | `check-index`'s `ARCHIVED.perf` declaration becomes an entry matching no directory. It is filtered against `segments`, which only counts `.md` files, so the entry goes **unused rather than stale-failing**. | **silent** |
| the other 310 files | nothing reads them. | — |

**The reader reads NUMBERS, from named files, in one subdirectory.** It does not read prose, does not
walk the directory, and does not enumerate filenames. Concretely it consumes, from `matrix.json`:
`m.track`, `m.seed`, `m.steps`, `m.node`, `m.platform`, and `m.rows[]` with fields `label`, `racers`,
`tree`, `p50`, `firstFifthP50`, `lastFifthP50`; and from each profile: `top[].fn` and `top[].share`.
Twenty-five rows and four profile files.

**Therefore a summary can be lossless for the machine and still lose everything for the reader.**
Keeping the five files named above and deleting the other 310 breaks **no automated check at all** —
which is precisely why this is a decision and not a cleanup. The thing that would be lost is what
PERF-INVENTORY-1 §2 warned of and the census restated: these chains are **re-runnable but not
reproducible** — the harness cannot resolve a small effect on this machine and its own control arm
reads several percent high — so a pruned chain cannot be recovered by re-running it. That warning is
not enforced by anything; it survives only if a person writes it into whatever replaces the archive.

**Current size, re-measured:** `git ls-files reports/perf | wc -l` = **317** (288 `.json`, 24
`.cpuprofile`, 3 `.txt`, 2 `.md`), ~785,300 lines. The census's 317 / 785,622 stands.

---

## ITEM 1 · The 11 zero-reference `scripts/diag/` scripts — ALIVE

**The census was right that the graph was at fault, and right about why. It stopped one step short of
the evidence, and named that step itself:** "Every `scripts/diag/` triple routes its intermediate
output through `c:/tmp/…`, which is untracked and was not treated as evidence in either direction."
That directory is an **additional working directory of this session** and can be read.

**Strand 1 — the zero is real.** For each of the eleven,
`git grep -l "<name>"` excluding the file itself and `CENSUS-REMOVABLE-1.md` returns **nothing**. The
control (`analyze-camera-log`) returns a live import, so the search works.

**Strand 2 — the triple is confirmed in code, not inferred.** Each `-run` driver spawns its probe by
absolute path:

- `scripts/diag/late-lead-hunt-run.mjs:52-55` → `join(ROOT, "scripts", "diag", "late-lead-hunt.mjs")`
- `scripts/diag/runin-contenders-run.mjs:47-50` → `runin-contenders.mjs`
- `scripts/diag/runin-level-set-run.mjs:73-76` → `runin-level-set.mjs`
- `scripts/diag/runin-contender-guarantee-run.mjs:73-76` → `runin-contender-guarantee.mjs`

The probe is named by the driver; reports name the probe; so the driver is invisible to a name search
**by construction**, exactly as the census argued.

**Strand 3 — the artifact of invocation exists.** Each script's hard-coded default scratch path is
present on disk, populated, dated at or after the script's own commit date:

| script | default path | on disk |
| --- | --- | --- |
| `aim-levers-sum.mjs:8` | `c:/tmp/lev/s1` | 20 files, newest 2026-09-01 |
| `late-lead-axis-sum.mjs:3` | `c:/tmp/late-lead-axis.json` | 773,086 bytes, 2026-08-24 |
| `late-lead-hunt-run.mjs:13` / `-sum.mjs:8` | `c:/tmp/late-lead-hunt/p1`, `p2` | 12 + 19 files, 2026-08-24 |
| `leader-lateral-ba.mjs:16-17` | `c:/tmp/lb/before`, `c:/tmp/lb/after` | 10 + 10 files, 2026-08-26 |
| `runin-contender-guarantee-run.mjs:17` / `-sum.mjs:6` | `c:/tmp/runin-cg/p1`, `p2` | 12 + 19 files, 2026-08-24 |
| `runin-contenders-run.mjs:9` / `-sum.mjs:3` | `c:/tmp/runin-contenders` | 160 files, 2026-08-24 |
| `runin-level-set-run.mjs:17` / `-sum.mjs:6` | `c:/tmp/runin-level/p1`, `p2` | 12 + 19 files, 2026-08-24 |

**Strand 4 — the summarisers authored the published claims, proved by re-running them.**

`node scripts/diag/runin-level-set-sum.mjs` prints
`TOTAL over the twelve: winner off 568 frames shipped -> 35 span -> 0 presence` and
`races with the winner off at all: 12 -> 1 -> 0 of 12` and
`the rule's set DIFFERS from the shipped one on 71.6% of frames`.
`reports/evolution/RUNIN-LEVEL-SET-1.md:9`, `:45` and `:99` carry **568**, **568 → 35 → 0 · 12 races
→ 1 → 0**, and **71.6%**.

`node scripts/diag/aim-levers-sum.mjs` prints the space-sprint `b360` row as
`360.0 | 131.4 | 228.6 | 134.0 | YES | 2.62 | 79 | -30 | 92.20 | 175.1 | 506.5`.
`reports/evolution/AIM-LEVERS-1.md:113` carries the same eleven numbers.

That is not "probably alive". The summariser is the instrument that produced a report the project
acted on, it still runs, and it still produces the same answer.

**One correction to the census's framing.** `leader-lateral-ba.mjs` is not a `-run`/`-sum` triple —
its siblings are `leader-lateral-minimal.mjs` and `leader-lateral-sum.mjs`, and `-ba` is a
before/after comparator taking two directories. The triple argument does not cover it; the scratch
evidence does.

---

## ITEM 2 · The 19 VOID instruments — ALIVE, and the question was already answered

The census wrote the discriminator itself: *"if the default moves to a per-race derived camera seed,
none of these is dead; if the camera line is closed instead, all 19 are. Nothing else
discriminates."*

**The default moved.** `reports/evolution/HARNESS-CAMERA-SEED-2.md` records the build; the change is
in the working tree at `scripts/lib/raceDriver.mjs:100`:

```js
cameraSeed: partial.cameraSeed ?? cameraSeedForRace(partial.raceSeed ?? 5601),
```

with `cameraSeedForRace` imported from the browser's own module at `:60`. It is on master —
`246ea320` (feat) and `63ab59d8` (merge), **2026-08-27 02:06**, and `git merge-base --is-ancestor
63ab59d8 2a9b6b5d` returns true, so it was already in the tree the census was standing on.

**All 19 take that default.** Every one calls `resolveIdentity` (2 occurrences each; `edge-slice-truth`
has 3) and **none contains the string `cameraSeed`**, so none pins one. Thirteen live in
`scripts/diag/`; six — `edge-slice-truth`, `finish-pair-truth`, `label-names-truth`,
`resolve-converge-truth`, `straggler-truth`, `zoom-rate-truth` — live directly in `scripts/`, which
the census's row did not say.

**What is still true:** their **published numbers** remain void, because they were measured before
2026-08-27 under the fixed seed. The tools are not. A re-run today produces a valid claim. The
constant `1439767152` is deliberately not deleted and survives at ten sites, including
`camera-fingerprint.mjs:112` and `check-ending-frame.mjs:270`, which set it directly and never touch
`resolveIdentity`'s default.

---

## ITEM 4 · The 8 sprite generators — 6 DEAD, 2 ALIVE

The census framed this as an unanswerable judgement ("is the provenance of a committed asset worth
keeping?"). **Six of the eight do not reach that question**, because they cannot be run at all.

**Four have no input. `456a0f65`, 2026-06-04, "chore: remove orphaned sprite source files" deleted
every one of them** — one day after the generators were written (2026-06-03). Neither tracked nor
present on disk today:

| generator | source it reads | status |
| --- | --- | --- |
| `gen-beetle-sprite.mjs:27` | `client/public/assets/racers/vw beetle.png` | **gone** |
| `gen-boarder-sprite.mjs:28` | `client/public/assets/racers/boarder.png` | **gone** |
| `gen-luge-sprite.mjs:24` | `client/public/assets/racers/Luger.png` | **gone** |
| `gen-snowmobile-sprite.mjs:17` | `client/public/assets/racers/snowboard-ride.png` | **gone** |

All four outputs (`beetle.png`, `boarder-sprite.png`, `luge-slide.png`, `snowmobile.png`) are tracked.
**DEAD as tools.** What survives of them is three provenance strings in live source —
`BeetleRacerType.js:9`, `KoiRacerType.js:9`, `SnowmobileRacerType.js:7` — which name the script in a
header comment. Those comments are the only inbound references from `client/src` and they are prose,
not uses; they would outlive the deletion and read as pointers to nothing.

**Two are destructive in place and would damage tracked art if run.** `gen-scaled-sprites.mjs` expects
`turtle-swim.png` at 12544×784, `manta-swim.png` at 13600×850, `dolphin-swim.png` at 32000×2000, and
writes the result back over the input (`:36 fs.writeFileSync(filePath, buf)`) **with no dimension
guard**. Measured with `sharp` today those files are **2048×128, 2048×128 and 4096×256** — they are
already the outputs. Re-running it would silently downscale finished art a second time and overwrite
it. `crop-dolphin-sprite.mjs:18` says the same of itself ("overwrite dolphin-swim.png in-place").
`reports/night/NIGHT-2026-08-23.md:210` already said it: *"it overwrote its inputs, so nothing can
reconstruct what it did."* **DEAD as tools, and worse than dead — hazardous.**

**Two are pure procedural generators and are ALIVE.** `gen-aquatic-masks.mjs` and
`gen-koi-patterns.mjs` read no source image; they synthesise their masks and write to
`client/public/assets/racers` (`:29` and `:34`). `sharp` is a root dependency (`package.json:18`) and
is installed. They reproduce their committed output on demand, which is the definition the census was
reaching for.

**Where this leaves the judgement.** For the six, "is the provenance worth keeping?" is the wrong
question, because the file no longer IS provenance — it is a recipe for an ingredient that no longer
exists, or a recipe that would spoil the dish. The honest form is: keep them as documentation of how
the asset was made, or delete them and move that one sentence into the racer-type header that already
names them. **That is a decision, and I do not make it here.**

---

## ITEM 5 · `sweep-bufferPct-driver.mjs` — ALIVE

The census's row says "2026-07-07, never touched". `git log -- client/scripts/sweep-bufferPct-driver.mjs`
returns **two** commits:

```
a6030929 2026-09-02 fix(FINGERPRINT-TRACK-DEFAULTS-1): the world fingerprint was racing a snail; ...
ec06b92e 2026-07-07 Stage 1: remove rubber-band mechanism (relocate computeMedianT to raceGovernor)
```

The 2026-09-02 commit is the repair of the exact defect CENSUS-DUPES-1 reported in this file — the
two wrong track/racer pairings at `:30` and `:31`. `reports/evolution/FINGERPRINT-TRACK-DEFAULTS-1.md:44`
records the outcome: *"now reads the seeds"*. A file that gets fixed the week it is nominated for
removal is being maintained.

Its subject is also live: `bufferPct` at `client/src/modules/raceBehavior.js:922-926`.

**One correction to the removal argument.** The census said removing the file "also retires an
allowlist entry the language guard wants to shrink". It would not — it would create a **dead
allowance**. `scripts/check-language-closed.mjs:300-311` is explicit: an allowance for a file not in
the tree "does NOT fail… It is PRINTED on every run instead". The entry at `:162` (8 hits) and the
test's expectation at `check-language-closed.test.mjs:51` would both need editing by hand, and the
guard would not have forced it.

---

## ITEM 6 · The commentary in `check-fallback-agreement.mjs` — ALIVE as record

**The emptiness is now measured, not asserted.** Running the guard prints:

```
check-fallback-agreement: 406 mirrored fallback(s) in 252 files; 400 read the default BY REFERENCE
and cannot disagree; 0 disagree (0 on the exception list, 0 new); 1 skipped ...; 2 unresolved; ...
```

`0 on the exception list` is the runtime proof that `EXCEPTIONS` (declared at `:114`) holds no
entries — everything between the brackets is comment.

**It is 107 lines, not ~60.** Measured from `:114` to the closing `];`.

**It is not a removal candidate, and the file argues the case against itself better than a census
can.** `:117-124` is the POST-START-HOLD-UNIFY entry, which records both that the mirror was removed
*and* that its original reason line had been wrong — "the entry was right that it could not fire, and
wrong about why". `:482-505` shows the guard treats a stale exception as a **failure**, not a shrug.
Deleting the prose would delete the only place a later reader can learn why each mirror was safe to
remove, in a file whose whole design is that a permission must not outlive what it permitted.

**One thing worth flagging that is not about removal.** `:117` is also the record the proven-dead item
depends on: it states that `postStartHoldMs`'s fallback went because the *reading* went. Those four
`.txt` files in `client/e2e/camera-pan-diagnostic-output/` are, per the census, the last place the key
survives. If that directory is removed, this comment becomes the only surviving mention.

---

## WHAT I COULD NOT ESTABLISH

1. **Whether any of the eleven `scripts/diag/` scripts will be run AGAIN.** I proved they *have* been
   run and that they still work. Future use is a decision about whether the camera line is open, and
   `feedback_screen_at_n30_first` / the open owner questions on `feat/runin-state` suggest it is —
   but that is inference, not measurement.
2. **How often `phys-bench-fit.mjs` is actually invoked.** I proved it is in no suite, no npm script,
   no hook and no workflow, so the only invocation channel is a human typing it. There is no artifact
   of such an invocation — `reports/perf/phys-bench-1` last changed 2026-08-10 and reading leaves no
   trace. The rate is unknown and could be zero.
3. **Whether the two live sprite generators' output still matches the committed masks.** Verifying
   would mean running them, which writes into `client/public/assets/racers/` — outside this piece's
   read-only mandate. It is a one-command check for whoever holds the write bit.
4. **Whether `c:/tmp` scratch directories could have been created by something other than these
   scripts.** The paths are hard-coded defaults appearing in exactly one file each, and the dates
   match, so a coincidence would have to be elaborate — but I did not exclude it by construction.

## A CAUTION AGAINST THIS REPORT'S OWN CONCLUSION

**Two of the five clearances rest on the census having missed something, not on new evidence.** Item 2
was settled six days before the census by a merge on master, and item 5 was fixed the same day the
census shipped. Both were findable with `git log`. That is a pattern worth naming: a census that
builds its picture from a static reference graph will keep missing facts that live in the **history**
and in the **filesystem outside the repository**, and both of those are cheap to check. The census
said so itself, in its LIMITS section, and then did not check them — which is a smaller failure than
it looks, because the limits were correctly named and left for someone with the time.

**And the one thing this report adds that nothing in the census could have found is the silent one:**
pruning `reports/perf/phys-bench-1/profiles/` costs `phys-bench-fit.mjs` an entire output section, at
exit 0, with no message. That failure mode is only visible by running the tool with the files present
and reading what it prints.
