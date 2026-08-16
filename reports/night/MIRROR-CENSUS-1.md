# MIRROR-CENSUS-1 — the mirror census finished, and one "unfireable" that was not

**Branch:** `fix/mirror-census-1`, off master `67c89bc6`. **No default value changed. No behaviour
changed.** WORLD, WORLD-OFF, CAMERA and RENDER all measured either side and byte-identical.

---

## THE RESULT

```
disagree     29  ->  21      (8 sites converted)
byRef       358  -> 366
new           0  ->   0
stale exceptions  0          (the guard checks this direction too)
```

| instrument | before | after |
| --- | --- | --- |
| WORLD | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` |
| WORLD-OFF | `854018ee5d3d83e1` | `854018ee5d3d83e1` |
| CAMERA | `d9f45a4aea0e5778` | `d9f45a4aea0e5778` |
| RENDER | `1274c7e8444238e3` | `1274c7e8444238e3` |

`npm run verify` on the branch: **PASS 16 · FAIL 0 · SKIP 8**, 241 s. Client suite 4091 tests in
208 files, all green. `eslint` clean on both changed source files.

**Every one of those four values was also measured on master first**, so "unchanged" is a comparison
of two measurements taken tonight rather than a comparison against a record that might itself have
drifted. Both baselines reproduced `docs/fingerprints.json` exactly.

---

## WHAT WAS CONVERTED, AND ON WHAT RULE

The 29 split cleanly in two, and only one half is hygiene.

**STALE COPIES — a literal holding a value the default no longer holds.** There is no reading under
which that is intentional, so there was nothing to decide. Eight sites:

| file | key | literal | default |
| --- | --- | --- | --- |
| `raceCore.js` | `bandBiasR` | 0.8 | 0.6 |
| `raceCore.js` | `bandBiasGain` | 0.06 | 0.1 |
| `raceCore.js` | `pulkLeadRotationDropDepthLengths` | 2 | 8 |
| `raceCore.js` | `rowBonusPulk` | 1 | 0 |
| `raceCore.js` | `b2AttackProgress` | `{0.4, 0.7}` | same, by copy |
| `racePlanner.js` | `bandBiasR` | 0.8 | 0.6 |
| `racePlanner.js` | `bandBiasGain` | 0.06 | 0.1 |
| `racePlanner.js` | `gapRerollStrength` | 0.5 | 1 |
| `racePlanner.js` | `b2AttackFinalRank` | 10 | 7 |
| `racePlanner.js` | `b2AttackProgress` | `{0.4, 0.7}` | same, by copy |

(Ten rows, eight sites the guard counts: the two `b2AttackProgress` entries are invisible to it —
see below.)

**OFF-BY-OMISSION SHAPES — deliberately left, and they are 21 of the 29.** Every `?? false` and
`?? 0` says *absent means OFF*. That is a convention, not a stale value, and changing one decides
what a partial caller should get. No partial caller exists, so there is no evidence either way and
the decision is the owner's. L207's exception names exactly this shape. **In doubt, listed.**

`heroCurveGenerator.js`'s two entries are left for a second, stronger reason: that module's header
states its literals are the **direct/test-call default set, deliberately distinct from the shipped
default**, and `GENERATOR_CONFIG` carries the same pair. MIRRORS-BY-REFERENCE overrode two written
decisions of that kind and had to say so in its report; this block left the third alone rather than
make that three.

---

## THE FINDING THAT MATTERS MORE THAN THE EIGHT

**`racePlanner.js` / `gapRerollStrength` was NOT unfireable, and FALLBACK-42-TRIAGE said it was.**

The triage's reason read: *"unreachable: raceCore sets gapRerollStrength in the plan config it
passes."* True of raceCore, and beside the point — **the sim has its own `createRacePlan` call**, and
`raceCore.js` says so in a comment four lines above the pair this block also converted. That call
passes:

```js
gapRerollStrength: GAP_REROLL_STRENGTH ?? undefined,
```

and `GAP_REROLL_STRENGTH` is `null` on **any arm where the gap-cap feature is off** — which is
exactly what `--gapRerollEnabled=false` produces. So on the WORLD-OFF arm the fallback **ran**, on
every race of every ship that has ever measured that invariant, and resolved to 0.5 against a shipped
1.

It changed nothing, and the reason it changed nothing is worth writing down because it is not the
reason the triage gave: `plan._gapRerollThresholdLengths` is `null` on that arm, so
`computeGapBiasedTarget` returns `rawSample` before it ever reads the strength. The value was set and
never read.

**That is the third time an unreachability claim in this area has turned out to be false.** It is the
whole argument for the standing rule that the proof is a measurement and not an argument — and note
that the measurement is what closed it: WORLD-OFF is byte-identical across a line whose value
genuinely moved from 0.5 to 1.

---

## A HOLE IN THE GUARD, REPORTED RATHER THAN PATCHED

`check-fallback-agreement`'s `NULLISH` pattern matches a scalar literal or a `SCREAMING_CASE`
constant. **An object-literal fallback is a mirror it has never counted.** Two existed —
`b2AttackProgress ?? { start: 0.4, end: 0.7 }` in `raceCore.js` and `racePlanner.js`, both copying
`DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackProgress` exactly. They agreed, so nothing was wrong yet; they
were a drift waiting to happen, of precisely the class the guard exists to prevent.

Both are converted (to a **spread** of the default, so no caller can mutate the shared object). The
guard is **not** extended, and the blind list is **not** amended here: widening the pattern is a
guard change that has to be proved in both directions, and this block's budget was the census. It is
on tomorrow's list.

---

## REACHABILITY, ESTABLISHED RATHER THAN INHERITED

Per instruction, reachability was re-derived from source rather than taken from the triage:

- `resolveFromDefaults` (`storage/configDiff.js`) **iterates the DEFAULT keys**, so a loader-resolved
  config cannot be missing one. Both `loadRaceDynamicsConfig` and `loadRaceBehaviorConfig` return
  either that object or a full `{...DEFAULT}`.
- `RaceScreen/index.jsx:464` passes `loadRaceDynamicsConfig()` straight into
  `createRaceFromIdentity`. It is the only shipped race path.
- `sim-fairness.mjs`'s `mergeCfg` spreads over the shipped defaults — but its **`createRacePlan` call
  is hand-written and does not**, which is where the one live fallback came from.
- Every one of the 29 keys resolves to **exactly one** owning defaults store. There is no cross-store
  pairing, so no `default=` figure the guard printed was pairing a key with the wrong home.

---

## SOURCE HYGIENE

**3 files, +44 −61.** `raceCore.js` and `racePlanner.js` are the conversions; the deletions are
concentrated in `scripts/check-fallback-agreement.mjs`, where the eight exception entries are removed
and TIER 3 now carries the record of why it emptied and what deliberately stays.

### Noticed but left

- **`durationModel.js:normalSpeedPxPerSec` is still the 1 UNRESOLVED.** Unchanged, and correctly
  reported rather than silently passed.
- **The count 29 is SITES; the exception list is (file, key) PAIRS, of which there were 25.** Four
  keys are read at two sites each. Neither number is wrong; they answer different questions, and
  nothing says so at either end.
