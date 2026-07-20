# LBB-FIX — Concept Review (read-only, no code, no commits)

*Reviewing a FIX DESIGN, not writing one. Two independent passes: CC's assessment, then Copilot's critique
attacking the premise. Every claim below was verified at source on branch `diag/look-before-brake`
(`raceBehavior.js`, `storage/defaults.js`) before use. WAS-level only — behaviour, constraints,
verification, acceptance; no implementation.*

---

## 0. Source verification (done first — this brief has been wrong twice before)

| Claim in the brief | Source | Verdict |
|---|---|---|
| Gate suppresses brake only if (a)`dT>dTStart` (b)`slowerLeaderOk∥heroPass` (c)`dir!==0` (d)`vLatToward=physicalYVelocity*dir>=0` | raceBehavior.js:540–583 | **TRUE** — evaluation order exactly as stated. |
| `lateralDamping = 0.16` (16% of velocity survives) | defaults.js:425 | **TRUE** (fallback 0.35 at raceBehavior.js:804 is not used — config supplies 0.16). |
| `physicalYVelocity` read by (d) is last frame's post-damping value | raceBehavior.js:551 reads it in the PAIR loop; it is written at line 860 in the LATER apply-deltas loop → holds the prior frame's value | **TRUE**. |
| Velocity is "essentially last frame's net force, not momentum" | `v = (v+delta)*0.16` → steady-state `v ≈ 0.19·delta`; prior momentum decays to 16%/frame | **TRUE** — sign of `v` ≈ sign of last frame's net lateral force. |
| The pass force that would move the trailer to the free side is applied only AFTER the gate passes | Pass spring (`passStrength 0.5`, aims at verified-free side) applied at raceBehavior.js:830–841 in apply-deltas, **only when `_passCandidate` is set** — and `_passCandidate` is set (line ~543) only when all four incl. (d) passed | **TRUE** — the bootstrap dependency is real. |
| Non-penetration is STRUCTURAL (four couplings), hard-sep is last-resort | raceBehavior.js:469–489 | **TRUE**. |
| The velocity condition is "(c) — the comment's label for achieved lateral progress" | Comment (469–489) labels couplings **in a different order than the gate**: comment-(a)=free-side, comment-(b)=room, **comment-(c)=achieved lateral progress (the velocity condition)**, comment-(d)=slower-leader | **TRUE, but a LABELLING TRAP** — see box below. |
| `passLeaderIndex`/`passDir` latch exists and holds `dir` across frames | Written at 831–832 (only when `_passCandidate`), read by `chooseFreeLaneDir` at 306–308 | **TRUE** — but written only AFTER a pass commits (see Q2). |
| brakeThenDodge 27–47/race, median 35–50 braked frames, window pre-existed in 81–87%, pre-dodge split drift 48–80% / slower 20–52% | lbb-diag-4 (counts 1791/1335/2369/1415 over 50 races; noWindowBeforeDodge 12.7–18.8%; preDodge drift 47.8–79.8% / slower 20.2–52.2%) | **TRUE**. |
| `blockedNoFreeSide 0%` in the pre-dodge split is a tautology | `brakeThenDodgeOfEncounter` discards any encounter with a traffic-blocked pre-dodge frame | **TRUE** — not a finding. |
| everFaster breakdown (noWindowEver 27–37%, blockedNoFreeSide 27–42%, drift 10–22%, dodged 7–17%, slower@1stWin 4–5%); neverFaster 53–63% | lbb-diag-4 section B2 | **TRUE**. |
| CPU-bound (`applyRacerBehavior` 32%, `isSideFree` 26%); `--jobs=8` ~5.4× | Part B cpu-prof + Part C timings | **TRUE**. |

> **⚠ LABELLING TRAP (must be stated up front).** The measurement runs and this brief use the GATE
> EVALUATION ORDER: (a)=room, (b)=slower, (c)=free-side, (d)=velocity/drift. The source COMMENT
> (raceBehavior.js:469–489) uses a DIFFERENT order: comment-(a)=free-side, comment-(b)=room,
> comment-(c)=velocity/drift, comment-(d)=slower. So **"condition (d)" in this review = "coupling (c)" in
> the code comment** = the achieved-lateral-progress / velocity check. Anyone reading the file must map the
> two or they will patch the wrong line. Renaming the comment to match the measured order is a hygiene item
> (reported, not folded in).

**Net of verification:** every load-bearing claim holds. The hypothesis is *source-correct*. The remaining
job is not to confirm it (it verifies) but to (1) bound how much of the complaint it actually explains, and
(2) decide whether the fix earns its cost.

---

## 1. CC's assessment

### Q1 — Is the chicken-and-egg reading of (d) correct? What else could explain drift dominating?

**Correct, and mechanistically forced — but only a PARTIAL explanation.** On the first frame a trailer
wants to pass, the pass spring has not been applied (it is gated behind the very condition it would
satisfy), so (d) reads a velocity that is ≈ `0.16 ×` last frame's *ambient* lateral force — soft-steering +
hard-separation from OTHER racers, plus the §4a non-overlap target. (d) therefore asks: "did ambient forces
happen to nudge you toward the free side last frame?" If yes → dodge; if no → brake and wait until they do
(or until the geometry shifts). That is exactly "brake, then do what it could have done."

**Attacking it, as instructed — three honest qualifications:**

1. **(d) is at most the DRIFT half.** In the pre-dodge window frames, `blockedDrift` is 48–80% but
   `blockedSlower` is 20–52% — and `blockedSlower` is condition **(b)** failing (leader not meaningfully
   faster THAT frame), not (d). A (d)-only fix leaves a fifth to a half of the with-room brakes in place.
   The `blockedSlower` half is a different phenomenon: a momentary dip of the speed differential below
   `lookBeforeBrakeMinDifferential` (0.005). It self-resolves and is arguably the gate *correctly* declining
   a non-overtake for that frame; it may want speed hysteresis, or may be acceptable — but it is **not** the
   (d) bug and must not be smuggled into the same fix.

2. **Some drift may be a LEGITIMATE hold, not a bootstrap failure.** `blockedDrift` fires whenever the
   trailer's residual velocity points toward the leader. That can happen because a third racer is shoving it
   that way *without* closing the free lane enough to trip `isSideFree` (a sub-threshold lateral push). In
   that case braking is correct and the later pass happens because the shove cleared — **correct behaviour,
   not a bug.** The measurement cannot currently separate "no pass force applied yet" from "actively shoved
   toward the leader." The circumstantial evidence favours the bootstrap reading (the same leader is passed
   within ~35–50 frames with the room still present, so the drift was transient), but an unknown residual is
   genuine holds a fix would wrongly convert into squeezes. **This is the single biggest gap in the premise
   and should be closed by measurement before any edit (see Converged rec).**

3. The `blockedNoFreeSide 0%` in the split is tautological (verified) — it proves nothing about traffic and
   must not be cited as "traffic is never the cause."

### Q2 — Smallest change; does an existing mechanism already solve it?

**No existing mechanism solves the bootstrap.** The `passLeaderIndex`/`passDir` latch gives frame-to-frame
COMMITMENT — but only to the *free-side choice* (comment-(a)/gate-(c)), and it is written **only after a
pass has already committed once** (apply-deltas, when `_passCandidate` exists). It cannot carry the FIRST
commit past (d). `smoothLaneTarget` eases the target's motion, not the gate. So (d)'s bootstrap is
unsolved today.

WAS-level options, smallest first, each judged against the binding constraint *non-penetration must stay
structural, not delegated to the hard-separation backstop*:

- **(ii) Judge (d) on the PREDICTED post-pass-force velocity** rather than the pre-intent one. The pass
  spring always aims at the *verified-free* side, so the predicted velocity points the right way unless a
  strong opposing ambient force dominates — in which case (d) still (correctly) fails, and the "not being
  shoved into the leader faster than the pass force can correct" safety meaning is *preserved*. This
  dissolves the chicken-and-egg at the root while keeping (a)(b)(c) untouched. **Cost/risk:** the pair-loop
  gate must know the force the apply-deltas loop will apply — a coupling of two loops the project has a
  documented history of letting DRIFT (sim-parity culture). Admissible ONLY if both sides read one shared
  quantity, never a hand-copied second formula.

- **(i) Short, lag-bounded commit grace.** Once (a)(b)(c) hold, permit suppression for N frames,
  **re-checking (a) and (c) every frame**, deferring (d) so the pass spring has N frames to reverse the
  velocity. Non-penetration holds *iff* N stays within the lag-safe budget already encoded in `dTStart`
  (`lookBeforeBrakeLagFrames = 2`): a closing gap trips (a), a third racer trips (c), either re-engages the
  brake instantly. **Cost/risk:** adds per-pair frame-count state; an off-by-one in N vs the lag budget is a
  penetration. More moving parts than (ii), but no cross-loop force model.

- **(iii) Latch (d) to the existing latch** — extend `passLeaderIndex`/`passDir` to also suppress (d) once
  (a)(b)(c) have held. Because the latch is written only after a full commit, this still needs a bootstrap
  and collapses into (i). Not independently smaller.

- **(iv) Do nothing** — legitimate; see Q4.

**CC recommendation:** the smallest change that removes the bootstrap *by construction* is **(ii)**, but
only if the pass-force magnitude is derived from a single shared source. If that cross-loop coupling cannot
be made single-source cleanly, fall back to **(i)** with N hard-bounded to the lag budget. Explicitly reject
deleting or globally relaxing (d) — it is one of the four non-penetration couplings.

### Q3 — Is `noWindowEver` in scope?

**No — separate, later step. Do not merge.** `noWindowEver` (27–37% of everFaster) is pairs entering the
same-lane brake zone too LATE for any window to exist — a function of when same-lane detection fires and the
`dTStart` timing, an *earlier-detection / zone-geometry* problem, mechanically disjoint from (d). It is a
BIGGER and cleaner addressable bucket than brakeThenDodge, but a different edit with different risk. Merging
them would compound two fairness re-gates into one un-bisectable change. Recommend (d) first (gated), then
`noWindowEver` as its own step.

### Q4 — Cost to verify; is it worth it?

Any `raceBehavior.js` edit moves the fingerprint `fa4e3796e1e5f1a5` and mandates the full re-gate: pooled
band-reach ≥70%, 0 Holm-unfair start rows across all standard combos, plus honest-overlap / zigzag checks,
plus an Owner eye-test. That is the project's most expensive verification, and (d) is a *non-penetration
coupling*, so the blast radius is the whole pack, not just the 27–47 encounters/race being fixed.

**Worth it?** The population is small but MAXIMALLY salient — it is the exact shot the Owner flagged, and
"brake then do what it could have done" reads as broken AI. The candidate fix is small and targeted. So it
is **worth attempting under the full gate, with a hard rollback**. A **DON'T-FIX verdict is legitimate** and
must be taken if no minimal change can hold non-penetration without perturbing the pack enough to fail the
re-gate — a real risk, since loosening (d) can only *increase* weaving.

### Q5 — Acceptance criteria (defined BEFORE any build)

**Success — ALL of:**
- brakeThenDodge count drops **≥50%** on the same 4-track `--jobs=8` sweep (seed=1, 50 races), AND the
  everFaster **`dodged` rate rises** by a comparable amount — i.e. braked encounters convert to DODGES, not
  merely shift into `noWindowEver` / a new `blockedNoFreeSide`.
- Median wasted braked-frames-before-dodge drops **≥30%**.
- **No increase** in hard overlaps (`honestOverlapRate`, `passThroughCount`) on any standard combo.
- **No increase** in zigzag score.
- Fairness re-gate passes: pooled band-reach ≥70%, 0 Holm-unfair start rows.
- Owner eye-test: brake-then-dodge no longer visible on his target races; no new weaving artefact.

**Failure — ANY of:** a hard overlap/penetration appears; zigzag rises; any fairness regression; or
brakeThenDodge merely *relabels* into another bucket instead of becoming dodges.

### CC verdict

**BUILD-BUT-MINIMAL-AND-GATED**, with DON'T-FIX as the honest fallback. The (d) chicken-and-egg is
source-verified; the smallest structural fix is predicting (d) against the pass force (single-source) or a
lag-bounded commit grace, re-checking (a)+(c) each frame. Scope `noWindowEver` and the `blockedSlower` half
OUT. But CC concedes the premise has one unmeasured hole (Q1.2) that should be closed first.

---

## 2. Copilot's independent critique (attack the premise)

**1. The population is tiny relative to the cost.** brakeThenDodge is 27–47 encounters/race against
~1,600–2,800 encounters/race (lbb-diag-4) — roughly **1–2% of encounters**. Spending a fingerprint move, a
full fairness re-gate, overlap/zigzag checks and an eye-test to fix 1–2% — with the SAME edit risking the
other 98% — is a poor trade. Salience is not prevalence.

**2. The hypothesis half-covers even its own target.** `blockedSlower` is 20–52% of the pre-dodge window
frames and is untouched by any (d) fix. A "perfect" (d) fix still leaves a fifth-to-a-half of the with-room
brakes — and a partial fix to a *salient* artefact usually still fails the eye-test, because the Owner sees
the residual. So the fix may cost the full re-gate and still not satisfy the complaint.

**3. Touching (d) is the highest-risk edit in the file.** It is one of four couplings the source says
*guarantee* non-penetration by construction, with hard-separation explicitly a last resort. Any relaxation
shifts load onto the backstop — the design's stated failure mode. Option (ii) duplicates the apply-deltas
force model into the pair loop; the project has *paid before* for hand-mirrored logic drifting. Option (i)
adds per-pair state whose safety hinges on N never exceeding the lag budget — one off-by-one is a real
overlap.

**4. The measurement cannot prove the drift is spurious.** An unknown share of `blockedDrift` may be the
pack legitimately shoving the trailer toward the leader (sub-threshold lateral push that `isSideFree` does
not catch); there braking is CORRECT and the later pass is the shove clearing. The brakeThenDodge
"no traffic in between" is tautological for `blockedNoFreeSide` and does not exclude sub-threshold shoves.
Fixing (d) would convert those legitimate holds into squeezes — a regression the current data cannot rule
out.

**5. Opportunity cost.** `noWindowEver` (27–37% of everFaster) is a larger, cleaner bucket. If a re-gate is
to be spent, the bigger problem has the better ratio. Fixing the rare-but-salient one first inverts the
priority.

**6. "Looks unnatural" is a soft target.** The rule "the camera is never a solution for race dynamics"
cuts both ways: neither is over-fitting core physics to one eye-test shot. A 1–2% behavioural population may
be acceptable texture, not a defect.

### Copilot verdict

**DON'T-FIX-YET / MEASURE-FIRST.** Do not touch (d) on a 1–2% population and a half-covering, partly
unproven hypothesis. First run ONE more cheap, read-only diagnostic that separates `blockedDrift` into
"an opposing lateral force toward the leader was present last frame" vs "no such force (pure bootstrap)".
That single number decides whether the chicken-and-egg or the legitimate-hold reading dominates — and it
costs no fingerprint move. Only if the drift is overwhelmingly no-opposing-force does a (d) fix earn its
re-gate; even then, take the lowest-coupling option and keep DON'T-FIX ready.

---

## 3. Converged recommendation

**Both passes agree the (d)/comment-(c) chicken-and-egg is real at source.** They disagree on whether to
build now: CC → BUILD-MINIMAL-GATED; Copilot → MEASURE-FIRST / DON'T-FIX-YET. The disagreement reduces to a
single unmeasured fact — **how much of `blockedDrift` is bootstrap deadlock vs legitimate shove** — which
neither can settle from the existing runs.

**Converged path (respects verify-at-source, attack-the-premise, WAS-not-WIE, DON'T-FIX-legitimate):**

1. **One more read-only measurement BEFORE any `raceBehavior.js` edit** (no behaviour change, no fingerprint
   move — same class as lbb-diag-1..4): within brakeThenDodge pre-dodge `blockedDrift` frames, split by
   whether a net ambient lateral force toward the leader's side was present that frame. Report the share.
   - Overwhelmingly "no opposing force" ⇒ chicken-and-egg dominates ⇒ proceed to step 2.
   - Large "opposing force present" share ⇒ many are legitimate holds ⇒ **DON'T-FIX (d)**; revisit.
2. **If step 1 clears it:** implement the SMALLEST structural fix — predict (d) against the pass force
   (single-source) or a lag-bounded commit grace — behind the FULL acceptance gate in Q5. Hard rollback on
   any failure criterion.
3. **Keep OUT of this scope:** `noWindowEver` (own later step); the `blockedSlower`/(b) half (own question);
   the comment-vs-gate label rename (hygiene, reported).

**If the Owner does not want to spend even the step-1 measurement, DON'T-FIX is the honest resting state** —
the reactive brake is functional, the artefact is rare (1–2%), and the reactive detector plus `--jobs`
tooling already exist. The complaint is real and salient; the fix is small; but it sits on a non-penetration
coupling, so it must be earned by measurement and held to the gate, not shipped on a plausible story.

---

## 4. Hygiene items found (reported, NOT folded in)

- **Comment/measurement label mismatch** in raceBehavior.js:469–489 — the four couplings are labelled in a
  different order than the gate evaluates them (comment-(c) = gate-(d) = the velocity condition). A future
  edit should align the comment to the evaluated order to prevent patching the wrong line.
- The `lateralDamping` fallback `0.35` (raceBehavior.js:804) is dead relative to the shipped `0.16`; not
  wrong, but a reader may mistake the fallback for the live value.
