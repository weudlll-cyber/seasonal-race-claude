# SWEEP 1 — LBB Fairness Re-Gate

Production merge gate for `fix/lbb-clean` (condition-d removal). All 10 default tracks,
300 races/track, seed=1, 60s, default racer per track, 40 racers (closed) / 60 (open).

**Gate:** band-reach ≥ 70% AND 0 Holm-unfair start rows.
band-reach + startRowUnfair (299-perm Holm) read from each track's `hero-map.json`.

| Track | Topology | Racer | Racers | band-reach | per-band | startRowUnfair | minPHolm | Verdict |
|---|---|---|---|---|---|---|---|---|
| city-circuit | closed | motorbike | 40 | 80.7% | B1 83% / B2 80% / B3 70% / B4 88% | true | 0.0200 | **FAIL** |
| dirt-oval | closed | horse | 40 | 81.2% | B1 83% / B2 81% / B3 71% / B4 88% | true | 0.0400 | **FAIL** |
| ice-track | closed | snowmobile | 40 | 80.9% | B1 82% / B2 79% / B3 71% / B4 88% | true | 0.0200 | **FAIL** |
| luger-hill | open | luge | 60 | 74.4% | B1 73% / B2 72% / B3 65% / B4 68% / B5 86% | true | 0.0200 | **FAIL** |
| space-sprint | open | rocket | 60 | 72.9% | B1 72% / B2 68% / B3 61% / B4 68% / B5 85% | true | 0.0200 | **FAIL** |
| mountainstreet | open | boarder | 60 | 77.1% | B1 73% / B2 74% / B3 68% / B4 72% / B5 88% | true | 0.0400 | **FAIL** |
| river-run | open | duck | 60 | 77.5% | B1 75% / B2 74% / B3 69% / B4 72% / B5 88% | true | 0.0200 | **FAIL** |
| garden-path | closed | snail | 40 | 81.5% | B1 81% / B2 80% / B3 73% / B4 89% | true | 0.0200 | **FAIL** |
| searound | closed | manta | 40 | 80.2% | B1 80% / B2 77% / B3 71% / B4 88% | true | 0.0200 | **FAIL** |
| seatrack | open | dolphin | 60 | 76.4% | B1 75% / B2 73% / B3 68% / B4 71% / B5 87% | true | 0.0200 | **FAIL** |

## Verdict

**VERDICT: GATE FAIL: city-circuit (Holm-unfair p=0.0200); dirt-oval (Holm-unfair p=0.0400); ice-track (Holm-unfair p=0.0200); luger-hill (Holm-unfair p=0.0200); space-sprint (Holm-unfair p=0.0200); mountainstreet (Holm-unfair p=0.0400); river-run (Holm-unfair p=0.0200); garden-path (Holm-unfair p=0.0200); searound (Holm-unfair p=0.0200); seatrack (Holm-unfair p=0.0200)**

## Interpretation — artifact vs regression

- 10/10 tracks fail on **startRowUnfair ONLY** (band-reach ≥ 70%); 0 fail on band-reach.
- **Every** track passes band-reach and fails only the Holm start-row test, with minPHolm clustered
  just under 0.05. This is the signature of the Holm start-row test **over-powering at N=300** — a known
  property (the permutation test gains power with N, flagging practically-negligible row effects as
  "significant"). The SAME shipped config (choreoOutcomeStart=0.5) flags Holm on only 2/4 tracks at
  N=100 in the choreoOutcomeStart sweep (dirt-oval and ice-track PASS there), but all tracks flag at
  N=300 here — i.e. the flag scales with race count, not with the `fix/lbb-clean` change.
- **This gate cannot distinguish artifact from regression on its own.** Before treating this as a merge
  blocker, re-run the identical N=300 gate on `master` (baseline). If master also fails all 10, the
  failure is the over-powered gate, not the condition-d removal, and the merge is fairness-neutral.

_No commits — owner reviews before merging `fix/lbb-clean`. Recommend a `master` N=300 baseline run to confirm._

