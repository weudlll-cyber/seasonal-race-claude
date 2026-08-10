# FRAME-GAP-1 — `other` is splittable now, and the split says the 29 ms are NOT where we looked

**Branch** `feat/frame-gap-1`, cut from master `570a8505`. **Diagnosis only — nothing is fixed and
nothing ships.** All four fingerprints unchanged; `engine-reach --check` reports **none of the four
changed paths can reach the race engine.**

**THE HEADLINE IS A NEGATIVE RESULT, and the brief asked for it to be reported as clearly as a
positive one.** Two of the three experiments moved nothing beyond the run-to-run spread. The third —
the DOM around the canvas — moved a real, repeatable **+2.3 to +3.3 ms of browser lateness at p90**,
which is an order of magnitude too small to be the owner's 16.6 ms gap, and it **does not scale with
window area**, which is the one property his own experiment established. **The harness never
reproduced a 33 ms frame at all**, at either window size, at either device pixel ratio, with or
without the page around the canvas. So it can say where the time is NOT, and it cannot say where it
is.

---

## PIECE 0 — the tidy

| | before | after |
| --- | --- | --- |
| branches at origin | **48** (47 + master) | **1** (master) |
| local branches | 48 | 1 (`feat/frame-gap-1`) |
| worktrees | 4 | 1 (the repository itself) |
| empty `docs/` directories | 4 | 0 |

**45 were fully contained in master** and were deleted — `git merge-base --is-ancestor` was run for
each, and every tip SHA was recorded before deletion, so any of them is one `git branch` away from
coming back. **Master is untouched at `570a8505`; all 109 tags are intact.**

**The two uncontained branches were both verified before acting, and both claims held:**

- **`feat/ceremony-hold-target-1`** — exactly one commit is not on master, and it is a MERGE whose
  two parents are both already on master. Its only hand-resolved content is
  `reports/night/INDEX.md`, and master's copy is a strict superset — **the branch's version contains
  two leftover conflict markers** (`||||||| 434501af`), so what is unique to it is a botched merge's
  droppings. Nothing to preserve, no archive tag warranted.
- **`feat/min-racers-visible-5`** — one commit setting `minRacersVisible` 3 → 5, and its own message
  says "NOT MINTED, NOT FOR MERGE". Master already ships 5 (MIN-RACERS-5). Superseded exactly as
  described.

**Two leftovers beyond the one named**, removed on the same grounds after checking each for
uncommitted work (both clean) and for content not on master (neither had any): `C:/ra-wt-cost` (which
held the dead `feat/ceremony-hold-target-1`) and `C:/ra-wt-verify`. `git worktree list` now shows
only the repository itself.

**One thing could NOT be cleaned, and it is worth knowing why.** `git worktree prune` leaves **37
stale admin directories** under `.git/worktrees/` and fails on each with `Permission denied`. They
are OneDrive cloud placeholders — `Get-ChildItem -Force` reports `ReadOnly, Directory, ReparsePoint`
— so git cannot delete them. They are inert (git already treats them as prunable and they do not
appear in `worktree list`), but they will keep failing every prune until something outside git
removes them. Not done here: forcing deletes inside `.git` is not what a tidy should risk.

## STEP 1 — the two fields that make `other` splittable

`other` is a SUBTRACTION — `rawDt - measured` — not a measurement. It is the name of our ignorance,
and at 100 racers it holds 10–28 ms of a 33 ms frame while every bracket we own sums to 6–8.

- **`rafLate`** — `performance.now()` at callback entry minus the timestamp rAF hands in: how long
  the browser spent on ITSELF before reaching our code. One subtraction, only when the log is on.
  **This is the half of `other` no change to our draw code can shorten.**
- **`longTasks`** — a `PerformanceObserver` on `longtask`, tallying count / total / max per window
  with `attribution` where the browser gives it. A long task is by definition work that ran while our
  callback was NOT running, so no `performance.now()` pair of ours can see it.

**`supported` is three-valued — `null` / `false` / `true` — never a bare zero count**, because "no
long tasks" and "this browser cannot see long tasks" are opposite conclusions and reporting the
second as the first is how a diagnosis talks itself out of the right answer. Confirmed in the owner's
own Chrome 151: `longtask` **is** in `supportedEntryTypes`, so his session will produce real entries.

Both reach the HUD and the JSON export, and the export's legend states what each means and the one
trap in `rafLate`: work the browser does AFTER our callback returns — compositing what we just drew —
lands in the NEXT frame's `rafLate`, so the two must be read as a window rather than frame by frame.
Six tests, including that an unavailable API records its unavailability and that a browser which
lists `longtask` and then refuses to observe it does not throw into the race.

## STEP 2 — the three experiments

**The in-app measurement is still impossible: `/race` is behind a login only the owner has.** So the
arms ran against a faithful reconstruction of the race screen in a real browser window on his
machine — the same markup (`.race-layout` → `.race-canvas-wrapper` + `aside.race-hud`), the real
`RaceScreen.css`, the real 100-row standings list re-ranked and re-ordered on the shipped 250 ms
cadence, the real background canvas at 6144×4096 re-transformed by CSS every frame, and the real
`renderRaceFrame` / physics / camera. **It is not the app, and §"why this failed" below turns on
exactly that.**

100 racers, mountainstreet, mid-race, 420 measured frames after a 90-frame warm-up, arms interleaved
so drift cannot masquerade as an effect. **Milliseconds, p50 / p90.**

**Large window, DPR 1 (canvas CSS box 1021×575):**

| arm | total | rafLate | physics | render | pace |
| --- | --- | --- | --- | --- | --- |
| A-on — page around the canvas | 16.7 / 16.8 | 0.6 / **3.8** | 3.4 / 4.4 | 3.7 / 4.9 | 1002 |
| A-off — `display:none` | 16.7 / 16.8 | 0.6 / **0.8** | 3.7 / 4.5 | 3.5 / 4.1 | 1002 |
| B-pin — canvas CSS box = 1280×720 | 16.7 / 16.8 | 0.6 / 4.6 | 3.4 / 4.3 | 3.6 / 5.0 | 1002 |
| A-on (repeat) | 16.7 / 16.8 | 0.6 / **3.7** | 3.4 / 4.4 | 3.7 / 4.9 | 1002 |
| A-off (repeat) | 16.7 / 16.8 | 0.6 / **0.9** | 3.6 / 4.4 | 3.6 / 4.2 | 1002 |
| B-pin (repeat) | 16.7 / 16.9 | 0.6 / 3.4 | 3.4 / 4.4 | 3.6 / 4.8 | 1002 |

**Small window, DPR 1 (canvas CSS box 603×339 — one third the area):**

| arm | total | rafLate |
| --- | --- | --- |
| A-on | 16.7 / 16.9 | 0.6 / **3.3** |
| A-off | 16.7 / 17.0 | 0.6 / **0.9** |
| A-on (repeat) | 16.7 / 16.9 | 0.6 / **3.4** |
| A-off (repeat) | 16.7 / 16.9 | 0.7 / **1.3** |

**Native DPR 1.5 — his real device pixel ratio (canvas CSS box 777×437 = 1166×656 device px):**

| arm | total | rafLate |
| --- | --- | --- |
| A-on | 16.7 / 16.8 | 0.7 / **4.3** |
| A-off | 16.7 / 16.8 | 0.6 / **0.8** |
| A-on (repeat) | 16.7 / 16.8 | 0.7 / **3.9** |
| A-off (repeat) | 16.7 / 16.8 | 0.7 / **0.9** |

**These are his machine's numbers and they are not portable.**

### The run-to-run spread, since the verdict depends on it

Within an arm, repeated back to back: **`total` p90 varies by 0.2 ms** (16.8–17.0 across all ten
arms). **`rafLate` p90 varies by ±0.5 ms** on the A arms and **±1.2 ms** on B.

### What each arm says

- **A — THE DOM IS REAL AND IT IS TOO SMALL.** Hiding the page around the canvas takes `rafLate` p90
  from 3.7–4.3 ms to 0.8–0.9 ms: **+2.9 ms (large), +2.3 ms (small), +3.3 ms (DPR 1.5)**, every one
  far outside the ±0.5 ms spread. So the standings panel and the background layer genuinely do make
  the browser late to us — and it is **one fifth of what would be needed**, and `total` does not move
  by one tick in any arm. **It also does not scale with window area**: at one third the area the
  effect is 2.3 ms instead of 2.9, a difference at the edge of the spread. That is the finding that
  disqualifies it as his mechanism, because area-scaling is the one thing his experiment proved.
- **B — THE CANVAS STRETCH COSTS NOTHING MEASURABLE.** Pinning the CSS box to the backing store, so
  the browser has nothing to resample, gives `rafLate` p90 4.6 and 3.4 against 3.8 and 3.7 stretched.
  The difference is **smaller than that arm's own ±1.2 ms spread**, and in the wrong direction half
  the time. Refuted.
- **C — WINDOW AREA MOVES NOTHING HERE.** Three times the area changes `total` p90 by 0.1 ms and
  `rafLate` by well under a millisecond. The owner's own experiment is **not reproduced**, and that
  is the most important sentence in this report.

## WHY THIS IS A FAILURE, and what I would try next

The harness holds 60 fps in every arm — 8 ms of headroom on a 16.7 ms frame — so there was never a
33 ms frame for the arms to explain. Four things separate it from his session, and they are the
next places to look, in the order I would look:

1. **REACT, which this harness deliberately does not have.** Its standings list is hand-rolled DOM.
   His is React re-rendering 100 keyed rows four times a second through the reconciler, inside a tree
   with a router, contexts, ~10 HUD components, and `setCountdown` / `setPhase` / `setCamState` /
   `setScoreboard` called from inside the rAF loop. **React's work runs in a different task from our
   callback — which is precisely where `rafLate` and `other` hide.** This is the leading remaining
   suspect and the cheapest to test.
2. **The dev bundle.** Everything here ran under Vite dev, and the project's own dev-start skill says
   performance must be judged on the production build. React's development reconciler is several
   times slower than production, which compounds (1).
3. **The real background artwork** — a decoded JPEG at 6144×4096, not the flat gradient used here. A
   25 megapixel texture behaves differently from a fill.
4. **His browser profile** — extensions, other tabs, a real GPU driver path — against a clean
   automation profile.

**The instrument built in Step 1 settles this without any of my guesses**, and that is the point of
having built it: **if his `rafLate` p90 comes back near 15 ms, the browser is late to us and the
answer is React and compositing, not our draw code. If his `rafLate` is ~1 ms while `other` is still
20, the time is going AFTER our callback returns** — compositing and presenting the frame we just
drew — and the only lever there is how much surface the browser has to present. `longTasks` will name
any ≥50 ms block outright, and his Chrome supports it.

**What is NOT worth doing yet:** anything that makes the drawing faster. Every arm here spends 3–5 ms
on `render` and 3–4 on `physics`, and the frame that hurts is 33.
