// ============================================================
// report.mjs — INSTRUMENTS (observers). Read-only human-report generation.
// PURE MOVE (INFRA STEP 1) out of scripts/sim-fairness.mjs. The report text is produced
// from race RESULTS only; these functions never touch race state. The four run-config
// values buildReport needs (nRaces, nRacers, worldStamp, rowLayoutConfig) are passed in
// as arguments instead of read from module globals — the only change moving requires.
// ============================================================

function fmtPct(v) {
  return (v * 100).toFixed(1) + "%";
}
function fmtN(v, d = 2) {
  return v != null ? v.toFixed(d) : "—";
}
function sigLabel(p) {
  if (p < 0.001) return "*** (p<0.001)";
  if (p < 0.01) return "** (p<0.01)";
  if (p < 0.05) return "* (p<0.05)";
  return "n.s.";
}
// ── Diagnostic tables A-E (race-plan mode only) ───────────────────────────────
/**
 * Build Markdown tables A-E from rawData rows for one combo.
 * Only called when sollBereich is present (RACE_PLAN_ACTIVE).
 *
 * @param {object[]} rawRows  rawData filtered for one trackId x racerType x durationSec
 * @param {object[]} rowStats computeFairnessStats rowStats (for row count/expected)
 * @returns {string[]} markdown lines
 */
function buildDiagnosticTables(rawRows, rowStats) {
  if (!rawRows || rawRows.length === 0) return [];

  const lines = [];
  const nRacers = Math.max(...rawRows.map((r) => r.finalRank));
  const nRaces = new Set(rawRows.map((r) => `${r.seed}-${r.raceIdx}`)).size;

  // Row sizes: inferred from any single race's distribution
  const firstKey = rawRows[0].seed + "-" + rawRows[0].raceIdx;
  const firstRace = rawRows.filter(
    (r) => r.seed + "-" + r.raceIdx === firstKey,
  );
  const rowSizeMap = new Map();
  for (const r of firstRace)
    rowSizeMap.set(r.startRowIndex, (rowSizeMap.get(r.startRowIndex) ?? 0) + 1);
  const totalRows = Math.max(...rowSizeMap.keys()) + 1;
  const rowSizes = Array.from(
    { length: totalRows },
    (_, i) => rowSizeMap.get(i) ?? 0,
  );

  const bereichBounds = [
    [1, 5],
    [6, 15],
    [16, 25],
    [26, 40],
    [41, nRacers],
  ];
  const rankGroups = [
    { label: "1", lo: 1, hi: 1 },
    { label: "2", lo: 2, hi: 2 },
    { label: "3", lo: 3, hi: 3 },
    { label: "4", lo: 4, hi: 4 },
    { label: "5", lo: 5, hi: 5 },
    { label: "6–10", lo: 6, hi: 10 },
    { label: "11–15", lo: 11, hi: 15 },
    { label: "16–25", lo: 16, hi: 25 },
    { label: "26–40", lo: 26, hi: 40 },
    { label: `41–${nRacers}`, lo: 41, hi: nRacers },
  ];

  const p2 = (n, d) => (d > 0 ? ((n / d) * 100).toFixed(1) + "%" : "—");
  const cnt = (rows, lo, hi, key, val) =>
    rows.filter((r) => r.finalRank >= lo && r.finalRank <= hi && r[key] === val)
      .length;

  // ── Table A ─────────────────────────────────────────────────────────────────
  lines.push("");
  lines.push("#### A — Bereichstreue");
  lines.push("");
  lines.push("| target band | assigned | hits | rate |");
  lines.push("|---|---|---|---|");
  for (let b = 1; b <= 5; b++) {
    const [lo, hi] = bereichBounds[b - 1];
    const grp = rawRows.filter((r) => r.sollBereich === b);
    const hits = grp.filter(
      (r) => r.finalRank >= lo && r.finalRank <= hi,
    ).length;
    lines.push(
      `| B${b} (Pl. ${lo}–${hi}) | ${grp.length} | ${hits} | ${p2(hits, grp.length)} |`,
    );
  }

  // ── Table B.1 ───────────────────────────────────────────────────────────────
  const rowHdrs = rowStats.map(
    (rs) => `Row ${rs.rowIndex} (${rowSizes[rs.rowIndex] ?? "?"}R)`,
  );
  lines.push("");
  lines.push("#### B.1 — final-place groups x start row");
  lines.push("");
  lines.push(`| final place |  | total |`);
  lines.push(`|---|${rowHdrs.map(() => "---|").join("")}---|`);
  for (const g of rankGroups) {
    const total = rawRows.filter(
      (r) => r.finalRank >= g.lo && r.finalRank <= g.hi,
    ).length;
    const cols = rowStats.map((rs) => {
      const n = cnt(rawRows, g.lo, g.hi, "startRowIndex", rs.rowIndex);
      return `${n} (${p2(n, total)})`;
    });
    lines.push(`| ${g.label} | ${cols.join(" | ")} | ${total} |`);
  }
  const expRowHdr = rowStats
    .map((rs) => `${p2(rs.expectedWinRate * nRaces, nRaces)}`)
    .join(" | ");
  lines.push(`| *(erw. je Pl.1)* | ${expRowHdr} | — |`);

  // ── Table B.2 ───────────────────────────────────────────────────────────────
  lines.push("");
  lines.push("#### B.2 — final-place groups x target band");
  lines.push("");
  lines.push(
    "| final place | target B1 | target B2 | target B3 | target B4 | target B5 | total |",
  );
  lines.push("|---|---|---|---|---|---|---|");
  for (const g of rankGroups) {
    const total = rawRows.filter(
      (r) => r.finalRank >= g.lo && r.finalRank <= g.hi,
    ).length;
    const cols = [1, 2, 3, 4, 5].map((b) => {
      const n = cnt(rawRows, g.lo, g.hi, "sollBereich", b);
      return `${n} (${p2(n, total)})`;
    });
    lines.push(`| ${g.label} | ${cols.join(" | ")} | ${total} |`);
  }

  // ── Table C — B1 mismatch ───────────────────────────────────────────────────
  const b1Rows = rawRows.filter((r) => r.sollBereich === 1);
  const b1Total = b1Rows.length;
  lines.push("");
  lines.push(
    "#### C — target-band-1 mismatch (where do B1 racers land when they miss their target?)",
  );
  lines.push("");
  lines.push("| actually landed | count | share |");
  lines.push("|---|---|---|");
  const cBuckets = [
    { label: "places 1-5 — target met", lo: 1, hi: 5 },
    { label: "Pl. 6–10", lo: 6, hi: 10 },
    { label: "Pl. 11–15", lo: 11, hi: 15 },
    { label: "Pl. 16–25", lo: 16, hi: 25 },
    { label: "Pl. 26–40", lo: 26, hi: 40 },
    { label: `Pl. 41–${nRacers} ❌ schwerer Miss`, lo: 41, hi: nRacers },
  ];
  for (const b of cBuckets) {
    const n = b1Rows.filter(
      (r) => r.finalRank >= b.lo && r.finalRank <= b.hi,
    ).length;
    lines.push(`| ${b.label} | ${n} | ${p2(n, b1Total)} |`);
  }
  // Per-row hit rates for B1
  lines.push("");
  lines.push("B1 hit rate by start row:");
  lines.push("");
  const b1RowCols = rowStats.map((rs) => `Row ${rs.rowIndex}`).join(" | ");
  lines.push(`| Metrik | ${b1RowCols} |`);
  lines.push(`|---|${rowStats.map(() => "---|").join("")}`);
  const b1HitRow = rowStats
    .map((rs) => {
      const grp = b1Rows.filter((r) => r.startRowIndex === rs.rowIndex);
      const hits = grp.filter(
        (r) => r.finalRank >= 1 && r.finalRank <= 5,
      ).length;
      return `${hits}/${grp.length} (${p2(hits, grp.length)})`;
    })
    .join(" | ");
  const b1MissHeavyRow = rowStats
    .map((rs) => {
      const grp = b1Rows.filter((r) => r.startRowIndex === rs.rowIndex);
      const heavy = grp.filter((r) => r.finalRank >= 41).length;
      return `${heavy} (${p2(heavy, grp.length)})`;
    })
    .join(" | ");
  lines.push(`| Treffer (Pl. 1–5) | ${b1HitRow} |`);
  lines.push(`| Schwerer Miss (Pl. 41+) | ${b1MissHeavyRow} |`);

  // ── Table D — B5 brake leak ──────────────────────────────────────────────────
  const b5Rows = rawRows.filter((r) => r.sollBereich === 5);
  const b5Total = b5Rows.length;
  lines.push("");
  lines.push(
    "#### D — brake leak, target band 5 (row-0 diagnosis: escaping despite the brake?)",
  );
  lines.push("");
  lines.push("| actually landed | count | share |");
  lines.push("|---|---|---|");
  const dBuckets = [
    { label: `places 41-${nRacers} — target met`, lo: 41, hi: nRacers },
    { label: "Pl. 26–40", lo: 26, hi: 40 },
    { label: "Pl. 16–25", lo: 16, hi: 25 },
    { label: "Pl. 6–15", lo: 6, hi: 15 },
    { label: "places 1-5 — brake leak", lo: 1, hi: 5 },
  ];
  for (const b of dBuckets) {
    const n = b5Rows.filter(
      (r) => r.finalRank >= b.lo && r.finalRank <= b.hi,
    ).length;
    lines.push(`| ${b.label} | ${n} | ${p2(n, b5Total)} |`);
  }
  // Per-row escape-to-top-5 rate (the critical Row0 leak metric)
  lines.push("");
  lines.push("Brake leak, top 5, by start row:");
  lines.push("");
  lines.push(`| Metrik | ${b1RowCols} |`);
  lines.push(`|---|${rowStats.map(() => "---|").join("")}`);
  const b5LeakRow = rowStats
    .map((rs) => {
      const grp = b5Rows.filter((r) => r.startRowIndex === rs.rowIndex);
      const leaks = grp.filter((r) => r.finalRank <= 5).length;
      return `${leaks}/${grp.length} (${p2(leaks, grp.length)})`;
    })
    .join(" | ");
  lines.push(`| Top-5 trotz B5-Ziel | ${b5LeakRow} |`);

  return lines;
}

function fairLabel(p, rowStats) {
  if (p >= 0.05) return "FAIR";
  const row0Rate = rowStats[0]?.winRate ?? 0;
  const expected = rowStats[0]?.expectedWinRate ?? 1 / rowStats.length;
  if (row0Rate > expected + 0.05) return "⚠️ Front-Bias";
  if (row0Rate < expected - 0.05) return "⚠️ Rear-Bias";
  return "⚠️ Unequal";
}

function buildReport(
  allResults,
  rawData,
  runDate,
  nRaces,
  nRacers,
  worldStamp,
  rowLayoutConfig,
) {
  const lines = [];

  lines.push("# RaceArena — Fairness Simulation Report");
  lines.push("");
  lines.push(
    `**world:** ${worldStamp.worldHash} (schema v${worldStamp.schemaVersion})${worldStamp.provisional ? " — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)" : ""}  `,
  );
  lines.push(`**Datum:** ${runDate}  `);
  lines.push(`**Races per combination:** ${nRaces}  `);
  lines.push(`**Racers per race:** ${nRacers}  `);
  lines.push(`**Distanz-Varianten:** 30s / 120s  `);
  lines.push(
    `**Catch-Up (speedBonusFactor):** ${rowLayoutConfig.speedBonusFactor}  `,
  );
  lines.push(`**PRNG:** mulberry32, Seeds 1–${nRaces}  `);
  lines.push("");
  lines.push("---");
  lines.push("");

  // ── Overview table ──
  lines.push("## Overview — win rate per start row");
  lines.push("");
  lines.push(
    "Expected win rate under perfect fairness: **1 / number of rows**.  ",
  );
  lines.push(
    "Significance: chi-squared test, H0 = all rows equally likely.  ",
  );
  lines.push(
    "`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  ",
  );
  lines.push("");

  lines.push(
    "| track | racer | dist | rows | expected | " +
      "R0 win rate | R1 win rate | R2+ win rate | chi2 | p-value | verdict |",
  );
  lines.push(
    "|-------|-------|------|--------|---------|" +
      "-----------|------------|-------------|-----|--------|--------|",
  );

  const FAIR_THRESHOLD = 0.05;
  const unfairCombos = [];
  const fairCombos = [];

  for (const res of allResults) {
    const { trackId, trackName, racerType, durationSec, stats } = res;
    const { totalRows, rowStats, chiSq, pValue } = stats;
    const r0 = rowStats[0];
    const r1 = rowStats[1];
    const rRest = rowStats.slice(2);
    const restWinRate =
      rRest.length > 0
        ? rRest.reduce((s, r) => s + r.wins, 0) / (nRaces * rRest.length || 1)
        : "—";

    // Show R0 weighted expected in overview (uniform expected is the same for all rows when equal)
    const r0Expected = r0?.expectedWinRate ?? 1 / totalRows;
    const verdict = fairLabel(pValue, rowStats);
    lines.push(
      `| ${trackName} | ${racerType} | ${durationSec}s | ${totalRows} | ${fmtPct(r0Expected)} | ` +
        `${r0 ? fmtPct(r0.winRate) : "—"} | ` +
        `${r1 ? fmtPct(r1.winRate) : "—"} | ` +
        `${typeof restWinRate === "number" ? fmtPct(restWinRate) : restWinRate} | ` +
        `${fmtN(chiSq, 1)} | ${sigLabel(pValue)} | ${verdict} |`,
    );

    if (pValue < FAIR_THRESHOLD) unfairCombos.push(res);
    else fairCombos.push(res);
  }
  lines.push("");

  // ── Per-combination detail sections ──
  lines.push("---");
  lines.push("");
  lines.push("## Detail-Auswertung pro Kombination");
  lines.push("");

  for (const res of allResults) {
    const { trackId, trackName, racerType, durationSec, finishT, stats } = res;
    const { nRaces, totalRows, rowStats, chiSq, df, pValue } = stats;

    lines.push(`### ${trackName} × ${racerType} × ${durationSec}s`);
    lines.push("");
    lines.push(`- **finishT:** ${finishT.toFixed(4)} (Ziellinie in t-Raum)`);
    lines.push(
      `- **Rows:** ${totalRows} (expectation weighted by row size)`,
    );
    lines.push(`- **Chi²(${df}):** ${fmtN(chiSq, 2)} — ${sigLabel(pValue)}`);
    lines.push("");

    lines.push(
      "| row | wins | win rate | expected (wtd) | delta expected | mean rank | sd rank |",
    );
    lines.push(
      "|-------|-------|----------|-----------------|------------|--------|--------|",
    );
    for (const rs of rowStats) {
      const delta = rs.winRate - rs.expectedWinRate;
      const sign = delta >= 0 ? "+" : "";
      lines.push(
        `| Row ${rs.rowIndex} | ${rs.wins} | ${fmtPct(rs.winRate)} | ${fmtPct(rs.expectedWinRate)} | ` +
          `${sign}${fmtPct(delta)} | ${fmtN(rs.avgRank, 1)} | ${fmtN(rs.stdRank, 1)} |`,
      );
    }
    lines.push("");

    // Diagnostic tables A-E (only when race-plan sollBereich data is available)
    const comboRaw = rawData
      ? rawData.filter(
          (r) =>
            r.trackId === trackId &&
            r.racerType === racerType &&
            r.durationSec === durationSec &&
            r.sollBereich != null,
        )
      : [];
    if (comboRaw.length > 0) {
      lines.push("");
      lines.push("#### E — 1.5x gate aggregate (weighted)");
      lines.push("");
      const gateRows = rowStats.filter(
        (rs) => rs.expectedWinRate * nRaces >= 3,
      );
      const gatePass = gateRows.every(
        (rs) =>
          rs.winRate >= rs.expectedWinRate / 1.5 &&
          rs.winRate <= rs.expectedWinRate * 1.5,
      );
      lines.push(
        `Gate-Status: **${gatePass ? "✅ PASS" : "❌ FAIL"}** | χ²(${df}) = ${fmtN(chiSq, 2)} | ${sigLabel(pValue)}`,
      );
      lines.push("");
      lines.push(...buildDiagnosticTables(comboRaw, rowStats));
      lines.push("");
    }
  }

  // ── Mixing-Quote (nur Open Tracks) ──
  const openResults = allResults.filter(
    (r) => r.isOpen && r.avgMixingQuota != null,
  );
  if (openResults.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)");
    lines.push("");
    lines.push(
      "Share of row-1 racers that have overtaken at least one row-0 racer " +
        "in t-space by the time `avoidanceWarmupMs` expires. Target range: **60-95%**.",
    );
    lines.push("");
    lines.push("| Track | Racer | Dist | Mixing-Quote | Bewertung |");
    lines.push("|-------|-------|------|-------------|-----------|");
    for (const res of openResults) {
      const q = res.avgMixingQuota;
      const pct = fmtPct(q);
      const label =
        q < 0.6
          ? "⚠️ Zu wenig Mixing"
          : q > 0.95
            ? "⚠️ Zu viel Mixing"
            : "✅ OK";
      lines.push(
        `| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${pct} | ${label} |`,
      );
    }
    lines.push("");
  }

  // ── overall evaluation ──
  lines.push("---");
  lines.push("");
  lines.push("## Overall evaluation");
  lines.push("");
  lines.push(`**Getestete Kombinationen:** ${allResults.length}  `);
  lines.push(`**Davon statistisch fair (p≥0.05):** ${fairCombos.length}  `);
  lines.push(`**Davon statistisch unfair (p<0.05):** ${unfairCombos.length}  `);
  lines.push("");

  if (unfairCombos.length === 0) {
    lines.push(
      "**Finding:** no combination shows statistically significant unfairness.",
    );
  } else {
    lines.push(
      "**Kombinationen mit signifikantem Ungleichgewicht (p < 0.05):**",
    );
    lines.push("");
    for (const res of unfairCombos) {
      const { trackName, racerType, durationSec, stats } = res;
      const { rowStats, pValue } = stats;
      const r0Rate = rowStats[0]?.winRate ?? 0;
      const expRate = rowStats[0]?.expectedWinRate ?? 1 / rowStats.length;
      const bias =
        r0Rate > expRate
          ? `Row 0 zu oft (${fmtPct(r0Rate)} statt erw. ${fmtPct(expRate)})`
          : r0Rate < expRate
            ? `Row 0 zu selten (${fmtPct(r0Rate)} statt erw. ${fmtPct(expRate)})`
            : "middle rows favoured";
      lines.push(
        `- **${trackName} × ${racerType} × ${durationSec}s:** ${bias} — ${sigLabel(pValue)}`,
      );
    }
  }
  lines.push("");

  // ── Empfehlung ──
  lines.push("---");
  lines.push("");
  lines.push("## Empfehlung");
  lines.push("");

  // Analyze patterns
  const frontBias = unfairCombos.filter((r) => {
    const rs = r.stats.rowStats;
    const exp = rs[0]?.expectedWinRate ?? 1 / rs.length;
    return (rs[0]?.winRate ?? 0) > exp + 0.05;
  });
  const rearBias = unfairCombos.filter((r) => {
    const rs = r.stats.rowStats;
    const exp = rs[0]?.expectedWinRate ?? 1 / rs.length;
    return (rs[0]?.winRate ?? 0) < exp - 0.05;
  });
  const shortUnfair = unfairCombos.filter((r) => r.durationSec === 30);
  const longUnfair = unfairCombos.filter((r) => r.durationSec === 120);

  lines.push("### Front-Row-Vorteil (Row 0 gewinnt zu oft)");
  if (frontBias.length === 0) {
    lines.push(
      "No combination shows a statistically significant front-row advantage.",
    );
  } else {
    for (const r of frontBias) {
      lines.push(
        `- **${r.trackName} × ${r.racerType} × ${r.durationSec}s** — ${sigLabel(r.stats.pValue)}`,
      );
    }
  }
  lines.push("");

  lines.push(
    "### Back-row disadvantage (row 0 wins too rarely / catch-up overcompensates)",
  );
  if (rearBias.length === 0) {
    lines.push(
      "No combination shows a back-row disadvantage or overcompensation.",
    );
  } else {
    for (const r of rearBias) {
      lines.push(
        `- **${r.trackName} × ${r.racerType} × ${r.durationSec}s** — ${sigLabel(r.stats.pValue)}`,
      );
    }
  }
  lines.push("");

  lines.push("### Catch-Up-Mechanismus (speedBonusFactor = 1.0)");
  if (unfairCombos.length === 0) {
    lines.push(
      "The catch-up mechanism works adequately on every track and racer type tested. " +
        "No statistically significant row bias is detectable.",
    );
  } else {
    if (shortUnfair.length > longUnfair.length) {
      lines.push(
        `Unfairness occurs more often in **short races (30s)** (${shortUnfair.length}/${unfairCombos.length} unfair combos). ` +
          "The catch-up mechanism needs race duration to act — in very short races its compensating effect is limited.",
      );
    } else if (longUnfair.length > shortUnfair.length) {
      lines.push(
        `Unfairness occurs more often in **long races (120s)** (${longUnfair.length}/${unfairCombos.length} unfair combos). ` +
          "That points to accumulating effects that unbalance the bonus over the long run.",
      );
    } else {
      lines.push(
        `Unfairness is spread evenly across short and long races ` +
          `(${shortUnfair.length} × 30s, ${longUnfair.length} × 120s).`,
      );
    }
  }
  lines.push("");
  lines.push(
    "*Note: this section contains statistical judgements only, not code recommendations.*",
  );
  lines.push("");

  // ── Phase-3A: Naturalness section (Open Tracks only) ──
  const openWithNat = allResults.filter((r) => r.isOpen && r.avgNaturalness);
  if (openWithNat.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Phase-3A — Naturalness-Metriken (Open Tracks)");
    lines.push("");
    lines.push(
      "Stabile Phase: 25%–95% der targetDuration. " +
        "Jerk: |Δ(effSpeed)/DT| / max(baseSpeed, ε). " +
        "naturalOvt: share of overtakes with tDiff <= 30% of the reference gap.",
    );
    lines.push("");
    lines.push(
      "| Track | Racer | Dist | meanJerk | maxJerk | jerkHigh% | natOvt% | pulkTime% | pulkTrigIn | pulkTrigOut |",
    );
    lines.push(
      "|-------|-------|------|----------|---------|-----------|---------|-----------|-----------|-------------|",
    );
    for (const res of openWithNat) {
      const n = res.avgNaturalness;
      lines.push(
        `| ${res.trackName} | ${res.racerType} | ${res.durationSec}s` +
          ` | ${n.meanJerk.toFixed(4)} | ${n.maxJerkSpike.toFixed(4)}` +
          ` | ${(n.jerkFraction_high * 100).toFixed(1)}%` +
          ` | ${(n.naturalOvertakeFraction * 100).toFixed(1)}%` +
          ` | ${(n.pulkTimeFraction * 100).toFixed(1)}%` +
          ` | ${n.pulkTriggersInWindow.toFixed(2)}` +
          ` | ${n.pulkTriggersOutOfWindow.toFixed(2)} |`,
      );
    }
    lines.push("");
  }

  // ── Lateral Quality Metrics (all tracks) ──
  const withLateralQ = allResults.filter(
    (r) => r.avgNaturalness && r.avgNaturalness.overlapRate != null,
  );
  if (withLateralQ.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Lateral Quality Metrics");
    lines.push("");
    lines.push(
      "overlapRate: % of active pair-frames with |dT|<10%·bodyH/pathLen AND |dY|<10%·bodyW/trackW (old center-proximity metric).  \n" +
        "honestOverlapRate: % of pair-frames where rendered body boxes actually overlap — full body extents, all pairs, open+closed (NEW).  \n" +
        "overlapResolution: avg consecutive frames a pair stays in overlap before separating.  \n" +
        "zigzagScore: avg |physicalYVelocity change| per racer-frame (after 4s) — target < 0.003.  \n" +
        "lateralSpeedScore: avg |physicalYVelocity| per racer-frame (after 4s) — lower = smoother.  \n" +
        "brakeRate: fraction of racer-frames where speed-brake is active (after 4s) — lower = less blockage.  \n" +
        "stableOvertakes: confirmed lead-swaps (≥3s) per racer in 20%–80% of race — higher = more action.",
    );
    lines.push("");
    lines.push(
      "| Track | Racer | Dist | N | overlapRate% | honestOverlap% | gap | overlapResolution (fr) | zigzagScore |",
    );
    lines.push(
      "|-------|-------|------|---|-------------|----------------|-----|------------------------|-------------|",
    );
    for (const res of withLateralQ) {
      const n = res.avgNaturalness;
      const zigzagLabel = (n.zigzagScore ?? 0) < 0.005 ? "✅" : "⚠️";
      const oldOvl = (n.overlapRate ?? 0) * 100;
      const newOvl = (n.honestOverlapRate ?? 0) * 100;
      const gapOvl = newOvl - oldOvl;
      const honestLabel = newOvl > 0.5 ? " ⚠️" : "";
      lines.push(
        `| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${res.nRacers ?? "—"}` +
          ` | ${oldOvl.toFixed(1)}%` +
          ` | ${newOvl.toFixed(1)}%${honestLabel}` +
          ` | +${gapOvl.toFixed(1)}%` +
          ` | ${(n.overlapResolutionFrames ?? 0).toFixed(1)}` +
          ` | ${(n.zigzagScore ?? 0).toFixed(6)} ${zigzagLabel} |`,
      );
    }
    lines.push("");

    // Fair-chance placement table (Step 1, only when race plan data is present)
    // Fair-chance placement — aggregate + per-row (all combos with race-plan data)
    const withFairChance = allResults.filter(
      (r) => (r.avgNaturalness?.fairChanceB1Count ?? 0) > 0,
    );
    if (withFairChance.length > 0) {
      lines.push("---");
      lines.push("");
      lines.push("## Fair-Chance Placement (B1 target ranks 1–5)");
      lines.push("");
      lines.push(
        "B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  \n" +
          "B1top5: fraction finishing anywhere in top 5.  \n" +
          "Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.",
      );
      lines.push("");
      lines.push("### Aggregate (all B1 racers, across all races)");
      lines.push("");
      lines.push("| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |");
      lines.push("|-------|-------|------|---|----------|---------|------|");
      for (const res of withFairChance) {
        const fc = res.avgNaturalness;
        const exact = (fc.fairChanceExactRate ?? 0) * 100;
        const top5 = (fc.fairChanceTop5Rate ?? 0) * 100;
        const gap = top5 - exact;
        lines.push(
          `| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${res.nRacers ?? "—"}` +
            ` | ${exact.toFixed(1)}% | ${top5.toFixed(1)}% | ${gap.toFixed(1)}% |`,
        );
      }
      lines.push("");

      // Per-row breakdown: for each combo that has row data, emit a separate table
      const withRowData = withFairChance.filter(
        (r) => (r.avgNaturalness?.fairChanceByRow?.length ?? 0) > 1,
      );
      if (withRowData.length > 0) {
        lines.push("### Per-Starting-Row Breakdown");
        lines.push("");
        lines.push(
          "Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  \n" +
            "n = total B1-racer appearances from that row across all 10 races.  \n" +
            "exact% and top5% are the hit rates for that starting row only.",
        );
        lines.push("");
        // Collect all row indices seen across all combos for the header
        const allRowIdxs = [
          ...new Set(
            withRowData.flatMap((r) =>
              r.avgNaturalness.fairChanceByRow.map((rd) => rd.row),
            ),
          ),
        ].sort((a, b) => a - b);
        const rowHdrs = allRowIdxs.flatMap((ri) => [
          `R${ri} exact%`,
          `R${ri} top5%`,
          `R${ri} n`,
        ]);
        lines.push(`| Track | Racer | Dist | ${rowHdrs.join(" | ")} |`);
        lines.push(
          `|-------|-------|------|${allRowIdxs.map(() => "---|---|---").join("")}|`,
        );
        for (const res of withRowData) {
          const rowMap = new Map(
            res.avgNaturalness.fairChanceByRow.map((rd) => [rd.row, rd]),
          );
          const cells = allRowIdxs.flatMap((ri) => {
            const rd = rowMap.get(ri);
            if (!rd) return ["—", "—", "0"];
            return [
              rd.exactRate != null
                ? (rd.exactRate * 100).toFixed(0) + "%"
                : "—",
              rd.top5Rate != null ? (rd.top5Rate * 100).toFixed(0) + "%" : "—",
              String(rd.b1Count),
            ];
          });
          lines.push(
            `| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${cells.join(" | ")} |`,
          );
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

// ── Diagnostic printer ───────────────────────────────────────────────────────
function printDiagnosticReport(
  diagSnapshots,
  trackName,
  racerType,
  durationSec,
  seed,
) {
  const lines = [];
  lines.push(`\n${"=".repeat(70)}`);
  lines.push(`Phase-2K v4 — Frame-by-Frame Diagnostic`);
  lines.push(
    `Track: ${trackName} | Racer: ${racerType} | Duration: ${durationSec}s | Seed: ${seed}`,
  );
  lines.push("=".repeat(70));

  for (const snap of diagSnapshots) {
    lines.push(
      `\n── Snapshot t=${snap.timeS.toFixed(3)}s (actual: ${snap.actualTimeMs.toFixed(0)}ms) ──`,
    );
    // Interval stats
    lines.push(
      `   Interval: ${snap.interval.lateralPushes} lateral pushes | ` +
        `${snap.interval.brakeActivations} brake activations`,
    );
    // Per-row summary
    const rows = new Map();
    for (const r of snap.racers) {
      if (!rows.has(r.row)) rows.set(r.row, []);
      rows.get(r.row).push(r);
    }
    for (const [rowIdx, racersInRow] of [...rows.entries()].sort(
      (a, b) => a[0] - b[0],
    )) {
      const ts = racersInRow.map((r) => r.t);
      const avd = racersInRow.filter((r) => r.avoidance).length;
      const v4Mults = racersInRow.map((r) => r.v4Mult).filter((m) => m !== 1.0);
      const v4Str =
        v4Mults.length > 0 ? ` | v4Mult=${v4Mults[0].toFixed(4)}` : "";
      lines.push(
        `   Row ${rowIdx} (${racersInRow.length} racers): ` +
          `t=[${Math.min(...ts).toFixed(4)}, ${Math.max(...ts).toFixed(4)}]` +
          `${v4Str} | avoidance: ${avd}/${racersInRow.length}`,
      );
    }
    // Brake-zone pairs grouped by row combination
    const bz = snap.brakeZonePairs;
    if (bz.length === 0) {
      lines.push(`   Brake-zone pairs (dT<0.015 AND |dY|<0.2): 0`);
    } else {
      const rowComboCount = new Map();
      for (const p of bz) {
        const key = `R${p.followerRow}→R${p.leaderRow}`;
        rowComboCount.set(key, (rowComboCount.get(key) ?? 0) + 1);
      }
      const comboStr = [...rowComboCount.entries()]
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`   Brake-zone pairs: ${bz.length} (${comboStr})`);
      // Show top 5 by dT (smallest gap = most likely to brake)
      const top = [...bz].sort((a, b) => a.dT - b.dT).slice(0, 5);
      for (const p of top) {
        lines.push(
          `     R${p.follower}(Row${p.followerRow}) → R${p.leader}(Row${p.leaderRow})  dT=${p.dT.toFixed(5)}  dY=${p.dY.toFixed(4)}`,
        );
      }
    }
    // Close pairs (|dT|<0.005 AND |dY|<0.3)
    const cp = snap.closePairs;
    if (cp.length === 0) {
      lines.push(`   Close pairs (|dT|<0.005 AND |dY|<0.3): 0`);
    } else {
      lines.push(`   Close pairs: ${cp.length}`);
      for (const p of cp.slice(0, 5)) {
        lines.push(
          `     R${p.a}(Row${p.aRow}) ↔ R${p.b}(Row${p.bRow})  dT=${p.dT.toFixed(5)}  dY=${p.dY.toFixed(4)}`,
        );
      }
    }
  }
  lines.push("");
  return lines.join("\n");
}

// ── Phase-3B: COMEBACK analysis report ────────────────────────────────────────
function printComebackReport(
  raceResults,
  { trackName, racerType, durationSec, minPositions, windowSec, endgameThresh },
) {
  const diags = raceResults.map((r) => r.comebackDiag).filter(Boolean);
  if (diags.length === 0) return;

  console.log(`\n${"═".repeat(70)}`);
  console.log(
    `Phase-3B — COMEBACK Analyse: ${trackName} × ${racerType} × ${durationSec}s`,
  );
  console.log(
    `  Bedingung: OUTCOME-Phase + ≥${minPositions} Plätze in ${windowSec}s  |  Endgame: >${(endgameThresh * 100).toFixed(0)}% finishT`,
  );
  console.log("═".repeat(70));

  for (let i = 0; i < raceResults.length; i++) {
    const d = diags[i];
    const seed = raceResults[i]._seed ?? i + 1;
    const outStart =
      d.outcomeStartS != null ? d.outcomeStartS.toFixed(1) + "s" : "—";
    const outEnd =
      d.outcomeEndS != null
        ? d.outcomeEndS.toFixed(1) + "s"
        : `>${durationSec}s`;
    const egStr =
      d.endgameStartS != null ? d.endgameStartS.toFixed(1) + "s" : "nie";
    console.log(`\nSeed ${seed}:`);
    console.log(
      `  OUTCOME:           ${outStart} – ${outEnd}  (${d.outcomeDurS.toFixed(1)}s)`,
    );
    console.log(
      `  Endgame (>${(endgameThresh * 100).toFixed(0)}%): ${egStr}  → effektives Fenster: ${d.effectiveDurS.toFixed(1)}s`,
    );
    console.log(`  COMEBACK-Trigger:  ${d.triggerCount}`);
    for (const t of d.triggers) {
      console.log(
        `    t=${t.ts.toFixed(1)}s  ${t.name.padEnd(6)}  +${t.gain} Plätze`,
      );
    }
    if (d.allMaxGains.length > 0) {
      const mn = Math.min(...d.allMaxGains);
      const mx = Math.max(...d.allMaxGains);
      const av =
        d.allMaxGains.reduce((s, v) => s + v, 0) / d.allMaxGains.length;
      console.log(
        `  Max-Platzgewinn B1 (${windowSec}s-Fenster): min=${mn}  max=${mx}  avg=${av.toFixed(1)}`,
      );
    } else {
      console.log(`  Max-Platzgewinn B1: keine Daten`);
    }
  }

  // Aggregate
  if (diags.length > 1) {
    console.log(`\n── aggregate (${diags.length} races) ──`);
    const avgOutDur =
      diags.reduce((s, d) => s + d.outcomeDurS, 0) / diags.length;
    const avgEffDur =
      diags.reduce((s, d) => s + d.effectiveDurS, 0) / diags.length;
    const avgTriggers =
      diags.reduce((s, d) => s + d.triggerCount, 0) / diags.length;
    const zeroTrig = diags.filter((d) => d.triggerCount === 0).length;
    const allMaxGains = diags.flatMap((d) => d.allMaxGains);
    console.log(`  OUTCOME Dauer:       Ø ${avgOutDur.toFixed(1)}s`);
    console.log(`  Effektives Fenster:  Ø ${avgEffDur.toFixed(1)}s`);
    console.log(
      `  COMEBACK triggers:   mean ${avgTriggers.toFixed(1)}/race  (${zeroTrig}/${diags.length} with none)`,
    );
    if (allMaxGains.length > 0) {
      const mn = Math.min(...allMaxGains);
      const mx = Math.max(...allMaxGains);
      const av = allMaxGains.reduce((s, v) => s + v, 0) / allMaxGains.length;
      const n1 = allMaxGains.filter((g) => g >= 1).length;
      const n2 = allMaxGains.filter((g) => g >= 2).length;
      const n3 = allMaxGains.filter((g) => g >= 3).length;
      const tot = allMaxGains.length;
      console.log(
        `  Max places gained B1: min=${mn}  max=${mx}  avg=${av.toFixed(1)}  (${tot} racer-races)`,
      );
      console.log(
        `  Davon ≥1 Platz: ${n1}/${tot} (${((n1 / tot) * 100).toFixed(0)}%)`,
      );
      console.log(
        `  Davon ≥2 Plätze: ${n2}/${tot} (${((n2 / tot) * 100).toFixed(0)}%)`,
      );
      console.log(
        `  Davon ≥3 Plätze: ${n3}/${tot} (${((n3 / tot) * 100).toFixed(0)}%)`,
      );
      // Slider recommendations
      console.log(`\n── Slider-Empfehlungen ──`);
      const rec = n3 / tot >= 0.3 ? 3 : n2 / tot >= 0.3 ? 2 : 1;
      console.log(
        `  comebackMinPositionsGained: empfohlen ${rec} (≥30%-Schwelle)`,
      );
      if (avgEffDur < 8 && windowSec > 3) {
        console.log(
          `  comebackWindowSec: ggf. auf ≤${Math.max(2, Math.floor(avgEffDur / 2))}s senken (effektives Fenster nur ${avgEffDur.toFixed(1)}s)`,
        );
      } else {
        console.log(
          `  comebackWindowSec: ${windowSec}s passt (effektives Fenster ${avgEffDur.toFixed(1)}s)`,
        );
      }
      if (avgTriggers < 0.5) {
        console.log(
          `  ⚠️  Sehr wenige Trigger (Ø ${avgTriggers.toFixed(1)}) — minPositionsGained auf ${rec} oder Fenster vergrößern`,
        );
      } else {
        console.log(
          `  OK: mean ${avgTriggers.toFixed(1)} triggers/race — the COMEBACK event will fire`,
        );
      }
    }
  }
  console.log("");
}

export { buildReport, printDiagnosticReport, printComebackReport, fmtPct };
