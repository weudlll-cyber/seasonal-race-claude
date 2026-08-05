| | covers | run it when | cost |
|---|---|---|---|
| `scripts/fingerprint-default.mjs` — **world** `dc4647be0f55ebdb` | the RACE: physics, plan, outcome | any behaviour change, and per the mint tripwire above | ~2 min |
| `scripts/camera-fingerprint.mjs` — **camera** `00cafa2432add0f7` | the DIRECTOR's decisions: state, phase, anchor, zoom, offsets, camT, targets | any block touching `client/src/modules/camera/` | ~47 s |
| `scripts/render-fingerprint.mjs` — **render** `1f83ecc1fcb6fa9a` | the DRAW CALL SEQUENCE: sprite placement, text, styles, transforms, layer order | any block touching the drawing path — **`modules/camera/`**, `RaceScreen/renderRaceFrame.js`, `RaceScreen/drawing/`, `nameTagLayout.js`, `Minimap.js`, the racer types' `drawRacer`. **Camera counts** (FINISH-COMPANY-1): a camera-only diff moved this hash `b6591e74102152bd` → `1f83ecc1fcb6fa9a`, because the director decides the transform on every drawn frame. `scripts/verify.mjs` had copied this list's omission and told a block it could not reach a `ctx.` call. | ~77 s |

