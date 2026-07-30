# CAMERA-GRAMMAR-1 — ship grammar (B) FULL GLIDE as default, correctness decoupled from style

Base `origin/master @334cd48` · presentation-only · fingerprint **`ded0a126048e4cdb` IDENTICAL** (re-minted on the committed state). The real defects are fixed and owner-accepted (follow tracking, per-axis mapping, zoom-about-anchor). The owner's standing, preregistered verdict: the hard TRUE CUTs feel too abrupt — the smooth transition feel is preferred. So the shipped grammar becomes **glide**; **cut** stays selectable.

## STEP 1 — correctness decoupled from style
The three correctness pieces are now independent of the grammar:
- **per-axis screen mapping** (FOCUS-5) lives in `_containAnchorInFrame` — always runs, every grammar.
- **zoom-about-anchor** (SIDEJUMP-1) lives in the follow path — always runs, every grammar.
- **observer follow-promotion** is set on entry for **both shipped grammars** (`glide` and `cut`), so `_setTargets` frames the live subject (forward-framed anchor), never the retired entry-phase centreline pan. (`'legacy'` is left verbatim as the bare-caller fallback — its entry-glide machinery is still used by the finish-mode OVERVIEW zoom-out; retiring it would churn that infrastructure for a non-shipped path.) Unit test: `glide` and `cut` both resolve `observerPhase='follow'` on anchored entry and run the per-axis + anchor-pivot paths.

## STEP 2 — 'glide' first-class (no hybrid)
On state entry the grammar captures the **pre-transition** framing (before the commit block's OVERVIEW/LEAD_CHANGE hard zoom-snaps — otherwise glide would start from a snapped zoom = the old hybrid). Then pan AND zoom travel **together** on one smoothstep ease over `glideDurationMs` (config, validated 300–900, default 500) from that framing to the moving target's correct framing (forward-framed anchor, min-vis applied). Sharing one ease factor means the **zoom-about-anchor invariant holds by construction during the glide** — no instant half, no mid-transition lurch. At ease end it hands off to the steady follow path. Within-hold behaviour is untouched; the finish-mode OVERVIEW dramatic zoom-out stays exempt.

### Measured (searound seed-5601 replay, faithful per-axis, seeded RNG)
| | cut (prev default) | **glide (new default)** |
|---|---|---|
| max single-frame pan move at a transition | ~3436 px (intentional cut) | **~230 px** (smooth ease; only the finish-mode exempt zoom-out is larger) |
| leader outside inner-70 (LEADER-family) | 0.0 % | **0.0 %** |
| containment clamp activations | ~3 | ~74 (all small, ≤ the glide velocity) |

The 3436 px hard cut is now spread smoothly across 500 ms (~15× smaller per-frame), and the leader stays framed the whole way.

## STEP 3 — default + Dev panel
`DEFAULT_CAMERA_CONFIG.cameraTransitionGrammar = 'glide'` (additive; the v17 loader merges it under stored configs). The Dev camera panel now exposes **Transition style** (Glide/Cut), **Glide duration (ms)** (300–900), and **Leader forward-frame** (0.50–0.80) — no more console one-liners for taste tuning.

## STEP 4 — tests
`CAMERA-GRAMMAR-1` (CameraDirector.test.js): `glideDurationMs` validates to [300,900]/default 500 and the shipped default is glide; both shipped grammars promote `observerPhase='follow'` on anchored entry; the glide has pan **and** zoom strictly between start and target at mid-glide (co-travel, no hybrid) and lands the leader forward-framed inside inner-70 by glide end, then hands off to `tracking`; and a regression guard drives a min-vis zoom change under the glide default — the leader stays inside inner-70 on both axes with worst frame-to-frame < 20 px (FOCUS-5 per-axis + SIDEJUMP-1 zoom-about-anchor both hold). 955 camera/config/screen tests green; the 365 legacy tests unchanged.

## Five sentences
1. The owner's verdict ships: grammar (B) FULL GLIDE is the default — on entry pan and zoom ease together over 500 ms to the subject's correct framing, so the 3436 px hard cut becomes a smooth ~230 px/frame move.
2. Correctness is decoupled from style: per-axis mapping and zoom-about-anchor always run, and both shipped grammars promote the follow observer on entry, so switching glide↔cut never loses a fix.
3. Glide captures the pre-transition framing before the OVERVIEW/LEAD_CHANGE zoom snaps, so it eases pan and zoom together with one factor — no snapped-zoom-plus-gliding-pan hybrid, and zoom-about-anchor holds through the glide.
4. Cut stays selectable and the Dev panel now exposes transition style, glide duration, and leader forward-frame — taste tuning without console commands.
5. Fingerprint is byte-identical (`ded0a126048e4cdb`); presentation-only, 955 tests green.

## Proposals (≥2)
1. **Owner eye on seed 5601.** Transitions should feel smooth like before the cuts, the leader stays forward-framed through them, and nothing else regresses (min-vis lurch stays fixed). If a specific transition feels too slow/fast, dial **Glide duration** in the Dev panel (300–900 ms) rather than changing code.
2. **Per-state glide duration.** A single `glideDurationMs` governs all entries; a fast LEAD_CHANGE and a lazy OVERVIEW pull-back might want different times. If the eye wants it, promote `glideDurationMs` into `cameraStateProfiles` per state (the ease code already reads a single value — it would just read the per-state one).
3. **Glide the finish-mode zoom-out through the same path.** The finish OVERVIEW is still on the legacy entry glide; folding it into grammar (B) (with its own longer duration) would unify every transition under one ease and let the legacy entry machinery finally retire.
