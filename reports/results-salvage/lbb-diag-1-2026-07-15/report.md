# Look-Before-Brake Gate Diagnostics

*Generated 2026-07-15 · seed=1 · races/track=50 · dur=60s · world=ASSUMED-DEFAULTS*

Owner eye-test: with a free lane available the trailer BRAKES instead of dodging, then after a
short brake accelerates into that same lane. This measures WHICH of the four look-before-brake
conditions blocks the dodge — no fix, no behaviour change. Gate order and definitions: see the
"Look-Before-Brake Diagnostics" section of docs/SIM.md.

## Outcome shares (per brake-zone decision)

| Track | open | decisions | dodged | blockedRoom | blockedSlower | blockedNoFreeSide | blockedDrift | windowEmpty |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| mountainstreet | open | 4945215 | 2.4% | 74.4% | 13.4% | 6.7% | 3.1% | 0.0% |
| river-run | open | 8597226 | 1.1% | 77.3% | 13.4% | 6.9% | 1.3% | 0.0% |
| dirt-oval | closed | 14583359 | 1.4% | 75.5% | 13.0% | 7.8% | 2.2% | 0.0% |
| searound | closed | 16322560 | 0.6% | 76.8% | 10.5% | 10.5% | 1.6% | 0.0% |

## Smoking gun + blockedRoom detail

- **brakeThenDodge** = braked, then dodged the SAME leader with no traffic block in between (the Owner's complaint, counted).
- **noRoom / traffic** = split of blockedNoFreeSide: target off-track on both sides vs an in-bounds side occupied.
- **roomShortfall** = dTStart − dT for blockedRoom (how much longitudinal room was missing); **tLat** = steps to clear sideways.

| Track | brakeThenDodge | median brakedFrames | windowEmpty | noRoom | traffic | roomShortfall med / p90 | tLat med / p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| mountainstreet | 1791 | 35 | 0 | 0 | 330879 | 0.000856 / 0.001711 | 3.392857 / 3.392857 |
| river-run | 1335 | 43 | 0 | 0 | 596384 | 0.001266 / 0.00235 | 6.785714 / 6.785714 |
| dirt-oval | 2369 | 50 | 0 | 0 | 1139178 | 0.003068 / 0.006169 | 6.785714 / 6.785714 |
| searound | 1415 | 41 | 0 | 0 | 1715876 | 0.003489 / 0.006597 | 13.571429 / 13.571429 |

## How to read it
- High **blockedRoom** with high **windowEmpty** ⇒ the dodge window is a fiction (dTStart ≥ brake edge); tuning lateral speed alone cannot open it.
- High **blockedRoom** with LOW windowEmpty + small **roomShortfall** ⇒ a near-miss; lateral-speed / margin tuning could close it.
- High **blockedNoFreeSide/traffic** ⇒ the brake is genuinely traffic-forced (not a false brake).
- High **brakeThenDodge** ⇒ the brake was provably pointless in those encounters.
