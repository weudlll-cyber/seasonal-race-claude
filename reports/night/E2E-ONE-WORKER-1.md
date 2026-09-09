# E2E-ONE-WORKER-1 — the browser suite was reporting failures it did not have

**Day chain 2026-09-08, piece 3 of 7** · branch `night/2026-09-07` · **unmerged.**

---

## ★ THE HEADLINE: 14 FAILURES THAT WERE NOT DEFECTS

| run | workers | result | wall clock |
|---|---|---|---|
| before | **7** (Playwright's default here) | **14 failed, 108 passed** | **18.0 min** |
| after | **1** | **1 failed, 121 passed** | **33.6 min** |

The fourteen were not scattered. They were the **config-and-state** specs:

| spec | failures |
|---|---|
| `vre-2-ux-verification` | 3 — "saving a code-default class creates a Modified override", "Reset-to-Default removes the Modified badge", "no ID control is offered" |
| `camera-polish-ux-verification` | 3 — Dev Screen Speed Range values and persistence |
| `d11-ux-verification` | 3 — "unchecking Enabled persists across reload" |
| `race-identifier` | 3 |
| `teams-session` | 2 — "the admin cannot create a user with no team at all" |

Every one asserts on state another spec was simultaneously writing.

**The proof, run deliberately:** those same five files, re-run with `--workers=1` and **nothing else
changed** — **66 passed, 0 failed, 3.5 min.** The failures were the parallelism.

### Why it happened, established at source

`playwright.config.js` sets `fullyParallel: false`, which reads like a serial suite and is not one:
**it only serialises tests within a file.** Different spec FILES still run one per worker, and
Playwright's default is half the cores — **7 on this machine**. Meanwhile the `webServer` block
starts exactly **one** API on one data directory, `auth.setup.js` writes **one** shared
`storageState`, and the Dev Screen writes config to that one server.

Seven browsers editing one installation's settings is not a test.

**Fixed by `workers: 1`**, with the measurement written beside it. Deliberately not an env override:
a variable that silently restores seven workers would reintroduce this, and the failures it causes
look like product defects.

### The one remaining failure is NOT the fix failing

`garden-path-finishes` failed in the serial run. **Re-run alone it passes in 105.5 s** against its own
600 s budget — so this is not the ceiling expiring, which its header says would be a finding. It is
the suite's known flake (recorded elsewhere at roughly 2 runs in 5), now visible because it is no
longer buried under thirteen others. **The suite is not claimed green; it is claimed honest.**

---

## THE COST, and it is real

**18.0 → 33.6 min (+87%).** That is what correctness costs here, and it is not hidden.

The wall clock is dominated by a handful of files waiting for real races:

| spec | parallel | serial |
|---|---|---|
| `race-history` | 14.5 min | 11.5 min |
| `seed-field-typing` | 10.5 min | 9.5 min |
| `d9-smoke` | 7.1 min | — |
| `race-history-real-route` | 6.7 min | — |

---

## THE RACE CENSUS — what each expensive spec proves

**13 tests carry a long timeout**, which is the honest marker of a test that waits for a race to end.
Counting "starts a race" is misleading: `race-identifier.spec.js` starts four races and waits for
none of them — its `startAndWaitForRace` waits only for `canvas.race-canvas` to be visible and then
reads `sessionStorage.activeRace`. Those races are abandoned, not run, and cost seconds.

| spec | tests waiting for an ending | must the race FINISH? |
|---|---|---|
| `garden-path-finishes` | 1 | **YES** — the claim IS "garden-path crosses the line in a browser". It is the only evidence anywhere for that. |
| `race-save` | 1 | **YES** — it proves a race finishes and is kept **with the server down**; the history entry only exists at the finish. |
| `race-history` | 3 | **YES** — the list, the short key and the repeat are all properties of a race that reached the server. |
| `race-history-never-vanishes` | 1 | **YES** — same. |
| `race-history-real-route` | 2 | **YES** — same. |
| `seed-field-typing` | 3 of 4 | **2 yes, 1 already raceless** — see below. |
| `quicktest-vs-harness` | 1 | **YES** — it compares a browser race against the harness. |

**No set-up race was removed, because on inspection there were none of the kind the brief expected.**
The races that looked like set-up (`race-identifier`, `d11-ux`) never wait for an ending in the first
place, and the ones that wait all use the ending as their evidence.

`seed-field-typing`'s *"the same key PASTED still works"* asserts only that the Start button becomes
enabled — it runs no race at all. Its `test.setTimeout(900_000)` is an over-generous budget, not a
cost.

### ★ THE LEVER THAT IS LEFT, named with its address

The specs need a **finished** race; they do not need a **sixty-second** one. `runARace` already uses a
2-racer field, which confirms the brief's note that field size is not the lever (2 racers 113 s,
20 racers 121 s). **Duration is the lever**, and the floor already exists:

```
client/src/modules/durationModel.js:56    export const OPEN_TRACK_MIN_SECONDS = 10;
```

An open track can run a **10-second** race. Every assertion above survives a shorter race unchanged,
because each is about *what a finished race produced*, never about its length.

**It is NOT done here, and the reason is honest rather than tidy:** `openTrackDuration` is React
state, not persisted (`SetupScreen.jsx:235`), so it cannot be seeded through `localStorage` the way
these specs seed everything else — it has to be driven through
`data-testid="open-track-duration-slider"`, and Quick Test takes a different path from the Start
Race flow that owns that slider. That is browser-iteration work, and it is a *performance* change
sitting behind a *correctness* change that was already overdue. **A suite that reports fourteen
failures it does not have is the more urgent defect**, so that is what this piece shipped.

---

## CHECKS

| | |
|---|---|
| e2e, 7 workers | 14 failed, 108 passed, 18.0 min |
| e2e, 1 worker | **1 failed, 121 passed, 33.6 min** |
| the five affected files, 1 worker | **66 passed, 0 failed, 3.5 min** |
| `garden-path-finishes` alone | **PASS**, 105.5 s of a 600 s budget |

### Fingerprints — verbatim

```
node scripts/engine-reach.mjs --check client/playwright.config.js

ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): client/playwright.config.js
```

---

## SOURCE HYGIENE

| file | before | after | what changed |
|---|---|---|---|
| `client/playwright.config.js` | 87 | 119 | `workers: 1`, and the measurement that justifies it |

**Nothing was removed and nothing in the touched area was dead.** No spec was edited: the census
above is a reading of them, not a change to them.

**Reused, not rebuilt:** Playwright's own `workers` setting and the suite's existing `webServer`
block; no new helper was written, and `d9-smoke`'s pattern was not copied anywhere because no spec
turned out to need it.

**Noticed and left:** `seed-field-typing`'s "PASTED" test carries a 900 s budget for a test that runs
no race; harmless, and shortening a budget is not this piece's business. The 10-second duration lever
above is the named opportunity.

**No scratch files entered the repository.** `git stash` was not used.
