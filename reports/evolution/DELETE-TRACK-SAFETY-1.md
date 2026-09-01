# DELETE-TRACK-SAFETY-1 — the cross-damage cannot happen, and the real defect was next to it

**The half this piece was mostly about evaporated on inspection: two tracks cannot share a background
file, by construction.** No cross-reference check was built, because there is nothing to check
against.

**But the scan that established that found a different defect in the same lines, and it is real: both
delete paths unlinked a filename the read path refuses.** That is fixed, and the fix is
sabotage-proven.

---

## CAN TWO TRACKS SHARE A BACKGROUND FILE TODAY? NO

Established from every writer of the field, not from the current data.

**`backgroundImageFile` has exactly four writers in `server/src/routes/tracks.js`:**

| line | route | what it writes |
| --- | --- | --- |
| 604 | `POST /` create | **`null`, hardcoded** — the body cannot set it |
| 634 | `PUT /:id` update | **`existing.backgroundImageFile`, re-pinned** — the body cannot change it |
| 680 | `DELETE /:id/background` | `null` |
| 732 | `POST /:id/background` upload | **``` `${track.id}.${ext}` ```** |

**The upload route is the only place a non-null value is ever assigned, and it derives the name from
the track id.** Track ids are unique — they are the key in `tracksMap` and the record's own filename —
and `isValidId` restricts them to `^[a-z0-9_-]+$`, which is lowercase, so two ids cannot collide by
case on a case-insensitive filesystem either.

**So the value is always `null` or `<track.id>.<ext>`, and two live tracks cannot name one file.**
The runtime store and the seeds agree: ten records, ten distinct backgrounds, each `<id>.jpg`.

**No runtime cross-reference check was added.** Guarding against a state the code cannot produce
would be a check that can never fire, and a check that can never fire is indistinguishable from one
that is broken.

### What pins it instead — four tests that fail if it stops being true

- every shipped record names either nothing or `<id>.<ext>`;
- no two shipped records name the same file;
- **CREATE cannot set a background whatever the body says** — driven through the API, not by reading
  the file, because `GET /:id` strips the field deliberately and `GET /:id/background` answering
  `404 No background` is the honest observable;
- **UPDATE cannot change one either.**

If the upload route ever stops deriving the name from the id, or CREATE/UPDATE ever start honouring
the body, these go red before anyone loses an image.

---

## THE DEFECT THAT WAS ACTUALLY THERE

**The read path refuses an unsafe stored filename. Both delete paths acted on it.**

```js
// GET /:id/background — refuses
if (!isSafeAssetFilename(track.backgroundImageFile)) return res.status(404)…

// DELETE /:id  and  DELETE /:id/background — did not
const bgPath = join(BG_DIR, track.backgroundImageFile);
if (existsSync(bgPath)) unlinkSync(bgPath);
```

**The asymmetry runs the wrong way.** A corrupt or crafted value was refused where it would merely be
*served* and acted on where it would be *destroyed* — and `isSafeAssetFilename`'s own header already
says such a value "is a sign of a corrupt or malicious stored value", so the project had already
decided a stored filename is not to be trusted. Only half the code had been told.

**It is not reachable through the API** — every writer is constrained, as above — which is why this is
a guard rather than a live bug. **It IS reachable through operations this project documents:**

- editing a record under `server/data/tracks/` by hand, which `docs/SETUP.md` describes;
- **restoring one of the 223 `tracks-backups/` files**, which TRACK-BACKUPS-TRUTH-1 established is a
  manual copy with no schema check anywhere in it.

Both delete paths now go through one `removeBackgroundFile(track)` helper that validates first, leaves
the file alone on an unsafe value, and **says so** — silence would be the same defect one level down.

### Sabotage, and a hollow test caught on the way

Removing the `isSafeAssetFilename` call:

```
× refuses a stored filename that escapes the assets directory, and says so
Tests  1 failed | 7 passed (8)
```

**The first version of that test could not have failed, and that is worth recording.** It went
through `DELETE /api/tracks/:id` with a hand-written record on disk — but the in-memory map is built
at boot, so the route answered 404 long before reaching the helper, and the bystander survived for a
reason that had nothing to do with the fix. It passed under sabotage. `removeBackgroundFile` is now
exported and driven directly, and it goes red.

**Both directions are covered**: the guard must also still delete an ordinary background, because a
check that refuses everything would pass the traversal test and be useless.

---

## THE MISSING BACKUP ON `DELETE /:id` — what a real recovery path would have to be

`DELETE /:id` writes no backup while its sibling `DELETE /:id/background` does. **No backup write was
added**, on the decision rule this piece was given and which the evidence supports:
TRACK-BACKUPS-TRUTH-1 established that `tracks-backups/` is **read by nothing** — `BACKUP_DIR` occurs
twice in the repository, both inside the writer — and has no restore path. Writing one more unread
file is not safety; it is the appearance of safety, which is worse because it stops people asking.

**What a real recovery path would have to be**, stated so the decision is his and informed:

1. **A pre-image, not a post-image.** Every existing write stores the record *after* the change. To
   undo a deletion you need the state *before* it, which nothing currently captures for any
   operation.
2. **The image with the record.** A track without its background restores as a blank track — 75% of
   the existing backups already name an image that is gone. Recovery means both artefacts or neither.
3. **Something that reads it.** An endpoint listing recoverable records and one restoring a chosen
   one, plus a client surface. Today restoring means copying a file by hand and restarting the API,
   because the track list is an in-memory map built at boot.
4. **A retention rule.** 223 files have accumulated in four months and nothing prunes them.

That is four pieces of work, not one, and it is a feature decision rather than a defect. **This piece
makes deletion non-destructive to other tracks, which needed no decision from him.**

---

## WHAT WAS NOT CHANGED

Deliberately, as instructed: **what deletion means is unchanged**, no confirmation dialog was added,
and the default-track protection (`403` on deleting an `isDefault` track) is untouched.

---

## CHECKS

**`engine-reach --check` selected nothing** — both changed paths outside the hull, and since
REACH-ADVISORY-1 that answer covers data paths too.

**`npm run verify` was run and its routing consulted rather than second-guessed.** It selected five
guards and **skipped all four fingerprints as unreachable**, so none was run by hand — the answer
rather than a skipped step, from two independent instruments. **Nothing was minted.**

```
PASS  server-suite (ran alone) · check-hooks-installed · check-language-closed
      check-writable · fingerprint-containment          PASS 5  FAIL 0  SKIP 21
```

The server suite ran alone, as its shape requires, and passes with the eight new tests in it.

## CONFORMITY

- Whether sharing is possible was established FIRST, from every writer of the field plus the id
  constraint, and the cross-damage half is reported as evaporating rather than guarded against.
- What enforces it is named, and four tests fail if it stops being true.
- The one real defect in those lines is fixed in both routes, with a sabotage that goes red — and the
  first version of that test, which could not have failed, is recorded rather than quietly replaced.
- No backup write added to `DELETE /:id`; what a real recovery path would need is stated and stopped
  there.
- Deletion's meaning, confirmation dialogs and default-track protection all untouched.

## PROPOSALS

**P1 — the same unvalidated-unlink shape may exist in the sibling asset routes.** `brands.js` and
`racers.js` both store a filename in a record and unlink it on delete. This piece did not look, because
it was scoped to tracks; the pattern is identical and worth ten minutes.

**P2 (mine) — `isValidId` is doing load-bearing safety work that nothing says it is doing.** The
reason two tracks cannot share a file is that ids are unique and lowercase-constrained. That is a
security-relevant property of a validator whose own comment describes it as a format check. One line
in its header would stop someone relaxing it without realising what else it holds up.
