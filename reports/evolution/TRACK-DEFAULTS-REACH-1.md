# TRACK-DEFAULTS-REACH-1 — the seed is not what a running race reads

**Date:** 2026-08-25 · **Branch:** `feat/garden-path-defaults-1` ·
**DIAGNOSIS. No default changed, nothing merged, no rebuild.**

**The owner was right: the change had not reached the picture.** The cause is not the track edit — it
is where a running race reads a track's defaults from, and it is a defect that outranks the track
change, exactly as he suspected.

---

## 1. THE ANSWER IN ONE LINE

**A running race reads neither the seed nor the file on disk. It reads an in-memory Map built ONCE,
when the API process booted.** His API had been running since **2026-08-24 14:16:31**; the record was
written at **2026-08-25 20:15:41**. The process had no way to know.

---

## 2. WHERE THE DEFAULTS ARE READ FROM — at source

There are **four** places, not three, and the fourth is the one that decides:

| # | where | when it is read | what reads it |
| --- | --- | --- | --- |
| 1 | **`server/seeds/tracks/garden-path.json`** — the shipped seed | **ONLY on first boot into an EMPTY data dir** | `seedTypeFromSnapshot('tracks')` |
| 2 | **`server/data/tracks/garden-path.json`** — the live record (gitignored) | **ONCE, at API process boot** | `loadAllTracks()` |
| 3 | **`tracksMap`** — the in-memory Map | **every request** | `router.get('/')` |
| 4 | the client's `localStorage` caches | per page load, overwritten from 3 | `fetchServerTracks()` |

**The seed is copied and then never consulted again.** `seedRuntime.js` is explicit:
`if (existsSync(dest)) continue;` — *"Existing destination files are never overwritten."*

**The live record is read at MODULE LOAD, not per request.** `tracks.js:37` — *"Load all tracks into
memory at startup"* — and `:55` is `const tracksMap = loadAllTracks();` at module scope. The read
route serves from that Map (`:539`).

**And there is no migration path.** The one thing that looks like one is not: `DEFAULT_TRACKS_MARKER`
(`.tlh1-defaults-migrated`) is written and never read — its own comment says *"Legacy marker — no
behavior gating; kept for operational reference only."*

---

## 3. WHAT EACH OF THEM SAID, FIELD BY FIELD

| | `defaultRacerTypeId` | `defaultLaps` | `defaultDuration` | resolves to |
| --- | --- | --- | --- | --- |
| **the seed**, now | `beetle` | `2` | absent | **2 laps** |
| **the live record**, now (written 2026-08-25 20:15:41) | `beetle` | `2` | absent | **2 laps** |
| **what the RUNNING API was serving** — the Map built 2026-08-24 14:16:31 | **`snail`** | **absent** | **`120`** | **4 laps** |

**THE OWNER WAS LOOKING AT THE THIRD ROW — the in-memory Map**, built from the live record as it stood
**thirty hours before** the edit, when that record still carried the legacy `defaultDuration: 120` and
no `defaultLaps` at all. `trackDefaultLaps` resolves 120 through `legacyLapsFromDefaultDuration` to
**4**. Snail and 4 laps is exactly what he reported.

**HOW THIS WAS ESTABLISHED, since `GET /api/tracks` is behind `requireAuth` (`app.js:36`) and I have
no credentials:** not by reading the response, but from three verified facts that determine it — the
source above, the record's mtime, and the process start times. Stated as a deduction because that is
what it is.

---

## 4. WHICH OF THEM MY CHANGE REACHED — and the defect that outranks the track

**My change reached rows 1 and 2. It could not reach row 3, and I did not restart the process, so it
never reached the picture.** That is my error and it is the whole of why he lost the time.

**But the larger finding is row 1, and it is the same split I reported for the instruments —
one question, not two:**

> **EDITING A SHIPPED TRACK SEED CHANGES NOTHING THAT ANY EXISTING INSTANCE CAN SEE — user or
> instrument — and there is no supported mechanism by which it ever will.**

- **For a user:** the seed is copied only into an empty data dir. His instance was created long ago,
  so `server/seeds/tracks/garden-path.json` has not been read on his machine since. **The commit that
  "ships" beetle and 2 laps affects fresh installs only.**
- **For an instrument:** `raceDriver.loadTracks()` prefers `server/data/tracks` when it exists, so
  every sweep and every fingerprint reads the live record too — which is why `verify`'s routing could
  not connect the seed change to the fingerprints, as GARDEN-PATH-DEFAULTS-1 §5 reported.

**So garden-path's defaults only changed on his machine because I ALSO hand-edited the gitignored live
record** — an out-of-band step that is not part of the ship and that no user or CI run would ever
perform. **The ship, on its own, is invisible.**

**And the drift is already real, not hypothetical.** His live record still carried `defaultDuration:
120` while the shipped seed had long since moved to `defaultLaps: 4`. Both resolve to 4 laps, so
nothing showed — but his instance and a fresh install had been carrying different representations of
the same default for as long as that seed field has existed, with nothing comparing them.

---

## 5. WHAT WAS DONE ABOUT IT — and what was deliberately not

**Not touched:** no default, no seed, no live record, no rebuild of the bundle. **The bundle was never
the problem** — track defaults are fetched from the API at runtime, so the production build already
serving on 4173 is correct as built (`d73ec6a9`, `dirty: false`).

**Done:** the API process was restarted, so `loadAllTracks()` re-read the live record. That is the
only action that could make the running app agree with the disk.

- old process: PID 50392, started **2026-08-24 14:16:31**
- new process: PID 22104, started **2026-08-25 21:41:34** — **86 minutes after the record was
  written**, so the Map it built necessarily holds `beetle` / `defaultLaps: 2`

**It was restarted with the project's own documented dev environment** (`.claude/skills/dev-start`):
`RA_SESSION_SECRET=dev-secret-not-for-production` and
`RA_CLIENT_ORIGIN=http://localhost:5173,http://localhost:4173`. The fixed secret is what makes
sessions survive future backend restarts; the origin list is what lets 4173 write cross-origin.
**Verified from the browser:** a cross-origin call from 4173 to 4000 returns 200, so CORS is right;
`/api/tracks` returns 401 only because that browser has no session, which is the guard working.

**One honest caveat:** if the previous process had been started WITHOUT a fixed session secret, its
cookies were signed with a random one and **he will have to log in once more**. From this restart on,
he will not.

---

## 6. WHAT HE SHOULD SEE NOW

**Reload `http://localhost:4173`.** A page load calls `fetchServerTracks()`, which re-fetches the list
AND re-caches every geometry, so both client caches are overwritten from the API — no cache clearing
is needed.

On the setup screen, **Garden Path** should now read:

- **racer: beetle** (not snail)
- **laps: 2** selected by default (not 4)
- **estimated duration: roughly 71 seconds** (not 424)

**If it still says snail and 4 laps after a reload, the diagnosis above is wrong** and the next thing
to look at is the client's `racearena:cache:serverTracks` — but only after a reload has failed, not
before.

---

## 7. PROPOSALS

**1. A changed shipped default needs a way to reach an existing instance, and today there is none.**
This is the finding, and it is bigger than one track. `seedTypeFromSnapshot` is correct to never
overwrite a record the owner may have edited — but the consequence is that **no shipped track change
can ever be delivered**. The shapes worth considering are a seed VERSION on the record with a
migration on boot, or a Dev Screen action that re-seeds one track on request. **Both are designs, not
one-liners, and neither should be chosen tonight.**

**2. A guard should compare each live track record against its seed and REPORT the differences.**
(Mine.) It would have caught the `defaultDuration` / `defaultLaps` drift the moment it appeared, and
it would have caught this. **It must report and never overwrite** — a live record is allowed to differ
once he edits a track; what is not allowed is nobody knowing.

**3. The track API should re-read a record when its file changes, or say that it does not.** (Mine.)
`loadAllTracks()` at module scope is a reasonable design for a server whose data changes only through
its own API — but the data directory is a plain folder that people and scripts edit, and the failure
is silent and total. Either watch the directory, or make the staleness visible: the boot time is
already known, and a mtime check per request is cheap.

**4. My own step was the avoidable part, and the rule is short.** Editing a file the server read at
boot is not a change until the server has been restarted. That is the same lesson the build badge
already carries — *"`build unknown` means restart the dev server PROCESS; a file save will not fix
it"* — and it applies to the data directory just as much as to the bundle.
