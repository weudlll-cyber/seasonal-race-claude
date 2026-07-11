# Post-chaos runaway leader — how often, and is it a HERO?

Branch `feat/pulk-race-director`, tip 0f218ff + this step. **Measurement-only** — no mechanism, no
default change, no contest force. Date 2026-07-11.

## Headline (the design-direction answer)

Measured on the SHIPPED baseline (v4 ON, **PulkRaceDirector OFF, M1 OFF, M2 OFF** — all default false),
at the moment the field reaches pulkStart:

- **A large runaway lead is a CLOSED-track phenomenon, and it is RARE.** Open tracks (mountainstreet,
  luger-hill) **never** open even a 3-length lead by pulkStart (0 %). Closed tracks do, in a minority of
  races: **searound 9 %**, **dirt-oval 6 %** of races have a pulkStart lead over 4 racer lengths (up to
  ~8 L on searound).
- **When it happens, the runaway leader is a NON-HERO — always.** Pooled over all 15 large-lead races
  across the four tracks: **0 % were led by a choreographed hero; 100 % by a natural (non-hero) racer.**
- **And the lead usually survives PULK uncatchable.** Among large-lead races the lead is still > 4 L at
  pulkEnd in **67–89 %**, held by the **same racer** in **83–89 %**.

**Design implication:** a **hero-side rule would NOT fix this** — the runaway leader is never a hero. The
fix must act on the **natural (non-hero) leader**, which is exactly what the PulkRaceDirector (a contest
among the non-hero pack) + N1 forced lead-rotation targets. And it is a **closed-track, minority-of-races**
problem — rare but, when it occurs, genuinely uncatchable at baseline.

## Configuration & windows (verified at source)

- v4 ON; reopened PULK **begin 0.25, end 0.5** (`--pulkStart=0.25 --directorV4OutcomeStart=0.5`). The
  snapshots read the **live plan fractions** `pulkStartFrac`/`pulkEndFrac` (resolved = **0.25 / 0.50**),
  never literals.
- **Contest OFF confirmed at source:** `pulkRaceDirectorEnabled:false` (defaults.js:374),
  `governorDirectorPulkContestEnabled:false` (:368), `pulkSpringEnabled:false` (:287); the runner passes
  none of them → all inert. Pure baseline, no contest force.
- Tracks: mountainstreet/boarder, luger-hill/luge (open); searound/manta, dirt-oval/horse (closed) —
  default racer read from each track JSON (never hardcoded). 60 s, **100 races/track, seed = 1**
  (100 distinct deterministic races/track).
- **Snapshot timing (source-verified):** `update()` casts + tags heroes at line 1152; the runaway
  snapshot fires at line 1363 — **after** hero-tagging — so `isHero` is accurate at pulkStart. Q1/Q2 are
  the first frame `raceProgress >= pulkStartFrac`; Q3 compares it to the first frame `>= pulkEndFrac`.
- All gaps = on-track arc distance in **racer lengths** via the shared `arcT × lenScale` (never seconds/px).

## Q1 — pulkStart lead over P2 (racer lengths) + threshold shares

| track | open | median | p90 | max | > 3 L | > 4 L (LARGE) | > 6 L | > 8 L |
|---|---|---|---|---|---|---|---|---|
| mountainstreet | open | 0.97 | 1.51 | 2.81 | 0 % | 0 % | 0 % | 0 % |
| luger-hill | open | 0.65 | 1.32 | 2.10 | 0 % | 0 % | 0 % | 0 % |
| searound | closed | 1.50 | 3.76 | 7.88 | 12 % | **9 %** | 2 % | 0 % |
| dirt-oval | closed | 1.45 | 2.68 | 5.12 | 9 % | **6 %** | 0 % | 0 % |

LARGE = **4.0 racer lengths** (single-sourced constant `RUNAWAY_LARGE_LENGTHS`; the owner may reconsider
— the 3/4/6/8 columns show the cutoff is not a cliff).

## Q2 / Q3 — among LARGE-lead (> 4 L) races

| track | n LARGE | Q2 leader is a HERO | Q3 still > 4 L at pulkEnd | Q3 same racer still leads |
|---|---|---|---|---|
| mountainstreet | 0 | — | — | — |
| luger-hill | 0 | — | — | — |
| searound | 9 | **0 %** | 89 % | 89 % |
| dirt-oval | 6 | **0 %** | 67 % | 83 % |
| **POOLED** | **15** | **0 % (0/15)** | — | — |

## Plain-language, per track

- **mountainstreet (open):** no runaway — the pulkStart lead is never even 3 L (median ~1 L). N/A for Q2/Q3.
- **luger-hill (open):** the tightest — median 0.65 L, never > 3 L. No runaway.
- **searound (closed):** pulkStart lead > 4 L in **9 %** of races (up to ~8 L); of those the leader is a
  hero **0 %** (always a non-hero), and the lead **survives to pulkEnd in 89 %**, same racer in 89 %.
- **dirt-oval (closed):** lead > 4 L in **6 %** of races (up to ~5 L); hero **0 %**; survives in 67 %,
  same racer in 83 %.

## Hygiene note

- **Observer extended, not duplicated:** added `leaderSnapshot` + `RUNAWAY_LARGE_LENGTHS` +
  `RUNAWAY_LEAD_THRESHOLDS_LEN` to the EXISTING front/gap observer `scripts/sim/observers/pulk-contest.mjs`.
  No new observer file; no per-frame loop added — the snapshot is **two one-shot boundary captures**.
- **Rides in the existing action-metrics per-race dump** (`am-<label>.json`) — no new writer. The runner
  passes `--action-metrics --runaway-leader`.
- **`sim-fairness.mjs` line delta = +22** (import + 1 flag + 2 state + 2 capture lines + 4 output fields);
  no new physics/metric math inline.
- **One source per value:** the LARGE threshold (4.0) and the share list [3,4,6,8] live ONCE in the
  observer; the sim + runner reference them by imported constant — no scattered literals (grep-verified).
  Window bounds are the live plan fractions.
- No scratch scripts, no dead exports. Runner reuses the pulk-contest harness pattern.

## Where this spec is wrong / worth flagging

1. **"Lead over P2" ≠ "uncatchable".** The spec equates a large pulkStart lead with "too large to be
   caught", but catchability depends on the closing force over the remaining PULK. Q3 shows the lead
   survives *without* a contest force (baseline) — which is the honest measure of "uncatchable at
   baseline", not "uncatchable in principle". Whether the PulkRaceDirector can close it is the next
   step's question, not this one's.
2. **The phenomenon is rarer than the framing implies.** The owner "saw races" with runaways; the data
   says that's the **closed-track 6–12 % tail**, not the typical race (open tracks: 0 %). A fix should be
   scoped to that tail, not treated as the common case — and it should not regress the 88–94 % of closed
   races (and 100 % of open races) that already arrive at pulkStart tightly bunched.
3. **Single seed.** As before, seed=1 drives all 100 races/track; a genuine seed list would tighten the
   6–12 % share estimates. The **0 % hero** headline is robust (15/15), but the exact large-lead rate is
   a seed-1 sample.
4. **P2 is the reference, not the field.** A big leader→P2 gap with a tight P2..P40 pack is a lone
   breakaway; a big leader→P2 gap where P2 is also isolated is different. This measures leader→P2 only
   (per spec); the leader→field picture is in the PULK-baseline report (§Q3 full-spread).

## Wall-clock
4 cells × 100 races, conc=4 (shared with a running dev server): **934 s (~16 min)**. Raw per-cell dumps
in `results/action-metrics/am-rl-*.json`; per-cell summary in `results/runaway-leader/runaway.jsonl`.
