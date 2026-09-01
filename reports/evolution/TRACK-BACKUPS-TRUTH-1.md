# TRACK-BACKUPS-TRUTH-1 — what `tracks-backups/` actually is, and what it is not

**READ-ONLY. Nothing was built, nothing deleted, nothing proposed as work.** The three orphan
backgrounds were spared because this directory referenced them, and that stands.

**The short answer: it is not a backup system.** It is a write-only version history of track records
*after* each edit, nothing reads it, there is no restore, and the one operation that destroys a track
does not write to it at all.

---

## WHO WRITES THEM, AND ON WHAT EVENT

`writeTrackBackup(trackId, trackData)` in `server/src/routes/tracks.js`, from exactly four call
sites:

| line | route | event |
| --- | --- | --- |
| 612 | `POST /api/tracks` | a track is **created** |
| 641 | `PUT /api/tracks/:id` | a track is **edited** |
| 683 | `DELETE /api/tracks/:id/background` | a background is **removed** |
| 737 | `POST /api/tracks/:id/background` | a background is **uploaded** |

Each writes `DATA_ROOT/tracks-backups/<YYYY-MM-DD>/<HH-MM-SS-mmm>-<trackId>.json`, containing the
full track record.

### Two things about that list matter more than the list

**1. `DELETE /api/tracks/:id` is not on it.** The route that deletes a track writes no backup — and it
also `unlinkSync`s the background image. So **the single operation that destroys a track and its
picture leaves nothing behind**, in the directory named for backing tracks up.

**2. The backup is written AFTER the record is saved, and it stores the NEW record.** In every one of
the four sites the order is `atomicWriteJson(...)` → `tracksMap.set(...)` → `writeTrackBackup(...)`,
with the post-change object passed in. It is a **post-image, not a pre-image**.

That is not useless — a sequence of post-images does let you reach an earlier state, because
yesterday's post-image is the state before today's edit. But it means two things a person expecting a
backup would not expect: **restoring the most recent backup of a track is a no-op**, and **a track's
state before its first recorded edit was never captured at all.**

---

## DOES ANYTHING READ THEM? NO

`BACKUP_DIR` occurs **twice in the entire repository**, both inside `writeTrackBackup` itself — its
declaration and the line that builds the day directory. Searched across `server/src`, `client/src`
and `scripts/`:

- no route reads the directory — there is no `GET /api/tracks/:id/backups`, no restore endpoint;
- no client code references it;
- no script references it;
- nothing lists, prunes, or expires it.

**It is written to and never read.** The 223 files have accumulated for four months with nothing on
the other end.

### The Dev Panel's "system backup/restore" is a different thing entirely

The README advertises "system backup/restore" in the Dev Panel, and a reader could easily believe it
covers this directory. It does not. That feature is
`client/src/modules/storage/storage.js` — `exportAllStorage()` / its restore counterpart — which
export and re-import the browser's `racearena:*` **localStorage** keys. It is browser state, it never
touches the server, and it has no knowledge that `tracks-backups/` exists.

---

## WHAT A RESTORE DOES TODAY

**There is no restore.** What he would actually have to do:

1. Find the file by hand — the names are `<time>-<trackId>.json` inside a dated directory, so he
   must know the track's id and roughly when the edit was.
2. Copy it into `server/data/tracks/` under the right filename.
3. **Restart the API.** The track list is an in-memory `Map` built once at boot (`loadAllTracks()`
   runs at module load), so a file dropped into the directory is invisible to a running server. This
   is documented in `docs/SETUP.md`.

That is the whole procedure, and none of it is written down anywhere as a procedure.

---

## WHAT HE WOULD SEE — the numbers

All 223 records were parsed. None was unreadable.

```
backups          223 files, across 24 days, 2026-05-01 → 2026-08-22

records naming a background          56
   ...whose image still exists       14        ->  MISSING: 42   (75%)
records naming no background        167

distinct track ids backed up        167
   ...that still exist as a track     7        ->  160 no longer exist
```

**Three things he would see, in the order he would meet them:**

**1. Most of what is in there is not his current tracks.** 160 of the 167 backed-up track ids have no
live track. Restoring one at random would not repair anything — **it would resurrect a track he
deleted months ago**, which would then appear in his track list as though he had made it.

**2. Three quarters of the records that name a picture cannot show it.** Of the 56 records carrying a
`backgroundImageFile`, only 14 name an image that still exists. The other 42 point at files that are
gone.

**3. And that failure is silent.** `GET /api/tracks/:id/background` returns
`404 {"error":"Background file missing"}` when the file is absent, and the client hands the browser
that URL as an ordinary image source regardless. A failed image load draws nothing and says nothing.
**The track would come back looking blank rather than broken** — he would see a race on an empty
background with no error anywhere, and nothing on screen would connect it to the restore he had just
performed.

---

## WHY THE THREE ORPHAN BACKGROUNDS WERE SPARED, RE-STATED

SEED-SNAPSHOT-1 refused to delete `2c02ee38d898.jpg`, `d4ee12be7c33.jpg` and `e26cbbcb1cc5.jpg`
because six backup records name them as their `backgroundImageFile`. **That refusal was correct on
its own terms and it stands** — the owner's condition was certainty, and a live reference is a live
reference.

What this piece adds is the context, not a reversal: those three are among the **14** images that
still exist out of 56 references, in a directory that **nothing reads**, whose restore path is manual
and undocumented, and 75% of whose picture references already dangle. **That does not make deleting
them safe** — it makes the thing they are protected for smaller than it looked. The decision is his
and nothing here changes it.

---

## CONFORMITY

- Read-only. No file changed but this report and its INDEX line. Nothing deleted, nothing proposed as
  work.
- Every claim established from the source or from parsing all 223 records — who writes, on what
  event, in what order, what reads it (nothing), and what a restore would actually require.
- The three orphan backgrounds are untouched and the reason they were spared is restated, not
  withdrawn.

## WHAT THIS PIECE DOES NOT ANSWER

- **Whether any of it should change.** He has not asked, and the brief said to propose nothing. The
  facts above are what a decision would need; the decision is not here.
- **Whether the post-image ordering was deliberate.** The code carries no comment either way, and no
  report explains it. It may have been intended as an edit history rather than an undo, in which case
  the directory's name is the only thing that is wrong.
- **How large it will get.** Nothing prunes it; 223 files in four months is the only rate observed,
  and whether that matters depends on how much he edits tracks.
