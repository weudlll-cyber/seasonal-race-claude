# LBB-FLIPGATE — Copilot critique (read-only)

## Scope and checks performed

Checked at source in `raceBehavior.js`:
- gate ordering and predicates around `dT > dTStart`, `slowerLeaderOk || heroPass`, `dir !== 0`
- side choice via `chooseFreeLaneDir` / `isSideFree`
- latch usage and writes (`passLeaderIndex`, `passDir`)
- latch clear path when no pass candidate exists
- lateral integration (`physicalYVelocity`, `lateralDamping`, `maxLateralSpeedPerStep`)

Checked existing data only:
- `results/lbb-blockdist/BLOCKDIST-REPORT.md`
- `results/lbb-blockdist/lbb-*.json` aggregate fields
- `results/lbb-trace-3-2026-07-15/REPORT.md`
- `results/lbb-trace-3-2026-07-15/raw-withd.json` and `raw-nod.json` (read-only queries)

Not checked:
- any new run/sweep
- the untraced Owner-specific race instance

---

## 1. Verdict on the concept

Verdict: reject as proposed.

"Evaluate (d) only when side changes" is not a validated safety discriminator. It is a re-label of when to ask the same weak signal, not a correction of what is measured. The current signal is `vLatToward = physicalYVelocity * dir`, and that velocity is produced by the previous frame dynamics, before the current pass intent is accepted. This remains a chicken-and-egg gate even if sampled less often.

The concept also under-specifies transition damping. On real flip frames in existing trace data, (d) did not act as a one-frame pulse; it blocked multiple consecutive frames (example below), then released. A one-check-on-flip policy removes that behavior by design.

Specific transition evidence from existing trace (`raw-withd.json`, trailer 30 vs leader 33, flip at frame 310):
- frame 310: side flips to right, `dir=1`, `takeFreeLane=false`, `vLatToward=-6.92e-5`
- frames 311-312: still blocked with tiny negative `vLatToward`
- frame 313: `vLatToward` turns positive
- frame 314: pass allowed; `vLatToward` jumps to `1.48e-2`

So the observed damping was 4 blocked frames, not 1.

---

## 2. Circularity assessment

The circularity objection is valid.

Your target population was defined as blocks where side does not change. A rule that skips (d) when side does not change will remove that population by construction, not by proving correctness.

What existing data can and cannot decide:
- From `lbb-blockdist`: not decidable globally for change-vs-no-change, because this dataset is intentionally filtered to unchanged-side isolated blocks.
- From `raw-withd` (one trace only): out of 3030 (d)-blocked frames (`dir != 0` and `takeFreeLane=false`), only 29 followed an immediate side change; 3001 did not. That is 99.04% unchanged-side blocked frames. This confirms the construction effect in at least one real trace.

Question: "Are there long spurious brakes where dir changes, which this rule would not fix?"
- Not decidable from `lbb-blockdist` by design.
- In this one `raw-withd` trace, no block had repeated internal dir toggles; however, this does not generalize across tracks/races.

Question: "Are there blocks where dir changes once early and then holds?"
- Yes in this one trace. Among 47 long blocks (length >= 20), 8 started on a dir change and then continued with one side. A flip-only check would evaluate once, then skip the remaining long tail.

---

## 3. Transition case: is one (d) evaluation enough?

Not supported.

At frame-310 flip behavior, one evaluation is not what current dynamics did; the system required several frames before `vLatToward` crossed non-negative.

For the high-speed thought experiment (`|vLatToward|` near `vLatMax=2.8e-2`):
- source does not guarantee one-frame decay to safe sign
- with `lateralDamping=0.16`, velocity decays quickly only if no forcing term sustains it
- existing long-block stats already show sustained forcing in many cases (flat per-frame change ratios in blockdist report)

Data status:
- observed in one trace: minimum blocked `vLatToward` reached about `-5.83e-3` (not full cap)
- blockdist report shows long-block frames can reach max `2.8e-2` on multiple tracks, so cap-scale values are not impossible

Conclusion: one-shot checking is an assumption, not an established damping strategy.

---

## 4. Second-order risk (more dodges -> more closures -> more flips)

Risk is plausible and not bounded by this concept.

Existing evidence pointing to risk:
- WITH vs WITHOUT (d) in `lbb-trace-3` already showed more side-flip behavior when (d) is removed/relaxed in practice (racer-22 case in report).
- In one aggregate read of the same trace, pairwise dir-flip transitions increased from 47 (WITH) to 56 (WITHOUT).
- On the frame-310 example, once (d) released, lateral motion jumped from ~noise to ~`1.5e-2` instantly; broad reduction of (d) checks means more such transitions can enter the system.

What data does not prove yet:
- net total braking under this specific policy
- net visible weave under this specific policy

So second-order behavior is unresolved and could move either way.

---

## 5. Prerequisite: previous committed side memory

As stated, the concept is not buildable without latch behavior change.

Reason from source:
- `chooseFreeLaneDir` reads latch (`passLeaderIndex`, `passDir`)
- latch writes happen when pass candidate exists
- when no pass candidate exists, latch is cleared (`passLeaderIndex=-1`, `passDir=0`)

During exactly the blocked-brake frames where flip-aware logic would need previous committed side, this memory can be absent.

Therefore prerequisite is mandatory: persist pass-side intent across blocked intervals (at least per trailer-leader encounter) with explicit expiry rules.

Given that, latch repair alone is a better first step than flip-gating, because it addresses a concrete state-consistency defect without redefining gate semantics.

---

## 6. Better alternatives (required)

### Alternative A (best first step): latch persistence repair only

Keep `(d)` behavior unchanged for now, but retain pass-side memory through blocked frames for the same leader (bounded TTL and clear conditions).

Why better:
- fixes a verified state hole directly
- lower coupling risk than redefining `(d)` trigger semantics
- gives clean instrumentation for later policy tests

### Alternative B: replace `(d)` input with intent-aligned signal

If transition damping is needed, do not read stale pre-intent velocity. Read an intent-aligned quantity, e.g. projected post-intent lateral step direction toward selected side, then gate on that.

Why better:
- removes chicken-and-egg dependency
- tests what the racer is about to do, not what it drifted from last frame

### Alternative C: move damping out permission gate

Keep pass permission based on room/speed/free-side only; apply transition damping in lateral controller when side target flips (rate limit or transient clamp there).

Why better:
- separates safety permission from motion smoothing
- avoids using a noisy scalar as hard pass veto

### Alternative D: DON’T-FIX now (honest option)

Given unknown second-order effects and mandatory latch prerequisite, do not ship the flip-gated `(d)` concept as-is.

Why honest:
- current evidence does not validate correctness of the discriminator
- current policy can erase target population by construction without proving behavior quality

---

## 7. Acceptance criteria before any build

Required gates remain exactly as stated:
- visible-weave from `scripts/lbb-weave-report.mjs` must be no worse than WITH-(d)
- `brakeThenDodge` median braked frames must be near WITHOUT-(d) (~2), not 35-50
- full fairness re-gate after any `raceBehavior.js` change: band-reach >= 70%, 0 Holm-unfair

Additional precondition I recommend before spending re-gate budget:
- instrument and report, per blocked frame, the axis of denial and whether the decision used persisted latch state or fallback

Is the Owner complaint worth the re-gate?
- yes, but not with this concept in current form
- spend the budget on latch-first plus intent-aligned or controller-level damping design, not flip-only `(d)` gating

---

## Hygiene (separate)

- Distinguish clearly between "population removed" and "problem solved" in all reports.
- Keep unchanged-side filtered datasets labeled as such; never use them to claim side-change behavior.
- For future diagnostics, always log both denial cause and state provenance (latched side present or missing).