# BROWSER-HARNESS-PARITY-1 — the harness reproduces the browser exactly; the roster was wrong

**Report only. Nothing built, nothing changed, nothing recommended.** Build `72ff4e7f`.

★★ **THE ANSWER, FIRST: THE HARNESS IS NOT BROKEN.** Given the same field it reproduces a browser race
**exactly, ten places deep**. The divergence in DRAWN-PLACE-TRUTH-1 was that it raced a **different
roster** from the one he had loaded — and a racer's NAME is physics.

---

## 1 · THE TWO RUNS, SIDE BY SIDE

**Browser**, build `72ff4e7f`, production build on 4173: Quick Test · City Circuit · seed 3 · the
saved group **"40 Racer Testgroup"** (40 players) · results screen reads `City Circuit · 102s · Seed 3`.

**Harness**, same seed and track, handed **that group's roster**:

| place | ★ BROWSER | ★ HARNESS |
|---|---|---|
| 1 | **Nova** 1:19.69 | **Nova** |
| 2 | **Zephyr** 1:20.00 | **Zephyr** |
| 3 | **Arrow** 1:20.09 | **Arrow** |
| 4 | **Comet** 1:20.14 | **Comet** |
| 5 | **Vortex** 1:20.14 | **Vortex** |
| 6 | **Drift** | **Drift** |
| 7 | **Thunder** | **Thunder** |
| 8 | **Flare** | **Flare** |
| 9 | **Raven** | **Raven** |
| 10 | **Titan** | **Titan** |

★★ **TEN OF TEN, IN ORDER. THE PARITY HOLDS.**

And the run DRAWN-PLACE-TRUTH-1 actually made, with the harness's default roster:

    harness, QUICK_TEST_NAMES.slice(0,40):  1 Flare, 2 Raven, 3 Breeze, 4 Apex, 5 Bolt

**A different race entirely** — which is exactly what that report published as "his race".

---

## 2 · ★ WHAT DIFFERED, WITH ADDRESSES

★★ **THE ROSTER, AND ONLY THE ROSTER.**

`stablePairBit` hashes `r.name`, so a different name list is a different race — the project has this
on record ("a racer's NAME is physics"). `resolveIdentity` (`scripts/lib/raceDriver.mjs`) takes
`roster` and DRAWN-PLACE-TRUTH-1 passed `QUICK_TEST_NAME_SETS.current.slice(0, 40)`. He had loaded a
**saved player group** instead.

| | his group ("40 Racer Testgroup") | the harness default |
|---|---|---|
| first six | Flash, Atlas, Surge, Maverick, Gale, Blitz | Turbo, Blaze, Rocket, Flash, Speedy, Thunder |
| contains | **Walter** | — |
| lacks | — | **Sparrow** |
| names at a different index | ★ **40 of 40** | — |

**Different set AND different order.** Not one name is at the same index.

★ **THE OTHER CANDIDATES, CHECKED AND CLEARED:**

- **Racer type** — both motorbike, City Circuit's `defaultRacerTypeId`; the harness passes
  `TRACK_DEFAULT_RACER`.
- **Duration** — the results screen reads `102s`, but that is the REALIZED duration. The setup
  screen's own summary line reads `60s`, which is what both arms REQUESTED
  (`requestedSeconds: identity.seconds`, `raceDriver.mjs:340`). No divergence.
- **Laps** — `laps: shape.isOpen ? 1 : lapsOfClosedTrack(geo)`, read from the track record rather
  than a literal. Same both sides.
- **Field size** — 40 both sides. Note `quickTestFieldSize` (`fieldCap.js`) makes the typed N a
  **floor, not a ceiling**: with 40 players already on screen, "Quick Test (20)" starts all 40.
- **`cfg 8aed1e`** — a CAMERA config id. It selects framing, not physics; the finishing order above
  is identical under the harness's `DEFAULT_CAMERA_CONFIG`, which is itself the proof.

---

## 3 · ★ THE PRECEDENT, AND WHETHER IT STILL ANSWERS

`scripts/diag/outcome-parity.mjs` **still exists** and still runs. It was built for the 2026-09-02
defect, when the rig ran with `roster: null`.

★ **BUT IT DOES NOT ANSWER THIS QUESTION.** It compares the harness against
`scripts/parity/goldenRunner.mjs` — **both of them node**. That is a code-level parity between two
in-repository arms; **neither is a browser.** It would pass unchanged while the browser raced a
different field, because the roster it uses is one it chooses itself (`resolveNameSet(DEFAULT_NAME_SET)`).

★ **WHAT ACTUALLY ANSWERED IT** was driving the shipped build in a real browser and putting the
finishing order beside the harness's — which is what §1 is, and which nothing in the repository
does automatically.

---

## 4 · ★★ CAN THE HARNESS REPRODUCE A BROWSER RACE TODAY? **YES — IF IT IS TOLD THE ROSTER.**

Stated plainly, as asked:

- **The engine is shared and correct.** Same seed, same track, same roster ⇒ byte-identical order.
- **The roster is not discoverable by the harness.** It lives in the operator's saved group
  (`server/data/player-groups/*.json`) or in whatever names are on his screen, and every measurement
  script in this repository supplies its own default instead.
- **So a harness race is a real race of the same game, but it is not HIS race** unless his roster is
  handed to it. Nothing warns when it is not — `resolveIdentity` accepts any roster and the identity
  line prints it, but no instrument compares it to a browser.

---

## 5 · ★★ THE CONSEQUENCE — WHAT WOULD HAVE TO BE RE-ESTABLISHED

**Named, not re-run.**

★ **THESE CLAIMED TO BE HIS RACE AND ARE WRONG ON THAT POINT:**

| report | what it claimed | status |
|---|---|---|
| **DRAWN-PLACE-TRUTH-1 §1** | "his race reproduced": Breeze drawn 2nd, finishing 3rd, falling behind Flare | ★ **WRONG RACE.** In his actual field Breeze finishes **27th** and the winner is Nova. The section must be re-established. |
| **LEADER-GAP-1 §1** | "it reproduces" — seed 3, `Flare` wins at three commits | ★ **WRONG RACE**, same cause. The seed-3 single-race numbers are not his. |

★ **THESE DO NOT DEPEND ON HIS ROSTER AND STAND:**

- **Structural findings**, which are arithmetic and roster-independent: the clamp saturating at
  `0.05·nActive` (TAPER-INVISIBLE-1), the front-contest release zeroing the error past 0.97
  (DRAWN-PLACE-TRUTH-1 §3), the ceiling being field-size independent (ARRIVAL-SOLVE-1 §1).
- **The distributional sweeps** — ARRIVAL-SHAPE-E-1, SERVO-RANKS-1, ARRIVAL-SOLVE-1,
  ARRIVAL-STEERED-AGAIN-1 — which sample 700–1 200 races over ten tracks and four field sizes and
  never claimed to be one particular race. ★ **A different roster is a different SAMPLE of the same
  engine, not a different mechanism** — nothing in the physics privileges one name list over another.
  **That is a reasoned position, not a measurement**: no sweep has been re-run under his roster, and
  if he wants the distributions confirmed on his own field that is a re-run, not a correction.

---

## 6 · ONE OBSERVATION ABOUT READING HIS SCREENSHOT

★ **THE LIVE STANDINGS PANEL IS NOT ORDERED BY RANK.** In the browser run above it read
`16Flash 1:22.24 · 8Atlas 1:21.20 · 33Surge 1:23.56 …` — Atlas is **faster** than Flash and listed
**below** him. The leading integer is a **bib number** and the rows follow roster order.

So "1 Breeze, 2 Blitz, 3 Atlas, 4 Flare, 5 Apex" is **bibs 1–5**, not places 1–5. ★ **This report
cannot say what his screenshot showed** — his field is not the one measured here, Breeze carries bib
**35** in it, and no browser run reproduced his standings. **What it does establish is that the panel's
leading number is not a rank**, which is worth knowing before that screenshot is read again.
