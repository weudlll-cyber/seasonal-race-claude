# BRAKE-DEPTH-MERGE-1 — the naturalness-floor observer onto master

**Branch:** `feat/brake-depth-observer` off master. **NIGHT-2026-08-23, piece 9.**

`--brake-depth` was written by BRAKE-CURVE-1 and deliberately left on `diag/brake-curve-1`, because
that block's permission covered its report only. **It measures the naturalness floor, which is now the
binding constraint on the whole action dial** — so it belongs on master, like `--early-decided` before
it.

---

## 1. What moved

**One cherry-pick (`7e8b8dda`), 43 lines in `scripts/sim-fairness.mjs`, plus one documentation
section.** No behaviour changes and no default moves.

The observer, in one line: with `--brake-depth` (and `--action-metrics`, whose window and racer loop it
rides), each race gains a `brakeDepth` record carrying the **minimum realised speed factor**, the
**minimum `governorMult`**, and the **share of racer-frames at the brake's own lower bound**.

**Why it earns a place on master rather than staying on a diag branch:**

- **It is the only instrument on the slow side.** `amNatMax` is a maximum: the tree measured how fast a
  racer goes against the 1.20 ceiling and never how slow the brake makes one go.
- **Three blocks have now depended on it in two days** — BRAKE-CURVE-1 (the curve), WILD-STAGE-1 (the
  combined arm's floor breach), LADDER-VALIDATION-1 (ten tracks, 2000 races). **A branch nobody merges
  is a branch someone eventually re-derives.**
- **The constraint it measures is the one that binds.** ENVELOPE-ONE-SIDED-1 established that the
  envelope is enforced on the fast side and only described on the slow one; the slow side has no
  ceiling of its own in code. **This observer is how anyone would notice.**

---

## 2. Verification

**R15 — what was run, what was skipped, and what already determined the answer.**

| gate | ran? | why |
| --- | --- | --- |
| **world fingerprint** | **RAN — `dc4647be0f55ebdb`, unmoved** | `sim-fairness.mjs` is inside the engine's declared reach. **This is the gate this piece stands on**: the flag is off by default, so a flagless run must be byte-identical, and it is. |
| **`npm run verify`** (routed) | **RAN — PASS 12, FAIL 0, SKIP 12** | Its routing selected `script-suite` and `world-fingerprint` from the diff, which is correct: the change is one harness file and one document. |
| **client suite** | **RAN — 218 files, 4199 tests, all green** | **R15 would have skipped it**, and verify's routing did skip it: a change to `scripts/` cannot alter what a `client/src` test answers. **It was run anyway because the brief named it**, and because the machine was free once the sweep finished. **Stated as a deliberate over-run rather than presented as required.** |
| **browser gate** | **NOT RUN** | No camera, render or client file is touched; nothing it measures can have changed. |
| **fingerprint minting** | **NOTHING MINTED** | Nothing moved. |

**The inertness proof is the point of the piece, so it is stated precisely:** with no flag given, the
observer allocates nothing, records nothing and appends `brakeDepth: null`. The world fingerprint was
proved unmoved on the branch **before** the merge, and BRAKE-CURVE-1 proved it independently when the
code was written. **Two proofs, two days apart, same value.**

---

## 3. Source hygiene

- **Lines:** `scripts/sim-fairness.mjs` **+43 / −0** — the cherry-pick, unmodified. `docs/SIM.md`
  **+27 / −0**.
- **Nothing was rewritten in the cherry-pick.** The commit is `7e8b8dda` as authored, so
  `diag/brake-curve-1` and master now carry the same change with the same content.
- **Removed / extracted:** nothing.
- **Where it is documented:** `docs/SIM.md`, in the observer family, **directly after
  `--early-decided`** and before the Action-axis stub — the placement the brief asked for, and the
  same shape the neighbouring entries use (what it is, what it is for, how blocks read it, a link to
  the baselines).
- **The documentation carries two cautions that cost real time to learn**, rather than only describing
  the fields: that the bound is **not** the ±12% envelope but a floor that *expands with the brake*,
  and that `minSpeedFactor` is the **realised** factor while the fast-side clamp covers only
  `spreadFactor × governorMult` — **so a maximum slightly above the computed cap is expected and not a
  breach.** Both were established elsewhere; the doc points at where.
- **Noticed but left alone:** `diag/brake-curve-1` still exists and now duplicates a commit that is on
  master. **Left because deleting it would remove the branch a merged report names as the observer's
  origin**, and because tidying branches is not this piece's job.

---

## 4. Build-vs-spec conformity

1. **The brief said "Needs the client suite." R15 says otherwise, and I ran it anyway.** A change to
   `scripts/` cannot change what a `client/src` test answers, and verify's own routing skipped it.
   **Running it was cheap and removes the argument entirely** — but presenting it as *required* would
   have misdescribed the rule, so §2 records it as a deliberate over-run.
2. **Documented "in one paragraph", as asked — and it became four short ones.** The extra length is
   the two cautions above. **A one-paragraph entry that omitted them would have been the shorter and
   worse document**, since both are mistakes already made once in the record.
3. **No behaviour changed, so nothing was minted and no rebaseline was implied.**

---

## 5. Proposals

**P1 — `--brake-depth` SHOULD BE ON BY DEFAULT WHEREVER `--action-metrics` IS, AND THE COST IS THE
ARGUMENT AGAINST.** It is three numbers per race, computed inside a loop that already runs. **Every
block that has measured action in the last two days has wanted it**, and one of them (WILD-STAGE-1)
found a floor breach that no other instrument would have shown. **The counter-argument is real
though:** flag-gated observers are byte-identical when off, and that property is how this project
proves a harness change inert. **Making it unconditional trades a provable inertness for a
convenience**, which is why this is a proposal and not a change.

**P2 — THE OBSERVER MEASURES A PRODUCT THE CLAMP DOES NOT COVER, AND THE FIX IS ONE MORE FIELD.**
`minSpeedFactor` includes `areaBonusMult` and `trajectoryMult`; the fast-side ceiling clamps only
`spreadFactor × governorMult`. **Recording the clamped product alongside the realised one** would let a
reader see at a glance whether a number over the cap is the multipliers riding on top (expected) or the
clamp failing (not). **It is one line in a loop that already has both quantities in hand**, and it
would have saved WILD-STAGE-1 from reporting "0.018 of headroom left" about a figure that was actually
*above* the cap.

**P3 — THE SLOW SIDE STILL HAS NO GUARD, ONLY AN INSTRUMENT.** This piece merges the thing that can
*see* a floor breach; nothing *fails* on one. LADDER-VALIDATION-1 measured 2000 races without a single
dip, so the shipped game is clear — **but the combined top-stage arm breached it on both tracks it was
tried on.** A check that fails when a configuration drives the mean per-race minimum below the
documented floor would be the natural companion to this observer. **Not proposed as work**: whether the
code gains a floor at all is the owner's open question from ENVELOPE-ONE-SIDED-1, and building the
guard would pre-empt it.
