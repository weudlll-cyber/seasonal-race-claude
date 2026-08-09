// ============================================================
// File:        scripts/check-config-keys.mjs
// Project:     RaceArena — DEV-MARKERS-1
//
// A KEY THE RENDERER OR THE DEV SCREEN READS MUST EXIST IN THE DEFAULTS, OR IT CANNOT SURVIVE
// LOADING. This guard fails when one does not.
//
// THE DEFECT IT EXISTS FOR, and it was found BY EYE, which is the whole problem. `highlightHeroes`
// — the green ring on a choreographed B1 hero, the red ring on a B2 attacker — is read by the draw
// path and offered as a Dev Screen checkbox, and had NO entry in `DEFAULT_CAMERA_CONFIG`. Since
// `d94a7b9d` the loader rebuilds the live config KEY BY KEY from the default keys:
//
//     for (const key of Object.keys(DEFAULT_CAMERA_CONFIG)) { ...take stored or default... }
//
// so a stored key with no default is silently DROPPED. The owner's stored `highlightHeroes: true`
// survived in localStorage and never reached the renderer. Nothing failed, nothing warned: the
// checkbox ticked, the value saved, and the rings stayed off. The loader's rule is a good one — it
// is what makes a retired key disappear — but it has this sharp edge, and only a machine reading
// both sides at once can see it.
//
// WHAT IT SCANS, and both patterns are deliberately UNAMBIGUOUS rather than clever:
//   1. `cameraConfig.<key>` anywhere under `client/src` — the live camera config, by its own name.
//   2. `set('<key>', …)` inside the Dev Screen's camera sections — the setter names the key it
//      writes, so a checkbox that writes a key nothing defaults is caught at the source.
//
// WHAT THIS GUARD DOES **NOT** CHECK, stated here rather than discovered later:
//   - **Config objects other than the camera one.** `dynamicsConfig` and `behaviorConfig` are merged
//     with `{ ...DEFAULT, ...stored }`, which does NOT drop unknown keys, so they cannot fail this
//     way and are out of scope. If either loader ever changes to the key-by-key form, widen this.
//   - **Destructured reads.** `const { highlightHeroes } = cameraConfig` names the key without the
//     `cameraConfig.` prefix and is invisible here. The codebase does not currently do it for camera
//     config; if it starts, this guard goes quiet without saying so. That is the biggest hole.
//   - **Computed keys** — `cameraConfig[name]` cannot be resolved statically.
//   - **Whether a default's VALUE is right.** Only that the key exists. `highlightHeroes: true`
//     would pass exactly as `false` does.
//   - **Whether anything still reads a key that HAS a default.** The reverse direction — a dead
//     default nobody reads — is not checked, and is a different (much cheaper) kind of wrong.
//   - **Non-client code.** Sim harnesses build their own config objects and are out of scope.
//
// LOUD-FAILURE RULE (Lesson 187): zero source files scanned, zero keys discovered, or an unreadable
// defaults module all FAIL. A guard that passes because it found nothing to check is a no-op.
//
// Usage:
//   node scripts/check-config-keys.mjs             # fail if a read key has no default
//   node scripts/check-config-keys.mjs --root=<d>  # scan a fixture (used by its test)
// ============================================================

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "check-config-keys",
  covers:
    "a key the renderer or the Dev Screen READS that has no entry in the defaults — the loader rebuilds the live config key by key, so such a key is silently dropped",
  blind: [
    "whether the key's VALUE is right — see check-fallback-agreement, which is the sibling that asks that",
    "config objects other than the camera one: dynamics and behaviour are spread-merged and cannot fail this way",
    "a key read by a computed expression rather than by name",
  ],
  dirs: ["client/src/"],
  files: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const ROOT =
  argOf("root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULTS_REL = "client/src/modules/storage/defaults.js";
const SRC_REL = "client/src";
const DEV_CAMERA_SECTIONS = "client/src/screens/DevScreen/sections";

// `cameraConfig.js` is the MODULE FILENAME and appears in imports and prose. It is not a key, and
// excluding it by name — rather than by some cleverness about what a key looks like — keeps the
// guard's rule readable. Listed with its reason, as every exception in this repo is.
const NOT_KEYS = new Map([
  [
    "js",
    "`cameraConfig.js` is the module's own filename, in imports and comments",
  ],
]);

let failures = 0;
const fail = (msg) => {
  console.error(`\nFAIL: ${msg}`);
  failures++;
  process.exitCode = 1;
};

// ── the defaults, read from the ONE home ──────────────────────────────────────
let defaults;
try {
  defaults = await import(pathToFileURL(join(ROOT, DEFAULTS_REL)).href);
} catch (e) {
  console.error(`FAIL: cannot read ${DEFAULTS_REL} — ${e.message}`);
  process.exit(1);
}
const CAMERA = defaults.DEFAULT_CAMERA_CONFIG;
if (!CAMERA || Object.keys(CAMERA).length === 0) {
  console.error(
    "FAIL: DEFAULT_CAMERA_CONFIG is missing or empty. Nothing to check against. See Lesson 187.",
  );
  process.exit(1);
}

// ── every source file ─────────────────────────────────────────────────────────
// The defaults module itself is EXCLUDED: it is the record being checked against, not a reader of
// it. Scanning the record for readers of the record is incoherent — and leaving it in also made the
// zero-files failure below unreachable, which its own test caught.
const DEFAULTS_ABS = join(ROOT, DEFAULTS_REL);

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(e) && !/\.test\./.test(e) && p !== DEFAULTS_ABS)
      out.push(p);
  }
  return out;
};

const files = walk(join(ROOT, SRC_REL));
if (files.length === 0) {
  console.error(
    `FAIL: scanned ZERO source files under ${SRC_REL}. The guard cannot have proved anything. See Lesson 187.`,
  );
  process.exit(1);
}

// ── the two patterns ──────────────────────────────────────────────────────────
const READ = /\bcameraConfig\.([A-Za-z_][A-Za-z0-9_]*)/g;
const SETTER = /\bset\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g;
const devSections = join(ROOT, DEV_CAMERA_SECTIONS);

const found = new Map(); // key -> Set of files
const note = (key, file) => {
  if (NOT_KEYS.has(key)) return;
  if (!found.has(key)) found.set(key, new Set());
  found
    .get(key)
    .add(file.replace(ROOT, "").replace(/\\/g, "/").replace(/^\//, ""));
};

for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(READ)) note(m[1], f);
  // The setter pattern is only meaningful in the Dev Screen's camera sections: `set('key', …)` is a
  // common local helper name elsewhere and would mean something different there.
  if (f.startsWith(devSections) && /cameraConfig|CAMERA_CONFIG/.test(text))
    for (const m of text.matchAll(SETTER)) note(m[1], f);
}

if (found.size === 0) {
  console.error(
    "FAIL: discovered ZERO camera-config keys in the source. Either the patterns stopped matching or\n" +
      "      the code moved; either way this guard proved nothing. See Lesson 187.",
  );
  process.exit(1);
}

// ── verdict ───────────────────────────────────────────────────────────────────
const missing = [...found].filter(([k]) => !(k in CAMERA));

for (const [key, where] of missing)
  fail(
    `\`${key}\` is read from the camera config but has NO default in DEFAULT_CAMERA_CONFIG.\n` +
      [...where].map((w) => `      read at: ${w}\n`).join("") +
      `      \`loadCameraConfig()\` rebuilds the live config key-by-key from the DEFAULT keys, so a\n` +
      `      stored value for this key is SILENTLY DROPPED on every load — the control appears to\n` +
      `      work and the value never reaches the code that reads it. Add it to DEFAULT_CAMERA_CONFIG\n` +
      `      (with the value it should have when nobody has set it), or stop reading it.`,
  );

console.log(
  `check-config-keys: ${found.size} camera key(s) read across ${files.length} source file(s), ` +
    `${missing.length} without a default. ` +
    `(Camera config only — the other loaders spread stored over defaults and cannot fail this way. ` +
    `Destructured and computed reads are invisible; see the header.)`,
);
console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
if (failures > 0) process.exit(1);
