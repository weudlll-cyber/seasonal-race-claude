# RUNIN-OWNS-1 — the run-in owns the endgame's framing

**Branch:** `feat/runin-state`, continuing from `514a7d67`. **Not merged.**
**Supersedes the shape of [RUNIN-STATE-1](RUNIN-STATE-1.md)**, whose diagnosis stands and whose
mechanism does not.

---

## 1. The change of shape, and why it was the right one

RUNIN-STATE-1 made the run-in a camera STATE and then measured the honest limit itself: it owned
**14.9% / 18.5%** of the endgame window and got **no frames at all in 3 of 8 races on each track**,
because the endgame lock is consulted only when `decideTransition` permits a transition and a shot
entered just before the threshold holds its own gate across it.

The owner's resolution: **stop competing for ownership and read the other states instead.** That is
what shipped here, and it fixes a second thing the state shape had not yet been caught on —
RaceScreen starts the photo-finish slow motion on `hudState === 'PHOTO_FINISH'`, so a RUN_IN state
holding the slot at the line would have **suppressed the slow motion outright**. Verified in
`RaceScreen/index.jsx:915` before the rework began, not after.

`CAM_STATE` is six again. `FRAMING_BY_STATE` is six rows again. `GUARANTEE.LINE` is gone. The run-in
adds no state, no per-state timing, no HUD label and no framing row.

## 2. The mechanism

From `endgameThreshold` to the first crossing, one more ceiling joins the `Math.min` that composes
every shot. **Two bounds, and only one of them is code:**

1. **The line** — `pointGuarantee` from the anchor's own place in the frame to the finish:
   `room / distance`. Wide when the finish is far, tightening by itself as the leader closes. No
   curve, no ramp, no knob.
2. **The active state's own zoom** — already the first term of that `Math.min`. It needed no code at
   all, which is why "never tighter than the underlying state" is said by the machinery rather than
   by a new rule. A leader shot closes to the leader zoom; a photo finish closes to the
   photo-finish zoom.

**Nothing is handed over.** As the leader arrives the line's requirement passes above the state's
setting, stops being the smallest term, and what is left is the shot that was always there. Anchor,
guarantee, position, `hudState`, the transitions and the slow motion are all untouched.

**Both ends of the window were already in the code**: `endgameThreshold`, and the first crossing —
past which the finish sequence owns the picture with its own authored moves.

**THE ONE REPAIR THIS NEEDED, and RUNIN-STATE-1's trace is what bought it.** `_focusAnchorRacer`
returns null for group shots, which SKIPS update()'s zoom-about-the-anchor correction. That is
harmless while a group shot's zoom is steady and fatal while it is moving — and the run-in moves
the zoom inside whatever state is running, PHOTO_FINISH included. So while the run-in is composing,
the correction falls back to `_framingProbe.anchorPoint`, the world point the framing was actually
built on. **Scoped to the run-in deliberately**: the null is a latent defect everywhere, but
repairing it in general moves both fingerprints with the key off, and "nothing outside the window
moves" is a promise this block has to keep.

## 3. Measured — 2 tracks x 8 seeds (9, 2814, 101, 202, 303, 404, 505, 606), n=20

|                                      | luger-hill                                       | searound                                        |
| ------------------------------------ | ------------------------------------------------ | ----------------------------------------------- |
| **the run-in composes**              | **100.0%** of the window                         | **100.0%** of the window                        |
| **empty frames**                     | **0**                                            | **0**                                           |
| line in frame, run-in window         | 11.9% → **78.2%** (was 24.8%)                    | 9.9% → **93.1%** (was 25.6%)                    |
| line in frame, wider window          | 48.0% → **87.1%** (was 55.6%)                    | 40.6% → **95.5%** (was 51.0%)                   |
| thirds, ON                           | 77.3 / 100.0 / 56.5%                             | 88.4 / 100.0 / 90.8%                            |
| thirds, OFF                          | 0.0 / 0.0 / 35.6%                                | 0.0 / 0.0 / 30.1%                               |
| **which bound binds**                | line **88.6%**, state zoom **10.8%**, other 0.7% | line **90.5%**, state zoom **8.7%**, other 0.8% |
| cam.zoom at the crossing, \|ON−OFF\| | 1.31e-3                                          | 1.02e-2                                         |
| worst centre (check-runin-frame)     | 1.73 TW                                          | **2.08 TW — FAILS**                             |

**Ownership is total**, which is what the change of shape was for: 100.0% against 14.9% / 18.5%.

**Both bounds are real bounds, not comments.** The line binds ~89–91% of the window and the state's
own zoom binds ~9–11%. Neither is decorative, which was the specific thing to check.

**The final third falls on Luger Hill (100% → 56.5%)** and that is the second bound doing its job:
the photo-finish zoom is tighter than the line requirement allows for, so the shot closes on the
pair and the line leaves the frame shortly before the crossing. On Searound the corridor is narrow
enough that both fit (90.8%).

## 4. The zoom at the crossing is NO LONGER bit-identical, and the machinery is why

**1.31e-3 on Luger Hill (0.03% of a cam.zoom of 4.0) and 1.02e-2 on Searound (0.006% of 17.07).**

RUNIN-STATE-1 measured 0.00e+0 for one reason only: the run-in was not composing during
PHOTO_FINISH at all. Now it is — by instruction, "if it is a photo finish, it closes to the
photo-finish zoom" — so the line bound is still binding until roughly 1.3% of the window remains,
and the zoom lerp is still converging on the state's setting when the first racer crosses. The trace
shows it releasing cleanly (`bind=state` for the last stretch, `z` 16.971 → 17.066 against a target
of 17.067).

So the two instructions — _close to the photo-finish zoom_ and _be bit-identical at the crossing_ —
are in tension, and geometry decides: arriving at a zoom from further away takes longer. **The
machinery does not allow both.** The residual is four orders of magnitude below anything an eye
resolves, and it is the design working rather than a defect.

## 5. What it cost — the Searound centre reading, understood and NOT tuned away

`check-runin-frame` fails its centre half on Searound: **2.08 track widths against a limit of 2.**
The limit has not been raised. Here is the wander.

**At that frame the camera is showing 99% x 99% of the world, with all 20 racers on screen and the
finish line in frame.** On a closed track the finish can be most of a lap away at the threshold, so
"keep the line in frame" becomes "keep the world in frame" — and a world-sized frame **cannot** be
centred on the spine: `resolveCamera`'s world-bounds clamp centres it on the WORLD, and an oval's
world centre is its infield. The two requirements are geometrically exclusive at that width.

So the metric is reading a real property of the new shot and calling it a defect. It is left
standing rather than tuned, and the guard's header now carries the finding. Two honest readings, and
neither is mine to pick:

- the limit encodes "the camera never shows the whole world", which was true of every shot this
  camera made before today; or
- the centre half should ask whether the TRACK is in frame rather than whether the CENTRE is on it,
  which needs no threshold at all — the virtue the never-empty half already has.

**THE PRICED ALTERNATIVE, since a bound is the obvious next suggestion.** Adding OVERVIEW's own
width as a wide-end bound — an existing setting, not a new constant — fixes the reading and costs
two thirds of the feature:

|                          | line in frame (window) | worst centre       |
| ------------------------ | ---------------------- | ------------------ |
| as specified, two bounds | **78.2% / 93.1%**      | 1.73 / **2.08** TW |
| plus OVERVIEW's width    | 26.2% / 34.0%          | 0.56 / 0.41 TW     |

Empty frames are 0 either way and the crossing zoom is unchanged either way. **It is a real trade,
priced, and it is the owner's call.** Shipped as specified.

**One more thing the eye should judge:** the opening move is a **6x (Luger Hill) to 8x (Searound)
zoom-out in about half a second** at the threshold, delivered by the tracking lerp rather than a
glide, because no state transition happens there. It no longer empties the frame — that is what the
anchor repair bought — but it is a fast move and he should look at it.

## 6. Fingerprints — measured fresh, NOT minted

| role   | stored             | this branch                      |
| ------ | ------------------ | -------------------------------- |
| world  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` — **unmoved** |
| camera | `64432e18a7e62188` | `e2dbf91851744136`               |
| render | `096f2726c45ed853` | `5405d885f0432b0e`               |

**With `runInShot: false` all three return EXACTLY to the stored values on all ten tracks** —
`dc4647be0f55ebdb` / `64432e18a7e62188` / `096f2726c45ed853`. Nothing outside the endgame window
moves, proven rather than asserted.

`engine-reach --check` on the real diff: 1 of 12 paths reaches the engine (`storage/defaults.js`,
for a camera-only key), so the world fingerprint ran.

## 7. Source hygiene

Client suite green (774 camera tests, 4018 total). Against `514a7d67` this block is mostly REMOVAL.

- **Removed** (the state shape): `CAM_STATE.RUN_IN`, `FRAMING_BY_STATE.RUN_IN`, `GUARANTEE.LINE`,
  the nine-map RUN_IN timing mirror, the HUD label, and the RUN_IN cases in `_focusAnchorRacer`,
  `_framingSubjects`, `_stateCamZoom`, `_computePhasedPanTarget`, the entry T-switch, the transition
  focusT switch, the focal-smoothing test and `inLeaderZoom`.
- **Kept**: `pointGuarantee` (from the quarry), `_finishLineWorldPoint`, the `runInShot` key.
- **Added**: `_runInComposing` (the window, four lines), the anchor fallback, and a read-only probe
  recording which bound won so the harness can report it instead of inferring it.
- **Corrected**: DEAD-ENDS §M, written this morning, banned the mechanism that shipped this evening.
  Rewritten with the correction stated at the top rather than appended, because a wrong exclusion
  left standing is worse than no entry.
- **Noticed and left**: the `_focusAnchorRacer` null is still a latent defect for BATTLE and OVERVIEW
  outside the run-in window; `PHOTO_FINISH` is still absent from `ALL_STATES`; `rAFProbe`'s
  `_STATE_IDX` still lists neither.

## 8. For his eye

**Luger Hill, seed 9 — watch the moment the run-in begins: the camera pulls out fast to put the
finish in shot, then closes on it continuously with racers in frame the whole way. Judge the speed
of that pull-out.**
