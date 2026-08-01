# CAMERA-GLIDE-TARGET-1 — compute the glide endpoint at the DESTINATION zoom (fixes CAMERA-DETOUR cause D only)

The [CAMERA-DETOUR](CAMERA-DETOUR-2.md) diagnosis confirmed two causes. This block fixes **exactly one — cause D**
— and nothing else. Cause C (the containment clamp steering) is deliberately left broken so that whatever the
owner sees is attributable to a single change. The world fingerprint is unchanged (`dc4647be0f55ebdb`): this is
presentation, it must not touch the simulation. **The fix is not shipped until the owner's eye accepts it
(Lesson 191)** — this report ends with a hand-off, not a claim that it works.

## BUILD-VS-SPEC CONFORMITY (step by step)

- **The change (only one permitted).** `_setClosedTrackTargets` and `_setOpenTrackTargets` now compute the glide
  endpoint (`targetOffsetX/Y`) at the **destination** zoom (`zoomResolved`, the same resolve that sets
  `this.targetZoom`) **when `_lerpPhase === 'glide'`**, instead of re-resolving at the live, still-easing zoom.
  The non-glide (entry/tracking) paths are untouched. Read below for which line, and why.
- **Zoom value.** Resolved through the SAME config path that produces the rendered zoom for the state — not a
  literal, not a construction-frozen snapshot. Evidence below.
- **Did not touch `_containAnchorInFrame` / the clamp** (cause C left for next block; side-effect assessed below).
- **Changed no easing curve, duration, `leaderForwardFrac`, zoom level, or config value.**
- **Kept the CAMERA-DETOUR frame log exactly as-is**, gated and OFF by default — it proves the fix.
- **Tag + register in one step:** `pre/glide-target` (`2e20e1f3`) created and registered in
  [docs/TAGS.md](../../docs/TAGS.md) before the change.
- **Deviation:** none. One nuance on the pre-registered check 3 is declared under the checks.

## Which line read the live zoom, and why

`_setClosedTrackTargets` (and its open-track mirror) resolved the pan endpoint at

```
const currEffZoom = Math.max(this.zoom * this._bsX, minEffZoom);   // ← this.zoom = the LIVE, still-easing zoom
const panResolved = resolveCamera({ targetWorld: target, desiredEffZoom: currEffZoom, … });
this.targetOffsetX = -panResolved.camX * panResolved.effectiveZoom;
```

**Why it was wrong for the glide:** the ordering comment in `update()` says the zoom lerp is applied *before*
`_setTargets` "so that `targetOffsetX` is computed with the post-lerp zoom." But that lerp only runs when
`tSpaceLerpActive` — the **entry** path. During a GRAMMAR-1 **glide**, `tSpaceLerpActive` is false, so `this.zoom`
is the still-easing value and the endpoint was resolved at the wrong scale every frame — the endpoint travelled
while the glide ran (cause D). The entry/tracking paths genuinely need the live zoom (they *pin* offset to
`targetOffset` each frame while the zoom eases), so the fix is gated on `_lerpPhase === 'glide'` and leaves them
alone.

## How the destination zoom is resolved (and evidence it is not frozen)

The function already computes, above the buggy block:
`zoomResolved = resolveCamera({ desiredEffZoom: stateEffZoom, … }); this.targetZoom = zoomResolved.effectiveZoom / bs`.
`stateEffZoom` is `this._leaderZoom * bs` / `this._battleZoom * bs` / … — the per-state zoom levels derived from
config via `_computeZoomForSpriteScale(config sprite scale)`. The fix reuses `zoomResolved` (the destination
resolution) for the glide endpoint. So the endpoint zoom is exactly `this.targetZoom` — the zoom the glide lands
on and the renderer draws at `s=1` — through the identical config path as the rendered zoom. **Not frozen:** the
zoom levels are read from config when the director is constructed (once per race), and `stateEffZoom` is
recomputed on every `_setTargets` call; a new race constructs a new director with the current config. The
standing test proves the endpoint tracks the **destination** value at **two different settings** (leader vs
battle destination), not a literal.

## Mid-race responsiveness — deliberately NOT pursued (declining a bonus, correctly)

Zoom levels are read at construction (once per race), so a Dev-panel slider changed **between** races takes effect
on the next race (new director, new config), and a change **mid-race** does not. That matches the owner's stated
usage (sliders set before a race). Live mid-race response did **not** fall out for free, and I **did not pursue
it** — chasing it would mean re-reading config mid-race (indirection/refresh machinery) for a welcome-bonus the
owner explicitly did not want traded against simplicity. The change stays minimal.

## The five pre-registered checks (mechanical proof + reference; live acceptance pending the owner)

My harness proof is deterministic (unit tests + one captured glide window); the seed-5601 **live** acceptance at
two Dev-panel zoom settings is the owner's, per Lesson 191 — pending his re-run.

| # | Check | Reference (owner pre-fix, LEAD_CHANGE→OVERVIEW) | Post-fix (harness) |
|---|---|---|---|
| 1 | Endpoint stable (`toX` travels ≤ anchor travel) | `toX` −1798.6 → −3083.2 → walked **1148 px** back over the glide | `toX` = **−265, CONSTANT** across all 30 glide frames (anchor `awX` fixed → 0 px travel). Two-destination unit tests: endpoint at live zoom 1.0 vs 6.0 is **identical to 1e-6** |
| 2 | No sign flip (anchor monotonic) | anchor 626 → **205** → 433 (a 421 px excursion + reversal) | anchor `anchorSX` **500 → 639.3 monotone**, no reversal (s 0→0.96) |
| 3 | Endpoint computed at the destination zoom | frame 0 endpoint in the OTHER state's scale (full step) | endpoint invariant to the live zoom = computed at the destination (unit test) — see nuance below |
| 4 | Nothing else moved | — | world fingerprint **`dc4647be0f55ebdb`** (identical); camera + parity suites 509 green |
| 5 | Clamp UNCHANGED where it fired | `containDX` → −390 in the LEAD_CHANGE window | clamp CODE byte-identical (see below); harness glide `containDX = 0`; live re-run needed for that window |

**Check-3 nuance (declared).** The DETOUR field `stZoom` logs `this.zoom` (the render zoom), which still eases —
that was never the bug, and I did not change the log. The fix decouples the *endpoint* from `this.zoom`, so
check-3's real consequence — the endpoint being in the wrong scale — is gone, and is observed as check 1 (`toX`
constant) plus the unit test (endpoint invariant to the live zoom). On the owner's trace, read check 3 as "toX no
longer jumps between frame 0 and 1", i.e. it is subsumed by check 1.

**Post-fix glide frame table (harness, `cameraTransitionGrammar='glide'`, stationary anchor):**

```
rel  from→to               anchorSX   awX  toX    s      br      containDX
 0   OVERVIEW→LEADER_ZOOM   500.000    500  -265   0.000  glide   0
 1   OVERVIEW→LEADER_ZOOM   500.421    500  -265   0.032  glide   0
 2   OVERVIEW→LEADER_ZOOM   501.647    500  -265   0.064  glide   0
 5   OVERVIEW→LEADER_ZOOM   509.605    500  -265   0.160  glide   0
10   OVERVIEW→LEADER_ZOOM   533.833    500  -265   0.320  glide   0
15   OVERVIEW→LEADER_ZOOM   565.802    500  -265   0.480  glide   0
20   OVERVIEW→LEADER_ZOOM   598.632    500  -265   0.640  glide   0
30   OVERVIEW→LEADER_ZOOM   639.346    500  -265   0.960  glide   0
```

`toX` is flat at −265 the whole glide (the endpoint no longer travels); `anchorSX` climbs monotonically to its
final framing. Compare the reference `toX` 1148 px walk.

## Did clamp behaviour change as a side effect? — CODE no, OUTPUT possibly (run-dependent), unmeasured live

`_containAnchorInFrame` is **byte-identical** (the diff touches only the two `_setTargets` functions + tests +
docs). Its invocation is unchanged. But its INPUT — the offset during a glide — is now the corrected value, so on
a run where the corrected mid-glide framing no longer breaches the inner frame, the clamp will fire **less**. In
the harness glide it was already inert (`containDX = 0`). I therefore **predict** the LEAD_CHANGE window's
`containDX` drops post-fix (the anchor is now correctly framed mid-glide, so the emergency rail is not triggered)
— but I did **not** tune it and cannot confirm without the owner's live re-run (check 5). If it does drop, that is
a *beneficial side effect of correctness*, not a change to cause C, which remains present and unfixed.

## What I could not measure, and why

- **The seed-5601 live acceptance (checks 1–5 at two Dev-panel zoom settings) and the owner's eye.** Lesson 191:
  the harness is trusted only while live == replay; the acceptance is his session, pending.
- **The LEAD_CHANGE-window clamp `containDX` post-fix (check 5).** Needs a live glide where the anchor would have
  breached the inner frame; the stationary-anchor harness cannot manufacture that. The owner's re-run shows it.

## EYE-TEST RESULT — ACCEPTED (owner, 2026-08-01)

**The owner ran seed 5601 on the standard track and the wrong-direction move at view changes is GONE — cause D
is accepted.** Attribution is preserved: cause D was built, measured, and eye-accepted on its own before any
further camera change. Two formalities from this spec remain and were folded into the OVERVIEW-FRAMING-1
hand-off (a single combined run): (1) the `[RA CAMERA LIVE TRUTH]` line from a session running the POST-fix
build (the line on file is from the pre-fix commit), and (2) a second zoom setting (accepted so far at one
setting only). Cause C (the containment clamp) remains present and unfixed, as designed.

## Hand-off — owner, please accept or reject (seed 5601)

1. **http://localhost:5173** → log in. 2. Dev Screen → Camera → set a zoom setting **before** the race. 3. Run
**seed 5601**; watch each view change. **Expect:** the wrong-direction move should be **gone** at every
transition; any residual detour is **cause C** (the clamp) and is expected until the next block. 4. Repeat with a
**different** zoom setting set before a second race (the fix must hold at both). 5. Turn on "Enable detour frame
log", run once more, and paste the `[RA CAMERA DETOUR]` windows **and** the `[RA CAMERA LIVE TRUTH]` line from
your browser. I will not claim the fix works until your eye says so.

## VERIFICATION (from the committed state — SHIP-CEREMONY step 12)

```
# World fingerprint — UNCHANGED (presentation only, no simulation touch)
$ node scripts/fingerprint-default.mjs
COMBINED dc4647be0f55ebdb (seed=1 races=3 track-defaults, 10 tracks, default config)

# The standing invariant test + the camera & parity suites (not a blanket run)
$ npx vitest run src/modules/camera/CameraDirector.test.js -t "CAMERA-GLIDE-TARGET-1"
  ✓ GLIDE endpoint is invariant to the live easing zoom (leader destination — two settings)
  ✓ GLIDE endpoint is invariant to the live easing zoom (battle destination — two settings)
  ✓ GLIDE endpoint mirrors on OPEN tracks too (both target functions fixed)
  ✓ ENTRY/TRACKING endpoint still tracks the live zoom — the fix is glide-specific (entry untouched)
  Tests  4 passed
$ npx vitest run src/modules/camera/ src/modules/parity/
  Test Files  10 passed (10)
  Tests  509 passed (509)

# Guards
$ node scripts/check-doc-links.mjs
check-doc-links: 310 relative links across 52 living-doc files; 0 dangling.
$ node scripts/check-index.mjs
check-index: 72 reports checked, 0 unindexed.
$ node scripts/check-tags.mjs
check-tags: 45 origin tags checked, 0 unregistered.

# Script test suite, as CI runs it
$ node --test $(find scripts -name '*.test.mjs')
  tests 121 | pass 121 | fail 0

$ git status --porcelain
  (clean — no output)
```

## PROPOSALS (≥2)

1. **The standing invariant test — cheap, unconditional, and it belongs beside the target functions.** "A glide's
   endpoint is CONSTANT for the duration of the glide" is exactly what this block added:
   `_setClosedTrackTargets`/`_setOpenTrackTargets` with `_lerpPhase='glide'` must return the SAME `targetOffset`
   for any live `this.zoom` (asserted at two destination settings, open + closed). Under the owner's usage (config
   fixed during a race) the invariant is unconditional; if mid-race config is ever supported, express it against a
   config-revision counter — constant while the revision is unchanged — rather than weakening it. This test would
   have caught cause D on the day GRAMMAR-1 shipped, because it fails the moment the endpoint reads a value that
   is still travelling. It lives in `CameraDirector.test.js` (added here).
2. **Sweep the camera path for the same bug SHAPE: a destination recomputed against a value that is still
   travelling.** Cause D is one instance; the shape is general. The prime suspects share "compute a *target* from
   a *live, easing* quantity": the entry/T-space path deliberately does this (safe, because it pins each frame),
   but any OTHER place that stores a `target*` from `this.zoom`/`this.offset`/`_camT` mid-transition should be
   audited with the same "invariant to the live value across the transition" test. The DETOUR log's `toX/awX/br`
   already make such travel visible; a one-pass audit (not a permanent guard on every call) is the right dose.
3. **Ship C next, alone, and re-use this instrument as the acceptance artifact.** With D shipped and attributable,
   the clamp fix (cause C — gate `_containAnchorInFrame` to steady tracking, with a `containDX==0` mid-glide test)
   becomes the single next change; the same `[RA CAMERA DETOUR]` window on seed 5601 is its before/after evidence.
   One change at a time keeps every improvement attributable to the owner's eye.
