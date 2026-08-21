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
//   node scripts/viewer-invariants.mjs --gate                          # the verify subset
// ============================================================

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

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
const HIS = [
  ["cameraStateProfiles.OVERVIEW.trackingTC", 1.5],
  ["highlightHeroes", true],
  ["battlePulkThresholdT", 0.001],
  ["outcomePhaseThreshold", 0.65],
  ["battleCooldownMs", 20000],
  ["battleWeight", 0],
  ["finishPauseMs", 4000],
  ["winnerCardMs", 4000],
  ["corridorCapArriveMs", 5000],
  ["labelNamesWhenRoom", true],
  ["minRacersVisible", 8],
];
function setPath(o, path, v) {
  const parts = path.split(".");
  let cur = o;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = structuredClone(cur[parts[i]]);
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = v;
}
const configFor = (arm) => {
  const cfg = structuredClone(DEFAULT_CAMERA_CONFIG);
  if (arm === "his") for (const [p, v] of HIS) setPath(cfg, p, v);
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
const trackArg = ARG("tracks", null);
const TRACKS = geometries().filter((g) => (trackArg ? trackArg.split(",").includes(g.id) : true));

// ── THE VIRTUAL CLOCK ──────────────────────────────────────────────────────────────────────────
//
// One counter drives `performance.now`, `Date.now` and `requestAnimationFrame`. The pump advances
// it by exactly one 60 Hz frame and then runs whatever rAF callbacks were queued, yielding to the
// real macrotask queue in between so React's own scheduling still happens.
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
    { geo, activeRace, cfg, clock: VIRTUAL_CLOCK, dump: DUMP }
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
      if (p && p.frames > 60 && p.crossed) break;
    }
    window.__vStop = true;
    return { probe: window.__viewerProbe ? window.__viewerProbe() : null, frames: window.__vFrames };
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

  const api = spawn("npm", ["start"], { cwd: join(ROOT, "server"), env, shell: true, stdio: "ignore" });
  const outDir = join(ROOT, "client", "dist-sweep");
  const build = spawn(
    "npx",
    ["vite", "build", "--outDir", "dist-sweep"],
    { cwd: join(ROOT, "client"), env: { ...process.env, VITE_API_URL: `http://localhost:${apiPort}` }, shell: true, stdio: "ignore" }
  );
  await new Promise((res, rej) => {
    build.on("exit", (c) => (c === 0 ? res() : rej(new Error(`the sweep build exited ${c}`))));
  });
  const app = spawn(
    "npx",
    ["vite", "preview", "--outDir", "dist-sweep", "--port", String(appPort), "--strictPort"],
    { cwd: join(ROOT, "client"), shell: true, stdio: "ignore" }
  );

  // Wait for both, and say WHICH one never came up rather than timing out anonymously.
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
    throw new Error(`${what} never answered at ${url}`);
  };
  await wait(`http://localhost:${apiPort}/api/auth/setup-needed`, "the isolated API");
  await wait(`http://localhost:${appPort}/`, "the sweep's preview server");

  // The account, created the way a first-time user creates one, against an empty data directory.
  const needed = await (await fetch(`http://localhost:${apiPort}/api/auth/setup-needed`)).json();
  if (needed.setupNeeded) {
    const r = await fetch(`http://localhost:${apiPort}/api/auth/setup`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-bootstrap-token": env.RA_BOOTSTRAP_TOKEN },
      body: JSON.stringify({ username, password }),
    });
    if (!r.ok) throw new Error(`first-run setup was refused (${r.status})`);
  }
  return {
    apiPort,
    appPort,
    username,
    password,
    base: `http://localhost:${appPort}`,
    // BOTH SERVERS ARE SPAWNED THROUGH A SHELL, so `p.kill()` kills the SHELL and leaves the
    // node process holding the port. The next run then cannot bind and fails at the login with a
    // timeout that looks like a product defect — which is exactly how this was found. On Windows
    // the tree has to be taken explicitly; elsewhere the process group does it.
    stop: () => {
      for (const p of [api, app]) {
        try {
          if (process.platform === "win32" && p.pid) {
            spawn("taskkill", ["/pid", String(p.pid), "/T", "/F"], { stdio: "ignore", shell: true });
          } else {
            p.kill();
          }
        } catch {
          /* already gone */
        }
      }
    },
  };
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
const WORK = [];
for (const arm of ARMS)
  for (const geo of TRACKS) for (const seed of SEEDS) WORK.push({ arm, geo, seed, N: geo.closed ? 40 : 100 });
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
    for (const e of p.events) allEvents.push({ ...e, track: geo.id, seed, arm, n: N });
    rows.push({
      track: geo.id, seed, arm, n: N, frames: p.frames,
      events: p.events.length, byInvariant: p.byInvariant,
      widest: p.widestCorridors, tightest: p.tightestCorridors,
      windowStates: p.windowStates ?? {},
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
  `\nviewer-invariants: ${rows.length} race(s) in ${secs}s — ${allEvents.length} violation(s) in ${dirtyRaces} race(s)` +
    (hardErrors ? `, ${hardErrors} race(s) failed to run` : "")
);
if (allEvents.length || hardErrors) {
  console.log(
    "A single catastrophic frame fails this guard. That is deliberate: a share cannot say which."
  );
  process.exit(1);
}
console.log("Every frame of every race swept satisfied all five invariants. PASS");
