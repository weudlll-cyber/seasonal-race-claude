# CAMERA-FOCUS-2 — the owner's timeline claim, tested as a measured bisect

> "These problems did not exist a few days ago — something recent damaged the camera."
> "The biggest error happens in the first half of the first lap." · "The test used LEADER zoom 3."

Answered with **data, not opinion.** One recorded race — `searound` seed 5601, 20 racers, 5270 frames — replayed into **five** camera code versions. Only camera files changed across the whole span (verified: `git diff --name-only dc920c78 60551847` touches only `camera/` + presentation), so the race is byte-identical at every rung and **the only variable is the camera CODE**. LEADER zoom 3, innerFramePct 0.7, minRacersVisible 8 — one fixed config for all rungs (the owner's tested setting). Reproducible: `scripts/exp-camera-bisect.mjs`. Replay recorded via a new read-only `--dump-frames` observer on the shipped sim (engine untouched).

Windows: **FULL** race, and **EARLY** = first half of lap 1 (leader t ≤ 0.5 of finishT=2 — the owner's flagged window).

## The ladder

| rung | FULL leaderOut | FULL panVar | flips/100 | **EARLY leaderOut** | EARLY panVar | flips/100 |
|---|---|---|---|---|---|---|
| `dc920c7` pre camera-evening (*"few days ago"*) | 80.0% | **2249** | 0.5 | **98.7%** | 5165 | 0.2 |
| `0dcbc29` overview fix | 67.0% | 3296 | 0.6 | **98.7%** | 5165 | 0.2 |
| `2cd3f65` min-vis floor | 70.9% | 4217 | 0.4 | **98.7%** | 5170 | 0.2 |
| `9e351c0` jitter rate-limit | 80.2% | 4215 | 0.4 | **98.7%** | 5173 | 0.2 |
| `6055184` anchor clamp (today) | **6.5%** | 6148 | 0.4 | **12.3%** | 5028 | 0.2 |

`leaderOut` = % of LEADER-family frames the current leader sits outside inner-70. `panVar` = variance of per-frame pan displacement (the "jumping"). `flips` = pan direction reversals /100 frames.

## What the ladder convicts — three findings

**1. The leader-off-frame drift is OLD, not recent — and worst exactly where the owner points.** The leader sits outside inner-70 for **98.7% of early-window LEADER frames at every rung before today**, including the pre-camera-evening `dc920c7` "few days ago" state. The camera-evening commits (overview / min-vis / jitter) neither introduced nor fixed it — FULL leaderOut wanders 67–80% with no trend. **Today's anchor clamp is the first commit to fix it: 98.7% → 12.3% early, 80% → 6.5% full.** The owner's timeline claim is **refuted** for this defect: it did not appear recently, it was always there, and it is strongest in the first half of lap 1.

**2. The "jumping" the owner sees is state-transition CUTS, and the early-window churn is also OLD.** EARLY panVar is **~5165 at every rung including pre-camera-evening** — the first-half-lap-1 churn is invariant to all five versions. Its cause (today's code, `--mode=transitions`): the 3 early state-transitions carry a **mean pan velocity of 858 px vs 7.7 px on non-transition frames — a max single-frame cut of 3436 px** (a near-full-screen jump). The jumping is a handful of hard OVERVIEW↔LEADER↔BATTLE pan cuts in the bunched start, present at every rung; direction-flips stay flat (~0.2), so it is big occasional cuts, not oscillation.

**3. The ONE thing the camera-evening measurably changed: the overview fix raised whole-race pan motion.** FULL panVar climbs `2249 → 3296 → 4217` across the overview-fix + min-vis commits (roughly doubling by the min-vis floor) — a genuine side effect of OVERVIEW now respecting the sprite scale (more overview panning). It did **not** touch the early-window churn or the leader-containment. If the owner perceives "more movement overall," that traces here — but it is whole-race, not the first-half-lap-1 defect they flag.

## STEP-2 target-side test (preregistered) — EMA sizing is NOT the lever
The addendum's fix path is the target-side architecture (size the EMA + clamp). Sizing was tested directly (`--mode=tc`, trackingTC 0.25 → 0.06):

| code | tc 0.25 | tc 0.15 | tc 0.10 | tc 0.06 |
|---|---|---|---|---|
| pre-clamp `9e351c0` — EARLY leaderOut | 98.7% | 98.7% | 98.7% | 98.7% |
| today `6055184` — EARLY leaderOut | 12.3% | 12.3% | 12.3% | 12.3% |

**Even near-instant tracking (tc 0.06) leaves the pre-clamp leader off-frame 98.7% of the early window.** The leader-off-frame is *structural in the pan-target pipeline* (the phased/entry pan aims off the leader's exact position in the dense start), so no lerp speed contains it — the **containment clamp is necessary and sufficient**, and tc is not a meaningful lever here.

## CONSEQUENCE RULE — the verdict
Convicted defect (leader-off-frame) → the target-side architecture **converged this session**: the clamp shipped in CAMERA-FOCUS-1 (`6055184`) is the best-measured rung by 8–15×, and the EMA-sizing half is proven insufficient alone. **Decision: do NOT revert.** The best-measured rung on the owner's own stated defect is **TODAY**, not the oldest — reverting to `dc920c7` would *reintroduce* 98.7% early leader-off-frame and sacrifice three genuine fixes (overview-zoom respect, the min-visible floor, the jitter rate-limit). The remaining early "jumping" is a **newly-named, older, separate target** (hard state-transition cuts), not something any rung on this ladder caused or cured.

## Five sentences
1. On one byte-identical searound seed-5601 replay through five camera versions, the leader sat outside inner-70 for 98.7% of early-window LEADER frames at *every* rung before today — including the pre-camera-evening "few days ago" state — so the leader-drift is old, not a recent regression, and is worst exactly in the first half of lap 1.
2. Today's anchor clamp is the first commit to fix it (98.7% → 12.3% early), and a preregistered trackingTC sweep proves faster tracking cannot (98.7% at tc 0.06) — the containment clamp is structurally necessary.
3. The early "jumping" is invariant across all rungs (panVar ~5165) and is caused by ~3 hard state-transition pan cuts of up to 3436 px, not by any camera-evening commit.
4. The only measurable camera-evening change is the overview fix roughly doubling whole-race pan variance (2249 → 4217), a side effect of OVERVIEW respecting the sprite scale — unrelated to the flagged window.
5. Per the CONSEQUENCE RULE the best-measured rung is TODAY, so we do not revert; reverting would reintroduce the leader-drift and drop three real fixes.

## Proposals (≥2)
1. **CAMERA-FOCUS-3 — soften state-transition cuts (the real "jumping").** The convicted early jumping is OVERVIEW↔LEADER↔BATTLE cuts (858 px vs 7.7 px; max 3436 px). Fix target-side: lerp the pan across a state transition (a short cross-fade of the pan point) instead of hard-setting the new target, and add hysteresis/min-hold on transitions during the dense start so the state machine stops flapping. This is the named successor and addresses the owner's first-half-lap-1 complaint directly — it needs its own eye-test, not a blind edit.
2. **Ship-nothing-more this session; keep the clamp, keep the three fixes.** The ladder shows the current tip is strictly best on the owner's stated defect. No revert, no tc change (proven inert). Hand the transition-cut finding to CAMERA-FOCUS-3.
3. **Standing camera-regression gate.** `exp-camera-bisect.mjs` + `--dump-frames` make this a one-command check. Fold `leaderOut` (LEADER-family, inner-70) and `panVar` into a periodic replay assertion on a fixed seed so a future camera change that regresses containment or spikes churn is caught by data, not by eye.

## Verify
Read-only + presentation-only. `--dump-frames` is a default-off observer (frameHook only installs when the flag is set); the shipped fingerprint **`ded0a126048e4cdb`** is unchanged. Engine untouched.
