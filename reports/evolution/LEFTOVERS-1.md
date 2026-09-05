# LEFTOVERS-1 — everything the recent runs named and left

**2026-09-05.** Branch `docs/leftovers-1` off master `fe50e8f7`.
**DOCUMENTATION ONLY.** No behaviour, no threshold, no guard logic, nothing minted.
**Eight items, all closed. 12 stale code addresses corrected, 1 left with its reason, the rest
verified correct and untouched.**

---

## THE TABLE

| # | item | what was found | file and line | verdict |
| --- | --- | --- | --- | --- |
| 1 | Stale code addresses in `docs/` | every `client/src`/`scripts` citation in `docs/` checked against the tree | table below | **12 CORRECTED** / **1 LEFT with reason** / rest correct |
| 2 | The two ship-order drifts | Both said the provisional-SHA correction happens in "step 9"; it is step 11 | `SHIP-CEREMONY.md:532`, `:539` | **FIXED** |
| 3 | Two lists both reaching 12 | Confirmed: THE SHIP ORDER (`### The steps`) and `## The checklist` each run to 12, and each has its own step 12 | recorded at `### The steps`, pointer at `## The checklist` | **RECORDED** |
| 4 | `workflow_dispatch` is not a pre-merge proxy | Confirmed at source: a dispatched branch has no local `master` ref | recorded in **TRAP A** | **RECORDED** |
| 5 | Three gaps, branch-green vs CI-green | All three verified at source before writing | new section before **THE CONTAINMENT CHECK** | **RECORDED** |
| 6 | The missing `routing.mjs` guard | Corrected text **is** in place; the open item was **not** in the backlog | `scripts/lib/routing.mjs:41-51` | **CONFIRMED + now listed** |
| 7 | `MORNING.md` rewrite | Sheet knew nothing after the night chain | `docs/MORNING.md` | **REWRITTEN** |
| 8 | The open list | Assembled with source addresses | `BACKLOG.md § WHAT IS ACTUALLY OPEN` | **RECORDED** |

---

## 1 · CODE ADDRESSES IN `docs/`

Found with an uncapped search for every `client/src`/`scripts` path carrying a line number across
`docs/`, `docs/archive/` excluded as history. **Each was opened at the cited line and compared with
the claim it supports.**

### FIXED — 11 sites

| doc site | cited | what is actually there | corrected to |
| --- | --- | --- | --- |
| `BACKLOG.md:1120` | `index.jsx:1717-1719` | fullscreen calls are elsewhere | `:1763` and `:1765` |
| `BACKLOG.md:1657` | `index.jsx:1717-1719` | same | `:1763` and `:1765` |
| `BACKLOG.md:4216` | `verify.mjs:250-272` | moved when GATE-WIRED-AND-CAUSED-1 added ~89 lines | `:310-337` |
| `BACKLOG.md:4219` | `verify.mjs:246` | `:246` is now `if (!touched) missing.push(…)` — new code | `:337` |
| `BACKLOG.md:2909` | `check-index.mjs:18` | `:18` is inside the *"what it does NOT check"* list; the both-directions statement is above it | `:11-12` |
| `BACKLOG.md:200` | `SetupScreen.jsx:930` | `:930` is `cursor: 'pointer'`; **Race Settings** is far below | `:1074` |
| `BACKLOG.md:407` | `raceDriver.mjs:273` | `:273` is a comment; `export function runRace` is elsewhere | `:414` |
| `BACKLOG.md:407` | `raceDriver.test.mjs:155` | `:155` is `let seen = 0;`; the return-value caller is below | `:157` |
| `BACKLOG.md:3048` | `sim-fairness.mjs:772` | `:772` is a `brakeLoBound` comment; *"sim-only telemetry"* is elsewhere | `:1395` |
| `BACKLOG.md:1062` | heroCurveGenerator `:541` | file is 594 lines; `realizedIntensity` is produced higher up | `:533` |
| `BACKLOG.md:2216` | `index.jsx:1002` | `:1002` is a comment; `setCameraPlan(cp)` is below | `:1012` |

**And one where the SYMBOL is gone, not the line** — `LESSONS.md:2655` cited
`raceBehavior.js:123 (effectiveDriveMult)`, read at `:560-561`. **`effectiveDriveMult` does not exist
anywhere in `client/src` or `scripts`**, and neither line holds what was cited. No replacement address
is offered because there is nothing to point at; the reference is annotated with that fact and the
lesson itself is untouched.

### VERIFIED CORRECT — 11 sites, changed nothing

`BACKLOG.md:218` (`DevScreen.jsx:44-47`, Race Defaults) · `:1062` (`heroCurveGenerator.js:166`,
`clampIntensityToBudget`) · `:1801` (`raceBehavior.js:258`, `getTrackWidthAtTpx`) · `:1915`
(`sim-fairness.mjs:1101`, `runoutZone`) · `:2587` (`racePlanner.js:728`) · `:2590`
(`comebackDetector.js:64`) · `:2613` (`CameraDirector.js:1663`) · `:2636` (`index.jsx:943`) · `:2799`
(`App.jsx:13`) and `:2801` (`App.test.jsx:18`) · `:3167` (`SetupScreen.jsx:803`, `PlayerGroupPicker`)
· `:4229` (`engine-reach.mjs:41` and `:257`) · `:4356` (`index.jsx:221`) · `:727` (`index.jsx:643`) ·
`MORNING.md:201` (`racePlanner.js:401`) · `DEPLOY-NOTES.md:75` and `MORNING.md:162` (`api.js:16-18`).

**That is a good outcome, not a miss** — roughly half the citations in the living docs are accurate.

### LEFT, with the reason — 1 site

**`BACKLOG.md:2852`** cites `camera-fingerprint.mjs:327` for a gate documented *"because garden-path
does not finish"*. The address is stale (the paragraph is at `:329-335`) **and the claim is now the
opposite** — CAMERA-GATE-1 moved the gate to "every track" and garden-path finishes. **It is left
untouched because the line two below it already says so**: a dated `★ RE-VERDICT 2026-09-03 —
FALSE. GARDEN-PATH FINISHES.` Correcting a superseded verdict's address would make a retracted
statement read as current, which is the opposite of what the correction beneath it is for.

## 2 · THE TWO SHIP-ORDER DRIFTS

Located by text, not by the CI-MERGE-RACE-1 line numbers, which had moved. Both in **TRAP B**:
`SHIP-CEREMONY.md:532` *"and step 9 corrects them"* and `:539` *"the correction in step 9 is for the
human reader"*. The provisional-SHA correction is **step 11**. Both fixed.

## 3 · TWO LISTS THAT BOTH REACH 12

Confirmed at source: `### The steps` (THE SHIP ORDER, 1–13) and `## The checklist` (−1 … 12) are
independent, and the checklist's own step 12 is *"Commit, push, verify"*. Recorded **once**, at the
head of THE SHIP ORDER where the numbers begin, stating that every `step N` in the repository means
that list — including the five in `check-tags.mjs`, one of them in the operator-facing failure
message — and that the numbers must therefore not be renumbered. A **pointer** (not a second copy,
per the one-canonical-home rule) sits at the head of the checklist. **Nothing renumbered, renamed or
restructured.**

## 4 · `workflow_dispatch` AT A BRANCH

Recorded in **TRAP A**, where the dispatch route is described. A dispatched branch checkout has no
local `master` ref, so `check-tags.test.mjs` dies on `git rev-parse master` and
`engine-reach.test.mjs` fails *"an honest negative must stay exit 1"* with exit 2 — **neither a
defect, neither informative about the merge.** The dispatch route is for a TAG; there is no branch
equivalent.

## 5 · THREE GAPS BETWEEN BRANCH-GREEN AND CI-GREEN

All three **verified at source before writing**, in a new section placed where the merge is described:

1. **Routing** — the docs job carries **zero `if:` conditions** (counted over its whole block), so it
   runs eleven guards plus the script suite on every push; `verify` selects by diff.
2. **No `lint`, no `format:check`** — `verify` runs `npm run format`, the formatter that *writes*.
   CI runs `npm run lint` (`ci.yml:115`), `npm run format:check` (`:119`) and `npm run test:coverage`
   (`:125`); `verify` has no counterpart for any of them.
3. **Environment** — the `git commit-tree` identity failure, which no routing could have caught.

**Nothing was built for them.**

## 6 · THE MISSING `routing.mjs` GUARD

**Corrected text confirmed in place** at `scripts/lib/routing.mjs:41-51` — *"THERE IS NO
`routing.test.mjs`"* and *"it holds by inspection, not by construction"*. **The open item was NOT in
the backlog**; it is now, in the list at item 8, with that address. **The guard was not built.**

## 7 · `MORNING.md`

Rewritten whole. It had said it was last rewritten during the night chain and knew nothing after it.
Four sections. **Every open item was checked against the tree before being listed**, and the check
removed four things that were still standing as open:

| was listed as open / unreached | why it is not on the new list |
| --- | --- |
| **piece D — the item-7 gap** | closed by ITEM7-MEMBERSHIP-1; item 7 reads **0 of 80** |
| **"Does the closing phase end a battle shot too?"** | answered **D28**, its premise withdrawn, and the cut is **already in the tree** (D32) |
| **"What should the deployed client's API address be?"** | answered **D30** — resolved at start time |
| **"Is 27 MB of `date-fns` worth it?"** | answered **D29** — it stays |

**NEEDS HIS WORD went from five items to one.**

## 8 · THE OPEN LIST

Eight entries, each with the source address that decided it, in
`BACKLOG.md § WHAT IS ACTUALLY OPEN`. Nothing else was added to it.

---

## SOURCE HYGIENE

| file | before | after | what moved |
| --- | --- | --- | --- |
| `docs/BACKLOG.md` | 4438 | 4458 | 11 address fixes; the open-list section |
| `docs/SHIP-CEREMONY.md` | 805 | 855 | 2 step-drift fixes; the two-lists note + its pointer; the `workflow_dispatch` caveat; the three-gaps section |
| `docs/MORNING.md` | 209 | 136 | rewritten whole |
| `docs/LESSONS.md` | 4171 | 4171 | one dangling reference annotated |
| `reports/evolution/LEFTOVERS-1.md` | 0 | 177 | this report |
| `reports/evolution/INDEX.md` | — | — | one entry |

**Noticed and deliberately left:**

- **`BACKLOG.md:2852`** — the superseded verdict, above, with its reason.
- **`CI-RED-3e6c0b87` filed no report of its own.** `MORNING.md` originally linked to
  `reports/evolution/CI-RED-3e6c0b87.md`; `check-doc-links` caught it as dangling and the link was
  removed rather than the file invented. That piece reported in the session only, and where it was
  wrong it is superseded by CI-MERGE-RACE-1. **Reports are append-only and none was edited here.**
- **`docs/archive/`** was excluded from the address sweep — it records the past on purpose, and
  `check-doc-links` already treats it as such.

## CHECKS

- **`npm run verify`** — `PASS 12  FAIL 0  SKIP 15`, 129.6 s.
- **The script suite as CI runs it**, identity suppressed to match a runner — **532 tests, 532 pass,
  0 fail.** Run because item 3 touches text `check-tags.mjs` reads.
- **The client suite** — **241 files, 4,476 tests, 0 failures**, 334.36 s.

## FINGERPRINTS

`node scripts/engine-reach.mjs --check` on the changed paths, **verbatim**:

```
ENGINE REACH: none of 5 path(s) carry a change that can reach the race engine.
  5 outside the hull (cannot reach the engine at all): docs/BACKLOG.md, docs/LESSONS.md, docs/MORNING.md, docs/SHIP-CEREMONY.md, reports/evolution/LEFTOVERS-1.md
```

It selects nothing. **NOTHING WAS MINTED.**
