// ============================================================
// comeback-reality.mjs — COMEBACKER REALITY observer (SWEEP support, read-only, POST-RACE).
//
// SIM-ONLY, read-only. Pure functions. Consumes the RAW per-hero observations the sim already emits
// under --hero-map (results.heroObs → hero-map.json `perHero`); it adds ZERO per-frame sim code. It
// answers the empirical question behind camera-foresight B4: does a hero cast as a COMEBACKER actually
// climb close to its authored finalRank, and is that designation a reliable pointer to real climbing?
//
// Role source: reuses `heroRole` + `ROLE_MARGIN_RANKS` from hero-adherence.mjs (ONE source — a comebacker
// is anchorRank − targetRank > ROLE_MARGIN_RANKS, i.e. cast behind its target and required to CLIMB).
//
// SCOPE CAVEAT (honest): heroObs records ONLY the heroes (the cast), never the full field. So the
// reliability "top climber" ranking below is AMONG THE CAST, not against all racers — a full-field
// comparison would need per-racer anchor ranks the sim does not collect (adding that would enlarge the
// byte-identity surface, which this sweep forbids). Interpret the reliability rates as "within the cast".
// ============================================================

import { heroRole, ROLE_MARGIN_RANKS } from "./hero-adherence.mjs";
export { heroRole, ROLE_MARGIN_RANKS };

// "near" its authored finalRank = within this many ranks (spec: within 3).
export const NEAR_TARGET_RANKS = 3;
// reliability: a comebacker "achieved" its story if it realised ≥ this fraction of its planned climb.
export const HALF_CLIMB_FRAC = 0.5;

// A comebacker with all three ranks present (anchor/target/final) and role === 'comeback'.
export function filterComebackers(perHero) {
  return (perHero ?? []).filter(
    (h) =>
      heroRole(h) === "comeback" &&
      h.anchorRank != null &&
      h.targetRank != null &&
      h.finalRank != null,
  );
}

// comebackerMetrics(h): per-comebacker reality record. Rank 1 = front (lower is better).
export function comebackerMetrics(h) {
  const { anchorRank, targetRank, finalRank } = h;
  const climbPlanned = anchorRank - targetRank; // > 0 for a comebacker (behind → target)
  const climbAchieved = Math.max(0, anchorRank - finalRank); // clamp ≥ 0 (a further drop is 0 climb)
  const targetReached = finalRank <= targetRank ? 1 : 0; // landed at or better than target
  const rankDeltaToTarget = finalRank - targetRank; // < 0 over-achieved, 0 = exact, > 0 = short
  const climbFracOfPlan =
    climbPlanned > 0 ? +(climbAchieved / climbPlanned).toFixed(4) : null;
  const nearTarget = Math.abs(rankDeltaToTarget) <= NEAR_TARGET_RANKS;
  return {
    index: h.index,
    anchorRank,
    targetRank,
    finalRank,
    climbPlanned,
    climbAchieved,
    targetReached,
    rankDeltaToTarget,
    climbFracOfPlan,
    nearTarget,
  };
}

const mean = (a) =>
  a.length ? +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(3) : null;
const rate = (a) =>
  a.length ? +(a.filter(Boolean).length / a.length).toFixed(3) : null;

// summarizeComebacker(perHero): aggregate over a flat array of raw heroObs (all races of a cell).
export function summarizeComebacker(perHero) {
  const recs = filterComebackers(perHero).map(comebackerMetrics);
  // histogram: achieved-vs-planned climb bins (key "achieved/planned"), counts.
  const histogram = {};
  for (const r of recs) {
    const k = `${r.climbAchieved}/${r.climbPlanned}`;
    histogram[k] = (histogram[k] ?? 0) + 1;
  }
  return {
    nComebackers: recs.length,
    meanClimbPlanned: mean(recs.map((r) => r.climbPlanned)),
    meanClimbAchieved: mean(recs.map((r) => r.climbAchieved)),
    meanClimbFracOfPlan: mean(
      recs.map((r) => r.climbFracOfPlan).filter((v) => v != null),
    ),
    targetReachRate: rate(recs.map((r) => r.targetReached)), // finalRank ≤ targetRank
    meanRankDeltaToTarget: mean(recs.map((r) => r.rankDeltaToTarget)), // 0 = exact, + = short
    nearTargetRate: rate(recs.map((r) => r.nearTarget)), // within NEAR_TARGET_RANKS of target
    histogram,
  };
}

// reliabilityStats(races): races = [{ heroObs:[...] }, ...] (per-race grouping).
// Per race: is the designated comebacker (best climber among comebackers) the top / top-3 climber
// AMONG THE CAST, and did ≥1 comebacker realise ≥50% of its planned climb?
export function reliabilityStats(races) {
  let nRacesWithComebacker = 0,
    totalComebackers = 0;
  let topClimberHits = 0,
    top3ClimberHits = 0,
    halfClimbHits = 0;
  for (const race of races ?? []) {
    const cbs = filterComebackers(race.heroObs).map(comebackerMetrics);
    if (!cbs.length) continue;
    nRacesWithComebacker++;
    totalComebackers += cbs.length;
    // Rank ALL heroes in the race by realised climb (anchor − final, clamped ≥ 0).
    const climbers = (race.heroObs ?? [])
      .filter((h) => h.anchorRank != null && h.finalRank != null)
      .map((h) => ({
        index: h.index,
        climb: Math.max(0, h.anchorRank - h.finalRank),
      }))
      .sort((a, b) => b.climb - a.climb);
    const topIdx = climbers[0]?.index;
    const top3 = new Set(climbers.slice(0, 3).map((x) => x.index));
    const bestCb = [...cbs].sort(
      (a, b) => b.climbAchieved - a.climbAchieved,
    )[0];
    if (bestCb.index === topIdx) topClimberHits++;
    if (top3.has(bestCb.index)) top3ClimberHits++;
    if (
      cbs.some(
        (c) =>
          c.climbFracOfPlan != null && c.climbFracOfPlan >= HALF_CLIMB_FRAC,
      )
    )
      halfClimbHits++;
  }
  const r = (n) =>
    nRacesWithComebacker ? +(n / nRacesWithComebacker).toFixed(3) : null;
  return {
    nRacesWithComebacker,
    totalComebackers,
    topClimberRate: r(topClimberHits), // designated comebacker was THE top climber (in the cast)
    top3ClimberRate: r(top3ClimberHits), // designated comebacker was a top-3 climber (in the cast)
    halfClimbRate: r(halfClimbHits), // ≥1 comebacker realised ≥50% of planned climb
  };
}

// perTrackReport(trackId, isOpen, races): one cell's full record (flat summary + per-race reliability).
export function perTrackReport(trackId, isOpen, races) {
  const flat = (races ?? []).flatMap((rr) => rr.heroObs ?? []);
  return {
    trackId,
    isOpen,
    nRaces: (races ?? []).length,
    summary: summarizeComebacker(flat),
    reliability: reliabilityStats(races),
  };
}

// renderMarkdown(perTrack, meta): pure string builder for the combined report.
export function renderMarkdown(perTrack, meta = {}) {
  const L = [];
  L.push("# Comeback Reality Sweep");
  L.push("");
  L.push(
    `*Generated ${meta.date ?? "(date)"} · seed=${meta.seed ?? "?"} · races/track=${meta.racesPerTrack ?? "?"} · racer=${meta.racer ?? "?"} · dur=${meta.dur ?? "?"}s · world=${meta.world ?? "?"}*`,
  );
  L.push("");
  L.push(
    "Empirical check for camera-foresight B4: does a hero cast as a **comebacker** actually climb close",
  );
  L.push(
    "to its authored `finalRank`, and is that designation a reliable pointer to real climbing?",
  );
  L.push("");
  L.push(
    '> **Scope caveat:** `heroObs` records only the cast (heroes), so the reliability "top climber" ranking',
  );
  L.push(
    "> is **among the cast**, not against the full field (full-field would need per-racer anchor ranks the",
  );
  L.push(
    '> sim does not collect). Read the reliability rates as "within the cast".',
  );
  L.push("");
  L.push("## Per-track summary");
  L.push("");
  L.push(
    "| Track | open | races | comebackers | meanPlanned | meanAchieved | achieved/plan | targetReach | Δ→target | nearTarget(±3) | top3-climber | ≥50%-climb |",
  );
  L.push("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const t of perTrack) {
    const s = t.summary,
      r = t.reliability;
    L.push(
      `| ${t.trackId} | ${t.isOpen ? "open" : "closed"} | ${t.nRaces} | ${s.nComebackers} | ${s.meanClimbPlanned ?? "—"} | ${s.meanClimbAchieved ?? "—"} | ${s.meanClimbFracOfPlan ?? "—"} | ${fmtPct(s.targetReachRate)} | ${s.meanRankDeltaToTarget ?? "—"} | ${fmtPct(s.nearTargetRate)} | ${fmtPct(r.top3ClimberRate)} | ${fmtPct(r.halfClimbRate)} |`,
    );
  }
  // Pooled overall
  const allRaces = perTrack.flatMap((t) => t._races ?? []);
  if (allRaces.length) {
    const flat = allRaces.flatMap((rr) => rr.heroObs ?? []);
    const s = summarizeComebacker(flat),
      r = reliabilityStats(allRaces);
    L.push(
      `| **ALL** | — | ${allRaces.length} | ${s.nComebackers} | ${s.meanClimbPlanned ?? "—"} | ${s.meanClimbAchieved ?? "—"} | ${s.meanClimbFracOfPlan ?? "—"} | ${fmtPct(s.targetReachRate)} | ${s.meanRankDeltaToTarget ?? "—"} | ${fmtPct(s.nearTargetRate)} | ${fmtPct(r.top3ClimberRate)} | ${fmtPct(r.halfClimbRate)} |`,
    );
  }
  L.push("");
  L.push("## Acceptance thresholds (from the sweep spec)");
  L.push(
    "- **Plan soundness:** comebacker `finalRank` lands within **mean ±2–3** of `targetRank` (col Δ→target).",
  );
  L.push("  If |Δ→target| ≥ 5, the plan is unreliable.");
  L.push(
    "- **Reliability:** designated comebacker is a **top-3 climber (in the cast) in ≥60%** of races.",
  );
  L.push("- BUILD B4 only if BOTH pass; otherwise mark B4 WONT-FIX.");
  L.push("");
  L.push("## Histograms (achieved / planned climb, per track)");
  for (const t of perTrack) {
    const h = t.summary.histogram;
    const keys = Object.keys(h).sort((a, b) => h[b] - h[a]);
    L.push(
      `- **${t.trackId}**: ${keys.length ? keys.map((k) => `${k}×${h[k]}`).join(", ") : "(no comebackers)"}`,
    );
  }
  L.push("");
  return L.join("\n");
}

function fmtPct(v) {
  return v == null ? "—" : `${(v * 100).toFixed(0)}%`;
}
