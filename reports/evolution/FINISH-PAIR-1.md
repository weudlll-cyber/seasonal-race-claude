# FINISH-PAIR-1 — the photo finish frames the pair it is actually following

**2026-08-11.** Owner report, on a production build of `feat/ending-hold` (7ea7f1b4), Searound ·
Quick Test · 20 racers · seed 2814 · 2 laps: near the finish line the camera jumps the WRONG way —
further in the direction of travel — then back, then forward again, then back. Then, after only a
very short zoom-out, the result screen arrives. _"Da ist jetzt wirklich was kaputt."_

**Verdict after the fix, his words on production:** _"wir springen nicht mehr wild herum mit der
Kamera, das ist gut."_

---

## 1. What was wrong

The photo-finish shot follows a FIXED pair: `_photoFinishContenders`, captured once at entry, index
and reference. The FRAMING guaranteed a LIVE one: `_framingSubjects`' `PHOTO_FINISH` case returned
`[focusRacers[0], focusRacers[1]]`, and `_focusRacers` sorts the WHOLE field by `t` every frame with
no `finished` filter.

Those two disagree almost immediately, and the disagreement is not small. On the owner's race the
shot captured **Bolt + Flare** at entry and never changed; the framing pair went

```
Bolt+Flare → Flare+Bolt → Flare+Blitz → Flare+Nova → Nova+Flare → Nova+Blitz → Nova+Apex
```

**Nova won the race and was never a contender of the shot at all.**

**Why the second slot churns after the line.** A finished racer does not stop.
`raceCore.stepRacePhysics` takes an explicit else-branch for it — `runoutDecay *= 0.97;
t += baseSpeed * runoutDecay` — so it coasts. A racer who finished LATER carries a fresher decay
than one who finished earlier, so it coasts faster and overtakes. The live second-by-`t` slot
therefore walks BACKWARDS through the finishing order: #2 → #3 → #6 on this race.

**Why that moved the picture.** Each swap changed the pair distance discontinuously — 90.4 → 21.8 →
93.9 px in single frames — which moved `_guaranteeCeiling` (13.15 → 45.8), which flipped the binding
zoom authority between the guarantee and the state zoom, which lurched the frame.

## 2. The measurement

The metric: a fixed world landmark (the finish line) projected to canvas pixels every frame through
the same numbers the renderer consumes, split wherever the motion REVERSES. **Two runs is a healthy
ending** — carry forward across the line, then pull back to the lookback point.

Two things are REQUIRED to see the defect at all, and both are why the existing instruments were
blind to it:

- **The roster.** A racer's name is an engine input (`stablePairBit`). `createRaceFromIdentity`
  assigns no names, so every harness on `scripts/lib/raceDriver.mjs` — and `camera-fingerprint.mjs`
  — runs the index-string race. Nameless, seed 2814 is a DIFFERENT RACE and the defect does not
  appear.
- **Slow motion.** RaceScreen halves the physics clock during the shot while the camera keeps
  wall-clock. At full speed the defect does not reproduce either: the shot is over before the
  framing can chase each swap.

Both are now opt-in on the shared driver, default OFF, so no existing harness moved.

### Reversals of the picture (>= 60 screen px), 20 racers, seed 2814

| track          | open   | before | after |
| -------------- | ------ | ------ | ----- |
| searound       | closed | **5**  | **2** |
| mountainstreet | open   | **4**  | **2** |
| river-run      | open   | **4**  | **2** |
| city-circuit   | closed | 2      | 2     |
| dirt-oval      | closed | 2      | 2     |
| ice-track      | closed | 2      | 2     |
| luger-hill     | open   | 2      | 2     |
| seatrack       | open   | 2      | 2     |
| space-sprint   | open   | 2      | 2     |
| garden-path    | closed | 2      | 2     |

`garden-path` is NOT covered by `scripts/finish-pair-truth.mjs` — its race is longer than the shared
driver's 200 s ceiling, so it has no finish to measure there and the script says so rather than
counting it clean. It was measured separately on a longer-ceiling bench and is 2 either way.

**It is not an open/closed axis**, which is worth recording because that was the first hypothesis:
`_finishLookbackT`'s clamp-vs-wrap branch is reached only in FINISH_OVERVIEW, downstream of every
turning point, and two of the three affected tracks are open.

### The worst single excursion, before

`f4737 → f4743`, **1066 screen px in SIX frames**, while the pair went `Nova+Flare` (90.4 px apart)
→ `Nova+Blitz` (21.8 px) — both already finished.

## 3. Why pinning, and not hysteresis

Hysteresis was measured first, because it is the option that keeps the pair honest for a real
overtake. It lost, and the way it lost is the interesting part.

| window (frames) | 6   | 12  | 20  | 30  | 45  | 60  | 90  | 120 | 150 | 180 | 240   |
| --------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ----- |
| searound        | 6   | 6   | 6   | 6   | 6   | 4   | 4   | 4   | 2   | 2   | **2** |
| mountainstreet  | 4   | 4   | 4   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | **2** |
| river-run       | 4   | 4   | 2   | 2   | 2   | 2   | 2   | 2   | 4   | 4   | **2** |

At short windows searound gets **worse than the defect** (6 against 5): delaying a discontinuity does
not remove it, it concentrates several small ones into fewer larger ones. Hysteresis only matches
pinning at **240 frames — 4 seconds — which is longer than the shot itself**, i.e. a hold that can
never expire inside the shot. That is this fix with a knob whose only safe value is "longer than the
shot", so the knob is not worth its own failure mode.

## 4. The cost that was expected, measured, and inverted

The fear was that pinning drops a non-contender who is genuinely in shot — on this race that
non-contender is Nova, the WINNER. Measured the other way round: fraction of the shot's frames each
subject is inside the 1280x720 frame.

| track          | winner, before | winner, after | shot's own contenders, before |
| -------------- | -------------- | ------------- | ----------------------------- |
| searound       | 88.9 %         | **100 %**     | 93.0 % / 90.5 %               |
| mountainstreet | 90.8 %         | **100 %**     | 90.8 % / 89.6 %               |
| river-run      | 87.2 %         | **100 %**     | **2.3 % / 7.4 %**             |

On River Run the live pair had lost its OWN contenders off-frame for 93–98 % of the shot. A guarantee
that keeps changing its mind protects nobody, including the winner.

## 5. The second complaint, closed by the same change

_"Only a very short zoom-out."_ The zoom-out was never short — 2950 ms on searound, the same as every
other track. What was missing was a settled picture before it: the last lurch ended 316 ms before the
pull-back began. After the fix searound's ending is **two motions and nothing else** — one continuous
3550 ms carry across the line at constant zoom, flowing directly into a 2950 ms pull-back. There is
no lurch left to settle from, so the gap does not improve, it ceases to exist.

## 6. What shipped

One key in its one home, `photoFinishContenderFraming`, defaulting to **true**. Unusually here, THE
DEFAULT IS THE FIX: the owner asked for a defect to be fixed, not for a taste to be offered. The key
exists so the old behaviour can be restored, not so the fix has to be switched on.

- `CameraDirector._photoFinishFramingPair` resolves the captured contenders live by index each frame
  — **WHO** is pinned, **WHERE** they are is not — and falls back to the live top two whenever the
  pinned pair cannot be produced.
- Five tests in both positions, including one that proves a REAL overtake between the contenders
  still moves the anchor, the heading and the separation.
- `scripts/finish-pair-truth.mjs` reports both positions on every track.
- `scripts/lib/raceDriver.mjs` gains an opt-in roster and opt-in slow motion, both default OFF.

**Tracking lag re-measured rather than re-stamped** (`docs/CAMERA_DIRECTOR.md`): PHOTO_FINISH median
6.37 → 5.68 pp, p95 20.73 → **16.51** pp on identical frames; every other state unchanged in frames,
median and p95 alike. The tail is where a lurch shows up.

**Fingerprints.** CAMERA `afd7461071cf2eec` → `64432e18a7e62188`, RENDER `c11a7e87d9a9126c` →
`c0fd1e8eda539867`, WORLD `dc4647be0f55ebdb` **unchanged**. Both moves were attributed rather than
assumed: master (330842c6) was re-measured in the same session and reproduced both predecessor values
exactly. Values live in [fingerprints.json](../../docs/fingerprints.json).

## 7. Noticed, and deliberately left

- **The shared driver's 200 s ceiling** hides garden-path's finish from every harness built on it.
  Widening it would change what other harnesses measure, so it is stated instead.
- **`camera-fingerprint.mjs` and `finish-motion-truth.mjs` run a nameless field and no slow motion.**
  They are self-consistent and therefore valid as change detectors, but they cannot see a defect that
  needs either. Not changed here: moving them would move a gate in the same commit it is meant to
  validate.
- **Several TAGS.md entries are dated 2026-08-13 while their commits are 2026-08-11.** A pre-existing
  documentation drift, noticed while registering this ship and not corrected in it.
