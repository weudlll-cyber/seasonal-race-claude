# FAIRNESS-SEED-1 — the fairness instrument has been running unseeded, and its start-row verdict is a single draw

Branch `feat/gap-leader-brake`. Date: 2026-09-16. **Read-only finding. No source changed, nothing
minted, nothing merged.** The owner's store was not opened.

---

## ★ ONE LINE

**`scripts/sim-fairness.mjs` defaults to `--seed=0`, which the script itself defines as
`Math.random()` — "exploration only" — so every fairness run this project has taken at the default is
non-reproducible, and the start-row p-values swing by three orders of magnitude between identical
invocations. The fix is one flag.**

---

## HOW IT SURFACED

I ran the pinned fairness gate on a candidate brake setting (56 px / 13%) and found **one
Holm-flagged start-row row** — luger-hill 30 s, χ² = 25.80, p = 0.00005 against a Holm bar of
0.00167. The project's gate is band reach plus **zero** Holm-flagged rows, so that reads as a failure.

Before reporting it I ran a **shipped control on the same track**, because the bias could belong to
luger-hill rather than to the brake. It did show the same rear bias — but its p-value (0.00237)
disagreed with what I had measured for the same shipped configuration the night before (0.0312).

**The sim is supposed to be deterministic, so that disagreement had to have a cause.** It does.

---

## ★★ THE MEASUREMENT

Three runs of the **same shipped configuration**, same track, same racer, same race count, and on
runs 2 and 3 an explicit `--seed=0`:

| run | 30 s | 60 s | 120 s |
|---|---|---|---|
| 1 | χ² 16.7, p = 0.00237 | χ² 4.4, p = 0.355 | χ² 6.7, p = 0.151 |
| 2 | χ² 16.8, p = 0.00227 | χ² **9.5**, p = **0.049** | χ² 3.9, p = 0.421 |
| 3 | χ² **23.5**, p = **0.00013** | χ² 5.1, p = 0.276 | χ² **27.7**, p = **0.00002** |

★★★ **Run 3 of the SHIPPED game produces two rows that clear the Holm bar.** Runs 1 and 2 produce
none. Nothing was changed between them.

**So the shipped configuration both passes and fails the project's fairness gate, depending on the
run.**

### The cause, from the script's own header

> [sim-fairness.mjs:343](../../scripts/sim-fairness.mjs#L343) — *"n=0 (default): non-deterministic
> (`Math.random()`), exploration only"*

and [sim-fairness.mjs:352-353](../../scripts/sim-fairness.mjs#L352-L353) resolves
`GLOBAL_SEED = Number(argVal("seed", "0"))`, so **the default IS the unseeded mode**. The run even
prints it in its own header at
[sim-fairness.mjs:4206](../../scripts/sim-fairness.mjs#L4206):

```
Seed                   : 0 (Math.random, Exploration)
```

★ **It was never hidden. It is printed on every run and documented in the usage block. I did not read
that line**, and neither, on the evidence of the recorded verdicts, has anyone else recently.

### And a positive seed fixes it completely

Two runs at `--seed=12345`, same track, same everything:

| run | 30 s | 60 s | 120 s |
|---|---|---|---|
| A | χ² 19.5, p = 0.00072 | χ² 0.5, p = 0.97033 | χ² 12.3, p = 0.01561 |
| B | χ² 19.5, p = 0.00072 | χ² 0.5, p = 0.97033 | χ² 12.3, p = 0.01561 |

★ **Bit-identical, every field of every row.** The instrument is fully deterministic once given a
seed above zero.

---

## ★ WHAT THIS RETRACTS

**My finding that 56 px / 13% fails the fairness gate is WITHDRAWN.** The single Holm-flagged row I
measured sits comfortably inside what the shipped configuration itself produces from run to run —
run 3 of shipped produced two. **I cannot attribute that row to the brake, and I should not have
started to before the control came back.** The control is what caught it, which is the argument for
running one.

**And it reaches further back.** [BRAKE-FAIRNESS-1](BRAKE-FAIRNESS-1.md), written last night, reports
"**0 Holm-flagged of 30** on both arms" for shipped and for 90 px / 10% at the pinned N. Both arms of
that run were unseeded. **That verdict is one draw, not a property**, and the same is true of the
band-reach figures beside it — although band reach was far more stable across my three runs
(89–90% throughout) than the start-row test, which is what one would expect of a mean against a χ².

★ The **start-row χ² is the fragile statistic**: 100 races over 5 rows means an expected 20 wins per
row, and a handful of races moving between rows swings χ² enough to cross the Holm bar in either
direction.

---

## WHAT SHOULD CHANGE, NAMED BUT NOT BUILT

1. **Pass `--seed=<n>` with n > 0 to every fairness run that is used as a gate**, and record the seed
   beside the verdict. One flag.
2. **A gate taken at one seed is still one draw.** If the gate is to mean "this configuration is
   fair", it wants several seeds and a verdict over them — that is a methodology decision for the
   owner, and `docs/FAIRNESS.md` is where it would live.
3. **The default is the trap.** A reader who does not scan the header gets exploration mode while
   believing they ran the gate. Making the gate path require an explicit seed — or making the
   unseeded run refuse to print a verdict — would remove the trap, but that is a change to a shipped
   instrument and is not mine to make tonight.

**Nothing was changed. This report is the finding.**

---

## WHAT THIS DOES NOT SETTLE

- Three runs is enough to prove non-reproducibility; it is not enough to characterise the
  distribution of the χ² under the unseeded default.
- I did not re-run the full pinned gate at a fixed seed for both arms — a fixed-seed comparison at a
  reduced N is reported in [BRAKE-DEEP-1](BRAKE-DEEP-1.md) and is labelled short.
- Whether any *other* instrument in the tree shares this default was not audited. `--seed` appears in
  the flag reference for this script; I did not check the others.
- The rear bias on luger-hill 30 s appears in the shipped game at every seed I ran it at, which makes
  it a real property of that track worth its own look — but that is a separate question from the
  brake and I did not pursue it.
