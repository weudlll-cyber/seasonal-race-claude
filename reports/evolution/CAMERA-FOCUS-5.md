# CAMERA-FOCUS-5 — the Y-axis screen-mapping bug (edge-riding + jumping + the 44% clamp, one cause)

Base `origin/master @d94a7b9` · presentation-only · fingerprint **`ded0a126048e4cdb` IDENTICAL** (re-minted on the committed state). The hypothesis: a Y-axis error in the forward-framing explains edge-riding, jumping, and the 44 % Y clamp at once. It does — but the specifics differ from the guess, and the LIVE render transform is what convicted it.

## STEP 0 — the bias, falsified (it was innocent)
The spec's suspect was a **sign** error in `_applyLeaderForwardBias`. The replay refutes that directly: with `leaderForwardFrac = 0.5` (the shift is provably inert), the Y clamp is **still 2364/5270 (~44 %)** — identical to 0.66. A bias that is inert at 0.5 cannot be the cause of a defect that persists at 0.5. **The forward-bias is exonerated** — go to STEP 1b.

## STEP 1b — LIVE-vs-REPLAY divergence (the real bug)
The live closed-track renderer applies a **per-axis** transform:

```js
ctx.translate(cam.offsetX, cam.offsetY);
ctx.scale(cam.zoom * bsX, cam.zoom * bsY);   // bsX on X, bsY on Y
```

But the CAMERA-FOCUS-1 containment clamp computed the anchor's screen position with **`zoom · bsX` on BOTH axes**:

```js
const effZoom = this.zoom * this._bsX;      // used for sx AND sy — the bug
const sy = anchor.y * effZoom + this.offsetY;
```

On a **non-square** world this is wrong on Y. `searound` is 3072×2048 → `bsX = 0.417`, `bsY = 0.352` — a **19 % over-scale on Y**. The clamp therefore saw the leader ~19 % **lower** than he really was, shoved the pan **up** to pull that phantom position back inside inner-70, and fired every frame the phantom crossed the edge — **~44 % of frames**. That is the edge-riding (leader pinned high) *and* the jumping (the mis-scaled correction yanks as the leader's Y sweeps around the loop). Horizontal sections were correct (X used `bsX`), which is why the replay's X metrics were green — and why my own harness masked it: **it measured the leader's Y with `bsX` too**, agreeing with the buggy clamp instead of the render. The harness was measuring a different camera than the browser runs — exactly the STEP-1b divergence.

## The fix
1. **Containment clamp — per-axis** (`_containAnchorInFrame`): `effZoomX = zoom·bsX`, `effZoomY = zoom·bsY` (open tracks stay uniform). Now the clamp's screen mapping equals the render's.
2. **Forward-bias — screen-faithful** (`_applyLeaderForwardBias`): the shift is worked in screen space with the per-axis zoom, so the leader lands `(frac−0.5)` of the frame forward along the motion direction on **every** heading — not just horizontal (the same latent axis inconsistency, smaller, now gone).

### Result (searound seed-5601 replay, faithful per-axis measurement, seeded RNG)

| metric | before (bug) | after |
|---|---|---|
| Y clamp activations | 2342 (~44 %) | **4 (0.1 %)** |
| total clamp | ~44 % | **0.1 %** |
| leader outside inner-70 (faithful) | (mis-measured) | **0.0 %** |

Four-cardinal-direction test (leader marching up / down / left / right): the leader lands at **0.68 toward the leading edge in all four** — the **vertical** cases (down 0.68, up 0.32) are the ones the old bias got wrong. The containment clamp is now the emergency rail it was meant to be (~0 in steady state).

## STEP 0 command for the owner (live A/B, if wanted)
Paste in the browser console on the race page to force dead-centre framing, then reload:
```js
(()=>{const k='racearena:cameraConfig';const c=JSON.parse(localStorage.getItem(k)||'{}');c.leaderForwardFrac=0.5;c.schemaVersion=17;localStorage.setItem(k,JSON.stringify(c));location.reload();})()
```
Reset to the shipped forward framing (0.66): rerun with `0.66` (or `delete c.leaderForwardFrac`). With the clamp fix shipped, edge-riding should be gone at **both** values now — the frac only moves the leader forward/back, it never rode the edge because of the bias.

## Five sentences
1. The suspected bias sign-error was falsified — the Y clamp was ~44 % even at `leaderForwardFrac=0.5` (bias inert), so the bias was innocent.
2. The real bug was a live-vs-replay divergence: the containment clamp mapped the anchor's Y with `bsX` while the renderer uses `bsY`, so on the non-square searound world (19 % axis mismatch) the clamp mis-scaled Y, shoved the leader to the top edge, and fired ~44 % of frames — edge-riding and jumping from one cause.
3. My harness masked it by measuring Y with `bsX` too, so it agreed with the buggy clamp instead of the render — the STEP-1b divergence made visible.
4. Fixing the clamp to per-axis `bsY` drops the Y clamp from 2342 to 4 (0.1 %) and leaderOut to 0.0 %, and making the forward-bias screen-faithful lands the leader 2/3 forward on all four headings, vertical included.
5. Fingerprint is byte-identical (`ded0a126048e4cdb`); the change is presentation-only and the emergency rail is finally idle in steady state.

## Proposals (≥2)
1. **Owner: hard-reload seed 5601 and eye-test.** The clamp fix ships the real cure; the double invariant (centred-forward, no jumping outside intentional cuts) should now hold in the live browser. Use the console command above only to A/B the forward amount.
2. **Grep-guard the per-axis mapping.** Any world→screen calc on a closed track must use `bsX` on X and `bsY` on Y; add a one-line lint/test note (and the FOCUS-5 tests) so a future "use one zoom for both axes" shortcut is caught. The render transform is the single source of truth — camera math must match it exactly.
3. **Make the replay harness render-faithful by construction.** Have the harness import the exact screen-mapping used by the renderer (a shared `worldToScreen(cam, bsX, bsY)` helper) instead of re-deriving it, so a harness can never again measure a different camera than the browser paints.
