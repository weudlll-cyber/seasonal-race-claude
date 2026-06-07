# Scoreboard Simplify — Remove Progress Bars, Add Finish Times, Fix Setup Button

**Date:** 2026-06-06
**Branch:** `feat/open-track-overlap`
**Tests:** 2629/2629 green (no test referenced the progress bars, checkmark, or button position — no test updates needed)

---

## Files Changed

| File | What changed |
|---|---|
| `client/src/screens/RaceScreen/index.jsx` | formatRaceTime helper, remove finishTState, add finishTimeMs capture, update scoreboard JSX, move Setup button |
| `client/src/screens/RaceScreen/RaceScreen.css` | Remove .sb-bar-bg / .sb-bar-fill / .sb-info / .sb-check, add .sb-finish-time, add min-width:0 to .sb-name |

**No physics, race behavior, brake-to-match, avoidance, or fairness-affecting file was modified.** Confirmed: `raceBehavior.js`, `sim-fairness.mjs`, all config files, all track/racer definitions are untouched.

---

## Change 1 — Progress Bars Removed Entirely

**Removed from `RaceScreen.css`:**
- `.sb-bar-bg` (4px high container with overflow:hidden)
- `.sb-bar-fill` (width:100%, transform:scaleX, transition:transform — the animated element that drove CLS and forced-reflow)
- `.sb-info` flex wrapper (no longer needed; name is a direct grid child)

**Removed from `index.jsx`:**
- `finishTState` state and `setFinishTState` setter (were only used to feed `lapProgress(r.t, finishTState)` into the bar's `--bar-scale` style)
- `setFinishTState(finishT)` call at former line 485 (one-time setup call, now dead)
- The `<div className="sb-bar-bg"><div className="sb-bar-fill" style={...} /></div>` element from the scoreboard map
- The per-row `--bar-scale` style computation (`Math.min(Math.max(0, lapProgress(...)), 1)`) — evaluated every scoreboard update (every 100ms × N rows)
- The `.sb-info` wrapper div

**Net effect:** The 40–90 `.sb-bar-fill` elements animating `transform:scaleX()` every 100ms are completely gone. The per-row style computation (`lapProgress` × N) is gone. The `finishTState` React state is gone. The two CSS classes driving CLS (reports 02/03) are gone.

The `lapProgress` import at line 41 is retained — it is still used in the race results storage at line 1037 (`lapProgress(r.t, st.finishT)` for the progress field in raceResults JSON). This is correct.

---

## Change 2 — Finish Time Replaces Checkmark

**`formatRaceTime(ms)` added** as a module-level function before `RaceScreen()` (`index.jsx:141`):

```js
function formatRaceTime(ms) {
  const tenths = Math.floor(ms / 100) % 10;
  const totalSecs = Math.floor(ms / 1000);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60);
  return mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}.${tenths}`
    : `${secs}.${tenths}`;
}
```

Format: `ss.t` (e.g. `45.3`) for races under 60s, `m:ss.t` (e.g. `1:05.3`) for 60s+. Tenths-of-second precision — readable on the narrow sidebar at 11px font.

**`r.finishTimeMs = physicsTs` added** at the finish detection site (`index.jsx:990`, inside the `r.t >= st.finishT` block):

```js
r.finished = true;
r.finishRank = ++st.finishedCount;
r.finishTimeMs = physicsTs;     // ← new
emitBurst(st.burstParticles, r.x, r.y);
```

`physicsTs` is the in-simulation clock (starts at 0 when `PHASE.RACING` begins, increments by `FIXED_DT = 16ms` per physics step). It already tracks elapsed race time precisely. Written ONCE per racer at the moment of crossing the finish line — zero ongoing cost.

**The `...r` spread in `setScoreboard`** at line 1008 (`[...st.racers].sort(...).map((r, i) => ({...r, rank: i+1}))`) automatically propagates `finishTimeMs` into scoreboard state on the next 100ms update cycle. No additional state is needed.

**Scoreboard row render** (`index.jsx` — formerly around line 1524):

Old:
```jsx
{r.finished && <span className="sb-check">✓</span>}
```

New:
```jsx
{r.finished && r.finishTimeMs != null && (
  <span className="sb-finish-time">{formatRaceTime(r.finishTimeMs)}</span>
)}
```

Guard `r.finishTimeMs != null` is defensive — on the exact 100ms scoreboard tick that the finish is first captured, `finishTimeMs` will already be set since the scoreboard update happens AFTER the physics step in the same rAF frame.

**`.sb-finish-time` CSS** replaces `.sb-check`:
```css
.sb-finish-time {
  font-size: 10px;
  font-weight: bold;
  color: #0f9;
  white-space: nowrap;
  padding-left: 2px;
}
```

Same green color as the old checkmark. `white-space: nowrap` prevents the time from wrapping to two lines on very narrow scoreboard widths.

**Racers still racing** show no finish time (only rank, icon, name) — the `r.finished && ...` guard ensures nothing appears until the racer crosses the line.

---

## Change 3 — Setup Button Moved to Top

**Moved from:** after the phase badges and fullscreen button (end of `<aside>`)  
**Moved to:** first child of `<aside className="race-hud">` — BEFORE the scoreboard div

```jsx
<aside className="race-hud">
  <button className="race-back-btn" onClick={...}>← Setup</button>  {/* ← now here */}
  <div className="scoreboard">...</div>
  ...
</aside>
```

The `.race-hud` is `display: flex; flex-direction: column` — child order in JSX = visual order top-to-bottom. Button is now always visible at the top, regardless of how many racer rows the scoreboard has. No CSS change needed; the existing `.race-back-btn` styles apply identically in the new position.

**User benefit (report 04):** The Setup button is now reachable without scrolling at any racer count. Users can exit a race cleanly via button click (SPA navigation → synchronous GPU surface cleanup) instead of F5 (hard reload → async GPU surface cleanup gap).

---

## Grid Layout After Changes

`.scoreboard-row { grid-template-columns: 28px 22px 1fr auto }` is unchanged.

Before: `[rank 28px] [icon 22px] [sb-info flex (name+bar) 1fr] [sb-check auto]`  
After:  `[rank 28px] [icon 22px] [sb-name 1fr] [sb-finish-time auto]`

The `.sb-name` element is now a direct grid child in the `1fr` column (was inside `.sb-info` flex wrapper). `min-width: 0` was added to `.sb-name` so that `text-overflow: ellipsis` works correctly when the `1fr` column is constrained.

---

## Performance Impact Expected

**CLS:** The `.sb-bar-fill` elements with `transform:scaleX` transition were the suspected CLS source (reports 02/03). With them entirely gone, CLS should drop sharply. The scoreboard row reordering (rank changes) may still contribute a baseline CLS, but the continuous animation source is eliminated.

**Forced reflow attribution:** The `drawOpenTrackFinishLine` forced-reflow attribution (3.43s in 47.5s session) was unaffected by R3 (removing `transition:width`). Its source is still undiagnosed (see report 02, candidates A and B). This change does not add or remove any DOM-read patterns.

**Scripting / Rendering:** Removing 40–90 animated elements that updated every 100ms reduces React reconciliation work per scoreboard tick. The `lapProgress × N` computation per tick is gone. Expect measurable reduction in the Rendering category per scoreboard update.

**Painting:** No canvas painting change. `.sb-bar-fill`'s animated `transform` was GPU-composited (no paint cost), so this category is unchanged.

---

## Re-profile Note for User

Take a fresh profile (40 racers, 30s session):
- **CLS:** Expect significant drop from 0.45. If it doesn't drop to near 0, the source is scoreboard rank-reordering (DOM node position changes on overtake) — see report 02 for the DOM-order fix.
- **Rendering / Style recalculation:** Expect reduction — fewer DOM mutations per scoreboard tick.
- **Scripting:** Minor improvement — `lapProgress × N` removed from the 100ms update path.
- **Forced reflow:** Still needs the Bottom-up profiler view to identify (report 02). Unlikely to change from this fix.
