// RUNIN-CHANCE-SET-1 — the set the owner asked for (who can still WIN) against the set that was
// built (who is currently NEAR). MEASURE ONLY: no product file is touched.
//
// ── THE PREDICATE IS NOT MINE, AND THAT IS THE POINT ────────────────────────────────────────────
//
// The tree already holds a chance test, shipped and live: `_updateContentionWatch`
// (CameraDirector.js:2619) computes
//
//     projected = gapNow + (vLeader - vRacer) * msToLine        vs        contactLength
//
// — the along-track gap extrapolated to the line at the CURRENT closing rate, against one racer
// length. That is a chance, not a state. It is used in exactly ONE direction: to RELEASE a racer
// from the framing pair. Nothing admits on it. So this instrument does not invent a formula; it
// takes that expression and asks it about membership as well as about release.
//
// THE RATE IS THE DIRECTOR'S OWN, not a second estimator. `_updateContentionWatch` measures the rate
// between its own checks (`contentionCheckMs`, 250 ms) and replaces `_contentionLast` as it goes, so
// by the time `_levelContenders` runs the window has already been consumed. This wraps the method to
// capture the SAME window the director used on the SAME frame it used it. A cross-check against the
// engine's own `r.vt` is recorded beside it, so "which estimator" can be answered with a number
// rather than an argument.
//
// ── FOUR ARMS, ONE DIFFERENCE ──────────────────────────────────────────────────────────────────
//
// Every arm runs the SHIPPED `_levelCeiling` — its instant admit, its eased release, its hold state,
// its place in the composition order. Only `_levelContenders` is overridden. So any difference in
// the delivered width is a difference of MEMBERSHIP and of nothing else.
//
//   off     the level guarantee never binds  = master's shot (the feature is unmerged)
//   len     the shipped one-length rule      = feat/runin-level-set-1 as built
//   chance  the director's own chance test, applied to membership
//   union   chance OR one-length             = the inclusive reading, which can only ADD
//
// THE CAMERA SEED IS THE BROWSER'S. Since 2026-08-23 the game derives it from the race seed;
// `resolveIdentity` still defaults to a constant the product cannot produce (RUNIN-LEVEL-SET-BUILD-1
// section 15). Every figure here is meant to be a claim about what he sees, so it uses his.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { cameraSeedForRace } = await import(u("client/src/modules/camera/cameraSeed.js"));
const { CameraDirector } = await import(u("client/src/modules/camera/CameraDirector.js"));
const { effectiveZoom, OPEN_TRACK_BASE_ZOOM } = await import(
  u("client/src/modules/camera/openTrackCamera.js")
);
// THE ARC UNIT, at source. `_updateContentionWatch` and `withinOneLength` both measure the gap with
// this exact helper; a second copy here would be a second definition of "how far back is he".
const { shortestArcDeltaT } = await import(u("client/src/utils/mathUtils.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const ONLY = arg("track", null);
const RACERS = Number(arg("racers", "20"));
const SEED_FROM = Number(arg("from", "1"));
const SEED_TO = Number(arg("to", "60"));
const OUT = arg("out", "c:/tmp/chance-set");
// Races whose per-frame series is kept in full rather than reduced to a row.
const TRACE = new Set((arg("trace", "") || "").split(",").filter(Boolean));

const ARMS = ["off", "len", "chance", "union"];

function runArm(geo, seed, arm, keepSeries) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: seed,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    cameraSeed: cameraSeedForRace(seed),
    note: `chance-set:${arm}`,
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const { cd, st, shape } = race;
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const BSX = CW / (geo.worldWidth || 1280);
  const BSY = CH / (geo.worldHeight || 720);
  const isOpen = !geo.closed;

  // ── THE DIRECTOR'S OWN RATE WINDOW, captured on the frame it is measured ──────────────────────
  let rates = new Map(); // index -> world px per ms, positive = moving forward along the track
  const origWatch = cd._updateContentionWatch.bind(cd);
  cd._updateContentionWatch = (racers, raceState, ts) => {
    const before = cd._contentionLast;
    origWatch(racers, raceState, ts);
    if (cd._contentionLast !== before && before) {
      let leader = null;
      let maxT = -Infinity;
      for (const r of racers)
        if (r.t > maxT) {
          maxT = r.t;
          leader = r;
        }
      const pathLen = leader?.pathLengthPx ?? 0;
      if (pathLen > 0) {
        const next = new Map();
        for (const r of racers) {
          const p = before.get(r.index);
          if (p && ts > p.ts) next.set(r.index, ((r.t - p.t) * pathLen) / (ts - p.ts));
        }
        if (next.size) rates = next;
      }
    }
  };

  const origLevel = cd._levelContenders.bind(cd);
  // Recorded per frame so the report can say WHO joined and WHEN, not merely how many.
  let probe = null;

  cd._levelContenders = (racers) => {
    const len = origLevel(racers); // the shipped one-length answer, always computed
    probe = { len: len.map((r) => r.index), chance: null, rateUsed: false };
    if (arm === "off") return [];
    if (arm === "len") return len;

    if (!racers?.length) return [];
    let leader = null;
    let maxT = -Infinity;
    for (const r of racers)
      if (r.t > maxT) {
        maxT = r.t;
        leader = r;
      }
    const pathLen = leader?.pathLengthPx ?? 0;
    // The SAME geometry guard `_levelContenders` carries, for the same reason.
    if (!leader || !(pathLen > 0) || !((leader.drawnBodyLengthPx ?? 0) > 0)) return [];
    const vLeader = rates.get(leader.index);
    const finishT = st.finishT ?? 0;
    // NO RATE YET MEANS NO PREDICTION, so the state is the honest answer — which is exactly the
    // early return `_updateContentionWatch` takes before its first window closes.
    if (!(vLeader > 0) || !(finishT > 0)) {
      probe.chance = probe.len;
      return arm === "union" ? len : len;
    }
    const msToLine = ((finishT - leader.t) * pathLen) / vLeader;
    const out = [leader];
    for (const r of racers) {
      if (r === leader || r.index === leader.index) continue;
      const vR = rates.get(r.index);
      if (vR === undefined) continue;
      const gapNow = shortestArcDeltaT(leader.t, r.t) * pathLen;
      const contact = CameraDirector.contactLengthBetween(leader, r);
      if (!(contact > 0)) continue;
      // CameraDirector.js:2619, verbatim in shape, in sign and in units.
      const projected = gapNow + (vLeader - vR) * msToLine;
      const byChance = projected <= contact;
      // The shipped predicate itself, asked rather than re-stated.
      const byLen = CameraDirector.withinOneLength(leader, r, pathLen);
      if (arm === "union" ? byChance || byLen : byChance) out.push(r);
    }
    probe.chance = out.map((r) => r.index);
    probe.rateUsed = true;
    return out;
  };

  const linePt = shape.getPosition(isOpen ? st.finishT : st.finishT % 1, 0);
  const everMembers = new Map(); // racer index -> frames held
  const snaps = [];
  const series = [];
  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd: d, st: state, ts, frame }) => {
      if (!(state.finishT > 0)) return;
      const fp = d._framingProbe;
      if (!fp || !fp.runInActive) return;
      const z = d.zoom ?? 0;
      const ex = isOpen ? effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) : z * BSX;
      const ey = isOpen ? ex : z * BSY;
      const ox = d.offsetX ?? 0;
      const oy = d.offsetY ?? 0;
      const xs = [];
      const ys = [];
      const bm = [];
      const idx = [];
      for (const r of state.racers) {
        xs.push(r.x ?? 0);
        ys.push(r.y ?? 0);
        bm.push(Math.max(r.drawnBodyLengthPx ?? 0, r.drawnBodyWidthPx ?? 0) / 2 || 0);
        idx.push(r.index);
      }
      snaps.push({
        ex,
        ey,
        ox,
        oy,
        xs,
        ys,
        bm,
        idx,
        setSize: fp.levelSetSize ?? 0,
        guaranteed: fp.guaranteed,
      });
      // THE HONEST PRICE (f): who was EVER held in frame by this arm, and for how many frames. A
      // member who then finishes down the field is width spent on a racer who was not in the story.
      //
      // READ THIS FOR THE `off` ARM AND YOU WILL READ A WRONG NUMBER. `probe.chance` is null on the
      // arms that never compute a chance set, so the fallback is `probe.len` — which is right for
      // the `len` arm (that IS what it returned) and WRONG for `off`, which returned nothing at all
      // and framed nobody. `off` has no membership by construction, so its `held` is the one-length
      // set computed for comparison and must never be reported as that arm's own. The report omits
      // the `off` row from (f) for exactly this reason.
      if (probe) {
        const mem = probe.chance ?? probe.len;
        for (const i2 of mem) everMembers.set(i2, (everMembers.get(i2) ?? 0) + 1);
      }
      if (keepSeries) {
        series.push({
          frame,
          ts: +ts.toFixed(1),
          u: +(d._runInProgress ?? 0).toFixed(4),
          width: +(fp.guaranteed > 0 ? CH / (fp.guaranteed * (isOpen ? ey / z : BSY)) : 0).toFixed(1),
          camZoom: +z.toFixed(6),
          setSize: fp.levelSetSize ?? 0,
          members: probe ? (probe.chance ?? probe.len) : [],
          lenMembers: probe ? probe.len : [],
          rateUsed: probe ? probe.rateUsed : false,
        });
      }
    },
    { slowmo: true }
  );

  const ranked = st.racers.filter((r) => r.finishRank > 0).sort((a, b) => a.finishRank - b.finishRank);
  if (!ranked.length || !snaps.length) return null;
  const winner = ranked[0].index;
  const top5 = new Set(ranked.slice(0, 5).map((r) => r.index));
  const rankOf = new Map(ranked.map((r) => [r.index, r.finishRank]));

  const acc = {
    frames: 0,
    winnerOff: 0,
    top5Off: 0,
    lineIn: 0,
    sumSet: 0,
    maxSet: 0,
    maxStepLn: 0,
    stepsOver04: 0,
    sumWidthLn: 0,
    reopen: 0,
  };
  let prev = null;
  for (const s of snaps) {
    acc.frames++;
    acc.sumSet += s.setSize;
    if (s.setSize > acc.maxSet) acc.maxSet = s.setSize;
    acc.sumWidthLn += Math.log(s.guaranteed > 0 ? s.guaranteed : 1);
    const off = (i) => {
      const sx = s.xs[i] * s.ex + s.ox;
      const sy = s.ys[i] * s.ey + s.oy;
      const rx = s.bm[i] * s.ex;
      const ry = s.bm[i] * s.ey;
      return sx + rx < 0 || sx - rx > CW || sy + ry < 0 || sy - ry > CH;
    };
    for (let i = 0; i < s.idx.length; i++) {
      if (s.idx[i] === winner && off(i)) acc.winnerOff++;
      if (top5.has(s.idx[i]) && off(i)) {
        acc.top5Off++;
        break;
      }
    }
    if (linePt) {
      const lx = linePt.x * s.ex + s.ox;
      const ly = linePt.y * s.ey + s.oy;
      if (lx >= 0 && lx <= CW && ly >= 0 && ly <= CH) acc.lineIn++;
    }
    if (prev !== null && s.guaranteed > 0 && prev > 0) {
      const dln = Math.log(s.guaranteed / prev);
      if (Math.abs(dln) > acc.maxStepLn) acc.maxStepLn = Math.abs(dln);
      if (Math.abs(dln) > 0.4) acc.stepsOver04++;
      if (dln < -1e-9) acc.reopen++;
    }
    prev = s.guaranteed;
  }
  // Paired with the finish rank here rather than downstream, so no analysis can mismatch them.
  const held = [...everMembers]
    .map(([i, f]) => ({ i, f, rank: rankOf.get(i) ?? null }))
    .sort((a, b) => b.f - a.f);
  return {
    acc,
    series: keepSeries ? series : null,
    rankOf: [...rankOf],
    winner,
    held,
    snaps: snaps.length,
  };
}

mkdirSync(OUT, { recursive: true });
const results = [];
for (const geo of loadTracks().filter((g) => !ONLY || g.id === ONLY)) {
  for (let seed = SEED_FROM; seed <= SEED_TO; seed++) {
    const key = `${geo.id}-${RACERS}-${seed}`;
    const keep = TRACE.has(key);
    const row = { track: geo.id, racers: RACERS, seed, arms: {} };
    try {
      for (const arm of ARMS) {
        const r = runArm(geo, seed, arm, keep);
        if (!r) continue;
        row.arms[arm] = keep ? r : { acc: r.acc, winner: r.winner, held: r.held };
      }
    } catch (e) {
      row.error = String(e);
    }
    if (Object.keys(row.arms).length || row.error) results.push(row);
  }
}
writeFileSync(
  `${OUT}/${ONLY ?? "all"}-${RACERS}-${SEED_FROM}_${SEED_TO}.json`,
  JSON.stringify(results)
);
process.stdout.write(
  `${ONLY}-${RACERS}-${SEED_FROM}_${SEED_TO}: races ${results.filter((r) => r.arms.len).length}\n`
);
