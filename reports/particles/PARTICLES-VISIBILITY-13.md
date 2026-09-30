# PARTICLES-VISIBILITY-13 — two known faults fixed before the owner looks

**2026-09-30.** **The owner's order of 2026-09-30:** fix the known faults before he looks at `fix/particles-visibility`.
Two pieces, in this order, each with its own check and push.

- **Piece A** — the Track Editor's "An unsaved track … was found": this section. On `fix/particles-visibility`,
  code commit `b06f02f5`. Not merged: the owner looks first.
- **Piece B** — the intermittent red run of `scripts/fingerprint-default.test.mjs`: §B below. Tooling, on its own
  branch `fix/fingerprint-default-flake`.

Open row: [BACKLOG.md](../../docs/BACKLOG.md) PART ONE, *2026-09-28 — added (PARTICLES-VISIBILITY-1)*.

---

## A · "An unsaved track … was found" — only for unsaved changes, and for their own track

### A.0 · The answer

- **The hypothesis from PARTICLES-VISIBILITY-12 was right, and the fault was worse. MEASURED:** every load of a stored
  track wrote **two** drafts with nothing changed:
  - one under the track's own key, while `?load=` was still in the address;
  - one under the new-track key, once the load had cleared the address.

  A save retired only one of them. So the message came after a plain load, a reload, a test race, and even a save.
- **Fixed.** The draft is keyed by the track actually loaded and written only while there are unsaved changes. It is
  offered when its own track loads (or, for a new track, to a fresh editor), and a draft that equals the saved track is
  dropped without asking. **MEASURED after the fix:** the message appears in exactly the two cases with a real unsaved
  change — a stored track changed and left, offered when that track reopens; and a new unsaved track, offered to the next
  fresh editor.
- **Recovery still works**, for stored and new tracks (the decision rule's fallback was not needed). **The
  PARTICLES-VISIBILITY-12 test-race round trip is unchanged**, re-measured below.
- **Editor-only.** `engine-reach --check` places all four changed files outside the engine hull.

### A.1 · The cause, file:line (before the fix, `5de221dd`)

- `client/src/screens/TrackEditor/TrackEditor.jsx:424` — the draft key was `searchParams.get('load') ?? null`, the
  address parameter.
- `:448` and `:464` — the load effect clears that parameter (`setSearchParams({})`) in the same step that puts the track
  on screen.
  - While `?load=seatrack` was still there, the geometry arriving wrote `racearena:trackEditor:draft:seatrack`.
  - Once it was cleared, the same geometry was written again under `racearena:trackEditor:draft:new`.
- `:424-431` — the write ran on every geometry change, dirty or not. Loading a track IS a geometry change, so a load
  alone wrote drafts.
- `:379` — on mount, a fresh editor offered the `:new` draft, which after any load was a copy of that track.
- `:1177` — a save cleared the key of the current address, which after a load is `:new`. The track's own
  `draft:seatrack` survived every save and was offered the next time the track opened.

### A.2 · Before and after, MEASURED

**Setup:**
- **Build:** the production build of a throwaway clone. Before: `5de221dd`. After: `b06f02f5`.
- **Data:** a throwaway data directory holding a copy of the owner's Seatrack.
- **Isolation:** each case starts with no drafts stored.
- **Dialogs:** "Leave anyway?" is accepted. The draft offer is answered Cancel, which discards the offered draft.

| case | before: message? | before: drafts written | after: message? | after: drafts written |
| --- | --- | --- | --- | --- |
| 1 open the editor fresh | no | none | no | none |
| 2 load Seatrack, leave unchanged, then a fresh editor, then Seatrack again | **yes, twice** (fresh editor; Seatrack again) | `draft:seatrack` and `draft:new` on the load itself | **no** | **none** |
| 3 load, change the lane width, leave; open Seatrack again; then a fresh editor | yes on both | both keys on the load | **yes on Seatrack again only** — its own draft | `draft:seatrack`, from the change |
| 4 load, change the bubbles amount, test race (cancelled), leave, a fresh editor | **yes** | both keys on the load | **no** | `draft:seatrack` (see A.5) |
| 5 load Seatrack, reload the page | **yes** | both keys on the load | **no** | none |
| 6 load, change, save, leave; a fresh editor; Seatrack again | **yes** (Seatrack again) | `draft:seatrack` survived the save | **no** | none after the save |
| 7 a new track: two points, leave, a fresh editor | yes | `draft:new` | yes | `draft:new` |

Before, the message came in six of seven cases, and in only two of them (3, and 7) was there anything unsaved. Even in
case 3 it was offered to a fresh editor, where restoring it would have put Seatrack's points on a new track. After the
fix it comes in exactly the two cases with unsaved work, each for its own track.

### A.3 · The fix, file:line (after, `b06f02f5`)

- **Keyed by the loaded track, written only while dirty.** `TrackEditor.jsx:445-447`: `draftId = loadedServerId ??
  null`, and the write returns unless `isDirty`. `loadedServerId` stays the loaded track's for the whole session, and
  `isDirty` is exactly "there are unsaved changes".
- **One offer, for the track the draft belongs to.** `offerDraft` at `TrackEditor.jsx:387`:
  - on mount, a fresh editor with nothing drawn is offered the new-track draft (`:378`); a `?load=` open is not;
  - a loaded track is offered its own draft at the end of `loadTrackData` (`:1176`), after the saved track is on
    screen, so a restore replaces it.
- **A draft equal to the saved track is not unsaved work.** `draftMatchesTrack` (`trackEditorDraft.js:169`) compares
  the three point arrays, the closed flag, the centre width of a centre-mode track, and the name. A match is dropped
  without asking. For the new-track draft there is no one saved track to compare with, so it is compared with every saved
  one. That also clears, once and silently, the copies the old keying left in every browser, including the owner's.
- **A save retires the draft of the track it saved** — the same key (`:1202`, unchanged code now reading the new key).

**Reused:** the draft module's own `loadDraft`, `saveDraft` and `clearDraft`, and the existing prompt text; `isDirty`
and `loadedServerId`, which the editor already kept. Nothing about what a draft stores changed.

### A.4 · The test-race round trip, re-measured on `b06f02f5`

The PARTICLES-VISIBILITY-12 proof, run again unchanged on the fixed build:
- **Before the race:** the bubbles slider went from 15 to 25, not saved.
- **The race:** it raced 60,000 per minute with 40 dolphins over 60 s, and returned by itself to the editor, in the race
  view, still at Count 25, and still dirty ("You have unsaved changes. Leave anyway?").
- **Nothing stored:** the stored track file is byte-identical (`8b05ee77…10645d5`), with no local race history, no
  server race database and no result hand-off.

This is identical to PARTICLES-VISIBILITY-12 §3.

### A.5 · Tests and sabotage

**New tests:**
- `TrackEditor.drafts.test.jsx`, the brief's cases plus two:
  - 1 a fresh editor;
  - 2 loaded and left unchanged, then a fresh editor, standing for the reload;
  - 3 changed and left: its own draft, offered for its track and not to a fresh editor;
  - 4 changed and saved: the draft is retired;
  - 5 a new unsaved track;
  - 6 a stale draft equal to the saved track, under both keys: dropped without asking;
  - 7 a new track's draft is not offered when a stored track opens.
- `trackEditorDraft.test.js`: `draftMatchesTrack`, matching unchanged and not matching after a moved point, an added
  point, the closed flag, the width or the name.
- The test-race round trip stays covered by PARTICLES-VISIBILITY-12's tests and by the browser proof above.

**Against the old editor**, the new draft tests fail 5 of 7: cases 2, 3, 4, 6 and 7. Cases 1 and 5 behaved already.
The Track Editor suites give 12 files and 175 tests, all passing.

**Each sabotage below was applied alone and restored:**

| sabotage | red |
| --- | --- |
| the key is the address parameter again | cases 3, 4 |
| the draft is written with nothing unsaved | cases 2, 4, 6, 7 |
| a draft equal to the saved track is offered anyway | case 6 |
| a loaded track is not offered its own draft | cases 3, 6 |
| the mount offer also runs for a `?load=` open | case 7 |
| a save does not retire the draft | case 4 |

**Fingerprints:** none expected, and none can move. `node scripts/engine-reach.mjs --check` with the four changed
paths reports *none of 4 path(s) carry a change that can reach the race engine — 4 outside the hull*.
**`npm run verify -- --premerge`, on the final tree of piece A: PASS 32, FAIL 0, SKIP 4**, first run. The four skipped
guards are the camera and render fingerprints, `check-container-paths` and `check-seed-versions`, all *nothing changed*
in their import closure.

### A.6 · Files, lines before → after (from `5de221dd`)

| file | lines | what |
| --- | --- | --- |
| `client/src/screens/TrackEditor/TrackEditor.jsx` | 1,490 → 1,515 | The draft keyed by the loaded track and written only while dirty; `offerDraft`; the mount offer only for a fresh editor; the offer at the end of `loadTrackData`. The crash-draft comment rewritten to say so. |
| `client/src/screens/TrackEditor/trackEditorDraft.js` | 156 → 180 | `draftMatchesTrack`. |
| `client/src/screens/TrackEditor/TrackEditor.drafts.test.jsx` | new, 206 | The case tests. |
| `client/src/screens/TrackEditor/trackEditorDraft.test.js` | 176 → 236 | The helper's tests. |

### A.7 · Noticed, and left

- **Effects, lights and the background are still not in a draft**, by that module's own design (its header says why).
  An effects-only unsaved change therefore leaves a draft equal to the saved geometry (case 4). It is offered nowhere,
  and it is dropped silently the next time that track opens. Recovering unsaved effects after a closed tab would mean
  drafting effects too, which is a further decision.
- **A reload drops the track from the address.** After a reload with unsaved changes the editor opens fresh, and the
  change is offered when that track is opened again, not on the reload itself. Keeping `?load=` in the address would
  change the load flow and was not needed for this fault.
- **The owner's browser holds old copies** under both keys. The first fresh editor and the first open of each track
  after this build drops them silently, because they equal the saved tracks. Any that do not (real unsaved work from
  before) are still offered.

---

## B · The intermittent red run of `scripts/fingerprint-default.test.mjs`

**Pending.** Piece B is worked on its own branch, `fix/fingerprint-default-flake`, off master, because it is tooling. This
section is completed with its result and a reference to its commit once it lands.
