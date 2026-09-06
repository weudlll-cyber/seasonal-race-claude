# TEAMS-1 — a user belongs to a team, and the admin assigns it

**Date:** 2026-09-06
**Branch:** `feat/team-races-1` off master `bcf41a9b` — **NOT merged, and not to be merged yet.**
**Fingerprints:** none minted. `engine-reach --check` selects nothing (line quoted below).
**Owner's decision this serves:** 2026-09-05 — races will be stored on the server and visible to
everyone in the same team. **This piece builds only the team on the user.** No race storage, no
visibility rules, no filtering; there is nothing stored to filter yet.

---

## The precondition, and the branch

`git ls-remote --heads origin` showed exactly `master` (`bcf41a9b`) and `night/2026-09-05`
(`80f7118e`). No other branch stood at origin. The night branch was not touched.

The branch was created as `feat/teams-1` and renamed to **`feat/team-races-1`** on the addendum,
before anything was committed or pushed. **Nothing was ever pushed under the old name**, so no
branch was left behind at origin and none had to be deleted. The remaining pieces of the topic —
the SQLite store, saving a race, the history — land on this same branch, and the topic merges once.

---

## What the store now holds

A user record gains **two** fields, both written by the store and never by a caller:

| field | what it is | example |
|---|---|---|
| `team` | the DISPLAY spelling, the one a person reads | `Seasonal Entertainment` |
| `teamNormalized` | the COMPARISON key — trimmed, NFC, inner whitespace collapsed, lowercased | `seasonal entertainment` |

Two fields rather than one for the same reason `username` and `usernameNormalized` are two: the
thing you show and the thing you compare are not the same thing, and deriving one from the other at
every read is how a join key ends up computed two slightly different ways in two places.

`team` is **required** at creation. `createUser` has **no default for it**, so a create that names no
team throws `INVALID_TEAM` and writes nothing. `updateUser` accepts a team, which is how an admin
moves somebody; a team-only update is a legal update and no longer an `EMPTY_UPDATE`.

**There is no teams table and no new store.** The set of teams that exist is DERIVED from the users
already in the file (`store.listTeams()`). A separate table would be a second home for a fact
`users.json` already carries, and would need its own migration to stay agreed with the users — the
drift the project's one-canonical-home rule exists to prevent. The one thing a derived set cannot do
is remember a team with no members, and a team with no members has nothing to show anybody.

New files: [`server/src/auth/teams.js`](../../server/src/auth/teams.js) (the founding team,
`normalizeTeam`, `isWellFormedTeam`, and the whole argument below) and
[`server/src/auth/migrateTeams.js`](../../server/src/auth/migrateTeams.js) + its CLI wrapper
[`scripts/migrate-teams.mjs`](../../scripts/migrate-teams.mjs).

---

## How the typo case is prevented

The brief's hazard: `Seasonal Entertainment` and `Seasonal entertainmnet` silently split a team, and
the symptom is invisible races months from now. It is closed in **two parts**, because neither part
takes the other's failure. The full argument lives at source in `teams.js`; this is the summary.

**Part 1 — normalisation takes the VARIANT case** (same name, different keystrokes). Case,
surrounding whitespace, repeated inner whitespace and a pasted non-breaking space all fold to one
key. NFC and not NFKC, deliberately, matching the choice `normalizeUsername` already records —
compatibility folding can merge names that are genuinely distinct, and a wrong merge is as bad as a
wrong split. When a create's key matches an existing team, the new user **adopts that team's
existing display spelling**, so one team never accumulates two display forms.

Normalisation **cannot** take a real misspelling: `entertainmnet` does not normalise to
`entertainment`, and nothing that tried — edit distance, fuzzy matching — would be doing anything
but guessing. A join key repaired by guessing is worse than one that is wrong loudly.

**Part 2 — a closed set takes the MISSPELLING case.** A team that is not in the derived set is
**refused** (`UNKNOWN_TEAM`, HTTP 400), and the error names the teams that do exist so the admin is
shown what they meant. The only way past it is `allowNewTeam`, an explicit separate field that says
"I am founding a new team on purpose". In the UI that is a `New team…` option in a picker, which
reveals a text box only once chosen; the ordinary path — adding a colleague to the team you already
have — offers **nothing to mistype**, and the Add User button stays disabled until the team is
answered.

**The property this buys, stated honestly.** It is *not* "a typo is impossible" — an admin who
chooses `New team…` and then misspells the name still gets a second team. It is that **a typo is
never accepted silently.** Splitting a team now takes a deliberate second act, and the
invisible-months-later symptom the brief describes requires the split to have been silent.

No new store was needed, so the brief's STOP condition was not reached.

---

## The session carries the team

`requireAuth` stamps `req.authUser.team` (and `teamNormalized`) from the user record, alongside
`role`, which it has always done this way. A later piece filters on `req.authUser.team` with no
second lookup — the guard already holds the record in hand for the session-epoch check.

**It is derived per request, NOT frozen into the session at login, and that is a decision I made
rather than an omission — flagging it because the brief's wording ("the session carries the team")
could be read either way.** The pattern the brief pointed at is what settled it: `role` is derived
into `req.authUser` exactly this way, and `sessionEpoch` is the *only* user fact stamped into the
session, because the epoch's entire job is to be the OLD value, compared against the record to
detect staleness. A team stamped at login would go stale the same way with nothing to detect it: an
admin moves a user, and until that user happens to log out and back in, the server keeps filing and
showing their races under the team they left. `/api/auth/me`, `/login` and `/setup` all return the
team, so the client has it; `AuthContext` already stores the whole `/me` body, so it needed no
change.

**Nobody is locked out.** A user whose team is missing — the migration has not run, or a record was
edited by hand — **still signs in**. `requireAuth` logs a warning naming the migration and sets
`team: null`; it never refuses. Logging in is not conditional on a team at any point. This was the
one outcome the piece must not be able to produce: the owner has one admin account and no second way
in beyond `recoverAdmin.js`.

### Where the founding team comes from

Three call sites create users. Two of them cannot pick from a list, and pass the constant
**explicitly, at the call site**, so a reader can see which team a user lands in:

- `POST /api/auth/setup` — the first admin. There are no teams to choose from yet **and no admin yet
  to do the choosing**; the account being created IS the first admin. Reading a team from that
  request body would break the piece's own rule that nobody assigns their own team, since the only
  person who could put it there is the account's owner. So the first account founds the first team.
- `recoverAdmin.js`'s CREATE branch — the "locked out with no account" path, which must work against
  an empty store. Its PROMOTE branch deliberately passes no team: recovering an account is not an
  occasion to move somebody between teams.

**This is not the "silent default" the brief forbids.** That is a default standing in for an admin's
choice on the admin-facing create path, and `POST /api/users` has none — it refuses a create with no
team. At setup there is no choice to stand in for.

---

## The migration — and a count that does not match the brief

`node scripts/migrate-teams.mjs` (with `--dry-run` first). It writes through `store.updateUser`
rather than at the file, so it inherits the serialising lock, the atomic write and the `0o600`
repair instead of re-implementing three security-relevant things in the least-exercised code in the
repository. It is idempotent — a user who already has a team is skipped — so "once" is a property of
the script, not an instruction to remember. **It bumps no `sessionEpoch`, so it logs nobody out**;
that is deliberate, because a backfill that ended the owner's session would be indistinguishable,
from where he is sitting, from a backfill that broke his login.

**Result: 30 users changed, 0 skipped, 30 total. One distinct team, 0 teamless.** A second run
reported `0 joined; 30 already had a team`. The owner's `Weudl` record kept `sessionEpoch: 1`.

> ★ **The brief says "There are two users and they share one team". The store has 30.** Two are the
> real accounts — **`Weudl`** (admin) and **`testoperator`**. The other **28 are test debris**:
> `ra-admin-*`, `ra-operator-*`, `selfpw-*`, `cpcontract-*`, `sesinv-*`, `userstest-*`,
> `put-target-*`, written into `server/data/users.json` by suites that ran against the real dev data
> directory rather than an isolated one. `server/data/` is gitignored, so this is local dev state,
> not something that ships.
>
> **No team was invented for anyone** — all 30 are in the single team `Seasonal Entertainment`, which
> is what the brief asked for. **I did not delete the 28**, and flag them rather than acting:
> deleting accounts is well outside a piece that was told not to touch roles or permissions, and the
> decision of whether that debris matters is the owner's. On his own install the same command will
> report whatever is actually there.

---

## Proving it — and both halves are present

### The browser test — `client/e2e/teams-session.spec.js`, **3 passed**

The brief required a browser test because the last feature proved only at the unit layer shipped
with the defect *between the field and the race*. This drives the real controls:

1. Sign in as the admin **through the login form**.
2. Create a user **through the admin's own Team picker** on the Dev Screen, selecting the team.
3. Assert the new user is listed **with that team**.
4. **Sign out**, and sign in as that user through the login form.
5. Fetch `/api/auth/me` **from the page with `credentials: 'include'`**, so the request rides the
   session cookie the browser actually holds, and assert the team on it.

A second test asserts the admin **cannot** create a user with no team: the Add User button is
disabled, and the un-created account cannot then sign in.

★ **One real defect was found by running it, not by reasoning.** The spec must sign out, and logging
out **destroys that session on the server** — but every spec in the suite inherits one shared
`storageState` cookie from `auth.setup.js`. The first version of this spec logged the whole suite
out from under whatever ran next; the second test in the same file failed with no User Management
button, which is how it surfaced. The describe block now starts from an **empty browser state** and
signs itself in, so it owns the session it destroys. Recorded because a spec that signs out is a
suite-wide hazard, and the next one written will have the same problem.

**The Playwright MCP server failed to connect this session** (`CONNECT_TIMEOUT`). It was not needed:
the repository has its own isolated Playwright harness, which is the better instrument anyway — it
brings its own API, its own data directory and its own account, and touches neither port 4000 nor
the owner's data.

### The sabotage — the requirement is not inert

The required-team check in `resolveTeam` was replaced with a silent fallback to the founding team —
i.e. exactly the silent default the brief forbids — and the suites re-run.

**5 tests went red, at both layers:**

- 4 in `server/src/auth/teams.test.js` — `REFUSES a create with no team at all`, and the three
  parameterised cases (empty string, whitespace only, null).
- 1 in `server/src/auth/users.integration.test.js` — `admin create with NO team → 400, and the user
  is not created`. **This one is why the sabotage was worth running:** the first sabotage pass reddened
  only the store tests, which showed the HTTP layer had no coverage of its own. The route test was
  added under the sabotage, confirmed red, and is green again now — a router that forgot to forward
  `team` would have passed every store test.

The mutation was reverted (0 occurrences of the marker remain) and both files are green.

---

## Checks

| check | result |
|---|---|
| server suite | **725 passed / 725** (31 files) |
| `teams.test.js` (new) | **26 passed** |
| client `UserManagementSection.test.jsx` | **17 passed** (12 before, 5 added) |
| browser suite — `teams-session.spec.js` | **3 passed** (setup + 2) |
| `npm run verify` (plain, not `--premerge`) | **see below** |
| `engine-reach --check` | selects nothing |

`engine-reach` line, verbatim, over all 12 changed paths:

```
ENGINE REACH: none of 12 path(s) carry a change that can reach the race engine.
  12 outside the hull (cannot reach the engine at all): server/src/auth/teams.js, server/src/auth/migrateTeams.js, server/src/auth/usersStore.js, server/src/auth/guards.js, server/src/auth/authRouter.js, server/src/auth/usersRouter.js, server/src/auth/recoverAdmin.js, server/test/authAgent.js, scripts/migrate-teams.mjs, client/src/screens/DevScreen/sections/UserManagementSection.jsx, client/e2e/teams-session.spec.js, server/src/auth/teams.test.js
```

Nothing selected, so **nothing was minted** — as the brief required, and no fingerprint decision was
taken on my own authority.

**The server lint and format steps are RED for pre-existing reasons** (added on `night/2026-09-05`,
`dd0c867d` / `80f7118e`, and deliberately shipped red). **Nothing there was fixed** — that is its own
session.

---

## Source hygiene

**Changed** (lines before → after):

| file | before → after |
|---|---|
| `server/src/auth/usersStore.js` | 275 → 374 |
| `server/src/auth/guards.js` | 151 → 181 |
| `server/src/auth/authRouter.js` | 256 → 279 |
| `server/src/auth/usersRouter.js` | 101 → 119 |
| `server/src/auth/recoverAdmin.js` | 101 → 110 |
| `server/test/authAgent.js` | 64 → 75 |
| `client/src/screens/DevScreen/sections/UserManagementSection.jsx` | 325 → 462 |
| `client/src/screens/DevScreen/sections/UserManagementSection.test.jsx` | 294 → 389 |
| `server/src/auth/users.integration.test.js` | 299 → 348 |
| `server/src/auth/usersStore.test.js` | 531 → 531 |
| `server/src/auth/authRouter.test.js` | 325 → 332 |
| `server/src/auth/setupContract.test.js` | 127 → 132 |

**New:** `server/src/auth/teams.js` (100), `server/src/auth/migrateTeams.js` (69),
`server/src/auth/teams.test.js` (334), `scripts/migrate-teams.mjs` (37),
`client/e2e/teams-session.spec.js` (163).

63 `createUser({…})` call sites in existing tests gained a team. They were edited by a brace-matched
codemod that asserted its own match count, not by a regex over `role:` — run from the scratchpad,
and **no scratch file entered the repository**.

### Two contract tests were deliberately widened, and both say why at source

- `authRouter.test.js` — *"no-leak: setup/login/me success bodies contain ONLY { username, role }"*
  now names `team` as well. That guard exists so a `passwordHash`, a `sessionEpoch` or a whole user
  record can never arrive in a response; a team is neither secret nor derived from one, and is the
  same class of fact as `role`, which has always been on that list. **The list stays EXACT** —
  widening it by one named field does not weaken it; deleting its exactness would.
- `setupContract.test.js` — asserts the founding team as a **literal**, not an import of
  `FOUNDING_TEAM`. Importing the constant would make the test agree with any future edit of it,
  including a typo. Written out, changing the team a fresh install founds takes an edit in front of
  somebody.

### Noticed and deliberately left

- **28 test-debris user accounts** in the local `server/data/users.json` (above). Flagged, not
  deleted.
- **Suites write into the real dev data directory.** That is how the debris got there, and it is why
  the e2e harness had to be given `RA_DATA_DIR` of its own (E2E-LOGIN-1 already did this; the vitest
  server suites did not). Out of scope here, and it is a real piece of work — the fix is an isolated
  `RA_USERS_DB` for the server suite, not a cleanup.
- **`storageSet(KEYS.LAST_USER, …)` in `AuthContext` still stores `{ name, role }`** and not the
  team. It is a UI hint for the login screen, authorises nothing, and nothing reads a team from it.
- **Moving a user to a brand-new team from the user LIST is not possible** — the row picker offers
  only teams that exist. Founding a team happens on the create form, where the admin is already
  typing. If the owner wants to rename or found a team from the list, that is a decision, not an
  oversight.
- **No `/api/teams` route was added.** `GET /api/users` already returns every user, so the client
  derives the live teams from the list it already has. A route would be a second home for it.

---

## What this piece did NOT do, by instruction

Roles, permissions, the last-admin guard, password handling, CSRF, rate limiting and session
invalidation are untouched — a team is DATA about a user, not a permission, and nothing in
`teams.js` is consulted by `requireAuth` or `requireAdmin` to decide what anybody may do. The
client's race history, the identifier and everything that draws are untouched.

## Open for the owner

1. **His eye on the sign-in path**, which is why nothing is merged. He signs in and out himself
   before this goes near his only admin account.
2. **The 28 debris accounts** — delete, or leave.
3. Whether the team should also appear anywhere an operator can see it. Today only an admin sees
   teams, in User Management; an operator's team rides their session but is not shown to them.
