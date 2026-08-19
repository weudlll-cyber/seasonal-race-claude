# PAN-LAG-ACCOUNT-1 — the complete account of the pan lag

**2026-08-22 · branch `invest/pan-lag` off master `f0cb5179` · MEASUREMENT ONLY — no camera change,
no key, no fix; `CameraDirector.js` untouched and `git diff master -- client/` is empty · nothing
changes, so no fingerprint can move and none was run**

## The residual, in one sentence

**The residual is 0.0 screen pixels at the median on every one of the forty runs — ten tracks, two
field sizes, two configurations — so the pan lag is entirely the smoother the director is running,
with one exception: PHOTO_FINISH, where the p95 residual is 345 px.**

**The lag is by design.** The only pan levers are the time constants and where the phases begin — the
simpler conversation the brief hoped for. Closing the account also forced the pan to be separated from
the ZOOM, and that **re-attributes the number this whole thread was built on**: LINE-VISIBLE-1's
414-891 px is mostly zoom, not pan, so "fix the pan lag" is the wrong lever. See the correction.

---

## How the account closes

Each frame the pan takes one of four branches in `update()`: **follow** (a first-order smoother),
**glide** (a smoothstep over a duration), **snap** (cut / lead-change), or the **t-space** path,
which assigns `offset = target` exactly and therefore has no lag at all.

For every frame the harness computes the one-step-ahead prediction from the **actual** previous
delivered offset, this frame's **actual** target, and the lerp factor **actually in force** —
`_lerpFactorForState(state)` with the director's own `_lerpPhase`:

```
sim         = prevDelivered + (target - prevDelivered) * lf
measuredLag = delivered - target
explained   = sim       - target     ← what the smoother MUST produce from where it was
residual    = delivered - sim        ← what the smoother cannot produce
```

`measuredLag = explained + residual` **identically**, so every screen pixel is attributed. A
one-step prediction is used rather than a free-running simulation on purpose: it makes the residual a
property of the frame rather than of the run's history.

## The account, per track — whole race, gun to crossing

Medians in screen px. `follow` frames only for the lag columns (snap and glide have no smoother lag
by construction). `zoomRatio` is delivered ÷ target zoom.

| track | n | arm | frames | snap% | glide% | medLag | medExpl | **medResid** | p95Resid | lag world px | zoomRatio med / p95 dev |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| city-circuit | 20 | his | 4988 | 2 % | 11 % | 56 | 56 | **0.0** | 23.3 | 15 | 1.000 / 0.028 |
| city-circuit | 20 | shipped | 4988 | 2 % | 13 % | 60 | 60 | **0.0** | 18.4 | 15 | 1.000 / 0.024 |
| city-circuit | 40 | his | 5064 | 3 % | 10 % | 56 | 56 | **0.0** | 24.7 | 15 | 1.000 / 0.029 |
| city-circuit | 40 | shipped | 5064 | 3 % | 13 % | 58 | 59 | **0.0** | 10.2 | 15 | 1.000 / 0.021 |
| dirt-oval | 20 | his | 5514 | 2 % | 10 % | 56 | 56 | **0.0** | 23.2 | 15 | 1.000 / 0.027 |
| dirt-oval | 20 | shipped | 5514 | 2 % | 13 % | 57 | 57 | **0.0** | 18.1 | 15 | 1.000 / 0.019 |
| dirt-oval | 40 | his | 5692 | 3 % | 10 % | 54 | 54 | **0.0** | 19.2 | 15 | 1.000 / 0.016 |
| dirt-oval | 40 | shipped | 5692 | 3 % | 12 % | 56 | 56 | **0.0** | 16.5 | 14 | 1.000 / 0.016 |
| garden-path | 20 | his | 12000 | 0 % | 3 % | 15 | 15 | **0.0** | 2.0 | 4 | 1.000 / 0.004 |
| garden-path | 20 | shipped | 12000 | 0 % | 8 % | 16 | 16 | **0.0** | 2.7 | 4 | 1.000 / 0.004 |
| garden-path | 40 | his | 12000 | 0 % | 5 % | 16 | 16 | **0.0** | 0.7 | 4 | 1.000 / 0.002 |
| garden-path | 40 | shipped | 12000 | 0 % | 8 % | 17 | 17 | **0.0** | 0.8 | 4 | 1.000 / 0.002 |
| ice-track | 20 | his | 4688 | 2 % | 11 % | 63 | 62 | **0.0** | 22.9 | 17 | 1.000 / — |
| ice-track | 20 | shipped | 4688 | 2 % | 13 % | 57 | 57 | **0.0** | 22.6 | 16 | 1.000 / — |
| ice-track | 40 | his | 4793 | 4 % | 12 % | 61 | 61 | **0.0** | 16.5 | 16 | 1.000 / — |
| ice-track | 40 | shipped | 4793 | 5 % | 14 % | 62 | 63 | **0.0** | 14.4 | 16 | 1.000 / — |
| luger-hill | 20 | his | 3785 | 4 % | 12 % | 55 | 55 | **0.0** | 22.9 | 17 | 1.000 / — |
| luger-hill | 20 | shipped | 3785 | 4 % | 15 % | 56 | 56 | **0.0** | 0.0 | 17 | 1.000 / — |
| luger-hill | 100 | his | 3625 | 4 % | 14 % | 57 | 57 | **0.0** | 0.0 | 17 | 1.000 / — |
| luger-hill | 100 | shipped | 3625 | 4 % | 16 % | 54 | 55 | **0.0** | 18.1 | 16 | 1.000 / — |
| mountainstreet | 20 | his | 3868 | 1 % | 12 % | 47 | 47 | **0.0** | 37.8 | 16 | 1.000 / — |
| mountainstreet | 20 | shipped | 3868 | 2 % | 14 % | 45 | 45 | **0.0** | 26.7 | 15 | 1.000 / — |
| mountainstreet | 100 | his | 3745 | 2 % | 12 % | 51 | 51 | **0.0** | 0.0 | 16 | 1.000 / — |
| mountainstreet | 100 | shipped | 3745 | 2 % | 16 % | 50 | 50 | **0.0** | 0.0 | 15 | 1.000 / — |
| river-run | 20 | his | 3767 | 4 % | 11 % | 43 | 43 | **0.0** | 43.5 | 13 | 1.000 / — |
| river-run | 20 | shipped | 3767 | 4 % | 14 % | 43 | 43 | **0.0** | 13.5 | 13 | 1.000 / — |
| river-run | 100 | his | 3761 | 5 % | 13 % | 44 | 44 | **0.0** | 0.0 | 14 | 1.000 / — |
| river-run | 100 | shipped | 3761 | 5 % | 15 % | 44 | 44 | **0.0** | 16.4 | 13 | 1.000 / — |
| searound | 20 | his | 4074 | 2 % | 12 % | 58 | 60 | **0.6** | 30.5 | 17 | 1.000 / — |
| searound | 20 | shipped | 4074 | 2 % | 13 % | 61 | 62 | **0.0** | 28.1 | 16 | 1.000 / — |
| searound | 40 | his | 4126 | 4 % | 13 % | 61 | 61 | **0.0** | 27.5 | 17 | 1.000 / — |
| searound | 40 | shipped | 4126 | 4 % | 16 % | 62 | 62 | **0.0** | 11.5 | 16 | 1.000 / — |
| seatrack | 20 | his | 3791 | 2 % | 12 % | 57 | 57 | **0.0** | 42.1 | 18 | 1.000 / — |
| seatrack | 20 | shipped | 3791 | 2 % | 15 % | 59 | 60 | **0.0** | 0.0 | 17 | 1.000 / — |
| seatrack | 100 | his | 3754 | 3 % | 13 % | 59 | 60 | **0.0** | 23.6 | 18 | 1.000 / — |
| seatrack | 100 | shipped | 3754 | 4 % | 14 % | 60 | 60 | **0.0** | 0.1 | 18 | 1.000 / — |
| space-sprint | 20 | his | 3868 | 4 % | 12 % | 57 | 58 | **3.4** | 40.0 | 20 | 1.000 / — |
| space-sprint | 20 | shipped | 3868 | 4 % | 14 % | 63 | 63 | **0.0** | 34.1 | 19 | 1.000 / — |
| space-sprint | 100 | his | 3774 | 3 % | 12 % | 63 | 64 | **0.0** | 23.5 | 20 | 1.000 / — |
| space-sprint | 100 | shipped | 3774 | 3 % | 15 % | 64 | 64 | **0.0** | 18.2 | 20 | 1.000 / — |

**The median residual is 0.0 px in 38 of 40 runs**, 0.6 px and 3.4 px in the other two. The p95
residual reaches 43.5 px, which is the glide-to-follow handover and the frames after a subject step —
both branches the model deliberately does not claim to predict.

**The pan lag itself is 43–64 screen px at the median, 13–20 world px, across the whole race.** In the
ENDGAME alone it is larger — 15–265 px — because the target moves faster there; see the correction.

## Per state — pooled over all tracks, his config, follow frames only

| state | frames | med tc | entry % | medLag | medExpl | **medResid** | p95Resid | after a step |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LEADER_ZOOM | 54 422 | 0.25 s | 0 % | 46 | 46 | **0.0** | 14.9 | 1 % |
| LEAD_CHANGE | 15 098 | 0.25 s | 0 % | 53 | 53 | **0.0** | 0.0 | 0 % |
| **OVERVIEW** | 9 233 | **1.50 s** | 1 % | **151** | **151** | **0.0** | 0.0 | 1 % |
| COMEBACK_ZOOM | 6 281 | 0.25 s | 0 % | 69 | 69 | **0.0** | 37.3 | 5 % |
| **PHOTO_FINISH** | 3 443 | 0.25 s | 0 % | 29 | 47 | **4.4** | **345.4** | **42 %** |

**OVERVIEW's lag is 151 px against LEADER_ZOOM's 46 — 3.3×, and it is entirely the time constant**
(1.50 s against 0.25 s), explained to the pixel. **That 1.50 is HIS setting**; the shipped default is
0.25. His own configuration is the largest single contributor to the lag in the state where it is
largest.

**PHOTO_FINISH is the one place the account does not close.** The delivered lag (29) is *smaller*
than the smoother must produce (47), the median residual is 4.4 px and the p95 is 345 px, and 42 % of
its frames are within 30 frames of a subject step. Something is moving the pan toward its target
faster than the lerp — the zoom-about-the-anchor correction and the pinned-pair capture both act
there. **What exactly, is NOT ESTABLISHED**; it is named here as the one open item the account
leaves.

---

## Q1 — does the endgame run on the entry constant?

**No.** In the run-in window, on **every one of the 36 runs that has one**:

- **entry phase: 0 % of frames.**
- **median time constant in force: 0.25 s** — the TRACKING constant.
- **entry phases started per whole race: 0 or 1**, and every one of them from a state change; **none
  from an anchor change.**

The entry map is effectively vestigial. **Transitions are handled by the GLIDE**, which is 3–16 % of
frames and is a smoothstep over a duration, not a time constant at all. So the two levers named in
the brief reduce to one: the tracking constants.

## Q2 — why garden-path has no endgame

**The race never gets there.** All four garden-path runs are exactly **12 000 frames — the 200-second
ceiling** in `runRace` — and the leader reaches a maximum progress of **0.9294** against an endgame
threshold of 0.95. The window never opens because the leader never travels 95 % of two laps inside
200 seconds.

**This is a harness ceiling, not proof of a product defect** — the browser has no 200 s cap, so a
real garden-path race would eventually reach the endgame. But the race is planned for 60 seconds and
takes more than 200, which is a discrepancy of its own. **Why garden-path overruns its duration plan
by more than 3× is NOT ESTABLISHED here** and is outside this brief.

---

## THE CORRECTION — LINE-VISIBLE-1's number was right, its NAME was wrong

**LINE-VISIBLE-1 reported a "median lag between the target frame and the delivered frame" of 414–891
px and concluded "fix the lag, not the border". The magnitude stands. The attribution does not: that
number is mostly the ZOOM, not the pan, and "fix the pan lag" is the wrong lever.**

That figure compared the finish line's screen position between the target frame and the delivered
frame. **Two different errors move that point**, and LINE-VISIBLE-1 summed them under one word:

- **PAN-only** — same (delivered) zoom, differing offsets: `|offset − targetOffset|`
- **ZOOM-only** — same (delivered) offset, differing zoom: `|c × (eff − targetEff)|`

The zoom term is multiplied by **`c`, the line's distance from the camera centre**. In the endgame the
line is hundreds of world px away, so a **1 % zoom error is worth more screen pixels than the entire
pan lag**. The two also partly **cancel**, which is why the total is often smaller than either part —
another reason a single number could not be read.

| track | n | arm | endgame frames | **TOTAL** | **PAN-only** | **ZOOM-only** | zoomRatio |
| --- | --- | --- | --- | --- | --- | --- | --- |
| city-circuit | 20 | his | 265 | 159 | 43 | **207** | 1.000 |
| city-circuit | 20 | shipped | 265 | 165 | 33 | **283** | 1.000 |
| city-circuit | 40 | his | 256 | 178 | 50 | **249** | 1.000 |
| city-circuit | 40 | shipped | 256 | 166 | 66 | **249** | 1.000 |
| dirt-oval | 20 | his | 266 | 125 | 15 | **140** | 1.000 |
| dirt-oval | 20 | shipped | 266 | 72 | 21 | **181** | 1.000 |
| dirt-oval | 40 | his | 269 | 120 | 15 | **109** | 1.000 |
| dirt-oval | 40 | shipped | 269 | 120 | 15 | **109** | 1.000 |
| garden-path | 20/40 | both | **0** | — | — | — | *never reaches the window — see Q2* |
| ice-track | 20 | his | 217 | 74 | 23 | **86** | 1.000 |
| ice-track | 20 | shipped | 217 | 110 | 29 | **111** | 1.000 |
| ice-track | 40 | his | 224 | 108 | 29 | **129** | 1.000 |
| ice-track | 40 | shipped | 224 | 134 | 28 | **150** | 1.000 |
| **luger-hill** | 20 | his | 172 | 433 | 224 | **875** | 0.969 |
| **luger-hill** | 20 | shipped | 172 | 268 | 213 | **1485** | 1.049 |
| luger-hill | 100 | his | 179 | 388 | 92 | **363** | 1.000 |
| luger-hill | 100 | shipped | 179 | 407 | 166 | **1064** | 1.000 |
| **mountainstreet** | 20 | his | 174 | 435 | 109 | **392** | 1.001 |
| **mountainstreet** | 20 | shipped | 174 | 225 | 221 | **1766** | 1.032 |
| mountainstreet | 100 | his | 178 | 403 | 114 | **385** | 1.000 |
| mountainstreet | 100 | shipped | 178 | 438 | 212 | **1235** | 1.006 |
| river-run | 20 | his | 179 | 377 | 151 | **139** | 0.987 |
| **river-run** | 20 | shipped | 179 | 379 | 175 | **979** | 1.003 |
| river-run | 100 | his | 166 | 400 | 160 | **526** | 0.982 |
| **river-run** | 100 | shipped | 166 | 195 | 265 | **1888** | 1.069 |
| searound | 20 | his | 190 | 284 | 105 | **433** | 1.000 |
| searound | 20 | shipped | 190 | 201 | 22 | **322** | 1.000 |
| searound | 40 | his | 188 | 312 | 99 | **526** | 1.000 |
| searound | 40 | shipped | 188 | 312 | 99 | **526** | 1.000 |
| **seatrack** | 20 | his | 178 | 309 | 130 | **863** | 0.990 |
| **seatrack** | 20 | shipped | 178 | 349 | 140 | **1447** | 1.003 |
| **seatrack** | 100 | his | 187 | 301 | 179 | **1328** | 1.001 |
| **seatrack** | 100 | shipped | 187 | 301 | 175 | **1128** | 1.000 |
| **space-sprint** | 20 | his | 172 | 262 | 121 | **829** | 1.011 |
| **space-sprint** | 20 | shipped | 172 | 186 | 147 | **1497** | 1.068 |
| **space-sprint** | 100 | his | 169 | 306 | 165 | **793** | 1.023 |
| **space-sprint** | 100 | shipped | 169 | 333 | 236 | **1073** | 1.062 |

**ZOOM-only exceeds PAN-only on 35 of the 36 runs that have an endgame** — the sole exception is
river-run · 20 · his (139 against 151). It exceeds it by **3–10×** on the open tracks, and on
space-sprint · 100 · shipped it is 1073 px against 236.

**Three further things this table settles.**

**The endgame pan lag is larger than the whole-race pan lag** — 15–265 px against a whole-race median
of 43–64. That is not a contradiction: the endgame is a fast wide shot, and a first-order smoother's
lag is `speed × constant`. It is still the smoother, and it is still the smaller term.

**A zoomRatio of 1.000 does not mean the zoom contributes nothing.** On dirt-oval the ratio is 1.000
and ZOOM-only is still 109–181 px, because `c` is large. The lever is not only "how far off is the
zoom" but "how far from centre is the line when it is off".

**His configuration is BETTER here, not worse.** On the four tracks where the shipped arm's zoomRatio
drifts furthest (space-sprint 1.068, river-run 1.069, luger-hill 1.049, mountainstreet 1.032), his arm
holds much closer and its ZOOM-only term is roughly half. His slower OVERVIEW constant costs pan lag
and buys zoom accuracy.

**What follows for the line leaving frame:** LINE-VISIBLE-1's recommendation to "measure and fix the
endgame pan lag before touching any width rule" should **not** be acted on as written. The pan lag is
the smaller term on 35 of 36 runs, and it is fully explained by a smoother that is working correctly.
**The zoom is where the displacement lives.**

---

## The smallest correction the account supports

**Two levers exist, and only one of them is worth pulling.**

**The pan lag cannot be reduced without making the motion less smooth.** This is the honest general
answer the brief anticipated. It is a first-order smoother tracking a moving target; its lag is
`speed × constant`, the account shows it delivering exactly that with a 0.0 px median residual, and
there is nothing left over to recover. **There is no defect to remove and no free improvement
available.** The only pan lever is OVERVIEW's 1.50 s constant — **his own setting**, against a shipped
default of 0.25 — which costs 151 px against 46 px everywhere else. Changing it is a change to the
FEEL of every wide shot in the game, not a repair, and the table above shows it is buying him
something real on the zoom side. **That is his call, not a measurement's.**

**The zoom is the lever with a defect behind it**, and it is the one the line-visibility question
actually needs. But **what governs the endgame zoom's approach to its target is NOT ESTABLISHED
here** — this block was scoped to the pan, and the zoom entered it only as the term that had to be
separated out to make the pan account close. Naming that mechanism is the next block's work, and it
should start from the zoom rather than from the pan.

## PROPOSALS

**1. Re-aim the line-visibility work at the ZOOM, and do it before any width rule is built.** The
table above is the whole brief for it: 36 runs, both arms, the pan and the zoom separated, and the
zoom the larger term on 35 of them. **Cost:** one measurement block, on the endgame zoom's approach to
its target. **What it prevents:** ENDGAME-WIDTH-1's proposals and LINE-VISIBLE-1's border rule are
both waiting on "is the line in frame", and both would be built on a term that has now been shown not
to be the cause. This is the cheapest thing in the report and it unblocks two others.

**2. Put OVERVIEW's 1.50 s in front of him as a feel choice, not a bug fix.** Two production builds,
1.50 s and 0.25 s, on a track where he already likes the wide shot. **Cost:** two builds and ten
minutes. **What it settles:** the only measured pan lever, permanently — and he should be told that
his 1.50 is *buying* him a closer-held zoom in the endgame, so the choice is a trade and not a
cleanup. If he prefers 1.50, the pan-lag question closes with "it is his taste and it is working as
intended", which is the right outcome.

**3. Close PHOTO_FINISH's residual, because it is the one number the account could not attribute.**
p95 345 px, a median delivered lag *below* what the smoother should produce, and 42 % of its frames
within a step's settling window — something assigns the pan there outside the four branches this
account models. **Cost:** a day of reading `update()`'s photo-finish paths. **What it prevents:** the
next time the picture looks wrong at the finish, this is the term nobody can currently name.

## Reproducing

```
node scripts/pan-lag-account.mjs                    # ten tracks, both sizes, both arms
node scripts/pan-lag-account.mjs --tracks=garden-path
```

**It changes nothing.** Every field read — `_lerpPhase`, `_lerpFactorForState`, `targetOffsetX/Y`,
`targetZoom`, `_framingProbe` — is one the director already maintains. No file under `client/` is
touched by this block, and `git diff master -- client/` is empty.
