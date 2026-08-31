# CONTAINER-PATHS-1 — the COPY set and the mount set now have to agree, or say why not

**Built and green on the tree as it stands.** `scripts/check-container-paths.mjs` reads
`server/Dockerfile`'s COPY set and `docker-compose.yml`'s mount set and fails when they diverge
without the divergence being declared.

Three times a directory has been in one list and not the other, and each time it surfaced only when
something broke. This is the fourth thing that could have caught it — and it would have caught two
of the three.

---

## THE THREE FAILURES IT IS BUILT FROM

| directory | which way | what it cost | would this guard have caught it? |
|---|---|---|---|
| `utils/` | **in NEITHER list** | the container could not start at all — code the image ran imported helpers that were not in it | **NO.** See the blind spot below; this is the shape it cannot see. |
| `shared/` | mounted, never COPYable | the image failed to build once it was next built, months after the import landed | **YES**, from the moment it entered the mount list undeclared |
| `seeds/` | COPYed, not mounted | worse than a crash: the container ran the last image's seeds, `readManifest()` returned `{}`, and the whole redelivery mechanism was **silently inert** | **YES** |

The `seeds/` case is why the guard exists in this shape rather than as a note in a document. Nothing
crashed, nothing logged, and the mechanism the previous three pieces built could never have delivered
anything in the container. It looked exactly like working.

---

## THE DECISION RULE: DECLARED, NOT IDENTICAL

**A guard demanding the two lists be equal would be wrong on the tree it was written against.** It
would fail on `shared/` and `utils/` from its first run, and a guard that is wrong on day one is
silenced inside a week. The lists are not meant to be identical.

So the rule is: **every divergence must be DECLARED.** `DECLARED_DIVERGENCES` in the guard carries one
entry per accepted difference **with the reason it diverges**, keyed by direction so an entry cannot
silently cover the opposite case. Anything not on that list fails.

The mechanism is the sentence. Adding a divergence costs an explanation of why it is correct, and all
three failures above were undeclared and unexplained — each would have been caught by someone having
to write that sentence down.

**Seeded with the two that stand today, and they are not the same kind of thing:**

- **`shared/` — structural.** It sits at the repository root, above the build context (`./server`),
  and a Dockerfile cannot COPY from outside its context. `playerGroups.js` imports
  `../../../shared/nameLimits.mjs`, which from `/app/src/routes/` resolves to `/shared/`. Only a
  mount can supply it. Closing this would mean moving the build context, not editing a list.
- **`utils/` — history, and the entry says so.** `server/utils/` **is** inside the build context and
  **could** be COPYed. It is not, because the Dockerfile predates it and the mount was added when the
  missing helpers stopped the container starting. Declared rather than fixed, because this piece
  builds a guard and does not change what ships; closing it is a one-line Dockerfile change plus a
  rebuild, which is a separate decision.

A **stale** entry fails too: an allow-list carrying entries that describe nothing stops being a record
of decisions and becomes a list nobody reads.

---

## WHAT THE GUARD CANNOT SEE

**It compares two DECLARATIONS, so a directory missing from BOTH lists is invisible to it.**

That is not a small gap and it is not hypothetical: **`utils/` — the first of the three — was in
neither list**, and this guard would have said nothing about it. The failure shape it cannot catch is
precisely the one that has already happened once.

What it does catch is the other two shapes — COPYed-not-mounted and mounted-not-COPYed — and it makes
the third visible the moment anybody adds the directory to either side.

Answering the missing-from-both case needs a different instrument: one that reads what the code
**imports** and asks whether the container can reach it. That is `engine-reach`-shaped work on a
different graph and it is deliberately not this file.

Also outside it, stated rather than discovered later:

- **Whether a mount works.** It reads text; it never starts a container.
- **Files.** Only directory COPYs are compared — `COPY package.json ./` is a file, and a mounted file
  and a copied file are not the same kind of claim.
- `docker-compose.override.yml`, which is gitignored, local, and carries environment only.
- Any service but the first. This compose file has one.

**Loud-failure rule.** Zero COPY directories, zero mounts, a missing `build:` context or an unreadable
file all FAIL. A guard whose whole job is noticing an absence must not pass because it parsed nothing.

---

## SABOTAGE — BOTH DIRECTIONS RED, ON THE REAL FILES

Run against the real `docker-compose.yml`, not only the fixture, then restored byte-exact (`git diff`
empty afterwards).

**1 — remove a mount the Dockerfile COPYs** (`./server/data:/app/data`):

```
FAIL: check-container-paths — the COPY set and the mount set disagree, undeclared.
  server/data/ is COPYed by server/Dockerfile and NOT mounted by docker-compose.yml.
     The container will run the copy baked into the last image build, and a change to
     server/data/ will not reach it until somebody rebuilds — silently.
EXIT=1
```

**2 — add an undeclared divergence** (`./server/scripts:/app/scripts`):

```
FAIL: check-container-paths — the COPY set and the mount set disagree, undeclared.
  server/scripts/ is mounted by docker-compose.yml and NOT COPYed by server/Dockerfile.
     The image is not self-contained: it runs here because the mount supplies the directory,
     and would not run anywhere the repository is not checked out beside it.
EXIT=1
```

**3 — the tree as it stands:**

```
check-container-paths: 3 COPYed dir(s), 5 host mount(s), 2 declared divergence(s) (shared, utils);
0 undeclared.
EXIT=0
```

Ten fixture tests cover the same ground plus the loud-failure cases and the stale-entry case:
10/10 green.

---

## WIRING

Added to the `.githooks/pre-commit` fast-guard list beside the others — no second place invented — and
**auto-registered with `verify`** through its `--declare` block, the same way `check-seed-versions`
is. `npm run verify --dry` lists it by name and routes it off `server/Dockerfile` and
`docker-compose.yml`, so a change to either selects it without anything being added to a table.

---

## CHECKS

**`engine-reach --check` selected nothing** — all three changed paths outside the hull. The sixth
consecutive time across this strand.

**All four fingerprints run by hand:**

| role | measured | verdict |
|---|---|---|
| world | `bc01b74fd4f3cfc8` | **UNMOVED** (`--check` confirmed) |
| world-off | `daf78ff18eca83c6` | **UNMOVED** (`--check` confirmed) |
| camera | `6dfded25dd656977` | **UNMOVED** |
| render | `4819e3b0f8e61c23` | **UNMOVED** |

Nothing moved and **nothing was minted** — there is no minting permission here. This piece adds a
guard and one line to a hook; it ships no behaviour.

Every other guard, including the language guard: green.

---

## CONFORMITY

- Guard reads both lists at the source and fails on undeclared divergence, not on inequality.
- Allow-list seeded with `shared/` and `utils/` as they stand, each carrying its reason, and the two
  reasons are distinguished rather than blurred.
- Hooked into the existing fast-guard list; auto-registered with verify; no second place invented.
- Both named sabotages run against the real files and both went red; the tree as it stands is green;
  files restored byte-exact.
- The blind spot stated plainly, including that it is the shape of the failure that has already
  happened.
- `engine-reach --check` run; all four fingerprints run by hand and unmoved; nothing minted.

## PROPOSALS

**P1 — the missing-from-both case wants the import graph, and the material is already here.**
`scripts/lib/dataReach.mjs` already walks an import closure to answer a related question for the
engine. The same walk from `server/src/index.js`, asking whether each resolved path lands inside a
COPYed or mounted directory, would close the one shape this guard cannot see. Not built here because
it is a different instrument, not a bigger version of this one.

**P2 (mine) — `utils/` is declared, and declaring it is not the same as being happy about it.** It is
one `COPY utils/ ./utils/` line away from not being a divergence at all, and closing it would make
the image measurably more self-contained. It was left alone because this piece was scoped to build a
guard rather than change what ships — but it is the cheapest of the deployment questions the next
piece surveys, and the guard will now notice if somebody closes it and forgets the allow-list entry.
