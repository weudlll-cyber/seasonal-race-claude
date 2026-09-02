# RACE-IDENTITY-HASH-1 — the hash is in, it is stamped at the one funnel rather than wired into a list, and R16's own worked example names the wrong tool

> **CHANGES NO PRODUCT CODE AND NO MEASUREMENT.** Three files, all outside the engine hull; every
> fingerprint guard routed **`nothing changed`**; `verify` **PASS 6 FAIL 0**. What instruments print
> gained a field. What they measure did not move.

---

## 1. WHAT WAS BUILT

`raceHash(identity, cameraConfig)` in `scripts/lib/raceDriver.mjs` — `sha256` over a canonical JSON
of the identity and the camera config, first 12 hex, appended to the identity line as `race=`.

**The config is required, and there is no one-argument form.** Passing nothing **throws**:

```
raceHash: cameraConfig is required. A hash over the identity alone cannot tell two arms
apart, which is the case this exists for (VERIFY-RULES R16).
```

That is deliberate. A hash that silently covered less than it claimed would be a worse instrument
than none, and this project has already paid for a check that answered a narrower question than the
one it appeared to answer.

**Canonicalisation sorts keys at every depth**, so a config written in a different key order is the
same config. Otherwise the hash would report a difference that is not one, and nobody would trust it
twice.

---

## 2. ★ IT IS STAMPED AT THE FUNNEL, NOT WIRED INTO A LIST

The brief said to wire it into the instruments R16 governs rather than merely into a library. **Thirty
instruments print an identity line.** Editing thirty call sites would have produced a hand-maintained
list of "instruments that print the hash" — **the exact defect class this chain spent the night
auditing**, and the one piece 4 named as catchable-but-recreatable.

So it is stamped at the single point every instrument's config already passes through:

**`buildRace(geo, identity, cameraConfig)` records the hash on the identity as it goes by.** Every
instrument that prints its identity line *after* building gets the hash with **no edit at all**, and
no list can go stale because there is no list.

Three properties make the stamp safe:

| property | why |
| --- | --- |
| **non-enumerable** | several instruments `JSON.stringify` the identity into `--json` output; a visible new key would change what their consumers parse. Asserted by a test. |
| **accumulates, never overwrites** | a harness building two arms under one identity is the case this exists for. A second, different config makes the line read `race=MIXED(h1,h2) — 2 configs under ONE identity` rather than silently reporting the last one. Overwriting would have reproduced the defect inside the fix. |
| **explicit form still available** | `formatIdentity(id, cameraConfig)` overrides the stamp, for instruments that print *before* they build. |

---

## 3. ★ THE FINDING THAT WAS NOT IN THE BRIEF: R16'S WORKED EXAMPLE NAMES THE WRONG TOOL

Both `docs/VERIFY-RULES.md` R16 and `docs/BACKLOG.md:739` say:

> *"`corridor-truth` and `corridor-truth --company-only` print the SAME identity line and produce
> different numbers."*

**`corridor-truth.mjs` has exactly one flag, `--json`.** It has no `--company-only`, and `grep`ping
it for `company` returns nothing at all. The flag belongs to `scripts/his-shot-truth.mjs:47` and
`scripts/camera-fingerprint.mjs:120`.

**The real instance is `his-shot-truth`, and it is worse than the one that was described** — it
carries *four* arms under one identity line, not two: `--company-only` (`:86`, sets
`cfg.companyOnlyFraming`), `--owner-unit` (`:107`, sets `cfg.referenceCorridorPx`), `--min-racers=`,
and `--defaults`.

**This is the night's pattern again, and it is sitting inside the rule written to catch it.** The
example is not wrong about the shape — it is wrong about which tool has it. Correcting the two
sentences is left to piece 10, which owns document claims, so the correction happens once.

---

## 4. IT SEPARATES — PROVEN ON THE REAL PAIR, NOT A FIXTURE

`his-shot-truth` was wired explicitly, because it prints its identity **before** the loop that builds
races, so the stamp has not happened yet. One line changed. Measured on `city-circuit`:

| arm | identity line, everything left of `race=` | `race=` |
| --- | --- | --- |
| shipped | `n=65 · raceSeed=5601 · camSeed=882944666 · racer=boarder · 60s · 1280x720 · roster=none` | `4106f313b9d9` |
| `--company-only` | **byte-identical** | **`015bb56cc425`** |

**Two arms that were indistinguishable are now distinguishable, and nothing else about the line
changed.**

### And the roster — the input that was actually missing

The identity line already printed `roster=40 names`. **A count cannot catch a different forty
names**, and a racer's name is physics here: `stablePairBit` hashes `r.name`. So the hash covers the
names themselves, asserted with two rosters **of the same length**:

| roster | hash |
| --- | --- |
| `["Turbo","Blaze","Rocket"]` | `bbc157347f3f` |
| `["Turbo","Blaze","Nitro"]` | `a640d333c7cb` |
| `null` | `e75d4a9de77a` |

**A hash that would not have caught the soak's null roster is not worth having.** This one catches it,
and it catches the harder case the count never could.

---

## 5. ★ A LIMIT FOUND BY RUNNING IT, NOT BY REASONING: `--owner-unit` DOES NOT SEPARATE

Arm C, `--owner-unit`, hashes **identically to the shipped arm** — `4106f313b9d9` for both.

**That is correct behaviour and a real limit, and it is stated rather than papered over.**
`--owner-unit` sets `cfg.referenceCorridorPx = TW` **per track, inside the measurement loop**
(`his-shot-truth.mjs:107`), which is *after* the identity line has been printed. There is no single
config for that arm at print time — there are ten, one per track.

**So a per-run hash cannot cover a per-track config, by construction.** The `MIXED` form exists for
exactly this and would report it correctly — but only for an instrument that prints its identity line
*after* its loop, and `his-shot-truth` prints before, deliberately, because R16 itself says a table
gets its identity line above it.

**Not resolved here.** The choice is between a line above the table that cannot see per-track
mutation, and a line below it that can. That is a readability decision about report layout, it
affects an unknown number of the thirty, and it is on the morning sheet rather than taken unasked.

---

## 6. THE PROOF

Eight new tests in `scripts/raceDriver.test.mjs`; **18 of 18 green** in that file.

| what is asserted | direction |
| --- | --- |
| same identity + same config → same hash; key order irrelevant | **JOINS** |
| config alone differs → different hash, while the rest of the line is byte-identical | **SEPARATES** |
| two rosters of equal length, one name different → different hash | **SEPARATES** |
| missing config → throws | refuses |
| unstamped identity → `NO-CONFIG-GIVEN`, loudly | refuses |
| `buildRace` stamps; a line printed after a build needs no edit | the funnel |
| two configs under one identity → `MIXED`, naming both | accumulates |
| `JSON.stringify(identity)` gains no key; `Object.keys` unchanged | non-enumerable |

| claim | how established |
| --- | --- |
| no product code changed | diff is 3 files, all under `scripts/` |
| outside the engine hull | `engine-reach --check` on all three → *"none of 3 path(s) can reach the race engine"*, exit 1 |
| **no fingerprint moved** | world, render, camera and the containment guard all routed **`nothing changed`** — mechanical |
| guards green | `node scripts/verify.mjs` → **PASS 6 FAIL 0 SKIP 20**, script suite and `check-runin-frame` included |

---

## Limits

**The hash does not cover the TRACK.** Instruments loop tracks under one identity and name the track
in every row; a per-track hash could not sit on the identity line at all. Two runs on different tracks
hash the same, and the row says which track.

**It does not cover the TREE.** Two runs of one identity and config on different code hash
identically. This answers *"same race?"*, never *"same build?"* — the build pill and the fingerprints
answer that, and conflating them would be a new way to be wrong.

**It hashes what it was handed.** Whether the config was actually applied to the director is a
different question, and `his-shot-truth`'s `--owner-unit` is the live example of the gap (§5).

**Twenty-nine of the thirty instruments were not individually verified.** The stamp reaches every one
that prints after building, by construction and by test, but I ran one instrument's four arms, not
thirty. Which of the thirty print before their loop — and therefore still show `NO-CONFIG-GIVEN`
until someone passes the config explicitly — was **not enumerated**. That is the honest state: the
mechanism is proven, its coverage across the instrument set is not.

**A visible consequence worth naming:** instruments that embed `formatIdentity(identity)` as a
*string* inside `--json` output now emit a longer string. The identity OBJECT is unchanged; the
formatted line is not. That is the line the brief asked for, and it will appear in those files.
