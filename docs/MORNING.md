# MORNING SHEET — night of 2026-09-15 → 16

Branch `feat/gap-leader-brake`, pushed after every piece. **Nothing minted. Nothing merged. Nothing
tagged. No golden race re-recorded. Your store was never opened.**

---

## ★★ THE ONE THING THAT CHANGED EVERYTHING TONIGHT

**With the shipped defaults, this branch is back to the record — byte for byte.**

**All four roles — world, world-off, camera, render — measure exactly what
[docs/fingerprints.json](fingerprints.json) records.** (The values live only there; this sheet does
not copy them, and `check-fingerprints` enforces that.) Reproduce with the `reproduce` command each
role carries in that file.

All four had been moved by V1. **There is nothing to mint.** A yes in the morning is cheap.

**Why they moved back: V1 now has a switch, and it is OFF.** V1 went into this branch's source on
2026-09-14 with **no key at all** — it could not be turned off in the dev screen and could not be kept
apart from the gap brake, so "never switch the two on together" was unenforceable. I added
`servoNoiseBlindEnabled: false` rather than reverting it, because **reverting would have answered a
question you have left open** ("does V1 go in at all?"). The switch forecloses nothing.

---

## STATE OF THE NIGHT

| piece | state |
|---|---|
| 1 — blind sites | **DONE**, pushed. → [BLIND-SITE-1](../reports/night/BLIND-SITE-1.md) |
| 1b — V1's switch | **DONE**, pushed (not in the plan; see above) |
| 1c — V1's switch reaches the dev screen | **DONE**, pushed |
| 2 — the fairness run | **RUNNING** — both arms, pinned N (300 races/track pooled) |
| 3 — the rate window | **RUNNING** — 200 ms against 1000 ms, ten tracks, seeds 1–30 |
| 4 — merge readiness | fingerprints ✓, `engine-reach` ✓. `verify` pending |
| 5 — a build for your eye | open |
| 6 — branch tidy | **DONE** — see below |

---

## PIECE 6 — BRANCHES

**`report/brake-census-1` is merged and gone.** Its index line was the only thing missing, so I wrote
one and merged `--no-ff`; the branch was deleted at origin BEFORE master was pushed (the order
`check-tags` Rule B needs). **Master CI is GREEN for the merge SHA `12fae1f3`** — checked with
`gh run list --branch master`, 1m56s, not assumed from a local pass. `check-index`: 668 reports, 0
unindexed, 0 dangling.

**Nothing was deleted on containment grounds.** All three remaining branches were checked against
origin with `git ls-remote`, not the local cache, and none is contained in master — by commit or by
tree.

| branch | left standing because |
|---|---|
| **feat/gap-leader-brake** | this branch — product code, your decision |
| **feat/remove-prestaging-comebacker** | product code, removes a mechanism — your decision. 2 commits, touches `heroCurveGenerator.js` |
| **night/2026-09-14-history** | report-only in substance, but it rewrites **174 lines of `docs/MORNING.md`**. Merging it means choosing between two status documents, which is not a mechanical merge and is not mine to decide. It needs one sentence from you: keep the current sheet and take only `BREAKAWAY-HISTORY-1.md` + its index line, or take its sheet. Everything else about it is clean. |

**Nothing was tagged and nothing archived**, so no annotated tag was created and `TAGS.md` is
untouched.

---

## PIECE 1 — FIVE HARNESSES WERE RACING A WORLD NO PLAYER SEES

**Five blind sites found, five fixed, none left open.** Detail:
[BLIND-SITE-1](../reports/night/BLIND-SITE-1.md).

- The blindness was **entirely in the plan-config layer**. All 11 `createRaceFromIdentity` call sites
  already passed all 19 inputs; five plan-config builders did not. Without the gap brake's four keys
  the mechanism **cannot run at all** — it returns at its own guard before reading anything.
- ★★ **Both arms of the parity guard were blind**, not just the sim one. That is why the guard never
  reported it: the two agreed with each other and disagreed with the real browser core. This corrects
  what I told you in PARITY-CLOSE-1.
- ★★ **The two diagnostics under `scripts/diag/` were running a pre-COMBO15 world.** `chaosSteer` and
  `bandBias` ship ON; those files never passed them. Every finishing order
  `acceptance-orders.mjs` has printed is from a race no player runs — and its own header called them
  "canonical defaults". Neither file is in `verify` and neither has a pinned fixture, so nothing
  downstream is wrong; but do not compare an old printout against a new one.
- **★ THE PARITY BREAK IS CLOSED.** Brake on, all three arms now return the real browser core's
  hashes: `1ba41a20` (seed 1), `5ba78503` (seed 42). Before, the sim and browser-twin arms returned
  their **brake-OFF** hashes unchanged — switching the mechanism on changed nothing for them, because
  they did not have it. That is the defect in one sentence.
- **Proved inert before anything else:** 300/300 races byte-identical, 6/6 golden hashes, 4/4
  fingerprints.
- **Guarded:** `planConfigMirror.test.js` fails if any builder stops receiving what the browser passes.
  **7 sabotages across all 5 sites, 7 caught**, green either side of each.

---

## ★ WHAT YOU DECIDE

### 1. The gap brake, alone — this is what tonight is for
It is **OFF by default** and the branch is byte-identical to the record with it off. Switching it on
is a config change in the dev screen, not a code change. The fairness evidence (Piece 2) and the rate
window (Piece 3) land below as they finish.

### 2. Does V1 go in at all? — still yours, still open
Nothing tonight answers it. It now has a switch, so it can be judged on its own another day. What is
known: it buys the leader's servo arrival **55.8% → 79.7%** and costs **0 of 300** races
byte-identical, with **190 of 300** changing winner — a full re-baseline.

### 3. V1 and the brake must not be on together
Measured and explained: [BRAKE-JERK-1](../reports/night/BRAKE-JERK-1.md). The brake's window-end
release lands undamped in one 16 ms step (**0.089471** against a shipped maximum of **0.011762**),
because V1's restart gate tests a quantity that does not contain the brake. ★ But note that report's
own correction: **in world px/s the jerk is +16.35 px/s, which the shipped game already matches or
beats on one racer-step in 139** — the "7.6×" was a ratio of multiplier moves, not of anything a
viewer sees.

---

## DECISIONS I TOOK WITHOUT ASKING

- **A switch for V1 instead of a revert** (reason above): `servoNoiseBlindEnabled` in `defaults.js`,
  default `false`.
- **The two diagnostics were fixed rather than left blind**, even though that changes what
  `acceptance-orders.mjs` prints. Neither is in `verify`, neither has a pinned fixture, and
  `micro-divergence.mjs`'s documented "checkpoint diff of exactly zero" is unaffected because both its
  arms read the same builder.
- **The fairness run uses the shipped defaults, not `--config`** — your store was not opened. The
  instrument labels that world ASSUMED-DEFAULTS and so do I.

---

## CLEANUP

Worktrees created this chain: `C:/tmp/bs0`, `C:/tmp/bson`, `C:/tmp/bsoff`, `C:/tmp/fairon`. **None
carries junctions** — checked with `dir /AL /S`, and none has a `node_modules` of its own. `bson` and
`bsoff` carry an instrumented `racePlanner.js` (a call tally) and `fairon` carries the brake switched
on — **all three are probe copies; the real tree was never patched.** Removed in the end sweep.
