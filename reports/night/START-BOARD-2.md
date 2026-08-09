# START-BOARD-2 — the board becomes usable

**Branch** `feat/start-board-2` off `feat/start-board-1` · 2026-08-09 ·
**built, measured, NOT minted, NOT merged**

---

## 1. Conformity, element by element — before any numbers

| the spec asked | done | where |
| --- | --- | --- |
| **1(a)** board's own duration `max(floorMs, msPerNameMs × n)`, both Dev sliders | yes | §3 — 3000 / 80, and the arithmetic |
| **1(b)** the push keeps its own rhythm; camera arrives, then HOLDS | yes | §3 — a new BOARD beat; the push is never stretched, asserted |
| **1(c)** the beats must not silently rescale each other; countdown follows the beats | yes | §3.2 — the proportional rescale is gone and `countdownDurationMs` with it |
| **1(d)** the gun fires on a clean picture | yes | §3, asserted at every field size |
| **2** NUMBER · SPRITE · NAME, nothing between sprite and name | yes | §4 — asserted on the drawn x-coordinates |
| **3(a)** diagnose finding 3 before fixing | yes | **§5 — and the likely cause was WRONG** |
| **3(b)** do not extend or reorder the roster | held | §5 — which also means the real defect is not fixed here |
| **3(c)** every racer that starts appears, unnamed ones with a placeholder | yes | §5.3 |
| **3(d)** report the same count check for the standings | yes | §5.4 |
| **4(a)(b)** group by start row, alphabetical within | yes | §6 |
| **4(c)** the existing promises still hold and their tests pass | yes | §6, §8 |
| **4(d)** report the layout at 8, 20, 40, 100 | yes | §6 |
| **5** whether the arrangement leaves room for larger portraits | yes | §7 — it did; ~21 px → ~30 px |
| RENDER expected to move · CAMERA expected to move · WORLD must not | **exactly that** | §9 |
| `engine-reach --check`, run what it says is owed | yes | §9 |
| DO NOT mint, DO NOT merge | held | §9 |
| verify ONCE per part; `--cheap` for wiring checks | held | §9 — one full verify; three cheap runs during the build |
| Tests exercise the paths a race takes | yes | §8 |
| Source hygiene | yes | §10 |
| Two proposals | yes | §12 |

---

## 2. What the owner will see, in one paragraph

The starters' board is up for **3.2 s at 40 racers and 8.0 s at 100** instead of 1.46 s for both.
Each entry now reads **number, then the racer, then the name**, with nothing between the racer and
its name. The board is **split into blocks by start row** — ROW 1, ROW 2 … — alphabetical inside
each, so finding a name is a jump to a heading and then a short scan. The portraits are **about
twice the area** they were. The camera still travels at exactly the speed it did; it simply arrives
and waits.

---

## 3. TIME — the board's own duration, and the countdown that follows it

### 3.1 The numbers I chose, and why

`startBoardFloorMs: 3000` · `startBoardMsPerName: 80`. Both are Dev sliders under Camera Advanced.

They are my judgement and are meant for his eye, not a measurement of him. The shape of the argument
is that **the grouping changes the task**: with the board split by start row and alphabetical inside
each, finding a known name is a heading jump plus a scan of ~10 entries, not a read of 100. 80 ms
per name is generous for that and still lands the 100-racer case at 8 s, which is roughly where the
spec's own example ("do not stretch the camera travel to 8 s") suggested the ceiling sits.

| n | board = max(3000, 80n) | venue | push | **board hold** | settled | **countdown total** | was |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 3000 | 1400 | 2000 | 1000 | 600 | **5000** | 4000 |
| 20 | 3000 | 1400 | 2000 | 1000 | 600 | **5000** | 4000 |
| 40 | 3200 | 1400 | 2000 | 1200 | 600 | **5200** | 4000 |
| 100 | 8000 | 1400 | 2000 | 6000 | 600 | **10000** | 4000 |

At his 40 the board is up 3.2 s against the 1.46 s that failed; at 100 it is 8.0 s.

### 3.2 (c) What changed about the beats — exactly

**Before:** `ceremonySchedule(venue, push, settled, countdownMs)` treated `countdownDurationMs` as a
**cap** and, when the three beats overran it, scaled **all three proportionally**. So every beat was
a function of every other beat: raising the push shortened the venue shot and the settled beat by the
same ratio, silently. That is why "just lengthen the push" was not a change anyone could make safely,
and the previous block measured and named it.

**After:** the function takes the **board's duration** instead of a cap and returns `totalMs`. There
is no scaling factor left in the file — `scaled` is gone from the return, because nothing can scale.
The countdown's length is the sum: `venue + push + boardHold + settled`.

**`countdownDurationMs` is gone entirely** — the key, its Dev slider and its tooltip. One function,
`ceremonyTotalMs`, is now the only definition of how long the countdown is, and the five things that
need it all ask: the camera, RaceScreen's phase advance (when the gun fires), the digits, and both
fingerprint harnesses. Previously four of those five read the flat key independently of the beats,
which is precisely how the beats came to be capped by a number that knew nothing about them.

**The new BOARD beat** is what keeps 1(b): the camera's push is exactly `ceremonyPushMs` at every
field size (asserted for n = 8, 40, 100 and 400), and the extra time is a beat in which it has
already arrived and holds still. When the board is *shorter* than the push the beat is zero, so a
small field is not made longer for nothing.

**1(d)** is asserted rather than argued: `boardAlphaAt` is 0 at `boardEndMs`, which is where the
settled beat begins, at every field size tested — and 1 in the middle of the window, so the
assertion is not vacuous.

---

## 4. PAIRING — NUMBER · SPRITE · NAME

The entry was SPRITE · NUMBER · NAME, so the number sat **between a racer and its own name** — which
is exactly what he described. It is now **NUMBER · SPRITE · NAME**, with the number as the row's
left anchor (right-aligned in its gutter, so a column of numbers lines up whatever their width) and
**nothing at all between the sprite and the name**.

I kept his first option rather than inventing a third. The test asserts it on the **drawn
coordinates** — number x < sprite x < name x, and the sprite-to-name gap under 15 % of the cell — so
a later tidy-up cannot put the number back in the middle without a test going red.

---

## 5. THE DEFECT — diagnosed, and the likely cause was WRONG

### 5.1 What actually happens

**The board is not dropping anyone. The race only ever has 70 racers.**

`SetupScreen.jsx` builds a Quick Test field like this:

```js
const needed = Math.max(0, quickTestCount - players.length);
const fillNames = resolveNameSet(quickTestNameSet).filter(…).slice(0, needed);
const testPlayers = [...players, ...fillNames.map((name) => ({ name }))];
```

`slice(0, 100)` on a 70-element array returns **70 elements**. So `testPlayers.length === 70`, and the
race is built with 70 racers. Computed rather than assumed:

| asked | name set | roster | race actually gets |
| ---: | --- | ---: | ---: |
| 8 | current *(the default)* | 70 | 8 |
| 40 | current | 70 | 40 |
| 70 | current | 70 | 70 |
| **100** | **current** | **70** | **70** |
| 100 | long | 100 | 100 |
| 100 | mixed | 100 | 100 |

**The hypothesis in the spec — 30 racers running unnamed — does not occur.** There is no unnamed
racer; there is a shorter field. The board was reporting the truth.

### 5.2 (b) Why it is not fixed here

The fix is a roster change, and a racer's **name is an engine input** (`stablePairBit` hashes
`r.name`; renaming changed the winner in 14 of 24 races). Extending or reordering the list moves the
world fingerprint and is the owner's decision. **So the user-visible defect — asking for 100 and
silently getting 70 — is still there after this block.** Proposal 12.1 is the one-line change that
would close it, and it is his to take.

### 5.3 (c) The placeholder is built anyway

A racer with no name gets its **number, its portrait and an explicit `— no name —`** in italic grey.
A blank row is indistinguishable from a bug, and this board's whole promise is that the field on
screen is the field in the race. It is a guard for a case today's roster cannot produce; it costs
four lines and it is the difference between a board that lies and one that says what it does not
know. Unnamed racers sort **after** the named ones within their row, so a placeholder never sits
among the As.

### 5.4 (d) The standings panel

**It shows 70 too, and for the same reason.** The panel renders `st.racers`, which is the field that
was built — so both surfaces are consistent and both are correct. Nothing to fix in either; the
shortfall is upstream of both. Not fixed here, as instructed.

---

## 6. GROUPING BY START ROW, and the layout

One block per start row, in row order, with a `ROW n` heading and a rule under it; alphabetical
within each row (case-insensitive, ties by racer index — **not** `localeCompare`, whose result
depends on host ICU data and would make the render fingerprint report a difference that is not a
change).

The groups are laid out as **one continuous column-major run with a heading slot before each group**
rather than a fresh block per row. A block per row leaves ragged half-empty columns whenever a row's
size does not divide the column height — at 40 racers in 5 rows of 8 that is five stubs across the
screen.

| field | rows/group | groups | slots | cols × rows | block px | scale | overlap | clipped |
| ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| 8 | 5 | 2 | 10 | 2 × 6 | 400 × 180 | **1.000** | 0 | 0 |
| 20 | 8 | 3 | 23 | 4 × 6 | 800 × 180 | **1.000** | 0 | 0 |
| 40 | 8 | 5 | 45 | 6 × 8 | 1200 × 240 | **1.000** | 0 | 0 |
| 100 | 10 | 10 | 110 | 6 × 19 | 1200 × 570 | **1.000** | 0 | 0 |
| 100 | 8 | 13 | 113 | 6 × 19 | 1200 × 570 | **1.000** | 0 | 0 |
| 140 | 10 | 14 | 154 | 8 × 20 | 1212 × 454 | 0.757 | 0 | 0 |

**Grouping cost a slot per start row**, so 100 racers is **110 slots**, not 100 — and the old 236 px
cell could only fit 100 at full size, which produced scale 0.73 at his largest field. The cell
narrowed to **200 px** instead of the type shrinking, because his rule is that he would rather
lengthen a beat than shrink the type. What 200 costs: the name gets 129 px, about 19 characters. The
shipped roster's longest name is 8 characters; the two long rosters reach 23, so those clip their
last few characters in the worst case — and the row grouping means a viewer is scanning ~10 names,
not 100, so a partial name is still identifiable.

Past 100 it **shrinks rather than clips**, which is the fit-not-clip rule the first version
established.

---

## 7. (5) THE SIZE HE DID NOT NAME — free, so taken

He said the symbols are hard to attribute and named the distance. Part of it is size. Moving the
number out of the middle **freed its entire gutter**, and the cell grew 26 → 30 px tall to carry the
heading rule, so the portrait went from **~21 px to ~30 px** — 1.4× in each direction, about double
the area — with no other cost. A test pins it above 25 px so a later tidy-up cannot quietly take it
back.

---

## 8. Tests

**Added: 14. Rewritten: 5. Deleted: 3.** Client suite: **189 files, 3748 tests, all green.**

**Deleted, and why:** three assertions about the proportional rescale (`scaled === true`, the
ratio-preservation, and "the settled beat is scaled with the others"). They asserted the behaviour
this block removes. Adapting them would have meant inventing new assertions for deleted code; what
replaces them is stronger — each beat is *exactly* what it was asked for, and the settled beat is
never sacrificed **because there is no longer any room to make**.

| test | what breaks if deleted | what goes unnoticed if it is missing |
| --- | --- | --- |
| board duration is `max(floor, per-name × n)` and monotone | finding 1 | a floor that stopped scaling: fine at 8, fails again at 100 |
| the PUSH never stretches, at n = 8/40/100/400 | requirement 1(b) | a crawling push — reads as the game being slow, not a setting being wrong |
| the board is GONE before the settled beat, every field size | requirement 1(d) | the gun firing with the board still up |
| the fade is a fixed time, not a fraction | — | a 10 s board fading for 3 s: reading time spent on nothing |
| the totals are 5.0 / 5.0 / 5.2 / 10.0 s | the arithmetic in this report | the report and the code disagreeing |
| each beat is exactly what it was asked for | the beats' independence | one slider quietly shortening two others |
| the countdown FOLLOWS the beats (`totalMs` is the sum) | the countdown's only definition | a gun that fires before the ceremony ends |
| every racer appears exactly once, at 40 and 100 | the board's only real promise | a group built and not emitted — the exact shape of "100 runners, 70 shown" |
| the groups partition the field | — | a grouping bug that drops one row of the grid |
| grouped by start row, alphabetical within | finding 4 | groups in hash order, which looks alphabetical-ish |
| the ordering is total and case-insensitive | determinism the render fp hashes | two machines ordering differently |
| an unnamed racer gets number, portrait and placeholder | requirement 3(c) | a racer that starts and has no line at all |
| an unnamed racer sorts last within its row | — | a placeholder among the As |
| no two slots overlap / everything inside the canvas | the second promise | heading slots colliding with racers at some field sizes only |
| no shrink at 8/40/100 (both row densities) | the type size at the sizes that matter | a silent shrink, which takes his decision away |
| nothing between sprite and name (drawn coordinates) | finding 2 | a refactor putting the number back in the middle |
| the portrait is drawn larger than 25 px | finding 5 | the symbols going back to hard-to-attribute |
| `drawRacer` once per racer, frame 0, no rings | the portrait being the real thing | a portrait right today, wrong after the next sprite change |
| a small field gets a small block | the case he asked to see | eight racers laid out like a spreadsheet |
| draws nothing when invisible | the cheap exit | a full-screen fill on every frame of a 10 s countdown |

`scripts/raceDriver.test.mjs`'s countdown test was rewritten rather than deleted: the key it turned
is gone, so it turns a **beat** now — a stronger version of the same assertion, because it also
proves the derived total reaches the driver.

---

## 9. Fingerprints

`node scripts/engine-reach.mjs --check` on the 16 changed paths named exactly one:
`client/src/modules/storage/defaults.js`. The world fingerprint was therefore **owed and run**, and
the number is what proves the two new keys are inert.

| role | before | after | expected? |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **must not move — it did not** |
| camera | `220d84db279db268` | **`3af58f4d7b0b073f`** | moves — the beats changed length |
| render | `ffe568e27991c297` | **`58476ade8198fb90`** | moves — the board's layout and content changed |

The camera and render moves are **one subsystem, not two**: the rhythm drives both, exactly as the
spec anticipated.

**NOT MINTED, NOT MERGED.** It is visible; his eye decides (L191).

**Cost discipline, as instructed:** `npm run verify` was run **once**, at the end. Every wiring and
formatting check during the build used `--cheap` — three of them, at ~3 s each against ~110 s for
the real thing. The client suite was teed and read twice from one run rather than run twice.

---

## 10. Hygiene

**Lines.** `startBoardRendering.js` 253 → 286 · its test 272 → 317 · `startCeremony.js` 149 → 232 ·
its test 359 → 447 · `CameraDirector.js` −13 net · `defaults.js` −9 · `cameraTimingComputation.js`
+13 · `renderRaceFrame.js` +7 · `CameraAdvancedSection.jsx` +37 · five harnesses +3 each.

**Removed, because this change orphaned it:**

- **`countdownDurationMs`** — the config key, its Dev slider, its tooltip, and its four independent
  readers. The countdown has no length of its own any more.
- **`ceremonySchedule`'s `scaled` return field** and the proportional-rescale arithmetic behind it.
  Nothing can scale, so nothing reports having scaled.
- **`startBoardAlpha(beat, progress)`** — replaced by `boardAlphaAt(elapsed, schedule)`. The board
  now spans two beats, and a per-beat fade would have restarted at the boundary: a visible pulse in
  the middle of the thing whose whole job is to be steady enough to read.
- **The `updateCountdown` duration parameter** — the schedule is derived inside, from the config and
  the field size, so a caller can no longer disagree with it.
- **Three tests** asserting the removed rescale.

**Moved out:** nothing.

**Noticed and deliberately left:**

- **The 70-of-100 shortfall itself.** §5 — a roster change is an engine-input change and his call.
  **This is the one thing in this block that is still broken for him**, and proposal 12.1 is the fix.
- **`CameraDirector._ceremonyBeat` is still written every countdown frame and read by nothing.**
  Third block to walk past it. It was dead before this change and is not orphaned by it, so it is
  still not mine to take — but the renderer now computes the same beat independently, which makes
  the dead field slightly more misleading than it was.
- **`postStartHoldMs` is duplicated between `defaults.js` and `cameraTimingComputation.js`,
  unguarded** — carried forward. The two board keys joined the *guarded* duplication beside it.
- **The board's own geometry is literals** (cell 200 × 30, 6 columns, 20 rows). Layout, not taste;
  one home. If he wants to tune them they should become settings, which is a different block.

---

## 11. Decisions made alone

**1. 3000 ms floor and 80 ms per name.** §3.1. The grouping is what makes 80 defensible; without it
I would have wanted more and the 100-racer ceremony would have run past 10 s.

**2. `countdownDurationMs` deleted rather than kept as a minimum.** A floor that never binds is dead
weight, and keeping it would have preserved exactly the two-authorities arrangement the spec asked
me to end. The countdown has one definition now.

**3. The digits count the derived total**, so a 100-racer race counts 10-9-8…-1-GO!. They were
already derived from the countdown's length (START-BOARD-1), so this needed no new decision — but it
does mean the digits get long at a large field. Worth his eye; the alternative (digits only for the
last 3 s) is a change to what he asked for.

**4. Headings are laid out as slots in the same run, not as separate blocks.** §6 — a block per row
leaves five ragged stubs at 40 racers.

**5. The cell narrowed to 200 px rather than the type shrinking.** §6, and it is his stated
preference applied to a case he has not seen yet.

**6. Unnamed racers sort last within their row** rather than by their placeholder text, which would
have put them under "—".

**7. I did not fix the 70-of-100 shortfall**, though it is the most user-visible thing in his list.
§5.2 — the fix is an engine input.

---

## 12. Two proposals of my own

**12.1 — Change the Quick Test's default name set from `current` to `mixed`, and it is one line.**
`DEFAULT_NAME_SET = 'current'` selects the 70-entry roster; `mixed` has 100 and is already shipped,
already used by the render fingerprint harness, and already the more realistic roster (mean name
length 10.1 against 5.5, which is what real player names look like). That single change makes
"100 racers" mean 100 racers. **It moves the world fingerprint** — every racer in a Quick Test at
n > 70 gets a name, and names are engine inputs — so it needs his decision and a ship ceremony. I
would also add a line to the Setup screen when the requested count exceeds the roster, because a
field that silently comes up short is the defect underneath the defect.

**12.2 — The board should decide the push's *start*, not just its length.** Right now the venue shot
runs, then the push runs, and only then does the board's hold begin — so at 100 racers the viewer
looks at a travelling camera for 2 s before the board has settled, and then at a still one for 6 s.
Inverting it would read better: hold the venue shot, bring the board up **over the venue shot**, and
run the push *underneath* the last second of the board so the camera arrives just as the board
clears. The ceremony would be the same length and the board would get its whole time against a still
background, which is easier to read than one that is moving. It is a one-line change to
`boardStartMs` plus an eye test, and it is a taste decision, so I have not taken it.

---

## 13. What I did NOT do, and why

- **Did not extend or reorder the roster.** §5.2 — engine input, his decision.
- **Did not fix the standings count.** §5.4 — it is correct; the shortfall is upstream.
- **Did not touch the venue shot, the push's speed, the hold, or the release.** Settled and accepted.
- **Did not make the board's geometry configurable.** §10.
- **Did not mint. Did not merge.**

---

## 14. How to see it

**5173 is on this branch**, `feat/start-board-2`. The build pill names the branch; the SHA is
whatever HEAD was when Vite started.

**What to look at:** river-run at your open field size, end to end — the board should now be up long
enough to find a name, split into ROW blocks, with the number, the racer and the name reading as one
line. Then a small field of 8–12, to see the block stay compact.

**The three questions you asked, and where they stand:** *can you find a name and carry its number
away* — 3.2 s at 40, 8.0 s at 100, grouped by row; *do the portrait and the name read as one thing*
— adjacent now, and about twice the size; *do 100 racers all appear* — **not yet, and not because of
the board**: a Quick Test at 100 starts only 70 racers, and closing that is your call (§12.1).
