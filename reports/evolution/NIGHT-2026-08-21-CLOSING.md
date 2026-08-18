# Closing note, night of 2026-08-21 — the ship finished, four of five pieces, and one thing needs your decision

## WHAT YOU MUST DECIDE IN THE MORNING

**One question, and it is the only one tonight produced:**

> **The ending waits for people it has stopped showing. Should it?**
>
> Phase 6 — the wait for the stragglers — was measured for the first time tonight. When the zoom-out
> begins, **half to three-quarters of the field is still racing and almost all of them are already
> off the canvas**: on dirt-oval at 20 racers, **all 11** still-running racers are outside the
> picture; at 40, **27 of 29**. Across the whole phase, **54–75% of frames have at least one
> unfinished racer outside the picture**, and on three of four runs there is a frame with **no
> unfinished racer in shot at all**. The ending then goes on running for **4.45–7.53 s** waiting for
> them.
>
> **This is not a defect and nothing was changed.** FINISH_OVERVIEW holds a fixed point behind the
> line *deliberately*, so that later finishers cross in shot; anyone further back is outside it by
> construction. **The question is whether the ending should keep waiting for racers it is no longer
> showing.** Two ways to change it and what each costs are in
> [STRAGGLER-TRUTH-1](STRAGGLER-TRUTH-1.md); both are camera or product changes and neither was
> made, because you accepted the start on 2026-08-21 and nothing tonight was to touch the picture.

**Nothing else needs you.** The other four items below are done, merged and green.

## THE TREE, FIRST — THE SHIP WAS FINISHED BEFORE ANYTHING ELSE BEGAN

`SHIP-START-ONE-WINDOW` completed at the top of the night: merge `884d0562`, tag
`v-ship-start-one-window`, **CI green for exactly that SHA** (run `32192319823`, hand-cranked on the
tag ref because the merge and its step-9 follow-up shared a push). CAMERA `f64c2ae531f14253` and
RENDER `a8c59ef5002716f1` minted; WORLD and WORLD-OFF measured and unmoved.
`feat/start-one-window-1` and `fix/zoom-pivot-start-1` merged and deleted;
`feat/start-handover-mark-1` archived as `archive/start-handover-mark-1` and deleted.

**Nothing tonight touched the race, the camera or the picture.**

## THE FIVE PIECES

| | piece | state |
| - | ----- | ----- |
| **A** | [STRAGGLER-TRUTH-1](STRAGGLER-TRUTH-1.md) — phase 6 measured | **merged** |
| **B** | [DEV-CONTROLS-HONEST-1](DEV-CONTROLS-HONEST-1.md) — the three Dev controls | **merged** |
| **C** | [E2E-FLAKE-HUNT-1](E2E-FLAKE-HUNT-1.md) — the flakes and the 404 | **merged, and it changed nothing** |
| **D** | [HOOK-SELF-CHECK-1](HOOK-SELF-CHECK-1.md) — the hook vouches for itself | **merged** |
| **E** | the eight auth comments and the section map | **NOT DONE — dropped to budget, as instructed** |

**A — phase 6 is measured and both of its recorded numbers were wrong.** "~2.9 s at 20 racers" is
**4.45–6.18 s**, and it grows with the field. "The zoom-out starts ~1.4 s before it ends" is
**2.30–5.75 s**, so the ending overlaps the race by two to six seconds — the doubted number was
doubted correctly. The answer replaced the "UNVERIFIED" section in `docs/ENDING-PHASES.md` rather
than sitting beside it, and now carries a `MEASURED:` stamp, which was the other half of the original
complaint.

**B — the three Dev controls could not have been fixed, because they already were.** ONE-HOME-1
repaired the code and said in its own hand-back table that the test was not written. This is that
test: **empty storage, real defaults**, so no assertion can be satisfied by a number typed into the
test file. Sabotage-proven with the exact wrong literals the audit named — `false` for a checkbox the
game runs ON, `1.0` for a multiplier the game runs at `2.0`.

**C — nothing was changed, and that is the result.** Five consecutive full e2e runs: **103/103 every
time**. The four named flakes did not recur, so there was no shared dependency to point at and
nothing to decouple. `d11:182` *did* fail 1-in-7 under an artificial `--repeat-each=6` load, and it is
a **30 s time-budget overrun with the race running normally in the snapshot** — not a 404. **The 404
was never seen and is honestly NOT ESTABLISHED**; a missing sprite is ruled out, and the test is
exactly as it was.

**D — the hook now refuses to run as something the repository does not track.** It compares
`.githooks/` against the **index**, not HEAD, so the hook can still be improved through itself, and
it also refuses an untracked file in that directory because git would run it. Proven three ways by
running it. `VERIFY-RULES.md` gains **R12a**.

**E — dropped, and here is what it needs.** `docs/AUTH.md` still carries the five-entry section map
its header exists for, and eight source comments still cite the archived design's section numbers.
The work is: change each comment to name its section rather than its number, verify each still points
at something true, then delete the map. **It is bounded and mechanical — perhaps twenty minutes — and
nothing depends on it.** The drop order said E first if time ran short; it ran short.

## THE CLOSING STATE, PROVEN

- **Origin holds master alone.** `git ls-remote --heads origin` → one ref.
- **CI green for exactly each merge SHA**: `8b1f8d24` (A), `90f12a89` (B), `14883331` (C),
  `1d116071` (D), plus the ship's `884d0562`.
- **Tree clean, no stashes, no local branches but master.**
- **Tags registered** — `check-tags` reports 107 at origin, 107 declared, 0 either way.
- **All four fingerprints reproduce `docs/fingerprints.json`**, measured on master tonight:
  WORLD `dc4647be0f55ebdb` · WORLD-OFF `854018ee5d3d83e1` · CAMERA `f64c2ae531f14253` ·
  RENDER `a8c59ef5002716f1`. **Nothing minted tonight and nothing moved** — no piece touched a file
  inside any instrument's closure.
- `npm run verify` green before every merge.

## PROPOSALS

1. **The flake ledger should accumulate, not be re-derived.** Three separate nights have now run this
   e2e suite five times each and reported a rate; nothing collects those, so each night re-derives
   "about one run in five" from scratch — and tonight's five green runs would have told me, before I
   started, that the four named flakes have not been seen since 2026-08-17. A file that appends run
   outcomes turns an impression into a measurement.
2. **`d11:182` spends its 30 s budget getting to the start line**, adding five racers one at a time
   through the UI, and only then asserts the thing it is named for. A roster fixture — the way
   `seedGeometry` already seeds tracks — would remove its contention sensitivity **without touching a
   single assertion**. It is the repair I would make if the failure were reproducible in a normal run.
3. **Two of tonight's four pieces found the code already correct and the evidence missing** (B's
   controls, C's flakes). That is a good sign about the code and a poor one about the record: both
   were on somebody's list as open. **A short pass over the open lists to re-check which are still
   true would cost less than either piece did.**
