# VERIFY-COST-1 — the verification loop costs less, and the standing rules have a home

**Base** master `e2ad9cfd` · **Branch** `feat/verify-cost-1` · PR #127 untouched, and no fingerprint
value it reports has moved.

Scripts, config and docs only. **No camera or render fingerprint was run**, which is R5 and R3 in
practice: nothing drawn or decided changed, so neither had a question to answer. The world
fingerprint was run twice — it is the acceptance for item B.

---

## What each item saves, and what it no longer covers

| item | saves | what it no longer covers |
|---|---|---|
| **A** tripwire triggers on engine reach | ~113 s per presentation block that touched a non-camera module | 84 of the 103 files the folder rule fired on — measured unreachable from `raceCore.js` |
| **B** world fingerprint runs its tracks in parallel | **195 s → 113 s (−82 s, 42%)**, on every mint | nothing — byte-identical hash |
| **C** coverage stays in CI | nothing; it was already correct | nothing |
| **D** standing rules move to `docs/VERIFY-RULES.md` | spec length | nothing |

---

## A — the trigger, and why it is NOT `ENGINE_INPUT_MODULES`

**The spec's proposal is unsafe, and the measurement says so plainly.** That list is `raceCore.js`'s
**direct** imports — 11 files, which is exactly what its guard checks. The transitive closure is
**19**. The eight in the gap include:

- **`autoSpriteScale.js`** — the precise file the mint tripwire was created for (CAMERA-MINT-TRIPWIRE-1)
- **`storage/defaults.js`** — the file whose slider bound fired the tripwire last time

Triggering on that list would have stopped catching the incident that produced the rule.

**What I did instead is better than either option offered**, and only because there are **zero dynamic
imports** in the closure, so a static walk sees every edge. `scripts/engine-reach.mjs` computes the
closure from source: **19 files against 103** — a real saving, and *complete* rather than merely
smaller. `--check <paths>` answers the ceremony's question directly.

**Sabotage, not reading** (`scripts/engine-reach.test.mjs`, +6): a new import must make the closure
GROW; a two-hop transitive import must be followed; presentation code must stay out; the
dynamic-import detector is shown able to fire, and the real closure asserted to contain none. Script
suite **121 → 142**, green.

**Stated in the rule's own text** (SHIP-CEREMONY.md): it does not catch values passed INTO the engine
as arguments from a screen file — `drawnBodyWidthRefPx` is the standing example — nor dynamic imports,
nor the seed and track JSON. `ENGINE_INPUT_MODULES` and its guard stay as the "did a new direct engine
input appear" alarm.

## B — parallel, identical

`dc4647be0f55ebdb` before and after. **195 s → 113 s.**

Safe structurally, not hopefully: each track was already an isolated child process with its own
`--out` directory and fixed seed, and the combining loop still walks `TRACKS` in the fixed order, so
completion order cannot reach the hash. Capped at core count — these are CPU-bound, and
oversubscribing would have made the change look worthless.

**Only 1.7×, not 10×, and the reason matters:** the wall clock is now the SLOWEST SINGLE TRACK.
Shortening it further means making garden-path cheaper, not adding workers.

**Camera and render: not done, with the numbers.** Camera **47 s**, render **15 s** — both measured,
and both correct the ceremony's stale "~85 s / ~30 s". At the same 1.7× that is ~20 s and ~6 s saved.
Both are single-process loops, so parallelising means spawning children and re-testing in-process
shared state (the racer-type registry, sprite caches). **I did not**: ~26 s of saving, sitting on top
of the two baselines PR #127 is waiting on, against a spec that forbids touching them. Worth doing
once #127 lands.

## C — the premise was false, and that is the finding

**Coverage never ran locally.** `npm test` is `vitest run`; the `coverage:` block in
`client/vitest.config.js` is configuration for when coverage is *asked for*, not an enable. CI already
runs `npm run test:coverage`. **The split the spec asked me to create already existed**, so nothing
was changed and the record is corrected instead.

Both timings, measured: **plain 185 s, coverage 343 s** (+158 s, 1.85×). Coverage does cost what was
assumed — it simply was not being paid on the inner loop. Where it runs is now written down, so
nobody later discovers it "stopped".

## D — the rules, with reasons

`docs/VERIFY-RULES.md`: R1 world-fingerprint trigger · R2 before-only-when-relative · R3
measure-at-the-end · R4 two-tracks-not-ten · R5 eye-vs-harness · R6 report-vs-commits · R7
ask-before-writing-a-test. One sentence each on why it is safe, plus the instrument cost table.

**One disagreement, stated rather than quietly ignored (R6).** The spec says the derivation belongs in
the commits. I wrote that rule and added a narrow exception: **a refuted hypothesis belongs in the
report when it would otherwise be retried.** "Not the OneDrive condition" is worth a line forever; "I
first tried a threshold of 0.01" is not. Without it the next block re-runs experiments already paid
for this week.

## E — test hygiene, both directions

**Added 6. Deleted 0, merged 0** — and I would rather say that plainly than perform restraint: nothing
in this diff made an existing test redundant. The restraint that *was* exercised is visible in the
shape — six tests asserting PROPERTIES (the closure grows, two hops are followed, presentation stays
out) rather than nineteen asserting the closure's members by name, which would fail on every honest
refactor and teach the next person to re-bless the list without reading it.

---

## Proposals

**P1 (the spec's) — the most expensive thing remaining is ONE TEST FILE.** Measured across 179 files:
summed file time 384 s, wall clock 185 s. The **slowest ten are 85%** of it, and
**`goldenEquality.test.js` alone is 176.5 s — 46% of the entire suite**; `replay.test.js` adds 55.5 s
(14%). Those two are 60% of every local run.

That is the owner's real per-iteration cost and neither of us had looked. I have not touched them:
both are behaviour-identity tests, and shrinking them is exactly the "two truths for one thing" trap
this spec warns about. The honest next step is to find out *why* golden-equality costs 176 s — whether
it is running full races, and whether the same assertion holds over fewer, better-chosen cases. That
is R4 applied to a test file, and it is one measurement block.

**P2 (mine) — the ceremony's cost column was wrong in both directions and nothing checks it.** It
claimed ~85 s for camera (actually 47 s) and ~30 s for render (15 s today, ~77 s once the finish
window lands). Stale numbers in a checklist are how people decide not to run something. The fix is not
to re-measure by hand: each fingerprint script could print its own elapsed time and the ceremony could
quote the script rather than a remembered figure. Cheap, and self-maintaining.

**P3 (mine) — `--check` belongs in the pre-commit hook, not only in the ceremony.** A rule a human
reads on a busy day is precisely what stage 2 of the original tripwire existed to replace. The hook
already runs lint-staged; adding `engine-reach --check` over the staged files and printing *"this diff
can change the race — mint before you ship"* costs milliseconds and delivers the rule at the moment it
applies. Not added here: a hook that prints on every commit needs the owner's tolerance for noise, and
that is his call.
