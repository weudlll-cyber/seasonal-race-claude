# AUDIT-1 · A3 — Documents

Read-only audit of the living documents at `C:/tmp/a1` (origin/master `e164bb68`) and
`C:/tmp/a1v/docs/VPS-INSTALL.md` (branch `feat/vps-install`). Nothing under either clone was modified.
"Living documents" = `docs/*.md` (not `docs/archive/`), `README.md`, and `docs/VPS-INSTALL.md` on the
VPS branch. Helper scripts used for the mechanical passes sit beside this file (`_a3_*.mjs`); their raw
outputs are `_a3_links.json`, `_dump_API.txt`, `_dump_OTHER.txt`, `_a3_lang.txt`, `_a3_tags.txt`,
`_a3_keys.json`. The per-citation tables were produced in four parts (`_A3_api_part1..3.md`,
`_A3_sample.md`) and are reproduced in full in section 3.

## 1. Method, per task

1. **Links and anchors** — every `[text](target)` outside code spans in 38 `docs/*.md` + `README.md` +
   `VPS-INSTALL.md`; relative targets resolved against the document's directory; `#anchor` checked
   against GitHub slugs of the target's headings (lowercase, punctuation removed, spaces to `-`,
   duplicate suffixes `-1`, `-2`) plus explicit `<a name|id>`. Reference-style links and `<…>` links:
   none exist (grep).
2. **Citations** — a resolver extracted every `path:line[-line]` and bare `:N` shorthand (bound to the
   last file named in the paragraph), dumped the cited source lines, and each citation was judged by
   reading the sentence against the lines. **Every** citation in `docs/API.md` (551), `docs/DEPLOYMENT.md`
   (9) was judged; `docs/AUTH.md` and `docs/VPS-INSTALL.md` contain **no** `file:line` citations (AUTH.md
   names 12 files without lines — all 12 exist). Plus a sample of 366 citations across 21 other living documents (section 3.5).
3. **Removed features** — grep for the winners setting in all its spellings; backticked camelCase
   identifiers in living docs that occur nowhere in `client/ server/ scripts/ shared/ .github/`
   (238 hits, 125 not in an obviously historical sentence, each read); every `Config key` in
   `DEVSCREEN-INVENTORY.md` tables checked against `defaults.js` + `DevScreen/sections/`.
4. **Language** — read `scripts/check-language-closed.mjs` (scans every tracked file except `reports/`,
   `package-lock.json` and binaries; trips on an umlaut or two distinct German function words on one
   line; 27-entry frozen allowlist) and ran it: green, 0 failures. Then searched for what it is blind
   to: lone German words/compounds in tracked files, the VPS-branch-only files, and `reports/`.
5. **OPEN vs BACKLOG** — counted `- [ ]` between `# PART ONE` (line 15) and `# PART TWO` (line 1796).
6. **Tags** — `git -C C:/tmp/a1 ls-remote --tags origin` (136 tags) against every parseable register
   line in `docs/TAGS.md` (`- \`name\` (\`sha\``), plus loose list items, with SHA comparison.
7. **README** — read as a first-time operator, every operational claim checked against the tree.

## 2. Findings

| id | category | severity | file:line | evidence (quoted) | proposed verdict | proposed correction |
|---|---|---|---|---|---|---|
| A3-01 | citation | medium | docs/API.md:293-376 (Tracks section) | 35 citations into `server/src/routes/tracks.js` are off by +1 (code after line 34) or +5 (code after ~255), e.g. API.md:303 "`:457-459`" (list route now `:462-464`), :345 "`:496`"/"`:518`" (now 501/523), :364 "`:539-549`" (now 544-554). Full list in 3.1 rows marked WRONG. Cause: TRACK-BACKUP-RETENTION-1 (`c62ab7fe`) inserted an import at :34 and lines near `writeTrackBackup` (inferred from the code, not confirmed by git). | SAFE-CLEANUP | Shift each cited range by the measured offset (table 3.1 gives the new range for every one). |
| A3-02 | citation | medium | docs/API.md:383-423 (track background routes) | 7 WRONG, same +5 drift: :384 "404 `Track not found` (`server/src/routes/tracks.js:582`)" — 582 is `});`, the 404 is at :587; :390 `:595`→600; :392 `:633`→638; :395 `:597`→602; :396 `:598-599`→603-604; :397 `:603-608`→609-613; :423 `:645-651`→650-656. Three more (:383, :391, :406) still contain the claim but drifted the same way. | SAFE-CLEANUP | Same shift; update :383 to 585-597, :391 to 621-625, :406 to 644-657. |
| A3-03 | citation | low | docs/API.md:893, 917, 919, 939, 941, 963, 974 | Off-by-one in `server/src/routes/races.js`: :893 "`:131`" (blank; `storeRace({ ...body, team })` is :132); :917 `:151-154` misses the 500 at :155; :919 `:120` is `try {` (call at :121); :939 `:79` is `*/` (`EVALUATION_MAX_DAYS = 366` at :80); :941 `:202-206` ends before `res.json` at :207; :963 `:217` (400 at :218); :974 `:233` is `}` (`return res.json(race)` at :234). | SAFE-CLEANUP | Use :132, :152-155, :121, :80, :203-207, :217-218, :234. |
| A3-04 | citation | medium | docs/API.md:952, 961, 962 | `server/src/races/pointsRule.js:67-77` and `:77-81` run past the end of a 73-line file; `:27` is blank (`DEFAULT_POINTS_RULE` is :26); `:55` is `}` (rebuilt object at :54); `races.js:211` is a comment (route at :212). The fallback/return actually live in `server/utils/jsonSettingStore.js:32-40` and `:42-46`. | SAFE-CLEANUP | Re-point to pointsRule.js:26, :54, :64-72 and jsonSettingStore.js:32-40 / :42-46; races.js:212. |
| A3-05 | citation | low | docs/API.md:1011 | "Mounted at `server/src/app.js:79`" — 79 is a SERVE-SPA-1 comment; `app.use('/api/settings', settingsRouter)` is :77. | SAFE-CLEANUP | `app.js:77`. |
| A3-06 | citation (claim) | low | docs/API.md:919 | Claim that `getRaceByClientId(undefined)` binds NULL; `raceStore.js:523` binds `String(clientRaceId ?? '')`, the empty string. Outcome (no row, then 400) unchanged. | SAFE-CLEANUP | Say "binds an empty string, which matches no row". |
| A3-07 | citation (claim) | low | docs/API.md:1021 | "said once in the log" — `console.warn` at `server/utils/jsonSettingStore.js:39` runs on every `get()` against an invalid file. Same wording in that file's header and `pointsRule.js:58`. | SAFE-CLEANUP | "logged on every read while the file is invalid" (doc only; code comment is A1/A2's call). |
| A3-08 | citation (claim) | low | docs/API.md:295 | Says create, update or upload writes a track backup; `DELETE /api/tracks/:id/background` writes one too (`tracks.js:594`). | SAFE-CLEANUP | Add the background delete. |
| A3-09 | citation (claim) | info | docs/API.md:575 | "ignoring case and spaces" — `playerNameKey` (`shared/playerNames.mjs:29-32`) lower-cases, trims and collapses runs of spaces; "Ada Lovelace" and "AdaLovelace" differ. | SAFE-CLEANUP | "ignoring case, surrounding spaces and repeated spaces". |
| A3-10 | citation | medium | docs/DEPLOYMENT.md:98-102 | "the list routes answer every caller with the whole collection (`server/src/routes/tracks.js:457`, … `server/src/routes/playerGroups.js:100`, …) … a user sees only the races stored by their own team (`server/src/routes/races.js:121-131`)". tracks.js:457 is blank (list route `router.get('/'` at :462); playerGroups.js:100 is blank (route at :106); races.js:121-131 is the POST duplicate check (`getRaceByClientId`), not the team-scoped list, which is `races.js:164-181` (`listRacesPage(team, …)`). brands.js:160, racers.js:125, guards.js:22-26, usersRouter.js:21-24 CORRECT. | SAFE-CLEANUP | tracks.js:462, playerGroups.js:106, races.js:164-181. |
| A3-11 | citation | low | docs/DEPLOYMENT.md:519-520 | "`server/utils/` and `shared/nameLimits.mjs` are COPYed in (`server/Dockerfile:32` and `:42`)" — :32 is `RUN npm ci` (client stage), :42 is blank. The COPYs are `server/Dockerfile:70` (`COPY server/utils/ ./utils/`) and `:87` (`COPY shared/nameLimits.mjs /shared/nameLimits.mjs`). | SAFE-CLEANUP | `server/Dockerfile:70` and `:87`. |
| A3-12 | removed-feature | medium | docs/DEVSCREEN-INVENTORY.md:93, 99, 105-108 | ":99 `\| Default Number of Winners (Podium Spots) \| \`winners\` \| 3 \| yes \| **MATCHES** \|`"; :93 "**7 controls**"; :107 "`winners` reaches the payload and the result screen slices the finish order by it." The key is gone: `defaults.js:27` "`winners` removed 2026-10-06 (REMOVE-WINNERS-SETTING-1)"; `RaceDefaults.jsx` renders no winners control (BACKLOG.md:3913-3920 records the removal). | SAFE-CLEANUP | Strike the row with a dated note, 7 → 6 controls, "four that have one" → three, drop the `winners` sentence. |
| A3-13 | removed-feature | low | docs/RACER_DATA_MODEL.md:131 | "`racearena:tracks` … Fields: `id, name, …, defaultDuration, defaultWinners, color, …` … Active" — `defaultWinners` is stored and no longer read (BACKLOG.md:3920 "a track's stored `defaultWinners` [is] left in place, unread"). | SAFE-CLEANUP | Annotate `defaultWinners` "(stored, unread since 2026-10-06)". |
| A3-14 | removed-feature | info | docs/API.md:351 | "`defaultWinners: 3`" in the track-create defaults — accurate: `server/src/routes/tracks.js:515` still writes it. Nothing reads it since 2026-10-06. | LEAVE (doc is true) / NEEDS-OWNER | Whether the server should keep writing a dead field is a code decision, not a doc fix; optionally add "(unread since 2026-10-06)". |
| A3-15 | language | low | client/src/modules/rowLayout.test.js:111 | `it('Weltall-Strecke: geometric width 300 world-px, spriteSize 26 → all 20 fit in 1 row', …` — "Strecke" (German "track") in a test name. Not on the allowlist; the guard is blind to a single German word. | SAFE-CLEANUP | "Space track: …". |
| A3-16 | language | low | client/src/modules/camera/CameraDirector.test.js:2460, 2488, 2839, 3016, 4060; client/src/screens/RaceScreen/CameraDiagnosticsHUD.test.jsx:170; docs/LESSONS.md:1447 | ":2460 `// ── Etappe 6: Observer Phase (Lead-In / Mitlaufen / Lead-Out)`"; ":2488 `describe('CameraDirector — Etappe 9: observer phase (time-based)'`"; HUD test ":170 `(Etappe 27)`"; LESSONS ":1447 `over several Etappen`". "Etappe" (stage) and "Mitlaufen" (follow along) are German; lone words, so the guard cannot see them. | SAFE-CLEANUP | "Stage N", "Follow". (Test names only; no behaviour.) |
| A3-17 | language | info | scripts/sim/observers/report.mjs:330 | `` lines.push(`- **finishT:** ${finishT.toFixed(4)} (Ziellinie in t-Raum)`); `` — German in an allowlisted file that the count (6) does not include; the guard counts lines it detects, and this one has no umlaut and one function word. | LEAVE | The file is a declared PRE-EXISTING block (allowlist); fix when that block is done. |
| A3-18 | language | info | client/src/modules/rowLayout.test.js:27, 32, 238, 239, 353, 365, 373; client/src/screens/DevScreen/sections/TrackManager.test.jsx:127; docs/LESSONS.md:559, 561 | "Weltall" (German "outer space") used as a track name in tests and a dated lesson. | LEAVE | A former track's proper name in fixtures/history; renaming is optional cleanup. |
| A3-19 | language | info | allowlisted: BrandingProfiles.jsx:187, PlayerGroupsManager.jsx:137, TrackManager.jsx:156 | `'Ein Default-Brand kann nicht gelöscht werden. Entferne zuerst den Default-Status.'` (and the group/track variants) — German USER-FACING alerts still shipped. Allowed by the frozen allowlist as PRE-EXISTING; reported because they are the only German an operator sees. | NEEDS-OWNER | Translate the three alerts and their 21 test assertions in one block (the allowlist itself says "the first that should go"). |
| A3-20 | language | info | scripts/check-language-closed.mjs:91-92 | `GUARD.dirs: ["client/", "server/", "scripts/", "docs/", ".claude/"], files: ["CLAUDE.md"]` — but the scan (`inScope`, :200-204) covers every tracked file except `reports/`, `package-lock.json` and binaries (so also `shared/`, `.github/`, `README.md`, root files). The declaration understates the coverage. | SAFE-CLEANUP | Declare the real scope (all tracked files minus the three exclusions). |
| A3-21 | language | info | reports/ (163 files) | 1383 lines with German signals (umlaut or German function words) — out of scope by the guard's declared blind spot and the append-only journal rule. | LEAVE | Declared out of scope; append-only by rule. |
| A3-22 | language | info | CLAUDE.md (closing inventory) vs docs/fingerprints.json | CLAUDE.md: "`docs/fingerprints.json` — the FINISH-PAIR-1 mint carries two quotations". `docs/fingerprints.json` contains no "FINISH-PAIR" and no "pair" at all, and the allowlist has no entry for it. The inventory line names quotations that are no longer in that file. | NEEDS-OWNER | CLAUDE.md forbids "fixing" inventory entries; the owner decides whether to annotate it. |
| A3-23 | open-vs-backlog | info | docs/OPEN.md:56-58 vs docs/BACKLOG.md:15-1795 | OPEN.md: "`docs/BACKLOG.md` PART ONE (lines 15–1795) holds exactly ONE unchecked `- [ ]` row — in *Delivering to someone else*." Counted: PART ONE = lines 15-1795 (`# PART TWO` at 1796); exactly one `- [ ]` at BACKLOG.md:756 ("GOING ONLINE — one row"). §0 lists that one row (OPEN.md:90). | LEAVE | Count, range and list all agree. |
| A3-24 | open-vs-backlog | low | docs/OPEN.md:1 | "# What is open — DERIVED from BACKLOG PART ONE, 2026-10-02" while :6 says "Re-derived on **2026-10-08**". | SAFE-CLEANUP | Title date 2026-10-08. |
| A3-25 | open-vs-backlog | medium | docs/OPEN.md:206, 235-252, 276, 278, 340, 341 | The page says "Every current count on this page says one" (:58) and "Nothing is added here that the backlog does not carry" (:71), yet §2-§5 still present un-struck open items: ":206 `\| Pause and resume a running race \| a block \| — \|`"; §3 rows 1-3 (:235-252, two marked "**NO BACKLOG ROW BACKS THIS**"); :276 flaky editor test "NARROWED, not closed"; :278 "4 SOLO breakaways and 9 PAIRS"; :340 "**HTTPS is not arranged**"; :341 "`deploy.yml.disabled` cannot be revived by renaming". Sections are labelled "NOT RE-VERIFIED ON 2026-09-25". | NEEDS-OWNER | Owner decides which of these are still open (then they need a PART ONE row) or are closed (strike them). |
| A3-26 | open-vs-backlog | low | docs/OPEN.md:340 vs :339 | :340 "Over plain HTTP, `Secure` cookies are never returned, so sign-in does not merely become insecure — it stops working." vs :339 "sign-in does NOT stop working over plain HTTP — `RA_COOKIE_SECURE=false` is honoured explicitly". | SAFE-CLEANUP | Strike :340 into :339's corrected statement (it is the stale harvest wording). |
| A3-27 | citation | low | docs/OPEN.md:238 | "→ [BACKLOG.md](BACKLOG.md) Phase V, `docs/BACKLOG.md:1743`" — :1743 is "Re-apply --jobs parallelism cleanly". Phase V is `docs/BACKLOG.md:5546` (PART TWO heading) and its verdict line :1480. | SAFE-CLEANUP | `docs/BACKLOG.md:1480` (verdict) / `:5546`. |
| A3-28 | tags | medium | docs/TAGS.md:1284 | "`v-ship-the-night` (`a4cb669a`, 2026-08-10)" — origin: tag object `e29c5188` → commit `1d575759` ("ship(mint): CAMERA and RENDER minted, WORLD re-verified, tag registered"). `a4cb669a` is the night merge. `check-tags` checks names, not SHAs (`scripts/check-tags.mjs:41`). | SAFE-CLEANUP | Register `1d575759` (the commit the tag points at); keep `a4cb669a` in the prose as the merge if wanted. |
| A3-29 | tags | medium | docs/TAGS.md:1566 | "`pre/no-schema` (`41d2ed38`, 2026-08-03)" — origin: lightweight tag at `7b195070` ("docs(camera): CAMERA-LATERAL-1 report — the two axes"); `41d2ed38` is the CAMERA-LATERAL-1 feat commit before it. | SAFE-CLEANUP | Register `7b195070`. |
| A3-30 | tags | low | docs/TAGS.md:1954, 2009, 2024 | "`- **\`archive/gap-leader-brake-2026-09-17\`** — the archive of …`" (same bold, SHA-less shape for `archive/group-gap-brake-1` and `archive/hero-strictness-1`). TAGS.md:12-13: "An entry written any other way is **silently unchecked**". All three exist at origin (`862bb15a`, `c2e8c54f`, `daab471f`). | SAFE-CLEANUP | Rewrite as `- \`archive/…\` (\`862bb15a\`, 2026-09-17) — …` etc. |
| A3-31 | tags | low | docs/TAGS.md:1921-1922, 2036 | ":1922 the current origin set is **41 tags**"; ":2036 ### Additions since 2026-07-25 (current origin total: 45 tags)". Origin has 136. | SAFE-CLEANUP | Say "at that date" instead of "current", or drop the count. |
| A3-32 | tags | low | docs/TAGS.md:2081-2273 | Heading "### Retired tags (177)" over 191 list items. Its last 15 (`pre/weights` … `pre/zoom-unit`, `pre/v4-on-trunk`) were recorded on 2026-07-14 (`e1d5a2bf`, Step 6d); 14 of those NAMES were later re-created as live camera-refactor tags (registered live at :1470-1645, present at origin). The same name now means a retired tag and a live one. | SAFE-CLEANUP | Fix the count; add one line under the heading that 14 names were reused for live tags registered above. |
| A3-33 | readme | medium | README.md:118 | "The base image is pinned to a floating tag, not a digest, so a rebuild can change it." — WRONG: `server/Dockerfile:27` and `:39` are `FROM node:20-alpine@sha256:fb4cd12c…` (TIDY-C-1, 2026-10-02). | SAFE-CLEANUP | "The base image is pinned by digest; a bump is manual (server/Dockerfile header)." |
| A3-34 | readme | medium | README.md:36 | "`cd client && npm install && npm run build && cd ..   # build the app`" — unnecessary: the image builds its own client (`server/Dockerfile:27-35`, stage `client-build`; `docker-compose.yml:10-15`; DEPLOYMENT.md:514 "No client build is needed first"). It also makes Node a requirement for the Docker path for no reason. | SAFE-CLEANUP | Drop the line (keep Node only for `npm run configure`, which is a plain `node scripts/configure.mjs`). |
| A3-35 | readme | medium | README.md:37-53 | The order starts the stack (`docker compose up -d`) before any secret exists, then generates them and restarts; the final step "read the token out of that file and use it once to create your admin account" never says HOW — the app shows a one-time setup page that asks for the bootstrap token (`client/src/screens/Auth/SetupAdminScreen.jsx:62-95`), or `curl` per SETUP.md:90. | SAFE-CLEANUP | Order: clone → `npm run configure -- --origin=…` → `docker compose up -d` → open :4000, the setup page asks for the token found in `docker-compose.override.yml`. |
| A3-36 | readme | low | README.md:172 | "[API.md] — the backend's HTTP surface — **and it states plainly which endpoints it does not cover**" — API.md:5 now says "Complete as of 2026-10-06: all 65 routes"; the 65 was re-counted and is correct. | SAFE-CLEANUP | "every route the server registers (65)". |
| A3-37 | readme | low | README.md:105-122, 126-135 | New-operator gaps: never says where the data root is by default (the shipped compose bind-mounts `./server/data`, `docker-compose.yml:59`), that the shipped compose bind-mounts live source (`./server/src`, `./server/utils`, `./server/seeds`) so it is a development shape tied to the checkout, or how to stop/update it. These are covered in DEPLOYMENT.md/SETUP.md but the README gives no pointer for "where is my data". | SAFE-CLEANUP | One line: "Data lives in `./server/data` with the shipped compose; see DEPLOYMENT.md for a production layout." |
| A3-38 | readme | info | README.md:74-75 | "270 files, 4778 tests" / "37 files, 856 tests" — undated counts; not re-measured in this read-only pass. | LEAVE | Date them or drop them (they drift with every change). |
| A3-39 | link | low | C:/tmp/a1v README.md, docs/README.md | On `feat/vps-install`, `docs/VPS-INSTALL.md` is linked only from DEPLOYMENT.md:5, OPEN.md and BACKLOG.md; neither the README nor the docs map (`docs/README.md`) names it, although DEPLOYMENT.md calls it "the recommended path" on a VPS. | SAFE-CLEANUP | Add it to the README "How it is deployed" and to the docs map when the branch merges. |
| A3-40 | removed-feature (doc rule) | low | docs/FORCE-MAP.md:256-257, 322, 328-329, 465 | Header :27-32: "It does **not** state their VALUES … `node scripts/check-config-claims.mjs` fails if one reappears here." Yet live entries state values: ":256 `hardSeparationRelaxation` **0.15**, `hardSeparationTolerancePct` **0.1**, `avoidanceWarmupMs` **3000**", ":322 `comfortThreshold` **0.7**, `softRepulsionStrength` **0.1**", ":329 `maxLateral` **0.95**", ":465 attacker boost 0.06 / leader brake 0.10, ±0.12 envelope, ceiling 1.2". The ones checked match `defaults.js` today (1409, 1410, 1420, 1427, 1525, 1526); the A13 boost/brake/envelope (0.06/0.10/0.12) also match (`defaults.js:1077, 1083-1084`); "ceiling 1.2" was not checked. Not a wrong value today — a rule the document breaks, so values can rot unseen. | SAFE-CLEANUP | Replace the numbers with "value in defaults.js", per the document's own rule. |
| A3-41 | open-vs-backlog | info | C:/tmp/a1v docs/OPEN.md:56-59 vs docs/BACKLOG.md:15-1851 | On `feat/vps-install`: "PART ONE (lines 15–1851) holds exactly SIX unchecked `- [ ]` rows" — counted six (BACKLOG.md:756, 831, 837, 875, 881, 886), so the branch agrees with itself. But it was re-derived after merging master `dcd837ef`; master has since closed rows (master OPEN.md: one row), so the branch's OPEN.md/BACKLOG.md will need re-deriving when master is merged in again. | LEAVE | Re-derive at the next master merge into the branch. |
| A3-42 | citation | medium | docs/PHASE-CONTRACT.md (all 40 citations) | Every `racePlanner.js`/`raceGovernor.js` line is from the 2026-07-14 inventory; racePlanner.js has grown ~300 lines, e.g. `getPhase` cited :357-370 is now :695-708, `getPhaseFractions` :699-701 now :1857; the self-reference `:95` is now `:105` (section 3.5). | SAFE-CLEANUP | Re-address every citation (table 3.5 gives the current lines), or replace line numbers by function names. |
| A3-43 | citation | medium | docs/CONCEPT-COHESION.md (16 of 16) | July design-era addresses, all wrong; two describe mechanisms that no longer exist: the sim's `Math.random = makePRNG(seed)` and a governor `mulberry32` stream at `raceGovernor.js:82`. | SAFE-CLEANUP for addresses; NEEDS-OWNER for the two vanished mechanisms (rewrite vs mark historical) | See 3.5. |
| A3-44 | citation | medium | docs/FORCE-MAP.md (16 wrong in live sections) | Beyond the 27 `index.jsx` addresses the header already disowns: e.g. `inBrakeMatchZone` :521 → :893 in raceBehavior.js, `raceStep.js:83` → :131, A6/A7/A8/A13 table rows, `defaults.js:442` → :1479. | SAFE-CLEANUP | Re-address per 3.5. |
| A3-45 | citation | medium | docs/BACKLOG.md:247-252, 2280-2290, 2905 and others (23 wrong in present-tense text) | The action-dial table at :247-252 says "the line numbers are the address" while every `defaults.js` range is off by ~185; races.js/raceStore.js addresses at :2280-2289, :2905 wrong (POST now :101, list GET :164, short key :228); `guards.js:123-127` → :149-153; `renderRaceFrame.js:500` is not the build pill (:538-542); ~:2290 "no evaluation code on the server" is false since PERIOD-EVALUATION-1 (`races.js:188-208`). | SAFE-CLEANUP | Per 3.5. |
| A3-46 | citation (claim) | medium | docs/SHIP-CEREMONY.md:91 | "`scripts/sim-fairness.mjs:1120` carries its own `Math.min(285, …)` copy of `raceParams.js`'s `W_REF_MAX`, so the world fingerprint is blind to the file that decides every start position." — false now: `sim-fairness.mjs:91` imports `W_REF_MAX` and :1133 uses it; :86 is the comment recording the old copy. | SAFE-CLEANUP | Mark the example historical (or pick a current one). |
| A3-47 | citation (claim) | medium | docs/DEPLOY-NOTES.md:80-84, 159, 241 | :80 "`client/src/services/api.js:16-18` is the whole of it" and quotes a `VITE_API_URL ??` block — the D30 runtime resolution is built (`api.js:99`); :159 "`server/src/index.js:16` is `app.listen(PORT, …)`" — now `listenOn(...)` at :59; :241 quotes DEPLOYMENT.md "if sitting behind nginx/Caddy", a phrase no longer there. | SAFE-CLEANUP | Update to the current code / drop the quote. |
| A3-48 | citation (claim) | low | docs/DEVSCREEN-INVENTORY.md:1183, 1191 | Names `DynamicsTuningSection.resetAll()` and `resetAutoScaleToDefault()`; neither exists. The master reset is `resetRaceRelevantToDefault` (`raceRelevantReset.js:40-49`). | SAFE-CLEANUP | Rename. |
| A3-49 | citation | low | docs/MORNING.md:426, 427 | Cite `LUGER-BIAS-1.md:34` and `PINNED-GATE-1.md:230`; neither file exists anywhere in the tree (only named in `reports/night/INDEX.md:301-302` and `D25-SIGN-1.md`, so that INDEX points at missing files too). MORNING.md is a dated sheet (2026-09-19). | LEAVE (dated sheet) / NEEDS-OWNER | Owner decides whether the reports were lost or never committed. |
| A3-50 | citation | low | docs/OPEN.md:165, 250, 337, 339; docs/SETUP.md:100; ARCHITECTURE.md:173, 319, 1231; branding.md:50, 69; DEPLOY-NOTES.md:172, 299; ENDING-PHASES.md:410; SHIP-CEREMONY.md:771-772; VERIFY-RULES.md:863 | Single drifted addresses, each with its current location in 3.5; e.g. SETUP.md:100 `docker-compose.yml:27` → :35-38 (shifted by today's log-rotation block); ARCHITECTURE.md:173 `EffectConfig.jsx:11,34,124` → :19, 42, 160; OPEN.md:339 says DEPLOY-NOTES "lists FOUR more things" — the list has three. | SAFE-CLEANUP | Per 3.5. |

## 3. Citation lists

### 3.1 docs/API.md lines 1-379 — every citation


Audited against the clone at C:/tmp/a1. Bare `:N` resolved by reading the doc sentence; the helper's
resolution was right throughout this range (all bare citations in the tracks section really do mean
`server/src/routes/tracks.js`, and in the access section `app.js` / `guards.js` / `csrf.js` / `imageUpload.js`).

#### (a) Citations

| doc line | cited | verdict | note |
|---|---|---|---|
| 26 | server/src/app.js:35-81 | CORRECT | middleware block helmet..mountApiNotFound |
| 26 | app.js:38 | CORRECT | cors |
| 27 | app.js:39 | CORRECT | express.json 1mb |
| 27 | app.js:40 | CORRECT | session |
| 27 | app.js:41 | CORRECT | csrfOriginGuard |
| 28 | app.js:49-50 | CORRECT | client assets + SPA fallback |
| 28 | app.js:52 | CORRECT | requireAuth |
| 29 | app.js:53 | CORRECT | requireAdmin |
| 29 | app.js:59 | CORRECT | GET /api/health |
| 29 | app.js:63-67 | CORRECT | three limiters |
| 29 | app.js:68-77 | CORRECT | routers |
| 30 | app.js:81 | CORRECT | mountApiNotFound |
| 33 | server/src/auth/guards.js:13-18 | CORRECT | PUBLIC_PATHS |
| 33 | guards.js:137-143 | CORRECT | exact method+path match |
| 33 | guards.js:96-98 | CORRECT | normalizePath strips trailing slash |
| 37 | guards.js:145-147 | CORRECT | 401 no session user |
| 38 | guards.js:149-153 | CORRECT | user deleted -> 401 |
| 39 | guards.js:158-160 | CORRECT | sessionEpoch mismatch -> 401 |
| 40 | guards.js:186-192 | CORRECT | req.authUser shape |
| 41 | guards.js:179-184 | CORRECT | no-team warning, still authenticates |
| 42 | server/src/auth/usersStore.js:223 | CORRECT | operator/admin |
| 46 | guards.js:197-205 | CORRECT | requireAdmin 403 forbidden |
| 46 | guards.js:102-105 | CORRECT | HEAD -> GET |
| 50 | guards.js:24-29 | CORRECT | users entry |
| 51 | guards.js:31-36 | CORRECT | surface-classes mutations |
| 52 | guards.js:39-45 | CORRECT | player-groups promote/export |
| 53 | guards.js:48-53 | CORRECT | brands promote/export |
| 54 | guards.js:56-61 | CORRECT | tracks promote/export |
| 55 | guards.js:66-71 | CORRECT | race verify |
| 56 | guards.js:74-79 | CORRECT | points-rule PUT |
| 62 | server/src/auth/csrf.js:78-81 | CORRECT | /api scope + mutating methods |
| 63 | csrf.js:84-94 | CORRECT | Origin, else Referer origin |
| 65 | csrf.js:117-122 | CORRECT | self origin + allowed set |
| 65 | csrf.js:107 | CORRECT | 403 cross-origin request rejected |
| 65 | csrf.js:112 | CORRECT | same |
| 66 | csrf.js:121 | CORRECT | same |
| 67 | csrf.js:99-101 | CORRECT | strict -> 403 origin required |
| 67 | csrf.js:62-67 | CORRECT | resolveCsrfStrict defaults to isProduction |
| 74 | server/src/auth/rateLimit.js:12 | CORRECT | isTest (NODE_ENV=test or VITEST) |
| 78 | app.js:63 | CORRECT | login limiter mount |
| 78 | rateLimit.js:18-26 | CORRECT | 15 min / 10 / failures only |
| 79 | app.js:64 | CORRECT | setup limiter mount |
| 79 | rateLimit.js:34-42 | CORRECT | 60 min / 10 / every request |
| 80 | app.js:67 | CORRECT | change-password limiter mount |
| 80 | rateLimit.js:74-83 | CORRECT | limit 5, key authUser.id else IP |
| 82 | app.js:63-67 | CORRECT | mounted after requireAuth (:52) |
| 88 | server/src/staticClient.js:169-173 | CORRECT | API 404 message |
| 90 | app.js:39 | CORRECT | 1mb limit |
| 99 | server/utils/imageUpload.js:105-122 | CORRECT | uploadSingleImage |
| 100 | imageUpload.js:21 | CORRECT | MAX_IMAGE_BYTES 10 MB |
| 100 | imageUpload.js:64-76 | CORRECT | createUpload memoryStorage |
| 101 | imageUpload.js:19 | CORRECT | ALLOWED_IMAGE_TYPES |
| 101 | imageUpload.js:68-74 | CORRECT | fileFilter |
| 101 | imageUpload.js:109-112 | CORRECT | 413 |
| 102 | imageUpload.js:114-117 | CORRECT | 400 File type not allowed |
| 103 | imageUpload.js:119 | CORRECT | 400 File upload failed. |
| 105 | imageUpload.js:27-56 | CORRECT | detectMagicType |
| 112 | app.js:55-61 | CORRECT | health inline |
| 116 | guards.js:14 | CORRECT | public health |
| 119 | app.js:59-61 | CORRECT | {status, timestamp, build} |
| 119 | server/src/buildIdentity.js:45 | CORRECT | @returns shape |
| 120 | buildIdentity.js:52-54 | CORRECT | unknown + reason |
| 120 | buildIdentity.js:66-67 | CORRECT | partial reasons |
| 128 | server/src/auth/authRouter.js:6 | CORRECT | description line |
| 132 | guards.js:15 | CORRECT | setup-needed public |
| 135 | authRouter.js:44-47 | CORRECT | marker absent && countUsers()===0 |
| 140 | guards.js:16 | CORRECT | setup public |
| 141 | app.js:64 | CORRECT | |
| 141 | rateLimit.js:34-42 | CORRECT | |
| 143 | authRouter.js:57 | CORRECT | x-bootstrap-token header |
| 143 | authRouter.js:63 | CORRECT | constantTimeEqual |
| 144 | authRouter.js:28-32 | CORRECT | helper |
| 145 | authRouter.js:79-82 | CORRECT | non-blank -> 400 |
| 146 | authRouter.js:124-131 | CORRECT | role admin, FOUNDING_TEAM |
| 148 | authRouter.js:144-158 | CORRECT | regenerate, 201 |
| 149 | authRouter.js:159-171 | CORRECT | auto-login failure, not rolled back |
| 151 | authRouter.js:52-54 | CORRECT | 409 marker exists |
| 152 | authRouter.js:89 | CORRECT | EEXIST -> 409 |
| 152 | authRouter.js:98-108 | CORRECT | users exist without marker |
| 153 | authRouter.js:59-62 | CORRECT | 403 setup not available |
| 154 | authRouter.js:63-76 | CORRECT | wrong token, same answer |
| 155 | authRouter.js:79-82 | CORRECT | 400 invalid username or password |
| 156 | authRouter.js:190-192 | CORRECT | INVALID_USERNAME/PASSWORD/ROLE -> 400 |
| 157 | authRouter.js:90-91 | CORRECT | 500 setup failed |
| 158 | authRouter.js:193 | CORRECT | 500 setup failed |
| 159 | rateLimit.js:41-42 | CORRECT | 429 handler |
| 163 | guards.js:17 | CORRECT | login public |
| 164 | app.js:63 | CORRECT | |
| 164 | rateLimit.js:18-26 | CORRECT | |
| 167 | usersStore.js:23-25 | CORRECT | normalizeUsername NFC/trim/lower |
| 167 | authRouter.js:204-205 | CORRECT | lookup by username |
| 169 | authRouter.js:218-224 | CORRECT | regenerate, 200 {username, role, team} |
| 171 | authRouter.js:207-210 | CORRECT | unknown user, DUMMY_HASH, 401 |
| 172 | authRouter.js:212-215 | CORRECT | wrong password 401 |
| 173 | authRouter.js:219 | CORRECT | 500 login failed |
| 173 | authRouter.js:223 | CORRECT | 500 login failed |
| 174 | rateLimit.js:25-26 | CORRECT | 429 handler |
| 178 | guards.js:145 | CORRECT | |
| 179 | authRouter.js:232-234 | CORRECT | inline 401 |
| 182 | authRouter.js:235-245 | CORRECT | destroy + cookie clear, {ok:true} |
| 183 | guards.js:146 | CORRECT | |
| 183 | guards.js:152 | CORRECT | |
| 183 | guards.js:159 | CORRECT | |
| 184 | authRouter.js:236-239 | CORRECT | 500 logout failed |
| 189 | authRouter.js:249-269 | CORRECT | target = req.authUser.id (269) |
| 190 | app.js:67 | CORRECT | |
| 191 | rateLimit.js:74-83 | CORRECT | |
| 192 | authRouter.js:265 | CORRECT | {currentPassword, newPassword} |
| 193 | usersStore.js:270-281 | CORRECT | EMPTY_UPDATE at 278-281 |
| 194 | usersStore.js:30-34 | CORRECT | hashPassword INVALID_PASSWORD on blank |
| 196 | authRouter.js:286-301 | CORRECT | updateUser + restampSession (299) |
| 198 | guards.js:146 | CORRECT | |
| 198 | guards.js:152 | CORRECT | |
| 198 | guards.js:159 | CORRECT | |
| 199 | authRouter.js:270 | CORRECT | defensive 401 |
| 199 | authRouter.js:272-275 | CORRECT | defensive 401 |
| 200 | authRouter.js:278-284 | CORRECT | 401 invalid credentials |
| 203 | authRouter.js:291-293 | CORRECT | 400 Password must not be empty |
| 204 | authRouter.js:294-295 | CORRECT | 500 internal error |
| 205 | rateLimit.js:82-83 | CORRECT | 429 handler |
| 209 | guards.js:145 | CORRECT | |
| 210 | authRouter.js:307-315 | CORRECT | inline checks |
| 212 | authRouter.js:316-318 | CORRECT | team ?? null |
| 213 | guards.js:146 | CORRECT | |
| 213 | guards.js:152 | CORRECT | |
| 213 | guards.js:159 | CORRECT | |
| 214 | authRouter.js:308 | CORRECT | |
| 214 | authRouter.js:313 | CORRECT | |
| 221 | server/src/auth/usersRouter.js:6-8 | CORRECT | no inline auth |
| 224 | usersStore.js:49-52 | CORRECT | toSafeUser strips passwordHash, sessionEpoch |
| 225 | usersStore.js:242-262 | CORRECT | record built 242-259 |
| 229 | guards.js:24-29 | CORRECT | |
| 231 | usersRouter.js:21-24 | CORRECT | |
| 232 | guards.js:146 | CORRECT | |
| 232 | guards.js:152 | CORRECT | |
| 232 | guards.js:159 | CORRECT | |
| 233 | guards.js:200-201 | CORRECT | 403 forbidden |
| 234 | usersStore.js:56-73 | CORRECT | USERS_STORE_CORRUPT at 66, 71 |
| 239 | guards.js:24-29 | CORRECT | |
| 240 | usersRouter.js:31 | CORRECT | body destructure |
| 241 | usersStore.js:213-217 | CORRECT | INVALID_USERNAME |
| 241 | usersStore.js:229-236 | CORRECT | USERNAME_TAKEN |
| 242 | usersStore.js:218-222 | CORRECT | INVALID_PASSWORD |
| 243 | usersStore.js:223-227 | CORRECT | INVALID_ROLE |
| 244 | server/src/auth/teams.js:98-100 | CORRECT | isWellFormedTeam |
| 245 | usersStore.js:138-142 | CORRECT | INVALID_TEAM |
| 247 | usersStore.js:144-161 | CORRECT | adopt spelling / UNKNOWN_TEAM unless allowNewTeam |
| 247 | usersRouter.js:38 | CORRECT | allowNewTeam === true |
| 248 | usersRouter.js:41 | CORRECT | 201 |
| 250 | usersRouter.js:43-45 | CORRECT | 409 username already taken |
| 251 | usersRouter.js:48-50 | CORRECT | 400 knownTeams |
| 253 | usersRouter.js:51-55 | CORRECT | 400 for the four codes |
| 254 | usersRouter.js:56-57 | CORRECT | 500 internal error |
| 259 | guards.js:24-29 | CORRECT | |
| 261 | usersRouter.js:76 | CORRECT | body destructure |
| 262 | usersStore.js:272-282 | CORRECT | empty-string password = absent; EMPTY_UPDATE |
| 263 | usersStore.js:294-320 | CORRECT | role + team rules |
| 265 | usersStore.js:321-325 | CORRECT | epoch bump |
| 266 | usersRouter.js:77 | CORRECT | changedOwnPassword |
| 266 | usersRouter.js:86-88 | CORRECT | restampSession |
| 267 | usersRouter.js:90 | CORRECT | 200 |
| 269 | usersRouter.js:92 | CORRECT | 404 user not found |
| 270 | usersRouter.js:93 | CORRECT | 409 LAST_ADMIN |
| 270 | usersStore.js:300-309 | CORRECT | demote last admin |
| 271 | usersRouter.js:94-96 | CORRECT | 400 knownTeams |
| 272 | usersRouter.js:97-99 | CORRECT | four codes |
| 273 | usersRouter.js:100-101 | CORRECT | 500 |
| 278 | guards.js:24-29 | CORRECT | |
| 280 | usersRouter.js:106-109 | CORRECT | 200 with deleted user |
| 283 | usersRouter.js:111 | CORRECT | 404 |
| 284 | usersRouter.js:112 | CORRECT | 409 LAST_ADMIN |
| 284 | usersStore.js:345-353 | CORRECT | delete last admin |
| 285 | usersRouter.js:113-114 | CORRECT | 500 |
| 292 | server/src/routes/tracks.js:6 | CORRECT | description line |
| 293 | tracks.js:35 | WRONG | claim: tracks loaded from `DATA_ROOT/tracks` (`:35`). Line 35 is blank; `const DATA_DIR = join(DATA_ROOT, 'tracks')` is now **tracks.js:36** |
| 293 | tracks.js:45-62 | CORRECT | loadAllTracks 46-58 (the `tracksMap = loadAllTracks()` call is at 63) |
| 294 | tracks.js:36 | WRONG | claim: images in `DATA_ROOT/backgrounds` (`:36`). Line 36 is DATA_DIR; `BG_DIR = join(DATA_ROOT, 'backgrounds')` is now **tracks.js:37** |
| 295 | tracks.js:253-264 | CORRECT | writeTrackBackup 256-269. Note: the claim omits that DELETE /:id/background also writes a backup (594) |
| 299 | guards.js:145 | CORRECT | |
| 303 | tracks.js:227-241 | CORRECT | toSummary 228-242 |
| 303 | tracks.js:457-459 | WRONG | claim: GET / returns summaries. 457-459 is blank/`const router`; `router.get('/', ...)map(toSummary)` is now **tracks.js:462-464** |
| 304 | guards.js:146 | CORRECT | |
| 304 | guards.js:152 | CORRECT | |
| 304 | guards.js:159 | CORRECT | |
| 308 | guards.js:145 | CORRECT | |
| 310 | tracks.js:461-466 | WRONG | claim: GET /:id returns record minus backgroundImageFile. Cited range is GET /; the handler is now **tracks.js:466-471** |
| 311 | tracks.js:463 | WRONG | claim: 404 `Track not found`. Line 463 is the GET / body; the 404 is now **tracks.js:468** |
| 315 | guards.js:145 | CORRECT | |
| 316 | guards.js:58 | CORRECT | tracks admin regex |
| 320 | tracks.js:478-485 | CORRECT | Content-Type from ext + nosniff at 483-485 |
| 320 | server/utils/imageUpload.js:12-17 | CORRECT | IMAGE_MIME |
| 322 | tracks.js:470 | WRONG | claim: 404 `Track not found` (background GET). 470 is `res.json(trackData)`; now **tracks.js:475** |
| 323 | tracks.js:471 | WRONG | claim: 404 `No background`. Now **tracks.js:476** |
| 324 | tracks.js:472-473 | WRONG | claim: unsafe stored name -> 404 `Background file missing`. 472-473 is blank + route header; check is now **tracks.js:477-478** |
| 325 | server/utils/isSafeAssetFilename.js:4-15 | CORRECT | |
| 325 | tracks.js:476 | WRONG | claim: file absent -> 404 `Background file missing`. 476 is the `No background` line; existsSync check is now **tracks.js:481** |
| 326 | tracks.js:482-484 | WRONG | claim: 500 `Failed to read background` if headers not sent. 482-484 sets Content-Type; the stream error handler is now **tracks.js:487-489** |
| 331 | guards.js:145 | CORRECT | |
| 332 | tracks.js:319-374 | CORRECT | validateTrackBodyForCreate 319-379 |
| 333 | tracks.js:321-325 | WRONG | claim: name non-blank, max 100. 321-325 is JSDoc/function header; name checks now **tracks.js:326-330** |
| 333 | tracks.js:136 | WRONG | claim: the 100 limit. 136 is a comment; `TRACK_NAME_MAX = 100` is now **tracks.js:137** |
| 334 | tracks.js:326-328 | WRONG | claim: `closed` boolean. 326-328 is the name check; closed check now **tracks.js:331-333** |
| 335 | tracks.js:329-331 | WRONG | claim: worldWidth/worldHeight numbers. Now **tracks.js:334-336** |
| 337 | tracks.js:332-339 | WRONG | claim: geometry centerPoints>=2 or inner+outer>=2. Range ends mid-expression; full check now **tracks.js:337-344** |
| 338 | tracks.js:138-161 | CORRECT | isFiniteCoord / isValidPoint / validatePoints 139-162 |
| 338 | tracks.js:341-350 | WRONG | claim: per-point validation loop. Range catches only the loop header; loop with validatePoints call now **tracks.js:346-355** |
| 338 | tracks.js:132 | WRONG | claim: \|coord\| <= 10000. 132 is a comment; `COORD_BOUND = 10000` is now **tracks.js:133** |
| 339 | tracks.js:352-359 | WRONG | claim: surfaceClasses array of strings. Now **tracks.js:357-364** |
| 340 | tracks.js:360-364 | WRONG | claim: maxRacers positive or null. Range is surfaceClasses tail; now **tracks.js:365-369** |
| 342 | tracks.js:365-368 | WRONG | claim: trackLights validation call. Range is maxRacers; now **tracks.js:370-373** |
| 342 | tracks.js:98-121 | CORRECT | VALID_LIGHT_STYLES / validateTrackLights 99-122 |
| 344 | tracks.js:369-372 | WRONG | claim: effects validation call. Range is trackLights; now **tracks.js:374-377** |
| 344 | tracks.js:164-190 | CORRECT | validateEffects |
| 344 | tracks.js:129 | WRONG | claim: 480000. 129 is a comment; `EFFECT_COUNT_MAX = 480000` is now **tracks.js:130** |
| 345 | tracks.js:496 | WRONG | claim: geometryId taken from body. 496 is `router.post('/'`; `req.body.geometryId \|\| generateGeometryId()` is now **tracks.js:501** |
| 345 | tracks.js:518 | WRONG | claim: createdAt taken from body. 518 is `...rest`; `createdAt: req.body.createdAt \|\| now` is now **tracks.js:523** |
| 346 | tracks.js:499-520 | CORRECT | drop at 504, spread at 518 (forced id/isDefault/backgroundImageFile run to 522 — slight drift) |
| 349 | tracks.js:243-245 | CORRECT | generateId 244-246, 12 hex |
| 351 | tracks.js:500-520 | CORRECT | defaults 505-517 |
| 351 | tracks.js:527-528 | WRONG | claim: response minus backgroundImageFile / defaults. 527-528 is the disk write; the 201 response is now **tracks.js:532-533** |
| 352 | tracks.js:492-493 | WRONG | claim: 400 joined messages. 492-493 is blank + `// Write` banner; now **tracks.js:497-498** |
| 357 | guards.js:145 | CORRECT | |
| 360 | tracks.js:383-451 | CORRECT | validateTrackBodyForUpdate 388-456 |
| 361 | tracks.js:401-423 | WRONG | claim: any geometry key -> geometry complete. Range starts at worldWidth; check now **tracks.js:406-428** |
| 362 | tracks.js:424-428 | WRONG | claim: geometryId string or null. Range is the geometry loop tail; now **tracks.js:429-433** |
| 364 | tracks.js:539-549 | WRONG | claim: id, isDefault, backgroundImageFile, createdAt preserved, geometryId from body. Range covers only 539-549 (isDefault/backgroundImageFile/createdAt at 550-552 fall outside); now **tracks.js:544-554** |
| 365 | tracks.js:555-556 | WRONG | claim: 200 minus backgroundImageFile. 555-556 is the disk write; response now **tracks.js:560-561** |
| 366 | tracks.js:534 | WRONG | claim: PUT 404 `Track not found`. 534 is end of POST; now **tracks.js:539** |
| 367 | tracks.js:536-537 | WRONG | claim: PUT 400 joined messages. 536-537 is the PUT route header; now **tracks.js:541-542** |
| 371 | guards.js:145 | CORRECT | |
| 374 | tracks.js:570-576 | WRONG | claim: JSON file and background removed. Range is the 403 message + JSON unlink; removeBackgroundFile call at 578 falls outside; now **tracks.js:575-578** |
| 374 | tracks.js:285-297 | CORRECT | removeBackgroundFile 290-302, safety refusal 293-299 |
| 375 | tracks.js:562 | WRONG | claim: DELETE 404 `Track not found`. 562 is end of PUT; now **tracks.js:567** |
| 376 | tracks.js:563-568 | WRONG | claim: 403 `Cannot delete default track…` when isDefault. Range ends at the `if`; the 403 is now **tracks.js:568-573** |

#### (b) Totals

| Verdict | Count |
|---|---|
| CORRECT | 199 |
| WRONG | 35 |
| FILE-MISSING | 0 |
| **Total** | **234** |

No factual errors found in claim text (status codes, error strings, defaults, env names all match source).
One small omission: line 295 says create, update or upload write a backup; `DELETE /:id/background` also
writes one (tracks.js:594).

#### Summary — WRONG / FILE-MISSING only

All 35 WRONG citations are in the Tracks section (doc lines 293–376) and all point at
`server/src/routes/tracks.js`. The cause is uniform drift: the cited code sits +1 line lower after line
~34 and +5 lines lower after line ~255. This fits TRACK-BACKUP-RETENTION-1 (c62ab7fe), which added the
`pruneTrackBackups` import at line 34 and lines in and around `writeTrackBackup`. That cause is inferred
from the code, not confirmed with git. Lines 1–285 of the doc (access rules, health, auth, users) are all correct.

- 293 `:35` -> 36 · 294 `:36` -> 37
- 303 `:457-459` -> 462-464 · 310 `:461-466` -> 466-471 · 311 `:463` -> 468
- 322 `:470` -> 475 · 323 `:471` -> 476 · 324 `:472-473` -> 477-478 · 325 `:476` -> 481 · 326 `:482-484` -> 487-489
- 333 `:321-325` -> 326-330, `:136` -> 137 · 334 `:326-328` -> 331-333 · 335 `:329-331` -> 334-336
- 337 `:332-339` -> 337-344 · 338 `:341-350` -> 346-355, `:132` -> 133
- 339 `:352-359` -> 357-364 · 340 `:360-364` -> 365-369 · 342 `:365-368` -> 370-373
- 344 `:369-372` -> 374-377, `:129` -> 130 · 345 `:496` -> 501, `:518` -> 523
- 351 `:527-528` -> 532-533 · 352 `:492-493` -> 497-498
- 361 `:401-423` -> 406-428 · 362 `:424-428` -> 429-433 · 364 `:539-549` -> 544-554
- 365 `:555-556` -> 560-561 · 366 `:534` -> 539 · 367 `:536-537` -> 541-542
- 374 `:570-576` -> 575-578 · 375 `:562` -> 567 · 376 `:563-568` -> 568-573

FILE-MISSING: none.

### 3.2 docs/API.md lines 380-753 — every citation


Checked against the source in C:/tmp/a1. Bare `:N` was resolved by reading the doc paragraph, not the
helper's guess. For example, API.md:468–471 refers to `server/src/routes/surfaceClasses.js`, not to
`isValidId.js`. API.md line 753 has no citation, so the range ends at 747.

#### (a) Citations

| doc line | cited | verdict | note |
|---|---|---|---|
| 380 | server/src/auth/guards.js:145 | CORRECT | session check -> 401 |
| 383 | server/src/routes/tracks.js:580-592 | CORRECT | Has drifted by about 5 lines. The handler is at 585-597: `removeBackgroundFile` at 589 (its safety check is at 290-298) and `backgroundImageFile: null` at 591. The range still contains both. |
| 384 | server/src/routes/tracks.js:582 | WRONG | The claim is "404 `Track not found`". Line 582 is `});`. The 404 is now at tracks.js:587. |
| 388 | guards.js:145 | CORRECT | |
| 390 | server/src/routes/tracks.js:595 | WRONG | The claim is that the file is in field `background`. Line 595 is blank. `uploadSingleImage(upload, 'background')` is now at tracks.js:600. |
| 391 | tracks.js:610-622 | CORRECT | Has drifted by about 5 lines. The old-file condition is at 622 (inside the range), but the unlink runs to 625, so the full range is now 621-625. |
| 392 | server/src/routes/tracks.js:633 | WRONG | The claim is "200 `{backgroundImageFile}`". Line 633 is `};`. `res.json({ backgroundImageFile: filename })` is now at tracks.js:638. |
| 394 | server/utils/imageUpload.js:109-119 | CORRECT | 413 LIMIT_FILE_SIZE, 400 INVALID_TYPE, 400 fallback |
| 395 | server/src/routes/tracks.js:597 | WRONG | The claim is "404 `Track not found`". Line 597 is `});` (end of the DELETE handler). The 404 is now at tracks.js:602. |
| 396 | tracks.js:598-599 | WRONG | The claim is "400 `No file uploaded (field name: background)`". Lines 598-599 are a blank line and a route comment. The 400 is now at tracks.js:603-604. |
| 397 | tracks.js:603-608 | WRONG | The claim is "400 `File type not allowed…`". The range ends at `detectMagicType` (608). The 400 itself is now at tracks.js:609-613. |
| 402 | guards.js:56-61 | CORRECT | tracks admin regex |
| 405 | server/src/routes/_defaultPromote.js:34-40 | CORRECT | Returns the raw record. |
| 406 | server/src/routes/tracks.js:639-644 | CORRECT | Drifted. The `attachPromoteExport(` call starts at 644, the last line of the range. The full call is 644-657. |
| 407 | _defaultPromote.js:36 | CORRECT | |
| 408 | guards.js:200-201 | CORRECT | 403 forbidden |
| 412 | guards.js:56-61 | CORRECT | |
| 414 | _defaultPromote.js:42-48 | CORRECT | |
| 415 | _defaultPromote.js:44 | CORRECT | |
| 419 | guards.js:56-61 | CORRECT | |
| 423 | _defaultPromote.js:50-58 | CORRECT | |
| 423 | server/src/routes/tracks.js:645-651 | WRONG | The claim is "also carries `_backgroundAssetRelPath`". The range ends at `const seed = { ...record };` (651). The `_backgroundAssetRelPath` assignment is at tracks.js:652-654, and the full `exportSeed` callback is 650-656. |
| 424 | _defaultPromote.js:52 | CORRECT | |
| 443 | server/src/routes/surfaceClasses.js:5-14 | CORRECT | "Code defaults live in the frontend" (11-12) |
| 447 | surfaceClasses.js:110-120 | CORRECT | |
| 451 | guards.js:31-36 | CORRECT | mutating methods only |
| 451 | guards.js:145 | CORRECT | |
| 453 | surfaceClasses.js:88-90 | CORRECT | |
| 458 | guards.js:145 | CORRECT | |
| 460 | surfaceClasses.js:93-97 | CORRECT | |
| 461 | surfaceClasses.js:95 | CORRECT | |
| 465 | guards.js:31-36 | CORRECT | |
| 466 | surfaceClasses.js:62-81 | CORRECT | validateBody |
| 467 | server/utils/isValidId.js:16-18 | CORRECT | |
| 468 | :69-73 (surfaceClasses.js) | CORRECT | The helper's BEYOND-EOF is a mis-resolution. The label checks are at surfaceClasses.js:69-73. |
| 468 | :29 (surfaceClasses.js) | CORRECT | LABEL_MAX = 100 |
| 469 | :74-76 (surfaceClasses.js) | CORRECT | |
| 469 | :26 (surfaceClasses.js) | CORRECT | VALID_GENERATOR_IDS |
| 470 | :77-79 (surfaceClasses.js) | CORRECT | |
| 471 | :117 (surfaceClasses.js) | CORRECT | `isOverride: req.body.isOverride === true` |
| 472 | surfaceClasses.js:124 | CORRECT | |
| 473 | surfaceClasses.js:101-102 | CORRECT | |
| 474 | surfaceClasses.js:105-107 | CORRECT | 409 |
| 474 | guards.js:200-201 | CORRECT | |
| 478 | guards.js:31-36 | CORRECT | |
| 480 | surfaceClasses.js:136-142 | CORRECT | |
| 481 | surfaceClasses.js:127-131 | CORRECT | upsert comment |
| 482 | surfaceClasses.js:152 | CORRECT | |
| 483 | surfaceClasses.js:159 | CORRECT | |
| 485 | surfaceClasses.js:136-138 | CORRECT | |
| 486 | surfaceClasses.js:141-142 | CORRECT | |
| 490 | guards.js:31-36 | CORRECT | |
| 492 | surfaceClasses.js:163-172 | CORRECT | |
| 493 | surfaceClasses.js:165 | CORRECT | |
| 548 | server/src/routes/playerGroups.js:5-15 | CORRECT | storage model at 8-9 |
| 551 | playerGroups.js:140-147 | CORRECT | |
| 555 | guards.js:39-45 | CORRECT | |
| 555 | guards.js:145 | CORRECT | |
| 557 | playerGroups.js:106-108 | CORRECT | |
| 562 | guards.js:145 | CORRECT | |
| 564 | playerGroups.js:111-115 | CORRECT | |
| 565 | playerGroups.js:113 | CORRECT | |
| 569 | guards.js:145 | CORRECT | |
| 570 | playerGroups.js:67-99 | CORRECT | |
| 571 | playerGroups.js:70-74 | CORRECT | |
| 571 | playerGroups.js:34 | CORRECT | NAME_MAX = 100 |
| 572 | playerGroups.js:76-81 | CORRECT | |
| 572 | playerGroups.js:39 | CORRECT | SAVED_GROUP_MAX_NAMES = 200 |
| 573 | playerGroups.js:82-84 | CORRECT | |
| 573 | playerGroups.js:85-90 | CORRECT | tooLongNames |
| 574 | shared/nameLimits.mjs:42 | CORRECT | PLAYER_NAME_MAX_LENGTH = 32 |
| 574 | shared/nameLimits.mjs:68-72 | CORRECT | tooLongNames |
| 575 | playerGroups.js:94-95 | CORRECT | |
| 575 | shared/playerNames.mjs:44-55 | CORRECT | Minor imprecision in the claim. "Ignoring case and spaces" is looser than the code. `playerNameKey` (29-32) trims surrounding spaces and collapses repeated spaces to one, but it does not remove all spaces, so "Ada Lovelace" and "AdaLovelace" are different names. |
| 576 | playerGroups.js:122-131 | CORRECT | |
| 577 | playerGroups.js:144 | CORRECT | |
| 578 | playerGroups.js:139-151 | CORRECT | |
| 579 | playerGroups.js:133 | CORRECT | `{error, errors}` |
| 580 | playerGroups.js:135-137 | CORRECT | |
| 584 | guards.js:145 | CORRECT | |
| 586 | playerGroups.js:160-161 | CORRECT | |
| 586 | playerGroups.js:168 | CORRECT | |
| 587 | playerGroups.js:174 | CORRECT | |
| 588 | playerGroups.js:158 | CORRECT | |
| 589 | playerGroups.js:161 | CORRECT | |
| 593 | guards.js:145 | CORRECT | |
| 595 | playerGroups.js:179-189 | CORRECT | |
| 596 | playerGroups.js:181 | CORRECT | |
| 597 | playerGroups.js:182-184 | CORRECT | |
| 601 | guards.js:39-45 | CORRECT | |
| 604 | _defaultPromote.js:34-40 | CORRECT | |
| 604 | playerGroups.js:194-200 | CORRECT | |
| 605 | _defaultPromote.js:36 | CORRECT | |
| 609 | guards.js:39-45 | CORRECT | |
| 611 | _defaultPromote.js:42-48 | CORRECT | |
| 612 | _defaultPromote.js:44 | CORRECT | |
| 616 | guards.js:39-45 | CORRECT | |
| 619 | _defaultPromote.js:55-57 | CORRECT | `res.json(record)` default |
| 619 | playerGroups.js:194-200 | CORRECT | no exportSeed passed |
| 620 | _defaultPromote.js:52 | CORRECT | |
| 627 | server/src/routes/brands.js:5-22 | CORRECT | |
| 628 | brands.js:45-46 | CORRECT | |
| 632 | brands.js:194-209 | CORRECT | |
| 634 | brands.js:89-153 | CORRECT | |
| 636 | brands.js:92-96 | CORRECT | |
| 637 | brands.js:98-102 | CORRECT | |
| 638 | brands.js:104-110 | CORRECT | |
| 639 | brands.js:112-118 | CORRECT | |
| 640 | brands.js:120-130 | CORRECT | |
| 641 | brands.js:132-137 | CORRECT | |
| 642 | brands.js:139-144 | CORRECT | |
| 642 | brands.js:55 | CORRECT | LOGO_MAX_HEIGHT_CAP = 500 |
| 643 | brands.js:146-150 | CORRECT | |
| 643 | brands.js:59 | CORRECT | VALID_CORNERS |
| 647 | guards.js:48-53 | CORRECT | |
| 647 | guards.js:145 | CORRECT | |
| 649 | brands.js:160-162 | CORRECT | |
| 654 | guards.js:145 | CORRECT | |
| 656 | brands.js:165-169 | CORRECT | |
| 657 | brands.js:167 | CORRECT | |
| 661 | guards.js:145 | CORRECT | |
| 663 | brands.js:176-185 | CORRECT | |
| 663 | brands.js:203 | CORRECT | |
| 666 | brands.js:193-213 | CORRECT | Defaults verified: 199, 200, 202, 204, 205, 206. |
| 667 | brands.js:187 | CORRECT | |
| 668 | brands.js:189-191 | CORRECT | |
| 672 | guards.js:145 | CORRECT | |
| 675 | brands.js:226-247 | CORRECT | |
| 676 | brands.js:230-237 | CORRECT | `String(null).trim()` gives "null", which confirms the ambiguity. |
| 677 | brands.js:198 | CORRECT | |
| 677 | brands.js:201 | CORRECT | |
| 678 | brands.js:251 | CORRECT | |
| 679 | brands.js:220 | CORRECT | |
| 680 | brands.js:222-223 | CORRECT | |
| 684 | guards.js:145 | CORRECT | |
| 686 | brands.js:263-271 | CORRECT | |
| 687 | brands.js:263-266 | CORRECT | Confirmed: there is no `isSafeAssetFilename` check. |
| 688 | brands.js:258 | CORRECT | |
| 689 | brands.js:259-261 | CORRECT | |
| 693 | guards.js:145 | CORRECT | |
| 696 | brands.js:287-294 | CORRECT | |
| 698 | brands.js:279 | CORRECT | |
| 699 | brands.js:280 | CORRECT | |
| 700 | brands.js:281-285 | CORRECT | |
| 701 | brands.js:291-293 | CORRECT | |
| 706 | guards.js:145 | CORRECT | |
| 708 | brands.js:298 | CORRECT | |
| 709 | brands.js:311-321 | CORRECT | |
| 710 | brands.js:327 | CORRECT | |
| 712 | imageUpload.js:109-119 | CORRECT | |
| 713 | brands.js:300 | CORRECT | |
| 714 | brands.js:301 | CORRECT | |
| 715 | brands.js:304-309 | CORRECT | |
| 720 | guards.js:145 | CORRECT | |
| 722 | brands.js:331-345 | CORRECT | |
| 723 | brands.js:335-338 | CORRECT | |
| 724 | brands.js:333 | CORRECT | |
| 728 | guards.js:48-53 | CORRECT | |
| 730 | _defaultPromote.js:34-40 | CORRECT | |
| 731 | brands.js:350-355 | CORRECT | |
| 732 | _defaultPromote.js:36 | CORRECT | |
| 736 | guards.js:48-53 | CORRECT | |
| 738 | _defaultPromote.js:42-48 | CORRECT | |
| 739 | _defaultPromote.js:44 | CORRECT | |
| 743 | guards.js:48-53 | CORRECT | |
| 746 | brands.js:356-362 | CORRECT | |
| 747 | _defaultPromote.js:52 | CORRECT | |

#### (b) Totals

- CORRECT: 160
- WRONG: 7
- FILE-MISSING: 0
- Total citations: 167

#### Summary — WRONG / FILE-MISSING

All 7 WRONG citations are in the track background section of `server/src/routes/tracks.js`. They
come from a drift of about 5 lines that starts after line 562: the DELETE /background handler is now
585-597 and the POST /background handler is now 600-639.

- API.md:384 — `tracks.js:582` should now be **:587** (404 Track not found, DELETE /background).
- API.md:390 — `tracks.js:595` should now be **:600** (field `background`).
- API.md:392 — `tracks.js:633` should now be **:638** (200 `{backgroundImageFile}`).
- API.md:395 — `tracks.js:597` should now be **:602** (404 Track not found, POST /background).
- API.md:396 — `:598-599` should now be **:603-604** (400 No file uploaded).
- API.md:397 — `:603-608` should now be **:609-613** (400 File type not allowed).
- API.md:423 — `tracks.js:645-651` should now be **:650-656** (`exportSeed` and `_backgroundAssetRelPath` at 652-654).

Some citations still count as CORRECT but have drifted and would gain from the same shift:

- API.md:383 (`580-592`) should be 585-597.
- API.md:391 (`610-622`) should be 621-625.
- API.md:406 (`639-644`) should be 644-657.

One claim is worded loosely: API.md:575 says "ignoring case and spaces". The code ignores case, trims
surrounding spaces and collapses repeated spaces, but it does not ignore all spaces.

FILE-MISSING: none.

### 3.3 docs/API.md lines 754-1111 — every citation, and the route count


Clone audited: `C:/tmp/a1`. Every citation in the range was checked against the source file, not only
the helper's dump. The route table at lines 1037–1105 carries **no** source citations, so it was checked
against the route count in (c) instead.

#### (a) Citations

| doc line | cited | verdict | note |
|---|---|---|---|
| 754 | server/src/routes/racers.js:5-20 | CORRECT | :6 "built-in types remain in client RACER_TYPES" |
| 755 | racers.js:41-42 | CORRECT | DATA_DIR / SPRITE_DIR |
| 758 | racers.js:74-118 | CORRECT | validateBody |
| 760 | racers.js:85-87 | CORRECT | |
| 761 | racers.js:89-91 | CORRECT | |
| 763 | racers.js:93-103 | CORRECT | displaySize at 101-103; null checks only |
| 764 | racers.js:105-107 | CORRECT | |
| 765 | racers.js:109-111 | CORRECT | |
| 766 | racers.js:113-115 | CORRECT | |
| 770 | racers.js:162-170 | CORRECT | speedMultiplier/baseRotationOffset at 168-169 |
| 770 | racers.js:208-216 | CORRECT | |
| 774 | server/src/auth/guards.js:145 | CORRECT | requireAuth 401 check |
| 776 | racers.js:125-127 | CORRECT | |
| 781 | guards.js:145 | CORRECT | |
| 783 | racers.js:130-134 | CORRECT | |
| 784 | racers.js:132 | CORRECT | |
| 788 | guards.js:145 | CORRECT | |
| 790 | server/src/constants/builtinRacerIds.js | CORRECT | file exists |
| 790 | racers.js:77-83 | CORRECT | |
| 791 | racers.js:144 | CORRECT | randomUUID |
| 793 | racers.js:150-178 | CORRECT | spriteFile null, createdAt, updatedAt at 171-173; 201 at 178 |
| 794 | racers.js:141-142 | CORRECT | |
| 795 | racers.js:146-148 | CORRECT | |
| 799 | guards.js:145 | CORRECT | |
| 800 | racers.js:193 | CORRECT | validateBody(req.body) with no id |
| 801 | racers.js:198-222 | CORRECT | |
| 803 | racers.js:183-188 | CORRECT | |
| 804 | racers.js:191 | CORRECT | |
| 805 | racers.js:193-194 | CORRECT | |
| 810 | guards.js:145 | CORRECT | |
| 812 | racers.js:226-239 | CORRECT | 204 at 238 |
| 813 | racers.js:230-233 | CORRECT | no isSafeAssetFilename check |
| 814 | racers.js:228 | CORRECT | |
| 818 | guards.js:145 | CORRECT | |
| 821 | racers.js:254-261 | CORRECT | |
| 823 | racers.js:246 | CORRECT | |
| 824 | racers.js:247 | CORRECT | |
| 825 | racers.js:248-252 | CORRECT | |
| 826 | racers.js:258-260 | CORRECT | |
| 831 | guards.js:145 | CORRECT | |
| 833 | racers.js:265 | CORRECT | field `sprite` |
| 833 | racers.js:278-288 | CORRECT | 10 MB is MAX_IMAGE_BYTES, imageUpload.js:21 |
| 834 | racers.js:294 | CORRECT | |
| 836 | server/utils/imageUpload.js:109-119 | CORRECT | |
| 837 | racers.js:267 | CORRECT | |
| 838 | racers.js:268 | CORRECT | |
| 839 | racers.js:271-276 | CORRECT | |
| 844 | guards.js:145 | CORRECT | |
| 847 | racers.js:298-312 | CORRECT | spriteFile null at 307, 204 at 311 |
| 848 | racers.js:300 | CORRECT | |
| 855 | server/src/routes/seedNotices.js:5-22 | CORRECT | |
| 859 | guards.js:145 | CORRECT | |
| 859 | routes/seedNotices.js:10-12 | CORRECT | "both are operator+" |
| 862 | routes/seedNotices.js:31-33 | CORRECT | |
| 862 | server/src/seedNotices.js:45-52 | CORRECT | |
| 863 | server/src/seedDelivery.js:169 | CORRECT | {unit, kind, name, from, to} |
| 863 | server/src/seedNotices.js:61-63 | CORRECT | |
| 868 | guards.js:145 | CORRECT | |
| 870 | routes/seedNotices.js:36-39 | CORRECT | |
| 871 | server/src/seedNotices.js:70-74 | CORRECT | |
| 879 | server/src/routes/races.js:6 | CORRECT | |
| 880 | races.js:89-288 | CORRECT | drifted: createRacesRouter is now 90-294; the declaration is inside the range |
| 881 | races.js:31-36 | CORRECT | |
| 883 | server/src/races/raceStore.js:457-499 | CORRECT | field list matches hydrate 466-498 |
| 892 | races.js:38-42 | CORRECT | |
| 893 | races.js:131 | WRONG | "a `team` in the body is overwritten (`:131`)": 131 is blank; `storeRace({ ...body, team })` is at **races.js:132** |
| 894 | raceStore.js:264-295 | CORRECT | names/no-duplicates/results/winners checks |
| 894 | raceStore.js:241-249 | CORRECT | required() |
| 894 | raceStore.js:362-371 | CORRECT | |
| 901 | raceStore.js:335-344 | CORRECT | |
| 904 | races.js:131-138 | CORRECT | 201 at 135 |
| 906 | races.js:120-129 | CORRECT | |
| 906 | raceStore.js:514-525 | CORRECT | |
| 907 | raceStore.js:313 | CORRECT | |
| 909 | raceStore.js:179 | CORRECT | |
| 910 | server/src/races/migrateClientIdPerTeam.js | CORRECT | file exists |
| 914 | races.js:107-117 | CORRECT | 503 at 114 |
| 916 | races.js:143-150 | CORRECT | |
| 917 | races.js:151-154 | WRONG | "500 `internal error`… (`:151-154`)": the range holds only a comment and the console.error; `res.status(500).json({ error: 'internal error' })` is at **races.js:155** (use 152-155) |
| 919 | races.js:120 | WRONG | "`getRaceByClientId(undefined)` runs first (`:120`)": 120 is `try {`; the call is at **races.js:121**. Claim also inaccurate: it does not bind `undefined` as NULL. raceStore.js:523 binds `String(clientRaceId ?? '')`, which is the empty string. That still matches no row, so the 400 outcome holds |
| 921 | raceStore.js:362 | CORRECT | |
| 926 | races.js:163-181 | CORRECT | |
| 928 | raceStore.js:604-609 | CORRECT | |
| 930 | races.js:176-180 | CORRECT | |
| 930 | raceStore.js:552-560 | CORRECT | newest first |
| 931 | races.js:167-174 | CORRECT | |
| 936 | races.js:204-205 | CORRECT | team at 205 |
| 939 | races.js:187-199 | CORRECT | |
| 939 | races.js:79 | WRONG | cited for the 366-day bound / window: 79 is the closing `*/` of the doc comment; `EVALUATION_MAX_DAYS = 366` is at **races.js:80** (comment 75-79). The half-open window itself is at raceStore.js:565 and :587 |
| 939 | raceStore.js:583-593 | CORRECT | streamed, two fields |
| 941 | races.js:202-206 | WRONG | response shape `{from, to, counted, …}`: the range ends before the response; `res.json({ from: fromIso, to: toIso, ...evaluatePeriod(races) })` is at **races.js:207** (use 203-207) |
| 942 | server/src/races/periodEvaluation.js:55-91 | CORRECT | |
| 943 | races.js:190-194 | CORRECT | |
| 944 | races.js:195-199 | CORRECT | |
| 948 | guards.js:72-79 | CORRECT | |
| 948 | guards.js:145 | CORRECT | |
| 952 | races.js:211 | WRONG | 211 is the second line of a comment; the GET route `router.get('/evaluation/points-rule', …)` is at **races.js:212** |
| 952 | server/src/races/pointsRule.js:27 | WRONG | 27 is blank; `DEFAULT_POINTS_RULE = {pointsEnabled: false, pointsPerPlace: []}` is at **pointsRule.js:26** |
| 952 | pointsRule.js:67-77 | WRONG | stale, runs past EOF (file is 73 lines). validate/fallback are at **pointsRule.js:67-68** (store 64-72); the fallback for a missing or invalid file is applied in **server/utils/jsonSettingStore.js:32-40** |
| 957 | guards.js:74-79 | CORRECT | |
| 958 | pointsRule.js:13-14 | CORRECT | |
| 960 | pointsRule.js:39-56 | CORRECT | function is 38-55 |
| 960 | pointsRule.js:30-31 | CORRECT | POINTS_VALUE_MAX at 30; the "at most 100" (POINTS_LADDER_MAX) is at 29, one line above the range (used at 44, inside 39-56) |
| 961 | pointsRule.js:55 | WRONG | "Extra fields are dropped (`:55`)": 55 is `}`; the rebuilt object `{ pointsEnabled, pointsPerPlace: [...] }` is at **pointsRule.js:54** |
| 962 | races.js:215-219 | CORRECT | |
| 962 | pointsRule.js:77-81 | WRONG | runs past EOF (73 lines). The stored rule is returned by `set()` in **server/utils/jsonSettingStore.js:42-46** (store built at pointsRule.js:64-72) |
| 963 | races.js:217 | WRONG | "400 `{error}` with the validator's sentence": 217 only calls the validator; the 400 is at **races.js:218** (use 217-218) |
| 964 | guards.js:200-201 | CORRECT | |
| 969 | races.js:221-234 | CORRECT | |
| 970 | raceStore.js:535-543 | CORRECT | |
| 973 | shared/raceShortKey.mjs:54 | CORRECT | alphabet |
| 973 | raceShortKey.mjs:60 | CORRECT | length 6 |
| 973 | raceShortKey.mjs:68-76 | CORRECT | |
| 974 | races.js:233 | WRONG | "200 with the race object": 233 is `}`; `return res.json(race)` is at **races.js:234** |
| 976 | races.js:229-232 | CORRECT | |
| 980 | guards.js:66-71 | CORRECT | |
| 981 | races.js:256-260 | CORRECT | |
| 983 | server/src/races/verifyOffMainThread.js, verifyReplay.worker.js | CORRECT | both files exist |
| 987 | races.js:279-289 | CORRECT | |
| 988 | scripts/lib/storedRaceReplay.mjs:193-204 | CORRECT | track 195, racers 197 |
| 990 | races.js:258-260 | CORRECT | |
| 991 | races.js:266-270 | CORRECT | |
| 992 | races.js:272-276 | CORRECT | |
| 993 | server/src/races/verifyReplay.worker.js | CORRECT | `unavailable` posted at :20 |
| 995 | :277 (races.js) | CORRECT | the helper resolved it to verifyReplay.worker.js (44 lines), giving BEYOND-EOF. The intended file is races.js: `:277` is `if (outcome.refusal) return res.status(422)…`. The shorthand is ambiguous because the last file named (line 993) is the worker; the worker converts StoredRaceRefusal at :38-39 |
| 996 | storedRaceReplay.mjs:42 | CORRECT | |
| 996 | storedRaceReplay.mjs:55-63 | CORRECT | `need()`; world-block use at 112-116 |
| 996 | storedRaceReplay.mjs:84-111 | CORRECT | geometryId + lap checks |
| 997 | guards.js:200-201 | CORRECT | |
| 999 | races.js:68-73 | CORRECT | |
| 1000 | races.js:263 | CORRECT | |
| 1000 | races.js:278 | CORRECT | |
| 1001 | races.js:255 | CORRECT | |
| 1001 | server/utils/asyncRoute.js:32-33 | CORRECT | |
| 1010 | server/src/routes/settings.js:1-12 | CORRECT | |
| 1010 | server/src/settings/testAids.js | CORRECT | file exists |
| 1011 | server/src/app.js:79 | WRONG | "Mounted at `server/src/app.js:79`": 79 is the SERVE-SPA-1 comment before `mountApiNotFound`; `app.use('/api/settings', settingsRouter)` is at **app.js:77** |
| 1016 | guards.js:80-87 | CORRECT | |
| 1017 | client/src/modules/testAids.js | CORRECT | file exists |
| 1019 | settings.js:23 | CORRECT | |
| 1020 | server/utils/jsonSettingStore.js:32 | CORRECT | |
| 1021 | jsonSettingStore.js:33-40 | CORRECT | Claim inaccurate: "said once in the log" is not true. `console.warn` at :39 runs on **every** `get()` against an invalid file. Nothing limits it to once. The file header (:6) and pointsRule.js:58 say the same thing |
| 1026 | guards.js:80-87 | CORRECT | |
| 1027 | settings/testAids.js:32-37 | CORRECT | |
| 1028 | settings.js:25-29 | CORRECT | |
| 1029 | jsonSettingStore.js:42-46 | CORRECT | |
| 1030 | settings/testAids.js:40 | CORRECT | |
| 1032 | settings.js:27 | CORRECT | |
| 1032 | settings/testAids.js:34 | CORRECT | |
| 1033 | guards.js:200-201 | CORRECT | |

#### (b) Totals

| verdict | count |
|---|---|
| CORRECT | 137 |
| WRONG | 13 |
| FILE-MISSING | 0 |
| **total** | **150** |

Two claims are inaccurate even where the citation is right or close: line 919 (it binds `''`, not NULL) and line 1021 ("said once in the log").

#### (c) Route count ("all 65 routes the server registers")

Counted `router.get/post/put/delete/patch(` in every router mounted in `server/src/app.js:68-77`, plus `app.get('/api/health')`:

| router | routes |
|---|---|
| auth/authRouter.js | 6 |
| auth/usersRouter.js | 4 |
| routes/tracks.js | 8 + 3 promote/export = 11 |
| routes/surfaceClasses.js | 5 |
| routes/playerGroups.js | 5 + 3 promote/export = 8 |
| routes/brands.js | 8 + 3 promote/export = 11 |
| routes/racers.js | 8 |
| routes/seedNotices.js | 2 |
| routes/races.js | 7 |
| routes/settings.js | 2 |
| app.js `/api/health` | 1 |
| **total** | **65** |

`attachPromoteExport` (`_defaultPromote.js:34/42/50`) is called by tracks.js:644, playerGroups.js:194 and brands.js:350, which adds 3 × 3 = 9 routes. **65 is correct**, and the 65-row table at lines 1041-1105 matches those routes one for one.

#### Summary: WRONG citations

- 893 `races.js:131` → 132
- 917 `races.js:151-154` → 500 is at 155
- 919 `races.js:120` → 121 (and the "binds undefined as NULL" claim is wrong: raceStore.js:523 binds `''`)
- 939 `races.js:79` → 80 (EVALUATION_MAX_DAYS)
- 941 `races.js:202-206` → response at 207
- 952 `races.js:211` → 212
- 952 `pointsRule.js:27` → 26
- 952 `pointsRule.js:67-77` → past EOF; 67-68 / jsonSettingStore.js:32-40
- 961 `pointsRule.js:55` → 54
- 962 `pointsRule.js:77-81` → past EOF; jsonSettingStore.js:42-46
- 963 `races.js:217` → 400 at 218
- 974 `races.js:233` → 234
- 1011 `app.js:79` → 77

FILE-MISSING: none. Route count: 65, correct.

### 3.4 docs/DEPLOYMENT.md — every citation

| doc line | cited | verdict | note |
|---|---|---|---|
| 98 | server/src/routes/tracks.js:457 | WRONG | blank line; list route `router.get('/'` is at :462 |
| 99 | server/src/routes/brands.js:160 | CORRECT | `router.get('/'` |
| 99 | server/src/routes/playerGroups.js:100 | WRONG | blank line; list route at :106 |
| 100 | server/src/routes/racers.js:125 | CORRECT | `router.get('/'` |
| 101 | server/src/auth/guards.js:22-26 | CORRECT | ROUTE_POLICY users entry, admin for every method |
| 101 | server/src/auth/usersRouter.js:21-24 | CORRECT | GET / returns every user |
| 102 | server/src/routes/races.js:121-131 | WRONG | that is the POST duplicate check (`getRaceByClientId(…, team)`); the team-scoped LIST the sentence describes is :164-181 (`listRacesPage(team, …)`) |
| 520 | server/Dockerfile:32 | WRONG | `RUN npm ci` in the client stage; `COPY server/utils/ ./utils/` is :70 |
| 520 | server/Dockerfile:42 | WRONG | blank; `COPY shared/nameLimits.mjs /shared/nameLimits.mjs` is :87 |

Totals: 9 citations — 4 CORRECT, 5 WRONG, 0 FILE-MISSING.

### 3.5 Sample across the other living documents


Method: every citation in docs with fewer than 15 blocks; all of DEPLOY-NOTES, SETUP, VERIFY-RULES,
ARCHITECTURE, OPEN, README; FORCE-MAP and PHASE-CONTRACT almost whole; MORNING whole; BACKLOG 141 of
its ~250 tokens, spread across the file. Each cited line was opened (or the symbol grepped) at the tree.
Helper mis-resolutions corrected by hand: `:239`/`:1765`/`:701`/`:1594`/`:389-390`/`:152`/`:170`/`:41`
etc. were re-attributed to the file the doc sentence actually names (e.g. MORNING `:389-390` is
racePlanner.js, BACKLOG `:152`/`:170` is `ProtectedRoute.test.jsx`, BACKLOG `:41` is
`deploy.yml.disabled`, BACKLOG `:42`/`:119` is `RaceHistory.jsx`).
HISTORICAL = a dated verdict/closed row/"row as it stood"/dated morning sheet; where it drifted, the
current place is still given. Two illustrative non-citations (VERIFY-RULES:834 `raceGovernor.js:92`,
:839 `file.js:357`) are examples of the R19 rule, not claims, and are excluded.

| doc:line | cited file:line | verdict | note |
|---|---|---|---|
| ARCHITECTURE.md:173 | components/EffectConfig/EffectConfig.jsx:11 | WRONG | "declares `max = 3`" — now `:19` (`function EffectConfig({…, max = 3 })`) |
| ARCHITECTURE.md:173 | EffectConfig.jsx:34 | WRONG | "refuses a fourth" — now `:42` (`if (effects.length >= max) return;`) |
| ARCHITECTURE.md:173 | EffectConfig.jsx:124 | WRONG | "hides the add button at the limit" — now `:160` (`effects.length < max &&`) |
| ARCHITECTURE.md:173 | screens/TrackEditor/TrackEditorToolbar.jsx:128 | CORRECT | `max={3}` |
| ARCHITECTURE.md:173 | screens/TrackEditor/trackEditorSave.js:73 | CORRECT | `effects.slice(0, 3)` |
| ARCHITECTURE.md:173 | screens/RaceScreen/trackScene.js:60-74 | CORRECT | `createTrackEffects` |
| ARCHITECTURE.md:173 | trackEditorSave.js:135 | CORRECT | `extractEffects` |
| ARCHITECTURE.md:319 | modules/raceBehavior.js:249 | WRONG | "Use `pxToPhysicalY` (raceBehavior.js:249)" — now `:255` |
| ARCHITECTURE.md:1231 | modules/racePlanner.js:523 | WRONG | "zero for every racer from the chaos boundary onward" — `:523` is `arrivalCeiling`; the cut is `:993-1005` (comment restated `:1204`) |
| AUDIT.md:282 | storage/storage.js:148/154 | HISTORICAL | dated audit-log entry; lines now `}` / other code |
| AUDIT.md:334 | storage.js:148/154 | HISTORICAL | dated audit-log entry |
| AUDIT.md:342 | storage.js:148/154 | HISTORICAL | dated audit-log entry |
| branding.md:48 | storage.js:158 | HISTORICAL | dated CITATIONS-1 note about a past citation |
| branding.md:50 | storage.js:146 | WRONG | "`newId` is at `:146`" — now `:159` (inside a dated note, but stated as present fact) |
| branding.md:69 | storage.js:45-47 | WRONG | "logs a warning and silently skips the write if the quota is exceeded" — now `storageSet` catch at `:96-98` |
| branding.md:115 | styles/main.css:18-19 | CORRECT | brand vars comment |
| branding.md:121 | contexts/TransitionOverlay.css:13 | CORRECT | `var(--brand-primary, #000)` |
| branding.md:185 | RaceScreen/renderRaceFrame.js:371 | CORRECT | `drawTitle(ctx, shape, raceData)` |
| branding.md:188 | renderRaceFrame.js:369 | CORRECT | `drawTitleOpen` |
| branding.md:212 | ResultScreen/ResultScreen.css:76-89 | CORRECT | `.brand-logo-result` |
| branding.md:237 | modules/raceCore.js:754 | CORRECT | `r.finishTimeMs = physicsTs` |
| branding.md:243 | RaceScreen/raceResults.js:57 | CORRECT | `finishTimeMs: r.finishTimeMs ?? null` |
| branding.md:324 | TransitionOverlay.css:13 | CORRECT | |
| CAMERA_DIRECTOR.md:1192 | scripts/tracking-lag.mjs:45-52 | CORRECT | identity block (raceSeed 5601, 40 racers) |
| CAMERA_DIRECTOR.md:1288 | scripts/lib/raceDriver.mjs:373 | HISTORICAL | dated 2026-09-10 re-measure; ENDING-PHASES:133 records it changed 2026-09-11. `updateRacePlan` now `:452`, plan delivery `:506`/`:574` |
| CONCEPT-COHESION.md:42 | racePlanner.js:566,577,579 | WRONG | servo "am I in the right place" — those lines are now telemetry declarations; servo target is `:1447` |
| CONCEPT-COHESION.md:156 | racePlanner.js:615 | WRONG | `computePulkBiasedTarget` — now `:1567` |
| CONCEPT-COHESION.md:157 | racePlanner.js:208 | WRONG | "`slice(0,3)`/PULK" — `:208` is `rankPool`; pulk pool/slice now `:221-235` |
| CONCEPT-COHESION.md:160 | RaceScreen/index.jsx:535-540 | WRONG | rollInterval no longer in index.jsx — now `raceCore.js:162` |
| CONCEPT-COHESION.md:160 | storage/defaults.js:260-261 | WRONG | re-roll interval keys now `defaults.js:1032-1034` |
| CONCEPT-COHESION.md:170 | DynamicsTuningSection.jsx:444-447 | WRONG | "transition editable 0.5–10 s" — `reRollTransitionDuration` control now ~`:576-590` |
| CONCEPT-COHESION.md:176 | scripts/sim-fairness.mjs:1086 | WRONG | `nextRollTime = raceTs + rollInterval + jOff` — not in sim-fairness; lives in `raceCore.js:678` |
| CONCEPT-COHESION.md:176 | index.jsx:1086 | WRONG | same — now `raceCore.js:678` |
| CONCEPT-COHESION.md:184 | sim-fairness.mjs:566-567 | WRONG | "`Math.random = makePRNG(seed)`" — no such assignment; sim draws from `makeRaceRng(seed).physics` (`sim-fairness.mjs:1086`) |
| CONCEPT-COHESION.md:184 | sim-fairness.mjs:1066-1067,1085 | WRONG | consumption sites gone with the above (now parameter-list lines) |
| CONCEPT-COHESION.md:188 | modules/raceGovernor.js:82 | WRONG | "keys a mulberry32 stream on `index ^ (seed ^ XOR)`" — no such stream in raceGovernor.js (FORCE-MAP:201 records the governor seed XOR removed) |
| CONCEPT-COHESION.md:243 | racePlanner.js:74-75 | WRONG | "servo clamp `[0.85, 1.10]`" — `DEFAULT_CONTROLLER_PARAMS` now `:100-105` |
| CONCEPT-COHESION.md:258 | heroCurveGenerator.js:407-408 | WRONG | B1 pool filter `finalRanks.get(p.index) <= BAND_EDGES[0]` — now `:674` |
| CONCEPT-COHESION.md:259 | heroCurveGenerator.js:378-382 | WRONG | winner cast at cluster rank — now `:648` (`addSolo(winnerIdx,'sovereign-lead',…)`) |
| CONCEPT-COHESION.md:304 | racePlanner.js:208 | WRONG | `pulkRacerIds = shuffled.slice(0,3)` — now `:235` |
| CONCEPT-COHESION.md:304 | racePlanner.js:615 | WRONG | PULK gate in `computePulkBiasedTarget` — now `:1595` |
| DEAD-ENDS.md:532 | camera/CameraDirectorCeilings.js:363 | CORRECT | `_lineCeiling` |
| DEAD-ENDS.md:533 | camera/CameraDirectorRunIn.js:522 | CORRECT | `_scheduleClose` |
| DEAD-ENDS.md:534 | CameraDirectorCeilings.js:283 | CORRECT | `_anchorScreen` |
| DEAD-ENDS.md:628 | racePlanner.js:1434 | CORRECT | `error = strictness * rankError + …` |
| DEPLOY-NOTES.md:80 | client/src/services/api.js:16-18 | WRONG | "is the whole of it" + quoted `VITE_API_URL ?? 'http://localhost:4000'` — that code is gone (D30 built); now `API_BASE_URL = runtimeApiBaseUrl() ?? buildTimeApiBaseUrl() ?? DEFAULT_API_BASE_URL` at `:99`. The whole §2 "What is true" is stale |
| DEPLOY-NOTES.md:139 | server/src/auth/session.js:68 | CORRECT | `if (!secret)` → throws at `:72` in production |
| DEPLOY-NOTES.md:159 | server/src/index.js:16 | WRONG | "`app.listen(PORT, …)` — plain HTTP" — now `listenOn(app, PORT, bindAddress, …)` at `:59` (still plain HTTP) |
| DEPLOY-NOTES.md:163 | server/src/app.js:34 | CORRECT | trust proxy |
| DEPLOY-NOTES.md:164 | session.js:23-29 | CORRECT | `resolveCookieSecure` re-export (rule in cookiePolicy.js) |
| DEPLOY-NOTES.md:166 | session.js:35-43 | CORRECT | `__Host-ra.sid` / host mode throws |
| DEPLOY-NOTES.md:172 | server/src/auth/authRouter.js:199 | WRONG | "reads `username` and `password` from `req.body`" — `:199` is a comment; login read is `:204` |
| DEPLOY-NOTES.md:189 | server/src/startupReadiness.js:57 | CORRECT | RA_BOOTSTRAP_TOKEN |
| DEPLOY-NOTES.md:189 | startupReadiness.js:67 | CORRECT | RA_SESSION_SECRET |
| DEPLOY-NOTES.md:190 | startupReadiness.js:76 | CORRECT | RA_CLIENT_ORIGIN |
| DEPLOY-NOTES.md:236 | docker-compose.yml:17-18 | CORRECT | `4000:4000` |
| DEPLOY-NOTES.md:239 | docs/DEPLOYMENT.md:9-13 | CORRECT | same-origin hosting |
| DEPLOY-NOTES.md:241 | docs/DEPLOYMENT.md:242 | WRONG | quotes *"if sitting behind nginx/Caddy"* — phrase no longer in DEPLOYMENT.md; `:242` is `set -a; . "$RA_ENV_FILE"`. Proxy guidance now `:227-228` and `:452` (Caddy example) |
| DEPLOY-NOTES.md:271 | session.js:108 | CORRECT | `maxAge` at `:107` (off by one) |
| DEPLOY-NOTES.md:286 | server/Dockerfile:22 | HISTORICAL | explicitly "before TIDY-C-1"; FROM lines now `:27`/`:39` |
| DEPLOY-NOTES.md:286 | Dockerfile:33 | HISTORICAL | as above |
| DEPLOY-NOTES.md:299 | scripts/backup.mjs:137 | WRONG | "writes a tar header checksum" — `:137` is `checksumPath`'s return; tar header checksum is `:187`/`:194` (`tarHeader`) |
| DEPLOYMENT.md:98 | server/src/routes/tracks.js:457 | WRONG | GET-all handler — now `:462` |
| DEPLOYMENT.md:99 | routes/brands.js:160 | CORRECT | `router.get('/')` |
| DEPLOYMENT.md:99 | routes/playerGroups.js:100 | WRONG | GET-all — now `:106` |
| DEPLOYMENT.md:100 | routes/racers.js:125 | CORRECT | |
| DEPLOYMENT.md:101 | server/src/auth/guards.js:22-26 | CORRECT | `/api/users` admin-only policy |
| DEPLOYMENT.md:101 | server/src/auth/usersRouter.js:21-24 | CORRECT | list all users |
| DEPLOYMENT.md:102 | routes/races.js:121-131 | WRONG | "a user sees only the races stored by their own team" — `:121-131` is the POST dedupe; the team-scoped list is `:164-181` (`listRacesPage(team…)`), short-key `:228-235` |
| DEPLOYMENT.md:520 | server/Dockerfile:32 | WRONG | "`server/utils/` … COPYed in" — `:32` is `RUN npm ci` (client-build stage); utils COPY is `:70` |
| DEPLOYMENT.md:520 | Dockerfile:42 | WRONG | `shared/nameLimits.mjs` COPY is `:87` |
| DEVSCREEN-INVENTORY.md:1132 | modules/autoSpriteScale.js:19-24 | CORRECT | stored default incl. `minTargetScreenPx` note |
| DEVSCREEN-INVENTORY.md:1183 | DynamicsTuningSection.jsx:259-266 | WRONG | "`DynamicsTuningSection.resetAll()` … comments at :259-266" — no `resetAll` in the file any more; master reset is `resetRaceRelevantToDefault` (`raceRelevantReset.js:40-49`); `:261-263` is `resetFrameTiming` |
| DEVSCREEN-INVENTORY.md:1191 | sections/raceRelevantReset.js:36-40 | WRONG | "Auto-Scale card re-syncs from storage on its next mount" via `resetAutoScaleToDefault()` — that function is gone; comment at `:40-43` now says every mounted part re-reads at once (`useSyncedConfig`) |
| ENDING-PHASES.md:133 | scripts/lib/raceDriver.mjs:506 | CORRECT | `makeCameraPlanDelivery` |
| ENDING-PHASES.md:133 | raceDriver.mjs:571 | CORRECT | comment heads the call at `:574` |
| ENDING-PHASES.md:410 | ENDING-PHASES.md:198 | WRONG | "the note at :198 says that figure 'was wrong'" — that note is now `:336` |
| FORCE-MAP.md:92 | raceCore.js:685 | CORRECT | baseSpeed product |
| FORCE-MAP.md:106 | RaceScreen/raceWorldSetup.js:94 | CORRECT | `getSpeedMultiplier()` |
| FORCE-MAP.md:112 | raceCore.js:187-188 | CORRECT | spreadFactor draw |
| FORCE-MAP.md:112 | raceCore.js:641-678 | CORRECT | mid-race re-roll |
| FORCE-MAP.md:114 | raceCore.js:641 | CORRECT | |
| FORCE-MAP.md:115 | raceCore.js:476-477 | CORRECT | halfWidth |
| FORCE-MAP.md:127 | raceCore.js:689 | CORRECT | draftingBoost |
| FORCE-MAP.md:132 | raceBehavior.js:526-527 | WRONG | "drafting fed into brake-to-match estimate" — now `pairForwardSpeeds` `:500-520` (boost at `:501-502`) |
| FORCE-MAP.md:136 | raceCore.js:695-697 | CORRECT | brake min() |
| FORCE-MAP.md:137 | raceBehavior.js:501-502 | WRONG | "`avoidanceActive` is set when a pair is inside the brake zone" — `:501-502` is drafting boost; set at `:1208` (`speedBrakeSet.has`) |
| FORCE-MAP.md:147 | raceCore.js:696 | CORRECT | |
| FORCE-MAP.md:150 | raceBehavior.js:511-519 | WRONG | open-track narrow zone — now `:891` |
| FORCE-MAP.md:151 | raceBehavior.js:521 | WRONG | `inBrakeMatchZone = true` — now `:893` |
| FORCE-MAP.md:160 | raceCore.js:605-608 | CORRECT | trajectoryMult ease |
| FORCE-MAP.md:168 | raceCore.js:728 | WRONG | "areaBonusMult read at" — `:728` is the unread `r.vt` diagnostic (`:721-731`); the step reads it in `raceStep.js:130` |
| FORCE-MAP.md:188 | raceCore.js:711-713 | CORRECT | runoutDecay |
| FORCE-MAP.md:201 | raceCore.js:615 | CORRECT | `applyPulkLeadRotation(` call |
| FORCE-MAP.md:201 | raceCore.js:376 | CORRECT | `pulkLeadRotationOn = racePlanEnabled` |
| FORCE-MAP.md:201 | modules/raceStep.js:83 | WRONG | "governorMult enters the shared t-update" — `:83` is `_rowEnvTgtPrev`; governorMult at `:131` |
| FORCE-MAP.md:261 | raceBehavior.js:807-810 | HISTORICAL | section L1 marked REMOVED; `homeForceStrength` exists nowhere in raceBehavior.js |
| FORCE-MAP.md:276 | raceBehavior.js:816-819 | HISTORICAL | L2 REMOVED; no `neighborCount` in raceBehavior.js |
| FORCE-MAP.md:281 | raceBehavior.js:667-674 | HISTORICAL | L3 REMOVED; no `yFreeLaneDeltas` |
| FORCE-MAP.md:318 | raceBehavior.js:1011-1016 | WRONG | L7 soft repulsion (live section) — `:1011-1016` is `isSideFree` calls; soft repulsion now `:1163-1165` |
| FORCE-MAP.md:337 | raceBehavior.js:27-29 | HISTORICAL | L9 REMOVED; no `STUCK_*` constants in raceBehavior.js |
| FORCE-MAP.md:343 | raceBehavior.js:728 | HISTORICAL | L10 REMOVED |
| FORCE-MAP.md:350 | raceBehavior.js:1008 | WRONG | L11 damping (live) — `:1008` is `tHalfSpan`; damping applied `:1158` (`physicalYVelocity = … * damping`), read `:1094` |
| FORCE-MAP.md:410 | raceBehavior.js:667-674 | HISTORICAL | conflict between REMOVED L2/L3 |
| FORCE-MAP.md:422 | racePlanner.js:394, 463 | WRONG | `racersBlockedInOutcome` telemetry — now counter `:591`, increment `:1494`, reported `:1758` |
| FORCE-MAP.md:426 | raceBehavior.js:526-539 | WRONG | drafting into brake-match estimate — now `:500-520` |
| FORCE-MAP.md:439 | storage/defaults.js:442 | WRONG | `speedBrakeYThreshold` — now `:1479` |
| FORCE-MAP.md:442 | raceBehavior.js:912-915 | WRONG | drafting cone misses on tight curves — now `:1286-1287` |
| FORCE-MAP.md:452 | modules/raceBaseSpeed.js:29 | CORRECT | `computeRaceBaseSpeed` |
| FORCE-MAP.md:458 | raceBehavior.js:549 | WRONG | A6 brake-to-match cap — `:549` is JSDoc of `applyRacerBehavior`; `computeBrakeMatchFactor` `:98`, applied `:904-915` |
| FORCE-MAP.md:459 | racePlanner.js:362 | WRONG | A7 controller `[0.85,1.10]` — `DEFAULT_CONTROLLER_PARAMS` `:100-105`, controller `:546` |
| FORCE-MAP.md:460 | racePlanner.js:312 | WRONG | A8 areaBonus band deltas — `AREA_BONUS_BASE_DELTAS` `:112` |
| FORCE-MAP.md:465 | raceGovernor.js:170 | WRONG | A13 `applyPulkLeadRotation` — now `:244` (`:170` is inside `governorPhaseWeight`) |
| GLOSSARY.md:88 | heroCurveGenerator.js:688 | CORRECT | staged comebacker |
| GLOSSARY.md:93 | heroCurveGenerator.js:722 | CORRECT | pursuer |
| GLOSSARY.md:99 | heroCurveGenerator.js:648 | CORRECT | sovereign-lead |
| LESSONS.md:2655 | raceBehavior.js:123 | HISTORICAL | dated correction; says the symbol is gone |
| LESSONS.md:2655 | raceBehavior.js:560-561 | HISTORICAL | same note |
| MORNING.md:28 | .github/workflows/ci.yml:343 | HISTORICAL | dated sheet 2026-09-19; `check-measured-stamps` now `:350-351` |
| MORNING.md:35 | client/e2e/arrival-shape.spec.js:115 | HISTORICAL | struck/answered item; spec now one test at `:60` |
| MORNING.md:114 | arrival-shape.spec.js:40 | HISTORICAL | dated night finding |
| MORNING.md:286 | scripts/check-ending-frame.mjs:296 | HISTORICAL | sabotage line; delivery now `:322`/`:337` |
| MORNING.md:286 | scripts/finish-band-truth.mjs:324 | HISTORICAL | delivery now `:337`/`:347` |
| MORNING.md:342 | scripts/phys-bench.mjs:70 | CORRECT | `WARMUP … "300"` |
| MORNING.md:415 | docs/BACKLOG.md:2421 | HISTORICAL | luger-hill sentence now `BACKLOG.md:4365` |
| MORNING.md:415 | docs/FAIRNESS.md:156 | HISTORICAL | now `FAIRNESS.md:158` |
| MORNING.md:424 | reports/evolution/ROW-BONUS-TIMING-1.md:117 | CORRECT | 58.211 / 57.924 |
| MORNING.md:425 | reports/evolution/ROW-ADVANTAGE-1.md:24 | CORRECT | quote present |
| MORNING.md:426 | LUGER-BIAS-1.md:34 | FILE-MISSING | no `LUGER-BIAS-1.md` anywhere under reports/ (only named in `reports/night/INDEX.md:301` and `D25-SIGN-1.md`) |
| MORNING.md:427 | PINNED-GATE-1.md:230 | FILE-MISSING | no `PINNED-GATE-1.md` in the tree (same two mentions only) |
| MORNING.md:477 | docs/FORCE-MAP.md:459 | CORRECT | A7 row |
| MORNING.md:477 | racePlanner.js:87 | CORRECT | `corridorEnd: 1.0` |
| MORNING.md:478 | docs/FORCE-MAP.md:465 | CORRECT | A13 row |
| MORNING.md:478 | storage/defaults.js:1070 | HISTORICAL | "`pulkEnd` IS `choreoOutcomeStart`" now `:1096`/`:1223` |
| MORNING.md:478 | defaults.js:1125 | HISTORICAL | as above |
| MORNING.md:479 | racePlanner.js:1594 | HISTORICAL | corrected comment now `:388-395` |
| MORNING.md:479 | racePlanner.js:389-390 (helper said defaults.js) | CORRECT | "`defaults.js` now carries `gapRerollEnabled: true`" |
| MORNING.md:480 | raceCore.js:372 | CORRECT | PulkLeadRotation header |
| MORNING.md:480 | raceCore.js:376 | CORRECT | |
| MORNING.md:480 | defaults.js:1017 | HISTORICAL | "SHIPPED ON" header now `:1070` |
| MORNING.md:481 | raceCore.js:598 | CORRECT | `racePlanController.update` |
| MORNING.md:482 | scripts/check-runin-frame.mjs:161 | HISTORICAL | the corrected comment |
| MORNING.md:484 | raceCore.js:700 | HISTORICAL | `vt` now `:721-731` |
| MORNING.md:485 | raceStep.js:131 | CORRECT | governorMult |
| MORNING.md:485 | raceStep.js:106 | CORRECT | chain doc |
| MORNING.md:493 | racePlanner.js:1235 | HISTORICAL | "stale brief address" record |
| MORNING.md:493 | raceCore.js:578 | HISTORICAL | same |
| MORNING.md:494 | raceCore.js:679-683 | HISTORICAL | same |
| MORNING.md:494 | racePlanner.js:1594 | HISTORICAL | now `:388-395` |
| MORNING.md:494 | raceCore.js:598 | CORRECT | |
| MORNING.md:494 | raceCore.js:700-704 | HISTORICAL | now `:721-731` |
| MORNING.md:678 | racePlanner.js:103 | CORRECT | `minMult: 0.85` |
| MORNING.md:680 | racePlanner.js:1423 | HISTORICAL | the clamp now `:1447` |
| MORNING.md:686 | defaults.js:1186-1191 | HISTORICAL | lines are now b2Attack keys; brake-authority argument near `gapBrakeMaxAuthority` `:1310` |
| NIGHT-RUN.md:216 | e2e/garden-path-finishes.spec.js:31 | HISTORICAL | dated; that test deleted 2026-09-03 |
| OPEN.md:165 | camera/comebackDetector.js:239 | WRONG | "the `resolve` beat IS read" — `:239` is a blank comment line; the read is `:250-252` |
| OPEN.md:201 | routes/tracks.js:542 | HISTORICAL | struck DONE row; `isDefault: existing.isDefault` now `:550` |
| OPEN.md:238 | docs/BACKLOG.md:1743 | WRONG | pointer to "Phase V" — `:1743` is a look-before-brake line; Phase V is `BACKLOG.md:5546` (V-6..V-9 verdict `:1480`) |
| OPEN.md:250 | docs/TAGS.md:622 | WRONG | `archive/front-group` — now `TAGS.md:646` |
| OPEN.md:337 | docs/DEPLOYMENT.md:82 | WRONG | "`openssl` is named at `:82`" — now `:163` |
| OPEN.md:338 | scripts/verify.mjs:257 | CORRECT | `GATE_GUARD` |
| OPEN.md:339 | docs/DEPLOY-NOTES.md:195-200 | WRONG | "lists FOUR more things" — the NEEDS-HIS-WORD list at `:197-208` has three items (domain, proxy, data dir) |
| OPEN.md:339 | server/src/auth/session.js:23-29 | CORRECT | |
| OPEN.md:339 | docs/DEPLOY-NOTES.md:173-178 | WRONG | "The proxy is deliberately NOT chosen" — `:173-178` is the plain-HTTP cookie paragraph; proxy choice is `:197-202` |
| OPEN.md:339 | server/src/app.js:36 | CORRECT | CSP off |
| OPEN.md:340 | docs/DEPLOY-NOTES.md:173 | CORRECT | Secure-cookie paragraph `:173-176` |
| PHASE-CONTRACT.md:8 | PHASE-CONTRACT.md:95 | WRONG | "this document's own § at `:95`" (sweep predates speed-150) — now `:105` |
| PHASE-CONTRACT.md:36 | racePlanner.js:147-149 | WRONG | two-phase model — now `:160-176` |
| PHASE-CONTRACT.md:37 | racePlanner.js:274 | WRONG | `_choreoEnabled: true` — now `:330` |
| PHASE-CONTRACT.md:40 | racePlanner.js:163-173 | WRONG | monotonic clamp chain — now `:178-201` (`:191-201` the clamps) |
| PHASE-CONTRACT.md:43 | racePlanner.js:357-370 | WRONG | `getPhase` five branches — now `:695-708` |
| PHASE-CONTRACT.md:58 | racePlanner.js:359,365 | WRONG | getPhase pulkStart reads — now `:697`/`:703` |
| PHASE-CONTRACT.md:61 | racePlanner.js:398-414 | WRONG | areaBonus zero for whole field from pulkStartFrac — now `:993-1005` |
| PHASE-CONTRACT.md:62 | racePlanner.js:462 | WRONG | phase-split `inChaos` — now `:1063` |
| PHASE-CONTRACT.md:63 | racePlanner.js:479,500,533 | WRONG | hero cast at `phaseProgress >= pulkStartFrac` — now `:1080`, `:1193` |
| PHASE-CONTRACT.md:64 | racePlanner.js:523 | WRONG | `anchorProgress: pulkStartFrac` — now `:1143` |
| PHASE-CONTRACT.md:65 | raceGovernor.js:186 | WRONG | PULK window start — now `:260` |
| PHASE-CONTRACT.md:81 | racePlanner.js:147-149 | WRONG | the PULK→OUTCOME seam — now `:174-176` |
| PHASE-CONTRACT.md:83 | racePlanner.js:360 | WRONG | getPhase pulkEnd — now `:698` |
| PHASE-CONTRACT.md:83 | racePlanner.js:361 | WRONG | corrStart branch — now `:699` |
| PHASE-CONTRACT.md:85 | racePlanner.js:463 | WRONG | `inPulk` — now `:1064` |
| PHASE-CONTRACT.md:86 | raceGovernor.js:187 | WRONG | `progress < pulkEndFrac` — now `:261` |
| PHASE-CONTRACT.md:88 | racePlanner.js:640 | WRONG | `computePulkBiasedTarget` PULK gate — now `:1595` |
| PHASE-CONTRACT.md:89 | racePlanner.js:699-701 | WRONG | `getPhaseFractions` — now `:1857-1858` (`:699-701` are now getPhase branches) |
| PHASE-CONTRACT.md:124 | racePlanner.js:149 | WRONG | `corridorStart := choreoPulkEnd` — now `:176` |
| PHASE-CONTRACT.md:127 | racePlanner.js:361 | WRONG | `corrStartFrac` in getPhase — now `:699` |
| PHASE-CONTRACT.md:128 | racePlanner.js:480,555 | WRONG | `_preOutcome && !isHero` — now `:991`, `:1268` |
| PHASE-CONTRACT.md:146 | racePlanner.js:135 | WRONG | corridorEnd setter — now `:158` |
| PHASE-CONTRACT.md:146 | racePlanner.js:163-172 | WRONG | clamp ceiling — now `:191-201` |
| PHASE-CONTRACT.md:147 | racePlanner.js:362 | WRONG | `corrEndFrac` — now `:700` |
| PHASE-CONTRACT.md:147 | racePlanner.js:700 | WRONG | `getPhaseFractions` — now `:1857` |
| PHASE-CONTRACT.md:156 | racePlanner.js:398-414 | WRONG | instant areaBonus cut — now `:993-1005` |
| PHASE-CONTRACT.md:160 | racePlanner.js:133 | WRONG | bonusTransitionEnd setter — now `:155-156` |
| PHASE-CONTRACT.md:160 | racePlanner.js:160 | WRONG | corridorStart fallback — now `:188` |
| PHASE-CONTRACT.md:161 | racePlanner.js:222 | WRONG | `transEnd` ms — now `:260` |
| PHASE-CONTRACT.md:161 | racePlanner.js:329 | WRONG | `transEndFrac` — now `:563` |
| PHASE-CONTRACT.md:161 | racePlanner.js:420 | WRONG | areaBonus fade trigger — now `:1021-1043` |
| PHASE-CONTRACT.md:162 | racePlanner.js:398 | WRONG | dead `else` branch — now `~:1000-1043` |
| PHASE-CONTRACT.md:163 | racePlanner.js:700 | WRONG | getPhaseFractions — now `:1857-1858` |
| PHASE-CONTRACT.md:172 | racePlanner.js:284 | WRONG | `_choreoReleaseProgress` — now `:341` |
| PHASE-CONTRACT.md:172 | racePlanner.js:285-291 | WRONG | `_choreoBandResolve[0]` — now `:343-344` |
| PHASE-CONTRACT.md:173 | racePlanner.js:524 | WRONG | `releaseProgress` to generator — now `:1149` |
| PHASE-CONTRACT.md:173 | racePlanner.js:563-566 | WRONG | B1 hero release — now `:1276-1279` |
| PHASE-CONTRACT.md:176 | racePlanner.js:559-573 | WRONG | run-out release — now `:1276-1290` region |
| PHASE-CONTRACT.md:190 | racePlanner.js:500-538 | WRONG | heroes strictness 1.0, pack looser — now `:1372-1378` |
| PHASE-CONTRACT.md:191 | racePlanner.js:576-580 | WRONG | `choreoPackBandStrictness` — now `:1377` |
| SETUP.md:77 | scripts/configure.mjs:145 | CORRECT | refusal `:146-150` (off by one) |
| SETUP.md:83 | configure.mjs:103 | CORRECT | "NEITHER IS EVER PRINTED" |
| SETUP.md:96 | configure.mjs:112 | CORRECT | doc block opening `:112`, rule stated `:115` |
| SETUP.md:100 | docker-compose.yml:27 | WRONG | "`docker-compose.yml:27` records the removal" — `:27` is now the log-rotation comment (added 2026-10-08); the removal note is `:35-38` |
| SHIP-CEREMONY.md:91 | scripts/sim-fairness.mjs:1120 | WRONG | "carries its own `Math.min(285, …)` copy … so the world fingerprint is blind" — the copy is GONE (W-REF-ONE-HOME-1); sim imports `W_REF_MAX` at `:91`, comment `:85-90`. Claim itself stale |
| SHIP-CEREMONY.md:441 | ci.yml:115 | CORRECT | lint |
| SHIP-CEREMONY.md:441 | ci.yml:119 | CORRECT | format:check |
| SHIP-CEREMONY.md:442 | ci.yml:125 | CORRECT | test:coverage |
| SHIP-CEREMONY.md:771 | scripts/viewer-invariants.mjs:814 | WRONG | "runs races six at a time by default" — `JOBS = …"6"` now `:849` |
| SHIP-CEREMONY.md:772 | viewer-invariants.mjs:877 | WRONG | "starts that many workers" — now `:912` |
| TAGS.md:682 | heroCurveGenerator.js:688 | CORRECT | |
| TAGS.md:694 | raceCore.js:717 | CORRECT | comment heading `r.vt` at `:721` |
| TAGS.md:717 | modules/rowLayout.js:119 | CORRECT | open-track `row0Distance` |
| TAGS.md:2027 | racePlanner.js:1434 | CORRECT | |
| VERIFY-RULES.md:752 | scripts/his-shot-truth.mjs:47 | CORRECT | `COMPANY_ONLY` |
| VERIFY-RULES.md:752 | scripts/camera-fingerprint.mjs:120 | HISTORICAL | dated correction 2026-09-02; `COMPANY_ONLY` now `:123` |
| VERIFY-RULES.md:863 | racePlanner.js:165 | WRONG | "`getPhase`'s first occurrence is a comment at `:165`" — now `:169` |
| VERIFY-RULES.md:863 | racePlanner.js:524 | WRONG | "its definition is at `:524`" — now `:695` |
| README.md:199 | camera/projection.js:37-38 | CORRECT | 1280×720 |
| BACKLOG.md:158 | routes/brands.js:314 | HISTORICAL | closed 2026-09-27; `uploadSingleImage` call now `:298` |
| BACKLOG.md:158 | routes/racers.js:281 | HISTORICAL | now `:265` |
| BACKLOG.md:158 | routes/tracks.js:595 | HISTORICAL | now `:600` |
| BACKLOG.md:206 | trackEditorSave.js:73 | CORRECT | |
| BACKLOG.md:208 | docs/TRACK_EDITOR.md:310 | HISTORICAL | dated 2026-09-27; EffectConfig now named at `:312` (and `:266`) |
| BACKLOG.md:208 | docs/ARCHITECTURE.md:173 | CORRECT | |
| BACKLOG.md:247 | defaults.js:1021-1024 | WRONG | gapReroll* keys — now `:1206-1209` ("the line numbers are the address") |
| BACKLOG.md:248 | defaults.js:996-998 | WRONG | b2Attack* — now `:1181-1183` |
| BACKLOG.md:249 | defaults.js:892-894 | WRONG | reRoll* — now `:1032-1034` |
| BACKLOG.md:250 | defaults.js:954-955 | WRONG | choreoIntensity/PackBandStrictness — now `:1132-1133` |
| BACKLOG.md:251 | defaults.js:929-1029 | WRONG | pulk* — now `:1077-1084` and `pulkFrontPool` `:1321` |
| BACKLOG.md:252 | defaults.js:922 | WRONG | chaosSteerGain — now `:1062` |
| BACKLOG.md:437 | RaceScreen/index.jsx:1763/:1765 | HISTORICAL | "re-verified 2026-09-05"; fullscreen now `:1397`/`:1399` |
| BACKLOG.md:440 | comebackDetector.js:64-75 | CORRECT | `setPlan` at `:70` |
| BACKLOG.md:454 | scripts/lib/routing.mjs:97 | CORRECT | `dataReach` import (used `:466`) |
| BACKLOG.md:460 | routing.mjs:224 | WRONG | `client-lint` — now `:226` |
| BACKLOG.md:460 | routing.mjs:239 | WRONG | `client-format-check` — now `:241` |
| BACKLOG.md:725 | server/src/races/raceStore.js:64 | CORRECT | `import Database` |
| BACKLOG.md:725 | raceStore.js:72 | WRONG | `:72` is a `playerNames` import; `new Database(...)` is `:205` |
| BACKLOG.md:727 | routes/races.js:32-35 | CORRECT | team-visibility comment |
| BACKLOG.md:768 | session.js:23-29 | CORRECT | |
| BACKLOG.md:785 | app.js:36 | CORRECT | |
| BACKLOG.md:910 | scripts/exp-gate-retune.mjs:316-317 | CORRECT | |
| BACKLOG.md:968 | heroCurveGenerator.js:166 | HISTORICAL | VERDICT 2026-09-02; `clampIntensityToBudget` now `:239` |
| BACKLOG.md:968 | heroCurveGenerator.js:533 | HISTORICAL | single `realizedIntensity` now `:808` |
| BACKLOG.md:1241 | docs/OPEN.md:164 | WRONG | "recorded at `docs/OPEN.md:164`" (racer-types move) — now `OPEN.md:205` |
| BACKLOG.md:1355 | storage/trackLoader.js:53 | CORRECT | background URL |
| BACKLOG.md:1455 | SetupScreen.jsx:190 | HISTORICAL | VERDICT 2026-09-02; `selectedGeometryReady` now `:278` |
| BACKLOG.md:1455 | SetupScreen.jsx:192 | HISTORICAL | gate now `canStartBase` `:280` |
| BACKLOG.md:1624 | raceBehavior.js:258 | HISTORICAL | VERDICT; `getTrackWidthAtTpx` now `:264` |
| BACKLOG.md:1730 | sim-fairness.mjs:1101 | HISTORICAL | VERDICT; `runoutZone:` now `:1114` |
| BACKLOG.md:1822 | routes/races.js:275 | HISTORICAL | "row as it stood"; now asyncRoute, rethrow `:278` |
| BACKLOG.md:1826 | raceStore.js:500 | HISTORICAL | "row as it stood"; `getRaceByClientId` now `:514` |
| BACKLOG.md:1868 | scripts/verify.mjs:650 | CORRECT | `scriptTestFiles` |
| BACKLOG.md:1876 | camera/framingRule.js:207 | HISTORICAL | struck/closed item |
| BACKLOG.md:1881 | server/Dockerfile:22 | HISTORICAL | struck/closed |
| BACKLOG.md:1904 | autoSpriteScale.js:23 | CORRECT | |
| BACKLOG.md:1904 | racer-types/index.js:239 | CORRECT | |
| BACKLOG.md:1908 | scripts/label-bench-matrix.mjs:55 | CORRECT | target check |
| BACKLOG.md:1908 | scripts/phys-bench-matrix.mjs:90 | CORRECT | |
| BACKLOG.md:1930 | RaceScreen/RaceScreen.css:476 | CORRECT | 640px |
| BACKLOG.md:1930 | ResultScreen/ResultScreen.css:494 | CORRECT | 768px |
| BACKLOG.md:1931 | RacerEditor/RacerEditor.module.css:49 | CORRECT | 900px |
| BACKLOG.md:1932 | camera/projection.js:37-38 | CORRECT | |
| BACKLOG.md:2062 | scripts/camera-fingerprint.mjs:77 | CORRECT | |
| BACKLOG.md:2062 | camera-fingerprint.mjs:131 | CORRECT | |
| BACKLOG.md:2162 | docker-compose.yml:17-18 | CORRECT | |
| BACKLOG.md:2184 | server/src/auth/recoverAdmin.js:23-27 | CORRECT | append-only audit line |
| BACKLOG.md:2185 | auth/usersStore.js:258 | CORRECT | `createdBy` |
| BACKLOG.md:2187 | auth/guards.js:123-127 | WRONG | "deleting a user leaves sessions until next request" — `:123-127` is end of `requiredRole`; the deleted-user check is `:149-153` |
| BACKLOG.md:2196 | raceStore.js:164,358,465 | HISTORICAL | "row as it stood"; now `:166,376,483` |
| BACKLOG.md:2280 | routes/races.js:62 | WRONG | "POST at `:62`" — now `:101` |
| BACKLOG.md:2280 | routes/races.js:121 | WRONG | "a paged GET at `:121`" — now `:164` |
| BACKLOG.md:2281 | routes/races.js:140 | WRONG | "GET by short key at `:140`" — now `:228` |
| BACKLOG.md:2283 | routes/races.js:127 | WRONG | team scoping of the list — now `:177` |
| BACKLOG.md:2283 | routes/races.js:142 | WRONG | team-scoped short-key lookup — now `:230` |
| BACKLOG.md:2286 | raceStore.js:162 | WRONG | `CREATE INDEX races_by_team` — now `:182` |
| BACKLOG.md:2288 | raceStore.js:158-162 / :158-159 | WRONG | "`results` and `winners` columns at :158-159" — now `:174-175` |
| BACKLOG.md:2289 | raceStore.js:162 | WRONG | "the index is the single line `:162`" — now `:182` |
| BACKLOG.md:2392 | services/authApi.js:12,16 | CORRECT | base + `getMe` `:14-16` |
| BACKLOG.md:2398 | components/ProtectedRoute.test.jsx:170 (helper said authApi.js) | CORRECT | "user is null in offline-hint" |
| BACKLOG.md:2399 | ProtectedRoute.test.jsx:152 | CORRECT | `/dev` equivalent → `/login` |
| BACKLOG.md:2444 | racePlanner.js:1276-1279 | CORRECT | `released = isHero && … _choreoReleaseProgress` |
| BACKLOG.md:2621 | camera/CameraDirector.js:1816-1821 | CORRECT | comeback branch (cooldown `:1817`) |
| BACKLOG.md:2622 | CameraDirector.js:1840 | HISTORICAL | dated correction 2026-09-27; `_weightedRandomPick` call now `:1903` |
| BACKLOG.md:2622 | CameraDirector.js:1844 | HISTORICAL | `_acceptsOffer` call now `:1904` |
| BACKLOG.md:2625 | camera/cameraSeed.js:72-78 | CORRECT | `cameraSeedForRace` |
| BACKLOG.md:2626 | RaceScreen/index.jsx:691 | HISTORICAL | call moved to `RaceScreen/raceCamera.js:82` |
| BACKLOG.md:2626 | RaceScreen/index.jsx:701 | HISTORICAL | `setRandomSeed` now `raceCamera.js:92` |
| BACKLOG.md:2829 | scripts/lib/raceDriver.mjs:627-635 | CORRECT | truncated race throws |
| BACKLOG.md:2844 | raceDriver.mjs:414 | HISTORICAL | VERDICT; the row's own later re-check (`:2864`) says now `:491` |
| BACKLOG.md:2844 | scripts/raceDriver.test.mjs:157 | CORRECT | |
| BACKLOG.md:2864 | raceDriver.mjs:491 | CORRECT | `export function runRace` |
| BACKLOG.md:2875 | scripts/viewer-invariants.mjs:313-331 | CORRECT | scope + backstop (`resolveTrackScope` `:312`, backstop `:318`) |
| BACKLOG.md:2875 | viewer-invariants.mjs:353-362 | HISTORICAL | VERDICT 2026-09-25; now the real-clock arm comment |
| BACKLOG.md:2883 | scripts/company-spread-sweep.mjs:160 | HISTORICAL | VERDICT; it now uses `resolveTrackScope` (`:155`) |
| BACKLOG.md:2884 | scripts/zoom-rate-truth.mjs:174 | CORRECT | throw at `:173` |
| BACKLOG.md:2887 | scripts/diag/aim-levers.mjs:78 | CORRECT | `Map.get` at `:79` |
| BACKLOG.md:2887 | scripts/diag/binding-census.mjs:10 | CORRECT | |
| BACKLOG.md:2905 | routes/races.js:69 | WRONG | "races stay scoped per team exactly as built (`races.js:69`, `:91`)" — `:69` is `readInstallTracks`; scoping is `:177`/`:230` |
| BACKLOG.md:2905 | routes/races.js:91 | WRONG | `:91` is `express.Router()` — see above |
| BACKLOG.md:2914 | routes/races.js:127/:142 | HISTORICAL | "row as it stood"; now `:177`/`:230` |
| BACKLOG.md:2971 | server/src/auth/teams.js:9-12 | CORRECT | |
| BACKLOG.md:2976 | auth/routePolicyDrift.test.js:133-148 | CORRECT | |
| BACKLOG.md:3010 | scripts/backup.mjs:186 | HISTORICAL | "row as it stood"; inside-root refusal now `:236` |
| BACKLOG.md:3011 | backup.mjs:320 | HISTORICAL | `--out` required now `:377` |
| BACKLOG.md:3012 | docker-compose.yml:48-55 | HISTORICAL | volumes now `:56-67` |
| BACKLOG.md:3203 | TrackEditor/useTrackIO.js:130 | HISTORICAL | closed 2026-09-24; `setIsDirty(false)` now `:163` |
| BACKLOG.md:3212 | routes/tracks.js:542 | HISTORICAL | closed 2026-09-24; now `:550` |
| BACKLOG.md:3411 | heroCurveGenerator.js:789-791 | CORRECT | beat kinds |
| BACKLOG.md:3415 | comebackDetector.js:110-117 | CORRECT | |
| BACKLOG.md:3416 | comebackDetector.js:117 | CORRECT | |
| BACKLOG.md:3416 | comebackDetector.js:239 | HISTORICAL | "checked 2026-09-25"; read now `:250-252` |
| BACKLOG.md:3419 | comebackDetector.js:238 | HISTORICAL | gate `g.useBeats` now `:250` |
| BACKLOG.md:3419 | CameraDirector.js:668 | HISTORICAL | `useBeats: !!t.comebackUseBeats` now `:677` |
| BACKLOG.md:3420 | defaults.js:398 | HISTORICAL | `comebackUseBeats: false` now `:439` |
| BACKLOG.md:3425 | comebackDetector.js:112 | CORRECT | |
| BACKLOG.md:3464 | raceCore.js:214 | CORRECT | `bodyFillLong` |
| BACKLOG.md:3524 | .github/workflows/deploy.yml.disabled:41 (helper said viewerProbe.js) | CORRECT | "Deployment today is MANUAL" |
| BACKLOG.md:3549 | auth/usersRouter.js:27-46 | CORRECT | |
| BACKLOG.md:3562 | client/index.html:12 | CORRECT | viewport meta |
| BACKLOG.md:3582 | DevScreen/sections/RaceHistory.jsx:42 (helper said index.html) | HISTORICAL | closed 2026-09-25; import now `:50` |
| BACKLOG.md:3582 | RaceHistory.jsx:119 | HISTORICAL | call now `:182` |
| BACKLOG.md:3593 | routes/races.js:20-25 | CORRECT | |
| BACKLOG.md:3606 | raceDriver.mjs:207-213 | CORRECT | `raceHash` |
| BACKLOG.md:3610 | docs/VERIFY-RULES.md:754-755 | WRONG | "the identity line carries a `race=` hash" — that sentence is `:756` |
| BACKLOG.md:3635 | defaults.js:649-658 | HISTORICAL | closed 2026-09-25; contentionWatch reason now `:702-705` |
| BACKLOG.md:3636 | defaults.js:659 | HISTORICAL | `contentionWatch: true` now `:706` |
| BACKLOG.md:3645 | raceDriver.mjs:416 | CORRECT | |
| BACKLOG.md:3646 | raceDriver.mjs:299-310 | CORRECT | `lapsOfClosedTrack` |
| BACKLOG.md:3677 | modules/raceHistory.js:100-106 | HISTORICAL | closed 2026-09-25; "every input raceIdentifier encodes" now `:111-124` |
| BACKLOG.md:3716 | .github/workflows/browser-gate.yml:177 | HISTORICAL | closed 2026-09-25; consumer `test:e2e:prod:fast` now `:185` |
| BACKLOG.md:3727 | verify.mjs:257 | CORRECT | |
| BACKLOG.md:3943 | docs/DEPLOYMENT.md:82 | HISTORICAL | closed row; openssl now `:163` |
| BACKLOG.md:3954 | .github/workflows/audit-schedule.yml:18 | CORRECT | |
| BACKLOG.md:4208 | comebackDetector.js:112 | CORRECT | |
| BACKLOG.md:4211 | defaults.js:398 | HISTORICAL | answered 2026-09-25; now `:439` |
| BACKLOG.md:4571 | racePlanner.js:728 | HISTORICAL | dated closure; "Retain the authored ROLE" now `:1173` |
| BACKLOG.md:4574 | comebackDetector.js:64 | HISTORICAL | `setPlan` now `:70`, role read `:110` |
| BACKLOG.md:4597 | CameraDirector.js:1663 | HISTORICAL | "established 2026-09-05"; `:1663` now `battleCooledDown` |
| BACKLOG.md:4792 | RaceScreen/index.jsx:175 | HISTORICAL | verbatim 2026-08-22 entry; `useState(null)` now `:198` |
| BACKLOG.md:4793 | index.jsx:381-389 | CORRECT | `sessionStorage.getItem('activeRace')` `:383` |
| BACKLOG.md:4796 | index.jsx:393 | CORRECT | |
| BACKLOG.md:4796 | index.jsx:416 | CORRECT | `getTrack(...)` |
| BACKLOG.md:4798 | index.jsx:1684/:1687 | HISTORICAL | rAF now `:1370`/`:1373` |
| BACKLOG.md:4867 | reports/night/BREAKAWAY-GROWTH-1.md:457 | CORRECT | |
| BACKLOG.md:4870 | docs/LESSONS.md:3641 | CORRECT | |
| BACKLOG.md:4872 | client/vite-plugin-ra-build.js:177 | CORRECT | `makeMtimePoll` |
| BACKLOG.md:4873 | vite-plugin-ra-build.js:331-333 | HISTORICAL | dated; later verdict in same row says watcher no longer spawns (comment at `:331` says so) |
| BACKLOG.md:4904 | vite-plugin-ra-build.js:79 | CORRECT | `execSync` |
| BACKLOG.md:4920 | vite-plugin-ra-build.js:124/127/135 | CORRECT | three git calls |
| BACKLOG.md:4980 | scripts/check-index.mjs:11-12 | CORRECT | |
| BACKLOG.md:5024 | raceStore.js:211 | CORRECT | immutability triggers |
| BACKLOG.md:5034 | routes/tracks.js:253 (+:525,:553,:589,:631) | HISTORICAL | closed row; `writeTrackBackup` now `:256`, called `:530,:558,:594,:636` |
| BACKLOG.md:5069 | routes/races.js:268 | HISTORICAL | closed; replay now off-main-thread (`verifyOffMainThread` `:265`) |
| BACKLOG.md:5089 | raceStore.js:574-582 | HISTORICAL | closed; `listRacesInPeriod` renamed `raceResultsInPeriod` `:583` |
| BACKLOG.md:5113 | ci.yml:212 | HISTORICAL | "confirmed 2026-08-23"; `--tree=server` now `:222` |
| BACKLOG.md:5139 | RaceScreen/renderRaceFrame.js:500 | WRONG | "the build PILL … `renderRaceFrame.js:500` calls `formatBuildLabel(buildBadge)`" — `:500` is the race-plan pill; build pill is `:538-542` (`formatBuildLabel` `:541`) |
| BACKLOG.md:6386 | verify.mjs:310-337 | HISTORICAL | VERDICT 2026-09-02 |
| BACKLOG.md:6386 | .github/workflows/ci.yml:184-193 | CORRECT | GATE-SERIAL-BCRYPT-1 comment `:186-193` |
| BACKLOG.md:6514 | server/src/app.js:59 | CORRECT | `/api/health` |

#### Totals

| verdict | count |
|---|---|
| CORRECT | 147 |
| WRONG | 127 |
| HISTORICAL | 90 |
| FILE-MISSING | 2 |
| **total checked** | **366** |

| doc | checked | CORRECT | WRONG | HISTORICAL | FILE-MISSING |
|---|---|---|---|---|---|
| ARCHITECTURE.md | 9 | 4 | 5 | 0 | 0 |
| AUDIT.md | 3 | 0 | 0 | 3 | 0 |
| branding.md | 11 | 8 | 2 | 1 | 0 |
| CAMERA_DIRECTOR.md | 2 | 1 | 0 | 1 | 0 |
| CONCEPT-COHESION.md | 16 | 0 | 16 | 0 | 0 |
| DEAD-ENDS.md | 4 | 4 | 0 | 0 | 0 |
| DEPLOY-NOTES.md | 17 | 10 | 5 | 2 | 0 |
| DEPLOYMENT.md | 9 | 4 | 5 | 0 | 0 |
| DEVSCREEN-INVENTORY.md | 3 | 1 | 2 | 0 | 0 |
| ENDING-PHASES.md | 3 | 2 | 1 | 0 | 0 |
| FORCE-MAP.md | 36 | 14 | 16 | 6 | 0 |
| GLOSSARY.md | 3 | 3 | 0 | 0 | 0 |
| LESSONS.md | 2 | 0 | 0 | 2 | 0 |
| MORNING.md | 36 | 14 | 0 | 20 | 2 |
| NIGHT-RUN.md | 1 | 0 | 0 | 1 | 0 |
| OPEN.md | 11 | 4 | 6 | 1 | 0 |
| PHASE-CONTRACT.md | 40 | 0 | 40 | 0 | 0 |
| SETUP.md | 4 | 3 | 1 | 0 | 0 |
| SHIP-CEREMONY.md | 6 | 3 | 3 | 0 | 0 |
| TAGS.md | 4 | 4 | 0 | 0 | 0 |
| VERIFY-RULES.md | 4 | 1 | 2 | 1 | 0 |
| README.md | 1 | 1 | 0 | 0 | 0 |
| BACKLOG.md | 141 | 66 | 23 | 52 | 0 |

#### Summary

**Where the rot is concentrated (WRONG = 127):**

- **PHASE-CONTRACT.md — 40 of 40 wrong.** Every `racePlanner.js:N` and `raceGovernor.js:N` address
  is from the 2026-07-14 inventory; racePlanner.js has since grown by ~300 lines in the controller
  (getPhase `:357-370` → `:695-708`; getPhaseFractions → `:1857`; `_choreoEnabled` → `:330`;
  `_preOutcome && !isHero` → `:991`/`:1268`; raceGovernor PULK window `:186-187` → `:260-261`). Its
  own header (line 5) dates its VALUES to 2026-07-14 but presents the "who reads it" addresses as
  current. Also the self-reference `:95` → `:105`.
- **CONCEPT-COHESION.md — 16 of 16 wrong.** Design-era (2026-07) addresses into `index.jsx`,
  `sim-fairness.mjs` and `racePlanner.js`; two describe mechanisms that are gone (sim
  `Math.random = makePRNG(seed)`; a governor `mulberry32` stream at `raceGovernor.js:82`).
- **FORCE-MAP.md — 16 wrong in LIVE sections** (raceBehavior.js moved wholesale: `inBrakeMatchZone`
  `:521` → `:893`, soft repulsion → `:1163-1165`, damping → `:1158`, drafting-cone note → `:1286`;
  `raceStep.js:83` → `:131`; A6/A7/A8/A13 table addresses; `defaults.js:442` → `:1479`). Six more sit
  in sections marked REMOVED and cite code that no longer exists (HISTORICAL).
- **BACKLOG.md — 23 wrong in present-tense text:** the action-dial candidate table (`:247-252`,
  six `defaults.js` ranges, all now ~+185 lines, in a table that says "the line numbers are the
  address"); `races.js`/`raceStore.js` addresses at `:2280-2289` and `:2905` (POST `:101`, GET
  `:164`, short key `:228`, team scoping `:177`/`:230`, index `:182`, columns `:174-175`);
  `guards.js:123-127` → `:149-153`; `routing.mjs:224/:239` → `:226/:241`; `raceStore.js:72` →
  `:205`; `OPEN.md:164` → `:205`; `VERIFY-RULES.md:754-755` → `:756`; `renderRaceFrame.js:500`
  (build pill) → `:538-542`.
- **Claims that are stale, not just mis-addressed** (worth fixing first):
  - DEPLOY-NOTES.md:80 — quotes `api.js` code (`VITE_API_URL ?? 'http://localhost:4000'`) that
    no longer exists; the runtime resolution (D30) is built (`api.js:99`).
  - SHIP-CEREMONY.md:91 — says `sim-fairness.mjs:1120` still carries a `Math.min(285, …)` copy that
    blinds the world fingerprint; it was removed (sim imports `W_REF_MAX`, `:91`).
  - DEVSCREEN-INVENTORY.md:1183/1191 — `DynamicsTuningSection.resetAll()` and
    `resetAutoScaleToDefault()` no longer exist; the master reset is `resetRaceRelevantToDefault`
    (`raceRelevantReset.js:40-49`) and parts re-sync at once.
  - DEPLOY-NOTES.md:241 — quotes *"if sitting behind nginx/Caddy"* from `DEPLOYMENT.md:242`; the
    phrase is gone (proxy guidance now `:227` and `:452`).
  - DEPLOY-NOTES.md:159 — `index.js:16` "is `app.listen`" → now `listenOn(...)` at `:59`.
  - OPEN.md:339 — "DEPLOY-NOTES.md:195-200 lists FOUR more things": the list there has three.
  - BACKLOG.md:2276-2291 also says "there is no evaluation code on the server" — false since
    PERIOD-EVALUATION-1 (`races.js:188-208`).
- **Other WRONG, single addresses:** ARCHITECTURE.md:173 (`EffectConfig.jsx:11,34,124` →
  `:19,42,160`), :319 (`pxToPhysicalY` → `:255`), :1231 (→ `racePlanner.js:993-1005`);
  branding.md:50 (`newId` → `:159`), :69 (quota warning → `storage.js:96-98`); DEPLOYMENT.md:98/99
  (`tracks.js:457`→`:462`, `playerGroups.js:100`→`:106`), :102 (team scoping → `races.js:164-181`),
  :520 (`Dockerfile:32/:42` → `:70/:87`); DEPLOY-NOTES.md:172 (`authRouter.js:199`→`:204`), :299
  (tar checksum → `backup.mjs:187/194`); ENDING-PHASES.md:410 (`:198`→`:336`); OPEN.md:165
  (`comebackDetector.js:239`→`:250-252`), :238 (Phase V → `BACKLOG.md:5546`), :250 (`TAGS.md:622`→
  `:646`), :337 (openssl `:82`→`:163`), :339 (proxy choice is `DEPLOY-NOTES.md:197-202`, not
  `:173-178`); SETUP.md:100 (`docker-compose.yml:27` → `:35-38`, shifted by today's log-rotation
  block); SHIP-CEREMONY.md:771-772 (`viewer-invariants.mjs:814/:877` → `:849/:912`);
  VERIFY-RULES.md:863 (getPhase comment `:165`→`:169`, definition `:524`→`:695`).

**FILE-MISSING (2):** MORNING.md:426 `LUGER-BIAS-1.md:34` and MORNING.md:427
`PINNED-GATE-1.md:230` — neither report exists anywhere in the tree (named only in
`reports/night/INDEX.md:301-302` and `D25-SIGN-1.md`), so INDEX.md also points at absent files.

**Helper mis-resolutions seen:** bare `:N` after a doc path was often attached to the wrong file
(e.g. `:1765` → defaults.js/podium.mjs, `:701` → cameraSeed.js/brands.test.js, `:152/:170` →
authApi.js, `:41` → viewerProbe.js, `:42/:119` → index.html, `:389-390` → defaults.js); every
`defaults.js` hit came back AMBIG between storage/ and surface-effects/. All were re-resolved by hand
above. `EffectConfig.jsx`, `TrackEditorToolbar.jsx` and `DynamicsTuningSection.jsx` citations were
not resolved by the helper at all (ARCHITECTURE:173's `:34`/`:124` were mapped to cameraConfig.js).

## 4. False positives rejected

- **Links/anchors:** the checker found 0 broken among 896 relative links and 139 anchors, so there was nothing to reject; a spot check confirmed it resolves `../reports/…`, `../client/src/…#L…` (file part only) and duplicate-heading slugs.
- **Helper "BEYOND-EOF" at API.md:468-471** — the bare `:N` there belong to `server/src/routes/surfaceClasses.js`, not `server/utils/isValidId.js` (the helper's guess); all correct in the right file. **API.md:995 `:277`** — means `races.js:277` (the 422), correct; the shorthand is ambiguous only because `verifyReplay.worker.js` is named two lines earlier.
- **TAGS.md:1888, 1891** `pre/greenfield-proto`, `pre/carousel-sweep` — branch names under "## Branches", not tag registrations; TAGS.md:13-14 says exactly this.
- **TAGS.md retired list** — 14 names that are also live tags were not mis-recorded on 2026-07-14; they were reused later (A3-32 is about the count and the missing note, not about a wrong retirement).
- **Unknown identifiers in FORCE-MAP.md:259-344** (`homeForceStrength`, `gapForceCap`, `stuckModeSuppress`, `overlapEscapeStrength` …) — every one sits under a heading marked **REMOVED (Commit A/B)**; the header (:36-42) declares them a historical record.
- **ARCHITECTURE.md:209-214, 300-313, 407-411** (`computeOpenTrackCameraZoomFactor`, the `honestBody*` rename map, `expectedMinSpreadFactor`) — "What was eliminated", "Naming map (old → new)", "Deleted at this ship": historical by construction.
- **TRACK_LIFECYCLE.md:201-207** `fallbackMode` — inside "TLH-3 … ⏳ deferred", a plan, not a claim of current behaviour (ARCHITECTURE.md:1033 states it does not exist, consistently).
- **SIM.md:428, 515, 543, 844** `racePlanSuccessRate` — a metric name in the simulator's report vocabulary; not a Dev Screen control or config key.
- **Winners mentions that are history:** BACKLOG.md:258-265, 1192, 1458-1462, 3913-3920, 5724, 6084; CAMERA_DIRECTOR.md:1068; ENDING-PHASES.md:54; OPEN.md:6 — all dated and say removed/superseded. **API.md:886, 896** (`winners` array in the stored race body) — the stored race still carries its podium (`client/src/modules/raceHistory.js:108`), not the removed setting.
- **DEVSCREEN-INVENTORY mechanical key check** reported 0 missing keys — a false NEGATIVE for `winners`, because the word also occurs in `RaceHistory.jsx` (a table column). Caught by reading (A3-12).
- **Language:** `pulk`/`Pulk*` is a defined project term (GLOSSARY.md:30) and an identifier namespace; `soll`/`Bereich` are excluded column identifiers by the guard's own documented rule; German in the 11 GRANDFATHERED files is the closed inventory.
- **README facts that checked out:** `client/src/modules/camera/projection.js:37-38` (1280×720 reference canvas); "39 of the 40 top-level documents" carry an **Owns** line (all 38 `docs/*.md` + README do); "CI runs three jobs: client, server and docs" (`.github/workflows/ci.yml:74, 152, 234`); "BACKLOG.md PART ONE, *Phases 5–7*" exists (BACKLOG.md:710); `npm run configure`/`backup`/`verify` exist in the root `package.json`; `engines.node ">=20"` in all three `package.json`; 10 seeded tracks (`server/seeds/tracks/`) and 20 racer types (one module each under `client/src/racer-types/`).
- **API.md header "all 65 routes"** — recounted: 55 `router.<verb>(` calls in the ten mounted routers + 9 promote/export sub-routes + `GET /api/health` = 65, and the numbered table matches one for one.
- **AUTH.md** — no `file:line` citations; its 12 file references (`restampSession.js`, `routePolicyDrift.test.js`, `setupContract.test.js`, `recover-admin.mjs`, …) all exist.
- **VPS-INSTALL.md** — no `file:line` citations; its operational numbers match the branch's files: 14 days kept (`deploy/racearena:31`, `install.sh:357`), logs 10 MB × 5 (`deploy/docker-compose.prod.yml:30-31`), health timeout 120 s (`deploy/racearena:32`), status every 10 min (`racearena-status.timer:7`). No German in `deploy/`.

## 5. Totals

**Links/anchors:** 896 relative links and 139 anchors checked in 40 living documents — **0 broken**.

**Citations checked: 917 distinct** (926 rows; DEPLOYMENT.md's 9 were judged twice, independently, with identical verdicts).

| set | checked | CORRECT | WRONG | HISTORICAL | FILE-MISSING |
|---|---|---|---|---|---|
| docs/API.md (every citation) | 551 | 496 | 55 | – | 0 |
| docs/DEPLOYMENT.md (every citation) | 9 | 4 | 5 | – | 0 |
| docs/AUTH.md, docs/VPS-INSTALL.md | 0 (none exist) | – | – | – | – |
| sample, 21 other living docs (incl. every citation in DEPLOY-NOTES, SETUP, VERIFY-RULES, ARCHITECTURE, OPEN, README) | 366 | 147 | 127 | 90 | 2 |
| **total, distinct** | **917** | **643** | **182** | **90** | **2** |

**Removed-feature mentions described as current:** 2 documents (DEVSCREEN-INVENTORY.md, RACER_DATA_MODEL.md); 1 accurate-but-dead field (API.md:351).

**Language:** guard green (0 failures). Outside the allowlist: 2 files with lone German words in test names (A3-15, A3-16, 6 lines) + 1 doc word (LESSONS.md:1447); "Weltall" proper name in 10 lines (LEAVE); `reports/` 1383 candidate lines (out of scope); `deploy/` on the VPS branch clean.

**OPEN vs BACKLOG:** count (1), range (15–1795) and list agree; 3 consistency defects inside OPEN.md (A3-24, A3-25, A3-26).

**Tags:** 136 at origin; 0 unregistered (3 registered only in an unparseable form, A3-30); 0 registered live entries missing at origin; 2 registered with a SHA that is not the tag's (A3-28, A3-29); stale counts (A3-31, A3-32).

**Findings:** 50 — high 0, medium 17, low 22, info 11. Verdicts: SAFE-CLEANUP 39 (A3-43 with an owner half), NEEDS-OWNER 3 (A3-19, A3-22, A3-25), LEAVE 8 (A3-14, A3-17, A3-18, A3-21, A3-23, A3-38, A3-41, A3-49 — A3-14 and A3-49 with an optional owner decision).
