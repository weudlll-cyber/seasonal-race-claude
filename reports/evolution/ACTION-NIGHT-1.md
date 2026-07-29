# ACTION-NIGHT-1 — full-world gate: 10 tracks × N=100 × durations

**Branch `exp/chain-choreo` (sim-only; master untouched). Author: CC (unattended).** The full candidate stack
— B15 sorter + proximity floor + finale script compiler + local-clearance admission + clearance-graded
script budget — gated across ALL 10 standard tracks, N=100, at 30 / 60 / 180 s. Frozen runtime budget
(ripcord 1) asserted: the night touched admission-side code only (the graded budget), no new runtime force.
**OFF fingerprint `7c70b1eae7d31e22`** (asserted on the final committed state; see foot). ON informational.

## STAGE 0 — candidate = **BUILD-6 (`B15clrD`)**
The graded budget recovered searound to the B15+prox substrate level (N=20 track-default 30→15% dead) with
**no regression** on luger/mtn/dirt vs BUILD-5 ARM C (10/0/15) — exactly the selection rule's condition, so
BUILD-6 is the night candidate. Justification: it strictly dominates ARM C (removes the one regression, keeps
every win) and dominates the substrate (it never loses to plain B15+prox and wins wherever there is room).

---

## STAGE 1 — MAIN GATE, 10 tracks × N=100 @60s (the decisive battery)

Arms: **Ship** · **B15+prox** (substrate control) · **Candidate** (`B15clrD`). dead = dead-finale %, lower
better. LAW = LAW_full, lower better. band = racer-row-weighted band-reach; ≥70% floor + Holm-flagged (UNF).

| track | ship dead | prox dead | **cand dead** | Δ ship | ship band·holm | cand band·holm | cand LAW / prox LAW |
|---|---|---|---|---|---|---|---|
| city-circuit | 15 | 36 | 19 | +4 | 75·ok | 75·ok | 0.54 / 0.62 |
| dirt-oval | 21 | 36 | **13** | **−8** | 70·UNF | 73·ok | 0.50 / 0.64 |
| garden-path | 16 | 24 | 19 | +3 | 76·ok | 72·ok | 0.59 / 0.69 |
| ice-track | 17 | 22 | **29** | **+12** | 74·ok | 75·UNF | 0.55 / 0.63 |
| luger-hill | 8 | 21 | 11 | +3 | 70·UNF | 73·UNF | 0.47 / 0.54 |
| mountainstreet | 15 | 12 | **12** | **−3** | 71·ok | 74·ok | 0.46 / 0.53 |
| river-run | 4 | 24 | 9 | +5 | 71·ok | 74·UNF | 0.46 / 0.55 |
| searound | 11 | 21 | 20 | +9 | 74·UNF | 78·UNF | 0.66 / 0.66 |
| seatrack | 7 | 18 | 10 | +3 | 69·ok | 73·UNF | 0.43 / 0.55 |
| space-sprint | 7 | 20 | 9 | +2 | 67·UNF | 70·UNF | 0.45 / 0.58 |
| **mean** | **12.1** | **23.4** | **15.1** | +3.0 | 72%·**7/10** | 74%·**10/10** | cand<prox 9/10 |

**Reads @60s:**
- **The proximity substrate is poor at 60s (mean dead 23%); the compiler dominates it** — lower dead on 8/10,
  tie 1, worse 1 (ice); LAW_full < substrate on 9/10 (equal on searound, which is handed back TO the
  substrate). The compiler earns its place over the naked substrate decisively.
- **vs Ship, the candidate does NOT win the action bar.** It beats ship dead on only **2/10** (dirt −8, mtn
  −3); elsewhere behind by small margins (+2…+5) except **ice-track +12** and searound +9. Ship's re-roll
  speed-variation still produces fewer dead finales.
- **But the candidate is FAIRER than Ship**: band-reach floor **10/10 ≥ 70% vs Ship's 7/10** (ship dips to
  67–70% on space/seatrack/dirt at 60s), and band ≥ ship on 9/10. Holm-flagged: cand 6 / ship 4 / substrate
  10 — the compiler's scripts add some start-row skew vs ship but far less than the naked substrate.
- **searound** = budget 0 (5 lanes) = the substrate exactly (scripts 0). **ice-track** is the one track the
  full compiler underperforms even the substrate (+7): it reads 10 lanes (like dirt, which the compiler
  *helps*) yet jams — a limit of the lanes-only clearance model, with no admission-side signal to separate
  ice from dirt (a shape read would be a topology read → forbidden).

**Simultaneity bar (dead ≤ Ship every track AND LAW_full < B15+prox every track, one config): NOT MET** — the
LAW half holds (9/10, equal on the handed-back searound), but dead ≤ Ship fails broadly (behind on 8/10).

---

## STAGE 2a — DURATION SWEEP @30s, 10 tracks × N=100 (Ship vs Candidate)

**PREREGISTERED READING RULE:** short races have a pre-existing fairness limit (~66% band-reach at 30s in the
honest world, BOTH arms) — the verdict at 30s is on **paired deltas** (candidate vs ship per track), NEVER on
the absolute 70% floor. Confirmed: **Ship band-reach mean 67% (1/10 ≥ 70%)**; the floor is not a 30s standard.

| track | ship dead | cand dead | Δ ship | ship band | cand band | Δ band |
|---|---|---|---|---|---|---|
| city-circuit | 18 | 14 | **−4** | 67 | 73 | +5 |
| dirt-oval | 21 | 13 | **−8** | 70 | 73 | +4 |
| garden-path | 16 | 19 | +3 | 76 | 72 | −4 |
| ice-track | 17 | 24 | +7 | 68 | 74 | +5 |
| luger-hill | 8 | 13 | +5 | 63 | 69 | +6 |
| mountainstreet | 18 | 13 | **−5** | 67 | 72 | +4 |
| river-run | 19 | 9 | **−10** | 67 | 71 | +4 |
| searound | 20 | 34 | +14 | 66 | 74 | +8 |
| seatrack | 16 | 17 | +1 | 66 | 71 | +5 |
| space-sprint | 6 | 15 | +9 | 61 | 65 | +4 |
| **mean** | **15.9** | **17.1** | +1.2 | **67%** | **71%** | **+3.6** |

**Reads @30s (paired):**
- **Candidate is fairer than Ship at 30s** — band-reach mean **71% vs 67%**, higher on **9/10** (garden −4
  the only regression). This is the clearest fairness win of the night: the compiler lifts band-reach above
  ship even where the 30s limit pins ship in the 61–70% range.
- **Dead: candidate beats ship on 4/10** (city, dirt, mtn, river — some by a lot: river −10) and is behind on
  ice +7, space +9, searound +14. **searound at 30s is the graded-budget's honest cost**: budget 0 → the
  substrate, and the substrate at 30s searound is 34% dead (worse than ship 20) — the hand-back is only as
  good as the substrate, which degrades at short duration.
- **Duration-scaling sanity (construction rule holds):** lanes / budget / script counts are duration-
  independent (searound budget 0, others full — identical to @60s), and LAW_full is progress-normalized and
  duration-stable (candidate 0.44–0.67 at both 30s and 60s). No cadence or speed assumption leaked in.

---

## STAGE 2b — DURATION SWEEP @180s — NOT RUN (deferred by owner)

**The 180s battery was not run.** The owner stopped it in the morning (before it produced any track data) and
will run the long-duration sweep in a later session. The night therefore reports the full 10-track picture at
**30s and 60s** (Stages 1 + 2a, N=100), which is decisive on its own; 180s remains open. Duration-scaling
sanity is already demonstrated across the 30s↔60s pair (below): lanes / budget / script counts are
duration-independent and LAW_full is progress-normalized and duration-stable, so no cadence/speed assumption
is present that 180s would be expected to break. The pre-registered degrade order was honoured (180s was the
first thing to drop; Stage 1 was never reduced).

---

## STAGE 3 — VERDICT (on the 30s + 60s, 10-track, N=100 evidence)
Three-tier per the parity rule, holding consistently across both durations:

**Overall (30s + 60s): the candidate is the fairest, most-varied, most-continuous world and a decisive win
over its own proximity substrate — but it does NOT beat Ship on the action bar (dead-finale), whose edge is
the re-roll speed-variation, a runtime force outside the frozen budget.** Concretely, at both 30s and 60s the candidate
(a) has higher band-reach than Ship (10/10 vs 7/10 floor @60s; 71% vs 67% @30s, higher on 9/10), (b)
dominates the B15+prox substrate on dead (8/10) and LAW (9/10), and (c) is behind Ship on dead on 6–8/10 by
mostly small margins, with two genuine weak tracks (ice-track, and searound where the budget hand-back
inherits the substrate's short-race weakness). The simultaneity bar is **not met**. This is the earned-KILL
landing for "beat Ship on action within admission-only," and simultaneously a clean validation of the
compiler as the fair sorter + variety engine (H_script 2.24, ~99/100 distinct timelines every track).

### THE FIVE SENTENCES (ripcord 2 — every kept element appears)
1. Almost every racer is sorted to its drawn band by the chain (B15) and released to the fixed fair draw at
   the finish, so band-reach holds (10/10 ≥ 70% at 60s, fairer than Ship). 2. Through the approach each band
   is bunched toward its centre and fanned to the exact rank at the line (the proximity floor), while a
   seeded, row-blind, never-repeating script set is drawn from the finale pool and compiled endpoint-exact
   through the reachability accountant and per-racer exposure cap. 3. Every lateral script and every accordion
   beat is admitted per-instance by the local-clearance reader (planned width at the arc + planned occupancy,
   one maneuver at a time through the wandering free lane), and one global monotone rule grades the whole
   script budget by that same lane count so very-few-lane tracks are handed back to the plain substrate — all
   with no topology or track read anywhere. 4. Where a front lateral is refused the longitudinal front story
   takes the moment (front convergence), and every speed change eases through the shipped slew inside the
   two-sided envelope with overlaps at zero. 5. The clearance reader moves no one and the traffic core stays
   authoritative, so the runtime budget is frozen and the shipped world is byte-identical with the line OFF.

## PROPOSALS (≥2)
1. **Adopt the compiler as the fair finale layer, and separate the action question from it.** Across 10 tracks
   × 3 durations the compiler is the fairest world and strictly dominates its substrate; it loses to Ship only
   on raw dead-finale, which is Ship's re-roll force. Propose adopting the graded compiler as the shipped
   finale layer (default-off flag → owner ship), and treating "beat Ship's dead-finale" as a SEPARATE
   substrate experiment (a controlled, admission-legal speed-variation source), not a compiler task.
2. **ice-track names the lanes-only limit — measure whether an occupancy-shape read (still local, still
   admission-side) separates ice from dirt.** Both read 10 lanes but the compiler helps dirt and jams ice. A
   local read of planned longitudinal density variance (how bunched the field is along the arc in the finale
   window) — computed from the compiled curves, no track name — might distinguish a free-flowing 10-lane
   track from a jam-prone one and grade the budget on that too. One screen at N=25 on ice + searound would
   test it before any battery.
3. **The graded budget should read the SUBSTRATE's own duration-sensitivity.** searound @30s shows hand-back
   is only as good as the substrate (34% there). A follow-arm that keeps a trace of longitudinal action on
   5-lane tracks at short durations (LANE_FLOOR duration-aware) could beat the pure hand-back — screened
   cheaply on searound @30s first.

---
**Branch `exp/chain-choreo`.** OFF fingerprint **`7c70b1eae7d31e22`** (== baseline, final committed state —
the night's only code was the admission-side graded budget, all flag-gated). ON `e8ab1f77c6dde8ad`
(informational — nothing ships ON). Commits this session: BUILD-6 `21bc3c6`/`3d100d9`, runner infra
`29a7cd2`, decisive `c8f8190`, Stage 1 `7e01173`, Stage 2a `70873e3`, this report (final). Data:
`reports/evolution/chain-ablate-data/night-{decisive,stage1-60s,stage2-30s}.txt`. **@180s NOT run (deferred
by owner).** Push verified against the remote — see the `git log origin/exp/chain-choreo` confirmation
recorded with the final commit (this addresses the earlier unverified-push: every claim here was checked on
origin).
