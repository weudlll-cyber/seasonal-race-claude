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
function share(n, d) {
  return d > 0 ? +(n / d).toFixed(4) : null;
}

// ── Bounded value histogram (value → count) ─────────────────────────────────────────────────────────
// A sweep produces tens of millions of blockedRoom decisions; holding every roomShortfall / tLat value
// (or every raw record) blows the heap. Instead we fold each value into a count histogram keyed by its
// 6-dp-rounded value. tLat is near-constant per track (a body-geometry ratio) → a handful of keys;
// roomShortfall spans a small range → a few thousand keys at most. Quantiles use nearest-rank over the
// weighted distribution (exact to the 6-dp bin).
function histPush(hist, value) {
  if (value == null || !Number.isFinite(value)) return;
  const key = +value.toFixed(6);
  hist.set(key, (hist.get(key) ?? 0) + 1);
}
function histQuantile(hist, q) {
  if (hist.size === 0) return null;
  const keys = [...hist.keys()].sort((a, b) => a - b);
  let total = 0;
  for (const k of keys) total += hist.get(k);
  const rank = Math.min(total - 1, Math.max(0, Math.round(q * (total - 1)))); // 0-indexed nearest-rank
  let cum = 0;
  for (const k of keys) {
    cum += hist.get(k);
    if (cum > rank) return k;
  }
  return keys[keys.length - 1];
}

// ── Streaming accumulator (bounded memory) ──────────────────────────────────────────────────────────
// The harness folds one race at a time and discards the raw records, so peak memory is one race, not the
// whole sweep. accumulateRace / finalizeAccumulator share attributeDecision + the encounter splitter with
// the array-path summarizeDecisions below (one attribution source, no drift). Two UNITS live here and are
// labelled apart everywhere: per pair-FRAME (time-weighted — a brake lingers same-lane for many frames, a
// dodge exits the same-lane filter at once) and per ENCOUNTER (one label per same-pair contiguous run).
const ENC_OUTCOMES = ['dodged', 'noWindowEver', 'blockedSlower', 'blockedNoFreeSide', 'blockedDrift'];

export function emptyAccumulator() {
  return {
    // ── per pair-FRAME (time-weighted) ──
    decisions: 0,
    counts: { dodged: 0, blockedRoom: 0, blockedSlower: 0, blockedNoFreeSide: 0, blockedDrift: 0 },
    windowEmpty: 0,
    noRoomOnTrack: 0,
    trafficBothSides: 0,
    roomShortfallHist: new Map(),
    tLatHist: new Map(),
    // ── per ENCOUNTER (one label each) ──
    encounters: 0,
    encCounts: { dodged: 0, noWindowEver: 0, blockedSlower: 0, blockedNoFreeSide: 0, blockedDrift: 0 },
    windowFramesHist: new Map(), // only encounters with windowFrames >= 1
    entryGapHist: new Map(),
    // ── brakeThenDodge (encounter-level) + the causal cross-tab ──
    btdCount: 0, // brakeThenDodge encounter count
    btdBrakedFrames: [], // braked-frames-before-dodge per encounter (small: ~thousands per track)
    btdNoWindowBeforeDodge: 0, // of those, how many had NO usable window frame before the first dodge
  };
}

// accumulateRace(acc, decisions): fold ONE race's raw decision records into acc, then drop the records.
export function accumulateRace(acc, decisions) {
  for (const d of decisions) {
    acc.decisions++;
    const a = attributeDecision(d);
    acc.counts[a.outcome]++;
    if (a.windowEmpty) acc.windowEmpty++;
    if (a.outcome === 'blockedNoFreeSide') {
      if (a.noFreeSideKind === 'noRoomOnTrack') acc.noRoomOnTrack++;
      else acc.trafficBothSides++;
    }
    if (a.outcome === 'blockedRoom') {
      histPush(acc.roomShortfallHist, a.roomShortfall);
      histPush(acc.tLatHist, a.tLat);
    }
  }
  // ── Encounter-level pass — ONE grouping, shared by the outcome label + brakeThenDodge + cross-tab.
  // Encounters live within a race's contiguous frames, so this is per-race.
  for (const enc of groupEncounters(decisions)) {
    const eo = encounterOutcome(enc);
    acc.encounters++;
    acc.encCounts[eo.outcome]++;
    if (eo.windowFrames >= 1) histPush(acc.windowFramesHist, eo.windowFrames);
    histPush(acc.entryGapHist, eo.entryGap);
    const btd = brakeThenDodgeOfEncounter(enc);
    if (btd) {
      acc.btdCount++;
      acc.btdBrakedFrames.push(btd.brakedBeforeDodge);
      if (btd.windowBeforeDodge === 0) acc.btdNoWindowBeforeDodge++;
    }
  }
}

// finalizeAccumulator(acc): collapse into the same summary shape summarizeDecisions returns, plus btd.
export function finalizeAccumulator(acc) {
  const n = acc.decisions;
  const shares = {};
  for (const o of OUTCOMES) shares[o] = share(acc.counts[o], n);
  return {
    summary: {
      decisions: n,
      counts: { ...acc.counts },
      shares,
      windowEmpty: acc.windowEmpty,
      windowEmptyShare: share(acc.windowEmpty, n),
      noRoomOnTrack: acc.noRoomOnTrack,
      trafficBothSides: acc.trafficBothSides,
      roomShortfallMedian: histQuantile(acc.roomShortfallHist, 0.5),
      roomShortfallP90: histQuantile(acc.roomShortfallHist, 0.9),
      tLatMedian: histQuantile(acc.tLatHist, 0.5),
      tLatP90: histQuantile(acc.tLatHist, 0.9),
    },
    encounter: (() => {
      const E = acc.encounters;
      const encShares = {};
      for (const o of ENC_OUTCOMES) encShares[o] = share(acc.encCounts[o], E);
      return {
        encounters: E,
        counts: { ...acc.encCounts },
        shares: encShares,
        noWindowEverShare: share(acc.encCounts.noWindowEver, E),
        // windowFrames = the empirical window WIDTH in frames (only encounters that had a window at all).
        windowFramesMedian: histQuantile(acc.windowFramesHist, 0.5),
        windowFramesP90: histQuantile(acc.windowFramesHist, 0.9),
        // entryGap = dTStart − dT at the encounter's first record (negative ⇒ entered already in-window).
        entryGapMedian: histQuantile(acc.entryGapHist, 0.5),
        entryGapP90: histQuantile(acc.entryGapHist, 0.9),
      };
    })(),
    brakeThenDodge: {
      count: acc.btdCount,
      medianBrakedFrames: median(acc.btdBrakedFrames),
      // Causal cross-tab: of the brakeThenDodge encounters, the share with NO usable window frame before
      // the first dodge — i.e. the brake itself opened the gap the dodge then used.
      noWindowBeforeDodge: acc.btdNoWindowBeforeDodge,
      noWindowBeforeDodgeShare: share(acc.btdNoWindowBeforeDodge, acc.btdCount),
    },
  };
}

// summarizeDecisions(decisions): array-path flat summary (exact quantiles). Used by unit tests and small
// runs; the sweep uses the streaming accumulator above. Both attribute through attributeDecision.
export function summarizeDecisions(decisions) {
  const acc = emptyAccumulator();
  accumulateRace(acc, decisions);
  return finalizeAccumulator(acc).summary;
}

// ── Encounter grouping (THE single source; reused for every encounter-level metric) ──────────────────
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

// groupEncounters(decisions): decisions of ONE race → an array of encounters (each a frame-sorted run of
// records for the same trailer/leader pair). The ONE grouping — outcome labels, brakeThenDodge and the
// cross-tab all consume it (no second grouping anywhere).
export function groupEncounters(decisions) {
  const byPair = new Map();
  for (const d of decisions) {
    const k = `${d.trailerIndex}:${d.leaderIndex}`;
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k).push(d);
  }
  const encounters = [];
  for (const pairRecs of byPair.values()) {
    for (const run of splitEncounters(pairRecs)) encounters.push(run);
  }
  return encounters;
}

// encounterOutcome(enc): ONE label per encounter (the unit that can be read as a rate, unlike per-frame).
//   windowFrames — records with dT > dTStart: the EMPIRICAL window WIDTH in frames (usability, not the
//                  geometric existence that windowEmpty tested).
//   dodged       — the encounter contained ≥1 takeFreeLane record.
//   entryGap     — dTStart − dT at the FIRST record (negative ⇒ became same-lane already inside the window).
//   outcome      — dodged | noWindowEver (never a usable frame) | else the FIRST blocking condition on the
//                  FIRST window frame, via the per-record classifier (never blockedRoom — a window frame
//                  passed room by definition — and never dodged, since the encounter is not dodged).
export function encounterOutcome(enc) {
  const dodged = enc.some((r) => r.takeFreeLane === true);
  const windowFrames = enc.reduce((n, r) => n + (r.dT > r.dTStart ? 1 : 0), 0);
  const first = enc[0];
  const entryGap = first.dTStart - first.dT;
  let outcome;
  if (dodged) {
    outcome = 'dodged';
  } else if (windowFrames === 0) {
    outcome = 'noWindowEver';
  } else {
    const firstWindow = enc.find((r) => r.dT > r.dTStart);
    outcome = attributeDecision(firstWindow).outcome; // blockedSlower | blockedNoFreeSide | blockedDrift
  }
  return { outcome, windowFrames, dodged, entryGap };
}

// brakeThenDodgeOfEncounter(enc): null unless the trailer braked (never traffic-blocked) and then dodged
// the same leader. Returns { brakedBeforeDodge, windowBeforeDodge } — windowBeforeDodge = how many of the
// pre-dodge records already had a usable window (dT > dTStart); 0 ⇒ the brake opened the gap the dodge used.
function brakeThenDodgeOfEncounter(enc) {
  const attrs = enc.map(attributeDecision);
  const firstDodge = attrs.findIndex((a) => a.outcome === 'dodged');
  if (firstDodge <= 0) return null; // no dodge, or dodge on the very first frame (no prior brake)
  const brakedBefore = attrs.slice(0, firstDodge).filter((a) => a.outcome !== 'dodged');
  if (brakedBefore.length === 0) return null; // dodged immediately after entering — not the pattern
  // "without ever having been blocked by traffic in between": no traffic block before the dodge.
  if (brakedBefore.some((a) => a.outcome === 'blockedNoFreeSide')) return null;
  const windowBeforeDodge = enc.slice(0, firstDodge).reduce((n, r) => n + (r.dT > r.dTStart ? 1 : 0), 0);
  return { brakedBeforeDodge: brakedBefore.length, windowBeforeDodge };
}

// detectBrakeThenDodge(decisions): decisions of ONE race → the brakeThenDodge encounters (thin wrapper
// over the shared grouping + per-encounter test). Each entry: { brakedBeforeDodge, windowBeforeDodge }.
export function detectBrakeThenDodge(decisions) {
  const out = [];
  for (const enc of groupEncounters(decisions)) {
    const btd = brakeThenDodgeOfEncounter(enc);
    if (btd) out.push(btd);
  }
  return out;
}

// ── Per-track report ────────────────────────────────────────────────────────────────────────────────
// races = [{ decisions:[...] }, ...] (one entry per race, each with its own per-race frame numbering).
// Folds through the same streaming accumulator the harness uses (bounded memory, one attribution source).
export function perTrackReport(trackId, isOpen, races) {
  const acc = emptyAccumulator();
  for (const rr of races ?? []) accumulateRace(acc, rr.decisions ?? []);
  const fin = finalizeAccumulator(acc);
  return {
    trackId,
    isOpen,
    nRaces: (races ?? []).length,
    summary: fin.summary,
    encounter: fin.encounter,
    brakeThenDodge: fin.brakeThenDodge,
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
  L.push('## A. Per pair-FRAME (TIME-WEIGHTED — NOT an encounter rate)');
  L.push('');
  L.push('> These shares count pair-FRAMES. A brake keeps the trailer same-lane for many frames (many records);');
  L.push('> a dodge leaves the same-lane filter at once (≈1 record). So braking is over-weighted by construction —');
  L.push('> read these as "share of braked time", never as "share of encounters". `windowEmpty` tests only whether');
  L.push('> the window EXISTS geometrically (`dTStart < dynamicBrakeT`), not whether it is wide enough to use — see');
  L.push('> `windowFrames` in section B for the usability measure.');
  L.push('');
  L.push('| Track | open | decisions | dodged | blockedRoom | blockedSlower | blockedNoFreeSide | blockedDrift | windowEmpty |');
  L.push('|---|---|---:|---:|---:|---:|---:|---:|---:|');
  const rowShares = (t) => {
    const s = t.summary;
    return `| ${t.trackId} | ${t.isOpen ? 'open' : 'closed'} | ${s.decisions} | ${fmtPct(s.shares.dodged)} | ${fmtPct(s.shares.blockedRoom)} | ${fmtPct(s.shares.blockedSlower)} | ${fmtPct(s.shares.blockedNoFreeSide)} | ${fmtPct(s.shares.blockedDrift)} | ${fmtPct(s.windowEmptyShare)} |`;
  };
  for (const t of perTrack) L.push(rowShares(t));
  L.push('');
  L.push('`blockedRoom` detail (per-frame): **noRoom/traffic** = split of blockedNoFreeSide; **roomShortfall** =');
  L.push('dTStart − dT for blockedRoom; **tLat** = steps to clear sideways.');
  L.push('');
  L.push('| Track | windowEmpty | noRoom | traffic | roomShortfall med / p90 | tLat med / p90 |');
  L.push('|---|---:|---:|---:|---:|---:|');
  for (const t of perTrack) {
    const s = t.summary;
    L.push(`| ${t.trackId} | ${s.windowEmpty} | ${s.noRoomOnTrack} | ${s.trafficBothSides} | ${fmtNum(s.roomShortfallMedian)} / ${fmtNum(s.roomShortfallP90)} | ${fmtNum(s.tLatMedian)} / ${fmtNum(s.tLatP90)} |`);
  }
  L.push('');
  L.push('## B. Per ENCOUNTER (one label each — THESE shares ARE comparable)');
  L.push('');
  L.push('> One label per same-pair contiguous run. **`noWindowEver`** (the headline) = the trailer never got a');
  L.push('> single frame with `dT > dTStart` — the pair became same-lane already too close, so the window was');
  L.push('> unreachable in practice. **`windowFrames`** = the empirical window WIDTH in frames for encounters that');
  L.push('> had one (median 1–2 ⇒ a technicality even where it exists). **`entryGap`** = dTStart − dT at the first');
  L.push('> frame (how far below the window the pair becomes same-lane; negative ⇒ entered inside it).');
  L.push('');
  L.push('| Track | encounters | dodged | noWindowEver | blockedSlower | blockedNoFreeSide | blockedDrift | windowFrames med / p90 | entryGap med / p90 |');
  L.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const t of perTrack) {
    const e = t.encounter;
    L.push(`| ${t.trackId} | ${e.encounters} | ${fmtPct(e.shares.dodged)} | ${fmtPct(e.shares.noWindowEver)} | ${fmtPct(e.shares.blockedSlower)} | ${fmtPct(e.shares.blockedNoFreeSide)} | ${fmtPct(e.shares.blockedDrift)} | ${fmtNum(e.windowFramesMedian)} / ${fmtNum(e.windowFramesP90)} | ${fmtNum(e.entryGapMedian)} / ${fmtNum(e.entryGapP90)} |`);
  }
  L.push('');
  L.push('## C. Smoking gun — brakeThenDodge and its causal cross-tab');
  L.push('');
  L.push('> **brakeThenDodge** = braked, then dodged the SAME leader with no traffic block in between (the Owner\'s');
  L.push('> complaint, counted per encounter). **noWindowBeforeDodge** = of those, the share that had NO usable');
  L.push('> window frame (`dT > dTStart`) before the first dodge — i.e. the BRAKE itself opened the gap the dodge');
  L.push('> then used. A high share is direct causal proof of the complaint.');
  L.push('');
  L.push('| Track | brakeThenDodge | median brakedFrames | noWindowBeforeDodge | share |');
  L.push('|---|---:|---:|---:|---:|');
  for (const t of perTrack) {
    const b = t.brakeThenDodge;
    L.push(`| ${t.trackId} | ${b.count} | ${fmtNum(b.medianBrakedFrames)} | ${b.noWindowBeforeDodge} | ${fmtPct(b.noWindowBeforeDodgeShare)} |`);
  }
  L.push('');
  L.push('## How to read it');
  L.push('- **High `noWindowEver` (section B)** ⇒ the pair becomes same-lane already too close; the window is unreachable in practice ⇒ the lever is looking EARLIER (zone / geometry), not lateral speed.');
  L.push('- **Low `noWindowEver` but low `dodged`** ⇒ the trailer HAD its chance and something else stopped it ⇒ the lever is `maxLateralSpeedPerStep` / the dTStart margins.');
  L.push('- **`windowFrames` median 1–2** ⇒ even where a window exists it is a technicality.');
  L.push('- **High `noWindowBeforeDodge` (section C)** ⇒ the brake bought the room the dodge needed — the complaint, proven.');
  L.push('- Section A shares are TIME-WEIGHTED and must not be compared as encounter rates (see the note there).');
  L.push('');
  return L.join('\n');
}
