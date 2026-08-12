# SHIP-RUNIN-CONVERGE — the run-in and the convergence fix go to master

**Two merges, in this order, on the owner's authorisation after judging a production build of the
combined tree.** Nothing about the code changed between what he saw and what shipped.

| ship                | return point                          | ship tag                             | merge      |
| ------------------- | ------------------------------------- | ------------------------------------ | ---------- |
| RESOLVE-CONVERGE-1  | `pre/ship-resolve-converge` `e1f53781` | `v-ship-resolve-converge` `d7eca25d` | `d7eca25d` |
| RUNIN-1             | `pre/ship-runin` `0b6d6098`            | `v-ship-runin` — see §5              | `eea0acf2` |

The blocks themselves are reported separately and are not restated here:
[RESOLVE-CONVERGE-1](RESOLVE-CONVERGE-1.md), and the run-in's six
([RUNIN-STATE-1](RUNIN-STATE-1.md) → [RUNIN-OWNS-1](RUNIN-OWNS-1.md) →
[RUNIN-MINIMAL-1](RUNIN-MINIMAL-1.md) → [RUNIN-GLIDE-1](RUNIN-GLIDE-1.md) →
[RUNIN-WIDTH-1](RUNIN-WIDTH-1.md) → [RUNIN-PACE-1](RUNIN-PACE-1.md)). This report carries what only
the ship can carry: the order, the mint, and the CI runs.

## 1. Why the convergence fix went first

It is independent and it stands on its own: over 172226 frames it fires zero times without the
run-in, so both fingerprints were byte-identical to stored and there was nothing to mint. Shipping it
first means the run-in's mint is taken on a tree that already contains it, and the two moves are
still separable because both were measured apart before the merge — see §3.

## 2. Step −1 on each merge, and one thing worth naming

`git diff --name-only master...<branch>` was run before each merge.

- RESOLVE-CONVERGE-1: **7 files**, all this block's.
- RUNIN-1: **46 files**. 29 of them are under `scripts/` and 28 of those are a **prettier sweep**
  carried in `33de4bea` and unmentioned by its commit message. **Verified inert rather than assumed**:
  each file's master version was formatted with prettier and compared byte-for-byte against the branch
  version — 28 of 29 matched exactly. The 29th, `check-runin-frame.mjs`, is the run-in's own guard and
  is a real change. Recorded because a merge that carries an unannounced sweep is exactly what step −1
  exists to surface, and because the next person diffing this merge will see the same 28 files.

## 3. The mint — measured fresh on the merge, and attributed

| role       | before             | on `eea0acf2`      |                                    |
| ---------- | ------------------ | ------------------ | ---------------------------------- |
| world      | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unmoved** — re-run in full       |
| world-off  | `854018ee5d3d83e1` | not re-run         | the ON world is unmoved            |
| camera     | `64432e18a7e62188` | `c1556053b1824758` | **minted**                         |
| render     | `096f2726c45ed853` | `c962df5334277f95` | **minted**                         |

**CAMERA moves in two parts and both were measured, not argued.** The run-in alone puts it at
`988a9b31aaf9768a`; RESOLVE-CONVERGE-1 carries it the rest of the way to `c1556053b1824758`, and per
track that second step moves **ice-track alone** (`a083c940ba3400c7` → `54dc4193568e9c91`), the other
nine byte-identical. **RENDER moves for the run-in alone** — measured on the run-in branch before and
after the convergence fix was merged into it, this instrument read `c962df5334277f95` both times.
That is a sampling result and is stated as one: it samples 16 frames of 5600 per track and none land
in the one window the repair acts on.

**THE OFF-ARM PROMISE STILL HOLDS, AND IT WAS MEASURED ON THE MERGED TREE.** `runInShot` was flipped
to `false` in `defaults.js` on `eea0acf2` (the edit and its revert both wrapped in
`scripts/prove-changed.mjs`), and both instruments reproduced the predecessor values exactly —
camera `64432e18a7e62188`, render `096f2726c45ed853`. So neither block changes anything until the
run-in composes, on a tree that contains both. The reasoning lives beside the value in
[fingerprints.json](../../docs/fingerprints.json), which is its one home.

**The WORLD was re-run rather than inferred**, and the reason is a trap worth recording:
`defaults.js` IS in the engine hull and this merge genuinely edits it, but `engine-reach --check`
compares the WORKING TREE, so on a tree whose merge is already committed it reports "byte-identical /
INERT" and can say nothing at all about the merge. The two keys are camera keys and the race is
untouched — but that is the conclusion the measurement supports, not a reason to have skipped it.

## 4. What holds on master

- **`check-runin-frame` PASS**, both halves, both tracks, empty-frame half over the whole race —
  luger-hill 0.15 TW, searound 0.94 TW against an untouched limit of 2, **0 empty frames**.
- **Tracking lag re-measured on the merged tree**, not carried over from either branch; the stamp in
  [CAMERA_DIRECTOR.md](../../docs/CAMERA_DIRECTOR.md) names `eea0acf2`.
- **`npm run verify` green on the committed state.**
- Two keys ship, both defaulting to the new behaviour: `runInShot: true`, `runInOpenMs: 1250` — the
  owner's own number. Both reachable from the Dev Screen's ending controls.

## 5. CI — a ship is finished when CI is green for that exact SHA

| ship               | master SHA | CI run        | conclusion  |
| ------------------ | ---------- | ------------- | ----------- |
| RESOLVE-CONVERGE-1 | `0b6d6098` | `31630061033` | **success** |
| RUNIN-1            | `c8330950` | `31631773305` | **success** |

Each run's `headSha` was read back and checked against the master tip rather than trusting the
branch view, which can show a green run for the commit before yours.

`npm run verify -- --base=e1f53781` — the full-weight run across both ships — is green on the
committed state: **PASS 19, FAIL 0, SKIP 0**, with all three fingerprints reproduced independently
of the minting run (`c1556053b1824758` / `c962df5334277f95` / `dc4647be0f55ebdb`). The first attempt
failed on `check-tags` alone, correctly: the tag pair was registered but not yet at origin. That is
the guard doing its job and it is recorded rather than quietly re-run.

## 6. Where master is served

Both servers point at master at `c8330950`, with the pill read from the served bundle in each case —
see the report's delivery note. The run-in is ON by default there, so ice-track seed 9 shows the
shipped shot.
