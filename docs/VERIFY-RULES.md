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

**Rule.** Two questions, before the test exists: *what breaks if I delete it*, and *what goes
unnoticed if it is missing*. If neither has an answer, do not write it. Prefer one test that asserts a
PROPERTY over several that assert instances.

**Why it is safe.** A thing tested to death is also dead: tests that assert instances have to be
re-blessed on every honest refactor, which teaches the next person to update expectations without
reading them. That is how a suite stops being a guard. The counter-rule already exists and stays —
L203, a switch is tested by proving its two positions differ — and it is compatible: one property test
with both positions beats six instance tests with neither.

**Reporting rule.** Report tests DELETED or MERGED alongside tests added. A block that reports only
additions cannot demonstrate restraint even when it exercised it.

---

## The instruments, and what each costs

Timings on the owner's machine, and they vary with load — treat them as the right order of magnitude,
not as constants.

| instrument | answers | cost |
|---|---|---|
| `fingerprint-default.mjs` | did the shipped RACE change | **113 s** (was 195 s before VERIFY-COST-1 parallelised it) |
| `camera-fingerprint.mjs` | did the DIRECTOR's decisions change | ~47 s |
| `render-fingerprint.mjs` | did the DRAW CALL SEQUENCE change | ~15 s at 3400 frames; ~77 s once the window reaches the finish |
| `client` test suite (`npm test`) | did anything assert-able break | **~185 s**, no coverage |
| `client` suite with coverage (`npm run test:coverage`) | the same, plus the coverage report | CI only — see below |
| `check-index` / `check-doc-links` / `check-tags` | are the living docs self-consistent | < 5 s each |

**Do not run an instrument out of habit.** If nothing drawn changed, the render fingerprint has no
question to answer, and saying so in the report is better than a number nobody needed.

### Where coverage runs, so nobody discovers later that it stopped

**Locally: it does not, and it never did.** `npm test` is `vitest run`. The `coverage:` block in
`client/vitest.config.js` is *configuration for when coverage is asked for*, not an enable — V8
coverage is collected only under `--coverage`.

**In CI: every run, on every push to master and every PR targeting it** — `.github/workflows/ci.yml`
invokes `npm run test:coverage`. That is the only place it runs, and it is where it belongs: coverage
is a reviewer's question, not an inner-loop one.

**So a slow local suite is not coverage.** Measured, the cost is concentrated elsewhere: the slowest
ten of 179 files are **85%** of all file time, and `goldenEquality.test.js` alone is 46%. If the
inner loop needs to get faster, that is the file to look at — not the coverage flag.
