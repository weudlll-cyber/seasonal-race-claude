// LATE-LEAD-HUNT-1 — find races where a TOP FINISHER was outside the camera at the finish.
// Report-only: it changes nothing and drives the real CameraDirector.
//
// VISIBILITY IS TESTED ON THE BODY, NEVER ON THE CENTRE POINT. A centre-in-frame test has misled
// this project before (LABEL-OVERLAP-3 read a shot as tight when it was the widest of the race), so
// each racer is bounded by a circle of radius half his LARGER drawn dimension, projected per axis
// with the renderer's own transform (renderRaceFrame.js:129/132/153):
//     closed track: eff = zoom * bs        open track: effX = effY = effectiveZoom(zoom, BASE)
//     screen = world * eff + offset
// OFF     — the whole bound is outside the canvas rect. Nothing of him is drawn.
// CLIPPED — the bound crosses an edge. Part of him is drawn, part is not.
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
const { effectiveZoom, OPEN_TRACK_BASE_ZOOM } = await import(
  u("client/src/modules/camera/openTrackCamera.js")
);
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const ONLY = arg("track", null);
const RACERS = Number(arg("racers", "20"));
const SEED_FROM = Number(arg("from", "1"));
const SEED_TO = Number(arg("to", "50"));
const OUT = arg("out", "c:/tmp/late-lead-hunt");
const TOPK = Number(arg("topk", "5"));

function measure(geo, seed) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: seed,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    note: "late-lead-hunt",
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const BSX = CW / (geo.worldWidth || 1280);
  const BSY = CH / (geo.worldHeight || 720);
  const isOpen = !geo.closed;

  // index -> { off, clipped, on, firstU, lastU, minU, maxU, binds:{}, anchors:{} }
  const vis = new Map();
  let closingFrames = 0;

  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st }) => {
      if (!(st.finishT > 0)) return;
      const fp = cd._framingProbe;
      // THE CLOSING STRETCH, IN THE SCHEDULE'S OWN UNIT: the frames the run-in is composing, where
      // `_runInProgress` runs 0 at the window opening to 1 at the line.
      if (!fp || !fp.runInActive) return;
      const uu = cd._runInProgress ?? 0;
      closingFrames++;

      const zoom = cd.zoom ?? 0;
      const effX = isOpen ? effectiveZoom(zoom, OPEN_TRACK_BASE_ZOOM) : zoom * BSX;
      const effY = isOpen ? effX : zoom * BSY;
      const ox = cd.offsetX ?? 0;
      const oy = cd.offsetY ?? 0;

      for (const r of st.racers) {
        const sx = (r.x ?? 0) * effX + ox;
        const sy = (r.y ?? 0) * effY + oy;
        const bodyWorld =
          Math.max(r.drawnBodyLengthPx ?? 0, r.drawnBodyWidthPx ?? 0) / 2 || 0;
        const rx = bodyWorld * effX;
        const ry = bodyWorld * effY;
        // Distance the bound pokes outside each edge.
        const outL = -(sx + rx);
        const outR = sx - rx - CW;
        const outT = -(sy + ry);
        const outB = sy - ry - CH;
        const fullyOff = outL > 0 || outR > 0 || outT > 0 || outB > 0;
        const crosses =
          !fullyOff && (sx - rx < 0 || sx + rx > CW || sy - ry < 0 || sy + ry > CH);

        let v = vis.get(r.index);
        if (!v) {
          v = { off: 0, clipped: 0, on: 0, offU: [], binds: {}, anchors: {}, where: {} };
          vis.set(r.index, v);
        }
        if (fullyOff) {
          v.off++;
          v.offU.push(+uu.toFixed(4));
          const b = fp.binding ?? "none";
          v.binds[b] = (v.binds[b] ?? 0) + 1;
          const a = cd.anchorRacerIndex ?? "null";
          v.anchors[a] = (v.anchors[a] ?? 0) + 1;
          const side = outT > 0 ? "top" : outB > 0 ? "bottom" : outL > 0 ? "left" : "right";
          v.where[side] = (v.where[side] ?? 0) + 1;
        } else if (crosses) v.clipped++;
        else v.on++;
      }
    },
    { slowmo: true }
  );

  const st = race.st;
  const ranked = st.racers
    .filter((r) => r.finishRank > 0)
    .sort((a, b) => a.finishRank - b.finishRank);
  if (!ranked.length) return null;

  const byPos = [];
  for (const r of ranked.slice(0, TOPK)) {
    const v = vis.get(r.index) ?? { off: 0, clipped: 0, on: 0, offU: [], binds: {}, anchors: {}, where: {} };
    const us = v.offU;
    byPos.push({
      pos: r.finishRank,
      index: r.index,
      off: v.off,
      clipped: v.clipped,
      on: v.on,
      offFrom: us.length ? Math.min(...us) : null,
      offTo: us.length ? Math.max(...us) : null,
      binds: v.binds,
      anchors: v.anchors,
      where: v.where,
    });
  }

  return {
    track: geo.id || geo.name,
    closed: !!geo.closed,
    seed,
    racers: RACERS,
    closingFrames,
    byPos,
  };
}

mkdirSync(OUT, { recursive: true });
const tracks = loadTracks().filter((g) => !ONLY || (g.id || g.name) === ONLY);
const results = [];
for (const geo of tracks) {
  for (let seed = SEED_FROM; seed <= SEED_TO; seed++) {
    try {
      const r = measure(geo, seed);
      if (r) results.push(r);
    } catch (e) {
      results.push({ track: geo.id || geo.name, seed, racers: RACERS, error: String(e) });
    }
  }
}
const tag = `${ONLY ?? "all"}-${RACERS}-${SEED_FROM}_${SEED_TO}`;
writeFileSync(`${OUT}/${tag}.json`, JSON.stringify(results));
const hits = results.filter((r) => r.byPos?.some((p) => p.off > 0));
process.stdout.write(`${tag}: races ${results.length} hits ${hits.length}\n`);
