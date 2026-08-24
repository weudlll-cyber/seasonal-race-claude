// RUNIN-CONTENDERS-1 — is the contender set wrong, or merely generous? Report-only.
//
// MEASURES ONLY. It changes no camera code, no default, no rule and no threshold. Where it needs to
// know what a NARROWER set would have asked for, it calls the production `contenderGuarantee` — the
// same pure function `_guaranteeCeiling` calls — on a reduced point set. Nothing is re-implemented.
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
const { contenderGuarantee } = await import(u("client/src/modules/camera/framingRule.js"));
const { shortestArcDeltaT } = await import(u("client/src/utils/mathUtils.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const ONLY = arg("track", null);
const RACERS = Number(arg("racers", "20"));
const SEEDS = String(arg("seeds", "9")).split(",").map(Number);
const OUT = arg("out", "c:/tmp/runin-contenders");
const TRACE = arg("trace", null); // "seed" -> emit a per-frame trace for that seed

/** One race, fully measured. */
function measure(geo, seed) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: seed,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    note: "runin-contenders",
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const BSX = CW / (geo.worldWidth || 1280);
  const BSY = CH / (geo.worldHeight || 720);

  let captured = null; // the set as captured, by index
  let capturedAt = null; // { frame, physicsSteps, leaderProgress }
  let reformCount = 0; // times the captured array IDENTITY changes after first capture
  let lastCapturedRef = null;
  let winnerIdx = null;
  let gapsAtWin = null; // index -> body lengths behind the winner, at the winner's crossing
  const trace = [];
  // Per-frame width cost of each SET MEMBER, accumulated: how much wider the guarantee is WITH him
  // than without him. Keyed by racer index.
  const costLn = new Map(); // index -> array of ln(withHim / withoutHim)
  let framesPriced = 0;
  // WHICH TERM SETS THE WIDTH over the closing stretch. The brief's third possibility is that the
  // contender set is not setting it at all — that has to be measured, not assumed away.
  const binding = {};
  let closingFrames = 0;

  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st, frame, physicsSteps }) => {
      if (!(st.finishT > 0)) return;
      let maxT = 0;
      for (const r of st.racers) if ((r && r.t ? r.t : 0) > maxT) maxT = r.t;
      const p = maxT / st.finishT;

      // (a) THE SET AS BUILT — captured once at PHOTO_FINISH entry, stored by index.
      const pf = cd._photoFinishContenders;
      if (pf && captured === null) {
        captured = pf.map((c) => c.index);
        capturedAt = { frame, physicsSteps, leaderProgress: p };
        lastCapturedRef = pf;
      } else if (pf && pf !== lastCapturedRef) {
        reformCount++;
        lastCapturedRef = pf;
      }

      // The winner's crossing: the frame finishRank 1 first exists. Gaps measured THERE, in the
      // set's own unit — the arc gap in body lengths, exactly condition 1's quantity.
      if (winnerIdx === null) {
        const w = st.racers.find((r) => r.finishRank === 1);
        if (w) {
          winnerIdx = w.index;
          const pathLen = w.pathLengthPx ?? 0;
          gapsAtWin = {};
          for (const r of st.racers) {
            const contact = ((w.drawnBodyLengthPx ?? 0) + (r.drawnBodyLengthPx ?? 0)) / 2;
            const gapPx = shortestArcDeltaT(w.t, r.t) * pathLen;
            gapsAtWin[r.index] = contact > 0 ? gapPx / contact : null;
          }
        }
      }

      // (c) THE PRICE OF A PASSENGER — the production guarantee on the live set, then on the set
      // minus each member. `fp.pair` IS what `_guaranteeCeiling` was handed this frame.
      const fp = cd._framingProbe;
      if (fp && p >= 0.95) {
        closingFrames++;
        const b = fp.binding ?? "none";
        binding[b] = (binding[b] ?? 0) + 1;
      }
      // `subjects.pair` may carry nulls (a state that guarantees a pair with one side absent), so
      // every read below is over the LIVE members only.
      const livePair =
        fp && Array.isArray(fp.pair) ? fp.pair.filter((q) => q && q.index != null) : [];
      if (fp && livePair.length >= 3) {
        const axisX = cd._proj?.axisX;
        const axisY = cd._proj?.axisY;
        const inner = cd._innerFramePct ?? 1;
        const pad = cd._drawnBodyWidthRefPx ?? 0;
        const full = contenderGuarantee(livePair, axisX, axisY, fp.frameW, fp.frameH, inner, pad);
        if (Number.isFinite(full) && full > 0) {
          framesPriced++;
          for (const m of livePair) {
            const without = livePair.filter((q) => q !== m);
            if (without.length < 2) continue;
            const cw = contenderGuarantee(without, axisX, axisY, fp.frameW, fp.frameH, inner, pad);
            if (!Number.isFinite(cw) || !(cw > 0)) continue;
            // A guarantee is a zoom CEILING: dropping a member can only RAISE it (tighter shot).
            // ln(without / with) >= 0 is the width this member is costing, in the schedule's own
            // log space.
            const ln = Math.log(cw / full);
            const idx = m.index ?? null;
            if (idx === null) continue;
            if (!costLn.has(idx)) costLn.set(idx, []);
            costLn.get(idx).push(ln);
          }
        }
      }

      // (d) THE WORKED EXAMPLE — a per-frame trace, only for the requested seed.
      if (TRACE !== null && String(seed) === String(TRACE) && p >= 0.5 && fp) {
        const leader = st.racers.reduce((a, b) => ((b.t ?? 0) > (a.t ?? 0) ? b : a), st.racers[0]);
        const w = st.racers.find((r) => r.index === winnerIdx) ?? null;
        trace.push({
          frame,
          p: +p.toFixed(5),
          state: cd.state,
          binding: fp.binding,
          zoom: +(cd.zoom ?? 0).toFixed(5),
          worldW: cd._proj?.visibleWorldW ? +cd._proj.visibleWorldW(cd.zoom).toFixed(1) : null,
          setSize: livePair.length,
          setIdx: livePair.map((q) => q.index),
          leaderIdx: leader?.index ?? null,
          winnerInSet:
            winnerIdx !== null ? livePair.some((q) => q.index === winnerIdx) : null,
          winnerT: w ? +(w.t ?? 0).toFixed(5) : null,
          leaderT: +(leader?.t ?? 0).toFixed(5),
          runInActive: !!fp.runInActive,
          anchorIdx: cd.anchorRacerIndex ?? null,
          comebackIdx: cd.comebackLockedRacerIndex ?? null,
          // WHERE EACH RACER SAT IN FRAME, as a fraction of the canvas. The transform is the
          // renderer's own for a CLOSED track: screen = world * (zoom * bs) + offset
          // (renderRaceFrame.js:129/132/153). 0..1 is on canvas; outside that is off it.
          pos: st.racers.map((r) => [
            r.index,
            +(((r.x ?? 0) * (cd.zoom ?? 0) * BSX + (cd.offsetX ?? 0)) / CW).toFixed(4),
            +(((r.y ?? 0) * (cd.zoom ?? 0) * BSY + (cd.offsetY ?? 0)) / CH).toFixed(4),
          ]),
        });
      }
    },
    { slowmo: true }
  );

  const st = race.st;
  const finished = st.racers.filter((r) => r.finishRank > 0).length;
  const setArr = captured ?? [];
  const inSet = new Set(setArr);
  const gaps = gapsAtWin ?? {};

  // (b) CASE A — racers NOT in the set who were genuinely close at the line.
  const nonSetClose = st.racers.filter(
    (r) => !inSet.has(r.index) && gaps[r.index] != null && gaps[r.index] <= 1
  ).length;

  // (c) CASE B — SET members who finished far back. "Never a real candidate" is reported at
  // several distances rather than at one chosen threshold, so the reader picks the line.
  const memberGap = setArr.map((i) => ({ index: i, gap: gaps[i] ?? null }));
  const summarise = (a) => {
    if (!a.length) return null;
    const s = [...a].sort((x, y) => x - y);
    return {
      n: s.length,
      med: +s[Math.floor(s.length / 2)].toFixed(5),
      max: +s[s.length - 1].toFixed(5),
      mean: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(5),
    };
  };
  const cost = {};
  for (const [idx, arr] of costLn) cost[idx] = summarise(arr);

  return {
    track: geo.id || geo.name,
    closed: !!geo.closed,
    seed,
    racers: RACERS,
    finished,
    setSize: setArr.length,
    set: setArr,
    capturedAt,
    reformCount,
    winnerIdx,
    winnerInSet: winnerIdx !== null ? inSet.has(winnerIdx) : null,
    gapsAtWin: gaps,
    nonSetClose,
    memberGap,
    cost,
    framesPriced,
    binding,
    closingFrames,
    trace: trace.length ? trace : undefined,
  };
}

mkdirSync(OUT, { recursive: true });
const tracks = loadTracks().filter((g) => !ONLY || (g.id || g.name) === ONLY);
for (const geo of tracks) {
  for (const seed of SEEDS) {
    const id = `${geo.id || geo.name}-${RACERS}-${seed}`;
    try {
      const r = measure(geo, seed);
      writeFileSync(`${OUT}/${id}.json`, JSON.stringify(r));
      process.stdout.write(`ok ${id} set=${r.setSize} winnerInSet=${r.winnerInSet}\n`);
    } catch (e) {
      writeFileSync(`${OUT}/${id}.err.json`, JSON.stringify({ id, error: String(e && e.stack) }));
      process.stdout.write(`ERR ${id} ${String(e)}\n`);
    }
  }
}
