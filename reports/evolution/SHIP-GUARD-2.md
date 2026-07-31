# SHIP-GUARD-2 — close the four review findings + assess the third guard (string work only)

SHIP-GUARD-1 (@582438d) is source-checked and accepted; this block closes the four review findings and
assesses the third guard both CC and the planner proposed independently. **No file under client/ or server/;
no fingerprint moves; no tag.** String and file handling only — zero simulation/gate/sweep/build runs. Base:
master `@582438d`.

## BUILD-VS-SPEC CONFORMITY (step by step)

### STEP 1 — run the script tests in CI (CC's own Proposal 1)
**Found:** the guards' liveness tests (and the seven pre-existing `scripts/sim/observers/*.test.mjs`) are run
by nobody automatically — a proof-of-live that is not itself live. **Written:** a named CI step in the `docs`
job, "Run script test suite (guard liveness + observers)", running `node --test $(find scripts -name
'*.test.mjs')`. It includes the observer tests, not just the two new files. No `npm ci` is needed — every
script test imports only `node:test`/`node:assert` and relative modules (verified: no non-relative imports in
the observer tests or their modules). **Pre-existing tests health:** I ran the whole suite before wiring it —
**121 tests, 0 failing, 0 slow, 0 environment-dependent** (~0.95 s runner duration, ~1.26 s wall on the current
tree). Nothing was filtered or excluded. **CI time cost:** see the dedicated section below. **Deviation:** none.

### STEP 2 — exact tag matching in check-tags.mjs
**Found:** the register check was `tagsMd.includes(name)` — a substring match, so `pre/motion` would count as
registered if only `pre/motion-2` appeared. **Written:** whole-token matching — a tag counts as registered only
when its name appears bounded by a character outside the tag-name set `[A-Za-z0-9_./-]` (regex with escaped name
+ negative look-behind/look-ahead), mirroring the link-target discipline check-index already uses. Added a test
that FAILS on the trap (register names only `pre/motion-2`; origin has `pre/motion` → guard must fail and name
`pre/motion`). **Prophylactic, not a live bug:** I checked all 45 origin tags for substring pairs —
**0 pairs exist today** — so this hardens against a future collision rather than fixing a current miss.
**Deviation:** none.

### STEP 3 — correct the CI comment + re-decide fetch-depth
**Found:** the checkout comment claimed the checkout "MUST bring the tags", but check-tags.mjs reads
`git ls-remote --tags origin` — a **network query to the remote**, independent of the local checkout's tags.
**Written:** corrected the comment to state the real mechanism, and **removed `fetch-depth: 0`** from the docs
checkout. **Reason recorded:** the guard never reads local tags, so a shallow (default) checkout is sufficient
and faster; if the remote query returns nothing the guard FAILS LOUD by design, so a broken remote still breaks
the build. Nothing else in the docs job needs full history (the script tests use fixtures, not git).
**Deviation:** none.

### STEP 4 — check-world.mjs — **STOPPED at the stop rule (not built).** See the dedicated section below.

### STEP 5 — two honesty items
**5a:** added a "REACH (boundary, not a bug)" note to the check-index.mjs header — it scans only the flat
`*.md` in the reports dir, not subdirectories; zero report files live in subdirs today. **5b:** added a line to
SHIP-CEREMONY.md step 12 — a verification transcript pasted into a report must come from the state actually
being committed (re-run after the commit if that is the only way to make it honest). **This report obeys 5b:**
its transcript below was captured AFTER the commit — see the note there. **Deviation:** none.

## STEP 4 — the third guard: BUILT or STOPPED?

**STOPPED — deliberately, at the stop rule. No check-world.mjs was built.** Building it now would require exactly
the brittle prose-parsing the stop rule names, on **both** halves of the problem:

1. **Single-sourcing the canonical hash out of SIM.md is fragile.** The current fingerprint lives in a prose +
   markdown-table block headed "**Current shipped-default fingerprint (…)**". Extracting "the current ON hash"
   means: locate that header, then the `| ON (flagless — …) | \`dc4647be0f55ebdb\` |` table row, then the first
   16-hex-in-backticks. But the *very next paragraph* is the lineage chain, which repeats `dc4647be0f55ebdb`
   **alongside a dozen historical 16-hex hashes** (`ded0a126…`, `62400c8e…`, `7c70b1ea…`, …), and dated
   "previous baseline" sub-blocks below carry their own ON/OFF tables. A reword of the row label ("flagless — the
   shipped game = …") or any table restructure — a normal, harmless edit — silently breaks the extraction. That
   is precisely "an assumption about formatting that a normal edit would break."
2. **Distinguishing a CURRENT-world mention from a legitimate HISTORICAL one is fragile.** The living docs name
   fingerprints in **both** 16-hex (`dc4647be0f55ebdb`) and 8-hex short (`dc4647be`) forms, across current-
   identifier lines, lineage chains, anchors, reproduction notes, and "previous baseline" blocks. A guard that
   flagged every stale-looking hash would fire on every lineage entry and be switched off within a week (the
   spec's own named failure mode). Drawing the "this names the CURRENT world" line requires prose-context
   heuristics — proximity to the words "shipped world"/"current world" — that a reword breaks in the other
   direction (a false pass when the identifier line is reworded, a false fail when a historical block happens to
   co-locate the phrase and an old hash). I could not draw that line cleanly enough to trust.

**What would make it robust (proposal, owner's call):** give the shipped fingerprint a **single machine-readable
home** that both SIM.md and the guard point at, instead of parsing prose. Concretely, a tiny committed file —
e.g. `docs/shipped-world.json`:

```
{ "world": "RACER-MOTION-2", "on": "dc4647be0f55ebdb", "off": "854018ee5d3d83e1" }
```

(or a single stable marker line in SIM.md, e.g. `<!-- SHIPPED-WORLD on=dc4647be0f55ebdb off=854018ee5d3d83e1 -->`,
that the guard greps *exactly*). Then: (a) the guard reads the canonical hash from that one line — no prose
parsing; (b) the docs that identify the current world carry a matching stable marker on their identifier line so
the guard checks *exactly those lines* against the single source and never guesses current-vs-historical from
prose; and (c) the mint step of the ceremony (SHIP-CEREMONY step 3/5) updates that one file, so it cannot drift
by construction. This is a small design decision — where the file lives, the marker convention — and per the stop
rule I leave it to the owner rather than shipping a guard that breaks on a harmless edit. A guard that breaks on
a harmless edit costs more than the drift it prevents.

## CI TIME COST (STEP 1)

The new "Run script test suite" step runs 121 `node:test` tests with no external deps. On the current tree:
runner `duration_ms` ≈ **945 ms**, wall ≈ **1.26 s** (plus one Node process start). In CI on node 20 this is a
sub-2-second step and needs no `npm ci`. For reference the spec's measured baselines are 434 ms for the three
guards together and 432 ms for both liveness suites; adding the observer tests brings the suite to ~0.95 s. This
is the same class of cost as everything else in the docs job.

## VERIFICATION (verbatim — captured AFTER the commit, per STEP 5b)

The commit was made first; this transcript was then run against the committed tree (so `git status` is clean and
`check-index` counts this report), and the commit was amended solely to paste it in — which changes no guard
input. check-world is absent by design (STEP 4 stopped).

```
$ node scripts/check-doc-links.mjs
check-doc-links: 310 relative links across 52 living-doc files; 0 dangling.

$ node scripts/check-index.mjs
check-index: 68 reports checked, 0 unindexed.

$ node scripts/check-tags.mjs
check-tags: 45 origin tags checked, 0 unregistered.

$ node scripts/check-world.mjs
  (not built — STEP 4 stopped at the stop rule; see the STEP 4 section above)

$ node --test $(find scripts -name '*.test.mjs')     # exactly the CI script-test step
ℹ tests 121
ℹ pass 121
ℹ fail 0
ℹ duration_ms 350.9433

$ git status --porcelain
  (clean — no output)
```

## PROPOSALS (≥2)

1. **We are (nearly) done guarding — do NOT add a fifth guard speculatively.** After this block the cheap,
   high-value drift classes are covered and their liveness is itself gated: dead links (check-doc-links), orphan
   reports (check-index), unregistered tags (check-tags), and now the meta-guard that keeps those three honest
   (the script-test CI step). The one remaining real class — a stale shipped-world fingerprint — is worth a guard
   ONLY after the machine-readable single-source above exists; built today it would be negative-value (breaks on
   harmless edits). Further guards for rarer classes (lesson-number collisions, intra-report dead cross-refs,
   stale dates) would cost more reviewer attention than the drift they catch. The honest recommendation:
   **stop here; add check-world only if/when the owner adopts the machine-readable fingerprint source.**
2. **Fold the machine-readable fingerprint file into the mint step, so sync is structural not manual.** If the
   owner adopts `docs/shipped-world.json` (or the marker line), have the ceremony's mint step (SHIP-CEREMONY #3/#5)
   write it, and have `fingerprint-default.mjs` optionally emit it. Then check-world becomes a trivial exact
   compare with nothing to parse, and the file cannot lag the real fingerprint because the same action that mints
   also records it.
3. **A commit-time checklist beats another CI guard for the human-side steps.** The remaining drift risk is in the
   steps no guard can mechanize (canonical-doc sweep, owner live-truth line). A `.github/PULL_REQUEST_TEMPLATE.md`
   that pastes the SHIP-CEREMONY 12 boxes (carried over from SHIP-GUARD-1 Proposal 3) puts those in front of the
   author at commit time — cheaper and higher-yield than guarding classes that are rare or hard to detect.
