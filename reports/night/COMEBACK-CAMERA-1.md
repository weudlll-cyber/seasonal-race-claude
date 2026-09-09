# COMEBACK-CAMERA-1 — does the camera show him, at the point piece 3 chose

**Instrument:** `scripts/diag/comeback-beats.mjs`, **reused** as a patched copy with the hold arm
added — it already delivers the authored plan through the browser's own `setCameraPlan` channel and
already calls `best()` as a pure read. Only the hold arm and the gate-crossing column are new.

Night chain 2026-09-08, piece 4 · branch `night/2026-09-08` · **measurement only. The comeback key
is ON only inside this measurement; its shipped default stays OFF. Nothing minted, nothing built.**

---

## THE ARMS

Release **0.70** (piece 3's choice) and **0.50** (the runner-up — every point was
indistinguishable, so the brief asks for the top two) × `comebackUseBeats` **OFF / ON**.
Ten tracks × ten seeds (41000–41009) × N=40 = **100 races per arm, 400 total.**

★ **N was cut from 30 seeds to 10, deliberately.** At 30 the four arms projected to 3.3 hours and
would have eaten pieces 5 and 6, whose fall order is below this one. 100 races per arm answers every
question the brief asks of this piece. Recorded as a decision, not an omission.

---

## THE HEADLINE — the key makes it WORSE, and the reason is precise

| release | beats | shots | on the HELD racer | on someone else | races with any shot | candidate frames | of those, inside the window |
|---|---|---|---|---|---|---|---|
| 0.70 | **OFF** | **30** | 14 | 16 | 30 / 100 | 115,785 | 27,543 |
| 0.70 | **ON** | **7** | 4 | 3 | 7 / 100 | 49,758 | 6,416 |
| 0.50 | **OFF** | **30** | 14 | 16 | 30 / 100 | 116,540 | 24,819 |
| 0.50 | **ON** | **5** | 3 | 2 | 5 / 100 | 49,658 | 6,352 |

**Turning the key ON cuts comeback shots by four to six times** — 30 → 7 at the chosen release,
30 → 5 at the runner-up.

★ **COMEBACK-CONNECT-1's 11 → 0 is reproduced in DIRECTION but not in magnitude.** The brief's
premise — that the zero was an artefact of today's plan putting comeback peaks at 0.18–0.68, before
the camera may look, and that the held shape would move the climb inside the window — is **half
right**. The shots are no longer zero. They are still cut to a fifth. **The reason for the zero is
not gone; it has moved.**

---

## ★ WHY — THE TWO GATES BARELY OVERLAP

Two independent gates stand between a written comeback and a shot, and with the held shape they are
**nearly disjoint**:

- **`comebackUseBeats`** (`comebackDetector.js:178-181`): a plan-named racer is **not offered before
  his resolve beat**. Median resolve beat, measured: **0.7800**.
- **`comebackMaxCurrentRankPct`** (0.2, `comebackDetector.js:187`): a racer stops being a candidate
  once `(rank-1)/normDivisor < 0.2` — at N=40 that is **rank ≤ 8**, "already up front". Median
  progress at which the held racer crosses it: **0.7522** at release 0.70, **0.6658** at 0.50.

**The beats gate opens AFTER the rank gate has closed.**

| release | held racer is a cast comebacker | usable window (beats opens before rank gate closes) | **window EMPTY** | window width (gateCross − resolve), min / median / max |
|---|---|---|---|---|
| **0.70** | 42 of 100 | **12** | **30** | −0.1946 / **−0.0296** / +0.1380 |
| **0.50** | 42 of 100 | **3** | **39** | −0.3642 / **−0.1224** / +0.1494 |

At the chosen release the window is empty in **30 of 42** races (71 %); at 0.50 in **39 of 42**
(93 %). The camera is told *"you may show him now"* at the moment it has already been told *"he is
too far forward to count as a comebacker"*.

★ **This is the answer to the owner's point.** He said the camera should not have to recognise a
comebacker from speed, because the director already knows who it is — and he is right that the
mechanism exists. But switching it on does not deliver the shot, because the moment it authorises is
past the moment the other gate withdraws eligibility. **Both numbers are his to move; neither is
touched here.**

★ **The later release is materially better for this mechanism**, which is an independent argument
for piece 3's choice: a usable window in 12 of 42 races at 0.70 against 3 of 42 at 0.50.

**In the other 58 of 100 races the held racer is not a cast comebacker at all**, so the beats gate
leaves him untouched by construction (`comebackDetector.js:174-177`: a candidate the plan did not
name is deliberately not gated).

---

## ★ THE GATE DOES NOT CUT THE SHOT SHORT — measured, and it contradicts the worry

The brief asked whether a held racer climbing into the top 5 loses his standing **mid-shot**. He
loses his *candidate* standing in **100 of 100 races** — but the shot does not end with it:

| release / beats | shots on the held racer | started AFTER his gate crossing | ended within 0.02 of it | **ended after it** |
|---|---|---|---|---|
| 0.70 OFF | 14 | 0 | 2 | **9** |
| 0.70 ON | 4 | 0 | 0 | **4** |
| 0.50 OFF | 14 | 0 | 2 | **11** |
| 0.50 ON | 3 | 0 | 1 | **2** |

**No shot started after the crossing, and most ran past it.** Once `COMEBACK_ZOOM` is entered the
director holds it on the locked racer; the detector's eligibility governs **starting** a shot, not
**sustaining** one. So `comebackMaxCurrentRankPct` costs *starts*, not endings.

**And the shot follows him home.** Rank at shot start vs end, release 0.70, beats OFF:

```
start: 9, 9, 10, 12, 12, 13, 15, 15, 16, 16, 17, 18, 19, 19
end:   1, 2,  3,  3,  4,  4,  4,  4,  4,  5, 11, 13, 13, 20
```

Ten of the fourteen end with him inside the top 5. **When the camera does catch him, it shows the
whole climb** — median span 0.131 of the race, range 0.090–0.147.

---

## ★ THE BIGGER LOSS IS NOT THE GATE — IT IS THE CONTEST

With the key OFF there were **115,785 candidate frames** and **27,543 of them inside the window**,
and only **30 shots**. The detector had somebody, in the window, on tens of thousands of frames, and
the shot was taken thirty times. **The loss is in the director's weighted contest**
(`CameraDirector.js:1717-1735`) — cooldown, weight, and a weighted pick against BATTLE, LEAD_CHANGE
and OVERVIEW — not in the detector's gates.

**The held racer is shown in 14 of 100 races with the key off, and 3–4 of 100 with it on.**
So 86–97 % of the comebacks this shape produces are never shown.

---

## PER TRACK — release 0.70

| track | OFF shots (held/other) | ON shots (held/other) | held gate crossing (median) |
|---|---|---|---|
| city-circuit | 5 (2/3) | 2 (1/1) | 0.781 |
| dirt-oval | 5 (2/3) | 0 (0/0) | 0.776 |
| garden-path | 2 (0/2) | 1 (0/1) | 0.764 |
| ice-track | 4 (3/1) | 1 (0/1) | 0.798 |
| luger-hill | 1 (0/1) | 0 (0/0) | 0.770 |
| mountainstreet | 4 (2/2) | 1 (1/0) | 0.752 |
| river-run | 4 (2/2) | 1 (1/0) | 0.807 |
| searound | 1 (0/1) | 1 (1/0) | 0.777 |
| seatrack | 1 (1/0) | 0 (0/0) | 0.742 |
| space-sprint | 3 (2/1) | 0 (0/0) | 0.756 |

At ten races per cell these per-track counts carry no separation and are not a ranking; they are
here so a reader can see that no track behaves oppositely to the pooled row. **Three tracks lose
every shot when the key goes on** (dirt-oval, luger-hill, space-sprint, seatrack).

★ **A comeback shot of the WRONG racer is common.** With the key off, **16 of 30 shots are on
somebody other than the held racer** — the camera finds a different climb and shows that instead.
With the key on it is 3 of 7. Per the brief, that is not a success, and it is counted separately
above rather than folded into a shot total.

---

## WHAT WAS NOT DONE

- ★ **The gate was NOT changed.** `comebackMaxCurrentRankPct` stays 0.2. That it is what stops the
  shot from *starting* is the finding; what to do about it is the owner's decision.
- **No plan, detector, camera or config change.** `comebackUseBeats` was set per-arm in the
  harness's own camera config; **its shipped default in `defaults.js` is untouched and stays OFF.**
- **Nothing is recommended.** Piece 3 chose a release point by the owner's stated rule; this piece
  chooses nothing.

## CHECKS

```
node scripts/engine-reach.mjs --check reports/night/COMEBACK-CAMERA-1.md reports/night/INDEX.md

ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
```

The hold arm's inertness while unset was confirmed by running the world fingerprint with the arm
present and unset (`COMEBACK-RELEASE-1`); the arm is removed at the end of the chain and all four
fingerprints plus the golden races are re-run in the closing checks.

## SOURCE HYGIENE

**No repository file changed by this piece.** The instrument is a patched copy of
`scripts/diag/comeback-beats.mjs` living in the session scratchpad, because it calls the temporary
`__setHoldArm` — leaving a committed tool depending on an arm that is about to be removed would
break that tool.

**Reused, not rebuilt:** `comeback-beats.mjs` entire (the plan delivery through `setCameraPlan`, the
pure-read `best()` call that separates the detector's gates from the director's contest, the
browser's outcome-window arm), `scripts/lib/raceDriver.mjs`, the hold arm from COMEBACK-RELEASE-1,
and the shipped track seeds.

**Noticed and left, outside this piece:** the director's contest is where the shots are actually
lost, and no cooldown or weight was touched to find out which term dominates.
