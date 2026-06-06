# Perf Fix — Tier-1 Wave 1: Crash Guard + Shadow Blur + Scoreboard Transition

**Date:** 2026-06-06
**Branch:** `feat/open-track-overlap`
**Commit base:** `3eac3f2` (backup/step1-complete-fair)
**Tests:** 2629/2629 green (no change from Step-1 baseline)

---

## Files Modified

| File | Lines changed | Fix |
|---|---|---|
| `client/src/screens/RaceScreen/index.jsx` | ~803–805, ~1516 | R4 (crash guard) + R3 (bar scale) |
| `client/src/screens/RaceScreen/drawing/trackRendering.js` | ~158–174 | R1 (shadow blur removed) |
| `client/src/screens/RaceScreen/RaceScreen.css` | ~135–140 | R3 (transition: width → transform) |

**No physics, race behavior, brake-to-match, avoidance, or fairness-affecting file was modified.**
Confirmed: the only changed files are render scheduling (`index.jsx` step-budget), CSS animation (`RaceScreen.css`), and canvas drawing (`trackRendering.js`). `raceBehavior.js`, `sim-fairness.mjs`, all config files, and all track/racer definitions are untouched.

---

## Fix R4 — Physics step-budget guard (`index.jsx:803–805`)

**Before:**
```js
while (st.physicsAccum >= FIXED_DT) {
  st.physicsTs += FIXED_DT;
```

**After:**
```js
// Cap catch-up at 2 steps per rAF — prevents the stall→many-steps→longer-stall
// death spiral that causes STATUS_ACCESS_VIOLATION at ~14s under load.
// Fairness is unaffected: sim tests physics in sim time, not wall-clock time.
let _catchupSteps = 0;
while (st.physicsAccum >= FIXED_DT && _catchupSteps++ < 2) {
  st.physicsTs += FIXED_DT;
```

**Mechanism:** When a frame takes 50ms instead of 16ms, the unbounded loop would fire 3 physics steps, consuming ~3× the scripting budget, which could make the *next* frame even slower (more catch-up needed), eventually spiraling into a crash. The cap at 2 steps means a stalled frame never more than doubles the physics budget. The physics accumulator retains any unprocessed remainder and drains it across subsequent frames — no simulation time is lost, only wall-clock catch-up is throttled.

**Fairness:** Zero impact. The sim (`sim-fairness.mjs`) runs physics in discrete steps without frame timing — it always runs exactly 1 step per tick regardless of wall-clock time. The N=50 sweep results are unaffected.

**Expected effect:** Eliminates the death-spiral path to STATUS_ACCESS_VIOLATION crash.

---

## Fix R1 — Remove `ctx.shadowBlur` (`trackRendering.js:158–174`)

**Before:**
```js
ctx.shadowBlur = 10;
ctx.shadowColor = '#ffd700';
for (let i = 0; i < segments; i++) { ... }
ctx.shadowBlur = 0;
```

**After:**
```js
for (let i = 0; i < segments; i++) { ... }
// Gold border — replaces ctx.shadowBlur (which forced an offscreen compositor pass
// every frame). Thick stroke drawn once; same visual read as the former glow.
ctx.strokeStyle = '#ffd700';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(pInner.x, pInner.y);
ctx.lineTo(pOuter.x, pOuter.y);
ctx.lineTo(pOuter.x + fwdCos * 7, pOuter.y + fwdSin * 7);
ctx.lineTo(pInner.x + fwdCos * 7, pInner.y + fwdSin * 7);
ctx.closePath();
ctx.stroke();
```

**Mechanism:** `ctx.shadowBlur > 0` forces Chrome's 2D canvas renderer to allocate an offscreen compositing surface, run a Gaussian blur pass over the drawn content, and composite the result back — every frame, for every open track. This is disproportionately expensive for 8 checkerboard segments. The replacement is a single-stroke gold rectangle border drawn with ordinary 2D path operations: no offscreen surface, no blur pass.

The visual result is a sharp gold border around the checkerboard instead of a soft glow. The "FINISH" label remains and continues to use `ctx.fillStyle = '#ffd700'`.

**Expected effect:** Measurably reduce the Painting category (was ~1,667ms / 14s session). Confirm via fresh profile.

---

## Fix R3 — Scoreboard `transition: width` → `transform: scaleX` (CSS + JSX)

**The forced-reflow source (background):** The profile attributed 506ms of "Forced Reflow" to `drawOpenTrackFinishLine`, but that function has no DOM reads and cannot cause a reflow. The real source is `transition: width 0.12s linear` on `.sb-bar-fill`. Every 100ms, React sets new inline `style.width` on N progress bars (one per racer). Animating `width` requires the layout engine to recalculate geometry on every compositor frame of the transition. With 40–90 racers, this is 400–900 layout-affecting animated property changes per second, driving the 506ms "Forced Reflow" and the CLS 0.22.

**CSS before (`RaceScreen.css:135–140`):**
```css
.sb-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.12s linear;
  box-shadow: 0 0 4px currentColor;
}
```

**CSS after:**
```css
.sb-bar-fill {
  height: 100%;
  width: 100%;
  border-radius: 2px;
  transform: scaleX(var(--bar-scale, 0));
  transform-origin: left;
  transition: transform 0.12s linear;
  box-shadow: 0 0 4px currentColor;
}
```

**JSX before (`index.jsx:1513–1515`):**
```jsx
style={{
  width: `${Math.min(Math.max(0, lapProgress(r.t ?? 0, finishTState)), 1) * 100}%`,
  background: RANK_PALETTE[i] ?? r.color ?? '#4488ff',
}}
```

**JSX after:**
```jsx
style={{
  '--bar-scale': Math.min(Math.max(0, lapProgress(r.t ?? 0, finishTState)), 1),
  background: RANK_PALETTE[i] ?? r.color ?? '#4488ff',
}}
```

**Mechanism:** `transform: scaleX()` is GPU-composited — the browser handles it on the compositor thread without layout engine involvement. The bar is always `width: 100%` in the layout box (so no layout changes ever fire from bar updates). The CSS custom property `--bar-scale` (0–1) drives the transform. `transform-origin: left` scales from the left edge, giving the same visual effect as a growing `width`. The parent `.sb-bar-bg` has `overflow: hidden` which clips the bar at the container boundary when `scaleX < 1` — this works because the bar's layout box equals the container (no overflow in layout space).

**Expected effect:** Eliminate the 506ms "Forced Reflow" attribution; reduce or eliminate the CLS 0.22; remove the "Animation ×3" scoreboard contribution from the layout engine's work.

---

## Fairness Confirmation

None of the three fixes touch any file or code path that affects race simulation:

- `raceBehavior.js` — **not modified**
- `sim-fairness.mjs` — **not modified**
- `index.jsx` physics logic — **not modified** (only the outer while-loop condition and the scoreboard JSX inline style)
- Any config, track definition, or racer definition — **not modified**

The N=50 seed=1 sweep results from commit `3eac3f2` (65/66 pass) remain the authoritative fairness baseline for Step 1. These fixes do not require a re-sweep.

---

## Next Steps for the User

**Re-profile after these three fixes** (40 racers first, then 60):
1. Open DevTools → Performance → record 14s of race
2. Check: Is the crash gone at 40 racers? At 60? At 90?
3. Scripting: should decrease (fewer catch-up steps per stall frame)
4. Painting: should decrease significantly (no more shadow compositing pass)
5. Rendering / Forced Reflow: should decrease or disappear (transform replaces width)
6. CLS: should drop from 0.22 toward 0 (no layout-affecting width transitions)

**If judder is still visible after these three fixes:** The O(N³) isSideFree path (Tier-2 fix P1) is likely still the primary physics cost. That fix requires the higher-risk approach (localize `isSideFree` to nearby racers only) and a full N=50 fairness sweep before trusting the result.

**Remaining Tier-1 wave-2 fixes (not done yet):**
- R3 (minimap edge-point cache — `Minimap.js:68`)
- R5 (pre-allocate physics Maps — `raceBehavior.js:264`)
- R6 (in-place particle update — `index.jsx:1204`)
- R7 (eliminate `renderRacers` spread — `index.jsx:1244`)
