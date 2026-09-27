# DELIVERY-CLEAN-2 · ARC 1 — SHUT THE DOORS AND PROVE THEM SHUT

**From master `392bf975`, branch `audit/2026-09-27-hardening`.** Defaults, tests and documentation.
No runtime behaviour changed, no fingerprint reachable, no offensive tooling.

★ **What arc 1 built:** three tests that go red if a boundary moves, each **sabotaged to prove it
fails**; two documentation sections; and five things recorded as the owner's decision rather than
taken. ★ **What it corrected:** one number the report contradicted itself on, and one finding
(B7) that overstated its own risk.

---

## §0 — THE 58/59, SETTLED. ★ AND THE BRIEF IS WRONG THAT ONE IS OFF BY ONE.

The brief says `DELIVERY-CLEAN-1` gives 58 in §11-A and 59 in C13, so "one is wrong by one".
**Neither is wrong.** Re-measured from the tree:

| | |
| --- | --- |
| direct `router.<verb>(` calls in the nine mounted routers | 49 (auth 6, users 4, tracks 8, surface-classes 5, player-groups 5, brands 8, racers 8, seed-notices 2, races 3) |
| added by `routes/_defaultPromote.js`'s `attachPromoteExport` | +9 (three each to `brands`, `playerGroups`, `tracks`) |
| **= the router surface** | **58** |
| `/api/health`, registered directly on the app at `server/src/app.js:58` | +1 |
| **= the whole HTTP surface** | **59** |

**Both figures were right for what they counted.** The defect was that the report used two numbers
for what reads like one quantity and never said the scopes differed. Every use is now labelled and
§1.4 carries a scope note.

---

## §1.1 — THE BIND. ★ RECORDED, NOT CHANGED, AND THE REASON IS THAT IT IS NOT A PURE WIN.

`docker-compose.yml:17-18` publishes `4000:4000` — every interface. The brief asked whether
`127.0.0.1:4000` still lets the intended setup work.

**It does not, for one intended setup.** The shipped model is same-origin: the server serves the
built app *and* the API on one port (`docs/DEPLOYMENT.md:9-13`), so a browser on another machine
reaches `http://<host>:4000` directly — and the reverse proxy is described as **optional**
(`docs/DEPLOYMENT.md:242`, *"if sitting behind nginx/Caddy"*). Binding to loopback removes direct
access and makes a proxy mandatory. **That is a change to how the product may be run**, so by the
brief's own rule it is his.

**Documented** in `docs/DEPLOY-NOTES.md` §5: on a VPS, either bind to loopback in the operator's own
override *or* use a host firewall — **one of the two is required, or the proxy is decoration.**

---

## §1.2 — THE TRUST BOUNDARY, PINNED BY TEST

`server/src/races/trustBoundary.audit.test.js`, 3 tests.

The owner's rule lives in the source it governs — `client/src/modules/raceHistory.js:9-14`,
2026-09-06: *"The race is written LOCALLY FIRST, always. The server is a second store, never a
gatekeeper."* `raceStore.js` holds that line exactly: every guard is structural (`:235` required
fields; `:264-274` roster non-empty, `results` an array, `winners` an array). **None asks whether
the finishing order is one the engine could produce.**

**What the test pins:** a race whose declared winner finishes *last*, in 0.25 s, is **accepted and
read back unaltered**; only structural faults are rejected; and `server/src` references **no engine
module at all**, so recomputing on submission cannot become a one-line change nobody notices.

★★ **SABOTAGED BOTH WAYS, because a green test pins nothing until it is shown to fail:**

| sabotage | result |
| --- | --- |
| add a winner-vs-position-1 check to `raceStore.js` | **RED** — `Error: winner does not match position 1` |
| add an engine reference to `server/src/dataPaths.js` | **RED** — *"server/src now references the race engine"* |

★ **A wrong assumption of mine, caught by the test failing first:** I asserted
`out.stored === true`. The real contract is `{race, roster, racerTypes}` (`raceStore.js:253-256`).
Corrected against the source rather than by weakening the assertion.

---

## §1.3 — THE TENANCY PROBE NOW CARRIES ITS OWN INSTRUCTION

`server/src/routes/crossTeamAccess.audit.test.js` gained a header block. It states that the file
is **supposed to go red** the day the boundary is built (the owner's ordering decision of
2026-09-27), what to rewrite each absence assertion into, and that the `races` assertions are real
boundary tests to leave alone.

★ **The failure mode it exists to prevent, named in the file:** somebody builds tenancy, sees a
green audit probe turn red, reads that as a regression they caused, and **weakens the new boundary
until the old assertions pass again** — using an audit probe to undo the work it was written to
make visible.

---

## §1.4 — UPLOAD BOUNDS. ★★ AND THIS CORRECTS B7's RISK.

**B7 says "the upload size-and-type BOUND exists in three copies". Measured at the tree, it does
not.** The bound is already single-homed in `server/utils/imageUpload.js`:

- `:21` `MAX_IMAGE_BYTES = 10 * 1024 * 1024`
- `:19` `ALLOWED_IMAGE_TYPES = image/jpeg, image/png, image/webp`
- `:50` `createUpload({ maxBytes = MAX_IMAGE_BYTES })`
- `:58` raises `INVALID_TYPE`

and `brands.js`, `racers.js` and `tracks.js` **all import it** and all call
`createUpload({ maxBytes: MAX_IMAGE_BYTES })`. **The limit and the type list cannot drift.**

**What IS triplicated is the error RESPONSE** — the 413/400 status codes and two message strings at
`brands.js:314`, `racers.js:281`, `tracks.js:595`. ★ **So the real risk is narrower than recorded:
not that one route accepts a bigger file, but that one route answers a violation differently.**

`server/src/routes/uploadBoundsAgreement.audit.test.js`, 4 tests, pins the three handlers identical
modulo the field name, and pins that no route hardcodes its own limit.
★★ **Sabotaged both arms:** drifting one route's 413 → 500 reddens it with a message naming the
drifted file; replacing `createUpload({maxBytes: MAX_IMAGE_BYTES})` with a hardcoded 50 MB reddens
it. ★ The test says in its own header that it is **expected to go red and be deleted** when the
owner's merge happens — there is nothing to keep in agreement once there is one handler.

---

## §1.5 — THE STANDING CHOICES

**Base image — ★★ NOT PINNED, and the brief's own condition is why.** It said pin to a digest *"if
that is purely safer"*. `server/Dockerfile:22` and `:33` are both `FROM node:20-alpine`. A digest
makes a rebuild reproducible — **and freezes the base**, so Alpine and Node security patches stop
arriving until somebody updates the digest by hand. **Nothing in this repository watches base
images:** the dependency audit runs daily over the two npm trees and says nothing about `FROM`.
Pinning without a bump process trades a rare reproducibility problem for a standing patch problem.
**Recorded with both sides, not taken.**

**Cookie lifetime — 30 days** (`server/src/auth/session.js:108`). The safe alternative is hours, not
weeks. The cost is real and is why it is 30 days: an organiser running an event does not want to
sign in again mid-evening, and there is no refresh flow. **His.**

**Backup checksum — none.** ★ A precision that matters: `scripts/backup.mjs:137` writes a **tar
header** checksum, which is part of the tar format and **not** an integrity digest of the archive.
§8.4 stands; that line must not be misread as satisfying it.

---

## §1.6 — PLAIN HTTP. ★★ THE MOST CONSEQUENTIAL THING IN THIS ARC.

`docs/DEPLOY-NOTES.md` §4 already owned this subject and covered it well — no TLS in the tree,
searched not assumed; the app is TLS-aware and expects a terminator; over plain HTTP the password
and session are readable. **Two things it did not say, and both make the plain-HTTP case worse than
the "sign-in stops working" trap it described:**

**1 · The trap it described is not the default case.** `NODE_ENV` is set **nowhere** in the shipped
deployment files — not `docker-compose.yml`, not `server/Dockerfile`, not
`docker-compose.override.yml.example`. So `resolveCookieSecure(false)` returns **`false`** (run
today: `resolveCookieSecure(false) = false`, `resolveCookieSecure(true) = true`), the cookie is not
marked `Secure`, and **sign-in works perfectly over plain HTTP** — with the password
(`authRouter.js:199`, from `req.body`) and the session cookie both in clear.
★ **Nothing breaks, which is exactly why nobody notices.**

**2 · Nothing warns at boot.** `server/src/startupReadiness.js` emits readiness lines for
`RA_BOOTSTRAP_TOKEN` (`:57`), `RA_SESSION_SECRET` (`:67`) and `RA_CLIENT_ORIGIN` (`:76`), and
contains **zero** occurrences of `https`, `tls` or `secure`. An operator serving this on a public
address over plain HTTP is told nothing, by anything, ever.

★ **Written into §4, which owns the subject — not into a parallel section.** Adding a readiness
line is a runtime change he would see at boot, so it is **a row, not a build**.

---

## §1.7 — THE DELIVERABLE

`docs/DEPLOY-NOTES.md` §5, *"How to stand this up without leaving a door open"*: six doors in the
order they bite, each with what is true today, the safe setting, and **who decides** — four his, two
settled. It points at §4 for TLS rather than restating it.

**Its commands, executed:**

| command | result |
| --- | --- |
| `node scripts/backup.mjs --out <dir>` | wrote `racearena-backup-20260927T090509Z.tar` |
| `node scripts/backup.mjs --restore <archive> --into <dir>` | restored; `diff -r` **identical** |
| manifest scan for a `backup` script | **0** in all three — the claim holds |

---

## ARC 1 — UNKNOWN

- ★ **No adversarial traffic was run against anything.** Arc 1 is hardening by construction: it
  proves a boundary is *described* and *tested*, never that it resists an attacker. An empty finding
  list here means "the doors named in DELIVERY-CLEAN-1 are now pinned", not "there are no others".
- **The three tests read source text, not behaviour, in two of three cases.** The upload test
  compares handler text; the engine-absence test greps `server/src`. Both are deliberately coupled
  to the text and will redden on a harmless reformat — which is the trade named in each file.
- **`docker compose` was not started in this arc.** The bind question was answered from the compose
  file and the deployment model, not by observing a refused connection on a second machine; there is
  no second machine here.
- **Whether a reverse proxy is actually in front of any real install is unknown** — nothing in the
  repository can see the owner's host.
- **The plain-HTTP finding was not tested end to end**: I did not stand up an install on a public
  address and capture a credential. It rests on `resolveCookieSecure` returning `false` (run),
  `NODE_ENV` being unset in three files (searched), and `startupReadiness.js` containing no TLS
  string (searched).
