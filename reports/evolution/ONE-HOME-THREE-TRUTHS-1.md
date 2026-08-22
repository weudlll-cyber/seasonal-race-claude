# ONE-HOME-THREE-TRUTHS-1 — three quantities that were written twice, and one that was written 27 times

**Date:** 2026-08-23 · **Branch:** `refactor/one-home-three-truths` off master `6a78bfb6`
**Piece 7 of NIGHT-2026-08-22.**

**The proof this piece stands on: CAMERA `0434cd0385eacc7b` and RENDER `57b2eb101d806b22`, both
BYTE-IDENTICAL to `docs/fingerprints.json`, re-measured on the formatted tree that was committed.**

---

## §1 — ESTABLISHED AT SOURCE FIRST, and one of the three was much bigger than described

| # | the quantity | expected | **found** |
| --- | --- | --- | --- |
| 1 | the endgame threshold | in two places | **three**: `defaults.js:293` owns it; `diag/endgame-spec.mjs:99` and `diag/camera-curve.mjs:60` each restate the literal |
| 2 | the eleven keys of the HIS arm | in two places | **exactly two**, byte-for-byte — `viewer-invariants.mjs:104-116` and `diag/endgame-spec.mjs:109-121`, each with its own private copy of `setPath` too |
| 3 | one condition spelled out twice | twice | **27 copies across 17 files** |

**All copies agreed, which is the dangerous variant** — the brief's own words, and the reason each of
these is worth touching at all.

### 1 · The endgame threshold — three homes for one instant

`defaults.js:293` is `endgameThreshold: 0.95`. Two harnesses carried a bare `0.95`:

```js
scripts/diag/endgame-spec.mjs:99   const DEADLINE = 0.95;      // requirement 1's deadline
scripts/diag/camera-curve.mjs:60   const ENDGAME_FROM = 0.95;
```

**That `DEADLINE` and `endgameThreshold` are the SAME quantity is not my inference — the source says
so.** `CameraDirector.js:2990`: *"WIDEN, ending AT `endgameThreshold`. His requirement 1 makes that
instant a DEADLINE: by 95%…"*. `ENDGAME_FROM` is the same instant read from the other side.

**What the duplication would have cost:** change the shipped default and the game's endgame moves,
while `endgame-spec` keeps scoring against the old instant — **and reports a regression the code did
not make.** That is a measurement moving for a reason that is not the code under test.

### 2 · The HIS arm — eleven keys and a `setPath`, written out twice

Identical to the byte in both files. **Two harnesses measuring "his arm" would keep agreeing right
up until somebody edited one**, and the divergence would then surface as a change in HIS NUMBERS
rather than as an error.

### 3 · "Is this point in the picture?" — 27 copies in 17 files

Every one written as `p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH` or a rename of it. **Six
copies of a predicate agree until one is edited, and the harness that then disagrees does not report
a disagreement: it reports a DIFFERENT NUMBER OF RACERS ON SCREEN**, which reads as a finding about
the camera.

## §2 — WHAT WAS DONE, AND THE SCOPE I DELIBERATELY DID NOT TAKE

| | |
| --- | --- |
| **new** `scripts/lib/hisArm.mjs` | `HIS`, `setPath`, `applyHisArm` — one home for the arm |
| **new** `scripts/lib/frameBox.mjs` | `inFrame`, `countInFrame` — one home for the predicate |
| **new** `scripts/lib/oneHome.test.mjs` | 6 tests over both, plus the threshold's shape |
| `viewer-invariants.mjs`, `diag/endgame-spec.mjs` | both now `import { HIS, setPath }`; both private `setPath` copies deleted |
| `diag/endgame-spec.mjs` | `DEADLINE` now reads `DEFAULT_CAMERA_CONFIG.endgameThreshold` (it already imported the config) |
| `diag/camera-curve.mjs` | `ENDGAME_FROM` likewise, via a new import of the defaults |
| 5 files / **8 sites** | the in-frame condition now calls `inFrame(p, CW, CH)` |

**THE SCOPE ON ITEM 3 IS NARROWER THAN THE DUPLICATION, ON PURPOSE, AND THIS IS THE FORK.** Only the
8 sites of exactly the shape the brief pointed at were converted — `p.x`/`p.y` against `CW`/`CH`, in
`contender-truth.mjs` (×3), `straggler-truth.mjs` (×2), `diag/runin-forward-reach.mjs`,
`diag/runin-pin-drift.mjs`, `diag/start-frame-capture.mjs`.

**The other 19 copies in 12 files were left**, and the reason is the conservative reading: they use
different variable names (`sx`/`sy`, `q.x`, `cx`, `lineSx`), different canvas constants (`CANVAS_W`,
`CWA`), or are TEST files with their own `FRAME` object. Converting those is a transcription exercise
across a dozen instruments **whose measured numbers are in the record** — and a transcription error
there changes a number silently, which is the exact failure this piece exists to prevent. It is a
piece of its own, and it is in PROPOSALS.

**One deliberate non-change inside `frameBox.mjs`, recorded in the file:** I first wrote `inFrame`
with a `!!p &&` null guard and removed it before committing. All eight call sites take `p` straight
from `cd._proj.toScreen(...)`, which always returns an object — so the guard was dead code that also
quietly changed what a null would do (throw, today) in five instruments at once. **A pure
transcription is the only version whose equivalence can be claimed.** The inclusive `>=`/`<=` bounds
are preserved for the same reason and are asserted by a test.

## §3 — THE PROOF: NOTHING MOVED

**Nothing here is a behaviour change, so every fingerprint the change reaches must come back
byte-identical. Two do, and the third could not be reached.**

| fingerprint | recorded | measured | verdict |
| --- | --- | --- | --- |
| **CAMERA** | `0434cd0385eacc7b` | `0434cd0385eacc7b` | **BYTE-IDENTICAL** |
| **RENDER** | `57b2eb101d806b22` | `57b2eb101d806b22` | **BYTE-IDENTICAL** |
| **WORLD** / WORLD-OFF | — | **not run** | **unreachable, and proved so** — see below |

**Both were measured TWICE**: once before the pre-commit formatter ran, and again on the formatted
tree that was actually committed (R0b). Identical both times.

**Why WORLD was not run, mechanically rather than argued:**

```
$ node scripts/engine-reach.mjs --check <all 11 changed/added paths>
ENGINE REACH: none of 11 path(s) carry a change that can reach the race engine.
  11 outside the hull (cannot reach the engine at all): …
```

**And a second, independent check because engine-reach's own trustworthiness was PIECE 4's subject:**
none of `camera-fingerprint.mjs`, `render-fingerprint.mjs` or `fingerprint-default.mjs` mentions any
of the ten changed modules. The two that *could* have moved were measured anyway; the one that could
not is argued from two independent readings rather than one.

**The instruments still run.** All eight changed harnesses were loaded and none raises an import
error — the real regression risk in a refactor that adds imports to eight files.

**The new homes produce the values they replaced**, checked by execution rather than by reading:
`HIS.length` is 11; `applyHisArm` puts `trackingTC` at 1.5, `minRacersVisible` at 8, `battleWeight`
at 0; the shipped default it cloned from is **still 0.25**, i.e. `setPath` did not reach back into
`DEFAULT_CAMERA_CONFIG`; `endgameThreshold` reads 0.95, the literal both scripts carried; and
`inFrame` admits `(0,0)` and `(1280,720)` and rejects `(-1,0)` and `(1281,0)`.

---

## VERIFICATION

| instrument | ran? |
| --- | --- |
| CAMERA + RENDER fingerprints | **RAN, twice each** — byte-identical (§3) |
| WORLD / WORLD-OFF | **NOT RUN — proved unreachable two independent ways** (§3) |
| `scripts/lib/oneHome.test.mjs` | **RAN** — 6 pass, 0 fail |
| `npm run verify` | **RAN** — PASS 5, FAIL 0, SKIP 19, including `script-suite` |
| harness smoke test | **RAN** — all 8 changed harnesses load |
| client suite | **NOT RUN** — nothing under `client/` changed |
| browser gate, 80-race sheet | **NOT RUN** — R15a: the fingerprints are unmoved, so the sheet's twelve requirements cannot have changed |

## BUILD VERSUS SPEC — conformity

| the spec asked | what happened |
| --- | --- |
| establish all three at source first | done — §1, and item 3 turned out to be **27 copies in 17 files**, not two |
| give each quantity ONE home and one name; make the other site read it | done for all three |
| no behaviour changes | none. `defaults.js` was not touched — it already owned the threshold |
| every fingerprint the change reaches must come back BYTE-IDENTICAL | **done — CAMERA and RENDER both, twice** |
| if one moves, stop and report rather than re-mint | **did not occur.** Nothing was minted; `docs/fingerprints.json` is untouched |

## SOURCE HYGIENE

| | |
| --- | --- |
| **added** | 3 files — 2 shared homes (~120 lines incl. their reasoning) + 1 test file (6 tests) |
| **removed** | 2 copies of the eleven-key `HIS` list, 2 copies of `setPath`, 3 restated literals, 8 spelled-out conditions |
| net lines in the 8 harnesses | **−54 / +38** |
| shipped source changed | **none** — every changed file is under `scripts/` |
| fingerprints minted | **none** |

**NOTICED BUT LEFT:**

- **19 more copies of the in-frame condition in 12 files** (§2). Named individually in the report so
  the next block does not have to re-find them.
- **`camera-replay.mjs` has three copies against `CANVAS_W`/`CANVAS_H`** rather than `CW`/`CH` —
  a fourth spelling of the same idea, in a file the owner drives by hand from a marker.
- **Two TEST files spell it out too** (`CameraDirector.test.js:6711`, `framingRule.test.js:491`),
  each against its own `FRAME` object. A test asserting against a private copy of the predicate it is
  testing is a different problem and is not one this piece should touch.

## PROPOSALS — for the owner, nothing done

1. **Convert the remaining 19 in-frame copies, one file per commit.** The one home now exists, so
   each conversion is a two-line change with a test already standing behind it. **Value:** the
   predicate stops being 20 independent facts. **Cost, and it is why this is not tonight's work:**
   twelve of those files have measured numbers in reports, so each conversion wants its harness run
   before and after — which is a dozen instrument runs, not a refactor. One file per commit makes a
   silent transcription error attributable instead of anonymous.
2. **A guard that fails when a bare `0.95` appears near the word `endgame`.** The threshold now has
   one home, and the way it grows a second is somebody typing the number into a new harness.
   **As a rule inside `check-config-claims.mjs` (R13), not a new script** — that guard already knows
   every key in `defaults.js` and already scans for stated values. **Cost:** it currently scans
   documents, not `scripts/`, and widening its scope to code is a real change to what it means; R11
   applies, because the first true sentence it flags must be exempted by name rather than rewritten.
