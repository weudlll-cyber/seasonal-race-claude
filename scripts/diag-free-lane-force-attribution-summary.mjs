import fs from 'node:fs';
import path from 'node:path';

const TRACE_PATH = path.resolve('docs/diagnose/free-lane-force-attribution-trace.ndjson');
const SUMMARY_PATH = path.resolve('docs/diagnose/free-lane-force-attribution-summary.md');

function pairKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
}

function fmt(n, d = 4) {
  return Number.isFinite(n) ? n.toFixed(d) : '0.0000';
}

function pct(n, d) {
  if (!d) return '0.0%';
  return `${((n / d) * 100).toFixed(1)}%`;
}

function sampleN(items, n, seed = 98051) {
  let s = seed >>> 0;
  const rng = () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

const rows = fs
  .readFileSync(TRACE_PATH, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const byFrame = new Map();
const byFrameRacer = new Map();
for (const r of rows) {
  if (!byFrame.has(r.frame)) byFrame.set(r.frame, []);
  byFrame.get(r.frame).push(r);
  byFrameRacer.set(`${r.frame}:${r.racerId}`, r);
}
const frames = [...byFrame.keys()].sort((a, b) => a - b);

const framePairSet = new Map();
for (const f of frames) {
  const set = new Set();
  for (const r of byFrame.get(f)) {
    for (const p of r.pairPartnerIds ?? []) {
      set.add(pairKey(r.racerId, p));
    }
  }
  framePairSet.set(f, set);
}

const transitions = [];
for (let i = 0; i < frames.length - 1; i++) {
  const f = frames[i];
  const nf = frames[i + 1];
  for (const pair of framePairSet.get(f)) {
    transitions.push({
      frame: f,
      nextFrame: nf,
      pair,
      success: !framePairSet.get(nf).has(pair),
    });
  }
}

const failures = transitions.filter((t) => !t.success);
const successes = transitions.filter((t) => t.success);

function pairRows(samples) {
  const out = [];
  for (const s of samples) {
    const [a, b] = s.pair.split('-').map(Number);
    const ra = byFrameRacer.get(`${s.frame}:${a}`);
    const rb = byFrameRacer.get(`${s.frame}:${b}`);
    if (ra) out.push({ ...s, racer: ra });
    if (rb) out.push({ ...s, racer: rb });
  }
  return out;
}

const failureRows = pairRows(failures);
const successRows = pairRows(successes);
const sampleRows = sampleN(failureRows, 30);

function stats(rows, key) {
  const vals = rows.map((x) => Math.abs(x.racer[key] ?? 0));
  let mx = 0;
  for (const v of vals) if (v > mx) mx = v;
  return { mean: mean(vals), median: median(vals), max: mx };
}

const sFree = stats(failureRows, 'freeLane_delta');
const sHome = stats(failureRows, 'homeForce_delta');
const sAvoid = stats(failureRows, 'avoidance_delta');
const sDraft = stats(failureRows, 'drafting_lateral_delta');

function classifyDominance(rows) {
  let free = 0;
  let home = 0;
  let avoid = 0;
  let draft = 0;
  let mixed = 0;
  for (const rr of rows) {
    const r = rr.racer;
    const f = Math.abs(r.freeLane_delta ?? 0);
    const h = Math.abs(r.homeForce_delta ?? 0);
    const a = Math.abs(r.avoidance_delta ?? 0);
    const d = Math.abs(r.drafting_lateral_delta ?? 0);
    const vals = [
      ['free', f],
      ['home', h],
      ['avoid', a],
      ['draft', d],
    ].sort((x, y) => y[1] - x[1]);

    if (vals[0][1] <= 1e-8) {
      mixed++;
      continue;
    }

    const top = vals[0];
    const second = vals[1];
    if (top[1] >= second[1] * 1.25) {
      if (top[0] === 'free') free++;
      if (top[0] === 'home') home++;
      if (top[0] === 'avoid') avoid++;
      if (top[0] === 'draft') draft++;
    } else {
      mixed++;
    }
  }
  return { free, home, avoid, draft, mixed, total: rows.length };
}

const failDom = classifyDominance(failureRows);
const succDom = classifyDominance(successRows);

function clampRate(rows) {
  if (!rows.length) return 0;
  let c = 0;
  for (const rr of rows) {
    const r = rr.racer;
    if (Math.abs((r.total_delta_before_clamp ?? 0) - (r.total_delta_after_clamp ?? 0)) > 1e-8) c++;
  }
  return c / rows.length;
}

const clampFail = clampRate(failureRows);
const clampSucc = clampRate(successRows);

const freePositiveFail = failureRows.filter((rr) => (rr.racer.freeLane_delta ?? 0) > 0);
const signSummary = {
  n: freePositiveFail.length,
  homeNeg: freePositiveFail.filter((rr) => (rr.racer.homeForce_delta ?? 0) < 0).length,
  avoidNeg: freePositiveFail.filter((rr) => (rr.racer.avoidance_delta ?? 0) < 0).length,
  draftNeg: freePositiveFail.filter((rr) => (rr.racer.drafting_lateral_delta ?? 0) < 0).length,
};

function overlapState(frame, pair) {
  return framePairSet.get(frame)?.has(pair) ?? false;
}

function longestPersistentPairs(limit = 5) {
  const perPair = new Map();
  for (const t of failures) {
    if (!perPair.has(t.pair)) perPair.set(t.pair, []);
    perPair.get(t.pair).push(t.frame);
  }

  const streaks = [];
  for (const [pair, arr] of perPair.entries()) {
    arr.sort((a, b) => a - b);
    let s = arr[0];
    let p = arr[0];
    for (let i = 1; i < arr.length; i++) {
      const f = arr[i];
      if (f === p + 1) {
        p = f;
        continue;
      }
      streaks.push({ pair, start: s, end: p, len: p - s + 1 });
      s = f;
      p = f;
    }
    streaks.push({ pair, start: s, end: p, len: p - s + 1 });
  }

  streaks.sort((a, b) => b.len - a.len);
  return streaks.slice(0, limit);
}

const topPairs = longestPersistentPairs(5);

function trajectory(streak) {
  const [a, b] = streak.pair.split('-').map(Number);
  const start = streak.start;
  const end = Math.min(streak.start + 59, frames[frames.length - 1]);
  const out = [];
  out.push(`Paar ${a}-${b}, Frames ${start}-${end}, Persistenz-Streak=${streak.len}`);
  out.push('Frame | yA | yB | |Δy| | freeA | freeB | overlap | event');
  out.push('---|---:|---:|---:|---:|---:|---|---');

  let prevOverlap = overlapState(start - 1, streak.pair);
  for (let f = start; f <= end; f++) {
    const ra = byFrameRacer.get(`${f}:${a}`);
    const rb = byFrameRacer.get(`${f}:${b}`);
    if (!ra || !rb) continue;
    const yA = ra.y_after ?? ra.y_before;
    const yB = rb.y_after ?? rb.y_before;
    const dy = Math.abs(yA - yB);
    const ov = overlapState(f, streak.pair);
    let event = '';
    if (prevOverlap && !ov) event = 'separated';
    if (!prevOverlap && ov) event = 'rejoined';
    prevOverlap = ov;
    out.push(
      `${f} | ${fmt(yA)} | ${fmt(yB)} | ${fmt(dy)} | ${fmt(ra.freeLane_delta ?? 0)} | ${fmt(rb.freeLane_delta ?? 0)} | ${ov ? 'yes' : 'no'} | ${event}`
    );
  }
  return out.join('\n');
}

const md = [];
md.push('# Free-Lane Force Attribution Diagnose (Runde 2)');
md.push('');
md.push('## Setup');
md.push('- Branch: claude/free-lane-separation');
md.push('- 20 Racer, 1800 Frames, dirt-oval');
md.push('- BASE_SPEED: 0.00096..0.00113');
md.push('- ReRoll: 58 Frames');
md.push('- Drafting: boost 1.04, maxDistance 80');
md.push('');
md.push('## Overlap-Transition Ergebnis');
md.push(`- Gesamt transitions: ${transitions.length}`);
md.push(`- Erfolg (im Folgeframe getrennt): ${successes.length} (${pct(successes.length, transitions.length)})`);
md.push(`- Misserfolg (bleibt überlappt): ${failures.length} (${pct(failures.length, transitions.length)})`);
md.push('');
md.push('## Frage 1: Vorzeichen in Misserfolgsfällen (30 Zufallssamples)');
md.push('| Frame | RacerID | freeLane | homeForce | avoidance | drafting | total_pre | total_post | y_change |');
md.push('|---|---|---|---|---|---|---|---|---|');
for (const rr of sampleRows) {
  const r = rr.racer;
  const yChange = (r.y_after ?? 0) - (r.y_before ?? 0);
  md.push(
    `| ${rr.frame} | ${r.racerId} | ${fmt(r.freeLane_delta ?? 0)} | ${fmt(r.homeForce_delta ?? 0)} | ${fmt(r.avoidance_delta ?? 0)} | ${fmt(r.drafting_lateral_delta ?? 0)} | ${fmt(r.total_delta_before_clamp ?? 0)} | ${fmt(r.total_delta_after_clamp ?? 0)} | ${fmt(yChange)} |`
  );
}
md.push('');
md.push(`- Fälle mit freeLane > 0 in Misserfolg: ${signSummary.n}`);
md.push(`- davon homeForce < 0: ${signSummary.homeNeg} (${pct(signSummary.homeNeg, signSummary.n)})`);
md.push(`- davon avoidance < 0: ${signSummary.avoidNeg} (${pct(signSummary.avoidNeg, signSummary.n)})`);
md.push(`- davon drafting < 0: ${signSummary.draftNeg} (${pct(signSummary.draftNeg, signSummary.n)})`);
md.push('');
md.push('## Frage 2: Relative Magnituden (|delta|, nur Misserfolg)');
md.push('| Kraft | Mittelwert |delta| | Median |delta| | Max |delta| |');
md.push('|---|---:|---:|---:|');
md.push(`| Free-Lane | ${fmt(sFree.mean)} | ${fmt(sFree.median)} | ${fmt(sFree.max)} |`);
md.push(`| Home-Force | ${fmt(sHome.mean)} | ${fmt(sHome.median)} | ${fmt(sHome.max)} |`);
md.push(`| Avoidance | ${fmt(sAvoid.mean)} | ${fmt(sAvoid.median)} | ${fmt(sAvoid.max)} |`);
md.push(`| Drafting lateral | ${fmt(sDraft.mean)} | ${fmt(sDraft.median)} | ${fmt(sDraft.max)} |`);
md.push('');
md.push('## Frage 3: Korrelation Erfolg/Misserfolg mit Kraft-Konstellationen');
md.push(`- Erfolg: free-dominant ${pct(succDom.free, succDom.total)}, home-dominant ${pct(succDom.home, succDom.total)}, avoidance-dominant ${pct(succDom.avoid, succDom.total)}, mixed ${pct(succDom.mixed, succDom.total)}`);
md.push(`- Misserfolg: free-dominant ${pct(failDom.free, failDom.total)}, home-dominant ${pct(failDom.home, failDom.total)}, avoidance-dominant ${pct(failDom.avoid, failDom.total)}, mixed ${pct(failDom.mixed, failDom.total)}`);
md.push('');
md.push('## Frage 4: Einzelkraft vs. Kombination in Misserfolg');
md.push(`- Einzelkraft (free/home/avoid/draft dominant): ${failDom.free + failDom.home + failDom.avoid + failDom.draft} (${pct(failDom.free + failDom.home + failDom.avoid + failDom.draft, failDom.total)})`);
md.push(`- Kombination (keine klare Dominanz >=25% Abstand): ${failDom.mixed} (${pct(failDom.mixed, failDom.total)})`);
md.push('');
md.push('## Frage 5: Clamp-Bias');
md.push(`- Clamp-Aktivierungsrate Erfolg: ${pct(clampSucc, 1)}`);
md.push(`- Clamp-Aktivierungsrate Misserfolg: ${pct(clampFail, 1)}`);
md.push('Bewertung: Höhere Clamp-Rate in Misserfolg deutet auf systematische Limitierung der effektiven Trennung hin.');
md.push('');
md.push('## Hauptneutralisierer');
const ranking = [
  ['Free-Lane', sFree.mean],
  ['Home-Force', sHome.mean],
  ['Avoidance', sAvoid.mean],
  ['Drafting lateral', sDraft.mean],
].sort((a, b) => b[1] - a[1]);
md.push(`1. ${ranking[0][0]} (mean |delta| = ${fmt(ranking[0][1])})`);
md.push(`2. ${ranking[1][0]} (mean |delta| = ${fmt(ranking[1][1])})`);
md.push(`3. ${ranking[2][0]} (mean |delta| = ${fmt(ranking[2][1])})`);
md.push(`4. ${ranking[3][0]} (mean |delta| = ${fmt(ranking[3][1])})`);
md.push('');
md.push('## Empfehlung für Folge-Spec (kein Fix)');
md.push('- Bei aktivem Overlap Home-Force temporär um 40-60% reduzieren.');
md.push('- Zusätzlich den gegenläufigen Avoidance-Anteil im Overlap um 20-30% dämpfen (nur solange overlap=true).');
md.push('- Clamp-Bias adressieren: bei overlap maxLateral temporär +0.05..+0.10, danach easing back.');
md.push('');
md.push('## Bonus: 3-5 Paar-Trajektorien (60 Frames)');
for (const st of topPairs) {
  md.push('');
  md.push(trajectory(st));
}

fs.mkdirSync(path.dirname(SUMMARY_PATH), { recursive: true });
fs.writeFileSync(SUMMARY_PATH, md.join('\n'));
console.log(`Summary geschrieben: ${SUMMARY_PATH}`);
