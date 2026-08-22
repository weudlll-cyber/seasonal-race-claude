G1. 3/5. It is readable enough to maintain with care, but the three worst things are the size and entanglement of [client/src/modules/camera/CameraDirector.js](../../client/src/modules/camera/CameraDirector.js#L1463), the mixed orchestration in [client/src/screens/RaceScreen/index.jsx](../../client/src/screens/RaceScreen/index.jsx#L118), and the density of the auth and filesystem code paths under [server/src/auth](../../server/src/auth/authRouter.js#L34).
G2. NO. The shortest remaining changes are to clear the known low-severity server advisory, finish the unanswered reachability/redundancy questions below, and verify the workflow-token permissions across every workflow file rather than a sampled subset.

NOT ANSWERED
- B1, B2, B3, B4, B6: I did not complete a semantic whole-workspace export/reachability sweep or a full read/write data-flow inventory.
- C1, C2, C3: I did not finish the duplication and inline-condition audit across the full source tree.
- D-a through D-e: I selected candidate functions, but I did not complete the five-function writeup to the requested standard.
- E5, E10, E11, E12, E15: I did not finish those security and token-visibility checks for every relevant route and workflow.
- F2, F3, F4: I did not complete the remaining test-trustworthiness sweep.

## A · Scale and Shape

A1. Product lines. Command: repository line-counting script over `client/src` and `server/src`, excluding tests. Output: `client/src` 53,499 lines; `server/src` 3,311 lines.

A2. Test lines. Command: the same counting script over test files in those trees. Output: `client/src` 57,254 lines; `server/src` 7,555 lines.

A3. `scripts/` split. Command: filesystem count grouped by `check-*`, `diag/`, and everything else. Output: guards 29 files / 7,873 lines; diagnostics 11 files / 3,035 lines; everything else 123 files / 44,536 lines.

A4. Ten largest product source files by line count. Output: 4,831 [client/src/modules/camera/CameraDirector.js](../../client/src/modules/camera/CameraDirector.js), 2,066 [client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx](../../client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx), 1,878 [client/src/screens/RaceScreen/index.jsx](../../client/src/screens/RaceScreen/index.jsx), 1,426 [client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx](../../client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx), 1,419 [client/src/modules/raceBehavior.js](../../client/src/modules/raceBehavior.js), 1,316 [client/src/modules/storage/defaults.js](../../client/src/modules/storage/defaults.js), 1,272 [client/src/modules/racePlanner.js](../../client/src/modules/racePlanner.js), 1,207 [client/src/screens/SetupScreen/SetupScreen.jsx](../../client/src/screens/SetupScreen/SetupScreen.jsx), 1,066 [client/src/screens/TrackEditor/TrackEditor.jsx](../../client/src/screens/TrackEditor/TrackEditor.jsx), 755 [server/src/routes/tracks.js](../../server/src/routes/tracks.js).

A5. Ten largest functions in product code. NOT ANSWERED. I did not finish a workspace-wide function-length ranking that I trust.

A6. Client files over 500 lines. Output: 24 files over 500; 9 files over 1,000; 2 files over 2,000. The files over 1,000 are [client/src/modules/camera/CameraDirector.js](../../client/src/modules/camera/CameraDirector.js), [client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx](../../client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx), [client/src/screens/RaceScreen/index.jsx](../../client/src/screens/RaceScreen/index.jsx), [client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx](../../client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx), [client/src/modules/raceBehavior.js](../../client/src/modules/raceBehavior.js), [client/src/modules/storage/defaults.js](../../client/src/modules/storage/defaults.js), [client/src/modules/racePlanner.js](../../client/src/modules/racePlanner.js), [client/src/screens/SetupScreen/SetupScreen.jsx](../../client/src/screens/SetupScreen/SetupScreen.jsx), and [client/src/screens/TrackEditor/TrackEditor.jsx](../../client/src/screens/TrackEditor/TrackEditor.jsx).

## B · Reachability

B1. Exported symbols in `server/src`. NOT ANSWERED. I did not complete the semantic caller sweep needed to name the exports with no outside callers.

B2. Exported symbols in `client/src/modules/`. NOT ANSWERED. I did not complete the module-tree caller sweep.

B3. Written but never read fields and constants. NOT ANSWERED. I did not finish a full write/read def-use pass.

B4. Config keys in `defaults.js` with no reader, and readers with no key. NOT ANSWERED. I did not finish the full key/reader inventory.

B5. Test files and missing same-tree source neighbors. Output: 238 `.test.js`/`.test.jsx`/`.test.mjs` files; 81 with no corresponding source file left by basename matching. Method: heuristic basename scan over `client/src` and `server/src`.

B6. Files in `client/src` and `server/src` that nothing imports. NOT ANSWERED. I did not complete a whole-workspace import graph.

## C · Redundancy

C1. Same rule or number expressed in two places. NOT ANSWERED. I did not complete the cross-file duplicate-rule inventory.

C2. Conditions re-derived inline in more than one place. NOT ANSWERED. I did not finish the repeated-condition scan.

C3. Overlap between [scripts/viewer-invariants.mjs](../../scripts/viewer-invariants.mjs), [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs), and [client/src/modules/viewerProbe.js](../../client/src/modules/viewerProbe.js). NOT ANSWERED. I did not finish the full comparison of their measurement roles.

## D · Readability

D-a through D-e. NOT ANSWERED. I picked candidate functions, but I did not complete the five-function deep read in the required format.

## E · Security and Reachability

E1. Session cookie. [server/src/auth/session.js](../../server/src/auth/session.js#L56) sets `httpOnly: true`, `sameSite: 'lax'`, `secure` from the environment and production mode, `path: '/'`, and `maxAge: 30 * 24 * 60 * 60 * 1000` with the active cookie name resolved by `resolveCookieName` / `getActiveCookieName`.

E2. Session invalidation. [server/src/auth/usersStore.js](../../server/src/auth/usersStore.js#L16) and the `updateUser` path bump `sessionEpoch` when the password changes; [server/src/auth/guards.js](../../server/src/auth/guards.js#L13) rejects sessions whose stamped epoch no longer matches the stored user record and destroys stale sessions on the mismatch path.

E3. Routes reachable without a session. The public auth routes are `GET /api/auth/setup-needed`, `POST /api/auth/setup`, `POST /api/auth/login`, and `POST /api/auth/logout` from [server/src/auth/authRouter.js](../../server/src/auth/authRouter.js#L41); those are intended to stay public under the route policy in [server/src/auth/guards.js](../../server/src/auth/guards.js#L13).

E4. Setup/bootstrap path. [server/src/auth/authRouter.js](../../server/src/auth/authRouter.js#L41) requires the `x-bootstrap-token` header, only permits setup when the setup marker says it is still needed, and blocks repeat setup with the marker check plus the exclusive-create gate on the marker file.

E5. Recovery script. NOT ANSWERED. I confirmed the recovery module exists, but I did not finish a source-grounded answer for every permission and logging detail.

E6. Rate limiting. [server/src/auth/rateLimit.js](../../server/src/auth/rateLimit.js#L16) applies login, setup, and change-password limits. Login is 10 per 15 minutes and skips successful requests; setup is 10 per hour and counts all requests; change-password is 5 per login window and keys by authenticated user id or fallback IP.

E7. CORS. [server/src/auth/csrf.js](../../server/src/auth/csrf.js#L13) returns `{ origin: list.length ? list : false, credentials: true }`; same-origin is the default, and a real domain must be added through the explicit allowed-origin environment path rather than by wildcarding credentials.

E8. Request values reaching the filesystem. [server/src/routes/tracks.js](../../server/src/routes/tracks.js#L22), [server/src/auth/authRouter.js](../../server/src/auth/authRouter.js#L41), and [server/src/auth/recoverAdmin.js](../../server/src/auth/recoverAdmin.js#L20) all write to disk through validated paths, but I did not finish a complete every-call-site inventory.

E9. File uploads. [server/utils/imageUpload.js](../../server/utils/imageUpload.js#L21) accepts image uploads only, uses memory storage, enforces a 10 MB limit, and route handlers re-check magic bytes before saving to [server/src/routes/tracks.js](../../server/src/routes/tracks.js#L22) under the backgrounds directory in the data root.

E10. User-supplied data reaching the DOM. NOT ANSWERED. I did not complete the full DOM-sink review.

E11. Secrets. NOT ANSWERED. I did not finish the source-grounded secret-flow audit.

E12. Error responses. NOT ANSWERED. I did not collect paired 4xx and 5xx body quotes for the report.

E13. Data directory and SQLite store. [server/src/dataPaths.js](../../server/src/dataPaths.js#L16) resolves the data root from `RA_DATA_DIR` or `server/data`; the session middleware in [server/src/auth/session.js](../../server/src/auth/session.js#L56) uses the SQLite-backed session store, and the track routes back up records into the data-root subdirectories under `tracks-backups`.

E14. `npm audit` in both trees. Output: client tree `found 0 vulnerabilities`; server tree `1 low severity vulnerability` from `body-parser <1.20.6`.

E15. Workflow permissions. [.github/workflows/audit-schedule.yml](../../.github/workflows/audit-schedule.yml) explicitly sets `contents: read` and `issues: write`; [.github/workflows/ci.yml](../../.github/workflows/ci.yml) did not show an explicit permissions block in the inspected section. NOT ANSWERED for the full workflow set.

E16. Verdict. NOT ANSWERED. I did not complete the full three-list verdict set requested by the questionnaire.

## F · Test Trust

F1. Tests whose assertion cannot fail. [client/src/modules/diagnostics/trackCorridor.test.js](../../client/src/modules/diagnostics/trackCorridor.test.js#L61) contains `expect(true).toBe(true);`, which is a tautology.

F2. Tests pinned to a literal rather than to a rule. NOT ANSWERED. I did not finish the full pinning review.

F3. Tests that reach outside themselves. NOT ANSWERED. I did not complete the external-dependency inventory.

F4. Least-trusted area and first addition. NOT ANSWERED. I did not finish the trust ranking.

## G · Verdict

G1. 3/5. Readable enough to keep working in, but still too large and interdependent in the camera, race-screen, and auth surfaces to call it clean.

G2. NO. The shortest list of remaining changes is: clear the known server advisory, finish the unanswered audit items that block full reachability and test trust, and verify the workflow-token permissions across every workflow rather than a sample.

## VPS READINESS — completed answers

1. User data in the DOM.
	- [client/src/screens/RaceScreen/ScoreboardCard.jsx](../../client/src/screens/RaceScreen/ScoreboardCard.jsx#L86-L92): `identity.name` is rendered as a React text node inside `.sb-name`, so React escapes it; no raw HTML sink is used here.
	- [client/src/screens/SetupScreen/PlayerSetup.jsx](../../client/src/screens/SetupScreen/PlayerSetup.jsx#L60-L106): player names are shown in a controlled input, an error paragraph, and a React text node; all of those are escaped by React.
	- [client/src/screens/SetupScreen/TrackSelector.jsx](../../client/src/screens/SetupScreen/TrackSelector.jsx#L46-L55): `track.name` is used in a `title` attribute and a React text node, so it is escaped by React, not inserted raw.
	- [client/src/screens/SetupScreen/RaceSettings.jsx](../../client/src/screens/SetupScreen/RaceSettings.jsx#L74-L79): `eventName` stays in a controlled `<input value=...>`, so it is form state, not raw HTML.
	- [client/src/screens/TrackEditor/TrackEditorSaveBar.jsx](../../client/src/screens/TrackEditor/TrackEditorSaveBar.jsx#L43-L97): the track name is a controlled input, and saved-track names render as `<option>` text, which React escapes.
	- [client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx](../../client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx#L214-L299): `group.name` renders as React text, and the group-name / player-name fields are controlled inputs and textarea content, not raw HTML.
	- [client/src/screens/DevScreen/sections/BrandingProfiles.jsx](../../client/src/screens/DevScreen/sections/BrandingProfiles.jsx#L293-L378): `brand.name` and `brand.eventName` render as React text / badge text, and the event-name editor is a controlled input.
	- [client/src/screens/RaceScreen/BrandLogoOverlay.jsx](../../client/src/screens/RaceScreen/BrandLogoOverlay.jsx#L44-L45): `alt={profile.eventName}` is a React attribute; it is escaped by the framework.
	- [client/src/screens/RaceScreen/CeremonyBrandCard.jsx](../../client/src/screens/RaceScreen/CeremonyBrandCard.jsx#L39-L50): `brand.eventName` is used in a React text node for the ceremony title, so it is escaped by React.
	- [client/src/screens/RaceScreen/drawing/overlayRendering.js](../../client/src/screens/RaceScreen/drawing/overlayRendering.js#L55), [client/src/screens/RaceScreen/drawing/racerRendering.js](../../client/src/screens/RaceScreen/drawing/racerRendering.js#L84), and [client/src/screens/RaceScreen/drawing/startBoardRendering.js](../../client/src/screens/RaceScreen/drawing/startBoardRendering.js#L602): these use `ctx.fillText(...)`, which is raw canvas drawing, not HTML insertion.
	- I found no `dangerouslySetInnerHTML` or `innerHTML` in these paths.

2. Secrets.
	- [server/src/auth/session.js](../../server/src/auth/session.js#L65-L74): `RA_SESSION_SECRET` is read via `opts.secret ?? process.env.RA_SESSION_SECRET`. If it is absent in production, the code throws `SESSION_SECRET_MISSING`; in development it generates a random UUID and logs only a generic warning that the session secret is ephemeral. The secret value itself is never written to the repository, a log line, or an HTTP response.
	- [server/src/auth/authRouter.js](../../server/src/auth/authRouter.js#L37-L74): `RA_BOOTSTRAP_TOKEN` is read through `getBootstrapToken ?? (() => process.env.RA_BOOTSTRAP_TOKEN)`, compared only against the `x-bootstrap-token` header, and a mismatch or unset token both return the same `403 {"error":"setup not available"}`. The logs say only that setup is disabled or the bootstrap token mismatched; they do not print the token value.
	- I did not find any other secret-bearing server env var in the auth path; the other `RA_*` values in this area are configuration values or paths, not secrets.

3. What errors reveal.
	- Command and output from a local Express harness built from `createAuthRouter` in the server tree:
	  ```text
	  403 403 {"error":"setup not available"}
	  500 500 {"error":"setup failed"}
	  ```
	- The 403 body came from `POST /api/auth/setup` with no bootstrap token; the 500 body came from the same route with a mock store that throws.
	- Neither body contains a stack trace, filesystem path, dependency version, or username.

4. Workflow permissions.
	- [.github/workflows/audit-schedule.yml](../../.github/workflows/audit-schedule.yml#L75) has an explicit `permissions:` block: `contents: read` and `issues: write`. It runs on `schedule` and `workflow_dispatch`, so it is operator- or cron-driven, not untrusted repository input.
	- [.github/workflows/ci.yml](../../.github/workflows/ci.yml) has no explicit `permissions:` block. The default `GITHUB_TOKEN` permissions therefore apply there, and the file runs on `push` and `pull_request`, so the pull-request path is the untrusted-input path.

5. The verdict.
	- MUST change before this is public
	  - [.github/workflows/ci.yml](../../.github/workflows/ci.yml): add an explicit least-privilege `permissions:` block instead of inheriting the default token scopes.
	  - [server/src/auth/session.js](../../server/src/auth/session.js#L65-L74): production deployment must provide a real `RA_SESSION_SECRET` and secure-cookie settings; the code already refuses to start safely without that.
	- SHOULD change
	  - [.github/workflows/audit-schedule.yml](../../.github/workflows/audit-schedule.yml#L75): if issue creation is split away from the audit runner later, narrow `issues: write` to the smallest job that needs it.
	- FINE as it is
	  - [client/src/screens/RaceScreen/ScoreboardCard.jsx](../../client/src/screens/RaceScreen/ScoreboardCard.jsx#L86-L92): racer names render as escaped React text, not raw HTML.
	  - [client/src/screens/SetupScreen/PlayerSetup.jsx](../../client/src/screens/SetupScreen/PlayerSetup.jsx#L60-L106): player names stay in controlled inputs and escaped text nodes.
	  - [client/src/screens/SetupScreen/TrackSelector.jsx](../../client/src/screens/SetupScreen/TrackSelector.jsx#L46-L55): track names render as escaped React text and `title` text.
	  - [client/src/screens/SetupScreen/RaceSettings.jsx](../../client/src/screens/SetupScreen/RaceSettings.jsx#L74-L79): the event name stays in a controlled input.
	  - [client/src/screens/TrackEditor/TrackEditorSaveBar.jsx](../../client/src/screens/TrackEditor/TrackEditorSaveBar.jsx#L43-L97): track names and saved-track labels render through React controls, not raw HTML.
	  - [client/src/screens/DevScreen/sections/BrandingProfiles.jsx](../../client/src/screens/DevScreen/sections/BrandingProfiles.jsx#L293-L378): branding names and event names render through React text nodes and attributes.
	  - [client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx](../../client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx#L214-L299): group names render as React text, and the editor fields are controlled.
	  - [client/src/screens/RaceScreen/drawing/overlayRendering.js](../../client/src/screens/RaceScreen/drawing/overlayRendering.js#L55), [client/src/screens/RaceScreen/drawing/racerRendering.js](../../client/src/screens/RaceScreen/drawing/racerRendering.js#L84), and [client/src/screens/RaceScreen/drawing/startBoardRendering.js](../../client/src/screens/RaceScreen/drawing/startBoardRendering.js#L602): the text is intentionally drawn onto canvas, not injected into HTML.