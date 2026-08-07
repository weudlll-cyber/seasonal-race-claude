# LABEL-SHRINK-1 — smaller labels only where they would otherwise collide

**Branch** `feat/label-shrink-1` · **base** `master` at `b05b3b6e`, with `feat/label-stagger-1`
merged in for its trigger · 2026-08-07
**Status** built, measured, **works**. Not merged, not minted — awaiting his eye.

**The headline:** zero overlapping labels at every field size on all ten tracks, zero formations
touched that did not need it, and the legibility floor was never reached. **Two things he must know
before minting** are in §6 and §7: the render fingerprint moves for all ten tracks and only three of
them actually change, and requirement (f) is not met.

---

## 1. Conformity, element by element

| the spec asked                                                | done | note                                                                       |
| ---------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------- |
| Branch `feat/label-shrink-1` off master                            | yes  | Plus a decision made alone — §5.1.                                          |
| FORMAT → MEASURE → COMMIT                                          | yes  | Prettier before every measurement.                                          |
| (a) reuse the exact whole-box trigger                              | yes  | Taken, not re-typed — §5.1.                                                 |
| (a) never key on name / id / open-closed / racer type / count       | yes  | The factor sees a list of boxes and a font size.                            |
| (b) shrink by the smallest factor that clears every collision       | yes  | Closed form, no search — §3.                                                |
| (b) derive from this formation's geometry, no per-track number      | yes  | No constant in the code is per-track.                                       |
| (c) where nothing collides, change nothing at all                   | yes  | **Proven mechanically — §6.** Byte-identical.                               |
| (d) applies only inside the roll-call window                        | yes  | Outside it the factor is a literal 1.                                       |
| (e) decide once per formation                                       | yes  | One scalar for the whole field.                                             |
| **(f) size must not visibly jump between adjacent field sizes**     | **NO** | **Not met. Measured 26.1%. §7 — and why I did not paper over it.**        |
| Establish a floor, and say how                                      | yes  | §4. It is a judgement, and it says so.                                      |
| Stop at the floor, report STILL OVERLAPPING, never go under          | yes  | Built and tested. **Never triggered in practice** — §2.                     |
| RENDER required, report old and new                                 | yes  | §6. `cf716cbdf37b2077` → `e5d2099718f8cba1`.                                |
| Do NOT mint, do NOT merge                                           | yes  | Neither done.                                                               |
| CAMERA / WORLD not required, not run                                | held | Neither run.                                                                |
| Sweep across every field size, ten tracks                           | yes  | §2.                                                                         |
| Per track and count: factor applied, or untouched                    | yes  | §2.                                                                         |
| Prove (c) mechanically, and say how                                  | yes  | §6 — and the proof exposed a harness blindness.                             |
| Test: fails if the trigger is inverted                              | yes  | Inherited and re-run; sabotage in LABEL-STAGGER-1.                          |
| Test: roomy formation untouched                                     | yes  | Asserts **exactly** 1, not "close to" — §8.                                 |
| Test: pins the floor                                                | yes  | §8.                                                                         |
| Do not touch 5173                                                   | held | Never restarted. Tree left on master — §9.                                  |
| Two proposals of my own                                             | yes  | §10.                                                                        |
| Planner proposal 1 (smallest factor anywhere)                       | **taken** | §2. 0.696, headroom 0.096.                                            |
| Planner proposal 2 (is one number simpler and as exact?)            | **answered: NO** | §5.2, with the measurement that decides it.                     |

---

## 2. The sweep — ten tracks, every field size

| track          | counts | overlapped before | rule fires | **fires w/o need** | **misses** | **overlap left** | first fires at |
| -------------- | ------ | ----------------- | ---------- | ------------------ | ---------- | ---------------- | -------------- |
| city-circuit   | 2..40  | 0                 | 0          | 0                  | 0          | **0**            | never          |
| dirt-oval      | 2..40  | 0                 | 0          | 0                  | 0          | **0**            | never          |
| garden-path    | 2..40  | 4                 | 4          | 0                  | 0          | **0**            | 29             |
| ice-track      | 2..40  | 0                 | 0          | 0                  | 0          | **0**            | never          |
| luger-hill     | 2..100 | 0                 | 0          | 0                  | 0          | **0**            | never          |
| mountainstreet | 2..100 | 33                | 33         | 0                  | 0          | **0**            | 38             |
| river-run      | 2..100 | 56                | 56         | 0                  | 0          | **0**            | 38             |
| searound       | 2..40  | 0                 | 0          | 0                  | 0          | **0**            | never          |
| seatrack       | 2..100 | 0                 | 0          | 0                  | 0          | **0**            | never          |
| space-sprint   | 2..100 | 0                 | 0          | 0                  | 0          | **0**            | never          |

**Fired where not needed: 0. Missed: 0. Overlap remaining: 0.** Seven of ten tracks are never touched
at any field size.

**The factor, per affected track:**

| track          | fires at | smallest factor | at N | hit the floor?    |
| -------------- | -------- | --------------- | ---- | ----------------- |
| garden-path    | 4 counts | 0.896           | 32   | never             |
| mountainstreet | 33       | 0.805           | 61   | never             |
| river-run      | 56       | **0.696**       | 72   | never             |

**Planner proposal 1, taken: the smallest factor anywhere is 0.696, against a floor of 0.6 — headroom
0.096.** He should hear that now: roughly a tenth of the label's size stands between today and the
floor binding. A denser racer type, a wider name, or a narrower track would eat it, and at that point
the answer stops being this block and becomes proposal A.

---

## 3. How the factor is derived — closed form, no search

Scaling the font by `f` scales the box height, the text width **and** the offset above the racer.
That last one is the part that is easy to get wrong: because both labels of a pair move down by the
same amount, **the vertical separation of two boxes does not change with `f`** — only their heights
shrink. Their horizontal centres never move at all. So the two escapes are independent and exact:

```
vertical     they clear when   f·H ≤ |dy|             →  f ≤ |dy| / H
horizontal   they clear when   (f·tᵢ + P + f·tⱼ + P)/2 ≤ |dx|
                                                      →  f ≤ (2|dx| − 2P) / (tᵢ + tⱼ)
```

A pair is clear if **either** holds, so it permits `max` of the two; the formation must satisfy every
pair, so it takes the `min` across pairs. The padding `P` does not scale — it is a fixed inset — which
is why a pair closer together than the padding alone can never be separated horizontally at any size.

No iteration, so it cannot converge on the wrong answer, and the sweep's "0 overlap left" column is
the confirmation rather than the mechanism.

---

## 4. The floor, and how it was established

**`LABEL_MIN_SCALE = 0.6`, and it is a JUDGEMENT, not a measurement. It is his to move.**

I looked for something to derive it from and there is nothing: this repository establishes a sprite
readability floor (`minDrawnFrameFrac`) but nothing about text legibility. Inventing a measurement
would have been worse than saying so.

How it was set. The label ships at `nameTagFrameFrac` of frame height — 15.8 screen px on a 720-px
frame. 0.6 of that is ~9.5 px. Below roughly 9–10 px, bold sans-serif on a busy background stops being
something a viewer reads at a glance and becomes something they decode — and the entire purpose of the
start roll call is finding your racer **at a glance**. It is a FRACTION, not a pixel count, for the
same reason the label is: an absolute pixel floor does not survive a change of frame size, which is
the bug CAMERA-TAGS-1 was.

**It never bound in practice** (§2), so nothing today is reported as STILL OVERLAPPING. It is built,
tested and dormant — which is the right state for a stop rule.

---

## 5. Decisions made alone

### 5.1 The branch is off master, with `feat/label-stagger-1` merged into it

Rule (a) says reuse the **exact** trigger from LABEL-STAGGER-1. That trigger was never merged to
master, so "reuse" meant either taking the branch or re-typing the predicate here. Re-typing it would
have created a second copy of the one thing that block proved exact — precisely the duplication its
own rule (c) was written about. I merged the branch.

It brings with it the unshipped stagger placement and its negative result. I left both in place rather
than deleting them: the module header explains why the placement did not ship, and deleting the
evidence while merging the branch would erase a measured negative result the owner has not yet read.
**If he merges this branch, that history comes with it.** Say the word and I will strip it.

### 5.2 Planner proposal 2 — answered NO, with the measurement

The question was whether a single number keyed to the roll-call window is simpler and just as exact as
a per-formation factor. **It is not**, and the sweep says so: the factor a formation actually needs
ranges from **0.896 to 0.696** across the three affected tracks. A single number would have to be the
worst of them — 0.696 — and would then shrink garden-path by 30% where 10% was enough, and shrink the
seven untouched tracks not at all only because the trigger spared them. That breaks the owner's own
rule twice over: "only where necessary" is not just about WHICH tracks but about HOW MUCH, and rule
(b) says the *smallest* factor that clears. It would be simpler and measurably worse.

### 5.3 Requirement (f) — I did not paper over it. See §7.

---

## 6. Fingerprints, and what proving rule (c) exposed

| role   | before             | after              |
| ------ | ------------------ | ------------------ |
| render | `cf716cbdf37b2077` | `e5d2099718f8cba1` |
| camera | —                  | not run, not required |
| world  | —                  | not run, not required |

**How (c) was proven, and it is a real measurement rather than an argument.** I ran the render
fingerprint on this branch with the shrink forced to 1 by a temporary bypass, then removed the bypass.
That run reproduced master **exactly** — the combined hash `cf716cbdf37b2077` and all ten per-track
hashes, byte for byte. So the plumbing itself (threading the scale, `fontPx * labelScale`) is
bit-identical at scale 1, and the only difference the fingerprint sees is the shrink firing.

**And that is where the proof found something the spec did not anticipate.** With the shrink live,
**all ten per-track hashes move — including the seven tracks the sweep says are never touched.**
The op counts are identical on every track (102729 = 102729, and so on), so nothing structural
changed. The cause, measured rather than guessed:

> **The render fingerprint harness gives its racers no names.** `render-fingerprint.mjs` never sets
> `r.name`, and `labelOf` falls back to `''`. Every label box in the harness is therefore 8 px wide —
> the padding alone — and 18.7 px tall. In that degenerate geometry formations collide on tracks that
> would never collide with real names, so the shrink fires everywhere in the harness and nowhere near
> it in the browser.

**The consequence he needs before minting:** the new render value is honest about "something changed"
but is NOT a faithful record of what the players will see. Three tracks change in the browser; ten
change in the hash. §10 proposal A is the fix.

`npm run verify`: **PASS 5, FAIL 0.**

---

## 7. Requirement (f) is NOT met — 26.1%, and why I left it

The size must not visibly jump between adjacent field sizes. Measured, largest single step in the
factor from N to N+1:

| track          | worst step | at    |
| -------------- | ---------- | ----- |
| garden-path    | 0.104      | 32→33 |
| mountainstreet | 0.195      | 60→61 |
| **river-run**  | **0.261**  | 72→73 |

26.1% is visible. I did not smooth it, and the reason is that **the jump is not in my rule — it is in
the start grid.** At river-run N=72 the grid is **3 rows of 24**; at N=73 it is **4 rows of 19**. A
whole row opens, the rows spread, and the formation genuinely needs far less shrink. The factor is
following real geometry.

Every way of removing the step breaks something the owner asked for explicitly:

- **Quantising to a ladder** makes it *worse*, not better. Rounding 0.696 and 0.957 down to the nearest
  rung of 0.1 gives 0.6 and 0.9 — a 0.3 step, and it shrinks below what was needed.
- **Carrying the worst case across neighbouring field sizes** means shrinking N=73 to what N=72
  needed: shrinking where it is not necessary, which is the defect the whole two-block arc exists to
  avoid.
- **Hysteresis** needs state across races; this module is pure by design and a size that depends on
  the previous race is not reproducible.

So the honest position: **(f) as stated cannot hold together with (b) and (c) while the start grid is
a staircase.** Mitigating fact, and it is not nothing: **within any single race the size is constant.**
The step is only visible when comparing two races whose rosters differ by one — and at that point the
two start grids genuinely differ. **If he would rather have stability than exactness, §10 proposal B is
the trade, and it is his call, not mine.**

---

## 8. Tests

**Added — `nameTagLayout.shrink.test.js`, six.** Both R7 questions are answered per test in the file.
The three the spec named:

- **fails if the trigger is inverted** — inherited from `nameTagLayout.stagger.test.js`, re-run here
  and green; the sabotage that proved it is recorded in LABEL-STAGGER-1. Not duplicated, because a
  second copy of those assertions is a second place to update.
- **roomy formation untouched** — asserts the factor is **exactly 1**, not merely close to it. That
  strictness is the point: the renderer's "changed nothing" path keys on it, and 0.999 would move
  every pixel of every label on all seven untouched tracks.
- **the floor binds** — a formation needing more shrink than the floor allows stops at the floor,
  reports `clears: false`, and is confirmed to still overlap. Written before the sweep, and it caught
  my own first fixture: two labels 10 px apart with 50 px of text is a floor case, not a clearable
  one, which I had assumed was clearable.

Plus: never returns below the floor for any input; uses the vertical escape when it is the cheaper
one; and the degenerate inputs a live frame produces.

**Deleted or merged: none.**

---

## 9. What to look at, in one line

```
git checkout feat/label-shrink-1     # then reload localhost:5173
```

Pill `3e3e7ad6 · feat/label-shrink-1`. **I did not touch 5173 and left the working tree on master**,
so it is serving exactly what it served before this block.

**The worst case is river-run at 72 racers** — factor 0.696, the smallest anywhere. If the names are
comfortably readable there, everything else is easier. **And one untouched track — seatrack or
space-sprint** — to confirm nothing moved.

---

## 10. Proposals of my own

**A — give the fingerprint harness real names, once.** §6 measured that it draws nameless racers, so
every label box is padding-only and the whole tag layout is exercised in a geometry the game never
produces. It cannot currently see which tracks a label change touches, and it will mis-report every
future label change the same way. Setting the harness roster from `racerNames.js` — the one home that
already exists — makes it faithful. It moves the render baseline once, deliberately, and buys an
instrument that can see this entire class of change. I would do this before minting anything else that
touches labels.

**B — if he wants stability over exactness, quantise the factor and accept wasted shrink.** §7 says a
ladder is worse on the numbers, but "worse on the numbers" is not the same as "worse to watch": a
label size that only ever takes three or four values may look more deliberate than one that is
different in every race, even if it shrinks more than it strictly must. This is a taste question and I
have deliberately not decided it. It is one constant and half a day.

---

## 11. What I did NOT do, and why

- **Did not smooth requirement (f).** §7 — every mechanism I could find breaks "only where necessary"
  or leaves overlaps. Reporting it as unmet is the honest outcome, not a defect I hid.
- **Did not fix the fingerprint harness.** §10 proposal A. It moves the render baseline, which is a
  ceremony decision and his to authorise — and doing it inside this block would have entangled two
  baseline moves in one hash.
- **Did not delete the unshipped stagger placement** that came in with the merge. §5.1.
- **Did not mint or merge.**
- **Did not run the camera or world fingerprints.** Not required and explicitly not to be run.
- **Did not touch 5173**, and returned the working tree to master.
