# PLAYABLE-FOUR-1 — four pieces, one branch, nothing merged and nothing minted

**2026-09-05.** Branch `feat/playable-four-1`, cut from master `d407f090`.
**★ NO MERGE PERMISSION WAS GIVEN AND NONE WAS TAKEN.** Pieces B, C and D change what the owner
sees, and he judges them before anything lands. **No fingerprint moved and nothing was minted** —
all four roles were re-measured in every piece that touched code, and all four are unchanged.

**Precondition, checked before the branch existed:** `git ls-remote --heads origin` returned exactly
one line, `refs/heads/master`. Origin now holds two heads, the second being this branch.

**All four pieces landed on the branch.** The fall order (C, then B) was never needed.

| piece | what it is | outcome |
| --- | --- | --- |
| **A** | does the camera catch the comeback the plan wrote? | **measured, nothing changed** |
| **B** | Cancel Race | **built** — and the brief's premise was half wrong |
| **C** | the server is gone and the player cannot tell | **banner built; the fallback already existed** |
| **D** | a short identifier that repeats a race | **built, and it is NOT short — his call** |

---

## ★ THE THREE THINGS THAT CHANGED WHAT THE WORK WAS

Each of these was a brief's stated premise that did not survive being checked, and in each case the
check changed what got built. They are collected here because they are the reason this chain is not
simply four features.

**1 · The shared harness is not the browser's camera for the comeback shot (piece A).**
`scripts/lib/raceDriver.mjs:501` hands the director `isOutcomePhase: false` as a hard-coded literal;
the browser hands it the race plan's own OUTCOME phase. Measured both ways, that is **11 comeback
shots against 1** over the same forty races. Measuring on the driver's path would have produced a
confident wrong answer, and it is what the first stage of piece A did before the divergence was
found. The shared driver was **not edited** — the instrument supplies the browser's flag locally and
keeps the control arm behind a flag.

**2 · A Cancel Race control already existed (piece B).** The brief said there was "no such control
anywhere in `client/src`". There is no `cancelRace` symbol — 0 hits, every spelling — but the race
HUD already carried a button that ended the race and returned to Setup. What it did not do was leave
**fullscreen**, and this is the only screen with a control that can. So the piece completed an unwind
rather than adding a second button.

**3 · The offline fallback already existed; only the telling was missing (piece C).** The brief asked
for a banner **and** a fallback. Read at source, everything on the "works without the server" list
already degrades: the track list to a cache, the geometry to localStorage, the results to
sessionStorage, the racer types to static exports. Every failure was already handled — and every one
of them was announced **to the console**. So only the banner was built, per the brief's own rule
against inventing work to fill a piece.

---

## PIECE A — the plan writes the comeback and the camera is somewhere else

**Measurement only. No gate, threshold, plan or detector was changed, and the beats were NOT passed
through.** Full report: [COMEBACK-BEATS-1](../night/COMEBACK-BEATS-1.md).

**Method.** N = 40 races — ten tracks × seeds 1–4, race plan ON, shipped defaults, forty racers —
through a new instrument, `scripts/diag/comeback-beats.mjs`. Staged as the brief required: **N = 30
first** (10 × 3), which showed 55 comebackers written against 1 comeback shown; that is a readable
difference by any reading, so the corpus was widened. ★ Stage 1 ran on the driver's outcome flag, so
its 1-in-55 is the control arm's number and not the answer.

**The answer.** The plan named **74 comebackers** and wrote **215 beats**. The camera showed **11
comebacks**.

- **The subject is never wrong: 0 of 11** were on a racer the plan had not named — and it cannot be,
  because `_cast` REPLACES the candidate pool at `comebackDetector.js:130`.
- **The moment is always early: 11 of 11**, by a median **9.90 s** — **0.134 of the race** — before
  the `resolve` beat where the authored climb lands. Against the `peak` beat it is 0.143 LATE, so the
  camera's moment falls in the gap between the plan's peak and its landing, every time.
- **63 of 74** written comebackers were never shown; **29 of 40** races held no comeback shot at all.

**Where the beats die — three gates, separated, because a bare zero cannot tell a lost contest from a
camera that never had the chance.** Not the detector: a candidate existed in **40 of 40** races, on
49,239 frames. Not the offer window: **35 of 40**. They lose the **director's weighted contest** —
across the 7,510 frames when a named comeback was live and offerable, the camera was on BATTLE_ZOOM
34%, LEADER_ZOOM 21%, LEAD_CHANGE 13%.

**One claim checked rather than believed, and it holds:** `comebackDetector.js`'s header says every
cast comebacker is drawn from the B1 pool. **0 of 74** fell outside it — which matters, because one
that did would have no rank history and be skipped for ever, silently.

**Recorded and deliberately not acted on:** of the 9 files that name `isOutcomePhase`, only
`camera-replay.mjs` does it the browser's way. **The camera fingerprint is taken with the comeback
offer window closed.** Nothing was changed about it.

---

## PIECE B — the control that ends a race now leaves nothing behind

**What "leaves no half-state" means was read off the START path, not guessed.** Starting a race
writes `sessionStorage['activeRace']` (`SetupScreen.jsx:684`, and `:796` for Quick Test) and
`KEYS.LAST_RACE_SEED` (`:688`), then navigates. The race screen adds the rAF loop, the finish-nav
timer, the winner-card timers, the long-task observer, the camera markers, the effect instances and a
`fullscreenchange` listener — and **every one of those is already released** by the animation
effect's own unmount cleanup (`RaceScreen/index.jsx:1760-1773`) or its own effect (`:378`).

**One thing had no owner: fullscreen itself.** `toggleFullscreen` (`:1781-1787`) puts the document
into fullscreen; leaving the screen never took it out, so the operator landed back on Setup in a
fullscreen browser with no control to undo it.

**Deliberately NOT unwound, and stated in the code:** `LAST_RACE_SEED`, which is the durable record
of a seed that really was used; and `raceResults`, which a cancelled race never writes — it is
written only once every racer is home (`:1108`), so clearing an earlier race's result would be
touching the result recording, which the brief forbids.

**One control, one effect.** No confirmation, no countdown, no undo, no shortcut. The existing button
gained the missing exit; its NAME now follows what it is doing — **Cancel Race** while the race runs,
**← Setup** once every racer is home. Calling it "← Setup" at every phase is why the leak went
unnoticed: it read as navigation.

**Tested** (`cancelRace.test.jsx`, 4 tests, mounting the real screen) and **sabotaged once**: deleting
the fullscreen exit failed **exactly one** test while the other three stayed green.

**A consequence found rather than shipped blind:** an e2e selected this button by the name
`/Setup/i` and would have broken silently at 500 ms in, where the label is now "Cancel Race". It is
updated to select by test id and now also asserts the payload is gone.

---

## PIECE C — the server is gone and the player is told, in the interface

**The list the brief asked for, read at source.**

| | |
| --- | --- |
| **NEEDS the server** | signing in; a **first-ever visit**, because with no stored user hint `AuthContext.jsx:64-68` falls to `anonymous` and every route sends the player to `/login`; `/dev`, `/track-editor` and `/racer-editor`, online-only by construction (`ProtectedRoute.jsx:47`); a track never cached; track backgrounds and racer sprites, which are API URLs |
| **WORKS without it**, for a returning operator | `/setup` — the track list falls back to `getCachedServerTracks()` (`trackLoader.js:25`, `:108-115`); `/race` — pure client physics, geometry from localStorage (`trackStorage.js:138-140`); `/results` — `sessionStorage` (`ResultScreen/index.jsx:187`); the built-in racer types, which are static exports |

**So the fallback was already built and only the banner was.** `serverStatus.js` never makes a
request — no retries, no queues, no reconnection — it records what the application's own requests
already found out. A status light that polls is a background job, and a background job competes with
a running race for the main thread.

**An HTTP status is an ANSWER.** 401, 403 and 500 all mark the server **reachable**: it is there and
refusing, which is a different thing and a different message. Calling that "unreachable" would send
an operator to restart a backend that is already running, mid-event.

**★ And the dependency is inverted on purpose, after the first attempt proved it mattered.** Importing
the store from `apiClient.js` pulled `serverStatus.js` into `raceCore.js`'s import closure — the hull
`engine-reach` calls "what can change the race" — taking it from **78 files to 79**, which failed
`ceremony-counts` and `gen-engine-reach-doc`. **Both failures had that one cause.** Rather than
regenerate the counts and leave a UI status module inside the engine hull — untrue, since it holds a
string, and expensive, since every later edit would then select the world-fingerprint guard — the two
reporting sites now **dispatch an event** and the store **listens**, which is the idiom
`apiClient.js` already uses for 401. The closure is 78 again and `SHIP-CEREMONY.md` needed no edit.

**Tested** (11 tests) and **sabotaged twice** — once before the inversion and again after, so the
event path is the one actually proved: making an HTTP error report unreachable failed exactly the two
tests that hold the distinction.

---

## PIECE D — a short identifier that repeats a race, and it is not short

**All three claimed addresses re-verified:** `SetupScreen.jsx:677` fixes the plan seed;
`RaceScreen/index.jsx:476` and `:503` gathered the config from the **host's** storage at race start,
which is exactly why one seed on two machines was two races.

### Step 1 — every input, counted rather than carried over

The brief said RACE-IDENTITY-1 names nine and told me not to carry the number. Counted independently
by reading every `raceData.` access in `RaceScreen/index.jsx` and following each to where it lands:

| # | input | where it is read |
| --- | --- | --- |
| 1 | `geometryId` | `:409`, `:417` — resolves the track through `getTrack()` |
| 2 | `racerTypeId` | `:406` |
| 3 | the NAME LIST, IN ORDER | `:749` — a name is physics, because `stablePairBit` hashes it |
| 4 | field size | `:404` — exactly the length of 3, so it is not encoded twice |
| 5 | `racePlanSeed` | `:569` |
| 6 | `raceActionStage` | `:488` |
| 7 | `targetLaps` / `targetDurationSec` | `:582`, `:583` |
| 8 | `racePlanEnabled` | `:586` |
| 9 | the world config | `:503` — `buildWorldConfig()`, through the same loaders the race path uses |

**★ I agree with the nine, and the disagreement is elsewhere.** Two payload fields looked like
candidates and were checked rather than assumed: `worldWidth`/`worldHeight` (`:407`, `:432`) go to the
CameraDirector (`:610`) and `renderRaceFrame` (`:1542`), and `trackSurfaceClasses` (`:725`) goes only
to `r.surfaceEmitter`, which **no engine file reads**. They decide what the race LOOKS like, not who
wins, so they are outside the nine — named here so the omission is a decision on the record.

### Step 2 — built, and exact

The config travels as a **diff against the shipped defaults**, which is lossless rather than a
compression: `defaults.js` is in the build on both machines, so defaults + diff reconstructs the
config byte for byte. That is what makes the **build stamp** load-bearing rather than decorative — a
diff means nothing against a different set of defaults, so an identifier from another build is
**REFUSED**. It also refuses a damaged string, a wrong format version, an empty roster, and a track
this device does not have. The one thing it must never do is produce a race that is *nearly* the one
the string named.

`RaceScreen` now prefers a recorded config over the host's when a race was started from an
identifier, and reads the host exactly as before otherwise — which is why no fingerprint moves.

### ★ Step 2's decision, which is HIS: it is not typable

The brief's rule is explicit — do not make it lossy to shorten it; build the exact one, report its
length, lay out the options. **Measured, on shipped defaults:**

| case | characters |
| --- | --- |
| 4 racers, all defaults | **210** |
| 20 racers, all defaults | **450** |
| 40 racers, all defaults | **743** |
| 20 racers, two config keys off default | 563 |
| 20 racers, the whole camera config off default | 3,250 |

*(RACE-IDENTITY-1 estimated ≈200–350 for a field of twenty; measured it is 450. The estimate assumed
compression, which was not used — adding a dependency to shorten a string is the wrong trade.)*

**So it is a COPY-and-PASTE value, not a typed one**, and the interface treats it as such: the field
takes either a plain seed or a pasted identifier, and a "copy this race's identifier" control gives
the string with its length beside it. **The options are his:** leave it copy-only; shorten it by
storing the payload server-side behind a short key (which makes repeating a race need the server, and
piece C is about exactly that dependency); or accept a shorter form that refuses to exist whenever it
would lie — the third being the shape his own earlier note asked about.

### Step 3 — proved with existing instruments, not by eye

- **`raceHash(identity, cameraConfig)`** (`scripts/lib/raceDriver.mjs:161`) — this project's own
  answer to *"did these two numbers come from the same race?"*. Its header states it covers every
  field of the identity **including the roster's actual names**. Asserted: the identity that comes
  back hashes identically to the one that went in.
- **`hashWorld(world)`** (`client/src/modules/raceConfigWorld.js:80`) — the shared browser↔sim
  authority on config identity, the same function behind the in-race badge. It settles input 9.
- **The track** is asserted separately, because `raceHash` states outright that it does not cover it.

**Sabotaged.** Four corruption checks are kept as permanent tests (a changed seed, a changed name, a
reordered roster, a changed config). And the proof itself was sabotaged once live: making the encoder
sort the roster — the classic "looks fine, is a different race" mutation — turned the `raceHash`
proof **red**, along with the round-trip and the order test.

---

## HOUSEKEEPING

Three entries left `docs/BACKLOG.md`'s open table, **each re-checked at source before it was moved**:
the render fingerprint's blind spot (minted on the owner's order); the missing `routing.mjs` guard
(built, proved inert, deleted — `dataReach` guarantees the property by construction, and no
`check-guard-imports` exists anywhere in `scripts/` or `package.json`); and `lint`/`format:check` in
`verify` (declared at `routing.mjs:224` and `:239`, and **the server is not a gap** — its
`package.json` declares exactly four scripts and neither of those two is among them).

Four further rows were updated to say that work now sits on this branch, unmerged.
`docs/MORNING.md` was rewritten after every piece.

## WHAT THE GUARDS CAUGHT, AND IT WAS ALL MINE

Two pieces went red on `verify` before they were committed. Neither was a flake, both had causes
in this chain's own edits, and both are recorded because the failures were useful.

**Piece C — two failures, ONE cause.** `ceremony-counts` and `gen-engine-reach-doc` both failed
because `serverStatus.js` had joined the engine hull. The fix was not to regenerate the counts but
to invert the dependency, described in piece C above — the guard was right that something was wrong,
and it was wrong in the design rather than in the document.

**Piece D — five failures, four causes, every one a consequence of editing two large files.**

| guard | cause | fix |
| --- | --- | --- |
| `check-fallback-agreement` RULE F | **9 symbol citations in `docs/branding.md` and `docs/FORCE-MAP.md` pointed at line ranges in `SetupScreen.jsx` and `RaceScreen/index.jsx` that my insertions had moved.** The guard says exactly why it exists: *"a line number cannot be wrong out loud, and this can"* | the ranges were remapped **through the diff itself** (`git diff -U0` hunks, old line → new line) rather than re-guessed, so the citations still bracket the blocks they were written for. **29 line references shifted across the two documents** |
| `ceremony-counts` | the ceremony's GENERATED census counts tracked non-test files under `client/src/modules/`, and this piece adds two | regenerated. ★ **The closure itself is unchanged at 78** — what moved is the file census, 110 → 111, and the count that cannot reach the engine, 51 → 52 |
| `gen-ceremony-costs.test.mjs` | its self-sabotage builds the row it expects from the LIVE count, so a stale document made the sabotage fail to match | fixed by the regeneration above |
| `check-index` | this report existed and was not yet indexed | indexed |

**None of them was worked around.** The citation failure in particular is the kind that would have
shipped silently: nine documents quietly pointing a reader at the wrong lines of two files that half
this chain edited.

## CHECKS

`npm run verify` and the client suite were run per piece and were green; `engine-reach --check` was
run per piece and its line is quoted verbatim in that piece's commit. **All four fingerprint roles
were re-measured in pieces B, C and D and none moved.**

**No merge. No mint.** The branch is at origin for the owner's eye.
