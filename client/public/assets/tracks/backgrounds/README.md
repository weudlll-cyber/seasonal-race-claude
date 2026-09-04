# Track background images

**NOTHING IN THE PRODUCT LOADS THESE FILES.** The game fetches a track's background from the server —
`GET /api/tracks/<id>/background`, served out of the runtime backgrounds directory that
`server/seeds/backgrounds/` seeds — and the Track Editor takes a background by **file upload**, not
from a list of this folder. The only references to `/assets/tracks/backgrounds/...` left in the tree
are test fixtures and one doc-comment example.

So this folder is not a place to "put a file so it appears". Establishing that is what
`WATCH-BACKGROUNDS-1` (2026-09-04) did, and this README used to say the opposite: it listed seven
filenames to place here, of which one (`ice-track.png`) has never existed and one
(`mountainstreet.jpg`) was here under a different capital.

**Its five remaining files are still WATCHED** — `digests.json` beside this file records a sha256 per
file, checked by `node scripts/check-seed-versions.mjs`, so they cannot change without saying so.
Re-record after a deliberate change with `--record-artwork`.

**What they ARE is an open question for the owner.** All five share a name with a picture in
`server/seeds/backgrounds/`, and all five are measurably DIFFERENT pictures from the one that shares
their name. Nothing has been reconciled and nothing should be, until he has looked.

## What was removed, 2026-09-04 (BG-CAPITAL-DUPE-1)

`Mountainstreet.jpg` — **byte-identical** to `server/seeds/backgrounds/mountainstreet.jpg`
(sha256 `83a29fd9…aba4`, 9,772,456 bytes both). The same 9.32 MB image stored twice under two
spellings of one name, which is **the same name to Windows and a different name to git**. The
lowercase copy in the seeds is the one the product serves and the one every other file in both
directories is spelled like; this one was read by nothing.
