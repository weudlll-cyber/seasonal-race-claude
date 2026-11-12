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
| 7a — open registrations for the website (OWNER-4) | **done** — `(this commit)`, pushed |
| 7b — the website chat (OWNER-5) | not started |
| the stand-in's open-rounds page and chat placeholder (the owner's look) | not started |
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
