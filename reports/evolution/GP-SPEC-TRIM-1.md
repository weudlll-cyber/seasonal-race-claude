# GP-SPEC-TRIM-1 — the spec is one claim now, and the contradiction around it is settled: garden-path IS scorable, and the sweep is not scoring a track that fails two of its twelve items

> **His decision, 2026-09-04**, revising his earlier *delete the file*: keep only what is needed.
> **77 lines → 60**, and what survives is exactly *"this track finishes in the browser"*.
>
> ★★ **THE CONTRADICTION IS NOT DOUBTFUL ANY MORE. IT IS FALSE, MEASURED ON THE HARNESS THE CLAIM IS
> ABOUT.** One race, 255 s. §2 — and the exclusion's justification goes with it.
>
> **What the sweep RUNS is not changed. That decides what reddens a build and is his.**

---

## 1. THE TRIM

The file's purpose is now its first sentence, and everything that is not carrying it is gone.

| removed | why it was not carrying the claim |
| --- | --- |
| **two paragraphs of removal history** — what the deleted test asserted, why the survivor stays, what the deleted test's mechanism still has | history of a removal, whose home is `DROP-GP-SPEC-1.md`. Retelling it here is a second home for one fact |
| **the e2e ports paragraph** (4399/5399, safe beside 4173) | true, useful, and about EVERY e2e spec. `e2e-env.js` is its home |
| **`test.slow()`** | a second mechanism beside an explicit `setTimeout` for the same thing |
| **the 25-minute budget** | **stale setup.** It was sized when the race was believed possibly never to finish. The race is ~82 s of race time; the budget is now 10 minutes for the poll, 12 for the test — still ~7× — and the comment says that **if it ever expires that is a finding, not a budget to raise** |
| **a line citation** (`viewerProbe.js:614`) | converted to `` `viewerProbe.js` → `_crossed` `` under R19. Both symbols in the trimmed file were checked to resolve; **no line citation remains in it** |

**KEPT, and each earns its place:** the probe wait (the mechanism), the `fieldSize > 1` guard (without
it an empty race is indistinguishable from a slow one and the failure is an opaque timeout), the
crossing poll (the claim), the finish-time assertion (the claim's consequence), and the wall-clock
note (it stops the budget being read as the race's length).

---

## 2. ★★ THE CONTRADICTION, SETTLED BY RUNNING THE RACE THE ENTRY ASKED FOR

`scripts/viewer-invariants.mjs` dropped garden-path from the gate's scorable items *"whose race never
finishes at seed 9, so it was never scorable anyway"*, and `SHIP-CEREMONY.md` repeated it. On
2026-09-03 both were flagged **DOUBTFUL** rather than corrected — deliberately, because two *other*
harnesses had retracted the same claim and settling a third on their evidence is the exact mistake
BACKLOG-VERDICTS-1 made about this track.

**The entry's own `verify:` was a race, not a grep. It was run:**

```
node scripts/viewer-invariants.mjs --tracks=garden-path --seeds=9 --arm=shipped
  → 1 race in 255 s, a full acceptance sheet
```

**Garden-path finishes at seed 9 and is scorable.** It reaches **PHOTO_FINISH with the winner on
canvas** at (0.465, 0.695), and it is **graded on all twelve items**:

| | |
| --- | --- |
| passing | **ten of twelve** |
| **failing** | **item 9 — the winner is cut**: 4 violations, worst at frame 6241, winner at (0.481, 0.855), outside the subject's inner 0.7 region |
| **failing** | **item 10 — walk: 0.52** |

### ★ So the exclusion's justification is gone, and the cost is not zero

It was excluded on the ground that **there was nothing to score**. There is, and **two of the twelve
fail**. The line *"costs nothing while it stands"* — which I wrote on 2026-09-03 — was wrong for the
same reason the claim it defended was wrong.

**WHAT THE GATE RUNS IS NOT CHANGED.** That decides what reddens a build before a merge and it is
the owner's; it is on the morning sheet as his. **The nightly sweep still runs all ten**, so those
two failures are visible a day later rather than never — which is the difference between a gap and a
blindness.

**Both sites corrected in place**, and the backlog entry filed for this on 2026-09-03 is closed by
its own verify command. Open boxes 57 → 56.

---

## 3. THE HARNESS FAILED SILENTLY ON ITS FIRST RUN, AND THAT IS WORTH SAYING

The first attempt **hung for fifteen minutes with no output past `1 race(s), 6 at a time`**.
`client/dist-sweep/` was **empty** and nothing was listening on the app port: the build the sweep
spawns had produced nothing, and the sweep waited for an app that would never come.

**Run by hand, the identical build succeeds in 873 ms.** So the failure is in how the sweep spawns
it — `stdio: "ignore"` on a spawned `npx vite build` means a build that fails or does not run leaves
**no trace at all**, and the symptom is an instrument that hangs rather than one that fails.

**The second run, with `dist-sweep` already populated, worked.** So this is reproducible-ish and not
understood. **Not fixed here** — it is not what A4 asked for and the fix would be a change to a
gating instrument — but it is a real defect in an instrument the ship ceremony depends on, and it is
filed for the morning sheet: **an instrument that hangs is worse than one that fails, because a hang
looks like patience.**

---

## Limits

**One race, one seed, one arm.** The claim established is exactly *"garden-path finishes and scores
at seed 9 under the shipped arm"* — which is precisely the claim the exclusion rested on, and no
more. It says nothing about other seeds.

**The two failing items are reported, not diagnosed.** Whether item 9's winner-cut and item 10's walk
are garden-path defects, gate-threshold defects, or expected on a track nobody has scored, is a
question this piece did not open.

**The trimmed spec was not run.** It is a ten-minute browser test in a suite that sits outside the
ordinary path by rule (R7). Its syntax is checked, both its symbol citations resolve, and its logic
is unchanged from the version `NIGHT-RUN.md` last recorded passing — but *"it still passes"* is not
a claim this report makes.

**The budget reduction is arithmetic, not measurement.** 82 s of race time against a 10-minute poll
is ~7×; the old 25 minutes was ~18×. Neither number came from timing the test in this environment.
