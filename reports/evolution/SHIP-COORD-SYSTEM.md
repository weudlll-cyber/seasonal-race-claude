# SHIP-COORD-SYSTEM — one ruler for the wrapper, and NOTHING was minted

**Merged from `feat/coord-system` @ `d1a8f376`.** The owner judged it on a production build on
2026-08-14 and accepted it.

**No fingerprint moved, so nothing was minted.** That is the whole measurement result and it is not a
shortcut — it was run, not argued, and it exposes a real blind spot recorded in §4.

---

## 1. What shipped

Anything absolutely positioned inside `.race-canvas-wrapper` is anchored in **percentages**, not
pixels. `WinnerCard` and the opening card already followed that rule; `BrandLogoOverlay` and
`StateOverlay` came under it here. Diagnostics HUDs stay the exception — their offsets are measured
against the browser window and never sit on the picture.

The percentages are written `calc(N / D * 100%)` rather than as rounded numbers, so no drift creeps
in between the test's arithmetic and the browser's.

`overlayGeometry.js` (147 lines) turns the anchors into CSS boxes at any wrapper size, so a test can
ask two questions the eye missed: **did anything move at any size**, and **does anything overlap the
minimap or a sibling on the finish frame.**

**The visible change**, which is what the owner judged: at scale 1.0 the boxes are pixel-identical to
the old fixed anchors; at his 1037×583 the corner clearance is **12.96 CSS px instead of 16**, about
3 CSS px inward, and the state pill drops the same amount.

## 2. THE MEASUREMENT — everything re-run on the final tree

**Master was merged into the branch first** (`d1a8f376`), because it was **82 commits behind**, having
forked at `5e738dfe` on 2026-08-12 — before the finish band, the contender ship, the finish window and
glide, and the source clean-up. **Every number the branch measured before that merge was taken 82
commits back and is not carried forward as established.** The clearance figures above are the
branch's own claim and are what the owner's eye judged; they are not re-derived here.

**`engine-reach --check`, given the real diff rather than the working tree:**

```
node scripts/engine-reach.mjs --check <the 5 changed paths>
ENGINE REACH: none of 5 path(s) can reach the race engine.
```

**Note the trap, because it nearly ate this step:** bare `--check` on a committed merge reports
`none of 0 path(s)` — it reads the WORKING tree, which is clean after a merge. The paths have to be
handed to it. A run that says "0 paths" is not a clearance; it is the tool saying it was asked
nothing.

**All three measured fresh, no `--cheap`:**

| role   | in the record      | measured on `d1a8f376` |         |
| ------ | ------------------ | ---------------------- | ------- |
| world  | `dc4647be0f55ebdb` | **`dc4647be0f55ebdb`** | unmoved |
| camera | `ff2bc42af377b5cf` | **`ff2bc42af377b5cf`** | unmoved |
| render | `0d5854a652c69d87` | **`0d5854a652c69d87`** | unmoved |

**Nothing to mint.** `docs/fingerprints.json` is untouched — no value, no `mintedOn`, no date. A mint
records a movement; there was none, and writing one anyway would put a false event in the record.

`npm run verify`: **PASS 6 FAIL 0** (routing selected the client suite, which ran alone).

One line in the render run — `[warmup] duck FAILED: Image is not defined` — is **pre-existing**:
`render-fingerprint.mjs` does not contain it, this branch does not touch `scripts/` at all, and the
hash came out identical to the record. Noise from sprite loading under node, not a regression.

## 3. Source hygiene

- **Added:** `overlayGeometry.js` and `overlayGeometry.test.js`.
- **Tests: +1 file, 0 deleted, 0 re-blessed.**
- **No default, no new key, no Dev Screen control.** Nothing in `defaults.js`.
- Three files edited: `BrandLogoOverlay.jsx`, `RaceScreen.css`, `StateOverlay.css`.

## 4. THE BLIND SPOT THIS SHIP EXPOSES

**A visible change shipped and not one of the three fingerprints could see it.**

That is correct rather than broken — the overlays live in the DOM, outside the canvas, and
`render-fingerprint.mjs` drives the drawing code directly in node where there is no layout engine at
all. But the consequence deserves saying out loud: **the regression net this project relies on has a
hole exactly the shape of everything the viewer sees around the picture.** A future change that moved
the brand logo across the minimap would move no fingerprint and fail no guard.

`overlayGeometry.test.js` is the first thing that covers any of it, at three wrapper sizes. It is the
only thing that does. **Proposal, not built:** a fourth fingerprint over `overlayGeometry`'s boxes at
a fixed set of wrapper sizes would close the hole with the same instrument the other three use, and
it needs no browser — the geometry is a pure function.

## 5. The ceremony

Tag pair `pre/ship-coord-system` / `v-ship-coord-system`, registered in
[TAGS.md](../../docs/TAGS.md) and pushed with the merge in one push. Merge commit only; branch deleted
after. CI green for the exact head SHA — run id in §6.

## 6. CI

Filled in from the remote after the fact rather than pre-filled.

<!-- CI -->
