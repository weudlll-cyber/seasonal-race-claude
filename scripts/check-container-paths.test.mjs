// ============================================================
// File:        scripts/check-container-paths.test.mjs
// Project:     RaceArena — CONTAINER-PATHS-1
//
// Run against a throwaway fixture tree rather than the real one, so the cases can be built rather
// than waited for. The two sabotages the brief names were ALSO run against the real files and both
// went red — recorded in reports/evolution/CONTAINER-PATHS-1.md.
//
// The guard resolves its own ROOT from its file location, so the fixture gets a COPY of it. Running
// the original against a fixture cwd would silently check the real repository, which is a mistake
// this repository has already paid for once (check-seed-versions.test.mjs).
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = join(ROOT, "scripts", "check-container-paths.mjs");

let repo;

const DOCKERFILE = (copies) =>
  ["FROM node:20-alpine", "WORKDIR /app", "COPY package.json ./", ...copies.map((c) => `COPY ${c}/ ./${c}/`), 'CMD ["node", "src/index.js"]'].join(
    "\n",
  );

const COMPOSE = (mounts) =>
  [
    "services:",
    "  server:",
    "    build: ./server",
    "    volumes:",
    ...mounts.map((m) => `      - ${m}`),
    "      - /app/node_modules",
  ].join("\n");

function write(copies, mounts) {
  writeFileSync(join(repo, "server", "Dockerfile"), DOCKERFILE(copies));
  writeFileSync(join(repo, "docker-compose.yml"), COMPOSE(mounts));
}

function run() {
  const r = spawnSync(process.execPath, [join(repo, "scripts", "check-container-paths.mjs")], {
    cwd: repo,
    encoding: "utf8",
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

// The real tree's shape: src/data/seeds COPYed and mounted, utils and shared mounted only — the two
// entries the guard ships declaring.
const REAL_COPIES = ["src", "data", "seeds"];
const REAL_MOUNTS = [
  "./server/src:/app/src",
  "./server/utils:/app/utils",
  "./server/data:/app/data",
  "./server/seeds:/app/seeds",
  "./shared:/shared",
];

beforeAll(() => {
  repo = mkdtempSync(join(os.tmpdir(), "ra-cpaths-"));
  mkdirSync(join(repo, "scripts"), { recursive: true });
  mkdirSync(join(repo, "server"), { recursive: true });
  cpSync(GUARD, join(repo, "scripts", "check-container-paths.mjs"));
});

afterAll(() => rmSync(repo, { recursive: true, force: true }));

describe("check-container-paths", () => {
  it("passes on the shape the repository actually has", () => {
    write(REAL_COPIES, REAL_MOUNTS);
    const r = run();
    expect(r.out).toMatch(/0 undeclared/);
    expect(r.code).toBe(0);
  });

  it("FAILS when a mount the Dockerfile COPYs is removed — the seeds/ shape", () => {
    write(REAL_COPIES, REAL_MOUNTS.filter((m) => !m.startsWith("./server/seeds")));
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/server\/seeds\/ is COPYed .* and NOT mounted/);
    expect(r.out).toMatch(/run the copy baked into the last image build/);
  });

  it("FAILS on an UNDECLARED mounted-not-copied divergence", () => {
    write(REAL_COPIES, [...REAL_MOUNTS, "./server/lib:/app/lib"]);
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/server\/lib\/ is mounted .* and NOT COPYed/);
    expect(r.out).toMatch(/not self-contained/);
  });

  it("FAILS on an UNDECLARED mount from outside the build context", () => {
    write(REAL_COPIES, [...REAL_MOUNTS, "./tools:/tools"]);
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/OUTSIDE the build context/);
  });

  it("PASSES once a divergence is closed by adding the COPY", () => {
    // utils COPYed as well as mounted: no longer a divergence, so its declared entry goes stale —
    // which the guard reports, because a stale allow-list entry is how an allow-list rots.
    write([...REAL_COPIES, "utils"], REAL_MOUNTS);
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/no longer a divergence/);
  });

  it("FAILS rather than passing green when the Dockerfile COPYs no directory (Lesson 187)", () => {
    write([], REAL_MOUNTS);
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/no directory COPY found/);
  });

  it("FAILS rather than passing green when there are no host mounts", () => {
    write(REAL_COPIES, []);
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/no host mounts found/);
  });

  it("FAILS when the compose file declares no build context", () => {
    writeFileSync(join(repo, "server", "Dockerfile"), DOCKERFILE(REAL_COPIES));
    writeFileSync(
      join(repo, "docker-compose.yml"),
      ["services:", "  server:", "    volumes:", "      - ./server/src:/app/src"].join("\n"),
    );
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/declares no `build:` context/);
  });

  it("FAILS on an unreadable Dockerfile", () => {
    rmSync(join(repo, "server", "Dockerfile"));
    writeFileSync(join(repo, "docker-compose.yml"), COMPOSE(REAL_MOUNTS));
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/missing or unreadable/);
    write(REAL_COPIES, REAL_MOUNTS);
  });

  it("declares its routing, including the blind spot it cannot cover", () => {
    const r = spawnSync(
      process.execPath,
      [join(repo, "scripts", "check-container-paths.mjs"), "--declare"],
      { cwd: repo, encoding: "utf8" },
    );
    const d = JSON.parse(`${r.stdout}`.split("\n").find((l) => l.startsWith("{")));
    expect(d.id).toBe("check-container-paths");
    expect(d.files).toContain("server/Dockerfile");
    expect(d.files).toContain("docker-compose.yml");
    expect(d.blind.join(" ")).toMatch(/missing from BOTH lists/);
  });
});
