# Act 2 — finale-window front contest — CC design opinion

**Report-only. Author: CC. Master `fc6afbf`. No code changed, no sims run.** My independent read of how to
add late finale drama from front-compression (A) and leader-bleed (B), keeping the static rankError servo
fully intact everywhere (the Act 1 lesson). Written without reference to the Copilot file.

## The spine that decides all three answers: rank ≠ spacing

One structural fact governs everything below. The servo steers **rank/order** — `rankError = currentRank −
targetRank` ([racePlanner.js:700](../../client/src/modules/racePlanner.js)), clamped to `[0.85, 1.10]`
around natural speed. It decides *who is ahead of whom*. It does **not** set the physical **spacing** (the
gaps in racer-lengths) between adjacent racers — that spacing is a function of the natural-speed **spread**,
which lives in the re-roll draw (`spreadFactor`), not the controller. So "pull the front gaps tighter" is a
**speed-spread** problem, and the honest lever for it is the **scheduled re-roll draw**, i.e. the existing
gap-cap re-roll (`computeGapBiasedTarget` [:911](../../client/src/modules/racePlanner.js)) — *not* the
servo, and *not* a servo sub-target (that is exactly the Act 1 trap: touching the target deletes the
restoring force). This single observation makes (A) a small specialization of a shipped, proven mechanism
and makes (B) fall out of it rather than being a second mechanism.

---

## 1. Ingredient (A) — front compression

**Cleanest lever: a finale-window, front-band-scoped specialization of the gap-cap re-roll — not the
servo.** The gap-cap re-roll already *is* a symmetric compression: it tilts a racer that opened a hole
behind it toward SLOWER ([:954](../../client/src/modules/racePlanner.js)) and a dropped racer toward FASTER
([:979](../../client/src/modules/racePlanner.js)), always clamped inside the honest band
([:974](../../client/src/modules/racePlanner.js)). Scoped to the front band it *is* front compression:
the front leader that pulls away draws slower, the front trailer that drops draws faster, so the front gaps
shrink. Build it as an overlay on the existing transform:

- **Scope:** racers whose **static** target rank ≤ `BAND_EDGES[0]` (ranks 1–5). Static, not live — so the
  set of "front runners" is the plan-time favourites, deterministic and stable, not a live pool that can
  chatter.
- **Window:** `[contestWindowStart, roll deadline]` — `contestWindowStart` already exists (~0.8,
  [:347](../../client/src/modules/racePlanner.js)) and is the owner's finale boundary; the roll-deadline
  upper bound is already how the transform bounds itself.
- **Dose:** a **tighter** `G_c` and/or **higher** `strength_c` than the field-wide default, so the front
  compresses harder than the pack it sits in.

**Why it stays honest and doesn't leak into fairness.** (i) It clamps to `spreadMin/spreadMax`
([:974](../../client/src/modules/racePlanner.js)) → no acceleration above the honest band. (ii) It
compresses **within** the front band (ranks 1–5); any order change it causes is an *intra-band* pass — a
lead change, which is the drama we want — never a band-edge crossing, so band membership (what band-reach
measures) is untouched and the un-modified static `rankError` servo still holds every racer to its band.
**Compression ≠ reshuffle precisely because it never crosses `BAND_EDGES` and never touches the target.**
(iii) Scheduled-dice + deterministic + duration-scaled (the roll schedule already scales with duration;
the window is progress-based) → parity-safe and byte-identical when OFF (null threshold → early-return,
[:924](../../client/src/modules/racePlanner.js)).

**Cost / main risk.** Cost is minimal — one flag, a param overlay on one transform, one site. The real
limitation: **few or no scheduled rolls survive in the last ~10%** (the window ends a transition-settle
before the roll deadline), so the lever bites in roughly `[0.8, 0.9]`, not at the stride. That is
acceptable and on-rule: compression's job is to make the lead *contestable by ~0.9*, and the owner's
"physics stays live" rule then carries the finish. Do **not** try to micromanage `[0.9, 1.0]` with dice
there aren't any of.

**Recommendation (A):** compress the front with a **flag-gated, front-band-scoped, finale-windowed overlay
on the existing gap-cap re-roll** (tighter `G_c`/higher `strength_c`, static-front-band scope, window
`[contestWindowStart, roll deadline]`) — reuse the honest-dice machinery; reject any servo sub-target or
strictness lever (they change order, not spacing, and re-open the Act 1 trap).

---

## 2. Ingredient (B) — leader bleed

**Why the Leash failed, precisely.** The Leash braked the leader through the **servo**
([:793–833](../../client/src/modules/racePlanner.js)): continuously, on whoever is live rank-1, with
authority down to the `0.85` floor. That is enough to drop the leader *into* the pack — at which point a
fresh escapee is promoted from behind and runs away in turn. It reordered leadership without ever creating
a contest (Lesson 178; measured runaway 29–34.5% vs baseline). Any solo, servo-based, "brake whoever leads"
mechanism repeats this by construction.

**The one leader-slowing that has ever worked here is already shipped**, and it is *not* a servo brake: it
is the gap-cap re-roll **DOWN-tilt** ([:954](../../client/src/modules/racePlanner.js)). It differs from the
Leash on exactly the axes that mattered: it bleeds via the **re-roll draw** (a mild fraction of the honest
band per scheduled roll), not the servo target; it is **sparse and capped** (it cannot dump the leader into
the pack in one step); and it is **paired** with the catch-up UP-tilt, so a closing gap comes from *both*
ends converging, not from suppressing one racer. Suppression-alone reorders; convergence contests.

**So (B) is not a second mechanism.** A viable "leader bleed" is the DOWN-tilt half of (A)'s symmetric
front compression, and nothing more aggressive. If it is dialed at all beyond (A)'s symmetric dose, it must
stay: **dice not servo**; **gap-gated** (engage the extra bleed only when leader→P2 exceeds a *larger*
threshold than the catch-up, so it is a runaway backstop, not a permanent tax on leading); **capped** (a
small per-roll fraction, honest-band floor) so it can never relocate the leader into the pack; and
**window-scoped** to the finale. Those four constraints are the difference between it and the Leash.

**Recommendation (B):** **decline (B) as a standalone leader-brake** — a solo servo/suppression brake is
the Leash and is rejected. Admit leader-slowing **only** as the gap-gated, capped, dice-based DOWN-tilt
that is already the leader-facing half of (A); it escapes the Leash because it is mild, paired, and acts on
the draw, not the servo.

---

## 3. Combination + guardrails

**They are one mechanism, sequenced by gap magnitude — not two.** Build a single flag-gated finale front
overlay on the gap-cap re-roll: the **UP-tilt** (catch-up = A) fires when a front racer is dropped by more
than `G_c`; the **DOWN-tilt** (leader bleed = B) fires when the front leader has opened more than a
**larger** gate `G_b` (`G_b > G_c`), so (B) is a **backstop that only engages on a genuine runaway** while
(A) does the everyday tightening. One transform, one honest band, one deterministic schedule — (B) can
never run without (A)'s convergence also running, which is exactly what keeps it off the Leash path.

**First build (default OFF, fingerprints untouched):** `finaleFrontCompression` — a parameter overlay on
`computeGapBiasedTarget` gated on static front-band membership and `phaseProgress ≥ contestWindowStart`,
with `G_c` (catch-up gate), `G_b` (leader-bleed gate, `> G_c`), and `strength_c`. No new controller path,
no target change, no servo edit. OFF → the transform is byte-identical (ON `7c70b1eae7d31e22` / OFF
`f8f7d9c2fd3283e9` unmoved until an explicit owner ship).

**SCREEN metrics (paired vs shipped control, same seeds, luger-hill open + searound closed):**
- **PRIMARY — band-reach ≥ 70% pooled** (hard floor). Front compression must not push a front racer out of
  band 1–5 or pull a band-2 racer in; this is the leak to watch.
- **Guardrails:** dead finales ↓, front@line ↑ (tighter front group at the line), lead-changes ↑ (real
  contest), runaway ↓, escape median/p90 ↓.
- **Decision rule:** ship-candidate iff band-reach holds ≥70% on BOTH tracks AND at least one of {dead
  finales ↓, lead-changes ↑, runaway ↓} moves favourably on BOTH tracks with no guardrail materially worse.
  Sweep `strength_c` / `G_c` / `G_b` only after the shape clears the floor.

**Recommendation (combination):** build **(A) as the mechanism and (B) as its gap-gated DOWN-tilt backstop
inside the same finale overlay** — sequence by gap magnitude, not as independent knobs; gate the whole
thing behind one flag, default OFF, and let the SCREEN's band-reach floor be the veto.

---

## Closing line

**Build first: a flag-gated, default-OFF `finaleFrontCompression` overlay on the existing gap-cap re-roll —
front-band-scoped symmetric compression in `[contestWindowStart, roll deadline]`, with the leader-bleed (B)
as its gap-gated (`G_b > G_c`) DOWN-tilt backstop, never a servo brake. Abandon Act 2 if a paired SCREEN
shows pooled band-reach below 70% at every honest-band dose (compression is leaking fairness) OR no net
finale gain on both tracks (the front simply has too few scheduled rolls left in the window to bite) — in
which case the honest-dice lever has no teeth and there is no Leash-free alternative left to try.**
