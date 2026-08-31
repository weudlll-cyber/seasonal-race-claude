# IMAGE-NO-CREDENTIALS-1 — the runtime store never enters the build, and the COPY it came through was serving nothing

**Nothing leaked.** No image has ever been published from this repository. This closes the hole
before the first one is — which piece 2 brought materially closer by making a published image a
useful thing to have.

**Proven from inside a freshly built image: no credential file is present, anywhere on its
filesystem.**

---

## WHAT `COPY data/ ./data/` WAS ACTUALLY FOR — established before anything was excluded

The brief asked this first, and the answer decided the shape of the fix.

**On a clean clone it delivers exactly one file.** `server/data/**` is gitignored with a single
exception, so the entire tracked content of that directory is:

```
$ git ls-files server/data
server/data/README.md
```

— a developer note explaining that the directory is a runtime store. Inside a container nobody reads
it.

**On his machine it delivers the whole runtime store**, because `server/.dockerignore` contained one
line (`node_modules`):

```
users.json          users.json.bak-20260801-234105     sessions.sqlite
setup-complete.json recover-admin-audit.log            .seed-versions.json
+ the seeded tracks, backgrounds, brands, player-groups, and 223 track backups
```

**And the directories it appears to provide are created at runtime regardless.** Every consumer under
the data root makes its own: `seedRuntime.js` and `seedDelivery.js` both `mkdirSync(..., { recursive:
true })`, and `tracks.js`, `brands.js`, `playerGroups.js`, `racers.js` and `surfaceClasses.js` each
create their own directory at import. Nothing depends on the directory existing in the image.

**So the line serves nothing.** It ships a README nobody reads, and provides directories that are
created anyway. That is not an inference from the code alone — an image built without it was booted
against an empty volume and seeded itself correctly, which is the evidence section below.

---

## WHAT THE HOLE ACTUALLY COST, IN TWO PARTS

Worth stating precisely, because "credentials in an image" understates the second half.

**1. The builder's password hashes travel with the image.** `users.json` is the account store. An
image built on this machine carried it, and anyone receiving that image would hold it.

**2. The recipient could never sign in — and nothing would tell them why.** `setup-complete.json`
came along too. `GET /api/auth/setup-needed` answers `false` when that marker exists, and `POST
/api/auth/setup` returns **409 `setup already complete`**. So a stranger's fresh install would refuse
to create an admin, on an install that has no accounts they can use, with an error message that
describes a state they are not in. That is the worse half of the two.

---

## THE FIX, AND WHY IT IS ONE DECISION RATHER THAN A CHOICE BETWEEN TWO

The brief offered excluding the files or removing the line as alternatives. **They turn out not to be
independent**: a directory excluded from the build context cannot be `COPY`ed — the build fails on a
missing source — so excluding `data/` forces the COPY to go with it. One decision, two edits:

- **`server/.dockerignore` gains `data/`.** This is the load-bearing half. It keeps the runtime store
  out of the **build context** entirely, so those files are never even transmitted to the Docker
  daemon, let alone written into a layer. An exclusion list naming the credential files individually
  was rejected for the reason this repository keeps paying for: the next credential file added would
  not be on the list, and nobody would notice.
- **`server/Dockerfile` loses `COPY data/ ./data/`**, with a comment saying where the reasoning lives.

**A runtime store belongs in a volume, never in a layer.** That is the rule, and it is now enforced
by the directory being unreachable from the build rather than by anyone remembering it.

### The guard caught it and asked the right question

`check-container-paths` failed immediately: `data/` became mounted-but-not-COPYed, an undeclared
divergence. That is the guard working — it demanded either the COPY back or a written reason. The
reason is now the third entry in `DECLARED_DIVERGENCES`, and it says plainly that this divergence is
**correct and permanent**, unlike `utils/` which is history and unlike `shared/` which is structural.
Three declared divergences now, each of a different kind.

---

## THE EVIDENCE

**Nothing sensitive is in the image**, searched rather than reasoned:

```
--- /app ---
client-dist  node_modules  package-lock.json  package.json  seeds  src
--- /app/data ---
ls: /app/data: No such file or directory
--- searching the WHOLE image filesystem ---
  ABSENT   users.json
  ABSENT   sessions.sqlite
  ABSENT   setup-complete.json
  ABSENT   recover-admin-audit.log
```

`/app/data` does not exist in the image at all, and a `find` across the entire filesystem returns
nothing for any of the four names.

**His install is unaffected** — the bind mount supplies the store as it always did:

```
[client] serving the built client from /app/client-dist
RaceArena server running on port 4000
  GET /                -> 200
  GET /api/health      -> 200
  GET /api/tracks      -> 401
```

**And a FRESH install still works, which is the regression that mattered.** Previously an empty named
volume was initialised from the image's `/app/data`; there is now nothing to initialise from. A
container on a brand-new volume:

```
  tracks: 10  backgrounds: 10
  users.json present? NO
  setup marker? NO
```

Ten tracks and ten backgrounds seeded from `/app/seeds`, **and no setup marker** — so the first admin
can be created. That is the second half of the defect closed, demonstrated rather than argued.

---

## CHECKS

**`engine-reach --check` selected nothing** — `server/Dockerfile`, `server/.dockerignore` and the
guard script, all outside the hull. The seventh consecutive time.

**All four fingerprints run by hand and all four UNMOVED** (`bc01b74fd4f3cfc8`, `daf78ff18eca83c6`,
`6dfded25dd656977`, `4819e3b0f8e61c23`). **Nothing minted.** Nothing in this piece is reachable by any
instrument; they were run because the chain says to.

**The container-paths guard's own suite went red first, and that was correct of it.** Its fixture
declared the repository's shape as `src`, `data`, `seeds` all COPYed — true when it was written,
false the moment `data` stopped being copied — so the new `data` declaration read as a STALE entry
describing nothing, which is a failure the guard deliberately raises. Three tests failed on it. The
fixture now names the real shape (`src` and `seeds` COPYed; `utils`, `shared` and `data` mounted
only) and the suite is **12/12**. Recorded rather than quietly fixed, because a test fixture that
claims to mirror the tree has to be corrected with the tree or it stops meaning anything.

**No client suite and no browser gate** — no file under `client/` is touched.

## CONFORMITY

- What the COPY was for was established BEFORE anything was excluded, from the tracked set and from a
  booted image, not assumed.
- The finding that the line serves nothing is stated, and removing it was taken deliberately together
  with the exclusion rather than silently instead of it — they are not separable.
- Proven by building the image and searching it from inside.
- The divergence the change creates is declared with its reason; the guard is green with three
  entries.
- All four fingerprints run by hand and unmoved; nothing minted.

## PROPOSALS

**P1 — the same question is worth asking of `seeds/`, and the answer there is the opposite.**
`COPY seeds/` is load-bearing: it is how a fresh install gets its ten tracks, proven above. It stays,
and it is worth writing down that the two directories look alike and are opposite, so nobody
generalises tonight's change into removing both.

**P2 (mine) — `server/data/README.md` is now the only tracked file under a directory the build cannot
see.** It exists to explain the runtime store to a developer reading the repository, which it still
does. Worth one line in it noting that the directory is excluded from the image, so the next person
wondering why `/app/data` is empty in a container finds the answer where they are already looking.
