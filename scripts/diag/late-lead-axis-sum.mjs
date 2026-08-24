// LATE-LEAD-AXIS-1 — the summary tables, from the re-sliced hits. Read-only.
import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(process.argv[2] ?? "c:/tmp/late-lead-axis.json", "utf8"));
const H = d.hits;
const med = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const raceKey = (h) => `${h.track}|${h.racers}|${h.seed}`;
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) : "0.0");
const out = [];
const say = (s = "") => out.push(s);

say("### DIRECTION SLICE — 1,435 hits over 1,260 races");
for (const k of ["across", "along", "mixed", "ambiguous"]) {
  const g = H.filter((h) => h.dir === k);
  if (!g.length) continue;
  const pos = {};
  for (const h of g) pos[h.pos] = (pos[h.pos] ?? 0) + 1;
  const bind = {};
  for (const h of g) bind[h.bindTop] = (bind[h.bindTop] ?? 0) + 1;
  say(
    [
      k.toUpperCase().padEnd(10),
      `hits ${String(g.length).padStart(4)}`,
      `races ${String(new Set(g.map(raceKey)).size).padStart(3)}`,
      `P1..P5 ${[1, 2, 3, 4, 5].map((p) => pos[p] ?? 0).join("/")}`,
      `medFrames ${med(g.map((h) => h.off))}`,
      `medFrom ${med(g.map((h) => h.offFrom)).toFixed(3)}`,
      `medTo ${med(g.map((h) => h.offTo)).toFixed(3)}`,
      `bind ${Object.entries(bind)
        .sort((a, b) => b[1] - a[1])
        .map(([n, c]) => `${n}:${pct(c, g.length)}%`)
        .join(" ")}`,
      `noAnchor ${pct(g.filter((h) => h.anchoredNull).length, g.length)}%`,
      `onHim ${pct(g.filter((h) => h.anchoredHim).length, g.length)}%`,
      `A/B/C ${["A", "B", "C"].map((x) => g.filter((h) => h.group === x).length).join("/")}`,
    ].join("  ")
  );
}

say("");
say("### BOTH SIDES — every off-FRAME, booked to the side the hunt recorded, mapped per hit");
// Frame-level, not hit-level: a hit's `where` histogram carries the frames on each side.
const frames = { acrossA: 0, acrossB: 0, alongBehind: 0, alongAhead: 0, ambig: 0 };
const sidePairs = new Map(); // track -> {acrossSides:[], alongSides:[]}
for (const h of H) {
  const map = h.windowMap ?? h.stretchMap ?? {};
  const rec = sidePairs.get(h.track) ?? { across: new Set(), along: new Set() };
  for (const [side, cnt] of Object.entries(h.where ?? {})) {
    const kind = map[side];
    if (kind === "across") {
      rec.across.add(side);
      if (side === "top" || side === "left") frames.acrossA += cnt;
      else frames.acrossB += cnt;
    } else if (kind === "along") {
      rec.along.add(side);
      const behind =
        (h.stretchMap && side === "left" && ["dirt-oval", "luger-hill", "mountainstreet", "river-run", "searound"].includes(h.track)) ||
        (side === "right" && ["city-circuit", "garden-path"].includes(h.track)) ||
        (side === "top" && h.track === "space-sprint");
      if (behind) frames.alongBehind += cnt;
      else frames.alongAhead += cnt;
    } else frames.ambig += cnt;
  }
  sidePairs.set(h.track, rec);
}
const tot = Object.values(frames).reduce((a, b) => a + b, 0);
say(`total off-frames ${tot}`);
say(`ACROSS side A (top / left where left is across): ${frames.acrossA}  (${pct(frames.acrossA, tot)}%)`);
say(`ACROSS side B (bottom / right where right is across): ${frames.acrossB}  (${pct(frames.acrossB, tot)}%)`);
say(`ALONG behind: ${frames.alongBehind}  (${pct(frames.alongBehind, tot)}%)`);
say(`ALONG ahead:  ${frames.alongAhead}  (${pct(frames.alongAhead, tot)}%)`);
say(`AMBIGUOUS:    ${frames.ambig}  (${pct(frames.ambig, tot)}%)`);

say("");
say("### THE OWNER'S QUESTION — a racer ACROSS-TRACK out of frame, and how often he is the winner");
const across = H.filter((h) => h.dir === "across");
const acrossOrMixed = H.filter((h) => h.dir === "across" || h.dir === "mixed");
const acrossRaces = new Set(across.map(raceKey));
const acrossP1 = across.filter((h) => h.pos === 1);
say(`races with ANY top-5 finisher off across-track: ${acrossRaces.size} / ${d.nRaces} (${pct(acrossRaces.size, d.nRaces)}%)`);
say(`  incl. mixed hits: ${new Set(acrossOrMixed.map(raceKey)).size} / ${d.nRaces} (${pct(new Set(acrossOrMixed.map(raceKey)).size, d.nRaces)}%)`);
say(`races where the WINNER is off across-track: ${new Set(acrossP1.map(raceKey)).size} / ${d.nRaces} (${pct(new Set(acrossP1.map(raceKey)).size, d.nRaces)}%)`);
say(`  the winner is ${pct(acrossP1.length, across.length)}% of across-track hits`);
const alongP1 = H.filter((h) => h.dir === "along" && h.pos === 1);
say(`for comparison, WINNER off ALONG-track: ${new Set(alongP1.map(raceKey)).size} races (${pct(new Set(alongP1.map(raceKey)).size, d.nRaces)}%)`);

say("");
say("### PER TRACK — which pair is across, and the across/along hit split");
const tracks = [...new Set(H.map((h) => h.track))].sort();
for (const t of tracks) {
  const g = H.filter((h) => h.track === t);
  const rec = sidePairs.get(t);
  const cnt = (k) => g.filter((h) => h.dir === k).length;
  say(
    `${t.padEnd(15)} acrossSides=${[...(rec?.across ?? [])].sort().join("+") || "-"}  alongSides=${[...(rec?.along ?? [])].sort().join("+") || "-"}  across ${String(cnt("across")).padStart(3)}  along ${String(cnt("along")).padStart(3)}  mixed ${String(cnt("mixed")).padStart(3)}  ambig ${String(cnt("ambiguous")).padStart(3)}`
  );
}

say("");
say("### ACROSS-TRACK HIT LIST — longest first");
const sorted = [...across].sort((a, b) => b.off - a.off);
for (const h of sorted.slice(0, 30)) {
  say(
    `${h.track.padEnd(15)} n=${h.racers} seed=${String(h.seed).padStart(3)} P${h.pos}  off=${String(h.off).padStart(3)}  clip=${String(h.clipped).padStart(3)}  u ${h.offFrom.toFixed(3)}-${h.offTo.toFixed(3)}  where=${JSON.stringify(h.where)}  bind=${h.bindTop}  anchor=${h.anchoredNull ? "none" : h.anchoredHim ? "HIM" : "other"}`
  );
}
say("");
say("### ACROSS-TRACK, WINNERS ONLY");
for (const h of [...acrossP1].sort((a, b) => b.off - a.off)) {
  say(
    `${h.track.padEnd(15)} n=${h.racers} seed=${String(h.seed).padStart(3)} off=${String(h.off).padStart(3)} clip=${String(h.clipped).padStart(3)} u ${h.offFrom.toFixed(3)}-${h.offTo.toFixed(3)} where=${JSON.stringify(h.where)} bind=${h.bindTop}`
  );
}
say("");
say("### MIXED — winners only (left one edge and another)");
for (const h of H.filter((h) => h.dir === "mixed" && h.pos === 1).sort((a, b) => b.off - a.off)) {
  say(
    `${h.track.padEnd(15)} n=${h.racers} seed=${String(h.seed).padStart(3)} off=${String(h.off).padStart(3)} u ${h.offFrom.toFixed(3)}-${h.offTo.toFixed(3)} where=${JSON.stringify(h.where)} map=${JSON.stringify(h.windowMap)}`
  );
}
process.stdout.write(out.join("\n") + "\n");
