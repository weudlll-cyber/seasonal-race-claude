# RUNIN-PACE-1 — own key, explained width, and a rate limit that measured out

**Branch:** `feat/runin-state`, continuing from `febffb4d`. **Not merged.**
Follows [RUNIN-WIDTH-1](RUNIN-WIDTH-1.md).

---

## 1. The key is split

The opening ran on `finishOverviewZoomOutDurationMs`, which also paces the zoom-out **after** the
crossing — a shot the owner has already accepted at its present length. One value, two motions at
different moments for different reasons: tuning either would have moved the other, putting a settled
value at risk to change an unsettled one.

**`runInOpenMs` is its own key now**, in the ending controls beside that zoom-out, clamped to
0–6000 ms like every other duration there. **Default 1250 ms** — his words, "between 1 and 1.5
seconds would have been enough".

**The post-crossing zoom-out is restored, and here is the number.** It was never altered in VALUE —
the coupling was a shared _source_, not a changed figure — so the proof is independence: measured on
the frame `FINISH_OVERVIEW`'s glide starts to the frame it ends, **3000 ms on every track at every
one of the three paces below**. Changing the opening no longer moves it at all.

### The sweep — all ten tracks, 3 seeds

| pace                  | line in frame | line first in shot | widest | empty | LEAD_CHANGE lag p95 | post-crossing zoom-out |
| --------------------- | ------------- | ------------------ | ------ | ----- | ------------------- | ---------------------- |
| **1000 ms**           | 88.8%         | 0.9 s              | 100%   | **0** | 23.14 pp            | 3000 ms                |
| **1250 ms** (shipped) | 86.6%         | 1.1 s              | 100%   | **0** | 22.17 pp            | 3000 ms                |
| **1500 ms**           | 84.4%         | 1.3 s              | 100%   | **0** | 21.12 pp            | 3000 ms                |
| _(3000 ms, previous)_ | _73.4%_       | _2.5 s_            | _100%_ | _0_   | _10.72 pp_          | _3000 ms_              |

**The trade his number buys:** dropping 3000 → 1250 ms gives the line back — in frame **73.4% →
86.6%** of the run-in, arriving **2.5 s → 1.1 s** after the window opens — and pays for it in the
tracking-lag tail, **LEAD_CHANGE p95 10.72 → 22.17 pp**. The lag is proportional to the zoom rate, so
a faster opening is a larger tail by construction. Empty frames stay 0 at every pace.

## 2. The 28 points on ice-track — it is not the line, it is `resolveCamera`

**Answer: `resolveCamera` asks for more width than the line, and it is the widest ask on the frame.**

`resolveCamera` is the last authority on width and it only ever LOOSENS: it steps the zoom down 10%
at a time until the pan target lands inside `innerFramePct`, or until the projection floor. It is
therefore a width REQUEST like any ceiling — and the only one nothing could see. It is now recorded
on a read-only probe, which is what made this answerable.

Frame by frame across that window (ice-track seed 9, widths as a fraction of the world, **bigger =
wider**):

| run-in s | delivered | line | state | company | resolveCamera asked → got | adapted | clamped | target inside inner frame | **widest ask**    |
| -------- | --------- | ---- | ----- | ------- | ------------------------- | ------- | ------- | ------------------------- | ----------------- |
| 0.001    | 22%       | 87%  | 11%   | 6%      | 87% → **100%**            | true    | true    | **false**                 | **resolveCamera** |
| 0.059    | 28%       | 75%  | 11%   | 8%      | 75% → **100%**            | true    | true    | **false**                 | **resolveCamera** |
| 0.117    | 52%       | 71%  | 11%   | 9%      | 71% → **100%**            | true    | true    | **false**                 | **resolveCamera** |
| 0.174    | **100%**  | 68%  | 11%   | 9%      | 68% → **100%**            | true    | true    | **false**                 | **resolveCamera** |
| 0.231    | 69%       | 64%  | 11%   | 9%      | 64% → 64%                 | false   | true    | true                      | line              |
| 0.289    | 61%       | 59%  | 11%   | 8%      | 59% → 59%                 | false   | true    | true                      | line              |

**The mechanism.** The run-in places the anchor behind centre, which pushes the pan target forward —
toward the line, and on ice-track toward the world edge. The world-bounds clamp then prevents
centring it, so the target falls outside the inner 70%, so `resolveCamera` widens 10% at a time
trying to bring it in. **Widening cannot bring it in** — the clamp still pins the frame to the world
— so the loop is futile and stops only at the projection floor. `targetInInnerFrame` is **false on
every one of those frames**: the widening achieved nothing and cost 28 points of world.

**And this is very probably what he has been seeing on that track all along.** It is not the run-in's
doing: it fires whenever a pan target sits near the world edge at a wide shot, which is a
pre-existing interaction between `resolveCamera`'s inner-frame fit and the world-bounds clamp.

**NOT FIXED HERE, and the reason is a constraint rather than a preference.** The repair is inside
`resolveCamera` — "stop widening once widening cannot help" — and that function is the last step for
**every** state on **every** frame. Changing it moves the camera and render fingerprints with
`runInShot: false`, which breaks the standing promise that the off arm returns to the stored values
exactly. It needs its own block and his ruling, not a rider on this one.

## 3. A tighten-rate limit — built, measured, and taken back out

The candidate was sound in principle, and the brief's reasoning holds: every ceiling is a LOWER BOUND
ON WIDTH, so approaching one more slowly **from the wide side** can never violate it. `Math.min`
keeps its meaning exactly, unlike the blend rejected before it.

**It fails on a requirement standing beside it: the shot at the crossing must be the ordinary shot.**
A rate limit _is_ a delay in arriving, and the crossing is exactly where arrival is due. The two are
in direct conflict, and the measurement is not close:

| variant                                      | corner reversal                            | closing rate max | crossing zoom vs OFF (worst of ten tracks) |
| -------------------------------------------- | ------------------------------------------ | ---------------- | ------------------------------------------ |
| **no limit (shipped)**                       | 221 px, peak at s=0.949 — **the corner**   | 2.04 %/frame     | **3.58%**                                  |
| limit at the derived rate (`dt/runInOpenMs`) | 192 px, peak at s=0.952 — still the corner | 2.24 %/frame     | **23.83%**                                 |
| limit at half that rate                      | 96 px, peak moved to s=1.000               | 1.27 %/frame     | **55.30%**                                 |
| paced to arrive at the line                  | 96 px, peak moved to s=0.974               | 2.04 %/frame     | **7.91%**                                  |

**So the rate that is DERIVABLE from `runInOpenMs` barely moves the corner** (221 → 192 px, and the
peak stays at s≈0.95), **and every rate that does move it costs the crossing shot by an order of
magnitude.** Halving the rate would also have needed a constant I cannot derive.

**The `arrive` variant is the interesting near-miss** and is worth recording. Pacing the close to
reach the state's own zoom exactly at s=1 needs no constant at all, and it genuinely flattens the
corner — the rate through it reads 1.04, 0.85, 0.66, 0.73, 0.61 %/frame instead of 1.24, 1.37, 1.48,
0.12, 0.01, and the subject sits almost still there (765 → 769 → 772 → 787 → 785 px). But it arrives
at cam.zoom 3.77 where the ordinary shot is 4.00, so the crossing is 7.91% off — still twice the
budget the shipped arm holds.

**Taken back out.** What survives is the study above and one paragraph in `_setTargets` recording it,
so the next reader does not rebuild it.

## 4. Measured — all ten tracks, 3 seeds, at the shipped 1250 ms

| track          | line in frame OFF → ON | widest   | 1st line  | empty | crossing Δ |
| -------------- | ---------------------- | -------- | --------- | ----- | ---------- |
| city-circuit   | 7.9% → **92.5%**       | 100%     | 1.0 s     | 0     | 0.05%      |
| dirt-oval      | 8.7% → **91.4%**       | 81%      | 1.0 s     | 0     | 0.03%      |
| garden-path    | —                      | —        | —         | 0     | —          |
| ice-track      | 7.5% → **89.7%**       | 100%     | 1.0 s     | 0     | 0.22%      |
| luger-hill     | 12.1% → **84.6%**      | 67%      | 1.1 s     | 0     | 0.03%      |
| mountainstreet | 9.7% → **81.3%**       | 26%      | 1.1 s     | 0     | 0.02%      |
| river-run      | 19.9% → **85.5%**      | 32%      | 1.1 s     | 0     | 0.00%      |
| searound       | 12.0% → **88.0%**      | 74%      | 0.9 s     | 0     | 0.74%      |
| seatrack       | 7.1% → **78.5%**       | 51%      | 1.1 s     | 0     | 0.08%      |
| space-sprint   | 5.1% → **81.0%**       | 67%      | 1.1 s     | 0     | 3.58%      |
| **ALL**        | **9.8% → 86.6%**       | **100%** | **1.1 s** | **0** | **3.58%**  |

## 5. What holds

- **Empty frames 0 on every track**, at every pace tested.
- **`check-runin-frame` green on both halves** — centre 0.15 (luger-hill) / 0.94 (searound) against
  an untouched limit of 2.
- **The crossing shot is still the ordinary shot**: ≤0.74% on nine tracks, 3.58% at worst.
- **The photo-finish slow motion is untouched** — the run-in adds no state.
- **`runInShot: false` returns all three fingerprints exactly**: `dc4647be0f55ebdb`,
  `64432e18a7e62188`, `096f2726c45ed853`.

## 6. Fingerprints — measured fresh, NOT minted

| role   | stored             | this branch                      |
| ------ | ------------------ | -------------------------------- |
| world  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` — **unmoved** |
| camera | `64432e18a7e62188` | `988a9b31aaf9768a`               |
| render | `096f2726c45ed853` | `c962df5334277f95`               |

## 7. The tracking lag, at 1250 ms

| state         | frames | median | p95       |
| ------------- | ------ | ------ | --------- |
| BATTLE_ZOOM   | 9406   | 5.70   | 10.55     |
| COMEBACK_ZOOM | 605    | 2.44   | 15.57     |
| LEADER_ZOOM   | 17788  | 4.05   | 9.32      |
| LEAD_CHANGE   | 7789   | 4.56   | **22.17** |
| OVERVIEW      | 4303   | 2.65   | 16.00     |
| PHOTO_FINISH  | 1865   | 4.71   | **29.80** |

LEAD_CHANGE's tail is the faster opening, and it is the price of §1's trade. PHOTO_FINISH's is the
corner of §3, unchanged because nothing was shipped against it.

## 8. Source hygiene

Client suite green (778 camera tests). `engine-reach --check`: only `storage/defaults.js` reaches the
engine (camera-only keys), so the world fingerprint ran and is unmoved.

- **Added**: `runInOpenMs` and its band; `_resolveProbe`, a read-only record of what `resolveCamera`
  asked for and what it returned — §2 was unanswerable without it.
- **Removed**: the tighten-rate limit, and its scratch state, leaving the study as a comment.
- **Noticed and left**: `resolveCamera`'s futile widening (§2) — a shared authority, so out of scope
  here; the `_focusAnchorRacer` null for group shots; `PHOTO_FINISH` absent from `ALL_STATES`.

## 9. For his eye

**Luger Hill seed 9 — the pull-out should feel like a deliberate move rather than a snatch, and the
line should be in shot about a second after the run-in starts.**
**Ice-track seed 9 — the shot still opens to the whole world for about two seconds; §2 says that is
`resolveCamera` and not the finish line, and it is a repair I have deliberately not made here.**
