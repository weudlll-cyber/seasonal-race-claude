# BACKLOG-TRUTH-2 — every open row, four questions, at the tree

**2026-09-25.** `docs/BACKLOG.md` PART ONE held **32** open rows, written over months, describing the
tree as it was then. Two were spotted as stale within a minute of being shown to the owner. This is
all 32, each asked the same four questions — does the thing still exist, was it closed another way,
does it still reproduce, and what remains exactly — with a file and line or a command and its output
behind every verdict.

**Nothing here was fixed and no row was deleted.** Establishing truth and repairing are separate
work.

## The table — what FELL AWAY first

| subject | verdict | evidence | what closed it |
|---|---|---|---|
| A throwaway worktree is never removed at creation's end | **MOOT** | its own verify run today: `worktree add` has **no callers under `scripts/`** — only docs, reports and one client test. `ls .git/worktrees` → **0**, against the **3** its 2026-09-02 verdict recorded | nothing in the tooling creates a worktree, so there is no caller to give a `finally`. `scripts/worktree-stubs.mjs` (Q-28, 2026-09-24) clears any that appear |
| The harness hardcodes a lap count | **NARROWED** *(lap half DONE)* | `scripts/lib/raceDriver.mjs:416` reads `lapsOfClosedTrack(geo)`; `:299-310` returns the track's own `defaultLaps` and **throws** rather than substituting one | the row's worry — "a track whose `defaultLaps` is 4 is measured at 2" — is now a loud error. The **200 s ceiling** at `:477` remains, and the row now claims only that |
| The canonical silent zero "could return at any time" | **NARROWED** | same as above: the row's stated mechanism ("the harness hardcodes 2 laps and that never moved") no longer holds | a race can still be discarded silently by the 200 s ceiling; kept for that alone |
| A race-identity hash would make comparison mechanical | **NARROWED** | `hashIdentity` exists — `client/src/modules/parity/raceIdentity.js:109`, used at `scripts/parity/replay.mjs:83` and `soak.mjs:120`; `replay.mjs:151` already prints DRIFTED | but it returns `hashWorld(identity).full` — **identity only, no camera config**, which is the exact insufficiency the row names. `scripts/his-shot-truth.mjs` still exists, so its example stands. The row now claims only the missing half |
| A sweep cell that returns 0 races still prints a number | **STILL OPEN** | `runRace` at `scripts/lib/raceDriver.mjs:491`; exactly one caller reads its return value, `scripts/raceDriver.test.mjs:157` | — figures **grew**: 82 files import the driver (was 56), 71 call sites (was 44) |
| The contention watch can only remove, never admit | **STILL OPEN** | `_updateContentionWatch` at `CameraDirector.js:2758`, called from `:4666`; `.add` at `:2806`; grep for `_contentionOut.delete` returns **0**; the code says so itself at `:296` and `:2737` | — |
| Nothing measures motion, only per-frame values | **STILL OPEN** | `scripts/finish-motion-truth.mjs` present, still one phase; no guard checks pan displacement against a local median | — |
| `0xC0000142` — watch for a second occurrence | **STILL OPEN — ★ its own trigger HAS FIRED** | second occurrence **2026-09-19**, six weeks after the first: `reports/night/BREAKAWAY-GROWTH-1.md:457`, a dev server reporting `build unknown` with `git rev-parse: exit 3221225794`; lesson at `docs/LESSONS.md:3641`. Fix undone — `client/vite-plugin-ra-build.js:79` still shells out to git per check | — the row still reads "one occurrence is an anecdote". Not claimed: that the two share a cause |
| Three driver copies remain, by deliberate choice | **STILL OPEN** | all three present: `camera-fingerprint.mjs`, `render-fingerprint.mjs`, `camera-replay.mjs` | — the row exists so anyone closing it answers the two arguments rather than counting copies; unanswered |
| An owner's PASS is tied to no artefact | **NARROWED** | the cfg fingerprint the row *hoped* existed does: `configFingerprintBadge` at `client/src/screens/RaceScreen/index.jsx:536`, drawn on screen; the camera marker reads config diffs at `client/src/modules/camera/cameraMarker.js:19` | but the `[RA CAMERA LIVE TRUTH]` line (`index.jsx:701-709`) carries commit, branch, grammar, provenance and seed — and **zero** occurrences of it. It still never says which guarantee ran, and a PASS is still recorded nowhere |
| The sprite's bare-box residual on space-sprint | **STILL OPEN** — figure re-measured | its own gate re-run today: `margin-both-axes.mjs --track=space-sprint --seeds=30` → `residual=979 residual0=463 clipped=1175`, 30 races, 42 297 frames | — **463, not the 591 the row states.** Lower, still nowhere near river-run's 0. ALONG-RESIDUAL-1's P1 unstarted |
| `displaySize × bodyFill` is not a world box — a standing warning | **STILL OPEN** *(a caution, not a defect)* | both addresses resolve: `computeBodyNarrowRef` at `client/src/modules/rowLayout.js:251`, `scripts/diag/sprite-premise.mjs` present | — nothing in it to finish; a warning is open only in the sense that it is still followable |
| Three production-arm specs fail | **STILL OPEN** | one day old; still absent from the curated set at `client/package.json:54`, which was widened to ten the same day and deliberately excluded them | — no cause investigated, which is what the row says |
| A seed is not a race identifier — **two rows, MERGED into one** | **SUPERSEDED** | `client/src/modules/raceIdentifier.js` — "one string that repeats a race on another machine" — encodes **the nine inputs**; the durable record stores them (`client/src/modules/raceHistory.js:100-106`, with an `identifierVersion`); the host surface carries it (`SetupScreen/RaceSettings.jsx:33,35`); a real browser holds it (`client/e2e/race-identifier.spec.js`, inside the gate's curated set since 2026-09-25) | RACE-IDENTIFIER-1, built 2026-09-05. ★ **The older row's own verify command still returns nothing** — it tested one *imagined* fix (fields on the ResultScreen record); a different mechanism solved the problem. The two rows were one subject: the first existed only to correct the second's count, which the second had already absorbed |
| No public address, so no HTTPS, so sign-in stops working | **STILL OPEN — needs his word, not work** | `racearena.example.com` appears in exactly two places, neither a running origin: `.github/workflows/deploy.yml.disabled:39` (in a comment listing this blocker) and `docs/DEPLOYMENT.md` ×3 | — the code half is ready: `scripts/configure.mjs` exports `withPublicOrigin`, which writes the real origin into a gitignored override. Missing: a domain, a proxy choice, a `RA_DATA_DIR` decision. **His word plus a purchase** |
| `RA_PUBLIC_ORIGIN` is only a placeholder | **STILL OPEN** | same grep, same two places; nowhere a real origin | — the same subject as the row above, waiting on the same purchase |
| `deploy.yml.disabled` cannot run | **STILL OPEN** by its own verify | run today: `ls .github/workflows/deploy.yml.disabled` **succeeds**, `ls scripts/deploy.sh` **fails** — exactly the condition the row says keeps it open | — kept on purpose as the record of an intent |
| `npm run data:export` carries his data to the VPS | **STILL OPEN** — a measurement, not a task | exists: `package.json:13` → `scripts/data-export.mjs` (the 2026-09-02 verdict says `:11`; the line moved) | — records what must travel; closes when the migration happens, which waits on the address above |
| Race outcomes persisted to DB; season standings server-side | **NARROWED** *(DB half DONE)* | `server/src/races/raceStore.js:64,72` — `better-sqlite3`, `DATA_ROOT/races.sqlite` on its own handle; served by `server/src/routes/races.js` (POST `:62`, paged GET `:121`, GET by key `:140`) | RACE-SAVE-3 / RACE-STORE-2, 2026-09-06. **Standings are not built** — "season" occurs once in the whole store |
| Server-authoritative race finale: signs and persists outcomes | **NARROWED** *(persists yes)* | same store; but sign/signature/hmac across the races route and store returns only prose about a signed-**in** user | — nothing signs, and nothing is authoritative: the server stores the outcome the client sends |
| Multiple organizers: isolated track sets + branding profiles | **NARROWED** *(branding built)* | `server/src/routes/brands.js` — brand CRUD at operator+, logo upload/serve/delete, admin promote/export | — **isolation absent**: `server/src/routes/tracks.js` contains **zero** occurrences of "team" |
| Per-tenant namespace or server-side data isolation | **NARROWED** *(built, for races)* | `server/src/routes/races.js:32-35` — team stamped from the user's DB record per request by `requireAuth`, a `team` in the body **ignored**, a race visible to its author's team and no other | — reaches races only; tracks, brands and player groups are not team-scoped |
| Admin auth hardened for public-facing use | **UNDECIDED** | substantial hardening exists with tests — `server/src/auth/` has `csrf.js`, `guards.js`, `rateLimit.js`, `session.js`, `sessionInvalidation.test.js`, `recoverAdmin.js`, `routePolicyDrift.test.js` | — but the row states **no bar**, and nothing is public, so the tree cannot settle it. **What would:** a written threat model or pre-exposure checklist, and one review against it — about a day, not started |
| Socket.IO event streaming | **STILL OPEN** — unbuilt | `socket.io` in neither `server/package.json` nor `client/package.json` | — |
| Leaderboard screen reading from the server API | **STILL OPEN** — unbuilt | `client/src/screens/` holds Auth, DevScreen, DiagnoseVerteilung, RaceScreen, RacerEditor, ResultScreen, SetupScreen, TrackEditor — no leaderboard | — the API half it would read now exists, so this is a client gap, not a whole feature |
| Season archive + reset | **STILL OPEN** — unbuilt | no season concept on either side | — |
| Stats pages | **STILL OPEN** — unbuilt | no stats screen | — |
| VPS deployment (nginx, HTTPS) | **STILL OPEN** | same subject as the delivery rows — a domain and a proxy choice | — his word plus a purchase, not work in this tree |
| Mobile / tablet responsive tuning | **STILL OPEN** | four CSS files under `client/src` carry `@media`, so it is not wholly fixed-width; the race canvas is a fixed 1280×720 store by design | — no tuning pass for phone or tablet has been done |
| Invite flow for an organizer's roster | **STILL OPEN** — unbuilt | no occurrence of "invite" in `server/src` or `client/src` | — |
| i18n (English + German base) | **STILL OPEN** — unbuilt | no i18n framework present | — ★ recorded as a fact, not a recommendation: `CLAUDE.md`'s language rule requires English everywhere and no German in the codebase, so **the two documents disagree** and building this row as written would breach the other. Which one gives is his call |

---

## 1 · The honest count

**29 rows are genuinely open**, down from 32.

Three left PART ONE: one **MOOT**, one **SUPERSEDED**, and two rows that were one subject **merged
into one**. Of the 29 that remain, **8 are NARROWED** — they were partly done and said so nowhere —
and **1 is UNDECIDED**, meaning the tree cannot settle it and it was not closed to tidy up.

Tally across all 32 as they stood: DONE 0 · SUPERSEDED 1 · MOOT 1 · NARROWED 8 · STILL OPEN 20 ·
UNDECIDED 1.

## 2 · What the 29 are, by area

- **Measurement, guards and tooling — 8.** Harnesses that can return nothing and still print a
  number; a ceiling that can discard a race silently; a camera rule implemented backwards; no
  instrument for motion; a machine fault whose second occurrence nobody noticed; three deliberate
  copies of one driver; and a hash that exists but leaves the config out.
- **Camera and sprite — 4.** A verdict that is tied to no artefact; a residual on one track that
  nothing has moved; a standing warning about sizing; and three browser specs that fail today.
- **Going online — 5.** No domain, no HTTPS, a deploy file that cannot run, a placeholder origin, and
  a measurement of what would have to travel. Four of the five wait on a purchase rather than on work.
- **The planned server arc — 5.** Signing and authority over the finale, live streaming, season
  standings, a leaderboard screen, and season archive. The database beneath them is built.
- **Organizers and tenancy — 4.** Isolated track sets, isolation beyond races, an invite flow, and a
  second language.
- **Public-facing readiness — 3.** Whether the auth is hard enough to expose, stats pages, and a
  phone-and-tablet pass.

## 3 · FOR THE OWNER TO DECIDE — still technically true, no observable effect on what you see

Naming these is not proposing anything. Each is accurate today; none of them changes the game on
screen, and whether a true row is worth carrying is your call.

- **`deploy.yml.disabled` cannot run.** A disabled workflow, kept as the record of an intent. It
  blocks nothing because nothing deploys.
- **`RA_PUBLIC_ORIGIN` is a placeholder.** True, and inert until there is a public address — it is
  the same subject as the row above it.
- **`npm run data:export` and what would have to travel.** A measurement, not a task; it closes when
  a migration happens.
- **Three driver copies remain.** Deliberate, argued, and invisible from outside the tooling.
