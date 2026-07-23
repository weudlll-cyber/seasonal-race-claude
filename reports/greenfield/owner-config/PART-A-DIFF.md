# PART A — Owner config vs shipped defaults

Source of truth: the owner's exported `world.json` (schemaVersion 2), committed at `reports/greenfield/owner-config/owner-world.json`. Shipped values are imported directly from `client/src/modules/storage/defaults.js` — no hand-copied table, so this diff cannot drift from the code.

**4 keys DRIFT from the shipped defaults.** Everything else matches or is absent (absent ⇒ the loader's `{...DEFAULT, ...stored}` merge supplies the default).

| section | key | owner | shipped | classification |
|---|---|---|---|---|
| raceDynamicsConfig | `b2AttackFinalRank` | **10** | 7 | NEAR-INERT (conditional on b2AttackBandArrival) |
| raceDynamicsConfig | `gapRerollDevMarker` | **true** | false | INERT (diagnostic only) |
| raceDynamicsConfig | `gapRerollThresholdLengths` | **0.75** | 1.5 | BEHAVIOUR-CHANGING |
| raceDynamicsConfig | `packReleaseEnabled` | **true** | false | BEHAVIOUR-CHANGING |

## What each drift does

- **`b2AttackFinalRank`** (10 vs 7) — *NEAR-INERT (conditional on b2AttackBandArrival)*. Where a B2 attack hero would be parked after its attack (10 vs shipped 7). The owner also runs b2AttackBandArrival=TRUE (the shipped default), and under band-arrival the attacker is RELEASED the moment it re-enters B2 regardless of this value — defaults.js:373-375 states it verbatim: "Under band-arrival b2AttackFinalRank only shapes the fall slope (release triggers at B2 re-entry regardless)." So it can bend the descent slope but cannot change where the hero ends up. Ranked last.
- **`gapRerollDevMarker`** (true vs false) — *INERT (diagnostic only)*. Only gates a visual dev marker when a gap-biased sample differs (RaceScreen index.jsx:1164) and a HUD line; it never feeds a speed term.
- **`gapRerollThresholdLengths`** (0.75 vs 1.5) — *BEHAVIOUR-CHANGING*. The G under test (0.75 vs shipped 1.5). Intended: tighter field. This is the setting the owner deliberately changed.
- **`packReleaseEnabled`** (true vs false) — *BEHAVIOUR-CHANGING*. Turns the shelved pack-release ON. It relaxes pack band-strictness so the field is released from its band corridor; the measured failure mode was endgame leakage (92% of band leaks after progress 0.90) — i.e. exactly a stretched field in the finale.

## Ranked by plausible impact on finale liveliness / field spread

1. **`packReleaseEnabled: true`** — the prime suspect, CONFIRMED as a real drift. It is the shelved pack-only strictness release: a pack racer inside its band has its servo strictness dropped to **0** (no rank pinning, free natural speed) until it drifts `packReSteerThreshold` ranks past the band edge. It was shelved default-OFF after the measured endgame-runway failure, and "field roams free late" is precisely the reported symptom (stretched field, dead finale). Part B isolates it.
2. **`gapRerollThresholdLengths: 0.75`** — the owner's own deliberate change, and the thing under test. Intended to tighten the field.
3. **`b2AttackFinalRank: 10`** — near-inert under band-arrival (see above); ranked last on impact.
4. **`gapRerollDevMarker: true`** — inert, diagnostic only.

## Planner suspicions REFUTED by the diff

These were flagged as possible drift but are the **shipped defaults** — the owner matches them exactly, so they cannot explain anything:

- `reRollVariationPercent` = 75 — defaults.js:258 ships 75 — the owner matches it exactly.
- `choreoPackBandStrictness` = 0.5 — defaults.js:308 ships 0.5 — the owner matches it exactly.
- `b2AttackBandArrival` = true — defaults.js:385 ships true — the owner matches it (and it is what makes b2AttackFinalRank near-inert).
- `choreoReleaseProgress` = 0.97 — defaults.js:317 ships 0.97 — the owner matches it.
- `carouselEnabled` = false — defaults.js ships false — the carousel is OFF in the owner's game, as recommended.

Full key-by-key table (including every SHIPPED key): `owner-config-diff.csv`.
