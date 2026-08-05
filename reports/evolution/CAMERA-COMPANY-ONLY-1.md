# CAMERA-COMPANY-ONLY-1 — a switch, so your eye can decide

**Date:** 2026-08-05 · **Branch:** `exp/company-only`, off `anchor-truth` — never master, nothing pushed.
**Base confirmed:** `git rev-parse` → **`7fef0c92`**, clean.

---

## READ THIS FIRST

### What the switch does

Dev Screen → Camera Advanced → **"Let my number decide (company only)"**. It ships **OFF**, and OFF is
today's picture *exactly* — proven, not asserted (§2).

**ON stops the road width overruling your number** in the three single-subject shots (LEADER,
OVERVIEW, COMEBACK). Your setting and "min racers in frame" become the only limits. It builds nothing
new: that company guarantee already ran there and already read your 5 — on wide tracks it was simply
drowned out. BATTLE, LEAD_CHANGE and PHOTO_FINISH are untouched.

### What changed

**Your number starts meaning what it says.** With the switch ON, LEADER delivers a constant **300 px
on nine of the ten tracks** — including Mountainstreet, which is the one you complained about:

| | today (OFF) | with the switch ON |
|---|---|---|
| **Mountainstreet LEADER** | 300 → **688 px**, breath **2.294×** | **300 px flat, breath 1.000×** |
| seatrack | 300 → 686, 2.288× | 300 flat |
| river-run | 300 → 688, 2.293× | 300 flat |
| ice-track | 300 → 462, 1.540× | 300 flat |
| searound | 300 flat already | 300 flat |

**The breathing stops.** And because the window is the same 300 px everywhere, the sense of camera
speed stays the same on every track — the virtue you said you wanted to keep.

### What it costs

**The edge of the road leaves the frame more often.** On Mountainstreet: **45.9% of frames today →
70.0% with the switch ON.**

But read the first of those numbers again. **Even today, with the road-width rule doing its job, the
road edge is already out of frame 46% of the time on Mountainstreet.** The rule widens your shot
without actually achieving what it widens for — because the camera trails its own target, and no
zoom ceiling controls that.

**And the worst case is exactly the same either way.** On every single track, the worst moment is
identical with the switch ON and OFF. What changes is how often, not how bad.

### One thing I got wrong, and you should know before you look

I predicted that four narrow tracks would not change at all. **Three of them did** — dirt-oval,
city-circuit and garden-path all go from breathing to flat. Only searound was unchanged. My model of
when the road-width rule bites was wrong; §3 has the corrected version.

### About your "min racers in frame = 5"

**At 5 it never opens the shot** — it binds on essentially 0% of frames at 65 racers. It is not
doing anything for you today. If you want the camera to open when the field tears apart, **15** is
the value I would try: at 15 the median shot is still exactly your 300 px on every track, but the
camera opens on 5–49% of frames depending on the track. At 20 it starts overruling you again.
**I have not changed your value.**

---

## BUILD-VS-SPEC CONFORMITY

| Spec | Status |
|---|---|
| Base confirmed with `git rev-parse`, reported | **BUILT** — `7fef0c92` |
| Branch `exp/company-only`, never master | **BUILT** |
| §1 toggle, OFF = today's behaviour | **BUILT** |
| §1 HARD GATE: camera + render bit-identical OFF | **BUILT — PASSED**, §2 |
| §1 ON-state camera fingerprint minted separately as a probe | **BUILT** — `7a33faf2ec131437` |
| §1 Dev Portal label + tooltip in his words, config key, tests | **BUILT** — +12 tests |
| §1 pair states untouched | **BUILT**, and pinned by a test |
| §2 M1 | **BUILT — REFUTED**, §3 |
| §2 M2 | **BUILT — CONFIRMED**, §4 |
| §2 M3 the price | **BUILT**, §5 |
| §2 M4 minRacersVisible sweep | **BUILT**, §6 |
| §3 what he should look at | **BUILT**, §7 — mid-race flipping checked and found NOT possible, so the two-race version is given |
| §4 no unit change, no default change, no pair states, no tuning | **RESPECTED** |
| §5 stop rules | none fired; world unmoved |

---

## 1. WHAT WAS BUILT

One line of behaviour, in `_guaranteeCeiling`:

```js
if (this._companyOnlyFraming && kind === GUARANTEE.CORRIDOR) return Infinity;
```

Placed **after** the PAIR branch on purpose: a pair state that falls through to the corridor (only one
contender present) keeps it, because the pair states are deliberately outside this switch. A test
pins that the three corridor states are exactly LEADER / OVERVIEW / COMEBACK, so the tooltip's
sentence cannot quietly stop being true.

Config key `companyOnlyFraming`, default `false`, resolved through the standing rule — defaults below,
stored above, unknown ignored, no schema, no migration.

---

## 2. THE HARD GATE — checked, not argued

With the toggle **OFF**:

| | baseline | after | |
|---|---|---|---|
| camera | `1db71e7fffc1c9f6` | `1db71e7fffc1c9f6` | **bit-identical** |
| render | `b1c373da44de92f5` | `b1c373da44de92f5` | **bit-identical** |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unmoved** (mint tripwire fired — `defaults.js`) |

With the toggle **ON**, the camera fingerprint is **`7a33faf2ec131437`**. That is a **probe value, not
a baseline** — and the `--company-only` flag that produces it is off by default, so the ceremony and
every gate still run the untouched path.

---

## 3. M1 — REFUTED, AND THIS IS THE HEADLINE

The prediction: on searound, dirt-oval, city-circuit and garden-path, toggling changes **nothing**.

**Three of the four moved.** LEADER breath, his settings, n = 65:

| track | TW | OFF | ON | corridor bound, OFF |
|---|---|---|---|---|
| searound | 131 | 1.000× | 1.000× | **0.0%** — the only unchanged one |
| dirt-oval | 178 | 1.299× | **1.000×** | 11.5% |
| city-circuit | 197 | 1.438× | **1.000×** | 36.2% |
| garden-path | 198 | 1.444× | **1.000×** | 56.3% |

**Why the model was wrong.** It assumed "the corridor guarantee never binds on narrow tracks at his
settings". It binds on all three, up to 56% of frames on garden-path. The corrected rule is that the
corridor binds **whenever the road width approaches the room measured from the anchor's real
position** — and since CAMERA-ANCHOR-TRUTH-1 §4a that room is materially less than half the frame
chord, so even a 197 px road binds often. **The threshold sits between searound's 131 px and
dirt-oval's 178 px**, not at any intuitive notion of "narrow".

---

## 4. M2 — CONFIRMED, exactly as predicted

With the toggle ON, LEADER is flat at **300.0 px** on nine of ten tracks; luger-hill is 1.074×
(a 322 px maximum). Mountainstreet: **300.0 constant, breath 1.000×**, the same window as searound —
so the same sense of camera speed, which is the property he asked to keep.

OVERVIEW also settles: mountainstreet 1.143× → 1.040×, seatrack's binding rate 45.1% → 3.2%.

---

## 5. M3 — THE PRICE, with a surprise in it

Road-edge-out-of-frame, corridor states, his settings:

| track | TW | OFF | ON | worst case, OFF | worst case, ON |
|---|---|---|---|---|---|
| searound | 131 | 1.6% | **1.6%** | 83 px missing | **83 px** |
| dirt-oval | 178 | 4.7% | 8.5% | 105 px | **105 px** |
| city-circuit | 197 | 13.3% | 22.2% | 124 px | **124 px** |
| garden-path | 198 | 14.3% | 31.6% | 127 px | **127 px** |
| ice-track | 211 | 30.7% | 58.0% | 140 px | **140 px** |
| luger-hill | 250 | 24.5% | 56.7% | 187 px | **187 px** |
| river-run | 300 | 27.7% | 54.3% | 203 px | **203 px** |
| space-sprint | 300 | 13.4% | 39.6% | 251 px | **251 px** |
| seatrack | 300 | 34.0% | 63.9% | 253 px | **253 px** |
| mountainstreet | 300 | **45.9%** | **70.0%** | 236 px | **236 px** |

**Two things worth stopping on.**

**The worst case is identical on every track.** Not similar — identical. The worst moments come from
the tracking lag and the world-bounds clamp, which the corridor guarantee never controlled: the
guarantee sizes the *target* zoom, and the live camera trails it. So the switch cannot make the worst
frame worse, only more frequent.

**The control number is the argument.** Even with the switch OFF, the road edge is out of frame
**45.9%** of the time on Mountainstreet. **The thing he would be giving up is already only half
delivered.**

---

## 6. M4 — HIS REAL KNOB, now that it can be heard

Toggle ON. How often the company guarantee binds in LEADER, and how wide it opens:

| minRacersVisible | binds (range across tracks) | median shot | verdict |
|---|---|---|---|
| **5** (his) | **~0%** — only luger-hill 2.5% | 300 everywhere | **never opens** |
| 10 | 0–28% (dirt-oval 28.2%) | 300 everywhere | starts to bite |
| **15** | **5–49%** | **300 everywhere** | opens when the field spreads, median still his number |
| 20 | 4–54% | dirt-oval moves to **328.9** | starts overruling him again |

**Recommendation: 15**, and the reason is the median column. At 15 the *median* shot is still exactly
his 300 px on every track — his number still means what it says most of the time — while the camera
opens on a real fraction of frames when the field tears apart. At 20 the median leaves 300 on
dirt-oval, which is the guarantee overruling him again by a different door. **His value is unchanged.**

---

## 7. WHAT HE SHOULD LOOK AT — a few minutes

**MID-RACE FLIPPING IS NOT POSSIBLE, and I checked rather than assumed.** `RaceScreen` reads the
camera config once at mount — `useState(() => loadCameraConfig())`, with no setter — so a change made
in the Dev Screen does not reach a race that is already running. The director *does* support
live-apply (`updateConfig`), so this is a screen-level limitation, not a camera one, and it is on the
noticed-but-left list. **So it is the two-race version below.** Run each pair back to back on the
same track with the same seed; the only thing that differs is the toggle.

1. **searound, LEADER — nothing should change.** Two races, toggle OFF then ON. If the picture moves
   at all, the whole model in §3 is wrong and that is the most important thing to tell me.
2. **Mountainstreet, LEADER — the headline.** Two races. OFF: watch the shot open out as the road
   turns. ON: it should hold one size all the way round. **This is the breathing you complained
   about.**
3. **Mountainstreet, sharp curve, switch ON — the price, deliberately.** Watch the *outer* edge of
   the road. At the worst moment about 236 px of road width is off-screen — roughly four-fifths of
   the road. Look for it on purpose rather than meeting it later by accident. Then run the same race
   OFF and watch the same curve: **it still happens, just less often** — that is §5's point.
4. **garden-path, LEADER — the track that refuted me.** I said it would not change. It goes from
   1.444× breath to flat.
5. **Anywhere, OVERVIEW.** Should be near-identical either way except on seatrack, where the binding
   rate drops 45% → 3%.

---

## 8. PROPOSALS

### 8.1 On the spec's proposal 1 — the measurement supports it, with one correction

The expectation was that at n = 65 the ON state delivers his exact setting almost always, because
five companions sit on the leader's tail — and that if the shot then feels dead, the answer is
`minRacersVisible`, not the corridor coming back. **The measurement supports both halves.** At his 5
the company guarantee binds ~0%: it is not merely quiet, it is inert. The correction is that this is
not really about "five sitting on his tail" — **it is that 5 is far below the field's natural density
at n = 65**, which is why §6 sweeps it. At 15 it becomes a live control. So: if ON feels dead, the fix
is 15, and it is a knob he already owns.

### 8.2 On the spec's proposal 2 — the smallest honest middle ground, named but not built

M3 does **not** show the road edge leaving frame rarely — 70% of frames on Mountainstreet is not rare.
So the middle ground the spec anticipated is not warranted on frequency grounds. **But a different one
is, and it comes straight out of §5:** since the worst case is identical either way and is caused by
the *tracking lag*, the honest middle ground is not a weaker corridor guarantee at all — **it is
reducing the lag**, which is a `trackingTC` question and already half-addressed by
CAMERA-ANCHOR-TRUTH-1 §4c. **Not built, and deliberately not offered as a third arm**, because it
would dilute the A/B he is about to judge.

### 8.3 On the spec's proposal 3 — where the corridor guarantee should survive

It answers a real question — "do not crop the road" — that turned out not to be his. Where it should
survive:

- **COMEBACK**, arguably. A comebacker is *moving across* the field, so the road he is crossing is
  part of the story in a way it is not for a leader out front. The switch currently removes it there
  too, and that is worth a separate look rather than being bundled in.
- **Any future track wider than the 300 px reference.** Today no track exceeds it (NIGHT-1 §5: all
  ten are exactly their declared width, max 300). On a 400 px road, his 300 px setting would show
  three-quarters of the road at *best*, and the corridor guarantee is the only thing that would notice.
  **That is the condition under which it should come back automatically**, and it is cheap to state:
  the corridor guarantee is not needed while `trackWidthPx ≤ referenceCorridorPx`.

### 8.4 (mine) The race screen cannot see a config change, and that is worth one line to fix

Checking §7's premise turned up something small and annoying: `RaceScreen` reads the camera config
**once at mount**, so no Dev Screen change reaches a running race even though the director supports
live-apply. Every eye test on this project is therefore a two-race A/B when it could be one race with
a switch. **Not fixed here** — it is a screen change in a block about a camera guarantee, and it would
have moved the render fingerprint for an unrelated reason. But it is the cheapest single improvement
to how he evaluates anything.

### 8.5 (mine) The switch has revealed that the corridor guarantee was never delivering its promise

The finding I did not expect is §5's control column: **the road edge is already out of frame 46% of
the time on Mountainstreet with the guarantee fully active.** That is not an argument for the switch —
it is an argument that the guarantee's success has never been measured, only its effect on zoom.
**A guarantee should be judged by whether the thing it guarantees actually happens**, and this one
would have failed that test for months without anybody knowing. Whatever he decides about the switch,
that measurement belongs in the camera suite as a standing number.

---

## 9. STATUS

**Full suite green: 3562 passed / 3562, 175 files, vitest exit 0** (+7 on the branch). Guards green:
321 links, 98 reports, 63 tags. ESLint and Prettier clean.

Nothing pushed, nothing merged into `master` or `anchor-truth`. His stored values untouched, the
default untouched, the unit untouched, the pair states untouched. **The default is OFF and stays OFF
until he says otherwise.**
