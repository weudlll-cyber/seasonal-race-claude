# GARDEN-PATH-ICON-1 — the icon was already fixed in the repo, and that is why he still sees a snail

**One tracked file changed** — a test fixture — plus one **gitignored runtime file**, which is the one
he actually sees.

**THE GATE DECISION, made by `engine-reach --check` and not by me**, as the brief required:

```
$ node scripts/engine-reach.mjs --check client/src/test/fixtures/sampleTracks.js
ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): client/src/test/fixtures/sampleTracks.js
```

**It selects nothing, so nothing is minted and there is nothing to stop for.** No fingerprint is in
reach. (Worth noting given BACKLOG-TRUTH-2 hours earlier: that advisory is unreliable for *data*
paths, because a JSON file is never an import edge. Here the path is a JavaScript test fixture under
`client/src/test/`, which is the case the hull answers correctly.)

---

## THE FINDING: THE REPO WAS ALREADY RIGHT

The brief says the icon and description still say snail. **In the repository they do not, and have not
since GARDEN-PATH-BEETLE-SKIN-1.** `server/seeds/tracks/garden-path.json` reads:

```json
"icon": "🪲",
"description": "A leisurely (yet surprisingly competitive) scuttle through the roses.",
"defaultRacerTypeId": "beetle",
```

**He still sees a snail because the running application never received that change**, and it never
will. `server/src/seedRuntime.js`:

```js
const dest = join(destDir, file);
if (existsSync(dest)) continue;   // ← the whole of it
```

**Seeding copies a record only when the destination does not exist.** Once `server/data/tracks/
garden-path.json` was written — on first boot, long before either garden-path decision — **no edit to
the seed can ever reach it.** Not by restarting, not by re-seeding; the copy is skipped by design.

### And the two halves of the beetle work landed differently, which is the proof

| field | seed (repo) | runtime (what he sees) — **before this piece** |
|---|---|---|
| `defaultRacerTypeId` | `beetle` | **`beetle`** ✅ |
| `icon` | 🪲 | **🐌** ❌ |
| `description` | "…scuttle through the roses." | **"…crawl through the roses."** ❌ |

**The racer arrived and the skin did not.** GARDEN-PATH-DEFAULTS-1's beetle reached the runtime record
somehow — it was applied to the live data, which is why his races got shorter and why all four
fingerprints moved. GARDEN-PATH-BEETLE-SKIN-1 changed **only the seed**, so its icon and description
stopped at the repository boundary.

**That is not a snail bug. It is a delivery mechanism that silently drops updates**, and the icon is
just the first place it became visible.

## WHAT THIS PIECE CHANGED

1. **`client/src/test/fixtures/sampleTracks.js`** — the one tracked file. It still described
   garden-path as `icon: '🐌'`, `defaultRacerTypeId: 'snail'`, "crawl through the roses", contradicting
   the shipped seed. **A fixture that disagrees with the record it stands in for will eventually be
   used to prove something false.** Now aligned.
2. **`server/data/tracks/garden-path.json`** — the runtime copy, gitignored operational state. Icon
   and description brought to the seed's values. **This is the change he will see**, and it needed no
   commit because the file is not tracked.

**Nothing else was touched.** The `snail` racer type keeps its 🐌 — it is a real racer and its own
tests assert that emoji correctly. Only garden-path's *track* record was wrong.

## THE PART THAT IS NOT FIXED, AND IS NOT MINE TO FIX HERE

**Every shipped track record has this problem.** Any future edit to `server/seeds/tracks/*.json` —
name, colour, difficulty, default winners, geometry — is invisible to every existing install. The
runtime copy of nine other tracks may already differ from their seeds in ways nobody has looked for.

**I did not audit the other nine**, because that is a different piece with a different verdict, and
this one was scoped to an icon. **It should be audited**, and it is the first proposal.

## CONFORMITY

- `engine-reach --check` selected the gates, not me; it selected nothing, so nothing was minted and
  no fingerprint run was needed.
- No browser gate and no client suite beyond the ordinary `verify` routing — the change is one test
  fixture and one untracked file.
- The runtime edit is operational state, not a repository change, and is reported rather than hidden.

## PROPOSALS

**P1 — audit the nine other runtime track records against their seeds.** One `diff` per track. It is
minutes of work and it either confirms the rest are clean or finds more of what the icon was. **Until
that is run, "the shipped tracks look right" is an assumption**, and this piece is evidence against
it.

**P2 (mine) — seeding should UPDATE the fields a track record does not own, not skip the file.** The
`existsSync → continue` rule exists to protect a user's edits, which is right — but it protects them
against the shipped record's own corrections too, and it cannot tell the two apart. A record could
carry the seed version it was created from, and seeding could update the presentational fields (icon,
description, colour) while leaving anything the user has touched alone. **That is the smallest change
that makes a seed edit mean something for an existing install.**

**P3 (mine) — the mismatch is mechanically checkable, so it should be a guard rather than a
discovery.** A check comparing every `server/data/tracks/*.json` against its `server/seeds/` twin, and
listing fields that differ, would have surfaced this the day GARDEN-PATH-BEETLE-SKIN-1 landed instead
of a day later via the owner's eye. It cannot run in CI — the runtime directory is a local artefact —
but it can run in `npm run dev`'s startup, where it would print a line and cost nothing.

**P4 (mine) — this is the second time tonight that a change "landed" without reaching where it
mattered.** ROADMAP-FOLD-1 moved 35 sections and left the ownership; GARDEN-PATH-BEETLE-SKIN-1 changed
the seed and left the running app. **Both were filed as done, and both were.** The common shape is a
change whose *effect* has a second hop nobody owns. It is worth a line in the ship ceremony: **when a
change edits a record that is COPIED somewhere at runtime, say in the report which copy the reader
will be looking at.**
