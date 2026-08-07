# RACE-NUMBERS-1 — the racer wears a number, the list carries the name

**Branch** `feat/race-numbers-1` off master `1fd0b471` · 2026-08-07 · **not merged, not minted**

---

## 1. Conformity, element by element

| the spec asked                                                | done | note                                                       |
| ------------------------------------------------------------------ | ---- | ------------------------------------------------------------ |
| Branch off master at `1fd0b471`, FORMAT → MEASURE → COMMIT           | yes  | Worktree, §7.                                               |
| (a) track label shows the NUMBER, at most three characters           | yes  | §2. Capped by construction, not by arithmetic.              |
| (b) standings list shows the number BEFORE the name                  | yes  | §2.                                                         |
| (c) numbers shown for everyone, always, during the race              | yes  | The label is the number; no gating was added.               |
| Number: fresh each race, one per racer, no two alike                 | yes  | A permutation of 1..N. §3.                                  |
| Number: deterministic from the seed                                  | yes  | §3.                                                         |
| **Number: must NOT consume from the race's stream — and PROVE it**    | yes  | §3, proved three ways, including the trap in §3.2.          |
| Number: display only, nothing the engine reads may see it            | held | Attached after the race is built; not in the engine closure. |
| Do not touch names, order, roster, or anything deciding a race       | held | The name is untouched in the data and still feeds tie-break and coat. |
| Do not build the start sequence or the alphabetical block            | held | Not started.                                                |
| Do not tear out the name-tag machinery                               | held | Only what the label *shows* changed.                        |
| RENDER expected to move on all ten; baseline `f2e170d17ccf84e9`      | yes  | §4 — all ten moved, measured against that baseline.         |
| WORLD must not move; run it                                          | yes  | §3.3. Unchanged.                                            |
| Ask the repo rather than the instruction                             | yes  | §3.3. And the selector gap was checked, not trusted.        |
| Combined hash as gate, per-track table as evidence                   | yes  | §4.                                                         |
| Do NOT mint, do NOT merge                                            | held | Neither.                                                    |
| Tests: same race with/without numbering · unique numbers · ≤3 chars   | yes  | §5, nine.                                                   |
| Do not touch 5173                                                    | held | §7.                                                         |
| Two proposals of my own                                              | yes  | §8.                                                         |
| Planner proposal 1 (dead weight now that labels are short)           | **taken** | §8.1 — and the answer is "less than you would think". |
| Planner proposal 2 (should the harness roster be revisited)          | **taken, answered** | §8.2 — yes, and what I would choose.        |

---

## 2. What changed on screen

**The track label is the number.** `racerRendering.js` draws `raceNumberLabel(r.raceNumber)` where it
drew `r.name`. `renderRaceFrame`'s `labelOf` measures the same string — if the layout and the renderer
disagreed about the text, every box the layout reasons about would be the wrong width, which is the
defect HARNESS-NAMES-1 was created to end.

**The standings list shows the number first**, in a small fixed-width chip with tabular figures so the
column does not jitter between rows. The track carries the number alone, so the list is the one place
a viewer reads number and name together.

**Three characters, by construction.** `raceNumberLabel` truncates. Fields cap at 100, so the cap is
never reached in practice — it is there so the promise holds structurally rather than by arithmetic
that happens to be true today.

---

## 3. How the draw is kept out of the race's stream

### 3.1 The mechanism

`assignRaceNumbers(count, seed)` **takes no rng argument**. It builds its own `mulberry32` inside
itself, from its own derived seed, and discards it. There is no parameter through which it could
advance a shared stream — the guarantee is structural, not a matter of being careful at the call site.

The seed is derived (`seed ^ 0x9E3779B9`) rather than reused, so two things "seeded from 5601" do not
produce correlated sequences.

It is also attached **after** `createRaceFromIdentity` has returned, beside `coatId` and `patternId`,
so there is no ordering by which it could participate in building the race.

### 3.2 The trap that would have caught a careful implementation

An unseeded race (`racePlanSeed <= 0`) runs off **`Math.random` directly**. So the natural defensive
move — "fall back to `Math.random` when there is no seed" — would consume from the race's own stream
in precisely the case it believed was safe, and only for unseeded races, which are the ones nobody
can reproduce to notice it.

The fallback is a **constant** instead. An unseeded race gets the same permutation every time, which
is harmless: the numbers are display-only and that race is already irreproducible. **A test asserts
`Math.random` is never called at all**, for seeded and unseeded alike.

### 3.3 The three proofs

| proof | result |
| --- | --- |
| **world fingerprint** | `dc4647be0f55ebdb` — **unchanged** |
| **`engine-reach --check` on the actual diff** | *none of 6 paths can reach the race engine* |
| **a test** | an independent generator is run through the numbering and lands exactly where it would have with no numbering at all |

The spec warned that `verify` does not select the render guard when only the harness changes. Checked
rather than trusted: this diff also touches client render files, so the selector did fire — but the
world guard did **not** fire (nothing reaches the engine), which is why it was run by hand, as
instructed.

---

## 4. The per-track table

Combined: **`f2e170d17ccf84e9` → `121cf3e0fd82966d`** — the gate.

| track | baseline | with numbers | ops Δ | |
| --- | --- | --- | --- | --- |
| city-circuit | `272c471d05d84c31` | `7fea404e1ce01327` | +24 | MOVED |
| dirt-oval | `7cdd997a89e18e58` | `03a9c43afae73e57` | +108 | MOVED |
| garden-path | `69759f5c45871291` | `98d836be026cec84` | +168 | MOVED |
| ice-track | `a131ea6e46e3e0d3` | `0f584791530b1084` | +12 | MOVED |
| luger-hill | `53d927b268c7eb12` | `e498fff0de52fd61` | +72 | MOVED |
| mountainstreet | `6bd79fb30cfb4a4d` | `6676f259b63f5fbf` | +216 | MOVED |
| river-run | `c5d3dba86e13b703` | `87cf5310193cc57a` | +48 | MOVED |
| searound | `e97888964a461fc9` | `e699e5bdf40d2c7c` | +144 | MOVED |
| seatrack | `5d3f5ce5d28ed1c1` | `c9bd2af2a2cc5a6b` | +120 | MOVED |
| space-sprint | `f5139a131f44ad75` | `05f5355f4325f3e7` | +72 | MOVED |

**All ten moved, which is exactly right** — every label draws different text on every track.

**The op counts went UP, and that is the finding in the table.** A shorter label is a narrower box, so
fewer labels collide, so the decluttering drops fewer of them: more labels are drawn, not fewer.
mountainstreet gains the most (+216) and it is one of the two tracks that overlapped worst with names.
**The numbers are already buying back label coverage before anyone has looked at the picture.**

---

## 5. Tests

**Added — `raceNumbers.test.js`, nine.** Both R7 questions each. The three the spec named:

- **the same seed yields the same race with numbering present and absent** — an independent generator
  is advanced ten draws, put through the numbering, then advanced ten more, and required to produce
  exactly what it would have without it. Plus the `Math.random` guard for the unseeded case.
- **every racer gets a number, no two alike** — a permutation of 1..N at every field size the game
  allows, so uniqueness is a property of the construction rather than of a retry loop.
- **the label never exceeds three characters** — including numbers beyond the current cap, so the
  promise survives a larger field.

**Deleted: none.**

---

## 6. Decisions made alone

**A permutation, not independent draws.** "No two alike" becomes a property of the construction
instead of a retry loop that could in principle not terminate.

**Numbers are 1..N, not stable per player.** A player gets a different number in every race. The
alternative — a number that follows a person — is a different feature with a different promise
(recognising *across* races), and the spec says fresh every race.

**The harness had to learn the number too.** It sets `r.name` and knew nothing of `r.raceNumber`, so
it would have gone straight back to measuring empty label boxes — the exact defect HARNESS-NAMES-1
ended, re-created one block later by a change with nothing to do with it. It now sets the number
through the shipped function. **The standing rule the harness keeps failing: every input the
component sets, it must set too.**

---

## 7. How to see it

```
git checkout feat/race-numbers-1     # then reload localhost:5173
```

Built in a worktree at `C:/ra-wt-num`; **the main tree was never switched and 5173 was never
restarted** — it is still on master.

**river-run at your open field size with realistic long names** — the question is whether the race is
visible again. Then **any track at a small field**, to confirm nothing else was lost.

---

## 8. Proposals of my own, and the two planner questions

**8.1 — Planner proposal 1, taken: less is dead than you would expect, and I would not remove it
yet.** The obvious candidates are the decluttering machinery in `nameTagLayout.js` — the incumbency
ordering, the edge hysteresis, the yield budget. They look like name-shaped weight and they are not:
they operate on *boxes*, and short boxes still collide in a dense pack, still churn at the frame edge,
and still need a stable ordering. The per-track op counts in §4 say so directly — labels are still
being dropped, just fewer of them. **What IS now dead weight is the `showRpStartRow` dev path**, which
appends `" (R3)"` to a label and takes a three-character label back over ten. It is a dev-only
diagnostic, default off, and it now fights the design. I would retire it in the block that does the
start sequence, not here.

**8.2 — Planner proposal 2, taken: yes, revisit the harness roster, and I would choose `current`.**
With MIXED the instrument saturates — every track overlaps, so a geometry-conditional rule fires
everywhere and the hash cannot discriminate. That was already true and the number work makes it worse
in the opposite direction: the *track* labels are now 1–3 characters, so the roster only affects the
standings list, and MIXED's whole justification — exercising the widest and narrowest label pairings —
no longer applies to the thing being measured. `current` (4–8 characters) is closer to what a track
label will actually be and would restore the instrument's ability to discriminate. **Not changed here,
as instructed**; it is a deliberate baseline move and belongs in its own block.

**8.3 — Mine: the standings list is now the only place the pairing is taught, and it is not visible
during the start.** The number on the track means nothing until a viewer has seen it beside a name.
The list does that, but a spectator looking at the grid before the gun has no reason to look right.
That is exactly what the next block's alphabetical name-and-number panel is for — worth confirming it
is the *first* thing shown, not the last.

---

## 9. What I did NOT do, and why

- **Did not build the start sequence or the alphabetical block.** The next block, and it moves the
  camera fingerprint too.
- **Did not remove the decluttering machinery.** §8.1 — it is not name-shaped weight.
- **Did not change the harness roster.** §8.2 — instructed not to, and it deserves its own baseline
  move.
- **Did not make numbers stable per player.** §6 — a different feature with a different promise.
- **Did not mint or merge.** Visible; your eye decides.
- **Did not touch 5173.** §7.
