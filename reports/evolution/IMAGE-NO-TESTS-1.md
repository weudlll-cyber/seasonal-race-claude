# IMAGE-NO-TESTS-1 — 31 test files left the image, and what is still in it

**Date:** 2026-09-04 · **Branch:** `image/no-test-files` off master `fb986bf4`
**Pieces 1 and 2 of the hygiene close-out.** Piece 1 changes one file, `.dockerignore`. **Piece 2 is
REPORT ONLY — nothing else was excluded**, deliberately.

---

## HEADLINE

| | |
| --- | --- |
| Test files that shipped | **31**, not 29 — the count missed `server/utils/` |
| Server source files in the image | **62 → 31.** Half of what a recipient received was tests. |
| Build context | 88 files / 52.47 MB → **57 files / 52.13 MB** |
| Proof | Booted with **no source mounts**, empty volume: seeds itself, 200 · 200 · 401 |
| What else could be dropped | **Nothing recommended.** The two large items are both load-bearing. |

---

## 1. THE SET, ESTABLISHED BY SHAPE

The brief said 29. **It is 31**, and the two extra are the reason the sweep was asked for by shape
rather than by directory:

| where | count | |
| --- | ---: | --- |
| `server/src/**/*.test.js` | 29 | the known set |
| `server/utils/**/*.test.js` | **2** | ★ `imageUpload.test.js`, `isSafeAssetFilename.test.js` — the Dockerfile COPYs `server/utils/` too, and the count had only looked at `src/` |

**Everything else the brief asked about was looked for and is not there:**

- **`.spec.` files** — none anywhere under `server/`.
- **`__tests__` directories** — none anywhere under `server/`.
- **Test helpers under `server/utils/`** — the four non-test files there (`atomicWriteJson.js`,
  `imageUpload.js`, `isSafeAssetFilename.js`, `isValidId.js`) are all production-consumed.
- **Fixture files that exist only for tests** — none. All **31 non-test files** in the two copied
  directories were classified by resolving every relative import specifier to a repo path, and
  **every one has a production consumer.** There is no test-only support code hiding among the
  source.

**Two things were already excluded and are now NAMED as decisions** in the allow-list's own
"deliberately NOT re-included" section: `server/test/` (already named) and **`server/scripts/`**
(`dev-start.js`, `restart-dev.js` — excluded only because nothing re-included them, which made it an
accident rather than a decision; the image's `CMD` is `node src/index.js` directly).

### The exclusion could not break anything, established before it was made

Nothing in the image imports a test file — checked with a deliberately **loose** matcher (does any
non-test file so much as mention any test filename), which over-reports rather than under-reports,
and it found **zero**.

★ **A method note, because the first pass got it wrong.** The first classifier matched by BASENAME,
which counts every `index.js` in the repository as a consumer of every other. It returned a zero it
had not earned. Redone by import specifier with four controls — and one control came back
"unexpected": `server/src/index.js` reported a production consumer where I predicted none. That was
the harness being right and my expectation wrong — `server/scripts/dev-start.js` does
`await import('../src/index.js')`. The three other controls behaved.

## 2. THE CHANGE, AND WHY IT LIVES IN `.dockerignore`

Two lines, placed after the re-includes so they override them:

```
server/src/**/*.test.js
server/utils/**/*.test.js
```

**The rule belongs in the context filter, not the Dockerfile.** `.dockerignore` is the one place that
decides what the image contains; a `RUN find … -delete` would be a second such place and the two
would drift, which is the failure shape this repository has paid for repeatedly. It also keeps the
files out of the **context** rather than deleting them from a layer they have already entered.

**`**` matches zero segments as well as many** — verified rather than assumed, at both depths:
`server/src/buildIdentity.test.js` (beside its source, depth 0) and `server/src/auth/session.test.js`
and `server/utils/imageUpload.test.js` (depth 1) are all gone, and all 31 production files remain.

### ★ THE PROOF — no source mounts at all

| check | result |
| --- | --- |
| files under `/app/src` + `/app/utils` | **62 → 31** |
| of which `*.test.js` | **31 → 0** |
| any `*.test.js` anywhere in `/app` (outside `node_modules`) | **0** |
| container boots as | `node` |
| seeds from an **empty** volume | **10 tracks, 10 backgrounds, `sessions.sqlite` written** |
| `/api/health` · `/` · `/api/tracks` | **200 · 200 · 401** |
| logs | clean |

**And on his compose file:** rebuilt and restarted in place, 200 · 200 · 401, clean logs.
**Inside that container `find /app/src -name '*.test.js'` still reports 29 — and that is correct**:
his compose bind-mounts `./server/src` over `/app/src`, so he is looking at his own checkout. The
IMAGE no longer carries them; his working tree still does, as it must.

---

## 3. PIECE 2 — EVERYTHING THE IMAGE CONTAINS, AND WHETHER A PLAYER NEEDS IT

Measured inside the built image. **NOTHING HERE WAS EXCLUDED.** The allow-list was built deliberately
and each entry has a recorded reason; a second pass removing what "looks unnecessary" is how a boot
breaks in a way nobody can reproduce.

| what | size | does a person who only wants to run the game need it? |
| --- | ---: | --- |
| `/app/node_modules` | **64.3 MB** | **Yes** — but see the two entries below. |
| `/app/seeds` | **52.0 MB** | **Yes.** This is how a fresh install gets its ten tracks; proven by booting against an empty volume. |
| `/app/client-dist` | 3.3 MB | **Yes** — it is the game. |
| `/app/src` | 276 KB | **Yes** (31 files, after this change). |
| `/app/utils` | 20 KB | Yes. |
| `/shared` | 12 KB | Yes — one file, `nameLimits.mjs`. |
| `/app/package.json` | 4 KB | Yes. |
| | **~120 MB total** | |

### The two that account for 97% of it

**`/app/seeds/backgrounds` — 51.6 MB of the 52 MB.** The ten track background images. **Needed**:
`trackLoader.js` builds every background path as an API URL, so the server serves them and a
recipient with no backgrounds gets ten blank tracks. This is the single largest thing in the image
and it is the game's artwork.

**`node_modules`, and the two entries that are 85% of it:**

| package | size | why it is there |
| --- | ---: | --- |
| `better-sqlite3` | **27.5 MB** | The session store. Of it, `build/` is 17.4 MB and `deps/` 9.8 MB — the compiled artefacts and the SQLite amalgamation **source**, which is needed to COMPILE and not to run. |
| **`date-fns` 2.16.1** | **27.1 MB** | ★ **Not a declared dependency.** It arrives transitively through `better-sqlite3-session-store`. 27 MB of date library reached by a session store. |

★ **Both are reportable and neither is actioned here.** Pruning `better-sqlite3/deps` means deleting
inside a dependency after install, which is exactly the kind of "looks unnecessary" cut that breaks a
rebuild nobody can reproduce. `date-fns` is a real runtime edge of the dependency graph and removing
it means changing the session store. **His decision, not mine.**

### Two smaller observations

- **`/app/node_modules/@vitest` exists and is EMPTY** — an orphaned scope directory, 0 files, 4 KB.
  `npm install --omit=dev` did its job; nothing dev-only actually ships. Worth one line only because
  the directory name looks alarming in a listing and is not.
- **There is no `client/.dockerignore`**, so the named build context `client: ./client` sends the
  whole `client/` directory — `node_modules` included — to the daemon on every build. **Nothing but
  `dist/` is COPYed**, so this costs BUILD time and not image size, and the root `.dockerignore`
  cannot filter it because a named context is a separate context. Reported, not changed.

---

## 4. WHAT THIS PIECE DOES NOT COVER

- ★ **Nothing routes on `.dockerignore`, and nothing checks it.** `verify` ran three always-on guards
  for this change; `check-container-paths` declares `files: [Dockerfile, compose]` and does not read
  the ignore file at all, so the file that now decides what the image contains is held by no guard.
  It was run by hand here and passes. **This belongs on the "nothing holds it" list**, and building a
  rule for it was not in this brief's scope.
- **The image was not audited for secrets** beyond what IMAGE-NO-CREDENTIALS-1 established; that
  exclusion is unchanged and `server/data/**` still never enters a layer.
- **Byte-level image size was not compared before and after** — the removal is 346 KB against 120 MB,
  and the point of the change was never bytes.
