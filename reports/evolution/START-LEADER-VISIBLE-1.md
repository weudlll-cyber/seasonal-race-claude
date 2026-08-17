# START-LEADER-VISIBLE-1 — B′ is built, and it does NOT pass

**Branch:** `feat/start-leader-visible-1` @ `ac885415`, off master `8d75b66b`. **NOT MERGED, NOT
MINTED** — as instructed, and independently because it does not meet its own acceptance test.

**Served on 4173 for his eye. Build pill: `ac885415 · feat/start-leader-visible-1`, no `+dirty`.**

## THE HEADLINE — READ THIS BEFORE LOOKING AT THE BUILD

**Two of the four acceptance numbers are met, one is met exactly, and one is missed badly.**

**dirt-oval and searound are fixed. CITY-CIRCUIT IS MUCH WORSE.** Where it had the leader off the
left edge for 46 frames at −93 px, it now has him off for **124 frames at −984 px**. **Do not judge
city-circuit as a candidate — judge it as the finding.**

**This is not a tuning matter and I have not tuned it.** It is a positive feedback loop, and it is
exactly the coupling START-SHAPE-1 said its offline pricing could not model.

---

## WHAT WAS BUILT

**One ceiling, `leaderVisible`, among the ceilings that already compose the zoom by `Math.min`.**
While the ceremony hold is live **and** the leader is already outside the frame being drawn, the shot
may not be tighter than the factor that brings him back to the border.

- **It may only widen.** It is on the widening side of the same `Math.min` as every other ceiling, so
  it cannot steer and cannot tighten (Lesson 192).
- **Infinity everywhere else** — inside the frame, and every frame after the hold releases. The
  run-in, the photo finish and the ceremony's own phases are untouched.
- **No new key, no fraction, no margin.** The bound is the frame edge and the leader's own position
  in it; at the ceiling returned he sits **on** the edge, which a test asserts to 6 decimal places.
- **The leader, not the widest racer.** The every-racer variant stays rejected and a test guards
  against it arriving by the back door.

**One defect found in my own first cut, and it is worth naming:** `guaranteed` is composed by an
explicit `Math.min(state, guarantee, company, field, line)` — **not** `Object.values(_ceilings)`. So
the new ceiling sat in the object, was **named by `binding`**, and was never applied. The probe
reported `leaderVisible` as the deciding term for frames in which it decided nothing. Caught by
tracing target-vs-delivered zoom rather than trusting the binding label.

---

## THE ACCEPTANCE NUMBERS — TWO MET, ONE MET, ONE MISSED

| #   | criterion                                       | result                                        |
| --- | ----------------------------------------------- | --------------------------------------------- |
| 1   | leader inside the frame on **all ten** tracks   | **MISSED** — see below                        |
| 2   | **zero** frames changed on **every open track** | **MET — 0 fired on all five**                 |
| 3   | ~196 of ~4800 frames changed overall            | **MISSED — 361 fired**, reported not accepted |
| 4   | the old defect's numbers stay put               | **MET — exactly**                             |

**Criterion 2, the one that proves the old defect cannot return:** the ceiling fired **0 times** on
luger-hill, mountainstreet, river-run, seatrack and space-sprint. Not "a small change" — the rule
never engaged, so those five tracks are byte-identical to master. **river-run and mountainstreet, the
two the August defect was diagnosed on, are untouched by construction.**

**Criterion 4:** river-run ALONG travel **6.4 world px** in the first second (against the 37.4 that
`c3f294d1` repaired), field centre y **0.486**, zoom flat at **1.1650**. Identical to master.

### Criterion 1 — the full picture

| track            | kind   | out-frames before → after | worst leader x  | overshoot  | fired |
| ---------------- | ------ | ------------------------- | --------------- | ---------- | ----- |
| dirt-oval        | closed | 89 → **9**                | 1519 → **1289** | **9 px**   | 61    |
| searound         | closed | 61 → **13**               | 1370 → **1286** | **6 px**   | 55    |
| garden-path      | closed | 0 → 0                     | 63              | —          | **0** |
| ice-track        | closed | 0 → 0                     | 1133            | —          | **0** |
| **city-circuit** | closed | 46 → **124**              | −93 → **−984**  | **984 px** | 245   |
| all five open    | open   | 0 → 0                     | unchanged       | —          | **0** |

**dirt-oval and searound are substantially repaired** — from 239 px and 90 px outside down to 9 px
and 6 px, for 9 and 13 frames rather than 89 and 61. Those residual pixels are the servo sitting on
its own boundary: the rule fires only when he is _already_ outside, so it drives him to the edge and
releases, one frame late. **With no margin permitted, a few pixels of overshoot is the shape of the
rule, not a bug in it** — but it is not "inside", and criterion 1 says inside.

### Why city-circuit runs away — the mechanism, traced

```
  ms   zoom  target  leaderVisible ceiling  leaderX
 100  7.204   4.976        6.066              236
 200  6.871   4.520        4.520               40
 300  6.438   3.395        3.395             -183
 400  5.932   2.574        2.574             -416
 600  4.885   1.614        1.614             -770
```

**Widening re-resolves the pan.** `resolveCamera` fits the pan target inside `innerFramePct` **at the
zoom**, and a wider frame is clamped harder against the world edge — the director's own comment says
so. On city-circuit the camera is therefore pushed away from the leader faster than the widening
brings him back, so the next frame demands more widening still. Zoom falls 4.92 → 1.56 in 600 ms and
the leader goes from 498 px to −792.

**The sign of the feedback is wrong on that track.** No value of anything fixes that; the rule needs
to be expressed against something the pan cannot move, or applied where the pan is resolved rather
than before it. **That is a design decision, not a tuning pass, and it is not mine to take here.**

---

## TESTS

**Six director tests, fixtures carrying real geometry** (`client/src/modules/camera/leaderVisible.test.js`)
— a real `CameraDirector`, so the real per-axis projection decides where a world point lands. Each
carries what breaks if it is deleted. Both cases the brief names are **sabotage-proven**:

| sabotage                            | result                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| fire even when the leader is inside | **3 red** — _"does NOT widen when the leader is inside: expected 8 to be Infinity"_ |
| never widen on x                    | **3 red** — _"WIDENS when the leader is outside: expected false to be true"_        |

**What is deliberately NOT asserted: that the leader ends up inside the picture.** He does on
dirt-oval and searound and does not on city-circuit. A test asserting an outcome the code does not
deliver would be red on purpose; the tests pin the **rule**, this report carries the **outcome**.

---

## FINGERPRINTS

**Established by walking each instrument's declared `reach` through `closureOf`, then measuring:**

| instrument | closure                            | contains `CameraDirector.js` | before             | after                                              |
| ---------- | ---------------------------------- | ---------------------------- | ------------------ | -------------------------------------------------- |
| WORLD      | 36                                 | **no**                       | `dc4647be0f55ebdb` | **`dc4647be0f55ebdb`** — measured in full, unmoved |
| WORLD-OFF  | 36 (same instrument, under a flag) | **no**                       | `854018ee5d3d83e1` | not re-run — see below                             |
| CAMERA     | 36                                 | **yes**                      | `d9f45a4aea0e5778` | **`8c8070dc14e47919`**                             |
| RENDER     | 55                                 | **yes**                      | `1274c7e8444238e3` | **`a75f6bab3846b697`**                             |

**CAMERA and RENDER moved, which is the point.** **MINTED NOTHING** — he judges the picture first.

**WORLD-OFF was not re-run**, and the reason is the record's own precedent: it is `fingerprint-default.mjs`
under a flag, so it has the same 36-file closure, which does not contain the one production file this
branch changes — and the ON arm was measured in full and is unmoved.

**The tracking-lag stamp was RE-MEASURED, not re-stamped**, because the usual argument was
unavailable here: CAMERA and RENDER both moved. All six rows come back digit for digit. The reason it
cannot move is structural and the measurement is what makes it evidence — that table is the
**tracking** phase, and this ceiling is inert outside the **entry** phase.

---

## THE RIDER — THE RULE THIS THREAD PAID FOR

`docs/SHIP-CEREMONY.md` now carries, beside the fingerprint rules: **a camera commit names the tracks
its numbers came from**, with `c3f294d1` as the one-sentence reason. **This commit's own message
applies it** — all ten tracks, named.

---

## WHAT HE SHOULD EXPECT TO SEE, AND WHERE TO LOOK

**Look at dirt-oval first — the difference is largest there** and it is the race he reported. Between
about **2.4 s and 3.9 s** the shot **opens up to about 1.14× and closes again**, and the leader stays
in the picture instead of leaving it by ~240 px. **searound is the same effect, smaller**
(2.1–3.1 s, ~1.05×).

**The difference is smallest — zero — on all five open tracks, and on garden-path and ice-track.**
Those seven are byte-identical to what he has been watching. **If anything looks different there, the
rule is misfiring and that is the report to bring back.**

**Do not judge city-circuit.** It is broken in this build, badly and visibly, and it is documented
above rather than hidden.

---

## SOURCE HYGIENE

| file                                              | change                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `client/src/modules/camera/CameraDirector.js`     | `_leaderVisibleCeiling` added; one entry in `_ceilings`; one term in the `Math.min` |
| `client/src/modules/camera/leaderVisible.test.js` | **new**, 6 tests                                                                    |
| `docs/SHIP-CEREMONY.md`                           | the rider, plus its generated engine-reach counts block regenerated by its own tool |
| `docs/CAMERA_DIRECTOR.md`                         | tracking-lag stamp re-measured and moved                                            |

Tests added: 6. Tests deleted: 0. **Tests re-blessed: 0.** `npm run verify` green (15 pass, 0 fail).

---

## PROPOSALS

### Proposal A — decide where the rule belongs before it is built again

The measurement says the rule is right and its **position** is wrong: applied to the zoom **before**
`resolveCamera`, it fights a pan that the zoom itself moves. **Two places would not have that
problem**, and choosing between them is his call, not a tuning pass:

1. **After the pan is resolved** — widen only once the frame is known, so the clamp cannot answer
   back. Costs a second resolve per frame in the ~4% of frames that fire.
2. **On the pan instead of the zoom** — hold the leader in frame by not letting the anchor run out of
   it, which is a steer and therefore needs his explicit consent, since guarantees in this camera
   never steer.

**The first is the smaller change and does not touch a rule the project has held since Lesson 192.**

### Proposal B — `guaranteed` should be composed from the ceilings object, not from a hand-written list

A new ceiling was named by the probe and applied by nothing, because `_ceilings` is built as an object
and then consumed as five hand-listed arguments. **The two can disagree silently, and did, on the
first run of this block** — the trace said `binding: leaderVisible` for frames where the delivered
zoom was the state's.

**`Math.min(...Object.values(_ceilings))` removes the class entirely**, is byte-identical today, and
is the same shape as the argmin loop directly beneath it that already iterates the object. It is a
one-line change with a fingerprint measurement behind it — **not done here** because this branch must
stay judgeable as one change.

### Proposal C — the residual overshoot is the missing decision, and it is one sentence

dirt-oval and searound end 6–9 px outside for a handful of frames because the rule fires only once the
leader is **already** out. Closing that needs either a margin (**a new number, which the brief
forbade and which I did not invent**) or firing on the frame he is _about_ to leave, which needs his
view on whether the shot may pre-empt.

**Worth deciding explicitly rather than inheriting**: at 9 px it is invisible, but it is the
difference between "the leader is in the picture" as a guarantee and as a tendency.
