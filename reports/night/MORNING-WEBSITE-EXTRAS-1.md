# MORNING-WEBSITE-EXTRAS-1 — open registrations on the website (7a) and the website chat (7b)

**Branch:** `feat/website-extras`, from master `dcc9a250` (2026-11-12). **Nothing is merged.**
**What the owner decided (2026-11-11):** OWNER-4: open race registrations appear on the website's
home and games page, for registrations the director marks "show on the website". OWNER-5: the
website chat appears on the join page and the director's registration list, NOT on the race screen.
Everything is website mode only; standalone at "/" stays exactly as today, its CSP included.

**References, read-only** (cloned into C:/tmp/ra-refs, nothing edited there): the website
`seasonal-entertainment` master `72aac53` (contains `da618e7`), `seasonal-bingo-royale` `f655df9`,
`seasonal-mini-games` `67306ff`.

| Piece | State |
| --- | --- |
| 7a — open registrations for the website (OWNER-4) | **done** — `37c75e42`, pushed |
| 7b — the website chat (OWNER-5) | **done** — `1feefcce`, pushed |
| the stand-in's open-rounds page and chat placeholder (the owner's look) | **done** — see below |
| real-website check (nginx) | not started |

## 7a — the facts, read BEFORE building

**The website's contract** (seasonal-entertainment `docs/OPEN-ROUNDS.md`):

- `:3-4` — the games say which rounds are open; the site shows them in the home page's
  "Featured game" box and on the games page. `:12` everyone sees them, signed in or not.
- `:13-14` — only rounds the host marked "show on the website"; **the game filters**, the site shows
  what the game lists.
- `:19` — `GET <status URL>`: **public, no login, JSON, `Cache-Control max-age=30`**.
- `:20-34` — the page: `{ "version": 1, "rounds": [ { id, title, kind, startsAt, signupClosesAt,
  players, maxPlayers, joinUrl } ] }` — id ≤ 64 chars stable per round, title ≤ 80, kind ≤ 40,
  startsAt / signupClosesAt ISO 8601 UTC or null, players integer ≥ 0, maxPlayers integer ≥ 1 or
  null, joinUrl **absolute https on the same origin as the status URL**.
- `:35` — **at most 20 rounds; only rounds whose sign-up is open now and that the host marked; no
  personal data (no player names).** Unknown fields ignored; a higher version ignored whole.
- `:40-42` — **where the URL comes from:** an admin types it, Admin → Games, "Sign-up status URL"
  per game (https only, ≤ 300 chars). The race does not register itself anywhere.
- `:43-47` — **who fetches, and when: the website's SERVER**, every 60 s and at once after an admin
  saves the game, through `server/src/previews/safeFetch.js` — https on port 443 only, public
  addresses only, no redirects, 5 s, ≤ 64 KB, JSON only (safeFetch.js:6-9, :39-40).
- `:48-53` — checked strictly (`server/src/games/openRoundsContract.js`): not the contract's page →
  failure; each bad round dropped on its own: text too long or empty (`:19-20`, `:30`), a time not
  ending in `Z` (`:22-23`, `:31`), counts out of range (`:24`, `:32`), joinUrl not https or not on
  the status URL's origin (`:39`), a sign-up already closed (`:40`); only the first 20 read
  (`:15`, `:69`).
- `:54-56` — the last good answer counts for 3 minutes (`openRounds.js:19-20`, POLL_MS 60 000,
  STALE_MS 180 000).
- `docs/GAME-INTEGRATION.md:29-36` — the race is the third embedded game; its slug is `race`.

**How Bingo serves it** (seasonal-bingo-royale, the reference the race follows):

- `apps/server/src/http/routes/openRounds.ts:77-85` — `GET <base>api/public/open-rounds`, rate
  limit 60 a minute per address, `cache-control: public, max-age=30`, `{ version: 1, rounds }`.
- `:49-59` — open now (lobby, not started, lobby window not closed), `show_on_website`, no test
  match, no bots; soonest first; `LIMIT 20`.
- `:63-74` — `id` = the match id, `title` cut to 80, `kind` = the game's name, `signupClosesAt` =
  the lobby's close, `players` / `maxPlayers` = counts, `joinUrl` = the lobby on the endpoint's own
  public address (`SBR_PUBLIC_URL`, else `https://<request host><base>`, `:81`).
- `:12-13` (header) — **standalone: the option does not exist and the list is empty.**
- `apps/server/src/db/migrations/0017_show_on_website.sql` — the per-match flag;
  `packages/contracts/src/http/openRounds.ts:19-33` — the same contract in zod.

## 7b — the facts, read BEFORE building

**The website's embed** (seasonal-entertainment `docs/EMBED.md`):

- `:15-17` — `/embed/chat?room=<slug>&theme=<light|dark|auto>` shows only the chat, compact, no site
  header or footer. `:19` room: a room's slug, e.g. `race`. `:21-23` theme `auto` (the default) follows
  the site's own rule.
- `:24-26` — **room rules apply unchanged: a guest can read `general` but not `race` (members only)**;
  the frame then opens the guest's first room with "This room isn't available."
- `:33-37` — on the site's own pages the login state is the site's own: the session cookie applies as
  on any page; logging in is on the site's login page.
- `:45-49` — the race's row: room `race`, "Seasonal Race", **`/embed/chat?room=race&theme=auto`**.
  `:57-61` the race's room is the first-start room, members read and write.
- `:66-68` — framing: the games are under `/games/<slug>/` on the site's own domain, so its
  `frame-ancestors 'self'` lets them frame `/embed/chat`; nothing to approve.
- `:173-203` — the postMessage API (`ready`, `unread`, `resize` from the chat; `visible`, `theme` to it),
  each side checking origin, source and `data.source`. `:187-188` a host on another site must not send
  `no-referrer`.
- `:205-217` — **the snippet**: "the same for this site's pages (the race game) … a relative [src] on
  this site"; `<iframe id="se-chat" title="Chat" src="…/embed/chat?room=race&theme=auto"
  style="width: 100%; height: 32rem; border: 0">`.
- `docs/GAME-INTEGRATION.md:188-196` — the same embed URL for the race; `:198-202` **Required: allow the
  iframe in the game's `frame-src` CSP; keep a referrer (`strict-origin`) so Firefox can identify the
  parent**; validate messages; `:204-205` Bingo embeds the chat without the unread and visibility
  messages.

**How the reference games embed it:**

- Bingo `apps/web/src/shell/ChatDock.tsx:5-14` — website mode only, on the lobby, match screens and the
  host console, behind a "Chat" button (a side panel, a drawer on phones); the frame created on first
  open and kept; `:162` `<iframe className="chat-panel__frame" title="Chat" src={src}>`; it follows the
  game's theme. Standalone: no button, no frame, no request.
- Bingo `apps/server/src/http/plugins/securityHeaders.ts:33-34` — `'frame-src': ["'self'"]` ("the
  website's chat frame is on the same site; nothing else may be framed"); `:48` `referrerPolicy:
  no-referrer` for its pages. Mini Games `apps/server/src/http/plugins/securityHeaders.ts:76` the same
  no-referrer; its `frame-src` admits the website's room path (`apps/server/src/chat/provider.ts:119`).

## 7b — what was built

**Client.** `client/src/components/WebsiteChat/WebsiteChat.jsx` (new): renders NOTHING unless
`SITE_MODE === 'website'`; otherwise a "Chat" section in the app's panel tokens with `<iframe title="Chat"
src="/embed/chat?room=race&theme=auto" loading="lazy" referrerpolicy="strict-origin">`, full width, 32rem,
no border. Mounted in exactly two files: `JoinPage.jsx` (after `<main>`, in the page's centred column)
and `RegistrationPanel.jsx` (below the list and the form; below one registration's detail, **not while
the full-screen QR stage is up**).

**Server.** `server/src/csp.js`: `frame-src 'self'` in website mode only; `frame-ancestors 'none'` in both;
the mode resolved once.

**Tests.** `WebsiteChat.test.jsx` (new, 3): standalone renders nothing; website mode the exact
attributes; **by the source, exactly two files import it** (the join page and the registration panel —
so the race screen, the result screen and the start ceremony cannot draw it). `JoinPage.website.test.jsx`
+1 (framed below the card, after the form, outside `<main>`); `JoinPage.test.jsx` (standalone: none);
`RegistrationPanel.website.test.jsx` +2 (below the list after the form; on the detail, gone while the QR
stage is shown); `RegistrationPanel.test.jsx` (standalone: none). `csp.test.js` +3: **standalone's
header pinned byte for byte** to what master `dcc9a250` sent (captured before the change, with and
without a public origin), and website mode's `frame-src 'self'` with `frame-ancestors 'none'`.

**Sabotage, each RED then restored:** the mode check removed (3 red); `WebsiteChat` imported into
`RaceScreen/index.jsx` (1); the chat rendered beside the QR stage (1); the chat above the join form (1);
`frame-src` in every mode (2 — the pinned standalone headers); `frame-src` dropped in website mode (1).

**Reused:** `SITE_MODE` (runtimeMarker.js); the app's panel tokens (`--color-surface`, `--radius`,
`--color-muted`); the join page's centred column width; the piece-4 test harnesses. **Removed:**
nothing. **Moved out:** nothing. **Lines (before → after):** JoinPage.jsx 201 → 208, its CSS 123 → 130;
RegistrationPanel.jsx 680 → 688; csp.js 62 → 68; new WebsiteChat.jsx 58, its CSS 31, its test 87; tests:
csp 84 → 121, JoinPage 162 → 165, JoinPage website 107 → 120, panel 371 → 373, panel website 166 → 187;
docs: AUTH.md 446 → 457, OPERATOR-GUIDE.md 580 → 587; BACKLOG 7708 → 7712 and OPEN 541 → 538 (the 7a/7b
row to PART TWO). **Fingerprints:** none (`engine-reach --check`: nothing reaches the engine).

## The stand-in, for the owner's look (dev and test only, never in the image)

`scripts/website-standin.mjs` (286 → 369 lines; not in the image — server/Dockerfile copies three named
scripts and nothing else of scripts/): **`/_standin/open-rounds`** asks the race's
`GET <base>/api/public/open-rounds` from its own process, as the website's server does, and lists the
rounds as the website's home page and games page would (title, kind, places, closes at, Join) — linked
from the stand-in's page; **`/embed/chat`** is a placeholder that names the room it was asked for
(escaped), so the frame on the race's join page and registrations is visible. Its tests
(`standin.integration.test.js`, 249 → 284): +2 — a marked open registration listed and an unmarked one
not; the placeholder names the room and escapes markup. The ten existing tests unchanged and green.

## 7a — what was built

**Server.** `GET <base>/api/public/open-rounds` (`server/src/website/openRounds.js`, new), mounted in
`server/src/app.js` ONLY when `RA_MODE=website` and listed on `PUBLIC_PATHS` (`server/src/auth/guards.js`):
standalone has nothing there and answers the API's own 404. `{ version: 1, rounds }`, `Cache-Control:
public, max-age=30`, at most 20, soonest deadline first; each round exactly the contract's eight fields.
The registration store gains `show_on_website` (check-then-alter; NULL outside website mode),
`setShowOnWebsite` (team-scoped, open only, website-mode registrations only) and `openRoundsForWebsite`
(open now AND marked — never a name, entry, external id, team or internal id). The director's create
takes `showOnWebsite` in website mode (**false unless given**); `POST /api/registrations/:id/website
{ show }` toggles it (website mode only; in standalone it falls through to the API's 404). CSRF: the
global origin guard, as for every write.

**Client.** `RegistrationPanel.jsx`: one `ShowOnWebsiteBox` — on the create form (off by default) and
on an OPEN registration's detail — drawn only when `SITE_MODE === 'website'` (the runtime marker);
`registrationApi.js` sends `showOnWebsite` and gains `setShowOnWebsite`.

**Tests.** `server/src/website/openRounds.integration.test.js` (new, 10): public + max-age=30 +
version 1; a marked open one with EXACTLY the eight keys and the values (title, kind, Z time, counts,
joinUrl on the public origin with the base path); **no leak** — a member joined first, and the answer's
text contains neither their name, the entry id, the external id, the registration id nor the team; an
unmarked, a closed-early and an expired registration absent; the title cut to 80; create OFF unless
ticked; toggle on/off and the list follows; another team's id 404 and unchanged; closed 409; a member
without "may host" 401; standalone 404. `registrations.test.js` +2 (standalone refuses the field, the
toggle is no route); `registrationStore.test.js` (an older file gains the column, lists nothing);
`RegistrationPanel.website.test.jsx` +4 (off by default and sent; ticked sent as true; toggles on an
open one; none on a closed one); `RegistrationPanel.test.jsx` (standalone: no box, nothing sent).
Server suite 78 files / 1354 tests green.

**Sabotage, one per proof, each RED then restored:** route mounted in standalone (1 red); unmarked
listed (3); closed-early listed (1); expired listed (1); an extra field `eventName` in a round (1);
create defaulting to ON (1); toggle always setting on (1); toggle ignoring the team (1); client: box
ticked by default (2); box drawn in standalone (1 — **the first try stayed GREEN**: the standalone test
looked for the box only after the form had been replaced by the view; the assertion was moved before
the click, then red).

**Reused, not written again:** the join route's limiter factory (`createJoinLimiter`, its own
instance — 60 a minute, Bingo's number too); `resolvePublicOrigin` / `resolveBasePath`
(`runtimeConfig.js`) for the join link; the store's `rowById` / `isClosed` / `countOf` / `iso` and its
`refusal` codes (`answerRefusal` in the route); `unknownFields`; the panel's `styles.choice` and
`SITE_MODE` from `runtimeMarker.js`; the piece-4 test harness (`as()` sign-in through the website).
**Moved out:** the store's two copies of check-then-alter (`addRacedColumn`, `addWebsiteAccessColumn`)
now share one private `addColumnIfMissing`, which the new column uses too (both exports kept).
**Removed:** nothing. **Lines (before → after):** registrationStore.js 589 → 673; routes/registrations.js
187 → 213; app.js 172 → 177; guards.js 272 → 276; RegistrationPanel.jsx 642 → 680; registrationApi.js
120 → 133; new website/openRounds.js 83, its test 258; tests: store 348 → 355, routes 216 → 239, panel
366 → 371, panel website 116 → 166; docs: API.md 1363 → 1396 (81 → 83 routes, fourteen → fifteen
routers), AUTH.md 435 → 446, OPERATOR-GUIDE.md 572 → 580. **Fingerprints:** none —
`engine-reach --check` on all 16 paths: none can reach the race engine.

## Forks decided

*(updated after every piece)*

1. **7a: `id` is the registration's public CODE, not its internal id.** The contract needs a stable id
   (≤ 64); the internal id is team-internal (`toPublicView` never shows it), while the code is in the
   join link the website shows anyway — so it reveals nothing new.
2. **7a: `title` = "<event name> — <track>", or the track alone; `kind` = "Seasonal Race"; `startsAt` =
   null.** The contract has one title and no track field; the brief asks for track and event name. The
   race's name on the website is "Seasonal Race" (its EMBED.md:49). A registration has no start time
   (the director starts the race), and null is allowed (OPEN-ROUNDS.md:27).
3. **7a: standalone answers 404, where Bingo answers an empty list** (openRounds.ts:12-13). The brief
   says 404; it is also what "the endpoint exists only in website mode" means here.
4. **7a: a FULL registration stays listed** (players = maxPlayers) while it is open, as Bingo lists a
   full lobby (its query does not filter on places); the website shows the counts.
5. **7a: `joinUrl` origin** = `RA_PUBLIC_ORIGIN` (the installer sets `https://<SITE_DOMAIN>` in website
   mode), else `https://<request host>` as Bingo does (openRounds.ts:81). The local stand-in look runs on
   http, so its join links are http there — the website would drop those; the real check uses https.
6. **7a: the status URL is the website admin's to enter** (OPEN-ROUNDS.md:40-42): Admin → Games →
   "Sign-up status URL" = `https://<site>/games/race/api/public/open-rounds`. The race registers itself
   nowhere; OPERATOR-GUIDE says so.
7. **7a: rate limit = its own instance of the join limiter** (60 / minute / address) rather than sharing
   the join route's bucket, so a busy join minute never starves the website's poll and vice versa.
8. **7b: the chat sits BELOW the page, always there, not behind a button.** Bingo puts it behind a
   "Chat" button in a side panel; the brief places it "below the page's own content … without pushing
   the join form or the registration controls off a phone screen", which a section after the content
   does by construction. `loading="lazy"` instead of Bingo's created-on-first-open.
9. **7b: `referrerpolicy="strict-origin"` on the FRAME, the page headers unchanged.** The website
   requires a kept referrer (GAME-INTEGRATION.md:199); Bingo and Mini Games send `no-referrer` for their
   pages, as the race does (helmet's default). Putting it on the iframe alone meets the website's rule
   without touching standalone's headers.
10. **7b: no postMessage.** Neither `unread` nor `resize` is needed for a frame that is always shown at a
    fixed height; Bingo does not use them either (GAME-INTEGRATION.md:204-205). Nothing to validate,
    nothing sent.
11. **7b: `theme=auto`**, the URL the website's own table gives the race (EMBED.md:49). The race has one
    (dark) theme and no theme switch to follow.
12. **7b: not on the full-screen QR stage** — it is part of the registration's detail but is shown to
    an audience, so the brief's "not on any screen shown to an audience" wins there.
13. **BACKLOG: the 7a/7b row moved to PART TWO now** that both are built, as the brief says, marked
    unmerged; the merge is the owner's, after his look.
