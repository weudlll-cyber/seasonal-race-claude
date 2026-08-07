# QUICKTEST-NAMES-1 — testing with realistic name lengths

**Branch** `feat/quicktest-names-1` off master `b05b3b6e`, with `feat/label-shrink-1` merged in for
the shrink rule · 2026-08-07 · **not merged**

---

## THE HEADLINE — planner proposal 1, taken

**The shrink rule cannot carry realistic names. It is not close.**

With the current 4–8-character roster the shrink handles everything: three tracks affected, smallest
factor 0.696, the legibility floor never touched, zero overlaps left. With realistic names:

| roster  | tracks affected | field sizes where labels overlap | **hit the floor** | **still overlapping after the shrink** |
| ------- | --------------- | -------------------------------- | ----------------- | -------------------------------------- |
| current | 3 of 10         | 93                               | **0 tracks**      | **0**                                  |
| long    | **10 of 10**    | 545                              | **9 of 10 tracks** | **365**                               |
| mixed   | **10 of 10**    | 519                              | **9 of 10 tracks** | **318**                               |

Headroom against the 0.6 floor goes from **0.096 to 0.000**. On seven of the ten tracks the problem
does not exist today and appears at once. **city-circuit starts overlapping at 17 racers.**

**This points at proposal A — the roll call in waves — not at more shrink.** Shrinking is out of
room: the floor is already the binding constraint on nine tracks, so any further tuning of the factor
is tuning a number that has stopped moving.

---

## 0. What of this reproduces from master, and what does not (added at merge)

**The owner rejected the shrink at the picture, so `feat/label-shrink-1` was NOT merged.** This block
was measured with that branch merged in (§5.1), so the sweep tables below need splitting into what
master can reproduce and what it cannot:

- **REPRODUCIBLE FROM MASTER — the finding itself.** `node scripts/diag/start-formation.mjs --all
  --nameset=long` gives the overlap counts unchanged: 3 affected tracks on `current`, **10 of 10** on
  both `long` and `mixed`, with the same per-track counts printed in §6. That is the headline and it
  stands on its own.
- **NOT REPRODUCIBLE FROM MASTER — the factor and floor columns.** "Smallest factor 0.600", "hit the
  floor", "365 still overlapping" all come from `computeLabelShrink` and `LABEL_MIN_SCALE`, which
  live only on the unmerged branch. Those numbers were measured, and they are recorded here as
  history; they become reproducible again if and when the trigger and the label-measurement
  unification are taken off that branch, which is the owner's stated plan for it.

Nothing in the conclusion depends on the unreproducible half: a roster that puts every one of ten
tracks into overlap has already outrun a remedy whose best case was three.

---

## 1. Conformity, element by element

| the spec asked                                                    | done | note                                                          |
| -------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| Branch off master, FORMAT → MEASURE → COMMIT                          | yes  | Plus a merge, §5.1.                                            |
| Read `racerNames.js`'s header first                                    | yes  | Before touching anything; it shaped the whole design.          |
| (a) do NOT edit / reorder / extend / tidy `QUICK_TEST_NAMES`           | held | Byte-identical. Not one line of it changed.                    |
| (b) new sets ADDITIONAL and selectable; nothing selected = as today     | yes  | `resolveNameSet` returns the original **by identity**.         |
| (c) prove it: world fingerprint and golden runner unchanged            | yes  | §4. Both run on this tree.                                     |
| Build LONG and MIXED                                                   | yes  | §2.                                                            |
| Selector in the Quick Test row, default = current                      | yes  | `data-testid="quick-test-nameset-select"`.                     |
| Report the effective maximum name length                               | yes  | §3 — **and the two paths disagree.**                           |
| Keep the sets in the same one-home file with the same warning           | yes  | The header now governs all three explicitly.                   |
| Sweep ten tracks × every field size × three sets                       | yes  | §6.                                                            |
| Per set: how many field sizes overlap, on which tracks                  | yes  | §6.                                                            |
| Per set: required factor, and whether it goes below 0.6                | yes  | §6 — it does, on nine tracks, in both new sets.                |
| **State plainly which solution the numbers point to**                   | yes  | The headline. Proposal A.                                      |
| WORLD required and UNCHANGED                                           | yes  | `dc4647be0f55ebdb`, unchanged. §4.                             |
| RENDER / CAMERA not required                                           | held | Neither run.                                                   |
| Test: a new set leaking into the default path                          | yes  | §7 — asserts identity, not equality.                           |
| Test: each set keeps its own order                                     | yes  | §7.                                                            |
| Two proposals of my own                                                | yes  | §9.                                                            |
| Planner proposal 1 (headline if below floor)                           | **taken** | It is the headline.                                       |
| Planner proposal 2 (would these help the harness fix?)                 | **answered: yes** | §9.3, not folded in.                                |
| Do not touch 5173                                                      | held | §10 — worked in a git worktree; the eye test kept the server.  |

---

## 2. What was built

| roster    | entries | length range | mean |
| --------- | ------- | ------------ | ---- |
| `current` | 70      | 4–8          | 5.5  |
| `long`    | 100     | 16–23        | 19.4 |
| `mixed`   | 100     | 2–23         | 10.1 |

**LONG is realistic, not synthetic.** Full names of the kind an operator types when the racers are
real people — which is the case the owner expects trouble from. A roster of `xxxxxxxxxxxxxxxxxxxx`
would have measured a case the product cannot produce.

**MIXED interleaves so neighbours differ**, and that is load-bearing rather than decorative: two
labels collide as a function of the **pair's combined width**, so a uniformly medium roster hides the
worst pairings. Setting 2 characters against 22 produces both the widest and the narrowest pairs a
real field can contain.

**Both are 100 entries because that is `maxPlayersOpen`.** Found on the way: **the original 70 cannot
fill a full open grid** — Quick Test at 100 players leaves 30 unnamed today.

---

## 3. The maximum name length — and the two paths disagree

There is no single cap. I found **three different answers in one product**:

| path                             | limit         | enforced by                                              |
| -------------------------------- | ------------- | ---------------------------------------------------------- |
| Players field (direct entry)      | **32**        | the HTML `maxLength` attribute in `PlayerSetup.jsx`, only |
| Saved player group (server)       | **100**       | `PLAYER_NAME_MAX` in `server/src/routes/playerGroups.js`  |
| Rendering the label               | **none**      | nothing truncates, nothing clips, nothing measures         |

**So the effective maximum the system allows is 100, not 32** — a roster loaded from a saved player
group can be three times longer than anything the input will accept, and nothing downstream cares.
`drawNameTag` draws whatever it is given at full width.

The owner asked what happens beyond the cap: **nothing does.** There is no truncation, no ellipsis, no
overflow handling anywhere in the drawing path. A 100-character name would produce a label box roughly
**750 screen px wide** — well over half the frame. That is not hypothetical; the player-group route
reaches it today.

I did not change any of the three. Which of them is right is a product decision, and §9.1 is the
proposal.

---

## 4. The proofs that the default path was not touched

Both run on this branch's tree, after every change:

| proof                     | result                                                                        |
| ------------------------- | ------------------------------------------------------------------------------- |
| **WORLD fingerprint**     | `dc4647be0f55ebdb` — **UNCHANGED**                                              |
| **Golden parity runner**  | **14/14 green**, including the browser-vs-sim byte-identity arms                |

The golden suite's own not-vacuous check passed too — a deliberately perturbed identity still
produces a *different* outcome hash — so the 14 greens are evidence rather than a suite that stopped
looking.

The third proof is in the code rather than a run: `resolveNameSet` returns **the original array by
identity**, so the default is not merely equal to the shipped roster, it *is* it. A test asserts that
with `toBe`.

---

## 5. Decisions made alone

### 5.1 `feat/label-shrink-1` merged in

The spec's measurement asks for "the shrink factor each affected formation would need, and whether it
goes below the floor". `computeLabelShrink` and `LABEL_MIN_SCALE` live on that unmerged branch. The
alternatives were to take the branch or to re-type its closed-form algebra into the diagnostic, where
it could drift from the rule it claims to measure. I took the branch, and the sweep drives the shipped
function.

It cannot affect what this block must prove: the shrink is render-only, and the world fingerprint
above confirms it.

### 5.2 The new rosters are 100 long, the original stays 70

Extending the original to 100 would have been the tidier-looking choice and is explicitly forbidden —
appending changes any race large enough to reach the new entry. So the original keeps its 70 and its
inability to fill an open grid, and that limitation is reported (§2) rather than silently fixed.

### 5.3 Every entry is ≤ 32 characters

Even though §3 shows the system permits 100. A roster that exceeds what the Players input accepts
would measure a case an operator cannot create by hand, and the point was realism. The 100-character
case is reported as a finding instead of being baked into a test fixture.

---

## 6. The three sweeps

**`current` — the roster every previous measurement used**

| track          | overlaps at | factor needed | floor? |
| -------------- | ----------- | ------------- | ------ |
| garden-path    | 4 counts    | 0.896         | never  |
| mountainstreet | 33          | 0.805         | never  |
| river-run      | 56          | 0.696         | never  |
| _other seven_  | 0           | —             | —      |

Smallest factor anywhere **0.696**, headroom **0.096**, overlap remaining **0**.

**`long` — every track fails, nine hit the floor**

| track          | fires at | smallest factor | floor hit at | still overlapping |
| -------------- | -------- | --------------- | ------------ | ----------------- |
| city-circuit   | 27       | 0.600           | 23 counts    | yes               |
| dirt-oval      | 29       | 0.600           | 22           | yes               |
| garden-path    | 24       | 0.600           | 23           | yes               |
| ice-track      | 29       | 0.600           | 17           | yes               |
| luger-hill     | 85       | 0.600           | 5            | yes               |
| mountainstreet | 78       | 0.600           | 69           | yes               |
| river-run      | 76       | 0.600           | 69           | yes               |
| searound       | 31       | 0.683           | never        | no                |
| seatrack       | 84       | 0.600           | 73           | yes               |
| space-sprint   | 82       | 0.600           | 65           | yes               |

Headroom **0.000**. **365 field sizes still overlap after the shrink has done everything it can.**

**`mixed` — the same verdict, marginally less severe**

Ten tracks fire (519 field sizes), nine hit the floor, **318 still overlapping**, headroom **0.000**.
searound is again the only survivor, at 0.720.

**The trigger stayed exact in all three runs:** 0 fired where not needed, 0 missed. The trigger is not
what breaks — the *remedy* is.

**Why the label width explains it:** the mean box goes from **54.65 px** (current) to **169.73 px**
(long) — **3.1× wider** — while the space between racers is unchanged.

---

## 7. Tests

**Added — `racerNames.test.js`, nine.** Both R7 questions per test in the file.

- **a new set cannot reach the default path.** Asserts **identity** (`toBe`), not equality, and covers
  every value the selector could realistically produce: `undefined`, `null`, `''`, `'nonsense'`,
  `'Current'`, `'LONG'`, `0`, `false`. _What goes unnoticed without it_ is the whole reason it exists:
  the races would still run, still look correct, and different racers would win.
- **each set keeps its own order.** Not alphabetical — an alphabetical list is *evidence of a
  tidy-up*, which is the exact edit the file header forbids. Plus no duplicates, first and last entry
  pinned per set, and every entry inside the 32-character cap.

**Deleted or merged: none.**

---

## 8. What I did NOT do, and why

- **Did not touch `QUICK_TEST_NAMES`**, including not extending it to 100. Forbidden, and §5.2.
- **Did not change any of the three name-length limits.** §3 reports the disagreement; reconciling it
  is a product decision.
- **Did not add truncation or ellipsis** to the label renderer. It would have hidden the very geometry
  this block was asked to measure, and it is a design choice the owner has not made.
- **Did not fold in the render-fingerprint harness fix.** Planner proposal 2 said not to; §9.3 answers
  whether these sets help.
- **Did not persist the selector** to localStorage. Every other Quick Test control here is session
  state, and a sticky roster is a stored setting that silently changes races on the next launch.
- **Did not touch 5173.** §10.

---

## 9. Proposals of my own

**9.1 — Reconcile the three name-length limits, and pick 32 as the real one.** Today the input says
32, the server says 100, and the renderer says anything goes. 32 characters at the shipped label size
is already ~250 px of box; 100 is ~750 px, over half the frame. Whatever number is chosen, it should be
in one place and enforced where names *enter* the system, not left to the input attribute of one
field. This is a small change with a large blast radius avoided.

**9.2 — Take the roll call out of one frame, per the headline.** The numbers say the shrink is
finished as a strategy: nine of ten tracks bottom out at the floor with realistic names. Showing every
name *in turn* over a second or two keeps the owner's promise — a spectator finds their racer — while
removing the constraint that all of them fit simultaneously. It is the only proposal on the table that
survives 100 long names, and it gets easier as names get longer rather than harder.

**9.3 — Planner proposal 2, answered: yes, these sets make the harness fix easier and safer.** The
render-fingerprint harness draws nameless racers (LABEL-SHRINK-1 §6). Fixing it means choosing a
roster for it, and that choice is now a decision between three named, tested, order-pinned lists
instead of an ad-hoc array invented in the harness. I would use `mixed`: it exercises the widest and
narrowest pairings, so a harness built on it can see label changes the other two would hide. **Not
folded in here**, as instructed.

---

## 10. How this was done without touching 5173

An eye test is live on `feat/label-shrink-1` and has not been released, so R10 says the dev server owns
the tree. All of this was built and measured in a **git worktree at `C:/ra-wt-names`** — a short path
outside the OneDrive tree, per R10's own guidance — with `node_modules` junctioned from the main
checkout. **The main tree was never switched and the dev server was never restarted.**

To look at the selector: `git checkout feat/quicktest-names-1` once the eye test is released — it is
the **Names** dropdown next to **Racer** in the Quick Test row.
