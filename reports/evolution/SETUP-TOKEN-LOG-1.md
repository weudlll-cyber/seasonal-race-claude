# SETUP-TOKEN-LOG-1 — the same 403, and now the log says which one it was

**Branch:** `fix/setup-token-log-1`, off master `5423099d`. **MERGE APPROVED**, and merged.

## THE HOLE, IN ONE SENTENCE

`POST /api/auth/setup` answers `403 setup not available` for two different reasons — no bootstrap
token is configured, and the supplied token does not match — and **only the first one wrote a line
in the server log.** So the operator who never set `RA_BOOTSTRAP_TOKEN` and the operator holding a
mistyped token read exactly the same thing from both ends: the same 403 on the wire and, in the log,
one line versus nothing.

**THE RESPONSE IS UNCHANGED AND STAYS UNCHANGED.** Its sameness is the security property: a caller
must not be able to ask this endpoint "is this server even configured for setup". What was missing
was never on the caller's side.

## THE CHANGE

One line, in the shape the neighbouring warning already uses:

```js
console.warn('[auth] bootstrap token mismatch; setup refused');
```

**No token value is logged** — not the supplied one, not the configured one, not a prefix, not a
length, not a hash. A length alone narrows a secret, and a log file is the one place a secret ends up
somewhere nobody is guarding.

`docs/AUTH.md` is the one home for this and gains the distinction in both places that describe the
gate: §1's ordered list and §2's environment-variable table. It now says explicitly that the two
cases are **identical in the response and different in the log**, and why.

## TESTS

**Five tests** (`server/src/auth/setupTokenLog.test.js`), each carrying what breaks if it is deleted.
The file builds its own store and its own marker on `randomUUID()` paths, so it depends on no other
file's state or order — the rule TEST-ACCOUNTS-1 established the same night.

The brief asked for one test — that the mismatch logs and the correct case does not. That is the
first two. **The other three exist because this change is one line near a secret**, and each guards
a way the next edit could go wrong:

| test                                                    | what it stops                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| a mismatched token writes a warning naming the mismatch | the line being removed, taking the block's whole point with it    |
| the correct token writes no bootstrap-token line        | the line firing on the SUCCESS path — a log that cries wolf       |
| **both 403s are byte-identical on the wire**            | the two cases drifting into two different responses — the leak    |
| **no token value reaches the log**                      | a later "make the log more useful" edit putting the secret in it  |
| the unconfigured case still writes its OWN, different line | the same hole reopened at the other branch                     |

**Both are sabotage-proven:**

| sabotage                                    | result                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| delete the new `console.warn`               | **red** — _"a MISMATCHED token writes a warning that names the mismatch"_ |
| append `(expected ${configured})` to it     | **red** — _"NO token value reaches the log"_                             |

**One assertion is deliberately narrower than it looks, and says so in place.** "The correct token
logs nothing at all" would be false for a reason that has nothing to do with this route: the fixture
mounts the router on a bare express app with no session middleware, so the handler's auto-login step
warns once about `regenerate`. Asserting on that would make the test about the harness, so the test
asserts the claim that matters — **no line mentions the bootstrap token** — and the comment names
the artefact rather than hiding it.

**Server suite: 24 files, 655 tests, green.** `npm run verify`: PASS, FAIL 0. **No fingerprint can
move** — nothing under `client/src` or `scripts/` changed, so no instrument's closure contains a
changed file.

## PROPOSALS

1. **Give the two 403s a shared constant.** They are two separate string literals in the same
   function today, and the security property is that they are equal. A test now asserts that
   equality, which is the right guard, but one `const SETUP_UNAVAILABLE` would make it impossible
   to break in the first place — and would make the intent visible at the point of edit rather than
   only in a test file.
2. **Ask whether the marker pre-check should log too.** `409 setup already complete` is returned
   before the token is even read and writes nothing. That case is benign when it is a second
   operator, and it is the first sign of something else when it is not — a repeated `409` from an
   address that has never succeeded is exactly the shape of somebody probing whether setup is open.
   It is the owner's call whether that is worth a line.
