# Track background images — THIS FOLDER IS EMPTY ON PURPOSE

**If you are wondering where 12.6 MB went: it was deleted on 2026-09-04, deliberately, by the
owner's decision.** This file is the record. The full account is in
`reports/evolution/DROP-DEAD-BACKGROUNDS-1.md`, and **git holds every byte** — nothing here is
unrecoverable.

## What was here, and what it weighed

| file | bytes | what it was |
| --- | --- | --- |
| `garden-path.png` | 4,170,201 | the same garden as the one the game shows, **replanted** |
| `river-run.png` | 4,420,831 | **a different river** from the one the game shows |
| `city-circuit.png` | 3,068,312 | a **night** stadium against the game's **day** speedway |
| `dirt-oval.jpg` | 542,155 | the same racecourse, **a different day** |
| `space-sprint.jpg` | 384,168 | the same sky, **graded differently** |
| **total** | **12,585,667** | |

Plus `Mountainstreet.jpg` (9,772,456 bytes), removed a few hours earlier: **byte-identical** to
`server/seeds/backgrounds/mountainstreet.jpg`, the same image under two spellings of one name. That
is where the other 9.3 MB of the "21.3 MB" figure went.

## Why they went

**All five shared a name with a picture in `server/seeds/backgrounds/`, and all five were
measurably DIFFERENT pictures from the one they shared it with** — mean absolute difference 30 to 67
of 255, measured on a common 256×256 grey raster so that format and resolution could not masquerade
as a difference. No re-encode does that.

**Nothing loaded any of them.** The game fetches a track's background from the API —
`GET /api/tracks/<id>/background`, served out of the runtime backgrounds directory that
`server/seeds/backgrounds/` seeds — and `trackLoader.js` builds every client-side background path as
that API URL. The Track Editor takes a background by **file upload**. There is no dropdown of this
folder and there never will be one; the README that used to sit here said otherwise and was wrong.

**The owner looked at all five pairs side by side and wanted the picture the game already uses, in
every case.** So they are not a lost feature waiting to be wired up. They are dead weight in the
bundle, and now they are not in it.

## What still watches what

This folder is **no longer an artwork directory**, so `scripts/check-seed-versions.mjs` no longer
digests it — and its `digests.json` was **deleted rather than emptied**, because a manifest naming
five files that do not exist is exactly the stale record that rule exists to refuse. The pictures the
game actually shows, under `server/seeds/backgrounds/`, are covered by the **seed version** rule and
always were.

**Do not put a picture here expecting it to appear in the game.** It will not. Upload it in the Track
Editor.
