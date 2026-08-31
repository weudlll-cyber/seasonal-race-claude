# SEED-REDELIVERY-1 — the overwrite rule, the version that decides it, and the guard that stops us forgetting

**Built, and the boot on his own install did nothing at all** — which is the acceptance this piece
was given and the thing the report has to show rather than assert.

Third and last of three. SEED-SNAPSHOT-INVENTORY-1 said what his install held; SEED-SNAPSHOT-1 made
it the shipped seeds; this delivers a shipped record again when — and only when — we mean it.

**Nothing is redelivered by this piece landing.** Today's snapshot is version one for everyone.

---

## THE TWO DESIGN QUESTIONS, ANSWERED BEFORE ANYTHING WAS BUILT

### Where the version lives: a SIDECAR MANIFEST, one form for all five types

`server/seeds/versions.json` on the shipped side, `DATA_ROOT/.seed-versions.json` on the runtime
side. Not a field inside the record. Four reasons, in the order they carry weight:

**1. A field inside a record is WRITABLE BY AN OPERATOR EDIT, and that is the disqualifying one.**
`PUT /api/tracks/:id` builds the stored record as `{ ...existing, ...rest }` where `rest` is the
request body — so any field the body carries lands, unvalidated. The handler re-pins `id`,
`isDefault`, `backgroundImageFile` and `createdAt` by name **precisely because that spread protects
nothing it is not told to protect**, and `/:id/export-seed` hands the whole record out, so a version
field would travel through every export and import. A version an operator can move by accident is
the one scheme the brief ruled out. Out here, nothing reachable through the app writes it.

**2. Binaries have no inside.** A background jpg and a logo png cannot carry a field, so those two
types need a sidecar no matter what tracks do. **That does argue for one form everywhere**: two
mechanisms plus a rule about which applies is a third thing to get wrong, and the guard would have
to know both.

**3. The UNIT is what gets versioned, not the file.** He set the scope as tracks *with* their
backgrounds and brands *with* their logos. A field inside `garden-path.json` has nowhere to say that
and nowhere to put the background's half of it. The manifest says it in one line per unit.

**4. One place to raise, one place to check.** A human redelivering a record edits one file; the
guard reads one file. Twelve versions in twelve records is twelve places to forget.

The runtime side is a dotfile in the data root for the same reason: no route reads or writes it, and
it is not a record any UI lists.

### Where the warning lives: the FIRST SCREEN BEHIND SIGN-IN, not the sign-in screen

Server-side state (`DATA_ROOT/.seed-notices.json`), an authenticated `GET /api/seed-notices`, and a
banner on **SetupScreen** cleared by an authenticated `POST /api/seed-notices/dismiss`.

**Why not a boot log line:** the requirement is that it persists until dismissed. A console line at
boot is gone before an operator opens the app, and it is the "warning nobody sees" the brief names.

**Why not browser storage:** the thing that was overwritten is the INSTALL, so the install has to be
what remembers. A `localStorage` flag re-warns on the second machine and goes silent forever after
one cache clear on the first — and this repository already carries a memory of stored client values
silently shadowing what the code intends.

**Why not the sign-in screen, which the brief named as the one place every operator passes.** Two
reasons, and the first is the decisive one:

- **Dismissal has to be an act by a known person.** On a pre-auth screen anyone who can reach the
  port could clear a warning the operator never saw. That is the same failure the requirement exists
  to prevent, wearing a different hat — and it would be worse than the boot-log version because it
  would look like it had worked.
- **It would publish the record names unauthenticated.** Mild, but it is a real widening of an
  app that is otherwise deny-by-default.

**And the premise still holds for the screen chosen.** `/` redirects to `/setup`, `/setup` is behind
`ProtectedRoute`, and every API call is behind `requireAuth` — there is no way to use RaceArena
without arriving on this screen signed in. "Every operator passes here" is as true of it as of the
sign-in screen, and here we know who passed.

The banner renders **nothing** when nothing is pending, and fails silent if the store cannot be read:
an operator trying to start a race must not be shown an error about a warning system.

---

## THE RULE AS BUILT

`server/src/seedDelivery.js`. Per unit in the manifest, exactly one of four things happens:

| shipped version | recorded on this install | what happens |
|---|---|---|
| absent, or not an integer | anything | **nothing at all** — silence is the safe default |
| any | **none recorded** | **ADOPT** — copy only files that are MISSING, record the version, **warn about nothing** |
| **higher** | recorded | **REDELIVER** — overwrite every file of the unit, record it, raise one notice naming the record |
| equal or lower | recorded | copy only MISSING files (a deleted background comes back), touch nothing else |

**Delivered WHOLE.** The redeliver branch copies every file of the unit unconditionally — laps,
default racer, winners, max racers, the background, the logo. There is no field-level merge anywhere
in the file and no exception for any field. That is the simple rule he chose over the correct-in-
every-case one.

**The ADOPT branch is why nothing is redelivered today, and why an upgrade is safe.** It cannot tell
a fresh install from one that predates versioning, so it refuses to overwrite in either case: it
copies only what is missing, writes down the version, and raises no notice. An install adopting the
current shipment has not had anything replaced, so it is owed no warning.

**A record with no unit in the manifest is never a target — structurally.** The loop walks the
manifest. It does not enumerate the operator's records and filter them; it never visits one. His four
runtime-only test items and every operator's own creations are outside it by construction, and a test
asserts it against the real shipped manifest.

**Ordering.** Delivery must finish before any router builds its in-memory map. All three seeding
routers import `seedDelivery.js`, so `deliverSeedsOnce()` sits at each of their existing seeding
lines: the first to load does all five types and the other two are no-ops.

---

## WHAT A BOOT ON HIS INSTALL DID: NOTHING

Measured, not argued. Every file in the five runtime type directories was hashed (SHA-256) and
stamped before and after booting the real server against his real `DATA_ROOT`.

```
booted, /api/health -> 200 after 893 ms

DIFF of his runtime store, before vs after:
32c32
<  ".seed-versions.json": "absent",
---
>  ".seed-versions.json": "PRESENT",
```

**That is the entire difference.** All 31 records — 13 backgrounds, 10 tracks, 2 brands, 2 logos, 3
player groups, 1 orphan set included — are byte-identical with unchanged mtimes. Not one was
overwritten. The one new file adopts all twelve units at version 1:

```json
{ "tracks/city-circuit": 1, "tracks/dirt-oval": 1, "tracks/garden-path": 1, ... 12 in total }
```

**`.seed-notices.json` was not created**, because there was nothing to warn about. His Fantasa brand,
his 40-name group and his German-named group were not visited, and his garden-path surface classes —
the edit this whole strand exists to protect — are untouched.

**One deployment note, found rather than assumed.** The running container's image predates the
manifest (`server/seeds/` is COPYed at build time, not mounted), so inside it `readManifest()` returns
`{}` and delivery is a complete no-op. That is the fail-safe direction, and it is why this proof was
run natively against the working tree, which is what the shipped code actually is.

---

## THE GUARD, AND WHAT IT CANNOT SEE

`scripts/check-seed-versions.mjs`, hooked into the pre-commit fast-guard list beside the other
document guards and auto-registered with `npm run verify` through its `--declare` block. It fails on
three things:

1. **A seed file's content changed against the base commit and its unit's version did not.** The
   change would ship and reach no existing install — the exact failure this strand exists to fix,
   reintroduced one level up.
2. **A seed file in no unit, or in two.** A file outside the manifest is outside the version system,
   so rule 1 could never see it; the hole would be invisible rather than reported.
3. **A unit naming a file that does not exist.** Delivery would ship half a record silently.

It does **not** raise the version. Deciding to redeliver means deciding an operator should lose their
copy, and a script must not make that call.

### The honest limit, stated plainly

**It is a content check.** It compares seed bytes against a base commit, so the case it is blind to
is: **a redelivery that needs to happen for a reason outside the seed file's own bytes.**

- a client default or engine change that makes an unchanged stored record behave differently, where
  the fix is to push the shipped record again;
- a background or logo that should be redelivered because the RENDERER changed, not the image;
- a record correct on its own terms but wrong beside a record that did change.

In every one of those the seed bytes are identical, this guard is silent and correct to be, and
**noticing is still on us.** It closes "changed it and forgot". It cannot close "should have changed
it and did not". Also outside it: whether the version was raised by the right *amount* (any increase
redelivers), whether the change is any good, and the runtime side entirely — it reads no install's
recorded versions.

---

## SABOTAGE — BOTH DIRECTIONS WENT RED

A test that cannot go red is not a test, so both were run against deliberately broken source.

**A — remove the version comparison from the mechanism.** Replacing `if (shipped > recorded)` with
`if (true)` so every unit overwrites:

```
× leaves an edited record alone when the version is EQUAL
× leaves an edited record alone when the shipped version is LOWER
× is idempotent — a second boot at the same version changes nothing
× restores a file the install lost, without touching the version or warning
Tests  4 failed | 11 passed (15)
```

The overwrite fires when it must not, and the tests say so. Restored; 15/15 green.

**B — remove the guard's version check.** Making the `stale` branch unreachable:

```
× FAILS when a seed file changed and the version did not
× FAILS the same way when the BINARY half changed
Tests  2 failed | 7 passed (9)
```

A version-less content change passes, and the tests say so. Restored; 9/9 green.

---

## CHECKS

**`engine-reach --check` selected NOTHING — the fourth time running for seed paths**, now with the
source files too. All ten changed paths came back `outside the hull`. So the four fingerprints were
run by hand, for the reason SEED-SNAPSHOT-1 records: a JSON is never an import edge, and routing has
already skipped all four for a seed edit that moved every one of them.

| role | measured | verdict |
|---|---|---|
| world | `bc01b74fd4f3cfc8` | **UNMOVED** (`--check` confirmed) |
| world-off | `daf78ff18eca83c6` | **UNMOVED** (`--check` confirmed) |
| camera | `6dfded25dd656977` | **UNMOVED** |
| render | `4819e3b0f8e61c23` | **UNMOVED** |

Nothing moved, **nothing was minted, and there was no permission to mint.** This piece adds a version
manifest and delivery code; it changes no geometry, no racer default and no surface class, and the
boot proof above shows the runtime records the camera and render instruments read are byte-identical.

**Suites.** Server: 693 tests in 28 files, all pass — including `routePolicyDrift`, which now knows
the new router and classifies `POST /api/seed-notices/dismiss` as operator+ (every operator is owed
the warning, so admin-gating it would leave an operator-only install unable to clear its own banner).
Lint: green.

**The client suite caught a real defect I had introduced, and it is worth recording rather than
quietly fixing.** The first full run came back `3 failed | 226 passed` with **all 4,319 tests
passing** — three whole FILES failing, none of their tests. The reason:

```
TEARDOWN-INFLIGHT-1: 11 network call(s) from this file, which screen tests must not make
```

Mounting the banner on SetupScreen gave three screen test files a live request to
`/api/seed-notices`, which TEARDOWN-INFLIGHT-1 forbids — that guard exists because an unstubbed
screen-test fetch once outlived its test and turned a CI run red with every test passing. **The
banner was the new offender and the guard named it immediately**, which is the guard working.

Fixed the way that mechanism's own header prescribes: **replace the module, not `fetch`.**
`services/seedNoticeApi.js` is now mocked in those three files exactly as `useServerTracks.js`
already was, so the effect makes no request at all rather than making one that is stubbed. Stubbing
`fetch` was not an option for the same reason recorded there — a stub that has to succeed writes
state the tests turn on. Re-run: those three files 65/65, and the full suite green.

**Language guard: green.** It covers `server/` — seeds included — and `client/`, so both the shipped
records and every operator-facing string in the banner are inside its scope. All warning text is
English.

---

## WHAT WAS NOT BUILT

No restore. No backup copy of the replaced record. No field-by-field keep-mine. He considered each
and chose the small form; nothing here quietly grew past it.

**And the small form did not turn out to be untenable.** The one place it strains is worth naming
without acting on it: an operator who edits a shipped track and later receives a redelivery loses that
work with no way back, and the warning tells them it happened rather than what it was. That is the
cost he chose knowingly — a rule an operator can understand — and it is recorded here as a known
consequence, not as a request to change it.

---

## CONFORMITY

- Delivery walks the manifest, so a record with no seed of that name is never touched or deleted.
- Delivered whole; no field-level merge exists anywhere in the mechanism.
- The warning names the record and persists in the install until an authenticated dismissal.
- All five seeded types under one rule; tracks carry their backgrounds and brands their logos.
- Every existing record starts at version 1; a boot on his install overwrote nothing and warned about
  nothing, shown by a before/after hash of the whole runtime store.
- Guard hooked into the existing pre-commit guard list and verify routing; no second place invented.
- Both sabotage directions run and both went red.
- `engine-reach --check` run; all four fingerprints run by hand and unmoved; nothing minted.

## PROPOSALS

**P1 — the guard's blind spot wants a habit, not another script.** "This engine change means the
shipped records should go out again" is a judgement no content check can make. The cheap version is a
line in the ship ceremony asking whether a change makes an already-delivered record wrong; the
expensive version is a second version number for the *shape* of a record, which is a much larger
thing and should not be built on a hunch.

**P2 (mine) — one dismissal clears everything, and that is right until it is not.** With twelve units
it is the correct small form. If a redelivery ever spans many records at once, an operator could
dismiss a banner having read only the first line of it. Worth watching; not worth solving now.
