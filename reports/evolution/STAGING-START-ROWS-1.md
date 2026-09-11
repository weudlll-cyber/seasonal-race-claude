# STAGING-START-ROWS-1 — the staging costs the start rows nothing, because it never fires; and luger-hill was already unfair

2026-09-11 · branch `night/2026-09-11` · piece 2 of the night chain · **measurement only. Nothing
changed, nothing tuned, nothing minted.** `docs/FAIRNESS.md` is canonical and every number below is
its own.

---

## 0 · ★ THE COMPARISON THE PIECE WAS SET UP TO MAKE IS ANSWERED WITHOUT A SECOND ARM

The brief asked for the staged arm against the control, same races. ★ **COMEBACK-STAGED-1 established
that the staged arm never fires** — `feasibleTiming` refuses the staged curve in 8 of 8 candidates at
every field size — and the proof is not an argument but a measurement: **the world fingerprint is
UNMOVED (`8a1977187e9c99b4`) and the golden races PASS.**

★ **Byte-identical races have byte-identical start-row statistics.** Running 3 000 more races to
confirm that would have been three quarters of an hour spent proving an identity, so **one arm was
run and the difference is reported as exactly zero by construction** rather than measured twice.

★ **What the sweep WAS spent on is the question the brief actually cares about**: *"say for each
unfair track whether it was unfair BEFORE"*. That needs a clean baseline on today's tree, and there
now is one.

---

## 1 · METHOD

`docs/FAIRNESS.md`'s own construction, nothing invented: each track's **`defaultRacerTypeId` read
from `server/seeds/tracks/`** — never hardcoded, and garden-path is `beetle` — 40 racers, 60 s,
**seeds 1–6 × 50 races = 300 races per track, 3 000 in all**, race plan on. Start-row test is the
sim's **native `computeFairnessStats`** (χ² of wins-by-row against the row-size-weighted fair share),
pooled to **one test per track**, then **Holm across the ten**.

★ **A method error from an earlier attempt is not repeated here.** Sixty separate 50-race tests is a
different and under-powered measurement; the canonical gate pools 300 races into one test per track.

---

## 2 · ★ START-ROW BIAS — ONE TRACK IS UNFAIR, AND IT IS NOT THIS CHANGE'S

| track | races | rows | χ² | raw p | Holm α | verdict |
|---|---|---|---|---|---|---|
| ★ **luger-hill** | 300 | 5 | **23.100** | **1.562e-4** | 5.00e-3 | ★ **UNFAIR** |
| seatrack | 300 | 3 | 4.987 | 8.055e-2 | 5.56e-3 | fair |
| dirt-oval | 300 | 4 | 6.133 | 1.036e-1 | 6.25e-3 | fair |
| ice-track | 300 | 4 | 5.840 | 1.179e-1 | 7.14e-3 | fair |
| searound | 300 | 7 | 10.116 | 1.189e-1 | 8.33e-3 | fair |
| space-sprint | 300 | 3 | 2.262 | 3.232e-1 | 1.00e-2 | fair |
| mountainstreet | 300 | 2 | 0.120 | 7.269e-1 | 1.25e-2 | fair |
| river-run | 300 | 2 | 0.120 | 7.269e-1 | 1.67e-2 | fair |
| city-circuit | 300 | 4 | 1.200 | 7.564e-1 | 2.50e-2 | fair |
| garden-path | 300 | 3 | 0.460 | 7.963e-1 | 5.00e-2 | fair |

★ **HOLM-UNFAIR ROWS: 1 of 10 — luger-hill, and it is a property of the tree as it stands.**

### ★ IT REPRODUCES DIGIT FOR DIGIT, WHICH IS WHY IT CAN BE TRUSTED

An independent run on a different branch on a different day gave **χ² 23.100, p 1.562e-4** for
luger-hill. This run, from a fresh sweep on a branch taken off master, gives **χ² 23.100, p 1.562e-4**.
**The same number twice, by construction of the seeding, is what makes "already unfair" a fact rather
than a recollection.**

### ★ AND THIS ANSWERS LAST NIGHT'S ATTRIBUTION, WHICH IS THE POINT OF THE PIECE

`night/2026-09-10`'s casting change turned **dirt-oval** Holm-unfair (χ² 6.133 → 12.933). On today's
tree dirt-oval sits at **χ² 6.133, p 0.104, fair** — the identical baseline value. **So that piece's
dirt-oval column was genuinely its own doing, and its luger-hill column was not.** Both halves of
that attribution are now confirmed against a baseline rather than asserted.

★ **luger-hill is reported as a NUMBER, not as a gate.** It is red on master today, with nothing from
this chain in it. Nothing was tuned; what causes it is not established here and is not guessed at.

---

## 3 · BAND-REACH — THE OWNER'S ACTUAL RULE, AND IT IS COMFORTABLE

`docs/FAIRNESS.md`'s rule is that a racer who draws a place **reaches** it. It says nothing about the
route — which is why a hold is not a fairness violation, and no arm was weakened on that account.

| track | B1 | B2 | B3 | B4 |
|---|---|---|---|---|
| city-circuit | 86.9 | 87.2 | 85.1 | 94.2 |
| dirt-oval | 83.9 | 84.2 | 83.8 | 94.5 |
| garden-path | 87.7 | 88.4 | 85.9 | 94.3 |
| ice-track | 86.5 | 87.8 | 86.0 | 94.2 |
| luger-hill | 90.5 | 90.3 | 88.6 | 95.7 |
| mountainstreet | 86.0 | 87.2 | 85.5 | 94.2 |
| river-run | 87.3 | 88.3 | 86.1 | 94.4 |
| searound | 86.8 | 86.6 | 85.2 | 94.6 |
| seatrack | 87.8 | 89.0 | 87.6 | 95.0 |
| space-sprint | 89.5 | 89.6 | 88.1 | 95.5 |
| ★ **POOLED (120 000 rows)** | **87.3** | **87.9** | ★ **86.2** | **94.7** |

★ **Tightest zone 86.2% against the 70% line — PASS, with sixteen points of margin, and every track
individually ≥ 83.8%.**

★ **For the comebacker specifically:** a cast comebacker is by construction a **B1-target** racer, so
his band-reach is the B1 column — **87.3% pooled.** He reaches his drawn place as often as anyone.

★ **Note what that does NOT say.** Band-reach is about reaching the drawn PLACE. COMEBACK-STAGED-1
measured that today's comebacker still **loses places after the 0.70 release** and reaches the top 5
in 12 of 53 at N=30. **Both are true at once**: the plan gets people to their drawn band, and the
comeback story inside that is not being told. They are different properties and this piece measures
only the first.

★ **AND LUGER-HILL IS THE BEST TRACK ON BAND-REACH (88.6–90.5%) WHILE BEING THE ONLY START-ROW-UNFAIR
ONE.** The two measures disagree on the same track, which is a reason to keep reporting both and not
to collapse them into one verdict.

---

## 4 · CHECKS

```
node scripts/engine-reach.mjs --check reports/evolution/STAGING-START-ROWS-1.md

ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): reports/evolution/STAGING-START-ROWS-1.md
```

| | |
|---|---|
| world fingerprint | `8a1977187e9c99b4` — **UNMOVED** |
| golden races | **PASS** |
| `npm run verify`, plain | **PASS 23 · FAIL 2** — both reds are piece 4's camera/render values awaiting his word |

★ **A HONEST NOTE ON THE SWEEP ITSELF.** Three tracks first came back at 250 races because a
background shell exited before its last seed finished; the missing cells were re-run and **every
track in the table above has its full 300.** The under-filled reading gave luger-hill the same
χ² 23.100, but the table is the complete one.

**Nothing changed. `git stash` was not used. No `--no-verify`. The sweep output stayed in the
scratchpad.**

---

## 5 · WHAT IS OPEN

- ★ **luger-hill's start-row bias is red on master today** and nothing in this chain caused it. What
  causes it is not established, and finding out is its own piece.
- The staging cannot cost the start rows anything until it fires at all — see COMEBACK-STAGED-1 §3.
