# SHIP-THE-NIGHT — the pair loop culls, and the decisive phase starts later

**Merge `a4cb669a`, mint `1d575759`, tag `v-ship-the-night`, 2026-08-10.** Return point:
`pre/ship-the-night` (`24d1ed2c`). Eight branches, one merge commit.

**Fingerprint values are not restated here.** [docs/fingerprints.json](../../docs/fingerprints.json)
is their one home; this report says which moved and why.

---

## WHAT SHIPPED

| | |
|---|---|
| **The race is ~20 % cheaper to compute** | PAIR-PREFILTER-1 — a two-axis field bound in front of the pair loop. **WORLD byte-identical**, which for a cull is the correctness proof rather than a footnote. |
| **The decisive phase begins at 75 % of the leader's run, not 65 %** | OUTCOME-PHASE-75 — the owner's own choice. CAMERA and RENDER move. |
| 259 fallbacks read their default instead of copying it | MIRRORS-BY-REFERENCE |
| 41 of 42 fallback disagreements proven unfireable | FALLBACK-42-TRIAGE |
| the build pill polls `.git` because Vite ignores it | BUILD-PILL-TRUTH |
| the company guarantee binds in the PACK, not on a spread field | SPREAD-FIELD-SWEEP |
| a dead field, a misleading constant, a doc pointing at a deleted table | SMALL-DEBTS |
| the living-doc audit, the routing gap, and two clocks under one name | DOC-AUDIT-2 |
| the pair bound derived, and the duplicate found | PAIR-REACH-ANALYSIS, PAIR-DEDUP-1 |

## THE THREE FINGERPRINTS

**WORLD unchanged. CAMERA and RENDER minted.** Measured by `npm run verify -- --base=24d1ed2c` on
master AFTER the merge, so they are the values of the state actually shipped rather than of a branch,
and both agree with the branch measurement.

**The world hash is the load-bearing one this time.** TWO engine changes landed in the pair loop
together — a deduplication and a cull that skips 96.6 % of pairs at 100 racers — and it held on all
TEN per-track values, separately and merged. It was measured nine times over the night, six of them
as the timing instrument itself, because for a cull the byte-identical world is what establishes that
every skipped pair was one both gates would have rejected.

**The fairness gate has nothing to answer**, and that is a consequence rather than a skip: an
identical world is an identical fairness result. The gate is owed by a change that moves the race;
this one provably does not.

## THE MEASUREMENT, AND THE INSTRUMENT THAT FAILED

The headline — 128.3 s against 160.4 s — comes from the world fingerprint used as a **fixed-work**
timer: ten tracks × three races in one process, the same work every run, interleaved A/B/C. Arm
spreads 3.5–7 %.

`phys-bench-matrix` **could not resolve either engine change**, and that is recorded rather than
worked around: its own control — identical code compared with itself — reads +9 % to +14 % on this
machine tonight. PAIR-DEDUP-1 measured that noise floor at 5–30 % for the first time. **The ceiling
table is therefore NOT re-derived**; a fit through its points gives +5–7 %, inside the noise of its
own inputs, so it is left unstated with the instrument that would answer it named instead.

## WHAT THE OWNER STILL OWES A LOOK

**His eye on the 0.75 decisive phase.** He chose the value; he has not seen it run. The mint was made
under his written instruction for this night run and says so in the record — not on the assistant's
authority, which the standing rule forbids. `pre/ship-the-night` restores the 0.65 world in one
command.

## ONE PREMISE IN THE BRIEF WAS WRONG, AND IS CORRECTED

The brief described a live HUD bug: `getComebackDiagData` never emitting `outcomePhaseThreshold`, so
the HUD would state a stale figure every render. **It does emit it**, unconditionally, and
`_outcomePhaseThreshold` is assigned from the constructor — the HUD was showing the director's real
value all along. The claim originated in `check-fallback-agreement.mjs`'s own exception reason, which
is corrected in place, because a wrong reason on an exception list is worse than none: it is what the
next reader trusts. The three copies of the default were real and are gone anyway.

## VERIFICATION

- CI **green on the branch** before the merge (run 31345579248, both jobs) and **green on master**
  after (run 31346227450).
- `npm run verify -- --base=24d1ed2c` on master: **PASS 15, FAIL 0, SKIP 1**.
- Client suite 3895 tests / 195 files; script suite 182 tests. Both green.
- Every branch confirmed an ancestor of the merged head with `git merge-base --is-ancestor` BEFORE
  the merge. The only conflicts were in `reports/night/INDEX.md`; every entry was kept.

Per-block detail: [PAIR-PREFILTER-1](../night/PAIR-PREFILTER-1.md),
[PAIR-DEDUP-1](../night/PAIR-DEDUP-1.md), [OUTCOME-PHASE-75](../night/OUTCOME-PHASE-75.md),
[DOC-AUDIT-2](../night/DOC-AUDIT-2.md).
