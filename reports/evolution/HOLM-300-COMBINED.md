# HOLM-300-COMBINED — the deferred 300-race native pooled Holm, paid on the combined (flapping + motion) world

**Standing debt paid.** This run executes the definitive fairness gate that was deferred through RACER-FLAPPING-2
and RACER-MOTION-2: the native pooled `computeFairnessStats` Holm at **N=300 races/track**, on the current
shipped world `dc4647be0f55ebdb` (master @c65db3ae — margin hysteresis + lateral acceleration cap together).
The N=100 quartet was underpowered; N=300 is the power the "0 Holm-unfair start rows" criterion is written
against. Read-only verification, preregistered: continuity within noise + the native pooled Holm as the
definitive verdict. Nothing was tuned or shipped from this run.

## The combined-world N=300 gate (master @c65db3ae, world dc4647be)

| track | band N=300 (vs N=100) | rowMin | **native pooled Holm** | runaway |
|---|---|---|---|---|
| searound / manta | 89.3% (89.3) | 88% | UNFAIR p=0.020 | 0% |
| luger-hill / luge | 91.0% (91.3) | 90% | UNFAIR p=0.020 | 0% |
| seatrack / dolphin | 90.7% (91.5) | 90% | **UNFAIR p=0.020** | 0% |
| space-sprint / rocket | 89.0% (89.0) | 88% | ok p=0.260 | 0% |

**Continuity (preregistered) — all hold:** band arrival is within noise of the N=100 quartet on every track
(Δ ≤ 0.8pp), runaway is **0% on all four**, and rowMin holds at **88–90%** (the worst single start row still
reaches its band 88–90% of the time — far above the ~70% floor concept). So on magnitude the world is fair on
every track.

**The Holm texture:** 3/4 tracks flag UNFAIR at the native N=300 pooled test, all at the permutation-floor
p=0.020; space-sprint is clean. Relative to the underpowered N=100 quartet (2/4 flagged: searound + luger),
**seatrack is newly flagged** — the preregistered "new UNFAIR" condition. The magnitude is tiny (rowMin 90%),
which is the signature of a small real start-row gradient that N=300's power detects and N=100's does not. To
tell *motion-induced* from *pre-existing-and-power-revealed*, the pre-motion baseline at N=300 (never previously
run) is the decisive comparator.

## Decisive comparator — the same quartet at N=300 on the PRE-MOTION world

The FLAPPING-2 ship `62400c8e` reproduced via `--behavior='{"maxLateralAccelPerStep":0}'` (motion cap off,
everything else identical), N=300, same seed:

| track | pre-motion (cap OFF) | combined (cap ON) | Holm verdict changed? |
|---|---|---|---|
| searound / manta | band 89.1% rowMin 88% **UNFAIR** p=0.020 | band 89.3% rowMin 88% **UNFAIR** p=0.020 | no |
| luger-hill / luge | band 91.6% rowMin 91% **UNFAIR** p=0.020 | band 91.0% rowMin 90% **UNFAIR** p=0.020 | no |
| seatrack / dolphin | band 90.4% rowMin 90% **UNFAIR** p=0.020 | band 90.7% rowMin 90% **UNFAIR** p=0.020 | no |
| space-sprint / rocket | band 88.7% rowMin 88% ok p=1.000 | band 89.0% rowMin 88% ok p=0.260 | no |

**The motion cap changes the native pooled Holm verdict on 0/4 tracks.** Band arrival is within noise pre↔post
on every track (|Δ| ≤ 0.6pp), runaway is 0% in both worlds, rowMin holds. seatrack is UNFAIR at N=300 **with
and without** the cap — so its flip relative to the underpowered N=100 quartet is statistical power revealing a
pre-existing start-row gradient, **not motion-induced**.

## Verdict — GREEN for the engine change (motion is Holm-neutral); the residual is PAID

The deferred debt was to run the definitive N=300 native pooled Holm before the next engine change and confirm
the combined world held. It ran, and the paired pre/post comparator makes the verdict clean: **RACER-MOTION-2's
acceleration cap is fairness-neutral at the definitive power** (identical Holm verdict on all four tracks,
band/runaway/rowMin all within noise). The "new UNFAIR" tripwire fired on seatrack but the comparator defuses
it — the flag is pre-existing shipped texture, not a regression from the cap. So the residual is **PAID** and
the gate for the next engine change is open again, with the definitive N=300 texture now on record as the
baseline future changes are measured against.

**One honest caveat, reserved for the owner's read (NOT auto-blessed):** the definitive N=300 measures the
standing world — for the first time — as **3/4 of this quartet carrying a small but real start-row gradient**
(searound, luger-hill, seatrack UNFAIR; space-sprint clean). The magnitude is tiny (worst start row still
reaches its band 88–90% of the time; band arrival 89–91% on all four; runaway 0%), and it is **pre-existing and
motion-neutral** — but it does not meet the aspirational "0 Holm-unfair start rows" line at N=300 power. Whether
this near-pass texture is acceptable, or warrants its own dedicated start-row fairness line, is an owner + planner
judgment (Proposal 1). Nothing was changed to chase it — this run is read-only verification.

## Five sentences

1. The deferred 300-race native pooled `computeFairnessStats` Holm was paid on the current shipped world
   (master @c65db3ae, dc4647be = margin hysteresis + acceleration cap together).
2. Continuity holds on every track — band arrival within noise of the N=100 quartet (89–91%), runaway 0%, rowMin
   88–90% — so the combined world is fair in magnitude everywhere.
3. The native pooled Holm flags 3/4 of the quartet (searound, luger-hill, seatrack) at the p=0.020 permutation
   floor, with seatrack newly flagged versus the underpowered N=100 run.
4. A paired pre-motion N=300 comparator (`--behavior='{"maxLateralAccelPerStep":0}'`) returns the **identical
   Holm verdict on all four tracks**, proving the acceleration cap is Holm-neutral and seatrack's flip is
   statistical power revealing a pre-existing tiny start-row gradient, not a motion regression.
5. Verdict GREEN for the engine change — the residual is PAID and the next-change gate is open — with the honest
   caveat that the standing world's definitive texture is a 3/4-track near-pass, reserved for the owner's read.

## Proposals (≥ 2)

1. **Decide whether the pre-existing 3/4-track start-row gradient warrants its own fairness line.** The
   definitive N=300 now shows searound/luger-hill/seatrack carry a small monotone start-row advantage (rowMin
   88–90%, band 89–91%) that N=100 could not detect. It is tiny and motion-neutral, so it is not urgent — but it
   is the true standing texture. If the owner wants the aspirational 0-Holm, this is a dedicated start-row
   equalization task (e.g. a gentle start-row-indexed band-target nudge), measured at N=300, entirely separate
   from the avoidance/feel work.
2. **Adopt the paired pre/post N=300 comparator as the standard engine-change gate.** This run proved that the
   single most informative fairness test for an engine change is not the absolute Holm (which is dominated by
   pre-existing texture) but the **paired pre-vs-post Holm at N=300** — "does the change move the verdict on any
   track?" It cost ~90 min unattended and gave an unambiguous neutrality proof. Bake it into the ceremony so the
   next change ships with a neutrality certificate, not a deferred debt.
3. **Record the p=0.020 permutation floor as the Holm resolution limit.** All flagged tracks report exactly
   p=0.020, which is the smallest p the permutation test can emit at this configuration — so the test
   distinguishes "flagged" from "clean" but not the *strength* of a flag. If the owner wants to rank the three
   flagged tracks by severity (to prioritize Proposal 1), raise the permutation count so p can resolve below
   0.020.
