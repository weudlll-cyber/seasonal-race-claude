# PAIR-DEDUP-1 — the pair loop's six geometry values, computed once

**Branch:** `feat/pair-dedup-1`, off master `24d1ed2c`. **One engine file changed.**
Acceptance was mechanical: WORLD `dc4647be0f55ebdb` unchanged. It is.

---

## THE ANSWER IN THREE LINES

1. **The two sites were identical, and the dedup is done.** The loop preamble and `pairContact`
   computed the same six quantities from the same two racers, twice per pair, every step. They now
   compute them once. WORLD unchanged, all ten per-track hashes unchanged, 108 tests green.
2. **The ≈ 7 % that PAIR-REACH-ANALYSIS priced was NOT delivered — it was already gone.** Measured
   three ways. The pair block's combined profile share moves 73.02 % → 72.36 %, which is inside the
   run-to-run spread of master compared with itself. **V8 was already eliminating the duplicate.**
3. **That finding does not transfer to the prefilter (PAIR-PREFILTER-1).** The reason this saving
   was already banked is that both copies are pure arithmetic on fields nothing writes between them,
   so common-subexpression elimination could remove the second. A prefilter does not depend on the
   optimizer noticing anything: it does not execute the call at all.

---

## 1. WHAT WAS DUPLICATED, AND THE PROOF THAT IT WAS

`raceBehavior.js:590-599` and `pairContact` (line 270), both reached by **every** pair on **every**
step — the gate that follows the speed-brake block is unconditional, so neither site was ever skipped.

| the preamble computed | `pairContact` computed | same? |
|---|---|---|
| `getFrameSizePx(rA)`, `getFrameSizePx(rB)` | the same two calls | yes |
| `hlA_b hlB_b hwA_b hwB_b` — `(dim ?? frame) / 2` | `hl_A hl_B hw_A hw_B` — same expressions | yes |
| `brakeContactLength = hlA_b + hlB_b` | `contactLength = hl_A + hl_B` | yes — **A + B, same order** |
| `brakeContactWidth = hwA_b + hwB_b` | `contactWidth = hw_A + hw_B` | yes — same order |
| `trackWidth = Math.max(getTrackWidthAtTpx(rA), …(rB))` | `pairTW`, same arguments in the same order | yes |
| `pathLength = Math.max(getPathLengthPx(rA), …(rB))` | `pairPL`, same arguments in the same order | yes |

The brief asked for a STOP if the two sites turned out to differ — a different fallback or a
different order would be a finding, not a cleanup. **They do not differ.** The fallback is
`?? frameSizePx` on both sides, the additions are `A + B` on both sides, and the `Math.max`
arguments are in the same order on both sides. Floating-point addition is not associative and
`Math.max` is order-sensitive at `-0`, so both of those had to be checked rather than assumed; both
hold.

**What the change is.** One `pairContact(rA, rB)` call at the top of the pair body, destructured
into the four names the rest of the loop already used (`contactWidth`, `contactLength`,
`trackWidth`, `pathLength` — the `brake…` prefix and the `pairTW`/`pairPL` aliases are gone, one
name per quantity). **The computation moved up; nothing else moved.** In particular the gate's own
zero-size `continue` stays exactly where it was, below the speed-brake block, so no pair changes
which branches it visits.

## 2. ACCEPTANCE

| | before | after |
|---|---|---|
| WORLD | `dc4647be0f55ebdb` | **`dc4647be0f55ebdb`** — and all ten per-track hashes identical |
| `raceBehavior.test.js` + brake-match + warmup-ramp | 108 pass | 108 pass |

The per-track hashes matter more than the combined one here: a combined hash matching could in
principle survive two compensating changes, ten matching cannot.

## 3. THE MEASUREMENT, AND WHY THE HEADLINE NUMBER IS A NULL

Three instruments, in increasing order of how much they can resolve.

### 3a. A/B/A wall timing — could not resolve it

`phys-bench-matrix.mjs --order=size --only=field --sizes=30,70,100`, master worktree at `24d1ed2c`.
Raw in [warm-1](../perf/pair-dedup-1/warm-1/matrix.json) and
[warm-2](../perf/pair-dedup-1/warm-2/matrix.json). Ratios, chain ÷ master, on p50:

| n | session warm-1 | session warm-2 | pooled | chain-vs-chain inside one triple |
|---|---|---|---|---|
| 30 | 1.04 | 0.89 | 0.97 | 8.6 % / 27 % apart |
| 70 | 0.80 | 1.03 | 0.91 | 3.3 % / 12.8 % apart |
| 100 | 0.65 | 0.83 | 0.74 | 30 % / 15 % apart |

**The last column is the instrument measuring itself.** Two runs of the SAME code, back to back
inside one triple, land up to 30 % apart. A 7 % effect is not visible through that.

A first session is on disk and **discarded, with its reason**: the master worktree had never been
read, so its first two runs paid cold-file cost (4.3 s wall against 1.0 s for the identical 3 000
steps). It is kept as [matrix.json](../perf/pair-dedup-1/matrix.json) because a discarded run that
is deleted cannot be checked.

### 3b. Paired per-step ratio — better, still not enough

Both trees run the same seed, the same field and the same roster, so step *i* is the same physics
work on both sides. Pairing step-for-step removes the reason the medians above are unstable — cost
RISES about 3× from the first fifth of the race to the last, so p50 sits on a steep part of the
distribution.

| n | median of chain_i ÷ master_i | the same statistic, chain vs chain |
|---|---|---|
| 30 | 0.927 (−7.3 %) | 0.856 (−14.4 %) |
| 70 | 0.976 (−2.4 %) | 0.942 (−5.8 %) |
| 100 | 0.895 (−10.6 %) | 0.954 (−4.6 %) |

Identical code compared with itself reports −4.6 % to −14.4 %. **The control is the same size as the
effect**, so this instrument cannot answer the question either. (The control is signed because A
always runs before A2 and this machine drifts slower over a session — the confound `--order=size`
exists for, not eliminated by it.)

### 3c. Profile self-time share — this one answers it

Self-time SHARE is measured inside one process, so machine drift divides out. Three passes per tree,
n = 100, `--cpu-prof`:

| | master | chain | delta |
|---|---|---|---|
| `applyRacerBehavior` self | 65.87 % | 67.90 % | **+2.03 pp** |
| `pairContact` self | 7.15 % | 4.46 % | **−2.69 pp** |
| **the two together** | **73.02 %** | **72.36 %** | **−0.66 pp** |
| per-pass spread of that sum | 72.6 / 73.9 / 72.6 | 72.5 / 71.8 / 72.7 | — |

**Read the last two rows together.** The combined share of the pair block moved by 0.66 pp, and
master's own three passes span 1.3 pp. The saving is not distinguishable from zero.

The split moving while the sum does not is exactly what inlining looks like: `pairContact` is now
called from one site instead of two and V8 inlines it into `applyRacerBehavior`, which is where its
work is then charged. `getFrameSizePx`, `getTrackWidthAtTpx` and `getPathLengthPx` report **0.00 %
self time in BOTH trees** — they were already fully inlined before this change, which is the
mechanism.

### 3d. So where did the predicted 7 % go?

PAIR-REACH-ANALYSIS derived it soundly from what was on disk: `pairContact` was 7.02 % of the step,
the preamble computes the same thing, therefore the preamble costs about the same again. **The step
that does not hold is the last one.** Once `getFrameSizePx` and friends are inlined, both copies are
pure arithmetic over object fields that nothing writes between them — the textbook shape for
common-subexpression elimination. The optimizer had already removed the second copy. The 7.02 % that
`pairContact` was charged is the cost of computing those values ONCE, which is a cost the engine
still pays.

**This is a real result, not a failure to measure.** It says: on this engine, a duplicate that the
optimizer can see is not worth a block on its own. What the change is still worth is stated below.

## 4. WHAT THE CHANGE IS WORTH, HONESTLY

- **Nothing measurable in time.** Stated plainly so nobody quotes 7 %.
- **One name per quantity in a 350-line loop.** `brakeContactWidth` and `contactWidth` were the same
  number under two names, and a reader had to prove that to themselves before trusting either.
- **It removes a confound from PAIR-PREFILTER-1's measurement**, which was the other reason
  PAIR-REACH-ANALYSIS put it first.
- **It does not weaken the prefilter's case.** The prefilter's saving comes from not making the call
  at all; it does not need the optimizer to notice anything. What tonight's result DOES say is that
  the prefilter's ≈ 12–18 % estimate should be read as an upper bound with the ≈ 6.8 %
  preamble-half already spent — see PAIR-PREFILTER-1 for what it actually delivered.

---

## SOURCE HYGIENE

| file | what |
|---|---|
| `client/src/modules/raceBehavior.js` | one `pairContact` call replaces the preamble; six names collapse to four |
| `reports/perf/pair-dedup-1/**` | three bench sessions + three profile passes per tree, raw |
| `reports/night/PAIR-DEDUP-1.md` | this |

`engine-reach --check` selects `raceBehavior.js`, as it must. WORLD minted and unchanged, so nothing
is owed to `docs/fingerprints.json`.

### Noticed but left

- **`isSideFree` is 6.0–6.4 % of the step at n=100** and is the next-largest named callee after
  `pairContact`. SIDE-FREE-CULL-1 already culled its scan; what is left is the surviving work.
- **The profile cannot split `applyRacerBehavior`'s self time** between its three quadratic loops —
  stored profiles are function-level. That limit is inherited from PAIR-REACH-ANALYSIS §3 and is
  unchanged by this block.
- **The A/B/A harness's noise floor on this machine is 5–30 %**, measured here against itself for
  the first time. Any future block quoting a single-digit percentage from it is quoting noise, and
  should use the paired or profile-share form instead.
