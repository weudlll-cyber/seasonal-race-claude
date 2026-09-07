// ============================================================
// File:        scripts/check-image-starts.mjs
// Project:     RaceArena — IMAGE-STARTS-1
//
// NOTHING IN THIS PROJECT CHECKED THAT THE PACKAGED SERVER STARTS. Every other guard reads text.
// `check-container-paths` compares the Dockerfile's COPY set against the compose mount set and says
// so itself: *"whether a mount actually works: it reads text and never starts a container"*, and
// *"a directory missing from BOTH lists — it compares two declarations, so the one failure shape it
// cannot catch is the one nobody wrote down anywhere"*. It also names its own successor: an
// instrument that reads what the code IMPORTS and asks whether the container can reach it.
//
// THIS FILE ANSWERS THAT QUESTION THE ONLY WAY THAT CANNOT BE FOOLED: it builds the image, starts a
// container from it, and asks the running server whether it is alive. An import the image does not
// carry, a COPY line that was never added, a file allowed into the build context but never copied —
// all of them are the same symptom here, a container that exits instead of answering.
//
// ── WHY IT EXISTS, AND IT IS NOT HYPOTHETICAL ───────────────────────────────────────────────────
//
// SHARED-CANONICAL-1 (2026-09-07) found `server/src/races/contentAddress.js` importing the canonical
// serialiser from `client/src/`, which the root `.dockerignore` excludes from the image on purpose.
// The containerised server could not start at all. It was found BY ACCIDENT, while somebody measured
// something unrelated, and two more imports of the same shape were sitting beside it. The gap that
// let three of them accumulate is larger than any one of them.
//
// ── ★ THE CONTAINER IS NOT THE IMAGE ────────────────────────────────────────────────────────────
//
// `docker-compose.yml` binds `./server/src`, `./server/utils`, `./server/data` and `./server/seeds`
// over the image's own copies, for a dev loop where a code change needs no rebuild. A container
// started THAT way proves nothing about the image: the host's files are answering, and a file the
// image is missing is supplied by the mount. So this check runs `docker run` directly, with NO
// bind mounts of any kind, against the image it just built. That is the whole point of it, and it
// is the one thing that must never be "simplified" into `docker compose up`.
//
// ── HOW ITS PATH DECLARATION IS DERIVED ─────────────────────────────────────────────────────────
//
// NOT HAND-WRITTEN. A hand-written list is a fourth thing to keep in step with the Dockerfile, and
// the drift it would cause is the disease this file treats. The `COPY` lines ARE the statement of
// what the image contains, so they are parsed: every source token becomes a declared directory (it
// ends in `/`) or a declared file. `COPY --from=` is skipped — it reads a named build context or an
// earlier stage, not the repository — with the client build named separately below. The Dockerfile
// and the root `.dockerignore` are added because either one changes what the image holds without
// any source file changing.
//
// The consequence is the intended one: a change under `server/src/`, to the Dockerfile, or to
// `.dockerignore` selects this check, and a change to `docs/` or `reports/` does not.
//
// ── WHAT THIS CHECK DELIBERATELY DOES NOT DO ────────────────────────────────────────────────────
//
//   · IT IS NOT WIRED INTO CI. IMAGE-STARTS-1 built and verified it and stopped there; wiring is a
//     separate decision, because the cost below is real and CI has no Docker daemon today.
//   · It does not test the app. `/api/health` answering means the process booted and Express is
//     serving — that is exactly the class of failure this exists for. A route that 500s under load
//     is somebody else's guard.
//   · It does not check the compose path. `check-container-paths` owns the mount comparison, and
//     this file deliberately does not restate it.
//   · It never inspects the image's filesystem to guess whether a file is present. It asks the
//     server, because "the file is there" and "the server starts" are not the same claim.
//
// LOUD-FAILURE RULE (Lesson 187, proof-of-live): a Dockerfile that yields ZERO copied sources fails
// rather than passing, and so does a missing Docker daemon. A check that passes because it did
// nothing is indistinguishable from a no-op, and this one's whole job is to notice an absence.
//
// Usage:
//   node scripts/check-image-starts.mjs
//   node scripts/check-image-starts.mjs --declare
//   node scripts/check-image-starts.mjs --keep     (leave the container up for inspection)
// ============================================================

import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCKERFILE = "server/Dockerfile";
const DOCKERIGNORE = ".dockerignore";

// The named build context the Dockerfile's `COPY --from=client` reads. Kept beside the parser
// rather than inside the derived set, because a named context is not a path in the build context.
const CLIENT_CONTEXT_DIR = "client";
const CLIENT_CONTEXT_NAME = "client";

const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

// ── The Dockerfile's COPY set, which IS the declaration of what the image contains ───────────────
//
// `COPY <src>... <dest>`: every token but the last is a source. A source ending in `/` is a
// directory, anything else is a file. Same parse as check-container-paths, which owns the
// comparison this file does not repeat.
function copySources(dockerfileText) {
  const dirs = new Set();
  const files = new Set();
  for (const line of dockerfileText.split("\n")) {
    const m = /^\s*COPY\s+(.+)$/i.exec(line);
    if (!m) continue;
    if (/(^|\s)--from=/.test(m[1])) continue; // a named context or an earlier stage, not the repo
    const tokens = m[1]
      .trim()
      .split(/\s+/)
      .filter((t) => !t.startsWith("--"));
    if (tokens.length < 2) continue;
    for (const src of tokens.slice(0, -1)) {
      const clean = src.replace(/^\.\//, "");
      if (clean.endsWith("/")) dirs.add(clean.replace(/\/$/, ""));
      else files.add(clean);
    }
  }
  return { dirs: [...dirs].sort(), files: [...files].sort() };
}

const derived = copySources(read(DOCKERFILE));

export const GUARD = {
  id: "check-image-starts",
  covers:
    "whether the packaged image actually starts: it builds the image, runs a container from it with NO bind mounts, and requires /api/health to answer",
  blind: [
    "anything the app DOES once it is up — a booting server is the whole claim",
    "the compose path: `check-container-paths` owns the mount comparison and this file does not restate it",
    "a file allowed into the build context but never COPYed AND never imported — nothing would fail, so nothing is noticed",
    "CI, which does not run this: IMAGE-STARTS-1 deliberately did not wire it in",
    "the client build itself — `client/dist` is an input, and a stale one produces a healthy container serving a stale app",
  ],
  // DERIVED from the Dockerfile's COPY lines — see the header. Never hand-written.
  dirs: derived.dirs.map((d) => `${d}/`),
  files: [...derived.files, DOCKERFILE, DOCKERIGNORE].sort(),
  reach: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const __t0 = Date.now();
const KEEP = process.argv.includes("--keep");
const TAG = `racearena-image-starts-check:${process.pid}`;
const NAME = `racearena-image-starts-${process.pid}`;

const say = (s) => console.log(s);
const elapsed = () => `${((Date.now() - __t0) / 1000).toFixed(1)}s`;

function fail(lines) {
  console.error(`FAIL: ${[].concat(lines).join("\n      ")}`);
  console.error(`[ra-elapsed-ms ${Date.now() - __t0}] (${elapsed()})`);
  process.exit(1);
}

// ── LOUD FAILURE: a Dockerfile we could not read anything out of is not a pass ───────────────────
if (derived.dirs.length === 0 && derived.files.length === 0) {
  fail([
    `no COPY source found in ${DOCKERFILE}.`,
    "This check derives everything it declares from those lines, so finding none means the parse",
    "is broken or the file moved — either way it cannot say anything about the image.",
  ]);
}

const docker = (args, opts = {}) =>
  spawnSync("docker", args, { cwd: ROOT, encoding: "utf8", ...opts });

if (docker(["version", "--format", "{{.Server.Version}}"]).status !== 0) {
  fail([
    "the Docker daemon is not reachable, so the image could not be built or started.",
    "This check cannot pass without one — reporting success here would mean 'nothing was tested'.",
  ]);
}

function cleanup() {
  if (KEEP) {
    say(`--keep: container ${NAME} and image ${TAG} were left running.`);
    return;
  }
  docker(["rm", "-f", NAME], { stdio: "ignore" });
  docker(["rmi", "-f", TAG], { stdio: "ignore" });
}

// Anything after this point must not leave a container or an image behind, including on a throw.
process.on("exit", cleanup);

// ── 1. BUILD ────────────────────────────────────────────────────────────────────────────────────
say(`check-image-starts: building ${DOCKERFILE} (context = repository root)…`);
const build = docker([
  "build",
  "-f",
  DOCKERFILE,
  "--build-context",
  `${CLIENT_CONTEXT_NAME}=./${CLIENT_CONTEXT_DIR}`,
  "-t",
  TAG,
  ".",
]);
if (build.status !== 0) {
  fail([
    "the image did not BUILD.",
    "--- docker build said ---",
    (build.stderr || build.stdout || "(no output)").trimEnd(),
  ]);
}
const builtAt = Date.now();
say(`check-image-starts: built in ${((builtAt - __t0) / 1000).toFixed(1)}s`);

// ── 2. RUN — ★ NO BIND MOUNTS. The image answers for itself or it fails. ─────────────────────────
//
// `-p 0:4000` lets the daemon pick a free host port, so this never collides with the dev API on
// 4000 or with a second copy of this check. The port is read back from `docker port`.
//
// Not `--rm`: a container that exits immediately is the failure this check exists to catch, and
// `--rm` would delete the logs that say WHY before they could be read.
const run = docker([
  "run",
  "-d",
  "--name",
  NAME,
  "-p",
  "0:4000",
  "-e",
  "RA_SESSION_SECRET=image-starts-check-not-for-production",
  "-e",
  "RA_BOOTSTRAP_TOKEN=image-starts-check-not-for-production",
  TAG,
]);
if (run.status !== 0) {
  fail([
    "the container did not START.",
    "--- docker run said ---",
    (run.stderr || run.stdout || "(no output)").trimEnd(),
  ]);
}

const portOut = docker(["port", NAME, "4000/tcp"]);
const port = /:(\d+)\s*$/.exec((portOut.stdout || "").trim().split("\n")[0] ?? "")?.[1];
if (!port) {
  fail([
    "the container started but no host port was mapped, so it could not be asked anything.",
    `--- docker port said ---`,
    (portOut.stdout || portOut.stderr || "(no output)").trimEnd(),
  ]);
}

// ── 3. ASK IT ───────────────────────────────────────────────────────────────────────────────────
const DEADLINE_MS = 60_000;
const url = `http://127.0.0.1:${port}/api/health`;
say(`check-image-starts: waiting for ${url} …`);

const containerLogs = () => {
  const l = docker(["logs", NAME]);
  const text = `${l.stdout ?? ""}${l.stderr ?? ""}`.trimEnd();
  return text || "(the container printed nothing at all)";
};
const isRunning = () =>
  (docker(["inspect", "-f", "{{.State.Running}}", NAME]).stdout ?? "").trim() === "true";

let healthy = null;
const waitStart = Date.now();
while (Date.now() - waitStart < DEADLINE_MS) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      healthy = await res.json();
      break;
    }
  } catch {
    // Not up yet, or already dead — the container state below decides which.
  }
  if (!isRunning()) {
    fail([
      "the container EXITED instead of serving. This is what a file the image does not carry looks",
      "like: the process dies at import time and the build that produced it reported success.",
      "--- the container printed ---",
      containerLogs(),
    ]);
  }
  await new Promise((r) => setTimeout(r, 500));
}

if (!healthy) {
  fail([
    `${url} did not answer within ${DEADLINE_MS / 1000}s, and the container is still running.`,
    "--- the container printed ---",
    containerLogs(),
  ]);
}

if (healthy.status !== "ok") {
  fail([
    `/api/health answered, but not with status "ok": ${JSON.stringify(healthy)}`,
    "--- the container printed ---",
    containerLogs(),
  ]);
}

const total = Date.now() - __t0;
say(
  `check-image-starts: the image starts and /api/health is ok ` +
    `(build ${((builtAt - __t0) / 1000).toFixed(1)}s, boot ${((Date.now() - builtAt) / 1000).toFixed(1)}s, ` +
    `no bind mounts, build reported ${JSON.stringify(healthy.build ?? null)}).`,
);
say(`[ra-elapsed-ms ${total}] (${(total / 1000).toFixed(1)}s)`);
