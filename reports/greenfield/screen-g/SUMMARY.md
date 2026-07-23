# SCREEN — gap-reroll G refinement for escape latency

**Owner eye finding:** the racing is good post-reset, but a racer often escapes to a sizeable lead and
is then **visibly braked** so the field can catch up. Diagnosis: gap-reroll correction *latency* —
between scheduled rolls the lead grows, so the correction arrives late and large. Hypothesis: a smaller
G caps escape depth early, making each correction small and invisible.

**Protocol:** SCREEN tier. Arms G=0.50 vs G=0.75 (the decisive pairing), symmetric s=1.0, carousel OFF,
shipped defaults otherwise. Tracks searound + city-circuit, field 40 closed / 60 open, **N=25 per arm
per track (50 races per arm)**, identical paired seeds. **Wall-clock 12.4 min.**
**EARLY STOP applied — G=0.60 was NOT run** (see §4).

New read-only instrumentation (`--escape-latency`), fingerprint-verified `efd0f4ad8eca08fa` unchanged:
- **escapeDepth** — max P1→P2 gap (lengths) reached **before the first leader down-tilt fires**.
- **downTiltProfile** — leader down-tilts per race, and per event the applied `frac`
  (= `min(1, strength·(gap−G))`, the fraction-of-the-way-to-the-band-edge actually applied) and the
  absolute spreadFactor `delta`.

---

## The numbers

### Escape latency

| G | depth med | depth p90 | depth max | capped% | tilts/race | frac med | saturated% | delta med | n events |
|---|---|---|---|---|---|---|---|---|---|
| **0.50** | **1.958** | **3.687** | **4.831** | 98.0% | 2.32 | 0.858 | 39.7% | 0.077 | 116 |
| 0.75 | 2.325 | 4.044 | 6.918 | 96.0% | 1.78 | 0.740 | 41.6% | 0.076 | 89 |

### Standing set — screening numbers, **no gate claims at this N**

| G | late lead chg | distinct | dead | duo | front @line | runaway | parade | band-reach |
|---|---|---|---|---|---|---|---|---|
| 0.50 | 1.86 | 2.74 | 28.0% | 8.0% | **3.72** | 12.0% | 0.0% | 76.9% |
| 0.75 | 1.80 | 2.74 | 22.0% | 4.0% | **4.96** | 6.0% | 2.0% | 74.5% |

**Raw counts behind those rates (50 races per arm):** runaway **6 vs 3**, dead **14 vs 11**,
duo **4 vs 2**, parade **0 vs 1**. These are small-count differences and are **not conclusive**.

---

## Answers

### 1. Does smaller G cap escapeDepth?

**Yes, but modestly — and the gain is concentrated in the tail, which is the part the eye notices.**

- median **2.325 → 1.958 L** (−0.37 L, −16%)
- p90 **4.044 → 3.687 L** (−0.36 L, −9%)
- **max 6.918 → 4.831 L (−2.09 L, −30%)**

So the worst escapes get materially shorter, while the typical escape barely moves. The single 6.9-length
runaway-then-brake at G=0.75 is exactly the event the owner describes, and G=0.50 does remove that tail.
These are the most trustworthy figures here: continuous measures over 50 races per arm.

### 2. Does it pay with invasiveness — more tilts, and are individual tilts smaller?

**This is where the hypothesis fails. More corrections, and each one is HARDER, not gentler.**

- tilts per race **1.78 → 2.32 (+30%)**
- **`frac` median 0.740 → 0.858 — the corrections got harder**, not softer
- saturated (`frac`=1.0) share essentially unchanged: 41.6% → 39.7%
- `delta` median unchanged: 0.076 → 0.077

The hoped-for outcome was *many gentle nudges*. The measured outcome is **more frequent brakes of the
same (high) hardness** — the bad branch. The mechanism explains it: `frac = min(1, strength·(gap−G))`
saturates once the gap exceeds `G+1`, so **lowering G lowers the saturation point too** (1.75 L at
G=0.75, 1.50 L at G=0.50). Catching escapes earlier does not make the correction gentler; it just
triggers it sooner and more often. **At `strength=1.0`, G cannot buy invisibility** — roughly 40% of all
leader corrections are full-band-edge slams in *both* arms.

### 3. Any regression?

**One solid, several suggestive but under-powered:**

- **Solid: front group at the line shrinks, 4.96 → 3.72 racers (−25%).** A continuous mean over 50
  races and the largest effect in the standing set — G=0.50 finishes with a thinner front group.
- **Suggestive only:** runaway 6% → 12% (6 vs 3 races), dead 22% → 28% (14 vs 11), duo 4% → 8% (4 vs 2).
  All point the same direction — worse — but at these counts none is conclusive on its own. That they
  *all* lean the same way, and align with the front-group result, is what makes the pattern credible.
- Neutral/better for G=0.50: parade 2% → 0% (1 vs 0 races), late lead changes 1.80 → 1.86,
  distinct leaders identical (2.74), band-reach 74.5% → 76.9% (**no gate claim at N=25**).
- Per track, the runaway lean is concentrated on **searound** (12% → 20%), the track that was already
  the runaway-prone one; city-circuit stays clean (0% → 4%).

### 4. Recommendation

**The sim's recommendation is to send G=0.75 to CONFIRM, not G=0.50.** G=0.50 buys a −30% cut in the
worst-case escape depth and pays for it with 30% more corrections that are individually *harder*, a
25% thinner front group at the line, and a consistent (if under-powered) lean toward more runaway, more
dead finales and more duo escapes.

**Early stop:** the ordering on both primary questions is unambiguous and monotonic — smaller G means
more frequent, harder corrections and a thinner front group — so **G=0.60 was not run**, per protocol.
It remains the obvious untested compromise if the eye verdict conflicts (see below).

**The owner's eye outranks this on naturalness, and that matters here.** This sweep measures *how deep
the escape gets* and *how hard the brake is*; it does **not** measure whether the brake is visible. If
G=0.5 looks materially more natural in the browser, that is evidence this instrumentation cannot
produce, and it should win on its own terms. In that case the honest options are:

1. **Run G=0.60 as the compromise** (≈8 min at this tier) before committing to either.
2. **Attack the real culprit instead of G: `gapRerollStrength`.** The invisibility problem is
   saturation — ~40% of leader corrections are full-band-edge slams at `strength=1.0`, in both arms.
   Lowering `strength` reduces `frac` directly and is the only knob that makes an individual correction
   *gentler*; G only changes *when* it fires. **This is the strongest lead this sweep produced, and it
   was not on the original axis list.**

**Ships stay held** pending the owner's eye verdict.

Data: `screen-arms.csv` (pooled), `screen-arm-track.csv` (per arm × track), `screen-per-seed.csv` (all
100 races), `meta.json`.
