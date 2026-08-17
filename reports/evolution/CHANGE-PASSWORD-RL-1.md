# CHANGE-PASSWORD-RL-1 — a rate limit on changing your own password

**Branch:** `fix/change-password-rl-1`, off master `8d75b66b`. **The owner's decision, 2026-08-19:
the limit is FIVE.** He set the number, so nothing here invents one.

**No fingerprint can move**, established by walking each instrument's declared `reach` through
`closureOf`: `fingerprint-default` (36 files), `camera-fingerprint` (36) and `render-fingerprint`
(55) contain **none** of the four changed files. Nothing measured, because nothing measurable is
reachable. **MINTED NOTHING.**

---

## WHAT WAS REUSED, AND THE ONE THING THAT IS NEW

**The limiter is the one login and setup already use** — same package, same `rateLimit` factory
shape, same `standardHeaders`, same test skip, and **the same 429 sentence**: *"too many attempts,
please try again later"*. A third factory beside the two is a third *instance* of one mechanism, not
a second mechanism.

**No new environment key.** The window is the **login window**, read from `RA_LOGIN_RL_WINDOW_MS`
with the same 15-minute default — inventing a second window was out of scope, and a guess at the
current password is the same kind of guess against the same kind of secret. **Only the count is this
route's own**, and it is the owner's five.

**The one genuine difference, named rather than smuggled: it keys on the SESSION'S USER, not the IP.**

| | login | setup | change-password |
| --- | --- | --- | --- |
| keyed on | the IP | the IP | **`req.authUser.id`** |
| window | 15 min | 1 hour | 15 min (the login window) |
| limit | 10 | 10 | **5** |
| counts | failed only | every attempt | **failed only** |

**Why the difference is forced rather than chosen.** Login and setup are **anonymous** — there is no
caller identity to key on, so the IP is the only bucket available and its known cost is that everyone
behind one address shares it. This route is **authenticated**: `requireAuth` has already resolved
`req.authUser` from the session cookie by the time the limiter runs (it is mounted below the guard
stack in `app.js`, deliberately). Keying it on the IP would mean **one operator exhausting the budget
of every colleague at the same office address** — on a per-install tool that is the normal case, not
the exception. `ipKeyGenerator` stays as the fallback so a caller without a session still lands in an
IPv6-safe bucket rather than one shared global one.

**What is limited:** failed attempts only. Changing your password successfully five times in a row is
never punished; what is being limited is guessing the **current** password.

**What a limited caller receives:** `429` with exactly the sentence the login limiter uses. A test
asserts the two responses are equal rather than merely similar, so this route cannot start revealing
something the login path would not — not that the account exists, not that the limit is per-user.

---

## TESTS — 5 ADDED, ONE SABOTAGE-PROVEN

In `server/src/auth/rateLimit.test.js`, beside the existing ones, each with what breaks if deleted:

| test | what breaks if it is deleted |
| --- | --- |
| five failures answer normally, the **sixth** is limited | the route goes back to unlimited guessing by whoever holds a session |
| every one of the five is rejected **the same way as the first** | a caller could learn from the *shape* of the answer how close to the cap they are |
| a **successful** change is never counted | a user who rotates their password gets locked out of doing so |
| **the limit does not leak across users** | the counter silently reverts to per-IP, where one operator spends everyone's budget |
| a limited caller is told **exactly what the login limiter says** | this route starts revealing something the login path would not |

**Sabotage:** replacing the user key with the default per-IP key turns **"the limit does not leak
across users"** red — *"expected 429 to be 401"* — while the other nine stay green. That is the test
carrying the design decision, and it is the only one that can.

**Server suite green; `npm run verify` green (9 pass, 0 fail).**

---

## DOCUMENTS

**`docs/AUTH.md` §6 is the one home** and now carries all three limiters in one table with a **keyed
on** column, plus the paragraph explaining why this one differs. **No other document repeats it** —
checked across `docs/`.

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `server/src/auth/rateLimit.js` | `createChangePasswordLimiter` + its singleton; `ipKeyGenerator` imported |
| `server/src/app.js` | mounted below the guard stack, with the reason in a comment |
| `server/src/auth/rateLimit.test.js` | +5 tests |
| `docs/AUTH.md` | the rate-limit table gains the route and a `keyed on` column |

Tests added: 5. Tests deleted: 0. **Tests re-blessed: 0.**

---

## PROPOSALS

### Proposal A — the two anonymous limiters share one IP bucket per route, and nobody has decided that is right

Login is capped at 10 failures per IP per 15 minutes. On a per-install tool behind one office
address, **ten failed logins by anybody locks out everybody** — the same objection that made this
block key on the user, applied to a route where it cannot be. It may well be the right trade for an
anonymous endpoint; **it has simply never been stated as a choice.** One sentence in `AUTH.md` saying
so would stop the next reader assuming it was considered.

### Proposal B — a limiter that is skipped in test is a limiter no integration test can see

All three limiters carry `skip: () => isTest`, so the whole server suite runs with rate limiting
**off**. The unit tests here force it on through the factory, which is the right shape — but it means
**no test exercises the limiter as it is actually mounted**, and a mounting mistake (wrong path, wrong
order relative to `requireAuth`, a limiter that never sees `authUser`) would not be caught by anything.

**The cheap form is one integration test that builds the real app with the skip overridden**, hits
the real route past the real guard stack, and asserts the sixth attempt is limited. It is the same
gap `setupContract.test.js` was written to close on a different seam, and it is worth one test rather
than a rule.
