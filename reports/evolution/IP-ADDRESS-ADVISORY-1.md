# IP-ADDRESS-ADVISORY-1 — the one finding with a production path, closed

**Branch `fix/ip-address-advisory`, off master `15ca67a8`. Merge `1e73b62d`, CI green on that SHA
including the Server tests job. Dependencies only; no product code.**

**All four highs closed. Every one was a lockfile-only move. The server gate is now armed and
blocks.**

---

## Establish first — what is installed, what is required, what closes it

Read from the installed tree before anything was changed. **Every fixed version already lay inside
the range its dependent declares**, so none of this needed a dependent bumped and the decision rule
about major upgrades never came into play.

| package | was | dependent, and its declared range | vulnerable | fixed at | reach |
| --- | --- | --- | --- | --- | --- |
| `ip-address` | 10.2.0 | `express-rate-limit@8.5.2` — `^10.2.0` | `<=10.3.0` | **10.5.0** | **PRODUCTION** |
| `nanoid` | 3.3.12 | `postcss` — `^3.3.12` | `<=3.3.17` | **3.3.18** | dev-only |
| `postcss` | 8.5.15 | `vite` — `^8.5.15` | `<=8.5.22` | **8.5.26** | dev-only |

**`nanoid` needed checking rather than assuming.** Its `latest` is **6.0.1**, which is far outside
`postcss`'s `^3.3.12` — so the real question was whether the **3.x line** carried a fix at all. It
does: `3.3.18`, published above the vulnerable ceiling. Had it not, this would have needed a
`postcss` bump and a different conversation.

## What was run, and what it changed

```
cd server
npm update --package-lock-only ip-address nanoid postcss
```

**`npm install <pkg>` was deliberately not used** — the brief records that it silently moved nanoid
into `dependencies` and flipped its lockfile entry from dev to production.

**The diff is three lockfile entries and nothing else:**

```
MOVED  node_modules/ip-address   10.2.0 -> 10.5.0   dev: false -> false
MOVED  node_modules/nanoid       3.3.12 -> 3.3.18   dev: true  -> true
MOVED  node_modules/postcss      8.5.15 -> 8.5.26   dev: true  -> true
total lockfile entries changed: 3
```

**`server/package.json` is byte-identical.** And the dev flags survived: nanoid and postcss are still
`dev: true`, ip-address still production. That is the check that mattered — it is the exact failure
the instruction warned about, and it did not happen.

### `npm ci` could not be used, and the reason is worth keeping

`npm ci` wipes `node_modules` before installing, and it died on the first unlink:

```
npm error code EPERM
npm error syscall unlink
npm error path …/server/node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

**The owner's API was running on port 4000 and holding that native binary open.** Killing his server
to install a dependency was not on the table. `npm install` reconciles in place, touched only the
three changed packages, and left it alone. Worth remembering: on this machine, with the dev server
up, `npm ci` in `server/` cannot succeed.

## Before and after

**Before:**

```
ip-address  <=10.3.0   high    3 advisories (SSRF / trust-boundary)
nanoid      <=3.3.17   high    2 advisories (infinite loops)
postcss     <=8.5.22   high    2 advisories (path traversal via sourceMappingURL)
body-parser <1.20.6    low     1 advisory  (DoS via invalid limit)

4 vulnerabilities (1 low, 3 high)
```

**After:**

```
body-parser  <1.20.6
body-parser vulnerable to denial of service when invalid limit value silently disables size
enforcement - https://github.com/advisories/GHSA-v422-hmwv-36x6

1 low severity vulnerability
```

## The gate is armed, and it is honest to arm it

`--report-only` is **gone** from the server step. It now blocks exactly like the client gate:

```
audit-gate [server]: totals — critical 0, high 0, moderate 0, low 1
  advisory (low): GHSA-v422-hmwv-36x6 — body-parser …
PASS [server]: no un-allowlisted high/critical advisories (moderate/low are advisory only).
```

That output is from **CI on the merge SHA**, not from a local run.

**Why arming it is honest now:** the flag existed because four *fixable* advisories would have turned
master red, and allowlisting them would have misstated why they were tolerated. Zero un-allowlisted
high/critical remain, so the reason is gone. The step's comment records what moved and why, so the
next reader does not have to reconstruct it from git.

**The remaining `body-parser` LOW does not hold the gate open.** Moderate and low are advisory-only
by the gate's standing policy — printed, never blocking — and that is not an exception invented for
this advisory. It is also outside this block's stated scope, and a low-severity DoS advisory on the
production path is not something to bump unattended on the way past. **It is a one-line lockfile
update whenever wanted:** `express` declares `~1.20.5`, so `1.20.6` is inside the range.

**The React-Router allowlist entry was not touched.** Its removal condition is still not met — the
advisory is out of the feed, but the installed version remains inside the vulnerable range.

## Proof

**The server suite is the only thing standing behind a dependency change on this tree, and it is
exactly what it was wired in for.**

| | |
| --- | --- |
| local, against the updated tree | **19 files, 615 tests, 615 passed** — 113.7 s (121 s wall) |
| CI, on the merge SHA | **19 files, 615 tests, 615 passed** |

The local run is slower than the 41.8 s recorded when the suite was wired. That is a freshly
reinstalled `node_modules` in a OneDrive-synced tree going in cold, not a change in the tests — CI,
on a clean runner, is unaffected.

```
$ node scripts/engine-reach.mjs --check server/package-lock.json .github/workflows/ci.yml
ENGINE REACH: none of 2 path(s) can reach the race engine.        (exit 1)
```

**No fingerprint can move.** A lockfile in the server tree is outside every instrument's closure, and
nothing was measured beyond that.

---

## PROPOSALS

1. **Close the `body-parser` low the same way, in daylight.** It is the last advisory on the tree,
   it is on the production path, and `express`'s `~1.20.5` already admits `1.20.6` — the same
   one-line `npm update --package-lock-only`. Doing it as its own small block keeps the property this
   one had: a single-purpose diff that the 615 tests can actually speak to.

2. **Audit the CLIENT tree for reachability too, now that the gate can tell the difference.**
   `--omit=dev` annotation was added for the server and it changed the whole picture there — three of
   four highs turned out to be unreachable build tooling. The client currently reports zero
   vulnerabilities, so nothing is hiding, but the moment it reports one the same question will
   decide how urgent it is. The capability is already in the gate; only the reading habit is missing.

3. **Add a scheduled audit run.** Both trees are clean today, and neither will stay clean without
   anyone committing: advisories arrive on the feed's timetable, not on the repository's. A weekly
   `schedule:` job running both gates would find the next one on the day it lands rather than on the
   day someone happens to push. It is the one check whose subject changes while the code does not —
   which is exactly the class CI's own comment already notes it cannot anticipate.

4. **Record `npm ci` is unusable in `server/` while the dev server runs.** It cost a wiped
   `node_modules` and a confusing EPERM here. One line in the setup documentation — *use
   `npm install` in `server/` unless the API is stopped* — would save the next person the same
   detour, and it belongs next to the other Windows/OneDrive conditions this project has already
   written down.
