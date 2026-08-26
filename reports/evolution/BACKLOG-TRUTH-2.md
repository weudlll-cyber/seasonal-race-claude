# BACKLOG-TRUTH-2 — six entries checked against the source, and two of them were not what they said

**Documents only.** `docs/BACKLOG.md` and this report.

**WHAT WAS NOT RUN, AND WHY.** No browser gate, no client suite, no fingerprint run. The four
fingerprint roles are computed from the engine; a change confined to `docs/` cannot reach any of
them, so those gates could not return a different answer than not running them. `check-doc-links`
and `check-index` are the gates that *can*, and both were run.

**THE RULE THIS PIECE OBEYS.** An entry that says FIXED on the strength of a report and is not fixed
is worse than one that says OPEN. So every entry below was established **at the source** — the
shipped config file, the shipped function, the origin API, a replay of the real commit — and not from
the report that claimed it. Two of the six turned out not to be what the report-level reading said.

**And nothing was deleted.** This backlog's own rule is that a question which vanishes looks like a
question nobody asked, so every closed entry keeps its original text as the evidence for its closure.

---

## THE SIX, WITH WHAT ESTABLISHED EACH

| # | entry | verdict | established by |
| --- | --- | --- | --- |
| 1 | the merge gate stopped gating | **CLOSED** | `server/vitest.config.js` — bcrypt group bounded to 3 |
| 2 | the arbiter cannot see data | **HALF closed, half still true** | `routing-replay.mjs` on the real commit; `engine-reach --check` run directly |
| 3 | the garden-path silent zero | **STILL OPEN — correctly** | `scripts/lib/raceDriver.mjs` still carries the ceiling; no loud zero exists |
| 4 | the run-in's hard admit | **CLOSED** | `_levelEaseTo` in `CameraDirector.js` |
| 5 | the pan's stale zoom | **CLOSED** | `update()` calls `_resolvePanTarget()` after the zoom settles |
| 6 | the chance test points backwards | **STILL OPEN — re-verified** | `_contentionOut` still only grows |

### 1 — the merge gate: CLOSED, and the question it asked was never answered because it stopped mattering

The entry said **NEEDS: ONLY HIS WORD** and offered him a choice: restore the serialisation as a
performance decision, or teach the gate to report a timeout-only failure as INCONCLUSIVE.

**Neither was needed.** GATE-SERIAL-BCRYPT-1 bounded the bcrypt group to **3 workers**; the margin
against the unchanged 5,000 ms timeout went from **21 ms to 1,894 ms** with no test over 4 s, and the
suite is not slower (37.7 s against 39.1 s, inside run-to-run variance). Verified in
`server/vitest.config.js`, with membership owned by `server/test/suiteShape.mjs` and read from that
same module by `scripts/verify.mjs` — one home, so the two cannot drift.

**A question can be closed by making it stop applying**, and that is worth recording as such rather
than leaving a row that asks him to choose between two things nobody needs to do.

### 2 — the arbiter: the dangerous half is closed, the visible half is not

This is the entry that most needed source and not a report, because a report-level reading would have
closed it and the wrong half would have stayed open.

**✅ The routing hole is closed.** `scripts/lib/routing.mjs` decides which guards run via
`scripts/lib/dataReach.mjs`, which follows **named** paths and not only import edges. Replayed on the
real commit with the tool that piece shipped:

```
COMMIT ba4a4442 — server/seeds/tracks/garden-path.json
  BEFORE — 5 guards      AFTER — 12 guards      ADDED — 7
  including all four fingerprints, both suites, both frame checks
```

That was the half that could let a red master report green.

**⏳ The advisory is still wrong**, and it is the line a human reads at commit time:

```
$ node scripts/engine-reach.mjs --check server/seeds/tracks/garden-path.json
ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): server/seeds/tracks/garden-path.json
```

**For a file whose two-line edit moved all four fingerprints** in GARDEN-PATH-DEFAULTS-1. It cannot
answer otherwise as written: `entryPoints()` walks static `from '...'` specifiers, and a JSON data
file is never an import edge, so no data path can enter that hull by construction.

**The remaining job is smaller than the entry costed it.** The mechanism that answers correctly is
already shipped; `engine-reach`'s hull is simply the last caller not using `dataReach`. The report's
3.4%-of-commits figure was for the whole thing.

### 3 and 6 — two entries that were right, and stay open

Checking is not only for finding errors. **The garden-path silent zero** is accurate as written:
garden-path completes 20/20 because the beetle made the race short enough, the harness still
hardcodes 2 laps, `scripts/lib/raceDriver.mjs` still carries its 200 s wall-clock ceiling, and
nothing anywhere makes a zero-race result loud. The symptom healed; the mechanism did not move.

**The chance test** likewise: `_contentionOut` is still only ever added to, `_contentionPending` only
gates entry to that removal, and there is no path returning a racer to the framing. Nothing admits on
it. **One thing nearby did change and the two must not be confused** — RUNIN-LEVEL-SET-BUILD-1 built
`withinOneLength` membership for the run-in's LEVEL SET, a different mechanism with a different
subject. The contention watch is untouched by it. Its pointer was corrected: it used to be "context
for the item above", and the item above is now closed, so it stands on its own as an unused mechanism
nobody has decided to point forwards.

### 4 and 5 — closed by builds he has already accepted

**The run-in's hard admit** asked *"may the width ease onto a new member over about 1.25 s?"*
RUNIN-EASED-ADMIT-1 built exactly that, he judged it on a production build, and it shipped as
`v-ship-runin-calm`. **The word was given by acceptance rather than separately**, which is why the row
still read as open. `_levelEaseTo` re-anchors whenever the target moves and eases in both directions,
leaving by arriving.

**The pan's stale zoom** is closed by RUNIN-PIVOT-SCOPE-1: `update()` calls `_resolvePanTarget()`
after it has settled this frame's zoom, on every path.

---

## THE RACE-SEED ROW — established, not edited

The index carried two rows saying the work sits on `feat/race-seed`, **unmerged**, his eye owed. That
branch does not exist at origin, and `racePlanSeed` is on master — the combination that could mean
either "merged and swept" or "lost".

**It was merged and swept, and nothing was lost.** `7a3942fa merge(SEED-REAL-RACE-1): a real race
gets a real seed, and it outlives the tab` is on master, and both halves of D23 are in the shipped
source: `SetupScreen.jsx:464` passes a drawn `startSeed` as `racePlanSeed` instead of the legacy `0`,
and its own note records that both values live in `localStorage` rather than `sessionStorage` —
"watch a race, close the browser, come back, re-run it" is the case he asked for.

**So the rows become an eye-test owed ON MASTER**, and they now say what he would actually be looking
at: start a normal race with the seed field empty, check the drawn seed is displayed where he expects
and reads as a number he could type back; then close the tab, reopen, and check it survived.

**Nothing was rebuilt.** The instruction was to say plainly if anything was lost rather than quietly
restore it; nothing was.

## CONFORMITY

- Every verdict from source: a config file, a shipped function, the origin API, or a replay of the
  real commit. No verdict is taken from the report that claimed it.
- Nothing deleted; every closed entry keeps its original text as its own evidence, per the backlog's
  stated rule.
- Closures use the file's existing in-place shape (`- [x] ~~…~~ — ✅ CLOSED …`), not a new one.
- `check-doc-links`: 653 links, 0 dangling.

## PROPOSALS

**P1 — finish the arbiter with the mechanism that already exists.** `engine-reach`'s `entryPoints()`
hull is the last caller not using `dataReach`. This is the one remaining half of entry 2 and it is now
a small job.

**P2 (mine) — the backlog cannot currently be wrong out loud, and that is why this piece was needed.**
Every claim in it is prose; nothing fails when it stops being true. The entries that went stale here
all had a *checkable* form — a config value, a function's existence, a branch at origin. A `verify:`
line that is a COMMAND rather than a sentence, for the entries that can carry one, would let the
backlog rot loudly instead of silently. The file already gestures at this ("an open item carries
either a command whose output decides it, or a stated reason why no command can") — **the convention
exists and is not enforced.**

**P3 (mine) — two rows pointed at a branch, and a branch is not a place a document may point.**
Both race-seed rows named `feat/race-seed`. That is the same failure SHIP-ORDER-CLEANUP-1 found in
`reports/evolution/INDEX.md` hours earlier, in a second file — so it is a pattern, not an incident. A
guard rejecting `feat/`, `diag/` or `fix/` branch names in `docs/` and `reports/` prose would catch
both. Recorded there as P3 and repeated here because the second instance is what makes it worth
building.
