# Step-order alignment → replay UX → speed pack — the unattended arc

**Autonomous run, 2026-07-24.** One document for the whole arc: the step-order-alignment closure (the sim
adopts the browser's step), the replay-UX build (fix-plan steps 3+4), and the first post-alignment
speed-candidate measurement pack. No owner input was available; every choice below is recorded with its
reason. The fingerprint rule held throughout — one pair per world on each final committed state.

Commit SHAs:
- **`dd07fb6`** — step-order alignment closure (sim executes `raceCore.stepRacePhysics`; D-INIT / D-RUNOUT
  / D-NAME / D-ROWCOUNT closed). Sim fingerprints ON `8b13ccbe96992cc0` / OFF `e07150f936361a73` (moved
  by design). Pushed.
- **`42500f4`** — replay UX (steps 3+4) + rowCount unification. **Behaviour-neutral**: fingerprints
  UNCHANGED (ON `8b13ccbe96992cc0` / OFF `e07150f936361a73`), golden test green. Pushed.
- **this commit** — speed-candidate driver (`scripts/exp-speed-candidates.mjs`) + its results
  (`reports/speed-candidates/`) + this report. Measurement + docs only; **no shipped-race change** (so
  the fingerprints above still stand).

---

## 1. Soak closing tally (step-order alignment)

The re-run 600-identity soak — `realArm` (the real browser core) vs `simArm` (the sim, now executing the
same `stepRacePhysics`) — is **600 / 600 EQUAL, 0 mismatches** (runtime 5260.8 s), **600/600 distinct**
outcome hashes (every identity its own race), 405 plan-enabled / 195 no-plan. Full detail in
[GOLDEN-SOAK.md Part E](GOLDEN-SOAK.md). The first run flagged 30 `searound/dolphin` mismatches → the
D-ROWCOUNT finding, fixed and re-run clean.

**Four divergences closed** (all sim-side-adopts-browser; `raceCore.js` + the browser untouched — see
[DIVERGENCE-AUDIT.md §2f](DIVERGENCE-AUDIT.md)):

| # | what | fix |
|---|---|---|
| D-INIT | per-step execution order (controller.update before the re-roll; interleaved advance) | sim calls the browser's `stepRacePhysics` |
| D-RUNOUT | finished racers slid in the browser, froze in the sim | shared step slides them in the sim too |
| D-NAME | `raceBehavior.js` avoidance tiebreak keys on `r.name`; sim raced an `R{i+1}` roster | sim carries the browser roster (`racerNames`) |
| D-ROWCOUNT | sim used `computeRacerLayout.rowCount`; RaceScreen uses its own inline formula (disagree for small sprites, dolphin 4 vs 3) | sim + harness adopt the inline `computeStartRowCount` |

**Owner cross-check reproduced** (searound / manta / 40): winners **Maverick / Gale / Orbit**, with
**Surge 3rd** (seed 7) and **Blitz 2nd** (seed 42) — exactly as observed in the browser.

---

## 2. PART 2 — replay UX + rowCount unification (fix-plan steps 3+4)

Each item is behaviour-neutral for races; the neutrality proof is **fingerprints unchanged** (ON
`8b13ccbe96992cc0` / OFF `e07150f936361a73`, measured on `42500f4`) **+ the golden test green** (full
client suite 3307 tests + build green).

| item | what shipped | neutrality proof | tests |
|---|---|---|---|
| **2.8 rowCount unification** | `rowLayout.computeStartRowCount(effWidth, N, spriteSize)` — the ONE source; `raceCore`, `goldenRunner` and `sim-fairness` all consume it (no more duplicated inline formula) | same formula, relocated → fingerprints unchanged; golden green | `rowLayout.test.js` (formula + edge cases + D-ROWCOUNT direction) |
| **2.5 seed round-trip** | sim `--replay-seed=S` alias (= `--seed=S --races=1`); browser Quick-Test typed-seed cap lifted from 9999 to `MAX_SAFE_INTEGER` (the 9999 ceiling now bounds only auto-drawn seeds) | CLI alias + browser-input only; no race change → fingerprints unchanged | `quickTestSeed.test.js` (large seeds typable; MAX_SAFE clamp) |
| **2.6 sim replay entry** | `scripts/parity/replay.mjs` `--emit` / `--replay=<identity.json>` pins the full identity (seed/track/roster/counts/laps\|seconds/racePlanEnabled/world hash) via the golden identity helpers; replays the real browser core vs the sim, asserts equal, and detects a drifted identity | new script, no race path touched → fingerprints unchanged | `replay.test.js` (label parse, identity file, round-trip real==sim, drift detection) |
| **2.7 HUD config-fingerprint badge** | `exportRaceConfig.configFingerprintBadge()` = short world hash + EXACT count of config keys off the shipped defaults (`parity/configFingerprint.countConfigDiffs`); drawn under the seed badge, quiet on defaults / prominent when N>0 | HUD-only; no race change → fingerprints unchanged | `configFingerprint.test.js` (count logic pinned) |

---

## 3. PART 1 — speed-candidate measurement pack

**Provisional — the first post-alignment numbers.** They are directionally honest but not final: the
single full re-baseline still waits on the owner's speed pick. This pack does **not** recommend a speed
(taste is the owner's eye); it reports which candidates are **safe** to pick.

**Method.** Three arms — `normalSpeedPxPerSec = 180 / 225 / 270` — nothing else varied. Canonical
per-track defaults (`--track-defaults`), gap-reroll at the shipped default (flagless ON), paired seeds
across arms. The 4 standard sweep tracks (`luger-hill`, `mountainstreet` open; `searound`, `dirt-oval`
closed) at their default racer types, owner-standard fields (40 closed / 60 open), **N=50 per arm ×
track (600 races total)**, parallel workers. Driver: `scripts/exp-speed-candidates.mjs` (→
`reports/speed-candidates/`). Metrics are the standing gate set (pooled band-reach, Holm, runaway /
parade / duo, dead finales, front-group-at-line, escape depth) + the derived default race durations.

### Pooled, per arm (N=50 × 4 tracks = 200 races/arm; wall-clock 21.8 min)

| arm | px/s | band-reach | Holm-unfair | dead finales | front@line | runaway | parade | duo | escape depth med / P90 (L) | duration mean | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **v180** | 180 | **70.1%** | 2/4 | 13.5% | **3.31** | **11.0%** | 2.5% | 2.5% | 2.50 / **5.05** | 58.4 s | **VIABLE** |
| **v225** | 225 | 68.7% | 3/4 | 25.0% | 2.76 | 25.0% | 2.0% | 4.5% | 2.85 / 6.39 | 49.7 s | CONCERNS |
| **v270** | 270 | 68.0% | 2/4 | 17.5% | 2.48 | **29.0%** | 2.0% | 3.5% | 3.57 / **8.29** | 42.8 s | CONCERNS |

**The robust directional signal** (monotonic across the three arms, and larger than N=50 noise): as the
speed rises the races get shorter (58 → 50 → 43 s), and the endgame degrades — **runaway climbs
11% → 25% → 29%**, the **worst-case escape deepens** (P90 5.05 → 6.39 → 8.29 racer-lengths), and the
**front group at the line thins** (3.31 → 2.76 → 2.48). This is exactly the predicted failure mode: a
shorter race has fewer scheduled re-rolls, so its dice-free late window is a larger share of the finish —
a leader that gets away late is less likely to be reeled in. The **slowest arm (v180) is the safest** on
every action/fairness axis, at the cost of the longest races.

### Per track (band-reach + derived default duration)

| arm | luger-hill (open) | mountainstreet (open) | searound (closed) | dirt-oval (closed) |
|---|---|---|---|---|
| v180 | 66.4% · 49.0 s | 70.9% · 60.0 s | 70.9% · 52.0 s | 73.6% · 72.7 s |
| v225 | 65.5% · 39.0 s | 69.3% · 60.0 s | 69.4% · 41.6 s | 71.7% · 58.1 s |
| v270 | 65.2% · 33.0 s | 68.6% · 55.0 s | 69.5% · 34.7 s | 70.0% · 48.5 s |

`paceScale = 1` on every arm × track — **no open track is forced into a uniform slowdown** at any of the
three speeds (all requested durations stay within the natural maximum). `luger-hill` is the weakest track
on band-reach at every speed (65–66%), and is Holm-flagged on all three arms.

### Viability verdicts (SAFETY, not taste)

- **v180 — VIABLE.** The only arm that clears the 70% pooled band-reach bar, and the strongest on every
  action axis (lowest runaway, shallowest escape, most front-group finishes, fewest dead finales). Safe to
  pick; the trade-off is race length.
- **v225 — CONCERNS.** Pooled band-reach **68.7%** dips just under the 70% bar and **3/4** tracks
  Holm-flag; runaway 25%. See the noise caveat below before reading this as a hard fail.
- **v270 — CONCERNS.** The shortest races carry the **highest runaway (29%)** and the **deepest worst-case
  escape (P90 8.29 L)** — the dice-free-late-window inflation, measured. Band-reach 68.0%.

**Noise caveat (honest).** At **N=50** the three band-reach values (70.1 / 68.7 / 68.0%) sit within
sampling noise of each other and of the 70% line, so band-reach does **not** cleanly rank the arms and the
VIABLE/CONCERNS split on it alone is knife-edge. What IS robust is the monotonic runaway / escape /
duration trend above. **A separate FINDING (not fixed here):** post-alignment, at the shipped default
gap-reroll, pooled band-reach sits at ~68–70% across all speeds — below the pre-alignment gate's 71.6%.
That is expected (the sim now runs the browser's genuinely different race) and it means the fairness
baseline itself has shifted: the owner's single re-baseline should re-establish the band-reach anchor, and
a gap-reroll re-tune may be warranted **independent of the speed pick**.

---

## 4. Autonomous decisions (with reasons)

1. **D-ROWCOUNT closed inline** (not deferred as a finding). The chaining rule allowed closing a NEW
   soak mismatch if the fix is sim-side-adopts-browser and small — this was exactly that (the sim adopts
   the browser's inline rowCount; one shared function). So it was fixed, the soak re-run, and PART 2/3
   proceeded on genuine equality rather than on a recorded-but-open divergence.
2. **Replay is a separate `replay.mjs`, not a `--replay` flag on `sim-fairness.mjs`.** A single-race
   replay has no business inside the fairness combo loop, and — decisively — a new script cannot touch
   the fingerprint path. It consumes the SAME `stepRacePhysics` via `realArm`/`simArm`, so a replay there
   IS a sim race.
3. **The seed cap lift keeps a two-tier bound.** Typed seeds accept any positive integer (clamped to
   `MAX_SAFE_INTEGER` so they stay exact for mulberry32); the 9999 ceiling now bounds ONLY auto-drawn
   random seeds, which stay short and readable. This makes sim seeds `(G−1)·N+i+1` typable without making
   the "random" path emit unreadable seeds.
4. **The badge counts LEAF keys, not config blocks.** The existing `describeDeviations` reports
   block-level "<config> changed"; the task asked for "N keys differ", so a new pure
   `countConfigDiffs` (canonical-value compare, order-insensitive) gives an exact leaf count, reused via
   `exportRaceConfig.configFingerprintBadge()`. Its count logic is unit-pinned; the visual is deliberately
   minimal (the owner's eye tunes it later).
5. **PART 1 tracks = the project's own gate set** (`luger-hill`, `mountainstreet`, `searound`,
   `dirt-oval`) — the same 4 `exp-gate-retune.mjs` / `exp-runaway-leader.mjs` use, so the pack is directly
   comparable to the last gate. Fields 40 closed / 60 open (owner-standard). Gap-reroll left at default
   because the spec says "nothing else varies."
6. **PART 1 verdicts judge SAFETY, not taste.** An arm is VIABLE when pooled band-reach ≥ 70% and no
   metric breaks (no Holm blow-up, no runaway/dead spike vs the v225 baseline, no open track forced into a
   uniform slowdown). Otherwise CONCERNS, with the reason named. No arm is "recommended."
7. **Derived durations are computed exactly** (`deriveRaceDuration`), not scraped from a race, so the
   duration column is precise and independent of the sample.

---

## 5. What remains for the owner

1. **The three-seed browser look** — rerun seeds 1 / 7 / 42 on searound / manta / 40 in the browser; the
   bar is **word-for-word**: winners **Maverick / Gale / Orbit**, with **Surge 3rd** (seed 7) and **Blitz
   2nd** (seed 42). Once that passes exactly, the **backup tag** for the speed/duration arc can be cut.
2. **The badge eye-check** — glance at the in-race config-fingerprint badge (under the seed badge): quiet
   grey `cfg <hash> defaults`, or prominent red `cfg <hash> N off default`. Tune the visual to taste.
3. **The speed pick** — choose 180 / 225 / 270 by eye from the pack above (all VIABLE arms are safe to
   pick; a CONCERNS arm carries the named risk).
4. **The single full re-baseline** — after the speed pick, one re-baseline of the sim absolutes (the
   post-alignment fingerprints ON `8b13ccbe96992cc0` / OFF `e07150f936361a73` are the new anchor; every
   memory quoting pre-alignment absolute sim numbers is stale and should be re-measured once).
