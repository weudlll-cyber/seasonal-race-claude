# CAMERA-SIDEJUMP-1 — the leader lurches to the frame edge on a mid-hold zoom change (root cause)

Base `origin/master @72fc52e` · presentation-only · fingerprint **`ded0a126048e4cdb` IDENTICAL** (re-minted on the committed state). The owner's report: within the first ~20 s of seed-5601 searound the camera makes a wide move and the leader ends up "absolutely not where he should be," then returns — the HUD staying **FOLLOWING LEADER ▸ ARROW** throughout (screenshots confirmed: leader centred in a wide shot → pinned in the upper-left corner as the view tightens → the pan travels back to the forward position). Branch A (forward-bias) was eliminated live (frac 0.5 → unchanged).

## STEP 0 — the microscope (render-faithful, seed-5601)
Dumping the leader's true per-axis screen position frame-by-frame through the moment:

| t (s) | zoom | leader screen X (frac 0.66) | at frac 0.5 | min-vis OFF |
|---|---|---|---|---|
| 8.0 | 7.20 | 0.49 | 0.50 | 0.50 |
| 8.3 | 7.02 (dropping) | 0.36 | 0.39 | 0.49 |
| 8.6 | 6.44 | **0.27** (edge) | 0.32 | 0.49 |
| 9.0 | 6.41 | 0.42 (recovering) | 0.49 | 0.48 |

Three facts pin the cause: (1) the lurch coincides exactly with a **min-vis floor loosen** (zoom 7.20 → 6.41); (2) with **min-vis OFF the leader is rock-steady** (0.49 → 0.49, no lurch); (3) it persists at **frac 0.5** (bias inert, 0.50 → 0.32) — the forward-bias only *amplifies* it (0.27 vs 0.32), which is why the owner saw no change at 0.5. So the min-vis zoom change is the trigger.

## The REAL error (systemic, per the owner's ask)
The trigger is min-vis, but the **cause is generic to every zoom change**. Screen position is `worldPos·effZoom + offset` — the camera **zooms about the world origin**. When `effZoom` changes and the pan offset only *lerps* toward its recomputed target, the anchor slides across the frame **faster than the pan can follow**: it lurches to the edge, then the pan slowly recovers. Any zoom-change source — the min-vis floor today, any future zoom mechanism tomorrow — produces the same lurch. Band-aiding the min-vis loosen would leave the bug latent everywhere else.

## STEP 1 — the fix: zoom about the ANCHOR (one spot, every source)
In the LEADER-family follow path, each frame's zoom delta is now re-applied **around the anchor's world position** before the pan lerp:
```
offsetX -= anchor.x · bsX · Δzoom
offsetY -= anchor.y · bsY · Δzoom     (open tracks: OPEN_TRACK_BASE_ZOOM on both axes)
```
This preserves the anchor's **screen** position across any zoom change; the pan lerp then only eases it toward the forward-framed target. The grammar-cut (entry) path already snaps pan+zoom together, so it is untouched; only the smooth follow path needed it. One localized change makes **every** zoom source lurch-free — nothing else has to be audited.

### Result (seed-5601, faithful per-axis, at the min-vis loosen)
| | before | after |
|---|---|---|
| leader screen X at 8.6 s (frac 0.66) | **0.27** (edge) | **0.42** (smooth) |
| worst frame-to-frame lurch through the change | large | small |

The leader now eases smoothly through the zoom change (0.49 → 0.45 → 0.42) instead of lurching to the corner and travelling back. The remaining gradual drift is the leader rounding the loop (the forward-framing following the tangent) — intended, not a jump.

## Tests
`CAMERA-SIDEJUMP-1` (CameraDirector.test.js): a LEADER hold with a near-stationary leader and a pack that spreads to force a min-vis loosen — the zoom genuinely moves (> 0.3) while the leader's max frame-to-frame screen displacement stays **< 20 px** and it never leaves inner-70. 665 camera + RaceScreen tests green; the 372 camera tests (incl. FOCUS-1/3/5) unchanged.

## Five sentences
1. The microscope pinned the lurch to a min-vis floor loosen — with min-vis off the leader is steady, and it persists at forward-frac 0.5 (bias only amplifies), which is why the owner saw no change there.
2. The real cause is systemic: the camera zooms about the world origin, so when the zoom changes the pan lerp can't keep the anchor's screen position and it slides to the frame edge before recovering.
3. The fix re-applies each frame's zoom delta around the anchor's world position, preserving its screen position across any zoom change — the pan lerp then only eases it toward the forward target.
4. Because it lives in the one follow-path spot every zoom change flows through, min-vis and any future zoom source are lurch-free without touching them — the "can't happen anywhere else" the owner asked for.
5. Fingerprint is byte-identical (`ded0a126048e4cdb`); presentation-only, one localized change, 665 tests green.

## Proposals (≥2)
1. **Owner eye at the same spot (first ~20 s, seed 5601).** The leader should now hold its forward framing straight through the wide-shot ↔ tight-shot min-vis transition — no travel to the corner. Grammar `legacy`/`frac 0.5` remain available to A/B.
2. **Make "zoom about the anchor" the camera's stated invariant.** Add it to the camera contract (a comment + the SIDEJUMP test) so any future code that changes `this.zoom` mid-hold inherits the guarantee automatically — the render transform (`worldPos·effZoom + offset`) and this rule are the two things every camera change must respect.
3. **Extend the anchor-stable rule to BATTLE/COMEBACK group shots.** Those states have no single anchor today; a group-centroid "zoom about the group bounds" would give them the same lurch-free zoom behaviour, composing with FOCUS-3's transition grammar.
