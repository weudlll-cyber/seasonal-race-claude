# BACKLOG-VERDICTS-1 — 128 open entries, 16 closed against the tree, 7 that are only his

**Read-only pass. Nothing in the repository was edited, staged or committed.** The revised file is
`piece9-BACKLOG.md` in the scratchpad, ready to copy over `docs/BACKLOG.md`.

**Method, stated before the numbers.** Every verdict was checked against the tree at `e4b2b075`
(master) — at source, by running the entry's own `verify:` command, or by `git log -S` on the symbol
the entry names. **Nothing was closed from recollection.** Where a search returned nothing, a control
that returns something was run first: `render(<RaceScreen` returns nothing while `render(<` matches in
34 test files; `racerTypeId|targetLaps|targetDurationSec` returns nothing on `ResultScreen/index.jsx`
and six lines on `SetupScreen.jsx`.

---

## ★ THE FOUR NUMBERS

| | count |
| --- | --- |
| **OPEN BEFORE** | **128** |
| **CLOSED TONIGHT** (12 ALREADY DONE + 4 MOOT) | **16** |
| **STILL TRUE** | **105** |
| **NEEDS HIS WORD** | **7** |

16 + 105 + 7 = 128.

**Two further entries were moved but are not counted as closed tonight**, because they already carried
a closure marker and were merely sitting in the wrong part: *THE CLIENT SUITE STARVES ITSELF*
(✅ BOUNDED, "NEEDS: nothing") and *Documentation / merge ROADMAP into BACKLOG* (`- [x]` DONE). So
PART TWO gains **18** entries, of which **16** were carrying an open status.

**What "entry" counts as.** A checkbox item, a bullet item, or — where a whole section is one subject
with one status — the section. Six lists were given one verdict covering every member and are counted
by member: Phases 5–7 (13 boxes), V-6…V-9 (4), T-1…T-4 (4), Known Limitations (6), Parking Lot (5),
Gap-reroll (3). PART ONE's unticked boxes fall from 47 to 38.

---

## THE EVIDENCE TABLE — every ALREADY DONE and MOOT

| entry | verdict | evidence | date it landed |
| --- | --- | --- | --- |
| ⚠ TWO UNMERGED BRANCHES CARRY FIGURES MEASURED AGAINST A DEFECTIVE BASELINE | ALREADY DONE | Both branches are in master, as he asked: `f01ff8ea` merge(AIM-LEVERS-1), `73053d25` merge(AIM-ROOM-SHIP-1). The floor shipped — `leaderAimRoomFloorPx: 360` in `defaults.js`, tag `v-ship-aim-room` — candidate A removed. The carried-forward river-run item was re-measured on a tree that ships the floor: AIM-ROOM-COMBINED-1 (9 → 7 events) and AIM-ROOM-PAN-ANATOMY-1 `d4b09759` — **not pans, a zoom of up to ×1.94 in one frame; the shot stays; neither candidate is the author** | 2026-09-02 |
| THE CLIENT SUITE STARVES ITSELF | ALREADY DONE *(relocated; was already marked done)* | Built `77be7904`, confirmed on the merged tree `d7a860f5`. Its **three labelled hypotheses** were settled by CROWDING-INFERENCES-1 `1c5763ab`: CPU **confirmed** (13 workers 85–87%, 4 workers 47%), "the 15 extended-timeout tests are the load" **REFUTED as stated** (bound buys −65%/−77%, deleting the heavy files −9%/−17%; count is 12 not 15), bound **deliberately not retuned** | 2026-08-27; hypotheses 2026-09-01 |
| WHICH FIELDS OF A SHIPPED TRACK BELONG TO THE PROJECT | MOOT | SEED-SNAPSHOT-1 `d93fcfdf` made his runtime records the shipped seeds — `server/seeds/tracks/garden-path.json` now carries all four of his `surfaceClasses`, read at source. SEED-REDELIVERY-1 `b9dc8102` (merge `22e6eadf`) answered delivery without a per-field rule: **whole unit**, only on a hand-raised version in `server/seeds/versions.json`, operator warned | 2026-08-31 |
| TWO FILES STILL DOCUMENT THE FLAG THAT COMMIT REMOVED | ALREADY DONE | GATE-SERIAL-BCRYPT-1 `9089c479` — the same commit that closed the item above it in the same section. `scripts/verify.mjs` now schedules on `exclusive: !shape.singleWorker` derived from `server/test/suiteShape.mjs`; `ci.yml` states the flag was removed. Neither file asserts `--no-file-parallelism` | 2026-08-26 |
| THE ARBITER … CANNOT SEE ANYTHING THAT SHIPS AS DATA (the ⏳ advisory half) | ALREADY DONE | REACH-ADVISORY-1 `585899be`: `scripts/engine-reach.mjs:41` imports `dataReach`, `:257` computes its data prefixes from it. The routing half had already closed on 2026-08-27 | 2026-09-01 |
| A SHIPPED TRACK CHANGE STILL REACHES NOBODY | ALREADY DONE | SEED-REDELIVERY-1 `b9dc8102`: `server/src/seedDelivery.js`, `server/seeds/versions.json`, `GET /api/seed-notices` + SetupScreen banner. `seedRuntime.js:36` still never overwrites — deliberately; delivery moved rather than being bolted onto first boot | 2026-08-31 |
| EDITING A SHIPPED TRACK SEED CHANGES NOTHING ANY EXISTING INSTALL CAN SEE | ALREADY DONE | same as above | 2026-08-31 |
| garden-path still wears the snail | ALREADY DONE | GARDEN-PATH-BEETLE-SKIN-1 `ba4a4442`. Read at source: the seed's icon is 🪲, description *"…scuttle through the roses."* | 2026-08-26 |
| Documentation — merge ROADMAP into BACKLOG | ALREADY DONE *(relocated; was already `- [x]`)* | Its own command: `git grep -c "" docs/ROADMAP.md` returns **31** — the redirect ROADMAP-FOLD-2 left | 2026-08-23 / 2026-08-27 |
| THE BADGE STILL HAS NO WATCHER | MOOT | The decision it asks for was answered **NO** (PART TWO D5), and the silent failure was removed by BUILD-FROM-OUTSIDE-1 `a24f47e2` (merge `c10c6b12`): `server/src/app.js:59` answers `/api/health` with `build: buildIdentity()`, reporting `unknown` **and the reason** | D5 2026-08-23 |
| A Dev Screen change does not reach a running race | MOOT | Declined twice — PART TWO **D5**, closed as a decision so it stops being re-proposed. Source unchanged on purpose: `RaceScreen/index.jsx:221`, `useState(() => loadCameraConfig())`, no setter | 2026-08-23 |
| Phase 5 — Basic admin auth (JWT, bcrypt) | ALREADY DONE | `server/src/auth/` (`authRouter.js`, `guards.js`, `csrf.js`, admin role, bootstrap); `bcrypt ^6.0.0` at cost 12. **Landed as a signed session cookie + SQLite session store, not a JWT** — no `JWT_SECRET` exists. Discharges the ⚠️ auth prerequisite heading Phase 5 | phase L auth arc, pre-2026-08 |
| Phase 6 — Environment config (CLIENT_ORIGIN, JWT_SECRET, DB_PATH) | ALREADY DONE | `RA_CLIENT_ORIGIN`, `RA_SESSION_SECRET`, `RA_DATA_DIR`; documented by ENVIRONMENT-DOC-1 `09aeb7f6` — `docs/ENVIRONMENT.md`, 21 variables, missing- vs wrong-behaviour separated | 2026-09-01 |
| HYGIENE PHASE — the engine-input module list beside `WORLD_CONFIG_KEYS` | ALREADY DONE | CAMERA-HYGIENE-1 2/n `aff558a3`: `ENGINE_INPUT_MODULES` in `client/src/modules/raceConfigWorld.js`, and `engineInputs.test.js` fails when `raceCore.js` imports a module the list does not name | 2026-08-03 |
| Background cache for offline play | MOOT | Resolved by removal (L.4-BgCacheRemoved), which the entry itself records: `trackCache.js` deleted, four helpers gone. Not scheduled | 2026-06-18 |
| Repository hygiene — tags and branches need a curation pass | ALREADY DONE | The KEEP-LIST exists and is enforced both ways. **Ran it:** `node scripts/check-tags.mjs` → *"123 origin tags checked, 0 unregistered; 123 declared in the register, 0 missing at origin."* Register = `docs/TAGS.md`, guard = `scripts/check-tags.mjs` (`582438d4`). Branches: `git ls-remote --heads origin` = **1**, against the 6 recorded. SHIP-CEREMONY step 12 (`7bb7dfe5`) now binds branch clearing to every merge | guard 2026-07-31; branches by 2026-09-02 |
| PHOTO_FINISH DevScreen accordion | ALREADY DONE | CAMERA-FRAMING-1 `e4a7fd14` — `CameraAdvancedSection.jsx:34-45` gives PHOTO_FINISH its own row and label | 2026-08-02 |
| Hero-count as a DevScreen range | ALREADY DONE | B2-attacker ship `8bf54cad` — `DynamicsTuningSection.jsx:1381` renders `b2AttackHeroes` as *"B2-attacker count (0–5)"*, min 0 / max 5 / step 1 | 2026-07-20 |

**Every count the closed entries carried is stale, and three are stale by a lot:** 180 local tags →
**123**; 6 remote branches → **1**; 51 worktree stubs → **3** (that one is still open).

---

## THE SEVEN THAT NEED HIS WORD — now in one place

They sit in a new `###` subsection under the existing `## NEEDS HIS WORD — decide these first`. The
section's own reasoning for keeping such items in place is left standing, so a later reader can see
the trade this pass made.

1. **The race identifier** — a short typable one that refuses to exist when it would lie, a long
   copyable one, or both. (Sharpened by SEED-PARITY-1: the seed field agrees, the ROSTER diverges.)
2. **The render fingerprint's hand-written frame camera** — the repair moves the hash, so it is a
   mint. Confirmed still a three-member literal; `frameCameraInputs` reaches five client files and
   that instrument not at all.
3. **The authored BEATS never reach the camera** (D14's open point) — confirmed: no code in
   `client/src/modules/camera` reads a hero's beats. His call, and it needs his eye afterwards.
4. **Coarser fairness bands** — he fixes the band count before any work starts.
5. **The story layer** — no mechanism until he fixes the definitions.
6. **Camera block reset** — not actionable until he restates the symptom.
7. **Camera weights — relative or absolute** — a design question he deferred.

---

## THE STILL-TRUE ENTRIES WORTH KNOWING ABOUT

- **Four of them are tonight's own remaining pieces** and are named as such in the verdicts, so
  nobody re-diagnoses them: *Garden Path does not finish* and the 200-second ceiling (**piece 11**),
  *nothing measures motion* (**piece 12**), *the race-identity hash* (**piece 13**), *the worktree
  stubs* (**piece 14**).
- **Piece 13 started while this pass was running, and the verdict says so.** `git status` was clean
  at the start of this pass and now shows `scripts/lib/raceDriver.mjs` modified with an uncommitted
  `raceHash` — identity including the roster's NAMES, plus the canonicalised camera config, which is
  exactly what the entry asked for. **Nothing of that was touched.** The race-identity-hash entry is
  left STILL TRUE at `e4b2b075` with the in-flight work named, because it is not committed; it closes
  when that lands. *(Consequence for whoever applies piece 9: the line numbers this pass quotes for
  `raceDriver.mjs` — `:201`, `:273`, `:319` — are the committed ones and have already moved in that
  working copy.)*
- **FORCE-PARITY's headline is already closed and the entry does not say so.** It calls O1 "the
  sharpest", and O1 is the one that is gone: `computeFinishT` no longer exists in the sim,
  `sim-fairness.mjs:1101` passes `runoutZone: behaviorConfig.runoutZone`, closed by the
  speed/duration ship `9e41c2bd` (2026-07-24) and recorded as closed in
  `docs/archive/FORCE-PARITY.md`'s own row 7. O2–O6 are unchanged, so the entry stays.
- **"BEFORE SIZING ANY SPRITE CHANGE" has a withdrawn last sentence.** *"There is no separate harness
  racer table to drift"* was refuted 2026-09-01 by SPRITE-TABLE-DRIFT-1. Both tables have since been
  repaired (`de99f690`, `56b99a9d`), and the body rule now has a written home (BODY-IS-THE-BOX-1,
  `54e32cd3`). The warning itself still binds.
- **PR-G is half done and reads as whole:** `requestFullscreen`/`exitFullscreen` are wired at
  `RaceScreen/index.jsx:1717-1719`; **Cancel Race exists nowhere in the client.**
- **Three watch items are past their own threshold and have been for months** — TrackManager **654**,
  BrandingProfiles **566**, `racer-types/index.js` **540**, RacerEditModal **670**, against a 400-line
  watch. Re-measured, not carried.
- **D3.6 got more expensive while nobody looked.** REGISTRY-LITERALS-1 put the racer-type registry
  inside the engine hull (36 → 76 files), so renaming `racer-types/` → `racer-configs/` now pays the
  world fingerprint.

---

## WHAT I COULD NOT CHECK MECHANICALLY — said plainly

- **Whether garden-path finishes.** The file contradicts itself and this pass did not settle it. The
  2026-08-25 section says garden-path completes **20/20** since the beetle; `camera-fingerprint.mjs:327`
  says today, in a comment written for CHECKS-FIRE-1, that its "at least one track" gate exists
  *because* garden-path does not finish inside the harness's 200 s ceiling. Those are plausibly two
  different harnesses (the sweep driver at 2 laps, and the fingerprint instrument), but **no race was
  run for this pass**, so I recorded both and left the entry STILL TRUE rather than closing it on the
  more convenient of the two. It is piece 11's to settle.
- **Every manual-verification item** (V-1, V-2, V-5 through V-9, Q-13's eye-test half, Q-19's flake).
  A grep cannot perform a UI check or settle an intermittent failure. Each verdict says so in those
  words rather than implying a measurement happened.
- **Q-19 specifically:** the file still exists and three green runs still cannot settle an
  intermittent failure. Worse, the client suite is now bounded at 4 workers (2026-08-27), so any
  future count is taken against a **different configuration** than the one that produced the flake.
- **The design questions.** HOW MUCH ACTION, THE CLOSING PHASE ENDS WHATEVER WAS RUNNING, the SPREAD
  field measurement and the road-edge standing measurement all wait on measurements that do not exist
  in the tree. I confirmed the absence (no closing-phase cut in `CameraDirector.js`, no road-edge
  guard among the eighteen `scripts/check-*.mjs`) — I did not take the measurements.
- **Phase 5's "Basic admin auth" is a judgement, not a grep.** Auth exists with bcrypt, guards, CSRF
  and an admin role, but as a **session cookie, not a JWT**. I closed it on the requirement and said
  in the verdict that the mechanism differs from the phase text. If he reads that box as "JWT
  specifically", it reopens.
- **The Known Limitations section.** One of its six — *Pan target identification*, priority medium
  with a named mitigation — reads like work rather than a limitation. I left it there; promoting it
  is a decision this pass had no authority to take.

---

## TWO THINGS ABOUT THE DELIVERABLE ITSELF

- **No prose was reflowed or reworded.** Verified mechanically: every non-blank line of the original
  `docs/BACKLOG.md` appears in the new file, character for character — **0 missing**. The 136 added
  lines are verdict lines and the two new section headers.
- **Two hazards the moves create, named rather than left to be found.** PART TWO now carries a second
  `## Documentation (2026-08-07, from DOC-ORDER-1)` heading beside the one already there, because the
  entry was moved whole rather than merged into it. And B4c's phrase *"the camera-timing-levers item
  above"* now points at an item that moved into the NEEDS HIS WORD section — B4c's verdict line says
  where it went.

---

## NOT DONE, DELIBERATELY

Three closed arcs still sit in PART ONE with their own ❌/CLOSED markers — *Evolution Act 2*,
*Evolution Act 1* and *Front Act / C1* — as does the whole *Completed Items* table. They are not open
entries, so they got no verdict and were not moved. Under the file's own rule that a subject appears
in exactly one part they belong in PART TWO, but moving several hundred lines of already-marked
history is a different order from this one.
