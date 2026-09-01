# CENSUS-CHECKS-1 — every guard, gate and automated check, and which of them can actually go red

**Measured 2026-09-02** against `feat/aim-levers-1` at `2c2f5ba9`, working tree clean. Read-only
census: nothing was edited, no branch was touched, neither the client nor the server suite was run.
Piece 2 of the NIGHT-CENSUS-1 chain, which counts and does not repair.

## Headline

**40 checks.** Of those:

| State | Count | Share |
|---|---|---|
| **DEMONSTRABLY FIRES** — has gone red in this repository's real history | **27** | 67.5% |
| **NEVER EXERCISED** — reachable assertion, nothing has ever put it under load | **12** | 30.0% |
| **DEMONSTRABLY INERT** — cannot go red as written | **1** | 2.5% |

**The four known failures are 4 of 40 — 10% of the checking surface.** That is the answer to the
question this piece was set: it is four out of forty, not four out of ten.

Two honesty notes on that arithmetic, because the four do not map one-to-one onto census units:

- **One of the four is not a check at all.** The documented docker path (`8d687fea`, 2026-08-27) is a
  *procedure* — the container could not build and then could not start. Nothing in this census was
  ever asserting it. It is a hole in the inventory, not a broken member of it.
- **Mapped onto census units, the four touched 5 of 40 (12.5%)**: `server-suite` (GATE-RED-1,
  `3f833961`, 2026-08-26), `client-suite` (GATE-CLIENT-CROWDING-2, `643fd389`, 2026-08-27),
  `script-suite` and the liveness halves of `check-container-paths` and `check-seed-versions`
  (IMAGE-STANDALONE-1, `ac372195`, 2026-09-01).

**All four are repaired as of 2026-09-01.** None is still failing today.

**The known-bad runner pattern is fully cleared.** All 40 files matching `scripts/**/*.test.mjs`
import `node:test`; **zero** import `describe`/`it` from `vitest`. The two that did —
`scripts/check-container-paths.test.mjs` (13 `test()` calls) and `scripts/check-seed-versions.test.mjs`
(9) — sum to exactly the 22 tests that had never run, and both now carry a header explaining why the
runner is not a style choice.

## The grain of this census

A "check" here is **a named, separately-introduced assertion that something acts on**. That rule is
what makes 40 the number: `check-index` is one check even though `verify` invokes it three times with
different `--dir` argv, while the pre-commit hook's two hook-integrity assertions are two, because
they were introduced together but assert different things and either can block alone.

Excluded deliberately, and named here so the exclusion is visible rather than silent: routers and
helpers that cannot themselves fail.

## Where the checks live

- **`npm run verify`** — 26 routed guards, and the set is *discovered*, not listed. `guardScripts()`
  in `scripts/lib/routing.mjs:236` scans `scripts/` for `check-*.mjs`, `*-fingerprint.mjs`,
  `fingerprint-default.mjs`, plus `gen-engine-reach-doc.mjs` and `gen-ceremony-costs.mjs` by name;
  `SUITE_GUARDS` (`scripts/lib/routing.mjs:145`) adds the three suites. `--dry` on the census branch
  printed 21 selected + 5 skipped = 26. Confirmed against disk: 18 `check-*.mjs` + 2
  `*-fingerprint.mjs` + `fingerprint-default.mjs` + 2 named generators = 23 scripts, + 3 suites.
- **`.githooks/pre-commit`** — 2 hook-integrity assertions, `lint-staged`, 9 of the fast guards in
  parallel, and the engine-reach mint tripwire.
- **`.github/workflows/ci.yml`** — three jobs (client, server, docs). The docs job is never skipped in
  either direction and is what guarantees every push has one job that really examined it.
- **`.github/workflows/audit-schedule.yml`** — daily 06:17 UTC, both trees, report-only, notifies by
  GitHub issue.
- **`client/playwright.config.js` + `client/e2e/`** — 9 spec files plus an auth setup project.
  **Wired into nothing automated.**

## The full table

| # | Check | Asserts | Introduced | Wired into | Ever red | State |
|---|---|---|---|---|---|---|
| 1 | `check-config-claims` | a living doc stating a config value `defaults.js` owns | `2cb2fd6d` 2026-08-06 | hook, CI docs, verify | **yes** — 94 claims found at introduction | FIRES |
| 2 | `check-config-keys` | a camera key the renderer/Dev Screen reads with no default (silently dropped) | `291587f7` 2026-08-06 | hook, CI docs, verify | **yes** — introduced *by* the `highlightHeroes` fix it found | FIRES |
| 3 | `check-container-paths` | a dir the Dockerfile COPYs that compose does not mount, and vice versa, unless declared | `899691dc` 2026-08-31 | hook, verify (**not CI**) | no | NEVER EXERCISED |
| 4 | `check-doc-facts` | a living doc restating the fairness threshold (one home: `docs/FAIRNESS.md`) | `55f3660d` 2026-08-06 | hook, CI docs, verify | **yes** — 12 exemptions on record are places it found | FIRES |
| 5 | `check-doc-links` | a dangling relative link in `docs/` + root `*.md` | `917a4634` 2026-07-29 | CI docs, verify | **yes** — e.g. `582ab68b` LEADER-LAG-TRUTH-1 | FIRES |
| 6 | `check-ending-frame` | no canvas fill covers the whole picture while phase is FINISHED | `b004fd65` 2026-08-12 | verify only | no | NEVER EXERCISED |
| 7 | `check-fallback-agreement` | a fallback literal disagreeing with the default it mirrors | `71e49df0` 2026-08-09 | hook, CI docs, verify | **yes** — FALLBACK-MIRRORS-1 `4bba083f`, MIRROR-CENSUS-1 `1c2744a1` | FIRES |
| 8 | `check-fingerprint-payload` | shorthand property syntax in the hashed world-fingerprint row | `c45802ef` 2026-08-15 | CI docs, verify | no (built *after* SOLLRANK-KEY-1 caused the defect) | NEVER EXERCISED |
| 9 | `check-fingerprints` (`fingerprint-containment`) | a current fingerprint value copied outside `docs/fingerprints.json` | `c0c17df1` 2026-08-06 | hook, CI docs, verify | **yes** — ONE-TRUTH-1 removed every copy it found | FIRES |
| 10 | `check-hooks-installed` | `core.hooksPath` unset / elsewhere / hooks missing | `8ee0aa3e` 2026-08-15 | verify (skips under `CI=true`) | no (built after HOOK-SILENT-1) | NEVER EXERCISED |
| 11 | `check-index` | an unindexed report, an index line pointing nowhere, an undeclared reports dir | `582438d4` 2026-07-31 | CI docs (x3), verify | **yes** — routinely; INDEX-COVERAGE-1 found undeclared dirs | FIRES |
| 12 | `check-language-closed` | German text in tracked source/scripts/docs, over the frozen 2026-08-12 allowlist | `574caaaf` 2026-08-15 | CI docs, verify | **yes** — the allowlist *is* its findings at ship | FIRES |
| 13 | `check-measured-stamps` | a stamped measured number whose source changed after the stamp | `60c4a7b8` 2026-08-06 | hook (`--staged`), CI docs, verify | **yes** — three 2026-08-26 stamp corrections; master red twice on CONTENDER-ZOOM day | FIRES |
| 14 | `check-runin-frame` | camera centre near track, at least one racer on screen, finish line in frame threshold to crossing, 10 tracks | `2a7e1bdf` 2026-08-12 | verify only | **yes** — incl. `66a47256` (its own syntax) | FIRES |
| 15 | `check-seed-versions` | shipped seed content changed without a version raise; orphan/duplicate/missing seed files | `b9dc8102` 2026-08-31 | hook, verify (**not CI**) | no | NEVER EXERCISED |
| 16 | `check-standings-invariant` | place moving back onto the racer card; a rank change writing text instead of one transform | `64a3a6b8` 2026-08-11 | verify only | no | NEVER EXERCISED |
| 17 | `check-tags` | an origin tag no register entry declares, and vice versa | `582438d4` 2026-07-31 | CI docs, verify | **yes** — `168507ee`, and `464771fb` records the gate red twice | FIRES |
| 18 | `check-writable` | a tracked file readable but not writable (OneDrive HIDDEN placeholder) | `eb55d23a` 2026-08-06 | hook, verify (**not CI, deliberately**) | **yes** — found 10 hidden files under `docs/diagnose/` at introduction | FIRES |
| 19 | `camera-fingerprint` | *(as a gate)* that at least one track produced a FINISHED frame | `46ffce26` 2026-08-03 | verify | no | NEVER EXERCISED — **and its headline half is inert, see below** |
| 20 | `render-fingerprint` | *(nothing, under the argv verify gives it)* | `e98bf2ca` 2026-08-04 | verify | no | **DEMONSTRABLY INERT** |
| 21 | `fingerprint-default` (`world-fingerprint`) | the measured world hash equals the `world` role in the record | `2a650ef6` 2026-07-13 | verify (`--check`), hook tripwire names it | **yes** — FP-COMPARE-1, 2026-08-14 | FIRES |
| 22 | `gen-engine-reach-doc` (`engine-reach-doc`) | the generated engine-reach block in `docs/SIM.md` is not stale | `09727abd` 2026-08-06 | verify (`--check`) | **yes** — `24d1ed2c` 2026-08-10 | FIRES |
| 23 | `gen-ceremony-costs` (`ceremony-counts`) | the three engine-reach counts in `docs/SHIP-CEREMONY.md` are not stale | `103cf4a6` 2026-08-06 | verify (`--check-counts`) | **yes** — `a7db89eb`, one of the three numbers was wrong | FIRES |
| 24 | `client-suite` | every vitest test under `client/` (230 test files) | `e4f41cea` 2026-08-08 (routed) | verify, CI client (`test:coverage`) | **yes** — incl. the crowding cliff, 2026-08-27 | FIRES |
| 25 | `server-suite` | every vitest test under `server/` (30 test files) | `3719808c` 2026-08-15 | verify, CI server | **yes** — GATE-RED-1, gate stopped gating 2026-08-18 to 26 | FIRES |
| 26 | `script-suite` | every `scripts/**/*.test.mjs` (40 files) — the guards' own liveness tests | `e4f41cea` 2026-08-08 | verify, CI docs | **yes** — incl. the 22 hidden tests | FIRES |
| 27 | pre-commit hook self-check | `.githooks/` must not differ between working tree and **index** | `166d38eb` 2026-08-19 | git hook | no | NEVER EXERCISED |
| 28 | pre-commit untracked-hooks check | no untracked file in `.githooks/` (git would run it, repo does not track it) | `166d38eb` 2026-08-19 | git hook | no | NEVER EXERCISED |
| 29 | `lint-staged` | ESLint + Prettier on staged `client/src/**` | `6f9959bc` 2026-04-19 | git hook | **yes** — routinely | FIRES |
| 30 | engine-reach mint tripwire | this diff can reach the race engine, so mint before you ship | `0c98a32c` 2026-08-05 | git hook | **yes** — emits on every engine-touching commit | FIRES (**prints, never blocks — by design**) |
| 31 | ESLint (CI) | `npm run lint` over `client/src` (482 js/jsx files) | `6f9959bc` 2026-04-19 | CI client job | **yes** | FIRES |
| 32 | Prettier `format:check` (CI) | `client/src` is formatted | `6f9959bc` 2026-04-19 | CI client job | **yes** | FIRES |
| 33 | `audit-gate` — client tree | HIGH/CRITICAL advisory outside the justified allowlist | `226de4b0` 2026-07-29 | CI client job (**blocking**) | **yes** — AUDIT-BROWSERSLIST-1 reddened master, `b043ec14` 2026-09-01 | FIRES |
| 34 | `audit-gate` — server tree | same, `--tree=server` | `ffefddac` 2026-08-16 (armed; report-only before) | CI server job (**blocking**) | **yes** — four HIGHs found, closed by IP-ADDRESS-ADVISORY-1 | FIRES |
| 35 | CI script-test input assertion | `find scripts -name '*.test.mjs'` must return something before `node --test` (Lesson 187) | `e5c84f7d` 2026-07-31 | CI docs job | no | NEVER EXERCISED |
| 36 | `audit-schedule` notification path | a daily finding becomes/closes a GitHub issue | `6abc64d4` 2026-08-16 | scheduled workflow | no — the file itself says a channel nobody has fired is not a channel, which is why `drill` exists | NEVER EXERCISED |
| 37 | Playwright e2e suite | 9 specs against an isolated API + client, authenticated once | `6f4f4791` 2026-04-26 | **nothing automated** — night-run by hand (`docs/NIGHT-RUN.md`) | **yes** — 85 of 102 failed when first run; now 103/103 with a 2-per-5 flake | FIRES |
| 38 | verify empty-run refusal | a run that selected no guard must not exit 0 (exit 2) | `83a24cd4` 2026-08-09 | `npm run verify` | **yes** — found at the SHIP-THE-LINE merge | FIRES |
| 39 | verify unknown-flag refusal | an unrecognised flag is refused, not ignored (exit 2) | `e53b9340` 2026-08-09 | `npm run verify` | **yes** — `--cheap` was accepted and ignored for weeks | FIRES |
| 40 | verify declared-path refusal (REACH-CONTRACT-1) | a guard's declared `reach`/`files`/`dirs` path that does not resolve refuses the run (exit 2) | `1014e657` 2026-08-15 | `npm run verify` | no | NEVER EXERCISED |

## DEMONSTRABLY INERT — the actionable list

**One entry, and it is a real one.**

### `scripts/render-fingerprint.mjs`, as a `verify` guard

**It cannot go red on the thing it exists to detect, and under `verify` it cannot go red at all.**

The evidence, four independent strands:

1. **It has no compare mode.** `grep -n 'argv.includes\|argv.find'` over the file returns
   `--declare`, `--quiet`, `--ops=`, `--phases`, `--coverage`, `--frames=`. There is no `--check`. It
   never opens `docs/fingerprints.json` — `grep -rn "fingerprints.json"` across `scripts/`,
   `.github/`, `.githooks/` shows `fingerprint-default.mjs` as the **only** script that compares a
   measured hash against the record.
2. **`verify` does not ask it to.** `commandFor()` in `scripts/verify.mjs:294–332` gives `--check` to
   `world-fingerprint` and `engine-reach-doc`, `--check-counts` to `ceremony-counts`, and for
   everything else returns `base = ["node", g.source, ...(cheap ? cheapArgs() : [])]`. `cheapArgs()`
   returns `[]` unless `--cheap` was typed. So the spawned command is exactly
   `node scripts/render-fingerprint.mjs`, no flags.
3. **No reachable throw on that argv.** The file contains **zero** occurrences of `FAIL`, `throw` or
   `assert`. Its only `process.exit(1)` is line 638, inside `if (OPS_FOR)`, reached only by
   `--ops=<unknown-track>` — argv `verify` never passes. Every other exit is `0`.
4. **The record has a value nothing reads.** `docs/fingerprints.json` carries a `render` role, minted
   2026-08-26. No automated consumer compares against it.

So the guard spends **~54 s per selected verify run** (its own measured cost,
`docs/SHIP-CEREMONY.md:180`), prints a hash, and reports PASS unconditionally.

**This is a known defect class that was fixed for one of three instruments and not the other two.**
`scripts/verify.mjs:303–306` records it in its own words: the world fingerprint
measured-and-did-not-check until 2026-08-14, when a renamed column moved the hash, verify printed the
new value and reported PASS, and the defect reached master green. FP-COMPARE-1 added `--check` to
`fingerprint-default.mjs`. It was never added to `render-fingerprint.mjs` or `camera-fingerprint.mjs`.

### The adjacent case — `scripts/camera-fingerprint.mjs`

Classified **NEVER EXERCISED**, not inert, and the distinction is deliberate: it *does* carry one
reachable assertion (`camera-fingerprint.mjs:333–341`, "NOT ONE TRACK produced a FINISHED frame"), so
a real input exists that makes it throw. But **its headline half is inert for the same reason as
render's** — no `--check`, no read of the `camera` role in the record. Its ~57 s buys a printed hash
and a proof-of-live on the ending window, not a comparison.

**Neither is waste in the way an unfireable assertion is waste** — both are live instruments the ship
ceremony uses by hand (`docs/SHIP-CEREMONY.md:146–148` names all three and tells a human to compare).
What is wrong is that `verify` presents them beside 20 guards that really do gate, in the same PASS
column, at 111 s of combined cost. **The one-line repair, not applied here: give both a `--check` mode
and pass it from `commandFor()`, exactly as FP-COMPARE-1 did for the world.**

## Growth over time

Introduction dates of all 40, bucketed by month:

| Month | New checks | Running total | What arrived |
|---|---|---|---|
| 2026-04 | 5 | 5 | the original QA pipeline — ESLint, Prettier, lint-staged, the client suite, Playwright |
| 2026-05 – 2026-06 | 0 | 5 | — |
| 2026-07 | 6 | 11 | the first fingerprint, `audit-gate`, and the first four living-doc guards |
| **2026-08** | **29** | **40** | **everything else** |
| 2026-09 | 0 | 40 | — |

Precisely: April 5, July 6, August 29 — **August alone contributed 72.5% of the entire checking
surface.** Within August the burst is itself concentrated: 8 guards landed on 2026-08-06
(ONE-TRUTH-1/2), 4 on 2026-08-09 (VERIFY-ROUTING-2 + FALLBACK-GUARD-1), 5 on 2026-08-15
(HOOK-TRACKED-1, LANG-CLOSED-1, FP-PAYLOAD-1, WIRE-SUITES-1, REACH-CONTRACT-1), and 2 on 2026-08-31
(CONTAINER-PATHS-1, SEED-REDELIVERY-1).

**The honest reading:** the sound side has not been standing still — but it has not been *growing
steadily* either. It grew in one month, and the last fortnight added two checks (2026-08-31) while
four existing ones were found broken. **The ratio in the last fortnight is 2 added to 4 found
broken.** That is the number that should worry more than 4/40 reassures: the four failures were not
found by any check in this table, they were found by people doing unrelated work.

Note also that the **five newest guards are five of the twelve NEVER EXERCISED** (#3, #15, #27, #28,
#40) — which is expected and not itself a fault, but it means the never-exercised bucket is partly
just "recent".

## Broken things I deliberately did NOT fix

Per the chain's rule, these are written down and left alone:

1. **`render-fingerprint.mjs` has no `--check`** and cannot gate on a moved render hash. Section
   above. Not repaired.
2. **`camera-fingerprint.mjs` has no `--check`** and cannot gate on a moved camera hash. Not repaired.
3. **`guardScripts()` does not recurse** (`scripts/lib/routing.mjs:236`, `readdirSync` on the top
   level only). A guard placed in a subdirectory would be discovered by nothing and run by nobody,
   silently. Verified **latent, not live**:
   `find scripts -mindepth 2 -name 'check-*.mjs' -o -mindepth 2 -name '*-fingerprint.mjs'` returns
   nothing today. The file's own comment already records this. Not repaired.
4. **`check-fallback-agreement` reports 2 UNRESOLVED on the current tree** —
   `client/src/modules/camera/cameraTimingComputation.js` and `client/src/modules/durationModel.js`,
   in each case because the default object is not declared in that file. The guard passes —
   UNRESOLVED is reported, not failed, by design. Not investigated further.
5. **`check-fingerprint-payload` reports 1 blind spread** at `scripts/sim-fairness.mjs:4865`.
   Declared, not repaired.
6. **`check-measured-stamps` has a very thin surface** — 3 stamps across 61 living documents. It is
   not inert (it has gone red three times), but it can only speak about 3 numbers. Not widened.
7. **`check-container-paths` and `check-seed-versions` are in the hook and in verify but not in CI.**
   A push whose only gate is CI never runs them. Not wired.
8. **The Playwright e2e gate is wired into nothing automated.** That is a recorded owner decision from
   2026-08-16 (cost ~10 min, unknown flake budget), not an oversight — but it means 9 specs and the
   whole browser layer sit outside every automatic gate. Not changed.

## Limits

This census is honest about four things it did not do.

**Neither suite was run**, by instruction — a sibling piece owned suite runs, and two at once produce
false timeouts. So "client-suite FIRES" and "server-suite FIRES" rest on documented history
(`.github/workflows/ci.yml:143`, GATE-RED-1, GATE-CLIENT-CROWDING-2), not on an observation made
tonight. `check-ending-frame`, `check-runin-frame` and the three fingerprints were also not run,
because each drives real races and costs minutes; the claims about them come from reading their
assertions and their argv — which for the inertness finding is the *stronger* evidence anyway, since
it is a statement about what input could exist rather than about one run.

**"Ever red" is a lower bound, not a count.** The search was over commit subjects and bodies
(`git log --all --grep=`, `-S`) and `reports/evolution/`. A guard that went red locally and was fixed
before the commit landed leaves **no trace anywhere searchable**. For a repository whose whole
discipline is fixing things before they ship, that is a systematic undercount, and it biases in one
direction: some of the 12 NEVER EXERCISED have probably fired on somebody's machine. The 27 FIRES
figure is safe; the 12 is soft.

**The number 40 depends on the grain**, which is stated above and was chosen, not given. Counting
`check-index`'s three `--dir` invocations separately, or the CI client job's lint/format/test as one
"client job", would move the total by several either way. The *shares* are more robust than the
absolute: whatever grain you pick, one inert check and roughly two-thirds demonstrably firing
survives it.

**One inferred claim, labelled.** That `check-fingerprint-payload`, `check-hooks-installed` and
`check-standings-invariant` have never been red is inferred from an absence of evidence plus the fact
that each was built *after* the incident it names (SOLLRANK-KEY-1, HOOK-SILENT-1, STANDINGS-RULE
respectively) — a guard built to close a hole somebody already fell into starts life with the hole
closed. Everything else in the "ever red" column is a positive citation to a commit or a report.
