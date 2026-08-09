# SHIP-THREE — the 5, the refusal and the guard

**2026-08-09.** Merge commit `f1c3d18d`, tag `v-ship-three`, return point `pre/ship-three`
(`1ea3a6bb`). Followed [docs/SHIP-CEREMONY.md](../../docs/SHIP-CEREMONY.md).

## The fingerprint line

```
WORLD       dc4647be0f55ebdb  ->  dc4647be0f55ebdb   UNCHANGED (28 blocks, two ships)
WORLD-OFF   854018ee5d3d83e1  ->  854018ee5d3d83e1   not re-run — see below
CAMERA      7ba59a6378d37a2c  ->  ad07c08ce5d8ae49   MINTED
RENDER      9b7acc7419c5ba59  ->  752df7bc61ef0721   MINTED
```

**Camera and render were RE-RUN on the combined branch, not carried over from
`feat/min-racers-5`** — that was the point of the instruction, and it answered the question it was
asked: both came back **identical** to the values measured on `min-racers-5` alone, so the
maintenance strand does not touch the picture. Both were then confirmed a third time by the
post-merge run on master.

**`world-off` was not re-run, and that is a deviation worth stating.** The ceremony's step 3 says to
mint the ON and OFF worlds. Nothing in this ship touches the engine — `engine-reach --check` clears
every changed path except `defaults.js`, whose only moved key is read by the camera — and the ON
world is byte-identical, so the OFF arm has no question to answer. Recorded in the record rather
than silently skipped.

## What merged

**16 files, one merge commit, two strands** brought together on the branch first so master received
one commit rather than two:

- **MIN-RACERS-5** — `minRacersVisible` 3 → 5, the owner's verdict, eye-tested and accepted on
  city-circuit. With its two mirrors: `framingConfig.js`'s partial-config fallback, and the Dev
  Screen slider, which now reads `DEFAULT_CAMERA_CONFIG` instead of carrying a literal.
- **VERIFY-BASE-1** — `npm run verify` refuses when routing selects no guards, exit 2.
- **FALLBACK-GUARD-1** — `check-fallback-agreement.mjs`, wired beside `check-config-keys` in all
  three of its homes, green over a 42-entry exception list that is a worklist rather than permission.

**The two strands were independent and the merge proved it.** The only overlapping file was
`reports/night/INDEX.md`, where both appended; both sets of entries kept, newest first. Nothing
under `client/src/` or `scripts/` conflicted, which is what the block asked to be checked.

## Verify and CI

**`npm run verify` on master: PASS 7, FAIL 0, SKIP 0** — 16 files routed, every guard run.
client-suite 275.4 s (alone), world 262.1 s, camera 201.8 s, render 195.0 s, script-suite 43.6 s,
containment 37.9 s, doc-guards 17.2 s.

**The run needed `--base=1ea3a6bb`, and the refusal shipping in this very merge is what told me so.**
An argument-free run on master now prints:

```
REFUSED: this run would verify NOTHING, and a run that verified nothing must not exit 0.
         you are ON master — HEAD and the base are the same commit (f1c3d18d) …
           npm run verify -- --base=1ea3a6bb
```

That is the SHIP-THE-LINE defect — a green exit over seven skipped guards — caught by the tool one
ship later, on the first occasion it could have recurred.

**CI green on the combined branch before the merge** (run `31321525097`, both jobs) — R8 exception 1,
because the verify path is in this ship. CI also ran on the push to master.

### One guard fired, and it was right

`check-measured-stamps` failed the first CI run on the combined branch, on the tracking-lag table in
`docs/CAMERA_DIRECTOR.md`. **Re-measured rather than re-stamped**, because the camera fingerprint had
already moved and that is reason to doubt the numbers, not to re-date them:

> LEADER_ZOOM median **3.91 → 3.77 pp**, p95 8.66 → 8.62; pooled 4.78 → 4.74; OVERVIEW ratio
> 0.54× → 0.55×. **Every frame count unchanged** — the tell that this is not a ceremony-length
> change like the previous two re-measures, but the lag itself moving because a wider shot is
> tracked more closely in percentage-of-frame terms.

Two things worth carrying forward. First, the guard fired for a **neighbouring reason**: its
`depends=` is `client/src/modules/camera/`, so what it saw was `framingConfig.js`'s mirror moving —
but the value that actually moves the measurement is `defaults.js`'s, which is not in its trigger set
at all. It caught the right document by luck of adjacency. Second, **this guard passed on
`feat/min-racers-5` when I ran it there, for a bad reason**: I ran the guards before committing, and
it reads git history rather than the working tree, so there was no commit touching `camera/` yet. A
history-reading guard run on an uncommitted change is not evidence.

## The new guard, on the world it now guards

`check-fallback-agreement` on the combined branch: **361 mirrored fallbacks, 42 disagree, 42 on the
exception list, 0 new, 0 stale.** The interaction the block asked to be confirmed is visible in one
number: **by-reference reads rose 52 → 55**, because MIN-RACERS-5 pointed the three Dev Screen slider
sites at `DEFAULT_CAMERA_CONFIG`. `minRacersVisible` now reads 5 against a default of 5 in
`framingConfig.js`, and no exception entry went stale.

## Ceremony steps that did not apply

| step | status |
|---|---|
| 1. Paired fairness gate | **N/A** — gated on the world moving. It did not. |
| 2. Set the default + re-confirm | **Partly** — `minRacersVisible` IS a `defaults.js` change, but a camera one; the mechanical gates it names (parity/golden) cannot see it, and they pass unmodified. |
| 4. REBASELINE top block | **N/A** — "required whenever the SHIPPED WORLD CHANGES". Unchanged. |
| 5. SIM.md lineage | **N/A** — SIM.md owns the ON/OFF *world* lineage; neither moved. |
| 6. Golden / replay re-pin | **N/A** — outcomes byte-identical; the golden suites pass unmodified. |
| 9. Canonical-doc sweep | **N/A** — same trigger as 4. |
| 10. Owner's eye | **Done** — city-circuit, before this block. |

Steps −1, 0, 3, 7, 8, 11 and 12 were run.

## Left for the owner

The fallback guard's exception list is a **worklist of 42**, ordered by damage in
[FALLBACK-GUARD-1.md](../night/FALLBACK-GUARD-1.md). The two sharpest are unchanged by this ship:
`outcomePhaseThreshold` 0.65 against a stale 0.75 in three files (the resolver, the slider he would
judge with, and the HUD he would read while judging), and `rowBonusPulk`, whose fallback is the
ACTIVE value so a partial config gets more behaviour than the shipped world. Neither was touched —
both need a decision, and `postStartHoldMs` may want a rename rather than an alignment.
