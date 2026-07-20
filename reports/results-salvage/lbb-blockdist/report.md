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

> **`blockedSlowerAtFirstWindow`** = would be blockedSlower by the first-window-frame snapshot, but the
> encounter WAS faster on another frame (`everFaster`) — the snapshot mislabelled it. `blockedSlower` here
> means only "never faster at all". (run-2 `blockedSlower` = these two columns summed.)

| Track | encounters | dodged | noWindowEver | blockedSlower | slower@1stWin | blockedNoFreeSide | blockedDrift | windowFrames med / p90 | entryGap med / p90 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| mountainstreet | 85338 | 6.3% | 18.2% | 54.9% | 1.4% | 10.9% | 8.3% | 2 / 52 | -0.000488 / 0.001873 |
| river-run | 80270 | 6.0% | 27.7% | 45.7% | 2.1% | 14.2% | 4.3% | 7 / 90 | -0.000634 / 0.00261 |
| dirt-oval | 131692 | 5.6% | 23.2% | 52.6% | 1.7% | 10.4% | 6.5% | 2 / 107 | -0.001746 / 0.006502 |
| searound | 141127 | 3.3% | 26.3% | 42.5% | 1.9% | 19.8% | 6.2% | 4 / 104 | -0.001818 / 0.007353 |

## B2. Per ENCOUNTER split by REAL OVERTAKE INTENT (everFaster) — the addressable population

> `everFaster` = `slowerLeaderOk` OR `heroPass` on ≥1 frame: a real overtake was genuinely on the table.
> **Only the everFaster block is addressable** — `neverFaster` encounters are the gate correctly declining
> to weave around same-speed traffic. Without this split section B is meaningless: `noWindowEver` mixes
> "wanted to pass but never got a window" with "was never faster anyway", contaminated in opposite
> directions. Each block has its OWN denominator.

| Track | intent | encounters | dodged | noWindowEver | blockedSlower | slower@1stWin | blockedNoFreeSide | blockedDrift |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| mountainstreet | everFaster | 31547 | 17.1% | 27.0% | 0.0% | 3.8% | 29.6% | 22.5% |
| mountainstreet | neverFaster | 53791 | 0.0% | 13.0% | 87.0% | 0.0% | 0.0% | 0.0% |
| river-run | everFaster | 33155 | 14.5% | 35.5% | 0.0% | 5.0% | 34.5% | 10.5% |
| river-run | neverFaster | 47115 | 0.0% | 22.1% | 77.9% | 0.0% | 0.0% | 0.0% |
| dirt-oval | everFaster | 50540 | 14.5% | 37.1% | 0.0% | 4.3% | 27.2% | 16.9% |
| dirt-oval | neverFaster | 81152 | 0.0% | 14.6% | 85.4% | 0.0% | 0.0% | 0.0% |
| searound | everFaster | 67009 | 6.9% | 34.2% | 0.0% | 4.0% | 41.8% | 13.2% |
| searound | neverFaster | 74118 | 0.0% | 19.1% | 80.9% | 0.0% | 0.0% | 0.0% |

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

> **Pre-dodge WINDOW frames** — run-2 found a window already existed before the brake in the MAJORITY of
> these confirmed false brakes, so room was not the blocker. This attributes those pre-dodge window frames:
> what made the racer brake while it already had the room to pass? (`noFreeSide` is 0 by construction — a
> traffic block anywhere before the dodge disqualifies the encounter.)

| Track | preDodge window frames | blockedSlower | blockedNoFreeSide | blockedDrift |
|---|---:|---:|---:|---:|
| mountainstreet | 49287 | 36.4% | 0.0% | 63.6% |
| river-run | 49826 | 52.2% | 0.0% | 47.8% |
| dirt-oval | 131133 | 40.3% | 0.0% | 59.7% |
| searound | 62106 | 20.2% | 0.0% | 79.8% |

## How to read it
- **Section B2 is the one that answers the fix question.** Read `noWindowEver` and the blocked labels ONLY within the `everFaster` block — that is the population where an overtake was actually on the table.
- **High everFaster `noWindowEver`** ⇒ real overtakes that never got a window ⇒ the lever is looking EARLIER (zone / geometry).
- **Low everFaster `noWindowEver` but low everFaster `dodged`** ⇒ it HAD room and intent and still did not pass ⇒ the lever is `maxLateralSpeedPerStep` / the dTStart margins.
- **`slower@1stWin` large** ⇒ much of run-2's "blockedSlower" was a first-window-frame snapshot artefact, not a genuine same-speed decline.
- **`neverFaster` encounters are NOT a problem** — the gate correctly declines to weave around same-speed traffic.
- **Section C pre-dodge window** ⇒ for the false brakes the Owner sees, whether the brake opened the gap (`noWindowBeforeDodge`) or it braked with room already in hand (and why: slower/drift).
- Section A shares are TIME-WEIGHTED and must not be compared as encounter rates (see the note there).
