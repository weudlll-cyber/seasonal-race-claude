# FAIRNESS.md — what "fair" means in RaceArena, and how it is measured

**This is the canonical definition of fairness for the race dynamics.** It states the owner's definition,
names the ONE headline number, and pins the permanent gate lines a race-dynamics change must clear. The
operational start-row gate in [PROJECT-PRINCIPLES.md §8](PROJECT-PRINCIPLES.md) is layer 1 of this definition;
this document is the whole of it. Current shipped world: **COMBO15** (master `@175a475`, tag `v-ship-combo15`).

---

## The owner's definition — two layers

Fairness in this game is **not** about ability (all racers in a race are identical — same type, same speed;
see [PROJECT-PRINCIPLES.md §3](PROJECT-PRINCIPLES.md)). It is about the START ROW and the promise the game
makes about it. Two layers, both binding:

1. **Row-blind draw, before the start.** Every racer is assigned a target finishing PLACE by a draw that is
   blind to its start row. No start row is advantaged or disadvantaged in the assignment — a racer on the back
   row is as likely to draw a winning place as one on the front. This is the *equal-win-chance-from-every-row*
   promise, and it is measured by the operational gate: **band-reach ≥ 70%** (overall zone-success rate,
   `computeZoneSuccessRate`) **AND zero Holm-unfair start rows** (per-start-row win χ² with Holm correction),
   on every standard track.

2. **The in-race promise, during the race.** Every racer actually REACHES the band of its drawn place by the
   finish. The draw is only fair if the race delivers it — a racer that drew 3rd must finish in the 3rd-place
   band, not be stranded by traffic or a runaway. This is the layer COMBO15 was built to strengthen, and it is
   measured by the headline number below.

The two layers are independent: layer 1 can pass (the draw is row-blind) while layer 2 fails (the field can't
reach its drawn bands because a leader broke away). The shipped world must clear both.

---

## The headline number — ABSOLUTE band arrival

**The single figure that summarises fairness is ABSOLUTE band arrival: the percentage of racers that finish
in the band of their drawn place, per track.** Not a delta versus a previous world, not a correlation — the
absolute share. A world is fairer than another if it lands more racers in their drawn bands.

- Pre-COMBO15 (the servo world) delivered **69–83%** arrival across the standard tracks.
- **COMBO15 delivers 85–90% / track** (binding N=100 record) — the current shipped headline. It reaches this
  by biasing the re-roll DRAW toward the drawn band (the Cliff Law's correct sign — correct the draw, never
  the motion after the dice; [LESSONS.md L184](LESSONS.md)), not by any positional force.

Judge a track on its ABSOLUTE arrival, not on the delta: a track already near its structural ceiling (e.g.
garden-path, below) shows a small delta while sitting at a perfectly good absolute number.

Full record: [reports/evolution/FAIR-ARRIVAL-GATE.md](../reports/evolution/FAIR-ARRIVAL-GATE.md);
current baseline: [reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md).

---

## Permanent gate lines

A race-dynamics change ships only if it holds ALL of these on the standard tracks:

- **Layer 1 — start-row fairness:** band-reach ≥ 70% AND zero Holm-unfair start rows, every track
  (PROJECT-PRINCIPLES §8). A change must not WORSEN Holm on any track.
- **Layer 2 — arrival:** absolute band arrival must not regress; the headline target is **85–90% / track**.
- **The v2 duration-relative PULK watchdog (permanent gate line).** The chaos-window P1–P2 maximum gap must
  stay proportionate to the shipped world: **chaos maxGap ≤ ship × 1.5**. This catches a *disproportionate*
  early breakaway (one racer running away from the field in the chaos window) without punishing an honest
  chase. It is **v2 = duration-relative** deliberately: the earlier v1 used an absolute `ship + 1.0L`
  tolerance, which tripped falsely at long durations purely because all gaps scale with race length while the
  true flatness signals (`maxLeadHoldShare_mid`, `distinctLeaders_mid`) passed. Read the ratio, not the length.
  Rationale and the wrong-lever it replaced: [LESSONS.md L188 + L189](LESSONS.md);
  [reports/evolution/STEER-CAP-1.md](../reports/evolution/STEER-CAP-1.md).

Fairness is measured in the SHIPPED config (shipped == measured, [LESSONS.md L166](LESSONS.md)) and in gap
space / racer lengths, never rank space ([LESSONS.md L172](LESSONS.md)). `corrP1` is action-quality context,
never a fairness gate ([PROJECT-PRINCIPLES.md §8](PROJECT-PRINCIPLES.md)).

---

## Documented residuals (accepted, not regressions)

COMBO15 is a near-pass — 7/10 tracks clear every criterion. Two residuals are CHARACTERISED and accepted; a
future change need not chase them but must not worsen them:

- **space-sprint chaos gap ~1.6× ship.** A genuine modest breakaway on this one open track, just over the
  1.5× watchdog line (3.1L vs a 1.9L base). It is a real chaos-window overshoot, not a duration artefact; the
  boost-side cap that tried to close it BACKFIRED (Lesson 189), so it stands documented until a chaser-side
  lever (partial-sort / band-edge target) is built. It does not harm arrival or the pulk hold.
- **garden-path arrival ceiling ~86%.** This track's start-row geometry caps arrival: the servo world already
  sits at 83% there and COMBO15 lifts it only to 86% — the same +3pp shape as every other track, so the
  ceiling is structural, not a mechanism gap. Judge garden-path on its absolute 86%, not on the delta.

---

## Where the definition lives in code and reports

- Operational start-row gate: `computeZoneSuccessRate` + Holm χ² in the sim-fairness harness; the gate
  methodology is pinned in the fairness-gate methodology (band-reach, pooled per-track).
- Arrival + pulk watchdog observer: `scripts/sim/observers/front-liveliness.mjs` (three-window readout:
  chaos / pulk / finale; [LESSONS.md L188](LESSONS.md)).
- The shipped mechanism (chaos steer + band-aware re-roll bias + 0.15 chaos window) as ordinary config keys:
  `client/src/modules/storage/defaults.js` (`chaosSteer`, `chaosSteerGain`, `bandBias`, `bandBiasR`,
  `bandBiasGain`, `racePlanPulkStart`); see [reports/evolution/MERGE-SHIP-1.md](../reports/evolution/MERGE-SHIP-1.md).
