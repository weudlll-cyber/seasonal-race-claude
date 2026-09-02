# SOAK-ROSTER-1 — my own piece-1 repair broke the parity soak, and it broke it the same way it fixed the fingerprint

> **A REGRESSION I INTRODUCED, FOUND AND FIXED.** `FINGERPRINT-TRACK-DEFAULTS-1` (merge `fa553f50`,
> 2026-09-02) made the soak's track axis read the shipped seeds. It left the soak's **racer roster**
> hand-listed. From that merge until this one, `scripts/parity/soak.mjs` threw on **every** run.

**Nothing went red, and that is the second finding.** The soak is in no CI path and in no `verify`
guard, so a tool that cannot start looked exactly like a tool nobody ran.

---

## 1. WHAT BROKE, MEASURED AT THREE POINTS

`scripts/parity/soak.mjs:66` builds each track's arms as `[defaultType, ALT_TYPE[trackId]]` and
`:68` throws if the type is not a key of `goldenRunner.mjs`'s `RACER_CONFIGS` — a **hand-listed
roster of ten**. Once the axis read the seeds, garden-path returned `beetle`, which is not one of the
ten. `snail`, which it returned before, is.

| point | commit | `buildMatrix()` |
|---|---|---|
| before my repair | `bcd94805` | **600 rows** |
| after my repair | `ac1d7acc` | **`THROW: unknown racer type beetle`** |
| after this fix | this branch | **600 rows** |

**All three were run, not reasoned.** The "before" measurement required both old files side by side,
so `goldenRunner.mjs` and `soak.mjs` were extracted from `bcd94805` into throwaway copies alongside
the originals with the import between them repointed, run, and deleted.

**The row count is identical before and after**, because the shape never depended on which racer:
ten tracks × two types × the seed/count/shape/lap axes. What changed is that garden-path's arm now
races the racer the seed actually names — the same correction the fingerprint got.

---

## 2. ★ IT IS THE SAME DEFECT ONE LAYER DOWN

FINGERPRINT-TRACK-DEFAULTS-1's whole argument was **fix the premise, not the pair**: swapping `snail`
for `beetle` in a literal would reproduce the defect at the next default change, so the instrument
should read the seed.

**I applied that to the track axis and left a hand-maintained list sitting directly underneath it.**
The roster is the same kind of fact as the pairing — a set with an owner, restated by hand somewhere
else — and repairing only the layer above it did not remove the defect, it **moved** it, from a
silent wrong answer to a loud crash. The loud crash is strictly better; it is still the same fault.

**That the crash was silent anyway is the part worth keeping.** A tool with no CI path converts a
loud failure back into a silent one.

---

## 3. THE FIX: THE ROSTER IS DERIVED

`RACER_CONFIGS` is now built over `RACER_TYPE_IDS` — **every type the registry knows** — with
`racerFacts(id)` supplying the physical fields exactly as before. A racer added to the registry
cannot fall out of it, and a track re-pointed at a different default cannot break it.

### `surfaceClasses` was left exactly as it was, deliberately

Ten types carried a `surfaceClasses` tag list; those ten keep it, and the ten derived entries have
none. That asymmetry is honest rather than tidy: [NO-SOURCE-OF-TRUTH-1](NO-SOURCE-OF-TRUTH-1.md)
re-checked the field on this same tree and found it **still unread by anything**, with two of its
tags (`space`, `garden`) not surface classes anywhere in the repository. **Deleting it has now been
proposed three times and is still not this piece's call**, so nothing was invented for the new
entries and nothing was removed from the old ones. Inventing ten more tags for a dead field would
have been the worse error.

### One thing was deliberately NOT done: `racerFacts.mjs` was not touched

The first version of this fix re-exported `RACER_TYPE_IDS` from `scripts/lib/racerFacts.mjs`, as the
single door to the registry. **That was reverted after measuring**, not after thinking about it:

```
node scripts/engine-reach.mjs --check scripts/lib/racerFacts.mjs scripts/parity/goldenRunner.mjs
  → ENGINE REACH: 1 of 2 path(s) can change the race:  scripts/lib/racerFacts.mjs
```

`racerFacts.mjs` is **inside the engine hull**. A pure re-export cannot move a race, but the hull is
not asked to be clever, and **this chain carries no minting permission** — so putting a fingerprint
question on a change that cannot move a race is a cost paid for nothing. The roster is imported from
the registry directly instead, in the file that needs it, which is outside the hull. Final state:

```
node scripts/engine-reach.mjs --check scripts/parity/goldenRunner.mjs
  → none of 1 path(s) carry a change that can reach the race engine.
```

---

## 4. THE PROOF THAT NOTHING ELSE MOVED

**The ten entries that already existed are byte-identical to master's — compared directly, not
argued from construction.** Master's `goldenRunner.mjs` was extracted to a throwaway copy in the same
directory (so its relative imports still resolved), both modules imported into one process, and every
key of the old object JSON-compared against the new:

```
master entries: 10 | now: 20
of the 10 entries master had, CHANGED: 0
added: elephant, giraffe, snake, dragon, f1, buggy, plane, beetle, koi, turtle
removed: (none)
```

| claim | how established |
|---|---|
| the goldens still pass | `npx vitest run src/modules/parity/` → **7 files, 50 tests, 50 passed**, run twice: once on the first shape and again on the final one |
| no fingerprint can move | the one changed file is **outside the engine hull**, by `engine-reach --check` |
| no existing arm changed | the direct 10-key comparison above |
| the soak starts | `buildMatrix()` returns 600 rows, the same count as before the break |

**The added keys cannot reach an existing golden**: `RACER_CONFIGS` is indexed by
`identity._racerType` at six sites, and no recorded case names any of the ten new ids.

---

## Limits

**The soak was not RUN, only started.** `buildMatrix()` builds 600 identities in a second; executing
them is a manual instrument costing hours and was not part of this repair. What is established is
that the soak can begin, which it could not for the whole of 2026-09-02 — **not** that its 600
identities all pass.

**Whether the soak ever ran successfully in its lifetime is not established.** What is established is
that `buildMatrix()` returned 600 rows at `bcd94805` and returns 600 rows now.

**No claim is made about garden-path's beetle arm being well-behaved.** The soak now races the racer
the seed names on that track, which is correct; whether those 60 identities pass is unmeasured, and
they have never been run in any state of the tree.

**`ALT_TYPE` in `soak.mjs` is still a hand-written map of ten** and was not touched. It is a
deliberate second axis — an alternate racer per track, chosen to be *wrong* for the surface on
purpose — so it is a real authored choice rather than a copy of a fact with an owner. It cannot
break the way the roster did, because every value in it is in the registry, but nothing enforces
that.

**Full `verify` was not run before this report was written**; the parity suite and the guards were.
The merge itself runs it.
