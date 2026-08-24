// RUNIN-LEVEL-SET-BUILD-1 — the built code, measured with the SAME visibility test LATE-LEAD-HUNT-1
// used, so the build's numbers can be put beside the measurement it was built on.
//
// It does NOT compute a counterfactual. It reads the shot the director actually composes, now that
// the rule is in it, and counts the frames on which a racer's BODY is off canvas.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolveIdentity, loadTracks, buildRace, runRace, TRACK_DEFAULT_RACER } from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { effectiveZoom, OPEN_TRACK_BASE_ZOOM } = await import(u("client/src/modules/camera/openTrackCamera.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const arg = (k, d) => { const h = process.argv.find((a) => a.startsWith(`--${k}=`)); return h ? h.slice(k.length + 3) : d; };
const ONLY = arg("track", null), RACERS = Number(arg("racers", "20"));
const SEED_FROM = Number(arg("from", "1")), SEED_TO = Number(arg("to", "60"));
const OUT = arg("out", "c:/tmp/level-built");

function measure(geo, seed) {
  const identity = resolveIdentity({ racers: RACERS, raceSeed: seed, racerType: TRACK_DEFAULT_RACER, roster: ROSTER, note: "level-set-built" });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const { st, shape } = race;
  const CW = identity.canvasW, CH = identity.canvasH;
  const BSX = CW / (geo.worldWidth || 1280), BSY = CH / (geo.worldHeight || 720);
  const isOpen = !geo.closed;
  const linePt = shape.getPosition(isOpen ? st.finishT : st.finishT % 1, 0);
  const snaps = [];
  runRace(race, identity, DEFAULT_CAMERA_CONFIG, ({ cd, st: state }) => {
    if (!(state.finishT > 0)) return;
    const fp = cd._framingProbe;
    if (!fp || !fp.runInActive) return;
    const z = cd.zoom ?? 0;
    const ex = isOpen ? effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) : z * BSX;
    const ey = isOpen ? ex : z * BSY;
    const ox = cd.offsetX ?? 0, oy = cd.offsetY ?? 0;
    const xs = [], ys = [], bm = [], idx = [];
    for (const r of state.racers) {
      xs.push(r.x ?? 0); ys.push(r.y ?? 0);
      bm.push(Math.max(r.drawnBodyLengthPx ?? 0, r.drawnBodyWidthPx ?? 0) / 2 || 0);
      idx.push(r.index);
    }
    snaps.push({ ex, ey, ox, oy, xs, ys, bm, idx,
      levelBound: !!fp.levelBound, setSize: fp.levelSetSize ?? 0,
      guaranteed: fp.guaranteed, preLevel: fp.levelPreWidth });
  }, { slowmo: true });
  const ranked = st.racers.filter((r) => r.finishRank > 0).sort((a, b) => a.finishRank - b.finishRank);
  if (!ranked.length || !snaps.length) return null;
  const winner = ranked[0].index;
  const top5 = new Set(ranked.slice(0, 5).map((r) => r.index));
  const acc = { frames: 0, winnerOff: 0, top5Off: 0, lineIn: 0, levelBound: 0, reopen: 0, sumSet: 0,
    // THE RE-OPEN'S SIZE, not only its count: a width that grows smoothly is not a width that pumps.
    reopenLn: 0, maxStepLn: 0, varLn: 0 };
  let prev = null;
  for (const s of snaps) {
    acc.frames++;
    if (s.levelBound) acc.levelBound++;
    acc.sumSet += s.setSize;
    const off = (i) => {
      const sx = s.xs[i] * s.ex + s.ox, sy = s.ys[i] * s.ey + s.oy;
      const rx = s.bm[i] * s.ex, ry = s.bm[i] * s.ey;
      return sx + rx < 0 || sx - rx > CW || sy + ry < 0 || sy - ry > CH;
    };
    for (let i = 0; i < s.idx.length; i++) {
      if (s.idx[i] === winner && off(i)) acc.winnerOff++;
      if (top5.has(s.idx[i]) && off(i)) { acc.top5Off++; break; }
    }
    if (linePt) {
      const lx = linePt.x * s.ex + s.ox, ly = linePt.y * s.ey + s.oy;
      if (lx >= 0 && lx <= CW && ly >= 0 && ly <= CH) acc.lineIn++;
    }
    // A RE-OPEN: the delivered width got wider than the frame before it. The cost the report owes.
    if (prev !== null && s.guaranteed > 0 && prev > 0) {
      const d = Math.log(s.guaranteed / prev);
      acc.varLn += Math.abs(d);
      if (Math.abs(d) > acc.maxStepLn) acc.maxStepLn = Math.abs(d);
      if (d < -1e-9) { acc.reopen++; acc.reopenLn += -d; }
    }
    prev = s.guaranteed;
  }
  return { track: geo.id, seed, racers: RACERS, acc };
}

mkdirSync(OUT, { recursive: true });
const results = [];
for (const geo of loadTracks().filter((g) => !ONLY || g.id === ONLY)) {
  for (let seed = SEED_FROM; seed <= SEED_TO; seed++) {
    try { const r = measure(geo, seed); if (r) results.push(r); }
    catch (e) { results.push({ track: geo.id, seed, racers: RACERS, error: String(e) }); }
  }
}
writeFileSync(`${OUT}/${ONLY ?? "all"}-${RACERS}-${SEED_FROM}_${SEED_TO}.json`, JSON.stringify(results));
process.stdout.write(`${ONLY}-${RACERS}-${SEED_FROM}_${SEED_TO}: races ${results.filter((r) => r.acc).length}\n`);
