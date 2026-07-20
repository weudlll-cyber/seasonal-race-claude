# LBB-OSCILLATOR — review of Plan-Claude's fifth theory (read-only; two independent critiques)

*Mandate: try to KILL the concept. Four prior theories died to the frames; a fifth death is acceptable, a
false confirmation is not. No convergence between the two sections. Nothing in `results/LBB-CONCEPT.md` is
authoritative (it once carried a section falsely attributed to Copilot).*

> This file previously held a stub review. It is replaced because that stub was **factually wrong**: it
> claimed "every racer inside racer 22's right-side window at the flip was already inside at leg start" and
> listed only 9 racers. The dump actually has **11** lateral occupants at the flip, and **two (racers 14 and
> 8) were NOT inside at leg start**. The stub also omitted the decisive limitation below.

## Shared source/data checks (each critique uses these; neither is bound by the other's reading)

- **Fact 1 — VERIFIED.** `isSideFree` (raceBehavior.js) computes `targetY = racer.physicalY + dir *
  lateralHalfSpan` and rejects a side when `|other.physicalY − targetY| < lateralHalfSpan` for any `other`
  with `shortestArcDeltaT(racer.t, other.t) ≤ tHalfSpan`. The reject band on the +side is
  `(racer.physicalY, racer.physicalY + 2·lateralHalfSpan)` — **racer-anchored and it translates with the
  racer.** The pass TARGET is `leader.physicalY + dir·offsetY` (**leader-anchored**). Different anchors:
  confirmed. In the pass path `lateralHalfSpan = lbHalfSpan = pxToPhysicalY(brakeContactWidth, trackWidth) =
  brakeSameLaneY` (≈0.095 for boarder).
- **Fact 2 — VERIFIED earlier (not re-run):** removing (d) left `honestOverlapRate` flat; (a)'s lag margin
  is the guarantee (`5cdaedb` NO-GO test). (d) is not safety.
- **Fact 3 — VERIFIED (LBB-BLOCKDIST):** in blocks ≥20 frames the blocking `|vLatToward|` medians 2.5e-4…
  7.9e-4 and is flat (frame-to-frame change 0.012–0.015 of median) — a force re-applied every frame.
- **THE DECISIVE item-2 test is NOT fully answerable from existing dumps.** `isSideFree` filters candidate
  blockers by longitudinal `shortestArcDeltaT(racer.t, other.t)`, but `raw-nod.json` racerRows captured
  `physicalY` only — **no `t`**. So one can compute who is LATERALLY in the window, not who the actual
  longitudinal blocker is. Everything below about "which racer closed the side" is therefore **not fully
  checkable**; stated as such.
- **Lateral analysis at racer 22's flip (raw-nod.json; gate at frame F reads prior-frame y).** Racer 22
  moved **+0.0644** (y −0.0075 @2616 → 0.0569 @2638); its +window travelled (−0.0075, 0.1825) → (0.0569,
  0.2469). At the flip, **11 racers are laterally inside the 2639 window**; **9 were already laterally inside
  at 2617** (racers 29, 24, 7, 28, 33, 2, 20, 34, 32); **2 entered between 2617 and 2639** — racer 14
  (self-moved only +0.0033 → effectively swept in by racer 22's motion) and racer 8 (self-moved +0.0511 →
  moved itself in). **Key inference:** `dir` was +1 at 2617, so the +side was FREE then ⇒ none of the 9
  already-lateral racers were longitudinally close at 2617. The blockage at 2639 came from some racer
  becoming longitudinally close — **which one, the dumps cannot say (no `t`).**

---

## CRITIQUE A — CC

**Claim A (self-referential window).** Geometry real (Fact 1). But "confirmed at the crime scene" is
**false**: the brief's own decisive test — was the blocker outside at leg start and swept in by racer 22's
motion — needs the blocker's identity, and identity needs the longitudinal filter, and the dumps have no
`t`. The lateral picture is genuinely ambiguous: racer 14 IS a swept-in candidate (near-zero self-motion,
outside at 2617, inside at 2639 — exactly Claim A's pattern), but 9 racers were already laterally resident
and any one closing longitudinally would block the side with no self-reference at all. **So Claim A is
neither confirmed nor killed by the data — it is unproven, and its distinguishing prediction is precisely
the one these dumps cannot test.** Same failure mode as theories 1–4: a clean story the frames don't endorse.

**Claim B (coupled oscillator).** Needs cross-racer flip-timing (does A's flip precede and predict B's?) and
`t`. The dumps contain neither; the 0→4 weave is one racer. I did **not** check racer 22's other three
weaves individually (not checkable for blocker identity anyway). **Claim B is narrative, unsupported.**

**Claim C ((d) is the only damper, wired to the wrong event).** Split it:
- "*(d) is the only damper of a pass-path flip*" — **overstated.** In the pass path the side is chosen by
  `chooseGeometricDirection` (no deadband; the `softSteeringHysteresisY`/`pairTieDir` deadband is §4a-only)
  and the pass target is un-eased (`smoothLaneTarget(...,0)`). Of the stabilisers, `lateralDamping` 0.16 and
  the `vLatMax` cap SHAPE the flip's velocity (don't prevent it), the LATCH PREVENTS a flip while the side
  stays free (conditional), and (d) BLOCKS the flip-commit when momentum opposes. (d) is the only one that
  *blocks* a genuine side change — not the only damper. The 0→4 result shows only that (d) is the term whose
  removal unmasks the weave (nothing else changed between runs).
- "*one switch, two jobs*" — **supported.** (d) is a gate condition evaluated every brake-zone frame
  (verified), and Fact 3 + the 67–85% dir-never-changes population show it vetoes permission on non-flip
  frames. That half stands.

**What CC believes.** Verified core is narrow (item 5, checked in the frame dump): the side changed at the
flip while centreline/threshold/room/latch did not. *Why* — self-motion (Claim A) vs longitudinal traffic —
is **unknown and unknowable from these dumps.** CC does not adopt the oscillator; it is the fifth
unfalsified-but-unconfirmed theory. Honest status: **"we still don't know," and the concept named the
missing measurement (`t`) without taking it.**

**Corollary cost.** "Ask (d) only on a `dir` change" needs the previous `dir`; `passDir` is cleared to 0 on
every braking frame (apply-deltas else-branch). So the corollary cannot know "did dir just change" during the
brakes it wants to suppress — it **requires the leaky-latch repair as a prerequisite.** Not standalone.

**Hygiene (reported):** the racer-anchored-window / leader-anchored-target mismatch is the same zero-margin
family as theory 3. Any future trace on this line MUST capture `t` (and ideally the identity of the racer
that trips `isSideFree`), or it will keep producing untestable stories.

---

## CRITIQUE B — Copilot

I do not defer to Critique A; I attack differently. Claim A is not merely unproven — the lateral texture
disfavours it, and Claim C mislocates the damper.

**Claim A disfavoured by density.** Claim A's load-bearing sentence is "*no neighbour movement required*."
The dump shows a CROWDED window: **9 of 11** occupants were already laterally present at leg start while the
+side was still free. In a field that dense, the ordinary event — a resident racer's `t` drifting within
`tHalfSpan` — is the likelier way the side shut, and it needs no self-reference. Racer 14 is *consistent*
with the self-sweep story but not *diagnostic* of it: a longitudinal approach by any of the 9 pre-residents
is untestable (no `t`) and, on prior probability in a pack this tight, more likely. So Claim A's existence
claim has no case in the data that *requires* it, and the surrounding texture points to plain traffic. **Not
confirmed; disfavoured.**

**Claim B unfalsifiable.** "Every flip displaces someone ⇒ coupled oscillator" makes no prediction the dumps
can refute — no per-racer flip timeline, no `t`, no cross-correlation. The same dataset would arise from 40
racers independently threading dense traffic. **Indistinguishable from the null is not a finding.**

**Claim C wrong on mechanism.** The **latch is a second, purpose-built side stabiliser** —
`chooseFreeLaneDir` honours `passDir` while the side stays free — and it is **leaky** (cleared on any frame
the gate doesn't fire). A non-leaky latch would hold racer 22's committed side across a transient
re-evaluation and might prevent the weave WITHOUT (d) — so the 0→4 weave has (at least) two candidate
causes, and the concept asserts the wrong one ((d)-as-sole-damper) over the latch. **Caveat I hold against
my own point:** if the +side is *genuinely* blocked at the flip, a repaired latch MUST still yield (holding a
blocked side is a squeeze) — so neither (d) nor a fixed latch "solves" it without first knowing, via `t`,
whether the block is real. That cuts against my latch-repair as much as against Claim C.

**What Copilot believes.** Two mechanisms the "oscillator" prematurely fuses: (i) a measured long-brake
**permission veto** (Fact 3; 67–85% of btd; free side never changes) — real; and (ii) a **pass-path side
flip** whose *cause* (self-motion vs traffic vs latch-leak) is **undetermined** by these dumps. Claims A/B
assert one self-referential cause for (ii); the data neither shows coupling nor excludes traffic. **Copilot
does not adopt the concept.** Claim A unproven and disfavoured, Claim B unfalsifiable, Claim C mislocates the
damper (ignores the latch).

**Corollary cost.** Agreed it needs prior `dir`, cleared during braking → needs the latch repair first. And
a deeper trap: if a repaired latch is what prevents the transient flips, "ask (d) only on a flip" is
**redundant** with a working latch — the corollary may be solving a problem the latch already owns.

**Hygiene (reported):** the dumps lack `t`, so every free-side question in this investigation is half-
observable. Future traces on this line must capture `t` and the `isSideFree`-tripping racer's identity.

---

## Note on limits (applies to both, stated once)

The most consequential result here is negative: **the concept's own decisive test — which racer closed the
free side, and whether racer 22's own motion did it — cannot be settled from the existing dumps, because `t`
was never captured.** Both critiques reject adopting the oscillator model; they differ on whether the lateral
density actively disfavours Claim A (Copilot) or merely leaves it unproven (CC). Neither writes a fix. The
prior stub's clean "Claim A is dead, all occupants pre-present" reading is not supported — two racers did
enter, and the real blocker is unidentifiable without `t`.

## Window Recheck Addendum

The requested exact recheck still cannot be completed from [results/lbb-trace-2-2026-07-15/raw-nod.json](results/lbb-trace-2-2026-07-15/raw-nod.json) alone. The dump does not provide the per-racer `t` values needed for the full `shortestArcDeltaT(racer.t, other.t)` test against every candidate blocker, and it does not record a full pairwise lattice for racer 22 at the flip. That means the decisive `isSideFree` window cannot be recomputed exactly from the existing raw data.

The consequence is narrow and factual: the earlier lateral-only list is not an authoritative blocker list, and the second critique section did not independently re-derive an exact window from raw pairwise data. It reused the same non-exact neighborhood interpretation. The only stable conclusion from the existing dump is still the negative one already stated above: the real blocker, if any, is undecidable from this data alone.
