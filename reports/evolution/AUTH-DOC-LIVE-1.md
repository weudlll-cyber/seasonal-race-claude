# AUTH-DOC-LIVE-1 — the authentication contract becomes a living document

**Branch:** `docs/auth-live-1`, off master `1dbeb54c`. **Documentation only.** No code, no config, no
test, no comment.

```
engine-reach --check docs/AUTH.md docs/archive/AUTH.md docs/DEPLOYMENT.md docs/VERIFY-RULES.md
  ENGINE REACH: none of 4 path(s) can reach the race engine.
```

**MINTED NOTHING.** Nothing measurable changed.

---

## WHAT I READ — THE SOURCE, NOT THE DRAFT

The new document was written from these files, in this order, and every statement in it was taken
from one of them:

| read                                                                              | for                                                                                     |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `server/src/auth/authRouter.js`                                                   | the four endpoints, the setup gate's ORDER, every status code and message               |
| `server/src/auth/guards.js`                                                       | `PUBLIC_PATHS` (the allow-list) and `ROUTE_POLICY` (the admin raises)                   |
| `server/src/auth/session.js`                                                      | store, cookie flags, `maxAge`, cookie-name resolution, the production refusal           |
| `server/src/auth/csrf.js`                                                         | CORS construction, `credentials`, the absent `allowedHeaders`, the Origin/Referer check |
| `server/src/auth/rateLimit.js`                                                    | both windows, both limits, `skipSuccessfulRequests`, the test skip                      |
| `server/src/auth/usersStore.js`                                                   | bcrypt cost, atomic write, file mode, username normalisation                            |
| `client/src/services/authApi.js`                                                  | the client half of every call — **including the header**                                |
| `client/src/contexts/AuthContext.jsx`, `components/ProtectedRoute.jsx`, `App.jsx` | which screens are guarded, and `allowOffline`                                           |
| `client/e2e/auth.setup.js`, `playwright.config.js`                                | how the suite creates its own account                                                   |
| `server/src/auth/*.test.js`, `setupContract.test.js`                              | the behaviours actually pinned                                                          |

**The draft was read once, at the end, only to answer "what did it claim that the source does not
support".** Nothing was copied from it.

---

## WHAT THE DRAFT CLAIMED THAT THE SOURCE DOES NOT SUPPORT

The draft is a **design**, and it says so — _"Status: DESIGN / not built"_. Measured against the
source it is mostly right about shape and wrong about specifics. The four that matter:

| draft                                                                                                                                             | source                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the bootstrap token is _"required by `POST /api/auth/setup`; checked with a constant-time comparison"_ — **and never says through WHICH CHANNEL** | header-only, `x-bootstrap-token`. **This silence is the defect's origin**: SETUP-TOKEN-CHANNEL-1 had to take the answer from the server's own comment, because the named contract did not state it |
| names an intended source of truth at `docs/AUTH.md`                                                                                               | did not exist until this block — an authoritative-looking pointer resolving nowhere                                                                                                                |
| describes the design as unbuilt                                                                                                                   | it is built, and has been for months — the document simply never caught up                                                                                                                         |
| no mention of `RA_COOKIE_NAME_MODE`, the `__Host-` prefix, the setup marker's `O_EXCL` claim, or `allowOffline`                                   | all four exist in the source and all four change what an operator sees                                                                                                                             |

**Not one line of the draft was edited.** Its body is a record of what was intended on the day it was
written; correcting it afterwards would destroy exactly the evidence it is kept for. It gained a
header — superseded, pointing at the new file, saying plainly that questions about behaviour are not
answered from it.

---

## STATEMENTS CARRIED, CHANGED, DROPPED

**How they were counted:** the draft was read section by section (12 sections, 381 lines) and every
sentence making a checkable claim about behaviour was enumerated — **52**. Framing, rationale and
"why we chose X over Y" were not counted; a table row is one claim.

|             | count |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **carried** | 31    | true of the built system — **and every one re-derived from the source and rewritten, not copied.** Bcrypt cost 12, owner-only file mode, the gitignored user store, session regeneration on login AND setup, a persistent store, deny-by-default on `/api`, the exact allow-list, one central `ROUTE_POLICY`, the two-role model, last-admin protection, the local-only recovery CLI, all three test kinds, `credentials: 'include'` + 401→`/login`, DevScreen tier default-deny |
| **changed** | 12    | true in shape, wrong in detail — listed in full below                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **dropped** | 9     | designed and **not built**                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

**The 12 changed**, because "changed" is the category a reader must not have to take on trust:

1. the cookie is named once in the draft; there are **two** names, chosen at runtime
2. the setup gate keys on "zero users" → it keys on the **setup-complete marker**
3. atomic create-if-none over the user count → atomic **`O_EXCL` marker create**
4. `setup-needed` = zero users → marker absent **AND** zero users
5. rate limits are "a per-IP cap" → 15 min / 10 **failed-only** for login, 60 min / 10 **all** for setup
6. CORS is always explicit → **absent `RA_CLIENT_ORIGIN` disables CORS entirely**
7. the client role matrix → the real split is `allowOffline` vs not, which the draft has no notion of
8. session lifetime unspecified → **30 days**
9. session secret absent → **production refuses to start**; development generates an ephemeral one
10. the route inventory has no row for the `set-default` / `clear-default` / `export-seed` admin sub-paths
11. e2e fixtures "one operator, one admin with known passwords" → **one admin, generated per run**
12. CSRF is Origin/Referer **on top of** a token → Origin/Referer is the **only** mechanism, with a strict/non-strict split the draft does not have

**The 9 dropped:** the cross-origin CSRF-token variant · self-registration (`POST /api/auth/register`)
· security-event logging · an auditable log entry per recovery · **password reset invalidating that
user's sessions** · a SQLite upgrade for the user store · the §12 build order · the deferred
Security-Audit scope · the Extension Checklist and its "this document is the SoT" discipline.

**The dropped list is why this could not be an edit of the draft** — nine designed behaviours do not
exist, and one of them (§5 below) is security-relevant.

---

## WHAT THE NEW DOCUMENT COVERS

Nine sections, each answering a question that has actually been asked here:

1. **First install** — the endpoint, **the channel in the loudest sentence in the file**, what the
   token is compared against, the gate in the server's own order, and both outcomes.
2. **Environment** — every variable the auth path reads, **named, never valued**, split into secrets
   that must never be committed / required / optional-with-defaults, and each row says **what happens
   when it is absent** — the question DEPLOYMENT.md does not ask.
3. **Roles and accounts** — the two roles, `/api/users`, last-admin protection, and the local-only
   recovery CLI. **This section exists because writing the report caught its absence:** a first draft
   of the document described guards without ever saying there are two roles.
4. **Login and sessions** — bcrypt cost, session regeneration, where the session lives, the cookie's
   flags and lifetime, and the three ways a session ends.
5. **What is protected** — the server's allow-list verbatim, the admin policy, the client route
   table, DevScreen's default-deny tier, and the route-drift test that keeps deny-by-default true.
   **`/race` behind `ProtectedRoute` has its own call-out**, with the symptom it produces in tooling
   and the instruction to authenticate rather than change selectors.
6. **Rate limiting and CORS** — both limiters as a table, the test skip and why it exists, and what
   makes `x-bootstrap-token` survive the preflight.
7. **Automated tests** — how the e2e suite creates its own account each run, and **why it must never
   point at a live instance**, with the two incidents named.
8. **Known traps** — five, stated as facts rather than warnings.
9. **Where the code is** — a file map, so a reader who distrusts the document can go to the source.

Plus a header note mapping the OLD section numbers, because eight source comments cite them — below.

---

## ONE HOME — WHAT WAS POINTED AT INSTEAD OF RESTATED

Writing this found **two real overlaps**, and both were resolved by deleting my text:

| overlap                                                              | resolution                                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| deployment values, shapes, the minimal start command                 | **DEPLOYMENT.md keeps it.** §2 opens by saying so and states only what the auth code does WITHOUT each variable — a question DEPLOYMENT.md does not ask |
| the CORS-built-once-at-load incident, its start command and its curl | **VERIFY-RULES.md keeps it.** §5 states the mechanism, then points; the incident, the symptom and the diagnostic are not repeated                       |

I had written both out in full before checking. **The check is the reason they are pointers.**

Each of those two documents gained **one pointer** back — a single sentence, no copy.

---

## THE GUARD SCOPE — AND A HOLE FOUND BY PROVING IT

**`docs/AUTH.md` is already in scope for all four document guards**, because each declares `docs/`
and `dirs` matches by prefix. `check-doc-links`, `check-doc-facts`, `check-config-claims` and
`check-measured-stamps` need no change.

**But "declares docs/" was not proof, and checking it turned up something.** A dangling link planted
in the new file **did not turn the guard red** — the guards enumerate via `git ls-files`, and the
file was still untracked. Staged, the same sabotage failed the guard immediately:

```
untracked:  542 relative links across 57 living-doc files; 0 dangling.   <- probe INVISIBLE
tracked:    FAIL: 2 dangling link(s) in living docs.                     <- probe SEEN
```

**This is not a defect** — a guard that scanned untracked files would fail on every scratch file in
the tree — but it is a real property nobody had written down: **a new living document is outside
every document guard until it is staged.** The window is short and it is exactly the window in which
a new document is at its least reviewed.

The second dangling link in that run was this report, which did not exist yet. It does now, and the
guard is green.

**Guards after:** `check-doc-links` 548 links / 58 files / 0 dangling · `check-doc-facts` green ·
`check-config-claims` 169 keys / 56 documents / **0 current claims** · `check-index` 0 unindexed ·
`check-measured-stamps` 0 stale · `check-fingerprints` 0 stray copies.

---

## FOUND, AND NOT CHANGED

**Four things. None was touched, because this block is documentation only.**

**1. An admin resetting a password does not log that user out.** The draft required it — _"which also
invalidates that user's sessions"_ — and `usersRouter.js` contains no session handling at all. So a
password changed because it was compromised leaves every existing session of that user alive, for up
to the cookie's 30 days. **This is the one dropped claim with a security consequence**, and it is the
most substantial thing this block found.

**2. Eight source comments cite section numbers that no longer mean what they say.**
`server/src/auth/{authRouter,guards,usersStore,recoverAdmin}.js` and `scripts/recover-admin.mjs`
point at `AUTH.md §2 / §4 / §5 / §9 / §9a` — the archived design's numbering. Now that a different
`docs/AUTH.md` exists, each lands in the wrong place. **Not fixed here (code), and not worked around
by contorting the new document's structure**: the new file carries a five-entry map in its header, so
a reader following a comment still arrives. The comments themselves are in PROPOSALS.

**3. `403 setup not available` does not distinguish its two causes** — no token configured, versus a
wrong token. An operator on a failed first install cannot tell "I typed it wrong" from "the server
was never given one". Recorded in §8 and in PROPOSALS; **not fixed here**, because it changes a
response the tests assert.

**4. The setup marker and the user store can disagree.** `setupNeeded` requires the marker absent AND
zero users, but the gate on `POST /setup` checks only the marker. Deleting the marker with users
present leaves `setup-needed` false while `POST /setup` proceeds to the token check. It still needs
the token, so it is not a hole — but it is a state the code permits and no test covers. **Not
changed: it is a product decision.**

**One apparent conflict that is not one:** DEPLOYMENT.md calls `RA_CLIENT_ORIGIN` optional; this
document treats it as required. Both are right — DEPLOYMENT.md describes the same-origin model, where
it genuinely is not needed. **Nothing was changed**; it is noted because reading the two in the other
order looks like a contradiction.

---

## SOURCE HYGIENE

| file                   | change                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `docs/AUTH.md`         | **new** — the living contract, 7 sections + a file map                               |
| `docs/archive/AUTH.md` | **header only.** Superseded notice pointing at the new file. **Body byte-identical** |
| `docs/DEPLOYMENT.md`   | +1 sentence pointing at `AUTH.md`                                                    |
| `docs/VERIFY-RULES.md` | +1 clause pointing at `AUTH.md`                                                      |

Tests added: 0. Tests deleted: 0. Tests re-blessed: 0. **No code file was opened for writing.**

---

## PROPOSALS

### Proposal A — let a failed first install say which of the two things went wrong

`403 setup not available` covers both "no `RA_BOOTSTRAP_TOKEN` is configured" and "the token you sent
is wrong". These want opposite actions from the operator — restart the server with a token, versus
check what you pasted — and the response cannot tell them apart. The server already **logs** the
no-token case at startup, so the information exists; it just never reaches the person holding the
browser.

**The cheap form keeps the secret and splits the state**: when no token is configured at all, that is
not a secret — nothing has been guessed and nothing leaks — so `403 setup is not enabled on this
server` is safe. A wrong token keeps today's message exactly. **It is a two-line change with a test
each**, and it is the first thing that will go wrong on the next fresh install, because it is the
thing that went wrong on the last one.

### Proposal B — decide whether an admin password reset should end that user's sessions

The design said it should; the code does not do it. Today an admin who resets a password because it
was compromised has **not** locked the holder out — the existing session keeps working for up to 30
days, and the admin has no way to see that, let alone stop it.

**It is a real decision, not an oversight to be silently fixed**, because the friendly reading is
also defensible: an admin resetting their own forgotten password would log themselves out. The
session store makes either answer cheap to implement — the question is which one is wanted, and it
should be answered rather than left as a gap between a design and its code.

### Proposal C — the eight `AUTH.md §N` comments should name the section, not the number

Section numbers in comments broke the moment the document they pointed at was replaced, and they
would break again on any reorganisation. **`(AUTH.md — first-admin bootstrap)` cannot go stale in
this way**; `(AUTH.md §5)` already has.

The new document's header carries a map so nothing is lost today, **but that map is a workaround and
should not become permanent** — it is a second place stating how the document is structured, which is
exactly the shape this project keeps removing. Eight comments, one sweep, no behaviour change.

### Proposal D — a living document should be in its guards before it is written, not after

The sabotage above is the finding: a new document under `docs/` is invisible to every document guard
until it is staged, which is precisely while it is being drafted and least reviewed. Nothing catches
a dangling link, a stated config value or a stale stamp during the hours that matter.

**Deliberately not proposed as a guard change** — making the guards read untracked files would fail
them on every scratch file, which is worse. **The cheap form is a habit and one line in
`VERIFY-RULES.md`: `git add` a new living document as the first act of writing it**, not the last.
That is free, it is checkable by eye, and it turns four guards on at the moment they start being
useful.
