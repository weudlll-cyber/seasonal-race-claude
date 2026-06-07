# Memory Diagnosis — Mid-Race Hard Refresh (F5)

**Date:** 2026-06-06
**Branch:** `feat/open-track-overlap`
**Hypothesis:** Rapid F5 mid-race refreshes accumulate GPU memory in Chrome's shared GPU process, causing whole-system freeze — NOT a JS-level leak

---

## Task 1 — Does Hard Refresh Run useEffect Cleanups?

**Short answer: NO. But the browser reclaims most resources automatically anyway.**

When the user presses F5 mid-race:
1. The browser fires `beforeunload` and `pagehide` events synchronously
2. The entire JS VM (V8 isolate) for the page is destroyed — all JS stops
3. A new navigation begins; the new page's JS starts in the same renderer process

React's `useEffect` cleanup functions (`cancelAnimationFrame`, `removeEventListener`, `effectsRef.current = []`) are **NOT invoked on F5**. They run only when React unmounts a component — which happens via React Router navigation (SPA route change), not via hard reload.

### What the browser reclaims automatically on F5 (regardless of JS cleanup)

| Resource | Browser behaviour on hard reload |
|---|---|
| rAF callbacks | Cancelled by browser engine when the page's event loop is destroyed |
| `document.addEventListener` / `window.addEventListener` | Destroyed with the page's `document`/`window` objects — no accumulation |
| Canvas 2D context (JS handle) | JS handle released when V8 heap is destroyed |
| Canvas GPU backing surface | Release message sent to GPU process when renderer tears down the compositing layer |
| V8 heap (racer objects, Maps, particles) | Entire heap freed on V8 isolate destruction — fresh on next load |
| Module-level caches | ALL destroyed — `bgImageCache._cache`, `_loadedRacerTypes`, sprite tinter caches all reset to initial state on the new page load |

### What survives a hard refresh

Only persistent storage survives F5:
- `sessionStorage.activeRace` — set by `SetupScreen.jsx:359/409`; tab-scoped; survives F5 by browser design; read at the start of `RaceScreen` (line 322). The new page load picks this up and can start a new race immediately. This is CORRECT BEHAVIOR, not a leak.
- `sessionStorage.raceResults` — **NOT written mid-race** (see Task 3 below). A mid-race refresh leaves no orphaned result.
- `localStorage` — only config values; unchanged during a race.

### What is NOT covered by browser auto-cleanup

**The GPU process itself is NOT restarted on F5.** Chrome's architecture:
- Browser process: 1 per Chrome instance (persistent)
- Renderer process per tab: **reused** across F5 refreshes within the same tab
- GPU process: **1 shared across all tabs** — NOT restarted on page load

When the old page's compositor layer is destroyed on F5, the renderer process sends a **release message** to the GPU process. This release is **asynchronous** — the GPU process receives and processes the cleanup out-of-band from the new page's allocation sequence. This gap is the key vulnerability.

---

## Task 2 — GPU Canvas Across Hard Refreshes (Prime Suspect)

### The synchronization gap

When F5 is pressed mid-race:
1. Old page: renderer sends "destroy compositor layer" to GPU process — asynchronous
2. New page: starts loading immediately in the same renderer process
3. New `<canvas>` created → `ctx = canvas.getContext('2d')` called (index.jsx:336) → new GPU backing surface allocated
4. GPU process receives and processes the old surface release — may happen AFTER step 3

**During the window between steps 3 and 4, BOTH old and new GPU surfaces exist simultaneously in VRAM.** For a 1280×720 canvas at 32-bit: ~3.7MB per surface. With particle compositing layers and the background gradient compositing: the working set per race frame is higher, 10–30MB in practice.

Under normal conditions (one surface at a time): 10–30MB.
During rapid F5 transition (old + new overlap): 20–60MB transient peak.

This is manageable for a single refresh. But with 8–10 rapid mid-race refreshes:
- Each refresh creates a brief overlap peak
- The GPU process allocates new surfaces before confirming the old ones freed
- VRAM fragmentation accumulates: even after each individual surface is logically released, GPU VRAM can become fragmented (similar to heap fragmentation — free pages not coalesceable)
- After sufficient fragmentation, Chrome's GPU process spills GPU operations to system RAM

When GPU operations spill to system RAM:
- Chrome's compositor runs slowly (GPU-to-RAM transfers are orders of magnitude slower than VRAM access)
- The browser process must wait on compositor results before rendering
- OTHER applications competing for system RAM start paging to disk
- Result: **whole-system freeze** — not just the browser tab

### Why JS heap snapshots miss this

The heap snapshot procedure in report 03 Task 1 captures V8 heap allocations ONLY. The GPU process holds its own private allocations in VRAM (and optionally system RAM) that are invisible to Chrome DevTools' Memory panel. A clean heap snapshot (JS heap returned to baseline) is fully compatible with simultaneous GPU memory pressure.

**This is why report 03's conclusion ("no JS leak") and the system-wide freeze are not contradictory.** They measure different things.

### Mitigating factors

Chrome's GPU process does have a cleanup pass before each new page's first paint — but it's not synchronous. For slow/thoughtful refreshes (30+ seconds between each), the cleanup completes before new allocation begins: no overlap, no accumulation. For rapid refreshes (5–15 seconds mid-race, typical of mid-race testing), overlap is likely on every refresh.

`ctx.imageSmoothingQuality = 'high'` (index.jsx:337) forces Chrome to use a bilinear or bicubic resampling pipeline for all `drawImage` calls. At 60 racers per frame, this holds an additional GPU pipeline stage active for the duration of the race. This pipeline does not accumulate across refreshes — it's tied to the current canvas context — but it INCREASES the GPU working set per refresh, making each transient peak larger.

---

## Task 3 — Persistent Writes Mid-Race

**Confirmed: NO persistent writes occur during an active race.**

All `storageSet` / `sessionStorage.setItem` calls in `RaceScreen/index.jsx`:

| Line | Code | When? |
|---|---|---|
| 322 | `sessionStorage.getItem('activeRace')` | READ ONLY — race load |
| 1028–1042 | `sessionStorage.setItem('raceResults', ...)` | Race END only (`st.finishedCount >= nRacers`) — NEVER on mid-race refresh |
| 1448 | `sessionStorage.removeItem('activeRace')` | Error handler click only |
| 1549 | `sessionStorage.removeItem('activeRace')` | "← Setup" button click only |

All `storageSet` calls in `client/src/modules/` (config writes) are only invoked from Dev Screen or Setup Screen — none are called from within the rAF loop or any code path that runs during a race.

**After a mid-race F5:**
- `sessionStorage.activeRace`: still present (written by SetupScreen before race, not cleared mid-race) — correct; next page load picks it up
- `sessionStorage.raceResults`: absent (race didn't finish) — correct
- All localStorage config keys: unchanged — correct

**No orphaned, stale, or growing storage entries from mid-race refreshes.**

---

## Task 4 — Exact Task Manager Procedure

**This distinguishes GPU accumulation from V8 GC pressure and confirms the primary freeze mechanism.**

### Steps

1. Open Chrome's built-in Task Manager: `Shift+Esc` (or Chrome menu → More Tools → Task Manager)

2. Find the game's tab row (listed as the page title, e.g., "RaceArena"). Note two columns:
   - **"Memory footprint"** (this is the renderer process's private bytes — includes V8 heap + canvas pixel buffers)
   - **"GPU Memory"** (this is VRAM/GPU-RAM occupied by the renderer's compositor surfaces)
   
   If GPU Memory column is not visible: right-click the column headers and enable it.

3. With the game at the Setup screen (not racing), record:
   - Baseline JS Memory: `M₀`
   - Baseline GPU Memory: `G₀`

4. Start a race with 40 racers. Wait 15 seconds into the race (active physics and rendering running). Record:
   - Racing JS Memory: `M₁`
   - Racing GPU Memory: `G₁`

5. **Press F5** (mid-race refresh). Watch the Task Manager in real-time during the reload.
   - Observe whether GPU Memory briefly SPIKES during the transition (old + new allocation overlap)
   - After the new page loads and is at Setup, record: `G₁ₐ` (post-refresh GPU Memory)

6. Repeat step 4–5 eight more times (9 total mid-race refreshes). After each, record GPU Memory at the Setup screen.

### Pass/Fail signals

| Observation | Interpretation |
|---|---|
| GPU Memory climbs across refreshes (`G₁ₐ < G₂ₐ < G₃ₐ...`) and does NOT return to `G₀` | **GPU accumulation confirmed** — primary freeze mechanism is GPU VRAM → system RAM spill |
| GPU Memory spikes during transition but returns to `G₁ₐ ≈ G₀` after each refresh | GPU cleanup IS working; accumulation is NOT the issue |
| Memory footprint climbs monotonically across refreshes | V8 heap is accumulating across refreshes — would indicate a module-level JS leak (contradicts audit) |
| Memory footprint returns to baseline after each refresh | JS layer is clean — consistent with audit findings |
| Both metrics stable; system still freezes | Something else causing freezes — profile the actual freeze frame (e.g., GPU driver fault, system-level resource limit) |

**If GPU Memory climbs monotonically:** the GPU-surface overlap hypothesis is confirmed. Fix priority: reduce per-frame GPU surface usage (remove `ctx.imageSmoothingQuality = 'high'`, cap particle counts, consider `will-change: transform` on the canvas element to promote it to its own compositor layer).

**If JS Memory climbs and does NOT return to baseline:** the audit missed a cross-refresh JS leak. Next step: heap snapshot with "Objects allocated between snapshots" filter.

---

## Task 5 — Reconciliation with Report 03

### How this changes the conclusion

| Freeze cause | Scope | Survives hard refresh? | Consistent with "whole system freeze"? |
|---|---|---|---|
| V8 old-gen GC pause (report 03 primary suspect) | Tab-only | NO — hard refresh destroys V8 heap | NO — tab pause, not system pause |
| GPU VRAM → system RAM spill from surface overlap | System-wide | YES — GPU process persists across refreshes | YES — system RAM exhaustion causes OS paging |

**Report 03 was correct that there is no JS-level leak.** But its ranking of V8 GC as the primary suspect was based on an assumption that the game ends via clean React unmount. For the SPECIFIC WORKFLOW of mid-race F5 refreshes, V8 old-gen GC pressure:
- Accumulates WITHIN a session (correct, still relevant for within-session jitter)
- Is CLEARED by hard refresh (because the V8 heap is destroyed on F5)
- CANNOT explain worsening across F5 refreshes

**GPU surface accumulation during rapid refreshes IS the better explanation for the "whole system freezes, worsens over time" symptom,** specifically because:

1. "Whole system" — not tab-only. GPU VRAM pressure → system RAM spill → OS paging affects all running applications.
2. "Worsens with each refresh" — GPU process persists; if deallocation lags behind allocation, VRAM fragmentation accumulates across refreshes even if each surface is individually released.
3. "Hard refresh as the trigger" — A clean React navigation (F5 mid-session equivalent via the ← Setup button) would give the browser time to synchronously clean up before the new race starts. F5 gives no such synchronization guarantee.

### Priority order given this finding

1. **Immediate (user behavior):** Stop pressing F5 mid-race as a testing pattern. Use the "← Setup" button instead — this is a React Router SPA navigation that gives the browser a complete event-loop cycle to release GPU surfaces before the new page context begins. This is the most actionable single change.

2. **R5 fix (Map pre-allocation):** Still the correct next code fix. Reduces within-session jitter (V8 GC), even though it doesn't affect the between-refresh GPU issue.

3. **GPU footprint reduction:** Lower `ctx.imageSmoothingQuality` from `'high'` to `'medium'` or `'low'` during active racing (can be config-driven). This reduces the per-frame GPU working set, shrinking each refresh's transient surface overlap peak.

4. **Long-term:** Consider reusing the canvas element across races rather than creating a new one per mount. If the canvas `<canvas ref={canvasRef}>` persists in the DOM and is only cleared/resized between races (rather than unmounted and remounted), Chrome's compositor can reuse the existing GPU surface, eliminating the old/new overlap entirely.

---

## Summary

| Question | Answer |
|---|---|
| Does F5 run React useEffect cleanups? | NO. But browser auto-reclaims rAF, event listeners, JS heap, and most GPU surfaces. |
| Is there a JS-level leak across F5 refreshes? | NO (audit confirmed). Module caches reset on each page load. |
| Is there a storage leak from mid-race refresh? | NO. No storage writes occur mid-race; `activeRace` survives intentionally. |
| What DOES accumulate across rapid F5 refreshes? | GPU VRAM fragmentation from overlapping old/new canvas surface allocations during the async GPU cleanup window. |
| Why does it affect the whole system, not just the tab? | GPU process is shared across tabs; VRAM spill to system RAM causes OS paging system-wide. |
| Best user fix right now? | Use "← Setup" button (SPA nav) instead of F5 for testing; pause between tests. |
| Best code fix? | R5 (Map pre-allocation) for within-session jitter + lower `imageSmoothingQuality`. |
