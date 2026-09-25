# COMEBACK-THROUGH-THE-SAME-DOOR — the fixture was wrong one level deeper, and the camera is fine

**2026-09-26. A measurement.** No camera source, no race plan, no default and no assertion was
changed. The spec's FIXTURE was re-pinned, which step 2 of the block instructs where this case fires.
The four fingerprints are unmoved.

## The one plain sentence

★★ **A comeback shot can and does occur in an ordinary race today.** Over twelve seeds driven through
the browser, **seven cast a comebacker and the camera cut to every single one of them**. Nothing is
broken in what the owner sees.

## What the night left, and the confound

NIGHT-2026-09-26 PIECE 3 re-pinned `comeback-precedence` to space-sprint seeds 2, 3 and 5 — each
confirmed by `scripts/diag/comeback-beats.mjs` as casting a comebacker — and all three produced no
`COMEBACK_ZOOM` in the browser at all. Two readings were open: either the browser's race casts no
comebacker either (a fixture problem, one level deeper), or it does and the camera never cuts (a
defect in what he sees).

★ **The confound that made the night's conclusion unsafe:** the diag races **40 synthetic racers**;
the Quick Test races **20 real ones** — and in this project **a racer's NAME is physics**
(`stablePairBit` hashes `r.name`). The same seed through those two doors is **two different races**
with two different casts. The diag confirmed a comebacker in *its* race and said nothing about the
race the spec drives.

## Step 1 — reading the plan the BROWSER built

**The cast is already observable in the browser and nothing new was added to the product.** The chain
is `racePlanController.getHeroRoles()` (`racePlanner.js`) → `RaceScreen/index.jsx` writes it into the
governor-diag snapshot → `GovernorDiagHUD.jsx` prints each front racer's authored role. It is switched
on by the existing camera-config key `showGovernorDiag`. `client/e2e/comeback-cast-probe.spec.js`
reads it out of a real Quick Test, alongside the camera-state recorder copied from
`comeback-precedence.spec.js`.

★ **Its one limit, stated so the result is not over-read:** the panel prints the **front six** racers.
A role appearing is decisive; a role not appearing means either *not cast* or *cast and never
arrived*. The rate below is therefore a floor, not an exact figure.

**Result on the night's three fixtures — CASE (A):**

| seed | comebacker in the browser | `COMEBACK_ZOOM` |
| --- | --- | --- |
| 2 | **no** | no |
| 3 | **no** | no |
| 5 | **no** | no |

The instrument was working: it read `sovereign-lead` on all three and `faller` on seed 2. The
browser's race at those seeds simply casts no comebacker.

## Step 2 — the sweep through the right door

Twelve seeds in total, each a real browser Quick Test on the production arm. Nine were run after the
first three; the three casting fixtures the budget allowed for were found immediately, and the sweep
was run out to twelve anyway because **the rate is worth more than the fixture**.

| seed | casts a comebacker | cut to it |
| --- | --- | --- |
| 1 | **yes** | **yes** |
| 2 | no | no |
| 3 | no | no |
| 4 | **yes** | **yes** |
| 5 | no | no |
| 6 | no | no |
| 7 | no | no |
| 8 | **yes** | **yes** |
| 9 | **yes** | **yes** |
| 10 | **yes** | **yes** |
| 11 | **yes** | **yes** |
| 12 | **yes** | **yes** |

★★ **THE CASTING RATE: 7 of 12 — 58%.** And the correlation is **perfect in both directions, 12 of
12**: every race that cast a comebacker cut to one, and every race that cast none produced no comeback
shot. **The camera loses nothing.** Whatever the plan casts, the picture shows.

★ This also disposes of the reading that the camera's comeback path might be dead: it fires in seven
separate races here.

## Re-pinned, and the lesson written into the spec

`comeback-precedence.spec.js` now pins **space-sprint seed 1**, chosen by running the browser rather
than the harness. Only the fixture changed; no assertion was touched. Its header carries the lesson:
**a harness diag cannot validate a browser fixture**, and the next person to move the pin is told to
move it with the probe.

## Three runs on the new fixture — and the residual, which is NOT what the night thought

| run | comeback entries | result |
| --- | --- | --- |
| 1 | one, from `LEADER_ZOOM`, held **7846 ms** | FAIL |
| 2 | one, from `BATTLE_ZOOM`, held **4614 ms** | **PASS** |
| 3 | one, from `LEADER_ZOOM`, held **7824 ms** | FAIL |

★★ **The night's failure mode is GONE.** *"The race never cut to a comeback at all"* passed **3 of 3**
— every run produced a comeback shot. The second assertion, that no comeback cut out of a
`LEAD_CHANGE`, also passed **3 of 3**.

★★ **What still fails is the PRECEDENCE SIGNATURE, and the two failures are inside the real gate.**
The hold the spec reasons about is `max(minStateHold, maxStateDuration)` = **8000 ms** for
`LEADER_ZOOM` and `BATTLE_ZOOM`. The spec asserts a cut inside **7500 ms** — a deliberately tighter
margin, so that HUD fade jitter can never turn a gate-elapsed cut into a false claim of an interrupt.
**Runs 1 and 3 cut at 7846 and 7824 ms: below the 8000 ms gate, so both beat it and are interrupts by
the gate's own arithmetic — and outside the spec's 7500 ms margin, so the spec cannot say so.**

★ **Why it varies run to run on one seed.** The camera is **not deterministic from the race seed** —
it carries its own random stream, and which state precedes the comeback (`LEADER_ZOOM` in two runs,
`BATTLE_ZOOM` in one) and how long that state had been held both move between runs of the same
fixture. So this is not a property of seed 1; it is a property of the assertion's margin meeting a
non-deterministic camera.

**No assertion was touched, per the block.** The spec is left intermittently red — 1 of 3 here.

## What this establishes, and what it does not

**Established:**
- The browser casts a comebacker in **58%** of seeds, and cuts to **100%** of those.
- The night's fixture was invalid for the browser, and so was the method that chose it.
- The remaining redness is the spec's **7500 ms margin** against a non-deterministic camera, not a
  missing shot and not a broken precedence.

**NOT established, and deliberately not chased:**
- Whether 7500 ms is the right margin. Widening it is an assertion change and this block makes none.
- Whether the 58% rate is the same on other tracks. Only space-sprint was swept.
- Whether a cast comebacker who never reaches the front six exists in the five non-casting seeds —
  the probe cannot see him, which is why the rate is a floor.

**No recommendation is offered.**
