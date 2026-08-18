# E2E-FLAKE-HUNT-1 — five green runs, one flake reproduced under load, and the 404 NOT ESTABLISHED

**Branch:** `docs/e2e-flake-hunt-1`, off master `90f12a89`. **NOTHING WAS CHANGED.** No test was
edited, weakened, retried or serialised. The diff is this report and its index line.

## THE HEADLINE

**The four flakes did not recur.** Five consecutive full e2e runs, unchanged between them:

| run | result | wall clock |
| --- | ------ | ---------: |
| 1 | **103 passed** | 2.8 min |
| 2 | **103 passed** | 3.0 min |
| 3 | **103 passed** | 3.3 min |
| 4 | **103 passed** | 3.2 min |
| 5 | **103 passed** | 3.0 min |

**0 failures in 5 runs**, against the 2-tests-per-5-runs that NIGHT-2026-08-17 measured twice, in two
different rounds, on this same instrument.

**So there was nothing to decouple.** TEST-ACCOUNTS-1's method — find the shared record, remove the
dependency — needs a dependency you can point at, and a repair aimed at a cause you have not
established is the thing this repository keeps paying for. **Five green runs is not proof that the
flakes are gone; it is proof that they did not appear tonight**, which is a different and weaker
statement, and it is the one this report makes.

## THE ONE FAILURE I COULD PRODUCE — IDENTIFIED, AND IT IS NOT A 404

`d11-ux-verification.spec.js:182` is the test the brief names. Run in isolation with
`--repeat-each=6` — seven copies of one test — **it failed once in seven**, which matches the
reported rate. The failure:

```
Error: page.waitForTimeout: Test timeout of 30000ms exceeded.
  199 |   await page.waitForTimeout(6000);
```

**The page snapshot in the failure's own `error-context.md` shows the race RUNNING** — the OVERVIEW
pill, the Live Standings panel, five racers with positions. Nothing was broken. **The test simply ran
out of its 30 s budget before its 6 s wait completed**: the preceding steps — seeding geometry,
caching track geometries, adding five racers one at a time, choosing a track, starting the race —
had already consumed about 24 s.

**Two things follow and both matter:**

1. **This is a time-budget overrun, not a 404.** The assertion the test exists for
   (`errors` is empty) was never reached, let alone violated.
2. **It required a load the real suite does not have.** Seven copies of one test running together is
   not how the suite runs; under the ordinary full run it passed five times out of five. So the
   mechanism I identified is *contention*, and I produced it artificially.

**I did not change the timeout**, and that is deliberate. Raising it is not weakening an assertion —
but it would be a change to a test whose real-world failure I have not reproduced, and the brief is
explicit that leaving it alone beats guessing.

## THE 404 — NOT ESTABLISHED

**In five full runs plus seven repetitions of the named test, no 404 appeared.** I cannot say what is
requested, by whom, or why it is sometimes absent, because I never saw it.

**What I ruled out without a browser**, so the next person does not repeat it:

- **A missing racer sprite.** Every `/assets/...` path referenced anywhere under `client/src` was
  checked against `client/public`. Three are missing — `/assets/sprite.png`,
  `/assets/sprites/horse.png`, `/assets/test.png` — and **all three are referenced only from unit
  test files**, never from a shipped path. No production sprite is absent.
- **The track background image is a WARN, not an error.** `bgImageCache` logs
  `console.warn` on failure, and this test filters on `msg.type() === 'error'`, so the loader's own
  message cannot be what fails it. *(The browser's own network 404 line WOULD be an error — which is
  why this remains a live candidate rather than a ruled-out one, and it is where I would start.)*

**An honest "not established" beats a silenced test.** The test is exactly as it was.

## WHAT THIS DOES NOT CLAIM

It does not claim the flakes are fixed — nothing was fixed. It does not claim they are gone — five
runs cannot say that, and NIGHT-2026-08-17 already showed the flake SET shifting between rounds while
the RATE stayed put. What it adds to the record is a **third five-run sample, on a tree three ships
newer, that came back clean**, and one previously unexplained failure mode explained.

**No fingerprint can move**: no file outside `reports/` changed.

## PROPOSALS

1. **Split the setup cost out of `d11:182`.** Its 30 s budget is spent almost entirely on getting to
   the start line — five racers added one at a time through the UI. A fixture that seeds the roster
   the way `seedGeometry` seeds tracks would leave the test asserting the thing it is named for with
   seconds to spare, and would remove the contention sensitivity without touching a single
   assertion. **This is the repair I would make if the failure were reproducible in a normal run.**
2. **Record the flake ledger per run rather than per night.** Three separate nights have now measured
   this suite five times each and reported a rate; nothing accumulates those into one place, so each
   night re-derives "about one run in five" from scratch. A file that appends run outcomes would make
   the rate a measurement rather than an impression — and would have told me, before I started, that
   the named four have not been seen since 2026-08-17.
