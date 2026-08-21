# ENDGAME-COMPLETE-1 — the whole finish, graded against all twelve, every time

**Branch:** `exp/endgame-schedule`. **Not merged. Nothing minted.** Both switches default OFF.
Measured in the real browser, on the production build, with the browser's own camera seed.
**76 scorable races** — ten tracks, both field sizes, his config **and** the shipped defaults, seeds
1, 2, 3 and 9. `garden-path` does not finish at these seeds and is reported as not scorable.

---

## THE SHEET — all twelve, before and after

| # | requirement | BEFORE | AFTER |
| --- | --- | ---: | ---: |
| **1** | winner **and** line visible by 95% | 2 failing | **1 failing** |
| **2** | at the crossing, the leader-view **or** photo-finish factor | 6 failing | **0 failing** |
| **3** | the close begins early and runs slowly *(reported)* | turn p=0.9501, rate 0.303 ln/s | turn p=0.9501, rate 0.328 ln/s |
| **4** | never as wide as today's | — (this run *is* today) | **2 failing** |
| **5** | the line is always findable — **visible share of the band** | 10 failing, **164 frames with no band** | **1 failing, 3 frames** |
| **6** | worst **single frame**, never an average | 0 failing (0.0278 ln) | **0 failing (0.0371 ln)** |
| **7** | line, leader and everyone still in with a chance in frame | 4 failing | **12 failing** |
| **8** | a pause is allowed; the long standstill is not *(reported)* | 18% still, longest 11833 ms | 17% still, longest 10067 ms |
| **9** | **the winner near the middle through the crossing, never cut** | **12 failing** | **0 failing** |
| **10** | the leader's walk back through the run-in stays | 4 failing | **3 failing** |
| **11** | course always in shot; no jump; no reversal; determinism | 0 failing | **0 failing** |
| **12** | nothing before the window changes | 431642 pre-window frames | **431638** |

**Seven items improve, two regress, three hold.** Items 4 and 7 are the price, and §3 proves why
item 7 cannot be bought back.

**Item 12 is 431642 → 431638 frames** — four frames of 431 642, which is the race ending on a
different frame boundary, not a change before the window. No pre-window count moved.

**Item 8's 10-second longest run is `garden-path`**, whose race never reaches a crossing at these
seeds; excluding it the longest static run is 1433 ms.

---

## 1. What the build is

Two switches, **both default `false`** so today's behaviour is what ships:

| key | what it does |
| --- | --- |
| `contentionWatch` | built the night before — the camera keeps asking who can still win and eases off a racer the race has decided |
| `bandFloor` | **new** — the endgame's width floor guarantees the finish line inside the **subject's** own region (`innerFramePct`) rather than the company margin (`COMPANY_FRAME_PCT`) |

`bandFloor` is one existing constant swapped for another existing constant. **No new number was
added by this block.** The only number in the whole endgame that this thread introduced remains
`contentionCheckMs`, named in CONTENTION-WATCH-1.

**To see it:** set both to `true` in the camera config. **Watch space-sprint, seed 9.**

---

## 2. The attempts — one line each, with what each broke

| # | attempt | verdict |
| --- | --- | --- |
| **A1** | Size the floor on the **nearest point of the band** instead of its centre — "findable" means *some* of the band | **FAILED, and backwards.** The nearest point is closer, so it asks for **less** width, and less width shows **less** band. Identical on space-sprint (11 zero-band frames either way) and it made seatrack worse: item 1's band 61.7% → **9.0%**, widest 4.30 → 3.01 corridors. Reverted. |
| **A2** | `contentionWatch` alone | Item 9 clean, but item 5 still failing on space-sprint — 11 frames with no band. |
| **A3** | `contentionWatch` + guarantee the line inside the **subject's** region (more width, more slack) | **KEPT.** All twelve pass on the probe set; on the full sheet, items 1/2/5/9/10 improve and 4/7 regress. |
| **A4** | Never release a racer who is **still level** (`_abreastContenders`), to buy item 7 back | **FAILED, and it cost the moment.** On the ten hardest races item 7 still failed 4, and it broke item 9 on two — **city-circuit put the winner at x = 0.105, 24 cut frames** — and item 2 on two. Strictly worse than A3. Reverted. §3. |

---

## 3. The one proven conflict: item 7 against item 9

**They cannot both hold, and the exchange rate is measured.**

Item 7 grades "still in with a chance" by `_abreastContenders` — **geometric**, within one body
length of the leader *now*. The contention watch grades it by **projection** — can he still reach the
line first. A racer can be within one body length and still, on the evidence visible on track, have
lost.

| holding him (A4) | releasing him (A3) |
| --- | --- |
| the frame is pulled back onto him | he eases out of the framing |
| **item 9 breaks: the winner at x = 0.105, 24–25 cut frames on city-circuit seeds 1 and 3** | item 7 breaks: **12 races of 76**, and in every one the count is **exactly one racer**, at the frame edge |
| item 2 also breaks on 2 of 10 | item 2 clean on all 76 |

**The trade taken is A3, and the reason is his own sentence:** *the winner's crossing is the moment of
the race and must be presented as such.* One racer at the edge of the frame is a smaller failure than
the winner in the corner — which is the frame he photographed and rejected.

**This is his to overturn.** If a racer within one body length must never leave the frame, item 9 goes
back to failing on 12 races and the corner returns; the lever is one condition in
`_updateContentionWatch` and it is written up in A4.

---

## 4. Item 4, the other regression

Widest frame **10.56 → 13.57 corridors**, failing on **2 races of 76** — city-circuit seed 9
(8.47 → 10.89) and dirt-oval seed 3 (10.56 → 13.57). The cause is A3 itself: guaranteeing the line
inside the tighter region asks for more width, which is exactly what bought item 5's 164 frames down
to 3.

**Item 4 and item 5 pull in opposite directions and the sheet shows both.** 161 frames where the
viewer could not see the finish at all, against two races opening 29% wider than the widest frame
today. I took the band; the sheet says plainly what it cost so the choice is visible rather than
buried.

---

## 5. The instrument

`scripts/endgame-sheet.mjs` grades all twelve from one pass of a race's own frames and prints them as
one screen. `viewer-invariants.mjs` calls it on **every** race, so from here a change can never again
be judged on the item it was aimed at.

**It grades the picture.** Items 3 and 8 are **reported, not gated** — his requirement 8 makes the
pause a cost to minimise, not a fail, and item 3 has no bound to gate against. Item 12 is graded by
comparing two runs. Where a number is a proxy the row says so; the sheet asserts its own constants
are readable and stops the run if they are not, which is the lesson of the NaN table that once
printed FINDABLE on every track while measuring nothing.

**His two screenshots are named tests.** Item 9 fails **before** on both the space-sprint corner and
every race like it (12 of 76) and passes **after** (0 of 76), and the crossing check carries its own
sabotage arms — `--sabotage-corner` 0 → 77, `--sabotage-noline` 0 → 2.

---

## 6. Fingerprints, tests, hygiene

Both switches default `false`, so no shipped behaviour changes and no fingerprint can move. **All
four measured to confirm rather than asserted:**

| role | recorded | measured | |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | unmoved |
| world-off | `854018ee5d3d83e1` | `854018ee5d3d83e1` | unmoved |
| camera | `9190967072af639e`¹ | `9190967072af639e` | unmoved |
| render | `2e8eae1d5ef7c7be`¹ | `2e8eae1d5ef7c7be` | unmoved |

¹ the values VIEWER-INVARIANTS-2 measured and did not mint; nothing on this branch has been minted.

**Camera suite 894 passing.** Sweep cost: 76 scorable races per sheet, ~75 minutes at ten at a time.

---

## 7. What is still open, stated rather than left to be discovered

1. **Item 7 against item 9** — §3. His call, one condition.
2. **Item 4 against item 5** — §4. His call, one constant.
3. **Item 1 on `shipped/city-circuit` seed 2** — one race of 76 still fails the deadline; not
   diagnosed here.
4. **Item 10 on three races** — the leader's walk does not go behind centre on
   `shipped/seatrack/1`, `shipped/mountainstreet/1`, `shipped/river-run/2`. Was 4 before, is 3 now;
   not diagnosed here.
5. **The defaults are still off.** Turning them on is two lines and, per the ship ceremony, his eye
   first.
