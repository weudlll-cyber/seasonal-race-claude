# GATE-COST-TRUTH-1 — the ceremony said the setup dominates; the setup is 2%

**2026-09-06.** Branch `night/2026-09-05`, piece 3 of NIGHT-2026-09-05. **Documentation only** — one
sentence in `docs/SHIP-CEREMONY.md` corrected at source. **`GATE_TRACKS` was not touched**, no
threshold moved, nothing minted.

---

## THE TWO CLAIMS

| | says |
| --- | --- |
| `docs/SHIP-CEREMONY.md:679-681`, as it stood | *"The fixed cost dominates: a build, two servers and a browser is about **200 s** before any race runs, so the races themselves are cheap at the margin."* |
| PLAYABLE-FOUR-1's direct measurement | **5.2 s** before the first race — 2% setup, 98% racing |

They cannot both be true, and the owner was given a gate-widening estimate built on the 200.

## WHICH IS RIGHT, AND HOW IT WAS ESTABLISHED

**From a run that was made deliberately, and it is the only way this could be settled.** `verify`
does not echo a passing guard's stdout, so the gate's internal phases are not recoverable from any
`verify` log — the wall-clock total is all those carry. On 2026-09-05 the gate was therefore run once
on its own, with every line of its output stamped against the process start:

```
node scripts/viewer-invariants.mjs --gate
```

| phase | at |
| --- | --- |
| sweep build finished (`289 modules`, → `dist-sweep`) | **3.2 s** |
| isolated stack up — API 4361, app 4362, browser | **5.2 s** |
| first race starts | **5.2 s** |
| race 1 home — city-circuit, seed 9, n=40, 6,990 frames | 209.2 s |
| race 2 home — space-sprint, seed 9, n=100, 5,883 frames | **262.6 s** |
| run ends | 263.7 s |

**The fixed cost is about 5 s. The 200 was wrong by a factor of forty, and wrong in the direction
that matters** — it made extra races look free when what actually makes them cheap is something
else entirely.

## WHAT ACTUALLY MAKES EXTRA TRACKS CHEAP

**Concurrency, not setup.** `scripts/viewer-invariants.mjs:814` reads `--jobs` with a default of
**6**, and `:877` starts that many workers; `:828` prints `2 race(s), 6 at a time`. The two races
therefore overlap, and the run's wall clock is the **slower** of them (262.6 s), not their sum.

That also explains the old table's own numbers without any large fixed cost: it lists **1 race at
267 s** and **2 races at 340 s**. A second race adding only 73 s is not evidence of a 200 s setup —
it is evidence of two races running side by side.

## ★ WHAT A GATE OF FOUR TRACKS WOULD COST — and which half of this is measured

Four races still fit inside one wave of six, so the wall clock stays **bounded by the slowest race
rather than growing with the count**: roughly a two-race run, not double it.

**That bound is measured. The four-track figure is NOT.** Four concurrent Chromium races contend for
the machine in a way two do not, so the true number lies between the slowest single race and the sum
of four. **Only a four-track run would settle it, and it has not been run.** This report does not
guess one, and the ceremony's corrected note says the same.

**What this does NOT do:** it does not widen the gate, and it does not recommend widening it.
`GATE_TRACKS` still names two tracks. This piece only replaces a wrong price with a right one, so
that decision is made against the real number.

## WHAT WAS CHANGED

| file | change |
| --- | --- |
| `docs/SHIP-CEREMONY.md` | the one sentence at `:679-681` replaced by a dated correction carrying the method, the phase table, the concurrency mechanism and the explicit statement that the four-track figure is unmeasured. **The wall-clock table below it is left standing** — its numbers were measured and are not what was wrong; what was wrong is the sentence that explained them. |

Nothing else. `check-config-claims`, `check-doc-links` and `ceremony-counts` all pass on the result.
