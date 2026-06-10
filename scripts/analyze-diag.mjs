// ============================================================
// File:        analyze-diag.mjs
// Path:        scripts/analyze-diag.mjs
// Project:     RaceArena
// Created:     2026-05-20
// Description: Phase 3A M2v2 target-vs-actual zone analysis; reads
//              fairness-data.json from client/tmp/ and compares distributions.
// ============================================================

// analyze-diag.mjs — Soll-vs-Ist analysis for Phase 3A M2v2 diagnostic
// Usage: node scripts/analyze-diag.mjs

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadRawData(dir) {
  const path = join(ROOT, 'client/tmp', dir, 'fairness-data.json');
  const d = JSON.parse(readFileSync(path, 'utf8'));
  return d.rawData;
}

function bereichBounds(b) {
  if (b === 1) return [1, 5];
  if (b === 2) return [6, 15];
  if (b === 3) return [16, 25];
  if (b === 4) return [26, 40];
  return [41, Infinity];
}

function fmt(n, total) {
  return `${n}/${total} (${((n / total) * 100).toFixed(1)}%)`;
}

function padR(s, n) { return String(s).padEnd(n); }
function padL(s, n) { return String(s).padStart(n); }

function analyzeRun(label, rawData, durationSec) {
  const rows = rawData.filter(r => r.durationSec === durationSec);
  const nRaces = new Set(rows.map(r => r.raceIdx)).size;
  const nRacers = new Set(rows.map(r => r.racerIndex)).size;

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`LAUF: ${label} | ${durationSec}s | ${nRaces} Rennen × ${nRacers} Racer`);
  console.log('═'.repeat(72));

  // ── Tabelle 1: Top-5 Endplätze nach Start-Reihe ───────────────────────────
  console.log('\n── Tabelle 1: Top-5 Endplätze nach Start-Reihe ──');
  console.log(padR('Platz', 8) + [0,1,2,3,4].map(r => padL(`Row ${r}`, 10)).join('') + padL('Summe', 10));
  console.log('─'.repeat(58));
  let top5Total = [0,0,0,0,0];
  for (let rank = 1; rank <= 5; rank++) {
    const atRank = rows.filter(r => r.finalRank === rank);
    const counts = [0,1,2,3,4].map(row => atRank.filter(r => r.startRowIndex === row).length);
    top5Total = top5Total.map((t, i) => t + counts[i]);
    const sum = counts.reduce((a,b) => a+b, 0);
    console.log(padR(`Platz ${rank}`, 8) + counts.map(c => padL(c, 10)).join('') + padL(sum, 10));
  }
  const expected5 = nRaces; // 50 top-5 slots per rank × 5 ranks = 250; per row expected = 250/5 = 50
  console.log('─'.repeat(58));
  console.log(padR('Summe', 8) + top5Total.map(t => padL(t, 10)).join('') + padL(top5Total.reduce((a,b)=>a+b,0), 10));
  console.log(`(Erwartung bei Gleichverteilung: ${expected5} pro Reihe)`);

  // ── Tabelle 2: Soll-Bereich Erfüllungsrate ────────────────────────────────
  console.log('\n── Tabelle 2: Soll-Bereich Erfüllungsrate ──');
  console.log(padR('Soll-Ber.', 12) + padL('Erwartet', 12) + padL('Treffer', 12) + padL('Quote', 10));
  console.log('─'.repeat(46));
  for (let b = 1; b <= 5; b++) {
    const [lo, hi] = bereichBounds(b);
    const inSoll = rows.filter(r => r.sollBereich === b);
    const hits = inSoll.filter(r => r.finalRank >= lo && r.finalRank <= (hi === Infinity ? nRacers : hi)).length;
    const total = inSoll.length;
    console.log(
      padR(`B${b} (${lo}-${hi === Infinity ? nRacers : hi})`, 12) +
      padL(total, 12) + padL(hits, 12) + padL(`${((hits/total)*100).toFixed(1)}%`, 10)
    );
  }

  // ── Tabelle 3: Soll-Bereich 1 (Top-5) nach Start-Reihe ───────────────────
  console.log('\n── Tabelle 3: Soll-Bereich 1 (Top-5 Ziel) → Erreichung nach Start-Reihe ──');
  console.log(padR('', 12) + [0,1,2,3,4].map(r => padL(`Row ${r}`, 14)).join(''));
  console.log('─'.repeat(82));

  const header = ['Zugewiesen', 'Erreicht Top5', 'Quote'];
  console.log(padR('', 12) + [0,1,2,3,4].map(() => padL('Zuw/Err/%', 14)).join(''));
  console.log('─'.repeat(82));

  const b1Racers = rows.filter(r => r.sollBereich === 1);
  for (let row = 0; row <= 4; row++) {
    const inRow = b1Racers.filter(r => r.startRowIndex === row);
    const hits = inRow.filter(r => r.finalRank <= 5).length;
    const total = inRow.length;
    process.stdout.write(padR(`Row ${row}`, 12));
    process.stdout.write(padL(`${total} / ${hits} / ${total > 0 ? ((hits/total)*100).toFixed(0) : '-'}%`, 14));
    process.stdout.write('\n');
  }
  const b1Total = b1Racers.filter(r => r.finalRank <= 5).length;
  console.log('─'.repeat(30));
  console.log(padR('Gesamt', 12) + padL(`${b1Racers.length} / ${b1Total} / ${((b1Total/b1Racers.length)*100).toFixed(1)}%`, 14));

  // ── Tabelle 3b: Alle Bereiche nach Start-Reihe (kompakt) ──────────────────
  console.log('\n── Tabelle 3b: Zielerreichungsquote pro (Start-Reihe × Soll-Bereich) ──');
  console.log(padR('Soll-Ber.', 12) + [0,1,2,3,4].map(r => padL(`Row ${r}`, 10)).join(''));
  console.log('─'.repeat(62));
  for (let b = 1; b <= 5; b++) {
    const [lo, hi] = bereichBounds(b);
    const hiCapped = hi === Infinity ? nRacers : hi;
    process.stdout.write(padR(`B${b}`, 12));
    for (let row = 0; row <= 4; row++) {
      const inGroup = rows.filter(r => r.sollBereich === b && r.startRowIndex === row);
      const hits = inGroup.filter(r => r.finalRank >= lo && r.finalRank <= hiCapped).length;
      const total = inGroup.length;
      const pct = total > 0 ? ((hits/total)*100).toFixed(0) : '-';
      process.stdout.write(padL(`${pct}%`, 10));
    }
    process.stdout.write('\n');
  }
  console.log('(% = Anteil Racer×Rennen die ihren Soll-Bereich tatsächlich erreicht haben)');

  // ── Tabelle 4: Ø End-Platz nach Start-Reihe × Soll-Bereich ───────────────
  console.log('\n── Tabelle 4: Ø End-Platz nach Start-Reihe × Soll-Bereich ──');
  console.log(padR('Start-R.', 10) + [1,2,3,4,5].map(b => padL(`B${b} Soll`, 10)).join(''));
  console.log('─'.repeat(60));
  for (let row = 0; row <= 4; row++) {
    process.stdout.write(padR(`Row ${row}`, 10));
    for (let b = 1; b <= 5; b++) {
      const group = rows.filter(r => r.startRowIndex === row && r.sollBereich === b);
      if (group.length === 0) {
        process.stdout.write(padL('—', 10));
      } else {
        const avg = group.reduce((s, r) => s + r.finalRank, 0) / group.length;
        process.stdout.write(padL(avg.toFixed(1), 10));
      }
    }
    process.stdout.write('\n');
  }
  const bereichMids = [3, 10.5, 20.5, 33, 55]; // midpoint of each Bereich
  console.log(padR('(Soll)', 10) + bereichMids.map(m => padL(m.toFixed(1), 10)).join(''));
}

// ── Main ──────────────────────────────────────────────────────────────────────
const datasets = [
  { label: 'Seed 1', dir: 'diag-r70-s1' },
  { label: 'Seed 2', dir: 'diag-r70-s2' },
];

for (const { label, dir } of datasets) {
  let rawData;
  try {
    rawData = loadRawData(dir);
  } catch (e) {
    console.log(`\n[${label}] Daten nicht verfügbar: ${e.message}`);
    continue;
  }

  for (const dur of [30, 120]) {
    const hasRows = rawData.some(r => r.durationSec === dur && r.sollBereich != null);
    if (!hasRows) {
      console.log(`\n[${label} ${dur}s] Keine Daten mit sollBereich — übersprungen.`);
      continue;
    }
    analyzeRun(label, rawData, dur);
  }
}
