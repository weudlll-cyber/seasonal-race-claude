# SIM-METRICS — metric registry (living document)

Every metric that a night-sweep **conclusion** rested on, audited at source (`bf6992e`). SPACE is the
axis a viewer would need to judge the claim; a QUALITY claim not in seconds/distance is invalid by
construction. VERDICT ∈ {TRUSTED · MISLEADING NAME · WRONG SPACE · WRONG POPULATION · WRONG WINDOW · UNTRUSTED}.

**Coverage note:** this covers the report-bearing metrics (comeback stack, fairness gates, headwind,
closing-speed). The sim emits many more raw diagnostic fields; those not below are **NOT YET CATALOGUED →
UNTRUSTED** until added here. No gap-space metric exists yet (Layer 5 unbuilt).

| metric | file:line | name implies | actually computes | SPACE | WINDOW | COUNTING CONDITION | POPULATION | class | VERDICT | what it CANNOT see |
|---|---|---|---|---|---|---|---|---|---|---|
| `reachedFront` / `reachedFrontRate` | sim:1672 | climber reached the front | live rank ≤ BAND_EDGES[0] (5) at any frame | **rank** | whole race | first frame cur≤5 | tagged climber | QUALITY | **WRONG SPACE** | any gap to the leader; a 5th-place finish 15 lengths back scores it |
| `placesGainedNet` | sim (hero-map) | comeback size | anchorRank − finalRank | **rank** | 0.4→finish | at finish | climber | QUALITY | **WRONG SPACE** | whether passes were real or field just strung out |
| `realOvertakes` | sim:1675 | overtakes | lateral-near-behind then t-cross, once/pair | count | release→finish | proximity<0.3 then cross | climber vs field | mechanism | TRUSTED (as count) | whether the pass was *held*; gap |
| `rePasses` | sim (tier2 obs) | churn | passed racer regains lead, per crossing | count | release→finish | o.t>climber.t after pass | climber | mechanism | TRUSTED (as count) | seconds; readability |
| `netOverRealRatio` | sim | comeback cleanliness | net ÷ realOvertakes | rank/count | — | — | climber | QUALITY | **WRONG SPACE** | gap; can exceed 1 when field fades |
| `closingSpeedRatio` / `…Front` / `…ByBand` | sim | closing on cars ahead | climber (traj×areaBonus) ÷ mean(K ahead) | ratio | release→finish (Front: rank≤8) | per frame | climber + K ahead | mechanism | TRUSTED (as ratio) — **but N=8 in the first smoke** | actual closing in seconds (excludes baseSpeed/brake) |
| `choPackOverHero` / `servoCompFrac` | sim | headwind | B1-pack drive ÷ hero drive; (packBonus−1)/(maxMult−1) | ratio | choreo window, rank≤8 | per frame | heroes vs B1 pack | mechanism | TRUSTED | nothing re: race quality (it's a multiplier fact) |
| `trafficFrac` | sim (avoidanceActive) | time stuck in traffic | frames with `avoidanceActive` ÷ frames | frames | release→finish | shared avoidance sets it | climber | mechanism | TRUSTED **iff R3 parity holds** | whether that braking mattered to the outcome |
| `bandReach` / per-band | sim:4699-4708 | fairness | frac finishing in drawn band | **rank/band** | finish | zoneIdxOf(finalRank)==targetBand | all racers | QUALITY(fairness) | **WRONG SPACE for "fair"** | a dead race — 100% is compatible with the winner a lap clear |
| `nativeWinChiSqP` | sim:4711-4716 | start-row fairness | χ² of per-row win counts vs row size | count | finish | winner=min finalRank | per race | mechanism | TRUSTED (as a win-bias test) | within-band order; gap |
| `physical_overtake` | sim:736,1827-1855 | overtakes | pairs among startRow 0/1, open only | rank | thresholds | V4_ROW1/2 thresholds | startRow∈{0,1}, isOpen | mechanism | **WRONG POPULATION + WINDOW** | any pass by/among rows ≥2; closed tracks |
| `anchorRank` | sim:1450 | cast depth | tier2rank at TIER2_RELEASE (0.4) | rank | at 0.4 | once | climber | mechanism | TRUSTED (as rank) | distance behind leader |
| `role='comebacker'` | heroCurveGenerator | comeback | `wr<=cr` (one-place gain) | rank | plan-time | label | heroes | QUALITY | **MISLEADING NAME** | whether a viewer sees a comeback |

**MECHANISM vs QUALITY summary.** TRUSTED-as-mechanism: `realOvertakes`, `rePasses`, `closingSpeedRatio`,
`choPackOverHero`, `servoCompFrac`, `nativeWinChiSqP`, `anchorRank`, `trafficFrac` (conditional on R3
parity). INVALID as quality claims (rank/count space): `reachedFront`, `placesGainedNet`,
`netOverRealRatio`, `bandReach`-as-"fair", `role='comebacker'`. `physical_overtake`: wrong population/window.

**Every QUALITY row above is invalid by construction** because it lives in rank/band/count space, not the
seconds-behind-the-leader space a viewer perceives. The gap-space replacements (Layer 5) do not yet exist.
