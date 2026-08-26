# RACE-IDENTITY-1 — the seed pins the dice, not the race

**Date:** 2026-08-26 · **Branch:** `diag/race-identity-1` (off `master`) · **Piece 3 of
NIGHT-2026-08-25** · **Verdict:** DESIGN ONLY. Nothing built, no key added, no payload changed.

**The owner's complaint, from 2026-08-24:** he knows a race's seed and still cannot bring the race
back. **He is right, and the reason is not that anything is broken.** The seed is one of *nine*
inputs the engine reads. It is the only one anybody writes down.

---

## 1. WHAT ACTUALLY DECIDES A RACE

Established at source, from the two payload builders (`SetupScreen.jsx:438` and `:536`) and what
`RaceScreen/index.jsx:551` feeds `createRaceFromIdentity`.

| # | input | where it comes from | travels with the seed? |
| --- | --- | --- | --- |
| 1 | **`geometryId`** — the track shape | the selected track | **no** |
| 2 | **`racerTypeId`** | Quick Test's selector, else `track.defaultRacerTypeId`, else `'horse'` | **no** |
| 3 | **the name list, IN ORDER** | see §2 — and it is physics, see §3 | **no** |
| 4 | **field size** | `quickTestCount` (Quick Test) / the lobby (normal) | **no** |
| 5 | **`racePlanSeed`** | the seed field, or one drawn at press time | **YES — this is the whole of it** |
| 6 | **`raceActionStage`** | `raceDefaults.raceActionStage` — a **stored global preference** | **no** |
| 7 | **`targetLaps`** (closed) *or* **`targetDurationSec`** (open) | Quick Test: derived from the track's canonical defaults. Normal: the operator's own input | **no** |
| 8 | **`racePlanEnabled`** | derived: `realizedDurationSec >= racePlanMinDur` | **no** |
| 9 | **the world config** — dynamics, base speed, `runoutZone` | `localStorage`, which silently shadows `defaults.js` per key | **no** |

**One of nine.** And #6 and #9 are worse than merely absent: they are *stored preferences on the
host machine*, so two people typing the same seed on the same build get different races without
either of them changing anything.

---

## 2. THE NAME LIST ON THE QUICK TEST PATH — his belief, checked

He believes the name list follows from the field size. **It does, and there are two conditions on it
that do not travel and are invisible on screen.**

`SetupScreen.jsx:504-509`:

```js
const needed = Math.max(0, quickTestCount - players.length);
const existingNames = new Set(players.map((p) => p.name));
const fillNames = resolveNameSet(quickTestNameSet)
  .filter((n) => !existingNames.has(n))
  .slice(0, needed);
const testPlayers = [...players, ...fillNames.map((name) => ({ name }))];
```

**IS THE ORDER FIXED? Yes.** The roster is taken from the head, in declaration order, and appended
after any real players. `identifyNameSet` (`racernames.js:390`) states the same rule from the other
side: *"the browser fills a field from the head of a roster, in order, so entry i is list[i]."*
**There is no shuffle anywhere on this path.** Given the same roster and an empty lobby, field size N
always produces the same N names in the same order.

**DOES THE RACER TYPE CHANGE IT? No.** `effectiveTypeId` is computed at `:499` and never touches
`fillNames`. **But it changes the race in another way that matters more** — see §4.

**THE TWO CONDITIONS.**

- **`quickTestNameSet`** (`:389`) selects between **three** rosters — `current`, `long`, `mixed`
  (`racernames.js:346`). It defaults to `current` and lives in component state. **Change the dropdown
  and the same seed, same track, same count is a different race.**
- **`players`** — anyone already in the lobby. They take the head positions **and** their names are
  filtered out of the fill list, so every subsequent name shifts up. **One real player does not add
  one racer; it re-indexes the whole field.**

**So his belief holds exactly when the lobby is empty and the roster is `current`.** That is his
ordinary case, which is why it has held so far, and neither condition is recoverable from the seed.

---

## 3. WHY ORDER IS NOT COSMETIC

`raceBehavior.js:219`:

```js
function stablePairBit(a, b) {
  const aId = String(a.name ?? a.id ?? a.index ?? '0');
  const bId = String(b.name ?? b.id ?? b.index ?? '0');
  const key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
  …
}
```

**A racer's NAME is an engine input.** The pair key is sorted, so the bit itself does not depend on
order — but the note at `:232` does: *"`r.index < leader.index` flips it for exactly one member, so
the two members of a mutually-approaching pair commit to"* opposite sides. **The name decides the
bit; the INDEX decides who yields.** Both come from the fill order.

This is not a theoretical coupling: renaming a field has already been measured to change the winner
in 14 of 24 races. **A race identifier that carries the field size but not the roster and its order
is not an identifier.**

---

## 4. WHAT IS A RESULT, NOT AN INPUT — and the trap in it

The payload carries values that look like settings and are outputs of the duration model.

| value | status | evidence |
| --- | --- | --- |
| **`realizedDurationSec`** | **RESULT** | `raceCore.js:110` **re-derives it** from its own `durationModel`; the payload's copy is never read by the engine. `SetupScreen.jsx:452` says so outright: *"no derived scalar travels in this payload as an engine input (realizedDurationSec below is carried for display/telemetry only)"* |
| **`paceScale`** | **RESULT** | same model, same re-derivation |
| `racePlanEnabled` | **derived from a result** | `realizedDurationSec >= racePlanMinDur` — so it is decided by inputs 1, 2 and 7, not chosen |
| `targetLaps` / `targetDurationSec` | **INPUT** — the two canonical ones | `RaceScreen:562-563` feeds exactly these into the engine |
| `duration`, `winners`, `eventName`, `subtitle`, `sponsorText`, `trackName`, `timestamp` | presentation | never reach the physics |

**THE TRAP, stated plainly because it is the one that will bite.** `RaceScreen:563` reads
`requestedSeconds: raceData.targetDurationSec ?? raceData.targetDuration ?? 60`. **The realized
duration is what the HUD shows and what a person would naturally write down. Typing it back in as a
duration feeds it as `requestedSeconds` — a different input — and the model derives a different
realized duration from it.** The race looks like it was reproduced and is not the same race.

**And on an open track the racer type moves this number.** `trackDefaultSeconds` is clamped at *this
race's* pace, using the chosen type's speed multiplier (`:518-524`), so switching duck→beetle changes
the target seconds, the realized duration, and possibly `racePlanEnabled`. **Racer type and duration
are not independent fields.**

---

## 5. WHAT AN IDENTIFIER MUST CARRY, ON EACH PATH

### Quick Test — bounded, because the field is generated

| carries | why | cost |
| --- | --- | --- |
| track id | input 1 | `river-run` — 9 |
| racer type id | input 2 | `duck` — 4 |
| field size | input 4 | 2 |
| name-set key | §2's first condition | 1 (`c`/`l`/`m`) |
| seed | input 5 | 1–4 typed, up to 16 for a sim replay seed |
| action stage | input 6 | 1 (`q`/`n`/`w`) |
| **lobby-empty flag** | §2's second condition — **without it the string lies** | 1 |
| build id | inputs 9 and every physics change | 8 |

**≈ 30–40 characters**, e.g. `river-run/duck/20/c/13/q/-/c0cef7b8`.

### Normal "Start Race" — unbounded, because the field is people

Everything above **except** field size and name-set key, which are replaced by **the actual name list
in order** (§3), plus the operator's own `targetLaps` or `targetDurationSec` (input 7, which Quick
Test derives and this path does not).

**Names are arbitrary user strings.** Twenty of them is 150–250 bytes before encoding. **There is no
short form of this path that is honest**, and pretending otherwise is how the current situation
arose.

---

## 6. TWO FORMS, COMPARED

### FORM A — a short string a person can type

`river-run/duck/20/c/13/q/-/c0cef7b8`, ~35 characters, readable off a HUD and typed back.

**Cost, and it is the deciding one:** it can only express a *generated* field. The moment a real
player is in the lobby it is either wrong or must refuse to be issued. **A short identifier that is
silently wrong in the one case the owner cares about — a race he watched with people in it — is worse
than none**, because it looks authoritative.

**Second cost:** it pins the roster *key*, not the roster *contents*. Adding a name to
`QUICK_TEST_NAMES` changes every past identifier's meaning with no way to detect it. The build id
covers this only if roster edits move the build.

### FORM B — a long string to copy

The full input set, JSON, compressed, base64: track, geometry id, racer type, the ordered name list,
seed, stage, the canonical lap/duration input, and the build. **≈ 200–350 characters for a field of
twenty.**

**Cost:** not typable, not readable, and it must be copied from somewhere — so it needs a place in
the UI to live and a way to paste it back, which is real work on both screens.

**What it buys:** it is the only form that reproduces a race with real players, and it is complete by
construction rather than by assumption.

### The honest recommendation, and it is not one form

**Both, with the short one refusing to exist when it would lie.** Form A for Quick Test with an empty
lobby — which is *almost always* what he is doing when he asks this question — and Form B whenever
the field contains anyone the roster did not generate. **The refusal is the feature**: an identifier
that declines to be issued teaches the distinction, where a short string that quietly drops the
player list teaches nothing until a race fails to reproduce.

---

## 7. PROPOSALS — none ordered

### A — MINE: make the HUD show what the race RAN with, before building any identifier

Every input in §1 is already in `sessionStorage.activeRace` at race time. **Displaying them costs
nothing and needs no format decision.** He could then reproduce a race by hand today.

**Cost:** it is not an identifier — no round trip, no paste-back. **What it buys:** it settles what
the identifier must contain by making the answer visible, and it is the only item here that helps
before anything is designed.

### B — MINE: fix the two inputs that are stored preferences, not race properties

`raceActionStage` (input 6) and the world config (input 9) are read from host storage at press time.
**They already travel in the payload** — `raceActionStage` does, with a comment at `:466` saying
exactly why: *"a race that cannot say which stage it ran cannot be replayed."* **The world config does
not.**

**Cost:** carrying a config snapshot in every race payload is not free and duplicates a value whose
one home is `defaults.js` — the project's own rule cuts against it. **What it buys:** it closes the
case where the same identifier means different races on two machines. **Conservative reading, and
mine: record a config FINGERPRINT rather than the config** — enough to detect the mismatch, not
enough to duplicate the values.

### C — MINE: Form A refuses rather than truncates

Stated as its own proposal because it is the part most likely to be dropped as a nicety. An
identifier that cannot represent the race must say so. **Cost: a branch and a message.** **What it
buys:** it is the difference between "the seed does not pin a race" being discovered once, by
design, and being rediscovered every time someone tries.

### D — do NOT put `realizedDurationSec` in any identifier

Named to be refused. It is a result (§4), it is the number the HUD shows, and it is therefore exactly
what a person would copy. **Feeding it back in produces a different race and no error.** If it appears
at all it must be labelled as an outcome, never as a field.

---

## 8. SOURCE HYGIENE, AND WHAT WAS NOT RUN (R15)

Everything above is read at source and cited with file and line: both payload builders
(`SetupScreen.jsx:438` and `:536`), the fill logic (`:504-509`), the roster table
(`racernames.js:346`), the order rule (`:390`), the physics coupling (`raceBehavior.js:219`, `:232`),
the engine's re-derivation (`raceCore.js:110`) and what it is actually fed (`RaceScreen:551-563`).
**No claim here rests on running anything**, which is why nothing was run.

**Nothing was changed.** No key, no payload, no UI. This branch adds one report.

**Not run, and why:** no fingerprints, no browser gate, no client suite, no server suite — this is a
docs-only change and no file any guard reads was touched.

**Two things I did not establish.** Whether roster edits move the build id, which decides whether
Form A's key-not-contents weakness is covered (§6) — it is named as a condition, not assumed. And the
exact byte length of Form B, which depends on a compression choice nobody has made; the 200–350
figure is arithmetic on the name list, not a measurement.

---

## 9. CONFORMITY

| the brief asked | delivered |
| --- | --- |
| DESIGN, DO NOT BUILD | Yes — nothing changed |
| establish at source that Quick Test's name list follows from field size | §2 — it does, **with two conditions that do not travel** |
| **whether the ORDER is fixed** (order decides duels) | §2 — **fixed, no shuffle**; §3 shows why it decides duels, at source |
| **whether the racer type changes it** | §2 — **it does not change the names**; §4 — it **does** change the duration on open tracks |
| which inputs decide a race; which travel with the seed; which do not | §1 — **nine inputs, one travels** |
| what an identifier must carry on each of the two paths, and how long | §5 — Quick Test ≈ 30–40 chars; normal is **unbounded by construction** |
| two forms compared with costs — short typable, longer copy | §6 — and the recommendation is **both, with the short one refusing when it would lie** |
| state plainly which stored values are RESULTS not inputs; the duration is one | §4 — with the mechanism of the trap at `RaceScreen:563` |
| PROPOSALS with at least two of your own | §7 — three are mine (A, B, C); D is named to be refused |

**One thing the brief did not ask for and this report adds:** input 9. The world config is read from
`localStorage` at race time and does not travel in the payload at all, so it is the one input that
can differ between two machines running the same identifier on the same build. Proposal B takes the
conservative branch — a fingerprint, not a copy — because duplicating config values would breach the
one-canonical-home rule this project applies everywhere else.
