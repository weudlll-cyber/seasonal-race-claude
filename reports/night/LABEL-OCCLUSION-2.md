# LABEL-OCCLUSION-2 — a name is never drawn on a racer, and the prediction was wrong

**Branch** `feat/label-occlusion-2` off `feat/label-occlusion-1` (`09a49958`) · 2026-08-09 ·
**built, measured, NOT minted, NOT merged**

---

## 1. The two sentences that matter

**The pass/fail is met.** Drawn name-on-racer is **0** on all four arms, against 592 and 1006 under
the symmetric rule. A name is never on a racer, not even for a frame.

**"At no cost in switches" was my prediction and it was wrong.** It costs **2.6×** the switches on
searound and **2×** on river-run, and the shipped arm lands **outside** the 1.24–3.89 band on both
tracks. Per the spec I stopped at the measurement and did not widen the hold to hide it.

---

## 2. Conformity

| the spec asked | done | where |
| --- | --- | --- |
| build the third option: refuse to draw a name not clear in THIS frame | yes | §3 |
| keep the 2000 ms promotion hold as shipped | yes | §3 |
| `demoteHoldMs` stays a parameter, not the shipped behaviour | yes | §3 |
| measure on the same two tracks and the same arms | yes | §4 |
| drawn name-on-racer = 0 — the pass/fail | **0 on all four arms** | §4 |
| switches against 2.84 / 2.20 and the band | **7.48 / 4.30 — outside** | §4, §5 |
| name share against 20.7 % / 12.5 % | 15.7 % / 8.2 % | §4 |
| one run per arm, no third track, no extra sweep | held — 4 runs, nothing else | §8 |
| **if far worse than the prediction, STOP and report rather than tune** | **stopped** | §5 |
| `defaults.js` untouched, toggle keeps its OFF default | yes | §6 |
| START-BOARD-5 not part of this block | not touched | §9 |
| `engine-reach --check` with the paths | **none of 3 reach the engine** | §7 |
| layout test files + one new test, sabotaged | yes | §7 |
| no suite, no verify, no fingerprint beyond the two measurement runs | held | §7 |
| do not restart the dev server | held | §10 |
| timing ledger, hook separate | yes | §8 |
| rewrite the `labelFormHold.js` header | yes | §6 |

---

## 3. What was built

**One condition was added to the placement pass, and one was removed.**

```
before:  draw the name if  ENTITLED  and  fits(wide box, incumbent budget)
after:   draw the name if  ENTITLED  and  clear in THIS frame
```

- **`nameClear` is this frame's geometry**, with no window at all. It is the same criterion
  LABEL-OCCLUSION-1 already computed every frame; it simply now gates the draw as well as the hold.
- **`fits` is no longer consulted for the wide box, and that is not an omission.** `nameClear` is
  strictly stronger: the same box, tested against `claimed` (which holds every placed box at a size
  at least as large), with **zero** tolerance where `fits` grants an incumbent a budget. A name that
  passes the criterion cannot fail the placement. Stated in the source so the next reader does not
  restore a check that can never fire.
- **The 2000 ms promotion hold is unchanged**, and `demoteHoldMs` is still a parameter with its
  `holdMs` default. It is not the shipped behaviour.

**The split, which is the real change:**

| | governs | needs |
| --- | --- | --- |
| `labelFormHold.js` | **promotion only** — a name is EARNED by 2 s of clear geometry | a clock and memory |
| `nameTagLayout.js` | **the withdrawal** — a name is GIVEN UP the instant it is not clear | neither |

**A consequence worth stating plainly: the hold's `wide` set is now an ENTITLEMENT, not a picture.**
A label can be entitled to its name and be drawn with its number in the same frame. Anything reading
that set as "what is on screen" is reading the wrong one — `computeTagLayout` returns that as `wide`.
The header and the JSDoc both say so now, because this is the sort of distinction that decays into a
bug the first time someone reuses the set for something else.

---

## 4. The measurement

Same harness, same two tracks, same arms, n = 100, one run per arm, `hold = 2000`, seed 5601.

| track | arm | name share | **switches / label / race** | **drawn name-on-racer** |
| --- | --- | ---: | ---: | ---: |
| searound | shipped (`demoteHoldMs = holdMs`) | 15.7 % | **7.48** | **0** |
| searound | `demoteHoldMs = 0` | 12.3 % | **4.74** | **0** |
| river-run | shipped | 8.2 % | **4.30** | **0** |
| river-run | `demoteHoldMs = 0` | 6.3 % | **3.10** | **0** |

Against LABEL-OCCLUSION-1, on the same tracks and the same window:

| | searound | river-run |
| --- | --- | --- |
| **drawn name-on-racer** | 592 → **0** | 1006 → **0** |
| switches / label / race | 2.84 → **7.48** | 2.20 → **4.30** |
| name share | 20.7 % → **15.7 %** | 12.5 % → **8.2 %** |
| the band | 1.24–3.89 | 1.24–3.89 |

The criterion count (names the rule *granted* that overlap a racer) remains **0**, as it was.

---

## 5. Why the prediction was wrong, and what it would take — without choosing

**I predicted "exactly zero at no cost in switches" in LABEL-OCCLUSION-1 §5.3. The zero is right and
the "no cost" was wrong.** I reasoned that a withdrawal is not a form change; it plainly is, because
the harness counts switches on the **drawn** form, which the spec pointed out before I ran it.

**The cause is structural, not a tuning error.** The entitlement **survives** the cover. So the
sequence is: racer drifts under the name → the name is withdrawn that frame → the racer drifts away
→ the name returns *the very next frame*, because the entitlement never lapsed and no window is paid
on the way back. **Every breath of the pack is two switches.** The symmetric rule absorbed those
breaths by simply leaving the name up — which is exactly the defect this block removed. The switches
are not a side effect of the fix; they are the same event, now visible.

That also explains the shape of the table: `demoteHoldMs = 0` is **calmer** (4.74 / 3.10), not busier,
because losing the entitlement forces a name to re-earn its two seconds instead of flickering back
immediately. It buys that calm with 22 % of the remaining names.

**What it would take to get back inside the band. I am naming these and not choosing:**

1. **`demoteHoldMs = 0`** — already measured, no new code: **4.74 / 3.10**. River-run lands inside the
   band; searound is still 22 % over. Costs 22 % of the names.
2. **A re-promotion cost** — a short window (say 300–500 ms) that a *returning* name must pay, which
   is not the same as re-earning the full two seconds. It targets exactly the flapping described
   above and nothing else. **Not measured**, and it is a new parameter, so it is a block rather than
   a line.
3. **Stage 3, a second placement slot.** A name that is covered would *move* rather than vanish, so
   the event stops being a switch at all instead of being traded for one. It is the only option that
   improves the name share and the switch count together, and it is the largest.

**Neither 2 nor 3 was built, and the hold was not widened.** The spec was explicit that a real choice
between two priced behaviours is worth more than a number I picked, and I agree: the two priced
behaviours are the top two rows of §4.

**My own reading, offered as one line and not as a decision:** the drawn overlap was the defect he
reported with his own eyes, and the switch count is a number on a page. I would ship the shipped arm
and look at it before spending another block on it — 7.48 switches per label per race over a 60 s
race is roughly one change every 8 seconds per label, which may well read as a label reacting to
traffic rather than as a strobe. His eye settles that far better than another sweep would.

---

## 6. Hygiene

| file | before | after |
| --- | ---: | ---: |
| `nameTagLayout.js` | 449 | 469 |
| `labelFormHold.js` | 115 | 129 |
| `nameTagLayout.occlusion.test.js` | 377 | 417 |

**Rewritten:** the whole `labelFormHold.js` header. It described a module that decided the form
outright and a symmetric rule ("a form is kept until the opposite condition has held"), both untrue
after this block. It now opens with what it governs and what it explicitly does not, states the
entitlement-vs-picture distinction, and keeps the `demoteHoldMs` paragraph — rewritten, because that
parameter no longer decides how long a name stays on screen, only how long an entitlement survives.

**Removed:** the `fits(e.wide, incumbent)` call for the wide box, and the paragraph about a held name
"that cannot be placed" — the wide box can no longer fail placement (§3).

**Also updated because this block made them untrue:** the `wideForms` JSDoc ("whose CURRENT form is
the name" → "ENTITLED to their name … a necessary condition, not a sufficient one"), the return-value
JSDoc for `wide`, and the paragraph in `nameTagLayout.js`'s header that said the hold governs the
switch.

**Noticed and left:**

- **`labelFormHold` now has a smaller job than its name suggests.** It holds an entitlement; it does
  not hold a form. Renaming it would touch four files for a word, and the header says plainly what it
  does — but the name is now slightly ahead of the truth, which is worth knowing before someone
  trusts it.
- **The Dev Screen tooltip quotes LABEL-OCCLUSION-1's numbers** (about 21 % / 13 % of labels, 2.2–2.8
  switches). This block moves them to 15.7 % / 8.2 % and 7.48 / 4.30. I did **not** update it, because
  §5 leaves a live decision between two arms and the tooltip would be rewritten again the moment he
  makes it. It is the one knowingly-stale thing on this branch and it must be fixed in whichever block
  settles §5.
- **Stage 2 (priority from the director's anchor)** and the **one-frame threading lag** — unchanged
  from LABEL-OCCLUSION-1 §8.
- **`CameraDirector._ceremonyBeat` is still write-only** — eighth block past it.

---

## 7. Verification

`node scripts/engine-reach.mjs --check <3 paths>`: **`none of 3 path(s) can reach the race engine`**.

Layout test files: **51 pass** (50 before, **+1**).

**The new test:** *a name that was clear when granted and is covered a frame later is NOT drawn.* It
earns the entitlement over a full window with a lone racer, then puts a racer inside the name box
**one frame** later — 16 ms, so the entitlement cannot have lapsed and no window can be doing the
work. It asserts three things in that frame: the criterion says covered, the name is **not** drawn,
and the label survives as a number. Then it asserts the entitlement is still standing and the name
returns immediately once clear — which is the mechanism §5 blames for the switches, pinned so the
explanation cannot drift from the code.

**The sabotage is LABEL-OCCLUSION-1's own placement rule**, restored verbatim
(`wantsWide = e.wide != null && …` with `fits`). Result: **exactly one test red — the new one.** That
is the strongest form of this proof: the mutation is not a synthetic break but the previous shipped
behaviour, and the test is what separates the two. Reverted; the tree is green.

**No client suite, no verify, no fingerprint script.** Four measurement runs and nothing else.

---

## 8. Timing ledger

| command | s |
| --- | ---: |
| `git checkout -b` | 0.2 |
| read the hold header before rewriting it | 0.1 |
| layout tests, 1 run | 7.1 |
| sabotage run | 5.5 |
| **measurement — 2 tracks × 2 arms** | **138.1** |
| line counts + `engine-reach --check` | 0.5 |
| **`git commit` #1 — pre-commit hook** | **14.6** |
| doc guards | (below) |
| `git commit` #2 (report) + push + badge | (below) |
| **total to this point** | **~166 s** |

**The measurement is 83 % of it — and this time every second of it was the spec's own ask.** No
sweep, no third track, no extra arm: the four runs are the two tracks × the two arms it named.

**The hook is 14.6 s on the code commit and is again the largest non-measurement cost.** Fourth block
running. For the record across the four: 13.1 s (START-BOARD-4), 32.6 s over three commits
(LABEL-OCCLUSION-1), 40.9 s over three (LABEL-OCCLUSION-1 final), 14.6 s here — it is roughly
**7–14 s per commit**, dominated by eslint + prettier over the staged files plus six guards, and it
is paid on every commit including documentation-only ones.

**Waste: none this block.** No failed test iterations, no re-runs, no commands the spec did not ask
for.

---

## 9. What I did NOT do

- **Did not widen the hold**, or add a re-promotion window, or touch `LABEL_FORM_HOLD_MS`. §5.
- **Did not update the Dev Screen tooltip.** §6 — deliberate, and named as the one stale thing here.
- **Did not touch** `defaults.js`, the toggle's key or its OFF default, the start board, or anything
  START-BOARD-5 would touch.
- **Did not run** a suite, a verify, a fingerprint, a third track, or an extra sweep.
- **Did not mint. Did not merge.**

---

## 10. How to see it

**5173 is on this branch**, not restarted — see §11 of LABEL-OCCLUSION-1 for why the terminal
`[ra-build]` line cannot be read after a branch switch; that defect is unchanged and unfixed here.

**Turn the names on at:** **Dev Screen → Camera (Advanced) → "Track labels show the NAME when it
covers nothing"** — the same checkbox, directly under *Highlight heroes*, still OFF by default.

**What to look at:** searound at 100. **What to judge:** not whether a name ever sits on a racer — it
cannot now — but whether a label dropping to its number as traffic arrives and taking its name back
as traffic leaves reads as *responsive* or as *restless*. That is the whole of §5, and it is a
question about your eye rather than about another measurement.
