# COMEBACK-SETTINGS-SURVEY-1 — which Dev Screen comeback settings still change what is shown

**2026-10-02, branch `ship/owner-cosmetic-defaults` (on top of COMEBACK-HOLD-1). A survey: no product
file was changed and nothing was removed.**

**The question.** Since 2026-09-19 a comeback is shown when one was planned (PLANNED-COMEBACK-ONLY-1).
Several Dev Screen comeback settings were written for the older, unplanned detector. Which of them
can still change the picture?

## How "no effect" is proven

- **Driven, not argued.** Each control is set to a clearly different value, inside its own slider
  range. Then the same 30 races as COMEBACK-HOLD-1 are run: 10 shipped tracks × Quick-Test seeds 1–3,
  20 racers, this branch's config with that one value changed.
- **The camera output is compared byte for byte.** `scripts/diag/comeback-hold-measure.mjs` hashes
  every frame's camera state, zoom and offsets per race (SHA-256). It gained two options for this
  survey: `--set=key=value` and `cameraTraceHash`. Dotted keys go through `setPath` from
  `scripts/lib/hisArm.mjs`, reused rather than rewritten.
- **The control.** The baseline was run twice: 30 of 30 hashes identical, so the method is
  deterministic.
- **The rule (from the brief).** All 30 hashes identical ⇒ **NO EFFECT (proven)**. Any difference ⇒
  **ACTS**.
- **What "proven" covers.** It is proven for these 30 races. Where the setting still has a live
  reader in the camera code, the reader is named, so a reader can see what kind of race would be
  needed for it to act.

## The comeback section (`client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx`)

| control (line) | key | readers | value driven | races differing | verdict |
| --- | --- | --- | --- | --- | --- |
| comeback weight (:870) | `comebackWeight` | `cameraTimingComputation.js:402` → `CameraDirector.js:698`; used in `_pickNextState` | 0.6 → 0.2 / → 1.0 | 0 / **1** of 30 | **ACTS** — rarely: the planned comebacker's FIRST shot is returned above the weight, so the weight only decides a second shot |
| min. positions gained (:1168) | `comebackMinPositionsGained` | `:314` → detector gates (`CameraDirector.js:662`) | 2 → 5 | **10** | **ACTS** (shots 10 → 5) |
| look-back window (:1184) | `comebackWindowSec` | `:316` → detector gates (`:661`); also the rank-history length the hold's gain test reads | 4 → 8 s | **9** | **ACTS** |
| min. observation duration (:1198) | `comebackMinDuration` | `:317-338` → the COMEBACK minimum hold | 8 → 3 s | **10** | **ACTS** |
| comeback cooldown (:1212) | `comebackCooldownMs` | `:393` → `CameraDirector.js:693`; gates a SECOND comeback after one ends | 10 → 30 s | 0 | **NO EFFECT (proven)** — no race here had a second comeback within reach of the cooldown |
| outcome-phase threshold (:1226) | `outcomePhaseThreshold` | `:319` → `CameraDirector.js:672`, OR'd with the plan's own OUTCOME phase; `CameraDirectorDiag.js:110` (diagnostics only) | 0.65 → 0.85 | 0 | **NO EFFECT (proven)** — the plan's OUTCOME phase opens the window first |
| min. start gap (:1240) | `comebackMinStartGap` | `:326` → detector gates (`:663`) | 0.25 → 0.6 | **10** | **ACTS** (shots 10 → 0) |
| max. current rank (:1259) | `comebackMaxCurrentRankPct` | `:328` → detector gates (`:664`) | 0.2 → 0.05 | **3** | **ACTS** (shots 10 → 12) |
| use the plan's beats (:1284) | `comebackUseBeats` | `:335` → detector (`:668`, `comebackDetector.js` entry gate) | off → on | **8** | **ACTS** (shots 10 → 8) |
| comeback diagnostics (:2075) | `showComebackDiag` | `RaceScreen/index.jsx:262`, `:2089` → `ComebackDiagHUD` | off → on | 0 | **ACTS on the display only** — it draws a diagnostics panel; the camera is untouched (proven) |

## The COMEBACK_ZOOM column of the per-state table (same file, field definitions at the lines shown)

| field (line) | readers | value driven | races differing | verdict |
| --- | --- | --- | --- | --- |
| world in shot (:50) | `framingConfig.js:105` | 0.7 → 0.4 | **10** | **ACTS** |
| tracking speed (:72) | `cameraTimingComputation.js:224` | 0.25 → 1.0 | **10** | **ACTS** |
| entry speed (:86) | `cameraTimingComputation.js:229` | 0.8 → 2.0 | 0 | **NO EFFECT (proven)** — live reader; no difference in these races |
| lead-in (:94) | `cameraTimingComputation.js:243`, `CameraDirector.js:1155` | 0.3 → 1.5 s | 0 | **NO EFFECT (proven)** — live reader |
| lead-out (:103) | `cameraTimingComputation.js:244`, `CameraDirector.js:1523` | 1.5 → 0 s | 0 | **NO EFFECT (proven)** — live reader |
| inner frame (:112) | **none in the director**: it reads one `innerFramePct` for all states (`CameraDirector.js:577`, from `framingConfig.js`) | 0.7 → 0.9 | 0 | **NO EFFECT (proven)** — the per-state value never reaches the camera |
| maximum duration (:120) | `cameraTimingComputation.js:227` | 15 → 9 s | **2** | **ACTS** — only shots that would run past 9 s |
| minimum hold (:128) | `cameraTimingComputation.js:226`, **overridden by `comebackMinDuration`** (`:337-338`) whenever the config carries it, which the browser's always does | 5 → 2 s | 0 | **NO EFFECT (proven)** — structurally |
| entry timeout (:136) | `cameraTimingComputation.js:210` | 5000 → 1000 ms | 0 | **NO EFFECT (proven)** — live reader |
| lead-ahead (:145) | `cameraTimingComputation.js:196` | off → on | 0 | **NO EFFECT (proven)** — live reader |
| lead-out switch (:153) | `cameraTimingComputation.js:202` | off → on | 0 | **NO EFFECT (proven)** — live reader |

## Summary

| verdict | controls |
| --- | --- |
| **ACTS** | weight (rarely), min. positions, window, min. duration, min. start gap, max. current rank, use beats; profile: world in shot, tracking speed, maximum duration |
| **ACTS on the display only** | comeback diagnostics |
| **NO EFFECT (proven, 30 races) — structurally dead** | profile *inner frame* (never reaches the director); profile *minimum hold* (always overridden by `comebackMinDuration`) |
| **NO EFFECT (proven, 30 races) — live reader, not exercised here** | cooldown, outcome-phase threshold; profile entry speed, lead-in, lead-out, entry timeout, lead-ahead, lead-out switch |
| **UNCLEAR** | none |

**Nothing was removed** (the brief). The two structurally dead fields are the clearest candidates for
removal; the six "live reader" ones would need a race that exercises them (a second comeback, a
longer entry) before calling them dead.

## Noticed and left

- The profile *inner frame* field is per state in the Dev Screen but not in the camera. TIDY-C-1
  noted the same from the other side. It probably applies to every state, not only COMEBACK_ZOOM;
  only the COMEBACK column was surveyed here.
- `C:/tmp/p2/` held unrelated `resid-*.json` files from an earlier session; left alone.
