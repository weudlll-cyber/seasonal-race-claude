# SHIP-THE-LINE — the picture line goes to master

**2026-08-09.** Merge commit `c5099b3a`, tag `v-ship-the-line`, return point `pre/ship-the-line`
(`8547640d`). Followed [docs/SHIP-CEREMONY.md](../../docs/SHIP-CEREMONY.md).

## The fingerprint line

```
WORLD       dc4647be0f55ebdb  ->  dc4647be0f55ebdb   UNCHANGED
WORLD-OFF   854018ee5d3d83e1  ->  854018ee5d3d83e1   UNCHANGED
CAMERA      00cafa2432add0f7  ->  7ba59a6378d37a2c   MINTED
RENDER      f2e170d17ccf84e9  ->  9b7acc7419c5ba59   MINTED
```

**The race did not change and the picture did** — the correct signature for a line whose subject was
what the viewer sees. The world has now held the same value for twenty-five blocks, including through
this line's one engine change (`SIDE-FREE-CULL-1`, byte-identical by construction). Values live in
[fingerprints.json](../../docs/fingerprints.json); this report states old → new because the ceremony
asks each ship to record the transition.

## What merged

254 files as one merge commit: 180 of them the benches' raw data under `reports/perf`, 16 night
reports, 58 code and doc files. Race numbers; the label occlusion rule with its two exemptions (the
camera's subject, and the photo finish); the start board through eight blocks; the ceremony timings
and the countdown repair; the frame-input seam; the verify and hook cost work; the camera-doc
corrections; the three perf benches; the `isSideFree` neighbour cull.

`git diff --name-only master...feat/side-free-cull-1` was read before merging, per the section the
accidental-chain-merge incident wrote into the ceremony. Nothing in it was outside the block's list.

## Verify and CI

**`npm run verify` on master: PASS 7, FAIL 0, SKIP 0** — 254 files routed, every guard run.
client-suite 313.7 s (alone), world 258.7 s, camera 199.9 s, render 194.8 s, script-suite 45.5 s,
fingerprint-containment 39.2 s, doc-guards 17.6 s.

**CI ran BEFORE the merge, not after, and that was the ceremony overruling the block.** The block
asked for CI after; [VERIFY-RULES](../../docs/VERIFY-RULES.md) R8 exception 1 says a change touching
CI, the guards or the verify path must be green FIRST because a local run would be marking its own
homework — and this line changes `scripts/verify.mjs`, `scripts/verify.test.mjs`, four guard scripts
and `.husky/pre-commit`. Run `31314222563` on `feat/side-free-cull-1`: both jobs green. CI also ran
again on the push to master; result in the block's reply.

### One finding the ceremony should absorb

**`npm run verify` on master is a no-op.** It routes on `git diff master...HEAD`, which is empty when
you *are* master, so the first run reported `PASS 0 FAIL 0 SKIP 7` — seven guards skipped, exit code
0, and nothing verified. A green exit code that verified nothing is the exact shape this project
distrusts everywhere else. The full-weight run needs an explicit base:

```
npm run verify -- --base=<the commit master was at before the merge>
```

Not fixed here — a post-merge default for `--base` is a change to the verify path, which by R8 would
itself need CI first, and this block had a merge to land. Recorded as the next verify block's work.

## Ceremony steps that did not apply, and why

| step | status |
|---|---|
| 1. Paired fairness gate (N=100 quartet) | **N/A** — gated on the world moving. It did not. |
| 2. Set the default + re-confirm | **N/A** — no `defaults.js` value changed the race; the keys this line adds are camera/label. |
| 4. REBASELINE top block | **N/A** — "required whenever the SHIPPED WORLD CHANGES". Unchanged. |
| 5. SIM.md fingerprint lineage | **N/A** — SIM.md owns the ON/OFF *world* lineage; neither moved. |
| 6. Golden / replay re-pin | **N/A** — outcomes are byte-identical; the golden suites pass unmodified. |
| 9. Canonical-doc sweep | **N/A** — same trigger as 4. The shipped-world identifier in the evolution INDEX header is still correct. |
| 10. Owner's eye | **Done before this block** — the owner has seen and accepted every visible change on the line. |

Steps −1, 0, 3, 7, 8, 11 and 12 were run.

## The strand fork — five branches are NOT in this ship

The block asked for an ancestry check because the chain forked once this week unnoticed. **All 28
branches of the named line are ancestors of the head.** Five other `feat/*` branches are not, and
none of them is named in the ship:

- `feat/min-racers-visible-5` — one line in `defaults.js`; its own commit says **NOT FOR MERGE**. An
  open owner decision (3 vs 5).
- `feat/ceremony-hold-target-1` — a stale side-merge of master. Carries **nothing** the chain lacks;
  its report is already in this ship.
- `feat/ceremony-hold-centre-1` — unique content is **one report file** plus its index line, a
  diagnostic whose own addendum withdraws its section 2.
- `feat/corridor-overlay-1` — a real unshipped dev feature (`corridorOverlay.js`, a defaults key, a
  DevScreen section) plus three reports and two PNGs. **Not eye-tested, not named — must not ride
  along.**
- `feat/verify-routing-1` — substantial separate work: new `scripts/lib/routing.mjs` + test and a
  divergent rewrite of `verify.mjs` (+77 / −218 against this line's version).

The last three share a merge-base at `1fd0b471` — they are a **second open strand**, not stragglers
of this one. Two consequences worth naming: nothing is silently left behind, and **whoever lands
`feat/verify-routing-1` will meet a real conflict in `verify.mjs`**, because both strands rewrote it.

## The conflict marker

Exactly **one** remains in the tracked repo: `||||||| parent of 9a0673ad` at the QUICKTEST-NAMES-1
entry of `reports/night/INDEX.md`. Verified present and identical on both master and the chain head
before merging, so the merge neither added nor removed one. It is master's own and it stays, as
instructed. (It is a diff3 *base* marker, which a `<<<<<<<`/`=======`/`>>>>>>>` search does not
find — worth knowing for the next person who checks.)
