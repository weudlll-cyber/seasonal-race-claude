# SELF-PASSWORD-1 — an operator changes his own password

**Branch:** `feat/self-password-1`, off master `75685b5b`. **One new route, one new client function,
one Dev Screen section, one extracted helper. No new configuration key, no new env var.**

```
engine-reach --check server/src/auth/{authRouter,restampSession,usersRouter,usersStore}.js \
  server/src/auth/{routePolicyDrift,changePassword,changePasswordContract}.test.js \
  client/src/services/authApi.js client/src/contexts/AuthContext.jsx \
  client/src/screens/DevScreen/DevScreen.jsx \
  client/src/screens/DevScreen/sections/ChangePasswordSection{.jsx,.test.jsx} docs/AUTH.md
  ENGINE REACH: none of 13 path(s) can reach the race engine.
```

**MINTED NOTHING.**

---

## THE ROUTE, AND WHY IT LIVES WHERE IT DOES

**`POST /api/auth/change-password`** — on the auth router, not on `/api/users`.

`/api/users` is admin-only for **every** method via one `ROUTE_POLICY` entry, so an operator can
never reach it. That is not an obstacle to work around; **it is the gap this block closes**, and
loosening it would have opened user management to operators as a side effect. The auth router is
where a route about _the requesting session's own account_ belongs — `logout` and `me` are already
there for the same reason.

It needed no gating code of its own. `requireAuth` is global on `/api` and only `PUBLIC_PATHS` is
exempt, so a new route is **authenticated by default and operator+ by default** — deny-by-default
working exactly as designed. The one deliberate step was adding it to `routePolicyDrift.test.js`'s
`OPERATOR_PLUS_ALLOWLIST`, which is that guard's designed way of saying "operator+ is correct here",
and without it the suite would have gone red on the new mutating route. **The guard did its job.**

---

## HOW THE TARGET USER IS ESTABLISHED

**From `req.authUser.id`** — the record the guard already resolved from the session cookie — **and
from nothing else.** There is no id in the path, no id in the body, and the client function has no
parameter for one.

```js
const userId = req.authUser?.id ?? req.session?.userId;
if (!userId) return res.status(401).json({ error: "not authenticated" });
```

**This is the single most important line in the block.** A route every operator can reach that took
its target from the request body would be an unguarded admin reset — worse than the problem it was
built to solve. Three tests plus the contract test's own control cover it, and it is the first thing
the sabotage below attacks.

The current password is verified with **`verifyPassword`, the same function the login path calls** —
imported, not re-implemented. The new password goes through `store.updateUser`, which applies the
same validation setup uses, hashes at the same cost, and bumps `sessionEpoch` in the same serialised
write. **No password rule, minimum length or message was invented here.**

---

## SESSIONS — AND THE ONE PLACE THE RE-STAMP NOW LIVES

The brief said the rule built yesterday applies unchanged and must not be re-implemented. **It would
have been**: the re-stamp was written inline in `PUT /api/users/:id`, and this route needs exactly
the same thing. Two inline copies of one rule is the second definition R14 forbids.

**So it moved into `server/src/auth/restampSession.js` and both routes call it.** The function
re-stamps the requesting session and nothing else; the invalidation itself is still the epoch bump
inside `updateUser`, untouched. `usersRouter.js` lost twelve lines and gained a one-line call, and
its comment now points at the shared home.

**No session code was written in the new route** beyond that call — no enumeration, no deletion, no
second epoch. The failure policy is the one already decided and now stated in one place: **a failure
re-stamping invalidates MORE, never less**, so the password change still stands and the failure is
logged at error level naming the user id.

**The owner's rider is in.** `sessionEpoch` in `usersStore.js` carries a six-line note saying it is
_the_ session-invalidation mechanism, that requireAuth is the other half, and **"DO NOT BUILD A
SECOND ONE beside it — no enumerating the session store, no deleting rows."** It sits on the field
itself, which is where somebody about to add a second mechanism will be looking.

---

## THE SCREEN, AND WHY IT IS THERE

**There is no account or settings area**, so the brief's fallback applies. The form is a **Dev Screen
section at `operator` tier**, placed with the other operator sections and reached the way every other
section is reached.

**The one-sentence reason: the Dev Screen is the only screen an operator can reach that already
carries account affordances — the "Log out" button is a few lines away in the same file — so the
account action goes next to the other account action rather than inventing a settings area, a modal
or a navigation concept.** Nothing about the race screens, the camera or the routing changed; no new
route was added to `App.jsx`.

The form **imports `Auth.module.css`** — the same field, label, input, error surface and button the
login and setup screens use — so a password form looks like a password form wherever it appears. The
only thing it adds is a repeat-password field, and that is stated in the code as a **typo guard in
this form only**: the server has no concept of it, and no rule was invented for it.

---

## THE TESTS

**23 new tests.** 12 in `changePassword.test.js` (the route's behaviour), 5 in
`changePasswordContract.test.js` (the seam), 5 in `ChangePasswordSection.test.jsx` (the form).

**The client path is exercised through the real API function, as instructed.** The contract test
imports `authApi.changePassword` across the tree and drives it against the real handler over a real
logged-in session, using the same fetch→supertest bridge as `setupContract.test.js` — here riding a
supertest **agent**, so the real session cookie travels with it as a browser's would. It asserts the
request body by **exact equality**, so a user identifier added later "for convenience" fails the
suite rather than slipping through. The component test says in its own header that it can only see
what the component calls, never the wire, **because believing otherwise is what hid the setup-token
defect for months.**

### Sabotage proof — both directions

| sabotage                                                      | result                                                                                                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| read the target from the body first (`req.body?.userId ?? …`) | **3 red**, including the contract test's own control — _"a body naming ANOTHER user changes only the requester: expected 401 to be 200"_ |
| remove the `restampSession` call                              | **3 red** — _"the requesting session still works afterwards: expected 401 to be 200"_, the self-lockout returning through a second route |

Restored after each. **Server suite 645/645 across 23 files; client section file 5/5.**

### One thing I got wrong and fixed, because it would have reached master

The first full-suite run after adding these files went **red with two timeouts**, while the same
files passed alone. Two causes, and I fixed both rather than re-running until green:

1. **bcrypt cost 12 is slow and these tests are login-heavy** — four to eight hashes per test. Alone
   ~2 s; under the full suite's contention, past vitest's 5 s default. Both files now state a
   **wall-clock budget** with the reason written in. **No assertion was weakened** — nothing retries,
   tolerates or skips; the tests are identical and merely allowed to take the time bcrypt costs.
2. **A shared-account dependency I had introduced.** One assertion used the `testadmin` agent, and
   **nine test files log in as that one account against one users store while vitest runs files in
   parallel** — so an assertion about its session is an assertion about what eight other files
   happened to be doing. It is gone: every user in this file is created by this file, for one test.

**Six consecutive green full-suite runs** after those two fixes.

---

## DOCUMENTS

**`docs/AUTH.md` §3** describes the new path — that any role can change their own password, that the
target comes from the session and never the body, that a wrong current password answers what a wrong
login answers, and where the form is.

**And it corrects yesterday's sentence.** SESSION-INVALIDATE-1 added _"Only an admin can change a
password at all, their own or anyone's"_ — true when written, false as of this merge. It is replaced
rather than qualified. §5's public allow-list is unchanged and correct: this route is not public.

---

## NOTICED, NOT CHANGED

- **Nine test files share `testadmin` and one users store, in parallel workers.** My own file is out
  of that pool now, but the coupling is real and pre-existing, and one instance is mine from
  yesterday: `sessionInvalidation.test.js` promotes a user to `admin`, while `users.integration.test.js`
  asserts that demoting `testadmin` fails **because it is the sole admin**. If those overlap, the
  second sees two admins and gets a 200 where it expects 409. **Not observed failing** — the window is
  small — but it is a latent flake, not a hypothetical. Proposal C.
- **There is no rate limit on `/api/auth/change-password`.** Login has one and setup has one; this
  route lets a session-holder guess the current password without limit. The blast radius is smaller
  (an attacker already holds a session) and adding a limiter needs a new key, which the brief forbade.
  **Reported, not built.** Proposal B.
- **`GET /api/auth/me` returns only username and role**, so the client has no user id at all. That is
  the reason the client function _cannot_ name a target even by accident, and it is worth keeping.

---

## SOURCE HYGIENE

| file                                                              | change                                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `server/src/auth/authRouter.js`                                   | +`POST /change-password` (+53 lines incl. the reasoning)          |
| `server/src/auth/restampSession.js`                               | **new** — the extracted one home for the re-stamp                 |
| `server/src/auth/usersRouter.js`                                  | inline re-stamp replaced by the shared call; comment points at it |
| `server/src/auth/usersStore.js`                                   | **rider**: 6-line note at `sessionEpoch`                          |
| `server/src/auth/routePolicyDrift.test.js`                        | +1 allow-list entry with its reason                               |
| `client/src/services/authApi.js`                                  | +`changePassword`                                                 |
| `client/src/contexts/AuthContext.jsx`                             | +`changePassword` passthrough                                     |
| `client/src/screens/DevScreen/DevScreen.jsx`                      | +1 `operator`-tier section entry, +1 import                       |
| `client/src/screens/DevScreen/sections/ChangePasswordSection.jsx` | **new**                                                           |
| 3 test files                                                      | **new**                                                           |
| `docs/AUTH.md`                                                    | §3 rewritten for the new path; the "only an admin" line corrected |

Tests added: 23. Tests deleted: 0. **Tests re-blessed: 0.**

---

## PROPOSALS

### Proposal A — decide whether an admin resetting a password should force a change at next login

An admin can still set another user's password, and after this block that is the **only** way one
person learns another's password. The operator can now change it — but nothing makes them, and
nothing tells them they should. So the admin-knows-the-password window closes only if the operator
remembers to close it.

**The cheap form is a flag on the record** — set when someone else writes your password, cleared when
you write it yourself — **and one redirect** to the section built here. It reuses everything: the
route, the form, the epoch. It is the difference between "an operator _can_ have a private password"
and "an operator _has_ one", which is what the decision was actually about.

### Proposal B — rate-limit the current-password check

`login` and `setup` are rate-limited; this route is not. A session-holder may guess the current
password as often as they like, and the current password is the only thing standing between a stolen
session and a permanent takeover. **The attacker already holds a session**, so this is hardening
rather than a hole — which is why it was reported rather than built, on top of the brief's "no new
key" rule.

**It fits the existing shape exactly**: a third limiter beside the two that exist, same middleware,
same 429, same test skip. The one real question is the pair of numbers, and that is a decision, not a
build.

### Proposal C — give the server suite per-file users, or stop asserting on the shared one

Nine test files log in as one `testadmin` against one users store while vitest runs them in parallel.
Today that is mostly benign, but yesterday's block and this one both wrote assertions whose truth
depended on what another file was doing at that moment — and one of them (the last-admin pair above)
is still there.

**Two cheap shapes, and either would do**: give `authAgent` a per-file username so each file gets its
own admin, or write down that an assertion may only involve users the asserting file created.
**The first is a ten-line change and removes the class**; the second is free and relies on people
remembering. I would take the ten lines. **Deliberately not a guard** — R13's first question has no
answer here.
