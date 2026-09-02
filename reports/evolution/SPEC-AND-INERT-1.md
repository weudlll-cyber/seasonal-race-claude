# SPEC-AND-INERT-1 — the dead spec's question is still live but belongs on ten tracks in the script suite, not on one track in a browser; and the two inert fingerprint halves would compare against roles that MATCH the tree tonight, so the repair lands green

**Date:** 2026-09-02 · **READ-ONLY. PROPOSE ONLY.** Nothing was edited, staged, committed or
branched. `git status` was clean at start and at end. The two findings are left exactly as they
were. Three read-only instrument runs were made (§B3) and one scratch file was written and deleted.

---

## 0. VERDICT IN SIX LINES

- **The spec's premise is dead and its question is not.** It asked *"is the harness cutting a race
  the product considers ordinary?"* — a real property, asked about one track, in the one runner that
  gates nothing. Today it is true of no track and would be true of any track an operator edits.
- **The correct spec asserts the property over all ten tracks, in `scripts/raceDriver.test.mjs`**,
  at zero race cost, plus a second assertion that the driver's hardcoded lap count still agrees with
  `trackDefaultLaps`. **Both are proposed in full at §A3.**
- **The first test should be DELETED, not rewritten** (§A3d), and what is lost is named.
- **The second test should NOT stay as-is** (§A4): the assertions are right, the surrounding prose is
  false in three places and its timeouts were sized for a 424 s snail race that no longer exists.
- **`--check` is still 0 in both files.** Re-counted tonight on the working tree: 4 in
  `fingerprint-default.mjs`, **0** in `camera-fingerprint.mjs`, **0** in `render-fingerprint.mjs`.
  No repair has landed. Nothing to pivot to; the whole finding stands.
- **A new fact that makes the repair safe and one gate tightenable:** I measured both hashes tonight
  and **both MATCH the record**. And `camera-fingerprint` now produces FINISHED frames on **10 of 10**
  tracks, including garden-path — so its "at least one track" gate can become "every track", and the
  sentence in its own output denying that garden-path finishes is rotten in the same way the spec is.

---

# A. THE ROTTEN SPEC

## A1. What it was actually asserting, and the question underneath

**The assertion**, `client/e2e/garden-path-finishes.spec.js:60-63`:

```js
expect(
  atHarnessLaps.seconds,
  'if the product estimated UNDER the ceiling, the ceiling could not be the cause'
).toBeGreaterThan(HARNESS_CEILING_S);   // HARNESS_CEILING_S = 200, spec:28
```

`atHarnessLaps.seconds` is read off the running product: `data-testid="closed-track-estimated-duration"`
(`SetupScreen.jsx:951`), which renders `raceDurationModel.realizedDurationSec` (`:351`), at the lap
choice the harness hardcodes — 2, not the track's own default.

**The underlying question is stated in the spec's own header**, `:19-22`: *"If the product's estimate
exceeds the harness's 200 s ceiling, the harness is cutting a race the product considers ordinary —
and that is a comparison of the two paths' own numbers, needing no four-minute race to make it."*

So the question is **not** "does garden-path finish". It is **"does the measurement harness silently
discard a race the product regards as normal?"** — and the spec's contribution was to settle it by
arithmetic rather than by a four-minute race, because the alternative (the second test) costs
minutes.

**Its origin.** Introduced by `bb58055b` (`diag(GARDEN-PATH-NO-FINISH-1)`, 2026-08-25) — the only
commit that has ever touched the file. `reports/evolution/GARDEN-PATH-NO-FINISH-1.md` §1 records the
numbers it was written to pin: 1 lap 106 s, **2 laps 212 s — over the ceiling by 12 s**, 3 laps 318 s,
4 laps 424 s. The report's §1 table and the spec are the same measurement, one taken by hand and one
made repeatable. `git log --oneline --all --grep=GARDEN-PATH-NO-FINISH` returns `bb58055b` and the
merge `8834d7fc`; the successor line is `d73ec6a9` (GARDEN-PATH-DEFAULTS-1) and `4f815bf2`
(HARNESS-LOUD-ZERO-1).

**Why it died.** `d73ec6a9`, 2026-08-25 — the same day — changed `defaultRacerTypeId` `snail` →
`beetle` (M 0.30 → 0.90) **and** `defaultLaps` `4` → `2`. Measured 2026-09-02: 35 / **71** / 106 /
141 s at 1–4 laps. Every lap choice is now under 200. The assertion inverted; the spec's own
parenthetical is now the reading of its own failure.

## A2. Is the assertion still worth making about the beetle?

**About the beetle specifically: no. About the harness: yes, and more than before.**

Three facts decide it, all established 2026-09-02:

1. **The symptom is gone on every track.** `reports/evolution/GARDEN-PATH-FINISH-1.md` §1: **ten of
   ten tracks finish 40/40** through `raceDriver.runRace`, in both the slowmo and non-slowmo arms.
   Worst cell dirt-oval under slowmo at **6,785 / 12,000 frames = 56.5%**. There is no near-miss. An
   assertion about garden-path alone now guards the track with the *second largest* margin
   (garden-path 44.7%), not the smallest.
2. **The ceiling the spec names is the wrong number.** `raceDriver.mjs:363` calls it *"a 200 s
   wall-clock ceiling"* and the spec quoted that at face value (`spec:27`). There is no real-time
   source in the file — `ts` is a synthetic 60 Hz frame clock (`:423`,
   `while (st.finishedCount < identity.racers && ts - raceStart < 200000)`). Without slowmo the bound
   *is* 200.0 s of race; **with slowmo, 12,000 frames buy only 165–178 s**, so the effective ceiling
   for the 24 harnesses that pass `slowmo: true` is **~165 s, 17% below the figure the spec asserts
   against**. A spec that compares to 200 would pass a track sitting at 180 s that the harness would
   in fact discard.
3. **The mechanism is unarmed, not repaired.** GARDEN-PATH-FINISH-1 §7: garden-path forced back to
   the snail still gives `12001/12000 frames, 0/40 finished, NULL — DISCARDED, silently`. dirt-oval
   breaches below racer multiplier **M ≈ 0.57** and its horse is 1.00. The Track Manager can restore
   the failure from the UI, with no code change and no signal — which is the project's own
   "everything must be UI-configurable" principle pointed at its own instrument.

**So the assertion is worth making, and its subject is the harness, not the beetle.** It should be a
PROPERTY over all ten tracks (R7: *"prefer one test that asserts a PROPERTY over several that assert
instances"*), and it must be checked against the slowmo-effective bound, not the printed 200.

**Nothing catches this today, and here is the control.** `grep -rn "200000\|200_000"` over every
`*.test.mjs`, `*.test.js` and `*.spec.js` under `scripts/` and `client/` returns exactly **one** line:
`client/e2e/garden-path-finishes.spec.js:27` — the dead spec's own comment. The grep is proven
capable of finding a hit in that file set (it found that one), so the zero elsewhere is a measured
absence, not a failed search.

## A3. What the correct spec would say

**Where it goes, and why not where it is.** `client/e2e/` is night-run by hand and is wired into
nothing automated (`docs/NIGHT-RUN.md` owns the decision; `reports/evolution/TESTS-WIRED-1.md` §1
proves the ten specs are out deliberately, not by accident). `scripts/**/*.test.mjs` is the
`script-suite` guard — routed by `npm run verify` and run by the CI docs job, which is never skipped.
Moving the question there converts an assertion that runs when somebody remembers into one that runs
on every merge. R13 is satisfied without a new guard: **`scripts/raceDriver.test.mjs` already exists**
and already asserts things about `resolveIdentity`, `buildRace`, `loadTracks` and `runRace`
(18 tests), so this is a rule added inside a file that already reads this ground.

### A3a — THE REPLACEMENT ASSERTION

```js
test("EVERY track's race fits the driver's own ceiling, with the slowmo dilation counted", () => {
  // raceDriver.mjs:423 bounds `ts`, a SYNTHETIC 60 Hz frame clock, at 200,000 ms = 12,000 frames.
  // It is not wall clock (there is no real-time source in that file), and under `hooks.slowmo` —
  // which 24 harnesses pass — `ts` outruns race time by up to 1.21x: dirt-oval ran 113.07 s of `ts`
  // for 93.32 s of race (GARDEN-PATH-FINISH-1 §3). 200 / 1.25 = 160 carries that plus headroom.
  // A race that does not finish is not reported as short — it is returned as `null` and the track
  // VANISHES from the table (GARDEN-PATH-NO-FINISH-1 §2). That silence is why this is a gate.
  const DRIVER_BUDGET_S = 160;
  for (const geo of loadTracks()) {
    const built = buildRace(geo, resolveIdentity({ racers: 40, seconds: 60 }), DEFAULT_CAMERA_CONFIG);
    const d = built.meta.realizedDurationSec;
    assert.ok(
      d < DRIVER_BUDGET_S,
      `${geo.id} runs ${d.toFixed(1)} s at the driver's own inputs (racer ` +
        `${geo.defaultRacerTypeId}, laps ${new EditorShape(geo).isOpen ? 1 : 2}); over ${DRIVER_BUDGET_S} s ` +
        `the driver discards the whole race silently and the track disappears from every sweep.`,
    );
  }
});
```

**What it catches that nothing catches today:** any edit — to a track's `defaultRacerTypeId`, its
`defaultLaps`, its `pathLengthPx`, or to a racer type's speed multiplier — that pushes **any** of the
ten tracks past the harness's real bound. That is precisely the 2026-08 garden-path failure, which
cost 360 races across three sweeps and was found by the owner's eye rather than by any check.
**Cost: zero race time.** `buildRace` resolves the duration model; it does not run the race. Ten
tracks of arithmetic.

**Its margin today**, so the assertion is not written blind: worst is dirt-oval at **87.2 s**, i.e.
55% of the 160 s budget; garden-path at 70.7 s, 44%. It goes red at roughly M ≈ 0.55 on dirt-oval.

### A3b — THE ASSERTION THE OLD SPEC ALSO IMPLIED AND NEVER MADE

```js
test("the driver's hardcoded lap count is the lap count the product runs", () => {
  // raceDriver.mjs:305 answers `laps: shape.isOpen ? 1 : 2` a question the product answers with
  // trackDefaultLaps(track) (SetupScreen.jsx:517 Quick Test, :280 Start Race). They agree on 5 of 5
  // closed tracks TODAY ONLY because d73ec6a9 moved garden-path's data to meet the hardcode; the
  // hardcode was never repaired (GARDEN-PATH-FINISH-1 §4, §6c).
  for (const geo of loadTracks()) {
    if (new EditorShape(geo).isOpen) continue;
    assert.equal(trackDefaultLaps(geo), 2,
      `${geo.id}: the product runs ${trackDefaultLaps(geo)} laps and every harness runs 2. ` +
      `Every camera and ending figure for this track was measured on a different race.`);
  }
});
```

**What it catches that nothing catches today:** an operator raising a closed track's `defaultLaps` in
the Track Manager — a supported, UI-configurable action — moves the product and not the harness, with
no signal at all. This is the *second* half of the 2026-08-25 divergence, and it was closed by moving
the data rather than by repairing the hardcode, so it is one Track-Manager edit from returning.
**Note deliberately:** this test goes red the day someone puts garden-path back on 4 laps. That is
correct. Red is the signal that has been missing.

### A3c — WHAT I DO **NOT** PROPOSE, AND WHY

- **Not a bound on the OPEN tracks' `identity.seconds`.** GARDEN-PATH-FINISH-1 §7 shows any harness
  passing `seconds ≳ 155` loses all five open tracks at once, and §6a shows all 15 harnesses pass the
  literal `seconds: 60`. A test asserting `60 < 155` asserts a literal against a constant and would
  never move. The live defect there is §6b (space-sprint runs 60 s where the product runs 90) — a
  coverage defect with its own owner decision, not a ceiling defect, and not this spec's question.
- **Not a new `check-*.mjs`.** R13: the rule fits inside a guard that already reads this ground.
- **Not a browser-side ceiling assertion of any shape.** Both sides of the comparison are node-side
  facts; a browser adds a runner and a flake surface and no information (see A3d).

### A3d — THE HONEST ANSWER ON TEST 1: DELETE IT

Everything test 1 does in a browser — launch Chromium, load `/setup`, cache track geometries, click
four lap tabs, read four rendered strings — exists to obtain four numbers that `deriveRaceDuration`
computes in microseconds. GARDEN-PATH-FINISH-1 §2b made exactly that point by deriving all four rows
as `laps × 4772.74 / (150 × 0.90)` and getting **35.35 / 70.72 / 106.06 / 141.42** against the
screen's 35 / 71 / 106 / 141 — agreement to the rounding on all four. The browser was not needed to
learn any of it. So test 1 is a slow, hand-run instance of an assertion that belongs, generalised, in
a suite that gates.

**What is lost by deleting it, stated rather than glossed:** it is today the **only** automated check
that `SetupScreen` actually renders the model's number — that `raceDurationModel.realizedDurationSec`
(`:351`) reaches `data-testid="closed-track-estimated-duration"` (`:951`) and is not, say, showing
`raceSettings.duration` from the `??` fallback on that same line. That is a real assertion and it is
worth keeping. **It is not a harness-ceiling assertion.** Its correct home is a SetupScreen component
test in the client suite — which gates every merge, where the e2e spec gates nothing — and the
proposal is that whoever deletes test 1 writes that one line there in the same commit. If that is not
done, the deletion is a net loss of one real check, and I would rather that be said than discovered.

## A4. The second test — it should NOT stay as-is

**Its assertions are still right and still worth having.** It is the browser half of a comparison the
project genuinely needs — GARDEN-PATH-FINISH-1 §2 shows both the driver and `goldenRunner.realArm`
finish garden-path, and this is the only evidence that the *product* does. Measured tonight:
`field=20 FIRST CROSSING after 121.3 s of wall clock; 11 finish time(s)`.

**Three things around the assertions are now false or badly sized:**

1. **The file header is orphaned and false in three places.** `:5-9` states the premise as *"Three
   headless sweeps recorded garden-path producing NO finishing order — 16 of 16, then 0 of 120"*;
   `:19-22` explains a comparison that no longer exists; `:15` says *"TWO TESTS, AND THE FIRST IS THE
   ONE THAT SETTLES IT"*. With test 1 deleted, all of that describes a file that is gone. The header
   must be rewritten to what the surviving test is for: **the product finishes garden-path in a real
   browser, which is the owner's 2026-08-25 observation kept live.**
2. **The budgets were sized for a 424 s snail race.** `test.setTimeout(1_800_000)` (30 min) and the
   crossing poll's `timeout: 1_500_000` (25 min) were correct against the 578 s wall-clock first
   crossing GARDEN-PATH-NO-FINISH-1 §1 recorded. The race is now 70.7 s and it measured 121.3 s of
   wall clock. A 25-minute poll on a 2-minute observation means a genuine hang costs 25 minutes of a
   suite whose whole objection is that it costs ten. **Propose 300,000 ms** — 2.5× the measured
   121.3 s, with the measurement and its date in the comment so the next reader can re-size it
   instead of doubling it again.
3. **`HARNESS_CEILING_S` and the `:27` comment become dead** with test 1 gone, and `:27` is the line
   that propagated `raceDriver.mjs:363`'s "wall-clock" misnomer into a second file. Delete both.

**One strengthening worth proposing separately, not folded into "keep":** the test asserts the FIRST
crossing and stops. GARDEN-PATH-FINISH-1 §8 lists *"I did not measure the last finisher in a real
browser"* as an open limit, and this is the only instrument that could close it. Eleven of twenty
were already home at the first crossing, so the extra wall clock is small. Changing the poll to
`finishedCount === fieldSize` would close a named gap; it is a change to what the test asserts and so
is the owner's to order, not mine to fold in.

---

# B. THE INERT GUARD HALF

## B0. Status check — nothing has been repaired

Re-counted on the working tree tonight, `grep -n -- "--check"`:

| script | occurrences of `--check` |
| --- | --- |
| `scripts/fingerprint-default.mjs` | **4** (`:108`, `:112`, `:131` filter, `:321`) |
| `scripts/camera-fingerprint.mjs` | **0** |
| `scripts/render-fingerprint.mjs` | **0** |

Identical to CHECKS-FIRE-1 §3 and to `docs/MORNING.md:101-103`. **No other piece has landed this
repair in the working tree.** No pivot is needed; the finding below is the whole finding.

## B1. What the headline half was meant to catch, precisely

**The intended comparison, named by the sibling that has it.** `fingerprint-default.mjs:303-360` is
the template, and its own header says what the missing half is for:

> *"THIS GUARD MEASURED AND DID NOT CHECK, and it cost a day. On 2026-08-14 a renamed column moved
> this hash off its recorded value; `npm run verify` ran the world fingerprint, PRINTED the new
> number, and reported PASS 13 FAIL 0. CI was green… An instrument that emits a value nobody compares
> is not a guard. It is a log line."*

So the intended comparison is exactly: **the hash measured on this working tree, against the value
stored in the corresponding role of `docs/fingerprints.json`** — `camera` for
`camera-fingerprint.mjs`, `render` for `render-fingerprint.mjs`. Both roles exist and both were
minted 2026-09-02; both carry a `reproduce` command (`node scripts/camera-fingerprint.mjs --quiet`
and `node scripts/render-fingerprint.mjs --quiet`) that names the exact invocation whose output is
supposed to equal the stored value. **The record already declares the comparison. Nothing performs
it.**

What each hash covers is `docs/SHIP-CEREMONY.md` § THE THREE FINGERPRINTS' own table:
camera = *"the DIRECTOR's decisions: state, phase, anchor, zoom, offsets, camT, targets"*;
render = *"the DRAW CALL SEQUENCE: sprite placement, text, styles, transforms, layer order"*.

**The specific class of defect that is undetectable today**, from the same document: *"**Camera
counts** (FINISH-COMPANY-1): a camera-only diff moved this hash off `b6591e74…`, because the director
decides the transform on every drawn frame."* So a camera change that moves the **picture** without
moving the **director's decisions** passes both guards today with a printed hash and a PASS.

## B2. Does anything else catch it? No — with the control

`grep -rn "fingerprints.json" scripts/ .github/ .githooks/ client/src`:

| site | what it does |
| --- | --- |
| `scripts/fingerprint-default.mjs:328` | **reads the record and compares** — the only one |
| `scripts/check-fingerprints.mjs:86` | reads the record for **CONTAINMENT** — that no *current value* is copied outside it. It never measures anything, so it cannot know whether the tree still produces that value. |
| `scripts/check-fingerprints.test.mjs`, `scripts/fingerprint-default.test.mjs`, `scripts/lib/cheapMode.mjs`, `scripts/sim-fairness.mjs:4768`, `.github/workflows/ci.yml:287`, `.githooks/pre-commit:164`, `client/src/modules/camera/CameraDirector.js:29` | comments, tests of the above, and the hook's printed advice |

**The control:** the same grep, run the same way, **does** return the comparison site
(`fingerprint-default.mjs:328`). So the technique demonstrably finds a comparison when one exists,
and its silence on `camera` and `render` is a measured absence.

Second control, from the other direction — `grep -rn "camera-fingerprint\|render-fingerprint"` over
`scripts/*.mjs`, `scripts/lib/`, `.github/workflows/`, `.githooks/`, `package.json`,
`docs/NIGHT-RUN.md`: the only *executing* references are `scripts/verify.mjs:288-289` (the `--cheap`
forwarding list) and `scripts/gen-ceremony-costs.mjs:118-124` (which times them for the cost table).
`scripts/verify.test.mjs` mentions them six times and every one asserts **routing** — whether the
guard is *selected* for a given diff — never that it can fail. Everything else is a comment.

**And `verify` cannot ask for a comparison even if it wanted to.** `commandFor()`
(`scripts/verify.mjs:294-332`) hands `--check` to `world-fingerprint` and `engine-reach-doc`,
`--check-counts` to `ceremony-counts`, and for everything else returns
`base = ["node", g.source, ...(cheap ? cheapArgs() : [])]`. With no `--cheap`, the spawned command is
literally `node scripts/camera-fingerprint.mjs` / `node scripts/render-fingerprint.mjs`.

## B3. What a working version would compare, and what it costs

**The comparison, stated exactly.** For each script, after `COMBINED` is computed
(`camera-fingerprint.mjs:344`, `render-fingerprint.mjs:719`) and before it is printed:

```
read docs/fingerprints.json  ->  roles.camera.value   (resp. roles.render.value)
compare it to COMBINED
  differ  -> FAIL, print BOTH values and the per-track hashes already computed, exit 1
  equal   -> pass, print as today
  no role in the record   -> FAIL (Lesson 187: a check with nothing to check against is a no-op
                             wearing a guard's name)
  under --cheap           -> SKIP, and SAY SO — the cheap hash is prefixed by cheapHash() precisely
                             so it cannot impersonate a 16-hex record value
```

That is `fingerprint-default.mjs:321-360` transplanted with one changed role name. The `--cheap`
skip, the missing-role failure and the "a FAILURE HERE IS NOT ALWAYS A BUG — a deliberate ship SHOULD
fail this until the value is minted" wording all carry over unchanged. `commandFor()` then needs the
two guard ids added to the `--check` branch it already has for `world-fingerprint`.

**Cost per run — from the generated table, not guessed.** `docs/SHIP-CEREMONY.md`'s
`gen-ceremony-costs.mjs` block, measured on commit `b1a3bb1b`, 2026-08-11 08:37 UTC, on `Testrechner`:

| guard | generated cost |
| --- | --- |
| `scripts/fingerprint-default.mjs` — world | **117 s** |
| `scripts/camera-fingerprint.mjs` — camera | **57 s** |
| `scripts/render-fingerprint.mjs` — render | **54 s** |

**The marginal cost of the repair is zero, and this is the point.** Both scripts already run to
completion under `verify` and already compute `COMBINED`; the addition is one `readFileSync` of a
~1 KB JSON and one string comparison. The 111 s of combined cost CENSUS-CHECKS-1 objected to is
already being paid — the repair changes only whether the value that cost buys is compared to
anything.

**A caution the document raises about its own table, carried here rather than restated as fact:**
SHIP-CEREMONY says *"NOTHING RUNS THE STALENESS CHECK, and the block above drifted inside its own
tolerance… Two of the three fingerprint rows were out by more than a factor of two while the clock
still read fresh."* Consistent with that, my own runs tonight on this machine printed
`[ra-elapsed-ms 19829]` (camera, **19.8 s**) and `[ra-elapsed-ms 28389]` (render, **28.4 s**) — both
well under the generated column. **That is a different machine, not a correction**; the table's own
rule is that the number is re-measured by the generator, not typed by a reader.

**The finding that makes the repair safe to land, measured tonight.** I ran both instruments at their
recorded `reproduce` invocations against the clean working tree and compared each to its role:

| role | measured vs `docs/fingerprints.json` |
| --- | --- |
| `camera` | **MATCH** |
| `render` | **MATCH** |

(The values are not written here — `docs/fingerprints.json` is their one home, and
`check-fingerprints` enforces it.) **So a `--check` added today passes on the first run and needs no
re-mint and no ceremony.** That is the one thing that could have made this a bigger job than the
census called it, and it is not the case.

## B4. The split inside `camera-fingerprint.mjs`, stated precisely

**The LIVE half — `scripts/camera-fingerprint.mjs:330-341`.**

```js
const withEnding = rows.filter((r) => r.endingFrames > 0);            // :330
if (!CHEAP && !ENDING_OFF && withEnding.length === 0) {               // :333
  console.error("\nFAIL: NOT ONE TRACK produced a FINISHED frame, …"); // :335
  process.exit(1);                                                     // :340
}
```

It is a **proof-of-live on the ending WINDOW**, not on the hash: it asserts that the loop still
reaches the thing the instrument claims to cover. Proven to fire — CHECKS-FIRE-1 §3 forced
`endingOnRaceScreenMs()` to return `0` and got exit **1** with that exact message. It is guarded off
in the two arms where zero is the expected answer (`--cheap`, `--ending-off`).

**The INERT half — everything from `:344` on.** `COMBINED` is computed at `:344`, printed at `:349`
(quiet) or `:353` (verbose), and compared to nothing. So:

> **The guard can go red for exactly one reason: the ending window has collapsed to zero frames on
> all ten tracks at once. It cannot go red because the camera moved — which is the only thing its
> name promises.**

**`render-fingerprint.mjs` has no live half at all.** Verified tonight rather than quoted: the file
contains **zero** occurrences of `FAIL`, `throw` or `assert`. Its `process.exit` calls are `:93`
(`--declare`), `:638`, `:642` (`--ops=`), `:677` (`--phases`) and `:705` (`--coverage`) — and the only
`exit(1)` among them, `:638`, is inside `if (OPS_FOR)` and reached only by `--ops=<unknown-track>`, an
argv `verify` never passes. Under the argv `verify` gives it, **every** exit is 0. CENSUS-CHECKS-1's
classification is exactly right.

### B4a — A NEW FINDING: the camera gate's own rationale has rotted, and the gate is now tightenable

`camera-fingerprint.mjs:327-328` justifies the "at least one track" form:

> *"It is 'at least one track', not 'every track'. **garden-path does not finish inside the harness's
> 200 s wall-clock ceiling, so it has no ending to sample and never did**; demanding all ten would
> fail on a race that is simply too long."*

and `:363-364` prints the same claim to the operator on every run. **I ran the guard tonight. Its own
output contradicts it, two lines apart:**

```
  garden-path      a7d5…  4916 frames  (300 after the last crossing)
  …
  THE ENDING IS IN THIS HASH — 10 of 10 tracks contributed FINISHED frames.
  …
  garden-path does not finish inside the 200 s ceiling, so it has no ending to sample.
```

**All ten tracks contributed 300 ending frames each, garden-path included.** The rationale is the same
rot as the spec — a true sentence left standing while `d73ec6a9` moved the thing it described — and
it is load-bearing twice over: it is the reason the gate is weak, and GARDEN-PATH-NO-FINISH-1's
morning note cited this very sentence as evidence that *"the repository already knew"*. The repository
now knows something else and this sentence still says the old thing.

**The proposal, which costs nothing and needs no run:**

```js
// TEN OF TEN, measured 2026-09-02: every track now reaches its ending inside this loop's own
// bound (garden-path 4916 frames, 300 after the last crossing). "At least one" was correct while
// garden-path raced a snail at 4 laps; d73ec6a9 (2026-08-25) ended that.
if (!CHEAP && !ENDING_OFF && withEnding.length !== rows.length) { … exit 1 … }
```

**What it catches that nothing catches today:** a change that stops **one** track reaching its
ending. Under `withEnding.length === 0` that is invisible — nine of ten still satisfy it — and the
hash silently stops covering the ending on that track. CHECKS-FIRE-1 §3 already recorded the
dependency in the abstract (*"a repair to the finish problem would let this gate be tightened, and
nothing currently records that dependency in either direction"*). **It is now tightenable, and the
evidence is the guard's own output.**

**One boundary so this is not over-tightened.** `camera-fingerprint.mjs:244`'s loop is
`while (ts - raceStart < 200000)` and it does **not** apply slowmo — `accum` is drained at
`FIXED_DT = 16` from `RAW = 1000/60`, ≤ 2 steps per frame, so the two-step cap never binds and its
200,000 ms of `ts` is the full 200.0 s of race. **The ~165 s slowmo-effective ceiling of §A2 does not
apply to this instrument**; its margin is the larger one. A3a's 160 s budget therefore bounds this
gate too, with room — which makes A3a and this tightening two independent sites for one property,
and the cheap one is A3a.

---

## C. WHAT I COULD NOT ESTABLISH

- **I could not run `client/e2e/garden-path-finishes.spec.js` myself.** The task is read-only and
  standing up the isolated e2e instance (4399/5399) is a process change I did not make. Every browser
  number in §A is the coordinator's measurement of 2026-09-02 as recorded in TESTS-WIRED-1 §3 and
  GARDEN-PATH-FINISH-1 §2b, reconciled there against `deriveRaceDuration` to the rounding on all four
  lap rows. I did not re-take it.
- **I could not establish that the proposed 160 s budget is the right number rather than a defensible
  one.** It is `200 / 1.25` where 1.25 covers the largest measured `ts`-to-race dilation (1.21,
  dirt-oval under slowmo, GARDEN-PATH-FINISH-1 §3, n=40 seed=1). The dilation was measured on three
  tracks, not ten, and only at one seed and one field size. A tenth track could dilate further. The
  number is a proposal with its derivation attached, and whoever lands it should say so in the test's
  comment rather than presenting it as measured on all ten.
- **I did not re-measure the guard costs.** §B3's table is the generated block from
  `docs/SHIP-CEREMONY.md` as written; my 19.8 s / 28.4 s are this machine's `[ra-elapsed-ms]` tokens
  from tonight's two runs and are reported as a machine difference, not as a correction to the
  generator's column. Re-measuring is `node scripts/gen-ceremony-costs.mjs`, which writes a tracked
  file and is therefore out of scope here.
- **I did not verify that `--check` on the two fingerprints would stay green across a re-run.** Both
  matched once each. The camera fingerprint is deterministic by construction (fixed `SEED = 5601`,
  fixed `CAM_SEED = 1439767152`), but one run is one run.
- **I did not establish why the ceiling is 200 s specifically.** Unchanged and still not recoverable
  from the code — GARDEN-PATH-NO-FINISH-1 §6 and GARDEN-PATH-FINISH-1 §8 both say so.
- **Nothing was edited by me.** No branch, no commit, no stage; no write tool touched a tracked path.
  `git status --porcelain` was **empty at start** and at end shows two modified files —
  `scripts/check-fallback-agreement.mjs` and `scripts/check-fallback-agreement.test.mjs` — which are
  **not mine**: I never opened either for writing, and neither is named anywhere in this piece's
  scope. They appeared while this piece ran and belong to a concurrent piece of the chain. I did not
  touch, stage or revert them. **The instrument runs in §B3 were taken against the tree in that
  state**, and neither file is in the camera or render fingerprint's declared `reach`, so the two
  MATCH results are unaffected — but a reader re-running them should note the tree was not pristine.
