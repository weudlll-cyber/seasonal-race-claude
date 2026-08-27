# GATE-CLIENT-BOUNDED-1 — the bound is in, the margin is 3.1 s, and the 29% cost did not appear

**Built and confirmed on the merged tree.** One line of configuration, in the file that already owns
how the client suite runs.

**No timeout raised, nothing marked slow, nothing skipped** — the standing rule from the server-suite
repair, and the brief's bound.

---

## WHERE IT LIVES, AND WHY NOT SOMEWHERE ELSE

`client/vitest.config.js` gains `maxWorkers: 4`. That file already decides how this suite runs — the
jsdom environment, `retry: 0`, the retry ledger, the e2e exclusion — so the bound joins the shape
rather than opening a second place where run shape is decided.

**The other half of the server remedy was already in place.** `scripts/verify.mjs` marks
`client-suite` as `exclusive: true`, so it does not run beside the fingerprint jobs. Nothing was
needed there, and nothing was changed there.

**No env override, on purpose.** `server/vitest.config.js` gives the reason for its own bound and it
applies unchanged here: a stray variable that silently re-loosens the gate is this very defect's
shape.

## THE MARGIN — GATE-SERIAL-BCRYPT-1's unit, on the merged tree

The 15 tests that pass beyond 5,000 ms carry their own extended timeouts and cannot speak to the
default's margin. They are excluded **by that property**, not by a hand-kept list of names.

| arm | runs | failures | p99 | worst | **margin** |
|---|---|---|---|---|---|
| unbounded | 3 | **14** | 1,918 ms | 10,457 ms | **−5,457 ms** |
| unbounded | 3 | **6** | 1,733 ms | 8,511 ms | **−3,511 ms** |
| bounded, branch | 3 | 0 | 744 ms | 4,402 ms | +598 ms |
| **bounded, MERGED TREE** | 3 | **0** | **524 ms** | **1,899 ms** | **+3,101 ms** |

**Twenty failures across six unbounded runs; zero across six bounded ones.** The merged-tree margin is
better than the server suite's own post-repair margin of +1,894 ms.

**Confirmed on the merged tree and not only on the branch**, as the brief required. That mattered:
the branch arm read +598 ms and the merged arm reads +3,101 ms. A single green branch run would have
understated the result by a factor of five — and had it gone the other way, it would have overstated
it just as far.

## THE COST — measured, and it is not the 29% that was projected

**Real wall clock on the merged tree: 296.2 s mean** (299.2 / 273.1 / 316.2), against **313.8 s** and
**312.2 s** for the two unbounded arms.

**Bounding is not slower. If anything it is slightly faster** — the same result the server repair got,
for the same reason: oversubscription was costing wall clock and margin at once.

**So where did 403 s come from?** That arm was measured while three other measurements were competing
for the machine — the night chain was running two corpora and a document piece beside it. **That is
precisely the confound this whole item is about**, and it inflated the projection the owner agreed to.
He accepted a 29% cost; **the honest number is that there is no measurable cost**, and he should know
the trade was better than the one he was offered.

The heavy tests tell the same story: the golden real-arm comparison ran **113,789 ms** unbounded and
**25,812 ms** on the merged bounded tree.

## WHAT IS NOW PROVEN, AND WHAT IS STILL A GUESS

The brief was explicit that the starvation mechanism stays labelled a hypothesis unless this piece
proved it. **Part of it is now measured and part of it is not**, and the two are separated here and
in the backlog entry.

**MEASURED:**

- **Concurrency causes the failures.** Worker count is the only variable between arms, and failures
  go 20-in-6 to 0-in-6.
- **The failing tests are starved, not slow.** The worst default-timeout test falls **10,457 ms →
  1,899 ms**, a factor of 5.5, with no test code changed.
- **The heavy tests are slowed too** — 113,789 → 25,812 ms — which is what separates oversubscription
  from a test that is simply long.
- **Memory is not the resource.** Free RAM held 7.4–7.9 GB of 33.8 across every arm and no processes
  accumulated between runs.

**STILL INFERRED:**

- **That the 15 extended-timeout tests are specifically the load.** Consistent with everything
  measured and contradicted by nothing — but the suite was never run *without* those files, so their
  role is correlation, not isolation.
- **That CPU is the exhausted resource.** Memory is ruled out and CPU is what remains and fits, but no
  counter was read to confirm it.
- **That 4 is the right number.** It is what was measured and what he agreed to. **The sweep was
  deliberately not run**: the brief's decision rule was that a bound found by search rather than
  measurement is the same class of thing as raising a timeout, and with the margin at 3.1 s there is
  no reason to look for a better one.

## CONFORMITY

- Built in the one home that owns the client suite's run shape; scheduling untouched.
- Margin reported in GATE-SERIAL-BCRYPT-1's unit, with the same exclusion rule.
- Confirmed on the merged tree, three runs, not on the branch alone.
- Real wall clock reported, and the projection it replaces is named.
- No timeout raised, nothing marked slow, nothing skipped, no env override.

## PROPOSALS

**P1 — leave the bound alone.** The margin is 3.1 s against a 5 s timeout and the wall clock did not
regress. There is nothing to buy by tuning, and the decision rule that produced 4 is worth more than
a better number would be.

**P2 (mine) — the projection that reached the owner was measured under load, and that is a process
fault worth naming.** The 403 s figure came from an arm running beside three other jobs. **A number
offered to him as the price of a decision should be measured on a quiet machine**, or carry the
conditions it was taken under. This one was neither, and it happened to be pessimistic; the same
mistake in the other direction would have had him accept a cost that then doubled.

**P3 (mine) — the one hypothesis left is cheap to close and nobody needs to close it.** Running the
suite once with the 15 extended-timeout files excluded would isolate their role and turn the last
inference into a measurement. **It is not proposed as work** — the item is built, the margin is
healthy, and knowing precisely which files carry the load changes nothing about what to do. It is
written down so that if the bound ever needs revisiting, the next reader knows which experiment was
skipped and why.
