# TWO-FAILING-SPECS-2 — one does not reproduce, the other's fixture went stale

**2026-09-25. Establishing why. Nothing was fixed, no assertion changed, no spec re-pinned, no wait,
retry, timeout or ordering hint added.**

The whole production arm was run once, 19 specs on one worker, **41.4 minutes**: **124 passed, 1
failed** of 125. BROWSER-GATE-COVERAGE-1 recorded three failures on 2026-09-25; two of them now pass.

The spec order, which is alphabetical and is what the interaction question turns on:

> 1 arrival-shape · 2 b1617-smoke · 3 camera-polish-ux-verification · 4 comeback-precedence ·
> 5 d11-ux-verification · 6 d355-smoke · 7 d9-smoke · 8 fix-list-tracks-world-dimensions ·
> **9 garden-path-finishes** · 10 held-comebacker · 11 quicktest-vs-harness ·
> 12 race-history-never-vanishes · 13 race-history-real-route · 14 race-history · 15 race-identifier ·
> 16 race-save · 17 seed-field-typing · 18 teams-session · 19 vre-2-ux-verification

---

## 1 · `garden-path-finishes.spec.js` — it does not reproduce

**It passed, inside the full run, behind all eight of its predecessors:**

```
ok  90  [chromium-production] › e2e\garden-path-finishes.spec.js:28:1 ›
        garden-path crosses the line in a browser (1.9m)
[garden-path] field=20 FIRST CROSSING after 110.7 s of wall clock;
        10 finish time(s) on the scoreboard at that moment
```

That is the exact context the original failure was observed in — the whole suite, one worker, the
same eight specs ahead of it — and the failure did not occur.

**The tally since it was recorded as failing:** 3 passes run alone (THREE-FAILING-SPECS-1) plus this
one inside a full suite = **4 consecutive passes, 0 reproductions.**

★ **So it is not a deterministic interaction with a predecessor, and there is nothing to bisect.**
The original observation stands as one failure at its FIRST assertion (`:46`, an empty scoreboard) —
a race that never started, not one that failed to finish. On one observation against four passes,
what can be said is that it is **intermittent**, and that the mechanism is still unidentified.

★ **What is NOT established:** that it has gone away. Four passes do not prove absence, and an
intermittent empty scoreboard is exactly the shape `client/e2e/appReady.js` documents for this class
— a dropped track geometry read as a closed track. **Whether that is the mechanism here remains
unknown**, because the condition did not occur to be inspected.

**Case: it does not reproduce.**

---

## 2 · `comeback-precedence.spec.js` — the premise died

It failed in the suite exactly as it fails alone, to within ten milliseconds:

```
[comeback-precedence] comeback entries: [{"from":"OVERVIEW","heldMs":4949,"at":73632}]
```

against `4939/73534`, `4966/73420`, `4962/73532` from the three solo runs. Deterministic, and the
same race in every context.

### The evidence: the plan casts nobody

The spec's fixture is **Garden Path, Quick Test seed 41000** (`comeback-precedence.spec.js:36-37`).
`scripts/diag/comeback-beats.mjs` dumped it:

```
garden-path     seed 41000  written [none]  shown [none]
```

**No comebacker is written into the plan at that seed** — and the same holds for all ten tracks at
41000. The spec's own header records that its fixture was *"chosen from the headless sweep as a race
whose plan casts a comebacker who climbs."* **It no longer does.**

### And the mechanism is NOT broken — which is what separates (b) from (a)

At other seeds the plan still writes a comebacker and the camera still shows one:

| race | written | shown |
|---|---|---|
| space-sprint seed 2 | `#9@resolve 0.7` | `#9@0.6001` |
| space-sprint seed 3 | `#38@resolve 0.7` | `#38@0.6001` |
| space-sprint seed 5 | `#15@resolve 0.7` | `#15@0.7137` |

### Which of the two questions this answers

The block asked whether the plan fails to produce the state the spec expects, or whether the camera's
precedence ignores it. **It is the first.** The plan produces nothing to cut to at this seed, so the
precedence is never given the chance to fire out of a held shot. The single `COMEBACK_ZOOM` the spec
does see comes **from OVERVIEW**, which carries no hold to cut through, and it is produced by the
camera's own reactive detector with no planned comebacker behind it.

★ **What is NOT established, and it is the useful remaining unknown:** whether the assertion itself —
a comeback cut out of `LEADER_ZOOM` or `BATTLE_ZOOM` inside the hold — still holds at a seed that
*does* cast one. Answering that means re-pointing the fixture, which is a change, and this block
makes none.

★ **Not the owner's question.** A fixture whose seed stopped casting what it was picked for is
maintenance, not a design choice, so no decision is put to him here.

★ **What changed, and when, is not named.** The cast moved at some point between the fixture being
chosen and today; pinning the commit was not done and is not guessed at.

**Case: (b), the premise died.**
