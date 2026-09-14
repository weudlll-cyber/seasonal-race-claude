# QUICKTEST-ICE-3 — the brake fired and cut the gap it measures by 14%; what he is looking at is a different gap

**Read-only.** No source file was changed, nothing minted, nothing merged. Measured on
`feat/gap-leader-brake` at `2a6b4ee3` (engine identical to the served `204dd30c`). Date: 2026-09-14.

---

## THE ANSWER IN TWO LINES

**The brake was not silent.** It fired on **513 steps**, from **progress 0.839 to 0.941** — inside the
window and, as he says, well before 95% — all of them on Flare, and it cut the lead it measures from
**196.6 px to 169.0 px (−14%)**.

**But his screenshot is not showing that gap.** The distance from Flare to the pack is **518.5 px**,
three times larger, and the brake does not act on it: it moved **529.1 → 518.5 px, −2%**.

---

## STEP 1 — IT REPRODUCES, AND HOW THE FIELD WAS ESTABLISHED

The Quick Test path builds its field at [SetupScreen.jsx:999-1016](../../client/src/screens/SetupScreen/SetupScreen.jsx#L999-L1016):
racer type from `track.defaultRacerTypeId || 'horse'`, `needed = quickTestCount − players.length`,
fill names from `resolveNameSet(quickTestNameSet)` minus names already present, laps from
`trackDefaultLaps(track)` ([durationModel.js:250-257](../../client/src/modules/durationModel.js#L250-L257)).
The seed is the typed value, resolved at [quickTestSeed.js:96-98](../../client/src/screens/SetupScreen/quickTestSeed.js#L96-L98).

★ **One input cannot be read from here.** `players` starts empty and is filled only from a one-shot
handoff in the operator's own browser storage ([SetupScreen.jsx:215-222](../../client/src/screens/SetupScreen/SetupScreen.jsx#L215-L222)).
**His store does not contain the race either** — `races.sqlite` has mtime 15:42:29 and the eye-test
build was served at 18:52, so nothing was written after it (proof below). So the field size was the
remaining unknown, and it was **raced and checked against his description rather than assumed**:

| candidate | Flare in field | Raven in field | leads after p=0.60 | at the widest lead-to-pack |
|---|---|---|---|---|
| N=20 | yes (index 16) | **no** (index 36) | Dash 621 steps, Flare 493 | 1st Blitz, 2nd Bolt |
| **N=40** | yes | **yes** | **Flare 1193 steps**, Apex 711 | **1st Flare, 2nd Raven** |

**N=20 is excluded outright — Raven is not in that field at all.** N=40 matches four independent
details of what he described: Flare leading, Raven second, both present, and the moment well before
0.95. That is the race reported below.

★ **And it is the same race as the sweep's ice-track seed 3.** The Quick Test fill list's first 40
names are the same list the sweep fixture uses, so the two coincide at N=40 — the figures here
(196.6 → 169.0 px) are the same ones GAP-BRAKE-ARRIVAL-1 reported for that seed.

| | first 8 finishers |
|---|---|
| **ON** | **Flare**, Bolt, Apex, Orbit, Breeze, Raven, Titan, Pixel |
| **OFF** | **Flare**, Bolt, Apex, Breeze, Orbit, Pixel, Surge, Nova |

**Flare wins on both arms.** He leads 1193 of the steps after p=0.60 on the ON arm.

**Instrument control:** physics stepped directly, one observation per step, **40/40 positions and
40/40 finishing times against `runRace` on both arms**.

---

## STEP 2 — THE TWO GAPS, AND WHICH ONE HE IS LOOKING AT

World px is the primary column throughout. Window as resolved by the engine: **0.600 – 0.95**.

### Whole race

| arm | rank1→rank2: med / p90 / **max** | at p | rank1→**PACK**: med / p90 / **max** | at p |
|---|---|---|---|---|
| OFF | 25.1 / 152.5 / **196.6** | 0.926 | 165.6 / 507.8 / **529.1** | 0.896 |
| ON | 25.3 / 136.3 / **169.0** | 0.924 | 166.1 / 488.2 / **518.5** | 0.857 |

### Inside the window, 0.600 – 0.95

| arm | rank1→rank2: med / p90 / **max** | at p | rank1→**PACK**: med / p90 / **max** | at p |
|---|---|---|---|---|
| OFF | 62.0 / 189.5 / **196.6** | 0.926 | 332.4 / 523.2 / **529.1** | 0.896 |
| ON | 62.0 / 168.9 / **169.0** | 0.924 | 338.5 / 508.1 / **518.5** | 0.857 |

### 0.95 → finish (the run-out, where the brake has no authority)

| arm | rank1→rank2: med / p90 / **max** | rank1→**PACK**: med / p90 / **max** |
|---|---|---|
| OFF | 82.1 / 127.8 / **139.4** | 472.8 / 493.0 / **497.8** |
| ON | **41.7** / **90.8** / **102.5** | **438.6** / **459.0** / **464.8** |

★ **Which one his screenshot shows: the PACK gap.** He describes "Flare well clear of the field with
Raven between him and the pack" — that is one racer at ~169 px and then open track to a bunch at
~518 px. The two quantities differ by a factor of **3.1**, and **the brake measures only the first**:
its trigger is `(leader.t − active[1].t) * pathPx` at
[racePlanner.js:762](../../client/src/modules/racePlanner.js#L762) — the gap to the racer in **second
place**, not to the field.

### Canvas widths, secondary — and the conversion reverses the sign again

| | world px OFF → ON | camera at that moment, px per width | canvas widths OFF → ON |
|---|---|---|---|
| rank1→rank2 max | 196.6 → **169.0** (−14%) | 323.6 → 273.0 | 0.608 → **0.619** (+2%) |
| rank1→PACK max | 529.1 → **518.5** (−2%) | 293.3 → 344.5 | 1.804 → **1.505** (−17%) |

**Both rows disagree with their world-px counterpart.** The gap that genuinely shrank by 14% reads as
2% *worse* in his unit because the camera had zoomed in; the gap that barely moved reads as a 17%
improvement because it had zoomed out. This is the third time in this work the conversion has flipped
a sign, and it is why world px is the primary column.

---

## STEP 3 — THE BRAKE DID ACT

| | |
|---|---|
| in-window leader steps | **1648** |
| steps it fired on | **513** (31.1% of them) |
| from → to | **p=0.839 → p=0.941** |
| on which racer | **Flare, all 513 steps** |
| commanded | median **0.945809**, deepest **0.945571** |
| the floor | 0.85 — **never approached** |
| `held − target`, median | **0.000000** — the command arrives (GAP-BRAKE-ARRIVAL-1) |
| steps commanded `< 1.0` while holding `> 1.0` | **101 of 513** |

The deepest command is **0.9456**, a 5.4% slowdown, nowhere near the 0.85 floor: his lead reached
169 px against a 124 px allowance, which is 36% over, and the ramp spans one full allowance. So
the brake was working at roughly a third of its available authority.

The 101 steps still holding above 1.0 while commanded below it are the **pre-existing servo churn**
GAP-BRAKE-PARADOX-1 measured and GAP-BRAKE-ARRIVAL-1 deliberately did not touch — on the OFF arm of
this same race the servo misses its own target on 214 of 535 leader steps.

---

## STEP 4 — WHAT ACTUALLY CHANGED

| | |
|---|---|
| winner | **Flare on both arms — unchanged** |
| finishing order | 16 of 40 positions identical, 9 of 40 times |
| steps identical from the start | **3961 of 5022 (78.9%)** — they diverge only when the brake first commands |
| largest rank1→rank2 lead | OFF **196.6 px** at p=0.926 → ON **169.0 px** at p=0.924 |

### His screenshot moment, located as closely as the record allows

Flare 1st, Raven 2nd, lap 2 — that configuration holds for **773 steps on each arm**, p 0.752–0.926
(OFF) and 0.752–0.924 (ON). At its widest:

| arm | at p | rank1→rank2 | rank1→**PACK** |
|---|---|---|---|
| OFF | 0.896 | 189.2 px | **529.1 px** |
| ON | 0.857 | 161.5 px | **518.5 px** |

**At the moment he photographed, the brake had already taken 27.7 px off the gap to Raven and 10.6 px
off the gap to the pack.** The picture he objected to is the second number, and it is essentially
unchanged.

---

## READ-ONLY PROOF — THE OWNER'S STORE

The store was **never opened** this block — only `stat` and `sha256sum` were taken, which is what
established that his race is not in it.

| | size (bytes) | mtime | sha256 |
|---|---|---|---|
| **before** | 245760 | 2026-09-14 15:42:29.972346500 +0200 | `59785c09…b179f69e` |
| **after** | 245760 | 2026-09-14 15:42:29.972346500 +0200 | `59785c09…b179f69e` |

Unchanged. No `-wal`/`-shm` sidecars. **That mtime is 15:42, and the eye-test build was served at
18:52** — which is how this block established that the race he watched was never stored, and why the
field size had to be established by racing the candidates instead.

---

## IF THE READING POINTS AT A SETTING

It points at the **quantity**, not a value: the brake's trigger is the gap to second place
([racePlanner.js:762](../../client/src/modules/racePlanner.js#L762)) while the picture he is judging
is the gap to the pack, which is 3.1× larger here and which no setting of `gapBrakeAllowedGapPx` or
`gapBrakeWindowEnd` can reach. Nothing was changed.

---

## WHAT I NOTICED AND DELIBERATELY LEFT ALONE

- **`players` remains unreadable from here**, so this reproduction is the empty-roster case. It is
  corroborated by four details of his description and by finishing first on both arms, but if his
  SetupScreen carried a loaded group the field would differ and every number above would be about a
  different race. Stated rather than glossed.
- **The three uncommitted eye-test lines** in `defaults.js` are still in the working tree and the
  three services are still serving that build. This block measured from a scratch checkout of the
  committed HEAD with both arms set explicitly, and left them alone.
- The standing items are unchanged: the dead front leash, `raceCore.js:679-683` omitting
  `governorMult` from the diagnostic `vt`, the "SIM-ONLY" and "default OFF" stale comments,
  `docs/FORCE-MAP.md`'s four stale windows, and `sim-fairness.mjs` being unable to exercise the brake.
