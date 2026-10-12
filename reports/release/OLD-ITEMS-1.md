# OLD-ITEMS-1 — three carried-over items, re-examined at the tree (2026-10-12)

**Owns:** the re-examination of 2026-10-12 of the three rows *Carried over from OPEN.md §2-§5
(A3-25, 2026-10-12)* in [docs/BACKLOG.md](../../docs/BACKLOG.md) PART ONE — what each is, where and
when it was recorded, whether it is still true on master, what it would take, and one proposal each.
The rows themselves stay where they are; each carries a one-sentence pointer to this page.

**Scope:** `origin/master` at `e77e2773` (2026-10-12), read in a fresh clone. Read-only; nothing
was built and no code or test was changed. Piece 3 of the block *MERGE REVIEW 2026-10-12 + GATE
FIX*, ordered by the owner on 2026-10-12.

## Summary

| item | still true on master? | what it would take | proposal |
| --- | --- | --- | --- |
| Pause and resume a running race (`B-UX-Pause`) | **Yes** — no pause control or path. A hidden tab already freezes the physics as a side effect; nothing else stops. | About 1–1.5 days: a control, one paused flag in the loop, and the eight wall-clock sites made pause-aware; then the owner's eye. | **Leave open, as the owner's question** — it has never been asked whether he wants it since it was written on 2026-05-03. |
| The Phase V verification sittings (`V-1`, `V-2`, `V-5`/`B-5`, `V-6`, `V-7`, `V-8`, `V-9`) | **Mostly no.** Five of the seven are gone or covered: `V-1`'s code was replaced, `V-2` is held by unit tests, `V-6`'s screen was rebuilt and looked at by the owner on 2026-10-05, `V-7` is held by the golden, repeat and fingerprint machinery, `V-8` names nothing specific. **Two remain:** `V-5`/`B-5` and `V-9` — and `V-5` turned up a real finding (below). | One sitting of about 15 minutes for `V-5` and `V-9`, or one browser spec of half a day. | **Narrow, do not close whole:** close `V-1`, `V-2`, `V-6`, `V-7`, `V-8`; keep `V-5` and `V-9`. |
| `Q-19` — the `TrackEditor.effects.test.jsx` flake | **No observed failure since 2026-05-16.** Both causes ever named were fixed in code (`00e09ba0`, 2026-05-02; `ac8d50c5`, 2026-06-08); the row was re-opened on 2026-08-23 from a stale pointer line. 20 more runs today: **20 of 20 green**. | 48 more runs reach the row's own 150; about 12 minutes of machine time, file alone. | **Close as fixed**, on the history — or, if the row's own N is kept, run 48 more. |

**One finding outside the three questions, for the owner** (from `V-5`): the Dev Screen's *Backup and
reset* texts claim the browser backup covers "tracks, racers, groups, branding, history" and that
the reset "deletes all custom tracks, racers, groups, and branding" and "restores the 5 built-in
tracks, 5 built-in racers". Tracks, player groups, brands and custom racers have lived on the server
since mid-2026, and the code beside those texts says so in its own comments. The browser file is a
settings backup; the data backup is `npm run backup` (`scripts/backup.mjs`). An operator who trusts
the label believes he holds a backup he does not hold. A text change is visible, so it is his call.

---

## 1 · Pause and resume a running race (`B-UX-Pause`)

### What it is, and where it comes from

During a running race, a control that freezes the race and a second that continues the **same**
race from where it stopped. Recorded:

- [docs/BACKLOG.md:1269-1274](../../docs/BACKLOG.md) — *Phase B*: "freeze rAF loop, resume →
  continue", "Explicitly NOT part of the camera phase", "Priority: after camera phase"; with the
  BACKLOG-VERDICTS-1 verdict of 2026-09-02 (still true, unbuilt).
- [docs/BACKLOG.md:1857-1860](../../docs/BACKLOG.md) — the carried-over PART ONE row.
- [docs/OPEN.md:120](../../docs/OPEN.md) (§0 item 10) and
  [docs/OPEN.md:238](../../docs/OPEN.md) (the §2 table row).

Commits (`git log -S 'B-UX-Pause'`):

| SHA | date | what |
| --- | --- | --- |
| `6fd61d0e` | 2026-05-03 | created in `docs/BACKLOG.md`, with the camera-concept integration (in German then) |
| `f278e0aa`, `7c320a69` | 2026-08-23 | BACKLOG-HONEST-1 census and verdict |
| `4ecfde1a` | 2026-08-24 | BACKLOG-SORT-42 |
| `4b202871` | 2026-10-12 | AUDIT-1 A3-25 — the PART ONE row |
| `8936c59c` | 2026-10-12 | OPEN.md re-derived — §0 item 10 |

### Still true on master? — yes

There is **no pause or resume control and no paused state** anywhere in
`client/src/screens/RaceScreen/` (searched for `pause`, `paused`, `visibilitychange`,
`document.hidden`; every `pause` hit is the ending's `finishPauseMs`). The race screen's controls are
*Cancel Race* (`index.jsx:1431`, `:1627`), the fullscreen toggle (`:1650`) and the click-to-skip on
the ceremony and on the finish picture (`:1496`, STAY-ON-THE-FINISH-1).

**What does exist, by accident:** a hidden browser tab. The browser stops calling
`requestAnimationFrame` in a hidden tab, and the loop caps each frame's time step
(`index.jsx:781`, "an uncapped stall would fast-forward the race"), so during the *racing* phase the
physics simply stops and continues on return — the same race, because the physics advances in
fixed steps. It is not a pause: nothing in the client listens for visibility at all, and the parts
of the screen that run on the wall clock do **not** stop (below).

### What it would take

The physics half is small — skip the accumulator while paused, exactly what a hidden tab already
gets. The work is in the **wall-clock sites**, each of which would jump forward by the paused time
unless shifted on resume:

1. the ceremony clock — `st.countdownStart` read as `ts - st.countdownStart`
   (`index.jsx:821`, `:828`, `:844`);
2. the battle slow-motion release — `ts - st.slowmoStartWallTs` (`battleSlowmo.js:60`);
3. `raceElapsed` handed to the camera (`index.jsx:1140`) and the camera's own `ts`
   (`index.jsx:1165`);
4. `st.finalLapStartTs` (`index.jsx:1069`);
5. the result's `elapsedTime`, computed as `(ts - st.raceStart)` (`raceResults.js:59`) — **already
   inflated today by any time the tab was hidden**, a small existing inaccuracy;
6. the finish-navigation timer (`index.jsx:1023`) and the winner-card timers (`:1057`) —
   `setTimeout`s that would need remaining-time bookkeeping;
7. the overlay-text timer (`index.jsx:359`);
8. the dust and effects updates fed from `ts` / `smoothDt` (`index.jsx:815`, `:1111`, `:1119`).

Pieces: a control on the race screen (button, and a key if he wants one), one `paused` flag and a
`pausedAt` stamp, a resume that shifts the stamps in 1–4 and re-arms 6–7 with the remaining time, a
"Paused" overlay, unit tests for each shifted clock plus a browser spec (pause N seconds, resume,
the finishing order and the race identifier unchanged). **About 1 to 1.5 days.** Risks: the camera
is not deterministic from the race seed (it diverges on any frame-timing change), so a pause will
give a different *picture* after resume even though the race is identical — that is for his eye;
the camera and render fingerprints should not move as long as nothing pauses, which the existing
fingerprint check would confirm. No `defaults.js` key is needed unless he wants the control
switchable, in which case the ship ceremony applies.

### Proposal

**Leave open, as a question for the owner** — the physics makes it cheap and safe, but it was
written on 2026-05-03 as "after the camera phase" and nobody has asked him since whether a live event
needs it.

---

## 2 · The Phase V verification sittings — his eye

### What it is, and where it comes from

Manual checks of work that shipped without anyone confirming it in the browser. Recorded:

- [docs/BACKLOG.md:1440-1480](../../docs/BACKLOG.md) — `V-1`, `V-2`, `V-3` (struck), `V-5`, `V-6`
  to `V-9`, and the BACKLOG-VERDICTS-1 verdict of 2026-09-02 over `V-6`–`V-9`.
- [docs/BACKLOG.md:1294-1301](../../docs/BACKLOG.md) — `B-5`, which `V-5` is downstream of.
- [docs/BACKLOG.md:5959-5973](../../docs/BACKLOG.md) — the *Phase V* heading in PART TWO with `V-4`
  (closed) and the note that `V-1`, `V-2`, `V-4`, `V-5` are the verification of `B-1`, `B-2`, `B-4`,
  `B-5`.
- [docs/BACKLOG.md:1861-1866](../../docs/BACKLOG.md) — the carried-over PART ONE row.
- [docs/OPEN.md:121](../../docs/OPEN.md) (§0 item 11) and
  [docs/OPEN.md:267-272](../../docs/OPEN.md) (§3, *Verification sittings for work that already
  shipped*).

Commits:

| SHA | date | what |
| --- | --- | --- |
| `fb110744` | 2026-04-26 | *Phase V (Verification Sprint)* first named in `docs/ROADMAP.md` and `docs/BACKLOG.md` |
| `e9136c1f` | 2026-04-26 | the `V-1` … `V-9` list created in `docs/BACKLOG.md` (`git log -S 'V-9'`) |
| `e180a6be` | 2026-05-25 | translated to English (full hygiene) |
| `7cc5f35d` | 2026-08-23 | the `V-` block's downstream duplicates marked, one more closure |
| `b22ff2b8`, `c49d5af5` | 2026-08-24, 2026-08-27 | ROADMAP-FOLD-1/2 — the phase table moved into BACKLOG |
| `bec28bd8` | 2026-09-02 | BACKLOG-VERDICTS-1 — "a manual verification that nobody has performed" |
| `4b202871` | 2026-10-12 | AUDIT-1 A3-25 — the PART ONE row |

### Still true on master? — id by id

| id | what it asks | does the thing still exist as described? | covered by an automated test? | verdict |
| --- | --- | --- | --- | --- |
| `V-1` | loading a saved player list in `PlayerSetup` (the `B-1` StrictMode fix, PR #25, `697e081`, 2026-04-27) | **No.** `PlayerSetup.jsx` no longer loads anything — it is name entry only. Saved lists became server-side **player groups** (`999f45ed`, 2026-06-14; `aea89b22`, PLAYER-GROUPS-1, 2026-09-03), picked in `SetupScreen/PlayerGroupPicker.jsx`. The code `B-1` fixed is gone. | Yes: `SetupScreen/playerGroups.test.jsx:103-213` (two groups picked both reach `activeRace.racers`; a server that does not answer leaves Setup usable), `PlayerGroupPicker.test.jsx`, `server/src/routes/playerGroups.test.js` | **obsolete** |
| `V-2` | a track with missing geometry is refused, with a reason | Yes — `SetupScreen.jsx:278` (`selectedGeometryReady`), gating `canStartBase` at `:280` and both start paths at `:749`, `:946`; the reason at `:1862` | Yes: `SetupScreen.test.jsx:687-750` — Quick Test disabled with a tooltip that names the server, Start Race disabled, a click starts nothing, the happy path enabled | **covered** — the behaviour is pinned by tests that render the screen |
| `V-5`/`B-5` | backup → restore → reset, end to end, in the Dev Screen | **Partly.** The wiring is there (`SystemSettings.jsx:28-96`, `storage.js:107-156`), now in the chapter *Accounts and system → Backup and reset* (`devScreenChapters.js:243`). But what it backs up has changed: `exportAllStorage` writes only the browser's `racearena:*` keys, and tracks, player groups, brands and custom racers live on the server (the code's own comments at `SystemSettings.jsx:88-92`). The **server** data has its own backup and restore, `scripts/backup.mjs` (`npm run backup`, DELIVERY-BACKUP-1, RELEASE-BASICS-1). | Server half: yes — `scripts/backup.test.mjs:155` and `:191` (round trip with rows, with WAL on), `:257` (a backup that skips the database FAILS). Browser half: `storage.test.js:64-77` (`importAllStorage` passes keys, skips foreign ones); **no test** for `SystemSettings.jsx` and no end-to-end pass. | **still open**, and see the finding below |
| `V-6` | "multiple dev panel sections — visual verification" | **No.** The sections it meant were replaced by DEVSCREEN-CHAPTERS-1 (seven chapters, 348 controls). **The owner looked at the rebuilt screen and accepted it on 2026-10-05** ([BACKLOG.md:2349-2358](../../docs/BACKLOG.md)). | Yes: `DevScreen/devScreenChapters.guard.test.jsx:326-404` renders the screen and holds every control to the design table (place, order, info text, once) | **obsolete** — the owner's look of 2026-10-05 is the sitting |
| `V-7` | physics and collisions — smoke test | Yes, much changed since April. | Yes, far beyond a smoke test: `modules/parity/goldenRealArm.test.js`, `modules/repeatRace.test.js`, `modules/raceStep.test.js`, `modules/avoidanceWarmupRamp.test.js`, the fingerprint record `docs/fingerprints.json` checked by `scripts/check-fingerprints.mjs`; and the owner watches races at every ship | **covered** |
| `V-8` | "localStorage persistence edge cases — stress test" | It names no edge case. Most persistent data has moved to the server; what stays in the browser is settings, the seed and the identifier. | Partly: `storage.test.js:16` (quota exceeded → `false`), `:46`, `:87-133` (corrupt JSON says so, once per key), `:135` (no storage API); `trackStorage.test.js` corruption tests | **obsolete as written** — it has no definition a sitting could meet |
| `V-9` | fullscreen toggle — "functionally unverified" | Yes: `toggleFullscreen` at `RaceScreen/index.jsx:1395-1401` (the row's `:1763`/`:1765` addresses are stale), the button at `:1650`, the listener at `:373-377`. | Half: `RaceScreen/cancelRace.test.jsx:173`, `:184` (cancel leaves fullscreen; does not call exit when not in it). Entering fullscreen and the race picture in it are not tested; no browser spec mentions fullscreen. | **still open** |

**The finding (from `V-5`):** the texts the operator reads in *Backup and reset* promise more than the
code does. `SystemSettings.jsx:104-105` says the export covers "tracks, racers, groups, branding,
history"; the reset confirmation at `:80` says it "deletes all custom tracks, racers, groups, and
branding"; `:152-153` says the reset "restores the 5 built-in tracks, 5 built-in racers". All three
predate the move of those stores to the server; the code under them already says the opposite
(`:88` "TRACKS live on the server", `:90` "groups live on the server after D2", `:92` "brands live
on the server after D4"). Not recorded in AUDIT-1 (searched). A text change is visible to the
operator, so whether and how to reword it is the owner's decision.

### What it would take

- **A sitting for what remains** — `V-5` and `V-9` — about **15 minutes** of the owner's time:
  export the browser settings, change a setting, import the file and see it back, reset and see the
  defaults; enter fullscreen during a race, see the picture fill the screen, leave it, and cancel a
  race from fullscreen.
- **Or automate it** — one browser spec, about **half a day**: Playwright can click the toggle
  (fullscreen needs a user gesture, which a click is) and read `document.fullscreenElement`, and can
  drive *Export* (download event), *Import* (file chooser) and *Reset* (dialog) and read
  `localStorage` before and after. What it cannot judge is whether the fullscreen picture *looks*
  right, which stays his.
- Plus, if he wants it, the `V-5` text correction above: three strings in one file, under an hour.

### Proposal

**Narrow the row rather than close it:** close `V-1`, `V-6` and `V-8` as obsolete and `V-2` and
`V-7` as covered by tests, and keep `V-5` and `V-9` as one 15-minute sitting or one browser spec —
`V-5` with the label finding attached.

---

## 3 · `Q-19` — the `TrackEditor.effects.test.jsx` flake

### What it is, and where it comes from

A test in `client/src/screens/TrackEditor/TrackEditor.effects.test.jsx` — *"shows an error and does
not call FileReader when file exceeds 10 MB"*, today at `:440` — failed intermittently in full
parallel client-suite runs and passed alone. Recorded:

- [docs/BACKLOG.md:1307-1320](../../docs/BACKLOG.md) — *Phase Q*, the measurement of 2026-09-24
  (0 in 20, narrowed).
- [docs/BACKLOG.md:5913-5916](../../docs/BACKLOG.md) — PART TWO, **"fixed PR #55 (2026-05-01)"**,
  with the root cause.
- [docs/AUDIT.md:945](../../docs/AUDIT.md) — the same closure, struck; and
  [docs/AUDIT.md:169](../../docs/AUDIT.md) — the last recorded failure, 2026-05-16.
- [docs/BACKLOG.md:1867-1873](../../docs/BACKLOG.md) — the carried-over PART ONE row.
- [docs/OPEN.md:122](../../docs/OPEN.md) (§0 item 12) and
  [docs/OPEN.md:317](../../docs/OPEN.md) (§4 table row).

### The history the row does not carry

| SHA | date | what |
| --- | --- | --- |
| `ef70ab54` | 2026-05-01 | **created** (PR #50): intermittent in the full parallel run; suspected a global `FileReader` mock overwritten by another file |
| `9b39bc08` | 2026-05-01 | a one-line **pointer** added under *Phase Q — refactor chunks*: "Root cause: global FileReader mock scope conflict" |
| `00e09ba0` | 2026-05-02 | **fix 1** (PR #55): a `fetch` stub leaking from `trackLoader.test.js`; `vi.unstubAllGlobals()` added there (today `trackLoader.test.js:58`, `:64`). The detailed entry was marked fixed; **the pointer line was not** |
| `f9ff659b` | 2026-05-16 | AUDIT.md records the file failing again, "pre-existing" — the last recorded failure |
| `ac8d50c5` | 2026-06-08 | **fix 2**: the spy was installed after render and raced the editor's own `readAsDataURL` calls (sprites, thumbnails); the test now asserts that the 11 MB blob was never read, not that nothing was read — the very `FileReader` mechanism the pointer line named |
| `f278e0aa`, `7c320a69` | 2026-08-23 | BACKLOG-HONEST-1 reads the **pointer line** (then `BACKLOG.md:949`) as an open item, finds three green runs, carries it as *cannot establish* |
| `ad892cf3` | 2026-09-23 | POLISH-2026-09-24B: 20 full parallel suite runs, 0 failures — narrowed, not closed |
| `4b202871` | 2026-10-12 | AUDIT-1 A3-25 — the PART ONE row, with 62 green CI client-suite runs: 0 in 82 |

So the item was re-opened from a stale summary line on 2026-08-23. Both causes ever named have a
code fix, the second exactly on the named mechanism, and no failure has been recorded in the nearly five
months since. The OPEN.md §4 sentence "Never *fixed* — nothing was changed" is true of the 2026-09-24
measurement and not of the item. Also changed since May: the client suite runs with `isolate` on
(`client/vitest.config.js:21`) and at most 4 workers (`:82`), and the file has grown from 11 to 19
tests (PARTICLES-VISIBILITY-9 to -12).

### Still true on master? — 20 more runs, 2026-10-12

The file alone, 20 sequential runs, `npx vitest run src/screens/TrackEditor/TrackEditor.effects.test.jsx`
from `client/`, no retries, counted by a scratch script outside the repository. Durations are wall
clock per run, including `npx` start-up; run 1 includes the cold start.

| run | result | tests | seconds |
| --- | --- | --- | --- |
| 1 | pass | 19 passed (19) | 82.8 (cold start) |
| 2 | pass | 19 passed (19) | 13.8 |
| 3 | pass | 19 passed (19) | 13.8 |
| 4 | pass | 19 passed (19) | 14.2 |
| 5 | pass | 19 passed (19) | 13.5 |
| 6 | pass | 19 passed (19) | 13.7 |
| 7 | pass | 19 passed (19) | 13.1 |
| 8 | pass | 19 passed (19) | 13.1 |
| 9 | pass | 19 passed (19) | 12.8 |
| 10 | pass | 19 passed (19) | 13.3 |
| 11 | pass | 19 passed (19) | 17.3 |
| 12 | pass | 19 passed (19) | 14.2 |
| 13 | pass | 19 passed (19) | 14.1 |
| 14 | pass | 19 passed (19) | 15.4 |
| 15 | pass | 19 passed (19) | 16.6 |
| 16 | pass | 19 passed (19) | 15.9 |
| 17 | pass | 19 passed (19) | 16.6 |
| 18 | pass | 19 passed (19) | 16.1 |
| 19 | pass | 19 passed (19) | 20.9 |
| 20 | pass | 19 passed (19) | 23.8 |
| **all** | **20 pass, 0 fail** | | runs 2-20: min 12.8, median 14.2, max 23.8; all 20: 6.3 min |

**What 20 more runs change, with care about what they are.** These runs are **the file alone**, not
the full parallel suite the flake was seen in. They do test fix 2's mechanism (a race inside the
file); they cannot test fix 1's (a stub leaking from another file). Counted with the 82 full-suite
runs anyway — as the brief asked — the total is **0 in 102**, and the chance of missing a
one-in-fifty flake falls from 0.98^82 ≈ **19%** to 0.98^102 ≈ **12.7%**. The row's own rule asks for
under 5%, which 0.98^149 ≈ 4.9% first meets: **48 more runs** reach the row's stated 150. At about
15 seconds a run, that is roughly 12 minutes of machine time for file-alone runs, or about 48 more
green CI client-suite runs, which master produces in a few weeks.

### What it would take

Either nothing — close it on the history above — or 48 more runs (about 12 minutes, file alone; or
a few weeks of ordinary CI). No code change in either case.

### Proposal

**Close as fixed** — both named causes were fixed in code (`00e09ba0`, `ac8d50c5`), the last
recorded failure is 2026-05-16, and the row was re-opened from a stale pointer line; if the row's
own 150-run rule is kept, it is 48 runs away.

---

## Method notes

- One command per call; the clone is `C:/tmp/g3`, from the GitHub URL. No server was touched; no
  `verify`, premerge or browser gate was run; nothing was built.
- The 20-run script lived in a scratch directory outside the repository and is not committed.
- Every line address above was read on `e77e2773`.
