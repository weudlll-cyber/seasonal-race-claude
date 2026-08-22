# CHECK-COST-POLICY-1 — a check is run only if the change could have altered its answer

**2026-08-22 · branch `exp/check-cost-policy` off master `381105fb` · ROUTING AND DOCUMENTS. No
source file that any fingerprint can reach was touched, so no fingerprint can move — and none did.**

**SKIPPED THIS BLOCK, and what determined each answer** (R15e, which this block writes):

| skipped | what determined its answer |
| --- | --- |
| the 80-race sheet | R15a — no fingerprint moved; the twelve requirements are properties of a picture that is byte-identical |
| re-measurement on the merge commit | R15b — `git diff --quiet` shows the merge tree identical to the branch tip |
| the client suite | R15c — routed by declaration; no file under `client/` changed |
| the two camera fingerprints, check-runin-frame, world-fingerprint | routed by declaration; no file in their reach changed |

**RUN:** `npm run verify`, the browser gate (three times — clean and both sabotage arms), and the
routing audit below.

---

## 0 · THE PREMISE WAS WRONG, AND THE MEASUREMENT SAYS SO

The brief opens: *"`verify` already skips guards whose declared scope a change does not touch — eight
or nine on a typical run. **The FOUR heavy ones never skip.**"*

**They already skip, and often.** Routing the last ten merges' real file lists through the guards'
own declarations — `collect()` and each guard's `matches()`, so this measures the router that runs
rather than a model of it:

| merge | kind | files | heavy checks run | spent | skipped |
| --- | --- | --- | --- | --- | --- |
| `381105fb` | product source | 16 | 5/5 | 540 s | 0 s |
| `bb1e74df` | product source | 7 | 4/5 | 400 s | 140 s |
| `d4bad558` | product source | 37 | 5/5 | 540 s | 0 s |
| `182fa3ac` | no product source | 4 | 0/5 | 0 s | 540 s |
| `f0cb5179` | no product source | 3 | 0/5 | 0 s | 540 s |
| `3226ea36` | no product source | 3 | 0/5 | 0 s | 540 s |
| `d2906ee1` | no product source | 3 | 0/5 | 0 s | 540 s |
| `3b87ae99` | product source | 8 | 2/5 | 230 s | 310 s |
| `845b97d0` | no product source | 3 | 0/5 | 0 s | 540 s |
| `eaca23cf` | no product source | 3 | 0/5 | 0 s | 540 s |

**Spent 1710 s; already skipped 3690 s — 68% of the heavy cost, skipped by the declarations that
already exist.** Six of the ten merges ran none of the five. Per check: client-suite 4/10,
check-runin-frame 3/10, camera-fingerprint 3/10, render-fingerprint 4/10, world-fingerprint 2/10.

**So the hour he lost was not in `verify`'s routing.** It was in four things `verify` does not
control, and those are exactly what R15 now settles:

| where the time actually went, this session | cost |
| --- | --- |
| an 80-race sheet run confirming what four byte-identical fingerprints had already proved | **4473 s** |
| two further sheet runs destroyed by being started alongside other work | 988 s + 2396 s |
| re-measuring four fingerprints on a merge commit whose tree was identical to the branch tip, twice | ~2 × 240 s |
| re-measuring two MEASURED stamps mid-ship to correct a document, twice | ~2 × 780 s |

---

## 1 · THE FOUR RULES, NOW WRITTEN DOWN

`docs/VERIFY-RULES.md` **R15** and its five sub-rules, with the reasoning, so they are decided once
rather than argued per block:

- **R15a** — fingerprints unmoved ⇒ the 80-race sheet is not run. It runs only when a fingerprint
  MOVES or before a build the owner will judge, and then **alone and last**.
- **R15b** — an identical merge tree ⇒ no re-measurement on the merge commit. `git diff --quiet`
  answers it in seconds; identical means quote the branch's measurement and say the trees are
  identical.
- **R15c** — a documentation or report-only change pays neither the browser gate nor the client
  suite.
- **R15d** — re-measuring to correct a number in a document is its own block, never part of a ship in
  flight.
- **R15e** — every report names its skips and what determined each answer. **A silent skip is
  indistinguishable from a forgotten one.**

And the boundary, which is the part that matters most: **no check is weakened, narrowed in what it
asserts, or made unable to fail.** Every skip is proved in both directions or it is not taken.

---

## 2 · THE GATE IS TWO RACES — his decision, and it is proved both ways

`--gate` ran ten races at 671–885 s. It is now **space-sprint and city-circuit**, measured at
**200 s** clean.

**Why those two, from RETIRE-RUNIN-LEGACY-1's numbers:** they hold both extremes of every column the
sheet reports — space-sprint the worst single-frame step (0.0339 ln, twice the next) and the OPEN
regime; city-circuit the widest frame (10.9 corridors against 6.6) and the longest standstill
(1050 ms against 200), and the CLOSED regime, where the finish is most of a lap away at the threshold
so the shot opens to the world. The other eight sit strictly inside both on every column and produced
**zero** invariant events in both full 80-race sweeps on record.

**PROVED IN BOTH DIRECTIONS:**

| run | result |
| --- | --- |
| `--gate` | **rc=0**, 2 races in 199 s, PASS — every frame satisfied all five invariants |
| `--gate --sabotage-corner` | **rc=1**, 154 crossing violations |
| `--gate --sabotage-noline` | **rc=1**, 4 crossing violations |

**AND THE LIMIT OF THAT PROOF, because it is real.** The sabotage arms drive the CROSSING check only.
The five WINDOW invariants have no sabotage arm, and **in the gate's own scope they have never been
observed red** — every violation the sweeps found sits at seed 2, which the gate does not run. So the
window half is a regression net whose red has not been demonstrated at this scope. That is a known
gap, not a settled question, and it is now written into the ceremony beside the gate rather than left
to be discovered.

**WHAT THE TWO-RACE SCOPE NO LONGER COVERS**, written down rather than assumed away: the eight other
tracks' own geometry — searound's corners, luger-hill's gradient, dirt-oval's and river-run's shapes
— and any per-track drift that stays WITHIN the envelope these two define. A defect needing one of
those curves now reaches the **nightly sweep** rather than the pre-merge gate: a day later, not never.
garden-path leaves the gate having never been scorable at seed 9 anyway.

---

## 3 · ONE ROUTING IMPROVEMENT, MEASURED AND THEN NOT BUILT

`verify` applies `isInertChange` — *this edit differs only in comments and whitespace, so it cannot
move a hash* — to the **world** fingerprint alone. The argument is not specific to the world: the
fingerprint scripts import the source through plain ESM with no bundler, transform, lint or coverage
step, so it holds identically for CAMERA, RENDER and `check-runin-frame`. Extending it looks
obviously right.

**Measured across the same ten merges, it would have saved 0 seconds.** Ten selections examined;
every one was live code, not comments:

```
  381105fb  check-runin-frame      5 selecting file(s)  live change — must run
  381105fb  camera-fingerprint     3 selecting file(s)  live change — must run
  ... 8 more, all live
  would have been skipped by extending the filter: 0
  seconds saved across the last ten merges: 0
```

**So it is not built**, and §R15's own text records why, so the next reader does not re-derive it.
This is the brief's instruction followed literally: route it where a heavy check can honestly be
skipped, and where it cannot, say so in a sentence and leave it alone.

---

## 4 · WHAT WAS NOT TOUCHED

No check was weakened. `--gate`'s scope narrowed, and that narrowing is proved in both directions
above with its loss stated. Nothing else changed: no guard's assertions, no threshold, no
declaration, no default. **No source file inside any fingerprint's reach was touched**, which is why
this block asserts rather than measures that the picture is unmoved — and `verify`'s own routing
agrees, having skipped all four fingerprints for exactly that reason.
