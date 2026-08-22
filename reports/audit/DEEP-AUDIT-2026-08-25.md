# DEEP-AUDIT-2026-08-25

Date: 2026-08-25
Status: Read-only deep audit

## Coverage Statement

I read the source end-to-end for the core subsystems that control public behavior, security, rendering, and the measurement harnesses:

- [server/src/app.js](../../server/src/app.js)
- [server/src/index.js](../../server/src/index.js)
- [server/src/auth/authRouter.js](../../server/src/auth/authRouter.js)
- [server/src/auth/guards.js](../../server/src/auth/guards.js)
- [server/src/auth/csrf.js](../../server/src/auth/csrf.js)
- [server/src/auth/rateLimit.js](../../server/src/auth/rateLimit.js)
- [server/src/auth/session.js](../../server/src/auth/session.js)
- [server/src/auth/usersStore.js](../../server/src/auth/usersStore.js)
- [server/src/auth/recoverAdmin.js](../../server/src/auth/recoverAdmin.js)
- [server/src/auth/restampSession.js](../../server/src/auth/restampSession.js)
- [server/src/auth/setupContract.test.js](../../server/src/auth/setupContract.test.js)
- [server/src/auth/changePasswordContract.test.js](../../server/src/auth/changePasswordContract.test.js)
- [server/src/auth/sessionInvalidation.test.js](../../server/src/auth/sessionInvalidation.test.js)
- [server/src/auth/authRouter.test.js](../../server/src/auth/authRouter.test.js)
- [server/src/auth/setupStateDisagreement.test.js](../../server/src/auth/setupStateDisagreement.test.js)
- [server/src/auth/setupTokenLog.test.js](../../server/src/auth/setupTokenLog.test.js)
- [server/src/auth/authz.integration.test.js](../../server/src/auth/authz.integration.test.js)
- [server/src/auth/usersStore.test.js](../../server/src/auth/usersStore.test.js)
- [server/src/auth/users.integration.test.js](../../server/src/auth/users.integration.test.js)
- [server/src/auth/recoverAdmin.test.js](../../server/src/auth/recoverAdmin.test.js)
- [server/src/auth/routePolicyDrift.test.js](../../server/src/auth/routePolicyDrift.test.js)
- [server/src/routes/tracks.js](../../server/src/routes/tracks.js)
- [server/src/routes/brands.js](../../server/src/routes/brands.js)
- [server/src/routes/racers.js](../../server/src/routes/racers.js)
- [server/src/routes/surfaceClasses.js](../../server/src/routes/surfaceClasses.js)
- [server/src/routes/playerGroups.js](../../server/src/routes/playerGroups.js)
- [server/src/routes/_defaultPromote.js](../../server/src/routes/_defaultPromote.js)
- [server/src/routes/tracks.test.js](../../server/src/routes/tracks.test.js)
- [server/src/routes/surfaceClasses.test.js](../../server/src/routes/surfaceClasses.test.js)
- [client/src/services/authApi.js](../../client/src/services/authApi.js)
- [client/src/services/apiClient.js](../../client/src/services/apiClient.js)
- [client/src/contexts/AuthContext.jsx](../../client/src/contexts/AuthContext.jsx)
- [client/src/modules/storage/storage.js](../../client/src/modules/storage/storage.js)
- [client/src/modules/storage/defaults.js](../../client/src/modules/storage/defaults.js)
- [client/src/modules/camera/CameraDirector.js](../../client/src/modules/camera/CameraDirector.js)
- [client/src/modules/camera/framingRule.js](../../client/src/modules/camera/framingRule.js)
- [client/src/modules/camera/resolveCamera.js](../../client/src/modules/camera/resolveCamera.js)
- [client/src/modules/raceCore.js](../../client/src/modules/raceCore.js)
- [client/src/modules/racePlanner.js](../../client/src/modules/racePlanner.js)
- [client/src/modules/raceBehavior.js](../../client/src/modules/raceBehavior.js)
- [client/src/modules/viewerProbe.js](../../client/src/modules/viewerProbe.js)
- [client/src/screens/RaceScreen/index.jsx](../../client/src/screens/RaceScreen/index.jsx)
- [client/src/modules/diagnostics/trackCorridor.test.js](../../client/src/modules/diagnostics/trackCorridor.test.js)
- [scripts/viewer-invariants.mjs](../../scripts/viewer-invariants.mjs)
- [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs)
- [scripts/check-config-keys.mjs](../../scripts/check-config-keys.mjs)
- [reports/audit/PROJECT-HYGIENE-2026-08-25.md](./PROJECT-HYGIENE-2026-08-25.md)

I also bucket-scanned the remaining repository surface by command and directory scan. I did not fully open every file in `client/src`, `server/src`, `scripts`, `docs`, or `reports`, and I am not claiming full repository coverage.

Measured repo scale from the bucket scan:

- `client/src`: 482 files, 104970 lines
- `server/src`: 44 files, 9304 lines
- `docs`: 57 files, 19008 lines
- `scripts`: 164 files, 52623 lines
- `reports`: 1143 files, 959327 lines

## Verdict

The application-side security and routing model looks broadly sound in the files I read: deny-by-default is explicit, auth and CSRF gates are present, the setup token seam is now aligned, and the public route surface is guarded by both tests and policy. I did not find a current evidence-backed auth bypass in the reviewed source.

That said, I would not call the repository itself clean enough for a frictionless public-VPS handoff yet. The confirmed dead diagnostic test and the oversized report archive are maintenance defects, and the repository still carries a large amount of measurement machinery that needs active stewardship.

## File Verdicts

### Security and request handling

- [server/src/app.js](../../server/src/app.js) — OK. The app composes the auth, CSRF, and route-guard stack in one place.
- [server/src/auth/authRouter.js](../../server/src/auth/authRouter.js) — OK. Setup, login, logout, and password-change behavior is internally consistent in the reviewed file.
- [server/src/auth/guards.js](../../server/src/auth/guards.js) — OK. The route policy is explicit and fail-closed.
- [server/src/auth/csrf.js](../../server/src/auth/csrf.js) — OK. Same-origin and allowed-origin checks are enforced.
- [server/src/auth/rateLimit.js](../../server/src/auth/rateLimit.js) — OK. Separate limiters exist for login, setup, and password change.
- [server/src/auth/session.js](../../server/src/auth/session.js) — OK. Session policy is centralized and cookie behavior is controlled.
- [server/src/auth/usersStore.js](../../server/src/auth/usersStore.js) — OK. The store serializes writes and hides sensitive fields from safe user objects.
- [server/src/auth/recoverAdmin.js](../../server/src/auth/recoverAdmin.js) — OK. Recovery and rearm paths are explicit and audit-oriented.
- [server/src/auth/restampSession.js](../../server/src/auth/restampSession.js) — OK. Self-password changes keep the requesting session alive while still invalidating other sessions through the store epoch mechanism.
- [server/src/auth/setupContract.test.js](../../server/src/auth/setupContract.test.js) — OK. The client/server setup-token seam is pinned and currently passes.
- [server/src/auth/changePasswordContract.test.js](../../server/src/auth/changePasswordContract.test.js) — OK. The client/server self-password-change seam is pinned and currently passes.
- [server/src/auth/sessionInvalidation.test.js](../../server/src/auth/sessionInvalidation.test.js) — OK. The observable invalidation contract is covered.
- [server/src/auth/authz.integration.test.js](../../server/src/auth/authz.integration.test.js) — OK. Anonymous, operator, and admin access are each tested against the real app.
- [server/src/auth/users.integration.test.js](../../server/src/auth/users.integration.test.js) — OK. The user CRUD surface is tested with role-gated access.
- [server/src/auth/routePolicyDrift.test.js](../../server/src/auth/routePolicyDrift.test.js) — OK. New mutating routes must be classified.

### CRUD and data files

- [server/src/routes/tracks.js](../../server/src/routes/tracks.js) — OK. The CRUD and upload flow is explicit, with validation and cleanup paths.
- [server/src/routes/brands.js](../../server/src/routes/brands.js) — OK. Same pattern as the other file-backed resources.
- [server/src/routes/racers.js](../../server/src/routes/racers.js) — OK. Same pattern as the other file-backed resources.
- [server/src/routes/surfaceClasses.js](../../server/src/routes/surfaceClasses.js) — OK. Validation and persistence are explicit.
- [server/src/routes/playerGroups.js](../../server/src/routes/playerGroups.js) — OK. No obvious drift in the reviewed implementation.
- [server/src/routes/_defaultPromote.js](../../server/src/routes/_defaultPromote.js) — OK. Admin-only promotion/export behavior is centralized.
- [server/src/routes/tracks.test.js](../../server/src/routes/tracks.test.js) — OK. The route behavior is exercised at the seam level.
- [server/src/routes/surfaceClasses.test.js](../../server/src/routes/surfaceClasses.test.js) — OK. The surface-class contract is covered.

### Client and camera pipeline

- [client/src/services/authApi.js](../../client/src/services/authApi.js) — OK. The bootstrap token now travels in the header and the body no longer carries it.
- [client/src/services/apiClient.js](../../client/src/services/apiClient.js) — OK. The fetch wrapper has one transport policy and one unauthorized path.
- [client/src/contexts/AuthContext.jsx](../../client/src/contexts/AuthContext.jsx) — OK. The auth lifecycle is centralized in one client-side state manager.
- [client/src/modules/storage/storage.js](../../client/src/modules/storage/storage.js) — OK. Storage key handling is centralized.
- [client/src/modules/storage/defaults.js](../../client/src/modules/storage/defaults.js) — OK. This is the authority for shipped defaults.
- [client/src/modules/camera/CameraDirector.js](../../client/src/modules/camera/CameraDirector.js) — OK but very large. The file is intentionally dense and behavior-critical.
- [client/src/modules/camera/framingRule.js](../../client/src/modules/camera/framingRule.js) — OK. The framing rule remains pure and narrow.
- [client/src/modules/camera/resolveCamera.js](../../client/src/modules/camera/resolveCamera.js) — OK. It only loosens the requested shot.
- [client/src/modules/raceCore.js](../../client/src/modules/raceCore.js) — OK. The browser physics path is intentionally extracted and still tied to the same deterministic inputs.
- [client/src/modules/racePlanner.js](../../client/src/modules/racePlanner.js) — OK. The race-plan and trajectory controller logic are centralized.
- [client/src/modules/raceBehavior.js](../../client/src/modules/raceBehavior.js) — OK. The behavior engine is dense, but the invariants are well named.
- [client/src/screens/RaceScreen/index.jsx](../../client/src/screens/RaceScreen/index.jsx) — OK but very large. It is the main orchestration surface and also the main maintenance risk.
- [client/src/modules/viewerProbe.js](../../client/src/modules/viewerProbe.js) — OK. The browser-side measurement model is explicit about what it can and cannot prove.
- [scripts/viewer-invariants.mjs](../../scripts/viewer-invariants.mjs) — OK but expensive. The file is intentionally a production-browser sweep harness.
- [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs) — OK but expensive. The file is intentionally a spec harness, not ordinary application code.
- [scripts/check-config-keys.mjs](../../scripts/check-config-keys.mjs) — OK. The guard exists for a real loader edge and documents its blind spots.

### Tests and hygiene

- [client/src/modules/diagnostics/trackCorridor.test.js](../../client/src/modules/diagnostics/trackCorridor.test.js) — BAD. The last assertion is a tautology and cannot fail.
- [reports/audit/PROJECT-HYGIENE-2026-08-25.md](./PROJECT-HYGIENE-2026-08-25.md) — OK. The earlier read-only hygiene audit is coherent with this pass.

## Findings

| ID | Severity | Scope | Evidence | Summary |
| --- | --- | --- | --- | --- |
| F1 | Medium | Repository maintenance | `reports/` has 1143 files and 959327 lines; `reports/perf` alone has 326 files and 787228 lines | The archive dominates the repository and is expensive to navigate, review, and preserve |
| F2 | Low | Test hygiene | [client/src/modules/diagnostics/trackCorridor.test.js](../../client/src/modules/diagnostics/trackCorridor.test.js#L61) contains `expect(true).toBe(true);` | The diagnostic test cannot fail and therefore cannot detect regression |

## Ordered Findings

### F1 - The report archive is larger than the code and docs surface combined

The repository is not merely big; it is skewed. The report tree alone is 1143 files and 959327 lines, and `reports/perf` accounts for 326 files and 787228 lines of that total. In practice, that makes the archive the main navigation burden for future audits and reviews.

This is not a correctness bug, but it is a real operational risk. A naive cleanup would destroy benchmark provenance, so the right response is to compress, quarantine, or externalize raw perf dumps while keeping a smaller in-repo summary ledger.

### F2 - The corridor diagnostic test is a tautology

[client/src/modules/diagnostics/trackCorridor.test.js](../../client/src/modules/diagnostics/trackCorridor.test.js#L61) ends with `expect(true).toBe(true);`. That assertion can never fail, so the test cannot protect the diagnostic path it claims to cover.

This is long-lived, not transient: the earlier hygiene pass already identified it, and the file still has the same no-op shape. The smallest correct fix is to replace the tautology with a real assertion or delete the diagnostic test.

## Security Readiness

On the source I read, the public-facing auth stack is in a reasonable state for a VPS deployment:

- the app mounts explicit auth and CSRF middleware,
- the route surface is deny-by-default,
- setup and password-change seams are tested against the real client and server,
- session invalidation behavior is covered at the observable level,
- route drift is guarded by a dedicated test.

I did not find a current evidence-backed public-route auth bypass in the reviewed source. The remaining concern is not a specific exposed vulnerability in the files I read; it is the repository's maintenance burden and the fact that I did not fully open the entire remaining tree.

## Not Verified

I did not fully open every file in:

- the remainder of `client/src`
- the remainder of `server/src`
- the remainder of `scripts`
- the remainder of `docs`
- most of `reports/`

So any statement about dead material, duplicate logic, or hidden regressions outside the files listed above is intentionally left at `not verified`.

## First Hour

If I had one hour, I would fix F2 first because it is the lowest-risk confirmed defect. After that I would start shrinking or externalizing the raw perf archive, but only in a way that preserves provenance.
