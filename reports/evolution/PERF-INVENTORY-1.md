# PERF-INVENTORY-1 — what is in `reports/perf`, and what a retention rule would have to keep

**Date:** 2026-08-23 · **Piece 9 of NIGHT-2026-08-22.**
**NOTHING WAS DELETED AND NOTHING WAS MOVED.** The retention rule below is a PROPOSAL; the decision
is the owner's and it is on the morning sheet.

---

## THE INVENTORY

**326 tracked files · 11.8 MB · 787,963 lines.** (The brief's "326 files, 787,000 lines" is exact.)

| extension | files | bytes | lines |
| --- | ---: | ---: | ---: |
| `.json` | 288 | 8.55 MB | 785,182 |
| `.cpuprofile` | 24 | 3.14 MB | 24 |
| **`.md`** | **11** | **0.14 MB** | **2,546** |
| `.txt` | 3 | 0.01 MB | 211 |

### RAW versus EVALUATION — the split the retention question turns on

| | files | bytes | share of bytes |
| --- | ---: | ---: | ---: |
| **RAW / re-derivable** — `.json`, `.cpuprofile`, `.txt` | **315** | 11.70 MB | **98.8%** |
| **EVALUATION — a human wrote a conclusion into it** (`.md`) | **11** | 0.14 MB | **1.2%** |

**Ninety-nine per cent of the bytes are machine output; one per cent is the thinking.** That is the
whole shape of the problem, and it is why a retention rule is even worth proposing.

**Five directories hold 307 of the 326 files:** `phys-bench-1` (98), `side-free-cull-1` (77),
`pair-dedup-1` (69), `pair-prefilter-1` (63), `label-bench-1` (5).

**Oldest: 2026-06-06** — the six numbered evaluations `00`–`04` landed together.
**Newest: 2026-08-10** — `pair-prefilter-1` raw and `spread-field-sweep/binding.json`.
**So the directory spans about nine weeks and has had nothing added for two.**

### THE ELEVEN EVALUATIONS — the files a re-run cannot reproduce

| lines | file |
| ---: | --- |
| 340 | `00-cc-perf-analysis.md` |
| 161 | `01-tier1-wave1.md` |
| 183 | `02-postfix-reconciliation.md` |
| 275 | `03-memory-leak-audit.md` |
| 200 | `04-mid-race-refresh-memory.md` |
| 152 | `05-scoreboard-simplify.md` |
| 177 | `07-allocation-reduction.md` |
| 235 | `08-neighbor-pairloop.md` |
| 471 | `10-loop-fusion-analysis.md` |
| 125 | `11-y-rejection.md` |
| 227 | `12-y-rejection-sweep.md` |

**`06` and `09` do not exist and never did** — `git log --diff-filter=D` finds no deletion of either.
The sequence has two gaps that were never filled, which is worth knowing before anyone reads the
numbering as a complete record.

---

## TWO FINDINGS THAT CHANGE THE RETENTION QUESTION

### 1 · The eleven evaluations are indexed NOWHERE, and the archive declaration says why

`git grep -l` for any of them across every tracked `.md` returns **nothing**. No report, no living
document, no index references them.

**And that is by declaration rather than by oversight** — `scripts/check-index.mjs:130` describes the
directory as:

> `perf: "captured performance logs and frame traces — measurements, not write-ups"`

…and lists `perf/` among seven directories *"deliberately not walked"*.

**The declaration is wrong about 11 of the 326 files.** They are exactly write-ups: 2,546 lines of
analysis, and by the split above they are the only content in the directory that a re-run cannot
reproduce. **The rule that keeps the archive tidy is the same rule that makes its one irreplaceable
part invisible.**

### 2 · "Re-derivable" is doing more work than it can bear, and this repo already proved it

All five tools named by the raw chains still exist — `phys-bench-matrix.mjs`, `phys-bench-fit.mjs`,
`scoreboard-bench.mjs`, `label-bench.mjs`, `pair-reach-census.mjs`. So the chains are **re-runnable**.

**But re-runnable is not reproducible for a TIMING benchmark.** `reports/night/PHYS-BENCH-1.md`
records that `phys-bench` cannot resolve a 15% effect on this machine — **its own control arm reads
+9–14%**. A re-run of these chains produces *different numbers*, and the question "was the old number
right?" cannot be settled by running it again.

**So the raw chains are not perfectly disposable.** They are the only record of what the machine
actually did on the day, and for a benchmark whose noise floor is comparable to its effect size, that
is not nothing. **This weakens the case for deleting them, and it is stated because it cuts against
the tidy answer.**

---

## PROPOSAL — a retention rule, NOT AN ACTION

**Nothing here was done. This is what a rule would have to look like to be safe.**

### The rule

1. **Every `.md` in `reports/perf` is KEPT FOREVER, without exception.** 11 files, 0.14 MB, 1.2% of
   the bytes. They are irreplaceable and they are the entire reason the directory has value.
2. **A raw chain may be pruned only once its evaluation exists and names it.** The evaluation is the
   thing that survives; the chain is its evidence. A chain with no write-up is not a candidate for
   pruning — it is a candidate for *someone writing the write-up*, which is a different task.
3. **`.cpuprofile` files are the first candidates and they are 3.14 MB of the 11.8** — 24 files, 24
   lines total, each a single-line V8 dump readable only by a profiler, none referenced by any `.md`
   in the directory. **They are also the least re-derivable in practice**, for the reason in finding
   2: a profile is a photograph of one run on one machine on one day.
4. **Nothing is pruned without the evaluation gaining a line saying what was pruned and when.**
   A silent deletion turns "the chain is reproducible" into a claim nobody can check.

### And the change that costs nothing and should probably happen first

**Correct `check-index.mjs:130`'s description of the directory** so it stops calling 11 write-ups
"measurements, not write-ups" — and consider whether the eleven `.md` files should be indexed even
while the raw stays archived. **That is not a retention decision at all**; it is the difference
between an archive and a hole.

### What I recommend against

**Deleting by age.** The oldest files here are the six numbered evaluations, which are the most
valuable thing in the directory. Any age-based rule has to invert for `.md`, at which point it is
simpler to say "keep every `.md`" and treat the raw separately — which is the rule above.

---

## THE QUESTION FOR THE OWNER

**`reports/perf` is 11.8 MB, of which 3.14 MB is CPU profiles that nothing references and that no
re-run would reproduce faithfully anyway. Do you want a retention rule at all?**

Three answers, and the cheapest is genuinely defensible:

- **(a) No rule — keep everything.** It is 11.8 MB in a repository that carries committed sprite
  sheets. The cost is real but small, and reports are immutable history here.
- **(b) The rule above, applied once**, starting with the 24 `.cpuprofile` files.
- **(c) The description fix only** — correct the archive declaration, index the eleven evaluations,
  prune nothing. **This is what I would do first under any of the three**, because it is the only
  part that is true regardless of which retention answer you pick.

---

## VERIFICATION

| instrument | ran? |
| --- | --- |
| the inventory | **RAN** over all 326 tracked files — sizes, lines, extensions, git dates |
| fingerprints, suites, gates | **NOT RUN, determined by construction: this piece changed no file** other than adding this report |

## BUILD VERSUS SPEC — conformity

| the spec asked | what happened |
| --- | --- |
| what is raw and re-derivable | done — 315 files, 98.8% of bytes — **with the caveat that re-runnable ≠ reproducible for a timing benchmark** |
| what is an evaluation that exists nowhere else | done — 11 `.md`, listed individually, and **found to be indexed nowhere** |
| total size, oldest and newest | done — 11.8 MB / 787,963 lines; 2026-06-06 to 2026-08-10 |
| propose a retention rule that keeps every non-reproducible evaluation | done — rule 1 is exactly that, without exception |
| **DELETE NOTHING AND MOVE NOTHING** | **nothing was deleted or moved** |
| put the question on the morning sheet | done |

**NOTICED BUT LEFT:** `reports/perf/pair-reach-analysis` is a single file in its own directory, and
`spread-field-sweep` holds two. Both are below the size at which any rule matters, and neither has an
evaluation — they are chains whose write-up was never written, which rule 2 says is a reason to write
one rather than to prune.
