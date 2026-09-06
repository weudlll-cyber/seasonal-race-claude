# NIGHT-MERGE-2026-09-05 — the night branch, caught up, delinted, and merged

**Date:** 2026-09-06
**Branch:** `night/2026-09-05`, merged to `master`. `feat/team-races-1` NOT touched and NOT merged.
**Kind:** hygiene + merge. **Nothing was built and no behaviour moved.**

---

## Why the branch was still open

`night/2026-09-05` carried ten finished pieces across six commits and had been pushed but not merged
by instruction; nobody came back to it. Two of its pieces — SERVER-LINT-1's `lint` and
`format:check` — were **red on arrival and red for pre-existing reasons**: the server had never been
linted or formatted by anything, so the guards were correct and the tree was not. Merging as it stood
would have moved a permanently red pair of guards onto master. That is what this piece removed first.

---

## Step 1 — the catch-up

Master had moved two merges ahead (`1bbbad7b`: GOLDEN-RACES-1 and RECOMPUTE-COST-1).

**THE CATCH-UP HAD NOTHING TO RESOLVE.** `git merge master` reported *"Merge made by the 'ort'
strategy"* with **zero conflicts**, and this is not luck worth glossing over — the two sides are
disjoint by file. Master's four commits added nine files and modified exactly one existing file
(`reports/evolution/INDEX.md`); the night modified fifteen, and `reports/night/INDEX.md` is a
different file from `reports/evolution/INDEX.md`. There is no path in both sets. So "resolve so BOTH
sides survive" required no decision: both sides survive because they never met. Merge `f573ca64`.

### The golden races, run after the catch-up

The instruction was that they must pass, because the night touched the measurement harness
(`scripts/verify.mjs`, `scripts/lib/routing.mjs`, `scripts/diag/comeback-beats.mjs`) and a changed
race would mean the night had done something it must not have.

```
check-golden-races: closed-garden-path-12 — 12 racers, 35.35 s of racing in 2439 frames
check-golden-races: open-river-run-6 — 6 racers, 30.00 s of racing in 1898 frames
check-golden-races: 2 race(s), every finishing position and time as recorded (362 ms).
```

**PASS.** Every finishing position and time as recorded. The night changed no race.

Worth recording alongside it: in the later `verify` run the `golden-races` guard was **SKIPPED**, and
the reason it printed is corroboration rather than a hole — *"nothing changed · declares 29 file(s)
by import closure"*. The night's harness edits are outside the closure the golden races actually
read. The manual run above is the direct evidence; the routing decision is the independent second
opinion, and they agree.

---

## Step 2 — the server lint and formatting

**All counts below were measured on the caught-up branch, not carried over from the night's report.**

### Formatting — 35 files → 0

`format:check` before: **35 files** with style issues. `npm run format` produced the fix; it is its
own commit (`ec8f7297`) and contains nothing chosen by hand.

★ **THE PROOF THAT IT CHANGED NO CODE IS NOT THAT FORMATTING USUALLY DOES NOT.** All 35 files were
parsed with acorn before and after and the syntax trees compared with positions and string raw-text
stripped: **0 of 35 differ.** A requote, a moved brace or a changed token cannot survive that
comparison. Prettier was also confirmed idempotent here — a second `--write` produced a
byte-identical diff.

*A trap worth naming, because it cost a confused minute:* on this OneDrive tree the first `--write`
pass was followed by `--check` still reporting five files, then one. That is write-back visibility,
not Prettier instability — re-running reached "All matched files use Prettier code style!" and the
idempotency check above then held.

### Lint — 36 findings → 2

`eslint src` before: **36 problems (9 errors, 27 warnings)**, in three classes, **none auto-fixable**
(fixable count: 0). Fixed smallest class first.

| Class | Severity | Before | After | How |
|---|---|---:|---:|---|
| `no-console` | warning | 2 | **2** | **NOT FIXED — see below** |
| `no-empty` | error | 9 | **0** | the rule's own comment accommodation |
| `no-unused-vars` | warning | 25 | **0** | deleted, unbound, or `^_`-marked — three kinds |
| **Total** | | **36** | **2** | |

**`no-empty` — 9 → 0** (`986d3d82`). Every one was `catch {}` around a best-effort cleanup: an unlink
of a file that may never have been created, a close of a handle that may already be closed, a
rollback allowed to fail. ★ **The fix is the rule's own accommodation, not a suppression** —
`no-empty` ignores a block containing a comment, which is exactly the case it was written for, and
the rule still fires on a genuinely empty block. So each of the nine now carries the sentence a later
reader wanted anyway. Three in `authRouter.js` say what stays true if the cleanup fails; six in tests
say they are teardown of something that may not exist. AST-compared before and after: **0 of 5 files
differ.**

**`no-unused-vars` — 25 → 0** (`83596326`). Not one class, and not fixed one way:

- **Dead, and deleted (7).** Six unused imports (`writeFileSync`, two `beforeEach`, two `join`,
  `existsSync`) and `PLAYER_NAME_MAX` in `playerGroups.js` — an alias of the shared limit that
  nothing ever read. Deleting the alias made its import dead too, so that went with it.
  NAME-LIMIT-1's guard (`client/src/modules/nameLimits.test.js`) **reads this very file** and
  requires it to import `shared/nameLimits.mjs`; it still does, through `tooLongNames` and
  `nameTooLongMessage`. That guard was run directly and is green (8/8).
- **The call matters, the binding did not (3).** `const a1 = await store.createUser(...)` and two
  `const createRes = await api.post(...)`. The await is load-bearing — it creates the row the
  assertions below depend on — so the statement stays and only the dead name goes. Deleting the call
  would have changed the test.
- **Destructure-to-omit (15).** `const { emoji, ...rest } = BASE_RACER` and its kin, including
  `toSummary`'s parameter and three sites in `tracks.js`. The binding is unused **by design**: naming
  the key is *how* the key is removed from the rest. These cannot be deleted without changing what
  the code does, so they carry the `^_` prefix the configuration already declares as "deliberately
  unused" — `varsIgnorePattern: '^_'` in `client/eslint.config.js`, inherited by the server config,
  and already used in client source. Renaming a destructured binding adds nothing to `rest` and
  removes nothing from it.

★ **Nothing was disabled, no inline suppression was added, and no configuration was narrowed.**

### What was left unfixed, and what it would take

**Both remaining findings are `no-console`, and both are deliberate operator-facing output on
stdout. Moving them changes behaviour, so under this piece's own rule they are not fixed.**

- **`server/src/index.js:17`** — the startup banner, `console.log` of "RaceArena server running on
  port N". The only fix the rule allows is `console.warn` / `console.error`, which **moves the line
  from stdout to stderr**. That is observable: `.claude/skills/dev-start/SKILL.md` documents it as
  the expected log line, and five evolution reports (COMPOSE-SEEDS-MOUNT-1, IMAGE-NO-CREDENTIALS-1,
  IMAGE-STANDALONE-1, SERVE-SPA-1, PUBLISH-STEPS-1) record it on stdout as the readiness signal. It
  would also label a healthy start as a warning.
- **`server/src/staticClient.js:82`** — `mountClientAssets(app, dist, log = console.log)`. Same
  stream argument, and the default is part of the function's signature; `staticClient.test.js`
  injects its own `log` around it.

*What it would take:* an owner decision that the server's normal output belongs on stderr, or that
these two lines should go through a logging indirection — and the indirection does not by itself
help, since the rule would then fire at the logger's own `console.log`. Either is new work and a
change to shipped behaviour, so neither belongs in this piece. **The guard is green regardless:
`eslint` exits 0 on warnings (no `--max-warnings`), matching the client's own `lint` script.**

### The server suite after every commit

Not only at the end: **725/725 in 31 files, green after the format commit, after the `no-empty`
commit, and after the `no-unused-vars` commit.**

---

## Step 3 — verify on the caught-up, cleaned branch

`npm run verify -- --premerge` on the branch **as it now stands** — a superset of the plain run,
since `--premerge` additionally forces what `ci.yml` runs unconditionally.

```
PASS 22   FAIL 0   SKIP 10
wall clock 430.3s — sequential would have been 1007.8s (2.3x)
```

Including, by name, the two guards this piece existed to make green:

```
PASS  server-format-check 35.1s
PASS  server-lint         77.9s
```

and `client-suite` (236.9s, ran alone), `server-suite` (48.7s, ran alone), `world-fingerprint`
(121.6s, `COMBINED 8a1977187e9c99b4`), `client-lint`, `client-format-check`, `script-suite`,
`fingerprint-containment`, `check-tags`, `check-index` and the rest. **Nothing red.**

The ship gate (`viewer-invariants`) was **not selected**, and printed why: *"PRE-MERGE GATE NOT
SELECTED — nothing it declares changed."* The branch touches no file in `client/src/modules/camera/`
or `client/src/screens/RaceScreen/`. That is the gate declining to apply, not a gate skipped.

---

## Step 4 — the fingerprints

The night moved none. The instruction was conditional: if the branch tip's tree and the merge result
are identical, the night's measurements stand; if they differ, run all four.

**THE TREES DIFFER, so all four were run.** `git diff 80f7118e f573ca64` is **not** empty — the
catch-up brought master's nine new files in — and step 2 then changed 37 files under `server/src` on
top of that. The conditional's cheap branch was not available, and claiming it would have been false.

**All four are UNMOVED. Nothing minted.**

| Role | Value | Result |
|---|---|---|
| `world` | `8a1977187e9c99b4` | matches the record |
| `world-off` | `aa09ed97a3a32689` | matches the record |
| `camera` | `152cf295c4c9ff54` | matches the record |
| `render` | `74946ddbeca517a9` | matches the record |

Each run with `--check`, which compares against `docs/fingerprints.json` rather than merely printing.
`docs/fingerprints.json` is untouched: **a mint records a movement, and writing one where nothing
moved would put a false event in the record.**

That they are unmoved is also what the shape of the change predicts, which is why the result is
reassurance rather than news: `verify`'s own sheet states the reason in the server suite's
not-covered line — *"the race engine — the server neither imports nor drives it, so this suite can
never speak to a fingerprint."* Step 2 touched `server/src` and nothing else.

---

## Steps 5–7 — the merge, the branch, CI

- **Merge:** `7bc2f99f` to master, `--no-ff`, with the six night commits and the four of this piece
  kept as history (`f573ca64` catch-up, `ec8f7297` format, `986d3d82` no-empty, `83596326`
  no-unused-vars, `336a8ce0` report). Nothing squashed.
- **Branch deleted at origin as the very next command after the push** — deleting late reddens
  master, because the origin-branch guard reads the remote live.

Final `git ls-remote --heads origin`:

```
d784e3211f7591c36aba3d4565b1355ccfd5e7b5	refs/heads/feat/team-races-1
7bc2f99f960af85309caa088a93b2785423a25a5	refs/heads/master
```

Only `master` and `feat/team-races-1` remain, which is the intended end state: **`feat/team-races-1`
was not touched, not merged, and not deleted.**

- **CI on the merge SHA (the PUSH run):** run `34060779867`, head sha
  `7bc2f99f960af85309caa088a93b2785423a25a5` — **conclusion `success`** in 4m8s. All three jobs
  green: *Server tests*, *Client checks*, *Living-doc guards + script tests*. The run carries one
  annotation, unrelated to this piece and pre-existing: GitHub forcing `actions/checkout@v4` and
  `actions/setup-node@v4` onto Node 24 because Node 20 is deprecated on its runners.

---

## Source hygiene

Everything below is under `server/src`. No file outside it was touched by steps 2–4, and **no scratch
file entered the repository** — the working tree was clean at every commit, `git stash` was not used,
and every instrument written for this piece (the AST comparator, the lint classifier, the two fix
scripts) lives outside the repository and is gone.

| Commit | Files | Lines + | Lines − |
|---|---:|---:|---:|
| `ec8f7297` formatting | 35 | 1124 | 638 |
| `986d3d82` `no-empty` | 5 | 30 | 9 |
| `83596326` `no-unused-vars` | 11 | 28 | 35 |

Net across `server/src`: **12,274 → 12,774 lines**, +500. The whole of that growth is the format
commit re-wrapping long lines plus the nine catch-block comments; the lint work itself is **net −7
lines**, which is the dead code leaving. Per file, before → after:

```
app.js                            82 →   80    routes/brands.js                 375 →  400
auth/authRouter.js               256 →  292    routes/brands.test.js            661 →  685
auth/authRouter.test.js          325 →  388    routes/playerGroups.js           209 →  202
auth/authz.integration.test.js   208 →  227    routes/playerGroups.test.js      472 →  511
auth/csrf.js                      98 →  103    routes/racers.js                 334 →  349
auth/csrf.test.js                209 →  223    routes/racers.test.js            745 →  750
auth/guards.js                   151 →  154    routes/surfaceClasses.js         178 →  174
auth/guards.test.js              144 →  154    routes/surfaceClasses.test.js    347 →  344
auth/rateLimit.js                 91 →   91    routes/tracks.js                 644 →  673
auth/rateLimit.test.js           192 →  201    routes/tracks.test.js           1599 → 1590
auth/recoverAdmin.js             101 →  106    routes/tracksDeleteSafety.test.js 186 →  201
auth/recoverAdmin.test.js        256 →  260    seedDelivery.js                  200 →  203
auth/routePolicyDrift.test.js    165 →  159    seedRuntime.test.js               96 →  100
auth/session.js                  102 →  113    staticClient.js                  140 →  140
auth/session.test.js             257 →  305    staticClient.test.js             172 →  172
auth/sessionInvalidation.test.js 154 →  158    dataPaths.js                      21 →   21
auth/setupContract.test.js       127 →  133    dataPaths.test.js                 36 →   36
auth/users.integration.test.js   299 →  301
auth/usersStore.js               275 →  276
auth/usersStore.test.js          531 →  663
```

---

## What a later reader should take from this

1. **A guard that arrives red is not a failure of the guard.** SERVER-LINT-1 was right and the tree
   was wrong; the cost of finding out was 36 findings, of which 34 were fixable without touching
   behaviour and **all 34 were fixed**.
2. **"Fix the lint" is three different jobs wearing one name.** Of 25 unused bindings, 7 were dead,
   3 were live statements with a dead name, and 15 were unused **on purpose**. Deleting all 25 would
   have broken tests; renaming all 25 would have left dead code behind.
3. **The two that were left are the interesting ones.** They are not hard; they are a decision about
   which stream the server's normal output belongs on, and that is the owner's, not the linter's.
