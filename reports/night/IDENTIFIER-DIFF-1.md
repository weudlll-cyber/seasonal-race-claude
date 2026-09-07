# IDENTIFIER-DIFF-1 — the identifier carries only what differs

**Date:** 2026-09-07
**Branch:** `night/2026-09-06`, off master `554f348e`. **Not merged.**
**Kind:** build. **What a race is WRITTEN as changes; what a race IS does not.**
**Fingerprints:** not owed — `engine-reach --check` says none of the four changed paths can reach
the engine. Golden races run anyway and **PASS**. **Nothing minted.**

---

## Re-verified on the current build, not carried over

IDENTIFIER-LENGTH-1's figures are **that report's claims**. This piece measured its own, and the
basis is stated because the two are not on the same one.

`raceIdentifier.js:186` wrote `e: world?.effectiveRacerTypes ?? {}` — all twenty racer types in
full, every time, whether the race used them or not — while the config half beside it (`c`) was
already a **diff** against the shipped defaults. So the mechanism this piece needs was already in
the file, applied to one of the two blocks and not the other.

**On my basis** (garden-path, beetle, seed 12345, 3 laps, names `Racer 1…N`, a short build stamp,
config exactly shipped):

| racers | OLD — full `e` | NEW — diff `ed` | saved |
|---:|---:|---:|---:|
| 4 | 2,547 | **230** | 2,317 (91.0%) |
| 20 | 2,775 | **458** | 2,317 (83.5%) |
| 40 | 3,068 | **751** | 2,317 (75.5%) |

**The saving is a constant 2,317 characters** — the racer-type block does not grow with the field,
which is exactly why it dominated a small race. My absolute totals sit about 940 characters below
IDENTIFIER-LENGTH-1's 3,487 / 3,715 / 4,008 because that report measured a real build stamp and real
names where this uses short synthetic ones; **the delta is the basis-independent number.** Option A
predicted **739** at 40 racers and this lands at **751** — the same answer, arrived at
independently.

With one genuine racer-type override in the race, the 40-racer identifier is **795** characters: the
diff carries what actually differs, and nothing else.

---

## What was built

**`e` is no longer written; `ed` carries the diff.** The encoder now takes
`defaultEffectiveRacerTypes` and writes
`diffFromDefaults(world.effectiveRacerTypes, defaultEffectiveRacerTypes)` — **the same
`diffFromDefaults` / `applyDiff` pair the config half has always used**, already tested and already
exercised by every existing identifier. Nothing was written to shorten a string that did not exist
in the file already.

**The base is `CONFIG_SNAPSHOT`, which also already existed** — `racer-types/index.js:244`, frozen,
documented as *"Snapshot of original code-default values for all tunable fields, captured before any
boot-time override is applied"*. That is precisely the base required: derivable from code on any
build, and unaffected by whatever this machine has stored. **No engine change and no new snapshot
mechanism.**

**One body, two callers.** `effectiveRacerTypes()` (live registry) and the new
`defaultEffectiveRacerTypes()` (snapshot) now share `racerTypeFields(configFor)`, so the field list
and the "omit a field the config does not define" rule cannot drift between them. Two shapes that
must be diffable against each other are produced by one function.

### ★ How both forms are recognised, said at source

```js
effectiveRacerTypes:
  payload.w && 'ed' in payload.w
    ? applyDiff(defaultEffectiveRacerTypes ?? {}, payload.w.ed ?? {})
    : (payload.w?.e ?? {}),
```

An identifier written before this piece carries `e` and no `ed`; one written after carries `ed` and
no `e`. **The discriminator is which key is present**, tested with `'ed' in` rather than for
truthiness — because an empty diff, which is the whole point of this piece on an untouched machine,
is `{}` and must not fall through to the old branch.

★ **There is no version bump and no migration**, and that is deliberate on two counts: the project's
standing rule forbids them, and a version bump would have **REFUSED every identifier the owner has
already copied out** — the one thing this piece may not do.

---

## ★ The cost, stated plainly and not solved

**A diff is read against the defaults of the build that DECODES it.** If a shipped racer-type value
moves between the day an identifier is written and the day it is read, that identifier now describes
a different race — silently, because the omitted value is not in the string to disagree with
anything.

This is not a hypothesis. It is demonstrated by a test that decodes one identifier against a base
with one value moved and asserts the world that comes back is **not** the world that went in.

**Two consequences worth being clear about:**

1. **A same-build round trip cannot detect it.** Encoder and decoder read the same base inside one
   build, so a changed default shifts both sides equally and every comparison still passes. The
   obvious test is blind to the risk by construction.
2. **The old form had the opposite trade**, and it is worth naming rather than pretending this is
   free: carrying all twenty types in full made an identifier self-describing — it meant the same
   thing on any build, at 2,317 characters. What is bought is length; what is paid is that meaning
   now depends on the reader.

The identifier's build stamp already refuses a string from a different build on the pasted path, so
the exposed case is a stamp that stays equal while a racer-type default moves under it.

**Nothing is proposed.** The alternatives are the owner's to weigh.

---

## Meaning: proved with the existing instrument, race by race

`raceIdentifierReproduction.test.js` — `raceHash` (identity, including the roster's names, which are
physics) and `hashWorld` (the config world). **13 tests, all green**, including four added here.

### ★ The existing test was green for the wrong reason, and that had to be fixed first

Before this piece the fixtures passed **no** racer-type base. With no base the diff is taken against
`{}` and comes out as the full object again — so the round trip passed while **never exercising the
new path**. The fixtures now carry the real base. Finding that was the difference between a sabotage
that means something and one that cannot fail.

### Sabotage

Once, as instructed: `HorseRacerType.js`'s `speedMultiplier` — a value the identifier now **omits** —
changed from `1.0` to `1.23`.

**First attempt did NOT go red**, and that is recorded because it is the finding above: encoder and
decoder shared the corrupted base, so the round trip still matched. The catcher therefore had to pin
the value to a **literal** rather than to a comparison. With that in place:

- ★ *"an OMITTED default comes back as the value it is supposed to be"* — **RED**
- ★ *"decoded against MOVED defaults, the same string is a different race"* — **RED**

**2 of 13 red under sabotage; reverted; 13 of 13 green.** The omitted value is genuinely
load-bearing, and its movement is now visible in exactly one place.

---

## What was not touched

The store, the short key and the team branch are untouched, as instructed —
`server/src/races/`, `shared/raceShortKey.mjs` and `feat/team-races-1` have no change from this
piece. Nothing that draws and nothing in the engine hull was changed.

`engine-reach --check`, verbatim:

```
ENGINE REACH: none of 4 path(s) carry a change that can reach the race engine.
  4 outside the hull (cannot reach the engine at all): client/src/modules/exportRaceConfig.js, client/src/modules/raceIdentifier.js, client/src/modules/raceIdentifierReproduction.test.js, client/src/screens/SetupScreen/SetupScreen.jsx
```

**Nothing dead was left behind:** `e` is no longer written by the encoder, but the decode branch that
reads it stays and is under test — it is the compatibility path, not dead code, and deleting it
would break every identifier already in the owner's hands.

verify: **PASS 14 FAIL 0 SKIP 18**, client suite 201 s green. Golden races pass.
