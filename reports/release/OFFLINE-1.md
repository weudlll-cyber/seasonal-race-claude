# OFFLINE-1 — the server drops at the venue: what the viewer sees, and whether anything is lost

**Owns:** the measurement of 2026-10-18 of what the production app does when the connection to its
server drops — on the setup screen, during the countdown, mid-race and at the race end — and what
happens when the server comes back. The rule it checks is not owned here; it is cited below. The
open row it leads to is in [docs/BACKLOG.md](../../docs/BACKLOG.md) PART ONE; the operator's short
version is in [docs/OPERATOR-GUIDE.md](../../docs/OPERATOR-GUIDE.md) §6.

**2026-10-18, branch `test/offline-2026-10-18` from `master` at `2a3a1661`.** No product code
changed; no fingerprint can move (this report, one guide subsection, one backlog row, the derived
OPEN.md).

## Verdict

**No result was lost, no race stopped and nothing crashed, in any of the eight runs.** Every race
reached the result screen with the server gone, was written to this device's race history as
`pending`, and was stored on the server **exactly once** after the server came back and the app made
its next request — **without a reload**. The decision rule's fix branch therefore does not apply.

Three things a viewer or operator would notice are recorded as one open row (findings F1–F3 below).

## The rule being checked

The owner's rule of 2026-09-06, written at the head of the code that holds it:

- `client/src/modules/raceHistory.js:9-14` — the race is written **locally first**, always; the
  server is a second store, never a gatekeeper; if the server is gone the race still runs to the
  end, the result is still kept, and it goes up later.
- `server/src/routes/races.js:20-25` — the route is a **second store, never a gatekeeper**; a
  failure means the client keeps the race pending and sends it again later.
- `client/src/screens/ResultScreen/index.jsx:206-223` — the result screen records the race locally
  first and sends it without awaiting.
- `client/src/modules/pendingRaces.js:9-18` and `client/src/modules/serverStatus.js:10` — there is
  **no polling**: a pending race is sent when some request the app makes anyway succeeds.

`docs/` carries the rule as history only (`docs/BACKLOG.md`, the closed *SERVER-AUTHORITATIVE RACE
FINALE* row, which cites `races.js:20-25`); `docs/ARCHITECTURE.md` and `docs/API.md` do not state it.

## Method

| part | what |
| --- | --- |
| tree | own clone, `master` `2a3a1661`; `npm ci` in root, `server/`, `client/`; `npm run build` in `client/` |
| server | `node src/index.js` in `server/`, as the production arm runs it (`client/playwright.prod.config.js`): `RA_CLIENT_DIST=client/dist` so the server serves the built client and the API on one origin (`server/src/staticClient.js`), `RA_PUBLIC_ORIGIN=http://127.0.0.1:<port>`, `RA_BIND_ADDRESS=127.0.0.1`, ports 4850–4852, a fresh session secret and bootstrap token |
| data | **throwaway only**: `RA_DATA_DIR` under `C:/tmp/n4-scratch` (seeded with `server/seeds/tracks`); a second copy for the parallel arm |
| account | created through `POST /api/auth/setup`, signed in through the real form, test aids switched ON through `PUT /api/settings/test-aids` — the steps of `client/e2e/auth.setup.js` and `client/e2e/testAids.setup.js` |
| browser | Chromium 147.0.7727.15 headless, Playwright 1.59.1, Node v24.20.0, 1280×800 |
| race | **Quick Test**, 2 racers, the default track (City Circuit, closed, 2 laps) — the path `client/e2e/race-save.spec.js` uses. About 110 s of wall clock per race |
| before each drop | the app loaded on `/setup` with the server up, every track geometry cached (the condition `client/e2e/appReady.js` waits for) |
| harness | a scratch script outside the repository (`C:/tmp/n4-scratch/offline.mjs`), one fresh browser context per run |

**Two ways of dropping the server, every case run in both:**

| arm | how | what the browser gets |
| --- | --- | --- |
| **R** | `page.route('**/api/**', r => r.abort('internetdisconnected'))`; the server keeps running | `net::ERR_INTERNET_DISCONNECTED` on every API request — the venue's internet gone, the server elsewhere still up |
| **K** | the server process is **killed**; restarted later on the same data | `net::ERR_CONNECTION_REFUSED` on everything, static files included — the server itself gone |

**The moments:** (a) on `/setup` before Quick Test is clicked; (b) as soon as the countdown badge
shows; (c) 8 s after the countdown badge leaves (mid-race, lap 1); (d) the moment the race writes
`sessionStorage.raceResults` — the frame the last racer crosses, before the result screen records
and sends. **(e) Recovery**, after every case: the server back (route removed, or the process
restarted), 10 s idle on the result screen, then the result screen's own **← Back to Setup**
button (an in-app navigation, no reload), then `GET /api/races` as the same user.

## Per case

Keys are this origin's storage, with the per-track geometry cache left out. "Local" is
`localStorage['racearena:raceHistory']`, newest entry.

| case | arm | on screen after the drop | console (errors, warnings) | race keeps running? | result kept locally | after recovery (e) |
| --- | --- | --- | --- | --- | --- | --- |
| (a) setup | R | setup screen unchanged, **no banner**; Quick Test enabled and starts the race | the track background request fails at race start (`GET /api/tracks/city-circuit/background`), one `[bgImageCache]` warning; at the end one failed `POST /api/races`, `[api]` and `[races] … stays on this device` warnings | **yes** — to the result screen; **drawn with no track background** (F1) | yes: `raceHistory` entry `pending`; `sessionStorage` `activeRace`, `raceResults` | idle 10 s: still `pending`, banner still up; Back to Setup → `sent` within the poll, banner gone; server holds it once |
| (a) setup | K | the same | the same, `ERR_CONNECTION_REFUSED` | **yes**, no track background | yes, `pending` | the same: `sent` after Back to Setup, once on the server |
| (b) countdown | R | countdown continues ("3" badge), track background already loaded, no banner | only the end-of-race `POST /api/races` failure and the two warnings | **yes** | yes, `pending` | the same |
| (b) countdown | K | the same | the same | **yes** | yes, `pending` | the same |
| (c) mid-race | R | race continues, lap counter and standings live, no banner | the same | **yes** | yes, `pending` | the same |
| (c) mid-race | K | the same | the same | **yes** | yes, `pending` | the same |
| (d) last racer crossed | R | the race's ending plays on; the result screen opens with the **red banner** | the same | **yes** — the result screen shows the podium | yes, `pending` (recorded after the drop) | the same |
| (d) last racer crossed | K | the same | the same | **yes** | yes, `pending` | the same |

In every run: **no page error** (`pageerror` empty), the result screen visible, the local entry
carrying both winners, and after recovery the server's newest race carrying the local entry's id as
`clientRaceId`. The server's race count rose by exactly one per run (1 → 6 on the R data, 1 → 5 on
the K copy) — **no duplicates**.

**Recovery without a reload (e):** yes in all eight. The pending race goes up on the first request
the app makes after the server is back — here the requests the setup screen makes when **← Back to
Setup** opens it — and the red banner leaves at the same moment. **While nothing makes a request, nothing
changes**: 10 s after the server returned, every run still showed the red banner and the race still
`pending` on the result screen (F2).

**One extra run (a, arm R, `--rerace`)** answered whether the missing background comes back without
a reload: after recovery a second Quick Test **on the same page** was drawn **still without the
background**; after a full page load (`goto /setup`) the next race had it again (F1).

## Screenshots

Under `C:\Users\weudl\ra-measure\OFFLINE-1-shots\` (not in the repository), named
`<case>-<arm>-<step>.png`:

| step | file | what it shows |
| --- | --- | --- |
| 1 | `a-R-1-setup-after-drop.png` | setup screen right after the drop: no banner |
| 1b | `a-K-1b-race-running.png`, `a-R-1b-race-running.png` | case (a) race running: **black field, no track background** |
| 1 | `b-K-1-countdown-after-drop.png` | case (b) countdown after the drop: background present, "3" |
| 1 | `c-K-1-midrace-after-drop.png`, `c-R-1-midrace-after-drop.png` | case (c) racing after the drop: unchanged, no banner |
| 1 | `d-R-1-finish-after-drop.png`, `d-K-1-finish-after-drop.png` | case (d) the frame after the last crossing |
| 2 | `<case>-<arm>-2-result-while-down.png` | the result screen with the red banner |
| 3 | `<case>-<arm>-3-result-after-restore-idle.png` | 10 s after the server is back: banner **still** up |
| 4 | `<case>-<arm>-4-setup-after-restore-nav.png` | after Back to Setup: banner gone |
| 5 | `a-R-5-next-race-after-restore-no-reload.png` | the next race on the same page: still no background |
| 6 | `a-R-6-after-reload.png` | after a page load: the background is back |

## Findings

- **F1 — a race started while the server is unreachable is drawn without its track background,
  and stays without it until the page is reloaded.** The background is fetched only when the race
  screen first draws (`<API>/api/tracks/<id>/background`, built by `trackLoader.js`), and
  `client/src/modules/track-effects/bgImageCache.js:28-29, 38, 48` keeps a failed load in its cache
  for the life of the page and never retries it. Racers, track markers, minimap and standings are
  drawn; the result is unaffected. A race on a track already drawn once on this page (cases b–d)
  keeps its background.
- **F2 — the red banner and the pending race wait for the app's next request.** After the server
  is back, the result screen keeps saying *"The server is not answering"* and the race stays
  pending until something makes a request (here Back to Setup). This is the no-polling design
  (`serverStatus.js:10`, `pendingRaces.js:9-18`), measured, not a defect; an operator who looks at
  the banner on the result screen is told the server is down when it is not.
- **F3 — during an outage the viewer is told nothing until the race ends.** No request is made on
  the setup screen, during the countdown or during the race (case a's background load does not
  feed the status), so the banner first appears on the result screen. This is also by design — the
  status is a record of requests already made, never a probe (`serverStatus.js:10-13`).
- **Console text (no row):** both warnings name `docker compose up` (`bgImageCache.js:41-44`, and
  `apiClient.js:57`, whose header at `:36-55` keeps that hint in the console on purpose and out of
  the screen). Console only; a viewer never sees it.

**Not measured:** a page reload during the outage (in arm K the app itself would not load, since the
same server serves it); sign-in, saving or editing during the outage (the banner text already says
they fail); a real **Start Race** race (Quick Test was used, as `race-save.spec.js` does; both reach
the same result screen and the same `recordFinishedRace`).

## After the fix — F1, F2 and F3 (2026-10-18, branch `fix/offline-1`)

**The owner decided on 2026-10-18 to fix all three findings.** The line numbers in the sections above
are those of `2a3a1661`, where the measurement was taken; the files they cite have since changed. What
was built:

- **F1** — `client/src/modules/track-effects/bgImageCache.js` no longer keeps a failed load for the
  life of the page: a failed path is tried again at most once every 10 s while something asks for it
  (the race screen asks every frame, so the background can arrive during a race), and every failed
  path is forgotten the moment the server answers anything.
- **F2** — `client/src/modules/serverRecoveryProbe.js` sends `GET /api/health` about every 10 s, **only
  while the app is in its "server not answering" state**, and stops once the server answers. The
  answer goes through the same event every request uses, so the banner clears and the existing
  `pendingRaces.js` flush sends the pending race; there is no second send path. While the server
  answers, nothing polls.
- **F3** — a note in the standings column, *"Server not reachable — results are kept and sent later"*
  (`client/src/screens/RaceScreen/RaceServerNote.jsx`), never over the race picture; in the app's
  fullscreen it is in the drawer. A failed track background now asks the probe to check once, so an
  outage that began before the race is noticed at the race's start.

**Re-run once per scenario**, the same harness and settings as above (arm R only, the connection
blocked in the browser), on `fix/offline-1`'s production build, throwaway data, ports 4850:

| case | during the race | at the result screen | 12 s after the server is back, nothing clicked | stored on the server |
| --- | --- | --- | --- | --- |
| (a) setup | **note shown** in the standings; banner shown; no background (the server is gone) | red banner, race `pending` | **banner gone, race `sent`** | once |
| (b) countdown | no note (background already loaded; nothing asks the server) | red banner, `pending` | **banner gone, `sent`** | once |
| (c) mid-race | no note (as b) | red banner, `pending` | **banner gone, `sent`** | once |
| (d) last racer crossed | — | red banner, `pending` | **banner gone, `sent`** | once |

**Before → after**, on the same measure:

- **F2:** 10 s after the server returned, the banner was still up and the race still pending in all
  eight earlier runs; now, at 12 s, the banner was gone and the race sent in all four, with no
  navigation and no reload. The server's race count rose by exactly one per run (2 → 5 over b–d).
- **F1:** a race on the same page after recovery used to stay without its background until a reload;
  `client/e2e/offline-recovery.spec.js` now starts a race offline, lets the server return, and starts
  the next race from the result screen's Back to Setup — **its background is drawn**, no reload.
- **F3:** the viewer used to learn nothing until the result screen; now, in case (a), the standings
  column says so from the race's start. **Not changed, and said plainly:** an outage that begins
  after the race's background has loaded (cases b and c) is still noticed only when the race ends,
  because a running race makes no request — the probe runs only once the app knows the server is
  gone, which is the decided scope. **Decided by the owner on 2026-10-18:** for an outage that
  begins mid-race, the note appearing only after the race is sufficient; the race screen does not
  ask the server while it seems to be answering.
- **Cost while the server is gone:** one `GET /api/health` and, while a race is drawn without its
  background, one background request, every 10 s (case a: 12 and 11 over 110 s). None while it answers.
- In every run: no page error, the result screen reached, the race kept locally first.

Screenshots, under `C:\Users\weudl\ra-measure\OFFLINE-1-shots\` (not in the repository):
`after-<case>-R-<step>.png` for the four runs, and `F3-note-normal.png`, `F3-note-normal-column.png`,
`F3-fullscreen-drawer-closed.png`, `F3-fullscreen-drawer-open.png` for the note.
