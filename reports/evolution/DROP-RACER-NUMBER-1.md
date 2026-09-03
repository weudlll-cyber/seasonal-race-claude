# DROP-RACER-NUMBER-1 — the badge and the shuffle are gone, and `assignRacers` went with them because it had nothing else to do

> **His decision, 2026-09-04, on SHUFFLE-REACH-1 option 2.** *"The badge creates an expectation it
> does not meet — I read it as deciding the race numbers, and it decides nothing. The list sorts
> alphabetically afterwards, which is what a start list normally does."*
>
> **Established before removing, uncapped: nothing outside the Setup Screen reads it, and a saved
> group does not carry it.** §1.
>
> **All four fingerprints unmoved.** `verify --base=master`: **PASS 15 FAIL 0 SKIP 11.**
>
> ★ **`raceNumber` is NOT touched.** It is a different field one letter away, drawn from the race
> seed, and that near-collision is why this report exists at all. §4.

---

## 1. WHAT WAS ESTABLISHED FIRST, AND HOW WIDELY

SHUFFLE-REACH-1 said nothing outside the Setup Screen reads `racerNumber`. **That is a report, so it
was re-established at the source** rather than trusted.

**Every tree, uncapped, both spellings and the near-misses** (`racerNumber`, `racer_number`,
`racerNo`, `racer-number`, `racerNum`):

| tree | files |
| --- | --- |
| `server/` | **0** |
| `scripts/` | **0** |
| `shared/` | **0** |
| `client/e2e/` | **0** |
| `client/public/` | **0** |
| `docs/` | **0** |
| `client/src/` | **three source files** — `RandomHelper.js`, `PlayerSetup.jsx`, `rosterGroups.js` — plus tests |

**Nothing outside the Setup Screen read it. No STOP condition.**

### ★ THE STORED ROSTER SHAPE, which is the check that could have stopped this

**A saved player group stores names, not players.** Read off disk:

```json
{ "id": "…", "name": "Testgruppe von Walter",
  "players": ["James", "Olivia", "Ethan", "Sophia", … ],
  "isDefault": false }
```

`players` is an array of **plain strings** in all three files under `server/data/player-groups/` and
in the seed. **So removing the field cannot break loading a saved group** — there was never a field
there to lose.

**One stored place did carry it**, and it is transient: `KEYS.ACTIVE_GROUP` in localStorage, written
by the Dev Screen's *Load to Setup* as `assignRacers(group.players)`. The Setup Screen reads it once
and clears it immediately. A stale one left over from before this change carries a `racerNumber`
nothing reads, and loads exactly as it did. **The hand-off now writes `{ name }` objects, and a test
asserts that shape key by key** rather than `expect.any(Array)` — which is what it asserted before,
and which would have passed whatever the shape became.

---

## 2. WHAT WENT

| | |
| --- | --- |
| the `#3` badge beside every name | **gone** |
| the **🔀 Reshuffle racer assignments** button | **gone** |
| `assignRacers()` in `RandomHelper.js` | **gone** |
| `.racerBadge` and `.reassignBtn` in the stylesheet | **gone** |
| the roster's sort | **by racer number → ALPHABETICAL** |
| the roster's shape | `{ name, racerNumber, group? }` → **`{ name, group? }`** |

**`assignRacers` went because it had no other purpose.** Its entire body assigned the field being
removed. Keeping it would have left the mechanism running with nothing on the other end — the shape
of half-fix this project rejects everywhere else. Its three callers (`PlayerSetup`,
`PlayerGroupPicker`, `PlayerGroupsManager`) now build the array inline, which is what they were
doing anyway with a shuffle wrapped round it.

**`shuffle()` STAYS and is unrelated.** `rowLayout.js` imports it for the start grid, seeded from the
race RNG. It was never what the button called, and a comment where `assignRacers` used to stand says
so — because "the shuffle was removed" is exactly the sentence that would get it deleted next.

---

## 3. ALPHABETICAL, AND WHY THAT IS BETTER THAN A NUMBER

His reason, and it is stronger than tidiness: **the badge was re-rolled on every add and every
remove.** The list sorted by it, so typing one more name reordered everyone — **the list moved under
the operator's hands for no reason they could act on**, and it looked like it meant something.

A start list is read by name. It now sorts by `localeCompare` inside each group section, with `All`
still last.

---

## 4. ★ `raceNumber` IS NOT `racerNumber`, AND THIS IS WHY THE REPORT SAYS SO TWICE

| | `racerNumber` — **removed** | `raceNumber` — **untouched** |
| --- | --- | --- |
| made by | `assignRacers`, from `Math.random` | `assignRaceNumbers`, from the **race seed**, on its own generator |
| drawn as | the `#3` badge in the Players tab | the number on the sprite and in the STARTERS board |
| read by | **nothing**, outside the screen that drew it | the renderer, the board, the scoreboard — 8 files |

**They are one letter apart and only one of them ever reached a race.** A comment now stands where
`assignRacers` used to be, saying exactly that — because the way a removed mechanism comes back is
somebody reading `raceNumber` in the render layer, concluding the Setup Screen is missing something,
and re-adding the wrong one.

---

## 5. WHAT IS PINNED

Four tests assert the **absence**, which is the point — a removal nothing watches is a removal that
comes back:

- **the badge is gone**: `queryByText(/^#\d+$/)` is null with two players on screen;
- **the reshuffle control is gone**: no `/Reshuffle/i`, no `🔀`;
- **the list reads alphabetically**, whatever order the names arrived in;
- **adding a name stamps no number on anybody** — every player object is asserted `not.toHaveProperty('racerNumber')`, and the same for a group arriving through the picker.

**Sixteen tests were deleted**, eleven on `assignRacers` and five on its object-entry form. All
sixteen were correct about a function that no longer exists. **Nothing replaces them**, because
nothing replaces the function; a note stands in their place saying so, so the gap reads as a decision
rather than as erosion.

**157 tests green** across the Setup Screen, the Dev Screen's group manager and `RandomHelper`.

---

## 6. NOTHING CHANGED THE GAME

| role | |
| --- | --- |
| world | **unmoved** |
| world-off | **unmoved** |
| camera | **unmoved** |
| render | **unmoved** |

All four re-run against the record. `RandomHelper.js` is inside the engine hull — `rowLayout.js`
imports `shuffle` from it — so the engine-reach advisory is right to fire on it, and the world
fingerprint answers it rather than an argument about which export was touched.

---

## Limits

**This is on `feat/player-groups-1`, not on master.** It belongs there because SHUFFLE-REACH-1 lives
there and because `PlayerSetup.jsx` and `PlayerGroupPicker.jsx` only have their current shape on that
branch — the same edit against master would conflict with every line of it. **It therefore ships when
that branch ships and not before**, which is a coupling worth naming: a decision the owner made about
the *badge* now waits on his judgement of *player groups*.

**The Quick Test path was not re-traced.** `handleQuickTest` appended filler names with no
`racerNumber` even before this, so it had nothing to lose; that was read, not run.

**"Nothing reads it" is a text search, not a runtime proof.** A dynamic property access — `p[key]`
with `key` computed — would be invisible to it. None was found and none is likely in this code, but
the claim is what a grep can support.

**A stale `ACTIVE_GROUP` in somebody's browser still carries the old field.** It is read once and
cleared, and nothing reads the field, so it is inert rather than handled. No migration was written
and none seems worth writing.
