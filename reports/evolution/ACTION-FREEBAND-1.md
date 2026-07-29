# ACTION-FREEBAND-1 — band corridor + finale tempo noise

**Branch `exp/free-band` (cut from `exp/chain-choreo` @15c1d58; sim-only; master untouched). Author: CC.**
The owner-chartered test of my own consultation proposal: from a release point R the endpoint becomes
**band-exact, not rank-exact** — a two-sided corridor governor holds every racer hard at its band edges,
free inside, and a runtime tempo-variance source decides the within-band order. Declared runtime inventory:
{authored curves + actuator to R · ONE finale tempo source · ONE band-corridor governor · traffic core}.
**OFF fingerprint `7c70b1eae7d31e22`** asserted (flag-gated).

## VERDICT (read first) — the gate is NOT cleared; a fifth kill-confirmation, from the runtime-force side
**The mechanism fails at N=25 on all three gate criteria, and it fails for a structural reason that matters:
the band corridor (fairness) and ship's spread-out tempo race (action) are in direct tension.** A tempting
N=3 smoke (ice dead 0%, frontContest 78%) did NOT survive N=25. My consultation premise — "add the runtime
tempo force ship has, but clamp it to the band" — is now measured to be self-defeating: the clamp that
guarantees the band is exactly what strangles the contest.

## 1. THE GATE — ARM A (re-roll noise), N=25, searound + ice

Gate: band 2/2 ≥ 70% **per row** · frontContest within ~10pp of Ship · DEAD-BORING ≤ Ship. dead-finale in %.

| arm · track | band (per-row floor) · holm | dead | **DEAD-BORING** (Δship) | **frontContest** (Δship) | edge-fights/race |
|---|---|---|---|---|---|
| ship · searound | 75% · UNF | 8 | **8** | **42%** | — |
| ship · ice | 72% · ok | 12 | **0** | **68%** | — |
| **fbA85 · searound** | 73% (**69%**) · ok | 20 | **16** (+8) | 36% (−6) | 11,884 |
| **fbA85 · ice** | 73% (72%) · ok | 40 | **28** (+28) | 33% (−35) | 13,346 |
| fbA70 · searound | 72% (**66%**) · UNF | 60 | 32 (+24) | 38% (−5) | 18,969 |
| fbA70 · ice | 73% (70%) · ok | 40 | 32 (+32) | 25% (−43) | 23,061 |

- **frontContest FAILS**: 25–38% — *below* Ship's 42–68%, and −35pp on ice (not within 10pp). The noise
  produces flicker, not Ship's sustained battle.
- **DEAD-BORING FAILS**: above Ship on both tracks (ice 28 vs 0). The corridor *raises* dead-finale.
- **Per-row band floor FAILS**: searound dips to **66–69% < 70%** — the corridor cannot hold the fairness
  unit test (no uncast racer stays in band) on the narrow track. R=0.70 is worse than R=0.85 everywhere.
- **edge-fights 12k–23k/race** is the tell: racers are pinned at their band edges essentially every tick.
  The band (5–10 ranks) is too tight for 40 bunched racers to have any *free* room inside — "free inside,
  hard at edge" degenerates to "always at the edge, always braking." The over-braking bunches the field
  (races run visibly slower) and manufactures dead finales.

**Tuning does not rescue it** (measured): amp 0.02–0.06 and corridor-gain 0.5–2.0 all give edge-fights ~12k
and dead 40%+; a hard corridor over-brakes (slow, dead), a soft corridor drops the band floor. There is no
setting that yields free-within-band contest at 40-racer density in a tight band.

## 2. ARM B — frozen offset (also fails; N=25)

| arm · track | DEAD-BORING (Δship) | frontContest (Δship) | per-row floor | edge-fights |
|---|---|---|---|---|
| fbB85 · searound | **20** (+12) | 33% (−10) | **62%** | 12,034 |
| fbB85 · ice | **24** (+24) | 30% (−38) | **68%** | 13,434 |

A once-drawn frozen offset is a *constant* push → racers drift monotonically to a band edge and pin there.
It fails the gate on the same three axes as ARM A (frontContest below Ship, DEAD-BORING above, per-row floor
62–68% < 70%), with the *worst* per-row fairness of any arm. Frozen ≈ re-roll on failure; simplicity buys
nothing when neither clears. (The searound "hang" in the smoke was an over-tight single-thread probe timeout,
not a true hang — the parallel battery finished in 3 min.)

## 3. WHY — the structural finding (the value of this negative result)
Ship's front action is **inseparable from the ABSENCE of a band clamp**: its re-roll re-randomizes tempo to
95% and freezes the last draw, and with no corridor the field **spreads** into a genuine catch-up race to the
line — a sustained P1 battle (frontContest 68% on ice). That freedom is also *why* ship misses the band floor
on 3/10 tracks. Our corridor makes the band structural, but by confining a bunched field into 5–10 rank bands
it converts the tempo noise from "a spread-out race" into "a fight against the wall": racers pin at edges, the
governor over-brakes, dead-finale rises, and the sustained contest never forms. **You cannot have ship's
spread-out finale race AND a hard band clamp at this density — they are the same knob pulled opposite ways.**
This is a fifth, independent confirmation of the earned-KILL, now from the *runtime-force* direction the
consultation deliberately opened: even *with* the tempo force the admission-side line lacked, the fairness
clamp needed to keep it fair destroys the action.

### THE FIVE SENTENCES (per the design, honest)
1. Racers are sorted toward their drawn band by the chain up to the release point R, so band membership is
   established before the finale. 2. From R the endpoint becomes band-exact: a two-sided corridor governor
   steers each racer only on its drawn-band error — zero inside the band, hard at the edge — with no
   exact-rank capture. 3. A single runtime tempo-variance source (re-roll statistics live in the finale, or a
   frozen offset) is meant to decide the within-band order unresolved to the line. 4. In practice the band is
   too tight for a 40-racer field: the noise pins racers against the corridor (12k+ edge-fights/race), the
   governor over-brakes into a slower, deader finish, and the sustained P1 contest never forms — frontContest
   falls below Ship and DEAD-BORING rises above it. 5. The traffic core and clamp move the field but cannot
   both hold the band and free the race, so with the line OFF the shipped world is byte-identical and with it
   ON the corridor and the contest cancel — the mechanism does not clear the gate.

## PROPOSALS (≥2)
1. **Screen the Copilot fallback (front-cohort noise) before closing — but I expect the same wall.** Restrict
   the tempo noise to the front ~5 racers over [0.80, 0.95] with a hard stop. Fewer racers → less field-wide
   over-braking; a short window → less pile. It might hold the band floor (only B1 is perturbed). BUT the same
   tension applies inside B1 (5 racers in a 5-rank band = fully pinned), so my confidence is low. It is cheap
   and is the SPEC's designated next arm; run it, then decide. Build cost: small (gate the noise on rank ≤ B1
   and window ≤ [0.80,0.95]).
2. **Accept the earned-KILL is now confirmed from BOTH sides and ship the web finale for front action.** The
   admission-side line (BUILD-5…7c) proved authored fair curves cannot make P1 uncertainty; this runtime-force
   line proves the band clamp cannot coexist with the tempo race that *does* make it. Recommend: ship the web
   version's finale (re-roll to 95% + frozen draw, no corridor), and keep our orthogonal wins — the fairest
   sorter, the clearance reader, the proximity floor, the honest DEAD-BORING/frontContest scoreboard — as the
   shippable value. Cost: zero (it is the current web version).
3. **If the ≥70% HARD floor can flex to "beat ship's fairness without killing its action": ship's re-roll + a
   SOFT per-row nudge.** Keep ship's uncorralled tempo race, and add only a gentle governor that nudges the
   *worst-off start rows* toward their band (not a hard clamp for everyone). This would trade ship's 3/10 miss
   down to perhaps 1–2/10 while preserving the spread-out contest — a strictly-fairer-than-ship finale that
   keeps the action. It renegotiates the fairness promise (soft, not structural) and is owner-only. Cost:
   moderate; one soft row-governor, no corridor.

## Owner questions
1. **Run the front-cohort fallback** (proposal 1) as the last free-band arm, or **close the line** (proposal 2)?
2. **Is a SOFT per-row fairness nudge on ship's re-roll (proposal 3) acceptable** — trading a hard ≥70% floor
   for "measurably fairer than ship, action intact"?

---
**Branch `exp/free-band`.** OFF fingerprint `7c70b1eae7d31e22` (== baseline, final committed state; the line
is flag-gated). Commits: build `1f9a08f`, runner+ARM A `700a756`, this report. Data:
`chain-ablate-data/freeband-{armA,armB}.txt`. **Gate NOT cleared → 4-track battery NOT run (per protocol).**
Push verified — see `git log origin/exp/free-band`.
