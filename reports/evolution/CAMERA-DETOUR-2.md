# CAMERA-DETOUR-2 — the STEP 3 verdict, and one narrow follow-up (still fix nothing)

This completes the diagnosis begun in [CAMERA-DETOUR-1.md](CAMERA-DETOUR-1.md): the owner ran that
instrument on **seed 5601** and delivered four transition windows; the planner read them. This report records
the verdict and ships ONE tightly-scoped instrument extension to settle the single window the four candidates do
not yet explain. **Nothing is fixed here** — two causes are confirmed (one a Lesson-192 violation) and their
fixes are PROPOSED, not shipped; the owner decides what changes and in what order, on his eye, one at a time.
No fingerprint mint, no tag.

## BUILD-VS-SPEC CONFORMITY (step by step)

### STEP 1 — record the verdict — DONE (this report)
The STEP-3 readout from the owner's four live windows is recorded verbatim below (numbers from the planner's
read; not recomputed). CAMERA-DETOUR-1's STEP 3 section now points here so the diagnosis reads as ONE story.
**Two causes confirmed (C, D), one candidate excluded (A), one window unexplained (B denied by its own log).**

### STEP 2 — the narrow follow-up instrument — BUILT
Extended the SAME gated log (`cameraDetourLog`, default OFF, read-only, mutates no camera value) with, per frame:
**`awX/awY`** (the anchor's WORLD position — so its own motion separates from the camera's), **`toX/toY`**
(`targetOffsetX/Y`, the glide endpoint recomputed that frame — a moving endpoint shows as a moving endpoint),
**`s`/`e`** (glide progress, linear + eased), **`br`** (which branch actually wrote `offsetX/offsetY`:
`glide` | `cut` | `follow`), and **`rc`** (how many racers the anchor centroid was computed from). Liveness test
extended to assert the new fields are present. **Deviation:** none.

### STEP 3 — the decisive read for the follow-up — **WAITS on the owner's re-run** (seed 5601, LEADER_ZOOM→OVERVIEW)
The (i)/(ii)/(iii) decision requires the new fields on a fresh live trace of that transition type — I will not
substitute a replay (Lesson 191). What the owner runs is in "Handoff" below.

## Recorded STEP 3 verdict (from CAMERA-DETOUR-1, the owner's four live windows on seed 5601)

**CANDIDATE C — CONFIRMED. The containment clamp is STEERING, not railing.**
- Window **OVERVIEW → LEAD_CHANGE**: `containMod` is true on frames **0 through 22** (23 of the first 23
  frames), with `containDX` growing to **−390 px**. Across those same 23 frames the anchor moves **18 px**
  (1048.9 → 1030.8) while the camera offset travels **~1770 px**. On frame **23** `containDX` falls to 0 and the
  anchor immediately covers **446 px in 8 frames** (1030.8 → 584.8).
- Second window of the same pair: clamp active on frames **0–3** (`containDX` +47.5 → +3.6), anchor pinned at
  **~225** for exactly those 4 frames, then released.
- Both clamp-active windows are transitions **WITH a zoom change**.
- The call's comment reads *"safety rail (no-op mid-glide)"*. It is measurably **not** a no-op — it is doing the
  steering. **Lesson 192 verbatim: a clamp that steers is a WIRING bug, not a tuning value.**

**CANDIDATE D — CONFIRMED, larger than the spec anticipated.**
- In **ALL FOUR** windows, frame 0 shows `stZoom` and `rz` differing by the **FULL state zoom step**
  (e.g. 7.2 vs 4.724789, or the reverse) — **not** a fractional per-frame lag. The frame on which the glide's
  target framing is captured computes it **in the OTHER state's scale**.

**CANDIDATE A — EXCLUDED.** In every window `gsoX/gsoY/gsz` equal `preoX/preoY/prez` **exactly** — the captured
glide start matches the last rendered frame. A is not the fault; what looked like a wrong start point is **D + C
acting on frame 0**.

**CANDIDATE B — NOT evidenced, and the window that most looks like a second mover contradicts it.**
- Window **LEADER_ZOOM → OVERVIEW**: the anchor travels **473.6 → 29.2 px** (the left edge of frame) over frames
  0–15, then **reverses** and returns to **420.4** by frame 30 — a **444 px excursion in the wrong direction**,
  the owner's reported symptom in its purest form.
- But `containMod` is **FALSE** on every frame of that window (C excluded here), and `camTRead` is **false** with
  `camT` constant at **1.513395** throughout (the track-space mover reports no read).
- So the pre-registered "late smooth reversal → second mover" branch fires, **but the logged second mover denies
  involvement.** This is the OPEN QUESTION that STEP 2's extension exists to settle — not papered over.

## Follow-up readout — (i)/(ii)/(iii): PENDING the owner's re-run

The extension logs the anchor's WORLD motion (`awX/awY`), the glide endpoint (`toX/toY`), the writing branch
(`br`), and the centroid count (`rc`). On the owner's next LEADER_ZOOM→OVERVIEW window the read is mechanical:
- **(i)** `awX/awY` swings and `offsetX` tracks `-awX·effZoom` honestly → the "detour" is the **OVERVIEW anchor
  definition** (a moving field-centroid, likely `rc` changing as the field spreads / leader pulls away), not the
  glide. The fix conversation is then about what OVERVIEW should centre on.
- **(ii)** `awX/awY` steady while `offsetX`/`toX` swing → a **genuine second mover**; then the logged
  `camTRead:false` is itself suspect and `br` names which path wrote the offset — prove it.
- **(iii)** both move and the composition overshoots → say so, with the two curves (anchor-world vs camera)
  side by side.

I will state which the data supports and which it rules out once the trace arrives.

## PROPOSED FIXES (unshipped — the owner decides, one at a time, on his eye)

**C — make the clamp structurally incapable of steering.** The mid-glide `_containAnchorInFrame` call recomputes
the anchor's CURRENT screen position and shoves it inside the inner frame — but during a zoom-change glide the
anchor is legitimately *in transit*, so the clamp "corrects" a position that is correct-for-this-frame and
becomes the mover (23/23 frames, −390 px). The glide already lands the anchor centred at `s=1`; the clamp is a
STEADY-state safety net, not a transition actor. **Fix:** do not run the clamp while the glide owns the frame —
gate `_containAnchorInFrame` to `_lerpPhase === 'tracking'` (steady follow), not the glide/cut branches.
**Enforcement (Lesson 192 — "clamp-active ≈ 0 in steady state is a TEST, not a comment"):** a test in
`CameraDirector.test.js` that drives a real zoom-change transition through the glide and asserts
`containDX === 0 && containDY === 0` on **every glide-branch frame** (the DETOUR log already exposes exactly
this). The clamp may still fire in steady tracking as the genuine safety net.

**D — make the target framing and the rendered frame use ONE zoom by construction.** `_setTargets` computes
`targetOffset` from `this.zoom`, but on frame 0 `this.zoom` is still the OLD state's zoom (the glide sets the new
zoom AFTER `_setTargets`), so the endpoint is computed in the wrong scale by a full zoom step. **Fix:** compute
`targetOffset` from the **`targetZoom`** (the framing the glide is heading to), not the live `this.zoom` — the
glide lands at `targetZoom`, so an endpoint computed at `targetZoom` is consistent at `s=1` AND on every
in-between frame (this is what GRAMMAR-1's "zoom-about-anchor holds by construction" comment *claims* but frame 0
violates). This removes the dependency on call ordering entirely. **If the honest answer is instead "reorder the
calls"** (compute the glide's `this.zoom` before `_setTargets`), then what stops silent drift is a standing test
that `stZoom === rz` on frame 0 of every transition — but passing `targetZoom` explicitly into the pan endpoint
is the by-construction version and is preferred, because a reorder can be undone by a future edit while a
parameter cannot.

**Order — ship D FIRST, then C, each attributable.** D is the **universal** frame-0 error (all four windows,
every transition) and the cleanest single invariant; shipping it first cleans frame 0 everywhere and, crucially,
**isolates the LEADER_ZOOM→OVERVIEW residual** — if the 444 px excursion survives D, it is the anchor definition
or a genuine mover (STEP-2 read), not a scale error. C second removes the 23-frame clamp steering on zoom-change
transitions. They are **independent** (different code: D in the pan-endpoint zoom source, C in the mid-glide
clamp call), so one-at-a-time is clean; an attributable sequence matters more than a fast one.

## What I could not measure, and why

- **The (i)/(ii)/(iii) decision for LEADER_ZOOM→OVERVIEW.** It needs the new `awX/toX/br/rc` fields on a fresh
  live trace of that transition; I built the instrument but will not substitute a replay for the owner's session.
- **Whether D alone removes the open-window excursion.** That is a post-fix eye-test, and this block fixes
  nothing — it is the reason D is recommended first.

## Handoff — what the owner runs (seed 5601, aim for a LEADER_ZOOM → OVERVIEW window)

1. Open **http://localhost:5173**, log in. 2. **Dev Screen → Camera Advanced → "Enable detour frame log
(CAMERA-DETOUR-1)" ON** (already present from the last run). 3. Run a race on **seed 5601**; let it reach a
wide-shot transition (a leader pulling away → OVERVIEW). 4. Open the console (F12) and copy the
`[RA CAMERA DETOUR] LEADER_ZOOM->OVERVIEW [...]` line(s) — they now include `awX/awY, toX/toY, s, e, br, rc`.
5. Paste them back. Then STEP 3's (i)/(ii)/(iii) is a mechanical read.

## VERIFICATION (from the committed state — SHIP-CEREMONY step 12)

```
# Fingerprint (shipped-default) — identical OFF and ON
$ node scripts/fingerprint-default.mjs            # cameraDetourLog OFF (committed default)
COMBINED dc4647be0f55ebdb (seed=1 races=3 track-defaults, 10 tracks, default config)
$ (cameraDetourLog flipped true) node scripts/fingerprint-default.mjs   # flag ON
COMBINED dc4647be0f55ebdb (seed=1 races=3 track-defaults, 10 tracks, default config)
# → OFF == ON == baseline dc4647be0f55ebdb

# Liveness of the EXTENDED log (vitest / node:test) — now asserts awX, toX, br, rc are present
$ npx vitest run CameraDirector.test.js -t "CAMERA-DETOUR-1"
  ✓ ON: emits a [RA CAMERA DETOUR] window (pre + post frames) on a real transition
  ✓ OFF (default): produces NO frame-log lines and no export — proves it is truly gated
  Tests  2 passed

# Guards
$ node scripts/check-doc-links.mjs
check-doc-links: 310 relative links across 52 living-doc files; 0 dangling.
$ node scripts/check-index.mjs
check-index: 71 reports checked, 0 unindexed.
$ node scripts/check-tags.mjs
check-tags: 45 origin tags checked, 0 unregistered.

# Script test suite, as CI runs it
$ node --test $(find scripts -name '*.test.mjs')
  tests 121 | pass 121 | fail 0

# Full client suite — the extension breaks nothing
$ npx vitest run
  Test Files  162 passed (162)
  Tests  3369 passed (3369)

$ git status --porcelain
  (clean — no output)
```

Fingerprint-neutral by construction: the shipped-default fingerprint hashes pure race physics; the sim never
reads camera config nor instantiates `CameraDirector`, so `cameraDetourLog` (and this extension) cannot move it —
the mints below confirm OFF ≡ ON ≡ the baseline `dc4647be0f55ebdb`.

## PROPOSALS (≥2)

1. **Sweep the camera path for load-bearing comments that assert UNMEASURED behaviour — but measure once, don't
   guard everything.** The "no-op mid-glide" comment survived a full camera saga and two review passes because
   nobody measured it; the DETOUR log measured it in one window and it was false. The same class is sitting in
   plain sight: the cut-branch clamp's *"Emergency rail — a no-op when the cut lands centered"* (identical shape,
   already logged via `containMod`), and — sharper — GRAMMAR-1's *"the zoom-about-anchor invariant holds by
   construction DURING the glide"*, which candidate **D just falsified on frame 0**. Worth a **cheap one-time
   measurement sweep** with the existing instrument of every camera comment saying "no-op / by construction /
   holds / lurch-free / prevents", then convert only the CONFIRMED violations (C, D, and whatever the cut-rail
   shows) into standing tests. A permanent guard for every such comment would be over-fitting; a one-pass audit
   plus tests-for-the-real-ones is the right dose.
2. **Adopt "one mover per frame" as a testable invariant now that `br` exposes it.** The whole detour class is
   two writers touching the image in one frame (the glide AND the clamp; a scale error AND the glide). The `br`
   field records which branch wrote the offset; extend it (or a sibling assertion) so a test can assert that
   during `'glide'` the clamp contributed zero and the follow path did not also write — exactly the structural
   "two movers should never run at once" guarantee, enforced rather than tuned. This is the durable complement to
   the per-fix tests above.
3. **Keep the DETOUR instrument as the camera-change acceptance artifact.** Any future camera change already owes
   a Lesson-191 live-truth line; a `[RA CAMERA DETOUR]` window on seed 5601 showing the anchor's screen path
   monotonic through a transition (post-fix) is a specific, cheap regression artifact for this exact class —
   better than "looks right", and it is already built and gated OFF.
