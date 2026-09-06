# COMEBACK-WEIGHT-1 — what it would cost to show the comebacks

**2026-09-06.** Branch `night/2026-09-05`, piece 1 of NIGHT-2026-09-05. **Measurement only.** No
shipped default was changed — each setting is applied to a copy of the config for the duration of one
run and nothing is written. **No weight is proposed and no recommendation is made.** The detector,
the plan and the beats are untouched. Nothing minted.

---

## THE CONTEST, RE-ESTABLISHED AT SOURCE

Read on 2026-09-06 before anything was measured, because the lever only makes sense against it.

**The comeback is one candidate among several**, pushed at `cameraDirector.js:1717-1725` when the
race is in the outcome phase, the cooldown has passed and its weight is above zero. `BATTLE_ZOOM`,
`LEAD_CHANGE` and `OVERVIEW` are pushed on their own terms beside it.

**★ THE WEIGHT THEN ACTS TWICE, and a reader who assumes it acts once will misread the table.**

1. `_weightedRandomPick` (`:726-742`) draws **proportionally** among the candidates — but note it
   returns `pool[0]` outright when there is only one, so a lone candidate is taken whatever its
   weight.
2. The winner then faces `_acceptsOffer` (`:720-724`), which rolls **again** against that same
   weight and, on a decline, falls through to the leader default. **At a weight of 1 or more this
   second roll always accepts.**

So raising the weight both wins the draw more often and declines less often, and above 1 only the
first mechanism is still moving.

## THE MEASUREMENT

Ten tracks × seeds 1–4, **N = 40 races per setting**, race plan ON, everything else at shipped
defaults, the browser's outcome flag supplied (see COMEBACK-BEATS-1 for why that matters). The same
forty races at every setting, so the columns are comparable with each other and with that report.

**Two stages, as ordered.** N = 30 first (seeds 1–3): 7 → 9 → 9 → 14 → 14 shots across the five
settings — a readable difference, so every setting went to N = 40.
**★ And stage 1 contained an artefact worth recording:** at N = 30, weights 4 and 8 were byte-identical.
At N = 40 they are not (18 against 19). **Thirty races was not enough to separate them, and the
larger corpus is what says so.** Weights 1 and 2 remain identical at both sizes — see below.

## THE TABLE

74 comebackers were written across the forty races, in 215 beats. Every figure is N = 40.

| `comebackWeight` | shown of 74 | races with NO comeback shot | COMEBACK_ZOOM | BATTLE_ZOOM | LEAD_CHANGE | LEADER_ZOOM | OVERVIEW |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **0.6 — shipped** | **11** | **29 of 40** | 3.07% | 22.19% | 15.34% | 41.51% | 12.78% |
| 1 | 13 | 27 of 40 | 3.63% | 21.11% | 15.79% | 41.47% | 12.89% |
| 2 | 13 | 27 of 40 | 3.63% | 21.11% | 15.79% | 41.47% | 12.89% |
| 4 | 18 | 22 of 40 | 5.03% | 20.96% | 15.55% | 40.63% | 12.72% |
| 8 | **19** | **21 of 40** | 5.31% | 20.79% | 15.27% | 40.81% | 12.72% |

Frame shares are of all 172,013 frames; `PHOTO_FINISH` is 5.11% at every setting and is omitted
because it does not move.

## WHAT THE EXTRA SHOTS COST

**Between the shipped setting and the most extreme one tried, the comeback shot gains 2.24 points of
frame share and the four other shots give up 2.16 between them:**

| | 0.6 → 8 |
| --- | --- |
| COMEBACK_ZOOM | **+2.24 points** |
| BATTLE_ZOOM | −1.40 |
| LEADER_ZOOM | −0.70 |
| LEAD_CHANGE | −0.07 |
| OVERVIEW | −0.06 |

**BATTLE_ZOOM pays about two-thirds of it**, which is what COMEBACK-BEATS-1 predicted from the other
side: during the frames when a comeback was live and offerable, BATTLE_ZOOM held 34.3% of them.

## DO THE SHOTS STAY EARLY? YES — AT EVERY SETTING

| weight | early | median, before the `resolve` beat |
| --- | --- | --- |
| 0.6 | **11 of 11** | 9.90 s |
| 1 | **13 of 13** | 9.63 s |
| 2 | **13 of 13** | 9.63 s |
| 4 | **18 of 18** | 8.47 s |
| 8 | **19 of 19** | 9.17 s |

**Not one shot at any setting was late.** The lever buys MORE comebacks; it does not move them
towards the moment the plan wrote. The earliness drifts by about a second and a half across the whole
range and does not trend cleanly.

**And the camera never picked a racer the plan had not named — 0 at every setting**, which is
structural: `_cast` replaces the candidate pool, so it cannot.

## ★ TWO THINGS THE TABLE SAYS THAT ARE NOT ABOUT COST

- **1 and 2 are the same setting.** Byte-identical at N = 30 and at N = 40 — same shots, same frame
  shares, same races. That follows from the source: `_acceptsOffer` saturates at 1, and on this corpus
  the proportional draw does not separate 1 from 2. **Anything between them buys nothing.**
- **The curve is shallow and it flattens.** 0.6 → 8 is a **thirteen-fold** rise in the setting and
  takes the shot from 11 of 74 to 19 of 74. **Even at 8, fifty-five of the seventy-four written
  comebackers are still never shown, and 21 of 40 races contain no comeback at all.** Whatever the
  owner wants from this lever, the lever alone does not deliver most of it.

## WHAT THIS PIECE DOES NOT SAY

It proposes no value, and it does not say whether any of these pictures is better. What a comeback
shot is worth against a battle shot is his eye's question, not this instrument's. Nothing here
changed a default, a gate, the detector, the plan or the beats.

**Method note:** the lever is `--comeback-weight=` on `scripts/diag/comeback-beats.mjs`, which builds
the run's config as `{ ...DEFAULT_CAMERA_CONFIG, comebackWeight }`. `defaults.js` is never written.
