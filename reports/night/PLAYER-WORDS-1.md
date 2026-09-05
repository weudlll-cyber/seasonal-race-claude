# PLAYER-WORDS-1 — the player was told to run `docker compose up`

**2026-09-06.** Branch `night/2026-09-05`, piece 5 of NIGHT-2026-09-05. **Wording only.** No
behaviour, no detection, no fallback changed; the banner and the panel's own notice both stay.
Nothing minted.

---

## THE SEARCH THAT ESTABLISHED THE SET

Uncapped, whole tree, five different forms — because one form finds what that form is shaped like:

| form | what it looked for |
| --- | --- |
| 1 | `docker` / `compose` / `docker-compose` |
| 2 | `npm run` / `npx ` / `node scripts` |
| 3 | ports and hosts — `localhost:`, `:4000`, `:5173`, `:4173` |
| 4 | environment variables by name — `RA_CLIENT_DIST`, `RA_CLIENT_ORIGIN`, `RA_API` |
| 5 | the word *backend* inside a string literal |

★ **Form 1 alone would have missed it on a capped read.** The first ten hits for `compose` are all
the word *composes* in `CameraDirector.js`'s comments; the real string is the eleventh. That is why
the search is uncapped and why the forms vary.

## EVERY SITE FOUND, AND WHAT WAS DONE WITH IT

| site | player-facing? | done |
| --- | --- | --- |
| **`client/src/services/apiClient.js:36`** — *"Server not reachable. Check that the backend is running (docker compose up in the project root), then try again."* | ★ **YES** | **CHANGED** |
| `client/src/modules/track-effects/bgImageCache.js:41-44` — *"Run `docker compose up` in project root to enable custom-track backgrounds."* | no — it is inside a `console.warn` | **LEFT.** This is the console, which is where the brief says developer detail belongs. |
| `client/src/screens/DevScreen/sections/SurfaceClassManager.jsx:250` — *"Server not reachable — make sure docker compose is running"* | no — the **Dev Screen** | **LEFT.** Developers read that screen; the message is correct for its audience. |
| `client/src/screens/DevScreen/sections/SurfaceClassManager.jsx:493` — *"Remove the backend override…"* | no — Dev Screen tooltip, and *backend* is the accurate word for what it removes | **LEFT** |
| `client/src/services/api.js:18` — `'http://localhost:4000'` | no — a default value, not a message | **LEFT** |

**One string reached the player, and it is the one the owner saw.**

## WHY THAT ONE REACHES HIM

It is the message of the `Error` every service call throws when the server does not answer, and
screens render it verbatim. `client/src/screens/SetupScreen/PlayerGroupPicker.jsx:145` prints:

> Saved groups could not be loaded (**{loadError}**). You can still add players by hand below —

with `loadError` set from `e?.message` at `:62`. So the setup screen told whoever was standing at it
to open a terminal in the project root. During an event that person has neither.

## WHAT IT SAYS NOW

> Server not reachable. Try again in a moment — the banner at the top of the screen says what still
> works without it.

**★ The phrase "Server not reachable" is kept deliberately.** Four test files and two Dev Screen
alerts match on it, and it is honest player language for the condition — what was wrong was the
instruction after it, not the diagnosis. Keeping it also meant no test had to be rewritten to
accommodate a wording change, which is the right way round.

**The developer detail is not lost.** It moved to the console, said once per failure beside the
existing status report:

```
[api] the server did not answer. If you are running this locally: `docker compose up` in the project root.
```

## WHAT WAS DELIBERATELY NOT DONE

- **The banner stays**, and so does the picker's own *"You can still add players by hand below"*.
  They answer different questions — one is about the whole app, one is about this panel — and the new
  message now points at the first rather than repeating it.
- **No detection, no fallback and no behaviour changed.** The same requests fail the same way at the
  same moments.
- **The two Dev Screen strings were not softened.** A developer reading the Dev Screen is the
  audience that instruction was written for.

## CHECKS

`client/src/services`, `client/src/modules/serverStatus.test.js` and `client/src/screens/SetupScreen`
— **18 files, 261 tests, 0 failures** after the change.
