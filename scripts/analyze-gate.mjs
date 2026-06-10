// ============================================================
// File:        analyze-gate.mjs
// Path:        scripts/analyze-gate.mjs
// Project:     RaceArena
// Created:     2026-05-20
// Description: Re-evaluates existing sim runs with weighted gate calibration
//              using chi-square p-value scoring; reads from client/tmp/.
// ============================================================

// analyze-gate.mjs — Re-evaluate existing sim runs with weighted gate calibration
// Usage: node scripts/analyze-gate.mjs

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadRaw(dir) {
  const path = join(ROOT, 'client/tmp', dir, 'fairness-data.json');
  return JSON.parse(readFileSync(path, 'utf8')).rawData;
}

function chiSqPValue(x, k) {
  if (k <= 0 || x < 0) return 1;
  const mu  = 1 - 2 / (9 * k);
  const sig = Math.sqrt(2 / (9 * k));
  const z   = ((x / k) ** (1 / 3) - mu) / sig;
  const t   = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const phi = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
  const cdf = z >= 0 ? phi : 1 - phi;
  return 1 - cdf;
}

function padR(s, n) { return String(s).padEnd(n); }
function padL(s, n) { return String(s).padStart(n); }
function pct(v)     { return (v * 100).toFixed(1) + '%'; }
function sigLabel(p) {
  if (p < 0.001) return 'p<0.001 ***';
  if (p < 0.01)  return 'p<0.01  **';
  if (p < 0.05)  return 'p<0.05  *';
  return `p=${p.toFixed(3)} n.s.`;
}

function evaluateRun(label, rawData, durationSec) {
  const rows = rawData.filter((r) => r.durationSec === durationSec);
  if (rows.length === 0) {
    console.log(`\n[${label} ${durationSec}s] Keine Daten — übersprungen.`);
    return null;
  }

  // Determine row sizes from any single race (all races have the same layout)
  const raceIdx0Rows = rows.filter((r) => r.raceIdx === rows[0].raceIdx);
  const rowSizeMap = new Map();
  for (const r of raceIdx0Rows) {
    rowSizeMap.set(r.startRowIndex, (rowSizeMap.get(r.startRowIndex) ?? 0) + 1);
  }
  const totalRows    = Math.max(...rowSizeMap.keys()) + 1;
  const rowSizes     = Array.from({ length: totalRows }, (_, i) => rowSizeMap.get(i) ?? 0);
  const totalRacers  = rowSizes.reduce((s, v) => s + v, 0);

  // Group by raceIdx to find winners
  const raceGroups = new Map();
  for (const r of rows) {
    if (!raceGroups.has(r.raceIdx)) raceGroups.set(r.raceIdx, []);
    raceGroups.get(r.raceIdx).push(r);
  }
  const nRaces = raceGroups.size;

  const winsByRow = new Array(totalRows).fill(0);
  for (const race of raceGroups.values()) {
    const winner = race.reduce((best, r) => (r.finalRank < best.finalRank ? r : best));
    if (winner.startRowIndex < totalRows) winsByRow[winner.startRowIndex]++;
  }

  // Weighted expected wins per row
  const expectedWins     = rowSizes.map((s) => nRaces * s / totalRacers);
  const expectedWinRates = rowSizes.map((s) => s / totalRacers);

  // Weighted chi-square
  const chiSq  = winsByRow.reduce((s, obs, i) => expectedWins[i] > 0 ? s + (obs - expectedWins[i]) ** 2 / expectedWins[i] : s, 0);
  const df     = totalRows - 1;
  const pValue = chiSqPValue(chiSq, df);

  // 1.5× gate (rows with expectedWins < 3 excluded — too small for N=50 gate check)
  const gateResults = winsByRow.map((wins, i) => {
    const rate   = wins / nRaces;
    const expRate = expectedWinRates[i];
    const expWins = nRaces * expRate;
    const skip   = expWins < 3;
    const pass   = skip || (rate >= expRate / 1.5 && rate <= expRate * 1.5);
    return { rowIndex: i, wins, rate, expRate, expWins, pass, skip };
  });
  const gatePass = gateResults.filter((g) => !g.skip).every((g) => g.pass);

  // Print
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`LAUF: ${label} | ${durationSec}s | ${nRaces} Rennen × ${totalRacers} Racer (${rowSizes.join('+')}-Verteilung)`);
  console.log('═'.repeat(72));
  console.log(padR('Reihe', 8) + padL('Erw.(gew.)', 14) + padL('Beobachtet', 14) + padL('Siege', 8) + padL('Gate?', 10) + padL('χ²-Beitrag', 12));
  console.log('─'.repeat(66));

  let chiTotal = 0;
  for (const g of gateResults) {
    const contrib = expectedWins[g.rowIndex] > 0
      ? ((g.wins - expectedWins[g.rowIndex]) ** 2 / expectedWins[g.rowIndex])
      : 0;
    chiTotal += contrib;
    const gateLabel = g.skip ? '—(skip)' : (g.pass ? '✅' : '❌');
    console.log(
      padR(`Row ${g.rowIndex}`, 8) +
      padL(pct(g.expRate), 14) +
      padL(pct(g.rate), 14) +
      padL(g.wins, 8) +
      padL(gateLabel, 10) +
      padL(contrib.toFixed(2), 12)
    );
  }
  console.log('─'.repeat(66));
  console.log(
    padR('Gesamt', 8) +
    padL('100.0%', 14) +
    padL('100.0%', 14) +
    padL(nRaces, 8) +
    padL(gatePass ? '✅ PASS' : '❌ FAIL', 10) +
    padL(chiTotal.toFixed(2), 12)
  );
  console.log(`χ²(${df}) = ${chiSq.toFixed(2)}  —  ${sigLabel(pValue)}  —  1.5×-Gate: ${gatePass ? '✅ PASS' : '❌ FAIL'}`);

  return { label, durationSec, pValue, gatePass, chiSq };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const datasets = [
  { label: 'T1', dir: 'tune1-s1' },
  { label: 'T2', dir: 'tune1-s2' },
  { label: 'T3', dir: 'tune1-s3' },
];

const summary = [];
for (const { label, dir } of datasets) {
  let rawData;
  try {
    rawData = loadRaw(dir);
  } catch (e) {
    console.log(`\n[${label}] Daten nicht verfügbar: ${e.message}`);
    continue;
  }
  for (const dur of [30, 120]) {
    const result = evaluateRun(label, rawData, dur);
    if (result) summary.push(result);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(72)}`);
console.log('ZUSAMMENFASSUNG — Gewichtetes Gate');
console.log('═'.repeat(72));
console.log(padR('Lauf', 16) + padL('p-Wert', 14) + padL('χ² fair?', 12) + padL('1.5×-Gate', 12));
console.log('─'.repeat(54));
for (const r of summary) {
  const fairLabel = r.pValue >= 0.05 ? '✅ fair' : '❌ unfair';
  console.log(
    padR(`${r.label} × ${r.durationSec}s`, 16) +
    padL(r.pValue.toFixed(3), 14) +
    padL(fairLabel, 12) +
    padL(r.gatePass ? '✅ PASS' : '❌ FAIL', 12)
  );
}
console.log('─'.repeat(54));

// ── Aggregate: 120s runs across all seeds ─────────────────────────────────────
const runs120 = summary.filter((r) => r.durationSec === 120);
if (runs120.length >= 2) {
  console.log(`\n── Aggregat: 120s (${runs120.length} Seeds) ──`);
  const allPass120 = runs120.every((r) => r.pValue >= 0.05 && r.gatePass);
  const passCount  = runs120.filter((r) => r.pValue >= 0.05 && r.gatePass).length;
  console.log(`Bestanden: ${passCount}/${runs120.length}`);
  console.log(`3A Sim-Erfolg: ${allPass120 ? '✅ JA — alle 120s Seeds bestehen χ²+Gate' : `❌ NEIN — ${runs120.length - passCount} Seed(s) nicht bestanden`}`);
}

const allPass = summary.every((r) => r.pValue >= 0.05 && r.gatePass);
console.log(`\nGesamturteil (alle Läufe inkl. 30s): ${allPass ? '✅ Alle bestanden' : '⚠️ Mindestens ein Lauf nicht bestanden'}`);
