// ============================================================
// File:        scripts/serve-production.mjs
// Project:     RaceArena — SHIP-THE-STANDINGS
//
// SERVE THE PRODUCTION BUILD, FROM OUTSIDE THE SYNCED TREE. This is the one command behind the
// standing rule in docs/VERIFY-RULES.md R10: the owner's eye tests and perf logs are taken on a
// production build, never on the dev server.
//
// ── WHY IT EXISTS, and both halves are findings rather than preferences ─────────────────────────
//
// THE DEV BUNDLE IS NOT THE APP. Every perf log the owner took on the night of 2026-08-10 came from
// the dev server on 5173 while every number the assistant reported came from production bundles, and
// that — not "his machine versus a harness" — is why the two never agreed. FRAME-GAP-2 had already
// measured the difference: the dev bundle costs about a third of physics and HIDES how the DOM
// scales with window area. React's development build alone re-runs every component with checks the
// production build strips.
//
// AND IT MUST NOT BE SERVED FROM INSIDE ONEDRIVE. `client/dist` sits in a synced folder. Measured on
// the same night: served from there, one frame took 1016 ms — a full second of stall with nothing on
// screen to explain it — and arm-to-arm variation swamped a real effect. Copied out and served by a
// watcher-free server, the same builds separated cleanly. `vite preview` would serve the synced
// directory and would also hold a file watcher over it, so it is deliberately not what this uses.
//
// The copy target is under LOCALAPPDATA, which is never synced, and it is REPLACED on every run so a
// stale bundle cannot be served by accident — that being the other way an eye test gets spent on a
// build nobody meant to judge.
//
// Usage (from the repo root, after `cd client && npm run build`):
//   node scripts/serve-production.mjs [--port=4173]
// ============================================================

import { createServer } from "node:http";
import { readFile, rm, cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "client", "dist");
const arg = (n, d) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const PORT = Number(arg("port", 4173));
const TARGET =
  arg("dir", null) ??
  join(
    process.env.LOCALAPPDATA ?? process.env.TMPDIR ?? "/tmp",
    "racearena-preview",
  );

if (!existsSync(DIST)) {
  console.error(
    `no build at ${DIST} — run \`cd client && npm run build\` first`,
  );
  process.exit(2);
}

// Replace, never merge: a leftover asset from an older build is exactly how an eye test gets spent
// on something nobody meant to judge.
await rm(TARGET, { recursive: true, force: true });
await mkdir(TARGET, { recursive: true });
await cp(DIST, TARGET, { recursive: true });

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
const cache = new Map();
const send = async (res, file, fallback) => {
  try {
    let body = cache.get(file);
    if (!body) {
      body = await readFile(file);
      cache.set(file, body);
    }
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    });
    res.end(body);
  } catch (e) {
    if (fallback) return send(res, fallback, null);
    res.writeHead(404).end(String(e.message));
  }
};

const index = join(TARGET, "index.html");
createServer((req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  // Every client route (`/race`, `/setup`, …) falls back to the SPA shell.
  void send(res, join(TARGET, path === "/" ? "index.html" : path), index);
}).listen(PORT, () => {
  console.log(`RaceArena PRODUCTION build`);
  console.log(`  served from : ${TARGET}   (outside the synced tree)`);
  console.log(`  copied from : ${DIST}`);
  console.log(`  open        : http://localhost:${PORT}/`);
  console.log(
    `  build pill  : http://localhost:${PORT}/  — read it in the HUD before judging`,
  );
});
