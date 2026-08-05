# FINISH-WINDOW-1 — the instrument reaches the ending, the pause applies to it, and goes to zero

**Base** master `597f3bdc` + the owner-approved `feat/finish-motion-1` `c0c1fb4f`, merged first as
`e2ad9cfd` · **Branch** `feat/finish-window-1` @ `3b08937a`, PR #127 · **Owner's eye pending**

---

## FOR THE OWNER — from the winner crossing to the camera coming to rest

With your settings (photo-finish 0.15 / 0.85), **every race ends in a photo finish**, so this is the
order you will actually see:

1. **The tight pair shot is already running** before anyone crosses — the camera predicted the close
   finish at 85% of the way home.
2. **The winner crosses.** The shot holds. It is waiting for the *other contender* — the second
   racer it locked onto — not merely for "two racers". Measured: **0–984 ms** of race time, and the
   photo-finish slow motion stretches that to roughly double in real time. **This was your "one to
   two seconds", and it was never the drama pulse — that never ran at all.**
3. **Both contenders are home → THE PAUSE.** New. The camera now holds the same shot, no cut, for
   **"Finish pause (ms)"** — the same dial that governs an ordinary finish. Default 1500 ms.
4. **The pause ends → the zoom-out**, one motion as before: pan and zoom together over "Finish
   overview zoom-out duration" (3000 ms), coming to rest 300 world px behind the line.

**The pause now goes to 0**, and 0 means genuinely nothing — no held frame on either ending. That is
why you asked for it: turn it down and up until it feels right.

**One thing I measured and did not change.** Your target point ("travel back by the pixels set in the
Dev Screen") is *already exact* at the shipped 300 px — on all nine tracks the camera comes to rest
within 0–26 px of it, and it never drifts forward while zooming. But it stops being exact if you push
the slider much higher: at 450 px ice-track is out by 276 px, at 600 px by 508 px. The reason is that
the camera would have to show world that does not exist, so it gets held back. **Below roughly 400 px
you get exactly what the slider says; above that, on some tracks, you do not.** Making it obey
anyway is a design decision about showing empty space beyond the track — yours, not mine.

---

## 1. CONFORMITY

| Spec | Asked | Delivered | Deviation |
|---|---|---|---|
| merge first | 3 fingerprints, CI green, `--no-ff`, delete branch | camera `ab731df15724ab5d`, render `73ba53ba9fea12c7`, world `dc4647be0f55ebdb` on `c0c1fb4f`; CI run `31029634655`; merged `e2ad9cfd`; branch deleted | none |
| A window | run reaches the ending, points inside it, fixed indices, additive, cost, re-mint | 3400→5600, ten new points, **additivity proved by reproducing the old hash**, cost measured, re-minted | none |
| A coverage | state what is and is not covered | §3.2, measured per track with a new `--coverage` flag | none |
| B1 | decompose the pause into three named components, give shares | §4.1. **(1) 0%, (2) 100%, (3) 0 ms** | **a fourth contributor found and named: the slow-motion factor** |
| B1 stop rule | if (3) contributes, report and stop on that item | It contributes **0 ms** — measured, so no stop was needed | none |
| B2 | pause on the photo-finish path, same knob, defensible "home" definition | §4.2. Contenders, not `finishedCount >= 2`, with the measurement that decided it | none |
| B3 | 0–5000, every bound site named, tests, tooltip | §4.3. **Two sites, both in the Dev Screen**; resolution path checked clean | none |
| C | acceptance measured, non-default value in a test, read the value | §5. **Measured; no code change** — the contract already holds wherever it physically can | **no change made; the limit is reported instead** |
| verification | world unmoved; A moves render only; B/C move both; L203 | §6 | none |

---

## 2. THE MERGE

`feat/finish-motion-1` was measured on its tip before merging — camera `ab731df15724ab5d`, render
`73ba53ba9fea12c7`, world `dc4647be0f55ebdb` — with CI run **31029634655** green at exactly
`c0c1fb4f`. Merged `--no-ff` as `e2ad9cfd`; branch deleted at origin.

---

## 3. STAGE A — the measuring window

### 3.1 The additivity proof

The extension had to be additive, so it was **proved rather than asserted**: `RUN_FRAMES` raised to
5600 with the original six sample points reproduced **`73ba53ba9fea12c7`** exactly. Frames 0–3300
therefore sample the same moments they always did, and every later hash movement is attributable
purely to the ten new points. No silent re-baseline.

The sample points were chosen against a **measured** phase map, not arithmetic — a new `--phases`
flag that runs this harness's own loop rather than a copy of it, because a sampler chosen against a
reconstruction of the run is exactly how the window came to miss the ending in the first place:

```
track            1st cross   PHOTO_FINISH   FINISH   FINISH_OVERVIEW   all home
luger-hill            3436           3330        —              3466       3754
dirt-oval             5215           5063        —              5218       5587
```

Two things fall out of that table immediately. The finish spans frames **3330–5587**, entirely past
the old 3400 stop. And **`FINISH` never appears on any track** — the drama pulse does not run in a
default race at all, which is the first half of B1's answer.

New points: `3450, 3580, 3650, 3900, 4300, 4520, 4750, 5100, 5300, 5450`. Fixed indices, never
events. They look arbitrary because a fixed index cannot mean "the crossing" on every track when the
finish arrives 1700 frames apart across the ten.

### 3.2 What is now covered, and what is not

Measured with a new `--coverage` flag rather than reasoned about:

| | tracks |
|---|---|
| the finish SHOT (PHOTO_FINISH) sampled | **9 / 10** |
| a frame mid ZOOM-OUT sampled | **9 / 10** |
| the RESTING frame sampled | **9 / 10** |
| nothing of the ending sampled | 1 / 10 — garden-path |

**Garden-path is not a gap in the window; its race never finishes** (`finishedCount` is 0 at frame
12000, past the driver's own 200 s ceiling). There is nothing there to sample. That is a race-length
oddity worth someone's attention and it is in the backlog, but it is not this instrument's fault.

**Still not covered, and unchanged by this block:** the rasteriser, the artwork, the sprite blit
(`drawImage` is never called in node), particles and surface trails. Those are the instrument's
pre-existing documented blind spots. What is new is that the **drama pulse** is now reachable in
principle but is *not sampled in practice*, because no default race takes that path — so the pulse
itself remains covered by tests only, not by this fingerprint.

### 3.3 Cost

| | frames | drawn/track | wall clock |
|---|---|---|---|
| before | 3400 | 6 | **27.9 s** |
| longer run only | 5600 | 6 | 70.7 s |
| after | 5600 | 16 | **77.3 s** |

**Almost all of the increase is the loop, not the drawing**: extending the run cost ~43 s and the ten
extra drawn frames only ~7 s. So if this ever needs to get cheaper, the answer is the frame loop —
the frames between samples exist only to advance the race — and not fewer sample points. Recorded in
the script header so the next person does not trim the wrong thing.

---

## 4. STAGE B — the pause

### 4.1 B1 — where the time actually goes

Per track, his settings, from the first crossing to the first frame of the zoom-out:

| track | path | TOTAL | (1) drama | (2) hold for the pair | (3) residual |
|---|---|---:|---:|---:|---:|
| City Circuit | photo-finish | 984 ms | 0 ms · 0% | 984 ms · 100% | 0 ms |
| Dirt Oval | photo-finish | 50 ms | 0 ms · 0% | 50 ms · 100% | 0 ms |
| Ice Track | photo-finish | 800 ms | 0 ms · 0% | 800 ms · 100% | 0 ms |
| Luger hill | photo-finish | 500 ms | 0 ms · 0% | 500 ms · 100% | 0 ms |
| Mountainstreet | photo-finish | 17 ms | 0 ms · 0% | 17 ms · 100% | 0 ms |
| River Run | photo-finish | 200 ms | 0 ms · 0% | 200 ms · 100% | 0 ms |
| Searound | photo-finish | 567 ms | 0 ms · 0% | 567 ms · 100% | 0 ms |
| Seatrack | photo-finish | 0 ms | 0 ms · 0% | 0 ms · 100% | 0 ms |
| Space Sprint | photo-finish | 317 ms | 0 ms · 0% | 317 ms · 100% | 0 ms |
| **mean (9)** | | **382 ms** | **0 ms · 0%** | **382 ms · 100%** | **0 ms** |

- **(1) the drama pulse: 0%.** It never runs. Every track takes the photo-finish path, on which the
  pulse did not exist. The brief's expectation was right.
- **(2) the shot holding: 100%.**
- **(3) `PHOTO_FINISH` missing from `ALL_STATES`: 0 ms.** The setting *is* unreachable — confirmed,
  `ALL_STATES` has five entries and both per-state maps are built from it — but it contributes
  nothing to this, because `decideFinishPhase` HOLDs for the whole shot regardless of any hold gate.
  Since it does not contribute, the "stop there" rule did not fire. The unreachable setting stays on
  the backlog from FINISH-SEAM-1 as his decision.

**A FOURTH CONTRIBUTOR THE BRIEF DID NOT LIST, and it reconciles the numbers.** The mean of 382 ms is
race time. In the browser, `photoFinishSlowmoFactor` (0.5) halves the physics rate for the whole
duration of the shot, so component (2) takes **twice as long in wall clock**. City-circuit's 984 ms
becomes ~1.97 s. That is his "one to two seconds", and it means the pause he was noticing was
**entirely the shot waiting, played at half speed** — no drama, no hold gate.

### 4.2 B2 — the pause now runs there, and what "home" means

`END_PHOTO_FINISH` used to hand straight to FINISH_OVERVIEW. Now, when the shot is over, the camera
**holds the same framing** for `finishDramaDurationMs` and only then begins the zoom-out. It is the
same dial as the ordinary finish — one pause, one knob, as instructed.

It is a pause and not a cut because the decision returns the state the camera is **already in**, so
the transition is a repeat: nothing re-enters, nothing re-frames.

**"The triggers are home" = the two racers the shot locked onto.** The brief warned these might
differ from `finishedCount >= 2`. They do, on every track:

| track | contenders at entry | 2nd finisher | both home @ | `fc>=2` @ | gap |
|---|---|---|---|---|---|
| city-circuit | 9, 32 | **8** | 4676 | 4662 | 14 frames |
| dirt-oval | 9, 32 | **0** | 5275 | 5218 | **57 frames** |
| ice-track | 32, 0 | 32 | 4438 | 4429 | 9 |
| luger-hill | 0, 8 | **9** | 3484 | 3466 | 18 |
| mountainstreet | 9, 8 | **32** | 3499 | 3485 | 14 |
| river-run | 9, 0 | 0 | 3523 | 3510 | 13 |
| searound | 0, 19 | 0 | 3755 | 3743 | 12 |
| seatrack | 8, 19 | 19 | 3505 | 3499 | 6 |
| space-sprint | 19, 0 | **8** | 3533 | 3512 | 21 |

**On 5 of 9 tracks the second racer across is neither contender.** So the old condition could — and
did — end the photo-finish shot *before the pair it exists to show had both crossed*. Using the
contenders is therefore both what he asked for and a repair. It is still "crossings only", just a
more precise crossing; everybody-home remains the safety net for a contender who never arrives.

**Existing properties survive.** The shot still ends on crossings. The winner text still fires: it
triggers while `hudState` is `PHOTO_FINISH` *or* on the frame it resolves away from it, and the pause
is exactly that frame. The slow motion releases at the pause start (it keys on `PHOTO_FINISH`), so
the pause and the zoom-out run at normal speed — which is what you want a held beat to do.

**Was the map enough?** Yes, and that is the verdict on the seam: this change is four lines of
decision in `finishPhase.js` plus one `switch` case at the call site. The precedence was already
written down, so adding a phase between the shot and the aftermath did not require re-deriving
anything. The one bug I introduced was in the new *contender* bookkeeping, not in the sequence — and
a director test caught it on the first run.

### 4.3 B3 — zero, and every place the bound lived

**Two sites, both in the Dev Screen**, and opening only one would have silently ignored his 0:

1. `min={100}` — the input's own attribute.
2. `if (v >= 100 && v <= 5000)` — the onChange guard.

**The resolution path was checked and is clean:** `cameraTimingComputation.js` uses
`config?.finishDramaDurationMs ?? 1500`, and `??` passes 0 through (a `||` would not have). No clamp
in `CameraDirector`. So exactly two sites, both now `0`.

**0 means zero frames, not one, on BOTH paths.** A naive implementation would set the expiry to `ts`
and still burn one frame entering and leaving a pulse — a visible hitch. Instead the decision skips
the pulse entirely when the duration is not positive: the photo-finish path hands off immediately,
and the ordinary path never enters `LEADER_ZOOM` for a pulse at all.

**The tooltip and the label were rewritten.** It said "Duration of the LEADER_ZOOM pulse at the first
finish crossing", which B2 makes untrue in both halves. It is now **"Finish pause (ms)"** and
describes both endings, the contenders condition, and what 0 does.

---

## 5. STAGE C — the target point: measured, not changed

Acceptance, measured per track: the settled camera **centre**'s distance from the point
`finishOverviewLookbackPx` before the line, and the largest amount by which any frame of the move
sits further back than the final position.

| lookback | settled error | forward drift during the move |
|---|---|---|
| **300 (shipped)** | **0, 0, 0, 4, 8, 26, 0, 0, 0 px** | **0 px on all nine** |
| 450 | 0, 0, **276**, 2, 17, 23, 0, 0, 0 px | 232 px on ice-track only |
| 600 | 86, 173, **508**, 0, … | up to 317 px |

**At the shipped value the requirement is already met**, on both halves: the camera ends where the
slider says (worst case 26 px, on river-run, which is the pre-existing residual FINISH-MOTION-1 also
recorded) and it never comes forward during the zoom-out.

**Beyond a track-dependent limit it cannot be met**, and the cause is `resolveCamera`'s world-bounds
clamp: at the wide OVERVIEW zoom the camera cannot centre that far behind the line without framing
world that does not exist, so it is held back — and the clamp then fights the glide, which is where
the forward drift comes from.

**No code change**, deliberately. Honouring 600 px means showing beyond the track edge, which is a
design decision about what the game looks like, and the brief's own stop rule reserves that for him.
What this block adds instead is the number, per track, so the decision can be made on evidence.

**The test drives 480 and 240 — never 300** — and asserts each against its own expected centre plus
an L203 pair proving the two land in *different* places. A test pinned to the default would pass on a
build that ignored the slider entirely, which is exactly the failure the 450/600 measurements above
would otherwise have hidden.

---

## 6. FINGERPRINTS

| commit | camera | render | world |
|---|---|---|---|
| `e2ad9cfd` (merge) | `ab731df15724ab5d` | `73ba53ba9fea12c7` | `dc4647be0f55ebdb` |
| `b9579f59` (stage A) | `ab731df15724ab5d` — unmoved | **`1da1a5b392879293`** — *a longer run, not a changed picture* | `dc4647be0f55ebdb` |
| `3b08937a` (stages B, C) | **`6480c2e0b2f612b5`** | **`b6591e74102152bd`** | `dc4647be0f55ebdb` — **unmoved** |

All re-measured after the pre-commit hook's format pass. Suite **3641 / 3641**.

**Tests, both positions throughout:** the contenders condition (two crossed but not the pair → holds;
the pair home → pauses); the pause on the photo-finish path; **zero means no pause on both paths**,
paired with 1/100/1500/5000 all taking it; a non-default duration reaching the director and building
the window; the non-default lookback pair. The director-level test walks the whole sequence
including a third racer crossing second — the case the old condition got wrong.

---

## 7. NOTICED, NOT FIXED

- **The drama pulse is now reachable by the window but never sampled**, because no default race takes
  that path. Covered by tests only.
- **`PHOTO_FINISH` is still absent from `ALL_STATES`**, so its `minStateHold`/`maxStateDuration` are
  unreachable. Measured at 0 ms contribution here; the decision of which home wins remains his.
- **Garden-path never finishes** — 9 of 10 tracks for any finish-phase measurement.
- **A bug of my own, caught by my own test and worth recording**: the first draft stored
  `ordered[0]?.index ?? null`, which turned an *unknown* index into "no contender to wait for" and so
  reported the pair home on the shot's first frame. Now the project's index+ref dual lookup, with an
  unresolvable contender counting as NOT home. The safe direction is the one where the safety net
  still catches you.

---

## 8. PROPOSALS

### P1 (brief's) — do the two finish knobs describe what they now do, and should the zoom-out also go lower?

**The pause knob: fixed in this block** — relabelled "Finish pause (ms)" with a tooltip covering both
endings, the contenders condition and what 0 does. **The zoom-out knob: still accurate**, since its
meaning did not change.

**Should the zoom-out accept a lower floor?** Its Dev Screen bound is 500–8000 ms. The argument that
won for the pause was "0 must be reachable so he can find his value by playing", and it applies
weakly here: 500 ms is already fast enough to read as "quick", and a zoom-out of 0 would be a **cut**,
not a fast move — a different thing, and the one thing FINISH-MOTION-1 was chartered to remove. So I
would **lower the floor to ~150 ms but not to 0**: it keeps the whole range explorable while keeping
the motion a motion. That is a one-line change I have not made, because it is a taste boundary and he
has just told me where his taste lies on the other knob.

The interaction worth stating in one sentence, since he will turn both: **the pause is dead time on a
held shot and the zoom-out is moving time, so raising the pause makes the ending feel longer while
raising the zoom-out makes it feel slower** — and at pause 0 the ending begins moving the instant the
contenders are home.

### P2 (brief's) — is another region equally unsampled?

**Yes, and the argument is not the same in both directions.**

The window now covers frames 0–5600 with sixteen points, but they are not evenly informative. The
**start** is well covered — frames 0 and 90 sit exactly on the gun and the tag-all window, which was
deliberate. The **first lap** is covered at 600 only, and between 90 and 600 there is a gap of 8.5
seconds that contains the entire post-start hold expiry and the camera's first free choice of shot.

But the argument that justified stage A does **not** transfer. The ending was unsampled *and* was
where a known class of defect lived — three false comments and a 2708 px jump, all in code no
instrument watched. I have no equivalent evidence for the early race: the start formation is the
frame he looks at first and is sampled, and defects there have historically been found by eye
immediately. **So I would not extend the window again without a reason of that kind** — the honest
trigger is "a defect was found in a region the fingerprint cannot see", which is what happened here
and has not happened there.

The cheap thing that *is* justified: `--coverage` now exists, so anyone can ask what the window
catches before assuming. That is the durable half of stage A.

### P3 (mine) — the contenders finding deserves a wider look than the finish

The photo-finish shot was ending on `finishedCount >= 2` — a *proxy* for "the pair I am watching are
done" that is wrong on 5 of 9 tracks. The shot had a lock (it knows who it is following) and then
judged its own end condition on a global counter instead of on the lock.

That pattern is worth grepping for, because the camera has other locks: `_battleLockedRacer`,
`_battleGroupRacerIndices`, `_comebackLockedRacer`. **Do any of them also end on a global condition
rather than on the thing they locked?** BATTLE's exits (`_isOriginalGroupStillValid`,
`_isBattleGroupP2Drifted`) do consult the stored group, which is the right shape — but I have not
checked COMEBACK, and the question is cheap to answer and expensive to keep not answering. One
measurement block, no behaviour change until it finds something.

### P4 (mine) — the acceptance limit in stage C should become a Dev Screen fact, not a report fact

The lookback slider goes to 1000 px. Measured, values above roughly 400 px silently stop being
honoured on some tracks — the camera simply comes to rest somewhere else, with no warning anywhere.
That is the same shape as the dead Photo Finish dials from FINISH-SEAM-1: **a control whose range
exceeds what the system can deliver, with nothing saying so.**

The honest fix is not to clamp the slider — the reachable maximum is per-track and per-zoom, so a
fixed clamp would be wrong too. It is to **say so where the value is set**: a tooltip line stating
that beyond ~400 px the camera may be held back by the world edge on tighter tracks. Better still,
the director already computes whether `resolveCamera` clamped (`wasClamped`), so the Dev HUD could
report "lookback clamped on this track" live. I would build that with the next Dev Screen block
rather than inside this one.

---

## 9. HANDOVER — the eye test

**Read the build pill first.** It must say **`build 3b08937a · feat/finish-window-1`**. The dev
server has been restarted for you and was serving exactly that. If it says anything else, or `build
unknown`, restart it — the pill has caught the wrong build twice in one day.

**Track: Dirt Oval, then City Circuit.** Dirt Oval has the longest gap between the pair crossing
(57 frames) so the new pause is most visible there; City Circuit had the longest hold (984 ms) so it
shows the *old* wait clearly for contrast. Keep `photoFinishCloseThresholdT` 0.15 and
`photoFinishLeadProgress` 0.85 so nearly every race ends this way.

**Three things to check, at the single moment the pair shot ends:**

1. **The pause now happens after a photo finish too** — the tight shot holds for a beat *after both
   contenders are across*, before anything moves.
2. **The camera ends where your slider says** — 300 px behind the line by default; try 200 or 400 and
   the resting point should follow. Above ~400 px it may stop following on some tracks; that is the
   world edge, and §5 has the numbers.
3. **It does not drift forward while zooming out** — one travel, one direction.

**The pause is now settable to 0**, in *Camera Advanced → Finish pause (ms)*. At 0 the zoom-out
starts the instant the contenders are home, with no held frame at all. Turn it up and down until it
feels right — that is why you asked for the range.
