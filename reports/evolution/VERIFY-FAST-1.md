# VERIFY-FAST-1 — one command, concurrent, and the merge stops waiting on CI

**Base** master `e2ad9cfd`, **stacked on the unmerged `feat/verify-cost-1`** (declared below) ·
**Branch** `feat/verify-fast-1` · PR #127's baselines untouched.

**No camera or render fingerprint was owed by this block** — nothing drawn or decided changed. Both
were nonetheless *run*, because they are the acceptance for §2, and both came back byte-identical.

---

## The numbers

| | before | after |
|---|---|---|
| a typical camera block (suite + camera + render) | 185 + 47 + 15 = **247 s sequential**, plus a re-measure after the hook reformatted | **~226 s**, measured once |
| the §2 probe (all six guards: suite + world + camera + render + docs + scripts) | **471 s sequential** | **282 s (1.7×)** |
| a docs-only block | the same full set, by habit | **~7 s** — three doc guards, everything else printed as skipped |
| world fingerprint | 195 s | **113 s** (VERIFY-COST-1, which this stacks on) |

**Hashes byte-identical throughout:** world `dc4647be0f55ebdb`, render `73ba53ba9fea12c7`, camera
`ab731df15724ab5d`. Script suite 142/142 green.

---

## Deviations, and one that matters

**1. Stacked, not based on master.** §1 and §6 both need `scripts/engine-reach.mjs`, which lands in
VERIFY-COST-1 — pushed, unmerged. I merged that branch into this one so the dependency is explicit in
history rather than duplicating the script. If VERIFY-COST-1 merges first, this collapses to nothing.

**2. The client suite runs ALONE, not concurrently — because concurrency broke it.** The first full
concurrent run was 341 s and **red**: `sim-fairness.test.js` carries a 5 s timeout and four
CPU-saturating siblings pushed it past it. That is the flakiness §2 told me to treat as a finding
rather than retry. The suite now gets the machine to itself and everything else overlaps after it:
**282 s, green.** Slower in principle than the 341 s red run; faster in practice than re-running until
green, which is what the alternative actually costs.

**3. §2's premise held only partly, and the measurement is worth having.** The wall clock did NOT
become "the slowest single guard". Under contention the individual guards get materially slower —
render 15 s → 69 s, camera 47 s → 101 s, world 113 s → 125 s. They are CPU-bound and there are only
so many cores. The win is real (1.7×) but it comes from overlap, not from free parallelism.

---

## What was built

**§1 `npm run verify`** — reads the diff, picks the guards, prints what it chose *and what it skipped
with the reason for each*. That symmetry is the design constraint: a verifier that silently does less
is indistinguishable from one that is broken, which is the exact failure this project has paid for
twice. Routing to the world fingerprint goes through `engine-reach`'s computed closure, so a camera
diff is *told* the race cannot see it rather than paying two minutes to prove it.

**§2 concurrent**, with the exclusivity finding above. Spawn failures are reported as
`SPAWN FAILURE — a finding, not a flake`, never retried; this machine produced a `0xC0000142` once
already and a retry loop would have hidden it.

**§3 format → measure → commit**, enforced by `verify` itself. This removes an entire measuring pass:
the hook reformats, and until now it did so *after* the block had measured, so every measurement
described a tree that was never committed. Behaviour sets a fingerprint, not formatting — the second
pass never changed a number, it only cost the time. `docs/VERIFY-RULES.md` R0b.

**§4 merge on green local verify** — R8, with both exceptions, and R9 (do not walk away before the
notification is seen) written with its reason: R8's whole safety argument is "he is notified within
minutes", which is a claim about a human being present. `SHIP-CEREMONY.md` now points at it and states
what the ordering does NOT catch: a different environment (clean Linux vs Windows/OneDrive),
time-dependent checks like the security gate, and coverage.

**§6 both adopted.** Every guard prints its own elapsed time (`[elapsed 12.6s]`), so the ceremony's
cost column can never go stale again. `engine-reach --check` is in the pre-commit hook — it **prints,
never blocks**, because "can this diff change the race?" is information the committer needs, not a
veto.

---

## §5 — the floor is one test file, and it is doing what it must

`goldenEquality.test.js`, measured per test in isolation: **14 tests, 107.8 s.**

| | s | share |
|---|---:|---|
| 3 × searound n=40 real-arm vs sim (2 races each) | 44.2 | 41% |
| 1 × topology/plan-gate/D-ROWCOUNT case | 18.1 | 17% |
| 2 × negative controls ("is not vacuous") | 19.7 | 18% |
| 4 × n=20 golden cases (2 races each) | 25.8 | 24% |
| 4 × non-race assertions (scalars, coverage, no-derived-scalar) | **0.0** | 0% |

**Where the time goes: entirely into running races.** ~25 full races across 14 tests. Setup is free —
the four non-race tests cost 0.0 s, which is the measurement that rules out "repeated setup per case"
as an explanation.

**Recommendation: it is doing exactly what it must. Do not shrink it.** Every second is a race being
compared byte-for-byte between two derivation chains, which is the only thing that makes the
browser↔sim parity promise checkable. The n=40 cases cost the most and are the most valuable — n=40 is
where the avoidance symmetry tiebreak actually bites.

**One observation, offered without a recommendation to act on it:** the negative control
`a perturbed identity produces a DIFFERENT outcome hash` runs three races, one of which
(`simArm(base)`) repeats a race another test in the same file already ran. Memoising `(identity, arm)`
within the file would save perhaps 7–13 s of 108 without weakening any assertion. That is 6–12% for a
caching layer in a test whose entire value is that it is dumb and direct — I would not take that
trade, and I am recording it so the question is closed rather than re-opened.

**So the floor after this block is: 156 s of client suite (of which ~108 s is this one file) + the
slowest remaining guard.** There is no more to take without giving something up.

---

## Tests

**Added 8** (`scripts/verify.test.mjs`), all asserting *properties* of the routing — "a diff of kind X
selects guard Y and carries a reason" — never the wording of a reason, which changes on every honest
edit. **Deleted 0, merged 0**: nothing here made an existing test redundant.

**They found a real bug on their first run.** `verify.mjs` executed its main block on import, so
importing `plan()` ran the whole verifier and only one test ever reported. That is precisely what R7's
"what goes unnoticed if it is missing" question is for.

---

## Proposals

**P1 — the `retry: 3` in `vitest.config.js` is now working against us.** It exists to absorb flakes,
but under §2 it also absorbed the contention failure: the first concurrent run spent time retrying a
test that was failing for an environmental reason, and the retries are part of why that run took
341 s. A retry that hides *why* a test failed is the mute-instrument shape again (L204). I would keep
the retry but make it print which tests needed one — a suite that retried three tests and passed is
not the same artefact as one that passed outright, and today they are indistinguishable.

**P2 — `verify` should learn `--since-last-verify`.** It currently diffs against `master`, so on a
long branch it re-runs guards for files that were already verified two commits ago. Recording the last
green verify's commit in a gitignored file and diffing from there would make the second and third
verify of a block near-free. The reason I did not build it: a stale marker would silently under-verify,
and that needs a "the marker is older than the branch point → verify everything" fallback designed
properly rather than bolted on.

**P3 — the ceremony's cost column should be generated, not typed.** §6 made every guard print its own
elapsed time, which fixes the *source* of the truth but not the *copy* in `SHIP-CEREMONY.md`. One
script that runs each guard on a no-op diff and rewrites the table would close the loop; until then the
column is still hand-maintained and will drift again. Cheap, and it is the same "one value, two homes"
shape this project keeps paying for.
