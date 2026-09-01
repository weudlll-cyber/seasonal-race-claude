# Morning sheet

**Owns:** where the night chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-09-02, after the NIGHT-CENSUS-1 chain — four counts and the one repair you
ordered. **Origin carries master.**

---

## THE CENSUS VERDICT — before coffee

| what was counted | how many | how many are sound |
|---|---|---|
| **Duplicated facts** | 16 groups, **483** comparable values | **456 agree, 27 do not** — but **4 groups have no source of truth at all**, which is the worse half |
| **Checks** | **40** | **27 demonstrably fire**, 12 have never been exercised, **exactly 1 is inert** |
| **Tests** | **310 files, 5,583 tests** | **300 of 310 run** automatically; 10 run only by hand |
| **Removable** | — | **1 item provably dead** (9 files, 1,444 lines, **0 s** of suite time); 6 more suspected, not proven |

**Your four broken checks are 4 of 40 — 10%, not four out of ten.** And "4,327" is the **client
suite alone**; the repository has 5,583 tests across four runners.

### Are these findings recent or old? — OLD. Here is the number.

**22 of the 27 disagreements are more than eight weeks old; 21 of them have been wrong since the day
they were written, 91 days ago.** Only 5 are from the last fortnight. The one provably dead thing is
**117 days** untouched — the oldest thing examined. Everything the census *could not* prove dead is
days old and is live work.

**So this is not a fortnight of rot. It is a spring's worth of small drift that nothing was looking
for, surfacing now because something finally looked.**

### Is the sound side growing? — IT GREW ONCE, AND IT HAS STOPPED.

Checks over time: **5 (April) → 11 (July) → 40 (August) → 40 (September).** August alone built
**72.5%** of the entire checking surface. Since then: **zero new checks**, and in the last fortnight
**2 were added while 4 were found broken.**

**The number that should bother you: none of those four was found by any check in the table.** They
were found by people doing unrelated work. That is the honest reading — the machinery you built in
August is real and mostly works, but it stopped growing, and it is not yet the thing that finds your
faults for you.

### The one limit, stated plainly

**A census counts what can be found by looking. It cannot prove there is nothing else.** Every
number above is a floor, not a total — the duplicate count is grep-based and cannot see a fact
spelled differently in two places; "has this guard ever gone red" cannot see a failure fixed before
it was committed; and the redundancy question needs mutation testing that was not run. **Do not read
this as an all-clear.** Read it as: here is what one night of deliberate looking found.

---

## ⚠ ONE DANGEROUS FINDING — reported, and deliberately NOT fixed

**The world fingerprint is not racing the track you think it is.**
`scripts/fingerprint-default.mjs:153` hardcodes `["garden-path", "snail"]`, under a comment that says
"10 standard tracks × default racer". The shipped seed has said **beetle** since 2026-08-25. So the
project's primary change-detector for the race has, for eight days, been measuring a snail on a track
the product runs with a beetle — one of its ten tracks does not cover the shipped race at all.

It also means the reasoning recorded at the last re-mint is partly wrong: that mint argued all four
values had to move because *"every instrument runs all TEN tracks AT TRACK DEFAULTS"*. The racer half
of that change could not reach this instrument; only the lap-count half could.

**Left alone, per the rule for this chain.** The same stale pairing sits in three other live places —
`goldenRunner.mjs:93`, `sweep-bufferPct-driver.mjs:30`, `docs/ARCHITECTURE.md:438`.

---

## NEEDS YOUR WORD

1. **Candidate B — you are judging it this morning.** See the top of the next section.
2. **The engine-reach closure doubled, 36 → 76 files, as a consequence of the removal you ordered.**
   Importing the racer registry pulls in 40 modules, so editing *any* racer type now selects the
   world fingerprint and asks for a mint. **That is the loud signal you asked for**, made explicit
   rather than left to a golden going red later — but racer-type work now pays a duration it did not
   pay before. Nobody has judged whether that trade is worth it at 40 modules rather than at one. It
   is done and green; say if you want it narrowed.
3. **`scripts/audit-sprite-crops.mjs` is the only tool that can measure `bodyFillX`/`bodyFillY`, and
   it would give wrong answers today** — 8 of 20 frame geometries and 5 of 20 display sizes are
   pre-crop values, wrong since 2026-06-03. Which means those two fields, which every racer's shape
   depends on, are **numbers with a home but no derivation**: nothing in the repository can reproduce
   them. Not touched. Say whether that is worth a block.

---

## CANDIDATE B — WHAT YOU ARE JUDGING

**4173 is up and serving `feat/aim-levers-1`, exactly as you left it.** Confirmed by reading the
build pill out of the served bundle, not assumed: **`2c2f5ba9 · feat/aim-levers-1`, not dirty.** The
backend on 4000 is up and answers `access-control-allow-origin: http://localhost:4173`.

**One thing you should know: 4173 was DOWN when the night began** — only the backend was running. It
was restarted from the existing `client/dist`, which was already that branch's build (built 23:46,
the same minute as the branch's last commit). **Nothing was rebuilt, nothing was merged, and the
branch was not touched.** It was served with `scripts/serve-production.mjs` per R10, not `vite
preview`.

The branch is unmerged and unminted, as required. Every piece of the night's work happened on
`master` and on its own branches; the tree has been put back on `feat/aim-levers-1`.

---

## THE CHAIN — all five pieces done, merged, pushed

| # | piece | state |
|---|---|---|
| **1** | **Duplicated facts** | **DONE, merged.** 16 groups, 483 comparable values, 456 agree / 27 not, 12 groups with a source of truth and **4 with none**. **The brief said four files copy the racer registry; it is five** — `audit-sprite-crops.mjs` carries a sixth table that has *never* agreed, found only by searching uncapped and in **both** spellings (`field:` and `field =`). Ten broken things named and left. → [CENSUS-DUPES-1](../reports/evolution/CENSUS-DUPES-1.md) |
| **2** | **Checks** | **DONE, merged.** 40 checks: **27 fire, 12 never exercised, 1 inert.** The three states are deliberately not collapsed — a guard holding a line nobody has crossed is not waste. The inert one is `render-fingerprint.mjs` as a verify guard: no `--check`, never opens the record, no `throw`/`assert` anywhere, ~54 s to print a hash and PASS unconditionally. `camera-fingerprint.mjs` has the same headline defect. **FP-COMPARE-1 fixed this for one of three instruments and was never applied to the other two.** → [CENSUS-CHECKS-1](../reports/evolution/CENSUS-CHECKS-1.md) |
| **3** | **The tests** | **DONE, merged.** 310 files / 5,583 tests / ~10,137 assertions; 300 run automatically. **Two beliefs corrected**: `goldenRealArm` is **29.1%** of client wall clock, not 99%; and **the biggest cost is not a test** — the suite spends more worker-time building a jsdom 230 times than running test bodies. On redundancy it refuses to guess: mutation testing was not run, so the answer is an honest **45–85% range, labelled an estimate**. → [CENSUS-TESTS-1](../reports/evolution/CENSUS-TESTS-1.md) |
| **4** | **What is removable** | **DONE, merged. NOTHING REMOVED.** Exactly **one** item provably dead, and **four of six candidate classes came back empty** — no retired-mechanism tests survive, every guard's declared paths still resolve. **The `reports/perf` assumption is corrected: something DOES read it** (`phys-bench-fit.mjs:34` takes a file in there as its default input), it is 317 files not 326, and **deleting it would shrink a clone by 0.4%** — the weight is committed imagery, not reports. → [CENSUS-REMOVABLE-1](../reports/evolution/CENSUS-REMOVABLE-1.md) |
| **5** | **The one repair you ordered** | **DONE, merged. NO MINTING PERMISSION TAKEN.** 124 literals removed from four files; all now read the registry via the new `scripts/lib/racerFacts.mjs`. **Proven no-op**: all four fingerprints measured **before and after on the branch** — not merely compared to the record, so a stale record could not fake a pass — byte-identical and equal to the record, and **50 of 50 goldens green**. The drift-guard proposal is closed with the reason. → [REGISTRY-LITERALS-1](../reports/evolution/REGISTRY-LITERALS-1.md) |

### Two things piece 5 turned up that were not in the brief

- **The instruction could not be followed as written.** It said to read all four fields from
  `CONFIG_SNAPSHOT`. `bodyFillX`/`bodyFillY` are **not in it** — it is built from `TUNABLE_FIELDS`
  and they are not tunable — so reading them there returns `undefined` and moves every hash. The
  intent was honoured as one rule instead: prefer the frozen snapshot, fall back to `.config`, which
  is override-immune for both halves. Your local Dev-Screen tuning still cannot reach the harness.
- **A routing gap, counted and not repaired.** `npm run verify` would have reported **green** on this
  change without running a single golden: `client-suite` routes on `dirs=client/`, and this change
  was entirely under `scripts/` — yet four client test files import the very file it rewrote. The
  50/50 exists **only because the goldens were run by hand.**

---

## NOT STARTED / NOT DONE

- **Nothing from the brief is outstanding.** All five pieces are done, each on its own branch, each
  with its own check, each merged to master and pushed, master finished after every one.
- **Everything the census found is unrepaired, by design** — that was the instruction. The lists live
  in the four reports under "Broken things deliberately NOT fixed": ten in piece 1, eight in piece 2,
  ten in piece 3, and the removable set in piece 4 with **nothing removed**.
- **One deviation from the brief's method, and why.** The brief asked for a branch, check, report and
  merge per piece, *and* for pieces 1–4 to run in parallel. Those two cannot both hold in one working
  tree — a branch switch under a running analysis would have corrupted it. So the **analysis** ran in
  parallel and the **writing and merging were serialised**, one piece at a time, never two writers or
  two merges at once. Nothing was lost; the pieces are still four separate branches and five separate
  merges.
