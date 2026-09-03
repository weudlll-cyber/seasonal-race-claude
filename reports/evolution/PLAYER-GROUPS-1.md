# PLAYER-GROUPS-1 — several saved groups can race each other, and the field's real minimum is ONE

> **NOT MERGED. It is on `feat/player-groups-1` and waiting for your eye**, served on **4173** as a
> production build with the API up.
>
> **All four fingerprints match the record.** `world 8a1977187e9c99b4` · `world-off aa09ed97a3a32689`
> · `camera 152cf295c4c9ff54` · `render 485b73d527602a0e`. The engine was not touched and the numbers
> say so rather than the intent.
>
> **4,391 client tests green**, 27 of them new. `verify --base=master`: **PASS 12 FAIL 0 SKIP 14.**

---

## 1. THE MINIMUM FIELD SIZE, WHICH THE PIECE WAS TOLD TO ESTABLISH FIRST OR STOP

**It is ONE**, and it is stated three times, in three layers, all agreeing:

| where | the guard |
| --- | --- |
| `SetupScreen.jsx` → `canStart` | `players.length > 0 && selectedTrackId !== null && selectedGeometryReady` |
| `raceSession.js` → `validateActiveRace` | `if (!Array.isArray(data.racers) \|\| data.racers.length === 0) throw` |
| `server/src/routes/playerGroups.js` | `players must be a non-empty array` |

**There is no second, larger minimum hiding anywhere** — searched for a `>= 2`, a disabled Start on a
short field, a validation message, a slider floor. The Quick-Test field-size input is `min={1}` and
its clamp agrees. `assignRacers` has a test for a one-person field.

**The MAXIMA are a different story and disagree with each other** — 40 closed / 100 open
(`defaults.js`), a dead `maxPlayers = 20` default prop, 200 on the server for a saved group, and the
track's own `maxRacers` which is a **soft warning** rather than a cap. **Nothing here changes any of
them**; the picker honours whichever of the two hard caps the selected track puts in force, and says
so when a group does not fit. Noted because a reader who asks "what is the field limit" will get
different answers from different files, and that is a real question this piece did not open.

**A test pins the minimum** so the feature cannot quietly raise it: one group of one name starts a
race.

---

## 2. WHAT THIS ADDS, AND WHAT ALREADY EXISTED

**Player groups already existed** — saved on the server, one JSON file each, managed on the Dev
Screen. **Only ONE could ever reach a race**, through a one-shot hand-off key written by the Dev
Screen's *"Load to Setup"* button. Running two groups against each other meant retyping one of them.

**Now they are chosen where the race is set up, and any number of them can be in the field.**

- The Players tab opens with a row of group chips. Clicking one **adds** its players; clicking it
  again **removes exactly the players it put there**.
- **Players typed by hand belong to no group and run under “All.”** They are untouched by every
  group operation — the picker fills the field, it does not own it.
- The roster below is **sectioned by group**, with All last. A field with no groups renders as one
  section, which is the old flat list with a title.
- The start bar names the split: *“4 players (Reds 2 + Blues 2) · 🐎 Dirt Oval · …”*

---

## 3. THREE THINGS THAT WOULD HAVE FAILED SILENTLY, AND ARE PINNED

**★ A NAME IN TWO GROUPS.** Two groups can both contain "Anna"; a race cannot. The second arrival is
**refused and said so** — the roster keys on the name, so a duplicate would not have produced two
racers, it would have produced a React key collision and one of them would have vanished.

**★ `assignRacers` REBUILT EVERY PLAYER FROM ITS NAME.** That was harmless for as long as a player
*was* a name. The moment one carries which group it came from, the rebuild erases it — **on every
add, every remove and every reshuffle, in three callers at once.** The helper now takes strings or
objects and preserves every field but `racerNumber`. **Five tests**, including that it does not
mutate what it was given.

**★ THE SEAM INTO `sessionStorage`.** `handleStartRace` copies `players` into `race.racers`
verbatim, so a field stripped on the way in would not show up until a race was already running.
`playerGroups.test.jsx` drives the whole path — two groups picked on the screen, both present in
`activeRace.racers` with their group — because the picker's own arithmetic being right proves
nothing about what reaches the gun.

---

## 4. THE FAILURE PATH, WHICH IS THE PART A DEMO NEVER EXERCISES

**The API can be down and a race must still start.** Groups are a convenience; the Players tab is
the roster.

A failed fetch prints **the reason** — *"Saved groups could not be loaded (connection refused). You
can still add players by hand below."* — and is **never rendered as an empty list**. "No groups" and
"could not ask" look identical on a screen and mean opposite things; that is QUIET-FAILURES-1's rule,
already written into this screen for the missing-geometry case.

**Two tests hold it**: the message names the error, and a Setup Screen whose group fetch rejects
still adds a name by hand and starts a race.

---

## 5. NOTHING CHANGED THE GAME

| role | recorded | measured tonight |
| --- | --- | --- |
| world | `8a1977187e9c99b4` | **match** |
| world-off | `aa09ed97a3a32689` | **match** |
| camera | `152cf295c4c9ff54` | **match** |
| render | `485b73d527602a0e` | **match** |

**No default moved. No engine file was opened.** The changed set is four client files under
`screens/SetupScreen/`, one helper in `modules/utils/`, and tests. `verify --base=master` re-ran
three of the four fingerprints in its own routing and agreed.

**Nothing was minted, and nothing needed to be.**

---

## 6. WHAT TO LOOK AT ON 4173

1. **Players tab, with the API up.** The chips are your saved groups. Click two.
2. **The roster sections.** Each group under its own heading; anything you type under **All**.
3. **A name in both groups** — the notice under the chips says it was not added twice.
4. **The start bar** — *(Reds 2 + Blues 2)*.
5. **Clear one group.** Only its players go. Anything you typed stays.
6. **The chips with the API down** — the message says why, and Start still works.

---

## Limits

**A group is a LABEL, not a team.** Nothing in the race reads it: there is no per-group scoring, no
per-group colour, no start-row arrangement by group. The field rides through to the render layer
(`RaceScreen` copies unknown roster fields onto each racer), so a later piece **could** use it —
but nothing does, and this report claims nothing about how it would look if something did.

**Groups are matched by NAME, not by id.** Two saved groups with the same name would be one chip's
worth of state. The server does not enforce unique names, so this is reachable; it is not defended
against and a rename mid-session would orphan the players already in the field under the old label.
**Named rather than fixed** because fixing it means carrying the id through the roster, and the id is
not something the operator ever sees.

**The picker fetches once, when the Players tab first mounts.** A group created on the Dev Screen
while the Setup Screen is open will not appear until a reload. There is no refresh button.

**The maxima disagree across four files** (§1) and this piece did not reconcile them. It honours the
one in force and reports an overfill; it does not decide which of the four is right.

**The e2e suite was not extended.** The feature is covered by 27 unit and integration tests in the
client suite; a browser spec would cost ten minutes of gate time for a screen that has no canvas in
it (R7 on cost).
