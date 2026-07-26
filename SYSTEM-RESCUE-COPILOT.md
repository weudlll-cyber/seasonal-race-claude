# SYSTEM RESCUE — Copilot Ideation (independent, report-only)

Scope: ideation only. No code edits, no runs, no coordination.

Absorbed context before proposing:
- Lessons 178, 180, 181, 182 in docs/LESSONS.md
- All seven reports in reports/evolution
- Gap-reroll and runaway concept history in reports/proposals
- Current measured world in reports/parity/REBASELINE.md and reports/parity/GS-CONFIRM-GATE.md

Read of the wall we hit:
- The current world is fair and physically honest, but late-race contest is not reliably watchable enough.
- Two mechanism classes are exhausted by measurement and should stay closed: target-following and finale-window scheduled-dice overlays.
- The strongest positive prior is Lesson 178: authored orchestration created action; liberation removed action.

I rank the proposals below by conviction.

## 1) Outcome Playbook Engine (authored multi-racer set plays)

### Core mechanism
Replace ad-hoc late-race interventions with a deterministic play-calling engine that starts before the current finale window (for example from phase progress around 0.65 onward) and calls one of several multi-racer "set plays" for the front pack (top 6 to 8 racers). A play is not a teleport and not a target-follow rule: it is a temporary trajectory-intent package (entry line bias, attack lane preference, defend lane preference, release timing) applied to multiple racers at once, then released back to normal control. The call is chosen from race state features (front spread, pack compression, recent pass rate, remaining distance), with deterministic tie-breaks. Think of this as replacing random late compression with authored, readable contest choreography that still resolves naturally under live physics.

### How it satisfies the four hard requirements
- FAIR: Keep static slot assignment and the existing fairness servo intact as the base contract. Plays are bounded in authority, front-scoped, and cannot move racers across fairness bands by design guardrails.
- PHYSICALLY CORRECT: Plays only bias choices that already exist in motion planning (line and timing), then pass through the same speed caps, slew, and physics integration.
- NO OVERLAPS: Reuse the existing overlap-avoidance and safe-spacing pipeline; play intents are requests, not hard placement.
- ACTION-LOADED: Multi-racer conflict is the objective, not a side effect. Every play is explicitly designed to create pass opportunities among several front racers in the final third.

### What survives and what dies
- Survives: static slot assignment, band model, fairness gates, deterministic sim/browser parity discipline, collision model, existing metrics observers.
- Dies/replaced: finale-window dice overlay family as the late-race action lever; one-shot late tricks.
- Modified: hero usage can become one play type inside a single playbook system instead of separate special-case logic.

### Cost class and first sim-only prototype
- Cost class: subsystem replacement.
- First prototype (sim-only):
  1. Add a play selector with 3 plays only (compress-and-release, outside surge, staggered defense).
  2. Apply to top 6 racers from progress 0.65 to 0.95.
  3. Add telemetry for play calls, play durations, pass count during play, and post-play decay.
  4. Run paired screens on one open and one closed track first.

### Biggest risk and cheapest decisive test
- Biggest risk: it may look scripted/repetitive and reduce authenticity if play diversity is too low.
- Cheapest decisive sim-first test: A/B paired screen with and without playbook, N=50 per arm per track on one open + one closed track. Kill immediately if band-reach drops below 70% on either track or if lead-changes do not rise while dead/runaway do not improve. Add a repetition metric (play entropy per race) to catch "same finale every time".

### Prior art and mapping
- Prior art: set-play orchestration in team sports and restart choreography in motorsport broadcasts.
- Mapping: not copying sport rules; borrowing the idea that authored tactical phases produce watchable conflict while the underlying physics still decides execution.

---

## 2) Procedural Attack Mode Lanes (trade path length for attack authority)

### Core mechanism
Introduce one global, track-agnostic attack mechanic inspired by Formula E attack mode and rallycross joker-lap logic, but procedural so no per-track hand tuning is needed. On every track, auto-generate one or two attack gates from spline geometry. Taking the gate moves a racer onto a slightly longer outer line for a short segment and grants temporary attack authority afterward (for example broader acceleration headroom within existing honesty limits). Each contender has a limited number of activations. The strategic question becomes when to spend attack mode; this naturally creates late-race crossing strategies and overtakes.

### How it satisfies the four hard requirements
- FAIR: Everyone races under the same global rules and same activation budget logic. No track-specific parameter set.
- PHYSICALLY CORRECT: Attack is paid by distance/time tradeoff on real trajectory segments; no teleports and no invisible repositioning.
- NO OVERLAPS: Attack lane geometry can enforce separation where needed, and merge points reuse existing spacing constraints.
- ACTION-LOADED: Delayed activations force timing games near the finish, increasing meaningful overtake attempts instead of passive order holding.

### What survives and what dies
- Survives: core race physics, collision system, deterministic step pipeline, fairness evaluation stack.
- Dies/replaced: reliance on hidden late-speed corrections as the primary source of finale drama.
- Modified: pathing subsystem gains optional procedural alternate segments and activation state.

### Cost class and first sim-only prototype
- Cost class: subsystem replacement.
- First prototype (sim-only):
  1. Build procedural gate placement from existing track spline metadata.
  2. Add one activation per racer in final 40% of race.
  3. Implement simple policy (save unless boxed in; spend if pass probability threshold met).
  4. Emit metrics: activation timing distribution, passes after activation, failed merge attempts.

### Biggest risk and cheapest decisive test
- Biggest risk: poor procedural gate placement on some tracks could create degenerate lines or unfair merges.
- Cheapest decisive sim-first test: geometry audit plus paired race screen on all ten standard tracks at N=25 first. Kill if any track shows overlap anomalies, merge deadlocks, or fairness floor violations.

### Prior art and mapping
- Prior art: Formula E attack mode, rallycross joker lap.
- Mapping: optional longer line with temporary tactical advantage, procedurally generated from each track's shape under one global rule set.

---

## 3) Energy Economy Foundation (stamina, draft, burn, and recovery)

### Core mechanism
Move from "outcome forced by slot pull" toward a physics-native race economy: each racer has a finite energy reservoir, aerodynamic draft gain, and burn/recovery dynamics. Leaders in clean air pay higher energy cost to maintain gap; chasers in draft can store and deploy energy for attacks. Finale contest emerges from converging energy states rather than scripted late correction. This is a full foundation pivot: fairness is enforced by how energy envelopes are initialized and bounded per assigned class, not by direct late target steering.

### How it satisfies the four hard requirements
- FAIR: Pre-race deterministic energy envelopes tied to fairness classes can preserve a floor at least as strict as today if calibrated correctly.
- PHYSICALLY CORRECT: Movement remains continuous and force-like; outcomes emerge from spend/recover behavior, not hidden relocations.
- NO OVERLAPS: Existing collision and spacing model remains authoritative.
- ACTION-LOADED: Endgame attacks are a natural consequence of saved energy and draft slingshots, producing late contention without ad-hoc interventions.

### What survives and what dies
- Survives: track geometry, movement integration, overlap prevention, observers and fairness gate framework.
- Dies/replaced: static-slot servo as the primary outcome driver and most late-race correction overlays.
- Modified: controller stack becomes energy-policy-driven with tactical decision logic.

### Cost class and first sim-only prototype
- Cost class: new foundation.
- First prototype (sim-only):
  1. Add energy state per racer with simple burn/recover equations.
  2. Add first-order draft model from front gap and alignment.
  3. Add policy with three modes (conserve, hold, attack).
  4. Calibrate on two tracks only, then expand to ten-track gate if promising.

### Biggest risk and cheapest decisive test
- Biggest risk: it can become implicit rubber-banding in disguise if envelopes are too prescriptive, harming perceived legitimacy.
- Cheapest decisive sim-first test: blind A/B observer panel on replay clips plus standard fairness screen. Kill if viewers call it artificial or if fairness variance rises even when pooled band-reach seems acceptable.

### Prior art and mapping
- Prior art: cycling peloton dynamics, Formula E and endurance racing energy management.
- Mapping: convert race drama from hidden corrections into visible resource timing and draft exploitation.

---

## Recommendation
Build first: Proposal 1 (Outcome Playbook Engine), because it aligns directly with Lesson 178 (authored orchestration works), keeps the proven fairness core intact, avoids all banned mechanism classes, and is the cheapest path to a decisive sim-first answer.