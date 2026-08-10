// ============================================================
// File:        scripts/scoreboard-bench.mjs
// Project:     RaceArena — SCOREBOARD-SLOT-LAYER
//
// WHAT THIS MEASURES: whether the live standings still cost the browser anything, at the moment the
// owner's symptom actually lives — the PACKED EARLY PHASE, where every racer's place is changing
// several times a second and the list has the most work to do.
//
// FOUR NUMBERS PER ARM, and they answer different questions:
//   missed   — the share of frames the display did not get. The only number a viewer can see.
//   total    — the interval between consecutive rAF timestamps. p50 says what a normal frame costs;
//              the misses are always a tail, so p90 is where they show.
//   rafLate  — `performance.now()` at callback entry minus the timestamp rAF handed in: how long the
//              browser spent on ITSELF (style, layout, paint, composite) before reaching our code.
//              This is the half of a long frame no change to our draw code can shorten, and it is
//              what the previous two blocks moved.
//   stair    — the mean rise of `rafLate` from one frame to the next across an UNBROKEN run of
//              frames. It is the drift the owner saw in his own log: the browser wanting ~20 ms per
//              frame where the display offers 16.7, climbing until a frame is dropped and the debt
//              resets. Runs are cut at every missed frame, because the reset is not a rise.
//
// WHY IT DRIVES THE REAL APP AND NOT A HARNESS PAGE: the standings are not the only thing on the
// frame. Their cost matters because it lands on top of the physics, the camera and the canvas draw,
// and a bench that renders the list alone measures a browser with nothing else to do.
//
// WHY IT MUST BE HEADED, and this cost a run to learn: in headless Chromium the race does not
// advance — 25 s of wall clock produced ZERO changes to the standings — so every arm would have
// measured an idle page and agreed.
//
// AND THE BROWSER'S OWN COUNTERS, because on a real working machine the four numbers above are not
// enough. Measured here, the same arm run twice comes back at 16.7 ms one time and 33.3 the next:
// the browser settles into 60 fps or into 30 for a whole window at a time, so a per-run percentile
// is close to a coin flip and four runs cannot separate anything. `Performance.getMetrics` over CDP
// gives CUMULATIVE CPU counters — RecalcStyleCount/Duration, LayoutCount/Duration, ScriptDuration —
// and a delta across the same window measures the WORK rather than whether the machine happened to
// keep up with it. That is the question this block is actually asking.
//
// WHY THE ARMS ROTATE: the machine drifts. Running arm 1 first every time hands it whatever state
// the machine was in at the start.
//
// Usage:
//   node scripts/scoreboard-bench.mjs --arm=<label>=<url> [--arm=...] [--batches=6] [--racers=100]
//                                     [--cadence=250] [--frames=600] [--out=<file.json>]
//   An arm may carry its own cadence:  --arm=slot1000=http://localhost:4273@1000
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const { chromium } = await import(
  pathToFileURL(join(ROOT, "client/node_modules/playwright/index.mjs")).href
);

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const ARMS = argv
  .filter((a) => a.startsWith("--arm="))
  .map((a) => {
    const [label, rest] = a.slice(6).split("=");
    const [url, cadence] = rest.split("@");
    return { label, url, cadence: Number(cadence ?? flag("cadence", 250)) };
  });
if (ARMS.length === 0) {
  console.error("no --arm=<label>=<url> given");
  process.exit(2);
}
const BATCHES = Number(flag("batches", 6));
const RACERS = Number(flag("racers", 100));
const FRAMES = Number(flag("frames", 600));
const TRACK = flag("track", "mountainstreet");
const OUT = flag("out", null);
// Where the MID-RACE window starts, in seconds after the gun. The race is 60 s.
const MID_AT_SEC = Number(flag("midAt", 30));
// THE WINDOW, and it is not a detail: FRAME-GAP-1 established that the frame cost scales with window
// AREA while the canvas backing store stays a constant 1280x720. The default is the owner's own
// maximised browser, measured rather than assumed — 1280 x 665 CSS pixels on a 1.5x display. A bench
// run at a window he never uses measures a machine he never uses.
const VW = Number(flag("width", 1280));
const VH = Number(flag("height", 665));

const geo = JSON.parse(readFileSync(join(ROOT, `server/data/tracks/${TRACK}.json`), "utf8"));

const racers = Array.from({ length: RACERS }, (_, i) => ({
  id: `p${i}`,
  name: `Racer ${i + 1} Longname`,
  icon: "🏇",
  color: "#ff8800",
}));
const activeRace = {
  racers,
  trackId: geo.id,
  trackName: geo.name ?? geo.id,
  geometryId: geo.id,
  racerTypeId: geo.defaultRacerTypeId ?? "horse",
  worldWidth: geo.worldWidth ?? 1280,
  worldHeight: geo.worldHeight ?? 720,
  duration: 60,
  eventName: "scoreboard-bench",
  winners: 3,
  raceMode: "time",
  targetDurationSec: 60,
  realizedDurationSec: 60,
  paceScale: 1,
  trackSurfaceClasses: geo.surfaceClasses ?? [],
  racePlanEnabled: true,
  racePlanSeed: 0,
  timestamp: "2026-08-10T00:00:00.000Z",
};

/** One frame train, reduced to the four numbers. */
function stats(frames) {
  const n = frames.length;
  if (n < 3) return null;
  const intervals = [];
  const late = [];
  for (let i = 1; i < n; i++) {
    intervals.push(frames[i][0] - frames[i - 1][0]);
    late.push(frames[i][1] - frames[i][0]);
  }
  // A missed frame is one the display did not get: more than 1.5 refresh intervals since the last.
  const MISS = 25; // 1.5 x 16.667 ms
  const missed = intervals.filter((d) => d > MISS).length;
  // The staircase: the mean per-frame rise of rafLate inside runs that were not interrupted by a
  // missed frame. A reset after a drop is not a rise and must not be averaged in.
  let rise = 0;
  let steps = 0;
  for (let i = 1; i < late.length; i++) {
    if (intervals[i] > MISS) continue; // the train broke here
    rise += late[i] - late[i - 1];
    steps++;
  }
  const pct = (arr, p) => {
    const s = [...arr].sort((a, b) => a - b);
    return +s[Math.min(s.length - 1, Math.floor(((s.length - 1) * p) / 100))].toFixed(2);
  };
  return {
    frames: n,
    missed,
    missedPct: +((100 * missed) / intervals.length).toFixed(3),
    totalP50: pct(intervals, 50),
    totalP90: pct(intervals, 90),
    lateP50: pct(late, 50),
    lateP90: pct(late, 90),
    stair: steps ? +(rise / steps).toFixed(3) : null,
  };
}

/** Run one arm once and return its two windows. */
async function runArm(arm) {
  const browser = await chromium.launch({
    headless: false,
    args: [
      // A headed window that another window covers is treated as occluded and its rendering is
      // throttled, which would make an arm's number depend on what happened to be on top of it.
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=CalculateNativeWinOcclusion",
      "--window-position=0,0",
    ],
  });
  try {
    const ctx = await browser.newContext({ viewport: { width: VW, height: VH } });
    await ctx.addInitScript(
      ({ geo, activeRace, cadence }) => {
        localStorage.setItem(
          "racearena:lastUser",
          JSON.stringify({ name: "bench", role: "admin" })
        );
        localStorage.setItem("racearena:trackGeometries:index", JSON.stringify([geo.id]));
        localStorage.setItem(`racearena:trackGeometries:${geo.id}`, JSON.stringify(geo));
        localStorage.setItem(
          "racearena:frameTimingConfig",
          JSON.stringify({ scoreboardIntervalMs: cadence })
        );
        sessionStorage.setItem("activeRace", JSON.stringify(activeRace));
        // THE INSTRUMENT. It wraps rAF rather than reading the app's own perf log, so both arms are
        // measured by identical code that neither of them contains — and so the ring buffer's 600
        // frame limit and the log's own cost play no part. Several callers share one frame, so the
        // timestamp is deduplicated; `t0` is taken before the app's callback runs.
        const raf = window.requestAnimationFrame.bind(window);
        window.__f = [];
        window.requestAnimationFrame = (cb) =>
          raf((ts) => {
            const t0 = performance.now();
            const f = window.__f;
            if (f.length === 0 || f[f.length - 1][0] !== ts) f.push([ts, t0]);
            return cb(ts);
          });
      },
      { geo, activeRace, cadence: arm.cadence }
    );
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`${arm.url}/race`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".scoreboard-card, .scoreboard-row", { timeout: 30_000 });
    // THE GUN: the countdown badge is present through the start ceremony and gone once the race is
    // running. Waiting on it rather than on a fixed delay matters — the ceremony's length scales
    // with the field size.
    await page.waitForFunction(() => !document.querySelector(".race-phase-badge--countdown"), null, {
      timeout: 60_000,
    });
    // The browser's own CPU counters. Cumulative since the page loaded, so every reading below is a
    // DELTA across exactly the frame window it accompanies.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const counters = async () => {
      const { metrics } = await cdp.send("Performance.getMetrics");
      const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
      return {
        recalcStyleCount: m.RecalcStyleCount ?? 0,
        recalcStyleMs: 1000 * (m.RecalcStyleDuration ?? 0),
        layoutCount: m.LayoutCount ?? 0,
        layoutMs: 1000 * (m.LayoutDuration ?? 0),
        scriptMs: 1000 * (m.ScriptDuration ?? 0),
        taskMs: 1000 * (m.TaskDuration ?? 0),
      };
    };
    const deltaOf = (a, b) =>
      Object.fromEntries(Object.keys(a).map((k) => [k, +(b[k] - a[k]).toFixed(2)]));

    const gun = await page.evaluate(() => window.__f.length);
    const gunWall = Date.now();

    // PACKED EARLY — from the gun. This is where the owner's symptom lives: the field has not spread
    // yet, so nearly every place changes on nearly every tick.
    const collect = async (from) => {
      // Fail SOFT. A window that cannot be filled means the race ended under it, and a bench that
      // throws there loses every arm already measured in this batch.
      try {
        await page.waitForFunction((need) => window.__f.length >= need, from + FRAMES, {
          timeout: 40_000,
        });
      } catch {
        /* take whatever the window got; `stats` returns null if it is too short */
      }
      return page.evaluate(([a, b]) => window.__f.slice(a, b), [from, from + FRAMES]);
    };
    const c0 = await counters();
    const early = await collect(gun);
    const c1 = await counters();

    // MID-RACE — the same field, spread out, so far fewer places change per tick. Anchored on WALL
    // time since the gun rather than on a frame count, because the race is 60 s of wall clock and a
    // frame-count anchor would land in a different part of it on a slower machine.
    await page.waitForTimeout(Math.max(0, MID_AT_SEC * 1000 - (Date.now() - gunWall)));
    const midStart = await page.evaluate(() => window.__f.length);
    const c2 = await counters();
    const mid = await collect(midStart);
    const c3 = await counters();
    return {
      early: stats(early),
      mid: stats(mid),
      earlyWork: deltaOf(c0, c1),
      midWork: deltaOf(c2, c3),
      errors,
    };
  } finally {
    await browser.close();
  }
}

const results = [];
for (let batch = 0; batch < BATCHES; batch++) {
  // Rotate the order every batch, so no arm is always first.
  const order = ARMS.map((_, i) => ARMS[(i + batch) % ARMS.length]);
  for (const arm of order) {
    const r = await runArm(arm);
    results.push({ batch, arm: arm.label, cadence: arm.cadence, ...r });
    const f = (s) =>
      s
        ? `miss ${String(s.missedPct).padStart(6)}%  total ${s.totalP50}/${s.totalP90}  late ${s.lateP50}/${s.lateP90}  stair ${s.stair}`
        : "—";
    const w = (k) =>
      r[k]
        ? `style ${r[k].recalcStyleCount}x/${r[k].recalcStyleMs}ms  layout ${r[k].layoutCount}x/${r[k].layoutMs}ms  script ${r[k].scriptMs}ms  task ${r[k].taskMs}ms`
        : "—";
    console.log(
      `batch ${batch}  ${arm.label.padEnd(12)} @${String(arm.cadence).padStart(4)}ms  EARLY ${f(r.early)}`
    );
    console.log(`${" ".repeat(38)}${w("earlyWork")}`);
    console.log(`${" ".repeat(28)}  MID   ${f(r.mid)}`);
    console.log(`${" ".repeat(38)}${w("midWork")}`);
    if (r.errors.length) console.log("  page errors:", r.errors);
  }
}

// ── Pooled, per arm and phase. Pooling the raw counts rather than averaging the per-batch rates,
// because a rate over 600 frames and a rate over 600 frames are the same weight only by accident.
const median = (xs) => {
  const s = xs.filter((v) => v != null).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return +(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(3);
};

console.log("\n── POOLED: the frame train ──");
console.log("(MEDIAN across batches, not the mean — one stalled run reads 1016 ms and would own a mean)");
for (const arm of ARMS) {
  for (const phase of ["early", "mid"]) {
    const rows = results.filter((r) => r.arm === arm.label && r[phase]);
    if (!rows.length) continue;
    const frames = rows.reduce((a, r) => a + r[phase].frames, 0);
    const missed = rows.reduce((a, r) => a + r[phase].missed, 0);
    const med = (k) => median(rows.map((r) => r[phase][k]));
    console.log(
      `${arm.label.padEnd(12)} @${String(arm.cadence).padStart(4)}ms ${phase.padEnd(6)}` +
        ` n=${frames}  missed ${String(missed).padStart(4)} (${((100 * missed) / frames).toFixed(1)}%)` +
        `  total ${med("totalP50")}/${med("totalP90")}` +
        `  rafLate ${med("lateP50")}/${med("lateP90")}` +
        `  stair ${med("stair")}  [missed% per batch: ${rows.map((r) => r[phase].missedPct.toFixed(0)).join(" ")}]`
    );
  }
}

console.log("\n── POOLED: the browser's own CPU counters, per 100 frames ──");
console.log("(the load-robust half: this measures the WORK, not whether the machine kept up with it)");
for (const arm of ARMS) {
  for (const [phase, wk] of [
    ["early", "earlyWork"],
    ["mid", "midWork"],
  ]) {
    const rows = results.filter((r) => r.arm === arm.label && r[wk] && r[phase]);
    if (!rows.length) continue;
    const per = (k) => median(rows.map((r) => (100 * r[wk][k]) / r[phase].frames));
    console.log(
      `${arm.label.padEnd(12)} @${String(arm.cadence).padStart(4)}ms ${phase.padEnd(6)}` +
        ` style ${per("recalcStyleCount")}x / ${per("recalcStyleMs")}ms` +
        `  layout ${per("layoutCount")}x / ${per("layoutMs")}ms` +
        `  script ${per("scriptMs")}ms  task ${per("taskMs")}ms`
    );
  }
}

if (OUT) {
  writeFileSync(OUT, JSON.stringify({ ARMS, BATCHES, RACERS, FRAMES, TRACK, results }, null, 2));
  console.log(`\nwritten: ${OUT}`);
}
