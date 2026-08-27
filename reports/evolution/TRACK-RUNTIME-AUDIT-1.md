# TRACK-RUNTIME-AUDIT-1 — all ten had drifted, none of it mattered, and one of them is his own edit

**Runtime state only.** `server/data/tracks/*.json` is gitignored operational data. **No tracked file
is changed by this piece**, and the seeding mechanism is untouched as instructed.

**WHAT WAS NOT RUN.** No browser gate, no client suite, no fingerprint run: nothing in the repository
changed, so none of them could return a different answer.

---

## THE HEADLINE, WHICH IS TWO THINGS

**All ten tracks had drifted — and the drift was behaviourally invisible.** It was a field *rename*,
not a difference of intent. Every track resolves to the identical lap count or duration under both
shapes, proven by running the shipped functions before anything was touched.

**And one of the ten was not drift at all. It was the owner's own edit**, and repairing it toward the
seed would have destroyed his work.

---

## WHAT DIFFERED, FIELD BY FIELD

**Nine tracks — the legacy duration field.** The seeds carry the current shape; the runtime copies
carried the pre-migration one:

| track | seed | runtime (before) |
|---|---|---|
| city-circuit, dirt-oval, ice-track, searound | `defaultLaps: 2` | `defaultDuration: 60` |
| luger-hill, space-sprint | `defaultDurationSec: 90` | `defaultDuration: 90` |
| mountainstreet, river-run, seatrack | `defaultDurationSec: 60` | `defaultDuration: 60` |

**garden-path — two fields, and both are his:**

| field | seed | runtime |
|---|---|---|
| `surfaceClasses` | `["grass","earth"]` | **`["grass","earth","mud","sand"]`** |
| `updatedAt` | 2026-06-28 | **2026-07-04** |

## WHY THE NINE DID NOT MATTER — measured, not assumed

`durationModel.js` names `defaultDuration` explicitly as legacy and keeps
`legacyLapsFromDefaultDuration` to map it: *"MIGRATION ONLY … nothing in a running race calls it, and
no new track should carry `defaultDuration`."* So the live records were taking a compatibility path
that still exists and still works.

Running the shipped `trackDefaultLaps` / duration resolution against both shapes:

```
track            closed?  seed shape              live shape (before)      SAME?
city-circuit     true     defaultLaps=2           defaultDuration=60       YES  (2 vs 2)
dirt-oval        true     defaultLaps=2           defaultDuration=60       YES  (2 vs 2)
ice-track        true     defaultLaps=2           defaultDuration=60       YES  (2 vs 2)
searound         true     defaultLaps=2           defaultDuration=60       YES  (2 vs 2)
luger-hill       false    defaultDurationSec=90   defaultDuration=90       YES  (90 vs 90)
space-sprint     false    defaultDurationSec=90   defaultDuration=90       YES  (90 vs 90)
mountainstreet   false    defaultDurationSec=60   defaultDuration=60       YES  (60 vs 60)
river-run        false    defaultDurationSec=60   defaultDuration=60       YES  (60 vs 60)
seatrack         false    defaultDurationSec=60   defaultDuration=60       YES  (60 vs 60)
```

**Ten of ten identical.** `legacyLapsFromDefaultDuration(60)` returns 2, which is exactly what the
seeds bake. **No race he has run was affected by this drift**, and none would have been.

**They were repaired anyway**, because the brief asked for his install to be correct and being on a
compatibility path is not the same as being on the current one: a fresh install gets `defaultLaps`,
his did not, and that difference is the kind that surfaces later as "it behaves differently on my
machine". Nine records now carry what the seeds carry. **Re-audited after: nine identical.**

## WHY GARDEN-PATH WAS LEFT ALONE — this is the finding

The live record has **four** surface classes where the seed has two, and its `updatedAt` is **six days
newer** than the seed's.

**The seed has carried `["grass","earth"]` in every commit of its entire history** — checked across
five commits back to 2026-06-17, including both August garden-path ships. It has never held `mud` or
`sand`.

**So the extra classes were not lost from the seed. They were added in the app**, on 2026-07-04, by
the owner using the track editor. **Aligning that record to the seed would have deleted two surface
classes he chose**, and it would have looked exactly like a tidy-up.

It is untouched. Confirmed after the repair: `["grass","earth","mud","sand"]` is still there, next to
the beetle icon that yesterday's piece fixed.

## AND WHAT THIS DOES TO HIS OPEN DECISION

The brief asked to flag drift that would change how the seeding decision looks. **It does, and not in
the direction the garden-path icon suggested.**

The icon case made the mechanism look purely harmful: a shipped correction that could not reach him.
**This audit shows the other half.** `server/data/tracks/garden-path.json` holds an edit of his that
exists nowhere else — not in the seed, not in git, nowhere. **A seeding mechanism that overwrote
existing records to deliver the icon would have silently deleted it.**

So the open question is not "should seed edits reach existing installs" but something narrower and
harder: **which fields may a shipped record correct, and which belong to whoever is running it?**
The icon and description are plainly the project's. The surface classes are plainly his. Nothing in
the record distinguishes them.

**That is his decision and it is left open.** The mechanism is untouched, as instructed.

## CONFORMITY

- Seeding mechanism untouched; no tracked file changed.
- Repairs limited to the nine records whose difference was proven behaviourally null.
- The one record carrying a user edit was identified by history and left alone.
- Backend re-checked after the repair: container up, no restart loop, `GET /api/tracks` → 401
  (auth-gated, alive).

## PROPOSALS

**P1 — the seeds should stop carrying `updatedAt` at all, or the runtime should stop trusting it.**
The seed's `updatedAt` (2026-06-28) is older than commits that edited the file in August, so the field
does not track the seed's own changes and cannot be used to decide which side is newer. **It is a
timestamp that looks authoritative and is not** — which is exactly the trap a future "update if the
seed is newer" rule would fall into.

**P2 (mine) — if the seeding decision is ever taken, the record needs a provenance mark, not a
heuristic.** The blocker is that nothing distinguishes "the project's field" from "the user's field".
A record could carry the seed version it was created from, and per-field ownership could follow from
whether the user has ever written that field. **Any rule based on comparing values or timestamps will
get garden-path wrong**, because its user edit is newer, larger, and equally plausible as a shipped
change.

**P3 (mine) — this audit should be a command, not a night's work.** It is thirty lines and it found a
real user edit nobody knew was only in one place. **A `npm run` script that diffs
`server/data/tracks/*` against `server/seeds/tracks/*` and prints the fields would let anyone check in
seconds** — and would have shown the garden-path icon drift the day it landed. It is not built here
because this piece was scoped to the audit itself, and a new script is a tracked change.
