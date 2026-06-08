# ESLint E07 — Stale-Closure Diagnosis: RaceScreen useEffect

**Date:** 2026-06-08  
**File:** `client/src/screens/RaceScreen/index.jsx`  
**ESLint message:** `React Hook useEffect has missing dependencies: 'enablePerfLog' and 'showCameraDiagnostics'. Either include them or remove the dependency array.`  
**Rule:** `react-hooks/exhaustive-deps`  
**Status:** READ-ONLY DIAGNOSIS — no code changed.

---

## 1. Exact location

**Effect opening:** `index.jsx:346`  
**Effect closing / dep array:** `index.jsx:1493` — `}, [raceData]);`

This is the **main animation loop effect** — the largest single effect in the file (~1147 lines). It sets up the entire race: initialises racers, builds the physics state, creates the rAF `loop` callback, fires `requestAnimationFrame`, and registers a cleanup that cancels the rAF and destroys track-effect instances.

**Effective structure:**

```javascript
useEffect(() => {
  if (!raceData || !canvasRef.current) return;
  // ... race + physics setup (lines 347–740) ...

  // Perf-log init (runs once at race-start):
  if (enablePerfLog) perfLogRef.current = createPerfLog(); // line 743

  function loop(ts) {
    // ... runs every animation frame ...
    const t0 = enablePerfLog ? performance.now() : 0;     // line 752
    // ...
    if (enablePerfLog) tPhys = performance.now();          // line 1170
    if (showCameraDiagnostics) { /* speed diagnostics */ } // line 1178
    // ...
    const tPreCam = enablePerfLog ? performance.now() : 0; // line 1279
    const tCam    = enablePerfLog ? performance.now() : 0; // line 1333
    if (enablePerfLog && perfLogRef.current) {              // line 1469
      recordPerfFrame(perfLogRef.current, ...);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  rafRef.current = requestAnimationFrame(loop);
  return () => { /* cancel rAF + cleanup */ };
}, [raceData]);
```

---

## 2. Where the missing values come from

Both missing deps are **render-scope locals** derived from `cameraConfig`:

```javascript
// index.jsx:205
const [cameraConfig] = useState(() => loadCameraConfig());

// index.jsx:208, 213
const showCameraDiagnostics = cameraConfig.showCameraDiagnostics ?? false;
const enablePerfLog         = cameraConfig.enablePerfLog         ?? false;
```

**Critical observation:** `cameraConfig` is initialised via `useState(() => loadCameraConfig())` with the **one-element destructuring** form — `const [cameraConfig]`. There is **no setter** anywhere in this file for this state slot. `cameraConfig` therefore never changes after mount; it is a frozen constant for the entire component lifetime.

Both `enablePerfLog` and `showCameraDiagnostics` are plain boolean constants derived from that frozen state. They are computed **once per render** but since `cameraConfig` never changes, they always hold the same value from the very first render onward.

---

## 3. Actual runtime consequence

**None.** The "stale closure" captures `enablePerfLog` and `showCameraDiagnostics` at the time the effect runs (when `raceData` is set). Since `cameraConfig` is frozen at mount and never updated via a setter, those two booleans have **the same value inside the effect closure as they would if re-captured on every render**.

The `loop` function closes over the frozen values and uses them as feature gates:
- `enablePerfLog` — gates perf-timing calls; if it was `false` at mount it's `false` forever; if `true`, it's `true` forever.
- `showCameraDiagnostics` — gates per-frame diagnostic speed computation; same reasoning.

In neither case can the captured value diverge from the "current" value, because the current value never changes.

**ESLint cannot prove this.** The rule sees two render-scope variables referenced inside an effect that are not listed as deps, and flags them conservatively. The flag is technically correct per the rule, but the actual risk is zero given the frozen-state source.

---

## 4. Candidate fixes

### Option A — Add to dep array

```javascript
}, [raceData, enablePerfLog, showCameraDiagnostics]);
```

**Consequence:** If either boolean ever changes (currently impossible; would require adding a cameraConfig setter in the future), the **entire race loop tears down and restarts**. The cleanup runs (`cancelled = true`, rAF cancelled, all track effects destroyed), then the setup re-runs from the beginning — effectively aborting the race mid-run.

Even though the values do not change today, adding them creates a **silent landmine**: any future developer who adds a "toggle perf-log while racing" feature would trigger an inadvertent race restart. This is a regression risk in disguise.

**Not recommended.**

### Option B — useRef to hold latest value

Store both values in refs; keep refs in sync with a separate `useEffect`; read `ref.current` inside `loop`.

```javascript
const enablePerfLogRef         = useRef(enablePerfLog);
const showCameraDiagnosticsRef = useRef(showCameraDiagnostics);
// Sync on every render:
enablePerfLogRef.current         = enablePerfLog;
showCameraDiagnosticsRef.current = showCameraDiagnostics;
```

Then inside `loop`, replace direct variable reads with `enablePerfLogRef.current` etc.

**Consequence:** This is the standard React pattern for "use the latest value inside a stable callback without re-running the effect." It is behavior-preserving AND would correctly support a future live-toggle of perf-log without a race restart.

**Downside:** Adds complexity to an already 1500-line file. Requires 2 new refs, 2 inline sync assignments, and ~8 substitution edits inside the loop body. Given that `cameraConfig` is frozen and the values will never change in practice, the ref pattern adds mechanical complexity for zero practical gain. It is the right architectural pattern but unnecessary here.

**Could be recommended** if we expect cameraConfig to become live-mutable. Not recommended today.

### Option C — eslint-disable-next-line with WHY comment ✓ RECOMMENDED

```javascript
  // enablePerfLog and showCameraDiagnostics are frozen (cameraConfig uses useState
  // with no setter — mount-time constants). Adding them to deps would restart the
  // race loop on any future cameraConfig live-toggle. Safe intentional omission.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceData]);
```

**Consequence:** Zero behavior change. The disable comment is **self-documenting** — it explains the two-part reasoning:
1. Why the omission is safe now (frozen state)
2. Why adding them would be dangerous (race restart)

This preserves the existing stable behavior, leaves the race loop untouched, and documents the intent for future maintainers.

**Recommended.**

---

## 5. Summary

| Question | Answer |
|----------|--------|
| Effect location | `index.jsx:346–1493`, dep `[raceData]` |
| Missing deps | `enablePerfLog` (line 213), `showCameraDiagnostics` (line 208) |
| Source of values | `const [cameraConfig] = useState(() => loadCameraConfig())` — frozen at mount, no setter |
| Values change at runtime? | **No** — `cameraConfig` has no setter; booleans are mount-time constants |
| Actual stale-closure risk? | **None** — captured value equals current value for entire component lifetime |
| Add to deps? | **No** — would restart the entire race loop if values ever changed; silent landmine |
| useRef pattern? | Correct architecture but unnecessary overhead given frozen source |
| **Recommendation** | **Option C: `eslint-disable-next-line` with a WHY comment** |

**Ambiguity level:** LOW — the fix is unambiguous. `cameraConfig` has no setter; the values cannot change; the disable is safe and self-documenting. The one open question is "what if someone adds a cameraConfig setter later?" — that is a future decision; when and if that happens, the disable comment will direct the developer to the ref pattern.

---

## 6. Scope of the fix (for Phase 2)

Only three lines need changing in `index.jsx`:
1. Add the two-sentence WHY comment immediately before the closing dep array line.
2. Add `// eslint-disable-next-line react-hooks/exhaustive-deps` on the line before `}, [raceData]);`.

No logic changes, no variable additions, no loop modifications.
