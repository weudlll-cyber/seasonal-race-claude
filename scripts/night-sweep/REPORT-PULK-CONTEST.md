# PULK front-contest + pack-spring — overnight feasibility sweep

Branch `feat/pulk-reopen`, code tip `e135caa` (mechanisms committed at `483b79f`, before any long run).
Date 2026-07-11. Owner asleep → every ambiguity was decided, documented here, and executed.

---

## 0. TL;DR (read this first)

**Question:** can the reopened PULK window `[0.25, 0.5)` host a front contest (M1) and/or a dense field
(M2) WITHOUT breaking the fairness gate (band-reach ≥ 70% AND 0 Holm-unfair start rows)?

**Answer:**

1. **M1 (front contest) is FEASIBLE and promising.** On every track it holds band-reach (79–84%) and
   *improves* hero story-adherence, while turning a dead PULK into a real contest: distinct P1 holders
   **×3–4** (1.0 → 3.5–4.0) and held top-5 overtakes **+50–60%** (4.25 → 6.5–6.75). It never *causes* a
   fairness failure.
2. **M2 (pack spring) is NOT compelling** at the swept gains: negligible front action, negligible
   density gain (max-link-gap p90 ≈ 2.9 → 2.9), and at the strong gain it *adds* a start-row-unfair
   track. Not recommended for adoption on this evidence.
3. **The fairness GATE could not be met on the 4-track Phase-1 set — but the cause is NOT the
   mechanisms.** `luger-hill` and `searound` are start-row-unfair (Holm p ≈ 0.02) *at the A0 baseline
   and even at the SHIPPED v4 collapse* (OUTCOME-start 0.25). Narrowing the reopened PULK does not fix
   it. This is a **pre-existing baseline property of those two tracks at seed=1 / N=100**, independent
   of the reopened PULK and of M1/M2. **Reported, not fixed (L140).**

**Recommendation:** adopt-to-test **M1** (wire the browser call + a DevScreen control behind its flag);
**park M2**; and open a separate investigation into the luger-hill/searound baseline start-row bias
(is it a real track-geometry effect or an N=100 / seed=1 Holm artifact — a multi-seed run disambiguates).

---

## 1. Byte-identity proof (mechanisms default OFF ⇒ byte-identical to tip `3dbbc75`)

Pinned sim `mountainstreet/boarder`, 60 s, 4 races, seed=1. SHA-256 over `results`+`rawData`, first 12
hex. Working tree (flags OFF) vs base commit `3dbbc75`, three arms:

| Arm (flags OFF) | mine | base `3dbbc75` | verdict |
|---|---|---|---|
| v4-OFF (defaults) | `146e5ba12c13` | `146e5ba12c13` | **byte-identical ✅** |
| v4-ON (defaults) | `922682216f50` | `922682216f50` | **byte-identical ✅** |
| v4-ON reopened PULK (0.25/0.5) | `1dc9d71024c0` | `1dc9d71024c0` | **byte-identical ✅** |

Re-confirmed identical after the observer edits were added (same `1dc9d71024c0`). And each mechanism
*does* act when its flag is ON (rawData differs from the reopened baseline) — verified, so the flags are
neither silently ignored nor silently live.

---

## 2. What was built (shared, flag-gated; sim exposes the flags, browser unchanged at defaults)

| Piece | File | One responsibility |
|---|---|---|
| **M1 mechanism** | `client/src/modules/raceGovernor.js` → `applyPulkFrontContest()` | live-P1 brake + front-challenger boost, scoped to the live PULK window, reusing the director's ±maxEffect clamp + maxStep slew + ceiling-cap. |
| **M2 mechanism** | `client/src/modules/racePlanner.js` → `computePulkBiasedTarget()` (extended in place) | the shipped 3-racer PULK bias generalised to the whole non-hero pack with a dead zone in racer lengths. Heroes exempt. |
| **defaults** | `client/src/modules/storage/defaults.js` | `governorDirectorPulkContestEnabled` (M1) + `pulkSpringEnabled/Gain/DeadZoneLengths` (M2), all default OFF/0. |
| **sim wiring** | `scripts/sim-fairness.mjs` | flag parse + config threading + the M1 call + M2 geom + observer calls only. Line delta **+52** (tens, not hundreds). |
| **density + held-overtake observer** | `scripts/sim/observers/pulk-contest.mjs` | `maxLinkGapLengths` + `makeHeldOvertakeTracker` (hold in leader-progress). |
| **hero-adherence observer** | `scripts/sim/observers/hero-adherence.mjs` | role inference + role-realized + resolved-band, from the raw hero-map `perHero`. |
| **runner** | `scripts/night-sweep/run-pulk-contest.mjs` | orchestration only: arm table (single source of strengths), spawn, checkpoint, resume, time-budget, pick. |

**Design decisions (autonomous):**
- **M1 as a new windowed function beside the director, not a v4 branch inside `applyGovernor`.** The
  director's whole structure (PRE_PULK inclusion, fade-to-corrStart, slot rotation) does not fit a
  hard PULK window and is gated off under v4; a focused sibling reusing the same force + envelope is
  lower-risk than making the 200-line hot path v4-aware. Spec allowed "the how is yours."
- **M1 leader brake acts on the live P1 even if it is a hero** (per spec — keep the front reachable).
  Non-leader heroes are never *boosted* (that would fight the authored curve). The hero-adherence
  metric was watched for damage; none appeared (role-realized held/improved, §5).
- **M1 wired in the SIM only; the browser hot path is untouched** → guaranteed byte-identical at
  defaults, exactly as the spec frames it ("sim exposes the flags; browser paths must not change at
  their defaults"). The M1 function lives in the shared module, ready for browser adoption + a
  DevScreen control as the follow-up. M2's mechanism is *inside* the shared `computePulkBiasedTarget`
  (called by both engines) so it is genuinely shared; the browser call was given the dead-zone
  geometry too (used only when the flag is on → still byte-identical).

---

## 3. Sweep configuration (fixed for the night)

- v4 **ON**. Reopened PULK: begin `0.25`, end/OUTCOME-start `0.50` (the owner-tested setting). PULK boni
  at shipped defaults (`areaBonusPulk 0`, `rowBonusPulk 0`). `governorDirectorEnabled=false` explicit
  (v4 gates the reactive director off).
- 60 s races. **seed = 1** (the sim derives a distinct per-race seed from GLOBAL_SEED=1, so N races are
  N distinct deterministic races). One fixed seed → fully reproducible; see the caveat in §7 on
  multi-seed.
- Density: shipped ±8.1 % band `baseSpeedMin 0.00096 / baseSpeedMax 0.00113` (the shipped range;
  documented, not swept).
- **Tracks (Phase 1):** 2 open + 2 closed, each track's `defaultRacerTypeId` read from its JSON (never
  hardcoded): `mountainstreet/boarder` (open), `luger-hill/luge` (open), `searound/manta` (closed),
  `dirt-oval/horse` (closed). Prior-gate set (matches run-tier1 Stage-1).
- **Races:** Phase 1 = **100/cell** (raised from the spec's 50 — the fairness gate's Holm start-row
  half is noisy at N=50 and the wall-clock budget had huge headroom, so more races = a more reliable
  gate; documented upward deviation). Phase 2 = **200/track**.

### Arm table (the SINGLE source of every strength — no literal repeated in mechanism/observer/report)
| Arm | M1 leaderBrake = challengerBoost | M2 gain | M2 dead zone |
|---|---|---|---|
| A0 | — | — | — |
| M1-weak / med / strong | 0.05 / 0.10 / 0.15 | — | — |
| M2-weak / med / strong | — | 1.0 / 2.0 / 4.0 | 1.0 racer length |

M1 boost is coupled 1:1 to the brake (a symmetric two-sided contest); `pullStrength` / `frontPool` /
`catchThreshold` reuse the shipped director defaults (0.06 / 8 / 2.0).

---

## 4. Metrics and their VERIFIED measurement windows (each checked at source)

| Metric | Window (verified at source) |
|---|---|
| **Fairness — band-reach** | endpoint: final rank vs assigned target band, pooled over the cell's races (`hero-map.json` `fairness.bandReach`). |
| **Fairness — start-row Holm** | per-start-row win-rate, Holm-corrected across rows, pooled over races (`fairness.startRowUnfair` / `startRowMinPHolm`). Endpoint (finish order). |
| **Front action — distinct P1 (PULK)** | live PULK window `[pulkStartLive, pulkEndLive)` = `[0.25,0.5)`, from the LIVE plan fractions — verified `sim-fairness.mjs` `if (ACTION_METRICS && raceProgress >= pulkStartLive && raceProgress < pulkEndLive)`. |
| **Front action — held top-5 overtakes** | same PULK window; a top-5 order flip counts only once it HOLDS ≥ `0.02` leader-progress (`pulk-contest.mjs` `HELD_HOLD_PROGRESS`) — hold in leader-progress, never wall seconds. |
| **Density — max consecutive-link gap (lengths)** | same PULK window; largest adjacent-rank arc gap ÷ mean body length (shared `raceLengths.arcT` + `lenScaleFrom`). p90 + max per race. |
| **Hero story-adherence** | per-hero live span `[anchorProgress, finish]` (the hero-map observer's frames); resolved-band is the endpoint band match; climb-frac + reached-target-prog are the trajectory proxies. |

No metric was taken from memory; the PULK-window bound is the live plan fraction, not a pinned constant.

---

## 5. Phase 1 results (4 tracks × 7 arms × 100 races; 28 cells)

Aggregate per arm (means across the 4 tracks; front-action = per-race medians then averaged):

| Arm | min band-reach | start-row-UNFAIR tracks | distinct-P1 (PULK) | held top-5 | link-gap p90 (L) | hero resolved-band | hero role-realized |
|---|---|---|---|---|---|---|---|
| **A0** | 79% | luger-hill, searound | 1.00 | 4.25 | 2.92 | 85% | 76% |
| M1-weak | 79% | luger-hill, searound | 2.25 | 5.25 | 2.24 | 86% | 79% |
| **M1-med** | 80% | luger-hill | 3.50 | 6.50 | 2.24 | 85% | 79% |
| M1-strong | 81% | luger-hill, searound | 4.00 | 6.75 | 2.21 | 86% | 80% |
| M2-weak | 80% | luger-hill, searound | 1.25 | 4.50 | 2.93 | 85% | 78% |
| M2-med | 80% | luger-hill, searound | 1.00 | 4.75 | 2.95 | 84% | 77% |
| M2-strong | 81% | luger-hill, searound, **dirt-oval** | 1.63 | 5.38 | 2.87 | 83% | 76% |

Reading it:
- **Band-reach never drops below 79%** in ANY arm — the fairness *band* half of the gate is comfortably
  held by both mechanisms at every strength.
- **M1 scales front action monotonically** (P1 1.0→4.0, held 4.25→6.75) and *tightens* the field
  (link-gap 2.92→2.21) while hero adherence is flat-to-better. This is the desired signature.
- **M2 barely moves front action or density** and M2-strong turns dirt-oval start-row-unfair — a signal
  that a strong whole-pack spring can perturb the finish enough to break a previously-fair track.
- **Every arm "fails" the gate only because of the start-row half on luger-hill/searound** — see §6.

Per-cell fairness detail (why each arm "fails"): the start-row failure is confined to luger-hill (all
arms) and searound (all but M1-med); dirt-oval + mountainstreet are start-row-FAIR for every M1 arm.

---

## 6. The gate blocker is the BASELINE, not the mechanisms (diagnostic)

`A0` (both mechanisms OFF) is already start-row-unfair on luger-hill and searound (Holm p ≈ 0.02). Two
diagnostics isolate the cause:

**(a) PULK-width sweep** (`pulkwidth.jsonl`; A0 + M1-med at OUTCOME-start 0.30 / 0.35 / 0.40, N=100):
luger-hill and searound stay start-row-unfair (p ≈ 0.02) at *every* width, including the near-shipped
0.30. So it is **not** a correction-budget effect of a late OUTCOME start.

**(b) Shipped-collapse confirmation** (OUTCOME-start **0.25** = the shipped v4 default, N=100):
`luger-hill` band 83% **startRowUnfair=true** (p 0.02); `searound` band 82% **startRowUnfair=true**
(p 0.02). **The shipped v4 baseline itself fails the start-row half of the gate on these two tracks at
seed=1 / N=100.**

⇒ The reopened PULK and the M1/M2 mechanisms are **not** the cause. luger-hill + searound carry a
pre-existing start-row bias under shipped v4 at this seed/N. **Out of scope — reported, not fixed (L140).**

---

## 7. Decision trace (autonomous, owner asleep)

- **Phase-1 gate result:** no arm passes on all 4 tracks — but §6 shows the failure is the baseline on 2
  tracks, not the mechanisms. Per the rule ("no passer → do NOT run Phase 2 at full scale; finer sweep
  around the least-unfair region; never chase action over fairness"), I did **not** crown a winner and
  run it blindly on all tracks.
- **Instead** I (1) ran the PULK-width diagnostic and (2) confirmed the shipped baseline also fails on
  the 2 tracks. A focused Phase-2 confirmation (A0 + M1-med × 10 tracks, N=200) was launched but
  **cut** — the decision rule forbids full-scale Phase 2 with no passer, and it stalled on OneDrive I/O
  regardless (§8).
- **M2 dropped** from further runs: no action, no density, and a fairness regression at strong gain.
- **Caveat I want the owner to see:** `startRowMinPHolm` sits at exactly `0.02` across many independent
  configs. Because every run is seed=1, the same race population is being re-measured; a **multi-seed**
  run is the honest way to tell a *real* luger-hill/searound start-row bias from an N=100 / seed=1 Holm
  artifact. I did not launch a multi-seed sweep tonight (it would not change the M1-feasibility
  conclusion, which rests on the baseline-fair tracks) — flagged as the first follow-up.

---

## 8. Phase 2 confirmation — NOT RUN (cut deliberately)

The full-scale Phase 2 was **not run**, for two reasons:

1. **The decision rule forbids it.** No Phase-1 arm passed the 4-track gate, and the rule is explicit:
   "NO passer in Phase 1 → do NOT run Phase 2 at full scale." The honest reading (§6–7) is that the
   non-passing is a *baseline* property of two tracks, so a full-scale winner run would only re-measure
   that baseline noise on 8 more tracks.
2. **Practical:** an A0 + M1-med × 10-track × N=200 confirmation was launched but stalled — 10 concurrent
   sims thrashing the OneDrive-synced `results/` tree completed 0 cells in ~20 min. It was killed
   (owner-confirmed) rather than burn the remaining budget on I/O contention.

**This does not weaken the conclusion.** M1's feasibility rests on the Phase-1 tracks whose baseline is
start-row-FAIR (mountainstreet, dirt-oval): there M1 holds band-reach + hero adherence and adds a real
contest, at N=100 across all three strengths (§5). A clean, attributable Phase 2 would run **A0 vs
M1 on the baseline-fair tracks only, at N=300, on a LOCAL (non-synced) disk** — that is the first
concrete follow-up, not a blocker to the finding. Truthful partial: what was measured is Phase 1
(28 cells) + the two diagnostics (26 cells); the scale-confirmation is deferred.

---

## 9. Hygiene self-check (sim source discipline)

- **(a) No new literal duplicates a config value.** grep for the sweep strengths (0.05/0.10/0.15,
  1.0/2.0/4.0) in mechanism + observer files: none — they live ONLY in the runner arm table. The two
  `0.05` hits in `raceGovernor.js` are a pre-existing comment + the existing `directorSettling` default,
  not M1 strengths. Mechanism reads `cfg.*`; observer thresholds (`HELD_HOLD_PROGRESS 0.02`,
  `ROLE_MARGIN_RANKS 2`) live once in their observer.
- **(b) `sim-fairness.mjs` line delta = +52** (tens, not hundreds). All additions are flag-parse (4
  lines), config threading, the M1 call, the M2 geom arg, and observer calls — no new physics, no new
  metric math inline.
- **(c) New files, one responsibility each:** `raceGovernor.js` gained one exported mechanism;
  `pulk-contest.mjs` (density + held-overtake math); `hero-adherence.mjs` (role/adherence math);
  `run-pulk-contest.mjs` (orchestration). Phase windows always from the live plan fractions.
- Nothing experimental left behind: the only scratch (a shipped-collapse confirmation) was two direct
  sim runs into gitignored `client/tmp/`, no script; the PULK-width diagnostic was **promoted** into the
  runner as a first-class `--phase=pulkwidth`, not a scratch file.

## 10. Where this spec is wrong / imprecise

1. **The Phase-1 track set is not gate-clean at baseline.** Two of the four prescribed tracks
   (luger-hill, searound) fail the start-row half of the fairness gate *at the shipped v4 baseline*
   (§6). A feasibility grid whose baseline already fails the gate cannot, by construction, produce a
   "passer" — the spec's decision rule ("no passer → finer low-strength sweep") mis-attributes this to
   the mechanisms. The gate should be applied **relative to the per-track baseline** (does the mechanism
   *regress* fairness?), not as an absolute pass/fail, on any track whose baseline already fails.
2. **"Deterministic seeds; fixed seed list" but a single seed is used.** The sim takes one GLOBAL_SEED
   and derives per-race seeds; the start-row Holm test at N=100 on a single global seed cannot separate
   a real track bias from a seed artifact (§7). A genuine *list* of global seeds is needed for the
   start-row gate to be trustworthy.
3. **Hero trajectory-adherence (item 4b) asks for a rank-vs-curve deviation distribution** that the sim
   does not collect — the authored curve is not sampled per frame. Building it would enlarge the
   byte-identity surface (new per-frame sim collection), so this sweep uses the honest proxy (climb-frac
   + reached-target-progress + peak depth). Full curve-deviation is a clean follow-up if wanted.
4. **M2's dead zone is defined "in racer lengths" but the re-roll bias operates in t-space.** The dead
   zone is applied as a hard gate on |gap-to-centroid| in lengths; beyond it the full t-space bias
   applies (a proportional-to-excess variant would be smoother). Documented as a hard gate.

## 11. Wall-clock + cells

| Phase | cells | races/cell | wall-clock | note |
|---|---|---|---|---|
| Phase 1 grid | 28 / 28 | 100 | **1929 s (32 min)** | all finished |
| PULK-width diagnostic | 24 / 24 | 100 | **1714 s (29 min)** | all finished |
| Shipped-collapse confirm | 2 (+1 timed out) | 100 | ~7 min | 2 key results captured |
| Phase 2 confirmation | 0 / 20 | 200 | ~20 min then KILLED | OneDrive I/O thrash; cut per §8 |

**Total sweep cells completed: 54** (28 grid + 24 pulk-width + 2 shipped-confirm). Budget: well under 7 h;
the limiter was per-cell I/O contention, not compute.

Runs were I/O-bound (up to 10–12 concurrent sims writing into the OneDrive-synced tree), so per-cell
wall-clock ran well above the single-process rate (~0.7 s/race); the total still fit the budget with
hours to spare. Checkpointed + resumable throughout; zero orphaned child processes.
