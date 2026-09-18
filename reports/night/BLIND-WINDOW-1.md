# BLIND-WINDOW-1 — the two indifferent instruments, and it was never the cast

Branch `night/2026-09-19`, piece 2. Date: 2026-09-19.
**★ THE REAL TREE WAS NEVER INSTRUMENTED.** Every sabotage below was applied in a detached probe
worktree at master (`C:/tmp/renbase`); the real tree carries only the two repairs and supplied the
control arm. Nothing minted, nothing merged, no shipped default touched.

---

## ★★★ THE ONE LINE

> **Both instruments now go red when the thing they claim to watch is broken, and stay green when it
> is not — proven with PRODUCT-side sabotage, not with a flag of their own.**
>
> ★★ **And the diagnosis BLIND-SABOTAGE-1 handed over was the wrong one.** It read as "the cast does
> not reach them". Measured here: **the plan IS delivered, the roles ARE cast, and `COMEBACK_ZOOM`
> never fires on either fixture at all.** The delivery was never the blindness. **Each instrument
> had its own, and they are different.**

---

## 1 · FIRST, THE HANDOVER REPRODUCES

`C:/tmp/renbase`, master `fe12fa95`, unmodified instruments. Both produce output byte-identical to
the real tree, and then the sabotage BLIND-SABOTAGE-1 used — `makeCameraPlanDelivery` replaced by
`() => false`, the exact pre-fix behaviour:

| instrument | address | sabotaged vs clean |
|---|---|---|
| `scripts/check-ending-frame.mjs` | the delivery at **:281** | ★ **byte-identical — not caught** |
| `scripts/finish-band-truth.mjs` | the delivery at **:314** | ★ **byte-identical — not caught** |

**Reproduced exactly.** That is the starting point, and it is where the agreement with the previous
report ends.

---

## 2 · ★★★ WHY THE DELIVERY IS INERT — AND IT IS NOT WHAT WAS THOUGHT

A probe printed what the instrument actually holds at the moment it draws. On `finish-band-truth`,
on all ten tracks:

```
[diag] city-circuit  states: OVERVIEWx2, LEADER_ZOOMx4, BATTLE_ZOOMx4, LEAD_CHANGEx3,
                             PHOTO_FINISHx1, FINISHx1, FINISH_OVERVIEWx1
                     plan keys: ["b1Indices","heroes"]
                     roles: [[12,"sovereign-lead"],[1,"comebacker"],[5,"comebacker"],
                             [10,"attacker-b2"],[2,"attacker-b2"],[4,"attacker-b2"]]
                     delivered: 10783
```

★★ **The plan is delivered — at 10,783 ms, once, exactly as the product delivers it — and two racers
are cast as `comebacker`.** The fix works.

★★★ **`COMEBACK_ZOOM` is not in the state list. On any track.** No racer on this fixture ever
qualifies as a comeback CANDIDATE, so the shot the cast gates never happens, and whether the cast
arrived cannot change one number. **"Blind to the cast" was true and is the wrong description: the
instrument is blind to a shot that is not there.**

★ **A first hypothesis was tested and discarded, and it is recorded because it was wrong.** Both
files carried `isOutcomePhase: false`, which nails shut the window the comeback shot's gate reads
(`CameraDirector.js:883`), so the shot could only open from the internal threshold rather than from
the plan's OUTCOME phase. Wiring the product's own expression into both changed **nothing** on either
instrument. **It is still wired** — see §5 — but it is not the repair.

---

## 3 · ★★ `check-ending-frame.mjs` — IT CLAIMED A WINDOW AND READ ONE FRAME

**Its own `covers` line** said it watches *"the window the ending's hold, winner card and podium all
run in"*. **It rendered exactly one frame**, at the instant of the last crossing
(`scripts/check-ending-frame.mjs:315` before this change), with `st.phase` forced to `FINISHED` and
the camera holding whatever it held on the last racing frame.

★ **Everything the ending does happens after that frame.** `docs/ENDING-PHASES.md` phases 7, 8 and 9
— the hold on the finish picture, the winner card, the pause before the result screen — all run in
the **5,000 ms** after the last crossing, and none of them was ever drawn.

### What it had to read, and now does

The camera is driven **on** past the last crossing for `finishHoldAfterLastMs + finishPauseMs`, both
read from the camera config rather than typed in, and a frame is rendered every **250 ms** across it.
The window is the ending's own, so a moved slider moves the guard with it.

```
check-ending-frame: city-circuit, 20 FINISHED frame(s) across a 5000 ms ending window
(hold 1500 + pause 3500, sampled every 250 ms), 172 fillRect call(s) recorded.
check-ending-frame: nothing covers the race picture during the ending. PASS
```

**Cost: 0.5 s → 0.7 s.** One frame became twenty.

### ★★★ THE PROOF, WITH A PRODUCT-SIDE SABOTAGE

Not the guard's own flag — a real scrim, in `renderRaceFrame.js`, that comes up from the **second**
FINISHED frame onward. That is a defect the product could genuinely have: a cover-up that misses the
first frame of the ending and holds for the rest of it.

| arm | verdict |
|---|---|
| ★ **OLD guard (one frame)** + late scrim | ★★ **PASS — exit 0. Completely blind.** |
| ★ **NEW guard (the window)** + the SAME scrim | ★★ **FAIL — exit 1**, naming it at 250, 500, 750, 1000 ms … |
| **NEW guard**, scrim removed | ★ **PASS — exit 0** |

★ **Both directions, and the middle row is the whole piece**: the same product defect, the same
tree, two guards, opposite verdicts.

### It also keeps two sabotages of its own, and they are documented

- `--sabotage` — the retired splash on **every** frame. Red before this change and after.
- `--sabotage-late` — the splash from the **second** frame on. ★ **Green before this change, red
  after.**

Both print the guard's standing refusal to pass under sabotage. And a **loud-failure** rule was added
that it did not have: if the ending's durations ever go to zero, `framesChecked === 0` **fails**
rather than printing a confident green about no frames at all.

---

## 4 · ★★ `finish-band-truth.mjs` — IT CLAIMED HIS SHOTS AND PINNED A CAMERA THE PRODUCT CANNOT PRODUCE

**Its own header** says the three shots are the ones *"he actually watches"*, and that they are
*"MEASURED, NOT ASSUMED"*. They were measured — off a camera nobody has ever been shown.
`scripts/finish-band-truth.mjs:77` carried `const CAM_SEED = 1439767152`.

★ **The browser derives the camera's seed from the race seed** (`cameraSeedForRace`,
`client/src/modules/camera/cameraSeed.js:72`) — the owner's decision of 2026-08-23, already the
default in `scripts/lib/raceDriver.mjs`. A pinned constant is a camera the product has no way to
produce.

### What it had to read, and now does

`CAM_SEED = cameraSeedForRace(SEED)`. **Measured consequence: the camera's state sequence changes on
most tracks, and the published table moves on two of the ten.**

| track | shot | before | ★ after |
|---|---|---|---|
| `luger-hill` | tightest endgame, band depth | 2.43 px / 606.8 px² | **2.42 / 606.2** |
| `space-sprint` | mid-race, band depth | 3.14 px / 940.7 px² | **3.20 / 960.0** |

**The other eight tracks do not move.** That is stated plainly rather than buried: this repair is
real and it is small.

### ★★ THE PROOF, WITH A PRODUCT-SIDE SABOTAGE

`CAMERA_SEED_SALT` in `cameraSeed.js` changed — the derivation the browser uses is broken, so every
seeded race gets a camera the product would not give it.

| arm | verdict |
|---|---|
| ★ **OLD instrument (pinned seed)** + broken derivation | ★★ **byte-identical — completely blind** |
| ★ **NEW instrument (derived seed)** + the SAME break | ★★ **DIFFERS — caught**, on `luger-hill` and `space-sprint` |
| **NEW instrument**, derivation restored | ★ **back to the committed table** |

★ **HOW STRONGLY IT DISCRIMINATES, honestly: two tracks of ten.** A break in the product's camera
seed moves two rows of this table and leaves eight standing. **It is no longer indifferent — but it
is a weak detector, and a green here is still not a clearance for the other eight.** That is a
finding, not a claim of success.

---

## 5 · WHAT WAS WIRED ANYWAY, AND WHAT WAS DELIBERATELY NOT TOUCHED

**Wired, and measured inert:** `isOutcomePhase` in both files now reads the product's own expression
— `racePlanController.getPhase(physicsTs, raceProgress) === 'OUTCOME'`, the same call
`RaceScreen/index.jsx:1533` makes and `scripts/lib/raceDriver.mjs` already adopted. It moves nothing
on either fixture (§2). It is in anyway: *"it happens not to matter today"* is not a reason to keep a
value nobody chose, and the next change to the comeback gate would have found these two blind again.

★★ **NOT TOUCHED — `scripts/render-fingerprint.mjs:584` carries the same `isOutcomePhase: false`
literal.** `docs/fingerprints.json` records, in the camera role's own `lastVerified`, that fixing it
was measured both ways and **would move the minted render value** `74946ddbeca517a9 →
40b2de6fcc5bafd8`. **That is a second mint and the owner's decision**, and it was deliberately not
taken then. It is not taken here either.

---

## 6 · THE STOP CONDITION

★ **All four fingerprints were measured before this piece and after it, by each role's own
`reproduce` command.** Both instruments are read-only measurement scripts that no fingerprint
instrument imports, so nothing could have moved — and it was run rather than argued.

| role | record | before | ★ after |
|---|---|---|---|
| world | `b6cfd1daf1756f61` | `b6cfd1daf1756f61` | ★ **unmoved** |
| world-off | `744bec11644978bb` | `744bec11644978bb` | ★ **unmoved** |
| camera | `5d91f59b9ada16cc` | `5d91f59b9ada16cc` | ★ **unmoved** |
| render | `06671c1d13850cd7` | `06671c1d13850cd7` | ★ **unmoved** |

`node --test scripts/verify.test.mjs` — **53 pass, 0 fail**, including the routing and
guard-declaration tests that read `GUARD.covers` and `GUARD.blind`.

---

## WHAT THIS DOES NOT SETTLE

- ★ **`finish-band-truth` still races N = 20 where the owner races 40**, and the sprite scale follows
  the field size. **Named in the file and NOT changed**: raising it changes what every number in that
  table means, which is a decision about the fixture rather than a repair to a blind instrument.
- ★ **`check-ending-frame` still runs ONE track** (`city-circuit`) and samples every 250 ms, so a
  cover-up shorter than a quarter second is invisible. **Both are now written into its `GUARD.blind`**
  so the hole is declared rather than discovered.
- **Neither instrument sees a `COMEBACK_ZOOM` shot on its own fixture.** If that shot is ever the
  thing somebody wants watched, a fixture that produces one is the first requirement — and this
  report is the measurement that says today's does not.
- The **third** instrument of the trio, `exp-anchor-truth-ab.mjs`, was already demonstrably sighted
  and is untouched.
