# LBB-TRACE-3 — capture `t` and the actual blocker; settle it (throwaway branch trace/lbb-weave, KEPT)

Seed=1, mountainstreet/boarder, racer 22, 60 s. Capture env-gated (`LBB_TRACE=1`), read-only. Extended the
dump with `t` for every racer, and had `isSideFree`/`chooseFreeLaneDir` report their OWN answer per frame
(free/blocked per side + the tripping racer index + the box + latch state) — no post-hoc reconstruction.

**Inertness (both costumes):** WITHOUT-(d) fingerprint `0259ea6c3e75efc3`, WITH-(d) `fa4e3796e1e5f1a5`. ✓

## SANITY GATE (run first) — PASS

Recomputed `isSideFree` for both sides from the captured `t`+`physicalY` (physicalY from frame F−1, t from
frame F — the pre-apply-deltas state the gate saw) and compared to the gate's own recorded answer, on every
evaluated frame of racer 22's traced legs: **484 / 484 frames match on free-side AND blocker identity
(100%).** The capture reproduces the gate exactly, so the blocker column below is the gate's own, not a
reconstruction. (This is the check the prior review lacked, which produced its 11-vs-9 lateral error.)

## The eight flips (WITHOUT (d), racer 22) — blocker from the gate itself

| flip@ | from→to | side that closed | blocker | latch (pli/pd, applied?) | gate `why` |
|---:|:--:|:--|---:|:--|:--|
| 2051 | +1→−1 | right(+) | **39** | 8/1, applied | onlyLeft |
| 2058 | −1→+1 | left(−) | **36** | 8/−1, applied | onlyRight |
| 2061 | +1→−1 | right(+) | **39** | 8/1, applied | onlyLeft |
| 2066 | −1→+1 | left(−) | **36** | 8/−1, applied | onlyRight |
| 2079 | +1→−1 | right(+) | **39** | −1/0, **cleared** | onlyLeft |
| 2080 | −1→+1 | left(−) | **36** | 3/−1, applied | onlyRight |
| 2099 | +1→−1 | right(+) | **8** | 3/1, applied | onlyLeft |
| 2639 | +1→−1 | right(+) | **8** | 3/1, applied | onlyLeft |

**Rotating cast, not one racer:** the blockers are **{39, 36, 8}** — right side closed by 39 (then 8),
left by 36 — a tight local cluster alternating right/left, six flips in 30 frames (2051–2080). Not "one
racer slowly passing."

**Latch:** at **7 of 8** flips the latch was INTACT and applied (`passLeaderIndex` matched: 8 or 3), yet
`why`=onlyLeft/onlyRight — the flip happened because the *committed side became blocked*, so the gate fell to
the only free side. Only flip 2079 had a cleared latch.

## How each blocker entered the box (leg start → flip; gate reads physicalY@F−1, t@F)

`latIn0`/`longIn0` = was the blocker laterally-in-window / longitudinally-in-band at leg start (the closing
side was FREE at start, so not both). `blkΔy`/`r22Δy` = lateral movement of blocker / racer 22 over the leg.
`arc` = `shortestArcDeltaT(r22, blocker)`.

| flip@ | blocker | legStart | latIn0 / longIn0 | blkΔy | r22Δy | arc start→flip (thr 0.00164) | entry mode |
|---:|---:|---:|:--:|---:|---:|:--|:--|
| 2051 | 39 | 2045 | N / Y | −0.0054 | **+0.0792** | 0.00147→0.00144 | **A: r22 SWEPT onto blocker** |
| 2058 | 36 | 2051 | N / Y | +0.0067 | **−0.0442** | 0.00114→0.00106 | **A: r22 SWEPT onto blocker** |
| 2061 | 39 | 2058 | N / Y | −0.0026 | **+0.0348** | 0.00142→0.00143 | **A: r22 SWEPT onto blocker** |
| 2066 | 36 | 2061 | N / Y | +0.0053 | **−0.0294** | 0.00103→0.00097 | **A: r22 SWEPT onto blocker** |
| 2079 | 39 | 2066 | N / Y | −0.0104 | +0.0201 | 0.00143→0.00154 | MIXED lateral (both moved) |
| 2080 | 36 | 2079 | N / Y | +0.0012 | **−0.0142** | 0.00092→0.00092 | **A: r22 SWEPT onto blocker** |
| 2099 | 8 | 2090 | Y / **N** | −0.0062 | +0.0216 | **0.00175→0.00164** | **LONGITUDINAL entry (arc crossed tHalf)** |
| 2639 | 8 | 2617 | N / Y | **+0.0511** | +0.0644 | 0.00016→0.00026 | MIXED lateral (both moved) |

## Verdict on each theory (from the frames; sanity-verified blockers)

- **Claim A (self-referential window) — CONFIRMED as the dominant mechanism.** In **5 of 8** flips
  (2051, 2058, 2061, 2066, 2080) the blocker was longitudinally in-band the whole leg (arc < tHalf,
  ~unchanged) and NOT laterally in-window at leg start; racer 22's own lateral travel (`r22Δy` 0.014–0.079)
  exceeded the blocker's (`blkΔy` 0.001–0.007) by 3–15×. So racer 22 carried its self-anchored window onto a
  nearly-stationary, longitudinally-adjacent neighbour — exactly Claim A. Gate-verified blocker identity.
- **Ordinary traffic (blocker's own lateral motion) — minor.** Only 2079 and 2639 have comparable blocker
  motion, and even there the blocker is longitudinally adjacent (tight cluster). Not the driver.
- **Longitudinal entry (the third mechanism) — real but rare.** Exactly **1 of 8** (2099): blocker 8 was
  laterally in-range but longitudinally out at leg start (arc 0.00175 > tHalf), and crossed the band by the
  flip.
- **Copilot's leaky-latch artefact — largely FALSIFIED.** The latch was intact and applied at 7 of 8 flips;
  it could not prevent the flip because the committed side genuinely became blocked (a racer entered the
  window), and a non-leaky latch MUST still yield a genuinely-blocked side (holding it would be a squeeze).
  Only 1 flip (2079) followed a cleared latch. The weave is not primarily a latch-leak; it is the
  self-referential window closing the committed side.
- **Claim B (coupled oscillator) — CONSISTENT, not proven.** The rotating cast {39, 36, 8} and the rapid
  right/left alternation (6 flips / 30 frames) fit a tight local cluster oscillating; but whether racer 22's
  flips CAUSE 39/36/8's flips (true coupling) needs their flip timelines, not analysed here. Consistent with
  Claim B, causal coupling not directly shown.

**Contrast:** WITH (d), racer 22 has **0** dir-flips over the same race (255 gate-evaluated frames);
WITHOUT (d), **8**. (d) suppresses every flip.

Artifacts (gitignored): `raw-nod.json`, `raw-withd.json`, `analysis.txt`. Analysis code
(`scripts/lbb-trace3-analyze.mjs`) + the env-gated instrumentation are throwaway on the kept branch.
Teardown remains a separate step.
