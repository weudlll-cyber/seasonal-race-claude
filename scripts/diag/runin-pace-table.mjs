// ============================================================
// File:        scripts/diag/runin-pace-table.mjs
// Project:     RaceArena — RUNIN-LINE-1 pace measurement (report-only, changes nothing)
//
// THE OWNER HAS ONE PACE DECISION LEFT and this exists so he can take it from figures instead of
// from adjectives. He rejected the run-in on 2026-08-17 for three things; two of them are pace —
// "the hold lasts too long" and "the close runs too fast" — and BOTH move on the single existing
// key `runInOpenMs`, in opposite directions at once: a larger value releases EARLIER (longer sweep
// left to run, so the release condition trips sooner) and therefore closes SLOWER.
//
// NOTHING HERE IS A DEFAULT AND NOTHING IS WRITTEN. The key is overridden per run in a camera
// config the driver is handed; `defaults.js` is untouched, no key is added, and the script exits 0
// whatever it measures. It is a table, not a gate.
//
// ── AND IT MEASURES THE LINE AT EACH VALUE, WHICH IS THE POINT ─────────────────────────────────
//
// After RUNIN-LINE-1's repair the finish line is held for the whole window on every track except a
// handful of frames at the very end, where the shot is at or wider than the run-in asked for and
// the CAMERA has not arrived — the pan eases toward its target, so on a fast sweep the leader sits
// further forward in the delivered frame than the guarantee assumed and the line falls off the
// front edge. That residual is a function of how fast the sweep is, which is this key. So the pace
// decision and the last of the line's visibility are the same decision, and the table reports both.
//
// Usage:
//   node scripts/diag/runin-pace-table.mjs                 # 1250 / 1750 / 2250, ten tracks
//   node scripts/diag/runin-pace-table.mjs --values=1250,1500
// ============================================================

import { join } from "node:path";
import { pathToFileURL } from "node:url";
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

const argOf = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const VALUES = (argOf("values") ?? "1250,1750,2250").split(",").map(Number);
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const CW = 1280;
const CH = 720;
const SEED = 9;

/**
 * One track at one `runInOpenMs`.
 *
 * THE CROSSING IS THE LAST FRAME THE RUN-IN COMPOSES, not the first frame with progress >= 1.
 * `_runInProgress` asymptotes to 0.999 and never reaches 1 — waiting for it silently yields the end
 * of the race and counts the whole post-crossing ending as sweep, which is the measurement error
 * RUNIN-HOLD-1 recorded after it had changed the implementation twice to chase the artefact.
 */
function measure(geo, runInOpenMs) {
  const identity = resolveIdentity({
    racers: 20,
    raceSeed: SEED,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    note: `RUNIN-LINE-1 pace table @ ${runInOpenMs}`,
  });
  const cfg = { ...DEFAULT_CAMERA_CONFIG, runInOpenMs };
  const race = buildRace(geo, identity, cfg);

  let engagedMs = null;
  let releasedMs = null;
  let lastComposingMs = null;
  let trailed = 0;
  let worstMargin = Infinity;
  // ONCE IN, NEVER OUT — the same rule question 3 of check-runin-frame grades on. The frames before
  // the line has EVER been in frame are the opening approach: the camera is still travelling out of
  // whatever tight shot it was in and cannot already be somewhere it is on its way to. Counting
  // them here would report the approach as if it were the close, which is what the first draft of
  // this table did — every row showed a worst margin of several thousand px taken at the threshold.
  let everIn = false;

  runRace(
    race,
    identity,
    cfg,
    ({ cd, st, ts, raceStart }) => {
      if (!(st.finishT > 0) || (st.finishedCount ?? 0) > 0) return;
      const ms = ts - raceStart;
      if (!cd._runInComposingNow) return;
      if (engagedMs === null) engagedMs = ms;
      if (releasedMs === null && cd._runInReleaseProgress !== null) releasedMs = ms;
      lastComposingMs = ms;

      // The same reading question 3 of check-runin-frame asks, on the same two sanctioned calls.
      const line = cd._finishLineWorldPoint(st.finishT);
      if (!line) return;
      const p = cd._proj.toScreen(line, cd.zoom, cd.offsetX, cd.offsetY);
      const margin = Math.min(p.x, CW - p.x, p.y, CH - p.y);
      if (margin >= 0) everIn = true;
      if (!everIn) return;
      if (margin < 0) trailed++;
      if (margin < worstMargin) worstMargin = margin;
    },
    { slowmo: true },
  );

  if (engagedMs === null || lastComposingMs === null) return null;
  const hold = (releasedMs ?? lastComposingMs) - engagedMs;
  const sweep = releasedMs === null ? null : lastComposingMs - releasedMs;
  return { hold, sweep, trailed, worstMargin: worstMargin === Infinity ? null : worstMargin };
}

console.log(
  `run-in pace at three values of runInOpenMs — seed ${SEED}, 20 racers, ten tracks.\n` +
    `hold and sweep in seconds; "trail" is frames at the very end where the shot is wide enough\n` +
    `but the camera has not arrived, with the worst margin in px.\n`,
);
const head = VALUES.map((v) => `${String(v).padStart(4)} ms: hold  sweep  trail`).join("   ");
console.log(`${"track".padEnd(15)} ${head}`);

for (const geo of loadTracks()) {
  const cells = [];
  for (const v of VALUES) {
    const m = measure(geo, v);
    if (!m) {
      cells.push("        —      —      —");
      continue;
    }
    const sweep = m.sweep === null ? "   —  " : `${(m.sweep / 1000).toFixed(2)}s`;
    const trail =
      m.trailed === 0 ? "   0  " : `${String(m.trailed).padStart(3)}/${Math.round(m.worstMargin)}`;
    cells.push(`        ${(m.hold / 1000).toFixed(2)}s ${sweep} ${trail}`);
  }
  console.log(`${geo.id.padEnd(15)}${cells.join("")}`);
}

console.log(
  `\nNothing was written: defaults.js is untouched and runInOpenMs keeps its shipped value.`,
);
