# SESSION-INVALIDATE-1 — most of it was already built, and the premise was mine

**Branch:** `fix/session-invalidate-1`, off master `fa489865`. **One `if` block added to one route.
Eight tests added. No new key, no new env var, no new endpoint.**

```
engine-reach --check server/src/auth/usersRouter.js server/src/auth/sessionInvalidation.test.js \
                     docs/AUTH.md reports/evolution/INDEX.md
  ENGINE REACH: none of 4 path(s) can reach the race engine.
```

**MINTED NOTHING.**

---

## THE HEADLINE: TWO OF THE THREE CLAUSES WERE ALREADY BUILT

The brief was written from AUTH-DOC-LIVE-1's claim that _"`usersRouter.js` has no session handling at
all, so a password changed because it was compromised leaves every existing session alive for up to
30 days."_

**The first half of that sentence is true and the conclusion drawn from it is false.** `usersRouter.js`
has no session handling — and it does not need any, because the invalidation is not in the router. It
is a `sessionEpoch` field bumped by the store and compared by the guard. **I looked in one file, found
nothing, and reported the behaviour as absent.**

**This is the second time in this week's work that a spec was written from my own summary rather than
from the source, and the second time the summary was the defect** (the first was DEAD-EXPORTS-1,
which became L214). It is also the exact failure L215 describes — a conclusion from an exclusion set
that was too narrow.

---

## WHAT WAS ESTABLISHED, BEFORE ANYTHING WAS BUILT

**The mechanism, read from the store and the guard rather than assumed:**

| question the brief asked                             | what the source says                                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| how does a session row identify its user?            | `sessions(sid TEXT PRIMARY KEY, sess JSON, expire TEXT)` — the user is `sess.userId`, inside the JSON blob, **not a column** |
| can the store be iterated?                           | yes — `all()` and a live `better-sqlite3` handle on `.client`; `destroy(sid)` deletes one row                                |
| what is the current session's identity in a request? | `req.sessionID`, and `req.authUser.id` from the guard                                                                        |
| **is enumeration the honest route?**                 | **NO — and this is the finding.** Nothing needs to be enumerated or deleted                                                  |

**`usersStore.updateUser` already bumps `record.sessionEpoch` in the same serialised write that stores
the new hash, and `requireAuth` (`guards.js:129`) destroys any session whose stored epoch differs and
answers 401.** The login path stamps the epoch into the session; the setup path stamps 0. It has been
there since Phase A, and `usersStore.test.js:437` has pinned the bump the whole time.

**So the brief's suggested build — enumerate the SQLite table and remove rows — would have been the
wrong thing to build.** It would have put a second mechanism beside a working one: two definitions of
"a password change ends these sessions", which is precisely what R14 exists to prevent. **Nothing was
enumerated and nothing was deleted.**

### The probe that settled it

Four scratch tests against the real app, run before a line was written and deleted afterwards:

| probe                                | result                                                          |
| ------------------------------------ | --------------------------------------------------------------- |
| admin resets ANOTHER user's password | victim `/me` **200 → 401** on the next request; admin still 200 |
| two sessions of that user            | **both 401**; an unrelated admin **200**                        |
| rejection persists                   | 401 on the next request and the one after                       |
| **admin changes their OWN password** | requester `/me` → **401. SELF-LOCKOUT.**                        |

**Clauses 1 and 3 of the owner's contract already held. Clause 2 did not.**

---

## WHAT WAS BUILT — THE ONLY THING THAT WAS MISSING

A user changing their own password was logged out by their own action: the requesting session
predates the bump exactly like every other session, so it failed the epoch compare on the next
request. **One block in `PUT /api/users/:id` re-stamps that one session** with the new epoch. Every
other session of that user still carries the old one and still dies.

```js
const changedOwnPassword = password !== undefined && req.params.id === req.authUser?.id;
...
if (changedOwnPassword && req.session) {
  const fresh = store.findAuthRecordById(req.params.id);
  req.session.sessionEpoch = fresh?.sessionEpoch ?? 0;
  await new Promise((resolve) => { req.session.save((err) => { if (err) console.error(...); resolve(); }); });
}
```

`updateUser` returns `toSafeUser`, which strips `sessionEpoch` deliberately, so the new value is
re-read through the existing internal accessor rather than by widening the safe projection — **the
field stays un-leakable to clients, which four existing tests assert.**

**Only an admin can reach this at all.** `/api/users` is admin-only and there is no self-service
password route, so "a user changing their own password" means an admin editing their own record.
**Adding a self-service endpoint was out of scope by the brief's own rule** ("no new endpoint"), and
is Proposal A.

---

## WHAT HAPPENS IF THE REMOVAL FAILS — AND WHY THE QUESTION CHANGED SHAPE

The brief asked what happens if removing a session throws, and required that a failure must not
silently succeed the password change. **With this mechanism there is no separate removal that can
throw**: the invalidation IS the epoch write, inside the same serialised, atomic user-record write as
the hash. The password cannot change without the invalidation changing with it. **That is a stronger
property than the brief asked for, and it is the reason not to build what it suggested.**

The one fallible new step is the opposite one — re-stamping the requester's own session:

**If `req.session.save` fails, the request still succeeds, and the failure is logged at error level
naming the user id.** The reason in one sentence: **a failure here invalidates MORE, never less** —
the password change is already committed to disk, so the only consequence is that the requester must
log in again, exactly as they had to before this block existed. Failing the request would be a lie in
the other direction: it would report a password change that did in fact happen. **What is refused is
doing it quietly**, hence the log line.

---

## THE TESTS, AND THE SABOTAGE PROOF

**Eight tests in `server/src/auth/sessionInvalidation.test.js`**, each carrying what breaks if it is
deleted. They assert the **observable contract** — the next request's status code — and never the
epoch number, so the mechanism can be replaced without re-blessing them.

**Both directions were sabotage-proven, because a test that would pass with the code removed is
worthless:**

| sabotage                                 | result                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| delete the re-stamp in `usersRouter.js`  | **2 red** — _"keeps the session that made the request valid: expected 401 to be 200"_. The self-lockout returns and the suite says so                         |
| delete the epoch bump in `usersStore.js` | **3 red** — _"ends that user's session on the VERY NEXT request: expected 200 to be 401"_. The security property this whole feature exists for is unprotected |

Both files were restored and the suite is green again. **The second sabotage matters most**: it proves
the four tests covering the already-built behaviour are load-bearing regression cover, not decoration
around something that cannot break.

**Server suite: 628/628 in 21 files.**

---

## DOCUMENTS

**`docs/AUTH.md` §3 gains the built behaviour** — the one mechanism, all three clauses, the
"very next request" timing, and the fact that only an admin can change a password at all.

**There was no gap entry to remove**, contrary to the brief: the false claim never reached
`docs/AUTH.md`. It lived in `reports/evolution/INDEX.md`, in the line I wrote summarising
AUTH-DOC-LIVE-1 — **the navigation layer, which is what actually gets read.** That line is corrected
and points here.

**`reports/evolution/AUTH-DOC-LIVE-1.md` is left alone.** It records what was believed on the day it
was written, which is what the lab journal is for; correcting its body would erase the evidence of how
the mistake was made. **The index entry above it is the honest place for the correction**, and the
same choice DEAD-EXPORTS-1 made about SEPARATION-TO-TEST-1.

---

## NOTICED, NOT CHANGED

- **`sess.userId` lives inside a JSON blob, not a column.** Any future feature that needs "all
  sessions of user X" — a device list, a force-logout button — must scan and parse every row. Fine at
  this scale, and worth knowing before somebody designs against it.
- **The store's `all()` returns raw rows** (`sess` as a JSON _string_), not parsed session objects as
  the connect-store convention expects. Nothing in this repository calls it; a future caller would be
  bitten.
- **The expired-session sweep cannot be turned off.** `(options.expired.clear) || true` always
  evaluates true, so `{ clear: false }` does not disable the 15-minute timer. Already documented in
  `session.js` as a library bug with no workaround needed — restated here only because I verified it
  is still true, not as a second home.
- **A stale session's row is deleted when it is rejected** (`requireAuth` calls `session.destroy`), so
  rejected sessions do not accumulate. Confirmed, not assumed.

---

## SOURCE HYGIENE

| file                                          | change                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `server/src/auth/usersRouter.js`              | +1 `if` block in `PUT /:id`, +13 lines of comment stating the mechanism and why there is no removal step |
| `server/src/auth/sessionInvalidation.test.js` | **new**, 8 tests                                                                                         |
| `docs/AUTH.md`                                | §3 gains the built behaviour                                                                             |
| `reports/evolution/INDEX.md`                  | the AUTH-DOC-LIVE-1 entry's false claim corrected                                                        |

Tests added: 8. Tests deleted: 0. **Tests re-blessed: 0** — no existing assertion changed, which is
itself evidence the change is additive.

---

## PROPOSALS

### Proposal A — decide whether a non-admin can ever change their own password

Today an `operator` cannot. `/api/users` is admin-only, there is no self-service route, so the only
way an operator gets a new password is to ask an admin to set one — which means **the admin knows it**,
and the operator's first login uses a password a second person chose and typed.

For a closed per-install tool with two people that may be entirely acceptable, and it is not a defect.
But it is a security posture nobody has actually chosen: it fell out of `/api/users` being admin-only.
**The cheap form is one route (`POST /api/auth/change-password`, self only, requires the current
password) and it reuses everything built here** — the epoch bump and the re-stamp already do exactly
the right thing. Out of scope tonight by the brief's own rule; worth an answer.

### Proposal B — before a spec is written from a report, the claim it rests on gets re-read from the source

Twice this week a night's work was specced from a sentence I wrote in an earlier report, and twice the
sentence was the defect — DEAD-EXPORTS-1 (a category flattened into a count) and this one (a behaviour
declared absent after reading one file). In both cases **the source would have corrected it in under
ten minutes**, and in both cases the report read confidently enough that nobody thought to look.

**The cheap form is a rule with a name and no machinery: a claim of ABSENCE — "nothing calls this",
"this is not built", "no test covers it" — is not quotable from a report. It is re-established from
the source, or it is not used to justify work.** Presence claims are cheap to verify and rarely wrong;
absence claims are the ones that need the whole tree and get made from one file. **Deliberately not a
guard** — R13's first question has no answer here, which as usual means the rule is for people.

### Proposal C — the epoch mechanism deserves one line where a reader will trip over it

`sessionEpoch` is a genuinely good design — atomic with the password write, no enumeration, no way to
half-succeed — and it is invisible. It is a field in `usersStore`, a compare in `guards.js`, a stamp
in `authRouter`, and it is named in no document except, as of tonight, one paragraph of `docs/AUTH.md`.

**That invisibility is what produced this whole block**, including a brief that asked for a SQLite
enumeration that would have been the wrong build. The paragraph added tonight covers the operator's
question ("does changing a password log people out?"). **What is still missing is the developer's**:
a line in the guard or the store saying "this is the ONE mechanism; do not add a second". One comment
in each of two files, and it is the cheapest possible insurance against somebody building the
enumeration next time.
