# MERGE-TEAM-RACES — the team-races topic closes, and the ports go back

**Date:** 2026-09-07
**Merge:** `2cc60029` on **master**, from `feat/team-races-1` @ `e07af3e3`. Branch **deleted at origin**.
**`night/2026-09-06` untouched.**

---

# STEP 0 — the ports

## What I did

★ **I stopped the production server on 4173 and started nothing on 5173.** The machine now carries
exactly one service: **the owner's API on 4000, PID 50700** — the same process, unrestarted, that was
listening when this session began.

| port | before this session | during | now |
|---|---|---|---|
| **4000** | the owner's API, PID 50700 | untouched throughout | **the owner's API, PID 50700** |
| **4173** | *nothing listening* | production build (put there by a brief) | ***nothing listening*** |
| **5173** | *nothing listening* | nothing | ***nothing listening*** |
| 4401 / 5401 | — | REPEAT-PROOF-1's isolated API + production bundle | stopped and deleted |

## How "before" was established — two independent ways, neither of them memory

**1. Empirically, from this session's own first command.** Before any brief had moved anything, the
port census read:

```
TCP    0.0.0.0:4000    0.0.0.0:0    ABHÖREN    50700
TCP    [::]:4000       [::]:0       ABHÖREN    50700
```

**Only 4000. Nothing on 4173, nothing on 5173.** So no service was *moved off* a port — a production
server was *started* on 4173 that had not been running. Putting that back therefore means **stopping
it**, which is what I did, and the census now matches the opening one exactly.

**2. From the project, for which port is whose.** This is the part the brief asked me to establish
from the repository rather than from memory, and the repository is unambiguous — in eight places:

| source | what it says |
|---|---|
| **`docs/VERIFY-RULES.md` R10** | *"An eye test or a perf log the owner takes is served from a **production build**, on port **4173**, and nothing else touches that port while the judgement is pending."* and *"The dev server on **5173** keeps its old job: developing."* |
| `scripts/serve-production.mjs:44` | `const PORT = Number(arg("port", 4173))` — production defaults to 4173 |
| `client/vite.config.js:21` | `server: { port: 5173 }` — the dev server is pinned to 5173 |
| `client/e2e/e2e-env.js:19` | *"PORTS ARE DELIBERATELY NOT 4000/5173/4173. Those belong to the owner's dev server, his API and **the production build he judges on**."* |
| `docker-compose.override.yml:10-13` | *"4173 — the production preview build currently being served … 5173 — the ordinary Vite dev server"* |
| `.claude/skills/dev-start/SKILL.md:26` | both origins are needed because 5173 is the dev server and 4173 is the production build the owner judges (rendered in English — that file is written in German, which is why it is described rather than quoted) |
| `night-task.md:36` | *"build production, serve on 4173, report the stamp. **This is what he looks at**"* |
| `docs/SETUP.md:85` | *"`npm run dev` # app on 5173, pinned in `client/vite.config.js`"* |

**Age of the assignment:** `scripts/serve-production.mjs` was added in `40183ec5` on **2026-08-10**
with the 4173 default, and R10 has carried the rule since. That is four weeks, not one session.

## ★ THE FINDING, reported rather than acted on

**The brief's premise is contradicted by the project.** It states *"production testing belongs on
5173, ordinary use on 4173"*. Every source above says the reverse: **production on 4173, the dev
server on 5173**. Nothing in the repository supports the swap, and `docs/VERIFY-RULES.md` R10 records
a **real incident** that the swap would re-create — on 2026-08-10 the rule pointed the owner at 4173
while the API had been told only about 5173, and *"the first thing he hit was a login screen that
would not log in"*, because `corsOptions` is built once at module load from `RA_CLIENT_ORIGIN`.

So I did the half that is supported and left the half that is not:

- **Done:** restored the machine to its pre-session state (4173 stopped, nothing started on 5173).
- **Not done:** moving production to 5173. That would not be a restoration — it would be **me
  reassigning a port against the project's own written rule**, which is the one thing the owner's
  standing instruction forbids. ★ **I have asked nothing and changed nothing further; this is the
  report the brief asked for in that case.**

If the owner does want production judged on 5173, that is his call to make — and it needs R10,
`serve-production.mjs`'s default, `vite.config.js`, `e2e-env.js` and the dev-start skill changed
together, plus `RA_CLIENT_ORIGIN` checked, or the login screen lies again. **No code was changed for
step 0 and nothing was committed for it.**

---

# STEP 1 — the catch-up

★ **There was nothing to catch up, and no hunk was resolved.**

```
$ git merge origin/master --no-edit
Already up to date.
```

`origin/master` is **`554f348e`** — the same SHA it was when this session started — and it is already
an **ancestor** of the branch:

```
$ git merge-base --is-ancestor origin/master HEAD   →  YES
merge-base:    554f348e52bda9939934f4dea6d074b54e18ad1c
origin/master: 554f348e52bda9939934f4dea6d074b54e18ad1c
```

The branch had already taken master in at **`0049d69b`** — *"merge(NIGHT-CHAIN-2026-09-06): catch the
team topic up with master 554f348e"*.

**The three things the brief says master carries are all there, and all already in the branch:**

| named in the brief | on master at | already in the branch? |
|---|---|---|
| GOLDEN-RACES-1 | `119771bc` | ✔ via `0049d69b` |
| RECOMPUTE-COST-1 | `1bbbad7b` / `83ab5882` | ✔ via `0049d69b` |
| CONSOLE-DECISIONS-1 | `554f348e` / `4a838660` / `915e274b` | ✔ via `0049d69b` |

`git diff --name-only` between the merge-base and master is **empty**, so there was no file for the
two sides to disagree about. **No conflict arose, so nothing had to be resolved either way**, and the
"keep both sides" rule was never put to the test.

## The golden races, on the caught-up branch

Run after the catch-up, verbatim:

```
check-golden-races: closed-garden-path-12 — 12 racers, 35.35 s of racing in 2439 frames
check-golden-races: open-river-run-6 — 6 racers, 30.00 s of racing in 1898 frames
check-golden-races: 2 race(s), every finishing position and time as recorded (348 ms).
```

★ **PASS. The topic did not change a race.**

---

# STEP 2 — verify on the caught-up branch

`npm run verify -- --premerge`. ★ **The brief writes `npm run verify --premerge`; that form does not
work** — npm swallows the flag as its own and the run silently is not a pre-merge run. The `--`
separator is what `scripts/verify.mjs:30` documents, and it is what was used.

**PASS 29 · FAIL 0 · SKIP 4 · wall clock 729.9 s** (sequential would have been 1607.9 s, 2.2×).

```
  PASS  client-suite        251.5s  (ran alone)
  PASS  server-suite        47.8s  (ran alone)
  PASS  viewer-invariants   205.3s  (ran alone)
  PASS  check-runin-frame   225.2s
  PASS  script-suite        143.8s
  PASS  client-lint         141.5s
  PASS  world-fingerprint   118.3s
  PASS  client-format-check 107.9s
  PASS  check-image-starts  93.0s
  PASS  server-lint         89.8s
  PASS  check-standings-invariant 65.5s
  PASS  server-format-check 55.1s
  PASS  check-writable      23.1s
  PASS  fingerprint-containment 12.3s
  PASS  check-tags          8.8s
  PASS  check-measured-stamps 5.5s
  PASS  check-ending-frame  5.3s
  PASS  check-config-claims 1.3s   ·  check-language-closed 1.2s  ·  check-index 1.1s
  PASS  check-fallback-agreement 1.0s  ·  engine-reach-doc 0.9s  ·  check-doc-links 0.5s
  PASS  ceremony-counts 0.5s  ·  check-fingerprint-payload 0.4s  ·  check-hooks-installed 0.4s
  PASS  check-doc-facts 0.3s  ·  check-config-keys 0.3s  ·  check-container-paths 0.1s

  client-suite      RETRY LEDGER: DISABLED — retry is 0, so no test can be retried and this run had nothing to count.
  world-fingerprint COMBINED 8a1977187e9c99b4 (seed=1 races=3 track-defaults, 10 tracks, default config)

  PASS 29   FAIL 0   SKIP 4
```

★ **Both suites the brief asked for ran inside this run and are reported above** — `client-suite`
**251.5 s** and `server-suite` **47.8 s**, each exclusive. They were not re-run separately, because
running the same suite twice on the same tree answers nothing.

**The 4 skips, derived by subtracting the 29 PASS lines from the 33 declared guards:**
`camera-fingerprint`, `render-fingerprint`, `check-seed-versions`, `golden-races`. ★ **`golden-races`
was skipped by the router and run explicitly anyway** — see step 1; it passed.

**Nothing was red, so the merge proceeded.**

---

# STEP 3 — the fingerprints

★ **The trees are byte-identical, so the topic's measurements stand and no fingerprint was re-run.**
Stated explicitly because the brief asks for it:

```
$ git diff feat/team-races-1 2cc60029 --stat
(empty)

branch tip tree:   6d9f5430105108a6c8c61a73be064311b6361abd
merge result tree: 6d9f5430105108a6c8c61a73be064311b6361abd
```

**The reason the diff is empty is structural, not lucky.** `origin/master` was already an ancestor of
the branch, so the `--no-ff` merge commit's tree is the branch tip's tree unchanged — the merge added
a commit, not a byte. A fingerprint is a function of the tree; an identical tree cannot produce a
different fingerprint, so re-running all four would spend about four minutes to reproduce four numbers
that could not have moved.

**One of them was re-measured anyway, for free, and is unmoved:** the `--premerge` run selected
`world-fingerprint` and it returned **`COMBINED 8a1977187e9c99b4`** — exactly the `world` value
recorded in `docs/fingerprints.json`. The other three (`camera` `152cf295c4c9ff54`,
`render` `74946ddbeca517a9`, `world-off` `aa09ed97a3a32689`) were not run and are unchanged in the
record. **Nothing was minted.**

---

# STEP 4-5 — the merge, and the branch

One merge commit, `--no-ff`, no squashing — the shape master's own history uses (`554f348e`,
`4a838660`, `7bc2f99f`, `1bbbad7b` are all `merge(...)` commits). All 23 piece commits survive.

```
554f348e..2cc60029  master -> master
 - [deleted]        feat/team-races-1
```

★ **The delete was the very next command after the push**, in the same shell invocation, because
`scripts/check-tags.mjs` reads `git ls-remote --heads origin` **live** and its `KEPT_BRANCHES` list is
**empty** — a merged branch still standing at origin fails that guard and reddens master.

```
$ git ls-remote --heads origin
2cc6002935a43598dde752330d7df4dc77e25e7d	refs/heads/master
c25c47be6020c26e0970572d86e00d5b81b7638c	refs/heads/night/2026-09-06
```

★ **Only `master` and `night/2026-09-06` remain.** `night/2026-09-06` is confirmed **not** an ancestor
of master, so it is legitimately kept rather than an undeleted leftover, and it was not touched.

---

# STEP 6 — CI

★ **CI's conclusion for the merge SHA `2cc60029`, from the PUSH run: `success`.**

```
$ gh api repos/:owner/:repo/actions/runs?head_sha=2cc6002935a43598dde752330d7df4dc77e25e7d
name=CI  event=push  status=completed  conclusion=success  runId=34152256885
started=2026-09-07T18:35:40Z
https://github.com/weudlll-cyber/seasonal-race-claude/actions/runs/34152256885
```

All three jobs green:

| job | conclusion |
|---|---|
| Server tests | **success** |
| Client checks | **success** |
| Living-doc guards + script tests | **success** |

★ **The branch delete landed in time.** "Living-doc guards" is the job that runs `check-tags.mjs`,
which reads `git ls-remote --heads origin` live and would have failed on a merged
`feat/team-races-1` still standing at origin. It is green, which is the evidence that the
push-then-delete ordering held.

**Master is green at the merge.**

---

# What merged

| piece | what it did |
|---|---|
| TEAMS-1 | a user belongs to a team, and a typo cannot split one |
| RACE-STORE-2 | the database races live in, and it cannot be edited |
| RACE-SAVE-3 | a finished race is kept locally, then sent when it can be |
| RACE-HISTORY-4 | the team's races, a button that repeats one, a short key |
| SHARED-CANONICAL-1 | the shared rules move above both packages; the image can start |
| IMAGE-STARTS-1 | a check that the packaged image actually starts — and it found one |
| HISTORY-NEVER-VANISHES-1 | a race this device holds is never hidden with nothing said |
| HISTORY-FILTER-SAYS-SO-1 | a filter may not hide silently |
| PROD-SAVE-1 | the race was in the list all along, at row 14 — one list, one order |
| SEED-FIELD-TYPING-1 | the short key can be TYPED, not only pasted |
| REPEAT-PROOF-1 | the repeat is the same race, to the millisecond, through all three doors |

---

# Source hygiene

**Lines before/after for anything the catch-up touched: there is nothing to report, because the
catch-up touched nothing.** `git merge origin/master` returned *"Already up to date"*, the working
tree stayed clean throughout, and `git diff` between the branch tip before and after step 1 was empty.
No file was edited, no conflict was resolved, no line changed.

**Everything this piece added to the repository:** this report and its line in
`reports/evolution/INDEX.md`. **No scratch file entered the repo** — the port census, the guard
derivation and the CI query all ran read-only or in the session scratchpad. **`git stash` was not used
on this tree.**

**Services, as left:** the owner's API on **4000** (PID 50700, never stopped, never restarted).
Nothing on 4173, nothing on 5173. Nothing was restarted, so there is no restart to name.
