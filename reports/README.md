# reports/ — the lab journal

**What this directory owns:** the record of what was done, measured and decided, block by block.
**It is not documentation.** Nothing here is maintained, and nothing here should be read as a
description of how RaceArena works today.

**The rule that makes it useful and also makes it rot: it is APPEND-ONLY.** A report records what was
true on the day it was written and is never rewritten. That is deliberate — a lab journal you can
edit afterwards is worthless, because you can no longer tell what was actually known at the time. The
price is that a report from June may state a threshold, a fingerprint or a mechanism that has since
changed, and it will not have been corrected. **Assume anything here is stale until you check it
against a living document.**

**Where the current answers are:** [../docs/README.md](../docs/README.md) is the map of the
maintained set. Config values live in `client/src/modules/storage/defaults.js`; the current
fingerprints live in [../docs/fingerprints.json](../docs/fingerprints.json); the fairness thresholds
live in [../docs/FAIRNESS.md](../docs/FAIRNESS.md). If a report disagrees with one of those, the
report is old and the living document wins.

**How big it is:** around 460 files. Most are per-block reports; the rest are raw result tables and
captured tool output kept as evidence.

---

## The parts, and what each is for

| area                                     | what is in it                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [night/](night/INDEX.md)                 | Unattended work blocks. One file per block, newest first. **Indexed and guarded.**             |
| [evolution/](evolution/INDEX.md)         | Experiments and gates on the race dynamics — the arc of how the shipped world was arrived at. **Indexed and guarded.** |
| [parity/](parity/INDEX.md)               | Browser-vs-sim parity work, and the re-baselines. **Indexed and guarded.**                     |
| [proposals/](proposals/INDEX.md)         | Concept proposals and their independent reviews. **Indexed and guarded since 2026-08-18** — see below. |
| `exp-archive/`, `results-salvage/`, `greenfield/`, `phase1-metrics/`, `perf/`, `closed-track-overview/`, `open-track-overlap/` | Result tables and captured output from closed investigations. **Declared ARCHIVE by name in `scripts/check-index.mjs`**, each with a reason: nobody adds to them and nothing links into them. |
| `perf/` — **the one exception, since PERF-CLEAR-1 (2026-08-23)** | It is still ARCHIVE for its raw chains, but it now holds **one indexed write-up**, [`perf/01-tier1-wave1.md`](perf/01-tier1-wave1.md) — the only one of eleven that named a source state which still resolves AND measured something that still exists. The other ten were deleted on the owner's criterion and are listed in [`perf/DELETED.md`](perf/DELETED.md). |
| `diag-*`, `standings-leader-mismatch.md`, `BASELINE-INVALIDATED.md`, this file | Standing notes that belong to no block. They sit directly in `reports/`; their links are covered by `check-doc-links`. |
| `BASELINE-INVALIDATED.md`                | The standing note about which absolute numbers were retired by a re-baseline, and when.        |

**FOUR** of those directories have an `INDEX.md` that `scripts/check-index.mjs` checks in both
directions — every report is linked, and every link points at a file that exists.

**And since INDEX-COVERAGE-1 (2026-08-18) there is a third direction: every directory holding tracked
reports must be in one of the two lists.** Before that, the guard walked three directories and
printed "0 unindexed" — a true sentence about 44% of the tree, in a shape that read as a statement
about all of it. The other eleven were not a decision, they were silence, and silence is why
`reports/audit/` came to hold the ONLY copy of a critical finding with nothing watching it.

A directory is now either **registered** (it has an index and is checked) or **named in `ARCHIVED`
with a reason** (nobody adds to it). A directory in neither FAILS the guard until somebody decides
which it is. `proposals/` moved into the first group because it is the one archive that still
receives work — the audit that nearly went missing was written there.

---

## If you are looking for something specific

- **Why is the shipped world the way it is?** → `evolution/`, newest first. The gates are the turning
  points.
- **What happened in a particular overnight block?** → [night/INDEX.md](night/INDEX.md).
- **Does the sim agree with the browser?** → `parity/`, and `parity/REBASELINE.md` for the current
  baseline.
- **Why was an approach abandoned?** → [../docs/DEAD-ENDS.md](../docs/DEAD-ENDS.md) first. It is the
  maintained summary; the reports are the evidence behind it.
