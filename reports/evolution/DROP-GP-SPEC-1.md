# DROP-GP-SPEC-1 — one of the two tests is deleted and the other is the ONLY browser evidence in the repository that garden-path finishes

> **The file was not deleted, and this report is the argument for that.** The piece was asked to
> remove `client/e2e/garden-path-finishes.spec.js` after first establishing what it asserted and
> whether anything else asserts it. **Establishing it changed the answer**, which is presumably why
> the establishing was asked for first.

---

## 1. WHAT THE FILE ASSERTED — TWO TESTS, AND THEY ARE NOT THE SAME CLAIM

| | assertion | status |
| --- | --- | --- |
| **1** | the product's own estimate for garden-path **at the harness's two laps EXCEEDS the 200 s ceiling** | **DEAD — and this is the one deterministic failure in the browser suite** |
| **2** | the race **actually crosses the line** in a real browser, and puts a finish time on the scoreboard | **passing, and unique** |

**Test 1 was the measurement**, not the colour: it turned *"garden-path does not finish"* from an
argument into a comparison of two numbers the product and the harness each publish. That was good
work and it is exactly what died.

---

## 2. TEST 1 IS DELETED, AND IT WAS FAILING BECAUSE IT WAS RIGHT TO FAIL

`d73ec6a9` gave garden-path the beetle and two laps on **2026-08-25**. At those same two laps the
race now runs **4,916 frames** — measured by `camera-fingerprint.mjs` on 2026-09-03 — which at 60 Hz
is about **82 seconds** against a 200 s ceiling.

**So `expect(estimate).toBeGreaterThan(200)` is false by more than a factor of two.** `NIGHT-RUN.md`
records it as *"one fails deterministically, `garden-path-finishes.spec.js:31`"* and that is this
line. **A test whose premise the product has outgrown is deleted, not repaired** — repairing it would
mean inventing a new assertion and attaching it to a name that describes the old one.

**What the deleted test's MECHANISM still has:** `SetupScreen.test.jsx` covers the estimate in three
unit tests — that it renders, that there is no duration slider beside it, and that more laps raise it
proportionally. **Only the garden-path-against-the-ceiling COMPARISON was unique to this spec**, and
that comparison is the part that died.

---

## 3. ★ TEST 2 IS THE ONLY BROWSER EVIDENCE IN THE REPOSITORY, AND IT STAYS

Asked directly — *does anything else assert that garden-path finishes in a browser?* — the answer is
**no**, and the search is short:

| where | garden-path? |
| --- | --- |
| the other eight e2e specs | **the track is named in none of them** |
| `scripts/viewer-invariants.mjs` (the browser sweep) | **EXCLUDES it** — *"whose race never finishes at seed 9, so it was never scorable anyway"* |
| `camera-fingerprint.mjs`, `render-fingerprint.mjs` | headless drivers, not a browser |

**The exclusion is on the very claim this test refutes.** And GARDEN-PATH-CLOSE-1, an hour before
this piece, flagged that exclusion **DOUBTFUL AND UN-RECHECKED** and filed it open, precisely because
no race had been run to settle it.

**Deleting the only browser evidence that the track finishes, on the night the browser sweep's
exclusion of it was called doubtful, would have left the tree less true.** That is the one thing the
standing constraints say a hygiene pass may not do, and it outranks the instruction to delete the
file — which was written before anybody had looked.

**It is one command to reverse** if the owner reads it the other way, and the file now says in its
own header why it survived.

---

## 4. WHAT ELSE MOVED

**The file's header was false in its first paragraph.** It opened with *"Three headless sweeps
recorded garden-path producing NO finishing order — 16 of 16, then 0 of 120 — and every figure this
project holds for that track rests on races that never ended."* True when written, false since
2026-08-25, and sitting in a file whose whole subject is that claim. Rewritten to say what the file
is now and why half of it went.

**`docs/NIGHT-RUN.md`** named the deleted test as the suite's one deterministic failure. It now
records the deletion and the 82 s that justifies it, and — following the same rule the piece applied
to `VERIFY-RULES.md` this morning — **states no pass count as a target**: run it and read what it
says.

**`RaceScreen index.jsx:988`** in the header's rAF note was a stale line citation — the catch-up cap
is at `:991`. Converted to the symbol form R19 adopted an hour earlier:
`` `RaceScreen/index.jsx` → `physicsAccum` ``.

★ **And the conversion caught its own first draft.** It first named `renderInterpolation`, which IS in
that file — and is a different feature entirely, frame interpolation rather than the physics
accumulator. Rule F would have passed it, because Rule F asks whether the symbol is in the file and
deliberately not whether it is the right one; **the check that caught it was reading the line.** That
is the rule’s declared blind spot arriving within the hour, and it is worth recording that the blind
spot is real rather than theoretical.

---

## Limits

**Test 2 was not run for this report.** It is budgeted at up to 30 minutes and the browser suite sits
outside the ordinary path by rule (R7, on cost). Its passing status is taken from `NIGHT-RUN.md`'s
last full run, which named exactly one failure and it was the other test.

**Nothing here settles seed 9.** Test 2 runs a Quick Test at the track's own default laps, not the
sweep's seed 9, so it does not answer the question GARDEN-PATH-CLOSE-1 filed. **It proves the track
finishes; it does not prove the sweep should score it.**

**The file's name is now slightly wide of its contents** — one test in a file called
`garden-path-finishes` is arguably better named than two were. Not renamed, because a spec filename
is referenced from `NIGHT-RUN.md` and two reports, and the churn buys nothing this piece needs.
