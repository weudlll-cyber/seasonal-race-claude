// ============================================================
// File:        data-export.test.mjs
// Path:        scripts/data-export.test.mjs
// Project:     RaceArena — DATA-EXPORT-DATADIR-1
// Description: `npm run data:export` reads the data root that `resolveDataRoot()` names — the
//              directory `RA_DATA_DIR` points at when it is set, `server/data` when it is not —
//              and still compares against the fixed `server/seeds`.
//
// ★ HOW IT AVOIDS EVERY REAL DATA ROOT. The script is a top-level CLI and reads the data root at
// load, so it is RUN, not imported. It is run from a scratch copy of the repository's shape under
// `os.tmpdir()`: the real `scripts/data-export.mjs` and the real `server/src/dataPaths.js` are
// copied in byte for byte, next to a scratch `server/data` and `server/seeds`. `dataPaths.js`
// resolves its default relative to its own file, so the UNSET case reads the scratch
// `server/data`, never the repository's. Every run passes `--list`, which writes nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");

/** A scratch repository shape: the two real source files, plus seeds holding one shared file. */
function scratchRepo() {
  const root = mkdtempSync(join(tmpdir(), "ra-data-export-test-"));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "server", "src"), { recursive: true });
  mkdirSync(join(root, "server", "seeds"));
  copyFileSync(
    join(REPO, "scripts", "data-export.mjs"),
    join(root, "scripts", "data-export.mjs"),
  );
  copyFileSync(
    join(REPO, "server", "src", "dataPaths.js"),
    join(root, "server", "src", "dataPaths.js"),
  );
  writeFileSync(join(root, "server", "seeds", "shared.json"), "{}");
  return root;
}

/** A data directory holding the shared seed file and one file that exists nowhere else. */
function seedData(dir, uniqueName) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "shared.json"), "{}");
  writeFileSync(join(dir, uniqueName), "only here");
}

/** Runs the copied script with `--list` under exactly the given environment override. */
function runList(root, dataDir) {
  const env = { ...process.env };
  delete env.RA_DATA_DIR;
  delete env.RA_EXPORT_VERBOSE;
  if (dataDir) env.RA_DATA_DIR = dataDir;
  return execFileSync(
    process.execPath,
    [join(root, "scripts", "data-export.mjs"), "--list"],
    { cwd: root, env, encoding: "utf8" },
  );
}

test("RA_DATA_DIR set: the export reads that directory, not server/data", () => {
  const root = scratchRepo();
  const elsewhere = mkdtempSync(join(tmpdir(), "ra-data-export-root-"));
  try {
    seedData(join(root, "server", "data"), "default-only.json");
    seedData(elsewhere, "datadir-only.json");
    const out = runList(root, elsewhere);
    assert.match(out, /UNIQUE\s+datadir-only\.json/);
    assert.doesNotMatch(out, /default-only\.json/);
    // The comparison is still against the fixed server/seeds: the shared file is not unique.
    assert.match(out, /1 file\(s\) exist ONLY on this machine/);
    assert.match(out, /1 file\(s\) \(.*\) are byte-identical to server\/seeds/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(elsewhere, { recursive: true, force: true });
  }
});

test("RA_DATA_DIR unset: the export reads server/data beside the code", () => {
  const root = scratchRepo();
  try {
    seedData(join(root, "server", "data"), "default-only.json");
    const out = runList(root, null);
    assert.match(out, /UNIQUE\s+default-only\.json/);
    assert.match(out, /1 file\(s\) exist ONLY on this machine/);
    assert.match(out, /1 file\(s\) \(.*\) are byte-identical to server\/seeds/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
