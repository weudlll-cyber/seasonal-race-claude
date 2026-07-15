// ============================================================
// look-before-brake.mjs — LOOK-BEFORE-BRAKE gate attribution observer (--lbb-diag, read-only, POST-RACE).
//
// SIM-ONLY, read-only, pure functions. Consumes the RAW per-decision records the sim emits under
// --lbb-diag (raceBehavior.js pushes one record per brake-zone entry that the look-before-brake gate
// evaluates). It adds ZERO behaviour: attribution + aggregation happen here, post-race.
//
// WHY: Owner eye-test — with a free lane available the trailer BRAKES instead of dodging, then after a
// short brake accelerates into that same lane anyway. This observer answers WHICH of the four
// look-before-brake conditions blocks the dodge, in numbers, so the fix targets the real cause.
//
// GATE (source of truth: raceBehavior.js, "Look before you brake"). Inside the brake zone the gate is
// evaluated in this order; the FIRST failing condition is what blocked:
//   (a) dT > dTStart            — longitudinal room to start the sidestep in time  → blockedRoom
//   (b) slowerLeaderOk||heroPass— a real overtake (leader meaningfully slower) or a choreo hero → blockedSlower
//   (c) dir !== 0               — a genuinely free side exists (chooseFreeLaneDir)  → blockedNoFreeSide
//   (d) vLatToward >= 0         — trailer not drifting toward the leader's side     → blockedDrift
//   all four pass ⇒ dodged (takeFreeLane).
//
// windowEmpty (dTStart >= dynamicBrakeT): the dodge window was empty BY CONSTRUCTION — dTStart is at or
// past the brake-zone edge, so no dT can satisfy (a). Since a brake-zone entry always has
// dT < dynamicBrakeT, windowEmpty ⟹ blockedRoom; it is tallied INDEPENDENTLY to separate
// "impossible by construction" from a near-miss that lateral-speed / margin tuning could close.
//
// brakeThenDodge (the Owner's actual complaint, as a number): within one continuous encounter (same
// trailer + same leader, consecutive frames) the trailer BRAKES on some frames and then DODGES past the
// same leader, WITHOUT ever being blocked by traffic (blockedNoFreeSide) in between. If this is common,
// the brake was provably pointless in those encounters — it did nothing the later dodge could not have
// done from the start.
// ============================================================

// ── Attribution: one decision record → the FIRST blocking condition (gate order) ──────────────────
// rec = { dT, dTStart, dynamicBrakeT, tLat, slowerLeaderOk, heroPass, dir, vLatToward, noRoomBothSides,
//         takeFreeLane, trailerIndex, leaderIndex, frame }. dir / vLatToward / noRoomBothSides are null
// when the gate short-circuited before computing them — never read past the condition that stopped it.
export function attributeDecision(rec) {
  const windowEmpty = rec.dTStart >= rec.dynamicBrakeT; // independent of the blocking reason
  let outcome;
  let noFreeSideKind = null;
  let roomShortfall = null;
  if (!(rec.dT > rec.dTStart)) {
    outcome = 'blockedRoom'; // (a)
    roomShortfall = rec.dTStart - rec.dT; // how much longitudinal room was missing
  } else if (!(rec.slowerLeaderOk || rec.heroPass)) {
    outcome = 'blockedSlower'; // (b)
  } else if (rec.dir === 0) {
    outcome = 'blockedNoFreeSide'; // (c)
    // Split the two "no free side" reasons (both come from isSideFree): the target would leave the track
    // on BOTH sides (no room on track) vs at least one in-bounds side occupied by traffic.
    noFreeSideKind = rec.noRoomBothSides ? 'noRoomOnTrack' : 'trafficBothSides';
  } else if (!(rec.vLatToward >= 0)) {
    outcome = 'blockedDrift'; // (d)
  } else {
    outcome = 'dodged';
  }
  return { outcome, windowEmpty, noFreeSideKind, roomShortfall, tLat: rec.tLat ?? null };
}

// ── Aggregation helpers ───────────────────────────────────────────────────────────────────────────
const OUTCOMES = ['dodged', 'blockedRoom', 'blockedSlower', 'blockedNoFreeSide', 'blockedDrift'];

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return +(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(6);
}
function quantile(arr, q) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))));
  return +s[idx].toFixed(6);
}
function share(n, d) {
  return d > 0 ? +(n / d).toFixed(4) : null;
}

// summarizeDecisions(decisions): flat outcome tallies + shares + windowEmpty + blockedRoom aggregates.
export function summarizeDecisions(decisions) {
  const tally = { dodged: 0, blockedRoom: 0, blockedSlower: 0, blockedNoFreeSide: 0, blockedDrift: 0 };
  let windowEmpty = 0;
  let noRoomOnTrack = 0;
  let trafficBothSides = 0;
  const roomShortfalls = [];
  const roomTLats = [];
  for (const d of decisions) {
    const a = attributeDecision(d);
    tally[a.outcome]++;
    if (a.windowEmpty) windowEmpty++;
    if (a.outcome === 'blockedNoFreeSide') {
      if (a.noFreeSideKind === 'noRoomOnTrack') noRoomOnTrack++;
      else trafficBothSides++;
    }
    if (a.outcome === 'blockedRoom') {
      if (a.roomShortfall != null) roomShortfalls.push(a.roomShortfall);
      if (a.tLat != null && Number.isFinite(a.tLat)) roomTLats.push(a.tLat);
    }
  }
  const n = decisions.length;
  const shares = {};
  for (const o of OUTCOMES) shares[o] = share(tally[o], n);
  return {
    decisions: n,
    counts: { ...tally },
    shares,
    windowEmpty,
    windowEmptyShare: share(windowEmpty, n),
    noRoomOnTrack,
    trafficBothSides,
    roomShortfallMedian: median(roomShortfalls),
    roomShortfallP90: quantile(roomShortfalls, 0.9),
    tLatMedian: median(roomTLats),
    tLatP90: quantile(roomTLats, 0.9),
  };
}

// ── brakeThenDodge: the smoking gun ────────────────────────────────────────────────────────────────
// Split one pair's records into continuous encounters (consecutive frames). A frame gap > 1 means the
// pair left the brake zone and re-entered → a new encounter.
function splitEncounters(pairRecs) {
  const sorted = [...pairRecs].sort((a, b) => a.frame - b.frame);
  const runs = [];
  let run = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].frame !== sorted[i - 1].frame + 1) {
      runs.push(run);
      run = [];
    }
    run.push(sorted[i]);
  }
  if (run.length) runs.push(run);
  return runs;
}

// detectBrakeThenDodge(decisions): decisions of ONE race. Returns the encounters where the trailer braked
// (never traffic-blocked) and then dodged the same leader. Each entry: { brakedBeforeDodge }.
export function detectBrakeThenDodge(decisions) {
  const byPair = new Map();
  for (const d of decisions) {
    const k = `${d.trailerIndex}:${d.leaderIndex}`;
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k).push(d);
  }
  const out = [];
  for (const pairRecs of byPair.values()) {
    for (const run of splitEncounters(pairRecs)) {
      const attrs = run.map(attributeDecision);
      const firstDodge = attrs.findIndex((a) => a.outcome === 'dodged');
      if (firstDodge <= 0) continue; // no dodge, or dodge on the very first frame (no prior brake)
      const pre = attrs.slice(0, firstDodge);
      const brakedBefore = pre.filter((a) => a.outcome !== 'dodged');
      if (brakedBefore.length === 0) continue; // dodged immediately after entering — not the pattern
      // "without ever having been blocked by traffic in between": no traffic block before the dodge.
      if (brakedBefore.some((a) => a.outcome === 'blockedNoFreeSide')) continue;
      out.push({ brakedBeforeDodge: brakedBefore.length });
    }
  }
  return out;
}

// ── Per-track report ────────────────────────────────────────────────────────────────────────────────
// races = [{ decisions:[...] }, ...] (one entry per race, each with its own per-race frame numbering).
export function perTrackReport(trackId, isOpen, races) {
  const flat = (races ?? []).flatMap((rr) => rr.decisions ?? []);
  const encounters = (races ?? []).flatMap((rr) => detectBrakeThenDodge(rr.decisions ?? []));
  return {
    trackId,
    isOpen,
    nRaces: (races ?? []).length,
    summary: summarizeDecisions(flat),
    brakeThenDodge: {
      count: encounters.length,
      medianBrakedFrames: median(encounters.map((e) => e.brakedBeforeDodge)),
    },
  };
}

// ── Markdown render ───────────────────────────────────────────────────────────────────────────────
function fmtPct(v) {
  return v == null ? '—' : `${(v * 100).toFixed(1)}%`;
}
function fmtNum(v) {
  return v == null ? '—' : `${v}`;
}

export function renderMarkdown(perTrack, meta = {}) {
  const L = [];
  L.push('# Look-Before-Brake Gate Diagnostics');
  L.push('');
  L.push(
    `*Generated ${meta.date ?? '(date)'} · seed=${meta.seed ?? '?'} · races/track=${meta.racesPerTrack ?? '?'} · dur=${meta.dur ?? '?'}s · world=${meta.world ?? '?'}*`
  );
  L.push('');
  L.push('Owner eye-test: with a free lane available the trailer BRAKES instead of dodging, then after a');
  L.push('short brake accelerates into that same lane. This measures WHICH of the four look-before-brake');
  L.push('conditions blocks the dodge — no fix, no behaviour change. Gate order and definitions: see the');
  L.push('"Look-Before-Brake Diagnostics" section of docs/SIM.md.');
  L.push('');
  L.push('## Outcome shares (per brake-zone decision)');
  L.push('');
  L.push('| Track | open | decisions | dodged | blockedRoom | blockedSlower | blockedNoFreeSide | blockedDrift | windowEmpty |');
  L.push('|---|---|---:|---:|---:|---:|---:|---:|---:|');
  const rowShares = (t) => {
    const s = t.summary;
    return `| ${t.trackId} | ${t.isOpen ? 'open' : 'closed'} | ${s.decisions} | ${fmtPct(s.shares.dodged)} | ${fmtPct(s.shares.blockedRoom)} | ${fmtPct(s.shares.blockedSlower)} | ${fmtPct(s.shares.blockedNoFreeSide)} | ${fmtPct(s.shares.blockedDrift)} | ${fmtPct(s.windowEmptyShare)} |`;
  };
  for (const t of perTrack) L.push(rowShares(t));
  L.push('');
  L.push('## Smoking gun + blockedRoom detail');
  L.push('');
  L.push('- **brakeThenDodge** = braked, then dodged the SAME leader with no traffic block in between (the Owner\'s complaint, counted).');
  L.push('- **noRoom / traffic** = split of blockedNoFreeSide: target off-track on both sides vs an in-bounds side occupied.');
  L.push('- **roomShortfall** = dTStart − dT for blockedRoom (how much longitudinal room was missing); **tLat** = steps to clear sideways.');
  L.push('');
  L.push('| Track | brakeThenDodge | median brakedFrames | windowEmpty | noRoom | traffic | roomShortfall med / p90 | tLat med / p90 |');
  L.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  const rowGun = (t) => {
    const s = t.summary;
    const b = t.brakeThenDodge;
    return `| ${t.trackId} | ${b.count} | ${fmtNum(b.medianBrakedFrames)} | ${s.windowEmpty} | ${s.noRoomOnTrack} | ${s.trafficBothSides} | ${fmtNum(s.roomShortfallMedian)} / ${fmtNum(s.roomShortfallP90)} | ${fmtNum(s.tLatMedian)} / ${fmtNum(s.tLatP90)} |`;
  };
  for (const t of perTrack) L.push(rowGun(t));
  L.push('');
  L.push('## How to read it');
  L.push('- High **blockedRoom** with high **windowEmpty** ⇒ the dodge window is a fiction (dTStart ≥ brake edge); tuning lateral speed alone cannot open it.');
  L.push('- High **blockedRoom** with LOW windowEmpty + small **roomShortfall** ⇒ a near-miss; lateral-speed / margin tuning could close it.');
  L.push('- High **blockedNoFreeSide/traffic** ⇒ the brake is genuinely traffic-forced (not a false brake).');
  L.push('- High **brakeThenDodge** ⇒ the brake was provably pointless in those encounters.');
  L.push('');
  return L.join('\n');
}
