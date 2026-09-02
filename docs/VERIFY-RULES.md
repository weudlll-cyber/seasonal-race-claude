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
by name, plus the suite guards declared in `routing.mjs`. So this document deliberately states
**no count**: an earlier version said "seven", which was true when it was written and was fifteen by
the time anyone read it again. `--dry` prints the current set.

**Why each generator is named individually rather than by a `gen-*` wildcard.** Discovery works by RUNNING
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

**IT REFUSES RATHER THAN ANSWERING ZERO (REACH-REFUSES-1).** Exit **2** means it examined nothing —
no paths were given, or `--base=` did not resolve — and it is never a clearance. The rule is the same
one R0a states for `npm run verify`, for the same reason: a run that checked nothing must not be
readable as a run that found nothing. **The tool takes the paths you hand it and reads no diff of its
own**, so the usual cause is a command substitution that expanded empty.

**Why it is safe.** The trigger is the transitive closure of `raceCore.js`'s imports, computed from
source — the counts are GENERATED in [SHIP-CEREMONY.md](SHIP-CEREMONY.md)'s engine-reach block and are deliberately not restated here. What the core cannot read cannot
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

## R5a — EVERY ACCEPTANCE IS A SAMPLE

**The owner's principle, 2026-08-23, in his terms: every acceptance is a sample. A verdict covers the
TRACK, the STATE and THE SEED it was given on. The same track with another seed can look entirely
different.**

**The rule this puts on a block.** Never write "owner-approved" as if it were a property of the
CHANGE. It is a property of the change _on the races he was shown_. Where the distinction can matter
— a claim that a behaviour is good, safe, or finished — say what he actually saw: the track, the
configuration, and the seed. Where a report has that detail and drops it, it has converted a sample
into a certificate.

**Why it is a rule and not a caution.** The alternative to stating it is counting, and counting is
what went wrong: the backlog carried "his eye has covered three of ten tracks" for eighteen days.
That number came from a documentation COUNT — the tracks that happened to be named in write-ups —
not from any record of what he watched, and it read as coverage because it was shaped like a
measurement. **Coverage of a space this size is not buyable by watching more races**, which is why
the eye-test session it justified was superseded rather than scheduled (BACKLOG.md PART TWO D13).

**What it does NOT do, and this is the boundary.** It does not devalue his verdict — R5 stands
exactly as written, and the eye still answers the question no harness can. **A sample is evidence.**
It is simply not a proof about every race, and a block that needs a proof about every race has to
get it from an instrument.

**Its practical partner is [EYE-TEST-SEEDS.md](EYE-TEST-SEEDS.md)**, which owns what a seed
guarantees, and whose template already asks for several seeds per verdict for exactly this reason.

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

**WHAT the merge must contain, and in what order, is not here.**
[SHIP-CEREMONY.md § THE SHIP ORDER](SHIP-CEREMONY.md) owns it — corrected 2026-08-18 so that
everything the merge commit must carry is written **on the branch** before the merge, which is what
makes a ship tag point at a commit that passes `check-tags`. The one step that cannot work that way
— a commit cannot name its own hash — is settled in a single follow-up commit, and that document
says which fields it corrects.

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

### R8a — what "CI green for exactly this SHA" means since the docs-only skip

**Rule.** Since CI-DOCS-ONLY-1 (2026-08-18), a push whose changed paths are **all** under `docs/`,
`reports/` or a repo-root `*.md` skips lint, format-check and both test suites. **All three jobs
still RUN and still report a conclusion for the SHA** — only the work inside them is conditional, and
the log names what was skipped and why.

**So green still means "every job examined this commit."** On a documentation-only commit it
additionally means "and the parts that could not have been affected were not re-run, by name."

**The one thing that genuinely got smaller**, stated rather than glossed: on a docs-only push, a
failure unrelated to the diff — a flaky test, a dependency resolving differently — is not discovered
by that push. The next code push finds it.

**What did NOT get smaller:** both security audit gates run on every push in both trees, because
their result is not decided by the diff; and the whole `docs` job is never skipped in either
direction, because its guards scan the entire tree rather than `docs/`.

**A workflow-level `paths:` filter is forbidden here** and the reason is this rule: it produces **no
run at all** for the SHA, so `gh run list --branch master --limit 1` hands back the PREVIOUS commit's
green run. The rule would not be weakened, it would become unverifiable while looking verified.

**The mechanism is not restated here.** `.github/workflows/ci.yml` owns it, and
`scripts/ci-docs-only.mjs` owns the predicate — including that every uncertainty (no base, a
force-pushed base, an empty diff, `workflow_dispatch`) fails OPEN and runs everything.

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
header means the API is fine and the origin list is the problem. **Why the list exists and what else the auth path reads is [AUTH.md](AUTH.md)'s.**

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
scratchpad still fail on this machine.

**`git worktree prune` DOES work here, and the recipe is three lines (corrected 2026-09-02,
WORKTREE-STUBS-1).** This paragraph said for four months that prune "cannot delete the stale stubs
here". That was true of every attempt anyone had made and false as a statement about the machine.
The blocker is the ReadOnly attribute on the stub's DIRECTORIES — and **`attrib -R /s /d` does not
clear it on nested subdirectories**, which is the whole trap: the recursion flag looks like it
recurses and does not. Name each level:

```
attrib -R /d .git\worktrees\<name>
attrib -R /d .git\worktrees\<name>\logs
attrib -R /d .git\worktrees\<name>\refs
git worktree prune
```

**★ AND THE REAL HAZARD IS NOT THE STUB, IT IS A JUNCTION.** A stub is inert metadata. What actually
cost this project something was `git worktree remove --force` run while a worktree had the main
tree's `client/node_modules` junctioned into it: it walked through the link and deleted into the real
tree, emptying `node_modules/.bin` (81 shims → 0) before Windows stopped it (SIDE-FREE-CULL-1,
2026-08-27). **Do not junction `node_modules` into a worktree.** If you already have, remove the
junction BEFORE removing the worktree — never the other way round.

**Why it is safe — and why it is not optional.** This has now cost him two test runs in one evening.
The failure mode is silent by construction: the dev server serves the WORKING TREE, so a branch
switch or a stray edit re-points it with no warning, and the picture still looks plausible. His
verdict then applies to a build that was never the one under test, which is worthless in exactly the
way BUILD-TRUTH-1 and BUILD-UNKNOWN-1 were written to prevent — the pill was doing its job both
times, and it was not read.

**The practical consequence for the agent:** if a block needs the tree on a different branch while an
eye test is pending, use a `git worktree` at a SHORT path outside the OneDrive tree
(`git worktree add C:/ra-wt <branch>`), not a checkout in the main tree. Long paths under the
scratchpad still fail on this machine. **`git worktree prune` DOES work here** — the recipe, and the
junction hazard that matters far more than the stub, are stated once above under R10's first
worktree paragraph and are not repeated.

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

## R12a — The hook asserts its OWN completeness, and it does it first

**Rule.** Before anything else, the pre-commit hook checks that **`.githooks/` in the working tree
matches the index** and that **nothing untracked sits in it**. If either fails, the commit is
refused.

**What it covers, and it is not what R12 covers.** R12 and `check-hooks-installed.mjs` answer *are
hooks in effect* — is `core.hooksPath` set, does the directory exist. Neither can answer *is the hook
in effect the one the repository tracks*. A hand-edited or stale local hook enforces less than the
repository claims and says nothing about it, which is HOOK-SILENT-1's failure one level in.
HOOK-TRACKED-1 left this as its first proposal.

**THE CIRCULARITY IS NOT CLOSED, deliberately.** A hook that does not run cannot report that it did
not run; that case belongs to `core.hooksPath` and to the installed-check, which run from outside.
**This covers the other case — runs, but is out of date — which nothing covered at all.**

**It compares against the INDEX, not HEAD, and that is the whole design.** The file that just ran is
the WORKING-TREE file; the index is what the commit will record. Equal means the hook that ran is the
hook being tracked — and it stays true while somebody is legitimately improving the hook, because
they stage it and the commit records exactly what enforced it. **Comparing against HEAD would make
every change to the hook impossible to commit through the hook**, which is a rule that would be
removed within a week.

**Proven both ways** (HOOK-SELF-CHECK-1): the tracked hook commits normally; an unstaged edit to
`.githooks/pre-commit` refuses the commit and names the file; an untracked file dropped into
`.githooks/` refuses it too, because git would run that file and the repository does not track it.

**`git commit --no-verify` remains the escape**, as it is for every other check here.

**The absence is now loud.** `scripts/check-hooks-installed.mjs` runs in `npm run verify` as an
always-on guard and fails when the hooks are not in effect — unset, pointing elsewhere, or pointing
at a directory whose files are gone.

**It is NOT in the hook**, deliberately: if the hooks are not in effect the hook does not run, so a
hook that checks whether hooks run can only ever report success. **It is NOT asserted in CI**
either — a runner makes no commits and never runs the setup command, so this is not a property CI
can have; it skips there and says so in one line. What CI verifies instead is that the guard WORKS,
through `scripts/check-hooks-installed.test.mjs` in the script suite, against fixture repositories in
all three broken states.

## R12a — The browser suite is NIGHT WORK, deliberately outside the ordinary path

**Rule.** The Playwright e2e suite is not in the per-push CI path and not in `npm run verify`'s
ordinary routing. It is run deliberately, during night work.

**The command and the full reason live in [NIGHT-RUN.md](NIGHT-RUN.md), which is their one home.**
Not repeated here.

**Why it is a rule and not an oversight.** It is about **ten minutes** — roughly five times the whole
per-push CI run. A ten-minute browser suite gating every merge trains people to re-run red builds.

**The history that made it urgent, and the state it is in now.** Until 2026-08-16 the suite had never
run successfully at all: `ProtectedRoute` landed 2026-06-14, no spec authenticated, and 85 of 102
died at the login gate — **about two months dead while looking exactly like a check** (see
[Lesson 209](LESSONS.md)). It was repaired over 2026-08-16/17 and is **103/103 green**, with a
measured flake rate of roughly **two tests per five runs** from one shared mechanism, now fixed. The
cost, not the state of repair, is why it stays outside the ordinary path.

**The decision is asserted, not just written down.** `scripts/verify.test.mjs` requires that
`client/e2e/*` selects no suite, so wiring it into the ordinary path fails a test and whoever does it
has to justify it.

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

## R14 — NO SECOND DEFINITION: a caller without a config reads the ONE HOME

**Rule.** No literal stands beside a shipped default. A function called **without** a config object
reads `DEFAULT_*` for every value it needs — `config?.k ?? DEFAULT_X_CONFIG.k`, never `?? 5` and
never `?? false`. This holds whatever the literal's current value is and whoever can reach it.

**The owner's ruling, 2026-08-19**, and it dissolved the question three blocks had been asking. The
question was *"should a missing setting mean OFF, or the shipped value?"*. He rejected it: **no
setting is ever missing.** Every loader walks the full key set of its defaults (`resolveFromDefaults`
iterates the DEFAULT keys), so the running game cannot lack a key. The fallbacks exist so a function
can be called with **no config at all** — and the only callers that do that are tests and harnesses.
A test calling a generator bare should get the SHIPPED game, not a quietly disabled one.

**So reachability is not the test.** Three blocks spent their budget on "is this branch reachable?"
and were answering the wrong question. The rule is about the number of definitions, not the number of
callers.

**Two traps this rule closes, both of which we walked into first:**

- **Deleting a mirror can CREATE one.** Removing `?? false` makes an absent key resolve to
  `undefined`, which is falsy — so a config-less caller silently runs the feature OFF. That is a
  second definition by omission, and it is worse than the literal because nothing names it.
- **`?? 0` on a number is not the safe form.** Removing it outright yields `NaN` in arithmetic;
  keeping it yields a stale value. Reading the home is neither.

**Why it is safe.** It removes values rather than changing them: every conversion under this rule has
left WORLD, WORLD-OFF, CAMERA and RENDER byte-identical, which is what makes it hygiene rather than a
ship. Where a module genuinely cannot import its defaults, that is a finding to report — not a
licence to keep the literal quietly.

**It is ENFORCED, and the enforcement is an empty list.** `scripts/check-fallback-agreement.mjs`
reports `0 disagree, 0 on the exception list`. The exception list is not a worklist any more; a new
entry means somebody added a second definition and owes a reason. **What it still cannot see** is
declared in its own `blind` list — an object-literal fallback, and a module-level object that
*assigns* a shipped value rather than falling back to it. The five copies in `GENERATOR_CONFIG` were
of the second kind and all AGREED, so no guard could have spoken; they were found by hand.

---

## R15 — RUN A CHECK ONLY WHEN THE CHANGE COULD HAVE ALTERED ITS ANSWER

**The owner's complaint, 2026-08-25, and it was justified:** he spent about an hour waiting on runs
that could not have told him anything. The checks here are good and several have caught defects a
code reading would have shipped — but their COST is now the dominant cost of a change, and a large
share of it buys answers that were already determined before the run started.

**A check whose result is already determined is not evidence. It is a delay.** Where the answer IS
already determined, the report says so and NAMES WHAT DETERMINED IT — see R15e.

This rule is the four cases that are settled, decided once here rather than argued per block. It is
not a licence to skip anything else: outside these four, run the check.

### R15a — Fingerprints unmoved ⇒ the 80-race sheet is NOT run

Four byte-identical fingerprints say the delivered picture is the same **to the byte**. The twelve
requirements of the acceptance sheet are properties OF that picture, so **they cannot have changed
while it did not.** Running the sheet then confirms what the fingerprints already proved, at 45 to 90
minutes.

The sheet runs in exactly two situations: **a fingerprint MOVED**, or **before a build the owner is
going to judge**, so his eye and the sheet look at the same thing. And when it runs, it runs **ALONE
and LAST** — parallel runs destroyed it twice in two blocks (once with `npm run verify` alongside it,
once with two single-threaded measurement scripts; 10 and 64 races lost respectively).

### R15b — An identical merge tree ⇒ no re-measurement on the merge commit

`git diff --quiet <branch tip> <merge commit>` costs seconds and answers it. **Identical ⇒ quote the
branch's measurement and say the trees are identical.** Different ⇒ re-measure, because the merge
produced a tree neither side measured, which is exactly when a measurement is worth taking.

### R15c — A documentation or report-only change pays neither the browser gate nor the client suite

Both are already routed by declaration and skip on such a change; this rule states it so that nobody
runs them by hand "to be safe".

### R15d — Re-measuring to correct a number in a document is its own block

It is worth doing. It is not worth doing while the owner waits on a merge. Correct the number, or
carry the correction into the next block that touches the same code — never inside a ship in flight.

### R15e — Every report names its skips

One line, in every report from now on: **WHICH checks were skipped and WHAT determined their answer.**
A silent skip is indistinguishable from a forgotten one, and this project has paid for that
distinction more than once (Lesson 209).

### What this rule may NOT do, and it is the whole boundary

**No check is weakened, narrowed in what it asserts, or made unable to fail.** The point is to stop
paying for answers a change cannot have altered — not to ask less. **Every skip is proved in BOTH
directions:** the check still runs when the change reaches it, and a sabotage inside its reach still
turns it red. A skip that cannot be proved is not taken.

### What was MEASURED before this rule was written, because the premise needed checking

The brief that opened this said the four heavy checks "never skip". **They already do**, and the
declaration-driven routing is why. Across the last ten merges on master, routed through the guards'
own declarations:

| | |
| --- | --- |
| heavy-check time actually spent | 1710 s |
| heavy-check time the declarations ALREADY skipped | 3690 s |
| **share of the heavy cost already skipped** | **68%** |

Per check, over those ten merges: client-suite ran 4 times, check-runin-frame 3, camera-fingerprint
3, render-fingerprint 4, world-fingerprint 2. **Six of the ten merges ran none of them** — they
touched no product source.

**So the waste was never in `verify`'s routing.** It was in the four things above, which `verify` does
not control: the 80-race sheet, the browser gate's scope, re-measuring an identical merge tree, and
re-measuring stamps mid-ship.

**AND ONE ROUTING IMPROVEMENT WAS MEASURED AND THEN NOT BUILT.** `verify` applies `isInertChange` —
"this edit differs only in comments and whitespace, so it cannot move a hash" — to the WORLD
fingerprint alone. The argument holds identically for CAMERA, RENDER and `check-runin-frame`, so
extending it looks obviously right. Measured across the same ten merges it would have saved
**0 seconds**: every change that reached those three was live code, not comments. It is not built,
and this paragraph is why, so the next reader does not re-derive it.

---

## R16 — TWO NUMBERS SIDE BY SIDE SHARE ONE IDENTITY, OR CARRY THEIR OWN

**Rule.** When a report puts two numbers **side by side**, they must either sit under one stated
identity — the run, the arm, the config, the tree they came from — or each carry its own visibly. In
practice: a table gets one identity line above it; **a table that mixes arms gets an identity
column.**

**The narrow form is deliberate, and the wide one is rejected.** "Every number carries its identity"
is ceremony: most figures sit under a shared header that already covers them, and a rule that fires
on every figure gets followed by rote and then dropped. **The hazard lives in COMPARISON, not in
isolation.** A number alone can be wrong; it cannot mislead by comparison. A number beside another
number is an implicit claim that the two are comparable, and that claim is the thing nothing checks.

**The instance it comes from.** NIGHT-1 needed the identity column and did not have it. The project
has also been bitten by the same shape at the tool level: **`his-shot-truth` and
`his-shot-truth --company-only`** print the SAME identity line and produce different numbers, so even
a stated identity can be insufficient when the config is the thing that differs.

**★ THE TOOL NAMED HERE IS CORRECTED, 2026-09-02 (RACE-IDENTITY-HASH-1).** This paragraph named
`corridor-truth` from the day it was written. **`corridor-truth.mjs` has exactly one flag, `--json`**,
and grepping it for `company` returns nothing at all; `--company-only` belongs to
`his-shot-truth.mjs:47` and `camera-fingerprint.mjs:120`. The rule was right about the SHAPE and
wrong about the tool — which is the very fault this rule exists to catch, sitting inside the rule.
The real instance is also worse than the one described: `his-shot-truth` carries **four** arms under
one identity line (`--company-only`, `--owner-unit`, `--min-racers=`, `--defaults`), not two.
**The identity line now carries a `race=` hash** over the identity and the canonicalised camera
config, so the two arms are distinguishable without anyone remembering this paragraph.

**Adopted by the owner, 2026-08-23** (BACKLOG.md PART TWO D19). **There is no guard for it**, and
that is not an oversight — "are these two numbers from the same run" is a question about meaning,
not about text. It is enforced at read time, by whoever the comparison is aimed at.

---

## R17 — A BLOCK THAT RE-MINTS A FINGERPRINT NAMES WHAT MUST NOT MOVE

**Rule.** Any block that expects a fingerprint to move, and mints the new value, **names one or two
specific invariants that must NOT move with it, and measures them.** In the report, beside the mint.

**The failure it closes: a fingerprint expected to move stops guarding what moved with it.** For the
whole of a re-minting block, the hash that normally says "nothing else changed" says nothing at all
— it was going to differ either way, so a genuine regression riding along in the same commit is
indistinguishable from the intended change. **FINISH-MOTION-1 caught a 108 px regression in the
RESTING frame by ACCIDENT**, while measuring something else. The camera fingerprint had moved as
intended, so the regression would have read as intended too.

**What counts as an invariant here.** Something specific enough to be measured and to fail: the
resting-frame position, the zoom at the line, the frame count, a phase boundary's timestamp, the
world hash when the change is camera-only. Not "the race still looks fine" — an invariant that
cannot go red is R7's dead test in a new place.

**Cost, stated because it is the objection:** a few lines per block, and one measurement that was
usually being taken anyway for a different reason. **Adopted by the owner, 2026-08-23**
(BACKLOG.md PART TWO D20). The mint itself, and everything else it must carry, stays
[SHIP-CEREMONY.md](SHIP-CEREMONY.md)'s — this rule adds one obligation and restates none of it.

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
