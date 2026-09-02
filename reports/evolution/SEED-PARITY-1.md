# SEED-PARITY-1 — the seed field means the same thing; the RACE does not, and five of the seven do not exist in the browser

> **MEASURE ONLY. No sweep, no fix, no behaviour change.** Report and stop.

**Do not hand him seeds 34, 38, 210 or 247 for river-run.** Those races do not exist in the browser.
The number is not the problem — **the harness ran the field NAMELESS, and a racer's name is a physics
input.**

---

## 1. THE SEED NUMBER: the two paths agree, exactly

Traced end to end rather than assumed:

| | browser (Quick Test) | harness |
|---|---|---|
| what the field becomes | `racePlanSeed: resolveQuickTestSeed(quickTestSeed).seed` — `SetupScreen.jsx:558` | `racePlanSeed: identity.raceSeed` — `raceDriver.mjs` `buildRace` |
| where it goes | `createRaceFromIdentity({ … racePlanSeed … })` | the **same** function, same field |
| camera seed | `cameraSeedForRace(racePlanSeed)` — `RaceScreen/index.jsx:610` | `cameraSeedForRace(partial.raceSeed)` — `raceDriver.mjs:100` |

`resolveQuickTestSeed` passes a typed number through unchanged (it only strips non-digits and clamps
to ≥ 1). **A typed 117 is `racePlanSeed = 117` in both paths, and both derive the camera seed from it
by the same function.** That half is sound, and HARNESS-CAMERA-SEED-2 is why — the harness was
deliberately changed to follow the browser's derivation.

**So the seed field is not where they diverge.**

---

## 2. WHERE THEY DIVERGE: the roster, and it is not cosmetic

`raceDriver.mjs`'s own comment says it plainly, and it has said so since FINISH-PAIR-1:

> *A racer's NAME is an engine input — `stablePairBit` in `raceBehavior.js` hashes `r.name` and falls
> back to `r.index` when there is none, so a NAMELESS field runs a DIFFERENT race from the browser at
> the same seed. … Default OFF, so no existing caller's race changes.*

**`resolveIdentity` defaults `roster: null`.** Every probe in this arc took that default — the
identity line printed `roster=none (index strings)` on every run. **Quick Test fills real names**
(`SetupScreen.jsx:507`, `resolveNameSet(quickTestNameSet)`), so the browser races the named field.

### Measured: the same seven seeds, both rosters, whole race scanned

| seed | nameless (what the seven were measured with) | **Quick-Test roster (what the browser runs)** |
|---|---|---|
| 34 | 1 step > 1000 px — 4873.0 @f1415 | **0** |
| 38 | 1 — 4902.8 @f1476 | **0** |
| 87 | 1 — 1593.7 @f1464 | **0** |
| 117 | 1 — 5136.6 @f1479 | **1 — 5311.0 @f1482** |
| 154 | 1 — 4718.4 @f1478 | **1 — 3677.5 @f1473** |
| 210 | 1 — 4672.9 @f1478 | **0** |
| 247 | 1 — 2333.5 @f1469 | **0** |

**Five of the seven vanish.** The two that survive do so at *different frames and different
magnitudes* — 117 at f1482 rather than f1479, 154 at 3677.5 px rather than 4718.4 — so even those are
not the races that were measured. The frame counts differ too (seed 34: 1,559 adjacent LEADER_ZOOM
steps nameless against 1,919 named), which is the plainest sign that these are different races and
not the same race described twice.

**That is the more important finding, and it is the one the brief anticipated: the instrument and the
product disagree about what a seed produces.** Not about the number — about the race.

---

## 3. WHAT HE CAN ACTUALLY DO

**For seeds 34, 38, 87, 210 and 247 on river-run: nothing.** Those races exist only in the harness's
nameless configuration, and no Quick-Test seed reproduces them, because the browser has no way to run
a nameless field. There is no derivable substitute — the nameless race is not *a* seed, it is a
different physics input to every seed.

**For seeds 117 and 154 there is something worth watching**, though it is a different race from the
one measured: at the Quick-Test roster each still contains one whole-screen offset step, 117 at
frame 1482 and 154 at frame 1473. If he wants to see the phenomenon at all, those are the two.

### The setup beside the seed, for river-run

| input | value | can he set it? |
|---|---|---|
| track | **river-run** | yes — track picker |
| seed | **117** or **154** | yes — Quick-Test seed field |
| racer count | **20** | yes — Quick-Test count |
| racer type | **duck** | yes — Quick-Test racer selector; it is also river-run's own default, so leaving it alone gives the same thing |
| name set | **the default set** (`current`) | yes — Quick-Test name-set selector; the harness roster was its first 20 names |
| action stage | **the default dynamics** — the harness applies no stage | yes — but it comes from his saved race defaults, not the Quick-Test panel |
| laps | 1 | **no** — Quick Test derives it from the track (`trackDefaultLaps`); it happens to match |
| duration | 60 s | **no** — Quick Test derives it (`trackDefaultSeconds`); it happens to match |
| race plan | enabled | **no** — gated on `realizedDurationSec >= racePlanMinDurationSec`; at 60 s it is on, matching the harness |
| camera seed | derived from the race seed | **no**, and it needs no setting — both paths derive it identically |

**Two of those are matches by luck rather than by construction.** river-run's own defaults give 1 lap
and 60 s, which is exactly what the harness hard-codes for an open track (`laps: shape.isOpen ? 1 : 2`,
`seconds: 60`). **On a track whose defaults differ, they would not match and he could not make them
match from the setup screen.**

**One thing that will silently break it:** if he has any manually-added players in the list, Quick
Test builds the field as `[...players, ...fillNames]`, so the names — and therefore the race — shift.
The roster must be the first 20 of the default set, with no players of his own added.

---

## 4. WHAT THIS DOES AND DOES NOT PUT IN DOUBT

**It does not invalidate this arc's A/B conclusions.** Every comparison — the headcount repair, the
aim-room floor, the combined gate — ran *both arms* on the same nameless harness, so the differences
between arms are real differences. That is what those pieces claimed and it still holds.

**It does mean the absolute figures are the nameless field's, not the product's.** Promise-kept rates,
clip counts, the seven pans and the widening shares were all measured on races the browser does not
produce. How close those rates are to the product's is **not established here** and would need the
same sweeps re-run with a roster — which the brief excludes, and which is not this piece's to decide.

**The river-run pan finding specifically is weaker than it was recorded.** AIM-ROOM-SHIP-1 and
AIM-ROOM-COMBINED-1 report seven such events against master's zero. Both arms were nameless, so the
*comparison* stands — but five of the seven named races have no such event, so the count is not a
statement about what he would see. **Whether master-with-roster also has zero was not measured**, so
even the direction is not re-established here; that is exactly the sweep this piece was told not to
run.

---

## Limits

**One track, seven seeds, one racer count.** The roster comparison was run on river-run at N=20 only.

**The roster was reconstructed, not captured from his browser.** It is `resolveNameSet('current')`'s
first 20 names, which is what Quick Test fills when no players have been added by hand. If his saved
name set or player list differs, his race differs again — and that is a third seeding input neither
the harness nor this report can see from here.

**Nothing was changed.** The only edit is a `--roster=` option added to the anatomy probe so the two
configurations can be compared at all; no default moved, and the probe's previous behaviour is what
`--roster=none` still does.
