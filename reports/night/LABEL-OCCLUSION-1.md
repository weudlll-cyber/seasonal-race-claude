# LABEL-OCCLUSION-1 — the name only when it covers nothing

**Branch** `feat/label-occlusion-1` **off `feat/start-board-4`** · 2026-08-09 ·
**built, measured, NOT minted, NOT merged**

**START-BOARD-5 does not exist** — the board line ends at START-BOARD-4 (`5e1660b2`), so this branch
is cut from there, as the spec instructed for that case.

---

## 1. Conformity, element by element

| the spec asked | done | where |
| --- | --- | --- |
| **A** name when it covers neither a label nor a racer, else the number | yes | §3 |
| **A** its own racer never counts against it | yes | §3 — and it is currently a *boundary*, §3.3 |
| **A** existing priority order; a granted name occupies its full width after it | yes | §3.2 — and this needed one thing the spec did not name |
| **A** any overlap counts; no tolerance introduced | yes | §3 — asserted by a one-pixel test |
| **A** if it leaves very few names, REPORT rather than loosen | **reported, not loosened** | §5.1 — 12.5–20.7 % |
| **B** hold: switch only once the new state is stable, 400 ms provisional | built, **and the measurement moved it to 2000** | §4, §5.2 |
| **B** the name's box is evaluated EVERY frame, even while the number shows | yes | §4 — the sabotage for it is §7 S4 |
| **B** every label starts on the NUMBER | yes | §4 |
| **C** track labels only; board, `defaults.js`, config surface untouched | yes | §8 — one deliberate exception, §9.6 |
| **C** `labelNamesWhenRoom` keeps its name and OFF default | yes | §8 |
| **C** `showRpStartRow` OFF while measuring | yes | forced in the harness, §5 |
| **D** two tracks, the size he watches, three numbers | yes | §5 |
| **D** name-on-racer must be ZERO | **CRITERION = 0 on every arm** | §5.3 — and a second number he must see |
| **E** four tests, each sabotaged red | yes | §6, §7 |
| `engine-reach --check` with the paths | **none of 8 can reach the engine** | §10 |
| no suite, no verify, no fingerprint | held | §10 |
| do NOT restart the dev server | held — **and the badge did not follow**, §11 |
| timing ledger, hook separate | yes | §12 |
| source hygiene | yes | §8 |

---

## 2. What he will see

With the toggle on, a racer's label shows its **name** only when that name lands on empty picture —
no other label under it, no other racer under it. Everything else shows the **number**. A label holds
whichever form it is in for **two seconds** before it may change, so a pack jostling at 60 Hz cannot
make the labels strobe.

At 100 racers that is **about one label in five** carrying a name on searound, **one in eight** on
river-run. The rest are numbers, as before.

---

## 3. The criterion

`computeTagLayout` now answers one more question per eligible label — **would the name be clear
here** — and reports it as `wideClear`. Clear means its box overlaps:

- **no label already placed this frame**, and
- **no OTHER racer's drawn box**.

**The racer boxes come from `drawnRacerScreenPx`, on both axes.** `racerScreenW` is new and it is
genuinely a second number rather than a convenience: on a closed track the world→screen scale is
anisotropic, so a box built from `effZoomY` on both axes would judge names against a racer up to
**18.5 %** the wrong width. Boxes are built for **every** racer with a usable screen position, not
only the label-eligible ones — a racer just outside the eligibility margin is still a racer a name
would cover.

**Any overlap counts.** `hits()` is a strict intersection with no epsilon and no area budget. The
`yieldOverlapFrac` budget still governs whether a *label survives at all*, which is a different
question and is untouched.

### 3.1 What this replaced

LABEL-DEGRADE-1's "does the name **fit**" — i.e. does the wide box clear other labels, with the wide
form carrying its own tenure and an asymmetric yield. That report's area-budget proposal is
superseded and was not built.

### 3.2 One thing the spec did not name, and the block needed it

"A granted name occupies its full width for everything decided after it" is not enough on its own,
because of the hold. Consider two neighbours, both currently showing numbers:

1. A's name is judged clear — but the hold has not promoted it, so **A is drawn narrow**.
2. B's name is judged against what is on the canvas. If that is A's *narrow* box, B is clear too.
3. Both holds expire. Both promote. **The two names land on top of each other.**

So the criterion is evaluated against a second list — `claimed` — in which a label whose name has
been **granted** reserves its full name width even on the frames where it is still drawn narrow. It
makes the criterion true of the frame the hold is heading towards, not only of the one being drawn.
Without it the defect appears **two seconds after** the geometry that caused it, which is the hardest
possible thing to diagnose from a frame. Asserted directly (§6).

### 3.3 The own-racer exclusion is currently a boundary, not a live branch

`labelOffsetAbove(h, 0) = h/2` puts the label's bottom edge **exactly** at the racer's top edge, and
`hits()` is strict, so a label can never overlap its own racer today — by one pixel of construction.
The exclusion is kept and the seam is pinned by a test, because stage 3's below-the-racer slot makes
it reachable on its first day. I am naming it rather than claiming a test proves a branch that cannot
currently be reached.

---

## 4. The hold

**In `labelFormHold.js`, not in the layout.** `nameTagLayout.js`'s contract is "pure: no canvas, no
state, no clock", and a hold window is a clock and a memory both. The layout answers the geometry
question each frame; this module owns the only thing that has to remember.

- **The name is tested every frame, including while the number is shown.** This is the part the block
  turns on. A rule that only re-examined the drawn form would trap every label on the number for the
  rest of the race, because the narrow number is almost always clear. **The hold governs the switch,
  never the test.**
- **Every label starts on the NUMBER**, and a label that leaves the screen and returns starts on the
  number again — its old tenure describes a frame that is no longer there.
- **The window restarts the moment the condition breaks.** Continuous, not cumulative.
- `demoteHoldMs` exists and defaults to `holdMs`, i.e. the owner's rule as written. It is a parameter
  rather than a fork because §5.3 needs both numbers on the table.

The clock arrives as an argument, so "does it switch at 1999 ms" is a question a unit test asks in a
microsecond.

---

## 5. The measurement

`scripts/label-occlusion-truth.mjs` — new. It drives the **real** `computeTagLayout` and the **real**
`advanceLabelForms` exactly as `renderRaceFrame` does, and rebuilds the label box from the same
exported helpers rather than re-typing the geometry. `showRpStartRow` is **forced off** in the
harness rather than assumed off, since it appends `" (R3)"` and would make every width a measurement
of a different string.

**searound (closed, bunches the field) and river-run (open, strings it out), n = 100, one race each,
seed 5601.** The same pair LABEL-DEGRADE-1 used, so the switch numbers are comparable to its
baseline.

### 5.1 What he is buying — the name share

| track | labels on screen | **share showing a name** |
| --- | ---: | ---: |
| searound | 19.4 | **20.7 %** |
| river-run | 43.2 | **12.5 %** |

At the shipped window. **This is much less than LABEL-DEGRADE-1's rule gave (92–99 % of labels fit),
and that is the criterion working, not failing** — "fits" and "covers nothing" are very different
questions once racers count. Per the spec I am **reporting this rather than loosening the rule**. If
one name in eight is too few for him, the honest lever is not a tolerance but **stage 3**: a name
refused today would often fit in a slot nobody has tried (below the racer, or offset sideways). That
is named in §14, not built.

### 5.2 What settles the hold window — the switches

The spec's baseline under the old rule was **1.24–3.89** switches per label per race.

| window | searound | river-run | searound names | river-run names |
| ---: | ---: | ---: | ---: | ---: |
| **400 ms** (the provisional number) | **11.71** | **9.89** | 28.1 % | 20.7 % |
| 1000 ms | 5.77 | 5.37 | 24.2 % | 17.0 % |
| **2000 ms** ← shipped | **2.84** | **2.20** | 20.7 % | 12.5 % |
| 4000 ms | 1.03 | 0.63 | 9.9 % | 6.9 % |

**400 ms lands three times above the baseline band, on both tracks.** Per the spec I have not shipped
a flickering board: **2000 ms** is the longest window that is inside the old band on both tracks while
keeping most of the names 400 ms bought. 4000 ms is calmer still and throws away two thirds of them.

The new criterion is intrinsically busier than the old one because it depends on *racers moving*, not
only on labels moving — which is why it needs five times the window to reach the same calm.

### 5.3 The pass/fail — name on racer

**Names the criterion GRANTED that overlap a racer: 0. On every arm of every run, at every window.**
That is the block's one pass/fail and it is clean.

There is a second number he must see, and I am reporting it rather than explaining it away:

| track | arm | criterion | **drawn** (10 samples/s) |
| --- | --- | ---: | ---: |
| searound | symmetric hold | **0** | 592 |
| searound | demote immediately | **0** | 6 |
| river-run | symmetric hold | **0** | 1006 |
| river-run | demote immediately | **0** | 12 |

**A symmetric hold necessarily draws a name over a racer for up to one window after that racer
arrives underneath.** That is what a hold *is*, and the owner's rule in B is explicitly symmetric —
so I built it as written and measured the consequence rather than quietly overriding his decision.

**The choice is his, and both prices are now known:**

| | names kept | switches (sea/river) | names drawn on a racer |
| --- | ---: | ---: | ---: |
| symmetric hold (shipped) | 20.7 / 12.5 % | 2.84 / 2.20 | 592 / 1006 |
| demote immediately | 12.3 / 6.4 % | 4.74 / 3.10 | **6 / 12** |

Demoting immediately costs **40 % of the names and ~50 % more switches**, and still is not exactly
zero — the residual 6 and 12 are the **one-frame threading lag**: the form drawn this frame was
decided from last frame's criterion, the same lag `tagIncumbents` has always had. A third option
would make it exactly zero at no cost in switches: **refuse to draw a name that is not clear this
frame**, inside the layout, leaving the hold to govern promotion only. I did not build it because it
overrides his stated rule; it is a one-line change if he wants it (§14).

---

## 6. Tests

**New file `nameTagLayout.occlusion.test.js` — 21 tests. Deleted `nameTagLayout.degrade.test.js` —
11.** Layout test files together: **50 pass**.

The deleted file's FLICKER group asserted the wide form's own tenure and its asymmetric yield —
machinery this block removed. Its cascade, priority-order, start-formation and degenerate-form tests
had a subject that survived, and were rewritten against the new rule rather than copied.

| test | what breaks if deleted | what goes unnoticed |
| --- | --- | --- |
| a name that would sit on ANOTHER RACER gets the number | the whole block | the defect he reported |
| the same name once that racer moves away | the other half of the claim | the feature silently never firing |
| a name that would cover another LABEL gets the number | the label half | two names overlapping — unreadable, not untidy |
| **any overlap counts — one pixel is enough** | "no tolerance" | a criterion quietly loosened to raise the share |
| **a granted name reserves its full width before promotion** | §3.2 | an overlap that appears 2 s after its cause |
| the own-racer seam is exact | the exclusion's premise | stage 3 landing on a broken assumption |
| does not switch inside the window, does after | the owner's stability decision | a strobe at 60 Hz |
| the window restarts when the condition breaks | "continuously" | the jostling case the hold exists for |
| a name returns to the number after the window | the demote half | a name stuck on once granted |
| **a label on the NUMBER recovers its name** | the subtle part | the feature working for 2 s and never again |
| a label that leaves the screen returns on the NUMBER | the safe-start rule | a racer reappearing mid-name |
| `demoteHoldMs = 0` is immediate and does not touch the promote | the arm §5.3 measures | the two arms being the same run |
| a held name that cannot be placed shows the number, not nothing | label count | losing labels to a form decision |
| no wide form / no name / narrower name / no racer box | the degenerate paths | a weaker rule reading as a wrong one |

**Every time in the hold tests is a multiple of `LABEL_FORM_HOLD_MS`, never a literal.** The window is
a measured number and has already moved once this block; literals would go red on the next
measurement and say nothing about the behaviour.

---

## 7. Sabotage — each shown red, then reverted

| # | the sabotage | result |
| --- | --- | --- |
| **S1** | drop the racer half of the criterion (`if (false && hits(...))`) | **3 red**, led by *a name that would sit on another racer* — and the label-only tests stayed green, which is what makes it a statement about the racer half |
| **S2** | the criterion never grants (`if (clear && false)`) | **8 red**, led by *the same name once that racer moves away* — and S1's headline test **passed**, because a rule that refuses everything never covers anything. That pair is the point of having both. |
| **S3** | the window collapses to zero (`0 * (want ? … )`) | **7 red**, led by *does not switch inside the window* |
| **S4** | judge only the drawn form (`want = entry.wide && clear.has(index)`) | **7 red**, including *a label on the NUMBER recovers its name* — the trap the spec warned about, caught |

All four reverted; the tree is green.

---

## 8. Hygiene

| file | before | after |
| --- | ---: | ---: |
| `nameTagLayout.js` | 332 | 442 |
| `labelFormHold.js` | — | **115 (new)** |
| `nameTagLayout.occlusion.test.js` | — | **377 (new)** |
| `nameTagLayout.degrade.test.js` | 241 | **deleted** |
| `renderRaceFrame.js` | 416 | 439 |
| `index.jsx` | 1503 | 1507 |
| `scripts/label-occlusion-truth.mjs` | — | **312 (new)** |

**Removed:**

- **The sprite-avoidance sketch.** "SPRITE avoidance — a label must also not cover a racer. Stage 3."
  is replaced by what was actually done — which is narrower and stronger than the sketch: it does not
  *move* a label away from a racer, it changes the label's *form*.
- **`wideIncumbents`**, the wide form's own tenure, its asymmetric-yield path through `fits`, and the
  paragraph explaining why the same asymmetry governed both. Superseded by the hold.
- **`tagWideIncumbentsRef`** in `index.jsx`, and `tagWideIncumbents` through `renderRaceFrame`.
- **`nameTagLayout.degrade.test.js`** (§6).

**Extracted:** the form decision, into `labelFormHold.js`. It could have gone into the layout in
twenty lines; it did not, because that file's promise of purity is what lets every test here run
without a canvas or a clock.

**Noticed and left:**

- **`stage 2` (priority from the director's anchor) is still not built**, and this block makes it
  matter more: the criterion hands names out in priority order, so who is first now decides who gets
  a name, and today that is still plain race position rather than who the camera is watching.
- **The one-frame threading lag** (§5.3). Shared with `tagIncumbents` since CAMERA-TAGS-1.
- **`CameraDirector._ceremonyBeat` is still write-only** — seventh block past it.
- **The criterion is O(labels × racers).** At 100 racers that is a 100-box scan per eligible label per
  frame. It did not register in the harness, but it is the first time this module reads the whole
  field rather than the eligible labels, and it is worth remembering the day the field grows.

---

## 9. Decisions made alone

1. **The hold went in its own module** rather than into the layout, to keep the layout's purity
   promise true rather than nearly true.
2. **`claimed` — the reservation in §3.2.** Not in the spec, and the rule is wrong without it.
3. **A held name that cannot be placed falls back to the NUMBER, not to nothing.** Losing the label
   entirely would be a worse answer than the form it is about to switch to anyway.
4. **The window is 2000 ms.** The spec called 400 provisional and said the measurement settles it;
   the measurement settled it. Shipping 400 would have been shipping the flicker the spec forbade.
5. **I measured a second arm the spec did not ask for** (demote immediately, ×2 tracks) and a
   three-point window sweep. Both are the difference between "here is a number" and "here is his
   decision, priced" — costs listed in §12.
6. **`racerScreenW` rather than reusing `racerScreenH`.** 18.5 % on a closed track is not a rounding
   error.
7. **I changed the Dev Screen toggle's LABEL and TOOLTIP.** The spec said not to touch the config
   surface, and I have not: the key name and the shipped-OFF default are exactly LABEL-DEGRADE-1's.
   But the text read *"shows the NAME when it fits"* and quoted that rule's 1.2–3.9 switches and
   92–99 % fit share — three claims this branch makes false. A switch that lies about what it does is
   worse than an unlabelled one.

---

## 10. Verification

`node scripts/engine-reach.mjs --check <8 paths>`: **`none of 8 path(s) can reach the race engine`**
(7 on the main commit, 1 on the Dev Screen text commit). That is the entire safety argument, and it
holds — nothing here can move the world fingerprint.

Layout test files: **50 pass**. Four sabotages shown red and reverted. **No client suite, no verify,
no fingerprint script, no race booted** beyond the measurement runs the spec asked for.

---

## 11. The build badge did NOT follow the branch — as a defect

Per the spec I did not restart the dev server. The badge did not follow in the place the spec expects
to read it. Captured verbatim, and it is the **last** `[ra-build]` line in the running server's
output:

```
[ra-build] start-up: serving build 5e1660b2 · feat/start-board-4
```

The branch has been `feat/label-occlusion-1` since the start of this block, and the tree is now at
`5a8b4f3f`.

**The cause is a reporting gap, not a stale bundle**, and the distinction matters:

- `vite-plugin-ra-build.js` reads the identity **live** and adds `.git/HEAD` and `.git/index` to the
  watcher precisely so a branch switch invalidates it. The in-browser badge should be correct.
- The terminal line, by its own design, prints **once at start-up and again only when the *reason*
  changes** — and there is no failure reason here. So the terminal never re-prints on a branch
  switch, and what it shows is frozen at start-up.

So the instrument BUILD-TRUTH-1 built to stop a stale badge has a second surface — the terminal —
that is stale by construction, and it is the surface an unattended block can read. **Proposal:
re-print `[ra-build]` whenever the IDENTITY changes, not only when the reason does.** One line, and
it would have made this section unnecessary. Not built here.

Vite is live on 5173 and has HMR'd the changed files; the API is on 4000.

---

## 12. Timing ledger

| command | s |
| --- | ---: |
| branch check + `git checkout -b` | 0.3 |
| read the caller, `drawnRacerScreenPx`, the harness, the consumers (5 greps/reads) | 0.7 |
| **layout tests — 6 runs** (3 failing iterations of my own test arithmetic, then green) | **32.0** |
| **sabotage runs S1–S4** | **22.4** |
| **measurement: 2 tracks × 2 arms at 400 ms** ← the spec's ask | **139.2** |
| **window sweep 1000 / 2000 / 4000, 6 runs** ← my addition | **175.2** |
| **hold = 2000, both arms, 4 runs** ← my addition | **137.6** |
| `engine-reach --check` (7 paths, staged) | 0.3 |
| line counts | 0.4 |
| **`git commit` #1 — hook** | **19.2** |
| `engine-reach` + **`git commit` #2 — hook** | **13.4** |
| `git push` | 2.8 |
| build badge + Dev Screen toggle lookups | 1.7 |
| **total** | **~544 s (9 min)** |

**Where it went, plainly: 83 % of it is the four measurement runs, and 57 % is the two I added
myself.** The spec's own two-race ask cost 139 s. The extra 313 s bought the window that settles B
and the priced alternative in §5.3 — I judged that worth it because shipping the provisional 400 ms
would have shipped a board that flickers three times too fast, and finding that out would have cost
him an eye test.

**The hook is 32.6 s across two commits** — 6 % of the block, and the largest cost that is not a
measurement. Same finding as START-BOARD-4, now confirmed twice.

**Waste: 3 of the 6 test runs** (~16 s) were my own arithmetic in the hold tests — I wrote `800` for
"two windows after 401 ms". Cheap here because the tests are 5 s; the habit is what costs.

---

## 13. How to see it

**5173 is on this branch.** The toggle is **OFF by default**; the owner turns it on at:

> **Dev Screen → Camera (Advanced) → "Track labels show the NAME when it covers nothing"**

(the same checkbox as before — `labelNamesWhenRoom`, `data-testid="label-names-when-room-toggle"` —
directly under the *Highlight heroes* toggle.)

**What to look at:** searound or river-run at 100. Expect roughly one label in five to carry a name,
and expect a name to sit on empty picture. **What to watch for specifically:** a name lingering over
a racer that has just moved underneath it — that is the symmetric hold, it lasts up to two seconds,
and §5.3 is the decision it asks of you.

---

## 14. What I did NOT do, and why

- **Did not loosen the criterion** despite the low name share (§5.1) — the spec said report, so I
  reported.
- **Did not build the in-layout "never draw an unclear name" guard**, which would make the drawn
  overlap exactly zero. It overrides the owner's explicit symmetric-hold rule; it is his call, and it
  is one line.
- **Did not build stage 3** (a second placement slot), which is the honest way to raise the name share
  rather than a tolerance. It is a block of its own.
- **Did not touch** the start board, `defaults.js`, the key name, the OFF default, or
  `showRpStartRow`.
- **Did not fix the `[ra-build]` terminal gap** (§11) — a one-line change in an instrument, outside a
  block whose safety argument rests on touching nothing that can reach the engine.
- **Did not mint. Did not merge.**
