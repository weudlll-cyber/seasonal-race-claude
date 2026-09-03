# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** after piece 1 of the new chain. **The previous chain (ENFORCE THE HYGIENE) is
finished — all ten pieces merged and pushed.** This chain is running now; pieces below are marked
DONE, RUNNING or NOT STARTED.

---

## ★ THE THREE NUMBERS

### 1. How many controls could not represent their shipped value?

**ONE — the one you named, and no others.**

| | |
| --- | --- |
| Dev Screen controls resolved and checked | **96** |
| **could not represent their shipped value** | **1** — `choreoOutcomeStart` |
| needed a JUDGEMENT rather than a widening | **0** |
| not resolvable (printed every run, never counted as coverage) | 18 |

**Fixed, and the shipped value did not move.** `choreoOutcomeStart` is still `0.6`. The widget's
ceiling went 0.55 → **0.60**, its label to "(0.25–0.60)", its tip to "0.6 = shipped".

**The bound was not mine to choose — it was already written down three times.**
`DEVSCREEN-INVENTORY.md`, `PHASE-CONTRACT.md` and `defaults.js` all record the VALIDATED range as
**[0.25, 0.60]**. The widget stopped at 0.55, which is 0.05 short — **exactly one step, and exactly
where the shipped value lives.** The sibling control in the same card, `racePlanPulkStart`, already
keeps widget clamp == validated range [0.10, 0.60]. I applied the rule the neighbour follows.

**It sits at the top of its range with no headroom, and that is honest rather than comfortable.**
0.60 is where the measurement stops (the 2026-07-17 sweep, band-reach still held on 3 of 4 tracks
*at* 0.60). Putting an unmeasured span behind a slider is a fairness judgement — **that one is yours,
below.**

### 2. Is Rule A green without an exception list after the rename?

**NOT STARTED — piece 2 runs next.** Today Rule A objects to **16 disagreements in ONE file**
(`crop-sprite-sheets.mjs`), all `frameWidth`/`frameHeight`, over 8 racer types. It is REPORT-ONLY
and does not gate.

### 3. Piece 7's second-site rate over the larger sample

**NOT STARTED.** The population is the INDEX corrections block: **20 corrections**, dated 2026-08-12
to 2026-09-03, and they split **10 before / 10 after 2026-08-26** — which is the cut the trend
question turns on.

---

## ★ THE FINDING PIECE 1 DID NOT GO LOOKING FOR

**The obvious version of this sweep — compare the STORED default against `min`/`max` — reports SIX
violations, and FIVE of them are false.**

| control | ships | its box shows | bounds |
| --- | --- | --- | --- |
| `racePlanBonusTransitionEnd` | 0.75 | **75** (× 100, "% race") | 30 – 95 |
| `racePlanCorridorStart` | 0.55 | **55** | 50 – 100 |
| `racePlanCorridorEnd` | 1.0 | **100** | 50 – 100 |
| `nameTagFrameFrac` | 0.022 | **2.2** (× 1000 / 10, "% of frame") | 1 – 5 |
| `nameTagAllUntilMs` | 8000 | **8** (/ 1000, seconds) | 0 – 30 |

**A control's bounds are a claim about the number it DISPLAYS, not the one it stores.** A guard that
cries wolf five times out of six gets turned off, and takes the one real finding with it. Rule C
evaluates the value expression with the shipped default substituted in — and a test pins that,
because "simplifying" it back looks like a clean-up.

---

## ★ AND A SECOND, OLDER FOSSIL UNDERNEATH — EIGHT LIVE SITES

Establishing the bound meant reading the phase model, which still describes a world that ended on
2026-07-29. **"`pulkStart` is 0.25" was standing at eight live sites:** three code comments in
`racePlanner.js`, one in `defaults.js`, one in `sim-fairness.mjs`, three in `PHASE-CONTRACT.md`.

**The root site is the worst kind.** `PHASE-CONTRACT.md` did not merely quote a stale number — it
**warned the reader** that the shipped value differs from a "fallback literal 0.25". There is no
literal: `DEFAULT_PHASE_FRACTIONS.pulkStart` READS `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart`.
A correction written to protect against drift had itself drifted.

**A ninth, of the same shape, one file over:** `camera/framingConfig.js` says its
`DEFAULT_MIN_RACERS_VISIBLE` is *"deliberately a literal rather than an import"* — **two lines above
the import** — and points at `raceBehavior.js` for "the same wording", which that file no longer
carries. `719f6c51` converted 259 fallbacks to read the default and did not touch the paragraph
explaining why they were copies. That comment instructs the next reader to maintain by hand a copy
that is not there.

**Every repair replaces the number with the name of its home**, so the same sentence cannot rot again.

---

## ★ WHAT NEEDS YOUR WORD

1. **Whether `choreoOutcomeStart` should be tunable above 0.60.** It now reaches the top of its
   validated range and stops there. Going higher needs a fairness measurement first — nothing above
   0.60 has ever been run. **Not a hygiene question.**

2. **`crop-sprite-sheets.mjs` — and piece 2 has already turned up more than the rename asked for.**
   Establishing what reads those fields showed the script **overwrites the sprite sheets in place**
   and its `frameWidth: 128` for horse describes a sheet whose frames are **150 px wide today**.
   Running it now would slice every frame at the wrong offset and overwrite the shipped artwork.
   **The rename is going ahead as you chose**; whether the spent list should be deleted outright is
   in the piece 2 report.

3. **Still waiting from last night:** the `renderedBodyH` test's tolerance — titled ±5%, asserting
   0.05 px absolute (33× tighter), with `buggy` passing by floating-point dust. Both false statements
   are corrected; **choosing the tolerance is a product judgement and is yours.**

---

## WHERE EVERY PIECE STANDS

| # | piece | state |
| --- | --- | --- |
| 1 | The slider that cannot show its own value | **DONE** — 1 of 96, fixed; Rule C built inside `check-config-keys` |
| 2 | Rename the pre-crop fields | RUNNING |
| 3 | The fifty-six remaining corrections | not started |
| 4 | The inert guard half and the rotten spec | not started |
| 5 | Where else does a control disagree with what ships? | not started (read-only) |
| 6 | What Rule A cannot see | not started (read-only) |
| 7 | The second-site rate, as a baseline | not started (read-only) |
| 8 | The publish documentation | not started |

---

## ONE LIMIT, STATED PLAINLY

**"96 controls checked" is not "96 controls correct".** Rule C asks one question — can the control
represent its value. A control's label, its step and its tooltip are all claims about the same
number, and **piece 5 measures that class**; its first pass already shows the bounds question is the
cleanest of the four. The 18 controls Rule C cannot resolve are printed on every run with their
reason, so nobody has to take my word for the coverage.
