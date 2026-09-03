# SPEC-AND-GATE-1 — the dead premise has THREE live sites, one of them a sentence an instrument prints beside the number that refutes it

> **READ-ONLY. Nothing was edited, silenced or fixed.** One measurement was taken —
> `camera-fingerprint.mjs` at full weight, 25.8 s — because the central claim needed a number and not
> a citation. Tree clean at start and at end.

---

## 0. THE ANSWER IN FIVE LINES

- **The spec is red because ONE commit killed BOTH of its premises**, not one: `d73ec6a9`
  (GARDEN-PATH-DEFAULTS-1, 2026-08-25) changed garden-path's default racer **snail → beetle** *and*
  its default laps **4 → 2**, in the same commit.
- **The assertion is still worth making — about every track, not about the beetle**, and not in a
  browser. SPEC-AND-INERT-1 already wrote the correct form; §3 states it and does not re-derive it.
- **The first test should be DELETED and the second REPLACED**, and §3 says what is lost.
- **The guard half that was inert is NOT inert any more.** FP-COMPARE-2 gave all three fingerprint
  instruments `--check` through one shared implementation on 2026-09-02. §4 establishes what it was
  meant to catch and what catches it now.
- ★ **But the SAME dead premise is holding a different gate weaker than the tree can support, and
  the instrument PRINTS the dead premise as a sentence, two lines below the measurement that
  contradicts it.** §5. **That is the live finding.**

---

## 1. WHAT THE SPEC ASSERTED

`client/e2e/garden-path-finishes.spec.js`, two tests:

1. **"the product's own estimate for this track exceeds the harness ceiling."** It reads the setup
   screen's own per-lap duration estimate, takes the one at **2 laps** (*"the harness hardcodes 2 for
   EVERY closed track"*), and asserts it is **greater than 200 s** — `raceDriver.mjs`'s wall-clock
   ceiling. The point: *if the product's own estimate exceeds the harness's ceiling, the harness is
   cutting a race the product considers ordinary* — a comparison of the two paths' own numbers,
   needing no four-minute race.
2. **"and it actually crosses the line."** A real browser Quick Test on garden-path, polling the
   viewer probe's `crossed` latch, with a 1,500 s budget.

**The question behind them is real and is not garden-path's.** A race the driver cannot finish is not
reported as short — it returns `null` and **the track vanishes from the table**. That silence is why
somebody wrote a spec about it.

---

## 2. WHY IT IS RED — AND IT IS TWO PREMISES, NOT ONE

```
$ git show d73ec6a9^:server/seeds/tracks/garden-path.json   →  racer: snail   laps: 4
$ node -e "require('./server/seeds/tracks/garden-path.json')" →  racer: beetle  laps: 2
```

`d73ec6a9` — *"feat(GARDEN-PATH-DEFAULTS-1): garden-path defaults to the BEETLE and to 2 LAPS"* —
moved both, 2026-08-25.

| the spec's premise | what killed it |
| --- | --- |
| the 2-lap estimate **exceeds** 200 s | the **beetle** is fast enough that it no longer does — the assertion now runs backwards |
| *"THE TRACK'S OWN DEFAULT … is 4 laps here"*, against a harness that hardcodes 2 | `defaultLaps` **is 2**. The harness's hardcoded 2 IS the track's own default, so the mismatch the comment describes is gone |

**The second is the more interesting one**, because it is not the assertion — it is the spec's own
explanatory comment, and it would still read as true to somebody skimming. The test would be red;
the reason a reader would take away would be wrong.

---

## 3. WHAT THE CORRECT SPEC WOULD SAY — AND IT IS ALREADY WRITTEN

**SPEC-AND-INERT-1 §A3 set this out in full on 2026-09-02, and nothing has changed underneath it.**
Restating it here would be a second home for one answer, so this piece points instead and records
only what it re-checked:

- **Where:** `scripts/raceDriver.test.mjs`, not `client/e2e/`. The e2e specs are night-run by hand
  and wired into nothing automated; `script-suite` runs on every `verify` and in CI. **Re-checked
  today:** that file exists and still asserts against `resolveIdentity`, `buildRace`, `loadTracks`
  and `runRace`, so this is R13's "a rule inside a file that already reads this ground".
- **What:** every track's realized duration must fit the driver's own ceiling **with the slow-motion
  dilation counted** — a budget of 160 s against the printed 200, because `ts` outruns race time by
  up to 1.21× under `hooks.slowmo`. A PROPERTY over ten tracks, at zero race cost.
- **Plus:** that the driver's hardcoded lap count still agrees with each track's `defaultLaps` —
  which is precisely the premise that died here, made into an assertion instead of a comment.

**Test 1 should be DELETED, and what is lost is small and worth naming:** it read the *product's*
estimate off the setup screen, which the replacement does not — the replacement reads
`built.meta.realizedDurationSec` from the driver. If the two ever disagree, only the browser test
would have seen it. **Nothing measures that disagreement today and nothing did before**, because the
browser test asserted a threshold rather than the agreement.

**Test 2 should NOT be kept as it stands.** Its assertions are sound; its prose is false in three
places and its 1,500 s budget was sized for a **424 s snail race that no longer exists**. A budget
25× the race is not generosity, it is a test that cannot fail for the reason it was written.

**Applied: nothing.** The brief asked for the answer, not the edit.

---

## 4. THE INERT GUARD HALF — WHAT IT WAS FOR, AND WHAT CATCHES IT NOW

**What it was meant to catch.** `camera-fingerprint.mjs` and `render-fingerprint.mjs` computed a
hash, printed it, and **exited 0 whatever the hash was**. CENSUS-CHECKS-1 established it by count
rather than by reading: `--check` appeared **4×** in `fingerprint-default.mjs` and **0×** in both
others. So two of the three instruments guarding the picture were log lines, and "the fingerprint did
not move" rested on a person reading two 16-character strings.

**What catches it today: the guards themselves.** FP-COMPARE-2 (2026-09-02) gave all three the
comparison through **one** implementation — `scripts/lib/fingerprintCheck.mjs` — rather than a third
copy, and `verify.mjs`'s `commandFor` passes `--check` for all three ids. Proven by
`scripts/lib/fingerprintCheck.test.mjs` (failure paths first) and by a wired sabotage on the camera
instrument.

**So the honest answer to this half is: it is repaired, and this piece re-establishes rather than
re-discovers it.** Re-checked today: `camera-fingerprint.mjs` calls `checkAgainstRecord({ role:
"camera", … })`, and tonight's runs of all four roles compared against the record and matched.

**Nothing is left uncovered by that half.** Which makes the next section the piece's actual finding.

---

## 5. ★ THE SAME DEAD PREMISE IS HOLDING A GATE OPEN — AND THE INSTRUMENT PRINTS IT

`camera-fingerprint.mjs` refuses to print a hash if **no** track produced a FINISHED frame. Its
comment explains why the bar is "at least one" and not "every":

> *"It is "at least one track", not "every track". **garden-path does not finish inside the harness's
> 200 s wall-clock ceiling, so it has no ending to sample and never did**; demanding all ten would
> fail on a race that is simply too long."*

**Measured tonight, full weight, 25.8 s:**

```
CAMERA 152cf295c4c9ff54 (seed=5601 camSeed=1439767152, 10 tracks, 40 racers, default config)
  city-circuit     …  5346 frames  (300 after the last crossing)
  dirt-oval        …  5888 frames  (300 after the last crossing)
  garden-path      …  4916 frames  (300 after the last crossing)
  …
  THE ENDING IS IN THIS HASH — 10 of 10 tracks contributed FINISHED frames.
  The window is endingOnRaceScreenMs(), the same arithmetic RaceScreen navigates away on.
  garden-path does not finish inside the 200 s ceiling, so it has no ending to sample.
```

**Read the last three lines together.** The instrument prints, in one block:

- **10 of 10** tracks contributed FINISHED frames — computed;
- **garden-path: 300 frames after the last crossing** — computed;
- **"garden-path does not finish inside the 200 s ceiling, so it has no ending to sample"** —
  a hardcoded string, printed unconditionally, **two lines below the number that refutes it**.

**This is the week's defect in its purest form**, and it is not in a document: a sentence and the
measurement that contradicts it, emitted by the same program, on the same screen, every run. Nothing
can go red over it because nothing compares a `console.log` string to the row above it.

**The consequence is not cosmetic.** The false sentence is the stated REASON the gate is
"at least one track". With the premise dead, the tree supports the stronger form SPEC-AND-INERT-1
proposed — **every track must contribute FINISHED frames** — and a stronger gate is the difference
between noticing that one track stopped reaching its ending and not noticing.

**Three live sites of one dead premise:**

| # | site | what it says | status |
| --- | --- | --- | --- |
| 1 | `client/e2e/garden-path-finishes.spec.js` | the whole spec, plus its "4 laps" comment | **RED**; §2 |
| 2 | `scripts/camera-fingerprint.mjs`, the gate comment | justifies "at least one track" | **false**, and load-bearing |
| 3 | `scripts/camera-fingerprint.mjs`, the printed summary | told to the reader on every non-quiet run | **false**, and printed beside its own refutation |

**Applied: nothing**, per the brief. **All three are on the morning sheet.**

---

## Limits

**One camera-fingerprint run, one seed, one camera seed.** `seed=5601`, `camSeed=1439767152` — the
harness's pinned camera seed, which HARNESS-CAMERA-SEED-2 recorded as not being the browser's. "10 of
10 contributed FINISHED frames" is true of this configuration; a different seed could in principle
produce a race that does not finish, which is exactly what a per-track gate would catch and the
current one would not.

**I did not run the spec.** Its redness is established from the two default changes and the
assertion's direction, not from a Playwright run — the browser suite is night work and the second
test budgets 1,500 s. If the estimate happens to sit near 200 s the first test could be red for a
narrower reason than the one given here; the direction of the change is not in doubt, its margin is.

**Nothing here re-establishes FP-COMPARE-2.** §4 reports a repair that landed the night before and
re-checks two facts about it. If that repair were wrong, this piece would not have found out.
