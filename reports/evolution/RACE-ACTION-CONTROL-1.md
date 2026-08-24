# RACE-ACTION-CONTROL-1 — the owner's Race Action selector, three stages, on the Dev Screen

**Date:** 2026-08-24 · **Branch:** `feat/race-action-control-1` (off `master` at `25a2e040`) ·
**NOT MERGED — his eye decides.**

**What was asked for and what is here:** a host-facing control named **Race Action** with three
stages — `quiet` (the shipped values, unchanged), `medium` (the challenger boost raised, the brake at
its shipped value) and `wild` (both raised) — placed where every account can reach it, defaulting to
`quiet`, stored with the race like the seed, with the naturalness exception written down where the
envelope lives.

**The headline, and the proof the piece stands on: ALL FOUR FINGERPRINTS CAME BACK BYTE-IDENTICAL.**
The control is inert at its default; a race started without touching it is the race that ran before
it existed.

---

## 1. The placement finding — WHERE IT WENT, and how that was established

**It went into the Dev Screen's `Race Defaults` section** (`client/src/screens/DevScreen/sections/RaceDefaults.jsx`,
section id `defaults`), as the first control in the card.

**How the visibility was established — at source, not assumed.** Three readings, in this order:

1. **The role model.** `docs/AUTH.md` §3, confirmed against `server/src/auth/usersStore.js`:
   **there are exactly two roles, `operator` and `admin`.** Anything else is rejected by the store.
   `operator` is the default and is the "restricted account" the spec means; there is no third tier
   and no per-user permission set.
2. **The Dev Screen's own gate.** `DevScreen.jsx` gates each section by a `tier` field and
   **defaults to DENY** — `isOperatorTier(tier)` returns true for the literal string `'operator'`
   and for nothing else, and a non-admin is forced to the operator view regardless of any persisted
   `devPanelView`. A section with no tier, or an unrecognised one, is admin-only until somebody
   classifies it.
3. **The section list, read rather than remembered.** Seven sections carry `tier: 'operator'`:
   **Race Defaults · Change Password · Player Groups · Racer Types · Tracks · Branding · Race
   History.** Nine carry `tier: 'advanced'` and are admin-only — including **Race Tuning**, which is
   where the `pulkChallengerBoost` and `pulkLeaderBrake` sliders live.

**So an always-visible area does exist, and the question the spec guarded against — "if no such
section exists, STOP" — does not arise.**

**Which roles can see the control:** `admin` and `operator`, i.e. **every signed-in account**. Both
`/dev` and `/race` sit behind `ProtectedRoute`, so "every account" means every signed-in one; there
is no anonymous access to any of this.

**Why Race Defaults and not one of the other six.** It is the section whose stated job is exactly
this — _"Default settings applied to every new race… the values that pre-fill when an operator sets
up a new race"_ — it is the **first** operator section, so it is the section a restricted account
LANDS on with no navigation at all, and it already owns the other race-presentation decisions
(duration, winners, auto-advance, sound). The remaining six are managers for a different noun
(rosters, racer types, tracks, brands, history) or the password form.

**What was deliberately NOT touched.** The two underlying sliders stay exactly where they are, in
the admin-tier Race Tuning section, untouched, for tuning. `docs/DEVSCREEN-INVENTORY.md` was not
edited either: its header scopes it to `DynamicsTuningSection.jsx` as rendered, and this control is
not in that file. Adding an out-of-scope entry there would have broken the one thing that document
promises.

---

## 2. What was built

| file | what changed |
| --- | --- |
| `client/src/modules/storage/defaults.js` | `DEFAULT_RACE_DEFAULTS.raceActionStage: 'quiet'` — the key and its default, one home. Plus `RACE_ACTION_STAGE_IDS` and `RACE_ACTION_STAGES`, the stage table. |
| `client/src/modules/raceActionStage.js` | **NEW.** `normalizeRaceActionStage` / `raceActionStageValues` / `applyRaceActionStage`, and the written-down precedence decision. |
| `client/src/screens/DevScreen/sections/RaceDefaults.jsx` | the three-stage control (labels and blurbs only — no config value). |
| `client/src/screens/SetupScreen/SetupScreen.jsx` | the stage into BOTH race payloads (Start Race and Quick Test), normalised at the boundary. |
| `client/src/screens/RaceScreen/index.jsx` | the engine is handed the stage-applied dynamics config, read from the race payload. |
| `client/src/modules/exportRaceConfig.js` | the world export follows the stage (see §2.2). |
| `client/src/screens/ResultScreen/index.jsx` + `.css` | the stage on screen beside the seed, and in the history entry. |
| `docs/RACE-ACTION.md` | the naturalness exception (§6) and section 11 rewritten from "vision" to "built". |
| `docs/SHIP-CEREMONY.md` | one **generated** counts block regenerated (see §5). |

**`quiet` takes its values from `defaults.js` rather than from a second copy:** the `quiet` entry
reads `DEFAULT_RACE_DYNAMICS_CONFIG.pulkChallengerBoost` and `.pulkLeaderBrake` directly, and
`medium`'s brake reads the same shipped default. Change a shipped default and the stages follow it
in the same edit; "quiet == shipped" cannot drift.

### 2.1 The one real design decision: the stage WINS over the sliders

The spec says two things that pull against each other — _"the three stages are the ONLY reachable
combinations"_ and _"the two underlying keys keep their existing Dev Screen sliders untouched, for
tuning"_. **Resolved in favour of the stage, on the browser race path only, and written into
`raceActionStage.js` rather than left to be inferred.**

**Why.** The stage is stored with the race so a replay is unambiguous, and it can only carry that
meaning if it is a COMPLETE statement of the race's action configuration. A stage that deferred to
whatever the sliders held would make `wild` name a different race on every install, and would make
the reachable set unbounded rather than three.

**What it costs, stated plainly.** An admin who moves either of those two sliders does not see that
value in a browser race. The sliders are still there, still untouched, and still drive the sim, the
harnesses and the exported world — but on the race path these two keys now have one author. Every
other key in the dynamics config is untouched by the stage and the sliders own them exactly as
before.

**Where this shows and where it does not.** Only on a TUNED install. On the shipped configuration —
an untouched install, and the production build the owner judges — `quiet` is byte-identical to what
ran before, which is what the four fingerprints prove. An alternative reading is carried to him as
**proposal 3**.

### 2.2 A seam the spec did not name, closed rather than left

`exportRaceConfig.js` promises that `world.json` is _"the config the game actually reads when a race
starts"_, and `raceConfigWorld.js` exists specifically to stop browser↔sim divergence. Since the race
path now applies the stage on top of `loadRaceDynamicsConfig()`, **an export that skipped the stage
would have described a race nobody ran the moment the host left `quiet`** — exactly the silent
divergence that file is for. So `buildWorldConfig()` applies the stage: the race path passes the
stage the race was STARTED with, the Dev Screen export falls back to the stage the NEXT race would
run. At `quiet` the blob and its hash are unchanged, which is asserted as a test.

**This also keeps the Sim-Browser Parity Rule intact without a sim change.** The stages set two
ORDINARY, pre-existing config keys; `sim-fairness.mjs` already honours both. To simulate `wild` you
pass those two values, or point the sim at the exported world. No mechanics were added, so there is
nothing to mirror.

---

## 3. Tests, and the sabotage that proves each one

**48 new assertions across 6 files. 16 sabotages, all 16 CAUGHT.** Each sabotage is a real edit to a
real source file; the named tests were run against it and the file restored from its in-memory
original afterwards (**not** `git checkout` — this work was uncommitted, and a checkout would have
deleted the block). The tree was confirmed byte-identical to a safety stash after the run.

| # | property | sabotage applied | verdict |
| --- | --- | --- | --- |
| S1 | the default is QUIET | default the key to `'wild'` | **CAUGHT** |
| S2 | quiet IS the shipped configuration | give quiet a literal boost of its own | **CAUGHT** |
| S3 | a stage touches exactly its two keys | have `wild` also write `pulkFrontPool` | **CAUGHT** |
| S4 | medium's brake is the SHIPPED brake | give medium a brake of its own | **CAUGHT** |
| S5 | an unknown/missing stage reads as quiet | return the id untouched | **CAUGHT** |
| S6 | reachable for a RESTRICTED account | move the section's tier to `'advanced'` | **CAUGHT** |
| S7 | all three stages are offered | drop `wild` from the id list | **CAUGHT** |
| S8 | picking a stage STORES it | make the pill a no-op | **CAUGHT** |
| S9 | the stage travels with the race | drop the key from the Start Race payload | **CAUGHT** |
| S10 | the Quick Test path carries it too | drop it from the Quick Test payload only | **CAUGHT** |
| S11 | the engine runs the stage | build the config from the raw loader again | **CAUGHT** |
| S12 | the stage comes from the PAYLOAD | read the live Dev Screen setting instead | **CAUGHT** |
| S13 | the HUD/marker world agrees | call `buildWorldConfig()` with no stage | **CAUGHT** |
| S14 | the stage is ON SCREEN afterwards | delete both result-screen spans | **CAUGHT** |
| S15 | the history entry carries it | drop the key from the entry | **CAUGHT** |
| S16 | the exported world follows the stage | build from the raw loader again | **CAUGHT** |

**The five properties the spec asked for, and where each lives:**

- **the default is quiet and produces today's race** — S1, S2; and end-to-end by the four
  fingerprints (§4), which is the only instrument that can actually say "today's race".
- **each stage sets exactly the keys it should and nothing else** — S2, S3, S4. The test compares
  the FULL key set and every value of the resulting config, not just the two keys.
- **the stage is stored with the race and read back** — S9, S10, plus a round trip through the real
  `validateActiveRace`.
- **a race stored before this change loads as quiet** — S5, and a test that takes a real started-race
  payload and `delete`s the key, which is exactly what an older build wrote.
- **the control is reachable for a restricted account and not only for a full one** — S6, S8. The
  test renders the REAL `RaceDefaults` inside the REAL `DevScreen` as an `operator` (it is
  deliberately NOT mocked, unlike in the neighbouring tier-toggle test), and its negative half
  asserts that Race Tuning stays out of an operator's reach.

**One test reads SOURCE rather than rendering, and that is declared.**
`RaceScreen/raceActionWiring.test.js` holds the shape of the race-path wiring by reading
`index.jsx`, following the precedent `modules/engineInputs.test.js` already set in this tree. The
seam is three lines inside an init effect that needs a canvas, a geometry, a rAF loop and a live race
to reach; rendering all of that to assert one assignment would be a large, slow test of somebody
else's machinery. **What it cannot tell you is that the race came out right — only the fingerprints
and the eye do that.** What it can tell you is that the stage is read from the RACE and not from the
live setting, which is the one way that seam can silently lie (S12).

---

## 4. Fingerprints — the proof

Routing was left to `npm run verify`, which selected all four instruments because `defaults.js` is
inside every one of their declared closures. **Nothing was re-minted. Nothing moved.**

| role | recorded in `docs/fingerprints.json` | measured on this branch | verdict |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **BYTE-IDENTICAL** |
| world-off | `854018ee5d3d83e1` | `854018ee5d3d83e1` | **BYTE-IDENTICAL** |
| camera | `0434cd0385eacc7b` | `0434cd0385eacc7b` | **BYTE-IDENTICAL** |
| render | `57b2eb101d806b22` | `57b2eb101d806b22` | **BYTE-IDENTICAL** |

`world-off` is not selected by `verify`'s guard list under that name, so it was run by hand with the
role's own `reproduce` command (`node scripts/fingerprint-default.mjs off --gapRerollEnabled=false`)
rather than argued from the other three.

**What this establishes and what it does not.** It establishes that the shipped configuration is
untouched — the new key, the new module and the new control change no race at the default. **It says
nothing about `medium` or `wild`**, which are off-default configurations and outside every one of
these instruments' declared reach by their own `blind` statements.

---

## 5. `npm run verify` — the full run

**Final state, on the committed branch: `PASS 20 · FAIL 0 · SKIP 4`, wall clock 302s.** The full
client suite ran alone and passed; all four fingerprint instruments re-measured and came back
unmoved.

**The first run was `PASS 15 · FAIL 1 · SKIP 8` and the one failure is recorded here rather than
tidied away.**

**The one failure, and it is reported rather than adjusted.** `ceremony-counts` failed:
`docs/SHIP-CEREMONY.md` carries a **generated** table counting tracked non-test files under
`client/src/modules/`, and adding `raceActionStage.js` moves two numbers in it (107→108 tracked,
86→87 that cannot reach the engine). **The remedy was the one the guard itself prints** —
`node scripts/gen-ceremony-costs.mjs --counts` — which regenerates a generated block. No guard was
weakened, no threshold moved, and the diff is exactly those two numbers.

**A note worth carrying, because it is the `drawnBodyWidthRefPx` class.** `raceActionStage.js`
correctly counts as "cannot reach the engine" — `raceCore.js` does not import it — yet it decides two
values the engine is handed. That is precisely the hole `VERIFY-RULES` R1 warns about ("values passed
INTO the engine as arguments from a screen file"). It is not a defect here, because the stage's
default is the shipped configuration and the fingerprints measured it; but a future change to the
stage TABLE would move the race while sitting outside the closure. **Proposal 1.**

---

## 6. Source hygiene

- **Language rule:** English throughout — code, comments, labels, tooltips, tests, this report. No
  new verbatim quotation was added anywhere; the closed inventory in `CLAUDE.md` is untouched.
  `check-language-closed` PASS.
- **One home:** `check-config-claims` PASS — **0 current claims** across 57 living documents. The
  new documentation names stages and points at `defaults.js`; it states no config value. The Dev
  Screen control holds labels and blurbs only and imports its ids from `defaults.js`.
- **No schema, no version bump, no migration** — the new key is an ordinary config key, deep-merged
  on load, and an old stored blob falls back to the default. `check-config-keys` PASS,
  `check-fallback-agreement` PASS.
- **Mirrors by reference (L207):** `FALLBACK_RACE_ACTION_STAGE` reads
  `DEFAULT_RACE_DEFAULTS.raceActionStage`; `quiet` and `medium` read the dynamics defaults. Nothing
  is copied.
- **Everything UI-configurable:** the stage is chosen in the UI; no code edit changes it. The
  existing sliders are untouched.
- **Formatting** was done by `verify` BEFORE the fingerprints were measured (R0b), so the measured
  tree is the tree that gets committed.
- The report is registered in `reports/evolution/INDEX.md` in the same commit.

---

## 7. Build vs spec — conformity

| the spec asked | status |
| --- | --- |
| three stages: quiet / medium / wild | **done** |
| quiet's values taken from `defaults.js`, not a second place | **done** — `quiet` and `medium`'s brake read `DEFAULT_RACE_DYNAMICS_CONFIG` |
| the three stages are the ONLY reachable combinations | **done** — see §2.1 for the decision that makes this true |
| the two sliders untouched, for tuning | **done** — not edited, not moved, not disabled |
| placed where EVERY account can reach it | **done** — Race Defaults, `tier: 'operator'`; established at source in §1 |
| state which section, how established, which roles | **done** — §1 |
| default is QUIET, byte-identical to today | **done** — and proved by all four fingerprints |
| stage stored WITH the race, like the seed | **done** — both start paths; read back through the real validator |
| a pre-change stored race loads as quiet | **done** — S5, and a delete-the-key test |
| the key with its default in `defaults.js`, one home | **done** |
| the naturalness exception written where the envelope lives | **done** — `docs/RACE-ACTION.md` §6, with its evidence, its date and its attribution |
| do NOT weaken the envelope | **done** — the ±20% statement is untouched; no clamp, constant or default moved |
| do NOT silence any guard | **done** — one guard tripped, was reported, and its own generator was run (§5) |
| say plainly that wild's fairness breadth is unmeasured | **done** — §8, and in `RACE-ACTION.md` §6 |
| name what a validation run would cost | **done** — §8 |
| do NOT run it, do NOT block the build on it | **done** — not run |
| tests + sabotages, recorded | **done** — §3, 16/16 caught |
| fingerprints: all four byte-identical | **done** — §4 |
| stage visible on the race afterwards | **done** — result screen, beside the seed, for every stage including quiet |
| production build on the dev server, report the badge | **done** — §9 |
| DO NOT MERGE | **honoured** — branch only, no merge, no tag, no mint |

**Two things I did that the spec did not ask for**, both flagged rather than buried: the world-export
seam (§2.2), because leaving it would have created the exact divergence `raceConfigWorld.js` exists
to prevent; and the result-screen display, which the spec DID ask for as "the stage visible on the
race afterwards" but did not say where — I put it beside the seed, which is the line the owner
already reads after every race.

**Nothing in the spec was left undone.**

---

## 8. Fairness — stated plainly

**The owner bound this control to the fairness gate: a stage ships only if it passes.**

- **`quiet` — measured.** It IS the shipped world, `dc4647be0f55ebdb`, and the gate record for it is
  the standing one.
- **`medium` — measured.** Band arrival held on all ten tracks at N=100 (`LADDER-VALIDATION-1`).
- **`wild` — NOT MEASURED AT THAT BREADTH.** `WILD-STAGE-1` covered **two tracks at N=30** and found
  band arrival **UNDECIDED**. **That means "smaller than that instrument can see", not "unchanged".**
  An N=30 arm sitting inside its own confidence interval is undecided; reading it as a null result
  would be reading a failure to measure as a measurement.

**What a validation run over all tracks would cost.** The gate's own methodology is pooled
**300 races per track** over the **ten** standard tracks — 3,000 races — with band-reach and native
pooled Holm via `computeFairnessStats`. On this machine, `--jobs`-parallelised into a non-OneDrive
scratchpad, the comparable full-breadth runs in this project's record have taken **on the order of
several hours**. A cheaper first cut at the N=100 breadth `medium` was cleared at is roughly a third
of that and would say whether a full run is even warranted.

**It was NOT run in this block, the build is NOT blocked on it, and whether it runs is the owner's
call.** Until it does, `wild` is accepted on his eye and not on the gate — which is what
`docs/RACE-ACTION.md` §6 now records.

---

## 9. The production build and the badge

The dev server is on this branch as a **production build** (`vite build` + `vite preview` on the
standing preview port 4173, API on 4000).

**BUILD BADGE: `build 1d52acc3 · feat/race-action-control-1`** — no `+dirty`, so the picture on
screen IS reproducible from that commit. Read from the identity baked into the served bundle
(`{commit:`1d52acc3`, branch:`feat/race-action-control-1`, dirty:false, reason:null}`), not
assumed from `git log`.

**Verified serving, not merely started:** exactly one listener on each port; `GET /api/health` on
4000 answers `{"status":"ok"}`; `http://localhost:4173/` serves `assets/index-yBiER7G1.js`, which is
the bundle this build produced. `RA_CLIENT_ORIGIN` lists BOTH 4173 and 5173 — leaving 4173 out looks
exactly like a dead backend (VERIFY-RULES R10).

**One honest note on the badge.** `GET /api/health` reports the SERVER's own build identity as
`unknown`, because `RA_BUILD_COMMIT` / `RA_BUILD_BRANCH` are not set by the dev start. That is
standing dev behaviour and not something this block changed — and it is a different thing from the
HUD badge, which is the one the owner reads and which is correct.

**What the owner will look at:**

1. **Dev Screen → Race Defaults** — the **Race Action** control is the first thing in the card, and
   it is there for a restricted account with no navigation.
2. **Three stages, switched without touching a slider.**
3. **Start a race, then the result screen** — `Action: Quiet / Medium / Wild` beside the seed, so he
   can tell which one ran.

---

## 10. PROPOSALS

**1. Teach the engine-reach closure about values handed IN, starting with the stage table.**
(Mine.) §5 records the live version of the `drawnBodyWidthRefPx` hole: `raceActionStage.js` is
outside `raceCore.js`'s import closure and therefore outside every fingerprint's routing, yet it
decides two values the engine runs on. Today the stage table could be edited and no instrument would
select itself. The cheap form is to add the stage table to the world fingerprint's declared `reach`
so that editing it forces a measurement; the honest form is a second `ENGINE_INPUT_MODULES`-style
list for modules that FEED the engine without being imported by it. **This is a real hole with a
known first instance, not a hypothetical.**

**2. Give the slow side of the envelope a floor, now that a shipped stage crosses it.** (Mine.)
`ENVELOPE-ONE-SIDED-1` established the asymmetry and closed with "not a live defect" — true when it
was written, and `wild` is the change that makes it live: the code permits the breach, and now a
shipped configuration takes it. The decision he faces is not "fix wild" — he has accepted wild — it
is whether the code should say what it permits. A floor set BELOW wild's measured excursion would
leave wild untouched while making the next unintended breach impossible. That is a different change
from weakening the envelope, and it should not be confused with one.

**3. The slider-vs-stage precedence, carried to him as a question.** §2.1 resolves it one way and
states the cost. The alternative — `quiet` applies no override and defers to the sliders, while
`medium` and `wild` pin — preserves an admin's tuning on the race path but makes a stored `quiet`
stage mean "whatever that install was set to", which is not a replay. **I recommend keeping what is
built**, but the trade is his and it is cheap to reverse (one function).

**4. Measure `wild` before the ladder is offered to a real audience.** §8 names the cost. It is not
urgent for his eye-test — he has already judged the races — but "a stage ships only if it passes the
gate" is his own rule, and `wild` currently sits outside it on evidence that is undecided rather than
clean.

**5. A cheap `medium` for the middle.** `WILD-STAGE-1` found the boost alone matches the shipped
brake's action at **zero slow-side cost**, which is exactly what `medium` now is. If the full-breadth
run in proposal 4 comes back badly for `wild`, `medium` is already the fallback ladder-top and needs
no new measurement — worth knowing before the run, so a bad result is a narrowing rather than a loss.
