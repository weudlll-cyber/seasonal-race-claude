# FINISH-SEAM-1 — making the end of a race sayable, so it can be changed

**Branch** `feat/finish-seam-1` · **Base** master `b363bd94` (confirmed with `git rev-parse`; tree
clean) · **Return tag** `pre/finish-seam` (`b363bd94`, registered in [TAGS.md](../../docs/TAGS.md))
· **Source commit** `9873c278` · **Date** 2026-08-05

---

## 0. FOR THE OWNER — how a race ends, in the order it happens

A race ends in **three acts**, and there is a fork in the middle one.

**Act 1 — the approach.** When the leader is 97% of the way home and nobody has crossed yet, the
camera asks itself one question, **exactly once**: *are the top two close enough that this is going
to be a photo finish?* If yes, it cuts to the tight two-racer shot **before** anybody crosses the
line, which is why the photo finish looks predicted rather than reacted to. If no, it never asks
again — that one answer stands for the rest of the race.

**Act 2 — the moment.** One of two shots, never both:

- **The photo finish** — the tightest shot in the race, on the top two. It can be reached through
  two doors: the pre-line question above, or, if that question was never asked (the leader came from
  below 97% and crossed in the same instant), a fallback at the first crossing that asks the same
  closeness question. Once the shot is up it **owns the picture**: nothing else can interrupt it, not
  a lead change, not a battle, not any timer. It ends when the **second** racer crosses. There is
  deliberately no clock on it — a clock used to expire during the slow-motion approach and cut away
  before the winner had crossed, which ate the winner's name from the screen.
- **The drama pulse** — the classic single-winner shot on the leader, 1.5 seconds long, taken when
  the top two are *not* close. It starts the instant the first racer crosses and nothing can block
  it; whatever shot was up gets cut off mid-hold.

**Act 3 — the aftermath.** Both shots hand over to **FINISH_OVERVIEW**: the camera eases out to the
wide shot and holds a fixed point 300 world pixels *behind* the line, so the racers still coming in
cross the line inside the frame instead of chasing a camera that has followed the winner away. This
act is **absolute** — from the moment it begins, no other shot is ever chosen again, however long the
race runs on. It is a one-way door.

**What this block changed:** nothing you can see. It changed *where the sequence above is written
down*. Before, it existed only as six on/off memories scattered through two long methods — you could
run it, but you could not read it. It is now one file, [`finishPhase.js`](../../client/src/modules/camera/finishPhase.js),
which says exactly the three acts above and gives each step a name a test can check. Changing how a
race ends is now a change in one place.

**Two things you will want to know before you change it** — both found while mapping, both
surfaced rather than fixed:

1. **Two of the Photo Finish dials on the Dev Screen do nothing.** "Min state hold" (1500 ms) and
   "Max state duration" (8000 ms) under *Photo Finish* are read from a table that has no Photo
   Finish row, so the camera silently uses Overview's numbers instead — and even if they were
   wired, the shot ignores both, because it ends on crossings only. §5.
2. **The Photo Finish is decided by track position, not by race position.** Two racers exactly one
   lap apart sit at the same point on the track, so the code reads them as "together". Structurally
   real; practically very unlikely under the shipped ±10% speed band. §7.

---

## 1. BUILD-VS-SPEC CONFORMITY

| Spec section | Asked for | Delivered | Deviation |
|---|---|---|---|
| §1 hard gate | Camera + render fingerprints bit-identical at every commit; world unmoved | Held. One source commit, all three measured before and after (§4) | none |
| §2 the map | Every write with its condition, every read with what it decides, the legal order, the terminations, and a verdict: one lifecycle or several | §3, in full. Verdict given and it **contradicts the spec's own reading** — see below | **the spec's premise was wrong, and that is the map's headline** |
| §3 the seam | Named phases, explicit transitions, machine-readable reasons; call site keeps every `this` assignment | `decideFinishPhase()` + `finishTransitionBypasses()`, pure; six latch writes all at the call site | none |
| §3a latch split | Predicate pure, latch assignment at the call site; say so if the split is dishonest | Split is **honest** and was re-checked, not inherited. §3.6 | none |
| §3b framing | Stop at the boundary if the sequence cannot separate from the framing | **The boundary was never reached.** The five named latches do not frame at all — the framing coupling is entirely in `_inFinishMode`, which is a sixth latch the spec did not name, and its five framing reads were left untouched. §3.3 | none, but the constraint's premise did not hold |
| §4 the knobs | Every finish config value, where it lives, what it does, Dev Screen reachability | §5, eleven knobs, three of them **dead or double-homed** | none |
| §4 coverage | Which behaviours are protected by test, which by convention, which by neither | §6 | none |
| §4 lap-blindness | Surface `photoFinishCloseThresholdT`, do not fix | §7, with a reachability judgement | none |
| §5 tests | Each transition asserted by its reason; the once-only gate proven to fire exactly once; the drama window proven to end; ≥1 impossible order; L203 throughout | 61 new tests (44 unit + 12 director + 5 cross-door). Three impossible orders, not one | none |
| §5 hygiene | Lines before/after per file; noticed-but-left list | §8, §7 | none |
| §6 stop rules | — | None fired. Nothing touched `raceBehavior.js` or the physics | n/a |
| §7 report | Conformity, map, fingerprints, knobs, coverage, noticed-but-left, ≥2 own proposals | This file. Four proposals — the spec's two answered, two of my own | none |

**The one deviation worth stating plainly.** The spec's §0 asserted the five latches "govern TWO
things at once — which shot is chosen AND how tightly it is framed — which is why they resist being
moved." It also said *verify rather than trust*. Verification says **no**: all five govern the shot
choice and the HUD label, and **none of them is read by any framing site**. The framing coupling is
real but lives in `_inFinishMode`, which the spec's list omitted. That is why the seam that had been
called for twice turned out to be takeable in one pass — the obstacle everyone remembered was
attached to a different latch than the one they remembered it on.

---

## 2. Fingerprint table, per commit

| Commit | What | Camera | Render | World |
|---|---|---|---|---|
| `b363bd94` (base) | master tip, untouched tree | `7a33faf2ec131437` | `73ba53ba9fea12c7` | `dc4647be0f55ebdb` |
| `9873c278` | the seam + tests + docs | `7a33faf2ec131437` ✅ | `73ba53ba9fea12c7` ✅ | `dc4647be0f55ebdb` ✅ |

All three **run, not argued**. Camera and render were re-measured a second time *after* the
pre-commit hook's `eslint --fix` + `prettier --write` touched the files, because a formatting pass
that runs between the measurement and the commit measures the wrong tree. World was measured after
the source change; it cannot move (no engine file is touched) but the ceremony's rule is to run it,
so it was run.

Suite: **3623 passed / 3623**, 178 files (was 3562 in 177 files).

---

## 3. THE MAP — the finish lifecycle as it actually is

This section is the deliverable the spec asked for in its own right. It describes the code **as
found at `b363bd94`**; the extraction reproduces it exactly.

### 3.1 The cast — six memories, not five

| Field | Type | Means |
|---|---|---|
| `_inFinishDrama` | bool | the 1.5 s drama window is open |
| `_inPhotoFinish` | bool | the PHOTO_FINISH shot is up (kept distinct from the above so `hudState` can report it) |
| `_photoFinishGateDone` | bool | the pre-line question has been asked (once-only) |
| `_photoFinishEnterPending` | bool | the gate said "close"; the entry has not been taken yet |
| `_finishMomentExpiry` | number\|null | when the drama window ends; `null` = no drama has ever started |
| **`_inFinishMode`** | bool | **FINISH_OVERVIEW has begun. The spec's list omitted it, and it is the only one that frames.** |

There is no `reset()` on the director: a new race constructs a new `CameraDirector`, so every latch
starts false/null exactly once per race.

### 3.2 Every WRITE, with its condition

| Field | Site | Value | Condition |
|---|---|---|---|
| `_inFinishDrama` | ctor | `false` | — |
| | `_pickNextState` | `true` | `finishedCount>0` ∧ `¬_inPhotoFinish` ∧ `¬_inFinishMode` ∧ `expiry===null` ∧ ¬close |
| | `_pickNextState` | `false` | `finishedCount>0` ∧ `¬_inPhotoFinish` ∧ `¬_inFinishMode` ∧ `expiry≠null` ∧ `ts≥expiry` |
| `_inPhotoFinish` | ctor | `false` | — |
| | `_pickNextState` | `true` | first-crossing door: same as the drama's condition, but close |
| | `_pickNextState` | `true` | pre-line door: `¬_inPhotoFinish` ∧ `finishedCount===0` ∧ `_photoFinishEnterPending` |
| | `_pickNextState` | `false` | `_inPhotoFinish` ∧ (`finishedCount≥2` ∨ `finishedCount≥racers.length`) |
| | `_pickNextState` | `false` | in the drama-expiry branch — **provably already false there** (§3.5) |
| `_photoFinishGateDone` | ctor | `false` | — |
| | `update()` | `true` | the gate `evaluated`: `¬gateDone` ∧ `photoFinishEnabled` ∧ `finishedCount===0` ∧ `leaderProgress ≥ 0.97` |
| `_photoFinishEnterPending` | ctor | `false` | — |
| | `update()` | `true` | the gate `close` (implies `evaluated`) |
| | `_pickNextState` | `false` | consumed at the pre-line door |
| `_finishMomentExpiry` | ctor | `null` | — |
| | `_pickNextState` | `ts + finishDramaDurationMs` | the drama branch only. **Never reset to `null`.** |
| `_inFinishMode` | ctor | `false` | — |
| | `_pickNextState` | `true` | photo-finish end |
| | `_pickNextState` | `true` | drama expiry |

### 3.3 Every READ, and what it decides — **the map's central finding**

| Field | Read at | Decides |
|---|---|---|
| `_inFinishDrama` | `update()` → `finishDramaExpired` | state choice (hold-gate bypass) |
| | `get hudState` | HUD label `'FINISH'` |
| `_inPhotoFinish` | `update()` → `photoFinishEndReady` | state choice (bypass) |
| | `_pickNextState` block 0 | state choice (owns the state) |
| `_photoFinishGateDone` | `update()` → gate predicate | state choice |
| `_photoFinishEnterPending` | `_pickNextState` block 1.5 | state choice |
| `_finishMomentExpiry` | `update()` ×2, `_pickNextState` ×2 | state choice ×4 |
| **`_inFinishMode`** | `update()` → `forceFinishDrama` | state choice |
| | `_pickNextState` — the absolute lock | state choice |
| | `get hudState` | HUD label `'FINISH_OVERVIEW'` |
| | **`update()` ~L854** — `fT = _inFinishMode ? null : leader.t` | **FRAMING** (suppresses OVERVIEW T-tracking so the winner's run-out cannot drag the camera past the line) |
| | **`update()` ~L879** — the else-branch T-lerp | **FRAMING** (glides `_camT` to the fixed lookback point) |
| | **`_transition` ~L1369** — `if (!_inFinishMode)` | **FRAMING** (OVERVIEW's hard zoom-snap vs. the gradual finish zoom-out; also *writes* `_lfEntryByState[OVERVIEW]`) |
| | **`_transition` ~L1507** — lookbackT target | **FRAMING** |
| | **`_transition` ~L1537** — `finishGlide` | **FRAMING** (exempts the finish OVERVIEW from the entry-grammar) |
| | **`_setTargets` ~L2196** — the lookback anchor | **FRAMING** |

**Read the two halves of that table against each other.** The five latches the spec named have
**nine reads between them, and not one is a framing site**. `_inFinishMode` has nine reads of which
**six are framing** (five distinct sites plus the write it performs on the lerp map). PHOTO_FINISH's
own framing keys off `this.state`, not off `_inPhotoFinish`.

That is why §3b's stop rule never fired, and it is the answer to why this seam resisted twice: the
remembered obstacle is real, but it is attached to the *sixth* latch — the one that was left out of
the list every time the seam was chartered.

### 3.4 The legal order

```
                    ┌─ finishedCount 0, progress ≥ 0.97, asked ONCE ─┐
   [racing] ────────┤                                                │
                    │   close ──► PHOTO_FINISH ──┐                   │
                    │   not close ───────────────┼───────────────────┘
                    └────────────────────────────┼──► [racing continues]
                                                 │
   first crossing (finishedCount 0→1):           │
     ├─ already in PHOTO_FINISH ──────────────────┤ (block 0 wins — the crossing is ignored)
     ├─ close  ──► PHOTO_FINISH ──────────────────┤
     └─ apart  ──► DRAMA (LEADER_ZOOM, 1500 ms) ──┤
                                                  │
   PHOTO_FINISH ──(2nd crossing / all home)──► FINISH_OVERVIEW ──► ⊥
   DRAMA        ──(ts ≥ expiry)──────────────► FINISH_OVERVIEW ──► ⊥
```

**The orders that are impossible, and why:**

| Impossible | Made impossible by |
|---|---|
| Both shots in one race | Block 0 is hoisted **above** the crossing block, so a photo finish is never interrupted by the crossing it was waiting for and `expiry` stays `null` forever. From the other side: once `expiry ≠ null`, the fork is never re-asked. |
| The pre-line door after anybody has crossed | Block 2 (`finishedCount > 0`) returns before block 3 for every non-zero count. |
| The gate asked twice | `_photoFinishGateDone`, latched on the frame it evaluates — *and* the predicate's own `finishedCount !== 0` clause, which is a second lock in the reactive case. |
| Anything after FINISH_OVERVIEW | The `_inFinishMode` lock inside the crossing block, which every post-finish frame reaches (`finishedCount > 0` always holds after the first crossing). |
| A drama shorter than its window | `finishDramaExpired` is the only bypass that ends it, and it needs `ts ≥ expiry`. |
| A photo finish cut short by a timer | There is no timer. Both `minStateHold` and `maxStateDuration` are inert for the shot (§5). |

### 3.5 Termination — can a path leave a latch set?

- **`_photoFinishEnterPending` — provably NOT.** It is consumed on the frame it is set. Proof: setting
  it requires `close`, `close` sets `photoFinishGateReady`, and `photoFinishGateReady` guarantees
  `decideTransition` returns a non-`NONE` action. Both non-`NONE` actions call `_transition()`
  (`_exitBattle` calls it too — checked, not assumed), and inside `_pickNextState` blocks 0 and 2 are
  both skipped on that frame (`_inPhotoFinish` false, `finishedCount === 0`), so block 3 is reached.
  Pinned by the "unreachable once anybody has crossed" test.
- **`_photoFinishGateDone` can legally end a race `false`** — if the leader crosses from below 0.97 in
  one frame, or `photoFinishEnabled` is off. That is the reactive door's whole reason to exist.
- **`_inFinishDrama` always ends `false`**, because `finishDramaExpired` bypasses the hold gate every
  frame and `_inFinishMode` cannot be set by any other route while the drama is up (the only other
  setter requires `_inPhotoFinish`, which is mutually exclusive with the drama).
- **`_inPhotoFinish` always ends `false`**, cleared when everybody is home.
- **`_finishMomentExpiry` is never reset.** Terminal non-`null` after a drama; harmless because the
  director does not outlive the race.
- Both "always ends false" claims hold **only while `update()` keeps being called**. If RaceScreen
  leaves the RACING phase mid-window, the latch freezes as it was. Out of the director's hands, and
  stated so nobody assumes otherwise.

### 3.6 The verdict the spec asked for: one lifecycle, or several overlapping?

**One lifecycle. The overlap is in the ENTRY, not in the sequence.**

The three acts are a genuine sequence with no interleaving: approach → the moment → the aftermath,
each terminating cleanly into the next, with the mutual exclusion proved above. What made it *look*
like several is that **Act 2 has two mutually exclusive shots and one of those shots has two entry
doors evaluated at two different places in the frame** — the pre-line door in `update()`, the
reactive door in `_pickNextState`, ~400 lines apart, asking the **same** closeness question through
two separate copies of the same expression. Reading either one alone, you would reasonably conclude
there were two lifecycles.

That finding decided the shape of the extraction: the sequence is expressed as **one ordered
decision** (because it is one), the two doors are **two named reasons of one action** (because they
are one shot), and the duplicated closeness expression now has one home with a test asserting the
two doors agree across four gap sizes.

### 3.7 The honesty check on the latch split (§3a)

Re-checked rather than inherited from CAMERA-ANCHOR-TRUTH-1:

- `evaluatePhotoFinishGate` contains **only questions**. `close ⟹ evaluated` is a property, tested
  directly, and it is what makes `evaluated → set gateDone` / `close → set pending` an exact mapping
  rather than a plausible one.
- `decideFinishPhase` returns an action; the call site's `switch` performs the six assignments. The
  one place this could have been dishonest is the pending flag: it is cleared for the pre-line door
  only, exactly as the original did, and **not** unconditionally on both doors — even though §3.5
  proves it would be a no-op. Relying on that proof inside the call site would have made the code
  depend on an argument written in a report.
- **The split is honest.** No partial extraction was needed and none is claimed.

---

## 4. What the extraction is

`client/src/modules/camera/finishPhase.js` — pure, no `this`, no `CAM_STATE` (the ACTION implies the
state; the call site maps it, the same separation `transitionDecision.js` keeps):

- `decideFinishPhase({...}) → {action, reason, text}` — the three priority blocks, one ordered
  decision, precedence stated rather than implied by block position.
- `evaluatePhotoFinishGate({...})` — **moved** from `transitionDecision.js`. It is a finish question,
  not a transition question; keeping it there put half the sequence in the transition file.
- `finishTransitionBypasses({...})` — the three hold-gate bypasses `update()` computed inline.
- `FINISH_ACTION` (6) and `FINISH_REASON` (9), plus the dev-console sentences, kept **verbatim** so
  the `[CAMERA]` diagnostic line is byte-identical.

At the call site: `this._lastFinishReason` mirrors `this._lastTransitionReason` — observable, read by
nothing in the camera math. **Note its contract:** it records the last decision *made*, and a
decision is only made when a transition is attempted, so on a held frame it is stale by design. That
tripped my own first test and is now stated at the assertion.

---

## 5. THE KNOBS — every config value that governs the finish

| Knob | Default | Home | What it does | Dev Screen |
|---|---|---|---|---|
| `finishDramaDurationMs` | 1500 | `defaults.js` → `cameraTimingComputation.js` | how long the single-winner pulse holds before FINISH_OVERVIEW | ✅ *Finish drama duration*, 100–5000 ms |
| `finishOverviewZoomOutDurationMs` | 3000 | same | the target duration of the ease out to the wide shot (converted to a lerp TC via `/3450`) | ✅ 500–8000 ms |
| `finishPauseMs` | 2500 | same | pause after the last finisher before the leaderboard. Read by **RaceScreen**, not the director | ✅ 0–10000 ms |
| `finishOverviewLookbackPx` | 300 | same | how far **behind** the line the finish shot holds, in world px | ✅ 0–1000 px |
| `photoFinishEnabled` | `true` | same | master switch. Off ⇒ the gate never evaluates **and** the reactive door never fires — every finish is a drama | ✅ checkbox |
| `photoFinishLeadProgress` | 0.97 | same | how far home the leader must be before the pre-line question is asked | ✅ 0.85–0.999 |
| `photoFinishCloseThresholdT` | 0.03 | same | the gap below which the top two count as "together". **Both** doors use it. Lap-normalised — §7 | ✅ 0.005–0.15 |
| `photoFinishSlowmoFactor` | 0.5 | `defaults.js` | time dilation during the shot. **Not a director tunable** — RaceScreen reads it off `hudState === 'PHOTO_FINISH'` | ✅ 0.1–1.0 |
| `cameraStateProfiles.PHOTO_FINISH.visibleCorridors` | 0.4 | `defaults.js` | the tightest shot shipped (120 world px) | ✅ per-state row |
| `cameraStateProfiles.PHOTO_FINISH.minStateHold` | 1500 | `defaults.js` | **DEAD — see below** | ✅ shown, does nothing |
| `cameraStateProfiles.PHOTO_FINISH.maxStateDuration` | 8000 | `defaults.js` | **DEAD — see below** | ✅ shown, does nothing |

### The three knob defects, measured not read

Run against the shipped `DEFAULT_CAMERA_CONFIG` through `computeTimingFromConfig`:

```
shipped profile PHOTO_FINISH.minStateHold    = 1500
shipped profile PHOTO_FINISH.maxStateDuration= 8000
minStateHoldByState keys = OVERVIEW,LEADER_ZOOM,BATTLE_ZOOM,COMEBACK_ZOOM,LEAD_CHANGE
minStateHoldByState[PHOTO_FINISH]     = undefined   → falls back to 5000 (OVERVIEW's)
maxStateDurationByState[PHOTO_FINISH] = undefined   → falls back to 4000 (OVERVIEW's)
LEAD_CHANGE:    profile 1500 → resolved 1500  | leadChangeMinDuration 1.5 s
COMEBACK_ZOOM:  profile 5000 → resolved 3000  | comebackMinDuration   3 s
```

1. **`PHOTO_FINISH.minStateHold` and `.maxStateDuration` are unreachable.**
   `cameraTimingComputation.js` builds both per-state maps with five keys and no `PHOTO_FINISH`, in
   both the profiles path and the legacy path. The Dev Screen renders the rows (`PHOTO_FINISH` is in
   `CAM_STATES_FOR_PROFILES`, both fields are in `PROFILE_FIELDS`), so the owner can move a slider
   that reaches nothing. **Doubly inert:** even wired, `decideFinishPhase` HOLDs for the whole shot,
   so no hold and no cap could act. Worth knowing before changing the finish: the photo finish's
   duration is *purely* event-driven and there is no dial for it today.
2. **`COMEBACK_ZOOM.minStateHold` is double-homed and the profile row loses.** The profile says 5000,
   the resolved value is 3000, because `comebackMinDuration: 3` is non-`null` and overrides it
   unconditionally. Two Dev Screen controls for one number; the one that looks per-state is the
   dead one.
3. **`LEAD_CHANGE.minStateHold` is the same shape, currently hidden by luck.** Profile 1500,
   `leadChangeMinDuration: 1.5 s` → 1500. They agree, so nothing is visibly wrong — until someone
   moves the profile row and nothing happens.

All three are **surfaced, not fixed** (§4 of the spec, and each is a behaviour change).

---

## 6. COVERAGE — which finish behaviours are protected, and by what

The spec was right that this matters more here than anywhere. Before this block:

> **`_inPhotoFinish`, `_photoFinishGateDone` and `_photoFinishEnterPending` had ZERO test references
> anywhere in the repository.** The only finish-latch reference in any test file was
> `_finishMomentExpiry`, in five lines of the Block W drama tests. The entire photo-finish path —
> both doors, the ownership guard, the event-driven end — was protected by **neither test nor eye**:
> PHOTO_FINISH is rare, the owner has declined a targeted pass over it, and the camera fingerprint
> covers only what a *seeded default race* happens to reach.

### After

| Behaviour | Before | After |
|---|---|---|
| Drama starts on the first crossing | ✅ test (Block W) | ✅ + by its reason |
| Drama window ends | ✅ test (state only) | ✅ + `_inFinishDrama`, `hudState`, reason, and **the duration setting proven to be what ends it** (1500 vs 5000 on identical frames) |
| Drama bypasses minStateHold | ✅ test | ✅ + a mid-BATTLE start |
| FINISH_OVERVIEW anchors on the lookback point | ✅ test | unchanged |
| **Pre-line gate fires exactly once** | ❌ **neither** | ✅ both L203 positions: a later close pair cannot re-open it, *and* the same frame on a fresh director does enter |
| **Gate respects the progress threshold** | ❌ neither | ✅ both positions |
| **`photoFinishEnabled` as a switch** | ❌ neither | ✅ both positions, both doors |
| **The closeness fork** | ❌ neither | ✅ threshold proven decisive: the same field forks both ways around it |
| **Photo finish survives the first crossing** | ❌ neither | ✅ + `_finishMomentExpiry` asserted still `null` |
| **Photo finish ends on the second crossing** | ❌ neither | ✅ + the all-home safety net |
| **No wall-clock cap** | ❌ neither (and this is the behaviour a regression already ate once) | ✅ 30 s hold asserted |
| **The reactive door is a fallback** | ❌ neither | ✅ gate skipped ⇒ door fires, by reason |
| **`_photoFinishEnterPending` consumed same-frame** | ❌ neither | ✅ asserted + the structural proof pinned as an impossible-order test |
| **FINISH_OVERVIEW is absolute** | ⚠️ one test, "does not flip back to LEADER" | ✅ five frames with a pending lead change and every hold elapsed |
| **Both shots never run in one race** | ❌ neither | ✅ 18-combination sweep + a director-level drama-then-bunching test |
| `hudState` reports the three finish labels | ⚠️ convention | ✅ asserted at each act |
| The two doors ask the *same* question | ❌ neither (two copies of the expression) | ✅ 4 gap sizes, both doors |
| Precedence of the three blocks | ❌ neither | ✅ 4 ordering tests |

**Still protected by convention only:**

- The framing consequences of `_inFinishMode` — the zoom-out ease, the grammar exemption, the T-lerp
  suppression. `_setTargets`' lookback anchor has a test; the other three do not. Deliberately not
  addressed: §3b puts framing outside this block's gate-free zone.
- `finishPauseMs` and `photoFinishSlowmoFactor`, both consumed in RaceScreen's rAF loop.
- The winner-text fire-once latch in RaceScreen (`winnerTextFiredRef`).

**Still protected by neither test nor eye:** the *look* of the photo finish and of the finish
zoom-out. No test can judge those and the owner has not seen them. That is unchanged by this block
and is the honest state of the finish phase.

---

## 7. NOTICED, NOT FIXED

1. **`photoFinishCloseThresholdT` is lap-normalised — the reachability answer.** Both doors compare
   the top two through `shortestArcDeltaT`, which works on `((t % 1) + 1) % 1`. Two racers **exactly
   one lap apart occupy the same point on the track and read as 0 apart** — a photo finish on a
   runaway. *Is it reachable in a way that matters?* Structurally yes on any closed multi-lap race
   (`finishT = laps`); practically **very unlikely** under the shipped ±10% speed band, which does
   not accumulate a full lap over the shipped lap counts. The *unit* itself is defensible and I want
   to say so rather than pad the finding: a photo finish **is** a track-position question, so
   measuring a track-position gap is right; only the modulo aliasing is wrong. **Backlog item, not a
   repair** — pinned by a test that states it as pre-existing.
2. **`forceFinishDrama` is true throughout a photo finish**, because between the first and second
   crossing there is no drama and no expiry. It outranks `photoFinishEndReady` in `decideTransition`'s
   precedence, so `_lastTransitionReason` reads `FINISH_DRAMA_FORCED` on the frame the photo finish
   actually ends. Harmless today — both produce a transition and `decideFinishPhase` then picks the
   right branch — but **the recorded reason is not a reliable label during a photo finish**. Pinned
   with a test and documented at the function.
3. **Every frame between the two crossings of a photo finish runs a full `_pickNextState`** (a sort
   of the field plus a pulk detection) and returns `null`. Correct, and cheap enough not to matter,
   but it is work done to reach a guard that was decided frames ago.
4. **Three knob defects** — §5. Two dead Photo Finish dials, two double-homed min-holds.
5. **`_finishMomentExpiry` is never reset to `null`.** Safe only because the director does not outlive
   the race. If a `reset()` is ever added, this is one of six fields it must clear.
6. **The stale acceptance hash in `CameraDirector.js`'s own header** (`4b33c4d31bec93ea`, three
   fingerprints out of date) — **this one I did fix**, since a wrong acceptance-test value in a
   file's own header is a live hazard for the next block, it is a comment, and `docs/CAMERA_DIRECTOR.md`
   already carried the correct `7a33faf2ec131437`.

---

## 8. Source hygiene

| File | Before | After | Δ |
|---|---|---|---|
| `CameraDirector.js` | 2534 | 2512 | **−22** |
| `transitionDecision.js` | 139 | 113 | −26 |
| `finishPhase.js` | — | **249** | new |
| `CameraDirector.test.js` | 6298 | 6503 | +205 |
| `transitionDecision.test.js` | 299 | 208 | −91 |
| `finishPhase.test.js` | — | **457** | new |
| `docs/CAMERA_DIRECTOR.md` | — | — | +9 |

Source total **+201**, and as with stage 1a this bought **sayability and testability, not line
count** — that is what the block was for and the number should not be dressed up. What the two
extracted files carry that the original did not: the sequence stated as three acts, nine named
reasons, the precedence written down, and the two-doors/one-shot fact that took a full read of both
methods to see.

**Orphaned and removed:** the `shortestArcDeltaT` import in `CameraDirector.js` (its last use went
with the fork); the `shortestArcDeltaT` import in `transitionDecision.js`; the duplicated closeness
expression (two copies → one). ESLint and Prettier clean; the pre-commit hook ran and its output was
re-measured against the gate.

---

## 9. PROPOSALS

### P1 — the spec's first question, answered: the sequence is one lifecycle, so what would today's design be?

The map says it is **one** lifecycle, so the spec's conditional does not fire in the form it was
asked. But there is a simpler honest design, and since the owner is about to work here it is cheap
to state:

**Collapse the two doors into one, by making the gate a per-frame predicate instead of a one-shot.**
Today: a once-only pre-line question at 0.97, plus a duplicate reactive question at the crossing,
plus a latch to stop the first from re-firing, plus a pending flag to carry its answer across two
methods. Four mechanisms for one question. If the gate simply asked "are the top two within the
threshold?" **every frame** from 0.97 until entry, the pending flag and the done latch both
disappear, the reactive door disappears, and the sequence becomes: *from 0.97, enter the photo
finish the first frame the pair is close; otherwise the first crossing gives the drama.*

**Two behaviour changes it would carry, stated because they are the reason it is a proposal and not
a change:** (a) a pair that separates and re-closes during the approach would enter, where today the
one-shot has already declined; (b) entry could happen later in the approach than it does now. Both
are arguably improvements and both are the owner's call, not mine. Cost: a fingerprint move on any
race whose approach crosses the threshold — so it needs a mint, a screen and his eye.

### P2 — the spec's second question: why has this seam resisted being scheduled three times?

**Because the reason to stop was recorded as a fact about the wrong latch, and it was never
re-measured.** CAMERA-HYGIENE-2 wrote "blocked by five finish-lifecycle latches that framing also
reads." That sentence is what got carried forward — into the next block, and into this spec's §0,
which repeated it while also, to its credit, saying *verify rather than trust*. The five named
latches **do not frame**. `_inFinishMode` does, and it was not on the list. So each attempt inherited
a blocker that, as stated, did not exist, and the obstacle looked large enough to defer without
anybody re-opening the file to check.

**The missing instrument is not a tool — it is a rule about how a stop gets recorded.** Concretely:
*a block that stops at a seam must record the specific reads that blocked it — file and line — not
the field names it believes are involved.* "Framing reads `_inFinishMode` at `_setTargets:2196` and
four other sites" is checkable in thirty seconds by the next block and would have been found wrong
(or, here, found *right but about a different field*) immediately. "Five latches that framing also
reads" is not checkable at all; it can only be believed or re-derived from scratch, and re-deriving
is exactly the cost that makes a block get deferred again.

That generalises past this seam, and I would offer it as a lesson: **a recorded blocker is a claim
with a location, or it is a rumour.**

### P3 (mine) — the finish is the right place to spend the owner's next eye test, and there is now a cheap way to trigger it

§6's honest bottom line is that the *look* of the photo finish and the finish zoom-out is covered by
neither test nor eye, and the block that ate the winner text is proof that regressions live there.
The obstacle has always been rarity: you cannot ask him to watch races until a photo finish happens.

But `photoFinishCloseThresholdT` is a Dev Screen slider with a range up to **0.15**, and
`photoFinishLeadProgress` goes down to **0.85**. Set both to their loose ends and **effectively every
race takes the photo finish path** — same code, same shot, no debug flag, nothing to build. Ten
minutes with those two sliders would give him the first eye pass over PHOTO_FINISH entry, its hold
through the crossings, the hand-off and the zoom-out, across whichever tracks he wants. I would
propose that as the next owner-facing step on this phase, ahead of any change to it.

### P4 (mine) — the dead per-state maps are a shape, not an incident, and one guard would close it

§5's first defect is not "somebody forgot PHOTO_FINISH". It is that `cameraTimingComputation.js`
builds per-state maps by **hand-listing five states** while `CAM_STATE` has six and the Dev Screen
renders six. Any state added later inherits the same silent fallback, and the symptom — a slider
that moves and changes nothing — is precisely the one CAMERA-HYGIENE-2 spent a night chasing under
the name "the dial appeared dead".

The fix is one test, not a refactor: **for every key in `CAM_STATE`, assert that every per-state map
returned by `computeTimingFromConfig` has that key, and that a changed profile value reaches the
resolved value.** That is an L203 test — it proves the two positions differ — and it would have
failed on `PHOTO_FINISH.minStateHold` the day the state was added. It also catches defect 2 and 3 in
the same breath, because a double-homed value fails "a changed profile value reaches the resolved
value" by construction.

I did not write it in this block: it fails today, on three counts, and a failing test is a behaviour
finding that belongs to whoever decides which of the three homes wins.

---

## 10. What the owner should do with this

- **Nothing to look at.** The picture is bit-identical, on all three instruments.
- **Read §0** before changing the finish phase; then `finishPhase.js`, which says the same thing in
  the code.
- **Three decisions are waiting**, none of them made here: the two dead Photo Finish dials (§5.1),
  the two double-homed min-holds (§5.2–3), and whether P1's simplification is wanted.
- **P3 is the cheap one** — two sliders, and the finish phase stops being the least-seen part of the
  camera.
