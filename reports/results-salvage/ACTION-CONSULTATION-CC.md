# OUTCOME Action — Design Consultation (CC)

**Author:** CC (Claude Code). Written without reading the Copilot file.
**Scope:** Pure analysis and critique of the code as it stands on master `5646d23`. No code changes, no measurements.
**Basis:** Direct read of `racePlanner.js`, `heroCurveGenerator.js`, `heroChoreography.js`, `RaceScreen/index.jsx`, `defaults.js`.

---

## 0. The one correction that reframes everything

The consultation brief says *"`trajectoryMult` is a rank servo (rank-blind to gaps)… it simply enforces exact rank order."* That is **half true, and the wrong half is the important one.**

Two facts change the whole design conversation:

1. **A band-level servo already exists.** The controller does **not** only steer to exact rank. It computes both a `rankError` and a `bandError`, and blends them by a `strictness` knob (`racePlanner.js:600`):

   ```js
   const error = strictness * rankError + (1 - strictness) * bandError;   // :600
   const rawTarget = clamp(1.0 + gain * (error / nActive) + noise, 0.85, 1.1); // :602
   ```

   `bandError` is **zero whenever a racer is inside its target band** (`:591–598`, using `getAreaBounds` `:49–54`). So the machinery to say *"stop correcting once you're in your band"* is **already in the codebase**. It is simply **not being used for the racers the Owner is watching.**

2. **The dead zone is not the servo being too strong — it is the servo being applied to the wrong target, too early, in the wrong space.** The problem decomposes into three independent mechanisms, each of which is separately fixable. The rank-vs-gap framing in the brief is real, but it is only Root Cause #3.

The rest of this document establishes the mechanistic model, names the three root causes with code evidence, then answers Q1–Q6 with concrete levers, trade-offs, and risk.

---

## 1. How OUTCOME actually works (mechanistic model)

**Targets.** Every racer is assigned an **exact** target rank via Fisher-Yates shuffle (`racePlanner.js:178–188`). Heroes additionally get a time-varying **hero curve** `rank(progress)` (`heroCurveGenerator.js`) that is anchored at `pulkStart` and ends at that exact rank. The pack keeps the constant Fisher-Yates rank.

**The servo (per frame, per racer).**
- `rankError = currentRank − targetRank` (`:589`)
- `bandError` = signed distance **outside** `[areaLo, areaHi]`, else `0` (`:591–598`)
- `error = strictness·rankError + (1−strictness)·bandError` (`:600`)
- `trajectoryMultTarget = clamp(1.0 + 2.0·error/nActive, 0.85, 1.1)` (`:602`, `gain=2.0`, clamp `:77–79`)
- Smoothed to the racer via `easeInOutCubic` over `trajectoryTransitionDuration` (`RaceScreen:1003–1015`).

**Strictness assignment (`:580–586`):**
- **Heroes: `strictness = 1.0` → pure `rankError` → exact-rank pin.**
- Pack under choreo: `strictness = 0.5` → half exact, half band-edge.
- Choreo-off: controller default (1.0).

**Authority.** `[0.85, 1.1]` is **asymmetric: −15% brake / +10% boost.** The servo can slow a leader harder than it can push a chaser.

**Band resolve schedule (`:285–291`, defaults `defaults.js:317–321`):**

| Band | resolve progress | window before finish |
|---|---|---|
| B1 | 0.97 (release) | 0.03 |
| B2 | 0.80 | 0.20 |
| B3 | 0.70 | 0.30 |
| B4 | 0.65 | 0.35 |
| B5 | 0.60 | 0.40 |

A hero curve is rejected at generation time unless it is **already inside its final band by its checkpoint** (`checkPositiveBudget`, `heroCurveGenerator.js:284–291`; `feasibleTiming` `:178–195`). After the checkpoint the curve is effectively **flat at the exact final rank**.

**Release (`:565–572`).** Only **B1 heroes**, only at `phaseProgress ≥ 0.97`, flip `targetRank = currentRank` → `rankError = 0` → `mult → 1.0` (natural run-out). No other band releases. **There is no "arrived in band" detection anywhere** — release is purely a time gate.

**Re-roll is a separate axis.** Re-roll sets `spreadFactor` (a baseSpeed multiplier, "luck"), *orthogonal* to `trajectoryMult` (`RaceScreen:1075, 1106`). Its gap-closing bias (`computePulkBiasedTarget`, `racePlanner.js:637–665`) nudges the draw toward the pulk centroid — but is **hard-gated to PULK** (`:646`) and only touches the 3 designated pulk racers (`:652`). In OUTCOME it is a plain random draw clamped to `[0.871, 1.129]`, and it **freezes at 95%** (`RaceScreen:902–903, 1074`), firing only ~4–6 times per race.

---

## 2. Root-cause diagnosis of the dead OUTCOME

**Root Cause #1 — Bands lock early, then hold flat (the visible 40%).**
Deep bands resolve at 0.60–0.80. From the checkpoint to the finish the curve is flat at an exact rank and the servo pins the racer there (heroes at `strictness 1.0`). By ~0.75 progress the entire field below B1 is a set of exact-rank locks with only ±15% authority trimming drift. **Nothing is *supposed* to move in the back third** — that is the design, and it is exactly what the Owner sees. Note the collision with the new `choreoOutcomeStart = 0.6`: PULK now ends at 0.6, which is *at or past* the B5 (0.60) and B4 (0.65) checkpoints — the deep bands are asked to resolve essentially the instant OUTCOME begins.

**Root Cause #2 — Heroes are pinned to exact rank, not band.** `bandError` gives within-band freedom, but only the pack gets it. The heroes — the racers the camera follows — run at `strictness 1.0`, so a hero assigned rank 8 is servo-nailed to 8, never allowed to jockey within B2 (6–15). The one existing within-band-freedom mechanism is switched off for the interesting racers.

**Root Cause #3 — The servo lives in rank space; the complaint lives in distance space.** *"The winner drives away… a big gap."* A leader at rank 1 with target rank 1 has `rankError = 0` → `mult = 1.0` → it coasts at its natural baseSpeed **regardless of how many seconds ahead it is.** The servo has **no term that reads the T-space gap.** A lucky `spreadFactor` leader opens an arbitrary distance gap while remaining "correctly" rank 1. This is the brief's rank-blindness, and it is real — but it is a *missing mechanism*, not a mis-tuned one.

These are independent. #1 and #2 kill *rank* action (overtaking); #3 kills *distance* tension (closing). A convincing OUTCOME needs both addressed.

---

## 3. Answers to the six questions

### Q1 — Rank servo vs band servo
**It already is a band servo; it's just turned off for heroes.** The lever is `strictness` (`:600`). The cleanest change is to **ramp hero strictness down through OUTCOME** — e.g. `strictness = lerp(1.0 → ~0.2, over [choreoOutcomeStart → 1.0])`, or drop it to a fixed `outcomeStrictness` once past the band checkpoint. Because `bandError = 0` inside the band, this *preserves band-reach by construction*: the servo still slams a racer that tries to leave its band, but exerts near-zero force while it is inside. Heroes would then finish *somewhere* in their band rather than at a pinned rank — which is precisely "order preserved at the band level, free within."
**Cost:** exact finish rank becomes non-deterministic within a band (not a gate; see Q6).

### Q2 — Within-band reordering without violating the gate
**Yes, and it needs no new fairness surface.** The gate is band-reach; `bandError` is the band wall. Any racer inside its band contributes `error → (1−strictness)·0 = 0`, so with lowered strictness it runs on natural speed + re-roll luck and can swap freely with same-band neighbours. The endpoint-only fairness contract is explicit that this is legal: *"role pairing = same-band endpoint swap only"* (`heroCurveGenerator.js:9–18`), and a `sameBandSwap` primitive already exists (`:122–133`). Within-band reordering is the *sanctioned* form of action here. The only thing suppressing it is `strictness 1.0` + flat post-resolve curves.

### Q3 — Release logic: band-arrival vs time-based
**Band-arrival release is strictly better-targeted, with one guard.** Today's release is time-based, B1-only, last 3%. Generalise it: **release a racer (strictness→~0, or target→currentRank) the moment `currentRank ∈ [areaLo, areaHi]`, and re-engage if it drifts out.** This turns "arrived in your band" into free racing for *every* band, from the moment of arrival, while the re-engage guarantees no band escape (band-reach safe by construction).
**Required guard: hysteresis.** Releasing exactly at the boundary invites oscillation (release → drift out → yank back → release). Release only when *comfortably* inside (e.g. rank within `[lo+1, hi−1]`) and re-engage at the edge. Time-based release (0.97) is *not* fundamentally better — it is just simpler and was only ever wired for B1. Band-arrival release is the mechanism the Owner is actually asking for ("detect when a racer has arrived and release him").

### Q4 — Distance mechanism (re-roll)
**Re-enabling the PULK bias verbatim would not help; a *within-band* distance bias would.** The existing bias pulls toward the *pulk centroid of 3 racers* (`:657–659`) — wrong target for OUTCOME. The useful OUTCOME variant: bias a racer's re-roll `spreadFactor` toward **closing the T-gap to the racer immediately ahead *in its own band*.** That compresses same-band packs in *distance* (so overtakes are visible), then Q1/Q2's within-band freedom lets them actually swap. This is the direct lever against Root Cause #3.
**But note the ceiling:** re-roll fires only ~4–6×/race and freezes at 95% (`RaceScreen:902–903`), so as a discrete mechanism it has weak authority late. Two options: (a) raise OUTCOME re-roll frequency / push the freeze later; (b) skip re-roll and add a **continuous distance term to the servo itself** — a bounded rubber-band that brakes a leader (or boosts a chaser) when the same-band T-gap exceeds a threshold. Option (b) is more authority and more direct, but is new logic in the hot path.
**Hard constraint either way:** the distance target must be *within-band only*. A cross-band gap-closer fights band-reach directly.

### Q5 — The B3 mystery
**It is a controller-timing collision, not variance or positioning.** B3's resolve checkpoint is **fixed at 0.70** (`:287`), while `choreoOutcomeStart` (PULK end) is a moving wall. B3's available OUTCOME settling window is `[choreoOutcomeStart → 0.70]`:

| choreoOutcomeStart | B3 settling window |
|---|---|
| 0.5 | 0.20 |
| 0.6 | 0.10 |
| 0.7 | **0.00** |

As PULK runs later, B3 heroes are churned by PULK dynamics right up to (or past) the instant they must already be band-resolved, so more of them miss. B3 is the *first* casualty because its checkpoint (0.70) is the closest one *above* the rising `choreoOutcomeStart` — B2 (0.80) keeps a buffer, while B4/B5 (0.65/0.60) fall *below* 0.6–0.7 and are, incoherently, asked to resolve during or before PULK. **This is a design smell:** the band checkpoints are absolute constants but only make sense *relative* to where OUTCOME begins. Fix direction: make checkpoints a function of `choreoOutcomeStart` (e.g. `resolve_b = choreoOutcomeStart + k_b·(1 − choreoOutcomeStart)`), so every band keeps a proportional settling window as PULK moves. This also explains why the SWEEP-2 gate degraded monotonically at 0.7/0.8: the deep bands run out of OUTCOME runway.

### Q6 — Trade-offs
What you spend to buy OUTCOME action:

- **Exact finish order → within-band lottery.** Lowering strictness / arrival-release means a B1-designed hero may finish 4th-in-band instead of 1st. **This is not a gate cost** (band-reach only), and it is explicitly sanctioned by endpoint-only fairness. It *is* a predictability cost — the "assigned winner" becomes "assigned podium."
- **Clean dominant win → reined-in leader.** A distance rubber-band (Q4b) reduces runaway wins. If too strong it reads as artificial ("elastic"). Needs a bounded envelope and a dead-zone so genuine small leads survive.
- **Finish spread → bunching.** Within-band distance-closing compresses gaps; overshoot yields photo-finishes everywhere (arguably good, but a change in feel).
- **Boundary oscillation risk.** Arrival-release without hysteresis buzzes at band edges.
- **Envelope growth risk.** Adding a distance term on top of the existing `pulkEnvelope` clamps needs a single combined authority budget, or the multipliers compound and break the natural-band assumption.

---

## 4. Recommendation (prioritised, lowest-risk first)

1. **Fix the timing collision first (Q5).** Make band resolve checkpoints relative to `choreoOutcomeStart`. This is a *correctness* fix — deep bands currently have near-zero or negative settling windows at the shipped 0.6. It also unblocks measuring anything else cleanly. Lowest risk, uses no new mechanism.
2. **Ramp hero strictness down in OUTCOME (Q1/Q2).** Reuses the existing `bandError`; band-reach safe by construction; unlocks within-band rank action for the watched racers. This is the single highest leverage-to-risk change.
3. **Generalise release to band-arrival with hysteresis (Q3).** Extends #2: free racing per band from arrival, band wall preserved by re-engage.
4. **Add a within-band distance leash (Q4) — only after measuring #1–#3.** This is the only genuinely new mechanism and the only one touching distance space (Root Cause #3, the "drives away" complaint). Prototype as a bounded servo term, within-band target only, with a dead-zone; measure band-reach and finish-spread before trusting it.

Do #1–#3 with the existing machinery; treat #4 as the one real R&D item.

## 5. What to measure next (when this leaves consultation)
- **Per-band settling window** vs band-reach, after the Q5 checkpoint fix — confirm B3 recovers.
- **OUTCOME-window** action metrics (the current `--action-metrics` window ends at PULK end and is blind to OUTCOME — a genuine gap; the SWEEP-3 "zero action" finding was really "not measured in OUTCOME"). Add an OUTCOME-window churn / lead-change / same-band-swap metric before tuning strictness.
- **Distance-space** metrics (leader→P2 gap over final third, same-band max T-gap) — the complaint is distance, so the metric must be too. The `gap-metrics` harness (`results/gap-metrics/`) already samples this and is the right instrument.

---

## Appendix — key code references

| Mechanism | File:line |
|---|---|
| Servo error blend + clamp | `racePlanner.js:588–602` (gain 2.0, clamp `:77–79`) |
| `bandError` / `getAreaBounds` | `racePlanner.js:49–54, 591–598` |
| strictness assignment (hero 1.0 / pack 0.5) | `racePlanner.js:580–586` |
| B1-only, time-based release | `racePlanner.js:565–572` |
| band resolve checkpoints | `racePlanner.js:285–291`; `defaults.js:317–321` |
| curve feasibility / in-band-by-checkpoint | `heroCurveGenerator.js:178–195, 284–291` |
| endpoint-only fairness; same-band swap | `heroCurveGenerator.js:9–18, 122–133` |
| re-roll draw + clamp + freeze | `RaceScreen/index.jsx:1075, 1090–1093, 902–903, 1074` |
| PULK-only gap bias | `racePlanner.js:637–665` (gate `:646`) |
| baseSpeed vs trajectoryMult orthogonality | `RaceScreen/index.jsx:1106` (baseSpeed) vs `1003–1015` (trajectoryMult) |
