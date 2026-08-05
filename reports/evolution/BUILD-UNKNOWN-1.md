# BUILD-UNKNOWN-1 — the badge could not read, and could not say why

**Branch** `feat/finish-seam-1` · **Date** 2026-08-05 · **Fingerprints** render `73ba53ba9fea12c7`
unmoved (the badge text is pinned in the harness and `formatBuildLabel` is untouched); camera and
world not reachable by this change. **Suite** 3623 → **3632**.

---

## FOR THE OWNER — two sentences

**What went wrong:** your dev server had been running for fifteen hours and had reached a state where
it could no longer start ANY child process — Windows error `0xC0000142`, so `git` never ran and the
badge correctly refused to guess; nothing was wrong with the repository, your PATH, or the code.

**What you do:** the dev server has already been stopped and restarted for you and the badge now
reads `build 98923007 · feat/finish-seam-1` — so **nothing is blocking the eye test**; if you ever see
`build unknown` again, stop the dev server and start it again (saving a file is not enough), and the
terminal will now print the reason on the line beginning `[ra-build]`.

Your photo-finish eye test is unblocked: Dev Screen → `photoFinishCloseThresholdT` **0.15** and
`photoFinishLeadProgress` **0.85**, then run races normally — effectively every finish will take the
photo-finish path.

---

## 1. THE REPRODUCTION

Reproduced before anything was changed, which matters here because the fault was invisible from the
outside and every plausible story about it turned out to be wrong.

| # | Question | Method | Result |
|---|---|---|---|
| 1 | Is the badge actually broken, or is it the screen? | `fetch` the virtual module straight off the running server | `{"commit":"unknown","branch":"unknown","dirty":false}` — **reproduced** |
| 2 | Is the repository in a bad state? | `git rev-parse --short HEAD` from the repo root; `.git` inspection | `98923007`, clean tree, one worktree, no `index.lock`, no interrupted operation — **refuted** |
| 3 | Does the plugin's own code work? | `readBuildInfo()` imported and called directly | `{commit:'98923007', branch:'feat/finish-seam-1'}` — **refuted** |
| 4 | Is the failure latched, or live? | touch a watched file; then edit a source file, fetch it, revert, fetch again | the edit was served and the revert was served → the watcher fires and `recheck()` runs, and the identity still did not move → **the failure is live, not a cached module** |
| 5 | Is `REPO_ROOT` resolving wrongly? | it is `join(HERE,'..')` from the plugin's own location; verified by running the same code | resolves to the repo root — **refuted** |
| 6 | Is it the OneDrive / ReparsePoint condition? | `.git` IS a reparse point (`Mode: darh-l`) — but a fresh server on the same tree | fresh server reads `98923007` correctly — **refuted** |
| 7 | Resource exhaustion? | process metrics for the stuck PID | 1485 handles, 187 MB WS / 485 MB private, 9.7 GB free — **refuted** |
| 8 | Defender ASR blocking child processes? | `Get-MpPreference` | no ASR rules configured — **refuted** |
| 9 | Is it the PATH? | read the launching shell's and the dev server's real environment out of MSYS `/proc/<pid>/environ` | PATH is Windows-form and contains `C:\Program Files\Git\cmd` — **refuted** |
| 10 | Is it anything in the environment at all? | replay all **104** inherited variables into a fresh child and run git | `98923007` — **refuted** |

Ten questions, one reproduction, nine refutations, and **no cause**. That is where the diagnosis
stopped, and the reason it stopped is the subject of §2.

## 2. THE DESIGN FLAW IS WHAT BLOCKED THE DIAGNOSIS

`git()` discarded stderr (`stdio: ['ignore','pipe','ignore']`) and its `catch` returned `''`. So the
instrument could detect that it had failed and could say nothing about how. Every experiment above
was an attempt to reconstruct, from outside, information that had existed inside a `catch` block
fifteen hours earlier and been deliberately thrown away.

The fix is four lines. Capture the exit status and stderr; put a one-line cause on the identity.

**The moment the reason existed, the cause named itself.** Vite restarts its config when a config
dependency changes, so saving the edited plugin reloaded it into the still-running server, and the
next fetch returned:

```
{"commit":"unknown","branch":"unknown","dirty":false,
 "reason":"git rev-parse --short HEAD: exit 3221225794 — Command failed: git rev-parse --short HEAD"}
```

## 3. THE ACTUAL CAUSE

**`3221225794` = `0xC0000142` = `STATUS_DLL_INIT_FAILED`.** The child process could not *initialise*.
git never ran — which is exactly why stderr was empty and why no amount of stderr capture alone would
have been enough: **the decisive datum was the exit status**, and that was the part the old code
discarded most completely.

This is a Windows process-creation failure, and everything observed fits it and only it:

- It is bound to **one process**. A fresh node process on the same tree, with the same cwd and the
  same 104 environment variables, spawns git fine. (Experiments 3, 6, 10.)
- The process is otherwise **healthy** — normal handles, normal memory, still serving modules,
  watcher and HMR fully working. (Experiments 4, 7.)
- It is **persistent** for that process. Every re-check failed identically over fifteen hours.
- It is **cleared by restarting** the process, and by nothing else. Vite's own config-restart was not
  enough: that recreates the server *inside the same node process*, and the failure survived it.

**What I am NOT claiming.** `0xC0000142` has more than one underlying cause (desktop-heap exhaustion
in the session, a per-session process limit, a genuine DLL initialisation fault). The plugin spawns
three `git` children per re-check, throttled to 400 ms, which over fifteen hours is a great deal of
process creation, so a session-level resource is the leading suspect — but I did not observe the
kernel counter and will not name it as fact. What is established: **the child process failed to
start, this was local to that process, and a restart clears it.** One occurrence is an anecdote; the
backlog says what to do if there is a second.

**And it is NOT OneDrive.** That was the natural suspect and it was tested rather than assumed
(experiments 6 and 10). Two OneDrive findings on this machine, not three — recorded in the backlog so
it is not blamed by default next time.

## 4. WHAT CHANGED

Only `client/vite-plugin-ra-build.js` and its tests. **The badge still never guesses** — `unknown`
remains `unknown`, and no fallback identity source was added.

1. **`git()` returns `{out, reason}`.** stderr is captured instead of discarded; the catch builds a
   short one-line cause. It distinguishes *git never ran* (a spawn code, or an initialisation exit
   status) from *git ran and refused* (an exit status with its own complaint on stderr) — two
   different problems with two different fixes, which the old code rendered identically as `''`.
2. **Every failure returns the unknown identity WITH its reason.** `readBuildInfo()` now returns
   `{commit, branch, dirty, reason}`; `reason` is `null` on success.
3. **A failing `status --porcelain` no longer reports `dirty: false`.** The original returned a clean
   tree it had never managed to look at — precisely the lie of omission the dirty flag exists to
   prevent. An unreadable half now makes the whole identity unknown. *(Found by writing the tests,
   not by the incident.)*
4. **The dead `'detached'` fallback made real.** `git rev-parse --abbrev-ref HEAD` prints the literal
   `HEAD` on a detached HEAD, never empty, so `branch.out || 'detached'` could not fire — the badge
   would have read `build abc1234 · HEAD`, which looks like a branch called HEAD. It now says
   `detached`. *(Also found by the tests.)*
5. **The dev server states the identity it will serve, at start-up**, and warns — once per change of
   reason, not per event — when it cannot read one, with the restart instruction in the message.

```
[ra-build] start-up: serving build 98923007 · feat/finish-seam-1 +dirty
```

**The badge itself carries no cause, deliberately.** §1 asked me to consider it; the reason travels
with the identity and reaches the terminal, but putting it on the pill would add a second string on
screen that has to be kept true, and the pill's job is to be the shortest true thing. That is a
judgement, and it is reversible.

## 5. VERIFICATION

- **The failure was reproduced before it was fixed** (§1), and the fix was then confirmed against the
  live fault: the running server, with the new plugin loaded, printed the reason that named the cause.
- **New tests: 9**, in `client/src/modules/buildIdentityReason.test.js`. They drive `readBuildInfo()`
  against a **real git** in real temporary repositories, evaluated in **child processes** with chosen
  environments — a mock would have tested the mock, when the entire failure class is about what a
  spawned process actually does. L203 throughout: every "the reason is carried" assertion is paired
  with the working position, so none of them passes with the plumbing disconnected.
  - the working positions: a real identity with `reason: null`; a dirty tree seen as dirty; a
    detached HEAD as a STATE, not a failure
  - git unreachable → unknown **and** a reason naming the command; the reason is one line, < 300 chars
  - a non-repository → unknown with a reason; and its reason **differs** from the never-ran one
  - the unknown identity still renders as `build unknown`, `isBuildUncertain` true, and the reason is
    **not** in the drawn label
  - a corrupt index (the honest lever: `rev-parse` succeeds, `status` refuses) → unknown, not "clean"
- **Suite 3632 / 3632.** Render fingerprint `73ba53ba9fea12c7`, **unmoved** — `formatBuildLabel` is
  untouched and `render-fingerprint.mjs` pins its own `BUILD_BADGE`.
- **The owner's dev server was stopped and restarted** and now serves
  `{"commit":"98923007","branch":"feat/finish-seam-1","dirty":true,"reason":null}`.
  (`dirty` because this work is uncommitted at the time of writing — which is the flag working.)

## 6. PROPOSALS

### P1 (spec's) — the badge has no watcher, and both its failures were caught by the owner's eye

It lied confidently, then failed silently, and in both cases the alarm was a human noticing something
on screen. The start-up line is the cheap half and is now built; it helps only if somebody reads the
terminal.

The strong version is **`npm run dev` refusing to start when the identity is unreadable** — it turns
"an amber pill fifteen hours later" into "it did not start", which is unmissable. I did not build it,
because the argument against is real and is exactly the fault we just had: on a machine with a
transient process-creation fault it would block all work, including the work of diagnosing it. A
middle option exists — refuse only when `--strictPort` style strictness is asked for, or print the
warning in red and wait two seconds — and choosing between them is the owner's call, not mine.
Backlogged with the argument on both sides.

### P2 (spec's) — the OneDrive premise does not hold, and saying so is the finding

The spec offered: *if this is the OneDrive/ReparsePoint condition, that is the third thing it has
broken — write one backlog line naming the pattern rather than three workarounds.* It is not. `.git`
IS a reparse point here and it was the natural suspect, so it was tested twice (a fresh server on the
same tree; the failing server's exact environment replayed) and refuted both times; the exit code
names process creation, not the filesystem.

The backlog line I wrote is therefore the *opposite* one: **"NOT the OneDrive condition — recorded so
it is not blamed by default."** A machine with a known flaky subsystem accumulates a gravitational
pull toward that explanation, and the cost of the pull is that the real cause goes unlooked-for. Two
OneDrive findings, not three.

### P3 (mine) — stop spawning three processes per watcher event

`recheck()` runs `readBuildInfo()`, which spawns **three** `git` children, on every watcher event at
up to 2.5 times a second. Over a fifteen-hour session that is a large amount of process creation for
a question whose answer almost never changes — and process creation is precisely what failed.

The common case needs no process at all: `.git/HEAD` gives the branch (or a detached sha) by reading
one small file, and `.git/index`'s mtime tells you when dirtiness *could* have changed. Shell out only
when one of those actually moves. That is strictly less work, strictly fewer failure modes, and it
narrows the exposure to the fault this report is about — without adding a fallback identity or
guessing anything.

I did not build it here: it is a rewrite of the read path, the diagnosis does not justify it (one
occurrence), and §3 said to change only what the diagnosis justifies. Backlogged as the fix to reach
for **if there is a second occurrence**, which is the honest trigger.

### P4 (mine) — this is the third instrument-failure finding this week, and the pattern is now sharp enough to be a law

BUILD-TRUTH-1: the badge reported a value it could not know was stale. CAMERA-COMPANY-ONLY-2/3: one
value, three readers, one fixed — and the fixed reader vouched for the broken ones (Lesson 201).
Now: an instrument that detects its own failure and cannot describe it.

All three are the same family — **a check whose output cannot be audited by the person reading it** —
and each was caught by the owner's eye rather than by anything built. I have written it up as
**Lesson 204, the Mute-Instrument Law**, whose test is: *if it breaks at 3 a.m. and nobody is
watching, does the artefact it leaves behind name the cause?* A colour is not an artefact. A status
code is.

The generalisable rule, and I would apply it to the next guard as a matter of course: **the failure
path carries its reason, and the reason reaches a human without being asked.** Two of this week's
three findings would have been minutes instead of hours under it.

---

## 7. NOTICED, NOT FIXED

- **`recheck()` advances `lastIdentity` before the browser has consumed the reload.** If the tab is
  closed when the identity changes, `lastIdentity` moves anyway; the module *is* invalidated so the
  next request re-reads correctly, which is why this is benign today. It is fragile in the way that
  the sequence in front of it is not, and worth a look if this file is touched again.
- **`identityOf()` does not include `reason`.** Deliberate — a changed reason with an unchanged
  identity should not force a page reload — but it means a *recovery* from unknown to unknown-for-a-
  different-cause is invisible to the reload path. The log covers it; nothing else does.
- **The start-up line is the only proactive artefact.** See P1.
