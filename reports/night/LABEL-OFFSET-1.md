# LABEL-OFFSET-1 — the gap follows the racer, not the font

**Branch** `feat/label-offset-1` off `feat/race-numbers-1` (`3e6501b4`) · 2026-08-07 · **not merged,
not minted**

---

## 1. Conformity, element by element

| the spec asked                                                     | done | note                                                    |
| ------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| Branch off `feat/race-numbers-1`, FORMAT → MEASURE → COMMIT           | yes  | Worktree, §8.                                            |
| (a) gap derived from the racer's DRAWN size — half its height + margin | yes  | §2.                                                    |
| (a) bigger racer → bigger gap, smaller → smaller, on every track      | yes  | §4, measured on all ten.                                 |
| (a) no per-track or per-type constant                                | yes  | There is no per-track number at all; §2.                 |
| (b) the margin is a slider, default my judgement                     | yes  | `nameTagMarginPx`, 6 px. §3.                             |
| (c) nothing else moves — position, size, contents                    | held | Only the vertical offset changed. §6.                    |
| RENDER expected to move; baseline is the race-numbers value          | yes  | `121cf3e0fd82966d` → `a9653fbbe5eaebbe`. §4.             |
| Ask the repo: `engine-reach --check` on the diff, run what it says    | yes  | §5 — it said the world guard was owed, so it was run.    |
| `verify` does not select the render guard for harness-only changes   | n/a  | The harness was not changed at all. §7.                  |
| DO NOT mint, DO NOT merge                                            | held | Neither.                                                 |
| Tests: gap scales with drawn height · larger racer, larger gap        | yes  | §6, nine added.                                          |
| Report tests added and deleted                                       | yes  | §6 — 9 added, 1 assertion deleted on purpose, 2 modified. |
| Leave the branch pushed, one line on how to see it                   | yes  | §8.                                                      |
| Do not touch 5173                                                    | held | §8.                                                      |
| Planner proposal 1 (does a closer label change declutter drops?)      | **taken, measured** | §9.1 — neither gain nor cost, and why.        |
| Planner proposal 2 (is anything else font-tied that should not be?)   | **taken** | §9.2 — it was the only one, and here is the check. |

---

## 2. What the gap is now

```
offset = racerScreenH / 2  +  marginPx
```

`racerScreenH / 2` reaches the top of the racer, so the label's bottom edge lands exactly on it.
It is not a constant anywhere — it falls out of the drawn size, which is why it needs no per-track or
per-type number to be right on every track and at every zoom.

`marginPx` is the breathing space above that edge, and the owner's knob.

**Why the margin is not also derived from the racer.** It would then be `racerScreenH × k`, the two
terms would collapse into one factor, and the slider would stop being a gap and become a second size
multiplier. It is also the term that absorbs what the first cannot know: `racerScreenH` measures the
visible NARROW BODY, and sprite extremities — a giraffe's neck, a rocket's fin — reach past it.

**`drawnRacerScreenPx` now has a name.** `screenPx = displaySize × displayScale × frameEffZoom` was
only a sentence in `autoSpriteScale.js`'s header; anything that needed the drawn size had to re-type
the multiplication. It is evaluated **once**, in `renderRaceFrame`, and the same number goes to the
layout and to the renderer — so the boxes the decluttering reasons about cannot part company with the
boxes drawn. It takes the axis as an argument: this is a VERTICAL distance and a closed track's
world→screen scale is anisotropic, so it is given **`effZoomY`** and the gap is squashed exactly as
much as the sprite is.

---

## 3. The margin's default, and it is a judgement

**6 px.** Not measured — the spec said to default my judgement and let the owner tune by eye.

It is a screen-px value rather than a frame fraction, unlike `nameTagFrameFrac` beside it. The reason
is that it is a margin between two things already measured in screen px, and a third unit would need a
conversion that could drift. The honest cost: at a frame height far from 720 it does not scale, where
the font does. Range on the slider is 0–40.

**A stored `cameraConfig` does not shadow it.** `loadCameraConfig` iterates the keys of
`DEFAULT_CAMERA_CONFIG` rather than spreading the stored object, so a key that did not exist when the
config was last saved takes the default. Checked rather than assumed, because a stored config beating
`defaults.js` is a trap this project has been caught by before.

---

## 4. What the gap is for the smallest and the largest racer drawn

Measured across all ten tracks, 16 sampled frames, 40 racers.

| track | drawn racer height | gap was | gap now | visible space, was | visible space, now |
| --- | --- | --- | --- | --- | --- |
| city-circuit | 29.9 – 112.3 px | 31.7 | 21.0 – 62.1 | 16.7 → **−24.5** | 6.0 |
| dirt-oval | **27.4** – 99.7 px | 31.7 | **19.7** – 55.9 | **18.0** → −18.2 | 6.0 |
| garden-path | 30.1 – 82.1 px | 31.7 | 21.0 – 47.0 | 16.6 → −9.4 | 6.0 |
| ice-track | 32.1 – 120.3 px | 31.7 | 22.0 – 66.1 | 15.6 → −28.5 | 6.0 |
| luger-hill | 38.0 – 142.5 px | 31.7 | 25.0 – 77.3 | 12.7 → −39.6 | 6.0 |
| mountainstreet | 32.4 – 85.5 px | 31.7 | 22.2 – 48.8 | 15.5 → −11.1 | 6.0 |
| river-run | 45.6 – **160.0** px | 31.7 | 28.8 – **86.0** | 8.9 → **−48.3** | 6.0 |
| searound | 39.8 – 135.0 px | 31.7 | 25.9 – 73.5 | 11.8 → −35.8 | 6.0 |
| seatrack | 32.4 – 85.5 px | 31.7 | 22.2 – 48.8 | 15.5 → −11.1 | 6.0 |
| space-sprint | 32.4 – 85.5 px | 31.7 | 22.2 – 48.8 | 15.5 → −11.1 | 6.0 |

**Smallest racer drawn: 27.4 px** (dirt-oval) → gap **19.7 px**, was 31.7.
**Largest racer drawn: 160.0 px** (river-run, sitting exactly on the `maxTargetScreenPx` ceiling) →
gap **86.0 px**, was 31.7.

**THE MEASUREMENT FOUND A SECOND DEFECT, and it is the more serious one.** The old offset was 31.7 px
whatever the racer, so **any racer drawn taller than 63.4 px had the bottom of its label inside its
own sprite** — that is what the negative numbers in the "visible space, was" column are. Every one of
the ten tracks reaches 82–160 px at close zoom, so this was not an edge case: **at the tight end of
every track the labels were sitting on the racers.** Only the detached end got reported, because
detached looks wrong while overlapping just looks cluttered.

The last column is the point of the whole change: the visible space between sprite and label is now
**one constant everywhere**, and it is the number on the slider.

**One honest caveat about river-run, which is where he raised it.** At 40 racers its ducks are drawn
45.6 px at the widest, so the gap there tightens only 31.7 → 28.8 px — about 9%, which he may not
even see. The improvement he asked for lands hardest where racers are smallest (dirt-oval, 18.0 → 6.0
visible px, a threefold tightening) and where the camera is closest. If river-run at his field size
still reads as too far, **the slider is the answer and 0 px is a legitimate setting** — it puts the
label exactly on the racer's crown.

### The fingerprints

| | before | after | |
| --- | --- | --- | --- |
| **render** | `121cf3e0fd82966d` | `a9653fbbe5eaebbe` | MOVED, all ten — not minted |
| **world** | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | unchanged |
| **camera** | `00cafa2432add0f7` | — | guard not selected; nothing camera-side changed |

| track | before | after | ops |
| --- | --- | --- | --- |
| city-circuit | `7fea404e1ce01327` | `24667fee450aa658` | 102777 → 102777 |
| dirt-oval | `03a9c43afae73e57` | `e6ffc48ff1630ca1` | 107003 → 107003 |
| garden-path | `98d836be026cec84` | `f32f2439bf6908c8` | 92937 → 92937 |
| ice-track | `0f584791530b1084` | `1fced056eac49869` | 102453 → 102453 |
| luger-hill | `e498fff0de52fd61` | `c525b306832385c0` | 144770 → 144770 |
| mountainstreet | `6676f259b63f5fbf` | `c68df149c6fecbfb` | 196405 → 196405 |
| river-run | `87cf5310193cc57a` | `f78eb602df27c0d6` | 174457 → 174457 |
| searound | `e699e5bdf40d2c7c` | `c83ed0fb6d0293b6` | 95360 → 95360 |
| seatrack | `c9bd2af2a2cc5a6b` | `40ad9f4ccd5d4b72` | 164209 → 164209 |
| space-sprint | `05f5355f4325f3e7` | `c4c9195f5c3a13b4` | 227616 → 227616 |

**Every hash moved and not one op count changed, to the digit.** The same marks are made; they land
somewhere else. That is exactly the shape a pure repositioning should have, and it is the evidence for
§9.1.

---

## 5. What the repo said was owed

`engine-reach --check` on the actual nine-path diff: **2 of 9 paths CAN reach the race engine** —
`autoSpriteScale.js` and `storage/defaults.js`. So the world guard was owed, `verify` selected it, and
it **passed unchanged at `dc4647be0f55ebdb`**.

Both changes are additive — a new pure function nothing in the engine calls, and a new config key
nothing in the engine reads — but that is an argument, and the unchanged fingerprint is the proof.
The camera guard was correctly skipped; nothing camera-side was touched.

`verify`: **PASS 6, FAIL 0, SKIP 1.** Run twice — once before the measurement instrument went in and
once after it came out, so the instrument is proved to have left nothing behind (§7).

---

## 6. Tests

**Added — 9.** Both R7 questions at each group.

*On the helper (`labelBoxGeometry.test.js`), 5:* the gap scales with the drawn height and doubling the
racer doubles it · a larger racer gets a larger gap than a smaller one at the same margin, **and the
whole difference is the racer because the margin cancels** · the gap does not move when the font
changes, pinned by the signature so the old rule cannot come back without every call site following ·
the margin adds above the edge and only there · degenerate sizes (a sprite that has not loaded, a
frame before the scale is known) collapse to the margin instead of throwing or flinging the label off
screen.

*On the renderer (`racerRendering.test.js`), 3:* **the plumbing**, which is the failure the helper's
own tests cannot see — `labelOffsetAbove` could keep its contract while `drawRacers` quietly stopped
passing the size through, and every helper test would still pass. The recording context now captures
the y of each `fillText`, so the assertions are about where the label actually lands: it moves further
out for a bigger racer, by exactly half the size difference; it does **not** move when only the font
changes; and the margin reaches the drawn position.

*One more:* `labelOffsetAbove.length === 2` — it cannot take a font again without a signature change.

**Deleted — 1 assertion, deliberately, and said so in place.** `labelOffsetAbove(20) === 20 * 2.0`
pinned the exact contract the owner ordered changed. Its replacement is the suite above; the comment
where it stood says it is gone on purpose rather than lost.

**Modified — 2, and both were reporting on the wrong thing:**

- The DevScreen default test addressed its inputs by **position** (`inputs[1]`), so inserting a third
  field between the two existing ones failed it. A test that breaks because a neighbouring control was
  added is reporting on the order of the DOM, not on the defaults it is named after; it now addresses
  the new field by test id.
- That file's mocks keep **their own copy of the shipped defaults**, so the reset test passed while
  restoring nothing. The key was added there, and the reset cases now start from a non-default 20 px
  so the assertion has something real to prove (L58).

---

## 7. Decisions made alone

**The vertical axis uses `effZoomY`, not the `effZoomX` that `displayScale` was computed against.**
On a closed track the two genuinely differ and the sprite is squashed on Y. Using the X zoom would
have produced a gap that was wrong by exactly the squash — invisible on open tracks, subtly wrong on
closed ones, and very hard to attribute later.

**The formula got a name rather than a second copy.** Re-typing `displaySize × displayScale × zoom`
in `renderRaceFrame` would have worked today and been a second home for the drawn size.

**The measurement was an A/B inside ONE run, not two runs.** A temporary probe computed the layout
twice per frame — same racers, same positions, same text, same incumbents, only the offset rule
differing — with the old rule reproduced exactly by feeding a `racerScreenH` chosen so that
`h/2 + 0 = fontPx × 2.0`. Two separate runs would have compared two different sets of positions.
**The probe was removed and then proved neutral**: the fingerprint after removal is
`a9653fbbe5eaebbe`, the same value measured with it installed, and `verify` was re-run afterwards.

**The harness was not touched, and this time it did not need to be.** It hands `renderRaceFrame` the
whole `DEFAULT_CAMERA_CONFIG` object plus the real `displaySize`/`displaySizeScale`, so it picked the
new key and the new geometry up by construction. Worth naming as the contrast with HARNESS-NAMES-1
and RACE-NUMBERS-1, where the harness set individual fields by hand and silently missed the new one
both times: **a harness that forwards a whole object cannot fall behind; one that picks keys always
can.**

---

## 8. How to see it

```
git checkout feat/label-offset-1     # then reload localhost:5173
```

Built in a worktree at `C:/ra-wt-off`; **5173 was not touched** and is still on
`feat/race-numbers-1`.

**river-run first**, where you raised it — and note §4's caveat: at a wide shot the change there is
small, and the slider (DevScreen → Name Tag Visibility → *Gap above racer*) is the knob if it is still
too far. **Then luger-hill or searound at close zoom**, which is where the old rule had the label
sitting *inside* the sprite and where the new gap grows the most — that is the "confirm it has not
become too big" check you asked for.

---

## 9. The two planner proposals

**9.1 — Taken and measured: a closer label changes the declutter drops by NOTHING. Neither gain nor
cost.**

Labels placed and labels dropped are **identical on all ten tracks** — 0→0 on river-run, 10→10 on
luger-hill, 4→4 on garden-path — and the op counts are identical to the digit (§4).

The reason is structural rather than lucky, which is why I trust it beyond the ten tracks measured:
**every racer in a frame is drawn at the same size**, because a race has one racer type and one
`displayScale`. So the new offset translates every label box by the same amount, and label-vs-label
geometry is a pure translation. The decluttering never sees a difference.

It stops being true the day two racers in one frame are drawn at different sizes. The helper is
already per-racer and would do the right thing; the *decluttering* would then be comparing boxes at
genuinely different heights, and the drop count would move for the first time.

**9.2 — Taken: `labelOffsetAbove` was the only one, and the others are font-tied correctly.**

Every remaining font-derived number in the label describes the TEXT, which is what a font should set:

| number | tied to | verdict |
| --- | --- | --- |
| `labelBoxHeight = fontPx × 1.18` | the font | correct — it is the height of a line of text |
| `labelBoxWidth = textWidth + 8` | the measured text | correct, and the pad is deliberately fixed |
| crown glyph `fontPx × 1.27` | the font | correct — it is a glyph |
| `tagFontScreenPx` | frame fraction | correct — readability, and already resolution-safe |
| horizontal position | the racer's `sx` | already racer-tied; it is a position, not a size |
| `EDGE_MARGIN_FRAC`, `YIELD_OVERLAP_FRAC` | frame fraction / own box | correct |

A grep for `fontPx *` across the client returns exactly these plus one HUD row pad, which is text.
**So the defect was in one number, not several** — but it is worth saying why it was the one that
went wrong: it was the only font-derived number describing a relationship between the label and
something *outside* it. That is the shape to watch for, and the sprite-avoidance stage sketched in
`nameTagLayout`'s header will need the same drawn size when it is built.

---

## 10. What I did NOT do, and why

- **Did not change the label's horizontal position, size, or contents.** (c) says nothing else moves.
- **Did not make the margin a frame fraction.** §3 — and the caveat is stated rather than hidden.
- **Did not refactor `drawRacers`' 21 positional arguments**, which this block made two longer. It is
  a real smell and a real risk, and it is not this block's job; the two new parameters went at the end
  where they cannot renumber anything existing.
- **Did not touch the harness.** §7 — it did not need it.
- **Did not mint or merge.** Visible change; your eye decides (L191).
- **Did not touch 5173.** §8.
