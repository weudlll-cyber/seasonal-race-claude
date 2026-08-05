# FINISH-COMPANY-1 — the company guarantee retires once the company is home

**Branch** `feat/finish-company-1` · his proposal (option A) built · **his eye pending**

---

## For him

After the winner crosses, the camera now comes to rest and **stays there**. The late drift you could
not explain is gone: once you and your `minRacersVisible` are across — the leader plus the three
racers the setting asks for — the "do not show emptiness" guarantee stops applying, because the
company it exists to guarantee is already home.

**What you give up, measured rather than promised:** the very last back-marker's arrival is framed
less generously. On City Circuit he sits 11% inside the frame instead of 23%; on Dirt Oval 11%
instead of 50%. **He is still on screen on both tracks** — nearer the edge, not cropped. That is the
whole trade: a still picture at the end, against a slightly tighter berth for the final straggler.

---

## §1 — why finished racers were excluded

Blamed to `cfd47cd5` (CAMERA-COMPANY-1), where the guarantee was introduced. **It is deliberate, not
an accident** — that block's report lists "finished racers are not company" as one of its fifteen
tested properties. What is *not* recorded anywhere is the reason.

**It is not a stale-position problem, and that was measured rather than read.** Finished racers keep
live positions: over 60 frames after crossing, the first six finishers advanced `t` by ~0.010–0.012
and moved 62–75 world px. They run out past the line and their coordinates stay trustworthy.

So the design question was open, and option B was technically viable. It was worth asking — and the
answer still killed B, for a different reason.

## §2 — both measured; B is refuted

His marked race (City Circuit, n=39, seed 5601, cam seed 882842572, his config), plus Dirt Oval:

| variant | widening frames | widest | last back-marker |
|---|---:|---:|---|
| baseline | 54 / 58 | 2.9752 / 2.9592 | on screen, inset 0.23 / 0.50 |
| **A — stop once leader+N home** | **0 / 0** | **4.5489 / 4.5489** (= the setting) | on screen, inset 0.11 / 0.11 |
| B — finished racers count | 55 / 59 | **2.8760 / 2.8443** | on screen, inset 0.21 / 0.54 |

**B does not resolve itself — it is slightly WORSE, on both tracks.** The reason is the fixed anchor:
FINISH_OVERVIEW centres `finishOverviewLookbackPx` **behind** the line, so finished racers run out
*away* from it exactly as stragglers fall *back* from it. Counting them adds more distant company
rather than satisfying the promise. The intuition that "once enough are home the ceiling stops
moving" assumes the anchor is where the racers are; it is deliberately not.

**A and B differ on every measured race**, so the "if they never differ, take the simpler" branch does
not apply. **Recommendation: A** — his proposal, his number, and the only one that works.

## What changed

One condition in `_setTargets`: the company ceiling is skipped when `_inFinishMode` **and**
`finishedCount >= 1 + minRacersVisible`. Scoped to the finish deliberately — during the race nothing
is finished, so the branch cannot fire and the guarantee elsewhere is untouched. `minRacersVisible`
itself is unchanged, and `companyGuarantee` is unchanged.

**Tests, both positions:** with enough finishers the ceiling stops moving; with too few it still
binds; the threshold follows *his* number (4 finishers is enough at 3, not at 5); and mid-race with
the same field the guarantee still binds, which is what proves the scoping.

## Fingerprints

| | before | after |
|---|---|---|
| camera | `6480c2e0b2f612b5` | **`00cafa2432add0f7`** — on purpose |
| render | `b6591e74102152bd` | **`1f83ecc1fcb6fa9a`** — on purpose |
| world | `dc4647be0f55ebdb` | **unmoved** — nothing in `engine-reach`'s closure was touched, which `npm run verify` stated as its reason for skipping it |

Suite **3645**.

## A defect found in my own tool, and fixed here

`npm run verify` **told this block the diff could not reach a `ctx.` call** and skipped the render
fingerprint — and the render fingerprint had moved. The `isRender` matcher, copied from the
ceremony's list, did not include `modules/camera/`. Of course a camera change moves the drawn frame:
the director decides the transform every frame. The matcher now includes camera, its routing test
covers it, and this is exactly the failure mode `verify` was built to make visible — it just made it
visible about itself.

## Noticed, not fixed

The ceremony's own "run the render fingerprint when…" list has the same omission, since that is where
the matcher came from. Worth a line when someone next edits it.
