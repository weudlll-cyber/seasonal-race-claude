# SHIP-OWNER-COSMETIC-1 — the owner's camera, and the comeback shot, shipped

**2026-10-02. Branch `ship/owner-cosmetic-defaults`, merged into master and minted on the owner's
approval of the same day.** Tag: `v-ship-owner-cosmetic` on the merge commit (registered in
[docs/TAGS.md](../../docs/TAGS.md) in the commit after it).

**The owner's decisions, 2026-10-02:**
- He looked at the branch on the 4173 production preview and approved it, so the mint and the merge
  are approved. He looked at three things: the comeback shot held until the racer reaches 3rd
  (8–20 s, never into the final scene), the wait before the comeback cut, and a private window
  identical to his own.
- The comeback cut delay stays at 1500 ms. He accepts fewer comeback shots in 20-racer fields. The
  camera cuts only if the detector still offers the racer after the wait.

## What ships

Every value lives in `client/src/modules/storage/defaults.js`. None is restated here.

| piece | what it does | record |
| --- | --- | --- |
| his cosmetic camera settings as the shipped defaults (2026-10-01) | framing widths and tracking speeds per shot; the BATTLE shot off (the feature stays in the code); OVERVIEW tracks slowly again; the winner card fills the whole pause; name labels when there is room; the comeback hold at least 8 s | BACKLOG, THE DELIVERY PLAN OF 2026-08-31 row |
| COMEBACK-HOLD-2 | the comeback shot holds until the racer reaches 3rd, 8–20 s, never into the final scene | [COMEBACK-HOLD-2](COMEBACK-HOLD-2.md) |
| COMEBACK-CUT-DELAY-1 | the camera waits before it cuts to the comeback racer, keeping its shot | [COMEBACK-CUT-DELAY-1](COMEBACK-CUT-DELAY-1.md) |
| the two dead comeback controls removed | the per-state table's COMEBACK_ZOOM column no longer shows *inner frame* or *minimum hold*; the comeback profile no longer carries the two keys | below |

### The two dead controls

[COMEBACK-SETTINGS-SURVEY-1](COMEBACK-SETTINGS-SURVEY-1.md) proved two of the comeback controls dead
by construction:
- **Inner frame.** The director reads one global `innerFramePct` (`framingConfig.js`); no state's
  profile value reaches it.
- **Minimum hold.** `comebackMinDuration` always overrides the comeback profile's value
  (`cameraTimingComputation.js`).

**What was removed (`b4e95ec7`):**
- **The two keys in the COMEBACK_ZOOM profile** in `defaults.js`. A two-line comment takes their
  place, so the file's later line numbers, and the FORCE-MAP citations of them, did not move.
- **The two fields in that state's column of the Dev Screen table.** They are hidden through the
  table's existing `onlyFor` filter (`StateProfileBlock`, `CameraAdvancedSection.jsx`). The filter is
  given a list of every state except COMEBACK_ZOOM (`STATES_EXCEPT_COMEBACK`, derived from
  `CAM_STATES_FOR_PROFILES`).

**Why removing the minimum-hold key is neutral on every path:**
- With profiles, the read falls back to `MIN_STATE_HOLD_MS`, and that fallback is the same 5000.
- Without profiles, the key was never read.

**Kept, because they are still read:** the cooldown, the outcome-phase threshold, and the
COMEBACK_ZOOM profile's entry speed, lead-in, lead-out, entry timeout, lead-ahead and lead-out
switch.

## Fingerprints

Verified with `node scripts/check-fingerprints.mjs --mint` on the branch after master was merged into
it:

| role | before (record) | after (minted) |
| --- | --- | --- |
| world | unchanged | unchanged |
| world-off | unchanged | unchanged |
| camera | `be48503a324429cb` | `f79cdf8c03418c5f` |
| render | `90344c0f0361cbf1` | `87eb0a87809a3f59` |

**What moved them.** Camera and render moved with the cosmetic defaults (`062f5bb2`). Nothing added
after it changed them:
- COMEBACK-HOLD-2,
- COMEBACK-CUT-DELAY-1,
- the dead-control removal,
- master's TIDY-C-1.

The pinned races contain no comeback shot, a blind spot the comeback reports name. The record is
[docs/fingerprints.json](../../docs/fingerprints.json). Its `mintedOn` is provisional (`b42c4cd4`,
the branch tip whose tree was minted) and is corrected to the merge SHA in the commit after the merge.

**The first mint attempt was blocked.** On 2026-10-02 the edit of `docs/fingerprints.json` was denied
by the Claude Code auto-mode permission classifier, reason "Modify Shared Resources". It was neither
a repository hook nor a settings rule. Nothing was written and nothing was routed around it. The owner
then authorized the edit and it was made.

## Ceremony

| step | |
| --- | --- |
| catch-up with master | `85b65d51`. The conflicts were in five documents; both sides were kept. The two measured camera stamps were re-measured on the merged tree, identical to the digit, and name `85b65d51` |
| world equals the record | yes |
| BACKLOG | two rows moved to PART TWO with what closed them: the comeback shot, and the Dev Screen comeback settings. The delivery-plan row gains the camera result and stays open for the tracks, the brand and the player group. `docs/OPEN.md` re-derived: **sixteen** |
| tag | `v-ship-owner-cosmetic`, on the merge commit, pushed after the merge's CI is green, then registered (the order of `v-ship-chase-after-outcome`). There is no `pre/` tag; none has been cut since the ship tags took over |

Test counts, the premerge result, the browser gate and the merge's CI run are in the final report of
the block. They come after this commit, and a transcript filed here would describe an earlier state.
