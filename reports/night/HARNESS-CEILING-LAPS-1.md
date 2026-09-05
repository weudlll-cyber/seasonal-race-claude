# HARNESS-CEILING-LAPS-1 — the fixed ceiling and the hardcoded lap count

**Block:** PIECE H of the night chain of 2026-09-04. Branch `night/2026-09-04`, off master `6953722d`.
**Answers:** `docs/BACKLOG.md` — "THE CANONICAL SILENT ZERO HEALED BY ACCIDENT AND COULD RETURN AT ANY
TIME", carried since the night of 2026-08-25.

**Nothing in the picture, the race, a default or a threshold moved. No fingerprint was minted, and
all four were re-run and are unmoved.** The ceiling was **not** raised.

---

## 1. Re-established at source

The backlog's verdict of 2026-09-02 cited `raceDriver.mjs:201` and `:319` "at `e4b2b075`". Both had
moved. Read fresh on tonight's tree, in `scripts/lib/raceDriver.mjs`:

| | where | what it said |
| --- | --- | --- |
| the lap count | inside `buildRace`'s `createRaceFromIdentity` call | `laps: shape.isOpen ? 1 : 2` |
| the ceiling | the `runRace` frame loop | `while (st.finishedCount < identity.racers && ts - raceStart < 200000)` |
| the ceiling, documented | `runRace`'s header | "a 200 s wall-clock ceiling so a stuck race cannot hang a sweep" |

**★ AND ONE FACT THE BACKLOG DOES NOT CARRY: THE TRACK RECORDS ALREADY SAY HOW MANY LAPS THEY RUN.**
The key is `defaultLaps`, and it is present in both `server/data/tracks/` and `server/seeds/tracks/`
— identical in the two. The driver was not filling a gap in the data. It was ignoring the data.

---

## 2. How many of the ten would exceed the ceiling — **ZERO**

**Method:** one race per track through the real `buildRace` + `runRace`, at each track's own
`defaultRacerTypeId` read from its seed record (never hardcoded), under `resolveIdentity()`'s
defaults — **40 racers, 60 requested seconds, race seed 5601**, camera seed derived from it. A race
counts as truncated when `finishedCount < racers` and the virtual clock reached the ceiling.
**N = 1 race per track, 10 races.** One race per track answers this question because the quantity is
whether the race can finish at all, not how it varies.

| track | shape | racer | `defaultLaps` | driver's laps | finished | race, virtual | of the 200 s ceiling |
| --- | --- | --- | --- | --- | --- | --- | --- |
| city-circuit | closed | motorbike | 2 | 2 | 40/40 | 84.1 s | 42% |
| dirt-oval | closed | horse | 2 | 2 | 40/40 | **93.1 s** | **47%** |
| garden-path | closed | beetle | 2 | 2 | 40/40 | 76.9 s | 38% |
| ice-track | closed | snowmobile | 2 | 2 | 40/40 | 79.2 s | 40% |
| searound | closed | manta | 2 | 2 | 40/40 | 68.5 s | 34% |
| luger-hill | open | luge | — | 1 | 40/40 | 62.6 s | 31% |
| mountainstreet | open | boarder | — | 1 | 40/40 | 62.3 s | 31% |
| river-run | open | duck | — | 1 | 40/40 | 64.4 s | 32% |
| seatrack | open | dolphin | — | 1 | 40/40 | 63.0 s | 32% |
| space-sprint | open | rocket | — | 1 | 40/40 | 63.0 s | 32% |

- **Tracks that exceed the ceiling at their own defaults: 0 of 10.**
- Longest race: **dirt-oval, 93.1 s** — the ceiling has better than **2×** headroom over the worst.
- Closed tracks whose record disagrees with the literal `2`: **0 of 5.**
- Closed tracks whose record has no lap count (which would now throw): **0 of 5.**
- Open tracks have no `defaultLaps` at all — **5 of 5** — and the open branch never asks for one.

**So both changes below are inert on today's ten tracks.** That is why the world fingerprint can be
expected to hold, and it does.

---

## 3. What was changed

### 3a. The lap count comes from the record, and THROWS rather than substituting

`laps: shape.isOpen ? 1 : lapsOfClosedTrack(geo)`. The helper reads `geo.defaultLaps` and throws,
naming the track, if it is not a positive integer.

Quietly picking `2` is how the old literal came to be believed. It is half of the canonical silent
zero: GARDEN-PATH-NO-FINISH-1 lost 360 of 360 races to a race too long for the ceiling, **at a lap
count nobody had chosen for that track**, and it was healed by ACCIDENT when the owner's beetle
decision made the race shorter. The literal never moved.

An open track runs one lap by definition and has no lap structure to read, so only the closed branch
consults the record.

### 3b. A truncated race is no longer returned as if it were a race

The loop always had **three exits** — everyone finished, the caller said stop, the ceiling ran out —
and returned **one indistinguishable value** for all three. Of the 44 callers of `runRace`, exactly
one reads the return value at all (the driver's own test), so the ceiling exit has been invisible at
every call site in the repository.

It now throws, naming the track, the finished count, the total, and the virtual time reached.

**Why throw rather than return a flag:** a flag repeats the defect — the 43 callers that do not read
the return value would not read that either. There is no correct way to continue past a truncation,
because every number taken from a truncated race describes a race the product does not run.

**A caller that stops the run itself is NOT a truncation.** `onFrame` returning `false` is the window
harnesses' documented way to measure part of a race; they finish nobody on purpose and are untouched.

### 3c. ★ The ceiling is NOT raised

Deliberately, and it is the piece's own rule: making the existing limit audible needs no
justification, and choosing a new one is a decision that does. **A truncation that reports itself is
the fix.** If a future track needs more than 200 s, the harness will now say so by name.

---

## 4. The sabotage — 4 of 4

Two controls, so a pass is not a pass by inertia, and two mutations.

| | expected | result |
| --- | --- | --- |
| CONTROL: a shipped closed track (`city-circuit`) races and returns | no throw | **PASS** |
| CONTROL: `onFrame` returns `false` at frame 30 | no throw | **PASS** |
| SABOTAGE: `city-circuit` with `defaultLaps` deleted | throws, names the track | **PASS** — *"track "city-circuit" is closed but its record does not say how many laps it runs (defaultLaps=undefined)"* |
| SABOTAGE: `city-circuit` at `defaultLaps: 40` | throws, names track and both numbers | **PASS** — *"the race on "city-circuit" hit the 200 s ceiling with 0 of 40 racers finished, after 200.0 s of virtual time"* |

The mutated records were built in the probe, not written to the repository; nothing under
`server/` was edited.

---

## 5. Measurements already on record that were taken above the ceiling — **none found, with a caveat**

The piece asks that existing recorded measurements taken above the ceiling be named so a reader knows
which figures describe a truncated race. **The only one this project has recorded is
GARDEN-PATH-NO-FINISH-1's 360 of 360**, which the backlog already carries and which no longer
reproduces (garden-path finishes at 76.9 s today).

**The caveat is honest and it is a limit of this piece, not a finding:** a truncated race left no
mark anywhere, so there is no way to audit past reports for it. Any figure in `reports/` taken from a
race that hit the ceiling is indistinguishable from one that did not. **From tonight forward that
class cannot be created silently**; before tonight it cannot be enumerated. Nothing was re-run.

---

## 6. Source hygiene

| file | before | after | what changed |
| --- | --- | --- | --- |
| `scripts/lib/raceDriver.mjs` | 481 | 549 | +68: `lapsOfClosedTrack` (14), the ceiling refusal and its reasoning (33), the `trackId` carried on the race object so the refusal can name it (3), the `CEILING_MS` binding and `stoppedByCaller` flag, and the lap-count comment (16). |

Nothing was removed and nothing moved out. No scratch file entered the repository; the probe and the
sabotage live in `C:/tmp`.

**Noticed and deliberately left:** `runRace` still returns `{frames, endTs}` with no reason code, so
the *caller-stopped* and *all-finished* exits remain indistinguishable to a caller. That is the other
half of the backlog's "44 callers, one reads the return value" item, and it needs the design that
entry is waiting on — it is not this piece.

`node scripts/engine-reach.mjs --check scripts/lib/raceDriver.mjs`, verbatim:

```
ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): scripts/lib/raceDriver.mjs
```

All four fingerprints re-run on the changed tree and **UNMOVED**, against `docs/fingerprints.json`:
world `8a1977187e9c99b4` · world-off `aa09ed97a3a32689` · camera `152cf295c4c9ff54` · render
`733b3f100d6a819f`. **No mint.**
