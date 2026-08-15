# CHECK-AUDIT-1 - an independent audit of every check this repository runs

Date: 2026-08-15
Scope: read-only audit. No check/test/config changes. No write-side git operations.

## Census result and method

Count: **29 unique checks** currently run by repository configuration.

How the census was produced (configuration only):
1. `scripts/lib/routing.mjs` + `scripts/verify.mjs` for verify-routed guards and argv wiring.
2. `.github/workflows/ci.yml` for CI-only checks.
3. `.githooks/pre-commit` for hook checks and informational tripwire.
4. `package.json`, `client/package.json`, `server/package.json` for invokers.
5. Test-suite file granularity from inventory:
   - `scripts/**/*.test.mjs`: 34 files.
   - `client/src/**/*.test.*` + `client/src/**/*.spec.*`: 208 files.
   - `server/**/*.test.*` + `server/**/*.spec.*`: 19 files.
   - `client/e2e/**/*.spec.*`: 7 files.

## Carry-forward findings from round one

These stand and are retained:
1. Uninvoked test surfaces exist (server and e2e suites are present but not wired into active verify/hook/CI flow).
2. `check-doc-links` declaration scope and runtime scope are not the same statement.
3. `.github/workflows/deploy.yml` looks live as configuration while explicitly documented as dormant intent.

## Correction 1: git-history evidence method and confidence bound

Git history was searched read-only and is now part of evidence:
- Repository history size: **1715 commits** (`git rev-list --count --all`).
- Per-check search basis:
  - ID-touch search: `git log --all -G '<check-id>' -- reports docs scripts .githooks ...`
  - Failure-language message search: `git log --all --grep '<check-id>' --grep 'fail|red|caught|stale|mismatch|blocked' -i`
- Where a real catch is evidenced, citations are explicit.
- Where none is found, the statement is: **no evidence of a real catch in 1715 commits under the above search basis**.

## Full table (all required answers, corrected)

Abbreviations:
- Stages: `H` hook, `V` verify, `C` CI, `M` mint/ceremony flow.
- Costs are seconds unless stated. Guard-only costs were measured by running each guard alone and reading `[ra-elapsed-ms ...]`.

| Check | Stages | Defect class | Can fail? | Catch evidence (git + file) | If removed tomorrow | Cost (filled) | Repetition value |
| --- | --- | --- | --- | --- | --- | --- | --- |
| world-fingerprint (`fingerprint-default --check`) | V, M | Shipped-world outcome drift | Yes | Real mismatch class fixed in `60755a3a` (SOLLRANK-KEY-1) | Engine behavior drift can ship while camera/render stay green | 126.7 (`reports/night/SIDE-FREE-CULL-1.md`), 229.3/177.9 (`reports/night/VERIFY-COST-2.md`) | Verify catches branch drift; mint is final commit-state authority |
| world-off role (from `fingerprints.json`) | M (and ad-hoc verify in reports) | Ablation invariant: world with `--gapRerollEnabled=false` | Yes (same engine hash path, separate role value) | Off-arm invariance explicitly used and re-verified in record (`docs/fingerprints.json`, role `world-off`) | Lose ability to prove "only gap-reroll changed" without recomputing ad hoc | Included in mint discipline, no separate fast guard | Separate role buys persistent parity proof across ships |
| camera-fingerprint | V, M | Director decision drift | Yes | Used repeatedly as acceptance/catch instrument (`f7b960dd`, `60a30fab`, plus report chain) | Camera regressions not visible in world hash | 105.8 (`reports/night/SIDE-FREE-CULL-1.md`), 168.8/146.5 (`reports/night/VERIFY-COST-2.md`) | Verify blocks branch regressions; mint confirms shipped tree |
| render-fingerprint | V, M | Draw-call sequence drift | Yes | Instrument/catch history in `e1fdec97` and `RENDER-FINGERPRINT-1` chain | Render regressions can pass world+camera | 105.2 (`reports/night/SIDE-FREE-CULL-1.md`), 160.2/141.8 (`reports/night/VERIFY-COST-2.md`) | Same split as camera |
| fingerprint-containment (`check-fingerprints`) | H, V, C | Current hash copied outside canonical homes | Yes | No direct "blocked release" example found; evidence is containment discipline and incidents like `3e81178e` context | Canonical source can be shadowed by stale copies | **2.63 measured** (local run), also 22.9/29.7/38.8 historical | Later stages catch if earlier stage bypassed or not run |
| check-doc-links | V, C | Dangling relative links in living docs | Yes | No explicit real red-run catch found in 1715 commits with current search | Living-doc links decay silently | **0.18 measured** | CI catches branch that skipped verify |
| check-index | V, C | Unindexed report / dead index link | Yes | Real class documented and repeatedly enforced (`370010d3`, `e1f53781`), current run red because this file is intentionally unindexed | Report discoverability breaks | **0.05 measured total** (main+night+parity); main currently fails (unindexed `CHECK-AUDIT-1.md`) | CI is the backstop when local verify is skipped |
| check-tags | V, C | Tag register drift vs origin | Yes | Tag-guard hardening history (`TAG-GUARD` chain; message evidence high) but no single recent red-run incident isolated | Release provenance and tag ledger drift | **0.95 measured** | CI matters because local repo/tag view can differ from origin timing |
| check-config-claims | H, V, C | Numeric config copied into docs | Yes | Real mismatch/fix class in `3fefc736` (guard widened after misses) | Docs silently stale after default changes | **0.55 measured** | Hook catches before commit; CI catches bypass/no-verify |
| check-doc-facts | H, V, C | Living-doc fact contradicts source-of-truth | Yes | No isolated real red-run catch in 1715 commits under search basis | Fact drift in living docs | **0.11 measured** | Cheap enough for redundancy |
| check-config-keys | H, V, C | Key read without default | Yes | Real guarding event history (`DEV-MARKERS-1` lineage, merge `b62ffc0b`) | Silent config knob drop | **0.08 measured** | Hook fast-fail is primary; CI backstops |
| check-fallback-agreement | H, V, C | Mirror default/fallback drift | Yes | Real issue class with concrete triage/fixes (`497a3dc8`, `FALLBACK-42-TRIAGE` lineage) | Mirrors diverge silently | **0.17 measured** | Same as above |
| check-fingerprint-payload | V, C | World payload key-schema silent rename risk | Yes | No evidence of a real catch in 1715 commits; historical defect class is documented | Silent schema rename can move world hash for wrong reason | **0.25 measured** | CI catches if verify skipped |
| check-language-closed | V, C | Language-rule regression / allowlist drift | Yes | Real failure in guard itself fixed by `ddb93fd3` / `8ee0aa3e` path | German text can re-enter unnoticed | **0.75 measured** | CI is stronger due uniform environment |
| check-measured-stamps | H (`--staged`), V, C | Stale measured numbers treated as current | Yes | Clear real catch path in `767f3f35` and report `STAMP-TRAP-1` lines 49/53/137 | Stale numbers survive as if valid | **0.92 measured** | Hook staged-mode catches commit-before-CI stale trap |
| check-ending-frame | V | Finish-phase full-canvas cover-up | Yes | Evidence of sabotage-proof and ship gating in `ENDING-PICTURE-1` (`b004fd65`, `e1fdec97`) | Ending can be visually blanked while other checks pass | **1.39 measured** | Single-stage routed guard; no repeated stages |
| check-runin-frame | V | Camera away from race / empty on-screen frames | Yes | Real red catch documented (`CONTENDER-ZOOM-1` lines 128-130), then green after fix | Camera can be wrong while world hash unchanged | **2.88 measured** | Routed by relevant changes; no CI duplicate currently |
| check-standings-invariant | V | Standings architecture regression | Yes | Guard introduction and failability proved (`64a3a6b8`, `be0105f6`), no later production red event isolated | Standings coupling regressions become manual-find only | **3.46 measured** | Single-stage in current flow |
| check-writable | H, V | Tracked readable-but-not-writable files (OneDrive trap) | Yes | Real class described with explicit prior incident (`MERGE-AND-GUARD-1` lines 264/335) | Local tree can be subtly non-writable while read checks pass | **1.44 measured** | Hook catches at commit; verify catches for no-hook paths |
| check-hooks-installed | V (always-on) | Hooks not actually in effect | Yes (CI intentionally skip) | Strong real evidence in `HOOK-TRACKED-1` lines 145-149 and 168 | Entire hook layer can be silently bypassed | **0.18 measured** | Verify is required here because a missing hook cannot self-report |
| ceremony-counts (`gen-ceremony-costs --check-counts`) | V | Generated ceremony count block drift | Yes | Concrete wrong value catch (86 vs 88) in `CEREMONY-COUNTS-GENERATED.md` lines 27/36 | Ceremony trigger argument can be wrong while prose looks fine | **0.18 measured** (no elapsed token; measured wall time) | Verify-only, very cheap |
| engine-reach-doc (`gen-engine-reach-doc --check`) | V | Generated SIM engine-reach block stale | Yes | Routing/doc drift class documented in `DOC-AUDIT-2` chain and subsequent fixes | SIM closure documentation drifts from code | **0.14 measured** | Verify-only, very cheap |
| client-suite (`npm test` in client) | V, C (`test:coverage` variant) | Client behavior regressions | Yes | Continuous real catches by nature; report corpus records many suites gating merges | Core gameplay/UI regressions escape | 202.6 (`SIDE-FREE-CULL-1`), 275.6/239.8 (`VERIFY-COST-2`) | CI catches remote/env-only failures and no-verify pushes |
| script-suite (`node --test scripts/**/*.test.mjs`) | V, C | Guard/tooling liveness regressions | Yes | No single incident isolated by ID-only message search, but many guard regressions were caught by these tests in report text | Guards can lose fail paths silently | 51.0 (`SIDE-FREE-CULL-1`), 37.0/63.6 (`VERIFY-COST-2`) | CI keeps guard-liveness independent of verify routing |
| CI ESLint (`npm run lint`) | C | Static defects/style violations | Yes | No isolated red incident for this script name in 1715 commits | Lint defects shift later | **17.89 measured** | CI only (not in verify/hook) |
| CI format check (`npm run format:check`) | C | Formatting drift | Yes | No isolated red incident in 1715 commits under this script key | Formatting drift enters main/master | **12.49 measured** | CI only |
| CI audit-gate (`scripts/audit-gate.mjs`) | C | High/critical dependency vulnerabilities | Yes | Real advisory closure history in `308cdd4a`, `434501af` | Vulnerability regressions become advisory-only | **1.64 measured** | CI authoritative because dependency state at merge matters |
| pre-commit lint-staged | H | Staged lint/format pre-filter | Yes | No isolated historical catch with this exact name; operates as early duplicate of lint/format class | More cosmetic/static issues reach CI | Could not measure directly in this shell (`EINVAL` running `.cmd` path); hook file documents prior measured overhead 1.35s | Early local fail only; no new defect class |
| pre-commit mint tripwire (`engine-reach --check $staged`) | H (informational) | Commit touches race-reachable files | **No (by design)** | N/A (advisory output only) | Missed reminder to mint before shipping | Cost tied to staged diff; not a blocker and not a guard failure path | Only buys operator awareness at commit moment |
| server test suite (`npm --prefix server test`) | Not wired (manual only) | Server API/auth/data regressions | Yes when run | No evidence of automatic catch because not invoked by verify/hook/CI | Server defects can merge without this suite | **44.17 measured manually**; **0 in pipeline** today | No repetition: currently absent from pipeline |
| e2e suite (`npm --prefix client run test:e2e`) | Not wired (manual only) | Browser-level integration/UX regressions | Yes when run | No evidence of automatic catch because not invoked by verify/hook/CI | End-to-end regressions are hole unless manually run | Not run this round (explicitly forbidden); pipeline cost today is **0** | No repetition: currently absent from pipeline |

## Correction 2: the four fingerprints are roles in `docs/fingerprints.json`

The four roles are exactly: `world`, `world-off`, `camera`, `render`.

`check-fingerprints.mjs` is a containment guard over where current values may appear; it is **not** one of the four roles.

### What `world-off` covers that `world` does not

`world-off` is the OFF ablation arm of the same world instrument:
- command: `node scripts/fingerprint-default.mjs off --gapRerollEnabled=false`
- semantic: the pre-feature invariant world with gap-reroll disabled.

What it adds over `world`:
1. It preserves a stable proof that ON-world movement was caused by gap-reroll-enabled behavior, not unrelated engine drift.
2. It gives a durable, minted reference for parity arguments across ships, not just an ad-hoc rerun.

Is a separate minted role justified today?
- **Yes, narrowly**: because the repository repeatedly uses ON-vs-OFF parity as evidence in ship decisions and post-hoc audits.
- If this project stopped using OFF-arm parity claims, `world-off` could be demoted to on-demand diagnostic.

One-line uncertainty: I did not find a single policy file that *mandates* world-off on every ship; current justification is evidence-practice, not explicit hard rule.

## Correction 3: filled cost column (measured or blocked with reason)

Guard timings measured this round (single-run local):
- `check-config-claims` 0.55s
- `check-config-keys` 0.08s
- `check-doc-facts` 0.11s
- `check-doc-links` 0.18s
- `check-ending-frame` 1.39s
- `check-fallback-agreement` 0.17s
- `check-fingerprint-payload` 0.25s
- `check-hooks-installed` 0.18s
- `check-index` 0.05s total (three dirs); main invocation currently red due this file not being indexed yet
- `check-language-closed` 0.75s
- `check-measured-stamps` 0.92s
- `check-runin-frame` 2.88s
- `check-standings-invariant` 3.46s
- `check-tags` 0.95s
- `check-writable` 1.44s
- `ceremony-counts --check-counts` 0.18s (measured wall-time; no `[ra-elapsed-ms]` token emitted)
- `engine-reach-doc --check` 0.14s
- `fingerprint-containment` 2.63s

CI-only script timings measured this round:
- `npm run lint` (client): 17.89s
- `npm run format:check` (client): 12.49s
- `node scripts/audit-gate.mjs`: 1.64s

Not rerun by instruction:
- `world`, `camera`, `render`, `client-suite`, `e2e` (used existing measured report values).

Blocked measurement:
- `lint-staged` exact hook-path binary could not be executed directly in this shell (`EINVAL` / path resolution mismatch); hook comment documents previously measured 1.35s overhead.

## New question: where the same check runs more than once

| Check group | Repeats at | What repetition buys | Can later stage be the first to fail? |
| --- | --- | --- | --- |
| Fast doc/config guards (`config-claims`, `doc-facts`, `config-keys`, `fallback`, `writable`) | H + V + C (subset) | Early fail in hook; verify branch-wide view; CI merge gate | Yes: `--no-verify`, missing hooks, different branch diff, or CI-only tree state |
| `check-index`, `check-doc-links`, `check-tags` | V + C | Local feedback and remote authority | Yes: origin tag/view and CI checkout can differ from local |
| `fingerprint-containment` | H + V + C | Early drift catch + branch/CI backstop | Yes: local bypasses and report additions after local pass |
| `script-suite` | V + C | Guard liveness in both local and merge pipeline | Yes: local selective runs can miss CI environment issues |
| Client behavioral tests | V + C (`test:coverage`) | Local rapid feedback plus merge gate with coverage artifact | Yes: CI catches remote/state differences and push-without-local-verify |
| `check-hooks-installed` | V only | Detects condition hook cannot self-detect | N/A (single stage) |
| Fingerprint roles (`world`,`camera`,`render`) | V + M | V protects branch; M certifies exact shipped commit | Yes: yes, if tree changes between verify and mint commit |
| `world-off` | M + ad-hoc parity reports | Preserves ON/OFF causality evidence | Yes: yes, when parity claim is made only at ship time |

## Correction 4: proportionality test and ranking

Criterion used for ranking:
1. Unique risk coverage (especially production-facing),
2. Proven catch history,
3. Cost-to-risk ratio (measured seconds),
4. Whether repetition adds independent value.

### Ranking (most to least justified)

1. world-fingerprint
2. camera-fingerprint
3. render-fingerprint
4. client-suite
5. check-measured-stamps
6. check-hooks-installed
7. script-suite
8. check-runin-frame
9. check-standings-invariant
10. check-writable
11. check-fallback-agreement
12. check-config-keys
13. check-index
14. check-tags
15. check-doc-links
16. engine-reach-doc
17. ceremony-counts
18. check-fingerprint-payload
19. check-language-closed
20. check-config-claims
21. check-doc-facts
22. fingerprint-containment
23. CI audit-gate
24. CI ESLint
25. CI format-check
26. world-off (as permanently minted role)
27. pre-commit lint-staged
28. pre-commit mint tripwire (informational)
29. uninvoked suites in pipeline (`server test`, `e2e`) as active protection

Interpretation note: 29th here means "least justified as currently wired," not "least valuable test conceptually." The server/e2e suites rank low because they are not active checks in the current flow.

### Bottom five to drop first (required)

If forced to drop five first:
1. pre-commit mint tripwire
   - Saved: tiny hook-time and operator noise.
   - Lost: immediate mint reminder at commit.
2. pre-commit lint-staged
   - Saved: commit-time friction.
   - Lost: earliest lint/format fail; defects shift to CI.
3. CI format-check
   - Saved: ~12.5s CI time.
   - Lost: explicit formatting gate; relies on lint-staged/hook discipline.
4. CI ESLint
   - Saved: ~17.9s CI time.
   - Lost: independent static-analysis gate in CI; local-only reliance.
5. permanent world-off minted role (not world check itself)
   - Saved: mint/record maintenance overhead.
   - Lost: durable ON/OFF causality proof; parity becomes on-demand and weaker historically.

Line of uncertainty: if owner policy requires OFF-arm minting for every behavior ship, item 5 should not be dropped.

## Rebuilt decision sheet (measured-seconds basis)

High-cost checks with unique coverage (keep):
- world, camera, render, client-suite, script-suite.

Low-cost high-signal checks (keep):
- measured-stamps, hooks-installed, config-keys, fallback-agreement, engine-reach-doc, ceremony-counts, check-index.

Likely consolidation candidates (cost or overlap):
- lint-staged vs CI lint/format redundancy,
- doc-facts vs config-claims overlap (partial),
- permanent world-off role if OFF parity is no longer first-class evidence.

Pipeline holes that are more dangerous than cost overhead:
- server test suite not wired,
- e2e suite not wired.

## Disagreements with repository record (extended)

1. `check-doc-links` declaration scope (`docs/` + `reports/`) does not match runtime inclusion logic (living docs only).
2. `.github/workflows/deploy.yml` is a registered workflow file but non-runnable as currently configured; operationally dormant while config appears active.
3. Server and e2e suites exist but are not active pipeline checks; repository posture can be misread as broader automated coverage than actually enforced.
4. `check-index` currently red in this worktree specifically because this audit file is intentionally unindexed pending owner action; this is expected under the audit constraint not to modify indexes.
