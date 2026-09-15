# MORNING SHEET — night of 2026-09-15

Branch `feat/gap-leader-brake`, pushed. **Nothing minted. No golden race re-recorded. The branch is
not merged.** Master was touched only by five read-only report merges, both pushes CI-green (Piece 5).

---

## ★★ FIRST LINE — A REAL DEFECT (b)

**V1, now in the shipped source on this branch, BREAKS BROWSER/SIM BYTE-PARITY on 2 of the 3 golden
seeds.** This is not the "pinned winner moved" of earlier nights — the two arms genuinely disagree:

| seed | real arm | sim arm | |
|---|---|---|---|
| 1 | `1ba41a20` | `836a46e0` | **DIFFER** |
| 7 | `a9c70e65` | `a9c70e65` | match |
| 42 | `5ba78503` | `f4cce0cb` | **DIFFER** |

First divergence at **physicsTs 55000, max &#124;Δt&#124; = 2.894 × 10⁻³** — small, late, growing: the
signature of amplified round-off, not a structural difference. **Two causes, and the instrument
cannot separate them, so I did not choose:** either the 0.001 epsilon was *quantizing away* a
sub-epsilon difference that already existed between the arms (making the defect older than V1, merely
exposed by it), or V1 introduces a new one. Both arms call the same `stepRacePhysics`, so there is no
un-mirrored mechanics change to point at.
→ [SERVO-NARROW-SHIP-1](../reports/night/SERVO-NARROW-SHIP-1.md)

**This is why V1 is not a merge candidate as it stands.**

---

## ★ WHAT YOU DECIDE

### 1. Does V1 go in at all?

| buys | costs |
|---|---|
| leader's servo arrival **55.8% → 79.7%** | **0 of 300** races byte-identical |
| small corrections **57.8% → 74.1%** | **190 of 300** change winner |
| wrong-side share **10.2% → 5.1%** | all four fingerprints move |
| median in-window lead **81.4 → 70.9 px** | one golden race moves (−0.256 s) |
| winning margin **46.6 → 39.3 px**, field 83 px tighter at the line | **worse than today on four tracks**, mountainstreet by +45.8 px |
| | **the parity break above** |

It **does not clear the bar** this chain set: its largest single-step multiplier move is **1.008×**
the shipped maximum. It is the closest of three arms by a wide margin (the other two were 7×).
**It has no key and cannot be switched off in the dev screen** — to compare, check out `363543e3`.

### 2. The gap brake: keep it, even with the servo repaired
**Yes — it still does work the servo does not.** Against V1 alone it takes another **−17.1 px**
(1000 ms window) or **−23.5 px** (200 ms) off the worst in-window race, **better on 39/48 races and
worse on 0** (t = −3.78 / −4.45). It fires in 105 of 300 races instead of 137 — less work, not no
work. → [PICK-WINNER-1](../reports/night/PICK-WINNER-1.md)

### 3. ★★ But V1 and the brake must not be switched on together
**7.6× and 7.1× the largest single-step multiplier move**, where V1 alone costs 1.008× and the brake
alone costs nothing. Mechanism: V1 makes the held value track the target exactly, so the brake's
engage/release moves the multiplier by its whole 10% ceiling **in one 16 ms step**. **V1 removes the
churn that was accidentally smoothing the brake's edges.** Safe apart, unsafe together — only a
combined arm could have shown it.

---

## THE BUILD FOR YOUR EYE

**4173 production · 5173 dev · 4000 API** (CORS confirmed for both client origins).

```
[ra-build] start-up: serving build 647142ee · feat/gap-leader-brake
/api/health  {"build":{"commit":"647142ee","branch":"feat/gap-leader-brake","dirty":false}}
```

Bundle read off the served page: **`dist/assets/index-DXtP-MIa.js`** (925.98 kB, gzip 276.51).
`dirty: false` — the tree is clean.

**Watch, in this order:**

1. **ice-track, Quick Test seed 3** — your race. In-window lead **196.6 → 113.6 px (−42%)**; the
   leader's servo arrival on it goes **22.2% → 82.0%**. ★ **The winner changes: Flare → Breeze.**
2. **luger-hill seed 24** — the largest improvement in 300 races: **244.4 → 54.9 px**.
3. **searound seed 26** — the largest regression, shown deliberately: **61.1 → 218.6 px**.

★★ **There is no byte-identical control race to offer — 0 of 300.** V1 touches the servo write for
every racer on every step: 12,000 racer-slots, all of them.

---

## WHAT EACH PIECE FOUND

| piece | result |
|---|---|
| 1–2 | Four arms, N=300 each, all inert when off (10/10, brake OFF and ON). **The brake still contributes**; **V1 + brake costs 7×**; **no arm clears the bar**, closest is ARM 1 (V1 alone). → [PICK-WINNER-1](../reports/night/PICK-WINNER-1.md) |
| 3 | V1 shipped on the branch. `engine-reach --check` selects `racePlanner.js` (1 of 1). All four fingerprints measured and moved, **nothing minted**. `verify` 19 PASS / 6 FAIL — five **(a)** moved inputs, one **(b)**: the parity break. New test, three sabotages, each caught by its own named test. → [SERVO-NARROW-SHIP-1](../reports/night/SERVO-NARROW-SHIP-1.md) |
| 4 | The build above. |
| 5 | **Five report-only branches merged to master, CI green on both pushes.** Two left standing on purpose (below). |

### Fairness — short, and labelled short
`scripts/sim-fairness.mjs`, unmodified, both arms: **searound, 20 races per racer type — short by
15× against the pinned 300 per track.** Seven racer types completed each side. **The instrument's own
verdict is the same on both arms: fair.** All 14 start-row χ² rows sit at p > 0.05; band reach stays
80–91% (today) and 84–90% (V1) against a 70% gate. p-values move up on four rows and down on three —
noise at N=20. **It does not say V1 helps or harms fairness, only that it does not break it on this
evidence.** Must not be quoted as the gate.

### Race shape — my construction, not a project instrument
Lead changes (19.43 → 19.46) and distinct leaders (15.92 → 15.83) are **unchanged**. What moves is
the finish: winning margin −16%, field 83 px tighter, races won clear **39 → 24 of 300**.
**More contested at the line, not more processional.**

---

## PIECE 5 — WHAT HAPPENED TO THE BRANCHES

**Nothing was contained in master** (checked with `git ls-remote`, not the local cache), so nothing
was deleted on containment grounds.

**Merged `--no-ff`, deleted at origin, then master pushed — CI green on both pushes**
(`0da85e4d` 2m12s ✓, `0e5e7d1e` 1m48s ✓):
`read/relational-history-1`, `read/shape-census-1`, `read/fallback-comebacker-1`, `read/bvgg8z-1`,
`fix/breakaway-recount-1`. Four needed an `INDEX.md` conflict resolved — in every case two
independent entries at one anchor; **both kept, neither edited**. The delete-before-push order is the
one `check-tags` Rule B needs.

**Left standing on purpose, with what each needs:**

| branch | why it was left |
|---|---|
| **feat/gap-leader-brake** | this branch — product code, your decision |
| **feat/remove-prestaging-comebacker** | product code, removes a mechanism — your decision |
| **report/brake-census-1** | report-only, but it adds `reports/night/BRAKE-CENSUS-1.md` with **no index line**, so merging it as-is reddens `check-index` on master. Needs one line in `reports/night/INDEX.md` — I did not author an index entry for someone else's report during a housekeeping merge. |
| **night/2026-09-14-history** | report-only, but **13 commits behind** and it carries its own `docs/MORNING.md`, which master also has. Resolving that means choosing between two status documents, which is not a mechanical merge. |

---

## DECISIONS I TOOK WITHOUT ASKING

- **The eye-test line was reverted.** The tree carried `gapBrakeEnabled: true` uncommitted so you
  could look at the brake. The winner is V1 with the brake at its **shipped OFF**, so serving the
  winner means serving it off. It also cleared three of six `verify` failures that were that line and
  not V1 (confirmed by stashing it: 48/48 passed). **Consequence: your outstanding eye-test on the
  gap brake is no longer on the served build.**
- **A short fairness run instead of none**, labelled short at every mention.
- **Two branches left unmerged** rather than knowingly reddening master or guessing at a status file.
- **The new test's clamp margin is a fifth of a rank**, because 1e-6 let through a racer pinned at
  0.8503 against a 0.85 floor and the fixture then passed under its own sabotage.

---

## CLEANUP

`C:/tmp/arms` carried **no junctions** this night — none were created, so the hazard did not arise;
`dir /AL /S` was still checked before removal. The worktree and the scratch output directories are
gone, `node_modules` is intact (client 328, server 186). **No test race or data record was created,
`server/data` is untouched, and your store was never opened.** The three services are left up.
