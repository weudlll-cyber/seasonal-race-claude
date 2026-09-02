// COMPANY-HEADCOUNT-1 — the two arms, per track, never pooled. Frames align by (seed, frame), so
// the widening is a PER-FRAME distribution rather than one aggregate divided by another.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIR = arg("dir", "c:/tmp/hc");
const TRACKS = (arg("tracks", "") || "").split(",").filter(Boolean);
const A = arg("before", "before");
const B = arg("after", "after");

const q = (a, p) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
const f = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const pct = (n, tot) => (tot ? (100 * n) / tot : NaN);
/** A camStep is a PAN only between ADJACENT frames; a cut is not a pan. */
const adj = (rows) => {
  const o = [];
  for (let i = 1; i < rows.length; i++)
    if (rows[i].camStep !== null && rows[i].frame === rows[i - 1].frame + 1) o.push(rows[i].camStep);
  return o;
};

const stat = (j) => {
  const rows = j.races.flatMap((r) => r.rows);
  const eligible = rows.filter((r) => r.running >= j.promise);
  const steps = j.races.flatMap((r) => adj(r.rows)).sort((a, b) => a - b);
  return {
    frames: rows.length,
    inShot: rows.map((r) => r.inShot),
    short: eligible.filter((r) => r.inShot < j.promise).length,
    eligible: eligible.length,
    clip: rows.filter((r) => r.clipped).length,
    centre: rows.filter((r) => !(Math.abs(r.leaderExtra ?? 0) > 1e-9)).length,
    stepP99: q(steps, 0.99),
    stepMax: steps.at(-1) ?? 0,
    zoomByKey: new Map(j.races.flatMap((r) => r.rows.map((x) => [`${r.seed}:${x.frame}`, x.zoom]))),
    binding: rows.reduce((m, r) => ((m[r.binding] = (m[r.binding] ?? 0) + 1), m), {}),
  };
};

console.log(
  `| track | N | frames | in-shot p50 / p10 | promise kept | clip% | CLIP | centre% | step p99 | step max |`
);
console.log(`|---|---|---|---|---|---|---|---|---|---|`);
const widenAll = [];
for (const t of TRACKS) {
  const pa = `${DIR}/hc-${t}-${A}.json`;
  const pb = `${DIR}/hc-${t}-${B}.json`;
  if (!existsSync(pa) || !existsSync(pb)) {
    console.log(`| ${t} | — | MISSING ARM | | | | | | | |`);
    continue;
  }
  const ja = JSON.parse(readFileSync(pa, "utf8"));
  const jb = JSON.parse(readFileSync(pb, "utf8"));
  const a = stat(ja);
  const b = stat(jb);
  const row = (label, j, s) =>
    `| ${label} | ${j.seeds} | ${s.frames} | ${f(q(s.inShot, 0.5), 0)} / ${f(q(s.inShot, 0.1), 0)} | ` +
    `${s.eligible - s.short}/${s.eligible} (${f(pct(s.eligible - s.short, s.eligible))}%) | ` +
    `${f(pct(s.clip, s.frames))} | ${s.clip} | ${f(pct(s.centre, s.frames))} | ${f(s.stepP99, 1)} | ${f(s.stepMax, 1)} |`;
  console.log(row(`**${t}** before`, ja, a));
  console.log(row(`${t} **after**`, jb, b));
  // PER-FRAME widening, on the frames both arms have.
  const w = [];
  for (const [k, za] of a.zoomByKey) {
    const zb = b.zoomByKey.get(k);
    if (zb && zb > 0) w.push(za / zb); // >1 means the after-shot is WIDER
  }
  const moved = w.filter((x) => x > 1 + 1e-9).length;
  widenAll.push({ t, w, moved, n: w.length, frameMatch: a.frames === b.frames });
}

console.log(`\n### The price — how much wider, and on what share of frames (per-frame, matched)\n`);
console.log(`| track | frames matched | frames WIDER | widening p50 | p75 | p90 | p99 | max |`);
console.log(`|---|---|---|---|---|---|---|---|`);
for (const { t, w, moved, n, frameMatch } of widenAll) {
  const wide = w.filter((x) => x > 1 + 1e-9);
  console.log(
    `| ${t}${frameMatch ? "" : " ⚠FRAME COUNTS DIFFER"} | ${n} | ${moved} (${f(pct(moved, n))}%) | ` +
      `${f(q(wide, 0.5), 3)}x | ${f(q(wide, 0.75), 3)}x | ${f(q(wide, 0.9), 3)}x | ${f(q(wide, 0.99), 3)}x | ${f(q(wide, 1), 3)}x |`
  );
}
