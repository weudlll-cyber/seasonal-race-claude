# RUNIN-WIDTH-1 — only the line decides the width, and the pull-out is calmer

**Branch:** `feat/runin-state`, continuing from `fc4f47b6`. **Not merged.**
Follows [RUNIN-GLIDE-1](RUNIN-GLIDE-1.md).

---

## 0. A requirement I invented, struck

RUNIN-GLIDE-1 §5 reported field coverage under the heading "the limit the brief asked me to
measure". The owner never asked that the field stay in frame during the endgame — he said once, in
passing, that seeing the line _and_ the field sooner is more exciting, which is an argument for
opening EARLIER, not a constraint on the shot. **Field coverage is not a requirement of the run-in
and bounds nothing.** It is reported below as information only.

## 1. What drives the width — measured before anything changed

At the widest frame of the run-in, on every finishing track, **the binding term is the LINE.**

| track          | widest | the LINE alone would need | binding | field ceiling there |
| -------------- | ------ | ------------------------- | ------- | ------------------- |
| city-circuit   | 100%   | **109%**                  | line    | `Infinity`          |
| ice-track      | 100%   | **72%**                   | line    | `Infinity`          |
| dirt-oval      | 92%    | 92%                       | line    | `Infinity`          |
| searound       | 85%    | 85%                       | line    | `Infinity`          |
| luger-hill     | 67%    | 74%                       | line    | `Infinity`          |
| seatrack       | 67%    | 73%                       | line    | `Infinity`          |
| space-sprint   | 67%    | 100%                      | line    | `Infinity`          |
| river-run      | 34%    | 34%                       | line    | `Infinity`          |
| mountainstreet | 27%    | 27%                       | line    | `Infinity`          |

**The field guarantee never opens the shot — it is `Infinity` on every one of these frames**, because
it is the ceremony's promise and retires early in every race. The company guarantee does not bind at
the widest frame either (`Infinity` or far above the delivered zoom). Over the whole run-in the line
binds **86.5%–97.9%** of frames and the state's own zoom almost all of the rest. So there was no
field-guarantee decision to make: nothing needed removing.

**City-circuit is the honest exception in the other direction**: the line there would need **109%** of
the world, i.e. more than the camera can show at all, so the shot is at the projection floor and the
line still cannot be framed. **Ice-track is the one the owner spotted**: the line needed **72%** and
the delivered frame was **100%** — that gap is not the line's requirement, and §2 says what it is.

## 2. The two odd movements — one mechanism

**They are the same mechanism seen at two different corners.** The delivered zoom is a `Math.min`
over ceilings. Where the ARGMIN changes, the zoom is continuous but **its RATE is not** — and the pan
lag is proportional to that rate, so the subject's screen position **reverses direction** at the
corner. The zoom never jumps; the derivative does, and the pan makes it visible.

### (b) luger-hill seed 9, just before the finish — turning point at progress 0.9949

The framing subject (the photo-finish pair midpoint, which should sit at 640, 360) drifts forward
and then sails back:

| progress   | zoom  | Δzoom/frame | binding   | line ceiling | subject on screen              |
| ---------- | ----- | ----------- | --------- | ------------ | ------------------------------ |
| 0.9932     | 3.122 | +0.045      | line      | 3.395        | (841, 455)                     |
| 0.9944     | 3.537 | +0.051      | line      | 3.843        | (891, 487)                     |
| **0.9949** | 3.745 | +0.042      | **state** | 4.114        | **(899, 490)** ← turning point |
| 0.9955     | 3.862 | +0.023      | state     | 4.427        | (858, 462)                     |
| 0.9960     | 3.925 | +0.012      | state     | 4.791        | (809, 429)                     |
| 0.9991     | 3.997 | +0.001      | state     | 8.733        | (703, 351)                     |

**What changed at it:** the line ceiling rose past the state's own zoom (4.114 > 4.000), so the
argmin moved from `line` to `state`, the zoom's rate collapsed from +0.05 to +0.001 per frame, and
the 259 px of accumulated pan lag unwound. That unwinding IS the "brief odd jump".

### (c) ice-track, after the full opening — turning point at run-in progress 0.216

| run-in s  | zoom          | target | binding | line ceiling | cover | line on screen                |
| --------- | ------------- | ------ | ------- | ------------ | ----- | ----------------------------- |
| 0.077     | 1.000 (floor) | 1.000  | line    | 1.391        | 100%  | (364, 89)                     |
| 0.145     | 1.000 (floor) | 1.000  | line    | 1.442        | 100%  | (364, 89) — frozen            |
| 0.200     | 1.000 (floor) | 1.000  | line    | 1.510        | 100%  | (364, 89) — frozen            |
| **0.216** | 1.243         | 1.535  | line    | 1.535        | 80%   | **(427, 62)** ← turning point |
| 0.229     | 1.428         | 1.558  | line    | 1.558        | 70%   | (493, 76)                     |

**What changed at it:** for about two seconds the camera sits at `minCamZoom`, the projection floor,
showing the whole world — and because the frame _is_ the world, the world-bounds clamp holds the pan
completely still. **The line's screen position does not move by one pixel for 120 frames.** Then the
requirement crosses the floor, the camera un-pins, and everything starts moving at once. Frozen to
moving in a single frame is what he saw.

**And it confirms his instinct**: the line ceiling through that frozen stretch is 1.39–1.51, i.e. the
line was framable at 60–80% of the world the whole time. The 100% is the floor, not the line.

## 3. A calmer pull-out

The opening now runs on **`finishOverviewZoomOutDurationMs`** rather than `glideDurationMs`. That key
already means _how long an authored zoom-out at the end of the race takes_ — the same kind of move,
in the same part of the race, at the other end of it — so the two ends of the ending run at one
tempo. **`glideDurationMs` was not reused because its 300–900 ms band paces a CUT between shots and
cannot express "unhurried" for a move this large.** No new number.

|                               | before    | after        |
| ----------------------------- | --------- | ------------ |
| opening duration              | **0.5 s** | **2.9 s**    |
| line in frame (run-in window) | 93.3%     | **73.4%**    |
| line first in shot            | 0.4 s     | **2.5 s**    |
| empty frames                  | 0         | **0**        |
| LEAD_CHANGE tracking-lag p95  | 25.19 pp  | **10.72 pp** |

**It costs line-in-frame share and it does not reintroduce empty frames.** The 19.9 pp is the honest
price: the line cannot be in shot until the shot is wide enough, and the shot now takes longer to get
there.

**It is also SHALLOWER, which was not the goal but is the answer to (c) in part.** A slow ease never
reaches a target that is already receding, so the widest frame falls on six of the nine finishing
tracks: dirt-oval 92% → 72%, searound 85% → 57%, luger-hill 67% → 40%, seatrack 67% → 44%,
space-sprint 67% → 60%, river-run 34% → 21%. **City-circuit and ice-track still reach 100%** — on
those two the line genuinely needs the whole world or more at the threshold.

## 4. Measured — all ten tracks, 3 seeds each

| track          | composes | line in frame OFF → ON | widest   | 1st line  | opening   | field\*   | empty | crossing Δ |
| -------------- | -------- | ---------------------- | -------- | --------- | --------- | --------- | ----- | ---------- |
| city-circuit   | 100%     | 7.9% → **81.9%**       | 100%     | 2.3 s     | 3.0 s     | 96.1%     | 0     | 0.05%      |
| dirt-oval      | 100%     | 8.7% → **78.9%**       | 72%      | 2.5 s     | 3.0 s     | 100.0%    | 0     | 0.03%      |
| garden-path    | —        | —                      | —        | —         | —         | —         | 0     | —          |
| ice-track      | 100%     | 7.5% → **79.7%**       | 100%     | 2.4 s     | 2.9 s     | 94.4%     | 0     | 0.22%      |
| luger-hill     | 100%     | 12.1% → **65.6%**      | 40%      | 2.6 s     | 2.9 s     | 93.0%     | 0     | 0.03%      |
| mountainstreet | 100%     | 9.7% → **66.9%**       | 25%      | 2.5 s     | 2.8 s     | 93.5%     | 0     | 0.02%      |
| river-run      | 100%     | 19.9% → **68.8%**      | 21%      | 2.5 s     | 2.9 s     | 93.3%     | 0     | 0.00%      |
| searound       | 100%     | 12.0% → **81.0%**      | 57%      | 0.9 s     | 1.0 s     | 93.4%     | 0     | 0.74%      |
| seatrack       | 100%     | 7.1% → **67.4%**       | 44%      | 1.6 s     | 1.7 s     | 92.4%     | 0     | 0.08%      |
| space-sprint   | 100%     | 5.1% → **60.2%**       | 60%      | 2.7 s     | 3.0 s     | 91.9%     | 0     | 3.58%      |
| **ALL**        | **100%** | **9.8% → 73.4%**       | **100%** | **2.5 s** | **2.9 s** | **94.6%** | **0** | **3.58%**  |

\* field coverage is **INFORMATION ONLY** and bounds nothing — see §0.

## 5. What holds

- **Empty frames 0 on every track.**
- **`check-runin-frame` green on both halves** — centre 0.15 (luger-hill) and 0.37 (searound) against
  an untouched limit of 2.
- **The crossing shot is still the ordinary shot**: within 0.03% of the feature being off on six
  tracks, ≤0.74% on nine, 3.58% at worst (space-sprint) — unchanged by this block.
- **The photo-finish slow motion is untouched** — the run-in adds no state.
- **`runInShot: false` returns all three fingerprints exactly**: world `dc4647be0f55ebdb`, camera
  `64432e18a7e62188`, render `096f2726c45ed853`.

## 6. Fingerprints — measured fresh, NOT minted

| role   | stored             | this branch                      |
| ------ | ------------------ | -------------------------------- |
| world  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` — **unmoved** |
| camera | `64432e18a7e62188` | `8f6ed90ec8a89e25`               |
| render | `096f2726c45ed853` | `3f53bea250d5a4c3`               |

## 7. Left open, with the evidence

**The corner at the close (§2b) is not fixed.** Slowing the opening removed the worst of the same
mechanism at the other end — LEAD_CHANGE's p95 fell 25.19 → 10.72 — but PHOTO_FINISH's is unchanged
at 29.80, which is precisely the 259 px reversal traced above. Removing it means removing the corner,
and every way I can see to do that replaces the `Math.min` over ceilings with a blend — which is no
longer a guarantee and would need his ruling, not mine. **Reported, not attempted.**

**The two 100% tracks (§1) are the line's own requirement**, not a defect and not the field
guarantee. Making them narrower means declining to show the line when it is that far, which is the
cap he struck. Also reported rather than re-introduced.

## 8. Source hygiene

Client suite green (778 camera tests). `engine-reach --check`: only `storage/defaults.js` reaches the
engine (a camera-only key), so the world fingerprint ran and is unmoved.

- **Added**: every ceiling term is now named on the read-only framing probe (`ceilings`, `binding`),
  so "which term decided the width" is recoverable instead of inferred. The `Math.min` is the same
  computation it always was.
- **Changed**: the engagement glide's duration source.
- **Noticed and left**: the `_focusAnchorRacer` null for group shots outside the run-in;
  `PHOTO_FINISH` absent from `ALL_STATES`; `rAFProbe`'s `_STATE_IDX`.

## 9. For his eye

**Luger Hill, seed 9 — the pull-out should now feel unhurried rather than snatched; watch whether the
line arriving later in the run-in is a fair trade for that, and whether the small reversal right at
the line still reads as a jump.**
