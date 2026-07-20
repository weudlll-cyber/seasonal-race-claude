# LBB-BLOCKDIST — the blocking velocity during isolated LONG (d)-blocks

Read-only analysis (observer-side) of a re-run of the `--lbb-diag` sweep (river-run/duck,
mountainstreet/boarder, dirt-oval/horse, searound/manta; 50 races, 60 s, seed=1, `--jobs=8`, WITH (d) =
master scenario). No physics change. **Determinism confirmed: all four per-frame summaries reproduce
`lbb-diag-4` exactly** (the analyzer only reads records).

**Isolated (d)-only block** = a run of consecutive frames in one encounter where: braked, (a) `dT>dTStart`,
(b) `slowerLeaderOk||heroPass`, (c) `dir!==0`, `vLatToward<0` is the ONLY failing condition, and `dir`
does not change (the free side stays the same one). Scale: ambient noise ≈ 3.4e-4, committed dodge =
`maxLateralSpeedPerStep` = 2.8e-2.

## 1. Length distribution — do these reach 35–50 frames? YES, and far beyond.

| track | median | p90 | max | nBlocks | blocks ≥20 fr |
|---|---:|---:|---:|---:|---:|
| river-run | 3 | 43 | **595** | 7 160 | 1 684 |
| mountainstreet | 3 | 41 | **502** | 10 593 | 2 403 |
| dirt-oval | 3 | 72 | **782** | 15 444 | 3 907 |
| searound | 4 | 63 | **553** | 13 064 | 3 180 |

Most (d)-only blocks are short (median 3–4 frames — the twitch case), but every track has a heavy tail:
p90 = 41–72 frames, max 500–780 frames (≈8–13 s). Thousands of blocks per track reach ≥20 frames. **The
Owner's 35–50-frame population exists in the (d)-only data.** The hypothesis does not collapse here.

## 2. Blocking velocity in blocks ≥20 frames — it clusters SMALL.

| track | median \|vLat\| | p10 | p90 | max |
|---|---:|---:|---:|---:|
| river-run | 4.5e-4 | 5.0e-5 | 2.2e-3 | 2.8e-2 |
| mountainstreet | 2.5e-4 | 3.2e-5 | 1.3e-3 | 1.6e-2 |
| dirt-oval | 3.2e-4 | 2.8e-5 | 1.8e-3 | 2.8e-2 |
| searound | 7.9e-4 | 8.9e-5 | 2.8e-3 | 2.8e-2 |

Histogram of \|vLatToward\| across long-block frames (bucket edges 1e-5 … 2.8e-2):

| track | <1e-5 | 1e-5–1e-4 | 1e-4–3e-4 | 3e-4–1e-3 | 1e-3–3e-3 | 3e-3–1e-2 | 1e-2–2.8e-2 | ≥2.8e-2 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| river-run | 2.6% | 14.9% | 25.6% | 27.1% | 25.1% | 4.5% | 0.2% | 0.0% |
| mountainstreet | 3.3% | 30.1% | 19.6% | 30.8% | 15.4% | 0.8% | 0.0% | 0.0% |
| dirt-oval | 5.0% | 18.7% | 25.2% | 28.0% | 20.9% | 2.1% | 0.1% | 0.0% |
| searound | 2.0% | 9.1% | 15.7% | 27.9% | 40.2% | 4.7% | 0.2% | 0.1% |

The **median blocking velocity (2.5e-4 … 7.9e-4) sits right at the ambient-noise scale (~3.4e-4)**. ~93% of
long-block frames fall in 1e-5 … 3e-3; only ~0.2–4.9% reach ≥3e-3, and essentially none reach the dodge
scale (2.8e-2) except the isolated max (a few frames). **This is the "clusters small" outcome the brief
defined:** the veto is fed by a velocity two orders of magnitude below a real dodge.

## 3. Sustained or re-triggered? SUSTAINED (a continuous force).

Mean frame-to-frame change of \|vLatToward\| divided by the block's own median (small ⇒ flat):

| track | ratio |
|---|---:|
| river-run | 0.013 |
| mountainstreet | 0.015 |
| dirt-oval | 0.012 |
| searound | 0.014 |

The trace is essentially **flat** (≈1.2–1.5% frame-to-frame). With `lateralDamping` 0.16 destroying 84% of
lateral velocity each frame, a flat \|vLatToward\| can only be produced by a force re-applied EVERY frame.
So the veto is held by a **weak, continuous force toward the leader**, not a decaying one-off twitch.

## 4. How much of the Owner's complaint does this explain? (btd cross-tab)

Share of `brakeThenDodge` encounters that contain an isolated (d)-only block:

| track | brakeThenDodge | contains ANY (d)-block | contains a LONG (≥20) (d)-block |
|---|---:|---:|---:|
| river-run | 1 335 | 895 (67.0%) | 434 (32.5%) |
| mountainstreet | 1 791 | 1 287 (71.9%) | 626 (35.0%) |
| dirt-oval | 2 369 | 1 780 (75.1%) | 1 178 (49.7%) |
| searound | 1 415 | 1 201 (84.9%) | 810 (57.2%) |

**67–85% of confirmed false-brakes contain an isolated (d)-only block; 33–57% contain a LONG one.** The
Owner's scenario is not a corner case — it is the majority of the brakeThenDodge population, and the long
variant is a third to over half of it.

## What this informs, and what it does NOT

- **Informs the LONG-BRAKE symptom** ("free lane, brake ~0.7 s, then move into it"): the blocking velocity
  is small (≈3e-4, at noise) and sustained, over blocks that reach 35–780 frames with the free side
  unchanged. On the brief's own decision rule this is the "weak force amplified into a permanent veto by a
  threshold-less test" outcome — a **deadband on (d)** (ignore \|vLatToward\| below ~1e-3) would let these
  encounters dodge. Plan-Claude's magnitude claim is supported by the histogram, not refuted.
- **Does NOT inform the ZIGZAG symptom.** LBB-TRACE-2 showed racer 22 weaved 4× without (d), 0× with (d);
  `zigzagScore` is a poor proxy (ρ 0.53 / 0.12). A deadband is a PARTIAL loosening of (d); whether it
  reintroduces the weave (removing (d) entirely did) is **unanswered here**. Any fix must pass both gates
  (weave near the WITH-(d) value AND brakeThenDodge median braked-frames near the WITHOUT-(d) ~2); this
  analysis only establishes that the long-brake half is a small, sustained-force veto.

One caveat on record: the small sustained velocity is *what (d) reads*; this measures the veto INPUT, not
the force's source. It does not identify WHAT applies the continuous toward-leader force (soft-steering
pull, a third-racer push, boundary repulsion), only that it is weak and continuous.

Artifacts (gitignored): `results/lbb-blockdist/lbb-{track}.json` (`.blockDist`). Analysis code
(`scripts/lbb-blockdist.mjs` + the env-gated harness hook) is throwaway.
