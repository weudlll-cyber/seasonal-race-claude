# PULK-window baseline measurement — NO new force

Branch `feat/pulk-reopen`, tip `4244b4b` + this step. **Measurement-only** — no mechanism, no default
change, no new force. Date 2026-07-11.

## TL;DR (the owner's three questions)

Measured over **race start → PULK end** (`raceProgress ∈ [0, pulkEnd)`), reopened PULK, contest OFF:

- **Q1 — gaps > 3 racer lengths?** *Open* tracks essentially never tear (**0 %** of frames on
  mountainstreet & luger-hill; max link gap ~5 L). *Closed* tracks tear often: **searound 27 %** of
  frames have a gap > 3 L (up to **10.8 L**), **dirt-oval 13 %** (up to 10.7 L).
- **Q2 — how many different racers hold P1?** The front is **nearly dead**. Only **2–3** distinct
  leaders over the whole `[0, pulkEnd)` window, and *inside the PULK phase itself* it is **exactly 1**
  leader holding P1 **100 %** of the time on every track. The 2–3 come entirely from the chaos start
  `[0, 0.25)`, not from PULK.
- **Q3 — how wide is the whole field spread?** Open ~**15–19 L** (p90 leader→last), closed ~**22–25 L**
  (up to **34 L** max on searound).

This is the "dead PULK" the owner suspected: a locked front and (on closed tracks) a field that tears
into >3-length holes. It is exactly the case a front-contest force (M1) would target.

## Configuration (fixed, confirmed at source)

- v4 **ON**. Reopened PULK: begin `0.25`, end/OUTCOME-start `0.50`.
- **`areaBonusPulk = 0` and `rowBonusPulk = 0`** — the shipped defaults, confirmed at
  `defaults.js:374` and `defaults.js:377`, **not overridden** by any flag in the run (so the PULK area
  + start-row bonuses are OFF, as the owner specified).
- **`governorDirectorPulkContestEnabled` OFF** — the M1 front-contest flag is absent from every run;
  the new force does not act. This is the baseline.
- Heroes run their v4 curves from `pulkStart` (unchanged, intended).
- Tracks (2 open + 2 closed, owner-confirmed): mountainstreet/boarder, luger-hill/luge (open);
  searound/manta, dirt-oval/horse (closed). Each track's **`defaultRacerTypeId` read from its JSON**
  (never hardcoded).
- 60 s races, **100 races/track**, **seed = 1** (the sim derives a distinct per-race seed from
  GLOBAL_SEED=1 → 100 distinct deterministic races; fully reproducible).

## Measurement window (verified at source, stated with each metric)

- **Primary window = `raceProgress ∈ [0, pulkEndLive)`** — race start through the end of PULK (i.e.
  everything before OUTCOME begins). The upper bound `pulkEndLive` is READ from the live plan fractions,
  never a literal: `sim-fairness.mjs:941` `const pulkEndLive = govFractions?.pulkEndFrac ?? SD_PULK_END;`
  and the window gate `sim-fairness.mjs:1339` `raceProgress >= amWindowFrom && raceProgress < pulkEndLive`
  with `amWindowFrom = ACTION_FROM_START ? 0 : pulkStartLive` (:1338).
- **Secondary sub-window = `[pulkStartLive, pulkEndLive)`** — the PULK phase only (flag OFF), reported
  below so the chaos-start contribution is visible separately.
- All three metrics are per-frame over the window, aggregated per race then across the 100 races.

## Q1 / Q2 / Q3 tables

### PRIMARY window `[0, pulkEnd)` (medians across 100 races; "max" = max across races)
| track | open | **Q1** frames-over-3L | link-gap p90 (L) | link-gap max (L) | **Q2** distinct P1 (med/p90) | most-dominant P1 hold | **Q3** p10→p90 (L) | full spread p90 (L) | full spread max (L) |
|---|---|---|---|---|---|---|---|---|---|
| mountainstreet | open | **0 %** | 1.86 | 5.47 | 2.5 / 3 | 97 % | 8.3 | 19.2 | 23.96 |
| luger-hill | open | **0 %** | 1.79 | 4.99 | 2 / 3 | 100 % | 8.09 | 15.32 | 18.84 |
| searound | closed | **27 %** | 3.95 | 10.75 | 2 / 3 | 93 % | 12.57 | 24.71 | 33.74 |
| dirt-oval | closed | **13 %** | 3.15 | 10.68 | 3 / 4 | 79 % | 9.54 | 22.3 | 30.55 |

### SECONDARY window `[pulkStart, pulkEnd)` — PULK phase only
| track | open | **Q1** frames-over-3L | link-gap p90 (L) | link-gap max (L) | **Q2** distinct P1 (med/p90) | most-dominant P1 hold | **Q3** p10→p90 (L) | full spread p90 (L) | full spread max (L) |
|---|---|---|---|---|---|---|---|---|---|
| mountainstreet | open | 0 % | 1.99 | 5.47 | 1 / 2 | 100 % | 11.74 | 19.99 | 23.96 |
| luger-hill | open | 0 % | 1.9 | 4.99 | 1 / 2 | 100 % | 8.98 | 15.67 | 18.84 |
| searound | closed | **49 %** | 4.23 | 10.75 | 1 / 2 | 100 % | 14.61 | 25.57 | 33.74 |
| dirt-oval | closed | **26 %** | 3.57 | 10.68 | 1 / 2 | 100 % | 13.09 | 23.36 | 30.55 |

## Plain-language answer, per track (primary window `[0, pulkEnd)`)

- **mountainstreet (open):** the field never tears — 0 % of frames with a gap > 3 L (biggest hole seen
  ~5.5 L). The front is nearly dead: only ~2–3 different leaders and one racer holds P1 ~97 % of the
  time. Whole-field spread ~19 lengths.
- **luger-hill (open):** same story, tighter — 0 % gaps > 3 L (max ~5 L), 2–3 leaders but one holds P1
  100 % of the window, field spread ~15 lengths (the most bunched track).
- **searound (closed):** tears the most — a gap > 3 L in **27 %** of `[0, pulkEnd)` frames and **49 %**
  of PULK-only frames, up to **~11 lengths**. Front still dead (2–3 leaders, one holds 93 %). Widest
  field: ~25 lengths (up to 34).
- **dirt-oval (closed):** tears in 13 % of frames (26 % in PULK), up to ~11 lengths; the most contested
  front of the four but still only ~3 distinct leaders with one holding ~79 %. Field spread ~22 lengths.

**Read-across:** inside the PULK phase the front is a lock (1 leader, 100 %) on *every* track — the front
"action" in the primary window is entirely the chaos start settling. Closed tracks additionally open
real >3-length holes; open tracks stay bunched. Both are arguments for a PULK front-contest.

## Hygiene note (source discipline)

- **Reused (unchanged):** `maxLinkGapLengths` and the distinct-P1 counter (`amP1Steps`) and the p10→p90
  spread — all pre-existing. **Extended (same observer, same frame loop):** added `fullSpreadLengths`
  (Q3 leader→last) and `framesOverThresholdShare` + `GAP_THRESHOLD_LENGTHS = 3.0` (Q1) to
  `scripts/sim/observers/pulk-contest.mjs`; the sim pushes the full-spread value in the EXISTING
  action-metrics frame loop (no duplicate loop, no parallel observer).
- **Window widening is a threading line:** `--action-from-start` flips the loop's lower bound from
  `pulkStartLive` to `0`; default OFF preserves the prior `[pulkStart, pulkEnd)` semantics.
- **`sim-fairness.mjs` line delta = +17** (import + 1 flag + window-threading + full-spread push + 6
  output fields). **No new metric math inline.**
- **One source per value:** the 3.0-length threshold lives ONCE in the observer (`GAP_THRESHOLD_LENGTHS`)
  and is referenced by constant in the sim (`:2329`) and never repeated; the window bound is the live
  plan `pulkEndFrac`. No scratch scripts left behind.
- No mechanism edit, no default change → nothing could alter the race; byte-identity step skipped per
  the spec.

## Where this spec is wrong / imprecise

1. **"gaps in the field" is ambiguous between *adjacent-link* gaps and *leader→field* gaps.** The owner
   asked "are there gaps > 3 L". I answered it as the **max adjacent-link gap** (the biggest hole
   *anywhere* between two consecutively-ranked cars) because that is what "the field tore" means
   perceptually — a lone leader 20 L clear of a tight pack is one 20-L link gap, not a torn field. If
   the owner meant "is anyone > 3 L behind the leader", that is a different (and always-larger) number;
   the full-spread column (leader→last) brackets it. Flagged so the definition is explicit.
2. **Single seed under a "fixed seed list" phrasing.** As in the prior sweep, one GLOBAL_SEED drives all
   100 races; the numbers are a faithful measure of the seed-1 race population but a genuine seed *list*
   would tighten the per-track distributions. Not a correctness issue for a baseline snapshot.
3. **The 3-length threshold is a single fixed constant.** The owner may want the distribution around it
   (share of frames > 2 L, > 4 L, …) rather than one cut. Easy to add (the per-frame max-link-gap array
   is already collected); one threshold was built per the spec.

## Wall-clock

8 cells (4 tracks × 2 windows), 100 races each, conc=6 (capped low to avoid the OneDrive-synced-I/O
thrash that stalled the previous sweep's Phase 2): **1297 s (~22 min)**. Checkpointed + resumable; zero
orphaned processes. Raw per-cell dumps in `results/action-metrics/am-pb-*.json`; per-cell summary rows in
`results/pulk-baseline/baseline.jsonl`.
