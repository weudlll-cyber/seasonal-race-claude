# Verification rules — what to run, when, and how much

**What this is FOR:** the standing rules a spec would otherwise have to restate. A spec can now name a
rule instead of repeating it, which is the whole point — the specs had reached 120 lines and the last
report 378, and most of that was rules already being followed.

**What it is NOT for:** the ceremony itself. When a fingerprint-moving change must be minted, tagged
and re-baselined lives in [SHIP-CEREMONY.md](SHIP-CEREMONY.md), which is the canonical home. This file
is about the COST of verification: which instrument answers which question, and how much to run.

**Every rule below has a reason.** A rule without one gets followed until it is inconvenient and then
quietly dropped, which is worse than not having it.

---

## R0 — One command: `npm run verify`

**Rule.** Run `npm run verify`. It reads the diff, chooses the guards that can possibly have
something to say about it, runs them concurrently, and prints what it chose AND what it skipped with
a reason for each. `--dry` prints the plan without running anything.

**Why it is safe.** Nothing is removed — CI still runs the full set including coverage. What changes
is which guards run LOCALLY on a diff that cannot reach them. And a skip is printed as loudly as a
run: a verifier that silently does less is indistinguishable from one that is broken, which is the
failure mode this project has already paid for twice.

**What the diff IS.** Committed-on-this-branch (`<base>...HEAD`) UNION uncommitted UNION untracked.
Both halves matter: a block measures before it commits, and the branch's earlier commits are part of
what it is shipping. The base defaults to `master`; `--base=HEAD` narrows it to uncommitted work
only.

**EACH GUARD DECLARES ITS OWN ROUTING, and there is no route table.** VERIFY-ROUTING-2 deleted the
`ROUTES` map in `scripts/verify.mjs`: a guard now answers `--declare` with what it covers, what it is
blind to, and which paths select it, and `scripts/lib/routing.mjs` asks every guard rather than
consulting a list. **The one home for "which paths select this guard" is therefore the guard itself.**
The reason is the one the table kept demonstrating: a new guard had to be added in two places, and
the place that got forgotten was always the table.

**The SET of guards is discovered, not listed** — `guardScripts()` scans `scripts/` for
`check-*.mjs`, `*-fingerprint.mjs` and `fingerprint-default.mjs`, plus `gen-engine-reach-doc.mjs`
by name, plus the two suite guards declared in `routing.mjs`. So this document deliberately states
**no count**: an earlier version said "seven", which was true when it was written and was fifteen by
the time anyone read it again. `--dry` prints the current set.

**Why one generator is named individually rather than a `gen-*` wildcard.** Discovery works by RUNNING
each candidate with `--declare`, and most scripts here do their work at module load — asking a sweep
what it covers would run the sweep, and a generator run with no argument REWRITES its document.
`gen-engine-reach-doc.mjs` is safe to ask because it declares and exits first, and `verify.mjs` gives
it `--check` so it can only read. Any future generator earns its place the same way, one name at a
time; a wildcard would enrol the next one automatically and in write mode.

The declaration is printed with every skip, so what a guard believes is visible without reading it.
Two consequences that are easy to be surprised by: a change under `client/` selects the client suite
even outside `src/` (the configs decide how the suite runs), and a hull file whose edit is comments
and whitespace only does **not** select the world fingerprint — that is reported as an INERT skip,
never silently.

**An argument verify does not understand stops the run** before any work happens (VERIFY-COST-3).

## R0a — A run that verified NOTHING must not exit 0

**Rule.** If routing selects no guards, `npm run verify` **refuses**: it names the cause, prints the
command to use instead, and exits **2**. Exit 2 means refused; exit 1 means a guard failed.

**Why it exists.** Found during the SHIP-THE-LINE merge: on master, `npm run verify` printed
`PASS 0  FAIL 0  SKIP 7` and exited 0 having checked nothing. The routing diffs `master...HEAD`,
which on master is empty by definition, so all seven guards THERE WERE THAT DAY were correctly told they had nothing to
look at. **Seven honest skips summed to one dishonest exit code**, and the full-weight run the ship
needed had to be asked for by hand as `--base=<the pre-merge commit>`.

**Why a refusal and not a cleverer default base.** On master, "what changed" has at least three
defensible answers — the last commit, the last merge, everything since the last tag — and they
verify different things. Guessing would restore the exit code while keeping the real defect: a green
run that checked something other than what the person meant. The human picks; the machine does not.

**What you get in each case:**

| you are…                          | what happens                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| on a feature branch               | unchanged — the diff against `master` routes normally                                              |
| on master, no argument            | **REFUSED**, told HEAD and the base are the same commit, and given `--base=<first parent>`         |
| on master with `--base=<commit>`  | routes normally against that commit — this is the full-weight post-merge run                       |
| on a detached HEAD                | routes against `master` as usual; refused only if that diff is genuinely empty                     |
| with a base that does not resolve | **REFUSED**, and told the ref is the problem rather than the work                                  |
| with a base sharing no history    | **REFUSED**, and told there is no merge base                                                       |
| `--dry` with an empty plan        | also refused — `--dry`'s job is to show the plan, and a plan that runs nothing is worth failing on |

## R0b — Format, then measure, then commit

**Rule.** Formatting happens BEFORE the fingerprints are measured. `npm run verify` enforces the
order itself; `--no-format` opts out and says so.

**Why it is safe.** The pre-commit hook reformats. Until this rule, it did so AFTER the block had
measured, so every measurement described a tree that was never committed and had to be taken again.
Behaviour, not formatting, sets a fingerprint — so the second pass never changed a number, it only
cost the time. Formatting first removes an entire measuring pass with no loss of certainty.

## R1 — The world fingerprint runs when the engine can reach the diff

**Rule.** Run `node scripts/fingerprint-default.mjs` when your diff touches a file the race engine can
reach. Ask the repo rather than remembering: `node scripts/engine-reach.mjs --check <paths>` exits 0
if any of them can.

**Why it is safe.** The trigger is the transitive closure of `raceCore.js`'s imports, computed from
source — 19 files against the 103 the old folder rule fired on. What the core cannot read cannot
change the race. The closure is guarded by `scripts/engine-reach.test.mjs`, which fails if a new
import stops appearing in it or if a dynamic `import()` (which a static walk cannot follow) ever
enters the closure.

**What it does not catch, so do not over-trust it:** values passed INTO the engine as arguments from a
screen file. `drawnBodyWidthRefPx` is the standing example. If your diff changes a number that is
handed to the race, mint anyway. Details in SHIP-CEREMONY.md.

## R2 — Measure BEFORE only when the acceptance is relative

**Rule.** A before-measurement is required in exactly two cases: the acceptance is relative ("no longer
jumps", "fewer dead finales"), or a MEASUREMENT TOOL is being refactored. When the acceptance is an
absolute target ("the camera ends within N px of the lookback point"), measure after.

**Why it is safe.** An absolute target is falsifiable on its own — the after-number either meets it or
does not, and a before-number adds nothing but a run. A relative claim is not falsifiable without the
baseline; and a refactored measurement tool must reproduce its own prior output or it is a rewrite
with no test (Lesson 202).

## R3 — Measure at the END of a block

**Rule.** Run the expensive instruments once, on the final committed state — not after each step.
The exception is when the result DECIDES whether the next step happens.

**Why it is safe.** Intermediate numbers are not the ones that ship, and the fingerprint hashes
behaviour, so lint and formatting cannot move it (the standing rule in `fingerprint-default.mjs`'s own
header). The exception exists because a stop rule with no measurement behind it is a guess: staging a
block so an early measurement can kill it is the cheapest thing in this project.

**Corollary.** Measure after the pre-commit hook has run. A formatting pass between the measurement
and the commit measures a tree that was never committed.

## R4 — Two contrasting tracks, not ten

**Rule.** Exploratory measurement uses two tracks chosen to contrast (one open, one closed; or the
extremes of whatever the question is about). Ten tracks are for when the question IS the spread across
tracks, and for the fingerprints, which are gates rather than investigations.

**Why it is safe.** A defect that shows on one track and not another is more informative than the same
defect counted ten times, and the ten-track habit costs five times the wall clock for the same
conclusion. When the spread turns out to matter, the remaining eight are one command away.

## R5 — The eye and the harness answer different questions

**Rule.** The owner's eye answers "how does this look". A harness answers "did something change that
must not". Do not ask either to do the other's job.

**Why it is safe.** A fingerprint cannot tell you a motion feels wrong — FINISH-MOTION-1's 2708 px
jump hashed as just another frame for months. And an eye cannot certify that nothing else moved: it
sees one race on one track. Sending the owner a change to look at without the harness having cleared
it wastes his time; running the harness and calling the result "good" wastes the change.

**Corollary.** He must be able to read the build pill before he judges. A verdict on an unidentifiable
build has cost this project two days.

## R6 — The report carries the result; the commits carry the derivation

**Rule.** A report contains what was delivered, the deviations from what was asked, and the numbers.
How the conclusion was reached — the hypotheses refuted, the intermediate readings — belongs in the
commit messages, which is where someone re-treading the ground will look.

**Why it is safe.** The owner reads the report to decide something; the derivation is for whoever
re-opens the question, and git already keeps it next to the code it explains. The 378-line report was
mostly derivation.

**The exception, and it is narrow:** a refuted hypothesis belongs in the report when it would
otherwise be retried. "Not the OneDrive condition" is worth a line forever; "I first tried a threshold
of 0.01" is not.

## R7 — Ask what a test is for BEFORE writing it

**Rule.** Two questions, before the test exists: _what breaks if I delete it_, and _what goes
unnoticed if it is missing_. If neither has an answer, do not write it. Prefer one test that asserts a
PROPERTY over several that assert instances.

**Why it is safe.** A thing tested to death is also dead: tests that assert instances have to be
re-blessed on every honest refactor, which teaches the next person to update expectations without
reading them. That is how a suite stops being a guard. The counter-rule already exists and stays —
L203, a switch is tested by proving its two positions differ — and it is compatible: one property test
with both positions beats six instance tests with neither.

**Reporting rule.** Report tests DELETED or MERGED alongside tests added. A block that reports only
additions cannot demonstrate restraint even when it exercised it.

## R8 — Merge on a green LOCAL verify; CI runs after and reports

**Rule.** Do not wait on CI before merging. Merge when `npm run verify` is green locally; CI runs on
the push and reports. **Two exceptions, and they are not negotiable:**

1. **The change touches CI, the guards, or the verify path itself.** Then the local run is marking its
   own homework and CI must be green FIRST.
2. **Immediately before an unattended night block.** Master must be provably good, because hours of
   work will be built on it with nobody watching.

**Why it is safe here, and the "here" is load-bearing.** A red master costs this project almost
nothing: nothing is deployed, the owner's dev server runs from the working tree, there is no second
developer building on it, and he is notified within minutes either way. Waiting costs three to four
minutes per block of nobody doing anything. That trade is only correct under those four conditions —
if any of them stops being true, this rule stops being safe.

**WHAT THIS ORDERING DOES NOT CATCH**, and it is the real cost:

- **A different environment.** CI runs on a clean Linux runner; the local verify runs on Windows with
  the owner's node and an OneDrive-synced tree. Path handling, line endings and case-sensitivity
  differ, and only CI sees the first one to break.
- **Time-dependent checks.** The security-audit gate went red two days ago because an advisory
  appeared upstream, not because of any commit. Nothing local can anticipate that.
- **Coverage.** It runs only in CI (see below), so a coverage regression is invisible until after the
  merge.

## R9 — Do not walk away before the notification has been seen

**Rule.** After pushing, stay until the CI result has arrived and been read.

**Why it is safe.** R8's entire safety argument is "he is notified within minutes either way". That
is a claim about a human being present to read it. A push followed by walking away converts a
three-minute wait into an overnight red master, which is the one case where the cost stops being
small — and it is exactly the situation R8's second exception exists for.

## R10 — The owner judges a PRODUCTION build; the dev server is for developing

**Rule.** An eye test or a perf log the owner takes is served from a **production build**, on port
**4173**, and nothing else touches that port while the judgement is pending. One command, from the
repo root:

```
cd client && npm run build && node ../scripts/serve-production.mjs
```

That script copies `client/dist` **out of the OneDrive-synced tree** (to `%LOCALAPPDATA%\racearena-preview`,
replaced on every run) and serves it with no file watcher. Before handing anything over, state the
exact pill (`<sha> · <branch>`, no `+dirty`) and **confirm it by reading it from the served bundle**
rather than by assuming.

**THE API MUST BE TOLD ABOUT 4173, and forgetting it looks exactly like a dead backend.** The server's
allowed origins come from `RA_CLIENT_ORIGIN`, and `corsOptions` is built ONCE at module load — so a
port that is not in that list when the API STARTS cannot be added to it while it runs:

```
cd server && RA_SESSION_SECRET=dev-secret-not-for-production \
  RA_CLIENT_ORIGIN=http://localhost:5173,http://localhost:4173 npm start
```

Without 4173 the browser gets no `Access-Control-Allow-Origin`, every call fails as a network error,
and the client reports **"Server not reachable. Check that the backend is running"** — while the
backend is running perfectly and answering 5173. **This is a real incident, not a caution:** on
2026-08-10 this rule shipped pointing the owner at 4173 while the API had only been told about 5173,
and the first thing he hit was a login screen that would not log in. The message names the wrong
cause, so the evidence to trust is the API's own answer, not the client's:
`curl -H "Origin: http://localhost:4173" http://localhost:4000/api/auth/me -i` — an `access-control-allow-origin`
header means the API is fine and the origin list is the problem.

The dev server on **5173** keeps its old job: developing, and any check where the bundle is not the
question. Your own work runs on a different port — `npm run dev -- --port 5273 --strictPort`.

**Why — and it is the owner's finding, not a preference.** On 2026-08-10 every perf log he took came
from the dev server while every number the assistant reported came from production bundles, and that
is why the two never agreed. It was never "his machine versus a harness". **FRAME-GAP-2 had already
measured the difference: the dev bundle costs about a third of physics and HIDES how the DOM scales
with window area** — React's development build re-runs every component with checks the production
build strips, so the one regime the standings work had to be judged in was the one the judgement was
never taken in.

**And why not from the repo folder.** `client/dist` sits in a synced directory. Measured the same
night, served from there: one frame took **1016 ms** with nothing on screen to explain it, and
arm-to-arm variation swamped a real effect. Copied out and served watcher-free, the same builds
separated cleanly. **A measurement taken inside the synced tree is not measuring the code.**
`vite preview` is deliberately not the command here: it serves the synced directory and holds a
watcher over it.

**What this does NOT change.** The build pill rule stands exactly as it was, and it is the half that
has already cost two test runs in one evening: whatever is being judged, read the pill from the thing
being served. The failure is silent by construction — a branch switch or a stray edit re-points a
server with no warning, and the picture still looks plausible.

**The practical consequence for the agent:** if a block needs the tree on a different branch while a
judgement is pending, use a `git worktree` at a SHORT path outside the OneDrive tree
(`git worktree add C:/ra-wt <branch>`), not a checkout in the main tree. Long paths under the
scratchpad fail on this machine, and `git worktree prune` cannot delete the stale stubs here — both
are the reparse-point condition recorded in the backlog.

**Why it is safe — and why it is not optional.** This has now cost him two test runs in one evening.
The failure mode is silent by construction: the dev server serves the WORKING TREE, so a branch
switch or a stray edit re-points it with no warning, and the picture still looks plausible. His
verdict then applies to a build that was never the one under test, which is worthless in exactly the
way BUILD-TRUTH-1 and BUILD-UNKNOWN-1 were written to prevent — the pill was doing its job both
times, and it was not read.

**The practical consequence for the agent:** if a block needs the tree on a different branch while an
eye test is pending, use a `git worktree` at a SHORT path outside the OneDrive tree
(`git worktree add C:/ra-wt <branch>`), not a checkout in the main tree. Long paths under the
scratchpad fail on this machine, and `git worktree prune` cannot delete the stale stubs here — both
are the reparse-point condition recorded in the backlog.

## R11 — If a guard disagrees with a sentence, the GUARD is the first suspect

**Rule.** When a guard fails on a document, the first question is not "how do I fix the sentence" but
"is the sentence true?" If it is, **fix the guard** — narrow it, or exempt that sentence by name with
a reason recorded in the guard itself. Never make a true sentence vaguer or false in order to get a
green tick. Every exemption a guard grants must be PRINTED when it runs, so that a decision to yield
is visible rather than buried.

**Why it is safe — and why the opposite is not.** A guard is a lexical approximation of an intent; a
sentence is somebody's understanding written down. The approximation is much more likely to be wrong,
and it is far cheaper to correct. The failure mode this prevents has a name here already: Lesson 206,
where a guard blamed `docs/CAMERA_DIRECTOR.md` for being stale when the real cause was a shallow
clone, and the cheapest response to its message would have been to destroy a correct stamp.

**It has nearly happened twice, both recorded so nobody thinks this is theoretical:**

- CONFIG-TRUTH-1 — `check-config-claims.mjs` flagged _"the minimum tested duration is 30 seconds"_,
  a true statement about test COVERAGE, because `duration` is both an English word and a config key.
  The fix was to declare `duration` unscannable, by name, with the reason. The sentence stands.
- MERGE-AND-GUARD-1 — a track-count check flagged _"Gate: 400 races/arm, 4 tracks, paired seeds"_,
  where four tracks really were used. Narrowing it to "all N tracks" did not help, because
  `all four tracks` and `all 10 tracks` are the same construction. **The check was abandoned rather
  than shipped**, and the reasoning lives in `scripts/check-doc-facts.mjs`.

**The corollary, which is the part people skip:** abandoning a guard is a legitimate outcome. A check
that can only be satisfied by damaging the documents is not a check, and shipping it anyway to have
built something is how a suite stops being trusted.

## R12 — The hooks are TRACKED, and one command puts them in effect

**Rule.** The git hooks live in **`.githooks/`**, which is tracked. In a fresh clone or a fresh
worktree, one command — and only one — makes them take effect:

```
npm run hooks:install
```

`npm install` and `npm ci` run it too, through `prepare`, so the usual first step already does it.
`node scripts/setup-hooks.mjs --check` reports without changing anything.

**This is the ONE HOME for how the hooks work.** Everywhere else points here.

**What the command does, and why one `git config` line is not enough.** Three separate things have
to be true, and only the first is a setting:

1. **`core.hooksPath` is not cloned.** Git config lives outside the object store, so every fresh
   clone starts with it unset and runs `.git/hooks/`, which this repository does not use.
2. **The executable bit is not honoured here.** `core.filemode` is **false** on this machine (Git
   for Windows), so a `chmod` on the working file records nothing — the old hook was tracked as
   `100644`. Git for Windows runs a hook through `sh` regardless of the bit, but **git on Linux does
   not execute a non-executable hook**, so a hook authored here would have been dead everywhere else
   and green here. The command sets the bit **in the index** (`git update-index --chmod=+x`), which
   is what actually travels in a clone and works from Windows.
3. **A relative `hooksPath` resolves against the WORKTREE.** That is what broke before: it pointed at
   `.husky/_`, which is generated and untracked, so it existed in the main worktree and nowhere else.
   `.githooks/` is tracked, so the checkout supplies it everywhere.

**MEASURED, not assumed — `core.hooksPath` is SHARED across worktrees on this machine.** It is set in
`.git/config`, which linked worktrees inherit; `extensions.worktreeConfig` is on, but no
`config.worktree` overrides it. A worktree created during HOOK-SILENT-1 read back `.githooks`'s
predecessor unchanged. So tracking the directory IS enough for worktrees — the setting travels, and
only a fresh clone needs the command.

**Why it is safe.** Nothing about what the hook DOES changed when it moved. The failure it removes is
the one HOOK-SILENT-1 demonstrated: git resolving `hooksPath` to a missing directory runs **no hook,
prints nothing, and exits 0**. Commits succeed. Every check this repository owns is walked past, and
the only evidence is its absence.

**The absence is now loud.** `scripts/check-hooks-installed.mjs` runs in `npm run verify` as an
always-on guard and fails when the hooks are not in effect — unset, pointing elsewhere, or pointing
at a directory whose files are gone.

**It is NOT in the hook**, deliberately: if the hooks are not in effect the hook does not run, so a
hook that checks whether hooks run can only ever report success. **It is NOT asserted in CI**
either — a runner makes no commits and never runs the setup command, so this is not a property CI
can have; it skips there and says so in one line. What CI verifies instead is that the guard WORKS,
through `scripts/check-hooks-installed.test.mjs` in the script suite, against fixture repositories in
all three broken states.

## R13 — A new truth gets a RULE INSIDE AN EXISTING GUARD, not a new guard script

**Rule.** When something new needs protecting, the first question is **which existing guard already
looks at that ground**, and the answer is a rule added inside it. A new `check-*.mjs` is the last
resort, not the first move, and taking it means saying in the commit message which existing guard was
considered and why it could not host the rule.

**Why.** The guard set is now large enough that its own weight is a cost: every guard is a file to
route, a declaration to keep true, a test file to maintain, a line in CI, and one more thing a reader
has to hold. A rule added to a guard that already reads those files costs a function and a test.
CHECK-AUDIT-1 counted **29 distinct checks**; the marginal one is cheap to write and is never free.

**THE COUNTER-EXAMPLE IS DELIBERATE, AND IT IS THE INTERESTING HALF.** `check-config-claims`,
`check-doc-facts` and `check-fingerprints` all scan the same living documents for a forbidden kind of
string — a config value, a stated fact, a current fingerprint. They were **not** merged into one
document guard, on purpose:

- **Three narrow guards each fail loudly about one thing.** One guard with three modes fails about
  "documents", and the reader then has to work out which mode fired. A failure message that names its
  own subject is most of a guard's value.
- **A merged guard can be half-disabled without anyone noticing.** If one mode's anchor breaks — a
  pattern that no longer matches, a directory that moved — the guard still runs, still passes, and
  reports success over ground it never looked at. **This repository has shipped that shape twice**
  (`check-fingerprints` over a directory it was never pointed at, `check-language-closed` unable to
  see its own untracked files), and both times the cost was a green run that meant nothing.
- **Their blind lists differ.** Three declarations state three different holes; one declaration would
  have to state the union, which is where a hole goes to hide.

**So the rule is a DEFAULT, not a law:** add to an existing guard unless the new rule would need a
different anchor, a different failure message, or a different blind list — in which case it is a
different guard and the three siblings above are the precedent for saying so.

**THERE IS NO GUARD FOR THIS RULE, AND THERE MUST NOT BE ONE.** A checker that enforced "no new
checkers" would be the joke this rule exists to prevent — the 30th check, whose entire subject is
that there are 29. It is a rule for a person to apply with judgement at review time, and the place it
is enforced is the commit message.

---

## The instruments, and what each costs

Timings on the owner's machine, and they vary with load — treat them as the right order of magnitude,
not as constants.

| instrument                                             | answers                             | cost                                                           |
| ------------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------- |
| `fingerprint-default.mjs`                              | did the shipped RACE change         | **113 s** (was 195 s before VERIFY-COST-1 parallelised it)     |
| `camera-fingerprint.mjs`                               | did the DIRECTOR's decisions change | ~47 s                                                          |
| `render-fingerprint.mjs`                               | did the DRAW CALL SEQUENCE change   | ~15 s at 3400 frames; ~77 s once the window reaches the finish |
| `client` test suite (`npm test`)                       | did anything assert-able break      | **~185 s**, no coverage                                        |
| `client` suite with coverage (`npm run test:coverage`) | the same, plus the coverage report  | CI only — see below                                            |
| `check-index` / `check-doc-links` / `check-tags`       | are the living docs self-consistent | < 5 s each                                                     |

**Do not run an instrument out of habit.** If nothing drawn changed, the render fingerprint has no
question to answer, and saying so in the report is better than a number nobody needed.

### Where coverage runs, so nobody discovers later that it stopped

**Locally: it does not, and it never did.** `npm test` is `vitest run`. The `coverage:` block in
`client/vitest.config.js` is _configuration for when coverage is asked for_, not an enable — V8
coverage is collected only under `--coverage`.

**In CI: every run, on every push to master and every PR targeting it** — `.github/workflows/ci.yml`
invokes `npm run test:coverage`. That is the only place it runs, and it is where it belongs: coverage
is a reviewer's question, not an inner-loop one.

**So a slow local suite is not coverage.** Measured, the cost is concentrated elsewhere: the slowest
ten of 208 files are **79%** of all file time, and **`goldenRealArm.test.js` alone is 26%** — 152 s
of 579 s. If the inner loop needs to get faster, that is the file to look at — not the coverage flag.

**THIS LINE NAMED THE WRONG FILE UNTIL 2026-08-14.** It said `goldenEquality.test.js` at 46%. Both
halves were wrong: the file count had grown from 179 to 208, and `goldenEquality` is not the
dominant file and may never have been. Re-measured twice, isolated and under full-suite contention,
`goldenRealArm.test.js` wins both times — **52.8 s against 25.3 s** running the parity directory
alone, **152 s against 36–76 s** in a whole-suite run. Anyone who acted on the old line would have
optimised the wrong file.

**These figures are NOT carried by a `MEASURED:` stamp, deliberately.** A timing claim depends on the
whole suite, so a stamp would have to declare `client/src/` as its dependency and would then go stale
on essentially every commit — a guard that cries wolf is worse than none. The contention spread is
real (`goldenEquality` measured 36 s and 76 s in two runs of the same tree), so treat the shares as
approximate and the RANKING as the finding. Measured on `a0970310`, 2026-08-14.
