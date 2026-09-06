# IDENTIFIER-LENGTH-1 — what is in the 4,008 characters, and what each way of shortening it costs

**2026-09-06.** Branch `night/2026-09-05`, piece 2 of NIGHT-2026-09-05. **Nothing was built and no
encoding changed.** No recommendation is made — the choice is the owner's, and this is the table to
make it with. Nothing minted.

---

## 1 · TODAY, RE-MEASURED

**Method.** `encodeRaceIdentifier` called with the world from the REAL `buildWorldConfig({
raceActionStage: 'quiet' })` — the same call the setup screen makes — on shipped defaults, in the
client's own test environment. Rosters are `Racer 1 … Racer N`.

| racers | characters |
| --- | --- |
| 4 | **3,487** |
| 20 | **3,715** |
| 40 | **4,008** |

The owner's screen reported **4,590** for his own race; that is this plus his stored config and his
own roster names, and it was right.

**★ AND THE 743 IN PLAYABLE-FOUR-1 IS EXPLAINED, not merely retracted.** That fixture passed
`effectiveRacerTypes: {}`. Measured below, an identifier with that field emptied is **739** at 40
racers. So the old number was never a measurement of today's encoding — **it was, unknowingly, a
measurement of option A.**

## 2 · WHAT IS IN IT — every encoded field, largest first

Canonical JSON of the payload before base64, at 40 racers. Each field's cost is the whole minus the
whole without it.

| field | chars | share | what it is |
| --- | --- | --- | --- |
| **`w.e`** | **2,454** | **~79%** | `effectiveRacerTypes` — every racer type with its five sim fields |
| `n` | 432 | ~14% | the roster, in order |
| `g` | 16 | 0.6% | the track id |
| `b` | 15 | 0.6% | the build stamp |
| `t`, `a` | 12 each | 0.5% | racer type id, action stage |
| `s` | 9 | 0.4% | the seed |
| `v`, `p`, `l` | 6 each | 0.2% | format version, plan flag, laps |
| `w.c` | **2** | — | the config diff — **empty on shipped defaults** |
| `w.o` | 2 | — | racer-type overrides — empty on shipped defaults |

**★ ONE FIELD IS FOUR-FIFTHS OF THE STRING.** `effectiveRacerTypes` is carried in full for **every**
racer type whether or not the race uses it and whether or not anything is off default. The config
diff — the thing the identifier exists to carry — is **two characters** on a default machine.

## 3 · THE OPTIONS, COSTED — none of them built

| option | 4 | 20 | 40 | what it stops working | what it needs that today's does not |
| --- | --- | --- | --- | --- | --- |
| **today** | 3,487 | 3,715 | 4,008 | — | — |
| **A · `effectiveRacerTypes` as a DIFF from shipped defaults** | **218** | **446** | **739** | nothing, on a machine at defaults. A machine with a retuned racer carries only that racer's changed fields, so it grows only with real deviation. | nothing new — the same argument that already makes `w.c` a diff: `defaults.js` is in the build on both sides, and the build stamp already refuses a foreign build |
| **B · roster carried as a REFERENCE, not names** | ~3,270 | ~3,300 | ~3,435 | reproducing a race whose roster the receiving machine does not hold — and **a name is physics**, so a missing name is a different race, not a cosmetic gap | the receiving machine must already have that exact player group, by id. It also needs a group id that is stable across machines, which player groups do not have today |
| **C · compression alone, exact and lossless** | 1,356 | 1,422 | **1,494** | nothing | a compressor in the client bundle. `CompressionStream` is not available in every environment this code is tested in, so it would mean a dependency |
| **C′ · brotli instead of deflate** | 1,259 | 1,302 | **1,367** | nothing | as C, and brotli is not available synchronously in a browser at all |
| **D · server-stored race, short key** | a handful | a handful | a handful | **repeating a race when the server is gone** | the server. ★ Piece C of PLAYABLE-FOUR-1 built a banner *because the server is sometimes gone*; this option makes repeating a race one of the things that stops when it is |

**A and C compose.** A then C would be roughly 739 → a few hundred; that combination was **not
measured** and is not quoted as a number here.

## 4 · ★ THE OTHER DIRECTION — the geometry gap

The identifier carries the track's **id**, not its **shape**, which is why a device without that
track is refused rather than raced. Carrying the shape would add, per shipped track:

| track | geometry JSON | as base64 | deflated + base64 |
| --- | --- | --- | --- |
| city-circuit | 19,794 | +26,392 | +11,348 |
| dirt-oval | 19,842 | +26,456 | +11,339 |
| garden-path | 19,793 | +26,391 | +11,543 |
| ice-track | 19,743 | +26,324 | +11,452 |
| luger-hill | 19,896 | +26,528 | +11,506 |
| mountainstreet | 20,180 | +26,907 | +11,635 |
| river-run | 19,902 | +26,536 | +11,604 |
| searound | 19,776 | +26,368 | +11,388 |
| seatrack | 20,094 | +26,792 | +11,670 |
| space-sprint | 20,180 | +26,907 | +11,818 |

**Every shipped track adds about 26,400 characters, or about 11,500 compressed** — six to eight times
the entire identifier as it stands today. Closing the geometry gap and shortening the identifier are
opposite moves, and no option above changes that.

## 5 · WHAT IS UNMEASURED, AND WHY

- **Option B's exact length** is an estimate, marked `~`: it is today's payload with `n` removed, and
  a real reference field would add an id of unknown shape. A group id stable across machines does not
  exist today, so there is nothing to measure the length of.
- **A + C combined** — not measured, because it would mean building A.
- **Option D's key length** — not measured: it depends on a scheme nobody has chosen.

## 6 · THE METHOD, SO IT CAN BE REDONE

`encodeRaceIdentifier` with the live `buildWorldConfig`, in the client's test environment; per-field
cost by removing one key at a time from the canonical payload; compression by `node:zlib` on the
base64 body with the 4/3 base64 expansion applied to the result; geometry from
`server/seeds/tracks/*.json`. No shipped default was changed and nothing was written.
