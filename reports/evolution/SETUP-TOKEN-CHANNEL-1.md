# SETUP-TOKEN-CHANNEL-1 — first-admin setup can succeed again

**Branch:** `fix/setup-token-channel`, off master `15b6f465`. **No default, no engine, no camera, no
drawing.** Two production lines change, both in one client function.

---

## THE DEFECT, AND WHY THREE GREEN SUITES SAT ON IT

`client/src/services/authApi.js` sent the bootstrap token as a **body field**. `POST /api/auth/setup`
reads it with `req.get('x-bootstrap-token')` and from **nowhere else** — its own comment says *"header
only, never body"*. The server therefore saw `''`, `constantTimeEqual` failed, and every first-admin
setup answered **403 `setup not available`** — the same message it gives when no token is configured
at all, so the operator was told the wrong cause.

**A fresh installation could not create its first admin through the UI. At all.**

Three suites were green over it, and each was green for its own honest reason:

| suite | why it passed |
| --- | --- |
| `server/src/auth/authRouter.test.js` | it contains `'setup: token in req.body only (not header) → 403 — header-only enforcement'`, **a passing test asserting the rejection of exactly what the client sent** |
| `client/src/services/authApi.test.js` | it stubs `fetch` and asserts the parsed response; a mock of the transport cannot see which channel anything travelled on |
| `client/e2e/` | it creates its account by POSTing to the endpoint **directly**, with the header, never through the client function |

Every test looked at one side of the seam. Nothing looked at the seam.

---

## THE DOCUMENT WAS READ FIRST, AND IT DOES NOT DECIDE THIS

Per instruction: `AUTH.md §5` was read before anything was touched. **It does not disagree with the
server — it is SILENT on the channel.** §5 says the token is *"required by `POST /api/auth/setup`;
checked with a constant-time comparison"* and never says header or body. So there was nothing to stop
and report: the document under-determines, and the server's explicit, tested, commented choice is the
contract.

**Two things about that document are worth the owner's eye, and neither is repaired here:**

- It lives at **`docs/archive/AUTH.md`**, not `docs/AUTH.md`.
- Its own header says **"Status: DESIGN / not built"** and *"Intended SoT at `docs/AUTH.md`"* — a
  file that does not exist.

So the authentication contract's named home is an archived design document that declares itself
unbuilt, while the built system is the source of truth. That is a documentation decision, not a
sweep's call.

---

## THE FIX

```diff
-    headers: { 'Content-Type': 'application/json' },
-    body: JSON.stringify({ username, password, token }),
+    headers: { 'Content-Type': 'application/json', 'x-bootstrap-token': token },
+    body: JSON.stringify({ username, password }),
```

**The token is deliberately NOT left in the body as well.** The server would ignore it, and a secret
duplicated into a payload is one more place for it to be logged.

---

## THE CORS PREFLIGHT — THE PART NO TEST CAN SEE, MEASURED AGAINST A RUNNING SERVER

`x-bootstrap-token` is not a CORS-safelisted header, so **the browser now sends an `OPTIONS`
preflight that it never sent before.** If the server refused that header, this fix would pass every
test in the repository and still fail in the owner's browser — which is the same failure shape the
defect itself had, and is exactly what this piece must not repeat.

So it was run, not reasoned about. The real `createApp()` on an ephemeral port (**never 4000 — that
is the owner's**), with `RA_CLIENT_ORIGIN=http://localhost:5173`:

```
PREFLIGHT status                 : 204
access-control-allow-origin      : http://localhost:5173
access-control-allow-headers     : content-type,x-bootstrap-token
access-control-allow-credentials : true
HEADER ACCEPTED BY PREFLIGHT     : true

POST status                      : 201 {"username":"probeadmin","role":"admin"}
```

**A first admin was actually created, through a real preflight, over a real socket.** The mechanism:
`cors` is the **second** middleware in `server/src/app.js`, ahead of every guard, and `corsOptions`
sets no `allowedHeaders`, so the package reflects `Access-Control-Request-Headers` back. **No server
change was needed** — but that was established by measuring, not by reading the option list.

---

## THE NEW TEST, AND WHAT BREAKS IF IT IS DELETED

**`server/src/auth/setupContract.test.js`** — 5 tests. It drives the **real** `authApi.setup` against
the **real** `createAuthRouter` handler.

**If it is deleted, the exact defect returns and every other suite stays green while it does.** That
is not a prediction: it is what the repository looked like this morning. The test asserts the
**channel** — `headers['x-bootstrap-token']` — and the **outcome** (a created admin), which is
precisely what a fetch-mocking payload test cannot do.

**Why a bridge and not a mock.** `API_BASE_URL` is a module const, so the client cannot be pointed at
an ephemeral port without rewriting it. `fetch` is replaced by a **transport bridge** that hands the
request the client actually built — method, headers, body, unaltered — to supertest. Nothing about
the decision under test is simulated: the client composes the request, the server's own handler
judges it.

**A bridge can be wrong in the same direction as the code, so it is checked in both directions in the
same file.** Two of the five tests are controls: a **wrong token must be refused** (so the success is
the token and not the bridge), and a hand-built **body-only** request — the shape that shipped until
today — **must still get 403** (so the bridge is not quietly adding the header).

### It was proved by sabotage, not by assertion

The old client shape was restored and the suite re-run:

```
× the client sends the bootstrap token in the x-bootstrap-token HEADER
× the client does NOT put the token in the body
× END TO END: the real client call against the real handler CREATES the first admin
✓ a WRONG token is refused                    ← control still passes
✓ CONTROL: a body-only token is refused       ← control still passes
   Tests  3 failed | 2 passed (5)
```

Three fail on the defect; both controls hold. The fix was then restored and all 5 pass, with
`authRouter.test.js` alongside: **29/29**.

**One test deliberately NOT written.** A matching header assertion in `authApi.test.js` would catch
the same regression a few seconds sooner and cover nothing new. R7: if the answer to *what goes
unnoticed if it is missing* is "nothing", do not write it.

---

## THE CLASS SWEEP — ANSWERED BY ENUMERATION, NOT BY SAMPLING

*Does any other client call put a value in the body that the server reads from a header, or the
reverse?*

**No, and the whole contract is small enough to say so exhaustively.**

**Every header the server reads, in the entire server tree:**

| site | header | set by |
| --- | --- | --- |
| `auth/authRouter.js:54` | `x-bootstrap-token` | **client code — the one under repair** |
| `auth/csrf.js:58` | `origin` | the browser; client code cannot set it |
| `auth/csrf.js:60` | `referer` | the browser; client code cannot set it |
| `auth/csrf.js:85` | `host` | the browser |

**Every header client code sets:** 14 sites across 7 service modules. **Thirteen are
`Content-Type: application/json`.** The fourteenth is the one this piece fixed.

So there is exactly **one** piece of application data travelling in a header anywhere in this
application, and it was the broken one. The reverse direction is empty by the same enumeration:
nothing client code sets as a header is read from a body. **Nothing else to fix, and the answer is
complete rather than a spot check.**

---

## THE FINDING'S ORIGIN IS NOW IN THE REPOSITORY

`reports/audit/PROJECT-AUDIT-2026-08-18.md` was **untracked** and outside every guard's scope —
`check-index` scans three report directories and `reports/audit/` is not one of them. It was the only
copy of the finding.

Both audits are moved into `reports/evolution/` with INDEX lines, **unedited, not one word changed**:
they are another author's records, and a record you did not write is evidence, not a draft. The
supersession of the 08-17 report is recorded in the 08-18 report's own `Supersedes:` line and in the
INDEX entry, so the older file did not have to be touched either.

`reports/audit/` is left in place holding only its empty `archive/` directory, which git does not
track and which is not mine to delete.

**ONE QUALIFICATION ON "NOT ONE WORD", BECAUSE THE CLAIM SHOULD SURVIVE INSPECTION.** Both files
arrived with CRLF line endings and git normalised them to LF on commit, exactly as it does for every
file in this repository. **The text is byte-identical otherwise** — verified rather than assumed, by
diffing the committed blob against the working file with line endings stripped from both:

```
08-18: identical ignoring line endings   (1061 words)
08-17: identical ignoring line endings   (1174 words)
```

No sentence, number, link or heading differs. Said plainly here so that a later reader who notices
the line-ending change does not have to wonder what else moved with it.

---

## VERIFICATION

**No fingerprint is owed, and that is a closure walk rather than an opinion.** Walking each
instrument's declared `reach` through `closureOf`:

```
fingerprint-default.mjs  closure 36 | changed files inside it: NONE
camera-fingerprint.mjs   closure 36 | changed files inside it: NONE
render-fingerprint.mjs   closure 55 | changed files inside it: NONE
```

`client/src/services/`, `server/` and `reports/` are outside all three. Nothing in this branch can
reach the race, the camera or the drawing path.

`npm run verify` result and CI run in the merge commit.

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `client/src/services/authApi.js` | +23 −2 — two lines of code, the rest a header comment recording why the channel is the header and what the browser now does |
| `server/src/auth/setupContract.test.js` | **new**, 5 tests |
| `reports/evolution/PROJECT-AUDIT-2026-08-18.md` | **moved**, unedited |
| `reports/evolution/PROJECT-AUDIT-2026-08-17.md` | **moved**, unedited |
| `reports/evolution/INDEX.md` | 3 entries |

Tests added: 5 (one file). Tests deleted: 0. Tests merged: 0. **One test was considered and
deliberately not written** (above).

### Noticed but left

- **`authApi.test.js`'s `setup` test still asserts only the payload.** It is not wrong, it is
  narrow; the contract test now covers what it cannot. Deleting it would remove a real assertion
  about error mapping.
- **`SetupAdminScreen.jsx` shows `err.message` verbatim**, so the operator now sees the server's
  `setup not available` for a wrong token. That string is deliberately generic on the server (it does
  not reveal whether a token is configured), so the screen cannot say more without weakening the
  server. Worth a decision, not a change.
- **The e2e suite still POSTs to `/api/auth/setup` directly** rather than through the client. That is
  reasonable for a fixture — it is provisioning, not a test of setup — but it means the e2e suite
  will not catch this class either, which is why the contract test is where it is.

---

## PROPOSALS

### Proposal A — give `docs/AUTH.md` a home, or say plainly that the server is the contract

The authentication contract's named source of truth is `docs/archive/AUTH.md`, a design document that
declares itself **"DESIGN / not built"** and points at a `docs/AUTH.md` that does not exist. Today's
defect was decided by the server's own comment, not by any document.

**Two honest options, and the cheap one is fine:** either promote the built parts into a living
`docs/AUTH.md`, or add one line to the archived file saying *the built system is the contract; this
records the design it came from*. What must not persist is a pointer that reads authoritative and
resolves nowhere — the next person to hit an auth question will read it the way this piece nearly did.

### Proposal B — a contract test at each remaining seam, cheapest first

The bridge in `setupContract.test.js` is about fifteen lines and is reusable as-is. The seams left are
the six other service modules, and the class sweep above shows they are all
`Content-Type`-plus-body — i.e. the *simple* case, where the risk is not the channel but the **shape**:
a field the client names `id` and the server reads as `trackId` fails identically and just as quietly.

**Start with the two that would hurt most if they broke silently** — `usersApi` (role changes) and
`trackApi` (the owner's own track edits) — and stop when the value stops being obvious. This is
deliberately *not* proposed as "one per route": the point is to cover the seams where a mismatch is
survivable-but-invisible, not to reach a number.

### Proposal C — make `check-index` see `reports/audit/` and `reports/proposals/`

Tonight's rescue was luck: the audit surfaced in `git status` partway through a block, and if it had
not, the finding would have died with the file. `reports/proposals/` holds **17 tracked reports** and
`reports/audit/` held the only copy of a critical finding, and **no index guard looks at either**.

This is the narrow half of last night's Proposal C and it is now concrete rather than theoretical:
add those two directories to `check-index`'s scanned set and give each an `INDEX.md`. The remaining
nine report directories are archived sweep output and can stay out — that judgement should be written
down beside the list rather than left implicit.
