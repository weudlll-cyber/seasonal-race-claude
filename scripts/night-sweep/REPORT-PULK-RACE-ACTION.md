# PulkRaceDirector — action measurement (director OFF vs ON across maxLeadHoldMs)

Branch `feat/pulk-race-director`, tip f73ece8 + this step. **Measurement-only** — no mechanism, no
default change, **sim-fairness.mjs line delta = 0** (the flags were already wired). Date 2026-07-11.

## Headline (numbers for the eye-test)

**The PulkRaceDirector turns the dead PULK front into real action, with fairness intact.** Mean across
the four tracks, director OFF (A0) → ON at 2000 / 1200 / 800 ms:

| | A0 (OFF) | D1 (2000 ms) | D2 (1200 ms) | D3 (800 ms) |
|---|---|---|---|---|
| **distinct P1 (PULK)** | 1.00 | **2.63** | 2.75 | 2.75 |
| **held top-5 overtakes** | 4.25 | **9.25** | 9.25 | 9.25 |
| **median end-lead over P2** | 1.45 L | **0.49 L** | 0.47 L | 0.45 L |
| **min band-reach** | 79 % | 80 % | 80 % | 80 % |
| **start-row-unfair tracks** | luger-hill, searound | *same* | *same* | *same* |

Reading it:
- **Distinct leaders ~×2.7, held overtakes ~×2.2** — and the overtakes are *held* (jitter-filtered), not
  flicker. The front genuinely changes hands now.
- **The typical end-of-PULK lead collapses ~3×** (1.45 → ~0.47 L) — the leader is no longer sailing away;
  the field arrives at OUTCOME bunched. Full-field spread also tightens (e.g. mountainstreet 20.0 → 16.5 L
  p90; searound 25.6 → 21.7 L).
- **Fairness holds:** band-reach is flat-to-up (79 → 80 %), and the director adds **no new** start-row
  failures — luger-hill + searound are unfair at A0 too (the pre-existing closed-track baseline bias
  documented in the runaway-leader report), not caused by the director.
- **The character knob has diminishing returns:** 2000 / 1200 / 800 ms are nearly identical on every
  metric. **The default 2000 ms already captures essentially all the action;** faster rotation buys
  nothing measurable here. The action comes from the group-director machinery, not the cap tightness.
- **The one gap:** searound's **closed-track runaway tail survives** — end-lead p90 stays ~7.5 L and only
  ~2 distinct leaders (vs 3 elsewhere). The director tightens the typical race but does not fully close
  the occasional big breakaway on the track most prone to it (the 6–12 % tail from the runaway report).

## Configuration & windows (verified at source)

- v4 ON; reopened PULK **begin 0.25, end 0.5** — snapshots read the LIVE plan fractions
  `pulkStartFrac`/`pulkEndFrac` (resolved **0.25 / 0.50**), never literals.
- **Only the director writes governorMult:** M1 (`governorDirectorPulkContestEnabled`) and M2
  (`pulkSpringEnabled`) are never set → default false (defaults.js:368/287); `governorDirectorEnabled`
  passed false. Confirmed one governorMult writer.
- Q1/Q3/held over the PULK window `[pulkStart, pulkEnd)` (the action-metrics window; `--action-from-start`
  NOT passed). Q2 is the one-shot pulkEnd snapshot (`--runaway-leader` `runawayEnd.leadOverP2Len`).
- Tracks: mountainstreet/boarder, luger-hill/luge (open); searound/manta, dirt-oval/horse (closed) —
  default racer from each track JSON. 60 s, **100 races/track, seed = 1**, **same seeds across all arms**
  (paired comparison). All distances in racer lengths via the shared `lenScale`.

## Per-arm × per-track tables

**Q1 distinct P1 (med/p90) · Q2 end-lead over P2 med/p90/max (L) · Q3 full-spread p90/max (L) · held-5 · band · unfair**

| arm | track | Q1 med/p90 | Q2 med/p90/max | Q3 p90/max | held5 | band | unfair |
|---|---|---|---|---|---|---|---|
| A0 | mountainstreet | 1 / 2 | 1.50 / 2.03 / 4.45 | 20.0 / 24.0 | 5 | 81 % | false |
| A0 | luger-hill | 1 / 2 | 1.28 / 2.64 / 4.99 | 15.7 / 18.8 | 4 | 80 % | true |
| A0 | searound | 1 / 2 | 1.50 / 6.61 / 10.76 | 25.6 / 33.7 | 3 | 79 % | true |
| A0 | dirt-oval | 1 / 2 | 1.50 / 4.88 / 10.69 | 23.4 / 30.6 | 5 | 81 % | false |
| D1 | mountainstreet | 3 / 5 | 0.20 / 4.83 / 7.11 | 16.6 / 23.7 | 13 | 83 % | false |
| D1 | luger-hill | 2.5 / 4 | 0.35 / 1.42 / 4.72 | 12.9 / 18.7 | 8 | 81 % | true |
| D1 | searound | 2 / 4 | 0.94 / 7.51 / 13.12 | 21.7 / 33.5 | 7 | 80 % | true |
| D1 | dirt-oval | 3 / 5 | 0.48 / 3.38 / 9.94 | 18.8 / 27.7 | 9 | 82 % | false |
| D2 | mountainstreet | 3 / 5 | 0.20 / 4.22 / 7.11 | 16.4 / 23.7 | 13 | 82 % | false |
| D2 | luger-hill | 3 / 4 | 0.29 / 1.37 / 5.07 | 12.9 / 18.7 | 8 | 81 % | true |
| D2 | searound | 2 / 4 | 0.84 / 7.35 / 12.92 | 21.7 / 33.6 | 7 | 80 % | true |
| D2 | dirt-oval | 3 / 5 | 0.53 / 3.47 / 9.94 | 18.6 / 27.4 | 9 | 82 % | false |
| D3 | mountainstreet | 3 / 5 | 0.19 / 4.21 / 6.41 | 16.4 / 23.7 | 13 | 83 % | false |
| D3 | luger-hill | 3 / 4 | 0.29 / 1.37 / 4.44 | 12.9 / 18.7 | 8 | 81 % | true |
| D3 | searound | 2 / 4 | 0.84 / 7.51 / 13.17 | 21.7 / 33.6 | 7 | 80 % | true |
| D3 | dirt-oval | 3 / 5 | 0.48 / 3.36 / 9.94 | 18.7 / 27.3 | 9 | 82 % | false |

## Hygiene note

- **No sim edit, no new observer:** every metric already existed (`distinctP1Pulk`, `heldTop5Overtakes`,
  `fullSpreadLenP90/Max`, the `runawayEnd` snapshot, hero-map `fairness`). **sim-fairness.mjs delta = 0.**
  No observer duplicated or extended.
- **One source per value:** the three rotation caps (2000 / 1200 / 800) live ONCE in the runner's `ARMS`
  table, threaded as flags — no scattered literals. Window bounds are the live plan fractions.
- Three layers respected: measurement in the existing observers, arm/flag threading in the runner,
  mechanism untouched. No scratch scripts, no dead code. Runner reuses the pulk-contest harness pattern.

## Autonomous decisions
1. Ran `--action-metrics --runaway-leader --hero-map` together so Q1/Q2/Q3/held + fairness come from one
   sim invocation per cell (Q2 rides in the action-metrics dump; fairness from hero-map).
2. Reported fairness but did **not** gate on it (per spec) — luger-hill/searound "unfair" is the
   pre-existing baseline bias, shown for context only.

## Where this spec is wrong / worth flagging
1. **"Shrink the pulkEnd lead" is true for the MEDIAN, not the TAIL.** The director cuts the typical
   end-lead ~3×, but the p90/max on searound are unchanged-to-higher (occasional 13 L breakaway). Judging
   the director only by the median would hide that the closed-track runaway — the very thing the owner
   saw — is not fully solved. A hero/tail-specific measure would be needed to claim the runaway is fixed.
2. **The maxLeadHoldMs arm grid is nearly degenerate.** 2000/1200/800 ms produce almost identical numbers,
   so this "character knob" is not the lever the spec implies — its useful range (if any) is likely
   *above* 2000 ms (looser rotation) or the character lives in the *other* director knobs (brake/boost/
   parallel-boosts), which this grid held fixed. Worth a follow-up sweep of those, not the hold cap.
3. **Single seed.** seed=1 for all arms (paired, correct for A0-vs-D deltas), but the absolute rates are a
   seed-1 sample; a seed list would tighten them.
4. **The metrics can't tell "race vs carousel".** distinct-P1 = 3 and held-overtakes = 9 look great whether
   the rotation is organic or a forced round-robin. That distinction is exactly the owner's eye-test —
   these numbers sit *beside* it, they don't replace it.

## Wall-clock
16 cells (4 arms × 4 tracks) × 100 races, conc=6 (shared with a running dev server): **2315 s (~39 min)**.
Raw per-cell dumps in `results/action-metrics/am-pra-*.json`; summary in `results/pulk-race-action/action.jsonl`.
