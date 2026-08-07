# ROLL-CALL-PAIRING-1 — a name must point at its racer

> **NOT SHIPPED.** Built on the roll call, which is also not shipped. Landed on master as history by
> CLEANUP-BEFORE-NUMBERS-1 after the owner chose the race-number design. Nothing below runs in the
> game.
>
> **What is worth reading, and it is the most transferable finding of the four:** a label centred on
> its racer only POINTS at it while the label is about one racer wide. With realistic names it spans
> a handful of racers and identifies none of them. That is why the race-number design exists, and it
> is a fact about labels of any kind — it will apply again to anything wide enough.
>
> Also measured here: marking alone (dimming everyone else) leaves 74-100% of labels still
> ambiguous, and pairing is a LONG-NAME problem rather than a crowded-formation one — a one-wave
> formation at 30 racers was 100% ambiguous.

**Branch** `feat/roll-call-pairing-1` off `feat/start-sequence-1` · 2026-08-07 · **not merged, not
minted**

The roll call passed its own acceptance test and was still wrong. It delivered every name readable
and none forgotten, against a requirement that was never readability — it was always that a viewer
can **find his racer**. Nothing had ever measured pairing. This block measures it and fixes it.

---

## 1. Conformity, element by element

| the spec asked                                                    | done | note                                                        |
| --------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| Branch off `feat/start-sequence-1`, FORMAT → MEASURE → COMMIT           | yes  | Worktree, §8.                                                |
| (a) mark the racer, reuse the existing dimming, strength is a slider    | yes  | `rollCallMarkDimming`. §4.                                   |
| (b) draw the connection, choice justified                              | yes  | Leader line. §3.                                             |
| (c) only where necessary, derived from geometry                        | yes  | §2 — and it caught a case a wave-count rule would have missed. |
| (c) never from a track name or a wave-count threshold                  | held | The trigger reads box width and racer positions, nothing else. |
| (d) toggle for the connection, default my judgement                    | yes  | `rollCallConnectors`, default ON. §5 says why, with evidence. |
| Do not touch wave partition / label size / label position / timing      | held | §7. None of the four is in the diff.                          |
| RENDER required, will move, report old and new                         | yes  | §6. `94457cc725ec1e34` → `f7584ff240e0e311`.                 |
| CAMERA and WORLD not required, not to be run                           | **deviated** | §6 — I ran both, and the reason is a rule this project already has. |
| Do NOT mint, do NOT merge                                              | held | Neither.                                                     |
| No sweep — START-SEQUENCE-1's measurement still holds                  | held | §5 is a targeted probe of six cases, not a sweep.            |
| Test: every shown label connects to exactly one racer, its own          | yes  | §7.                                                          |
| Test: a roomy one-wave formation is left untouched                     | yes  | §7.                                                          |
| Test: the marking follows the wave                                     | yes  | §7.                                                          |
| Do not touch 5173                                                      | held | §8.                                                          |
| Two proposals of my own                                                | yes  | §9.                                                          |
| Planner proposal 1 (is the connection redundant?)                      | **answered NO, with evidence** | §5.                                     |
| Planner proposal 2 (does pairing change the pacing?)                   | **answered yes, probably longer** | §9.3.                                |

---

## 2. How (c) is derived — count the racers under the label

**The test: how many racers lie underneath this label? Exactly one — its own — and it points
unambiguously. More than one, and as far as a viewer can tell the name belongs to any of them.**

Horizontal reach is the box's own width. The vertical window is `labelOffsetAbove`, which already
exists because it is how far a label sits above its racer — a racer a row away is not confusable and
is not counted. **No new constant was introduced.**

**What I rejected on the way, because it looks better than it is:** *"which racer is nearest the box
centre"*. The label is centred on its own racer, so the owner is at distance zero **by construction**
and that test can never fire. It would have read as principled and measured nothing.

**One answer per formation**, not per label — the same call this project already made for the wave
partition, for the same stated reason: a formation where half the names have a connector and half do
not reads as an accident rather than as a rule.

**The derivation earned itself immediately.** §5 found that **space-sprint at N=30 is 100% ambiguous
while needing only ONE wave**. Any rule keyed on wave count — the obvious shortcut, and one the spec
explicitly forbade — would have declared that formation fine and left the owner's exact complaint in
place on it.

---

## 3. What I chose for (b), and why

**A leader line**, drawn from the label's lower edge down to the racer's head — vertical, short, and
ending on the body.

**Against a tail or arrow on the box:** a tail decorates the BOX. That re-states the very assumption
that failed — that the box's own position identifies the racer. A line has two ends, and the end that
matters lands **on the body**. It does not describe the pairing, it exhibits it.

**Why vertical and short is enough:** the label is already centred on its racer, so the line needs no
angle. The box may span five racers; the line says which of the five. That is the entire question the
owner asked, and nothing longer or more decorative answers it better.

**Draw order** is between the sprites and the names: over the bodies, so the line is not buried under
a racer; under the labels, so it never crosses the text it belongs to.

---

## 4. What (a) reuses

The dimming the battle focus already owns, given a **second reason to fire** rather than a second
darkening mechanism beside it. Racers named in the current wave stay bright; the rest recede.

`rollCallMarkDimming` defaults to **0.55**, deliberately stronger than the battle focus's 0.4: a
battle dims a handful of bystanders around a subject the camera has already framed, whereas a
roll-call wave has to pick a few racers out of a whole grid with nothing else helping.

---

## 5. Planner proposal 1 — answered NO, and the measurement says so

**Does marking alone make the connection redundant?** A targeted probe of six cases — not a sweep;
the wave partition is untouched so START-SEQUENCE-1's measurement still stands.

The number that matters is **labels still ambiguous after dimming**: a label that spans two racers who
are **both named in the same wave**, where dimming has removed nothing.

| track | roster | N | waves | ambiguous before | **still ambiguous after dimming** |
| --- | --- | --- | --- | --- | --- |
| river-run | current | 100 | 2 | 100% | **94%** |
| river-run | long | 100 | 5 | 100% | **74%** |
| mountainstreet | long | 74 | 4 | 100% | **78%** |
| seatrack | current | 100 | 1 | 30% | **30%** |
| space-sprint | current | 30 | 1 | 100% | **100%** |
| ice-track | current | 40 | 1 | 0% | **0%** |

**Marking alone leaves 74–100% of labels still ambiguous.** The connector is doing real work, and
both are needed. Keeping only the dimming would be fewer marks on screen and the original complaint
would survive on nearly every label.

**Two things in that table worth more than the headline:**

- **A one-wave formation dims nothing at all** — every racer is named, so there is nobody to recede.
  On space-sprint at 30 racers that leaves 100% ambiguity with the marking contributing exactly zero.
  Pairing is **not** a crowded-formation problem; it is a long-name problem, and it appears well
  before the roll call does.
- **ice-track at the full grid is 0%** and correctly gets no aids at all. That is the untouched case,
  confirmed rather than assumed.

---

## 6. Fingerprints, and one deliberate deviation

| role | before | after | verdict |
| --- | --- | --- | --- |
| render | `94457cc725ec1e34` | `f7584ff240e0e311` | **moved, as expected** — dimming and connectors are draw calls |
| camera | `00cafa2432add0f7` | `00cafa2432add0f7` | unchanged |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | unchanged |

**The deviation, stated because it is one:** the spec said camera and world were "not to be run". I
ran both. The reason is a standing rule that outranks a single block's instruction — `defaults.js` is
inside the **engine-reach closure**, and `engine-reach --check` on this diff reports it plainly:

```
ENGINE REACH: 1 of 4 path(s) can change the race:
  client/src/modules/storage/defaults.js
```

SHIP-CEREMONY's mint tripwire says: mint once at the end of any block whose diff touches a file the
engine can reach, and ask the repo rather than remembering. Two new camera-config keys should not
change a race — but "should not" is an argument, and this project's own rule is that the argument is
not accepted. Both are unchanged, which is now measured rather than assumed.

`npm run verify`: **PASS 6, FAIL 0.**

---

## 7. Tests, and what was not touched

**Added — `rollCallPairing.test.js`, eight.** Both R7 questions per test in the file. The three the
spec named:

- **a shown label points at exactly one racer** — including the test that *is* the finding: same
  formation, same positions, **only the name gets longer**, and the label goes from unambiguous to
  ambiguous. Plus the case that must not count: a racer a row away.
- **a roomy one-wave formation is untouched** — no aid when every label sits over its own racer, and
  the aid engages as soon as ONE label is ambiguous (the one-answer-per-formation rule).
- **the marking follows the wave** — pinning that "is this racer marked" is derived from `tagShown`,
  the *same set* that decides which labels are drawn, rather than a second set kept in step. The
  failure this prevents is the worst version of the feature: a racer lit up while a **different**
  racer's name is on screen. That actively misleads, where doing nothing merely fails.

**Deleted or merged: none.**

**What I did not touch, as instructed:** the wave partition, the label size, the label position, the
countdown timing. None appears in the diff. **I did not want to move a label** — the whole finding is
that the label is in the right place and the evidence of that was missing.

---

## 8. How to see it

```
git checkout feat/roll-call-pairing-1     # then reload localhost:5173
```

Built in a worktree at `C:/ra-wt-pair`; **the main tree was never switched and 5173 was never
restarted** — it is still serving `feat/start-sequence-1`.

**river-run at your open field size** — the aid engages: unnamed racers recede, each shown name has a
line to its own racer. **ice-track at 40** — nothing engages, nothing dims, no lines; it should look
exactly as it does today.

---

## 9. Proposals of my own

**9.1 — Pairing is a long-name problem, not a crowded-formation problem, and the numbers say so.**
space-sprint at 30 racers needs one wave and is 100% ambiguous. That means the aids will engage on
formations that never triggered the roll call at all — which is correct, but it is a wider blast
radius than "the river-run problem" implies. Worth knowing before the eye test so it is not a
surprise: you will see this on tracks you did not complain about.

**9.2 — Consider whether the connector should replace the dimming rather than accompany it.** §5
shows dimming contributes **nothing** on one-wave formations, which is 86.5% of field sizes. On those
the connector is doing all the work and the dimming is a cost with no benefit — it darkens most of
the grid to distinguish nothing. A cheap variant: dim only when the wave is a strict subset of the
field. That is one condition and it is closer to your seventh pillar than dimming unconditionally.

**9.3 — Planner proposal 2, answered: yes, pairing probably needs MORE time per wave, not less.**
Reading a name is one act; tracing a line to a body and recognising it is two. 900 ms was reasoned
against reading alone. I did not change it — the spec froze it and changing a pacing number on the
strength of an argument rather than an eye is exactly the wrong direction — but I would expect you to
want it longer once you are actually tracing, and I would rather you knew that before you tune it.

---

## 10. What I did NOT do, and why

- **Did not move, resize or re-place any label.** Instructed not to, and the finding is that the label
  is correctly placed.
- **Did not change the wave partition or the countdown timing.** Same.
- **Did not re-run the sweep.** The partition is unchanged, so START-SEQUENCE-1's measurement still
  holds; §5 is six targeted cases instead.
- **Did not build a Dev Panel control for the two new keys.** They are config with documented
  defaults; the panel wiring is a separate, mechanical piece of work and this block was about whether
  the mechanism is right.
- **Did not mint or merge.** Visible change; your eye decides.
- **Did not touch 5173.** §8.
