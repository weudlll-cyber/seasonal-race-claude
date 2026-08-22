# PROJECT-HYGIENE-2026-08-25

Date: 2026-08-25
Status: Read-only hygiene audit

## Coverage Statement

I fully read the following files:
- [client/src/services/authApi.js](../../client/src/services/authApi.js#L88)
- [client/src/services/apiClient.js](../../client/src/services/apiClient.js#L1)
- [server/src/auth/authRouter.js](../../server/src/auth/authRouter.js#L55)
- [server/src/auth/setupContract.test.js](../../server/src/auth/setupContract.test.js#L95)
- [server/src/auth/session.test.js](../../server/src/auth/session.test.js#L11)
- [client/src/modules/diagnostics/trackCorridor.test.js](../../client/src/modules/diagnostics/trackCorridor.test.js#L61)
- [client/src/screens/DevScreen/DevScreen.tier-toggle.test.jsx](../../client/src/screens/DevScreen/DevScreen.tier-toggle.test.jsx#L143)
- [scripts/verify.mjs](../../scripts/verify.mjs#L358)
- [scripts/lib/routing.mjs](../../scripts/lib/routing.mjs#L291)
- [client/vitest.config.js](../../client/vitest.config.js#L25)
- [client/playwright.config.js](../../client/playwright.config.js#L10)
- [docs/VERIFY-RULES.md](../../docs/VERIFY-RULES.md#L441)
- [.github/workflows/ci.yml](../../.github/workflows/ci.yml#L306)
- [.githooks/pre-commit](../../.githooks/pre-commit#L61)
- [reports/evolution/PROJECT-AUDIT-2026-08-17.md](../evolution/PROJECT-AUDIT-2026-08-17.md)
- [reports/evolution/PROJECT-AUDIT-2026-08-18.md](../evolution/PROJECT-AUDIT-2026-08-18.md)

I sampled the rest by command and directory scan, not by opening every file:
- `client/src`: 482 files, 104970 lines
- `server/src`: 44 files, 9304 lines
- `docs`: 57 files, 19008 lines
- `scripts`: 164 files, 52623 lines
- `reports`: 1143 files, 959327 lines

Not opened fully:
- the remainder of `client/src`, `server/src`, `scripts`, and `docs`
- most of `reports/`, which I sampled at bucket level because the tree is far too large to read file-by-file in one pass

## Verdict on the two earlier audits

### PROJECT-AUDIT-2026-08-17

The broad diagnosis still holds: the guard apparatus is explicit, the hook is tracked, the docs guard layer is mature, and the main pain is still cost and overlap rather than missing coverage. The specific recommendation to add path-based CI gating as a default is withdrawn; current CI is intentionally a full push/PR verdict, and the scheduled audit workflow already handles the feed-driven case.

The two-lane framing is now mostly a naming issue, not a missing design: hook, verify, and CI already exist as separate lanes. The ownership/lifecycle idea is partly acted on through the R13 rule and the declaration-based router, but it is not yet fully formalized as one inventory.

### PROJECT-AUDIT-2026-08-18

The setup-token seam finding is now acted on. The client sends the bootstrap token in the `x-bootstrap-token` header at [client/src/services/authApi.js](../../client/src/services/authApi.js#L91), the server reads that header at [server/src/auth/authRouter.js](../../server/src/auth/authRouter.js#L55), and the seam test passes:

```text
Set-Location server; npm test -- src/auth/setupContract.test.js
Test Files  1 passed (1)
Tests       5 passed (5)
Duration    9.78s
```

The path-filter warning from that audit still holds: naive path-skipping would weaken the meaning of a green merge verdict. The ownership/lifecycle idea is still mostly right, but it is already partly embodied in the current routing and rule structure.

## Size

The repository is not small where it matters for hygiene.

Measured directory sizes:
- `client/src`: 482 files, 104970 lines
- `server/src`: 44 files, 9304 lines
- `docs`: 57 files, 19008 lines
- `scripts`: 164 files, 52623 lines
- `reports`: 1143 files, 959327 lines

The report tree alone is 5.16x the combined line count of code plus docs from the measured buckets above. The largest report bucket is `reports/perf` at 326 files and 787228 lines.

Largest files from the sampled scan:
- `reports/closed-track-overview/fp-impl/fairness-data.json`: 39093 lines
- `reports/perf/label-bench-1/chain-n100.json`: 26708 lines
- `reports/perf/label-bench-1/chain-n70.json`: 26400 lines
- `reports/perf/label-bench-1/chain-n30.json`: 25252 lines
- `client/src/modules/camera/CameraDirector.test.js`: 7537 lines
- `client/src/modules/camera/CameraDirector.js`: 4658 lines
- `scripts/sim-fairness.mjs`: 6063 lines
- `scripts/exp-runaway-leader.mjs`: 3531 lines

Largest function-shaped blocks I sampled are in [client/src/modules/camera/CameraDirector.js](../../client/src/modules/camera/CameraDirector.js#L1406), [client/src/modules/camera/CameraDirector.js](../../client/src/modules/camera/CameraDirector.js#L2222), [client/src/modules/camera/CameraDirector.js](../../client/src/modules/camera/CameraDirector.js#L2547), [client/src/modules/camera/CameraDirector.js](../../client/src/modules/camera/CameraDirector.js#L3087), [client/src/modules/camera/CameraDirector.js](../../client/src/modules/camera/CameraDirector.js#L3784), [scripts/viewer-invariants.mjs](../../scripts/viewer-invariants.mjs#L223), [scripts/viewer-invariants.mjs](../../scripts/viewer-invariants.mjs#L319), [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs#L133), and [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs#L175). The file growth since `f0cb5179` is concentrated in the same endgame/camera area: `client/src/modules/camera/CameraDirector.js` grew by 881 net lines, `scripts/viewer-invariants.mjs` by 770, `scripts/diag/endgame-spec.mjs` by 677, `client/src/modules/viewerProbe.js` by 672, and `docs/CAMERA_DIRECTOR.md` by 395 net lines. The commit messages show why: `ENDGAME-LAND-CLEAN-1`, `ENDGAME-REWRITE-1`, and `RETIRE-RUNIN-LEGACY-1` are the main drivers.

Single biggest reduction opportunity:
- The raw `reports/perf` archive is the best candidate to shrink or externalize.
- Risk: it would remove replayable benchmark provenance and could break later audit trails.
- That is a real risk, so the correct move is to compress or quarantine raw perf dumps, not to delete the history blindly.

## Sources

I did not find a clear dead storage key in the sampled registry. The obvious keys I checked had real readers: `ACTIVE_SESSION`, `ACTIVE_GROUP`, `LAST_USER`, `RACE_HISTORY`, `RACE_BEHAVIOR_CONFIG`, `RACE_DYNAMICS_CONFIG`, `ROW_LAYOUT_CONFIG`, and `FRAME_TIMING_CONFIG` all have current consumers in `client/src`.

The current client-server setup seam is now consistent, and the seam test is the right kind of control: it proves the channel, not just the parsed response. That is a good source hygiene result, not a finding.

## Tests

No `it.skip`, `test.skip`, or `describe.skip` markers were found in the sampled `client/src`, `server/src`, or `scripts` test trees.

The main suite-discovery paths are guarded against silent shrink:
- [scripts/verify.mjs](../../scripts/verify.mjs#L358) uses `git ls-files scripts` and then filters `*.test.mjs`, so a nested test cannot disappear silently.
- [.github/workflows/ci.yml](../../.github/workflows/ci.yml#L306) asserts that `find scripts -name '*.test.mjs'` returns something before `node --test` runs.
- [client/vitest.config.js](../../client/vitest.config.js#L25) deliberately excludes Playwright e2e specs from Vitest.
- [client/playwright.config.js](../../client/playwright.config.js#L10) deliberately keeps the e2e suite out of the per-push CI path and in night work.

Test-to-source ratios by area, measured by file count:
- `client/src`: 267 source files, 215 test files, ratio 0.81
- `server/src`: 21 source files, 23 test files, ratio 1.10
- `scripts`: 128 source files, 36 test files, ratio 0.28

Outliers:
- Client is test-heavy because the camera and race-screen code is large; `client/src/modules/camera/CameraDirector.test.js` is the biggest test file at 7537 lines.
- Server has a healthy number of integration tests because it uses supertest and temp storage for auth/session seams.
  - [server/src/auth/session.test.js](../../server/src/auth/session.test.js#L11) uses supertest.
  - [server/src/auth/session.test.js](../../server/src/auth/session.test.js#L16) uses a real SQLite database on a temp path.
  - [server/src/auth/session.test.js](../../server/src/auth/session.test.js#L95) proves the SQLite store, not MemoryStore.
  - [server/src/auth/setupContract.test.js](../../server/src/auth/setupContract.test.js#L95) is a real client/server seam test.
- Scripts are comparatively under the source-test ratio, but the guard scripts themselves are intentionally thin and many are validated by direct test files.

The one bad test outlier I found is the diagnostic no-op in [client/src/modules/diagnostics/trackCorridor.test.js](../../client/src/modules/diagnostics/trackCorridor.test.js#L61): the file ends with `expect(true).toBe(true);`. `git blame -L 55,65 -- client/src/modules/diagnostics/trackCorridor.test.js` attributes that line to `d6f4d20ee` on 2026-05-06, so this is a long-lived no-op, not a transient editing artifact.

## Documents

The sampled living docs are consistent with source on the important boundaries:
- [docs/VERIFY-RULES.md](../../docs/VERIFY-RULES.md#L441) says the browser suite is night work.
- [client/playwright.config.js](../../client/playwright.config.js#L10) says the same thing.
- [client/vitest.config.js](../../client/vitest.config.js#L25) excludes Playwright e2e specs from Vitest.

I did not find a current living-doc contradiction in the sampled set. That is not a proof over the whole tree; it is a sampled result, so the honest answer for the rest is `not verified`.

The size problem is the report archive itself, not the living docs: `reports/` is the dominant tree by line count and file count, while `docs/` is comparatively small.

## Apparatus

The apparatus inventory is 16 check scripts, 36 check tests, 11 generators, and 5 fingerprint-related scripts.

Measured cost for a representative 20-check run was 118.37s total. The largest contributors in that run were:
- `check-runin-frame`: 50.105s
- `check-standings-invariant`: 24.910s
- `check-fingerprints`: 15.641s
- `check-writable`: 10.332s
- `check-tags`: 3.130s
- `ceremony-counts`: 2.480s
- `engine-reach-doc`: 1.204s
- `check-ending-frame`: 1.066s
- `check-measured-stamps`: 0.823s
- `check-language-closed`: 0.627s

No exact duplicate check-on-the-same-input was found in the sampled apparatus. The closest overlaps are intentional splits over the same storage-defaults family and the same living-doc family, but they ask different questions and do not collapse into the same verdict.

The guard-routing layer is now good at avoiding silent shrink:
- [scripts/verify.mjs](../../scripts/verify.mjs#L358) filters script tests from `git ls-files`.
- [.github/workflows/ci.yml](../../.github/workflows/ci.yml#L306) asserts non-empty discovery before `node --test`.
- [scripts/lib/routing.mjs](../../scripts/lib/routing.mjs#L291) and [scripts/lib/routing.mjs](../../scripts/lib/routing.mjs#L312) collect and validate declarations instead of relying on a hand-maintained route table.

## Findings

| ID | Visibility | Severity | Reachability | Evidence | Minimum fix | If left alone |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Owner-visible | Medium | No shipped path; repository maintenance path | `reports/perf` has 326 files and 787228 lines; the full `reports/` tree has 1143 files and 959327 lines, which is 5.16x the measured code+docs buckets | Externalize or compress raw perf dumps into a smaller curated archive and keep only the summary ledger in-repo | The archive keeps dominating navigation, diff review, and future audits |
| F2 | Developer-visible | Low | Test-only path | [client/src/modules/diagnostics/trackCorridor.test.js](../../client/src/modules/diagnostics/trackCorridor.test.js#L61) ends with `expect(true).toBe(true);`; `git blame` pins it to 2026-05-06 | Replace the tautology with a real assertion or delete the diagnostic test | The suite keeps a green test that cannot detect corridor regressions |

## Ordered Findings

### F1 - Reports/perf dominates the repository archive

The report tree is too large to treat as ordinary documentation. The measured counts show that `reports/` has 1143 files and 959327 lines, with `reports/perf` alone accounting for 326 files and 787228 lines. That is not a correctness bug, but it is a hygiene problem: the archive is larger than the actual code-plus-docs buckets combined by a factor of 5.16.

This is owner-visible when working in the repository, and the risk of a naive cleanup is real: a blind delete would destroy benchmark provenance. The smallest correct fix is to compress or externalize raw perf dumps and leave a curated summary in the repo.

### F2 - The corridor diagnostic test cannot fail

[client/src/modules/diagnostics/trackCorridor.test.js](../../client/src/modules/diagnostics/trackCorridor.test.js#L61) contains a tautology: `expect(true).toBe(true);`. That test can never detect a regression. `git blame` shows it has been that way since 2026-05-06, so it is long-lived and intentional-looking rather than accidental.

This is developer-visible only, but it is still a hygiene defect because it creates a green check that cannot prove anything. The smallest correct fix is either a real assertion on the diagnostic output or deletion of the test.

## First Hour

If I had one hour, I would fix F2 first because it is the lowest-risk confirmed defect: replace the no-op diagnostic assertion with a real check or remove the test entirely. If time remained, I would start on F1 by reducing the raw perf archive, but only by preserving provenance.

What I would not do, even though it looks attractive:
- Do not prune CI with path filters just to make the pipeline feel faster. That would weaken the meaning of a green merge verdict.
- Do not delete the perf archive wholesale. The repo still needs benchmark history, just not at its current bulk.
