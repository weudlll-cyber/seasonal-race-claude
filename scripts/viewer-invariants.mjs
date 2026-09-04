// ============================================================
// File:        scripts/viewer-invariants.mjs
// Project:     RaceArena — VIEWER-INVARIANTS-1
//
// THE FIVE SENTENCES, CHECKED IN A REAL BROWSER ON THE PRODUCTION BUILD, REPORTED AS EVENTS.
//
// ── WHY THE BROWSER, AND WHY THIS FILE EXISTS AT ALL ──────────────────────────────────────────
//
// Every camera instrument in this repository until now has run the headless director through
// `raceDriver`. That path has been proven to diverge from the owner's screen TWICE, and both times
// the headless side was the blind one — the camera's random seed (CAMERA-SEED-AND-LINE-1) and the
// whole draw path (RENDER-FINGERPRINT-1). This drives the SHIPPED BUNDLE in Chromium and reads the
// probe the renderer itself feeds, so there is nothing left between the measurement and the picture.
//
// ── WHY EVENTS AND NEVER A SHARE ──────────────────────────────────────────────────────────────
//
// Twice now an aggregate has hidden a catastrophe: a 5-frame smoothed derivative averaged away a
// 0.2206 ln single-frame jump, and "the line is findable in 88.0% of frames" turned out to be
// COUNTING the owner's black frame rather than missing it. A run with one catastrophic frame is
// worse than a run with fifty near-misses and no aggregate says that. Every violation below carries
// seed, track, frame index, race progress, which invariant broke and BY HOW MUCH.
//
// ── VIRTUAL TIME, AND WHY IT IS SAFE HERE ─────────────────────────────────────────────────────
//
// A race is ~70 s of wall clock; the sweep the brief asks for is 800 of them, which is 15 hours of
// waiting for real time to pass. So the page runs on a VIRTUAL CLOCK: `performance.now`, `Date.now`
// and `requestAnimationFrame` are driven from one counter advanced by a fixed 1/60 s per frame.
//
// THIS IS NOT A SHORTCUT PAST THE THING BEING MEASURED. Everything the invariants are about — the
// director, the framing rule, the renderer, React, the real bundle — runs unchanged and in the real
// browser; only the clock is ours. The fixed step is also what makes a run REPRODUCIBLE, which
// matters because the camera is known to diverge on any frame-timing change: at 60 fps of wall clock
// two runs of one seed would differ, and a gate that cannot repeat its own failure is not a gate.
//
// Usage:
//   node scripts/viewer-invariants.mjs --tracks=space-sprint --seeds=9 --arm=shipped --headed
//   node scripts/viewer-invariants.mjs --seeds=1-40                    # the nightly sweep
//   node scripts/viewer-invariants.mjs --gate                          # the SHIP gate: 2 races, ~340 s
// ============================================================

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { gradeRace, printSheet } from "./endgame-sheet.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { QUICK_TEST_NAME_SETS, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));

export const GUARD = {
  id: "viewer-invariants",
  covers:
    "the five viewer invariants — some of the course in shot, the leader in shot, the finish line findable through the endgame, no frame changing the picture beyond a stated bound, and the width inside a stated band — checked in a REAL BROWSER on the PRODUCTION BUILD and reported as individual events",
  blind: [
    "anything the DOM draws over the canvas: the winner card, the HUD and the state pill are React",
    "framing TEXTURE — the bounds here are catastrophe lines (a factor of two, a whole canvas width), deliberately far looser than the smoothness budget scripts/diag/endgame-spec.mjs prices",
    "wall-clock frame pacing: the page runs on a fixed 1/60 s virtual clock, so a real dropped frame is not modelled",
    "the WIDE end of invariant 5 is only 'not wider than the world' — a sanity bound, not a framing one; the observed maximum is reported so a real one can be set",
    "seeds and tracks outside the swept set",
  ],
  dirs: ["client/src/modules/camera/", "client/src/screens/RaceScreen/"],
  files: ["client/src/modules/storage/defaults.js", "client/src/modules/viewerProbe.js"],
  reach: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const ARG = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const GATE = process.argv.includes("--gate");
const HEADED = process.argv.includes("--headed");
const DUMP = process.argv.includes("--dump");
// RACE-JUDDER-1: measure DELIVERY instead of framing. Defaults off; the gate and the sweep are
// unaffected, and the two arms' camera numbers are not comparable — see REAL_CLOCK's header.
const REAL = process.argv.includes("--real-clock");
const PACE_OUT = (() => {
  const a = process.argv.find((x) => x.startsWith("--pace-out="));
  return a ? a.slice("--pace-out=".length) : null;
})();
const JSON_OUT = ARG("json", null);
const CW = 1280;
const CH = 720;
const MAX_FRAMES = 14000; // ~233 s of virtual time — past any race this project runs
const PORT = ARG("port", "4173");
let BASE = `http://localhost:${PORT}`; // replaced by the isolated stack below

const seedArg = ARG("seeds", GATE ? "9" : "1-40");
const SEEDS =
  seedArg.includes("-") ?
    (() => {
      const [a, b] = seedArg.split("-").map(Number);
      const o = [];
      for (let i = a; i <= b; i++) o.push(i);
      return o;
    })()
  : seedArg.split(",").map(Number);

// ── HIS CONFIG, the same eleven keys every camera harness in this repository uses ──────────────
// THE ELEVEN KEYS AND `setPath` LIVE IN ONE HOME (ONE-HOME-THREE-TRUTHS-1).
// They were written out identically in this file AND in the other harness; both
// copies agreed, which is the dangerous variant — they would have kept agreeing
// until one was edited, and the divergence would then have read as a change in HIS
// NUMBERS rather than as an error.
import { HIS, setPath } from "./lib/hisArm.mjs";
// `--set=key=value`, applied after the arm, so one build can be measured with a switch on and
// off without rebuilding. Values parse as boolean, number or string, in that order.
const CLI_SET = process.argv
  .filter((a) => a.startsWith("--set="))
  .map((a) => {
    const i = a.indexOf("=", 6);
    const k = a.slice(6, i);
    const raw = a.slice(i + 1);
    const v =
      raw === "true" ? true
      : raw === "false" ? false
      : raw.trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw)
      : raw;
    return [k, v];
  });
const configFor = (arm) => {
  const cfg = structuredClone(DEFAULT_CAMERA_CONFIG);
  if (arm === "his") for (const [p, v] of HIS) setPath(cfg, p, v);
  for (const [p, v] of CLI_SET) setPath(cfg, p, v);
  return cfg;
};

const ARMS = ARG("arm", GATE ? "shipped" : "shipped,his").split(",");
const ROSTER = QUICK_TEST_NAME_SETS[DEFAULT_NAME_SET];

function geometries() {
  const dir = join(ROOT, "server/data/tracks");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")))
    .filter((g) => g.id)
    .sort((a, b) => a.id.localeCompare(b.id));
}
// ── WHAT `--gate` RUNS, AND WHY IT IS TWO RACES (CHECK-COST-POLICY-1, his decision 2026-08-25) ──
//
// It ran TEN — every track at seed 9 — for 671-885 s. Measured, the other eight buy nothing this
// gate exists for:
//
//   THESE TWO HOLD BOTH EXTREMES OF EVERY COLUMN the acceptance sheet reports.
//     space-sprint  the worst single-frame step on any track, 0.0339 ln — twice the next — and the
//                   OPEN-track regime. It is also the track the founding defect was found on.
//     city-circuit  the widest frame, 10.9 corridors against space-sprint's 6.6, and the longest
//                   standstill, 1050 ms against 200. The CLOSED-track regime, where the finish is
//                   most of a lap away at the endgame threshold so the shot opens to the world.
//
//   THE OTHER EIGHT SIT STRICTLY INSIDE BOTH on every column, and across BOTH full 80-race sweeps
//   on record the gate's own scope produced ZERO invariant events. Every violation those sweeps
//   found sits at seed 2, which this gate does not run.
//
// ONE RACE WOULD NOT DO. An open track cannot stand in for a closed one here; that is structural,
// not statistical, and it is why this is two and not one.
//
// WHAT THE TWO-RACE SCOPE NO LONGER COVERS, written down rather than assumed away:
//   - the eight tracks' own geometry: searound's tight corners, luger-hill's gradient, dirt-oval's
//     and river-run's shapes. A defect that needs one of THOSE curves to appear now reaches the
//     nightly sweep instead of the gate, i.e. a day later rather than before the merge.
//   - garden-path entirely. The reason recorded here was that its race never finishes at seed 9,
//     so it was never scorable anyway.
//     ★★ THAT REASON IS FALSE, MEASURED ON THIS HARNESS, 2026-09-04 (GP-SPEC-TRIM-1). Garden-path
//     FINISHES AND IS SCORABLE: it reaches PHOTO_FINISH with the winner on canvas, and is graded on
//     the twelve items — passing ten and FAILING two, item 9 (winner cut) and item 10 (walk).
//
//     ★★ AND THE WIDENING WAS THEN CONSIDERED IN FULL AND STOPPED — GATE-GARDEN-PATH-1, 2026-09-04,
//     16 races. DO NOT REDO THIS WITHOUT READING THAT REPORT; the obvious move has been made and
//     measured. In one paragraph:
//
//       BOTH FAILURES ARE REAL AND NEITHER BELONGS TO GARDEN-PATH. It PASSES item 9 at seeds 1, 2
//       and 3 and item 10 at seeds 1 and 3. Item 9 fails when the PHOTO-FINISH ZOOM HAS NOT ARRIVED
//       AT THE CROSSING — the camera is still on the `level` binding, tightening under the winner,
//       who slides to 0.855 of the frame against a 0.85 bound. Item 10 fails when a BATTLE_ZOOM sits
//       in the endgame window: a battle shot frames the battle, so the leader is held forward and
//       never walks back behind centre. Both are per-RACE camera behaviours, on more than one track.
//
//       SO IT WAS NOT ADDED. The gate runs SEED 9 and nothing else, and seed 9 is exactly where
//       garden-path fails both — a gate that is red the day it is widened is a gate that gets
//       ignored within a week. The two behaviours are picture questions and went to the owner.
//
//     ★ WHAT THE EXCLUSION ACTUALLY COSTS IS NOT A TRACK, AND THIS IS THE PART WORTH KNOWING HERE.
//     Both gate tracks cross with `binding: state` and the camera ALREADY at `photoFinishZoom`, so
//     THIS GATE IS STRUCTURALLY BLIND TO BOTH BEHAVIOURS — not because garden-path is missing, but
//     because neither of its own two races exhibits them. The lever is WHICH RACE the gate runs, not
//     which track. Three excluded tracks fail something at seed 9: garden-path (items 9 and 10) and
//     luger-hill and dirt-oval (item 2) — and item 2's failures are the SAME late-zoom mechanism.
//     The nightly sweep still runs all ten, so all of it is visible a day later rather than never.
//
//     ★★ AND AS OF 2026-09-04 THOSE FAILURES ARE ACCEPTED BEHAVIOUR, WHICH CHANGES WHAT THIS
//     EXCLUSION MEANS (ACCEPTED-FINISH-1). The owner decided the finish sequence stays exactly as
//     it is: the closing zoom need not have arrived by the crossing, and a battle shot may take the
//     frame near the finish. Items 9 and 10 object to precisely those two things, so they encode an
//     ideal HE HAS CONSIDERED AND REJECTED — the full statement, and the CAUSES that are accepted,
//     are at the head of `endgame-sheet.mjs`.
//
//     SO THE EXCLUSION IS NO LONGER JUSTIFIED BY A DEFECT. It is justified by items that object to
//     something wanted, which is a different and weaker reason than the one recorded above. That is
//     reported, not acted on: WIDENING THE GATE NOW WOULD MAKE IT RED ON DAY ONE for behaviour he
//     has accepted, which is the trap GATE-GARDEN-PATH-1 avoided a few hours earlier.
//
//     ★ WHERE EACH EXCLUDED TRACK STANDS, measured over 16 races and NOT the same answer for all
//     three — this is the part a reader will get wrong from memory:
//       garden-path  at seed 9, ITEMS 9 AND 10 AND NOTHING ELSE. Its exclusion rests on the two
//                    accepted items alone, at the seed this gate runs. (Across seeds 1-3 it also
//                    fails item 2, which is behaviour (i) measured directly — still accepted.)
//       luger-hill   item 2 ONLY, and item 2 is NOT one of the two he named. Same behaviour, a
//                    different item; only seed 9 has been measured for this track.
//       dirt-oval    item 2 at seed 9 — but ITEM 7 AT SEED 3, a contender off canvas on 78 frames.
//                    ★ THAT ONE IS NOT ACCEPTED BEHAVIOUR and is not one of the two items. So
//                    dirt-oval's exclusion does NOT rest on accepted behaviour alone, and it is the
//                    one of the three where something real is still hidden by the exclusion.
//   - any per-track regression that is not an extreme: a track drifting WITHIN the envelope these
//     two define is invisible here and was visible before.
// The nightly sweep still runs all ten at forty seeds; this is a question of WHEN a track-specific
// defect is caught, not whether.
const GATE_TRACKS = "space-sprint,city-circuit";
const trackArg = ARG("tracks", GATE ? GATE_TRACKS : null);
const TRACKS = geometries().filter((g) => (trackArg ? trackArg.split(",").includes(g.id) : true));

// ── THE VIRTUAL CLOCK ──────────────────────────────────────────────────────────────────────────
//
// One counter drives `performance.now`, `Date.now` and `requestAnimationFrame`. The pump advances
// it by exactly one 60 Hz frame and then runs whatever rAF callbacks were queued, yielding to the
// real macrotask queue in between so React's own scheduling still happens.
// ── THE REAL-CLOCK ARM (RACE-JUDDER-1) — opt-in, and it answers a question the virtual one cannot ──
//
// The virtual clock is what makes a sweep reproducible, and it is also why a sweep is STRUCTURALLY
// BLIND to frame pacing: measured on space-sprint seed 9 its intervals are 16 ms and 17 ms and
// nothing else, by construction rather than by luck. So "were frames delivered evenly?" cannot be
// asked of it at all — a flat distribution there is an artefact, not evidence.
//
// This arm leaves `requestAnimationFrame` alone and merely COUNTS and TIMES it, presenting the same
// `__vFrames` / `__vStart` / `__vStop` interface the run loop already drives, so nothing else in this
// file changes shape. What it costs is determinism: the camera is known to diverge on any
// frame-timing change, so this arm's CAMERA numbers are not comparable with the virtual arm's and
// must never be quoted beside them. It exists to measure DELIVERY, not framing.
const REAL_CLOCK = `
(() => {
  const rAF = window.requestAnimationFrame.bind(window);
  window.__vFrames = 0;
  window.__pace = [];
  window.__vStop = false;
  let last = -1;
  const tick = (t) => {
    if (window.__vStop) return;
    if (last >= 0) window.__pace.push(+(t - last).toFixed(2));
    last = t;
    window.__vFrames++;
    rAF(tick);
  };
  window.__vStart = () => rAF(tick);
})();
`;

const VIRTUAL_CLOCK = `
(() => {
  const STEP = 1000 / 60;
  const T0 = 1767225600000;           // a fixed wall-clock origin, so Date.now is reproducible too
  let vnow = 0;
  let queue = [];
  let nextId = 1;
  const realPerfNow = performance.now.bind(performance);
  performance.now = () => vnow;
  Date.now = () => T0 + vnow;
  const RealDate = Date;
  window.Date = class extends RealDate {
    constructor(...a) { super(...(a.length ? a : [T0 + vnow])); }
    static now() { return T0 + vnow; }
  };
  window.requestAnimationFrame = (cb) => { const id = nextId++; queue.push([id, cb]); return id; };
  window.cancelAnimationFrame = (id) => { queue = queue.filter(([i]) => i !== id); };
  window.__vFrames = 0;
  window.__vStop = false;
  function pump() {
    if (window.__vStop) return;
    vnow += STEP;
    window.__vFrames++;
    const due = queue;
    queue = [];
    for (const [, cb] of due) { try { cb(vnow); } catch (e) { window.__vError = String(e && e.stack || e); } }
    // Yield to the real macrotask queue so React, promises and timers still run between frames.
    setTimeout(pump, 0);
  }
  window.__vStart = () => { if (!window.__vRunning) { window.__vRunning = true; pump(); } };
  window.__realNow = realPerfNow;
})();
`;

async function runOne(page, geo, seed, arm, N) {
  const cfg = configFor(arm);
  const racers = Array.from({ length: N }, (_, i) => ({
    name: ROSTER[i % ROSTER.length],
    color: `hsl(${(i * 137) % 360} 70% 55%)`,
    icon: "🐴",
  }));
  const isOpen = !geo.closed;
  const activeRace = {
    racers,
    trackId: geo.id,
    trackName: geo.name ?? geo.id,
    geometryId: geo.geometryId ?? geo.id,
    racerTypeId: geo.defaultRacerTypeId ?? "horse",
    worldWidth: geo.worldWidth ?? 1280,
    worldHeight: geo.worldHeight ?? 720,
    duration: 60,
    winners: 3,
    raceMode: isOpen ? "time" : "laps",
    targetDuration: 60,
    targetLaps: 2,
    eventName: "VIEWER-INVARIANTS-1",
    // RACE PLAN ON, and the seed the camera derives from — the two things his races carry.
    racePlanEnabled: true,
    racePlanSeed: seed,
    timestamp: new Date(0).toISOString(),
  };

  await page.addInitScript(
    ({ geo, activeRace, cfg, clock, dump }) => {
      localStorage.setItem(
        `racearena:trackGeometries:${activeRace.geometryId}`,
        JSON.stringify(geo)
      );
      localStorage.setItem("racearena:cameraConfig", JSON.stringify(cfg));
      sessionStorage.setItem("activeRace", JSON.stringify(activeRace));
      sessionStorage.setItem("_ra_viewerprobe", "1");
      if (dump) sessionStorage.setItem("_ra_viewerdump", "1");
      // eslint-disable-next-line no-eval
      (0, eval)(clock);
    },
    { geo, activeRace, cfg, clock: REAL ? REAL_CLOCK : VIRTUAL_CLOCK, dump: DUMP }
  );

  await page.goto(`${BASE}/race`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.__vStart && window.__vStart());

  // Run until the race has crossed the line, or the frame cap is hit.
  const res = await page.evaluate(async (MAX) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let stalled = 0;
    let last = -1;
    for (;;) {
      await sleep(25);
      const f = window.__vFrames ?? 0;
      const p = window.__viewerProbe ? window.__viewerProbe() : null;
      if (window.__vError) return { error: window.__vError, probe: p, frames: f };
      if (f >= MAX) break;
      if (f === last) {
        if (++stalled > 200) return { error: "the virtual clock stopped advancing", probe: p, frames: f };
      } else stalled = 0;
      last = f;
      // Stop once the probe has seen the crossing: it stops recording invariant 3 then, and the
      // rest of the ending is the finish ceremony, which these five sentences do not govern.
      // WINNER-CROSSING-1: run ON past the crossing, far enough to record how the winner is framed
      // through it. Stopping AT the crossing is why nothing in this repository ever graded it.
      if (p && p.frames > 60 && p.crossed && (p.crossing?.after?.length ?? 0) >= 255) break;
    }
    window.__vStop = true;
    return {
      probe: window.__viewerProbe ? window.__viewerProbe() : null,
      frames: window.__vFrames,
      pace: window.__pace ?? null,
    };
  }, MAX_FRAMES);

  return { geo: geo.id, seed, arm, N, ...res };
}

// ── THE ISOLATED STACK, AND WHY THE SWEEP DOES NOT USE PORT 4000 ──────────────────────────────
//
// The client resolves its API from `VITE_API_URL`, baked at BUILD time, defaulting to
// `localhost:4000` — which on this machine is the OWNER'S OWN API, with his data, his tracks and
// his login. E2E-LOGIN-1 exists because a previous config pointed at exactly that and silently
// tested his instance; its rule stands here.
//
// So the sweep runs against its own API on its own port, with its own empty data directory and its
// own generated account, and against a build whose only difference from the shipped one is that
// baked URL. Everything these five sentences are about — the director, the framing rule, the
// renderer, React, the bundle — is byte-identical to what is served on 4173 for his eye. NOTHING
// here is a secret at rest: every value is random per run and lives only in this process.
// Named rather than written inline. The listening-state word netstat prints is LOCALISED — this
// machine does not print it in English, and this repository has already been caught reading a live
// server as down because a check grepped for the English spelling. Matching the first three letters
// covers both. The split and trim patterns are named for a duller reason: they would otherwise have
// to survive several layers of quoting to reach this file intact.
const NEWLINE = /\r?\n/;
const SPACES = /\s+/;
const LISTENING = /LISTEN|ABH/i;

// ── AN INSTRUMENT MUST FAIL, NOT HANG (INSTRUMENT-FAILS-LOUD-1, his decision 2026-09-04) ────────
//
// THE INCIDENT. This sweep's first run hung for FIFTEEN MINUTES with no output at all: `dist-sweep`
// empty, nothing listening on the app port, and nothing on the console to say so. Run by hand the
// same build succeeds in 873 ms.
//
// THE MECHANISM, and there are three faults in four lines, each of which alone is enough:
//   1. `stdio: "ignore"` on the build. A build that printed an error printed it into a void, so a
//      failure and a slow success looked identical from outside.
//   2. `build.on("exit")` was the ONLY listener. A child that fails to START emits `error`, and on
//      some paths never `exit` — so the promise could never settle and the run waited forever. There
//      was no timeout either, so "forever" meant exactly that.
//   3. NOTHING CHECKED THAT THE BUILD PRODUCED ANYTHING. Exit 0 was taken as "the bundle is there",
//      and the next step was a 60-second wait on a preview server that had nothing to serve.
//
// ★ I COULD NOT REPRODUCE THE ORIGINAL HANG, and say so rather than claiming a diagnosis: the build
// succeeds here every time it is run. So this fixes the CLASS — every way that spawn can fail
// silently — rather than the one instance, which is the only honest repair available when the
// symptom will not come back on demand.
//
// A HANG LOOKS LIKE PATIENCE. That is the whole reason this is worth four extra lines: a run that
// fails in 2 seconds costs 2 seconds, and a run that hangs costs however long it takes a person to
// lose confidence in it — which on 2026-09-03 was fifteen minutes of his evening.

/** Live output is worth more than captured output when the failure mode is a HANG: a stalled build
 *  shows you the last thing it managed to say. Kept per-child too, so a later failure can quote it. */
const TAILS = new Map();
function watch(child, what, echo = false) {
  TAILS.set(what, []);
  const take = (chunk) => {
    const t = TAILS.get(what);
    for (const line of String(chunk).split(/\r?\n/)) {
      if (!line.trim()) continue;
      t.push(line);
      if (t.length > 40) t.shift();
      if (echo) console.log(`    [${what}] ${line}`);
    }
  };
  child.stdout?.on("data", take);
  child.stderr?.on("data", take);
  child.on("error", (e) => take(`spawn failed: ${e.message}`));
  return child;
}

/** The last few lines a child managed to say, for a message that would otherwise name only a URL. */
function tailOf(what) {
  const t = TAILS.get(what) ?? [];
  return t.length ? `\n  what ${what} said:\n    ${t.slice(-12).join("\n    ")}` : `\n  (${what} said nothing at all, which is itself the finding)`;
}

// Three minutes. The build takes ~1 s by hand and ~40 s cold on this machine, so this is not a
// performance budget — it is the line past which waiting has stopped being reasonable and the run
// should say so instead of continuing to wait.
const BUILD_TIMEOUT_MS = Number(ARG("build-timeout-ms", "180000"));

async function runBuild(spawn, outDir, apiPort) {
  // Delete first, so "the build produced nothing" cannot be satisfied by a bundle an EARLIER run
  // left behind. Without this the check below would pass on a stale `dist-sweep` and the sweep would
  // measure yesterday's bundle while reporting today's — a worse failure than the hang, because it
  // returns numbers.
  rmSync(outDir, { recursive: true, force: true });

  const t0 = Date.now();
  const build = spawn(
    "npx",
    ["vite", "build", "--outDir", "dist-sweep"],
    { cwd: join(ROOT, "client"), env: { ...process.env, VITE_API_URL: `http://localhost:${apiPort}` }, shell: true, stdio: ["ignore", "pipe", "pipe"] }
  );
  watch(build, "the sweep build", true);

  await new Promise((res, rej) => {
    const timer = setTimeout(() => {
      try { build.kill(); } catch { /* already gone */ }
      rej(new Error(`the sweep build did not finish within ${(BUILD_TIMEOUT_MS / 1000).toFixed(0)} s.${tailOf("the sweep build")}`));
    }, BUILD_TIMEOUT_MS);
    // BOTH events, and that is the fix for the hang: `error` fires when the child cannot be started
    // at all, and on that path `exit` may never come.
    build.on("error", (e) => { clearTimeout(timer); rej(new Error(`the sweep build could not be started: ${e.message}`)); });
    build.on("exit", (c) => {
      clearTimeout(timer);
      c === 0 ? res() : rej(new Error(`the sweep build exited ${c}.${tailOf("the sweep build")}`));
    });
  });

  // EXIT 0 IS NOT A BUNDLE. Name what was expected and what was found, because "empty dist-sweep"
  // was the actual state on the night this was filed and nothing said it.
  const entry = join(outDir, "index.html");
  if (!existsSync(entry)) {
    const found = existsSync(outDir) ? readdirSync(outDir) : null;
    throw new Error(
      `the sweep build exited 0 but produced no bundle.\n` +
      `  expected: ${entry}\n` +
      `  found:    ${found === null ? `${outDir} does not exist` : found.length ? found.join(", ") : "an empty directory"}` +
      tailOf("the sweep build")
    );
  }
  console.log(`  built in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outDir}`);
}

async function startStack() {
  const { spawn } = await import("node:child_process");
  const { randomUUID } = await import("node:crypto");
  const { tmpdir } = await import("node:os");
  const apiPort = Number(ARG("api-port", "4361"));
  const appPort = Number(ARG("app-port", "4362"));
  const env = {
    ...process.env,
    PORT: String(apiPort),
    RA_DATA_DIR: join(tmpdir(), `racearena-viewer-${randomUUID().slice(0, 8)}`),
    RA_SESSION_SECRET: randomUUID(),
    RA_BOOTSTRAP_TOKEN: randomUUID(),
    RA_CLIENT_ORIGIN: `http://localhost:${appPort}`,
  };
  const username = `viewer-${randomUUID().slice(0, 8)}`;
  const password = randomUUID();

  // A previous run that was interrupted can still be holding these. Free them first and say so,
  // rather than failing later at the login with a timeout that reads like a product defect.
  for (const port of [apiPort, appPort]) {
    try {
      const r = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(700) });
      if (r) console.log(`  port ${port} was still held by an earlier run — reclaiming it`);
      if (process.platform === "win32") {
        const { execSync } = await import("node:child_process");
        const line = execSync(`netstat -ano -p tcp`, { encoding: "utf8" })
          .split(NEWLINE)
          .find((l) => l.includes(`:${port} `) && LISTENING.test(l));
        const pid = line && line.trim().split(SPACES).pop();
        if (pid) execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
      }
    } catch {
      /* nothing there, which is the normal case */
    }
  }

  const api = spawn("npm", ["start"], { cwd: join(ROOT, "server"), env, shell: true, stdio: ["ignore", "pipe", "pipe"] });
  watch(api, "the isolated API");

  const outDir = join(ROOT, "client", "dist-sweep");

  // Wait for both, and say WHICH one never came up rather than timing out anonymously — and, since
  // INSTRUMENT-FAILS-LOUD-1, WHAT IT SAID on the way down. A server that dies at boot used to leave
  // a 60-second silence and one sentence naming a URL; the cause was in the stderr this run threw
  // away.
  const wait = async (url, what) => {
    for (let i = 0; i < 120; i++) {
      try {
        const r = await fetch(url);
        if (r.status < 500) return;
      } catch {
        /* not up yet */
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`${what} never answered at ${url} within 60 s.${tailOf(what)}`);
  };
  async function bootWait() {
    await wait(`http://localhost:${apiPort}/api/auth/setup-needed`, "the isolated API");
    await wait(`http://localhost:${appPort}/`, "the sweep's preview server");
  }

  let app = null;
  // INSTRUMENT-FAILS-LOUD-1: EVERY failure below happens with the API ALREADY RUNNING, so an
  // un-caught one leaves a node process holding port 4361 and the NEXT run fails at a login with a
  // timeout that reads like a product defect. That exact leak is why `stop` takes the process tree
  // explicitly, and it applies just as much to the boot path as to the teardown one — an instrument
  // that fails loudly and then poisons the next attempt has only moved the confusion.
  try {
    await runBuild(spawn, outDir, apiPort);
    app = spawn(
      "npx",
      ["vite", "preview", "--outDir", "dist-sweep", "--port", String(appPort), "--strictPort"],
      { cwd: join(ROOT, "client"), shell: true, stdio: ["ignore", "pipe", "pipe"] }
    );
    watch(app, "the sweep's preview server");
    await bootWait();

    // The account, created the way a first-time user creates one, against an empty data directory.
    // INSIDE the try: it can refuse, and a refusal here leaks exactly the same two processes.
    const needed = await (await fetch(`http://localhost:${apiPort}/api/auth/setup-needed`)).json();
    if (needed.setupNeeded) {
      const r = await fetch(`http://localhost:${apiPort}/api/auth/setup`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-bootstrap-token": env.RA_BOOTSTRAP_TOKEN },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) throw new Error(`first-run setup was refused (${r.status})${tailOf("the isolated API")}`);
    }
  } catch (e) {
    kill([api, app]);
    throw e;
  }
  return {
    apiPort,
    appPort,
    username,
    password,
    base: `http://localhost:${appPort}`,
    // ONE teardown, shared with the boot path's failure branch above (INSTRUMENT-FAILS-LOUD-1).
    stop: () => kill([api, app]),
  };
}

/**
 * BOTH SERVERS ARE SPAWNED THROUGH A SHELL, so `p.kill()` kills the SHELL and leaves the node
 * process holding the port. The next run then cannot bind and fails at the login with a timeout that
 * looks like a product defect — which is exactly how this was found. On Windows the tree has to be
 * taken explicitly; elsewhere the process group does it.
 */
function kill(children) {
  for (const p of children) {
    if (!p) continue;
    try {
      if (process.platform === "win32" && p.pid) {
        spawnSync("taskkill", ["/pid", String(p.pid), "/T", "/F"], { stdio: "ignore", shell: true });
      } else {
        p.kill();
      }
    } catch {
      /* already gone */
    }
  }
}

/**
 * Log in THROUGH THE REAL FORM once, and reuse the state for every race. Injecting a cookie would
 * be faster and would prove nothing about the gate — auth.setup.js's own reasoning, kept.
 */
async function authenticate(browser, stack) {
  const ctx = await browser.newContext({ viewport: { width: CW, height: CH } });
  const page = await ctx.newPage();
  await page.goto(`${stack.base}/login`);
  await page.getByLabel(/username/i).fill(stack.username);
  await page.getByLabel(/password/i).fill(stack.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !/\/login/.test(url.pathname), { timeout: 20000 });
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

// ── main ───────────────────────────────────────────────────────────────────────────────────────
const t0 = Date.now();
// PLAYWRIGHT LIVES IN client/, NOT AT THE ROOT. A bare specifier resolves from THIS file's
// directory, which is `scripts/`, so it misses — and the miss is silent-looking ("not installed")
// when the package is in fact right there. The explicit path is tried first and the bare specifier
// second, so this works whether or not the root ever grows its own copy.
let chromium;
for (const spec of [u("client/node_modules/@playwright/test/index.mjs"), "@playwright/test"]) {
  try {
    ({ chromium } = await import(spec));
    if (chromium) break;
  } catch {
    /* try the next */
  }
}
if (!chromium) {
  console.error(
    "viewer-invariants: could not load @playwright/test from client/node_modules or from the root."
  );
  process.exit(2);
}

const browser = await chromium.launch({ headless: !HEADED });
const stack = await startStack();
BASE = stack.base;
const storageState = await authenticate(browser, stack);
console.log(`  isolated stack: API ${stack.apiPort}, app ${stack.appPort}, account ${stack.username}`);
const rows = [];
const allEvents = [];
const DUMPS = [];
let hardErrors = 0;

// ── THE WORK LIST, AND WHY IT CAN BE RUN IN PARALLEL ──────────────────────────────────────────
//
// Each page owns its OWN virtual clock, so N pages running at once cost wall-clock and nothing else:
// every race still advances in exact 1/60 s steps whatever the machine is doing. That is the
// property that makes this safe, and it is the same property that makes a run repeatable — at real
// 60 fps, contention would change dt, and the camera is known to diverge on any frame-timing change.
// FIELD SIZE. The default is the shipped canonical per topology - 40 closed, 100 open - and that is
// what every sweep in the record was taken at. `--racers=<n>` overrides it for ONE reason: an owner
// case is reported at a field size the sweep does not use, and a race at a different field size is a
// DIFFERENT RACE, not the same race observed differently. Read-only: it changes what is measured, not
// how, and unset it is byte-identical to before (LATE-LEAD-CHANGE-1, 2026-08-23).
const RACERS_ARG = (process.argv.find((a) => a.startsWith("--racers=")) ?? "").slice(9);
const RACERS_OVERRIDE = RACERS_ARG ? Number(RACERS_ARG) : null;
if (RACERS_OVERRIDE !== null && !(RACERS_OVERRIDE > 0))
  throw new Error(`--racers must be a positive integer, got ${RACERS_ARG}`);

const WORK = [];
for (const arm of ARMS)
  for (const geo of TRACKS)
    for (const seed of SEEDS)
      WORK.push({ arm, geo, seed, N: RACERS_OVERRIDE ?? (geo.closed ? 40 : 100) });
// ORDERED BY VALUE, because a sweep of this length will sometimes be stopped part-way and what it
// has finished by then should be the part worth having. Seed 9 first — it is the race the owner
// reported and the one every other camera table in this repository uses — then the rest in order.
WORK.sort((a, b) => (a.seed === 9 ? -1 : b.seed === 9 ? 1 : 0) || a.seed - b.seed);

const JOBS = Math.max(1, Number(ARG("jobs", "6")));
// PARTIAL RESULTS ARE WRITTEN AS THEY LAND. A guard that only reports if it reaches the end cannot
// be read while it is running, and this one runs for hours.
const flush = () =>
  writeFileSync(
    JSON_OUT,
    JSON.stringify(
      { done: rows.length, of: WORK.length, rows, events: allEvents, dumps: DUMPS, secs: (Date.now() - t0) / 1000 },
      null,
      1
    )
  );
let cursor = 0;
let done = 0;
console.log(`  ${WORK.length} race(s), ${JOBS} at a time\n`);

async function worker() {
  for (;;) {
    const k = cursor++;
    if (k >= WORK.length) return;
    const { arm, geo, seed, N } = WORK[k];
    const ctx = await browser.newContext({ viewport: { width: CW, height: CH }, storageState });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String(e.message)));
    let r;
    try {
      r = await runOne(page, geo, seed, arm, N);
    } catch (e) {
      r = { geo: geo.id, seed, arm, N, error: String(e && e.message) };
    }
    await ctx.close();
    done++;
    const pos = `[${String(done).padStart(String(WORK.length).length)}/${WORK.length}]`;
    if (r.error || pageErrors.length) {
      hardErrors++;
      console.log(`${pos} ${geo.id.padEnd(15)} seed ${String(seed).padStart(3)} ${arm.padEnd(8)} — ERROR: ${r.error ?? pageErrors[0]}`);
      rows.push({ ...r, pageErrors });
      continue;
    }
    const p = r.probe ?? { events: [], frames: 0, byInvariant: {} };
    if (p.dump) DUMPS.push({ track: geo.id, seed, arm, frames: p.dump });
    if (PACE_OUT && r.pace)
      writeFileSync(PACE_OUT, JSON.stringify({ track: geo.id, seed, arm, pace: r.pace }, null, 1));
    for (const e of p.events) allEvents.push({ ...e, track: geo.id, seed, arm, n: N });
    rows.push({
      track: geo.id, seed, arm, n: N, frames: p.frames,
      events: p.events.length, byInvariant: p.byInvariant,
      widest: p.widestCorridors, tightest: p.tightestCorridors,
      windowStates: p.windowStates ?? {},
      crossing: p.crossing ?? null,
      // ENDGAME-COMPLETE-1: the twelve, graded from this race's own frames, on every race.
      sheet: gradeRace(p, { track: geo.id, seed, arm, n: N }),
      contention: p.contention ?? null,
    });
    if (JSON_OUT) flush();
    console.log(
      `${pos} ${geo.id.padEnd(15)} seed ${String(seed).padStart(3)} ${arm.padEnd(8)} n=${String(N).padStart(3)} ` +
        `${String(p.frames).padStart(5)} frames  ${p.events.length ? `${p.events.length} VIOLATION(S)` : "clean"}` +
        (p.events.length ? `  [${Object.entries(p.byInvariant).map(([a, b]) => `${a} ${b}`).join(", ")}]` : "")
    );
  }
}
await Promise.all(Array.from({ length: JOBS }, () => worker()));

await browser.close();
stack.stop();

const secs = ((Date.now() - t0) / 1000).toFixed(0);

// ── THE VERDICT: EVENTS ────────────────────────────────────────────────────────────────────────
// ── WHICH SHOTS RUN INSIDE HIS WINDOW ─────────────────────────────────────────────────────────
//
// The exemption for the group-framing states is about the EARLIER RACE, not about those states as
// such: if a battle or a comeback shot runs after 95%, his rule applies to it there like any other.
// So this is counted rather than assumed, over every race swept.
// ── CONTENTION-WATCH-1: how often a racer drops out, and where ───────────────────────────────
const CON = rows.filter((r) => r.contention).map((r) => ({ ...r.contention, track: r.track, seed: r.seed, arm: r.arm }));
if (CON.length) {
  const withDrops = CON.filter((c) => c.released?.length);
  console.log(`\n── CONTENTION WATCH ──`);
  console.log(
    `  races where at least one racer dropped out: ${withDrops.length} of ${CON.length}` +
      `   |  races with NO change at all: ${CON.length - withDrops.length}`
  );
  const all = CON.flatMap((c) => (c.released ?? []).map((r) => ({ ...r, track: c.track, seed: c.seed, arm: c.arm })));
  console.log(`  racers dropped, total: ${all.length}`);
  if (all.length) {
    const ps = all.map((r) => r.p).sort((a, b) => a - b);
    console.log(
      `  race progress at the drop: min ${ps[0].toFixed(4)}  median ${ps[ps.length >> 1].toFixed(4)}  max ${ps[ps.length - 1].toFixed(4)}`
    );
    const byTrack = {};
    for (const r of all) byTrack[r.track] = (byTrack[r.track] ?? 0) + 1;
    console.log(
      "  by track: " +
        Object.entries(byTrack)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `${k} ${v}`)
          .join(", ")
    );
  }
  const checks = CON.map((c) => c.checks ?? 0);
  console.log(`  checks run per race: min ${Math.min(...checks)}  max ${Math.max(...checks)}`);
}

const WSTATES = {};
for (const r of rows) for (const [k, v] of Object.entries(r.windowStates ?? {})) WSTATES[k] = (WSTATES[k] ?? 0) + v;
const WTOTAL = Object.values(WSTATES).reduce((a, b) => a + b, 0);
console.log(`
── THE SHOTS THAT RUN INSIDE THE WINDOW (from ${(100 * 0.95).toFixed(0)}% to the crossing) ──`);
if (!WTOTAL) console.log("  no in-window frames were recorded");
else
  for (const [k, v] of Object.entries(WSTATES).sort((a, b) => b[1] - a[1])) {
    const races = rows.filter((r) => (r.windowStates ?? {})[k]).length;
    console.log(
      `  ${k.padEnd(16)} ${String(v).padStart(7)} frame(s), ${((100 * v) / WTOTAL).toFixed(1).padStart(5)}% of the window, in ${String(races).padStart(3)} of ${rows.length} race(s)`
    );
  }

// ── ENDGAME-COMPLETE-1: THE SHEET COMES FIRST, WHATEVER ELSE FOLLOWS ─────────────────────────
printSheet(
  rows.filter((r) => r.sheet).map((r) => r.sheet),
  ARG("label", "today") + " (arms " + ARMS.join("+") + ", seeds " + SEEDS.join(",") + ")"
);

// ── INVARIANT 6: THE WINNER'S CROSSING IS FRAMED ON THE WINNER (WINNER-CROSSING-1) ────────────
//
// HIS REQUIREMENT: the winner's crossing is the moment of the race and must be presented as such —
// the camera follows him through it rather than letting him run to the edge.
//
// WHY IT IS A NEW INVARIANT AND NOT A COLUMN. "Arrival: 0% error on every track" graded the ZOOM
// FACTOR at the crossing and nothing else, so it stayed green on a frame he rejected outright. That
// is the THIRD metric in this thread to be green against his eye — after the 5-frame smoothed
// smoothness figure and the percentage that hid a black screen. A check that cannot fail on his
// screenshot is not a check.
//
// TWO CONDITIONS, BOTH FROM NUMBERS THAT ALREADY EXIST:
//
//   NOT AT THE EDGE   the winner is inside the SUBJECT's own inner-frame region, `innerFramePct`
//                     (0.7). framingRule.js states what that region is for in as many words — it
//                     "exists so the SUBJECT does not cling to the edge" — which is his sentence
//                     already written down. Not `COMPANY_FRAME_PCT` (0.9): that is the region a
//                     COMPANION may sit near the edge of, and the winner at his own crossing is not
//                     company. No number is invented here and none is tuned.
//   THE LINE WITH HIM some part of the finish band is on the canvas, which is the same test
//                     invariant 3 uses and needs no threshold.
//
// SCOPE: the crossing frame, and every frame after it for as long as THE SHOT THAT OWNED THE
// CROSSING is still running. Once the ending hands over to FINISH_OVERVIEW the shot is deliberately
// on the LINE rather than on the winner — finishPhase.js calls that phase the AFTERMATH and its job
// is to frame the stationary point "so later finishers cross in shot". Grading the winner's position
// there would be grading a different promise, and this file says which one it is measuring.
const { DEFAULT_INNER_FRAME_PCT } = await import(u("client/src/modules/camera/framingConfig.js"));
const INNER_FRAME_PCT = DEFAULT_INNER_FRAME_PCT;
const RUN_IN_OPEN_MS = DEFAULT_CAMERA_CONFIG.runInOpenMs;
if (!(INNER_FRAME_PCT > 0 && INNER_FRAME_PCT <= 1) || !(RUN_IN_OPEN_MS > 0))
  throw new Error(
    `viewer-invariants: innerFramePct=${INNER_FRAME_PCT} runInOpenMs=${RUN_IN_OPEN_MS} — invariant 6 ` +
      `could not read the constants it grades against, so it would be measuring nothing.`
  );
const SAB_CORNER = process.argv.includes("--sabotage-corner");
const SAB_NOLINE = process.argv.includes("--sabotage-noline");
const crossEvents = [];
for (const r of rows) {
  const c = r.crossing;
  if (!c) continue;
  const lo = (1 - INNER_FRAME_PCT) / 2;
  const hi = 1 - lo;
  // The crossing frame and the tail of frames the same shot still owns.
  // THROUGH THE CROSSING, AND THAT IS A BOUNDED WINDOW RATHER THAN THE WHOLE HOLD. The photo
  // finish keeps its shot for `finishPauseMs` — four seconds on his config — and most of that is
  // the pause AFTER the moment, which is a different promise. The window is `runInOpenMs`, the
  // endgame's own span unit and the same duration the contention release eases over; no new number.
  const graded = [{ ...c.at, bandPct: c.bandPct }];
  for (const a of c.after) {
    if (a.state !== c.at.state) break;
    if (a.ms - c.at.ms > RUN_IN_OPEN_MS) break;
    graded.push(a);
  }
  for (const g of graded) {
    // The sabotage arms move the WINNER, which is the same thing the defect does to the picture.
    const fx = SAB_CORNER ? 0.02 : g.fx;
    const fy = SAB_CORNER ? 0.03 : g.fy;
    const band = SAB_NOLINE ? 0 : (g.bandPct ?? 0);
    if (fx < lo || fx > hi || fy < lo || fy > hi) {
      const byX = Math.max(lo - fx, fx - hi, 0);
      const byY = Math.max(lo - fy, fy - hi, 0);
      crossEvents.push({
        ...r,
        kind: "edge",
        frame: g.frame,
        detail: `the winner is at (${fx.toFixed(3)}, ${fy.toFixed(3)}) of the frame, outside the subject's inner ${INNER_FRAME_PCT} region`,
        by: +Math.max(byX, byY).toFixed(4),
        state: g.state,
      });
    }
    // ── THE LINE IS GRADED AT THE MOMENT, NOT FOR A SECOND AFTERWARDS ──────────────────────
    //
    // His requirement is that the winner's CROSSING is presented as the moment, with the line with
    // him. Once he is PAST the line it is behind him, and a shot that follows the winner must lose
    // it — that is what crossing a line looks like. Held over the whole window this condition asks
    // the camera to keep a line in shot that the race has already gone past, and it fails a build
    // for doing the right thing: measured, 14 frames on the arm where the winner is framed
    // perfectly, every one of them after he was over.
    //
    // So "the line with him" is graded on the crossing FRAME. "Not at the edge" is graded through
    // the window, because that promise does not expire when he crosses — it is the whole of what he
    // asked for.
    if (g.frame === c.at.frame && !(band > 0))
      crossEvents.push({
        ...r,
        kind: "noline",
        frame: g.frame,
        detail: "no part of the finish band is on the canvas at the winner's crossing",
        by: 1,
        state: g.state,
      });
  }
}
console.log(`\n── INVARIANT 6 — THE WINNER'S CROSSING IS FRAMED ON THE WINNER ──`);
{
  const races = new Set(crossEvents.map((e) => `${e.arm}/${e.track}/${e.seed}`));
  const edge = crossEvents.filter((e) => e.kind === "edge");
  const noline = crossEvents.filter((e) => e.kind === "noline");
  console.log(
    `  ${crossEvents.length} violation(s) in ${races.size} of ${rows.filter((r) => r.crossing).length} race(s)` +
      `   |  at the edge: ${edge.length}   line not with him: ${noline.length}`
  );
  const worst = crossEvents.slice().sort((a, b) => b.by - a.by)[0];
  if (worst)
    console.log(
      `  WORST: ${worst.arm}/${worst.track} seed ${worst.seed}, frame ${worst.frame} (${worst.state}) — ${worst.detail}`
    );
}

// ── WINNER-CROSSING-1: THE PICTURE AT THE CROSSING ───────────────────────────────────────────
//
// Not the zoom factor — the PICTURE. Which state owns the frame, where the winner sits in it, and
// whether the finish line is with him. "Arrival: 0% error" graded the factor alone and stayed green
// on a frame the owner rejected outright.
const XR = rows.filter((r) => r.crossing);
if (XR.length) {
  console.log(`\n── THE WINNER AT THE CROSSING ──`);
  console.log(
    "  track            seed arm       state          winner x,y      on canvas   band%   corridors"
  );
  for (const r of XR) {
    const c = r.crossing;
    console.log(
      [
        "  " + r.track.padEnd(16),
        String(r.seed).padStart(4),
        " " + r.arm.padEnd(9),
        c.at.state.padEnd(15),
        (c.at.fx.toFixed(3) + ", " + c.at.fy.toFixed(3)).padStart(14),
        (c.at.onCanvas ? "   yes" : "   NO ").padStart(11),
        String(c.bandPct ?? "-").padStart(8),
        String(c.at.corr).padStart(11),
      ].join("")
    );
  }
  const off = XR.filter((r) => !r.crossing.at.onCanvas).length;
  const byState = {};
  for (const r of XR) byState[r.crossing.at.state] = (byState[r.crossing.at.state] ?? 0) + 1;
  console.log(
    `  winner OFF CANVAS at the crossing: ${off} of ${XR.length}  |  states owning the crossing: ` +
      Object.entries(byState)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v}`)
        .join(", ")
  );
}

const INV = ["1-course", "2-leader", "3-line", "4-widthstep", "4-panstep", "5-tootight", "5-toowide"];
console.log(`\n── VIOLATIONS PER INVARIANT ──`);
for (const k of INV) {
  const hits = allEvents.filter((e) => e.invariant === k);
  const races = new Set(hits.map((e) => `${e.arm}/${e.track}/${e.seed}`)).size;
  console.log(
    `  ${k.padEnd(12)} ${String(hits.length).padStart(6)} frame(s) in ${String(races).padStart(3)} race(s)` +
      (hits.length ? `   worst by ${Math.max(...hits.map((e) => e.by)).toFixed(1)}` : "")
  );
}

if (allEvents.length) {
  console.log(`\n── THE WORST EVENT PER INVARIANT, IN FULL ──`);
  for (const k of INV) {
    const hits = allEvents.filter((e) => e.invariant === k);
    if (!hits.length) continue;
    const w = hits.slice().sort((a, b) => b.by - a.by)[0];
    console.log(
      `  ${k}: ${w.arm}/${w.track} seed ${w.seed} n=${w.n}, frame ${w.frame} (${w.ms} ms, progress ${w.progress})`
    );
    console.log(`      ${w.detail}`);
    console.log(`      state ${w.state}, binding "${w.binding}", picture ${w.widthCorridors} corridors`);
  }
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ rows, events: allEvents, dumps: DUMPS, secs: +secs }, null, 1));
  console.log(`\n  events written to ${JSON_OUT}`);
}

const dirtyRaces = new Set(allEvents.map((e) => `${e.arm}/${e.track}/${e.seed}`)).size;
console.log(
  `\nviewer-invariants: ${rows.length} race(s) in ${secs}s — ${allEvents.length} window violation(s) in ${dirtyRaces} race(s), ${crossEvents.length} crossing violation(s)` +
    (hardErrors ? `, ${hardErrors} race(s) failed to run` : "")
);
if (allEvents.length || crossEvents.length || hardErrors) {
  console.log(
    "A single catastrophic frame fails this guard. That is deliberate: a share cannot say which."
  );
  process.exit(1);
}
console.log("Every frame of every race swept satisfied all five invariants. PASS");
