# FIRST-RUN-TRUTH-1 — the documented first step led to a login screen with no way past it

**Documents only.** No code changed, no behaviour changed. The software was right; the pages telling
people how to start it were not.

---

## WHAT THEY SAID, AND WHY IT WAS WRONG

`README.md` and `docs/SETUP.md` both opened with the same three lines — clone, `cd client`,
`npm run dev` — and the README then said:

> Open `http://localhost:5173` and you're in — that's enough to explore every built-in track and racer.
>
> To save your own hand-drawn tracks and their background images, also start the local backend (**optional**):
>
> Without the backend you still get all 10 built-in tracks; you just can't persist custom tracks or their images.

**Every sentence of that was true before authentication arrived and none of it is true now.**

**What actually happens**, established from the source rather than assumed. `AuthContext` probes
`/api/auth/me`. With no backend the request fails with no HTTP status, and the fallback is:

```js
const hint = storageGet(KEYS.LAST_USER);
if (!e?.status && hint) { setAuthState('offline-hint'); }
else                    { setAuthState('anonymous');   }
```

`KEYS.LAST_USER` is written in exactly one place — **inside the successful `/me` path** — so it
exists only for a browser that has already signed in at least once. A first-time visitor has no hint,
gets `anonymous`, and `ProtectedRoute` returns `<Navigate to="/login" />`.

**So the documented first step ends on a sign-in screen for an account that does not exist and
cannot be created without the backend the same page calls optional.** The offline mode the README
promises is real, but it is a *reconnection* affordance for someone who has signed in before — it can
never help a fresh install, which is precisely the case the page is written for.

---

## WHAT THEY SAY NOW

The rule was to replace a wrong sentence with the true one rather than soften it into a vague one.

**`README.md` — "See it running" rewritten.** It now opens by saying the backend is **not optional**
and why, then gives the path piece 2 made possible: build the client, `docker compose up -d`, and
open **`http://localhost:4000`** — one thing to start, one port. It then does the step the old page
never mentioned at all: **create the first admin**, because there is no default login. The
development loop (Vite on 5173 beside the API) is kept, below, labelled as what it is.

**`README.md` — the "How it works" paragraph.** It said the backend "stores hand-drawn tracks and
their background images; everything else (racers, branding, settings, history) lives in the browser's
`localStorage`". Racers, branding profiles and player groups have been server-side for months, and
accounts and sessions always were. It now names what the backend actually holds, and says
`localStorage` keeps the Dev-Panel tuning — which is what is genuinely still there.

**`docs/SETUP.md` — rewritten in running order.** Clone, build the client, start the backend, **create
the first admin**, then the development loop. It opens with a section called "The one thing to know
first" saying the backend is not optional, and it quotes the old wrong sentence so that anyone who
read the previous version can see it was withdrawn rather than quietly edited around.

**Two things a newcomer will hit are now written down.** That deleting `server/data/` to get clean
defaults takes every account with it. And that a **new client build needs `docker compose build`**,
not a restart, because the build enters the image at build time.

### A correction found by testing the documentation

The response table was written from the source and then checked against the running server, which
changed it. `POST /api/auth/setup` with a **wrong token** on an install that already has an admin
returns **409, not 403** — the setup-marker check runs before the token check, so once an install has
an admin the 409 answer is unconditional and a wrong token never reports itself. The table now says
so and gives the two rows in the order the server evaluates them.

---

## NO VALUE IS PRINTED, ANYWHERE

The bootstrap token is named as `RA_BOOTSTRAP_TOKEN` and the reader is told to copy the local value
out of `docker-compose.yml`. A first draft pasted the value into both pages; it was removed. Beyond
the standing rule about naming variables and not their values, it is the project's own
one-canonical-home rule: the value has a home, and a document that repeats it is a second one that
can drift.

---

## CHECKS

**No fingerprint, no browser gate and no client suite, and that is the answer rather than a skipped
step.** This piece changes two markdown files and nothing else. Nothing it touches is read by the
engine, the director or the renderer, so no hash can move.

The documented commands were exercised against the running server rather than trusted:
`GET /` → 200 and the app; `GET /api/auth/setup-needed` → `{"setupNeeded":false}`; the wrong-token
case → 409, which is what produced the correction above.

Document guards: `check-doc-links`, `check-index`, `check-language-closed`, `check-config-claims` and
`check-doc-facts` all green. A forward reference to a document piece 5 will create was written and
then removed — it would have left a dangling link on master, and each piece has to leave master
finished.

## CONFORMITY

- Wrong sentences replaced with true ones, not softened.
- What the software actually does was established from the source and then confirmed against a
  running server.
- No code, no behaviour, no dependency touched.
- No environment variable value printed.
- Nothing left forward-referencing a document that does not exist yet.

## PROPOSALS

**P1 — the first-admin step should be reachable from the app, not only from `curl`.** Everything else
a newcomer needs is now in the documents, but "run this curl command" is the one step that will lose
people. The client already has a `SetupAdminScreen`; whether it is reachable on a fresh install
without a token in hand was not established here and is worth one look.

**P2 (mine) — `docs/ARCHITECTURE.md` almost certainly carries the same stale claim.** The README's
"everything else lives in localStorage" sentence pointed at it for "the full picture". Fixing the
pointer without checking what it points at leaves the wrong version one click away. Not done here
because this piece was scoped to the first-run path.
