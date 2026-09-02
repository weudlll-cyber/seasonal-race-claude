# DOC-TRUTH-2 — ~4,300 claims checked, 97 false at ~124 sites in 24 documents, median age 43 days

> **LANDED NOTE (2026-09-02).** This is the breadth pass DOC-TRUTH-1 commissioned. It returned AFTER
> that report had been merged, so **DOC-TRUTH-1's headline of "8 false" understates the document set
> by roughly twelve times** — a correction to that effect is recorded in the INDEX's CORRECTIONS
> block, per the append-only rule. Its eight and this report's ninety-seven **do not overlap**.
> The report is landed whole and unedited apart from this note and the title.
>
> **Not every correction below has been applied.** The findings verified independently at the tree
> before landing — and the corrections made — are listed in the merge commit; the remainder stand
> here as the record and are on the morning sheet as a sized follow-up. A correction applied in haste
> to twenty-four documents is a worse outcome than a stale sentence, which is this report's own
> lesson.

**READ-ONLY.** Nothing in the repository was changed by this piece. Tree state: master at
`0f44a874`, clean working tree, 2026-09-02.

**This is the breadth pass that `49fd9386` said "did not return in time".** That commit's own eight
findings are NOT repeated here, and neither are the four items the brief named as already being
corrected. Everything below is additional, and every one of them was checked against the tree
tonight rather than recalled.

---

## 1. THE THREE NUMBERS

### How many claims were checked: ~4,300

Two halves, both reproducible.

**3,152 mechanically swept claim sites** across the 34 in-scope documents (15,238 lines), by five
sweeps whose totals the scripts print:

| sweep | sites | how it resolves |
| --- | --- | --- |
| backticked path-like strings | 808 | against `git ls-files` plus seven prefix candidates, so a relative reference is not read as a wrong one |
| markdown `#L` line anchors | 76 | file exists, and the cited line is within the file's real length |
| bare `file.js:NNN` citations | 154 | same, plus a symbol-proximity check against the cited range |
| stated config values | 112 | against a parsed key→value map of `client/src/modules/storage/defaults.js` |
| named identifiers in backticks | 2,002 | against a concatenation of every tracked `.js` / `.jsx` / `.mjs` |

**~1,150 read-and-checked by hand**: every endpoint in `docs/API.md` against `server/src/app.js`'s
mounts; every variable in `docs/ENVIRONMENT.md` against `process.env` in three trees; R0–R17 of
`docs/VERIFY-RULES.md` against `scripts/verify.mjs` + `scripts/lib/routing.mjs`; the whole of
`docs/PHASE-CONTRACT.md` against `racePlanner.js` / `raceGovernor.js`; `docs/AUTH.md` against
`server/src/auth/`; the folder tree at the top of `docs/ARCHITECTURE.md` file by file; the full CLI
flag inventory of `scripts/sim-fairness.mjs` (87 `argVal` keys + 21 bare flags) against every flag
`docs/SIM.md`, `docs/SWEEP-HARNESS.md` and `docs/EYE-TEST-SEEDS.md` names; every key, latch, state
and call-site claim in `docs/CAMERA_DIRECTOR.md` and `docs/ENDING-PHASES.md`; all 68 config values
in `docs/DEVSCREEN-INVENTORY.md` diffed programmatically against `defaults.js`; and every
`speedMultiplier`, `displaySize`, `frameCount`, `tintMode` and `surfaceClasses` array of all 20
racer types in `docs/RACER_DATA_MODEL.md` against the 20 `*RacerType.js` files.

### How many are false: 97 claims, at ~124 sites, in 24 of the 34 documents

Line-number drift is grouped: two grouped rows below stand for 27 individually-wrong citations and
are counted as 2. Counting those singly gives 122.

### How old they were: median 43 days, range 0–132 days; 14 were never true

An age was pinned by `git log -S` for 82 of the 97.

| age band | count |
| --- | --- |
| 0–7 days | 8 |
| 8–30 days | 17 |
| 31–60 days | 21 |
| 61–100 days | 29 |
| 101–132 days | 7 |
| not datable (continuous growth, or an append-only corpus) | 15 |

**14 of the 97 were FALSE ON THE DAY THEY WERE WRITTEN** — no commit exists at which they held.
That is the single most useful number in this report, because it means proof-reading at write time
would not have caught them either: the author was not describing something they had checked.
`docs/TRACK_EDITOR.md:310`'s `getCenterFrac` is the purest case — `git log -S"getCenterFrac" --all`
returns exactly one commit, the one that wrote the document, 132 days ago. The API it names has
never existed in code.

**The shape of it.** Three quarters of the datable falsehoods are older than a month, and the oldest
cluster is not scattered — it is `docs/ARCHITECTURE.md`'s folder tree and its seven "Do NOT touch"
invariants, `docs/FORCE-MAP.md`'s force inventory, and the four data-model documents
(`RACER_DATA_MODEL`, `TRACK_LIFECYCLE`, `TRACK_EDITOR`, `DEVSCREEN-INVENTORY`), where the median age
is 77 days. Two of those are documents `docs/PROJECT-PRINCIPLES.md`'s fixed-point list sends a
stranger to first. **The newest cluster is the opposite**: three claims in `docs/DEPLOYMENT.md` that
were true 24 hours ago and were overtaken by IMAGE-STANDALONE-1 yesterday, and one in
`docs/CAMERA_DIRECTOR.md` that went false this evening.

**One date recurs more than any other: 2026-06-17.** `83937c3e` (file-based default seed snapshot)
and `d5b9d57e` (remove all dead localStorage track code) between them falsified nine claims across
four documents on the same day, 77 days ago, and not one of them was corrected. **A second recurring
date is 2026-07-24** (`0bd146f3`, "extract the REAL RaceScreen core"), which falsified the file
attribution in `FORCE-MAP`, `ARCHITECTURE`, `DEVSCREEN-INVENTORY` and `RACER_DATA_MODEL` at once.
Both are single commits with a wide documentation blast radius and no doc-update in the same PR —
which is what the Inline Doc-Maintenance Convention in `docs/PROJECT-PRINCIPLES.md` exists to
prevent.

**The single most consequential finding is not visible as a count.** `docs/FORCE-MAP.md` attributes
the browser's entire longitudinal physics loop to `client/src/screens/RaceScreen/index.jsx`, in 27
places. The loop moved to `client/src/modules/raceCore.js` on 2026-07-24 (`0bd146f3`).
`advanceRacerT` — the shared t-update the document's master equation is built on — does not appear
in `index.jsx` at all.

**The second is a repeat of a defect this project has already named twice.**
`docs/PROJECT-PRINCIPLES.md:86` states the shipped world as `dc4647be`. That is the same
present-tense-sentence-shaped-like-history that `49fd9386` found in `reports/evolution/INDEX.md`
hours ago, at a second site, and `check-fingerprints.mjs` cannot see either of them — it exempts
"superseded values, which living docs legitimately quote as history", and the truncated 8-character
form also defeats a literal match on the 16-character value.

---

## 2. EVERY FALSE CLAIM

`age` in days as of 2026-09-02. `NEVER` = no commit found at which the sentence was true.

### docs/API.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `docs/API.md:3` + the whole document | "**Owns:** the backend's HTTP surface — **every endpoint**, its shape, and what it persists." It documents 13 endpoints on three surfaces. | `server/src/app.js:59-75` mounts **nine** routers and ~**56** endpoints. Undocumented: `/api/auth` (6 — `setup-needed`, `setup`, `login`, `logout`, `change-password`, `me`), `/api/users` (4), `/api/player-groups` (5+3), `/api/brands` (8+3), `/api/racers` (8), `/api/seed-notices` (2), plus `DELETE /api/tracks/:id/background` and the `set-default`/`clear-default`/`export-seed` trio `_defaultPromote.js` attaches to tracks, brands and player-groups. | `d0a57d44` 2026-06-13 added `/api/auth`; five routers followed, the last `b9dc8102` 2026-08-31. API.md's last content edit is `fc48f930`, 2026-06-09. | **81** |
| `docs/API.md:97` | `GET /api/health` → `{ status: "ok", timestamp: "<ISO>" }` | `server/src/app.js:59-61` returns `{ status, timestamp, build: buildIdentity() }`. | `a24f47e2` 2026-08-23 (BUILD-FROM-OUTSIDE-1) | **10** |

### docs/DEPLOYMENT.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:92-95` | "The image's build context is `./server` … `additional_contexts` brings it in **without moving the build context to the repository root**." | `docker-compose.yml` sets `context: .` — the root. `server/Dockerfile`'s own header: "IMAGE-STANDALONE-1: THE BUILD CONTEXT IS THE REPOSITORY ROOT … every path below is therefore repo-relative." | `af0bb3b5` / merge `ac372195`, 2026-09-01 | **1** |
| `:101-102` | "A manual build outside compose needs the context by hand: `docker build --build-context client=./client ./server`." | That builds the wrong context. It is now `docker build --build-context client=./client -f server/Dockerfile .` | same | **1** |
| `:103-104` | "The image is **not standalone**: `server/utils` and the repository-root `shared/` are supplied by bind mounts, so the container still needs the repository beside it. Closing that is separate work." | Both are copied in: `COPY server/utils/ ./utils/` (COPY-UTILS-1, "Copied since 2026-09-01") and `COPY shared/nameLimits.mjs /shared/nameLimits.mjs`. `docker-compose.yml` states the opposite property: "run the image with no mounts at all and it works." The work is not separate; it is done. | `af0bb3b5` 2026-09-01 | **1** |

### README.md (root)

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:66` | "An optional **race-action director** (a pre-OUTCOME longitudinal speed layer in `raceGovernor.js` — a two-master tail-lift + contest-injector, **default OFF**…)" | No `applyGovernor`, no `governorEnabled`, no tail-lift, no contest-injector anywhere in the tree (three hits over `client/src` + `scripts`, all comments or a migration-alias string; control: `applyPulkLeadRotation` = 49 hits). The surviving writer of `governorMult` is `applyPulkLeadRotation`, **unconditional whenever a race plan runs** — `docs/PHASE-CONTRACT.md` and `docs/FORCE-MAP.md` A13 both say so. | `e389b99d` 2026-07-13 (CLEANUP S4, "remove the classic reactive director") | **51** |
| `:79` | Tech stack: "React Router **v6**" | `client/package.json` → `"react-router-dom": "^7.18.2"` | `226de4b0` 2026-07-29 | **35** |
| `:116` | "[Phase status](docs/ROADMAP.md) (**a table**; the detail is in the backlog)" | `docs/ROADMAP.md` is a 31-line redirect with no table; its own line 3 says "THIS FILE IS A REDIRECT. It owns nothing." `docs/README.md:101` already says so. | `c49d5af5` 2026-08-27 (ROADMAP-FOLD-2) | **6** |

### docs/README.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:3-4` | "**What this document owns:** the map. **Every maintained document** … If a document is not listed here it is either in archive/ or it should not exist." | Six tracked, living, non-archive documents appear nowhere in it (grep for each name → 0): `AUTH.md`, `ENDING-PHASES.md`, `NIGHT-RUN.md`, `OPEN.md`, `MORNING.md`, `ENVIRONMENT.md`. Five of the six are in this brief's own scope list. | AUTH.md `7dc82909` 2026-06-13; ENDING-PHASES + NIGHT-RUN 2026-08-11; OPEN 2026-08-24; MORNING 2026-08-27; ENVIRONMENT `09aeb7f6` 2026-09-01. The map's last edit: `c49d5af5`, 2026-08-27. | **81** (oldest omission) |

*(The same file's "twenty-one dated records" in `archive/` is TRUE — 22 tracked `.md` there, minus `archive/README.md`.)*

### docs/ROADMAP.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:14-15` | "**Eleven** documents and reports link to `docs/ROADMAP.md`, and several are reports — append-only by rule, so their links cannot be rewritten." | **4 files / 5 markdown links** (`README.md`, `docs/BACKLOG.md`, `docs/README.md`, `docs/SIM.md`), or **27 files / 62 occurrences** if any mention counts. Re-run at the commit that wrote it (`c49d5af5`): 4 files / 5 links / 26 mentioning. Never eleven. The supporting clause fails too — none of the 5 links is in `reports/`. | written wrong; `reports/evolution/ROADMAP-FOLD-2.md:38` carries the same sentence | **NEVER** (6 days old) |

### docs/VERIFY-RULES.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:111-112` (R1) | "The trigger is the transitive closure of `raceCore.js`'s imports … **19 files** against the **103** the old folder rule fired on." | `node scripts/engine-reach.mjs` → **76**. Folder rule → **108**, which is also what SHIP-CEREMONY's generated block prints. **SHIP-CEREMONY records that the typed 19/103/84 figures went wrong on 2026-08-10 and replaced them with a generator; VERIFY-RULES kept typed copies of the same two numbers.** The closure went 20 → 36 (`3f199172`, 2026-08-15) → 76 (`56b99a9d`, 2026-09-02). | CONFIG-DIFF-2, 2026-08-10 | **23** |
| `:39-41` (R0) | "…plus `gen-engine-reach-doc.mjs` by name, plus **the two suite guards** declared in `routing.mjs`." | `scripts/lib/routing.mjs:229-234` also matches `^gen-ceremony-costs\.mjs$`, and `SUITE_GUARDS` has **three** — `client-suite` (:146), `server-suite` (:167), `script-suite` (:186). `node scripts/verify.mjs --dry` lists all three plus the `ceremony-counts` guard. | generator `a7db89eb` 2026-08-10; third suite `3719808c` 2026-08-15 (WIRE-SUITES-1) | **18** |
| `:43` (R0) | "**Why ONE generator is named individually** rather than a `gen-*` wildcard." | Two are. The reasoning is correct and applies to both; only "one" is wrong. | `a7db89eb` 2026-08-10 | **23** |

### docs/PROJECT-PRINCIPLES.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:86` (§8) | "The shipped world is **`dc4647be`** = COMBO15 + margin hysteresis + lateral acceleration cap." | `docs/fingerprints.json` → `roles.world.value` = **`8a1977187e9c99b4`**. Same defect `49fd9386` found in `reports/evolution/INDEX.md`, at a second site inside this brief's scope. `check-fingerprints.mjs` cannot see it (exempts superseded values as history; the truncated form also defeats a literal match). `docs/FAIRNESS.md:6` handles the same fact correctly by POINTING at the record instead. | premise wrong from 2026-08-25 (`d73ec6a9`); value re-minted 2026-09-02 (`a6030929`) | **8** |
| `:44` (§4) | "`racearena:racerTypes` — one key for racer-type cosmetics." | The key does not exist. `grep -rn "racearena:racerTypes" client/src` → 0, proved against the control `grep -rn "racearena:" client/src/modules/storage/storage.js` → 20 real keys. It went with `racerTypeStorage.js`. | `aa83fad4` 2026-06-18 | **76** |

### docs/FAIRNESS.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:60` | "**47 reports** mention `trajectoryMult` and **none of them** mentions it beside `bandBias`." | `grep -rl trajectoryMult reports/ \| wc -l` → **50**; **5** of those also contain `bandBias`, **4 lines** carry both names on one line. Both halves wrong. | written `d54c1a49` 2026-08-22; not datable further — `reports/` is append-only and the count moves with every report | **11** (floor) |

### docs/FORCE-MAP.md

The header promises "a source line for each [force]" and "it states STRUCTURE, never values". Both
promises are broken. `check-config-claims.mjs` cannot help: its own declared blind spot is "config
objects other than the camera one".

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:100-102` (A2) | `reRollVariationPercent` **58**, `reRollTransitionDuration` **5.0**, `reRollIntervalDivisor` **15**, `reRollLastPositionPercent` **80** | `defaults.js:953-956` → **75**, **3.0**, **10**, **95**. Four wrong values in one line. | `d904bf54` 2026-07-01 ("adopt swept tuned race dynamics") | **63** |
| `:148, :150` (A7) | OUTCOME runs "`corridorStart`..`corridorEnd`, default **0.55–0.95**"; `racePlanCorridorEnd` **0.95** | `defaults.js:971` → `1.0`. `docs/PHASE-CONTRACT.md` §4 states 1.0 correctly, so the two documents disagree. | `07bf2f11` 2026-06-26 | **68** |
| `:193` (A13) | "at shipped defaults **[0.15, 0.5)** … `pulkEnd = corridorStart = choreoOutcomeStart` **0.5**" | `defaults.js:1037` → **0.6**. **Verbatim the defect `scripts/check-config-claims.mjs`'s own header was written for**: "`choreoOutcomeStart` was documented as 'the shipped 0.5' in four separate documents while the shipped world fingerprint was minted from 0.6." The guard does not fire because its narrow rule wants `key: N` / `key (N)`, and this site puts the key inside a multi-token backtick span with the number bolded outside it. | `5646d238` 2026-07-17 | **47** |
| `:422` (§E dead/vestigial table) | "`preOverlapFreeLane` approach-zone steering — **Off by default** (`false`)", citing `defaults.js:316` | The key exists nowhere in the tree (control: the same query on `homeForceReductionOnOverlap`, one row below, finds its history). Every other row in that table says REMOVED; this one still reads as live. | `f3116226` 2026-06-28 (Commit B) | **66** |
| `:50, :55, :56, :70, :78, :84, :92, :98, :100, :101, :107, :113, :122, :133, :146, :154, :163, :174, :180, :187, :439-450` — **27 sites, grouped** | The whole longitudinal section places the step loop, the re-roll, the trajectory ease, the runout coast, the BATTLE slowmo clock, the PulkLeadRotation call and `advanceRacerT` in `client/src/screens/RaceScreen/index.jsx`, with line numbers. | The loop is `client/src/modules/raceCore.js`. `index.jsx:36` imports `createRaceFromIdentity, stepRacePhysics` and calls nothing else. **`advanceRacerT` does not occur in `index.jsx` at all** — it is at `raceCore.js:633`. `createTrajectoryController`, `applyPulkLeadRotation`, `reRollLastPositionPercent`, `easeInOutCubic`, `runoutDecay`, `draftingBoost` are all in `raceCore.js`, none in `index.jsx`. The cited `index.jsx:1122-1128` is the finish-navigation `setTimeout`. | `0bd146f3` 2026-07-24 ("parity: extract the REAL RaceScreen core") | **40** |
| `:56, :187` | `advanceRacerT()` at "`raceStep.js:72-86`"; `governorMult` enters "at `raceStep.js:83`" | `advanceRacerT` is at `raceStep.js:115`; 72-86 is `computeRowEnvSmoothed`. The file is 134 lines. | same chain | **40** |
| `:422, :425` and the §E `defaults.js` citations — **5 sites, grouped** | `defaults.js` line numbers | Keys exist, lines drifted: `speedBrakeYThreshold` cited `:436` → actually `:1248`; `tWeight`/`yWeight` `:375-376` → `:1187-1188`; `avoidanceDistance` `:428` → `:1240`. `defaults.js` is 1,411 lines. | continuous growth | — |

### docs/PHASE-CONTRACT.md

Header: "Every claim is verified at source (file:line)." Dated 2026-07-14.

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:20` | "`choreoPulkEnd = config.choreoOutcomeStart ?? 0.25`" | `racePlanner.js:168` → `?? phaseFractions.pulkStart`. The source comment beside it says why: "Fallback tracks the resolved pulkStart (not a raw literal) … so nothing can drift from it." | `9a79ccf1` 2026-07-29 (HYGIENE-1 STEP 1, "no raw drifting literals") | **35** |
| `:11-15` | "`DEFAULT_PHASE_FRACTIONS` (racePlanner.js:62-69): `pulkStart 0.25, …`. **These are the raw fallback literals** … the `0.25` fallback literal above" | At `racePlanner.js:82-89`, and `pulkStart: DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart` — not a literal, and there is no `0.25` in the object. The other five values are right. | `9a79ccf1` 2026-07-29 | **35** |
| `:30-31`, `:80`, `:157-158` | "`choreoOutcomeStart == 0.5`"; "Default **0.5**"; "`choreoOutcomeStart` 0.5" — and the phase spans "PULK [0.15, 0.5) · OUTCOME [0.5, 1.0)" | `defaults.js:1037` → **0.6**. Three sites. `docs/DEVSCREEN-INVENTORY.md:168` states 0.6 correctly, so the two documents disagree. | `5646d238` 2026-07-17 | **47** |
| `:166-167` | "Every force term is scaled by `governorPhaseWeight`, **which fades to EXACTLY 1.0 (no effect) by OUTCOME**" | `raceGovernor.js:92-97` → `if (progress >= corrStartFrac) return 0.0;`. The WEIGHT fades to 0; the resulting `governorMult` is slewed to 1.0. A scale factor of 1.0 is not "no effect". `docs/FORCE-MAP.md:193` states the same fact correctly ("fades to **exactly 0**"), so the two documents disagree. | no commit found at which the weight returned 1.0 at `corrStart` | **NEVER** |
| `:11, 19, 25, 40, 43, 44, 45, 46, 65, 67, 70, 71, 79, 91, 94, 101, 110, 114, 120, 124, 126, 128, 136, 140, 155` — **22 wrong citations, grouped** | file:line into `racePlanner.js` (now 1,284 lines) and `DynamicsTuningSection.jsx` (now 1,426) | Every one points at the wrong line. Worst: `getPhase` cited `:357-370`/`:359-365`/`:360`/`:361` → actually `:521`. `_choreoEnabled` `:274` → `:323`. `getPhaseFractions` `:699-701` → `:1244`. `anchorProgress` `:523` → `:701`. `computePulkBiasedTarget` `:640` → `:413`. `isHeroChoreographed` `:462` → `:682`. DevScreen: "PULK end / OUTCOME begins" `:925-930` → `:1233`; "P-Controller starts" `:622-628` → `:874`; "P-Controller ends" `:648-660` → `:902`; "Bonus active until" `:578-581` → `:824`. **The `raceGovernor.js` citations are all still correct.** | growth of both files since 2026-07-14 | — |

### docs/ARCHITECTURE.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:82` and `:821` | the surface-class defaults live in "`defaultClasses.js`" | The file has never existed on any branch (`git log --all --diff-filter=AD -- '*defaultClasses.js'` → empty, proved against the control on `surface-effects/registry.js` → `5bee9615`). The home is `client/src/modules/surface-effects/defaults.js` (`DEFAULT_SURFACE_CLASSES`), which **`docs/API.md:37` names correctly** — the project already has the right sentence in another document. The count "9" is right (`registry.test.js:30` asserts it). | the folder shipped as `registry.js` + `defaults.js` on 2026-04-30 | **NEVER** |
| `:81` | `surface-effects/index.js` — "listSurfaceClasses / getSurfaceClass / getSurfaceClassApi" | No `index.js` in that folder, ever. `getSurfaceClass` is `registry.js:63`; the list function is `listAllSurfaceClasses` (`:54`), not `listSurfaceClasses`; `getSurfaceClassApi` exists nowhere. | never existed | **NEVER** |
| `:83` | `surface-effects/surfaceClassApi.js` | It is `client/src/services/surfaceClassApi.js`, since `5bee9615` 2026-04-30. Never in `surface-effects/`. | never existed there | **NEVER** |
| `:27` and `:173` | `RaceScreen/drawing/priorityModeOverlay.js` — "Priority mode debug rings + info box", and the extraction list naming it | Deleted with the 4-mode priority system. The folder holds `overlayRendering.js`, `particleRendering.js`, `racerRendering.js`, `battleDiagRendering.js`, `startBoardRendering.js`, `trackRendering.js` — `startBoardRendering.js` is present and unlisted. | `f3116226` 2026-06-28 (Commit B) | **66** |
| `:69` | `racer-types/racerTypeStorage.js` — "localStorage CRUD … (key: `racearena:racerTypes`)" | Neither the file nor the key exists. | `aa83fad4` 2026-06-18 ("remove orphaned racerTypeStorage module … no prod importer after D6b") | **76** |
| `:75` | `racer-types/canvasUtils.js` | It is `client/src/screens/RacerEditor/canvasUtils.js`, created there by `d2c2ee6e` 2026-05-28. Never under `racer-types/`. | never existed there | **NEVER** |
| `:76` | Luge — "**2000×238** spritesheet, 16 frames **125×238**, … **20 coats**" | `LugeRacerType.js:7` "2048×128 sheet"; `:25-27` `frameWidth: 128, frameHeight: 128, frameCount: 16`; `LUGE_COAT_PALETTE.length` = **17**. Frame count 16 is right. | `11093fff` 2026-06-03 ("tight-crop 12 spritesheets") | **91** |
| `:37` | "DevScreen/ — Developer / admin panel (**10 sections**, 2-tier Operator/Advanced)" | `SECTIONS` has **16** entries — 7 `tier: 'operator'`, 9 `tier: 'advanced'`. The 2-tier structure is right. | grown continuously; last section added `2aafe1af` 2026-08-17 | **16** (floor) |
| `:22` | `RaceScreen/index.jsx` — "Main component (**~1673 lines**)" | 1,913 | continuous growth | — |
| `:39` | `RaceTuningSection.jsx` — "Thin coordinator (**44 lines**)" | 59 | continuous growth | — |
| `:44` | `TrackEditor.jsx` — "Main component (**1040 lines**)" | 1,070 | continuous growth | — |
| `:171` | "`BATTLE_ZOOM` fires when ≥3 of the top-10 racers are within **`battlePulkThresholdPx`**" | The key is `battlePulkThresholdT` — a LAP FRACTION, not pixels. `CameraDirector.js:1549`: "≥3 of top-10 within battlePulkThresholdT (lap fraction)". The `Px` name occurs nowhere. | `07bea7b0`/`e180a6be`, 2026-05-23/25 | **~100** |
| `:193-195` | "`cam.zoom = overviewZoom × stateRatio` … `stateRatio = LEADER:1.4, BATTLE:1.6, COMEBACK:1.3, OVERVIEW:1.0`" | `stateRatio` occurs nowhere in `client/src` or `scripts` (control: `visibleCorridors` = 2 hits in `CameraDirector.js`). Per-state zoom is `visibleCorridors` in `DEFAULT_CAMERA_CONFIG` — OVERVIEW 1.5, BATTLE 0.55, COMEBACK 0.55. `overviewZoom = CANVAS_W / worldW` (`CameraDirector.js:229`) and `OPEN_TRACK_BASE_ZOOM = 1.5` (`projection.js:34`) are both still right. | `dcca55ba` 2026-08-03 (CAMERA-REFERENCE-WIDTH-1) | **30** |
| `:285` and `:309` (invariant #2 of the seven) | "Conversion helpers (raceBehavior.js): `pxToPhysicalY` / **`physicalYToPx(phy, trackWidth)`**"; "Do NOT reintroduce raw `physicalY × trackWidth` conversions. Use `physicalYToPx` / `pxToPhysicalY`." | Only `pxToPhysicalY` exists (`raceBehavior.js:249`). `physicalYToPx` occurs nowhere. **This is one of the seven invariants `docs/PROJECT-PRINCIPLES.md` fixed-point #5 sends a stranger to**, and half of it names a function that is not there. | `f3116226` 2026-06-28 | **66** |
| `:311` (invariant #3) | "Do NOT change **`REFERENCE_TRACK_WIDTH = 98`** … the Dirt Oval calibration anchor for **`lateralScale`**." | Neither symbol exists. Both went with the legacy lateral stack. A second of the seven invariants has no subject. | `bc68c378` 2026-06-27 (Commit A) | **67** |
| `:324` | "`sim-fairness.mjs:~1007` reads `trailer.frameSizePx` … **Sim racer objects never set `frameSizePx`, so this always falls back to `0.014`.** Fix: set `frameSizePx: effectiveDisplaySize` (already set; now correctly named)" | The sim DOES set it — `scripts/sim-fairness.mjs:1225`. The read is at `:2657`; `:1007` is `DURATION_VARIANTS`. The sentence contradicts itself in its own last clause. | `09727abd` 2026-08-06 last touched it | **27** |
| `:645` | "Key files: `modules/racePlanner.js` — `createRacePlan`, `createTrajectoryController`, **`computeBereichsBonusMap`**" | The symbol occurs nowhere (the other two are real, `raceCore.js:44`). It is also German, which the language rule forbids. | `e180a6be` 2026-05-25 ("full hygiene — i18n, refactor, dead code") | **100** |
| `:646` | "`screens/RaceScreen/index.jsx` — Race Plan activation, `areaBonusMult` **in physics loop**" | Same movement as FORCE-MAP: the loop is `raceCore.js`. | `0bd146f3` 2026-07-24 | **40** |

### docs/CAMERA_DIRECTOR.md

Neither this document nor ENDING-PHASES.md contains a single `file.js:NNN` citation, so there is no
line-drift group for them.

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:980-982` | "`client/src/modules/racer-types/` is inside **no instrument's closure at all**: render 55 files, camera 36, and `engine-reach` reports it **cannot reach the engine**. So a diff confined to a racer type selects no fingerprint." | `node scripts/engine-reach.mjs` → 76 files, 36 of them `racer-types/`; `--check` on `SpriteRacerType.js` answers **"is in the hull"**. "render 55, camera 36" is still exactly right; the false half is "no instrument's closure at all" and everything that follows from it. **The canonical home this paragraph points at, `docs/SHIP-CEREMONY.md:155-157`, was corrected the same day** — only the pointer site went stale. | `56b99a9d` 2026-09-02 (REGISTRY-LITERALS-1, "the engine-reach closure DOUBLED") | **0** |
| `:903` | `camDir.update(renderRacers, ts, raceState, CANVAS_W, CANVAS_H, **smoothDt**)` | `index.jsx:1434` passes `rawDt`. `smoothDt` exists at `:883` but feeds the effects loop; `:933` even says "Camera path (smoothDt) is intentionally unaffected", which is itself a stale source comment. | `f16ab4de` 2026-06-08 ("use rawDt instead of smoothDt for camera lerp") | **86** |
| `:899` | `camDir.updateCountdown(racers, ts, elapsed, **durationMs**, cW, cH)` | `CameraDirector.js:5219` → `updateCountdown(racers, ts, countdownElapsed, canvasW, canvasH)`; the call site passes exactly five. There is no `durationMs` parameter. | `e92ba468` 2026-08-08 (START-BOARD-2 gave the board its own duration) | **25** |
| `:905` | the rAF loop ends with `ctx.setTransform(...)` | No `setTransform` call is left in the client — the only two hits are entries in a method-name list in `parity/recordingContext.js` (control: the same grep shape finds `renderRaceFrame(` at `renderRaceFrame.js:76`). The transform is applied in `renderRaceFrame.js:152-158` via `save/translate/scale`. | `74cc6eb0`/`620c3f94` 2026-08-10 (CANVAS-SCALE-1) | **23** |
| `:904` | the diagram places `camDir.detectBattleGroup(st.racers)` in RaceScreen's rAF loop | `index.jsx` never calls it. It is called from `renderRaceFrame.js:177` through the facade at `frameCameraInputs.js:66`. (The following paragraph's point about `detectBattleGroup` being public on purpose is still true.) | `e98bf2ca` 2026-08-04 (RENDER-FINGERPRINT-1) | **29** |
| `:1266-1269` | "`camera/cameraSeed.js` … is imported by `RaceScreen` alone and is **not in `tracking-lag.mjs`'s load closure**" | `scripts/lib/raceDriver.mjs:61` imports it top-level and unconditionally, and `tracking-lag.mjs` imports `raceDriver` — so it is loaded on every run. "imported by `RaceScreen` alone" is also false in at least nine further places (`check-runin-frame.mjs:150`, six `scripts/diag/*` files, …). **The re-stamp's verdict is unaffected**: `tracking-lag.mjs:48` still pins `cameraSeed: 1439767152`, so the derivation is loaded but not used. | `246ea320` 2026-08-27 (HARNESS-CAMERA-SEED-2) | **6** |

### docs/ENDING-PHASES.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:254-255` | "the fair-arrival world makes it short on purpose (the **~2.9 s figure is UNVERIFIED** — see the note under the phase table)" | The note under the phase table, at `:196-197` **of the same document**, says the opposite: "**'~2.9 s at 20 racers' was wrong** — it is 4.45 s on the open track and 6.18 s on the closed one". `scripts/straggler-truth.mjs` exists and is what measured it. The document contradicts itself. | `de524663` 2026-08-19 (STRAGGLER-TRUTH-1 — the same commit that wrote the correcting note higher up and did not update the back-reference) | **14** |

### docs/SIM.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:222`, `:235` | "Writes two files to `client/tmp/`"; "`--out=client/tmp   # output directory (default: client/tmp)`" | The default is an absolute scratch dir **outside** the repo: `sim-fairness.mjs:301-309` → `RA_SCRATCH_DIR = process.env.RA_SCRATCH_DIR \|\| join(tmpdir(), "racearena-scratch")`, and only a RELATIVE `--out` resolves under ROOT. (The two filenames are still right.) | `83f5c8d9` 2026-07-29 (HYGIENE-1 STEP 4, "scratch off the OneDrive tree") | **35** |
| `:1178`, `:1244` (and `SWEEP-HARNESS.md:165`) | "the code is recoverable from git history at tag **`pre/dead-mechanisms-cleanup`**" | The tag does not exist — `git tag -l` has 123 and none is that one; `docs/TAGS.md:1709` records it in the DELETED table. The commit is still reachable: `0555f9d` 2026-07-23. | the 2026-07-23 tag collapse onto `v-retune-cleanup-complete` | **41** |
| `:1298-1299` | "driver `scripts/exp-gate-retune.mjs` (**branch `pre/greenfield-proto`**, commit `bf4ff90`)" | `git rev-parse --verify pre/greenfield-proto` → fatal; `git branch -a` → `master` and `origin/master` only. `docs/TAGS.md:1747` records it archived as `archive/greenfield-proto-final`. The commit and the script both still exist; the script is on master. | the 2026-07-23 branch deletion | **41** |
| `:48` | "Both sides import the identical physics modules … `lapUtils.js` — **speed scale factor** and reference FPS" | `camera/lapUtils.js` exports only `REFERENCE_FPS`, `lapProgress`, `currentLap`; its own header lists the deleted speed helpers. The sim imports one symbol from it. **SIM.md contradicts itself** — its §8 table at `:924` lists `computeSpeedScaleFactor` under "What this deleted". | `9e41c2bd` 2026-07-24 (speed/duration ship) | **40** |
| `:1110` | "`scripts/sim-fairness.mjs` is now **~3716 lines**, not ~5000." | `wc -l` → **6,195**. It was 3,736 when the line was written (2026-07-20) and 6,198 by `09727abd` (2026-08-06). | continuous growth | **42** (materially), **27** (off by 65%) |
| `:1111` | "Observers are factored into `scripts/sim/observers/` (`fairness-stats.mjs`, `gap-metrics.mjs`, `report.mjs`)." | Thirteen observer modules on disk, twelve inside the engine-reach closure — and **SIM.md's own GENERATED block at `:195-206` lists all twelve.** The generated half is current (`gen-engine-reach-doc.mjs --check` → "block is current (76 files)"); the prose beside it is three years of observers behind. | six observers added after 2026-07-10 | **≥27** |
| `:537` | `outcomeReached` — "**What it measures:** Basic sanity — **do all racers finish?**" | `sim-fairness.mjs:3172-3173` → `results.outcomeReached = finishedCount > 0` — at least ONE racer crossed. The `:535` formula sentence is fine; only `:537` is wrong, and it matters because `:539` and `:674` use it as a hard cutoff. | never true — that form has stood since `c2bbfb8c` 2026-05-31, the day SIM.md was created | **94** |
| `:798` | "All naturalness metrics (`zigzagScore`, `lateralSpeedScore`, `brakeRate`, **`stableOvertakes`**) exclude the first 4 seconds." | The first three are gated on `raceTs > 4000`. `stableOvertakes` is gated on the **20–80% race window** with no warmup term (`sim-fairness.mjs:2715-2718`). SIM.md:434 already states the 20–80% window correctly. The 4-second figure is right for the other three. | not findable as one commit | not established |

### docs/SWEEP-HARNESS.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:124`, `:128-130` | "The sim writes its run artifacts under repo ROOT … so scratch lands in `client/tmp/` **rather than an external temp dir — a known hygiene limitation, not a per-sweep choice.**" | Exactly inverted: the default IS an external temp dir; only a relative `--out` resolves under ROOT. Same evidence as SIM.md:222. (The "Tracked?" column is still correct.) | `83f5c8d9` 2026-07-29; the paragraph was written 2026-07-20 | **35** |
| `:36` | "held top-5 overtakes (a swap that stuck **≥750 ms**)" | The hold is in **leader-progress**, deliberately not wall time: `pulk-contest.mjs` → `HELD_HOLD_PROGRESS = 0.02`, with a source comment saying "Hold is in LEADER-PROGRESS, never wall seconds". The 750 ms in the tree belongs to two different things — `SM_HOLD_MS = 750` (a different metric) and `pulkLeadRotationMinHoldMs` (a mechanism knob). Wrong from the day written; a stale source comment repeats the error at `sim-fairness.mjs:2043` and `:3740`. | never true (written 2026-07-20) | **44** |
| `:57-60` | "**`cohesion.mjs`** — Stage-0 LINK observer … **Read-only, fed frame-by-frame**", under a heading whose preamble describes each observer's `sim-fairness.mjs` switch | Nothing imports it (control: `grep -c "gap-metrics" scripts/sim-fairness.mjs` → 16; `cohesion` → one filename mention in a comment). It is not wired into the sim, is outside the engine-reach closure, and is absent from SIM.md's generated table. Its own history says why: `1b98defe` 2026-07-14, "preserve cohesion Stage-0 observer **before retiring its branch**". | never true — the bullet was written six days after the observer was parked | **44** |

### docs/EYE-TEST-SEEDS.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:99` | in the bullet whose subject is `scripts/parity/replay.mjs`: "**`--replay-seed=S` is the alias for `--seed=S --races=1`.**" | `replay.mjs` accepts `--emit`, `--replay=`, `--from-label=`, `--track=`, `--racer=`, `--seed=`, `--racers=`, `--shape=`, `--laps=`, `--out=` and nothing else (its own usage block, and `main()`). `--replay-seed` is **`sim-fairness.mjs`**'s flag (`:293-295`). Control: 20 hits for "replay" in `replay.mjs`, 0 for "replay-seed". | never true — both items shipped in `42500f4d` 2026-07-24 and the doc sentence, written 2026-07-25, merged them | **39** |

### docs/TAGS.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:1781` | "It is a dated snapshot; **the current origin set is 41 tags** (the 16 additions since are listed in the addendum below)." | `git ls-remote --tags origin` → **123**. `node scripts/check-tags.mjs` agrees from both sides: "123 origin tags checked, 0 unregistered; 123 declared in the register, 0 missing at origin." Per R11 the guard is the first suspect — here the guard queried origin and the register, and the prose is the outlier. The sentence is explicitly present-tense and explicitly contrasted with the dated snapshot beside it, so it is not history. | written `0a1f9a6c` 2026-07-29 with 41 true; the 42nd tag (`pre/flapping`) was cut 2026-07-31 | **33** |

### CLAUDE.md

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| closing inventory, the `docs/fingerprints.json` entry | "`docs/fingerprints.json` — the FINISH-PAIR-1 mint carries two quotations, one the failure and one the verdict on the fresh tree" | The file contains no German at all today — no umlaut, no German function word (control: the same test returns true on `defaults.js` and finds 3 lines in `docs/FAIRNESS.md`). `FINISH-PAIR-1` does not appear in it either; its mint entry was superseded out. `scripts/check-language-closed.mjs` scans `.json` under `docs/` (only image/binary extensions are skipped) and lists a frozen allowance for **every other file on this inventory and none for this one.** The inventory names a home for two quotations that is not one. | `0a9afc9a` 2026-08-16 (SHIP-RUNIN-1 replaced the FINISH-PAIR-1 entry) | **17** |
| closing inventory, the `defaults.js` entry | "`client/src/modules/storage/defaults.js` — the podium build-up's tempo" (one quotation) | `check-language-closed.mjs`'s frozen allowance for that file reads "GRANDFATHERED — the podium build-up's tempo, **and the zoom default**", hits: 4. The guard's list names two subjects where the inventory names one. CLAUDE.md's own rule already prescribes the repair ("that entry too is grandfathered … the inventory gets the missed line added"). | the guard's allowance is dated `since: 2026-08-12`, the day the exception closed | **21** |

### docs/AUTH.md and docs/ENVIRONMENT.md

Both are in unusually good shape — every file in AUTH.md §9's table exists; every public path, role
policy, rate limit, bcrypt cost, cookie flag and client route matches source; every variable
ENVIRONMENT.md names is genuinely read. Two small misses:

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `AUTH.md:14-15` | "**Eight comments** in `server/src/auth/` and `scripts/recover-admin.mjs` cite `AUTH.md §N`" | **Seven** are comments (`authRouter.js:47,110,155`; `guards.js:23`; `recoverAdmin.js:5`; `usersStore.js:174`; `recover-admin.mjs:6`). Nine occurrences in total, the other two being string literals (`guards.js:28`, `recover-admin.mjs:154`). Neither reading is eight. The §-number map that follows is correct for all five cited sections. | not datable | **NEVER** |
| `ENVIRONMENT.md:107-109` | "These affect scripts in `scripts/`…: `RA_SCRATCH_DIR`, `RA_RECOVERY_PASSWORD`, `RA_EXPORT_VERBOSE`, `CI`, `BASE_SHA`, `HEAD_SHA`" — under a header promising "**every** environment variable RaceArena reads" | `scripts/serve-production.mjs:48` also reads `LOCALAPPDATA` and `TMPDIR`. Two short of "every". | both predate the document (`09aeb7f6`, 2026-09-01) | **1** |

### docs/DEVSCREEN-INVENTORY.md

**All 68 config values in this document are correct** — a programmatic diff of every table row
against `defaults.js` found zero mismatches, and every key in `DEFAULT_RACE_DYNAMICS_CONFIG` (60),
`DEFAULT_BASE_SPEED_CONFIG` (3) and `DEFAULT_ROW_LAYOUT_CONFIG` (3) is mentioned. The checker was
proved on a control (two deliberately corrupted values, both caught). Three false claims:

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:5-8, :48-51` | "every control in the file appears below, and nothing below is absent from the file", then lists **two** Frame Timing controls | The Frame Timing card renders a **third**: `DynamicsTuningSection.jsx:317-368`, "Live Standings update every", writing `scoreboardIntervalMs` (default 500), clamped by `SCOREBOARD_INTERVAL_MIN_MS`/`MAX_MS` = 100/2000, with 250/500/1000 presets. A key-coverage script confirms it is the ONLY config key absent from the document. | `024b58c3` 2026-08-10 (SCOREBOARD-CADENCE-1) | **23** |
| `:115-117` | "Git history is the archive — `git show pre/dead-mechanisms-cleanup` has them" | The tag does not exist. `git rev-parse --verify pre/dead-mechanisms-cleanup` → rc=1 (control: `archive/front-group` resolves). The SHA survives in `docs/TAGS.md:1709` as `0555f9d`, a real commit. **The same dead tag is cited three more times — `docs/SIM.md:1178`, `:1244`, `docs/SWEEP-HARNESS.md:165` — so this is one false claim at four sites in three documents.** | `dce03e82` 2026-07-23, which deleted the tag and wrote its SHA into `docs/TAGS.md` in the same commit | **41** |
| `:233` | `enableRowEnvSmooth` — "Key and behaviour unchanged; **`RaceScreen` still reads it**." | The only non-test reader is `raceCore.js:363-364`. Control: the same grep over `client/src/screens/RaceScreen*` for `dynamicsConfig` returns 4 live hits, so RaceScreen is reachable by the grep — it simply does not read this key. Same movement as FORCE-MAP and ARCHITECTURE. | `0bd146f3` 2026-07-24 | **40** |

### docs/RACER_DATA_MODEL.md

The canonical 20-type list (speeds and surface classes) and the surface-class assignment table are
**fully correct** — every `speedMultiplier` and `surfaceClasses` array was checked against all 20
`*RacerType.js` files. Nine false claims:

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:104, :109, :112, :114` | 12-type config table: horse `displaySize` **40**, snake **36**, rocket **40**, motorbike **36** | 47, 44, 47, 42. The other eight rows and every `frameCount`, `basePeriodMs`, `speedMultiplier` and `tintMode` in that table are right. | `11093fff` 2026-06-03, whose own message names the change: "horse 40→47 snake 36→44 rocket 40→47 motorbike 36→42". The doc's status line says "Updated 2026-06-04" — one day AFTER. | **91** |
| `:121-123, :280` | "tintMode `mask`: **Buggy, Motorbike, Plane**"; heading "### Mask-Tinting (Buggy, Motorbike, Plane)" | Seven types: + Koi, Turtle, Manta, Dolphin. (The rest of the claim holds — the nine types with no `tintMode` default to `'multiply'` at `SpriteRacerType.js:141`.) | `d33c28d6` 2026-06-03 added the four water types with `tintMode: 'mask'` | **91** |
| `:8, :204, :205` | "`TUNABLE_FIELDS` … **8 fields** since VRE-3"; "all 8"; "**6 fields** live-tunable via Dev-Screen edit modal" | **Nine** (`index.js:228-238`; the ninth is `surfaceEffectOverrides`). `CONFIG_SNAPSHOT` maps over it, so it is nine too, and `RacerEditModal.jsx:35-37` renders all nine. | `7b842086` 2026-06-08 | **86** |
| `:159-161` | "`finishT = openTrackFinishT(targetDuration, speedMultiplier)` — based on **theoretically fastest** racer"; "maximum finishT = **1.0**" | `openTrackFinishT` exists nowhere in code (control: `lapsFromDuration`-shaped grep finds `durationModel.js`). The live derivation is `deriveRaceDuration()`, built on the **mean** racer's pace, and the maximum is `1 − runoutZone`. **The doc's own line 318 already says `finishT = 1.0 − runoutZone`**, so it contradicts itself. | `5f29a99a` 2026-05-03 deleted the function | **122** |
| `:140, :152` | "Fallback: `lapsFromDuration(duration)`" | Deleted by `9e41c2bd` 2026-07-24 (speed/duration ship). The migration-only survivor is `legacyLapsFromDefaultDuration()`; the live path is `trackDefaultLaps(track)`. | `9e41c2bd` 2026-07-24 | **40** |
| `:172-175` | "**2 seconds** after the last finish line crossing → fade to `/results`" | `index.jsx:1121-1127` uses `endingOnRaceScreenMs({holdMs: finishHoldAfterLastMs, pauseMs: finishPauseMs})` = hold + pause. | `d1b395e3` 2026-05-25 replaced the hardcoded 2000; ENDING-HOLD-1 added the hold | **100** |
| `:131, :297-299` | `racearena:tracks` status "**Active**"; "`SetupScreen` and `TrackManager` read from `localStorage['racearena:tracks']`" | The key is not in `KEYS` and is explicitly ignored — `trackLoader.test.js:161-165` pins it: "cold cache + stale local data → returns [] (server cache is the only source)". Both readers go through the server; the live cache key is `racearena:cache:serverTracks`. | `d5b9d57e` 2026-06-17 | **77** |
| `:406` | "no longer active for all **5** default tracks" | 10 seeded default tracks, all 10 with a non-empty `surfaceClasses`. | tenth track `83937c3e` 2026-06-17 | **≥77** |
| `:416` | "The former `rteDefinitions` placeholder (`getRteDefinitions()`) **is removed in VRE-1**." | Still on the class (`SpriteRacerType.js:306-312`) with a live test (`SpriteRacerType.test.js:555-566`). `git log -S"getRteDefinitions" --all` shows one commit adding it and no removal. | never removed | **99** (NEVER true) |
| `:207` | "`RACER_TYPE_IDS` — **Sorted** array of all 20 built-in type IDs" | `Object.keys(RACER_TYPES)` — insertion order (`horse, duck, snail, elephant, …`). The count 20 is right. | the original definition | **NEVER** |

### docs/TRACK_LIFECYCLE.md

*(Its `defaultTracks.js` claim was corrected by `49fd9386` and is not repeated.)* Verified correct:
the 10 Default-Track names, all five lifecycle flows, the PR #58 delete safeguards, and the
orphaned-geometry behaviour. Six further false claims:

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:120` | server data-layout diagram: `luger-hill.json ← **Non-default named track**`, while all nine others are "Default-Track (seeded)" | It is a seeded default like the rest — `server/seeds/tracks/luger-hill.json` exists and the record carries `isDefault`. The doc's own line 31 lists Luger Hill among "the 10 built-in tracks". | `83937c3e` 2026-06-17 | **77** |
| `:149` | "Boot migration — **One-shot**: if `server/data/.default-tracks-seeded` absent … create records … with **empty geometry arrays**. Write marker file on completion." | Wrong three ways. The marker is `.tlh1-defaults-migrated` (`tracks.js:32`) — the name in the doc survives nowhere in `server/`. It gates nothing (`tracks.js:426-437`: "Legacy marker — no behavior gating"); seeding is per-file idempotent. And the seeds are NOT empty: `dirt-oval.json` has 200 inner, 200 outer, 15 centre points, `closed: true`. **The doc's own line 127 already says "no migration marker — boot migration runs on every boot".** | PR #58 (2026-05-02) removed the gating; `83937c3e` 2026-06-17 replaced code seeds | **77–123** |
| `:209-231` | a "seeded record" JSON example for dirt-oval | Wrong in seven fields: `icon` 🏟️→🐴, `color` `#c8a96e`→`#a0522d`, `surfaceClasses` `["earth"]`→`["sand","earth","mud","grass"]`, `trackLights` colour and speed, `geometryId` null→a real UUID, `backgroundImageFile` null→`dirt-oval.jpg`, and all three point arrays empty→200/200/15. Only `id`, `name`, `defaultRacerTypeId` and `closed: true` survive. | `83937c3e` 2026-06-17 | **77** |
| `:152, :244-249` | backup filenames `HH-MM-SS-<id>.json`, e.g. `14-32-07-dirt-oval.json` | `tracks.js:382` → `slice(11, 23)`, i.e. `HH-MM-SS-mmm`. The real files agree: `22-40-12-798-city-circuit.json`. The millisecond field is what lets two saves in the same second both survive. | not separately datable | — |
| `:294, :296` | "`docs/ROADMAP.md — Geplante Phasen-Reihenfolge`"; "`docs/AUDIT.md — Bewusst akzeptierte Befunde`" | Neither heading exists (control: `grep -c "Orphaned Geometries"` in the same file → 1). ROADMAP is now a redirect with no phase order at all. **Both are also German section names, which the language rule forbids.** | `e180a6be` 2026-05-25 and `23c95428` 2026-05-26 removed the headings; `c49d5af5` 2026-08-27 compounded the first | **100 / 99** |
| `:203` | "User draws **all 5 tracks** between TLH-2 merge and TLH-3 merge" | 10. The doc's own line 191 flags the growth and lines 198-199, 279, 281 say 10. | same growth | **≥77** |

### docs/TRACK_EDITOR.md

Verified correct: the 7 effect IDs, `trackLights.js` and its two functions, `EffectConfig/`,
`getEffect`/`listEffects`, the deletion of `modules/environments/`, the absence of `SvgPathShape`,
the 1280×720 canvas, the two-mode load flow and its testids, and the `EditorShape` API minus one
entry. Seven false claims:

| file:line | what it says | what is true | what made it false | age |
| --- | --- | --- | --- | --- |
| `:246, :253-265, :269` | "**Status:** Planned — Phase VRE-3 adds the Track Manager UI"; "### Initial Surface-Class Assignments — **9** Default Tracks" with dirt-oval `['earth']`, garden-path `['grass','earth']`, ice-track `['ice','snow']`; the multi-select in the future tense | VRE-3 shipped: `TrackManager.jsx:31` imports `useSurfaceClasses`, `:499` renders the "Surface Classes" label, `:507-517` is the multi-select, `:635` makes it required for save. And there are **10** tracks, with three of the nine listed rows now wrong (dirt-oval `["sand","earth","mud","grass"]`, garden-path `["grass","earth","mud","sand"]`, ice-track `["snow","ice","air"]`), plus luger-hill `["ice","air"]` absent. | `020dbda2` 2026-05-01 (status); `83937c3e` 2026-06-17 (table) | **124 / 77** |
| `:127-135` | "When the server is unreachable and the geometry cache is empty, the frontend falls back to the **Code-Bundle (`defaultTracks.js`)** … A status banner is shown … Write operations are disabled"; "after the **5** default tracks have been drawn" | `defaultTracks.js` does not exist (control: `ls client/src/modules/storage/` lists 14 files). `trackLoader.js:118-124` says the opposite in its own comment: "Cold cache (offline, first load) → empty list; **no DEFAULT_TRACKS fallback**." No `fallbackMode`, no banner. TLH-3 is deferred — **this document is the last place still asserting the fallback in the present tense**, and `docs/ARCHITECTURE.md:999` and `docs/TRACK_LIFECYCLE.md` both already say NOT BUILT. | never built; `d5b9d57e` 2026-06-17 removed the last code that could have backed it | **≥77** |
| `:310` | `EditorShape` API list includes "**`getCenterFrac`** — computed from track extents" | The symbol exists nowhere and never has. `git log -S"getCenterFrac" --all` returns exactly one commit — the one that wrote this document. Control: `getActualTrackWidth`, a sibling method in the same list, has 43 hits. **The purest never-true claim in the audit.** | the spec listed an API that was never implemented | **132** (NEVER true) |
| `:359-367` | localStorage table lists `racearena:tracks` ("Preset definitions"), `racearena:racers` ("Custom racer definitions"), `racearena:dataVersion` ("Storage schema version marker") as live; and the geometry index "sorted by `updatedAt` desc" | `racearena:racers` and `dataVersion` return 0 hits over `client/src` + `server/src` (control: `racearena:raceDefaults` hits). `racearena:tracks` is ignored. The INDEX is append-order (`trackStorage.js:211-216`); the `updatedAt desc` sort is on `listTracks()`'s return value. **`racearena:dataVersion` is worse than dead — the project's standing rule is no schema, no version bumps, no migrations, so the row invites rebuilding something deliberately retired.** | `d073fa02` 2026-04-29 and `d5b9d57e` 2026-06-17 | **126 / 77** |
| `:392` | Future Extensions → "Image upload via editor (file chooser), with server-side storage (**Phase 5**)" | Shipped on both sides: `POST /api/tracks/:id/background` with multipart, 413/400 guards (`tracks.js:715-731`) and `DELETE`; client `TrackEditor.jsx:134-135, :716` with two tests. | — | — |
| `:125` | "See `docs/TRACK_LIFECYCLE.md — Track-Delete Behavior`." | That section name returns 0 hits in that file (control: "Orphaned Geometries" → 1). The matter is covered by "Deleting a Track" and "Orphaned Geometries". | — | — |
| `:332` | "All sub-steps are complete. **Branch `feat/track-editor` is open as a PR (CI green).**" | No such branch, local or remote. `git branch -a` → `master` and `origin/master` only (that IS the control). | merged `e63c7cd7` 2026-04-23 and pruned | **~132** |

---

## 3. CLAIMS THAT COULD NOT BE CHECKED MECHANICALLY

Stated rather than asserted afresh. None of these is marked false.

1. **The generated guard-cost table in `docs/SHIP-CEREMONY.md`** (world 117 s / camera 57 s / render 54 s, "measured on commit `b1a3bb1b` … on `Testrechner`"). Reproducing it means paying all three fingerprints. The document already says nothing runs its staleness check, that its `--check` counts commits while what moves a duration is the machine, and that two of its three rows were once out by more than a factor of two.
2. **Every `<!-- MEASURED: -->` figure** in `docs/CAMERA_DIRECTOR.md`, `docs/ENDING-PHASES.md` and `docs/SHIP-CEREMONY.md` — the phase-6 table, the tracking-lag tables, the endgame and run-in figures. `check-measured-stamps.mjs` reports "3 stamps in 3 of 61 living documents, 0 stale", and that is FRESHNESS, never accuracy; it says so itself. Verified only that every stamp's `depends=` path still exists — none points at a moved or renamed file.
3. **Anything the owner's eye decides** — every verdict, sitting and acceptance in `docs/CAMERA_DIRECTOR.md` §8, `docs/TAGS.md`'s ship entries, and `docs/EYE-TEST-SEEDS.md`'s central promise that a typed seed reproduces the same race on screen. Not checkable from the repository by construction, and §8.3 says so.
4. **Every absolute measured number in the sim documents** — band-reach %, runaway/parade rates, `physicsTax`, the 400-race and 300-race gate tables, "+21% top-5 action", `fairChanceTop5Rate`, the clip-rate and centreline-share figures, the standstill comparison. Each needs a multi-hundred-race sweep. Both documents already banner most of these as retired pre-unification history.
5. **Every alternate-world fingerprint reproduction** (`docs/SIM.md:971-976`, `:1321-1322`) and every per-track hash quoted in prose across `docs/TAGS.md` and `docs/CAMERA_DIRECTOR.md`. Each is a full instrument run. `check-fingerprints.mjs` reports "4 roles, 1097 tracked files scanned, 0 stray copies", which is the only mechanical statement available about them.
6. **"a run without the flag is byte-identical"** — asserted for `--front-action`, `--early-decided`, `--brake-depth`, `--gap-metrics`, `--comeback-reality`, `--action`. Each is guarded by a null-initialised accumulator, which is consistent with the claim; proving it needs a before/after fingerprint pair.
7. **`docs/SIM.md:598`'s "100 rows per race"** for `--early-decided`. The loop is `while (edNext <= 100 && raceProgress >= edNext/100)`, i.e. up to 101 grid points. Whether the 101st is ever emitted depends on `raceProgress` reaching 1.00, which needs a run. Flagged as a POSSIBLE off-by-one, not recorded as false.
8. **`docs/SIM.md:101`'s "every director decision on every frame"** for `camera-fingerprint.mjs`. (Its sibling claim about `render-fingerprint.mjs` — "sixteen fixed frames" — IS verifiable and correct: `SAMPLE_AT` has exactly 16 entries.)
9. **`docs/NIGHT-RUN.md`'s "about ten minutes"** and "two tests per five runs" flake rate — five full browser-suite runs.
10. **`docs/OPEN.md` in its entirety.** It self-declares: "Generated 2026-08-23 from master `27ffb342` … DERIVED AND NEVER AUTHORITATIVE … where the two disagree the backlog is right and this page is stale." Its items are dated renderings, not current claims. Worth knowing anyway: its "Give the `.git/worktrees` stubs a helper" line was closed tonight by WORKTREE-STUBS-1, and its "a move of 39 files" for `racer-types/` is 41 non-test files today.
11. **`docs/AUDIT.md` in its entirety.** `docs/README.md:121` declares it "the dated security and quality audit log. **Read rows as history.**" Its test counts are records of the day; correcting them would falsify the log.
12. **`docs/DEAD-ENDS.md:6-7`'s "997 commits … docs/LESSONS.md (183 lessons)".** The clause is dated in the same sentence ("2026-04-19 … 07-26") and is provenance for the distillation, not a claim about today. For the record, LESSONS is at Lesson 220 — but that does not make the sentence false.
13. **Statements about `reports/`** — append-only by rule and explicitly outside `check-doc-links`, `check-measured-stamps` and `check-language-closed`. Allowed to rot.
14. **`docs/README.md:5-7`'s "four empty directories a reader may find".** Git tracks files; an empty directory is not in the repository, so there is nothing to check.
15. **`docs/DEVSCREEN-INVENTORY.md:227` — `contestWindowStart` "read by the sim's front-battle observer".** Partly checkable and NOT cleanly false. The observer says the opposite about itself (`outcome-front-battle.mjs:54`: "No progress constant lives here: contestWindowStart is always passed in"), but `sim-fairness.mjs:462-468` reads it and passes it down, and `racePlanner.js:398` reads it in the browser. Imprecise about who does the reading rather than wrong about the mechanism; deciding it needs a judgement about what "read by" means, which is not mechanical.
16. **`docs/TRACK_EDITOR.md:45-57` (Decisions 4 and 5) and `:49`.** Line 47 says tracks live in `localStorage`; lines 73 and 83 of the same document say presets are server records after Phase L / TLH-1, and the server is in fact authoritative. But the heading frames these as decisions "agreed before implementation began" and the rationale scopes them to "v1". Whether that framing makes them history or live false claims is an editorial call, not a mechanical one. The contradiction is recorded; the verdict is not taken.
17. **`docs/TRACK_EDITOR.md:289`'s five camera states.** `CAM_STATE` has six (`PHOTO_FINISH` was added). The list is explicitly a *version-1 scope* checklist rather than an inventory, so listing five is not obviously an assertion that five is all there are. Not marked false.
18. **`docs/RACER_DATA_MODEL.md:232-277`, the body-fill measuring rule.** Every code site named exists and is correctly named (`computeOpaqueBoundingBox` at `backgroundRemoval.js:86`, `computeSpriteBoundingBox` at `:120`, `measureBodyFill` at `RacerEditor/canvasUtils.js:43`, `scripts/audit-sprite-crops.mjs` present). The NUMERIC claims — manta's 0.766-0.805 versus 0.578-0.680, "8 of the 20 built-in types", "two of the twenty" decided by the alpha-10 boundary — each need the spritesheets rendered and the measurement re-run. Not done, not marked.
19. **`docs/TRACK_EDITOR.md:201-204`, track-light animation behaviour** (0.4 base alpha, ~10-light wave, ~8% flash chance). Renderer behaviour describing visual output; confirming it means reading the draw loop against a running frame. Not checked.
20. **`docs/TRACK_LIFECYCLE.md:181` — "12 new component tests … 7 updated".** Both files exist, but these are counts of tests ADDED BY THAT PR, which today's file contents can neither confirm nor refute.
21. **`docs/DEVSCREEN-INVENTORY.md:31` — `configFingerprint.js`.** The document names only the basename; the file is at `client/src/modules/parity/configFingerprint.js` and `splitConfigDiffs` really is at `:56` there. No path is asserted, so nothing is false — noted only because a reader will not find it at `client/src/modules/`.

---

## 4. PROPOSED REPLACEMENT TEXT

Minimum edits. Nothing rewritten for style, tone, structure or completeness. Each names what it was
and what made it false, so the next reader sees the movement.

**`docs/API.md:3`**
> **Owns:** the `/api/tracks` and `/api/surface-classes` surfaces and `/api/health`. **It does NOT
> own "every endpoint", and said so until 2026-09-02 (DOC-TRUTH-1).** `server/src/app.js` mounts
> nine routers; the six this page does not document — `/api/auth`, `/api/users`,
> `/api/player-groups`, `/api/brands`, `/api/racers`, `/api/seed-notices` — have been live since
> 2026-06-13 (`d0a57d44`) and later. Auth behaviour is [AUTH.md](AUTH.md)'s; the rest is
> undocumented and the routers are the only home.

**`docs/API.md:97`**
> `{ status: "ok", timestamp: "<ISO>", build: <identity> }` — the `build` field was added by
> BUILD-FROM-OUTSIDE-1 (`a24f47e2`, 2026-08-23) and this row omitted it until 2026-09-02.

**`docs/DEPLOYMENT.md:92-104`**
> `docker compose build` supplies the client build to the image through a **named build context**.
> The image's build context is the **repository root** (`context: .`) — it was `./server` until
> IMAGE-STANDALONE-1 (`af0bb3b5`, 2026-09-01), and this paragraph said so until 2026-09-02.
> `client/dist` is a build artefact rather than source and the root `.dockerignore` is an allow-list
> of source, so `additional_contexts: { client: ./client }` keeps it an explicit input.
>
> - **Run `npm run build` in `client/` first.** The image copies a build, it does not make one.
> - A manual build outside compose: `docker build --build-context client=./client -f server/Dockerfile .`
> - **The image IS standalone since 2026-09-01.** `server/utils/` (COPY-UTILS-1) and
>   `shared/nameLimits.mjs` (IMAGE-STANDALONE-1) are copied in; run it with no mounts and it works.
>   This bullet said the opposite until 2026-09-02.

**`README.md:66`**
> An **unconditional race-action director** (a PULK-phase longitudinal speed layer in
> `raceGovernor.js` — `applyPulkLeadRotation`, which runs whenever a race plan runs) stages a
> contested front before the finishing order is resolved. *(This read "optional … two-master
> tail-lift + contest-injector, default OFF" until 2026-09-02; that mechanism was removed by
> `e389b99d`, 2026-07-13.)*

**`README.md:79`** — `React 18, Vite, React Router **v7**, CSS Modules` *(said v6; `226de4b0`, 2026-07-29)*.

**`README.md:116`** — `[Phase status](docs/ROADMAP.md) (a redirect since ROADMAP-FOLD-2, 2026-08-27; the table and the detail are both in the backlog)`.

**`docs/README.md:3-4`** — after "the order to read them in":
> **Six living documents are not yet listed below, and the map said "every" anyway until 2026-09-02
> (DOC-TRUTH-1): `AUTH.md`, `ENVIRONMENT.md`, `ENDING-PHASES.md`, `NIGHT-RUN.md`, `OPEN.md`,
> `MORNING.md`.** Adding them is a separate edit; naming them here is what makes the omission
> visible instead of invisible.

**`docs/ROADMAP.md:14-15`**
> **Five markdown links in four documents** point at `docs/ROADMAP.md` (`README.md`,
> `docs/README.md`, `docs/BACKLOG.md`, `docs/SIM.md`), and twenty-three further files mention the
> path in prose. *(This said "Eleven documents and reports link to it" from the day it was written,
> 2026-08-27; re-counted 2026-09-02 and it was never eleven under either reading — nor is any of the
> five links in `reports/`.)* Deleting the path would break every one of them.

**`docs/VERIFY-RULES.md:111-112`** — replace both numbers with a pointer so they cannot rot again:
> The trigger is the transitive closure of `raceCore.js`'s imports, computed from source — the
> counts are the generated block in [SHIP-CEREMONY.md](SHIP-CEREMONY.md), and this sentence
> deliberately quotes none. *(It typed "19 files against 103" until 2026-09-02; both went wrong on
> 2026-08-10, the day SHIP-CEREMONY replaced its own copies with the generator.)*

**`docs/VERIFY-RULES.md:39-41`**
> …plus `gen-engine-reach-doc.mjs` and `gen-ceremony-costs.mjs` by name, plus the **three** suite
> guards declared in `routing.mjs`. *(This said one generator and two suites until 2026-09-02;
> `gen-ceremony-costs.mjs` joined 2026-08-10 and `server-suite` 2026-08-15.)*

**`docs/VERIFY-RULES.md:43`** — heading clause only:
> **Why the generators are named individually rather than a `gen-*` wildcard.**

**`docs/PROJECT-PRINCIPLES.md:86`** — do not type the new hash; point:
> The shipped world is the `world` role in [fingerprints.json](fingerprints.json) = COMBO15 + margin
> hysteresis + lateral acceleration cap (fingerprint lineage in [SIM.md](SIM.md)). *(This named
> `dc4647be` until 2026-09-02. That value was superseded on 2026-09-02 by
> FINGERPRINT-TRACK-DEFAULTS-1 and its premise had been wrong since 2026-08-25; restating a
> fingerprint outside its one home is what put it here.)*

**`docs/PROJECT-PRINCIPLES.md:44`** — replace the dead example with a live one:
> - `racearena:racerTypeOverrides` — one key for racer-type cosmetics. *(This named
>   `racearena:racerTypes` until 2026-09-02; that key went with `racerTypeStorage.js`, `aa83fad4`,
>   2026-06-18.)*

**`docs/FAIRNESS.md:60`** — the honest form is count-free:
> No measurement anywhere attributes the 85–90% between the draw bias and the controller: the
> reports that mention `trajectoryMult` and the reports that mention `bandBias` overlap in only a
> handful of files and never in an attribution. *(This said "47 reports … and none of them mentions
> it beside `bandBias`" until 2026-09-02; today it is 50 and 5, so the count and the "none" were
> both wrong.)*

**`docs/FORCE-MAP.md:102`** — the header already forbids values here; delete rather than fix:
> - **Config**: `DEFAULT_BASE_SPEED_CONFIG.min/max`; `reRollVariationPercent`,
>   `reRollTransitionDuration`, `reRollIntervalDivisor`, `reRollLastPositionPercent` — values in
>   `defaults.js`. *(Four wrong values stood here from `d904bf54`, 2026-07-01, until 2026-09-02.)*

**`docs/FORCE-MAP.md:148,150`**
> - **When**: only in `OUTCOME` phase (`corridorStart`..`corridorEnd`; values in `defaults.js`).
> - **Config**: `racePlanCorridorStart`, `racePlanCorridorEnd`. *(This said "0.55–0.95" and
>   `racePlanCorridorEnd` 0.95; corridorEnd became 1.0 in `07bf2f11`, 2026-06-26.)*

**`docs/FORCE-MAP.md:193`**
> …(`pulkStart` = `racePlanPulkStart` since COMBO15; `pulkEnd = corridorStart = choreoOutcomeStart`
> — values in `defaults.js`). *(This stated the window as **[0.15, 0.5)** with `choreoOutcomeStart`
> **0.5** until 2026-09-02; it became 0.6 in `5646d238`, 2026-07-17 — the same "documented as the
> shipped 0.5" defect `scripts/check-config-claims.mjs`'s header was written for.)*

**`docs/FORCE-MAP.md:422`** — move the row into the REMOVED form the rows around it already use:
> | `preOverlapFreeLane` approach-zone steering (part of L3) | **REMOVED (Commit B)** — the key is gone from `defaults.js` and from the tree | — |
>
> *(This row read "Off by default (`false`)" with a live `defaults.js:316` citation until 2026-09-02;
> the key went in `f3116226`, 2026-06-28.)*

**`docs/FORCE-MAP.md`, head of §A** — one paragraph, then a find-and-replace of the file name in the
27 citations:
> **THE BROWSER'S STEP LOOP IS `client/src/modules/raceCore.js`, NOT
> `client/src/screens/RaceScreen/index.jsx`.** It moved there on 2026-07-24 (`0bd146f3`, "extract the
> REAL RaceScreen core"); `index.jsx` now imports `createRaceFromIdentity` and `stepRacePhysics` and
> calls nothing else. **Every `index.jsx` citation below named the wrong file until 2026-09-02** —
> `advanceRacerT` does not occur in `index.jsx` at all — and the line numbers must be re-read from
> `raceCore.js` rather than translated.

**`docs/PHASE-CONTRACT.md:20`**
> `choreoPulkEnd = config.choreoOutcomeStart ?? phaseFractions.pulkStart` *(this said `?? 0.25` until
> 2026-09-02; HYGIENE-1 STEP 1, `9a79ccf1`, 2026-07-29, replaced the literal so nothing can drift
> from it)*

**`docs/PHASE-CONTRACT.md:11-15`**
> `DEFAULT_PHASE_FRACTIONS` (racePlanner.js:82-89): `pulkStart` is **not a literal** — it is
> `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart` — and `pulkEnd 0.5, transitionEnd 0.75,
> corridorStart 0.55, corridorEnd 1.0, midToLateSwitchFraction 0.85` are the raw fallback literals.
> *(This listed `pulkStart 0.25` as a literal until 2026-09-02; `9a79ccf1`, 2026-07-29.)*

**`docs/PHASE-CONTRACT.md:30-31, 80, 157-158`** — three sites, same edit; the document elsewhere
avoids stating values, so state none:
> At the shipped defaults (values in `defaults.js`; `choreoOutcomeStart` is **0.6**, not the 0.5 this
> document stated until 2026-09-02 — `5646d238`, 2026-07-17) the three live phases are CHAOS/PRE_PULK,
> PULK and OUTCOME, in that order and with no TRANSITION between them.

**`docs/PHASE-CONTRACT.md:166-167`**
> Every force term is scaled by `governorPhaseWeight`, which fades to **EXACTLY 0** by OUTCOME, so
> `governorMult` is slewed to exactly 1.0 there. *(This said the weight "fades to EXACTLY 1.0" — which
> is the multiplier's value, not the weight's — from the day the file was written.)*

**`docs/PHASE-CONTRACT.md`, under the header** — one line:
> **Every `racePlanner.js` and `DynamicsTuningSection.jsx` line number below was re-read on 2026-09-02
> and 22 of them were wrong**; both files have roughly doubled since this document was written on
> 2026-07-14. The `raceGovernor.js` citations were all still correct.

**`docs/ARCHITECTURE.md`, the folder tree** — eight one-line corrections:
> `index.jsx  # Main component (~1900 lines)` · delete the `priorityModeOverlay.js` line and add
> `startBoardRendering.js  # Start board` · `DevScreen/  # Developer / admin panel (16 sections,
> 2-tier Operator/Advanced)` · `RaceTuningSection.jsx  # Thin coordinator` (drop the line count) ·
> `TrackEditor.jsx  # Main component` (drop the line count) · delete the `racerTypeStorage.js` and
> `canvasUtils.js` lines · `LugeRacerType.js  # Built-in type 13 of 20 — 2048×128 spritesheet, 16
> frames 128×128, screen tinting, 17 coats, ice/snow surface classes` · replace the three
> `surface-effects/` file lines with `registry.js  # listAllSurfaceClasses / getSurfaceClass /
> resolveActiveSurfaceClass` and `defaults.js  # 9 default Surface Class definitions (code constants)`.
>
> Add one line above the block: **"Corrected 2026-09-02 (DOC-TRUTH-1). Three entries here —
> `surface-effects/index.js`, `defaultClasses.js`, `surface-effects/surfaceClassApi.js` — named files
> that never existed on any branch; the rest went stale between 2026-05-28 and 2026-08-17. Line
> counts are not restored: a line count in a tree diagram cannot be kept true."**

**`docs/ARCHITECTURE.md:171`** — `battlePulkThresholdPx` → `battlePulkThresholdT` (**a lap fraction, not pixels** — the `Px` name has never existed).

**`docs/ARCHITECTURE.md:193-195`**
> ```
> cam.zoom is derived from each state's `visibleCorridors` in DEFAULT_CAMERA_CONFIG
> overviewZoom = CANVAS_W / worldW (adaptive: full world fits at zoom=1 on 1280px ref)
> ```
> *(This block described `cam.zoom = overviewZoom × stateRatio` with four named ratios until
> 2026-09-02. `stateRatio` has never existed in source; the per-state zoom became `visibleCorridors`
> in `dcca55ba`, 2026-08-03.)*

**`docs/ARCHITECTURE.md:285` and `:309`** — drop the function that is not there:
> Conversion helper (raceBehavior.js:249): `pxToPhysicalY(px, trackWidth) = px / (trackWidth / 2)`
>
> 2. **Do NOT reintroduce raw `physicalY × trackWidth` conversions.** Use `pxToPhysicalY`. The
>    factor-of-2 lives only in it. *(This named a `physicalYToPx` companion until 2026-09-02; that
>    function went with Commit B, `f3116226`, 2026-06-28.)*

**`docs/ARCHITECTURE.md:311`** — invariant #3 has no subject left; retire it in place so the count of
seven does not silently change:
> 3. **RETIRED 2026-09-02 (DOC-TRUTH-1).** This forbade changing `REFERENCE_TRACK_WIDTH = 98`, the
>    Dirt Oval calibration anchor for `lateralScale`. Both symbols were removed with the legacy
>    lateral force stack (`bc68c378`, Commit A, 2026-06-27).

**`docs/ARCHITECTURE.md:324`**
> - **Sim brake-match parity — CLOSED.** `sim-fairness.mjs:2657` reads `trailer.frameSizePx` for the
>   dynamic brake-match threshold and the sim **does** set it (`:1225`,
>   `frameSizePx: effectiveDisplaySize`), so it does not fall back to `0.014`. What remains is
>   verifying the threshold matches the game's `dynamicBrakeMatchT`. *(This said the sim "never sets"
>   it, and cited `~1007`, until 2026-09-02 — while its own last clause said "already set".)*

**`docs/ARCHITECTURE.md:645-646`**
> - `modules/raceCore.js` — the step loop, `areaBonusMult` and `trajectoryMult` in the physics product
> - `modules/racePlanner.js` — `createRacePlan`, `createTrajectoryController`
> - `screens/RaceScreen/index.jsx` — Race Plan activation and the rAF loop that drives `raceCore`
>
> *(`computeBereichsBonusMap` was listed here until 2026-09-02; it went in `e180a6be`, 2026-05-25.
> The physics loop moved out of `index.jsx` in `0bd146f3`, 2026-07-24.)*

**`docs/ARCHITECTURE.md:821`** — `**9 Default Surface Classes (code constants in
`client/src/modules/surface-effects/defaults.js`):**` *(named `defaultClasses.js`, a file that never
existed, until 2026-09-02; `docs/API.md:37` has always named it correctly)*.

**`docs/CAMERA_DIRECTOR.md:980-982`** — second and third sentences only:
> `client/src/modules/racer-types/` was inside no instrument's closure at all until REGISTRY-LITERALS-1
> (2026-09-02) put it inside the WORLD one: render 55 files, camera 36, neither containing a racer
> type, and `engine-reach --check` on a racer type now answers "is in the hull". So a racer's PHYSICS
> selects the world fingerprint; a diff confined to how a racer is DRAWN still selects none of the three.

**`docs/CAMERA_DIRECTOR.md:903`** — `camDir.update(renderRacers, ts, raceState, CANVAS_W, CANVAS_H, rawDt)   ← rawDt since f16ab4de (2026-06-08), not smoothDt`

**`docs/CAMERA_DIRECTOR.md:899`** — `camDir.updateCountdown(racers, ts, elapsed, cW, cH)   ← durationMs dropped by START-BOARD-2 (e92ba468, 2026-08-08)`

**`docs/CAMERA_DIRECTOR.md:905`** — `renderRaceFrame(ctx, …)  ← applies the transform (save/translate/scale) since CANVAS-SCALE-1 (2026-08-10); ctx.setTransform is gone from the tree`

**`docs/CAMERA_DIRECTOR.md:904`** — `renderRaceFrame.js → camera.detectBattleGroup(st.racers)   ← render only, via frameCameraInputs.js; moved out of index.jsx by RENDER-FINGERPRINT-1 (e98bf2ca, 2026-08-04)`

**`docs/CAMERA_DIRECTOR.md:1266-1269`** — third and fourth sentences:
> It was imported by `RaceScreen` alone and was not in `tracking-lag.mjs`'s load closure when this was
> written; HARNESS-CAMERA-SEED-2 (`246ea320`, 2026-08-27) made `raceDriver.mjs` import it, so it now
> is. The argument still holds: `tracking-lag.mjs` pins `cameraSeed: 1439767152` explicitly and never
> calls the derivation.

**`docs/ENDING-PHASES.md:254-255`**
> of the RACE, and the fair-arrival world makes it short on purpose (the ~2.9 s figure was MEASURED
> and REFUTED by STRAGGLER-TRUTH-1, 2026-08-19 — see the note under the phase table).

**`docs/SIM.md:222`** — `Runs 50 races on all track×racer×duration combos. Writes two files to the scratch dir (`$RA_SCRATCH_DIR`, else `<os-tmp>/racearena-scratch` — moved off the repo tree by HYGIENE-1, 2026-07-29):`

**`docs/SIM.md:235`** — `  --out=client/tmp     # output directory (default: $RA_SCRATCH_DIR or <os-tmp>/racearena-scratch; absolute honoured, relative resolved under repo ROOT)`

**`docs/SIM.md:1178`, `:1244`, `docs/SWEEP-HARNESS.md:165`** (all three) — `… recoverable from git history at commit `0555f9d` (the tag `pre/dead-mechanisms-cleanup` was deleted in the 2026-07-23 tag collapse; see docs/TAGS.md).`

**`docs/SIM.md:1298-1299`** — `driver `scripts/exp-gate-retune.mjs` (now on master; measured on commit `bf4ff90`, whose branch `pre/greenfield-proto` was deleted 2026-07-23 and preserved as tag `archive/greenfield-proto-final`).`

**`docs/SIM.md:48`** — `- `camera/lapUtils.js` — reference FPS (the speed-scale helpers it also held were deleted at the speed/duration ship, `9e41c2bd`; see §8)`

**`docs/SIM.md:1110`** — `- **Size & structure:** `scripts/sim-fairness.mjs` is **~6,200 lines** (`wc -l`, 2026-09-02 — it was ~3,716 when this line was written on 2026-07-20 and has grown continuously since).`

**`docs/SIM.md:1111`** — `Observers are factored into `scripts/sim/observers/` — twelve of them as of 2026-09-02; the generated engine-reach table in §1 is the current list. (Three when this line was written on 2026-07-10.)`

**`docs/SIM.md:537`** — `**What it measures:** Basic sanity — did the race resolve at all? (**at least one** racer crossed the line; it is not a check that every racer finished.)`

**`docs/SIM.md:798`** — `All naturalness metrics (`zigzagScore`, `lateralSpeedScore`, `brakeRate`) exclude the first 4 seconds of each race; `stableOvertakes` is bounded by its own 20–80% window instead (§3). This is because:`

**`docs/SWEEP-HARNESS.md:128-130`** — `The sim's default scratch dir is `$RA_SCRATCH_DIR`, else `<os-tmp>/racearena-scratch` — off the repo tree since HYGIENE-1 (2026-07-29); an absolute `--out` is honoured as-is and a relative one still resolves under repo ROOT (e.g. `--out=client/tmp`). Keep heavy raw output in the scratch dir; commit only the small distilled CSVs/summaries.` — and the `:124` table row's location cell becomes `` `client/tmp/` (or the default scratch dir) ``.

**`docs/SWEEP-HARNESS.md:36`** — `held top-5 overtakes (a swap that stuck ≥ `HELD_HOLD_PROGRESS` of leader-progress — progress, never wall ms; the 750 ms figure this said was `cleanOvertakes`' `SM_HOLD_MS`, a different metric)`

**`docs/SWEEP-HARNESS.md:57-60`** — `… MEASURE-ONLY — no correction is applied, and **nothing currently feeds it**: it was preserved standalone when its branch was retired (`1b98defe`, 2026-07-14) and is imported by nothing but its own test. Carries the open-vs-closed lap-seam golden (`cohesion.test.mjs`)…`

**`docs/EYE-TEST-SEEDS.md:99`** — move the sentence out of the bullet's subject: `… flags a drifted identity). (The `--seed=S --races=1` alias `--replay-seed=S` is **`sim-fairness.mjs`**'s flag, not this entry's — both landed in `42500f4d`, 2026-07-24.) The identity loads the same way …`

**`docs/TAGS.md:1781`**
> It is a dated snapshot; the current origin set is what `node scripts/check-tags.mjs` reports against
> origin, and this sentence deliberately quotes no number. *(It said "41 tags" from `0a1f9a6c`,
> 2026-07-29, until 2026-09-02; the 42nd tag was cut on 2026-07-31 and there are 123 today.)*

**`CLAUDE.md`, the closing inventory** — two entries:
> - `docs/fingerprints.json` — **the quotations are GONE from this file and the entry is kept as a
>   record of where they were.** The FINISH-PAIR-1 mint carried two; its entry was superseded out by
>   SHIP-RUNIN-1 (`0a9afc9a`, 2026-08-16) and the file carries no German today. Noted 2026-09-02
>   (DOC-TRUTH-1). Nothing is to be restored — a superseded mint entry is not evidence anyone needs.
> - `client/src/modules/storage/defaults.js` — the podium build-up's tempo, **and the zoom default**
>   *(the second was missed by the 2026-08-12 search and is added under the grandfather clause,
>   2026-09-02; `scripts/check-language-closed.mjs`'s frozen allowance for this file has named both
>   since 2026-08-12)*.

**`docs/AUTH.md:14-15`** — `**Seven comments** in `server/src/auth/` and `scripts/recover-admin.mjs` cite `AUTH.md §N`` *(said "Eight"; re-counted 2026-09-02 — seven comments, plus two more occurrences inside string literals)*.

**`docs/ENVIRONMENT.md:107-109`** — append to the tooling list: `…and `LOCALAPPDATA` / `TMPDIR`, which `scripts/serve-production.mjs` reads to choose a copy target off the synced tree *(added 2026-09-02; the list said "every variable" without them)*.

**`docs/DEVSCREEN-INVENTORY.md:51`** — add one row to the Frame Timing table:
> `| Live Standings update every     | `scoreboardIntervalMs` | 500             |`
>
> and after line 53: *Added 2026-09-02: `scoreboardIntervalMs` shipped in `024b58c3`
> (SCOREBOARD-CADENCE-1, 2026-08-10) and the table had not been re-checked since, so the "every
> control appears below" claim was false. Widget clamp `[SCOREBOARD_INTERVAL_MIN_MS,
> SCOREBOARD_INTERVAL_MAX_MS]` from `frameTimingConfig.js`, plus 250/500/1000 preset buttons.*

**`docs/DEVSCREEN-INVENTORY.md:116`, `docs/SIM.md:1178`, `docs/SIM.md:1244`, `docs/SWEEP-HARNESS.md:165`** — one edit, four sites:
> `git show 0555f9d` has them (the tag `pre/dead-mechanisms-cleanup` was collapsed into the SHA table
> in `docs/TAGS.md` by `dce03e82`, 2026-07-23; corrected 2026-09-02 — the tag no longer resolves).

**`docs/DEVSCREEN-INVENTORY.md:233`** — `Key and behaviour unchanged; `raceCore.js` still reads it (was `RaceScreen`; the read moved in `0bd146f3`, 2026-07-24 — corrected 2026-09-02).`

**`docs/RACER_DATA_MODEL.md:104, 109, 112, 114`** — change the four cells to `47`, `44`, `47`, `42`, and add after line 123: *Corrected 2026-09-02: four `displaySize` values were the pre-crop numbers; `11093fff` (2026-06-03) raised horse 40→47, snake 36→44, rocket 40→47, motorbike 36→42 when the spritesheets were tight-cropped.*

**`docs/RACER_DATA_MODEL.md:121, :280`** — "**tintMode `mask`:** Buggy, Motorbike, Plane, Koi, Turtle, Manta and Dolphin use mask-tinting via `<sprite>-mask.png`."; heading → "### Mask-Tinting (Buggy, Motorbike, Plane, Koi, Turtle, Manta, Dolphin)". Add: *Corrected 2026-09-02 — `d33c28d6` (2026-06-03) added four mask-tinted water types after this was written.*

**`docs/RACER_DATA_MODEL.md:204, :205, :8`** — add `'surfaceEffectOverrides'` to the listed array; "8 fields since VRE-3" → "**9 fields** — the eighth and ninth added by VRE-3 and by `7b842086` (2026-06-08); corrected 2026-09-02"; "all 8 TUNABLE_FIELDS" → "all 9"; line 8 → "9 fields are live-tunable via the Dev-Screen edit modal (6 since D3.5.5; `surfaceClasses` / `minTargetScreenPx` from VRE-3 and `surfaceEffectOverrides` from `7b842086`, 2026-06-08)."

**`docs/RACER_DATA_MODEL.md:159-161`**
> - **Finish line:** derived by `deriveRaceDuration()` (`client/src/modules/durationModel.js`) from the
>   **mean** racer's pace: in range, the finish line lands where a mean racer is after the requested
>   seconds; beyond the track's natural maximum it is pinned and the whole field is slowed uniformly.
> - **Constraint:** maximum `finishT = 1 − runoutZone`. *(Corrected 2026-09-02: this read
>   `openTrackFinishT(...)` with a `BASE_SPEED_MAX` "theoretically fastest racer" formula and a 1.0
>   ceiling. `5f29a99a`, 2026-05-03, deleted that function; the pace is the mean racer's, and the
>   document's own line 318 already said `1 − runoutZone`.)*

**`docs/RACER_DATA_MODEL.md:140, :152`** — `lapsFromDuration` → the live path `trackDefaultLaps(track)`, with the migration-only survivor named: *(corrected 2026-09-02; `lapsFromDuration` was deleted by `9e41c2bd`, 2026-07-24, and `legacyLapsFromDefaultDuration()` is all that remains)*.

**`docs/RACER_DATA_MODEL.md:172-175`** — state no numbers; `defaults.js` is their one home:
> After the last finish-line crossing the screen holds for `endingOnRaceScreenMs()` —
> `cameraConfig.finishHoldAfterLastMs + cameraConfig.finishPauseMs` — then fades to `/results`.
> *(Corrected 2026-09-02: read "2 seconds"; `d1b395e3`, 2026-05-25, replaced the hardcoded 2000 ms
> with `finishPauseMs`, and ENDING-HOLD-1 added the hold on top.)*

**`docs/RACER_DATA_MODEL.md:131, :297-299`** — status cell → `Dead (post d5b9d57e)`; line 297 → "`SetupScreen` and `TrackManager` read the server track list via `useServerTracks()` / `useServerTracksControl()`; the cache key is `racearena:cache:serverTracks`. *(Corrected 2026-09-02: read `localStorage['racearena:tracks']`, which `d5b9d57e`, 2026-06-17, made dead — `trackLoader.test.js` pins that it is ignored.)*"

**`docs/RACER_DATA_MODEL.md:406`** — "…no longer active for all **10** default tracks…" *(count corrected 2026-09-02; the seed set is `server/seeds/tracks/`)*.

**`docs/RACER_DATA_MODEL.md:416`** — "The `rteDefinitions` placeholder (`getRteDefinitions()`) is still on `SpriteRacerType` and unused. *(Corrected 2026-09-02: this said it was removed in VRE-1; it never was — `git log -S` shows only the 2026-04-26 commit that added it.)*"

**`docs/RACER_DATA_MODEL.md:207`** — "Array of all 20 built-in type IDs, **in registry order**. *(Corrected 2026-09-02: said "sorted"; it is `Object.keys(RACER_TYPES)`.)*"

**`docs/TRACK_LIFECYCLE.md:120`** — `│      luger-hill.json         ← Default-Track (seeded)       │` *(corrected 2026-09-02; `83937c3e`, 2026-06-17, seeded it like the other nine)*.

**`docs/TRACK_LIFECYCLE.md:149`**
> - **Boot migration** — `migrateDefaultTracks()` runs on every boot: `deliverSeedsOnce()` then
>   `seedTypeFromSnapshot('tracks')` / `('backgrounds')`, copying each committed seed file into
>   `DATA_ROOT` only when the destination is missing (idempotent, partial-seed-safe). The seed files
>   carry full metadata **and** full geometry. A legacy marker `.tlh1-defaults-migrated` is still
>   written but gates nothing. *(Corrected 2026-09-02: this described a one-shot
>   `.default-tracks-seeded` marker and empty geometry arrays; PR #58 removed the gating and
>   `83937c3e`, 2026-06-17, replaced code seeds with geometry-bearing snapshot files.)*

**`docs/TRACK_LIFECYCLE.md:209-231`** — delete the JSON block and replace with a pointer, not a copy:
> Each of the 10 default tracks is seeded from its committed file in
> `server/seeds/tracks/<id>.json`, which is the one home for those values — metadata **and** drawn
> geometry, with a real `geometryId` and a `backgroundImageFile`. Read the file rather than a copy of
> it here. *(Corrected 2026-09-02: this restated a `dirt-oval` record with empty geometry,
> `geometryId: null` and stale icon / colour / surfaceClasses / trackLights; `83937c3e`, 2026-06-17,
> replaced the empty code seeds with geometry-bearing snapshot files.)*

**`docs/TRACK_LIFECYCLE.md:152, :244-249`** — `HH-MM-SS-mmm-<id>.json` in both places, example `22-40-12-798-dirt-oval.json` *(corrected 2026-09-02: the pattern omitted the millisecond field `writeTrackBackup` actually writes, which is what lets two saves in the same second both survive)*.

**`docs/TRACK_LIFECYCLE.md:294, :296`** — `- docs/BACKLOG.md — PART TWO, phase history` *(corrected 2026-09-02: pointed at `ROADMAP.md — Geplante Phasen-Reihenfolge`, a heading removed by `e180a6be`, 2026-05-25; ROADMAP became a redirect in `c49d5af5`, 2026-08-27)*; and `- docs/AUDIT.md — orphaned geometries accepted finding` *(section name `Bewusst akzeptierte Befunde` removed by `23c95428`, 2026-05-26)*. **Both edits also remove German section names, which the language rule forbids.**

**`docs/TRACK_LIFECYCLE.md:203`** — "all **10** tracks" *(count corrected 2026-09-02)*.

**`docs/TRACK_EDITOR.md:246`** — "**Status:** Shipped — VRE-1 defined the data model, VRE-3 (`020dbda2`, 2026-05-01) added the Track Manager UI. *(Corrected 2026-09-02: read "Planned".)*"; line 269 → past tense.

**`docs/TRACK_EDITOR.md:253-265`** — replace the table with a pointer rather than a copy:
> Each seeded track's `surfaceClasses` array lives in `server/seeds/tracks/<id>.json`, which is its
> one home — read it there. *(Corrected 2026-09-02: this table was a nine-row snapshot; there are ten
> seeded tracks and three of the nine rows were stale.)*

**`docs/TRACK_EDITOR.md`, before line 129** — insert, leaving the rest as the planned design:
> **⚠ NOT BUILT — this is TLH-3, deferred.** `defaultTracks.js` does not exist and
> `getInitialTracks()` returns an empty list on a cold cache with no fallback (`trackLoader.js`). The
> paragraphs below are the planned behaviour. *(Marked 2026-09-02: the section was written in the
> present tense; `docs/TRACK_LIFECYCLE.md` and `docs/ARCHITECTURE.md:999` already carried the
> deferral.)*
>
> and line 135's "the 5 default tracks" → "the 10 default tracks".

**`docs/TRACK_EDITOR.md:310`** — delete the `getCenterFrac` bullet, and add to the list: *(Corrected 2026-09-02: a fourth bullet `getCenterFrac` was removed — `git log -S` shows it only ever appeared in this document, never in code.)*

**`docs/TRACK_EDITOR.md:359-367`** — delete the `racearena:racers` and `racearena:dataVersion` rows; `racearena:tracks` description → `Dead — ignored by the loader (see TRACK_LIFECYCLE.md)`; index row → `Index of all geometry UUIDs, in registration order`. Add below: *(Corrected 2026-09-02: two keys had been removed — `d073fa02` 2026-04-29 and `d5b9d57e` 2026-06-17 — a third is ignored, and "sorted by updatedAt desc" describes `listTracks()`'s return value, not the stored index. `racearena:dataVersion` is also a schema-version marker, which this project's standing no-schema/no-migrations rule forbids reintroducing.)*

**`docs/TRACK_EDITOR.md:392`** — `- ~~Image upload via editor (file chooser), with server-side storage~~ — **SHIPPED**: `POST`/`DELETE /api/tracks/:id/background` + the TrackEditor upload path. *(Corrected 2026-09-02.)*`

**`docs/TRACK_EDITOR.md:125`** — `See docs/TRACK_LIFECYCLE.md — Orphaned Geometries.` *(Corrected 2026-09-02: the cited section name does not exist in that file.)*

**`docs/TRACK_EDITOR.md:332`** — "All sub-steps are complete **and merged to master**. *(Corrected 2026-09-02: read "Branch `feat/track-editor` is open as a PR"; no such branch exists — the repo carries only `master`.)*"

---

## 5. THINGS THAT ARE NOT FALSE CLAIMS BUT SHOULD BE SEEN

- **`docs/VERIFY-RULES.md` has two rules numbered R12a** — line 455 ("The hook asserts its OWN
  completeness") and line 495 ("The browser suite is NIGHT WORK"). Other documents cite "R12a" by
  number. A defect in the document, not in a claim about the tree, so not in the count.
- **`docs/SHIP-CEREMONY.md` lines 150-170 are CORRECT and were verified rather than assumed.** The
  brief asked whether it still claims `racer-types/` is outside every closure. It does not — the row
  was corrected 2026-09-02 by REACH-CLOSURE-COST-1 and now reads "inside the WORLD instrument's
  closure, and NO other's". Its three numbers reproduce exactly: resolving each guard's declaration
  the way `scripts/verify.mjs` does gives **world 78 files of which 36 are `racer-types/`, camera 38,
  render 58**, which is what `node scripts/verify.mjs --dry` prints. `engine-reach --check` on
  `SpriteRacerType.js` answers "is in the hull", verbatim. The generated block above it (76 / 108 /
  51) is also right; the 78/38/58 figures differ from it only because they include each guard's own
  source closure, which is how the router resolves them. **The stale copy of this fact is one file
  over, in `docs/CAMERA_DIRECTOR.md:980`, and that is in the table above.**
- **The project already carries the right sentence, somewhere else, for eleven of the 97**, which is
  where the cheapest repairs are: `docs/API.md:37` names `surface-effects/defaults.js` correctly
  while ARCHITECTURE names a file that never existed; `docs/DEVSCREEN-INVENTORY.md:168` has
  `choreoOutcomeStart` at 0.6 while FORCE-MAP and PHASE-CONTRACT say 0.5; `docs/FAIRNESS.md:6` points
  at `fingerprints.json` for the shipped world while PROJECT-PRINCIPLES types a superseded hash;
  `docs/SHIP-CEREMONY.md:155` has the racer-types closure right while `docs/CAMERA_DIRECTOR.md:980`
  does not; `docs/TRACK_LIFECYCLE.md` and `docs/ARCHITECTURE.md:999` both say the Code-Bundle is NOT
  BUILT while `docs/TRACK_EDITOR.md:127` describes it in the present tense; `docs/SIM.md:924` lists
  `computeSpeedScaleFactor` as deleted while `docs/SIM.md:48` still credits `lapUtils.js` with it;
  and `docs/TAGS.md:1709` records `pre/dead-mechanisms-cleanup` as a DELETED tag while three other
  documents tell a reader to `git show` it.
- **Five documents contradict THEMSELVES**, which is the cheapest class of all to spot and the one a
  reader trusts least once found: `docs/ENDING-PHASES.md` (`:196` refutes the figure `:254` calls
  unverified); `docs/SIM.md` (`:48` vs `:924`); `docs/RACER_DATA_MODEL.md` (`:159` says the open-track
  ceiling is 1.0, `:318` says `1 − runoutZone`); `docs/TRACK_LIFECYCLE.md` (`:127` says there is no
  migration marker, `:149` describes one gating the migration); `docs/ARCHITECTURE.md:324` (says the
  sim "never sets `frameSizePx`" and, in its own last clause, "already set").
- **Both `docs/AUTH.md` and `docs/ENVIRONMENT.md` survived a full line-by-line audit with two trivial
  misses between them.** Both are recent, both were written from the source rather than from memory,
  and both say so in their headers. That is the difference the age distribution above is measuring.

---

## 6. GUARD STATE AT THE TIME OF THIS AUDIT

Run tonight, all green, and none of them can see any finding above:

```
check-doc-links:        670 relative links across 61 living-doc files; 0 dangling.
check-doc-facts:        the band-reach threshold only. TRACK COUNT is deliberately unguarded.
check-config-claims:    171 keys, 59 living documents, 0 current claim(s), 39 dated rows allowed.
check-fingerprints:     4 roles, 1097 tracked files scanned, 0 stray copies.
check-measured-stamps:  3 stamps in 3 of 61 living documents, 0 stale.
check-language-closed:  1048 files scanned, 27 with German, 27 frozen allowances, 0 failures.
check-tags:             123 origin tags checked, 0 unregistered; 123 declared, 0 missing at origin.
gen-engine-reach-doc --check:  block is current (76 files, 14 UNKNOWN).
```

Per R11 the guard is the first suspect when it disagrees with a sentence. **In every case above the
guard did not disagree — it was silent, and each one says in its own `blind` list why.**
`check-config-claims` cannot see `defaults.js` values stated outside the camera object;
`check-fingerprints` exempts superseded values as history; `check-doc-links` resolves the file half
of a link and never a count; `check-measured-stamps` checks freshness and never accuracy;
`check-doc-facts` explains at length why the track count is unbuildable and adds that "counts of
anything else — racer types, camera states, guards, tests" are not covered either. **The 97 findings
sit almost entirely inside those declared holes**, which is the useful part: the guards are honest
about what they miss, and what they miss is where the rot is.

**Three of the declared holes account for most of the 97**, and they are worth naming as a set
rather than as nine separate blind lines:

1. **A config value stated away from its key, or in a shape the narrow rule does not match.** Six
   findings, including the `choreoOutcomeStart` 0.5 that `check-config-claims`'s own header records
   as the defect it was built for — still present, in the same document family, three weeks later.
2. **Any count of anything.** Twenty-one findings: files, sections, tracks, tags, endpoints,
   observers, coats, comments, links, lines, tunable fields, racer types, controls.
3. **Which FILE owns a thing.** Fourteen findings, almost all of them one commit's blast radius —
   `0bd146f3` moving the step loop out of `RaceScreen/index.jsx` on 2026-07-24, and `83937c3e` /
   `d5b9d57e` replacing the localStorage track path with seeded server records on 2026-06-17.

**None of the three is guardable by the method the existing guards use**, and `check-doc-facts`
already argues at length why a naive count guard is worse than none. But (3) is different from (1)
and (2): a claim of the form "symbol `X` lives in file `Y`" has two machine-readable sides, and a
grep for a backticked identifier that occurs nowhere in the tree found 14 of these in seconds with a
control on every null. That is the one shape here that a guard could plausibly catch, and it is
offered as an observation, not a proposal — a guard is a decision, not a documentation fix.
