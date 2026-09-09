# RENDER-OUTCOME-1 — the second instrument, built and stopped at the fork

Night chain 2026-09-08, piece 6 · branch `night/2026-09-08` ·
★ **NOT MINTED. NO MINTING PERMISSION WAS GIVEN. The fix is on the branch and waits for his word.**

---

## THE FIX

`scripts/render-fingerprint.mjs:584` carried the same `isOutcomePhase: false` literal the camera
instrument carried, so **every render hash ever taken was measured with the race plan's OUTCOME
window permanently shut** — a camera the product never runs, and therefore frames the product never
draws.

It now makes the browser's own call, the same one MINT-CAMERA-1 put into the camera instrument, with
the same two arguments so the two cannot disagree:

```js
isOutcomePhase:
  raceCfg.racePlanController?.getPhase(st.physicsTs, st.raceProgress) === "OUTCOME",
```

The browser's derivation was established correct **at source** by OUTCOME-WINDOW-2 and is not
re-argued here.

## THE VALUE — re-measured, not trusted

MINT-CAMERA-1 predicted `74946ddbeca517a9 → 40b2de6fcc5bafd8` from a patched probe copy. The brief
required re-measuring rather than carrying that number, and it was:

```
node scripts/render-fingerprint.mjs --quiet   ->   40b2de6fcc5bafd8
```

**It reproduced exactly.** The record still says `74946ddbeca517a9`, so `verify` is now RED on
`render-fingerprint` on this branch. **That is the intended state** — a block that moves a hash
should fail the guard until the owner mints it.

---

## ★ WHICH TRACKS MOVE — AND IT IS SIX, NOT THE CAMERA'S FOUR

| track | OLD (window shut) | NEW (browser's value) | moved |
|---|---|---|---|
| city-circuit | `a166700f8f6f7753` | `a166700f8f6f7753` | no |
| **dirt-oval** | `3d0c4a6d3032a062` | `30e8e45f4d0f8857` | **YES** |
| **garden-path** | `03ce890c1687d578` | `538745450cfd8c50` | **YES** |
| **ice-track** | `3664b9724e30f863` | `04bb5ecc7f496db2` | **YES** |
| **luger-hill** | `5f58b4a154a52866` | `2faabfee15684fef` | **YES** |
| mountainstreet | `c74f0dc30b527d97` | `c74f0dc30b527d97` | no |
| river-run | `5cdb5a1143261290` | `5cdb5a1143261290` | no |
| **searound** | `7726f1928385ca9e` | `4849b3d5200b13c5` | **YES** |
| **seatrack** | `4ed8fbc2fde1fd55` | `ee9a62ab703e32ef` | **YES** |
| space-sprint | `c949422af7ae14b7` | `c949422af7ae14b7` | no |

★ **THE TWO INSTRUMENTS DISAGREE ABOUT WHICH TRACKS, AND THAT IS ITSELF THE FINDING.**

| | camera (MINT-CAMERA-1) | render (here) |
|---|---|---|
| moved | city-circuit, dirt-oval, ice-track, space-sprint | dirt-oval, garden-path, ice-track, luger-hill, searound, seatrack |
| in both | dirt-oval, ice-track | |
| camera only | **city-circuit, space-sprint** | |
| render only | | **garden-path, luger-hill, searound, seatrack** |

**They do not run the same window.** The camera instrument stops when everyone is home and then
hashes the ending schedule (4,038–5,888 frames, per track). The render instrument runs a **fixed
`RUN_FRAMES = 5600`** and steps physics unconditionally — no all-home stop, no ending window. So on a
track that finishes early it keeps stepping into a stretch the camera instrument never measures, and
on a track that finishes late it stops before the camera instrument does. **Neither is wrong; they
answer different questions, and their track lists cannot be compared.**

---

## ★ WHAT ACTUALLY CHANGES IN THE PICTURE — a moved hash is not a picture

The render instrument's own loop was re-run in both arms recording the camera's state and anchor on
**every** frame (not the 16 sampled ones):

| track | frames | frames where the camera state or anchor differs | new state, live arm only |
|---|---|---|---|
| city-circuit | 5600 | **0** | – |
| dirt-oval | 5600 | **1343** | `COMEBACK_ZOOM` |
| garden-path | 5600 | **480** | `COMEBACK_ZOOM` |
| ice-track | 5600 | **848** | – |
| luger-hill | 5600 | **1026** | `COMEBACK_ZOOM` |
| mountainstreet | 5600 | **0** | – |
| river-run | 5600 | **0** | – |
| searound | 5600 | **1122** | `COMEBACK_ZOOM` |
| seatrack | 5600 | **1119** | `COMEBACK_ZOOM` |
| space-sprint | 5600 | **0** | – |

**The six tracks whose hash moved are exactly the six with differing camera frames, and the four
unmoved have precisely zero.** The hash movement is fully accounted for by the picture, with nothing
left over.

**On five of the six the change is a `COMEBACK_ZOOM` the old arm never took** — 480 to 1,343 frames
of it, i.e. **8 to 22 seconds a race** of a shot the render record has never seen. On **ice-track**
no new state appears: its 848 differing frames are a redistribution among the states it already had,
the same shape city-circuit showed in the camera measurement.

★ **Would he see it?** On five tracks, yes, unmistakably — the camera holds a different racer for
seconds at a time. On ice-track the answer needs his eye rather than the hash: the states are the
same and only their order and anchors move.

---

## ★ THE FORK — STOPPED HERE

The fix is written, measured and left in place. **Nothing is minted.** To take it, the owner mints
the render role to `40b2de6fcc5bafd8`; to reject it, the four lines come out and the record is
untouched.

**What it costs to leave the instrument as it is:** the render record keeps describing frames drawn
from a camera that never takes the comeback shot in that window, so on those six tracks every render
figure stays blind in exactly the way the camera record stopped being blind this morning.

**What taking it costs:** every render figure older than the mint stops being comparable on those six
tracks, exactly as the camera mint did on its four.

## CHECKS

```
node scripts/engine-reach.mjs --check scripts/render-fingerprint.mjs

ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
```

`npm run verify` is **RED on `render-fingerprint`** on this branch, deliberately and only there —
the guard is doing its job against an unminted move.

## SOURCE HYGIENE

One file changed: `scripts/render-fingerprint.mjs`, four lines plus the block comment that says why.
No engine, camera or drawing code. No config key, no default.

**Reused, not rebuilt:** the browser's derivation and the exact call MINT-CAMERA-1 put into the
camera instrument; the render instrument's own frame loop for the picture measurement, patched as a
scratchpad copy so the tree carries only the fix.
