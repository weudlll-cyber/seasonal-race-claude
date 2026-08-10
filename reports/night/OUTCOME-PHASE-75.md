# OUTCOME-PHASE-75 — the decisive phase begins at 75 %, not 65 %

**Branch:** `feat/outcome-phase-75`, off `feat/pair-prefilter-1`. **The owner's decision, implemented.**
CAMERA and RENDER move, as they must. WORLD does not.

---

## THE ANSWER IN FOUR LINES

1. **`outcomePhaseThreshold` 0.65 → 0.75.** Asked from what leader progress the camera should treat
   the race as its decisive phase, he chose the later, sharper end.
2. **The COMEBACK gate is now open for about a quarter of the race instead of a third** — measured on
   two tracks, and the biggest visible consequence is that COMEBACK is entered a third as often.
3. **The three stale literals stop being disagreements, and are converted rather than aligned.** The
   guard's disagreeing sites fall 42 → 38 and the exception list 35 → 32 entries.
4. **The HUD "bug" is not what the brief described, and the record is corrected rather than
   repeated.** `getComebackDiagData` DOES emit the value; the HUD was right all along. The defect was
   smaller and differently shaped, and it is fixed at the root anyway.

---

## 1. THE DECISION, AND WHAT IT DOES

`client/src/modules/storage/defaults.js` — one key. Measured with a new read-only tool,
`scripts/outcome-phase-window.mjs`, which converts the PROGRESS number the config states into the
TIME question the owner actually asked. The conversion is not linear and cannot be done on paper:
the leader does not cover progress at a constant rate.

| track | winner crosses | threshold | decisive phase begins | window to the finish |
|---|---|---|---|---|
| mountainstreet | 58.1 s | 0.65 | 37.5 s (64.6 %) | **20.5 s** (35.4 % of the race) |
| | | **0.75** | **43.2 s** (74.5 %) | **14.8 s** (25.5 % of the race) |
| city-circuit | 76.7 s | 0.65 | 50.0 s (65.2 %) | **26.7 s** (34.8 % of the race) |
| | | **0.75** | **58.3 s** (76.0 %) | **18.4 s** (24.0 % of the race) |

**So the gate opens 6–8 seconds later and stays open about 28–31 % less time.** That is the number to
watch for, and it is what the handover quotes: the last third of the race becomes the last quarter.

**What the tool does NOT claim**, stated because it would be easy to over-read: it does not run the
director and says nothing about which shot WINS the weighted contest. `comebackWeight` still loses to
`battleWeight` during PULK — a separate knob, already in `docs/BACKLOG.md`. This measures how much
room the gate leaves, not what the camera chooses inside it.

**And the camera fingerprint measured the second half.** Re-running `tracking-lag.mjs` on the new
tree shows where the freed frames went:

| state | frames before | frames after | median lag before → after |
|---|---|---|---|
| COMEBACK_ZOOM | 2103 | **753** | 8.34 → **13.73 pp** |
| LEAD_CHANGE | 7069 | **8090** | 4.45 → 4.45 |
| LEADER_ZOOM | 17522 | 17796 | 3.77 → 3.85 |
| everything else | — | unchanged | unchanged |

**COMEBACK is entered a third as often, and the shots it does win are harder to track** — a climb
resolving at speed is a faster subject than one caught early, which is the whole point of choosing
the later threshold. The camera is not tracking worse; it is spending that state differently and much
less often. **This is why the stamp was RE-MEASURED and not re-stamped**: the numbers moved a long
way, and a deliberate re-stamp would have been wrong. Run twice on a stable tree, identical both
times.

## 2. THE THREE LITERALS — converted, not aligned

They stop being disagreements the moment the default becomes 0.75, and that is exactly when it would
be tempting to leave them: a guard that goes quiet is not a guard that is satisfied. All three now
read the default (LESSONS L207), so the next change of this number cannot recreate the problem.

| site | before | after |
|---|---|---|
| `cameraTimingComputation.js` (the resolver) | `?? 0.75` | `?? DEFAULT_CAMERA_CONFIG.outcomePhaseThreshold` |
| `CameraAdvancedSection.jsx` — slider value and display | `?? 0.75` ×2 | by reference ×2 |
| `CameraAdvancedSection.jsx` — the tooltip, **a fourth copy nobody had counted** | the words "Default 65%" | reads the default |
| `ComebackDiagHUD.jsx` | `?? 0.75` | **no fallback at all** — see §3 |
| `CameraDirectorDiag.js` — `this._outcomePhaseThreshold ?? 0.75` | a second authority | **no fallback at all** |

**The tooltip is worth naming.** It said "Default 65%" in prose — not a `??` fallback, so
`check-fallback-agreement` could never have seen it, and `check-config-claims` scans documents, not
JSX. It would have been wrong on screen, in the very control the owner would use to judge the change,
with nothing able to notice. It now reads the default too.

**The counts, measured before and after:**

| | before | after |
|---|---|---|
| disagreeing sites | 42 | **38** |
| exception-list entries | 35 | **32** |
| read by reference | 314 | **319** |
| mirrored fallbacks total | 361 | 362 |

Sites fall by four while entries fall by three because `CameraAdvancedSection.jsx` carried the same
`?? 0.75` twice under one `(file, key)` entry. **Which three left was verified rather than inferred**
— the guard's exemption list was diffed before and after, and the removals are exactly the three
`outcomePhaseThreshold` lines with nothing added.

## 3. THE HUD — the brief's premise was wrong, and this is the correction

> The brief: *"`ComebackDiagHUD` reads `diag.outcomePhaseThreshold` and `getComebackDiagData` never
> emits it, so the HUD would state 0.75 by coincidence now and lie again at the next change."*

**It does emit it.** `CameraDirectorDiag.js` writes `outcomePhaseThreshold: threshold` unconditionally
into the object literal it returns, and `_outcomePhaseThreshold` is assigned by
`_computeTimingConfig`, which runs from the constructor — so it is never absent on a real director.
The HUD's `?? 0.75` was UNFIREABLE, like the other two, and the panel has been showing the director's
real value all along. The claim came from `check-fallback-agreement.mjs`'s own exception reason,
written at FALLBACK-42-TRIAGE; that text is corrected in place, because a wrong reason on an
exception list is worse than no reason — it is the thing the next reader will trust.

**The real defect was smaller and differently shaped, and it is fixed anyway:** three copies of a
default, one of them inside the panel you would read while judging the very number it copies. Both
diagnostic fallbacks are now gone rather than converted, because **a fallback in a panel is a second
authority on a number the director owns**, which is precisely the rule `CameraDirectorDiag.js`'s own
header states ("a panel must never re-implement a rule it is displaying"). The diag reports
`this._outcomePhaseThreshold` raw — including `undefined`, which is honest: `progress > undefined` is
false, exactly what the director's own gate would do. The HUD renders a dash for that.

**Three tests**, and the first is the one the brief asked for:

- **the diag threshold IS the gate threshold**, checked at a NON-default value (0.42) — at the
  default a stale copy and the real value agree and the test would prove nothing;
- **the diag invents no threshold** when the director has none, and the verdict it draws agrees;
- **"the default is 0.75" now READS the default.** It was a literal, which is L207 wearing a test's
  clothes — the same defect `24d1ed2c` fixed for the hull count days ago. It passed for the wrong
  reason (the resolver's own stale fallback, not the shipped default) and it would have gone red on
  the commit that made the default correct, the cheapest way out of which is to un-fix the default.

## 4. FINGERPRINTS — all four

| role | before | after | |
|---|---|---|---|
| WORLD | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unchanged** — a camera key cannot move the race, and this proves it rather than assuming it |
| CAMERA | `ad07c08ce5d8ae49` | **`d54d6332fb8d36c6`** | EXPECTED — this changes a director decision |
| RENDER | `752df7bc61ef0721` | **`9580ff2e3626b3b9`** | the camera decides the transform on every drawn frame, so render follows |
| world-off | `854018ee5d3d83e1` | not re-run | the ON world is unchanged and nothing here touches the engine, so the OFF arm has no question to answer |

**Not minted here.** The ship does that.

779 camera tests green.

---

## SOURCE HYGIENE

| file | what |
|---|---|
| `client/src/modules/storage/defaults.js` | the key, and the owner's reasoning beside it |
| `client/src/modules/camera/cameraTimingComputation.js` | resolver reads the default |
| `client/src/modules/camera/CameraDirectorDiag.js` | fallback removed, with the reason |
| `client/src/screens/RaceScreen/ComebackDiagHUD.jsx` | fallback removed; a dash when there is nothing to show |
| `client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx` | value, display and tooltip all read the default |
| `client/src/modules/camera/CameraDirector.test.js` | three tests |
| `scripts/check-fallback-agreement.mjs` | three exceptions removed; the wrong reason corrected |
| `scripts/outcome-phase-window.mjs` | new, read-only |
| `docs/CAMERA_DIRECTOR.md` | tracking lag re-measured; the "three fallbacks disagree" line is now two |

### Noticed but left

- **`comebackWeight` still loses to `battleWeight` during PULK**, so a fired comeback candidate can
  still lose the lens. Moving the gate does not touch the contest, and BACKLOG already holds it as an
  eye-test decision. If the owner finds the climb still under-shown, that pair of weights is the next
  knob, not this one.
- **`comebackMinStartGap` and `comebackMaxCurrentRankPct` remain on the disagreement list.** Both are
  the same shape as this one was and want the same treatment; neither is a number I may choose.
- **The Dev Screen slider floor is 0.5**, so the owner can explore 0.5–0.95 by eye without a code
  change — which is the point of the control.
