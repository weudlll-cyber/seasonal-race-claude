# RaceArena — Integrations

**Owns:** the documented interfaces through which an external site may use a RaceArena installation,
what each one allows, and how it is secured. The setting that turns them on is documented in
[ENVIRONMENT.md](ENVIRONMENT.md); the other HTTP routes are in [API.md](API.md).

## Purpose, and the principle above it

Some operators will run RaceArena beside a site of their own — a club or community site where players
already have accounts. Such a site may want to put its signed-in players into a race without each of
them typing a name into the public join link. This document is the contract for that.

**The game never needs it.** [PROJECT-PRINCIPLES.md](PROJECT-PRINCIPLES.md) §11 (the owner's decision
of 2026-10-20): the game is always installable and fully functional on its own; an external site may
use it through documented interfaces, and no feature may require one. So every interface here is
**off unless the operator sets `RA_INTEGRATION_KEY`**, and an installation without it is complete:
players register through the public link (OPERATOR-GUIDE.md, "Player registration").

**Accounts belong to the external site, not to the game** (the owner's decision of 2026-10-21). In
the game itself players register **by name only** — there are no player accounts in RaceArena. A
player who joins *with an account* does so on an external site with signed-in players, and that
site passes its account data through this interface:

| the site sends | stored with the entry | the site gets back |
| --- | --- | --- |
| `name` — the display name shown in the race | `name` | `entry.name` |
| `externalId` — the player's account id on the site | `externalId`, beside `source: "integration"` | `entry.externalId` |
| — | the entry's own id and arrival time | `entry.id`, `number` (place in the list), `capacity`, `placesLeft` |

The director sees these entries in the same live list as everyone else's, marked as coming from the
integration. Nothing else about the site's account is sent or kept.

## Turning it on

Set `RA_INTEGRATION_KEY` to a long random value (32 characters or more) in the server's environment
and restart. Give the same value to the external site, which keeps it on its server — never in a
browser, a page or an app. To change it, set a new value and restart; the old one stops working at
once. Unset, every route below answers `404` exactly as a path that does not exist.

## Add a player to a registration

```
POST /api/integrations/registrations/<code>/entries
Authorization: Bearer <RA_INTEGRATION_KEY>
Content-Type: application/json

{ "name": "Ada", "externalId": "your-user-id-42" }
```

- `<code>` is the registration's public code — the last part of its join link
  (`https://<this server>/join/<code>`). The director opens the registration in RaceArena and gives
  the link or the code to the site.
- `name` is the name shown in the race. The same rules as on the join link: not empty, at most the
  player-name length limit, and not the same name as one already registered (capitals and extra
  spaces do not make a name different).
- `externalId` is the player's id on your site, required. One external id registers once per
  registration.
- The entry counts against the same places, closes at the same deadline and appears in the
  director's list like any other, marked as coming from the integration.

**Answer `201`:**

```json
{ "entry": { "id": "…", "name": "Ada", "externalId": "your-user-id-42" },
  "number": 3, "capacity": 20, "placesLeft": 17 }
```

`number` is the player's place in the list (in the order names arrived), `capacity` the number of
places, `placesLeft` how many are still free after this one — enough for the site to show "You're
in, number 3 of 20" (`placesLeft` added 2026-10-21).

**Errors** — every refusal is JSON `{ "error": "<sentence for a person>", "code": "<CODE>" }`:

| status | `code` | when |
| --- | --- | --- |
| `404` | — | `RA_INTEGRATION_KEY` is not set (the body is the server's usual "no such API route") |
| `401` | — | no `Authorization: Bearer …` header, or not the configured key |
| `400` | `INVALID_NAME` | the name is empty or too long |
| `400` | `INVALID_ENTRY` | `externalId` is missing or empty |
| `400` | — | the body has a field other than `name` and `externalId` |
| `404` | `NOT_FOUND` | no registration has this code |
| `409` | `CLOSED` | the registration is closed (its deadline passed, or the director closed it) |
| `409` | `FULL` | every place is taken |
| `409` | `DUPLICATE_NAME` | the name is already registered |
| `409` | `DUPLICATE_EXTERNAL_ID` | this external id is already registered |
| `413` | — | the body is over 1 KB |

## Security notes

- **The key is the whole permission.** Anyone holding it can add names to any open registration whose
  code they know. Keep it on the external site's server only, and change it if it may have leaked.
- **Server to server only.** The route takes no session and sends no cookie, and it is not covered by
  the browser-origin (CSRF) check, because a browser cannot attach an `Authorization` header to a
  request from another site without the server's permission (CORS), which RaceArena does not give to
  unconfigured origins. Call it from your server, not from a page.
- **Compared in constant time.** Both the sent key and the configured one are hashed to 32 bytes and
  compared with `timingSafeEqual`, so the answer's timing says nothing about the key.
- **It reveals nothing it does not have to.** The answer names only the entry it just added; it never
  lists other players, the director or the team.
- **No rate limit of its own.** The caller is one trusted server; the registration's capacity bounds
  what it can add.
- **Over HTTPS.** Put the server behind HTTPS (DEPLOYMENT.md) before turning this on; the key travels
  in a header.

The code: `server/src/routes/integrations.js`; its tests: `server/src/routes/joinSecurity.integration.test.js`.
