// AIM-LEVERS-1 — per track, never pooled. Both axes of every arm, against `off` at the same N.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIR = arg("dir", "c:/tmp/lev/s1");
const TRACKS = (
  arg("tracks", "space-sprint,river-run,seatrack,dirt-oval") || ""
)
  .split(",")
  .filter(Boolean);
const ARMS = (arg("arms", "off,a,b300,b360,ab300") || "")
  .split(",")
  .filter(Boolean);
// LEADER-LATERAL-BUILD-1's threshold, kept identical so "loud" means the same across reports.
const NOTICE = Number(arg("notice", "120"));

const q = (a, p) =>
  a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN;
const f = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "—");

/** Runs of ADJACENT flagged frames. Both sides of the trade are counted this way. */
const episodes = (rows, key) => {
  const out = [];
  let run = 0;
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i][key]) {
      if (run > 0) out.push(run);
      run = 0;
      continue;
    }
    const cont = run > 0 && rows[i].frame === rows[i - 1].frame + 1;
    if (cont) run += 1;
    else {
      if (run > 0) out.push(run);
      run = 1;
    }
  }
  if (run > 0) out.push(run);
  return out;
};

/** A camStep is a PAN only between adjacent frames; a cut is not a pan. */
const panSteps = (rows) => {
  const out = [];
  for (let i = 1; i < rows.length; i++)
    if (rows[i].camStep !== null && rows[i].frame === rows[i - 1].frame + 1)
      out.push(rows[i].camStep);
  return out;
};

const stats = (p) => {
  const rows = p.races.flatMap((r) => r.rows);
  const eps = p.races
    .flatMap((r) => episodes(r.rows, "clipped"))
    .sort((a, b) => a - b);
  const steps = p.races.flatMap((r) => panSteps(r.rows)).sort((a, b) => a - b);
  const perRace = p.races.map((R) => {
    const st = panSteps(R.rows);
    return Math.max(0, ...st);
  });
  const tol = rows
    .filter((r) => r.aimAhead !== null)
    .map((r) => r.aimAhead - r.halfLen);
  const gaps = rows.map((r) => r.gap);
  return {
    races: p.races.length,
    n: rows.length,
    clip: rows.filter((r) => r.clipped).length,
    eps: eps.length,
    epMed: q(eps, 0.5),
    tolMed: q(
      [...tol].sort((a, b) => a - b),
      0.5,
    ),
    gapMed: q(
      [...gaps].sort((a, b) => a - b),
      0.5,
    ),
    gapP90: q(
      [...gaps].sort((a, b) => a - b),
      0.9,
    ),
    halfLen: q(
      rows.map((r) => r.halfLen).sort((a, b) => a - b),
      0.5,
    ),
    room: q(
      rows
        .filter((r) => r.aimAhead !== null)
        .map((r) => r.aimAhead)
        .sort((a, b) => a - b),
      0.5,
    ),
    frac: q(
      rows.map((r) => r.frac).sort((a, b) => a - b),
      0.5,
    ),
    centre: rows.filter((r) => !(Math.abs(r.leaderExtra ?? 0) > 1e-9)).length,
    onLine: rows.filter((r) => !(Math.abs(r.totalShift ?? 0) > 1e-9)).length,
    stepP99: q(steps, 0.99),
    stepMax: steps.at(-1) ?? 0,
    loud: perRace.filter((v) => v >= NOTICE).length,
  };
};

for (const t of TRACKS) {
  const arms = [];
  for (const a of ARMS) {
    const p = `${DIR}/lev-${t}-${a}.json`;
    if (!existsSync(p)) continue;
    arms.push({ arm: a, ...stats(JSON.parse(readFileSync(p, "utf8"))) });
  }
  if (!arms.length) continue;
  const base = arms.find((x) => x.arm === "off") ?? arms[0];
  process.stdout.write(
    `\n### ${t} — ${base.races} races, ${base.n} mid-race LEADER_ZOOM frames\n\n`,
  );
  process.stdout.write(
    "| arm | frac | room | half-len | **tolerance** | gap med | **tol>gap?** | gap p90 |" +
      " clip | clip% | **CLIP EPS** | Δeps | centre% | on-line% | step p99 | step max | loud |\n",
  );
  process.stdout.write(
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n",
  );
  for (const a of arms) {
    const pct = (x) => (a.n ? (100 * x) / a.n : NaN);
    process.stdout.write(
      `| ${a.arm === "off" ? "**off (shipped)**" : a.arm} | ${f(a.frac, 3)} | ${f(a.room)} |` +
        ` ${f(a.halfLen)} | **${f(a.tolMed)}** | ${f(a.gapMed)} |` +
        ` ${a.tolMed > a.gapMed ? "**YES**" : "no"} | ${f(a.gapP90)} |` +
        ` ${a.clip} | ${f(pct(a.clip), 2)} | **${a.eps}** |` +
        ` ${a.eps - base.eps >= 0 ? "+" : ""}${a.eps - base.eps} |` +
        ` ${f(pct(a.centre), 2)} | ${f(pct(a.onLine), 2)} | ${f(a.stepP99)} | ${f(a.stepMax)} |` +
        ` ${a.loud}/${a.races} |\n`,
    );
  }
}
process.stdout.write("\n");
