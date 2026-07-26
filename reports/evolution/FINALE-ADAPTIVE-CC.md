# Act 2 — self-adaptive finale contest — CC opinion

**Report-only. Author: CC. Master `7404bd9`. No code changed, no sims run.** My independent read of whether
a single track-agnostic self-adaptive dose can lift the finale on BOTH topologies, given the fixed-dose
mixed failure ([FINALE-SCREEN.md](FINALE-SCREEN.md)). Written without reference to the Copilot file.

## 1. Diagnosis — why the fixed dose inverted by topology

**The root is the fixed ABSOLUTE gate meeting a topology-dependent front spread — so the gate's
*selectivity* inverts, not its firing count.** Two facts from the SCREEN pin this down:

- The intervention counts are almost identical across topologies — A fires **2.84/race on open vs
  2.68/race on closed**, B 0.40 vs 0.24. The mechanism does NOT fire more on one; the same number of
  tilts land. So the divergence is in the *effect per tilt*, not the volume.
- The CONTROL front is **~1.8× wider on open**: `front@line` 5.36 (open) vs 2.92 (closed) — i.e. ~5.4
  racers sit within 3 lengths of the open leader vs ~2.9 on closed. Open races genuinely run a wider
  front-band spread; closed races bunch.

The gate is an **absolute** threshold in racer lengths (`arcT × lenScale`, `lenScale = pathLengthPx /
meanBodyLen`, a track-neutral unit — [computeGapBiasedTarget](../../client/src/modules/racePlanner.js)).
Hold `G_c = 1.0` length against those two fronts:

- **Open (wide front, ~5–6 L across five racers → adjacent gaps ~1.5 L):** nearly EVERY front pursuer sits
  more than 1 L behind, so the catch-up UP-tilt fires on **all of them at once**. A uniform pull on the
  whole front shifts it up together and creates **no relative movement** → no overtakes → lead-changes
  fall (3.00→2.36). And because the window ends at 0.90, the open track's long run-out `[0.90, 1.0]`
  re-expands the field under the servo + natural spread, so the compression does not even reach the line —
  `front@line` drops (5.36→4.32). Net: over-uniform, washed-out → **contest killed** (dead↓/runaway↓ are
  the by-product of a calmer, lower-variance finish, not a win).
- **Closed (narrow front, ~2.5 L → adjacent gaps ~0.6 L):** P2 (~0.6 L back) is BELOW the gate, only the
  deeper pursuers (P3+, >1 L) get pulled — a **selective** surge of the deep runners that DOES create
  overtakes → lead-changes rise (1.48→1.80). But the leader-bleed `G_b = 2.0` occasionally fires on a
  genuine escape and, on a bunched 2.5 L front, dropping the ex-leader back lands it **inside the pack** →
  a mild Leash-style musical-chairs churn → dead (8→16%) and runaway (16→24%) both worsen. `arcT` is
  lap-aware on closed, so the leader→pack gap is measured correctly across the wrap — the churn is real,
  not a wrap artefact.

So one absolute gate is simultaneously **too low relative to the wide open front** (fires on everyone →
uniform → kills contest) and **coarse-but-selective relative to the narrow closed front** (adds contest
but the fixed-length bleed over-churns the bunched pack). The `[spreadMin, spreadMax]` clamp is identical
on both tracks, so the per-tilt *speed* authority is the same; what differs is how that authority maps onto
each track's front geometry.

**The single race-internal quantity that separates the regimes: the live front-band spread `S` = the
leader→live-P5 arc-gap in racer lengths** (open: large; closed: small). Every inversion above is a function
of `G_c`/`G_b` vs `S`.

**Recommendation (1):** treat the failure as a **selectivity** bug — the fixed absolute gate has the wrong
selectivity against each topology's front — and use the **live front-band spread `S` (leader→P5 in
lengths)** as the one track-internal signal that tells the two regimes apart.

---

## 2. Adaptive law — gates as fractions of the live front spread

**Make the two gates FRACTIONS of `S` instead of absolute lengths.** That holds the mechanism's *relative*
selectivity constant across topologies — which is exactly the thing that inverted — and, as a free
consequence, gives the "more pull when loose, less when tight" behaviour the brief asks for.

Signal → dose (one global parameter set, dimensionless fractions):

```
S   = arcT(live[0].t, live[min(4, nLiveFront-1)].t, isOpen) * lenScale   // leader→P5, racer lengths
if (S < S_floor) → no-op                         // front already tight → nothing to compress ("less/none when tight")
G_c = finaleCatchupGateFraction     * S          // e.g. 0.40 · S
G_b = finaleLeaderBleedGateFraction * S          // e.g. 0.80 · S   (fraction_b > fraction_c ⇒ G_b > G_c ALWAYS)
```

then the existing A/B branches, unchanged, using these `G_c`/`G_b` and the existing fixed
`finaleCompressStrength`.

Why this reconciles both topologies:

- **Open (large `S`):** `G_c = 0.40·S` becomes a LARGE absolute gate → the catch-up now fires only on
  pursuers more than ~40 % of the front-spread behind → **selective, not uniform** → those deep surges
  ARE overtakes → lead-changes recover. The tilt magnitude `frac = strength·(gap − G_c)` — where `gap` and
  `G_c` both scale with `S` — grows with `S`, so a loose front gets a firmer pull ("more pull when loose"),
  automatically, with no extra knob.
- **Closed (small `S`):** `G_c = 0.40·S` is a SMALL absolute gate → the same selective deep-pursuer pull
  that already added contest is preserved; and `G_b = 0.80·S` scales the bleed gate DOWN with the bunched
  front, but the `frac` (∝ `S`) shrinks too → gentler, proportional bleed → less over-churn than the fixed
  2.0 L / fixed-strength slam that drove the runaway/dead regression.

The `b_fraction > c_fraction` ordering makes `G_b > G_c` true for all `S > 0` **by construction** — the
hard invariant is preserved without a separate validator, and B still can never arm without A.

Constraints check: `S` is a pure function of live `t` + `lenScale` (both identical across engines) → no
rng, no clock → **parity-golden safe**; tilts stay inside `[spreadMin, spreadMax]` → **honest band**;
scoped to STATIC front-band members and reads only `arcT`/live order → **no BAND_EDGES crossing, no
target/servo touch**; the catch-up is multi-racer → **no 2-racer duel**; the window is progress-based and
`S` is a spatial length → **duration-scaled**; two dimensionless fractions + strength + window are **ONE
global set**, zero track knowledge.

**Recommendation (2):** replace the two absolute gates with **`G_c = c·S`, `G_b = b·S`** (`b > c`, `S` =
leader→P5 front spread in lengths, with a small-`S` no-op floor) inside the existing finale block — a
constant-relative-selectivity law that is pure, honest-band, front-band-only, and one global parameter set.

---

## 3. Feasibility + risk

**Cheapest build on `8d5e9fd`:** it is a near-drop-in on the existing overlay — compute `S` from the
`liveF` array already built in the finale block, derive `G_c`/`G_b` from it, and feed the unchanged A/B
branches. Config delta: add `finaleAdaptiveGates` (flag, default OFF → byte-identical: the block reads the
fixed gates exactly as today when off) + two dimensionless knobs `finaleCatchupGateFraction` /
`finaleLeaderBleedGateFraction`; keep window + strength. Reuse the DevScreen sub-heading and the same
config/CLI/golden plumbing. One code site, one flag; fingerprints must stay ON `7c70b1eae7d31e22` / OFF
`f8f7d9c2fd3283e9`.

**SCREEN that judges it:** the same paired harness (`exp-finale-screen.mjs`), CONTROL vs ADAPTIVE, luger-hill
+ searound, N=25/arm, band-reach ≥70% as the veto, guardrails dead / front@line / lead-changes / runaway /
escape, plus the A/B split AND a new per-track diagnostic: the *realized* `G_c`/`G_b` (mean lengths) so we
can confirm they actually scale (large on open, small on closed). **Pass bar — BOTH tracks, one law:**
floor held on both AND `open lead-changes ≥ control` (the over-calm is cured) AND `closed runaway/dead ≤
control` (the over-churn is cured), with the other guardrails not materially worse.

**Main risk — different physics, not just different dose.** Two failure modes are topology-structural, not
gate-selectivity: (i) on open, the long `[0.90, 1.0]` run-out re-expands the field, so ANY compression in
`[0.80, 0.90]` washes out by the line (`front@line` fell even under the fixed dose) — adaptive gates fix
the *uniformity* but cannot make a `[0.80,0.90]` intervention persist to an open-track line; (ii) on closed,
bleeding a leader into a bunched lapping pack is inherently churn-prone. If those dominate, no single
scheduled-dice law reconciles both, and the honest move is to **abandon Act 2** — the fixed-dose mixed
failure plus an adaptive miss would be two independent signals that a front-band dice overlay is the wrong
mechanism class for a track-agnostic finale.

**Recommendation (3):** build the adaptive-gate variant as the ONE cheap decisive test; abandon Act 2 if
its paired SCREEN still fails the "both tracks hold the floor AND neither the open over-calm nor the closed
over-churn is cured" bar.

---

## Closing line

**Build first: `finaleAdaptiveGates` (flag-gated, default OFF) — set `G_c = c·S` and `G_b = b·S`
(`b > c`, `S` = the live leader→P5 front-spread in racer lengths, small-`S` no-op floor) inside the
existing finale overlay, so one track-agnostic law keeps constant relative selectivity and self-scales its
pull to how loose the front is. Abandon Act 2 if a paired luger-hill+searound SCREEN shows it cannot BOTH
restore open-track lead-changes AND avoid worsening closed-track runaway/dead while holding the 70% floor —
because that proves the open re-expansion and closed bunched-churn are structural, and no single
scheduled-dice overlay can serve both topologies at once.**
