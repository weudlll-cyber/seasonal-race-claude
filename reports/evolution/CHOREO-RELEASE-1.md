# CHOREO-RELEASE-1 — the owner's release-to-the-dice on the choreo candidate

**Branch `exp/choreo-release` (cut from `exp/chain-choreo` @15c1d58; sim-only, master untouched). Author: CC.**
Owner-chartered. This line LIFTS the frozen-runtime-budget constraint that earned-KILLed ACTION-BUILD-5/7/7b/7c
four times: instead of authoring the whole finish, the choreo sorts each racer fairly into its drawn band and
then RELEASES it to ship's re-roll (the P1-uncertainty force the admission-side budget forbade). Two measured
axes: **release timing** (EARLY vs AT-T) and **target T** {0.70, 0.80, 0.90}, plus an **AT80+WALL** literal-band
variant. All flags default OFF → flagless fingerprint **`7c70b1eae7d31e22`** (== the shipped game, byte-identical,
asserted on the committed state).

## VERDICT (read first): arrival is SAFE, action is NOT bought — 5th earned-KILL on the combined bar

**Releasing a chain racer to the dice under a band-hold PRESERVES arrival (band-reach ≥70% on both tracks, several
arms band-FAIREST of the whole battery) — the band-hold works — but it does NOT manufacture front action.** No
release arm clears the **PFEILER-7 bar** (beat BOTH faB60 AND the candidate-as-is on the combined goal). The decisive
diagnostic is the owner's own T-lever: **more dice time makes the finale MORE boring, not less** — DEAD-BORING rises
monotonically as release moves earlier (AT90 8/12% → AT80 20/16% → AT70 20/20% → EARLY 32/24%). Dice time buys
SCATTER (a settled procession), not a sustained P1 battle, because a racer released and held to its own band has no
front ATTRACTOR — the band-hold that guarantees fairness is the same thing that prevents the bunching Ship's re-roll
needs to trade P1. Ship stays untouched (ice frontContest 68% vs best release 41%), and the candidate-as-is's
proximity floor (bunch to band CENTRE, held to the line) is a BETTER action substrate than any release.

---

## 1. BUILD-vs-SPEC CONFORMANCE (mandatory, before any numbers)

**BASE.** The candidate as built today = arm **`B15clrD`** = curves for ALL racers (B15: chain anchored at boundary
0.15 + start-row bonus) + proximity floor + finale script compiler under local-clearance admission + graded budget
+ open-lane accordion. This is exactly the spec's "curves for ALL racers + B15/proximity/clearance/budget". Verified
by reading `exp-chain-ablate.mjs` ARM_LIB and confirming the flag set; the OFF path is byte-identical.

**PART 1 — chaos-phase aim (anchor-hit).** Built as `computeChaosAimTarget` in `racePlanner.js`, called from the
`raceCore.js` re-roll block. During chaos (PRE_PULK) it biases each racer's re-roll toward the speed that carries it
to its PLANNED anchor (drawn band centre), clamped to the honest spread — loaded dice within the band, not a new
force. anchor-hit telemetry = |post-chaos rank − planned anchor|, captured at the boundary. **CONFORMS**, but see §5:
it is ineffective as built (anchor-hit unmoved).

**PART 2 — per-racer conditional release.** Built in the servo (`racePlanner.js`): a chain hero is curve-guided
until it ARRIVES in its DRAWN band, then `strictness=0` → error = bandError (the re-roll dice drive it INSIDE the
band, a soft pull only once it drifts OUT = the band-hold; hysteresis tolerance `reSteer`=1 rank). EARLY releases
the moment it is in band (checked from chaos end); AT-T releases no earlier than T. **Stragglers** (not in band at T)
stay curve-guided until they arrive, to the line if need be — arrival STRUCTURAL (telemetry: `neverRel` = racers
never released = guided to the finish). **Comebackers/fallbackers** (compiler roles `comebacker`/`fallbacker`) are
EXEMPT — never released, curve-guided to their authored place. **WALL** mode = a hard band wall (strictness 1 the
instant it leaves the band). **CONFORMS** to the owner's design.

**faB60.** The owner's cache name `faB60` does NOT exist anywhere in the repo (grepped whole tree). To give the
Pfeiler-7 bar a concrete second baseline I map **faB60 ≙ `B15`** — the minimal band-fairest sorter, the fairness
floor of this whole line (ACTION-BUILD-3). This is a documented interpretation, not a found artifact.

## 2. THE DECISION — dual scoreboard, searound + ice, N=25 paired (seed=1)

Honest scoreboard (ACTION-BUILD-7c): **arrival = band-reach**, **action = DEAD-BORING ↓ + frontContest ↑**.

| arm | searound band / DEAD-BORING / frontContest | ice band / DEAD-BORING / frontContest |
|---|---|---|
| **ship** | 75% / **8%** / **42%** | 72% / **0%** / **68%** |
| **faB60** (B15, floor) | 73% / 16% / 29% | 72% / 16% / 34% |
| **candidate** (B15clrD) | 77% / **4%** / 40% | 72% / 20% / 38% |
| AT90+DICE | **80%** / 8% / 37% | **75%** / 12% / 38% |
| AT80+DICE | 77% / 20% / 37% | 75% / 16% / 36% |
| AT70+DICE | 77% / 20% / 30% | 76% / 20% / 36% |
| EARLY+DICE | 78% / 32% / 22% | 75% / 24% / 41% |
| AT80+WALL | 78% / 24% / 37% | 76% / 24% / 36% |
| AT80+DICE+aim | 75% / 28% / 23% | 70% / 4% / 37% |

- **Arrival is preserved — the band-hold works.** Every release arm holds band-reach ≥70% on both tracks (2/2), and
  the late arms are band-FAIREST of the entire battery: **AT90 80%/75%** beats the candidate (77%/72%) AND faB60
  (73%/72%) AND ship (75%/72%). Releasing to the dice does NOT leak racers out of band (the earlier N=2 signal was
  noise) — the soft re-steer recaptures drift, and holding guidance to T keeps the sort tight.
- **No arm clears PFEILER-7.** The best candidate is **AT90** (latest release, least dice): it BEATS faB60 on the
  combined goal (band 80/75>73/72, DEAD-BORING 8/12<16/16, frontContest 37/38>29/34) — but it does NOT beat the
  candidate-as-is: **searound DEAD-BORING 8% vs the candidate's 4%** (worse) and frontContest 37% vs 40% (worse). The
  bar requires beating BOTH; AT90 beats only one. Every other arm is strictly worse than AT90 on action.
- **Ship is untouched.** Ship's ice frontContest **68%** is more than any release arm reaches (best 41%); Ship's
  DEAD-BORING (8%/0%) is met only by AT90 on searound and never on ice. The re-roll over a bunched pack still owns
  the front.

## 3. THE T-CURVE (the owner's Dauer-Regel lever) — the decisive diagnostic

| arm | releaseMed | early<0.85 | searound DEAD-BORING | ice DEAD-BORING | searound frontContest |
|---|---|---|---|---|---|
| AT90+DICE | 0.900 | 0% | **8%** | **12%** | 37% |
| AT80+DICE | 0.800 | 78% | 20% | 16% | 37% |
| AT70+DICE | 0.700 | 84% | 20% | 20% | 30% |
| EARLY+DICE | ~0.34 | 90% | **32%** | **24%** | **22%** |

**The curve runs the WRONG way for action: earlier release / MORE dice time → MORE DEAD-BORING and LESS
frontContest.** This is the mechanism of the kill. Released early, each racer runs its own dice inside its band and
the field SPREADS into a decided order well before the line (the finish is a procession, DEAD-BORING). Released late
(AT90), the choreo holds the sort tight and injects only a brief end-window of dice — least boring, closest to the
candidate, band-fairest, but with no more contest than the candidate already had. The owner's hypothesis (early
release hampers stragglers) lands, but the fuller finding is stronger: **early release makes the WHOLE finale
boring**, not just the stragglers.

## 4. TIMING · RELEASE DISTRIBUTION · STRAGGLERS (owner axis 1: EARLY vs AT-T)

- **Release-time distribution.** AT-T arms release a wave exactly at T (releaseMed = T) with a tail of stragglers
  climbing to arrival afterwards; EARLY spreads release across [0.33, 1.0]. `neverRel` (guided to the line) = 1–2.4
  on searound, 4.9–6.2 on ice — i.e. the structural-arrival guarantee fires for ~5–15% of the field every race.
- **Straggler telemetry (not in drawn band at 50%).** ~48–56% of the field is still out of its drawn band at
  mid-race across all arms — the sort genuinely completes in the second half, so AT-T (T≥0.7) is holding real
  guidance, not a formality. EARLY's straggler@50% is slightly lower (48/50%) because releasing early lets some
  racers settle sooner — but that "settling" is exactly the procession that kills the finale.
- **AT-T beats EARLY on every action cell.** The owner's calm-vs-dice-time trade resolves cleanly toward AT-T: more
  sorting calm (later release) is uniformly better here, the opposite of a dice-time-is-action story.

## 5. PART 1 (chaos aim) + cb/fb realization — both weak/ambiguous

- **Chaos aim is ineffective as built.** anchor-hit is **13.2 → 13.3** WITH the aim (AT80+aim) vs 13.2/13.5 WITHOUT
  (AT80) — unmoved. The chaos window carries too few re-rolls, and the honest-band clamp is too tight, to pull the
  boundary rank toward the planned anchor. AT80+aim is also high-variance (searound DEAD-BORING 28% worse, ice 4%
  better) with no net win. PART 1 as specified does not earn its place.
- **cb/fb realization (the exemption).** On ice (searound casts 0 scripts — 5-lane budget thins the compiler to
  zero), comebackers realize their B1 finish 14–19/57 (~25–33%) and fallbackers 19–30/55 (~35–55%). The exemption
  FIRES (they are curve-guided, never released), but realization is bounded by the ~5-rank last-10% feasibility
  (ACTION-BUILD-7b) plus end-of-race traffic. Release timing does NOT clearly move it (EARLY cb 19 > AT90 cb 14 —
  the opposite of an interference story), so the owner's "released traffic hampers stragglers" is NOT supported by
  the cb data; it is noise-dominated at N=25.

### THE FIVE SENTENCES (ripcord 2 — every kept element)
1. The choreo sorts every racer to its drawn band (B15 + proximity), and PART 2 then RELEASES each racer to ship's
   re-roll the moment it arrives in that band — held there by a soft bandError re-steer (dice inside, recapture on
   drift), EARLY (from chaos end) or AT-T (no earlier than T). 2. Stragglers not yet home at T stay curve-guided to
   arrival, to the line if need be, so band-reach holds ≥70% on both tracks — indeed the late arms are band-FAIREST
   of the battery (AT90 80%/75%), proving the release does not wreck fairness. 3. Comebackers and fallbackers are
   exempt and authored to the line, and PART 1 biases the chaos re-roll toward each racer's planned anchor within
   the honest band — but that aim is ineffective (anchor-hit unmoved) and cb/fb realization is feasibility-bounded,
   not release-driven. 4. On the honest scoreboard no release arm beats BOTH faB60 and the candidate-as-is: the
   best (AT90, least dice) beats faB60 but loses to the candidate on searound front action, and the T-curve is the
   diagnostic — more dice time is monotonically MORE boring, because a released racer held to its own band scatters
   into a decided procession with no front attractor. 5. Ship's re-roll over a bunched pack still owns the front
   (ice frontContest 68% vs best release 41%), so the release is arrival-safe but action-neutral: the band-hold that
   makes it fair is the same thing that denies it the bunching that makes a re-roll contested — the fifth earned-KILL,
   now from the release side, with the shipped world byte-identical when OFF.

## PROPOSALS (≥2)

1. **Keep the arrival-safe minimal-release (AT90) as a shippable fairness texture, NOT as an action engine.** AT90
   is band-FAIREST of everything tested (80%/75%), byte-identical OFF, and gives the finish a genuine last-window
   dice run-out without costing arrival or beating anyone on action. If the owner wants the finale to "breathe" at
   the line without an on-rails feel, a late minimal release is a clean, fairness-positive default — proposed as a
   texture toggle, not a Ship-beating claim.
2. **The action goal needs a FRONT ATTRACTOR during the dice, not more dice time — release to the re-roll while
   keeping the pack bunched.** The kill mechanism is that the band-hold removes the bunching Ship relies on. The
   next experiment is to release to the dice but keep an ACTIVE proximity attractor (the candidate's band-centre
   pull) live THROUGH the release window instead of fanning it out — so the front re-rolls as a tight group and can
   trade P1, the way Ship does. That is a single new lever (attractor-during-release), on the same substrate, one
   N=25 screen.
3. **Drop PART 1 (chaos aim) as built; if pursued, aim the ANCHOR not the dice.** The chaos re-roll bias is too weak
   to move anchor-hit. If a clean handoff is still wanted, author the curve-start rank from the plan (aim the
   ANCHOR the curve is built from) rather than nudging the chaos dice toward it — a planning-side change, no force.

## Owner questions
1. **Ship the minimal late release (AT90) as a fairness-positive finish texture** (band-fairest, byte-identical OFF,
   no action claim) — yes/no?
2. **Authorise the front-attractor-during-release experiment** (proposal 2 — the one lever that could let the
   re-roll trade P1 while staying fair), or declare the front-action goal an earned-KILL across BOTH the
   admission-side (ACTION-BUILD) and the release-side (this line)?

---
**Branch `exp/choreo-release`.** OFF fingerprint **`7c70b1eae7d31e22`** (== shipped, byte-identical; new flags all
default OFF). Build commit `e539f92`; this report. Screen: `scripts/exp-chain-ablate.mjs --arms=faB60,B15clrD,
AT90dice,AT80dice,AT70dice,EARLYdice,AT80wall,AT80diceAim --tracks=searound,ice-track --races=25 --seed=1`. Raw:
`reports/evolution/chain-ablate-data/choreo-release-screen.txt`. **Screen-only (stopped per protocol).** Push
verified — see `git log origin/exp/choreo-release`.
