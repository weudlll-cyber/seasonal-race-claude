# START-SEQUENCE-1 — establishing shot, zoom to fit, roll call in waves

> **THE ROLL CALL IS NOT SHIPPED.** Landed on master as history by CLEANUP-BEFORE-NUMBERS-1, after
> the owner chose the race-number design. The wave partition, the wave clock and the countdown
> stretch below do not run in the game.
>
> **What is worth reading:** the measurement of how bad label overlap really is with realistic
> names, and STAGE 0 — the countdown numbers, which was a three-way disagreement in which only one
> number governed anything.
>
> **Salvaged from this branch:** stage 0's finding — `countdownDurationMs` as the one home, and the
> removal of the dead `countdownDuration` key with its live-but-inert Dev control. **Not salvaged,
> and still open:** the overlay counts from a hard-coded 3 while the phase lasts 4000 ms, so "GO!"
> stands for an extra second. That is a VISIBLE change and belongs with work the owner's eye is on.

**Branch** `feat/start-sequence-1` off master `3cfaf1f3` · 2026-08-07 · **not merged, not minted**

**Read this first: STAGES 0 AND 1 ARE BUILT AND MEASURED. STAGE 2 — THE CAMERA SEQUENCE — IS NOT
BUILT.** The camera fingerprint is unchanged, and that is the honest signal rather than a surprise:
the establishing shot and the zoom-to-fit were not written. §7 says why and what it costs.

---

## 1. Conformity, element by element

| the spec asked                                                     | done | note                                                       |
| ---------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| Branch off master, FORMAT → MEASURE → COMMIT                             | yes  | Worktree, §9.                                               |
| **Stage 0** — what each countdown number governs, which one the viewer feels | yes | §2. It was a **three**-way disagreement.               |
| Stage 0 — is the comment true today                                      | yes  | **No.** §2.                                                 |
| Stage 0 — one home, or say they are two things                           | yes  | One home. The second was **dead**, not a home. §2.          |
| **Stage 1a** — reuse the trigger and the box unification, do not re-type  | yes  | Plundered from both branches. §3.                           |
| Stage 1a — do not bring the rejected shrink or unshipped stagger          | held | Neither is in this tree; §3 says how that was ensured.      |
| Stage 1b — fewest groups, no overlap within a group, FULL size            | yes  | `partitionIntoWaves`. §4.                                   |
| Stage 1c — no overlaps ⇒ exactly one group, from the mechanism            | yes  | Falls out by construction; no special case exists. §4.      |
| Stage 1d — every name appears at least once, pinned by a test             | yes  | §6, and measured at 0 names lost in 2070 field sizes.       |
| Stage 1e — both sliders, countdown = max(minimum, waves × per-wave)       | yes  | §4. Defaults justified.                                     |
| **Stage 2a** — establishing shot                                          | **NO** | Not built. §7.                                          |
| **Stage 2b** — ease to largest all-visible zoom, report it per track      | **NO** | Not built, so not measured. §7.                         |
| **Stage 2c** — hold as DESIRED zoom, do not freeze                       | **NO** | Not built. §7.                                          |
| Stage 2d — report whether folding COUNTDOWN into the framing rule helps   | yes  | §8 — proposed, nothing restructured.                        |
| RENDER required, will move, report old and new                            | yes  | §5. `cf716cbdf37b2077` → `94457cc725ec1e34`.                |
| CAMERA required, will move, report old and new                            | **unchanged** | §5 — because stage 2 was not built.                |
| WORLD must not move                                                       | held | `dc4647be0f55ebdb`, unchanged. §5.                          |
| Do NOT mint, do NOT merge                                                 | held | Neither.                                                    |
| Verification across ten tracks, every field size, three name sets         | yes  | §4.                                                         |
| Tests: every name once · roomy ⇒ one group · countdown ≥ minimum          | yes  | §6, all three, proved by sabotage.                          |
| Do not touch 5173                                                         | held | §9.                                                         |
| Two proposals of my own                                                   | yes  | §10.                                                        |
| Planner proposal 1 (say plainly if most tracks need one group)            | **taken** | §4 — and the answer is yes, emphatically.              |
| Planner proposal 2 (what the first view change looks like)                | **cannot answer honestly** | §7 — it depends on stage 2's held zoom.   |

---

## 2. Stage 0 — the countdown numbers, resolved

It is not two numbers. It is **three**, and only one of them does anything.

| | value | what it governs |
| --- | --- | --- |
| `countdownDurationMs` (camera config) | 4000 | **Everything the viewer experiences.** RaceScreen's phase advance compares against it, so this is the countdown's real length. |
| `countdownDuration` (race defaults) | 3 s | **Nothing. It is read by no code at all** — three references in the whole repo: its definition and two in the Dev Panel control that writes it. Changing it there has never had any effect. |
| `drawCountdownOverlay` | hard-coded `3` | The digits. `Math.max(0, 3 - floor(elapsed/1000))`. |

**Is the comment true?** No. It claimed `countdownDurationMs` "matches the default race countdown
duration". 4000 ms is not 3 s, and the key it claimed to match is dead. The comment has been wrong
for as long as both keys have existed.

**A consequence nobody had written down:** because the overlay counts from 3 and the phase lasts
4000 ms, the viewer sees `3 · 2 · 1 · GO!` and then **GO! sits on screen for a full extra second**
before the race starts.

**Resolution.** They are not one fact with two homes — one is a dead key, which is litter rather than
a home. `countdownDurationMs` is now the one home, and its comment records all of the above so the
next reader does not re-derive it. It is now the **minimum**, not a fixed length.

**What I did NOT do:** delete the dead key and its Dev Panel control. That is a config-key removal
plus a UI removal, and this block had no mandate for it. §10.2 proposes it.

---

## 3. What was plundered, and what was kept out

Taken from `feat/label-stagger-1` rather than re-typed: the overlap **trigger**
(`formationNeedsStagger`, measured exact — 0 false positives, 0 misses across ten tracks at every
field size) and the **label-box geometry** helpers that give the box's shape one home.

**Deliberately NOT taken:** the stagger **placement** (measured, creates as many overlaps as it
removes) and the **shrink** (built, and rejected by you at the picture). Both were stripped in the
same commit that took the file, and the module header records what came from where and why the rest
did not. A grep for `assignLabelLevels`, `labelStaggerStep` or `computeLabelShrink` in this tree
returns nothing.

---

## 4. Stage 1 — the roll call, and what it measures

`partitionIntoWaves` splits a formation into the fewest groups in which no two labels overlap —
greedy colouring of the conflict graph, widest label first (it conflicts with the most others, so it
needs the emptiest wave; ties break on index so the result is deterministic). Labels stay at **full
size**; nothing is shrunk and nothing is moved.

**"Only where necessary" falls out of the mechanism.** A formation with no overlaps produces one wave
by construction — the first box opens wave 0 and no later box ever conflicts. There is no branch
asking whether a track needs this.

**Honest limit:** optimal colouring is NP-hard, so "fewest" is greedy-fewest. The measured counts are
small enough that the distinction is academic here.

**Countdown** = `max(minimum, waves × rollCallMsPerWave)`, one home in `countdownDurationFor`, so the
phase advance and the camera cannot disagree. Defaults: `establishingShotMs` 1200 (a beat long enough
to read a track's shape), `rollCallMsPerWave` 900 (a short name is legible in well under half a
second; the rest of the beat is for the eye to *find* it). Both are yours to tune.

### The measurement — ten tracks × every field size × three rosters (690 each)

| roster | overlap **inside** a wave | names never shown | needing exactly **one** wave | worst case |
| --- | --- | --- | --- | --- |
| current | **0** | **0** | **597 / 690 (86.5%)** | 3 waves → countdown **4.0 s** |
| long | **0** | **0** | 145 / 690 | 5 waves → **4.5 s** |
| mixed | **0** | **0** | 171 / 690 | 5 waves → **4.5 s** |

Per track, current roster: seven of ten need **one wave at every field size**. Only garden-path (4
counts, max 2 waves), mountainstreet (33, max 3) and river-run (56, max 3) ever split.

**Planner proposal 1, taken, and the answer is emphatic: on the shipped roster the roll call is a
RARE FALLBACK, not the normal case.** 86.5% of all field sizes are one wave — the picture on those is
identical to today. And **nothing becomes absurd**: the worst case anywhere, on any roster, is 5
waves, which stretches the countdown from 4.0 s to 4.5 s. There is no case that needs reporting as
unusable.

---

## 5. Fingerprints

| role | before | after | verdict |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unchanged, as required** |
| render | `cf716cbdf37b2077` | `94457cc725ec1e34` | **moved, as expected** — labels come and go over time |
| camera | `00cafa2432add0f7` | `00cafa2432add0f7` | **unchanged — because stage 2 was not built** |

The spec predicted the camera would move. It did not, and that is the cleanest available evidence for
what §7 says: the countdown zoom is untouched.

`npm run verify`: **PASS 5, FAIL 0.**

---

## 6. Tests

**Added — `rollCall.test.js`, ten.** Both R7 questions per test in the file. The three the spec named:

- **every name appears at least once** — 40 labels stacked on nearly one point; all 40 named, none
  twice, and no wave contains an overlapping pair.
- **a roomy formation is exactly one wave** — plus the two corollaries that make it structural: one
  wave can never stretch the countdown, and a one-wave formation's index is always 0 so the clock
  cannot touch it.
- **the countdown never falls below the minimum** — including monotonicity (more names can never mean
  less time) and the degenerate configs a Dev Panel can produce.

**Proved by sabotage:** removing the `max()` fails three of the ten.

**MODIFIED — one, and it must be reported as such.** `nameTagLayout.test.js`'s *"showAll labels
everyone on canvas"* asserted the old contract. It was not wrong; **you changed the contract**. On a
clump of 40 that assertion describes 40 unreadable overlapping labels — the problem the roll call
exists to solve. It now asserts the part that did not change (walking the waves names all 40) and a
second test pins the untouched case (a roomy field is one wave, everyone on screen at once).

**Deleted: none.**

---

## 7. Stage 2 was not built — what that costs, plainly

I ran out of runway before the camera sequence. Stages 0 and 1 are complete, measured and tested;
stage 2 is untouched. Nothing half-built was left in the tree — `updateCountdown` is exactly as it
was on master, which is why the camera fingerprint is unchanged.

**What is therefore missing:** the establishing shot of the whole track, the ease in to the largest
all-racers-visible zoom, and holding that zoom at the gun. `establishingShotMs` exists as a config
key with a documented meaning and **nothing reads it yet** — a loose end I would rather name than
leave for you to find.

**What that costs the measurement.** The wave counts in §4 were taken at the CURRENT countdown zoom.
Stage 2(b) would zoom *closer*, which makes labels further apart on screen and therefore needs
**fewer** waves — so §4 is an upper bound, and the real numbers after stage 2 can only be better.
That is worth knowing before tuning the sliders: the case for a long `rollCallMsPerWave` is weaker
than §4 alone suggests.

**Planner proposal 2 — I cannot answer it honestly.** It asks what the first view change looks like
when the held zoom is much tighter than the state that follows. There is no held zoom yet, so any
answer would be speculation. It stays open, and it is the first thing to measure when stage 2 is
built.

---

## 8. Stage 2d — folding COUNTDOWN into the framing rule

`FRAMING_BY_STATE` describes six states with three columns each (anchor, guarantee, position).
COUNTDOWN is absent and `updateCountdown` is a hand-written path that eases between two zoom
endpoints and pans to the centroid, consulting no guarantee.

**Would folding it in be simpler? For stage 2, yes — and substantially.** Stage 2(b) is "the largest
zoom at which every racer is still in frame", which is *precisely* what a guarantee is: it widens to
keep named subjects visible and never steers. Written as a guarantee over the whole field it would be
one call to the existing machinery instead of a new bespoke zoom computation, and 2(c) — hold the
zoom but let the guarantees still widen it — would come free, because that is what every other state
already does.

**What it would cost:** COUNTDOWN's anchor is the field centroid, not a racer, so the anchor column
would need a value it does not currently have; the ease from the establishing shot is a transition
the grammar has no state for; and the camera fingerprint would move for every track at once, making
it harder to attribute a later regression.

**Proposed, not done.** It is a restructuring of the camera's own contract and it is your decision.

---

## 9. How this was done without touching 5173

Built in a git worktree at `C:/ra-wt-seq` with `node_modules` junctioned from the main checkout. The
main tree was never switched and the dev server was never restarted.

**To see it:** `git checkout feat/start-sequence-1`, then reload 5173 — pill `<sha> ·
feat/start-sequence-1`. **river-run at your open field size** shows the roll call splitting into
waves; **seatrack or space-sprint** shows a track that needs one wave, where nothing has changed.

---

## 10. Proposals of my own

**10.1 — Fix the GO! second while the countdown is in hand.** §2 found that the overlay counts from a
hard-coded 3 while the phase lasts 4000 ms, so "GO!" holds for a full second before anything moves.
Now that the countdown length is derived rather than fixed, the overlay should derive its digits from
the same one home — otherwise a stretched countdown will show "GO!" for even longer. It is a small
change and it is squarely in the area you are already looking at.

**10.2 — Delete the dead `countdownDuration` key and its Dev Panel control.** A control that silently
does nothing is worse than no control: it invites someone to "fix" the countdown by moving it and
then to distrust the whole panel when nothing happens. One key, one control, one commit.

---

## 11. What I did NOT do, and why

- **Did not build stage 2.** §7. Out of runway; left clean rather than half-done.
- **Did not delete the dead countdown key or its control.** §2 — a UI removal outside this mandate.
- **Did not change the countdown overlay's hard-coded 3.** §10.1 — same reason; it is a visible
  change and belongs with stage 2's eye test rather than smuggled in here.
- **Did not bring the shrink or the stagger placement.** §3.
- **Did not mint or merge.** The render fingerprint moved and this is visible; your eye decides.
- **Did not touch 5173.** §9.
