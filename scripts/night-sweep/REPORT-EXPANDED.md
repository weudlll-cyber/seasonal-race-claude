# EXPANDED TIER-2 CONFIRMATION — RUN A / B / C — REPORT

Follow-up to REPORT.md. Closes the three gaps a close read of the full night-sweep report exposed.
Read-only measurement. **The four shipped modules stay git-verified UNTOUCHED** (defaults / racePlanner /
raceGovernor / heroCurveGenerator — `git diff --stat` empty). Only `scripts/sim-fairness.mjs` (the sim
tool) changed, all flag-gated + byte-neutral when off (verified: a no-`--tier2`/no-`--hero-map` run is
unchanged). Frozen data: `results/tier2b/FROZEN/` (phaseA=12, phaseC=60) + `results/tier2b/gap2.jsonl`.

## CONCEPT-CHECK VERDICT
The three gaps were real and correctly diagnosed. Observers re-verified at source (hero-map overtake =
near-behind→cross once per pair; traffic = avoidanceActive; speed = trajectoryMult≥1.09; lead-change =
who-leads-the-pair flip held ≥ SM_HOLD_MS=750 ms; malus/boost write tier2Mult BESIDE the multiplicative
lateral brake → lateral rule never bypassed). **One flaw I caught in my OWN instrument mid-run:** the
start-row column on the tier2 COMEBACK cells is contaminated (the injection forces a deep, usually
back-row, B1 hero to the front → a back row "wins" by construction). GAP-2 was therefore re-measured on
**plain v4, no injection** (the malus=0/boost=0 cells ARE plain v4, byte-identical; plus a dedicated
hero-map native-win-χ² path). Reported honestly below.

---

## RUN A — MALUS UNDER THE REAL FAIRNESS MACHINERY (GAP-1) — CONFIRMED

Setup: v4 ON + race-plan ON + clean baseline (`--governorDirectorEnabled=false --pulkBiasGain=0
--bonusMult=2.0`). The mover is a **real B1-target hero** (deepest B1 racer, `--tier2ClimberB1`); the
shipped servo does the climbing (`--tier2Boost=0`); the malus brakes the K=4 racers ahead. So malus=0 =
the pure shipped mechanism; malus>0 = what the lane-opening adds ON TOP. N=100 (RUN-A) / N=100×10 (RUN-C).

**Comeback under v4, all 10 tracks (RUN-C, tight density), malus 0 → 0.15:**
- net places: **+11…13 → +12…14** (the servo already climbs the B1 hero to front; malus adds ~+1)
- reachFront: **92–100% → 89–96%** (already high from the servo; strong malus can slightly overshoot)
- traffic-braking frac: **~0.50 → ~0.28 (HALVED on every track)** — the malus opens the lane
- band-reach: **94–95%** throughout

**The honest delta vs the bare-physics night numbers:** in the night run (race-plan OFF, no servo) the
malus was the ONLY climb force, so it bought a large net (+11→+17). WITH the fairness machinery, the
**servo does most of the climbing** (net +11–13 at malus=0, front 92–100%), and the malus's marginal
contribution shrinks to **~+1 net place but still HALVES the traffic-braking**. So:

> **What the generator MAY assume:** a B1-target hero released deep (~rank 14–18, ~35–45% back) reaches
> the front (≤ rank 5) **~90–96% of the time on all 10 tracks**, in-band ~94%, using the shipped servo
> ALONE. Adding the in-envelope malus does not add many net places once the servo is active — its real
> value is a **cleaner, less-braked ride** (traffic ~0.5→0.28) and a slightly higher/faster reach. The
> big bare-physics numbers were an upper bound; the fairness-active number is **+11–14 net to front
> ~90%+**, which is still a strong, reliable, deep comeback.

RUN-A density note (mountainstreet + dirt-oval): shipped density gives the malus MORE to do (net
12.5→14.8) than tight (11.5→12.0), because tight already bunches the field so the servo climbs easily.

---

## RUN B — THE START-ROW GATE (GAP-2) — RESOLVED (and it is a REAL, PRE-EXISTING effect)

Both tests reported side by side on **plain v4** (uncontaminated): the NATIVE per-row-WINS χ² (the
binding win-bias gate) + the Holm ordinal (within-band ORDER test) + the per-row win distribution.

**Tight density, plain v4, N=100, 10 tracks — native-win-χ²:** FAIR on 7/10; **UNFAIR on 3/10:
dirt-oval (front row0 37% vs 25%), searound (row0 21% vs 15%), luger-hill (p=0.0011, a NON-front row).**

**Is it real or noise?** REAL, confirmed:
- dirt-oval tight re-run at **N=300**: native-win **p=0.0024 (stronger), front row0 = 34.3%** (exp 25%).
  A stable front-row win advantage, not sampling noise.
- (My first-pass "it's all noise" read was WRONG — it held only for the injection-contaminated cells,
  where the over-winning row flipped. On plain v4 the front-row advantage is consistent. Corrected.)

**Full native-win-χ² matrix (plain v4, per track × density):**

| track | tight (band ~94%) | shipped (band ~83%) | wide (band ~72%) |
|---|---|---|---|
| dirt-oval | UNFAIR (front row0 34% @N=300) | UNFAIR (front row0 30%) | fair |
| searound | UNFAIR (front row0 21%) | **fair** (p=0.20) | UNFAIR (front row0 23%) |
| luger-hill | UNFAIR (p=.0011) | UNFAIR (p=.0004) | UNFAIR (p=.0037) |
| seatrack | borderline | fair | fair |
| other 6 | fair | (band ~83%) | (band ~68–72%) |

- **luger-hill: UNFAIR at ALL densities** (row0 ≈ expected → a NON-front row over-wins) → **track-intrinsic,
  density-proof**. A genuine pre-existing v4 quirk on luger (luge = displaySize 80, a huge sprite; worth
  a separate look).
- **dirt-oval: UNFAIR at tight + shipped, FAIR at wide** → front-row bias that **eases as the field
  spreads**; density-sensitive, but "wide" costs band-reach (0.72). 
- **searound: FAIR at shipped, UNFAIR at tight AND wide** → shipped is its sweet spot.
- **Count of unfair tracks: tight = 3/10 (dirt-oval, searound, luger); SHIPPED = 2/10 (dirt-oval,
  luger); wide = 2/10 (searound, luger).** So **shipped density (±8%) is the FAIREST choice** while still
  clearing band-reach 83% ≥ 70% gate. **Tight buys band-reach 94% at the cost of +1 unfair track.**
- Answer to "a density with band ≥90% AND native-win-fair on all 10": **NO** — band ≥90% needs tight,
  which fails on 3/10 (luger fails at every density regardless).

**The decisive reassurance:** this start-row win bias is present in **PLAIN v4 with NO tier2 injection**
— it is a **pre-existing property of the shipped v4 mechanism on these 3 tracks, NOT created by the
comeback/malus work.** The malus, if anything, *counteracts* the front-row bias (it brakes front racers
and climbs a deep hero).

**RECOMMENDATION on the gate + density (conservative):**
1. **Keep band-reach ≥70% as the binding fairness gate** (holds at 94% tight, 83% shipped on all 10). It
   is the robust, density-stable measure of "each racer finishes in its band."
2. **Prefer SHIPPED density (±8%) over tight for the rebuild's default.** It is the FAIREST density on
   the win-χ² (2/10 flagged vs 3/10 at tight) and still clears band-reach 83%. Tight's higher band-reach
   (94%) is not worth the extra unfair track (searound) unless a track is checked individually.
3. **Treat the start-row win-χ² as a per-track SECONDARY signal, not a global gate.** 2–3 tracks carry
   a start-row win bias in the SHIPPED v4 mechanism TODAY, independent of the comeback work.
4. **Open a SEPARATE, pre-existing bug:** investigate the **luger-hill (density-proof, non-front-row) and
   dirt-oval (density-sensitive, front-row) start-row win advantage in plain v4.** It is not caused by,
   and must not block, the rebuild. luger's is the priority (unfair at every density).
5. If the tests disagree on a track, take the **conservative (unfair) reading** and flag it.

---

## RUN C — 10-TRACK CONFIRMATION (C1–C5)

- **C1 (release late):** CONFIRMED (TIER-1 frozen, all 10 tracks) — early release nets ~0/negative, late
  nets +4.8…+6. Unchanged.
- **C2 (density ≤ ±8% holds band-reach ≥70%):** CONFIRMED — tight 94–95%, shipped ~83%, wide ~68–72%
  (fails gate on some tracks). Nuance from RUN-B: the ≥90% band-reach that tight buys comes WITH the
  start-row win bias on 3 closed tracks (see RUN B).
- **C3 (wall is traffic, not speed):** CONFIRMED under v4 too — comeback traffic-braking frac ~0.5 at
  malus=0 on every track (the malus halves it). Speed-limited never dominates a fair cell.
- **C4 (malus monotonic + decisive, WITH fairness on):** CONFIRMED on all 10 tracks — net and reachFront
  rise, traffic halves, monotonic in malus. Open-vs-closed: reachFront is high (89–100%) on BOTH once the
  climber is a servo-driven B1 hero (the earlier open-deep 38% was the bare-physics rank-24 case; a real
  B1 hero at ~rank 15 reaches front on open tracks too). **Cast depth: a B1 hero from ~35–45% back
  reaches the front ~90%+ on every topology; deeper than ~55% back stays the ragged edge on open tracks.**
- **C5 (front fight with REAL B1 heroes + v4 ON):** CONFIRMED and it **corrects the earlier top-2 read**.
  Pooled over 10 tracks (lead change = pair-leader flip held ≥750 ms):

  | arm | lead changes | any-LC | bothB1 |
  |---|--:|--:|--:|
  | none | 1.06 | 56% | 80% |
  | boost-challenger 0.08 | 1.34 | 72% | **97%** |
  | **gentle malus-on-leader 0.06** | **2.04** | 78% | 73% |
  | strong malus 0.15 | 1.08 | 55% | 47% |

  - **Gentle leader-brake (0.06) is the STRONGEST single lever — 2.04 lead changes (~2× baseline)** — this
    CONFIRMS the owner's "brake is the stronger lever" hypothesis for the front fight (my earlier top-2
    run understated it because the proxy pair fell out of contention).
  - **Boost-challenger keeps both heroes front best (bothB1 97%)** with solid lead changes (1.34).
  - **Strong malus (0.15) BACKFIRES** (1.08, bothB1 47%) — over-differential flickers faster than the
    750 ms clean-hold and drags the braked leader out.
  - **"none" already yields ~1 lead change** → the front fight is achievable in the fair envelope; its
    absence today is purely `nextCluster` (heroCurveGenerator.js:375, no hero steered to rank 1).

---

## PLAIN CONCLUSION FOR THE REBUILD (measured)

- **Depth per topology:** cast a comeback hero from **~35–45% of the field back** → reaches front ~90–96%
  in-band, on open AND closed tracks. **Deeper than ~55% back is reliable only on closed tracks**
  (lap-mixing); on open tracks it's the ragged edge.
- **Release:** hold to **~0.97** (late). Non-negotiable.
- **Density:** **prefer SHIPPED (±8%)** — fairest on the win-χ² (2/10 vs 3/10 at tight), band-reach 83%
  ≥ gate. Go tight (±4%, band 94%) only if you per-track-verify start-row fairness (it adds searound).
- **Comeback force:** the shipped **servo already delivers the climb**; add the **strong in-envelope
  malus (−15%) on those ahead** primarily to **clear traffic** (halves braking) for a clean, readable
  pass — not for extra places.
- **Front fight:** a **gentle leader-brake (≈ −6%)** is the best single lever (2× the lead changes); OR
  **boost-challenger (≈ +8%)** to keep both front (bothB1 97%). **Never strong, never both** (flicker).
- **What the rebuild must NOT assume:**
  1. NOT the bare-physics comeback magnitudes (+17) — under the fairness machinery it's **+11–14 net**.
  2. NOT that tight density is fairness-free — it carries a **pre-existing start-row win bias on
     dirt-oval / searound / luger** (in plain v4, independent of the malus). luger's is density-proof.
  3. NOT that strong malus helps the front fight — it BACKFIRES; keep it gentle and single-lever.
  4. NOT that the malus adds many net places once the servo is on — its value there is traffic-clearing.

## AUTONOMOUS DECISIONS (this run)
- Kept every shipped module untouched; all changes flag-gated in the sim tool; byte-neutral verified.
- Caught + corrected my own contaminated start-row measurement on the comeback cells; re-measured GAP-2
  on plain v4. Corrected an early "it's noise" call after the N=300 re-run showed a stable front-row bias.
- Front-fight run with real B1 heroes (v4 ON) per GAP-3, which corrected the earlier top-2 finding
  (gentle malus is the stronger lever, not boost).
- Concurrency 6; killed starved/redundant GAP-2 workers rather than oversubscribe; froze each phase.
- Cleanup: all sweep workers terminated at end; dev servers preserved.
