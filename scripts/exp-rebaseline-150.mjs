// ============================================================
// File:        scripts/exp-rebaseline-150.mjs
// Project:     RaceArena
// Description: THE re-baseline gate after shipping normalSpeedPxPerSec = 150. One canonical arm (the
//              shipped defaults: 150 px/s, gap-reroll ON default, per-track canonical laps/seconds),
//              N=100 per standard track (2 open + 2 closed) => ~400 pooled races, racer-row weighted
//              band-reach. Reports pooled + per-track: band-reach (primary), runaway/parade/duo, dead
//              finales, front@line, finale lead-changes / distinct leaders, escape depth, and the
//              saturated-correction rate (servo pinned at its ceiling in the late window, from
//              --speed-source). A second reduced-N pass scales duration (incl. a 300 s-equivalent shape)
//              to confirm the baseline holds when races run long. Read-only observers; no steering.
//
// Usage: node scripts/exp-rebaseline-150.mjs [--races=100] [--seed=1] [--jobs=4] [--scale-races=25]
// ============================================================
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, isAbsolute, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyRace,
  RUNAWAY_PARADE_DEFAULTS,
} from "./sim/observers/runaway-parade.mjs";
import { summarizeEpisodes } from "./sim/observers/escape-episodes.mjs";
import {
  deriveRaceDuration,
  trackDefaultLaps,
  trackDefaultSeconds,
  paceSpeedPxPerSec,
} from "../client/src/modules/durationModel.js";
import {
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_BASE_SPEED_CONFIG,
} from "../client/src/modules/storage/defaults.js";

const pExecFile = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argVal = (k, d) => {
  const m = argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};

const NORMAL_SPEED = DEFAULT_BASE_SPEED_CONFIG.normalSpeedPxPerSec; // the shipped pick (150)
const RACES = Number(argVal("races", "100"));
const SCALE_RACES = Number(argVal("scale-races", "25"));
const SEED = Number(argVal("seed", "1"));
const JOBS = Math.max(1, Number(argVal("jobs", "4")));
const OUT_ABS = (() => {
  const r = argVal("out", "reports/parity/rebaseline-data");
  return isAbsolute(r) ? r : join(ROOT, r);
})();
const TMP_ABS = join(ROOT, "client/tmp/exp-rebaseline-150");
const toSimOut = (a) => relative(ROOT, a).replace(/\\/g, "/");

const TRACK_IDS = ["luger-hill", "mountainstreet", "searound", "dirt-oval"];
const TYPE_MULT = { luge: 1.1, boarder: 1.0, manta: 1.1, horse: 1.0 };
const trackSeed = (id) =>
  JSON.parse(
    readFileSync(join(ROOT, "server/seeds/tracks", `${id}.json`), "utf8"),
  );
const TRACKS = TRACK_IDS.map((id) => {
  const s = trackSeed(id);
  return {
    id,
    seed: s,
    racer: s.defaultRacerTypeId,
    closed: !!s.closed,
    pathLengthPx: s.pathLengthPx ?? 0,
  };
});
const RACERS_CLOSED = 40,
  RACERS_OPEN = 60;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pctl = (a, p) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[
    Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))
  ];
};
const r3 = (x) => (x == null ? "" : +Number(x).toFixed(3));
const pct = (x) => (x == null ? "n/a" : (x * 100).toFixed(1) + "%");
const fg = (line, r = 3) => {
  if (!line?.gaps?.length) return null;
  let c = 0,
    n = 1;
  for (const g of line.gaps) {
    c += g;
    if (c <= r) n++;
    else break;
  }
  return n;
};

/** Derived realized race duration for a track at the shipped pace (canonical per-track default). */
function derivedDuration(track) {
  const M = TYPE_MULT[track.racer] ?? 1.0;
  const pace = paceSpeedPxPerSec(NORMAL_SPEED, M);
  const runout = DEFAULT_RACE_BEHAVIOR_CONFIG.runoutZone;
  const laps = track.closed ? trackDefaultLaps(track.seed) : 1;
  const requestedSeconds = track.closed
    ? 0
    : trackDefaultSeconds(track.seed, track.pathLengthPx, pace, runout);
  const m = deriveRaceDuration({
    isOpen: !track.closed,
    pathLengthPx: track.pathLengthPx,
    laps,
    requestedSeconds,
    normalSpeedPxPerSec: NORMAL_SPEED,
    speedMultiplier: M,
    runoutZone: runout,
  });
  return {
    durSec: m.realizedDurationSec,
    paceScale: m.paceScale,
    slowdown: !!m.slowdownActive,
  };
}

/** Aggregate the servo-saturated-correction rate from a speed-source.json (late-window top-15 samples). */
function servoSaturatedRate(ssJson) {
  let sat = 0,
    tot = 0;
  for (const race of ssJson.races ?? []) {
    const samples = race.speedSource?.samples ?? {};
    for (const prog of Object.keys(samples)) {
      for (const rec of samples[prog]) {
        tot++;
        if (rec.servoSaturated) sat++;
      }
    }
  }
  return { rate: tot ? sat / tot : null, samples: tot };
}

async function runTrack(track, races, { durSec = null } = {}) {
  const nRacers = track.closed ? RACERS_CLOSED : RACERS_OPEN;
  const tag = durSec == null ? track.id : `${track.id}-dur${durSec}`;
  const outAbs = join(TMP_ABS, tag);
  const args = [
    "scripts/sim-fairness.mjs",
    `--track=${track.id}`,
    `--racer=${track.racer}`,
    `--seed=${SEED}`,
    `--races=${races}`,
    `--racers=${nRacers}`,
    `--normalSpeed=${NORMAL_SPEED}`,
    ...(durSec == null ? ["--track-defaults"] : [`--dur=${durSec}`]),
    // gap-reroll left at the shipped default (flagless ON): the canonical shipped game.
    "--runaway-parade",
    "--hero-map",
    "--escape-latency",
    "--speed-source",
    "--skip-main-output",
    `--out=${toSimOut(outAbs)}`,
  ];
  const t0 = Date.now();
  await pExecFile(process.execPath, args, {
    cwd: ROOT,
    maxBuffer: 512 * 1024 * 1024,
  });
  const rp = JSON.parse(
    readFileSync(join(outAbs, "runaway-parade.json"), "utf8"),
  );
  const el = JSON.parse(
    readFileSync(join(outAbs, "escape-latency.json"), "utf8"),
  );
  const hm = JSON.parse(readFileSync(join(outAbs, "hero-map.json"), "utf8"));
  const ssPath = join(outAbs, "speed-source.json");
  let ssRate = { rate: null, samples: 0 };
  try {
    ssRate = servoSaturatedRate(JSON.parse(readFileSync(ssPath, "utf8")));
  } catch {
    /* speed-source optional */
  }
  const elByIdx = new Map(el.races.map((r) => [r.raceIdx, r.escapeLatency]));
  const rows = rp.races.map((rec) => {
    const raw = rec.runawayParade;
    const c = classifyRace(raw, RUNAWAY_PARADE_DEFAULTS);
    const e = elByIdx.get(rec.raceIdx) ?? {};
    return {
      track: track.id,
      seed: rec.seed,
      finaleLead: raw.leadChangeCount ?? 0,
      finaleDistinct: raw.lateDistinctLeaders ?? 0,
      dead: (raw.leadChangeCount ?? 0) === 0 ? 1 : 0,
      frontGroupAtLine: fg(raw.line),
      gapP1P2: raw.line?.gaps?.[0] ?? null,
      gapP2P3: raw.line?.gaps?.[1] ?? null,
      runaway: c.runawayWinner ? 1 : 0,
      parade: c.paradeFinish ? 1 : 0,
      escapeDepthLen: e.escapeDepthLen ?? null,
    };
  });
  const dd =
    durSec == null
      ? derivedDuration(track)
      : { durSec, paceScale: null, slowdown: null };
  return {
    track,
    rows,
    durSec: dd.durSec,
    paceScale: dd.paceScale,
    slowdown: dd.slowdown,
    episodes: el.races.map((r) => r.escapeLatency),
    bandReach: hm.fairness?.bandReach ?? null,
    startRowUnfair: hm.fairness?.startRowUnfair ?? null,
    startRowMinPHolm: hm.fairness?.startRowMinPHolm ?? null,
    servoSatRate: ssRate.rate,
    servoSatSamples: ssRate.samples,
    nRacerRows: races * nRacers,
    _secs: (Date.now() - t0) / 1000,
  };
}

function aggregate(runs, allRows) {
  const rows = runs.flatMap((r) => r.rows);
  const depths = rows.map((r) => r.escapeDepthLen).filter((x) => x != null);
  const wSum = runs.reduce(
    (s, r) => s + (r.bandReach != null ? r.nRacerRows : 0),
    0,
  );
  const bandReachPooled = wSum
    ? runs.reduce(
        (s, r) => s + (r.bandReach != null ? r.bandReach * r.nRacerRows : 0),
        0,
      ) / wSum
    : null;
  const satSum = runs.reduce(
    (s, r) => s + (r.servoSatRate != null ? r.servoSatSamples : 0),
    0,
  );
  const servoSatPooled = satSum
    ? runs.reduce(
        (s, r) =>
          s + (r.servoSatRate != null ? r.servoSatRate * r.servoSatSamples : 0),
        0,
      ) / satSum
    : null;
  const TIGHT = pctl(
    allRows.map((r) => r.gapP1P2).filter((x) => x != null),
    25,
  );
  const FAR = pctl(
    allRows.map((r) => r.gapP2P3).filter((x) => x != null),
    75,
  );
  const duo = rows.filter(
    (r) =>
      r.gapP1P2 != null &&
      r.gapP2P3 != null &&
      r.gapP1P2 <= TIGHT &&
      r.gapP2P3 >= FAR,
  ).length;
  return {
    nRaces: rows.length,
    bandReachPooled,
    holmFlaggedTracks: runs.filter((r) => r.startRowUnfair === true).length,
    holmTracksTotal: runs.length,
    deadRate: mean(rows.map((r) => r.dead)),
    frontGroupAtLine: mean(rows.map((r) => r.frontGroupAtLine ?? 0)),
    finaleLead: mean(rows.map((r) => r.finaleLead)),
    finaleDistinct: mean(rows.map((r) => r.finaleDistinct)),
    runawayRate: mean(rows.map((r) => r.runaway)),
    paradeRate: mean(rows.map((r) => r.parade)),
    duoRate: rows.length ? duo / rows.length : null,
    escapeDepthMed: pctl(depths, 50),
    escapeDepthP90: pctl(depths, 90),
    escapeDepthMax: depths.length ? Math.max(...depths) : null,
    servoSatPooled,
    ep: summarizeEpisodes(runs.flatMap((r) => r.episodes)),
    durMean: mean(runs.map((r) => r.durSec)),
    slowdownTracks: runs.filter((r) => r.slowdown === true).length,
  };
}

async function pool(tasks) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(JOBS, tasks.length) }, async () => {
      while (i < tasks.length) {
        const k = i++;
        out[k] = await tasks[k]();
      }
    }),
  );
  return out;
}

// ── run ───────────────────────────────────────────────────────────────────────────────────────
mkdirSync(OUT_ABS, { recursive: true });
console.log(
  `\n=== RE-BASELINE GATE — shipped defaults, normalSpeed ${NORMAL_SPEED} px/s ===`,
);
console.log(
  `tracks ${TRACK_IDS.join(", ")} | N=${RACES}/track => ${RACES * TRACKS.length} pooled races | racers ${RACERS_CLOSED} closed / ${RACERS_OPEN} open | canonical per-track defaults | gap-reroll ON default`,
);

const runs = await pool(TRACKS.map((t) => () => runTrack(t, RACES)));
const allRows = runs.flatMap((r) => r.rows);
const agg = aggregate(runs, allRows);

// Per-track table
console.log(
  `\ntrack           topo   N   bandReach  Holm  dead   front@line  runaway  parade   duo   escDepMed  escDepP90  servoSat   durSec`,
);
const perTrack = runs.map((r) => {
  const a = aggregate([r], allRows);
  console.log(
    `${r.track.id.padEnd(15)} ${(r.track.closed ? "closed" : "open").padEnd(6)} ${String(a.nRaces).padStart(3)}  ${pct(r.bandReach).padStart(8)}  ${(r.startRowUnfair ? "UNF" : "ok").padStart(4)}  ${pct(a.deadRate).padStart(5)} ${a.frontGroupAtLine.toFixed(2).padStart(11)} ${pct(a.runawayRate).padStart(8)} ${pct(a.paradeRate).padStart(7)} ${pct(a.duoRate).padStart(6)} ${String(r3(a.escapeDepthMed)).padStart(10)} ${String(r3(a.escapeDepthP90)).padStart(10)} ${pct(r.servoSatRate).padStart(9)} ${r.durSec.toFixed(1).padStart(7)}`,
  );
  return {
    track: r.track.id,
    closed: r.track.closed,
    bandReach: r.bandReach,
    startRowUnfair: r.startRowUnfair,
    startRowMinPHolm: r.startRowMinPHolm,
    servoSatRate: r.servoSatRate,
    durSec: r.durSec,
    ...a,
  };
});

console.log(`\n── POOLED (${agg.nRaces} races) ──`);
console.log(
  `band-reach (racer-row weighted) : ${pct(agg.bandReachPooled)}   ${agg.bandReachPooled >= 0.7 ? "CLEARS 70%" : "BELOW 70%"}`,
);
console.log(
  `Holm-unfair start-row tracks    : ${agg.holmFlaggedTracks}/${agg.holmTracksTotal}`,
);
console.log(
  `runaway / parade / duo          : ${pct(agg.runawayRate)} / ${pct(agg.paradeRate)} / ${pct(agg.duoRate)}`,
);
console.log(`dead finales                    : ${pct(agg.deadRate)}`);
console.log(
  `front group @ line              : ${agg.frontGroupAtLine.toFixed(2)}`,
);
console.log(
  `finale lead-changes / distinct  : ${agg.finaleLead.toFixed(2)} / ${agg.finaleDistinct.toFixed(2)}`,
);
console.log(
  `escape depth med / p90 / max    : ${r3(agg.escapeDepthMed)} / ${r3(agg.escapeDepthP90)} / ${r3(agg.escapeDepthMax)}`,
);
console.log(`saturated-correction rate       : ${pct(agg.servoSatPooled)}`);
console.log(`mean derived duration           : ${agg.durMean.toFixed(1)} s`);

// 70% verdict
const verdictPass = agg.bandReachPooled != null && agg.bandReachPooled >= 0.7;
console.log(
  `\n=== 70% VERDICT: band-reach ${pct(agg.bandReachPooled)} pooled ${verdictPass ? "CLEARS" : "DOES NOT CLEAR"} 70% at shipped config ===`,
);

// ── duration-scaling pass (reduced N; includes a 300 s-equivalent shape) ─────────────────────────
const DUR_VARIANTS = argVal("dur-variants", "30,120,300")
  .split(",")
  .map(Number)
  .filter((x) => x > 0);
console.log(
  `\n=== DURATION-SCALING PASS (N=${SCALE_RACES}/track/dur) — protocol seconds ${DUR_VARIANTS.join(" / ")} ===`,
);
const scaleTasks = [];
for (const d of DUR_VARIANTS)
  for (const t of TRACKS)
    scaleTasks.push(() => runTrack(t, SCALE_RACES, { durSec: d }));
const scaleRuns = await pool(scaleTasks);
const scaleAllRows = scaleRuns.flatMap((r) => r.rows);
console.log(
  `\ndur   track           bandReach  runaway  parade   dead   servoSat`,
);
const scaleRows = [];
for (const d of DUR_VARIANTS) {
  for (const t of TRACKS) {
    const r = scaleRuns.find((x) => x.track.id === t.id && x.durSec === d);
    const a = aggregate([r], scaleAllRows);
    console.log(
      `${String(d).padStart(3)}s  ${t.id.padEnd(15)} ${pct(r.bandReach).padStart(8)}  ${pct(a.runawayRate).padStart(8)} ${pct(a.paradeRate).padStart(7)} ${pct(a.deadRate).padStart(5)} ${pct(r.servoSatRate).padStart(9)}`,
    );
    scaleRows.push({
      dur: d,
      track: t.id,
      bandReach: r.bandReach,
      runawayRate: a.runawayRate,
      paradeRate: a.paradeRate,
      deadRate: a.deadRate,
      servoSatRate: r.servoSatRate,
    });
  }
  const dRuns = scaleRuns.filter((x) => x.durSec === d);
  const dAgg = aggregate(dRuns, scaleAllRows);
  console.log(
    `      ${("POOLED " + d + "s").padEnd(15)} ${pct(dAgg.bandReachPooled).padStart(8)}  ${pct(dAgg.runawayRate).padStart(8)} ${pct(dAgg.paradeRate).padStart(7)} ${pct(dAgg.deadRate).padStart(5)} ${pct(dAgg.servoSatPooled).padStart(9)}`,
  );
}

// ── write machine-readable output ────────────────────────────────────────────────────────────
writeFileSync(
  join(OUT_ABS, "rebaseline-150.json"),
  JSON.stringify(
    {
      normalSpeed: NORMAL_SPEED,
      races: RACES,
      seed: SEED,
      scaleRaces: SCALE_RACES,
      pooled: agg,
      perTrack,
      verdictPass,
      durationScaling: scaleRows,
    },
    null,
    2,
  ) + "\n",
);
console.log(`\nwrote ${join(OUT_ABS, "rebaseline-150.json")}`);
