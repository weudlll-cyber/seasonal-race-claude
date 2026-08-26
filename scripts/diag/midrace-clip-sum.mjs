// MIDRACE-LEADER-CLIP-1 — the summariser. MEASURE ONLY: reads JSON, prints tables.
//
// EPISODES, NOT FRAMES, are the unit that answers "how often". A clip that lasts 90 frames is one
// thing the viewer sees, not 90; a rate quoted in frames would make one long episode look like a
// hundred faults. Both are reported, and the episode length distribution is what says whether this
// is a flicker or a state he sits inside.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIR = arg("dir", "c:/tmp/midrace");
const PREFIX = arg("prefix", "after");
const TRACKS = (arg("tracks", "") || "").split(",").filter(Boolean);
const f = (n, d = 1) => (n === null || n === undefined ? "   —  " : n.toFixed(d).padStart(6));

const perTrack = [];
for (const t of TRACKS) {
  const p = `${DIR}/clip-${PREFIX}-${t}.json`;
  if (!existsSync(p)) {
    perTrack.push({ t, missing: true });
    continue;
  }
  const races = JSON.parse(readFileSync(p, "utf8"));
  let frames = 0, clipped = 0, centreOut = 0;
  const episodes = [];
  const edgeCount = {};
  const stateCount = {};
  const bindingCount = {};
  let anchorLeaderClipped = 0;
  let alongSum = 0, acrossSum = 0, alongMax = 0, acrossMax = 0;
  const perRace = [];
  const empty = [];
  for (const R of races) {
    if (!R.rows.length) { empty.push(R.case.seed); continue; }
    frames += R.frames;
    let run = 0, raceClipped = 0;
    for (const r of R.rows) {
      if (!r.clipped) { if (run) { episodes.push(run); run = 0; } continue; }
      run++; clipped++; raceClipped++;
      if (r.centreOut) centreOut++;
      for (const e of r.edges) edgeCount[e] = (edgeCount[e] ?? 0) + 1;
      stateCount[r.state] = (stateCount[r.state] ?? 0) + 1;
      bindingCount[r.binding ?? "none"] = (bindingCount[r.binding ?? "none"] ?? 0) + 1;
      if (r.anchorIsLeader) anchorLeaderClipped++;
      alongSum += r.along; acrossSum += r.across;
      if (r.along > alongMax) alongMax = r.along;
      if (r.across > acrossMax) acrossMax = r.across;
    }
    if (run) episodes.push(run);
    perRace.push({ seed: R.case.seed, pct: R.frames ? (raceClipped / R.frames) * 100 : 0, n: raceClipped });
  }
  perRace.sort((a, b) => b.pct - a.pct);
  episodes.sort((a, b) => a - b);
  perTrack.push({
    t, frames, clipped, centreOut, episodes, edgeCount, stateCount, bindingCount,
    anchorLeaderClipped, alongSum, acrossSum, alongMax, acrossMax, perRace, empty,
  });
}

console.log(`\n(1) HOW OFTEN IS THE LEADER CLIPPED — ${PREFIX}`);
console.log(
  "track              midrace frames   clipped   rate%   episodes   median len   longest   worst race"
);
for (const r of perTrack) {
  if (r.missing) { console.log(`${r.t.padEnd(18)}  ** NO FILE **`); continue; }
  const med = r.episodes.length ? r.episodes[Math.floor(r.episodes.length / 2)] : 0;
  const worst = r.perRace[0];
  console.log(
    r.t.padEnd(18),
    String(r.frames).padStart(14),
    String(r.clipped).padStart(9),
    f((r.clipped / (r.frames || 1)) * 100, 2),
    String(r.episodes.length).padStart(10),
    String(med).padStart(12),
    String(r.episodes.at(-1) ?? 0).padStart(9),
    `   s${worst ? worst.seed : "-"} (${worst ? worst.pct.toFixed(1) : "-"}%)`
  );
}
const T = perTrack.filter((r) => !r.missing);
const tot = T.reduce((a, r) => a + r.frames, 0);
const clip = T.reduce((a, r) => a + r.clipped, 0);
const eps = T.flatMap((r) => r.episodes).sort((a, b) => a - b);
console.log(
  `\nPOOLED ${PREFIX}: ${clip} of ${tot} mid-race frames clipped (${((clip / tot) * 100).toFixed(2)}%), ` +
    `${eps.length} episodes, median ${eps.length ? eps[Math.floor(eps.length / 2)] : 0} frames, longest ${eps.at(-1) ?? 0}. ` +
    `Centre off canvas on ${T.reduce((a, r) => a + r.centreOut, 0)} frames (ABSENT rather than clipped).`
);

console.log(`\n(2) LATERAL OR AHEAD? — the two things he named, and which dominates`);
console.log("track              mean ACROSS   mean ALONG   max ACROSS   max ALONG   verdict");
for (const r of T) {
  const n = r.clipped || 1;
  const ac = r.acrossSum / n, al = r.alongSum / n;
  console.log(
    r.t.padEnd(18), f(ac), "     ", f(al), "    ", f(r.acrossMax), "    ", f(r.alongMax),
    "  " + (ac > al * 1.5 ? "LATERAL" : al > ac * 1.5 ? "AHEAD" : "mixed")
  );
}

console.log(`\n(3) WHAT SET THE WIDTH AND THE ANCHOR ON THE CLIPPED FRAMES`);
for (const r of T) {
  const st = Object.entries(r.stateCount).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `${k} ${((v / (r.clipped || 1)) * 100).toFixed(0)}%`).join(", ");
  const bd = Object.entries(r.bindingCount).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `${k} ${((v / (r.clipped || 1)) * 100).toFixed(0)}%`).join(", ");
  const edges = Object.entries(r.edgeCount).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`).join(", ");
  console.log(`  ${r.t}`);
  console.log(`     states:  ${st}`);
  console.log(`     width:   ${bd}`);
  console.log(`     edges:   ${edges}`);
  console.log(`     leader was the ANCHOR on ${((r.anchorLeaderClipped / (r.clipped || 1)) * 100).toFixed(0)}% of clipped frames`);
}
