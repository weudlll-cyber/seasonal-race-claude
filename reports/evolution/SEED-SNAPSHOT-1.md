# SEED-SNAPSHOT-1 — his install is the shipped default now; seven lines of diff, four fingerprints unmoved, and the three deletions REFUSED

**The snapshot is taken.** The owner's runtime records are the shipped seeds. The direction was
RUNTIME → SEEDS, one way; **nothing was written into `server/data` by this piece**, and that is shown
below rather than asserted.

**THE THREE ORPHAN BACKGROUNDS WERE NOT DELETED.** All three fail the third condition he set. The
evidence is in its own section; the short version is that they ARE referenced, by track backups in
his own runtime tree, and his condition was certainty.

This is the second of three pieces. **The overwrite mechanism is not built here.**

---

## WHAT SHIPPED — the whole diff, and it is seven lines

```
 server/seeds/player-groups/default-example-group.json |  2 +-
 server/seeds/tracks/garden-path.json                  | 10 ++++++----
 2 files changed, 7 insertions(+), 5 deletions(-)
```

Twenty-one of the twenty-three seed files were **already byte-identical** to the runtime record and
were left untouched. A near-empty diff was the predicted outcome and it is what happened.

**`garden-path.json` — three hunks, two of them the content change the inventory predicted:**

- **`surfaceClasses`** gains `mud` and `sand` — his 2026-07-04 track-editor edit, now shipped.
- **`updatedAt`** moves to 2026-07-04, the honest stamp of that edit.
- **`defaultLaps` MOVED POSITION**, from the end of the object to just after `defaultRacerTypeId`.
  **Its value is unchanged.**

**The third hunk is a correction to SEED-SNAPSHOT-INVENTORY-1, which said garden-path differed in
"exactly two fields".** In content it does — but the inventory compared the two records **leaf path
by leaf path**, which is deliberately order-independent, so it could not see that the two files order
their keys differently. The cause is visible in the history: TRACK-RUNTIME-AUDIT-1 repaired the
runtime record on 2026-08-27 by writing `defaultLaps` where the legacy `defaultDuration` had stood
(near the top), while GARDEN-PATH-DEFAULTS-1 had appended it to the end of the seed. **Nothing reads
JSON key order** — every consumer reads named fields, and the world instrument's own `canon()` sorts
keys before hashing — which is consistent with all four fingerprints coming back unmoved below.
Recorded here because a diff hunk nobody predicted should be explained, not passed over.

**`default-example-group.json` — one line:** the `updatedAt` drift, as predicted.

**Verified after the copy:** every seed file that has a runtime record of the same name is now
**byte-identical** to it. All twenty-three, checked by SHA-256, with a parsed-content fallback that
found nothing left to fall back on.

---

## HOW THE COPY WAS DONE, and why nothing outside the five could enter

The five type directories — `tracks`, `backgrounds`, `brands`, `brand-logos`, `player-groups` — are
**named as a literal list** in the copy script. The data root is never enumerated. `users.json`,
`users.json.bak-*`, `sessions.sqlite`, `recover-admin-audit.log`, `setup-complete.json` and
`tracks-backups/` were never in reach of a directory read.

**The loop walks the SEEDS and looks up the runtime record, not the other way round.** That is the
structural reason the four excluded items could not enter: a runtime record with no seed of the same
name is never visited at all. Exclusion here is a property of the loop, not a filter that could be
got wrong. The run reported `2 seed file(s) rewritten, 21 already identical, 0 seed-only`, and the
seed directories still hold exactly what they held before — 10 / 10 / 1 / 1 / 1 — with no untracked
file anywhere under `server/seeds/`.

The copy ran under `scripts/prove-changed.mjs`, naming the two files that had to move; it reported
both moved, so the copy cannot have silently done nothing.

---

## WHAT DID NOT SHIP, and why it is not at risk later

Four runtime-only items, all confirmed by the owner as test material, **were not copied into the
seeds and were not deleted from his runtime**:

- the **Fantasa** brand record and its PNG logo,
- the **40-name** player group,
- the **German-named** player group.

**Proof they were not touched:** every one of those files still carries its original mtime — the two
brand records 2026-06-17 and 2026-08-22, the logos 2026-06-15 and 2026-06-17 — all long before today.
The runtime store still holds 13 backgrounds, 2 brands, 2 brand-logos and 3 player groups. **He keeps
using them.**

**And nothing about this decision puts them at risk when the overwrite mechanism is built.** Seeding
is keyed **by filename**: `seedTypeFromSnapshot` copies `seeds/<type>/<file>` onto `data/<type>/<file>`
and does not delete, prune, or reconcile — the only `unlinkSync` calls in these routes sit in
user-initiated DELETE handlers. **A record with no seed of the same name is not a target of a by-name
overwrite**, so an overwrite rule cannot reach these four. That is a property of how seeding is keyed,
not a promise this piece is making on the next one's behalf.

---

## THE THREE ORPHAN BACKGROUNDS — REFUSED, and here is the evidence

His condition was certainty. **Two of the three checks pass cleanly. The third fails for all three
files.** Nothing was deleted. These are gitignored runtime files, so a wrong deletion is not
recoverable from git — which is the whole reason the condition was set.

### Check 1 — byte-identity to a named background that remains — **PASSES, all three**

Full SHA-256 over the file bytes:

| orphan | SHA-256 | identical to | that file remains |
|---|---|---|---|
| `2c02ee38d898.jpg` | `376025584008ba2b702e5fd0b47f625ee7884e7f546175e8a838ffb72059d8d0` | `dirt-oval.jpg` | yes — runtime AND seed |
| `d4ee12be7c33.jpg` | `991c992333c866d4333397e358b712a2cbf706b27a3991ae9e5308f0d706bf99` | `city-circuit.jpg` | yes — runtime AND seed |
| `e26cbbcb1cc5.jpg` | `9bc2c563925b90bd094ff93e2c29b7e868fdc0e5506bd150effc15bdc0358f0a` | `ice-track.jpg` | yes — runtime AND seed |

**No image content would be lost.** This is the strongest of the three and it holds exactly as the
inventory said.

### Check 2 — no track record references them — **PASSES, runtime and seeds**

All twenty track records (ten runtime, ten seed) were searched: **zero hits** for any of the three
names. Every one of the twenty names `<track-id>.jpg` as its `backgroundImageFile`.

### Check 3 — nothing else in the repository or the runtime tree — **FAILS, all three**

Searched **every one of the 2,297 tracked files** via `git grep`, and then the **entire tree**
including every gitignored path (`server/data/**`, `client/dist/`, `logs/`, `outputs/`, `results/`,
`client/test-results/`, `.playwright-mcp/` — everything but `node_modules/` and `.git/`).

**Tracked files: two hits, both harmless.** `reports/evolution/LOCAL-INVENTORY-2.md` lists them in a
file-size inventory, and SEED-SNAPSHOT-INVENTORY-1 names them as findings. Prose, not references.

**The runtime tree: NINE hits, and they are real references.** In `server/data/tracks-backups/`:

```
2026-06-28/21-58-33-212-2c02ee38d898.json   2026-06-29/17-58-12-723-e26cbbcb1cc5.json
2026-06-28/21-58-33-255-2c02ee38d898.json   2026-06-29/17-58-12-762-e26cbbcb1cc5.json
2026-06-28/21-59-28-648-2c02ee38d898.json   2026-06-29/17-59-30-661-e26cbbcb1cc5.json
2026-06-29/19-35-33-452-d4ee12be7c33.json   2026-06-29/19-36-20-988-d4ee12be7c33.json
2026-06-29/19-35-33-507-d4ee12be7c33.json
```

These are **track backups the server itself wrote** — snapshots of "Dirt oval new", "Ice track new"
and "City circuit new" taken on the days those three backgrounds were being replaced. Each of the
three orphan names appears **twice as a `backgroundImageFile` value** across the 223 backup records,
and additionally as the track `id` those records carry. **A restore of one of those backups would
produce a track pointing at an image that had been deleted.**

**This is exactly the failure mode his condition was written for** — "the reason they survived is that
nobody looked widely" — and the wide search is what turned it up. The inventory's Check-3 claim was
made against the tracked repository and the five type directories; it did not reach
`tracks-backups/`, and that is where the references were.

**So: none of the three is deleted, and none of the three should be deleted on this evidence.**

**One fact that bears on how much the failure costs, given so he can decide rather than re-derive.**
The 223 backup records reference **22 distinct background filenames. Sixteen of those files are
already gone** from the runtime store — including `dirt-oval.png`, `ice-track.png`,
`city-circuit.png`, `garden-path.png` and eleven other hash-named uploads. Only six still exist, and
**three of the six are precisely these orphans.** So backup restores are already not image-complete by
a wide margin, and deleting the three would move that from 16 broken to 19 of 22. **That is an
argument he may find decisive, and it is his to make — it does not satisfy the condition as written,
which is why nothing was deleted.** The 9.3 MB stays.

---

## CHECKS

**`engine-reach --check` selected NOTHING, and that is the documented gap rather than a clean bill.**
Run on exactly the two changed paths, it answered `none of 2 path(s) carry a change that can reach the
race engine — 2 outside the hull`. **A JSON file is never an import edge**, so this instrument cannot
connect a seed record to the engine in either direction; the same gap is already recorded against the
world fingerprint's own `lastVerified`, where GARDEN-PATH-DEFAULTS-1 found routing skipping all four
fingerprints for a two-line seed edit **that moved every one of them**.

**So all four were run by hand, as that ship did.** The inventory predicted no movement and gave its
reason. **The prediction held, and the run is what says so:**

| role | measured | record | verdict |
|---|---|---|---|
| world | `bc01b74fd4f3cfc8` | same | **UNMOVED** (`--check` confirmed against role `world`) |
| world-off | `daf78ff18eca83c6` | same | **UNMOVED** (`--check` confirmed against role `world-off`) |
| camera | `6dfded25dd656977` | same | **UNMOVED** |
| render | `4819e3b0f8e61c23` | same | **UNMOVED** |

**Nothing was minted and no minting was needed** — there is no minting permission in this piece and
no value moved. The world pair is the meaningful half of that table: those two read
`server/seeds/tracks`, which is the side this piece rewrote, so they are the ones that could have
moved and did not. Camera and render read `server/data/tracks`, which this piece did not touch.

**Language guard: 0 failures.** 1,011 in-scope files, 27 with German, all 27 frozen grandfathered
allowances, none of them a seed. Its declared scope includes `server/`, and `.json` is not among the
extensions it skips, so `server/seeds/**` is genuinely covered rather than incidentally quiet. **The
German-named player group did not enter the seeds** — the guard is a second, independent confirmation
of what the seed-walking loop already made structural.

**Nothing written into `server/data`, shown rather than claimed:** after the copy, every runtime file
this piece could plausibly have touched still carries its pre-existing mtime — `garden-path.json` at
2026-08-27, `default-example-group.json` at 2026-06-17, the three orphan backgrounds at 2026-06-28/29,
both brand records and both logos at their original dates. **Not one is stamped today.** That is the
condition the inventory said keeps camera and render out of reach, and it was not weakened.

---

## CONFORMITY

- Copy from the five NAMED type directories only; the data root was never enumerated. No file outside
  those five entered the repository.
- Direction RUNTIME → SEEDS only. Nothing written into `server/data`.
- Every runtime record with a seed of the same name copied over that seed; the four runtime-only items
  neither copied nor deleted.
- The three deletions REFUSED on the owner's own condition, with the failing evidence reported rather
  than the conclusion.
- `engine-reach --check` run and exactly what it selected was run — which was nothing; the four
  fingerprints were then run by hand because the gap that makes it select nothing is documented, and
  the piece's acceptance depends on them. All four unmoved. Nothing minted.
- Language guard run and green.
- The overwrite mechanism was not built or touched.

## PROPOSALS

**P1 — the orphan question is now a BACKUP question, and it is bigger than three files.**
`tracks-backups/` holds 223 records referencing 22 background filenames, **16 of which are already
deleted**. Nothing writes those images and nothing prunes those backups; the two halves drift apart on
their own. Whatever he decides about the three, the general shape is that a backup and the asset it
names have no relationship anything maintains.

**P2 (mine) — a seed record's key ORDER is now a diff surface with no owner.** The unpredicted third
hunk is inert today, but it exists because two different pieces wrote the same field to two different
positions. Any future "does the seed match the runtime" check that compares bytes will report a
difference that means nothing, and one that compares parsed content will miss a difference that
might. Worth deciding which of the two the third piece uses, before it has to.
