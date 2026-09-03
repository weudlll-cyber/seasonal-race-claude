# SHUFFLE-REACH-1 — NO. The shuffle does not decide the race numbers, and it does not decide the start grid either. It reorders one list.

> **His question, 2026-09-04:** *can I shuffle the names in the Players tab, and does the order I see
> there determine the race numbers the racers carry in the race?*
>
> **The answer is NO**, and the reason is that there are **two different numbers with almost the same
> name**. Nothing was changed; this is an answer.

---

## 1. THE TWO NUMBERS

| | `racerNumber` | `raceNumber` |
| --- | --- | --- |
| where it is made | `assignRacers()`, Setup Screen | `assignRaceNumbers()`, Race Screen |
| what draws it | the `#3` badge beside a name in the Players tab | the number on the sprite, and the STARTERS board |
| what it is drawn from | `Math.random`, re-rolled on every add, remove and 🔀 | the **race seed**, on its own generator |
| who reads it outside the Setup Screen | **nobody** | the renderer and the board |

**They are never the same number and they never talk to each other.** Grepped across `client/src`:
`racerNumber` appears in `RandomHelper.js` and in Setup Screen files, and nowhere else. It rides into
`activeRace.racers` with the rest of the roster and onto the racer object in the race, where it sits
unread.

---

## 2. WHAT ACTUALLY DECIDES THE NUMBER IN THE RACE

`raceNumbers.js` → `assignRaceNumbers(count, racePlanSeed)`. It draws **a permutation of 1..N from
the race's seed**, on a generator it builds and throws away, and the result is attached by racer
**index**:

```js
const raceNumbers = assignRaceNumbers(raceState.racers.length, racePlanSeed);
…
r.raceNumber = raceNumbers[r.index] ?? null;
```

That file's header says why it is built this way, and the reason is not cosmetic: if the numbering
drew from the race's own random stream it would shift every later draw and **the numbering would
decide who wins**. So it is deliberately sealed off from everything the Setup Screen does — including
the shuffle.

**Same seed, same numbers, every time. Change the seed and they change.** Nothing you do in the
Players tab moves them.

---

## 3. ★ AND IT DOES NOT DECIDE THE START GRID EITHER, WHICH IS THE ANSWER I EXPECTED TO BE DIFFERENT

The obvious remaining candidate is the start row — *maybe the order at least decides who lines up
where*. It does not, and for a reason worth knowing:

**`assignRacers` shuffles the NUMBERS, not the ARRAY.** Run three times on the same four names:

```
order: Ann,Bob,Cid,Dee   numbers: 1,3,2,4
order: Ann,Bob,Cid,Dee   numbers: 1,4,2,3
order: Ann,Bob,Cid,Dee   numbers: 3,4,1,2
```

The roster array stays in **insertion order** for ever. A racer's `index` is its position in that
array, and the start grid is `computeEvenRowLayout(racerCount, rowCount, raceRng)` — a shuffle of
*indices* driven by the **seeded race RNG**, keyed by that index.

**So the grid is decided by (how many racers, the track's width, the race seed), and by the order you
typed the names in — never by the order you see.**

---

## 4. THEN WHAT DOES THE SHUFFLE DO? — IT REORDERS THE LIST ON SCREEN

`PlayerSetup` renders the roster sorted by `racerNumber`. That is the entire effect: the button
re-rolls the number, the list re-sorts, and nothing downstream notices.

**Your expectation that an ordering control should order something is right, and it does order
something — just the smallest possible something.** The button is labelled **“🔀 Reshuffle racer
assignments”**, which reads as a promise about the race and is a statement about a list. **Nothing was
changed here**, because the label is yours to decide and because renaming a control is not an answer
to a question about behaviour.

---

## 5. THE CONFUSION IS A `#` BESIDE A NAME IN BOTH PLACES

You see `#3` next to a name while setting up. You then see a `7` on that racer's sprite and on the
STARTERS board. **Both are called “the number” in ordinary speech and neither is the other.**

VERIFY-RULES **R16** names exactly this shape — two numbers side by side share one identity or carry
their own — and it is normally applied to reports. It applies to a screen just as well: the Players
tab's badge carries no hint that it is not the race number, because until the race starts there is
nothing to compare it against.

**Options, none taken, all yours:**

1. **Say what it is** on the Players tab — *"list order only; race numbers are drawn from the seed"*.
2. **Drop the badge entirely.** It is read by nothing and re-rolls on every keystroke that changes the
   roster; the list would then sort alphabetically, which is what a start list normally does.
3. **Make the shuffle mean something** — have it reorder the array rather than the numbers, so it
   changes the start grid. **That changes the race**, needs a mint, and is a different question from
   the one asked.
4. **Leave it.** It costs nothing and the STARTERS board already shows the real number before the gun.

---

## Limits

**This traced the DEFAULT path — Start Race from the Setup Screen.** Quick Test builds its roster
differently (`handleQuickTest` appends filler names with no `racerNumber` at all) and was not traced
here; the race-number half is identical, because `assignRaceNumbers` runs in the Race Screen on
whatever roster arrives.

**"Nobody reads `racerNumber`" is a grep over `client/src`.** It is not a proof about `scripts/` or
the server, neither of which sees a Setup Screen roster — but the claim as stated is about the client.

**Nothing here was measured by running a race.** It is a code trace plus one direct check that
`assignRacers` preserves array order. The claim that the same seed gives the same race numbers rests
on reading `assignRaceNumbers`, not on observing two races.
