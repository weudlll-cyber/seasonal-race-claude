# RACE-HISTORY-4 — the team's races, a button that repeats one, and a short key

**Date:** 2026-09-06
**Branch:** `feat/team-races-1` (continued — no new branch). **NOT merged; the owner tests the whole
topic at once.**
**Fingerprints:** none minted. `engine-reach --check` selects nothing (line quoted below).
**Fourth and last piece of the team-races topic.**

---

## What was established first, at source

### 1. ★ The history view is ALREADY reachable by every race director

The brief anticipated that `RaceHistory.jsx` might be admin-only while the owner's requirement is
that every race director in the team sees the races. **It is not admin-only.**

- `DevScreen.jsx:95` declares the section `tier: 'operator'`, and `isOperatorTier` returns true for
  exactly that value.
- `App.jsx:98` routes `/dev` through `<ProtectedRoute>` with **no `requiredRole`**, so any
  authenticated user reaches it.

So there was no problem to solve and no reason to build a second view. **The existing one is
extended in place**, and the tree has exactly one race list — which is what the brief asked for in
the case it did not have to guess about.

### 2. The repeat path already exists, and this piece did not add another

`RUN-IT-AGAIN-1` put a `run it again` control beside the seed field
(`RaceSettings.jsx:163-175`). What it does is **`onSeedChange(lastRaceIdentifier)`** — it fills the
**seed field** with the recorded identifier, and `SetupScreen.startRaceFromIdentifier` starts it.

That is the whole path, and the row button is now a second door onto it: `repeatRace.armRepeat`
writes the identifier into **`KEYS.RACE_SEED`, the same store the field reads itself**
(`SetupScreen.jsx:130`), and the existing `startRaceFromIdentifier` runs it. **There is one starter
and it is unchanged.**

### 3. What the two stores hold

The local entry (RACE-SAVE-3) carries `inputs` — every identifier input — and `sync`
(`pending` / `sent` / `failed`). The server's hydrated race (RACE-STORE-2) carries the same input
field names by construction, with a guard at each end holding them to it. So one function reads both,
and the list needed no per-source special-casing beyond reconciling `finishedAt`/`date` and
`elapsedSec`/`duration`.

---

## The short key

**Shape:** six characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` — 31 characters, about 887 million
combinations.

**★ Both members of each confusable pair are excluded — 0 and O, 1 and I and L.** The usual approach
(Crockford base32) keeps 0 and 1 and *folds* O onto 0 and I/L onto 1. That is right for a machine
identifier and wrong here, for one reason recorded at source:

> **A fold can land on somebody else's race.** If O folds to 0, a person who mistypes a key by one
> character does not get an error — they get a **different valid key**, and if that key exists in
> their team they are shown a race they never asked for and have no reason to doubt.

With both halves absent there is nothing to fold, so a typed `O` is a typo the person is **told**
about. Input is still forgiving about everything that cannot cause that: case, surrounding space,
and the dashes or spaces a person writes a key down with.

**★ Not sequential.** Drawn from `crypto.randomInt`. A counter would tell anyone holding one key how
many races exist, roughly when each ran, and exactly which keys to try next.

**Uniqueness is CHECKED, not assumed.** `short_key TEXT NOT NULL UNIQUE`, and the insert retries on
a collision — catching only a `races.short_key` violation, so any other constraint failure still
surfaces. An attempt cap (8) means a broken random source fails loudly rather than spinning. Rows
are immutable (RACE-STORE-2's triggers), so a key can never be reassigned.

**★ It is a name, not a permission.** `GET /api/races/:key` needs a session like every route, and
the team is read from that session. **The store's `getRaceByShortKey` takes the team as a required
argument rather than an optional filter**, so a caller cannot forget it. Another team's key answers
**404 — the same answer, byte for byte, that a key which was never issued gets**, because
"forbidden" would confirm the race exists.

**The key is not in the race's content hash**, deliberately: it is random, so folding it in would
make the address of identical content different every time — the RACE-SAVE-3 dedupe defeated by the
field added for reading a race aloud.

---

## The list

`GET /api/races` — the team from the session, **paginated from the first version** with three rows
in the table. `hasMore` is answered by asking for one row more than the page rather than by a
`COUNT(*)` whose cost grows with exactly the thing paging exists to bound.

**Two sources, and a row never pretends to be the other.** Unsent local races first, then the
team's page. A race that reached the server is shown **only** from the server copy — that is the one
with a key — so nothing appears twice.

**A race that has not reached the server is listed, and says what it is:** `not sent yet`, `could
not be sent` (with the reason in its tooltip), or `this device only`. It has **no key**, and the
cell says why rather than being blank, because a blank cell would let it read as stored. **Its
button still works** — repeating is a local act that never needed the server.

An entry from before RACE-SAVE-3 has no recorded inputs; its button is disabled and says so, rather
than starting a different race.

---

## ★ The build mismatch — warn and run, and it NEEDS HIS WORD

`decodeRaceIdentifier` **refuses** a string from another build by design: a config diff read against
different defaults describes a different race. That is right for a string a stranger hands you and
wrong for a race out of your own team's history, where refusing would make every race older than
the last deploy useless.

**Implemented as the brief's decision rule for tonight:** a repeat carries the build it was recorded
under; the setup screen decodes against *that*, and when it differs from the running build it says
so **before the race starts** —

> *This race was recorded on a different build of RaceArena. It will run, but the result may not be
> identical to the original.*

**The pasted-string path is unchanged.** A long identifier typed into the field is still checked
against the running build, because nothing about it says where it came from. Only a race the person
clicked in their own team's history gets the recorded-build reading.

> ### ★ NEEDS HIS WORD
> **Warn-and-run is tonight's rule, not a decision.** The options are: warn and run (what is built),
> refuse (every race older than the last deploy becomes unrunnable), or something else — store the
> outcome and compare after the fact, or mark the repeat's own history entry as derived-from-a-
> different-build. **Nothing is proposed here**; RACE-STORE-2 recorded that the engine-change
> limitation is his to decide and this piece has not decided it.

---

## ★ What was reused, and what is genuinely new

| the question | its one home | who reuses it |
|---|---|---|
| how a race is started from recorded inputs | `SetupScreen.startRaceFromIdentifier` | the row button and the short key, both via the seed field |
| how a repeat reaches the seed field | `KEYS.RACE_SEED` — what the field reads itself | `repeatRace.armRepeat` |
| the identifier's encoding | `raceIdentifier.js` | `repeatRace.identifierForStoredInputs` |
| the shipped defaults to diff against | `storage/defaults.js` → `DEFAULT_CONFIG_WORLD` | `repeatRace.js` |
| which build is running | `raceIdentifierBuild.js` | `SetupScreen` |
| the key's alphabet and reader | `client/src/modules/raceShortKey.js` | the server imports it, as `contentAddress.js` imports `raceConfigWorld.js` |
| where races live | `raceStore.js` (RACE-STORE-2) — **extended** | `routes/races.js` |
| a race's local state | `raceHistory.js` → `SYNC` (RACE-SAVE-3) | the list's row labels |
| the HTTP call | `services/apiClient.js` → `apiCall` | `racesApi.js` |
| the history view | `RaceHistory.jsx` — **extended in place** | — |

**Genuinely new, each with one home and a header saying what it owns and what it does not:**

| module | why it is new |
|---|---|
| `client/src/modules/raceShortKey.js` | Nothing in the tree generated or read a short code — searched for before writing it. It lives client-side so BOTH sides read one alphabet; two copies is the silent-divergence shape. |
| `server/src/races/shortKey.js` | The generator only, because `crypto.randomInt` has no business in a browser bundle. It imports the alphabet rather than restating it. |
| `client/src/modules/repeatRace.js` | "Take stored inputs and make the setup screen run them" had no home. It owns exactly that and deliberately does **not** start races. |

---

## Proof

| requirement | result |
|---|---|
| a race appears in the list with a short key, and the button runs the same race | **browser — PASSED** |
| ★ a setting changed between the runs and the repeat is STILL the original race | **browser — PASSED** |
| the short key typed into the existing field runs the same race | **browser — PASSED** |
| an unknown key is refused with a message and starts nothing | **browser — PASSED** |
| an unsent race is listed with its state, no key, and its button works | **browser — PASSED** |
| a race belonging to another team is not found | `races.test.js` — see below |
| server suite | **804 passed / 804** (34 files) |
| client — `raceShortKey` + `repeatRace` | **20 passed** |
| client suite (whole) | **4585 passed** |
| server — `races.test.js` | **25 passed** |
| `npm run verify` (plain) | **PASS 20, FAIL 0, SKIP 9** — exit 0, 488.1 s |
| `engine-reach --check` | selects nothing |

**`client/e2e/race-history.spec.js` — 4 passed (setup + 3 tests), 12.0 min.** Three real races, one
per test. The run's own log shows the pending path working rather than merely asserted:
`[races] a finished race could not be sent yet; it stays on this device`.

**Another team's races** are proved at the route layer rather than in the browser, deliberately: it
needs two teams, which needs two accounts and an admin to create them — a variable in a test, a
sign-in flow in a browser. `races.test.js` asserts the list, the key lookup and the write all ignore
a team named in the request, and that another team's key gets the **same 404 body** as an unissued
one. The browser exercises the same rule through the interface with a key that names no race.

### Sabotage, twice — and ★ one of them found a real gap

**(a) Let the repeat rebuild inputs from the current machine instead of the store.**
`identifierForStoredInputs` was changed to call `buildWorldConfig()` instead of reading the stored
world.

> **Caught by 3 tests**, headed by `★ the SAME stored race yields the SAME identifier however the
> machine is set`.

**(b) Let the team come from the request instead of the session.** The write and both reads were
changed to prefer `body.team` / `req.query.team`.

> **Caught by 1 test — and that was the finding.** Only the WRITE path had a test asserting the rule;
> the two READ paths were correct but **unproven**, so the sabotage passed unnoticed on both. Two
> tests were added under the sabotage — the list and the key lookup each ignoring a team in the
> query — and it then reddened **3**. The rule was real on one path and true-by-accident on the
> other two, which is exactly what a sabotage is for.

Both were reverted; zero markers remain.

---

## Source hygiene

**Changed** (lines before → after):

| file | before → after |
|---|---|
| `server/src/races/raceStore.js` | 439 → 521 |
| `server/src/routes/races.js` | 104 → 145 |
| `server/src/routes/races.test.js` | 192 → 348 |
| `client/src/services/racesApi.js` | 59 → 95 |
| `client/src/screens/SetupScreen/SetupScreen.jsx` | 1686 → 1817 |
| `client/src/screens/SetupScreen/RaceSettings.jsx` | 202 → 243 |
| `client/src/screens/DevScreen/sections/RaceHistory.jsx` | 179 → 430 |
| `client/src/screens/DevScreen/sections/RaceHistory.test.jsx` | 134 → 145 |

**New:** `server/src/races/shortKey.js` (38), `client/src/modules/raceShortKey.js` (72),
`client/src/modules/raceShortKey.test.js` (75), `client/src/modules/repeatRace.js` (117),
`client/src/modules/repeatRace.test.js` (132), `client/e2e/race-history.spec.js` (205).

### ★ Two real defects the browser test found, and nothing else could have

**1. `RaceScreen` mutated the recorded config world, and the mutation went into the store.**

`RaceScreen/index.jsx:503` has always done `behaviorConfig.isOpen = isOpenTrack`. Since RACE-SAVE-3
that same object is `cfgWorld`, which is stored as the race's world — and for a race started from an
identifier `cfg()` returns the RECORDED object itself. So a repeated race was stored with **one key
its original did not have** (`"isOpen": false`), and the two were no longer the same race on paper
even though they ran identically.

The fix is a copy: `const behaviorConfig = { ...cfg('raceBehaviorConfig', loadRaceBehaviorConfig) }`.
`loadRaceBehaviorConfig()` already returns a fresh object, so the ordinary path never had the
problem and is unaffected. **No behaviour changed** — the engine reads the same numbers — and
`engine-reach` confirms nothing is selected.

**Only the browser could find this.** Every unit test passes a fresh object; the mutation needs a
real race started from a real identifier whose world is then compared with the original's, which is
precisely what the changed-setting assertion does.

**2. The armed repeat was consumed during RENDER and lost to StrictMode.**

`takeArmedRepeat()` was called in the component body. React StrictMode mounts, unmounts and mounts
again — the first mount spent the one-shot note, the second got a fresh ref and an empty note, and
**the button navigated to the setup screen and then did nothing.** It is now read in an effect,
guarded by a ref, and not consumed until the tracks are loaded (taking it earlier would spend it on
a render that cannot start a race). The same change removed a two-pass effect dance by letting
`startRaceFromIdentifier` take the build to decode against directly.

A third, smaller find: `sanitizeQuickTestSeedInput` shreds anything that is not a seed or an
identifier to digits, so a typed key became `234`. The short key is now the **third** form that
function passes through — the same fix RACE-IDENTIFIER-1 made for the second, in the same one place
that owns what the field may contain.

### What was removed

**Nothing of this piece's own was dead.** Every export was checked for readers outside its module:
`listRacesPage`, `getRaceByShortKey`, `normalizeShortKey`, `looksLikeShortKey`,
`identifierForStoredInputs`, `armRepeat`, `takeArmedRepeat`, `fetchRacesPage` and
`fetchRaceByShortKey` all have production callers; `generateShortKey`, `SHORT_KEY_ALPHABET` and
`SHORT_KEY_LENGTH` are read by `raceStore.js` and `shortKey.js`.

The two-pass armed-repeat effect **was** built and then solved differently — it and its
`armedRepeatRef`/`armedRepeatDone` state were removed entirely when the single-effect version
replaced them, and a grep confirms neither name survives.

### Noticed and deliberately left

- **`RaceHistory.test.jsx` needed a `MemoryRouter`** once the section could navigate, and its
  subtitle assertion followed the copy change. Both are consequences of the feature, not weakenings:
  the component genuinely routes now, and the test provides what it needs.
- **The empty state no longer waits on the server.** It used to be the only message; now the local
  half is known immediately and the server half is a separate line, so "no races recorded yet" stays
  a true statement about this device rather than a guess made while a fetch is in flight.
- **Export CSV and Clear History still act on the LOCAL history only**, exactly as before. The brief
  forbade building exporting or deleting; these predate the piece and were not touched.
- **`listRacesByTeam` is now used only by `listRacesPage` and the tests.** It is kept rather than
  folded in: the page is a view over it, the two have different jobs, and the tests read the
  unpaginated one to assert ordering without paging in the way.
- **Six paired doc citations were repointed.** Adding lines to `RaceScreen/index.jsx` and
  `SetupScreen.jsx` shifted four citations in `docs/FORCE-MAP.md` (`holdMs` twice, `bodyFillNarrow`,
  `hudCapHit`) and two in `docs/branding.md` (`brandingProfiles`, `activeBrandProfile`). Each was
  moved to the range that now contains its symbol, keeping the span so the block being cited is
  still the block. **No prose in either document changed.** `check-fallback-agreement` RULE F caught
  all six — the second time this branch has been caught by it, and the reason a symbol citation is
  worth more than a bare line number.
- **Noticed OUTSIDE what this piece touched and left, as instructed:** `check-fallback-agreement`
  still reports two long-standing UNRESOLVED mirrors —
  `cameraTimingComputation.js:maxStateDuration` and `durationModel.js:normalSpeedPxPerSec`. Named in
  RACE-SAVE-3 too; neither is mine and the guard passes with them.

---

## What this piece did NOT do, by instruction

No editing, deleting, sharing, exporting, favourites or search. The long identifier's encoding and
length are untouched — that decision is still the owner's. Nothing in the engine, the camera or
anything that draws was changed. Auth, roles and the team work on this branch are untouched.

## Open for the owner

1. **★ The build mismatch: warn-and-run, refuse, or something else.** Tonight's rule is warn-and-run
   and it needs his word.
2. **What re-running an old race should mean when the engine has changed** — unchanged from
   RACE-STORE-2 and still nothing proposed.
3. **Whether the whole topic is right**, which is what the four pieces are now waiting on.
