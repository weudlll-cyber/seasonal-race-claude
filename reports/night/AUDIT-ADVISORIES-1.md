# AUDIT-ADVISORIES-1 — the main line goes green again

Night chain 2026-09-08, piece 7 · branch `fix/audit-advisories-1` off master `c5e0cb8b` ·
**the owner asked for this fix on 2026-09-08. Nothing is minted.**

**Why this is on its own branch:** the night's measurements stay unmerged and wait for his eye. Only
the CI fix merges.

---

## ★ THE FINDING, RE-ESTABLISHED AT SOURCE

Not carried from the earlier sentence in this chain. `npm audit --json` in both trees, plus
`npm ls` for every transitive parent, plus `package.json` for the production/dev split.

| package | tree | direct? | **production?** | severity | advisories |
|---|---|---|---|---|---|
| **multer** | server | **yes** | ★ **YES — `server/dependencies`** | **HIGH** | 4 (3 high + 1 low) |
| **js-yaml** | client | no | **no — dev-only** | **HIGH** | 1 |
| vitest | both | yes | no — dev-only | moderate | 1 |
| @vitest/mocker | both | no | no — dev-only | moderate | 1 |
| @vitest/coverage-v8 | both | yes | no — dev-only | moderate | 1 |

**Both claims in the brief confirmed, and both by evidence rather than by repetition:**

- **`multer` is production.** `server/package.json` `dependencies` carries `"multer": "^2.2.0"`
  alongside express, helmet and bcrypt. Its four advisories: DoS via crafted multipart field names,
  DoS via file-descriptor leak on aborted uploads, DoS via oversized array index in field names (all
  **high**), and a file-size-limit bypass via an async `fileFilter` race (**low**).
- **`js-yaml` is dev-only.** `npm ls js-yaml` gives the whole chain:
  `racearena-client → eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.3.1`, and **eslint is a
  devDependency**. It cannot reach a shipped bundle.

The three moderates are dev-only and below the gate's threshold — the gate blocks high/critical only,
and it reports them as advisory. They are named here so the list is complete, and **not acted on**.

---

## THE BUMPS — both the smallest that clear the advisory

| package | from | to | kind | why this is the smallest |
|---|---|---|---|---|
| **multer** | `^2.2.0` | `^2.3.0` | **MINOR, within major 2** | The advisories are `<2.3.0` and `=2.2.0`. The published 2.x line ends at **2.3.0**; the only later release is `3.0.0-alpha.2`, a pre-release major. |
| **js-yaml** | `4.3.1` | `4.3.2` | **PATCH**, via `overrides` | The advisory is `>=4.0.0 <4.3.2`. It is transitive, so the only way to move it without touching eslint is a client-side `overrides` entry. |

★ **Neither is a major, so neither is a migration.** The brief's stop condition — "if the smallest
safe bump is a major, STOP and report what it would take" — **did not fire**. Had it, the answer
would have been multer 3.x, which is still an alpha.

Resolved after install: `multer@2.3.0`, and `eslint → @eslint/eslintrc → js-yaml@4.3.2`.

### Both gates now pass

```
audit-gate [server]: totals — critical 0, high 0, moderate 3, low 0
PASS [server]: no un-allowlisted high/critical advisories (moderate/low are advisory only).

audit-gate [client]: totals — critical 0, high 0, moderate 3, low 0
PASS [client]: no un-allowlisted high/critical advisories (moderate/low are advisory only).
```

**No ALLOWLIST entry was added.** The advisories are fixed, not excused.

---

## ★ PROVING THE PRODUCT STILL WORKS — not just that the audit is quiet

**`multer` handles uploads, so the upload paths were run specifically**, not inferred from a green
suite. Three routes use it — `server/src/routes/tracks.js`, `racers.js`, `brands.js` — and their
tests perform **32 real multipart uploads** between them (`supertest`'s `.attach(...)`, counted:
tracks 13, racers 11, brands 8), including MIME-magic rejection, oversize rejection and the happy
path:

```
vitest run src/routes/tracks.test.js src/routes/racers.test.js src/routes/brands.test.js
  Test Files  3 passed (3)
       Tests  274 passed (274)
```

| what was run | result |
|---|---|
| the three upload routes, 32 multipart uploads | **274 tests pass** |
| `npm run verify -- --premerge` | **PASS 24 · FAIL 0 · SKIP 10** (461 s) |
| client suite | PASS (inside verify, ran alone) |
| server suite | PASS (inside verify, ran alone) |
| golden races | **PASS — 2 races, every finishing position and time as recorded** |
| world fingerprint | matches its record |
| world-off fingerprint | matches its record |
| camera fingerprint | matches its **NEW** record |
| render fingerprint | matches its record |

★ **THE FOUR FINGERPRINTS AND THE GOLDEN RACES WERE RUN BY HAND, because routing SKIPPED them.**
`--premerge` reported *"nothing changed"* for all five: the diff is two `package.json` files and two
lockfiles, and none of those is inside any instrument's declared closure. **A skip is not a
measurement**, and this repository has been bitten by exactly that before, so they were run
explicitly rather than accepted as covered.

Fingerprint values live in `docs/fingerprints.json`, which is their one home. **Nothing is minted** —
all four match what is already recorded, which is the whole point: a dependency bump must not move
the picture or the race.

---

## THE MERGE

Merge permission was given for this fix only, and only once everything above was green.

- Branch `fix/audit-advisories-1` off master `c5e0cb8b`, **not** off the night branch.
- ★ **The branch was deleted at origin BEFORE master was pushed** — MERGE-RUNTIME-API-URL measured
  that deleting afterwards loses a 15-second race against CI's own branch guard.
- `night/2026-09-08` is **untouched and unmerged**; its measurements wait for his eye, and the
  render fix on it is still unminted.

<!-- MERGE-RESULT -->

## SOURCE HYGIENE

Four files: `server/package.json`, `server/package-lock.json`, `client/package.json`,
`client/package-lock.json`. **No source file, no config key, no default, no engine, camera or drawing
code.** Nothing minted. No allowlist entry.

**Noticed and left:** the three dev-only moderate advisories (vitest and its two companions) are
reported by both gates and are below the blocking threshold; moving them is a separate decision.
