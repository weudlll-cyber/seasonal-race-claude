# What is open — verified at the tree, 2026-09-24

**Regenerated 2026-09-24 from master `1b47b5a3` by NIGHT-2026-09-24 (`docs/open-truth-2026-09-24`).**

★★★ **THIS PAGE REPLACES A DERIVED ONE, AND THAT IS THE POINT.** The previous version said of itself:
*"THIS PAGE IS DERIVED AND NEVER AUTHORITATIVE… No item was judged, re-checked or closed to build
this page."* It was generated 2026-08-23 and was a month stale. **Every entry below was
re-established at the tree — a file, a line, a command or a run — or it does not appear.** Nothing
was copied from a list, including from the page this one replaces.

★ **Why it was commissioned.** On 2026-09-05 six items were put to the owner as open and every one
had been done long before. The scoreboard at the foot of this page says how many of the candidates
gathered this time turned out the same way.

---

## 1 · NEEDS ONLY HIS WORD

*A sentence from him and it can proceed. Nothing has to be built or measured first.*

**1 · Which cut counts as "the leading group" — changes of first place, or fights inside the top
five?**
The two measures rank the levers in opposite directions on the open track, so the answer changes
which dial would be built. The observer deliberately refuses to choose.
→ `docs/SIM.md:730` · [RACE-ACTION.md](RACE-ACTION.md)

**2 · A group of TWO at the front — is that a breakaway he objects to?**
He ruled on 2026-09-23 that a group of THREE is acceptable, and on 2026-09-20 that more than four are
not to be braked. **The pair case has never been ruled on and must not be interpolated.**
→ [GLOSSARY.md](GLOSSARY.md) "breakaway"

**3 · The authored beats never reach the camera — hand them through, or leave the detector
inferring?**
His call, and it needs his eye afterwards. Re-verified: no code in `client/src/modules/camera` reads
a hero's beats.
→ [BACKLOG.md](BACKLOG.md) NEEDS HIS WORD · PART TWO decision D14

**4 · ~~The render fingerprint builds its frame camera by hand~~ — ★★ ALREADY DONE, 2026-09-05.**
The repair landed in `d2f10ab2` (RENDER-CAMERA-FIELDS-1) and is in master; all four fingerprints
verify today. ★★★ **He ordered a re-mint for it on 2026-09-23 and there was nothing to re-mint** —
NIGHT-2026-09-24C found the work already done and **minted nothing**, because a fingerprint minted
with no change behind it would falsify the record. **What is left is the GUARD half** — nothing
checks that callers build that object through `frameCameraInputs` — and it is in section 2 below.
→ [BACKLOG.md](BACKLOG.md)

**5 · A race identifier a person can type — short, long, or both?**
The seed field agrees across paths; the ROSTER is what diverges, so some seeds name races the browser
cannot produce.
→ [BACKLOG.md](BACKLOG.md) NEEDS HIS WORD · `reports/evolution/SEED-PARITY-1.md`

**6 · One-command deploy, or keep building the client on the deploy machine?**
A straight trade, already written up rather than taken: a second Dockerfile stage makes the image
self-contained at the cost of a slower image build.
→ `docs/DEPLOY-NOTES.md:63` · `reports/evolution/PUBLISH-STEPS-1.md` step 1

**7 · `VITE_API_URL` for a real deployment — default it to same-origin?**
Proposed and not closed, because closing it as proposed would break his own port-4173 flow.
→ `reports/evolution/PUBLISH-STEPS-1.md` step 3

**8 · The naturalness envelope is guarded on one side only — add a floor, or say so in the
document?**
Nothing shipped goes near the unguarded side, so nothing is broken today. The question is what a
future dial may do.
→ [RACE-ACTION.md](RACE-ACTION.md) §6

**9 · The dev-screen sprite-size concept — override multiplier, mixed mode, or redesign?**
→ [BACKLOG.md](BACKLOG.md) `B-UX4`

**10 · The dev screen has grown past 30 values — how should it be organised?**
His own finding; nobody can spec it without his shape.
→ [BACKLOG.md](BACKLOG.md) `B-UX2`

**11 · The 51.6 MB of track backgrounds — re-spec or drop?**
**Corrected 2026-09-24:** it is **51.6 MB in 10 JPGs** under `server/seeds/backgrounds/`, not "60 MB"
and not PNGs. The old plan names PNGs and there are none.
→ [BACKLOG.md](BACKLOG.md) `Q-27` · measured with `git ls-files` + `stat`

**12 · Surface zones, the full racer editor, click-to-lock-camera, a written reference for every
dev-screen value, one particle system instead of two, and the server/deployment/multi-tenant arc.**
Six real pieces of work with real shapes, none of which anyone should start unasked.
→ [BACKLOG.md](BACKLOG.md) Planned — needs spec, and Phases 5–7

---

## 2 · NEEDS WORK, NO DECISION

*Specified, small, nobody is waiting on anything. Each verified to be still undone.*

| what it is | size | verified how |
| --- | --- | --- |
| ~~Warn instead of silently ignoring an invalid min/max~~ — ★ **DONE 2026-09-24 (Q-26)** | done | `RangeRejectionNotice.jsx`, reusing the Dev Screen's existing amber warning style; 3 tests |
| ~~Give the track editor a hint when a track is saved with no background~~ — ★ **DONE 2026-09-24 (Q-29)** | done | a HINT, styled apart from the error channel |
| ~~Make the server's test cleanup survive a Ctrl+C~~ — ★ **DONE 2026-09-24 (Q-20b)** | done | a SIGINT/SIGTERM handler that does the file half and **re-raises the signal** |
| ~~Sweep `.json.tmp` orphans that survive a OneDrive write failure~~ — ★ **DONE 2026-09-24 (Q-20c)** | done | `server/utils/sweepOrphanTmp.js`, swept at boot before anything is served; 6 tests |
| ~~Keep a draft of the drawn track geometry so a browser crash cannot lose it~~ — ★ **DONE 2026-09-24** (new-track half; the load-mode half is **Q-22b** in BACKLOG PART ONE) | done | `trackEditorDraft.js`, 9 tests |
| ~~Protect "a default track cannot be un-defaulted" with a test~~ — ★ **DONE 2026-09-24 (Q-24)** | done | 2 tests, both directions; **the behaviour was already correct — a test gap, not a defect**. Sabotaging `tracks.js:542` turns both red. |
| ~~Say *which* half failed when a track saves but its background does not~~ — ★ **DONE 2026-09-24 (Q-25)** | done | the upload has its own `try`; the message says the track WAS saved and that Save retries just the image |
| Share one slider component across three dev-screen sections | small | — |
| Add tooltips to the fields that have none | small | **corrected below** |
| Move the racer config folder out of the engine tree | a block | **80 tracked files, not 39** — `git ls-files client/src/modules/racer-types/` |
| Pause and resume a running race | a block | — |
| ★ **A guard that callers build the frame camera through `frameCameraInputs`** rather than by hand | small | the repair shipped 2026-09-05; nothing stops a third hand-written copy |
| ~~A helper that cleans up the `.git/worktrees` stubs~~ — ★ **DONE 2026-09-24 (Q-28)** | done | `scripts/worktree-stubs.mjs`; **all 18 dead stubs removed**. Only ever touches `.git/` — never a checkout, because of the junction hazard. 6 tests |
| ★ **Nothing records which migrations an instance has already applied** | a block | added 2026-09-24 by DELIVERY-BACKUP-1 — see below |

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

**1 · `city-circuit`, quick-test seed 30, on the shipped stage — does a 349 px gap held by three
racers look as bad as it sounds?**
The largest gap in 600 measured races, peaking at progress 0.98 — at the line. **He has now seen this
one and accepted it** (it is what produced the 2026-09-23 refinement), so this row records that the
question was asked and answered; the remaining shortlist below has not been watched.
→ [reports/evolution/CHASE-REMAINDER-1.md](../reports/evolution/CHASE-REMAINDER-1.md) §(C)

**2 · The other nine races on the quiet shortlist, and the ten at wild.**
Track + quick-test seed, ready to type in, each with its pre-chase value beside it.
→ [CHASE-REMAINDER-1.md](../reports/evolution/CHASE-REMAINDER-1.md) §(C)

**3 · Verification sittings for work that already shipped** — loading a saved player list (`V-1`), a
track with missing geometry being refused (`V-2`), backup→restore→reset end to end (`B-5`/`V-5`), dev
panel sections, physics and collisions, storage edge cases, fullscreen (`V-6`–`V-9`), and sprites on
a 6000-px track (`Q-13`). Each is one watching, not a build.
→ [BACKLOG.md](BACKLOG.md) Phase V

**4 · The 0.75 phase from SHIP-THE-NIGHT**, still owed his eye.
→ `reports/night/SHIP-THE-NIGHT.md`

**5 · `archive/front-group` (`87a08af4`)** — the one camera branch of four that is genuinely not in
master. It is preserved as a tag, so nothing is at risk, and it needs his eye before anyone revives
it.
→ `docs/TAGS.md`

---

## 4 · NEEDS MEASURING FIRST

*A run settles it; no decision is involved.*

| what it is | size |
| --- | --- |
| Does the company guarantee hold on a spread-out field? His "5" already stands | a block |
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
| ~~**No browser test runs in CI, dev or production**~~ — ★★ **CLOSED 2026-09-23 (DELIVERY-BROWSER-GATE-1), and NARROWED rather than deleted** | A browser now runs automatically: `.github/workflows/browser-gate.yml` builds the client and runs the PRODUCTION arm's curated fast set on every push to master, daily, and on demand — proven stable first (5 runs on an unchanged tree, 5 of 5 green, 82 tests, no retries) and therefore allowed to BLOCK a pushed commit. **WHAT REMAINS, stated so the closure is not read as wider than it is: the gate covers 7 specs of the full suite, not all of it**; the rest stay night work by R12a. It does not run on `pull_request` or on feature branches, so a browser regression is caught at master rather than before it. | run `35903843784`, attempts 1–5 | **narrowed to: the gate is a subset** |
| **No public address** | `racearena.example.com` is a placeholder in documentation and in `deploy.yml.disabled`; it is nowhere as a real origin. ★ **The previous page listed this as a half-day code task ("one value"). It is not: there is nothing in the repository to replace.** `npm run configure` already writes the real value into a gitignored `docker-compose.override.yml`. What is missing is a domain. | `git grep racearena.example.com`; `scripts/configure.mjs:63` | **his word + a purchase** |
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
