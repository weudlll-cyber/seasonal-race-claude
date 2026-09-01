// ============================================================
// File:        scripts/check-container-paths.test.mjs
// Project:     RaceArena — CONTAINER-PATHS-1
//
// Run against a throwaway fixture tree rather than the real one, so the cases can be built rather
// than waited for. The guard resolves its own ROOT from its file location, so the fixture gets a
// COPY of it — running the original against a fixture cwd would silently check the real repository,
// a mistake this repository has already paid for once.
//
// ── IT USES `node:test`, AND THAT IS NOT A STYLE CHOICE ──────────────────────────────────────────
//
// `script-suite` runs `node --test scripts/*.test.mjs`. This file was written against VITEST when it
// was created, so under the suite it did not fail an assertion — it failed to IMPORT, with
// `Cannot find package 'vitest'`, and had therefore **never run in the suite that runs guard tests**
// from the day it landed. It went green only because it was being invoked by hand with
// `npx vitest run`, which is not what CI or `npm run verify` does. Converted by IMAGE-STANDALONE-1.
//
// THE FIXTURE MIRRORS THE REAL TREE AND MUST KEEP DOING SO. It has been rewritten as the tree moved:
// when `data` stopped being COPYed (IMAGE-NO-CREDENTIALS-1), and when the build context moved to the
// repository root (IMAGE-STANDALONE-1). A fixture that claims to model the repository and no longer
// does is worse than none, because it goes green on a shape that does not exist.
// ============================================================

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = join(ROOT, "scripts", "check-container-paths.mjs");

/** A Dockerfile whose COPY sources are repo-relative, as a ROOT-context Dockerfile's are. */
const DOCKERFILE = (copies) =>
  [
    "FROM node:20-alpine",
    "WORKDIR /app",
    "COPY server/package.json ./",
    ...copies.map((c) => `COPY ${c}/ ./${c.split("/").pop()}/`),
    'CMD ["node", "src/index.js"]',
  ].join("\n");

/** The compose shape the repository has now: long build form, context at the repository root. */
const COMPOSE = (mounts) =>
  [
    "services:",
    "  server:",
    "    build:",
    "      context: .",
    "      dockerfile: server/Dockerfile",
    "      additional_contexts:",
    "        client: ./client",
    "    volumes:",
    ...mounts.map((m) => `      - ${m}`),
    "      - /app/node_modules",
  ].join("\n");

/** The older SUB-context shape, still supported and still tested. */
const COMPOSE_SUBCONTEXT = (mounts) =>
  [
    "services:",
    "  server:",
    "    build: ./server",
    "    volumes:",
    ...mounts.map((m) => `      - ${m}`),
    "      - /app/node_modules",
  ].join("\n");

// The real tree's shape, and it must STAY the real tree's shape or these tests stop meaning
// anything: `server/src`, `server/utils` and `server/seeds` are COPYed and mounted; `server/data` is
// mounted only, which is the ONE entry the guard now ships declaring. `shared/` is neither — the
// image COPYs a single file from it and compose no longer mounts it (IMAGE-STANDALONE-1).
const REAL_COPIES = ["server/src", "server/utils", "server/seeds"];
const REAL_MOUNTS = [
  "./server/src:/app/src",
  "./server/utils:/app/utils",
  "./server/data:/app/data",
  "./server/seeds:/app/seeds",
];

const repo = mkdtempSync(join(os.tmpdir(), "ra-cpaths-"));
mkdirSync(join(repo, "scripts"), { recursive: true });
mkdirSync(join(repo, "server"), { recursive: true });
cpSync(GUARD, join(repo, "scripts", "check-container-paths.mjs"));

after(() => rmSync(repo, { recursive: true, force: true }));

function write(copies, mounts, composeFn = COMPOSE) {
  writeFileSync(join(repo, "server", "Dockerfile"), DOCKERFILE(copies));
  writeFileSync(join(repo, "docker-compose.yml"), composeFn(mounts));
}

function run(...extra) {
  const r = spawnSync(
    process.execPath,
    [join(repo, "scripts", "check-container-paths.mjs"), ...extra],
    { cwd: repo, encoding: "utf8" },
  );
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

test("passes on the shape the repository actually has", () => {
  write(REAL_COPIES, REAL_MOUNTS);
  const r = run();
  assert.match(r.out, /0 undeclared/);
  assert.equal(r.code, 0);
});

// IMAGE-STANDALONE-1 moved the context to `.` and the guard reported EVERY mount as lying outside
// it — the third time it failed on the tree it shipped with. The empty context means the root.
test("understands a ROOT context, under which nothing is outside", () => {
  write(REAL_COPIES, REAL_MOUNTS);
  const r = run();
  assert.doesNotMatch(r.out, /OUTSIDE the build context/);
  assert.equal(r.code, 0);
});

test("still understands a SUB-context (`build: ./server`) with server-relative copies", () => {
  write(["src", "utils", "seeds"], REAL_MOUNTS, COMPOSE_SUBCONTEXT);
  const r = run();
  // `server/data` is not a divergence NAME under a sub-context, so the guard correctly reports the
  // declared entry as stale rather than passing silently.
  assert.match(r.out, /no longer a divergence|0 undeclared/);
});

test("FAILS when a mount the Dockerfile COPYs is removed — the seeds/ shape", () => {
  write(REAL_COPIES, REAL_MOUNTS.filter((m) => !m.startsWith("./server/seeds")));
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /server\/seeds\/ is COPYed .* and NOT mounted/);
  assert.match(r.out, /run the copy baked into the last image build/);
});

test("FAILS on an UNDECLARED mounted-not-copied divergence", () => {
  write(REAL_COPIES, [...REAL_MOUNTS, "./server/lib:/app/lib"]);
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /server\/lib\/ is mounted .* and NOT COPYed/);
  assert.match(r.out, /not self-contained/);
});

test("FAILS on an UNDECLARED mount from outside a SUB-context", () => {
  // Only reachable with a sub-context; under a root context nothing can be outside.
  write(["src", "utils", "seeds"], [...REAL_MOUNTS, "./tools:/tools"], COMPOSE_SUBCONTEXT);
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /OUTSIDE the build context/);
});

test("FAILS when a declared divergence stops being one (the STALE-entry check)", () => {
  // `server/data` COPYed as well as mounted: no longer a divergence, so its entry goes stale — which
  // the guard reports, because a stale allow-list entry is how an allow-list rots. This is the check
  // that caught `utils` and then `shared` as each was closed.
  write([...REAL_COPIES, "server/data"], REAL_MOUNTS);
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /no longer a divergence/);
});

test("FAILS rather than passing green when the Dockerfile COPYs no directory (Lesson 187)", () => {
  write([], REAL_MOUNTS);
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /no directory COPY found/);
});

test("FAILS rather than passing green when there are no host mounts", () => {
  write(REAL_COPIES, []);
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /no host mounts found/);
});

test("FAILS when the compose file declares no build context", () => {
  writeFileSync(join(repo, "server", "Dockerfile"), DOCKERFILE(REAL_COPIES));
  writeFileSync(
    join(repo, "docker-compose.yml"),
    ["services:", "  server:", "    volumes:", "      - ./server/src:/app/src"].join("\n"),
  );
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /declares no build context/);
});

test("does NOT read `COPY --from=` as a build-context copy", () => {
  // Its source is a named context or an earlier stage, so there is no host directory to mount.
  writeFileSync(
    join(repo, "server", "Dockerfile"),
    DOCKERFILE(REAL_COPIES) + "\nCOPY --from=client dist/ ./client-dist/",
  );
  writeFileSync(join(repo, "docker-compose.yml"), COMPOSE(REAL_MOUNTS));
  const r = run();
  assert.match(r.out, /0 undeclared/);
  assert.doesNotMatch(r.out, /server\/dist/);
  assert.equal(r.code, 0);
  write(REAL_COPIES, REAL_MOUNTS);
});

test("FAILS on an unreadable Dockerfile", () => {
  rmSync(join(repo, "server", "Dockerfile"));
  writeFileSync(join(repo, "docker-compose.yml"), COMPOSE(REAL_MOUNTS));
  const r = run();
  assert.equal(r.code, 1);
  assert.match(r.out, /missing or unreadable/);
  write(REAL_COPIES, REAL_MOUNTS);
});

test("declares its routing, including the blind spot it cannot cover", () => {
  const r = run("--declare");
  assert.equal(r.code, 0);
  const d = JSON.parse(r.out.split("\n").find((l) => l.startsWith("{")));
  assert.equal(d.id, "check-container-paths");
  assert.ok(d.files.includes("server/Dockerfile"));
  assert.ok(d.files.includes("docker-compose.yml"));
  assert.match(d.blind.join(" "), /missing from BOTH lists/);
});
