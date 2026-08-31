# SEED-SNAPSHOT-INVENTORY-1 — what he is about to ship: one intended edit, four kinds of residue, and no fingerprint moves

**INVENTORY ONLY. No snapshot was taken.** No seed was replaced, no mechanism changed, no code
written, no seed or race seed touched, no dev server started, nothing merged. **No tracked file is
changed by this piece except this report and its INDEX line.** The snapshot is the next piece and it
needs his word on what is below.

**What was NOT run, and why nothing could have been:** no fingerprint, no browser gate, no suite.
Nothing in the repository changed, so none of them could return a different answer — and the
fingerprint question at the end was deliberately answered by READING what the instruments consume,
which is the only way to answer it before the change exists.

---

## METHOD

`DATA_ROOT` resolves to `server/data` here: `RA_DATA_DIR` is unset in this environment, and
`docker-compose.yml` mounts `./server/data` at the same place, so the container and the host see one
runtime store. Seeds are `server/seeds/<type>/`, the dirs `seedTypeFromSnapshot` copies from on first
boot — **only where the destination file does not already exist**, which is why the two sides can
differ at all.

Every JSON record was compared to the seed of the same name **leaf path by leaf path** (recursive
flatten, array lengths included), not by eye and not by line diff. Binaries were compared by SHA-256
over the file bytes.

---

## THE HEADLINE

**Across all five types there is exactly ONE difference that is his intent, and it is the one already
known.** Everything else that differs is either a stale timestamp, an unreferenced duplicate, or a
record that has no seed counterpart at all.

**The nine legacy duration fields are GONE.** This was checked rather than assumed: nine of the ten
runtime track records are now **byte-identical** to their seeds, and `defaultDuration` appears zero
times in `server/data/tracks/` and zero times in `server/seeds/tracks/`. **Nothing of that class
remains anywhere in the five types** — the leaf-by-leaf comparison finds no field in any runtime
record that the seed of the same name lacks, apart from the two named below.

---

## TRACKS — 9 of 10 byte-identical, garden-path differs in exactly two fields

Nine records (`city-circuit`, `dirt-oval`, `ice-track`, `luger-hill`, `mountainstreet`, `river-run`,
`searound`, `seatrack`, `space-sprint`) are byte-for-byte their seeds. There is nothing to classify
for them and nothing an operator would inherit that differs.

**garden-path — two differing fields, and only two:**

**(a) HIS INTENT — the surface classes.** The seed lists two; the runtime record lists those two plus
`mud` and `sand`. [TRACK-RUNTIME-AUDIT-1](TRACK-RUNTIME-AUDIT-1.md) established by history that the
seed has carried the two-class list in **every commit back to 2026-06-17** and has never held the
other two — so they were not lost from the seed, they were added in the app on **2026-07-04** using
the track editor. This is the known example, and it is confirmed unchanged.

**Safe to ship, and this was checked rather than assumed:** both added ids are among the nine
built-in classes in `client/src/modules/surface-effects/defaults.js`, which the registry seeds itself
from in code. `server/data/surface-classes/` is EMPTY on his install — there is no custom class
record behind them. So an operator installing fresh resolves both ids from code and inherits no
dangling reference.

**(b) RESIDUE — `updatedAt`.** The runtime stamp is six days newer than the seed's, which is the
honest time of the edit above. It is listed as residue by CLASS rather than by harm: as
TRACK-RUNTIME-AUDIT-1's own P1 records, the seed's `updatedAt` is **older than commits that edited
the seed in August**, so the field has never tracked the seed's changes and cannot be read as "which
side is newer". Shipping either value carries no information. **Flagged, not decided** — this is the
field his P1 proposed removing from seeds entirely, and that proposal is still open.

**(c) Nothing.** There is no third difference on any track record to classify.

---

## BACKGROUNDS — binary, same-or-different

**All ten named backgrounds are IDENTICAL to their seeds.** Evidence: SHA-256 over the file bytes
matches for every one of the ten, and every file size matches. There is no content question here.

**(b) RESIDUE — three unreferenced files with no seed counterpart:** `2c02ee38d898.jpg`,
`d4ee12be7c33.jpg`, `e26cbbcb1cc5.jpg`. Each is a **byte-identical duplicate** of a named background
— of `dirt-oval.jpg`, `city-circuit.jpg` and `ice-track.jpg` respectively, by matching SHA-256 — and
**no track record references any of them**: all ten records point at `<track-id>.jpg`. They are
upload leftovers from the days those three backgrounds were replaced (June 28–29), and they carry
**9.3 MB** that a fresh operator would inherit for nothing.

---

## BRANDS

`seasonal-entertainment.json` is **byte-identical** to its seed.

**(c) CANNOT CLASSIFY — one runtime-only record: "Fantasa".** It has no seed of any name. It is a
complete, well-formed brand record he made in the app on 2026-06-17 and last edited 2026-08-22,
carrying his own event name, his own two colours and its own logo. **Whether an operator installing
fresh should receive his brand is his call, not mine.**

**One fact he should have before deciding, stated because it looks alarming and is not:** both brand
records carry `isDefault: true`. That is possible because `set-default` in `_defaultPromote.js`
promotes a record without demoting any other — nothing enforces one default. But `isDefault` on a
brand is a **delete-guard and a badge**, not the active brand: `useActiveBrandProfile.js` resolves the
live brand from the shipped branding default and the active session, never by scanning records for
the flag. So shipping this would NOT hand every operator his branding on screen; it would hand them a
second brand in the list that they cannot delete until they clear its flag.

---

## BRAND-LOGOS — binary, same-or-different

`seasonal-entertainment.jpg` is **IDENTICAL** to its seed (SHA-256 match).

**(c) CANNOT CLASSIFY — one runtime-only file**, the Fantasa logo, with no seed of any name. Its
magic bytes are a genuine PNG, so the record's `logoFile` extension is truthful. It is **2.8 MB**,
roughly thirty times the seeded logo — worth his eye if the brand ships, because it ships with it.

---

## PLAYER-GROUPS

**(b) RESIDUE — `default-example-group` differs from its seed in `updatedAt` and in NOTHING ELSE.**
Same id, same name, same five players, same flag. The stamp is 41 minutes newer than the seed's. This
is pure timestamp residue with no edit behind it.

**Two runtime-only groups, neither with a seed of any name:**

**(b) RESIDUE, and it also breaks a permanent rule — "Testgruppe von Walter"** (20 players, created
2026-06-14, `isDefault: false`). The name is **German**, which the permanent language rule in
`CLAUDE.md` forbids for any user-facing text in the repository — and a seed file IS the repository.
Shipping it would put German on every operator's group list. Beyond that it is plainly a personal
test group.

**(c) CANNOT CLASSIFY — "40 Racer Testgroup"** (40 players, created 2026-07-12, `isDefault: false`).
The name is English and a 40-name roster is genuinely useful for testing a full field, so this could
reasonably be either something he wants shipped or his own scratch group. **I am not deciding it.**

---

## WOULD REPLACING THE SEEDS MOVE ANY OF THE FOUR FINGERPRINTS?

**NO — and this is settled by reading what the instruments consume, not by guessing and not by a
run.** The four split into two pairs for a reason that matters here.

**CAMERA and RENDER cannot move, because the swap does not touch what they read.**
`camera-fingerprint.mjs` and `render-fingerprint.mjs` both resolve their track directory as
`server/data/tracks` **when it exists, else** `server/seeds/tracks`. On his machine it exists, so both
instruments **already read the runtime records** — the very records that would become the seeds. The
snapshot copies runtime into seeds and leaves `server/data` alone, so their input is unchanged by
construction.

**And the same answer holds on a fresh clone, where `server/data` is gitignored and absent and they
fall back to the seeds.** From a track record those two instruments read the geometry, `width`,
`pathLengthPx` and `defaultRacerTypeId` — and **every one of those is already identical** between
garden-path's seed and its runtime record. Neither reads `surfaceClasses`; neither reads `updatedAt`.

**WORLD and WORLD-OFF do read the side that changes** — `sim-fairness.mjs` takes its tracks from
`server/seeds/tracks` **only**, with no runtime fallback. This is the pair that could have moved, and
it is exactly the routing gap the world record already names. So it was answered field by field:

- **`updatedAt` is read by nothing.** It appears zero times in `sim-fairness.mjs`,
  `fingerprint-default.mjs`, `camera-fingerprint.mjs`, `render-fingerprint.mjs` and
  `scripts/lib/raceDriver.mjs`.
- **`surfaceClasses` is read in exactly ONE place** — `sim-fairness.mjs:4392`, as a racer-ADMISSION
  filter: a racer type is skipped when its own surface list does not intersect the track's. It feeds
  nothing else: not the shape, not the pace, not the plan, not the outcome.
- **That filter's answer does not change.** All twenty racer configs were enumerated against both
  lists: **zero change compatibility on garden-path.** Every racer that intersected the two-class
  list still does, and **no racer's surface set reaches `mud` or `sand` without already reaching
  `earth` or `grass`** — so the widened list admits nobody new and excludes nobody.
- **And the world instrument never consults the filter for a set of racers anyway.**
  `fingerprint-default.mjs` passes **one explicit `--racer` per track**; garden-path's is `snail`,
  whose single surface is `grass`, compatible under both lists.

**So the only differing field either world instrument can even see cannot change its answer, and no
run is needed to say so.**

**The one thing that would overturn this**, named so it is not discovered later: if the snapshot piece
writes into `server/data` as well as into `server/seeds` — for instance by "normalising" both sides —
then camera and render come into play and this reading no longer covers them. **A snapshot that only
copies runtime into seeds is outside all four instruments' reach for these records.**

**A blind spot found on the way, reported rather than worked around.** `fingerprint-default.mjs`
**hardcodes** garden-path to `snail` in its own track list rather than reading the record's
`defaultRacerTypeId`, which is `beetle`. It changes nothing here — the two records agree on that field
— but it means "the world fingerprint would notice a track-record change" is **not true in general**:
that hash is blind to `defaultRacerTypeId` entirely, while camera and render read it. This is the same
shape as the known gap that the world instruments do not read `resolveIdentity`'s default.

---

## ONE ADJACENT WARNING FOR THE SNAPSHOT PIECE

Out of the scope asked for, but it belongs to whoever builds the copy: `DATA_ROOT` is not only these
five types. It also holds **`users.json`, `users.json.bak-*`, `sessions.sqlite`,
`recover-admin-audit.log`, `setup-complete.json`** and 24 files of `tracks-backups/`. **A snapshot
mechanism that walks the data root instead of the five named type directories would commit his
credential store into the repository.** Named now, before the mechanism exists.

---

## CONFORMITY

- No snapshot taken; no seed replaced; seeding mechanism untouched.
- No mechanism, no code, no seed value and no race seed changed. Dev server not touched. Nothing merged.
- The fingerprint question answered from source, with the reach of that answer stated and its one
  overturning condition named.
- Every difference classified as intent / residue / cannot-classify, and the three I could not
  classify are left to him rather than decided.

## PROPOSALS

**P1 — ship the five type directories field-selectively, not wholesale.** Every difference above
sorts cleanly except the three runtime-only records: one intended edit to carry over, five items of
residue to drop (three duplicate backgrounds, two `updatedAt` stamps), and three records that are his
to rule on. A wholesale copy would ship all of it including the German group name, which the
permanent language rule forbids.

**P2 (mine) — his open question from TRACK-RUNTIME-AUDIT-1 now has a second half.** That report asked
which FIELDS a shipped record may correct and which belong to whoever runs it. This inventory adds:
which **RECORDS** belong in a shipped install at all. Nothing in a record distinguishes "the
project's" from "his" in either dimension, and both halves want the same answer — a provenance mark,
not a heuristic.
