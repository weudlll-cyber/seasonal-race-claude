# SETUP-STATE-PIN-1 — what happens when the marker and the store disagree, written down

**Branch:** `test/setup-state-pin-1`, off master `cc438dfb`. **MERGE APPROVED**, and merged.
**NO BEHAVIOUR CHANGED — the diff is one test file and nothing else.** What *should* happen is the
owner's decision and he has not made it.

## THE TWO QUESTIONS FOR HIM, IN TWO SENTENCES

> **1.** When the marker file is present but the users store is empty, the server is unreachable —
> `GET /setup-needed` says no setup is needed and `POST /setup` refuses with `409` before it has even
> read the token, so there is nobody to log in as and no way to create the first admin through the
> API; **should `POST /setup` treat "marker present, zero users" as setup still being needed, or is
> `scripts/recover-admin.mjs` the intended and only way back in?**
>
> **2.** When the marker is absent but users exist, `POST /setup` refuses correctly — but it does so
> *inside* the `O_EXCL` gate, so it creates the marker, discovers the users, and deletes the marker
> again on **every** attempt, leaving the disagreement in place; **should that refusal WRITE the
> marker instead, recording what the store already proves, so later attempts stop at the fast
> pre-check?**

## WHY THERE IS ANYTHING TO ASK

Setup has **two** sources of truth about whether it has already happened, and the two endpoints do
not consult them the same way:

| endpoint            | what it reads                                     |
| ------------------- | ------------------------------------------------- |
| `GET /setup-needed` | marker **absent** AND user count **zero**          |
| `POST /setup`       | the **marker alone**, as its first act             |

They agree in both ordinary states. They part company in the two states below — not on the ANSWER,
which is "setup is over" in both, but on **which check produces it, in what order, and at what
cost**. That is what nobody had written down.

## STATE 1 — MARKER PRESENT, ZERO USERS

A restored machine, a wiped `users.json`, or a marker left by a run that got that far and no
further.

| observed                                          | today                                        |
| ------------------------------------------------- | -------------------------------------------- |
| `GET /setup-needed`                               | `{ setupNeeded: false }` — on the marker      |
| `POST /setup`, correct token, valid body          | **`409 setup already complete`**, nothing created |
| `POST /setup`, **wrong** token                    | **`409`, not `403`** — the marker is checked first |
| `POST /setup`, **empty** body                     | **`409`, not `400`** — same reason            |

**This is a lock-out**, and the last two rows are what makes it visible: in this state the endpoint
answers `409` to requests it would refuse for entirely different reasons anywhere else, because it
never gets far enough to look. There is no user to log in as and no API route to create one. Today
the way back in is `scripts/recover-admin.mjs`, or deleting the marker by hand.

## STATE 2 — MARKER ABSENT, USERS PRESENT

A restored `users.json` without the marker beside it.

| observed                                          | today                                            |
| ------------------------------------------------- | ------------------------------------------------ |
| `GET /setup-needed`                               | `{ setupNeeded: false }` — on the user count      |
| `POST /setup`, correct token, valid body          | **`409 setup already complete`**, no second admin |
| the marker afterwards                             | **still absent** — created inside the gate, then unlinked |
| `POST /setup`, **wrong** token                    | **`403`** — here the token IS checked first       |
| a second attempt                                  | **identical** — nothing was learned from the first |

**The refusal is correct and it is the paranoid post-gate check that produces it** — the one that
counts users after winning the `O_EXCL` race. Without it, a restored `users.json` with no marker
would let anyone holding the bootstrap token mint a second admin. **Nothing else in the suite
covered that check**; it does now.

**The same wrong request gets `409` in state 1 and `403` in state 2.** That is the disagreement, in
one observable fact.

## THE TESTS

**Ten tests** (`server/src/auth/setupStateDisagreement.test.js`), each carrying what breaks if it is
deleted. The file builds its own store and marker on `randomUUID()` paths, so it depends on no other
file's state or order.

**One of them is a CONTROL and is there on purpose:** no marker, no users — setup is needed and it
works. Without it, "setup is refused" in the two states below would be indistinguishable from "this
fixture cannot perform setup at all", and every other assertion would be worthless.

**Every assertion is a DESCRIPTION, not a requirement**, and the file says so at the top: if one goes
red the question is "was that intended?", not "what broke?". **All ten passed on the first run** —
nothing was adjusted to fit, which is the only way a pinning file is worth anything.

**Server suite: 25 files, 665 tests, green.** `npm run verify`: PASS, FAIL 0. **No production file
changed**, so no fingerprint can move and none was measured.

## PROPOSALS

1. **Whichever way question 1 goes, `GET /setup-needed` and `POST /setup` should read the same
   predicate.** They are two statements of one rule in two places, and this block exists because
   they had drifted. One `isSetupComplete()` consulted by both would make the answer to his question
   a single edit rather than two — and would make the next drift impossible rather than merely
   unlikely.
2. **The lock-out in state 1 deserves a log line even if the behaviour stays.** An operator watching
   a machine that answers `409` to everything has nothing in the log to tell him the users store is
   empty. That is the same shape as the hole [SETUP-TOKEN-LOG-1](SETUP-TOKEN-LOG-1.md) closed one
   piece earlier, in the same handler, and it would cost one line.
