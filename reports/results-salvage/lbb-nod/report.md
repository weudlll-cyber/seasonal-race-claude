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
| mountainstreet | open | 4778560 | 4.0% | 75.2% | 13.4% | 7.1% | 0.3% | 0.0% |
| river-run | open | 8561742 | 1.7% | 77.7% | 13.5% | 7.0% | 0.1% | 0.0% |
| dirt-oval | closed | 14287712 | 2.4% | 76.1% | 13.2% | 8.2% | 0.2% | 0.0% |
| searound | closed | 16198645 | 1.1% | 77.4% | 10.4% | 11.0% | 0.2% | 0.0% |

`blockedRoom` detail (per-frame): **noRoom/traffic** = split of blockedNoFreeSide; **roomShortfall** =
dTStart − dT for blockedRoom; **tLat** = steps to clear sideways.

| Track | windowEmpty | noRoom | traffic | roomShortfall med / p90 | tLat med / p90 |
|---|---:|---:|---:|---:|---:|
| mountainstreet | 0 | 0 | 338940 | 0.000857 / 0.00171 | 3.392857 / 3.392857 |
| river-run | 0 | 0 | 597770 | 0.001266 / 0.00235 | 6.785714 / 6.785714 |
| dirt-oval | 0 | 0 | 1165114 | 0.003023 / 0.006169 | 6.785714 / 6.785714 |
| searound | 0 | 0 | 1776412 | 0.003505 / 0.006599 | 13.571429 / 13.571429 |

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
| mountainstreet | 77729 | 13.2% | 18.7% | 56.0% | 1.1% | 10.9% | 0.0% | 2 / 52 | -0.000487 / 0.001895 |
| river-run | 79183 | 9.6% | 28.4% | 46.4% | 1.9% | 13.7% | 0.0% | 8 / 89 | -0.000569 / 0.002611 |
| dirt-oval | 133114 | 11.7% | 23.0% | 53.6% | 1.5% | 10.2% | 0.0% | 2 / 101 | -0.001743 / 0.00655 |
| searound | 137706 | 6.6% | 26.3% | 44.5% | 1.9% | 20.7% | 0.0% | 4 / 103 | -0.001808 / 0.007355 |

## B2. Per ENCOUNTER split by REAL OVERTAKE INTENT (everFaster) — the addressable population

> `everFaster` = `slowerLeaderOk` OR `heroPass` on ≥1 frame: a real overtake was genuinely on the table.
> **Only the everFaster block is addressable** — `neverFaster` encounters are the gate correctly declining
> to weave around same-speed traffic. Without this split section B is meaningless: `noWindowEver` mixes
> "wanted to pass but never got a window" with "was never faster anyway", contaminated in opposite
> directions. Each block has its OWN denominator.

| Track | intent | encounters | dodged | noWindowEver | blockedSlower | slower@1stWin | blockedNoFreeSide | blockedDrift |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| mountainstreet | everFaster | 27546 | 37.3% | 28.7% | 0.0% | 3.1% | 30.8% | 0.0% |
| mountainstreet | neverFaster | 50183 | 0.0% | 13.2% | 86.8% | 0.0% | 0.0% | 0.0% |
| river-run | everFaster | 32036 | 23.8% | 37.6% | 0.0% | 4.8% | 33.8% | 0.0% |
| river-run | neverFaster | 47147 | 0.0% | 22.1% | 77.9% | 0.0% | 0.0% | 0.0% |
| dirt-oval | everFaster | 49938 | 31.1% | 37.7% | 0.0% | 3.9% | 27.3% | 0.0% |
| dirt-oval | neverFaster | 83176 | 0.0% | 14.2% | 85.8% | 0.0% | 0.0% | 0.0% |
| searound | everFaster | 62598 | 14.6% | 35.8% | 0.0% | 4.1% | 45.6% | 0.0% |
| searound | neverFaster | 75108 | 0.0% | 18.4% | 81.6% | 0.0% | 0.0% | 0.0% |

## C. Smoking gun — brakeThenDodge and its causal cross-tab

> **brakeThenDodge** = braked, then dodged the SAME leader with no traffic block in between (the Owner's
> complaint, counted per encounter). **noWindowBeforeDodge** = of those, the share that had NO usable
> window frame (`dT > dTStart`) before the first dodge — i.e. the BRAKE itself opened the gap the dodge
> then used. A high share is direct causal proof of the complaint.

| Track | brakeThenDodge | median brakedFrames | noWindowBeforeDodge | share |
|---|---:|---:|---:|---:|
| mountainstreet | 4682 | 2 | 383 | 8.2% |
| river-run | 2941 | 2 | 230 | 7.8% |
| dirt-oval | 6759 | 2 | 364 | 5.4% |
| searound | 3955 | 2 | 190 | 4.8% |

> **Pre-dodge WINDOW frames** — run-2 found a window already existed before the brake in the MAJORITY of
> these confirmed false brakes, so room was not the blocker. This attributes those pre-dodge window frames:
> what made the racer brake while it already had the room to pass? (`noFreeSide` is 0 by construction — a
> traffic block anywhere before the dodge disqualifies the encounter.)

| Track | preDodge window frames | blockedSlower | blockedNoFreeSide | blockedDrift |
|---|---:|---:|---:|---:|
| mountainstreet | 29595 | 78.5% | 0.0% | 21.5% |
| river-run | 31037 | 86.9% | 0.0% | 13.2% |
| dirt-oval | 71669 | 84.9% | 0.0% | 15.1% |
| searound | 24936 | 74.2% | 0.0% | 25.8% |

## How to read it
- **Section B2 is the one that answers the fix question.** Read `noWindowEver` and the blocked labels ONLY within the `everFaster` block — that is the population where an overtake was actually on the table.
- **High everFaster `noWindowEver`** ⇒ real overtakes that never got a window ⇒ the lever is looking EARLIER (zone / geometry).
- **Low everFaster `noWindowEver` but low everFaster `dodged`** ⇒ it HAD room and intent and still did not pass ⇒ the lever is `maxLateralSpeedPerStep` / the dTStart margins.
- **`slower@1stWin` large** ⇒ much of run-2's "blockedSlower" was a first-window-frame snapshot artefact, not a genuine same-speed decline.
- **`neverFaster` encounters are NOT a problem** — the gate correctly declines to weave around same-speed traffic.
- **Section C pre-dodge window** ⇒ for the false brakes the Owner sees, whether the brake opened the gap (`noWindowBeforeDodge`) or it braked with room already in hand (and why: slower/drift).
- Section A shares are TIME-WEIGHTED and must not be compared as encounter rates (see the note there).
