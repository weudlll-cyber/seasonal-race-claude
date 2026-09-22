# GROUP-BRAKE-SWEEP-1 — stage 1, N=30 per arm

**GROUP-GAP-BRAKE-1, §E. 2026-09-22. Branch `feat/group-gap-brake-1`. ★★ NOTHING MINTED, NOTHING
MERGED — §G stands.** The mechanism is built and behind one key that defaults to today's behaviour;
this is the first measurement of what it does when the key is on.

Harness `reports/night/group-brake-data/group-brake-sweep.mjs`, data `sweep-n30.json` and
`sweep-n30-abl.json`. **10 tracks × 3 seeds = 30 races per arm, 150 races in all.** Every number
below carries its N. The breakaway definition, the 157.05 px threshold, the fixed `[0.70, finish]`
window and the detection cap of 5 are BREAKAWAY-COUNT-2's, unchanged, so the control is comparable
to its 16.0%.

---

## ★★ THE HEADLINE, AND THE PARADE ANSWER BESIDE IT — NOT BELOW IT

**NO ARM REDUCED THE OWNER'S BREAKAWAY SHARE.** Control 6 of 30 (20.0%). A50 4 of 30 (13.3%), A65 7
of 30 (23.3%), A80 8 of 30 (26.7%), ABL 7 of 30 (23.3%). **Every Fisher two-sided p against the
control is ≥ 0.73** — at N=30 all four arms are UNDECIDED, never "unchanged", and three of the four
point the wrong way.

**AND TWO ARMS ARE ALREADY PRODUCING THE PARADE.** Position changes inside the leading group, per
1000 frames the brake could act on, against the control's 4.45:

| arm | in-group changes | expected at control's rate | Poisson P(X ≤ k) | reading |
|---|---|---|---|---|
| **A80** | **3** | 8.8 | **0.024** | ★ PARADE — fails on the owner's rule |
| **ABL** | **8** | 14.8 | **0.041** | ★ PARADE — fails on the owner's rule |
| A50 | 12 | 18.4 | 0.078 | leaning that way, undecided |
| A65 | 19 | 17.4 | 0.705 | holds the control's rate |

★ The owner's rule is that an arm which drives in-group position changes toward zero **has produced
the parade and fails, whatever it did to the gap.** A80 and ABL do that at N=30 and they did not buy
a smaller gap with it — both made the share worse. **A65 keeps the fighting and changes nothing
else.** A50 is the only arm that moved the share in the right direction, and it is also leaning
toward the parade; neither of its two signals is decided at this N.

**So there is no arm that beats the control on the gap, and the two arms that most quieten the
group are the two that most enlarge it.**

---

## THE TABLE — control against three candidates and the ablation

All five arms, N=30 races each (10 tracks × 3 seeds, same seeds throughout).

| | CONTROL | A50 (111.2 px) | A65 (124.9 px) | A80 (146.7 px) | ABL (leader-only, 124.9) |
|---|---|---|---|---|---|
| **his breakaway share** | **6/30 = 20.0%** | **4/30 = 13.3%** | **7/30 = 23.3%** | **8/30 = 26.7%** | **7/30 = 23.3%** |
| — Fisher p vs control | — | 0.731 | 1.000 | 0.761 | 1.000 |
| **the five-or-more floor** (refused by design) | 1 of 6 | 0 of 4 | 1 of 7 | 1 of 8 | 1 of 7 |
| group size at the crossing | 2,2,3,3,4,5 | 1,2,2,3 | 1,1,2,2,2,3,5 | 1,1,2,2,2,2,3,5 | 1,1,2,2,2,3,5 |
| — of those, a LONE leader | **0 of 6** | 1 of 4 | 2 of 7 | 2 of 8 | 2 of 7 |
| median in-window peak gap (px) | 115.7 | 127.5 | 129.7 | 129.7 | 129.7 |
| held above half its peak, median | 13.87 s (n=6) | 13.60 s (n=4) | 14.13 s (n=7) | 10.21 s (n=8) | 9.47 s (n=7) |
| never closed by the finish | 3 of 6 | 1 of 4 | 2 of 7 | 4 of 8 | 2 of 7 |
| **in-group changes, ABOVE the floor** | 21 / 4719 fr = 4.45 per 1k | 12 / 4133 = **2.90** | 19 / 3906 = 4.86 | 3 / 1987 = **1.51** | 8 / 3328 = **2.40** |
| **in-group changes, AT the floor** | 4 / 940 fr = 4.26 per 1k | **0** / 368 (1.6 exp.) | **0** / 235 (1.0 exp.) | **0** / 255 (1.1 exp.) | **0** / 361 (1.5 exp.) |
| races the brake fired in | 24 of 30 ‡ | 15 of 30 | 13 of 30 | 8 of 30 | 13 of 30 |
| frames engaged | 5659 ‡ | 4501 | 4141 | 2242 | 3689 |
| — of those, a member at `minMult` | 16.6% | 8.2% | 5.7% | 11.4% | 9.8% |
| **median commanded multiplier while engaged** | 0.9507 ‡ | 0.9487 | 0.9668 | 0.9737 | 0.9743 |
| band arrival (fairness gate ≥ 70%) | 88.2% (1034/1172) | 89.2% (1046/1172) | 88.9% (1043/1173) | 88.4% (1035/1171) | 88.7% (1039/1171) |
| lead changes, whole race (median) | 58 | 58 | 58 | 58 | 58 |
| lead changes in `[0.70, finish]` (median / total) | 3 / 87 | 2 / 77 | 2 / 80 | 2 / 81 | 2 / 75 |

**‡ THE CONTROL'S ENGAGEMENT COLUMNS ARE NOT LIKE FOR LIKE, AND MUST NOT BE READ AS IF THEY WERE.**
With the key off the brake that fires is the SHIPPED one, reading leader-to-second against a 56 px
allowance. It fires in more races and for more frames than any candidate because its allowance is
half theirs and its input is a different distance. The candidate columns compare cleanly with each
other; against the control they answer "how often does A brake at all", not "does A brake more than
today".

**Band arrival clears the ≥ 70% gate on every arm** and the five values sit inside one percentage
point of each other, so nothing here is bought or lost against fairness at this N. Whole-race lead
changes are identical at 58 on every arm; the in-window count falls from a median of 3 to 2 on all
four braked arms (totals 87 → 77/80/81/75), which is the same parade signal seen from outside the
group and it is present even on A65.

---

## ★★ THE FLOOR FINDING — a product fact, and its consequence is MEASURED

The engine's 15% floor comes first. `minMult` is 0.85, it is the owner's standing bound, and the
brake must not breach it: the fold is `Math.max(minMult, rawTarget * scale)`. A member the servo has
already commanded to 0.85 therefore **cannot be moved by the brake at all**, and a member just above
0.85 can be pushed onto it. BREAKAWAY-LEVER-1 measured the servo holding a racer at the floor on
41.6% of growing frames, so this is not a corner case.

**THE CONSEQUENCE, MEASURED RATHER THAN ARGUED.** Splitting every engaged frame by whether any group
member sat at the floor that frame:

- **Above the floor**, the group still changes order on all five arms — 21, 12, 19, 3 and 8 changes.
- **At the floor, across all four braked arms pooled, there were 0 position changes in 1219 frames.**
  At the control's own at-the-floor rate of 4.26 per 1000 frames, 5.2 were expected.
  **Poisson P(X ≤ 0) = 0.0056.**
- The control, with the same floor and no group brake, does change order at the floor: 4 changes in
  940 frames.

So the flattening at the floor is the proportional brake's, not the floor's alone: where the floor
holds one member fixed, multiplying the others' commands moves them toward that member rather than
past him, and the order stops changing. ★ **That is the owner's 15% bound working as specified, and
it is also the mechanism's sharpest limitation.** Per the brief, no remedy is proposed here.

**A second consequence, same cause, visible in the table.** In the control, no breakaway crossed the
threshold as a LONE leader — every one of the 6 was a group of 2 to 5. Under the braked arms 7 of 26
crossings were a lone leader. Proportional braking preserves order but keeps the internal gaps
opening (each member keeps its own share of a reduced speed), so a braked trio tends to string out
into a leader with the rest strung behind him, and the brake's own input then switches to a gap
INSIDE the former group. Small N — 0 of 6 against 7 of 26 — and stated as an observation to be
settled at stage 2, not as a result.

---

## ★★ WHAT WENT WRONG TWICE BEFORE THESE NUMBERS EXISTED

Both are the same defect shape — something declared, nothing reaching the engine, and an arm that
reads as measured. Both are recorded here because the report is the durable record.

**1. THE FIRST STAGE-1 SWEEP RETURNED ALL FIVE ARMS BYTE-IDENTICAL.** `raceCore.js:290` copies brake
keys into the plan config explicitly, one at a time, and the two new keys were not in that list, so
`createRacePlan` saw `undefined`, so the `=== true` check was false and every arm ran the shipped
path. Fixed in `f2713fcb`; unit tests could not have caught it because they call `createRacePlan`
directly and never traverse that copy. (This clause is written out here because the one in
`f2713fcb`'s own message was corrupted by shell substitution when the commit was made, and the
commit was deliberately not amended.)

**2. THE ABLATION ARM NEVER RAN EITHER.** After that fix the four config arms separated correctly,
but ABL and A65 were still byte-identical on all 30 rows — the arm table carried `leaderOnly: true`
and `worldFor()` only ever read `on` and `allowed`. The "ablation" was a second run of A65 wearing
its name. ★ Braking only the leader off the GROUP input is not a config the product has or should
have (§D: ONE key), so ABL is now a patched-tree measurement driven by `abl-run.mjs`: it applies one
line (`members = sel.members` → `members = [sel.members[0]]`, which is sabotage 2 of
`gapBrakeGroup.test.js` and proven semantic there), runs the arm, restores the tree and verifies the
restoration byte-for-byte. The harness now THROWS on a leader-only arm unless that runner set the
environment variable, so the flag can never again read as "ran".

Only the ABL column was ever void. The control and the three candidates in the table above ran the
real mechanism, differ from one another, and stand.

---

## THE RECOMMENDATION — a recommendation, not a decision

**I would ship none of them as they stand, and if one must be carried forward it is A50 (111.2 px),
because it is the only arm that moved the owner's share in the right direction and the only one that
did so without a significant loss of fighting inside the group.** A65 and A80 and the ablation each
either left the share alone or enlarged it, and A80 and ABL bought their quiet directly out of the
in-group position changes, which is the failure the owner named in advance.

**Stage 2, per §E, runs only the arms that beat the control: CONTROL and A50 at N=300.** A65, A80
and ABL are not carried forward — A65 changed nothing, and A80 and ABL fail the parade rule at N=30
while making the share worse. Stage 2 is the one that can answer whether A50's 13.3% is real, since
6 against 4 races out of 30 cannot be.

---

**ALL FOUR FINGERPRINTS RE-MEASURED ON THE BRANCH TIP AFTER THE SWEEP**, each by its own reproduce
command out of `docs/fingerprints.json`, and all four match the record: `world b6cfd1daf1756f61`,
`world-off 744bec11644978bb`, `camera 0102dd2eab95b71f`, `render ec817639269a8a4e`. ★ That is also
an independent check on `abl-run.mjs`: the ablation patches `racePlanner.js` and restores it, and a
tree that had not come back exactly would have moved `world` here. The runner's own byte comparison
and `git status` both said clean, and this says it a third way, from the engine.

**★★ DO NOT MERGE, DO NOT MINT — this ends at the owner's eye.**
