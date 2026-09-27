# MORNING SHEET — DELIVERY-CLEAN-3, the cleanup night

**One page, read top to bottom.** Six pieces, one branch each, merged before the next was cut.
Started from master `298d6290` on 2026-09-27. The OPEN section at the foot is regenerated from the
tree each time, never appended to.

---

## PIECE 1 — B9, WARN WHEN THE TRANSPORT IS INSECURE · **MERGED**

**Closed the row you could not otherwise have known about.** The startup now says, in plain words,
when sign-in would travel unencrypted.

★ **No runtime behaviour changed.** The cookie default is exactly as it was; only an advisory line
appears. **Changing the default is still your decision** — what is closed is that nobody was told.

**The line, and when it is silent:**

| environment | says |
| --- | --- |
| the shipped default (no `NODE_ENV`, no `RA_COOKIE_SECURE`) | ★ **warns** — *"SIGN-IN TRAVELS UNENCRYPTED — the password and the session cookie are readable by anything on the network path"* |
| `RA_COOKIE_SECURE=true` | silent |
| `NODE_ENV=production` | silent |
| `RA_COOKIE_SECURE=auto` | ★ **silent** — trust-proxy decides per request, so this cannot know, and nagging a correctly-proxied install is the noise that file exists to prevent |

★ **Sabotaged both ways**, because a warning that cannot go quiet is noise and one that cannot fire
is decoration: forcing it never to fire reddens the FIRES test; forcing it always to fire reddens
all three SILENT tests.

★★ **One thing worth knowing: adding it changed what "fully configured" MEANS.** Seven of the ten
existing readiness tests failed the moment the line existed, because their fixture had never
answered the transport question. Updated deliberately, and the test file now says so.

★ **The rule now has one home.** `resolveCookieSecure` moved to
`server/src/auth/cookiePolicy.js` and is re-exported by `session.js`, so every caller is unchanged.
It had to move: `startupReadiness.js` needs the rule and must not import `session.js`, which pulls
in `better-sqlite3` and would break that file's promise to be judgeable without an environment. The
alternative was a second copy of the rule, which this project does not do.

**Server suite 870** (was 863). engine-reach: none of 4 paths can reach the engine.

---

## PIECE 2 — P2, THE THREE UPLOAD RESPONSES → ONE · *not started*

## PIECE 3 — P3, THE JSON-STORE PREAMBLE · *not started*

## PIECE 4 — C8, THE DEV DEPENDENCY · *not started*

## PIECE 5 — P6, 77 UNUSED LOCALS · *not started*

## PIECE 6 — THE SWEEP · *not started*

---

## STILL YOURS TO DECIDE — untouched this night, by your own instruction

P1 (`CameraDirector.js`) · P4 (`RaceScreen/index.jsx`) · P5 (the two Dev Screen sections) · the bind
(B4) · base-image pinning (C5) · the 30-day cookie (C7) · the backup checksum. **And now also: the
cookie default itself** — piece 1 made the situation visible without changing it.

---

## THE OPEN LIST — regenerated from the tree

**PART ONE: 7 non-audit subjects + 8 open DELIVERY-CLEAN rows = 15.** `docs/OPEN.md` lists **15**.
The two agree.

★ Piece 1 **closed B9** and opened nothing.

---

## BLOCKED

Nothing so far.
