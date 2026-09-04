# IMAGE-DATE-FNS-1 — why `date-fns` is in the image

**Block:** PIECE J of the night chain of 2026-09-04. Branch `night/2026-09-04`, off master `6953722d`.

**Nothing was changed.** No dependency was added, removed or upgraded; no Dockerfile line was
written; no image was rebuilt. This piece establishes the facts and then stops, for the reason in §5.

**Every fact below says which method produced it.** The container is not the image: `docker-compose.yml`
binds `./server/src` over `/app/src`, so anything read from a running compose container is the
repository, not the image. Everything marked **[IMAGE]** came from
`docker run --rm --entrypoint sh seasonalraceclaude-server:latest`.

---

## 1. Which dependency pulls it

**[HOST, `npm ls`]** — `cd server && npm ls date-fns`:

```
racearena-server@0.1.0
`-- better-sqlite3-session-store@0.1.0
  `-- date-fns@2.16.1
```

**[HOST, `git ls-files "*package.json"`]** — `date-fns` appears in **no** `package.json` in the tree.
It is purely transitive, through exactly one path, and there is no second route to it.

`better-sqlite3-session-store` is on a runtime path: `server/package.json:19` declares it and
`server/src/auth/session.js:11` imports it as the express-session store.

---

## 2. Its actual size, measured inside the image

**[IMAGE]** — `du -sh` and `find | wc -l` inside `/app/node_modules`:

| | size | share of `node_modules` |
| --- | --- | --- |
| `date-fns` | **27.1 MB**, 4,654 files | **42%** |
| `better-sqlite3` | 27.5 MB | 43% |
| `bcrypt` | 1.2 MB | 2% |
| everything else | ~8.5 MB | 13% |
| **total `/app/node_modules`** | **64.3 MB** | |

**The recorded 27 MB is confirmed by measurement, not inherited.** Two packages are 85% of the
dependency tree, and one of them is a date library.

For scale: `docker images` reports the image at 264 MB content size, so `date-fns` is about a tenth
of the whole image and two fifths of its dependencies.

---

## 3. ★ Does anything on a runtime path use it — NO, AND NOT EVEN THE PACKAGE THAT DECLARES IT

**[IMAGE]** — `date-fns` is declared as the *only* entry in `better-sqlite3-session-store`'s
`dependencies`:

```json
{ "dependencies": { "date-fns": "2.16.1" } }
```

But grepping the installed package for it:

- `better-sqlite3-session-store/src/` — **no match.** The package's own source never imports it.
- anywhere in the package — **two** files: its `package.json`, and `test/index_test.js`.
- every other package in `/app/node_modules`, searched for both `require('date-fns` and
  `from 'date-fns` — **no match.**

**So 27.1 MB — two fifths of the image's dependency tree — is present because a package declares as a
production dependency something it only uses in its own tests.** Nothing in the image loads it: not
the session store, not the server, not any other package.

*(Not confirmed by a load test. A run that moves `date-fns` aside inside the image and re-imports the
session store and `server/src/app.js` was attempted three times and did not complete — the machine
was saturated by piece A's sweep and the container was starved. The static evidence above is
independent of it and is what the conclusion rests on; the load test would only have been
confirmatory. It is named here rather than quietly dropped.)*

**One thing the attempt did establish, [IMAGE]:** `rm` inside the image fails with *permission
denied* under the default `USER node`, because `node_modules` is deliberately root-owned and
world-readable (`server/Dockerfile`'s CONTAINER-NONROOT-1 block says so and gives the reason). Any
removal would therefore have to happen at **build** time, as root — not at runtime.

---

## 4. What removing it would require

| route | what it costs | allowed by this piece? |
| --- | --- | --- |
| an `overrides` entry in `server/package.json` pinning `date-fns` away | **changes a dependency declaration** | **NO** |
| replacing `better-sqlite3-session-store` with a store that does not declare it | **drops a package** | **NO** |
| upgrading the store (0.1.0 is the latest published) | **a version bump**, and there is nothing to bump to | **NO** |
| `RUN rm -rf node_modules/date-fns` in the Dockerfile after `npm install` | no manifest change — but see §5 | *technically permitted* |

The first three are the routes the piece forbids outright. Only the fourth is even available.

---

## 5. ★ THE JUDGEMENT: it was NOT removed, and this is the reasoning

The piece permits exclusion "if nothing on a runtime path needs it and it can be excluded without
changing behaviour". Nothing needs it. The exclusion was still not made, and this is a judgement
call rather than a rule being followed, so it is stated as one.

**A `RUN rm -rf` would make the image's `node_modules` disagree with the image's own manifest.**
`better-sqlite3-session-store` would go on declaring a dependency the image does not contain. Nothing
would notice, because nothing loads it — until a future version of that store actually used it, at
which point the container would fail at runtime, in production, with a module-not-found for a package
its own `package.json` says is installed.

**That is the shape this repository has been finding all week, one layer over.** It is the anonymous
compose volume that reported a successful rebuild while the container kept the vulnerable `qs`
(deleted 2026-09-04); it is the seeds mount whose absence made a delivery silently never arrive. A
tree that disagrees with its manifest and says nothing is the same defect wearing a smaller coat, and
trading 27 MB for a new instance of it is a poor trade to make unasked.

**What would make it safe** is a build step that removes the directory *and fails the build* if the
store's source ever imports `date-fns` — a guard, which is more than this piece asked for and which
belongs with a decision to take the 27 MB.

**NEEDS HIS WORD** if the 27 MB is worth having: whether to take the `rm` with a guard beside it, or
to accept the weight, or to replace the session store (which is the only route that removes it
honestly, and which this piece may not take).

---

## 6. Source hygiene

**No file in the repository was changed by this piece.** No image was rebuilt. Nothing was added,
removed or upgraded. `engine-reach --check` was not run because no path changed.

**Noticed and deliberately left:** `better-sqlite3` is 27.5 MB, marginally larger than `date-fns`,
and unlike it is genuinely load-bearing — it is the database. It is named so a reader comparing the
two numbers is not surprised; nothing about it is a finding.
