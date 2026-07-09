# CONCEPT — "The race is a CAST, not a controller"

An independent proposal for making the race genuinely exciting, from the party that ran the two
measurement nights. Optimised for the owner's eye. Respects every §6 constraint; avoids every §7 dead
end. Nothing structural is deleted; v4-OFF stays byte-identical.

---

## 0. PLAIN-LANGUAGE BLOCK (owner: check these in two minutes, no code)

**The one-sentence idea:** the steering machine we already have can *deliver* a deep comeback and a
front fight — we proved it — so the fix is **not a new machine, it is better CASTING**: put heroes far
back and at *different* depths, let them *charge in one clean visible surge* instead of grinding, steer
some *through 1st place* so the lead is actually fought, and add **one gentle "open the lane" nudge** so
a charge reads as a charge instead of a scramble.

**Why I believe it (each checkable in plain words):**

- **A1 — The engine already works. [verified, F2]** When we place a hero far back (~40% of the field
  behind) and let the *existing* servo climb it, it reaches the front **92–100% of the time on all 10
  tracks, and still finishes fair.** The engine is not the problem.
- **A2 — What kills the comeback is CHURN, not weakness. [verified, F1]** A hero passes ~8 cars but
  *nets* only ~5, because it keeps getting re-passed while stuck braking in traffic. The eye sees a
  yo-yo, not a charge.
- **A3 — One GENTLE brake on the 1–2 cars right in front of a charging hero cuts its stuck-in-traffic
  time in half. [verified, F3]** That turns a scrambly pass into a clean, readable one. A *strong* brake
  backfires (F4) — so it must stay gentle.
- **A4 — The front is a procession only because of a casting rule, not physics. [verified, §4a, F4]**
  Today no hero is ever sent to 1st place. When we let hero paths cross through 1st, lead changes happen
  — even a tiny nudge produces ~2 of them.
- **A5 — Heroes are miscast today. [verified, §4b/c/d]** They are all picked from the future top-5,
  they are already dragged to the front before the race even opens up, and a "safety clamp" shrinks
  their drama until it disappears.
- **A6 — Casting heroes deep + one clean surge + lane-clearing WILL read as a comeback. [inferred —
  the cheapest eye-test in Stage 1/2 settles it.]**
- **A7 — Keep the field spread at the shipped ±8%. [verified, F6]** It is the fairest setting and leaves
  real distance for movement to be visible.

**What stays sacred (unchanged):** no car ever drives through an occupied lane — if the lane is blocked
the hero brakes, full stop (§6.1). Every car still finishes in its drawn band (§6.2). Every nudge stays
inside the existing ±10%/−15% envelope (§6.3). The old system stays as the OFF-switch fallback (§6.4).

---

## 1. THE CORE IDEA (one paragraph)

Stop treating the race as a *control problem* ("steer everyone to their band") and treat it as a
**casting problem** ("assign a few racers a dramatic, readable JOURNEY, decoupled from their fixed
finish"). The existing servo + curve machinery is the actor's body; it already moves a hero wherever the
curve says (A1). So rebuild only the **director/caster** to author *three-act journeys* for a small cast:
**(Act 1 — ESTABLISH)** hold heroes at clearly-different depths so the audience registers "this one is
buried, this one is mid-pack, this one leads"; **(Act 2 — SURGE)** give the buried ones ONE concentrated,
monotone charge to the front, with a **gentle lane-clearing malus** on the cars directly ahead so the
charge is clean, not churn (A2, A3); **(Act 3 — FINISH)** let the front heroes' curves **cross through
1st place**, trade the lead with a gentle brake on whoever is momentarily ahead, and hold it all until
the **late release (~0.97)** where natural speed decides the winner at the line (A4). The finish order is
still the drawn one; the *journey* is the show, and no mid-race position reveals the ending.

---

## 2. LOAD-BEARING ASSUMPTIONS

See A1–A7 above (all plain-language). Formally, with status:

| # | Assumption | Status | Source |
|---|---|---|---|
| A1 | Servo alone climbs a deep-cast B1 hero to front 92–100%, band-fair, all 10 tracks | **verified** | F2, results/tier2b |
| A2 | Invisible comeback = churn: real overtakes ~8 ≫ net ~5; hero yo-yos in traffic | **verified** | F1 |
| A3 | Gentle malus on the 1–2 ahead halves the hero's traffic-braking (~0.5→0.28) → clean pass | **verified** | F3 |
| A4 | Front fight is achievable in the fair envelope; a gentle single lever gives ~2 lead changes; strong backfires | **verified** | F4 |
| A5 | Miscast: B1-only pool, areaBonus pre-pulls them front, no hero to rank 1, feasibility clamp collapses drama | **verified** | §4a–e |
| A6 | Deep cast + monotone surge + lane-clearing reads as a comeback to the eye | **inferred** | Stage 1/2 eye-test |
| A7 | Shipped ±8% density = fairest + enough spread for visible movement | **verified** | F6 |
| A8 | A lower-band hero can do a "false-hope" front-visit and return to band without breaking band-reach or feeling robbed | **needs measurement** | Stage 4 |

**One reframe of a §5 fact (not a disagreement, a caveat):** F3 is written as "the malus adds only ~+1
net place." That framing *undersells it*, because the places-metric literally cannot see the thing the
malus fixes. The malus's job is **readability** (A2/A3: cut the churn), not places. Judge it by
traffic-braking-frac and re-pass count, not by net places.

---

## 3. HOW COMEBACKS BECOME VISIBLE (answering the churn, F1)

The servo already gives +11–13 net (A1); the eye still sees nothing because those places arrive as
pass-and-get-re-passed churn (A2). Three casting rules convert churn → charge:

1. **Cast DEEP and hold it (Act 1).** The hero sits at ~40% back for the first ~20% of the race so the
   audience *registers* it as buried. You cannot see a comeback you never saw fall behind. (Today heroes
   never fall behind — A5.)
2. **ONE concentrated, MONOTONE surge (Act 2), not a race-long grind.** The curve climbs in a single
   ~0.45→0.80 window and never dips (monotone target → the servo never *commands* a yo-yo). A charge that
   happens in one sustained window reads as "coming through the field"; the same net gain spread across
   the whole race reads as noise.
3. **Clear the lane so the surge sticks (the malus).** During the surge only, gently brake the 1–2 cars
   directly ahead of the hero (inside [0.85,1.10]) **only when the hero is genuinely faster and wants
   that lane** — this halves its traffic-braking (A3), so it flows past instead of stop-starting, and is
   re-passed far less. Physics first: if there is still no free lane, the hero still brakes (§6.1) — a
   stalled surge is an accepted outcome, never a drive-through.

**New eye-defined metric — "visible comeback"** (replaces the one-place mislabel, §4c): a hero counts as
a visible comeback iff it (a) held ≥40%-back for ≥⅓ of the establish window, (b) reached ≤ rank 5 (or its
band's front), (c) during its surge had traffic-braking-frac ≤ 0.30 (clean), and (d) was re-passed ≤ 1×
after the surge peak. That is exactly "clearly behind → clean charge → holds."

---

## 4. HOW THE LEAD BECOMES CONTESTED (answering §4a + F4)

The front is a procession because of the `nextCluster` rank-2 floor (A4/§4a), not physics. Fix in the
caster, not a new force:

- Cast **2–3 B1 heroes with curves that CROSS through rank 1** in the finish window (Act 3). Their
  targets are *not* parallel at 2/3/4; they swap the front repeatedly. Fair by construction (all end B1;
  within-band order is free — §6.2).
- Stage the swaps with the **gentle leader-brake (≈ −6%, F4's winner)** applied to whichever hero is
  *momentarily* leading the front pair — this is the single gentle lever that produced ~2 lead changes.
  **Never strong, never brake+boost together** (F4: both flicker/backfire).
- **Hold the contest to the late release (~0.97)** and let natural speed pick the winner at the line
  (F5). The drawn winner is *one of* the front-fighters but is **never parked at P1**; if it is ahead it
  is braked back into the fight, so a viewer can never call the result early (§2).

---

## 5. DIFFERENT, UNPREDICTABLE POSITIONS + FIXING THE CLAMP (§2, §4d)

**Casting template (scaled by the Action slider), journeys DECOUPLED from endpoints.** A hero's drawn
final band is fixed and fair; which *journey* it gets is the caster's choice. Fill distinct slots:

- **Front-fader:** starts/led early, drifts back to its (lower) band at the end — kills "the early
  leader always wins."
- **Mid-holder:** sits mid-field the whole establish act — fills the dead middle (§4 last line).
- **Deep-charger(s):** the visible comeback(s) of §3.
- **Front-fighters:** the 2–3 that cross through rank 1 (§4).

Because the journey is decoupled from the ending, **mid-race position reveals nothing**: the deep-charger
might be the drawn winner *or* a B3 racer on a false-hope visit (A8); the early leader might fade to B2.
That *is* the unpredictability the owner wants.

**The feasibility clamp (§4d) must change from "shrink the drama" to "recast the drama":**

- Today `clampIntensityToBudget` reduces the *whole cast's* intensity until the winner's peak fits the
  density budget → on a spread field every journey collapses shallow. **Replace with a PER-HERO,
  density-aware feasibility check that preserves a minimum visible excursion or recasts:** if racer X
  can't feasibly charge from 45% back on *this* field, the caster either (a) picks a *different* racer
  whose position makes it feasible, or (b) assigns X a shallower *but still ≥ a visible-comeback
  threshold* journey — **never** a 1-place dip. If no deep-charge is feasible this race, cast **zero**
  deep-chargers rather than a fake one (honesty over a fake beat).
- Raise the budget itself: the current `speedBudgetFrac = 0.1` is the pure boost ceiling; A1 shows the
  servo reliably delivers ~40–45%-back → front, so the budget can be far more generous (bounded by F8:
  ≤ ~45% back on open tracks, deeper only on closed).
- **areaBonus interaction (A5):** the CHAOS areaBonus pre-pulls B1 racers front, which is *why* heroes
  never start deep. So **suppress the areaBonus for a designated deep-charger** during chaos (let it stay
  buried), then surge it. Everyone else keeps the areaBonus (it stays load-bearing for reachability).

---

## 6. THE ROLE OF THE MALUS, AND EXACTLY WHERE IT MAY ACT (F3, §6.3)

The malus is the **only new force**, and it is a **readability tool, not a places tool** (§2 reframe).
Two uses, both a single gentle lever inside `[0.85, 1.10]`:

1. **Surge lane-clearing (comeback):** while a designated hero is in its SURGE act *and* is genuinely
   faster than the car directly ahead *and* wants that lane, apply ≈ −6…−10% to the **1–2 cars
   immediately ahead of that hero only**. Ends when the surge window ends or the hero clears them.
2. **Front-fight staging:** during Act 3, ≈ −6% on whichever front hero is *momentarily* leading the
   contested pair, to provoke the swap (F4).

**Hard rules (all §6-compliant):** written only into the existing `trajectoryMult`/`governorMult`
channel, *beside* the multiplicative lateral brake, so a braked car still obeys avoidance and a boosted
hero still brakes with no free lane (§6.1 — verified in the sweep instrument). Applies to **≤ 2 cars at
a time**, only near an active hero, only within its act window, and the braked car **still finishes in
its band** (endpoint unchanged; the malus fades before the release, exactly like the servo). No global
brake, no strong brake, no brake+boost combo.

---

## 7. DENSITY (F6)

**Shipped ±8%.** It is the fairest on the native per-row-win test (2/10 flagged vs 3/10 at tight), it
clears the band-reach gate (~83% ≥ 70%), and — the reason I'd *choose* it over tight even ignoring
fairness — a spread field leaves **real distance between cars**, so a hero closing that distance is
*visible movement*. Tight bunches everyone: high band-reach, but the "comeback" is a few car-lengths in a
scrum. Do not chase tight's 94% band-reach; it is not worth the extra unfair track (searound) or the lost
visible distance. (The pre-existing luger/dirt-oval start-row bug, F7, is separate and must not gate this.)

---

## 8. WHAT COULD GO WRONG + THE CHEAPEST FALSIFYING EXPERIMENT

- **Risk R1 (the big one): on the densest tracks the gentle malus still can't open a lane, the surge
  stalls, churn returns.** Cheapest falsifier: Stage-2, ONE deep-charger on the *densest* track
  (searound/dirt-oval), measure the hero's surge-window traffic-braking-frac. If it stays > 0.35 → the
  gentle malus is insufficient there; the concept must either accept "blocked = no comeback on that
  track" (§6.1, allowed) or the surge must be timed to a naturally-opening stretch. **This is the single
  experiment that most cheaply kills or confirms the concept.**
- **Risk R2: crossing-through-1st curves push a racer out of band.** Falsifier: band-reach ≥70% on the
  Stage-3 crossing configs (it's the gate anyway; check per stage). Mitigation: the release resolves
  order within B1 only.
- **Risk R3: the 3-act journey reads as robotic (servo tracks the curve too cleanly).** Falsifier: owner
  eye-test on the Stage-1 single-charger race. Mitigation: keep natural re-roll noise on; the surge is a
  *bias*, not a rail.
- **Risk R4 (A8): false-hope front-visits feel unfair to that racer's owner.** Falsifier: Stage-4 — do a
  few, ask the owner. If it feels like robbery, restrict front-visits to B1/B2 heroes only.
- **THE cheapest overall experiment:** Stage 1 + 2 on ONE race — cast a single hero at ~rank 18 with a
  monotone surge + the gentle lane-clearing malus, v4 on, owner watches once. If he sees a clean charge →
  the spine is validated and everything else is scaling. This is a ~1-day build because the servo, the
  curve helpers, and a validated malus prototype already exist from the sweeps.

---

## 9. WHAT I WOULD **NOT** DO (and what to delete — and when)

- **Would NOT** add a new steering architecture, a reactive contest injector, camera-as-action,
  strictness-spreaders, rip-closers, or resolve-into-bands-by-90% — **all §7 dead ends.**
- **Would NOT** use a strong malus or a brake+boost combo (F4 backfires), or add per-hero knobs beyond
  the one Action slider (§6.7).
- **Would NOT** chase tight density for band-reach (F6/§7).
- **Would NOT delete anything before the owner's eye-test passes** (§6.4): the reactive director stays as
  the v4-OFF fallback; v4-OFF stays byte-identical.
- **After** v4 is eye-validated, I *would* delete/replace (source hygiene, §6.5): (i) the `nextCluster`
  rank-2 floor (§4a) → through-rank-1 casting; (ii) the `clampIntensityToBudget` intensity-collapse
  (§4d) → per-hero recast; (iii) the B1-only hero pool (§4b) → all-band casting. Each is a caster change,
  not an engine change.

---

## 10. STAGED BUILD ORDER (each independently verifiable; fairness gate checked every stage)

Every stage: **gate = band-reach ≥ 70%** (per-track), start-row win-χ² as a secondary per-track signal
(F7), v4-OFF byte-identical, ESLint clean, one source of truth.

- **Stage 1 — CAST DEEP (caster only, no new force).** Allow all-band hero pool; suppress areaBonus for
  one designated deep-charger; author it a monotone surge curve from ~40% back. *Verify:* band-reach
  holds; **owner sees one visible charge** (even if churny). Metric: "visible comeback" (§3) fires ≥ some
  rate. — *Kills A6's "cast deep" half.*
- **Stage 2 — LANE-CLEARING MALUS.** Add the gentle surge malus (§6.1). *Verify:* the charger's
  surge-window traffic-braking-frac drops toward ~0.28 (A3) and re-passes ≤ 1; band-reach holds; **owner
  sees a CLEAN pass, not churn.** — *This is R1's falsifier and the concept's crux.*
- **Stage 3 — FRONT FIGHT.** 2–3 B1 heroes with crossing-through-1st curves + gentle leader-brake in the
  finish window + late release 0.97. *Verify:* ≥ 1.3 held (≥750 ms) lead changes (F4); winner decided
  after 0.9; band-reach holds; **owner sees a contested finish.**
- **Stage 4 — THE TEMPLATE + UNPREDICTABILITY.** Cast the full slot template (front-fader, mid-holder,
  deep-charger(s), front-fighters) at density ±8%. *Verify:* band-reach; **unpredictability metric** =
  low correlation between mid-race position (say at 0.5) and final rank; A8 false-hope check; owner
  eye-test on several seeds.
- **Stage 5 — ONE ACTION SLIDER.** Collapse nHeroes, surge depth, front-fight intensity, and malus
  strength (within the gentle cap) into a single 0..1 `action` scalar; DevScreen admin knobs behind it,
  SetupScreen slider in front (§6.7). *Verify:* the whole §5 fact-set reproduces across the slider range;
  fairness holds at every setting.

**The through-line:** we are not building a bigger controller. We are teaching the *caster* to do what a
race director does — put people in interesting places and let one clean charge and one real fight carry
the show — using an engine we already proved can deliver it.
