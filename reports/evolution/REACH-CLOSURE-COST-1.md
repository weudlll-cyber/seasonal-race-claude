# REACH-CLOSURE-COST-1 — the closure doubled and it costs under ninety seconds a week

> **READ-ONLY analysis, PROPOSE ONLY.** The one exception is §6, a false sentence in a living
> document that was corrected rather than left standing, and is marked as such.

Measured 2026-09-02 on `master` at `bf5546a8`, 14-core Windows box. Priced at the owner's request
after [REGISTRY-LITERALS-1](REGISTRY-LITERALS-1.md) grew the engine-reach hull from 36 files to 76
and `docs/MORNING.md` asked whether to narrow it.

## The price, in three lines

**The closure costs between 9 and 86 seconds of one developer's terminal wait per week, and exactly
zero seconds in CI.** The spread is the difference between the 90-day average (which contains one
June burst) and the rate since July; the CI zero is not a rounding — `.github/workflows/` never
invokes `verify.mjs`, `engine-reach.mjs` or `fingerprint-default.mjs` at all.

**It is worth it, and it should not be narrowed.** It closes a hole `docs/SHIP-CEREMONY.md` named in
its own words, at a price smaller than a single coffee-length pause per week. The one narrowing that
would give up nothing saves at most 32 s/week and needs a code change to `racer-types/index.js` to
get it. **The saving does not pay for the change.**

---

## 1. What "36 → 76" actually refers to

Found before pricing. `scripts/sim-fairness.mjs` is a declared reach entry of the world fingerprint.
REGISTRY-LITERALS-1 removed 124 hardcoded racer literals from four instruments and pointed them at
the registry through `scripts/lib/racerFacts.mjs`. That module imports the registry barrel, so the
barrel and everything under it entered the hull.

Verified rather than taken on trust — the closure was walked at both commits, reading blobs through
`git show` so the working tree was never touched:

| tree | closure |
|---|---|
| `6f2d780c` (the merge's first parent) | **36 files** |
| `23259332` (the REGISTRY-LITERALS-1 merge) | **76 files** |
| working tree today, `node scripts/engine-reach.mjs` | **76 files** |

**The delta is exactly 40 files and nothing left the hull.**

| class | count | what |
|---|---|---|
| `*RacerType.js` | 21 | every racer type, each carrying the four physical fields |
| racer-types support | 15 | `index.js`, 9 `*Coats.js`, `genericDustTrail.js`, `racerWarmup.js`, `spriteLoader.js`, `spriteTinter.js`, `trailStyles.js` |
| `client/src/services/` | 3 | `api.js`, `apiClient.js`, `racerApi.js` — pulled in by `index.js`, which loads user racer types from the server |
| `scripts/lib/` | 1 | `racerFacts.mjs`, the new module itself |

**Only ONE guard grew.** Walking each instrument's declared `reach` through `closureOf`:

| guard | declared closure | racer-types members |
|---|---|---|
| `world-fingerprint` | 78 | **36** |
| `camera-fingerprint` | 38 | 0 |
| `render-fingerprint` | 58 | 0 |

Camera and render do not declare `sim-fairness.mjs` as a reach entry, so they never saw the new edge.
**Whatever this costs, it is one guard's cost.**

---

## 2. Run duration — measured

All timings from the repo's own `[ra-elapsed-ms N]` lines except where noted. **These come from
different machines and conditions and must not be read as one series.**

| what | command | wall clock | identity |
|---|---|---|---|
| world fingerprint, as verify invokes it | `node scripts/fingerprint-default.mjs --check` | **41.1 s** | this box |
| world fingerprint, bare | `node scripts/fingerprint-default.mjs` | 40.8 s | same |
| world fingerprint, one track | `… --cheap --check` | 20.6 s | **compares to nothing**, the script says so itself |
| the reach query itself | `node scripts/engine-reach.mjs --check <paths>` | **0.4 s** | this box |
| verify's planning pass | `node scripts/verify.mjs --dry --base=HEAD~1` | 8.7 s | unchanged by the closure |
| client suite, run A | `npm test --silent` in `client/` | 283.0 s | **contended** |
| client suite, run B | same | 334.2 s | **contended** — launched to be clean, came back slower |
| client suite, quiet machine | — | 170 s | **INHERITED** from CENSUS-TESTS-1, not reproduced |

### Which of those is the real cost

**`npm run verify` runs `client-suite` ALONE, so the fingerprint does not hide behind it.**
`SUITE_GUARDS` declares `exclusive: true` for `client-suite`, and the runner drains every exclusive
task sequentially *before* the parallel queue starts. **That single fact decides the whole question,
and it points the opposite way from the intuition that a 41 s job disappears inside a 170 s one.**

For a change confined to `racer-types/`, the parallel queue holds `world-fingerprint` plus four
always-on guards, none exceeding about two seconds:

```
queue before the closure grew:   ~2 s
queue after:                     ~41 s
marginal wall clock per verify:  +39 s
```

**Wall clock is the real cost and it is +39 s per verify run.** The sequential-equivalent figure
moves by the same 41 s, because the guard is one process either way — for this change the two happen
to agree, which is not generally true.

### The two costs that are not paid

- **CI: zero.** `grep -rn "fingerprint-default\|verify.mjs\|engine-reach" .github/` returns exactly
  one hit and **it is a comment**. No workflow step runs any of them. *(Re-checked independently
  before this report landed.)*
- **The pre-commit hook: 0.4 s, unchanged in kind.** It runs `engine-reach --check` on the staged
  paths and prints an advisory. It has never run a fingerprint. What the closure changed there is the
  length of a message, not a wait.

---

## 3. Change frequency — from history

**Window: 2026-06-04 to 2026-09-02, 90 days = 12.86 weeks.** 1,902 commits, 1,565 non-merge.

**A distinction worth naming, because it is the one `engine-reach.mjs` was built on.** Asking with
the *directory* `client/src/modules/racer-types/` returns 37 commits; asking with the 40 hull paths
returns **32**. The five-commit gap is test files and non-hull modules living in that folder. **The
folder is not the closure — 32 is the number.**

Of those 32, **5 also touch a file already in the old 36-file hull**, so the fingerprint was owed
anyway and the closure cost nothing. **27 commits in 90 days are genuinely new selections — 1.7% of
the window's non-merge commits.**

They are not spread evenly, and that matters more than the average:

| week | new selections |
|---|---|
| 2026-W23 | 1 |
| 2026-W24 | 11 |
| 2026-W25 | 13 |
| 2026-W27 | 1 |
| 2026-W34 | 1 |

**24 of 27 land in two weeks of June 2026** — the burst that built server-loaded racer types. They
occupy **10 distinct days** in the whole window. **Since 2026-07-01 there have been 2.**

---

## 4. The weekly cost, with the arithmetic open

The unit of cost is a `verify` run, not a commit, and nobody runs verify on every commit. So this is
bounded from three directions rather than asserted once.

```
UPPER BOUND — one verify per new-selection commit
  27 commits x 41 s  = 1,107 s
  1,107 s / 12.86 wk =    86 s/week   ~ 1 min 26 s

PER-DAY BOUND — one verify per day that touched these files
  10 days x 41 s     =   410 s
  410 s / 12.86 wk   =    32 s/week

CURRENT RATE — since 2026-07-01 (63 days = 9.0 weeks)
  2 commits x 41 s   =    82 s
  82 s / 9.0 wk      =     9 s/week

CI
  27 x 0 s           =     0 s/week
```

**So: 9 to 86 seconds a week of a human waiting, and nothing at all in CI.**

For scale, at the upper bound a verify run on a racer-type change goes from roughly 172 s to roughly
211 s if the client suite is its quiet-machine 170 s — about **+23%** on the run, twice a week, in the
window's busiest fortnight.

**Is it worth it? Yes.**

1. **It closes a hole the project had written down and left open.** Before this,
   `engine-reach --check` on a racer type answered *"cannot reach the engine at all"*, and
   SHIP-CEREMONY.md quoted that sentence as a known gap. Four fields on every racer are engine
   inputs, and until 2026-09-02 changing one selected no instrument.
2. **The price is a minute and a half a week at the peak-inclusive average and under ten seconds a
   week at the current rate.**
3. **None of it is paid where cost compounds** — not in CI, not in the hook, not by anyone but the
   person who edited a racer.

---

## 5. What narrowing would mean

### The part of the 40 that earns its cost, and the part that does not

**23 of the 40 files name at least one of the four physical fields** — the 21 `*RacerType.js` files,
`racer-types/index.js`, and `racerFacts.mjs`. Those are the files the world fingerprint can actually
speak about.

**17 do not**: 14 appearance modules and 3 transport modules under `client/src/services/`.

**10 of the 27 new selections — 37% — touched only those 17.** And the guard those runs wake declares
in its own `blind` list:

> "anything the CAMERA decides and anything DRAWN — those are the camera and render fingerprints"

**So more than a third of the new cost is 41 seconds spent asking an instrument a question it has
already declared it cannot hear.** That is the honest waste, and it is the only narrowing worth
putting in front of the owner: split the four physical facts into a leaf module the barrel imports,
so `racerFacts.mjs` imports the leaf instead of `index.js`. It would cut the 17, save roughly
32 s/week at the 90-day average and 3 s/week at the current one, and give up nothing an instrument
could have caught. **It is also a code change to the file every harness reads, carrying its own
fingerprint question. Not recommended for three seconds a week. Log it; do not build it.**

### ★ Two things that must not be narrowed out, named concretely

**`client/src/modules/racer-types/index.js`.** It reads as a barrel — twenty re-export lines at the
top — and any narrowing shaped by name or by "it only re-exports" drops it. **It is the one file in
the 40 that must stay.** `index.js` freezes `CONFIG_SNAPSHOT` and *then* calls
`_applyStoredTunableOverrides()`, which mutates `type.config` from storage at module load;
`racerFacts.mjs` prefers the snapshot precisely because it is frozen before that call. **Move the
freeze one line later, or add a field to `TUNABLE_FIELDS`, and every instrument's inputs change
without one racer's number moving.** No test asserts the ordering. Nothing else would notice.

**`SnailRacerType.js`** — the concrete answer to the tempting narrowing "keep only the racer types a
track default actually races". Ten of the twenty-one types are raced at track defaults today; **snail
is not one of them**, because garden-path moved off snail on 2026-08-25. A narrowing keyed on that
set would exclude `SnailRacerType.js`, **and the moment a seed's `defaultRacerTypeId` points back at
snail, an edit made while it was excluded is inside the instrument's inputs and nothing says so.**
That is precisely the defect [FINGERPRINT-TRACK-DEFAULTS-1](FINGERPRINT-TRACK-DEFAULTS-1.md) repaired
— a hand-held list standing in for a fact the seeds own — re-created one level up. **Refuse it.**

---

## 6. Found while pricing — and CORRECTED, not left standing

**`docs/SHIP-CEREMONY.md` carried a sentence that today's tree falsifies.** It read:

> **`racer-types/` is inside NO instrument's closure.** Walking each guard's declared `reach` through
> `closureOf`: render 55 files, camera 36, world 36 — `racer-types/` appears in none, and
> `engine-reach --check` on `SpriteRacerType.js` reports it cannot reach the engine.

Half of that is false. Re-checked directly before correcting: world declares **78** files and
`racer-types/` is **36** of them; `engine-reach --check` on `SpriteRacerType.js` now answers **"is in
the hull"**. Camera (38) and render (58) are still right. The generated counts block ten lines above
was regenerated to 76 by the ship; **this paragraph is hand-written prose and was not.**

**This one sentence was corrected rather than merely reported**, which is the single departure from
this piece's propose-only rule and is deliberate. It needs no judgement — the facts are measured and
unambiguous — it changes no behaviour, and `docs/SHIP-CEREMONY.md` is a permanent rules document that
`CLAUDE.md` points a newcomer at. Leaving a known-false statement there to be discovered later is the
exact failure this whole chain has been documenting. **Everything else in §1–§5 is proposed and not
built.**

**The pleasing part: the sentence's own conclusion — *"a change to how a racer is drawn is covered by
the owner's eye and by nothing else"* — is still true, and §5 is why.** The closure growth covers a
racer's *physics*, never its *drawing*. The correction preserves that conclusion and repairs only the
premise, which is the shape this arc keeps arriving at.

---

## Limits

- **`npm run verify` was never run end to end on a diff touching a racer type.** The task forbids
  modifying a tracked file, so that diff could not be created. **The +39 s marginal figure is
  composed from measured parts — a 41.1 s guard, an exclusivity flag read from source, a ~2 s
  always-on tail — not from one observed verify run.**
- **How often anyone runs `npm run verify` was not measured.** Commits are a proxy for verify runs
  and a poor one. **Every weekly figure above is a bound, not a rate.**
- **The machine was never quiet, and could not be made quiet.** Two client-suite runs gave 283 s and
  334 s; the second, launched specifically to be clean, came back the slower. Another agent was
  working in this same tree throughout and modified `scripts/parity/goldenRunner.mjs`,
  `reports/evolution/INDEX.md` and added `reports/evolution/SOAK-ROSTER-1.md`. `engine-reach --check`
  confirms that file is outside the hull, so no closure figure is affected — but **every wall clock
  should be read as an upper bound with no variance figure attached.**
- **The 170 s client-suite number is INHERITED** from CENSUS-TESTS-1 and was not reproduced here.
- **The two world-fingerprint durations are two runs 0.3 s apart.** There is no variance figure.
- **The recorded ceremony table gives 117 s for this guard** on a different machine at `b1a3bb1b`,
  2026-08-11, against 41 s here. **Which machine is the reference one was not established.** If it is
  the 117 s machine, multiply every wall-clock figure by 2.85 and the upper bound becomes roughly
  four minutes a week.
- **ESTIMATED, not measured: that the 17 appearance and transport files cannot move the world
  fingerprint.** What was established is weaker — none of the 17 names any of the four physical
  fields, and `sim-fairness.mjs` names its racers `R1…Rn` rather than from any coat. **No coat file
  was mutated and re-fingerprinted to prove it**, and this project has been surprised before by
  appearance turning out to be physics: a racer's `name` feeds `stablePairBit`.
- **ESTIMATED: the ~2 s always-on tail**, taken from the pre-commit hook's own measured note.
- **The camera and render fingerprints were not measured.** Their reach sets contain no racer-types
  file, so their cost did not change — **an argument from the declarations, not a measurement.**
- **The 90-day window is dominated by one June burst** (24 of 27 selections in two weeks). Its
  average is not a rate to expect next week, which is why the recent rate is given separately rather
  than folded in.
- **The absence of dynamic imports in the closure was not re-derived.** `engine-reach.mjs` asserts it
  through its own test, and that assertion was trusted. If it is wrong, the closure is a floor rather
  than a set and every count here is a lower bound.
- **The docs side was not priced.** `docs/SIM.md`'s generated table grew from 36 to 76 rows and its
  UNKNOWN count from 13 to 14, and the guard that checks it costs 0.4 s. That is inside the noise.
