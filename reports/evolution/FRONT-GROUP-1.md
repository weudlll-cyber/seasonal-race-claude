# FRONT-GROUP-1 — the front group bounds the tightening

**Branch:** `feat/front-group`, off `master` at `86d542f0`. **Not merged. Nothing minted.**

The owner, watching a race with about six racers nearly level: zooming all the way to the
photo-finish zoom loses racers out of the shot. He asks that the tightening stop while the whole
front group is still in frame, and continue only as they converge.

---

## 1. What already exists — and the brief's premise was wrong about it

**The company guarantee has not "retired before the ending". It was never running there at all.**
`_companyCeiling` opens with `if (framingFor(this.state).guarantee === GUARANTEE.PAIR) return
Infinity;` — and the PAIR states are BATTLE_ZOOM, LEAD_CHANGE and PHOTO_FINISH, which are exactly
the shots he is describing. `_companyIsHome` is a second, later retirement and never gets a chance
to matter here.

**The exclusion was an argument, not a measurement.** CAMERA-COMPANY-1 §5: "the pair states already
guarantee two named contenders, which _is_ company … adding a headcount there would fight a
guarantee that is already doing the job … whenever the field is strung out behind a close duel."
The case it did not consider is his: the field **not** strung out — six nearly level, of whom the
pair guarantee protects two and says nothing about the other four.

**So reviving is not the move; the computation is reused and only the policy is new.**
`companyGuarantee` already answers precisely this question — the tightest zoom at which N racers
around an anchor are still in frame, measured from where the anchor actually sits, per-axis and
orientation-aware. It is called unchanged. What is new is _who_ it is asked about and _when_.

**It introduces no new number.** The front group is the leader plus everyone within
`battlePulkThresholdT` of him in lap-normalised arc, capped at `battleMaxGroupSize` — both shipped
keys, and both already this camera's answer to "are these racers together". The arc unit exists
because world px meant 1.5% of a lap on one track and 4.9% on another. **`detectPulkGroup` could not
be reused**: its third condition demands the frontmost member be at rank 3 or worse, because P1/P2
are LEADER territory, so it excludes the front by construction. The unit and the thresholds
transfer; the function does not.

## 2. Membership does not churn — counted, not asserted

FINISH-PAIR-1 exists because a guaranteed set was re-sorted every frame and every swap moved the
picture. So membership is **captured once**, at the frame the endgame window opens, and stored as
INDICES (the object-identity trap: `renderInterpolation` hands the director spread-copies).

| definition                       | membership changes over the window, 27 races |
| -------------------------------- | -------------------------------------------- |
| recomputed live every frame      | **597**                                      |
| captured once (shipped)          | **0**                                        |

Thereafter it can only lose members, as they finish — a monotone retirement, never a reordering. A
test reverses the front six along the track, a total reordering with every rank changed, and asserts
the capture does not move.

## 3. What it does

**Before, all ten tracks × 3 seeds** (`scripts/front-group-truth.mjs`): the shot loses at least one
front-group racer on **2355 of 7441 photo-finish frames — 31.6%**. On city-circuit seed 5601 it
holds **none** of the six. On his own race, ice-track seed 9, the front group is exactly **six** and
it loses one on 62 of 274 frames.

**After: 517 of 7441 — 6.9%.** The MEDIAN is the whole group on every measurable race; the four
races that sat at 3, 4, 4 and 5 are all at 6.

| race             | min in frame | median   | frames losing one | crossing zoom      |
| ---------------- | ------------ | -------- | ----------------- | ------------------ |
| ice-track 9      | 4 → **5**    | 6 → 6    | 62 → **14**       | 17.04 → **12.59**  |
| luger-hill 9     | 4 → 4        | 4 → **6** | 145 → **21**      | 4.00 → **1.33**    |
| river-run 5601   | 1 → **4**    | 3 → **6** | 169 → **8**       | 4.00 → **1.91**    |
| seatrack 9       | 2 → 2        | 4 → **6** | 173 → **41**      | 3.87 → **1.00**    |
| searound 9       | 4 → **6**    | 6 → 6    | 82 → **0**        | 17.07 → **9.07**   |
| space-sprint 9   | 1 → **4**    | 6 → 6    | 92 → **12**       | 3.92 → **0.93**    |

**It bounds tightening only.** The floor is the running minimum of the other ceilings since the
window opened — the widest width the ending has already reached — so the bound may hold the shot
there but never open it further. **Measured: 0 frames needed it.** The "group too spread to hold at
any sane width" case did not arise on any of the 27 races, so the shot never opened toward the world
to keep a promise it could not keep.

**It does not fight the line guarantee**, because a `Math.min` over ceilings cannot: the widest ask
wins and the rest are simply not binding. Where each binds:

| window        | line  | frontGroup | state | guarantee |
| ------------- | ----- | ---------- | ----- | --------- |
| whole ending  | 55.6% | 8.5%       | 31.2% | 4.7%      |
| PHOTO_FINISH  | 55.4% | **26.4%**  | 9.9%  | 8.4%      |

Early in the run-in the line is far wider and the new bound is inert; as the leader closes, the
line's ceiling rises past it and this becomes the binding term — which is exactly the moment he is
describing.

## 4. THE COST, and it needs his ruling

**THE CROSSING SHOT IS NO LONGER THE ORDINARY SHOT.** It is 25–75% wider on almost every race — see
the table above. That is in direct conflict with RUNIN-PACE-1's standing requirement that the shot
at the crossing be the ordinary shot; a tighten-rate limit was **rejected** in that block for
breaking it by 23.83%, and this breaks it by more.

**The two asks are incompatible whenever the group has not converged by the line, which is most
races.** "Stop tightening while the front group is spread" and "arrive at the ordinary photo-finish
shot at the line" are the same knob pulled in opposite directions: the brief's expectation that it
would "reach the ordinary photo-finish shot at the line, the same self-releasing shape the line
guarantee has" holds only if they converge. The line guarantee self-releases because its target
distance goes to zero; a group's extent does not.

**Nothing here tunes that away.** It is reported, and the ruling is his: either the crossing shot
gives way to holding the group, or the bound must fade out before the line and give back part of
what it bought.

## 5. Two retirements were wrong before this one

Both were caught by `check-runin-frame`'s never-empty half, which is why that guard exists.

- **Retiring where the COMPANY guarantee retires** (`_companyIsHome`) fixed FINISH-COMPANY-1's two
  tests and left the real defect: with four of twenty home, the bound is computed against whoever of
  the captured group is still COMING, and it tightens onto them while the finish shot is aimed
  elsewhere — **84 frames with no racer on screen** on luger-hill seed 9, zoom climbing 1.4 → 2.5 as
  it chased.
- **Retiring at the first crossing as a STEP** made the ceiling jump 1.33 → Infinity on one frame
  and the target 1.33 → 4.00, and the pan could not follow: **29 empty frames**. The cure is the one
  RUNIN-GLIDE-1 already paid for — pan and zoom travel together on one ease — and the engagement
  glide is reused rather than copied.

**Now: `check-runin-frame` PASS on both halves and both arms, 0 empty frames**, centre worst 0.06
(luger-hill) / 0.94 (searound) track widths against an untouched limit of 2.

## 6. Fingerprints — measured fresh, NOT minted

| role   | stored (master)    | this branch        |
| ------ | ------------------ | ------------------ |
| world  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` — **unmoved**, re-run in full |
| camera | `c1556053b1824758` | `874b2379e8f1eed8` |
| render | `c962df5334277f95` | `9014fbe62fc31b05` |

`engine-reach --check` reports `defaults.js` CAN reach the race, so the world fingerprint was run
rather than argued about. It is unmoved: the key is a camera key.

**With `frontGroupFraming: false`, camera and render return to `c1556053b1824758` and
`c962df5334277f95` exactly** — the shipped values. Both positions of the switch are measured.

## 7. What to watch on ice-track seed 9

Through the photo finish all six of the front group should stay on screen where before the shot
closed past two of them — and the price is that the frame at the crossing is noticeably wider than
the photo-finish shot you know.
