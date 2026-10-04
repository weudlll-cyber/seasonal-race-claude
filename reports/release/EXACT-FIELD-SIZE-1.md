# EXACT-FIELD-SIZE-1 — a race starts with exactly the number of racers chosen

**2026-10-04, branch `fix/exact-field-size`.** Decided on 2026-10-04: a race always starts with
exactly the number of racers the user chose, on Quick Test and on every other path. Found by
[LARGE-FIELD-PERF-1](../evolution/LARGE-FIELD-PERF-1.md): "Quick Test (80)" started 70.

## Why "Quick Test (80)" started 70

Quick Test fills the field with names from the chosen name list, `resolveNameSet(set)`
(`client/src/modules/racerNames.js`). The default list, `current`, holds **70** names. The fill took
the names the list had and stopped — `SetupScreen.jsx` sliced the list to the number still needed,
and a 70-name list sliced to 80 is 70. The size check, `quickTestFieldSize`
(`client/src/screens/SetupScreen/fieldCap.js`), counted the same short fill correctly, but nothing
refused it: its own comment said the fill "can fall short of N". The button kept reading "Quick Test
(80)".

## Every path that builds a roster from a chosen count

| path | where | short before? | now |
| --- | --- | --- | --- |
| **Quick Test** — fills the field up to N | `client/src/screens/SetupScreen/SetupScreen.jsx:1067` (the fill), `:686` and `:1032` (the size check, `fieldCap.js:62`) | **yes** — any N above the chosen list's length (70 on `current`) | exactly N, from `fillRosterFor(set)`; refused with a reason if even that cannot fill N |
| **The Track Editor's test race** — a fixed 40 | `client/src/screens/TrackEditor/testRace.js:75` | no — 40 from the 70-name default list | unchanged |
| **The ordinary start** — the names on the screen | `SetupScreen.jsx:967` (`racers: players`) | no — the count IS the names typed or loaded | unchanged; now pinned by a test |
| **Adding a player group** | `client/src/screens/SetupScreen/PlayerGroupPicker.jsx:83` | no — every name lands on the screen before Start; a name already there is not added twice, and the screen says so | unchanged |
| **A race identifier, Run again, a looked-up key** | `SetupScreen.jsx` `startRaceFromIdentifier` | no — the roster is the stored one, name for name | unchanged |

Nothing on the server builds a roster from a count.

## The fix

- **`fillRosterFor(set)`** (`client/src/modules/racerNames.js:388`, new): the chosen list first,
  whole and in order, then the existing lists `long`, `mixed` and `current`, skipping any name already
  used. **No new name generator, no new names:** it only joins the three lists that already exist.
  230 different names against a largest field of 100.
- **Names stay different** under `playerNameKey` (`shared/playerNames.mjs`), the same rule that
  refuses the same name twice in a race — reused, not restated. `quickTestFieldSize` now compares with
  it too; it compared exact strings before, so it could count a name the fill would then skip.
- **A field the chosen list can fill is the same race as before.** Names are physics, and the first N
  names of the fill are exactly the chosen list's first N. Only a count past the end of the list
  reaches new names — the case that used to start short.
- **If a count still cannot be honoured, it is refused** — `quick-short-refusal`, the button disabled
  with the same sentence, and the click handler refusing too. With the shipped lists and caps this
  cannot happen; it is there so a later change to a list or a cap fails loudly instead of starting
  short.

## Tests, and each sabotaged once

| test | sabotage | went red |
| --- | --- | --- |
| `exactFieldSize.test.jsx` — Quick Test (80) on the default list starts 80, all different | the fill draws from the chosen list only (the old behaviour) | yes |
| `racerNames.test.js` — the fill has enough different names (≥ 100) | the same | yes |
| `racerNames.test.js` — each chosen list comes first, whole and in order | the other lists first | yes (3 cases) |
| `exactFieldSize.test.jsx` — a count the fill cannot reach is refused, nothing starts | no refusal | yes |
| `exactFieldSize.test.jsx` — the ordinary start runs exactly the names on the screen | one racer dropped | yes |
| `testRace.test.js` (existing) — the test race has exactly 40 racers, all different | one racer short | yes |

**Fingerprints:** `engine-reach` names `racerNames.js` as able to reach the race, so all four roles
were re-minted with `check-fingerprints --mint` (verification only): **all four equal to the record.**
The golden runner and the fingerprint harnesses take their names from the lists, not from the fill.

## Lines before → after

| file | before | after |
| --- | --- | --- |
| `client/src/modules/racerNames.js` | 393 | 433 |
| `client/src/screens/SetupScreen/fieldCap.js` | 69 | 72 |
| `client/src/screens/SetupScreen/SetupScreen.jsx` | 1849 | 1864 |
| `client/src/modules/racerNames.test.js` | 157 | 178 |
| `client/src/screens/SetupScreen/exactFieldSize.test.jsx` | new | 135 |

**Removed:** `resolveNameSet` is no longer imported by `SetupScreen.jsx` (it reads the fill instead).
**Noticed and left:** `fieldCap.js`'s exact-string comparison was a second, silent copy of "the same
name" — replaced by the shared rule here because it sat on the path being fixed.
