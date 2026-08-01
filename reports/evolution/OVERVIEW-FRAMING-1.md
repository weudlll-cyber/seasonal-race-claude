# OVERVIEW-FRAMING-1 — replace the magic radial offset with the owner's stated framing rule

The owner reported (Quick Test · Dirt Oval, seed 5601, end of lap 1, OVERVIEW): the leader hangs half off the
left edge. Root cause: after the start phase OVERVIEW anchored on the leader, shifted the anchor 150 world-px
**toward the shape centre** (sideways to travel at an oval's ends), and `resolveCamera` only guaranteed that the
SHIFTED anchor — no longer the leader — sat inside the frame. This block replaces that magic offset with the
owner's rule: **frame the leader + N racers at a derived zoom, floored at a minimum sprite size, centred behind
the leader, with the leader ALWAYS kept in frame.** Presentation only — world fingerprint unchanged
(`dc4647be0f55ebdb`). **Not shipped until the owner's eye accepts it (Lesson 191).**

## BUILD-VS-SPEC CONFORMITY (step by step)

1. **Leader + N racers (owner value).** `_setOverviewGroupTargets` frames `overviewFrameRacers` racers = the
   leader + the next N−1 in running order (racers sorted by cumulative `t` descending). N is a Dev-Screen slider,
   not a constant. **Reading:** "leader plus next N−1" is the natural reading and is what I implemented.
2. **Derived zoom.** The zoom is computed to fit the group's world bounding box within `innerFramePct` (per axis,
   the more zoomed-out wins), capped above at the normal overview zoom (OVERVIEW must not become a leader-zoom).
   No fixed zoom.
3. **Sprite-size floor, outranks the count.** The zoom stops zooming out once a racer sprite would fall below
   `overviewMinSpriteFrac` of the frame width; that floor is a Dev-Screen slider and it outranks the count
   (`zoom = max(min(ceil, fit), floor, wholeWorld)`). Legibility beats fitting everyone.
4. **Leader shown, not centred; centre behind the leader.** The frame centre = the group's box centre, which
   sits behind the leader toward the followers (see "backward-along-track" below).
5. **No fixed pixels.** Both owner values are a COUNT and a FRACTION of the frame; the offset and floor are
   fractions; the framing is identical at any resolution (check 3). See "Every value introduced".
6. **Guarantee outranks the offset.** The leader is clamped to stay inside `innerFramePct` as the LAST step, so
   no slider value, at any resolution, can crop him — the centre yields toward the leader, never the reverse.

**Sliders & stored config (Lesson 193).** Both owner values are TOP-LEVEL config keys. **Owner-approved
deviation:** the owner (sole host) waived the schema bump + migration; instead the existing `loadCameraConfig`
top-level backfill (the Lesson-193 safety net) guarantees a stored config can never mask the new defaults, and a
standing test proves the config→director live path (a config with the keys uses them; a config without them gets
the defaults) in place of a migration test. Deviation declared.

**Scope — CLOSED tracks only (declared deviation).** The new derived-group framing is applied to CLOSED tracks
only (the defect track and both measured tracks are closed ovals, where the field WRAPS and the old whole-world
overview + radial offset failed). OPEN tracks keep their existing whole-track overview, which already frames the
leader + the full field with no wrap and no off-edge problem — so it already satisfies "show the leader + N".
Reasons declared: (a) the owner's defect and all measurement are closed; (b) the open-track uniform-zoom path
has different zoom semantics that my per-axis box-fit was not validated against (it broke four existing
open-track overview-zoom tests by zooming in on the front group instead of showing the whole track); (c) keeping
open on its accepted behaviour preserves attribution. The Dev-Screen sliders therefore affect closed-track
OVERVIEW; extending the rule to open tracks (validated) is Proposal 1's neighbour.

**What was NOT touched:** `_containAnchorInFrame` / the clamp (cause C) — see the interference check below;
LEADER_ZOOM / BATTLE_ZOOM / the glide / any simulation code; no easing/duration/zoom-level/config value changed.

## How the backward-along-track offset is computed, and why it is correct on both shapes

The frame centre is the **world bounding-box centre of {leader + next N−1}**. The followers are behind the leader
in running order, so their world positions ARE backward along the track; their box centre therefore sits behind
the leader, toward the field. This is correct on **open** shapes (followers strictly behind → centre behind) and
on **closed** shapes (followers behind along the ARC → centre toward them, i.e. backward along the track) —
crucially NOT toward the geometric shape centre, which is what the old radial offset did and why it shoved the
leader sideways off the edge at an oval's ends. Because it is derived from actual racer positions, it needs no
track-tangent maths and cannot point "sideways" — it always points at where the field actually is.

## Every value introduced (units + home)

| Value | Units | Home | Pixel? |
|---|---|---|---|
| `overviewFrameRacers` | integer count | `DEFAULT_CAMERA_CONFIG` (top-level), Dev-Screen slider | no |
| `overviewMinSpriteFrac` | fraction of frame WIDTH | `DEFAULT_CAMERA_CONFIG` (top-level), Dev-Screen slider | no |
| `zoomFit`, `zoomCeil`, `zoomFloor`, box centre | derived per frame | `_setOverviewGroupTargets` | no |

The only pixel quantity read is the racer's existing `_drawnBodyWidthRefPx` (its physical drawn body width in
world px), used to convert the min-sprite FRACTION into a zoom — a property of the racer, not a framing constant.
**Removed / now dead:** the magic `overviewOffsetPx` (150) is no longer read; `_applyOverviewRadialOffset` was
deleted. The dead `_DEFAULT_OVERVIEW_OFFSET_PX` const and the per-state `overviewOffsetPx` config key remain
(unread) — left to avoid a per-state removal migration; flagged for cleanup.

## The six pre-registered checks (measured, seed 5601)

Measured by replaying the real seed-5601 racer frames (`sim-fairness --dump-frames`) through
`_setOverviewGroupTargets` on **dirt-oval** (the defect track) and **searound**, at **1280×720 / 1920×1080 /
2560×1440**, at the proposed defaults (N=5, minSpriteFrac=0.018):

| Track | worst LEADER margin (check 1) | floor bind % (check 2) | avg racers framed |
|---|---|---|---|
| dirt-oval | **15.0%** of the frame | 100% | 4.39 / 5 |
| searound | **15.0%** of the frame | 0% | 4.91 / 5 |

1. **Leader inside with margin, every frame:** worst-case **15.0%** of the frame on both tracks — the leader is
   never closer than 15% to any edge, i.e. never off-screen. 15% is the inner-frame front edge: the leader sits
   toward the front (rule 4), field behind. Standing test asserts it across the whole slider range.
2. **Count rule:** where the floor does NOT bind (searound), ~5/5 are framed (4.91). Where it binds it shows
   fewer, by design (floor outranks count). Floor-bind %: searound 0%, dirt-oval 100% — see the finding below.
3. **Resolution independence:** the fractional framing is **identical** at 1280/1920/2560 (measured byte-equal
   row-for-row) — the owner's explicit requirement. Standing test asserts leader-fraction + visible-world-fraction
   invariant across three scales.
4. **Slider independence:** the leader guarantee holds across N∈{2,5,8,12} × minSpriteFrac∈{0.01,0.022,0.04,0.06}
   INCLUDING the extremes (standing test) — worst margin 15% at all.
5. **Fingerprint / suites / guards:** see VERIFICATION.
6. **Standing tests for 1, 3, 4 exist** (the `OVERVIEW-FRAMING-1` describe block in `CameraDirector.test.js`):
   leader-always-framed across sliders, N-racers-framed, centre-behind-leader, resolution independence, config
   live-path. "The leader is always framed" is now a TEST, not a comment (Lesson 192).

## Proposed defaults + evidence, and how often the floor bound

**Proposed: `overviewFrameRacers = 5`, `overviewMinSpriteFrac = 0.018`** (≈23 px sprite at 1280p). At 0.018 the
floor does not bind on searound (0%, 4.91/5 framed) and shows more of the field on dirt-oval; 0.022 gave bigger
sprites but bound 100% on searound too (4.49/5). N=5 is a legible leader-plus-front-group.

**HONEST FINDING — the floor binds far more than "rarely", contradicting the owner's expectation.** On
dirt-oval it binds **100%** at every tested minSpriteFrac (0.018–0.03); on searound it binds 0% at 0.018 but
100% at 0.022+. Why: on these large 3072-px closed ovals the front five racers span roughly HALF the world
width, so fitting all five at a legible sprite size is geometrically impossible — the legibility floor correctly
caps the zoom (rule 3). This is the rule **working as specified**, not a bug: the leader is still always framed
at ≥15% margin toward the front (the defect is fixed) and ~4.4/5 of the front group is shown; the zoom simply
sits at the legibility floor rather than zooming further out into illegibility. **But the owner should know:**
"derive the zoom to fit N" (rule 2) is mostly inert on big spread ovals — the floor wins — so on those tracks
the framing is effectively "leader-at-front + as much field as stays legible", a near-constant zoom. If the
owner wants the floor to bind rarely, the rule's SHAPE would need to change (Proposal 1). His eye decides
whether the floor-bound framing is right.

## Did the clamp (cause C) interfere? — NO, with evidence

`_containAnchorInFrame` acts on `_focusAnchorRacer(racers)`, which returns **null** for the OVERVIEW state
(group shots have no single anchor). With a null anchor the clamp **returns early and mutates nothing**. So the
containment clamp is inert during OVERVIEW and cannot interfere with this framing — the new OVERVIEW target is
delivered untouched by cause C. (Cause C remains present and unfixed for other states, as designed.)

## What I could not measure, and why

- **The owner's live eye + `[RA CAMERA LIVE TRUTH]` (Lesson 191).** The acceptance is his session; pending.
- **Open-track behaviour under the new rule.** Deliberately out of scope (see the CLOSED-only deviation): open
  tracks keep the whole-track overview. Both the defect track and both measured tracks are closed ovals, so I
  neither needed nor validated the derived-group framing for the open-track uniform-zoom path.

## VERIFICATION (from the committed state — SHIP-CEREMONY step 12)

```
# World fingerprint — UNCHANGED (presentation only; the simulation is untouched)
$ node scripts/fingerprint-default.mjs
COMBINED dc4647be0f55ebdb (seed=1 races=3 track-defaults, 10 tracks, default config)

# Standing tests (checks 1, 2, 3, 4, 6 + the config live-path in place of a migration test)
$ npx vitest run CameraDirector.test.js -t "OVERVIEW-FRAMING-1"
  ✓ leader is ALWAYS inside the inner frame across the whole slider range (checks 1, 4, 6)
  ✓ frames at least N racers when the sprite floor does not bind (check 2)
  ✓ the frame centre sits BEHIND the leader — leader ahead of centre (rule 4)
  ✓ resolution independence: fractional framing identical at 3 canvas scales (check 3)
  ✓ config live path: owner values flow config → director; absent → defaults (Lesson 193)
  Tests  5 passed

# Camera suite (478) + the full client suite — the OVERVIEW change breaks nothing
$ npx vitest run src/modules/camera/
  Test Files  7 passed (7)   Tests  478 passed (478)
$ npx vitest run
  Test Files  162 passed (162)   Tests  3374 passed (3374)

# The four guards
$ node scripts/check-doc-links.mjs
check-doc-links: 310 relative links across 52 living-doc files; 0 dangling.
$ node scripts/check-index.mjs
check-index: 73 reports checked, 0 unindexed.
$ node scripts/check-tags.mjs
check-tags: 46 origin tags checked, 0 unregistered.

$ git status --porcelain
  (clean — no output)
```

## Hand-off — owner, please run (folds in the two CAMERA-GLIDE-TARGET-1 formalities)

1. **http://localhost:5173** → log in. 2. Dev Screen → Camera Advanced → set **"OVERVIEW racers framed"** and
**"OVERVIEW min sprite size"** before the race. 3. Run **seed 5601** on **Quick Test · Dirt Oval** (the defect
track) AND on your standard track. **Expect:** the leader is no longer off the edge — he sits toward the front
with the field behind, at every OVERVIEW. 4. Try a **second zoom setting** (this also completes the glide-fix
acceptance, which was accepted at one setting only). 5. Paste the **`[RA CAMERA LIVE TRUTH]`** line from THIS
post-fix session (the one on file is from the pre-fix build). I will not call it done until your eye accepts it.

## PROPOSALS (≥2)

1. **If the floor binding everywhere is not what you want, change the rule's SHAPE to a fixed backward ARC.**
   The measurement shows "fit the front N's world bounding box" fights the legibility floor on big ovals (the
   front N span half the world). An alternative that binds the floor rarely by construction: frame a FIXED arc
   behind the leader — a set fraction of a lap (an owner value) — so the zoom depends on a chosen arc length,
   not on how spread the field happens to be. The leader guarantee and resolution-independence carry over
   unchanged; only the box definition changes (arc-extent instead of racer-extent). This is a rule change, so it
   is the owner's call — but it is the honest answer to "the floor should bind rarely".
2. **The old offset was a number pretending to be a rule — audit the camera path for the SAME shape.** The prime
   remaining instance is the OVERVIEW *entry* phase, which still uses the fixed `_ovSnapZoom` and pans along
   `_camT` rather than the new derived group framing, so entry and steady OVERVIEW can disagree for a beat at the
   handoff. It is a candidate to unify with `_setOverviewGroupTargets` (a stated framing rule) rather than a
   separate fixed-zoom path — worth a look once the steady framing is eye-accepted. More broadly, any camera
   value named for a fixed pixel size or a fixed zoom is a number that should be a stated guarantee with a test;
   the two owner values here are the model.
3. **Make "the leader is always framed" a guarantee the whole camera honours, not just OVERVIEW.** OVERVIEW now
   provably keeps the leader in frame; LEADER_ZOOM relies on the containment clamp (cause C) to do the same, and
   cause C is a known wiring bug. When cause C is fixed, express its success as the same testable invariant this
   block added (leader within innerFramePct), so both states share one proven guarantee rather than two
   mechanisms.
