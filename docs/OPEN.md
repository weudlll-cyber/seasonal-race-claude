# What is open — DERIVED from BACKLOG PART ONE, 2026-09-26

★★★ **THIS PAGE IS DERIVED. `docs/BACKLOG.md` PART ONE IS THE LIST; this is the short view over it.**
Re-derived on **2026-09-25**, from PART ONE's **seven** rows — after the owner's decisions of that
day, after RACE-SOURCE-1, DEVSCREEN-STOCKTAKE and STAY-ON-THE-FINISH-1. Each of those changed what a
row below SAYS without changing how many rows there are; the count has been seven since the decisions
were recorded.
Where the two disagree, **the backlog wins** — and the date above is how a reader tells at a glance
whether this has gone stale again.

★★ **WHY IT WAS REBUILT, because the failure is the interesting part.** The version before
2026-09-25 was the harvest of 2026-09-24: a page assembled BESIDE the backlog rather than from it.
Within a day the backlog went from 32 open rows to six, and this page still listed eleven items under
"needs his word" — among them the race identifier, the track backgrounds, the render fingerprint and
the naturalness envelope, all four already settled. **One page said six and the other said something
else**, which is how the owner came to be told "32 open" on a morning when it was not true. That is
the same disease the backlog itself was cured of the day before, one level up.

★ **The rule that follows from it:** the OPEN section below is PART ONE, one line per row, pointing at
the backlog for the detail. Nothing is added here that the backlog does not carry.

★ **WHAT THE OWNER'S DECISIONS OF 2026-09-25 DID TO THIS PAGE.** Section 1, *needs only his word*, is
now **EMPTY** — every question it held was answered, dropped or turned into commissioned work that
day. The list below therefore contains no questions at all: **all seven rows are work.**

---

## 0 · THE OPEN LIST — all seven, from BACKLOG PART ONE

*One line each. The backlog row is the detail; this is only the map.*

1. **A sweep that asks for races and gets none still prints a table and exits 0.** Narrowed
   again 2026-09-26 — `resolveTrackScopeIds` (a second door on `scripts/lib/trackScope.mjs`)
   brings five more `scripts/diag/` tools under the refusal; ten file-based analysers are NAMED
   as resisting the shape.
2. **`0xC0000142` — the dev server loses the ability to spawn any child.** It has now happened twice.
   Narrowed 2026-09-25: the watcher no longer spawns (18 git children → 0 over a 20-save burst); the
   Windows condition itself is not closed and cannot be closed from here.
3. **Period evaluation — COMMISSIONED 2026-09-25**, replacing "season scoring". A table over a period
   the user chooses, counting NAMES. ★ **The marker is BUILT (RACE-SOURCE-1, 2026-09-25):** a stored
   race records how it was started, and **absent means test** — so excluding Quick Tests is now a
   filter over a recorded fact. **The evaluation itself is not built.** The points rule is
   dev-screen-configurable and **no numbers are adopted**.
4. **Tenancy — the boundary is stated (2026-09-25), the work is not done.** PER TEAM: brands, player
   groups, team-created tracks. SHARED: the shipped tracks and the racer types. Races are scoped
   today; tracks, brands, racers and player groups are not. Preparation, not a defect.
5. **Going online.** One subject: a domain, a proxy choice, and four build items that do not exist
   yet. His word plus a purchase.
6. **Two production-arm specs fail** — `comeback-precedence` and `garden-path-finishes`.
   ★★ **The camera is FINE (2026-09-26, second pass).** Twelve seeds driven through the browser:
   **seven cast a comebacker and all seven were cut to** — a comeback shot can and does occur in an
   ordinary race. The night's "the browser declines the shot" question is **WITHDRAWN**: its three
   fixtures cast no comebacker in the browser either, because the diag that chose them races
   40 synthetic racers where the Quick Test races 20 real ones. Re-pinned to a browser-validated
   fixture. ★ **The margin is repaired (2026-09-26): the spec now derives the hold gate from the
   product's own timing function instead of a hardcoded number nobody decided. No run has failed on
   it since.** ★★ **What keeps this row open is a bigger finding:** on one fixture, two runs of five
   produced **no comeback shot at all**. Accepting a comeback offer is a coin flip at a shipped
   weight, drawn from the camera's own random stream, which is not seeded from the race — so a spec
   that asserts the shot occurs cannot pass reliably, and what to do about that is a decision, not a
   margin. ★ The reusable lesson is now in the spec's header: the camera is not determined by the
   race seed, so a browser spec must assert a property, never a sequence.
7. **`B-UX2`, the dev screen's reorganisation — COMMISSIONED 2026-09-25**, with `B-UX3` folded in.
   Narrowed again 2026-09-26: the nine MISLEADING tooltips are repaired and the structural cause
   is closed (a new `check-tooltip-values` guard refuses any UI string stating a config value, wired
   into `verify --premerge`). Inventory tally column 3: **204 MATCHES / 0 MISLEADING / 1 SUSPECTED
   DEAD / 1 RESERVED = 205**. The two structural oddities (`minTargetScreenPx` collision and the
   reset-scope disagreement) are established from source, not acted on. Three candidate groupings
   are on his desk in
   [DEVSCREEN-GROUPINGS-1](../reports/evolution/DEVSCREEN-GROUPINGS-1.md); no candidate renames a
   stored key, and no recommendation is made. **The reorganisation itself is untouched and no
   layout is designed** — that is what keeps this row open.

→ [BACKLOG.md](BACKLOG.md) PART ONE for every one of them.

---

## 1 · NEEDS ONLY HIS WORD

*A sentence from him and it can proceed. Nothing has to be built or measured first.*
★★ **EMPTY, 2026-09-25 — and that is the state, not an omission.** Eleven rows were checked at the
tree that day. Three closed on the re-verification, four were already struck records, and the owner's
decisions of 2026-09-25 closed, dropped or commissioned the rest. **Nothing is waiting on his word.**
The rows that came out of those decisions are WORK, and they are in
[BACKLOG.md](BACKLOG.md) PART ONE, not here.

### Closed on 2026-09-25, and why — kept visible so the removal is not silent

- ~~**The dev screen has grown past 30 values — how should it be organised?**~~ **COMMISSIONED BY
  THE OWNER, 2026-09-25.** `B-UX2` is no longer a question — it is work he has asked for, with
  `B-UX3` folded into it, and **the agreed next step is an INVENTORY**: every section, every control,
  every value, verified against source, before anything is moved. ★ No layout is designed, and
  [DEVSCREEN-INVENTORY.md](DEVSCREEN-INVENTORY.md) covers **one section of 23**.

- ~~**Surface zones, the full racer editor, click-to-lock-camera, a written reference for every
  dev-screen value, one particle system instead of two, and the server/deployment/multi-tenant
  arc.**~~ **CLOSED, REOPENABLE — the owner, 2026-09-25**, for four of the six. Not dropped: a
  sentence from him puts any of them back as it stood, and their content was moved rather than
  deleted. ★ **The other two are alive elsewhere, not closed:** the multi-tenant arc folded into
  the TENANCY row, and `B-UX3` folded into `B-UX2`. → [BACKLOG.md](BACKLOG.md), *Closed by the
  owner's decisions of 2026-09-25*.

- ~~**The dev-screen sprite-size concept — override multiplier, mixed mode, or redesign?**~~
  **DROPPED BY THE OWNER, 2026-09-25.** `B-UX4` is not deferred and not waiting on a spec — it is
  dropped, and all three concepts with it. Its content was moved, not deleted, into
  [BACKLOG.md](BACKLOG.md), *Closed by the owner's decisions of 2026-09-25*.

- ~~**The authored beats never reach the camera — hand them through, or leave the detector to
  infer?**~~ **DECIDED BY THE OWNER, 2026-09-25: they stay as they are.** The camera goes on
  inferring; nothing is handed through. ★ The question's own premise was also **wrong by then** —
  the `resolve` beat IS read (`comebackDetector.js:239`), behind `comebackUseBeats`, which ships
  `false`. Corrected in [BACKLOG.md](BACKLOG.md), *Closed by the owner's decisions of 2026-09-25*.

- ~~**Which cut counts as "the leading group" — changes of first place, or fights inside the top
  five?**~~ **ANSWERED 2026-09-25, and with neither option.** The leading group is a group including
  the leader that has broken away from the main field — which is the breakaway's own subject, so it
  takes that definition and its existing threshold and gets no new number.
  → [GLOSSARY.md](GLOSSARY.md), "breakaway"
- ~~**A race identifier a person can type — short, long, or both?**~~ **SETTLED BY WHAT SHIPPED.**
  RACE-IDENTIFIER-1 built it and it encodes all nine inputs; the row closed in
  [BACKLOG.md](BACKLOG.md) PART TWO. The shape question was answered by building one.
- ~~**The 51.6 MB of track backgrounds — re-spec or drop?**~~ **DECIDED BY THE OWNER, 2026-09-23**
  (`Q-27`): the current quality stays, no re-encoding.
- ~~**The render fingerprint builds its frame camera by hand**~~ — already done 2026-09-05.
- ~~**One-command deploy**~~, ~~**`VITE_API_URL` same-origin**~~ — both decided.
- ~~**The naturalness envelope is guarded on one side only**~~ — done 2026-09-24.

---

## 2 · NEEDS WORK, NO DECISION

★ **NOT RE-VERIFIED ON 2026-09-25.** This section is the 2026-09-24 harvest as it stood, kept
unchanged. The rebuild of that date re-checked §1 and §3 at the tree and ran out of budget before
these; each row still carries its own "verified how" column from the harvest. **Treat every row here
as dated 2026-09-24, not as checked today** — saying so is cheaper than a page that looks current and
is not.

*Specified, small, nobody is waiting on anything. Each verified to be still undone.*

| what it is | size | verified how |
| --- | --- | --- |
| ~~Warn instead of silently ignoring an invalid min/max~~ — ★ **DONE 2026-09-24 (Q-26)** | done | `RangeRejectionNotice.jsx`, reusing the Dev Screen's existing amber warning style; 3 tests |
| ~~Give the track editor a hint when a track is saved with no background~~ — ★ **DONE 2026-09-24 (Q-29)** | done | a HINT, styled apart from the error channel |
| ~~Make the server's test cleanup survive a Ctrl+C~~ — ★ **DONE 2026-09-24 (Q-20b)** | done | a SIGINT/SIGTERM handler that does the file half and **re-raises the signal** |
| ~~Sweep `.json.tmp` orphans that survive a OneDrive write failure~~ — ★ **DONE 2026-09-24 (Q-20c)** | done | `server/utils/sweepOrphanTmp.js`, swept at boot before anything is served; 6 tests |
| ~~Keep a draft of the drawn track geometry so a browser crash cannot lose it~~ — ★ **DONE 2026-09-24** (**both halves now** — Q-22b closed 2026-09-24 with a per-track key) | done | `trackEditorDraft.js`, 9 tests |
| ~~Protect "a default track cannot be un-defaulted" with a test~~ — ★ **DONE 2026-09-24 (Q-24)** | done | 2 tests, both directions; **the behaviour was already correct — a test gap, not a defect**. Sabotaging `tracks.js:542` turns both red. |
| ~~Say *which* half failed when a track saves but its background does not~~ — ★ **DONE 2026-09-24 (Q-25)** | done | the upload has its own `try`; the message says the track WAS saved and that Save retries just the image |
| ~~Share one slider component across three dev-screen sections~~ — ★ **DONE 2026-09-24 (PIECE 3b)** | done | `RangeSlider` at `client/src/screens/DevScreen/components/`; three instances collapsed. The count was three INSTANCES across TWO sections; recorded as such |
| ~~Add tooltips to the fields that have none~~ — ★ **DONE 2026-09-24 (PIECE 3c)** | done | All six named sections (SystemSettings, RaceTuning, ConfigExport, SurfaceClassManager, UserManagement, ChangePassword); reused the existing `InfoTooltip` |
| ~~Move the racer config folder out of the engine tree~~ — ★ **DONE 2026-09-24 (PIECE 5)** | done | 80 files moved from `client/src/modules/racer-types/` to `client/src/racer-types/`; 29 external importers + 13 scripts re-pathed; RACE HULL stayed at 202 |
| Pause and resume a running race | a block | — |
| ~~★ **A guard that callers build the frame camera through `frameCameraInputs`** rather than by hand~~ — ★ **DONE 2026-09-24 (PIECE 6)** | done | `scripts/check-frame-camera-inputs.mjs` scans object keys `anchorRacerIndex:` / `comebackLockedRacerIndex:` / `runInArrived:` outside the ONE home. Sabotage-proven. LOUD-FAILURE rule upheld |
| ~~A helper that cleans up the `.git/worktrees` stubs~~ — ★ **DONE 2026-09-24 (Q-28)** | done | `scripts/worktree-stubs.mjs`; **all 18 dead stubs removed**. Only ever touches `.git/` — never a checkout, because of the junction hazard. 6 tests |
| ~~★ **Nothing records which migrations an instance has already applied**~~ — ★ **DONE 2026-09-24 (PIECE 4)** | done | `scripts/migrate.mjs` + `migrate.test.mjs` (8 tests including sabotage). Runner refuses to run any id twice; observable-state fallback backfills the ledger for instances that ran the standalone script first. `DEPLOYMENT.md` step 6 now names one command |
| ★★ **TWO production-arm specs fail — `comeback-precedence` and `garden-path-finishes`** (`arrival-shape` was the third and is **CLOSED 2026-09-25**) | one needs a plan dump, one needs a suite run | ★ **`arrival-shape` is GREEN**: he decided a racer moves FREELY after reaching his drawn place, that is the shipped behaviour and it stays, so the SPEC was wrong — re-pinned, 3 runs 3 passes, and still able to fail if steering returns. ★ `garden-path-finishes` passes 3/3 ALONE; its failure is suite context, and its surviving test is the ONLY browser evidence that the track finishes. ★ `comeback-precedence` fails 3/3: the race's only comeback cut comes from OVERVIEW, which has no hold to cut through. → [BACKLOG.md](BACKLOG.md) · [THREE-FAILING-SPECS-1.md](../reports/evolution/THREE-FAILING-SPECS-1.md) |

★★ **THE MIGRATION LEDGER, added 2026-09-24 and deliberately NOT built.** There is exactly one
migration script (`scripts/migrate-teams.mjs`), it is run by hand, and **no record exists of what an
instance has already run.** The new upgrade procedure in [DEPLOYMENT.md](DEPLOYMENT.md) therefore has
to say *"read the migrations section and decide"* at step 6 instead of naming a command. It is
survivable today only because the one script is idempotent — running it twice is harmless. **A future
migration that is not idempotent would not be survivable, and nothing would stop it being run twice.**
A ledger is a second mechanism and was not ordered, so it is recorded here rather than built.

★ **Two size claims in the previous page were wrong and are corrected here.**
**The racer-config move is 80 files, not 39** — it was counted. **And "System Settings is the only
tooltip section untouched" is false**: `SystemSettings.jsx`, `RaceTuningSection.jsx`,
`ConfigExportSection.jsx`, `SurfaceClassManager.jsx`, `UserManagementSection.jsx` and
`ChangePasswordSection.jsx` all carry zero tooltips. The four *tuning* sections do have them
(AutoScale 8, BehaviorTuning 23, CameraAdvanced 40, DynamicsTuning 41), which is probably what the
claim meant, but the task is six sections and not one.

---

## 3 · NEEDS HIS EYE

*Judgeable only in the browser. The code is in.*
★ **Re-verified 2026-09-25.** Four rows checked, one closed.

**1 · Verification sittings for work that already shipped** — loading a saved player list, a track with
missing geometry being refused, backup→restore→reset end to end, dev-screen sections, physics and
collisions, storage edge cases, fullscreen and sprites.
→ [BACKLOG.md](BACKLOG.md) Phase V, `docs/BACKLOG.md:1743`

**2 · The 0.75 decisive phase from SHIP-THE-NIGHT**, still owed his eye — *"He chose the value; he has
not seen it run."*
★ **NO BACKLOG ROW BACKS THIS.** `docs/BACKLOG.md` does not carry the subject at all, so it is open
on this page alone. Recorded rather than resolved: giving it a row is a change nobody asked for, and
deleting a thing his eye is genuinely owed would be worse.
→ [SHIP-THE-NIGHT.md](../reports/evolution/SHIP-THE-NIGHT.md):55
★ **Address corrected 2026-09-25**: this row pointed at `reports/night/SHIP-THE-NIGHT.md`, which does
not exist. The report is under `reports/evolution/`.

**3 · `archive/front-group` (`87a08af4`)** — the one camera branch of four genuinely not in master.
→ `docs/TAGS.md:622`
★ **NO BACKLOG ROW BACKS THIS EITHER** — it lives in `docs/TAGS.md` and nowhere else. Same treatment
and same reason as the row above.

### Closed on 2026-09-25

- ~~**`city-circuit`, quick-test seed 30 — does a 349 px gap held by three look as bad as it sounds?**~~
  **He watched it and accepted it**, and that acceptance is what produced the group-of-three ruling of
  2026-09-23. Recorded in [BACKLOG.md](BACKLOG.md) PART TWO.

---

## 4 · NEEDS MEASURING FIRST

★ **NOT RE-VERIFIED ON 2026-09-25.** This section is the 2026-09-24 harvest as it stood, kept
unchanged. The rebuild of that date re-checked §1 and §3 at the tree and ran out of budget before
these; each row still carries its own "verified how" column from the harvest. **Treat every row here
as dated 2026-09-24, not as checked today** — saying so is cheaper than a page that looks current and
is not.

*A run settles it; no decision is involved.*

| what it is | size |
| --- | --- |
| ~~Does the company guarantee hold on a spread-out field?~~ — ★ **MEASURED 2026-09-25 as [COMPANY-SPREAD-FIELD-1](../reports/evolution/COMPANY-SPREAD-FIELD-1.md).** At the shipped headcount the spread-tercile binding is LIGHT on the four closed tracks (0–11%) and 5–19% on space-sprint with widening 1.00–2.61×; at the earlier pack-only recommendation 11–63% with widening 2.14–4.38×. His 5 stands | done |
| ~~"Road edge out of frame" as a standing number~~ — ★★ **DONE 2026-09-24: it is 77.3%** | done | 195,135 of 252,428 corridor frames over 10 tracks x 10 seeds; searound 36.2% to mountainstreet 97.6%. The instrument is committed with its data. **Whether 77.3% is bad is his eye, not this number** |
| Is the flaky editor test really flaky? — ★ **MEASURED 2026-09-24: 0 in 20 full runs. NARROWED, not closed** | a frequent flake is refuted; a rare one is not (0.98^20 = 67% chance of missing a 1-in-50). Never *fixed* — nothing was changed |
| ~~What the 51.6 MB of backgrounds costs at first paint~~ — ★★ **CLOSED: measured, then DECIDED by the owner 2026-09-23 — the backgrounds KEEP their quality** | zero image bytes in the bundle; per-track median 3.61 MB, worst 9.69 MB (`river-run`), which **stays**. No re-encoding. |
| ★★ **NARROWED 2026-09-24, NOT closed — and the conditional in the brief FIRED.** The group-of-three part is superseded by the owner's ruling of 2026-09-23; what remains is **4 SOLO breakaways and 9 PAIRS** | see below |

★★★ **THE "WHY ARE THE WORST RACES WORSE" ITEM WAS NOT CLOSED AS MOOT, BECAUSE IT IS NOT.** It was
put up for closure on the grounds that the owner watched the worst race — `city-circuit` seed 30, a
349 px gap held by THREE — and accepted it (2026-09-23, [GLOSSARY.md](GLOSSARY.md)). That disposes of
the group-of-three population and nothing else. Re-counted at the tree over every crossing in
`reports/evolution/chase-remainder-data/`:

| | quiet (22 crossings) | wild (5) |
|---|---|---|
| group ≥ 3 — **accepted by his ruling** | 12 | 2 |
| ★ **SOLO (group 1) — the picture he DOES object to** | **3** | **1** |
| ★ **PAIR (group 2) — explicitly UNDEFINED, never ruled on** | **7** | **2** |

★ **The four solos, named so they can be watched:** `dirt-oval` seed 20 @ 205 px (the worst),
`ice-track` seed 10 @ 163, `ice-track` seed 23 @ 159, and at wild `dirt-oval` seed 3 @ 166.
**A solo at 205 px is his own definition of the thing he does not want**, and it survives the ship at
3 of 300 (1.0%) at quiet and 1 of 300 (0.3%) at wild.
★ **The nine pairs are blocked on a ruling that does not exist** — the glossary says the pair case has
never been decided and must not be interpolated, so nobody can say whether they are a problem.

★ CHASE-REMAINDER-1 refuted the hypothesis that the remaining ugly races are chasers who overshot,
and put nothing in its place.

---

## 5 · BEFORE ANYONE ELSE CAN USE IT

★ **NOT RE-VERIFIED ON 2026-09-25.** This section is the 2026-09-24 harvest as it stood, kept
unchanged. The rebuild of that date re-checked §1 and §3 at the tree and ran out of budget before
these; each row still carries its own "verified how" column from the harvest. **Treat every row here
as dated 2026-09-24, not as checked today** — saying so is cheaper than a page that looks current and
is not.

*The delivery gaps, each with how it was established and a size. Nothing here is designed.*

**★★ A CLEAN CHECKOUT INSTALLS, BUILDS AND RUNS. The known risk did not materialise.**
Established by doing it: `git clone` to `C:\tmp\ra-clean`, then `npm ci` in `server/` (**exit 0**)
and in `client/` (**exit 0**), `npm run build` in `client/` (**built in 3.71 s**), and
`node server/src/index.js` with a scratch `RA_DATA_DIR` — **the server booted on port 4399 and served
the built client.** Both native modules load: `require('bcrypt')` and `require('better-sqlite3')`
both return. **Size: nothing to do.**
★ **What that does NOT establish, stated because it is the whole caveat:** this is the same machine,
the same Windows, the same Node (v24.14.0, against a declared `engines: >=20`), the same npm cache
and the same build toolchain. **A genuinely different machine — a Linux VPS, an ARM host, or any box
without a C++ toolchain — is NOT tested**, and the native modules are exactly where that would show.
Testing it properly needs a container or a second machine.

★★ **THE LINUX HALF IS NOW CLOSED, AND CLOSED PERMANENTLY RATHER THAN ONCE (2026-09-23).**
`.github/workflows/browser-gate.yml` runs `npm ci --prefix server` on `ubuntu-latest` on every push
to master and every day, and then **proves the two native modules LOAD** rather than merely install —
a prebuilt binary that does not match the runtime still installs. Observed on run `35903843784`:
`OK bcrypt loaded on linux/x64` and `OK better-sqlite3 loaded on linux/x64`. **ARM is still
untested**, and nothing here changes that.

| gap | what is missing | how it was established | size |
| --- | --- | --- | --- |
| ~~**No BACKUP procedure**~~ — ★★ **CLOSED** by DELIVERY-BACKUP-1, merge `616f6ea8` | `scripts/backup.mjs` archives the whole data root while the server runs, databases through SQLite's own online backup. **Proven by destroying a data root and bringing it back** — the account signed in and the stored race was readable. BACKLOG PART TWO holds the evidence. | `reports/evolution/DELIVERY-BACKUP-1.md` | **done** |
| ~~**No UPGRADE path**~~ — ★★ **CLOSED** by the same merge `616f6ea8` | `DEPLOYMENT.md` gained *Backing up, and upgrading*: eight steps in the order they are done, **ending with how to go back**. An upgrade procedure without a way back is a one-way door. | `docs/DEPLOYMENT.md` | **done** |
| ~~**`DEPLOYMENT.md` is not executable as written**~~ — ★★ **ALL FOUR CLOSED**, checked one at a time, by merge `842371e6` | **(a)** it never said to install dependencies — `npm ci --prefix` now appears four times; **(b)** `openssl` is named at `:82` as absent from a default Windows box; **(c)** *"Node 20 or newer"*, taken from the declared `engines`; **(d)** the `RA_BOOTSTRAP_TOKEN` prefix defect — it is `export`ed now, so the printed setup `curl` no longer sends an empty token. | `docs/DEPLOYMENT.md` | **done** |
| ~~**No browser test runs in CI, dev or production**~~ — ★★ **CLOSED 2026-09-23 (DELIVERY-BROWSER-GATE-1), and NARROWED rather than deleted** | A browser now runs automatically: `.github/workflows/browser-gate.yml` builds the client and runs the PRODUCTION arm's curated fast set on every push to master, daily, and on demand — proven stable first (5 runs on an unchanged tree, 5 of 5 green, 82 tests, no retries) and therefore allowed to BLOCK a pushed commit. ★★ **WIDENED 2026-09-25 and the SCOPE question is CLOSED: the gate now covers 10 specs — every one that does not wait for a real race — at 110 tests and 3.8 min, against 7 / 82 / 3.1 before.** One list (`client/package.json:54`), whose only consumer is the post-merge workflow. ★ The three FAILING prod-arm specs were deliberately left out and keep their own open row. ★ The pre-merge half is not merely undone but impossible as a wiring job — the pre-merge gate runs NO Playwright specs at all (`verify.mjs:257`, `GATE_GUARD = "viewer-invariants"`) — and the decision is to not build one. → [BROWSER-GATE-PREMERGE-1.md](../reports/evolution/BROWSER-GATE-PREMERGE-1.md); the rest stay night work by R12a. It does not run on `pull_request` or on feature branches, so a browser regression is caught at master rather than before it. | run `35903843784`, attempts 1–5; the widened set measured locally 2026-09-25, 110 passed / 0 failed | **CLOSED — the gate covers every non-race-waiting spec** |
| **Going online — one subject** (was four rows: no public address, VPS deployment, `RA_PUBLIC_ORIGIN`, admin auth hardening) | ★★ **THE PURCHASE IS NECESSARY AND NOT SUFFICIENT.** `docker-compose.yml` has exactly ONE service and no TLS-terminating proxy; DEPLOY-NOTES.md:195-200 lists FOUR more things that do not exist yet and are still needed after the domain arrives. ★★ **And the risk is not what was written:** sign-in does NOT stop working over plain HTTP — `RA_COOKIE_SECURE=false` is honoured explicitly (`server/src/auth/session.js:23-29`); that claim holds only if the cookie is left `Secure`, the production default. The real cost is that the password and the session cross the wire readable. ★ The proxy is deliberately NOT chosen (DEPLOY-NOTES.md:173-178). ★ Auth narrowed to two checkable items: CSP is off (`server/src/app.js:35`), and no written pre-exposure bar exists live in `docs/`. | `git grep racearena.example.com`; `scripts/configure.mjs` | **his word + a purchase, then four build items** |
| **HTTPS is not arranged** | Over plain HTTP, `Secure` cookies are never returned, so sign-in does not merely become insecure — it stops working. Needs a domain, a proxy choice (Caddy or nginx+certbot) and a decision on where `RA_DATA_DIR` lives. | `docs/DEPLOY-NOTES.md:173` | **his word, then a block** |
| **`deploy.yml.disabled` cannot be revived by renaming** | All four of its stated blockers still stand; `scripts/deploy.sh` does not exist. | `ls` on both paths | **a block** |

**★ SETTLED, so nobody re-opens them:**
**The licence is decided** — `AGPL-3.0-or-later`, chosen by the owner on 2026-09-01, full unmodified
text in `LICENSE`, SPDX identifier and copyright (`2026 weudlll-cyber`) in `README.md`. The
`<year> <name of author>` at `LICENSE:633` is the licence's own unmodified appendix template and is
supposed to look like that. **The security decisions in `docs/AUTH.md` are all settled** — the
document has no open marker of any kind across its nine sections; what remains are deployment
choices, and they are in the table above rather than in `AUTH.md`. **The image is standalone** —
verified by running it with no mounts and no environment (PUBLISH-STEPS-1).

---

## THE NIGHT'S SCOREBOARD

★★★ **THE DONE AND GONE COUNTS ARE LARGE, AND THAT IS THE FINDING.**

| | count |
| --- | --- |
| candidates harvested | **58** |
| **STILL OPEN** | **41** |
| **ALREADY DONE** | **9** |
| **PREMISE GONE** | **8** |
| living documents corrected | **4** |

★ **Two of the 41 closed the same day, 2026-09-24**, by the owner's decisions on the breakaway
thread — the pair case and the thread itself. The table is left at the figures the harvest actually
produced rather than edited down, because it is a record of that night's count; this line is what
keeps it from reading as current.

**Roughly three in ten of the things this project was carrying as open were not open.** The largest
single cause is the same one as on 2026-09-05: a claim written down once and then quoted rather than
re-checked.

**The nine ALREADY DONE, with what closed them:**

1. *"Does the race seed read right on screen?"* — answered 2026-08-27 on the production build; the
   build landed by `7a3942fa`. The previous page listed it as waiting on him, five days after he
   answered it.
2. *"resolve-converge is unmerged, his eye owed"* (`239644aa`) — **in master**, by `d7eca25d`.
3. *"run-in state is unmerged, his eye owed"* (`e91e7a61`) — **in master**, by `eea0acf2`.
4. *"finish-readable is unmerged, his eye owed"* (`84b7c8f0`) — **in master**, by `69e4b27b`.
5. *"FINISH-MOTION-1 stage 2 awaits the owner's eye"* (`a65c013c`) — **in master**, by `e2ad9cfd`,
   whose message reads **OWNER-APPROVED**.
6. *"`feat/remove-prestaging-comebacker` is left at origin with undecided product code"* — origin has
   only master; it is preserved as `archive/remove-prestaging-comebacker`.
7. *"`night/2026-09-14-history` is left at origin"* — not at origin and not under any archive tag.
8. *"The definitive N=300 on the two arms that survived the screen"* — run; CHASE-BUILD-1 §3.
9. *"Nothing measures MOTION, only per-frame values"* — closed by FINISH-MOTION-1; the render
   fingerprint reaches the ending.
   ★★ **THE HARVEST'S REASON WAS WRONG AND ITS VERDICT TURNED OUT RIGHT — both dated 2026-09-25,
   written beside the harvest rather than over it.** FINISH-MOTION-1 reaches the ENDING, one phase,
   so it did not close a whole-race subject; the row stayed open and was measured
   ([JUDDER-TRUTH-1](../reports/evolution/JUDDER-TRUTH-1.md)).
   ★ **The measurement:** the shipped check grades Δoffset against a **1280 px** bar that **61,429
   frame steps across ten tracks never approach** (worst 66%, median 0.6%); the pan channel is clean
   everywhere; the zoom channel carries one recurring event in LEADER_ZOOM at 24-26 s on five of ten
   tracks.
   ★★ **CLOSED the same day on the owner's eye.** He watched the five worst moments on his own Quick
   Test and found **no judder visible**; the zoom changes are visible and not objectionable. The
   check **STAYS** — it is a catastrophe line, not a judder detector, and silence is its normal
   state. Now in [BACKLOG.md](BACKLOG.md) PART TWO.

**The eight PREMISE GONE:**

1. *"Why Garden Path does not finish"* — **it finishes.** All 60 garden-path races measured on
   2026-09-23 (30 quiet, 30 wild) run to a finish; the default racer is the beetle.
2. *"The middle stage of the action ladder — running now"* — that night ended; the measurement is
   `reports/night/ACTION-KEYS-1.md`.
3. *"Replace the `RA_PUBLIC_ORIGIN` placeholder — one value, half a day"* — there is nothing in the
   repository to replace, and `npm run configure` already applies the real value.
4. *"System Settings is the only tooltip section untouched"* — six sections have none.
5. *"The racer-config move is 39 files"* — it is 80.
6. *"60 MB of backgrounds"* — 51.6 MB, and they are JPGs, not the PNGs the plan names.
7. *"`ci.yml` names the production browser arm in a comment"* — it does not name it at all.
8. *"TODO tags and skipped tests are somewhere in this tree"* — neither exists. A whole-tree
   case-insensitive sweep finds **no `TODO`/`FIXME`/`HACK`/`XXX` marker in any source file** and **no
   `.skip`, `.todo`, `xit`, `xdescribe`, `skipIf` or `.only` anywhere**.

**The four living documents corrected in the same night:** this page (replaced), `docs/MORNING.md`
(the two branches it says are at origin), `docs/BACKLOG.md` (the racer-config file count), and
`reports/` left untouched by rule — corrections to reports live here instead.

---

## WHAT THIS PAGE DOES NOT ESTABLISH

- **Nothing here is a judgement about what the product SHOULD contain.** Every entry is a thing
  already written down somewhere, re-checked. Deciding that something should be dropped, added or
  redesigned is his, not this page's.
- **Nothing in section 3 has been judged.** Those need his eye by definition, and a gap measured in
  pixels is not a verdict about how a race looks.
- **The clean-machine result is one machine.** See the caveat in section 5; a Linux or ARM host is
  untested and the native modules are where that would bite.
- **The scoreboard counts candidates, not importance.** Nine done and eight gone out of 58 says the
  list was stale; it says nothing about whether the 41 that remain are worth doing.
- **`reports/` is append-only and was read, never edited.** Where a report's status line is now
  wrong — FINISH-MOTION-1's *"awaiting the owner's eye"* is the clearest — the correction is here and
  the report is left as the dated record it is.
