# MINT-RENDER-1 — the render fingerprint is re-minted, and what it does not cover is written beside it

**2026-09-05.** Branch `fix/invisible-four-1`, caught up with master `cbb11156` at `01ea234c`.
**The owner ordered this mint.** One role moves. No drawing code, default or threshold changed.

A new report rather than an appendix: [INVISIBLE-FOUR-1](INVISIBLE-FOUR-1.md) is already merged, and
reports are append-only.

---

## THE MINT

| role | recorded before | now | |
| --- | --- | --- | --- |
| **render** | `733b3f100d6a819f` | **`74946ddbeca517a9`** | ★ **MINTED** |
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | unmoved, self-checked |
| world-off | `aa09ed97a3a32689` | `aa09ed97a3a32689` | unmoved, self-checked |
| camera | `152cf295c4c9ff54` | `152cf295c4c9ff54` | unmoved |

### Re-verified before anything was written

The brief required the value to be re-measured rather than carried from the previous piece, and it
was — on the **caught-up branch tip `01ea234c`**, whose tree is the tree master takes, *before* the
record was touched:

```
node scripts/render-fingerprint.mjs --quiet   ->   74946ddbeca517a9
```

It reproduced the decided value exactly. **The other three were re-measured in the same pass**, the
two world roles confirming against the record with their own `--check`:

```
check: WORLD matches the record for role "world" (8a1977187e9c99b4).
check: WORLD matches the record for role "world-off" (aa09ed97a3a32689).
camera-fingerprint --quiet -> 152cf295c4c9ff54
```

And after the record was written, the instrument agrees with it:

```
check: RENDER matches the record for role "render" (74946ddbeca517a9).
```

`check-fingerprints`: **4 roles, 1110 tracked files scanned, 0 stray copies.**

---

## THE THREE THINGS RECORDED WITH IT

All three are written into `docs/fingerprints.json` — where the value lives — and the second is
written a second time into the instrument's own header and its machine-read `blind` list, because a
reader meets the instrument before they meet the recorder.

### 1 · WHY IT MOVED — the old value describes a picture the game does not draw

`render-fingerprint.mjs` built the frame's `camera` as a hand-written literal with three members,
while `client/src/screens/RaceScreen/frameCameraInputs.js` declares five fields plus a method. Two of
the three absent fields are read by the very draw path the instrument measures. **Both verified at
source before being written:**

```
renderRaceFrame.js:212   let focusRacerIndex = camera?.anchorRacerIndex ?? null;
renderRaceFrame.js:220   const namesFromArrival = !!camera?.runInArrived;
```

So the old hash was taken over frames drawn with **the leader fallback** and with **labels showing
numbers**, while the game draws the anchored subject and **names**.

★ **Every render-hash comparison older than this mint describes that picture and is not comparable
across it.** That sentence is in the record, in the superseded note, and here.

**Which field moved it: exactly one.** Bisected in INVISIBLE-FOUR-1 against a control that reproduced
the old value — `+state` unmoved, `+anchorRacerIndex` unmoved, **`+runInArrived` the whole move**,
identical to all three together. `runInArrived` decides whether a label draws a name or a number, so
it changes `fillText` arguments and therefore the call stream that *is* this hash.

### 2 · ★ THE LIMIT THAT REMAINS — and it is not narrowed by this mint

**Text measurement is synthetic.** `client/src/modules/parity/recordingContext.js:26-31`, verified at
source: `measureText` must return something, the name-tag layout consumes its width to decide which
labels are drawn, and a real browser's width depends on the installed font — so the recorder returns
a deterministic synthetic width.

**In the terms that matter:**

- **CAUGHT** — a change to the tag-layout **rule**. Same widths in, same labels out.
- **NOT CAUGHT** — a change in **font metrics**, and **the real name-versus-number count the owner
  sees on screen**: how many labels a real browser falls back to numbers on for want of space.

That is what the browser gate and his eye are for. **This mint does not close that gap.** All it does
is stop the harness from being wrong about which labels it asked for in the first place.

### 3 · OBSERVED AND UNEXPLAINED

`anchorRacerIndex` **is** read by live drawing code, at `renderRaceFrame.js:212`, and adding it alone
moved the hash by **nothing**. The sampled frames are evidently insensitive to it.

**Recorded as an observation and nothing more.** It is not investigated here, no mechanism is
offered, and it is **not** called harmless.

---

## CHECKS

- **`npm run verify`** — `PASS 12  FAIL 0  SKIP 17`. ★ **`render-fingerprint` was among the twelve**,
  selected by its own routing and passing against the newly written record:
  `render-fingerprint  RENDER 74946ddbeca517a9`. The script suite ran too, at 127.3 s.
- **The client suite** — **241 files, 4,476 tests, 0 failures**, 321.58 s.
- **`node scripts/engine-reach.mjs --check`** on the branch's five paths, verbatim:

```
ENGINE REACH: none of 5 path(s) carry a change that can reach the race engine.
  5 outside the hull (cannot reach the engine at all): docs/fingerprints.json, reports/evolution/INDEX.md, reports/evolution/MINT-RENDER-1.md, scripts/render-fingerprint.mjs, scripts/render-fingerprint.test.mjs
```

It selects nothing — **and it could not have spoken to this mint either way**: it answers the WORLD
question, and the role that moved is RENDER. The world roles' own `--check` runs are what settle
that, and both passed.

No sweep and no browser gate were run, per the brief.

## SOURCE HYGIENE

| file | before | after | what moved |
| --- | --- | --- | --- |
| `docs/fingerprints.json` | 96 | 96 | the render role re-minted: new `value`, `date`, `mintedOn`, `mintedBy`, `lastVerified`; the previous mint preserved whole in `supersededMintedBy` / `supersededDate` / `supersededOn` / `supersededNote`. **Line count unchanged, 36,100 -> 35,860 bytes** — the fields are long single lines, so lines are the wrong unit here and bytes are given instead |
| `scripts/render-fingerprint.mjs` | 786 | 796 | blind item 5 in the header; one entry in the machine-read `blind` list. *(786 is the branch's count after piece 1; master's is 765, and the difference is piece 1's own repair, unchanged here)* |
| `scripts/render-fingerprint.test.mjs` | 167 | 152 | **untouched by this piece** — piece 1's rewritten guard, listed so the merge's whole diff is accounted for |
| `reports/evolution/MINT-RENDER-1.md` | 0 | 146 | this report |
| `reports/evolution/INDEX.md` | — | — | one entry |

**Piece 1's own change is unchanged from INVISIBLE-FOUR-1 and was not extended:** the instrument
still builds its camera with the single line `camera: frameCameraInputs(cd)`, importing the field
list rather than retyping it, with the dynamic import declared in the guard's `reach`.

**Noticed and deliberately left:**

- **`mintedOn` is PROVISIONAL** — it carries the branch tip `01ea234c`, because the merge SHA does
  not exist until the merge does. Corrected on master in a follow-up commit, which is the pattern
  SHIP-CEREMONY step 11 exists for.
- **`docs/SHIP-CEREMONY.md:157` describes what the render role covers** and states no value, so the
  one-canonical-home rule leaves it correct and it was not touched.
- **The `[warmup] … Image is not defined` lines** the instrument prints are the documented
  no-`Image` path in node — blind spot 3 in its own header — not a fault of this run.
