# FP-COMPARE-2 — two of the three instruments guarding the picture were log lines; all three now compare, through ONE implementation

> **No fingerprint moved.** All four were run against the record after the change and **all four
> match**. `verify` **PASS 15 FAIL 0**, with `world-fingerprint`, `camera-fingerprint` and
> `render-fingerprint` all running `--check` and all green.

`--check` appeared **four** times in `fingerprint-default.mjs` and **zero** times in
`camera-fingerprint.mjs` and `render-fingerprint.mjs`. FP-COMPARE-1 fixed this for the world on
2026-08-14 and the other two were never done. For **eighty days**, two of the three instruments that
guard the picture computed a hash, printed it, and reported PASS whatever it was.

**An instrument that emits a value nobody compares is not a guard. It is a log line.**

---

## 1. WHAT INVOKED THEM, AND WHAT DEPENDED ON THEIR EXIT CODE — established BEFORE changing anything

| invoker | ran them? | passed `--check`? |
| --- | --- | --- |
| `npm run verify` | **yes**, via `guardScripts()` discovery | **no** — only `world-fingerprint` got it |
| `.githooks/pre-commit` | **no**, deliberately — *"the suites and the fingerprints belong to `npm run verify`, not to every commit"* (`:83`) | — |
| CI (`.github/workflows/ci.yml`) | **no** — CI does not run `verify` at all | — |
| the ship ceremony | **yes, by hand** | it told a person to compare |

**So nothing depended on their exit code, because it was always 0.**

**Where a new failure surfaces: `npm run verify`, and nowhere else.** Not the hook, not CI. A moved
camera or render hash now fails the command the ceremony already tells a person to run, and it fails
nowhere they are not looking. That is stated here because the brief asked for it and because a guard
that starts failing somewhere unexpected is its own incident.

---

## 2. ★ ONE IMPLEMENTATION, NOT A THIRD COPY

The obvious repair is to paste the world's `--check` block into the other two. **That would have put
three copies of one comparison in the tree** — the exact shape this project spent the week removing,
and the shape Rule A was built the same night to catch.

So the block **moved** to `scripts/lib/fingerprintCheck.mjs` and all three read it.
`fingerprint-default.mjs` lost its inline copy; camera and render gained a call, not a copy.

**This is constraint 3 enforced rather than described: the repair REMOVES a copy while adding a
capability.** A test asserts all three call it, so the repair cannot go half-applied later:

```js
test("ALL THREE INSTRUMENTS CALL IT — the repair is not half-applied", …)
```

---

## 3. IT CAN GO RED — PROVEN TWICE, BECAUSE ONCE WAS NOT ENOUGH

A repair to an inert check is worthless if the replacement can only agree.

**(a) The comparison itself**, in `scripts/lib/fingerprintCheck.test.mjs` — six tests, all green,
failure paths asserted first: a mismatched hash **exits 1** and prints recorded vs measured; a role
the record does not declare **fails** rather than passing on nothing; an unreadable record **fails**
(Lesson 187); `--cheap` **says it skipped** rather than claiming a comparison it did not make.

**(b) The wired instrument**, because (a) proves only the helper. `camera-fingerprint.mjs` was
temporarily made to slice its digest one character over — perturbing the hash, not the measurement:

```
FAIL: CAMERA fingerprint does not match the record.
      recorded : 152cf295c4c9ff54
      measured : 52cf295c4c9ff549
```

**Exit 1.** Reverted, and verified byte-identical by `git hash-object`.

**A first sabotage attempt failed to sabotage anything** and is recorded because it would otherwise
have looked like proof: running the camera instrument on its `--company-only` probe arm still matched
the record, so that flag does not move what is hashed. Had I stopped there I would have reported a
green run as evidence of a working check.

---

## 4. ALL FOUR FINGERPRINTS, AFTER THE CHANGE

| role | result |
| --- | --- |
| world | `check: WORLD matches the record for role "world" (8a1977187e9c99b4).` |
| world-off | `check: WORLD matches the record for role "world-off" (aa09ed97a3a32689).` |
| camera | `check: CAMERA matches the record for role "camera" (152cf295c4c9ff54).` |
| render | `check: RENDER matches the record for role "render" (485b73d527602a0e).` |

**Nothing moved, so nothing was minted** — which is what piece 7 predicted from its own measurement
the same night.

**The new check caught my own error before it caught anything else.** I first ran the off arm as
`fingerprint-default.mjs off --check`, which names the run "off" but does not turn the world off, and
it correctly reported a mismatch. The record's own `reproduce` field carries the real command
(`off --gapRerollEnabled=false`). **A check that had merely printed would have let me record a moved
world-off hash as a finding.**

---

## 5. WHAT THIS MOVED, AND WHAT POINTED AT IT (constraint 2)

| what moved | what pointed at it | outcome |
| --- | --- | --- |
| `fingerprint-default.mjs`'s inline `--check` block | its own tests, `verify.test.mjs` | 53 tests across the three affected files, all green |
| `verify.mjs commandFor` | `verify.test.mjs` (44 tests) | green |
| the `--cheap` skip message wording | searched uncapped — **nothing** asserts that text | no action |
| the claim that these instruments cannot gate | `docs/SHIP-CEREMONY.md` § THE THREE FINGERPRINTS made no false claim, but the fact changed | **one sentence added**, naming where a failure now surfaces |
| CENSUS-CHECKS-1's `DEMONSTRABLY INERT — 1` | it is a **report**, and reports are append-only | recorded in the **INDEX corrections block**: 1 inert → 0, with the census's finding not withdrawn |

---

## Limits

**Green today proves the wiring, not the population.** Every hash matches, so the three checks have
never yet caught a real drift — only the one I introduced to make the camera instrument object.

**`--check` is inert under `--cheap`, and says so.** A reduced-scope hash carries a prefix and cannot
be compared against the full record. That is the same rule FP-COMPARE-1 wrote for the world, kept
rather than re-argued — so a `verify --cheap` run still cannot gate on any of the three.

**The camera instrument's live half is unchanged.** Its proof-of-live on the ending window
(`:330-341`) already fired and still does; this repair addresses the headline half only. Its
rationale paragraph still says garden-path has no ending to sample, which its own run contradicts —
**that is piece 7's finding and is not corrected here**, because it is a claim in prose and piece 3
owns those.

**Nothing was measured about cost.** Both instruments already ran and already computed the hash, so
the comparison is arithmetic on a string; the `verify` timings above are the ordinary cost of running
them, not a change introduced here.
