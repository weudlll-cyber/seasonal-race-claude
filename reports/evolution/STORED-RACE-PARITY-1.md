# STORED-RACE-PARITY-1 — they are NOT the same race, and the field that differs is the action stage

**Report only. Nothing built, nothing changed, nothing recommended.** All access to his store was
read-only (`GET` only); nothing was created, altered or deleted, and no copy was needed.

★★ **THE ONE LINE: NOT IDENTICAL. 10 of 40 positions match.** The first field that differs is
**`raceActionStage`** — his race stored **`wild`**, and the harness cannot read it at all, because
`scripts/lib/raceDriver.mjs:289` hardcodes `const W = DEFAULT_CONFIG_WORLD`.

---

## 1 · HIS RACE, FOUND IN HIS OWN STORE

★ **SHORT KEY: `QN3HDP`** — the name to use for it from now on.

    GET /api/races/QN3HDP        finishedAt 2026-09-13T17:52:14.609Z
    buildId          72ff4e7f          ← his build
    racePlanSeed     3                 ← seed 3
    fieldSize        40                ← 40 racers
    geometryId       custom-a698039d-f1aa-4a7c-a5e0-3a60958526e0
    racerTypeId      motorbike
    targetLaps       2                 ← "lap 2/2"
    elapsedSec       87
    raceActionStage  ★ wild
    worldConfigs     autoScale · baseSpeed · camera · frameTiming · raceBehavior ·
                     raceDynamics · rowLayout

★ **THE ROSTER IT CARRIES IS `QUICK_TEST_NAMES`** — Turbo, Blaze, Rocket, Flash, Speedy, Thunder,
Nitro, Drift, Bolt, Zephyr, Storm, Comet… **the harness default.**

★★ **SO BROWSER-HARNESS-PARITY-1 WAS WRONG ABOUT THE CAUSE.** That report concluded the divergence was
the roster, having assumed he had loaded his saved "40 Racer Testgroup". **His stored race says he did
not** — he used the default Quick Test field, the same names the harness uses. **The roster was never
the difference.** The parity demonstration in that report stands as an experiment (browser and harness
agreed ten deep on a group-roster race) but its diagnosis of *his* race is withdrawn.

★ **`geometryId` IS NOT A DIVERGENCE EITHER:** `server/data/tracks/city-circuit.json` itself carries
`geometryId: custom-a698039d-…`. That is simply how the shipped record is labelled.

---

## 2 · RUNNING THE HARNESS FROM THAT STORED RACE — AND WHAT IT CANNOT TAKE

The stored identity carries a **world**: seven config blocks and an action stage. The driver does not
accept them.

    scripts/lib/raceDriver.mjs:289    const W = DEFAULT_CONFIG_WORLD;

★★ **HARDCODED.** `buildRace` has no parameter for a world config, so a harness race ALWAYS runs the
shipped defaults regardless of what the stored race says. And no harness applies the stage:

    grep -c applyRaceActionStage  scripts/lib/raceDriver.mjs → 0
                                  scripts/sim-fairness.mjs   → 0

`raceActionStage.js` states the split itself: the stage overrides two dynamics keys, and the sliders
"still drive the sim, **the harnesses** and the exported world — but on the browser race path these
two keys now have one author."

| stage | `pulkChallengerBoost` | `pulkLeaderBrake` |
|---|---|---|
| **quiet** — what every harness run effectively uses | 0.06 | 0.10 |
| ★ **wild** — HIS race | ★ **0.12 (double)** | ★ **0.15 (+50%)** |

---

## 3 · POSITION BY POSITION

Same forty names, same seed 3, same track, same build `72ff4e7f`.

| # | ★ STORED (`QN3HDP`) | HARNESS (default world) | same? |
|---|---|---|---|
| 1 | **Bolt** | Flare | ★ NO |
| 2 | Flare | Raven | ★ NO |
| 3 | Raven | **Breeze** | ★ NO |
| 4 | Apex | Apex | yes |
| 5 | Surge | Bolt | ★ NO |
| 6 | Orbit | Orbit | yes |
| 7 | ★ **Breeze** | Atlas | ★ NO |
| 8 | Titan | Titan | yes |
| 9 | Atlas | Surge | ★ NO |
| 10 | Drift | Blitz | ★ NO |
| 11 | Blitz | Pixel | ★ NO |
| 12 | Raptor | Raptor | yes |

★★ **10 OF 40 POSITIONS IDENTICAL. THE SAME 40 NAMES, IN A DIFFERENT ORDER.** `Breeze` finishes
**7th** in his race and **3rd** in the harness's.

★ **THE FRAME-LEVEL COMPARISON ASKED FOR IN STEP 3 WAS NOT MADE, AND CANNOT BE.** It requires running
HIS race, and §2 is the reason that is impossible today. Reporting a frame trace from the harness's
race as though it were his is precisely the error this report exists to correct.

---

## 4 · ★★ THE ANSWER, IN ONE LINE

**NOT identical — and the first field that differs is `raceActionStage` (`wild` vs the harness's
effective `quiet`), which the harness cannot read because `raceDriver.mjs:289` hardcodes
`DEFAULT_CONFIG_WORLD`.** That is the defect, and per the brief this report stops there.

---

## 5 · WHAT HE ACTUALLY SEES — PART ANSWERED, PART NOT

★ **FROM HIS OWN STORED RACE, measured:**

| | |
|---|---|
| Breeze's finish | ★ **7th of 40** |
| his time | 1:20.832 |
| gap to the winner (Bolt) | ★ **800 ms** |
| places 1–8 span | **816 ms** |

★★ **HE WAS NOT PULLING AWAY AT THE FINISH — the first eight finished inside eight tenths of a
second.** Whatever the screenshot showed at lap 2/2, by the line he was seventh in a tight pack.

★ **NOT ESTABLISHED, AND NOT GUESSED: whether `Breeze` is the cast comebacker, and his drawn place.**
The stored record carries `racePlanSeed` and `racePlanEnabled` but **no hero cast and no drawn ranks**
— the cast is computed at the choreo boundary and never persisted. Determining it requires re-running
HIS race, which §2 says cannot be done. **It would take the driver accepting a stored world config and
action stage.**

---

## 6 · ★★ THE PANEL, CORRECTED AT SOURCE

His row two reads **`2 | 27 | Blitz`**. The two numeric columns are:

| column | what it is | address |
|---|---|---|
| first | ★ **THE RANK** — the fixed slot the card currently occupies | `ScoreboardSlots.jsx:45` renders `rankLabel(rank)` for slots 1..count |
| second | ★ **THE RACE NUMBER** — the start number painted on the racer, constant all race | `ScoreboardCard.jsx:90` renders `raceNumber` BEFORE the name (RACE-NUMBERS-1) |

**So `2 | 27 | Blitz` is: rank 2, race number 27, Blitz. And `1 · Breeze` with the crown means Breeze
was genuinely in FIRST PLACE at that moment.**

★★ **THIS CORRECTS BROWSER-HARNESS-PARITY-1 §6, WHICH WAS WRONG.** That report claimed the panel is
"not ordered by rank" and that the leading integer is a bib number. It reached that by reading
`document.body.innerText` and finding a slower racer listed above a faster one — **but the cards are
absolutely positioned and moved by `transform: translateY(...)` into fixed slots, so DOM order is not
display order.** The panel IS rank-ordered on screen. The misreading was mine, and it is exactly the
class of error that sent three days into the wrong racer.

---

## 7 · ★ THE CONSEQUENCE

★★ **EVERY HARNESS AND SIM MEASUREMENT THIS WEEK RAN THE `quiet` STAGE. HE WATCHES `wild`.** Double
the challenger boost and half again the leader brake. So:

**CONFIRMED to be about races he could have watched:** *none of the tuning measurements, on this
evidence.* They are valid races of the same engine at a different action setting.

**VOID — claimed to be his race and are not:**

| | |
|---|---|
| DRAWN-PLACE-TRUTH-1 §1 | "his race reproduced": Breeze drawn 2nd, finishing 3rd. His race finishes him **7th**. |
| LEADER-GAP-1 §1 | the seed-3 single-race trace | 
| BROWSER-HARNESS-PARITY-1 §2, §6 | the roster diagnosis, and the panel reading |

**NOT void, and the reason is structural:** the arithmetic findings do not depend on the stage —
the clamp saturating at `0.05·nActive`, the 0.97 release zeroing the error, the ceiling being
field-size independent. `pulkChallengerBoost` and `pulkLeaderBrake` are pulk-phase dynamics keys; they
do not appear in those expressions.

**The distributional sweeps** (ARRIVAL-SHAPE-E-1, SERVO-RANKS-1, ARRIVAL-SOLVE-1,
ARRIVAL-STEERED-AGAIN-1) are **not void but are now known to describe the `quiet` world only.**
Whether their arrival, gap and band-reach numbers hold at `wild` is **unmeasured**. Not re-run here,
as instructed.

---

## 8 · DISCLOSURE

★ During the PREVIOUS piece I ran a race in his browser to test parity. It was stored as **`SF8GEZ`**
(2026-09-13T17:19:22Z, winner Nova, his "40 Racer Testgroup"). **That record is mine, not his**, and it
sits in his history. It was created before this piece's read-only instruction and has been left in
place rather than deleted, since deleting from his store is itself an alteration. **Named so he is not
misled by it.**
