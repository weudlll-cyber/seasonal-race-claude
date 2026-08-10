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

## R10 — An eye test OWNS the dev server until the owner releases it

**Rule.** While an eye test is pending, port **5173** serves the branch and commit being judged, and
nothing else touches it. Your own work runs on a **different port** — `npm run dev -- --port 5273
--strictPort`. Before handing an eye test over, state the exact pill (`<sha> · <branch>`, no
`+dirty`), and confirm it by reading `http://localhost:5173/@id/__x00__virtual:ra-build` rather than
by assuming. When the owner releases it, 5173 is free again.

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
ten of 179 files are **85%** of all file time, and `goldenEquality.test.js` alone is 46%. If the
inner loop needs to get faster, that is the file to look at — not the coverage flag.
