# RACE-SAVE-3 — a finished race is written locally, then to the server

**Date:** 2026-09-06
**Branch:** `feat/team-races-1` (continued — no new branch). **NOT merged; the topic merges once.**
**Fingerprints:** none minted. `engine-reach --check` selects nothing (line quoted below).
**The owner's rule this is built on, 2026-09-06:** the race is written LOCALLY FIRST, always. The
server is a SECOND store, never a gatekeeper.

---

## What was established first, at source

### 1. The local write, as it was

`ResultScreen/index.jsx:206-227` wrote the entry inline — `id`, `date`, `trackId`, `duration`,
`playerCount`, `seed`, `raceActionStage`, `winners`, `finishOrder` — and capped with
`history.slice(0, 100)`. Confirmed exactly as the brief described.

### 2. ★ The full input set was NOT reachable where the result is written

`ResultScreen` reads `sessionStorage.raceResults`, whose `race` field is the `raceData` payload that
`SetupScreen` built and `RaceScreen:1163` copied through. That payload carries seven of the nine
identifier inputs: `geometryId`, `racerTypeId`, `racers` (the name list), `racePlanSeed`,
`raceActionStage`, `targetLaps`/`targetDurationSec`, `racePlanEnabled`.

**It does not carry the config world**, and that is the one that matters most — it holds the tuned
racer values. `worldConfigOverride` is set on `raceData` only when a race was started FROM an
identifier (`SetupScreen.jsx:735`); for an ordinary race it is absent, and `RaceScreen` reads the
host's `localStorage` through the loaders instead.

**Where it IS available:** `RaceScreen/index.jsx:524`.

```js
const cfgWorld = raceData.worldConfigOverride ?? buildWorldConfig({ raceActionStage });
```

That is the world the race actually ran with, gathered once, at race start — the same value the
config badge and the camera marker use, so all three cannot disagree.

**What carrying it took:** one field on the `raceResults` payload (`worldConfig: cfgWorld`). The two
lines are in the same `useEffect` (it opens at `:393` and closes past `:1300`), so `cfgWorld` was
already in scope at the write; nothing had to be lifted into a ref.

**What was NOT done, and why:** `ResultScreen` could have called `buildWorldConfig()` itself. That
reads the Dev Screen **as it is now** — change a racer value while the result is on screen and the
stored race would claim values it never ran. The brief named this and it is real: `RaceScreen:487-497`
is the comment recording that every loader reads the host, and `RACE-ACTION-CONTROL-1` had already
moved the action stage into the payload for the same reason.

> ★ **A correction to the brief:** it attributes this to "the defect RACE-IDENTIFIER-2 fixed".
> **There is no RACE-IDENTIFIER-2** — `reports/evolution/` holds `RACE-IDENTITY-1.md` and
> `RACE-IDENTITY-HASH-1.md`, and neither is it. The *principle* is real and is recorded at source in
> `raceIdentifier.js:8-14` (RACE-IDENTIFIER-1) and in `RaceScreen:507-510`
> (RACE-ACTION-CONTROL-1). Named so a later reader does not go looking for a report that is not
> there.

### 3. How the client already knows the server is gone

`modules/serverStatus.js` (SERVER-GONE-1). It **never makes a request**: it holds one value written
by a `racearena:server-status` window event that `apiClient.js` and `trackLoader.js` dispatch from
the requests the application was making anyway. Its header states the rule this piece obeys — *"a
status light that polls is a background job, and a background job that runs while a race is running
competes with the race for the main thread."*

An HTTP status of any kind counts as **reachable**; only a transport failure, CORS refusal or the
client timeout counts as **unreachable**. This piece uses `subscribeServerStatus` and adds no second
signal, no timer and no reconnection loop.

---

## What a pending race looks like locally

The entry is the same object it always was, with two fields added:

```js
{
  id, date, trackId, duration, playerCount, seed, raceActionStage, winners, finishOrder,  // unchanged
  inputs: { identifierVersion, buildId, geometryId, racerTypeId, names, racePlanSeed,
            raceActionStage, targetLaps, targetDurationSec, racePlanEnabled,
            worldSchemaVersion, worldConfigs, racerTypeOverrides, effectiveRacerTypes },
  sync:   { state: 'pending' | 'sent' | 'failed', serverId?, error?, at? }
}
```

**No outbox.** A second list beside the history would be a second thing to keep in step, and the two
would drift the first time a race was deleted from one and not the other. **Nothing is duplicated
inside the entry either**: `inputs` carries only inputs, the outcome stays where it already was, and
`toServerPayload` reads each from its one home.

An entry whose payload carried no world — an older build — gets `inputs: null` and `sync: null`. It
is **not** queued and its inputs are **not** invented from this machine; it stays an ordinary
history entry, exactly as every entry written before this piece is.

### The three states

- **`pending`** — the server has not taken it. Sent on the next successful contact.
- **`sent`** — stored, with the server's id.
- **`failed`** — refused for a reason retrying cannot fix (a 400). **The entry is kept**, with the
  reason on it, so a person can see that this race never went up and why. Nothing is ever deleted.

---

## ★ What happens at the 100 cap

**Today's cap deletes.** `history.slice(0, 100)` would drop the earliest races off the end — and
with the server down, those are exactly the ones that have not been sent. An evening of more than a
hundred races would lose the first ones silently.

`capHistory` keeps the newest hundred **plus every entry behind them that is `pending` or
`failed`**. The consequence is deliberate: **while races are unsent the list can be longer than a
hundred.** That is the trade — the cap exists to stop unbounded growth, and a race nobody has stored
yet is not something to discard to save space. A `sent` race is capped normally, because the server
has it. A legacy entry (no `sync`) is capped normally, because it was never going to be sent.

---

## The route

`POST /api/races`. 201 stored · 200 already stored · 400 malformed · 503 the account has no team.

- **★ The team comes from `req.authUser.team`**, stamped by `requireAuth` from the user's record per
  request (TEAMS-1). **A `team` in the body is ignored** — there is a test that sends one and asserts
  the race lands in the session's team and *not* in the one the body asked for.
- **Operator+, on purpose.** Every operator runs races and every operator's races must be kept. It is
  authenticated (not on `PUBLIC_PATHS`) and deliberately absent from `ROUTE_POLICY`.
  `routePolicyDrift.test.js` carries the matching entry — that guard fired when the route was added,
  which is it working.
- **Retryability is carried by the STATUS CODE and only by it.** A `retryable` field in the body
  beside the status would be a second home for one fact. 400 means these bytes are wrong; anything
  else is worth another attempt. (This was written with such a field first, then removed on review.)

### The same race arriving twice

The store gained `client_race_id TEXT NOT NULL UNIQUE`, and `storeRace` looks it up **before**
anything else. The id is the one `ResultScreen` already minted with `newId()`, so a retry, a double
click or a second tab all carry it.

Keyed on the client id rather than on the content hash, because the two answer different questions:
a hash asks "are these bytes identical", and a resend rebuilt from the same race can differ in a
field that does not matter while still being the same race. There is a test for exactly that.

---

## When a pending race is sent

**On the next successful contact the client makes anyway.** `startPendingRaceSync` subscribes to
`serverStatus`; the transition to `reachable` happens because some *other* request succeeded — the
auth probe, the track list, a save. **No polling, no timer, no reconnection loop was added.**

It also flushes once at start-up if the status is already `reachable`, because a status that is
already reachable never transitions, and waiting for a transition would strand races left over from
a previous session until the next outage.

`flushPendingRaces` sends oldest first and **stops at the first race it cannot send** — if one fails
the server is not taking races, and walking the rest to fail identically costs a request each.

---

## Proof

### ★ The browser test — `client/e2e/race-save.spec.js`, **PASSED** (1.8 min)

One real race, run with **every `/api/**` request aborted** for its whole length:

1. Set up while the server answers; drop the field to 2.
2. **The server is stopped.**
3. Quick Test → `/race` → **the race runs to the end and reaches `/results`**. This is the line the
   piece may not cross, and it is asserted rather than assumed.
4. The result is on screen; the entry is in `localStorage`, carrying `inputs` (with the config world
   and the effective racer types) and marked **`pending`**.
5. **The server returns.** Nothing polls — navigating to `/setup` loads tracks, that request
   succeeds, the status flips, and the subscription flushes. The entry becomes **`sent`** with a
   server id, and its local id is unchanged.
6. The same race is POSTed twice more through the browser's own session: both answer **200** with
   `alreadyStored: true` and **the same stored id**, which is also the id the client already had.

The run's own log shows the mechanism working rather than merely the assertions passing:

```
[races] a finished race could not be sent yet; it stays on this device: Server not reachable.
```

**Why the server is stopped by aborting requests rather than by killing the process:** the API is
managed by Playwright's `webServer` for the whole run, so killing it would take every later spec
down with it. The client cannot tell the two apart — `apiClient.js` splits on *"was there a status"*,
and an aborted request has none, which is precisely the unreachable case.

**What the browser test deliberately does not assert:** that the row is stored once and under the
right team, read back from the server. **This piece builds no route that can read races** — that is
the fourth piece. Those properties are proved in `server/src/routes/races.test.js`, where the store
can actually be inspected.

### Sabotage, twice — and what caught each

**(a) Make a failed send drop the race silently.** `sendOne`'s transport-failure branch was changed
to delete the entry from the history and say nothing.

> **Caught by 3 tests** in `pendingRaces.test.js`: `★ a transport failure KEEPS the race pending —
> nothing is lost`, `★ STOPS at the first race it cannot send`, and `never throws, whatever the API
> does`.

**(b) Make a resend create a second row.** The client-id dedupe was removed from **both** halves of
the one mechanism — the store's lookup and the route's early return.

> **Caught by 2 tests** in `races.test.js`: `the second arrival is accepted QUIETLY and yields the
> same race`, and `dedupes on the CLIENT id even when the resent payload differs`.
>
> ★ Worth recording: the store's **content-hash** dedupe still absorbed the identical-payload case,
> so `storing the same race twice is idempotent` stayed green. That is exactly why the client-id
> check is the one that matters — the case it uniquely catches is the resend whose payload differs,
> and that is the case a real retry produces.

Both sabotages were reverted; zero markers remain.

---

## Checks

| check | result |
|---|---|
| server suite | **792 passed / 792** (34 files) |
| client — `raceHistory.test.js` | **19 passed** |
| client — `pendingRaces.test.js` | **14 passed** |
| server — `races.test.js` | **11 passed** |
| browser — `race-save.spec.js` | **PASSED**, 1.8 min |
| `npm run verify` (plain, not `--premerge`) | **PASS 19, FAIL 0, SKIP 10** — exit 0, 405.2 s |
| `engine-reach --check` | selects nothing |

```
ENGINE REACH: none of 16 path(s) carry a change that can reach the race engine.
  16 outside the hull (cannot reach the engine at all): server/src/races/raceStore.js, server/src/routes/races.js, server/src/routes/races.test.js, server/src/app.js, server/src/auth/routePolicyDrift.test.js, server/src/races/raceStore.test.js, client/src/screens/RaceScreen/index.jsx, client/src/screens/ResultScreen/index.jsx, client/src/modules/raceHistory.js, client/src/modules/pendingRaces.js, client/src/services/racesApi.js, client/src/components/PendingRaceSync.jsx, client/src/App.jsx, client/e2e/race-save.spec.js, client/src/modules/raceHistory.test.js, client/src/modules/pendingRaces.test.js
```

### ★ verify FAILED first, and caught two real defects of mine

The first run was **FAIL 3** — and two of the three were my code, not bookkeeping. Both are worth
recording because both are invisible to a reader and to every test I had written:

1. **`check-fallback-agreement` RULE F.** Inserting 12 lines into `RaceScreen/index.jsx` **shifted a
   line-anchored citation in a document**: `docs/FORCE-MAP.md` cited
   `index.jsx → holdMs` at `#L1189-L1195` twice, and `holdMs` had moved to `:1207`. The citation was
   repointed to `#L1201-L1213`. This is the paired-citation mechanism doing exactly what it was
   built for — a bare line number cannot be wrong out loud, and a symbol citation can.
2. **`client-suite` — `raceActionWiring.test.js`.** That guard asserts the race path never contains
   a bare `buildWorldConfig` call with no stage, because such a call reads the host's stored stage
   instead of the race's. **My new COMMENT contained that exact call form**, and the guard is a
   source-text check that does not care whether a match is code or prose — which is deliberate, and
   the same convention RULE A states for literals in comments. The comment was reworded to describe
   the call instead of spelling it.

Neither would have been found by running the code. The third failure was `check-index`, which is
simply the report not yet being indexed.

**`RaceScreen/index.jsx` was touched and is still outside the hull** — the hull is `raceCore.js`'s
import closure, and a screen file that writes a payload is not in it. Nothing selected, so nothing
was minted.

### What the test suites write, and where

**They write to a temp directory, and nothing of this piece reached the owner's data.** Verified
after the full run and both sabotages: `server/data/` contains `sessions.sqlite` and **no
`races.sqlite`**, and `users.json` still holds the same three accounts the owner was left with
(`Weudl`, `testoperator`, `testadmin`).

`server/test/env-setup.js` redirects `RA_DATA_DIR` per test file, as RACE-STORE-2 established. On
top of that, every store in `raceStore.test.js` and `races.test.js` is opened at an **explicit**
temp path and deleted afterwards. **No account or record was created by hand during this piece**, so
there was nothing to delete again.

---

## Source hygiene

**Changed** (lines before → after):

| file | before → after |
|---|---|
| `server/src/races/raceStore.js` | 406 → 439 |
| `server/src/races/raceStore.test.js` | 436 → 445 |
| `server/src/app.js` | 82 → 84 |
| `server/src/auth/routePolicyDrift.test.js` | 165 → 172 |
| `client/src/screens/RaceScreen/index.jsx` | 2061 → 2073 |
| `client/src/screens/ResultScreen/index.jsx` | 389 → **385** |
| `client/src/App.jsx` | 138 → 141 |

**New:** `server/src/routes/races.js` (104), `server/src/routes/races.test.js` (197),
`client/src/modules/raceHistory.js` (245), `client/src/modules/raceHistory.test.js` (248),
`client/src/modules/pendingRaces.js` (119), `client/src/modules/pendingRaces.test.js` (211),
`client/src/services/racesApi.js` (59), `client/src/components/PendingRaceSync.jsx` (24),
`client/e2e/race-save.spec.js` (138).

`ResultScreen` got **shorter**: the history write moved into `raceHistory.js`, where it can be
tested without a screen, and three now-unused imports went with it.

**Also changed:** `docs/FORCE-MAP.md` (2 citation line ranges repointed — see above). No prose in
that document changed.

### Noticed and deliberately left

- **★ `writeHistory` was wrong on its first draft and its own test caught it.** It reported success
  for a write that had not happened, because `storageSet` **catches the quota error itself and
  returns `false`** (`storage.js:91-100`) rather than throwing. Waiting for a throw would never
  fire. It now reads the return value; the try/catch stays only for what `storageSet` cannot absorb.
- **A `retryable` field in the response body** was written, then removed: the status code already
  carries that fact and two homes for it would drift.
- **The store's `size` column** — already removed in RACE-STORE-2 for the same one-home reason; the
  new `client_race_id` column is a real fact about the race, not a derived one.
- **Nothing shows a pending or failed race to the player yet.** The state is on the entry and the
  console says what happened, but no screen renders it. The history piece owns what a person sees,
  and inventing a banner here would be a second server-status message beside SERVER-GONE-1's.
- **`RA_RACES_DB` is still undocumented in `docs/ENVIRONMENT.md`.** Flagged in RACE-STORE-2 and still
  true; the route now has a consumer, so it belongs there — but that document is a living doc with
  its own guard, and adding to it is a decision about scope this piece did not take.
- **A race that arrives while the session has expired** answers 401, which is treated as retryable,
  so the race stays pending and goes up after the next sign-in. Deliberate: the alternative is
  marking it failed for a reason that fixes itself.

---

## Open for the owner

1. **Whether a pending or failed race should be visible on a screen**, and where. Today only the
   entry and the console know.
2. **What re-running an old race should mean when the engine has changed** — unchanged from
   RACE-STORE-2 and still nothing proposed.
