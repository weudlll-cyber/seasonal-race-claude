# Look-Before-Brake Gate Diagnostics

*Generated 2026-07-15 · seed=1 · races/track=50 · dur=60s · world=ASSUMED-DEFAULTS*

Owner eye-test: with a free lane available the trailer BRAKES instead of dodging, then after a
short brake accelerates into that same lane. This measures WHICH of the four look-before-brake
conditions blocks the dodge — no fix, no behaviour change. Gate order and definitions: see the
"Look-Before-Brake Diagnostics" section of docs/SIM.md.

## A. Per pair-FRAME (TIME-WEIGHTED — NOT an encounter rate)

> These shares count pair-FRAMES. A brake keeps the trailer same-lane for many frames (many records);
> a dodge leaves the same-lane filter at once (≈1 record). So braking is over-weighted by construction —
> read these as "share of braked time", never as "share of encounters". `windowEmpty` tests only whether
> the window EXISTS geometrically (`dTStart < dynamicBrakeT`), not whether it is wide enough to use — see
> `windowFrames` in section B for the usability measure.

| Track | open | decisions | dodged | blockedRoom | blockedSlower | blockedNoFreeSide | blockedDrift | windowEmpty |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| mountainstreet | open | 4945215 | 2.4% | 74.4% | 13.4% | 6.7% | 3.1% | 0.0% |
| river-run | open | 8597226 | 1.1% | 77.3% | 13.4% | 6.9% | 1.3% | 0.0% |
| dirt-oval | closed | 14583359 | 1.4% | 75.5% | 13.0% | 7.8% | 2.2% | 0.0% |
| searound | closed | 16322560 | 0.6% | 76.8% | 10.5% | 10.5% | 1.6% | 0.0% |

`blockedRoom` detail (per-frame): **noRoom/traffic** = split of blockedNoFreeSide; **roomShortfall** =
dTStart − dT for blockedRoom; **tLat** = steps to clear sideways.

| Track | windowEmpty | noRoom | traffic | roomShortfall med / p90 | tLat med / p90 |
|---|---:|---:|---:|---:|---:|
| mountainstreet | 0 | 0 | 330879 | 0.000856 / 0.001711 | 3.392857 / 3.392857 |
| river-run | 0 | 0 | 596384 | 0.001266 / 0.00235 | 6.785714 / 6.785714 |
| dirt-oval | 0 | 0 | 1139178 | 0.003068 / 0.006169 | 6.785714 / 6.785714 |
| searound | 0 | 0 | 1715876 | 0.003489 / 0.006597 | 13.571429 / 13.571429 |

## B. Per ENCOUNTER (one label each — THESE shares ARE comparable)

> One label per same-pair contiguous run. **`noWindowEver`** (the headline) = the trailer never got a
> single frame with `dT > dTStart` — the pair became same-lane already too close, so the window was
> unreachable in practice. **`windowFrames`** = the empirical window WIDTH in frames for encounters that
> had one (median 1–2 ⇒ a technicality even where it exists). **`entryGap`** = dTStart − dT at the first
> frame (how far below the window the pair becomes same-lane; negative ⇒ entered inside it).

| Track | encounters | dodged | noWindowEver | blockedSlower | blockedNoFreeSide | blockedDrift | windowFrames med / p90 | entryGap med / p90 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| mountainstreet | 85338 | 6.3% | 18.2% | 56.3% | 10.9% | 8.3% | 2 / 52 | -0.000488 / 0.001873 |
| river-run | 80270 | 6.0% | 27.7% | 47.8% | 14.2% | 4.3% | 7 / 90 | -0.000634 / 0.00261 |
| dirt-oval | 131692 | 5.6% | 23.2% | 54.3% | 10.4% | 6.5% | 2 / 107 | -0.001746 / 0.006502 |
| searound | 141127 | 3.3% | 26.3% | 44.4% | 19.8% | 6.2% | 4 / 104 | -0.001818 / 0.007353 |

## C. Smoking gun — brakeThenDodge and its causal cross-tab

> **brakeThenDodge** = braked, then dodged the SAME leader with no traffic block in between (the Owner's
> complaint, counted per encounter). **noWindowBeforeDodge** = of those, the share that had NO usable
> window frame (`dT > dTStart`) before the first dodge — i.e. the BRAKE itself opened the gap the dodge
> then used. A high share is direct causal proof of the complaint.

| Track | brakeThenDodge | median brakedFrames | noWindowBeforeDodge | share |
|---|---:|---:|---:|---:|
| mountainstreet | 1791 | 35 | 315 | 17.6% |
| river-run | 1335 | 43 | 251 | 18.8% |
| dirt-oval | 2369 | 50 | 300 | 12.7% |
| searound | 1415 | 41 | 190 | 13.4% |

## How to read it
- **High `noWindowEver` (section B)** ⇒ the pair becomes same-lane already too close; the window is unreachable in practice ⇒ the lever is looking EARLIER (zone / geometry), not lateral speed.
- **Low `noWindowEver` but low `dodged`** ⇒ the trailer HAD its chance and something else stopped it ⇒ the lever is `maxLateralSpeedPerStep` / the dTStart margins.
- **`windowFrames` median 1–2** ⇒ even where a window exists it is a technicality.
- **High `noWindowBeforeDodge` (section C)** ⇒ the brake bought the room the dodge needed — the complaint, proven.
- Section A shares are TIME-WEIGHTED and must not be compared as encounter rates (see the note there).
