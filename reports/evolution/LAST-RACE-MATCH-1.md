# LAST-RACE-MATCH-1 — he raced the guard's track, field and seed, and it is still a DIFFERENT race

**Branch** `night/2026-09-12b` · **READ-ONLY ON HIS STORE — nothing created, nothing deleted, nothing
merged, nothing minted, no repair.** Verdict is **(b)**, so no frames were produced and nothing was
re-run.

---

## ★★ THE VERDICT IN ONE LINE

> **(b) DIFFERENT RACE.** He watched `dirt-oval`, **40 racers, seed 9** — the guard's three decisive
> fields, all three matching — **on a build from this branch, twelve minutes after the services went
> up.** But he raced it at the **`wild`** action stage against the guard's shipped **`quiet`**, and
> under **his own stored camera settings, 15 keys different from the defaults the guard grades.**
> ★ **The physics differ and the shot differs, so the frames the guard flags are not the frames he saw.**

---

## 1 · WHAT HE ACTUALLY WATCHED

The most recent entry in the stored race history, read straight from
`server/data/races.sqlite` (opened `readonly`):

| field | value |
|---|---|
| race id | ★ **`STNJ25`** (`client_race_id` `mu0whg9uyn58`) |
| timestamp | ★ **2026-09-14 07:07:22.146 Z** |
| ★ **build serving when created** | ★ **`52be3ec4`** — **the tip of `night/2026-09-12b`**, the exact bundle put on 4173 |
| track | ★ **`dirt-oval`** (geometry `custom-a12a3162-aa48-4e14-ba61-8250d4877340`) |
| field size | ★ **40** (40 result rows, 40-name roster) |
| seed | ★ **9** |
| racer type | `horse` — dirt-oval's own `defaultRacerTypeId` |
| action stage | ★ **`wild`** |
| laps | 2 · elapsed **115 s** · winners `Blitz, Thunder, Titan` |
| `worldConfigs` | 7 keys: `autoScaleConfig, baseSpeedConfig, cameraConfig, frameTimingConfig, raceBehaviorConfig, raceDynamicsConfig, rowLayoutConfig` |

★ **THE DECISION RULE'S "TOO OLD" BRANCH DOES NOT APPLY.** The services went onto this branch at
**≈06:52 Z**; this race finished at **07:07 Z** and its record carries `build_id 52be3ec4`, which is
the tip that was being served. **He did watch a race from this build**, so the comparison below is
the real question rather than a formality.

---

## 2 · FIELD BY FIELD, AGAINST THE GUARD'S FAILING CASE

The guard's case is `check-runin-frame`'s requirement-5 block: `dirt-oval`, seed 9, 40 racers, the
track's own default racer, the shipped world (`buildRace(geo, identity, LINE_CFG)` takes
`DEFAULT_CONFIG_WORLD`) and the shipped `DEFAULT_CAMERA_CONFIG`.

| field | guard's failing case | ★ his `STNJ25` | |
|---|---|---|---|
| **track** | `dirt-oval` | `dirt-oval` | ✅ **same** |
| **field size** | **40** | **40** | ✅ **same** |
| **seed** | **9** | **9** | ✅ **same** |
| racer type | `horse` (track default) | `horse` | ✅ same |
| laps | 2 | 2 | ✅ same |
| racer NAMES assigned | `Turbo…` ×40 | `Turbo…` ×40 | ✅ **same** — see note |
| `raceBehaviorConfig` · `rowLayoutConfig` · `baseSpeedConfig` · `autoScaleConfig` | shipped | shipped | ✅ 0 differences each |
| `frameTimingConfig` | shipped | shipped | ✅ 0 differences |
| ★★ **`raceDynamicsConfig`** | `pulkLeaderBrake` **0.1**, `pulkChallengerBoost` **0.06** | ★ **0.15** and ★ **0.12** | ❌ **DIFFERS — the `wild` stage** |
| ★★ **`cameraConfig`** | the shipped defaults | ★ **15 keys different** | ❌ **DIFFERS** |

★ **THE ROSTER IS A NON-DIFFERENCE, AND IT IS CHECKED RATHER THAN WAVED PAST.** The lists are not the
same length — the guard's `resolveNameSet(DEFAULT_NAME_SET)` returns **70** names, his stored roster
has **40**. But `buildRace` assigns `roster[i % roster.length]`, so over 40 racers **both produce the
identical 40 names**, verified element by element, and the stored results confirm the race actually
ran under those names. Since a racer's name is physics (`stablePairBit` hashes it), this mattered
enough to check; it does not differ.

### ❌ The two that do differ

**1 — THE ACTION STAGE. His `wild` against the guard's shipped `quiet`.** Measured from his stored
world, not inferred from the stage label:

```
pulkLeaderBrake      guard 0.1    |   his 0.15
pulkChallengerBoost  guard 0.06   |   his 0.12
```

These are engine inputs. **A different `raceDynamicsConfig` is a different race** — same seed, same
field, same names, different physics from the first step.

**2 — HIS STORED CAMERA CONFIG, 15 keys away from the defaults the guard grades.** Among them, four
that bear directly on the endgame the guard measures:

| key | shipped (what the guard grades) | ★ his |
|---|---|---|
| `cameraStateProfiles.OVERVIEW.trackingTC` | 0.25 | ★ **1.5** |
| `outcomePhaseThreshold` | 0.75 | ★ **0.65** |
| `corridorCapArriveMs` | 1500 | ★ **5000** |
| `minRacersVisible` | 5 | ★ **8** |
| `battleWeight` | 0.8 | **0** |
| `battlePulkThresholdT` | 0.05 | 0.001 |
| `battleCooldownMs` | 8000 | 20000 |
| `LEADER_ZOOM.visibleCorridors` | 0.75 | 0.85 |
| `BATTLE_ZOOM.visibleCorridors` | 0.55 | 0.8 |
| `COMEBACK_ZOOM.visibleCorridors` | 0.55 | 0.7 |
| `LEAD_CHANGE.visibleCorridors` | 0.75 | 0.9 |
| `highlightHeroes` · `labelNamesWhenRoom` | false · false | true · true |
| `finishPauseMs` · `winnerCardMs` | 3500 · 3000 | 4000 · 4000 |

★ **This is the stored-config shadowing that is already on the record**: a stored camera setting beats
`defaults.js` per key, forever. The guard deliberately measures the **shipped** camera — so even if
the stage matched, **the shot he watched was framed by different numbers than the shot the guard
grades**, including the OVERVIEW tracking constant at **6× the shipped value**, and OVERVIEW is the
state every one of the 15 flagged frames sits in.

---

## 3 · WHAT FOLLOWS, AND WHAT DOES NOT

**Step 4 applies: reported and stopped.** No frames were produced, nothing was re-run, and I have not
guessed what he saw.

★ **What must NOT be concluded from this.** That the guard's failure is unreal, or that he has
already looked at it. **He has not.** He watched the same track, field and seed under a different
stage and a different camera — which is a race with the same name and different content.

★ **What is worth knowing.** The near-miss is itself information: the handover asked for `dirt-oval`
40 / seed 9, and that is exactly what he ran. **The two things that would have to change to make it
the guard's race are both settings, not code** — the action stage back to `quiet`, and the stored
camera config cleared so the shipped defaults apply. Whether he wants to look at it that way is his
call; this report does not ask for it and nothing was changed to enable it.

---

## 4 · PROOF THE STORE WAS READ-ONLY

Every connection was opened `new Database(path, { readonly: true })`. No server was started or
stopped for this block — the API that has been up since the handover is untouched.

| | before | after |
|---|---|---|
| `races.sqlite` size | **208 896 B** | **208 896 B** |
| mtime (UTC) | **2026-09-14T07:07:22.7299354Z** | **2026-09-14T07:07:22.7299354Z** |
| MD5 | **`2f557ff2235cc134a29cdaeddf318690`** | **`2f557ff2235cc134a29cdaeddf318690`** |
| races | **13** | **13** |
| rosters / racer_types | 4 / 1 | 4 / 1 |

★ **Byte-identical, to the same MD5 and the same millisecond of mtime.** ★ The mtime pre-dates this
block: **07:07:22 Z is `STNJ25` being written by the running API when his race finished**, before any
read here — which is also the timestamp evidence in §1.

---

## 5 · NOTICED, AND DELIBERATELY LEFT ALONE

- ★ **There are TWO race histories and only one is readable here.** This report reads the **server's**
  record (`races.sqlite`), which is the authoritative stored history. The client also keeps a
  `DEFAULT_RACE_HISTORY` store in the browser, and **his live localStorage cannot be read from here**
  — correctly blocked. If his browser-side list holds an entry the server never received, this report
  cannot see it. **Nothing was done to work around that.**
- The stored `cameraConfig` differences are **his settings**, not a defect, and were not changed,
  cleared or "normalised" — reading them is the whole of what happened to them.
- `STNJ25` was left exactly where it is. It is his record of his race.
