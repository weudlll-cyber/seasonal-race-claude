# TIDY-C-1 — three items off the tidy list

**What this reports:** three items closed from [BACKLOG.md](../../docs/BACKLOG.md) PART ONE row
"C — the tidy list", 2026-10-02, branch `fix/tidy-c` off master `a96c9762`. The row stays open:
other items remain on it, and the 30-day session cookie is left alone because the owner decided it.

## (a) `framingRule.js` — `innerFramePct` defaults read the shipped value

**Before:** `corridorGuarantee`, `contenderGuarantee` and `pairGuarantee` defaulted `innerFramePct`
to the literal `1`, while the shipped safe region is not 1.

**After:** all three defaults are `DEFAULT_INNER_FRAME_PCT`, imported from `framingConfig.js`. That
file already defines it as `DEFAULT_CAMERA_CONFIG.targetInnerFramePct`.

**Why that source, and not `cameraStateProfiles.*.innerFramePct`.** The director is the only
production caller. It takes its value from `resolveFramingConfig` (`framingConfig.js`), which reads
the top-level `targetInnerFramePct` and falls back to `DEFAULT_INNER_FRAME_PCT`. The per-state
`cameraStateProfiles.*.innerFramePct` keys are not read by the director at all. Only the Dev Screen
section and `scripts/camera-replay.mjs` read them. So the value that actually reaches these functions
is `targetInnerFramePct`, and its existing named constant is reused instead of a new import of
`defaults.js`.

**Proof that nothing moved.** Every production call already passes the value:
`CameraDirector.js` at the two `contenderGuarantee` calls and the two `corridorGuarantee` calls,
and `pairGuarantee` is only called from inside `framingRule.js`.

- `node scripts/engine-reach.mjs --check <all 7 changed code paths>` →
  `ENGINE REACH: 1 of 7 path(s) can change the race: client/src/modules/camera/framingRule.js`.
- `node scripts/check-fingerprints.mjs --mint` (verify-only: `grep -c writeFileSync` = 0) →
  `check-fingerprints: 4 roles, 1264 tracked files scanned, 0 stray copies, 4 role(s) re-minted
  against the engine.` followed by `[ra-elapsed-ms 524885]`, which the script prints only when no
  role disagreed. `docs/fingerprints.json` was not written.

**Tests that followed.** Five tests in `framingRule.test.js` measured full-frame geometry while
relying on the omitted argument meaning 1. They now pass `1` explicitly. The camera suite has 35
files and 1014 tests, all green.

## (b) `server/Dockerfile` — base image pinned by digest (ordered by the owner, 2026-10-02)

Both `FROM` lines read
`node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293`. That is
the multi-arch OCI index digest that `docker buildx imagetools inspect node:20-alpine` returned on
2026-10-02. A comment above the first `FROM` gives the tag, the digest, the date, and how a manual
bump is done. A second check against the registry API was blocked by this session's permissions,
so the digest comes from one source.

- `node scripts/check-container-paths.mjs` → 0 undeclared, exit 0.
- `node scripts/check-image-starts.mjs` (Docker available) → built from the pinned Dockerfile in
  24.3 s and booted with no bind mounts. `/api/health` answered ok.
- `docs/DEPLOY-NOTES.md` door 6 and its §3 paragraph now record the pin as a dated fact. The
  earlier reasoning is kept, struck through.

## (c) Backup checksum, checked by `npm run status`

- `scripts/backup.mjs` adds `checksumPath`, `checksumLine` and `verifyChecksum`, using
  `node:crypto` `createHash('sha256')`. They sit beside `archiveName`/`archiveTakenAt`, so the
  archive and its checksum are one format in one file. `backup()` writes `<archive>.sha256`
  (`"<hex>  <name>\n"`, the `sha256sum` format) from the same bytes it just wrote.
- `scripts/status.mjs` `checkBackup` passes only when the newest archive is recent enough AND
  `verifyChecksum` says it matches. A missing checksum file fails, and so does a mismatch.
- New tests: `every archive gets a sha256sum-format checksum file beside it, and it matches`,
  `verifyChecksum FAILS on a changed archive, a missing file, and a file naming another archive`
  (backup), and `backup FAILS when the newest archive has no checksum file, or no longer matches it`
  (status). The `npm run backup` CLI test also asserts the checksum. The status fixture now writes
  a checksum with the same helper.

**Sabotage, each restored afterwards:**

| sabotage | went red |
| --- | --- |
| `checksumLine` writes one space instead of two | 7 tests, the new format test among them, because a one-space line is not `sha256sum` format and `verifyChecksum` rejects it |
| `verifyChecksum` ignores the hash comparison | `verifyChecksum FAILS on …` and status `backup FAILS when … no checksum file, or no longer matches it` |
| `checkBackup` skips `verifyChecksum` | status `backup FAILS when … no checksum file, or no longer matches it` |

Restored: 23 pass, 1 skipped (the pre-existing Windows-only chmod case), 0 fail.

## Noticed and left

- Some line references to `server/Dockerfile` were already stale on master before this piece:
  `Dockerfile:68` in `client/.dockerignore`, `scripts/verify.mjs` (two places),
  `scripts/verify.test.mjs` and `scripts/check-image-starts.mjs`, which names
  `COPY --from=client`; that line is now `COPY --from=client-build` at line 107 on master. Also
  `Dockerfile:32`/`:42` in `docs/DEPLOYMENT.md`. This piece moves every line by up to 6 more.
- `zoomCeilingToFit` and `fieldGuarantee` in `framingRule.js` also default `innerFramePct` to `1`.
  Neither was on the list. For `zoomCeilingToFit` the 1 is the neutral raw fit that the guarantees
  build on.
- The per-state `cameraStateProfiles.*.innerFramePct` keys do not reach the director. They reach
  the Dev Screen and `camera-replay.mjs` only. So a Dev Screen edit of them may change nothing in
  the race picture. This was not investigated further.
