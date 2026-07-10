# NIGHT SWEEP — GAP SPACE IN RACER LENGTHS

**Date:** 2026-07-10 · **Branch:** `chore/sim-trust` · **Runner:** `run-gapspace.mjs` · **Analyzer:** `analyze-gapspace-lengths.mjs`
**Frozen data:** `scripts/night-sweep/results/gap-space/{gm,hm}-ns2-<arm>-<track>.json`, `summary-lengths.json`

> **⚠️ STAMP: ASSUMED-DEFAULTS (PROVISIONAL).** No `--config world.json`; worldHash = `ASSUMED-DEFAULTS`
> in every `hm-*.json`. The owner's exported world differs from defaults in four values, so these numbers
> describe his race only if his browser is at defaults. Bind by re-running with `--config`.

> **⚠️ RAW DISTRIBUTIONS ONLY, IN RACER LENGTHS (primary). NO GATE, NO TUNING.** Seconds are kept as a
> secondary column. Every `deadRaceFlag` / `visibleComeback` / `fracOver3` uses PROPOSED thresholds and is
> **provisional** — a label on a distribution, never a verdict. X / Y / Z await the owner's calibration.

---

## 1. Concept-check verdict — this is MEASUREMENT (+ where the spec was wrong)

**Confirmed:** the *behavior* of no shipped race module changed. The shipped-file edits are a
**behavior-preserving extraction** of a conversion that already existed and was **duplicated in four
places**. Proven unchanged: `raceLengths.test.js` asserts the extracted `arcLengths` is **bit-identical**
to the old inline `arcT × pathLengthPx/meanBodyLen` across open/closed/lap-seam (31/31); the byte-identical
race golden (`golden-stage0` G2) still passes; and **164/164** RaceScreen + module tests pass. The lateral
rule is untouched. The re-run reproduced last-night's band-reach on all 12 cells to the decimal → same races.

**Two spec claims were wrong, and I corrected course (flagged before acting):**
1. **"Recompute lengths from last night's frozen data; nothing needs re-simulating" — impossible.** The
   frozen `gm-*.json` stored only seconds-*derived aggregates*, not raw positions. Lengths are a *spatial*
   quantity (`arcT(leaderT, racerT) × lenScale`), not a unit-conversion of seconds. Per the spec's own escape
   hatch I added lengths to the observer and **re-ran** the 12 cells (deterministic, `seed=1` → identical
   races). This is a faithful reproduction, not a new experiment.
2. **The conversion was in four places, not one:** [GovernorDiagHUD.jsx:62](../../client/src/screens/RaceScreen/GovernorDiagHUD.jsx#L62),
   [raceGovernor.js:214](../../client/src/modules/raceGovernor.js#L214), and [sim-fairness.mjs](../sim-fairness.mjs)
   `govLenScale`; `arcT` was already single-source. All now route through the shared module.

**`lengthsBehindLeader` is spatial, not seconds×speed** — it is the instantaneous on-track arc distance to
the leader (the number the HUD shows: `gapLen`), speed-independent. That is the owner's model.

---

## 2. The shared module — one source, imported by both sides

New: [client/src/modules/raceLengths.js](../../client/src/modules/raceLengths.js) — `arcT`, `lenScaleFrom`,
`arcLengths`, `meanDrawnBodyLen`. Proof (grep) that the browser AND the sim import it, never copy it:

```
raceGovernor.js:29        import { arcT, lenScaleFrom } from './raceLengths.js';   (re-exports arcT for compat)
GovernorDiagHUD.jsx:17    import { lenScaleFrom } from '../../modules/raceLengths.js';   ← the HUD readout
index.jsx:69              import { meanDrawnBodyLen } from '../../modules/raceLengths.js';   ← browser engine
gap-metrics.mjs:30        import { arcT } from '.../client/src/modules/raceLengths.js';   ← observer
sim-fairness.mjs:107      import { lenScaleFrom, arcLengths, meanDrawnBodyLen } from '.../raceLengths.js';   ← the sim
```

`meanBodyLen` is now computed by the **same** `meanDrawnBodyLen(racers)` on both sides (mean of
`drawnBodyLengthPx>0` over the field) — parity is structural, not coincidental. **HUD numbers are unchanged**
(bit-identical unit test + the extraction is the same formula; the HUD's `lenScale`/`arcLen` call sites are
untouched apart from sourcing `lenScale` from the shared fn).

**Per-track racer-length scale (lenScale = pathLengthPx / meanBodyLen), from the run:**

| Track | meanBody px | pathLength px | lenScale (lengths / lap-fraction) |
|---|---|---|---|
| searound (closed) | 31.65 | 5147 | 162.6 |
| dirt-oval (closed) | 38.32 | 6542 | 170.7 |
| mountainstreet (open) | 25.74 | 15665 | 608.5 |
| luger-hill (open) | 48.64 | 10348 | 212.7 |

---

## 3. Last night's twelve cells, re-analysed IN LENGTHS — the five answers

**Context** (band-reach + start-row, unchanged — matches last night to the decimal):

| Track | band A/B/C | startRowUnfair | comebacks(prov Y=8/Z=3) A/B/C | deadFlag/100 (prov 5L) A/B/C |
|---|---|---|---|---|
| searound (closed) | 78.0/82.2/82.5 | T/T/T | 78/172/208 | 19/35/30 |
| dirt-oval (closed) | 78.6/83.9/81.9 | T/T/T | 64/153/258 | 22/29/25 |
| mountainstreet (open) | 80.9/84.3/83.0 | F/F/F | 86/175/204 | 17/15/24 |
| luger-hill (open) | 78.0/83.0/82.0 | T/T/T | 44/123/104 | 5/18/19 |

**1. How many RACER LENGTHS behind is the field at three-quarters distance?** (field median, p50)

| Track | A | B | C |
|---|---|---|---|
| searound | 11.1 | 12.8 | 11.8 |
| dirt-oval | 11.6 | 12.4 | 9.9 |
| mountainstreet | 11.5 | 12.7 | 11.5 |
| luger-hill | 7.9 | 8.7 | 6.9 |

The field median sits **~7–13 racer lengths** behind the leader at 0.75 — **2–4× the owner's 3-length rule**,
on every track and every arm. v4-ON pushes it further out on the closed tracks.

**2. Does the leader (or lead GROUP) run away?** leader→P2 at the line is modest at the median (1.5–3.5 L)
but the **frontmost front gap** — the metric that sees a detached *group* — is much larger:

| Track | frontmost-gap @line p50 [n ahead] A/B/C | final-third frac time > 3 lengths (p50) A/B/C |
|---|---|---|
| searound | 5.1[1.5] / 5.5[2] / 4.6[1] | 0.57 / **0.81** / 0.72 |
| dirt-oval | 6.9[2] / 5.2[2] / 3.9[2] | 0.71 / 0.75 / 0.62 |
| mountainstreet | 4.9[2] / 4.8[2] / 4.1[2] | 0.60 / 0.73 / 0.71 |
| luger-hill | 4.0[1.5] / 3.3[2] / 3.1[1] | 0.34 / 0.42 / 0.36 |

**Yes.** A gap wider than 3 lengths sits at the front for **34 %–81 % of the final third**, typically with
**1–2 racers ahead of it** (a lone leader or a 2-car break). `leaderGapToP2` alone hides this: at 0.5 progress
its median is ~0.1–2.5 L while the frontmost gap is already 2–5 L — the break is *behind P2*, exactly the
case the addendum was written for.

**3. Is v4-ON better or worse than v4-OFF — in LENGTH space?** **Worse for cohesion.** v4-ON strings the
field out **earlier and wider**: field-median lengths-behind at **0.25** roughly *doubles* (searound
5.5 → 10.8 L, dirt 4.0 → 8.6 L, mtn 3.3 → 6.4 L, luger 3.7 → 5.9 L), and the frontmost gap at 0.25 grows
(searound 0.9 → 2.2 L). Closed-track dead-flags climb (searound 19 → 35, luger 5 → 18). In rank space v4-ON
looked strictly better (+3–5 pts band-reach); in length space it **opens the front gaps the owner's rule is
about.** (It does raise the lengths-comeback count — more racers fall 8+ L back *and* close to ≤3 L — but
that is the same wider spread seen from the other side.)

**4. Do the owner's settings (C) make it worse than defaults (B)?** **On the dead/detach signals, mostly
yes.** C raises win-concentration sharply (nativeWinP luger 0.41 → **0.087**, searound 0.51 → **0.17**,
dirt 0.90 → **0.35**), raises mountainstreet dead-flags (15 → 24), and its closed-track frontmost gap stays
3–5 L. The picture is mixed on comebacks (C > B on the closed tracks, C < B on luger), but the settings the
owner *watched* concentrate wins and hold the front detached — consistent with a dead-looking race.

**5. A concrete race that is FAIR and visibly dead — in lengths?** **Yes.** Restricting to the only cell
class that passes the strict fairness bar (band ≥70 % AND start-row fair → mountainstreet):

- **Arm B · mountainstreet · race #26** — band **84.3 % (FAIR)**, deadFrac 88 %, leader **17.9 racer lengths**
  clear at the line (1 ahead).
- Arm C · mountainstreet · race #46 — band 83.0 % (FAIR), deadFrac 86 %, leader **10.1 lengths** clear.
- Arm A · mountainstreet · race #17 — band 80.9 % (FAIR), deadFrac 84 %, leader **7.6 lengths** clear.

A field the fairness gate calls clean, with the winner **6–18 car-lengths** up the road.

---

## 4. Lengths-per-second per track — what the old seconds actually meant

Measured leader→P2 (lengths) ÷ (seconds), pooled over arms & checkpoints. **This is the bridge, from data —
the "2 s ≈ a few lengths" guess in the old comment is deleted.**

| Track | lengths / second (p50) | 1 second = … | so the old "3 s gap" was … |
|---|---|---|---|
| searound (closed) | 3.70 | 3.7 lengths | ~11 lengths |
| dirt-oval (closed) | 3.08 | 3.1 lengths | ~9 lengths |
| mountainstreet (open) | 5.68 | 5.7 lengths | ~17 lengths |
| luger-hill (open) | 3.34 | 3.3 lengths | ~10 lengths |

A second was worth **~1.8× more lengths on mountainstreet than on dirt-oval** — which is exactly why seconds
mis-ranked the tracks. **A single second-threshold could never have been fair across tracks.**

**The concrete anchor:** Arm C · mountainstreet · race #26 — the "fair AND dead" race whose leader was
**3.06 s clear at the line**. In racer lengths that is **≈ 17 lengths** (spatial leader→P2 at the winner's
crossing = **16.85 lengths**; via the track's 5.68 lengths/s, 3.06 s ≈ 17.4 lengths). **Seventeen car-lengths
of empty track** — against the owner's ceiling of three. That is the number that agrees with his eyes.

---

## 5. Frontmost-gap (the limiter's raw material) — per arm, per track

The addendum's ask: the frontmost consecutive gap and how many sit ahead of it, per sample point, plus the
final-third distribution and the fraction of time it exceeds 3 lengths. **Emitted, RAW, not a pass/fail.**

- **Per sample point (0.25 / 0.50 / 0.75 / 0.90 / line):** `frontmostGapLen` + `frontmostGapNAhead` are in
  every checkpoint and the line snapshot of each `gm-*.json`; the full front-gap array (`frontGaps`, P1→P2,
  P2→P3, …) is emitted too, so any threshold/definition is recoverable.
- **Final-third distribution + fraction > 3 lengths** (per race → percentiles across 100 races):

| Track·Arm | frontmost-gap final-third p50 (p90) | frac time > 3 lengths (p50) | median racers ahead @line |
|---|---|---|---|
| searound A/B/C | 3.3/4.9/3.8 (5.7/7.3/6.6) | 0.57 / 0.81 / 0.72 | 1.5 / 2 / 1 |
| dirt-oval A/B/C | 4.4/4.4/3.6 (7.3/6.8/6.0) | 0.71 / 0.75 / 0.62 | 2 / 2 / 2 |
| mountainstreet A/B/C | 3.6/4.0/3.6 (6.0/5.8/6.9) | 0.60 / 0.73 / 0.71 | 2 / 2 / 2 |
| luger-hill A/B/C | 2.5/2.8/2.6 (4.2/4.3/3.8) | 0.34 / 0.42 / 0.36 | 1.5 / 2 / 1 |

**Read for the limiter:** the front gap exceeds 3 lengths for a *majority* of the final third on the closed
tracks and mountainstreet (≈0.6–0.8), less on luger (≈0.35). The detachment is usually **1–2 cars** off the
front — a lone leader or a two-car break, not a big group. **The owner's rule is violated most of the run-in
on most tracks today.** (Raw — his to threshold.)

---

## 6. Proposed X / Y / Z in lengths — **AWAITING THE OWNER'S CALIBRATION**

The owner has already stated the front-gap ceiling (**3 lengths**); the rest are proposals from the
distributions, provisional.

| Knob | Proposed | From the data | Note |
|---|---|---|---|
| **front-gap ceiling** | **3 lengths** (owner's) | frontmost gap > 3 L for 34–81 % of the final third today | The owner's stated rule; I emit `fracOver3` directly, never as a gate |
| **X** in-contention | **3 lengths** | at X=3, inContention p50 is only 0.04–0.16 — almost nobody is within 3 L late | Aligns with the owner's ceiling; current races rarely satisfy it |
| **Y** comeback depth | **8 lengths** | per-racer maxBehind p50 ≈ 10–17 L; 8 L selects a real deficit | lower Y counts shallower recoveries |
| **Z** comeback finish | **3 lengths** | finalBehind p10 ≈ 3–6 L; 3 L ≈ a close finish | matches the "within 3 lengths" feel |
| **deadGap** | **3–5 lengths** | 5 L used for the provisional flag; 3 L = the owner's ceiling | I emit fractions at both 3 L and 5 L |

---

## 7. What the raw traces could not support

- **Lengths could NOT be back-computed from last night's frozen data** — only seconds-derived aggregates were
  stored, no positions. Hence the deterministic re-run (§1). Named, not hidden.
- **The `frontmostGap` "front" is capped at the front 10 racers** (`GM_FRONT_K=10`) for the scalar; a lead
  group larger than 10 in a 40-field would be under-counted. The full `frontGaps[10]` array is emitted so this
  is recoverable; no silent truncation.
- **The at-the-line lengths snapshot is taken at the leader-finish instant** (a well-defined spatial moment);
  a finisher's own gap at its *own* crossing is ~0, so the finish-time gap is kept only as the seconds column.
- **`--strip-metrics` "held-overtake at N∈{1,2,3}s" is still not built** (unverified overnight = risk of a
  wrong number). Named, not faked.

---

## 8. Bottom line

The owner reasons in car-lengths; now the sim does too, through the **same conversion his HUD uses**. In
lengths the verdict is blunt: **the field runs 7–13 car-lengths behind at three-quarters, and a gap wider
than the owner's 3-length ceiling sits at the front for most of the run-in** — worse under v4-ON, worse again
at his Arm-C settings. The "fair AND dead" race is real and now legible: **band-reach 84 %, and the winner
17 car-lengths clear.** The frontmost-gap curve the limiter will need is emitted raw, per sample point, per
track. **Nothing here is a decision — X/Y/Z await your eye.**
