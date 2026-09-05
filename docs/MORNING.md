# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-05, during the night chain of 2026-09-04. Branch `night/2026-09-04` off
master `6953722d`, pushed, **not merged — the merges are yours to decide from this sheet.**

**NOTHING IN THIS CHAIN MOVED THE PICTURE, A DEFAULT, A THRESHOLD OR A SHIPPED VALUE. NO FINGERPRINT
WAS MINTED.** All four — world, world-off, camera and render — were re-computed on the changed tree
and every one matches its recorded value in [fingerprints.json](fingerprints.json). *(The values are
not restated here; that record is their one home.)*

**`npm run verify` on this branch: PASS 15, FAIL 0, SKIP 11** — 452 s wall clock, client suite
green alone in 311.6 s, retry ledger disabled (no test was retried).

---

## DONE

**E · A sweep that measures nothing no longer exits clean** —
[SILENT-ZERO-TRACKS-1](../reports/night/SILENT-ZERO-TRACKS-1.md).
★ **The harness did not merely report zero — it printed `PASS`.** Measured by removing the new guard
and re-running the incident: exit 0, 43 s, *"Every frame of every race swept satisfied all five
invariants. PASS"*, over zero races. ★ **And the fix already existed here and never travelled** —
`company-spread-sweep.mjs:160` has the same guard, written after its own silent zero. Two checks now
refuse before the 72 s client build. **28 other `--tracks` entry points are named and left alone**;
`sim-fairness.mjs` has a third variant, a silent DEFAULT rather than a zero. Not wired into CI,
verify or a hook.

**G · The render fingerprint's blind spot — guard only** —
[RENDER-CAMERA-GAP-1](../reports/night/RENDER-CAMERA-GAP-1.md).
★ **The backlog says three fields; the tree says the blindness costs TWO.** `anchorRacerIndex` and
`runInArrived` are both label behaviours the instrument draws wrongly; `camera.state` is no longer
read by live code and survives only in the comment recording its removal. **The repair is NOT done —
it moves the render hash and is yours to order.** A test now pins exactly which members are missing,
so the gap cannot widen silently. Sabotage 3/3.

**H · The harness ceiling and the hardcoded lap count** —
[HARNESS-CEILING-LAPS-1](../reports/night/HARNESS-CEILING-LAPS-1.md).
★ **The track records already say how many laps they run** (`defaultLaps`, 2 on all five closed
tracks) — the driver was ignoring the data, not filling a gap in it. Measured: **0 of 10 tracks
exceed the 200 s ceiling**, longest dirt-oval at 93.1 s. The driver now reads the record and throws
rather than substituting; a truncated race throws rather than being returned as a race. **The ceiling
is NOT raised** — that is your decision; making it audible was not. Sabotage 4/4 with two controls.

**J · Why `date-fns` is in the image** — [IMAGE-DATE-FNS-1](../reports/night/IMAGE-DATE-FNS-1.md).
27.1 MB measured **inside the image**, 42% of its dependencies, pulled by
`better-sqlite3-session-store`. ★ **The package that declares it never imports it** — its only
mentions are its own `package.json` and its TEST file, and nothing else in the image imports it
either. **Not removed** — see NEEDS HIS WORD.

**K · Three document corrections** —
[BACKLOG-CORRECTIONS-2026-09-04](../reports/night/BACKLOG-CORRECTIONS-2026-09-04.md).
Player Group Selection was unbuilt on 2026-09-02 and **shipped on 2026-09-03**; verified at source
and moved to PART TWO. Gate item 2's doubling now stated plainly in the `GATE_TRACKS` comment — **and
it is now two of the three tracks that fail something at seed 9, not one**. Which tracks the gate
runs was not changed. *(Wording corrected 2026-09-05, GATE-WIRED-AND-CAUSED-1: this line read "two of
the three excluded tracks". There is no exclusion — `GATE_TRACKS` NAMES the two the gate runs, and
eight are simply not named.)*

**I · What a one-command deploy actually needs** — [DEPLOY-NOTES.md](DEPLOY-NOTES.md). Nothing built,
nothing recommended. See NEEDS HIS WORD.

**C · A test that mounts `RaceScreen`** — [RACESCREEN-MOUNT-1](../reports/night/RACESCREEN-MOUNT-1.md).
It mounts, and the real camera director initialises in it. ★ **It supersedes D2, which is not
withdrawn** — you closed the question of whether to act; the chain re-opened it because the dial is
about to be built here. No production code changed. Sabotage 3/3. ★ **But the sabotage the chain
named is STILL GREEN** — blanking every track background passes 405 tests, and cannot be caught by a
mount test; the backlog item is corrected rather than struck.

**F · Characterisation tests for `sim-fairness.mjs`** — [SIM-FAIRNESS-PIN-1](../reports/night/SIM-FAIRNESS-PIN-1.md).
12 tests, file untouched. ★ **`runSingleRace` is EXPORTED and the sweep sits behind `isMain`** — two
facts the backlog does not carry, and they are what made this possible without editing the file. A
physics constant sabotage was caught by the golden; a tie-break one was not, correctly, because the
branch is unreachable. World fingerprint unmoved.

**B · What the closing phase interrupts** — [CLOSING-CUT-1](../reports/night/CLOSING-CUT-1.md).
**Ten tracks, seed 9, in the real browser on the production build.** The feasibility gate passed —
the closing phase's start IS observable from an existing instrument (the first frame with the
director's `_runInComposingNow`, dumped as `comp`), so none was built.
★ **FOUR different phases are caught at the cut** — `LEADER_ZOOM` 4, `OVERVIEW` 3, `LEAD_CHANGE` 2,
`BATTLE_ZOOM` 1. There is no "it mostly interrupts X". A median **2,492 ms — 59% of the phase — is
still ahead**, with only 35% of its zoom travel done; and the zoom is caught EARLIER than the pan in ALL TEN, so **the cut removes the glide**, which is exactly what this project's standing warning
about big zoom changes says not to do. ★ **It was never "doing nothing anyway": 0 of 10** — the cheap
version of this change is not available. ★ **And one case collides with your own acceptance — see question 4.** One seed only; the report says what that cannot support.

**A · What each action lever actually does** — [ACTION-LEVERS-1](../reports/night/ACTION-LEVERS-1.md).
**COMPLETE: 290 cells, 0 failures — all 14 candidate levers on all ten tracks at N = 30 races**, one
lever at a time, everything else shipped. It finished after the rest of the chain did.

**Every row below is 10/10 tracks. The sign test is across the ten tracks; 10/0 or 0/10 is p = 0.002.**

| lever | lead changes | held top-5 passes | leader's longest hold | field spread | finish gap |
| --- | --- | --- | --- | --- | --- |
| `pulkLeaderBrake` 0.05 → 0.15 | −37% → **+31%** | −38% → **+12%** | +55% → **−33%** | *nothing* | *nothing* |
| `pulkChallengerBoost` 0.03 → 0.12 | −10% → **+17%** | −9% → **+12%** | +8% → **−16%** | *nothing* | *nothing* |
| `pulkBoostHeadroom` 0 → 0.2 | **−9%** → INERT | **−15%** → INERT | **+13%** → INERT | *nothing* | *nothing* |
| `pulkLeadRotationAttackerSlots` 1 → 3 | **−8%** → INERT | **−8%** → INERT | *nothing* | *nothing* | *nothing* |
| `chaosSteerGain` 0.03 → 0.12 | **+7%** → −2% | *nothing* | −4% → *nothing* | *nothing* | *nothing* |
| `b2AttackHeroes` 0 → 6 | *nothing* | +3% → **−5%** | **−8%** → +4% | +9% → **−8%** | *nothing* |
| `pulkEnvelopeMaxEffect` 0.06 → 0.24 | **INERT** | **INERT** | **INERT** | **INERT** | **INERT** |
| `choreoIntensity` 0.3 → 0.9 | *nothing* | *nothing* | *nothing* | *nothing* | *nothing* |
| `pulkFrontPool` · `pulkBiasGain` · `pulkLeadRotationDropDepthLengths` · `pulkLeadRotationOutsiderMaxReachLengths` · `gapRerollStrength` · `gapRerollThresholdLengths` | *nothing* | *nothing* | *nothing* | *nothing* | *nothing* |

★ **THE SHIPPED DIAL'S TWO KEYS MOVE THE FRONT FIGHT AND LEAVE THE FIELD SPACING AND THE FINISH
ALONE.** Neither moves how close the field runs, and neither moves the leader's gap at the line.
`pulkLeaderBrake` is about twice `pulkChallengerBoost` on every quantity it does move.

★ **EVERY CAP IN THE PULK MECHANISM IS SLACK — three raised arms give a BIT-IDENTICAL race on all ten
tracks.** The realism envelope (both directions), the boost headroom raised, and the attacker slots
raised: same finishing order in all 300 races of each. **The game never reaches its own ceilings, so
those keys can only be turned DOWN — a dial built on them would have a dead half.** The attacker-slot
result also confirms by measurement the `[1, 2]` clamp found at source: 3 becomes 2, so nothing moves.

★ **AND `choreoIntensity` — which `defaults.js` itself calls "the future Action-slider backing" —
MOVES NOTHING.** It changes the race on all ten tracks in both directions and moves not one of the
five quantities readably. **If the dial was going to be built on that key, this says it cannot be.**

★ **Two levers run BACKWARDS from their names.** LESS `chaosSteerGain` gives MORE lead changes
(+7%, 10/0) and MORE gives slightly fewer. MORE `b2AttackHeroes` gives FEWER held passes (−5%) and a
TIGHTER front group (−8%) — though on a different window from the OUTCOME one that key was shipped
on, so it is a new fact beside the old claim rather than against it.

## OPEN

**Two of the twelve pieces were not reached.** The machine is a two-P-core laptop and the three
browser sweeps cannot overlap; A alone was a four-hour run and B another hour and a half.

- **L · does the camera's guess match the plan's beats** — not started. Its source half was
  established, though: `racePlanner.js` hands the authored plan to `comebackDetector.setPlan`, and
  the piece's question is whether the camera's own guess lands where the plan wrote the beat.
- **D · the item-7 gap** — not started. The chain's own fall order puts it last of the sweeps, and
  it is the cheapest of the three to run: it re-reads the 80-race set ITEM7-MEMBERSHIP-1 already has.

**Also open, and cheaper than either:** piece B ran **one seed**, not the four asked for. Its report
argues that adding seeds matters more than adding tracks, because which camera phase is running at
progress 0.93 is a per-RACE question.

## NEEDS HIS WORD

1. ~~**Does the acceptance of 2026-09-04 reach gate item 2?**~~ (piece K2) **ANSWERED 2026-09-05: it
   does.** Item 2 and item 9 measure the same behaviour under different names — a closing zoom that
   has not arrived at the crossing. Your acceptance of 2026-09-04 named item 9; you extended it to
   item 2 the next day, and `scripts/endgame-sheet.mjs` now tells that cause from any other one
   itself (PART TWO D27, GATE-WIRED-AND-CAUSED-1). **luger-hill and dirt-oval fail item 2 ALONE at
   seed 9, and both of those failures carry the accepted cause.** Which tracks the gate runs was not
   changed. *(Wording corrected 2026-09-05: this item said the two tracks were "excluded from the
   gate" and that "both exclusions lose their last reason". There is no exclusion mechanism —
   `GATE_TRACKS` names the two tracks the gate runs and eight are simply not named. The measured
   facts are unchanged.)*

2. ~~**Is 27 MB worth it?**~~ **ANSWERED 2026-09-05 — `date-fns` STAYS, PART TWO D29.** (piece J)
   Nothing in the image loads `date-fns`. The three clean ways to
   remove it are the ones the chain forbade — an `overrides` entry, dropping the session store, a
   version bump — and the only remaining route, deleting the directory in the Dockerfile, would leave
   the image's tree disagreeing with its own manifest. That is the anonymous-volume defect one layer
   over, so it was **not** taken unasked.

3. **What should the deployed client's API address BE?** (piece I) This is the one thing standing
   between here and a one-command deploy, and it is a design question, not a configuration.
   `client/src/services/api.js:16-18` bakes `VITE_API_URL` in at **build** time with the fallback
   `http://localhost:4000`, and there is no `.env` anywhere in the tree. **Measured inside the image:
   its baked bundle carries exactly one occurrence of `localhost:4000` — that fallback.** So a
   visitor loading the app from a public origin sends every API call to *their own machine*, and the
   image is origin-specific: there is no one image and therefore no one command. Three options are
   laid out in [DEPLOY-NOTES.md](DEPLOY-NOTES.md) §2 and none is chosen.

4. **Does the closing phase end a BATTLE SHOT too?** (piece B) Your instruction of 2026-08-24 is that
   at the start of the closing phase whatever camera phase is running must be ended. On city-circuit —
   one of the two SHIP-gate tracks — the phase running at that moment is a **BATTLE_ZOOM with 98% of
   it still to come**, and your acceptance of 2026-09-04 protects exactly that shot: behaviour (ii),
   *"a battle shot may take the frame near the finish"*. **The two were given about different things,
   five weeks apart, and neither says which wins.** Building the cut as instructed would silently
   reverse an accepted behaviour on at least one track. Nothing was built and nothing is proposed.

5. **The deploy decisions that are not code:** a domain, which reverse proxy terminates TLS, and
   where the data lives. **The server has no TLS at all** — searched for, not assumed — and that is a
   design decision rather than an omission: it sets `trust proxy` and issues `__Host-` Secure
   cookies, expecting a terminator in front.

---

## A discrepancy in the chain's own ordering, recorded rather than guessed at

The header says the sweeps run "A, B, D, L — in that order". The per-piece annotations say A · start
first, B · second, **L · third**, D · fourth. The two disagree on D and L. The per-piece ordinals are
the more specific instruction, so the intended run order is **A, B, L, D**. Only B was reachable
tonight, so the disagreement cost nothing.

## Two things found at source before any measurement

**1. THE ACTION DIAL IS NOT UNBUILT.** `client/src/modules/storage/defaults.js` exports
`RACE_ACTION_STAGES` — a three-position selector (`quiet` / `medium` / `wild`) applied by
`client/src/modules/raceActionStage.js`, judged on a production build and accepted **2026-08-24**. It
maps onto exactly **two** keys: `pulkChallengerBoost` and `pulkLeaderBrake`. So piece A's question is
not "what should a dial map onto" from nothing — it is "are those the right two, and what do the
other twelve candidates do". The answer is in the piece-A block above, and in its report.

**2. `contestWindowStart` IS NOT AN ACTION LEVER and is excluded from piece A with reason.** It sets
`plan._contestWindowStart` (`client/src/modules/racePlanner.js:401`), which only
`scripts/sim/observers/outcome-front-battle.mjs` reads. No engine path reads it: moving it moves the
MEASUREMENT WINDOW, not the race. `docs/SWEEP-HARNESS.md:167` already says so. Sweeping it would have
produced a table of a ruler measuring itself.

## What stands from the previous sheet

The hygiene phase is closed; the durable version is
[BACKLOG.md → THE HYGIENE PHASE IS CLOSED](BACKLOG.md).
