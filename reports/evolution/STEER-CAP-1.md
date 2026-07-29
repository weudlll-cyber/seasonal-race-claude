# STEER-CAP-1 — the boost-side cap BACKFIRES (STAGE 1 stop)

**Branch `exp/fair-arrival` @fb8633e→54e7d81 (sim-only, master untouched). Author: CC.** Boost-side cap on the
chaos steer to shrink the space-sprint chaos hole. Everything else in COMBO15 untouched; read-only measurement
otherwise. OFF fingerprint **`7c70b1eae7d31e22`** asserted.

## BUILD-vs-SPEC CONFORMANCE (first)
- **Boost-side cap only.** `steerBoostCap` lowers ONLY the upper clamp of the chaos-steer target
  (`clamp(1.0+gain·err, minMult, steerBoostCap)`); the brake floor (`minMult`) is untouched. One flag, clamped,
  per-tick-smooth via the existing `_setTarget` slew. Default null → upper stays `maxMult` → **byte-identical**
  (OFF fingerprint `7c70b1eae7d31e22`; the racePlanner diff is only the cap lines). CONFORMS.
- **Cap fired as designed** (attribution proof): leader-at-chaos-end mean steer multiplier fell from COMBO15's
  ~1.09–1.10 to **~1.03–1.04 (cap104) / ~1.05–1.06 (cap106)** — the boost was genuinely capped.
- Everything else in COMBO15 (chaosSteer/faB60/pulkStart=0.15) unchanged. v2 duration-relative watchdog wired
  and preregistered.

## VERDICT (read first): STAGE-1 STOP — the cap BACKFIRES; neither value clears; no STAGE 2
**Capping the boost does the OPPOSITE of the goal — it INCREASES the chaos maxGap on all three tracks (6/6
arm×track cases), on the target track worst of all.** The decision criterion (chaos maxGap ≤ ship+1.0L on all
three) fails for both caps, and by a wider margin than uncapped COMBO15. Mechanism, and it is a clean one: the
chaos maxGap is the P1→P2 gap, and the steer's BOOST is exactly what lets the deep-drawn chasers climb and
CLOSE that gap — capping the boost slows the pursuers, so they lag further behind the leader and the gap WIDENS.
The boost is the wrong lever for the hole; it was the right lever only for the leader's own multiplier (which
did drop), but the hole is set by the chasers, not the leader. Per the SPEC ("STAGE 2 only if a cap clears
Stage 1"), STAGE 2 was NOT run.

## 1. STAGE-1 SCREEN — chaos maxGap (L), N=25, searound / ice / space-sprint
| arm | searound (thr 3.0) | ice (thr 2.6) | space-sprint (thr 2.9) | chaos-gap ≤ ship+1.0 all 3? |
|---|---|---|---|---|
| ship | 2.0 | 1.6 | 1.9 | — (reference) |
| COMBO15 (uncapped) | 2.8 ✓ | 2.5 ✓ | **3.1 ✗** | no (space, the known miss) |
| COMBO15+cap104 | 3.0 ✓ | **2.8 ✗** | **3.8 ✗** | **NO — worse than uncapped** |
| COMBO15+cap106 | 2.9 ✓ | **2.7 ✗** | **3.4 ✗** | **NO — worse than uncapped** |

Both caps push the gap UP on every track (searound 2.8→3.0/2.9, ice 2.5→2.8/2.7, space 3.1→3.8/3.4). The cap
that was meant to shrink space-sprint's 3.1L made it 3.8L (cap104) / 3.4L (cap106).

## 2. THE PREREGISTERED RISK LANDED — AND THEN SOME
The SPEC preregistered that capping the boost could lower sorting/arrival/frontContest. Observed:
- **frontContest fails too**: cap104 searound 53% and cap106 searound 56% both fall below uncapped−2pp (60→58
  floor) — the cap costs front action on the narrow track.
- **in-band-at-chaos-end drops** (the sorting cost, from the smoke: 41→37%) and leaderDrawnB1 stays ~100%, so
  the cap weakens the sort WITHOUT closing the hole — the worst of both.
- arrival mostly survives (cap104 88/90/85, cap106 89/88/88 vs uncapped 89/89/84), so the failure is
  specifically the chaos-gap + frontContest, not arrival.

So the cap pays the sorting cost the risk warned of AND fails its one job — it is a two-sided loss.

### THE FIVE SENTENCES (every kept element)
1. `steerBoostCap` was built as a pure boost-side cap (upper clamp only, brake floor untouched, one flag,
   per-tick-smooth, default-null byte-identical at OFF fingerprint `7c70b1eae7d31e22`), and it fired as designed
   — the leader's chaos-end steer multiplier fell from ~1.10 to ~1.04/1.06. 2. But on the STAGE-1 screen it
   BACKFIRED: the chaos maxGap rose on all three tracks for both cap values (space-sprint 3.1→3.8/3.4, ice
   2.5→2.8/2.7, searound 2.8→3.0/2.9), the exact opposite of the space-sprint fix it was meant to be. 3. The
   mechanism is clean — the chaos maxGap is the P1→P2 gap, and the boost is what lets the deep-drawn chasers
   climb and close it, so capping the boost slows the pursuers and the gap widens; the boost was only ever the
   leader's-own lever, while the hole is set by the field behind it. 4. The preregistered risk also landed —
   frontContest fell below uncapped−2pp on searound and in-band-at-chaos-end dropped ~4pp — so the cap is a
   two-sided loss: it pays the sorting cost and still fails to close the hole. 5. Neither cap clears the STAGE-1
   decision, so STAGE 2 was not run and no clean-sheet was attempted; COMBO15 (uncapped) remains the candidate
   and the space-sprint chaos gap needs a different lever, not a boost cap.

## PROPOSALS (≥2)
1. **Drop the boost cap; if space-sprint's chaos gap must close, the lever is a CHASER-side one, not a
   leader-side one.** The gap is opened by pursuers lagging, so the fix is to help them close — e.g. the
   partial-sort/band-EDGE target (steer deep racers only to their band edge, not deep toward centre, so they
   arrive sooner and sit closer), or a modest BRAKE on the momentary chaos leader (the accordion idea, chaos
   phase) rather than a boost cap on the field. Either is a one-flag follow-up; the boost cap is retired.
2. **Accept COMBO15 as-is and document space-sprint's chaos gap as a modest, bounded breakaway.** At native
   duration space-sprint's chaos maxGap is ~1.6× ship (3.1 vs 1.9L) — a real but small hole on ONE open track,
   with the pulk-hold (maxLeadHoldShare_mid, distinctLeaders) and arrival/floor/frontContest all healthy there.
   The binding gate already showed 7/10 full-pass + pulk fixed + nothing worsened; space-sprint's gap is the
   single remaining blemish and may not warrant a new force at all.
3. **Adopt the v2 duration-relative watchdog (chaosGap ≤ ship×1.5) as the permanent line, but note it does NOT
   rescue space-sprint at native duration** (3.1 > 1.9×1.5 = 2.85). v2 fixes the 180s scaling artefact (its
   purpose) but space-sprint's native gap is a genuine ~1.6× breakaway, so v2 correctly still flags it — the
   watchdog is honest, the candidate simply has one real modest miss.

## Owner questions
1. **Retire the boost cap** (it backfires) and either accept COMBO15 with space-sprint documented, or authorise
   a chaser-side lever (band-edge target / chaos-leader brake) as a separate one-flag experiment?
2. **Lock the v2 watchdog** (ship×1.5) as the permanent gate line, accepting that space-sprint still flags at
   native duration (a real modest breakaway, not an artefact)?

---
**Branch `exp/fair-arrival`.** OFF fingerprint **`7c70b1eae7d31e22`** (engine diff = only the boost-cap lines,
byte-identical at default null). Build commit `54e7d81`; this report. Screen: `scripts/exp-fair-arrival.mjs
--tracks=searound,ice-track,space-sprint --arms=ship,combo15,combo15cap104,combo15cap106 --races=25`. Raw:
`reports/evolution/steer-cap-stage1.txt`. **STAGE-1 stop (no cap cleared); STAGE 2 not run per protocol.** Push
verified — see `git log origin/exp/fair-arrival`.
