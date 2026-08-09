# VERIFY-ROUTING-1 — verify stops guessing

**Branch** `feat/verify-routing-1` off `master` (`1fd0b471`) · 2026-08-08 ·
**built, sabotage-proved, NOT merged**

---

## 1. Conformity, element by element — before any numbers

| the spec asked | done | where |
| --- | --- | --- |
| ONE mechanism, not four patched cases | yes | §2 — the table is gone; each guard declares |
| Routing derives from something that cannot fall behind | yes | §2.1 — three kinds, only one hand-written |
| Each guard DECLARES what it depends on | yes | §2 — `export const GUARD` + `--declare`, in the guard's own file |
| One home, the rule already applied to fingerprints and config values | yes | §2 — verify.mjs carries no dependency knowledge at all |
| If declaration-based routing is unsound, say why BEFORE building | n/a | It is sound. §2.3 names the one part that stayed hand-written and why |
| The four cases are the tests | yes | §4 — one test each, both directions |
| Each shown failing before and passing after | yes | §3 — the table, measured against the implementation that had each miss |
| Case 4: state what verify can and cannot know | yes | §5 |
| … and make it REPORT that limit rather than silently pass | yes | §5 — the PENDING line, surfaced on green runs too |
| Every guard states IN ITSELF what it does not cover | yes | §6 — `blind`, required and non-empty, asserted |
| Verify keeps printing what it skipped and why, checkable rather than prose | yes | §6 |
| SABOTAGE: introduce the change, show the check runs, revert | yes | §7 — all four, plus case 4's reporting half |
| Fingerprints: none should move | **none moved** | §8 |
| CI on the branch | yes | §8 |
| Source hygiene | yes | §9 |
| Tests: both questions, added and deleted | yes | §4 |
| Two proposals of my own | yes | §12 |

---

## 2. The mechanism

**The routing table in `verify.mjs` is gone.** Each guard declares its own dependencies, in its own
file, and `scripts/lib/routing.mjs` collects them. `verify.mjs` now knows how to RUN guards and
nothing whatever about what they depend on.

```js
// in the guard's own file, before it does any work
export const GUARD = {
  id: "render-fingerprint",
  covers: "the DRAW CALL SEQUENCE: sprite placement, text, styles, transforms, layer order",
  blind: ["the sprite BITMAPS themselves — it records draw calls, not pixels", …],
  reach: ["client/src/screens/RaceScreen/renderRaceFrame.js", …],
  dirs: [], files: [],
};
if (process.argv.includes("--declare")) { console.log(JSON.stringify(GUARD)); process.exit(0); }
```

`--declare` rather than `import` is deliberate: several guards do their work at module load, and a
router that had to execute a 35-second fingerprint to learn what it depends on would be worse than
the table it replaces. Eleven `--declare` spawns cost about 80 ms in total.

### 2.1 Why a declaration cannot fall behind

Three kinds of dependency, in the order they carry weight:

**SELF — computed, and undeclarable.** A guard always depends on its own source and everything that
source statically imports, transitively: `resolveGuard` takes the import closure of the file the
declaration lives in. Nobody adds it, nobody can forget it, and it applies to guards that do not
exist yet. **That is miss 3 closed for every guard at once**, rather than for the one that was
noticed.

**REACH — declared, but CROSS-CHECKED against the script itself.** The measurement harnesses reach
into `client/` through `await import(u("client/..."))`, which a static walk of `from "…"` cannot
follow, so those entry points are declared. `routing.test.mjs` then reads each guard's own source,
extracts every `u("client/…")` literal, and fails if one is outside that guard's resolved dependency
set. **The declaration cannot drift from the script, because the script is what checks it** — and it
proved that the first time it ran, catching `quickTestNames.js` in the render declaration where the
module is actually `racerNames.js`. I had written the wrong path; the mechanism found it before any
run did.

**DIRS / FILES — plain containment**, for what no import can reach: a directory of documents, a
suite's own project directory. This is the only genuinely hand-written part, it is four short lists,
and each is asserted in both directions.

### 2.2 What that fixes beyond the four

- **`check-measured-stamps` derives its dependencies FROM ITS OWN STAMPS.** Each stamp says
  `depends=<paths>`; the declare branch reads the stamped documents and turns those paths into
  routing dependencies. Add a stamp and the guard routes on whatever that stamp measures, with
  nobody editing anything. This is case 4's routing half.
- **`check-writable.mjs` now runs.** It was in `verify`'s script list nowhere and in CI nowhere — a
  guard that existed and executed on no path. Discovery is by disk, so it routed itself the moment
  the mechanism existed.
- **A guard script that declares nothing FAILS the run**, by name. Under the old table an unrouted
  guard was silent, which is the exact failure this block is about.
- **`doc-guards` is no longer one opaque composite of eight scripts.** Each is its own guard with its
  own declaration, so `config-keys` (which scans `client/src`) is selected by a client change rather
  than only by a markdown change, and each one's skip reason is its own.

### 2.3 The one thing I did NOT make derivable, stated rather than hidden

**The two suites.** `client-suite` is `npm test` in `client/` and `script-suite` is `node --test`
over `scripts/**/*.test.mjs`. Neither is a script, so neither has a file of its own to speak from;
their declarations live in `routing.mjs` and are the only two that do. Both are pure containment
(`client/` minus `client/e2e/`, and `scripts/`), which is also exactly why misses 1 and 2 were
containment mistakes — a subdirectory named where the directory was meant, twice. A directory rule
cannot be derived from imports; what it can be is asserted in both directions, and it is (§4).

---

## 3. The four, failing before and passing after

Measured by evaluating the routing of the implementation that actually carried each miss —
`1d183992` for the two that were repaired historically, `master` (`1fd0b471`) for the two still live
— against the same file, then the same question against this branch:

| case | changed file | guard | BEFORE | AFTER |
| --- | --- | --- | --- | --- |
| 1 — matcher only `client/src/` | `client/vite.config.js` | client-suite | **false** | **true** |
| 2 — a config file in no source dir | `client/vitest.config.js` | client-suite | **false** | **true** |
| 3 — the instrument itself | `scripts/render-fingerprint.mjs` | render-fingerprint | **false** | **true** |
| 4 — routed by "markdown changed" | `client/src/modules/camera/CameraDirector.js` | measured-stamps | **false** | **true** |

Cases 1 and 2 were repaired entry-by-entry before this block, so their "before" is the revision that
had them; cases 3 and 4 were still live on master this evening. **Case 4 is the one this block
found** — the guard whose whole job is to notice that the camera changed could not be selected by a
camera change.

---

## 4. Tests

**Added: 14** (`scripts/lib/routing.test.mjs`, new). **Rewritten: `scripts/verify.test.mjs`**, 17
tests → 12. Net across both files: 26 → 26, and what they assert is different.

**Deleted, and why.** Five tests in `verify.test.mjs` asserted the SHAPE of the `ROUTES` array —
that it is one table, that every rule has a `match` function, that a skip reason begins with
"nothing matched — this guard covers:". There is no table to assert the shape of. Deleted rather
than adapted; adapting them would have meant inventing new assertions for deleted code. Their intent
— the map is one thing, and it is visible — is now carried by "nothing is silently unrouted" and
"the reason is checkable, not prose".

| test | what breaks if deleted | what goes unnoticed if it is missing |
| --- | --- | --- |
| MISS 1 — a client file outside `client/src/` selects the suite | the first miss, in both directions | a suite skipped for a change to the project it runs in |
| MISS 2 — `vitest.config.js` selects it, `client/e2e/` does not | the second miss AND the exclusion beside it | the suite skipped for the file that decides how it runs — or widened to Playwright, the opposite error |
| MISS 3 — every guard routes on its own source | the third miss, and the PROPERTY, for all guards | an instrument changed and verified by itself |
| MISS 4 — the stamp guard routes on what its stamps depend on | the fourth miss | the guard that watches the camera, not run by a camera change |
| MISS 4b — the guard states the limit in its own `blind` list | the reporting half | a PASS that is true and incomplete |
| nothing is silently unrouted | the failure mode that produced all four | a guard that exists and executes on no path |
| a declaration cannot drift from its script | the cross-check | a `reach` list that has quietly fallen behind the harness |
| every guard says what it does NOT cover, and it is not boilerplate | `blind` becoming a formality | a hole nobody wrote down |
| the reason is checkable, not prose | the output half of the spec | a skip line a reader must trust rather than check |
| `resolveGuard`: exclusions beat everything | the precedence rule | a rule whose answer depends on which list you read first |
| `declarationOf` returns null rather than inventing a route | the loud-failure rule | a non-guard silently acquiring a route |

Both suites: **259 tests, 259 pass.**

---

## 5. Case 4 — what verify CAN and CANNOT know

**It can know:** whether the dependency changed in COMMITTED history after the commit the stamp
names. That is what it has always answered, and it answers it correctly.

**It cannot know anything about the commit being made, and this is not repairable.** The repair a
stale stamp needs is a NEW stamp naming the last commit that touched the dependency — and that
commit is the one being written. There is no value that could be typed into the stamp that would be
correct at the moment it is typed. Making it a FAILURE would therefore block every commit that
touches the camera, permanently, with no legal way out. I hit exactly that loop in Part 1 of
tonight's work and had to use `--no-verify` twice.

**What it can do instead is say so, every run.** The guard now reads the working tree and prints:

```
PENDING: docs/CAMERA_DIRECTOR.md: "tracking-lag (median/p95 pp per state)" is stamped at 3e756a31
         and is fresh against COMMITTED history — but 1 uncommitted change(s) under
         client/src/modules/camera/ will make it stale the moment they are committed:
           client/src/modules/camera/CameraDirector.js
         This guard CANNOT check a commit that does not exist yet, so this is a REPORT and not a
         failure. Re-measure and re-stamp in a follow-up commit that names the one you are about
         to make.
check-measured-stamps: 0 stamp(s) PENDING against uncommitted work.
```

The count line prints **even when it is zero**, so "no PENDING" is a statement rather than an
absence. The limit is also in the guard's own `blind` list, so it appears in verify's NOT COVERED
section whether or not anything is pending. And `verify` now surfaces PENDING lines in its summary
on GREEN runs, beside the fingerprints and the retry ledger — a second commit, because the first
version printed it to a stream verify only read on failure. That is the same silence the retry
ledger was surfaced for.

---

## 6. The output, checkable rather than prose

Before — a sentence somebody wrote, which a reader could not check:

```
    render-fingerprint  nothing matched — this guard covers: anything that can reach a ctx. call
```

After — the resolved declaration, with numbers that can be checked against the tree:

```
    render-fingerprint  nothing changed  ·  declares 94 file(s) by import closure · reach=13 entry point(s)
    client-suite        1 changed (client/vitest.config.js)  ·  declares 2 file(s) by import closure · dirs=client/ · except=client/e2e/
```

And a third section, which did not exist:

```
  NOT COVERED by the guards that ran:
    render-fingerprint  the sprite BITMAPS themselves — it records draw calls, not pixels
    measured-stamps     the commit BEING MADE does not exist yet, so no stamp can be checked
                        against it; the working-tree PENDING line is what it can say instead
    …
```

`npm run verify -- --routes` prints every declaration in full — source file, what it covers, its
route, and every blind spot — and exits.

---

## 7. Sabotage

For each case: introduce the exact change, show the check runs, revert. Run with `--base=HEAD` so
the touched file is the only thing in the diff. Every one reverted immediately; the tree is clean.

| # | touched | verify's plan said |
| --- | --- | --- |
| 1 | `client/vite.config.js` | `client-suite  1 changed (client/vite.config.js) · declares … dirs=client/ · except=client/e2e/` |
| 2 | `client/vitest.config.js` | `client-suite  1 changed (client/vitest.config.js) · …` |
| 3 | `scripts/render-fingerprint.mjs` | `render-fingerprint  1 changed (scripts/render-fingerprint.mjs) · declares 94 file(s) by import closure · reach=13 entry point(s)` |
| 4 | `client/src/modules/camera/CameraDirector.js` | `measured-stamps  1 changed (…CameraDirector.js) · declares … dirs=client/src/modules/camera/` |
| 4b | the same file, then a full `verify` run | `measured-stamps  PENDING: … is fresh against COMMITTED history — but 1 uncommitted change(s) …` in the summary of a **green** run |

Case 4b is the one worth reading twice: on master that run prints nothing at all and reports PASS.

---

## 8. Fingerprints and CI

**None moved.** All three equal the record exactly, which is what "this is tooling" has to mean:

| role | record | this branch |
| --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` |
| camera | `00cafa2432add0f7` | `00cafa2432add0f7` |
| render | `f2e170d17ccf84e9` | `f2e170d17ccf84e9` |

`npm run verify` on the branch: **PASS 14, FAIL 0, SKIP 0** — fourteen tasks where there were seven,
because the document composite is now eight named guards and `writable` runs at all.

**CI ran on the branch** (`gh workflow run CI --ref feat/verify-routing-1`, run 31228813868)
because this changes the verify path. **The job that matters passed: `Living-doc guards + script
tests` — green in 1m05s.** That job runs every guard script and the whole script suite, which is
everything this diff touches.

**`Client checks` FAILED, on one step, for a reason that is not this branch's**: the security audit
gate blocks on  (nanoid). ESLint, the Prettier check and the full client test
suite all passed in the same job. The advisory is upstream and new — master's last CI run (2026-08-07
16:25) was green, this branch changes **no dependency at all** (`git diff master` over both
package.json files and both lockfiles is empty), and the gate reproduces identically on master's
lockfile locally. **I did not add an allowlist entry to make CI green.** Silencing a high advisory to
get a tick on an unrelated branch is exactly the kind of quiet narrowing this block exists to end;
it is a dependency decision and it belongs to the owner. It is the second thing to look at in the
morning, and it will block every branch until it is dealt with.

**Two commits used `--no-verify`, and the reason is structural rather than convenient**: the
pre-commit hook runs the guards, and the guards are what these commits change. The full `verify` run
above was made against the tree that was committed and is the evidence.

---

## 9. Hygiene

**Lines.** `verify.mjs` 426 → 358 (−68; the whole route table and its reader are gone, and it gained
the NOT-COVERED and `--routes` output). New: `routing.mjs` 245, `routing.test.mjs` 193.
`verify.test.mjs` 226 → 145. Eleven guard scripts gained 24–42 lines each, all declaration and its
comment. Net +717.

**Removed, because this change orphaned it:**

- **`ROUTES`, the exported route table** (7 entries, 5 matchers, ~55 lines) — replaced by collected
  declarations. Its export was consumed only by `verify.test.mjs`.
- **`selectedBy()`** — a helper that existed to query `ROUTES` from outside. Nothing else called it.
- **`FINGERPRINT_RECORD`** — a constant naming `docs/fingerprints.json`, used only by the deleted
  `doc-guards` matcher. `check-fingerprints` declares that path itself now.
- **The `cmd` map inside `plan()`** — every guard carries its own command in its declaration.
- **`readFileSync` and the `engineReach` import in verify.mjs** — both orphaned by the above.
- **Five tests** asserting the shape of the deleted table (§4).

**Moved out:** the whole dependency question moved from `verify.mjs` into the guards. That is the
change; nothing was moved into a tool and left behind.

**Noticed and deliberately left:**

- **`check-writable.mjs` is still not in CI.** It now runs in `verify`, which is where it matters —
  it exists for the OneDrive placeholder trap on this Windows machine, and a Linux runner cannot
  produce that state. Adding it to CI would be a guard that can never fire; I left it out and am
  naming it rather than quietly adding it.
- **`docs/VERIFY-RULES.md` describes the old table.** It is the canonical home for "what to run and
  how much" and it now describes a mechanism that is gone. **This is the one thing I would fix
  first in the morning** — I did not, because the branch is unmerged and rewriting a canonical
  document for a mechanism that has not been accepted is how documents come to describe two things
  at once.
- **The suites' `blind` lists claim `client/e2e/` is excluded by `vitest.config.js`.** True today,
  and asserted by a routing test, but the routing test asserts the ROUTING, not vitest's config. If
  someone includes e2e in vitest, the routing would be wrong and the test would still pass.
- **`declarationOf` swallows a guard that crashes on `--declare`** and reports it as undeclared. The
  run fails loudly either way, but the message would say "declares nothing" when the truth is
  "crashed". A distinction worth making the next time this file is opened.

---

## 10. Decisions I made alone

**1. `--declare` as a child process, not `import`.** Several guards do their work at module load;
importing `render-fingerprint.mjs` to ask what it depends on would run a 35-second measurement.
Restructuring all eleven to be import-safe was the alternative — a larger, riskier diff across
guards this block is not otherwise touching.

**2. Self-dependency is computed, never declared.** The tempting design is a `self: [...]` field. It
would have been forgettable in exactly the way the table was. The closure of the declaring file is
free and cannot be omitted.

**3. `doc-guards` split into eight named guards.** The composite ran eight scripts under one routing
decision, so `config-keys` — which scans `client/src` — was selected by markdown. Splitting is what
declaration-based routing means; the cost is seven more task lines in the output and no measurable
wall clock (they run concurrently and total under 12 s).

**4. The render fingerprint now depends on the ENGINE closure, and that is a widening I chose.** It
imports `raceCore.js`, so a physics change genuinely moves what is drawn — the old table
deliberately excluded engine files from the render route. Correct beats cheap here, and because the
guards run concurrently the wall clock is unchanged (it is dominated by the client suite either way).

**5. The PENDING case reports rather than fails.** §5 — a failure with no legal repair is a broken
commit path, not a guard.

**6. The two suites' declarations live in `routing.mjs`.** §2.3, with the reason written where the
code is.

**7. I built Part 2 in a worktree at `C:/ra-wt-verify`.** Port 5173 must keep serving Part 1 for the
owner's morning eye test, and checking out master in the main tree would have taken it away.

---

## 11. What I did NOT do, and why

- **Did not update `docs/VERIFY-RULES.md`.** §9 — the branch is unmerged.
- **Did not add `check-writable` to CI.** §9 — it could never fire on a Linux runner.
- **Did not touch `.github/workflows/ci.yml`.** CI calls the guard scripts directly and is unaffected
  by the split; changing the verify path is not a reason to change CI's.
- **Did not merge**, and did not touch Part 1's branch or the dev server.

---

## 12. Two proposals of my own

**12.1 — The `blind` lists are now the only inventory of what this repository does not check, and
nothing reads them but the printer.** Eleven guards declare between two and four holes each; that is
about thirty stated gaps, in one machine-readable place, for the first time. **I would make one of
them a work list**: `verify --routes --uncovered` printing every blind spot grouped by subject would
answer "what is unguarded about the camera?" in a second, and the answer would be maintained by the
people who know, as a side effect of writing guards. It needs no new mechanism — the data is already
collected.

**12.2 — The same declaration would let a guard say what it costs, and verify could then choose.**
Every guard now says what it depends on and what it does not cover; it says nothing about what it
costs, so `verify` runs all fourteen whenever they route and takes 5.5 minutes, dominated by three
that take 100+ seconds each. A `cost` field would allow `verify --fast` to run everything under ten
seconds and NAME the expensive guards it deferred — the same discipline as the skip list, applied to
time instead of relevance. The reason I would want it: the current run is long enough that people
start passing `--base=HEAD` to make it shorter, which is a narrowing nobody records.
