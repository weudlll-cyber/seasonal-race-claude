# BACKLOG-TRUTH-2 — every open row, four questions, at the tree

**2026-09-25.** `docs/BACKLOG.md` PART ONE held **32** open rows, written over months, describing the
tree as it was then. Two were spotted as stale within a minute of being shown to the owner. This is
all 32, each asked the same four questions — does the thing still exist, was it closed another way,
does it still reproduce, and what remains exactly — with a file and line or a command and its output
behind every verdict.

**Nothing here was fixed and no row was deleted.** Establishing truth and repairing are separate
work.

## The table — what FELL AWAY first

| subject | verdict | evidence | what closed it |
|---|---|---|---|
| A throwaway worktree is never removed at creation's end | **MOOT** | its own verify run today: `worktree add` has **no callers under `scripts/`** — only docs, reports and one client test. `ls .git/worktrees` → **0**, against the **3** its 2026-09-02 verdict recorded | nothing in the tooling creates a worktree, so there is no caller to give a `finally`. `scripts/worktree-stubs.mjs` (Q-28, 2026-09-24) clears any that appear |
| The harness hardcodes a lap count | **NARROWED** *(lap half DONE)* | `scripts/lib/raceDriver.mjs:416` reads `lapsOfClosedTrack(geo)`; `:299-310` returns the track's own `defaultLaps` and **throws** rather than substituting one | the row's worry — "a track whose `defaultLaps` is 4 is measured at 2" — is now a loud error. The **200 s ceiling** at `:477` remains, and the row now claims only that |
| The canonical silent zero "could return at any time" | **NARROWED** | same as above: the row's stated mechanism ("the harness hardcodes 2 laps and that never moved") no longer holds | a race can still be discarded silently by the 200 s ceiling; kept for that alone |
| A race-identity hash would make comparison mechanical | **NARROWED** | `hashIdentity` exists — `client/src/modules/parity/raceIdentity.js:109`, used at `scripts/parity/replay.mjs:83` and `soak.mjs:120`; `replay.mjs:151` already prints DRIFTED | but it returns `hashWorld(identity).full` — **identity only, no camera config**, which is the exact insufficiency the row names. `scripts/his-shot-truth.mjs` still exists, so its example stands. The row now claims only the missing half |
| A sweep cell that returns 0 races still prints a number | **STILL OPEN** | `runRace` at `scripts/lib/raceDriver.mjs:491`; exactly one caller reads its return value, `scripts/raceDriver.test.mjs:157` | — figures **grew**: 82 files import the driver (was 56), 71 call sites (was 44) |
| The contention watch can only remove, never admit | **STILL OPEN** | `_updateContentionWatch` at `CameraDirector.js:2758`, called from `:4666`; `.add` at `:2806`; grep for `_contentionOut.delete` returns **0**; the code says so itself at `:296` and `:2737` | — |
| Nothing measures motion, only per-frame values | **STILL OPEN** | `scripts/finish-motion-truth.mjs` present, still one phase; no guard checks pan displacement against a local median | — |
| `0xC0000142` — watch for a second occurrence | **STILL OPEN — ★ its own trigger HAS FIRED** | second occurrence **2026-09-19**, six weeks after the first: `reports/night/BREAKAWAY-GROWTH-1.md:457`, a dev server reporting `build unknown` with `git rev-parse: exit 3221225794`; lesson at `docs/LESSONS.md:3641`. Fix undone — `client/vite-plugin-ra-build.js:79` still shells out to git per check | — the row still reads "one occurrence is an anecdote". Not claimed: that the two share a cause |
| Three driver copies remain, by deliberate choice | **STILL OPEN** | all three present: `camera-fingerprint.mjs`, `render-fingerprint.mjs`, `camera-replay.mjs` | — the row exists so anyone closing it answers the two arguments rather than counting copies; unanswered |
